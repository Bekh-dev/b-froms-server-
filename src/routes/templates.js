const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Template = require('../models/Template');

// @route   GET api/templates/public
// @desc    Get all public templates
// @access  Public
router.get('/public', async (req, res) => {
  try {
    console.log('Getting public templates');
    const templates = await Template.find({ 
      isPublished: true, 
      isArchived: false 
    }).populate('user', 'name email');
    console.log('Found public templates:', templates.length);
    res.json(templates);
  } catch (err) {
    console.error('Error getting public templates:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET api/templates/my
// @desc    Get user's templates
// @access  Private
router.get('/my', auth, async (req, res) => {
  try {
    console.log('Getting templates for user:', req.user.id);
    const templates = await Template.find({ 
      user: req.user.id,
      isArchived: false
    }).populate('user', 'name email');
    console.log('Found user templates:', templates.length);
    res.json(templates);
  } catch (err) {
    console.error('Error getting user templates:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET api/templates/:id
// @desc    Get template by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    console.log('Getting template by ID:', req.params.id);
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      console.error('Invalid template ID:', req.params.id);
      return res.status(400).json({ message: 'Invalid template ID' });
    }

    const template = await Template.findById(req.params.id)
      .populate('user', 'name email')
      .populate('sharedWith.user', 'name email');
      
    if (!template) {
      console.error('Template not found:', req.params.id);
      return res.status(404).json({ message: 'Template not found' });
    }
    
    if (!template.canAccess(req.user.id)) {
      console.error('Access denied to template:', req.params.id);
      return res.status(403).json({ message: 'Access denied' });
    }
    
    console.log('Template found:', template._id);
    res.json(template);
  } catch (err) {
    console.error('Error getting template:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST api/templates
// @desc    Create a template
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('title', 'Title is required').not().isEmpty(),
      check('questions', 'Questions must be an array').isArray()
    ]
  ],
  async (req, res) => {
    try {
      console.log('Creating template with data:', req.body);
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error('Validation errors:', errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, description, tags, questions, isPublished } = req.body;

      const template = new Template({
        title,
        description: description || '',
        tags: tags || [],
        questions,
        user: req.user.id,
        isPublished: isPublished || false
      });

      await template.save();
      console.log('Template created:', template._id);

      const populatedTemplate = await Template.findById(template._id)
        .populate('user', 'name email');

      res.json(populatedTemplate);
    } catch (err) {
      console.error('Error creating template:', err);
      if (err.name === 'ValidationError') {
        return res.status(400).json({ message: err.message });
      }
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   PUT api/templates/:id
// @desc    Update a template
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    console.log('Updating template:', req.params.id);
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      console.error('Invalid template ID:', req.params.id);
      return res.status(400).json({ message: 'Invalid template ID' });
    }

    const template = await Template.findById(req.params.id);

    if (!template) {
      console.error('Template not found:', req.params.id);
      return res.status(404).json({ message: 'Template not found' });
    }

    if (!template.canEdit(req.user.id)) {
      console.error('Access denied to edit template:', req.params.id);
      return res.status(403).json({ message: 'Access denied' });
    }

    const { title, description, tags, questions, isPublished } = req.body;

    template.title = title || template.title;
    template.description = description || template.description;
    template.tags = tags || template.tags;
    template.questions = questions || template.questions;
    template.isPublished = isPublished !== undefined ? isPublished : template.isPublished;

    await template.save();
    console.log('Template updated:', template._id);

    const populatedTemplate = await Template.findById(template._id)
      .populate('user', 'name email')
      .populate('sharedWith.user', 'name email');

    res.json(populatedTemplate);
  } catch (err) {
    console.error('Error updating template:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE api/templates/:id
// @desc    Delete a template
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    console.log('Deleting template:', req.params.id);
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      console.error('Invalid template ID:', req.params.id);
      return res.status(400).json({ message: 'Invalid template ID' });
    }

    const template = await Template.findById(req.params.id);

    if (!template) {
      console.error('Template not found:', req.params.id);
      return res.status(404).json({ message: 'Template not found' });
    }

    if (!template.canEdit(req.user.id)) {
      console.error('Access denied to delete template:', req.params.id);
      return res.status(403).json({ message: 'Access denied' });
    }

    // Soft delete by marking as archived
    template.isArchived = true;
    await template.save();
    console.log('Template archived:', template._id);

    res.json({ message: 'Template deleted' });
  } catch (err) {
    console.error('Error deleting template:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST api/templates/:id/share
// @desc    Share a template with another user
// @access  Private
router.post('/:id/share', auth, async (req, res) => {
  try {
    console.log('Sharing template:', req.params.id);
    const { email, accessType } = req.body;

    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    if (!template.canEdit(req.user.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const User = require('../models/User');
    const targetUser = await User.findOne({ email });
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already shared
    const existingShare = template.sharedWith.find(
      share => share.user.toString() === targetUser._id.toString()
    );

    if (existingShare) {
      existingShare.accessType = accessType;
    } else {
      template.sharedWith.push({
        user: targetUser._id,
        accessType
      });
    }

    await template.save();
    console.log('Template shared successfully');

    const populatedTemplate = await Template.findById(template._id)
      .populate('user', 'name email')
      .populate('sharedWith.user', 'name email');

    res.json(populatedTemplate);
  } catch (err) {
    console.error('Error sharing template:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
