CREATE TABLE `white_glove_request` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`job_id` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `white_glove_job_idx` ON `white_glove_request` (`job_id`);--> statement-breakpoint
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