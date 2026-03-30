import process from 'node:process';
import { execSync } from 'node:child_process';

function getArg(name, fallback) {
  const index = process.argv.findIndex((arg) => arg === name);
  if (index === -1) return fallback;
  const next = process.argv[index + 1];
  return next ?? fallback;
}

const countRaw = getArg('--count', '15');
const count = Number.parseInt(countRaw, 10);
if (!Number.isFinite(count) || count <= 0) {
  console.error(`Invalid --count value: ${countRaw}`);
  process.exit(1);
}

try {
  const output = execSync(
    `git log origin/main --max-count=${count} --date=iso --pretty=format:"%h|%H|%ad|%an|%s"`,
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  );

  if (!output.trim()) {
    console.log('No commits found on origin/main.');
    process.exit(0);
  }

  console.log('Recent rollback candidates from origin/main:');
  console.log('short_sha  full_sha                                   date                 author      subject');
  console.log('---------  ----------------------------------------  -------------------  ----------  -------');

  for (const line of output.trim().split('\n')) {
    const [shortSha, fullSha, date, author, ...subjectParts] = line.split('|');
    const subject = subjectParts.join('|');
    console.log(
      `${(shortSha ?? '').padEnd(9)}  ${(fullSha ?? '').padEnd(40)}  ${(date ?? '').slice(0, 19).padEnd(19)}  ${(author ?? '').slice(0, 10).padEnd(10)}  ${subject ?? ''}`
    );
  }

  console.log('\nUse one full SHA with the "Rollback Deployment" GitHub Action input `commit_sha`.');
} catch (error) {
  console.error('Failed to list rollback candidates.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
