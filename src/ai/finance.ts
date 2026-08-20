import { movementService } from "./services/movements";
export class Finance {

  async execute(data: any) {

    switch (data.intent) {

      case "create_expense":

        return await movementService.create(data);

      case "create_income":

         return await movementService.create(data);

      case "check_balance":

        return {
          success: true,
          action: "balance_requested"
        };

      case "check_expenses":

        return {
          success: true,
          action: "expenses_requested"
        };

      default:

        return {
          success: false,
          message: "Intent no implementado."
        };

    }

  }

}

export const finance = new Finance();