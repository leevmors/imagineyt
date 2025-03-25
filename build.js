const { execSync } = require('child_process');

console.log('Running Prisma Generate...');
execSync('npx prisma generate', { stdio: 'inherit' });

console.log('Running Next.js Build...');
execSync('next build', { stdio: 'inherit' }); 