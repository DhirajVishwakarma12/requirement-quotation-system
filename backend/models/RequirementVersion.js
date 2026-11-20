const mongoose = require('mongoose');
const requirementVersionSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  version: { type: Number, required: true },
  changes: [{ featureId: mongoose.Schema.Types.ObjectId, title: String, description: String, tag: { type: String, enum: ['ADDED', 'MODIFIED', 'REMOVED'] }, previous: { title: String, description: String } }],
  snapshot: [{ featureId: mongoose.Schema.Types.ObjectId, title: String, description: String }],
  note: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  confirmed: { type: Boolean, default: false },
  confirmedAt: Date
}, { timestamps: true });
requirementVersionSchema.index({ project: 1, version: 1 }, { unique: true });
module.exports = mongoose.model('RequirementVersion', requirementVersionSchema);
