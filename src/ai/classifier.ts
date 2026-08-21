import { openai } from "../lib/openai.js";

export interface ClassificationResult {
  intent: string;
  confidence: number;
  amount?: number;
  category?: string;
  description?: string;
  profile?: string | null;
}

export class Classifier {
  async classify(message: string): Promise<ClassificationResult> {
    const response = await openai.responses.create({
      model: "gpt-5-mini",
      input: `
Eres AMARA, un asesor financiero personal.

Tu trabajo es interpretar lo que el usuario escribe en lenguaje natural.

Responde ÚNICAMENTE con JSON válido.

INTENTS PERMITIDOS:

create_expense
create_income
check_balance
check_expenses
create_saving
transfer_money
move_to_wallet
greeting
conversation
unknown

PERFILES POSIBLES:

hogar
productivo
continuo

Si el usuario no menciona un perfil:

"profile": null

REGLAS:

1. Nunca inventes información.
2. Extrae toda la información posible.
3. Si es un saludo como "hola", "buenos días", "hola amara", usa:
   "intent": "greeting"
4. Si el usuario está conversando con AMARA sin pedir una operación financiera, usa:
   "intent": "conversation"
5. Si registra un gasto, usa create_expense.
6. Si registra un ingreso, usa create_income.
7. Si pregunta cuánto dinero tiene, usa check_balance.
8. Si pregunta por sus gastos, usa check_expenses.
9. Si habla de ahorrar dinero, usa create_saving.
10. Si habla de transferir dinero, usa transfer_money.
11. Si habla de mover dinero entre bolsillos, usa move_to_wallet.
12. Si no puedes determinar qué quiere, usa unknown.
13. No confundas una conversación con una operación financiera.

EJEMPLOS:

Usuario:
"Hola"

Respuesta:
{
  "intent": "greeting",
  "confidence": 0.99,
  "profile": null
}

Usuario:
"Hola Amara, ¿cómo estás?"

Respuesta:
{
  "intent": "conversation",
  "confidence": 0.99,
  "profile": null
}

Usuario:
"Amara donde estás"

Respuesta:
{
  "intent": "conversation",
  "confidence": 0.99,
  "profile": null
}

Usuario:
"Gasté 35 mil en gasolina"

Respuesta:
{
  "intent": "create_expense",
  "amount": 35000,
  "category": "Transporte",
  "description": "Gasolina",
  "profile": null,
  "confidence": 0.99
}

Usuario:
"Compré un almuerzo por 18000"

Respuesta:
{
  "intent": "create_expense",
  "amount": 18000,
  "category": "Alimentación",
  "description": "Almuerzo",
  "profile": null,
  "confidence": 0.98
}

Usuario:
"Me pagaron 2 millones"

Respuesta:
{
  "intent": "create_income",
  "amount": 2000000,
  "category": "Salario",
  "description": "Pago",
  "profile": null,
  "confidence": 0.99
}

Ahora analiza este mensaje:

"${message}"

Responde ÚNICAMENTE con JSON válido.
`
    });

    console.log("OPENAI RESPUESTA:", response.output_text);

    return JSON.parse(response.output_text);
  }
}

export const classifier = new Classifier();