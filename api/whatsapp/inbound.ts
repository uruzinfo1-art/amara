import type { VercelRequest, VercelResponse } from "@vercel/node";
import { assistant } from "../../src/ai/assistant.js";
import { createClient } from "@supabase/supabase-js";
import { waitUntil } from "@vercel/functions";

const supabaseServer = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// --- WhatsApp Cloud API de Meta ---
const META_API_VERSION = "v25.0";
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

// Vercel: dale hasta 60s a esta función (en vez de los 10s por defecto del plan free).
export const maxDuration = 60;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Envía un texto por WhatsApp usando la Cloud API de Meta.
// Si Meta responde 429 (demasiadas peticiones) o 5xx, espera y reintenta.
async function enviarWhatsApp(to: string, body: string, intentos = 3) {
  const url = `https://graph.facebook.com/${META_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body },
  };

  for (let i = 1; i <= intentos; i++) {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (resp.ok) return;

    const detalle = await resp.text().catch(() => "");
    if ((resp.status === 429 || resp.status >= 500) && i < intentos) {
      console.log(`Meta ${resp.status}, reintento ${i}/${intentos - 1} en 1.5s`);
      await sleep(1500);
      continue;
    }
    throw new Error(`Meta rechazó el envío (${resp.status}): ${detalle}`);
  }
}

// Trabajo pesado: corre en segundo plano DESPUÉS de responderle a Meta,
// para que el webhook conteste rápido y Meta no reintente ni desactive la URL.
async function procesarMensaje(from: string, text: string) {
  try {
    // Limpieza oportunista de huellas viejas (>3 días).
    const hace3dias = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    await supabaseServer
      .from("whatsapp_dedupe")
      .delete()
      .lt("created_at", hace3dias);

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
    if (!whatsappContact) {
      console.log("Número de WhatsApp no registrado:", from);
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
