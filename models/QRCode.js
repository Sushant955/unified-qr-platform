const mongoose = require("mongoose");

const scanLogSchema = new mongoose.Schema(
  {
    timestamp: { type: Date, default: Date.now },
    ip: { type: String },
    device: { type: String },
    browser: { type: String },
    os: { type: String },
    referrer: { type: String },
  },
  { _id: false }
);

const qrCodeSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: [true, "QR title is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: ["static", "dynamic"],
      required: true,
    },
    // For static QR: the destination is baked directly into the QR image.
    // For dynamic QR: the QR image encodes BASE_URL/r/:shortId, which
    // redirects server-side to `destination`. This lets destination be
    // updated later without regenerating/reprinting the QR code.
    destination: {
      type: String,
      required: [true, "Destination URL is required"],
    },
    shortId: {
      type: String,
      unique: true,
      sparse: true, // only dynamic QR codes have a shortId
    },
    qrImage: {
      type: String, // base64 data URL of the generated QR image
      required: true,
    },
    customization: {
      foregroundColor: { type: String, default: "#000000" },
      backgroundColor: { type: String, default: "#FFFFFF" },
      logoUrl: { type: String, default: "" },
      shape: {
        type: String,
        enum: ["square", "rounded", "dots"],
        default: "square",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    scans: [scanLogSchema],
    scanCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

qrCodeSchema.index({ owner: 1, createdAt: -1 });

module.exports = mongoose.model("QRCode", qrCodeSchema);
