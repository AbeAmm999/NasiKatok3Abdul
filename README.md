# Nasi Katok 3 Abdul — Order System

Starter Next.js project for a new ordering system.

## Local setup
1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Run `npm run dev`.
4. Open `http://localhost:3000`.

## Deploy
Import this repository into Vercel. Keep the repository root as the project root; the `app/` directory must be at the root alongside `package.json`.

## Important current limitations
- The order endpoint validates a starter payload but does not persist orders.
- WhatsApp Cloud API delivery is not enabled.
- The WhatsApp Flow JSON has not yet been registered with Meta.
- Server-side pickup slot validation and production database will be added before production use.
- Do not add real API tokens to GitHub. Set secrets in Vercel Environment Variables.

## Environment variables
See `.env.example`; values must be obtained from Meta WhatsApp Business Platform setup.
