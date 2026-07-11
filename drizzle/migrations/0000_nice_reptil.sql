CREATE TABLE "channel_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"supplier_product_id" uuid NOT NULL,
	"channel" varchar(50) NOT NULL,
	"channel_offer_id" varchar(200),
	"channel_condition" varchar(50) DEFAULT 'REFURBISHED' NOT NULL,
	"bol_grade" varchar(1) NOT NULL,
	"is_margin_product" boolean DEFAULT true NOT NULL,
	"sell_price_cents" integer,
	"price_override" boolean DEFAULT false NOT NULL,
	"min_price_cents" integer,
	"stock_listed" integer,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"buy_box_position" varchar(20) DEFAULT 'UNKNOWN' NOT NULL,
	"competitor_price_cents" integer,
	"last_price_update" timestamp with time zone,
	"last_stock_update" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ean_mapping" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"foxway_product_name" varchar(300) NOT NULL,
	"foxway_color" varchar(50) NOT NULL,
	"ean" varchar(13),
	"bol_title" varchar(300),
	"confidence" varchar(20) NOT NULL,
	"approved_by" varchar(100),
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel" varchar(50) NOT NULL,
	"channel_order_id" varchar(200) NOT NULL,
	"foxway_reference" varchar(200),
	"foxway_status" integer,
	"customer_name" varchar(200),
	"customer_email" varchar(200),
	"customer_phone" varchar(50),
	"shipping_address" jsonb NOT NULL,
	"items" jsonb NOT NULL,
	"tracking_code" varchar(200),
	"carrier" varchar(100),
	"total_sell_cents" integer NOT NULL,
	"total_cost_cents" integer NOT NULL,
	"profit_cents" integer NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_channel_order_id_unique" UNIQUE("channel_order_id")
);
--> statement-breakpoint
CREATE TABLE "pricing_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel" varchar(50) NOT NULL,
	"supplier_grade" varchar(20) NOT NULL,
	"margin_percent" numeric(5, 4) NOT NULL,
	"round_to_nearest" integer DEFAULT 5 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ean" varchar(13) NOT NULL,
	"brand" varchar(100),
	"model_family" varchar(200),
	"storage" varchar(20),
	"color" varchar(50),
	"category" varchar(50),
	"image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_ean_unique" UNIQUE("ean")
);
--> statement-breakpoint
CREATE TABLE "supplier_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid,
	"supplier" varchar(50) NOT NULL,
	"supplier_sku" varchar(100) NOT NULL,
	"product_name" varchar(300) NOT NULL,
	"color" varchar(50) NOT NULL,
	"grade_raw" varchar(20) NOT NULL,
	"cost_price_cents" integer NOT NULL,
	"stock_qty" integer DEFAULT 0 NOT NULL,
	"additional_info" varchar(200),
	"vat_type" varchar(20),
	"last_synced_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sync_type" varchar(50) NOT NULL,
	"channel" varchar(50),
	"supplier" varchar(50),
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"offers_created" integer DEFAULT 0 NOT NULL,
	"offers_updated" integer DEFAULT 0 NOT NULL,
	"offers_paused" integer DEFAULT 0 NOT NULL,
	"orders_processed" integer DEFAULT 0 NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" varchar(20) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "channel_offers" ADD CONSTRAINT "channel_offers_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_offers" ADD CONSTRAINT "channel_offers_supplier_product_id_supplier_products_id_fk" FOREIGN KEY ("supplier_product_id") REFERENCES "public"."supplier_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ean_mapping_product_color_unique" ON "ean_mapping" USING btree ("foxway_product_name","foxway_color");--> statement-breakpoint
CREATE UNIQUE INDEX "pricing_rule_unique" ON "pricing_rules" USING btree ("channel","supplier_grade");--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_sku_unique" ON "supplier_products" USING btree ("supplier","supplier_sku");--> statement-breakpoint
INSERT INTO "pricing_rules" ("channel", "supplier_grade", "margin_percent", "round_to_nearest") VALUES
  ('bol_nl', 'Grade B', 0.2500, 5),
  ('bol_nl', 'Grade C+', 0.2200, 5),
  ('bol_nl', 'Grade C', 0.2000, 5)
ON CONFLICT ("channel", "supplier_grade") DO NOTHING;
