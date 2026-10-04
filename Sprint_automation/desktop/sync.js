// Copies the single-file app into dist/ so there is one source of truth: ../index.html
const fs = require('fs'), path = require('path');
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.copyFileSync(path.join(__dirname, '..', 'index.html'), path.join(__dirname, 'dist', 'index.html'));
console.log('synced index.html -> dist/');
