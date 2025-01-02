const express = require('express');
const auth = require('../middleware/auth');
const {
  createTemplate,
  getMyTemplates,
  getPublishedTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  togglePublish,
  toggleArchive
} = require('../controllers/template.controller');

const router = express.Router();

// Маршруты для работы с шаблонами
router.post('/', auth, createTemplate);
router.get('/my', auth, getMyTemplates);
router.get('/published', getPublishedTemplates);
router.get('/:id', auth, getTemplateById);
router.put('/:id', auth, updateTemplate);
router.delete('/:id', auth, deleteTemplate);
router.patch('/:id/publish', auth, togglePublish);
router.patch('/:id/archive', auth, toggleArchive);

module.exports = router;
