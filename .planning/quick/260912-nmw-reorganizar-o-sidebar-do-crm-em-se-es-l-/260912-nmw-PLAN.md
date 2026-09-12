---
phase: quick-260912-nmw
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - scripts/verify-sidebar-nav.cjs
  - package.json
  - src/components/app-sidebar.tsx
autonomous: true
requirements: [QUICK-260912-nmw]

must_haves:
  truths:
    - "O admin vê os 12 itens da sidebar agrupados sob 4 rótulos de seção (Principal, Prospecção, Operação, Configuração) em vez de uma lista corrida"
    - "Os 5 passos do tour guiado (Fase 25) continuam encontrando seus alvos: os seletores [data-tour=\"nav-dashboard\"|\"nav-leads\"|\"nav-pipeline\"|\"nav-campanhas\"|\"nav-relatorios\"] seguem existindo no DOM, nos mesmos <Link>"
    - "Nenhum item de navegação sumiu nem foi inventado: exatamente os 12 hrefs atuais continuam renderizados"
    - "O item ativo continua destacado, os ícones lucide continuam nos mesmos itens, e o header de marca (SOLO) + o ThemeToggle do rodapé ficam intactos"
    - "A sidebar agrupada renderiza corretamente em tema claro e escuro, sem nenhuma cor nova hardcoded"
  artifacts:
    - path: "scripts/verify-sidebar-nav.cjs"
      provides: "Guarda automatizada do contrato da sidebar: 12 hrefs, 5 tourIds cruzados com tour-steps.ts, 4 rótulos de grupo"
      min_lines: 60
    - path: "src/components/app-sidebar.tsx"
      provides: "Navegação agrupada em NAV_GROUPS, preservando tourId/ícones/estado ativo"
      contains: "NAV_GROUPS"
    - path: "package.json"
      provides: "Script npm verify:sidebar"
      contains: "verify:sidebar"
  key_links:
    - from: "src/lib/tour-steps.ts"
      to: "src/components/app-sidebar.tsx"
      via: "seletor CSS [data-tour=\"nav-*\"] resolvido pelo campo tourId do item de navegação"
      pattern: "data-tour=\\{item\\.tourId\\}"
    - from: "scripts/verify-sidebar-nav.cjs"
      to: "src/lib/tour-steps.ts + src/components/app-sidebar.tsx"
      via: "leitura estática dos dois arquivos e cruzamento dos 5 seletores"
      pattern: "tour-steps\\.ts"
---

<objective>
Reorganizar a barra lateral do CRM de uma lista corrida de 12 itens para 4 seções rotuladas, usando **apenas os itens que já existem**, sem novas telas, sem novas dependências e sem novos primitivos de UI.

Purpose: com 12 itens no mesmo nível, o admin perde tempo varrendo a lista toda pra achar "Motivos de Perda" ou "Mapa de Nichos". Agrupar por intenção (usar o funil / prospectar / analisar / configurar) faz o alvo cair no grupo certo de relance.
Output: `app-sidebar.tsx` agrupado + uma guarda automatizada (`verify:sidebar`) que impede que essa reorganização — ou qualquer edição futura — quebre os 5 seletores do tour guiado da Fase 25.
</objective>

<execution_context>
@C:/Users/Vencedor/Desktop/crm-leads/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Vencedor/Desktop/crm-leads/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@./CLAUDE.md
@src/components/app-sidebar.tsx
@src/lib/tour-steps.ts
@scripts/verify-theme.cjs

<interfaces>
<!-- Contratos já existentes no código. O executor NÃO precisa explorar o codebase. -->

De `src/components/app-sidebar.tsx` (estado atual, lista plana):

```ts
type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  tourId?: string;   // só os 5 itens tourados (Fase 25) têm valor real
};
```

Os 12 itens atuais, em ordem de arquivo (href, label, ícone lucide, tourId):

| href | label | icon | tourId |
|------|-------|------|--------|
| `/` | Follow-ups | `Clock` | `nav-dashboard` |
| `/leads` | Leads | `Users` | `nav-leads` |
| `/importar` | Importar | `Upload` | — |
| `/pipeline` | Pipeline | `Kanban` | `nav-pipeline` |
| `/campanhas` | Campanhas | `Target` | `nav-campanhas` |
| `/mapa-de-nichos` | Mapa de Nichos | `MapIcon` (`Map as MapIcon`) | — |
| `/relatorios` | Relatórios | `BarChart3` | `nav-relatorios` |
| `/templates` | Templates | `MessageSquare` | — |
| `/nichos` | Nichos | `Tag` | — |
| `/motivos-perda` | Motivos de Perda | `ListX` | — |
| `/lixeira` | Lixeira | `Trash2` | — |
| `/configuracoes` | Configurações | `Settings` | — |

Padrão de rótulo de seção **que já existe no arquivo** (o `<p>` "Principal", hoje irmão do `<nav>`) — é ESTE o padrão a reusar, não há `src/components/ui/sidebar.tsx` / `SidebarGroup` no projeto:

```
className="px-[14px] pt-3 pb-1.5 text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground"
```

De `src/lib/tour-steps.ts` (arquivo NÃO é tocado por este plano) — os 5 alvos do tour:

```
'[data-tour="nav-dashboard"]'  '[data-tour="nav-leads"]'  '[data-tour="nav-pipeline"]'
'[data-tour="nav-campanhas"]'  '[data-tour="nav-relatorios"]'
```

De `scripts/verify-theme.cjs` (gate já existente que lê a sidebar — precisa continuar verde):
asserta que `app-sidebar.tsx` contém `import { ThemeToggle }`, `<ThemeToggle` e `mt-auto`.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Sensor do contrato da sidebar (nasce VERMELHO por construção)</name>
  <files>scripts/verify-sidebar-nav.cjs, package.json</files>
  <action>
Criar `scripts/verify-sidebar-nav.cjs` (CommonJS, zero dependência, mesmo molde dos guards existentes como `scripts/verify-theme.cjs`) e registrar o script npm `"verify:sidebar": "node scripts/verify-sidebar-nav.cjs"` em `package.json`.

O script lê `src/components/app-sidebar.tsx` e `src/lib/tour-steps.ts` como texto, **remove comentários antes de qualquer asserção** (blocos `/* ... */` e linhas `//`) — sem isso, prosa de cabeçalho mencionando "Principal" ou "nav-dashboard" auto-valida a guarda — e falha com `process.exit(1)` imprimindo cada violação. Asserções:

1. **Contrato do tour (o mais importante):** extrair de `tour-steps.ts` todos os valores via `/\[data-tour="([^"]+)"\]/g`; exigir exatamente 5. Para cada valor, exigir que o fonte da sidebar contenha `tourId: "<valor>"` **exatamente uma vez** (contagem === 1, nem 0 nem 2).
2. **Fiação do atributo:** o fonte da sidebar contém `data-tour={item.tourId}` (o atributo continua sendo emitido a partir do campo, não removido nem renomeado).
3. **Inventário fechado de 12 itens:** a lista dos 12 hrefs esperados (tabela em `<interfaces>`) é hardcoded no script; cada um aparece exatamente uma vez na forma `href: "<path>"`, e a contagem TOTAL de ocorrências de `href: "` no fonte é exatamente 12 — trava contra item sumido E contra tela inventada.
4. **Grupos:** os 4 rótulos `"Principal"`, `"Prospecção"`, `"Operação"`, `"Configuração"` aparecem cada um como string literal no fonte, e existe um identificador `NAV_GROUPS`.
5. **Preservações de rodapé/marca:** o fonte ainda contém `<ThemeToggle`, `mt-auto` e o texto `SOLO` (redundância barata com `verify:theme`, mantém o sensor auto-contido).

Sucesso: `exit 0` + uma linha de resumo. Falha: lista de violações + `exit 1`.

Provar a guarda por **teste de mutação em cópia temporária**, NUNCA escrevendo no fonte real (precedente do projeto, `scripts/guard-*` / `verify-origem-tipo.cjs`): copiar `app-sidebar.tsx` para `os.tmpdir()`, remover `tourId: "nav-pipeline"` da cópia, rodar a lógica contra a cópia e confirmar que ela reprova. Se for mais simples, aceitar um segundo argumento de CLI opcional com o caminho do fonte da sidebar (default: o caminho real) só para viabilizar esse teste.

Neste momento as asserções 1, 2, 3 e 5 já passam contra o código atual; a asserção 4 (grupos) **falha de propósito** — é o estado RED do sensor, que fica verde na Task 2. Não altere `app-sidebar.tsx` nesta task.
  </action>
  <verify>
    <automated>cd "C:/Users/Vencedor/Desktop/crm-leads" && npm run verify:sidebar; test $? -eq 1 && npm run verify:sidebar 2>&1 | grep -qi "NAV_GROUPS\|Prospec" && echo "RED OK (falha só por grupo ausente)"</automated>
  </verify>
  <done>`npm run verify:sidebar` existe, sai com código 1, e a saída mostra que as ÚNICAS violações são as do grupo (rótulos / `NAV_GROUPS`) — nenhuma violação de tourId, de href ou de rodapé. O teste de mutação (remoção de um `tourId` numa cópia em tmpdir) foi executado e reprovou como esperado. `src/components/app-sidebar.tsx` não foi modificado.</done>
</task>

<task type="auto">
  <name>Task 2: Agrupar os 12 itens em 4 seções na sidebar</name>
  <files>src/components/app-sidebar.tsx</files>
  <action>
Trocar a constante plana `NAV_ITEMS` por `NAV_GROUPS: NavGroup[]`, onde `type NavGroup = { label: string; items: NavItem[] }`. O tipo `NavItem` fica **inalterado** (incluindo o comentário de cabeçalho que explica por que `tourId` é opcional e por que não há `as const` — continua valendo).

Grupos e ordem (apenas itens reais; é proibido inventar categoria que exija tela inexistente — "Empresas"/"Automações" estão fora de escopo):

- **Principal** — Follow-ups (`/`), Leads (`/leads`), Pipeline (`/pipeline`)
- **Prospecção** — Campanhas (`/campanhas`), Mapa de Nichos (`/mapa-de-nichos`), Importar (`/importar`)
- **Operação** — Relatórios (`/relatorios`), Templates (`/templates`)
- **Configuração** — Nichos (`/nichos`), Motivos de Perda (`/motivos-perda`), Configurações (`/configuracoes`), Lixeira (`/lixeira`)

Cada item carrega **exatamente** o mesmo `href`, `label`, ícone e `tourId` da tabela em `<interfaces>` — copiar os objetos, não reescrevê-los de memória. Os 5 `tourId` são intocáveis; todos os 12 imports de ícone de `lucide-react` continuam em uso (nenhum import órfão, senão o lint quebra).

Renderização: manter **um único** `<nav className="flex flex-col gap-[3px] px-[14px]" aria-label="Navegação principal">` e, dentro dele, mapear `NAV_GROUPS`. Para cada grupo emitir o rótulo + os links do grupo. Remover o `<p>` "Principal" solto que hoje é irmão do `<nav>` — ele vira o primeiro rótulo gerado pelo map.

Alinhamento pixel-a-pixel (importante): hoje o `<p>` do rótulo tem `px-[14px]` porque é filho direto do `<aside>` (sem padding). Ao mover o rótulo para DENTRO do `<nav>` (que já tem `px-[14px]`), **remova o `px-[14px]` do rótulo** e mantenha o resto da classe idêntico (`pt-3 pb-1.5 text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground`) — assim o rótulo continua começando no mesmo x de antes.

Acessibilidade: envolver cada grupo num container (`<div>`) com `aria-labelledby` apontando para o `id` do seu `<p>` de rótulo (ex.: `id={`nav-group-${slug}`}`, slug derivado do índice ou do label normalizado) — o container carrega `className="flex flex-col gap-[3px]"` para preservar o espaçamento entre links. Não usar `role` redundante.

O bloco `<Link>` (cálculo de `isActive`, `aria-current`, `data-tour={item.tourId}`, `cn(...)` com `bg-sidebar-accent` / `text-sidebar-foreground`, `<Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />`) é copiado **sem nenhuma alteração** — mesma lógica `item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)`, mesmas classes. Zero cor nova: só tokens existentes (`bg-sidebar*`, `text-muted-foreground`), nada de hex/rgb/classe de paleta crua — a reorganização precisa ficar correta em claro e escuro sem tocar em cor.

Header de marca (selo "S" + "SOLO") e o rodapé `mt-auto` com `<ThemeToggle />` ficam exatamente como estão.
  </action>
  <verify>
    <automated>cd "C:/Users/Vencedor/Desktop/crm-leads" && npm run verify:sidebar && npm run verify:theme && npm run verify:brand && npx tsc --noEmit && npm run lint && grep -c 'href: "' src/components/app-sidebar.tsx</automated>
    <human-check>Abrir o app em `npm run dev`: a sidebar mostra os 4 rótulos na ordem Principal / Prospecção / Operação / Configuração com os itens certos embaixo de cada um; clicar em um item de cada grupo navega e destaca o item ativo; alternar o tema (toggle do rodapé) e conferir que rótulos e itens continuam legíveis no claro e no escuro; disparar o tour guiado e confirmar que os 5 balões ancoram nos itens certos (Follow-ups, Leads, Pipeline, Campanhas, Relatórios).</human-check>
  </verify>
  <done>`npm run verify:sidebar` sai 0 (5 tourIds intactos, 12 hrefs, 4 grupos); `verify:theme`, `verify:brand`, `tsc --noEmit` e `lint` continuam verdes; o `grep -c 'href: "'` devolve exatamente 12; nenhum import de `lucide-react` ficou órfão.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| (nenhuma nova) | A sidebar é navegação 100% estática: zero entrada de usuário, zero dado de banco, zero URL interpolada. Nenhum limite de confiança novo é cruzado por esta mudança. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-Q260912-01 | Tampering | `src/components/app-sidebar.tsx` × `src/lib/tour-steps.ts` | mitigate | Regressão silenciosa que remove/renomeia um `data-tour="nav-*"` deixa o tour da Fase 25 apontando pro vazio sem erro em runtime. Mitigado pela Task 1: `verify:sidebar` cruza os 5 seletores entre os dois arquivos e falha o build local; provado por teste de mutação. |
| T-Q260912-02 | Tampering | inventário de rotas da sidebar | mitigate | Reorganização pode apagar um item (rota vira inalcançável pela UI) ou introduzir link pra tela inexistente (404). Mitigado pela asserção 3 do `verify:sidebar`: os 12 hrefs esperados, contagem total travada em 12. |
| T-Q260912-03 | Information Disclosure | rótulos de seção | accept | Rótulos são strings estáticas em PT-BR, sem PII e sem dado de banco; a app é solo e não tem superfície pública. |
| T-Q260912-SC | Tampering | instalações npm/pip/cargo | accept | **Zero pacote novo instalado** neste plano (restrição explícita da tarefa). Nenhum gate de legitimidade de pacote se aplica; se o executor sentir necessidade de instalar algo, isso é sinal de que saiu do escopo — parar e reportar. |
</threat_model>

<verification>
1. `npm run verify:sidebar` → exit 0
2. `npm run verify:theme` → exit 0 (ThemeToggle + `mt-auto` preservados)
3. `npm run verify:brand` → exit 0 (nenhuma cor hardcoded nova)
4. `npx tsc --noEmit` → limpo
5. `npm run lint` → exit 0 (sem import de ícone órfão)
6. `grep -c 'href: "' src/components/app-sidebar.tsx` → `12`
7. Conferência cruzada manual dos 5 alvos do tour: cada `target` de `src/lib/tour-steps.ts` tem um `tourId` correspondente em `NAV_GROUPS`
</verification>

<success_criteria>
- A sidebar renderiza 4 seções rotuladas (Principal, Prospecção, Operação, Configuração) contendo os 12 itens reais existentes — nenhum item novo, nenhum item perdido
- Os 5 atributos `data-tour="nav-dashboard|nav-leads|nav-pipeline|nav-campanhas|nav-relatorios"` continuam nos mesmos `<Link>`, com o mesmo valor (contagem antes === contagem depois === 1 cada)
- Estilo de item ativo, ícones lucide, header de marca SOLO e ThemeToggle do rodapé inalterados
- Funciona em tema claro e escuro sem nenhuma cor nova hardcoded
- Existe uma guarda automatizada (`npm run verify:sidebar`) que reprova qualquer regressão futura nesses contratos
- Zero pacote npm novo, zero primitivo de UI novo, zero tela nova
</success_criteria>

<output>
Criar `.planning/quick/260912-nmw-reorganizar-o-sidebar-do-crm-em-se-es-l-/260912-nmw-SUMMARY.md` ao terminar
</output>
