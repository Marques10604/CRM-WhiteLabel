---
phase: 8
reviewers: [codex]
reviewed_at: 2026-08-06T14:49:08Z
plans_reviewed:
  - .planning/phases/08-origem-governada-separa-o-inbound-outbound/08-01-PLAN.md
  - .planning/phases/08-origem-governada-separa-o-inbound-outbound/08-02-PLAN.md
  - .planning/phases/08-origem-governada-separa-o-inbound-outbound/08-03-PLAN.md
cycle: 1
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
