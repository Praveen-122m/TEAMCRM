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

  // regex to match className="..." containing bg-crm-primary and text-white anywhere inside the quotes
  // We'll replace text-white with text-crm-primaryText
  const regex = /className=\"([^\"]*)\"/g;
  content = content.replace(regex, (match, classes) => {
    if (classes.includes('bg-crm-primary') && classes.includes('text-white')) {
      return `className="${classes.replace('text-white', 'text-crm-primaryText')}"`;
    }
    return match;
  });

  // Replace remaining indigo/violet
  content = content.replace(/bg-indigo-[345678]00/g, 'bg-crm-primary');
  content = content.replace(/bg-violet-[345678]00/g, 'bg-crm-primary');
  content = content.replace(/text-indigo-[345678]00/g, 'text-crm-primary');
  content = content.replace(/text-violet-[345678]00/g, 'text-crm-primary');
  content = content.replace(/border-indigo-[345678]00/g, 'border-crm-primary');
  content = content.replace(/border-violet-[345678]00/g, 'border-crm-primary');
  
  // Specific fixes
  content = content.replace(/border-indigo/g, 'border-crm-primary');
  content = content.replace(/text-indigo/g, 'text-crm-primary');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    changedCount++;
    console.log('Fixed ' + file);
  }
});
console.log('Total files changed: ' + changedCount);
