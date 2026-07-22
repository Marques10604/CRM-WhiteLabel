---
phase: 2
slug: 02-csv-bulk-import
status: draft
shadcn_initialized: true
preset: base-nova
created: 2026-07-22
---

# Fase 2 — Contrato de Design de UI

> Contrato visual e de interação para fases de frontend. Gerado por gsd-ui-researcher, verificado por gsd-ui-checker.

**Contexto do projeto:** `components.json` já existe (preset `base-nova` sobre Base UI, confirmado nas Fases 1/3/4 — `npx shadcn info` reconfirmado nesta pesquisa, nenhuma mudança). Este contrato reaproveita **integralmente** os tokens de espaçamento, tipografia e paleta 60/30/10 já aprovados em `01-UI-SPEC.md`/`04-UI-SPEC.md` — nenhuma cor, tamanho de fonte ou valor de espaçamento novo é introduzido. O que é específico da Fase 2 é a tela de importação em si (upload → mapeamento de colunas → prévia com flags → confirmar → tela pós-importação), a mais densa em superfície de UI do projeto até agora. As 3 áreas deixadas como "Claude's Discretion" em `02-CONTEXT.md` (tratamento visual das flags de linha, estrutura de rota, dobra ou não do mapeamento na prévia) são resolvidas aqui de forma prescritiva, reaproveitando o vocabulário visual (badges coloridos, cor por semântica) já estabelecido pela `etapa-badge.tsx` em vez de inventar um novo.

Nenhuma pergunta interativa foi necessária nesta pesquisa: `02-CONTEXT.md` (D-01 a D-14) e `02-RESEARCH.md` já resolvem comportamento, stack e até a recomendação de estrutura de rota; as únicas lacunas eram puramente visuais (discricionárias por design) e foram decididas abaixo com justificativa explícita, seguindo o precedente de `01-UI-SPEC.md` (nota de resolução de ambiguidade) em vez de bloquear a pesquisa.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn (já inicializado — `components.json` confirmado, `npx shadcn info` reconfirmado nesta pesquisa) |
| Preset | `base-nova` (style `base-nova`, baseColor `neutral`, cssVariables true) — inalterado, nenhum novo `shadcn init`/preset necessário |
| Component library | Base UI (mesma base das Fases 1/3/4) |
| Icon library | lucide-react — ícones novos usados nesta fase: `Upload` (dropzone de CSV), `FileWarning` (erro de arquivo inválido/zero linhas válidas), `TriangleAlert` (badge "Duplicado"), `CircleAlert` (badge "Sub-nicho obrigatório" / bloqueado), `Sparkles` (badge "Novo sub-nicho"), `Check`/`CheckCircle2` (linha confirmada / tela de sucesso pós-importação), `MessageCircle` (reaproveitado sem alteração do `whatsapp-send-button.tsx`, Fase 4) |
| Font | Geist Sans (`--font-sans`, inalterado) |
| Novas dependências npm | `papaparse` (+ `@types/papaparse` dev) — já travado em `CLAUDE.md`/`02-RESEARCH.md`; **não é um bloco de registry shadcn**, é uma lib de parsing puro sem componente visual, não entra na seção Registry Safety abaixo. Nenhum componente novo do registry shadcn é necessário: `Table`, `Dialog`, `Select`, `Field`/`Label`, `Button`, `Badge`, `Input`, `Combobox` já existem em `src/components/ui/` e cobrem 100% desta fase (ver Registry Safety). |

---

## Spacing Scale

Valores declarados (múltiplos de 4) — idênticos aos das Fases 1/3/4, reaproveitados sem alteração:

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Gap entre ícone de flag (`TriangleAlert`/`Sparkles`/`CircleAlert`) e o texto do badge dentro da célula de status |
| sm | 8px | Gap entre o nome do arquivo selecionado e o botão "Trocar arquivo" no dropzone; gap vertical entre linhas do resumo pré-confirmação ("3 duplicados", "2 sub-nichos novos", "1 bloqueado") |
| md | 16px | Padding interno de cada célula da tabela de prévia (mesmo padrão de `lead-table.tsx`); gap entre os 3 passos visuais do wizard (upload / mapeamento / prévia) |
| lg | 24px | Padding lateral da página `/importar`; separação entre o cabeçalho do wizard e o conteúdo do passo atual |
| xl | 32px | Padding vertical do container da página, mesma convenção de `/pipeline`/`/` |
| 2xl | 48px | Espaço acima/abaixo do estado vazio do dropzone (antes de qualquer arquivo selecionado) e do estado de erro (arquivo inválido/zero linhas válidas) |
| 3xl | 64px | Não usado nesta fase (reservado, mesma nota das Fases 1/3/4) |

Exceptions:
- **Combobox de sub-nicho inline em linha bloqueada (D-12):** contido a `max-w-[220px]` dentro da célula da tabela — não é um token reutilizável, é uma restrição de largura específica deste uso do `SubnichoCombobox` (Fase 1) para que ele não estique a coluna e derrape o layout da tabela de prévia. O popover do combobox renderiza em portal (Base UI), então não afeta a altura da linha quando fechado.
- **Botão "Enviar WhatsApp" inline na tela pós-importação (reaproveitado de D-14/Fase 4):** mesmo alvo de toque de 36px quadrado (`size="icon-lg"`) já usado no dashboard/pipeline — nenhuma mudança.
- **Dropzone de upload:** altura mínima de 192px (`min-h-48`) para ser um alvo de arraste confortável, consistente com o padrão de "área grande e óbvia" que dropzones de arquivo geralmente usam; não é um token reutilizável, é uma dimensão fixa deste componente específico.

---

## Typography

Reaproveitado integralmente das Fases 1/3/4 (mesmos 4 tamanhos, mesmos 2 pesos — nenhum tamanho/peso novo introduzido):

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Label | 14px | 400 (regular) | 1.5 |
| Body | 16px | 400 (regular) | 1.5 |
| Heading | 20px | 600 (semibold) | 1.2 |
| Display | 28px | 600 (semibold) | 1.2 |

Uso específico desta fase:
- **Display (28px/600):** título da página `/importar` — texto "Importar leads".
- **Heading (20px/600):** título de cada passo do wizard ("Selecione o arquivo", "Mapeie as colunas", "Revise antes de importar"); título da tela pós-importação ("Importação concluída").
- **Body (16px/400):** nome do arquivo CSV selecionado; contagem-resumo antes de confirmar (ex.: "12 leads serão importados"); nome de cada lead na lista pós-importação (mesmo padrão do nome do lead no dashboard/pipeline, Fase 4).
- **Label (14px/400):** texto de célula da tabela de prévia (mesmo padrão de `lead-table.tsx`); texto dos badges de flag (Duplicado / Novo sub-nicho / Sub-nicho obrigatório); texto de ajuda sob o dropzone ("Aceita .csv, detectamos automaticamente separador e codificação"); label de cada campo no passo de mapeamento de colunas; sub-nicho/data na lista pós-importação.

**Foco visual da tela `/importar`:** a tabela de prévia é o foco visual primário do wizard — é onde o admin toma toda decisão relevante (skip/import de duplicado, correção de sub-nicho bloqueado, conferência de sub-nichos novos) antes de qualquer escrita no banco; o cabeçalho "Importar leads" e os indicadores de passo (1/2/3) são secundários, mesma hierarquia já adotada nas Fases 1/3/4 (o dado é o protagonista, não o chrome do wizard). Na tela pós-importação, a lista de leads recém-criados é o foco primário — mesma hierarquia do dashboard de follow-ups (Fase 4).

---

## Color

Paleta dominante/secundária/accent/destructive reaproveitada **sem nenhuma alteração** das Fases 1/3/4. Esta fase não introduz nenhuma cor nova — as 3 flags de linha da tabela de prévia reaproveitam exatamente as mesmas cores semânticas já usadas nos badges de etapa/urgência das fases anteriores, mantendo o orçamento 60/30/10% intacto.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#FFFFFF` | Fundo da página `/importar`, fundo do dropzone, fundo da tabela de prévia, fundo da tela pós-importação |
| Secondary (30%) | `#F4F4F5` (zinc-100) | Sidebar (inalterado), fundo do dropzone antes de um arquivo ser solto, cabeçalho da tabela de prévia, container do resumo pré-confirmação |
| Accent (10%) | `#0D9488` (teal-600) | Ver lista explícita abaixo — nunca aplicar fora dessa lista |
| Destructive | `#DC2626` (red-600) | Ações destrutivas apenas — ver lista abaixo |
| Flag "Sub-nicho obrigatório" — bloqueia confirmação (D-12) | `#FEE2E2` / `#B91C1C` (red-100 / red-700, reaproveita a paleta "Perdido"/"Vencidos" das Fases 3/4) | Badge da linha + borda esquerda de 4px (`border-l-4 border-l-[#DC2626]`) na `<TableRow>` inteira — é a única flag que impede a confirmação, por isso é a mais forte visualmente das 3 |
| Flag "Duplicado" — decisão do admin, não bloqueia (D-05) | `#FEF3C7` / `#B45309` (amber-100 / amber-700, reaproveita a paleta "Negociação"/"esfriando"/"Hoje") | Badge da linha apenas (sem borda de linha) — sinaliza atenção sem travar o fluxo, já que o admin pode confirmar "importar mesmo assim" |
| Flag "Novo sub-nicho" — informativo (D-10) | `#DBEAFE` / `#1D4ED8` (blue-100 / blue-700, reaproveita a paleta "Contatado") | Badge da linha apenas — é a flag menos urgente das 3 (puramente informativa, "isto vai criar uma categoria nova"), por isso usa a cor mais neutra/fria do conjunto |

**Accent reserved for** (lista explícita, nada além disso — estende a lista já existente das Fases 1/3/4 com as adições desta fase):
- Botão "Selecionar arquivo" / "Trocar arquivo" no dropzone
- Botão "Continuar" entre os passos do wizard (upload → mapeamento → prévia)
- Botão "Confirmar importação" no passo de prévia (ação primária que efetivamente grava no banco)
- Botão inline "Enviar WhatsApp" na tela pós-importação (ícone `MessageCircle`, reaproveitado sem alteração de `whatsapp-send-button.tsx`, D-14)
- Botão "Abrir WhatsApp" no `WhatsAppPreviewDialog` reaproveitado (inalterado, Fase 4)
- Indicador do passo atual do wizard (1/2/3) e do item ativo "Leads"/"Follow-ups" na sidebar (se um item de nav for adicionado para `/importar` — ver Copywriting Contract)
- Anel de foco (`focus-visible`) em inputs, botões, combobox inline de sub-nicho e no dropzone (estado de foco por teclado)

**Nota de discrição — flags NÃO usam a paleta accent (teal):** a decisão foi manter as 3 flags de linha inteiramente dentro do vocabulário de badges informativos já estabelecido (`etapa-badge.tsx`), nunca usando o teal de accent para elas — o teal fica reservado só para ações que o admin executa (botões), nunca para status/estado de dado, mesma disciplina já registrada na Fase 4 para o botão de WhatsApp. Isso evita competir visualmente com os botões "Continuar"/"Confirmar importação" na mesma tela.

**Destructive reserved for**:
- Nenhuma ação de exclusão hard/soft nesta fase (importar não remove nada) — `#DC2626` aparece apenas como: (a) a borda esquerda de linha bloqueada acima, (b) o texto/ícone do estado de erro "Arquivo inválido" ou "Nenhuma linha válida encontrada", (c) toast de erro (falha ao processar CSV, falha ao confirmar importação)

**Badges de etapa (D-08, Fase 3) e paletas de urgência (Fase 4):** não usados nesta tela — leads importados entram sempre com `stage = "novo"` (default do schema), sem exibição de badge de etapa no wizard. Reaproveitados sem modificação onde já existem (não há necessidade de tocar `etapa-badge.tsx`/`followup-dashboard.tsx` nesta fase).

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Item de navegação na sidebar (novo) | "Importar" (aponta para `/importar`) — inserido logo após "Leads" em `NAV_ITEMS`, mesmo padrão de link ativo em teal já usado pelos demais itens |
| Título da página `/importar` | "Importar leads" |
| Primary CTA (passo 1 — antes de qualquer arquivo) | "Selecionar arquivo" |
| Dropzone — estado vazio (heading) | "Arraste o CSV aqui ou clique para selecionar" |
| Dropzone — estado vazio (body/ajuda) | "Aceita arquivos .csv. Detectamos automaticamente o separador (vírgula ou ponto-e-vírgula) e a codificação do arquivo." |
| Dropzone — arquivo selecionado | Nome do arquivo + botão secundário "Trocar arquivo" (outline) |
| Erro — arquivo não é um CSV válido / falha ao ler (IMPORT-03) | Heading: "Não foi possível ler este arquivo" — Body: "Verifique se é um arquivo .csv exportado do Google Sheets ou Excel e tente novamente." — Botão: "Tentar novamente" (outline, volta ao dropzone) |
| Erro — zero linhas válidas após parse/mapeamento | Heading: "Nenhuma linha válida encontrada" — Body: "O arquivo foi lido, mas nenhuma linha tem nome e telefone preenchidos. Confira o arquivo e tente novamente." — Botão: "Tentar novamente" (outline, volta ao dropzone) |
| Passo 2 — título | "Mapeie as colunas" |
| Passo 2 — ajuda | "Nome e telefone são obrigatórios. Os demais campos são opcionais — deixe em branco se o arquivo não tiver essa coluna." |
| Passo 2 — labels de campo (select por coluna do CSV) | "Nome *", "Telefone *", "Sub-nicho", "Canal", "Origem", "Valor estimado", "Notas" (mesmos rótulos de campo do formulário de lead, Fase 1, para consistência de vocabulário) |
| Passo 2 — indicador de delimitador/codificação detectados | "Detectado: separador {vírgula/ponto-e-vírgula}, codificação {UTF-8/Windows-1252}" (texto auxiliar, `text-muted-foreground`, não editável — apenas transparência per IMPORT-03) |
| Primary CTA (passo 2 → 3) | "Ver prévia" |
| Passo 3 — título | "Revise antes de importar" |
| Passo 3 — resumo acima da tabela | "{N} leads no arquivo · {D} duplicados · {S} sub-nichos novos · {B} bloqueados" (contadores por flag, mesmo formato "Nome · contagem" já usado nos cabeçalhos de seção do dashboard, Fase 4) |
| Badge de flag — duplicado (D-05) | "Duplicado" (ícone `TriangleAlert`) — tooltip/title: "Já existe um lead com este telefone" |
| Badge de flag — novo sub-nicho (D-10) | "Novo sub-nicho" (ícone `Sparkles`) — tooltip/title: "Este sub-nicho será criado automaticamente" |
| Badge de flag — bloqueado (D-12) | "Sub-nicho obrigatório" (ícone `CircleAlert`) — sem tooltip, o próprio combobox inline na linha já comunica a ação necessária |
| Ação por linha duplicada (D-05, controle inline na tabela) | Toggle/checkbox "Importar mesmo assim" (desmarcado por padrão = linha será pulada) |
| Combobox inline de sub-nicho em linha bloqueada (D-12) | Placeholder: "Selecione um sub-nicho" (mesmo placeholder do `SubnichoCombobox` já existente, reaproveitado sem alteração) |
| Resumo de sub-nichos novos (D-10, acima da tabela ou em aviso destacado) | "{N} sub-nichos novos serão criados: {lista separada por vírgula}" — dá ao admin a chance de perceber um quase-duplicado (ex. "nutri" vs "nutricionista") antes de confirmar, per D-10 |
| Primary CTA (passo 3 — confirmar) | "Confirmar importação" — `disabled` enquanto existir ao menos 1 linha bloqueada (D-12) sem sub-nicho selecionado; `title` no botão desabilitado: "Selecione um sub-nicho para todas as linhas bloqueadas" |
| Secondary CTA (passo 3) | "Voltar" (outline, volta ao passo 2 de mapeamento) |
| Sucesso ao confirmar importação (toast) | "{N} leads importados com sucesso." |
| Erro ao confirmar importação (toast) | "Não foi possível importar os leads. Tente novamente." |
| Título da tela pós-importação (D-14) | "Importação concluída" |
| Subtítulo da tela pós-importação | "{N} leads importados. Envie a primeira mensagem por WhatsApp quando quiser." |
| Botão inline "Enviar WhatsApp" na lista pós-importação (D-14, reaproveitado de Fase 4) | Ícone `MessageCircle` + `aria-label="Enviar WhatsApp para {nome}"` — idêntico ao já usado no dashboard/pipeline, nenhuma copy nova |
| Modal de preview reaproveitado (D-14) | Idêntico ao já especificado em `04-UI-SPEC.md` (`WhatsAppPreviewDialog`), com `defaultTipo="primeiro_contato"` — nenhuma copy nova nesta fase |
| CTA de saída da tela pós-importação | "Ver todos os leads" (outline, leva a `/leads`) |
| Estado vazio — nenhum lead ainda no batch (defensivo, não deveria ocorrer após confirmação bem-sucedida) | "Nenhum lead foi importado neste lote." |
| Destructive confirmation | Não aplicável nesta fase — nenhuma ação destrutiva/irreversível existe no fluxo de importação (importar sempre cria, nunca apaga; "Trocar arquivo" apenas reseta o estado local do wizard, sem confirmação necessária pois nada foi salvo ainda) |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | `table`, `dialog`, `select`, `field`, `label`, `button`, `badge`, `input`, `combobox` (todos já instalados desde as Fases 1/3/4 — nenhum bloco novo do registry shadcn precisa ser adicionado nesta fase) | not required |
| third-party | nenhum | not applicable — nenhum registry de terceiros foi declarado nesta fase |

Nenhum bloco novo do registry shadcn é necessário — o wizard de importação e a tela pós-importação reaproveitam `Table`/`Dialog`/`Select`/`Field`/`Label`/`Button`/`Badge`/`Input`/`Combobox` já existentes em `src/components/ui/`. A única dependência nova (`papaparse`) é uma biblioteca de parsing sem componente visual — já avaliada e aprovada em `02-RESEARCH.md` (Package Legitimacy Audit: `[OK]`, sem `postinstall`), portanto não passa pelo gate de segurança de registry (esse gate cobre blocos de UI de terceiros, não libs utilitárias já vetadas pela pesquisa técnica).

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
