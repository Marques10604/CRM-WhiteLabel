---
phase: 3
slug: 03-sales-pipeline-funnel-view
status: draft
shadcn_initialized: true
preset: base-nova
created: 2026-07-21
---

# Fase 3 — Contrato de Design de UI

> Contrato visual e de interação para fases de frontend. Gerado por gsd-ui-researcher, verificado por gsd-ui-checker.

**Contexto do projeto:** `components.json` já existe (gerado na Fase 1, resolveu para o preset `base-nova` sobre Base UI). Este contrato reaproveita integralmente os tokens de espaçamento, tipografia e cor já aprovados em `01-UI-SPEC.md` para manter consistência visual entre a lista de leads (Fase 1) e o board (Fase 3) — apenas adiciona o que é específico do board: cores/estados de card, indicador "esfriando", cópia do modal de `motivoPerda` e a paleta Fechado/Perdido (agora separada, D-01). A maior parte das decisões visuais desta fase já veio travada em `03-CONTEXT.md` (D-01 a D-15); as áreas marcadas como "Claude's Discretion" no CONTEXT.md foram decididas aqui de forma prescritiva, sem necessidade de nova rodada de perguntas ao usuário.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn (já inicializado na Fase 1 — `components.json` confirmado neste repositório) |
| Preset | `base-nova` (confirmado via `components.json`: style `base-nova`, baseColor `neutral`, cssVariables true) |
| Component library | Base UI (confirmado — mesma base da Fase 1) |
| Icon library | lucide-react (travado no stack; ícone novo usado nesta fase: `Clock` para o indicador "esfriando") |
| Font | Geist Sans (`--font-sans`, mesma da Fase 1) |
| Drag-and-drop | `@dnd-kit/core` + `@dnd-kit/sortable` — **ainda não instalado** (confirmado ausente em `package.json` nesta pesquisa); não é um item de registry shadcn, é uma dependência npm comum — planner deve incluir a instalação como task. Não passa pelo gate de segurança de registry (seção abaixo), que se aplica apenas a blocos shadcn de terceiros. |

---

## Spacing Scale

Valores declarados (múltiplos de 4) — idênticos aos da Fase 1, reaproveitados sem alteração:

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Gap entre ícone `Clock` e texto "Esfriando" no card |
| sm | 8px | Gap vertical entre cards empilhados dentro de uma coluna |
| md | 16px | Padding interno do card; padding interno do cabeçalho de coluna |
| lg | 24px | Gap horizontal entre colunas do board; padding lateral da página `/pipeline` |
| xl | 32px | Padding vertical do container do board (topo/rodapé da página) |
| 2xl | 48px | Espaço acima/abaixo da mensagem de coluna vazia (D-14) |
| 3xl | 64px | Não usado nesta fase (reservado, mesma nota da Fase 1) |

Exceptions (dimensões fixas de layout, não tokens reutilizáveis — mesma convenção da Fase 1 para a sidebar de 240px):
- **Largura mínima de coluna (D-15):** 288px fixos por coluna (`min-w-[288px] shrink-0`); o board inteiro rola horizontalmente (`overflow-x-auto`) quando a soma das 5 colunas excede a viewport — nunca encolhe as colunas para caber.
- **Altura de coluna:** cada coluna tem scroll vertical independente (`overflow-y-auto`) com o cabeçalho da coluna fixo (`sticky top-0`) acima da lista de cards — evita que o cabeçalho "suma" ao rolar uma coluna com muitos leads.
- **Espessura da borda "esfriando" (D-08):** 2px (`border-2`), acima da borda padrão de 1px do card — visualmente perceptível sem exagero.

---

## Typography

Reaproveitado integralmente da Fase 1 (mesmos 4 tamanhos, mesmos 2 pesos — nenhum tamanho/peso novo introduzido nesta fase):

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Label | 14px | 400 (regular) | 1.5 |
| Body | 16px | 400 (regular) | 1.5 |
| Heading | 20px | 600 (semibold) | 1.2 |
| Display | 28px | 600 (semibold) | 1.2 |

Uso específico desta fase:
- **Display (28px/600):** título da página `/pipeline` — texto "Pipeline".
- **Heading (20px/600):** título de cada cabeçalho de coluna (ex.: "Novo", "Contatado"); título do modal de `motivoPerda` ("Mover para Perdido").
- **Body (16px/400):** nome do lead no card (linha principal, mais proeminente do card); corpo do modal de `motivoPerda`.
- **Label (14px/400):** sub-nicho e data de follow-up dentro do card (informação secundária); contagem de leads no cabeçalho da coluna (badge); texto "Esfriando" junto ao ícone `Clock`; texto do estado vazio de coluna ("Nenhum lead nessa etapa").

Nenhum tamanho intermediário ou peso adicional (ex.: 12px, 700 bold) é introduzido — mantém consistência com a Fase 1.

---

## Color

Paleta dominante/secundária/accent/destructive reaproveitada sem alteração da Fase 1; esta fase adiciona uma paleta de badge de etapa expandida (5 valores, split de D-01) e uma cor semântica nova para o alerta "esfriando".

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#FFFFFF` | Fundo da página `/pipeline`, fundo de cada card |
| Secondary (30%) | `#F4F4F5` (zinc-100) | Fundo de cada coluna do board (contêiner atrás dos cards), sidebar (já existente), cabeçalho de coluna |
| Accent (10%) | `#0D9488` (teal-600) | Ver lista explícita abaixo — nunca aplicar fora dessa lista |
| Destructive | `#DC2626` (red-600) | Ações destrutivas apenas — ver lista abaixo |
| Warning ("esfriando", D-08) | `#F59E0B` (amber-500, borda) / `#FEF3C7` (amber-100, fundo do rótulo) / `#B45309` (amber-700, texto do rótulo) | Reservado exclusivamente para o indicador de lead parado em Contatado — ver detalhe abaixo |

**Accent reserved for** (lista explícita, nada além disso):
- Botão "Novo lead" no cabeçalho da página `/pipeline` (mesmo CTA global da lista, D-14 da Fase 1 — mantém acesso ao cadastro a partir de qualquer tela)
- Botão "Salvar motivo" no modal de `motivoPerda`
- Indicador do item ativo "Pipeline" na sidebar (D-13)
- Anel de foco (`focus-visible`) em cards focáveis via teclado e no textarea do modal de `motivoPerda`

**Destructive reserved for**:
- Nenhuma ação destrutiva nova nesta fase (mover para Perdido NÃO é destrutivo — é reversível por drag-and-drop, D-04). O botão "Excluir" já coberto pela Fase 1 continua vermelho quando acessado a partir do modal de edição do lead reaberto pelo card (D-10 fase-3).

**"Esfriando" (D-08) — detalhe do indicador:**
- Borda do card: `border-2` na cor `#F59E0B` (amber-500), substituindo a borda padrão `border-zinc-200` de 1px — aplicado **apenas** a cards na coluna Contatado com 5+ dias desde a última mudança de etapa (D-06/D-07).
- Rótulo textual "Esfriando" (Label 14px/400, cor `#B45309`) + ícone `Clock` (lucide, 14px, mesma cor) posicionado ao lado da data de follow-up dentro do card — cumpre a recomendação do CONTEXT.md de que um ícone+texto pode ser adicionado "se for barato" (D-08).
- Esta cor amber é reaproveitada do badge de etapa "Negociação" (mesmo tom `#FEF3C7`/`#B45309`), mas sem conflito visual: o card nunca exibe um badge de etapa (D-09 — card mostra só Nome+Sub-nicho+Follow-up, a etapa já é implícita pela coluna), então o rótulo "esfriando" nunca aparece ao lado de um badge amber de "Negociação" no mesmo card.

**Badges de etapa — paleta atualizada (D-01, D-05, substitui a linha única "Fechado/Perdido" da Fase 1):**

| Etapa | Cor | Hex (bg / texto) |
|-------|-----|-------------------|
| Novo | Cinza | `#F4F4F5` / `#3F3F46` (zinc-100 / zinc-700) — inalterado |
| Contatado | Azul | `#DBEAFE` / `#1D4ED8` (blue-100 / blue-700) — inalterado |
| Negociação | Âmbar | `#FEF3C7` / `#B45309` (amber-100 / amber-700) — inalterado |
| Fechado | Verde | `#DCFCE7` / `#15803D` (green-100 / green-700) — **novo**, substitui a cor slate combinada |
| Perdido | Vermelho | `#FEE2E2` / `#B91C1C` (red-100 / red-700) — **novo**, substitui a cor slate combinada |

**Nota de resolução (segue de D-05):** a Fase 1 usou slate neutro para "Fechado/Perdido" porque o schema não distinguia ganho de perda (ver nota em `01-UI-SPEC.md`). Com o split do schema (D-01), essa ambiguidade não existe mais — `etapa-badge.tsx`/`STAGE_CONFIG` deve trocar a entrada única `fechado_perdido` por duas entradas (`fechado`, `perdido`) com as cores acima, que agora refletem corretamente a intuição original de D-09 (verde=ganho, vermelho=perda).

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Título da página | "Pipeline" |
| Primary CTA (cabeçalho da página) | "Novo lead" (reaproveita o CTA global da Fase 1, D-13/D-14 — abre o mesmo `lead-form-dialog.tsx`) |
| Item de navegação na sidebar (D-13) | "Pipeline" |
| Cabeçalho de coluna | Nome da etapa (ex.: "Novo") + contagem entre parênteses ou em badge (ex.: "Novo · 4") — contagem apenas, sem soma de valor (D-11) |
| Estado vazio de coluna (D-14) | "Nenhum lead nessa etapa" — texto discreto, cor muted (`text-muted-foreground`), sem botão de ação |
| Indicador "esfriando" (D-08) | "Esfriando" (rótulo curto, ao lado da data de follow-up no card) |
| Modal `motivoPerda` — título (D-04) | "Mover para Perdido" |
| Modal `motivoPerda` — corpo | "Por que \"{nome}\" foi perdido? (opcional)" — referencia o lead pelo nome, mesmo padrão da confirmação de exclusão da Fase 1 (D-05) |
| Modal `motivoPerda` — placeholder do campo | "Ex: sem orçamento, escolheu concorrente, não respondeu mais..." |
| Modal `motivoPerda` — botões | "Pular" (outline, não bloqueia o drag) / "Salvar motivo" (accent, teal) |
| Toast de sucesso ao mover etapa | "Lead movido para {etapa}." |
| Toast de erro ao mover etapa | "Não foi possível mover o lead. Tente novamente." — a UI deve reverter o card para a coluna original (estado otimista revertido) quando a Server Action falhar |
| Campo novo no modal de edição de lead (D-10 fase-3) | Label "Motivo da perda" (textarea, opcional) — exibido na seção "Negócio" de `lead-form-dialog.tsx`, apenas quando a etapa selecionada é "Perdido" (exibição condicional, mesmo padrão de campos opcionais já usado na Fase 1) |
| Destructive confirmation | Não aplicável nesta fase — mover para Perdido é reversível e não bloqueia o drag (D-04); nenhuma ação destrutiva nova é introduzida no board (a exclusão de lead continua sendo tratada pelo modal de edição reaberto via card click, já coberto pela Fase 1, D-05) |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | `dialog`, `badge`, `button`, `textarea` (todos já instalados desde a Fase 1 — nenhum bloco novo do registry shadcn precisa ser adicionado nesta fase) | not required |
| third-party | nenhum | not applicable — nenhum registry de terceiros foi declarado nesta fase |

Nenhum bloco novo do registry shadcn é necessário — o board reaproveita `Dialog`/`Badge`/`Button`/`Textarea` já existentes em `src/components/ui/`. A dependência nova desta fase (`@dnd-kit/core` + `@dnd-kit/sortable`) é uma biblioteca npm padrão do stack já travada em `03-CONTEXT.md`/`STACK.md`, não um bloco de registry shadcn — o gate de segurança de registry (view/diff) não se aplica a ela.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
