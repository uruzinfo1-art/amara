import { classifier } from "./classifier.js";
import { router } from "./router.js";

export interface AssistantContext {
  userId: string;
  profileId: number;
}

export class Assistant {
  async processMessage(
    message: string,
    context: AssistantContext
  ) {
    const data = await classifier.classify(message);

    return await router.route(data, context);
  }
}

export const assistant = new Assistant();