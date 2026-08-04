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

  // Replace text-white inside template literals that also have bg-crm-primary
  content = content.replace(/`([^`]*)`/g, (match, classes) => {
    if (classes.includes('bg-crm-primary') && classes.includes('text-white')) {
      return `\`${classes.replace(/text-white/g, 'text-crm-primary-text')}\``;
    }
    return match;
  });

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    changedCount++;
    console.log('Fixed ' + file);
  }
});
console.log('Total files changed: ' + changedCount);
