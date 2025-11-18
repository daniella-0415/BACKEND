// server.js
import dotenv from "dotenv";
dotenv.config();
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const app = express();
app.use(express.json());
app.use(cors());
const uri = process.env.MONGODB_URI 

// ------------------------------------------------------
// 📌 1. DATABASE CONNECTION
// ------------------------------------------------------
mongoose
  .connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log(" MongoDB Connected"))
  .catch((err) => console.log(" DB Error:", err));

// ------------------------------------------------------
// 📌 2. MODELS
// ------------------------------------------------------
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
});

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  img: String,
  category: String,
});

const wishlistSchema = new mongoose.Schema({
  userId: String,
  productId: String,
});

const cartSchema = new mongoose.Schema({
  userId: String,
  productId: String,
  quantity: Number,
});

const User = mongoose.model("User", userSchema);
const Product = mongoose.model("Product", productSchema);
const Wishlist = mongoose.model("Wishlist", wishlistSchema);
const Cart = mongoose.model("Cart", cartSchema);

// ------------------------------------------------------
// 📌 3. AUTH MIDDLEWARE
// ------------------------------------------------------
function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, "SECRET123");
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ message: "Invalid token" });
  }
}

// ------------------------------------------------------
// 📌 4. AUTH ROUTES (Signup & Signin)
// ------------------------------------------------------
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "Email already used" });

    const hashed = await bcrypt.hash(password, 10);

    const user = new User({ name, email, password: hashed });
    await user.save();

    res.json({ message: "Signup successful" });
  } catch (err) {  
    res.status(500).json({ message: "Signup error", error: err.message });
  }
});

app.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Invalid email or password" });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(400).json({ message: "Invalid email or password" });

    const token = jwt.sign({ id: user._id, email: user.email }, "SECRET123", {
      expiresIn: "7d",
    });

    res.json({ message: "Signin successful", token });
  } catch (err) {
    res.status(500).json({ message: "Signin error" });
  }
});

// ------------------------------------------------------
// 📌 5. PRODUCT ROUTES (Public)
// ------------------------------------------------------
app.get("/products", async (req, res) => {
  const products = await Product.find();
  res.json(products);
});

// ------------------------------------------------------
// 📌 6. WISHLIST (Protected)
// ------------------------------------------------------
app.post("/wishlist", auth, async (req, res) => {
  const { productId } = req.body;

  const exists = await Wishlist.findOne({
    userId: req.user.id,
    productId,
  });

  if (exists) return res.json({ message: "Already in wishlist" });

  const item = new Wishlist({
    userId: req.user.id,
    productId,
  });

  await item.save();
  res.json({ message: "Added to wishlist" });
});

app.get("/wishlist", auth, async (req, res) => {
  const items = await Wishlist.find({ userId: req.user.id });
  res.json(items);
});

// ------------------------------------------------------
// 📌 7. CART (Protected)
// ------------------------------------------------------
app.post("/cart", auth, async (req, res) => {
  const { productId, quantity } = req.body;

  const item = new Cart({
    userId: req.user.id,
    productId,
    quantity,
  });

  await item.save();
  res.json({ message: "Added to cart" });
});

app.get("/cart", auth, async (req, res) => {
  const items = await Cart.find({ userId: req.user.id });
  res.json(items);
});

// ------------------------------------------------------
// 📌 SERVER START
// ------------------------------------------------------
app.listen(3000, () => console.log("🚀 Server running on port 3000"));
