import { supabaseServer } from "../../lib/supabaseServer.js";

// Fecha (YYYY-MM-DD) en zona horaria de Colombia (America/Bogota, UTC-5 fijo).
export function fechaBogota(base: Date = new Date()): string {
  // "en-CA" produce el formato YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(base);
}

// Valida una fecha "YYYY-MM-DD": formato correcto, fecha real de calendario y
// no posterior a hoy (hora Colombia). Devuelve la fecha o null si no sirve.
function fechaValida(s: string): string | null {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null; // fecha inexistente, ej. 2026-02-31
  }
  if (s > fechaBogota()) return null; // en el futuro
  return s;
}

// Rango { desde, hasta } (hasta EXCLUSIVO) en fechas YYYY-MM-DD, hora Colombia.
// Periodos soportados: hoy, ayer, ultimos_7_dias, mes, mes_pasado.
function rangoPeriodo(period: string): { desde: string; hasta: string } | null {
  const [y, m, d] = fechaBogota().split("-").map(Number);
  // Date en UTC a mediodía: evita que sumar/restar días cruce de día por la zona.
  const hoyUTC = new Date(Date.UTC(y, m - 1, d, 12));
  const iso = (dt: Date) => dt.toISOString().split("T")[0];
  const masDias = (dt: Date, n: number) => {
    const c = new Date(dt);
    c.setUTCDate(c.getUTCDate() + n);
    return c;
  };
  const pad = (n: number) => String(n).padStart(2, "0");

  switch (period) {
    case "hoy":
      return { desde: iso(hoyUTC), hasta: iso(masDias(hoyUTC, 1)) };
    case "ayer":
      return { desde: iso(masDias(hoyUTC, -1)), hasta: iso(hoyUTC) };
    case "ultimos_7_dias":
      return { desde: iso(masDias(hoyUTC, -6)), hasta: iso(masDias(hoyUTC, 1)) };
    case "mes":
      return {
        desde: `${y}-${pad(m)}-01`,
        hasta: m === 12 ? `${y + 1}-01-01` : `${y}-${pad(m + 1)}-01`,
      };
    case "mes_pasado": {
      const py = m === 1 ? y - 1 : y;
      const pm = m === 1 ? 12 : m - 1;
      return { desde: `${py}-${pad(pm)}-01`, hasta: `${y}-${pad(m)}-01` };
    }
    default:
      return null;
  }
}

// Filtro de "gasto real", el mismo criterio que usa la app (ver FixedExpensesFab.tsx):
// - tipo 'gasto'
// - no anulado (active = true)
// - que NO sea una plantilla de gasto fijo (is_fixed vacío/falso, o sin day_of_month)
function soloGastosReales(query: any) {
  return query
    .eq("tipo", "gasto")
    .eq("active", true)
    .or("is_fixed.is.null,is_fixed.eq.false,day_of_month.is.null");
}

// Filtro de "ingreso real" (ver utils.ts isIncomeReal): tipo 'ingreso', no anulado,
// y que no sea una plantilla de ingreso fijo.
// OJO: la exclusión de "bolsillo_" NO va aquí. Un .not(...ilike...) en SQL descarta
// también las filas con categoria NULL (NOT (NULL ilike x) = NULL), y AMARA guarda
// los ingresos sin categoría como NULL. Se filtra en código dentro de getIncome.
function soloIngresosReales(query: any) {
  return query
    .eq("tipo", "ingreso")
    .eq("active", true)
    .or("is_fixed.is.null,is_fixed.eq.false,day_of_month.is.null");
}

export class MovementService {
  async create(
    data: any,
    context: { userId: string; profileId: number }
  ) {
    console.log("Movimiento recibido:", data);
    console.log("Contexto:", context);
    if (!supabaseServer) {
      return { success: false, error: "Supabase no está configurado." };
    }

    // M3: validar el monto antes de nada.
    const monto = Number(data.amount);
    if (!Number.isFinite(monto) || monto <= 0) {
      return {
        success: false,
        error:
          "El monto no es válido. Pídele al usuario el monto en pesos (un número mayor que 0).",
      };
    }

    const tipo =
      data.intent === "create_expense" ? "gasto" : "ingreso";

    // Fecha: por defecto hoy (Colombia). Si la IA pasó una, se valida.
    let fecha = fechaBogota();
    if (data.date) {
      const v = fechaValida(String(data.date));
      if (!v) {
        return {
          success: false,
          error:
            "La fecha no es válida o está en el futuro. Pregúntale al usuario el día exacto (con mes y año) o registra con la fecha de hoy.",
        };
      }
      fecha = v;
    }

    // --- Resolver el perfil (blindado: nunca asume en silencio) ---
    let profileId = data.profileId;

    if (!profileId) {
      const { data: perfiles } = await supabaseServer
        .from("profiles")
        .select("id, name")
        .eq("user_id", context.userId)
        .order("id", { ascending: true });

      if (!perfiles || perfiles.length === 0) {
        return {
          success: false,
          error: "El usuario no tiene perfiles configurados.",
        };
      }

      if (perfiles.length === 1) {
        profileId = perfiles[0].id;
      } else {
        // Varios perfiles y la IA no indicó cuál: NO guardar, pedir el perfil.
        return {
          success: false,
          need_profile: true,
          profiles: perfiles.map((p: any) => ({ id: p.id, name: p.name })),
          message:
            "Hay varios perfiles. Pregúntale al usuario en cuál registrar este movimiento y vuelve a llamar la herramienta con profile_id. No adivines.",
        };
      }
    }

    // Verifica que el perfil (el que indicó la IA, o el único que hay) sea del usuario.
    const { data: perfil, error: perfilError } = await supabaseServer
      .from("profiles")
      .select("id")
      .eq("id", profileId)
      .eq("user_id", context.userId)
      .maybeSingle();

    if (perfilError || !perfil) {
      console.error("Perfil no válido para este usuario:", profileId, perfilError);
      return {
        success: false,
        error:
          "El perfil indicado no existe o no pertenece a este usuario. Pregúntale al usuario en cuál de sus perfiles registrar; no adivines.",
      };
    }

    const { data: movimiento, error } = await supabaseServer
      .from("movimientos")
      .insert({
        tipo,
        monto,
        categoria: data.category || null,
        descripcion: data.description || null,
        fecha,
        user_id: context.userId,
        profile_id: profileId,
      })
      .select()
      .single();

    if (error) {
      console.error("Error guardando movimiento:", error);
      return { success: false, error: error.message };
    }

    console.log("Movimiento guardado:", movimiento);
    return { success: true, data: movimiento };
  }

  async getExpenses(
    data: any,
    context: { userId: string; profileId: number }
  ) {
    let query = supabaseServer
      .from("movimientos")
      .select("monto, categoria, descripcion, fecha, profile_id")
      .eq("user_id", context.userId);

    // A1: con profileId -> ese perfil; sin profileId -> todos los del usuario.
    if (data.profileId) {
      query = query.eq("profile_id", data.profileId);
    }

    // A2 + A3 + A5: mismo filtro de "gasto real" que la app.
    query = soloGastosReales(query);

    if (data.category) {
      // A4: ilike sin comodines = igualdad ignorando mayúsculas/minúsculas.
      query = query.ilike("categoria", data.category);
    }

    // M1/M2 + L1: rango de fechas del periodo, en hora Colombia.
    if (data.period) {
      const rango = rangoPeriodo(data.period);
      if (rango) {
        query = query.gte("fecha", rango.desde).lt("fecha", rango.hasta);
      }
    }

    const { data: movimientos, error } = await query;

    if (error) {
      console.error("Error consultando gastos:", error);
      return { success: false, error: error.message };
    }

    const total = (movimientos || []).reduce(
      (sum: number, m: any) => sum + Number(m.monto || 0),
      0
    );

    return {
      success: true,
      total,
      alcance: data.profileId ? `perfil ${data.profileId}` : "todos los perfiles",
      movimientos: movimientos || [],
    };
  }

  async getIncome(
    data: any,
    context: { userId: string; profileId: number }
  ) {
    let query = supabaseServer
      .from("movimientos")
      .select("monto, categoria, fecha, profile_id")
      .eq("user_id", context.userId);

    if (data.profileId) {
      query = query.eq("profile_id", data.profileId);
    }

    query = soloIngresosReales(query);

    if (data.period) {
      const rango = rangoPeriodo(data.period);
      if (rango) {
        query = query.gte("fecha", rango.desde).lt("fecha", rango.hasta);
      }
    }

    const { data: movimientos, error } = await query;

    if (error) {
      console.error("Error consultando ingresos:", error);
      return { success: false, error: error.message };
    }

    // Excluir movimientos de bolsillo (ahorros), como hace la app (utils.ts isIncomeReal).
    // startsWith maneja bien la categoria NULL.
    const reales = (movimientos || []).filter(
      (m: any) => !String(m.categoria ?? "").toLowerCase().startsWith("bolsillo_")
    );

    const total = reales.reduce(
      (sum: number, m: any) => sum + Number(m.monto || 0),
      0
    );

    return {
      success: true,
      total,
      alcance: data.profileId ? `perfil ${data.profileId}` : "todos los perfiles",
      movimientos: reales,
    };
  }

  // M4: ingresos, gastos y disponible (versión simple = ingresos - gastos del periodo).
  async getResumen(
    data: any,
    context: { userId: string; profileId: number }
  ) {
    const [gastos, ingresos]: any[] = await Promise.all([
      this.getExpenses({ profileId: data.profileId, period: data.period }, context),
      this.getIncome({ profileId: data.profileId, period: data.period }, context),
    ]);

    if (!gastos.success || !ingresos.success) {
      return { success: false, error: gastos.error || ingresos.error };
    }

    const totalIngresos = Number(ingresos.total || 0);
    const totalGastos = Number(gastos.total || 0);

    return {
      success: true,
      alcance: data.profileId ? `perfil ${data.profileId}` : "todos los perfiles",
      periodo: data.period ?? "todo",
      ingresos: totalIngresos,
      gastos: totalGastos,
      disponible: totalIngresos - totalGastos,
      nota: "disponible = ingresos - gastos del periodo. No incluye bolsillos ni remanente de meses anteriores.",
    };
  }

  async getMovements(
    context: { userId: string; profileId: number }
  ) {
    const { data, error } = await supabaseServer
      .from("movimientos")
      .select("id, tipo, monto, categoria, descripcion, fecha, profile_id")
      .eq("user_id", context.userId)
      .eq("active", true)
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error consultando movimientos:", error);
      return { success: false, error: error.message };
    }

    return { success: true, movimientos: data || [] };
  }
}

export const movementService = new MovementService();
