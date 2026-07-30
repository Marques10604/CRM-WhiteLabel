# Milestones

## v1.0 MVP (Shipped: 2026-07-29)

**Phases completed:** 4 phases, 15 plans, 38 tasks

**Key accomplishments:**

- Next.js 16 + Drizzle/SQLite + shadcn-on-Base-UI scaffold with a fully working sub-nicho CRUD vertical slice (create + inline rename, case-insensitive exact-dedupe, near-duplicates allowed) proving the whole stack end-to-end.
- Modal de lead com 9 campos em 3 seções (react-hook-form + Zod + Server Actions), badge de etapa e aviso de descarte, servindo a rota `/` com a lista de leads ativos ordenada por follow-up — LEAD-01 e LEAD-03 utilizáveis fim-a-fim.
- Tabela de leads totalmente interativa: sort por coluna (default follow-up mais próximo), toolbar fixa com filtro de sub-nicho/etapa/intervalo de follow-up (inclusivo nas duas pontas, resistente a fuso horário) e paginação clássica 25/página — REMIND-02 completo.
- Wizard de 3 passos completo em `/importar`: upload com drag-and-drop e detecção automática de separador/codificação, mapeamento de colunas para os campos do lead, e prévia com flags de duplicado/sub-nicho novo/sub-nicho bloqueado antes de confirmar a importação real no banco.
- Fecha o loop D-13/D-14 da Fase 2: confirmar uma importação leva o admin direto a `/importar/[batchId]`, uma tela dedicada por lote com o botão "Enviar WhatsApp" já reaproveitado da Fase 4 em cada lead — nenhum auto-disparo em sequência, sempre clique-por-clique.
- Dashboard de follow-ups em `/` agrupado por urgência (Vencidos/Hoje/Próximos 7 dias) via query pura testável, substituindo a lista de leads como tela inicial (lista movida para `/leads`).
- CRUD completo de templates de WhatsApp (tabela `templates`, Server Actions, tela `/templates`) com invariante "um padrão por tipo" garantido atomicamente via `db.transaction()` no servidor.
- Vertical slice de envio de WhatsApp: `renderTemplate()`/`buildWaLink()` puros, botão ícone `WhatsAppSendButton`, e modal `WhatsAppPreviewDialog` (seletor de tipo + textarea editável) ligados no dashboard de follow-ups e nos cards do pipeline, completando D-14/D-15/D-16/D-17.
- Ao criar manualmente um lead em qualquer superfície (`/`, `/leads`, `/pipeline`), `createLead` agora retorna o lead inserido via `.returning()` e um novo hook compartilhado `useFirstContactTrigger` abre automaticamente o modal de preview de WhatsApp com o template padrão de 1º contato e o subtítulo mandatório da UI-SPEC, sem bloquear a criação nem exigir opt-in — fechando o loop WA-04.

---

## v1.1 Importação Inteligente (Shipped: 2026-07-30)

**Phases completed:** 1 fase (Fase 5), 2 planos

**Key accomplishments:**

- `buildNotasText`/`mapCsvRows` estendidos em `src/lib/csv-import.ts` para concatenar múltiplas colunas de origem do CSV do cowork (score/sinal_dor/trecho_dor/observacao) num único campo `notas` formatado e legível, com o fallback padrão aplicado sobre o resultado final concatenado — corrigindo a regressão em que o texto genérico "Importado via CSV." podia se misturar com colunas reais.
- Wizard de importação ganhou a seção "Colunas extras para notas (opcional)" em `csv-column-mapper.tsx`, com checkboxes das colunas ainda não mapeadas e resumo ao vivo da ordem de concatenação (ordem do arquivo, não de clique) — totalmente compatível com o mapeamento 1-pra-1 já existente (IMPORT-04/IMPORT-05).
- Todos os 7 passos do `<human-check>` originalmente planejado foram confirmados por teste real de navegador (`gsd-browser`) nesta sessão de fechamento — algo inédito no projeto até aqui (fases anteriores nunca tiveram acesso a navegador). O próprio teste revelou e corrigiu 3 problemas reais: WR-01 (resumo ao vivo desatualizado após remapear coluna), CR-01 (prévia travava indefinidamente se a busca de dados de apoio falhasse) e um achado novo (quebra de linha na coluna Notas da prévia colapsada pelo CSS padrão da tabela).

---
