import { finance } from "./finance";

export class Router {

  async route(data: any) {

    const result = await finance.execute(data);

    if (!result) {
      return "No pude procesar tu solicitud.";
    }

    switch (data.intent) {

      case "create_expense":
        return `✅ Gasto registrado: $${data.amount?.toLocaleString("es-CO")} en ${data.category || "Otros"}${data.description ? ` (${data.description})` : ""}.`;

      case "create_income":
        return `✅ Ingreso registrado: $${data.amount?.toLocaleString("es-CO")} — ${data.description || data.category || "Ingreso"}.`;

      case "check_balance":
        return "📊 La consulta de saldo todavía está en desarrollo.";

      case "check_expenses":
        return "📊 La consulta de gastos todavía está en desarrollo.";

      case "create_saving":
        return "💰 La función de ahorro todavía está en desarrollo.";

      case "transfer_money":
        return "💸 La función de transferencias todavía está en desarrollo.";

      case "move_to_wallet":
        return "👛 La función de movimientos entre bolsillos todavía está en desarrollo.";

      default:
        return "No entendí lo que necesitas. Puedes decirme, por ejemplo: \"Gasté 35 mil en gasolina\".";
    }
  }

}

export const router = new Router();