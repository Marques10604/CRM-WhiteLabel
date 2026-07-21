CREATE TABLE `leads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL,
	`telefone` text NOT NULL,
	`canal` text NOT NULL,
	`origem` text NOT NULL,
	`valor_estimado_centavos` integer NOT NULL,
	`notas` text NOT NULL,
	`follow_up_date` integer NOT NULL,
	`subnicho_id` integer NOT NULL,
	`stage` text DEFAULT 'novo' NOT NULL,
	`deleted_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`subnicho_id`) REFERENCES `subnichos`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `leads_deleted_at_idx` ON `leads` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `leads_follow_up_date_idx` ON `leads` (`follow_up_date`);--> statement-breakpoint
CREATE INDEX `leads_stage_idx` ON `leads` (`stage`);--> statement-breakpoint
CREATE INDEX `leads_subnicho_id_idx` ON `leads` (`subnicho_id`);--> statement-breakpoint
CREATE TABLE `subnichos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subnicho_nome_unique_idx` ON `subnichos` (lower(trim("nome")));