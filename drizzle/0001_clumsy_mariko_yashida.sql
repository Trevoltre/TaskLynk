CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`type` text NOT NULL,
	`subject` text NOT NULL,
	`message` text NOT NULL,
	`email_sent` integer DEFAULT false NOT NULL,
	`email_sent_at` text,
	`read` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user_stats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`total_jobs_posted` integer DEFAULT 0 NOT NULL,
	`total_jobs_completed` integer DEFAULT 0 NOT NULL,
	`total_jobs_cancelled` integer DEFAULT 0 NOT NULL,
	`total_amount_earned` real DEFAULT 0 NOT NULL,
	`total_amount_spent` real DEFAULT 0 NOT NULL,
	`average_rating` real,
	`total_ratings` integer DEFAULT 0 NOT NULL,
	`on_time_delivery` integer DEFAULT 0 NOT NULL,
	`late_delivery` integer DEFAULT 0 NOT NULL,
	`revisions_requested` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
DROP INDEX "users_email_unique";--> statement-breakpoint
ALTER TABLE `users` ALTER COLUMN "phone" TO "phone" text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
ALTER TABLE `users` ADD `status` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `suspended_until` text;--> statement-breakpoint
ALTER TABLE `users` ADD `suspension_reason` text;--> statement-breakpoint
ALTER TABLE `users` ADD `blacklist_reason` text;--> statement-breakpoint
ALTER TABLE `users` ADD `rejected_at` text;--> statement-breakpoint
ALTER TABLE `users` ADD `rejection_reason` text;--> statement-breakpoint
ALTER TABLE `users` ADD `total_earned` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `total_spent` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `completed_jobs` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `completion_rate` real;