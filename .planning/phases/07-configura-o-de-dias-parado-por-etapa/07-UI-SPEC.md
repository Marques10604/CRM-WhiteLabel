---
phase: 7
slug: configura-o-de-dias-parado-por-etapa
status: draft
shadcn_initialized: true
preset: base-nova
created: 2026-07-31
---

# Phase 7 — UI Design Contract

> Contrato visual e de interação para a tela `/configuracoes` (CONFIG-01/CONFIG-02). Gerado por gsd-ui-researcher, verificado por gsd-ui-checker.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn (já inicializado — `components.json` presente na raiz do projeto) |
| Preset | `style: base-nova`, `baseColor: neutral`, `cssVariables: true`, `iconLibrary: lucide` (ver `components.json`) |
| Component library | Base UI (`@base-ui/react`) via shadcn CLI estilo `base-nova` — não é Radix |
| Icon library | `lucide-react` |
| Font | Geist Sans (`--font-geist-sans`, via `next/font/google`) — Geist Mono existe mas não é usado nesta fase |

Nenhum componente shadcn novo precisa ser instalado nesta fase. Todos os primitivos necessários já existem em `src/components/ui/`: `field.tsx` (Field/FieldLabel/FieldContent/FieldDescription/FieldError), `input.tsx`, `button.tsx`, `sonner.tsx` (Toaster). Não é necessário rodar `npx shadcn add` para nada nesta fase.

---

## Spacing Scale

Escala de 8 pontos já em uso consistente em todo o projeto (confirmado em `subnichos/page.tsx`, `pipeline/page.tsx`, `template-form-dialog.tsx`):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Gaps entre ícone e texto, padding interno de badges |
| sm | 8px | `gap-2` entre label/input/erro dentro de um `Field` |
| md | 16px | `gap-4` entre campos do formulário (`FieldGroup`), padding de card |
| lg | 24px | `gap-6` entre título da página e o card do formulário |
| xl | 32px | Não usado nesta fase (reservado para layouts maiores) |
| 2xl | 48px | Não usado nesta fase |
| 3xl | 64px | Não usado nesta fase |

Padding do `<main>` (herdado do `layout.tsx`, não repetir na página): `px-8 py-8`.

Exceções: nenhuma. Não há alvos de toque icon-only nesta fase (o único controle interativo além dos 3 inputs é o botão "Salvar configurações", que usa a altura padrão do `Button`).

---

## Typography

3 tamanhos, 2 pesos — mesmo inventário já usado em `subnichos/page.tsx` (título) e `template-list.tsx` (`h2` de seção) e `field.tsx` (labels/descrições/erros):

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 14px (`text-sm`) | 400 (regular) | 1.5 (`leading-normal`) — texto de input, `FieldDescription`, `FieldError` |
| Label | 14px (`text-sm`) | 500 (medium, via `FieldLabel`/`Label`) | 1.4 (`leading-snug`) |
| Heading | 20px (`text-[20px]`) | 600 (semibold) | 1.2 (`leading-tight`) — reservado para um eventual subtítulo de seção; não obrigatório nesta fase (ver Layout abaixo) |
| Display | 28px (`text-[28px]`) | 600 (semibold) | 1.2 (`leading-tight`) — título `<h1>` da página, idêntico ao padrão de `/subnichos`, `/pipeline`, `/templates` |

Nota: "Label" usa peso 500 (medium), não um dos 2 pesos base do sistema (400/600) — isso é herdado do componente `Label`/`FieldLabel` do shadcn (`font-medium` fixo no primitivo) e não deve ser alterado por esta fase; tratar como parte do design system existente, não como um 3º peso a declarar.

---

## Color

60/30/10 já estabelecido em todas as telas existentes (`subnichos`, `templates`, `pipeline`):

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#FFFFFF` (branco, `bg-white` no `<body>`) | Fundo da área de conteúdo principal (`<main>`) e do card do formulário |
| Secondary (30%) | `#F4F4F5` (zinc-100, sidebar) / `border-zinc-200` (bordas de card) | Fundo da sidebar; borda do card do formulário (`border border-zinc-200 rounded-lg`) |
| Accent (10%) | `#0D9488` (teal) | Reservado exclusivamente para: (1) fundo do botão "Salvar configurações" (`bg-[#0D9488] hover:bg-[#0D9488]/90`), (2) anel de foco dos 3 inputs numéricos (`focus-visible:ring-ring` já herdado do primitivo `Input`, cor teal do tema), (3) o novo item "Configurações" quando ativo no sidebar (`bg-[#0D9488]/10 text-[#0D9488]`, mesmo padrão dos outros 7 itens) |
| Destructive | `oklch(0.577 0.245 27.325)` (token CSS `--destructive`, ≈ `#DC2626`) | Somente para o estado de erro de validação dos campos (`aria-invalid`, borda + texto do `FieldError`) — esta fase **não tem nenhuma ação destrutiva** (sem exclusão, sem diálogo de confirmação) |

Accent reservado para: botão de salvar, anel de foco de input, item de sidebar ativo. Nunca usar teal em texto de corpo, ícones decorativos ou fundos de card.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Título da página (`<h1>`) | "Configurações" |
| Rótulo do item no sidebar | "Configurações" (ícone `Settings` do `lucide-react`, ao final de `NAV_ITEMS`, após "Lixeira" — D-01) |
| Rótulo do campo — etapa Novo | "Novo" |
| Rótulo do campo — etapa Contatado | "Contatado" |
| Rótulo do campo — etapa Negociação | "Negociação" |
| Descrição de cada campo (`FieldDescription`) | "Dias parado nesta etapa antes de o lead ser destacado como esfriando." |
| Primary CTA | "Salvar configurações" (estado pendente: "Salvando...", mesmo padrão de `TemplateFormDialog`) |
| Empty state | Não aplicável — o formulário sempre renderiza pré-preenchido (D-04: Contatado nasce com `5`; nunca há uma lista vazia ou estado sem dados nesta tela) |
| Error state (validação por campo) | "Mínimo de 1 dia." — exibido via `FieldError` abaixo do input correspondente quando o valor é `0`, negativo ou não numérico. Mensagem em tom idêntico aos erros já existentes (`"Nome é obrigatório."`, `"Telefone inválido..."`) |
| Error state (falha ao salvar) | Toast de erro: "Não foi possível salvar as configurações. Tente novamente." (mesmo padrão de `TemplateFormDialog`) |
| Toast de sucesso ao salvar | "Configurações salvas." (via `sonner`, D-02) |
| Destructive confirmation | Não aplicável — nenhuma ação destrutiva nesta fase |

---

## Layout (contrato específico desta fase)

Não há uma seção dedicada no template para isto, mas o layout abaixo é vinculante (equivalente a "Visuals" no checker):

- Wrapper da página: `<div className="flex flex-col gap-6">`, mesmo padrão de `/pipeline` e `/templates` (não o `gap-4` de `/subnichos`, pois há um card com padding interno abaixo do título).
- `<h1 className="text-[28px] font-semibold leading-tight">Configurações</h1>`.
- Um único card (`<form>` dentro de `<div className="rounded-lg border border-zinc-200 bg-white p-6 max-w-md">` ou equivalente), sem tabs, sem agrupamento por seção — 3 campos empilhados verticalmente na ordem do funil: Novo → Contatado → Negociação (mesma ordem do pipeline board), usando `FieldGroup` (`gap-4`/`gap-5`) + `Field` (orientação `vertical`) para cada um.
- Cada campo: `FieldLabel` (rótulo da etapa) + `Input type="number" min={1} step={1} inputMode="numeric"` + `FieldDescription` (texto padrão acima) + `FieldError` (só quando inválido).
- Botão "Salvar configurações" alinhado à direita, abaixo dos 3 campos, dentro do mesmo card (`Button className="bg-[#0D9488] text-white hover:bg-[#0D9488]/90"`).
- Sem botão "Cancelar" — não há modal, não há navegação a desfazer (D-02: o admin permanece na tela; não há um estado "não salvo" que precise de confirmação de saída, ao contrário do `discard-changes-dialog.tsx` usado no formulário de lead).
- Padrão de submissão: idêntico a `TemplateFormDialog`/`SubnichoManager` — `react-hook-form` + `zodResolver` para validação client-side, mas o `<form>` nativo submete o `FormData` bruto do DOM via `useActionState` para uma Server Action; a validação autoritativa acontece no servidor via Zod. Nomes exatos dos campos do `FormData` e o schema Zod (ex.: `diasParadoNovo`/`diasParadoContatado`/`diasParadoNegociacao`) ficam a critério do planner/executor — este contrato fixa apenas rótulos, ordem, cópia e comportamento visual.
- Valores padrão no primeiro carregamento: **Contatado = 5 é obrigatório e travado** (D-04, paridade de comportamento com o hardcode atual). Novo e Negociação nascem com **`999999`** (≈ "nunca esfria"): antes desta fase o board só destacava leads em Contatado, então qualquer padrão baixo (inclusive `5`) faria leads parados em Novo/Negociação serem destacados como "esfriando" já no primeiro deploy — mudança de comportamento proibida por D-04 / Success Criteria #3 do ROADMAP. A sugestão anterior de "mesmo valor `5` para os três" fica **revogada** (revisão de plano, 2026-07-31). O formulário mostra o valor cru `999999` no primeiro acesso, sem máscara nem formatação; o admin substitui pelo limite real que quiser (D-03 não impõe teto máximo).
- Reaproveitamento visual (sem alteração de componente): o destaque "esfriando" no board (`pipeline-lead-card.tsx`) — borda âmbar 2px `#F59E0B` + rótulo "Esfriando" com ícone `Clock` em `#B45309` — passa a se aplicar às 3 colunas (Novo, Contatado, Negociação) usando os limites configurados nesta tela, em vez de só Contatado. Nenhuma mudança visual no card em si; só a fonte do limite de dias muda (config em vez de literal `5`).

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|--------------|
| shadcn official | `field`, `input`, `button`, `sonner` (todos já instalados em `src/components/ui/`; nenhuma instalação nova necessária) | não obrigatório — nenhum componente novo entra no repositório nesta fase |

Nenhum registry de terceiros foi declarado ou é necessário para esta fase.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
