const express = require('express');
const router = express.Router();
const UserWallet = require('../models/UserWallet');

// POST /api/wallet/connect
router.post('/connect', async (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ success: false, message: 'Address required' });

  try {
    let user = await UserWallet.findOne({ address });
    if (!user) {
      user = await UserWallet.create({ address });
    }
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error registering address' });
  }
});

// GET /api/wallet/list
router.get('/list', async (req, res) => {
  try {
    const users = await UserWallet.find();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching users' });
  }
});
// POST /api/wallet/mark-token
router.post('/mark-token', async (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ success: false, message: 'Address required' });

  try {
    await UserWallet.updateOne({ address }, { hasToken: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating user' });
  }
});
module.exports = router;