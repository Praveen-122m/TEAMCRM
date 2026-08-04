const fs = require('fs');
const files = [
  './frontend/src/pages/MetaAdsDashboard.jsx',
  './frontend/src/pages/InstagramAnalytics.jsx'
];
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // Replace glass-button with glass-button-secondary where text-crm-text or text-crm-textMuted is present
  content = content.replace(/className=\"glass-button ([^\"]*text-crm-text(Muted)?[^\"]*)\"/g, 'className=\"glass-button-secondary $1\"');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed ' + file);
  }
});
