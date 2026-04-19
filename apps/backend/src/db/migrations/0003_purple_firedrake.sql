CREATE TYPE "public"."recording_status" AS ENUM('pending', 'running', 'completed', 'failed');--> statement-breakpoint
ALTER TYPE "public"."flow_status" ADD VALUE 'pending_approval';--> statement-breakpoint
ALTER TYPE "public"."flow_status" ADD VALUE 'needs_update';--> statement-breakpoint
CREATE TABLE "recordings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task" text NOT NULL,
	"provider_task_id" text,
	"status" "recording_status" DEFAULT 'pending' NOT NULL,
	"artifacts" jsonb,
	"manifest" jsonb,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "last_explored_commit" text;