DO $$
BEGIN
	CREATE TYPE "public"."recording_status" AS ENUM('queued', 'running', 'completed', 'failed');
EXCEPTION
	WHEN duplicate_object THEN NULL;
END
$$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recordings" (
	"task_id" text PRIMARY KEY NOT NULL,
	"task" text,
	"status" "recording_status" DEFAULT 'queued' NOT NULL,
	"provider" text,
	"acl" text,
	"file_key" text,
	"upload_url" text,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
