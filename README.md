<<<<<<< HEAD
# AgilizaOS – Sistema de Ordem de Serviço e Financeiro para Assistências Técnicas

## 📦 Estrutura do Projeto
- `apps/web` – Plataforma Web (Next.js + TailwindCSS)
- `apps/mobile` – App Mobile (Expo + React Native)
- `backend/functions` – Backend com Firebase Functions
- `shared/` – Código compartilhado entre web e mobile
- `config/` – Arquivos de configuração
- `scripts/` – Scripts auxiliares de build e deploy
- `public/` – Logos, termos e arquivos públicos

## 🚀 Como rodar o projeto

### Web (Next.js)
```bash
cd apps/web
npm install
npm run dev
```

### Mobile (Expo)
```bash
cd apps/mobile
npm install
npx expo start
```

### Backend (Firebase)
```bash
cd backend
firebase init functions
cd functions
npm install
firebase emulators:start
```

## 🔐 Variáveis de Ambiente (.env)
Exemplo de chaves mínimas:
```
NEXT_PUBLIC_FIREBASE_API_KEY=xxxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxxx
```

## 📄 Instrução do Projeto
O documento completo de funcionalidades está no arquivo:
```
INSTRUCAO_PROJETO_SAAS_ASSISTENCIA.txt
```

---

> Última atualização: 13/05/2025
=======
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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
>>>>>>> d26ed87 (primeiro commit)
