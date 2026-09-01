import dotenv from "dotenv";
dotenv.config();

import handler from "../api/whatsapp/inbound";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Huella de prueba: un id de mensaje (wamid) inventado, único por corrida.
const WAMID = "wamid.test-dedupe-" + Date.now();

// Número que NO está en whatsapp_contacts: el trabajo en segundo plano se detiene
// al no encontrar el contacto, antes de llamar a OpenAI o a Meta.
// Aquí probamos SOLO el anti-duplicados y el descarte de avisos de estado.
function crearBodyMensaje(wamid: string, text = "prueba anti-duplicados") {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "0",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "15556417438",
                phone_number_id: "0",
              },
              contacts: [{ profile: { name: "Test" }, wa_id: "000000000000" }],
              messages: [
                {
                  from: "000000000000",
                  id: wamid,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: "text",
                  text: { body: text },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

// Aviso de estado (entregado/leído): Meta lo manda por la misma URL. Debe ignorarse.
const bodyEstado = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "0",
      changes: [
        {
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            metadata: {
              display_phone_number: "15556417438",
              phone_number_id: "0",
            },
            statuses: [
              {
                id: "wamid.algo",
                status: "delivered",
                timestamp: "0",
                recipient_id: "000000000000",
              },
            ],
          },
        },
      ],
    },
  ],
};

// "res" falso que captura lo que responde el handler.
function crearRes() {
  const res: any = {
    statusCode: null as number | null,
    body: null as any,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
    send(payload: any) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

async function postear(etiqueta: string, body: any) {
  const req: any = { method: "POST", body };
  const res = crearRes();
  await handler(req, res);
  console.log(`${etiqueta} -> status ${res.statusCode} | body:`, res.body);
  return res;
}

async function main() {
  try {
    console.log("Huella de prueba:", WAMID, "\n");

    const r1 = await postear("POST #1 (nuevo)   ", crearBodyMensaje(WAMID));
    const r2 = await postear("POST #2 (repetido)", crearBodyMensaje(WAMID));

    const okDedupe =
      r2.statusCode === 200 &&
      r2.body?.duplicate === true &&
      r1.body?.duplicate !== true;

    const rEstado = await postear("POST aviso de estado", bodyEstado);
    const okEstado =
      rEstado.statusCode === 200 && rEstado.body?.ignored === "no_message";

    console.log(
      "\n--- Resultado ---\n" +
        (okDedupe
          ? "OK: el segundo POST fue detectado como duplicado y NO se reprocesó.\n"
          : "FALLO: el segundo POST no fue tratado como duplicado.\n") +
        (okEstado
          ? "OK: el aviso de estado fue ignorado."
          : "FALLO: el aviso de estado no fue ignorado.")
    );
  } finally {
    await supabase.from("whatsapp_dedupe").delete().eq("fingerprint", WAMID);
    console.log("Huella de prueba borrada de whatsapp_dedupe.");
  }
}

main();
