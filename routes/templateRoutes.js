const express = require('express');
const router = express.Router();
const Template = require('../models/Template');
const Response = require('../models/Response');
const { auth, optionalAuth } = require('../middleware/auth');
const User = require('../models/User');

// Create template
router.post('/', auth, async (req, res) => {
  try {
    const template = new Template({
      ...req.body,
      creator: req.user.id
    });

    await template.save();
    await template.populate('creator', '-password');
    
    res.status(201).json(template);
  } catch (error) {
    console.error('Create template error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: Object.values(error.errors).map(err => err.message).join(', ') 
      });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's templates
router.get('/my', auth, async (req, res) => {
  try {
    const templates = await Template.find({ creator: req.user.id })
      .populate('creator', '-password')
      .sort({ createdAt: -1 });
    res.json(templates);
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get public templates
router.get('/public', async (req, res) => {
  try {
    const templates = await Template.find({ isPublic: true })
      .populate('creator', '-password')
      .sort({ createdAt: -1 });
    res.json(templates);
  } catch (error) {
    console.error('Get public templates error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get template by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const template = await Template.findById(req.params.id)
      .populate('creator', '-password');
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Проверяем доступ
    if (!template.isPublic && (!req.user || (req.user.id !== template.creator.toString() && 
        !template.sharedWith.some(share => share.email === req.user.email)))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(template);
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update template
router.put('/:id', auth, async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    if (template.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    Object.assign(template, req.body);
    await template.save();
    await template.populate('creator', '-password');

    res.json(template);
  } catch (error) {
    console.error('Update template error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: Object.values(error.errors).map(err => err.message).join(', ') 
      });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete template
router.delete('/:id', auth, async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    if (template.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await template.remove();
    res.json({ message: 'Template deleted' });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Share template
router.post('/:id/share', auth, async (req, res) => {
  try {
    const { email, accessType } = req.body;
    const template = await Template.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    if (template.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only template creator can share' });
    }

    const shareIndex = template.sharedWith.findIndex(s => s.email === email);
    if (shareIndex > -1) {
      template.sharedWith[shareIndex].accessType = accessType;
    } else {
      template.sharedWith.push({ email, accessType });
    }

    await template.save();
    await template.populate('creator', '-password');
    
    res.json(template);
  } catch (error) {
    console.error('Share template error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit response
router.post('/:id/responses', optionalAuth, async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Проверяем доступ
    if (!template.isPublic && (!req.user || (req.user.id !== template.creator.toString() && 
        !template.sharedWith.some(share => share.email === req.user.email)))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const response = new Response({
      template: template._id,
      answers: req.body.answers,
      respondent: req.user ? req.user.id : null
    });

    await response.save();
    res.status(201).json(response);
  } catch (error) {
    console.error('Submit response error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get template responses
router.get('/:id/responses', auth, async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    if (template.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only template creator can view responses' });
    }

    const responses = await Response.find({ template: req.params.id })
      .populate('respondent', 'name email')
      .sort({ createdAt: -1 });
    
    res.json(responses);
  } catch (error) {
    console.error('Get responses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
