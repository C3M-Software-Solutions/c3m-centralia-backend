# C3M Centralia Backend

Business management, clinical records, and appointment booking system API built with Node.js, Express, TypeScript, and MongoDB.

## 🌟 Features

- 🔐 **Authentication & Authorization**: JWT-based authentication with role-based access control (Admin, Specialist, Client)
- 🏢 **Business Management**: CRUD operations for businesses with profile management
- 📅 **Reservation System**: Smart appointment booking with conflict detection and availability checking
- 📋 **Clinical Records**: Comprehensive medical history management with attachments
- 👨‍⚕️ **Specialist Management**: Availability scheduling and specialty management
- 💼 **Service Management**: Flexible service offerings with pricing and duration
- 🔒 **Security**: Helmet, CORS, input validation, password hashing with bcrypt
- 📝 **TypeScript**: Full type safety throughout the application
- ✅ **Validation**: Request validation using express-validator
- 📎 **File Uploads**: Support for attachments (images, documents)
- 📧 **Email Notifications**: Nodemailer integration ready

## 🛠️ Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js 4.18+
- **Language**: TypeScript 5.3+
- **Database**: MongoDB 8.0+ with Mongoose ODM
- **Authentication**: JWT (jsonwebtoken)
- **Security**: bcryptjs, helmet, cors
- **Validation**: express-validator
- **File Upload**: multer
- **Email**: nodemailer
- **Cloud Storage**: AWS SDK (S3 ready)

## 📁 Project Structure

```
src/
├── config/           # Configuration files
│   ├── database.ts   # MongoDB connection
│   └── index.ts      # App configuration
├── controllers/      # Request handlers
│   ├── authController.ts           # User authentication
│   ├── businessController.ts       # Business operations
│   ├── clinicalRecordController.ts # Medical records
│   └── reservationController.ts    # Appointments
├── middleware/       # Express middleware
│   ├── auth.ts       # Authentication & authorization
│   ├── errorHandler.ts # Global error handling
│   └── validate.ts   # Validation middleware
├── models/          # Mongoose schemas
│   ├── Attachment.ts      # File attachments
│   ├── Business.ts        # Business entities
│   ├── ClinicalRecord.ts  # Medical records
│   ├── Reservation.ts     # Appointments
│   ├── Service.ts         # Business services
│   ├── Specialist.ts      # Healthcare providers
│   └── User.ts           # User accounts
├── routes/          # API routes
│   ├── authRoutes.ts
│   ├── businessRoutes.ts
│   ├── clinicalRecordRoutes.ts
│   ├── reservationRoutes.ts
│   └── index.ts
├── utils/           # Utility functions
│   ├── jwt.ts       # JWT helpers
│   └── password.ts  # Password hashing
└── server.ts        # Application entry point
├── routes/          # API routes
│   ├── authRoutes.ts
│   ├── businessRoutes.ts
│   ├── clinicalRecordRoutes.ts
│   ├── reservationRoutes.ts
│   └── index.ts
├── utils/           # Utility functions
│   ├── jwt.ts       # JWT utilities
│   └── password.ts  # Password hashing
└── server.ts        # Application entry point
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (v6 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd c3m_centralia_backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure your `.env` file with your settings:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/c3m_centralia
JWT_SECRET=your_secret_key_here
# ... other variables
```

5. Start MongoDB:
```bash
# Using local MongoDB
mongod

# Or use MongoDB Atlas cloud connection
```

6. Run the development server:
```bash
npm run dev
```

The server will start on `http://localhost:5000`

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (protected)
- `PUT /api/auth/profile` - Update user profile (protected)

### Business
- `POST /api/businesses` - Create business (specialist/admin)
- `GET /api/businesses` - Get all businesses
- `GET /api/businesses/:id` - Get business by ID
- `PUT /api/businesses/:id` - Update business (owner/admin)
- `DELETE /api/businesses/:id` - Delete business (owner/admin)

### Reservations
- `POST /api/reservations` - Create reservation (authenticated)
- `GET /api/reservations` - Get reservations (filtered by role)
- `GET /api/reservations/availability` - Check availability
- `GET /api/reservations/:id` - Get reservation by ID
- `PUT /api/reservations/:id/status` - Update reservation status

### Clinical Records
- `POST /api/clinical-records` - Create clinical record (specialist/admin)
- `GET /api/clinical-records` - Get clinical records (filtered by role)
- `GET /api/clinical-records/:id` - Get clinical record by ID
- `PUT /api/clinical-records/:id` - Update clinical record (specialist/admin)

## Data Models

### User
- name, email, password, role (admin/specialist/client)
- phone, avatar, isActive
- timestamps

### Business
- user (reference), name, description, photoUrl
- ruc, address, hasPremises, hasRemoteSessions
- schedule, phone, email, isActive
- timestamps

### Service
- business (reference), name, description
- duration (minutes), price, category, isActive
- timestamps

### Specialist
- user (reference), business (reference)
- specialty, licenseNumber, bio
- availability (schedule), services, isActive
- timestamps

### Reservation
- user, business, specialist, service (references)
- startDate, endDate, status
- notes, cancellationReason, reminderSent
- timestamps

### Clinical Record
- user, specialist, business (references)
- weight, height, bmi, bloodPressure, heartRate, temperature
- diseases, allergies, medications, disability
- diagnosis, treatment, notes, attachments
- timestamps

### Attachment
- ownerType, ownerId
- fileName, fileUrl, fileType, fileSize, mimeType
- uploadedBy (reference), metadata
- timestamps

## Authentication

The API uses JWT Bearer tokens for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_token>
```

### Roles & Permissions

- **Admin**: Full access to all resources
- **Specialist**: Can manage their business, services, specialists, and clinical records
- **Client**: Can view businesses, create reservations, and view their own clinical records

## Error Handling

The API returns consistent error responses:

```json
{
  "status": "error",
  "message": "Error description"
}
```

Common HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request (validation errors)
- 401: Unauthorized (authentication required)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 409: Conflict (e.g., duplicate booking)
- 500: Internal Server Error

## Development Roadmap

### Sprint 1 ✅
- [x] Project setup and configuration
- [x] Database models
- [x] Authentication system
- [x] Business management
- [x] Basic API structure

### Sprint 2 (Next)
- [ ] Service and Specialist management
- [ ] Complete file upload functionality
- [ ] Email notifications
- [ ] Advanced search and filtering

### Sprint 3
- [ ] Admin dashboard endpoints
- [ ] Reports and analytics
- [ ] Advanced reservation features
- [ ] Rate limiting and security hardening

### Sprint 4
- [ ] Testing (unit & integration)
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Performance optimization
- [ ] Production deployment

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

ISC

## Support

For support, email support@c3mcentral.com or create an issue in the repository.
