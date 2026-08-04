const fs = require('fs');

const path = './backend/controllers/taskController.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/req\.user\.role !== 'Admin' && req\.user\.role !== 'SuperAdmin'/g, 
  "!['Admin', 'admin', 'SuperAdmin', 'super_admin'].includes(req.user.role)");

content = content.replace(/req\.user\.role !== 'SuperAdmin' && req\.user\.role !== 'Admin'/g, 
  "!['Admin', 'admin', 'SuperAdmin', 'super_admin'].includes(req.user.role)");

content = content.replace(/req\.user\.role === 'Admin' \|\| req\.user\.role === 'SuperAdmin'/g, 
  "['Admin', 'admin', 'SuperAdmin', 'super_admin'].includes(req.user.role)");

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed role checks');
