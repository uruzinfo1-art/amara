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

        return {
          success: true,
          action: "balance_requested"
        };

      case "check_expenses":

  return await movementService.getExpenses(context);

      default:

        return {
          success: false,
          message: "Intent no implementado."
        };

    }

  }

}

export const finance = new Finance();