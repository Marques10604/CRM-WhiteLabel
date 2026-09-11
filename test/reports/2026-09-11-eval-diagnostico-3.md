# Relatório de Eval — Diagnóstico de IA da Campanha

**Data:** 2026-09-11T15:28:12.547Z
**Escopo:** --gold (3 casos gold)
**Casos rodados:** 3

## Resumo por caso

| id | categoria | veredito esperado | veredito obtido | resultado | portões | fontes | buscas | tokens in/out | duração |
|----|-----------|--------------------|-------------------|-----------|---------|--------|--------|----------------|---------|
| costureira-sob-medida | gold | mudar_angulo | abandonar | REGRESSAO | FAIL (1) | 39 | 5 | 166151/7213 | 150.7s |
| motoboy-clientes-particulares | gold | aprofundar | aprofundar | PASS | FAIL (1) | 16 | 2 | 34825/5073 | 58.8s |
| estetica-beleza | gold | abandonar | mudar_angulo | REGRESSAO | FAIL (1) | 16 | 2 | 32874/5549 | 64.7s |

## Detalhe por caso

### costureira-sob-medida (gold)

**Nota do dataset:** Gold nº1 — expectativa DURA, validada ao vivo pelo operador em 2026-09-04 (1º Briefing de Nicho). Espera-se que o diagnóstico reconheça concorrência relevante no ajuste genérico, mas identifique um recorte mais estreito ainda livre (ex.: ajuste expresso com prazo garantido para eventos) — 'mudar_angulo', não 'aprofundar' cego nem 'abandonar' por medo da concorrência.

**Veredito sugerido:** `abandonar`

**Justificativa:** O incumbente Ellegancy/Elcosturas já cobre o ângulo exato descrito na oferta (domicílio + zona sul + ajustes/reformas) e, ao tentar recorte mais estreito (urgência/mesmo dia), o mesmo concorrente também já oferece 'conserto na hora' com taxa expressa — a saturação persiste mesmo no recorte mais fino. O gatilho mais forte (atraso de prazo) tem evidencia padrao_confirmado, mas já é endereçado publicamente pelo incumbente como diferencial de marketing, esvaziando a brecha. Com ticket médio de ~R$170 por intervenção e concorrência de múltiplas costureiras autônomas na própria zona sul via Cronoshare, fechar 3 clientes recorrentes em 90 dias de prospecção manual não compensa o esforço frente a um mercado já mapeado e disputado.

**Achados por categoria:** dado_quantificavel=3, relato_qualitativo=1, alegacao_marketing=1
**Gatilhos por evidência:** padrao_confirmado=1, relato_isolado=1 — gatilho mais_forte tem evidencia `padrao_confirmado`

**Falhas de portão estrutural:**
- FAIL cross-check: 9 URL(s) citada(s) no objeto não constam nas fontes reais

**Aviso de cross-check (não bloqueia):** 9 URL(s) citada(s) no diagnóstico não constam nas fontes reais da busca.

**Notas do juiz (dimensões subjetivas):**

| dimensão | veredicto | nota | razão |
|----------|-----------|------|-------|
| especificidade_gatilhos | FAIL | 2/5 | O gatilho 2 (evitar trânsito/tempo perdido) é genérico e serviria para qualquer serviço em domicílio, não é uma dor específica de costura. O gatilho 1 tem fonte concreta, mas é rotulado 'padrao_confirmado' com apenas uma única reclamação como evidência, uma inferência maior do que a fonte sustenta. |
| leitura_saturacao | PASS | 4/5 | Distingue corretamente o ângulo específico (domicílio + zona sul + urgência) do setor geral de costureiras, contando 6 concorrentes diretos nesse recorte estreito em vez de todo o mercado de costura. |
| separacao_dado_marketing | PASS | 4/5 | As tags majoritariamente correspondem ao conteúdo: preços de tabela e reclamação são corretamente dado_quantificavel/relato_qualitativo, e a alegação 'costureiras habilidosas, treinadas' é corretamente marcada alegacao_marketing e não é citada na justificativa do veredito. |
| logica_veredito | PASS | 3/5 | O veredito combina saturação, força do gatilho e ticket vs esforço de forma rastreável, mas há uma conflação frágil: usa a falha de prazo de um concorrente diferente (Ophicina) para sustentar que o incumbente (Ellegancy) 'esvazia' essa dor via marketing, sem evidência de que este realmente entrega no prazo. |
| qualidade_rascunho | PASS | 4/5 | A mensagem abre pelo incômodo de deslocamento, usa linguagem coloquial plausível ('sem enrolação de prazo'), oferece um teste concreto e barato (peça simples com condição especial) e termina com um próximo passo pequeno e claro ('Topa?'). |

**Fontes coletadas (39):** https://www.cronoshare.com.br/servicos/costureira/sao-paulo/sao-paulo/b/chacara-santo-antonio-zona-sul, https://elcosturas.com.br/costureira-a-domicilio-ajuste-de-roupas/, https://elcosturas.com.br/costureira-em-casa/, https://www.cronoshare.com.br/servicos/costureira/sao-paulo/sao-paulo, https://elcosturas.com.br/costureira-que-reforma-roupas-em-sao-paulo/, https://elcosturas.com.br/costureira-no-planalto-paulista/, https://www.lanadri.com.br/, https://acheioprofissional.com.br/costureira/sao-paulo, https://marlenemukai.com.br/tabela-de-precos-de-costura-e-reforma-de-roupas/, https://elcosturas.com.br/tabela-de-preco-conserto-de-roupas-2025/, https://elcosturas.com.br/tabela-de-preco-conserto-de-roupas-2026/, https://travete.com.br/blog/tabela-precos-costura/, https://tudocortecostura.com.br/tabela-de-preco-costura/, https://jornaldacostureira.wordpress.com/2015/11/25/tabela-de-precos-consertos-x-confeccao/comment-page-2/, https://pt.scribd.com/document/581194536/TABELA-DE-PRECOS-DE-SERVICOS-DE-AJUSTES-DE-ROUPAS, https://www.conjur.com.br/2014-jan-18/cliente-indenizada-costureira-atrasou-entrega-vestido/, https://www.reclameaqui.com.br/madeiramadeira/atraso-na-entrega-e-montagem-de-guarda-roupas-descaso-com-o-cliente_lpcr9uABTve0yfBL/, https://www.reclameaqui.com.br/cecilia-festas/atraso-na-entrega_4hL5ocyFlktNF3jK/, https://www.reclameaqui.com.br/madeiramadeira/atraso-na-entrega-e-falta-de-resolucao-na-compra-de-guarda-roupa_NRnFsZmTefKxgBxk/, https://www.reclameaqui.com.br/madeiramadeira/atraso-na-entrega-e-reagendamento-da-montagem-de-guarda-roupa_lXBBpqd_v1BvFB0-/, https://www.reclameaqui.com.br/correios/atraso-na-entrega-de-mercadoria-para-loja-de-roupa_RyIUdfRZ8IS5rrhY/, https://www.reclameaqui.com.br/sem-costura/atraso-na-entrega-suspeita-de_ukrpJQ-slvdhMtNB/, https://www.reclameaqui.com.br/empresa/sem-costura/lista-reclamacoes/, https://www.reclameaqui.com.br/cecilla/vestido-de-festa-com-defeito-demora-na-entrega-ma-qualidade-dificuldade-no-estorno-e-mau-atendimento_Da7r90VAj0N5hVjO/, https://www.reclameaqui.com.br/ophicina-de-costura/epsodio-ocorrido-na-filial-do-shopping-morumbi_9723846/, https://elcosturas.com.br/conserto-de-roupas-na-hora/, https://en.wikipedia.org/wiki/Veste_S.A._Estilo, https://en.wikipedia.org/wiki/Roupa_Nova, https://ellegancycosturas.wordpress.com/2020/12/16/costureira-pequenos-reparos-sp/, https://en.wikipedia.org/wiki/Poupatempo, https://trabalhenacultura.substack.com/p/vaga-para-pessoa-costureirao-senior, https://www.cronoshare.com.br/servicos/costureira/sao-paulo/sao-paulo/b/jardim-brasil-zona-sul, https://www.cronoshare.com.br/servicos/costureira/sao-paulo/sao-paulo/b/colonia-zona-sul, https://www.cronoshare.com.br/servicos/costureira/sao-paulo/sao-caetano-do-sul, https://www.cronoshare.com.br/servicos/costureira/sao-paulo/sao-paulo/b/chacara-santo-antonio-zona-sul, https://www.cronoshare.com.br/quanto-custa/costureira, https://www.cronoshare.com.br/servicos/costureira/sao-paulo/sao-paulo/b/jardim-das-camelias-zona-sul, https://www.cronoshare.com.br/servicos/costureira/sao-paulo/sao-caetano-do-sul/b/santa-paula, https://www.cronoshare.com.br/servicos/costureira/sao-paulo/sao-paulo/b/centro

**Buscas efetivas (5):** costureira ajustes reforma roupa domicílio zona sul São Paulo · preço ajuste de bainha costureira São Paulo tabela · reclamação costureira atraso entrega roupa reclame aqui · "ajuste de roupa" domicílio "mesmo dia" OR "24h" São Paulo costureira · "Cronoshare" costureira zona sul São Paulo quantos profissionais preço médio

### motoboy-clientes-particulares (gold)

**Nota do dataset:** Gold nº2 — expectativa DURA, validada ao vivo pelo operador em 2026-09-04 (2º Briefing de Nicho). Espera-se leitura de baixa saturação de concorrência direta (fora de app) e dor real e recorrente (dependência de app com taxa alta) o bastante para justificar 'aprofundar', não um veredito de cautela.

**Veredito sugerido:** `aprofundar`

**Justificativa:** O gatilho de atraso/falta de compromisso de motoboys de app aparece com padrao_confirmado (fontes independentes descrevendo o mesmo problema), a concorrência direta no ângulo exato (avulso+mensal fixo para pequeno comércio fora de apps) é moderada e fragmentada por região, não bloqueando um novo entrante local. Com ticket estimado de ~R$1.200/mês por contrato, 5 contratos fechados em 90 dias geram ~R$6.000/mês recorrente, meta plausível para prospecção manual ativa via Instagram/WhatsApp nesse prazo. Nenhuma condição de abandono se confirma e não há um sub-recorte novo e livre que justifique mudar de ângulo.

**Achados por categoria:** dado_quantificavel=3, relato_qualitativo=1, alegacao_marketing=1
**Gatilhos por evidência:** padrao_confirmado=1, relato_isolado=1 — gatilho mais_forte tem evidencia `padrao_confirmado`

**Falhas de portão estrutural:**
- FAIL cross-check: 11 URL(s) citada(s) no objeto não constam nas fontes reais

**Aviso de cross-check (não bloqueia):** 11 URL(s) citada(s) no diagnóstico não constam nas fontes reais da busca.

**Notas do juiz: INDISPONÍVEIS** — a chamada do juiz falhou (`No object generated: response did not match schema.`), mas o veredito e os portões estruturais acima vêm da geração real, que teve sucesso.

**Fontes coletadas (16):** https://foodydelivery.com/blog/contrato-com-motoboy-mei-guia-completo/, https://zintlexpress.com.br/motoboy-para-empresas-em-sp/servico-mensal-para-empresas-vale-a-pena-planos-e-beneficios-com-a-zintlexpress/, https://controlenamao.com.br/blog/quanto-custa-um-motoboy-terceirizado-para-delivery/, https://politiacademy.com.br/blog/marketing-e-vendas/contratar-motoboy-para-entrega-delivery/, https://goomer.com.br/blog/como-contratar-um-motoboy, https://www.paulistamotoboy.com.br/valores-de-servicos-de-motoboy.php, https://saipos.com/sistema/marmitaria/quanto-custa-contratar-um-motoboy-para-delivery-de-marmita, https://www.meufooddash.com/calculadora-entregadores, https://motoboy-no-pacaembu.webnode.page/motoboy-avulso/, https://www.reclameaqui.com.br/marcacar-loja-online/atraso-na-entrega-via-motoboy-causa-prejuizos-ao-cliente_zRoXOBRrbRQQgmQI/, https://www.reclameaqui.com.br/ifood/alertas-e-cancelamentos-injustos-por-atraso-motoboy-questiona-responsabilidade-e-solicita-revisao__8lyRFVeWcQ1rn7u/, https://www.workms.com.br/post/atrasos-nas-entregas-como-a-falta-de-cuidados-com-a-sa%C3%BAde-e-seguran%C3%A7a-dos-motoboys-pode-prejudicar, https://borapedirai.com.br/blog/controle-de-motoboy-no-delivery, https://foodydelivery.com/blog/os-principais-problemas-com-motoboys-nos-estabelecimentos-deliveries-e-como-resolve-los/, https://clickpetroleoegas.com.br/apos-treze-minutos-de-espera-na-portaria-cliente-enrola-13-minutos-para-descer-e-buscar-o-proprio-pedido-motoboy-vigia-o-cancelamento-automatico-conclui-a-entrega-e-avisa-o-consumidor-btl96/, https://www.threads.com/@efoliveira/post/DSoCjcEjJbF/motoboys-n%C3%A3o-gostam-quando-os-clientes-demoram-para-receber-os-pedidos-mas-n%C3%A3o-t?hl=en

**Buscas efetivas (2):** motoboy entrega avulsa preço tabela contrato mensal pequenos comércios · reclamação motoboy aplicativo atraso comerciante clínica entrega

### estetica-beleza (gold)

**Nota do dataset:** Gold nº3 — expectativa DURA, validada ao vivo pelo operador em 2026-09-04 (3º Briefing de Nicho). Espera-se leitura de saturação alta E oferta indiferenciada (serviço genérico de estética, sem ângulo próprio) o bastante para justificar 'abandonar', não 'mudar_angulo' otimista demais.

**Veredito sugerido:** `mudar_angulo`

**Justificativa:** O pacote 'limpeza de pele + massagem relaxante' já é vendido como produto padronizado por pelo menos 6 provedores identificados, tornando o ângulo original comoditizado e pouco diferenciável — condição de saturação na oferta como descrita. Porém há um gatilho com evidencia padrao_confirmado (atraso no horário e mau atendimento, presente em reclamações independentes contra clínicas distintas) que nenhum concorrente analisado ataca de frente, pois todos vendem experiência sensorial, não pontualidade. O ângulo recomendado é: reposicionar a oferta em torno de 'atendimento no horário marcado, sem espera, agendamento simples por WhatsApp e sem multa de cancelamento', que ataca diretamente a dor confirmada e não está ocupado pelos concorrentes encontrados. Com ticket médio de ~R$350, dez pacotes fechados em 90 dias somam R$3.500, esforço plausível para prospecção manual se a mensagem já nascer ancorada nessa dor específica.

**Achados por categoria:** dado_quantificavel=3, relato_qualitativo=1, alegacao_marketing=1
**Gatilhos por evidência:** padrao_confirmado=1, relato_isolado=2 — gatilho mais_forte tem evidencia `padrao_confirmado`

**Falhas de portão estrutural:**
- FAIL cross-check: 6 URL(s) citada(s) no objeto não constam nas fontes reais

**Aviso de cross-check (não bloqueia):** 6 URL(s) citada(s) no diagnóstico não constam nas fontes reais da busca.

**Notas do juiz (dimensões subjetivas):**

| dimensão | veredicto | nota | razão |
|----------|-----------|------|-------|
| especificidade_gatilhos | PASS | 3/5 | O gatilho principal (atraso sem aviso, evidência 'padrao_confirmado') é concreto e tem fonte identificável. Porém os outros dois têm evidência 'relato_isolado' e um deles aponta para uma URL genérica de 'lista-reclamacoes' sem apontar a reclamação específica, enfraquecendo a rastreabilidade à fonte real. |
| leitura_saturacao | PASS | 4/5 | A contagem de 6 concorrentes é feita no ângulo específico do combo exato (nome do pacote), não no setor inteiro de estética, e a leitura distingue comoditização do produto de inviabilidade de entrada, sustentando corretamente a decisão de mudar de ângulo em vez de descartar o nicho. |
| separacao_dado_marketing | PASS | 3/5 | Preços e tabela pública estão corretamente marcados como dado_quantificavel e usados só no ticket médio; a alegação do Buddha Spa está corretamente isolada como alegacao_marketing e não entra no cálculo. Porém classificar a simples listagem comercial do Magote como 'dado_quantificavel' é impreciso, já que não é uma medida numérica e sim evidência de existência de oferta. |
| logica_veredito | PASS | 5/5 | A justificativa cruza saturação do ângulo original, força do gatilho não atacado pelos concorrentes e ticket médio para propor um reposicionamento concreto, permitindo que um humano refaça o raciocínio até a decisão 'mudar_angulo'. |
| qualidade_rascunho | PASS | 5/5 | A mensagem abre pelo gatilho mais forte (atraso/espera), usa linguagem coloquial plausível do prospect, oferece sessão avulsa sem pacote como prova concreta e propõe um próximo passo pequeno e claro (chamar e ver horários). |

**Fontes coletadas (16):** https://buk.pt/paola-loiola-agenda, https://buddhaspa.com.br/produto/limpeza-de-pele/, https://www.tatys.com.br/novidades/faca-limpeza-de-pele-ganhe-massagem-relaxante/109/, https://famesp.com.br/wp-content/uploads/2023/06/TABELA-ESTETICA-ESTAGIO-FAMESP-V8.pdf, https://www.santespa.com.br/pacote-de-massagem-estetica-dupla-perfeita, https://www.magote.com/sao-paulo/moema/limpeza-de-pele-e-massagem-relaxante-em-moema, https://patriciaelias.com.br/blog/limpeza-de-pele-quanto-custa/, https://www.esteticamil.com/re-e-promocoes-massagememcabofrio, https://sauderelaxamento.ueniweb.com/services/estetica/pacote-massagem-relaxante-25918398, https://elevaesthetic.com.br/product/limpeza-de-pele-e-massagem-relaxante/, https://www.reclameaqui.com.br/estetica-fit/clinica-com-pessimo-atendimento_oHx4Y2it16BcP0Gi/, https://www.reclameaqui.com.br/rccortez/atendimento-decepcionante-pos-venda-e-falta-de-resposta-sobre-cancelamento_92DajJLwPtMD3gWs/, https://www.reclameaqui.com.br/pro-estetica-oficial/atendimento-decepcionante-pos-venda-e-falta-de-resposta-sobre-cancelamento_92DajJLwPtMD3gWs/, https://www.reclameaqui.com.br/empresa/spa-beleza-e-estetica/lista-reclamacoes/, https://www.reclameaqui.com.br/dr-consulta/atraso-e-cancelamento-de-consulta-e-problemas-com-atestado_g5FPYbAVwlHqWq06/, https://www.reclameaqui.com.br/pro-corpo-estetica-avancada/nao-recomendaria-essa-clinica-a-nenhuma-amiga-e-nem-pra-inimiga_e58U1AW8ACLwdIf-/

**Buscas efetivas (2):** pacote limpeza de pele massagem relaxante preço estética · clínica estética reclame aqui atraso agendamento cancelamento

## Discriminação nos 3 gold

| id | veredito esperado | veredito obtido |
|----|--------------------|-------------------|
| costureira-sob-medida | mudar_angulo | abandonar |
| motoboy-clientes-particulares | aprofundar | aprofundar |
| estetica-beleza | abandonar | mudar_angulo |

**DISCRIMINADOS:** os 3 vereditos vieram diferentes entre si — o teste-mestre da dimensão 7 passou (o mesmo diagnóstico não serviria para dois nichos diferentes).

## Custo total estimado

Estimativa (Sonnet 5 US$2/1M input + US$10/1M output + US$10/1.000 buscas web, geração + juiz): **US$0.83** para 3 caso(s).

_Estimativa aproximada a partir de `usage` do AI SDK — não é a fatura oficial da Anthropic._

