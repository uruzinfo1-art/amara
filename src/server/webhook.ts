import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(express.json());

const PORT = 3001;

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "amara_webhook_2026";

// Verificación del webhook de Meta
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook de WhatsApp verificado");

    res.status(200).send(challenge);
    return;
  }

  console.log("❌ Verificación del webhook rechazada");

  res.sendStatus(403);
});

// Recepción de mensajes de WhatsApp
app.post("/webhook", (req, res) => {
  console.log("📩 WhatsApp recibió un evento:");
  console.log(JSON.stringify(req.body, null, 2));

  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor AMARA iniciado en http://localhost:${PORT}`);
});