# Guía de Contribución

## 🔄 Workflow de Desarrollo

Este proyecto implementa un sistema de validación de calidad de código en **dos niveles**:

### 1️⃣ Validación Local (Pre-commit)

Antes de cada commit, **Husky** ejecuta automáticamente:

- **ESLint**: Valida y corrige el código TypeScript
- **Prettier**: Formatea el código automáticamente
- **Commitlint**: Valida el formato del mensaje de commit

### 2️⃣ Validación Remota (CI/CD)

Cuando haces push o creas un Pull Request, **GitHub Actions** ejecuta:

- ✅ **Lint Job**: Validación de ESLint sin correcciones
- ✅ **TypeCheck Job**: Compilación de TypeScript
- ✅ **Test Job**: Suite completa de tests con cobertura
- ✅ **Security Job**: Auditoría de vulnerabilidades con npm audit
- ✅ **Build Job**: Construcción del proyecto y generación de artefactos

## 📝 Formato de Commits

Este proyecto sigue [Conventional Commits](https://www.conventionalcommits.org/).

### Estructura

```
<tipo>[scope opcional]: <descripción>

[cuerpo opcional]

[footer opcional]
```

### Tipos Permitidos

- `feat`: Nueva funcionalidad
- `fix`: Corrección de bugs
- `docs`: Cambios en documentación
- `style`: Cambios de formato (espacios, punto y coma, etc)
- `refactor`: Refactorización de código
- `perf`: Mejoras de rendimiento
- `test`: Agregar o modificar tests
- `build`: Cambios en el sistema de build
- `ci`: Cambios en configuración de CI/CD
- `chore`: Tareas de mantenimiento
- `revert`: Revertir commits previos

### Ejemplos

```bash
feat: agregar endpoint de reservaciones
fix: corregir validación de fechas en reservas
docs: actualizar README con instrucciones de instalación
refactor: separar lógica de negocio en servicios
test: agregar tests para módulo de clinical records
```

### Usar Commitizen (Recomendado)

```bash
npm run commit
```

Este comando te guía interactivamente para crear commits válidos.

## 🚀 Flujo de Trabajo

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd c3m_centralia_backend
npm install
```

### 2. Crear una rama

```bash
git checkout -b feat/mi-nueva-funcionalidad
```

### 3. Hacer cambios

```bash
# Editar archivos
code src/controllers/miController.ts
```

### 4. Validar localmente

```bash
# Correr linter
npm run lint

# Correr tests
npm run test

# Correr type checking
npm run build
```

### 5. Commit (con hooks automáticos)

```bash
git add .
git commit -m "feat: agregar nueva funcionalidad"
# El pre-commit hook ejecutará lint-staged automáticamente
# El commit-msg hook validará el formato del mensaje
```

O usa Commitizen:

```bash
git add .
npm run commit
```

### 6. Push

```bash
git push origin feat/mi-nueva-funcionalidad
```

### 7. Crear Pull Request

- Los workflows de GitHub Actions se ejecutarán automáticamente
- Todos los checks deben pasar antes de merge
- Requiere revisión de código

## 🛠️ Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Modo watch con tsx
npm run build            # Compilar TypeScript
npm run start            # Ejecutar producción

# Calidad de código
npm run lint             # Validar con ESLint
npm run lint:fix         # Corregir problemas de ESLint

# Testing
npm run test             # Ejecutar todos los tests
npm run test:watch       # Tests en modo watch
npm run test:coverage    # Tests con reporte de cobertura

# Git
npm run commit           # Commit interactivo con Commitizen
```

## 🧪 Testing

El proyecto tiene **159 tests** distribuidos en:

- **Tests Unitarios**: `tests/unit/`
  - Modelos (Mongoose schemas y métodos)
  - Servicios (lógica de negocio)
  - Utilidades (JWT, password hashing)

- **Tests de Integración**: `tests/integration/`
  - Endpoints completos con autenticación
  - Flujos de trabajo end-to-end

### Estructura de Tests

```
tests/
├── setup.ts                      # Configuración global
├── unit/
│   ├── *.model.test.ts          # Tests de modelos
│   ├── *.service.test.ts        # Tests de servicios
│   └── *.test.ts                # Tests de utilidades
└── integration/
    └── *.test.ts                # Tests de endpoints
```

## 📋 Checklist Pre-PR

Antes de crear un Pull Request, asegúrate de que:

- [ ] Los tests pasan (`npm run test`)
- [ ] El linter no tiene errores (`npm run lint`)
- [ ] TypeScript compila sin errores (`npm run build`)
- [ ] Los commits siguen Conventional Commits
- [ ] Has agregado tests para tu nueva funcionalidad
- [ ] Has actualizado la documentación si es necesario

## 🔒 Seguridad

- No subas credenciales ni secrets al repositorio
- Usa variables de entorno (`.env`) para configuración sensible
- El archivo `.env` está en `.gitignore`
- GitHub Actions usa secrets para información sensible

## 🐛 Reportar Issues

Si encuentras un bug:

1. Verifica que no exista un issue similar
2. Crea un nuevo issue con:
   - Descripción clara del problema
   - Pasos para reproducirlo
   - Comportamiento esperado vs actual
   - Versión de Node.js y npm

## 📚 Arquitectura

El proyecto sigue el patrón **Controller → Service → Model**:

```
src/
├── controllers/      # Manejan HTTP (req/res)
├── services/         # Lógica de negocio
├── models/           # Esquemas de Mongoose
├── routes/           # Definición de rutas
├── middleware/       # Autenticación, validación, errores
└── utils/           # Utilidades (JWT, password)
```

### Principios

- **Separación de responsabilidades**: Controladores delgados, servicios robustos
- **DRY**: No repetir código, reutilizar servicios
- **SOLID**: Aplicar principios de diseño orientado a objetos
- **Testing**: Cada módulo tiene su suite de tests

## 🤝 Code Review

Los revisores verificarán:

- ✅ Código sigue las convenciones del proyecto
- ✅ Tests cubren los cambios realizados
- ✅ No hay regresiones
- ✅ Documentación actualizada
- ✅ Commits claros y descriptivos
- ✅ Sin código comentado o console.logs

## 📞 Soporte

Si tienes preguntas, contacta al equipo en:

- Slack: #c3m-centralia-dev
- Email: dev@centralia.com

---

¡Gracias por contribuir! 🎉
