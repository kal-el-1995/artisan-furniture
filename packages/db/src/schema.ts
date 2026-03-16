import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

import {
  orderStatusEnum,
  productionStatusEnum,
  shipmentStatusEnum,
  actorEnum,
  agentActionStatusEnum,
  paymentTypeEnum,
  shipmentTypeEnum,
  notificationChannelEnum,
  paymentStatusEnum,
} from "./enums";

// ─── 1. Customers ────────────────────────────────────────────
// US-based customers who order furniture
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 50 }),
  address: jsonb("address"), // { street, city, state, zip }
  preferences: jsonb("preferences"), // { style, materials, budget_range }
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── 2. Orders ───────────────────────────────────────────────
// Furniture orders placed by customers
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id")
    .references(() => customers.id)
    .notNull(),
  status: orderStatusEnum("status").default("draft").notNull(),
  orderType: varchar("order_type", { length: 100 }), // e.g. "custom", "catalog"
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  depositAmount: decimal("deposit_amount", { precision: 10, scale: 2 }),
  depositPaidAt: timestamp("deposit_paid_at"),
  estimatedDelivery: timestamp("estimated_delivery"),
  showroomNotes: text("showroom_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── 3. Order Items ──────────────────────────────────────────
// Individual furniture pieces within an order
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .references(() => orders.id)
    .notNull(),
  productType: varchar("product_type", { length: 100 }).notNull(), // e.g. "dining_table"
  description: text("description"),
  specifications: jsonb("specifications"), // custom specs
  material: varchar("material", { length: 100 }), // e.g. "teak", "rosewood"
  dimensions: jsonb("dimensions"), // { height, width, depth, unit }
  quantity: integer("quantity").default(1).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  status: productionStatusEnum("status").default("pending").notNull(),
  artisanId: integer("artisan_id").references(() => artisans.id),
});

// ─── 4. Artisans ─────────────────────────────────────────────
// Indian craftspeople who make the furniture
export const artisans = pgTable("artisans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  workshopName: varchar("workshop_name", { length: 255 }),
  location: varchar("location", { length: 255 }), // city/region in India
  specialties: jsonb("specialties"), // ["wood", "upholstery", "metal"]
  capacityStatus: varchar("capacity_status", { length: 50 }).default("available"),
  qualityRating: decimal("quality_rating", { precision: 3, scale: 2 }), // 0.00–5.00
  contactInfo: jsonb("contact_info"), // { phone, email, whatsapp }
  active: boolean("active").default(true).notNull(),
});

// ─── 5. Production Tasks ─────────────────────────────────────
// Individual manufacturing work units assigned to artisans
export const productionTasks = pgTable("production_tasks", {
  id: serial("id").primaryKey(),
  orderItemId: integer("order_item_id")
    .references(() => orderItems.id)
    .notNull(),
  artisanId: integer("artisan_id")
    .references(() => artisans.id)
    .notNull(),
  status: productionStatusEnum("status").default("pending").notNull(),
  startedAt: timestamp("started_at"),
  estimatedCompletion: timestamp("estimated_completion"),
  completedAt: timestamp("completed_at"),
  qualityCheckStatus: varchar("quality_check_status", { length: 50 }),
  qualityNotes: text("quality_notes"),
  photos: jsonb("photos"), // array of photo URLs/paths
});

// ─── 6. Shipments ────────────────────────────────────────────
// International and domestic shipping logistics
export const shipments = pgTable("shipments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .references(() => orders.id)
    .notNull(),
  type: shipmentTypeEnum("type").notNull(),
  carrier: varchar("carrier", { length: 255 }),
  trackingNumber: varchar("tracking_number", { length: 255 }),
  origin: varchar("origin", { length: 255 }), // e.g. "Mumbai, India"
  destination: varchar("destination", { length: 255 }), // e.g. "New York, NY"
  status: shipmentStatusEnum("status").default("preparing").notNull(),
  customsDeclarationId: varchar("customs_declaration_id", { length: 255 }),
  estimatedArrival: timestamp("estimated_arrival"),
  actualArrival: timestamp("actual_arrival"),
});

// ─── 7. Payments ─────────────────────────────────────────────
// Financial transactions for orders
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .references(() => orders.id)
    .notNull(),
  type: paymentTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  status: paymentStatusEnum("status").default("pending").notNull(),
  paymentMethod: varchar("payment_method", { length: 100 }),
  processedAt: timestamp("processed_at"),
  externalRef: varchar("external_ref", { length: 255 }),
});

// ─── 8. Events ───────────────────────────────────────────────
// Audit trail — every significant thing that happens is logged here
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  entityType: varchar("entity_type", { length: 50 }).notNull(), // "order", "production", etc.
  entityId: integer("entity_id").notNull(),
  eventType: varchar("event_type", { length: 100 }).notNull(), // "created", "status_changed"
  actor: actorEnum("actor").notNull(),
  actorId: varchar("actor_id", { length: 100 }), // user ID or agent name
  data: jsonb("data"), // full event payload
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── 9. Agent Actions ────────────────────────────────────────
// Log of everything AI agents do — for transparency and human oversight
export const agentActions = pgTable("agent_actions", {
  id: serial("id").primaryKey(),
  agentType: varchar("agent_type", { length: 50 }).notNull(), // "order", "production", etc.
  actionType: varchar("action_type", { length: 100 }).notNull(), // "create_order", "assign_artisan"
  input: jsonb("input"), // what the agent received
  output: jsonb("output"), // what the agent decided/produced
  status: agentActionStatusEnum("status").default("pending").notNull(),
  escalationReason: text("escalation_reason"),
  humanResponse: text("human_response"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── 10. Notifications ──────────────────────────────────────
// Messages sent to humans (customers, admins, showroom staff)
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  recipientType: varchar("recipient_type", { length: 50 }).notNull(), // "customer", "admin"
  recipientId: integer("recipient_id").notNull(),
  channel: notificationChannelEnum("channel").notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  body: text("body").notNull(),
  read: boolean("read").default(false).notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});
