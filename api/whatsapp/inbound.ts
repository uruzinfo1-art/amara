import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Vonage } from "@vonage/server-sdk";
import { assistant } from "../../src/ai/assistant";

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

    try {
      const respuesta = await assistant.processMessage(text);

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