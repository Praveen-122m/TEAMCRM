# Software Requirements Specification (SRS)
## Project Name: TeamChat Collaboration Platform

---

## 1. Introduction

### 1.1 Purpose
This document provides a comprehensive Software Requirements Specification (SRS) for the **TeamChat Collaboration Platform**, a high-performance, real-time communication and management system tailored for workspaces, team members, and clients. 

### 1.2 Scope
TeamChat is designed to bridge the gap between internal project management and client communications. This system operates as a unified hub offering real-time messaging, file sharing, video conferencing, announcement broadcasting, client onboarding, and daily work reporting.

### 1.3 System Overview
The system is built on a relational architecture powered by **MySQL** and synchronized in real-time using **Socket.io**. It supports role-based views for **Administrators**, **Team Members**, and **Clients**, ensuring clean access boundaries.

---

## 2. User Roles & Access Control

The platform enforces three distinct user roles, each with custom privileges:

| Privilege / Action | Workspace Administrator (Admin) | Team Member (Member) | Client Account (Client) |
| :--- | :---: | :---: | :---: |
| **Workspace Creation** | Yes | Yes | No |
| **Workspace Join (Invite Code)** | Yes | Yes | No |
| **Onboard New Clients** | Yes | No | No |
| **Broadcast Announcements** | Yes | No | No |
| **Create Text Channels** | Yes | Yes | No |
| **Real-time Channel Chat** | Read / Write | Read / Write | Read / Write (Assigned Channels) |
| **Direct Messaging (DMs)** | Read / Write (All Users) | Read / Write (All Users) | Read / Write (Only Admins/Members) |
| **Submit Project Requests** | No | No | Yes |
| **Daily Work Log Submission** | Yes | Yes | No |
| **Conference Meeting Creation** | Yes | Yes | No |
| **Join Video Call** | Yes | Yes | Yes (Workspace specific) |
| **File Management** | Upload / Download | Upload / Download | Download Only |

---

## 3. Functional Requirements (Working Features)

### 3.1 User Authentication & Profile
- **Multi-Role Login Screen**: Supports credentials input for Admins, Members, and Clients. Clients log in using a Workspace Key, Secret ID, and password, while Admins/Members log in using Email and password.
- **Member Registration**: Enables new Team Members and Admins to sign up with a name, email, and password.
- **Forgot & Reset Password**: Fully integrated email recovery simulation flow allowing password resets.
- **Profile Customization**: Users can update their display name and profile details.
- **Cloud Profile Image Upload**: Seamless local file selection and upload directly to Cloudinary, automatically syncing the user profile avatar across the application.

### 3.2 Workspace Hub
- **Workspace Creation**: Admins and Members can create a workspace (specifying name and description), which automatically generates a unique 6-character alphanumeric invite code (e.g. `T7L1FO`).
- **Join Workspace**: Members can join existing workspaces using valid invite codes.
- **Workspace Switcher**: Interactive dropdown and sidebar navigation to switch between assigned workspaces, instantly refreshing all relevant channels, members, and dashboard data.

### 3.3 Channel Collaboration (Real-time)
- **Channel Creation**: Admins and Members can add channels (e.g. `#general`, `#marketing`) to a workspace.
- **Real-time Chat Feed**: Driven by Socket.io to distribute chat messages immediately without reloading.
- **Typing Indicators**: Displays a real-time notification (`"Someone is typing..."`) above the message box when another channel member is typing.
- **Member Mentions**: Typing `@` triggers a filtered dropdown of workspace members. Selecting a user inserts a tag in the text area and highlights their name in yellow inside the channel stream.
- **File & Image Attachments**: Users can upload files or images inside channels. Images display preview thumbnails, and all files feature secure download options.

### 3.5 Direct Messaging (DMs)
- **Private Conversations**: Select individual workspace members to initiate secure, peer-to-peer messaging.
- **Presence Tracking**: Lists members categorized by role (Admins, Members, Clients) along with real-time online/offline status indicators.
- **Unread Message Badges**: Displays notification counts next to active chats when new messages are received while the conversation is inactive.

### 3.6 Project Tracking & Client Portal
- **Client Project Dashboard**: Displays workspace metrics, including:
  - Total Projects
  - Completed Tasks
  - Pending Tasks
  - Overall Progress Percentage
- **New Project Requests**: Clients can submit structured project request briefs directly to workspace Admins.
- **Broadcast Status Alerts**: Workspace-wide updates broadcasted to clients to monitor progress in real-time.

### 3.7 Meeting & Video Rooms (Conferencing)
- **Instant Meeting Creation**: Privileged users can create instant voice/video conference sessions.
- **Schedule Meetings**: Schedule video meetings for a future date/time.
- **Join by ID**: Users can join any active session by entering its 10-digit meeting ID.
- **Embedded WebRTC Video Call**: Fully functional, high-definition video conferencing interface powered by the Jitsi Meet External API (`meet.jit.si`). Includes audio/video toggles, screen sharing capabilities, and chat within Jitsi.

### 3.8 Workspace Announcements & Approvals
- **Broadcast Announcements**: Admins can post official notifications to the entire workspace.
- **Client Requests Review**: Requests or updates sent by Clients default to "Admin Only" visibility. Admins can approve, reject, or broadcast these posts to the team directory.
- **Discussion Threads**: Nested comments allow team members to reply to, discuss, and track announcements.

### 3.9 Work Logging & Attendance
- **Daily Work Log Submission**: Team Members can log daily tasks, status (Completed vs. In Progress), and hours worked.
- **Report Generation**: Consolidates logs to report active hours and pending/completed work scopes to the database.

### 3.10 File Management Hub
- **Central Repository**: Lists all media and documents shared across workspace chat feeds.
- **Detailed Log**: Displays filenames, senders' profile avatars, creation timestamps, and download action links.

---

## 4. Non-Functional Requirements & Design Aesthetics
- **Premium Aesthetics**: Rich, modern styling using curated color palettes (harmonious blues, greys, and vibrant status colors) instead of basic browser defaults.
- **Responsive Layout**: Fluid navigation drawer and grids optimized for both mobile and desktop screens.
- **Micro-Animations**: Hover actions, transitions, and pulsing indicator rings on outgoing requests to offer a tactile user experience.
- **Data Integrity**: Enforced foreign key constraints in MySQL to protect workspace and message relationships.

---

## 5. Technical Stack

### 5.1 Frontend (Client-side)
- **Framework**: React (Vite)
- **UI Library**: Material UI (MUI v9)
- **State & Context Management**: React Context (`AuthContext`, `SocketContext`)
- **HTTP Client**: Axios (configured with local routing proxies)
- **Video SDK**: Jitsi Meet External API
- **Real-time Engine**: Socket.io Client

### 5.2 Backend (Server-side)
- **Runtime**: Node.js & Express
- **Database Engine**: MySQL
- **ORM / Database Adapter**: Sequelize
- **Image Cloud Storage**: Cloudinary SDK
- **Real-time Server**: Socket.io Server

---

## 6. Database Schema Design (Sequelize Models)

The following tables define the relational database layout in MySQL:

1. **User**: Stores profile, credentials, and user role metadata (`Admin`, `Member`, `Client`).
2. **Workspace**: Manages workspace profiles, ownership records, and invite codes.
3. **Channel**: Represents public workspace discussion channels.
4. **Message**: Stores channel posts and direct messages (handles file attachments via URL properties).
5. **Client**: Matches client credentials (Secret ID / Secret Code) with their profile entries.
6. **Announcement**: Stores general broadcast notices, priority flags, and approval statuses.
7. **AnnouncementReply**: Handles threaded replies on announcements.
8. **Attendance**: Clock-in/out records and task summary report sheets.
9. **Meeting**: Tracks scheduled meetings and active conference IDs.
10. **Project**: Defines project milestones and workspace-level stats.
11. **ProjectRequest**: Submissions generated by clients for admin review.
