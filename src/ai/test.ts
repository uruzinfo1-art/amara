import dotenv from "dotenv";
dotenv.config();

import { assistant } from "./assistant";
import { movementService } from "./services/movements";
import { createClient } from "@supabase/supabase-js";

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

const hoyBogota = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Bogota",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

let pasan = 0;
let fallan = 0;
function check(nombre: string, cond: boolean) {
  if (cond) pasan++;
  else fallan++;
  console.log((cond ? "  OK    " : "  FALLA  ") + nombre);
}

async function test() {
  const idsCreados: number[] = [];
  const msgsUsuario: string[] = ["Gasté 300 mil en gas", "sí"];

  try {
    const { data: perfiles } = await supabase
      .from("profiles")
      .select("id, name, is_default")
      .eq("user_id", TEST_USER_ID)
      .order("id", { ascending: true });

    const lista = perfiles ?? [];
    const objetivo =
      lista.find((p: any) => p.id !== context.profileId) ?? lista[0];

    if (!objetivo) {
      console.error("El usuario no tiene perfiles. No se puede probar.");
      return;
    }
    msgsUsuario.push(objetivo.name);
    console.log(`Perfil objetivo: ${objetivo.name} (id ${objetivo.id})\n`);

    // === Registro vía conversación, en un perfil que NO es el por defecto ===
    await assistant.processMessage("Gasté 300 mil en gas", context);
    await assistant.processMessage(objetivo.name, context);
    const rReg = await assistant.processMessage("sí", context);
    console.log("Respuesta de registro:", rReg, "\n");

    const { data: creado } = await supabase
      .from("movimientos")
      .select("id, monto, profile_id, categoria, fecha")
      .eq("user_id", TEST_USER_ID)
      .eq("profile_id", objetivo.id)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (creado?.id) idsCreados.push(creado.id);

    check(
      "registro - guardó $300.000 en el perfil objetivo",
      Number(creado?.monto) === 300000 &&
        Number(creado?.profile_id) === Number(objetivo.id)
    );
    check(
      "M1 - la fecha del gasto es la de hoy en Colombia",
      creado?.fecha === hoyBogota
    );

    // === A1 ===
    const porPerfil: any = await movementService.getExpenses(
      { profileId: objetivo.id },
      context
    );
    check(
      "A1 - consulta por perfil incluye los $300.000 y reporta el perfil",
      porPerfil.success &&
        Number(porPerfil.total) >= 300000 &&
        porPerfil.alcance === `perfil ${objetivo.id}`
    );

    const todos: any = await movementService.getExpenses({}, context);
    check(
      "A1 - consulta sin perfil suma todos los perfiles",
      todos.success &&
        Number(todos.total) >= Number(porPerfil.total) &&
        todos.alcance === "todos los perfiles"
    );

    // === A4 ===
    const catLower = String(creado?.categoria ?? "").toLowerCase();
    const porCat: any = await movementService.getExpenses(
      { profileId: objetivo.id, category: catLower },
      context
    );
    check(
      `A4 - categoría '${catLower}' (minúscula) encuentra el gasto '${creado?.categoria}'`,
      porCat.success &&
        (porCat.movimientos?.length ?? 0) >= 1 &&
        Number(porCat.total) >= 300000
    );

    // === L1 - periodos ===
    const qHoy: any = await movementService.getExpenses(
      { profileId: objetivo.id, period: "hoy" },
      context
    );
    const qAyer: any = await movementService.getExpenses(
      { profileId: objetivo.id, period: "ayer" },
      context
    );
    const qMesPasado: any = await movementService.getExpenses(
      { profileId: objetivo.id, period: "mes_pasado" },
      context
    );
    check(
      "L1 - periodo 'hoy' incluye el gasto recién creado",
      qHoy.success && Number(qHoy.total) >= 300000
    );
    check(
      "L1 - periodo 'ayer' responde sin error",
      qAyer.success && typeof qAyer.total === "number"
    );
    check(
      "L1 - periodo 'mes_pasado' responde sin error",
      qMesPasado.success && typeof qMesPasado.total === "number"
    );

    // === M4 - resumen ===
    const resumen: any = await movementService.getResumen(
      { profileId: objetivo.id, period: "mes" },
      context
    );
    check(
      "M4 - resumen trae ingresos, gastos y disponible = ingresos - gastos",
      resumen.success &&
        typeof resumen.ingresos === "number" &&
        typeof resumen.gastos === "number" &&
        resumen.disponible === resumen.ingresos - resumen.gastos
    );
    const resumenTodos: any = await movementService.getResumen({}, context);
    check(
      "M4 - resumen sin perfil suma todos los perfiles",
      resumenTodos.success && resumenTodos.alcance === "todos los perfiles"
    );

    // === M3 - validación de monto ===
    const m3a: any = await movementService.create(
      { intent: "create_expense", amount: -5, profileId: objetivo.id },
      context
    );
    const m3b: any = await movementService.create(
      { intent: "create_expense", amount: "abc", profileId: objetivo.id },
      context
    );
    const m3c: any = await movementService.create(
      { intent: "create_expense", amount: 0, profileId: objetivo.id },
      context
    );
    check("M3 - monto negativo se rechaza", m3a.success === false);
    check("M3 - monto no numérico se rechaza", m3b.success === false);
    check("M3 - monto 0 se rechaza", m3c.success === false);

    // === Blindaje del perfil al registrar (punto 1) ===
    if (lista.length >= 2) {
      const sinPerfil: any = await movementService.create(
        { intent: "create_expense", amount: 1000 },
        context
      );
      check(
        "Blindaje - sin profile_id y con varios perfiles: need_profile, NO guarda",
        sinPerfil.success === false &&
          sinPerfil.need_profile === true &&
          Array.isArray(sinPerfil.profiles) &&
          sinPerfil.profiles.length >= 2
      );
    } else {
      console.log("  (salto Blindaje: el usuario tiene un solo perfil)");
    }

    // === A2 - plantilla de gasto fijo NO se cuenta ===
    const { data: fijo } = await supabase
      .from("movimientos")
      .insert({
        tipo: "gasto",
        monto: 999999,
        categoria: "TestFijo",
        fecha: hoyBogota,
        user_id: TEST_USER_ID,
        profile_id: objetivo.id,
        is_fixed: true,
        day_of_month: 5,
        active: true,
      })
      .select("id")
      .single();
    if (fijo?.id) idsCreados.push(fijo.id);
    const trasFijo: any = await movementService.getExpenses(
      { profileId: objetivo.id },
      context
    );
    check(
      "A2 - la plantilla de gasto fijo ($999.999) NO se suma",
      Number(trasFijo.total) === Number(porPerfil.total)
    );

    // === A3 - movimiento anulado NO se cuenta ===
    const { data: anulado } = await supabase
      .from("movimientos")
      .insert({
        tipo: "gasto",
        monto: 888888,
        categoria: "TestAnulado",
        fecha: hoyBogota,
        user_id: TEST_USER_ID,
        profile_id: objetivo.id,
        is_fixed: false,
        active: false,
      })
      .select("id")
      .single();
    if (anulado?.id) idsCreados.push(anulado.id);
    const trasAnulado: any = await movementService.getExpenses(
      { profileId: objetivo.id },
      context
    );
    check(
      "A3 - el movimiento anulado ($888.888) NO se suma",
      Number(trasAnulado.total) === Number(porPerfil.total)
    );

    console.log(`\n--- Resultado: ${pasan} OK, ${fallan} FALLA ---`);
  } catch (error) {
    console.error(error);
  } finally {
    if (idsCreados.length) {
      await supabase.from("movimientos").delete().in("id", idsCreados);
      console.log("Filas de prueba borradas:", idsCreados.join(", "));
    }
    await supabase
      .from("mensajes")
      .delete()
      .eq("user_id", TEST_USER_ID)
      .in("content", msgsUsuario);
    console.log("Mensajes de prueba borrados.");
  }
}

test();
