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
const Invite = require('./Invite');
const ActivityLog = require('./ActivityLog');
const Task = require('./Task');
const TaskActivityLog = require('./TaskActivityLog');


// SaaS Models
const SaaSClient = require('./SaaSClient');
const SaaSMetaAccount = require('./SaaSMetaAccount');
const SaaSMetaAdsInsight = require('./SaaSMetaAdsInsight');
const SaaSMetaRawInsight = require('./SaaSMetaRawInsight');
const SaaSMetaAccountMetric = require('./SaaSMetaAccountMetric');

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
  User.hasMany(Message, { foreignKey: 'senderId', constraints: false });
  Message.belongsTo(User, { as: 'sender', foreignKey: 'senderId', constraints: false });

  User.hasMany(Message, { foreignKey: 'receiverId', constraints: false });
  Message.belongsTo(User, { as: 'receiver', foreignKey: 'receiverId', constraints: false });

  Channel.hasMany(Message, { foreignKey: 'channelId', onDelete: 'CASCADE' });
  Message.belongsTo(Channel, { as: 'channel', foreignKey: 'channelId' });

  Workspace.hasMany(Message, { foreignKey: 'workspaceId', onDelete: 'CASCADE' });
  Message.belongsTo(Workspace, { as: 'workspace', foreignKey: 'workspaceId' });

  // Message <-> User (Many-to-Many for readBy list)
  Message.belongsToMany(User, { as: 'readBy', through: 'MessageReadBy', foreignKey: 'messageId', otherKey: 'userId', constraints: false });
  User.belongsToMany(Message, { as: 'readMessages', through: 'MessageReadBy', foreignKey: 'userId', otherKey: 'messageId', constraints: false });

  // Message <-> MessageReaction (One-to-Many)
  Message.hasMany(MessageReaction, { as: 'reactions', foreignKey: 'messageId', onDelete: 'CASCADE' });
  MessageReaction.belongsTo(Message, { foreignKey: 'messageId' });
  
  User.hasMany(MessageReaction, { foreignKey: 'userId', constraints: false });
  MessageReaction.belongsTo(User, { foreignKey: 'userId', constraints: false });

  // Message replies (Self-referential)
  Message.hasMany(Message, { as: 'replies', foreignKey: 'replyToMessageId', onDelete: 'SET NULL', constraints: false });
  Message.belongsTo(Message, { as: 'repliedTo', foreignKey: 'replyToMessageId', constraints: false });

  // Message <-> Pinned User
  User.hasMany(Message, { foreignKey: 'pinnedBy', constraints: false });
  Message.belongsTo(User, { as: 'pinner', foreignKey: 'pinnedBy', constraints: false });

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
  User.hasMany(Notification, { as: 'notifications', foreignKey: 'recipientId', onDelete: 'CASCADE', constraints: false });
  Notification.belongsTo(User, { as: 'recipient', foreignKey: 'recipientId', constraints: false });

  User.hasMany(Notification, { as: 'sentNotifications', foreignKey: 'senderId', constraints: false });
  Notification.belongsTo(User, { as: 'sender', foreignKey: 'senderId', constraints: false });

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

  Workspace.hasMany(MetaAdsLead, { foreignKey: 'workspaceId', as: 'metaLeadsWorkspace', onDelete: 'CASCADE' });
  MetaAdsLead.belongsTo(Workspace, { as: 'workspace', foreignKey: 'workspaceId' });

  Workspace.hasOne(MetaAdsConnection, { foreignKey: 'workspaceId', onDelete: 'CASCADE' });
  MetaAdsConnection.belongsTo(Workspace, { foreignKey: 'workspaceId' });

  MetaAdsCampaign.hasMany(MetaAdsLead, { foreignKey: 'campaignId', onDelete: 'SET NULL' });
  MetaAdsLead.belongsTo(MetaAdsCampaign, { as: 'campaign', foreignKey: 'campaignId' });

  // Client <-> MetaAdsLead (constraints: false to avoid conflict with SaaSClient on same FK)
  Client.hasMany(MetaAdsLead, { foreignKey: 'clientId', as: 'leads', constraints: false });
  MetaAdsLead.belongsTo(Client, { as: 'client', foreignKey: 'clientId', constraints: false });

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

  // ══════════════════════════════════════════════════
  // SaaS Multi-Client Meta Ads Associations
  // ══════════════════════════════════════════════════
  SaaSClient.hasOne(SaaSMetaAccount, { foreignKey: 'client_id', as: 'metaAccount', onDelete: 'CASCADE' });
  SaaSMetaAccount.belongsTo(SaaSClient, { foreignKey: 'client_id', as: 'client' });

  SaaSClient.hasMany(SaaSMetaAdsInsight, { foreignKey: 'client_id', as: 'insights', onDelete: 'CASCADE' });
  SaaSMetaAdsInsight.belongsTo(SaaSClient, { foreignKey: 'client_id', as: 'client' });

  SaaSClient.hasMany(SaaSMetaRawInsight, { foreignKey: 'client_id', as: 'rawInsights', onDelete: 'CASCADE' });
  SaaSMetaRawInsight.belongsTo(SaaSClient, { foreignKey: 'client_id', as: 'client' });

  SaaSClient.hasMany(SaaSMetaAccountMetric, { foreignKey: 'client_id', as: 'accountMetrics', onDelete: 'CASCADE' });
  SaaSMetaAccountMetric.belongsTo(SaaSClient, { foreignKey: 'client_id', as: 'client' });

  // SaaSClient <-> MetaAdsLead (constraints: false to avoid conflict with Client on same FK)
  SaaSClient.hasMany(MetaAdsLead, { foreignKey: 'clientId', as: 'metaLeads', constraints: false });
  MetaAdsLead.belongsTo(SaaSClient, { as: 'saasClient', foreignKey: 'clientId', constraints: false });

  // SaaSClient <-> ClientAssignment (constraints: false)
  SaaSClient.hasMany(ClientAssignment, { foreignKey: 'clientId', as: 'clientAssignments', constraints: false, onDelete: 'CASCADE' });
  ClientAssignment.belongsTo(SaaSClient, { foreignKey: 'clientId', as: 'saasClient', constraints: false });

  // Workspace <-> SaaSClient
  Workspace.hasOne(SaaSClient, { foreignKey: 'workspace_id', as: 'saasClient', onDelete: 'SET NULL' });
  SaaSClient.belongsTo(Workspace, { foreignKey: 'workspace_id' });

  // Workspace <-> Invite
  Workspace.hasMany(Invite, { foreignKey: 'workspaceId', onDelete: 'CASCADE' });
  Invite.belongsTo(Workspace, { foreignKey: 'workspaceId' });

  // User <-> Invite
  User.hasMany(Invite, { foreignKey: 'usedById', as: 'usedInvites' });
  Invite.belongsTo(User, { foreignKey: 'usedById', as: 'usedBy' });

  // Activity Log Associations
  User.hasMany(ActivityLog, { foreignKey: 'userId', as: 'activityLogs', constraints: false });
  ActivityLog.belongsTo(User, { foreignKey: 'userId', as: 'user', constraints: false });

  Workspace.hasMany(ActivityLog, { foreignKey: 'workspaceId', as: 'activityLogs', onDelete: 'CASCADE' });
  ActivityLog.belongsTo(Workspace, { foreignKey: 'workspaceId', as: 'workspace' });

  // ══════════════════════════════════════════════════
  // Task Associations
  // ══════════════════════════════════════════════════
  Task.belongsTo(Workspace, { foreignKey: 'workspaceId', as: 'workspace', onDelete: 'CASCADE' });
  Workspace.hasMany(Task, { foreignKey: 'workspaceId', as: 'tasks', onDelete: 'CASCADE' });

  Task.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignee', onDelete: 'SET NULL' });
  User.hasMany(Task, { foreignKey: 'assignedTo', as: 'tasks' });

  Task.belongsTo(User, { foreignKey: 'assignedById', as: 'creator', onDelete: 'CASCADE' });
  User.hasMany(Task, { foreignKey: 'assignedById', as: 'createdTasks' });

  // Task <-> TaskActivityLog
  Task.hasMany(TaskActivityLog, { foreignKey: 'taskId', as: 'activityLogs', onDelete: 'CASCADE' });
  TaskActivityLog.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });

  TaskActivityLog.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' });
  User.hasMany(TaskActivityLog, { foreignKey: 'userId', as: 'taskActivityLogs' });
}

module.exports = initAssociations;
