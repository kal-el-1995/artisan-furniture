import { pgEnum } from "drizzle-orm/pg-core";

// Order lifecycle: draft → confirmed → in_production → quality_check →
// ready_to_ship → in_transit → customs → delivered → completed
export const orderStatusEnum = pgEnum("order_status", [
  "draft",
  "confirmed",
  "in_production",
  "quality_check",
  "ready_to_ship",
  "in_transit",
  "customs",
  "delivered",
  "completed",
]);

// Production task lifecycle: pending → assigned → in_progress →
// quality_check → approved / rejected / rework
export const productionStatusEnum = pgEnum("production_status", [
  "pending",
  "assigned",
  "in_progress",
  "quality_check",
  "approved",
  "rejected",
  "rework",
]);

// Shipment tracking stages
export const shipmentStatusEnum = pgEnum("shipment_status", [
  "preparing",
  "picked_up",
  "in_transit",
  "customs_hold",
  "customs_cleared",
  "out_for_delivery",
  "delivered",
]);

// Who triggered an event — a human user or an AI agent
export const actorEnum = pgEnum("actor", ["human", "agent"]);

// AI agent action approval workflow
export const agentActionStatusEnum = pgEnum("agent_action_status", [
  "pending",
  "approved",
  "executed",
  "rejected",
  "escalated",
]);

// Payment types
export const paymentTypeEnum = pgEnum("payment_type", [
  "deposit",
  "progress",
  "final",
  "refund",
]);

// Shipment scope
export const shipmentTypeEnum = pgEnum("shipment_type", [
  "international",
  "domestic",
]);

// How notifications are delivered
export const notificationChannelEnum = pgEnum("notification_channel", [
  "email",
  "sms",
  "dashboard",
  "push",
]);

// Payment processing status
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "processed",
  "failed",
  "refunded",
]);
