# C3M Centralia API Documentation

## Base URL

```
http://localhost:5000/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

---

## Authentication Endpoints

### Register User

```http
POST /api/auth/register
```

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "client",
  "phone": "+1234567890"
}
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "client"
    },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

### Login

```http
POST /api/auth/login
```

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "client"
    },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

### Refresh Token

```http
POST /api/auth/refresh
```

**Request Body:**

```json
{
  "refreshToken": "..."
}
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

### Get Current User

```http
GET /api/auth/me
```

_Requires authentication_

**Response:**

```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "client",
      "phone": "+1234567890"
    }
  }
}
```

---

## Business Endpoints

### Create Business

```http
POST /api/businesses
```

_Requires authentication_

**Request Body:**

```json
{
  "name": "Wellness Center",
  "description": "Premium wellness and healthcare services",
  "ruc": "12345678901",
  "physicalLocation": true,
  "address": "123 Main Street, City",
  "remoteSessions": true,
  "photoUrl": "https://example.com/photo.jpg"
}
```

### Get All Businesses

```http
GET /api/businesses
```

**Query Parameters:**

- `userId` (optional): Filter by user ID
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

### Get Single Business

```http
GET /api/businesses/:id
```

### Update Business

```http
PUT /api/businesses/:id
```

_Requires authentication and ownership/admin_

### Delete Business

```http
DELETE /api/businesses/:id
```

_Requires authentication and ownership/admin_

### Get Business Services

```http
GET /api/businesses/:id/services
```

### Create Business Service

```http
POST /api/businesses/:id/services
```

_Requires authentication_

**Request Body:**

```json
{
  "name": "Massage Therapy",
  "durationMinutes": 60,
  "price": 75.0,
  "description": "Relaxing full body massage",
  "active": true
}
```

### Get Business Specialists

```http
GET /api/businesses/:id/specialists
```

### Create Business Specialist

```http
POST /api/businesses/:id/specialists
```

_Requires authentication_

**Request Body:**

```json
{
  "userId": "...",
  "specialty": "Physical Therapy",
  "availability": [
    {
      "dayOfWeek": "monday",
      "startTime": "09:00",
      "endTime": "17:00",
      "available": true
    }
  ]
}
```

---

## Reservation Endpoints

### Check Availability

```http
GET /api/reservations/availability
```

**Query Parameters:**

- `specialistId` (required): Specialist ID
- `serviceId` (optional): Service ID
- `date` (required): Date in ISO format (YYYY-MM-DD)

**Response:**

```json
{
  "status": "success",
  "data": {
    "availableSlots": [
      "2024-01-15T09:00:00.000Z",
      "2024-01-15T09:30:00.000Z",
      "2024-01-15T10:00:00.000Z"
    ],
    "serviceDuration": 60
  }
}
```

### Create Reservation

```http
POST /api/reservations
```

_Requires authentication_

**Request Body:**

```json
{
  "businessId": "...",
  "specialistId": "...",
  "serviceId": "...",
  "startTime": "2024-01-15T09:00:00.000Z",
  "notes": "First time appointment"
}
```

### Get All Reservations

```http
GET /api/reservations
```

_Requires authentication_

**Query Parameters:**

- `userId` (optional): Filter by user
- `businessId` (optional): Filter by business
- `specialistId` (optional): Filter by specialist
- `status` (optional): Filter by status (pending, confirmed, cancelled, completed)
- `startDate` (optional): Filter from date
- `endDate` (optional): Filter to date

### Get Single Reservation

```http
GET /api/reservations/:id
```

_Requires authentication_

### Update Reservation

```http
PUT /api/reservations/:id
```

_Requires authentication and authorization_

**Request Body:**

```json
{
  "status": "confirmed",
  "notes": "Updated notes"
}
```

### Cancel Reservation

```http
DELETE /api/reservations/:id
```

_Requires authentication and authorization_

---

## Clinical Records Endpoints

### Create Clinical Record

```http
POST /api/clinical-records
```

_Requires authentication (specialist or admin)_

**Request Body:**

```json
{
  "patientId": "...",
  "weight": 70.5,
  "height": 175,
  "bmi": 23.02,
  "diseases": ["Hypertension"],
  "disability": "None",
  "diagnosis": "Patient shows signs of...",
  "treatment": "Prescribed medication...",
  "notes": "Follow-up in 2 weeks"
}
```

### Get Patient Clinical Records

```http
GET /api/clinical-records/patient/:patientId
```

_Requires authentication (patient can see own, specialist/admin can see all)_

### Get Single Clinical Record

```http
GET /api/clinical-records/:id
```

_Requires authentication_

### Update Clinical Record

```http
PUT /api/clinical-records/:id
```

_Requires authentication (specialist or admin)_

### Add Attachment to Clinical Record

```http
POST /api/clinical-records/:id/attachments
```

_Requires authentication_

**Request Body:**

```json
{
  "url": "https://s3.amazonaws.com/...",
  "type": "image",
  "metadata": {
    "filename": "xray.jpg",
    "size": 1024000
  }
}
```

### Get Clinical Record Attachments

```http
GET /api/clinical-records/:id/attachments
```

_Requires authentication_

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request

```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### 401 Unauthorized

```json
{
  "status": "error",
  "message": "Authentication required"
}
```

### 403 Forbidden

```json
{
  "status": "error",
  "message": "Not authorized to access this resource"
}
```

### 404 Not Found

```json
{
  "status": "error",
  "message": "Resource not found"
}
```

### 409 Conflict

```json
{
  "status": "error",
  "message": "Time slot is not available"
}
```

### 500 Internal Server Error

```json
{
  "status": "error",
  "message": "Internal server error"
}
```

---

## User Roles

- **client**: Regular users who can book appointments
- **specialist**: Healthcare providers who manage appointments and clinical records
- **admin**: Full access to all resources

---

## Rate Limiting

API requests are limited to prevent abuse. Current limits:

- 100 requests per 15 minutes per IP address
- 1000 requests per hour per authenticated user

---

## Pagination

List endpoints support pagination with the following query parameters:

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)

Response format:

```json
{
  "status": "success",
  "data": {
    "items": [...],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 50,
      "itemsPerPage": 10
    }
  }
}
```
