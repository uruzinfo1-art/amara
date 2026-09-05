import { openai } from "../lib/openai.js";
import { AMARA_AI } from "./rules.js";
import { finance } from "./finance.js";
import { fechaBogota, movementService } from "./services/movements.js";
import { createClient } from "@supabase/supabase-js";

const supabaseServer = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface AssistantContext {
  userId: string;
  profileId: number;
}

const tools = [
  {
    type: "function",
    name: "registrar_gasto",
    description: "Registra un gasto del usuario en su perfil actual.",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Monto del gasto en pesos" },
        category: { type: "string", description: "Categoría del gasto, ej: Transporte, Alimentación" },
        description: { type: "string", description: "Descripción corta del gasto" },
        profile_id: { type: "number", description: "id del perfil al que pertenece el gasto, tomado de la lista PERFILES DE ESTE USUARIO" },
        fecha: { type: "string", description: "Fecha del gasto en formato AAAA-MM-DD. Inclúyela SOLO si el usuario menciona un día distinto a hoy (ej. 'ayer', 'el lunes', 'el 3'). Si no menciona fecha, omite este campo." },
        socio: { type: "string", description: "Nombre del socio que hizo el movimiento, EXACTO como aparece en SOCIOS DE ESTE PERFIL. Omítelo si es de la empresa o si el usuario no menciona un socio." },
      },
      required: ["amount"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "registrar_ingreso",
    description: "Registra un ingreso del usuario en su perfil actual.",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Monto del ingreso en pesos" },
        category: { type: "string", description: "Categoría del ingreso, ej: Salario, Venta" },
        description: { type: "string", description: "Descripción corta del ingreso" },
        profile_id: { type: "number", description: "id del perfil al que pertenece el ingreso, tomado de la lista PERFILES DE ESTE USUARIO" },
        fecha: { type: "string", description: "Fecha del ingreso en formato AAAA-MM-DD. Inclúyela SOLO si el usuario menciona un día distinto a hoy (ej. 'ayer', 'el lunes', 'el 3'). Si no menciona fecha, omite este campo." },
        socio: { type: "string", description: "Nombre del socio que hizo el movimiento, EXACTO como aparece en SOCIOS DE ESTE PERFIL. Omítelo si es de la empresa o si el usuario no menciona un socio." },
      },
      required: ["amount"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "consultar_gastos",
    description: "Consulta los gastos registrados del usuario, opcionalmente filtrados por categoría, periodo o perfil.",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        category: { type: "string", description: "Filtrar por categoría, opcional" },
        period: { type: "string", enum: ["hoy", "ayer", "ultimos_7_dias", "mes", "mes_pasado"], description: "Filtrar por periodo, opcional" },
        profile_id: { type: "number", description: "id del perfil a consultar (de PERFILES DE ESTE USUARIO). Omítelo para sumar todos los perfiles." },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "consultar_resumen",
    description: "Devuelve ingresos, gastos y disponible (ingresos menos gastos) de un periodo. Úsalo para '¿cómo voy?', '¿cuánto gané?', '¿cuánto tengo disponible?'.",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        period: { type: "string", enum: ["hoy", "ayer", "ultimos_7_dias", "mes", "mes_pasado"], description: "Periodo, opcional (por defecto: todo el historial)" },
        profile_id: { type: "number", description: "id del perfil (de PERFILES DE ESTE USUARIO). Omítelo para sumar todos los perfiles." },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "guardar_en_bolsillo",
    description: "Mueve dinero de la cuenta principal a un bolsillo de ahorro del usuario. Úsalo para 'guarda X en el bolsillo Y', 'aparta X para Y', 'mete X al ahorro de Y'.",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        monto: { type: "number", description: "Monto a guardar, en pesos" },
        bolsillo: { type: "string", description: "Nombre del bolsillo, EXACTO como aparece en BOLSILLOS DE ESTE PERFIL" },
        fecha: { type: "string", description: "Fecha AAAA-MM-DD. Solo si el usuario menciona un día distinto a hoy; si no, omítelo." },
        profile_id: { type: "number", description: "id del perfil (de PERFILES DE ESTE USUARIO)" },
      },
      required: ["monto", "bolsillo"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "sacar_de_bolsillo",
    description: "Saca dinero de un bolsillo de ahorro y lo devuelve a la cuenta. Úsalo para 'saca X del bolsillo Y', 'retira X de Y'.",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        monto: { type: "number", description: "Monto a sacar, en pesos" },
        bolsillo: { type: "string", description: "Nombre del bolsillo, EXACTO como aparece en BOLSILLOS DE ESTE PERFIL" },
        profile_id: { type: "number", description: "id del perfil (de PERFILES DE ESTE USUARIO)" },
      },
      required: ["monto", "bolsillo"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "cerrar_mes",
    description: "Cierra el mes anterior con la decisión del usuario sobre el dinero restante. Úsalo SOLO cuando exista un CIERRE DE MES PENDIENTE y el usuario ya haya elegido qué hacer.",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        accion: { type: "string", enum: ["guardar", "pasar", "reiniciar"], description: "guardar = mandar el restante a un bolsillo; pasar = dejarlo como saldo inicial del mes nuevo; reiniciar = dejarlo en cero" },
        bolsillo: { type: "string", description: "Nombre del bolsillo (de BOLSILLOS DE ESTE PERFIL). Solo si accion = 'guardar'." },
      },
      required: ["accion"],
      additionalProperties: false,
    },
  },
];

export class Assistant {
  async processMessage(message: string, context: AssistantContext) {
    const { data: historial } = await supabaseServer
      .from("mensajes")
      .select("role, content")
      .eq("user_id", context.userId)
      .eq("profile_id", context.profileId)
      .order("created_at", { ascending: false })
      .limit(10);

    const historialOrdenado = (historial ?? []).reverse();

    // Perfiles reales de este usuario, para que la IA sepa las opciones
    // y pueda preguntar a cuál perfil pertenece cada movimiento.
    const { data: perfiles } = await supabaseServer
      .from("profiles")
      .select("id, name, is_default")
      .eq("user_id", context.userId)
      .order("id", { ascending: true });

    const listaPerfiles = perfiles ?? [];
    const perfilesTexto = listaPerfiles.length
      ? listaPerfiles
          .map(
            (p: any) =>
              `- ${p.name} (id ${p.id})${p.is_default ? " [por defecto]" : ""}`
          )
          .join("\n")
      : `- Perfil por defecto (id ${context.profileId})`;

    // Socios del perfil vinculado (solo perfiles de negocio suelen tenerlos).
    const { data: socios } = await supabaseServer
      .from("partners")
      .select("id, name")
      .eq("profile_id", context.profileId)
      .eq("active", true)
      .order("name", { ascending: true });

    const listaSocios = socios ?? [];
    const resolverSocio = (nombre?: string): string | undefined => {
      if (!nombre) return undefined;
      const n = String(nombre).trim().toLowerCase();
      return listaSocios.find((s: any) => s.name.trim().toLowerCase() === n)?.id;
    };
    const sociosTexto = listaSocios.length
      ? listaSocios.map((s: any) => `- ${s.name} (id ${s.id})`).join("\n")
      : null;

    // Bolsillos (ahorros) del perfil vinculado.
    const { data: bolsillos } = await supabaseServer
      .from("bolsillos")
      .select("nombre")
      .eq("profile_id", context.profileId)
      .eq("active", true)
      .order("nombre", { ascending: true });

    const bolsillosTexto = (bolsillos ?? []).length
      ? (bolsillos ?? []).map((b: any) => `- ${b.nombre}`).join("\n")
      : null;

    // ¿Quedó el mes anterior sin cerrar? (se pregunta al primer mensaje del mes nuevo)
    const cierre = await movementService
      .pendingClosure(context)
      .catch(() => null);

    const instructions = `
Eres AMARA, el asistente financiero personal del usuario.
Habla como una persona real, natural y breve. No conviertas la conversación en un formulario.
Nunca inventes movimientos, montos, fechas o categorías: si necesitas datos reales, usa tus herramientas.
Nunca menciones código, APIs, Supabase, ni procesos internos.
Nunca menciones a un cliente el id de un perfil: háblale solo por el nombre. El id es solo para las herramientas.
Responde siempre en español.
Hoy es ${fechaBogota()} (fecha de Colombia). Úsala para calcular fechas que el usuario mencione de forma relativa ("ayer", "antier", "el lunes pasado").

CÓMO REGISTRAR UN MOVIMIENTO:
1. Cuando el usuario mencione un gasto o ingreso, primero define el perfil (ver PERFILES DE ESTE USUARIO), luego resume en UNA frase el monto, la categoría y el perfil, y pide confirmación una sola vez.
2. Si el usuario ya confirmó (responde "sí", "dale", "correcto", "hazlo", etc.) a un movimiento que ya resumiste, llama de inmediato a la herramienta correspondiente (registrar_gasto o registrar_ingreso). NO vuelvas a pedir confirmación ni vuelvas a preguntar por datos opcionales.
3. La categoría y la descripción son opcionales: si el usuario no las dio, registra el movimiento igual con lo que tengas.
4. Cómo definir el perfil:
   - Si el usuario tiene un solo perfil, úsalo sin preguntar.
   - Si tiene varios y el mensaje deja claro cuál es (lo nombra), úsalo.
   - Si tiene varios y NO queda claro, pregúntale a qué perfil pertenece el movimiento, nombrándole las opciones, ANTES de resumir y confirmar.
5. Al llamar a registrar_gasto o registrar_ingreso, incluye "profile_id" con el id del perfil elegido, tomado de la lista PERFILES DE ESTE USUARIO.
6. Si una herramienta devuelve "need_profile", pregúntale al usuario en cuál de los perfiles de la lista registrar el movimiento y vuelve a llamar la herramienta con "profile_id". Nunca inventes un id de perfil.
7. Fecha del movimiento: si el usuario dice cuándo ocurrió ("ayer", "el 3", "el lunes pasado"), calcula la fecha en formato AAAA-MM-DD y pásala en "fecha". Si el día es ambiguo (ej. "el 3"), usa la fecha más reciente que YA haya pasado. Si el usuario no menciona ninguna fecha, no envíes "fecha".
8. Socios: si el usuario dice que un socio hizo el movimiento ("Juan puso...", "aporte de María") y ese nombre está en SOCIOS DE ESTE PERFIL, pásalo en "socio" con el nombre EXACTO de la lista. Si el nombre no está en la lista, no lo inventes: registra sin socio o pregunta. Nunca ofrezcas crear un socio ni un perfil: eso solo se hace desde la app.

${cierre ? `CIERRE DE MES PENDIENTE:
Terminó ${cierre.mesTerminado} y quedó sin cerrar. Disponible restante de ese mes: $${cierre.disponible}.
ANTES de responder cualquier otra cosa del usuario, dile en una frase que terminó ${cierre.mesTerminado} con $${cierre.disponible} disponibles y pregúntale qué hacer con ese dinero, con estas 3 opciones:
1) guardarlo en un bolsillo (pregúntale en cuál, de BOLSILLOS DE ESTE PERFIL)
2) pasarlo al mes nuevo como saldo inicial
3) dejarlo en cero
Cuando el usuario elija, llama a cerrar_mes con la acción ("guardar" / "pasar" / "reiniciar") y, si eligió guardar, el nombre del bolsillo. Si nombra un bolsillo que no está en la lista, pregúntale cuál. No sigas con otros temas hasta cerrar esto.

` : ""}CÓMO GUARDAR EN UN BOLSILLO:
- Cuando el usuario diga "guarda X en el bolsillo Y", "aparta X para Y", "mete X al ahorro de Y", resume el monto y el bolsillo, pide confirmación una vez, y al confirmar llama a guardar_en_bolsillo.
- El bolsillo DEBE estar en BOLSILLOS DE ESTE PERFIL. Si el nombre no está, pregúntale al usuario cuál de la lista es. Nunca inventes ni ofrezcas crear un bolsillo (eso solo se hace en la app).
- Si guardar_en_bolsillo responde que no alcanza, dile al usuario cuánto tiene disponible y que no alcanza; no reintentes con otro monto sin que él lo pida.
- Para "saca X del bolsillo Y" / "retira X de Y" usa sacar_de_bolsillo (mismas reglas: el bolsillo debe estar en la lista, confirma antes, y si el bolsillo no tiene saldo suficiente avísale).

CÓMO CONSULTAR GASTOS Y RESUMEN:
- Para gastos usa consultar_gastos. Para "¿cómo voy?", "¿cuánto gané?", "¿cuánto tengo disponible?" usa consultar_resumen.
- Si el usuario nombra un perfil ("¿cuánto gasté en coculo?"), pasa ese profile_id.
- Si tiene varios perfiles y no queda claro de cuál pregunta, pregúntale de cuál quiere el dato, o si quiere el total de todos.
- Si quiere el total general de todo, llama a la herramienta SIN profile_id.
- Al dar el resultado, aclara siempre a qué perfil corresponde ("gastaste $X en 3dsnaptech" o "$X en total, sumando todos los perfiles").
- "disponible" es ingresos menos gastos del periodo; aclara que no incluye bolsillos ni remanente de meses anteriores.

PERFILES DE ESTE USUARIO:
${perfilesTexto}
${sociosTexto ? `\nSOCIOS DE ESTE PERFIL:\n${sociosTexto}\n` : ""}${bolsillosTexto ? `\nBOLSILLOS DE ESTE PERFIL:\n${bolsillosTexto}\n` : ""}
CONFIGURACIÓN DE AMARA:
${JSON.stringify(AMARA_AI)}
`;

    let response = await openai.responses.create({
      model: "gpt-5-mini",
      instructions,
      input: [
        ...historialOrdenado.map((m: any) => ({ role: m.role, content: m.content })),
        { role: "user", content: message },
      ],
            tools,
    } as any);

    // Bucle: ejecutamos herramientas mientras el modelo las pida, con tope de vueltas
    // para no pasarnos del tiempo límite de la función en turnos muy largos.
    let vueltas = 0;
    while (
      vueltas < 4 &&
      response.output.some((item: any) => item.type === "function_call")
    ) {
      vueltas++;
      const toolOutputs = [];

      for (const item of response.output) {
        if (item.type !== "function_call") continue;

        const args = JSON.parse(item.arguments || "{}");
        let result;

        if (item.name === "registrar_gasto") {
          result = await finance.execute(
            { intent: "create_expense", amount: args.amount, category: args.category, description: args.description, profileId: args.profile_id, date: args.fecha, partnerId: resolverSocio(args.socio) },
            context
          );
        } else if (item.name === "registrar_ingreso") {
          result = await finance.execute(
            { intent: "create_income", amount: args.amount, category: args.category, description: args.description, profileId: args.profile_id, date: args.fecha, partnerId: resolverSocio(args.socio) },
            context
          );
        } else if (item.name === "consultar_gastos") {
          result = await finance.execute(
            { intent: "check_expenses", category: args.category, period: args.period, profileId: args.profile_id },
            context
          );
        } else if (item.name === "consultar_resumen") {
          result = await finance.execute(
            { intent: "check_summary", period: args.period, profileId: args.profile_id },
            context
          );
        } else if (item.name === "guardar_en_bolsillo") {
          result = await finance.execute(
            { intent: "save_to_pocket", amount: args.monto, pocket: args.bolsillo, date: args.fecha, profileId: args.profile_id ?? context.profileId },
            context
          );
        } else if (item.name === "sacar_de_bolsillo") {
          result = await finance.execute(
            { intent: "withdraw_from_pocket", amount: args.monto, pocket: args.bolsillo, profileId: args.profile_id ?? context.profileId },
            context
          );
        } else if (item.name === "cerrar_mes") {
          result = cierre
            ? await finance.execute(
                { intent: "close_month", accion: args.accion, bolsillo: args.bolsillo, monthKey: cierre.monthKey, disponible: cierre.disponible, profileId: context.profileId },
                context
              )
            : { success: false, message: "No hay ningún cierre de mes pendiente." };
        } else {
          result = { success: false, message: "Herramienta no reconocida." };
        }

        toolOutputs.push({
          type: "function_call_output",
          call_id: item.call_id,
          output: JSON.stringify(result),
        });
      }

            response = await openai.responses.create({
        model: "gpt-5-mini",
        previous_response_id: response.id,
        input: toolOutputs,
        tools,
      } as any);
    }

    // Nunca devolver vacío: si el modelo no produjo texto, respondemos algo útil.
    const respuesta =
      (response.output_text && response.output_text.trim()) ||
      "Perdón, no te entendí bien. ¿Me lo repites de otra forma?";

    await supabaseServer.from("mensajes").insert([
      { user_id: context.userId, profile_id: context.profileId, role: "user", content: message },
      { user_id: context.userId, profile_id: context.profileId, role: "assistant", content: respuesta },
    ]);

    return respuesta;
  }
}

export const assistant = new Assistant();