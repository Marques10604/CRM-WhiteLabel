# Relatório de Eval — Diagnóstico de IA da Campanha

**Data:** 2026-09-11T16:51:05.740Z
**Escopo:** --gold (3 casos gold)
**Casos rodados:** 3

## Resumo por caso

| id | categoria | veredito esperado | veredito obtido | resultado | portões | fontes | buscas | tokens in/out | duração |
|----|-----------|--------------------|-------------------|-----------|---------|--------|--------|----------------|---------|
| costureira-sob-medida | gold | mudar_angulo | aprofundar | REGRESSAO | FAIL (1) | 20 | 3 | 69416/5440 | 131.2s |
| motoboy-clientes-particulares | gold | aprofundar | mudar_angulo | REGRESSAO | FAIL (1) | 44 | 5 | 128847/5661 | 118.3s |
| estetica-beleza | gold | abandonar | mudar_angulo | REGRESSAO | FAIL (1) | 16 | 2 | 36518/3519 | 43.8s |

## Detalhe por caso

### costureira-sob-medida (gold)

**Nota do dataset:** Gold nº1 — expectativa DURA, validada ao vivo pelo operador em 2026-09-04 (1º Briefing de Nicho). Espera-se que o diagnóstico reconheça concorrência relevante no ajuste genérico, mas identifique um recorte mais estreito ainda livre (ex.: ajuste expresso com prazo garantido para eventos) — 'mudar_angulo', não 'aprofundar' cego nem 'abandonar' por medo da concorrência.

**Veredito sugerido:** `aprofundar`

**Justificativa:** A saturação no ângulo exato (ajuste/reforma com coleta e entrega em domicílio na zona sul) é moderada, não impeditiva: poucos concorrentes especializados nesse recorte específico, mesmo com ateliês de bairro genéricos disponíveis. Existe gatilho de dor com evidencia padrao_confirmado (peça entregue divergente do combinado / atraso), confirmado por múltiplas reclamações independentes de diferentes ateliês no Reclame Aqui, o que sustenta uma proposta de valor centrada em processo transparente e prazo cumprido. O ticket estimado (~R$180/atendimento, considerando múltiplas peças por visita) multiplicado pela meta de 3 clientes recorrentes em 90 dias é alcançável com prospecção manual de baixo volume. Não há necessidade de mudar o recorte geográfico ou de público — o ângulo já descrito na oferta comporta a diferenciação necessária.

**Achados por categoria:** dado_quantificavel=2, relato_qualitativo=2, alegacao_marketing=1
**Gatilhos por evidência:** padrao_confirmado=2, relato_isolado=1 — gatilho mais_forte tem evidencia `padrao_confirmado`

**Falhas de portão estrutural:**
- FAIL cross-check: 8 URL(s) citada(s) no objeto não constam nas fontes reais

**Aviso de cross-check (não bloqueia):** 8 URL(s) citada(s) no diagnóstico não constam nas fontes reais da busca.

**URLs citadas fora das fontes reais (campo → URL citada):**
- `achados[0].fonte_url` → https://elcosturas.com.br/tabela-de-preco-conserto-de-roupas-2026/','
- `achados[1].fonte_url` → https://travete.com.br/blog/tabela-precos-costura/','
- `achados[2].fonte_url` → https://www.reclameaqui.com.br/conserte-conserto-de-roupas-especializado/nao-fizeram-o-que-pedi_14734051/','
- `achados[4].fonte_url` → https://elcosturas.com.br/a-costureira-estragou-a-minha-roupa/','
- `ticket_medio.fonte_url` → https://elcosturas.com.br/tabela-de-preco-conserto-de-roupas-2026/','
- `gatilhos_dor[0].observavel_em` → https://www.reclameaqui.com.br/conserte-conserto-de-roupas-especializado/nao-fizeram-o-que-pedi_14734051/','
- `gatilhos_dor[1].observavel_em` → https://www.reclameaqui.com.br/vestire-rigor-e-social/ajustes-nao-feitos-demora-na-entrega_35776744/','
- `indice_saturacao.fontes[0]` → https://elcosturas.com.br/costureira-a-domicilio-ajuste-de-roupas/https

**Notas do juiz (dimensões subjetivas):**

| dimensão | veredicto | nota | razão |
|----------|-----------|------|-------|
| especificidade_gatilhos | PASS | 4/5 | Gatilhos descrevem situações concretas (peça devolvida divergente, atraso comprometendo evento) com fonte real do Reclame Aqui. Fragilidade: rotular como 'padrao_confirmado' baseado em apenas uma URL por gatilho é otimista para o rigor da evidência. |
| leitura_saturacao | PASS | 4/5 | Distingue corretamente 'muitos concorrentes' de 'mercado saturado', focando no ângulo específico (coleta/entrega domiciliar). Porém a contagem de 4 concorrentes diretos mistura um player realmente especializado (Ellegancy) com listings genéricos que não comprovadamente fazem retirada/entrega, inflando levemente o número. |
| separacao_dado_marketing | PASS | 5/5 | Tags coerentes: preços e comparações são dado_quantificavel, relatos de clientes são relato_qualitativo, e a afirmação promocional do concorrente sobre si mesmo foi corretamente isolada como alegacao_marketing, sem influenciar saturação, ticket ou veredito. |
| logica_veredito | FAIL | 2/5 | A justificativa pesa saturação e gatilhos de forma coerente, mas introduz uma meta ('3 clientes recorrentes em 90 dias') que não aparece em nenhum achado anterior, quebrando a rastreabilidade exigida — um humano não consegue reconstruir de onde vem esse número. |
| qualidade_rascunho | FAIL | 3/5 | A mensagem abre pela dor de conveniência (marcada como mais_forte:false) em vez do gatilho mais forte (peça entregue diferente do combinado), que só aparece depois; linguagem e oferta são boas, mas a ordem de abertura não segue o gatilho prioritário. |

**Fontes coletadas (20):** https://www.cronoshare.com.br/servicos/costureira/sao-paulo/sao-paulo/b/chacara-santo-antonio-zona-sul, https://www.cronoshare.com.br/servicos/costureira/sao-paulo/sao-paulo, https://elcosturas.com.br/costureira-em-casa/, https://www.getninjas.com.br/moda-e-beleza/corte-e-costura/ajustes-e-reparos/sp/sao-paulo, https://elcosturas.com.br/costureira-a-domicilio-ajuste-de-roupas/, https://acheioprofissional.com.br/costureira/sao-paulo, https://marlenemukai.com.br/tabela-de-precos-de-costura-e-reforma-de-roupas/, https://marlenemukai.com.br/tabelas-de-precos-de-mao-de-obra-de-confeccao-ajustes-e-concertos-2026/, https://elcosturas.com.br/tabela-de-preco-conserto-de-roupas-2025/, https://elcosturas.com.br/tabela-de-preco-conserto-de-roupas-2026/, https://travete.com.br/blog/tabela-precos-costura/, https://tudocortecostura.com.br/tabela-de-preco-costura/, https://pt.scribd.com/document/581194536/TABELA-DE-PRECOS-DE-SERVICOS-DE-AJUSTES-DE-ROUPAS, https://jornaldacostureira.wordpress.com/2015/11/25/tabela-de-precos-consertos-x-confeccao/, https://www.reclameaqui.com.br/vestire-rigor-e-social/ajustes-nao-feitos-demora-na-entrega_35776744/, https://www.reclameaqui.com.br/blessed-atelie/vestido-de-festa_13047107/, https://www.conjur.com.br/2014-jan-18/cliente-indenizada-costureira-atrasou-entrega-vestido/, https://www.reclameaqui.com.br/sem-costura/atraso-na-entrega-suspeita-de_ukrpJQ-slvdhMtNB/, https://www.reclameaqui.com.br/conserte-conserto-de-roupas-especializado/nao-fizeram-o-que-pedi_14734051/, https://elcosturas.com.br/a-costureira-estragou-a-minha-roupa/

**Buscas efetivas (3):** costureira ajustes reforma roupa retirada e devolução em domicílio zona sul São Paulo · tabela de preços ajuste de roupa costureira São Paulo bainha calça valor · reclame aqui costureira ajuste roupa atraso demora

### motoboy-clientes-particulares (gold)

**Nota do dataset:** Gold nº2 — expectativa DURA, validada ao vivo pelo operador em 2026-09-04 (2º Briefing de Nicho). Espera-se leitura de baixa saturação de concorrência direta (fora de app) e dor real e recorrente (dependência de app com taxa alta) o bastante para justificar 'aprofundar', não um veredito de cautela.

**Veredito sugerido:** `mudar_angulo`

**Justificativa:** A oferta original (avulso+mensal para pequenos comércios E clínicas) já está coberta por mais de 10 empresas formalizadas com frota, CT-e e certificação ANVISA para o segmento de saúde — recorte saturado. O único gatilho com padrao_confirmado (lojistas insatisfeitos com taxas de apps) não é específico de clínica/saúde, mas de comércio geral. Ângulo recomendado: abandonar o subsegmento clínico/laboratorial (dominado por players certificados) e focar hiperlocal em pequeno comércio não-saúde de bairro (papelaria, autopeças, floricultura), usando a dor confirmada da taxa de app como gancho, onde não há concorrente direto identificado atuando nesse recorte estreito.

**Achados por categoria:** dado_quantificavel=2, relato_qualitativo=1, alegacao_marketing=1
**Gatilhos por evidência:** padrao_confirmado=1, relato_isolado=1 — gatilho mais_forte tem evidencia `padrao_confirmado`

**Falhas de portão estrutural:**
- FAIL cross-check: 7 URL(s) citada(s) no objeto não constam nas fontes reais

**Aviso de cross-check (não bloqueia):** 7 URL(s) citada(s) no diagnóstico não constam nas fontes reais da busca.

**URLs citadas fora das fontes reais (campo → URL citada):**
- `achados[0].fonte_url` → https://controlenamao.com.br/blog/quanto-custa-um-motoboy-terceirizado-para-delivery/1
- `achados[2].fonte_url` → https://www.reclameaqui.com.br/ifood/taxa-de-entrega-muito-alta-pra-minha-regiao_JpFEuNVKgtAwMcFs/'
- `achados[3].fonte_url` → https://caasexpresss.com/motoboy-para-laboratorio-rj-e-sp/1
- `ticket_medio.fonte_url` → https://controlenamao.com.br/blog/quanto-custa-um-motoboy-terceirizado-para-delivery/1
- `gatilhos_dor[0].observavel_em` → https://www.reclameaqui.com.br/ifood/taxa-de-entrega-muito-alta-pra-minha-regiao_JpFEuNVKgtAwMcFs/','
- `gatilhos_dor[1].observavel_em` → https://www.motoboy.br.com/servico-de-motoboy-para-retirada-de-exames-do-coronavirus/','
- `indice_saturacao.fontes[2]` → https://caasexpresss.com/motoboy-para-hospitais-e-clinicas/motoboy-para-laboratorio-rj-e-sp/1

**Notas do juiz: INDISPONÍVEIS** — a chamada do juiz falhou (`No object generated: response did not match schema.`), mas o veredito e os portões estruturais acima vêm da geração real, que teve sucesso.

**Fontes coletadas (44):** https://www.vuupt.com/post/contratar-motoboy/, https://mxlog.com.br/motoboy-fixo-vs-por-demanda-como-escolher/, https://politiacademy.com.br/blog/marketing-e-vendas/contratar-motoboy-para-entrega-delivery/, https://goomer.com.br/blog/como-contratar-um-motoboy, https://entregasmotoboy.com.br/, https://www.motoboy.br.com/, https://controlenamao.com.br/blog/quanto-custa-um-motoboy-terceirizado-para-delivery/, https://55content.com.br/machine-conecta/como-cobrar-pelas-entregas/, https://www.motoboyrj.net/, https://motoboy.app/, https://motoboydeguarulhos.com.br/index.html, https://entregasmotoboy.com.br/entregas-rapidas/entregas-motoboy-motoboy-express-centro/, https://unioexpress.com.br/motoboy.php, https://entregasmotoboy.com.br/entregas-rapidas/entregas-motoboy-motoboys-sp/, https://motoboy-no-pacaembu.webnode.page/motoboy-avulso/, https://www.reclameaqui.com.br/ifood/ifood-cobrando-taxa-de-entrega-mesmo-a-loja-tendo-entrega-gratis_XHXYqD0oOjCASls7/, https://www.reclameaqui.com.br/ifood/taxa-de-entrega_F-Y0M8e4OaX55yXN/, https://www.reclameaqui.com.br/ifood/taxa-de-entrega-muito-alta-pra-minha-regiao_JpFEuNVKgtAwMcFs/, https://www.reclameaqui.com.br/ifood/reclamacao-sobre-promocoes-enganosas-e-taxas-abusivas-no-ifood_ZtCQ7L6YrY7AAplB/, https://www.reclameaqui.com.br/ifood/cobranca-abusiva-de-taxas-de-entrega_0ZeqE7XJDvbp1-TH/, https://www.reclameaqui.com.br/ifood/aumento-absurdo-no-valor-da-taxa-de-entrega-um-valor-que-ja-era-alto_tgitVUd7zuVF9gCC/, https://www.reclameaqui.com.br/ifood/taxas-altas_sCRlJffkAtEWiM9y/, https://www.reclameaqui.com.br/ifood/ifood-desrespeita-consumidores-com-cobrancas-indevidas-e-praticas-obscuras_T95mS3bqnTcvwmzp/, https://www.reclameaqui.com.br/empresa/ifood/lista-reclamacoes/, https://www.reclameaqui.com.br/ifood/desrespeito-e-completo-descaso-com-o-consumidor_yUoonyM9ZAkx_dm9/, https://www.motoboy.br.com/servico-de-motoboy-para-retirada-de-exames-do-coronavirus/, https://expressorapido.com.br/quais-entregas-de-documentos-que-os-motoboys-podem-realizar/, https://www.motoboycentral.com.br/motoboy-para-retirada-de-exames, https://caasexpresss.com/motoboy-para-laboratorio-rj-e-sp/, https://caasexpresss.com/servico-de-motoboy-para-retirada-e-entrega-de-exames-medicos/, https://motoboy.hbexpress.com.br/terceirizacao-de-motoboy-para-entrega-de-exames, https://caasexpresss.com/motoboy-para-hospitais-e-clinicas/, https://caasexpresss.com/motoboy-para-entregas-de-equipamentos-medicos-com-seguranca-e-agilidade-para-hospitais/, https://motoboy.hbexpress.com.br/entrega-de-exames-via-motoboy, https://motomovimentexpress.com/motoboy-para-laboratorio-rj-e-sp/, https://www.membi.com.br/pagina/entregas-e-frete.html, https://www.motoboy.br.com/, https://www.basiliomotoboy.com/onde-atendemos/motoboy-zona-leste, https://www.dtudopapelaria.com/, https://www.choilypaper.com.br/pagina/motoboy-para-sao-paulo.html, https://www.entregasecoletas.com.br/servicos/, https://www.motoboycentral.com.br/empresas-de-entrega-de-flores, https://heidermaq.com.br/, https://www.guiafacil.com/site/autopecas-flores/campinas/sp/1932349859/

**Buscas efetivas (5):** motoboy entrega recorrente contrato mensal pequeno comércio preço · motoboy avulso preço corrida entrega expressa tabela · reclamação taxa alta ifood loggi pequeno comércio clínica entrega reclame aqui · "motoboy" clínica exames laboratório entrega documentos contrato mensal · papelaria floricultura autopeças bairro entrega motoboy fidelizado

### estetica-beleza (gold)

**Nota do dataset:** Gold nº3 — expectativa DURA, validada ao vivo pelo operador em 2026-09-04 (3º Briefing de Nicho). Espera-se leitura de saturação alta E oferta indiferenciada (serviço genérico de estética, sem ângulo próprio) o bastante para justificar 'abandonar', não 'mudar_angulo' otimista demais.

**Veredito sugerido:** `mudar_angulo`

**Justificativa:** A oferta original, no ângulo genérico de pacote de limpeza+massagem, está saturada: 7 concorrentes diretos oferecem exatamente esse combo fechado. Porém há um gatilho com evidência padrao_confirmado — múltiplos clientes de clínicas maiores relatando dificuldade de completar/agendar pacotes já pagos — que aponta um ângulo livre: atendimento solo com compromisso de agenda e flexibilidade de remarcação, mirando quem já se frustrou com clínicas grandes. Nenhum concorrente encontrado atua nesse recorte de diferenciação. Ticket estimado (R$500-800) x meta de 10 pacotes é alcançável em 90 dias de prospecção manual se o ângulo focar essa dor específica, não a oferta genérica.

**Achados por categoria:** dado_quantificavel=1, relato_qualitativo=2, alegacao_marketing=1
**Gatilhos por evidência:** padrao_confirmado=1, relato_isolado=1 — gatilho mais_forte tem evidencia `padrao_confirmado`

**Falhas de portão estrutural:**
- FAIL cross-check: 8 URL(s) citada(s) no objeto não constam nas fontes reais

**Aviso de cross-check (não bloqueia):** 8 URL(s) citada(s) no diagnóstico não constam nas fontes reais da busca.

**URLs citadas fora das fontes reais (campo → URL citada):**
- `achados[0].fonte_url` → https://catracalivre.com.br/saude-bem-estar/quanto-custa-uma-limpeza-de-pele-profunda-em-2026/'
- `achados[1].fonte_url` → https://www.reclameaqui.com.br/empresa/estetica-pele/lista-reclamacoes/'
- `achados[2].fonte_url` → https://www.reclameaqui.com.br/rio-arte-estetica/limpeza-de-pele_erbVjJkQB-H8fp4a/'
- `achados[3].fonte_url` → https://www.reclameaqui.com.br/giolaser/reclamacao_RCjdQ3WwYoMyt-mq/'
- `ticket_medio.fonte_url` → https://catracalivre.com.br/saude-bem-estar/quanto-custa-cuidar-da-pele-com-limpeza-profissional-em-2026/'de'
- `gatilhos_dor[0].observavel_em` → https://www.reclameaqui.com.br/empresa/estetica-pele/lista-reclamacoes/','
- `gatilhos_dor[1].observavel_em` → https://www.reclameaqui.com.br/rio-arte-estetica/limpeza-de-pele_erbVjJkQB-H8fp4a/','
- `indice_saturacao.fontes[0]` → https://www.reclameaqui.com.br/empresa/pro-corpo-estetica-avancada/lista-reclamacoes/icativas/https/giresresresempresa/estetica-pele/lista-reclamacoes/dummy

**Notas do juiz (dimensões subjetivas):**

| dimensão | veredicto | nota | razão |
|----------|-----------|------|-------|
| especificidade_gatilhos | PASS | 4/5 | Os dois gatilhos descrevem situações concretas (dificuldade de agendar pacotes já pagos, resultado agressivo em sessão específica), com fonte real e nível de evidência explicitado (padrao_confirmado vs relato_isolado), evitando generalizações vagas como 'precisa de mais clientes'. |
| leitura_saturacao | PASS | 4/5 | Distingue corretamente saturação no ângulo específico do combo fechado (7 concorrentes) da fragmentação ainda maior no avulso, evitando tratar contagem como veredito automático; porém a URL-fonte citada está visivelmente corrompida/concatenada, o que enfraquece a confiança na contagem. |
| separacao_dado_marketing | PASS | 5/5 | Preço é tagueado como dado_quantificavel, relatos de clientes como relato_qualitativo, e a única alegação de marketing (resposta institucional da Gio Estética) foi corretamente isolada como alegacao_marketing e não entrou no cálculo de saturação, ticket ou veredito. |
| logica_veredito | PASS | 5/5 | A justificativa reconstrói o raciocínio explicitando saturação no ângulo genérico, força do gatilho confirmado sobre agendamento, ausência de concorrência nesse recorte e viabilidade do ticket versus meta em 90 dias — um humano consegue refazer o caminho lógico. |
| qualidade_rascunho | PASS | 5/5 | Abre diretamente pelo gatilho mais forte (dificuldade de agendar pacote pago), usa linguagem coloquial que o prospect reconheceria, oferece um diferencial concreto (atendimento solo, agenda combinada) e propõe um próximo passo pequeno e natural. |

**Fontes coletadas (16):** https://catracalivre.com.br/saude-bem-estar/quanto-custa-uma-limpeza-de-pele-profunda-em-2026/, https://portalleodias.com/diversos/2025/11/25/quanto-custa-a-limpeza-de-pele-profissional/, https://catracalivre.com.br/saude-bem-estar/quanto-custa-cuidar-da-pele-com-limpeza-profissional-em-2026/, https://agendiva.com.br/blog/quanto-cobrar-procedimento-estetico, https://belezacorporal.com.br/glossario/qual-valor-de-limpeza-de-pele/, https://renatadallier.com.br/2025/07/02/limpeza-de-pele-preco-2025-quanto-custa-cada-tipo-de-procedimento/, https://www.portalguiabrasil.com.br/noticia/quanto-custa-limpeza-de-pele-saiba-o-preco-medio-e-o-que-influencia-o-valor, https://www.reclameaqui.com.br/empresa/pro-corpo-estetica-avancada/lista-reclamacoes/?status=EVALUATED, https://www.reclameaqui.com.br/giolaser/reclamacao_RCjdQ3WwYoMyt-mq/, https://www.reclameaqui.com.br/rio-arte-estetica/limpeza-de-pele_erbVjJkQB-H8fp4a/, https://www.reclameaqui.com.br/pro-corpo-estetica-avancada/clinica-de-estetica-sem-medico-responsavel-e-pessimo-atendimento_I5M0HcX99DfD35wG/, https://www.reclameaqui.com.br/empresa/rio-arte-estetica/lista-reclamacoes/, https://www.reclameaqui.com.br/empresa/dr-estetica/lista-reclamacoes/, https://www.reclameaqui.com.br/empresa/estetica-pele/lista-reclamacoes/, https://www.reclameaqui.com.br/estetica-onodera/instisfacao-com-limpeza-de-pele-e-nao-me-deram-nf_13280219/, https://www.reclameaqui.com.br/beauty-holic/propaganda-enganosa-e-servico-de-limpeza-de-pele-insatisfatorio_HXLa0PkAtss713cJ/

**Buscas efetivas (2):** limpeza de pele valor tabela preço clínica estética instagram · reclame aqui clínica estética limpeza de pele reclamação

## Discriminação nos 3 gold

| id | veredito esperado | veredito obtido |
|----|--------------------|-------------------|
| costureira-sob-medida | mudar_angulo | aprofundar |
| motoboy-clientes-particulares | aprofundar | mudar_angulo |
| estetica-beleza | abandonar | mudar_angulo |

**NÃO DISCRIMINADOS — FALHA CRÍTICA da dimensão 7:** dois ou mais vereditos vieram iguais (ou algum caso gold não gerou resultado). Isso é falha crítica independente do resto do relatório — a rubrica anti-genérico em `src/lib/ai/diagnostico-prompt.ts` precisa ser reforçada, com re-execução e comparação dos dois relatórios.

## Custo total estimado

Estimativa (Sonnet 5 US$2/1M input + US$10/1M output + US$10/1.000 buscas web, geração + juiz): **US$0.81** para 3 caso(s).

_Estimativa aproximada a partir de `usage` do AI SDK — não é a fatura oficial da Anthropic._

