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
  const perfilesTmp: number[] = [];
  const sociosTmp: string[] = [];
  const bolsillosTmp: (string | number)[] = [];
  const perfilesCierreTmp: number[] = [];
  const msgsUsuario: string[] = ["Gasté 300 mil en gas", "sí"];
  let remanenteOriginal: number | undefined;

  try {
    const { data: userInicio } = await supabase.auth.admin.getUserById(TEST_USER_ID!);
    remanenteOriginal = (userInicio?.user?.user_metadata as any)?.settings
      ?.remanente_mes_anterior;

    // Deja al día el perfil de prueba real antes de lo demás: si tiene un mes
    // pendiente de cerrar (cuenta vieja usada en pruebas anteriores), cada
    // conversación arrancaría con el aviso de cierre y descarrilaría el resto.
    const cierrePrevio: any = await movementService.pendingClosure(context);
    if (cierrePrevio) {
      await movementService.closeMonth(
        {
          accion: "pasar",
          monthKey: cierrePrevio.monthKey,
          disponible: cierrePrevio.disponible,
          profileId: context.profileId,
        },
        context
      );
      console.log(
        `(Se cerró de paso un mes pendiente del perfil de prueba: ${cierrePrevio.mesTerminado})`
      );
    }

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

    // === Bug ingreso sin categoría: DEBE contar en el resumen ===
    const resumenAntes: any = await movementService.getResumen(
      { profileId: objetivo.id },
      context
    );
    const { data: ingSinCat } = await supabase
      .from("movimientos")
      .insert({
        tipo: "ingreso",
        monto: 700000,
        categoria: null,
        fecha: hoyBogota,
        user_id: TEST_USER_ID,
        profile_id: objetivo.id,
        is_fixed: false,
        active: true,
      })
      .select("id")
      .single();
    if (ingSinCat?.id) idsCreados.push(ingSinCat.id);

    const resumenDespues: any = await movementService.getResumen(
      { profileId: objetivo.id },
      context
    );
    check(
      "ingreso sin categoría ($700.000) SÍ cuenta en el resumen",
      Number(resumenDespues.ingresos) === Number(resumenAntes.ingresos) + 700000 &&
        Number(resumenDespues.disponible) ===
          Number(resumenAntes.disponible) + 700000
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

    // === Fecha del movimiento (va al final: mete un gasto real que no debe
    // contaminar las comprobaciones A2/A3 de arriba) ===
    const ayerBogota = (() => {
      const [y, m, d] = hoyBogota.split("-").map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d, 12));
      dt.setUTCDate(dt.getUTCDate() - 1);
      return dt.toISOString().split("T")[0];
    })();

    const conFecha: any = await movementService.create(
      { intent: "create_expense", amount: 4321, profileId: objetivo.id, date: ayerBogota },
      context
    );
    if (conFecha?.data?.id) idsCreados.push(conFecha.data.id);
    check(
      "Fecha - registrar con fecha de ayer guarda esa fecha",
      conFecha.success === true && conFecha.data?.fecha === ayerBogota
    );

    const fechaFutura: any = await movementService.create(
      { intent: "create_expense", amount: 4321, profileId: objetivo.id, date: "2099-01-01" },
      context
    );
    check("Fecha - fecha en el futuro se rechaza", fechaFutura.success === false);

    const fechaMala: any = await movementService.create(
      { intent: "create_expense", amount: 4321, profileId: objetivo.id, date: "no-es-fecha" },
      context
    );
    check("Fecha - texto que no es fecha se rechaza", fechaMala.success === false);

    // === B5 - perfil de negocio: gasto = inversión, y socios ===
    const { data: perfilProd } = await supabase
      .from("profiles")
      .insert({
        user_id: TEST_USER_ID,
        name: "TestProductivo",
        profile_type: "business_productive",
        is_default: false,
        initial_investment: 0,
      })
      .select("id")
      .single();
    const { data: perfilCasa } = await supabase
      .from("profiles")
      .insert({
        user_id: TEST_USER_ID,
        name: "TestHogar",
        profile_type: "home",
        is_default: false,
        initial_investment: 0,
      })
      .select("id")
      .single();
    if (perfilProd?.id) perfilesTmp.push(perfilProd.id);
    if (perfilCasa?.id) perfilesTmp.push(perfilCasa.id);

    const { data: socioTmp } = await supabase
      .from("partners")
      .insert({
        user_id: TEST_USER_ID,
        profile_id: perfilProd.id,
        name: "SocioTest",
        capital: 0,
        active: true,
      })
      .select("id")
      .single();
    if (socioTmp?.id) sociosTmp.push(socioTmp.id);

    const invAuto: any = await movementService.create(
      { intent: "create_expense", amount: 5000, category: "Semillas", profileId: perfilProd.id },
      context
    );
    if (invAuto?.data?.id) idsCreados.push(invAuto.data.id);
    check(
      "B5 - gasto en perfil productivo se guarda como inversión (gasto_real / inversion)",
      invAuto.success === true &&
        invAuto.data?.tipo === "gasto_real" &&
        invAuto.data?.categoria === "inversion"
    );

    const conSocio: any = await movementService.create(
      { intent: "create_expense", amount: 6000, profileId: perfilProd.id, partnerId: socioTmp.id },
      context
    );
    if (conSocio?.data?.id) idsCreados.push(conSocio.data.id);
    check(
      "B5 - movimiento con socio válido guarda partner_id",
      conSocio.success === true &&
        String(conSocio.data?.partner_id) === String(socioTmp.id)
    );

    const socioOtroPerfil: any = await movementService.create(
      { intent: "create_expense", amount: 6000, profileId: perfilCasa.id, partnerId: socioTmp.id },
      context
    );
    check(
      "B5 - socio de otro perfil se rechaza",
      socioOtroPerfil.success === false
    );

    const gastoHogar: any = await movementService.create(
      { intent: "create_expense", amount: 7000, category: "Comida", profileId: perfilCasa.id },
      context
    );
    if (gastoHogar?.data?.id) idsCreados.push(gastoHogar.data.id);
    check(
      "B5 - gasto en perfil no-productivo sigue siendo tipo 'gasto'",
      gastoHogar.success === true && gastoHogar.data?.tipo === "gasto"
    );

    // === Guardar en bolsillo (perfil hogar) ===
    const { data: bolsilloTmp } = await supabase
      .from("bolsillos")
      .insert({
        user_id: TEST_USER_ID,
        profile_id: perfilCasa.id,
        nombre: "BolsilloTest",
        tipo: "meta",
        saldo: 0,
        meta: 0,
        icono: "🎯",
        color: "#00e676",
        active: true,
      })
      .select("id")
      .single();
    if (bolsilloTmp?.id) bolsillosTmp.push(bolsilloTmp.id);

    // El perfil hogar de prueba ya tiene el gasto de $7.000 de arriba; le metemos ingreso.
    const ingParaBolsillo: any = await movementService.create(
      { intent: "create_income", amount: 100000, profileId: perfilCasa.id },
      context
    );
    if (ingParaBolsillo?.data?.id) idsCreados.push(ingParaBolsillo.data.id);

    const guardado: any = await movementService.saveToPocket(
      { amount: 50000, pocket: "bolsillotest", profileId: perfilCasa.id },
      context
    );
    if (guardado?.data?.id) idsCreados.push(guardado.data.id);
    const { data: bolTrasGuardar } = await supabase
      .from("bolsillos")
      .select("saldo")
      .eq("id", bolsilloTmp.id)
      .single();
    check(
      "Bolsillo - guardar $50.000 sube el saldo y crea movimiento 'ahorro'",
      guardado.success === true &&
        guardado.data?.tipo === "ahorro" &&
        Number(bolTrasGuardar?.saldo) === 50000
    );

    const bolsilloInexistente: any = await movementService.saveToPocket(
      { amount: 1000, pocket: "NoExisteEsteBolsillo", profileId: perfilCasa.id },
      context
    );
    check(
      "Bolsillo - nombre inexistente se rechaza",
      bolsilloInexistente.success === false
    );

    // Sacar de bolsillo (el bolsillo tiene $50.000 del guardado de arriba).
    const sacado: any = await movementService.withdrawFromPocket(
      { amount: 20000, pocket: "bolsillotest", profileId: perfilCasa.id },
      context
    );
    const { data: bolTrasSacar } = await supabase
      .from("bolsillos")
      .select("saldo")
      .eq("id", bolsilloTmp.id)
      .single();
    check(
      "Bolsillo - sacar $20.000 baja el saldo",
      sacado.success === true && Number(bolTrasSacar?.saldo) === 30000
    );

    const sacarDeMas: any = await movementService.withdrawFromPocket(
      { amount: 999999, pocket: "bolsillotest", profileId: perfilCasa.id },
      context
    );
    check(
      "Bolsillo - sacar más de lo que hay se rechaza",
      sacarDeMas.success === false
    );

    // === Cierre de mes ===
    const { data: perfilCierre } = await supabase
      .from("profiles")
      .insert({
        user_id: TEST_USER_ID,
        name: "TestCierre",
        profile_type: "home",
        is_default: false,
        initial_investment: 0,
      })
      .select("id")
      .single();
    if (perfilCierre?.id) {
      perfilesTmp.push(perfilCierre.id);
      perfilesCierreTmp.push(perfilCierre.id);
    }

    // Simula que el perfil ya tiene historial (un mes viejo), pero no el mes actual.
    await supabase.from("monthly_cycles").insert({
      user_id: TEST_USER_ID,
      profile_id: perfilCierre.id,
      month_key: "2000-01",
      remaining_balance: 0,
      action_taken: "initial_cycle",
      closed_at: new Date().toISOString(),
    });

    const cierrePendiente: any = await movementService.pendingClosure({
      userId: TEST_USER_ID!,
      profileId: perfilCierre.id,
    });
    check(
      "Cierre - detecta mes pendiente cuando hay historial y el mes actual no está cerrado",
      !!cierrePendiente &&
        typeof cierrePendiente.disponible === "number" &&
        cierrePendiente.monthKey === hoyBogota.slice(0, 7)
    );

    const cerrarPasar: any = await movementService.closeMonth(
      { accion: "pasar", monthKey: cierrePendiente.monthKey, disponible: 5000, profileId: perfilCierre.id },
      context
    );
    check(
      "Cierre - acción 'pasar' guarda el remanente",
      cerrarPasar.success === true && cerrarPasar.remanente === 5000
    );

    const yaNoHayPendiente = await movementService.pendingClosure({
      userId: TEST_USER_ID!,
      profileId: perfilCierre.id,
    });
    check("Cierre - tras cerrar, ya no queda pendiente", yaNoHayPendiente === null);

    const cerrarDeNuevo: any = await movementService.closeMonth(
      { accion: "pasar", monthKey: cierrePendiente.monthKey, disponible: 1, profileId: perfilCierre.id },
      context
    );
    check("Cierre - no deja cerrar el mismo mes dos veces", cerrarDeNuevo.success === false);

    const { data: bolsilloCierre } = await supabase
      .from("bolsillos")
      .insert({
        user_id: TEST_USER_ID,
        profile_id: perfilCierre.id,
        nombre: "BolsilloCierre",
        tipo: "meta",
        saldo: 0,
        meta: 0,
        icono: "🎯",
        color: "#00e676",
        active: true,
      })
      .select("id")
      .single();
    if (bolsilloCierre?.id) bolsillosTmp.push(bolsilloCierre.id);

    const cerrarGuardar: any = await movementService.closeMonth(
      { accion: "guardar", bolsillo: "bolsillocierre", monthKey: "2099-01", disponible: 30000, profileId: perfilCierre.id },
      context
    );
    const { data: bolTrasCierre } = await supabase
      .from("bolsillos")
      .select("saldo")
      .eq("id", bolsilloCierre.id)
      .single();
    check(
      "Cierre - acción 'guardar' sube el saldo del bolsillo",
      cerrarGuardar.success === true && Number(bolTrasCierre?.saldo) === 30000
    );

    const sinDisponible: any = await movementService.saveToPocket(
      { amount: 999999999, pocket: "bolsillotest", profileId: perfilCasa.id },
      context
    );
    check(
      "Bolsillo - si no hay disponible, NO guarda",
      sinDisponible.success === false
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

    if (bolsillosTmp.length) {
      await supabase
        .from("transferencias_bolsillos")
        .delete()
        .in("bolsillo_id", bolsillosTmp);
      await supabase.from("bolsillos").delete().in("id", bolsillosTmp);
    }
    if (sociosTmp.length) {
      await supabase.from("partners").delete().in("id", sociosTmp);
    }
    if (perfilesCierreTmp.length) {
      await supabase.from("monthly_cycles").delete().in("profile_id", perfilesCierreTmp);
      await supabase.from("movimientos").delete().in("profile_id", perfilesCierreTmp);
    }
    if (perfilesTmp.length) {
      await supabase.from("profiles").delete().in("id", perfilesTmp);
      console.log("Perfiles de prueba borrados:", perfilesTmp.join(", "));
    }
    if (TEST_USER_ID) {
      try {
        const { data: userAhora } = await supabase.auth.admin.getUserById(TEST_USER_ID);
        const meta = (userAhora?.user?.user_metadata as any) ?? {};
        await supabase.auth.admin.updateUserById(TEST_USER_ID, {
          user_metadata: {
            ...meta,
            settings: { ...(meta.settings ?? {}), remanente_mes_anterior: remanenteOriginal },
          },
        });
        console.log("Remanente de la cuenta de prueba restaurado a:", remanenteOriginal);
      } catch (e) {
        console.error("No se pudo restaurar el remanente de prueba:", e);
      }
    }
  }
}

test();
