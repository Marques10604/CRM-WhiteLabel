---
phase: 23
slug: diagn-stico-de-ia-da-campanha
status: approved
shadcn_initialized: true
preset: base-nova
created: 2026-09-05
reviewed_at: 2026-09-05
---

# Phase 23 — Contrato de Design de UI

> Contrato visual e de interação do **Diagnóstico de IA da Campanha**. Gerado pelo gsd-ui-researcher, verificado pelo gsd-ui-checker.
>
> Toda a prosa deste documento está em **português (Brasil)** — regra dura do projeto.
> A feature **adiciona uma seção** a `src/app/campanhas/[id]/page.tsx` (decisão do 22-02: "as Fases 23/24 ADICIONAM seções nesta mesma página, sem retrabalho"). **Não há rota nova.**

---

## Contexto herdado (não re-perguntado)

| Fonte | Decisões já tomadas que este contrato herda |
|-------|---------------------------------------------|
| `brand.md` (LOCKED, v1.5) | Paleta OKLCH light+dark, tipografia Geist + Geist Mono, escala `--status-*`, tom de voz (direto, factual, sem hype, sem "!", sem emoji na UI). **Fonte de verdade — cores não são re-escolhidas aqui.** |
| `23-AI-SPEC.md` §1/§4b/§5/§6 | Forma exata do objeto de diagnóstico (`diagnosticoSchema`), os 5 modos de falha críticos, o gate online de "zero fontes → rejeita", a ausência de cache (DIAGNOSTICO-10), a persistência 1-linha-por-geração na tabela `diagnosticos` (inclui `status: 'falhou'`). |
| `ROADMAP.md` §Phase 23 | 5 critérios de sucesso + DIAGNOSTICO-01..10. |
| Código existente | `campanha-estado-badge.tsx` / `etapa-badge.tsx` (idioma de badge `LABEL` + `TOKEN`), `campanha-form-dialog.tsx` (`useActionState` + `startTransition` + toast sonner), `campanha-list.tsx` (estado vazio: borda tracejada + título + parágrafo muted + CTA), `campanhas/[id]/page.tsx` (H1 `text-[28px]`, `<dl>` em `rounded-lg border bg-card p-4`). |

Sem CONTEXT.md (o `/gsd-discuss-phase` foi pulado — ver STATE.md). Nenhuma pergunta de contrato ficou em aberto: tudo abaixo vem dos artefatos acima ou de default padrão do projeto.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn (CLI já inicializado — `components.json` presente) |
| Preset | `base-nova` (`style: "base-nova"`, `baseColor: neutral`, `cssVariables: true`) |
| Component library | Base UI (`@base-ui/react`) — resolvido pelo preset `base-nova` (não Radix) |
| Icon library | `lucide-react` |
| Font | Geist (sans/display) + Geist Mono (números, tokens, URLs) — via `next/font`, variáveis `--font-sans` / `--font-mono` |
| Registries de terceiros | **nenhum** (`registries: {}` em `components.json`) |

**Primitivos shadcn já no repo que esta fase reusa:** `button`, `badge`, `textarea`, `separator`, `dialog` (não previsto usar), `sonner`. **Nenhum primitivo novo do registry é necessário** — não há `accordion`, `skeleton`, `progress` nem `alert` no repo e **não devem ser adicionados**: o estado de carregamento e o de erro se constroem com `div` + tokens (ver §Estados).

**Componentes novos a criar nesta fase (código do projeto, não registry):**

| Componente | Tipo | Responsabilidade |
|-----------|------|-----------------|
| `DiagnosticoSecao` | Server | Lê o último diagnóstico da campanha + as gerações anteriores; decide entre estado vazio / resultado / erro. Renderizado no fim de `campanhas/[id]/page.tsx`. |
| `GerarDiagnosticoButton` | Client (`"use client"`) | `useActionState` sobre a Server Action; estados pending / erro; linhas de busca ao vivo. |
| `DiagnosticoResultado` | Server | Renderiza o objeto validado (saturação, gatilhos, objeções, ticket, achados, rascunho, veredito, fontes). |
| `AchadoTipoBadge` | Server | Idioma `LABEL` + `TOKEN` + `ICON` idêntico a `campanha-estado-badge.tsx` para os 2 valores de `achados[].tipo` (DIAGNOSTICO-07). |
| `VereditoSugeridoChip` | Server | Chip do veredito da IA, sempre rotulado "Sugestão da IA (não vinculante)". |
| `RascunhoMensagem` | Client | `Textarea` editável + botão "Copiar mensagem" (clipboard). |

---

## Spacing Scale

Grade de 4px (Tailwind default, mantida pela `brand.md` — "Mantenha a grade de espaçamento de 4px").

| Token | Value | Uso nesta fase |
|-------|-------|----------------|
| xs | 4px (`gap-1`) | Ícone↔texto dentro de badge/botão |
| sm | 8px (`gap-2`) | Lista de badges (achados), lista de fontes, lista de gerações anteriores |
| md | 12px (`gap-3` / `p-3`) | Espaçamento interno de card, linha de metadados |
| — | 16px (`p-4` / `gap-4`) | Padding dos blocos `rounded-lg border bg-card`, gap entre sub-blocos do resultado |
| lg | 24px (`gap-6`) | Gap entre a seção de diagnóstico e o resto da página (segue o `flex flex-col gap-6` do container de `campanhas/[id]/page.tsx`) |
| xl | 32px (`gap-8`) | Não usado nesta fase |
| — | 64px (`py-16`) | Padding vertical do estado vazio (paridade exata com `campanha-list.tsx`) |

**Exceções:**
- `gap-0.5` (2px) entre `dt` e `dd` de um par rótulo→valor — herdado do `<dl>` existente em `campanhas/[id]/page.tsx` (padrão de par rótulo→valor já em produção; não é folga nova, é continuidade de um componente aprovado).
- `h-5` (altura fixa) do primitivo `Badge` do shadcn — primitivo de biblioteca, não se ajusta à grade.

---

## Typography

Escala **travada pela `brand.md`** (§"Escala de tipografia"). Geist em todos os papéis; Geist Mono para números que importam e URLs.

Esta seção usa **no máximo 4 tamanhos** para os componentes novos: `text-xl` / `text-base` / `text-sm` / `text-xs`. O H1 `text-[28px]` da página é **herdado e fixo** (título da campanha, fora do escopo desta fase).

| Papel | Classe | Peso | Line height | Uso nesta fase |
|-------|--------|------|-------------|----------------|
| H1 (página) | `text-[28px] leading-tight` | 600 (semibold) | ~1.15 | Já existe — título da campanha, não muda (herdado, não conta no teto de 4) |
| H2 (seção) | `text-xl font-semibold` | 600 | 1.2 (`leading-tight` opcional) | "Diagnóstico de IA" |
| H3 (subseção) | `text-base font-semibold` | 600 | 1.5 | "Gatilhos de dor", "Objeções", "Ticket médio", "Achados", "Rascunho de 1ª mensagem", "Fontes" |
| Corpo | `text-sm` | 400 | 1.5 | Texto de gatilho, objeção/resposta, `leitura` da saturação, justificativa do veredito |
| Número-destaque | `text-xl font-mono tabular-nums font-semibold` | 600 | 1.2 | Índice de saturação (contagem de concorrentes) — a ênfase de "número herói" vem do mono + tabular-nums + peso 600, **não** de um tamanho maior (evita colisão com o H1 de 28px) |
| Caption / meta | `text-xs text-muted-foreground` | 400 | 1.4 | Timestamp, contagem de fontes/tokens/buscas, avisos ("não vinculante", "nunca enviado") |
| Mono inline | `font-mono tabular-nums` (herda `text-sm`) | 400 | herda | Valor do ticket (`R$ …`), token counts, domínio das URLs |

**Pesos declarados:** apenas **2** nesta seção — 400 (regular) para todo corpo/caption e 600 (semibold) para todos os títulos e o número-destaque. O peso **500 (medium)** da escala completa da `brand.md` **não é usado** aqui: cada ênfase de título resolve em 600, cada texto de leitura em 400. Isso mantém a seção dentro do teto de 2 pesos sem contrariar a `brand.md` (que permite, não obriga, os 3 pesos). Itálico é usado **uma vez, com função semântica**: o texto de uma `alegacao_marketing` renderiza em `italic text-muted-foreground` para nunca competir visualmente com um dado (ver §Color / DIAGNOSTICO-07).

---

## Color

Split 60 / 30 / 10 sobre os tokens shadcn da `brand.md` (Corrente Funda · Sóbria). **Nunca hardcode hex** — sempre `bg-*` / `text-*` de token.

| Papel | Token | Hex (light / dark) | Uso |
|-------|-------|--------------------|-----|
| Dominante (60%) | `--background` | `#F6FBFD` / `#020D12` | Fundo da página e da seção |
| Secundária (30%) | `--card` / `--muted` / `--secondary` | `#FFFFFF` / `#07191E` | Blocos do diagnóstico (`rounded-lg border bg-card p-4`), fundo do bloco de buscas ao vivo (`bg-muted`) |
| Acento (10%) | `--primary` | `#197076` / `#6CBEC2` | Ver lista reservada abaixo |
| Destrutiva | `--destructive` | — | **Só** o bloco de estado de erro/rejeição (`border-destructive/50 bg-destructive/10`) |

**Acento (`--primary`) reservado exclusivamente para:**
1. O botão primário **"Gerar diagnóstico"** (só quando **não** existe diagnóstico — `<Button>` default = `bg-primary`).
2. Links de fonte (`text-primary underline-offset-4 hover:underline` — idioma da variante `link` do Badge) — tanto os inline em cada achado quanto a lista "Fontes".
3. A borda de destaque do **gatilho de dor mais forte** (`border-primary` no card daquele gatilho) — DIAGNOSTICO-04.

Tudo o mais (botão "Gerar novo diagnóstico", "Tentar de novo", "Copiar mensagem") usa `variant="outline"` ou `variant="secondary"` — **acento não é para todo elemento interativo**.

### Escala `--status-*` — a distinção dado × marketing (DIAGNOSTICO-07, modo de falha crítico #4)

Os dois tipos de achado **nunca podem ter o mesmo peso visual**. Distinção em **3 eixos simultâneos** (cor + ícone + tratamento do texto), no idioma de `campanha-estado-badge.tsx`:

| `achados[].tipo` | Badge (LABEL) | TOKEN | ICON (lucide) | Texto da afirmação |
|------------------|---------------|-------|---------------|--------------------|
| `dado_quantificavel` | "Dado quantificável" | `bg-status-info text-status-info-foreground` | `Hash` | `text-sm text-foreground` (peso normal, cor plena) |
| `alegacao_marketing` | "Alegação de concorrente" | `bg-status-warning text-status-warning-foreground` | `Megaphone` | `text-sm italic text-muted-foreground` (recuado visualmente) |

O **veredito sugerido** usa `--status-*` por decisão, mas sempre dentro de um chip `variant="outline" border-transparent` rotulado:

| `veredito_sugerido.decisao` | LABEL | TOKEN |
|-----------------------------|-------|-------|
| `aprofundar` | "Aprofundar" | `bg-status-success text-status-success-foreground` |
| `mudar_angulo` | "Mudar o ângulo" | `bg-status-warning text-status-warning-foreground` |
| `abandonar` | "Abandonar" | `bg-status-danger text-status-danger-foreground` |

O índice de saturação **não** ganha cor semântica — é um número mono neutro (`text-foreground`); a `leitura` textual ao lado é que interpreta. Isso materializa a regra da §1b da AI-SPEC: "contagem não é veredito".

---

## Copywriting Contract

Voz da `brand.md`: direto, factual, verbo antes de adjetivo, frase curta, **sem "!", sem emoji, sem hype**.

| Elemento | Cópia |
|----------|-------|
| CTA primário (sem diagnóstico) | **Gerar diagnóstico** |
| CTA de regeneração (já há diagnóstico) | **Gerar novo diagnóstico** |
| Botão durante a geração | **Gerando diagnóstico…** (disabled, com spinner `Loader2`) |
| Estado vazio — título | **Nenhum diagnóstico gerado ainda** |
| Estado vazio — corpo | O diagnóstico pesquisa a web, conta concorrentes diretos, mapeia gatilhos de dor e objeções do nicho, estima ticket médio e sugere um veredito. Faz buscas reais e custa uma chamada de API — leva de 30 a 90 segundos. |
| Aviso sob o botão de regeneração | Cada geração é uma chamada nova e paga. A anterior fica no histórico. |
| Linha ao vivo durante a geração | `buscando: {consulta}` (`font-mono text-xs text-muted-foreground`, uma por linha, via `onStepFinish`) |
| Aviso de custo durante a geração | Isto faz buscas na web e custa uma chamada de API. Não feche a página. |
| Estado de erro — título | **Diagnóstico não gerado** |
| Estado de erro — corpo (zero fontes / DIAGNOSTICO-02) | A IA não retornou nenhuma fonte da web para embasar o diagnóstico. Sem fonte o resultado não é confiável e foi descartado. Tente de novo. |
| Estado de erro — corpo (schema / truncamento / API) | A geração falhou antes de produzir um resultado válido ({motivo}). Nada foi salvo além do registro desta tentativa. Tente de novo. |
| Botão de repetição no erro | **Tentar de novo** |
| Toast de sucesso | Diagnóstico gerado. |
| Toast de falha | A geração falhou. Veja o motivo abaixo. |
| Linha de metadados do resultado | `gerado em {dd/MM/yyyy HH:mm} · {n} fontes · {inputTokens}+{outputTokens} tokens · {n} buscas` (`text-xs text-muted-foreground font-mono`) |
| Rótulo do índice de saturação | Concorrentes diretos encontrados |
| Título — gatilhos | Gatilhos de dor |
| Badge do gatilho destacado | **Mais forte** (`bg-status-neutral text-status-neutral-foreground`, no card com `border-primary`) |
| Título — objeções | Objeções esperadas |
| Rótulo da resposta à objeção | Resposta sugerida: |
| Título — ticket | Ticket médio estimado |
| Prefixo da base do ticket | Base: |
| Título — achados | Achados |
| Título — rascunho | Rascunho de 1ª mensagem |
| Nota sob o rascunho | Rascunho editável. Nunca enviado pelo sistema — copie e use à mão. As edições não são salvas. |
| Botão de cópia do rascunho | **Copiar mensagem** → após clique: **Copiado** (2s, depois volta) |
| Rótulo do veredito | Sugestão da IA (não vinculante) |
| Caption sob o veredito | É insumo para a sua decisão. O veredito final é registrado por você. |
| Título — fontes | Fontes |
| Link de fonte | `{domínio}` + ícone `ExternalLink` (abre em nova aba, `rel="noopener noreferrer"`) |
| Disclosure do histórico | **Ver gerações anteriores ({n})** |
| Linha de geração anterior | `{dd/MM/yyyy HH:mm} · {veredito ou "falhou"} · {n} fontes · {custo}` |

**Confirmação de ação destrutiva:** **N/A — não há ação destrutiva nesta fase.** Regenerar não apaga nada: a geração anterior permanece como linha em `diagnosticos` e aparece no histórico. Por isso **não há modal de confirmação** — só o botão explícito + o aviso de custo em caption (proporcional a ferramenta solo interna).

---

## Layout e Estrutura da Seção

A seção é o último filho do `<div className="flex flex-col gap-6">` de `campanhas/[id]/page.tsx`, depois do `<dl>` existente.

```
<section className="flex flex-col gap-4">
  ├─ header: <h2 "Diagnóstico de IA">  +  [botão à direita]
  │     • sem diagnóstico → nada aqui (o CTA vive no estado vazio)
  │     • com diagnóstico → "Gerar novo diagnóstico" (variant=outline) + caption de custo
  │
  ├─ ESTADO VAZIO  (rounded-lg border border-dashed py-16 text-center)
  │     h2 título · p corpo · <Button> "Gerar diagnóstico"
  │
  ├─ ESTADO PENDING  (substitui o corpo enquanto pending)
  │     bloco bg-muted rounded-lg p-4:
  │       • linha "Gerando diagnóstico…" + Loader2 (animate-spin)
  │       • lista font-mono text-xs das consultas ("buscando: …")
  │       • caption de aviso de custo
  │
  ├─ ESTADO ERRO  (rounded-lg border border-destructive/50 bg-destructive/10 p-4)
  │     h3 "Diagnóstico não gerado" · p motivo · timestamp · <Button outline> "Tentar de novo"
  │
  └─ ESTADO RESULTADO  (flex flex-col gap-4)
        • Ponto focal único ao concluir a geração: o número do índice de saturação + sua `leitura`.
          Os demais ~9 blocos têm peso visual uniforme e secundário — o executor não deve dar
          ênfase competindo (sem outra "hero number", sem outra borda de acento além do gatilho mais forte).
        ├─ linha de metadados (text-xs mono muted)
        ├─ bloco Saturação  (rounded-lg border bg-card p-4): número text-xl font-mono tabular-nums font-semibold + rótulo + leitura
        ├─ bloco Gatilhos    (gap-3): 1–3 cards; o "mais forte" com border-primary + badge "Mais forte"
        │      cada card: texto do gatilho + link "observável em" (ExternalLink)
        ├─ bloco Objeções    (gap-3): 2–3 pares — objeção (font-semibold) / "Resposta sugerida:" (text-sm)
        ├─ bloco Ticket      (rounded-lg border bg-card p-4): valor mono + "Base: …" + link de fonte
        ├─ bloco Achados     (flex flex-col gap-2): cada linha = <AchadoTipoBadge> + afirmação + link
        ├─ bloco Rascunho    (<RascunhoMensagem>): Textarea + "Copiar mensagem" + nota
        ├─ bloco Veredito    (<VereditoSugeridoChip>): rótulo "Sugestão da IA (não vinculante)" + chip + justificativa + caption
        ├─ bloco Fontes      (flex flex-col gap-2): lista de todas as URLs citadas (res.sources), cada uma link
        └─ disclosure "Ver gerações anteriores (n)" → lista compacta read-only
```

---

## Estados e Interação (contrato)

| # | Regra | Detalhe de implementação |
|---|-------|--------------------------|
| 1 | **Nunca roda sozinho** (SC1 / DIAGNOSTICO-01) | Só o clique no botão dispara. Sem `useEffect` de auto-trigger, sem geração no `create` da campanha. |
| 2 | **Regeneração é explícita** (DIAGNOSTICO-10) | Quando já existe diagnóstico, o botão vira "Gerar novo diagnóstico" (`variant="outline"`, não primário) + caption "Cada geração é uma chamada nova e paga." Sem cache, sem checagem "já existe". |
| 3 | **Pending 30–90s visível** | `useActionState` + `startTransition` (idioma de `campanha-form-dialog.tsx`). Botão `disabled` com `Loader2 animate-spin` e label "Gerando diagnóstico…". Bloco `bg-muted` mostra as consultas de busca ao vivo (`onStepFinish` → estado local → linhas `font-mono text-xs`, prefixo "buscando: "). Caption "custa uma chamada de API… não feche a página". **Sem `<Progress>`** (duração indeterminada; o spinner + as linhas que aparecem são a prova de trabalho). |
| 4 | **Rejeição por zero fontes é um estado, não um resultado** (SC4 / DIAGNOSTICO-02, modo de falha #3) | A Server Action devolve `{ ok: false, erro }`; a UI renderiza o **bloco de erro** com o motivo específico do campo `erro` — **nunca** um resultado parcial ou genérico. O timestamp da tentativa falha aparece (é evento visível). Toast de falha. |
| 5 | **Cada geração é evento visível, custo nunca escondido** (SC5 / DIAGNOSTICO-10, modo de falha #5) | Linha de metadados sempre visível no resultado: `n fontes · inputTokens+outputTokens · n buscas · data`. Falhas também viram linha no histórico. |
| 6 | **Histórico — opção enxuta (recomendada)** | Inline na página: **só o último diagnóstico** é renderizado por extenso. Um disclosure "Ver gerações anteriores (n)" expande uma **lista compacta read-only** (data · veredito/"falhou" · nº fontes · custo). **Sem rota `/diagnosticos` nesta fase** (a AI-SPec §7 a cita como opcional/futuro). |
| 7 | **Rascunho editável, não persistido, nunca enviado** (DIAGNOSTICO-08) | `<Textarea>` com `defaultValue` = `rascunho_primeira_mensagem`. Botão "Copiar mensagem" copia o valor **vivo** do textarea (`navigator.clipboard.writeText`), vira "Copiado" por 2s. Nota fixa: "Nunca enviado pelo sistema… as edições não são salvas." Sem botão "Salvar", sem integração de disparo. |
| 8 | **Fontes reais, verificáveis** (SC3 / DIAGNOSTICO-02) | Toda URL vem de `res.sources` (não das que o modelo escreveu no corpo). Cada achado/gatilho/ticket linka sua fonte inline (`ExternalLink`, nova aba, `rel="noopener noreferrer"`). Bloco "Fontes" no rodapé consolida todas. |
| 9 | **Foco e leitura após concluir** | Ao terminar a geração com sucesso, mover foco / `scrollIntoView` para o `<h2>` "Diagnóstico de IA". Toast "Diagnóstico gerado." |
| 10 | **Dark mode** | Toda a seção testada em claro **e** com `.dark` forçado antes de "pronto" (regra `brand.md`). Só tokens — `bg-status-*`, `bg-card`, `text-muted-foreground`, `border-destructive/50`. |
| 11 | **Transições** | Só `transition-colors` nos hovers de link/botão. Nunca `transition: all` (regra `brand.md`). O spinner usa `animate-spin`. |

---

## Registry Safety

| Registry | Blocks usados | Safety Gate |
|----------|---------------|-------------|
| shadcn oficial | `button`, `badge`, `textarea`, `separator`, `sonner` (todos **já no repo** desde fases anteriores) | não requerido |
| terceiros | **nenhum** | não aplicável — `registries: {}` em `components.json`; nenhum bloco de terceiro declarado |

Nenhum `npx shadcn add` de registry externo nesta fase. Os componentes novos (`DiagnosticoSecao`, `AchadoTipoBadge`, etc.) são código do projeto sob `src/components/` e `src/app/campanhas/[id]/_components/`, não itens de registry.

---

## Checker Sign-Off

- [x] Dimensão 1 Copywriting: PASS
- [x] Dimensão 2 Visuais: PASS
- [x] Dimensão 3 Color: PASS
- [x] Dimensão 4 Typography: PASS (bloqueio inicial de tipografia resolvido na revisão 1)
- [x] Dimensão 5 Spacing: PASS
- [x] Dimensão 6 Registry Safety: PASS

**Approval:** approved 2026-09-05 (gsd-ui-checker, após 1 revisão)
