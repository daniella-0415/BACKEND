const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const router = express.Router();
const User = require("../models/User");

const JWT_SECRET = "your_secret_key"; // Use process.env.JWT_SECRET in production

// Signin route
router.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch =  base64.decode(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    
    res.status(200).json({ message: "Sign in successful", token });
  } catch (err) {
    res.status(500).json({ message: "Sign in failed", error: err.message });
  }
});

module.exports = router;
