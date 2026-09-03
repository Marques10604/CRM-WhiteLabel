# SOLO

**CRM pra quem trabalha sozinho.**

Organiza leads da área da saúde recebidos em lote por CSV, categoriza por nicho
(nutricionista, terapeuta, etc.) e move cada lead por um pipeline de vendas simples até o
fechamento. O admin aborda os leads pelo Instagram e WhatsApp usando templates de mensagem
prontos. O objetivo: nunca mais perder um follow-up e enxergar o funil de relance —
substituindo a planilha do Google Sheets.

Ferramenta solo, um único usuário, sem autenticação. Acesso pelo navegador no computador.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (CSS-first, sem `tailwind.config.js`) + **shadcn/ui** sobre Base UI
- **Drizzle ORM** + **SQLite** (`better-sqlite3`) — banco local em `data/crm.db`
- **PapaParse** (import de CSV), **Zod** + **react-hook-form** (validação), **@dnd-kit** (board do pipeline)
- Sem API oficial de WhatsApp — link `wa.me` com mensagem pré-preenchida

## Rodar localmente

```bash
npm install
npm run dev        # http://localhost:3000
```

O banco fica em `data/crm.db` (um arquivo SQLite — backup = copiar o arquivo).

```bash
npm run build      # build de produção (Turbopack)
npm run lint       # ESLint da raiz
npm run verify:brand && npm run verify:brand-md && npm run check:contrast   # gates de marca
```

## Marca

Nome, paleta, tipografia e tom/voz estão documentados em [`brand.md`](./brand.md).
O nome "SOLO" é provisório — ver a ressalva de colisão em `brand.md` antes de qualquer
movimento de produto.
