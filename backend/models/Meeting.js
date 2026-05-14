const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['Active', 'Completed', 'Scheduled'], default: 'Active' },
  roomId: { type: String, required: true, unique: true },
  scheduledAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Meeting', meetingSchema);
