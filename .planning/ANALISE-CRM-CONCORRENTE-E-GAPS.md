# Análise — CRM do amigo (GS Info Sistemas) + gaps do nosso CRM solo

> **Data:** 2026-08-31
> Baseado em 3 screenshots do CRM interno que um amigo do usuário está construindo
> pra empresa onde trabalha, + pesquisa na internet sobre CRM para operação solo e
> o modelo white-label vs custom.

---

## 1. O que é o CRM do amigo

**"GS Info Sistemas"** — ferramenta interna da empresa. Roda em `localhost:3333`.
**Não é CRM de vendas — é um helpdesk multi-atendente de WhatsApp** (categoria
Chatwoot / Octadesk / Huggy / Take Blip).

### Tela "Atendimento" (caixa de entrada compartilhada)
- Abas: **Chats / Fila / Contatos**; lista "Meus atendimentos"
- Thread da conversa no centro, estilo WhatsApp (balões, timestamps, ✓✓)
- Campo de resposta com **`/atalho`** (inserção rápida de template), anexo, nota interna
- Ações no header do contato: editar, buscar no chat, **transferir**, marcar resolvido
- Tags no contato ("atacado · Suporte")
- Nota interna / responder-com-citação
- Toggle claro/escuro

### Tela "Dashboard" (visão de supervisor)
- Cards de estado: Em atendimento · Aguardando · Sem resposta · Finalizados hoje
- Cards de **SLA**: Primeira resposta (<1 min) · Tempo de conclusão (6 min) · Acima de 2h
- **Demanda por setor**: donut + lista (Suporte, Comercial, Financeiro, Fiscal, Frente de Caixa…)
- **Equipe agora**: presença por atendente (Disponível / Offline) + nº de chats ativos

### Navegação
Atendimento · Meu desempenho · Dashboard · Supervisão · **Equipe** · Templates ·
**Conexões** · Configurações · Logs

### A diferença crucial
| | CRM do amigo | Nosso CRM |
|---|---|---|
| Direção | **Inbound** (cliente manda primeiro) | **Outbound** (a gente vai atrás) |
| Operação | **Equipe** (fila, SLA, roteamento por setor, gestão de atendentes) | **Solo** (um admin) |
| Postura | **Reativo** (atende quem chega) | **Proativo** (empurra pelo funil) |
| Contexto | Empresa com TI e vários números | Uma pessoa, `wa.me` |

**São produtos diferentes pra problemas diferentes.** O amigo pode ter tudo aquilo
porque é uma empresa com equipe. Não é modelo replicável pro caso solo.

---

## 2. "Ver e responder conversa dentro do CRM" — a feature que o usuário quer

É uma **caixa de entrada de WhatsApp integrada** (tela "Atendimento" + tela "Conexões" = QR code).

### O custo real
Pra ler/responder WhatsApp dentro do app, precisa de **conexão viva** com o WhatsApp:
- **Não-oficial** (Baileys / whatsapp-web.js): risco de ban, processo Node rodando 24/7
- **API oficial** (BSP): custo + burocracia Meta + proibição de cold

O `CLAUDE.md` do projeto **decidiu de propósito não fazer isso** ("sem API oficial,
usar link `wa.me` com mensagem pré-preenchida") pra manter o projeto simples e grátis.

### Por que é mais arriscado no caso solo-outbound
O amigo é **inbound** (cliente manda primeiro = opt-in, ban baixo). O usuário é
**outbound solo** — mandaria cold de um número conectado. É a mesma bomba da "Perna A"
do Prospector (ver `Prospector Inteligente AI/ESTRATEGIA-DIFERENCIACAO.md`).

### A real, solo
O valor da caixa de entrada é alto quando há **equipe** dividindo conversa, com fila
e SLA. Solo, o ganho é basicamente "não trocar de aba" — o `wa.me` já abre o WhatsApp Web.

### Se for fazer mesmo
Versão de menor risco: **só ler + responder conversas que o lead já iniciou** (ele
respondeu), via conexão não-oficial do próprio número, por conta e risco, solo. Não é
ferramenta de disparo. **Mas isso é um projeto próprio** — socket, sessão persistente,
24/7 → precisa de VPS, amarra no plano inteiro do Prospector. É virada de escopo, não
"mais uma feature".

---

## 3. Cor / design — por que o do amigo não parece "vibecode"

O do amigo: **fundo azul-marinho escuro**, textura sutil de pontos na área de chat,
**um** accent (ciano/teal), pontinhos coloridos **só pra status** (verde = disponível,
cor por setor), cards com borda sutil, toggle claro/escuro.

**Parece produto porque:**
- Escolheu **UMA direção** (dark navy) e cravou
- **UM accent** confiante, não arco-íris
- Cor só onde **significa algo** (status)
- **Contenção** — zero gradiente roxo, zero glassmorphism, zero emoji na UI
- Textura que dá calor sem virar barulho

**O problema do nosso CRM não é "falta cor" — é falta de ponto de vista.** Hoje é
paleta `zinc`, cards brancos, accent mínimo. Adicionar cor aleatória = vira vibecode.

**Sintomas de vibecode a evitar:** shadcn default sem tocar, gradiente violeta em tudo,
glassmorphism sem motivo, muitos accents, emoji na interface, tudo arredondado demais,
sombra em tudo, placeholder tipo "Acme Inc".

**Caminho certo:** rodar `/brand-design` — gera 6 paletas candidatas, preview no
navegador, aplica nas variáveis CSS do shadcn (claro + escuro) + tipografia + escreve
`brand.md`. Depois `frontend-design-guidelines` (auto-aplicado ao estilizar componente).
Direções possíveis: **light quente** (fundo creme, neutros `stone` em vez de `zinc`,
um accent forte) OU **dark de verdade** tipo o do amigo. Já existe `#F59E0B` (amber) e
um primary teal-ish no projeto — dá pra partir daí.

---

## 4. Gaps do nosso CRM pra operação SOLO (pesquisa + análise)

Rankeado por utilidade real pro usuário (motoboy, na rua o dia todo):

1. **Visão mobile / responsiva** — hoje é só desktop-navegador (decisão do `CLAUDE.md`).
   Uma tela responsiva pra ver os follow-ups do dia e marcar "contato feito" **entre
   corridas** seria o ganho nº 1. Pesquisa sobre CRM solo bate nisso repetidamente.
2. **Lembrete ativo** — hoje o dashboard de follow-up só mostra ao abrir. Notificação
   do navegador, ou resumo diário no próprio WhatsApp ("hoje: 4 follow-ups").
3. **`/atalho` no campo de mensagem** — copiar o padrão do amigo: digitar `/` insere
   template rápido. UX boa, barato.
4. **Dedup por telefone no import** — não impede lead duplicado hoje (já é gap do
   handoff Prospector).

**Já coberto e ok:** pipeline, follow-up escalonado (fases 6/7/10), métricas + motivos
de perda + filtro de data (fases 11/14), agenda de tarefas (fase 12), templates `wa.me`,
wizard de CSV.

**NÃO precisa (é solo):** email, fila, SLA, roteamento por setor, gestão de equipe.

---

## 5. White-label vs custom — a pergunta estratégica do usuário

**"A maioria das empresas quer customizado todo pra empresa dela?" → Não.**

- **PME / pequeno negócio (mercado de volume):** pega pronto e **adapta o processo à
  ferramenta**. NÃO quer custom — quer funcionar hoje, barato. Pesquisa: "comprar é
  solução de curto prazo pra startup pequena; construir custom é jogada de empresa
  estabelecida".
- **Quem quer custom de verdade:** média/grande empresa — ciclo longo, integração, SSO,
  suporte dedicado. **Um solo não atende isso.**
- **Custom por empresa como solo = virar contratado**, um cliente por vez, não escala.
  É a situação do amigo (constrói pra empresa onde trabalha = emprego, não produto).
- **White-label de verdade** = agência/revendedor bota a marca dele e vende pros
  clientes finais (modelo GoHighLevel, Vendasta). Negócio real, mas exige multi-tenant
  + confiabilidade + suporte = 1-2 anos, competindo com GoHighLevel.

**A pergunta certa não é custom vs white-label. É: o usuário não tem distribuição.**
Um produto configurável DÁ pra vender pra PME — mas só alcançando PME suficiente,
barato. Solo, agora, não alcança.

**Caminho:** serviço primeiro (o CRM como **ferramenta de entrega**, config leve por
cliente), produto self-service depois **se** a distribuição se formar. Ver
`Prospector Inteligente AI/DIRECAO-NEGOCIO-2026-08-30.md`. "Customizado pra cada
empresa" é armadilha dos dois lados: muito trabalho por cliente, não escala.

---

## Fontes (pesquisa 2026-08-31)

- [Flowlu — Best CRM for Solopreneurs 2026](https://www.flowlu.com/blog/crm/what-is-the-best-crm-for-solopreneurs/)
- [inflowave — Best Instagram CRM Tools 2026](https://inflowave.io/resources/best-instagram-crm-tools)
- [taskip — Best CRM with WhatsApp Integration 2026](https://taskip.net/best-crm-with-whatsapp-integration/)
- [ergobite — Custom vs Ready-Made CRM for Small Business 2026](https://ergobite.com/us/custom-crm-vs-ready-made-crm/)
- [Netclues — White-Label vs Custom CRM Cost Guide 2026](https://www.netclues.com/blog/white-label-vs-custom-crm-cost)
- [white-label-crm — Best White-Label CRM Guide 2026](https://white-label-crm.ghost.io/best-white-label-crm-guide/)
