# C3M Centralia - Flujos Funcionales y Roadmap

## 📋 Tabla de Contenidos

1. [Descripción General](#descripción-general)
2. [Actores del Sistema](#actores-del-sistema)
3. [Flujos Funcionales Principales](#flujos-funcionales-principales)
4. [Casos de Uso Detallados](#casos-de-uso-detallados)
5. [Gaps Pendientes](#gaps-pendientes)
6. [Arquitectura y Modelos](#arquitectura-y-modelos)

---

## 📖 Descripción General

**C3M Centralia** es una plataforma de gestión médica que permite:

- Gestión de negocios médicos (clínicas, consultorios)
- Reservación de citas con especialistas
- Gestión de registros clínicos de pacientes
- Administración de servicios y especialistas

---

## 👥 Actores del Sistema

### 1. Cliente/Paciente (Role: `client`)

Usuario final que busca servicios médicos y agenda citas.

**Capacidades:**

- Registrarse y autenticarse
- Buscar negocios y especialistas
- Ver disponibilidad de citas
- Crear reservaciones
- Ver sus propias reservaciones
- Cancelar sus citas
- Ver sus registros clínicos

### 2. Especialista (Role: `specialist`)

Profesional de la salud que ofrece servicios médicos.

**Capacidades:**

- Registrarse y autenticarse
- Crear y gestionar negocios
- Crear y gestionar servicios
- Definir horarios de disponibilidad
- Ver reservaciones asignadas
- Confirmar/cancelar/completar citas
- Crear y actualizar registros clínicos
- Ver historial de pacientes

### 3. Administrador (Role: `admin`)

Gestor del sistema con acceso total.

**Capacidades:**

- Todas las capacidades de cliente y especialista
- Ver todas las reservaciones
- Gestionar todos los negocios
- Acceso completo a registros clínicos

---

## 🔄 Flujos Funcionales Principales

### Flujo 1: Registro e Inicio de Sesión

```
┌─────────┐
│ Usuario │
└────┬────┘
     │
     ├─► POST /api/auth/register
     │   Input: { name, email, password, role, phone }
     │   Output: { user, accessToken, refreshToken }
     │
     ├─► POST /api/auth/login
     │   Input: { email, password }
     │   Output: { user, accessToken, refreshToken }
     │
     └─► GET /api/auth/me (Authenticated)
         Input: Bearer Token
         Output: { user profile }
```

**Validaciones:**

- Email único en el sistema
- Password mínimo 6 caracteres
- Role válido: admin, specialist, client

---

### Flujo 2: Creación de Negocio (Especialista/Admin)

```
┌─────────────┐
│ Especialista│
└──────┬──────┘
       │
       ├─► POST /api/businesses
       │   Input: {
       │     name, description, ruc,
       │     address, phone, email,
       │     physicalLocation, remoteSessions,
       │     schedule
       │   }
       │   Output: { business }
       │
       ├─► POST /api/businesses/:id/services
       │   Input: {
       │     name, description,
       │     duration, price, category
       │   }
       │   Output: { service }
       │
       └─► POST /api/businesses/:id/specialists
           Input: {
             userId, specialty,
             licenseNumber, bio,
             availability: [
               { dayOfWeek, startTime, endTime, available }
             ],
             services: [serviceIds]
           }
           Output: { specialist }
```

**Validaciones:**

- Usuario debe ser especialista o admin
- RUC único por negocio
- Servicios deben pertenecer al negocio
- Horarios de disponibilidad válidos

---

### Flujo 3: Búsqueda y Reservación (Cliente)

```
┌─────────┐
│ Cliente │
└────┬────┘
     │
     ├─► GET /api/businesses
     │   Query: { search, category, location }
     │   Output: { businesses[] }
     │
     ├─► GET /api/businesses/:id
     │   Output: { business, services[], specialists[] }
     │
     ├─► GET /api/reservations/availability
     │   Query: {
     │     specialist: specialistId,
     │     service: serviceId,
     │     date: "2025-11-24"
     │   }
     │   Output: {
     │     availableSlots: [
     │       "2025-11-24T09:00:00.000Z",
     │       "2025-11-24T09:30:00.000Z",
     │       "2025-11-24T10:00:00.000Z"
     │     ],
     │     serviceDuration: 60
     │   }
     │
     ├─► POST /api/reservations
     │   Input: {
     │     business: businessId,
     │     specialist: specialistId,
     │     service: serviceId,
     │     startDate: "2025-11-24T09:00:00.000Z",
     │     notes: "Primera consulta"
     │   }
     │   Output: {
     │     reservation: {
     │       _id, user, business, specialist, service,
     │       startDate, endDate (auto-calculado),
     │       status: "pending"
     │     }
     │   }
     │
     └─► GET /api/reservations
         Query: { status, date, dateFrom, dateTo }
         Output: { reservations[] }
```

**Lógica de Negocio:**

1. **Cálculo de endDate automático:**
   - `endDate = startDate + service.duration`
   - Ejemplo: startDate 09:00 + duration 60min = endDate 10:00

2. **Prevención de conflictos:**
   - Sistema verifica reservaciones existentes
   - No permite doble reservación en el mismo horario
   - Valida contra horario de disponibilidad del especialista

3. **Estados de reservación:**
   - `pending`: Creada, esperando confirmación
   - `confirmed`: Confirmada por especialista
   - `cancelled`: Cancelada (por cliente o especialista)
   - `completed`: Cita completada
   - `no-show`: Paciente no asistió

---

### Flujo 4: Gestión de Reservaciones (Especialista)

```
┌─────────────┐
│ Especialista│
└──────┬──────┘
       │
       ├─► GET /api/reservations/specialist/my-reservations
       │   Query: {
       │     status: "pending",
       │     date: "2025-11-24",
       │     dateFrom: "2025-11-24",
       │     dateTo: "2025-11-30"
       │   }
       │   Output: {
       │     reservations: [
       │       {
       │         _id, user, business, service,
       │         startDate, endDate, status, notes
       │       }
       │     ],
       │     total: 12
       │   }
       │
       └─► PUT /api/reservations/:id/status
           Input: {
             status: "confirmed",
             cancellationReason: "Opcional si cancela"
           }
           Output: { reservation }
```

**Filtros Disponibles:**

- Por status: pending, confirmed, cancelled, completed, no-show
- Por fecha específica: `date=2025-11-24`
- Por rango: `dateFrom=2025-11-24&dateTo=2025-11-30`
- Combinables: `status=pending&date=2025-11-24`

**Permisos:**

- Especialista puede confirmar/cancelar/completar sus citas
- Cliente solo puede cancelar sus propias citas
- Admin tiene acceso total

---

### Flujo 5: Gestión de Registros Clínicos (Especialista)

```
┌─────────────┐
│ Especialista│
└──────┬──────┘
       │
       ├─► POST /api/clinical-records
       │   Input: {
       │     patientId, specialistId, businessId,
       │     reservationId (opcional),
       │     weight, height, bloodPressure,
       │     diseases, allergies, medications,
       │     disability, diagnosis, treatment, notes
       │   }
       │   Output: {
       │     clinicalRecord: {
       │       _id, user, specialist, business,
       │       bmi (auto-calculado),
       │       ... todos los campos
       │     }
       │   }
       │
       ├─► GET /api/clinical-records/patient/:patientId
       │   Output: { clinicalRecords[] }
       │
       ├─► GET /api/reservations/:id/clinical-record
       │   Output: { clinicalRecord }
       │
       └─► POST /api/clinical-records/:id/attachments
           Input: FormData con archivo
           Output: { attachment }
```

**Validaciones:**

- Solo especialistas pueden crear registros
- Especialista debe pertenecer al negocio
- Si tiene reservationId, debe ser del paciente correcto
- BMI se calcula automáticamente: `weight / (height^2)`

**Permisos de Acceso:**

- Paciente ve solo sus propios registros
- Especialista ve registros de sus pacientes
- Admin ve todos los registros

---

### Flujo 6: Gestión de Servicios

```
┌─────────────┐
│Especialista │
└──────┬──────┘
       │
       ├─► POST /api/services
       │   Input: {
       │     business: businessId,
       │     name, description,
       │     duration: 60, // minutos
       │     price: 100,
       │     category, isActive: true
       │   }
       │   Output: { service }
       │
       ├─► GET /api/services
       │   Query: { business, category, isActive }
       │   Output: { services[] }
       │
       ├─► PUT /api/services/:id
       │   Input: { campos a actualizar }
       │   Output: { service }
       │
       └─► DELETE /api/services/:id
           Output: { message: "Service deleted" }
```

---

### Flujo 7: Gestión de Especialistas

```
┌─────────────┐
│Admin/Owner  │
└──────┬──────┘
       │
       ├─► POST /api/specialists
       │   Input: {
       │     user: userId,
       │     business: businessId,
       │     specialty,
       │     licenseNumber,
       │     bio,
       │     availability: [
       │       {
       │         dayOfWeek: "monday",
       │         startTime: "09:00",
       │         endTime: "17:00",
       │         available: true
       │       }
       │     ],
       │     services: [serviceId1, serviceId2]
       │   }
       │   Output: { specialist }
       │
       ├─► GET /api/specialists
       │   Query: { business, specialty, isActive }
       │   Output: { specialists[] }
       │
       └─► PUT /api/specialists/:id
           Input: { campos a actualizar }
           Output: { specialist }
```

**Horario de Disponibilidad:**

- Días de la semana: monday, tuesday, wednesday, thursday, friday, saturday, sunday
- Formato 24h: "09:00", "17:00"
- Flag `available` para habilitar/deshabilitar días

---

## 📊 Casos de Uso Detallados

### Caso 1: Cliente Agenda Primera Cita

**Actores:** Cliente (nuevo), Especialista, Sistema

**Flujo Normal:**

1. Cliente se registra en el sistema (POST /api/auth/register)
2. Cliente busca negocios/servicios (GET /api/businesses)
3. Cliente selecciona un negocio y ve especialistas disponibles
4. Cliente verifica disponibilidad del especialista (GET /api/reservations/availability)
5. Sistema retorna slots disponibles basados en:
   - Horario de disponibilidad del especialista
   - Reservaciones existentes
   - Duración del servicio
6. Cliente selecciona un slot y crea reservación (POST /api/reservations)
7. Sistema valida y crea reservación con status "pending"
8. Sistema calcula endDate automáticamente
9. [PENDIENTE] Sistema envía notificación al especialista

**Validaciones del Sistema:**

- Servicio pertenece al negocio
- Especialista puede ofrecer ese servicio
- Slot está disponible (no hay conflicto)
- Slot está dentro del horario de disponibilidad

---

### Caso 2: Especialista Gestiona Agenda del Día

**Actores:** Especialista, Sistema

**Flujo Normal:**

1. Especialista inicia sesión (POST /api/auth/login)
2. Especialista consulta reservaciones del día:
   ```
   GET /api/reservations/specialist/my-reservations?date=2025-11-24
   ```
3. Sistema retorna todas las citas del día con información completa:
   - Datos del paciente (nombre, email, teléfono)
   - Servicio a realizar
   - Horario (startDate, endDate)
   - Estado actual
   - Notas del paciente
4. Especialista confirma citas pendientes:
   ```
   PUT /api/reservations/:id/status
   { "status": "confirmed" }
   ```
5. [PENDIENTE] Sistema envía notificación de confirmación al paciente
6. Especialista marca cita como completada después de la consulta
7. Especialista crea registro clínico vinculado a la reservación

**Flujo Alternativo - Cancelación:**

1. Especialista cancela cita:
   ```
   PUT /api/reservations/:id/status
   {
     "status": "cancelled",
     "cancellationReason": "Emergencia familiar"
   }
   ```
2. [PENDIENTE] Sistema notifica al paciente
3. [PENDIENTE] Sistema libera el slot para nueva reservación

---

### Caso 3: Creación de Registro Clínico Post-Consulta

**Actores:** Especialista, Sistema

**Flujo Normal:**

1. Especialista completa consulta con paciente
2. Especialista marca reservación como completada
3. Especialista crea registro clínico:
   ```
   POST /api/clinical-records
   {
     "patientId": "...",
     "specialistId": "...",
     "businessId": "...",
     "reservationId": "...",
     "weight": 70,
     "height": 1.75,
     "bloodPressure": "120/80",
     "diagnosis": "Hipertensión leve",
     "treatment": "Cambios en dieta, ejercicio",
     "notes": "Paciente refiere dolores de cabeza"
   }
   ```
4. Sistema calcula BMI automáticamente: 70 / (1.75^2) = 22.86
5. Sistema vincula registro con la reservación
6. Especialista adjunta archivos si necesario (radiografías, análisis)
7. [PENDIENTE] Paciente recibe notificación de registro disponible

**Permisos de Acceso:**

- Paciente puede ver su propio registro
- Especialista creador puede ver/editar
- Otros especialistas del mismo negocio pueden ver (si autorizados)
- Admin puede ver todos

---

## 🔄 Gaps Pendientes

### 🔴 CRÍTICOS (Completados)

#### ✅ 1. Especialista ve sus reservaciones asignadas

**Status:** ✅ COMPLETADO

- Endpoint: `GET /api/reservations/specialist/my-reservations`
- Filtros: status, date, dateFrom, dateTo
- 10 tests de integración (337/337 total pasando)

---

### 🟡 IMPORTANTES (Pendientes - 3)

#### ✅ 2. Sistema de Notificaciones de Reservaciones

**Status:** ✅ COMPLETADO  
**Tiempo Implementado:** 3 días

**Descripción:**
Sistema de notificaciones por email cuando se crean, modifican o cancelan reservaciones.

**✅ Implementado:**

1. **NotificationService** (`src/services/notificationService.ts`)
   - 4 tipos de emails: created, confirmed, cancelled, reminder
   - Templates HTML responsivos con estilos inline
   - Graceful degradation (funciona sin SMTP configurado)

2. **ReminderService** (`src/services/reminderService.ts`)
   - Cron job que corre cada hora
   - Envía recordatorios 24 horas antes de la cita
   - Auto-start en inicialización del servidor
   - Marca flag `reminderSent` en reservaciones

3. **Integración en ReservationService**
   - Email al crear reservación
   - Email al confirmar/cancelar
   - Manejo de errores sin romper flujo

4. **Tests de Integración** (17 tests pasando)
   - `tests/integration/notification/notification.test.ts` (5 tests)
   - `tests/integration/notification/reminder.test.ts` (12 tests)
   - Total: 354/354 tests pasando

5. **Documentación**
   - `NOTIFICATIONS.md` - Guía completa de configuración
   - Swagger actualizado con campo `reminderSent` y tag "Notifications"

**Dependencias Utilizadas:**

- nodemailer 6.9.7
- node-cron 3.0.3

---

#### 3. Búsqueda Avanzada de Especialistas

**Prioridad:** 🟡 Alta  
**Estimación:** 2-3 días

**Descripción:**
Sistema robusto de búsqueda y filtrado de especialistas con múltiples criterios.

**Filtros a Implementar:**

- Por especialidad (ej: "Fisioterapia", "Cardiología")
- Por disponibilidad (fecha específica o rango)
- Por ubicación (físico vs remoto)
- Por precio (rango min-max)
- Por rating/calificación (requiere Gap 4)
- Búsqueda por texto (nombre, bio, servicios)

**Componentes a Implementar:**

```typescript
// src/controllers/specialistController.ts
interface SpecialistSearchQuery {
  specialty?: string;
  availableOn?: Date; // Fecha específica
  availableFrom?: Date;
  availableTo?: Date;
  location?: 'physical' | 'remote' | 'both';
  priceMin?: number;
  priceMax?: number;
  rating?: number; // mínimo rating
  search?: string; // búsqueda texto libre
  sortBy?: 'price' | 'rating' | 'name';
  sortOrder?: 'asc' | 'desc';
}

GET / api / specialists / search;
```

**Lógica de Búsqueda:**

1. Filtrar por especialidad (match exacto o similar)
2. Si hay fecha, verificar availability del especialista
3. Filtrar por servicios en rango de precio
4. Aplicar búsqueda de texto en nombre, bio, servicios
5. Ordenar por criterio especificado
6. Paginar resultados

**Response Enriquecido:**

```json
{
  "specialists": [
    {
      "_id": "...",
      "user": { "name": "Dr. Juan Pérez" },
      "specialty": "Fisioterapia",
      "business": { "name": "Clínica Central", "location": "..." },
      "services": [{ "name": "Terapia Manual", "price": 80, "duration": 60 }],
      "availability": { "nextAvailable": "2025-11-25T09:00:00Z" },
      "rating": 4.8,
      "reviewsCount": 24
    }
  ],
  "total": 15,
  "page": 1,
  "pages": 2
}
```

**Tests Necesarios:**

- ✅ Buscar por especialidad
- ✅ Filtrar por disponibilidad en fecha específica
- ✅ Filtrar por rango de precios
- ✅ Búsqueda de texto en nombre/bio
- ✅ Combinar múltiples filtros
- ✅ Ordenar por precio/rating
- ✅ Paginación funciona correctamente

---

#### 4. Sistema de Calificaciones y Reviews

**Prioridad:** 🟡 Alta  
**Estimación:** 3-4 días

**Descripción:**
Permitir a los clientes calificar especialistas y servicios después de completar una cita.

**Modelo de Datos:**

```typescript
// src/models/Review.ts
interface IReview {
  reservation: ObjectId; // Reservación completada
  user: ObjectId; // Cliente que califica
  specialist: ObjectId;
  service: ObjectId;
  business: ObjectId;
  rating: number; // 1-5 estrellas
  comment: string;
  helpful: number; // contador de "útil"
  createdAt: Date;
}
```

**Endpoints:**

```
POST /api/reviews
- Crear review después de cita completada
- Validar que reservation.status === 'completed'
- Un usuario solo puede reviewar una vez por reservación

GET /api/reviews/specialist/:id
- Ver todas las reviews de un especialista
- Incluir promedio y distribución de ratings

GET /api/reviews/service/:id
- Ver reviews de un servicio específico

PUT /api/reviews/:id
- Editar review (solo el autor, dentro de 7 días)

POST /api/reviews/:id/helpful
- Marcar review como útil
```

**Cálculo de Rating:**

- Actualizar campo `rating` en modelo Specialist
- Calcular promedio de todas las reviews
- Recalcular al crear/editar/eliminar review

**Restricciones:**

- Solo clientes pueden crear reviews
- Solo después de cita completada
- Una review por reservación
- Rating entre 1-5
- Comentario máximo 500 caracteres

**Tests Necesarios:**

- ✅ Cliente puede crear review después de cita
- ✅ No puede reviewar cita pendiente/cancelada
- ✅ No puede reviewar dos veces la misma cita
- ✅ Rating se actualiza en especialista
- ✅ Solo el autor puede editar su review
- ✅ Reviews ordenadas por fecha/utilidad

---

#### 5. Historial Médico Completo del Paciente

**Prioridad:** 🟡 Media  
**Estimación:** 2-3 días

**Descripción:**
Vista consolidada y cronológica del historial médico completo del paciente.

**Componentes:**

```
GET /api/clinical-records/patient/:patientId/timeline
- Historial completo ordenado por fecha
- Incluye todos los registros, reservaciones completadas
- Attachments organizados

GET /api/clinical-records/patient/:patientId/summary
- Resumen ejecutivo:
  - Enfermedades crónicas
  - Alergias activas
  - Medicamentos actuales
  - Última consulta
  - Próxima cita

GET /api/clinical-records/patient/:patientId/statistics
- Estadísticas de salud:
  - Evolución de peso/IMC (gráfico)
  - Evolución de presión arterial
  - Frecuencia de consultas
  - Especialistas visitados
```

**Vista Timeline:**

```json
{
  "timeline": [
    {
      "date": "2025-11-20",
      "type": "clinical_record",
      "specialist": "Dr. Juan Pérez",
      "specialty": "Cardiología",
      "diagnosis": "Hipertensión",
      "treatment": "...",
      "attachments": [...]
    },
    {
      "date": "2025-10-15",
      "type": "reservation",
      "status": "completed",
      "service": "Consulta General",
      "notes": "..."
    }
  ]
}
```

**Permisos:**

- Paciente ve su propio historial completo
- Especialista ve historial de sus pacientes
- Especialista puede ver registros de otros especialistas del mismo negocio
- Admin ve todos

**Tests Necesarios:**

- ✅ Timeline ordenado cronológicamente
- ✅ Incluye registros de múltiples especialistas
- ✅ Summary muestra info actualizada
- ✅ Statistics calcula correctamente promedios
- ✅ Permisos correctos por rol

---

### 🟢 DESEABLES (Pendientes - 4)

#### 6. Dashboard para Especialistas

**Prioridad:** 🟢 Media  
**Estimación:** 3-4 días

**Descripción:**
Panel de control con métricas y estadísticas para especialistas.

**Métricas a Mostrar:**

```
GET /api/specialists/dashboard

{
  "today": {
    "appointments": 8,
    "completed": 5,
    "pending": 3,
    "revenue": 800
  },
  "thisWeek": {
    "appointments": 42,
    "completed": 35,
    "cancelled": 3,
    "noShow": 2,
    "revenue": 3500
  },
  "thisMonth": {
    "appointments": 180,
    "newPatients": 45,
    "returningPatients": 135,
    "revenue": 15000,
    "averageRating": 4.7
  },
  "topServices": [
    { "name": "Consulta General", "count": 90 },
    { "name": "Terapia", "count": 60 }
  ],
  "upcomingAppointments": [...],
  "recentReviews": [...]
}
```

---

#### 7. Exportación de Reportes (PDF/Excel)

**Prioridad:** 🟢 Baja  
**Estimación:** 2-3 días

**Funcionalidades:**

- Exportar lista de reservaciones a Excel
- Exportar registro clínico individual a PDF
- Exportar historial médico completo a PDF
- Reporte mensual de ingresos (especialista)
- Reporte de pacientes atendidos (especialista)

**Librerías:**

- pdfkit para PDFs
- exceljs para Excel
- Diseño de plantillas profesionales

---

#### ✅ 8. Recordatorios Automáticos

**Status:** ✅ PARCIALMENTE COMPLETADO (parte del Gap #2)  
**Prioridad:** 🟢 Media

**Implementado:**

- ✅ Recordatorio 24 horas antes de la cita (vía cron job)
- ✅ Sistema automatizado con node-cron
- ✅ Flag `reminderSent` en modelo Reservation

**Pendiente (si se desea extender):**

- ⏳ Recordatorio 2 horas antes de la cita
- ⏳ Seguimiento post-consulta (pedir review)
- ⏳ Notificaciones vía SMS (además de email)

**Estimación para pendientes:** 1-2 días

---

#### 9. Integración con Google Calendar/Outlook

**Prioridad:** 🟢 Baja  
**Estimación:** 4-5 días

**Funcionalidades:**

- Especialista conecta su Google Calendar
- Reservaciones se sincronizan automáticamente
- Cambios en cualquier lado se reflejan
- Eventos incluyen enlace al sistema

---

### 📊 SUGERENCIAS ADICIONALES

#### 10. WebSockets para Actualizaciones en Tiempo Real

**Prioridad:** 🟢 Baja  
**Estimación:** 3-4 días

**Descripción:**
Notificaciones en tiempo real sin refrescar la página.

**Casos de Uso:**

- Nueva reservación aparece instantáneamente
- Cambio de status se refleja en tiempo real
- Chat en vivo con especialista (futuro)

**Tecnología:**

- Socket.io
- Eventos: reservation_created, reservation_updated, message_received

---

## 🏗️ Arquitectura y Modelos

### Modelo de Datos Completo

```
User (Usuarios)
├── _id
├── name
├── email (unique)
├── password (hashed)
├── role (admin/specialist/client)
├── phone
├── avatar
└── isActive

Business (Negocios)
├── _id
├── user (ref: User)
├── name
├── description
├── ruc (unique)
├── photoUrl
├── address
├── phone
├── email
├── physicalLocation (boolean)
├── remoteSessions (boolean)
├── schedule
└── isActive

Service (Servicios)
├── _id
├── business (ref: Business)
├── name
├── description
├── duration (minutos)
├── price
├── category
└── isActive

Specialist (Especialistas)
├── _id
├── user (ref: User)
├── business (ref: Business)
├── specialty
├── licenseNumber
├── bio
├── availability[]
│   ├── dayOfWeek
│   ├── startTime
│   ├── endTime
│   └── available
├── services[] (ref: Service)
├── rating (calculado)
└── isActive

Reservation (Reservaciones)
├── _id
├── user (ref: User)
├── business (ref: Business)
├── specialist (ref: Specialist)
├── service (ref: Service)
├── startDate
├── endDate (auto-calculado)
├── status (pending/confirmed/cancelled/completed/no-show)
├── notes
├── cancellationReason
└── reminderSent

ClinicalRecord (Registros Clínicos)
├── _id
├── user (ref: User) - Paciente
├── specialist (ref: Specialist)
├── business (ref: Business)
├── reservation (ref: Reservation)
├── weight
├── height
├── bmi (auto-calculado)
├── bloodPressure
├── heartRate
├── temperature
├── diseases[]
├── allergies[]
├── medications[]
├── disability
├── diagnosis
├── treatment
├── notes
└── attachments[]

Attachment (Archivos)
├── _id
├── ownerType (ClinicalRecord, Business, etc)
├── ownerId
├── url
├── type (image/document/pdf)
└── metadata
```

### Relaciones

```
User 1:1 Specialist (Un usuario puede ser especialista)
User 1:N Business (Un usuario puede tener múltiples negocios)
User 1:N Reservation (como cliente)
User 1:N ClinicalRecord (como paciente)

Business 1:N Service
Business 1:N Specialist
Business 1:N Reservation

Specialist 1:N Reservation (citas asignadas)
Specialist N:N Service (puede ofrecer múltiples servicios)
Specialist 1:N ClinicalRecord (registros creados)

Reservation 1:1 ClinicalRecord (opcional)

ClinicalRecord 1:N Attachment
```

---

## 🚀 Orden Recomendado de Implementación

### Sprint 1 (Actual)

✅ Infraestructura base  
✅ Modelos y autenticación  
✅ CRUD básicos  
✅ Sistema de reservaciones  
✅ Vista de especialista

### Sprint 2 (Próximo)

1. **Notificaciones** (Gap 2) - 4 días
   - Crítico para experiencia de usuario
   - Base para recordatorios automáticos

2. **Búsqueda Avanzada** (Gap 3) - 3 días
   - Mejora significativa de UX
   - Facilita encontrar especialistas

### Sprint 3

3. **Sistema de Reviews** (Gap 4) - 4 días
   - Genera confianza en la plataforma
   - Mejora búsqueda avanzada

4. **Historial Médico** (Gap 5) - 3 días
   - Valor agregado para pacientes
   - Mejora atención médica

### Sprint 4

5. **Dashboard Especialistas** (Gap 6) - 4 días
   - Herramienta de gestión importante

6. **Recordatorios Automáticos** (Gap 8) - 2 días
   - Reduce no-shows
   - Aprovecha sistema de notificaciones

### Sprint 5 (Opcional)

7. **Exportación Reportes** (Gap 7) - 3 días
8. **Integración Calendarios** (Gap 9) - 5 días
9. **WebSockets** (Gap 10) - 4 días

---

## 📈 Métricas de Éxito

### Técnicas

- ✅ 337 tests pasando (100%)
- ✅ Cobertura de código > 80%
- ✅ 0 errores críticos
- ⏱️ Response time < 500ms (promedio)
- 📊 Uptime > 99.5%

### Funcionales

- 👥 Registro de usuarios
- 🏥 Creación de negocios
- 📅 Reservaciones sin conflictos
- 📋 Registros clínicos completos
- 🔍 Búsquedas rápidas y precisas

### Negocio (Post-Gaps)

- 📧 100% notificaciones entregadas
- ⭐ Rating promedio especialistas > 4.0
- 🎯 < 10% tasa de no-shows (con recordatorios)
- 📈 Crecimiento mensual de usuarios
- 💰 Retención especialistas > 80%

---

## 📞 Contacto y Soporte

Para preguntas sobre este documento o el proyecto:

- Revisar documentación en `/docs`
- Ver `API_DOCUMENTATION.md` para detalles de endpoints
- Ver `TESTING_GUIDE.md` para ejemplos de pruebas

---

**Última actualización:** 24 de noviembre, 2025  
**Versión:** 2.0.0  
**Status:** ✅ Gaps críticos completados, 8 gaps pendientes
