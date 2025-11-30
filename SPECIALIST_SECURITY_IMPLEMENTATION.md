# Specialist Security Implementation - Summary

## Overview

Implementation of a secure specialist account management system where business owners create and manage specialist accounts, while specialists cannot self-manage their passwords. This ensures proper supervision and access control.

## Changes Implemented

### 1. User Model Enhancement

**File:** `src/models/User.ts`

- Added `canManagePassword: boolean` field to User interface and schema
- Default: `true` (admins and clients can manage their passwords)
- Specialists: `false` (cannot manage their own passwords)

### 2. Business Service - Specialist Creation

**File:** `src/services/businessService.ts`

#### Updated `CreateSpecialistData` Interface

**Before:**

```typescript
userId: string; // Referenced existing user
```

**After:**

```typescript
name: string
email: string
password: string
phone?: string
// Creates user account directly during specialist creation
```

#### Updated `createSpecialist()` Method

- Now creates both User account AND Specialist profile in one operation
- Checks email uniqueness before creation
- Hashes password with bcrypt
- Sets `canManagePassword: false` for specialist users
- Links Specialist profile to newly created User

#### Added `resetSpecialistPassword()` Method

- Allows business owners to reset specialist passwords
- Validates specialist exists and belongs to business
- Hashes new password and updates user account
- Returns success message with specialist info

### 3. Auth Service - Password Restrictions

**File:** `src/services/authService.ts`

#### Updated `changePassword()` Method

- Selects `+canManagePassword` field
- Throws error if `!user.canManagePassword`
- Error message: "User cannot manage their own password. Contact your supervisor."

#### Updated `requestPasswordReset()` Method

- Selects `+canManagePassword` field
- Silently blocks (returns success) if `!user.canManagePassword`
- Security: Doesn't reveal if user exists or can manage password
- Only sends email if `canManagePassword === true`

### 4. Controllers Update

**Files:** `src/controllers/authController.ts`, `src/controllers/specialistController.ts`

#### Auth Controller

- `changePassword()`: Catches "cannot manage" error and returns 403 Forbidden
- `requestPasswordReset()`: Updated success message (security)

#### Specialist Controller

- `createSpecialist()`: Updated to accept name, email, password, phone
- `resetSpecialistPassword()`: New endpoint for business owners to reset passwords
  - Validates business ownership
  - Validates password length (min 6 characters)
  - Returns specialist info after reset

### 5. Routes & Validation

**File:** `src/routes/specialistRoutes.ts`

#### Updated Validation Rules

**Before:**

```typescript
body('userId').notEmpty();
```

**After:**

```typescript
body('name').trim().notEmpty();
body('email').isEmail();
body('password').isLength({ min: 6 });
body('phone').optional().isMobilePhone();
```

#### New Endpoint

```
POST /businesses/:businessId/specialists/:specialistId/reset-password
```

- Requires authentication (business owner)
- Validates newPassword (min 6 characters)
- Full Swagger documentation

### 6. Documentation

**New Files:**

- `SPECIALIST_FLOW.md`: 400+ line comprehensive guide
  - Complete flow documentation
  - Security concept explanation
  - 6 step-by-step scenarios with curl examples
  - Data model definitions
  - Business rules
  - 17 testing scenarios
  - Migration guide
  - Before/After comparison

- `SPECIALIST_SECURITY_IMPLEMENTATION.md`: This file

### 7. Tests Updated & Added

#### Integration Tests

**Specialist Tests:** `tests/integration/specialist/specialist.test.ts`

- Updated 8 existing tests to use new API format (name/email/password)
- Added 5 new tests for password reset functionality:
  - Reset password by business owner
  - Fail without authentication
  - Fail when user doesn't own business
  - Fail with invalid password
  - Fail for non-existent specialist
- **Total:** 30 tests (all passing ✅)

**Password Tests:** `tests/integration/auth/password.test.ts`

- Added 4 new tests for specialist restrictions:
  - Prevent specialist from changing own password (403)
  - Silently block specialist from requesting reset (200, no email)
  - Allow client user to change password normally
  - Allow client user to request reset normally
- **Total:** 25 tests (all passing ✅)

#### Unit Tests

**Business Service Tests:** `tests/unit/business/business.service.test.ts`

- Updated 5 tests to use new specialist creation format
- Removed obsolete specialistUser fixture
- **Total:** 27 tests (all passing ✅)

### 8. Test Results

```
Test Suites: 23 passed, 23 total
Tests:       388 passed, 388 total
```

## API Endpoints Changed

### 1. Create Specialist

**Endpoint:** `POST /api/businesses/:businessId/specialists`

**Before:**

```json
{
  "userId": "existing_user_id",
  "specialty": "Cardiology",
  "bio": "Expert cardiologist"
}
```

**After:**

```json
{
  "name": "Dr. Juan Pérez",
  "email": "juan.perez@example.com",
  "password": "secure123",
  "phone": "+51999888777",
  "specialty": "Cardiology",
  "bio": "Expert cardiologist"
}
```

### 2. Reset Specialist Password (NEW)

**Endpoint:** `POST /api/businesses/:businessId/specialists/:specialistId/reset-password`

**Request:**

```json
{
  "newPassword": "newSecure456"
}
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "message": "Specialist password reset successfully",
    "specialist": {
      "id": "specialist_id",
      "name": "Dr. Juan Pérez",
      "email": "juan.perez@example.com"
    }
  }
}
```

## Security Features

### 1. Password Management Control

- Specialists have `canManagePassword: false`
- Cannot use `/api/auth/change-password` (403 Forbidden)
- Cannot use `/api/auth/request-password-reset` (silently blocked)
- Only business owner can reset via `/api/businesses/:id/specialists/:id/reset-password`

### 2. User-Friendly Error Messages

```json
{
  "status": "error",
  "message": "You do not have permission to change your password. Please contact your supervisor."
}
```

### 3. Security Through Obscurity

- Password reset requests always return 200 (even if blocked)
- Doesn't reveal if email exists
- Doesn't reveal if user can manage passwords
- Prevents user enumeration attacks

## Migration Guide

### For Existing Specialists

If you have existing specialists created with the old flow:

1. **Option 1:** Update existing records

```javascript
await User.updateMany({ role: 'specialist' }, { $set: { canManagePassword: false } });
```

2. **Option 2:** Create new specialists with new flow

- Use the new API endpoint
- Provide name, email, password
- Old specialists remain unchanged (with `canManagePassword: true`)

### For New Development

- Always use new specialist creation format
- Name, email, password are now required
- UserId parameter no longer accepted

## Business Rules

1. ✅ **Business owner creates specialist account**
   - Owner provides name, email, initial password

2. ✅ **Specialist can login**
   - Uses email/password provided by owner

3. ❌ **Specialist CANNOT change password**
   - Blocked at service layer (throws error)
   - Blocked at controller layer (returns 403)

4. ❌ **Specialist CANNOT request password reset**
   - Silently blocked (security)
   - No email sent
   - Returns generic success message

5. ✅ **Business owner can reset specialist password**
   - Only owner of the business
   - Via dedicated endpoint
   - Validates business ownership

## Complete Flow Example

### 1. Business Owner Creates Specialist

```bash
curl -X POST http://localhost:5000/api/businesses/123/specialists \
  -H "Authorization: Bearer OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. María García",
    "email": "maria.garcia@example.com",
    "password": "initial123",
    "specialty": "Cardiology",
    "phone": "+51999888777"
  }'
```

### 2. Specialist Logs In

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "maria.garcia@example.com",
    "password": "initial123"
  }'
```

### 3. Specialist Tries to Change Password (BLOCKED)

```bash
curl -X POST http://localhost:5000/api/auth/change-password \
  -H "Authorization: Bearer SPECIALIST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "initial123",
    "newPassword": "newpass456"
  }'

# Response: 403 Forbidden
# Message: "You do not have permission to change your password. Please contact your supervisor."
```

### 4. Business Owner Resets Password

```bash
curl -X POST http://localhost:5000/api/businesses/123/specialists/456/reset-password \
  -H "Authorization: Bearer OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "newPassword": "newpass456"
  }'
```

### 5. Specialist Logs In With New Password

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "maria.garcia@example.com",
    "password": "newpass456"
  }'
```

## Files Modified Summary

### Core Implementation (8 files)

1. `src/models/User.ts` - Added canManagePassword field
2. `src/services/businessService.ts` - Updated specialist creation + reset method
3. `src/services/authService.ts` - Added password management restrictions
4. `src/controllers/authController.ts` - Updated error handling
5. `src/controllers/specialistController.ts` - Updated creation + reset endpoint
6. `src/routes/specialistRoutes.ts` - Updated validation + new endpoint
7. `src/swagger.ts` - Updated API documentation (auto-generated)

### Tests (3 files)

8. `tests/integration/specialist/specialist.test.ts` - 30 tests
9. `tests/integration/auth/password.test.ts` - 25 tests
10. `tests/unit/business/business.service.test.ts` - 27 tests

### Documentation (2 files)

11. `SPECIALIST_FLOW.md` - Complete flow guide (400+ lines)
12. `SPECIALIST_SECURITY_IMPLEMENTATION.md` - This file

## Verification Checklist

- [x] User model has canManagePassword field
- [x] Business owners can create specialists with email/password
- [x] Specialists are created with canManagePassword=false
- [x] Specialists can login with provided credentials
- [x] Specialists cannot change their own password (403)
- [x] Specialists cannot request password reset (silently blocked)
- [x] Business owners can reset specialist passwords
- [x] Non-owners cannot reset specialist passwords (403)
- [x] All validation rules enforced (email format, password length)
- [x] Complete Swagger documentation
- [x] All 388 tests passing
- [x] TypeScript compilation successful
- [x] Security best practices followed
- [x] User-friendly error messages

## Support & Maintenance

### Common Issues

**Issue:** Specialist says they can't login
**Solution:** Business owner should reset their password via reset endpoint

**Issue:** Specialist forgot password
**Solution:** Contact business owner for password reset (specialist cannot self-recover)

**Issue:** Need to change specialist email
**Solution:** Update specialist user account or create new specialist

### Future Enhancements

- [ ] Email notification to specialist when password is reset
- [ ] Password complexity requirements (uppercase, numbers, symbols)
- [ ] Password expiration policy for specialists
- [ ] Admin dashboard for managing multiple specialists
- [ ] Audit log for password reset actions

## Conclusion

The implementation successfully addresses the user requirement:

> "un propietario...deberia encargarse de crear y asignar una contraseña a una cuenta que sera del especialista...el especialista...debe poder loguearse, pero no debe poder cambiar su contraseña o recuperarla, el debera hablar con el supervisor...y ahi el dueño le pone una nueva"

All functionality is implemented, tested (388 tests passing), documented, and ready for production use.
