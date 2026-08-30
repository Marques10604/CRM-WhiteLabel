---
phase: 12
slug: agenda-tarefas-soltas
status: verified
threats_open: 0
asvs_level: 1
created: 2026-08-30
---

# Phase 12 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Registro construído em tempo de planejamento (`<threat_model>` presente nos 4 PLANs). Auditoria retroativa em 2026-08-30 verificou cada mitigação contra a implementação já commitada.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| script `.cjs` → `data/crm.db` | `scripts/migrate-tarefas.cjs` escreve DDL direto no banco local; nenhum ORM medeia | `CREATE TABLE tarefas` (estrutura, sem dado de usuário) |
| schema Drizzle → banco físico | Divergência silenciosa `schema.ts` ↔ banco real é o risco histórico do projeto (Fases 4/6/7) | definição de tabela |
| formulário do navegador → Server Action | `FormData` não confiável cruza em `createTarefa`/`updateTarefa` | `descricao` (texto livre), `data` (string ISO) |
| componente cliente → Server Action posicional | `id: number` do cliente cruza em `concluirTarefa`/`deleteTarefa` | id de tarefa |
| Server Action → SQLite | Toda escrita, incluindo o único hard-delete legítimo do `src/` | linha de `tarefas` |
| Server Component `/` → cliente | `page.tsx` serializa leads + tarefas para o `FollowupDashboard` | descrição de tarefa (texto do próprio admin) |
| descrição de tarefa → DOM | Texto arbitrário renderizado no card, `title`, `aria-label`, corpo do dialog de exclusão | texto do admin |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-12-01 | Tampering | `scripts/migrate-tarefas.cjs` (DDL contra banco local) | mitigate | Backup `wal_checkpoint(TRUNCATE)` + `copyFileSync` antes de qualquer escrita (`migrate-tarefas.cjs:33-42`); `CREATE TABLE` guardado por `sqlite_master` (idempotente, sem `DROP`/`ALTER`, `:50-57`); contagem de `leads` conferida antes/depois. Rodado 2x contra `data/crm.db`, 37 leads intactos. | closed |
| T-12-02 | Tampering | `drizzle-kit push` acidental | mitigate | Nenhuma entrada `drizzle-kit` no bloco `scripts` de `package.json`; migração feita por `.cjs` manual; proibição em doc-comment no schema e no script. *Nota: `drizzle-kit` segue como devDependency não usada (débito pré-existente do projeto todo, não introduzido pela Fase 12).* | closed |
| T-12-03 | Denial of Service (perda de dado) | `ALLOWLIST` do `guard-no-hard-delete.cjs` | mitigate | Exceção escopada a UM path exato (`src/actions/tarefa-actions.ts`, `guard-no-hard-delete.cjs:62`), nunca diretório/padrão; `CODE_PATTERNS`/`CODE_SQL_PATTERNS` de `leads`/`subnichos`/`interacoes`/`motivos_perda` intocados (`:71-91`). Gate `guard:no-hard-delete` exit 0 na suíte da fase. | closed |
| T-12-04 | Tampering | `tarefaSchema` (validação de entrada) | mitigate | `z.string().trim().min(1)` + `z.coerce.date()` (`validations.ts:229-232`); nenhum passthrough; contrato único das Server Actions. | closed |
| T-12-05 | Repudiation | ausência de auditoria de autoria de tarefa | accept | Aplicação solo de usuário único por design (`PROJECT.md` §Constraints) — não há identidade a registrar. | closed |
| T-12-06 | Elevation of Privilege | ausência de authz/tenant na tabela `tarefas` | accept | Sem multi-usuário por design; superfície `localhost` sem exposição pública. Revisitar na migração para o VPS (gate de senha no middleware — `STATE.md` §Direção de infraestrutura). | closed |
| T-12-07 | Tampering | `createTarefa`/`updateTarefa` (input de formulário) | mitigate | `safeParse(Object.fromEntries(formData))` antes de qualquer acesso ao banco; retorno de `fieldErrors` sem escrita. Casos 2/3 de `test-tarefa-actions.cjs` provam ausência de escrita em input inválido. | closed |
| T-12-08 | Tampering | `concluirTarefa`/`deleteTarefa` (id posicional) | mitigate | Guard `!Number.isInteger(id) \|\| id <= 0` antes do banco (`tarefa-actions.ts:89,115`); fracionários/zero/negativos rejeitados — coberto no harness. | closed |
| T-12-09 | Tampering (SQL injection) | queries de `tarefa-actions.ts` / `getTarefasPendentes` | mitigate | Só helpers parametrizados do Drizzle (`eq`/`and`/`isNull`/`isNotNull`); os 2 usos de `sql\`\`` são a constante `(unixepoch())` sem interpolação de dado de usuário (`tarefa-actions.ts:78,106`). | closed |
| T-12-10 | Denial of Service (perda de dado) | `deleteTarefa` (hard-delete) | mitigate | `db.delete(tarefas)` sempre com `.where(eq(tarefas.id, id))`, nunca sem WHERE; Caso 7 do harness prova remoção da linha certa. Guard continua bloqueando `.delete(leads/subnichos/interacoes/motivosPerda)` inclusive neste arquivo. Confirmado na UAT: `SELECT ... FROM tarefas` não lista a linha excluída. | closed |
| T-12-11 | Tampering | dupla-chamada de `concluirTarefa` sobrescrevendo o carimbo | mitigate | `isNull(tarefas.concluidaEm)` no WHERE torna a operação idempotente; Caso 5 do harness com valor sentinela. | closed |
| T-12-12 | Information Disclosure | mensagens de erro das actions | mitigate | Só `fieldErrors` do Zod e strings PT fixas; nenhum `err.message`/stack de banco devolvido. | closed |
| T-12-13 | Elevation of Privilege | ausência de authz — qualquer requisição conclui/exclui qualquer tarefa | accept | Solo, single-user, `localhost` por design. Revisitar na migração para o VPS. | closed |
| T-12-14 | Tampering | validação só no cliente (`zodResolver`) | mitigate | `zodResolver` do react-hook-form é conveniência de UX; a barreira real é o `safeParse` das Server Actions (12-02), que roda mesmo se o cliente for contornado. | closed |
| T-12-15 | Cross-Site Scripting | descrição renderizada no card / dialogs | mitigate | Todo texto entra como filho JSX ou valor de `title`/`aria-label` — React escapa por construção. `grep dangerouslySetInnerHTML` nos 3 componentes → nada. | closed |
| T-12-16 | Denial of Service (perda de dado) | exclusão acidental (hard-delete, D-08) | mitigate | `DeleteTarefaDialog` com `showCloseButton={false}` exige clique explícito em "Excluir"; cópia avisa "Essa ação não pode ser desfeita."; botão `variant="destructive"` separado. Confirmado na UAT (Teste 13). | closed |
| T-12-17 | Tampering | conclusão acidental pelo botão-ícone do card (sem confirmação) | mitigate | Ação reversível por design: toast "Desfazer" chama `concluirTarefa(id, { desfazer: true })`; idempotência do servidor garante que o carimbo original não é sobrescrito. Confirmado na UAT (Teste 10). | closed |
| T-12-18 | Information Disclosure | mensagens de erro na UI | mitigate | Toasts com cópia PT fixa do 12-UI-SPEC; nenhum `err.message`/stack exibido. | closed |
| T-12-19 | Information Disclosure | payload serializado para o cliente | mitigate | `getTarefasPendentes` seleciona só a tabela `tarefas` (sem PII de terceiros — sem telefone/e-mail); tabela desacoplada de `leads`, nenhum dado de lead vaza por essa rota. | closed |
| T-12-20 | Cross-Site Scripting | descrição renderizada no dashboard | mitigate | Renderização só via filho JSX / `title` / `aria-label` no `TarefaCard`; `dangerouslySetInnerHTML` ausente em toda a fase. | closed |
| T-12-21 | Tampering | perda de comportamento do card de lead na refatoração p/ `DashboardItem` | mitigate | Bloco do card de lead MOVIDO sem alteração; gate de acceptance verifica `EtapaBadge`/`WhatsAppSendButton`/`Sugestão:`/`stopPropagation` presentes. Confirmado na UAT (Teste 6). | closed |
| T-12-22 | Denial of Service | falso-positivo de "pronto" com banco fora de sincronia | mitigate | `npm run verify:schema` na suíte falha se a tabela `tarefas` ou colunas sumirem do banco real. Exit 0 na suíte da fase. | closed |
| T-12-23 | Elevation of Privilege | ausência de authz no dashboard | accept | Solo, `localhost`, sem contas — mesma disposição de T-12-13. Revisitar na migração para o VPS. | closed |
| T-12-SC | Tampering | supply chain (registry npm / shadcn) | accept | Nenhuma dependência npm nova e nenhum bloco novo do registry em toda a Fase 12 (confirmado: `git status --porcelain package.json package-lock.json src/components/ui` vazio ao fim de cada plano). Package Legitimacy Gate não se aplica. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-12-01 | T-12-05, T-12-06, T-12-13, T-12-23 | Aplicação solo de usuário único, acesso via `localhost` sem contas — não há identidade a auditar nem tenant a isolar. Mitigação (gate de senha no middleware) prevista para a migração ao VPS público, fora do escopo do v1.3. | admin (ivonilsoninveste0021) | 2026-08-30 |
| AR-12-02 | T-12-SC | Fase 12 não adiciona nenhuma dependência npm nem bloco do registry shadcn; nenhum comando de instalação foi executado. | admin (ivonilsoninveste0021) | 2026-08-30 |
| AR-12-03 | T-12-02 | `drizzle-kit` permanece como devDependency não usada — débito pré-existente de todo o projeto (Fases 4/6/7), não introduzido nem agravado pela Fase 12. Nenhum script o invoca. | admin (ivonilsoninveste0021) | 2026-08-30 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-08-30 | 23 | 23 | 0 | Claude (secure-phase, verificação retroativa contra código commitado) |

Método: registro autorado em tempo de plano (`<threat_model>` nos 4 PLANs) — modo "verify mitigations exist". Cada mitigação `mitigate` conferida contra o arquivo/linha da implementação já commitada; cada `accept` conferido contra `PROJECT.md` §Constraints e `STATE.md` §Direção de infraestrutura. Evidência cruzada com `12-UAT.md` (14/15 pass) e a suíte de gates da fase (`verify:schema`, `guard:no-hard-delete`, `test:tarefa-actions`, `npm run build` — todos exit 0).

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-08-30
