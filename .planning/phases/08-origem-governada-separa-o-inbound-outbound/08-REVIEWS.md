---
phase: 8
reviewers: [codex]
reviewed_at: 2026-08-06T22:35:43Z
plans_reviewed:
  - .planning/phases/08-origem-governada-separa-o-inbound-outbound/08-01-PLAN.md
  - .planning/phases/08-origem-governada-separa-o-inbound-outbound/08-02-PLAN.md
  - .planning/phases/08-origem-governada-separa-o-inbound-outbound/08-03-PLAN.md
cycle: 2
cycle_history: [1, 2]
---

# Cross-AI Plan Review — Phase 8

**Nota sobre reviewers:** Apenas `--codex` foi solicitado e executado neste ciclo. `--agy` (Antigravity)
não foi invocado — o `review.md` instalado neste repositório (`.claude/get-shit-done/workflows/review.md`)
não implementa nenhum branch de invocação para `agy`/Antigravity em `detect_clis`/`invoke_reviewers`, e o
agente custom que essa integração precisaria (`~/.gemini/config/agents/revisor-gsd/agent.md`) não existe
neste host. Nenhuma tentativa foi feita de adicionar esse branch, inventar uma invocação ou editar o
`review.md` — a ausência é reportada aqui como degradação conhecida, não corrigida silenciosamente.

## Codex Review

**Modelo solicitado:** `gpt-5.6-sol` (explícito, com `-c model_reasoning_effort=low`).
**Resultado:** `gpt-5.6-sol` foi rejeitado pela API com erro `400 invalid_request_error: "The 'gpt-5.6-sol'
model is not supported when using Codex with a ChatGPT account."` (evidência completa abaixo). Nova
tentativa feita com `--model gpt-5.6-terra` (mesmo `reasoning_effort=low`), que teve sucesso — **reviewer
degradado por troca de modelo**, conforme autorizado pela instrução de execução (regra "at capacity" /
"not supported" → re-rodar uma vez com `gpt-5.6-terra`).

## Summary

Os planos são detalhados, bem encadeados e cobrem o objetivo da Fase 8 com boa disciplina de escopo: migração segura, contrato de validação, UI manual e importação CSV, seguidos de testes e gates. A principal fragilidade está no Plano 08-03: o teste de mutação proposto pode apagar alterações não commitadas e a cobertura automatizada não testa a atualização de `origemTipo`, apesar de o plano declarar cobertura para `updateLead`.

## Strengths

- Separação em ondas é correta: schema/migração → UI/import → validação final.
- Migração evita corretamente `drizzle-kit push` e usa `ALTER TABLE` com `DEFAULT 'outbound'`, adequado para SQLite com dados existentes.
- Backup com checkpoint WAL antes da cópia reduz risco de backup inconsistente.
- Backfill é idempotente e não sobrescreve uma futura reclassificação para `inbound`.
- Distinção entre `leadSchema` obrigatório e `csvRowSchema` com default preserva a decisão de exigir escolha consciente no cadastro manual.
- Plano identifica explicitamente o insert de importação como lista de campos, evitando uma regressão silenciosa.
- UI respeita o escopo: campo no modal, sem badge ou novas superfícies prematuras.
- Threat models são proporcionais ao projeto e incluem riscos reais de dados e validação server-side.
- Gates finais incluem typecheck, lint, guardas, testes e build.

## Concerns

- **HIGH — Teste de mutação destrutivo:** o Plano 08-03 manda remover uma linha de `src/actions/import-actions.ts` e restaurar com `git checkout --`. Isso pode descartar alterações locais legítimas e não commitadas nesse arquivo, inclusive as recém-feitas no Plano 08-02.
- **MEDIUM — Cobertura de `updateLead` ausente:** o objetivo e `must_haves` mencionam `createLead/updateLead`, mas os novos casos automatizados só verificam rejeição e persistência em `createLead`. A edição é relevante para reclassificar um lead existente.
- **MEDIUM — Estado intermediário potencialmente quebrado:** após 08-01, `leadSchema` passa a exigir `origemTipo`, mas o formulário só passa a enviá-lo em 08-02. Se cada plano for integrado/deployado individualmente, criar/editar leads falha nesse intervalo.
- **MEDIUM — Aceite de UI depende inteiramente de human-check:** os testes estáticos verificam strings, não que o `Select` efetivamente produza o campo em `FormData` nem que o erro apareça ao usuário. Isso é aceitável para uma app local, mas deve ser marcado como gate obrigatório antes de encerrar a fase.
- **LOW — `CSV_DEFAULTS.origemTipo` pode induzir manutenção errada:** o plano assume que a entrada é apenas documental e não é aplicada por `mapCsvRows`; a fonte de verdade real é o Zod. Isso cria dois locais para o mesmo default sem necessidade funcional.
- **LOW — Verificador pode ficar frágil por regex:** a guarda estática busca padrões de código-fonte. Pequenas refatorações semanticamente equivalentes podem quebrar a guarda, incentivando manutenção por texto em vez de comportamento.

## Suggestions

- Substituir o teste de mutação por uma cópia temporária do arquivo ou por uma opção de teste no verificador que injete uma fonte incompleta. Nunca usar `git checkout --` em arquivo possivelmente alterado.
- Adicionar um caso automatizado para `updateLead`: criar um lead `outbound`, atualizar para `inbound`, e verificar persistência no banco.
- Executar 08-01 e 08-02 como uma única mudança integrada antes de qualquer uso/deploy da aplicação; documentar explicitamente que o estado após 08-01 isolado não é releaseável.
- Transformar os human-checks críticos em condição de conclusão, especialmente:
  - submit sem seleção bloqueado;
  - criação `inbound` persistida;
  - edição de lead backfillado mostrando `Outbound`;
  - lote CSV persistindo `outbound`.
- Remover `origemTipo` de `CSV_DEFAULTS` ou fazê-lo ser efetivamente consumido por uma única função compartilhada. Se permanecer documental, deixar isso muito explícito para evitar divergência futura.
- Fazer o verificador priorizar testes comportamentais onde viável: validar `csvRowSchema.safeParse` sem `origemTipo`, com valor inválido, e executar importação contra banco temporário.
- No script de backfill, garantir fechamento do banco também no caminho de erro (`try/finally`), embora o processo termine logo após `fail()`.

## Risk Assessment

**MEDIUM.** A arquitetura e a ordem geral atendem bem aos requisitos ORIGEM-01 e ORIGEM-02, e o risco de migração foi tratado com cuidado acima da média. O risco remanescente é operacional: o `git checkout --` do teste de mutação é perigosamente destrutivo, e a falta de teste automatizado para atualização deixa uma parte importante do fluxo de edição dependente apenas de verificação manual.

---

## Consensus Summary

Apenas um reviewer externo participou deste ciclo (Codex, com troca de modelo por indisponibilidade de
`gpt-5.6-sol` — ver nota acima). Não há convergência/divergência entre múltiplos reviewers a sintetizar;
o conteúdo desta seção é o próprio veredito do Codex.

### Agreed Strengths
N/A — apenas um reviewer.

### Agreed Concerns
N/A — apenas um reviewer. Ver `## Concerns` acima para a lista completa levantada pelo Codex.

### Divergent Views
N/A — apenas um reviewer.

## Model Evidence — Cycle 1

### Codex

Primeira tentativa (`--model gpt-5.6-sol`) — **rejeitada pela API**:
```
ERROR: {"type":"error","status":400,"error":{"type":"invalid_request_error","message":"The 'gpt-5.6-sol' model is not supported when using Codex with a ChatGPT account."}}
```

Segunda tentativa (`--model gpt-5.6-terra`, mesmo `-c model_reasoning_effort=low`) — **bem-sucedida**.
Banner verbatim (`head -8` de `/tmp/gsd-review-codex-08-c1.err`, execução que gerou o `.md` acima):

```
codex_model_evidencia: |
  OpenAI Codex v0.144.6
  --------
  workdir: C:\Users\Vencedor\Desktop\crm-leads
  model: gpt-5.6-terra
  provider: openai
  approval: never
  sandbox: read-only
  reasoning effort: low
```

**Reviewer degradado nesta rodada:** SIM — o `--model` pedido originalmente (`gpt-5.6-sol`) não bateu com
o modelo que efetivamente gerou a revisão (`gpt-5.6-terra`), por indisponibilidade do primeiro na conta
ChatGPT configurada neste host. A troca segue a regra de contingência definida para esta execução
("at capacity"/"not supported" → re-rodar uma vez com `gpt-5.6-terra`) e está registrada aqui para
rastreabilidade.

---

# Cycle 2 — Revisão de confirmação (fix cirúrgico do HIGH do Cycle 1)

**Gatilho:** commit `4da361b` aplicou um fix cirúrgico direto no 08-03-PLAN.md, substituindo
`git checkout -- src/actions/import-actions.ts` no teste de mutação por um backup/restore local
em disco (`import-actions.ts.bak-mutationtest`), em resposta ao único HIGH do Cycle 1 ("Teste de
mutação destrutivo").

**Reviewers que efetivamente participaram neste ciclo, com evidência de modelo:** apenas **Codex**
(via `gpt-5.6-terra`, após a mesma rejeição de `gpt-5.6-sol` já observada no Cycle 1). **Agy/Antigravity
foi tentado ativamente nesta rodada** (diferente do Cycle 1, onde nem o binário estava presente) —
ver "Nota sobre Agy" abaixo — mas **não gerou parecer** (stdout vazio, critério de falha definido
para esta execução), então não conta como reviewer participante.

## Nota sobre Agy (tentativa real, degradação diferente do Cycle 1)

No Cycle 1, `agy` não pôde nem ser tentado: o binário/agente custom `revisor-gsd` não existia neste
host. Neste ciclo o binário `agy.exe` está presente e `agy agents` roda, mas retorna uma lista vazia
de agentes disponíveis (o agente custom `~/.gemini/config/agents/revisor-gsd/agent.md` continua
inexistente — não editado, não recriado, conforme escopo de escrita autorizado desta tarefa).

Tentativas feitas, em ordem, sem invenção de contorno além de corrigir a sintaxe do próprio CLI
(confirmada contra `agy --help`, não um workaround):

1. `agy --model claude-sonnet-4-6 --effort low --sandbox --print` com o prompt via stdin, seguindo
   o padrão de dash do `codex exec` — uso incorreto da CLI: `--print`/`-p` do `agy` exige o
   prompt como valor do próprio flag, não lê stdin. O texto `--model` foi engolido como se fosse o
   próprio prompt (visível no transcript, `USER_REQUEST` = `--model`), gerando uma resposta
   descartável sob um modelo diferente do pedido (`Gemini 3.6 Flash (High)`, fallback do CLI) e
   erro `429` de sobrecarga.
2. `agy --model claude-sonnet-4-6 --effort low --sandbox --print "$(cat prompt.md)"` (prompt de
   1342 linhas como argumento posicional, forma correta segundo `--help`) — falha de SO:
   `Argument list too long` (exit 126) — o prompt completo excede o limite de `ARG_MAX` deste
   host para um único argumento de linha de comando. `agy` não expõe um modo `--print -`/stdin
   equivalente ao `codex exec -`, então não há forma sancionada de entregar um prompt deste
   tamanho sem reduzi-lo (fora de escopo desta tarefa: o prompt não foi truncado para contornar isso).
3. Teste de diagnóstico com prompt trivial (`"Say only the word PONG..."`) e `--effort low` —
   erro de validação do próprio CLI: `Error: invalid model selection (--model "claude-sonnet-4-6"
   --effort "low"): --effort is not supported for model "claude-sonnet-4-6"` — `--effort` não é
   aplicável a este modelo específico no `agy` (provavelmente restrito a modelos Gemini/OSS).
4. Mesmo prompt trivial, sem `--effort` — erro de quota, não de modelo:
   `Error: Individual quota reached. Please upgrade your subscription to increase your limits.
   Resets in 143h5m27s.` stdout vazio (critério de falha desta execução).

Evidência de modelo capturada via transcript (`~/.gemini/antigravity-cli/brain/<conv-id>/.system_generated/logs/transcript.jsonl`,
watermark de linha antes/depois de cada tentativa, conversa `3219f5c2-0dc7-4280-8ab1-e91809afc87d`,
a tentativa final antes do "quota reached"):

```
"content":"...<USER_SETTINGS_CHANGE>\nThe user changed setting Model Selection from None to
Claude Sonnet 4.6 (Thinking). ..."
```
seguido de dois `ERROR_MESSAGE` com `"error_code":429,"error":"The model API is currently
overloaded and may experience intermittent errors."` antes do CLI reportar quota individual
esgotada.

**Conclusão sobre Agy nesta rodada:** degradação real e diferente da do Cycle 1 — não é mais
"ferramenta ausente", é "conta com quota individual esgotada" (reset relatado em ~143h a partir de
2026-08-06T22:35Z). Nenhuma tentativa adicional foi feita após a confirmação de quota esgotada, para
não piorar o estado da conta nem violar a regra de não inventar contorno. Reportado aqui como
degradação, não corrigido silenciosamente.

## Codex Review — Cycle 2

**Modelo solicitado:** `gpt-5.6-sol` (explícito, com `-c model_reasoning_effort=low`).
**Resultado:** rejeitado pela API com o MESMO erro do Cycle 1:
```
ERROR: {"type":"error","status":400,"error":{"type":"invalid_request_error","message":"The 'gpt-5.6-sol' model is not supported when using Codex with a ChatGPT account."}}
```
Nova tentativa com `--model gpt-5.6-terra` (mesmo `reasoning_effort=low`) — bem-sucedida.
**Reviewer degradado nesta rodada:** SIM, pela mesma razão do Cycle 1 (troca de modelo autorizada
pela regra de contingência desta execução).

### Summary

O HIGH do Cycle 1 está **PARCIALMENTE RESOLVIDO**. O Plano 08-03 não usa mais `git checkout --`
(nem qualquer outro comando git de restauração), eliminando especificamente o risco de descartar
alterações não commitadas via Git. Porém, a sequência backup/mutação/verificação/restauração
proposta não é à prova de interrupção: uma falha de processo, erro de shell ou travamento do
verificador entre a mutação e a restauração pode deixar `src/actions/import-actions.ts`
modificado (quebrado) e o arquivo `.bak-mutationtest` para trás. Os planos, fora esse ponto,
seguem bem escopados e atingem coletivamente os objetivos da Fase 8.

### Strengths

- Ordenação de ondas clara: schema/backfill → wiring de UI/import → verificação automatizada.
- 08-01 evita corretamente `drizzle-kit push` e usa `ALTER TABLE ... DEFAULT ... NOT NULL` seguro para SQLite.
- Backfill preserva reclassificações futuras do admin via `WHERE origem_tipo IS NULL`.
- Backup com checkpoint WAL, importante para um banco SQLite usado por uma app Next.js.
- 08-02 mantém corretamente a criação manual sem pré-seleção, dando ao import CSV um default server-side.
- 08-02 persiste explicitamente `row.origemTipo` apesar do default físico do banco, prevenindo regressão silenciosa de wiring.
- 08-03 conserta o drift pré-existente do banco de teste temporário antes de depender dele como evidência de aceite.
- O verificador permanente checa tanto a fiação de código-fonte quanto o estado físico do banco, boa defesa contra regressão futura.
- O teste de mutação agora usa um snapshot local em vez de git, preservando todo trabalho não commitado quando a restauração ocorre — o HIGH original (perda de dados via git) está eliminado.

### Concerns

- **HIGH — restauração do teste de mutação não é à prova de falha.** O procedimento só restaura após a execução esperada do verificador. Se o processo é interrompido, o verificador trava, o PowerShell lança erro, ou o executor para no meio da task, `import-actions.ts` permanece deliberadamente quebrado e o backup permanece no repositório. Isso não descarta trabalho, mas pode deixar a árvore de trabalho quebrada e contaminar gates subsequentes.
- **MEDIUM — limpeza do backup não é garantida.** O plano diz para apagar `.bak-mutationtest`, mas não exige um caminho de limpeza estilo `finally`. Um backup esquecido pode ser editado por engano, entrar em varreduras de ferramentas, ou confundir trabalho futuro.
- **MEDIUM — `updateLead` continua sem teste.** Preocupação do Cycle 1 ainda de pé. O plano reivindica cobertura de "createLead/updateLead" em alguns pontos, mas os novos casos comportamentais só exercitam `createLead`. Como `origemTipo` é obrigatório no schema compartilhado, uma regressão no caminho de update é plausível e merece um teste explícito.
- **MEDIUM — estado intermediário entre 08-01 e 08-02 continua potencialmente quebrado.** Preocupação inalterada. Após 08-01, os caminhos de sucesso existentes do formulário manual podem falhar validação até 08-02 ser aplicado. A dependência de onda evita execução fora de ordem pretendida, mas deploy/integração parcial separado continua arriscado.
- **MEDIUM — aceite de UI continua dependendo só de human-check.** Preocupação inalterada. Checagens estáticas provam presença de código-fonte, não que o `Select` customizado efetivamente contribui um campo nativo no FormData, renderiza o placeholder, exibe o erro do servidor, ou submete o valor pretendido.
- **LOW — `CSV_DEFAULTS.origemTipo` pode sugerir que ele dirige o comportamento.** Ainda de pé. O default real está em `csvRowSchema`; `CSV_DEFAULTS` é só documentação/paridade. Isso está documentado explicitamente, mas ainda cria dois lugares que mantenedores podem tratar como fonte de verdade.
- **LOW — regexes do verificador estático continuam inerentemente frágeis.** O plano mitiga falsos positivos de comentário, mas checagens de texto estático ainda podem falhar após refatorações inofensivas ou passar apesar de mudança semântica. As checagens de banco e o harness comportamental reduzem esse risco.
- **LOW — tratamento de falha do script de migração é manual.** Se o script de backfill falhar depois do DDL mas antes da verificação final, o plano manda o executor restaurar um backup, mas o script em si não oferece rollback transacional automático. Dado as limitações de `ALTER TABLE` do SQLite e um backup obrigatório pré-escrita, isso é aceitável mas vale documentar no SUMMARY.

### Suggestions

- Tornar o teste de mutação transacional no nível do shell. Em PowerShell, envolver a mutação e a execução do verificador em `try { ... } finally { restaurar backup se presente; remover backup }`, preservando a asserção de exit-code esperado do verificador separadamente. Esta é a peça que falta para resolver totalmente o HIGH.
- Adicionar pré-condições explícitas antes da mutação: confirmar que o backup foi criado com sucesso; confirmar que o arquivo-alvo contém exatamente uma linha `origemTipo: row.origemTipo,` esperada antes de removê-la; restaurar usando o caminho exato do backup, não um wildcard.
- Adicionar uma pós-condição após a limpeza: assegurar que `.bak-mutationtest` não existe mais e que `import-actions.ts` volta a conter a linha de inserção obrigatória.
- Adicionar um caso automatizado de `updateLead`: atualizar um lead existente de `outbound` para `inbound`, depois reler do banco temporário.
- Considerar um teste automatizado estreito de DOM/componente para o comportamento Select-para-FormData do formulário, se a stack de teste do projeto suportar. Caso não suporte, manter o human-check mas torná-lo gate obrigatório de release.
- Em 08-01, garantir que o script de migração usa `try/finally` para fechar conexões de banco mesmo se uma query ou DDL lançar.

### Risk Assessment

**MEDIUM.** A estratégia de implementação é forte, bem delimitada e alinhada aos requisitos da
fase. O risco remanescente é operacional, não arquitetural: o teste de mutação orquestrado
manualmente pode deixar o arquivo-fonte quebrado se não alcançar seu passo de restauração.
Adicionar restauração/limpeza via `try/finally` reduziria o risco geral para LOW e resolveria
totalmente o HIGH do Cycle 1.

---

## Consensus Summary — Cycle 2

Apenas um reviewer externo gerou parecer neste ciclo (Codex, com a mesma troca de modelo por
indisponibilidade de `gpt-5.6-sol` já vista no Cycle 1). Agy foi tentado ativamente mas falhou por
quota de conta esgotada (stdout vazio) — ver "Nota sobre Agy" acima. Não há convergência/divergência
entre múltiplos reviewers a sintetizar neste ciclo; o veredito abaixo é o do próprio Codex.

### Verdict sobre o HIGH do Cycle 1

**PARCIALMENTE RESOLVIDO.** O uso de `git checkout --` foi eliminado (resolve o risco específico
de descartar trabalho não commitado via git, que era o enunciado literal do HIGH original). Mas o
Codex levantou um HIGH novo/derivado: o mecanismo de backup/restore local não é à prova de
interrupção (falta `try/finally` ou equivalente) — se o processo for interrompido entre a mutação
e a restauração, o arquivo-alvo fica quebrado em disco (ainda que sem perda de histórico git).

### Agreed Strengths
N/A — apenas um reviewer gerou parecer neste ciclo.

### Agreed Concerns
N/A — apenas um reviewer. Ver `### Concerns` acima (Cycle 2) para a lista completa.

### Divergent Views
N/A — apenas um reviewer.

## Model Evidence — Cycle 2

### Codex

Primeira tentativa (`--model gpt-5.6-sol`) — rejeitada pela API (mesmo erro do Cycle 1):
```
ERROR: {"type":"error","status":400,"error":{"type":"invalid_request_error","message":"The 'gpt-5.6-sol' model is not supported when using Codex with a ChatGPT account."}}
```

Segunda tentativa (`--model gpt-5.6-terra`, mesmo `-c model_reasoning_effort=low`) — bem-sucedida.
Banner verbatim (`head -8` de `/tmp/gsd-review-codex-08-c2.err`):

```
OpenAI Codex v0.144.6
--------
workdir: C:\Users\Vencedor\Desktop\crm-leads
model: gpt-5.6-terra
provider: openai
approval: never
sandbox: read-only
reasoning effort: low
```

**Reviewer degradado nesta rodada:** SIM — mesma troca de modelo do Cycle 1, mesma regra de
contingência aplicada.

### Agy (tentativa sem parecer)

Evidência de transcript da tentativa final antes do "quota reached" (conversa
`3219f5c2-0dc7-4280-8ab1-e91809afc87d` — as duas conversas anteriores, `d9f37fd8...` e a
malformada, também ficaram registradas e são citadas na "Nota sobre Agy" acima):

```
"content":"...<USER_SETTINGS_CHANGE>\nThe user changed setting Model Selection from None to
Claude Sonnet 4.6 (Thinking). ..."
```

Stderr final da CLI (não do transcript — mensagem de erro direta do processo `agy.exe`):
```
Error: Individual quota reached. Please upgrade your subscription to increase your limits. Resets in 143h5m27s.
```

**Status:** FALHOU (stdout vazio — critério de falha definido para esta execução). Não conta como
reviewer participante do Cycle 2.
