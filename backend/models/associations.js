const User = require('./User');
const Workspace = require('./Workspace');
const Channel = require('./Channel');
const Message = require('./Message');
const MessageReaction = require('./MessageReaction');
const Meeting = require('./Meeting');
const Notification = require('./Notification');
const Attendance = require('./Attendance');
const Project = require('./Project');
const ProjectFeedback = require('./ProjectFeedback');
const ProjectRequest = require('./ProjectRequest');
const Announcement = require('./Announcement');
const AnnouncementReply = require('./AnnouncementReply');
const Client = require('./Client');
const Member = require('./Member');
const ClientAssignment = require('./ClientAssignment');
const MetaAdsCampaign = require('./MetaAdsCampaign');
const MetaAdsConnection = require('./MetaAdsConnection');
const MetaAdsLead = require('./MetaAdsLead');
const File = require('./File');
const Report = require('./Report');

function initAssociations() {
  console.log('[DB] Initializing database model associations...');

  // ══════════════════════════════════════════════════
  // User <-> Client (One-to-One)
  // ══════════════════════════════════════════════════
  User.hasOne(Client, { foreignKey: 'userId', as: 'clientProfile', onDelete: 'CASCADE' });
  Client.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  // ══════════════════════════════════════════════════
  // User <-> Member (One-to-One)
  // ══════════════════════════════════════════════════
  User.hasOne(Member, { foreignKey: 'userId', as: 'memberProfile', onDelete: 'CASCADE' });
  Member.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  // ══════════════════════════════════════════════════
  // Client <-> Member Assignments (Many-to-Many via ClientAssignment)
  // ══════════════════════════════════════════════════
  Client.hasMany(ClientAssignment, { foreignKey: 'clientId', as: 'assignments', onDelete: 'CASCADE' });
  ClientAssignment.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });

  Member.hasMany(ClientAssignment, { foreignKey: 'memberId', as: 'assignments', onDelete: 'CASCADE' });
  ClientAssignment.belongsTo(Member, { foreignKey: 'memberId', as: 'member' });

  User.hasMany(ClientAssignment, { foreignKey: 'assignedById', as: 'madeAssignments' });
  ClientAssignment.belongsTo(User, { foreignKey: 'assignedById', as: 'assignedBy' });

  // ══════════════════════════════════════════════════
  // User <-> Workspace (Many-to-Many for members and admins)
  // ══════════════════════════════════════════════════
  User.belongsToMany(Workspace, { as: 'workspaces', through: 'WorkspaceMembers', foreignKey: 'userId', otherKey: 'workspaceId' });
  Workspace.belongsToMany(User, { as: 'members', through: 'WorkspaceMembers', foreignKey: 'workspaceId', otherKey: 'userId' });

  // Workspace owner (One-to-Many)
  User.hasMany(Workspace, { as: 'ownedWorkspaces', foreignKey: 'ownerId' });
  Workspace.belongsTo(User, { as: 'owner', foreignKey: 'ownerId' });

  // Workspace admins (Many-to-Many)
  Workspace.belongsToMany(User, { as: 'admins', through: 'WorkspaceAdmins', foreignKey: 'workspaceId', otherKey: 'userId' });
  User.belongsToMany(Workspace, { as: 'administeredWorkspaces', through: 'WorkspaceAdmins', foreignKey: 'userId', otherKey: 'workspaceId' });

  // ══════════════════════════════════════════════════
  // User <-> Channel (Many-to-Many)
  // ══════════════════════════════════════════════════
  User.belongsToMany(Channel, { as: 'channels', through: 'ChannelMembers', foreignKey: 'userId', otherKey: 'channelId' });
  Channel.belongsToMany(User, { as: 'members', through: 'ChannelMembers', foreignKey: 'channelId', otherKey: 'userId' });

  // Workspace <-> Channel (One-to-Many)
  Workspace.hasMany(Channel, { foreignKey: 'workspaceId', onDelete: 'CASCADE' });
  Channel.belongsTo(Workspace, { foreignKey: 'workspaceId' });

  // ══════════════════════════════════════════════════
  // Message Associations
  // ══════════════════════════════════════════════════
  User.hasMany(Message, { foreignKey: 'senderId' });
  Message.belongsTo(User, { as: 'sender', foreignKey: 'senderId' });

  User.hasMany(Message, { foreignKey: 'receiverId' });
  Message.belongsTo(User, { as: 'receiver', foreignKey: 'receiverId' });

  Channel.hasMany(Message, { foreignKey: 'channelId', onDelete: 'CASCADE' });
  Message.belongsTo(Channel, { as: 'channel', foreignKey: 'channelId' });

  Workspace.hasMany(Message, { foreignKey: 'workspaceId', onDelete: 'CASCADE' });
  Message.belongsTo(Workspace, { as: 'workspace', foreignKey: 'workspaceId' });

  // Message <-> User (Many-to-Many for readBy list)
  Message.belongsToMany(User, { as: 'readBy', through: 'MessageReadBy', foreignKey: 'messageId', otherKey: 'userId' });
  User.belongsToMany(Message, { as: 'readMessages', through: 'MessageReadBy', foreignKey: 'userId', otherKey: 'messageId' });

  // Message <-> MessageReaction (One-to-Many)
  Message.hasMany(MessageReaction, { as: 'reactions', foreignKey: 'messageId', onDelete: 'CASCADE' });
  MessageReaction.belongsTo(Message, { foreignKey: 'messageId' });
  
  User.hasMany(MessageReaction, { foreignKey: 'userId' });
  MessageReaction.belongsTo(User, { foreignKey: 'userId' });

  // ══════════════════════════════════════════════════
  // Meeting Associations
  // ══════════════════════════════════════════════════
  Workspace.hasMany(Meeting, { foreignKey: 'workspaceId', onDelete: 'CASCADE' });
  Meeting.belongsTo(Workspace, { foreignKey: 'workspaceId' });

  User.hasMany(Meeting, { foreignKey: 'createdById' });
  Meeting.belongsTo(User, { as: 'createdBy', foreignKey: 'createdById' });

  // ══════════════════════════════════════════════════
  // Notification Associations
  // ══════════════════════════════════════════════════
  User.hasMany(Notification, { as: 'notifications', foreignKey: 'recipientId', onDelete: 'CASCADE' });
  Notification.belongsTo(User, { as: 'recipient', foreignKey: 'recipientId' });

  User.hasMany(Notification, { as: 'sentNotifications', foreignKey: 'senderId' });
  Notification.belongsTo(User, { as: 'sender', foreignKey: 'senderId' });

  // ══════════════════════════════════════════════════
  // Attendance Associations
  // ══════════════════════════════════════════════════
  User.hasMany(Attendance, { foreignKey: 'userId', onDelete: 'CASCADE' });
  Attendance.belongsTo(User, { as: 'user', foreignKey: 'userId' });

  Workspace.hasMany(Attendance, { foreignKey: 'workspaceId', onDelete: 'CASCADE' });
  Attendance.belongsTo(Workspace, { foreignKey: 'workspaceId' });

  // ══════════════════════════════════════════════════
  // Project Associations
  // ══════════════════════════════════════════════════
  Workspace.hasMany(Project, { foreignKey: 'workspaceId', onDelete: 'CASCADE' });
  Project.belongsTo(Workspace, { foreignKey: 'workspaceId' });

  User.hasMany(Project, { foreignKey: 'clientId' });
  Project.belongsTo(User, { as: 'client', foreignKey: 'clientId' });

  // Project <-> ProjectFeedback
  Project.hasMany(ProjectFeedback, { as: 'feedback', foreignKey: 'projectId', onDelete: 'CASCADE' });
  ProjectFeedback.belongsTo(Project, { foreignKey: 'projectId' });

  User.hasMany(ProjectFeedback, { foreignKey: 'userId' });
  ProjectFeedback.belongsTo(User, { as: 'user', foreignKey: 'userId' });

  // ProjectRequest Associations
  User.hasMany(ProjectRequest, { foreignKey: 'clientId', onDelete: 'CASCADE' });
  ProjectRequest.belongsTo(User, { as: 'client', foreignKey: 'clientId' });

  Workspace.hasMany(ProjectRequest, { foreignKey: 'workspaceId', onDelete: 'CASCADE' });
  ProjectRequest.belongsTo(Workspace, { foreignKey: 'workspaceId' });

  // ══════════════════════════════════════════════════
  // Announcement Associations
  // ══════════════════════════════════════════════════
  Workspace.hasMany(Announcement, { foreignKey: 'workspaceId', onDelete: 'CASCADE' });
  Announcement.belongsTo(Workspace, { foreignKey: 'workspaceId' });

  Project.hasMany(Announcement, { foreignKey: 'projectId', onDelete: 'SET NULL' });
  Announcement.belongsTo(Project, { foreignKey: 'projectId' });

  User.hasMany(Announcement, { foreignKey: 'senderId' });
  Announcement.belongsTo(User, { as: 'sender', foreignKey: 'senderId' });

  User.hasMany(Announcement, { foreignKey: 'assignedToId' });
  Announcement.belongsTo(User, { as: 'assignedTo', foreignKey: 'assignedToId' });

  User.hasMany(Announcement, { foreignKey: 'broadcastedById' });
  Announcement.belongsTo(User, { as: 'broadcastedBy', foreignKey: 'broadcastedById' });

  // Announcement <-> AnnouncementReply
  Announcement.hasMany(AnnouncementReply, { as: 'replies', foreignKey: 'announcementId', onDelete: 'CASCADE' });
  AnnouncementReply.belongsTo(Announcement, { foreignKey: 'announcementId' });

  User.hasMany(AnnouncementReply, { foreignKey: 'userId' });
  AnnouncementReply.belongsTo(User, { as: 'user', foreignKey: 'userId' });

  // ══════════════════════════════════════════════════
  // Meta Ads Associations
  // ══════════════════════════════════════════════════
  Workspace.hasMany(MetaAdsCampaign, { foreignKey: 'workspaceId', onDelete: 'CASCADE' });
  MetaAdsCampaign.belongsTo(Workspace, { foreignKey: 'workspaceId' });

  Workspace.hasMany(MetaAdsLead, { foreignKey: 'workspaceId', onDelete: 'CASCADE' });
  MetaAdsLead.belongsTo(Workspace, { foreignKey: 'workspaceId' });

  Workspace.hasOne(MetaAdsConnection, { foreignKey: 'workspaceId', onDelete: 'CASCADE' });
  MetaAdsConnection.belongsTo(Workspace, { foreignKey: 'workspaceId' });

  MetaAdsCampaign.hasMany(MetaAdsLead, { foreignKey: 'campaignId', onDelete: 'SET NULL' });
  MetaAdsLead.belongsTo(MetaAdsCampaign, { as: 'campaign', foreignKey: 'campaignId' });

  Client.hasMany(MetaAdsLead, { foreignKey: 'clientId', as: 'leads', onDelete: 'CASCADE' });
  MetaAdsLead.belongsTo(Client, { as: 'client', foreignKey: 'clientId' });

  Member.hasMany(MetaAdsLead, { foreignKey: 'assignedMemberId', as: 'assignedLeads', onDelete: 'SET NULL' });
  MetaAdsLead.belongsTo(Member, { as: 'assignedMember', foreignKey: 'assignedMemberId' });

  // ══════════════════════════════════════════════════
  // File Associations
  // ══════════════════════════════════════════════════
  User.hasMany(File, { foreignKey: 'uploadedById', as: 'uploadedFiles' });
  File.belongsTo(User, { foreignKey: 'uploadedById', as: 'uploadedBy' });

  Workspace.hasMany(File, { foreignKey: 'workspaceId', onDelete: 'CASCADE' });
  File.belongsTo(Workspace, { foreignKey: 'workspaceId' });

  Client.hasMany(File, { foreignKey: 'clientId', as: 'files', onDelete: 'SET NULL' });
  File.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });

  // ══════════════════════════════════════════════════
  // Report Associations
  // ══════════════════════════════════════════════════
  User.hasMany(Report, { foreignKey: 'generatedById', as: 'generatedReports' });
  Report.belongsTo(User, { foreignKey: 'generatedById', as: 'generatedBy' });

  Workspace.hasMany(Report, { foreignKey: 'workspaceId', onDelete: 'CASCADE' });
  Report.belongsTo(Workspace, { foreignKey: 'workspaceId' });

  Client.hasMany(Report, { foreignKey: 'clientId', as: 'reports', onDelete: 'SET NULL' });
  Report.belongsTo(Client, { foreignKey: 'clientId', as: 'reportClient' });
}

module.exports = initAssociations;
