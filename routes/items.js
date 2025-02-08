const express = require('express');
const router = express.Router();  // Initialize router
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const Item = require('../models/Item');
const { check, validationResult } = require('express-validator');

// Get all items
router.get('/', async (req, res) => {
  try {
    const items = await Item.find()
      .sort({ createdAt: -1 })
      .populate('user', 'name avatar');
    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create item
router.post('/', [
  auth,
  upload.array('media', 3),
  [
    check('name', 'Name is required').notEmpty(),
    check('description', 'Description is required').notEmpty(),
    check('price', 'Price must be a number').isNumeric(),
    check('currency', 'Currency is required').notEmpty(),
    check('category', 'Category is required').notEmpty(),
    check('location', 'Location is required').notEmpty()
  ]
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const images = req.files.map(file => file.path);
    
    const item = new Item({
      name: req.body.name,
      description: req.body.description,
      price: req.body.price,
      currency: req.body.currency,
      category: req.body.category,
      location: req.body.location,
      images: images,
      user: req.user.userId
    });

    await item.save();
    
    const populatedItem = await Item.findById(item._id).populate('user', 'name avatar');
    res.status(201).json(populatedItem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get item by ID
router.get('/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).populate('user', 'name avatar');
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update item
router.put('/:id', [auth, upload.array('media', 3)], async (req, res) => {
  try {
    let item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    if (item.user.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updates = { ...req.body };
    if (req.files?.length > 0) {
      updates.images = req.files.map(file => file.path);
    }

    item = await Item.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true }
    ).populate('user', 'name avatar');

    res.json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete item
router.delete('/:id', auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    if (item.user.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await item.remove();
    res.json({ message: 'Item removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
