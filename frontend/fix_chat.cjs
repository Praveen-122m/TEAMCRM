const fs = require('fs');

const files = [
  'c:/Users/malvi/OneDrive/Desktop/TeamChatAppliaction/frontend/src/pages/ChannelChat.jsx',
  'c:/Users/malvi/OneDrive/Desktop/TeamChatAppliaction/frontend/src/pages/DirectMessages.jsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Replace background transparencies for CRM colors
  content = content.replace(/bg-crm-darker\/\d+/g, 'bg-crm-darker');
  content = content.replace(/bg-crm-dark\/\d+/g, 'bg-crm-dark');
  content = content.replace(/bg-crm-card\/\d+/g, 'bg-crm-card');
  content = content.replace(/bg-crm-border\/\d+/g, 'bg-crm-border');

  // Remove backdrop-blur
  content = content.replace(/backdrop-blur-(sm|md|lg|xl|2xl|3xl)/g, '');
  content = content.replace(/backdrop-blur\b/g, '');

  // Remove the transparent texture div
  content = content.replace(/<div className="absolute inset-0 bg-\[url[^>]+mix-blend-overlay" \/>/g, '');

  // Replace hardcoded slate and gray with crm colors
  content = content.replace(/bg-slate-800\/50/g, 'bg-crm-card');
  content = content.replace(/bg-slate-800/g, 'bg-crm-card');
  content = content.replace(/bg-slate-700/g, 'bg-crm-border');
  content = content.replace(/bg-gray-800\/50/g, 'bg-crm-card');
  content = content.replace(/bg-gray-800/g, 'bg-crm-card');
  content = content.replace(/bg-gray-900/g, 'bg-crm-dark');
  content = content.replace(/text-slate-400/g, 'text-crm-textMuted');
  content = content.replace(/text-slate-300/g, 'text-crm-text');

  // Cleanup extra spaces left by removals
  content = content.replace(/  +/g, ' ');

  fs.writeFileSync(file, content);
  console.log(`Processed ${file}`);
});
