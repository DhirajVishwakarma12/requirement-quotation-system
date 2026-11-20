const mongoose = require('mongoose');
const discussionSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true, trim: true }
}, { timestamps: true });
module.exports = mongoose.model('Discussion', discussionSchema);
