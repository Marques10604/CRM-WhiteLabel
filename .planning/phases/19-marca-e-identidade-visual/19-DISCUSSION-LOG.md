# Phase 19: Marca e Identidade Visual - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-02
**Phase:** 19-marca-e-identidade-visual
**Areas discussed:** Nome & rename, Cores hardcoded → tokens, Direção visual, Dark mode & tipografia

---

## Nome & rename

### Nome do produto — como decidir

| Option | Description | Selected |
|--------|-------------|----------|
| SOLO está travado | Segue com "SOLO", escreve racional em brand.md | |
| Traga 5-6 alternativas | Ver opções antes de travar | |
| SOLO como base, gere variações | Ver vizinhança de "SOLO" | ✓ (inicial) |

### Direção de nome (partindo de SOLO)

| Option | Description | Selected |
|--------|-------------|----------|
| SOLO (puro) | Uma palavra, vira marca, ícone "S" | ✓ (inicial) |
| SoloCRM | Explícito, tipo rótulo | |
| Solo Pipe | "Pipe" = pipeline/funil | |
| Solo Follow | Amarra no core value follow-up | |

### Colisão de nome — importa agora?

| Option | Description | Selected |
|--------|-------------|----------|
| Não importa agora | Ferramenta interna, registra em brand.md | |
| Faz uma checagem rápida | Busca leve domínio/colisão antes de travar | ✓ |

**Resultado da checagem:** "SOLO" colide forte no espaço de CRM — Salesboom Solo CRM (mesma categoria), SoloCRM / solocrm.com (CRM offline "para solopreneurs/freelancers", posicionamento quase idêntico), Solo / gosolo.io (home-service com CRM). Domínios `solocrm.com` e `gosolo.io` tomados.

### Com a info da colisão — o que fazer

| Option | Description | Selected |
|--------|-------------|----------|
| Mantém SOLO mesmo assim | Interna, colisão documentada | |
| Pivota pra um nome diferenciado | Gera candidatos novos | ✓ (inicial) |
| SOLO + modificador | Raiz "SOLO" + diferenciador | |

### SOLO + afixo

| Option | Description | Selected |
|--------|-------------|----------|
| SoloFunil | PT-BR, descritivo | |
| SoloPipe | Enxuto | |
| SoloCue | "Cue" = lembrete | |
| SoloFlow | Fluxo do lead | ✓ (inicial) |

**Resultado da checagem de SoloFlow:** pior opção — "SoloFlow: Invoicing & CRM" é app real (iOS+Android) com CRM+pipeline+histórico de interações; soloflow.pro, solo-flow.app, soloflowcrm.com, soloflowapp.com todos tomados, vários são CRM pra freelancer.

### Resolução final do nome

| Option | Description | Selected |
|--------|-------------|----------|
| Nome distinto PT-BR agora | Larga "Solo", ex: Relance/Farol (espaço limpo) | ✓ (inicial) |
| SoloFlow mesmo assim | Interna, colisão documentada | |
| SOLO puro mesmo assim | Interna, colisão documentada | |

**Candidatos PT-BR oferecidos:** Relance (do core value do projeto), Farol, Fisga, Retoma. Checagem: "Relance" e "Farol" não aparecem como CRM em nenhuma busca — espaço limpo. Nota: "Funil de Vendas™" é franquia registrada no Brasil (SoloFunil teria esbarrado).

**User's choice:** Depois de explorar Relance/Farol e escolher "Outro", o usuário respondeu em texto livre: **"coloque SOLO mesmo"**.
**Notes:** Decisão consciente — o usuário conhece a fraqueza do nome e o trade-off, e não quer gastar mais rodadas. `brand.md` registra a colisão como ressalva ("trocar antes de qualquer movimento de produto").

### Profundidade do rename

| Option | Description | Selected |
|--------|-------------|----------|
| Só o que o usuário vê | metadata, sidebar, ícone; não mexe em package.json/repo | |
| Visível + metadados do projeto | + package.json name, README; não renomeia a pasta | |
| Você decide | Sem criar risco de regressão | ✓ |

**Notes:** Claude decidiu — UI visível + package.json + README; pasta do repositório e caminhos de CI/infra ficam intactos.

---

## Cores hardcoded → tokens

### Até onde vai o trabalho de cor

| Option | Description | Selected |
|--------|-------------|----------|
| Refatorar tudo pra tokens | ~44 ocorrências → tokens shadcn | ✓ |
| Só superfícies principais | Sidebar, botões primários, badges de etapa | |
| Só trocar CSS vars | Aceita sidebar/cards com teal antigo | |
| Você decide | Melhor relação impacto/risco | |

### Cores de status do pipeline

| Option | Description | Selected |
|--------|-------------|----------|
| Escala de status separada | Tokens --status-* fora da marca | ✓ |
| Deriva da paleta da marca | chart-1..5 pros status | |
| Você decide | Conforme paleta do /brand-design | |

### O que conta como regressão visual

| Option | Description | Selected |
|--------|-------------|----------|
| Só quebra real | Layout/legibilidade/contraste AA/dark mode/elemento sumido. Cor mudar nunca é regressão | ✓ |
| Quebra + desvios feios | Também aponta combinações claramente ruins | |

---

## Direção visual

### Mood da marca (multi-select, até 2)

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal | Limpo, muito branco | |
| Serious | Sóbrio, cara de ferramenta de trabalho | ✓ |
| Technical | Cara de produto de dev/infra | |
| Premium | Sensação de caro/cuidado | ✓ |

### Cor base — manter teal ou virada

| Option | Description | Selected |
|--------|-------------|----------|
| Aberto a virada total | 6 paletas livres | ✓ |
| Manter teal como accent | Paletas em torno de teal | |
| Dark navy + accent (tipo o do amigo) | Referência direta ao CRM do amigo | |

### Marcas de referência (multi-select)

| Option | Description | Selected |
|--------|-------------|----------|
| CRM do amigo (dark navy + teal) | GS Info Sistemas, "sem cara de vibecode" | ✓ |
| Linear | Roxo/grafite, polido | |
| Notion | Quase sem cor | |
| Nenhuma / você escolhe | Livre a partir de serious + premium | |

### Categoria pro /brand-design

| Option | Description | Selected |
|--------|-------------|----------|
| tooling/dev | Ferramenta de trabalho / produtividade | ✓ |
| infra/data | Painel de dados / sistema | |
| Você decide | — | |

---

## Dark mode & tipografia

### Dark mode

| Option | Description | Selected |
|--------|-------------|----------|
| Deixar pronto, sem toggle | Tokens .dark corretos, verificação força .dark, sem toggle | ✓ (decisão de Claude) |
| Ligar dark mode de verdade | ThemeProvider + toggle + corrigir bg-white | |
| Você decide | — | |

**User's choice:** "veja qual fica melhor" (deferido a Claude).
**Notes:** Claude decidiu "pronto, sem toggle" — um toggle seria feature nova e viola o princípio do milestone v1.5 ("Zero feature nova"). Corrigir `bg-white` e deixar `.dark` consistente é limpeza de dívida e entra no refactor. Toggle vira Deferred Idea.

### Tipografia

| Option | Description | Selected |
|--------|-------------|----------|
| Deixa o /brand-design escolher | Skill sugere par heading+corpo; mantém Geist se for o melhor | ✓ |
| Manter Geist, só formalizar | Geist fica, brand.md só documenta | |

---

## Claude's Discretion

- Mapeamento exato de cada cor hardcoded → token específico.
- `--font-heading` separada da `--font-sans` ou alias.
- Formato/profundidade da seção tom/voz do `brand.md`.
- Ordem de execução interna da fase.
- Ajuste de favicon / Open Graph (não discutido).
- Profundidade do rename (UI visível + package.json + README).
- Abordagem de dark mode (pronto sem toggle).

## Deferred Ideas

- Toggle de dark mode na UI (ThemeProvider next-themes + controle) — feature, fora do v1.5.
- Trocar o nome "SOLO" antes de qualquer movimento de produto (colisão documentada em brand.md).
- Favicon / Open Graph image — polimento futuro se não for trivial agora.
- Todos revisados via `todo.match-phase 19` (5 matches score 0.6, todos falsos-positivos por keyword genérica) — nenhum incorporado.
