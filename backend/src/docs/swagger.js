import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'IMAX API',
      version: '1.0.0',
      description: 'Documentação da API IMAX com Swagger',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{
      bearerAuth: []
    }],
  },
  apis: ['./src/routes/*.js'], // Ajuste conforme onde estão suas rotas
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
