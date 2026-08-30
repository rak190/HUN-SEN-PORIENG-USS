import { execSync } from 'child_process';
import path from 'path';

console.log('Running Security Integration Tests...');

try {
  // Use node --test to run the tests
  const testPath = path.join(__dirname, 'auth-guards.test.ts');
  execSync(`npx tsx --test ${testPath}`, { stdio: 'inherit' });
  console.log('✅ Security tests passed.');
} catch (err: any) {
  console.error('❌ Security tests failed.');
  process.exit(1);
}
