---
status: resolved
trigger: "Bug real encontrado durante human-check da Fase 8 (não relacionado a origemTipo): ao criar um lead novo pelo formulário manual (/leads > Novo lead), preenchendo Nome, Telefone, Canal, Origem, Tipo de origem, Valor estimado e Notas e tentando salvar, o campo Follow-up mostra o erro \"Invalid input: expected date, received Date\" e bloqueia o submit. Isso bloqueia toda criação manual de lead pelo formulário. Reproduzido ao vivo no navegador via npm run dev em http://localhost:3000/leads."
created: 2026-08-08T12:28:48Z
updated: 2026-08-08T12:35:00Z
---

## Current Focus
<!-- OVERWRITE on each update - always reflects NOW -->

hypothesis: CONFIRMADA (ver Resolution.root_cause). Fix: pré-preencher followUpDate no modo criação com startOfDay(new Date()) em vez de undefined.
test: node -e reprodução isolada de z.coerce.date() com undefined/"" (ver Evidence) + leitura completa de lead-form-dialog.tsx e calendar.tsx.
expecting: Fix elimina o Invalid Date sem alterar o comportamento de edição (lead?.followUpDate continua tendo prioridade).
next_action: NENHUMA — sessão resolvida e verificada ao vivo pelo usuário no navegador.
reasoning_checkpoint:
  hypothesis: "O Calendar (react-day-picker) usa uma classe visual 'today' (bg-muted, apenas um leve destaque cinza) para marcar o dia atual, DISTINTA da classe 'data-selected-single' (bg-primary, destaque forte) usada quando uma data é de fato selecionada. defaultValues.followUpDate no lead-form-dialog.tsx é `lead?.followUpDate` — undefined no modo criação. O admin vê o destaque sutil de 'hoje' e assume (erroneamente) que já há uma data selecionada, clica Salvar sem tocar no calendário, e o campo RHF followUpDate permanece undefined. O zodResolver roda leadSchema (followUpDate: z.coerce.date()) sobre esse valor undefined ANTES do FormData ser montado, produzindo Invalid Date e bloqueando o submit com a mensagem exata reproduzida."
  confirming_evidence:
    - "node -e reproduziu exatamente a mensagem: `z.coerce.date().parse(undefined)` e `.parse('')` retornam ambos {code: 'invalid_type', expected: 'date', received: 'Invalid Date', message: 'Invalid input: expected date, received Date'} — bate caractere por caractere com o erro relatado pelo usuário."
    - "src/components/lead-form-dialog.tsx linha 120: `followUpDate: lead?.followUpDate` nos defaultValues do useForm — undefined em modo criação (lead é undefined)."
    - "src/components/ui/calendar.tsx: classe `today` (linha 121-124, bg-muted) é visualmente distinta e mais sutil que `data-selected-single` (linha 212, bg-primary/text-primary-foreground) — confirma que o destaque que o usuário viu no dia 8 era apenas o indicador de 'hoje', não uma seleção real."
    - "form.handleSubmit(onSubmit) roda o zodResolver ANTES de onSubmit montar o FormData (lead-form-dialog.tsx linhas 165-171) — confirma que o bloqueio acontece no client, na validação RHF/Zod, antes mesmo do server action ser chamado."
  falsification_test: "Se, ao selecionar explicitamente uma data no calendário antes de Salvar, o erro NÃO aparecesse, a hipótese estaria refutada (indicaria problema mais profundo no schema/serialização, não em defaultValues). CONFIRMADO ao vivo pelo usuário: após o fix, o dia 8 passou a exibir data-selected-single/bg-primary (destaque forte) em vez do destaque sutil de 'hoje', e o submit funcionou sem erro."
  fix_rationale: "Pré-preencher defaultValues.followUpDate com startOfDay(new Date()) no modo criação faz o valor real do form (RHF state) corresponder ao que o usuário vê visualmente (dia de hoje destacado) — resolve a causa raiz (mismatch entre valor undefined e expectativa visual do usuário), não um sintoma. Não é um workaround no schema (que continua exigindo uma data válida, correto) nem uma correção só cosmética no Calendar."
  blind_spots: "Nenhum remanescente — verificação ao vivo no navegador confirmou o mecanismo completo (visual + submit bem-sucedido). Não testado: comportamento ao editar um lead existente sem followUpDate no banco (coluna é NOT NULL no schema Drizzle, então esse caso não deveria ocorrer em dados reais)."
tdd_checkpoint: null

## Symptoms
<!-- Written during gathering, then immutable -->

expected: Ao clicar em 'Salvar' no formulário de Novo lead com todos os campos obrigatórios preenchidos (incluindo uma data de Follow-up selecionada no calendário), o lead deveria ser criado sem erro de validação no campo Follow-up.
actual: O submit é bloqueado e aparece a mensagem em vermelho 'Invalid input: expected date, received Date' logo abaixo do calendário de Follow-up, mesmo com uma data selecionada (dia 8 destacado/selecionado no calendário August 2026).
errors: "Invalid input: expected date, received Date" (erro de validação Zod, renderizado inline abaixo do componente de calendário Follow-up)
reproduction: 1) npm run dev, abrir http://localhost:3000/leads. 2) Clicar 'Novo lead'. 3) Preencher Nome, Telefone, Canal (WhatsApp), Origem, Tipo de origem (Inbound ou Outbound), Sub-nicho, Valor estimado, Notas. 4) NÃO alterar o calendário de Follow-up (dia atual já vem destacado por padrão). 5) Clicar 'Salvar'. 6) Erro aparece sob o Follow-up mesmo com Notas preenchidas (outro erro de 'Notas são obrigatórias' visto numa tentativa anterior sem preencher Notas, mas o erro de Follow-up persistiu em ambas tentativas).
started: Desconhecido — não estava coberto por nenhum SUMMARY.md anterior do projeto; toda a documentação prévia de Fases 1-8 registra 'sem acesso a navegador nesta sessão' como caveat recorrente, então este é o primeiro clique real no formulário de criação de lead documentado no projeto. Pode ser um bug pré-existente desde a Fase 1 (schema de followUpDate) nunca detectado por falta de teste em navegador.

## Eliminated
<!-- APPEND only - prevents re-investigating after /clear -->

## Evidence
<!-- APPEND only - facts discovered during investigation -->

- timestamp: 2026-08-08T12:28:48Z
  checked: Reprodução ao vivo no navegador (Chrome via automação), 2 tentativas de submit do formulário 'Novo lead'
  found: Erro 'Invalid input: expected date, received Date' aparece consistentemente sob o campo Follow-up nas duas tentativas, independente de outros campos (Notas) estarem preenchidos ou não
  implication: O erro é especificamente do campo followUpDate/Zod, não um efeito colateral de outro campo — reproduzível de forma isolada

- timestamp: 2026-08-08T12:35:00Z
  checked: Verificação humana ao vivo no navegador após aplicar o fix — 'Novo lead', campos preenchidos, calendário de Follow-up não tocado, clique em 'Salvar'
  found: Lead salvou com sucesso ("Lead salvo com sucesso."), sem o erro de validação; o dia 8 passou a exibir destaque forte (data-selected-single, bg-primary) em vez do destaque sutil de "hoje" que causava a confusão original. Lead de teste removido (soft-delete) após a verificação.
  implication: Confirma visualmente o mecanismo completo do bug (mismatch entre defaultValue undefined e expectativa visual do usuário) e que o fix o resolve sem regressão

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: >
  Em src/components/lead-form-dialog.tsx, os defaultValues do useForm (RHF)
  definiam `followUpDate: lead?.followUpDate` — undefined no modo criação
  (lead é undefined ao clicar 'Novo lead'). O componente Calendar
  (react-day-picker, src/components/ui/calendar.tsx) aplica uma classe visual
  `today` (bg-muted, destaque sutil) no dia atual, DISTINTA da classe
  `data-selected-single` (bg-primary, destaque forte) usada quando uma data
  é de fato selecionada via onSelect. O admin via o destaque sutil de "hoje"
  e assumia (erroneamente) que já havia uma data escolhida, clicava Salvar
  sem tocar no calendário — e o valor RHF de followUpDate permanecia
  undefined. O zodResolver(leadSchema) roda ANTES do FormData ser montado
  (form.handleSubmit envolve onSubmit) e leadSchema.followUpDate é
  `z.coerce.date()`, que ao coagir undefined produz `new Date(undefined)`
  = Invalid Date, gerando exatamente o erro reproduzido: "Invalid input:
  expected date, received Date" (confirmado via reprodução isolada com
  node -e chamando z.coerce.date().parse(undefined)/.parse("")).
fix: >
  src/components/lead-form-dialog.tsx: defaultValues.followUpDate agora usa
  `lead?.followUpDate ?? startOfDay(new Date())` em vez de
  `lead?.followUpDate` puro — no modo criação, o campo já nasce com um Date
  válido (hoje, à meia-noite local), coerente com o que o admin vê
  visualmente destacado no calendário. Modo edição não muda (continua usando
  lead.followUpDate quando presente).
verification: >
  (1) Reprodução isolada: node -e confirmou que z.coerce.date().parse(undefined)
  e .parse("") produzem exatamente a mensagem de erro relatada — confirma o
  mecanismo da causa raiz antes do fix.
  (2) Após o fix, z.coerce.date().parse(startOfDay(new Date())) parseia com
  sucesso — confirma que o novo defaultValue satisfaz o schema.
  (3) `npx tsc --noEmit` sem erros no projeto após a mudança.
  (4) `node scripts/test-lead-actions.cjs` — suíte completa de regressão do
  server-side (createLead/updateLead/bulkImportLeads) passa 100% (34
  asserções OK), confirmando que a mudança (client-only, em defaultValues)
  não afeta nenhum contrato de servidor.
  (5) CONFIRMADO por verificação humana ao vivo no navegador: 'Novo lead',
  campos preenchidos, calendário de Follow-up não tocado, clique em 'Salvar'
  → lead salvo com sucesso, sem o erro "Invalid input: expected date,
  received Date". O dia 8 exibiu destaque forte (data-selected-single,
  bg-primary), confirmando visualmente que o defaultValue agora corresponde
  a uma seleção real. Lead de teste removido (soft-delete) após a verificação.
files_changed:
  - src/components/lead-form-dialog.tsx
