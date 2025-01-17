const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Response = require('../models/Response');

// @route   GET api/responses
// @desc    Get all responses
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const responses = await Response.find({ user: req.user.id });
    res.json(responses);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/responses
// @desc    Create a response
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const newResponse = new Response({
      user: req.user.id,
      template: req.body.templateId,
      data: req.body.data
    });

    const response = await newResponse.save();
    res.json(response);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
