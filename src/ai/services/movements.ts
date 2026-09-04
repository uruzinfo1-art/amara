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
      .select("id, profile_type")
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

    // Perfil de ciclo productivo: toda salida de dinero es "inversión".
    // El dashboard la cuenta como capital a recuperar, sin importar en qué se gastó.
    let tipoFinal = tipo;
    let categoriaFinal: string | null = data.category || null;
    if (tipo === "gasto" && perfil.profile_type === "business_productive") {
      tipoFinal = "gasto_real";
      categoriaFinal = "inversion";
    }

    // Socio que hizo el movimiento (opcional). Debe pertenecer a este perfil.
    let partnerId: string | null = null;
    if (data.partnerId) {
      const { data: socio } = await supabaseServer
        .from("partners")
        .select("id")
        .eq("id", data.partnerId)
        .eq("profile_id", profileId)
        .eq("active", true)
        .maybeSingle();
      if (!socio) {
        return {
          success: false,
          error:
            "El socio indicado no existe en este perfil. Pregúntale al usuario el nombre exacto del socio, o registra el movimiento a nombre de la empresa (sin socio).",
        };
      }
      partnerId = socio.id;
    }

    const { data: movimiento, error } = await supabaseServer
      .from("movimientos")
      .insert({
        tipo: tipoFinal,
        monto,
        categoria: categoriaFinal,
        descripcion: data.description || null,
        fecha,
        user_id: context.userId,
        profile_id: profileId,
        partner_id: partnerId,
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

  // Mueve dinero de la cuenta principal a un bolsillo (ahorro). Replica lo que
  // hace el botón de la app: fila en transferencias_bolsillos + sube el saldo
  // del bolsillo + un movimiento tipo "ahorro". No permite guardar más de lo
  // disponible (ingresos - gastos del perfil), igual que la app.
  async saveToPocket(
    data: any,
    context: { userId: string; profileId: number }
  ) {
    if (!supabaseServer) {
      return { success: false, error: "Supabase no está configurado." };
    }

    const monto = Number(data.amount);
    if (!Number.isFinite(monto) || monto <= 0) {
      return {
        success: false,
        error:
          "El monto no es válido. Pídele al usuario el monto en pesos (un número mayor que 0).",
      };
    }

    const profileId = data.profileId;
    if (!profileId) {
      return {
        success: false,
        need_profile: true,
        message:
          "Falta el perfil. Pregúntale al usuario en cuál perfil guardar y vuelve a llamar con profile_id.",
      };
    }

    // El perfil debe ser del usuario.
    const { data: perfil } = await supabaseServer
      .from("profiles")
      .select("id")
      .eq("id", profileId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!perfil) {
      return {
        success: false,
        error: "El perfil indicado no existe o no pertenece a este usuario.",
      };
    }

    let fecha = fechaBogota();
    if (data.date) {
      const v = fechaValida(String(data.date));
      if (!v) {
        return {
          success: false,
          error:
            "La fecha no es válida o está en el futuro. Pregúntale al usuario el día exacto o usa la de hoy.",
        };
      }
      fecha = v;
    }

    // Bolsillo por nombre (igualdad sin distinguir mayúsculas). AMARA no crea bolsillos.
    const { data: bolsillo } = await supabaseServer
      .from("bolsillos")
      .select("id, nombre, saldo")
      .eq("profile_id", profileId)
      .eq("active", true)
      .ilike("nombre", String(data.pocket ?? ""))
      .maybeSingle();
    if (!bolsillo) {
      return {
        success: false,
        error:
          "No existe un bolsillo con ese nombre en este perfil. Pídele al usuario el nombre exacto del bolsillo. AMARA no puede crear bolsillos.",
      };
    }

    // Disponible en la cuenta principal (mismo criterio que la app).
    const { data: movs } = await supabaseServer
      .from("movimientos")
      .select("tipo, monto, categoria, is_fixed, day_of_month")
      .eq("user_id", context.userId)
      .eq("profile_id", profileId)
      .eq("active", true);

    const noConfig = (m: any) => !(m.is_fixed === true && m.day_of_month != null);
    const cat = (m: any) => String(m.categoria ?? "");
    const esIngresoReal = (m: any) =>
      m.tipo === "ingreso" && !cat(m).startsWith("bolsillo_");
    const esGasto = (m: any) =>
      m.tipo === "gasto_real" ||
      m.tipo === "gasto" ||
      m.tipo === "gasto_ahorro" ||
      m.tipo === "ahorro" ||
      (m.tipo === "transferencia" && cat(m).startsWith("bolsillo_"));

    const ingresos = (movs || [])
      .filter((m: any) => noConfig(m) && esIngresoReal(m))
      .reduce((s: number, m: any) => s + Number(m.monto || 0), 0);
    const gastos = (movs || [])
      .filter((m: any) => noConfig(m) && esGasto(m))
      .reduce((s: number, m: any) => s + Number(m.monto || 0), 0);
    const disponible = ingresos - gastos;

    if (monto > disponible) {
      return {
        success: false,
        error: `No alcanza: el disponible del perfil es ${disponible} y se pidió guardar ${monto}. Dile al usuario cuánto tiene disponible y que no alcanza.`,
      };
    }

    // 1) Registro de la transferencia.
    await supabaseServer.from("transferencias_bolsillos").insert({
      bolsillo_id: bolsillo.id,
      tipo: "deposito",
      monto,
      descripcion: `Ahorro → ${bolsillo.nombre}`,
      user_id: context.userId,
    });

    // 2) Sube el saldo del bolsillo.
    await supabaseServer
      .from("bolsillos")
      .update({ saldo: Number(bolsillo.saldo) + monto })
      .eq("id", bolsillo.id);

    // 3) Movimiento de ahorro (mismo formato que la app, para que borrarlo cuadre).
    const { data: movimiento, error } = await supabaseServer
      .from("movimientos")
      .insert({
        tipo: "ahorro",
        monto,
        categoria: "ahorro",
        descripcion: `Ahorro → ${bolsillo.nombre}`,
        fecha,
        user_id: context.userId,
        profile_id: profileId,
      })
      .select()
      .single();

    if (error) {
      console.error("Error guardando en bolsillo:", error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: movimiento,
      bolsillo: bolsillo.nombre,
      saldo_nuevo: Number(bolsillo.saldo) + monto,
    };
  }

  // --- Cierre de mes (mismo modelo que AutoClosureModal de la app) ---

  // ¿Quedó el mes anterior sin cerrar para este perfil? Devuelve null si no hay
  // nada pendiente (o si es el primer mes, en cuyo caso crea el ciclo inicial).
  async pendingClosure(context: { userId: string; profileId: number }) {
    if (!supabaseServer) return null;

    const mesActual = fechaBogota().slice(0, 7); // YYYY-MM

    const { data: ciclos } = await supabaseServer
      .from("monthly_cycles")
      .select("month_key")
      .eq("user_id", context.userId)
      .eq("profile_id", context.profileId);

    const filas = ciclos ?? [];
    if (filas.some((c: any) => c.month_key === mesActual)) return null; // ya cerrado

    if (filas.length === 0) {
      // Primer mes del perfil: se registra el ciclo inicial y no se pregunta.
      await supabaseServer.from("monthly_cycles").insert({
        user_id: context.userId,
        profile_id: context.profileId,
        month_key: mesActual,
        remaining_balance: 0,
        action_taken: "initial_cycle",
        closed_at: new Date().toISOString(),
      });
      return null;
    }

    // Hay historial y este mes no está cerrado -> pendiente. Calcular disponible.
    const [y, m] = mesActual.split("-").map(Number);
    const py = m === 1 ? y - 1 : y;
    const pm = m === 1 ? 12 : m - 1;
    const clavePrev = `${py}-${String(pm).padStart(2, "0")}`;

    const { data: movs } = await supabaseServer
      .from("movimientos")
      .select("tipo, monto, categoria, is_fixed, day_of_month")
      .eq("user_id", context.userId)
      .eq("profile_id", context.profileId)
      .eq("active", true)
      .gte("fecha", `${clavePrev}-01`)
      .lt("fecha", `${mesActual}-01`);

    const noConfig = (x: any) => !(x.is_fixed === true && x.day_of_month != null);
    const cat = (x: any) => String(x.categoria ?? "");
    const esIngreso = (x: any) =>
      x.tipo === "ingreso" && !cat(x).startsWith("bolsillo_");
    const esGasto = (x: any) =>
      ["gasto_real", "gasto", "gasto_ahorro", "ahorro"].includes(x.tipo) ||
      (x.tipo === "transferencia" && cat(x).startsWith("bolsillo_"));

    const ingresos = (movs || [])
      .filter((x: any) => noConfig(x) && esIngreso(x))
      .reduce((s: number, x: any) => s + Number(x.monto || 0), 0);
    const gastos = (movs || [])
      .filter((x: any) => noConfig(x) && esGasto(x))
      .reduce((s: number, x: any) => s + Number(x.monto || 0), 0);

    let remanente = 0;
    try {
      const { data: userRes } = await supabaseServer.auth.admin.getUserById(
        context.userId
      );
      remanente = Number(
        (userRes?.user?.user_metadata as any)?.settings?.remanente_mes_anterior || 0
      );
    } catch {
      /* si no se puede leer, se asume 0 */
    }

    const meses = [
      "enero", "febrero", "marzo", "abril", "mayo", "junio",
      "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
    ];

    return {
      monthKey: mesActual,
      mesTerminado: `${meses[pm - 1]} ${py}`,
      disponible: remanente + ingresos - gastos,
    };
  }

  // Ejecuta la decisión del usuario sobre el dinero restante del mes anterior.
  // data: { accion: "guardar"|"pasar"|"reiniciar", bolsillo?, monthKey, disponible, profileId }
  async closeMonth(
    data: any,
    context: { userId: string; profileId: number }
  ) {
    if (!supabaseServer) {
      return { success: false, error: "Supabase no está configurado." };
    }

    const monthKey = String(data.monthKey || "");
    const profileId = data.profileId;
    const disponible = Number(data.disponible) || 0;
    const accion = data.accion;

    if (!/^\d{4}-\d{2}$/.test(monthKey) || !profileId) {
      return { success: false, error: "Faltan datos del cierre (mes o perfil)." };
    }
    if (!["guardar", "pasar", "reiniciar"].includes(accion)) {
      return { success: false, error: "Acción de cierre no válida." };
    }

    const { data: perfil } = await supabaseServer
      .from("profiles")
      .select("id")
      .eq("id", profileId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!perfil) {
      return { success: false, error: "El perfil no pertenece a este usuario." };
    }

    const { data: yaCerrado } = await supabaseServer
      .from("monthly_cycles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("profile_id", profileId)
      .eq("month_key", monthKey)
      .maybeSingle();
    if (yaCerrado) {
      return { success: false, error: "Ese mes ya fue cerrado." };
    }

    let actionTaken: string;
    let nuevoRemanente: number;

    if (accion === "guardar") {
      const { data: bolsillo } = await supabaseServer
        .from("bolsillos")
        .select("id, nombre, saldo")
        .eq("profile_id", profileId)
        .eq("active", true)
        .ilike("nombre", String(data.bolsillo ?? ""))
        .maybeSingle();
      if (!bolsillo) {
        return {
          success: false,
          error:
            "No existe un bolsillo con ese nombre en este perfil. Pregúntale al usuario cuál de la lista.",
        };
      }

      // Último día del mes que terminó (mes anterior a monthKey).
      const [y, m] = monthKey.split("-").map(Number);
      const ultimoDia = new Date(Date.UTC(y, m - 1, 0, 12))
        .toISOString()
        .split("T")[0];

      await supabaseServer
        .from("bolsillos")
        .update({ saldo: Number(bolsillo.saldo) + disponible })
        .eq("id", bolsillo.id);

      await supabaseServer.from("movimientos").insert({
        tipo: "ahorro",
        monto: disponible,
        categoria: `bolsillo_${bolsillo.id}`,
        descripcion: `Ahorro automático → ${bolsillo.nombre}`,
        fecha: ultimoDia,
        user_id: context.userId,
        profile_id: profileId,
      });

      actionTaken = "save_to_pocket";
      nuevoRemanente = 0;
    } else if (accion === "pasar") {
      actionTaken = "carry_over";
      nuevoRemanente = disponible;
    } else {
      actionTaken = "ignore";
      nuevoRemanente = 0;
    }

    await supabaseServer.from("monthly_cycles").insert({
      user_id: context.userId,
      profile_id: profileId,
      month_key: monthKey,
      remaining_balance: disponible,
      action_taken: actionTaken,
      closed_at: new Date().toISOString(),
    });

    // Guardar el nuevo remanente en la cuenta (settings viven en user_metadata).
    try {
      const { data: userRes } = await supabaseServer.auth.admin.getUserById(
        context.userId
      );
      const meta = (userRes?.user?.user_metadata as any) ?? {};
      await supabaseServer.auth.admin.updateUserById(context.userId, {
        user_metadata: {
          ...meta,
          settings: { ...(meta.settings ?? {}), remanente_mes_anterior: nuevoRemanente },
        },
      });
    } catch (e) {
      console.error("No se pudo actualizar el remanente en la cuenta:", e);
    }

    return { success: true, accion, disponible, remanente: nuevoRemanente };
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
