---
phase: 07
phase_name: "configura-o-de-dias-parado-por-etapa"
project: "CRM de Leads — Área da Saúde"
generated: "2026-08-01"
counts:
  decisions: 6
  lessons: 4
  patterns: 3
  surprises: 2
missing_artifacts: []
---

# Phase 07 Learnings: configura-o-de-dias-parado-por-etapa

## Decisions

### Defaults não-simétricos por paridade pré-deploy (D-04)
`dias_parado_contatado` nasce com 5 (paridade com o hardcode pré-fase, que só flagava a etapa Contatado); `dias_parado_novo`/`dias_parado_negociacao` nascem com 999999, para não passarem a "esfriar" leads reais já existentes no dia do deploy. Confirmado em runtime no UAT humano (0 cards destacados em Novo/Negociação com os defaults, board idêntico ao comportamento pré-fase).

**Rationale:** evitar uma migração que altera comportamento visível para o admin sem ele ter configurado nada.
**Source:** 07-01-SUMMARY.md, 07-02-SUMMARY.md, STATE.md

---

### Upsert em vez de update simples na Server Action
`saveConfiguracoes()` sempre faz `insert().onConflictDoUpdate()`, nunca um `UPDATE` filtrado por `id=1`.

**Rationale:** um `UPDATE` simples reportaria "sucesso" mesmo se a linha singleton ainda não tivesse sido semeada (0 linhas afetadas, sem erro) — o upsert elimina essa classe de bug.
**Source:** 07-01-SUMMARY.md (T-07-02)

---

### `drizzle-kit push` (não `generate`) para aplicar o schema
Usado mesmo sabendo que o snapshot de migrações já está divergente do banco real desde as Fases 4/6 — débito técnico pré-existente, deliberadamente não reconciliado nesta fase.

**Rationale:** reconciliar o snapshot estava fora do escopo de CONFIG-01/CONFIG-02; o precedente já existia nas fases anteriores.
**Source:** 07-01-SUMMARY.md, 07-RESEARCH.md

---

### Formulário de configurações sem Dialog, sem `form.reset()` pós-save (D-02)
Card único na página (`rounded-lg border ... p-6 max-w-md`), sem modal, sem botão Cancelar. Após salvar, os campos continuam mostrando os valores salvos e o admin permanece na tela.

**Rationale:** é uma tela de configuração de registro único, não um formulário de criação — não faz sentido limpar campos nem navegar para outro lugar após salvar.
**Source:** 07-02-SUMMARY.md

---

### Mapa `limitesPorEtapa` para generalizar o cálculo de "esfriando"
Substituiu o cálculo hardcoded ("só Contatado, limite literal 5") por um `Partial<Record<Stage, number>>` lido de `getConfiguracoes()`. Etapas terminais (Fechado/Perdido) ficam fora do mapa por construção (ausência de chave), não por condicional extra.

**Rationale:** generalização mínima e sem ramificação condicional extra — a ausência no mapa já expressa "esta etapa nunca esfria".
**Source:** 07-02-SUMMARY.md

---

### `eslint-disable-next-line` documentado em vez de reescrever o padrão de submissão
A regra `react-hooks/refs` (nova no React Compiler, `eslint-config-next@16.2.10`) sinaliza como erro o padrão `onSubmit={form.handleSubmit(onSubmit)}` + leitura de `formRef.current` — mesmo padrão já presente (e mandatado como analog) em `template-form-dialog.tsx`.

**Rationale:** reescrever só o arquivo novo criaria inconsistência com o analog sem resolver o débito de lint real, que é pré-existente no repositório.
**Source:** 07-02-SUMMARY.md

---

## Lessons

### Validação HTML5 nativa pode esconder a mensagem de erro customizada do Zod
Um `<input type="number" min={1}>` dentro de um `<form>` sem `noValidate` faz o navegador interceptar o submit e mostrar sua própria mensagem nativa ANTES do `react-hook-form`/`zodResolver` rodar — a mensagem customizada ("Mínimo de 1 dia.") nunca chega a renderizar, mesmo estando corretamente implementada no schema Zod e no componente `FieldError`. O comportamento de segurança (nada é persistido) fica correto por acidente — é a mesma "vitória de corrida" do browser que impede tanto o submit quanto a mensagem certa de aparecer.

**Context:** só foi descoberto no UAT humano interativo (clique real no navegador) da Fase 07 — `tsc --noEmit`, `eslint`, `npm run build` e o code review automatizado não capturam esse tipo de discrepância de UX, porque o código Zod/react-hook-form em si está correto; o bug é a ordem de interceptação de eventos do DOM.
**Source:** 07-HUMAN-UAT.md (item 3), quick task 260801-ij4

---

### `drizzle-kit push` em shell não-interativo aplica sem pausa de revisão
Rodar `npx drizzle-kit push --verbose` num ambiente sem TTY interativo aplica as mudanças propostas imediatamente, sem a janela de confirmação que o comando teria num terminal interativo — inclusive statements extras não previstos (ex.: `DROP INDEX` + `CREATE UNIQUE INDEX` num índice não relacionado, além do `CREATE TABLE` esperado).

**Context:** a auditoria pós-aplicação (contagem de linhas, `PRAGMA table_info`) precisa ser tratada como a única defesa real neste ambiente, não como uma segunda camada opcional depois de uma confirmação prévia que na prática não existe.
**Source:** 07-01-SUMMARY.md (Issues Encountered, Deviation 2)

---

### Verify scripts com `.includes()`/regex ingênuo sobre o arquivo inteiro geram falsos positivos em comentários explicativos
Padrão recorrente (3ª ocorrência documentada no projeto, após Fase 02-02): um comentário JSDoc que cita, a título de explicação, uma substring como `` `db.update(...)` ``, `` `form.reset()` `` ou as palavras "fechado"/"perdido" dispara o gate automatizado do plano mesmo sem nenhuma mudança de comportamento real.

**Context:** o fix é sempre reescrever o comentário para evitar a substring literal, nunca mudar o código. Vale considerar, em fases futuras, gates que diferenciem comentário de código (ex.: strip de comentários antes do grep) para parar de gastar ciclos de execução com isso.
**Source:** 07-01-SUMMARY.md, 07-02-SUMMARY.md, STATE.md

---

### Servidor de dev "persistente entre sessões" pode não ser o mesmo processo
O PID registrado no `STATE.md` de uma sessão anterior (1496) não respondia no início da execução do Plano 07-02; um `npm run dev` detectou outro processo diferente (PID 6928) já ocupando a porta 3000. O servidor existente respondeu normalmente aos testes de runtime.

**Context:** antes de assumir que é preciso reiniciar o servidor, verificar se a porta 3000 já está ocupada por um processo funcional (mesmo que o PID divirja do registrado).
**Source:** 07-02-SUMMARY.md (Issues Encountered)

---

## Patterns

### Tabela singleton com id fixo, invariante em código (não em SQL)
`configuracoes` usa `id=1` literal, sem `autoIncrement`, sem `CHECK constraint` no schema — a invariante de linha única é garantida pelo código da aplicação (upsert sempre com `id: 1` literal, nunca vindo de input), não pelo banco.

**When to use:** qualquer tabela de configuração/registro único futuro no projeto (o `getOrCreate` acontece na query, não depende de SQL de migração ter semeado a linha).
**Source:** 07-01-SUMMARY.md

---

### Server Component (leitura) + Client Component de formulário para configuração singleton
`page.tsx` (Server Component `async`) lê `getConfiguracoes()` e passa para `ConfiguracoesForm` (Client Component), que usa `useActionState` + `zodResolver` + FormData bruto do DOM. Sem estado de "não salvo"/confirmação de saída.

**When to use:** qualquer tela futura de edição de um único registro de configuração — evita a complexidade de Dialog/modal quando a tela inteira já é dedicada a isso.
**Source:** 07-02-SUMMARY.md

---

### `noValidate` no `<form>` quando há validação client-side própria (Zod/react-hook-form) sobre inputs com `min`/`max`/`required` nativos
Sem `noValidate`, a constraint validation nativa do HTML5 sempre "vence a corrida" contra o `handleSubmit` do React em inputs `type="number"` com `min`/`max` — o atributo `min`/`max` pode continuar no input (semântica/acessibilidade), mas o `<form>` precisa de `noValidate` para que a mensagem de erro customizada (e não a mensagem genérica do navegador) seja a que aparece.

**When to use:** qualquer formulário novo do projeto que combine `react-hook-form`+`zodResolver` com inputs numéricos nativos restritos (`min`, `max`, `required`).
**Source:** quick task 260801-ij4 (fix aplicado em `configuracoes-form.tsx`), 07-HUMAN-UAT.md item 3, 07-SECURITY.md (T-07-06)

---

## Surprises

### UAT humano via browser real pegou um bug que toda a verificação estática não pegou
`tsc --noEmit`, `eslint`, `npm run build` e o code review automatizado ficaram todos limpos na Fase 07 — mas o clique real no navegador (Claude in Chrome) revelou que a mensagem de validação customizada nunca renderizava, por causa da ordem de interceptação de eventos do DOM (ver Lesson acima). O `07-VERIFICATION.md` já havia classificado corretamente esse item como `human_needed`, mesmo com "evidência corroborante forte" via runtime/curl — a ressalva do verificador ("CSS/toast/foco não podem ser capturados só por curl/análise estática") se confirmou na prática.

**Impact:** reforça que `human_verify_mode: end-of-phase` com UAT interativo real não é redundante com verificação estática — pegou o único bug real da fase.
**Source:** 07-HUMAN-UAT.md, 07-VERIFICATION.md

---

### `drizzle-kit push` propôs um `DROP INDEX`/`CREATE UNIQUE INDEX` inesperado, mas era seguro
Além do `CREATE TABLE configuracoes` esperado, o push também recriou (drop + create) o índice único de `subnichos.nome` — drift de formatação do snapshot pré-existente, não um `ALTER TABLE`/`DELETE FROM` destrutivo. Auditoria pós-aplicação confirmou zero linhas perdidas em `leads`/`subnichos`/`templates`.

**Impact:** o gate de segurança da Task 2 (abortar se `push` propuser algo além do `CREATE TABLE`) precisou de julgamento humano/agente para distinguir "statement extra inesperado" de "statement extra mas seguro" — um gate puramente sintático (grep no diff do SQL) teria bloqueado uma operação na verdade inofensiva.
**Source:** 07-01-SUMMARY.md (Deviation 2)
