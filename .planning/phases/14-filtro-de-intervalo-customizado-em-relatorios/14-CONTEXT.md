# Phase 14: Filtro de intervalo customizado em `/relatorios` - Context

**Gathered:** 2026-08-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Estender a tela `/relatorios` para que o admin possa avaliar a performance (por origem, por nicho, por motivo de perda) numa **janela de tempo arbitrária que ele escolhe** — informando data de início e data de fim — além dos presets `30d` / `90d` / `tudo` que já existem (Fase 11).

**Requisito:** METRICAS-03 (único).

**Em escopo:**
- 4ª opção "Intervalo personalizado" no seletor de período do `/relatorios`.
- 2 campos de data (início / fim) que aparecem só quando o modo personalizado está ativo.
- As 3 funções de agregação em `src/db/queries.ts` (`getContagemPorOrigem`, `getContagemPorNicho`, `getContagemPorMotivoPerda`) passam a aceitar um intervalo `{ from, to }` concreto, além do preset.
- Resolução + validação do intervalo (fim antes do início, data faltando, data ilegível na URL, data futura).
- Faixa de aviso server-rendered quando o intervalo é rejeitado.
- Intervalo sobrevive a refresh (querystring, `scroll: false` — mesmo padrão dos presets atuais).

**Fora de escopo (não discutir, não adicionar):**
- Entidade "campanha / janela de teste" formal (nicho + datas + meta de conversão) → Future `CAMPANHA-01`.
- Duração de janela fixa embutida no produto (90d / 45d) → decisão de negócio do admin, o filtro custom já resolve.
- Presets novos além de `30d` / `90d` / `tudo` / `custom`.
- Mudar a base de data de qualquer seção (origem/nicho por `createdAt`, motivos de perda por `stageChangedAt` — assimetria da Fase 11, D-11, permanece).
- Filtro de intervalo em qualquer outra tela (`/leads` já tem o seu próprio filtro de follow-up client-side, intocado).
- Persistir o intervalo escolhido em banco / `configuracoes`.

</domain>

<decisions>
## Implementation Decisions

### Querystring (área discutida)
- **D-01:** Shape da URL = `?period=custom&from=YYYY-MM-DD&to=YYYY-MM-DD`. O parâmetro `period` continua sendo a chave canônica (`30d` | `90d` | `tudo` | `custom`); `from` e `to` só são lidos quando `period === "custom"`. Presets antigos não ganham `from`/`to`.
- **D-02:** Formato das datas na URL = ISO `yyyy-MM-dd` (sem hora, sem fuso). Parse via `Date`/date-fns no servidor. Nunca `dd/MM/yyyy` na URL.
- **D-03:** O `PeriodoSelector` continua copiando **todos** os params existentes e sobrescrevendo só os relevantes (`period`, `from`, `to`) — nunca montar URL por concatenação manual (mantém o padrão atual do componente). Ao voltar para um preset, `from`/`to` são **removidos** da querystring.

### Intervalo inválido (área discutida)
- **D-04:** Quando o intervalo `custom` é inválido, a página faz fallback para o preset **`30d`** (o mesmo default de primeiro acesso da tela — o admin já conhece esse comportamento). NÃO cai em `tudo`.
- **D-05:** Contam como inválido: `to` antes de `from`; só uma das duas datas presente; `from` ou `to` ausente/ilegível/não-`yyyy-MM-dd` na URL.
- **D-06:** Data **futura** NÃO invalida o intervalo — `to` (ou `from`) no futuro é **aparado para hoje** (`endOfDay(hoje)` para `to`, mantendo `from` como veio). O intervalo segue válido, só clampado. Se depois de aparar o intervalo ficar inconsistente (ex: `from` também no futuro, ficando depois do `to` aparado), aí sim cai no fallback D-04.
- **D-07:** O aviso de rejeição é uma **faixa server-rendered** (um `<div>` discreto acima das 3 seções), texto tipo *"Intervalo inválido — mostrando os últimos 30 dias."*. Sem JS, sem toast, sem client component novo só pra isso. A faixa some sozinha no próximo período válido (não é dismissível, não persiste).
- **D-08:** A validação/resolução do intervalo é **função pura no servidor**, no mesmo espírito de `resolvePeriodRange` (sem I/O, nunca lança, nunca gera 500). Provável forma: `resolvePeriodRange` ganha a capacidade de receber `custom` + `from`/`to`, OU uma função irmã `resolveCustomRange(from, to, now)` que devolve `{ range, invalido: boolean }`. O planner decide a assinatura exata; o contrato é: entrada não-confiável da querystring → `PeriodRange` concreto + sinal de "foi rejeitado" para a página renderizar a faixa.

### Semântica das datas (área discutida)
- **D-09:** `from` = **`startOfDay(from)`** — o intervalo começa às 00:00 do dia informado.
- **D-10:** `to` = **`endOfDay(to)`** — o intervalo inclui o dia inteiro do fim (até 23:59:59.999). Digitar "de 01/06 até 30/08" pega tudo que aconteceu no dia 30.
- **D-11:** Usar sempre `startOfDay` / `endOfDay` de `date-fns` — nunca aritmética manual de milissegundos (evita bugs de fuso / horário de verão, igual ao resto de `queries.ts`).
- **D-12:** O `range` `{ start, end }` custom flui para as **3 seções exatamente igual** aos presets — a página passa o mesmo `range` para `getContagemPorOrigem` / `getContagemPorNicho` / `getContagemPorMotivoPerda`. A diferença de coluna-base (origem/nicho filtram `createdAt`, motivos de perda filtra `stageChangedAt`) já está encapsulada dentro de cada função e **não muda** — a faixa de ajuda da Seção 3 ("considera a data em que o lead foi movido para Perdido") continua valendo e fica ainda mais relevante com intervalo custom.

### Forma do seletor (área discutida)
- **D-13:** O `<Select>` de período ganha uma 4ª opção: **"Intervalo personalizado"** (`value="custom"`). Ao selecioná-la, aparecem 2 campos de data (início / fim) ao lado do `<Select>`. Nos presets `30d`/`90d`/`tudo` os 2 campos ficam **escondidos**.
- **D-14:** Cada campo de data = **`Popover` + `Calendar mode="single"`**, com um `Button variant="outline"` de gatilho mostrando ícone de calendário + data em `dd/MM/yyyy` (ou "Selecionar" quando vazio) + `ACCENT_FOCUS_RING`. É **cópia direta** do padrão já usado em `src/components/lead-table-toolbar.tsx` (campos "Follow-up início / fim").
- **D-15:** Recalculo = **automático quando início E fim estão os dois preenchidos** — o componente navega para `?period=custom&from=...&to=...` (`router.push`, `scroll: false`). Com só uma data escolhida, ainda não navega. Sem botão "Aplicar", sem estado local complexo — mesmo espírito do `PeriodoSelector` atual ("escolheu → navega").
- **D-16:** Quando `period === "custom"` está na URL, o `PeriodoSelector` renderiza os 2 campos **já preenchidos** com os valores de `from`/`to` da querystring (o gatilho do Select mostra "Intervalo personalizado", os campos mostram as datas). Divisão de responsabilidade preservada: a **página** normaliza (`searchParams` → preset + range + flag de inválido) e passa tudo pronto pro componente; o componente é só o gesto.
- **D-17:** O `PeriodoSelector` vira um client component um pouco maior (já é `"use client"`), mas continua **sem** chamar `resolvePeriodRange` / sem decidir default / sem decidir fallback — isso tudo fica no servidor.

### Claude's Discretion
- Assinatura exata da função de resolução do range custom (estender `resolvePeriodRange` vs. função irmã) — contrato definido em D-08, forma livre.
- Nomes internos de props / variáveis / componentes.
- Se os 2 date pickers ficam num sub-componente próprio (`CustomRangeFields`) ou inline no `PeriodoSelector`.
- Layout fino (gap, ordem visual, label "Início"/"Fim" acima de cada campo) — seguir o `lead-table-toolbar.tsx` e o `11-UI-SPEC.md` (ênfase por peso, nunca cor; anel de foco accent `#0D9488`).
- Texto exato da faixa de aviso (D-07) e do estado vazio quando o intervalo custom válido não tem nenhum lead ("Nenhum lead neste período." já existe nas 3 seções — reusar).
- Cobertura de teste: estender `scripts/test-relatorios-queries.cjs` (já tem 38 checagens) com casos de intervalo custom + validação; harness `.cjs` puro `:memory:` como os existentes.
- Ordem/número de planos (coarse — provável 1-2: (a) camada de servidor: resolução+validação do range + 3 queries aceitam range custom + faixa de aviso na página; (b) `PeriodoSelector` ganha modo custom + 2 date pickers).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Período / relatórios (base da Fase 11 que a Fase 14 estende)
- `src/db/queries.ts` §"Painel de Relatórios" (linhas ~229-400) — `PeriodRange`, `resolvePeriodRange` (preset → range, função pura, fallback seguro, mitigação T-11-19/T-11-20), `computeTaxaConversao`, `buildLinhasOrigem`, e as 3 agregações `getContagemPorOrigem` / `getContagemPorNicho` / `getContagemPorMotivoPerda` (todas recebem `PeriodRange`; D-09 usa `createdAt`, D-11 usa `stageChangedAt`).
- `src/app/relatorios/page.tsx` — Server Component, normalização do preset (`PRESETS_VALIDOS`, default `30d` ausente / fallback `tudo` adulterado), `Promise.all` das 3 queries, 3 seções empilhadas, `formatarTaxa` (`0%` nunca `NaN%`).
- `src/components/periodo-selector.tsx` — client component, "só o gesto": recebe `value` normalizado, copia todos os params e sobrescreve `period`, `router.push(scroll: false)`. NÃO decide default nem fallback.

### Padrão de date picker a copiar
- `src/components/lead-table-toolbar.tsx` (linhas ~130-170) — `Popover` + `PopoverTrigger` (Button outline + `CalendarIcon` + `format(date, "dd/MM/yyyy")`) + `PopoverContent` com `<Calendar mode="single" selected onSelect>`. Constante `ACCENT_FOCUS_RING` (`focus-visible:border-[#0D9488] focus-visible:ring-[#0D9488]/50`).
- `src/components/ui/calendar.tsx`, `src/components/ui/popover.tsx`, `src/components/ui/select.tsx` — primitivos disponíveis.

### Contrato visual
- `.planning/phases/11-painel-de-metricas-e-relatorio-de-motivos-de-perda/11-UI-SPEC.md` — regras de cor (ênfase por peso, nunca cor), anel de foco accent, `/relatorios` é superfície só-leitura sem CTA, default `30d` / fallback `tudo`.
- `.planning/phases/11-painel-de-metricas-e-relatorio-de-motivos-de-perda/11-CONTEXT.md` — D-06 (taxa = fechados/total), D-08/D-09/D-10/D-11/D-12 (período, base de data por seção, "A categorizar" sem tratamento especial).

### Requisito
- `.planning/REQUIREMENTS.md` — METRICAS-03 (texto do requisito), seção "Future: CAMPANHA-01" (o que NÃO é esta fase).

### Segurança (herdada da Fase 11 — o valor de `period`/`from`/`to` vem de território não-confiável)
- `.planning/phases/11-painel-de-metricas-e-relatorio-de-motivos-de-perda/11-SECURITY.md` — T-11-19 (DoS por valor inválido de `period`), T-11-20 (SQLi via `period`), T-11-21 (Lixeira vaza no relatório via `isNull(deletedAt)`), T-11-24 (fallback sem 500). Os mesmos vetores valem para `from`/`to`: nunca interpolar em SQL, virar `Date` antes de ser parâmetro do Drizzle, nunca lançar.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `resolvePeriodRange(preset, now)` em `queries.ts` — função pura preset→range; estender para `custom` ou adicionar irmã `resolveCustomRange`.
- `Popover` + `Calendar mode="single"` de `lead-table-toolbar.tsx` — o date picker inteiro, incluindo `format(d, "dd/MM/yyyy")`, o Button outline de gatilho e `ACCENT_FOCUS_RING`. Cópia direta.
- `formatarTaxa` / estado vazio "Nenhum lead neste período." — já nas 3 seções de `relatorios/page.tsx`, reusar sem mexer.
- `scripts/test-relatorios-queries.cjs` — harness `:memory:` com 38 checagens das 3 agregações; molde pronto para os casos de intervalo custom.

### Established Patterns
- **Servidor decide, cliente gesticula:** default (`30d`) e fallback (`tudo`) moram na página / `queries.ts`; `PeriodoSelector` só faz `router.push`. A Fase 14 mantém isso — a página normaliza `custom`+`from`+`to`, o componente só navega.
- **Querystring com `scroll: false`** para filtro que sobrevive a refresh — `PeriodoSelector.handleChange` e o filtro de follow-up do `lead-table-toolbar`.
- **Função pura + nunca lança** para entrada não-confiável de `searchParams` (`resolvePeriodRange` é o comentário-âncora disso).
- **`startOfDay` / `date-fns`** em toda aritmética de data (`queries.ts`, `groupByUrgency`) — nunca ms manual.
- **Agregação em SQL (`groupBy` + `sql<number>`)**, nunca `.from(leads).reduce()` em JS.
- **Harness `.cjs` puro `:memory:`** (sem ORM, sem import de TS) para testar SQL de query — `test-relatorios-queries.cjs`, `test-lead-actions.cjs`.

### Integration Points
- `src/app/relatorios/page.tsx` — ponto central: lê `searchParams` (agora `period` + `from` + `to`), normaliza, resolve range + flag de inválido, renderiza a faixa de aviso condicional, passa `range` para as 3 queries e `value`+datas para o `PeriodoSelector`.
- `src/components/periodo-selector.tsx` — ganha a 4ª opção + os 2 date pickers condicionais + a navegação `?period=custom&from&to`.
- `src/db/queries.ts` — `resolvePeriodRange` (ou irmã) + as 3 assinaturas de agregação (já recebem `PeriodRange`, então o corpo não muda — só o que alimenta o `range`).
- `scripts/test-relatorios-queries.cjs` + `package.json` script `test:relatorios` — cobertura.
- Nenhuma migração, nenhum toque em schema/banco. Nenhuma Server Action nova (tela só-leitura).

</code_context>

<specifics>
## Specific Ideas

- A faixa de aviso: *"Intervalo inválido — mostrando os últimos 30 dias."* (texto aproximado, D-07).
- Date picker idêntico visualmente ao filtro "Follow-up (início / fim)" da tela `/leads`.
- Recalculo automático ao ter as 2 datas — sem botão "Aplicar" (D-15).
- Motivo de negócio (do milestone v1.4 / memória `project_crm_despivo_saude_generico`): o admin testa nichos em janelas de tempo que ele mesmo define e o relatório responde "esse nicho converteu na janela que testei?". A Fase 14 é o que torna essa pergunta respon-ável sem o produto impor 90d/45d.

</specifics>

<deferred>
## Deferred Ideas

- **Entidade "campanha / janela de teste" formal** (nicho + data início/fim + meta de conversão + notas, com conversão agregada por janela) — Future `CAMPANHA-01` em `REQUIREMENTS.md`. Gatilho: depois de rodar alguns testes de nicho reais, se nicho plano + filtro de intervalo não bastar.
- **Salvar/nomear intervalos favoritos** ("Q3 2026", "teste dentista") — não pedido, seria outra fase.
- **Comparar dois intervalos lado a lado** — não pedido.
- **Export do relatório filtrado (CSV/PDF)** — já está no backlog PME ("exportar CSV"), fora deste milestone.

None dos itens acima entra no escopo da Fase 14 — a discussão ficou dentro do domínio.

</deferred>

---

*Phase: 14-filtro-de-intervalo-customizado-em-relatorios*
*Context gathered: 2026-08-30*
