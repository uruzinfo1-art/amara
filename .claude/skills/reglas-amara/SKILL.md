---
name: reglas-amara
description: Decisiones de arquitectura y reglas de negocio ya definidas para AMARA. Úsala en cualquier cambio a assistant.ts, finance.ts, movements.ts, rules.ts o el flujo de WhatsApp.
---

AMARA es un asistente financiero por WhatsApp. Decisiones ya tomadas, no las reviertas sin confirmarlo explícitamente con el usuario:

1. Arquitectura de un solo agente: toda la conversación con el cliente pasa por assistant.ts, que decide por sí mismo cuándo usar herramientas (function calling) como registrar_gasto, registrar_ingreso, consultar_gastos. No debe haber texto de respuesta fijo/plantilla en router.ts ni controller.ts hablando directo al cliente — classifier.ts, router.ts y controller.ts quedaron retirados de ese flujo.
2. Máximo 2 mensajes de WhatsApp por cada mensaje recibido del cliente. Nunca fragmentar una respuesta en más mensajes de los necesarios.
3. Nunca inventar montos, categorías, fechas ni movimientos. Si faltan datos reales, el agente debe consultarlos con sus herramientas o preguntar al usuario, nunca asumir.
4. Confirmar antes de guardar: mostrar un resumen del gasto/ingreso y esperar confirmación explícita del cliente antes de ejecutar la herramienta que escribe en Supabase.
5. El perfil se resuelve así: el número de teléfono en whatsapp_contacts define el perfil por defecto. Si el usuario tiene varios perfiles y no queda claro a cuál pertenece un movimiento, AMARA le pregunta a cuál antes de registrar. Un movimiento puede registrarse en cualquier perfil que pertenezca a ese user_id (las herramientas registrar_gasto / registrar_ingreso aceptan profile_id, y movements.ts valida que el perfil sea del usuario).
6. La conversación tiene memoria: cada turno se guarda en la tabla "mensajes" (user_id, profile_id, role, content) y se debe leer el historial reciente antes de responder.
7. Cuidado con mensajes duplicados: Vonage puede reenviar el mismo mensaje si el servidor tarda en responder. Cualquier cambio a inbound.ts debe considerar esto (ej. usando la tabla whatsapp_dedupe).
