const mongoose = require('mongoose');

const DEFAULT_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNTYgMjU2Ij48Y2lyY2xlIGN4PSIxMjgiIGN5PSIxMjgiIHI9IjEyOCIgZmlsbD0iI2U2ZTZlNiIvPjxjaXJjbGUgY3g9IjEyOCIgY3k9IjkwIiByPSI0MCIgZmlsbD0iI2M0YzRjNCIvPjxwYXRoIGQ9Ik02NCAyMjBjMC00NCA0MC04MCAxMjgtODBzMTI4IDM2IDEyOCA4MHoiIGZpbGw9IiNjNGM0YzQiLz48L3N2Zz4=';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  avatar: { type: String, default: DEFAULT_AVATAR },

  // ✅ New Fields
  location: { type: String, trim: true, default: "" }, // Optional location
  dob: { type: Date, default: null } // Optional date of birth
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

userSchema.pre('save', function(next) {
  if (this.avatar === DEFAULT_AVATAR && this.name) {
    const initial = this.name.charAt(0).toUpperCase();
    this.avatar = `data:image/svg+xml;base64,${Buffer.from(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
        <rect width="256" height="256" fill="#${Math.floor(Math.random()*16777215).toString(16)}"/>
        <text x="50%" y="50%" dy=".1em"
              font-family="Arial" font-size="128" fill="white"
              text-anchor="middle" dominant-baseline="middle">
          ${initial}
        </text>
      </svg>
    `).toString('base64')}`;
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
