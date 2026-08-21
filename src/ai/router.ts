import { finance } from "./finance.js";

export class Router {
  async route(
    data: any,
    context: { userId: string; profileId: number }
  ) {
    switch (data.intent) {
      case "greeting":
        return "Hola 👋 Soy AMARA. Estoy aquí para ayudarte con tus finanzas.";

      case "conversation":
        return "Aquí estoy 😊. ¿Qué necesitas revisar de tus finanzas?";

      case "create_expense":
        await finance.execute(data, context);

        return `✅ Gasto registrado: $${data.amount?.toLocaleString("es-CO")} en ${
          data.category || "Otros"
        }${data.description ? ` (${data.description})` : ""}.`;

      case "create_income":
        await finance.execute(data, context);

        return `✅ Ingreso registrado: $${data.amount?.toLocaleString("es-CO")} — ${
          data.description || data.category || "Ingreso"
        }.`;

      case "check_balance":
        return "📊 La consulta de saldo todavía está en desarrollo.";

     case "check_expenses": {
  const gastos = await finance.execute(data, context);

  if (!gastos.success || !("total" in gastos)) {
  return "📊 No pude consultar tus gastos en este momento.";
}

const total = "total" in gastos ? Number(gastos.total) : 0;

return `📊 Has gastado ${total.toLocaleString("es-CO")} en total.`;
}

      case "create_saving":
        return "💰 La función de ahorro todavía está en desarrollo.";

      case "transfer_money":
        return "💸 La función de transferencias todavía está en desarrollo.";

      case "move_to_wallet":
        return "👛 La función de movimientos entre bolsillos todavía está en desarrollo.";

      default:
        return "No estoy seguro de lo que necesitas. Puedes preguntarme sobre tus finanzas o decirme algo como: \"Gasté 35 mil en gasolina\".";
    }
  }
}

export const router = new Router();