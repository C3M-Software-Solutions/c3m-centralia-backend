# 👨‍⚕️ Flujo de Gestión de Especialistas

Este documento describe el flujo completo para la creación y gestión de especialistas en el sistema.

---

## 🔐 Concepto de Seguridad

Los especialistas son empleados del negocio y **NO deben tener control total sobre sus cuentas**. El propietario/supervisor del negocio es responsable de gestionar las credenciales de sus especialistas.

### Restricciones para Especialistas

- ❌ **NO pueden** cambiar su propia contraseña
- ❌ **NO pueden** recuperar su contraseña por email
- ✅ **Deben** contactar al supervisor/dueño para cualquier cambio de contraseña
- ✅ **Pueden** iniciar sesión con las credenciales asignadas

---

## 📋 Flujo Completo

### 1️⃣ Creación de Especialista (Por el Dueño del Negocio)

**Endpoint:** `POST /api/businesses/:businessId/specialists`

**Autenticación:** Requerida (Bearer token del dueño del negocio)

**Proceso:**

1. El dueño del negocio crea la cuenta del especialista
2. Asigna nombre, email, **contraseña inicial**, y datos profesionales
3. El sistema crea:
   - Una cuenta de usuario con `role: 'specialist'`
   - `canManagePassword: false` (NO puede gestionar su contraseña)
   - Un perfil de especialista vinculado al negocio

#### Request Body

```json
{
  "name": "Dr. Juan Pérez",
  "email": "juan.perez@clinic.com",
  "password": "temporal123",
  "phone": "+51987654321",
  "specialty": "Fisioterapia",
  "bio": "Especialista en rehabilitación física con 10 años de experiencia",
  "services": ["serviceId1", "serviceId2"],
  "schedule": [
    {
      "day": "monday",
      "startTime": "09:00",
      "endTime": "17:00",
      "isAvailable": true
    },
    {
      "day": "wednesday",
      "startTime": "10:00",
      "endTime": "16:00",
      "isAvailable": true
    }
  ]
}
```

#### Response Success (201)

```json
{
  "status": "success",
  "data": {
    "specialist": {
      "_id": "...",
      "user": {
        "name": "Dr. Juan Pérez",
        "email": "juan.perez@clinic.com",
        "phone": "+51987654321",
        "role": "specialist"
      },
      "specialty": "Fisioterapia",
      "bio": "...",
      "services": [...],
      "availability": [...],
      "isActive": true
    }
  }
}
```

#### Validaciones

- ✅ Email único (no puede existir otro usuario con ese email)
- ✅ Contraseña mínimo 6 caracteres
- ✅ El usuario solicitante debe ser el dueño del negocio
- ✅ Los servicios asignados deben pertenecer al negocio

---

### 2️⃣ Login del Especialista

**Endpoint:** `POST /api/auth/login`

**Autenticación:** No requerida (endpoint público)

#### Request Body

```json
{
  "email": "juan.perez@clinic.com",
  "password": "temporal123"
}
```

#### Response Success (200)

```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "...",
      "name": "Dr. Juan Pérez",
      "email": "juan.perez@clinic.com",
      "role": "specialist",
      "isActive": true
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "..."
  }
}
```

El especialista puede iniciar sesión normalmente y acceder al sistema.

---

### 3️⃣ Intento de Cambio de Contraseña (Bloqueado)

**Endpoint:** `POST /api/auth/change-password`

**Autenticación:** Requerida (Bearer token del especialista)

#### Request Body

```json
{
  "currentPassword": "temporal123",
  "newPassword": "nuevapassword456"
}
```

#### Response Error (403)

```json
{
  "status": "error",
  "message": "You do not have permission to change your password. Please contact your supervisor."
}
```

El sistema valida el campo `canManagePassword` del usuario y bloquea la operación.

---

### 4️⃣ Intento de Recuperación de Contraseña (Bloqueado)

**Endpoint:** `POST /api/auth/request-password-reset`

**Autenticación:** No requerida (endpoint público)

#### Request Body

```json
{
  "email": "juan.perez@clinic.com"
}
```

#### Response Success (200) - Pero NO envía email

```json
{
  "status": "success",
  "data": {
    "message": "If the email exists and the account can manage passwords, a reset link has been sent"
  }
}
```

**Importante:** El sistema retorna éxito por seguridad (no revela si el email existe), pero **NO envía el email** si `canManagePassword: false`.

---

### 5️⃣ Reseteo de Contraseña por el Supervisor

**Endpoint:** `POST /api/businesses/:businessId/specialists/:specialistId/reset-password`

**Autenticación:** Requerida (Bearer token del dueño del negocio)

**Proceso:**

1. El especialista contacta al supervisor: "Olvidé mi contraseña"
2. El supervisor inicia sesión en su cuenta
3. El supervisor resetea la contraseña del especialista
4. El supervisor comunica la nueva contraseña al especialista

#### Request Body

```json
{
  "newPassword": "nuevapassword456"
}
```

#### Response Success (200)

```json
{
  "status": "success",
  "data": {
    "message": "Specialist password reset successfully",
    "specialist": {
      "id": "...",
      "name": "Dr. Juan Pérez",
      "email": "juan.perez@clinic.com"
    }
  }
}
```

#### Validaciones

- ✅ El usuario solicitante debe ser el dueño del negocio
- ✅ El especialista debe pertenecer al negocio
- ✅ Nueva contraseña mínimo 6 caracteres

---

### 6️⃣ Login con Nueva Contraseña

El especialista ya puede iniciar sesión con la nueva contraseña asignada por el supervisor.

```json
{
  "email": "juan.perez@clinic.com",
  "password": "nuevapassword456"
}
```

---

## 🔒 Modelo de Datos

### User Model (Actualizado)

```typescript
{
  name: string;
  email: string;
  password: string; // Hasheada con bcrypt
  role: 'admin' | 'specialist' | 'client';
  phone?: string;
  avatar?: string;
  isActive: boolean;
  canManagePassword: boolean; // NUEVO CAMPO
  // false para especialistas, true para admin/client
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
}
```

### Specialist Model

```typescript
{
  user: ObjectId; // Referencia al User
  business: ObjectId; // Referencia al Business
  specialty: string;
  licenseNumber?: string;
  bio?: string;
  availability: Array<{
    day: string;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
  }>;
  services: ObjectId[]; // Referencias a Service
  isActive: boolean;
}
```

---

## 🎯 Reglas de Negocio

### Creación de Especialistas

1. Solo el **dueño del negocio** puede crear especialistas
2. El dueño asigna la **contraseña inicial**
3. El email debe ser **único** en todo el sistema
4. Se crea automáticamente:
   - Usuario con `role: 'specialist'`
   - Usuario con `canManagePassword: false`
   - Perfil de especialista vinculado al negocio

### Gestión de Contraseñas

1. **Especialistas (`canManagePassword: false`)**:
   - ❌ NO pueden usar `POST /api/auth/change-password`
   - ❌ NO reciben emails de `POST /api/auth/request-password-reset`
   - ✅ Solo el supervisor puede resetear con endpoint especial

2. **Admin/Cliente (`canManagePassword: true`)**:
   - ✅ Pueden usar `POST /api/auth/change-password`
   - ✅ Pueden usar `POST /api/auth/request-password-reset`
   - ✅ Tienen control total sobre su contraseña

### Autenticación

- Todos los roles pueden **iniciar sesión** normalmente
- El campo `canManagePassword` solo afecta la **gestión** de contraseñas
- No afecta permisos de acceso a otras funcionalidades

---

## 🧪 Testing

### Escenarios a Probar

#### ✅ Creación Exitosa

```bash
# Como dueño del negocio
POST /api/businesses/{businessId}/specialists
Authorization: Bearer {ownerToken}
Body: { name, email, password, specialty, ... }

# Esperar: 201 Created
# Verificar: user.role = 'specialist', user.canManagePassword = false
```

#### ❌ Creación con Email Duplicado

```bash
POST /api/businesses/{businessId}/specialists
Body: { email: "existing@email.com", ... }

# Esperar: 400 Bad Request
# Error: "A user with this email already exists"
```

#### ✅ Login del Especialista

```bash
POST /api/auth/login
Body: { email: "specialist@email.com", password: "assigned123" }

# Esperar: 200 OK
# Recibir: accessToken, refreshToken
```

#### ❌ Cambio de Contraseña Bloqueado

```bash
POST /api/auth/change-password
Authorization: Bearer {specialistToken}
Body: { currentPassword, newPassword }

# Esperar: 403 Forbidden
# Error: "You do not have permission to change your password"
```

#### ❌ Recuperación por Email Bloqueada

```bash
POST /api/auth/request-password-reset
Body: { email: "specialist@email.com" }

# Esperar: 200 OK (por seguridad)
# Pero: NO se envía email
```

#### ✅ Reseteo por Supervisor

```bash
POST /api/businesses/{businessId}/specialists/{specialistId}/reset-password
Authorization: Bearer {ownerToken}
Body: { newPassword: "newpass123" }

# Esperar: 200 OK
# Verificar: Especialista puede loguearse con nueva contraseña
```

#### ❌ Reseteo por No-Propietario

```bash
POST /api/businesses/{businessId}/specialists/{specialistId}/reset-password
Authorization: Bearer {otherUserToken}
Body: { newPassword: "newpass123" }

# Esperar: 403 Forbidden
# Error: "You are not authorized to reset passwords for this business"
```

---

## 📝 Diferencias vs. Flujo Anterior

### Antes ❌

- Especialista se registraba por su cuenta
- Se usaba un `userId` existente al crear especialista
- Especialista podía cambiar su propia contraseña
- Especialista podía recuperar contraseña por email

### Ahora ✅

- Dueño crea la cuenta del especialista directamente
- Se crea usuario y especialista en una sola operación
- Especialista NO puede cambiar su contraseña
- Especialista NO puede recuperar contraseña por email
- Solo el supervisor puede resetear la contraseña

---

## 🔄 Migración de Datos Existentes

Si tienes especialistas existentes, necesitas ejecutar una migración:

```typescript
// Script de migración (ejemplo)
async function migrateExistingSpecialists() {
  const specialists = await User.find({ role: 'specialist' });

  for (const specialist of specialists) {
    specialist.canManagePassword = false; // Aplicar restricción
    await specialist.save();
  }

  console.log(`Migrated ${specialists.length} specialists`);
}
```

---

## 📞 Soporte

### Para Especialistas

Si olvidaste tu contraseña:

1. Contacta al supervisor/dueño del negocio
2. Solicita un reseteo de contraseña
3. Recibirás la nueva contraseña del supervisor
4. Inicia sesión con la nueva contraseña

### Para Supervisores

Para resetear la contraseña de un especialista:

1. Inicia sesión en tu cuenta
2. Navega a la gestión de especialistas
3. Selecciona el especialista
4. Usa el endpoint de reseteo de contraseña
5. Comunica la nueva contraseña al especialista

---

## ✅ Checklist de Implementación

- [x] Agregar campo `canManagePassword` al modelo User
- [x] Modificar `createSpecialist` para crear usuario directamente
- [x] Asignar `canManagePassword: false` a nuevos especialistas
- [x] Bloquear `changePassword` para usuarios con `canManagePassword: false`
- [x] Bloquear `requestPasswordReset` (no enviar email) para estos usuarios
- [x] Crear endpoint `resetSpecialistPassword` para supervisores
- [x] Actualizar validaciones en rutas de especialistas
- [x] Actualizar documentación Swagger
- [x] Crear tests para el nuevo flujo
- [ ] Migrar datos existentes (si aplica)
- [ ] Actualizar documentación del frontend
