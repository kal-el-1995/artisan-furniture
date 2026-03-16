import { describe, it, expect } from "vitest";
import { listCustomers, getCustomerById } from "./customer.service.js";

describe("Customer Service", () => {
  it("should list all customers", async () => {
    const customers = await listCustomers();
    expect(customers.length).toBeGreaterThanOrEqual(3);
    expect(customers[0].name).toBeDefined();
    expect(customers[0].email).toBeDefined();
  });

  it("should get a customer by ID", async () => {
    const customer = await getCustomerById(1);
    expect(customer).not.toBeNull();
    expect(customer!.name).toBe("Sarah Chen");
    expect(customer!.email).toBe("sarah.chen@example.com");
  });

  it("should return null for non-existent customer", async () => {
    const customer = await getCustomerById(99999);
    expect(customer).toBeNull();
  });
});
