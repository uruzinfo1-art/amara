import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Vonage } from "@vonage/server-sdk";
import { assistant } from "../../src/ai/assistant.js";
import { createClient } from "@supabase/supabase-js";

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

    console.log("FROM:", from);
    console.log("TO:", to);
    console.log("MENSAJE:", text);

    if (!from || !to) {
      return res.status(400).json({
        error: "Faltan from o to",
      });
    }

    // --- Protección contra mensajes duplicados de Vonage (Opción A) ---
    // Vonage reenvía el mismo mensaje si tardamos en responder. Usamos el
    // message_uuid como "huella" única (con un respaldo si no viniera).
    const fingerprint = String(
      req.body?.message_uuid ??
        `${from}|${text ?? ""}|${req.body?.timestamp ?? ""}`
    );

    // ¿Ya procesamos este mensaje antes?
    const { data: yaVisto } = await supabaseServer
      .from("whatsapp_dedupe")
      .select("fingerprint")
      .eq("fingerprint", fingerprint)
      .maybeSingle();

    if (yaVisto) {
      console.log("Mensaje duplicado, ignorado:", fingerprint);
      return res.status(200).json({ received: true, duplicate: true });
    }

    // Marcamos el mensaje como visto ANTES de procesarlo.
    const { error: dedupeError } = await supabaseServer
      .from("whatsapp_dedupe")
      .insert({ fingerprint, created_at: new Date().toISOString() });

    if (dedupeError) {
      // 23505 = índice único: otra copia del mismo webhook llegó casi a la vez.
      if (dedupeError.code === "23505") {
        console.log("Mensaje duplicado (carrera), ignorado:", fingerprint);
        return res.status(200).json({ received: true, duplicate: true });
      }
      // Otro error al guardar la huella: lo registramos, pero no bloqueamos el mensaje.
      console.error("Error registrando huella anti-duplicados:", dedupeError);
    }

    console.log(
  "SUPABASE URL:",
  process.env.SUPABASE_URL
);

const {
  data: whatsappContact,
  error: whatsappContactError
} = await supabaseServer
  .from("whatsapp_contacts")
  .select("user_id, profile_id")
  .eq("phone", String(from))
  .limit(1)
  .maybeSingle();

if (whatsappContactError) {
  console.error("Error buscando WhatsApp:", whatsappContactError);

  return res.status(500).json({
    error: "No se pudo identificar la cuenta de WhatsApp",
  });

}
    if (!whatsappContact) {
  console.log("Número de WhatsApp no registrado:", from);

  return res.status(403).json({
    error: "Número de WhatsApp no registrado en AMARA",
  });
}
    const userId = whatsappContact.user_id;
    const profileId = whatsappContact.profile_id;

    console.log("USUARIO AMARA:", userId);
    console.log("PERFIL AMARA:", profileId);

    if (!profileId) {
      return res.status(400).json({
        error: "El WhatsApp no tiene un perfil de AMARA asignado",
      });
    }

    try {
      const respuesta = await assistant.processMessage(text, {
        userId,
        profileId,
      });

      console.log("RESPUESTA AMARA:", respuesta);

      await vonage.messages.send({
        channel: "whatsapp",
        messageType: "text",
        to: from,
        from: to,
        text: respuesta,
      });

      console.log("Respuesta enviada correctamente");

      return res.status(200).json({
        received: true,
        replied: true,
      });
    } catch (error) {
      console.error("Error enviando respuesta:", error);

      return res.status(500).json({
        error: "No se pudo enviar la respuesta",
      });
    }
  }

  return res.status(405).send("Method Not Allowed");
}