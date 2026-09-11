# Relatório de Eval — Diagnóstico de IA da Campanha

**Data:** 2026-09-11T15:02:32.240Z
**Escopo:** --gold (3 casos gold)
**Casos rodados:** 3

## Resumo por caso

| id | categoria | veredito esperado | veredito obtido | resultado | portões | fontes | buscas | tokens in/out | duração |
|----|-----------|--------------------|-------------------|-----------|---------|--------|--------|----------------|---------|
| costureira-sob-medida | gold | mudar_angulo | aprofundar | REGRESSAO | FAIL (1) | 14 | 2 | 29761/3963 | 104.9s |
| motoboy-clientes-particulares | gold | aprofundar | ERRO | REGRESSAO | — | — | — | — | 81.7s |
| estetica-beleza | gold | abandonar | aprofundar | REGRESSAO | FAIL (1) | 17 | 2 | 30359/4250 | 110.1s |

## Detalhe por caso

### costureira-sob-medida (gold)

**Nota do dataset:** Gold nº1 — expectativa DURA, validada ao vivo pelo operador em 2026-09-04 (1º Briefing de Nicho). Espera-se que o diagnóstico reconheça concorrência relevante no ajuste genérico, mas identifique um recorte mais estreito ainda livre (ex.: ajuste expresso com prazo garantido para eventos) — 'mudar_angulo', não 'aprofundar' cego nem 'abandonar' por medo da concorrência.

**Veredito sugerido:** `aprofundar`

**Justificativa:** A concorrência direta no ângulo exato descrito (retirada e devolução em domicílio, zona sul) é baixa-moderada: apenas 3 operações identificadas, nenhuma dominante e nenhuma cobrindo o recorte com constância. Existe um gatilho de dor forte e observado (medo real de serviço malfeito, R$300 perdidos segundo relato no GetNinjas), que a oferta resolve diretamente com prova visual e confirmação prévia. O ticket estimado (R$100-150 por atendimento, com clientes recorrentes gerando múltiplas peças) multiplicado pela meta de 3 clientes recorrentes em 90 dias é alcançável com prospecção manual de baixo volume via Instagram/WhatsApp, sem exigir escala. Nenhuma das condições de abandono se aplica.

**Falhas de portão estrutural:**
- FAIL cross-check: 6 URL(s) citada(s) no objeto não constam nas fontes reais

**Aviso de cross-check (não bloqueia):** 6 URL(s) citada(s) no diagnóstico não constam nas fontes reais da busca.

**Notas do juiz (dimensões subjetivas):**

| dimensão | veredicto | nota | razão |
|----------|-----------|------|-------|
| especificidade_gatilhos | PASS | 4/5 | O gatilho principal cita um relato concreto (R$300 pago por bainha malfeita, pernas diferentes) com fonte real no GetNinjas, situação observável e específica do nicho. O segundo gatilho, sobre pedir fotos e orçamento antes de fechar, é mais brando mas ainda ancorado numa FAQ real de concorrente, não é dor genérica de qualquer serviço. |
| leitura_saturacao | PASS | 5/5 | Distingue claramente contagem de concorrentes no ângulo exato (retirada/devolução domiciliar zona sul, apenas 3 operações) da leitura de saturação real, apontando ausência de player dominante cobrindo esse recorte com constância — não trata número bruto como veredito automático. |
| separacao_dado_marketing | PASS | 4/5 | As tags parecem corretas: preços e relato de cliente são marcados dado_quantificavel, e a frase de autopromoção da Ellegancy é corretamente marcada alegacao_marketing, sem entrar no cálculo de saturação ou ticket. Ressalva: o relato único do GetNinjas é tratado como 'dado' mas é anedótico, não uma métrica de mercado, o que fragiliza um pouco a categorização. |
| logica_veredito | PASS | 4/5 | A justificativa amarra saturação baixa-moderada, força do gatilho de dor e ticket estimado para sustentar a decisão de aprofundar, permitindo reconstruir o raciocínio. Ponto fraco: o ticket final de R$130 é uma extrapolação não totalmente rastreável a partir da tabela de R$80-104, o que fragiliza levemente a cadeia lógica. |
| qualidade_rascunho | PASS | 5/5 | Abre diretamente pelo medo de serviço malfeito (gatilho mais forte), usa linguagem coloquial que o prospect usaria, oferece prova concreta (fotos antes/depois) e pede um próximo passo pequeno e natural (mandar foto da peça para orçamento). |

**Fontes coletadas (14):** https://www.cronoshare.com.br/servicos/costureira/sao-paulo/sao-paulo/b/chacara-santo-antonio-zona-sul, https://elcosturas.com.br/costureira-a-domicilio-ajuste-de-roupas/, https://elcosturas.com.br/costureira-em-casa/, https://www.cronoshare.com.br/servicos/costureira/sao-paulo/sao-paulo, https://www.getninjas.com.br/moda-e-beleza/corte-e-costura/ajustes-e-reparos/sp/sao-paulo, https://elcosturas.com.br/consertos-e-reformas-de-roupas/, https://www.lanadri.com.br/, https://elcosturas.com.br/tabela-de-preco-conserto-de-roupas-2025/, https://marlenemukai.com.br/tabelas-de-precos-de-mao-de-obra-de-confeccao-ajustes-e-concertos-2026/, https://marlenemukai.com.br/tabela-de-precos-de-costura-e-reforma-de-roupas/, https://elcosturas.com.br/tabela-de-preco-conserto-de-roupas-2026/, https://travete.com.br/blog/tabela-precos-costura/, https://casadeviver.com.br/tabela-de-preco-conserto-de-roupa/, https://tudocortecostura.com.br/tabela-de-preco-costura/

**Buscas efetivas (2):** costureira ajustes reforma roupa retirada e entrega domicílio zona sul São Paulo · tabela de preços ajuste de roupa costureira São Paulo bainha calça

### motoboy-clientes-particulares (gold)

**Nota do dataset:** Gold nº2 — expectativa DURA, validada ao vivo pelo operador em 2026-09-04 (2º Briefing de Nicho). Espera-se leitura de baixa saturação de concorrência direta (fora de app) e dor real e recorrente (dependência de app com taxa alta) o bastante para justificar 'aprofundar', não um veredito de cautela.

**RESULTADO: ERRO** — `No object generated: response did not match schema.`

### estetica-beleza (gold)

**Nota do dataset:** Gold nº3 — expectativa DURA, validada ao vivo pelo operador em 2026-09-04 (3º Briefing de Nicho). Espera-se leitura de saturação alta E oferta indiferenciada (serviço genérico de estética, sem ângulo próprio) o bastante para justificar 'abandonar', não 'mudar_angulo' otimista demais.

**Veredito sugerido:** `aprofundar`

**Justificativa:** A concorrência direta no ângulo exato (pacote fechado limpeza+massagem) é moderada, não bloqueante — cerca de 7 prestadores achados, a maioria vendendo o combo genérico sem atacar confiabilidade. Há gatilho de dor forte e observado (reclamações reais de clientes sobre cancelamento e falta de profissional em pacotes pagos), que o operador pode usar como diferencial direto na primeira mensagem, sem precisar mudar o recorte da oferta. O ticket ancorado em concorrente real (R$300-450) x meta de 10 pacotes gera R$3.000-4.500 em 90 dias, alcançável via prospecção manual de baixo volume (não exige escala). Nenhuma das condições de abandono se aplica: a dor é forte, o recorte já descrito não está saturado a ponto de travar entrada, e a conta fecha com esforço razoável.

**Falhas de portão estrutural:**
- FAIL cross-check: 7 URL(s) citada(s) no objeto não constam nas fontes reais

**Aviso de cross-check (não bloqueia):** 7 URL(s) citada(s) no diagnóstico não constam nas fontes reais da busca.

**Notas do juiz (dimensões subjetivas):**

| dimensão | veredicto | nota | razão |
|----------|-----------|------|-------|
| especificidade_gatilhos | PASS | 5/5 | Gatilhos descrevem situações concretas (cancelamento de sessão paga, falta de profissional disponível, políticas de sinal por faltas) com fonte real em Reclame Aqui e blog do setor, evitando dores genéricas. |
| leitura_saturacao | PASS | 4/5 | Conta concorrentes no ângulo exato da oferta (pacote fechado limpeza+massagem, 7 prestadores) e distingue concorrência existente de saturação bloqueante, notando que a maioria não ataca confiabilidade como diferencial. |
| separacao_dado_marketing | FAIL | 2/5 | Vários itens marcados 'dado_quantificavel' são na verdade relatos qualitativos de reclamações (ex.: 'cliente relata indução a erro', 'cliente pede cancelamento por falta de profissional'), que não são contagens/preços observados, misturando categorias com peso indevido. |
| logica_veredito | PASS | 4/5 | A justificativa combina saturação moderada, força do gatilho de dor observado e ticket vs meta de faturamento em 90 dias, permitindo reconstruir o raciocínio que levou a 'aprofundar'. |
| qualidade_rascunho | PASS | 5/5 | Abre pelo gatilho mais forte (pacote pago e cancelado), usa linguagem coloquial que o cliente usaria, oferece sessão avulsa como próximo passo pequeno e concreto antes do pacote. |

**Fontes coletadas (17):** https://www.instagram.com/permitaestetica/, https://buk.pt/paola-loiola-agenda, https://br.pinterest.com/ellecylda/limpeza-de-pele/, https://www.tatys.com.br/novidades/faca-limpeza-de-pele-ganhe-massagem-relaxante/109/, https://www.instagram.com/clinicarenascer_rs/, https://www.santespa.com.br/pacote-de-massagem-estetica-dupla-perfeita, https://maisbemestar.com/, https://www.instagram.com/p/DM3FIXtRpdn/, https://www.instagram.com/revivesteticasumare/, https://www.instagram.com/mary_estetica_e_beleza/, https://www.reclameaqui.com.br/instagram/cancelamento-de-um-anuncio_duv1jW7492IDEzeM/, https://www.reclameaqui.com.br/estetica-onodera/servico-nao-prestado-cancelamento-do-pacote_RF0fmmVYLYzPw24W/, https://www.reclameaqui.com.br/natalia-beauty-e-academy/descaso-falta-de-transparencia-e-nao-cumprimento-de-agendamento-para-lash_36P1OtcKO4S4s9pY/, https://agende-me.com/esteticista/, https://clientepreferido.com.br/blog/politica-cancelamento-salao-beleza-como-criar, https://www.reclameaqui.com.br/projeto-e-beleza/fujam-dessa-clinica-esse-lugar-e-um-tive-muitos-problemas-nao-recome_ZCyr_T1_fBT0UWQn/, https://blog.belio.com.br/artigos/regras-agendamento-salao-beleza/

**Buscas efetivas (2):** pacote limpeza de pele massagem relaxante preço estética instagram · esteticista reclamação cliente não retorna cancelamento agenda instagram

## Discriminação nos 3 gold

| id | veredito esperado | veredito obtido |
|----|--------------------|-------------------|
| costureira-sob-medida | mudar_angulo | aprofundar |
| motoboy-clientes-particulares | aprofundar | ERRO |
| estetica-beleza | abandonar | aprofundar |

**NÃO DISCRIMINADOS — FALHA CRÍTICA da dimensão 7:** dois ou mais vereditos vieram iguais (ou algum caso gold não gerou resultado). Isso é falha crítica independente do resto do relatório — a rubrica anti-genérico em `src/lib/ai/diagnostico-prompt.ts` precisa ser reforçada, com re-execução e comparação dos dois relatórios.

## Custo total estimado

Estimativa (Sonnet 5 US$2/1M input + US$10/1M output + US$10/1.000 buscas web, geração + juiz): **US$0.31** para 3 caso(s).

_Estimativa aproximada a partir de `usage` do AI SDK — não é a fatura oficial da Anthropic._

