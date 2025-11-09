ALTER TABLE `jobs` ADD `display_id` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `jobs_display_id_unique` ON `jobs` (`display_id`);--> statement-breakpoint
ALTER TABLE `users` ADD `display_id` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `users_display_id_unique` ON `users` (`display_id`);