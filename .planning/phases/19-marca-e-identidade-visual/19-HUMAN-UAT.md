---
phase: 19
slug: marca-e-identidade-visual
status: pending
blocking: false
created: 2026-09-02
method: pendente (ao vivo se houver RAM; senão code+data — precedente Fase 18)
---

# Fase 19 — Checklist de UAT humano (D-19)

> Verificação de **não-regressão visual** depois de aplicar a paleta/tipografia do
> `/brand-design` e refatorar ~190 ocorrências de cor hardcoded para tokens shadcn.
>
> **Não-bloqueante.** O gate real da fase são os sensores automáticos:
> `rm -rf .next && npm run build` verde + `npm run verify:brand` + `npm run verify:brand-md`
> + `npm run check:contrast` verdes. Este checklist é a camada humana por cima.

---

## Como executar

1. `npm run dev` e abrir `http://localhost:3000`.
2. Passar por cada rota da tabela de Cenários, em **modo claro** primeiro.
3. Para o **modo escuro**: abrir o devtools do navegador, selecionar o elemento `<html>`
   e adicionar a classe `dark` manualmente (`<html class="... dark">`). Repassar as rotas.
4. **Não existe toggle de tema na UI e isso é proposital (D-16).** O dark mode nesta fase
   é só dívida de token sendo quitada (D-15) — a verificação força `.dark` pelo devtools
   (D-17), não pela interface.
5. Marcar cada cenário como `ok` / `regressão` / `pulado` na coluna Resultado.

### Plano B — host de 4GB (não-bloqueante)

Se `npm run dev` + Chrome + a sessão do agente não couberem na RAM (precedente Fase 18:
renderer congela com ~200 MB livres), registrar cada cenário como `code+data`:
leitura da superfície no código + `rm -rf .next && npm run build` + os 3 sensores de cor,
e marcar o cenário como `deferred`. Isso é aceitável e **não bloqueia** o fechamento da fase.

---

## Definição operacional de regressão (D-19)

**Conta como regressão (BLOQUEIA):**

- Layout quebrado — elementos sobrepostos ou empurrados para fora da área visível.
- Texto ilegível / contraste medido abaixo de WCAG AA.
- Dark mode bugado **quando `.dark` está forçado**: texto invisível, superfície branca cravada.
- Elemento sumido, cortado ou truncado errado.
- Header do sidebar ("SOLO") quebrando em 2 linhas.
- Colunas do pipeline com scroll horizontal.
- Badge de etapa quebrando linha.

**NUNCA bloqueia (não é regressão):**

- "A cor mudou" / "não gostei da combinação" / "o teal sumiu" / "ficou escuro demais".
- Qualquer julgamento estético. **Mudança de cor é o objetivo declarado da fase.**

---

## Cenários — 10 rotas × (claro + `.dark` forçado) = 20

| # | Rota | Modo | O que conferir | Resultado | Nota |
|---|------|------|----------------|-----------|------|
| 1 | `/` | claro | Cabeçalhos de urgência (Vencidos / Hoje / Próximos 7 dias) com cor de status distinta e legível; card de lead com borda e foco visíveis; header do sidebar "SOLO" em 1 linha; item de nav ativo legível | | |
| 2 | `/` | `.dark` | Idem cenário 1 sem superfície branca cravada; datas de follow-up (vencido/hoje) ainda distinguíveis | | |
| 3 | `/leads` | claro | Nome do lead truncando com reticências (não quebrando linha); badges de etapa em 1 linha; botão "Enviar WhatsApp" visível e com contraste; toolbar e filtros | | |
| 4 | `/leads` | `.dark` | Idem cenário 3; tabela `@tanstack` legível, linhas zebradas não somem | | |
| 5 | `/importar` | claro | Dropzone de upload; wizard (upload → column-mapper → preview-table → post-import); checkbox nativo com `accent` na cor da marca | | |
| 6 | `/importar` | `.dark` | Idem cenário 5; badges de flag da prévia (Duplicado / Novo nicho / Sem nicho / Tel inválido / Cortado em 500) distinguíveis entre si | | |
| 7 | `/pipeline` | claro | As 5 colunas (Novo → Perdido) cabem sem scroll horizontal; card "esfriando" com borda de aviso; badges do card com `flex-wrap` | | |
| 8 | `/pipeline` | `.dark` | Idem cenário 7; coluna em hover ("esfriando" ao arrastar) muda de fundo de forma perceptível | | |
| 9 | `/relatorios` | claro | Faixa de intervalo inválido em cor de aviso; PeriodoSelector com rótulo correto; 3 seções (origem, nicho, motivos de perda) legíveis | | |
| 10 | `/relatorios` | `.dark` | Idem cenário 9; faixa de aviso não fica branca cravada | | |
| 11 | `/templates` | claro | Lista de templates; badge de tipo (`primary/10`); hover de linha; botão primário | | |
| 12 | `/templates` | `.dark` | Idem cenário 11 | | |
| 13 | `/nichos` | claro | NichoManager: formulário de criação, lista, botão de remoção (soft-delete) legível | | |
| 14 | `/nichos` | `.dark` | Idem cenário 13 | | |
| 15 | `/motivos-perda` | claro | MotivoPerdaManager: criação, lista, reativação; texto de exclusão em `destructive` | | |
| 16 | `/motivos-perda` | `.dark` | Idem cenário 15 | | |
| 17 | `/lixeira` | claro | LixeiraTable: leads soft-deletados, botão restaurar, colunas legíveis | | |
| 18 | `/lixeira` | `.dark` | Idem cenário 17 | | |
| 19 | `/configuracoes` | claro | ConfiguracoesForm: campos de dias-parado por etapa, lista dinâmica da sequência, mensagens de validação | | |
| 20 | `/configuracoes` | `.dark` | Idem cenário 19 | | |

Em **toda** rota, conferir também: header do sidebar "SOLO" em 1 linha, ícone "S", e o item de
navegação ativo com contraste suficiente contra o fundo do sidebar.

---

## Dialogs — 6 cenários extras

| # | Dialog | Onde | O que conferir | Resultado | Nota |
|---|--------|------|----------------|-----------|------|
| 21 | LeadFormDialog | `/leads` → "Novo lead" / editar | Título do dialog (usa `font-heading`, D-18); overlay escurece o fundo; campos e mensagens de erro legíveis em claro + `.dark` | | |
| 22 | LeadTimelineDialog | `/leads` → ícone de histórico | Título `font-heading`; eventos automáticos vs. notas manuais distinguíveis; overlay | | |
| 23 | WhatsAppPreviewDialog | `/leads` ou card do pipeline → "Enviar WhatsApp" | Título `font-heading`; textarea; erro "telefone inválido" em `destructive`; botão "Abrir WhatsApp" | | |
| 24 | TemplateFormDialog | `/templates` → "Novo template" | Título `font-heading`; editor de variáveis; overlay em claro + `.dark` | | |
| 25 | MotivoPerdaDialog | `/pipeline` → arrastar card para "Perdido" | Modal abre sem freeze; combobox de motivo criável legível; overlay; "Cancelar" não move o card | | |
| 26 | TarefaFormDialog | `/` → "Nova tarefa" | Título `font-heading`; campos data + descrição; overlay em claro + `.dark` | | |

---

## Resultado consolidado

- [ ] 20 cenários de rota verificados (ou registrados como `code+data` / `deferred`)
- [ ] 6 cenários de dialog verificados (ou `code+data` / `deferred`)
- [ ] Nenhuma regressão **real** (D-19) encontrada — mudança de cor não conta
- [ ] Se alguma regressão real: abrir quick task e anotar aqui

**Assinatura:** _pendente_
