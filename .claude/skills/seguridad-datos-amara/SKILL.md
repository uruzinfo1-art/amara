---
name: seguridad-datos-amara
description: Reglas de seguridad para manejar variables de entorno y credenciales en este proyecto (AMARA). Úsala siempre que se toquen archivos .env, Supabase o llaves de API.
---

Este proyecto maneja datos financieros de usuarios reales. Reglas estrictas:

1. Nunca sugieras poner el prefijo VITE_ (ni ningún prefijo que exponga variables al navegador) a SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, VONAGE_API_SECRET, ni ninguna llave secreta. Esas variables son solo para el backend.
2. Antes de usar una variable de entorno nueva, revisa si ya existe con otro nombre en el .env antes de pedir crear una nueva.
3. Si detectas una llave secreta expuesta en un archivo que se envía al navegador (cualquier .tsx, .jsx, o carpeta client/frontend), avisa de inmediato como un problema de seguridad urgente, no como una nota al final.
4. Nunca imprimas (console.log) el valor completo de una variable de entorno sensible, ni en código de prueba ni en logs.
5. Al pedir al usuario que verifique una variable, pídele que confirme si existe o el nombre de la variable — nunca que pegue el valor en el chat.
