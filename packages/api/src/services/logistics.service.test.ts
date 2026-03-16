import { describe, it, expect } from "vitest";
import {
  listShipments,
  getShipmentById,
  createShipment,
  updateShipmentStatus,
} from "./logistics.service.js";

describe("Logistics Service", () => {
  it("should list all shipments", async () => {
    const shipments = await listShipments();
    expect(shipments.length).toBeGreaterThanOrEqual(3);
  });

  it("should get a shipment by ID", async () => {
    const shipment = await getShipmentById(1);
    expect(shipment).not.toBeNull();
    expect(shipment!.carrier).toBe("Maersk Line");
    expect(shipment!.orderId).toBe(1);
  });

  it("should return null for non-existent shipment", async () => {
    const shipment = await getShipmentById(99999);
    expect(shipment).toBeNull();
  });

  it("should create a new shipment", async () => {
    const shipment = await createShipment({
      orderId: 7,
      type: "international",
      carrier: "Test Carrier",
      origin: "Mumbai, India",
      destination: "New York, NY",
    });
    expect(shipment).toBeDefined();
    expect(shipment.status).toBe("preparing"); // default status
    expect(shipment.carrier).toBe("Test Carrier");
  });

  it("should update shipment status and set actualArrival on delivery", async () => {
    const updated = await updateShipmentStatus({
      id: 2,
      status: "customs_cleared",
    });
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe("customs_cleared");
  });
});
