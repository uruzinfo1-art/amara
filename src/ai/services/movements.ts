import { supabaseServer } from "../../lib/supabaseServer.js";

export class MovementService {
  async create(
    data: any,
    context: { userId: string; profileId: number }
  ) {
    
    console.log("Movimiento recibido:", data);
    console.log("Contexto:", context);
    if (!supabaseServer) {
  return {
    success: false,
    error: "Supabase no está configurado.",
  };
}

    const tipo =
      data.intent === "create_expense"
        ? "gasto"
        : "ingreso";

    // Perfil: el que eligió la IA (data.profileId); si no vino, el del contexto.
    const profileId = data.profileId ?? context.profileId;

    // Verifica que ese perfil exista y pertenezca a este usuario.
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
        error: "El perfil indicado no existe o no pertenece a este usuario.",
      };
    }

    const { data: movimiento, error } = await supabaseServer
      .from("movimientos")
      .insert({
        tipo,
        monto: data.amount,
        categoria: data.category || null,
        descripcion: data.description || null,
        fecha: new Date().toISOString().split("T")[0],
        user_id: context.userId,
        profile_id: profileId,
      })
      .select()
      .single();

    if (error) {
      console.error("Error guardando movimiento:", error);

      return {
        success: false,
        error: error.message,
      };
    }

    console.log("Movimiento guardado:", movimiento);

    return {
      success: true,
      data: movimiento,
    };
  }
    async getExpenses(
  data: any,
  context: { userId: string; profileId: number }
) {
  let query = supabaseServer
    .from("movimientos")
    .select("monto, categoria, descripcion, fecha")
    .eq("user_id", context.userId)
    .eq("profile_id", context.profileId)
    .eq("tipo", "gasto");

  if (data.category) {
    query = query.eq("categoria", data.category);
  }

  if (data.period === "today") {
    const today = new Date().toISOString().split("T")[0];
    query = query.eq("fecha", today);
  }

  if (data.period === "month") {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    query = query
      .gte("fecha", `${year}-${month}-01`)
      .lt(
        "fecha",
        new Date(year, now.getMonth() + 1, 1)
          .toISOString()
          .split("T")[0]
      );
  }

  const { data: movimientos, error } = await query;

  if (error) {
    console.error("Error consultando gastos:", error);

    return {
      success: false,
      error: error.message,
    };
  }

  const total = (movimientos || []).reduce(
    (sum, movimiento) => sum + Number(movimiento.monto || 0),
    0
  );

  return {
    success: true,
    total,
    movimientos: movimientos || [],
  };
}
  async getMovements(
    context: { userId: string; profileId: number }
  ) {
    const { data, error } = await supabaseServer
      .from("movimientos")
      .select("id, tipo, monto, categoria, descripcion, fecha, profile_id")
      .eq("user_id", context.userId)
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error consultando movimientos:", error);

      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      movimientos: data || [],
    };
  }
}

export const movementService = new MovementService();