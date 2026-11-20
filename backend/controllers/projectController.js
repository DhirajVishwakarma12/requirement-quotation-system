const Project = require('../models/Project');
const Feature = require('../models/Feature');
const RequirementVersion = require('../models/RequirementVersion');
const Discussion = require('../models/Discussion');
const User = require('../models/User');
const Quotation = require('../models/Quotation');
const { sendQuotationEmail } = require('../utils/mailer');

const suggestions = {
  Basic: [
    'User registration and login',
    'Responsive user interface',
    'Basic dashboard',
    'Contact form',
    'User profile management',
    'Email notifications',
    'File upload',
    'Search and filtering',
    'Data export',
    'Admin panel'
  ],
  Medium: [
    'Role-based access control',
    'Admin dashboard',
    'Search and filtering',
    'Email notifications',
    'Data reports',
    'Team and permission management',
    'Document management',
    'Activity history',
    'Calendar and scheduling',
    'Payment processing',
    'Automated workflows',
    'Multi-language support'
  ],
  Advanced: [
    'Payment gateway integration',
    'Real-time notifications',
    'Analytics dashboard',
    'Audit logs',
    'Third-party API integration',
    'Advanced security',
    'Live chat and collaboration',
    'AI-powered recommendations',
    'Multi-tenant architecture',
    'Advanced reporting',
    'Workflow automation',
    'High-availability infrastructure',
    'Single sign-on (SSO)',
    'Data warehouse integration'
  ]
};
const websiteTypes = [
  'Business website',
  'E-commerce store',
  'Portfolio',
  'Landing page',
  'Blog / publication',
  'Education / e-learning',
  'Community / membership',
  'Booking / services',
  'Web application',
  'Other'
];

function initializeBudgetNegotiation(project) {
  if (project.budgetNegotiation?.currentOffer) return project.budgetNegotiation;
  const offer = project.counterOffer || project.clientOffer;
  if (!offer) return null;

  const submittedByRole = offer.submittedByRole || (project.counterOffer ? 'admin' : 'client');
  project.budgetNegotiation = {
    currentOffer: {
      amount: offer.amount,
      notes: offer.notes,
      submittedAt: offer.submittedAt,
      submittedBy: offer.submittedBy,
      submittedByRole
    },
    confirmedByClient: submittedByRole === 'client',
    confirmedByAdmin: submittedByRole === 'admin'
  };
  return project.budgetNegotiation;
}

function parseBudgetOffer(body) {
  if (!body || typeof body !== 'object') return null;
  const amount = Number(body.amount);
  const notes = body.notes ?? '';
  if (body.amount === undefined || body.amount === null || body.amount === '' ||
      !Number.isFinite(amount) || amount < 0 ||
      typeof notes !== 'string' || notes.length > 1000) {
    return null;
  }
  return { amount, notes };
}

function setCurrentBudgetOffer(project, offer, role) {
  project.budgetNegotiation = {
    currentOffer: offer,
    confirmedByClient: role === 'client',
    confirmedByAdmin: role === 'admin'
  };
}

exports.getSuggestions = (req, res) => {
  const levelSuggestions = suggestions[req.params.level];
  if (!levelSuggestions) return res.status(400).json({ message: 'Invalid project level' });
  res.json(levelSuggestions);
};

exports.getBudgetMessageSuggestions = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!project.client.equals(req.user._id)) return res.status(403).json({ message: 'Access denied' });

    const negotiation = project.budgetNegotiation;
    let messageSuggestions;
    if (negotiation?.agreedAt) {
      messageSuggestions = [
        'What are the next steps for the agreed budget?',
        'Could you confirm the payment and project kickoff timeline?',
        'Please confirm what is included in the agreed amount.'
      ];
    } else if (negotiation?.currentOffer?.submittedByRole === 'admin' ||
      (!negotiation?.currentOffer && project.counterOffer)) {
      messageSuggestions = [
        'Could you explain the details of the counter offer?',
        'Can we discuss adjusting the amount or project scope?',
        'Please clarify what is included in this counter offer.'
      ];
    } else if (project.clientCounterOffer) {
      messageSuggestions = [
        'Could you review my updated budget offer?',
        'Can we discuss how this revised amount affects the project scope?',
        'Please let me know if you need any details about my re-counter offer.'
      ];
    } else {
      messageSuggestions = [
        'Could you review my budget offer?',
        'Can we discuss what is included in my proposed amount?',
        'Please let me know if you need more details about my budget.'
      ];
    }

    return res.json(messageSuggestions);
  } catch (error) {
    return next(error);
  }
};

exports.createProject = async (req, res) => {
  try {
    const { title, description, level, websiteType, selectedFeatures, offerAmount, offerNotes } = req.body;
    if (!title || !['Basic', 'Medium', 'Advanced'].includes(level) || !websiteTypes.includes(websiteType)) {
      return res.status(400).json({ message: 'Title, valid project level and website type are required' });
    }
    const amount = Number(offerAmount);
    if (offerAmount === undefined || offerAmount === null || offerAmount === '' || !Number.isFinite(amount) || amount < 0) {
      return res.status(400).json({ message: 'Enter a valid budget offer of zero or more' });
    }
    if (offerNotes !== undefined && (typeof offerNotes !== 'string' || offerNotes.length > 1000)) {
      return res.status(400).json({ message: 'Offer notes must be 1000 characters or fewer' });
    }
    if (!Array.isArray(selectedFeatures) || selectedFeatures.length === 0 || selectedFeatures.some(feature => typeof feature !== 'string' || !suggestions[level].includes(feature))) {
      return res.status(400).json({ message: 'Select at least one valid suggested feature' });
    }
    const clientOffer = {
      amount,
      notes: offerNotes || '',
      submittedBy: req.user._id,
      submittedByRole: 'client'
    };
    const project = await Project.create({
      title,
      description,
      level,
      websiteType,
      clientOffer,
      budgetNegotiation: {
        currentOffer: clientOffer,
        confirmedByClient: true,
        confirmedByAdmin: false
      },
      client: req.user._id
    });
    const features = await Feature.insertMany([...new Set(selectedFeatures)].map(title => ({ project: project._id, title, description: 'Selected by client', createdBy: req.user._id })));
    res.status(201).json({ project, suggestedFeatures: features });
  } catch (e) { res.status(500).json({ message: e.message }); }
};
exports.sendCounterOffer = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!project.clientOffer) return res.status(400).json({ message: 'This project has no client offer to counter' });
    const negotiation = initializeBudgetNegotiation(project);
    if (negotiation.agreedAt) return res.status(409).json({ message: 'This budget has already been agreed' });
    const input = parseBudgetOffer(req.body);
    if (!input) {
      return res.status(400).json({ message: 'Enter a valid counter offer of zero or more' });
    }

    const offer = {
      ...input,
      submittedBy: req.user._id,
      submittedByRole: 'admin',
      submittedAt: new Date()
    };
    project.counterOffer = offer;
    setCurrentBudgetOffer(project, offer, 'admin');
    await project.save();
    return res.json({ message: 'Counter offer saved', project });
  } catch (error) {
    return next(error);
  }
};
exports.sendClientCounterOffer = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!project.client.equals(req.user._id)) return res.status(403).json({ message: 'Access denied' });
    if (!project.clientOffer) return res.status(400).json({ message: 'This project has no client offer to revise' });

    const negotiation = initializeBudgetNegotiation(project);
    if (negotiation.agreedAt) return res.status(409).json({ message: 'This budget has already been agreed' });
    const input = parseBudgetOffer(req.body);
    if (!input) return res.status(400).json({ message: 'Enter a valid counter offer of zero or more' });

    const offer = {
      ...input,
      submittedBy: req.user._id,
      submittedByRole: 'client',
      submittedAt: new Date()
    };
    project.clientCounterOffer = offer;
    setCurrentBudgetOffer(project, offer, 'client');
    await project.save();
    return res.json({ message: 'Client counter offer saved', project });
  } catch (error) {
    return next(error);
  }
};
exports.confirmBudgetOffer = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (req.user.role === 'client' && !project.client.equals(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const negotiation = initializeBudgetNegotiation(project);
    if (!negotiation?.currentOffer) return res.status(400).json({ message: 'There is no offer to confirm' });
    if (negotiation.agreedAt) return res.json({ message: 'Budget already agreed', project });

    if (req.user.role === 'client') negotiation.confirmedByClient = true;
    if (req.user.role === 'admin') negotiation.confirmedByAdmin = true;
    if (negotiation.confirmedByClient && negotiation.confirmedByAdmin) {
      negotiation.agreedAmount = negotiation.currentOffer.amount;
      negotiation.agreedAt = new Date();
    }

    await project.save();
    return res.json({ message: negotiation.agreedAt ? 'Budget agreed' : 'Offer confirmation saved', project });
  } catch (error) {
    return next(error);
  }
};
exports.listProjects = async (req, res) => {
  const filter = req.user.role === 'client' ? { client: req.user._id } : req.user.role === 'developer' ? { developer: req.user._id } : {};
  const projects = await Project.find(filter).populate('client', 'name email').populate('developer', 'name email').sort({ createdAt: -1 });
  res.json(projects);
};
exports.getProject = async (req, res) => {
  const project = await Project.findById(req.params.id).populate('client', 'name email').populate('developer', 'name email');
  if (!project) return res.status(404).json({ message: 'Project not found' });
  if (req.user.role === 'client' && !project.client._id.equals(req.user._id)) return res.status(403).json({ message: 'Access denied' });
  if (req.user.role === 'developer' && !project.developer?._id.equals(req.user._id)) return res.status(403).json({ message: 'Access denied' });
  const [features, versions, discussions, quotation] = await Promise.all([
    Feature.find({ project: project._id, status: 'active' }),
    RequirementVersion.find({ project: project._id }).sort({ version: -1 }),
    Discussion.find({ project: project._id }).populate('sender', 'name role').sort({ createdAt: 1 }),
    Quotation.findOne({ project: project._id }).sort({ createdAt: -1 })
  ]);
  res.json({ project, features, versions, discussions, quotation });
};
exports.assignDeveloper = async (req, res) => {
  const { developerId } = req.body;
  const developer = await User.findOne({ _id: developerId, role: 'developer' });
  if (!developer) return res.status(404).json({ message: 'Developer not found' });
  const project = await Project.findByIdAndUpdate(req.params.id, { developer: developer._id }, { new: true });
  if (!project) return res.status(404).json({ message: 'Project not found' });
  res.json(project);
};
exports.addFeature = async (req, res) => {
  const { title, description = '' } = req.body;
  if (!title?.trim()) return res.status(400).json({ message: 'Feature title is required' });
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: 'Project not found' });
  const feature = await Feature.create({ project: project._id, title: title.trim(), description, createdBy: req.user._id });
  res.status(201).json(feature);
};
exports.updateFeature = async (req, res) => {
  const feature = await Feature.findOne({ _id: req.params.featureId, project: req.params.id, status: 'active' });
  if (!feature) return res.status(404).json({ message: 'Active feature not found' });
  const previous = { title: feature.title, description: feature.description };
  const { title, description } = req.body;
  if (title !== undefined) feature.title = title;
  if (description !== undefined) feature.description = description;
  await feature.save();
  res.json({ feature, previous });
};
exports.removeFeature = async (req, res) => {
  const feature = await Feature.findOneAndUpdate({ _id: req.params.featureId, project: req.params.id, status: 'active' }, { status: 'removed' }, { new: true });
  if (!feature) return res.status(404).json({ message: 'Active feature not found' });
  res.json({ message: 'Feature marked for removal. It remains in history.', feature });
};
exports.saveVersion = async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: 'Project not found' });
  const active = await Feature.find({ project: project._id, status: 'active' }).sort({ createdAt: 1 });
  const previousVersion = await RequirementVersion.findOne({ project: project._id }).sort({ version: -1 });
  const previous = new Map((previousVersion?.snapshot || []).map(f => [String(f.featureId), f]));
  const currentIds = new Set(active.map(f => String(f._id)));
  const changes = [];
  for (const f of active) {
    const old = previous.get(String(f._id));
    if (!old) changes.push({ featureId: f._id, title: f.title, description: f.description, tag: 'ADDED' });
    else if (old.title !== f.title || old.description !== f.description) changes.push({ featureId: f._id, title: f.title, description: f.description, tag: 'MODIFIED', previous: { title: old.title, description: old.description } });
  }
  for (const [id, old] of previous) if (!currentIds.has(id)) changes.push({ featureId: old.featureId, title: old.title, description: old.description, tag: 'REMOVED' });
  if (!changes.length && previousVersion) {
    return res.status(400).json({ message: 'No requirement changes since the latest saved version. Add, edit, or remove a feature before saving another version.' });
  }
  const version = (project.currentVersion || 0) + 1;
  const saved = await RequirementVersion.create({ project: project._id, version, changes, snapshot: active.map(f => ({ featureId: f._id, title: f.title, description: f.description })), note: req.body.note || '', createdBy: req.user._id });
  project.currentVersion = version; project.status = 'discussion'; await project.save();
  res.status(201).json(saved);
};
exports.confirmVersion = async (req, res) => {
  const version = await RequirementVersion.findOne({ _id: req.params.versionId, project: req.params.id });
  if (!version) return res.status(404).json({ message: 'Version not found' });
  version.confirmed = true; version.confirmedAt = new Date(); await version.save();
  await Project.findByIdAndUpdate(req.params.id, { status: 'confirmed' });
  res.json({ message: `Requirement version ${version.version} confirmed`, version });
};
exports.addDiscussion = async (req, res) => {
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ message: 'Message is required' });
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: 'Project not found' });
  if (req.user.role === 'client' && !project.client.equals(req.user._id)) return res.status(403).json({ message: 'Access denied' });
  if (req.user.role === 'developer' && !project.developer?.equals(req.user._id)) return res.status(403).json({ message: 'Access denied' });
  const discussion = await Discussion.create({ project: project._id, sender: req.user._id, message });
  res.status(201).json(discussion);
};
exports.createAndSendQuotation = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate('client', 'name email').populate('developer', 'name email');
    if (!project) return res.status(404).json({ message: 'Project not found' });
    const version = await RequirementVersion.findOne({ project: project._id, confirmed: true }).sort({ version: -1 });
    if (!version) return res.status(400).json({ message: 'Confirm requirements before sending a quotation' });
    if (!project.developer) return res.status(400).json({ message: 'Assign a developer before sending the quotation' });
    const items = req.body.items || [];
    if (!items.length || items.some(i => !i.description || !Number.isFinite(Number(i.amount)) || Number(i.amount) < 0)) return res.status(400).json({ message: 'Provide valid quotation items' });
    const normalized = items.map(i => ({ description: i.description, amount: Number(i.amount) }));
    const total = normalized.reduce((sum, i) => sum + i.amount, 0);
    const quotation = await Quotation.create({ project: project._id, version: version.version, items: normalized, total, notes: req.body.notes || '' });
    const recipients = [project.client.email, project.developer.email];
    await Promise.all(recipients.map(to => sendQuotationEmail({ to, project, quotation })));
    quotation.sentAt = new Date(); quotation.sentTo = recipients; await quotation.save();
    res.status(201).json({ message: 'Quotation emailed to client and developer', quotation });
  } catch (e) { res.status(500).json({ message: `Quotation email failed: ${e.message}` }); }
};
