# Requirements: CRM de Leads

**Defined:** 2026-09-03
**Milestone:** v1.6 Dark Mode + Exportar CSV
**Core Value:** Nunca mais perder um follow-up e enxergar o funil de vendas de relance — substituindo a planilha do Google Sheets.

## v1.6 Requirements

Milestone pequeno — dois utilitários que faltavam. Zero mudança de schema, zero feature estrutural.

### Tema (Dark Mode)

Os tokens `.dark` já existem em `globals.css` e foram verificados na Fase 19 (contraste WCAG AA 30/30). Falta só o mecanismo de alternância. `next-themes` já está instalado (usado hoje só pelo `sonner`).

- [x] **THEME-01**: O admin alterna entre modo claro e escuro por um controle (switch sol/lua) no rodapé da sidebar
- [x] **THEME-02**: A escolha de tema persiste entre recarregamentos de página e sessões do navegador
- [x] **THEME-03**: No primeiro acesso (sem escolha salva), o app segue a preferência de esquema de cor do sistema operacional / navegador
- [x] **THEME-04**: O controle de tema mostra o estado atual e está acessível em qualquer tela; alternar o tema não causa flash de cor errada no carregamento

### Exportar CSV

- [ ] **EXPORT-01**: O admin exporta a lista de leads para um arquivo CSV a partir de `/leads`, por um botão "Exportar CSV"
- [ ] **EXPORT-02**: O CSV exportado reflete os filtros (nicho, etapa, origem) e a busca aplicados na tabela naquele momento — não a base inteira
- [ ] **EXPORT-03**: As colunas do CSV são legíveis por humano — nicho e motivo de perda como nome (não id), datas formatadas, uma linha por lead

## Future Requirements

Reconhecidos, não neste milestone.

### Handoff Prospector → CRM

- **HANDOFF-01**: Rota de entrada (API local) para o Prospector Inteligente AI cadastrar leads automaticamente
- **HANDOFF-02**: Deduplicação de lead por telefone na entrada automática
- **HANDOFF-03**: Handoff rico — o lead entra em "Contatado" já com as interações do Prospector na timeline

*Gatilho: o Prospector existir + a decisão de VPS único.*

### Teste de nicho formal

- **CAMPANHA-01**: Entidade "campanha / janela de teste" (nicho + data início/fim + meta de conversão + notas) com conversão agregada por janela no relatório

### Backlog PME

Em `.planning/todos/pending/` — avaliar prioridade num milestone futuro: tags livres por lead, temperatura automática do lead, busca global, anexo simples por lead, campo de vendedor responsável (só coluna no banco), meta mensal com barra de progresso.

### Adiado com gatilho explícito (seeds)

- Roadmap pós-cliente-pagante (proposta/orçamento, catálogo, pós-venda) — [SEED-001](.planning/seeds/SEED-001-roadmap-p-s-cliente-pagante.md)
- Infra white label / multi-tenant — [SEED-002](.planning/seeds/SEED-002-infra-white-label.md), tratado como **outro produto**

## Out of Scope

| Feature | Reason |
|---------|--------|
| Temas customizados / troca de cor de marca pela UI | O v1.6 é só claro↔escuro; a paleta é definida no código (`brand.md` / `globals.css`) |
| Agendamento de tema (auto claro de dia / escuro de noite) | Overkill para 1 usuário; a preferência do sistema já cobre quem quer isso |
| Exportar para XLSX / Google Sheets / PDF | CSV abre em qualquer planilha; formatos ricos são complexidade sem demanda |
| Exportar dados de `/relatorios` (conversão por origem/nicho/motivo) | Fora do pedido do usuário; a lista de leads é o que precisa sair do sistema |
| Importar de volta um CSV exportado (round-trip) | O wizard de importação já existe e tem contrato próprio; não é objetivo deste milestone |
| Seletor de colunas / ordem no export | O export leva as colunas relevantes da tabela; customização é YAGNI |

## Traceability

Preenchida na criação do roadmap (2026-09-04). Fase 20 e Fase 21 são independentes — sem ordem de execução obrigatória entre elas.

| Requirement | Phase | Status |
|-------------|-------|--------|
| THEME-01 | Phase 20 | Complete |
| THEME-02 | Phase 20 | Complete |
| THEME-03 | Phase 20 | Complete |
| THEME-04 | Phase 20 | Complete |
| EXPORT-01 | Phase 21 | Pending |
| EXPORT-02 | Phase 21 | Pending |
| EXPORT-03 | Phase 21 | Pending |

**Coverage:**
- v1.6 requirements: 7 total
- Mapped to phases: 7
- Unmapped: 0 ✓

---
*Requirements defined: 2026-09-03*
*Last updated: 2026-09-04 after roadmap creation (Fases 20-21)*
