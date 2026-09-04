import type { VercelRequest, VercelResponse } from "@vercel/node";
import { assistant } from "../../src/ai/assistant.js";
import { createClient } from "@supabase/supabase-js";
import { waitUntil } from "@vercel/functions";
import { enviarWhatsApp } from "../../src/lib/whatsapp.js";

const supabaseServer = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

// Vercel: dale hasta 60s a esta función (en vez de los 10s por defecto del plan free).
export const maxDuration = 60;

// Trabajo pesado: corre en segundo plano DESPUÉS de responderle a Meta,
// para que el webhook conteste rápido y Meta no reintente ni desactive la URL.
async function procesarMensaje(from: string, text: string) {
  try {
    // Limpieza oportunista de huellas viejas (>3 días) y códigos vencidos.
    const hace3dias = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    await supabaseServer
      .from("whatsapp_dedupe")
      .delete()
      .lt("created_at", hace3dias);
    await supabaseServer
      .from("whatsapp_link_codes")
      .delete()
      .lt("expires_at", new Date().toISOString());

    // ¿El mensaje es un código de vinculación? Ej: "AMARA 7K3P9Q"
    const mCodigo = text.trim().match(/^amara[\s:_-]*([a-z0-9]{6})$/i);
    const codigo = mCodigo ? mCodigo[1].toUpperCase() : null;

    const { data: whatsappContact, error: whatsappContactError } =
      await supabaseServer
        .from("whatsapp_contacts")
        .select("user_id, profile_id")
        .eq("phone", from)
        .limit(1)
        .maybeSingle();

    if (whatsappContactError) {
      console.error("Error buscando WhatsApp:", whatsappContactError);
      return;
    }

    // --- Caso: el mensaje trae un código de vinculación ---
    if (codigo) {
      const { data: fila } = await supabaseServer
        .from("whatsapp_link_codes")
        .select("code, user_id, profile_id, expires_at")
        .eq("code", codigo)
        .maybeSingle();

      if (!fila || new Date(fila.expires_at) < new Date()) {
        await enviarWhatsApp(
          from,
          "Ese código no es válido o ya venció. Genera uno nuevo en la app: Ajustes → Conectar con WhatsApp."
        );
        return;
      }

      const { error: upErr } = await supabaseServer
        .from("whatsapp_contacts")
        .upsert(
          { phone: from, user_id: fila.user_id, profile_id: fila.profile_id },
          { onConflict: "phone" }
        );

      if (upErr) {
        console.error("Error vinculando WhatsApp:", upErr);
        await enviarWhatsApp(
          from,
          "Tuve un problema al conectar tu WhatsApp. Intenta de nuevo en un minuto."
        );
        return;
      }

      await supabaseServer.from("whatsapp_link_codes").delete().eq("code", codigo);
      await enviarWhatsApp(
        from,
        '¡Listo! ✅ Tu WhatsApp quedó conectado a AMARA. Ya puedes registrar gastos e ingresos o preguntarme cómo vas. Por ejemplo: "gasté 20 mil en almuerzo".'
      );
      return;
    }

    // --- Caso: número no vinculado y sin código ---
    if (!whatsappContact) {
      console.log("Número de WhatsApp no registrado:", from);
      await enviarWhatsApp(
        from,
        'Hola 👋 Soy AMARA. Para empezar, abre la app y entra a Ajustes → Conectar con WhatsApp, y envíame el código que te muestra (algo como "AMARA ABC123").'
      );
      return;
    }

    const userId = whatsappContact.user_id;
    const profileId = whatsappContact.profile_id;
    console.log("USUARIO AMARA:", userId, "PERFIL AMARA:", profileId);

    if (!profileId) {
      console.log("El WhatsApp no tiene un perfil de AMARA asignado");
      return;
    }

    const respuesta = await assistant.processMessage(text, { userId, profileId });
    console.log("RESPUESTA AMARA:", respuesta);

    const textoRespuesta =
      typeof respuesta === "string" && respuesta.trim()
        ? respuesta
        : "Perdón, tuve un problema para responder. Intenta de nuevo.";

    await enviarWhatsApp(from, textoRespuesta);
    console.log("Respuesta enviada correctamente");
  } catch (error) {
    console.error("Error procesando el mensaje:", error);
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // --- Verificación del webhook: Meta llama con GET UNA vez al conectarlo ---
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token && token === WHATSAPP_VERIFY_TOKEN) {
      console.log("Webhook de Meta verificado correctamente");
      return res.status(200).send(challenge);
    }
    console.warn("Verificación de webhook fallida (token no coincide)");
    return res.status(403).send("Forbidden");
  }

  if (req.method === "POST") {
    console.log("WhatsApp evento recibido:", JSON.stringify(req.body));

    // Meta anida todo. Un webhook puede traer un mensaje entrante o un aviso
    // de estado (entregado/leído). Tomamos el primer mensaje entrante, si lo hay.
    const value = req.body?.entry?.[0]?.changes?.[0]?.value;
    const msg = value?.messages?.[0];

    // Sin mensaje entrante (avisos de estado u otros eventos): nada que procesar.
    if (!msg) {
      return res.status(200).json({ received: true, ignored: "no_message" });
    }

    const from = msg.from; // número del cliente, solo dígitos, sin "+"
    const text = msg.text?.body;

    console.log("FROM:", from, "MENSAJE:", text);

    if (!from) {
      return res.status(200).json({ received: true, ignored: "no_from" });
    }

    // Mensajes sin texto (imagen, audio, ubicación, etc.): nada que procesar.
    if (!text || !String(text).trim()) {
      console.log("Mensaje sin texto, ignorado");
      return res.status(200).json({ received: true, ignored: "no_text" });
    }

    // --- Anti-duplicados: huella única por mensaje (Meta reintenta si tardamos) ---
    const fingerprint = String(
      msg.id ?? `${from}|${text}|${msg.timestamp ?? ""}`
    );

    const { data: yaVisto } = await supabaseServer
      .from("whatsapp_dedupe")
      .select("fingerprint")
      .eq("fingerprint", fingerprint)
      .maybeSingle();

    if (yaVisto) {
      console.log("Mensaje duplicado, ignorado:", fingerprint);
      return res.status(200).json({ received: true, duplicate: true });
    }

    const { error: dedupeError } = await supabaseServer
      .from("whatsapp_dedupe")
      .insert({ fingerprint, created_at: new Date().toISOString() });

    if (dedupeError) {
      if (dedupeError.code === "23505") {
        console.log("Mensaje duplicado (carrera), ignorado:", fingerprint);
        return res.status(200).json({ received: true, duplicate: true });
      }
      console.error("Error registrando huella anti-duplicados:", dedupeError);
    }

    // Le respondemos YA a Meta para que no reintente; el resto va en segundo plano.
    res.status(200).json({ received: true });

    const trabajo = procesarMensaje(String(from), String(text));
    try {
      waitUntil(trabajo);
    } catch {
      // Fuera del contexto de Vercel (p. ej. pruebas locales): lo dejamos correr suelto.
      void trabajo;
    }
    return;
  }

  return res.status(405).send("Method Not Allowed");
}
