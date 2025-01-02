const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
  template: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Template',
    required: true
  },
  respondent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  answers: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    required: true
  }
}, {
  timestamps: true
});

// Индексы для быстрого поиска
responseSchema.index({ template: 1, createdAt: -1 });
responseSchema.index({ respondent: 1, createdAt: -1 });

const Response = mongoose.model('Response', responseSchema);

module.exports = Response;
