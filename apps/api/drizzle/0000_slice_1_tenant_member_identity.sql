CREATE TYPE "public"."member_identifier_type" AS ENUM('NATIONAL_ID', 'ALIEN_ID', 'PASSPORT', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."tenant_status" AS ENUM('ACTIVE', 'SUSPENDED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'LIBRARIAN', 'TEACHER', 'MEMBER', 'PARENT');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('ACTIVE', 'SUSPENDED');--> statement-breakpoint
CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"year" varchar(30),
	"teacher_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"admission_number" varchar(100),
	"identifier_type" "member_identifier_type",
	"identifier_value_encrypted" text,
	"identifier_lookup_hash" varchar(64),
	"group_id" uuid,
	"member_type_id" uuid NOT NULL,
	"photo_url" text,
	"membership_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_profiles_identifier_fields_check" CHECK ((
        (
          "member_profiles"."identifier_type" IS NULL
          AND "member_profiles"."identifier_value_encrypted" IS NULL
          AND "member_profiles"."identifier_lookup_hash" IS NULL
        )
        OR
        (
          "member_profiles"."identifier_type" IS NOT NULL
          AND "member_profiles"."identifier_value_encrypted" IS NOT NULL
          AND "member_profiles"."identifier_lookup_hash" IS NOT NULL
        )
      ))
);
--> statement-breakpoint
CREATE TABLE "member_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"library_code" varchar(40) NOT NULL,
	"status" "tenant_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_library_code_unique" UNIQUE("library_code"),
	CONSTRAINT "tenants_library_code_format_check" CHECK ("tenants"."library_code" ~ '^[A-Z0-9-]+$')
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"full_name" varchar(200) NOT NULL,
	"email" varchar(254),
	"phone" varchar(20),
	"password_hash" text NOT NULL,
	"role" "user_role" NOT NULL,
	"status" "user_status" DEFAULT 'ACTIVE' NOT NULL,
	"email_verified_at" timestamp with time zone,
	"phone_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_or_phone_required" CHECK ("users"."email" IS NOT NULL OR "users"."phone" IS NOT NULL)
);

CREATE UNIQUE INDEX "groups_tenant_id_id_unique" ON "groups" USING btree ("tenant_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "groups_tenant_name_unique" ON "groups" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE INDEX "groups_tenant_teacher_idx" ON "groups" USING btree ("tenant_id","teacher_id");--> statement-breakpoint
CREATE UNIQUE INDEX "member_profiles_tenant_user_unique" ON "member_profiles" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "member_profiles_tenant_id_id_unique" ON "member_profiles" USING btree ("tenant_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "member_profiles_tenant_admission_unique" ON "member_profiles" USING btree ("tenant_id","admission_number") WHERE "member_profiles"."admission_number" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "member_profiles_tenant_group_idx" ON "member_profiles" USING btree ("tenant_id","group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "member_profiles_tenant_identifier_hash_unique" ON "member_profiles" USING btree ("tenant_id","identifier_lookup_hash") WHERE "member_profiles"."identifier_lookup_hash" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "member_types_tenant_id_id_unique" ON "member_types" USING btree ("tenant_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "member_types_tenant_name_unique" ON "member_types" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "users_tenant_id_id_unique" ON "users" USING btree ("tenant_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_tenant_email_unique" ON "users" USING btree ("tenant_id",lower("email")) WHERE "users"."email" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "users_tenant_phone_unique" ON "users" USING btree ("tenant_id","phone") WHERE "users"."phone" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "users_tenant_role_idx" ON "users" USING btree ("tenant_id","role");

--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_tenant_teacher_fk" FOREIGN KEY ("tenant_id","teacher_id") REFERENCES "public"."users"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_profiles" ADD CONSTRAINT "member_profiles_tenant_user_fk" FOREIGN KEY ("tenant_id","user_id") REFERENCES "public"."users"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_profiles" ADD CONSTRAINT "member_profiles_tenant_group_fk" FOREIGN KEY ("tenant_id","group_id") REFERENCES "public"."groups"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_profiles" ADD CONSTRAINT "member_profiles_tenant_member_type_fk" FOREIGN KEY ("tenant_id","member_type_id") REFERENCES "public"."member_types"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_types" ADD CONSTRAINT "member_types_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
