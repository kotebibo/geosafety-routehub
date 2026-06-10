import swaggerJsdoc from 'swagger-jsdoc'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'RouteHub API',
      version: '1.0.0',
      description:
        'API documentation for RouteHub — fleet management, payments, documents, and inspections.',
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Local development' },
      { url: 'https://geosafety.routehub.ge', description: 'Production (master)' },
      { url: 'https://team2.routehub.ge', description: 'Team 2' },
      { url: 'https://team3.routehub.ge', description: 'Team 3' },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'sb-access-token',
          description: 'Supabase session cookie (set automatically after login)',
        },
        cronSecret: {
          type: 'apiKey',
          in: 'header',
          name: 'authorization',
          description: 'Bearer token matching CRON_SECRET env var (for scheduled jobs)',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        ValidationError: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Validation failed' },
            details: { type: 'array', items: { type: 'object' } },
          },
        },
      },
    },
    security: [{ cookieAuth: [] }],
  },
  apis: ['./app/api/**/route.ts'],
}

export const swaggerSpec = swaggerJsdoc(options)
