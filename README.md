This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## NEXA AI

NEXA AI is a dark-first unified AI workspace for currently available free models. The application uses Next.js, strict TypeScript, and a provider boundary that keeps credentials on the server.

## Current foundation

- Premium responsive workspace shell with mobile navigation drawer
- AI modes, prompt suggestions, composer states, and context panel
- Accessible focus states and reduced-motion support
- Server-only OpenRouter catalog adapter
- Strict zero-price free-model policy enforced in the backend
- Hugging Face adapter boundary with quota-aware status language
- `GET /api/models` catalog endpoint

## Run locally

1. Copy `.env.example` to `.env.local`.
2. Add `OPENROUTER_API_KEY` and/or `HUGGINGFACE_API_KEY`.
3. Run `npm run dev`.
4. Open `http://localhost:3000`.

Provider keys are never read by client components or persisted in browser storage. Hugging Face free availability may be subject to provider quotas.

## Verification

```bash
npm run lint
npm run build
```

The next implementation slice is the chat request pipeline: validated messages, model routing, streaming, health tracking, and bounded fallback across the two provider adapters.
