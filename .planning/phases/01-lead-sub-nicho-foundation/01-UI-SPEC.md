---
phase: 1
slug: 01-lead-sub-nicho-foundation
status: approved
reviewed_at: 2026-07-19
shadcn_initialized: false
preset: none
created: 2026-07-19
---

# Fase 1 — Contrato de Design de UI

> Contrato visual e de interação para fases de frontend. Gerado por gsd-ui-researcher, verificado por gsd-ui-checker.

**Contexto do projeto:** repositório greenfield — nenhum código de aplicação existe ainda (sem `package.json`, sem `components.json`, sem app Next.js scaffolded). Este contrato assume que o scaffolding (Fase 1, primeira task de execução) rodará exatamente os comandos já travados em `01-RESEARCH.md` (`## Standard Stack` → `Installation`). Os valores abaixo devem ser aplicados assim que o projeto existir; nenhum deles depende de código já existente para ser válido.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn (CLI 4.13.1) — decisão já travada em `CLAUDE.md`/`STACK.md`, não é uma escolha em aberto desta pesquisa |
| Preset | não inicializado ainda (greenfield) — rodar `npx shadcn@latest init` como primeira task de execução da Fase 1, estilo recomendado "New York" (maior densidade de informação, adequado a uma tabela/admin de leads) |
| Component library | Base UI (padrão do shadcn/ui a partir de julho de 2026, per `01-RESEARCH.md` Pitfall 2 / State of the Art) — **MEDIUM confidence**: confirmar no `components.json` real gerado pelo `init` antes de compor o Combobox de sub-nicho (D-03); se o CLI oferecer Radix como alternativa, usar Base UI mesmo assim para manter o padrão atual do ecossistema |
| Icon library | lucide-react (travado em `01-RESEARCH.md` Standard Stack) |
| Font | Geist Sans (fonte padrão do `create-next-app`, carregada via `next/font`) — sem preferência do fundador registrada, usando o default do scaffold |

---

## Spacing Scale

Valores declarados (múltiplos de 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Gap entre ícone e texto (ex.: ícone dentro do badge de etapa, ícone dentro de botão) |
| sm | 8px | Espaçamento compacto entre elementos (gap entre inputs de uma mesma linha no formulário, padding interno de badges) |
| md | 16px | Espaçamento padrão entre elementos (gap entre campos do formulário, padding de células da tabela) |
| lg | 24px | Padding de seção (padding interno do modal de lead, separação entre as 3 seções "Contato"/"Negócio"/"Acompanhamento" — D-02) |
| xl | 32px | Gaps de layout (padding lateral da página, gap entre a sidebar e o conteúdo principal) |
| 2xl | 48px | Quebras de seção maiores (espaço acima/abaixo do estado vazio — D-13) |
| 3xl | 64px | Espaçamento em nível de página (não crítico nesta fase — reservado para telas futuras mais densas visualmente, ex. dashboard da Fase 4) |

Exceptions:
- Botões de ação de linha (editar/excluir, D-08): alvo de toque de 36px quadrado (`Button` do shadcn variante `size="icon"`) — múltiplo de 4, mas registrado aqui explicitamente porque é menor que o `md` padrão e é clicável (acessibilidade de alvo de toque).
- Sidebar fixa (D-18): largura fixa de 240px — não é um token de espaçamento reutilizável, é uma dimensão de layout única desta fase.

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Label | 14px | 400 (regular) | 1.5 |
| Body | 16px | 400 (regular) | 1.5 |
| Heading | 20px | 600 (semibold) | 1.2 |
| Display | 28px | 600 (semibold) | 1.2 |

Uso de cada papel:
- **Label (14px/400):** texto de célula da tabela, labels de campo do formulário, texto de badge de etapa, texto auxiliar/secundário (ex.: contagem de leads, texto de paginação).
- **Body (16px/400):** valor digitado nos inputs, texto de corpo do estado vazio, mensagens de toast, texto de parágrafo em modais de confirmação.
- **Heading (20px/600):** títulos das 3 seções do modal de lead ("Contato", "Negócio", "Acompanhamento" — D-02), título do modal de confirmação de exclusão.
- **Display (28px/600):** título de página ("Leads", "Sub-nichos", "Lixeira").

Apenas 4 tamanhos e 2 pesos são usados nesta fase — nenhuma variação adicional (ex.: sem "bold" 700, sem tamanho intermediário 18px) para manter consistência visual across as 3 telas (lista, gestão de sub-nicho, lixeira).

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#FFFFFF` | Fundo da página, fundo do modal, fundo dos inputs |
| Secondary (30%) | `#F4F4F5` (zinc-100) | Sidebar (D-18), cabeçalho da tabela, fundo de card/seção dentro do modal, linhas zebradas (se usadas) |
| Accent (10%) | `#0D9488` (teal-600) | Ver lista explícita abaixo — nunca aplicar a elementos fora dessa lista |
| Destructive | `#DC2626` (red-600) | Ações destrutivas apenas — ver lista abaixo |

**Accent reserved for** (lista explícita, nada além disso):
- Botão "Novo lead" (CTA primário, D-13/D-14)
- Botão "+ Adicionar" na tela de gestão de sub-nicho (D-16)
- Indicador do link ativo na sidebar (D-18)
- Anel de foco (`focus-visible`) em inputs, botões e no combobox de sub-nicho (D-03)
- Links de texto (ex.: eventual link "ver detalhes")

**Destructive reserved for**:
- Botão "Excluir" (ícone de linha, D-08, e botão de confirmação no modal, D-05)
- Ícone/borda do modal de confirmação de exclusão (D-05)
- Texto de erro de validação inline (mensagens Zod, ex.: "Nome é obrigatório")
- Toast de erro (falha ao salvar/carregar)

**Badges de etapa (D-09) — paleta informativa separada do accent/destructive acima:**

| Etapa | Cor | Hex (bg / texto) |
|-------|-----|-------------------|
| Novo | Cinza | `#F4F4F5` / `#3F3F46` (zinc-100 / zinc-700) |
| Contatado | Azul | `#DBEAFE` / `#1D4ED8` (blue-100 / blue-700) |
| Negociação | Âmbar | `#FEF3C7` / `#B45309` (amber-100 / amber-700) |
| Fechado/Perdido | Slate escuro | `#E2E8F0` / `#1E293B` (slate-200 / slate-800) |

**Nota de resolução de ambiguidade:** D-09 (`CONTEXT.md`) cita "verde/vermelho=Fechado/Perdido" como exemplo ilustrativo, sugerindo duas cores para dois resultados. Porém D-10 e o schema Drizzle travado em `01-RESEARCH.md` (`stage` enum com um único valor `"fechado_perdido"`) confirmam que esta fase trata "Fechado/Perdido" como **um único valor de etapa**, sem dado no banco para diferenciar ganho de perda. Não é possível colorir de forma diferente algo que é o mesmo valor. Resolução: usar uma única cor neutra escura (slate) que sinaliza "estado terminal" sem insinuar incorretamente vitória (verde) ou derrota (vermelho) — evita uma mensagem visual errada em ~50% dos casos. Se um requisito futuro (v2) separar "Fechado" de "Perdido" como valores distintos, revisar esta tabela nesse momento.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA (lista de leads) | "Novo lead" |
| Secondary CTA (sub-nichos) | "+ Adicionar" |
| Empty state heading | "Nenhum lead cadastrado ainda" |
| Empty state body | "Comece adicionando seu primeiro lead para organizar seu funil de vendas." (acompanhado do botão "Novo lead", conforme D-13) |
| Erro de validação inline (formulário) | Mensagens Zod específicas por campo, ex.: "Nome é obrigatório.", "Telefone é obrigatório.", "Notas são obrigatórias.", "Selecione um sub-nicho." |
| Erro ao salvar (toast) | "Não foi possível salvar o lead. Tente novamente." |
| Erro ao carregar a lista (fallback de página) | "Não foi possível carregar os leads. Recarregue a página." |
| Erro de duplicata de sub-nicho (LEAD-02) | "Esse sub-nicho já existe." (erro inline no campo, não toast) |
| Sucesso ao salvar lead (toast) | "Lead salvo com sucesso." |
| Sucesso ao criar sub-nicho (toast) | "Sub-nicho criado." |
| Sucesso ao renomear sub-nicho (toast) | "Sub-nicho renomeado." |
| Sucesso ao restaurar lead (toast, D-17) | "Lead restaurado com sucesso." |
| Destructive confirmation — excluir lead (D-05) | Título: "Excluir lead". Corpo: "Tem certeza que deseja excluir {nome}? O lead será movido para a Lixeira e pode ser restaurado depois." Botões: "Cancelar" / "Excluir" (destructive) |
| Descartar alterações (D-04) | Título: "Descartar alterações?". Corpo: "Você tem alterações não salvas que serão perdidas." Botões: "Continuar editando" / "Descartar" |
| Lixeira — estado vazio | "Nenhum lead na lixeira." |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | `table`, `form`, `dialog`, `select`, `combobox`, `calendar`, `badge`, `button`, `input`, `textarea`, `sonner` | not required |
| third-party | nenhum | not applicable — nenhum registry de terceiros foi declarado nesta fase |

Nenhum bloco de terceiros foi solicitado ou considerado. Todos os componentes vêm do registry oficial do shadcn/ui, conforme já listado em `01-RESEARCH.md` (`## Standard Stack` → `Installation`).

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: FLAG (não-bloqueante — falta ponto focal declarado por tela e `aria-label` em botões ícone-apenas; recomendado, não obrigatório)
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved (2026-07-19, por gsd-ui-checker) — 5/6 PASS, 1 FLAG não-bloqueante
