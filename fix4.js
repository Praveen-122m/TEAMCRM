const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.jsx') || file.endsWith('.tsx') || file.endsWith('.js')) {
      results.push(file);
    }
  });
  return results;
}
const files = walk('./frontend/src');
let changedCount = 0;
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // Replace glass-button with glass-button-secondary where text-crm-text or text-crm-textMuted is present
  content = content.replace(/className=\"glass-button ([^\"]*text-crm-text(Muted)?[^\"]*)\"/g, 'className=\"glass-button-secondary $1\"');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    changedCount++;
    console.log('Fixed ' + file);
  }
});
console.log('Total files changed: ' + changedCount);
