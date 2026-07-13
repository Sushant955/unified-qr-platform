const express = require("express");
const useragent = require("useragent");
const QR = require("../models/QRCode");

const router = express.Router();

// @route   GET /r/:shortId
// @desc    Public redirect endpoint. This is what a scanned dynamic QR
//          code points to. It logs the scan (for analytics) then
//          301-redirects the scanner to the current destination URL.
//          Because the QR image only ever encodes /r/:shortId, the
//          owner can change `destination` in the DB at any time without
//          needing to reprint or regenerate the QR code itself.
router.get("/:shortId", async (req, res) => {
  try {
    const qr = await QR.findOne({ shortId: req.params.shortId });

    if (!qr || !qr.isActive) {
      return res.status(404).send("QR code not found or inactive.");
    }

    const agent = useragent.parse(req.headers["user-agent"]);

    qr.scans.push({
      ip: req.ip,
      device: agent.device.toString(),
      browser: agent.toAgent(),
      os: agent.os.toString(),
      referrer: req.headers["referer"] || "direct",
    });
    qr.scanCount += 1;

    await qr.save();

    return res.redirect(302, qr.destination);
  } catch (error) {
    console.error(error);
    res.status(500).send("Something went wrong.");
  }
});

module.exports = router;
