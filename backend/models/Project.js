const mongoose = require('mongoose');
const offerSchema = new mongoose.Schema({
  amount: { type: Number, required: true, min: 0 },
  notes: { type: String, default: '', maxlength: 1000 },
  submittedAt: { type: Date, default: Date.now },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  submittedByRole: { type: String, enum: ['client', 'admin'] }
}, { _id: false });

const budgetNegotiationSchema = new mongoose.Schema({
  currentOffer: { type: offerSchema, default: undefined },
  confirmedByClient: { type: Boolean, default: false },
  confirmedByAdmin: { type: Boolean, default: false },
  agreedAmount: { type: Number, min: 0 },
  agreedAt: { type: Date }
}, { _id: false });

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  level: { type: String, enum: ['Basic', 'Medium', 'Advanced'], required: true },
  websiteType: {
    type: String,
    enum: ['Business website', 'E-commerce store', 'Portfolio', 'Landing page', 'Blog / publication', 'Education / e-learning', 'Community / membership', 'Booking / services', 'Web application', 'Other', 'General website'],
    default: 'General website'
  },
  clientOffer: { type: offerSchema, default: undefined },
  counterOffer: { type: offerSchema, default: undefined },
  clientCounterOffer: { type: offerSchema, default: undefined },
  budgetNegotiation: { type: budgetNegotiationSchema, default: undefined },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  developer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  status: { type: String, enum: ['submitted', 'discussion', 'confirmed', 'in-progress', 'completed'], default: 'submitted' },
  currentVersion: { type: Number, default: 0 }
}, { timestamps: true });
module.exports = mongoose.model('Project', projectSchema);
