const mongoose = require('mongoose');

const fieldSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['text', 'number', 'email', 'date', 'select', 'radio', 'checkbox']
  },
  label: {
    type: String,
    required: true
  },
  placeholder: String,
  required: {
    type: Boolean,
    default: false
  },
  options: [{
    label: String,
    value: String
  }],
  validation: {
    min: Number,
    max: Number,
    pattern: String,
    message: String
  }
});

const templateSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  tags: [{
    type: String,
    trim: true
  }],
  fields: [fieldSchema],
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  submissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Submission'
  }]
}, {
  timestamps: true
});

// Add text search indexes
templateSchema.index({ 
  title: 'text', 
  description: 'text', 
  tags: 'text' 
});

// Pre-save middleware to validate fields
templateSchema.pre('save', function(next) {
  // Validate that select, radio, and checkbox fields have options
  const hasInvalidField = this.fields.some(field => {
    if (['select', 'radio', 'checkbox'].includes(field.type)) {
      return !field.options || field.options.length === 0;
    }
    return false;
  });

  if (hasInvalidField) {
    next(new Error('Select, radio, and checkbox fields must have options'));
  }

  next();
});

// Method to check if user can access template
templateSchema.methods.canAccess = function(userId) {
  return this.isPublished || this.user.toString() === userId;
};

// Method to check if user can edit template
templateSchema.methods.canEdit = function(userId) {
  return this.user.toString() === userId;
};

const Template = mongoose.model('Template', templateSchema);

module.exports = Template;
