import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './config/index.js';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'C3M Centralia API',
      version: '1.0.0',
      description: 'Business management, clinical records, and appointment booking system',
      contact: {
        name: 'API Support',
        email: 'support@c3mcentral.com',
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.server.port}`,
        description: 'Development server',
      },
      {
        url: 'https://api.yourdomain.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'error',
            },
            message: {
              type: 'string',
              example: 'Error message',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            name: {
              type: 'string',
              example: 'John Doe',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john@example.com',
            },
            role: {
              type: 'string',
              enum: ['admin', 'specialist', 'client'],
              example: 'client',
            },
            phone: {
              type: 'string',
              example: '+1234567890',
            },
            avatar: {
              type: 'string',
              example: 'https://example.com/avatar.jpg',
            },
            isActive: {
              type: 'boolean',
              example: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Business: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
            },
            user: {
              type: 'string',
              description: 'User ID',
            },
            name: {
              type: 'string',
              example: 'Wellness Center',
            },
            description: {
              type: 'string',
              example: 'Premium wellness services',
            },
            ruc: {
              type: 'string',
              example: '12345678901',
            },
            physicalLocation: {
              type: 'boolean',
              example: true,
            },
            address: {
              type: 'string',
              example: '123 Main Street',
            },
            remoteSessions: {
              type: 'boolean',
              example: true,
            },
            photoUrl: {
              type: 'string',
              example: 'https://example.com/business.jpg',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Service: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
            },
            business: {
              type: 'string',
              description: 'Business ID',
            },
            name: {
              type: 'string',
              example: 'Massage Therapy',
            },
            durationMinutes: {
              type: 'number',
              example: 60,
            },
            price: {
              type: 'number',
              example: 75.0,
            },
            description: {
              type: 'string',
              example: 'Relaxing full body massage',
            },
            active: {
              type: 'boolean',
              example: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Specialist: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
            },
            user: {
              type: 'string',
              description: 'User ID',
            },
            business: {
              type: 'string',
              description: 'Business ID',
            },
            specialty: {
              type: 'string',
              example: 'Physical Therapy',
            },
            availability: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  dayOfWeek: {
                    type: 'string',
                    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
                    example: 'monday',
                  },
                  startTime: {
                    type: 'string',
                    pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
                    example: '09:00',
                  },
                  endTime: {
                    type: 'string',
                    pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
                    example: '17:00',
                  },
                  available: {
                    type: 'boolean',
                    example: true,
                  },
                },
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Reservation: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
            },
            user: {
              type: 'string',
              description: 'Client User ID',
            },
            business: {
              type: 'string',
              description: 'Business ID',
            },
            specialist: {
              type: 'string',
              description: 'Specialist ID',
            },
            service: {
              type: 'string',
              description: 'Service ID',
            },
            startTime: {
              type: 'string',
              format: 'date-time',
              example: '2024-12-25T09:00:00.000Z',
            },
            endTime: {
              type: 'string',
              format: 'date-time',
              example: '2024-12-25T10:00:00.000Z',
            },
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'cancelled', 'completed'],
              example: 'pending',
            },
            notes: {
              type: 'string',
              example: 'First time appointment',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        ClinicalRecord: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
            },
            user: {
              type: 'string',
              description: 'Patient User ID',
            },
            weight: {
              type: 'number',
              example: 70.5,
            },
            height: {
              type: 'number',
              example: 175,
            },
            bmi: {
              type: 'number',
              example: 23.02,
            },
            diseases: {
              type: 'array',
              items: {
                type: 'string',
              },
              example: ['Hypertension'],
            },
            disability: {
              type: 'string',
              example: 'None',
            },
            diagnosis: {
              type: 'string',
              example: 'Patient shows signs of...',
            },
            treatment: {
              type: 'string',
              example: 'Prescribed medication...',
            },
            notes: {
              type: 'string',
              example: 'Follow-up in 2 weeks',
            },
            createdBy: {
              type: 'string',
              description: 'Specialist User ID',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Attachment: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
            },
            ownerType: {
              type: 'string',
              example: 'ClinicalRecord',
            },
            ownerId: {
              type: 'string',
              description: 'Reference to owner document',
            },
            url: {
              type: 'string',
              example: 'https://s3.amazonaws.com/bucket/file.pdf',
            },
            type: {
              type: 'string',
              enum: ['image', 'document', 'other'],
              example: 'document',
            },
            metadata: {
              type: 'object',
              properties: {
                filename: {
                  type: 'string',
                  example: 'lab_results.pdf',
                },
                size: {
                  type: 'number',
                  example: 1024000,
                },
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication endpoints',
      },
      {
        name: 'Businesses',
        description: 'Business management endpoints',
      },
      {
        name: 'Services',
        description: 'Service management endpoints',
      },
      {
        name: 'Specialists',
        description: 'Specialist management endpoints',
      },
      {
        name: 'Reservations',
        description: 'Appointment booking endpoints',
      },
      {
        name: 'Clinical Records',
        description: 'Medical records endpoints',
      },
    ],
  },
  apis: ['./src/routes/*.ts'], // Path to the API routes
};

export const swaggerSpec = swaggerJsdoc(options);
