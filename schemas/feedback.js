const Joi = require('joi');

const feedbackSchema = Joi.object({
  sessionId: Joi.string().uuid().required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  helpful: Joi.boolean().required(),
  comments: Joi.string().max(1000).optional(),
  categories: Joi.array().items(Joi.string().valid(
    'accuracy',
    'clarity',
    'usefulness',
    'completeness',
    'relevance'
  )).max(5).optional(),
  submittedAt: Joi.date().iso().required()
});

module.exports = {
  feedbackSchema
};
