import request from "supertest";
import { expect } from "chai";
import app from "../server.js";

describe("DannyShoes Full API Tests", function () {
  this.timeout(20000);

  let createdProductId, createdOrderId;

  it("POST /products", async () => {
    const res = await request(app).post("/products").send({ name: "Blazer", price: 120 });
    expect(res.status).to.equal(201);
    expect(res.body).to.have.property("productId");
    createdProductId = res.body.productId;
  });

  it("GET /products", async () => {
    const res = await request(app).get("/products");
    expect(res.status).to.equal(200);
    expect(res.body.some(p => p._id === createdProductId)).to.be.true;
  });

  it("POST /orders", async () => {
    const res = await request(app).post("/orders").send({
      userId: "test-user",
      items: [{ productId: createdProductId, quantity: 2 }],
      total: 240,
      shippingAddress: "123 Street"
    });
    expect(res.status).to.equal(201);
    expect(res.body).to.have.property("orderId");
    createdOrderId = res.body.orderId;
  });

  it("GET /orders", async () => {
    const res = await request(app).get("/orders");
    expect(res.status).to.equal(200);
    expect(res.body.length).to.be.greaterThan(0);
  });

  it("POST /carts", async () => {
    const res = await request(app).post("/carts").send({ userId: "test-user", productId: createdProductId, quantity: 1 });
    expect(res.status).to.equal(200);
  });

  it("GET /carts", async () => {
    const res = await request(app).get("/carts");
    expect(res.status).to.equal(200);
  });

  it("POST /wishlist", async () => {
    const res = await request(app).post("/wishlist").send({ userId: "test-user", productId: createdProductId });
    expect(res.status).to.equal(200);
  });

  it("GET /wishlist/:userId", async () => {
    const res = await request(app).get("/wishlist/test-user");
    expect(res.status).to.equal(200);
  });

  it("POST /shipping", async () => {
    const res = await request(app).post("/shipping").send({ userId: "test-user", address: "123 Street", city: "City", postalCode: "0000", country: "Country" });
    expect(res.status).to.equal(200);
  });

  it("GET /shipping/:userId", async () => {
    const res = await request(app).get("/shipping/test-user");
    expect(res.status).to.equal(200);
  });

  it("POST /payments", async () => {
    const res = await request(app).post("/payments").send({ userId: "test-user", orderId: createdOrderId, amount: 240, method: "card" });
    expect(res.status).to.equal(201);
  });

  it("GET /payments/:userId", async () => {
    const res = await request(app).get("/payments/test-user");
    expect(res.status).to.equal(200);
  });

  it("POST /categories", async () => {
    const res = await request(app).post("/categories").send({ name: "Shoes", description: "All shoes" });
    expect(res.status).to.equal(201);
  });

  it("GET /categories", async () => {
    const res = await request(app).get("/categories");
    expect(res.status).to.equal(200);
  });
});
