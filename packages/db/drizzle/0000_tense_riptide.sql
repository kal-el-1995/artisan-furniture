CREATE TYPE "public"."order_status" AS ENUM('draft', 'confirmed', 'in_production', 'quality_check', 'ready_to_ship', 'in_transit', 'customs', 'delivered', 'completed');--> statement-breakpoint
CREATE TYPE "public"."production_status" AS ENUM('pending', 'assigned', 'in_progress', 'quality_check', 'approved', 'rejected', 'rework');--> statement-breakpoint
CREATE TYPE "public"."shipment_status" AS ENUM('preparing', 'picked_up', 'in_transit', 'customs_hold', 'customs_cleared', 'out_for_delivery', 'delivered');--> statement-breakpoint
CREATE TYPE "public"."actor" AS ENUM('human', 'agent');--> statement-breakpoint
CREATE TYPE "public"."agent_action_status" AS ENUM('pending', 'approved', 'executed', 'rejected', 'escalated');--> statement-breakpoint
CREATE TYPE "public"."payment_type" AS ENUM('deposit', 'progress', 'final', 'refund');--> statement-breakpoint
CREATE TYPE "public"."shipment_type" AS ENUM('international', 'domestic');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('email', 'sms', 'dashboard', 'push');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'processed', 'failed', 'refunded');--> statement-breakpoint
CREATE TABLE "agent_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_type" varchar(50) NOT NULL,
	"action_type" varchar(100) NOT NULL,
	"input" jsonb,
	"output" jsonb,
	"status" "agent_action_status" DEFAULT 'pending' NOT NULL,
	"escalation_reason" text,
	"human_response" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artisans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"workshop_name" varchar(255),
	"location" varchar(255),
	"specialties" jsonb,
	"capacity_status" varchar(50) DEFAULT 'available',
	"quality_rating" numeric(3, 2),
	"contact_info" jsonb,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(50),
	"address" jsonb,
	"preferences" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" integer NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"actor" "actor" NOT NULL,
	"actor_id" varchar(100),
	"data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipient_type" varchar(50) NOT NULL,
	"recipient_id" integer NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"subject" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_type" varchar(100) NOT NULL,
	"description" text,
	"specifications" jsonb,
	"material" varchar(100),
	"dimensions" jsonb,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"status" "production_status" DEFAULT 'pending' NOT NULL,
	"artisan_id" integer
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"status" "order_status" DEFAULT 'draft' NOT NULL,
	"order_type" varchar(100),
	"total_amount" numeric(10, 2),
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"deposit_amount" numeric(10, 2),
	"deposit_paid_at" timestamp,
	"estimated_delivery" timestamp,
	"showroom_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"type" "payment_type" NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"payment_method" varchar(100),
	"processed_at" timestamp,
	"external_ref" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "production_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_item_id" integer NOT NULL,
	"artisan_id" integer NOT NULL,
	"status" "production_status" DEFAULT 'pending' NOT NULL,
	"started_at" timestamp,
	"estimated_completion" timestamp,
	"completed_at" timestamp,
	"quality_check_status" varchar(50),
	"quality_notes" text,
	"photos" jsonb
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"type" "shipment_type" NOT NULL,
	"carrier" varchar(255),
	"tracking_number" varchar(255),
	"origin" varchar(255),
	"destination" varchar(255),
	"status" "shipment_status" DEFAULT 'preparing' NOT NULL,
	"customs_declaration_id" varchar(255),
	"estimated_arrival" timestamp,
	"actual_arrival" timestamp
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_artisan_id_artisans_id_fk" FOREIGN KEY ("artisan_id") REFERENCES "public"."artisans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_tasks" ADD CONSTRAINT "production_tasks_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_tasks" ADD CONSTRAINT "production_tasks_artisan_id_artisans_id_fk" FOREIGN KEY ("artisan_id") REFERENCES "public"."artisans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;