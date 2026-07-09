/**
 * Reduce subscription days — a thin wrapper around extend_days.js
 * that negates the provided number so npm doesn't swallow the `-` flag.
 *
 * Usage:  npm run sub:reduce <email> <days>
 * Effect: Subtracts <days> from the subscriber's expiry.
 */
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: npm run sub:reduce <email> <days>');
  console.log('Example: npm run sub:reduce user@example.com 3   (removes 3 days)');
  process.exit(1);
}

// Find the numeric argument and negate it
const processed = args.map(arg => {
  const num = Number(arg);
  if (!isNaN(num) && arg.trim() !== '') {
    return String(-Math.abs(num)); // always negate so it reduces
  }
  return arg;
});

try {
  execFileSync('node', [path.join(__dirname, 'extend_days.js'), ...processed], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
} catch {
  process.exit(1);
}
