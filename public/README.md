# 🔐 Página Estática de Recuperación de Contraseña

Este directorio contiene la página HTML estática para restablecer la contraseña cuando el usuario recibe el token por email desde la aplicación móvil.

## 📄 Archivos

- **`reset-password.html`**: Interfaz de usuario con estructura HTML y CSS
- **`reset-password.js`**: Lógica JavaScript para validación y manejo del formulario

## 🌐 Página Disponible

### `reset-password.html`

**URL:** `http://localhost:5000/reset-password.html?token=xxx`

Página para restablecer la contraseña usando el token recibido por email.

**Flujo de uso:**

1. Usuario solicita recuperación desde la **app móvil**
2. App móvil llama a `POST /api/auth/request-password-reset`
3. Backend envía email con enlace: `http://tu-backend.com/reset-password.html?token=xxx`
4. Usuario hace click en el enlace del email
5. **Página valida el token automáticamente** (`GET /api/auth/validate-reset-token`)
6. Si es válido: Muestra formulario con saludo personalizado "¡Hola {nombre}!"
7. Si es inválido: Muestra mensaje de error
8. Usuario ingresa nueva contraseña
9. Usuario puede volver a la app

**Características:**

- ✅ **Validación de token previa** antes de mostrar el formulario
- ✅ **Saludo personalizado** con el nombre del usuario
- ✅ Diseño responsive y moderno
- ✅ Validación de contraseña en tiempo real
- ✅ Indicador de fortaleza de contraseña
- ✅ Toggle para mostrar/ocultar contraseña
- ✅ Validación de coincidencia de contraseñas
- ✅ Mensajes de éxito/error animados
- ✅ Loading states durante la petición
- ✅ Requisitos visuales de contraseña
- ✅ Pantalla de éxito con mensaje
- ✅ JavaScript separado en archivo externo
- ✅ Llamadas a API:
  - `GET /api/auth/validate-reset-token?token=xxx`
  - `POST /api/auth/reset-password`

---

## 🎨 Diseño

### Paleta de Colores

- **Primario:** `#667eea` → `#764ba2` (Gradiente)
- **Success:** `#10b981` (Verde)
- **Error:** `#ef4444` (Rojo)
- **Info:** `#3b82f6` (Azul)
- **Text:** `#1f2937` (Gris oscuro)
- **Subtitle:** `#6b7280` (Gris medio)

### Características de UX

- Animaciones suaves (slide down, fade in)
- Estados de loading con spinners
- Validación en tiempo real
- Mensajes descriptivos
- Iconos emoji para mayor claridad
- Responsive design (móvil first)

---

## 🚀 Uso

### Desarrollo Local

1. Iniciar el servidor:

```bash
npm run dev
```

2. Acceder a la página:

- Restablecer password: http://localhost:5000/reset-password.html?token=xxx

### Producción

La página se sirve automáticamente desde el directorio `public/`:

```typescript
// src/server.ts
app.use(express.static(path.join(process.cwd(), 'public')));
```

**URLs en producción:**

```
https://tu-dominio.com/reset-password.html?token=xxx
```

---

## 🔗 Integración con Backend

### Flujo Completo

1. **Usuario solicita recuperación** desde la app móvil
2. **App móvil** llama a `POST /api/auth/request-password-reset { email }`
3. **Backend** genera token y envía email con enlace
4. **Email** contiene: `https://tu-backend.com/reset-password.html?token=xxx`
5. **Usuario** hace click y abre la página HTML estática
6. **Usuario** ingresa nueva contraseña
7. **Página** llama a `POST /api/auth/reset-password { token, newPassword }`
8. **Backend** valida y actualiza contraseña
9. **Página** muestra éxito y usuario vuelve a la app

### Email de Recuperación

El backend detecta automáticamente si usar las páginas estáticas o el frontend:

```typescript
// src/services/notificationService.ts
const frontendUrl = process.env.FRONTEND_URL;
const backendUrl = `http://localhost:${process.env.PORT || 5000}`;

// Si no hay frontend configurado, usa páginas estáticas
const baseUrl = !frontendUrl || frontendUrl === 'http://localhost:3000' ? backendUrl : frontendUrl;

const resetUrl = `${baseUrl}/reset-password.html?token=${resetToken}`;
```

### Variables de Entorno

```env
# Para usar páginas estáticas (default)
FRONTEND_URL=

# O especificar el backend
FRONTEND_URL=http://localhost:5000

# Para usar frontend React/Vue/Angular
FRONTEND_URL=https://mi-frontend.com
```

---

## 📱 Vista de la Página

```
┌─────────────────────────────────┐
│      C3M Centralia              │
│  Sistema de Gestión Médica      │
│                                 │
│           🔑                    │
│                                 │
│  Crear Nueva Contraseña         │
│                                 │
│  Requisitos:                    │
│  ✓ Mínimo 6 caracteres          │
│  ✓ Las contraseñas coinciden    │
│                                 │
│  Nueva Contraseña:              │
│  [____________] 👁️              │
│  ████████ Fuerte                │
│                                 │
│  Confirmar:                     │
│  [____________] 👁️              │
│                                 │
│  [Restablecer Contraseña]       │
│                                 │
│  ← Volver a la app              │
└─────────────────────────────────┘
```

---

## ✅ Features Implementados

- [x] Diseño responsive y moderno
- [x] Validación de contraseña en tiempo real
- [x] Indicador de fortaleza de contraseña (débil/media/fuerte)
- [x] Toggle show/hide password (👁️)
- [x] Validación de coincidencia de contraseñas
- [x] Integración completa con API
- [x] Manejo de token expirado/inválido
- [x] Pantalla de éxito animada
- [x] Requisitos visuales de contraseña
- [x] Loading states durante peticiones
- [x] Mensajes de error descriptivos
- [x] CSS inline (sin dependencias externas)

---

## 🔒 Seguridad

### Protecciones Implementadas

- ✅ Token en query parameter (no en body)
- ✅ Validación de token en backend
- ✅ Expiración de 1 hora
- ✅ Uso único de token
- ✅ HTTPS recomendado en producción
- ✅ Content Security Policy en server

### Mejores Prácticas

- No almacenar token en localStorage
- No loggear tokens en consola (producción)
- Validar longitud de contraseña (min 6)
- Mostrar requisitos claramente
- Feedback inmediato al usuario

---

## 🛠️ Personalización

### Cambiar Colores

Editar variables CSS en cada archivo:

```css
:root {
  --primary: #667eea;
  --secondary: #764ba2;
  --success: #10b981;
  --error: #ef4444;
}
```

### Cambiar Logo

Reemplazar en ambos archivos:

```html
<div class="logo">
  <h1>Tu Marca</h1>
  <p>Tu descripción</p>
</div>
```

### Cambiar Mensajes

Buscar y reemplazar textos en español:

```javascript
showAlert('Tu mensaje personalizado', 'success');
```

---

## 🐛 Troubleshooting

### Email no llega

1. Verificar configuración SMTP en `.env`
2. Revisar carpeta de spam
3. Verificar logs del servidor

### Página no carga

1. Verificar que el servidor esté corriendo
2. Verificar que `public/` exista
3. Verificar configuración de `express.static()`

### Token inválido

1. Token expira en 1 hora
2. Solo puede usarse una vez
3. Solicitar nuevo enlace

### Estilos no se ven

1. CSS está inline, no depende de archivos externos
2. Verificar CSP headers en `server.ts`

---

## 📚 Recursos Adicionales

### APIs Utilizadas

**Desde la app móvil:**

- `POST /api/auth/request-password-reset` - Solicita recuperación y envía email

**Desde la página HTML:**

- `POST /api/auth/reset-password` - Restablece contraseña con token

### Documentación

- [PASSWORD_FLOW.md](../PASSWORD_FLOW.md) - Flujo completo
- [API_DOCUMENTATION.md](../API_DOCUMENTATION.md) - Endpoints
- Swagger: <http://localhost:5000/api-docs>

---

## 🔄 Próximas Mejoras

- [ ] Dark mode toggle
- [ ] Múltiples idiomas (i18n)
- [ ] Captcha en solicitud
- [ ] Rate limiting visual
- [ ] PWA support
- [ ] Offline detection
- [ ] Mejor accesibilidad (ARIA)

---

**Versión:** 1.0.0  
**Última actualización:** Noviembre 2024  
**Autor:** C3M Software Solutions
