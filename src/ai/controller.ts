import { assistant, AssistantContext } from "./assistant.js";
import { movementService } from "./services/movements.js";

export class AIController {
  async process(message: string, context: AssistantContext) {
    const financialData = await movementService.getMovements(context);

    const result = await assistant.processMessage(
      message,
      context,
      financialData
    );

    return result;
  }
}

export const aiController = new AIController();