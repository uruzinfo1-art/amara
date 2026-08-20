import { supabase } from "../../lib/supabase.js";

export class MovementService {

  async create(data: any) {

    console.log("Movimiento recibido:", data);

    // Aquí luego insertaremos en Supabase

    return {
      success: true,
      data
    };

  }

}

export const movementService = new MovementService();