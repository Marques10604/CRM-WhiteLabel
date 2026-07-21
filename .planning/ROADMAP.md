# Roadmap: CRM de Leads — Área da Saúde

## Overview

The journey goes from a bare-bones but complete manual lead tracker, to a bulk-import pipeline that kills the re-typing pain of the Sheets workflow, to a visual sales funnel that replaces "scrolling a spreadsheet" with a glanceable board, and finally to the follow-up dashboard + WhatsApp one-click outreach that is the actual reason this tool exists: never forgetting a follow-up again. Each phase ships a complete, usable vertical slice — by the end of Phase 1 the admin can already run their business by hand in the new tool instead of Sheets; each later phase removes friction and closes the loop, layer by layer, until the admin never has to leave the CRM to know who to contact next.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Lead & Sub-nicho Foundation** - Admin can fully manage leads and the sub-nicho taxonomy by hand, with a filterable/sortable list and safe (recoverable) deletion
- [ ] **Phase 2: CSV Bulk Import** - Admin can import a cowork CSV batch end-to-end, with Brazilian delimiter/encoding auto-detection and duplicate protection
- [~] **Phase 3: Sales Pipeline & Funnel View** - Admin sees the funnel at a glance and drags leads between stages, with stalled leads flagged (gap closure 03-04 pending — verifier found 2 blockers)
- [ ] **Phase 4: Follow-up Dashboard & WhatsApp Outreach** - Admin opens the CRM to overdue follow-ups by default and reaches out via one-click WhatsApp templates

## Phase Details

### Phase 1: Lead & Sub-nicho Foundation
**Goal**: Admin can fully manage leads and the extensible sub-nicho taxonomy by hand, replacing the base data layer of the spreadsheet
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: LEAD-01, LEAD-02, LEAD-03, LEAD-04, REMIND-02
**Success Criteria** (what must be TRUE):
  1. Admin can create and edit a lead with name, phone, contact channel, source, estimated value, notes, follow-up date, and pipeline stage
  2. Admin can add and rename sub-nichos in an administrable list, avoiding duplicate/near-duplicate categories
  3. Admin can assign each lead to exactly one sub-nicho from that list
  4. Admin can soft-delete a lead — it disappears from active views but remains recoverable, never permanently lost
  5. Admin can view the full lead list, filtered and sorted by sub-nicho, pipeline stage, and follow-up date
**Plans**: 4 plans (Walking Skeleton — see SKELETON.md)
- [x] 01-01-PLAN.md — Walking Skeleton: scaffold Next.js 16 + Drizzle/SQLite + shadcn + corte vertical de sub-nicho (LEAD-02)
- [x] 01-02-PLAN.md — Corte vertical de criar/editar lead: modal 9 campos, combobox de sub-nicho, lista base (LEAD-01, LEAD-03)
- [x] 01-03-PLAN.md — Lista filtrável/ordenável/paginada: filtros sub-nicho/etapa/follow-up (REMIND-02)
- [ ] 01-04-PLAN.md — Soft-delete com confirmação + página Lixeira/restaurar (LEAD-04)

### Phase 2: CSV Bulk Import
**Goal**: Admin can import a batch of leads from a cowork-delivered CSV file end-to-end, without manual re-typing, safely and reversibly
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: IMPORT-01, IMPORT-02, IMPORT-03, LEAD-05
**Success Criteria** (what must be TRUE):
  1. Admin can upload a CSV, map its columns to lead fields, and confirm a preview screen before any lead is created
  2. System auto-detects the delimiter (comma/semicolon) and encoding of Brazilian Excel exports, so accented names and special characters parse correctly without manual configuration
  3. System flags likely duplicate leads (matching phone number) before the import is confirmed, so the admin can decide whether to skip or keep them
  4. Every imported lead is tagged with the import batch it came from, distinguishing it from manually-entered leads and enabling batch-level review later
**Plans**: TBD

### Phase 3: Sales Pipeline & Funnel View
**Goal**: Admin sees and manages the sales funnel at a glance, moving leads through stages as deals progress, without deals silently going cold
**Mode:** mvp
**Depends on**: Phase 1 (needs the lead data model); benefits from Phase 2 (real imported data to validate against)
**Requirements**: PIPE-01, PIPE-02, PIPE-03
**Success Criteria** (what must be TRUE):
  1. Admin sees a board with 5 fixed stages (Novo, Contatado, Negociação, Fechado, Perdido — split during Phase 3 discussion, see `03-CONTEXT.md` D-01, supersedes `01-CONTEXT.md` D-10) and a live count of leads in each
  2. Admin can drag-and-drop a lead card from one stage to another; moving a card to Perdido optionally captures a loss reason (`motivoPerda`)
  3. Leads stuck in "Contatado" without recent activity (5+ days since last stage change) are visually flagged as "esfriando," so they don't silently go cold
**Plans**: 4 plans (3 executed + 1 gap closure)
- [x] 03-01-PLAN.md — Fundacao de data-layer: split do enum Fechado/Perdido + colunas motivoPerda/stageChangedAt + badge/modal (PIPE-01)
- [x] 03-02-PLAN.md — Board somente-leitura: 5 colunas, contagem, esfriando, clique-abre-modal, rota /pipeline + nav (PIPE-01, PIPE-03)
- [x] 03-03-PLAN.md — Drag-and-drop persistente: @dnd-kit, updateLeadStage, movimento otimista, modal de motivoPerda (PIPE-02)
- [x] 03-04-PLAN.md — Gap closure: revalidação cruzada /↔/pipeline + stageChangedAt no caminho de edição por formulário (PIPE-01, PIPE-03)
**UI hint**: yes

### Phase 4: Follow-up Dashboard & WhatsApp Outreach
**Goal**: Admin never misses a follow-up and can reach out via WhatsApp in one click, using ready-made templates, right from the dashboard, the reminders list, and the pipeline
**Mode:** mvp
**Depends on**: Phase 1 (follow-up field), Phase 2 (import-triggered outreach), Phase 3 (pipeline card placement for inline buttons)
**Requirements**: REMIND-01, WA-01, WA-02, WA-03, WA-04, WA-05
**Success Criteria** (what must be TRUE):
  1. Opening the CRM shows the overdue/upcoming follow-ups dashboard by default — not a filter the admin has to apply
  2. Admin can create and edit WhatsApp message templates with variables such as {nome}
  3. Admin can preview the final message, with variables filled in, before opening WhatsApp
  4. Clicking send opens a wa.me link with the correctly encoded message (accents, emoji, line breaks) and a normalized Brazilian phone number
  5. Importing a new lead automatically suggests opening WhatsApp with the first-contact template, and send-WhatsApp buttons appear inline in both the follow-up list and the pipeline cards
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Lead & Sub-nicho Foundation | 3/4 | In Progress|  |
| 2. CSV Bulk Import | 0/TBD | Not started | - |
| 3. Sales Pipeline & Funnel View | 4/4 | Complete    | 2026-07-21 |
| 4. Follow-up Dashboard & WhatsApp Outreach | 0/TBD | Not started | - |
