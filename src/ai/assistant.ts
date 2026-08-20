import { classifier } from "./classifier.js";
import { router } from "./router.js";

export class Assistant {

  async processMessage(message: string) {

    const data = await classifier.classify(message);

    return await router.route(data);

  }

}

export const assistant = new Assistant();