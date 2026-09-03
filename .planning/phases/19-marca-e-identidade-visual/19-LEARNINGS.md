---
phase: 19
phase_name: "marca-e-identidade-visual"
project: "CRM de Leads"
generated: "2026-09-03"
counts:
  decisions: 12
  lessons: 9
  patterns: 12
  surprises: 6
missing_artifacts: []
---

# Phase 19 Learnings: marca-e-identidade-visual

## Decisions

### Nome do produto: "SOLO"
Uma palavra, vira verbo, positioning "quem trabalha sozinho". Ícone "S" (D-03).

**Rationale:** Nome curto e memorável casa com o app solo. A ressalva de colisão D-02 (Salesboom Solo CRM, SoloCRM, gosolo.io) está registrada verbatim no `brand.md` — nome **descartável**, trocar antes de qualquer movimento de produto real.
**Source:** 19-02-SUMMARY.md, brand.md

### Paleta "Corrente Funda · Sóbria"
Navy profundo + teal contido (croma do teal ~0.08), mood serious+premium. 14 tokens core reescritos in-place em `:root` e `.dark`.

**Rationale:** Usuário rejeitou a rodada 1 ("mais como a 4, com o teal mais sóbrio") → rodada 2 com croma reduzido. `--background` deixou de ser branco puro (`oklch(0.985 0.006 215)`).
**Source:** 19-02-SUMMARY.md

### Tipografia Geist mantida (D-18)
`--font-heading` vira alias de `--font-sans`, sem serif separada.

**Rationale:** Usuário viu 6 pares (Inter, Manrope, IBM Plex, Instrument Serif, Fraunces) e preferiu manter Geist — já é a fonte do app, casa com serious+premium, **zero risco de reflow de layout**.
**Source:** 19-02-SUMMARY.md

### Escopo do rename travado por D-05
Só `title`/`description`/header do sidebar/ícone/`package.json` name. Pasta do repo, imports, strings de path e CI **intactos de propósito**.

**Rationale:** Nenhuma string do produto está persistida em `data/crm.db` (19-RESEARCH §Runtime State Inventory) — sem migração de dado, sem risco de corromper registro.
**Source:** 19-05-SUMMARY.md, 19-VERIFICATION.md

### `next/font` wiring NÃO renomeado
`--font-geist-sans`/`-mono` mantidos + a ponte `@theme inline: --font-sans: var(--font-geist-sans)`. Desvio D-1 do plano 19-02.

**Rationale:** Apontar o `next/font` direto pra `--font-sans` (colidindo com a chave do `@theme inline`) recria um bug de auto-referência que joga a tipografia toda pra serif — documentado em `.planning/debug/resolved/font-sans-self-reference.md`. Churn cosmético sobre ponto frágil conhecido, zero ganho visual.
**Source:** 19-02-SUMMARY.md §Desvios

### Escala `--status-*` à parte da marca (D-08)
5 famílias (neutral/info/warning/success/danger) + `-foreground`, em `:root` e `.dark`, todas WCAG AA.

**Rationale:** Cor de status de funil não deve derivar da paleta de marca — separar deixa a marca trocável sem mexer na semântica de badges/datas.
**Source:** 19-03-SUMMARY.md

### `--sidebar-*` como alias `var(--*)`, não cópia de OKLCH
Os 8 tokens viram alias de `--card`/`--primary`/`--accent`/`--border`/`--ring` nos dois blocos.

**Rationale:** 1 nível de indireção (dentro do limite de 3 do `check-contrast`), mantém o sidebar sincronizado se a paleta core mudar.
**Source:** 19-03-SUMMARY.md

### Overlay do dialog: converter, não allowlistar
`bg-black/10` → `bg-foreground/10`.

**Rationale:** O overlay agora responde ao `.dark` (escurece com `--foreground` claro no dark) em vez de sempre preto. Allowlistar no grep-guard esconderia o problema.
**Source:** 19-05-SUMMARY.md

### `icon.svg` com cores hex literais, não `oklch()`
`#197076` (cópia de `--primary`) + `#fbfefe` (`--primary-foreground`).

**Rationale:** Máxima compatibilidade de renderer para asset estático. `brand.md` registra que trocar a paleta exige editar o SVG à mão.
**Source:** 19-06-SUMMARY.md

### D-19 (não-regressão visual) verificado por code+data
26 cenários (20 rotas + 6 dialogs), 26/26 pass, método code+data — não navegador ao vivo.

**Rationale:** Host 4GB não roda `npm run dev` + Chrome + sessão do agente (renderer congela com ~200 MB livres). Precedente explícito da Fase 18. Tipografia Geist inalterada anula o risco de reflow → leitura da superfície + `build` + `check:contrast` cobrem o critério objetivo.
**Source:** 19-06-SUMMARY.md, 19-VERIFICATION.md

### Sem `ThemeProvider` / toggle de dark mode (D-16)
Tokens `.dark` completos e consistentes (contraste 30/30), mas o toggle fica fora de escopo.

**Rationale:** Milestone v1.5 é "zero feature nova". O dark mode existe internamente coerente para quando for ligado, mas ligá-lo é feature.
**Source:** 19-03-SUMMARY.md, 19-05-SUMMARY.md

### Code review: WR-01/WR-02 corrigidos, WR-03/WR-04 + infos aceitos como débito
Regressões de UX (borda "esfriando" e CTA de WhatsApp pálidos) foram corrigidas no commit `c7acae5`; os 2 warnings de gate frouxo e 3 infos ficam como débito não-bloqueante.

**Rationale:** WR-03/WR-04 são sobre rigor de gate (falso verde futuro), não runtime — não bloqueiam o ship.
**Source:** 19-REVIEW.md, commit c7acae5

---

## Lessons

### `/brand-design` precisa rodar inline com o usuário no loop
O executor gsd não conduz o preview interativo. Rodou como orquestrador, com o usuário respondendo aos checkpoints de decisão.

**Context:** Task 1 e Task 2 do plano 19-02 são `checkpoint:decision` — escolha de paleta e tipografia. O subagente não tem como mostrar o preview e coletar a escolha.
**Source:** 19-02-SUMMARY.md

### Preview HTML estático é o jeito de mostrar paletas no host 4GB
`.brand-preview/index.html` + `typography.html` abertos direto no navegador, sem dev server.

**Context:** O skill normalmente sobe um preview via dev server; nesse host isso não cabe junto com a sessão do agente.
**Source:** 19-02-SUMMARY.md

### grep-guard por linha casa literais de cor DENTRO de comentários
Dois casos: o comentário JSDoc do `tarefa-form-dialog.tsx` (`bg-[#F4F4F5] p-6`) e o próprio docblock do `verify-no-hardcoded-colors.cjs` (`src/**/*.{ts,tsx}` — o `*` + `/` fechou o comentário de bloco e deu `SyntaxError`).

**Context:** O guard é regex por linha, não pula comentário. Solução: reescrever o comentário em prosa, sem tocar código.
**Source:** 19-01-SUMMARY.md, 19-04-SUMMARY.md, 19-05-SUMMARY.md

### `read_first` do plano descreveu `whatsapp-send-button.tsx` errado
O plano dizia que o arquivo continha `registerWhatsAppContact` + `<a>` + `buttonVariants()` — essa lógica está em `whatsapp-preview-dialog.tsx`. O arquivo real era um `<Button variant="ghost">` com ícone `text-[#0D9488]` (teal de **marca**, não o verde `#22C55E` de WhatsApp).

**Context:** O executor detectou a premissa incorreta, migrou o ícone para `text-primary` conforme a regra da task ("cor de marca → tabela de-para normal") e documentou como nota, não desvio.
**Source:** 19-04-SUMMARY.md

### Token de *fundo de badge* onde a cor precisa de peso visual degrada a UX
`border-status-warning` (quase branco) na borda "esfriando" some no modo claro; `bg-status-success` no CTA principal de WhatsApp vira verde-água lavado.

**Context:** WR-01/WR-02 do code review. `--status-*` são pares fundo-claro/texto-escuro para badges — não servem como cor de acento ou borda com peso. Corrigido usando os pares `-foreground` ou alinhando ao botão `primary`.
**Source:** 19-REVIEW.md

### `check-contrast.cjs` não cobre os pares que o refactor coloca na tela
O gate só valida `--status-*-foreground` sobre `--status-*` da mesma família. O refactor D-06 renderiza `text-status-*-foreground` sobre `bg-card`/`bg-muted` e `border-status-warning` sobre `bg-card` — nenhum é checado.

**Context:** WR-03 (deferido). Os valores atuais passam AA na prática, mas o gate dá falsa confiança para edições futuras de paleta.
**Source:** 19-REVIEW.md

### Gates de conteúdo por substring casam acidentalmente
`/tom|voz/i` casa "custom"/"átomo"/"bottom"; `/descart/i` casa "descartar". Um `brand.md` pode passar sem ter de fato as seções que o gate deveria forçar.

**Context:** WR-04 (deferido). Ancorar em heading (`/^#{2,3}\s+.*(tom|voz)/im`) ou exigir a frase específica.
**Source:** 19-REVIEW.md

### O default shadcn já vinha com `--muted-foreground`/`--muted` abaixo de AA
`:root` media 4.34 (< 4.5). Não era bug do script — era o valor real do scaffold. A paleta nova corrigiu ao escurecer o foreground.
**Source:** 19-01-SUMMARY.md

### `package-lock.json` regenera o campo `name` na próxima instalação
Rename do `package.json` `name` deixa o lock divergente até o próximo `npm install`. Cosmético — pacote é `private: true`.
**Source:** 19-05-SUMMARY.md

---

## Patterns

### Sensor RED-por-construção (estado RED do Nyquist)
Os 3 gates de marca (`verify:brand`, `verify:brand-md`, `check:contrast`) saem exit 1 de propósito na Onda 0 e ficam verdes ao longo das ondas 2-6.

**When to use:** Fase que introduz um invariante que o código ainda não satisfaz — escreva o gate primeiro, vermelho, e feche-o pelas ondas seguintes.
**Source:** 19-01-SUMMARY.md

### `check(cond, msg)` + contador `failed/total`
Gate multi-assert reporta TODAS as falhas antes de sair, em vez de parar na primeira.

**When to use:** Qualquer script `.cjs` de verificação com mais de uma condição — o usuário quer ver a lista inteira num run.
**Source:** 19-01-SUMMARY.md

### grep-guard com arg de CLI opcional para fixture
O script aceita um dir alternativo ao `src/` — prova de que a fixture limpa passa (exit 0) e a suja falha (exit 1), nos dois sentidos.

**When to use:** Guard cujo próprio comportamento precisa ser testado sem depender do estado do repo.
**Source:** 19-01-SUMMARY.md

### `Record<Stage, string>` de classe utilitária separado do mapa de rótulo
`STAGE_TOKEN` (cor) e `STAGE_LABEL` (texto) são mapas distintos. `STAGE_OPTIONS` (consumido por outra superfície) fica intocado.

**When to use:** Sempre que for adicionar cor a um enum tipado que já é exportado — não acople a cor ao contrato existente.
**Source:** 19-03-SUMMARY.md

### `headerClass` único via `cn()` no lugar de `style` inline
Um `string` de classe substitui o par `headerBg`/`headerText` hex + `style={{...}}` por campo.

**When to use:** Migração de cor computada por objeto de config para token — colapsa em uma classe.
**Source:** 19-03-SUMMARY.md

### Refactor mecânico cor→token: só `className`
Zero mudança de lógica/props/exports/handlers/efeitos/supressões de lint. Cada task exige `git diff` contendo apenas linhas de `className`; os aceites checam explicitamente `stopPropagation`, `startTransition`, `registerWhatsAppContact`, `buttonVariants` e `eslint-disable` intactos.

**When to use:** Qualquer refactor de estilo em massa — a disciplina de "só string de classe" é o que torna o diff auditável e o code review viável.
**Source:** 19-04-SUMMARY.md, 19-05-SUMMARY.md

### `<Button>` primário: deletar a `className` de cor, não reescrever
A variante default (`bg-primary text-primary-foreground hover:bg-primary/80`) já cobre. Mesmo idioma para `<a className={cn(buttonVariants(), ...)}>`.

**When to use:** Encontrou `<Button className="bg-[#hex] ...">` — remova a classe de cor, não a traduza.
**Source:** 19-04-SUMMARY.md

### `bg-accent` para realce interativo, `bg-muted` para repouso
`hover:`/`isOver` de superfície clicável = `bg-accent`; header, painel de toolbar, seções de form (em repouso) = `bg-muted`.

**When to use:** Decidir entre os dois tokens neutros de superfície — a distinção é interativo vs. estático.
**Source:** 19-04-SUMMARY.md

### Semântica de cor por tipo de sinal
Cor de marca em ícone/avatar/badge = `text-primary` / `bg-primary/10 text-primary`. Erro de validação inline = `text-destructive`. Status de funil = escala `--status-*`. Nunca hex.

**When to use:** Toda vez que um valor de cor hardcoded precisar de um token — a pergunta é "que tipo de sinal isso é?".
**Source:** 19-04-SUMMARY.md

### Favicon da marca = `src/app/icon.svg` estático
Convenção do App Router, cores hex literais copiadas de `globals.css`, zero `<script>`/`<foreignObject>`/ref externa. `favicon.ico` placeholder removido com `git rm`.

**When to use:** Trocar o favicon default do Next por um da marca sem gerar `.ico` nem carregar lib.
**Source:** 19-06-SUMMARY.md

### Portão de fecho de fase visual = 12 sensores verdes no mesmo commit
`tsc` + `lint` + `build` + 3 gates de marca + 2 guards de regressão + 4 harnesses, rodados do zero (`rm -rf .next`), tabela `Comando | Exit | Observação` com números reais no `HUMAN-UAT.md`.

**When to use:** Fechar uma fase de refactor/marca sem UAT ao vivo — o portão é a evidência objetiva.
**Source:** 19-06-SUMMARY.md

### `check-contrast`: conversão OKLCH→sRGB real, não aproximação por L
OKLCH → OKLab → LMS → linear sRGB (matriz inversa padrão) → clamp de gamut → gama → re-linearize WCAG. Token ausente = falha explícita, nunca pulado.

**When to use:** Gate de contraste sobre tokens OKLCH (Tailwind v4 / shadcn) — a aproximação por lightness não bate com o que o navegador renderiza.
**Source:** 19-01-SUMMARY.md

---

## Surprises

### `verify:brand` caiu 121 → 88 → 47 → 0 findings pelas ondas
A estimativa do plano 19-04 errou por 2 (previu ≤45 restantes, real 47) — erro de estimativa do plano, não trabalho faltante (removidas exatamente as 41 ocorrências previstas).

**Impact:** Nenhum no plano. Mostra que contar ocorrências de grep a priori é impreciso; o critério estrutural ("nenhum arquivo do plano na lista") é o que importa.
**Source:** 19-04-SUMMARY.md

### A fase inteira executou em ~1h50 somada para 33 arquivos
30 + 16 + 22 + 18 + 16 + 7 min nos 6 planos.

**Impact:** Refactor mecânico é rápido quando a tabela de-para (19-PATTERNS + a lista fechada que cada plano passa ao próximo) está pronta. O custo real da fase foi o `/brand-design` interativo e o planejamento.
**Source:** 19-01..19-06-SUMMARY.md

### `npm run build` passou limpo o tempo todo (Turbopack)
~13 rotas, 40-57s de compile, nunca deu OOM no host 4GB.

**Impact:** O OOM que travou as Fases 06-10 não reapareceu — confirma que a migração pra Turbopack no `next build` resolveu o gargalo de memória de forma durável.
**Source:** 19-03-SUMMARY.md, 19-04-SUMMARY.md, 19-05-SUMMARY.md

### `.dark --sidebar-primary` carregava leftover azul-roxo desde o scaffold
`oklch(0.488 0.243 264.376)` — um valor do default shadcn nunca visto porque não há toggle de dark mode.

**Impact:** Nenhum em produção (dark mode não é acessível), mas teria vazado no dia que o toggle fosse ligado. Alinhado no 19-03.
**Source:** 19-03-SUMMARY.md

### `SyntaxError: Unexpected token '*'` num docblock
O texto `src/**/*.{ts,tsx}` num comentário JSDoc do próprio gate continha `*` seguido de `/`, fechando o bloco de comentário prematuramente.

**Impact:** Travou a Task 1 do 19-01 até a linha ser reescrita em prosa. Lição: cuidado com globs em comentários de bloco.
**Source:** 19-01-SUMMARY.md

### Code review achou 4 warnings numa fase "puramente mecânica"
2 eram regressões de UX reais (tokens semânticos escolhidos errado), não erros de execução.

**Impact:** "Só troca de `className`" ainda tem espaço pra erro de **julgamento de design** — escolher qual token é a decisão, e ela pode estar errada mesmo com o diff perfeito. Reforça o valor do code review pós-refactor.
**Source:** 19-REVIEW.md
