import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');
const indexPath = path.join(distDir, 'index.html');
const fallbackPath = path.join(distDir, '404.html');
const noJekyllPath = path.join(distDir, '.nojekyll');

try {
  if (fs.existsSync(indexPath)) {
    fs.copyFileSync(indexPath, fallbackPath);
    console.log('Successfully copied index.html to 404.html');
  } else {
    console.error('index.html not found in dist/ directory!');
  }
  
  fs.writeFileSync(noJekyllPath, '');
  console.log('Created .nojekyll file');
} catch (err) {
  console.error('Error in postbuild copying:', err);
}
