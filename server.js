import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import base64 from "base-64";
import { MongoClient, ObjectId } from "mongodb";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const uri = process.env.MONGODB_URI;

let client, db;

app.use(cors({ origin: ["http://localhost:3000", "http://localhost:5173"], credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
async function connectToMongo() {
  client = new MongoClient(uri);
  await client.connect();
  db = client.db("DannyShoes");
  console.log("MongoDB connected");
}

await connectToMongo();

// ----------- Health Check ----------
app.get("/", (req, res) => res.json({ message: "API running!", status: "OK" }));
app.get("/health", (req, res) => res.json({ status: "OK", database: db ? "connected" : "disconnected" }));

// ----------- USERS -----------
app.post("/signup", async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    const collection = db.collection("users");
    const existingUser = await collection.findOne({ email: email.toLowerCase() });
    if (existingUser) return res.status(400).json({ error: "User already exists" });

    const newUser = {
      email: email.toLowerCase(),
      password: base64.encode(password),
      firstName: firstName || "",
      lastName: lastName || "",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const result = await collection.insertOne(newUser);
    res.status(201).json({ userId: result.insertedId, email: newUser.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await db.collection("users").findOne({ email: email.toLowerCase() });
    if (!user || base64.decode(user.password) !== password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    res.status(200).json({ userId: user._id, email: user.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------- PRODUCTS -----------c
app.get("/products", async (req, res) => {
  const products = await db.collection("products").find({}).toArray();
  res.status(200).json(products);
});

app.get("/products/:id", async (req, res) => {
  try {
    const product = await db.collection("products").findOne({ _id: new ObjectId(req.params.id) });
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/products", async (req, res) => {
  const { name, price, description } = req.body;
  if (!name || !price) return res.status(400).json({ error: "Name and price required" });
  const product = { name, price, description: description || "", likes: [], createdAt: new Date() };
  const result = await db.collection("products").insertOne(product);
  res.status(201).json({ productId: result.insertedId, ...product });
});

// ----------- ORDERS -----------
app.post("/orders", async (req, res) => {
  const { userId, items, total, shippingAddress } = req.body;
  const order = { userId, items, total, shippingAddress, status: "pending", createdAt: new Date() };
  const result = await db.collection("orders").insertOne(order);
  res.status(201).json({ orderId: result.insertedId });
});

app.get("/orders", async (req, res) => {
  const orders = await db.collection("orders").find({}).toArray();
  res.status(200).json(orders);
});

// ----------- CART -----------
app.post("/carts", async (req, res) => {
  const { userId, productId, quantity } = req.body;
  if (!userId || !productId) return res.status(400).json({ error: "userId and productId required" });
  await db.collection("carts").updateOne(
    { userId, productId },
    { $inc: { quantity: quantity || 1 } },
    { upsert: true }
  );
  res.json({ message: "Item added to cart" });
});

app.get("/carts", async (req, res) => {
  const carts = await db.collection("carts").find({}).toArray();
  res.status(200).json(carts);
});

// ----------- WISHLIST -----------
app.post("/wishlist", async (req, res) => {
  const { userId, productId } = req.body;
  await db.collection("wishlists").updateOne(
    { userId, productId },
    { $set: { userId, productId } },
    { upsert: true }
  );
  res.json({ message: "Item added to wishlist" });
});

app.get("/wishlist/:userId", async (req, res) => {
  const items = await db.collection("wishlists").find({ userId: req.params.userId }).toArray();
  res.json(items);
});

// ----------- SHIPPING -----------
app.post("/shipping", async (req, res) => {
  const { userId, address, city, postalCode, country } = req.body;
  await db.collection("shipping").updateOne(
    { userId },
    { $set: { address, city, postalCode, country, updatedAt: new Date() } },
    { upsert: true }
  );
  res.json({ message: "Shipping info saved" });
});

app.get("/shipping/:userId", async (req, res) => {
  const info = await db.collection("shipping").findOne({ userId: req.params.userId });
  res.json(info || {});
});

// ----------- PAYMENTS -----------
app.post("/payments", async (req, res) => {
  const { userId, orderId, amount, method, status } = req.body;
  const payment = { userId, orderId, amount, method, status: status || "pending", createdAt: new Date() };
  const result = await db.collection("payments").insertOne(payment);
  res.status(201).json({ paymentId: result.insertedId });
});

app.get("/payments/:userId", async (req, res) => {
  const payments = await db.collection("payments").find({ userId: req.params.userId }).toArray();
  res.json(payments);
});

// ----------- CATEGORIES -----------
app.post("/categories", async (req, res) => {
  const { name, description } = req.body;
  const result = await db.collection("categories").insertOne({ name, description: description || "", createdAt: new Date() });
  res.status(201).json({ categoryId: result.insertedId });
});

app.get("/categories", async (req, res) => {
  const cats = await db.collection("categories").find({}).toArray();
  res.json(cats);
});

// ----------- Start Server ----------
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

export default app;
