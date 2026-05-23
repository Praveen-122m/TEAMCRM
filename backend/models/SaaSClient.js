const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const bcrypt = require('bcryptjs');

const SaaSClient = sequelize.define('SaaSClient', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  company_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  client_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  secret_key: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'client'
  },
  workspace_id: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'clients',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeCreate: async (client) => {
      if (client.password) {
        const salt = await bcrypt.genSalt(10);
        client.password = await bcrypt.hash(client.password, salt);
      }
    },
    beforeUpdate: async (client) => {
      if (client.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        client.password = await bcrypt.hash(client.password, salt);
      }
    }
  }
});

// Instance method to check password match
SaaSClient.prototype.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = SaaSClient;
