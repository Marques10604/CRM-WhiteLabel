# Relatório de Eval — Diagnóstico de IA da Campanha

**Data:** 2026-09-11T17:12:53.977Z
**Escopo:** --gold (3 casos gold)
**Casos rodados:** 3

## Resumo por caso

| id | categoria | veredito esperado | veredito obtido | resultado | portões | fontes | buscas | tokens in/out | duração |
|----|-----------|--------------------|-------------------|-----------|---------|--------|--------|----------------|---------|
| costureira-sob-medida | gold | mudar_angulo | mudar_angulo | PASS | FAIL (1) | 27 | 4 | 70055/5722 | 135.3s |
| motoboy-clientes-particulares | gold | aprofundar | abandonar | REGRESSAO | FAIL (1) | 40 | 5 | 130771/5030 | 131.0s |
| estetica-beleza | gold | abandonar | ERRO | REGRESSAO | — | — | — | — | 42.0s |

## Detalhe por caso

### costureira-sob-medida (gold)

**Nota do dataset:** Gold nº1 — expectativa DURA, validada ao vivo pelo operador em 2026-09-04 (1º Briefing de Nicho). Espera-se que o diagnóstico reconheça concorrência relevante no ajuste genérico, mas identifique um recorte mais estreito ainda livre (ex.: ajuste expresso com prazo garantido para eventos) — 'mudar_angulo', não 'aprofundar' cego nem 'abandonar' por medo da concorrência.

**Veredito sugerido:** `mudar_angulo`

**Justificativa:** O ângulo original (zona sul genérica) já é coberto por um incumbente estabelecido desde 2008 com duas unidades e tabela pública na mesma região, e por outro ateliê e freelancers via marketplace — mudar_angulo se justifica só se houver recorte livre. Ele existe: o próprio incumbente declara raio de 15km, deixando bairros do extremo zona sul (Grajaú, Cidade Ademar, Capela do Socorro) fora de alcance. Combinado ao gatilho de dor com evidencia padrao_confirmado (atraso na entrega, visto em múltiplas reclamações de negócios distintos), o ângulo recomendado é: atender com garantia de prazo os bairros do extremo zona sul não cobertos pelo ateliê incumbente, usando o combate ao atraso como proposta central.

**Achados por categoria:** dado_quantificavel=2, relato_qualitativo=2, alegacao_marketing=1
**Gatilhos por evidência:** padrao_confirmado=2, relato_isolado=0 — gatilho mais_forte tem evidencia `padrao_confirmado`

**Falhas de portão estrutural:**
- FAIL cross-check: 9 URL(s) citada(s) no objeto não constam nas fontes reais

**Aviso de cross-check (não bloqueia):** 9 URL(s) citada(s) no diagnóstico não constam nas fontes reais da busca.

**URLs citadas fora das fontes reais (campo → URL citada):**
- `achados[0].fonte_url` → https://elcosturas.com.br/tabela-de-preco-conserto-de-roupas-2026/-
- `achados[1].fonte_url` → https://elcosturas.com.br/costureira-a-domicilio-ajuste-de-roupas/-
- `achados[2].fonte_url` → https://www.reclameaqui.com.br/vestire-rigor-e-social/ajustes-nao-feitos-demora-na-entrega_35776744/-
- `achados[3].fonte_url` → https://www.reclameaqui.com.br/conserte-conserto-de-roupas-especializado/nao-fizeram-o-que-pedi_14734051/-
- `achados[4].fonte_url` → https://costureiraemsp.wordpress.com/2020/08/15/onde-fazer-consertos-de-roupas-em-sao-paulo/-
- `ticket_medio.fonte_url` → https://elcosturas.com.br/tabela-de-preco-conserto-de-roupas-2026/-
- `gatilhos_dor[0].observavel_em` → https://www.reclameaqui.com.br/vestire-rigor-e-social/ajustes-nao-feitos-demora-na-entrega_35776744/-
- `gatilhos_dor[1].observavel_em` → https://www.reclameaqui.com.br/conserte-conserto-de-roupas-especializado/nao-fizeram-o-que-pedi_14734051/-
- `indice_saturacao.fontes[0]` → https://elcosturas.com.br/costureira-a-domicilio-ajuste-de-roupas/-

**Notas do juiz (dimensões subjetivas):**

| dimensão | veredicto | nota | razão |
|----------|-----------|------|-------|
| especificidade_gatilhos | PASS | 5/5 | Ambos os gatilhos descrevem situações concretas (peça não pronta na data, ajuste feito diferente do combinado sem aviso) e estão ancorados em reclamações reais e distintas, não em dores genéricas de qualquer serviço. |
| leitura_saturacao | PASS | 4/5 | Distingue concorrência no ângulo exato (retirada/devolução domicílio) do setor geral, e identifica que o incumbente declara raio de 15km, abrindo espaço real no extremo zona sul; porém o número '4 concorrentes diretos' mistura players nomeados com 'múltiplas' autônomas vagas do Cronoshare, gerando leve imprecisão na contagem. |
| separacao_dado_marketing | PASS | 4/5 | Preços e raio de atendimento corretamente tratados como dado_quantificavel; a alegação de marketing do concorrente sobre nunca atrasar foi isolada e não influenciou saturação, ticket ou veredito. A categoria extra 'relato_qualitativo' para reclamações não estava prevista no esquema binário, mas foi usada com coerência. |
| logica_veredito | PASS | 5/5 | A justificativa encadeia saturação regional do incumbente, o gap geográfico de cobertura (15km) e o gatilho de dor mais forte (atraso confirmado em múltiplas fontes) para chegar de forma rastreável à recomendação de mudar o ângulo geográfico. |
| qualidade_rascunho | PASS | 5/5 | Abre citando o bairro específico e a dor de atraso sem aviso, usa linguagem coloquial condizente com o prospect, oferece serviço concreto (busca/ajusta/devolve) e pede um próximo passo pequeno (foto da peça), não é template genérico. |

**Fontes coletadas (27):** https://www.cronoshare.com.br/servicos/costureira/sao-paulo/sao-paulo/b/chacara-santo-antonio-zona-sul, https://elcosturas.com.br/costureira-a-domicilio-ajuste-de-roupas/, https://elcosturas.com.br/costureira-em-casa/, https://www.cronoshare.com.br/servicos/costureira/sao-paulo/sao-paulo/b/centro, https://www.cronoshare.com.br/servicos/costureira/sao-paulo/sao-paulo, https://elcosturas.com.br/consertos-e-reformas-de-roupas/, https://www.lanadri.com.br/, https://www.facebook.com/www.elcosturas.com.br/posts/tabela-de-pre%C3%A7o-de-conserto-de-roupas-2025-prezados-clientespreparamos-com-carin/990187176476262/, https://marlenemukai.com.br/tabela-de-precos-de-costura-e-reforma-de-roupas/, https://marlenemukai.com.br/tabelas-de-precos-de-mao-de-obra-de-confeccao-ajustes-e-concertos-2026/, https://elcosturas.com.br/tabela-de-preco-conserto-de-roupas-2026/, https://elcosturas.com.br/tabela-de-preco-conserto-de-roupas-2025/, https://elcosturas.com.br/costureira-sao-paulo-ajustes-consertos/, https://casadeviver.com.br/tabela-de-preco-conserto-de-roupa/, https://www.cronoshare.com.br/quanto-custa/costureira, https://www.reclameaqui.com.br/blessed-atelie/vestido-de-festa_13047107/, https://www.conjur.com.br/2014-jan-18/cliente-indenizada-costureira-atrasou-entrega-vestido/, https://www.reclameaqui.com.br/vestire-rigor-e-social/ajustes-nao-feitos-demora-na-entrega_35776744/, https://www.reclameaqui.com.br/armarinho-espirito-santo-aracaju-se/roupa-estragada-nao-obedece-a-vontade-do-cliente_n-sH6-a-T0GVq7xP/, https://www.reclameaqui.com.br/conserte-conserto-de-roupas-especializado/nao-fizeram-o-que-pedi_14734051/, https://www.reclameaqui.com.br/ophicina-de-costura/epsodio-ocorrido-na-filial-do-shopping-morumbi_9723846/, https://elcosturas.com.br/a-costureira-estragou-a-minha-roupa/, https://www.cronoshare.com.br/servicos/costureira/sao-paulo/sao-paulo, https://elcosturas.com.br/costureira-em-casa/, https://elcosturas.com.br/costureira-a-domicilio-ajuste-de-roupas/, https://www.getninjas.com.br/moda-e-beleza/corte-e-costura, https://costureiraemsp.wordpress.com/2020/08/15/onde-fazer-consertos-de-roupas-em-sao-paulo/

**Buscas efetivas (4):** costureira ajustes roupa retirada domicílio zona sul São Paulo · ajuste de roupa preço tabela costureira São Paulo · reclame aqui costureira atraso ajuste roupa · "costureira" domicílio reclamação atraso entrega roupa São Paulo

### motoboy-clientes-particulares (gold)

**Nota do dataset:** Gold nº2 — expectativa DURA, validada ao vivo pelo operador em 2026-09-04 (2º Briefing de Nicho). Espera-se leitura de baixa saturação de concorrência direta (fora de app) e dor real e recorrente (dependência de app com taxa alta) o bastante para justificar 'aprofundar', não um veredito de cautela.

**Veredito sugerido:** `abandonar`

**Justificativa:** Mesmo tentando estreitar o ângulo original (empresas em geral) para o subnicho de clínicas/laboratórios, a saturação persiste: há players especializados e estabelecidos (Poliexpress, ZintlExpress, Titan Express, Unio Express, Alfa Moto Express, CAAS Expresss, BM Service desde 2004) cobrindo exatamente contrato mensal dedicado nesse recorte também. O único gatilho com padrao_confirmado é insatisfação de comerciantes com taxas do app, mas isso valida a dor genérica de 'sair do app', não que um motoboy solo consiga capturar esse cliente frente a concorrentes estruturados com sistema, seguro e protocolo sanitário já publicados. Sem um ângulo novo e livre nomeável, e com concorrência que cobre o recorte estreitado, a condição de abandonar (saturação persistente mesmo no recorte mais estreito) se aplica.

**Achados por categoria:** dado_quantificavel=3, relato_qualitativo=1, alegacao_marketing=1
**Gatilhos por evidência:** padrao_confirmado=2, relato_isolado=1 — gatilho mais_forte tem evidencia `padrao_confirmado`

**Falhas de portão estrutural:**
- FAIL cross-check: 7 URL(s) citada(s) no objeto não constam nas fontes reais

**Aviso de cross-check (não bloqueia):** 7 URL(s) citada(s) no diagnóstico não constam nas fontes reais da busca.

**URLs citadas fora das fontes reais (campo → URL citada):**
- `achados[2].fonte_url` → https://www.reclameaqui.com.br/ifood/ifood-nao-faz-o-repasse-certo-e-seus-motoboy-a-gente-e-eles-nao-fazem-na_ME6oXDJDcesdbvgv/2
- `achados[3].fonte_url` → https://zintlexpress.com.br/motoboy-para-empresas-em-sp/servico-mensal-para-empresas-vale-a-pena-planos-e-beneficios-com-a-zintlexpress/2
- `achados[4].fonte_url` → https://jornaldebrasilia.com.br/noticias/economia/motoboys-protestam-contra-prazo-para-fazer-curso-obrigatorio-e-querem-taxa-minima-de-r-10-por-entrega/2
- `gatilhos_dor[0].observavel_em` → https://www.reclameaqui.com.br/ifood/ifood-nao-faz-o-repasse-certo-e-seus-motoboy-a-gente-e-eles-nao-fazem-na_ME6oXDJDcesdbvgv/2
- `gatilhos_dor[1].observavel_em` → https://jornaldebrasilia.com.br/noticias/economia/motoboys-protestam-contra-prazo-para-fazer-curso-obrigatorio-e-querem-taxa-minima-de-r-10-por-entrega/2
- `gatilhos_dor[2].observavel_em` → https://www.reclameaqui.com.br/da-luz-moda-feminina/atraso-na-entrega-de-compra-com-taxa-de-motoboy-paga_VWy8SZExqPc9XqjT/2
- `indice_saturacao.fontes[0]` → https://poliexpress.com.br/servicos/motoboy-dedicado-contrato-mensal/https/zintlexpress.com.br/motoboy-para-empresas-em-sp/servico-mensal-para-empresas-vale-a-pena-planos-e-beneficios-com-a-zintlexpress/https/www.motoboycentral.com.br/motoboy-para-laboratorio

**Notas do juiz: INDISPONÍVEIS** — a chamada do juiz falhou (`No object generated: response did not match schema.`), mas o veredito e os portões estruturais acima vêm da geração real, que teve sucesso.

**Fontes coletadas (40):** https://www.guiatrabalhista.com.br/tematicas/respemp_mtboy.htm, https://www.vuupt.com/post/contratar-motoboy/, https://www.motoboy.br.com/, https://foodydelivery.com/blog/contrato-com-motoboy-mei-guia-completo/, https://poliexpress.com.br/servicos/motoboy-dedicado-contrato-mensal/, https://www.contratodeprestacao.com.br/contrato-prestacao-servicos-motoboy/, https://zintlexpress.com.br/motoboy-para-empresas-em-sp/servico-mensal-para-empresas-vale-a-pena-planos-e-beneficios-com-a-zintlexpress/, https://motoboydeguarulhos.com.br/index.html, https://goomer.com.br/blog/como-contratar-um-motoboy, https://www.loggi.com/loggiexpresso-entrega-rapida-por-motoboys-em-sao-paulo/, https://titanexpress.com.br/, https://www.fenixmotoboy.com.br/motoboy-sao-paulo, https://motoboydeguarulhos.com.br/index.html, https://chamemotoboy.com.br/, https://www.izientregas.com.br/quanto-custa-um-motoboy-para-delivery/, https://entregasmotoboy.com.br/entregas-rapidas/entregas-motoboy-motoboy-express-guarulhos/, https://entregasmotoboy.com.br/entregas-rapidas/entregas-motoboy-motoboy-express-centro/, https://unioexpress.com.br/motoboy.php, https://www.reclameaqui.com.br/da-luz-moda-feminina/atraso-na-entrega-de-compra-com-taxa-de-motoboy-paga_VWy8SZExqPc9XqjT/, https://www.reclameaqui.com.br/99taxis/atraso-no-pagamento-de-corrida-e-descaso-no-atendimento-ao-motoboy_9v7ezcqAyB4S_cQq/, https://www.reclameaqui.com.br/ifood/atraso-de-mais-de-30-minutos-por-parte-do-motoboy-info-errada-no-app_2-qfz_nJH07sch8u/, https://www.reclameaqui.com.br/ifood/alertas-e-cancelamentos-injustos-por-atraso-motoboy-questiona-responsabilidade-e-solicita-revisao__8lyRFVeWcQ1rn7u/, https://jornaldebrasilia.com.br/noticias/economia/motoboys-protestam-contra-prazo-para-fazer-curso-obrigatorio-e-querem-taxa-minima-de-r-10-por-entrega/, https://www.jornaldocomercio.com/economia/2026/09/1261887-motoboys-fazem-breque-dos-apps-e-acusam-plataformas-de-tentar-esvaziar-protesto.html, https://clickpetroleoegas.com.br/apos-treze-minutos-de-espera-na-portaria-cliente-enrola-13-minutos-para-descer-e-buscar-o-proprio-pedido-motoboy-vigia-o-cancelamento-automatico-conclui-a-entrega-e-avisa-o-consumidor-btl96/, https://revistaexilio.substack.com/p/entregadores-de-aplicativo-protestam, https://www.reclameaqui.com.br/ifood/motoboy-nao-fez-a-entrega-ao-cliente-e-ficou-com-meus-produtos-e-ifood-nao_gks81zF1y7Mme4tF/, https://www.reclameaqui.com.br/ifood/novamente-o-ifood-atrasa-a-entrega-por-colocar-2-pedidos-com-o-mesmo-motobo_qLFSe0pbRerlNVaX/, https://www.reclameaqui.com.br/ifood/taxa-de-entrega_GAjE0BRDTVJ5gEv5/, https://www.reclameaqui.com.br/ifood/ifood-nao-faz-o-repasse-certo-e-seus-motoboy-a-gente-e-eles-nao-fazem-na_ME6oXDJDcesdbvgv/, https://revistaexilio.substack.com/p/entregadores-de-aplicativo-protestam, https://caasexpresss.com/motoboy-particular-para-retirada-de-exames/, https://www.motoboycentral.com.br/motoboy-para-laboratorio, https://caasexpresss.com/motoboy-para-hospitais-e-clinicas/, https://www.motoboycentral.com.br/motoboy-para-retirada-de-exames, https://caasexpresss.com/motoboy-para-laboratorio-rj-e-sp/, https://riovagas.com.br/riovagas/motoboy-laboratorio-veterinario-ate-r-2-30000-jacarepagua/, https://www.motoboy.br.com/servico-de-motoboy-para-retirada-de-exames-do-coronavirus/, https://motomovimentexpress.com/motoboy-para-laboratorio-rj-e-sp/, https://caasexpresss.com/servico-de-motoboy-para-retirada-e-entrega-de-exames-medicos/

**Buscas efetivas (5):** motoboy entregas mensal contrato clínicas pequenas empresas preço · motoboy avulso preço entrega expressa São Paulo tabela · reclamação motoboy aplicativo atraso comerciante taxa alta · clínica pequena empresa reclamação entrega atrasada motoboy aplicativo iFood taxa · motoboy contrato mensal clínica exames laboratório coleta transporte amostras preço

### estetica-beleza (gold)

**Nota do dataset:** Gold nº3 — expectativa DURA, validada ao vivo pelo operador em 2026-09-04 (3º Briefing de Nicho). Espera-se leitura de saturação alta E oferta indiferenciada (serviço genérico de estética, sem ângulo próprio) o bastante para justificar 'abandonar', não 'mudar_angulo' otimista demais.

**RESULTADO: ERRO** — `Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.`

## Discriminação nos 3 gold

| id | veredito esperado | veredito obtido |
|----|--------------------|-------------------|
| costureira-sob-medida | mudar_angulo | mudar_angulo |
| motoboy-clientes-particulares | aprofundar | abandonar |
| estetica-beleza | abandonar | ERRO |

**NÃO DISCRIMINADOS — FALHA CRÍTICA da dimensão 7:** dois ou mais vereditos vieram iguais (ou algum caso gold não gerou resultado). Isso é falha crítica independente do resto do relatório — a rubrica anti-genérico em `src/lib/ai/diagnostico-prompt.ts` precisa ser reforçada, com re-execução e comparação dos dois relatórios.

## Custo total estimado

Estimativa (Sonnet 5 US$2/1M input + US$10/1M output + US$10/1.000 buscas web, geração + juiz): **US$0.63** para 3 caso(s).

_Estimativa aproximada a partir de `usage` do AI SDK — não é a fatura oficial da Anthropic._

