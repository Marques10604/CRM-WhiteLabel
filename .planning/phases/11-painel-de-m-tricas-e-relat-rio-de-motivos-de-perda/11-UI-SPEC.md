---
phase: 11
slug: painel-de-m-tricas-e-relat-rio-de-motivos-de-perda
status: draft
shadcn_initialized: true
preset: base-nova
created: 2026-08-14
---

# Fase 11 — Contrato de Design de UI

> Contrato visual e de interação para o Painel de Métricas e Relatório de Motivos de Perda (METRICAS-01/02, PERDA-01). Gerado por gsd-ui-researcher, verificado por gsd-ui-checker.

**Contexto do projeto:** `components.json` já existe (preset `base-nova` sobre Base UI, confirmado na Fase 1, reaproveitado sem alteração nas Fases 3-10). Esta fase introduz **duas rotas novas** (`/relatorios`, leitura única; `/motivos-perda`, gestão) e modifica **duas superfícies existentes de captura de `motivoPerda`** (`lead-form-dialog.tsx` e `motivo-perda-dialog.tsx`, ver `11-RESEARCH.md` Pitfall 1) para atender D-04 (campo obrigatório). `11-CONTEXT.md` §Claude's Discretion deixou explicitamente em aberto: (1) layout exato de `/relatorios` (cards lado a lado vs. seções empilhadas, tipografia, cores) e (2) mecânica exata do seletor de período — este contrato resolve as duas de forma prescritiva, seguindo o padrão visual já estabelecido no projeto (`/subnichos`, `/pipeline`, `/configuracoes`) em vez de propor um novo. Nenhuma dependência npm nova é necessária (`11-RESEARCH.md` §Standard Stack) — todos os primitivos usados (`Table`, `Select`, `Combobox`, `Dialog`, `Badge`, `Button`, `Field`/`Label`) já estão instalados em `src/components/ui/`.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn (já inicializado — `components.json` confirmado na raiz do projeto) |
| Preset | `style: base-nova`, `baseColor: neutral`, `cssVariables: true`, `iconLibrary: lucide` (ver `components.json`) |
| Component library | Base UI (`@base-ui/react`) via shadcn CLI estilo `base-nova` — não é Radix |
| Icon library | `lucide-react` — dois ícones novos usados nesta fase, ambos confirmados presentes no pacote instalado (`node_modules/lucide-react/dist/esm/icons/bar-chart-3.mjs`, `list-x.mjs`): `BarChart3` (item de sidebar "Relatórios") e `ListX` (item de sidebar "Motivos de Perda", diferenciado do `Tag` já usado por "Sub-nichos"). `Plus` (já em uso desde a Fase 10) é reaproveitado para o item "Criar" do combobox de criação-na-hora. `Trash2`/`Pencil` (já em uso desde a Fase 1/9) são reaproveitados sem alteração pela tela `/motivos-perda`, que replica `/subnichos` linha por linha. |
| Font | Geist Sans (`--font-geist-sans`, via `next/font/google`) — inalterado |
| Novas dependências npm | Nenhuma — nenhum gráfico/lib de chart é introduzido (REQUIREMENTS.md §Out of Scope: "Dashboard de BI completo... fica adiável"). `/relatorios` usa `Table` (`src/components/ui/table.tsx`) e texto, não `recharts`. |

---

## Spacing Scale

Escala de 8 pontos já em uso consistente em todo o projeto (confirmado em `configuracoes-form.tsx`, `subnicho-manager.tsx`, `pipeline/page.tsx`):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Gap entre ícone e texto nos 2 novos itens de sidebar (`gap-3` já é o padrão real do componente — ver Layout); gap entre ícone `Plus`/texto no item "Criar" do combobox |
| sm | 8px | `gap-2` entre o rótulo "Período:" e o `Select` do seletor de período; `gap-2` interno de cada linha de `MotivoPerdaManager` (idêntico a `SubnichoRow`); padding interno de célula de tabela (`p-2`, herdado de `TableCell`, inalterado) |
| md | 16px | `gap-4` entre o título de cada seção (`h2`) e sua tabela, dentro do card; `gap-4` entre o campo `motivoPerdaId` e os campos vizinhos em `lead-form-dialog.tsx` (inalterado, mesmo espaçamento vertical do formulário já existente) |
| lg | 24px | `p-6` — padding interno de cada card de seção em `/relatorios` (mesmo container de `configuracoes-form.tsx`); `gap-6` — espaçamento entre `h1` e o restante da página, e entre os 3 cards de seção empilhados (mesmo `flex flex-col gap-6` já usado em `/pipeline`, `/configuracoes`) |
| xl | 32px | Não usado nesta fase |
| 2xl | 48px | Não usado nesta fase |
| 3xl | 64px | Não usado nesta fase |

Exceções:
- **Alvo de toque icon-only do gatilho do combobox / botões Renomear-Remover em `/motivos-perda`:** `size-9` (36px) — mesmo alvo de toque já usado por `Pencil`/`Trash2` em `subnicho-manager.tsx`, nenhum tamanho novo introduzido.
- Nenhuma outra exceção fora da escala de 8 pontos é introduzida nesta fase.

---

## Typography

Reaproveitado integralmente do inventário já em uso (nenhum tamanho/peso novo introduzido nesta fase — mesmos 4 papéis usados por `followup-dashboard.tsx`/`pipeline/page.tsx`):

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px | 400 (regular) | 1.5 — não usado diretamente nesta fase (as tabelas de relatório usam Label, ver abaixo, por serem dados densos, não prosa) |
| Label | 14px | 400 (regular) | 1.5 — texto de células de tabela (`Table`/`TableCell`, `text-sm` = 14px, herdado do primitivo); texto de ajuda abaixo do título de cada seção; rótulo "Período:"; placeholder do `MotivoPerdaCombobox`; linhas de `MotivoPerdaManager` (idêntico a `SubnichoRow`) |
| Heading | 20px | 600 (semibold) | 1.2 — título de cada uma das 3 seções de `/relatorios` ("Leads por origem", "Leads por sub-nicho", "Motivos de perda"), mesmo nível hierárquico do `h2` "Tudo em dia!" em `followup-dashboard.tsx` e da seção "Sequência de reabordagem" da Fase 10 |
| Display | 28px | 600 (semibold) | 1.2 — `h1` "Relatórios" e `h1` "Motivos de Perda" (`text-[28px] font-semibold leading-tight`, idêntico a todo `h1` já existente no projeto) |

Cabeçalhos de coluna de tabela (`TableHead`) usam o peso 600 já embutido no primitivo (`font-medium` do componente `table.tsx` — nenhum peso extra introduzido). Nenhum 3º peso é introduzido — a mesma disciplina de 2 pesos (400/600) das fases anteriores é mantida.

---

## Color

60/30/10 já estabelecido em todas as telas existentes, reaproveitado sem alteração:

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#FFFFFF` | Fundo de cada card de seção em `/relatorios` (`bg-white`); fundo do card de lista em `/motivos-perda` (idêntico a `/subnichos`); fundo geral da área de conteúdo (inalterado) |
| Secondary (30%) | `#F4F4F5` (zinc-100) / `border-zinc-200` | Borda de cada card de seção (`border border-zinc-200`, mesmo tom de `configuracoes-form.tsx`); fundo da sidebar (inalterado, os 2 itens novos herdam o mesmo estilo); hover de linha (`hover:bg-[#F4F4F5]`, idêntico a `SubnichoRow`) |
| Accent (10%) | `#0D9488` (teal) | Reservado exclusivamente para: (1) item de sidebar ativo ("Relatórios"/"Motivos de Perda" quando a rota está ativa, mesmo `bg-[#0D9488]/10 text-[#0D9488]` já usado pelos 8 itens existentes), (2) anel de foco do seletor de período e do `MotivoPerdaCombobox` (`focus-visible:border-[#0D9488] focus-visible:ring-[#0D9488]/50`, mesma classe `ACCENT_FOCUS_RING` já definida em `lead-table-toolbar.tsx`), (3) botão "+ Adicionar" de `/motivos-perda` (idêntico a `/subnichos`), (4) item "Criar "{query}"" dentro do `MotivoPerdaCombobox` (ícone `Plus` + texto em teal — é a única ação nova introduzida dentro do combobox), (5) botão "Salvar motivo" em `motivo-perda-dialog.tsx` (reaproveitado sem mudança de cor) |
| Destructive | `oklch(0.577 0.245 27.325)` (token CSS `--destructive`, ≈ `#DC2626`) | Ícone `Trash2` de cada linha de `MotivoPerdaManager` (idêntico a `SubnichoRow`); botão "Remover" do `DeleteMotivoPerdaDialog` (`variant="destructive"`, idêntico a `DeleteSubnichoDialog`); texto de erro de validação (`text-[#DC2626]`) |

**Accent reservado para** (nenhuma adição semântica nova além do já estabelecido nas fases anteriores):
- Indicador do item ativo na sidebar (estendido aos 2 itens novos, mesmo mecanismo)
- Anel de foco (`focus-visible`)
- Botões de ação primária/criação ("+ Adicionar", "Criar "{query}"", "Salvar motivo")

**Nunca usar accent ou uma paleta de cores nova nos números do relatório (crítico, decisão desta fase):** as tabelas de `/relatorios` (contagens, taxa de conversão, rótulos "Inbound"/"Outbound") usam **texto neutro** (`text-foreground` para os números, `text-muted-foreground` para rótulos secundários), nunca teal nem uma paleta semântica nova de badges coloridos por origem/motivo. Mesmo raciocínio já aplicado ao indicador "Sugestão: dd/MM" da Fase 10 (`10-UI-SPEC.md` linha 84): dado informativo/não-acionável não compete visualmente com os elementos de accent reservados a ações. Isto também evita introduzir uma paleta nova sem necessidade — `REQUIREMENTS.md` §Out of Scope já descarta "dashboard de BI completo (gráficos avançados, drill-down)"; uma paleta de cores por categoria seria um passo nessa direção não pedida. A taxa de conversão pode usar `font-semibold` (peso, não cor) para se destacar como a métrica mais importante da seção "Leads por origem" — ênfase por peso tipográfico, nunca por cor.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA — `/relatorios` | Nenhum — tela somente-leitura (REQUIREMENTS.md §Out of Scope confirma que nenhuma ação parte dos números desta tela) |
| Primary CTA — `/motivos-perda` | "+ Adicionar" (idêntico a `/subnichos`, mesmo botão-link teal) |
| `h1` — `/relatorios` | "Relatórios" |
| `h1` — `/motivos-perda` | "Motivos de Perda" |
| Rótulo do seletor de período | "Período:" |
| Opções do seletor de período (D-10) | "Últimos 30 dias" / "Últimos 90 dias" / "Tudo" |
| Título — Seção 1 (METRICAS-01) | "Leads por origem" |
| Título — Seção 2 (METRICAS-02) | "Leads por sub-nicho" |
| Título — Seção 3 (PERDA-01) | "Motivos de perda" |
| Texto de ajuda — Seção 3 (D-11, crítico) | "Esta seção considera a data em que o lead foi movido para Perdido, não a data de criação — pode incluir leads criados fora do período selecionado acima." (`text-[14px] text-muted-foreground`, sempre visível abaixo do título, não um tooltip escondido — mesmo padrão de texto de ajuda já usado em toda seção de `/configuracoes`) |
| Colunas — Seção 1 | "Origem" / "Total de leads" / "Fechados" / "Taxa de conversão" |
| Colunas — Seção 2 | "Sub-nicho" / "Total de leads" |
| Colunas — Seção 3 | "Motivo da perda" / "Leads perdidos" |
| Rótulos de origem (reaproveitados de `lead-form-dialog.tsx`) | "Inbound" / "Outbound" — nesta ordem fixa, sempre as duas linhas presentes mesmo com contagem 0 (ver Layout) |
| Formato da taxa de conversão | `{Math.round(fechados / total * 100)}%`, e explicitamente **"0%"** (nunca "NaN%"/"—") quando `total = 0` (`11-RESEARCH.md` Pitfall 3) |
| Empty state — Seção 1 | Não aplicável — Inbound/Outbound sempre aparecem (enum fechado de 2 valores, ver Layout); se AMBOS tiverem total 0 no período, mostrar "Nenhum lead neste período." abaixo do cabeçalho da tabela |
| Empty state — Seção 2 | "Nenhum lead neste período." (`text-[14px] text-muted-foreground`, no lugar da tabela, mesmo padrão do "Nenhum sub-nicho cadastrado." de `subnicho-manager.tsx`) |
| Empty state — Seção 3 | "Nenhum lead perdido neste período." (mesma classe/posição da Seção 2) |
| Empty state — lista `/motivos-perda` | "Nenhum motivo de perda cadastrado." (idêntico literal ao padrão de `/subnichos`, só troca o substantivo) |
| Placeholder — adicionar motivo (`/motivos-perda`) | "Nome do motivo de perda" |
| Toast sucesso — criar motivo | "Motivo de perda criado." |
| Toast sucesso — renomear motivo | "Motivo de perda renomeado." |
| Toast sucesso — remover motivo | "Motivo de perda removido." |
| Erro de validação — nome duplicado | "Esse motivo já existe." (idêntico literal ao padrão de sub-nicho) |
| Destructive confirmation — `/motivos-perda` | Título: "Remover motivo de perda". Corpo: "Tem certeza que deseja remover {nome}? Ele deixa de aparecer nas opções ao mover um lead para Perdido. Os leads já perdidos com esse motivo continuam intactos." Botões: "Cancelar" (outline) / "Remover" (destructive) — texto e estrutura idênticos a `DeleteSubnichoDialog`, só troca o substantivo |
| Combobox — placeholder (`MotivoPerdaCombobox`) | "Selecione ou digite um motivo..." |
| Combobox — item de criação-na-hora (D-03) | `Criar "{query digitado}"` com ícone `Plus` à esquerda, cor accent teal (única linha do combobox que é uma ação, não uma seleção) |
| Combobox — estado vazio sem query (raro, lista seguida sempre tem os 6 valores-seed) | "Nenhum motivo encontrado." |
| Campo obrigatório — `lead-form-dialog.tsx`, rótulo | "Motivo da perda" (inalterado) |
| Campo obrigatório — `lead-form-dialog.tsx`, texto de ajuda (D-04, substitui a cópia atual "Opcional — por que esse lead foi perdido...") | "Por que esse lead foi perdido." (remove a palavra "Opcional" e os exemplos de texto livre, já que agora é seleção de uma lista governada, não texto livre) |
| Campo obrigatório — erro de validação (D-04) | "Selecione o motivo da perda." |
| `motivo-perda-dialog.tsx` — título | "Mover para Perdido" (inalterado) |
| `motivo-perda-dialog.tsx` — descrição (D-04, remove "(opcional)") | `Por que "${leadNome}" foi perdido?` |
| `motivo-perda-dialog.tsx` — botões (D-04, remove "Pular") | "Cancelar" (outline, reverte a etapa para a anterior — ver Layout) / "Salvar motivo" (accent, `disabled` até um motivo válido ser selecionado/criado) |
| Erro geral de servidor (mutations desta fase) | "Não foi possível salvar. Tente novamente." (mesmo tom direto já usado em `configuracoes-form.tsx`/`lead-form-dialog.tsx`, nunca stack trace/código técnico) |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|--------------|
| shadcn official | `table`, `select`, `combobox`, `dialog`, `badge`, `button`, `input`, `field`, `label` (todos já instalados em `src/components/ui/`; nenhuma instalação nova necessária) | não obrigatório — nenhum componente novo entra no repositório nesta fase |
| third-party | nenhum | não aplicável — nenhum registry de terceiros foi declarado nesta fase |

Nenhum bloco novo do registry shadcn é necessário. Nenhuma dependência npm nova é adicionada nesta fase, portanto o gate de segurança de registry de terceiros não se aplica.

---

## Layout (contrato específico desta fase)

Não há uma seção dedicada no template para isto, mas o layout abaixo é vinculante (equivalente a "Visuals" no checker).

### Sidebar (`src/components/app-sidebar.tsx`)

- Dois itens novos em `NAV_ITEMS`, inseridos nesta ordem final (razão: "Relatórios" é uma tela de consulta que fecha o ciclo depois de "Pipeline"; "Motivos de Perda" é uma tela de gestão, agrupada ao lado de "Sub-nichos", o outro item de governança de lista):

  ```
  Follow-ups, Leads, Importar, Pipeline, Relatórios, Templates, Sub-nichos, Motivos de Perda, Lixeira, Configurações
  ```

- "Relatórios" → `href: "/relatorios"`, ícone `BarChart3`, inserido logo após "Pipeline".
- "Motivos de Perda" → `href: "/motivos-perda"`, ícone `ListX`, inserido logo após "Sub-nichos".
- Nenhuma outra mudança no componente — mesmo estilo visual (`flex items-center gap-3 rounded-lg px-[14px] py-2.5 text-sm font-medium`, estado ativo `bg-[#0D9488]/10 text-[#0D9488]`) já usado pelos 8 itens existentes, sem exceção.

### Tela `/relatorios` (METRICAS-01, METRICAS-02, PERDA-01)

- **Estrutura da página:** `<div className="flex flex-col gap-6">`, mesmo container-padrão de `/pipeline`/`/configuracoes`.
- **Cabeçalho:** `h1` "Relatórios" (`text-[28px] font-semibold leading-tight`) e o `PeriodoSelector` na mesma linha, `flex items-center justify-between` — decisão explícita: **não** empilhar o seletor abaixo do título (ele filtra a tela inteira, precisa estar visualmente no mesmo nível hierárquico do título, não subordinado a uma seção).
- **`PeriodoSelector` (client component novo, sem precedente direto — `11-RESEARCH.md` confirma zero uso de `searchParams` no projeto até esta fase):**
  - `<Select>` (mesmo primitivo/estilo de `lead-table-toolbar.tsx`, incluindo `ACCENT_FOCUS_RING`), precedido do rótulo "Período:" (`text-[14px] text-muted-foreground`), `flex items-center gap-2`.
  - As 3 opções (D-10) mapeiam para `?period=30d` / `?period=90d` / `?period=tudo` via `router.push` (mantendo outros parâmetros de query existentes, se houver, com `{ scroll: false }`).
  - **Default sem parâmetro (primeiro acesso, sem `?period` na URL):** `"30d"` (Últimos 30 dias) — é o preset mais útil no dia a dia, primeiro da lista em D-10.
  - **Fallback de segurança para valor inválido/adulterado na URL** (`11-RESEARCH.md` §Security Domain): qualquer valor de `period` fora do enum `{30d, 90d, tudo}` cai silenciosamente em `"tudo"` (nunca lança erro 500, nunca mostra tela quebrada) — comportamento diferente do default de primeiro acesso, documentado com comentário âncora no código citando esta distinção.
- **As 3 seções são sempre empilhadas verticalmente** (`flex flex-col gap-6`), nunca lado a lado — decisão explícita resolvendo o ponto em aberto do `11-CONTEXT.md`. Razão: os dados de cada seção têm larguras de tabela diferentes (a Seção 1 tem 4 colunas, a Seção 2 e 3 têm 2), forçar lado a lado exigiria larguras artificiais ou scroll horizontal; empilhado é consistente com o padrão de página já usado em `/configuracoes` (2 cards empilhados) e `/pipeline`.
- **Cada seção é um card:** `rounded-lg border border-zinc-200 bg-white p-6`, mesmo container visual já usado em `configuracoes-form.tsx`/Fase 10. Dentro do card: título `h2` (`text-[20px] font-semibold leading-tight`), texto de ajuda opcional abaixo (só a Seção 3 tem, ver Copywriting), depois a `Table` (`gap-4` entre título/ajuda e a tabela).
- **Seção 1 — "Leads por origem" (METRICAS-01):**
  - Tabela de exatamente 2 linhas fixas, nesta ordem: "Inbound", "Outbound" — **sempre as duas presentes**, mesmo que uma tenha `total = 0` no período (é um enum fechado de 2 valores, diferente de sub-nicho/motivo que são listas abertas onde `GROUP BY` naturalmente omite grupos vazios). Isto é intencional e importante: com os dados reais de hoje (23/23 leads Outbound), omitir a linha "Inbound" por ausência de `GROUP BY` esconderia exatamente o dado que o admin mais precisa ver ("ainda não tenho nenhum lead Inbound").
  - Colunas: Origem | Total de leads | Fechados | Taxa de conversão (`{Math.round(fechados/total*100)}%`, "0%" quando `total=0`).
  - Taxa de conversão em `font-semibold` (ênfase por peso, nunca por cor — ver Color).
- **Seção 2 — "Leads por sub-nicho" (METRICAS-02):**
  - Tabela ordenada por Total de leads **decrescente** (sub-nicho com mais leads primeiro); empate quebrado por nome alfabético.
  - "A categorizar" aparece como uma linha normal, misturada com as demais, sem estilo/posição diferenciada (D-12, literal).
  - Colunas: Sub-nicho | Total de leads.
- **Seção 3 — "Motivos de perda" (PERDA-01):**
  - Tabela ordenada por Leads perdidos **decrescente**; empate quebrado por nome alfabético.
  - Colunas: Motivo da perda | Leads perdidos.
  - Filtro de período desta seção usa `stageChangedAt`, nunca `createdAt` (D-11) — texto de ajuda obrigatório abaixo do título (ver Copywriting) para que o admin nunca interprete mal por que os números não batem com as outras duas seções.

### Tela `/motivos-perda` (gestão, D-05)

- Réplica visual 1:1 de `/subnichos` — mesma estrutura de página (`h1` + componente de gestão único), mesmo componente `MotivoPerdaManager` (análogo a `SubnichoManager`: lista com hover, botões `Pencil`/`Trash2` de 36px, edição inline por linha, "+ Adicionar" abaixo da lista) e `DeleteMotivoPerdaDialog` (análogo a `DeleteSubnichoDialog`). Nenhuma variação visual introduzida — a única diferença é o substantivo no copy (ver Copywriting) e a tabela/Server Action de destino.

### `MotivoPerdaCombobox` — combobox com criação-na-hora (D-03, território novo — sem precedente direto no projeto)

`SubnichoCombobox` (referência estrutural) é um combobox de seleção pura, sem afordance de criação visível — este componente introduz o primeiro padrão de "combobox criável" do projeto. Contrato:

- Mesmo shell visual de `SubnichoCombobox` (`Combobox`/`ComboboxInput`/`ComboboxContent`/`ComboboxList`/`ComboboxItem`), com o mesmo filtro `deletedAt === null || id === value` (nota de bug já documentada em `.planning/debug/resolved/subnicho-combobox-vazio.md`).
- **Quando o texto digitado não corresponde a nenhum item existente (case-insensitive/trim):** a lista de resultados mostra, como **última entrada**, um item de ação `Criar "{query}"` (ícone `Plus`, texto em accent teal — única exceção à regra "accent nunca em conteúdo de dados", pois esta linha é uma ação, não um dado). Selecionar esse item chama `createMotivoPerda` (Server Action), desabilita o input durante o `pending`, e ao resolver: sucesso → seleciona automaticamente o item recém-criado/reativado (usa o `id` retornado, ver `11-RESEARCH.md` nota de shape do Pattern 2) e fecha o popup; erro → mantém o popup aberto com uma mensagem de erro inline (`text-[#DC2626] text-sm`) reaproveitando o mesmo padrão de erro de campo já usado em `subnicho-manager.tsx`.
- **Quando o texto digitado corresponde exatamente a um item existente (incluindo soft-deletado, reativação-por-nome):** nenhum item "Criar" aparece — o item existente já é selecionável normalmente, mesma mecânica de reativação silenciosa já usada por `createSubnicho`.
- Usado em duas superfícies: `lead-form-dialog.tsx` (campo `motivoPerdaId`, dentro do `Field` condicional `stage === "perdido"`, ver Copywriting) e `motivo-perda-dialog.tsx` (ver abaixo).

### `motivo-perda-dialog.tsx` — de opcional/"Pular" para obrigatório (D-04, Pitfall 1 do `11-RESEARCH.md`)

O drag para a coluna "Perdido" já move o card de forma otimista **antes** deste modal abrir (comportamento existente, inalterado). Como o campo passa a ser obrigatório, o fluxo "Pular" deixa de existir:

- **Remove:** botão "Pular" e a palavra "(opcional)" da descrição.
- **Adiciona:** botão "Cancelar" (`variant="outline"`) — decisão desta fase para não deixar o admin "preso" num modal obrigatório: cancelar **reverte o drag** (o card volta à coluna/etapa anterior à tentativa de mover para "Perdido", sem chamar `updateLeadStage`), em vez de forçar a escolha de um motivo para uma transição que o admin não queria mais fazer.
- **Campo:** `Textarea` livre é substituído por `<MotivoPerdaCombobox>` (mesmo componente da seção acima).
- **Botão "Salvar motivo":** `disabled` até `motivoPerdaId` ter um valor válido (não é mais possível submeter vazio); ao confirmar, resolve a fila de drags pendentes (`resolveMotivoPerda`) exatamente como hoje, só que o tipo do valor resolvido passa de `string | undefined` para `number` (sempre presente).
- **Modal não é dispensável por clique fora/Esc sem decisão** (nem "Cancelar" nem "Salvar motivo") — mesmo padrão `showCloseButton={false}` + `onOpenChange` interceptado já usado por `DeleteSubnichoDialog`, evitando um drag "órfão" (etapa mudou visualmente mas nunca persistiu nem reverteu).

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
