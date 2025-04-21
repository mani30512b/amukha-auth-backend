const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  cin: { type: String, required: true, unique: true },
  key: { type: String, required: true },
  missedDays: { type: Number, default: 0 },
  lastPingDate: { type: String, default: null },
  isLocked: { type: Boolean, default: false },
});

const Client = mongoose.model("Client", clientSchema);
module.exports = Client;
