const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { connectDB } = require('../config/db');
const SaaSClient = require('../models/SaaSClient');
const Workspace = require('../models/Workspace');
const Channel = require('../models/Channel');
const Message = require('../models/Message');
const User = require('../models/User');
const { sendMessage, getMessages } = require('../controllers/messageController');

const runTest = async () => {
  try {
    await connectDB();

    console.log('[TEST] Cleaning up any previous test data...');
    const oldWorkspace = await Workspace.findOne({ where: { name: 'Temp Chat Workspace' } });
    if (oldWorkspace) {
      await Channel.destroy({ where: { workspaceId: oldWorkspace._id } });
      await Message.destroy({ where: { workspaceId: oldWorkspace._id } });
      await Workspace.destroy({ where: { _id: oldWorkspace._id } });
    }
    await SaaSClient.destroy({ where: { email: 'rajat-chat@example.com' } });

    console.log('[TEST] Setting up test data for chat...');
    
    // Fetch a user for ownerId
    const firstUser = await User.findOne();
    if (!firstUser) {
      throw new Error('No user found in database.');
    }

    const workspace = await Workspace.create({
      name: 'Temp Chat Workspace',
      inviteCode: 'CHATDEL',
      ownerId: firstUser._id,
      type: 'client'
    });

    const client = await SaaSClient.create({
      company_name: 'Chat Industries',
      client_name: 'Rajat Client',
      email: 'rajat-chat@example.com',
      password: 'Password123!',
      visible_password: 'Password123!',
      secret_key: 'CL-CHATSECRETMETA',
      workspace_id: workspace._id,
      role: 'client'
    });

    const channel = await Channel.create({
      name: 'general',
      workspaceId: workspace._id,
      isPrivate: false
    });

    console.log(`[TEST] Client ID: ${client.id}, Channel ID: ${channel._id}, Workspace ID: ${workspace._id}`);

    // Mock req and res for sendMessage
    const sendReq = {
      user: {
        _id: client.id,
        role: 'Client',
        workspaces: [workspace._id]
      },
      body: {
        content: 'Hello, this is a test message from a client!',
        channelId: channel._id,
        workspaceId: workspace._id
      },
      app: {
        get: (key) => {
          if (key === 'socketio') {
            return {
              to: () => ({
                emit: () => {}
              })
            };
          }
          return null;
        }
      }
    };

    let sendStatus = 200;
    let sendJsonData = null;
    const sendRes = {
      status: (code) => {
        sendStatus = code;
        return sendRes;
      },
      json: (data) => {
        sendJsonData = data;
        return sendRes;
      }
    };

    console.log('[TEST] Calling sendMessage...');
    await sendMessage(sendReq, sendRes);

    console.log(`[TEST] Send Status: ${sendStatus}`);
    console.log('[TEST] Send Response JSON:', sendJsonData);

    if (sendStatus !== 201 || !sendJsonData || !sendJsonData.sender) {
      throw new Error('sendMessage failed or sender object is missing!');
    }

    if (sendJsonData.sender.name !== 'Rajat Client') {
      throw new Error(`Sender name expected 'Rajat Client', got '${sendJsonData.sender.name}'`);
    }

    // Mock req and res for getMessages
    const getReq = {
      user: {
        _id: client.id,
        role: 'Client'
      },
      params: {
        channelId: channel._id
      }
    };

    let getStatus = 200;
    let getJsonData = null;
    const getRes = {
      status: (code) => {
        getStatus = code;
        return getRes;
      },
      json: (data) => {
        getJsonData = data;
        return getRes;
      }
    };

    console.log('[TEST] Calling getMessages...');
    await getMessages(getReq, getRes);

    console.log(`[TEST] Get Status: ${getStatus}`);
    console.log('[TEST] Get Response JSON Length:', getJsonData?.length);

    if (getStatus !== 200 || !getJsonData || getJsonData.length === 0) {
      throw new Error('getMessages failed or returned no messages!');
    }

    const firstMsg = getJsonData[0];
    console.log('[TEST] Loaded Message Sender:', firstMsg.sender);

    if (!firstMsg.sender || firstMsg.sender.name !== 'Rajat Client') {
      throw new Error('Sender details not resolved in getMessages list!');
    }

    // Clean up
    console.log('[TEST] Cleaning up chat test data...');
    await Message.destroy({ where: { workspaceId: workspace._id } });
    await Channel.destroy({ where: { _id: channel._id } });
    await SaaSClient.destroy({ where: { id: client.id } });
    await Workspace.destroy({ where: { _id: workspace._id } });

    console.log('[TEST] All chat tests passed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('[TEST] Chat test script execution failed:', error.message);
    process.exit(1);
  }
};

runTest();
