---
phase: 10
slug: sequ-ncia-de-follow-up-escalonada
status: draft
shadcn_initialized: true
preset: base-nova
created: 2026-08-12
---

# Fase 10 — Contrato de Design de UI

> Contrato visual e de interação para a Sequência de Follow-up Escalonada (SEQ-01/02/03, ORIGEM-03). Gerado por gsd-ui-researcher, verificado por gsd-ui-checker.

**Contexto do projeto:** `components.json` já existe (preset `base-nova` sobre Base UI, confirmado na Fase 1, reaproveitado sem alteração nas Fases 3-9). Esta fase **não introduz nenhuma tela/rota nova** (`10-CONTEXT.md` §Phase Boundary) — estende três superfícies já existentes: (1) a seção nova "Sequência de reabordagem" dentro de `/configuracoes` (D-03), reaproveitando o mesmo padrão de formulário de `configuracoes-form.tsx` (Fase 7) só que com lista dinâmica em vez de campos fixos (D-04); (2) um indicador informativo novo na `followup-dashboard.tsx` e no `pipeline-lead-card.tsx` (D-05), no mesmo espírito visual do indicador "Esfriando"/contador de tentativas de contato já publicado nessas duas telas. `10-CONTEXT.md` §Claude's Discretion deixou o layout exato desse indicador em aberto ("sem referência visual específica trazida pelo usuário") — este contrato resolve isso de forma prescritiva, seguindo o padrão visual já estabelecido no projeto em vez de propor um novo.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn (já inicializado — `components.json` confirmado na raiz do projeto) |
| Preset | `style: base-nova`, `baseColor: neutral`, `cssVariables: true`, `iconLibrary: lucide` (ver `components.json`) |
| Component library | Base UI (`@base-ui/react`) via shadcn CLI estilo `base-nova` — não é Radix |
| Icon library | `lucide-react` — dois ícones novos usados nesta fase, ambos confirmados presentes no pacote instalado (`node_modules/lucide-react/dist/esm/icons/calendar-clock.mjs`, `plus.mjs`): `CalendarClock` (indicador de próxima data sugerida, D-05/D-06) e `Plus` (botão "Adicionar intervalo" da lista dinâmica, D-04). `Trash2` (já em uso desde a Fase 9, `text-[#DC2626]`) é reaproveitado para remover uma linha de intervalo. |
| Font | Geist Sans (`--font-geist-sans`, via `next/font/google`) — inalterado |
| Novas dependências npm | Nenhuma — o formulário de lista dinâmica usa `useState`/array local (mesmo padrão de estado já usado em `csv-column-mapper.tsx`), sem `react-hook-form` `useFieldArray` como dependência nova obrigatória (a escolha exata da mecânica de formulário é decisão técnica do planner, mas nenhuma lib nova é necessária para atendê-la). Nenhum item de registry shadcn novo é necessário. |

---

## Spacing Scale

Escala de 8 pontos já em uso consistente em todo o projeto (confirmado em `configuracoes-form.tsx`, `pipeline-lead-card.tsx`, `followup-dashboard.tsx`):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Gap entre ícone e texto do indicador de data sugerida (`gap-1`, mesmo padrão do indicador "Esfriando" e do contador de tentativas) |
| sm | 8px | `gap-2` entre o campo numérico de dias e o botão remover (`Trash2`) de cada linha de intervalo; `gap-2` entre linhas da lista dinâmica |
| md | 16px | `gap-4` padrão entre blocos do formulário (mesmo de `FieldGroup`); padding interno do card de seção (`p-6`, herdado de `configuracoes-form.tsx`) |
| lg | 24px | Espaço entre a seção "Sequência de reabordagem" e as seções de dias-parado já existentes na mesma página `/configuracoes` (`gap-6` no container da página) |
| xl | 32px | Não usado nesta fase |
| 2xl | 48px | Não usado nesta fase |
| 3xl | 64px | Não usado nesta fase |

Exceções:
- **Alvo de toque icon-only do botão remover linha:** `size="icon-lg"` (`size-9`, 36px) no `Trash2` de cada linha de intervalo — mesmo alvo de toque já usado por `History`/`Pencil`/`Trash2` nas fases anteriores, nenhum tamanho novo introduzido.
- **Ícone do indicador de data sugerida:** `size-3.5` (14px) — mesmo tamanho já usado pelo ícone `Clock` do indicador "Esfriando" e pelo `MessageCircle` do contador de tentativas no card do pipeline (`pipeline-lead-card.tsx:100,108`), porque este indicador é um metadado secundário na mesma linha, não o identificador visual primário da linha (diferente do ícone de tipo na timeline da Fase 9, que usa `size-4`).
- Nenhuma exceção fora da escala de 8 pontos é introduzida nesta fase.

---

## Typography

Reaproveitado integralmente do inventário já em uso (nenhum tamanho/peso novo introduzido nesta fase):

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px | 400 (regular) | 1.5 — texto do nome do lead nos cards/linhas onde o indicador aparece (inalterado) |
| Label | 14px | 400 (regular) | 1.5 — texto do indicador de data sugerida ("Sugestão: dd/MM"), rótulos "Intervalo N (dias)" da lista dinâmica, texto de ajuda (`FieldDescription`) de cada linha |
| Heading | 20px | 600 (semibold) | 1.2 — título da nova seção "Sequência de reabordagem" dentro de `/configuracoes` (mesmo nível hierárquico do `h2` "Tudo em dia!" em `followup-dashboard.tsx`) |
| Display | 28px | 600 (semibold) | 1.2 — não usado nesta fase (nenhuma página nova, `h1` "Configurações" já existente permanece inalterado) |

Nenhum 3º peso é introduzido — a mesma disciplina de 2 pesos (400/600) das fases anteriores é mantida.

---

## Color

60/30/10 já estabelecido em todas as telas existentes, reaproveitado sem alteração:

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#FFFFFF` | Fundo do card da seção "Sequência de reabordagem" em `/configuracoes` (`bg-white`, mesmo container de `configuracoes-form.tsx`); fundo dos cards/linhas do dashboard e do pipeline onde o indicador aparece (inalterado) |
| Secondary (30%) | `#F4F4F5` (zinc-100) / `border-zinc-200` | Borda do card de seção (`border border-zinc-200`, mesmo tom de `configuracoes-form.tsx`); fundo das seções de urgência do dashboard (inalterado) |
| Accent (10%) | `#0D9488` (teal) | Reservado exclusivamente para: (1) botão "Salvar configurações" (reaproveitado, sem mudança), (2) botão "Adicionar intervalo" (`variant="outline"` com ícone `Plus`, texto **não** em teal — só o ícone/borda seguem o padrão de ação secundária, ver nota abaixo), (3) anel de foco (`focus-visible:ring-[#0D9488]`) dos campos e botões novos |
| Destructive | `oklch(0.577 0.245 27.325)` (token CSS `--destructive`, ≈ `#DC2626`) | Somente para o ícone `Trash2` de remover uma linha de intervalo (mesmo `text-[#DC2626]` já usado em `lead-table.tsx`/`lead-timeline-dialog.tsx`) |

**Accent reservado para** (nenhuma adição semântica nova além do já estabelecido nas fases anteriores):
- Botão "Salvar configurações" (inalterado)
- Botão "Novo lead" / "Salvar template" / "Salvar motivo" / "Abrir WhatsApp" (inalterado)
- Anel de foco (`focus-visible`)
- Indicador do item ativo na sidebar

**Nunca usar teal no indicador de data sugerida (D-06, crítico):** o ícone `CalendarClock` e o texto "Sugestão: dd/MM" usam `text-muted-foreground` (neutro), **nunca** a cor de accent — é o mesmo raciocínio já aplicado ao ícone `History`/contador `MessageCircle` de tentativas (ícones/textos informativos e não-interativos não competem com o accent reservado às ações primárias). Isto é especialmente importante aqui porque o indicador é **puramente informativo e nunca substitui `followUpDate`** (D-06) — dar destaque de accent a ele sugeriria erroneamente que é um dado editável/acionável. Também não usa a cor de aviso âmbar (`#F59E0B`/`#B45309`) do indicador "Esfriando" — a sugestão de próxima data não é um alerta de atraso, é uma sugestão neutra, e misturar as duas semânticas confundiria o admin sobre qual delas exige ação.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Título da nova seção em `/configuracoes` | "Sequência de reabordagem" |
| Texto de ajuda da seção (abaixo do título) | "Intervalos crescentes, em dias, para sugerir quando reabordar um lead frio (Outbound). Leads Inbound nunca recebem esta sugestão." |
| Rótulo de cada linha da lista dinâmica | "Intervalo {N} (dias)" — numeração sequencial pela ordem da lista (1, 2, 3...), mesmo padrão de rótulo direto já usado em `configuracoes-form.tsx` (`Novo`/`Contatado`/`Negociação`) |
| Texto de ajuda de cada linha | "Dias após a última interação de WhatsApp para sugerir esta reabordagem." (mesmo tom de `FieldDescription` já usado nos 3 campos fixos de `configuracoes-form.tsx`) |
| Botão adicionar linha | "Adicionar intervalo" (ícone `Plus` + texto, `variant="outline"`) |
| Ação remover linha | Ícone `Trash2` isolado, `aria-label="Remover intervalo {N}"`, `title="Remover intervalo"` — sem confirmação (ver Layout, não é uma exclusão persistida até o Salvar) |
| Erro de validação — lista vazia | "Adicione ao menos um intervalo." (mesmo padrão de "Mínimo de 1 dia." de `configuracoes-form.tsx`) |
| Erro de validação — valor inválido por linha | "Mínimo de 1 dia." (reaproveitado literalmente do padrão já existente em `configuracoes-form.tsx`) |
| Primary CTA (form) | "Salvar configurações" (reaproveitado sem alteração — mesma ação já existente, agora também persiste a sequência) |
| Toast de sucesso | "Configurações salvas." (reaproveitado sem alteração) |
| Toast de erro | "Não foi possível salvar as configurações. Tente novamente." (reaproveitado sem alteração) |
| Indicador — texto no dashboard e no card do pipeline | "Sugestão: {dd/MM}" (ícone `CalendarClock` + texto, formato curto de data sem ano — mesmo formato compacto de "Esfriando", que também omite ano) |
| Indicador — `aria-label` | "Próxima reabordagem sugerida em {dd/MM/yyyy}" (ano completo só no atributo de acessibilidade, mesmo padrão do `aria-label` completo do contador "{n} tentativas de contato" versus o texto visível curto "{n}x") |
| Indicador — `title` (tooltip nativo) | "Sugestão calculada a partir da última interação registrada. Não altera a data de follow-up real — o campo Follow-up continua sendo a fonte oficial." (reforça D-06 no próprio ponto de uso, mesmo padrão de `title` explicativo já usado no botão "Abrir WhatsApp") |
| Ausência do indicador (fim da sequência, D-10) | Nenhuma cópia — indicador simplesmente não é renderizado (mesmo padrão de "seção vazia é omitida" já usado no dashboard, D-02 da Fase 4) |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|--------------|
| shadcn official | `field`, `label`, `input`, `button` (todos já instalados em `src/components/ui/`; nenhuma instalação nova necessária) | não obrigatório — nenhum componente novo entra no repositório nesta fase |
| third-party | nenhum | não aplicável — nenhum registry de terceiros foi declarado nesta fase |

Nenhum bloco novo do registry shadcn é necessário. Nenhuma dependência npm nova é adicionada nesta fase, portanto o gate de segurança de registry de terceiros não se aplica.

---

## Layout (contrato específico desta fase)

Não há uma seção dedicada no template para isto, mas o layout abaixo é vinculante (equivalente a "Visuals" no checker):

### Seção "Sequência de reabordagem" em `/configuracoes` (D-03/D-04)

- **Posição:** novo card, mesmo componente visual (`rounded-lg border border-zinc-200 bg-white p-6`) já usado pelo card de dias-parado em `configuracoes-form.tsx`, empilhado abaixo dele na mesma página (`flex flex-col gap-6`) — não um novo card lado a lado, não uma aba nova.
- **Cabeçalho da seção:** título "Sequência de reabordagem" (`text-[20px] font-semibold leading-tight`) + texto de ajuda abaixo (`text-[14px] text-muted-foreground`).
- **Lista dinâmica:** cada linha é `flex items-center gap-2`, contendo: rótulo "Intervalo {N}" (`FieldLabel`) + `Input type="number" min={1} step={1} inputMode="numeric"` (mesmo padrão dos 3 campos fixos já existentes) + botão `Trash2` icon-only à direita (`variant="ghost" size="icon-lg"`). `FieldDescription`/`FieldError` abaixo do input, mesmo padrão de `configuracoes-form.tsx`.
- **Renumeração:** ao remover uma linha do meio, as linhas restantes renumeram automaticamente (1, 2, 3...) — o rótulo "Intervalo {N}" reflete sempre a posição atual na lista, nunca um índice fixo/gap (ex.: remover "Intervalo 2" de [1,2,3] resulta em [1,2], não [1,3]).
- **Botão "Adicionar intervalo":** abaixo da última linha, alinhado à esquerda (`variant="outline"`, ícone `Plus` + texto) — adiciona uma nova linha vazia ao final da lista, foco move para o novo input.
- **Sem confirmação ao remover linha:** diferente da exclusão de nota manual da Fase 9 (que é uma escrita imediata no servidor), remover uma linha aqui é edição de estado local do formulário — só persiste ao clicar "Salvar configurações". Por isso não usa `AlertDialog`/modal de confirmação, mesma disciplina de "edição de formulário não confirma cada campo individualmente" já aplicada aos 3 campos fixos existentes.
- **Estado vazio (todas as linhas removidas):** a lista mostra uma linha de texto simples "Nenhum intervalo configurado." (`text-[14px] text-muted-foreground`) no lugar das linhas, com o botão "Adicionar intervalo" ainda visível abaixo — impede submissão com lista vazia via validação (`FieldError`), não via desabilitar o botão Salvar.
- **CTA "Salvar configurações":** reaproveitado sem duplicar — um único botão no rodapé da página salva tanto os 3 campos de dias-parado quanto a sequência de reabordagem juntos (não dois botões de salvar separados), a menos que o planner decida por Server Actions separadas por razão técnica; neste caso, a cópia do botão da nova seção deve ser "Salvar sequência" para diferenciar, mantendo o mesmo estilo visual (`bg-[#0D9488] text-white hover:bg-[#0D9488]/90`).

### Indicador de próxima data sugerida (D-05/D-06)

- **Onde aparece:** (1) `followup-dashboard.tsx`, na mesma linha de metadados que já mostra sub-nicho + `followUpDate` de cada lead na lista (`div.flex.items-center.gap-2.text-[14px]`, linha 173); (2) `pipeline-lead-card.tsx`, na mesma linha que já mostra `followUpDate` + "Esfriando" + contador de tentativas (linha 96-112) — **acrescentado** a essa linha existente, não uma linha nova.
- **Composição:** `<CalendarClock className="size-3.5" />` + `Sugestão: {dd/MM}`, `text-muted-foreground`, mesmo padrão visual (ícone + texto curto) do par `Clock`/"Esfriando" e `MessageCircle`/"{n}x" já publicados na mesma linha.
- **Ordem dentro da linha (pipeline card):** `followUpDate` → "Esfriando" (se aplicável) → contador de tentativas (se `contactAttempts > 0`) → indicador de sugestão (se aplicável, sempre por último) — mantém a ordem de leitura já estabelecida (data real primeiro, sinais derivados depois), sem reordenar os elementos existentes.
- **Ordem dentro da linha (dashboard):** acrescentado após o `followUpDate` já exibido, mesma lógica de "sempre por último" entre os elementos daquela linha.
- **Condição de exibição (gate completo, todas obrigatórias):**
  1. `lead.origemTipo === "outbound"` (ORIGEM-03 — Inbound nunca mostra, sem exceção)
  2. Lead tem posição válida na sequência (`sequenciaPosicao` dentro dos limites configurados, D-10 — após esgotar todos os degraus, nenhum indicador aparece, sem placeholder "sequência esgotada")
  3. Existe pelo menos uma interação de WhatsApp registrada na timeline do lead para servir de base ao cálculo (D-09) — sem interação-base, nenhum indicador aparece (não usa `createdAt` do lead como fallback)
- **Nunca mostrado para leads fechados/perdidos** — mesmo escopo já usado pelo indicador "Esfriando" (`getActiveDashboardLeads()`/exclusão por `notInArray`, ver `STATE.md` decisão da Fase 4), a sugestão de reabordagem não faz sentido fora do funil ativo.
- **Cálculo sempre no servidor** (Server Component), nunca no client — mesmo padrão já estabelecido para "Esfriando" em `pipeline/page.tsx`, evita duplicar a lógica de data em dois lugares (dashboard e pipeline consomem o mesmo helper server-side).

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
