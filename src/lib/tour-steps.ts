import type { Step } from "react-joyride";

/**
 * Dado ESTÁTICO dos 5 passos do tour guiado do CRM (Fase 25, TUTORIAL-01).
 *
 * Zero DOM, zero React, zero interpolação dinâmica — cada `title`/`content`
 * é uma string literal copiada caractere a caractere do `25-UI-SPEC.md`
 * (seção "Copywriting Contract", cópia TRAVADA). Invariante de segurança
 * T-25-01: nenhum `title`/`content` pode ser construído a partir de dado de
 * banco/URL/formulário, e nunca renderizado via HTML bruto/não sanitizado —
 * se um dia este arquivo parar de ser 100% estático, essa invariante precisa
 * ser revista.
 *
 * Os 5 `target` apontam para os itens da sidebar (`app-sidebar.tsx`), que
 * ganham o atributo de seletor `nav-*` correspondente no plano 25-02 — este
 * arquivo não modifica a sidebar, só declara o contrato de seletor.
 *
 * Tipado contra a API real da v3 do `react-joyride` (confirmada em
 * `node_modules/react-joyride/dist/index.d.cts` na Task 2 do 25-01-PLAN.md,
 * registrada no `25-01-SUMMARY.md`): `Step.target` aceita string de seletor
 * CSS, `Step.content` é obrigatório, `Step.title` é opcional, e o campo real
 * de per-step para pular o beacon é `skipBeacon` (não `disableBeacon` —
 * D-25-02, resolve Open Question 1 do `25-RESEARCH.md`).
 */
export const TOUR_STEPS: Step[] = [
  {
    target: '[data-tour="nav-dashboard"]',
    title: "Follow-ups",
    content:
      "Aqui ficam os follow-ups vencidos, de hoje e dos próximos 7 dias — o painel que evita esquecer um lead.",
    placement: "right",
    skipBeacon: true,
  },
  {
    target: '[data-tour="nav-leads"]',
    title: "Leads",
    content: "A lista completa de leads, com filtros por nicho, etapa e origem.",
    placement: "right",
    skipBeacon: true,
  },
  {
    target: '[data-tour="nav-pipeline"]',
    title: "Pipeline",
    content:
      "O funil de vendas em quadro — arraste um lead entre as etapas conforme ele avança.",
    placement: "right",
    skipBeacon: true,
  },
  {
    target: '[data-tour="nav-campanhas"]',
    title: "Campanhas de nicho",
    content:
      "Organize a exploração de um nicho novo: oferta, janela de tempo, diagnóstico de IA e veredito final.",
    placement: "right",
    skipBeacon: true,
  },
  {
    target: '[data-tour="nav-relatorios"]',
    title: "Relatórios",
    content: "Métricas do funil: conversão, motivos de perda e origem dos leads no período.",
    placement: "right",
    skipBeacon: true,
  },
];
