'use strict';

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TalentNest HR Platform API',
      version: '1.0.0',
      description: 'Professional recruitment and applicant tracking system API. Documentation generated automatically from Service-Oriented backend code.',
      contact: { name: 'TalentNest HR Dev Team' },
    },
    servers: [
      { url: '/api', description: 'Internal Base URL' },
      { url: 'https://talent-nest-backend.up.railway.app/api', description: 'Production API' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'], // Path to the API docs in routes files
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }', // cleaner professional look
    customSiteTitle: 'TalentNest API Documentation',
  }));
};
