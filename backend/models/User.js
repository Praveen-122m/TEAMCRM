const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  phoneNumber: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.STRING, // 'Admin', 'Member', 'Client'
    defaultValue: 'Member'
  },
  secretCode: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  profileImage: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  bio: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  department: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  statusMessage: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  isOnline: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  settings: {
    type: DataTypes.JSON,
    defaultValue: {
      theme: 'light',
      emailNotifications: true,
      messageNotifications: true
    }
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  },
  fcmToken: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

// Instance method to check password match
User.prototype.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = User;
