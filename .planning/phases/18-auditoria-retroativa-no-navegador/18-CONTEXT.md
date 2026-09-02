# Phase 18: Auditoria Retroativa no Navegador - Context

**Gathered:** 2026-09-02
**Status:** Ready for planning
**Source:** ROADMAP SC (já detalhado) + REQUIREMENTS (AUDIT-01..05) + aprendizados do UAT da Fase 16 (2026-09-01) + decisão do usuário 2026-09-02

<domain>
## Phase Boundary

**Entrega:** o comportamento shipado das Fases 1, 2, 4, 6 e 8 verificado com clique real no
navegador contra o `data/crm.db` de produção. Cada `VERIFICATION.md` vai de
`human_needed`/inexistente → `passed`. Issue não-trivial vira quick task em `.planning/quick/`.

**Dentro:** autorar `01-HUMAN-UAT.md` + `02-HUMAN-UAT.md` (não existem) + `01/02-VERIFICATION.md`;
executar TODOS os cenários no navegador (os 2 novos + os 7 de `04-HUMAN-UAT.md` + 11 de
`06-HUMAN-UAT.md` + 4 de `08-HUMAN-UAT.md`, todos hoje `status: partial`); promover os 5
`VERIFICATION.md` a `passed`; limpar o §Deferred Items do STATE.

**Fora:** qualquer mudança de código de runtime. Se um cenário revelar bug, o fix é uma quick
task SEPARADA (`/gsd-quick`), não entra nesta fase. A auditoria só registra e segue.
</domain>

<decisions>
## Implementation Decisions

### D-01 (REVISADO 2026-09-02): verificação CODE+DATA, sem navegador — decisão forçada por hardware
**Tentativa original (D-01 v1):** UAT 100% ao vivo no navegador. **Bloqueada 2026-09-02** — o
host de 4GB não roda `npm run dev` (Turbopack) + Chrome + a sessão Claude ao mesmo tempo (RAM
livre caiu a ~200 MB, renderer congelou, `javascript_tool` timeout de 45s). Ver `18-01-SUMMARY.md`.
Além disso: `form_input` E `computer type` não preenchem os inputs de react-hook-form pela extensão.

**Decisão do usuário (2026-09-02):** verificar cada cenário por **code+data** —
(1) leitura do código-fonte da superfície (componente + Server Action + schema);
(2) query direta no `data/crm.db` para os invariantes de dados;
(3) rodar os harnesses automatizados que já existem (`test-lead-actions.cjs` cobre
createLead/updateLead/parsing/bulkImport; `test-*.cjs` cobrem sequência, motivo-perda, tarefas,
group-by-urgency; `verify-*.cjs` cobrem schema/origem-tipo).
Cada cenário no `NN-HUMAN-UAT.md` marcado `result: pass` com `evidence:` citando arquivo:linha
+ saída de query/teste, E um sufixo `(code+data)` — NUNCA `(live)`.
Cenário que SÓ dá pra provar com renderização visual (ex: "o toast aparece", "o layout não
quebra") → `result: skipped` com motivo "requer navegador; diferido".
`NN-VERIFICATION.md` → `passed` com uma seção `## Método de Verificação` explícita dizendo que
foi code+data e listando o que um pass de navegador ainda acrescentaria.

Cenário 4 da Fase 1 (guard "Descartar alterações?") FOI verificado ao vivo antes do bloqueio —
mantém `result: pass` com evidência live.

### D-02: Divisão em ondas por natureza do trabalho
- **Onda 1 — Fases 1 e 2 (AUDIT-01, AUDIT-02):** autorar os `HUMAN-UAT.md` do zero + os
  `VERIFICATION.md` + executar. Trabalho maior (redação + execução).
- **Onda 2 — Fases 4, 6, 8 (AUDIT-03/04/05):** só executar os cenários já escritos + promover.
Provável 2 planos (um por onda). O planner pode dividir a Onda 1 em 2 planos (Fase 1 / Fase 2)
se o volume pedir. Sequencial de qualquer forma (host 4GB).

### D-03: Aprendizados operacionais do UAT da Fase 16 (2026-09-01) — OBRIGATÓRIO no plano
- **Screenshots da extensão dão timeout intermitente** sob pressão de RAM. Usar
  `mcp__claude-in-chrome__get_page_text` e `read_page` (accessibility tree) como fonte primária
  de verificação; screenshot só quando indispensável e com retry após `wait`.
- **`form_input` NÃO dispara o `onChange` do react-hook-form** nos formulários do projeto.
  Para preencher campos de form: `computer` action `left_click` no campo + `type`. Para os
  `<Select>` do Base UI (`type="button"`): `left_click` no combobox + `left_click` na opção
  (por `ref` do `read_page` ou por coordenada de screenshot).
- **`file_upload`** funciona (testado na Fase 16 — CSV subiu OK). Usar `read_page` pra achar o
  `ref` do `<input type=file>`, nunca clicar no botão de upload (abre picker nativo invisível).
- **Não confirmar imports que poluam o banco real.** A prévia do wizard de CSV já prova o
  comportamento; confirmar cria leads + nichos de teste no `data/crm.db`. Para cenários que
  EXIGEM o import real (AUDIT-02 SC diz "import real no banco"), usar CSV mínimo (1-2 linhas
  com nome tipo "UAT18 <cenário>") e limpar depois (soft-delete do lead; nicho de teste pode
  ficar ou ser removido via `/nichos`). Registrar no UAT o que foi criado e como limpar.
- **Matar processos `node` órfãos antes de subir o dev server** (`taskkill //F //IM node.exe`
  com filtro de PID). Rodar `npm run dev` em background, esperar "Ready", só então abrir a aba.
- **Limite de uso 5h** pode cortar a sessão no meio. O UAT tem que ser resumível: gravar o
  progresso ("cenário X de Y done") no `HUMAN-UAT.md` incrementalmente, não só no fim.
- **Fechar dev server + aba do Chrome ao terminar** cada sessão de execução.

### D-04: `HUMAN-UAT.md` incremental + resumível
Escrever cada cenário no `HUMAN-UAT.md` assim que executado (`result: pass|fail|skipped` +
`evidence`), não bufferizar. Frontmatter `status:` só vira `complete` quando todos os cenários
do arquivo têm resultado. Se a sessão cair, a próxima retoma pelo primeiro cenário sem
resultado. Método no frontmatter: "browser automation (extensão Claude no Chrome) contra
dev server localhost:3000 + data/crm.db real".

### D-05: Promoção de VERIFICATION só com UAT limpo
Cada `NN-VERIFICATION.md` vai a `passed` só quando `NN-HUMAN-UAT.md` está `complete` com 0
issues/pending. Cenário `skipped` (precondição impossível) → registrar o motivo; o
`/close-phase` decide (bloqueia e pergunta, ou aceita explícito). `fail` real → quick task +
o cenário fica `fail` até a quick task fechar (não bloqueia o requisito de AUDITORIA, mas o
VERIFICATION daquela fase não promove até o re-teste).

### D-06: Issue encontrada → quick task, não fix inline (SC#4)
Qualquer bug não-trivial: `/gsd-quick` separado, anotado no `HUMAN-UAT.md` do cenário e numa
linha do §"Issues Encontradas" do plano. A auditoria fecha o requisito AUDIT mesmo com quick
tasks abertas (SC#4 explícito). Regressão trivial que dá pra consertar em 1 linha durante a
sessão: consertar e anotar como deviation.

### D-07: Limpar §Deferred Items do STATE (SC#5)
Ao fim: remover as linhas `uat_gap`/`verification_gap` das Fases 1, 2, 4, 6, 8 do §Deferred
Items do STATE.md (linhas ~270-277 hoje). O `/close-phase` faz refresh do STATE; aqui é
tirar as afirmações que deixam de ser verdade.

### Claude's Discretion
- 1 plano vs 2 vs 3 (o planner decide pelo volume — provável 2: onda 1 / onda 2).
- Ordem dos cenários dentro de cada fase.
- Se autora `01/02-HUMAN-UAT.md` como task separada da execução ou junto.
- Conteúdo exato dos cenários novos das Fases 1 e 2 (o SC dá a lista de tópicos; o planner
  deriva os cenários concretos dos SUMMARYs das Fases 1 e 2).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Cenários já escritos (executar)
- `.planning/phases/04-follow-up-dashboard-whatsapp-outreach/04-HUMAN-UAT.md` (7 cenários, `status: partial`)
- `.planning/phases/06-auto-avan-o-de-etapa-contador-de-tentativas/06-HUMAN-UAT.md` (11 cenários, `status: partial`)
- `.planning/phases/08-origem-governada-separa-o-inbound-outbound/08-HUMAN-UAT.md` (4 cenários, `status: partial`)
- `.planning/phases/04-*/04-VERIFICATION.md`, `06-*/06-VERIFICATION.md`, `08-*/08-VERIFICATION.md` (todos `status: human_needed` — os `human_verification:` do frontmatter listam o que falta)

### Fases 1 e 2 — derivar cenários novos daqui
- `.planning/phases/01-lead-sub-nicho-foundation/01-01..04-SUMMARY.md` + `01-SPEC.md` + `01-UI-SPEC.md`
- `.planning/phases/02-csv-bulk-import/02-01..03-SUMMARY.md` + `02-UI-SPEC.md`
- (Nota: Fase 1 é "sub-nicho" no nome do dir mas o rename foi só de código na Fase 13 — a UI diz "Nicho". `deferred-items.md` linha ~277 do STATE confirma "Fases 1 e 2 nunca tiveram VERIFICATION")

### Superfícies do app a exercer
- `/leads` (lista, toolbar, paginação, "Novo lead", editar, excluir/soft-delete), `/nichos` (CRUD + dedupe case-insensitive + soft-delete), `/` (dashboard follow-up por urgência), `/importar` + `/importar/[batchId]` (wizard CSV), `/pipeline` (drag, drag-to-Perdido), `/templates` (CRUD, um padrão por tipo), `/configuracoes` (dias-parado)

### Método / aprendizados
- UAT da Fase 16: `.planning/phases/16-corre-es-de-code-review-da-fase-15/16-HUMAN-UAT.md` (exemplo de formato + o que deu errado no navegador)
- `.planning/STATE.md` §Deferred Items (linhas a limpar) + §"COMEÇA AQUI" (aviso do host 4GB)
- `CLAUDE.md` — host 4GB, PT-BR, `npm run dev` em background
</canonical_refs>

<specifics>
## Specific Ideas

- `data/crm.db` real tem ~44 leads (uso do admin). Os cenários de "lista ordenada por
  follow-up", "paginação", "filtros" já têm dados de verdade — não precisa semear.
- Dedupe de nicho é **case-insensitive** (Fase 1 + quick 260725-lai) — testar criar "Dentista"
  com "dentista" já existente.
- Fase 2: a prévia mostra flags "Duplicado", "Nicho novo", "Nicho bloqueado" (soft-deleted) —
  o CSV de teste da Onda 1 precisa exercer os 3.
- Fase 4: o "auto-gatilho de 1º contato nas 3 superfícies" e o "race no drag-to-Perdido" já
  tiveram quick tasks (260828-gna, 260811-pb1) — re-testar que o fix pegou.
- Fase 6: "auto-avanço Novo→Contatado só com template de 1º contato" — precisa de um lead em
  "Novo" e clicar "Abrir WhatsApp" com um template tipo `primeiro_contato`.
- Dev server: `npm run dev` (Next 16.2 Turbopack, ~4s pra "Ready"). Porta 3000.
</specifics>

<deferred>
## Deferred Ideas

- Fase 12 Teste 14 (estado vazio do dashboard) — já `skipped` no §Deferred Items, precondição
  "banco sem os 23 leads" impossível sem destruir o banco real. NÃO faz parte da Fase 18
  (só 1/2/4/6/8).
- Re-rodar UAT de fases do v1.4 (13/14/15) — já fecharam `passed` na época, fora de escopo.
- Automatizar esses UATs como testes de integração — ideia separada, não é a Fase 18.
</deferred>

---

*Phase: 18-auditoria-retroativa-no-navegador*
*Context gathered: 2026-09-02*
