# Phase 5: Notas Enriquecidas na Importação CSV - Context

**Gathered:** 2026-07-29
**Status:** Ready for planning

<domain>
## Phase Boundary

O wizard de importação CSV (`/importar`) passa a aceitar, no passo de mapeamento, marcar **múltiplas colunas de origem** do arquivo (ex: `score`, `sinal_dor`, `trecho_dor`, `observacao`, e qualquer outra coluna de inteligência que a skill de prospecção do cowork gere) para serem concatenadas automaticamente em um único campo de notas formatado e legível no lead importado. O mapeamento 1-pra-1 já existente do campo "Notas" continua funcionando sem mudança — CSVs simples (uma coluna de notas só) importam exatamente como hoje. Esta fase cobre apenas a mecânica de seleção/concatenação/formatação das notas — não cobre priorização visual, badges de risco, novo campo de score dedicado, ou mudança na lógica de deduplicação (ver Deferred Ideas).

</domain>

<decisions>
## Implementation Decisions

### Seleção de colunas múltiplas (UI)
- **D-01:** Nova seção de checkboxes, separada do mapeamento 1-pra-1 existente, abaixo dele no mesmo passo "Mapeie as colunas" — não transforma o `Select` atual do campo "Notas" em multi-select, não usa detecção automática por nome de coluna.
- **D-02:** A lista de checkboxes mostra **todas as colunas do CSV ainda não mapeadas** em nenhum campo fixo (nome, telefone, sub-nicho, canal, origem, valor, notas) — funciona para qualquer CSV, não só o do cowork. Uma coluna já usada em um campo fixo não aparece duplicada na lista de checkboxes.
- **D-03:** Se não sobrar nenhuma coluna não mapeada, a seção inteira não é renderizada (sem mensagem de "vazio").
- **D-04:** Rótulo da seção: **"Colunas extras para notas (opcional)"**.

### Formatação do texto concatenado
- **D-05:** Cada coluna extra marcada aparece com **rótulo neutro** = nome exato do cabeçalho do CSV (ex: `Score: 4`, `sinal_dor: dor_confirmada`) — sem tabela de tradução para nomes amigáveis, sem explicar a escala do score no rótulo (evita sugerir "chance de fechar" quando na verdade é proxy de visibilidade — ver Specific Ideas).
- **D-06:** Separador entre colunas = **quebra de linha** (uma coluna extra por linha dentro do campo notas).
- **D-07:** Célula vazia numa coluna extra para uma linha específica → **omite a linha inteira** daquela coluna no texto final (nunca mostra "Campo: " vazio ou "(não informado)").
- **D-08:** Ordem das colunas no texto final = **ordem em que aparecem no arquivo CSV** (esquerda→direita), não a ordem em que o admin marcou os checkboxes. Sem controle de reordenar manualmente (drag-and-drop ou subir/descer) — mantém o passo de mapeamento simples.
- **D-09 (SC #4 do roadmap):** O wizard mostra ao admin, **no próprio passo de mapeamento**, um texto de resumo abaixo dos checkboxes indicando quais colunas serão concatenadas e em que ordem (ex: "Serão concatenadas: score → sinal_dor → trecho_dor"), atualizado ao vivo conforme marca/desmarca — não espera o admin avançar até a prévia para conferir.

### Convivência com o mapeamento 1-pra-1 de notas existente
- **D-10:** Se o admin mapear a coluna "Notas" (1-pra-1) **E** marcar colunas extras, o resultado é a **concatenação de tudo**: o valor da coluna "Notas" mapeada entra primeiro (sem rótulo — é o próprio campo notas, `Notas: ...` seria redundante), seguido pelas colunas extras com rótulo, na ordem do CSV (D-08). Nada se perde — cumpre IMPORT-04 ("sem perder nenhuma coluna mapeada").
- **D-11:** Se o admin não mapear "Notas" 1-pra-1 nem marcar colunas extras, o comportamento não muda: usa o default já existente (`CSV_DEFAULTS.notas = "Importado via CSV."`), garantindo compatibilidade total com CSVs simples (IMPORT-05).

### Claude's Discretion
- Nome/estrutura exata do novo tipo/estado que representa "colunas extras marcadas" no `CsvColumnMapping` ou tipo irmão em `src/lib/csv-import.ts` — não especificado pelo admin além do comportamento (D-01 a D-11).
- Exact shape da função de concatenação (nova função em `csv-import.ts` vs. lógica inline em `mapCsvRows`) — implementação, não decisão de produto.
- Onde exatamente entra a UI de resumo (D-09) — texto simples abaixo dos checkboxes, formatação exata — CSS/layout não especificado pelo admin além de "abaixo dos checkboxes".

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Schema real do CSV do cowork (MUITO mais importante que os 4 exemplos citados em REQUIREMENTS.md)
- `C:\Users\Vencedor\Desktop\Projetos\LEAD_HUNTER_SPEC_PARA_CRM.md` — **leitura obrigatória antes de planejar.** Spec técnica completa da skill `lead-hunter` que gera o CSV real. Revela que o schema de saída tem **19 colunas fixas** (não apenas os 4 exemplos de REQUIREMENTS.md): `nome, score, tipo_url, telefone, link_whatsapp, whatsapp_provavel_fixo, endereco, categoria, nota, avaliacoes, website, instagram, nome_decisor, linkedin_url, linkedin_cargo, sinal_dor, trecho_dor, match_verificacao, observacao` (seção 6, ordem fixa). D-02 (mostrar todas as colunas não mapeadas como checkbox) já cobre esse volume genericamente, sem precisar de lista hardcoded. Define também a fórmula exata do `score` (0-6, proxy de visibilidade/volume, seção 3.1) e a definição de `sinal_dor`/`trecho_dor` (seção 4) — usado para calibrar D-05 (rótulo neutro, sem explicar a escala).

### Requisitos & escopo
- `.planning/REQUIREMENTS.md` — IMPORT-04, IMPORT-05
- `.planning/ROADMAP.md` — Phase 5 goal, success criteria (SC #1-4), depende de Phase 2
- `.planning/PROJECT.md` — meta do milestone v1.1, "Fora de escopo": conectar landing page pública, sem hospedagem na nuvem

### Motor de mapeamento/CSV existente (Fase 2) — esta fase estende, não substitui
- `src/lib/csv-import.ts` — `CsvColumnMapping`, `CsvFieldKey`, `CSV_DEFAULTS`, `mapCsvRows()` — ponto central de extensão para D-01 a D-11.
- `src/components/csv-column-mapper.tsx` — UI do passo "Mapeie as colunas" (`FIELD_CONFIGS`, `Select` por campo) — onde a nova seção de checkboxes (D-01) é adicionada.
- `src/components/csv-import-wizard.tsx` — máquina de estados do wizard (upload → mapping → preview); `EMPTY_MAPPING`, `handleMappingChange`, `handleContinueToPreview`.
- `src/components/csv-import-preview-table.tsx` — tabela de prévia; coluna "Notas" já exibe o resultado — deve continuar mostrando o texto concatenado final por linha.
- `.planning/phases/02-csv-bulk-import/02-CONTEXT.md` — D-02/D-03 (auto-detect delimiter/encoding), D-04 (só nome+telefone são colunas garantidas, resto opcional/mapeável) — convenções que esta fase deve seguir sem quebrar.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CsvColumnMapping` (`src/lib/csv-import.ts`) — tipo `Record<CsvFieldKey, string | null>` hoje 1-pra-1; precisa de campo/tipo irmão para as colunas extras marcadas (Claude's Discretion na forma exata).
- `mapCsvRows()` (`src/lib/csv-import.ts`) — função central que monta `MappedCsvRow` a partir do mapping; é onde a concatenação (D-05 a D-11) deve ser calculada, para que `csv-import-preview-table.tsx` continue só renderizando (padrão já estabelecido: "este componente só renderiza, nunca recalcula").
- `CSV_DEFAULTS.notas = "Importado via CSV."` — default existente, preservado por D-11.
- `FIELD_CONFIGS` (`src/components/csv-column-mapper.tsx`) — padrão de configuração declarativa por campo; a nova seção de checkboxes (D-01) deve seguir visual/estrutura consistente com esse componente.

### Established Patterns
- "Componente só renderiza, nunca recalcula" (comentário em `csv-import-preview-table.tsx`) — a concatenação deve acontecer em `csv-import.ts`/`mapCsvRows`, não no componente de prévia.
- Rótulos exatos do UI-SPEC (mesmo vocabulário do formulário de lead, Fase 1) — nova seção de checkboxes deve seguir o mesmo tom direto/simples dos rótulos existentes.
- Todas as colunas do CSV vêm de `Object.keys(state.parsedRows[0] ?? {})` — mesma fonte que já alimenta `CsvColumnMapper`, reutilizável para calcular quais colunas "ainda não mapeadas" (D-02).

### Integration Points
- Novo estado de "colunas extras marcadas" precisa viajar junto com `mapping` no `WizardState` (`csv-import-wizard.tsx`), sobrevivendo a "Voltar ao mapeamento" (`handleBackToMapping`) do mesmo jeito que `mapping` já sobrevive hoje.
- `handleContinueToPreview` precisa passar as colunas extras marcadas para `mapCsvRows` (ou equivalente) ao montar `mappedRows`.

</code_context>

<specifics>
## Specific Ideas

- **Fórmula exata do `score`** (fonte: `LEAD_HUNTER_SPEC_PARA_CRM.md` seção 3.1, confirmada pelo usuário): soma de 0 a 6 pontos — nota do Google (4,5+ = 2pts, 4,0-4,49 = 1pt, <4,0 = 0), quantidade de reviews (50+ = 3pts, 20-49 = 2pts, 10-19 = 1pt, <10 = 0), ausência de site (+1pt, sinal de oportunidade). **É proxy de visibilidade/volume, não de dor real** — por isso D-05 usa rótulo neutro "Score: N" sem explicar a escala, para não sugerir "chance de fechar" ao admin.
- **`sinal_dor`/`trecho_dor`** pesam mais que `score` na priorização de fato (o admin confirmou: "um lead com score médio e dor confirmada é aposta melhor que um lead com score alto e sem sinal claro") — informação de contexto, não uma decisão de implementação desta fase, mas relevante para o researcher/planner entenderem por que os rótulos não devem imply hierarquia de importância.
- O admin confundiu momentaneamente uma pergunta sobre reordenar colunas com o backlog item "auto-avançar etapa Novo→Contatado ao clicar em Abrir WhatsApp" (já documentado em `REQUIREMENTS.md` v1.2+, não relacionado a esta fase) — esclarecido durante a discussão, sem impacto nas decisões.

</specifics>

<deferred>
## Deferred Ideas

Vieram à tona ao ler `LEAD_HUNTER_SPEC_PARA_CRM.md` (seção 7, "sugestões, não implementadas"), mas são novas capacidades fora do escopo de IMPORT-04/05 — não fazem parte desta fase:

- **Reaproveitar `link_whatsapp` do CSV** (já vem pronto do lead-hunter, com prioridade a link direto sobre `wa.me` gerado por telefone) em vez de sempre reconstruir o link a partir do telefone — otimização futura do fluxo de WhatsApp (Fase 4), não desta fase de notas.
- **Badge visual para `whatsapp_provavel_fixo`** (aviso de número provavelmente fixo) — candidato a fase futura de UI/pipeline, não notas.
- **Sinalização de risco para `match_verificacao = divergente`** (dado enriquecido pode estar errado) — candidato a fase futura, relacionado a `IMPORT-V2-01` (campo de prioridade/score dedicado) já registrado em `REQUIREMENTS.md`.
- **Deduplicação por `nome + endereco`** em vez de/além de telefone — o doc do lead-hunter sugere isso como chave mais confiável para evitar duplicar o mesmo lead entre rodadas de CSV diferentes. Conflita/complementa a lógica de dedup por telefone já implementada na Fase 2 (D-06/D-07 em `02-CONTEXT.md`) — precisa de discussão própria, não decidido aqui.
- **Fila de priorização ordenada por `sinal_dor` → `score`** (seção 7 do doc) — relacionado a `IMPORT-V2-01` em `REQUIREMENTS.md` (v2, campo de prioridade/score dedicado visível na lista/pipeline, não só texto em notas).

### Reviewed Todos (not folded)
- `.planning/todos/pending/2026-07-21-sequencia-follow-up-escalonada.md` — matched por keyword genérica ("follow", "lead"), mas é sobre agendamento automático de follow-up, não sobre importação/notas de CSV. Já revisado e parcialmente absorvido na Fase 4 (prova de valor); a parte de cadência escalonada segue fora do escopo desta fase.
- `.planning/todos/pending/2026-07-29-conectar-captura-de-leads-da-prospec-o-ao-crm.md` — matched por keyword ("prospecção", "phase"), mas é sobre conectar a landing page pública ao CRM — explicitamente fora de escopo do milestone v1.1 inteiro (`PROJECT.md`: "Fora de escopo neste milestone: conectar a landing page pública... adiado para quando houver tráfego pago"), não só desta fase.

</deferred>

---

*Phase: 05-notas-enriquecidas-na-importa-o-csv*
*Context gathered: 2026-07-29*
