import { openai } from "../lib/openai";

export interface ClassificationResult {
  intent: string;
  confidence: number;
  amount?: number;
  category?: string;
  description?: string;
  profile?: string;
}
export class Classifier {
  async classify(message: string): Promise<ClassificationResult> {

    const response = await openai.responses.create({
      model: "gpt-5-mini",
      input: `
Eres el motor de interpretación de AMARA.

Analiza el mensaje del usuario y responde ÚNICAMENTE en JSON.

Extrae toda la información posible.

Intents permitidos:

create_expense
create_income
check_balance
check_expenses
create_saving
transfer_money
move_to_wallet
unknown

Perfiles posibles:

hogar
productivo
continuo

Si el usuario no menciona el perfil escribe:

"profile": null

Si no conoces una categoría usa:

"Otros"

Ejemplos:

Usuario:
Gasté 35 mil en gasolina.

Respuesta:

{
"intent":"create_expense",
"amount":35000,
"category":"Transporte",
"description":"Gasolina",
"profile":null,
"confidence":0.99
}

Usuario:
Compré un almuerzo por 18000.

Respuesta:

{
"intent":"create_expense",
"amount":18000,
"category":"Alimentación",
"description":"Almuerzo",
"profile":null,
"confidence":0.98
}

Usuario:
Me pagaron 2 millones.

Respuesta:

{
"intent":"create_income",
"amount":2000000,
"category":"Salario",
"description":"Pago",
"profile":null,
"confidence":0.99
}

Ahora analiza este mensaje.

Responde ÚNICAMENTE con JSON válido.

Mensaje:

"${message}"
`
    });

    return JSON.parse(response.output_text);
  }
}

export const classifier = new Classifier();