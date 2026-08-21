import { assistant, AssistantContext } from "./assistant.js";

export class AIController {
  async process(message: string, context: AssistantContext) {
    const result = await assistant.processMessage(message, context);

    return result;
  }
}

export const aiController = new AIController();