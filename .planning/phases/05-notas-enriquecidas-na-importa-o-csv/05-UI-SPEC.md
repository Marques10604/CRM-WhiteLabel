---
phase: 5
slug: 05-notas-enriquecidas-na-importa-o-csv
status: draft
shadcn_initialized: true
preset: base-nova
created: 2026-07-29
---

# Fase 5 — Contrato de Design de UI

> Contrato visual e de interação para fases de frontend. Gerado por gsd-ui-researcher, verificado por gsd-ui-checker.

**Contexto do projeto:** `components.json` já existe (preset `base-nova` sobre Base UI, reconfirmado nesta pesquisa — sem mudança). Este contrato reaproveita **integralmente** os tokens de espaçamento, tipografia e paleta 60/30/10 já aprovados em `01-UI-SPEC.md`/`02-UI-SPEC.md`/`04-UI-SPEC.md` — nenhuma cor, tamanho de fonte, peso ou valor de espaçamento novo é introduzido. Esta é uma fase pequena e aditiva: adiciona exatamente **duas** peças visuais ao passo "Mapeie as colunas" do wizard já shipado na Fase 2 (`src/components/csv-column-mapper.tsx`) — (1) uma seção de checkboxes "Colunas extras para notas (opcional)" abaixo do bloco de `Select`s existente, e (2) um texto de resumo ao vivo logo abaixo dela. Nenhuma outra tela é tocada (`csv-import-preview-table.tsx` continua só renderizando `row.notas`, sem mudança, per `05-CONTEXT.md` D-10 e `05-RESEARCH.md`).

`05-CONTEXT.md` (D-01 a D-11) já trava rótulo, posição relativa, comportamento hide-when-empty e formatação do texto final. `05-RESEARCH.md` já trava o padrão de checkbox HTML nativo (sem `npx shadcn add checkbox` — risco de OOM já registrado neste host de 4GB com `popover`) e fornece o JSX de referência (Pattern 3). As únicas lacunas restantes eram puramente visuais ("Claude's Discretion": espaçamento exato, peso de fonte do rótulo de seção) — resolvidas abaixo de forma prescritiva, reaproveitando os tokens já declarados em vez de introduzir novos. Nenhuma pergunta interativa foi necessária nesta pesquisa, mesmo precedente de `02-UI-SPEC.md`.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn (já inicializado — `components.json` confirmado, preset inalterado) |
| Preset | `base-nova` (style `base-nova`, baseColor `neutral`, cssVariables true) — inalterado, nenhum novo `shadcn init` necessário |
| Component library | Base UI (mesma base das Fases 1/2/3/4) |
| Icon library | lucide-react — **nenhum ícone novo nesta fase** (a nova seção de checkboxes é texto + `<input type="checkbox">` nativo, sem ícone, mesmo padrão do checkbox "Importar mesmo assim" em `csv-import-preview-table.tsx`) |
| Font | Geist Sans (`--font-sans`, inalterado) |
| Componentes shadcn usados | `Field`/`FieldLabel`/`FieldContent`, `Select`/`SelectContent`/`SelectItem`/`SelectTrigger`/`SelectValue`, `Button` — todos já instalados desde a Fase 1/2, nenhum novo necessário. O checkbox nativo (`<input type="checkbox">`) **não** é um componente shadcn — é HTML puro estilizado com `accent-[#0D9488]`, seguindo o precedente já existente em `csv-import-preview-table.tsx` e `template-form-dialog.tsx` (ver `05-RESEARCH.md`, Alternatives Considered). |

---

## Spacing Scale

Valores declarados (múltiplos de 4) — idênticos aos das Fases 1/2/3/4, reaproveitados sem alteração:

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Gap entre título do passo (`h2`) e os dois parágrafos de ajuda logo abaixo, no cabeçalho de `CsvColumnMapper` (inalterado) |
| sm | 8px | Gap entre o checkbox nativo e o texto do header da coluna dentro de cada linha da nova lista (`flex items-center gap-2`, mesmo padrão do checkbox "Importar mesmo assim"); gap vertical entre as linhas de checkbox dentro da nova seção (`flex flex-col gap-2`, mesmo padrão de `csv-import-preview-table.tsx` linha 141) |
| md | 16px | Gap interno do novo container de checkboxes, entre o rótulo da seção → lista de checkboxes → texto de resumo ao vivo (`flex flex-col gap-4`, mesmo ritmo vertical do container `FIELD_CONFIGS` já existente logo acima) |
| lg | 24px | Padding interno (`p-6`) do novo container `rounded-lg bg-[#F4F4F5]` — idêntico ao padding do container `FIELD_CONFIGS` já existente; gap entre o container `FIELD_CONFIGS` existente e o novo container de checkboxes (herda do `gap-6` já existente no wrapper raiz de `CsvColumnMapper`, nenhuma mudança de wrapper necessária) |
| xl | 32px | Não usado nesta fase (reservado, mesma nota das fases anteriores) |
| 2xl | 48px | Não usado nesta fase |
| 3xl | 64px | Não usado nesta fase |

Exceptions: nenhuma. A nova seção reaproveita exatamente a mesma "receita" visual do container `FIELD_CONFIGS` já existente (`rounded-lg bg-[#F4F4F5] p-6`), evitando qualquer valor de espaçamento não múltiplo de 4 (ex.: `gap-3`/12px sugerido informalmente no exemplo de código de `05-RESEARCH.md` foi ajustado para `gap-4`/16px e `gap-2`/8px, ambos já tokens declarados).

---

## Typography

Reaproveitado integralmente das Fases 1/2/3/4 (mesmos 4 tamanhos, mesmos 2 pesos — nenhum tamanho/peso novo introduzido):

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Label | 14px | 400 (regular) | 1.5 |
| Body | 16px | 400 (regular) | 1.5 |
| Heading | 20px | 600 (semibold) | 1.2 |
| Display | 28px | 600 (semibold) | 1.2 |

Uso específico desta fase:
- **Rótulo da seção "Colunas extras para notas (opcional)":** 14px, **peso 600/semibold** (reaproveita o peso já declarado para Heading/Display, combinado com o tamanho de Label — nenhum terceiro peso introduzido) — `className="text-sm font-semibold"`. O peso semibold (em vez do `font-medium` que o componente `Label`/`FieldLabel` já usa internamente para os campos `Select` acima) distingue visualmente esta seção como um sub-agrupamento dentro do mesmo container cinza, sem competir com os rótulos de campo (`FieldLabel`) existentes.
- **Texto de cada linha de checkbox (nome exato do cabeçalho do CSV, D-05):** Label — 14px/400/1.5, `className="text-sm text-foreground"` — mesmo padrão do checkbox "Importar mesmo assim" já existente (texto em cor normal, não `muted`, pois é um item interativo/acionável, não uma nota auxiliar).
- **Texto de resumo ao vivo (D-09, "Serão concatenadas: ...")**: Label — 14px/400/1.5, `className="text-sm text-muted-foreground"` — mesmo tratamento visual dos textos auxiliares já usados no passo 3 ("Detectado: separador...", contagem-resumo pré-confirmação), sinalizando que é informação de conferência, não uma ação.

**Foco visual:** a nova seção de checkboxes é secundária ao mapeamento 1-pra-1 existente (que continua sendo a ação obrigatória/primária do passo) — por isso usa exatamente a mesma hierarquia de peso/tamanho dos elementos auxiliares já estabelecidos no passo 2, sem heading próprio (`h2`/`h3`) e sem tamanho `Heading`/`Display`. O rótulo "(opcional)" já embutido no próprio texto (D-04) reforça essa hierarquia sem precisar de estilo adicional (ex.: itálico, cor diferente) — mantém o vocabulário simples/direto já usado no resto do wizard.

---

## Color

Paleta dominante/secundária/accent/destructive reaproveitada **sem nenhuma alteração** das Fases 1/2/3/4. Esta fase não introduz nenhuma cor nova.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#FFFFFF` | Fundo da página `/importar` (inalterado) |
| Secondary (30%) | `#F4F4F5` (zinc-100) | Fundo do novo container de checkboxes (`rounded-lg bg-[#F4F4F5] p-6`) — mesma cor do container `FIELD_CONFIGS` logo acima, para que as duas seções leiam como parte do mesmo passo do wizard, não como blocos concorrentes |
| Accent (10%) | `#0D9488` (teal-600) | Ver lista explícita abaixo — nunca aplicar fora dessa lista |
| Destructive | `#DC2626` (red-600) | Não aplicável nesta fase — nenhuma ação destrutiva nova (ver Copywriting Contract) |

**Accent reserved for** (lista explícita — estende, sem alterar, a lista já existente de `02-UI-SPEC.md`):
- `accent-[#0D9488]` no atributo nativo do `<input type="checkbox">` de cada linha da nova seção — **mesmo tratamento do checkbox "Importar mesmo assim"** já existente em `csv-import-preview-table.tsx`, não uma cor nova
- Botão "Ver prévia" (inalterado, já especificado em `02-UI-SPEC.md`) — continua sendo o único CTA de ação primária deste passo, a nova seção de checkboxes não introduz um segundo botão
- Anel de foco (`focus-visible`) em cada checkbox nativo, mesmo padrão de foco por teclado já aplicado a inputs/botões nas fases anteriores

**Nota de discrição — por que a seção de checkboxes usa o MESMO fundo `#F4F4F5` do bloco de `Select`s em vez de um fundo diferente ou nenhum fundo:** a alternativa (container transparente, sem fundo próprio) faria a nova seção parecer "solta" fora do card de mapeamento, quebrando a leitura de "isto tudo faz parte do mesmo passo 2". Reaproveitar o mesmo fundo secundário (D-01: "abaixo dele, no mesmo passo") comunica visualmente que a seção de colunas extras é uma extensão do mesmo formulário, não uma etapa separada — sem precisar de um heading `h3` extra ou de uma borda divisória nova.

**Destructive reserved for**: não aplicável nesta fase — nenhuma ação de exclusão/irreversível é introduzida (marcar/desmarcar um checkbox de coluna extra é uma seleção reversível, sem confirmação necessária, mesmo nível de reversibilidade dos `Select`s de mapeamento já existentes).

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Rótulo da nova seção (D-04) | "Colunas extras para notas (opcional)" — texto exato, sem variação |
| Texto de cada linha de checkbox (D-05) | Nome exato do cabeçalho do CSV, sem tradução/formatação (ex.: `score`, `sinal_dor`, `trecho_dor`, `observacao`) — pass-through direto de `unmappedHeaders`, sem capitalizar/traduzir |
| Seção inteira quando não há coluna não mapeada (D-03) | Não renderizada — sem mensagem de "nenhuma coluna disponível", sem placeholder, sem texto vazio |
| Resumo ao vivo — quando ao menos 1 coluna extra está marcada (D-09) | "Serão concatenadas: {header1} → {header2} → {header3}" — headers na ORDEM DO ARQUIVO CSV (D-08), separados por " → " (espaço-seta-espaço), atualizado a cada clique em checkbox |
| Resumo ao vivo — quando nenhuma coluna extra está marcada | Não renderizado (mesmo tratamento hide-when-empty do rótulo, D-03) — evita mostrar "Serão concatenadas: " sem nada depois |
| Primary CTA do passo (inalterado) | "Ver prévia" — nenhuma mudança de copy nem de condição de habilitação (continua exigindo só `mapping.nome && mapping.telefone`, colunas extras nunca bloqueiam o avanço) |
| Empty state | Não aplicável — não existe estado vazio próprio desta seção além do hide-when-empty (D-03) já coberto acima |
| Error state | Não aplicável — nenhuma validação client-side nova; célula vazia numa coluna extra apenas omite a linha no texto final (D-07), sem erro visível ao admin nesta tela. Validação server-side (`notas: min(1)`) já é coberta pelo fallback `CSV_DEFAULTS.notas` existente (D-11) — nenhum novo estado de erro é exposto na UI de mapeamento |
| Destructive confirmation | Não aplicável — marcar/desmarcar checkbox é reversível, sem ação destrutiva nesta fase |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|--------------|
| shadcn official | `field`, `label`, `select`, `button` (todos já instalados desde as Fases 1/2 — nenhum bloco novo do registry shadcn é necessário nesta fase) | not required |
| third-party | nenhum | not applicable — nenhum registry de terceiros foi declarado nesta fase |

Nenhum bloco novo do registry shadcn é necessário. A nova seção de checkboxes usa `<input type="checkbox">` HTML nativo estilizado com Tailwind (`size-4 accent-[#0D9488]`), seguindo o precedente já existente em `csv-import-preview-table.tsx` (checkbox "Importar mesmo assim") e `template-form-dialog.tsx` (checkbox "Marcar como padrão") — **deliberadamente não** um componente `Checkbox` do registry shadcn, per `05-RESEARCH.md` (nenhum precedente de `Checkbox` primitivo existe no projeto, e uma tentativa anterior de `npx shadcn add popover` falhou por falta de memória neste host de 4GB; reintroduzir esse risco para uma lista simples de checkboxes não se justifica).

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
