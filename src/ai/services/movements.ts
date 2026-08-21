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

    const { data: movimiento, error } = await supabaseServer
      .from("movimientos")
      .insert({
        tipo,
        monto: data.amount,
        categoria: data.category || null,
        descripcion: data.description || null,
        fecha: new Date().toISOString().split("T")[0],
        user_id: context.userId,
        profile_id: context.profileId,
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
    context: { userId: string; profileId: number }
  ) {
    const { data, error } = await supabaseServer
      .from("movimientos")
      .select("monto, categoria, descripcion, fecha")
      .eq("user_id", context.userId)
      .eq("profile_id", context.profileId)
      .eq("tipo", "gasto");

    if (error) {
      console.error("Error consultando gastos:", error);

      return {
        success: false,
        error: error.message,
      };
    }

    const total = (data || []).reduce(
      (sum, movimiento) => sum + Number(movimiento.monto || 0),
      0
    );

    return {
      success: true,
      total,
      movimientos: data || [],
    };
  }
}

export const movementService = new MovementService();