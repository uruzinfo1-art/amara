import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { movementService } from "../../src/ai/services/movements.js";
import { enviarWhatsApp } from "../../src/lib/whatsapp.js";

const supabaseServer = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const maxDuration = 60;

function formatMonto(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

// Trabajo programado (Vercel Cron, el 1º de cada mes): le avisa por WhatsApp a
// cada cliente vinculado que tenga el mes anterior sin cerrar. La respuesta del
// cliente la maneja el webhook normal (inbound.ts -> assistant.ts ya sabe
// interpretar un cierre de mes pendiente, herramienta cerrar_mes).
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Solo Vercel (o quien tenga el secreto) puede disparar este trabajo.
  const auth = req.headers.authorization;
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).send("Unauthorized");
  }

  const { data: contactos, error } = await supabaseServer
    .from("whatsapp_contacts")
    .select("phone, user_id, profile_id")
    .not("profile_id", "is", null);

  if (error) {
    console.error("Error listando contactos para el cierre mensual:", error);
    return res.status(500).json({ error: error.message });
  }

  let avisados = 0;
  let sinCambios = 0;
  let fallidos = 0;

  for (const contacto of contactos ?? []) {
    try {
      const cierre: any = await movementService.pendingClosure({
        userId: contacto.user_id,
        profileId: contacto.profile_id,
      });

      if (!cierre) {
        sinCambios++;
        continue;
      }

      const mensaje = `Terminó ${cierre.mesTerminado} 🌱 Te quedaron ${formatMonto(cierre.disponible)} disponibles. ¿Qué hago con ese dinero: lo guardo en un bolsillo, lo paso al mes nuevo, o lo dejo en cero?`;

      await enviarWhatsApp(contacto.phone, mensaje);
      await supabaseServer.from("mensajes").insert({
        user_id: contacto.user_id,
        profile_id: contacto.profile_id,
        role: "assistant",
        content: mensaje,
      });
      avisados++;
    } catch (e) {
      console.error("Error avisando cierre de mes a", contacto.phone, e);
      fallidos++;
    }
  }

  console.log(
    `Cierre mensual: ${avisados} avisados, ${sinCambios} sin cambios, ${fallidos} fallidos`
  );
  return res.status(200).json({ avisados, sinCambios, fallidos });
}
