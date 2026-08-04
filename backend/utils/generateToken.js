const { generateAccessToken } = require('./tokenHelper');

const generateToken = async (id, role = null, workspaceId = null) => {
  return await generateAccessToken(id, role, workspaceId);
};

module.exports = generateToken;
