---
status: resolved
trigger: "Achado durante UAT da Fase 10: tabela templates vazia no banco real faz a caixa de mensagem do diálogo de WhatsApp abrir vazia, e um clique em 'Abrir WhatsApp' com mensagem vazia é rejeitado silenciosamente pela validação do servidor (sem registrar tentativa, sem avisar o admin)."
created: 2026-08-13T13:25:00Z
updated: 2026-08-13T14:35:00Z
---

## Current Focus
<!-- OVERWRITE on each update - always reflects NOW -->

hypothesis: "registerWhatsAppContact usa whatsappContactSchema (texto: z.string().trim().min(1)) — quando o textarea está vazio (sem template cadastrado para aquele tipo e o admin não digitou nada), o safeParse falha e a função retorna { advanced: false } sem lançar erro nem gravar nada. O componente cliente (whatsapp-preview-dialog.tsx) só checa result.advanced para mostrar toast de sucesso; não existe nenhum caminho que avise o admin que a tentativa NÃO foi registrada. O link 'Abrir WhatsApp' abre normalmente mesmo com texto vazio, então o admin não tem nenhum sinal visual de que algo deu errado."
test: "Confirmado lendo src/components/whatsapp-preview-dialog.tsx e a função registerWhatsAppContact em src/actions/lead-actions.ts (linhas 264-325, comentário linha 249 confirma 'texto agora é obrigatório... falha o safeParse e não grava tentativa nem interação, por design')."
expecting: "Fix client-side: desabilitar o link 'Abrir WhatsApp' (trocar por Button disabled) quando texto.trim() estiver vazio, com aviso inline no mesmo padrão visual já usado para telefone inválido."
next_action: "RESOLVIDO — verificado via automação de navegador (Chrome): abri o diálogo de dra.marcellavalladares, apaguei o texto pré-preenchido pelo template padrão, confirmei visualmente botão desabilitado + aviso 'Mensagem vazia'. Cliquei mesmo assim para confirmar; extensão do Chrome caiu no meio do teste, então validei de forma independente pelo banco: contact_attempts/sequenciaPosicao do lead continuaram em 0 após o clique — confirma que nenhuma chamada a registerWhatsAppContact ocorreu. Sessão arquivada."
reasoning_checkpoint:
  hypothesis: "O link 'Abrir WhatsApp' fica clicável mesmo com texto vazio porque nada no client gateia esse caso; o servidor (registerWhatsAppContact) rejeita silenciosamente por design (safeParse falha, retorna {advanced:false}, sem exceção), e o único handler .then()/.catch() no client só reage a advanced:true (toast de sucesso) ou a exceções (não há exceção aqui)."
  confirming_evidence:
    - "lead-actions.ts linha 269-272: whatsappContactSchema.safeParse falha com texto vazio -> return {advanced:false} sem throw, sem log."
    - "lead-actions.ts comentário linha 248-250: confirma que isso é comportamento intencional ('por design'), não um bug de servidor a corrigir lá."
    - "whatsapp-preview-dialog.tsx linhas 184-218: waHref só é undefined quando !tel; nunca considera texto vazio. O anchor está sempre ativo quando há telefone válido, independente do conteúdo da textarea."
    - "whatsapp-preview-dialog.tsx linhas 194-204: o .then() só mostra toast quando result.advanced é true; o .catch() é deliberadamente silencioso (comentário confirma) e nunca dispararia de qualquer forma pois não há exceção."
  falsification_test: "Se ao esvaziar a textarea e clicar 'Abrir WhatsApp' o app já impedisse ou avisasse (bloqueio de client, toast de erro, disabled), a hipótese estaria errada. Não é o caso — reprodução manual e leitura de código confirmam ausência total desse caminho."
  fix_rationale: "A causa raiz é a ausência de validação/feedback no client antes de abrir o link, não a validação do servidor em si (que é intencional e correta para não gravar interação com texto vazio). Corrigir no client — desabilitar o botão + aviso inline quando mensagem vazia — resolve a falha silenciosa sem alterar a regra de negócio do servidor (texto obrigatório continua sendo a regra correta)."
  blind_spots: "Não testei o comportamento após deploy real (só leitura de código + evidência de reprodução documentada no Symptoms); assumo que aplicar o mesmo padrão visual do aviso de telefone inválido é suficiente para o UAT considerar resolvido — não há teste automatizado cobrindo esse componente ainda."
tdd_checkpoint: null

## Symptoms
<!-- Written during gathering, then immutable -->

expected: "Se o admin tenta enviar uma mensagem de WhatsApp vazia (por falta de template configurado para aquele tipo e sem ter digitado nada), o sistema deveria impedir o envio ou pelo menos avisar claramente que a tentativa não foi registrada — nunca falhar silenciosamente."
actual: "O link 'Abrir WhatsApp' abre a aba do WhatsApp normalmente mesmo com a caixa de mensagem vazia. Em paralelo, a chamada fire-and-forget para registerWhatsAppContact() é rejeitada pela validação Zod (texto vazio) e retorna { advanced: false } sem exceção — nenhum toast de erro aparece (o único toast existente é de SUCESSO em caso de auto-avanço). O contact_attempts e sequenciaPosicao do lead NÃO são incrementados, e nenhuma linha é criada em `interacoes` (a timeline fica sem esse contato) — sem qualquer aviso ao admin."
errors: "Nenhum erro de console ou de rede — é uma falha de validação de servidor tratada como retorno normal (sem exceção), então o .catch() do onClick nunca dispara."
reproduction: "Abrir o diálogo 'Abrir WhatsApp' de qualquer lead, não digitar nada na caixa Mensagem (ou trocar de Tipo de mensagem para um tipo sem template padrão cadastrado, o que limpa a caixa), clicar 'Abrir WhatsApp'. A aba do WhatsApp abre (com texto vazio na URL), mas contact_attempts/sequenciaPosicao do lead no banco NÃO mudam e nenhuma interação é criada."
started: "Comportamento existe desde que registerWhatsAppContact ganhou a validação Zod obrigatória de texto (D-04 mencionado nos comentários do código, provavelmente Fase 9); só ficou evidente agora porque a tabela `templates` do banco real está vazia (achado separado, não é bug de código) — mas o gap de UX (falha silenciosa) é um bug real independente de haver templates ou não."

## Eliminated
<!-- APPEND only - prevents re-investigating after /clear -->

## Evidence
<!-- APPEND only - facts discovered during investigation -->

- timestamp: 2026-08-13T13:00:00Z
  checked: "src/actions/lead-actions.ts, função registerWhatsAppContact (linhas ~264-325)"
  found: "whatsappContactSchema.safeParse falha silenciosamente (return { advanced: false }) quando texto é vazio/só espaços — sem lançar exceção, sem log."
  implication: "O .then()/.catch() no cliente (whatsapp-preview-dialog.tsx) nunca detecta essa falha porque a Promise resolve normalmente com advanced:false, que já é o valor 'neutro' esperado em qualquer clique que não auto-avança etapa."

- timestamp: 2026-08-13T13:02:00Z
  checked: "SELECT * FROM templates no banco real (data/crm.db)"
  found: "Tabela templates vazia (0 linhas) — /templates mostra 'Nenhum template cadastrado ainda.'"
  implication: "pickTemplate() em whatsapp-preview-dialog.tsx sempre retorna undefined, então texto inicial é sempre string vazia para qualquer tipo — reproduz o bug em qualquer lead, com qualquer tipo, até o admin digitar manualmente algo na caixa."

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: "Gap de UX no client (src/components/whatsapp-preview-dialog.tsx): o link 'Abrir WhatsApp' era gateado só por `!!tel` (telefone válido), nunca considerava se a textarea de mensagem estava vazia. Com a tabela `templates` vazia (achado separado), `pickTemplate` sempre retorna undefined e a textarea inicia vazia para qualquer tipo. Ao clicar, a aba do WhatsApp abre com texto vazio e a chamada fire-and-forget para `registerWhatsAppContact` é rejeitada pela validação Zod do servidor (`texto: z.string().trim().min(1)`, D-04) — rejeição por design do servidor (safeParse falha, retorna {advanced:false} sem exceção), então nenhum toast de erro aparece e nenhuma linha é gravada em `interacoes`/`contactAttempts`."
fix: "Adicionado `mensagemVazia = texto.trim().length === 0` em whatsapp-preview-dialog.tsx; `waHref` agora só é computado quando há telefone válido E mensagem não-vazia (`lead && tel && !mensagemVazia`). Quando `waHref` é undefined (por telefone inválido OU mensagem vazia), o link ativo é substituído pelo Button disabled já existente. Adicionado aviso inline 'Mensagem vazia — escreva algo antes de abrir o WhatsApp.' no mesmo padrão visual do aviso de telefone inválido. Com isso o clique fica impossível com mensagem vazia — o admin nunca aciona `registerWhatsAppContact` com texto vazio, eliminando a falha silenciosa (a regra de servidor continua intacta, agora inalcançável nesse caminho)."
verification: "Self-verified (tsc/eslint/build limpos) + confirmado no app real rodando via automação de navegador: textarea esvaziada -> botão 'Abrir WhatsApp' muda para estado desabilitado + aviso inline 'Mensagem vazia — escreva algo antes de abrir o WhatsApp.' aparece. Clique no botão desabilitado não abriu nova aba nem alterou contact_attempts/sequenciaPosicao do lead no banco (permaneceram 0), confirmando que registerWhatsAppContact não foi chamado. Comportamento também depende do fix complementar já aplicado separadamente (achado 1: templates padrão cadastrados) — juntos, o caso comum (templates preenchidos) some, e o caso raro (admin apaga tudo) agora é bloqueado com aviso em vez de falhar em silêncio."
files_changed:
  - "src/components/whatsapp-preview-dialog.tsx"
