# Private Team Workspace

A scalable, secure, full-stack private team communication platform built with the MERN stack (MongoDB, Express, React, Node.js), Socket.IO, and Material UI. Features include real-time messaging, channels, direct messages, and file sharing via Cloudinary.

## Tech Stack
- **Frontend:** React (Vite), Material UI (MUI), Socket.IO-Client, React Router DOM
- **Backend:** Node.js, Express.js, Socket.IO, Mongoose
- **Database:** MongoDB Atlas
- **Authentication:** JWT, bcryptjs
- **File Storage:** Cloudinary, Multer
- **Deployment:** Docker, Docker Compose, Nginx

## Prerequisites
- Node.js (v18+ recommended)
- MongoDB Atlas cluster URL
- Cloudinary account credentials

## Quick Start (Development)

### 1. Backend Setup
1. Open a terminal and navigate to the `backend` folder.
2. Run `npm install`.
3. Create a `.env` file (copy `.env.example`) and fill in your MongoDB URI, JWT Secret, and Cloudinary keys.
4. Run `npm run dev` (Ensure you added the script to `package.json` or just use `node server.js`). Server will start on port 5000.

### 2. Frontend Setup
1. Open a terminal and navigate to the `frontend` folder.
2. Run `npm install`.
3. The React app is preconfigured to use `http://localhost:5000` via Axios base URL in development.
4. Run `npm run dev`.

## Production Deployment (Docker)

1. Ensure Docker and Docker Compose are installed.
2. Fill out your `backend/.env` file.
3. In the root directory, run:
```bash
docker-compose up --build -d
```
4. The frontend will be served by Nginx on port `80`, and the backend API will run on port `5000`.

## Features
- JWT Auth (Login/Register)
- Create Workspaces & Channels
- Real-time messaging (Socket.IO)
- Private and Public channels
- Material UI aesthetic inspired by Slack/Teams
