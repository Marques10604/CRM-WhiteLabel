---
status: partial
phase: 04-follow-up-dashboard-whatsapp-outreach
source: [04-VERIFICATION.md]
started: 2026-07-22T03:41:08Z
updated: 2026-07-22T03:41:08Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Dashboard renderiza corretamente
expected: 3 seções por urgência (Vencidos vermelho, Hoje âmbar, Próximos 7 dias cinza), item clicável abre modal de edição, estado "Tudo em dia!" quando vazio, "Novo lead" abre LeadFormDialog em modo criação sem navegar para /leads.
result: [pending]

### 2. CRUD completo de templates com "um padrão por tipo"
expected: criar template de cada tipo com variáveis, marcar padrão, criar segundo do mesmo tipo e marcar padrão (primeiro perde badge), editar, excluir com confirmação.
result: [pending]

### 3. Botão WhatsApp + preview no dashboard e pipeline
expected: preview abre com mensagem preenchida, textarea editável atualiza link ao vivo, telefone inválido desabilita botão com tooltip, botão no pipeline não colide com drag-and-drop nem edição do card.
result: [pending]

### 4. Auto-gatilho de 1º contato (WA-04) nas 3 superfícies
expected: criar lead em /, /leads e /pipeline abre automaticamente o preview de 1º contato com subtítulo mandatório; fechar sem enviar não desfaz criação; editar lead existente NÃO dispara.
result: [pending]

### 5. (CR-01) Boundary de 7 dias
expected: lead com follow-up exatamente hoje+7 aparece em "Próximos 7 dias", não desaparece.
result: [pending]

### 6. (CR-02) Race condition no drag-to-Perdido
expected: arrastar dois leads para "Perdido" em sequência rápida não perde nenhuma transição de etapa após refresh.
result: [pending]

### 7. (WR-01/WR-02) stageChangedAt e motivoPerda
expected: lead criado direto em "Contatado" fica elegível para "esfriando"; reativar lead antes "Perdido" limpa motivoPerda.
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps
