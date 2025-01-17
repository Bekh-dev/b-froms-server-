const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const sfClient = require('../integrations/salesforce/client');

// @route   GET api/salesforce/test-connection
// @desc    Test Salesforce connection
// @access  Public
router.get('/test-connection', async (req, res) => {
  try {
    await sfClient.login();
    res.json({ success: true, message: 'Successfully connected to Salesforce' });
  } catch (error) {
    console.error('Salesforce connection error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// @route   POST api/salesforce/sync
// @desc    Sync user with Salesforce
// @access  Private
router.post('/sync', auth, async (req, res) => {
  try {
    const { firstName, lastName, phone, title, description } = req.body;
    const { email } = req.user;

    // Create Account and Contact
    const result = await sfClient.createAccount({
      firstName,
      lastName,
      email,
      phone,
      title,
      description
    });

    // Update user with Salesforce IDs
    await req.user.updateOne({
      'integrations.salesforce': {
        accountId: result.accountId,
        contactId: result.contactId,
        synced: true,
        lastSync: new Date()
      }
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error syncing with Salesforce:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// @route   GET api/salesforce/status
// @desc    Get Salesforce sync status
// @access  Private
router.get('/status', auth, async (req, res) => {
  try {
    const { integrations } = req.user;
    
    if (!integrations?.salesforce?.synced) {
      return res.json({ synced: false });
    }

    // Get account details from Salesforce
    await sfClient.login();
    const account = await sfClient.getAccount(integrations.salesforce.accountId);

    res.json({
      synced: true,
      lastSync: integrations.salesforce.lastSync,
      account
    });
  } catch (error) {
    console.error('Error getting Salesforce status:', error);
    res.status(500).json({ message: 'Error getting Salesforce status' });
  }
});

module.exports = router;
