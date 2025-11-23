# Sistema de Almacenamiento Dinámico

El backend de C3M Centralia incluye un sistema de almacenamiento flexible que soporta **tres proveedores**:

- 🗂️ **Local Storage** - Archivos guardados en el servidor
- ☁️ **AWS S3** - Almacenamiento en la nube de Amazon
- 🖼️ **Cloudinary** - Servicio especializado en imágenes y videos

## 📋 Características

- ✅ Cambio dinámico entre proveedores mediante variable de entorno
- ✅ Validación de tipo y tamaño de archivo
- ✅ Soporte para archivos únicos y múltiples
- ✅ Eliminación de archivos
- ✅ Documentación Swagger completa
- ✅ Middleware de autenticación

## 🔧 Configuración

### 1. Variables de Entorno

Agrega estas variables a tu archivo `.env`:

```env
# Proveedor de almacenamiento: local, s3 o cloudinary
STORAGE_PROVIDER=local

# Tamaño máximo de archivo en bytes (5MB por defecto)
MAX_FILE_SIZE=5242880

# Para AWS S3
AWS_ACCESS_KEY_ID=tu_access_key
AWS_SECRET_ACCESS_KEY=tu_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=nombre-bucket

# Para Cloudinary
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

### 2. Storage Local (Por defecto)

No requiere configuración adicional. Los archivos se guardan en:

```
/uploads/{folder}/{timestamp}-{filename}
```

**Ventajas:**

- ✅ Sin costos adicionales
- ✅ Sin dependencias externas
- ✅ Ideal para desarrollo

**Desventajas:**

- ❌ No escalable
- ❌ Se pierde al reiniciar contenedores
- ❌ Requiere backup manual

### 3. AWS S3

Configura las credenciales de AWS:

```env
STORAGE_PROVIDER=s3
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
AWS_S3_BUCKET=c3m-centralia-uploads
```

**Ventajas:**

- ✅ Altamente escalable
- ✅ CDN integrado (CloudFront)
- ✅ Alta disponibilidad
- ✅ Control granular de permisos

**URLs generadas:**

```
https://nombre-bucket.s3.region.amazonaws.com/folder/archivo.jpg
```

### 4. Cloudinary

Configura tus credenciales de Cloudinary:

```env
STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=tu-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz123456
```

**Ventajas:**

- ✅ Optimización automática de imágenes
- ✅ Transformaciones on-the-fly
- ✅ CDN global incluido
- ✅ Ideal para imágenes y videos

**URLs generadas:**

```
https://res.cloudinary.com/tu-cloud-name/image/upload/v1234567890/folder/archivo.jpg
```

## 📡 Endpoints de la API

### 1. Subir un archivo

```bash
POST /api/upload
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: [binary]
folder: "avatars" (opcional)
```

**Respuesta:**

```json
{
  "status": "success",
  "data": {
    "file": {
      "url": "https://...",
      "provider": "s3",
      "key": "avatars/1234567890-photo.jpg"
    }
  }
}
```

### 2. Subir múltiples archivos

```bash
POST /api/upload/multiple
Authorization: Bearer {token}
Content-Type: multipart/form-data

files: [binary, binary, ...]
folder: "documents" (opcional)
```

**Respuesta:**

```json
{
  "status": "success",
  "data": {
    "files": [
      {
        "url": "https://...",
        "provider": "cloudinary",
        "publicId": "documents/file1"
      },
      {
        "url": "https://...",
        "provider": "cloudinary",
        "publicId": "documents/file2"
      }
    ]
  }
}
```

### 3. Eliminar un archivo

```bash
DELETE /api/upload
Authorization: Bearer {token}
Content-Type: application/json

{
  "fileUrl": "https://...",
  "provider": "s3" (opcional)
}
```

### 4. Información del storage

```bash
GET /api/upload/info
```

**Respuesta:**

```json
{
  "status": "success",
  "data": {
    "provider": "local",
    "maxFileSize": 5242880,
    "allowedTypes": ["image/jpeg", "image/png", "image/jpg", "application/pdf"]
  }
}
```

## 💻 Uso en el Código

### Subir un archivo desde un controlador

```typescript
import { storageService } from '../utils/storage.js';

// En tu controlador
const result = await storageService.upload(req.file, {
  folder: 'avatars',
  filename: `user-${userId}.jpg`,
  isPublic: true,
});

console.log(result.url); // URL del archivo
console.log(result.provider); // 'local', 's3' o 'cloudinary'
```

### Eliminar un archivo

```typescript
await storageService.delete(fileUrl);
```

### Validaciones

```typescript
// Validar tipo de archivo
const isValid = storageService.validateFileType(file.mimetype);

// Validar tamaño
const isSizeOk = storageService.validateFileSize(file.size);
```

## 🔒 Seguridad

### Autenticación

Todos los endpoints de upload requieren autenticación JWT:

```typescript
router.post('/', authenticate, upload.single('file'), uploadFile);
```

### Autorización

La eliminación requiere rol de specialist o admin:

```typescript
router.delete('/', authenticate, authorize('admin', 'specialist'), deleteFile);
```

### Validaciones

- ✅ Tipos de archivo permitidos: JPEG, PNG, PDF
- ✅ Tamaño máximo: 5MB (configurable)
- ✅ Nombres de archivo sanitizados

## 📝 Ejemplos de Uso con cURL

### Subir avatar de usuario

```bash
curl -X POST http://localhost:5000/api/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/avatar.jpg" \
  -F "folder=avatars"
```

### Subir documentos clínicos

```bash
curl -X POST http://localhost:5000/api/upload/multiple \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "files=@/path/to/doc1.pdf" \
  -F "files=@/path/to/doc2.pdf" \
  -F "folder=clinical-records"
```

### Eliminar archivo

```bash
curl -X DELETE http://localhost:5000/api/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fileUrl": "https://bucket.s3.amazonaws.com/avatars/file.jpg",
    "provider": "s3"
  }'
```

## 🚀 Cambiar de Proveedor

Para cambiar de proveedor, simplemente actualiza la variable de entorno y reinicia el servidor:

```bash
# De local a S3
STORAGE_PROVIDER=s3

# De S3 a Cloudinary
STORAGE_PROVIDER=cloudinary

# De vuelta a local
STORAGE_PROVIDER=local
```

**Nota:** Los archivos ya subidos permanecen en su proveedor original. El cambio solo afecta nuevos uploads.

## 🔄 Migración entre Proveedores

Si necesitas migrar archivos existentes entre proveedores:

1. Usa el script de migración (crear según necesidad)
2. Actualiza las URLs en la base de datos
3. Elimina archivos del proveedor antiguo

## 📊 Comparación de Proveedores

| Característica   | Local      | S3         | Cloudinary |
| ---------------- | ---------- | ---------- | ---------- |
| Costo            | Gratis     | $          | $$         |
| Escalabilidad    | Baja       | Alta       | Alta       |
| CDN              | No         | Opcional   | Incluido   |
| Transformaciones | No         | No         | Sí         |
| Backup           | Manual     | Automático | Automático |
| Ideal para       | Desarrollo | Producción | Imágenes   |

## 🛠️ Troubleshooting

### Error: "AWS S3 is not configured"

- Verifica que `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY` estén configurados
- Asegúrate que `STORAGE_PROVIDER=s3`

### Error: "Cloudinary is not configured"

- Verifica credenciales de Cloudinary en `.env`
- Asegúrate que `STORAGE_PROVIDER=cloudinary`

### Error: "File too large"

- Aumenta `MAX_FILE_SIZE` en `.env`
- Máximo recomendado: 10MB

### Los archivos locales no se sirven

- Verifica que el directorio `/uploads` exista
- Asegúrate que el servidor tenga permisos de escritura

## 📚 Recursos Adicionales

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Multer Documentation](https://github.com/expressjs/multer)
