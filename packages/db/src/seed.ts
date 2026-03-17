import dotenv from "dotenv";
import { resolve } from "path";
dotenv.config({ path: resolve(import.meta.dirname, "../../../.env") });
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  customers,
  orders,
  orderItems,
  artisans,
  productionTasks,
  shipments,
  payments,
  events,
  agentActions,
  notifications,
} from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set.");
}

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

async function seed() {
  console.log("Seeding database...\n");

  // ─── Clear existing data AND reset ID counters ───
  // TRUNCATE removes all rows and RESTART IDENTITY resets the
  // auto-increment counters back to 1, so IDs are predictable.
  // CASCADE handles foreign key dependencies automatically.
  console.log("Clearing existing data...");
  await client`TRUNCATE customers, orders, order_items, artisans, production_tasks, shipments, payments, events, agent_actions, notifications RESTART IDENTITY CASCADE`;

  // ─── 1. Customers ───
  console.log("Creating customers...");
  const [sarah, michael, priya] = await db
    .insert(customers)
    .values([
      {
        name: "Sarah Chen",
        email: "sarah.chen@example.com",
        phone: "+1-212-555-0101",
        address: {
          street: "245 Park Avenue, Apt 12B",
          city: "New York",
          state: "NY",
          zip: "10167",
        },
        preferences: {
          style: "modern minimalist",
          materials: ["teak", "walnut"],
          budget_range: "premium",
        },
      },
      {
        name: "Michael Torres",
        email: "michael.torres@example.com",
        phone: "+1-310-555-0202",
        address: {
          street: "1820 Sunset Blvd",
          city: "Los Angeles",
          state: "CA",
          zip: "90026",
        },
        preferences: {
          style: "rustic traditional",
          materials: ["reclaimed wood", "iron"],
          budget_range: "mid-range",
        },
      },
      {
        name: "Priya Patel",
        email: "priya.patel@example.com",
        phone: "+1-512-555-0303",
        address: {
          street: "4502 Congress Ave",
          city: "Austin",
          state: "TX",
          zip: "78745",
        },
        preferences: {
          style: "contemporary Indian",
          materials: ["rosewood", "brass"],
          budget_range: "luxury",
        },
      },
    ])
    .returning();

  // ─── 2. Artisans ───
  console.log("Creating artisans...");
  const [rajesh, amma, vikram, lakshmi, arjun] = await db
    .insert(artisans)
    .values([
      {
        name: "Rajesh Kumar",
        workshopName: "Kumar Fine Woodworks",
        location: "Jodhpur, Rajasthan",
        specialties: ["wood", "carving", "dining tables", "cabinets"],
        capacityStatus: "available",
        qualityRating: "4.80",
        contactInfo: { phone: "+91-98765-43210", whatsapp: "+91-98765-43210" },
        active: true,
      },
      {
        name: "Amma Devi",
        workshopName: "Devi Upholstery Arts",
        location: "Jaipur, Rajasthan",
        specialties: ["upholstery", "sofas", "chairs", "cushions"],
        capacityStatus: "busy",
        qualityRating: "4.90",
        contactInfo: { phone: "+91-98765-43211", email: "amma@deviarts.in" },
        active: true,
      },
      {
        name: "Vikram Singh",
        workshopName: "Singh Metal Craft",
        location: "Moradabad, Uttar Pradesh",
        specialties: ["metal", "iron", "brass", "decorative hardware"],
        capacityStatus: "available",
        qualityRating: "4.50",
        contactInfo: { phone: "+91-98765-43212", whatsapp: "+91-98765-43212" },
        active: true,
      },
      {
        name: "Lakshmi Narayanan",
        workshopName: "Lakshmi Stone Studio",
        location: "Agra, Uttar Pradesh",
        specialties: ["stone", "marble", "inlay", "tabletops"],
        capacityStatus: "available",
        qualityRating: "4.70",
        contactInfo: { phone: "+91-98765-43213" },
        active: true,
      },
      {
        name: "Arjun Mehta",
        workshopName: "Mehta Mixed-Media Workshop",
        location: "Ahmedabad, Gujarat",
        specialties: ["mixed", "wood", "metal", "modern furniture"],
        capacityStatus: "available",
        qualityRating: "4.60",
        contactInfo: { phone: "+91-98765-43214", email: "arjun@mehtaworks.in" },
        active: true,
      },
    ])
    .returning();

  // ─── 3. Orders (8 orders across all lifecycle stages) ───
  console.log("Creating orders...");

  // Helper: date relative to now
  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  const daysFromNow = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

  const orderRows = await db
    .insert(orders)
    .values([
      // Order 1: Sarah — completed dining set
      {
        customerId: sarah.id,
        status: "completed" as const,
        orderType: "custom",
        totalAmount: "8500.00",
        depositAmount: "2550.00",
        depositPaidAt: daysAgo(90),
        estimatedDelivery: daysAgo(10),
        showroomNotes: "Custom 8-seat teak dining set. Client wants minimalist design.",
        createdAt: daysAgo(95),
        updatedAt: daysAgo(5),
      },
      // Order 2: Michael — in production
      {
        customerId: michael.id,
        status: "in_production" as const,
        orderType: "custom",
        totalAmount: "4200.00",
        depositAmount: "1260.00",
        depositPaidAt: daysAgo(30),
        estimatedDelivery: daysFromNow(45),
        showroomNotes:
          "Rustic reclaimed wood bookshelf + coffee table combo. Iron accents.",
        createdAt: daysAgo(35),
        updatedAt: daysAgo(2),
      },
      // Order 3: Priya — in transit (international shipping)
      {
        customerId: priya.id,
        status: "in_transit" as const,
        orderType: "custom",
        totalAmount: "12000.00",
        depositAmount: "3600.00",
        depositPaidAt: daysAgo(60),
        estimatedDelivery: daysFromNow(14),
        showroomNotes:
          "Luxury rosewood bedroom suite — bed frame, two nightstands, dresser. Brass inlay.",
        createdAt: daysAgo(65),
        updatedAt: daysAgo(1),
      },
      // Order 4: Sarah — confirmed, waiting to start production
      {
        customerId: sarah.id,
        status: "confirmed" as const,
        orderType: "catalog",
        totalAmount: "3200.00",
        depositAmount: "960.00",
        depositPaidAt: daysAgo(5),
        estimatedDelivery: daysFromNow(60),
        showroomNotes: "Walnut writing desk from catalog, no customizations.",
        createdAt: daysAgo(7),
        updatedAt: daysAgo(5),
      },
      // Order 5: Michael — draft (just started, not yet confirmed)
      {
        customerId: michael.id,
        status: "draft" as const,
        orderType: "custom",
        totalAmount: "6800.00",
        showroomNotes:
          "Exploring options for a 6-seat dining table. Wants reclaimed wood, iron legs.",
        createdAt: daysAgo(2),
        updatedAt: daysAgo(2),
      },
      // Order 6: Priya — quality check
      {
        customerId: priya.id,
        status: "quality_check" as const,
        orderType: "custom",
        totalAmount: "5500.00",
        depositAmount: "1650.00",
        depositPaidAt: daysAgo(45),
        estimatedDelivery: daysFromNow(30),
        showroomNotes: "Hand-carved marble-top console table with brass legs.",
        createdAt: daysAgo(50),
        updatedAt: daysAgo(1),
      },
      // Order 7: Sarah — ready to ship
      {
        customerId: sarah.id,
        status: "ready_to_ship" as const,
        orderType: "custom",
        totalAmount: "2800.00",
        depositAmount: "840.00",
        depositPaidAt: daysAgo(40),
        estimatedDelivery: daysFromNow(21),
        showroomNotes: "Set of 4 teak dining chairs with woven seats.",
        createdAt: daysAgo(42),
        updatedAt: daysAgo(1),
      },
      // Order 8: Michael — customs
      {
        customerId: michael.id,
        status: "customs" as const,
        orderType: "custom",
        totalAmount: "3900.00",
        depositAmount: "1170.00",
        depositPaidAt: daysAgo(55),
        estimatedDelivery: daysFromNow(7),
        showroomNotes: "Wrought iron and reclaimed wood entry console.",
        createdAt: daysAgo(58),
        updatedAt: daysAgo(1),
      },
    ])
    .returning();

  // ─── 4. Order Items ───
  console.log("Creating order items...");
  const itemRows = await db
    .insert(orderItems)
    .values([
      // Order 1 items (completed)
      {
        orderId: orderRows[0].id,
        productType: "dining_table",
        description: "8-seat teak dining table, minimalist design",
        specifications: { seats: 8, finish: "natural oil", edge: "live-edge" },
        material: "teak",
        dimensions: { length: 96, width: 42, height: 30, unit: "inches" },
        quantity: 1,
        unitPrice: "5500.00",
        status: "approved" as const,
        artisanId: rajesh.id,
      },
      {
        orderId: orderRows[0].id,
        productType: "dining_chair",
        description: "Matching teak dining chairs, set of 8",
        material: "teak",
        dimensions: { width: 20, depth: 22, height: 34, unit: "inches" },
        quantity: 8,
        unitPrice: "375.00",
        status: "approved" as const,
        artisanId: rajesh.id,
      },
      // Order 2 items (in production)
      {
        orderId: orderRows[1].id,
        productType: "bookshelf",
        description: "Reclaimed wood bookshelf with iron frame",
        material: "reclaimed wood",
        dimensions: { width: 48, depth: 14, height: 72, unit: "inches" },
        quantity: 1,
        unitPrice: "2800.00",
        status: "in_progress" as const,
        artisanId: arjun.id,
      },
      {
        orderId: orderRows[1].id,
        productType: "coffee_table",
        description: "Matching coffee table with iron hairpin legs",
        material: "reclaimed wood",
        dimensions: { length: 48, width: 24, height: 18, unit: "inches" },
        quantity: 1,
        unitPrice: "1400.00",
        status: "assigned" as const,
        artisanId: vikram.id,
      },
      // Order 3 items (in transit)
      {
        orderId: orderRows[2].id,
        productType: "bed_frame",
        description: "King rosewood bed frame with brass inlay headboard",
        material: "rosewood",
        dimensions: { width: 80, length: 84, height: 48, unit: "inches" },
        quantity: 1,
        unitPrice: "6000.00",
        status: "approved" as const,
        artisanId: rajesh.id,
      },
      {
        orderId: orderRows[2].id,
        productType: "nightstand",
        description: "Rosewood nightstand with brass drawer pulls",
        material: "rosewood",
        dimensions: { width: 24, depth: 18, height: 26, unit: "inches" },
        quantity: 2,
        unitPrice: "1200.00",
        status: "approved" as const,
        artisanId: rajesh.id,
      },
      {
        orderId: orderRows[2].id,
        productType: "dresser",
        description: "6-drawer rosewood dresser with brass inlay",
        material: "rosewood",
        dimensions: { width: 60, depth: 20, height: 34, unit: "inches" },
        quantity: 1,
        unitPrice: "3600.00",
        status: "approved" as const,
        artisanId: rajesh.id,
      },
      // Order 4 item (confirmed)
      {
        orderId: orderRows[3].id,
        productType: "writing_desk",
        description: "Walnut writing desk, catalog model WD-200",
        material: "walnut",
        dimensions: { width: 54, depth: 24, height: 30, unit: "inches" },
        quantity: 1,
        unitPrice: "3200.00",
        status: "pending" as const,
      },
      // Order 5 item (draft)
      {
        orderId: orderRows[4].id,
        productType: "dining_table",
        description: "6-seat reclaimed wood dining table, iron legs — still deciding",
        material: "reclaimed wood",
        quantity: 1,
        unitPrice: "6800.00",
        status: "pending" as const,
      },
      // Order 6 item (quality check)
      {
        orderId: orderRows[5].id,
        productType: "console_table",
        description: "Hand-carved marble-top console with brass legs",
        material: "marble",
        dimensions: { width: 48, depth: 16, height: 34, unit: "inches" },
        quantity: 1,
        unitPrice: "5500.00",
        status: "quality_check" as const,
        artisanId: lakshmi.id,
      },
      // Order 7 item (ready to ship)
      {
        orderId: orderRows[6].id,
        productType: "dining_chair",
        description: "Teak dining chairs with hand-woven rattan seats",
        material: "teak",
        dimensions: { width: 20, depth: 22, height: 34, unit: "inches" },
        quantity: 4,
        unitPrice: "700.00",
        status: "approved" as const,
        artisanId: amma.id,
      },
      // Order 8 item (customs)
      {
        orderId: orderRows[7].id,
        productType: "console_table",
        description: "Wrought iron and reclaimed wood entry console",
        material: "reclaimed wood",
        dimensions: { width: 42, depth: 14, height: 32, unit: "inches" },
        quantity: 1,
        unitPrice: "3900.00",
        status: "approved" as const,
        artisanId: vikram.id,
      },
    ])
    .returning();

  // ─── 5. Production Tasks ───
  console.log("Creating production tasks...");
  await db.insert(productionTasks).values([
    // Completed tasks (order 1)
    {
      orderItemId: itemRows[0].id,
      artisanId: rajesh.id,
      status: "approved" as const,
      startedAt: daysAgo(80),
      estimatedCompletion: daysAgo(20),
      completedAt: daysAgo(18),
      qualityCheckStatus: "passed",
      qualityNotes: "Excellent craftsmanship. Live edge is beautiful.",
    },
    {
      orderItemId: itemRows[1].id,
      artisanId: rajesh.id,
      status: "approved" as const,
      startedAt: daysAgo(75),
      estimatedCompletion: daysAgo(15),
      completedAt: daysAgo(14),
      qualityCheckStatus: "passed",
      qualityNotes: "All 8 chairs match perfectly.",
    },
    // In-progress tasks (order 2)
    {
      orderItemId: itemRows[2].id,
      artisanId: arjun.id,
      status: "in_progress" as const,
      startedAt: daysAgo(20),
      estimatedCompletion: daysFromNow(15),
    },
    {
      orderItemId: itemRows[3].id,
      artisanId: vikram.id,
      status: "assigned" as const,
      estimatedCompletion: daysFromNow(25),
    },
    // Completed tasks (order 3 — now shipping)
    {
      orderItemId: itemRows[4].id,
      artisanId: rajesh.id,
      status: "approved" as const,
      startedAt: daysAgo(55),
      estimatedCompletion: daysAgo(15),
      completedAt: daysAgo(12),
      qualityCheckStatus: "passed",
      qualityNotes: "Brass inlay work is stunning.",
    },
    // Quality check task (order 6)
    {
      orderItemId: itemRows[9].id,
      artisanId: lakshmi.id,
      status: "quality_check" as const,
      startedAt: daysAgo(35),
      estimatedCompletion: daysAgo(3),
      completedAt: daysAgo(2),
      qualityCheckStatus: "pending_review",
      qualityNotes: "Awaiting final marble polish inspection.",
    },
    // Completed task (order 7 — ready to ship)
    {
      orderItemId: itemRows[10].id,
      artisanId: amma.id,
      status: "approved" as const,
      startedAt: daysAgo(30),
      estimatedCompletion: daysAgo(8),
      completedAt: daysAgo(6),
      qualityCheckStatus: "passed",
      qualityNotes: "Rattan weaving is perfect. All 4 chairs consistent.",
    },
    // Completed task (order 8 — in customs)
    {
      orderItemId: itemRows[11].id,
      artisanId: vikram.id,
      status: "approved" as const,
      startedAt: daysAgo(45),
      estimatedCompletion: daysAgo(20),
      completedAt: daysAgo(18),
      qualityCheckStatus: "passed",
      qualityNotes: "Iron work solid. Wood finish excellent.",
    },
  ]);

  // ─── 6. Shipments ───
  console.log("Creating shipments...");
  await db.insert(shipments).values([
    // Order 1 — delivered
    {
      orderId: orderRows[0].id,
      type: "international" as const,
      carrier: "Maersk Line",
      trackingNumber: "MAEU-7294613",
      origin: "Mumbai, India",
      destination: "New York, NY",
      status: "delivered" as const,
      customsDeclarationId: "US-IMP-2026-00142",
      estimatedArrival: daysAgo(12),
      actualArrival: daysAgo(10),
    },
    // Order 3 — in transit
    {
      orderId: orderRows[2].id,
      type: "international" as const,
      carrier: "Hapag-Lloyd",
      trackingNumber: "HLCU-3847291",
      origin: "Mumbai, India",
      destination: "Houston, TX",
      status: "in_transit" as const,
      customsDeclarationId: "US-IMP-2026-00198",
      estimatedArrival: daysFromNow(14),
    },
    // Order 8 — customs hold
    {
      orderId: orderRows[7].id,
      type: "international" as const,
      carrier: "MSC",
      trackingNumber: "MSCU-5619284",
      origin: "Mumbai, India",
      destination: "Los Angeles, CA",
      status: "customs_hold" as const,
      customsDeclarationId: "US-IMP-2026-00187",
      estimatedArrival: daysFromNow(7),
    },
  ]);

  // ─── 7. Payments ───
  console.log("Creating payments...");
  await db.insert(payments).values([
    // Order 1 — fully paid
    {
      orderId: orderRows[0].id,
      type: "deposit" as const,
      amount: "2550.00",
      status: "processed" as const,
      paymentMethod: "credit_card",
      processedAt: daysAgo(90),
      externalRef: "ch_mock_001",
    },
    {
      orderId: orderRows[0].id,
      type: "final" as const,
      amount: "5950.00",
      status: "processed" as const,
      paymentMethod: "credit_card",
      processedAt: daysAgo(8),
      externalRef: "ch_mock_002",
    },
    // Order 2 — deposit paid
    {
      orderId: orderRows[1].id,
      type: "deposit" as const,
      amount: "1260.00",
      status: "processed" as const,
      paymentMethod: "bank_transfer",
      processedAt: daysAgo(30),
      externalRef: "bt_mock_003",
    },
    // Order 3 — deposit + progress payment
    {
      orderId: orderRows[2].id,
      type: "deposit" as const,
      amount: "3600.00",
      status: "processed" as const,
      paymentMethod: "credit_card",
      processedAt: daysAgo(60),
      externalRef: "ch_mock_004",
    },
    {
      orderId: orderRows[2].id,
      type: "progress" as const,
      amount: "4200.00",
      status: "processed" as const,
      paymentMethod: "credit_card",
      processedAt: daysAgo(25),
      externalRef: "ch_mock_005",
    },
    // Order 4 — deposit paid
    {
      orderId: orderRows[3].id,
      type: "deposit" as const,
      amount: "960.00",
      status: "processed" as const,
      paymentMethod: "credit_card",
      processedAt: daysAgo(5),
      externalRef: "ch_mock_006",
    },
  ]);

  // ─── 8. Events (audit trail) ───
  console.log("Creating events...");
  await db.insert(events).values([
    {
      entityType: "order",
      entityId: orderRows[0].id,
      eventType: "created",
      actor: "human" as const,
      actorId: "showroom_admin",
      data: { note: "New custom order from Sarah Chen" },
      createdAt: daysAgo(95),
    },
    {
      entityType: "order",
      entityId: orderRows[0].id,
      eventType: "status_changed",
      actor: "agent" as const,
      actorId: "order_agent",
      data: { from: "draft", to: "confirmed" },
      createdAt: daysAgo(93),
    },
    {
      entityType: "order",
      entityId: orderRows[1].id,
      eventType: "created",
      actor: "human" as const,
      actorId: "showroom_admin",
      data: { note: "Michael Torres bookshelf + coffee table order" },
      createdAt: daysAgo(35),
    },
    {
      entityType: "production",
      entityId: orderRows[1].id,
      eventType: "artisan_assigned",
      actor: "agent" as const,
      actorId: "production_agent",
      data: { artisan: "Arjun Mehta", item: "bookshelf" },
      createdAt: daysAgo(28),
    },
    {
      entityType: "shipment",
      entityId: orderRows[2].id,
      eventType: "status_changed",
      actor: "agent" as const,
      actorId: "logistics_agent",
      data: { from: "preparing", to: "in_transit", carrier: "Hapag-Lloyd" },
      createdAt: daysAgo(5),
    },
  ]);

  // ─── 9. Agent Actions ───
  console.log("Creating agent actions...");
  await db.insert(agentActions).values([
    // Executed action — agent auto-confirmed an order
    {
      agentType: "order",
      actionType: "confirm_order",
      input: { orderId: orderRows[0].id, reason: "Deposit received, all items valid" },
      output: { confirmed: true, notified_customer: true },
      status: "executed" as const,
      createdAt: daysAgo(93),
    },
    // Pending action — agent wants to assign an artisan but needs approval
    {
      agentType: "production",
      actionType: "assign_artisan",
      input: {
        orderItemId: itemRows[7].id,
        suggestedArtisan: "Rajesh Kumar",
        reason: "Best quality rating for wood furniture, available capacity",
      },
      output: { artisanId: rajesh.id },
      status: "pending" as const,
      createdAt: daysAgo(1),
    },
    // Escalated action — agent flagged something unusual
    {
      agentType: "order",
      actionType: "price_adjustment",
      input: {
        orderId: orderRows[4].id,
        reason: "Customer requested material upgrade from reclaimed to antique teak",
        proposedIncrease: "2200.00",
      },
      output: { newTotal: "9000.00" },
      status: "escalated" as const,
      escalationReason:
        "Price change exceeds 25% threshold. Requires human approval.",
      createdAt: daysAgo(1),
    },
    // Approved action
    {
      agentType: "logistics",
      actionType: "book_shipment",
      input: { orderId: orderRows[6].id, carrier: "Maersk Line" },
      output: { trackingNumber: "MAEU-pending", estimatedDays: 21 },
      status: "approved" as const,
      createdAt: daysAgo(2),
    },
  ]);

  // ─── 10. Notifications ───
  console.log("Creating notifications...");
  await db.insert(notifications).values([
    {
      recipientType: "customer",
      recipientId: sarah.id,
      channel: "email" as const,
      subject: "Your order has been delivered!",
      body: "Hi Sarah, your custom dining set has been delivered. We hope you love it!",
      read: true,
      sentAt: daysAgo(10),
    },
    {
      recipientType: "customer",
      recipientId: priya.id,
      channel: "email" as const,
      subject: "Your order is on its way!",
      body: "Hi Priya, your rosewood bedroom suite has shipped and is en route to Houston.",
      read: false,
      sentAt: daysAgo(5),
    },
    {
      recipientType: "admin",
      recipientId: 0, // system admin
      channel: "dashboard" as const,
      subject: "Action required: artisan assignment pending",
      body: "The Order Agent suggests assigning Rajesh Kumar to the walnut writing desk. Please review.",
      read: false,
      sentAt: daysAgo(1),
    },
    {
      recipientType: "admin",
      recipientId: 0,
      channel: "dashboard" as const,
      subject: "Escalation: price adjustment needs approval",
      body: "Michael Torres requested a material upgrade. New total would be $9,000 (up from $6,800). Agent escalated for human review.",
      read: false,
      sentAt: daysAgo(1),
    },
  ]);

  console.log("\nSeed complete! Here's what was created:");
  console.log("  - 3 customers");
  console.log("  - 5 artisans");
  console.log("  - 8 orders (across all lifecycle stages)");
  console.log("  - 12 order items");
  console.log("  - 8 production tasks");
  console.log("  - 3 shipments");
  console.log("  - 6 payments");
  console.log("  - 5 events");
  console.log("  - 4 agent actions");
  console.log("  - 4 notifications");

  await client.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
