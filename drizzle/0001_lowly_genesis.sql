CREATE TABLE `portal_draft` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`user_id` text NOT NULL,
	`slug` text,
	`published_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `portal_draft_job_id_unique` ON `portal_draft` (`job_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `portal_draft_slug_unique` ON `portal_draft` (`slug`);--> statement-breakpoint
CREATE INDEX `portal_draft_user_idx` ON `portal_draft` (`user_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_sso_provider` (
	`id` text PRIMARY KEY NOT NULL,
	`issuer` text NOT NULL,
	`oidc_config` text,
	`saml_config` text,
	`user_id` text,
	`provider_id` text NOT NULL,
	`organization_id` text,
	`domain` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_sso_provider`("id", "issuer", "oidc_config", "saml_config", "user_id", "provider_id", "organization_id", "domain") SELECT "id", "issuer", "oidc_config", "saml_config", "user_id", "provider_id", "organization_id", "domain" FROM `sso_provider`;--> statement-breakpoint
DROP TABLE `sso_provider`;--> statement-breakpoint
ALTER TABLE `__new_sso_provider` RENAME TO `sso_provider`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `sso_provider_provider_id_unique` ON `sso_provider` (`provider_id`);