import dotenv from "dotenv";
dotenv.config();

import { aiController } from "./controller";

async function test() {
  try {

    const result = await aiController.process(
      "Gasté 35 mil en gasolina."
    );

    console.log(result);

  } catch (error) {

    console.error(error);

  }
}

test();