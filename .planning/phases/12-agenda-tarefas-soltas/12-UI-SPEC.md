---
phase: 12
slug: agenda-tarefas-soltas
status: approved
shadcn_initialized: true
preset: base-nova
created: 2026-08-29
reviewed_at: 2026-08-29
---

# Fase 12 — Contrato de Design de UI

> Contrato visual e de interação para a Agenda / Tarefas Soltas (TAREFA-01, TAREFA-02). Gerado por gsd-ui-researcher, verificado por gsd-ui-checker.

**Contexto do projeto:** `components.json` já existe (preset `base-nova` sobre Base UI, confirmado na Fase 1, reaproveitado sem alteração nas Fases 3-11). Esta fase **não cria rota nova** — estende a tela `/` (dashboard de follow-ups, `src/components/followup-dashboard.tsx` + `src/app/page.tsx`), introduz **um form dialog novo** (`TarefaFormDialog`, molde de `lead-form-dialog.tsx`), **um dialog de confirmação novo** (`DeleteTarefaDialog`, molde de `delete-motivo-perda-dialog.tsx`) e **um card de item novo** (card de tarefa enxuto, intercalado com os cards de lead dentro de cada seção de urgência). `12-CONTEXT.md` travou D-01 a D-08; as áreas de "Claude's Discretion" (ícone lucide exato, mecânica do controle rápido de "concluir", layout preciso do card, cópia dos estados, toast de conclusão) foram resolvidas aqui de forma prescritiva, reaproveitando padrões já validados no projeto em vez de propor um novo. **Nenhuma dependência npm nova**, **nenhum bloco novo do registry shadcn** — todos os primitivos usados (`Dialog`, `Button`, `Field`/`Label`, `Input`, `Calendar`, `Textarea`, `sonner`) já estão em `src/components/ui/`.

**Decisão explícita — o controle rápido de "concluir" NÃO é um `<Checkbox>`:** não existe primitivo `checkbox` em `src/components/ui/` e `npx shadcn add checkbox` já falhou neste host por memória em fases anteriores (precedente: `popover.tsx` foi escrito à mão). D-07 pede "um checkbox 'concluir' direto no card ... mesmo padrão do botão de WhatsApp no card de lead" — o **padrão** citado (`WhatsAppSendButton`) é um `Button variant="ghost" size="icon-lg"` com `stopPropagation` no wrapper, não um checkbox. Este contrato materializa D-07 como um **botão-ícone ghost de 36px** (ver Layout §Controle rápido de concluir), preservando a intenção de D-07 (ação rápida no card, sem abrir o dialog) sem introduzir um primitivo novo.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn (já inicializado — `components.json` confirmado na raiz, `registries: {}`) |
| Preset | `style: base-nova`, `baseColor: neutral`, `cssVariables: true`, `iconLibrary: lucide` (ver `components.json`) — inalterado |
| Component library | Base UI (`@base-ui-components/react`) via shadcn CLI estilo `base-nova` — não é Radix |
| Icon library | `lucide-react` — três ícones novos nesta fase, **todos confirmados presentes** no pacote instalado: `ListTodo` (`node_modules/lucide-react/dist/esm/icons/list-todo.mjs`) — ícone de identidade da tarefa, à esquerda do card (D-03); `Circle` (`circle.mjs`) — estado de repouso do botão-ícone "concluir"; `CircleCheck` (`circle-check.mjs`) — estado hover/focus/ativo do mesmo botão. `Trash2`/`Calendar` (já em uso desde as Fases 1/4) reaproveitados sem alteração pelo `TarefaFormDialog`/`DeleteTarefaDialog`. Nenhum ícone de badge ou de cor chamativa é adicionado ao card (D-03). |
| Font | Geist Sans (`--font-geist-sans`) — inalterado |
| Novas dependências npm | Nenhuma — `sonner` (toast de conclusão com ação "Desfazer") já instalado e em uso desde a Fase 4. |

---

## Spacing Scale

Escala de 8 pontos já em uso consistente em todo o projeto (confirmada em `followup-dashboard.tsx`, `pipeline-lead-card.tsx`, `lead-form-dialog.tsx`). Nenhum valor novo introduzido:

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | `gap-1` entre a descrição (linha 1) e a data (linha 2) dentro do card de tarefa (idêntico ao stack nome/sub-nicho do card de lead) |
| sm | 8px | `gap-2` entre o botão "Novo lead" e o botão "Nova tarefa" no cabeçalho do dashboard; `gap-2` entre a data e qualquer outro elemento da linha 2; `gap-2` do cluster de CTAs no estado vazio; `gap-2` entre `ListTodo` e o bloco de texto do card |
| md | 16px | `p-4` — padding interno de cada card de tarefa (idêntico ao card de lead do dashboard, `followup-dashboard.tsx` linha 179); `gap-4` entre o bloco de texto e o botão "concluir" (`items-center justify-between gap-4`) |
| lg | 24px | `gap-6` entre `h1` "Follow-ups" e o corpo do dashboard, e entre as seções de urgência (inalterado); `flex flex-col gap-6` do `TarefaFormDialog` (mesmo do `lead-form-dialog.tsx`) |
| xl | 32px | Não usado nesta fase |
| 2xl | 48px | Não usado nesta fase |
| 3xl | 64px | `py-16` do container do estado vazio "Tudo em dia!" (inalterado) |

Exceções:
- **Alvo de toque do botão-ícone "concluir" no card e do botão "Excluir" (ícone) no dialog:** `size="icon-lg"` (36px) — mesmo alvo de toque já usado por `WhatsAppSendButton` e pelos ícones de `subnicho-manager.tsx`. Nenhum tamanho novo introduzido.
- Nenhuma outra exceção fora da escala de 8 pontos.

---

## Typography

Reaproveitada integralmente do inventário já em uso (mesmos 4 papéis, mesmos 2 pesos — nada novo):

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px | 400 (regular) | 1.5 — **descrição da tarefa** no card (`text-[16px] leading-normal font-normal text-foreground`, `min-w-0 truncate` + `title` no hover, idêntico ao nome do lead em `pipeline-lead-card.tsx` linha 69); descrição no `Input` do `TarefaFormDialog` |
| Label | 14px | 400 (regular) | 1.5 — **data da tarefa** no card (`text-[14px] leading-normal`, cor herdada da seção de urgência via `section.dateClassName`, idêntico à data de follow-up do lead); contagem por seção ("· N"); rótulos e `FieldDescription` do `TarefaFormDialog`; corpo do `DeleteTarefaDialog`; texto de erro de validação |
| Heading | 20px | 600 (semibold) | 1.2 — cabeçalho de cada seção de urgência ("Vencidos" / "Hoje" / "Próximos 7 dias", inalterado); `DialogTitle` do `TarefaFormDialog` ("Nova tarefa" / "Editar tarefa") e do `DeleteTarefaDialog` ("Excluir tarefa") |
| Display | 28px | 600 (semibold) | 1.2 — `h1` "Follow-ups" (`text-[28px] font-semibold leading-tight`, inalterado) |

Nenhum 3º peso, nenhum tamanho intermediário (12px, 700). A disciplina de 2 pesos (400/600) das fases anteriores é mantida.

**Foco visual:** o card de tarefa é deliberadamente **menos proeminente** que o card de lead — sem badge de etapa, sem botão de WhatsApp, sem indicador de sugestão. A hierarquia dentro de cada seção de urgência é dada pela **data** (D-04, intercalado e ordenado por data), não pelo tipo do item. A descrição em Body (16px) é o único elemento de destaque do card; a data em Label (14px) é secundária, como no card de lead.

---

## Color

60/30/10 já estabelecido em todas as telas, reaproveitado **sem nenhuma cor nova**. O card de tarefa é intencionalmente **calmo** (D-03): mesmo `bg-white`, mesma `border border-zinc-200`, mesmo `p-4` do card de lead — a distinção vem da **subtração** (ausência de sub-nicho/badge/WhatsApp) + do ícone `ListTodo`, nunca de cor chamativa ou badge colorido.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#FFFFFF` | Fundo de cada card de tarefa (`bg-white`, idêntico ao card de lead); fundo do `TarefaFormDialog` e do `DeleteTarefaDialog` |
| Secondary (30%) | `#F4F4F5` (zinc-100) / `border-zinc-200` | Borda do card de tarefa (`border border-zinc-200`); container `bg-[#F4F4F5]` de cada seção de urgência (inalterado); `ListTodo` e `Circle` (estado de repouso do botão "concluir") em `text-muted-foreground` (`oklch(0.556 0 0)` ≈ `#8A8A8A`) — cinza calmo, nunca teal |
| Accent (10%) | `#0D9488` (teal) | Ver lista explícita abaixo — nunca fora dela |
| Destructive | token CSS `--destructive` (`oklch(0.577 0.245 27.325)` ≈ `#DC2626`) | Botão "Excluir" no rodapé do `TarefaFormDialog` (`variant="destructive"`); botão "Excluir" do `DeleteTarefaDialog` (`variant="destructive"`, idêntico a `DeleteMotivoPerdaDialog`); toasts de erro |

**Cor da data no card de tarefa (D-04, importante):** a data reaproveita **exatamente** a mesma cor da seção de urgência já declarada na Fase 4 (`04-UI-SPEC.md`) — `#B91C1C` (Vencidos), `#B45309` (Hoje), `text-muted-foreground` (Próximos 7 dias) — via `section.dateClassName`. Uma tarefa vencida e um follow-up de lead vencido têm a data na **mesma cor**: a urgência é do dia, não do tipo do item (D-04). Nenhuma paleta "de tarefa" é criada.

**Accent reservado para** (estende a lista já existente das Fases 1-11 com exatamente 2 adições desta fase, nada além):
- Botão **"Salvar"** no rodapé do `TarefaFormDialog` (`bg-[#0D9488] text-white hover:bg-[#0D9488]/90`) — mesma cor de toda ação primária de formulário no projeto (`lead-form-dialog.tsx`, `motivo-perda-dialog.tsx`).
- Estado **hover / focus-visible / ativo** do botão-ícone "concluir" no card: o ícone troca de `Circle` (`text-muted-foreground`) para `CircleCheck` em `#0D9488`. É a única superfície nova onde o accent aparece no corpo de um card — justificada porque é uma **ação**, não um dado (mesmo raciocínio do `04-UI-SPEC.md` para o botão inline de WhatsApp).
- Anel de foco (`focus-visible:ring-2 focus-visible:ring-[#0D9488]`) do card de tarefa clicável e dos campos do `TarefaFormDialog` — mesmo mecanismo já usado pelo card de lead e por todos os forms.

**NÃO usar accent em:** o botão **"Nova tarefa"** (é `variant="outline"` por D-05 — borda + `text-foreground`, secundário ao "Novo lead" teal); o ícone `ListTodo`; o estado de repouso do botão "concluir"; a descrição ou a data do card. O botão "Concluir" no rodapé do dialog de edição é `variant="outline"` (ver Layout), não teal.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA desta fase (cabeçalho do dashboard, D-05) | **"Nova tarefa"** — botão `variant="outline"`, sem ícone (paridade com "Novo lead", que também não tem ícone), imediatamente à direita de "Novo lead" |
| CTA primário global (inalterado) | "Novo lead" (`bg-[#0D9488]`, permanece o primeiro botão da linha) |
| `h1` do dashboard (inalterado) | "Follow-ups" |
| Cabeçalho de seção de urgência (inalterado, D-04) | "Vencidos · {N}" / "Hoje · {N}" / "Próximos 7 dias · {N}" — **{N} passa a contar tarefas + follow-ups de lead juntos** |
| Estado vazio — heading (inalterado) | "Tudo em dia!" |
| Estado vazio — body (atualizado: agora tarefas também contam) | "Nenhum follow-up ou tarefa pendente." (era "Nenhum follow-up pendente.") |
| Estado vazio — cluster de CTAs (D-05) | "Ver todos os leads" (`variant="outline"`, `Link` para `/leads`) · "Nova tarefa" (`variant="outline"`) · "Novo lead" (`bg-[#0D9488]`) — nesta ordem, primário por último (mesmo padrão do estado vazio atual) |
| `TarefaFormDialog` — título (criar) | "Nova tarefa" |
| `TarefaFormDialog` — título (editar) | "Editar tarefa" |
| Campo descrição — rótulo | "Descrição" |
| Campo descrição — placeholder | "Ex: Ligar pro cowork sobre o CSV de agosto" |
| Campo descrição — `FieldDescription` | "O que precisa ser feito. Serve de título da tarefa." |
| Campo descrição — erro de validação (`.min(1)`) | "Descreva a tarefa." |
| Campo data — rótulo | "Data" |
| Campo data — `FieldDescription` | "Dia em que essa tarefa precisa acontecer." |
| Campo data — erro de validação | "Escolha uma data." |
| `TarefaFormDialog` — rodapé (criar) | "Cancelar" (`variant="outline"`) · "Salvar" (`bg-[#0D9488]`, mostra "Salvando..." + `disabled` enquanto `pending`) |
| `TarefaFormDialog` — rodapé (editar) | "Excluir" (`variant="destructive"`, à esquerda, separado dos demais — abre o `DeleteTarefaDialog`) · "Cancelar" (`variant="outline"`) · "Concluir" (`variant="outline"`, ícone `CircleCheck` à esquerda do texto) · "Salvar" (`bg-[#0D9488]`) |
| Toast — criar tarefa | "Tarefa criada." |
| Toast — editar tarefa | "Tarefa salva." |
| Toast — concluir tarefa (D-01/D-02, com ação de desfazer) | `toast.success("Tarefa concluída.", { action: { label: "Desfazer", onClick: … } })` — "Desfazer" chama `concluirTarefa(id, { desfazer: true })` (seta `concluidaEm = NULL`), a tarefa reaparece no dashboard. Cobre a consequência aceita em D-02 ("marcar errado = recriar") sem uma tela de Concluídas. |
| Toast — desfazer conclusão | "Tarefa reaberta." |
| Toast — excluir tarefa | "Tarefa excluída." |
| Toast — erro (qualquer mutação) | "Não foi possível salvar a tarefa. Tente novamente." / "Não foi possível concluir a tarefa. Tente novamente." / "Não foi possível excluir a tarefa. Tente novamente." — tom direto, nunca stack trace (mesmo padrão de `lead-form-dialog.tsx`) |
| Botão-ícone "concluir" no card — `aria-label` | "Concluir tarefa: {descrição}" |
| Botão-ícone "concluir" no card — `title` (tooltip nativo) | "Concluir tarefa" |
| `DeleteTarefaDialog` — título | "Excluir tarefa" |
| `DeleteTarefaDialog` — corpo (D-08, hard-delete) | "Tem certeza que deseja excluir a tarefa \"{descrição}\"? Essa ação não pode ser desfeita." |
| `DeleteTarefaDialog` — botões (D-08) | "Cancelar" (`variant="outline"`) · "Excluir" (`variant="destructive"`) — texto e estrutura idênticos a `DeleteMotivoPerdaDialog`, só troca o substantivo |

Todo o restante da cópia do dashboard e dos cards de lead permanece **inalterado** — ver `04-UI-SPEC.md` / `10-UI-SPEC.md`.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | `dialog`, `button`, `field`, `label`, `input`, `calendar`, `textarea`, `sonner` — **todos já instalados** em `src/components/ui/`; nenhuma instalação nova | não obrigatório — nenhum componente novo do registry entra no repositório nesta fase |
| third-party | nenhum | não aplicável — `components.json` tem `registries: {}`; nenhum registry de terceiros declarado |

**Bloco `checkbox` NÃO é adicionado** (decisão explícita, ver cabeçalho): o controle rápido de "concluir" é um `Button variant="ghost" size="icon-lg"`, não um `<Checkbox>`. Nenhuma dependência npm nova é adicionada nesta fase — o gate de segurança de registry de terceiros não se aplica.

---

## Layout (contrato específico desta fase)

Vinculante (equivalente a "Visuals" no checker). Não há seção dedicada no template.

### Cabeçalho do dashboard (`followup-dashboard.tsx`, `<div className="flex items-center justify-between">` da linha 111)

- O `<div>` que hoje contém só o botão "Novo lead" passa a conter um cluster `flex items-center gap-2`:
  1. **"Novo lead"** — `<Button className="bg-[#0D9488] text-white hover:bg-[#0D9488]/90">`, `onClick` abre `LeadFormDialog` em modo criação (inalterado).
  2. **"Nova tarefa"** — `<Button variant="outline">`, `onClick` abre `TarefaFormDialog` em modo criação (novo estado local, ver abaixo).
- `justify-between` pode ser trocado por um wrapper simples já que só há um cluster à esquerda — decisão do executor, contanto que "Novo lead" fique antes de "Nova tarefa".

### Estado vazio "Tudo em dia!" (D-05)

- O bloco `<div className="flex items-center gap-2">` de CTAs (linha 126) passa a ter 3 botões, nesta ordem: `Link` "Ver todos os leads" (`buttonVariants({ variant: "outline" })`) · `<Button variant="outline">` "Nova tarefa" · `<Button className="bg-[#0D9488] …">` "Novo lead".
- O body do estado vazio muda para "Nenhum follow-up ou tarefa pendente." (ver Copywriting).
- O estado vazio só aparece quando **não há nenhum item** (leads + tarefas) nas 3 seções — `totalCount` passa a somar tarefas pendentes.

### Card de tarefa (D-03 — enxuto, intercalado)

- **Container:** idêntico ao card de lead do dashboard —
  `className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"`,
  `role="button"`, `tabIndex={0}`, `onClick` → abre `TarefaFormDialog` em modo edição, `onKeyDown` Enter/Space → mesmo `onClick` (mesmo idioma da linha 168-179 de `followup-dashboard.tsx`).
- **Cluster esquerdo:** `flex items-center gap-2 min-w-0` contendo:
  - `<ListTodo className="size-4 shrink-0 text-muted-foreground" aria-hidden />` — o ícone de identidade da tarefa (D-03). É o **único** marcador que distingue o card de tarefa do card de lead à primeira vista (cards de lead no dashboard **não têm** ícone à esquerda).
  - `<div className="flex flex-col gap-1 min-w-0">`:
    - Descrição: `<span className="min-w-0 truncate text-[16px] leading-normal font-normal text-foreground" title={descricao}>{descricao}</span>` (Body).
    - Data: `<span className={cn("text-[14px] leading-normal", section.dateClassName)}>{format(tarefa.data, "dd/MM/yyyy")}</span>` (Label, cor da urgência da seção). **Só a data** — sem sub-nicho, sem badge de etapa, sem "Sugestão: dd/MM" (D-03).
- **Cluster direito:** `<div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>` envolvendo **só** o botão-ícone "concluir" (ver abaixo). Nenhum `WhatsAppSendButton`, nenhum `EtapaBadge` (D-03).
- **Nada de borda de 2px, cor de fundo diferente, ou badge "Tarefa".** O dashboard permanece calmo (D-03 / `12-CONTEXT.md` §Specific Ideas).

### Controle rápido de "concluir" no card (D-07 — materializa "checkbox" como botão-ícone)

- `<Button type="button" variant="ghost" size="icon-lg" aria-label={"Concluir tarefa: " + descricao} title="Concluir tarefa" onClick={handleConcluir}>` dentro do wrapper com `stopPropagation` (para não abrir o `TarefaFormDialog` — mesmo idioma do wrapper do `WhatsAppSendButton`, `followup-dashboard.tsx` linha 207).
- **Ícone — estado de repouso:** `<Circle className="text-muted-foreground" />` (contorno cinza calmo).
- **Ícone — estado hover / focus-visible:** `<CircleCheck className="text-[#0D9488]" />`. Implementação à escolha do executor (dois ícones empilhados com `group`/`group-hover:` + `group-focus-visible:`, ou estado `useState` de hover) — **o contrato é:** repouso = `Circle` em `text-muted-foreground`; hover/foco = `CircleCheck` em `#0D9488`.
- **Ao clicar:** chama `concluirTarefa(id)` (fire-and-forget dentro de `startTransition`, mesmo idioma de `registerWhatsAppContact` no anchor de WhatsApp), a tarefa some do dashboard na hora (D-02, `revalidatePath("/")`), e dispara o toast "Tarefa concluída." com ação **"Desfazer"** (ver Copywriting). **Sem** dialog de confirmação (conclusão é reversível pelo toast; só a exclusão confirma — D-08).

### Intercalação por data (D-04)

- `FollowupDashboard` recebe, por seção de urgência, uma lista **unificada** de itens `{ kind: "lead" | "tarefa"; date: Date; … }` já **ordenada por data ascendente** (mais urgente primeiro). O `sections[]` array (`followup-dashboard.tsx` linha 80) troca `leads: Lead[]` por `items: DashboardItem[]`; o `.map` da linha 165 faz um `switch (item.kind)` renderizando o card de lead existente ou o card de tarefa novo.
- `src/app/page.tsx`: adiciona ao `Promise.all` uma query `db.select().from(tarefas).where(isNull(tarefas.concluidaEm))`, bucketiza as tarefas pela **mesma régua** de `groupLeadsByUrgency` (Vencidos = `isBefore(data, today)`, Hoje = `isToday(data)`, Próximos 7 dias = `isBefore(data, addDays(today, 8))`), funde com os leads de cada bucket e ordena por data. Se `groupLeadsByUrgency` vira genérica (`groupByUrgency<T extends { date: Date }>`) ou ganha uma função-irmã é decisão do planner/executor (`12-CONTEXT.md` §Claude's Discretion) — contanto que continue pura, com `now` injetável e testada.
- Seção de urgência **sem nenhum item** (lead ou tarefa) continua **omitida** por completo (sem cabeçalho, sem corpo) — comportamento existente, inalterado.

### `TarefaFormDialog` (molde: `lead-form-dialog.tsx`)

- `Dialog` + `DialogContent className="max-w-lg"` + `DialogHeader`/`DialogTitle`.
- `react-hook-form` + `zodResolver(tarefaSchema)` (`tarefaSchema` em `src/lib/validations.ts`: `descricao: z.string().min(1, "Descreva a tarefa.")`, `data: z.coerce.date({ … "Escolha uma data." })` — espelha `motivoPerdaSchema`/`subnichoSchema`).
- `<form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">`. Modo edição: `<input type="hidden" name="id" …>`.
- **Campo Descrição:** `<Field>` + `<FieldLabel htmlFor="descricao">Descrição</FieldLabel>` + `<Input id="descricao" {...form.register("descricao")} />` + `<FieldDescription>` + `<FieldError>`. `Input` de linha única (a descrição "serve de título", D-06) — o `truncate` do card assume linha única.
- **Campo Data:** `<Field>` + `<FieldLabel>Data</FieldLabel>` + `<Controller name="data">` renderizando `<Calendar mode="single" selected={…} onSelect={(d) => field.onChange(d ? startOfDay(d) : undefined)} />` + `<input type="hidden" name="data" value={selected ? selected.toISOString() : ""} readOnly />` — **idêntico** ao campo `followUpDate` de `lead-form-dialog.tsx` (linhas 427-457), incluindo a normalização `startOfDay` (Pitfall de fuso) e o default `startOfDay(new Date())` no modo criação.
- **Sem** seção com `bg-[#F4F4F5] p-6` (o form de lead agrupa 3 seções; a tarefa tem 2 campos, não precisa de agrupamento visual) — os 2 `<Field>` ficam soltos no `flex flex-col gap-6`.
- **`DialogFooter`** (mesma classe do `lead-form-dialog.tsx` linha 460):
  - Modo criar: "Cancelar" (`variant="outline"`, fecha) · "Salvar" (`type="submit"`, `bg-[#0D9488]`, "Salvando..." quando `pending`).
  - Modo editar: "Excluir" (`variant="destructive"`, `type="button"`, abre `DeleteTarefaDialog` — posicionado à esquerda, separado do grupo à direita, mesmo lugar do "Ver histórico" no form de lead) · "Cancelar" (`variant="outline"`) · "Concluir" (`variant="outline"`, `type="button"`, ícone `<CircleCheck className="size-4" />` + texto; chama `concluirTarefa(id)`, fecha o dialog, dispara o toast "Tarefa concluída." com "Desfazer") · "Salvar" (`type="submit"`, `bg-[#0D9488]`).
- **Guarda de alterações não salvas:** reaproveita `DiscardChangesDialog` via `form.formState.isDirty` (mesmo idioma de `lead-form-dialog.tsx` `closeWithDiscardGuard`) — se o executor achar excessivo para 2 campos, pode omitir, mas então o `onOpenChange` fecha direto sem confirmar.
- Server Actions (`src/actions/tarefa-actions.ts`, novo): `createTarefa` / `updateTarefa` / `concluirTarefa` / `deleteTarefa`, shape de `ActionState` homogêneo e `revalidatePath("/")` num helper — molde de `motivo-perda-actions.ts` (`12-CONTEXT.md` §Claude's Discretion).

### `DeleteTarefaDialog` (molde: `delete-motivo-perda-dialog.tsx`, D-08)

- `Dialog` + `<DialogContent showCloseButton={false}>` (não-dispensável pelo botão X — mesmo idioma de `DeleteMotivoPerdaDialog`).
- `DialogHeader`/`DialogTitle` "Excluir tarefa" + `DialogDescription` com o corpo de confirmação (ver Copywriting).
- `DialogFooter`: "Cancelar" (`variant="outline"`, `onClick={() => onOpenChange(false)}`) · "Excluir" (`variant="destructive"`, `onClick={onConfirm}` → `deleteTarefa(id)` **hard-delete**, fecha os dois dialogs, toast "Tarefa excluída.").
- `tarefas` é a **exceção documentada** em `scripts/guard-no-hard-delete.cjs` (D-08) — comentário explícito citando D-08, é a única tabela onde `DELETE FROM` é permitido.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved (gsd-ui-checker, 2026-08-29 — 6/6 dimensões PASS; 3 recomendações não bloqueantes)
