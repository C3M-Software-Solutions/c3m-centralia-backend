import { swaggerSpec } from './dist/swagger.js';
import { writeFileSync } from 'fs';

// Generate static swagger-spec.json file
writeFileSync('./swagger-spec.json', JSON.stringify(swaggerSpec, null, 2));
console.log('✅ swagger-spec.json actualizado correctamente');
