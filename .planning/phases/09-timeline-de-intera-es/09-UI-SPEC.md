---
phase: 9
slug: timeline-de-intera-es
status: draft
shadcn_initialized: true
preset: base-nova
created: 2026-08-08
---

# Fase 9 — Contrato de Design de UI

> Contrato visual e de interação para a Timeline de Interações (TIMELINE-01/02). Gerado por gsd-ui-researcher, verificado por gsd-ui-checker.

**Contexto do projeto:** `components.json` já existe (preset `base-nova` sobre Base UI, confirmado na Fase 1, reaproveitado sem alteração nas Fases 3-8). Esta fase introduz **um componente novo** (`lead-timeline-dialog.tsx`, D-02) e estende três componentes existentes com pontos de entrada (`lead-table.tsx`, `pipeline-lead-card.tsx`, `lead-form-dialog.tsx`, D-03) — mas nenhuma dependência npm nova, nenhum primitivo shadcn novo (todos já instalados: `Dialog`, `Button`, `Textarea`, `Field`/`Label`, `Badge`), e nenhuma cor/fonte fora do sistema já estabelecido (`09-RESEARCH.md` §Standard Stack confirma zero pacotes novos). Todas as decisões de modelo de dados e política de mutabilidade já vieram travadas em `09-CONTEXT.md` (D-01 a D-07); este contrato resolve as áreas deixadas a critério do planner/pesquisador em `09-CONTEXT.md` §Claude's Discretion (layout exato, ícone, cor) de forma prescritiva.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn (já inicializado — `components.json` confirmado na raiz do projeto) |
| Preset | `style: base-nova`, `baseColor: neutral`, `cssVariables: true`, `iconLibrary: lucide` (ver `components.json`) |
| Component library | Base UI (`@base-ui/react`) via shadcn CLI estilo `base-nova` — não é Radix |
| Icon library | `lucide-react` — dois ícones novos usados nesta fase, ambos confirmados presentes no pacote instalado (`node_modules/lucide-react/dist/esm/icons/history.mjs`, `sticky-note.mjs`): `History` (pontos de entrada, D-03) e `StickyNote` (entradas de nota manual na lista, distinto de `Pencil` para não colidir semanticamente com "editar lead"). `MessageCircle` (já em uso desde a Fase 4) é reaproveitado para entradas automáticas de WhatsApp. `Pencil`/`Trash2` (já em uso) são reaproveitados para editar/excluir uma nota manual dentro da timeline. |
| Font | Geist Sans (`--font-geist-sans`, via `next/font/google`) — inalterado |
| Novas dependências npm | Nenhuma — confirmado em `09-RESEARCH.md` ("nenhuma tecnologia nova entra no projeto"). Nenhum item de registry shadcn novo é necessário. |

---

## Spacing Scale

Escala de 8 pontos já em uso consistente em todo o projeto (confirmado em `lead-table.tsx`, `pipeline-lead-card.tsx`, `template-form-dialog.tsx`):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Gap entre ícone de tipo e o rótulo/timestamp de cada entrada da timeline (`gap-1`, mesmo padrão do indicador "Esfriando") |
| sm | 8px | `gap-2` entre timestamp e badge de tipo dentro do cabeçalho de uma entrada; `gap-2` entre botões Pencil/Trash2 de uma nota manual |
| md | 16px | `gap-4` entre o composer de nota nova e a lista de entradas; padding interno do `DialogContent` (herdado do primitivo, `p-4`); `py-4` no separador de cada entrada da timeline (ver Layout — arredondado para este token padrão em vez de um valor fora da escala) |
| lg | 24px | Não usado diretamente nesta fase (reservado, mesma nota das fases anteriores) |
| xl | 32px | Não usado nesta fase |
| 2xl | 48px | `py-12` no bloco de estado vazio da timeline (ver Layout — arredondado para este token padrão) |
| 3xl | 64px | Não usado nesta fase |

Exceções:
- **Alvo de toque icon-only (D-03a):** os ícones `History` adicionados em `lead-table.tsx` e `pipeline-lead-card.tsx` usam `size="icon-lg"` (`size-9`, 36px) — mesmo alvo de toque já usado por `Pencil`/`Trash2` na linha da lista e por `WhatsAppSendButton` no card do pipeline. Nenhum novo tamanho de alvo de toque é introduzido.
- **Ícone de tipo de entrada na timeline:** `size-4` (16px) — um nível acima do `size-3.5` usado pelo indicador "Esfriando"/contador, porque aqui o ícone é o identificador visual primário de cada linha (não um metadado secundário), mesmo raciocínio de tamanho já aplicado a `MessageCircle` no botão nomeado "WhatsApp" da lista (`size-4`, `lead-table.tsx:270`).
- Entradas da timeline separadas por `border-b` (`gap-0` entre elas, borda faz a separação) — mesmo padrão de linha de `lead-table.tsx` (`border-b`, `last:border-b-0`), não `gap-3`/cards soltos.
- Nenhuma exceção fora da escala de 8 pontos é introduzida nesta fase: o separador de linha da timeline usa `py-4` (16px, token md) e o bloco de estado vazio usa `py-12` (48px, token 2xl) — ambos arredondados para o valor padrão mais próximo em vez de reproduzir literalmente `py-3.5`/`py-16` de `lead-table.tsx`, que são específicos daquele componente e não fazem parte da escala declarada deste contrato.

---

## Typography

Reaproveitado integralmente do inventário já em uso (nenhum tamanho/peso novo introduzido nesta fase):

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px | 400 (regular) | 1.5 — texto completo da mensagem de WhatsApp ou da nota manual dentro de cada entrada (D-04/D-05: texto integral, sem truncamento) |
| Label | 14px | 400 (regular) | 1.5 — timestamp (`dd/MM/yyyy 'às' HH:mm`) e badge de tipo de cada entrada; texto do empty state |
| Heading | 20px | 600 (semibold) | 1.2 — reservado, não usado diretamente nesta fase (não há subtítulo de seção dentro do dialog) |
| Display | 28px | 600 (semibold) | 1.2 — não usado nesta fase (não é uma página, é um `Dialog`) |

Nota herdada (mesma observação já registrada em `07-UI-SPEC.md`): `DialogTitle` usa peso 500 (medium) fixo no primitivo (`font-medium`, 16px, `leading-none`) — usado para o título "Histórico de {nome}". Isso não é um 3º peso a declarar; é parte do design system já existente, aplicado sem alteração.

---

## Color

60/30/10 já estabelecido em todas as telas existentes, reaproveitado sem alteração:

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#FFFFFF` | Fundo do `DialogContent` (`bg-popover`, branco no tema claro) |
| Secondary (30%) | `#F4F4F5` (zinc-100) / `border-zinc-200` | Fundo do composer de nota nova (`bg-[#F4F4F5]` opcional, ver Layout); bordas entre entradas da timeline (`border-b border-zinc-200`, mesmo tom de `lead-table.tsx`) |
| Accent (10%) | `#0D9488` (teal) | Reservado exclusivamente para: (1) botão "Salvar nota" do composer (`bg-[#0D9488] hover:bg-[#0D9488]/90`, mesmo padrão de `TemplateFormDialog`), (2) ícone `MessageCircle` das entradas automáticas de WhatsApp na timeline (mesma cor já usada por `WhatsAppSendButton`, sinaliza "isso foi uma ação de WhatsApp"), (3) anel de foco (`focus-visible:ring-[#0D9488]`) dos itens clicáveis/composer |
| Destructive | `oklch(0.577 0.245 27.325)` (token CSS `--destructive`, ≈ `#DC2626`) | Somente para: (1) ícone `Trash2` de excluir nota manual (mesmo `text-[#DC2626]` de `lead-table.tsx:295`), (2) botão "Excluir" do diálogo de confirmação de exclusão de nota (`variant="destructive"`) |

**Accent reservado para** (nenhuma adição à lista já estabelecida nas fases anteriores, além do item 2 acima):
- Botão "Salvar nota" (novo nesta fase)
- Ícone `MessageCircle` das entradas de WhatsApp na timeline (novo nesta fase, reaproveitando a cor já associada a esse ícone em todo o projeto)
- Botão "Novo lead" / "Salvar template" / "Salvar motivo" / "Abrir WhatsApp" (inalterado)
- Botão inline "Enviar WhatsApp" (ícone teal, ghost — inalterado)
- Indicador do item ativo na sidebar
- Anel de foco (`focus-visible`)

**Nunca usar teal em:** texto de corpo, badges de tipo (mantidos neutros, ver Layout), ícone `History` dos pontos de entrada, ícone `StickyNote` de nota manual — esses usam `text-muted-foreground`/`text-foreground` neutro, mesma disciplina de `Pencil`/`Trash2` já usados em `lead-table.tsx` (ícones de ação secundária não competem com o accent reservado às ações primárias).

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Título do dialog | "Histórico de {nome do lead}" |
| Ponto de entrada — ícone na lista/card (D-03a) | `aria-label="Ver histórico de {nome}"`, `title="Ver histórico"` — mesmo padrão de `title` nativo já usado por `WhatsAppSendButton` (D-17 da Fase 4) |
| Ponto de entrada — botão no modal de editar lead (D-03b) | "Ver histórico" (ícone `History` + texto), `variant="outline"`, só visível em modo edição (`isEditMode`) |
| Composer — placeholder do textarea | "Registrar uma nota sobre este lead..." |
| Primary CTA (composer) | "Salvar nota" (estado pendente: "Salvando...", mesmo padrão de `TemplateFormDialog`) |
| Erro de validação — nota vazia | "Nota não pode ficar vazia." (via `FieldError`, mesmo tom de `"Nome é obrigatório."`) |
| Toast de sucesso — criar nota | "Nota registrada." |
| Toast de sucesso — editar nota | "Nota atualizada." |
| Toast de sucesso — excluir nota | "Nota removida da timeline." |
| Toast de erro — falha ao salvar/editar/excluir | "Não foi possível salvar a nota. Tente novamente." (mesmo padrão de `TemplateFormDialog`) |
| Empty state — heading | "Nenhuma interação registrada ainda" |
| Empty state — body | "Cliques em \"Abrir WhatsApp\" e notas manuais aparecem aqui, em ordem cronológica." |
| Badge de tipo — entradas automáticas | "1º contato" / "Follow-up" / "Prova de valor" (mesmos rótulos de `TIPO_OPTIONS` em `template-form-dialog.tsx`, reaproveitados sem alteração) |
| Badge de tipo — nota manual | "Nota manual" |
| Destructive confirmation — título | "Excluir nota" |
| Destructive confirmation — corpo | "Tem certeza que deseja excluir esta nota? Ela deixará de aparecer na timeline." (não promete "pode ser restaurada depois" como `DeleteLeadDialog` — não existe superfície de restauração de notas nesta fase, ver `09-RESEARCH.md` Assumption A3; a cópia não afirma nem nega recuperabilidade, só descreve o efeito visível) |
| Destructive confirmation — botões | "Cancelar" (`variant="outline"`) / "Excluir" (`variant="destructive"`) — mesmo padrão de `DeleteLeadDialog`. Rótulos de uma palavra sem substantivo anexado são intencionais aqui: espelham o par já publicado em `DeleteLeadDialog` (Fase 6), onde o contexto é dado pelo título "Excluir nota" do próprio diálogo — anexar um substantivo ("Excluir nota" no botão) duplicaria essa informação sem ganho de clareza. |
| Ações inline de nota manual | Ícones `Pencil` (`aria-label="Editar nota"`) e `Trash2` (`aria-label="Excluir nota"`) — só renderizados quando `tipo === "nota_manual"` (D-06); entradas automáticas de WhatsApp nunca mostram esses ícones |

---

## Layout (contrato específico desta fase)

Não há uma seção dedicada no template para isto, mas o layout abaixo é vinculante (equivalente a "Visuals" no checker):

- **Superfície:** `<Dialog>` com `<DialogContent className="max-w-lg">` — mesma largura de `TemplateFormDialog`, sem novo primitivo `Sheet`/`Drawer` (nenhum existe no projeto hoje; `09-RESEARCH.md` §Alternatives Considered confirma que introduzir um seria escopo extra não pedido por D-02, que exige apenas "superfície própria", não lateral). A rolagem vertical para uma lista longa (motivo de D-02) já é resolvida pelo `max-h-[calc(100vh-2rem)] overflow-y-auto` global do primitivo `DialogContent` (fix permanente da quick task `260720-x41`) — nenhuma configuração extra de scroll interno é necessária.
- **Cabeçalho:** `DialogHeader` com `DialogTitle` "Histórico de {nome}" — sem `DialogDescription` (não há subtítulo necessário).
- **Âncora visual primária:** o composer (textarea + "Salvar nota"), fixado sempre no topo do dialog, é o ponto focal da tela — é o único elemento com cor de accent (teal) visível ao abrir, e sua visibilidade permanente (não escondido atrás de um botão "Nova nota") sinaliza que registrar uma nota rápida é a ação mais comum desta superfície, antes mesmo de o admin rolar a lista de histórico.
- **Composer (topo, acima da lista):** `Textarea` (placeholder acima) + botão "Salvar nota" alinhado à direita, abaixo do textarea. Fica sempre visível no topo do dialog (não atrás de um botão "Nova nota" — visibilidade permanente reduz cliques para o caso de uso mais comum, registrar uma nota rápida). Após salvar com sucesso, o textarea limpa e a nova entrada aparece no topo da lista (ordenação mais-recente-primeiro, `09-RESEARCH.md` Assumption A2).
- **Lista de entradas (abaixo do composer, ordem cronológica decrescente):** cada entrada é uma linha (`flex flex-col gap-1`, `border-b border-zinc-200 py-4 last:border-b-0` — 16px, token md da escala de 8 pontos deste contrato; ligeiramente mais generoso que o `py-3.5` fora de escala usado em `lead-table.tsx`, deliberadamente arredondado para o token padrão em vez de replicar aquele valor), estruturada assim:
  - Linha de cabeçalho da entrada: ícone de tipo (`MessageCircle` teal para WhatsApp / `StickyNote` neutro para nota manual, `size-4`) + `Badge variant="outline"` neutro (sem cor por tipo — ver Color acima, o identificador visual é o ícone, não uma nova paleta por tipo) + timestamp (`text-[14px] text-muted-foreground`, formato `dd/MM/yyyy 'às' HH:mm` via `date-fns`) +, só para `nota_manual`, os ícones `Pencil`/`Trash2` alinhados à direita (`ml-auto`, `size="icon-sm"`, `variant="ghost"`).
  - Corpo da entrada: texto completo (`text-[16px] leading-normal text-foreground`, `whitespace-pre-wrap` para preservar quebras de linha da mensagem/nota) — nunca truncado (D-05).
  - Entradas automáticas de WhatsApp (`tipo != "nota_manual"`) **nunca** renderizam os ícones de editar/excluir — imutabilidade é reforçada visualmente (ausência do controle), mas a garantia real vive no servidor (`WHERE tipo = 'nota_manual'`, `09-RESEARCH.md` Pattern 2/Pitfall 2) — este contrato de UI não substitui essa guarda.
- **Edição de nota manual:** inline, não um modal aninhado — clicar em `Pencil` substitui o corpo da entrada por um `Textarea` pré-preenchido + botões pequenos "Salvar"/"Cancelar" (`size="sm"`) na própria linha. Evita modal-sobre-modal para uma ação reversível/cancelável sem confirmação.
- **Exclusão de nota manual:** modal de confirmação empilhado sobre o dialog da timeline (mesmo padrão visual de `DeleteLeadDialog`, copy própria acima) — ação destrutiva sempre confirma, mesmo sendo soft-delete, seguindo a disciplina já estabelecida pelo projeto para toda exclusão iniciada por clique único.
- **Estado vazio:** quando não há nenhuma entrada (nem WhatsApp nem nota), a lista é substituída por um bloco centralizado (`flex flex-col items-center gap-2 py-12 text-center` — 48px, token 2xl da escala de 8 pontos deste contrato; mesmo espírito do empty state de `lead-table.tsx`, que usa `py-16` fora de escala — aqui arredondado para o token padrão mais próximo em vez de replicar aquele valor) com heading (`text-[16px] font-semibold`) e body (`text-[14px] text-muted-foreground`) — o composer continua visível acima, o admin pode criar a primeira nota sem sair do dialog.
- **Pontos de entrada (D-03), reaproveitando o padrão já estabelecido de ícone-ação em linha/card:**
  - `lead-table.tsx`: novo `Button variant="ghost" size="icon-lg"` com ícone `History`, adicionado ao grupo de ações existente (`WhatsApp` / `Pencil` / `Trash2`), mesma ordem visual (ação informativa antes das ações de edição/exclusão — sugestão: WhatsApp, Histórico, Editar, Excluir) — `onClick` com `event.stopPropagation()` idêntico aos botões vizinhos (a linha inteira já é clicável para editar).
  - `pipeline-lead-card.tsx`: novo ícone `History` ao lado de `WhatsAppSendButton`, envolvido no mesmo wrapper `onPointerDown`/`onClick` com `stopPropagation()` (Pitfall 5 do `09-RESEARCH.md` — sem isso, vira drag-handle ou dispara a edição do card).
  - `lead-form-dialog.tsx`: botão "Ver histórico" no rodapé, antes de "Cancelar" (recomendação do Open Question #1 do `09-RESEARCH.md`), `variant="outline"`, só em modo edição — mantém as 3 seções existentes do modal (Contato/Negócio/Acompanhamento) intocadas, per D-01.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|--------------|
| shadcn official | `dialog`, `button`, `textarea`, `field`, `label`, `badge`, `sonner` (todos já instalados em `src/components/ui/`; nenhuma instalação nova necessária) | não obrigatório — nenhum componente novo entra no repositório nesta fase |
| third-party | nenhum | não aplicável — nenhum registry de terceiros foi declarado nesta fase |

Nenhum bloco novo do registry shadcn é necessário. Nenhuma dependência npm nova é adicionada nesta fase (confirmado em `09-RESEARCH.md` §Standard Stack — "Nenhum pacote novo — todas as libs já estão em package.json"), portanto o gate de segurança de registry de terceiros não se aplica.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
