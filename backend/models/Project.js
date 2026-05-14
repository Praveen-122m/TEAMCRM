const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['Pending', 'In Progress', 'Completed', 'On Hold'], default: 'Pending' },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  deadline: { type: Date },
  completedWork: [{ type: String }],
  pendingWork: [{ type: String }],
  feedback: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    comment: String,
    createdAt: { type: Date, default: Date.now }
  }],
  approvalStatus: { type: String, enum: ['Awaiting Approval', 'Approved', 'Rejected'], default: 'Awaiting Approval' }
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
