// server.js
require("dotenv").config();
const express = require("express");
const base64 = require("base-64");
const { MongoClient, ObjectId } = require("mongodb");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000 ;

// MongoDB connection string
const uri = process.env.MONGODB_URI || "mongodb+srv://daniellajudith:judith06@cluster0.xe4miek.mongodb.net/";
let client, db;

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000 ',
    'http://localhost:3001',
    'http://localhost:5173',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// MongoDB connection function
async function connectToMongo() {
  try {
    console.log("Connecting to MongoDB...");
    client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await client.connect();
    console.log(" Connected to MongoDB successfully");
    db = client.db("DannyShoes");

    // Test the connection
    await db.admin().ping();
    console.log(" Database ping successful");
  } catch (error) {
    console.error(" MongoDB connection error:", error.message);
    process.exit(1);
  }
}

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    message: "DannyShoes API is running!",
    status: "OK",
    timestamp: new Date().toISOString()
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    database: db ? "connected" : "disconnected",
    timestamp: new Date().toISOString()
  });
});

// ========== USER AUTHENTICATION ROUTES ==========
// Signup route
app.post("/signup", async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long" });
    }

    if (!email.includes("@")) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const collection = db.collection("users");

    // Check if user already exists
    const existingUser = await collection.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: "User with this email already exists" });
    }

    // Create new user with base64 encoded password
    const newUser = {
      email: email.toLowerCase(),
      password: base64.encode(password),
      firstName: firstName || "",
      lastName: lastName || "",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await collection.insertOne(newUser);
    console.log(" New user created:", result.insertedId);

    res.status(201).json({
      message: "User created successfully",
      userId: result.insertedId,
      email: newUser.email
    });
  } catch (err) {
    console.error(" Signup error:", err);
    res.status(500).json({ error: "Failed to create user: " + err.message });
  }
});

// Signin route
app.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const collection = db.collection("users");
    const user = await collection.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Decode password and compare
    const decodedPassword = base64.decode(user.password);
    if (decodedPassword !== password) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    console.log(" User signed in:", user._id);

    res.status(200).json({
      message: "Sign in successful",
      userId: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    });
  } catch (err) {
    console.error(" Signin error:", err);
    res.status(500).json({ error: "Sign in failed: " + err.message });
  }
});

// ========== PRODUCTS ROUTES ==========

// Get all products
app.get("/products", async (req, res) => {
  try {
    const products = await db.collection("products").find({}).toArray();
    res.json(products);
    res.status(200).json(products);
  } catch (err) {
    console.error(" Get products error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get single product
app.get("/products/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    const product = await db.collection("products").findOne({ _id: new ObjectId(id) });
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(product);
  } catch (err) {
    console.error(" Get product error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Like a product
app.post("/products/:id/like", async (req, res) => {
  try {
    const { userId } = req.body;
    const productId = req.params.id;

    if (!ObjectId.isValid(productId)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    const result = await db.collection("products").updateOne(
      { _id: new ObjectId(productId) },
      { $addToSet: { likes: userId } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ message: "Product liked successfully" });
  } catch (err) {
    console.error(" Like product error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Unlike a product
app.post("/products/:id/unlike", async (req, res) => {
  try {
    const { userId } = req.body;
    const productId = req.params.id;

    if (!ObjectId.isValid(productId)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    await db.collection("products").updateOne(
      { _id: new ObjectId(productId) },
      { $pull: { likes: userId } }
    );

    res.json({ message: "Product unliked successfully" });
  } catch (err) {
    console.error(" Unlike product error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ========== CART ROUTES ==========
// Carts
app.get("/carts", async (req, res) => {
  try {
    const carts = await db.collection("carts").find({}).toArray();
    res.status(200).json(carts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.post("/carts", async (req, res) => {
  try {
    const { userId, productId, quantity } = req.body;
    if (!userId || !productId) return res.status(400).json({ error: "userId and productId required" });

    await db.collection("carts").updateOne(
      { userId, productId },
      { $inc: { quantity: quantity || 1 } },
      { upsert: true }
    );
    res.json({ message: "Item added to cart" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/cart/:userId/:productId", async (req, res) => {
  try {
    await db.collection("carts").deleteOne({
      userId: req.params.userId,
      productId: req.params.productId
    });
    res.json({ message: "Item removed from cart" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ORDER ROUTES ==========
// Orders
app.get("/orders", async (req, res) => {
  try {
    const orders = await db.collection("orders").find({}).toArray();
    res.status(200).json(orders);
  } catch (err) {
    console.error("Get orders error:", err);
    res.status(500).json({ error: err.message });
  }
});


app.post("/orders", async (req, res) => {
  try {
    const { userId, items, total, shippingAddress } = req.body;
    const order = {
      userId,
      items,
      total,
      shippingAddress,
      status: "pending",
      createdAt: new Date()
    };
    const result = await db.collection("orders").insertOne(order);
    res.status(201).json({ orderId: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== WISHLIST ROUTES ==========
app.get("/wishlist/:userId", async (req, res) => {
  try {
    const items = await db.collection("wishlists")
      .find({ userId: req.params.userId })
      .toArray();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/wishlist", async (req, res) => {
  try {
    const { userId, productId } = req.body;
    await db.collection("wishlists").updateOne(
      { userId, productId },
      { $set: { userId, productId } },
      { upsert: true }
    );
    res.json({ message: "Item added to wishlist" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/wishlist/:userId/:productId", async (req, res) => {
  try {
    await db.collection("wishlists").deleteOne({
      userId: req.params.userId,
      productId: req.params.productId
    });
    res.json({ message: "Item removed from wishlist" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== SHIPPING ROUTES ==========
app.get("/shipping/:userId", async (req, res) => {
  try {
    const info = await db.collection("shipping").findOne({ userId: req.params.userId });
    res.json(info || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/shipping", async (req, res) => {
  try {
    const { userId, address, city, postalCode, country } = req.body;
    await db.collection("shipping").updateOne(
      { userId },
      { $set: { address, city, postalCode, country, updatedAt: new Date() } },
      { upsert: true }
    );
    res.json({ message: "Shipping info saved" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== PAYMENT ROUTES ==========
app.post("/payments", async (req, res) => {
  try {
    const { userId, orderId, amount, method, status } = req.body;
    const payment = {
      userId,
      orderId,
      amount,
      method,
      status: status || "pending",
      createdAt: new Date()
    };
    const result = await db.collection("payments").insertOne(payment);
    res.status(201).json({ paymentId: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/payments/:userId", async (req, res) => {
  try {
    const payments = await db.collection("payments")
      .find({ userId: req.params.userId })
      .toArray();
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== CATEGORY ROUTES ==========
app.get("/categories", async (req, res) => {
  try {
    const cats = await db.collection("categories").find({}).toArray();
    res.json(cats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/categories", async (req, res) => {
  try {
    const { name, description } = req.body;
    const result = await db.collection("categories").insertOne({
      name,
      description: description || "",
      createdAt: new Date()
    });
    res.status(201).json({ categoryId: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/categories/:id", async (req, res) => {
  try {
    const { name, description } = req.body;
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid category ID" });

    await db.collection("categories").updateOne(
      { _id: new ObjectId(id) },
      { $set: { name, description, updatedAt: new Date() } }
    );
    res.json({ message: "Category updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid category ID" });

    await db.collection("categories").deleteOne({ _id: new ObjectId(id) });
    res.json({ message: "Category deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== START SERVER ==========
async function startServer() {
  try {
    await connectToMongo();

    app.listen(PORT,'0.0.0.0',() => {
      console.log(` Server is running on port ${PORT}`);
      console.log(` Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error(" Failed to start server:", error);
    process.exit(1);
  }
}

startServer();