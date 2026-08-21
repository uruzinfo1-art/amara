import { supabase } from "../../lib/supabase.js";

export class MovementService {
  async create(
    data: any,
    context: { userId: string; profileId: number }
  ) {
    console.log("Movimiento recibido:", data);
    console.log("Contexto:", context);
    if (!supabase) {
  return {
    success: false,
    error: "Supabase no está configurado.",
  };
}

    const tipo =
      data.intent === "create_expense"
        ? "gasto"
        : "ingreso";

    const { data: movimiento, error } = await supabase
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
}

export const movementService = new MovementService();