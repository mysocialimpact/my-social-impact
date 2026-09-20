CREATE TABLE `readiness_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`identity_email` text NOT NULL,
	`name` text NOT NULL,
	`position` text NOT NULL,
	`contact_email` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `readiness_progress` (
	`session_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`payload` text NOT NULL,
	`current_stage` integer DEFAULT 1 NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `readiness_profiles`(`user_id`) ON UPDATE no action ON DELETE cascade
);
