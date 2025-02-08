const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required']
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  price: {
    type: Number,
    required: [true, 'Price is required']
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    enum: {
      values: ['NGN', 'USD', 'GBP', 'KES', 'GHS', 'ZAR', 'XAF', 'XOF', 'ETB', 'EGP'],
      message: '{VALUE} is not supported'
    }
  },
  category: {
    type: String,
    required: [true, 'Category is required']
  },
  location: {
    type: String,
    required: [true, 'Location is required']
  },
  images: [{
    type: String,
    required: [true, 'At least one image is required']
  }],
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  }
}, {
  timestamps: true, // Use timestamps instead of manual createdAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

module.exports = mongoose.model('Item', itemSchema);
