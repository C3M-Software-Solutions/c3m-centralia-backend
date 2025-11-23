module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // Nueva funcionalidad
        'fix',      // Corrección de bugs
        'docs',     // Cambios en documentación
        'style',    // Formato, punto y coma faltante, etc
        'refactor', // Refactorización de código
        'perf',     // Mejoras de rendimiento
        'test',     // Agregar tests
        'build',    // Cambios en el sistema de build
        'ci',       // Cambios en CI/CD
        'chore',    // Tareas de mantenimiento
        'revert',   // Revertir commits
      ],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'scope-case': [2, 'always', 'lower-case'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
  },
};
