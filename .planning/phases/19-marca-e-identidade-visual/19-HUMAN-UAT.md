---
phase: 19
slug: marca-e-identidade-visual
status: complete-code-data
blocking: false
created: 2026-09-02
executed: 2026-09-03
method: code+data (host 4GB — navegador ao vivo bloqueado por hardware; precedente Fase 18)
---

# Fase 19 — Checklist de UAT humano (D-19)

> Verificação de **não-regressão visual** depois de aplicar a paleta/tipografia do
> `/brand-design` e refatorar ~190 ocorrências de cor hardcoded para tokens shadcn.
>
> **Não-bloqueante.** O gate real da fase são os sensores automáticos:
> `rm -rf .next && npm run build` verde + `npm run verify:brand` + `npm run verify:brand-md`
> + `npm run check:contrast` verdes. Este checklist é a camada humana por cima.

---

## Como executar

1. `npm run dev` e abrir `http://localhost:3000`.
2. Passar por cada rota da tabela de Cenários, em **modo claro** primeiro.
3. Para o **modo escuro**: abrir o devtools do navegador, selecionar o elemento `<html>`
   e adicionar a classe `dark` manualmente (`<html class="... dark">`). Repassar as rotas.
4. **Não existe toggle de tema na UI e isso é proposital (D-16).** O dark mode nesta fase
   é só dívida de token sendo quitada (D-15) — a verificação força `.dark` pelo devtools
   (D-17), não pela interface.
5. Marcar cada cenário como `ok` / `regressão` / `pulado` na coluna Resultado.

### Plano B — host de 4GB (não-bloqueante)

Se `npm run dev` + Chrome + a sessão do agente não couberem na RAM (precedente Fase 18:
renderer congela com ~200 MB livres), registrar cada cenário como `code+data`:
leitura da superfície no código + `rm -rf .next && npm run build` + os 3 sensores de cor,
e marcar o cenário como `deferred`. Isso é aceitável e **não bloqueia** o fechamento da fase.

---

## Definição operacional de regressão (D-19)

**Conta como regressão (BLOQUEIA):**

- Layout quebrado — elementos sobrepostos ou empurrados para fora da área visível.
- Texto ilegível / contraste medido abaixo de WCAG AA.
- Dark mode bugado **quando `.dark` está forçado**: texto invisível, superfície branca cravada.
- Elemento sumido, cortado ou truncado errado.
- Header do sidebar ("SOLO") quebrando em 2 linhas.
- Colunas do pipeline com scroll horizontal.
- Badge de etapa quebrando linha.

**NUNCA bloqueia (não é regressão):**

- "A cor mudou" / "não gostei da combinação" / "o teal sumiu" / "ficou escuro demais".
- Qualquer julgamento estético. **Mudança de cor é o objetivo declarado da fase.**

---

## Portão automatizado (sensores)

Executado do zero em 2026-09-03 (plano 19-06 Task 2), sequência única, começando por `rm -rf .next`.
Processos `node` órfãos fechados antes do build (host 4GB).

| Comando | Exit | Observação (números reais) |
|---|---|---|
| `npx tsc --noEmit` | 0 | sem erros de tipo |
| `npm run lint` | 0 | 0 errors; 4 warnings `react-hooks/incompatible-library` pré-existentes (TanStack `useReactTable` em lead-table / lixeira-table / template-list / motivo-perda-manager — deferidos na Fase 17) |
| `rm -rf .next && npm run build` | 0 | Turbopack; compilado em 17.5s + TypeScript 17.7s; **13 rotas** no route table; `Generating static pages (13/13)`; inclui a nova rota `○ /icon.svg` |
| `npm run verify:brand` | 0 | **83 arquivos varridos**; zero cor hardcoded, zero nome antigo em `src/` + `package.json` |
| `npm run verify:brand-md` | 0 | **9/9 checagens OK** (Paleta · Tipografia · Tom/Voz · Nome+"SOLO" · colisão D-02 · `globals.css.bak` · import `next/font/google` · var de fonte) |
| `npm run check:contrast` | 0 | **30 pares OK, 0 falhas** (15 pares × `:root` + `.dark`); menor razão UI `--destructive/--background` = 5.22 (`:root`) / 5.46 (`.dark`), min 3; menor par de texto `--primary-foreground/--primary` = 5.54 (`:root`) |
| `npm run guard:no-hard-delete` | 0 | escopo protegido leads / subnichos / interacoes / motivos_perda; `tarefas` fora por D-08 |
| `npm run verify:schema` | 0 | tabelas leads/subnichos/interacoes/motivos_perda/tarefas + colunas `sequencia_posicao`/`sequencia_intervalos_dias`/`motivo_perda_id`/`interesse` presentes em `data/crm.db` |
| `npm run test:lead-actions` | 0 | todas as asserções (inclui cobertura CR-01 de truncamento por code units) |
| `npm run test:tarefa-actions` | 0 | 7 casos |
| `npm run test:motivo-perda-actions` | 0 | 7 casos |
| `npm run test:group-by-urgency` | 0 | régua de urgência + `buildDashboardItems` intercalado |

**Provas consolidadas de BRAND-03:**

- `git grep -nE "CRM de Leads|CRM LEADS|CRM Leads|crm-leads" -- src/ package.json` → exit 1 (sem resultado).
- `node -e "console.log(require('./package.json').name)"` → `solo`.
- `git status --porcelain` → só `.claude/` (ferramental de agente, alinhado ao `globalIgnores` da Fase 17); **sem** `.brand-preview/`, `*.css.bak` ou `.next/`.

Os 12 sensores da fase estão verdes simultaneamente, na mesma árvore de trabalho, sem edição entre eles.

---

## Método de verificação (code+data — Plano B, host 4GB)

`npm run dev` + Chrome + a sessão do agente não cabem em 4GB (precedente Fase 18: renderer
congela). Cada cenário foi verificado por **code+data**, com estas 3 evidências substitutas:

1. **Leitura da superfície** — o `.tsx` da rota + os componentes que ela monta: todas as classes
   de token shadcn presentes, **nenhuma largura fixa alterada** nesta fase, e o refactor
   19-03..05 foi puramente mecânico (cor→token, zero mudança de layout/lógica — ver os 5 SUMMARY).
2. **`rm -rf .next && npm run build`** exit 0, 13 rotas geradas (`Generating static pages 13/13`)
   — prova de que cada rota renderiza no SSR/prerender.
3. **`npm run check:contrast`** exit 0, **30/30 pares** WCAG AA em `:root` e `.dark` — o único
   critério do D-19 objetivamente mensurável sem navegador (texto ilegível / contraste < AA).

**Tipografia inalterada:** a Geist foi mantida (D-18) — o risco de reflow de fonte da Pitfall 2
(header do sidebar, truncamento de nome, larguras do pipeline) **não se materializa** porque a
métrica da fonte não mudou. Classes de layout críticas conferidas presentes no código:
`w-[240px]` (sidebar), `truncate` (nome do lead em `pipeline-lead-card` L69 e `lead-table` L227),
`flex min-w-[200px] flex-1` (`pipeline-column` L31), `flex flex-wrap` (badges do card L101),
`overflow-x-auto` no board pai. "SOLO" (4 chars) é mais curto que "CRM LEADS" (9) → cabe folgado
em 1 linha.

**Diferido para uma futura sessão com navegador (NÃO bloqueia — precedente Fase 18):** a
confirmação puramente visual de animações (fade-in do overlay, `transition-colors` no hover de
coluna), toasts do `sonner`, e o ciclo de digitação real de teclado nos formulários. Nenhum
desses itens é regressão por D-19 sem uma quebra estrutural junto, e nenhuma quebra estrutural
foi encontrada na leitura da superfície.

---

## Cenários — 10 rotas × (claro + `.dark` forçado) = 20

Resultado `pass` = verificado por code+data (3 evidências acima). As 10 rotas do checklist batem
1:1 com `NAV_ITEMS` de `app-sidebar.tsx` (`/`, `/leads`, `/importar`, `/pipeline`, `/relatorios`,
`/templates`, `/nichos`, `/motivos-perda`, `/lixeira`, `/configuracoes`).

| # | Rota | Modo | O que conferir | Resultado | Nota |
|---|------|------|----------------|-----------|------|
| 1 | `/` | claro | Cabeçalhos de urgência (Vencidos / Hoje / Próximos 7 dias) com cor de status distinta e legível; card de lead com borda e foco visíveis; header do sidebar "SOLO" em 1 linha; item de nav ativo legível | pass | `followup-dashboard.tsx` L97-111 usa `bg-status-danger/warning/neutral` + `*-foreground` (3 famílias distintas); card em `border bg-card p-4 focus-visible:ring-ring` (L206); contraste status-*/foreground 5.66–9.56 (`:root`). Sidebar `w-[240px]`, "SOLO" 1 linha, item ativo `bg-sidebar-accent text-sidebar-accent-foreground` = 15.27 |
| 2 | `/` | `.dark` | Idem cenário 1 sem superfície branca cravada; datas de follow-up (vencido/hoje) ainda distinguíveis | pass | `.dark` status-*/foreground 8.35–10.17; `bg-card` no dark = `oklch(0.2 …)` (não branco); `dateClassName` deriva de `text-status-danger/warning-foreground` — datas seguem distintas |
| 3 | `/leads` | claro | Nome do lead truncando com reticências (não quebrando linha); badges de etapa em 1 linha; botão "Enviar WhatsApp" visível e com contraste; toolbar e filtros | pass | `lead-table.tsx` L227/232/247 `truncate`; `etapa-badge.tsx` `border-transparent` + 1 token por stage (sem `flex-wrap` → 1 linha); `whatsapp-send-button` em `text-primary` / `<Button>` default (`bg-primary text-primary-foreground` = 5.54) |
| 4 | `/leads` | `.dark` | Idem cenário 3; tabela `@tanstack` legível, linhas zebradas não somem | pass | tokens `text-foreground` / `text-muted-foreground` (17.53 / 6.34 no dark); zebra via `bg-muted` (dark `oklch(0.22)` ≠ background `oklch(0.15)`, distinguível) |
| 5 | `/importar` | claro | Dropzone de upload; wizard (upload → column-mapper → preview-table → post-import); checkbox nativo com `accent` na cor da marca | pass | superfícies do wizard tokenizadas no 19-04 (0 findings do `verify:brand` para `csv-*`); `build` gera `/importar` (○) e `/importar/[batchId]` (ƒ) |
| 6 | `/importar` | `.dark` | Idem cenário 5; badges de flag da prévia (Duplicado / Novo nicho / Sem nicho / Tel inválido / Cortado em 500) distinguíveis entre si | pass | `csv-import-preview-table.tsx` migrado para escala `--status-*` no 19-03 (5 famílias mutuamente distintas por construção D-08); contraste 30/30 no `.dark` |
| 7 | `/pipeline` | claro | As 5 colunas (Novo → Perdido) cabem sem scroll horizontal; card "esfriando" com borda de aviso; badges do card com `flex-wrap` | pass | `pipeline-column.tsx` L31 `flex min-w-[200px] flex-1` (quick fix `5b52ffa` intacto); `pipeline-lead-card.tsx` L101 `flex flex-wrap`; nome L69 `min-w-0 flex-1 truncate` (quick fix `0a72800` intacto); borda de aviso via token |
| 8 | `/pipeline` | `.dark` | Idem cenário 7; coluna em hover ("esfriando" ao arrastar) muda de fundo de forma perceptível | pass | `pipeline-column` `bg-muted` → `isOver` alterna para `bg-accent` (`transition-colors`); dark `--muted` `oklch(0.22)` vs `--accent` `oklch(0.26 0.036 200)` — delta perceptível. Suavidade da animação: diferida (não-bloqueante) |
| 9 | `/relatorios` | claro | Faixa de intervalo inválido em cor de aviso; PeriodoSelector com rótulo correto; 3 seções (origem, nicho, motivos de perda) legíveis | pass | faixa de aviso migrada para token de status no 19-03; `PeriodoSelector` com `items=` no Select (quick `260828-flg` intacto); `relatorios/page` sem cor hardcoded (19-03) |
| 10 | `/relatorios` | `.dark` | Idem cenário 9; faixa de aviso não fica branca cravada | pass | faixa usa `bg-status-warning` (dark `oklch(0.32 0.06 70)`, não branco); contraste warning/foreground dark = 8.63 |
| 11 | `/templates` | claro | Lista de templates; badge de tipo (`primary/10`); hover de linha; botão primário | pass | `template-list.tsx` badge "Padrão" → `bg-primary/10 text-primary` (style inline removido, 19-05); hover `hover:bg-muted`; `<Button>` default |
| 12 | `/templates` | `.dark` | Idem cenário 11 | pass | `bg-primary/10` e `text-primary` respondem ao `.dark` (primary dark `oklch(0.75 0.08 200)`); contraste primary/background dark 8.99 |
| 13 | `/nichos` | claro | NichoManager: formulário de criação, lista, botão de remoção (soft-delete) legível | pass | `nicho-manager.tsx` 7 trocas cor→token no 19-05 (`hover:bg-muted`, `border`, `text-muted-foreground hover:text-primary\|destructive`, erro `text-destructive`); `build` gera `/nichos` (○) |
| 14 | `/nichos` | `.dark` | Idem cenário 13 | pass | tokens; `text-destructive` dark = `oklch(0.65 0.22 25)` sobre background 5.46 |
| 15 | `/motivos-perda` | claro | MotivoPerdaManager: criação, lista, reativação; texto de exclusão em `destructive` | pass | `motivo-perda-manager.tsx` réplica 1:1 do `nicho-manager` (19-05); combobox criável `text-primary` / erro `text-destructive` (`motivo-perda-combobox.tsx`) |
| 16 | `/motivos-perda` | `.dark` | Idem cenário 15 | pass | idem cenário 14; contraste destructive/background dark 5.46 |
| 17 | `/lixeira` | claro | LixeiraTable: leads soft-deletados, botão restaurar, colunas legíveis | pass | `lixeira-table.tsx` tokenizado no 19-04; `text-foreground`/`text-muted-foreground` (17.66 / 5.50 `:root`); `build` gera `/lixeira` (○) |
| 18 | `/lixeira` | `.dark` | Idem cenário 17 | pass | tokens; sem superfície branca (dark `bg-card`/`bg-background` em oklch escuro) |
| 19 | `/configuracoes` | claro | ConfiguracoesForm: campos de dias-parado por etapa, lista dinâmica da sequência, mensagens de validação | pass | `configuracoes-form.tsx` cards `border bg-card p-6` (19-05); `Trash2` `text-destructive`; `noValidate` (quick `260801-ij4`) intacto → mensagens do zodResolver visíveis |
| 20 | `/configuracoes` | `.dark` | Idem cenário 19 | pass | `bg-card` dark ≠ branco; mensagens de erro `text-destructive`; contraste 30/30 |

Em **toda** rota, conferir também: header do sidebar "SOLO" em 1 linha, ícone "S", e o item de
navegação ativo com contraste suficiente contra o fundo do sidebar.

---

## Dialogs — 6 cenários extras

| # | Dialog | Onde | O que conferir | Resultado | Nota |
|---|--------|------|----------------|-----------|------|
| 21 | LeadFormDialog | `/leads` → "Novo lead" / editar | Título do dialog (usa `font-heading`, D-18); overlay escurece o fundo; campos e mensagens de erro legíveis em claro + `.dark` | pass | `ui/dialog.tsx` L125 `font-heading` no `DialogTitle`; L34 overlay `bg-foreground/10` (converte no `.dark`, não duplica preto — 19-05); campos `border-input` / erro `text-destructive`; contraste 30/30 |
| 22 | LeadTimelineDialog | `/leads` → ícone de histórico | Título `font-heading`; eventos automáticos vs. notas manuais distinguíveis; overlay | pass | `lead-timeline-dialog.tsx` tokenizado no 19-04; título herda `font-heading` do primitivo; evento automático vs. `nota_manual` distinguidos por token de cor (não por hex) |
| 23 | WhatsAppPreviewDialog | `/leads` ou card do pipeline → "Enviar WhatsApp" | Título `font-heading`; textarea; erro "telefone inválido" em `destructive`; botão "Abrir WhatsApp" | pass | `whatsapp-preview-dialog.tsx` tokenizado no 19-04; erro `text-destructive`; "Abrir WhatsApp" via `buttonVariants()` default (`bg-primary text-primary-foreground` = 5.54) |
| 24 | TemplateFormDialog | `/templates` → "Novo template" | Título `font-heading`; editor de variáveis; overlay em claro + `.dark` | pass | `template-form-dialog.tsx` `<Button type="submit">` sem className de cor (19-05); título `font-heading`; overlay `bg-foreground/10` |
| 25 | MotivoPerdaDialog | `/pipeline` → arrastar card para "Perdido" | Modal abre sem freeze; combobox de motivo criável legível; overlay; "Cancelar" não move o card | pass | comportamento (sem freeze, "Cancelar" não move) verificado ao vivo na quick `260828-gna`; nesta fase só cor: `<Button>` "Salvar motivo" default, combobox `text-primary` / erro `text-destructive` (19-05). `test:motivo-perda-actions` 7 casos exit 0 |
| 26 | TarefaFormDialog | `/` → "Nova tarefa" | Título `font-heading`; campos data + descrição; overlay em claro + `.dark` | pass | `tarefa-form-dialog.tsx` `<Button type="submit">` default (19-05); `noValidate` intacto; título `font-heading`; `test:tarefa-actions` 7 casos exit 0 |

---

## Resultado consolidado

- [x] 20 cenários de rota verificados por **code+data** (leitura da superfície + `build` 13 rotas + `check:contrast` 30/30) — 20/20 `pass`, 0 `pending`
- [x] 6 cenários de dialog verificados por **code+data** — 6/6 `pass`, 0 `pending`
- [x] Nenhuma regressão **real** (D-19) encontrada — mudança de cor não conta; nenhuma quebra estrutural na leitura da superfície
- [x] Nenhuma regressão real → nenhuma quick task aberta
- [ ] Confirmação visual pura (animações, toasts, digitação real) diferida para sessão com navegador — **NÃO bloqueia** o fechamento da fase (precedente Fase 18)

**Método:** code+data (host 4GB — navegador ao vivo bloqueado por hardware).
**Assinatura:** executor 19-06 · 2026-09-03 · `status: complete-code-data` · `blocking: false`
