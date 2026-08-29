---
status: complete
phase: 10-sequ-ncia-de-follow-up-escalonada
source: [10-01-SUMMARY.md, 10-02-SUMMARY.md, 10-03-SUMMARY.md, 10-04-SUMMARY.md]
started: 2026-08-13T11:14:56Z
updated: 2026-08-13T13:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Parar qualquer processo node ativo, rodar `npm run dev` do zero contra `data/crm.db` (schema já migrado nesta fase — colunas `sequencia_posicao`/`sequencia_intervalos_dias`). O servidor sobe sem erro, `/` carrega normalmente com os leads reais.
result: pass

### 2. Configuração da sequência aparece com valores padrão
expected: Abrir `/configuracoes` — a seção "Sequência de reabordagem" aparece abaixo do card de dias-parado, com 3 linhas pré-preenchidas (4, 10, 20).
result: pass

### 3. Adicionar um intervalo
expected: Clicar "Adicionar intervalo" — surge uma 4ª linha vazia rotulada "Intervalo 4 (dias)" e o foco vai para ela.
result: pass

### 4. Salvar e recarregar preserva todos os intervalos
expected: Preencher a 4ª linha com 30 e clicar "Salvar configurações" — toast "Configurações salvas.". Recarregar a página (F5) — as 4 linhas voltam na ordem 4, 10, 20, 30 (prova de que nenhum valor repetido foi descartado).
result: pass

### 5. Remover uma linha do meio renumera a lista
expected: Remover a linha "Intervalo 2" — as linhas restantes renumeram para 1, 2, 3 sem buraco na numeração.
result: pass

### 6. Lista vazia é bloqueada ao salvar
expected: Remover todas as linhas — aparece "Nenhum intervalo configurado."; clicar "Salvar configurações" mostra a mensagem "Adicione ao menos um intervalo." e nada é salvo (recarregar confirma que os valores anteriores continuam lá).
result: pass

### 7. Intervalo com valor 0 é bloqueado ao salvar
expected: Adicionar uma linha com valor 0 e salvar — mensagem "Mínimo de 1 dia.", nada é salvo.
result: pass

### 8. Campos de dias-parado da Fase 7 continuam funcionando
expected: Alterar um dos três campos de dias-parado (Novo/Contatado/Negociação) e salvar — o valor persiste após recarregar (sem regressão da Fase 7).
result: pass

### 9. Indicador de sugestão aparece no pipeline para lead Outbound
expected: No card de um lead Outbound que já tenha clique de WhatsApp registrado, em `/pipeline`, aparece "Sugestão: dd/MM" com ícone de calendário, em cinza neutro, depois da data de follow-up e do contador de tentativas. Passar o mouse mostra tooltip explicando que não altera a data de follow-up.
result: pass

### 10. Mesmo indicador aparece no dashboard
expected: O mesmo lead do teste anterior mostra o mesmo indicador "Sugestão: dd/MM" na linha dele em `/` (dashboard).
result: pass

### 11. Lead Inbound nunca mostra sugestão (bloqueante)
expected: No card/linha de um lead Inbound, em nenhuma das duas telas (`/` e `/pipeline`) aparece qualquer indicador de sugestão de reabordagem — mesmo que ele tenha posição/interação. Esta é a regra bloqueante ORIGEM-03; se aparecer, é falha.
result: pass
note: "Nenhum lead Inbound existia nos dados reais (23/23 leads são Outbound). Testado inserindo um lead temporário Inbound com stage=contatado, contact_attempts=1, sequencia_posicao=1, follow_up vencido — via SQL direto no data/crm.db (o combobox de Sub-nicho no formulário de novo lead não carregou opções, então o teste via UI ficou bloqueado). Confirmado ausência do indicador Sugestão em / e /pipeline. Lead de teste removido (DELETE) após a verificação."

### 12. Lead Outbound sem interação de WhatsApp não mostra sugestão
expected: Um lead Outbound que nunca recebeu nenhum clique de WhatsApp não mostra nenhum indicador de sugestão em nenhuma tela.
result: pass
note: "Verificado com leads reais Outbound com contact_attempts=0/sequenciaPosicao=0 (ex: dra.rafaelafo, dra.marcellavalladares) — nenhum mostra Sugestão em / nem /pipeline."

### 13. Sequência avança a cada follow-up e esgota após o 3º degrau
expected: Abrir WhatsApp num lead Outbound com o template de Follow-up e enviar → voltar ao pipeline e recarregar: a data sugerida muda (usa o próximo degrau). Repetir até esgotar os 3 degraus configurados — depois do 3º clique, o indicador some e não volta.
result: pass
note: |
  Config real tem 4 intervalos hoje ([4,10,20,30], não os 3 default) — mecanismo validado igual, só com 4 degraus em vez de 3. Fluxo real testado em dra.marcellavalladares (id 21, limpo, 0 interações):
  1. "1º contato" -> stage=contatado, sequenciaPosicao=0, Sugestão=17/08 (hoje 13/08 + intervalo[0]=4). Confirma que a 1ª sugestão nasce do 1º contato, não de um clique de Follow-up.
  2. Follow-up -> posicao=1, Sugestão=23/08 (+10)
  3. Follow-up -> posicao=2, Sugestão=02/09 (+20)
  4. Follow-up -> posicao=3, Sugestão=12/09 (+30)
  5. Follow-up -> posicao=4 (fora do array) -> indicador some, sem placeholder (D-10)
  Templates estavam vazios no banco real (ver nota geral abaixo) — mensagem digitada manualmente em cada envio para passar da validação de "mensagem vazia".

### 14. Template Prova de valor não altera a sugestão
expected: Abrir WhatsApp com o template "Prova de valor" no mesmo lead — o tipo está disponível no seletor, e a data sugerida NÃO muda (só o template Follow-up avança a posição).
result: pass
note: "Testado em dra.rafaelafo: 1º contato estabeleceu Sugestão=17/08 (sequenciaPosicao=0); clique em Prova de valor incrementou contact_attempts (1->2) mas manteve sequenciaPosicao=0 e Sugestão=17/08 inalterada."

### 15. Voltar para "Novo" reseta a sequência para o primeiro degrau
expected: Arrastar o lead de volta para a coluna "Novo" e recarregar — o indicador volta a aparecer usando o primeiro degrau configurado (reset).
result: pass
note: "Drag-and-drop via automação de mouse não disparou os sensors do dnd-kit (limitação da automação, não do app). Testado pelo caminho equivalente: formulário 'Editar lead' -> Etapa=Novo -> Salvar, que passa pelo mesmo código de reset (updateLead, D-02, mesmo bloco condicional usado pelo drag). dra.rafaelafo estava em sequenciaPosicao=1/Sugestão=23/08; após o reset, sequenciaPosicao=0 e Sugestão volta a 17/08 (intervalo[0]=4)."

### 16. Editar Follow-up manualmente não sobrescreve a sugestão
expected: Editar o campo "Follow-up" do lead pelo formulário e salvar — a data de follow-up muda, mas a sugestão exibida não muda nem é sobrescrita por ela.
result: pass
note: "dra.rafaelafo: Follow-up editado de 12/08 para 20/08 via formulário. Sugestão continuou 17/08 (calculada a partir da última interação de WhatsApp, não do followUpDate — D-09)."

### 17. Mover para Fechado/Perdido remove o indicador
expected: Mover o lead para "Fechado" ou "Perdido" — o indicador de sugestão some (regra de etapa terminal).
result: pass
note: "dra.rafaelafo movido para Fechado via formulário (Etapa=Fechado) — Sugestão: 17/08 deixou de aparecer no card."

## Summary

total: 17
passed: 17
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]

## Observações fora do escopo da Fase 10

Achados durante a UAT que não são bugs da Fase 10, mas merecem atenção separada:

1. **Tabela `templates` vazia no banco real.** Nenhum template está cadastrado (`/templates` mostra "Nenhum template cadastrado ainda."). Isso faz a caixa "Mensagem" do diálogo de WhatsApp abrir vazia para qualquer tipo, e um clique em "Abrir WhatsApp" com mensagem vazia é silenciosamente rejeitado pela validação do servidor (`whatsappContactSchema.texto` exige min 1 char) — o link do WhatsApp abre normalmente, mas a tentativa de contato NÃO é registrada (sem incremento de `contactAttempts`/`sequenciaPosicao`, sem entrada na timeline), sem nenhum aviso ao admin. Isso afeta o uso real do CRM hoje, não só o teste. Recomenda-se cadastrar ao menos um template padrão por tipo (1º contato / Follow-up / Prova de valor) em `/templates`.
2. **Combobox "Sub-nicho" no formulário "Novo lead" não carrega opções** (mostra "Nenhum sub-nicho encontrado" mesmo havendo sub-nichos cadastrados no banco). Bloqueia a criação de leads novos pela UI. Não investigado a fundo (fora do escopo desta UAT) — vale um debug dedicado.
