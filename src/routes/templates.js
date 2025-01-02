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
    const templates = await Template.find({ 
      isPublished: true, 
      isArchived: false 
    }).populate('user', 'name email');
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
    const templates = await Template.find({ 
      user: req.user.id 
    }).populate('user', 'name email');
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
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid template ID' });
    }

    const template = await Template.findById(req.params.id)
      .populate('user', 'name email');
      
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    // Check if template is public or belongs to user
    if (!template.isPublished && template.user._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
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
      check('fields', 'Fields must be an array').isArray()
    ]
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, description, tags, fields } = req.body;

      const template = new Template({
        title,
        description: description || '',
        tags: tags || [],
        fields: fields || [],
        user: req.user.id,
        isPublished: false,
        isArchived: false
      });

      const savedTemplate = await template.save();
      await savedTemplate.populate('user', 'name email');
      
      res.json(savedTemplate);
    } catch (err) {
      console.error('Error creating template:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   PUT api/templates/:id
// @desc    Update a template
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid template ID' });
    }

    const template = await Template.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Make sure user owns template
    if (template.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update fields
    const { title, description, tags, fields, isPublished, isArchived } = req.body;
    
    if (title) template.title = title;
    if (description !== undefined) template.description = description;
    if (tags) template.tags = tags;
    if (fields) template.fields = fields;
    if (isPublished !== undefined) template.isPublished = isPublished;
    if (isArchived !== undefined) template.isArchived = isArchived;

    const updatedTemplate = await template.save();
    await updatedTemplate.populate('user', 'name email');
    
    res.json(updatedTemplate);
  } catch (err) {
    console.error('Error updating template:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE api/templates/:id
// @desc    Delete a template
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid template ID' });
    }

    const template = await Template.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Make sure user owns template
    if (template.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Template.findByIdAndDelete(req.params.id);
    res.json({ message: 'Template deleted' });
  } catch (err) {
    console.error('Error deleting template:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
