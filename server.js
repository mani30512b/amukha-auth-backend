const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const mongoose = require("mongoose");
require("dotenv").config();

const Client = require("./models/Client");

// Verify the Mongo URI
console.log("Mongo URI:", process.env.MONGO_URI);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

const app = express();
app.use(cors());
app.use(express.json());

// Register a new client
app.post("/api/register", async (req, res) => {
  const { name, startDate, endDate, cin } = req.body;
  const rawKey = name + startDate + endDate + cin;
  const clientKey = crypto.createHash("md5").update(rawKey).digest("hex").slice(0, 16);

  try {
    const client = new Client({
      name,
      startDate,
      endDate,
      cin,
      key: clientKey
    });
    await client.save();
    res.json({ message: "Registered successfully", key: clientKey });
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ message: "Client with this CIN already exists." });
    } else {
      res.status(500).json({ message: "Error registering client", error: err.message });
    }
  }
});

// Daily check-in to validate client
app.post("/api/ping", async (req, res) => {
  const { cin, hash } = req.body;
  const client = await Client.findOne({ cin });

  if (!client) return res.status(404).json({ message: "Client not found." });
  if (client.isLocked) return res.status(403).json({ message: "Access permanently locked. Contact admin." });

  const today = new Date().toISOString().split("T")[0];
  const expectedHash = crypto.createHash("sha256").update(client.key + today).digest("hex");

  if (hash === expectedHash) {
    client.missedDays = 0;
    client.lastPingDate = today;
    await client.save();
    return res.json({ message: "Access granted ✅" });
  } else {
    client.missedDays += 1;
    if (client.missedDays >= 2) client.isLocked = true;
    await client.save();
    return res.status(client.isLocked ? 403 : 401).json({
      message: client.isLocked ? "Access locked. Missed 2 days ❌" : "Wrong hash. Try again.",
      remainingAttempts: client.isLocked ? 0 : 2 - client.missedDays
    });
  }
});

// Admin: Unlock a client manually
app.post("/api/unlock", async (req, res) => {
  const { cin } = req.body;
  const client = await Client.findOne({ cin });

  if (!client) return res.status(404).json({ message: "Client not found." });

  client.missedDays = 0;
  client.isLocked = false;
  await client.save();

  res.json({ message: `Client ${cin} unlocked.` });
});

// Start server
app.listen(5000, () => {
  console.log("✅ Amukha Server running on port 5000");
});
