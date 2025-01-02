const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['text', 'textarea', 'number', 'select', 'radio', 'checkbox']
  },
  label: {
    type: String,
    required: true,
    trim: true
  },
  required: {
    type: Boolean,
    default: false
  },
  options: [{
    type: String,
    trim: true
  }]
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
  isPublic: {
    type: Boolean,
    default: false
  },
  questions: [questionSchema],
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sharedWith: [{
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    accessType: {
      type: String,
      enum: ['view', 'respond'],
      default: 'respond'
    }
  }],
  shareableLink: {
    type: String,
    unique: true,
    sparse: true
  }
}, {
  timestamps: true
});

// Метод для проверки доступа пользователя к шаблону
templateSchema.methods.canAccess = function(userEmail) {
  if (this.isPublic) return true;
  if (this.creator.email === userEmail) return true;
  return this.sharedWith.some(share => share.email === userEmail);
};

// Метод для генерации уникальной ссылки для шаринга
templateSchema.methods.generateShareableLink = function() {
  this.shareableLink = `${process.env.CLIENT_URL}/templates/shared/${this._id}/${Math.random().toString(36).substring(2, 15)}`;
  return this.shareableLink;
};

module.exports = mongoose.model('Template', templateSchema);
