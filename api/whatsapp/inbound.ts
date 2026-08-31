import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Vonage } from "@vonage/server-sdk";
import { assistant } from "../../src/ai/assistant.js";
import { createClient } from "@supabase/supabase-js";
import { waitUntil } from "@vercel/functions";

const supabaseServer = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const vonage = new Vonage(
  {
    apiKey: process.env.VONAGE_API_KEY!,
    apiSecret: process.env.VONAGE_API_SECRET!,
  },
  {
    apiHost: "https://messages-sandbox.nexmo.com",
  }
);

// Vercel: dale hasta 60s a esta función (en vez de los 10s por defecto del plan free).
export const maxDuration = 60;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// El sandbox de Vonage limita a ~1 mensaje/seg. Si da 429, esperamos y reintentamos.
async function enviarWhatsApp(payload: any, intentos = 3) {
  for (let i = 1; i <= intentos; i++) {
    try {
      await vonage.messages.send(payload);
      return;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 429 && i < intentos) {
        console.log(`Vonage 429, reintento ${i}/${intentos - 1} en 1.5s`);
        await sleep(1500);
        continue;
      }
      throw err;
    }
  }
}

// Trabajo pesado: corre en segundo plano DESPUÉS de responderle a Vonage,
// para que Vonage reciba su "OK" rápido y no reenvíe el mismo mensaje.
async function procesarMensaje(from: string, to: string, text: string) {
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

    await enviarWhatsApp({
      channel: "whatsapp",
      messageType: "text",
      to: from,
      from: to,
      text: textoRespuesta,
    });
    console.log("Respuesta enviada correctamente");
  } catch (error) {
    console.error("Error procesando el mensaje:", error);
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method === "GET") {
    return res.status(200).send("AMARA WhatsApp inbound OK");
  }

  if (req.method === "POST") {
    console.log("WhatsApp mensaje recibido:", req.body);

    const from = req.body?.from;
    const to = req.body?.to;
    const text = req.body?.text;

    console.log("FROM:", from, "TO:", to, "MENSAJE:", text);

    if (!from || !to) {
      return res.status(400).json({ error: "Faltan from o to" });
    }

    // Mensajes de activación del sandbox de Vonage ("Join <palabra>").
    if (typeof text === "string" && /^\s*join\s/i.test(text)) {
      console.log("Mensaje de activación del sandbox, ignorado:", text);
      return res.status(200).json({ received: true, ignored: "sandbox_join" });
    }

    // Mensajes sin texto (imagen, audio, etc.): no hay nada que procesar.
    if (!text || !String(text).trim()) {
      console.log("Mensaje sin texto, ignorado");
      return res.status(200).json({ received: true, ignored: "no_text" });
    }

    // --- Anti-duplicados: huella única por mensaje ---
    const fingerprint = String(
      req.body?.message_uuid ??
        `${from}|${text}|${req.body?.timestamp ?? ""}`
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

    // Le respondemos YA a Vonage para que no reenvíe; el resto va en segundo plano.
    res.status(200).json({ received: true });

    const trabajo = procesarMensaje(String(from), String(to), String(text));
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
