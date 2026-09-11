# Relatório de Eval — Diagnóstico de IA da Campanha

**Data:** 2026-09-11T14:52:38.876Z
**Escopo:** --gold (3 casos gold)
**Casos rodados:** 3

## Resumo por caso

| id | categoria | veredito esperado | veredito obtido | resultado | portões | fontes | buscas | tokens in/out | duração |
|----|-----------|--------------------|-------------------|-----------|---------|--------|--------|----------------|---------|
| costureira-sob-medida | gold | mudar_angulo | mudar_angulo | PASS | FAIL (2) | 16 | 7 | 29660/2456 | 152.0s |
| motoboy-clientes-particulares | gold | aprofundar | mudar_angulo | REGRESSAO | FAIL (1) | 15 | 2 | 28838/2508 | 84.8s |
| estetica-beleza | gold | abandonar | mudar_angulo | REGRESSAO | FAIL (1) | 50 | 6 | 150104/4316 | 64.9s |

## Detalhe por caso

### costureira-sob-medida (gold)

**Nota do dataset:** Gold nº1 — expectativa DURA, validada ao vivo pelo operador em 2026-09-04 (1º Briefing de Nicho). Espera-se que o diagnóstico reconheça concorrência relevante no ajuste genérico, mas identifique um recorte mais estreito ainda livre (ex.: ajuste expresso com prazo garantido para eventos) — 'mudar_angulo', não 'aprofundar' cego nem 'abandonar' por medo da concorrência.

**Veredito sugerido:** `mudar_angulo`

**Justificativa:** Os concorrentes diretos existem mas cada um cobre um raio geográfico limitado a partir de um endereço fixo, deixando lacunas dentro da própria zona sul. O gatilho mais forte (economia de tempo/trânsito) é validado pelo próprio discurso dos concorrentes, e o ticket com acréscimo domiciliar (~R$95-120) é viável para 3 clientes recorrentes em 90 dias se o operador recortar um sub-bairro específico não coberto pelos ateliês encontrados, em vez de competir de frente com quem já tem endereço fixo e raio definido.

**Falhas de portão estrutural:**
- FAIL cross-check: 10 URL(s) citada(s) no objeto não constam nas fontes reais
- FAIL buscas: 7 (teto 6)

**Aviso de cross-check (não bloqueia):** 10 URL(s) citada(s) no diagnóstico não constam nas fontes reais da busca.

**Notas do juiz (dimensões subjetivas):**

| dimensão | veredicto | nota | razão |
|----------|-----------|------|-------|
| especificidade_gatilhos | FAIL | 2/5 | Os gatilhos são majoritariamente inferidos do discurso de marketing do próprio concorrente (o que ele diz motivar o cliente), não de relatos reais de clientes com quem/quando/frequência. O gatilho de urgência é genérico e caberia em qualquer serviço sob demanda. |
| leitura_saturacao | PASS | 4/5 | Distingue corretamente 'há concorrentes' de 'mercado saturado', recorta o ângulo específico (domicílio, zona sul) e nota lacunas geográficas por raio de atuação, evitando tratar contagem como veredito automático. |
| separacao_dado_marketing | FAIL | 2/5 | As tags nos achados formais são majoritariamente corretas, mas o gatilho mais forte (economia de tempo/trânsito) é derivado diretamente da alegação de marketing do concorrente sobre a motivação do cliente, misturando copy de venda com dado observado e usando-a para sustentar o veredito. |
| logica_veredito | PASS | 4/5 | A justificativa combina saturação (raios geográficos limitados), força do gatilho principal e ticket versus meta de clientes recorrentes, permitindo reconstruir o raciocínio, ainda que apoiado em premissas frágeis sobre o gatilho. |
| qualidade_rascunho | PASS | 4/5 | A mensagem abre pelo gatilho mais forte (trânsito/tempo), usa linguagem coloquial plausível do prospect, oferece busca/devolução concreta e um próximo passo pequeno sem compromisso, evitando template genérico. |

**Fontes coletadas (16):** https://www.cronoshare.com.br/servicos/costureira/sao-paulo/sao-paulo/b/chacara-santo-antonio-zona-sul, https://elcosturas.com.br/costureira-a-domicilio-ajuste-de-roupas/, https://elcosturas.com.br/costureira-em-casa/, https://www.cronoshare.com.br/servicos/costureira/sao-paulo/sao-paulo, https://elcosturas.com.br/costureira-que-reforma-roupas-em-sao-paulo/, https://elcosturas.com.br/costureira-no-planalto-paulista/, https://www.lanadri.com.br/, https://acheioprofissional.com.br/costureira/sao-paulo, https://elcosturas.com.br/tabela-de-preco-conserto-de-roupas-2025/, https://elcosturas.com.br/tabela-de-preco-conserto-de-roupas-2026/, https://marlenemukai.com.br/tabela-de-precos-de-costura-e-reforma-de-roupas/, https://marlenemukai.com.br/tabelas-de-precos-de-mao-de-obra-de-confeccao-ajustes-e-concertos-2026/, https://travete.com.br/blog/tabela-precos-costura/, https://elcosturas.com.br/quanto-custa-pra-fazer-barra-de-calca-jeans-sp/, https://www.cronoshare.com.br/quanto-custa/costureira, https://jornaldacostureira.wordpress.com/2015/11/25/tabela-de-precos-consertos-x-confeccao/

**Buscas efetivas (7):** costureira ajustes reformas roupa retirada e devolução em domicílio São Paulo zona sul · preço ajuste bainha calça costureira São Paulo tabela · "costureira" reclamações demora atraso peça sumiu grupo facebook OR reclame aqui · acréscimo taxa atendimento domicílio costureira São Paulo valor · costureira zona sul São Paulo Instagram whatsapp buscar entregar roupa · costureira ajustes reforma roupa domicílio zona sul São Paulo · preço ajuste bainha calça costureira São Paulo tabela

### motoboy-clientes-particulares (gold)

**Nota do dataset:** Gold nº2 — expectativa DURA, validada ao vivo pelo operador em 2026-09-04 (2º Briefing de Nicho). Espera-se leitura de baixa saturação de concorrência direta (fora de app) e dor real e recorrente (dependência de app com taxa alta) o bastante para justificar 'aprofundar', não um veredito de cautela.

**Veredito sugerido:** `mudar_angulo`

**Justificativa:** Existem players estabelecidos (cooperativas, empresas com 10+ anos, portais com 50+ cadastros) cobrindo entrega avulsa e mensal genérica, então competir de frente nesse recorte largo é difícil. Mas a dor específica de clínicas com material sensível e comércios pagando 27% em taxas de app aparece documentada e pouco atendida por um prestador solo com relação pessoal e SLA simples. Recomendo estreitar o ângulo para clínicas/comércios de bairro específico com rota fixa, vendendo previsibilidade e protocolo de entrega, em vez de competir genericamente com empresas de motofrete.

**Falhas de portão estrutural:**
- FAIL cross-check: 8 URL(s) citada(s) no objeto não constam nas fontes reais

**Aviso de cross-check (não bloqueia):** 8 URL(s) citada(s) no diagnóstico não constam nas fontes reais da busca.

**Notas do juiz (dimensões subjetivas):**

| dimensão | veredicto | nota | razão |
|----------|-----------|------|-------|
| especificidade_gatilhos | PASS | 4/5 | Os gatilhos são concretos (taxa de 27% em apps, exames/amostras sensíveis, janelas rígidas de coleta) e ligados a fontes específicas, evitando dores genéricas. Ressalva: o gatilho de 'risco de extravio' é parcialmente inferido a partir de uma fonte que é o próprio marketing de um concorrente, não uma queixa documentada de cliente.' |
| leitura_saturacao | PASS | 3/5 | O texto reconhece a diferença entre concorrência ampla (motofrete terceirizado geral) e o ângulo estreito (motoboy solo com carteira fixa), mas ainda contabiliza 6 concorrentes diretos usando fontes de empresas maiores/cooperativas, misturando um pouco a definição larga com o recorte específico da oferta. |
| separacao_dado_marketing | PASS | 4/5 | As tags parecem corretas: preços e contagens são dado_quantificavel, e a alegação de '500 avaliações 5 estrelas' é corretamente marcada como alegacao_marketing e não é usada para sustentar saturação ou ticket. Único ponto fraco é a menção a 'empresas com 10+ anos' no veredito, que não aparece nos achados listados. |
| logica_veredito | PASS | 3/5 | O veredito 'mudar_angulo' pondera saturação, força dos gatilhos e ticket de forma reconstruível, mas insere um dado ('empresas com 10+ anos') que não está entre os achados apresentados, quebrando parcialmente a rastreabilidade do raciocínio. |
| qualidade_rascunho | PASS | 4/5 | A mensagem abre pelo gatilho mais forte (taxa de app), usa linguagem coloquial plausível de motoboy autônomo, oferece proposta concreta (contrato fixo, protocolo assinado) e um próximo passo pequeno (teste de 30 dias), evitando template genérico de prospecção. |

**Fontes coletadas (15):** https://saipos.com/sistema/marmitaria/quanto-custa-contratar-um-motoboy-para-delivery-de-marmita, https://mxlog.com.br/motoboy-fixo-vs-por-demanda-como-escolher/, https://entregasmotoboy.com.br/, https://caasexpresss.com/motoboy-para-hospitais-e-clinicas/, https://www.vuupt.com/post/contratar-motoboy/, https://controlenamao.com.br/blog/quanto-custa-um-motoboy-terceirizado-para-delivery/, https://mercadomineiro.com.br/pesquisa/motoboy-bikeboy-pesquisa-precos, https://motoboydeguarulhos.com.br/index.html, https://55content.com.br/machine-conecta/como-cobrar-pelas-entregas/, https://www.motoboy.br.com/, https://www.motoboyrj.net/, https://saipos.com/sistema/delivery/como-calcular-frete-delivery, https://motoboydeguarulhos.com.br/index.html, https://www.meufooddash.com/calculadora-entregadores, https://motoboy.app/

**Buscas efetivas (2):** motoboy entrega mensal fixa clínica preço mensalista · motoboy autônomo entregas avulsas preço tabela WhatsApp

### estetica-beleza (gold)

**Nota do dataset:** Gold nº3 — expectativa DURA, validada ao vivo pelo operador em 2026-09-04 (3º Briefing de Nicho). Espera-se leitura de saturação alta E oferta indiferenciada (serviço genérico de estética, sem ângulo próprio) o bastante para justificar 'abandonar', não 'mudar_angulo' otimista demais.

**Veredito sugerido:** `mudar_angulo`

**Justificativa:** Saturação moderada (8 concorrentes diretos vendendo o mesmo combo genérico) não justifica abandono, mas também não sustenta abordagem genérica: nenhum concorrente ataca a dor real observada — pacotes perdidos por cancelamento/fechamento de clínica e dificuldade de reagendar. Ticket ancorado (~R$400 por combo) x meta de 10 pacotes em 90 dias exige ~R$4.000 de faturamento, viável para 1 operador solo se o ângulo for 'entrega garantida, sem letra miúda', diferenciando-se da experiência ruim documentada nas reclamações. Recomendo mudar o ângulo de prospecção para essa promessa de confiabilidade, não desistir do nicho.

**Falhas de portão estrutural:**
- FAIL cross-check: 6 URL(s) citada(s) no objeto não constam nas fontes reais

**Aviso de cross-check (não bloqueia):** 6 URL(s) citada(s) no diagnóstico não constam nas fontes reais da busca.

**Notas do juiz (dimensões subjetivas):**

| dimensão | veredicto | nota | razão |
|----------|-----------|------|-------|
| especificidade_gatilhos | PASS | 4/5 | Gatilhos descrevem situações concretas (pacote pré-pago perdido, clínica que fecha, venda agressiva pós-pagamento) com fonte real no Reclame Aqui, evitando dor genérica tipo 'precisa de clientes'. Porém as fontes são de clínicas de estética variadas, não do nicho exato limpeza+massagem, o que é uma generalização não explicitada. |
| leitura_saturacao | PASS | 4/5 | Distingue oferta genérica (8 concorrentes vendendo o mesmo combo) de nicho estreito, e nota que nenhum ataca a dor específica de confiabilidade, abrindo espaço de recorte em vez de veredito automático de abandono. |
| separacao_dado_marketing | FAIL | 3/5 | O achado sobre reclamações de pacotes perdidos é classificado como 'dado_quantificavel', mas é observação qualitativa (padrão de queixas), não uma contagem/preço mensurado; a alegação de marketing do Instagram foi corretamente isolada e não usada no veredito, mas a tag incorreta enfraquece a separação. |
| logica_veredito | PASS | 5/5 | A justificativa cruza saturação moderada, ausência de concorrentes atacando a dor de confiabilidade e viabilidade de ticket x meta para operador solo, permitindo reconstruir o raciocínio passo a passo. |
| qualidade_rascunho | PASS | 4/5 | Abre pelo gatilho mais forte (pacotes perdidos/remarcação), usa linguagem coloquial do prospect, oferece solução concreta (datas fixas, sem letra miúda) e passo pequeno (sessão avaliação); só perde nota por deixar 'R$X' como placeholder não resolvido. |

**Fontes coletadas (50):** https://buk.pt/paola-loiola-agenda, https://www.instagram.com/permitaestetica/, https://www.instagram.com/clinicarenascer_rs/, https://pt.pinterest.com/ideas/limpeza-de-pele-post-instagram/916609987172/, https://www.magote.com/sao-paulo/moema/limpeza-de-pele-e-massagem-relaxante-em-moema, https://www.tatys.com.br/novidades/faca-limpeza-de-pele-ganhe-massagem-relaxante/109/, https://magote.com/sao-paulo/tatuape/massagem-relaxante-50-minutos-e-limpeza-de-pele-completa, https://www.santespa.com.br/pacote-de-massagem-estetica-dupla-perfeita, https://elevaesthetic.com.br/product/limpeza-de-pele-e-massagem-relaxante/, https://pt.ebay.com/b/Unbranded-Oily-Skin-Cleansers-Toners/177765/bn_25187398, https://catracalivre.com.br/saude-bem-estar/quanto-custa-uma-limpeza-de-pele-profunda-em-2026/, https://portalleodias.com/diversos/2026/03/29/quanto-custa-fazer-limpeza-de-pele-profunda-em-2026/, https://renatadallier.com.br/2025/07/02/limpeza-de-pele-preco-2025-quanto-custa-cada-tipo-de-procedimento/, https://catracalivre.com.br/saude-bem-estar/quanto-custa-cuidar-da-pele-com-limpeza-profissional-em-2026/, https://talitavasconcelos.com/2025/06/17/limpeza-de-pele-preco-2025-valores-atualizados-e-guia-de-investimento/, https://www.reclameaqui.com.br/estetica-onodera/servico-nao-prestado-cancelamento-do-pacote_RF0fmmVYLYzPw24W/, https://www.reclameaqui.com.br/pro-estetica-oficial/atendimento-decepcionante-pos-venda-e-falta-de-resposta-sobre-cancelamento_92DajJLwPtMD3gWs/, https://www.reclameaqui.com.br/rccortez/atendimento-decepcionante-pos-venda-e-falta-de-resposta-sobre-cancelamento_92DajJLwPtMD3gWs/, https://www.reclameaqui.com.br/empresa/espaco-estetica/lista-reclamacoes/, https://www.reclameaqui.com.br/empresa/pro-corpo-estetica-avancada/lista-reclamacoes/?status=ANSWERED, https://www.reclameaqui.com.br/empresa/clinica-de-estetica/lista-reclamacoes/, https://www.reclameaqui.com.br/germain-paris-estetica/desrespeito-com-o-consumidor_yykmDAGa9d9fZ5AC/, https://www.reclameaqui.com.br/rio-arte-estetica/insatisfacao-com-pacote-de-procedimentos-esteticos-divergencia-na-quantidade-de-sessoes-e-problemas-de-agendamento_XIKkA_Rj_YRMooZ2/, https://www.doctoralia.com.br/servicos-de-tratamento/limpeza-de-pele/sao-paulo, https://app.prospectagram.com.br/m/estetica, https://www.facebook.com/bairrovilamatilde/posts/promo%C3%A7%C3%A3o-de-limpeza-de-pele-profunda-na-lopescentrodeesteticae-de-r-12000-por-r-/3064184007228645/?locale=ms_MY, https://magote.com/tratamento/limpeza-de-pele, https://www.clinicahumanita.com.br/lp/limpeza-de-pele/, https://maisbonitapormenos.com.br/bairros/Santana, https://clinicalegerportoalegre.com.br/limpeza-de-pele/, https://telepesquisa.com/rn/empresas/a/limpeza-de-pele/natal/ponta-negra, https://www.magote.com/sao-paulo/saude/limpeza-de-pele-profunda-e-peeling-na-saude, https://en.wikipedia.org/wiki/Campo_Limpo_Paulista, https://negociosdebeleza.beautyfair.com.br/como-colocar-seu-salao-de-beleza-no-google-maps/, https://support.google.com/maps/thread/238442384/nome-de-estabelecimentos?hl=pt, https://app.prospectagram.com.br/m/saloes-de-beleza?page=2, https://prospectagram.com.br/, https://app.prospectagram.com.br/i/restaurantes?page=24, https://tecnoblog.net/259198/google-maps-horario-salao-beleza, https://support.google.com/maps/answer/4610185?hl=pt-BR&co=GENIE.Platform%3DAndroid, https://mapsearchengine-production-34ec.up.railway.app/, https://brasil.googleblog.com/2022/02/como-funcionam-as-avaliacoes-no-google.html, https://mapsplatform.google.com/solutions/retail/, https://www.lenovo.com/us/en/glossary/placeholder-text/, https://en.wikipedia.org/wiki/Placeholder, https://mockflow.com/glossary/Placeholder, https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/::placeholder, https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/placeholder, https://www.nngroup.com/articles/form-design-placeholders/, https://placehold.net/

**Buscas efetivas (6):** pacote limpeza de pele massagem relaxante preço Instagram · clínica estética limpeza de pele preço tabela 2025 · reclame aqui clínica estética cancelamento pacote sessões dor · "limpeza de pele" bairro clínicas Google Maps quantas concorrência saturada · app.prospectagram estética 115 estabelecimentos Google Maps quantidade · placeholder

## Discriminação nos 3 gold

| id | veredito esperado | veredito obtido |
|----|--------------------|-------------------|
| costureira-sob-medida | mudar_angulo | mudar_angulo |
| motoboy-clientes-particulares | aprofundar | mudar_angulo |
| estetica-beleza | abandonar | mudar_angulo |

**NÃO DISCRIMINADOS — FALHA CRÍTICA da dimensão 7:** dois ou mais vereditos vieram iguais (ou algum caso gold não gerou resultado). Isso é falha crítica independente do resto do relatório — a rubrica anti-genérico em `src/lib/ai/diagnostico-prompt.ts` precisa ser reforçada, com re-execução e comparação dos dois relatórios.

## Custo total estimado

Estimativa (Sonnet 5 US$2/1M input + US$10/1M output + US$10/1.000 buscas web, geração + juiz): **US$0.76** para 3 caso(s).

_Estimativa aproximada a partir de `usage` do AI SDK — não é a fatura oficial da Anthropic._

