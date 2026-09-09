const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const ZIP_FILE = path.join(ROOT, 'all_env_files.zip');

if (!fs.existsSync(ZIP_FILE)) {
  console.error('❌ all_env_files.zip not found in project root!');
  process.exit(1);
}

console.log('📦 Extracting environment files from all_env_files.zip...');

try {
  if (process.platform === 'win32') {
    execSync(`powershell -Command "Expand-Archive -Path '${ZIP_FILE}' -DestinationPath '${ROOT}' -Force"`, { stdio: 'inherit' });
  } else {
    execSync(`unzip -o "${ZIP_FILE}" -d "${ROOT}"`, { stdio: 'inherit' });
  }
  console.log('✅ All .env files extracted successfully to their respective directory paths!');
} catch (err) {
  console.error('❌ Failed to extract zip file:', err.message);
  process.exit(1);
}
