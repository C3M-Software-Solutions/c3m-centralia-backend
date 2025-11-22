# Testing Guide

This guide provides examples for testing the C3M Centralia API.

## Prerequisites

1. MongoDB running on `mongodb://localhost:27017`
2. Server running on `http://localhost:5000`

## Quick Start

### 1. Start MongoDB
```bash
# If using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Or start your local MongoDB service
```

### 2. Start the Server
```bash
npm run dev
```

### 3. Test Health Endpoint
```bash
curl http://localhost:5000/health
```

---

## Testing with cURL

### Authentication Flow

#### 1. Register a new user
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "role": "client",
    "phone": "+1234567890"
  }'
```

Save the `accessToken` from the response.

#### 2. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

#### 3. Get current user (authenticated)
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Business Management

#### 1. Create a business
```bash
curl -X POST http://localhost:5000/api/businesses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "Wellness Center",
    "description": "Premium wellness and healthcare services",
    "ruc": "12345678901",
    "physicalLocation": true,
    "address": "123 Main Street, City",
    "remoteSessions": true,
    "photoUrl": "https://example.com/photo.jpg"
  }'
```

Save the business `_id` from the response.

#### 2. Get all businesses
```bash
curl -X GET http://localhost:5000/api/businesses
```

#### 3. Get single business
```bash
curl -X GET http://localhost:5000/api/businesses/BUSINESS_ID
```

#### 4. Update business
```bash
curl -X PUT http://localhost:5000/api/businesses/BUSINESS_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "Updated Wellness Center",
    "description": "New description"
  }'
```

### Services

#### 1. Create a service
```bash
curl -X POST http://localhost:5000/api/businesses/BUSINESS_ID/services \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "Massage Therapy",
    "durationMinutes": 60,
    "price": 75.00,
    "description": "Relaxing full body massage",
    "active": true
  }'
```

Save the service `_id` from the response.

#### 2. Get business services
```bash
curl -X GET http://localhost:5000/api/businesses/BUSINESS_ID/services
```

### Specialists

#### 1. Register a specialist
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. Jane Smith",
    "email": "jane@example.com",
    "password": "password123",
    "role": "specialist",
    "phone": "+1234567891"
  }'
```

#### 2. Create specialist profile
```bash
curl -X POST http://localhost:5000/api/businesses/BUSINESS_ID/specialists \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "userId": "SPECIALIST_USER_ID",
    "specialty": "Physical Therapy",
    "availability": [
      {
        "dayOfWeek": "monday",
        "startTime": "09:00",
        "endTime": "17:00",
        "available": true
      },
      {
        "dayOfWeek": "tuesday",
        "startTime": "09:00",
        "endTime": "17:00",
        "available": true
      },
      {
        "dayOfWeek": "wednesday",
        "startTime": "09:00",
        "endTime": "17:00",
        "available": true
      },
      {
        "dayOfWeek": "thursday",
        "startTime": "09:00",
        "endTime": "17:00",
        "available": true
      },
      {
        "dayOfWeek": "friday",
        "startTime": "09:00",
        "endTime": "17:00",
        "available": true
      }
    ]
  }'
```

Save the specialist `_id` from the response.

### Reservations

#### 1. Check availability
```bash
curl -X GET "http://localhost:5000/api/reservations/availability?specialistId=SPECIALIST_ID&serviceId=SERVICE_ID&date=2024-12-25" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### 2. Create a reservation
```bash
curl -X POST http://localhost:5000/api/reservations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "businessId": "BUSINESS_ID",
    "specialistId": "SPECIALIST_ID",
    "serviceId": "SERVICE_ID",
    "startTime": "2024-12-25T09:00:00.000Z",
    "notes": "First time appointment"
  }'
```

Save the reservation `_id` from the response.

#### 3. Get user reservations
```bash
curl -X GET "http://localhost:5000/api/reservations?userId=USER_ID" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### 4. Get single reservation
```bash
curl -X GET http://localhost:5000/api/reservations/RESERVATION_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### 5. Update reservation (confirm)
```bash
curl -X PUT http://localhost:5000/api/reservations/RESERVATION_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "status": "confirmed"
  }'
```

#### 6. Cancel reservation
```bash
curl -X DELETE http://localhost:5000/api/reservations/RESERVATION_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Clinical Records

#### 1. Create a clinical record (as specialist)
```bash
curl -X POST http://localhost:5000/api/clinical-records \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SPECIALIST_ACCESS_TOKEN" \
  -d '{
    "patientId": "PATIENT_USER_ID",
    "weight": 70.5,
    "height": 175,
    "bmi": 23.02,
    "diseases": ["Hypertension"],
    "disability": "None",
    "diagnosis": "Patient shows signs of mild hypertension",
    "treatment": "Prescribed medication and lifestyle changes",
    "notes": "Follow-up in 2 weeks"
  }'
```

#### 2. Get patient clinical records
```bash
curl -X GET http://localhost:5000/api/clinical-records/patient/PATIENT_USER_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### 3. Get single clinical record
```bash
curl -X GET http://localhost:5000/api/clinical-records/RECORD_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### 4. Update clinical record
```bash
curl -X PUT http://localhost:5000/api/clinical-records/RECORD_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SPECIALIST_ACCESS_TOKEN" \
  -d '{
    "weight": 72.0,
    "notes": "Patient weight increased"
  }'
```

#### 5. Add attachment to clinical record
```bash
curl -X POST http://localhost:5000/api/clinical-records/RECORD_ID/attachments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "url": "https://s3.amazonaws.com/bucket/file.pdf",
    "type": "document",
    "metadata": {
      "filename": "lab_results.pdf",
      "size": 1024000
    }
  }'
```

#### 6. Get clinical record attachments
```bash
curl -X GET http://localhost:5000/api/clinical-records/RECORD_ID/attachments \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Complete Test Flow Script

Here's a bash script that tests the complete flow:

```bash
#!/bin/bash

BASE_URL="http://localhost:5000"

echo "=== Testing C3M Centralia API ==="
echo ""

# 1. Register client
echo "1. Registering client..."
CLIENT_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john'$(date +%s)'@example.com",
    "password": "password123",
    "role": "client"
  }')

CLIENT_TOKEN=$(echo $CLIENT_RESPONSE | grep -o '"accessToken":"[^"]*' | sed 's/"accessToken":"//')
CLIENT_ID=$(echo $CLIENT_RESPONSE | grep -o '"_id":"[^"]*' | sed 's/"_id":"//' | head -1)

echo "Client registered with ID: $CLIENT_ID"
echo ""

# 2. Register specialist
echo "2. Registering specialist..."
SPECIALIST_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. Jane Smith",
    "email": "jane'$(date +%s)'@example.com",
    "password": "password123",
    "role": "specialist"
  }')

SPECIALIST_TOKEN=$(echo $SPECIALIST_RESPONSE | grep -o '"accessToken":"[^"]*' | sed 's/"accessToken":"//')
SPECIALIST_ID=$(echo $SPECIALIST_RESPONSE | grep -o '"_id":"[^"]*' | sed 's/"_id":"//' | head -1)

echo "Specialist registered with ID: $SPECIALIST_ID"
echo ""

# 3. Create business
echo "3. Creating business..."
BUSINESS_RESPONSE=$(curl -s -X POST $BASE_URL/api/businesses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SPECIALIST_TOKEN" \
  -d '{
    "name": "Wellness Center",
    "description": "Premium wellness services",
    "physicalLocation": true,
    "address": "123 Main St",
    "remoteSessions": true
  }')

BUSINESS_ID=$(echo $BUSINESS_RESPONSE | grep -o '"_id":"[^"]*' | sed 's/"_id":"//' | head -1)

echo "Business created with ID: $BUSINESS_ID"
echo ""

# 4. Create service
echo "4. Creating service..."
SERVICE_RESPONSE=$(curl -s -X POST $BASE_URL/api/businesses/$BUSINESS_ID/services \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SPECIALIST_TOKEN" \
  -d '{
    "name": "Massage Therapy",
    "durationMinutes": 60,
    "price": 75.00,
    "description": "Relaxing massage"
  }')

SERVICE_ID=$(echo $SERVICE_RESPONSE | grep -o '"_id":"[^"]*' | sed 's/"_id":"//' | head -1)

echo "Service created with ID: $SERVICE_ID"
echo ""

# 5. Create specialist profile
echo "5. Creating specialist profile..."
curl -s -X POST $BASE_URL/api/businesses/$BUSINESS_ID/specialists \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SPECIALIST_TOKEN" \
  -d '{
    "userId": "'$SPECIALIST_ID'",
    "specialty": "Physical Therapy",
    "availability": [
      {
        "dayOfWeek": "monday",
        "startTime": "09:00",
        "endTime": "17:00",
        "available": true
      }
    ]
  }' > /dev/null

echo "Specialist profile created"
echo ""

# 6. Check availability
echo "6. Checking availability..."
TOMORROW=$(date -d tomorrow +%Y-%m-%d)
curl -s -X GET "$BASE_URL/api/reservations/availability?specialistId=$SPECIALIST_ID&date=$TOMORROW" \
  -H "Authorization: Bearer $CLIENT_TOKEN"

echo ""
echo ""

# 7. Create reservation
echo "7. Creating reservation..."
RESERVATION_RESPONSE=$(curl -s -X POST $BASE_URL/api/reservations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLIENT_TOKEN" \
  -d '{
    "businessId": "'$BUSINESS_ID'",
    "specialistId": "'$SPECIALIST_ID'",
    "serviceId": "'$SERVICE_ID'",
    "startTime": "'$TOMORROW'T09:00:00.000Z",
    "notes": "Test reservation"
  }')

RESERVATION_ID=$(echo $RESERVATION_RESPONSE | grep -o '"_id":"[^"]*' | sed 's/"_id":"//' | head -1)

echo "Reservation created with ID: $RESERVATION_ID"
echo ""

# 8. Create clinical record
echo "8. Creating clinical record..."
curl -s -X POST $BASE_URL/api/clinical-records \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SPECIALIST_TOKEN" \
  -d '{
    "patientId": "'$CLIENT_ID'",
    "weight": 70.5,
    "height": 175,
    "diagnosis": "Test diagnosis",
    "treatment": "Test treatment"
  }' > /dev/null

echo "Clinical record created"
echo ""

echo "=== Test completed successfully! ==="
```

Save this as `test-api.sh`, make it executable with `chmod +x test-api.sh`, and run it with `./test-api.sh`.

---

## Testing with Postman

### Import Collection

1. Open Postman
2. Click "Import" button
3. Create a new collection named "C3M Centralia API"
4. Add the base URL as a collection variable: `{{baseUrl}}` = `http://localhost:5000`

### Collection Variables

Add these variables to your collection:
- `baseUrl`: `http://localhost:5000`
- `accessToken`: (will be set automatically from login)
- `clientId`: (will be set from registration)
- `specialistId`: (will be set from registration)
- `businessId`: (will be set from business creation)
- `serviceId`: (will be set from service creation)
- `reservationId`: (will be set from reservation creation)

### Add Pre-request Script (Collection Level)

```javascript
// Auto-attach token if available
if (pm.collectionVariables.get("accessToken")) {
    pm.request.headers.add({
        key: "Authorization",
        value: "Bearer " + pm.collectionVariables.get("accessToken")
    });
}
```

### Add Test Script for Login/Register Endpoints

```javascript
// Save access token
if (pm.response.code === 200 || pm.response.code === 201) {
    var jsonData = pm.response.json();
    if (jsonData.data && jsonData.data.accessToken) {
        pm.collectionVariables.set("accessToken", jsonData.data.accessToken);
    }
    if (jsonData.data && jsonData.data.user && jsonData.data.user._id) {
        pm.collectionVariables.set("userId", jsonData.data.user._id);
    }
}
```

---

## Environment Setup for Testing

### Development
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/c3m_centralia
```

### Testing
```env
NODE_ENV=test
PORT=5001
MONGODB_URI=mongodb://localhost:27017/c3m_centralia_test
```

---

## Running Automated Tests

```bash
# Run unit tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

---

## Common Issues

### 1. MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution**: Make sure MongoDB is running

### 2. JWT Invalid Token
```
Error: jwt malformed
```
**Solution**: Make sure you're using a fresh token from login/register

### 3. Validation Errors
```
Error: Validation failed
```
**Solution**: Check the request body matches the schema exactly

### 4. Reservation Conflict
```
Error: Time slot is not available
```
**Solution**: Check availability first and use an available time slot
