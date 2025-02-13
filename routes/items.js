const express = require('express');
const router = express.Router();  // Initialize router
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const Item = require('../models/Item');
const { check, validationResult } = require('express-validator');

// Define routes, accepting the sendOfferNotification function as parameter
module.exports = function(sendOfferNotification) {

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
    upload.array('media', 3),  // Ensure multer is set up correctly
    [
      check('name', 'Name is required').notEmpty(),
      check('description', 'Description is required').notEmpty(),
      check('price', 'Price must be a number').isNumeric(),
      check('currency', 'Currency is required').notEmpty(),
      check('category', 'Category is required').notEmpty(),
      check('location', 'Location is required').notEmpty()
    ]
  ], async (req, res) => {

    console.log("🟢 Incoming POST /api/items request");

    // Check request authentication
    if (!req.user) {
      console.log("❌ Authentication failed: No user attached to request");
      return res.status(401).json({ error: "Unauthorized" });
    }

    console.log("🟢 Authenticated user:", req.user.userId);

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("❌ Validation failed:", errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Check if files were uploaded
      console.log("🟢 Uploaded files:", req.files);

      if (!req.files || req.files.length === 0) {
        console.log("❌ No files uploaded");
        return res.status(400).json({ error: "No media files uploaded" });
      }

      const images = req.files.map(file => file.path);
      console.log("🟢 Processed image paths:", images);

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

      console.log("🟢 Saving item to database:", item);
      await item.save();

      // Populate user info in response
      const populatedItem = await Item.findById(item._id).populate('user', 'name avatar');
      console.log("✅ Item saved successfully:", populatedItem);
      res.status(201).json(populatedItem);
    } catch (error) {
      console.error("🔥 Server Error:", error);
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

  // Handle make-offer request
  router.post("/make-offer", auth, async (req, res) => {
    const { itemId } = req.body;

    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      // Fetch the item to get the seller (user who posted it)
      const item = await Item.findById(itemId).populate("user", "_id");

      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      const sellerId = item.user._id; // Seller ID from the item

      // Use sendOfferNotification function to emit the event
      sendOfferNotification(sellerId.toString(), req.user.userId, itemId);

      res.json({ success: true, message: "Offer sent successfully" });
    } catch (error) {
      console.error("🔥 Error making offer:", error);
      res.status(500).json({ error: "Server error" });
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

  return router;
};
