const Template = require('../models/Template');

// Создание нового шаблона
const createTemplate = async (req, res) => {
  try {
    const template = new Template({
      ...req.body,
      author: req.user._id
    });
    await template.save();
    res.status(201).json(template);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Получение всех шаблонов пользователя
const getMyTemplates = async (req, res) => {
  try {
    const templates = await Template.find({ author: req.user._id })
      .sort({ createdAt: -1 });
    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Получение опубликованных шаблонов
const getPublishedTemplates = async (req, res) => {
  try {
    const templates = await Template.find({ 
      isPublished: true,
      isArchived: false 
    })
    .sort({ createdAt: -1 });
    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Получение шаблона по ID
const getTemplateById = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    // Проверяем, имеет ли пользователь доступ к шаблону
    if (!template.isPublished && template.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(template);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Обновление шаблона
const updateTemplate = async (req, res) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      author: req.user._id
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    Object.assign(template, req.body);
    await template.save();
    res.json(template);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Удаление шаблона
const deleteTemplate = async (req, res) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      author: req.user._id
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    await template.remove();
    res.json({ message: 'Template deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Публикация/отмена публикации шаблона
const togglePublish = async (req, res) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      author: req.user._id
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    template.isPublished = !template.isPublished;
    await template.save();
    res.json(template);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Архивация/разархивация шаблона
const toggleArchive = async (req, res) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      author: req.user._id
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    template.isArchived = !template.isArchived;
    // Если архивируем, то снимаем с публикации
    if (template.isArchived) {
      template.isPublished = false;
    }
    await template.save();
    res.json(template);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  createTemplate,
  getMyTemplates,
  getPublishedTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  togglePublish,
  toggleArchive
};
