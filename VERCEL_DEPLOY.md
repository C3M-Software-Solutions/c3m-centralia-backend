# Deploy en Vercel

Este proyecto está configurado para desplegarse en Vercel.

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

## Pasos para Deploy

1. **Instala Vercel CLI** (opcional):

   ```bash
   npm install -g vercel
   ```

2. **Deploy desde CLI**:

   ```bash
   vercel
   ```

3. **Deploy desde GitHub**:
   - Conecta tu repositorio en https://vercel.com
   - Vercel detectará automáticamente la configuración
   - Configura las variables de entorno
   - Deploy automático en cada push a `main`

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
