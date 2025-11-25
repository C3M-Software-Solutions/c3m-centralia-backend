# Deploy en Vercel

Este proyecto está configurado para desplegarse en Vercel.

## ⚠️ Consideraciones Importantes de Vercel (Serverless)

Vercel es una plataforma **serverless**, lo que significa:

- Las funciones se ejecutan solo cuando reciben requests
- No hay procesos en ejecución continua
- Los **cron jobs nativos NO están en el plan gratuito** (requieren plan Pro $20/mes)

### 🔧 Solución para Recordatorios Automáticos (Plan Gratuito)

El sistema de recordatorios usa **GitHub Actions** (100% gratis):

- Ver configuración en `.github/workflows/send-reminders.yml`
- Ejecuta el endpoint `/api/cron/send-reminders` cada hora
- Requiere configurar `CRON_SECRET` (ver abajo)

**Alternativa:** Usa https://cron-job.org (gratis) para llamar al endpoint cada hora.

---

## Variables de Entorno Requeridas

Configura las siguientes variables en el dashboard de Vercel:

### Base de Datos

- `MONGODB_URI` - URI de conexión a MongoDB Atlas

### JWT

- `JWT_SECRET` - Secret para firmar tokens de acceso
- `JWT_REFRESH_SECRET` - Secret para firmar tokens de refresh
- `JWT_EXPIRES_IN` - Tiempo de expiración del token (ej: 15m, 1h, 1d)
- `JWT_REFRESH_EXPIRES_IN` - Tiempo de expiración del refresh token (ej: 7d, 30d)

### Servidor

- `NODE_ENV` - Establecer como `production`
- `PORT` - Puerto del servidor (Vercel lo asigna automáticamente)

### CORS (Opcional)

- `CORS_ORIGIN` - Origen permitido para CORS (ej: https://tuapp.com)

### Almacenamiento (Opcional)

Si usas S3:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `AWS_S3_BUCKET`

Si usas Cloudinary:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

### Email (Opcional)

- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_USER`
- `EMAIL_PASSWORD`

### Cron Job Security (Requerido para Recordatorios)

- `CRON_SECRET` - Token secreto para proteger el endpoint de cron jobs
  - Genera un token aleatorio largo (ej: `mi_token_super_secreto_123abc`)
  - Debe ser el mismo en GitHub Secrets y Vercel Environment Variables

---

## 🚀 Pasos para Deploy

1. **Instala Vercel CLI** (opcional):

   ```bash
   npm install -g vercel
   ```

2. **Deploy desde CLI**:

   ```bash
   vercel
   ```

3. **Deploy desde GitHub**:
   - Conecta tu repositorio en Vercel
   - Vercel detectará automáticamente la configuración
   - Configura las variables de entorno
   - Deploy automático en cada push a `main`

4. **Configurar GitHub Actions para Cron Jobs** (Gratis):
   - Ve a tu repositorio en GitHub → Settings → Secrets and variables → Actions
   - Agrega: `CRON_SECRET` con el mismo valor que en Vercel
   - El workflow `.github/workflows/send-reminders.yml` ya está configurado
   - Se ejecutará automáticamente cada hora

---

## ✅ Verificación Post-Deploy

### Health Check

```bash
curl https://tu-proyecto.vercel.app/health
```

### Test Manual de Recordatorios

```bash
curl -X POST https://tu-proyecto.vercel.app/api/cron/send-reminders \
  -H "x-cron-secret: tu_secreto" \
  -H "Content-Type: application/json"
```

---

## Endpoints de la API

Una vez desplegado, tu API estará disponible en:

- `https://tu-proyecto.vercel.app/api/auth/*`
- `https://tu-proyecto.vercel.app/api/businesses/*`
- `https://tu-proyecto.vercel.app/api/reservations/*`
- `https://tu-proyecto.vercel.app/api/clinical-records/*`
- `https://tu-proyecto.vercel.app/api/upload/*`

## Documentación API

- Swagger UI: `https://tu-proyecto.vercel.app/api/docs`

## Notas Importantes

1. **MongoDB**: Asegúrate de usar MongoDB Atlas o una base de datos accesible desde internet
2. **Uploads**: En Vercel, el sistema de archivos es efímero. Usa S3 o Cloudinary para almacenamiento de archivos
3. **Límites**: Vercel tiene límites de tiempo de ejecución (10s para hobby, 60s para pro)
4. **Cold Starts**: La primera petición puede tardar más debido al cold start

## Troubleshooting

Si el deploy falla:

1. Verifica que todas las variables de entorno estén configuradas
2. Revisa los logs en el dashboard de Vercel
3. Asegúrate de que `MONGODB_URI` sea válido y accesible
4. Verifica que el build se complete correctamente localmente: `npm run build`
