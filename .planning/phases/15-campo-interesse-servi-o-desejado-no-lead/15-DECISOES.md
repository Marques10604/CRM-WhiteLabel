# Fase 15 — Decisões da orquestração (go-and-do)

## 2026-08-31 — Rota de execução do go-and-do 15

**Contexto:** `/go-and-do` foi acionado sem número; a fase em foco no STATE.md é a 15
(única em voo do milestone v1.4). A fase já está no disco com: planos executados
(`has_plans`/`has_verification` = true), code review (`15-REVIEW.md`, 0 critical / 0 blocker),
secure (`15-SECURITY.md`, `threats_open: 0`), validate (`15-VALIDATION.md`,
`nyquist_compliant: true`) e UAT humano completo via automação de navegador
(`15-HUMAN-UAT.md`, 5/5 `pass`, verdade conferida no `data/crm.db`).

**Decisão da camada 0 (triagem, Sub-rotina I):** não re-rodar as Etapas 4 (gates já têm
artefato) nem a Etapa 5 (UAT automatizado) — o UAT de navegador já foi executado e passou
limpo; re-executar browser automation neste host de 4GB é risco de crash sem ganho de
verdade. Seguir direto para a Etapa 6 (encerramento) via `/close-phase 15`.

**Por quê:** o `go-and-do` foi escrito para o OpenGSD; este repo roda o `get-shit-done`
antigo (nomes de comando divergem). O trabalho real que resta é fechar a fase e abrir o PR —
exatamente o que a Etapa 6 faz. O freio anti-false-ship é respeitado: o predicado nativo
`uat-passed` varre `*-UAT.md` e o `15-HUMAN-UAT.md` tem 5 `pass`.

**Como desfazer:** se quiser o UAT automatizado do go-and-do mesmo assim, rode
`/gsd-verify-work 15` antes do merge, ou reabra a fase. O PR só é aberto (não mergeado),
então nada é irreversível antes da sua revisão.
