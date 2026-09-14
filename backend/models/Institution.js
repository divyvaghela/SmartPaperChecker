const mongoose = require('mongoose');

const institutionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  adminEmail: { type: String, required: true },
  subscriptionPlan: { type: String, enum: ['BASIC', 'PREMIUM', 'ENTERPRISE'], default: 'BASIC' },
  status: { type: String, enum: ['ACTIVE', 'SUSPENDED', 'EXPIRED'], default: 'ACTIVE' },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 30*24*60*60*1000) }, // Default 30 days trial
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Institution', institutionSchema);