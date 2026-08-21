import { openai } from "../lib/openai.js";
import { finance } from "./finance.js";
import { AMARA_AI } from "./rules.js";

export interface AssistantContext {
  userId: string;
  profileId: number;
}

export class Assistant {
  async processMessage(
    message: string,
    context: AssistantContext
  ) {
    const response = await openai.responses.create({
      model: "gpt-5-mini",

      input: [
        {
          role: "system",
          content: `
Eres AMARA, un asesor financiero personal.

Tu función está limitada exclusivamente a la información y funciones disponibles dentro de AMARA.

${JSON.stringify(AMARA_AI)}

REGLAS IMPORTANTES:

1. Habla de forma natural, como una persona.
2. Puedes conversar con el usuario, pero la conversación debe estar relacionada con AMARA o sus finanzas.
3. Nunca respondas preguntas externas a AMARA.
4. Nunca inventes datos financieros.
5. Si necesitas información financiera, debes consultarla mediante las funciones disponibles de AMARA.
6. Puedes analizar, comparar y razonar sobre los datos financieros obtenidos.
7. No respondas simplemente con números si el usuario está pidiendo un análisis.
8. Si falta información necesaria, pregunta al usuario.
9. Respeta siempre el usuario y perfil proporcionados por el sistema.
10. Nunca mezcles información entre perfiles.
11. Responde en español.
12. Sé breve, clara, natural y profesional.
13. No menciones herramientas, código, Supabase, APIs, intents ni procesos internos.

CONTEXTO DEL USUARIO:
userId: ${context.userId}
profileId: ${context.profileId}

MENSAJE DEL USUARIO:
${message}
`
        }
      ]
    });

    return response.output_text;
  }
}

export const assistant = new Assistant();