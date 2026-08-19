CREATE TABLE "activity_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"device_id" varchar,
	"deployment_id" varchar,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "alert_rules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"metric" text NOT NULL,
	"condition" text NOT NULL,
	"threshold" real NOT NULL,
	"severity" text NOT NULL,
	"is_enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"severity" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"source" text,
	"value" real,
	"threshold" real,
	"is_read" boolean DEFAULT false,
	"is_resolved" boolean DEFAULT false,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"action" text NOT NULL,
	"resource" text,
	"resource_id" text,
	"details" text,
	"ip_address" text,
	"user_agent" text,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bulk_operations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_type" text NOT NULL,
	"device_ids" text[] NOT NULL,
	"total_count" integer NOT NULL,
	"success_count" integer DEFAULT 0,
	"failure_count" integer DEFAULT 0,
	"status" text DEFAULT 'pending' NOT NULL,
	"errors" jsonb,
	"parameters" jsonb,
	"started_by" varchar,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "certificates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"domain" text,
	"issuer" text NOT NULL,
	"subject" text NOT NULL,
	"serial_number" text,
	"fingerprint" text,
	"key_algorithm" text,
	"key_size" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"issued_at" timestamp NOT NULL,
	"expires_at" timestamp NOT NULL,
	"last_checked" timestamp,
	"auto_renew" boolean DEFAULT false,
	"used_by" text[] DEFAULT '{}'
);
--> statement-breakpoint
CREATE TABLE "compliance_policies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"framework" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"requirements" text[] DEFAULT '{}',
	"is_active" boolean DEFAULT true,
	"compliance_level" text NOT NULL,
	"last_assessed" timestamp,
	"next_review" timestamp,
	"owner" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "compliance_reports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"framework" text NOT NULL,
	"report_type" text NOT NULL,
	"period" text NOT NULL,
	"overall_score" real,
	"total_controls" integer DEFAULT 0,
	"compliant_controls" integer DEFAULT 0,
	"partial_controls" integer DEFAULT 0,
	"non_compliant_controls" integer DEFAULT 0,
	"status" text DEFAULT 'draft' NOT NULL,
	"generated_by" varchar,
	"approved_by" varchar,
	"report_path" text,
	"created_at" timestamp DEFAULT now(),
	"approved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "custom_scripts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"script_content" text NOT NULL,
	"script_type" text NOT NULL,
	"execution_phase" text NOT NULL,
	"supported_os" text[] NOT NULL,
	"run_as_admin" boolean DEFAULT true,
	"timeout_minutes" integer DEFAULT 10,
	"retry_count" integer DEFAULT 1,
	"parameters" text,
	"environment_vars" text,
	"is_active" boolean DEFAULT true,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "deployment_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"is_default" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"estimated_duration" integer,
	"compatible_os_types" text[] DEFAULT '{}',
	"tags" text[] DEFAULT '{}',
	"image_id" varchar,
	"post_deployment_profile_id" varchar,
	"imaging_engine" text DEFAULT 'clonezilla',
	"fog_image_id" integer,
	"fog_task_type" integer DEFAULT 1,
	"fog_shutdown" boolean DEFAULT true,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "deployments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" varchar NOT NULL,
	"image_id" varchar NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"progress" real DEFAULT 0,
	"started_at" timestamp,
	"completed_at" timestamp,
	"error_message" text,
	"boot_mode" text DEFAULT 'bios',
	"schedule_type" text DEFAULT 'instant' NOT NULL,
	"scheduled_for" timestamp,
	"recurring_pattern" text,
	"last_run_at" timestamp,
	"next_run_at" timestamp,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "device_connections" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_device_id" varchar,
	"target_device_id" varchar,
	"connection_type" text DEFAULT 'ethernet' NOT NULL,
	"bandwidth" integer,
	"latency" real,
	"packet_loss" real,
	"is_active" boolean DEFAULT true,
	"last_seen" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "device_groups" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text DEFAULT '#3b82f6',
	"created_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"mac_address" text NOT NULL,
	"ip_address" text,
	"status" text DEFAULT 'offline' NOT NULL,
	"last_seen" timestamp,
	"manufacturer" text,
	"model" text,
	"tags" text[] DEFAULT '{}',
	"group_id" varchar,
	CONSTRAINT "devices_mac_address_unique" UNIQUE("mac_address")
);
--> statement-breakpoint
CREATE TABLE "domain_join_configs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"domain_type" text NOT NULL,
	"domain_name" text NOT NULL,
	"domain_controller" text,
	"organizational_unit" text,
	"username_encrypted" text NOT NULL,
	"password_encrypted" text NOT NULL,
	"supported_os" text[] NOT NULL,
	"windows_config" text,
	"linux_config" text,
	"is_active" boolean DEFAULT true,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fog_deployment_mappings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bootah_deployment_id" varchar NOT NULL,
	"fog_task_id" integer NOT NULL,
	"post_deployment_profile_id" varchar,
	"post_deployment_status" text DEFAULT 'pending',
	"post_deployment_error" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "hostname_patterns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"pattern" text NOT NULL,
	"starting_counter" integer DEFAULT 1,
	"current_counter" integer DEFAULT 1,
	"prefix" text,
	"suffix" text,
	"is_active" boolean DEFAULT true,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "images" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"filename" text NOT NULL,
	"size" bigint NOT NULL,
	"checksum" text,
	"os_type" text NOT NULL,
	"version" text,
	"description" text,
	"category" text DEFAULT 'General',
	"tags" text[] DEFAULT '{}',
	"compression_type" text DEFAULT 'none',
	"original_size" bigint,
	"architecture" text DEFAULT 'x64',
	"is_validated" boolean DEFAULT false,
	"validation_date" timestamp,
	"download_count" integer DEFAULT 0,
	"cloud_url" text,
	"uploaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "login_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"username" text,
	"success" boolean NOT NULL,
	"failure_reason" text,
	"ip_address" text,
	"user_agent" text,
	"location" text,
	"method" text DEFAULT 'local',
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "multicast_participants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"device_id" varchar,
	"mac_address" varchar(17),
	"ip_address" varchar(45),
	"status" text DEFAULT 'waiting' NOT NULL,
	"progress" real DEFAULT 0,
	"bytes_received" bigint DEFAULT 0,
	"error_message" text,
	"joined_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "multicast_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"image_id" varchar NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"multicast_address" text NOT NULL,
	"port" integer DEFAULT 9000 NOT NULL,
	"max_clients" integer,
	"client_count" integer DEFAULT 0,
	"total_bytes" bigint DEFAULT 0,
	"bytes_sent" bigint DEFAULT 0,
	"throughput" real DEFAULT 0,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "network_segments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"subnet" text NOT NULL,
	"vlan_id" integer,
	"description" text,
	"color" text DEFAULT '#3b82f6',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "password_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"token" text NOT NULL,
	"one_time_code" text,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"is_used" boolean DEFAULT false,
	"created_by" varchar,
	"ip_address" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"resource" text NOT NULL,
	"action" text NOT NULL,
	"description" text,
	CONSTRAINT "permissions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "post_deployment_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"execution_order" text DEFAULT 'sequential',
	"halt_on_failure" boolean DEFAULT false,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "post_deployment_tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"task_type" text NOT NULL,
	"profile_id" varchar NOT NULL,
	"step_order" integer NOT NULL,
	"config" text NOT NULL,
	"condition" text,
	"is_required" boolean DEFAULT true,
	"timeout_minutes" integer DEFAULT 30,
	"retry_count" integer DEFAULT 2,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "product_keys" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"key_type" text NOT NULL,
	"product_name" text NOT NULL,
	"key_encrypted" text NOT NULL,
	"max_activations" integer,
	"current_activations" integer DEFAULT 0,
	"os_type" text NOT NULL,
	"version" text,
	"architecture" text,
	"assignment_rules" text,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true,
	"key_source" text DEFAULT 'manual',
	"captured_from_device_id" varchar,
	"captured_from_deployment_id" varchar,
	"captured_at" timestamp,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "profile_deployment_bindings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" varchar NOT NULL,
	"deployment_id" varchar NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "profile_deployment_unique" UNIQUE("profile_id","deployment_id")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" varchar NOT NULL,
	"permission_id" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_system_role" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "security_assessments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"scope" text NOT NULL,
	"findings" integer DEFAULT 0,
	"critical_issues" integer DEFAULT 0,
	"high_issues" integer DEFAULT 0,
	"medium_issues" integer DEFAULT 0,
	"low_issues" integer DEFAULT 0,
	"overall_score" real,
	"assessor" varchar,
	"scheduled_at" timestamp,
	"started_at" timestamp,
	"completed_at" timestamp,
	"report_path" text
);
--> statement-breakpoint
CREATE TABLE "security_configurations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" text NOT NULL,
	"setting" text NOT NULL,
	"value" text NOT NULL,
	"default_value" text,
	"description" text,
	"severity" text NOT NULL,
	"is_compliant" boolean DEFAULT true,
	"recommended_value" text,
	"last_updated" timestamp DEFAULT now(),
	"updated_by" varchar
);
--> statement-breakpoint
CREATE TABLE "security_incidents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"severity" text NOT NULL,
	"category" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"affected_systems" text[] DEFAULT '{}',
	"source_ip" text,
	"detected_by" text,
	"assigned_to" varchar,
	"reported_by" varchar,
	"detected_at" timestamp DEFAULT now(),
	"resolved_at" timestamp,
	"resolution" text,
	"mitigation_steps" text[] DEFAULT '{}'
);
--> statement-breakpoint
CREATE TABLE "server_status" (
	"id" varchar PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"server_name" text DEFAULT 'Bootah64x-Server',
	"pxe_server_status" boolean DEFAULT true,
	"tftp_server_status" boolean DEFAULT true,
	"http_server_status" boolean DEFAULT true,
	"dhcp_proxy_status" boolean DEFAULT true,
	"server_ip" text DEFAULT '192.168.1.100',
	"dhcp_range_start" text DEFAULT '192.168.1.100',
	"dhcp_range_end" text DEFAULT '192.168.1.200',
	"subnet_mask" text DEFAULT '255.255.255.0',
	"default_gateway" text DEFAULT '192.168.1.1',
	"boot_mode" text DEFAULT 'bios',
	"boot_timeout" integer DEFAULT 30,
	"tls_encryption" boolean DEFAULT true,
	"mac_filtering" boolean DEFAULT false,
	"pxe_port" integer DEFAULT 67,
	"tftp_port" integer DEFAULT 69,
	"http_port" integer DEFAULT 80,
	"dhcp_port" integer DEFAULT 67,
	"uptime" integer DEFAULT 0,
	"network_traffic" real DEFAULT 0,
	"last_updated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "snapin_packages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"version" text,
	"package_type" text NOT NULL,
	"supported_os" text[] NOT NULL,
	"file_path" text NOT NULL,
	"file_size" bigint,
	"checksum" text,
	"install_command" text NOT NULL,
	"uninstall_command" text,
	"install_args" text,
	"requires_reboot" boolean DEFAULT false,
	"run_as_admin" boolean DEFAULT true,
	"timeout_minutes" integer DEFAULT 30,
	"retry_count" integer DEFAULT 2,
	"retry_delay_seconds" integer DEFAULT 60,
	"category" text DEFAULT 'Application',
	"tags" text[] DEFAULT '{}',
	"is_active" boolean DEFAULT true,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "system_metrics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timestamp" timestamp DEFAULT now(),
	"cpu_usage" real NOT NULL,
	"memory_usage" real NOT NULL,
	"memory_total" bigint NOT NULL,
	"memory_used" bigint NOT NULL,
	"disk_usage" real NOT NULL,
	"disk_total" bigint NOT NULL,
	"disk_used" bigint NOT NULL,
	"network_throughput_in" real DEFAULT 0,
	"network_throughput_out" real DEFAULT 0,
	"active_connections" integer DEFAULT 0,
	"temperature" real
);
--> statement-breakpoint
CREATE TABLE "task_runs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deployment_id" varchar NOT NULL,
	"task_id" varchar NOT NULL,
	"task_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"progress" real DEFAULT 0,
	"attempt" integer DEFAULT 1,
	"max_attempts" integer DEFAULT 2,
	"started_at" timestamp,
	"completed_at" timestamp,
	"error_message" text,
	"execution_log" text,
	"exit_code" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "template_deployments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" varchar NOT NULL,
	"deployment_id" varchar NOT NULL,
	"variables" text,
	"current_step" integer DEFAULT 0,
	"started_by" varchar,
	"started_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "template_steps" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" varchar NOT NULL,
	"step_order" integer NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"configuration" text NOT NULL,
	"is_optional" boolean DEFAULT false,
	"timeout_minutes" integer DEFAULT 30,
	"retry_count" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "template_variables" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" varchar NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"default_value" text,
	"is_required" boolean DEFAULT true,
	"options" text[] DEFAULT '{}',
	"description" text
);
--> statement-breakpoint
CREATE TABLE "topology_snapshots" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"snapshot_data" jsonb NOT NULL,
	"device_count" integer DEFAULT 0,
	"connection_count" integer DEFAULT 0,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"role_id" varchar NOT NULL,
	"assigned_at" timestamp DEFAULT now(),
	"assigned_by" varchar
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"username" text,
	"full_name" text,
	"password_hash" text,
	"is_active" boolean DEFAULT true,
	"is_locked" boolean DEFAULT false,
	"account_status" text DEFAULT 'active',
	"failed_login_attempts" integer DEFAULT 0,
	"last_failed_login" timestamp,
	"locked_until" timestamp,
	"force_password_change" boolean DEFAULT false,
	"password_last_changed" timestamp,
	"password_expires_at" timestamp,
	"last_login" timestamp,
	"department" text,
	"job_title" text,
	"phone_number" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" varchar,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" varchar NOT NULL,
	"event" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"http_status" integer,
	"response_body" text,
	"attempts" integer DEFAULT 0,
	"next_retry_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webhook_subscriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"url" text NOT NULL,
	"secret" text,
	"events" text[] NOT NULL,
	"is_enabled" boolean DEFAULT true,
	"headers" jsonb,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_deployment_id_deployments_id_fk" FOREIGN KEY ("deployment_id") REFERENCES "public"."deployments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_operations" ADD CONSTRAINT "bulk_operations_started_by_users_id_fk" FOREIGN KEY ("started_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_policies" ADD CONSTRAINT "compliance_policies_owner_users_id_fk" FOREIGN KEY ("owner") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_reports" ADD CONSTRAINT "compliance_reports_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_reports" ADD CONSTRAINT "compliance_reports_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_scripts" ADD CONSTRAINT "custom_scripts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployment_templates" ADD CONSTRAINT "deployment_templates_image_id_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."images"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployment_templates" ADD CONSTRAINT "deployment_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_image_id_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."images"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_connections" ADD CONSTRAINT "device_connections_source_device_id_devices_id_fk" FOREIGN KEY ("source_device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_connections" ADD CONSTRAINT "device_connections_target_device_id_devices_id_fk" FOREIGN KEY ("target_device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_groups" ADD CONSTRAINT "device_groups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_group_id_device_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."device_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domain_join_configs" ADD CONSTRAINT "domain_join_configs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fog_deployment_mappings" ADD CONSTRAINT "fog_deployment_mappings_bootah_deployment_id_deployments_id_fk" FOREIGN KEY ("bootah_deployment_id") REFERENCES "public"."deployments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fog_deployment_mappings" ADD CONSTRAINT "fog_deployment_mappings_post_deployment_profile_id_post_deployment_profiles_id_fk" FOREIGN KEY ("post_deployment_profile_id") REFERENCES "public"."post_deployment_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostname_patterns" ADD CONSTRAINT "hostname_patterns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "login_history" ADD CONSTRAINT "login_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "multicast_participants" ADD CONSTRAINT "multicast_participants_session_id_multicast_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."multicast_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "multicast_participants" ADD CONSTRAINT "multicast_participants_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "multicast_sessions" ADD CONSTRAINT "multicast_sessions_image_id_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."images"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "multicast_sessions" ADD CONSTRAINT "multicast_sessions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_history" ADD CONSTRAINT "password_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_deployment_profiles" ADD CONSTRAINT "post_deployment_profiles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_deployment_tasks" ADD CONSTRAINT "post_deployment_tasks_profile_id_post_deployment_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."post_deployment_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_keys" ADD CONSTRAINT "product_keys_captured_from_device_id_devices_id_fk" FOREIGN KEY ("captured_from_device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_keys" ADD CONSTRAINT "product_keys_captured_from_deployment_id_deployments_id_fk" FOREIGN KEY ("captured_from_deployment_id") REFERENCES "public"."deployments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_keys" ADD CONSTRAINT "product_keys_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_deployment_bindings" ADD CONSTRAINT "profile_deployment_bindings_profile_id_post_deployment_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."post_deployment_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_deployment_bindings" ADD CONSTRAINT "profile_deployment_bindings_deployment_id_deployments_id_fk" FOREIGN KEY ("deployment_id") REFERENCES "public"."deployments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_assessments" ADD CONSTRAINT "security_assessments_assessor_users_id_fk" FOREIGN KEY ("assessor") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_configurations" ADD CONSTRAINT "security_configurations_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_incidents" ADD CONSTRAINT "security_incidents_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_incidents" ADD CONSTRAINT "security_incidents_reported_by_users_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapin_packages" ADD CONSTRAINT "snapin_packages_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_runs" ADD CONSTRAINT "task_runs_deployment_id_deployments_id_fk" FOREIGN KEY ("deployment_id") REFERENCES "public"."deployments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_runs" ADD CONSTRAINT "task_runs_task_id_post_deployment_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."post_deployment_tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_deployments" ADD CONSTRAINT "template_deployments_template_id_deployment_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."deployment_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_deployments" ADD CONSTRAINT "template_deployments_deployment_id_deployments_id_fk" FOREIGN KEY ("deployment_id") REFERENCES "public"."deployments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_deployments" ADD CONSTRAINT "template_deployments_started_by_users_id_fk" FOREIGN KEY ("started_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_steps" ADD CONSTRAINT "template_steps_template_id_deployment_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."deployment_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_variables" ADD CONSTRAINT "template_variables_template_id_deployment_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."deployment_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topology_snapshots" ADD CONSTRAINT "topology_snapshots_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_subscription_id_webhook_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."webhook_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_subscriptions" ADD CONSTRAINT "webhook_subscriptions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "device_connections_source_target_idx" ON "device_connections" USING btree ("source_device_id","target_device_id");--> statement-breakpoint
CREATE INDEX "domain_join_configs_domain_name_idx" ON "domain_join_configs" USING btree ("domain_name");--> statement-breakpoint
CREATE INDEX "fog_deployment_mappings_deployment_idx" ON "fog_deployment_mappings" USING btree ("bootah_deployment_id");--> statement-breakpoint
CREATE INDEX "fog_deployment_mappings_task_idx" ON "fog_deployment_mappings" USING btree ("fog_task_id");--> statement-breakpoint
CREATE INDEX "IDX_login_history_userId" ON "login_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "multicast_participants_session_device_idx" ON "multicast_participants" USING btree ("session_id","device_id");--> statement-breakpoint
CREATE INDEX "multicast_participants_session_mac_idx" ON "multicast_participants" USING btree ("session_id","mac_address");--> statement-breakpoint
CREATE INDEX "multicast_sessions_status_idx" ON "multicast_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_password_history_userId" ON "password_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_password_reset_userId" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "post_deployment_tasks_profile_step_idx" ON "post_deployment_tasks" USING btree ("profile_id","step_order");--> statement-breakpoint
CREATE INDEX "profile_deployment_bindings_deployment_idx" ON "profile_deployment_bindings" USING btree ("deployment_id");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "task_runs_deployment_task_idx" ON "task_runs" USING btree ("deployment_id","task_id");--> statement-breakpoint
CREATE INDEX "task_runs_status_idx" ON "task_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_subscription_idx" ON "webhook_deliveries" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_status_idx" ON "webhook_deliveries" USING btree ("status");