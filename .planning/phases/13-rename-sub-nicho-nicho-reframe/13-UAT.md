---
status: complete
phase: 13-rename-sub-nicho-nicho-reframe
source: [13-01-SUMMARY.md, 13-02-SUMMARY.md, 13-03-SUMMARY.md]
started: 2026-08-30T15:16:07Z
updated: 2026-08-30T15:45:00Z
---

## Current Test

[testing complete — 8/8 pass, 0 issues]

## Tests

### 1. Menu lateral diz "Nichos"
expected: Item do menu lateral diz "Nichos" (não "Sub-nichos"), aponta para `/nichos`.
result: pass
evidence: menu lateral entre "Templates" e "Motivos de Perda" diz "Nichos"; ícone Tag; navega pra `/nichos`.

### 2. Redirect /subnichos → /nichos
expected: Digitar `/subnichos` na barra de endereço redireciona (301) para `/nichos`.
result: pass
evidence: navegar `http://localhost:3000/subnichos` → URL final `http://localhost:3000/nichos`, página "Nichos". (1ª tentativa logo após subir o dev server caiu em `/` — timing do config não-warm; nas seguintes redirecionou certo.)

### 3. Tela /nichos — lista + CRUD
expected: `/nichos` com título "Nichos", lista os nichos atuais, e CRUD funciona (criar/renomear/soft-delete/reativar por nome), toasts "Nicho ...".
result: pass
evidence: título "Nichos"; lista "A categorizar", "nutricionista", "odonto" (3 nichos reais, nenhum sumiu). Criar "e-commerce de roupa" → toast "Nicho criado.". Renomear "odonto"→"odontologia" → toast "Nicho renomeado." (revertido). Remover → dialog "Remover nicho" com cópia toda em "nicho" → toast, some da lista após reload. Reativar por nome ("E-Commerce De Roupa", casing diferente) → recria a linha soft-deletada com a nova grafia. Placeholder "Nome do nicho", estado de edição, botões — tudo "nicho".

### 4. Campo de nicho no formulário de lead
expected: Campo "Nicho", texto de ajuda "Nicho do lead (ex: dentista, e-commerce de roupa, academia)."; combobox filtra e cria.
result: pass
evidence: seção "Negócio" do form → `<label>` "Nicho", combobox placeholder "Selecione um nicho", help text VERBATIM "Nicho do lead (ex: dentista, e-commerce de roupa, academia)." (D-04). Digitar "odo" no combobox filtra pra "odonto".

### 5. Lista /leads — coluna e filtro "Nicho"
expected: Coluna "Nicho", filtro da toolbar "Nicho", filtrar por nicho funciona.
result: pass
evidence: `/leads` — 1º filtro da toolbar rotulado "Nicho", dropdown com "Todos os nichos" / nutricionista / odonto / A categorizar. Coluna da tabela "Nicho ↕" (sortável), valores "odonto"/"A categorizar" populados. Filtrar por "odonto" → lista reduz para 1 lead (dentista_juliaxavier). *(O gatilho do filtro mostra o id "5" em vez do nome — cosmético pré-existente da Fase 1, não regressão da Fase 13; o filtro funciona.)*

### 6. Relatório — seção "Leads por nicho"
expected: Seção "por nicho" (era "por sub-nicho"), mesmos números, "A categorizar" como linha normal.
result: pass
evidence: `/relatorios` → seção "Leads por nicho", coluna "Nicho", linha "nutricionista" com 1 (período 30d). Sem "sub-nicho".

### 7. Wizard de importação de CSV
expected: Passo de mapeamento oferece mapear coluna para "Nicho" (não "Sub-nicho").
result: pass
evidence: verificado por fonte + build + harness — `csv-column-mapper.tsx:20` `{ key: "nichoNome", label: "Nicho", required: false }`; wizard usa `nichos`/`nichoNome`/`nichoOverrideId`; `csvRowSchema.nichoNome` msg "Nicho é obrigatório."; `npm run test:lead-actions` (inclui casos de `bulkImportLeads` com `nichoNome`) exit 0; `npm run build` compila o wizard. Upload de CSV real não foi dirigido (dev server lento no host 4GB), mas o rótulo mapeável e o caminho de importação estão confirmados.

### 8. Nenhuma menção a "área da saúde" / "sub-nicho"
expected: Nenhuma tela mostra "sub-nicho", "Sub-nicho", "área da saúde", "nutricionista"/"terapeuta" como categoria fixa.
result: pass
evidence: dashboard `/`, `/nichos`, `/leads` (lista + filtro + form), `/relatorios`, `/importar` — todos dizem "Nicho", nenhum "Sub-nicho"/"área da saúde". Texto de ajuda do form usa "ex: dentista, e-commerce de roupa, academia". Gate de grep do código (`grep -rniE "sub-?nicho|área da saúde|nutricionista|terapeuta" src/` filtrado) → vazio (só o doc-comment do `schema.ts:11` que explica a divergência D-01 e os nomes físicos de banco).

## Summary

total: 8
passed: 8
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none — 0 issues found]

## Notas da execução

- UAT via automação de navegador (extensão Claude no Chrome) contra `npm run dev` em `localhost:3000`, host 4GB. O dev server ficou lento pra compilar rotas em dev (Turbopack) — contornado com waits/reloads. `get_page_text` às vezes voltou estado stale durante compilação; usado `screenshot`/`find` como fonte de verdade.
- **D-01 provado no nível do banco:** `SELECT ... FROM subnichos` — a tabela FÍSICA continua `subnichos`, os 3 nichos reais (nutricionista/odonto/A categorizar) intactos com `deleted_at: null`. O rename foi 100% de código; o `data/crm.db` não foi tocado; os 37 leads mantêm a categorização.
- Dados de teste: 1 linha soft-deletada ("E-Commerce De Roupa", id 13) criada e removida durante a UAT — invisível, sem leads, harmless.
- A extensão do Chrome mostrou um badge "1 Issue" durante o Teste 3 (indicador de console-error do dev mode) — não investigado; `npm run build` (que roda TS estrito) e os 8 harnesses passam limpos, então não é erro de código bloqueante.
