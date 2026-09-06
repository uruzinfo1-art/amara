import type { VercelRequest, VercelResponse } from "@vercel/node";
import { assistant } from "../../src/ai/assistant.js";
import { createClient } from "@supabase/supabase-js";
import { waitUntil } from "@vercel/functions";
import { enviarWhatsApp, descargarMedia } from "../../src/lib/whatsapp.js";
import { openai } from "../../src/lib/openai.js";

const supabaseServer = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

// Vercel: dale hasta 60s a esta función (en vez de los 10s por defecto del plan free).
export const maxDuration = 60;

// Transcribe una nota de voz de WhatsApp (ogg/opus) a texto. No se guarda nada.
async function transcribirAudio(base64: string, mimeType: string): Promise<string> {
  const bytes = Buffer.from(base64, "base64");
  const ext = mimeType.includes("mpeg")
    ? "mp3"
    : mimeType.includes("mp4") || mimeType.includes("m4a")
    ? "m4a"
    : "ogg";
  const file = new File([bytes], `audio.${ext}`, { type: mimeType || "audio/ogg" });
  const tr: any = await openai.audio.transcriptions.create({
    file: file as any,
    model: "whisper-1",
    language: "es",
  } as any);
  return tr?.text || "";
}

// Trabajo pesado: corre en segundo plano DESPUÉS de responderle a Meta,
// para que el webhook conteste rápido y Meta no reintente ni desactive la URL.
async function procesarMensaje(from: string, msg: any) {
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

    const tipo: string = msg?.type || "text";
    const texto: string | undefined = msg?.text?.body;

    // ¿El mensaje (de texto) es un código de vinculación? Ej: "AMARA 7K3P9Q"
    const mCodigo = texto
      ? texto.trim().match(/^amara[\s:_-]*([a-z0-9]{6})$/i)
      : null;
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
    console.log("USUARIO AMARA:", userId, "PERFIL AMARA:", profileId, "TIPO:", tipo);

    if (!profileId) {
      console.log("El WhatsApp no tiene un perfil de AMARA asignado");
      return;
    }

    // --- Armar la entrada para la IA según el tipo de mensaje ---
    let mensajeParaIA = "";
    let media:
      | { imageDataUrl?: string; fileDataUrl?: string; filename?: string }
      | undefined;

    const avisoGrande = (que: string) =>
      `${que} es muy pesado/a. Mándalo más liviano o escríbeme el dato.`;

    if (tipo === "text") {
      mensajeParaIA = (texto || "").trim();
      if (!mensajeParaIA) return;
    } else if (tipo === "image") {
      try {
        const m = await descargarMedia(msg.image.id);
        media = { imageDataUrl: `data:${m.mimeType};base64,${m.base64}` };
        mensajeParaIA =
          (msg.image.caption && String(msg.image.caption).trim()) ||
          "Registra el gasto de este recibo.";
      } catch (e: any) {
        await enviarWhatsApp(
          from,
          e?.message === "ARCHIVO_MUY_GRANDE"
            ? avisoGrande("Esa imagen")
            : "No pude abrir la imagen. Intenta de nuevo o escríbeme el gasto."
        );
        return;
      }
    } else if (tipo === "document") {
      const mime: string = msg.document?.mime_type || "";
      if (mime.startsWith("image/") || mime === "application/pdf") {
        try {
          const m = await descargarMedia(msg.document.id);
          if (mime === "application/pdf") {
            media = {
              fileDataUrl: `data:application/pdf;base64,${m.base64}`,
              filename: msg.document.filename || "recibo.pdf",
            };
          } else {
            media = { imageDataUrl: `data:${m.mimeType};base64,${m.base64}` };
          }
          mensajeParaIA =
            (msg.document.caption && String(msg.document.caption).trim()) ||
            "Registra el gasto de este recibo.";
        } catch (e: any) {
          await enviarWhatsApp(
            from,
            e?.message === "ARCHIVO_MUY_GRANDE"
              ? avisoGrande("Ese archivo")
              : "No pude abrir el archivo. Escríbeme el gasto."
          );
          return;
        }
      } else {
        await enviarWhatsApp(
          from,
          "Por ahora solo leo fotos de recibos y PDF. Escríbeme el gasto o mándame una foto."
        );
        return;
      }
    } else if (tipo === "audio") {
      try {
        const m = await descargarMedia(msg.audio.id);
        mensajeParaIA = (await transcribirAudio(m.base64, m.mimeType)).trim();
        console.log("TRANSCRIPCIÓN:", mensajeParaIA);
        if (!mensajeParaIA) {
          await enviarWhatsApp(
            from,
            "No entendí la nota de voz. ¿Me la repites o me lo escribes?"
          );
          return;
        }
      } catch (e: any) {
        await enviarWhatsApp(
          from,
          e?.message === "ARCHIVO_MUY_GRANDE"
            ? avisoGrande("Esa nota de voz")
            : "No pude procesar la nota de voz. Intenta de nuevo o escríbeme."
        );
        return;
      }
    } else {
      await enviarWhatsApp(
        from,
        "Por ahora entiendo texto, fotos y PDF de recibos, y notas de voz."
      );
      return;
    }

    const respuesta = await assistant.processMessage(
      mensajeParaIA,
      { userId, profileId },
      media
    );
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

    const value = req.body?.entry?.[0]?.changes?.[0]?.value;
    const msg = value?.messages?.[0];

    // Sin mensaje entrante (avisos de estado u otros eventos): nada que procesar.
    if (!msg) {
      return res.status(200).json({ received: true, ignored: "no_message" });
    }

    const from = msg.from; // número del cliente, solo dígitos, sin "+"
    console.log("FROM:", from, "TIPO:", msg.type);

    if (!from) {
      return res.status(200).json({ received: true, ignored: "no_from" });
    }

    // --- Anti-duplicados: huella única por mensaje (Meta reintenta si tardamos) ---
    const fingerprint = String(
      msg.id ?? `${from}|${msg.type}|${msg.timestamp ?? ""}`
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

    const trabajo = procesarMensaje(String(from), msg);
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
