---
phase: 4
slug: 04-follow-up-dashboard-whatsapp-outreach
status: draft
shadcn_initialized: true
preset: base-nova
created: 2026-07-21
---

# Fase 4 — Contrato de Design de UI

> Contrato visual e de interação para fases de frontend. Gerado por gsd-ui-researcher, verificado por gsd-ui-checker.

**Contexto do projeto:** `components.json` já existe (preset `base-nova` sobre Base UI, confirmado na Fase 1, reaproveitado sem alteração na Fase 3). Este contrato reaproveita **integralmente** os tokens de espaçamento, tipografia e cor já aprovados em `01-UI-SPEC.md`/`03-UI-SPEC.md` — nenhuma cor, tamanho de fonte ou valor de espaçamento novo é introduzido nesta fase. O que é específico da Fase 4: (1) o novo dashboard de follow-ups em `/` (3 seções por urgência, D-01/D-02), (2) a tela de templates de WhatsApp em `/templates` (CRUD, D-11), (3) o botão inline "Enviar WhatsApp" + modal de preview (D-14/D-15), compartilhado entre dashboard e pipeline. Todas as decisões de UX já vieram travadas em `04-CONTEXT.md` (D-01 a D-21); as áreas de "Claude's Discretion" relevantes à UI (estilo visual, cor do botão de envio, esquema de cor das seções de urgência) foram resolvidas aqui de forma prescritiva, reaproveitando cores já existentes em vez de introduzir novas.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn (já inicializado na Fase 1 — `components.json` confirmado neste repositório) |
| Preset | `base-nova` (confirmado via `components.json`: style `base-nova`, baseColor `neutral`, cssVariables true) — inalterado |
| Component library | Base UI (mesma base das Fases 1 e 3) |
| Icon library | lucide-react — ícones novos usados nesta fase: `MessageCircle` (botão "Enviar WhatsApp"), `Star`/`Check` (marcador "padrão" de template — usar `Check` dentro de um `Badge`, consistente com o padrão de badges já existente, não introduzir um novo componente de "estrela"), `Trash2` e `Pencil` (ações de linha da lista de templates, mesmo par já usado em `subnicho-manager.tsx`) |
| Font | Geist Sans (`--font-sans`, mesma das Fases 1 e 3) |
| Novas dependências npm | Nenhuma — confirmado em `04-RESEARCH.md` ("zero new dependencies"). Nenhum item de registry shadcn novo é necessário: `Dialog`, `Select`, `Textarea`, `Button`, `Badge`, `Field`/`Label` já existem em `src/components/ui/` e cobrem 100% dos componentes desta fase (formulário de template, modal de preview, dropdown de tipo). |

---

## Spacing Scale

Valores declarados (múltiplos de 4) — idênticos aos das Fases 1 e 3, reaproveitados sem alteração:

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Gap entre ícone `MessageCircle`/`Check`/`Clock` e texto adjacente |
| sm | 8px | Gap vertical entre itens de uma mesma seção do dashboard; gap entre nome do template e badge "Padrão" |
| md | 16px | Padding interno de cada item do dashboard e de cada linha da lista de templates; padding interno do modal de preview |
| lg | 24px | Padding lateral das páginas `/` (dashboard) e `/templates`; separação entre as 3 seções de urgência do dashboard |
| xl | 32px | Padding vertical do container do dashboard (topo/rodapé da página, mesma convenção de `/pipeline`) |
| 2xl | 48px | Espaço acima/abaixo do estado vazio do dashboard (D-03) e do estado vazio de `/templates` |
| 3xl | 64px | Não usado nesta fase (reservado, mesma nota das Fases 1 e 3) |

Exceptions:
- **Botão de envio WhatsApp inline (ícone-apenas, dentro do card do pipeline e do item do dashboard, D-14):** alvo de toque de 36px quadrado (`h-9 w-9`), mesmo padrão já usado para os ícones de ação de `subnicho-manager.tsx` (Fase 1) — não o token `size="icon"` menor (32px) do `button.tsx` padrão, para manter o alvo de toque acessível consistente com o precedente já estabelecido no código.
- **Ações de linha da lista de templates (editar/excluir):** mesmo alvo de 36px acima, mesmo padrão reaproveitado.
- **Textarea do modal de preview (D-15):** altura mínima de 128px (`min-h-32`) para acomodar mensagens de 3-4 linhas sem scroll imediato — não é um token reutilizável, é uma dimensão fixa deste componente específico.

---

## Typography

Reaproveitado integralmente das Fases 1 e 3 (mesmos 4 tamanhos, mesmos 2 pesos — nenhum tamanho/peso novo introduzido nesta fase):

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Label | 14px | 400 (regular) | 1.5 |
| Body | 16px | 400 (regular) | 1.5 |
| Heading | 20px | 600 (semibold) | 1.2 |
| Display | 28px | 600 (semibold) | 1.2 |

Uso específico desta fase:
- **Display (28px/600):** título da página `/` — texto "Follow-ups" (D-06, renomeado de "Leads"); título da página `/templates` — texto "Templates".
- **Heading (20px/600):** cabeçalho de cada uma das 3 seções de urgência do dashboard ("Vencidos", "Hoje", "Próximos 7 dias" — D-02); título do modal de preview de WhatsApp ("Pré-visualizar mensagem" — D-15); título do formulário de template (modo criar/editar).
- **Body (16px/400):** nome do lead em cada item do dashboard (linha principal, mais proeminente, mesmo padrão do nome no card do pipeline); nome do template na lista de `/templates`; texto digitado na textarea editável do preview (D-15).
- **Label (14px/400):** sub-nicho e data de follow-up dentro de cada item do dashboard (informação secundária, mesmo padrão do card do pipeline); contagem de itens por seção; preview truncado do corpo do template na lista; texto do tipo de template (badge); texto do estado vazio; texto de ajuda sob o campo "Corpo" do formulário de template (ex.: variáveis disponíveis).

Nenhum tamanho intermediário ou peso adicional (ex.: 12px, 700 bold) é introduzido — mantém consistência com as Fases 1 e 3.

**Foco visual da tela `/` (dashboard):** a lista de itens "Vencidos" é o foco visual primário — é a seção que resolve diretamente o "nunca mais perder um follow-up" (core value do projeto) e deve aparecer no topo, com o maior peso visual (cor de alerta + primeira posição). "Hoje" é o segundo foco; "Próximos 7 dias" é informativo/de planejamento, menor prioridade visual. O título "Follow-ups" (Display) é secundário à lista, mesma hierarquia já adotada nas Fases 1 e 3 (o dado é o protagonista, não o chrome).

**Foco visual da tela `/templates`:** a lista de templates agrupada por tipo é o foco primário; o formulário de criação/edição abre em modal (não substitui a lista), mesma convenção de `subnicho-manager.tsx`/`lead-form-dialog.tsx`.

---

## Color

Paleta dominante/secundária/accent/destructive reaproveitada **sem nenhuma alteração** das Fases 1 e 3. Esta fase não introduz nenhuma cor nova — as 3 seções de urgência do dashboard e o botão de envio de WhatsApp reaproveitam exatamente as cores semânticas já declaradas (badge de etapa "Perdido"/vermelho, badge de etapa "Negociação"/âmbar, indicador "esfriando"/âmbar, accent teal), evitando ultrapassar o orçamento de 60/30/10% já estabelecido.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#FFFFFF` | Fundo das páginas `/` e `/templates`, fundo de cada item do dashboard, fundo de cada linha de template, fundo do modal de preview |
| Secondary (30%) | `#F4F4F5` (zinc-100) | Sidebar (já existente), fundo de cada seção do dashboard (contêiner atrás dos itens, mesmo papel das colunas do board na Fase 3), cabeçalho de seção |
| Accent (10%) | `#0D9488` (teal-600) | Ver lista explícita abaixo — nunca aplicar fora dessa lista |
| Destructive | `#DC2626` (red-600) | Ações destrutivas apenas — ver lista abaixo |
| Urgência "Vencidos" (reaproveita paleta "Perdido" da Fase 3) | `#FEE2E2` / `#B91C1C` (red-100 / red-700) | Cabeçalho da seção "Vencidos" (fundo do badge de contagem + texto); texto da data de follow-up de cada item dentro dessa seção |
| Urgência "Hoje" (reaproveita paleta "esfriando"/"Negociação" da Fase 3) | `#FEF3C7` / `#B45309` (amber-100 / amber-700) | Cabeçalho da seção "Hoje" (fundo do badge de contagem + texto); texto da data de follow-up de cada item dentro dessa seção |
| Urgência "Próximos 7 dias" (reaproveita paleta "Novo" da Fase 1) | `#F4F4F5` / `#3F3F46` (zinc-100 / zinc-700) | Cabeçalho da seção "Próximos 7 dias" (fundo do badge de contagem + texto); texto da data de follow-up nesta seção usa `text-muted-foreground` padrão (sem cor semântica extra — é a seção de menor urgência) |

**Accent reserved for** (lista explícita, nada além disso — estende a lista já existente das Fases 1/3 com as 3 adições desta fase):
- Botão "Novo lead" no cabeçalho das páginas `/`, `/leads` e `/templates` (CTA global, D-06/D-13/D-14 da Fase 1)
- Botão "Salvar motivo" no modal de `motivoPerda` (Fase 3, inalterado)
- Botão "Novo template" no cabeçalho de `/templates`
- Botão "Salvar template" no formulário de criação/edição de template
- Botão "Abrir WhatsApp" no modal de preview (D-15) — ação primária do modal, não é destrutiva nem neutra
- Botão inline "Enviar WhatsApp" (ícone `MessageCircle`, dashboard + pipeline, D-14) — usa `variant="ghost"` com o ícone na cor accent teal, e não um verde de marca do WhatsApp: mantém a paleta do produto consistente em vez de introduzir uma 6ª cor (decisão de discrição desta pesquisa, ver nota abaixo)
- Badge "Padrão" no template marcado como default por tipo (D-12) — fundo `#0D9488`/10% opacidade, texto `#0D9488`, ícone `Check`
- Indicador do item ativo "Follow-ups"/"Templates" na sidebar (mesmo padrão de D-13/D-18 da Fase 1)
- Anel de foco (`focus-visible`) em itens focáveis do dashboard, linhas de template, e no textarea/select do modal de preview

**Nota de discrição — cor do botão "Enviar WhatsApp":** `04-CONTEXT.md` deixou a cor exata como discrição de Claude ("Visual styling specifics ... follow existing UI-SPEC conventions"). Decisão: usar o teal de accent já estabelecido, não o verde de marca do WhatsApp (`#25D366`). Justificativa — introduzir verde-WhatsApp quebraria a disciplina de 60/30/10% já validada nas 2 fases anteriores (seria uma 6ª cor de destaque competindo com o teal em telas onde ambos aparecem, ex. dashboard com CTA "Novo lead" + botão de envio lado a lado) e a identidade visual do produto já usa teal para toda ação primária; o ícone `MessageCircle` já comunica "isto abre o WhatsApp" sem depender de cor de marca.

**Destructive reserved for**:
- Botão "Excluir" no modal de confirmação de exclusão de template (D-13 — exclusão direta/hard delete, mas ainda com confirmação, ver Copywriting Contract)
- Botão "Excluir" já coberto pelas Fases 1/3 continua vermelho no modal de edição de lead
- Toast de erro (falha ao salvar/excluir template, falha ao criar lead)

**Badges de etapa (D-08):** reaproveitados sem alteração de `03-UI-SPEC.md`/`etapa-badge.tsx` (`STAGE_OPTIONS`) — cada item do dashboard exibe o `EtapaBadge` do lead, mesma paleta de 5 cores já declarada (Novo/Contatado/Negociação/Fechado/Perdido). Nenhuma alteração de paleta nesta fase; como o dashboard já exclui `fechado`/`perdido` por escopo (D-04), na prática só `novo`/`contatado`/`negociacao` aparecem, mas o componente é reaproveitado sem modificação.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Título da página `/` (dashboard) | "Follow-ups" |
| Item de navegação na sidebar (renomeado, D-06) | "Follow-ups" (era "Leads") |
| Item de navegação na sidebar (novo, D-06) | "Leads" (aponta para `/leads`) |
| Item de navegação na sidebar (novo, D-11) | "Templates" (aponta para `/templates`) |
| Título da página `/leads` | "Leads" (inalterado, apenas movido de `/`) |
| Título da página `/templates` | "Templates" |
| Primary CTA (cabeçalho de `/`, `/leads`, `/templates`) | "Novo lead" (reaproveita o CTA global já existente, D-13/D-14 da Fase 1) |
| Secondary CTA (cabeçalho de `/templates`) | "Novo template" |
| Cabeçalho de seção do dashboard (D-02) | Nome da seção + contagem, ex.: "Vencidos · 3" / "Hoje · 1" / "Próximos 7 dias · 5" — mesmo formato "Nome · contagem" já usado nos cabeçalhos de coluna do board (Fase 3) |
| Estado vazio do dashboard (D-03) | Heading: "Tudo em dia!" — Body: "Nenhum follow-up pendente." — Botões: "Ver todos os leads" (outline, leva a `/leads`) e "Novo lead" (accent) |
| Estado vazio de uma seção específica (ex.: "Hoje" vazio mas "Vencidos" tem itens) | Não exibir a seção (omitir cabeçalho + corpo vazio) — evita ruído visual de 3 seções sempre presentes quando 1-2 estão vazias; só a mensagem "Tudo em dia!" acima cobre o caso de **todas** vazias |
| Estado vazio de `/templates` (por tipo, ou geral) | "Nenhum template cadastrado ainda." acompanhado do botão "Novo template" — mesmo padrão do estado vazio de sub-nichos/leads (Fase 1) |
| Badge de tipo de template (dropdown/lista) | "1º contato" / "Follow-up" / "Prova de valor" (D-09) |
| Badge "Padrão" no template (D-12) | "Padrão" (badge curto, ícone `Check`, ao lado do nome do template na lista) |
| Botão "marcar como padrão" (linha de template não-default) | "Tornar padrão" (link/botão ghost, texto discreto) |
| Formulário de template — título (criar) | "Novo template" |
| Formulário de template — título (editar) | "Editar template" |
| Formulário de template — label campo Nome | "Nome" (placeholder: "Ex: Primeiro contato — nutricionista") |
| Formulário de template — label campo Tipo | "Tipo" (select: 1º contato / Follow-up / Prova de valor) |
| Formulário de template — label campo Corpo | "Mensagem" — texto de ajuda abaixo: "Use {nome}, {subnicho} ou {origem} para personalizar automaticamente." |
| Formulário de template — checkbox/switch | "Marcar como padrão para este tipo" |
| Formulário de template — botões | "Cancelar" (outline) / "Salvar template" (accent) |
| Erro de validação inline (formulário de template) | "Nome é obrigatório.", "Mensagem é obrigatória.", "Selecione um tipo." |
| Sucesso ao salvar template (toast) | "Template salvo com sucesso." |
| Erro ao salvar template (toast) | "Não foi possível salvar o template. Tente novamente." |
| Destructive confirmation — excluir template (D-13) | Título: "Excluir template". Corpo: "Tem certeza que deseja excluir o template \"{nome}\"? Essa ação não pode ser desfeita." Botões: "Cancelar" / "Excluir" (destructive) — confirmação leve mesmo sendo hard-delete, pois é uma ação irreversível (diferente do soft-delete de lead) |
| Sucesso ao excluir template (toast) | "Template excluído." |
| Erro ao excluir template (toast) | "Não foi possível excluir o template. Tente novamente." |
| Botão inline "Enviar WhatsApp" (dashboard + pipeline, D-14) | Ícone `MessageCircle` + `aria-label="Enviar WhatsApp para {nome}"` — ícone-apenas nos dois contextos (card do pipeline e item do dashboard), consistente com o espaço compacto de ambos |
| Botão inline desabilitado (D-17, telefone inválido) | Mesmo botão, `disabled`, com `title`/tooltip: "Telefone inválido — edite o lead" |
| Modal de preview — título (D-15) | "Pré-visualizar mensagem" |
| Modal de preview — subtítulo/contexto | "Mensagem para {nome}" |
| Modal de preview — label do seletor de tipo | "Tipo de mensagem" (select: 1º contato / Follow-up / Prova de valor, default contextual conforme D-15) |
| Modal de preview — label da textarea editável | "Mensagem" (textarea pré-preenchida com `renderTemplate()`, editável sem alterar o template salvo — D-15) |
| Modal de preview — botões | "Cancelar" (outline) / "Abrir WhatsApp" (accent, ícone `MessageCircle`, abre o link `wa.me` em nova aba) |
| Modal de preview — auto-aberto após criar lead (D-18/D-19) | Mesmo modal acima, com subtítulo adaptado: "Sugestão: enviar mensagem de primeiro contato para {nome}." — tipo pré-selecionado "1º contato", fechável sem enviar (D-20, não desfaz a criação do lead) |
| Erro ao carregar dashboard (fallback de página) | "Não foi possível carregar os follow-ups. Recarregue a página." — mesmo padrão de erro de carregamento já usado em `/` (Fase 1) |
| Erro ao carregar templates (fallback de página) | "Não foi possível carregar os templates. Recarregue a página." |

Todos os demais elementos de copy já cobertos (formulário de lead, exclusão de lead, sub-nichos, board/pipeline, `motivoPerda`) permanecem **inalterados** — ver `01-UI-SPEC.md` e `03-UI-SPEC.md`.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | `dialog`, `select`, `textarea`, `button`, `badge`, `field`, `label` (todos já instalados desde as Fases 1 e 3 — nenhum bloco novo do registry shadcn precisa ser adicionado nesta fase) | not required |
| third-party | nenhum | not applicable — nenhum registry de terceiros foi declarado nesta fase |

Nenhum bloco novo do registry shadcn é necessário — o dashboard, a tela de templates e o modal de preview reaproveitam `Dialog`/`Select`/`Textarea`/`Button`/`Badge`/`Field`/`Label` já existentes em `src/components/ui/`. Nenhuma dependência npm nova é adicionada nesta fase (confirmado em `04-RESEARCH.md`), portanto o gate de segurança de registry de terceiros não se aplica.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
