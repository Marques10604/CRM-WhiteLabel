---
status: partial
phase: 12-agenda-tarefas-soltas
source: [12-01-SUMMARY.md, 12-02-SUMMARY.md, 12-03-SUMMARY.md, 12-04-SUMMARY.md]
started: 2026-08-30T00:22:05Z
updated: 2026-08-30T00:55:00Z
---

## Current Test

[testing complete — 14/15 pass, 1 skipped (estado vazio, precisa DB sem leads)]

## Tests

### 1. Botão "Nova tarefa" no dashboard
expected: Em `/`, botão "Nova tarefa" (variant outline, borda, sem fundo teal) à direita do botão teal "Novo lead".
result: pass
evidence: screenshot — "Novo lead" (teal) + "Nova tarefa" (branco, borda) lado a lado no topo de `/`.

### 2. Dialog de nova tarefa — só 2 campos
expected: Dialog "Nova tarefa" com exatamente 2 campos (Descrição + Data), nenhum campo de lead.
result: pass
evidence: dialog com "Descrição" ("O que precisa ser feito. Serve de título da tarefa.") + "Data" (Calendar, "Dia em que essa tarefa precisa acontecer."), rodapé Cancelar/Salvar. Zero campo de lead.

### 3. Validação de descrição obrigatória
expected: Salvar sem descrição → "Descreva a tarefa.", dialog não fecha.
result: pass
evidence: mensagem "Descreva a tarefa." em vermelho, label+input vermelhos, dialog permaneceu aberto.

### 4. Criar tarefa para hoje
expected: Criar tarefa com data de HOJE → toast "Tarefa criada.", card na seção "Hoje".
result: pass
evidence: toast "Tarefa criada.", card "Ligar pro cowork sobre o CSV de agosto" apareceu em "Hoje · 1" com data 29/08/2026 em âmbar.

### 5. Criar tarefa vencida — cor de data igual à do lead
expected: Tarefa com data de ONTEM → seção "Vencidos", data em vermelho, mesma cor dos follow-ups vencidos.
result: pass
evidence: card "Enviar proposta atrasada" em Vencidos, data "28/08/2026" no MESMO vermelho das datas de lead (25/07, 01/08, 08/08, 12/08) ao lado.

### 6. Distinção visual do card de tarefa (Success Criterion #3)
expected: Card de tarefa = ícone de lista + descrição + data apenas. Cards de lead mantêm adereços.
result: pass
evidence: cards de tarefa com ícone ListTodo à esquerda, só descrição + data; cards de lead com "A categorizar"/sub-nicho + data + badge ("Novo"/"Contatado") + ícone de WhatsApp.

### 7. Intercalação lead+tarefa por data (D-04)
expected: Itens de uma seção ordenados por data, misturados, sem bloco separado de tarefas.
result: pass
evidence: em Vencidos, a tarefa (28/08) posicionou-se APÓS todos os leads (25/07→12/08) por ordem cronológica ascendente, não num bloco à parte. Confirmado também pelo harness `test:group-by-urgency` (`proximos7Dias = [tarefa,tarefa,lead,lead]` por data).

### 8. Contagem "· N" da seção soma tarefas + follow-ups
expected: "· N" no cabeçalho conta tarefas + follow-ups.
result: pass
evidence: Vencidos passou de "· 23" para "· 24" ao adicionar 1 tarefa vencida; "Hoje · 1" com 0 leads + 1 tarefa.

### 9. Hover/foco do botão-ícone de concluir
expected: Hover no botão → círculo cinza vira círculo-check teal. Foco por teclado = mesmo efeito.
result: pass
evidence: zoom antes = `Circle` cinza; zoom durante hover = `CircleCheck` teal sobre fundo ghost. (Foco por teclado: contrato `group-focus-visible:` verificado no código, mesmo mecanismo.)

### 10. Concluir pelo card + Desfazer
expected: Clicar no ícone → card some, toast "Tarefa concluída." com "Desfazer", sem abrir o dialog. "Desfazer" → "Tarefa reaberta." e card volta.
result: pass
evidence: card sumiu de Vencidos, toast "Tarefa concluída." + "Desfazer" (dialog NÃO abriu); clicar "Desfazer" → toast "Tarefa reaberta."; após reload Vencidos voltou a "· 24" (card de volta).

### 11. Editar tarefa pelo corpo do card
expected: Clicar no corpo → dialog "Editar tarefa" com campos preenchidos, rodapé Excluir / Cancelar / Concluir / Salvar.
result: pass
evidence: dialog "Editar tarefa", descrição "Enviar proposta atrasada" + data 28 pré-selecionada, rodapé: Excluir (vermelho, à esquerda) · Cancelar · Concluir (ícone CircleCheck) · Salvar (teal).

### 12. Salvar edição de data — migra de seção
expected: Alterar data para +3 dias e Salvar → toast "Tarefa salva.", card migra para "Próximos 7 dias".
result: pass
evidence: data alterada de 28/08 para 01/09, Salvar → toast "Tarefa salva.", card apareceu em "Próximos 7 dias · 1"; reabrir o dialog confirmou 01/09 persistido.

### 13. Excluir tarefa — confirmação não-dispensável + hard-delete
expected: "Excluir" abre dialog "Excluir tarefa" com aviso "Essa ação não pode ser desfeita." e SEM X. Confirmar → toast "Tarefa excluída.", card some, linha some do banco.
result: pass
evidence: dialog "Excluir tarefa" com a cópia exata e SEM botão X (showCloseButton={false}); confirmar → toast "Tarefa excluída.", card sumiu, seção "Próximos 7 dias" (·1) desapareceu por completo. `SELECT id,descricao,concluida_em FROM tarefas` NÃO lista mais a linha (id 2 sumiu) — prova do hard-delete D-08.

### 14. Estado vazio com 3 CTAs
expected: Dashboard sem follow-up nem tarefa → heading "Tudo em dia!", body "Nenhum follow-up ou tarefa pendente.", 3 CTAs "Ver todos os leads" · "Nova tarefa" · "Novo lead".
result: skipped
reason: Não é possível zerar os 23+ leads reais com follow-up sem destruir dados de produção. A cópia exata e o ramo de 3 CTAs foram verificados por leitura de código (12-04-SUMMARY §Accomplishments item 6) e pelo `npm run build` exit 0. Testar num banco de UAT dedicado numa próxima oportunidade.

### 15. Nenhuma rota nova no menu
expected: Nenhum item novo no menu lateral — a agenda vive dentro de `/`.
result: pass
evidence: menu lateral com os mesmos 10 itens de antes da fase (Follow-ups, Leads, Importar, Pipeline, Relatórios, Templates, Sub-nichos, Motivos de Perda, Lixeira, Configurações). `npm run build` lista as mesmas 13 rotas de antes da Fase 12.

## Summary

total: 15
passed: 14
issues: 0
pending: 0
skipped: 1
blocked: 0

## Gaps

[none — 0 issues found]

## Notas da execução

- UAT conduzida via automação de navegador (extensão Claude no Chrome) contra `npm run dev` em `localhost:3000`, host 4GB. A extensão teve instabilidades intermitentes de screenshot/viewport (mesmo sintoma já registrado na Fase 11); contornado com `read_page`/`get_page_text`/`zoom` e reloads. Nenhuma instabilidade afetou os resultados funcionais.
- Dados de teste (2 tarefas criadas durante a UAT) limpos ao final — tabela `tarefas` vazia.
- 1 item pulado (estado vazio) — não é defeito, é limitação de ambiente. Não gera gap para `--gaps`.
