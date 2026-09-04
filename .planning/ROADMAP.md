# Roadmap: CRM de Leads

## Milestones

- ✅ **v1.0 MVP** — Fases 1-4 (shipado 2026-07-29) — `.planning/milestones/v1.0-ROADMAP.md`
- ✅ **v1.1 Importação Inteligente** — Fase 5 (shipado 2026-07-30) — `.planning/milestones/v1.1-ROADMAP.md`
- ✅ **v1.2 Follow-up Automático** — Fases 6-7 (shipado 2026-08-01)
- ✅ **v1.3 Qualificação e Histórico de Leads** — Fases 8-12 (shipado 2026-08-30) — `.planning/milestones/v1.3-ROADMAP.md`
- ✅ **v1.4 CRM Genérico Multi-Nicho (despivô)** — Fases 13-15 (shipado 2026-08-31) — `.planning/milestones/v1.4-ROADMAP.md`
- ✅ **v1.5 Quitação de Débito e Auditoria Retroativa** — Fases 16-19 (shipado 2026-09-03) — `.planning/milestones/v1.5-ROADMAP.md`
- 🚧 **v1.6 Dark Mode + Exportar CSV** — Fases 20-21 (em planejamento)

## Phases

<details>
<summary>✅ v1.0 MVP (Fases 1-4) — SHIPADO 2026-07-29</summary>

- [x] Fase 1: Lead & Sub-nicho Foundation (4/4 planos) — 2026-07-22
- [x] Fase 2: CSV Bulk Import (3/3 planos) — 2026-07-24
- [x] Fase 3: Sales Pipeline & Funnel View (4/4 planos) — 2026-07-21
- [x] Fase 4: Follow-up Dashboard & WhatsApp Outreach (4/4 planos) — 2026-07-22

Detalhes: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v1.1 Importação Inteligente (Fase 5) — SHIPADO 2026-07-30</summary>

- [x] Fase 5: Notas Enriquecidas na Importação CSV (2/2 planos) — 2026-07-30

Detalhes: `.planning/milestones/v1.1-ROADMAP.md`

</details>

<details>
<summary>✅ v1.2 Follow-up Automático (Fases 6-7) — SHIPADO 2026-08-01</summary>

- [x] Fase 6: Auto-avanço de Etapa + Contador de Tentativas (2/2 planos) — 2026-07-30
- [x] Fase 7: Configuração de Dias-Parado por Etapa (2/2 planos) — 2026-07-31

</details>

<details>
<summary>✅ v1.3 Qualificação e Histórico de Leads (Fases 8-12) — SHIPADO 2026-08-30</summary>

**Meta:** Qualificar leads por origem e dar visibilidade ao histórico de interação e ao resultado do funil.

- [x] Fase 8: Origem Governada + Separação Inbound × Outbound (3/3 planos) — 2026-08-07
- [x] Fase 9: Timeline de Interações (4/4 planos) — 2026-08-09
- [x] Fase 10: Sequência de Follow-up Escalonada (4/4 planos) — 2026-08-13
- [x] Fase 11: Painel de Métricas e Relatório de Motivos de Perda (5/5 planos) — 2026-08-29
- [x] Fase 12: Agenda / Tarefas Soltas (4/4 planos) — 2026-08-30

Detalhes completos: `.planning/milestones/v1.3-ROADMAP.md`

</details>

<details>
<summary>✅ v1.4 CRM Genérico Multi-Nicho — despivô (Fases 13-15) — SHIPADO 2026-08-31</summary>

**Meta:** Tirar o CRM da amarra "área da saúde" — o admin usa a mesma ferramenta pra leads de qualquer nicho, e o relatório responde "esse nicho converteu na janela que testei?". Rename + reframe + 2 adições pequenas, não rebuild.

- [x] Fase 13: Rename `sub-nicho → nicho` + reframe (3/3 planos) — 2026-08-30 — NICHO-01, NICHO-02, COPY-01 · UAT 8/8, security 9/9, verification passed
- [x] Fase 14: Filtro de intervalo customizado em `/relatorios` (2/2 planos) — 2026-08-30 — METRICAS-03 · UAT 11/11, code review 10/10, security 10/10 · PR #4
- [x] Fase 15: Campo "interesse / serviço desejado" no lead (2/2 planos) — 2026-08-31 — LEAD-06 · UAT 5/5, code review 0 critical, security 0 threats · PR #5

Detalhes completos: `.planning/milestones/v1.4-ROADMAP.md`

</details>

<details>
<summary>✅ v1.5 Quitação de Débito e Auditoria Retroativa (Fases 16-19) — SHIPADO 2026-09-03</summary>

**Meta:** Levar o CRM a "auditado, polido, não mexo mais" — verificar no navegador o que nunca foi verificado, fechar os achados de code review em aberto, limpar o lint do repo e dar identidade visual ao produto. **Zero feature funcional nova.**

- [x] Fase 16: Correções de Code Review da Fase 15 (2/2 planos) — 2026-09-01 — FIX-01/02/03 · code review 1 blocker (CR-01) corrigido, security 0 threats, verification passed
- [x] Fase 17: Limpeza de Lint do Repo (1/1 plano) — 2026-09-02 — LINT-01 · `npm run lint` da raiz exit 0 (de 457 erros, ~98% ruído de ferramental), verification passed
- [x] Fase 18: Auditoria Retroativa no Navegador (6/6 planos) — 2026-09-02 — AUDIT-01..05 · método code+data (host 4GB bloqueou o navegador); 5 `VERIFICATION.md` passed, 0 issues de runtime
- [x] Fase 19: Marca e Identidade Visual (6/6 planos) — 2026-09-03 — BRAND-01/02/03 · nome "SOLO", paleta "Corrente Funda · Sóbria" (OKLCH light+dark), 33 arquivos cor→token, favicon próprio · code review 2 WR corrigidos, security 0 threats, verification passed 5/5 (code+data)

Detalhes completos: `.planning/milestones/v1.5-ROADMAP.md`

</details>

### 🚧 v1.6 Dark Mode + Exportar CSV (Fases 20-21) — EM PLANEJAMENTO

**Meta do milestone:** Dois utilitários pequenos que faltavam — o admin escolhe claro/escuro e leva os leads pra fora do sistema em CSV. Nada estrutural, zero mudança de schema. As duas fases são independentes entre si.

**Contexto herdado que os planos precisam:**
- Stack: Next.js 16.2 (App Router, Turbopack) + Drizzle/SQLite + shadcn-on-Base-UI + Zod + react-hook-form + Tailwind v4.
- `next-themes` **já é dependência** (hoje usado só pelo `sonner`). Dark mode = adicionar `ThemeProvider` + o controle de toggle; **não** adicionar biblioteca de tema nova.
- O bloco de tokens `.dark` **já existe** em `src/app/globals.css` e foi verificado WCAG AA (30/30 pares de contraste) na Fase 19. A Fase 20 **não** redefine tokens — só liga o toggle. A constraint D-16 da Fase 19 ("sem ThemeProvider / sem toggle") está **explicitamente suspensa** por este milestone.
- O toggle mora no rodapé da sidebar (`src/components/app-sidebar.tsx`), switch sol/lua, visível em toda tela. Tem que evitar FOUC / flash de cor errada no load (`next-themes` `attribute="class"` + `suppressHydrationWarning` no `<html>` em `src/app/layout.tsx`).
- Export: `/leads` usa `@tanstack/react-table` (`src/components/lead-table.tsx` + `lead-table-toolbar.tsx` + `lead-table-columns.tsx`). PapaParse (5.5.4) já é dependência (usada no import CSV). O botão "Exportar CSV" vai na toolbar da lista e serializa as linhas atualmente filtradas/buscadas. Nicho e motivo de perda saem como nome, não id (os mapas id→nome já existem pro display da tabela). Datas formatadas (`date-fns` disponível).
- Host de 4GB: comandos de verificação sempre sequenciais, nunca em paralelo.
- O host não roda `dev` + navegador + sessão do agente juntos desde a Fase 18 — a verificação destas fases provavelmente será por **code+data** (declarar, precedente das Fases 18/19).
- Ship por push direto na `main` (sem PR — projeto solo), consistente com as Fases 16-19.

- [x] **Fase 20: Tema / Dark Mode** (1/1 plano) — 2026-09-04 — THEME-01..04 · ThemeProvider next-themes + toggle sol/lua no rodapé da sidebar, sem FOUC · security 0 threats, verification passed 5/5 (code+data) · push direto p/ main
- [ ] **Fase 21: Exportar CSV da Lista de Leads** (0/1 plano) — botão "Exportar CSV" em `/leads` que baixa exatamente as linhas visíveis (filtros + ordenação), com colunas legíveis por humano

### 📋 Backlog pós-v1.6 (sem milestone)

Candidatos ainda em aberto: handoff Prospector→CRM (HANDOFF-01..03, quando o Prospector existir),
teste de nicho formal (CAMPANHA-01), backlog PME (tags livres, temperatura automática, busca
global, anexo por lead, campo de vendedor, meta mensal). Débito herdado: WR-03/WR-04 da Fase 19,
8 quick tasks de UI, confirmação puramente visual da Fase 19.

## Phase Details

### Phase 20: Tema / Dark Mode
**Goal**: O admin passa a escolher entre tema claro e escuro por um controle no rodapé da sidebar; a escolha é lembrada entre sessões e o primeiro acesso segue a preferência do sistema, tudo sem flash de cor errada no carregamento.
**Depends on**: Nada — os tokens `.dark` já vieram prontos da Fase 19; independente da Fase 21
**Requirements**: THEME-01, THEME-02, THEME-03, THEME-04
**Success Criteria** (o que precisa ser VERDADE):
  1. O admin vê um controle sol/lua no rodapé da sidebar em qualquer tela, e acioná-lo troca a interface inteira entre claro e escuro na hora.
  2. Depois de escolher um tema, dar refresh ou fechar e reabrir o navegador mantém o tema escolhido.
  3. Num navegador sem escolha salva, o app abre no esquema (claro ou escuro) configurado no sistema operacional.
  4. Ao carregar qualquer página, o conteúdo já aparece na cor final — sem flash claro antes de aplicar o escuro (nem o contrário).
  5. O controle indica visualmente qual tema está ativo no momento.
**Plans**: 1 plano
- [x] 20-01-PLAN.md — ThemeProvider + toggle sol/lua no rodapé da sidebar, persistência via next-themes, sem FOUC
**UI hint**: yes

### Phase 21: Exportar CSV da Lista de Leads
**Goal**: O admin baixa a lista de leads de `/leads` como um arquivo CSV que reflete exatamente os filtros e a ordenação ativos na tabela naquele momento, com colunas legíveis por humano.
**Depends on**: Nada — independente da Fase 20; trabalha sobre a tabela de `/leads` já existente
**Requirements**: EXPORT-01, EXPORT-02, EXPORT-03
**Success Criteria** (o que precisa ser VERDADE):
  1. Em `/leads` há um botão "Exportar CSV" na toolbar da tabela, e clicá-lo baixa um arquivo `.csv`.
  2. Com os filtros da toolbar (nicho, etapa, intervalo de follow-up) e/ou a ordenação aplicados, o CSV contém só as linhas visíveis naquele momento — não a base inteira.
  3. Abrindo o CSV numa planilha: cada lead é uma linha, nicho e motivo de perda aparecem como nome (não id), e as datas estão formatadas de forma legível.
  4. O arquivo abre corretamente em Excel / Google Sheets — separador e codificação reconhecidos, acentos preservados.
**Plans**: 1 plano
- [x] 21-01-PLAN.md — módulo puro de serialização CSV (BOM UTF-8 + `;`, colunas legíveis, guard de CSV injection) + `motivoPerdaNome` no `LeadRow` + botão "Exportar CSV" na toolbar de `/leads`
**UI hint**: yes

## Progress

| Milestone | Fases | Planos | Status |
|-----------|-------|--------|--------|
| v1.0 MVP | 1-4 | 15 | ✅ 2026-07-29 |
| v1.1 Importação Inteligente | 5 | 2 | ✅ 2026-07-30 |
| v1.2 Follow-up Automático | 6-7 | 4 | ✅ 2026-08-01 |
| v1.3 Qualificação e Histórico | 8-12 | 20 | ✅ 2026-08-30 |
| v1.4 CRM Genérico Multi-Nicho | 13-15 | 7 | ✅ 2026-08-31 |
| v1.5 Quitação de Débito e Auditoria Retroativa | 16-19 | 15 | ✅ 2026-09-03 |
| v1.6 Dark Mode + Exportar CSV | 20-21 | 2 | 🚧 planejamento |

### v1.6 — detalhe por fase

| Fase | Planos | Status | Completada |
|------|--------|--------|-----------|
| 20. Tema / Dark Mode | 1/1 | Complete   | 2026-09-04 |
| 21. Exportar CSV da Lista de Leads | 1/1 | Complete   | 2026-09-04 |
