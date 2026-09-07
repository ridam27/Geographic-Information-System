#!/usr/bin/env node
// Cascades `npm i` at the repo root into every sub-project's own install step
// (npm for Node projects, pip/venv for the Python one). Runs automatically
// via the root package.json's "postinstall" hook — just run `npm i` here.

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = __dirname && path.resolve(__dirname, '..');

const NODE_PROJECTS = [
  'GIS-3D',
  'GIS-3D/backend',
  'GIS-Construction/frontend',
  'GIS-environment',
  'GIS-Survey',
  'GIS-Survey/survey-backend',
  'GIS-Survey/survey-frontend',
  'GIS-Viewer',
  'GIS-Viewer/backend',
  'GIS-Wild-life',
  'GIS-Wild-life/backend',
  'iot-server',
  'main application',
  'main application/backend',
];

const PYTHON_PROJECTS = [
  {
    dir: 'GIS-Construction/backend',
    requirements: 'requirements.utf8.txt',
  },
];

function run(cmd, args, cwd, label) {
  console.log(`\n\x1b[36m==> ${label}\x1b[0m`);
  const result = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    console.error(`\x1b[31m✗ ${label} failed (exit ${result.status})\x1b[0m`);
    return false;
  }
  return true;
}

let failures = [];

for (const rel of NODE_PROJECTS) {
  const dir = path.join(ROOT, rel);
  if (!fs.existsSync(path.join(dir, 'package.json'))) {
    console.log(`\x1b[90m-- skipping ${rel} (no package.json)\x1b[0m`);
    continue;
  }
  const ok = run('npm', ['install'], dir, `npm install — ${rel}`);
  if (!ok) failures.push(rel);
}

for (const { dir: rel, requirements } of PYTHON_PROJECTS) {
  const dir = path.join(ROOT, rel);
  const venvPython = path.join(dir, 'venv', 'Scripts', 'python.exe');
  const reqPath = path.join(dir, requirements);

  if (!fs.existsSync(reqPath)) {
    console.log(`\x1b[90m-- skipping ${rel} (no ${requirements})\x1b[0m`);
    continue;
  }
  if (!fs.existsSync(venvPython)) {
    const ok = run('python', ['-m', 'venv', 'venv'], dir, `create venv — ${rel}`);
    if (!ok) {
      failures.push(rel);
      continue;
    }
  }
  const ok = run(venvPython, ['-m', 'pip', 'install', '-r', requirements], dir, `pip install — ${rel}`);
  if (!ok) failures.push(rel);
}

console.log('\n' + '='.repeat(50));
if (failures.length === 0) {
  console.log('\x1b[32mAll sub-projects installed successfully.\x1b[0m');
} else {
  console.log(`\x1b[31m${failures.length} sub-project(s) failed:\x1b[0m`);
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exitCode = 1;
}
