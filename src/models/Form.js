const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  question: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  }
});

const formSchema = new mongoose.Schema({
  template: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Template',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  answers: [answerSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Обновляем updatedAt при изменении ответов
formSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Form', formSchema);
