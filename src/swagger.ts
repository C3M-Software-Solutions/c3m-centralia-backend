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
        url: 'https://c3m-centralia-backend.vercel.app',
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
              oneOf: [
                { type: 'string', description: 'User ID (when not populated)' },
                {
                  type: 'object',
                  description: 'User details (when populated)',
                  properties: {
                    _id: { type: 'string' },
                    name: { type: 'string', example: 'Dr. Juan Pérez' },
                    email: { type: 'string', example: 'doctor@example.com' },
                    phone: { type: 'string', example: '+1234567890' },
                    avatar: { type: 'string', example: 'https://example.com/avatar.jpg' },
                  },
                },
              ],
            },
            business: {
              oneOf: [
                { type: 'string', description: 'Business ID (when not populated)' },
                {
                  type: 'object',
                  description: 'Business details (when populated)',
                  properties: {
                    _id: { type: 'string' },
                    name: { type: 'string', example: 'Clínica Central' },
                    address: { type: 'string', example: 'Av. Principal 123' },
                    phone: { type: 'string', example: '+987654321' },
                    email: { type: 'string', example: 'clinica@example.com' },
                  },
                },
              ],
            },
            specialty: {
              type: 'string',
              example: 'Physical Therapy',
            },
            licenseNumber: {
              type: 'string',
              example: 'LIC-12345',
            },
            bio: {
              type: 'string',
              example: 'Specialist with 10+ years of experience',
            },
            availability: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  day: {
                    type: 'string',
                    enum: [
                      'monday',
                      'tuesday',
                      'wednesday',
                      'thursday',
                      'friday',
                      'saturday',
                      'sunday',
                    ],
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
                  isAvailable: {
                    type: 'boolean',
                    example: true,
                  },
                },
              },
            },
            services: {
              type: 'array',
              items: {
                oneOf: [
                  { type: 'string', description: 'Service ID (when not populated)' },
                  {
                    type: 'object',
                    description: 'Service details (when populated)',
                    properties: {
                      _id: { type: 'string' },
                      name: { type: 'string', example: 'General Consultation' },
                      description: { type: 'string', example: 'Standard medical consultation' },
                      duration: { type: 'number', example: 30 },
                      price: { type: 'number', example: 50 },
                      category: { type: 'string', example: 'Consultation' },
                    },
                  },
                ],
              },
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
        Reservation: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
            },
            user: {
              oneOf: [
                {
                  type: 'string',
                  description: 'Client User ID (when not populated)',
                },
                {
                  type: 'object',
                  description: 'Client user details (when populated)',
                  properties: {
                    _id: { type: 'string' },
                    name: { type: 'string', example: 'John Doe' },
                    email: { type: 'string', example: 'client@example.com' },
                    phone: { type: 'string', example: '+1234567890' },
                    avatar: { type: 'string', example: 'https://example.com/avatar.jpg' },
                  },
                },
              ],
            },
            business: {
              oneOf: [
                {
                  type: 'string',
                  description: 'Business ID (when not populated)',
                },
                {
                  type: 'object',
                  description: 'Business details (when populated)',
                  properties: {
                    _id: { type: 'string' },
                    name: { type: 'string', example: 'Clínica Central' },
                    address: { type: 'string', example: 'Av. Principal 123' },
                    phone: { type: 'string', example: '+987654321' },
                    email: { type: 'string', example: 'clinica@example.com' },
                  },
                },
              ],
            },
            specialist: {
              oneOf: [
                {
                  type: 'string',
                  description: 'Specialist ID (when not populated)',
                },
                {
                  type: 'object',
                  description: 'Specialist details (when populated)',
                  properties: {
                    _id: { type: 'string' },
                    specialty: { type: 'string', example: 'Physical Therapy' },
                    licenseNumber: { type: 'string', example: 'LIC-12345' },
                    bio: { type: 'string', example: 'Experienced specialist' },
                    user: {
                      type: 'object',
                      properties: {
                        _id: { type: 'string' },
                        name: { type: 'string', example: 'Dr. Juan Pérez' },
                        email: { type: 'string', example: 'doctor@example.com' },
                        phone: { type: 'string', example: '+1234567890' },
                        avatar: { type: 'string', example: 'https://example.com/avatar.jpg' },
                      },
                    },
                    availability: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          day: { type: 'string', example: 'monday' },
                          startTime: { type: 'string', example: '09:00' },
                          endTime: { type: 'string', example: '17:00' },
                          isAvailable: { type: 'boolean', example: true },
                        },
                      },
                    },
                    services: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          _id: { type: 'string' },
                          name: { type: 'string', example: 'Consultation' },
                          description: { type: 'string', example: 'General consultation' },
                          duration: { type: 'number', example: 30 },
                          price: { type: 'number', example: 50 },
                          category: { type: 'string', example: 'Medical' },
                        },
                      },
                    },
                  },
                },
              ],
            },
            service: {
              oneOf: [
                {
                  type: 'string',
                  description: 'Service ID (when not populated)',
                },
                {
                  type: 'object',
                  description: 'Service details (when populated)',
                  properties: {
                    _id: { type: 'string' },
                    name: { type: 'string', example: 'General Consultation' },
                    description: { type: 'string', example: 'Standard medical consultation' },
                    duration: { type: 'number', example: 30 },
                    price: { type: 'number', example: 50 },
                    category: { type: 'string', example: 'Medical' },
                  },
                },
              ],
            },
            startDate: {
              type: 'string',
              format: 'date-time',
              example: '2024-12-25T09:00:00.000Z',
            },
            endDate: {
              type: 'string',
              format: 'date-time',
              example: '2024-12-25T10:00:00.000Z',
            },
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no-show'],
              example: 'pending',
              description: 'Reservation status. Email notifications are sent on status changes.',
            },
            notes: {
              type: 'string',
              example: 'First time appointment',
            },
            cancellationReason: {
              type: 'string',
              example: 'Schedule conflict',
            },
            reminderSent: {
              type: 'boolean',
              example: false,
              description:
                'Flag to track if 24-hour reminder email has been sent. Auto-set by cron job.',
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
        description:
          'Appointment booking endpoints. Automatic email notifications are sent on create, confirm, and cancel. 24-hour reminders are sent by cron job.',
      },
      {
        name: 'Clinical Records',
        description: 'Medical records endpoints',
      },
      {
        name: 'Upload',
        description: 'File upload and management endpoints (supports local, S3, and Cloudinary)',
      },
      {
        name: 'Notifications',
        description:
          'Automatic email notification system. Sends emails on reservation lifecycle events (create, confirm, cancel) and 24-hour appointment reminders via cron job (runs hourly).',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './dist/routes/*.js'], // Scan both source and compiled files
};

export const swaggerSpec = swaggerJsdoc(options);
