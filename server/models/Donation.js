const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  donor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  foodType: {
    type: String,
    required: true,
    enum: ['fresh', 'canned', 'frozen', 'baked', 'dairy', 'produce', 'meat', 'pantry', 'other']
  },
  quantity: {
    amount: {
      type: Number,
      required: true,
      min: 1
    },
    unit: {
      type: String,
      required: true,
      enum: ['pounds', 'kilograms', 'servings', 'items', 'boxes', 'containers']
    }
  },
  allergens: [{
    type: String,
    enum: ['nuts', 'dairy', 'gluten', 'soy', 'eggs', 'shellfish', 'wheat', 'fish', 'none']
  }],
  preparationDate: {
    type: Date,
    required: true
  },
  expiryDate: {
    type: Date,
    required: true
  },
  pickupWindow: {
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      required: true
    }
  },
  location: {
    address: {
      street: {
        type: String,
        required: true
      },
      city: {
        type: String,
        required: true
      },
      state: {
        type: String,
        required: true
      },
      zipCode: {
        type: String,
        required: true
      },
      country: {
        type: String,
        default: 'USA'
      }
    },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        required: true
      }
    },
    instructions: {
      type: String,
      trim: true,
      maxlength: 200
    }
  },
  status: {
    type: String,
    enum: ['available', 'claimed', 'picked-up', 'completed', 'expired', 'cancelled'],
    default: 'available'
  },
  claimedBy: {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    claimedAt: {
      type: Date
    },
    pickupTime: {
      type: Date
    },
    completedAt: {
      type: Date
    }
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    caption: {
      type: String,
      trim: true
    }
  }],
  tags: [{
    type: String,
    trim: true
  }],
  isUrgent: {
    type: Boolean,
    default: false
  },
  specialInstructions: {
    type: String,
    trim: true,
    maxlength: 300
  },
  notifications: {
    emailSent: {
      type: Boolean,
      default: false
    },
    smsSent: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Index for geospatial queries
donationSchema.index({ "location.coordinates": "2dsphere" });

// Index for status and date queries
donationSchema.index({ status: 1, "pickupWindow.startTime": 1 });
donationSchema.index({ donor: 1, status: 1 });
donationSchema.index({ "claimedBy.recipient": 1 });

// Virtual for distance calculation (will be populated by application logic)
donationSchema.virtual('distance').get(function() {
  return this._distance;
});

// Method to check if donation is still available
donationSchema.methods.isAvailable = function() {
  const now = new Date();
  return this.status === 'available' && 
         this.pickupWindow.endTime > now && 
         this.expiryDate > now;
};

// Method to check if donation is expired
donationSchema.methods.isExpired = function() {
  const now = new Date();
  return this.expiryDate <= now;
};

// Method to get pickup window status
donationSchema.methods.getPickupWindowStatus = function() {
  const now = new Date();
  if (now < this.pickupWindow.startTime) {
    return 'upcoming';
  } else if (now >= this.pickupWindow.startTime && now <= this.pickupWindow.endTime) {
    return 'active';
  } else {
    return 'expired';
  }
};

// Pre-save middleware to update status based on dates
donationSchema.pre('save', function(next) {
  if (this.isExpired() && this.status === 'available') {
    this.status = 'expired';
  }
  next();
});

// Ensure virtual fields are serialized
donationSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Donation', donationSchema); 