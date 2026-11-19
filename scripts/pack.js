import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const rootDir = process.cwd();
const distDir = path.resolve(rootDir, 'dist');
const zipFile = path.resolve(rootDir, 'gemini-copilot-ext.zip');

console.log('[Pack] 1/2 Running production build...');
execSync('npm run build', { stdio: 'inherit' });

// Ensure _metadata is removed if present
const metadataDir = path.join(distDir, '_metadata');
if (fs.existsSync(metadataDir)) {
  fs.rmSync(metadataDir, { recursive: true, force: true });
}

if (fs.existsSync(zipFile)) {
  fs.unlinkSync(zipFile);
}

console.log('[Pack] 2/2 Compressing dist/ into gemini-copilot-ext.zip...');
// Use PowerShell Compress-Archive on Windows
const items = fs.readdirSync(distDir).map(f => `"${path.join(distDir, f)}"`).join(', ');
const cmd = `powershell -Command "Compress-Archive -Path ${items} -DestinationPath '${zipFile}' -Force"`;
execSync(cmd, { stdio: 'inherit' });

console.log(`[Pack] Successfully generated store-ready package: ${zipFile}`);
