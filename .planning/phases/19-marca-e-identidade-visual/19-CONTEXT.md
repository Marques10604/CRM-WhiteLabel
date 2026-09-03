# Phase 19: Marca e Identidade Visual - Context

**Gathered:** 2026-09-02
**Status:** Ready for planning

<domain>
## Phase Boundary

A fase dá cara de produto ao CRM:

1. **Nome próprio** — "SOLO" definido, com racional e ressalva de colisão registrados em `brand.md` na raiz do repo.
2. **Paleta + tipografia** — escolhidas pelo usuário via o skill `/brand-design` (6 paletas candidatas → preview HTML no navegador → escolha → aplica como shadcn CSS variables light + dark em `src/app/globals.css` + tipografia via `next/font`).
3. **Refactor de cores para tokens** — todas as ~44 ocorrências de cor hardcoded em `src/` migram para tokens shadcn, pra paleta nova aplicar de fato.
4. **Rename** — "CRM de Leads" / "CRM LEADS" → "SOLO" nas superfícies visíveis + `package.json` + README.
5. **Verificação de não-regressão visual** no navegador em todas as telas existentes.

**Fora de escopo:** nenhuma tela nova, nenhuma feature nova. Sem toggle de tema na UI. Sem registro de marca / compra de domínio. Sem renomear a pasta do repositório ou caminhos de CI/infra.

</domain>

<decisions>
## Implementation Decisions

### Nome do produto (BRAND-01)
- **D-01:** O nome é **"SOLO"** (puro, uma palavra). O usuário explorou alternativas (SoloFlow, SoloFunil, SoloPipe, SoloCue, e nomes PT-BR distintos como Relance/Farol) e conscientemente decidiu manter SOLO.
- **D-02:** "SOLO" **colide** no espaço de CRM — existem: **Salesboom Solo CRM** (mesma categoria), **SoloCRM** (`solocrm.com`, CRM offline "para solopreneurs/freelancers", posicionamento quase idêntico ao nosso), **Solo / gosolo.io** (plataforma home-service com módulo CRM). Domínios `solocrm.com` e `gosolo.io` tomados. `brand.md` DEVE registrar essa colisão como ressalva explícita: *"nome descartável — trocar antes de qualquer movimento de produto, landing page ou venda"*. Aceitável agora porque é ferramenta interna de um único usuário.
- **D-03:** O ícone placeholder do sidebar (letra "I" em `src/components/app-sidebar.tsx:42`) passa a ser **"S"**.

### Escopo do rename (BRAND-03)
- **D-04:** Renomear "CRM de Leads" / "CRM LEADS" → "SOLO" em:
  - `src/app/layout.tsx` metadata (`title` linha 18 + `description` linha 19)
  - `src/components/app-sidebar.tsx` header (linha 45) + ícone (linha 42)
  - `package.json` campo `name`
  - `README` (se citar o nome antigo)
  - qualquer outro texto **visível na UI** onde o nome antigo apareça (o planner deve fazer um grep amplo — hoje só `layout.tsx:18` e `app-sidebar.tsx:45` são conhecidos)
- **D-05:** **NÃO** renomear: a pasta do repositório (`crm-leads`), caminhos de CI, imports internos, nem strings de caminho. Quebraria infra sem ganho visível.

### Refactor de cores para tokens (BRAND-02)
- **D-06:** Refactor **completo** — todas as ~44 ocorrências de cor hardcoded em `src/` (22 arquivos) migram para tokens shadcn (`bg-primary`, `text-muted-foreground`, `bg-sidebar`, `border-border`, etc.). Alvos conhecidos: `bg-[#0D9488]` (teal), `bg-[#0D9488]/10`, `text-[#0D9488]`, `bg-[#F4F4F5]`, `text-zinc-400/500/700`, `hover:bg-zinc-200/60` em `app-sidebar.tsx`; `bg-white` em `layout.tsx:32`; e o restante mapeado pelo grep `(bg|text|border|ring)-(zinc|slate|gray|neutral|white|black|blue|green|red|amber|emerald)-?\d*`.
- **D-07:** Motivo do refactor completo (não parcial): `/brand-design` só reescreve as CSS variables. Sem o refactor, sidebar / cards / badges continuariam com o teal antigo e o resultado ficaria pela metade (botão novo + sidebar velha). [informational]
- **D-08:** **Cores de status do pipeline** (Novo, Contatado, Negociação, Fechado, Perdido) usam uma **escala dedicada `--status-*`**, definida à parte da paleta de marca. Status precisa de cores mutuamente distinguíveis (verde / vermelho / âmbar / azul); derivá-las da marca quebraria a leitura do funil. O planner deve inventariar onde essas cores de status vivem hoje e criar os tokens `--status-*` em light + dark.

### Direção visual — input para `/brand-design`
- **D-09:** **Mood:** `serious` + `premium` (o skill pede 1-2).
- **D-10:** **Categoria:** `tooling/dev`.
- **D-11:** **Paleta:** aberto a virada total — as 6 paletas candidatas podem explorar direções novas (navy, grafite+accent, roxo, etc.), não precisam girar em torno do teal atual. O usuário escolhe no preview HTML.
- **D-12:** **Referência de feeling:** o CRM do amigo (GS Info Sistemas, `localhost:3333`) — dark navy + accent teal + status colors, "sem cara de vibecode". É referência de **sensação** (sóbrio, profissional, não-amador), **não** de paleta — a paleta pode pivotar livremente. Análise em `.planning/ANALISE-CRM-CONCORRENTE-E-GAPS.md`.
- **D-13:** Executar o loop de regeneração do `/brand-design` até o usuário aprovar uma paleta no navegador (comportamento nativo do skill).

### Dark mode
- **D-14:** Estado atual: dark mode é **código morto** — `next-themes` está instalado mas só `src/components/ui/sonner.tsx` o usa; não há `ThemeProvider` no layout, não há toggle, e `body` tem `bg-white` cravado. Só 16 usos de `dark:` em `src/`. [informational]
- **D-15:** Esta fase: `/brand-design` escreve os tokens do bloco `.dark` em `globals.css` corretamente, e o refactor de cores (D-06) corrige `bg-white` e neutros cravados para tokens que respondem ao `.dark`. Isso é **limpeza de dívida**, não feature. [informational]
- **D-16:** **SEM toggle de tema na UI.** Adicionar `ThemeProvider` + controle seria feature nova e viola o princípio do milestone v1.5 ("Zero feature nova"). Ver Deferred Ideas.
- **D-17:** Interpretação de "dark mode sem regressão" (Success Criteria #5): a verificação **força `.dark`** temporariamente (ex: adicionar a classe via devtools) e confere que os tokens `.dark` são internamente consistentes — contraste WCAG AA, legibilidade, nada quebrado. Não exige que dark mode seja acessível pela UI.

### Tipografia
- **D-18:** `/brand-design` escolhe o par tipográfico (heading + corpo) que casa com serious + premium, ligado via `next/font`. Pode manter Geist se for o melhor fit, ou trocar. A verificação no navegador cobre risco de regressão de layout por diferença de métricas de fonte (largura de linha, altura). O `@theme` de `globals.css` já tem `--font-heading` apontando pra `--font-sans` — o planner decide se separa.

### Definição de "regressão visual" (Success Criteria #5)
- **D-19:** Regressão = **quebra real apenas**: layout quebrado, texto ilegível, contraste abaixo de WCAG AA, dark mode bugado (quando forçado), elemento sumido/cortado. **Mudança de cor em si NUNCA é regressão** — é o objetivo declarado da fase. O verificador não deve apontar "a cor mudou" nem julgar gosto/estética subjetiva das combinações.

### Claude's Discretion
- Mapeamento exato de cada cor hardcoded → token específico (o planner/executor decide caso a caso conforme a paleta que sair do `/brand-design`).
- Se `--font-heading` vira uma fonte separada da `--font-sans` ou continua alias.
- Formato e profundidade da seção tom/voz do `brand.md`.
- Ordem de execução interna (rodar `/brand-design` antes ou depois do refactor de tokens; provavelmente `/brand-design` primeiro pra ter a paleta, depois refactor, depois rename, depois verificação).
- Se favicon / Open Graph precisam de ajuste (não discutido; tratar como parte de "cara de produto" se for trivial, senão anotar).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Skill que conduz a fase
- `~/.claude/skills/brand-design/SKILL.md` — o workflow completo do `/brand-design`: interview de 4 perguntas, geração de 6 paletas (3 curadas de `references/palette-recipes.md` + 3 algorítmicas), cálculo do token set shadcn light+dark (`references/shadcn-integration.md`), checagem de contraste (`references/contrast-rules.md`), loop de regeneração, escrita de `brand.md`. Inputs já decididos: nome "SOLO" + descrição, categoria `tooling/dev`, mood `serious`+`premium`, referência = CRM do amigo (dark navy + teal, feeling sóbrio).

### Análise de concorrente / referência de feeling
- `.planning/ANALISE-CRM-CONCORRENTE-E-GAPS.md` — análise do CRM do amigo (GS Info Sistemas): dark navy, accent teal, status colors, "sem cara de vibecode". Também lista os gaps do nosso CRM solo (mobile é o nº1) — fora do escopo desta fase mas contexto útil.

### Superfícies de código que a fase toca
- `src/app/globals.css` — onde `/brand-design` reescreve as CSS variables (`:root` e `.dark`) e onde entram os novos tokens `--status-*`. Contém o `@theme inline` com o mapa de tokens shadcn e a escala de `--radius`.
- `src/app/layout.tsx` — metadata (`title`/`description` a renomear), setup de `next/font` (Geist/Geist_Mono), `body className="min-h-full flex bg-white"` (o `bg-white` a corrigir para token).
- `src/components/app-sidebar.tsx` — header "CRM LEADS" (renomear), ícone "I" → "S", e o maior nó de cor hardcoded: `bg-[#F4F4F5]`, `bg-[#0D9488]`, `bg-[#0D9488]/10`, `text-[#0D9488]`, `text-zinc-400/500/700`, `hover:bg-zinc-200/60`.

### Requisitos
- `.planning/REQUIREMENTS.md` §"Marca e Identidade Visual" — BRAND-01, BRAND-02, BRAND-03 (texto completo dos critérios).
- `.planning/ROADMAP.md` §"Phase 19" — Goal + 5 Success Criteria + UI hint + threat surface.

**Nenhum ADR/spec formal externo** — as decisões de implementação estão capturadas nos `<decisions>` acima.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **shadcn token system** já montado em `globals.css` (`@theme inline` + `:root` + `.dark` completos com todos os tokens padrão shadcn incluindo `sidebar-*` e `chart-1..5`). `/brand-design` sobrescreve os valores, não a estrutura.
- **`next-themes` já instalado** (`package.json:39`, `^0.4.6`) — usado por `sonner.tsx`. Se um dia o toggle for implementado (deferido), a dependência já existe.
- **`next/font/google`** já configurado no `layout.tsx` (padrão a seguir se trocar de fonte).
- **`cn()` util** (`@/lib/utils`) usado em toda parte pra compor classes condicionais — padrão pra manter no refactor.

### Established Patterns
- Cores hoje são **inconsistentes**: mistura de tokens shadcn (em componentes `ui/`), hex cravado (`#0D9488`, `#F4F4F5` no sidebar) e escala Tailwind `zinc-*` (em ~22 arquivos). O refactor unifica tudo em tokens.
- Only 16 `dark:` utilities em `src/` — o app foi construído light-first; o bloco `.dark` do CSS existe mas nunca é exercido.
- `body` tem cor de fundo cravada (`bg-white`), não `bg-background` — quebra dark mode e é o primeiro alvo do refactor.

### Integration Points
- `/brand-design` → `src/app/globals.css` (CSS vars) + `src/app/layout.tsx` (fontes) + `brand.md` (raiz, novo arquivo).
- Refactor de tokens → 22 arquivos em `src/components/` e `src/app/` (lista via grep no D-06).
- Rename → `layout.tsx`, `app-sidebar.tsx`, `package.json`, `README`.
- Verificação → navegador, todas as rotas do `NAV_ITEMS` em `app-sidebar.tsx` (`/`, `/leads`, `/importar`, `/pipeline`, `/relatorios`, `/templates`, `/nichos`, `/motivos-perda`, `/lixeira`, `/configuracoes`) + rotas de detalhe/dialog.

</code_context>

<specifics>
## Specific Ideas

- Nome: **"SOLO"** — som curto, vira marca ("abre o SOLO"). Ícone = "S". Positioning: CRM pra quem trabalha sozinho (sem equipe / fila / SLA).
- Feeling alvo: "agradável aos olhos, sem cara de vibecode" (fala recorrente do usuário). Referência concreta: o CRM dark-navy-e-teal do amigo.
- Mood da marca: sério e premium — "é um CRM que você abre todo dia", não um brinquedo.
- O usuário está ciente de que "SOLO" é fraco como nome de produto futuro e aceitou o trade-off conscientemente para não gastar mais rodadas agora.

</specifics>

<deferred>
## Deferred Ideas

- **Toggle de dark mode na UI** — adicionar `ThemeProvider` (next-themes) + um controle no sidebar ou em Configurações, tornando dark mode uma funcionalidade real e acessível. É feature nova → fora do milestone v1.5 ("Zero feature nova"). Candidato a fase própria num milestone futuro. A base (tokens `.dark` corretos, `bg-white` já corrigido) fica pronta nesta fase, então o toggle depois é trabalho pequeno.
- **Trocar o nome "SOLO"** — se/quando o CRM virar produto (landing page, venda, multi-tenant), o nome precisa mudar por causa da colisão (Salesboom Solo CRM, SoloCRM). Anotado em `brand.md`.
- **Favicon / Open Graph image** — se não for trivial encaixar nesta fase, tratar como polimento futuro.

### Reviewed Todos (not folded)
- `todo.match-phase 19` retornou 5 matches, todos com score 0.6 por keywords genéricas ("phase", "crm", "uma") — nenhum é sobre marca/identidade visual (são: sequência de follow-up, agenda/tarefas soltas, anexo por lead, busca global). Nenhum foi incorporado; permanecem no backlog para fases futuras.

</deferred>

---

*Phase: 19-marca-e-identidade-visual*
*Context gathered: 2026-09-02*
