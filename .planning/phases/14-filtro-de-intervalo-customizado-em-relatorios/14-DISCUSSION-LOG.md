# Phase 14: Filtro de intervalo customizado em `/relatorios` - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-30
**Phase:** 14-filtro-de-intervalo-customizado-em-relatorios
**Areas discussed:** Shape da querystring, Intervalo inválido, Semântica das datas, Forma do seletor

---

## Shape da querystring

| Option | Description | Selected |
|--------|-------------|----------|
| `period=custom` + `from`/`to` | `?period=custom&from=2026-06-01&to=2026-08-30`. `period` continua sendo a chave; `from`/`to` só lidos quando `period=custom`. Mais explícito, mais fácil de validar. | ✓ |
| Só `from`/`to` (presença = custom) | `?from=...&to=...` sem `period`. URL mais curta, precedência mais sutil. | |

**User's choice:** `period=custom` + `from`/`to` (D-01)

| Option | Description | Selected |
|--------|-------------|----------|
| ISO `yyyy-MM-dd` | `?from=2026-06-01`. Ordenável, sem ambiguidade, fácil de parsear. | ✓ |
| `dd/MM/yyyy` | Igual ao que o admin vê, mas precisa encodar a barra e é ambíguo. | |

**User's choice:** ISO `yyyy-MM-dd` (D-02)

---

## Intervalo inválido

| Option | Description | Selected |
|--------|-------------|----------|
| Volta pra `30d` | Mesmo default de primeiro acesso da tela. O admin já conhece esse comportamento. | ✓ |
| Volta pra `tudo` | Mesmo fallback que `resolvePeriodRange` já usa pra valor adulterado. Pode ser muito dado. | |

**User's choice:** Volta pra `30d` (D-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Faixa de aviso no topo (server-rendered) | `<div>` discreto acima das 3 seções. Sem JS. Some no próximo período válido. | ✓ |
| Toast (sonner) | Notificação flutuante. Precisaria de client component só pra isso numa tela SSR pura. | |

**User's choice:** Faixa de aviso server-rendered (D-07)

| Option | Description | Selected |
|--------|-------------|----------|
| Corta pra hoje | `to` no futuro vira hoje (end of day). Intervalo continua válido, só aparado. | ✓ |
| Rejeita o intervalo todo | Data futura = intervalo inválido → fallback + aviso. Descarta a data de início válida junto. | |

**User's choice:** Corta pra hoje (D-06)

---

## Semântica das datas

| Option | Description | Selected |
|--------|-------------|----------|
| `to` inclui o dia inteiro (`endOfDay`) | `to=2026-08-30` pega tudo do dia 30. É o que o admin espera. | ✓ |
| `to` corta à meia-noite | `to=2026-08-30` vira `00:00:00`, exclui o próprio dia 30. | |

**User's choice:** Dia inteiro até 23:59:59 (D-10)

| Option | Description | Selected |
|--------|-------------|----------|
| `startOfDay(from)` | `from=2026-06-01` desde 00:00 do dia 1º. Simétrico com o fim inclusivo. | ✓ |
| Hora exata / meia-noite UTC | Deixa a hora como veio. Abre bug de fuso. | |

**User's choice:** `startOfDay(from)` (D-09)

---

## Forma do seletor

| Option | Description | Selected |
|--------|-------------|----------|
| 4ª opção no `<Select>`, revela os 2 campos | `<Select>` ganha "Intervalo personalizado"; ao escolher, aparecem 2 date pickers. Escondidos nos presets. | ✓ |
| 2 date pickers sempre visíveis ao lado | "Início"/"Fim" sempre na tela. Polui o header quando o admin só usa presets. | |

**User's choice:** 4ª opção no `<Select>` (D-13)

| Option | Description | Selected |
|--------|-------------|----------|
| Automático quando as 2 datas preenchidas | Assim que início E fim têm valor, navega e recarrega. Mesmo espírito do `PeriodoSelector` atual. | ✓ |
| Botão "Aplicar" | Admin escolhe as 2 datas e clica pra recalcular. Um clique a mais, estado local. | |

**User's choice:** Automático (D-15)

| Option | Description | Selected |
|--------|-------------|----------|
| `Popover` + `Calendar` | Button outline + ícone + `dd/MM/yyyy`, abre `Calendar mode=single`. Padrão já usado no `lead-table-toolbar`. | ✓ |
| `<input type="date">` nativo | Menos código, mas visual destoa e formato varia por browser. | |

**User's choice:** `Popover` + `Calendar` (D-14)

---

## Claude's Discretion

- Assinatura exata da função de resolução do range custom (estender `resolvePeriodRange` vs. função irmã `resolveCustomRange`) — contrato em D-08.
- Se os 2 date pickers ficam num sub-componente próprio ou inline no `PeriodoSelector`.
- Nomes internos de props / variáveis / componentes.
- Layout fino (gap, ordem, labels), seguindo `lead-table-toolbar.tsx` + `11-UI-SPEC.md`.
- Texto exato da faixa de aviso e reuso do estado vazio existente.
- Cobertura de teste — estender `scripts/test-relatorios-queries.cjs`.
- Número/ordem de planos (coarse — provável 1-2).

## Deferred Ideas

- Entidade "campanha / janela de teste" formal → Future `CAMPANHA-01`.
- Salvar/nomear intervalos favoritos.
- Comparar dois intervalos lado a lado.
- Export do relatório filtrado (CSV/PDF) — já no backlog PME.
