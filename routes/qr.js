const express = require("express");
const QRCode = require("qrcode");
const { nanoid } = require("nanoid");
const QR = require("../models/QRCode");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Helper: generate a QR image (base64 data URL) with customization options
const generateQRImage = async (data, customization = {}) => {
  const {
    foregroundColor = "#000000",
    backgroundColor = "#FFFFFF",
  } = customization;

  return await QRCode.toDataURL(data, {
    color: {
      dark: foregroundColor,
      light: backgroundColor,
    },
    width: 400,
    margin: 2,
  });
};

// @route   GET /api/qr
// @desc    List all QR codes for logged-in user (dashboard)
router.get("/", protect, async (req, res) => {
  try {
    const qrCodes = await QR.find({ owner: req.user._id }).sort({
      createdAt: -1,
    });
    res.json(qrCodes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/qr/static
// @desc    Create a static QR code (destination baked directly into the image)
router.post("/static", protect, async (req, res) => {
  try {
    const { title, destination, customization } = req.body;
    if (!title || !destination) {
      return res.status(400).json({ message: "Title and destination are required" });
    }

    const qrImage = await generateQRImage(destination, customization);

    const qr = await QR.create({
      owner: req.user._id,
      title,
      type: "static",
      destination,
      qrImage,
      customization,
    });

    res.status(201).json(qr);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/qr/dynamic
// @desc    Create a dynamic QR code (encodes a short redirect URL, editable later)
router.post("/dynamic", protect, async (req, res) => {
  try {
    const { title, destination, customization } = req.body;
    if (!title || !destination) {
      return res.status(400).json({ message: "Title and destination are required" });
    }

    const shortId = nanoid(8);
    const redirectUrl = `${process.env.BASE_URL}/r/${shortId}`;
    const qrImage = await generateQRImage(redirectUrl, customization);

    const qr = await QR.create({
      owner: req.user._id,
      title,
      type: "dynamic",
      destination,
      shortId,
      qrImage,
      customization,
    });

    res.status(201).json(qr);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/qr/:id
router.get("/:id", protect, async (req, res) => {
  try {
    const qr = await QR.findOne({ _id: req.params.id, owner: req.user._id });
    if (!qr) return res.status(404).json({ message: "QR code not found" });
    res.json(qr);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/qr/:id
// @desc    Update a QR code. For dynamic QR codes, only `destination` needs to
//          change and the QR image itself stays valid (it points to /r/:shortId).
//          For static QR codes, changing the destination requires regenerating
//          the image since the destination is baked in directly.
router.put("/:id", protect, async (req, res) => {
  try {
    const qr = await QR.findOne({ _id: req.params.id, owner: req.user._id });
    if (!qr) return res.status(404).json({ message: "QR code not found" });

    const { title, destination, customization, isActive } = req.body;

    if (title) qr.title = title;
    if (typeof isActive === "boolean") qr.isActive = isActive;
    if (customization) qr.customization = { ...qr.customization, ...customization };

    if (destination) {
      qr.destination = destination;
    }

    // Regenerate image if static (destination is embedded) or customization changed
    if (qr.type === "static" && (destination || customization)) {
      qr.qrImage = await generateQRImage(qr.destination, qr.customization);
    } else if (qr.type === "dynamic" && customization) {
      const redirectUrl = `${process.env.BASE_URL}/r/${qr.shortId}`;
      qr.qrImage = await generateQRImage(redirectUrl, qr.customization);
    }

    const updated = await qr.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/qr/:id
router.delete("/:id", protect, async (req, res) => {
  try {
    const qr = await QR.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id,
    });
    if (!qr) return res.status(404).json({ message: "QR code not found" });
    res.json({ message: "QR code deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/qr/:id/stats
// @desc    Scan analytics for a single QR code
router.get("/:id/stats", protect, async (req, res) => {
  try {
    const qr = await QR.findOne({ _id: req.params.id, owner: req.user._id });
    if (!qr) return res.status(404).json({ message: "QR code not found" });

    res.json({
      totalScans: qr.scanCount,
      scans: qr.scans,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
