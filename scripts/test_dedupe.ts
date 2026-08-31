import dotenv from "dotenv";
dotenv.config();

import handler from "../api/whatsapp/inbound";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Huella de prueba: un message_uuid inventado, único por corrida.
const MESSAGE_UUID = "test-dedupe-" + Date.now();

// Número que NO está en whatsapp_contacts: el handler se detiene en el 403
// antes de llamar a OpenAI o a Vonage. Probamos SOLO el anti-duplicados.
const fakeBody = {
  from: "000000000000",
  to: "111111111111",
  text: "prueba anti-duplicados",
  message_uuid: MESSAGE_UUID,
  timestamp: new Date().toISOString(),
};

// "res" falso que captura lo que responde el handler.
function crearRes() {
  const res: any = {
    statusCode: null as number | null,
    body: null as any,
    status(code: number) { this.statusCode = code; return this; },
    json(payload: any) { this.body = payload; return this; },
    send(payload: any) { this.body = payload; return this; },
  };
  return res;
}

async function postear(etiqueta: string, body: any = fakeBody) {
  const req: any = { method: "POST", body };
  const res = crearRes();
  await handler(req, res);
  console.log(`${etiqueta} -> status ${res.statusCode} | body:`, res.body);
  return res;
}

async function main() {
  try {
    console.log("Huella de prueba:", MESSAGE_UUID, "\n");

    const r1 = await postear("POST #1 (nuevo)   ");
    const r2 = await postear("POST #2 (repetido)");

    const okDedupe =
      r2.statusCode === 200 &&
      r2.body?.duplicate === true &&
      r1.body?.duplicate !== true;

    // Mensaje de activación del sandbox: debe ignorarse sin procesarse.
    const rJoin = await postear("POST 'Join shed said'", {
      from: "000000000000",
      to: "111111111111",
      text: "Join shed said",
      message_uuid: "test-join-" + Date.now(),
      timestamp: new Date().toISOString(),
    });
    const okJoin =
      rJoin.statusCode === 200 && rJoin.body?.ignored === "sandbox_join";

    console.log(
      "\n--- Resultado ---\n" +
        (okDedupe
          ? "OK: el segundo POST fue detectado como duplicado y NO se reprocesó.\n"
          : "FALLO: el segundo POST no fue tratado como duplicado.\n") +
        (okJoin
          ? "OK: el mensaje 'Join ...' fue ignorado."
          : "FALLO: el mensaje 'Join ...' no fue ignorado.")
    );
  } finally {
    await supabase
      .from("whatsapp_dedupe")
      .delete()
      .eq("fingerprint", MESSAGE_UUID);
    console.log("Huella de prueba borrada de whatsapp_dedupe.");
  }
}

main();
