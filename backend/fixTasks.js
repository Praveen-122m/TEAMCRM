require('dotenv').config({ path: './.env' });
const { sequelize } = require('./config/db');
const Task = require('./models/Task');
const Workspace = require('./models/Workspace');
const Channel = require('./models/Channel');

async function fixExistingTaskAssignments() {
  try {
    await sequelize.authenticate();
    console.log('Connected to DB');
    
    const tasks = await Task.findAll();
    console.log(`Found ${tasks.length} tasks.`);
    
    let fixedCount = 0;
    
    for (const task of tasks) {
      if (task.assignedTo && task.workspaceId) {
        const workspace = await Workspace.findByPk(task.workspaceId);
        if (workspace) {
          const isMember = await workspace.hasMember(task.assignedTo);
          if (!isMember) {
            console.log(`Adding user ${task.assignedTo} to workspace ${workspace.name}`);
            await workspace.addMember(task.assignedTo);
            
            const channel = await Channel.findOne({ where: { workspaceId: workspace._id, name: 'general' } });
            if (channel) {
               await channel.addMember(task.assignedTo);
            }
            fixedCount++;
          }
        }
      }
    }
    
    console.log(`Fixed ${fixedCount} task assignments.`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

fixExistingTaskAssignments();
