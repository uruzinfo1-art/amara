import dotenv from "dotenv";
dotenv.config();

import { assistant } from "./assistant";
import { movementService } from "./services/movements";
import { createClient } from "@supabase/supabase-js";

// El usuario real de prueba se lee del .env (que Git ignora), NUNCA se escribe aquí.
const TEST_USER_ID = process.env.TEST_USER_ID;
const TEST_PROFILE_ID = process.env.TEST_PROFILE_ID;

if (!TEST_USER_ID || !TEST_PROFILE_ID) {
  console.error(
    "Falta TEST_USER_ID o TEST_PROFILE_ID en el .env. Agrégalos y vuelve a correr."
  );
  process.exit(1);
}

const context = { userId: TEST_USER_ID, profileId: Number(TEST_PROFILE_ID) };

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function test() {
  try {
    // Perfiles del usuario de prueba.
    const { data: perfiles } = await supabase
      .from("profiles")
      .select("id, name, is_default")
      .eq("user_id", TEST_USER_ID)
      .order("id", { ascending: true });

    console.log("Perfiles del usuario:", perfiles);

    if (!perfiles || perfiles.length < 2) {
      console.log(
        "\nAVISO: este usuario tiene menos de 2 perfiles, así que AMARA no tiene por qué preguntar. " +
          "La prueba del 'a qué perfil' necesita un usuario con 2 o más perfiles."
      );
    }

    // Perfil objetivo: preferimos uno distinto al del contexto, para probar que
    // el movimiento se puede enrutar a un perfil que NO es el por defecto.
    const objetivo =
      (perfiles ?? []).find((p: any) => p.id !== context.profileId) ??
      (perfiles ?? [])[0];

    if (!objetivo) {
      console.error("El usuario no tiene perfiles. No se puede probar.");
      return;
    }

    console.log(
      `\nPerfil objetivo de la prueba: ${objetivo.name} (id ${objetivo.id})`
    );

    // --- Mensaje 1: gasto sin decir el perfil -> AMARA debería preguntar ---
    console.log("\nUsuario 1: Gasté 300 mil en gas");
    const r1 = await assistant.processMessage("Gasté 300 mil en gas", context);
    console.log("AMARA 1:", r1);

    // --- Mensaje 2: el usuario responde con el nombre del perfil ---
    console.log(`\nUsuario 2: ${objetivo.name}`);
    const r2 = await assistant.processMessage(objetivo.name, context);
    console.log("AMARA 2:", r2);

    // --- Mensaje 3: confirmación ---
    console.log("\nUsuario 3: sí");
    const r3 = await assistant.processMessage("sí", context);
    console.log("AMARA 3:", r3);

    // --- Verificación ---
    const despues: any = await movementService.getMovements(context);
    const ultimo = (despues.movimientos ?? [])[0];
    console.log("\nMovimiento más reciente:", ultimo);

    const ok =
      ultimo &&
      Number(ultimo.monto) === 300000 &&
      Number(ultimo.profile_id) === Number(objetivo.id);

    console.log(
      "\n--- Resultado ---\n" +
        (ok
          ? `OK: el gasto de $300.000 quedó guardado en el perfil ${objetivo.name} (id ${objetivo.id}).`
          : "FALLO: el gasto no quedó en el perfil esperado. Revisar arriba.")
    );

    // --- Limpieza: borrar el movimiento y los mensajes de prueba ---
    if (ok && ultimo?.id) {
      await supabase.from("movimientos").delete().eq("id", ultimo.id);
      console.log(`Movimiento de prueba (id ${ultimo.id}) borrado.`);
    }
    await supabase
      .from("mensajes")
      .delete()
      .eq("user_id", TEST_USER_ID)
      .in("content", ["Gasté 300 mil en gas", objetivo.name, "sí"]);
    console.log("Mensajes de prueba borrados.");
  } catch (error) {
    console.error(error);
  }
}

test();
