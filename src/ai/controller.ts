import { assistant } from "./assistant";

export class AIController {

  async process(message: string) {

    const result = await assistant.processMessage(message);

    return result;

  }

}

export const aiController = new AIController();