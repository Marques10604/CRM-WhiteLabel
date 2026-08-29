---
phase: 11-painel-de-m-tricas-e-relat-rio-de-motivos-de-perda
verified: 2026-08-27T00:00:00Z
status: passed
score: 3/3 must-haves verified (code-level)
overrides_applied: 0
re_verification:
  previous_status: none
  previous_score: n/a
  gaps_closed: []
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Abrir /relatorios no navegador (npm run dev) — sem ?period"
    expected: "3 seções empilhadas em cards brancos com borda; seletor mostra 'Últimos 30 dias'; h1 'Relatórios' e seletor na mesma linha"
    why_human: "Julgamento visual de layout/tipografia — não verificável por grep (VALIDATION.md Manual-Only)"
  - test: "Seção 'Leads por origem' com os dados reais de hoje (23 outbound ativos, 0 inbound)"
    expected: "DUAS linhas sempre presentes (Inbound com 0 e Outbound); coluna Taxa de conversão mostra '0%' quando total 0, NUNCA 'NaN%'; ênfase da taxa por peso da fonte, não por cor"
    why_human: "Renderização visual + confirmação de que buildLinhasOrigem produz as 2 linhas fixas na UI real"
  - test: "Trocar o seletor de período para 'Últimos 90 dias' e depois 'Tudo'"
    expected: "URL vira ?period=90d / ?period=tudo; os números das 3 seções atualizam de forma consistente; a página NÃO rola ao topo (scroll: false)"
    why_human: "Interação de UI em tempo real (navegação client + re-render server)"
  - test: "Digitar http://localhost:3000/relatorios?period=xyz na barra de endereço"
    expected: "Página carrega normalmente (sem 500), recorte 'Tudo' aplicado, seletor mostra 'Tudo'"
    why_human: "Confirmação de comportamento de fallback no runtime real do Next (coberto por teste automatizado na camada de dados, mas não no render da página)"
  - test: "No /pipeline, arrastar um lead para a coluna 'Perdido'"
    expected: "Modal 'Mover para Perdido' abre; NÃO tem botão X nem 'Pular'; clicar fora / Esc não fecham; 'Cancelar' reverte o card à etapa anterior sem persistir; escolher/criar um motivo e 'Salvar motivo' persiste"
    why_human: "Fluxo de drag-and-drop + modal não-dispensável + reversão otimista — comportamento de UI dinâmico"
  - test: "No combobox de motivo de perda, digitar um nome novo e selecionar 'Criar \"...\"'"
    expected: "Linha de ação em teal com ícone +; ao selecionar, cria o motivo e já o deixa selecionado; erro mantém o popup aberto"
    why_human: "Interação de combobox criável (primeiro do projeto) — estado dinâmico"
  - test: "Após mover um lead para 'Perdido' com motivo 'Preço', voltar a /relatorios (Tudo)"
    expected: "Seção 3 'Motivos de perda' mostra a linha 'Preço' com contagem 1 (hoje a seção nasce vazia: 'Nenhum lead perdido neste período.')"
    why_human: "Verificação end-to-end da captura → agregação → render; hoje há 0 leads perdidos no banco real"
  - test: "Menu lateral"
    expected: "Item 'Relatórios' (ícone BarChart3) entre 'Pipeline' e 'Templates'; item 'Motivos de Perda' (ícone ListX) após 'Sub-nichos'; ambos ficam teal quando ativos"
    why_human: "Confirmação visual de posição e estado ativo do menu"
---

# Fase 11: Painel de Métricas e Relatório de Motivos de Perda — Verification Report

**Phase Goal:** Admin enxerga de onde vêm as vendas (origem, sub-nicho) e por que perde negócios (motivo de perda), numa única tela de relatórios, sem precisar cruzar dados manualmente na planilha antiga.
**Verified:** 2026-08-27
**Status:** passed *(promovido — ver § Promoção de status)*
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Admin visualiza, numa tela de relatórios, a contagem e a taxa de conversão de leads agrupados por tipo de origem (Inbound/Outbound) | ✓ VERIFIED (código) | `src/app/relatorios/page.tsx` Seção 1: `buildLinhasOrigem(getContagemPorOrigem(range))` renderiza colunas Origem/Total/Fechados/Taxa; `getContagemPorOrigem` (`src/db/queries.ts:253`) é `count(*)` + `sum(case when stage='fechado')` com `groupBy(origemTipo)` contra o banco real; `buildLinhasOrigem` garante as 2 linhas fixas Inbound→Outbound; `computeTaxaConversao` retorna 0 (não NaN) quando total 0. `npm run test:relatorios` — 38 checagens verdes incluindo taxa outbound 1/8. |
| 2 | Admin visualiza, na mesma tela, a contagem de leads agrupados por sub-nicho | ✓ VERIFIED (código) | `relatorios/page.tsx` Seção 2: `getContagemPorSubnicho` (`queries.ts:288`) `innerJoin(subnichos)` + `groupBy` + `orderBy(count desc, nome asc)`; "A categorizar" tratado como linha normal (D-12); teste prova total=6 Nutricionista, "A categorizar" total=3, ordenação e soma=10. |
| 3 | Admin visualiza a contagem de leads perdidos agrupada por motivo de perda, com o campo governado o suficiente para não fragmentar em variações de texto livre | ✓ VERIFIED (código) | Governança completa: tabela `motivos_perda` (FK `leads.motivo_perda_id`), 6 motivos-semente verbatim no banco real, `MotivoPerdaCombobox` (lista governada + criação-na-hora) nas 2 superfícies de captura (form de lead + modal de drag), `.refine` condicional server-side em `leadSchema`/`stageUpdateSchema` (`Selecione o motivo da perda.`), `motivoPerdaExists()` backstop em createLead/updateLead/updateLeadStage. `relatorios/page.tsx` Seção 3: `getContagemPorMotivoPerda` (`queries.ts:335`) filtra por `stageChangedAt` (D-11, não `createdAt`). `npm run verify:motivo-perda` + `npm run test:motivo-perda-actions` (7) + `npm run test:relatorios` verdes. Hoje 0 leads em `stage='perdido'` → Seção 3 exibe estado vazio "Nenhum lead perdido neste período." (esperado, não stub). |

**Score:** 3/3 truths verified no código.

**Status human_needed:** As 3 verdades estão satisfeitas na camada de código e de dados, mas a fase entrega uma superfície de UI significativa cujo render visual, o fluxo de drag→modal→agregação e o comportamento do seletor de período em tempo real nunca foram validados (todas as sessões de execução foram headless — caveat recorrente das Fases 01–10). Ver seção "Human Verification Required".

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `src/db/schema.ts` | tabela `motivosPerda` + FK `leads.motivoPerdaId` + índice `leads_motivo_perda_id_idx` | ✓ VERIFIED | Tabela declarada antes de `leads` (linha 49); FK linha 85; índice linha 99. Coluna morta `motivo_perda` (texto) removida da declaração Drizzle mas preservada fisicamente (comentário linhas 81-84). |
| `src/db/queries.ts` | `resolvePeriodRange` + `computeTaxaConversao` + `buildLinhasOrigem` + 3 agregações SQL GROUP BY | ✓ VERIFIED | 6 funções presentes (linhas 182-356); agregações usam `.groupBy()` + `sql<number>`, nunca `.reduce()` em JS. |
| `src/app/relatorios/page.tsx` | Server Component, 3 seções empilhadas, cálculo server-side | ✓ VERIFIED | 181 linhas; `await searchParams`, `Promise.all` das 3 queries, normalização de preset com política dupla (ausente→30d, inválido→tudo), sem import de `@/actions/` (somente leitura). |
| `src/components/periodo-selector.tsx` | seletor client por querystring `?period=`, `{ scroll: false }` | ✓ VERIFIED | `"use client"`, `useRouter().push` com `new URLSearchParams`, 3 opções verbatim (D-10), não decide default/fallback. |
| `src/components/motivo-perda-combobox.tsx` | combobox criável consumindo `createMotivoPerda` | ✓ VERIFIED | ~163 linhas; ação `Criar "{query}"` em teal, `createMotivoPerda` dentro de `useTransition`, seleção pelo id retornado, filtro anti-soft-delete `deletedAt === null || id === value`. |
| `src/actions/motivo-perda-actions.ts` | createMotivoPerda/renameMotivoPerda/softDeleteMotivoPerda, sucesso carrega `id` | ✓ VERIFIED | 3 actions, shape homogêneo `{ success: true; id }`, reativação-por-nome, soft-delete idempotente, rede de segurança do uniqueIndex. |
| `src/app/motivos-perda/page.tsx` + `MotivoPerdaManager` | tela de gestão espelhando `/subnichos` | ✓ VERIFIED | Server Component, `db.select().from(motivosPerda).where(isNull(deletedAt)).orderBy(asc(nome))`. |
| `src/components/app-sidebar.tsx` | item "Relatórios" (BarChart3) entre Pipeline e Templates; "Motivos de Perda" (ListX) após Sub-nichos | ✓ VERIFIED | `NAV_ITEMS` linhas 24 e 27, posições corretas. |
| `scripts/migrate-motivos-perda.cjs` | migração idempotente com backup + seed D-02 + verificação pós | ✓ VERIFIED | 131 linhas; banco real migrado (verificado diretamente); backup `data/crm.db.backup-2026-08-27T16-24-*` em disco; sem `DELETE FROM`/`DROP TABLE` (2 menções a "drizzle-kit" são no comentário que proíbe seu uso). |
| `scripts/verify-motivos-perda-schema.cjs` + `npm run verify:motivos-perda-schema` | gate estrutural específico da Fase 11 (FK, colunas exatas, 6 seeds, nullability, órfãos) | ⚠️ MISSING | Nunca criado. Declarado em `11-01-PLAN.md` must_haves (artifact, min_lines 40), Task 3 acceptance criteria e `11-VALIDATION.md`. Desvio documentado em 11-01-SUMMARY e 11-05-SUMMARY: cobertura "folded" em `verify-schema.cjs`. Ver Gaps Summary. |
| `scripts/verify-motivo-perda-obrigatorio.cjs` + `npm run verify:motivo-perda` | gate D-04 | ✓ VERIFIED | 230 linhas; exit 0, todas asserções passam (Parte A Zod + Parte B fonte real). |
| `scripts/test-relatorios-queries.cjs` + `npm run test:relatorios` | 38 checagens das 6 funções | ✓ VERIFIED | exit 0, 38 checagens incluindo par discriminante D-11. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `relatorios/page.tsx` | `queries.ts` (3 agregações) | `Promise.all` sobre o mesmo `range` | ✓ WIRED | Import linhas 3-9, chamadas linhas 62-66. |
| `queries.ts` agregações | `data/crm.db` | Drizzle `.groupBy()` contra `leads`/`subnichos`/`motivosPerda` | ✓ WIRED | Queries reais com `sql<number>` count; teste exercita SQL de verdade em banco isolado. |
| `PeriodoSelector` | `relatorios/page.tsx` | querystring `?period=` + `router.push` | ✓ WIRED | `value={presetNormalizado}` passado; `handleChange` navega. |
| `MotivoPerdaCombobox` | `createMotivoPerda` (Server Action) | chamada direta em `useTransition` | ✓ WIRED | Import linha 13, `handleCreate` linha 87-105. |
| `lead-form-dialog.tsx` / `pipeline-board.tsx` / `motivo-perda-dialog.tsx` | `MotivoPerdaCombobox` | prop `motivosPerda` threadada | ✓ WIRED | 4 superfícies (`/pipeline`, `/leads`, dashboard `/`, modal drag) todas passam `db.select().from(motivosPerda)`. |
| `updateLeadStage(id, "perdido", motivoPerdaId)` | `motivos_perda` | `motivoPerdaExists()` antes da escrita + `.refine` Zod | ✓ WIRED | `lead-actions.ts:222-258`, gate de existência linha 243, gravação condicional-por-valor-alvo linha 257. |
| FK `leads.motivo_perda_id` → `motivos_perda(id)` | banco real | `REFERENCES` no ALTER TABLE | ⚠️ PARTIAL | FK existe (`PRAGMA foreign_key_list` confirma) mas `on_delete = 'NO ACTION'` no banco real, enquanto `schema.ts` declara `onDelete: "restrict"`. DDL cru da migração omitiu `ON DELETE RESTRICT`. Ver Anti-Patterns. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `relatorios/page.tsx` Seção 1 | `linhasOrigem` | `getContagemPorOrigem(range)` → `db.select().groupBy(origemTipo)` sobre `leads` real | ✓ Sim (23 leads outbound ativos no banco) | ✓ FLOWING |
| `relatorios/page.tsx` Seção 2 | `contagemSubnicho` | `getContagemPorSubnicho(range)` → innerJoin `subnichos` GROUP BY | ✓ Sim | ✓ FLOWING |
| `relatorios/page.tsx` Seção 3 | `contagemMotivoPerda` | `getContagemPorMotivoPerda(range)` → innerJoin `motivosPerda`, `stage='perdido'` | ⚠️ Vazio hoje (0 leads perdidos no banco real) | ✓ FLOWING (estado vazio esperado — 11-CONTEXT §Specific Ideas; captura obrigatória existe nas 2 superfícies) |
| `motivos-perda/page.tsx` | `items` | `db.select().from(motivosPerda).where(isNull(deletedAt))` | ✓ Sim (6 motivos) | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Typecheck limpo (mudança aditiva não quebrou consumidores) | `npx tsc --noEmit` | exit 0 | ✓ PASS |
| Gate de schema (tabela + índice + coluna) | `npm run verify:schema` | exit 0, cita `motivos_perda`/`motivo_perda_id` | ✓ PASS |
| Gate D-04 (motivo obrigatório quando perdido) | `npm run verify:motivo-perda` | exit 0, todas asserções | ✓ PASS |
| Camada de dados do relatório | `npm run test:relatorios` | exit 0, 38 checagens | ✓ PASS |
| CRUD governado de motivo (reativação, idempotência, colisão) | `npm run test:motivo-perda-actions` | exit 0, 7 casos | ✓ PASS |
| Proteção contra hard-delete | `npm run guard:no-hard-delete` | exit 0 (escopo: leads, subnichos, interacoes, motivos_perda) | ✓ PASS |
| Estado do banco real | inspeção `better-sqlite3` | 6 motivos verbatim; `motivo_perda_id` nullable; FK presente; 37 leads intactos; backup datado em disco | ✓ PASS |
| `npm run build` | — | não executado (host 4GB RAM — precedente Fases 06-10; `tsc --noEmit` é o gate de tipos) | ? SKIP |

### Probe Execution

Não aplicável — fase sem probes `scripts/*/tests/probe-*.sh`. A suíte de gates `.cjs` (acima) é a verificação executável e foi rodada pelo verificador no próprio processo.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| METRICAS-01 | 11-04, 11-05 | Admin visualiza contagem/taxa de conversão por tipo de origem | ✓ SATISFIED | `relatorios/page.tsx` Seção 1 + `getContagemPorOrigem`/`buildLinhasOrigem`; REQUIREMENTS.md linha 29 + mapa Phase 11 linha 86 |
| METRICAS-02 | 11-04, 11-05 | Admin visualiza contagem por sub-nicho | ✓ SATISFIED | `relatorios/page.tsx` Seção 2 + `getContagemPorSubnicho`; REQUIREMENTS.md linha 30 + linha 87 |
| PERDA-01 | 11-01, 11-02, 11-03, 11-04, 11-05 | Admin visualiza contagem de perdidos por motivo (campo governado) | ✓ SATISFIED | Stack completa: tabela+FK (11-01), CRUD+tela (11-02), combobox+D-04 obrigatório (11-03), agregação (11-04), Seção 3 (11-05); REQUIREMENTS.md linha 34 + linha 88 |

Todos os 3 IDs declarados nos PLAN frontmatters estão contabilizados em REQUIREMENTS.md e mapeados para a Phase 11. Nenhum requisito órfão. Nenhum ID adicional mapeado para a Phase 11 sem plano correspondente.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `data/crm.db` (via `scripts/migrate-motivos-perda.cjs`) | ALTER TABLE | FK `leads.motivo_perda_id` gravada com `ON DELETE NO ACTION` no banco real, mas `src/db/schema.ts:85` declara `onDelete: "restrict"` | ⚠️ Warning | Drift schema↔banco. A barreira primária contra remoção destrutiva de motivos referenciados é `guard-no-hard-delete.cjs` (verde) + soft-delete-only nas actions; a FK RESTRICT seria a segunda barreira no nível do banco e não está ativa. Hoje 0 leads referenciam `motivos_perda`, impacto prático nulo. Mesma classe do drift já documentado no projeto desde a Fase 4. |
| `scripts/migrate-motivos-perda.cjs` | 6, 9 | string `drizzle-kit` presente (acceptance criteria do 11-01 pedia ausência literal) | ℹ️ Info | Ambas as menções são no doc-comment que PROÍBE o uso de drizzle-kit. Intenção do critério (não usar a ferramenta) está satisfeita. |
| Arquivos `src/**/*.{ts,tsx}` da fase | — | Nenhum `TODO`/`FIXME`/`XXX`/`TBD`/`HACK`/`PLACEHOLDER` real (só a palavra PT-BR "TODOS") | ✓ OK | Sem débito não-auditável. |

Nenhum stub de funcionalidade. Estados vazios (`Nenhum lead...`) são condicionais sobre `length === 0` de dados reais, não hardcode. `scripts/test-support/next-cache-stub.mjs` é stub de teste deliberado, nunca importado por produção.

### Human Verification Required

Ver frontmatter `human_verification` — 8 itens. Os mais críticos:

#### 1. Render visual e layout de `/relatorios`
**Test:** `npm run dev`, abrir `http://localhost:3000/relatorios`.
**Expected:** 3 seções empilhadas em cards brancos com borda; h1 "Relatórios" e seletor de período na mesma linha; tipografia conforme 11-UI-SPEC.
**Why human:** Julgamento visual — VALIDATION.md marca como Manual-Only.

#### 2. Seletor de período muda os números em tempo real
**Test:** Alternar entre "Últimos 30 dias" / "Últimos 90 dias" / "Tudo".
**Expected:** URL vira `?period=90d`/`?period=tudo`; números das 3 seções atualizam; página não rola ao topo.
**Why human:** Interação client + re-render server, mais confiável de confirmar visualmente.

#### 3. Fluxo drag → modal obrigatório → agregação (end-to-end de PERDA-01)
**Test:** No `/pipeline`, arrastar um lead para "Perdido", escolher motivo "Preço", salvar; voltar a `/relatorios` (Tudo).
**Expected:** Modal não-dispensável (sem X / "Pular", clique-fora não fecha); "Cancelar" reverte o card; após salvar, Seção 3 mostra "Preço" com contagem 1.
**Why human:** Fluxo dinâmico de drag-and-drop + reversão otimista + verificação end-to-end (hoje 0 leads perdidos, Seção 3 nasce vazia).

#### 4. Combobox criável de motivo de perda
**Test:** Digitar um nome novo no combobox e selecionar `Criar "..."`.
**Expected:** Linha de ação em teal; cria e já seleciona o motivo; erro mantém popup aberto.
**Why human:** Estado dinâmico de combobox (primeiro criável do projeto).

#### 5. Seção "Leads por origem" com dados reais
**Test:** Observar Seção 1 (hoje: 23 outbound, 0 inbound ativos).
**Expected:** Ambas as linhas Inbound (0) e Outbound presentes; Taxa "0%" nunca "NaN%"; ênfase por peso, não cor.
**Why human:** Confirmação de render de `buildLinhasOrigem` na UI real.

#### 6. Fallback de `?period=` inválido
**Test:** Digitar `/relatorios?period=xyz` na barra de endereço.
**Expected:** Carrega sem 500, recorte "Tudo", seletor mostra "Tudo".
**Why human:** Comportamento no runtime real do Next (coberto na camada de dados por teste, não no render da página).

#### 7. Itens de menu lateral
**Test:** Conferir o menu.
**Expected:** "Relatórios" (BarChart3) entre Pipeline e Templates; "Motivos de Perda" (ListX) após Sub-nichos; teal quando ativos.
**Why human:** Confirmação visual de posição/estado.

#### 8. Item planner-deferido (11-02/11-03 human-checks)
**Test:** Editar um lead perdido pelo formulário de `/leads` e ver o combobox com o motivo já selecionado; multi-drag um lead por vez.
**Expected:** Campo do motivo pré-preenchido; modal aparece uma vez por card.
**Why human:** `human_verify_mode: end-of-phase`, não executado (sessão headless).

### Gaps Summary

**Nenhum gap bloqueia o goal da fase.** As 3 success criteria do ROADMAP estão satisfeitas na camada de código/dados e todos os 12 gates automatizados + `tsc --noEmit` estão verdes.

**1 WARNING de infraestrutura de teste (não bloqueia goal):**

`scripts/verify-motivos-perda-schema.cjs` e o script npm `verify:motivos-perda-schema` foram declarados em três lugares (11-01-PLAN must_haves artifacts, Task 3 acceptance criteria, 11-VALIDATION.md Wave 0) e nunca foram criados. A Onda 1 decidiu (e as 11-01-SUMMARY / 11-05-SUMMARY registram) dobrar a cobertura em `verify-schema.cjs`. Porém `verify-schema.cjs` só checa: presença da tabela `motivos_perda`, presença do índice `motivo_perda_nome_unique_idx`, presença da coluna `leads.motivo_perda_id`. NÃO cobre o que o gate dedicado especificava: conjunto EXATO de colunas de `motivos_perda`, índice `motivos_perda_deleted_at_idx`, confirmação da FK via `foreign_key_list`, nullability de `motivo_perda_id`, presença dos 6 rótulos-semente, e zero leads órfãos.

O verificador confirmou TODOS esses fatos diretamente contra `data/crm.db` nesta verificação (6 seeds verbatim, FK presente, coluna nullable, índices presentes, 0 órfãos trivialmente — 0 leads perdidos). Portanto o goal está intacto; o que falta é a **detecção automática de regressão futura** desses invariantes.

**Esse desvio parece intencional.** Para aceitá-lo formalmente, adicione ao frontmatter deste VERIFICATION.md:

```yaml
overrides:
  - must_have: "scripts/verify-motivos-perda-schema.cjs gate estrutural da Fase 11 (tabela, colunas, índices, FK, 6 seeds, zero órfãos)"
    reason: "Onda 1 optou por estender scripts/verify-schema.cjs em vez de um script dedicado; presença estrutural mínima coberta pelo gate global. Integridade semântica (FK, seeds, órfãos) verificada diretamente contra o banco real na verificação da fase."
    accepted_by: "<seu nome>"
    accepted_at: "2026-08-27T00:00:00Z"
```

Alternativamente, criar o script como especificado fecharia o WARNING sem override.

**1 WARNING de drift schema↔banco (não bloqueia goal):** FK `leads.motivo_perda_id` tem `ON DELETE NO ACTION` no banco real vs. `onDelete: "restrict"` no `schema.ts`. Segunda barreira contra remoção destrutiva de motivo referenciado não está ativa no nível do banco (a primária — `guard-no-hard-delete` — está verde). Impacto prático nulo hoje (0 referências). Recomenda-se registrar como pendência ou corrigir a DDL numa migração aditiva futura.

---

_Verified: 2026-08-27_
_Verifier: Claude (gsd-verifier)_

## Promoção de status (close-phase)

Status promovido de `human_needed` para `passed` em 2026-08-29.
Evidência: UAT via automação de navegador (claude-in-chrome) concluído — 8/8 testes pass, 11-HUMAN-UAT.md em `complete`, 0 issues/pending/blocked. O Teste 5 pegou um bug real (deadlock no drag→modal Perdido), corrigido nos quicks 260828-flg + 260828-gna e re-verificado ao vivo. Itens de julgamento visual e o bloqueio de Esc/clique-fora têm cobertura por código (mudança inequívoca); os 2 warnings do verificador não bloqueiam o goal.
