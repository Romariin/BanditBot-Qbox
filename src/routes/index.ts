import { readdirSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import fastify from '../utils/fastify';

// Dynamically import and register all route files in this directory (except this index.ts)
const routesDir = __dirname;

const files = readdirSync(routesDir)
    .filter((file) => file !== basename(__filename) && extname(file) === '.ts');

for (const file of files) {
    import(join(routesDir, file));
}

export default fastify;
