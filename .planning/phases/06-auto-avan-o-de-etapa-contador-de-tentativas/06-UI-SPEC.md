---
phase: 6
slug: 06-auto-avanço-de-etapa-contador-de-tentativas
status: draft
shadcn_initialized: true
preset: base-nova
created: 2026-07-31
---

# Fase 6 — Contrato de Design de UI

> Contrato visual e de interação para fases de frontend. Gerado por gsd-ui-researcher, verificado por gsd-ui-checker.

**Contexto do projeto:** `components.json` já existe (preset `base-nova` sobre Base UI, confirmado na Fase 1, reaproveitado sem alteração nas Fases 3/4/5). Esta fase é uma extensão cirúrgica de dois componentes já existentes — `whatsapp-preview-dialog.tsx` (adiciona o toast de auto-avanço, D-07) e `pipeline-lead-card.tsx` (adiciona o indicador do contador de tentativas, D-05/D-06) — nenhum componente novo, nenhuma tela nova, nenhuma cor ou tamanho de fonte novo. Todas as decisões visuais desta fase já vieram travadas em `06-CONTEXT.md` (D-01 a D-07) e confirmadas tecnicamente em `06-RESEARCH.md` (Pattern 1/2, Code Examples). Este contrato apenas formaliza essas decisões no formato de contrato de design e resolve, de forma prescritiva, o único ponto de discrição visual restante (cor do texto do contador).

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn (já inicializado na Fase 1 — `components.json` confirmado neste repositório) |
| Preset | `base-nova` (confirmado via `components.json`: style `base-nova`, baseColor `neutral`, cssVariables true) — inalterado |
| Component library | Base UI (mesma base das Fases 1, 3, 4, 5) |
| Icon library | lucide-react — nenhum ícone novo introduzido nesta fase: `MessageCircle` (D-05) já é usado em `whatsapp-send-button.tsx` e no botão "Abrir WhatsApp" do próprio `whatsapp-preview-dialog.tsx`; reaproveitado sem alteração para o contador do card |
| Font | Geist Sans (`--font-sans`, mesma das Fases 1, 3, 4, 5) |
| Novas dependências npm | Nenhuma — confirmado em `06-RESEARCH.md` ("zero pacotes novos"). Nenhum item de registry shadcn novo é necessário: nenhum componente de UI novo é adicionado, apenas JSX condicional dentro de dois arquivos já existentes. |

---

## Spacing Scale

Valores declarados (múltiplos de 4) — idênticos aos das Fases 1, 3, 4 e 5, reaproveitados sem alteração. Nenhum valor novo é introduzido nesta fase.

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Gap entre o ícone `MessageCircle` e o número do contador (D-05) — mesmo `gap-1` já usado pelo indicador "Esfriando" no mesmo card |
| sm | 8px | Não usado diretamente nesta fase (herdado do card) |
| md | 16px | Padding interno do card do pipeline (inalterado, herdado da Fase 3) |
| lg | 24px | Não usado diretamente nesta fase (herdado do layout do board) |
| xl | 32px | Não usado nesta fase |
| 2xl | 48px | Não usado nesta fase |
| 3xl | 64px | Não usado nesta fase (reservado, mesma nota das fases anteriores) |

Exceptions:
- **Ícone do contador (D-05):** `size-3.5` (14px) — mesmo tamanho já usado pelo ícone `Clock` do indicador "Esfriando" no mesmo card (`pipeline-lead-card.tsx`), garantindo alinhamento visual entre os dois indicadores quando ambos aparecem lado a lado na mesma linha de metadados.
- Nenhuma outra exceção de espaçamento nesta fase — o toast de auto-avanço (D-07) usa o componente `sonner` padrão já configurado no app, sem espaçamento customizado.

---

## Typography

Reaproveitado integralmente das Fases 1, 3, 4 e 5 (mesmos 4 tamanhos, mesmos 2 pesos — nenhum tamanho/peso novo introduzido nesta fase):

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Label | 14px | 400 (regular) | 1.5 |
| Body | 16px | 400 (regular) | 1.5 |
| Heading | 20px | 600 (semibold) | 1.2 |
| Display | 28px | 600 (semibold) | 1.2 |

Uso específico desta fase:
- **Label (14px/400):** texto do contador de tentativas no card do pipeline (ex.: "3x"), na mesma linha de metadados que já mostra a data de follow-up e o indicador "Esfriando" — mesmo role tipográfico usado por ambos.
- **Toast de auto-avanço (D-07):** usa a tipografia padrão do componente `sonner` já configurado no app (mesmo padrão do toast existente em `pipeline-board.tsx:141`) — não é um novo estilo de texto, é o mesmo sistema de toast já em produção.

Nenhum tamanho intermediário ou peso adicional é introduzido — mantém consistência com todas as fases anteriores.

**Foco visual:** esta fase não altera o foco visual primário de nenhuma tela (`/pipeline` continua com o board como protagonista, Fase 3; `/`, `/leads`, `/importar/[batchId]` continuam com suas listas/dashboard como protagonistas, Fases 1/4/5). O contador e o toast são indicadores secundários e transitórios, respectivamente — nunca competem pelo foco visual principal da tela.

---

## Color

Paleta dominante/secundária/accent/destructive reaproveitada **sem nenhuma alteração** das fases anteriores. Esta fase não introduz nenhuma cor semântica nova.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#FFFFFF` | Fundo das páginas e cards (inalterado) |
| Secondary (30%) | `#F4F4F5` (zinc-100) | Sidebar, fundo de coluna do board (inalterado) |
| Accent (10%) | `#0D9488` (teal-600) | Ver lista explícita abaixo — nenhuma adição nesta fase |
| Destructive | `#DC2626` (red-600) | Não aplicável nesta fase — nenhuma ação destrutiva é introduzida |
| Contador de tentativas (D-05, decisão desta pesquisa) | `text-muted-foreground` (mesma cor neutra do zinc já usada para sub-nicho e data de follow-up no card) | Ícone `MessageCircle` + número do contador no card do pipeline |

**Decisão de cor do contador (resolve a discrição de CSS/layout deixada em `06-CONTEXT.md`):** o contador usa a cor neutra `text-muted-foreground`, **não** a cor âmbar do indicador "Esfriando" nem o teal de accent. Justificativa: D-06/REQUIREMENTS.md (Out of Scope) proíbem explicitamente "escalonamento visual/lógico do contador de tentativas (cores...)" — um contador colorido daria a falsa impressão de um sinal de alerta/urgência (como "Esfriando" já é), quando na verdade é só uma contagem informativa neutra ("mostra o número", nada além disso). Manter neutro também evita introduzir uma 6ª cor de destaque no card, preservando a disciplina 60/30/10 já validada nas Fases 1/3/4.

**Accent reserved for** (lista reaproveitada das Fases 1/3/4, nenhuma adição nesta fase):
- Botão "Novo lead" nos cabeçalhos das páginas existentes
- Botão "Salvar motivo" no modal de `motivoPerda`
- Botão "Salvar template" / "Novo template"
- Botão "Abrir WhatsApp" no modal de preview (D-15 da Fase 4) — **inalterado nesta fase**, continua acionando a navegação nativa do `<a href>`; a nova mutação de servidor (`registerWhatsAppContact`) é disparada no mesmo `onClick`, sem alterar a cor/estilo do botão
- Botão inline "Enviar WhatsApp" (ícone teal, ghost)
- Indicador do item ativo na sidebar
- Anel de foco (`focus-visible`)

**Destructive reserved for**: não aplicável nesta fase — nenhuma ação destrutiva nova é introduzida (WA-06/07/08 não envolvem exclusão nem irreversibilidade fora do já coberto pelas fases anteriores).

**Indicador "Esfriando" (D-08 da Fase 3):** inalterado — continua âmbar (`#F59E0B` borda / `#B45309` texto), reaproveitado sem modificação. O novo indicador de contador (neutro) aparece na mesma linha, à direita do indicador "Esfriando" quando ambos estão presentes, sem conflito de cor entre os dois.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Toast de auto-avanço (WA-06, D-07 — travado, não decisão desta pesquisa) | **"{Nome} avançou para Contatado."** — ex.: "Maria Silva avançou para Contatado." Disparado via `toast.success(...)` (sonner), somente quando a Server Action retorna `{ advanced: true }`. Diferente do toast genérico do drag-and-drop ("Lead movido para {etapa}.") por decisão explícita D-07 — este precisa nomear o lead porque o clique pode ocorrer em telas com múltiplos leads visíveis (dashboard, lista, pós-importação), não só no board onde o contexto já é visual |
| Indicador de contador no card do pipeline (WA-08, D-05/D-06) | Ícone `MessageCircle` (`size-3.5`, `text-muted-foreground`) + `"{n}x"` — ex.: "3x". Só renderiza quando `contactAttempts > 0` (D-06); nenhum texto/label adicional (nenhum "tentativas de contato:" por extenso — mesmo espírito compacto do indicador "Esfriando") |
| `aria-label` do indicador de contador (acessibilidade, não decidido em CONTEXT.md — default desta pesquisa) | `aria-label="{n} tentativas de contato"` no `<span>` wrapper do indicador, para leitores de tela — mesmo padrão de `aria-label` já usado em `whatsapp-send-button.tsx` |
| Falha silenciosa da mutação (Pattern 1 do RESEARCH.md) | Nenhuma copy — falha de `registerWhatsAppContact` é silenciosa por design (`.catch(() => {})`), nunca exibe toast de erro sobre uma aba do WhatsApp que já abriu. Nenhum novo texto de erro é necessário nesta fase |
| Empty state | Não aplicável — esta fase não introduz nenhuma tela ou lista nova, apenas indicadores condicionais em componentes já existentes cujos empty states (dashboard "Tudo em dia!", coluna "Nenhum lead nessa etapa") permanecem inalterados |
| Destructive confirmation | Não aplicável — nenhuma ação destrutiva nova é introduzida nesta fase |
| Primary CTA | Não aplicável — esta fase não introduz nenhum CTA novo; "Abrir WhatsApp" (accent, já existente desde a Fase 4) permanece o botão de commit, apenas ganha um efeito colateral de servidor no mesmo clique |

Todos os demais elementos de copy já cobertos (formulário de lead, board, dashboard, templates, sub-nichos) permanecem **inalterados** — ver `01-UI-SPEC.md`, `03-UI-SPEC.md`, `04-UI-SPEC.md`, `05-UI-SPEC.md`.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|--------------|
| shadcn official | Nenhum bloco novo — nenhum componente de UI novo é adicionado. `Button`, `Dialog`, `Select`, `Textarea`, `Field`/`Label` (todos já instalados desde as Fases 1/4) continuam inalterados; a única mudança de UI é JSX condicional dentro de `whatsapp-preview-dialog.tsx` (adiciona `onClick` handler + `.then()`) e `pipeline-lead-card.tsx` (adiciona `<span>` condicional) | not required |
| third-party | nenhum | not applicable — nenhum registry de terceiros foi declarado nesta fase |

Nenhum bloco novo do registry shadcn é necessário. Nenhuma dependência npm nova é adicionada nesta fase (confirmado em `06-RESEARCH.md` — "Nenhum pacote novo é necessário"), portanto o gate de segurança de registry de terceiros não se aplica.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
