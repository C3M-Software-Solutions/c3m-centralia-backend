# Sistema de Notificaciones - C3M Centralia

## 📧 Descripción General

El sistema de notificaciones automáticas envía emails a usuarios y especialistas cuando ocurren eventos importantes relacionados con reservaciones.

## ✨ Características

- ✅ Notificación al especialista cuando se crea una nueva reservación
- ✅ Notificación al paciente cuando se confirma una cita
- ✅ Notificación al paciente cuando se cancela una cita
- ✅ Recordatorio automático 24 horas antes de la cita
- ✅ Templates HTML profesionales y responsivos
- ✅ Configuración flexible de SMTP
- ✅ Manejo de errores sin interrumpir el flujo principal

## 🔧 Configuración

### Variables de Entorno Requeridas

Agrega estas variables a tu archivo `.env`:

```env
# Email (SMTP) - Required for notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password_here
SMTP_FROM_NAME=C3M Centralia
SMTP_FROM_EMAIL=noreply@c3mcentral.com
```

### Configuración con Gmail

Para usar Gmail necesitas crear una **App Password**:

1. Ve a https://myaccount.google.com/apppasswords
2. Selecciona "Mail" y tu dispositivo
3. Copia la contraseña generada
4. Úsala como `SMTP_PASS` en tu `.env`

### Otros Proveedores SMTP

#### SendGrid

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=YOUR_SENDGRID_API_KEY
```

#### Mailgun

```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@yourdomain.com
SMTP_PASS=YOUR_MAILGUN_PASSWORD
```

#### Amazon SES

```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=YOUR_SES_SMTP_USERNAME
SMTP_PASS=YOUR_SES_SMTP_PASSWORD
```

## 📨 Tipos de Notificaciones

### 1. Reservación Creada

**Destinatario:** Especialista  
**Trigger:** Cuando un cliente crea una nueva reservación  
**Contenido:**

- Nombre del paciente
- Email y teléfono del paciente
- Servicio solicitado
- Fecha y hora
- Notas del paciente

### 2. Reservación Confirmada

**Destinatario:** Paciente  
**Trigger:** Cuando el especialista confirma la reservación  
**Contenido:**

- Confirmación de la cita
- Detalles del especialista
- Lugar y fecha
- Recordatorios importantes
- Checklist de preparación

### 3. Reservación Cancelada

**Destinatario:** Paciente  
**Trigger:** Cuando se cancela una reservación  
**Contenido:**

- Información de la cita cancelada
- Motivo de la cancelación (si se proporciona)
- Sugerencias para reagendar

### 4. Recordatorio de Cita

**Destinatario:** Paciente  
**Trigger:** 24 horas antes de la cita (automático)  
**Contenido:**

- Recordatorio de la cita para mañana
- Todos los detalles de la cita
- Checklist de preparación
- Instrucciones de llegada

## 🤖 Sistema de Recordatorios Automáticos

El sistema incluye un job de **node-cron** que se ejecuta automáticamente cada hora para enviar recordatorios.

### Funcionamiento

1. **Ejecución:** Cada hora (cron: `0 * * * *`)
2. **Búsqueda:** Encuentra reservaciones:
   - Estado: `confirmed`
   - Fecha: Entre 24-25 horas desde ahora
   - Sin recordatorio enviado (`reminderSent: false`)
3. **Envío:** Envía email de recordatorio al paciente
4. **Actualización:** Marca `reminderSent: true` en la reservación

### Control Manual

Para ejecutar manualmente el envío de recordatorios (útil para testing):

```typescript
import { reminderService } from './services/reminderService';

// Enviar recordatorios manualmente
await reminderService.triggerReminders();

// Detener el servicio
reminderService.stop();

// Iniciar el servicio
reminderService.start();
```

## 🔌 Integración en el Código

### En Reservaciones

El servicio se integra automáticamente en:

```typescript
// src/services/reservationService.ts

// Al crear reservación -> notifica al especialista
await notificationService.sendReservationCreated(reservation);

// Al confirmar -> notifica al paciente
if (status === 'confirmed') {
  await notificationService.sendReservationConfirmed(reservation);
}

// Al cancelar -> notifica al paciente
if (status === 'cancelled') {
  await notificationService.sendReservationCancelled(reservation);
}
```

### Inicialización Automática

El servicio de recordatorios se inicia automáticamente al arrancar el servidor:

```typescript
// src/server.ts
import { reminderService } from './services/reminderService';

// Start reminder service (runs every hour)
reminderService.start();
```

## 📧 Templates de Email

### Diseño

Todos los templates incluyen:

- ✅ Diseño responsive (mobile-friendly)
- ✅ Estilos inline para máxima compatibilidad
- ✅ Colores distintivos por tipo de notificación
- ✅ Información clara y bien estructurada
- ✅ Formato profesional

### Personalización

Para personalizar los templates, edita:

```
src/services/notificationService.ts
```

Métodos para modificar:

- `getReservationCreatedTemplate()`
- `getReservationConfirmedTemplate()`
- `getReservationCancelledTemplate()`
- `getReservationReminderTemplate()`

## 🧪 Testing

### Modo de Desarrollo

Si las variables SMTP no están configuradas, el servicio:

- ✅ No falla
- ✅ Registra advertencias en consola
- ✅ Permite desarrollo sin email configurado

### Tests Unitarios

```bash
# Ejecutar tests de notificaciones
npm test -- tests/unit/services/notificationService.test.ts

# Ejecutar tests de recordatorios
npm test -- tests/unit/services/reminderService.test.ts
```

### Cobertura de Tests

- ✅ Envío de cada tipo de notificación
- ✅ Manejo de emails faltantes
- ✅ Manejo de errores de SMTP
- ✅ Lógica de recordatorios (ventana de 24-25h)
- ✅ Marcado de `reminderSent`
- ✅ Múltiples recordatorios simultáneos
- ✅ Continuación ante fallos individuales

## 🚨 Manejo de Errores

### Filosofía

Las notificaciones **nunca deben interrumpir** el flujo principal de la aplicación:

```typescript
try {
  await notificationService.sendEmail();
} catch (error) {
  console.error('Failed to send notification:', error);
  // Don't throw - reservations should succeed even if email fails
}
```

### Logs

Todos los eventos se registran en consola:

- ✅ Emails enviados exitosamente
- ⚠️ Advertencias (email faltante, config no encontrada)
- ❌ Errores (fallo de SMTP, conexión rechazada)

## 📊 Métricas y Monitoreo

### Información Disponible

```typescript
// Verificar configuración
console.log(notificationService.transporter ? 'Configured' : 'Not configured');

// Verificar recordatorios enviados
const count = await Reservation.countDocuments({
  reminderSent: true,
});
```

### Recomendaciones

Para producción, considera:

1. **Servicio de Email Transaccional:** SendGrid, Mailgun, Amazon SES
2. **Monitoreo:** Track delivery rates y bounces
3. **Límites de Rate:** Respeta límites del proveedor SMTP
4. **Logging Avanzado:** Winston o similar para logs estructurados
5. **Queue System:** Bull/BullMQ para emails masivos

## 🔄 Flujo Completo

```
Cliente crea reservación
  ↓
[Sistema crea reservación]
  ↓
📧 Email → Especialista (Nueva reservación)
  ↓
Especialista confirma
  ↓
[Sistema actualiza status]
  ↓
📧 Email → Paciente (Confirmación)
  ↓
[Cron job ejecuta cada hora]
  ↓
[Detecta cita en 24h]
  ↓
📧 Email → Paciente (Recordatorio)
  ↓
[Marca reminderSent = true]
```

## 🔐 Seguridad

### Mejores Prácticas

✅ **Nunca** commits credenciales SMTP  
✅ Usa App Passwords, no contraseñas reales  
✅ Habilita autenticación de 2 factores  
✅ Usa TLS/SSL para conexiones SMTP  
✅ Limita rate de envío para evitar spam  
✅ Valida emails antes de enviar  
✅ Sanitiza contenido de usuario en emails

### Variables de Entorno

```env
# ✅ CORRECTO - En .env
SMTP_PASS=xyzw abcd efgh ijkl

# ❌ INCORRECTO - Hardcoded
const password = 'my-password-123';
```

## 📝 Notas Adicionales

### Desarrollo Local

Para desarrollo sin configurar email:

- El sistema funciona normalmente
- Se registran advertencias en lugar de errores
- Las reservaciones se crean correctamente

### Producción

Para producción, asegúrate de:

1. Configurar todas las variables SMTP
2. Usar un servicio profesional de email
3. Monitorear deliverability
4. Tener un dominio verificado
5. Configurar SPF y DKIM records

### Futuras Mejoras

Consideradas para futuros sprints:

- 📱 Notificaciones SMS (Twilio)
- 🔔 Push notifications
- 📊 Dashboard de métricas de emails
- 🎨 Editor visual de templates
- 🌐 Internacionalización (i18n)
- ⚡ Queue system para envíos masivos
- 📈 Analytics de apertura y clicks

## 🆘 Troubleshooting

### Email no se envía

1. Verifica las variables de entorno
2. Revisa los logs de consola
3. Verifica que el puerto no esté bloqueado
4. Prueba con `telnet smtp.gmail.com 587`
5. Verifica App Password en Gmail

### Recordatorios no funcionan

1. Verifica que el servidor esté corriendo
2. Confirma que el cron job está activo
3. Revisa que haya reservaciones en ventana de 24-25h
4. Verifica que tengan `status: 'confirmed'`
5. Confirma que `reminderSent: false`

### Templates no se ven bien

1. Algunos clientes de email bloquean estilos
2. Usa estilos inline (ya incluidos)
3. Prueba en múltiples clientes: Gmail, Outlook, Apple Mail
4. Usa herramientas como Litmus o Email on Acid

---

**Última actualización:** 24 de noviembre, 2025  
**Versión:** 1.0.0  
**Gap:** #2 - Sistema de Notificaciones (Completado ✅)
