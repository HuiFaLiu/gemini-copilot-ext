import { build } from 'vite';
import path from 'path';
import fs from 'fs';

const rootDir = process.cwd();
const distDir = path.resolve(rootDir, 'dist');

async function runBuild() {
  console.log('[Build] Cleaning dist directory...');
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  fs.mkdirSync(distDir, { recursive: true });

  console.log('[Build] 1/3 Building Content Script...');
  await build({
    root: rootDir,
    build: {
      outDir: distDir,
      emptyOutDir: false,
      lib: {
        entry: path.resolve(rootDir, 'src/content/index.ts'),
        name: 'GeminiCopilotContent',
        formats: ['iife'],
        fileName: () => 'content.js'
      },
      rollupOptions: {
        output: {
          extend: true
        }
      }
    }
  });

  console.log('[Build] 2/3 Building Background Service Worker...');
  await build({
    root: rootDir,
    build: {
      outDir: distDir,
      emptyOutDir: false,
      lib: {
        entry: path.resolve(rootDir, 'src/background/index.ts'),
        name: 'GeminiCopilotBackground',
        formats: ['es'],
        fileName: () => 'background.js'
      }
    }
  });

  console.log('[Build] 3/3 Building Popup HTML & JS...');
  await build({
    root: path.resolve(rootDir, 'src/popup'),
    build: {
      outDir: distDir,
      emptyOutDir: false,
      rollupOptions: {
        input: path.resolve(rootDir, 'src/popup/index.html'),
        output: {
          entryFileNames: 'popup.js',
          assetFileNames: 'assets/[name].[ext]'
        }
      }
    }
  });

  console.log('[Build] Copying manifest.json, rules/, and icons/ into dist/ ...');
  // Copy manifest
  fs.copyFileSync(
    path.resolve(rootDir, 'manifest.json'),
    path.join(distDir, 'manifest.json')
  );

  // Copy rules
  const distRulesDir = path.join(distDir, 'rules');
  fs.mkdirSync(distRulesDir, { recursive: true });
  fs.copyFileSync(
    path.resolve(rootDir, 'rules/usage_dnr.json'),
    path.join(distRulesDir, 'usage_dnr.json')
  );

  // Copy icons
  const distIconsDir = path.join(distDir, 'icons');
  fs.mkdirSync(distIconsDir, { recursive: true });
  const publicIconsDir = path.resolve(rootDir, 'public/icons');
  if (fs.existsSync(publicIconsDir)) {
    for (const file of fs.readdirSync(publicIconsDir)) {
      fs.copyFileSync(path.join(publicIconsDir, file), path.join(distIconsDir, file));
    }
  }

  // Ensure popup.html is in dist root and uses relative asset paths
  const builtPopup = path.join(distDir, 'index.html');
  const targetPopup = path.join(distDir, 'popup.html');
  if (fs.existsSync(builtPopup)) {
    let popupHtml = fs.readFileSync(builtPopup, 'utf-8');
    popupHtml = popupHtml.replace(/src="\/popup\.js"/g, 'src="./popup.js"');
    popupHtml = popupHtml.replace(/src="\/icons\//g, 'src="./icons/');
    fs.writeFileSync(targetPopup, popupHtml, 'utf-8');
    fs.unlinkSync(builtPopup);
  }

  console.log('[Build] Build completed successfully! Load the "dist" folder as an unpacked extension.');
}

runBuild().catch((err) => {
  console.error('[Build] Build failed:', err);
  process.exit(1);
});
