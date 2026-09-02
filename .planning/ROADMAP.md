# Roadmap: CRM de Leads

## Milestones

- ✅ **v1.0 MVP** — Fases 1-4 (shipado 2026-07-29) — `.planning/milestones/v1.0-ROADMAP.md`
- ✅ **v1.1 Importação Inteligente** — Fase 5 (shipado 2026-07-30) — `.planning/milestones/v1.1-ROADMAP.md`
- ✅ **v1.2 Follow-up Automático** — Fases 6-7 (shipado 2026-08-01)
- ✅ **v1.3 Qualificação e Histórico de Leads** — Fases 8-12 (shipado 2026-08-30) — `.planning/milestones/v1.3-ROADMAP.md`
- ✅ **v1.4 CRM Genérico Multi-Nicho (despivô)** — Fases 13-15 (shipado 2026-08-31) — `.planning/milestones/v1.4-ROADMAP.md`
- 🚧 **v1.5 Quitação de Débito e Auditoria Retroativa** — Fases 16-19 (em andamento) — detalhes abaixo

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

### 🚧 v1.5 Quitação de Débito e Auditoria Retroativa (Fases 16-19) — EM ANDAMENTO

**Meta do milestone:** Levar o CRM a "auditado, polido, não mexo mais" — verificar no navegador o que nunca foi verificado, fechar os achados de code review em aberto, limpar o lint do repo e dar identidade visual ao produto. **Zero feature funcional nova.**

- [x] **Fase 16: Correções de Code Review da Fase 15** — FIX-01, FIX-02, FIX-03 (2 planos)
- [ ] **Fase 17: Limpeza de Lint do Repo** — LINT-01 (1 plano)
- [ ] **Fase 18: Auditoria Retroativa no Navegador** — AUDIT-01, AUDIT-02, AUDIT-03, AUDIT-04, AUDIT-05 (planos TBD)
- [ ] **Fase 19: Marca e Identidade Visual** — BRAND-01, BRAND-02, BRAND-03 (planos TBD)

## Phase Details

### Phase 16: Correções de Code Review da Fase 15

**Goal**: Os cinco achados abertos do `15-REVIEW.md` estão fechados — o campo `interesse` cumpre o contrato D-04 ("vazio grava NULL, nunca `''`") em todos os caminhos de entrada, e o valor importado do CSV fica visível ao admin antes de confirmar.
**Depends on**: Nada (primeira fase do v1.5). Mudança code-only sobre superfícies já shipadas (Fases 1, 2, 15).
**Requirements**: FIX-01, FIX-02, FIX-03
**Success Criteria** (o que precisa ser verdade):

  1. Criar ou editar um lead com o campo "Interesse" contendo só espaços em branco grava `NULL` no banco (não `''`), e existe caso de teste automatizado cobrindo `createLead({ interesse: "   " })` → linha com `interesse === null`
  2. Ao mapear uma coluna do CSV para "Interesse" no wizard de importação, a prévia mostra uma coluna "Interesse" com o valor que será gravado, no mesmo padrão da coluna "Notas"
  3. O truncamento defensivo em 500 caracteres na importação (D-10) é observável — corte por code point (não code unit, sem partir surrogate pair) e/ou aviso visível na prévia
  4. Os 3 achados `info` do `15-REVIEW.md` estão resolvidos: comentários "7 campos fixos" → "8" em `csv-column-mapper.tsx`; `.slice(0,500)` corta por code point em `csv-import.ts`; `migrate-interesse.cjs` documenta "pare a app antes de rodar" e não acumula backup em execução idempotente
  5. `tsc --noEmit`, `npm run build` e `test:lead-actions` seguem exit 0 com o novo caso incluído

**Plans:** 2/2 plans complete

Plans:
**Wave 1**

- [x] 16-01-PLAN.md — Contrato NULL do `interesse` (WR-01/D-01) + 2 casos de teste whitespace-only + corte por code point no CSV + comentários "8 campos fixos"

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 16-02-PLAN.md — Coluna "Interesse" na prévia do CSV com badge de truncamento + `migrate-interesse.cjs` (doc + sem backup idempotente) + gate SC#5

**Threat surface**: mínima — ajuste em validação Zod e numa tabela de prévia de dados já existentes; nenhuma superfície de entrada nova, sem auth, sem rede, sem schema destrutivo. `/gsd-secure-phase` deve fechar rápido.

### Phase 17: Limpeza de Lint do Repo

**Goal**: `npm run lint` rodado da raiz, sem escopo de arquivos, sai com código `0` — a dívida dos 457 erros pré-existentes acumulada desde a Fase 8 está quitada, sem esconder erro real de `src/`.
**Depends on**: Phase 16 (sequencial — evita rebase da config de lint sobre as mudanças de código do FIX; o host de 4GB pede execução em série de qualquer forma)
**Requirements**: LINT-01
**Success Criteria** (o que precisa ser verdade):

  1. `npm run lint` executado da raiz, sem passar arquivos, termina com exit code `0`
  2. `.claude/get-shit-done` e o worktree órfão estão fora do escopo do ESLint pela config (ignore patterns), não por deleção de arquivos
  3. Scripts `.cjs` passam via override documentado de `no-require-imports`; os falsos-positivos de `react-hooks/refs` têm `eslint-disable` com comentário justificando cada um
  4. Nenhuma regra foi desativada globalmente de forma que mascare um erro real em `src/` — o diff da config é pequeno, revisável e comentado
  5. `deferred-items.md` e a seção Context do `PROJECT.md` não listam mais "`npm run lint` global sai 1" como débito aberto

**Plans**: 1 plano

Plans:
**Wave 1**

- [x] 17-01-PLAN.md — `.claude/**` no `globalIgnores` + override de `scripts/**/*.cjs` (`no-require-imports`) + remoção do worktree órfão + `eslint-disable` documentado nos 4 erros reais de `src/` + docs de débito atualizadas + gate `npm run lint` da raiz exit 0

**Threat surface**: nenhuma — config de tooling e supressões de lint, zero código de runtime tocado. `/gsd-secure-phase` deve fechar rápido.

### Phase 18: Auditoria Retroativa no Navegador

**Goal**: O comportamento shipado das Fases 1, 2, 4, 6 e 8 está verificado com clique real no navegador contra o `data/crm.db` de produção — cada `VERIFICATION.md` sai de `human_needed`/inexistente para `passed`, e toda issue não-trivial encontrada está registrada como quick task.
**Depends on**: Phase 16 (as correções do FIX já refletidas nas superfícies de lead e de importação que a auditoria das Fases 1/2 exercita)
**Requirements**: AUDIT-01, AUDIT-02, AUDIT-03, AUDIT-04, AUDIT-05
**Success Criteria** (o que precisa ser verdade):

  1. `01-HUMAN-UAT.md` e `02-HUMAN-UAT.md` são autorados do zero (não existem hoje) cobrindo CRUD de lead/nicho, dedupe case-insensitive, lista ordenada por follow-up, toolbar, paginação (Fase 1) e upload com detecção de separador/codificação, mapeamento de colunas, prévia com flags e import real (Fase 2) — e executados no navegador; `01-VERIFICATION.md` e `02-VERIFICATION.md` são criados com status `passed`
  2. Os 7 cenários de `04-HUMAN-UAT.md`, os 11 de `06-HUMAN-UAT.md` e os 4 de `08-HUMAN-UAT.md` (já escritos, pendentes) são executados no navegador; cada arquivo vai para `complete` e cada `VERIFICATION.md` correspondente para `passed`
  3. Toda verificação roda sequencialmente (host 4GB, sem processos em paralelo), via extensão Claude no Chrome contra o banco real `data/crm.db`
  4. Cada issue encontrada que não seja regressão trivial vira quick task registrada em `.planning/quick/`, sem bloquear o fecho do requisito de auditoria
  5. `STATE.md` §Deferred Items não lista mais os `uat_gap`/`verification_gap` das Fases 1, 2, 4, 6 e 8

**Plans**: TBD (candidato a divisão: autorar+testar Fases 1/2 numa onda, rodar os cenários existentes das Fases 4/6/8 noutra)
**Threat surface**: nenhuma — trabalho de verificação de comportamento já shipado; não altera código de runtime (só docs de UAT/verification e, se houver achado, quick tasks separadas). `/gsd-secure-phase` deve fechar rápido.

### Phase 19: Marca e Identidade Visual

**Goal**: O CRM tem cara de produto — nome próprio definido e registrado, paleta e tipografia escolhidas pelo usuário via `/brand-design` e aplicadas em light + dark, e "CRM de Leads" renomeado em toda superfície visível, sem nenhuma regressão visual nas telas existentes.
**Depends on**: Phase 18 (BRAND por último para o check de não-regressão visual cobrir o estado final do app; a auditoria feita antes garante uma base de comportamento limpa)
**Requirements**: BRAND-01, BRAND-02, BRAND-03
**Success Criteria** (o que precisa ser verdade):

  1. O app tem um nome de produto definido (candidato do usuário: "SOLO"), com a decisão e o racional registrados em `brand.md` na raiz do repo
  2. `/brand-design` foi rodado — ~6 paletas candidatas revisadas em preview HTML no navegador, o usuário escolheu uma, e ela está aplicada como shadcn CSS variables (light + dark) em `globals.css`
  3. A tipografia está ligada via `next/font`
  4. `brand.md` documenta paleta, tipografia e tom/voz; "CRM de Leads" foi renomeado para o nome escolhido no `layout.tsx` (`<title>` + description), no header da sidebar (`app-sidebar.tsx`) e em qualquer outro lugar onde o nome antigo aparece
  5. Verificação no navegador confirma que nenhuma tela existente regrediu visualmente (layout, contraste, dark mode, legibilidade)

**Plans**: TBD
**UI hint**: yes
**Threat surface**: baixa — CSS variables, strings de metadata e carregamento de fonte; sem lógica nova. Passa pelo UI safety gate (`workflow.ui_phase` + `ui_safety_gate` ativos).

## Progress

**Execution Order:** 16 → 17 → 18 → 19 (numérica). FIX (código de menor risco) primeiro para não ser invalidado por trabalho posterior; LINT em seguida; AUDIT depois (mais pesado, browser-UAT sequencial); BRAND por último, para o check de não-regressão visual cobrir o estado final.

| Milestone | Fases | Planos | Status |
|-----------|-------|--------|--------|
| v1.0 MVP | 1-4 | 15 | ✅ 2026-07-29 |
| v1.1 Importação Inteligente | 5 | 2 | ✅ 2026-07-30 |
| v1.2 Follow-up Automático | 6-7 | 4 | ✅ 2026-08-01 |
| v1.3 Qualificação e Histórico | 8-12 | 20 | ✅ 2026-08-30 |
| v1.4 CRM Genérico Multi-Nicho | 13-15 | 7 | ✅ 2026-08-31 |
| **v1.5 Quitação de Débito e Auditoria Retroativa** | **16-19** | **TBD** | 🚧 em andamento |

| Fase | Milestone | Planos | Status | Concluída |
|------|-----------|--------|--------|-----------|
| 16. Correções de Code Review da Fase 15 | v1.5 | 2/2 | Complete    | 2026-09-01 |
| 17. Limpeza de Lint do Repo | v1.5 | 1/1 | Complete   | 2026-09-02 |
| 18. Auditoria Retroativa no Navegador | v1.5 | 0/TBD | Not started | - |
| 19. Marca e Identidade Visual | v1.5 | 0/TBD | Not started | - |

---

_Próximo: `/gsd-plan-phase 16`. Candidatos adiados para v1.6+: handoff Prospector→CRM (HANDOFF-01..03), teste de nicho formal (CAMPANHA-01), backlog PME._
