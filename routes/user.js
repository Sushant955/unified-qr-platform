const express = require("express");
const User = require("../models/User");
const { protect } = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/user/profile
router.get("/profile", protect, async (req, res) => {
  res.json(req.user);
});

// @route   PUT /api/user/profile
router.put("/profile", protect, async (req, res) => {
  try {
    const { name, avatar, company } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.name = name || user.name;
    user.avatar = avatar ?? user.avatar;
    user.company = company ?? user.company;

    const updatedUser = await user.save();
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
