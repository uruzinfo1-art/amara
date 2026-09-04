import { movementService } from "./services/movements.js";
export class Finance {

  async execute(
  data: any,
  context: { userId: string; profileId: number }
) {

    switch (data.intent) {

      case "create_expense":

        return await movementService.create(data, context);

      case "create_income":

         return await movementService.create(data, context);

      case "check_balance":
      case "check_summary":

        return await movementService.getResumen(data, context);

      case "check_expenses":

  return await movementService.getExpenses(data, context)

      case "save_to_pocket":

        return await movementService.saveToPocket(data, context);

      case "close_month":

        return await movementService.closeMonth(data, context);

      default:

        return {
          success: false,
          message: "Intent no implementado."
        };

    }

  }

}

export const finance = new Finance();