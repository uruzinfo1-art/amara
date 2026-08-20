import { finance } from "./finance";

export class Router {

  async route(data: any) {

    return await finance.execute(data);

  }

}

export const router = new Router();