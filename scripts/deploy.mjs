// Build lalu publikasikan folder dist/ ke branch gh-pages (GitHub Pages "Deploy from branch").
// Pakai: npm run deploy
import { execFileSync } from 'node:child_process';
import { writeFileSync, rmSync } from 'node:fs';

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });
const out = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8' }).trim();

const remote = out('git', ['remote', 'get-url', 'origin']);
const sha = out('git', ['rev-parse', '--short', 'HEAD']);

run('npm', ['run', 'build'], { shell: true });
writeFileSync('dist/.nojekyll', '');
rmSync('dist/.git', { recursive: true, force: true });
run('git', ['init', '-q', '-b', 'gh-pages'], { cwd: 'dist' });
run('git', ['add', '-A'], { cwd: 'dist' });
run('git', ['commit', '-q', '-m', `deploy ${sha}`], { cwd: 'dist' });
run('git', ['push', '-f', remote, 'gh-pages'], { cwd: 'dist' });
rmSync('dist/.git', { recursive: true, force: true });
console.log(`\nTerbit: build dari ${sha} → branch gh-pages`);
