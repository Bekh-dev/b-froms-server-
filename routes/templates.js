const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Template = require('../models/Template');

// Get all public templates
router.get('/public', async (req, res) => {
  try {
    const templates = await Template.find({ 
      isPublished: true, 
      isArchived: false 
    }).populate('user', 'name email');
    res.json(templates);
  } catch (err) {
    console.error('Error in /public route:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's templates
router.get('/my', auth, async (req, res) => {
  try {
    const templates = await Template.find({ 
      user: req.user.id 
    }).populate('user', 'name email');
    res.json(templates);
  } catch (err) {
    console.error('Error in /my route:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single template
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
    console.error('Error in /:id route:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create template
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, tags, fields, text } = req.body;
    
    const template = new Template({
      title: title || 'Untitled Template',
      description: description || '',
      tags: tags || [],
      fields: fields || [],
      text: text || '',
      user: req.user.id,
      isPublished: false,
      isArchived: false
    });

    const savedTemplate = await template.save();
    await savedTemplate.populate('user', 'name email');
    res.status(201).json(savedTemplate);
  } catch (err) {
    console.error('Error in POST / route:', err);
    res.status(400).json({ message: err.message });
  }
});

// Update template
router.put('/:id', auth, async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid template ID' });
    }

    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    if (template.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updatedTemplate = await Template.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    ).populate('user', 'name email');

    res.json(updatedTemplate);
  } catch (err) {
    console.error('Error in PUT /:id route:', err);
    res.status(400).json({ message: err.message });
  }
});

// Delete template
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid template ID' });
    }

    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    if (template.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Template.findByIdAndDelete(req.params.id);
    res.json({ message: 'Template deleted' });
  } catch (err) {
    console.error('Error in DELETE /:id route:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
