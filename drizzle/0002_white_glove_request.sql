CREATE TABLE `white_glove_request` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`job_id` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `white_glove_job_idx` ON `white_glove_request` (`job_id`);