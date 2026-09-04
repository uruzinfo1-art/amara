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
