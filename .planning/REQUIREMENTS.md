# Requirements: CRM de Leads

**Defined:** 2026-08-31
**Milestone:** v1.5 Quitação de Débito e Auditoria Retroativa
**Core Value:** Nunca mais perder um follow-up e enxergar o funil de vendas de relance — substituindo a planilha do Google Sheets.

## v1.5 Requirements

Escopo do milestone v1.5 — quitar débito acumulado e dar cara de produto ao CRM. **Zero feature funcional nova.** Quatro frentes: auditoria retroativa no navegador (Fases 1/2/4/6/8), fechar os achados do `15-REVIEW.md`, zerar o `npm run lint` do repo, e definir marca/identidade visual.

### Auditoria Retroativa (UAT no navegador)

Fases já shipadas cujo comportamento nunca foi verificado com clique real. O host de 4GB → verificação sequencial, UAT via extensão Claude no Chrome contra `data/crm.db` real. Issue encontrada que não seja regressão trivial vira quick task registrada, não bloqueia o fecho do requisito.

- [ ] **AUDIT-01**: Fase 1 (Lead & Nicho Foundation) — cenários de UAT autorados (nenhum `01-HUMAN-UAT.md` existe) e executados no navegador cobrindo CRUD de lead, CRUD de nicho com dedupe case-insensitive, lista de leads ordenada por follow-up, filtros da toolbar e paginação; `01-VERIFICATION.md` criado com status `passed`
- [ ] **AUDIT-02**: Fase 2 (CSV Bulk Import) — cenários de UAT autorados (nenhum `02-HUMAN-UAT.md` existe) e executados no navegador cobrindo upload com detecção de separador/codificação, mapeamento de colunas, prévia com flags (duplicado / nicho novo / nicho bloqueado) e import real no banco; `02-VERIFICATION.md` criado com status `passed`
- [ ] **AUDIT-03**: Fase 4 (Follow-up Dashboard & WhatsApp) — os 7 cenários de `04-HUMAN-UAT.md` executados no navegador (dashboard por urgência, CRUD de templates com "um padrão por tipo", preview de WhatsApp editável, auto-gatilho de 1º contato nas 3 superfícies, boundary de 7 dias, race no drag-to-Perdido, `stageChangedAt`/`motivoPerda`); `04-HUMAN-UAT.md` → `complete`, `04-VERIFICATION.md` → `passed`
- [ ] **AUDIT-04**: Fase 6 (Auto-avanço de Etapa + Contador) — os 11 cenários de `06-HUMAN-UAT.md` executados no navegador (auto-avanço Novo→Contatado só com template de 1º contato, nunca regride além de Contatado, contador incrementa a todo clique, cancelamento não altera nada, superfícies `/`+`/leads`+`/importar/[batchId]`, indicadores "esfriando" + contador na mesma linha); `06-HUMAN-UAT.md` → `complete`, `06-VERIFICATION.md` → `passed`
- [ ] **AUDIT-05**: Fase 8 (Origem Governada Inbound × Outbound) — os 4 cenários de `08-HUMAN-UAT.md` executados no navegador (campo "Tipo de origem" abaixo de "Origem" sem pré-seleção na criação, salvamento bloqueado sem escolha, lead pré-existente vem com "Outbound" no modal de edição, lote de CSV grava `origem_tipo='outbound'`); `08-HUMAN-UAT.md` → `complete`, `08-VERIFICATION.md` → `passed`

### Correções de Code Review (achados do `15-REVIEW.md`)

- [x] **FIX-01**: `interesse` submetido só com espaços em branco pelo formulário manual grava `NULL`, não `''` — o trim acontece dentro do `z.preprocess` em `validations.ts` (idioma consistente com o contrato D-04 repetido ~4× no código); `test-lead-actions.cjs` ganha caso `createLead({ interesse: "   " })` → linha persistida com `interesse === null` (WR-01)
- [ ] **FIX-02**: A prévia da importação de CSV (`csv-import-preview-table.tsx`) exibe a coluna "Interesse" quando mapeada, no mesmo padrão de `notas`; o truncamento defensivo em 500 chars (D-10) fica visível para o admin antes de confirmar (WR-02)
- [ ] **FIX-03**: Achados `info` do `15-REVIEW.md` resolvidos — comentários "7 campos fixos" em `csv-column-mapper.tsx` corrigidos para 8 (IN-01); `.slice(0,500)` em `csv-import.ts` corta por code point, não code unit, para não partir surrogate pair (IN-02); `migrate-interesse.cjs` documenta "pare a app antes de rodar" e não cria backup novo em execução idempotente (IN-03)

### Limpeza de Lint

- [ ] **LINT-01**: `npm run lint` executado no repo inteiro sai com código `0` — os 457 erros pré-existentes (documentados desde a Fase 8) triados e resolvidos por correção real ou supressão justificada: `.claude/get-shit-done` e worktree órfão fora do escopo do ESLint na config, `.cjs` de scripts com override de `no-require-imports`, `eslint-disable` documentado nos falsos-positivos de `react-hooks`; `deferred-items.md` atualizado removendo o item

### Marca e Identidade Visual

- [ ] **BRAND-01**: O app tem um nome de produto definido (candidato do usuário: "SOLO") — a decisão e o racional ficam registrados em `brand.md` na raiz do repo
- [ ] **BRAND-02**: `/brand-design` rodado — ~6 paletas candidatas revisadas em preview HTML no navegador, uma escolhida pelo usuário e aplicada como shadcn CSS variables (light + dark) em `globals.css`, com a tipografia ligada via `next/font`
- [ ] **BRAND-03**: `brand.md` escrito na raiz (paleta, tipografia, tom/voz); "CRM de Leads" renomeado para o nome escolhido no `layout.tsx` metadata (`<title>` + description), no header da sidebar (`app-sidebar.tsx`) e onde mais o nome antigo aparecer; nenhuma regressão visual nas telas existentes (verificação no navegador)

## Future Requirements

Reconhecidos, não neste milestone. Herdados do v1.4.

### Handoff Prospector → CRM

- **HANDOFF-01**: Rota de entrada (API local) para o Prospector Inteligente AI cadastrar leads automaticamente
- **HANDOFF-02**: Deduplicação de lead por telefone na entrada automática
- **HANDOFF-03**: Handoff rico — o lead entra em "Contatado" já com as interações do Prospector na timeline

*Gatilho: o Prospector existir + a decisão de VPS único (resolve o conflito local-vs-público, Gap 4).*

### Teste de nicho formal

- **CAMPANHA-01**: Entidade "campanha / janela de teste" (nicho + data início/fim + meta de conversão + notas) com conversão agregada por janela no relatório

*Gatilho: depois de rodar alguns testes de nicho reais, se o nicho plano + filtro de intervalo (METRICAS-03) não bastar.*

### Backlog PME

Em `.planning/todos/pending/` — avaliar prioridade num milestone futuro de features: tags livres por lead, temperatura automática do lead, busca global, exportar dados em CSV, anexo simples por lead, campo de vendedor responsável, meta mensal com barra de progresso, sequência de follow-up (arquivo original de 2026-07-21, já coberto pela Fase 10).

### Deploy / Operação

- **DEPLOY-01**: CRM no ar num VPS único (com o Prospector), gate de senha no middleware, Litestream do `data/crm.db`, HTTPS via Caddy/Coolify

*Gatilho: o Prospector subir primeiro; o CRM migra depois. Milestone próprio.*

## Out of Scope

Explicitamente excluído deste milestone.

| Feature | Motivo |
|---------|--------|
| Qualquer feature funcional nova | v1.5 é quitação de débito; features vão pra v1.6+ (ver Future) |
| Deploy / VPS neste milestone | Depende do Prospector subir primeiro; milestone próprio (DEPLOY-01) |
| Migração de rename físico do banco (`subnichos` → `nichos`) | D-01 (Fase 13): o valor do rename é a copy, não o nome da coluna; migração só quando houver outro motivo pra tocar o schema |
| Auth / multi-usuário / mobile / WhatsApp Business API | Fora de escopo permanente do produto (`PROJECT.md`) |
| Infra white-label / multi-tenant (SEED-002) | Gatilho "primeiro cliente pagante" não disparado; é outro produto |
| Reescrever a UI / redesign de telas | BRAND-* troca paleta/nome/tipografia, não reestrutura layout de tela |

## Traceability

Preenchido na criação do roadmap (2026-08-31).

| Requirement | Phase | Status |
|-------------|-------|--------|
| FIX-01 | Fase 16 | Complete |
| FIX-02 | Fase 16 | Pending |
| FIX-03 | Fase 16 | Pending |
| LINT-01 | Fase 17 | Pending |
| AUDIT-01 | Fase 18 | Pending |
| AUDIT-02 | Fase 18 | Pending |
| AUDIT-03 | Fase 18 | Pending |
| AUDIT-04 | Fase 18 | Pending |
| AUDIT-05 | Fase 18 | Pending |
| BRAND-01 | Fase 19 | Pending |
| BRAND-02 | Fase 19 | Pending |
| BRAND-03 | Fase 19 | Pending |

**Coverage:**

- v1.5 requirements: 12 total
- Mapped to phases: 12 ✓
- Unmapped: 0 ✓

**Mapa por fase:**

- **Fase 16 — Correções de Code Review da Fase 15:** FIX-01, FIX-02, FIX-03
- **Fase 17 — Limpeza de Lint do Repo:** LINT-01
- **Fase 18 — Auditoria Retroativa no Navegador:** AUDIT-01, AUDIT-02, AUDIT-03, AUDIT-04, AUDIT-05
- **Fase 19 — Marca e Identidade Visual:** BRAND-01, BRAND-02, BRAND-03

---
*Requirements defined: 2026-08-31*
*Last updated: 2026-08-31 after roadmap creation (12/12 requisitos mapeados em 4 fases)*
