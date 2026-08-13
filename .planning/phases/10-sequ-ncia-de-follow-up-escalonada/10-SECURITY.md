---
phase: 10
slug: sequ-ncia-de-follow-up-escalonada
status: verified
threats_open: 0
asvs_level: 1
created: 2026-08-13
---

# Phase 10 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| aplicação → SQLite (`data/crm.db`) | Banco com dados reais de produção do admin; toda DDL desta fase escreve nesse arquivo | Colunas `sequencia_posicao`, `sequencia_intervalos_dias` |
| repositório → gate de schema | `scripts/verify-schema.cjs` é a única barreira automatizada contra "schema.ts diverge do banco vivo" | N/A (guarda estrutural) |
| cliente → contrato Zod | `configuracoesServerSchema` / `whatsappContactSchema` são a validação autoritativa de tudo que chega dos formulários | Lista de intervalos, tipo/texto de mensagem WhatsApp |
| client → Server Action | `registerWhatsAppContact` / `updateLeadStage` / `updateLead` / `saveConfiguracoes` são endpoints HTTP internos — argumentos podem ser forjados ou reproduzidos via DevTools | `leadId`, `tipo`, `texto`, `stage`, lista de intervalos |
| escrita concorrente → linha de `leads` | Drag no board e clique de WhatsApp no mesmo lead podem colidir entre o SELECT fresco e o UPDATE | `stage`, `contactAttempts`, `sequenciaPosicao` |
| repositório → guarda de convenção | `scripts/verify-sequencia-posicao.cjs` é a única barreira automatizada contra a remoção silenciosa do avanço/reset de sequência | N/A (guarda estrutural) |
| formulário → coluna JSON | Array de intervalos digitado pelo admin é serializado como JSON e lido por todas as páginas que calculam sugestão | `sequenciaIntervalosDias` (JSON) |
| Server Component → Client Component | Props atravessam a fronteira de serialização do RSC; tudo que chega ao cliente é dado já resolvido, não lógica | `sugestaoPorLead`, dados de lead |
| dado derivado → interface | A sugestão é exibida ao lado de um campo editável (`followUpDate`); confundir os dois levaria o admin a decisões erradas | Data sugerida vs. data real de follow-up |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-10-01 | Tampering | `ALTER TABLE` sobre `data/crm.db` | mitigate | Backup (`wal_checkpoint(TRUNCATE)` + `copyFileSync`) antes da 1ª escrita; guarda de idempotência via `PRAGMA table_info`; verificação de contagem de linhas antes/depois; `drizzle-kit push/generate` proibidos para estas colunas | closed |
| T-10-02 | Tampering | Payload JSON malformado/gigante em `sequencia_intervalos_dias` | mitigate | `sequenciaIntervalosSchema` (Zod, array de inteiros ≥1, mínimo 1 item) valida a forma antes de qualquer escrita; script de migração confirma via `JSON.parse` que toda linha existente é array de inteiros positivos | closed |
| T-10-03 | Information Disclosure | Sugestão calculada para lead que não deveria recebê-la (Inbound) | mitigate | Gate `origemTipo !== "outbound"` como PRIMEIRA condição de `computeSequenciaSugestao`, ponto único do sistema (ORIGEM-03) | closed |
| T-10-04 | Denial of Service | Leitura da timeline inteira em memória para achar a última interação | mitigate | Agregação `max(created_at) GROUP BY lead_id` em SQL, apoiada pelo índice `interacoes_lead_id_idx` — nunca "buscar tudo e reduzir em JS" | closed |
| T-10-05 | Tampering | Interpolação de valores em SQL cru | accept | Só o query builder parametrizado do Drizzle é usado; o único `sql\`...\`` interpola referência de coluna tipada, nunca input de usuário | closed |
| T-10-06 | Tampering | `registerWhatsAppContact` chamado direto com `tipo="follow_up"` repetidamente para inflar `sequenciaPosicao` | accept | Ferramenta single-admin sem autenticação por decisão de produto; pior efeito é a posição do admin avançar e a sugestão sumir (D-10), sem perda de dado nem envio de mensagem; `safeParse` já rejeita `tipo` fora do enum e `texto` vazio | closed |
| T-10-07 | Tampering | Perda de escrita sob corrida (drag simultâneo ao clique) | mitigate | Incremento repetido no branch de fallback da transação, igual a `contactAttempts` hoje — nenhuma tentativa de follow-up deixa de contar quando a guarda de etapa barra o auto-avanço | closed |
| T-10-08 | Elevation of Privilege | Lead Inbound recebendo tratamento de sequência por um write-path | accept | Deliberado: gate ORIGEM-03 é de leitura e vive só em `computeSequenciaSugestao`; incrementar a posição de um Inbound é inofensivo pois o valor nunca é lido para exibição desse tipo de lead | closed |
| T-10-09 | Repudiation | Avanço de posição sem rastro na timeline | mitigate | Insert incondicional em `interacoes` dentro da mesma `db.transaction()` (Fase 9) — todo avanço tem evento correspondente com data e texto | closed |
| T-10-10 | Tampering | SQL injection via `sql\`${leads.sequenciaPosicao} + 1\`` | mitigate | Template `sql` interpola referência de coluna tipada do Drizzle, nunca string de usuário; nenhuma concatenação livre | closed |
| T-10-11 | Tampering | `saveConfiguracoes` com payload forjado (não-números, negativos, zero) | mitigate | `configuracoesServerSchema.safeParse` valida a forma antes de qualquer escrita (inteiros ≥1, mínimo 1 item); falha devolve erros sem tocar o banco — validação client é só feedback antecipado | closed |
| T-10-12 | Tampering | Perda silenciosa de dados por `Object.fromEntries` descartando chaves repetidas | mitigate | `formData.getAll("intervaloDias")` explícito + comprovação de que N entradas persistem N valores | closed |
| T-10-13 | Denial of Service | Lista com milhares de intervalos inflando a coluna JSON e o cálculo por página | accept | Uso solo, entrada manual linha a linha na UI; payload realista é dezenas de itens; teto artificial contradiria D-04 ("sem teto") — reavaliar só se uso real mostrar listas absurdas | closed |
| T-10-14 | Tampering | JSON malformado gravado na coluna quebrando a leitura de `configuracoes` em todas as páginas | mitigate | Escrita passa pelo Drizzle (`mode:"json"`) sobre `number[]` já validado — nenhuma string crua do cliente chega à coluna | closed |
| T-10-15 | Information Disclosure | Lead Inbound exibindo sugestão de reabordagem (violação de ORIGEM-03) | mitigate | Gate único em `computeSequenciaSugestao`; componentes cliente só renderizam quando a prop existe e é proibido a eles ler `origemTipo`/`sequenciaPosicao` — verificado na UAT (teste 11, bloqueante) | closed |
| T-10-16 | Tampering | Cálculo migrando para o cliente e divergindo entre dashboard e pipeline | mitigate | Verificação automatizada reprova `addDays`/`sequenciaPosicao`/`sequenciaIntervalosDias` nos componentes cliente; dashboard e pipeline chamam a MESMA função pura — confirmado na UAT (testes 9/10) | closed |
| T-10-17 | Repudiation | Admin confundir a sugestão com a data real e perder um follow-up | mitigate | Cor neutra obrigatória (proibido teal/âmbar), rótulo explícito "Sugestão:" e `title` que declara o campo Follow-up como fonte oficial (D-06) — confirmado na UAT (teste 16) | closed |
| T-10-18 | Denial of Service | Agregação da timeline executada a cada request das duas rotas mais quentes | accept | `MAX(created_at) GROUP BY lead_id` apoiado por índice, volume solo (dezenas de leads); entra no `Promise.all` já existente, sem serializar I/O | closed |
| T-10-19 | Spoofing | Prop `sugestaoPorLead` manipulada no cliente via DevTools | accept | Só afeta exibição na sessão do próprio admin; nenhuma escrita depende dessa prop, nenhum dado é persistido a partir dela | closed |
| T-10-SC | Tampering | npm/pip/cargo installs (4 planos) | accept | Nenhum pacote novo instalado nesta fase — confirmado em `10-RESEARCH.md` §Package Legitimacy Audit ("não aplicável") e em `10-UI-SPEC.md` §Registry Safety (`CalendarClock` já presente em `lucide-react`); se um `npm install` surgir futuramente, o checkpoint humano bloqueante de legitimidade volta a ser obrigatório | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-10-01 | T-10-05, T-10-10 | SQL cru limitado a referências de coluna tipadas do Drizzle, nunca input de usuário — risco residual nulo | Admin (via disposição registrada no PLAN.md em tempo de planejamento) | 2026-08-13 |
| R-10-02 | T-10-06, T-10-08 | Ferramenta single-admin sem autenticação multiusuário é decisão de produto explícita (`PROJECT.md`); pior efeito de abuso é cosmético (sugestão soma/some), sem perda de dado | Admin (via disposição registrada no PLAN.md em tempo de planejamento) | 2026-08-13 |
| R-10-03 | T-10-13, T-10-18 | Volume solo (dezenas de leads); tetos artificiais contradiriam requisitos de produto (D-04 "sem teto") — reavaliar só se uso real mostrar escala anormal | Admin (via disposição registrada no PLAN.md em tempo de planejamento) | 2026-08-13 |
| R-10-04 | T-10-19 | Manipulação client-side de prop somente de exibição não persiste nem afeta outros usuários (ferramenta single-admin) | Admin (via disposição registrada no PLAN.md em tempo de planejamento) | 2026-08-13 |
| R-10-05 | T-10-SC | Nenhum pacote novo instalado nesta fase — risco de supply-chain não se materializou | Admin (via disposição registrada no PLAN.md em tempo de planejamento) | 2026-08-13 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-08-13 | 19 (+1 recorrente ×4 planos) | 19 | 0 | `/gsd-secure-phase` — registro completo em tempo de planejamento (4/4 planos com `<threat_model>`), curto-circuito de verificação (threats_open: 0, register_authored_at_plan_time: true) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-08-13
