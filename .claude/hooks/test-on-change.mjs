// PostToolUse: после правки файлов с логикой запускает тесты и возвращает Claude ошибки (exit 2)
import { execSync } from 'node:child_process';
import { relative } from 'node:path';

const input = JSON.parse(await new Promise((resolve) => {
  let data = '';
  process.stdin.on('data', (c) => (data += c));
  process.stdin.on('end', () => resolve(data || '{}'));
}));

const file = input.tool_input?.file_path ?? input.tool_response?.filePath ?? '';
const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const rel = relative(root, file);
const watched = /^(src\/(dates|courses)\.ts|src\/data\/[^/]+\.json|api\/_lib\/telegram\.ts|tests\/.+\.test\.ts)$/;
if (!watched.test(rel)) process.exit(0);

try {
  execSync('npx vitest run --reporter=dot', { cwd: root, stdio: 'pipe', timeout: 90_000, env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' } });
} catch (e) {
  const out = `${e.stdout ?? ''}${e.stderr ?? ''}`.split('\n').filter((l) => /FAIL|×|AssertionError|Expected|Received|Tests /.test(l));
  process.stderr.write(`Тесты упали после правки ${rel}:\n${out.slice(0, 30).join('\n')}\n`);
  process.exit(2);
}
