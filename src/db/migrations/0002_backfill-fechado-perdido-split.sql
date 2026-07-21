UPDATE leads SET stage = 'fechado' WHERE stage = 'fechado_perdido';--> statement-breakpoint
UPDATE leads SET stage_changed_at = unixepoch() WHERE stage_changed_at IS NULL;
