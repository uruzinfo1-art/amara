// Envío de mensajes por la WhatsApp Cloud API de Meta.
// Compartido entre el webhook (api/whatsapp/inbound.ts) y trabajos en segundo
// plano como el cron del cierre de mes (api/cron/cierre-mensual.ts).

const META_API_VERSION = "v25.0";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Envía un texto por WhatsApp. Si Meta responde 429 (demasiadas peticiones)
// o 5xx, espera y reintenta.
export async function enviarWhatsApp(to: string, body: string, intentos = 3) {
  const url = `https://graph.facebook.com/${META_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
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
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
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

// Descarga un archivo enviado por WhatsApp (foto, PDF, nota de voz) a memoria.
// Devuelve los bytes en base64 + el tipo. No se guarda en ningún lado.
const MAX_MEDIA_BYTES = 10 * 1024 * 1024; // 10 MB

export async function descargarMedia(
  mediaId: string
): Promise<{ base64: string; mimeType: string; bytes: number }> {
  const token = process.env.WHATSAPP_TOKEN;

  // 1) Metadatos: URL temporal + tipo + tamaño.
  const metaResp = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/${mediaId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!metaResp.ok) {
    throw new Error(`No se pudo leer el medio (${metaResp.status})`);
  }
  const meta: any = await metaResp.json();
  const mimeType: string = meta.mime_type || "application/octet-stream";
  const size = Number(meta.file_size || 0);
  if (size && size > MAX_MEDIA_BYTES) {
    throw new Error("ARCHIVO_MUY_GRANDE");
  }

  // 2) Descargar los bytes (misma cabecera de token).
  const fileResp = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!fileResp.ok) {
    throw new Error(`No se pudo descargar el medio (${fileResp.status})`);
  }
  const buf = Buffer.from(await fileResp.arrayBuffer());
  if (buf.byteLength > MAX_MEDIA_BYTES) {
    throw new Error("ARCHIVO_MUY_GRANDE");
  }

  return { base64: buf.toString("base64"), mimeType, bytes: buf.byteLength };
}
