const { connectDB } = require('./config/db');
const User = require('./models/User');
const Member = require('./models/Member');
const Workspace = require('./models/Workspace');
const Channel = require('./models/Channel');
const { createMember } = require('./controllers/memberController');

async function run() {
  try {
    await connectDB();
    console.log('DB connected and associations initialized.');

    // 1. Create a workspace
    const owner = await User.create({
      name: 'Owner Admin',
      email: 'owner-admin@example.com',
      password: 'SecurePassword123!',
      role: 'Admin'
    });
    
    const workspace = await Workspace.create({
      name: 'Test Admin Workspace',
      description: 'Desc',
      inviteCode: 'TESTWSADM',
      type: 'office',
      ownerId: owner._id
    });
    console.log('Created Workspace:', workspace._id);

    // Mock Express request and response objects
    const req = {
      body: {
        name: 'New Member User',
        email: 'new-member-user@example.com',
        password: 'SecurePassword123!',
        designation: 'Engineer',
        department: 'Engineering',
        workspaceId: workspace._id
      }
    };

    let responseStatus = null;
    let responseData = null;

    const res = {
      status: (code) => {
        responseStatus = code;
        return {
          json: (data) => {
            responseData = data;
          }
        };
      },
      json: (data) => {
        responseStatus = 200;
        responseData = data;
      }
    };

    // Call the real controller function
    await createMember(req, res);
    console.log('Controller returned status:', responseStatus);
    console.log('Controller response data:', responseData);

    // Cleanup
    const user = await User.findOne({ where: { email: 'new-member-user@example.com' } });
    if (user) {
      await Member.destroy({ where: { userId: user._id } });
      await user.destroy();
    }
    await workspace.destroy();
    await owner.destroy();
    
    console.log('Cleanup finished.');
    process.exit(0);
  } catch (err) {
    console.error('FAILED:', err);
    process.exit(1);
  }
}

run();
