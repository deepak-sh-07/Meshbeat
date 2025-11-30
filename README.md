# 🎵 MeshBeat

**Real-time collaborative music listening experience**

MeshBeat lets you create virtual rooms and listen to music in perfect sync with friends, no matter where they are. Experience synchronized playback with millisecond-precision timing.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://reactjs.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-Real--time-green?style=flat&logo=socket.io)](https://socket.io/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat&logo=prisma)](https://www.prisma.io/)

---

## ✨ Features

- 🎶 **Synchronized Playback** - Listen to music with friends in perfect sync
- 🏠 **Virtual Rooms** - Create or join rooms with simple 6-digit codes
- 🎮 **Host Controls** - Room hosts can play, pause, skip, and seek tracks
- 📤 **Easy Uploads** - Drag and drop audio files to build playlists
- ⚡ **Real-time Sync** - Automatic drift correction keeps everyone in sync
- 🔐 **Secure Authentication** - Email/password login with NextAuth
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile
- 🎨 **Smooth Transitions** - Beautiful blur transitions powered by View Transitions API

---

## 🖼️ Screenshots

### Dashboard
![Dashboard Screenshot](screenshots/dashboard.png)
*Create or join rooms from the main dashboard*

### Create Room
![Create Room Screenshot](screenshots/create-room.png)
*Generate a unique room code and invite friends*

### Virtual Room
![Virtual Room Screenshot](screenshots/virtual-room.png)
*Listen to music together with synchronized playback*

### Join Room
![Join Room Screenshot](screenshots/join-room.png)
*Enter a room code to join your friends*

---

## 🚀 Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **React 19** - UI library
- **NextAuth.js** - Authentication
- **Socket.io Client** - Real-time communication
- **Lottie React** - Animations
- **View Transitions API** - Smooth page transitions

### Backend
- **Node.js** - Server runtime
- **Socket.io** - WebSocket server
- **Prisma** - Database ORM
- **PostgreSQL** - Database
- **Supabase Storage** - Audio file storage

---

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** 18.x or higher
- **PostgreSQL** database
- **Supabase** account (for file storage)
- **npm** or **yarn** package manager

---

## ⚙️ Installation

### 1. Clone the repository

```bash
git clone https://github.com/deepak-sh-07/Meshbeat
cd meshbeat
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/meshbeat?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Backend Server
NEXT_PUBLIC_BACKEND_URL="http://localhost:3001"
PORT="3001"
```

### 4. Set up the database

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Seed the database
npx prisma db seed
```

### 5. Set up Supabase Storage

1. Go to your Supabase Dashboard
2. Navigate to **Storage**
3. Create a bucket named `Songs`
4. Make it **Public**
5. Add these policies:

**Allow public read:**
```sql
CREATE POLICY "Public can read songs"
ON storage.objects FOR SELECT
USING (bucket_id = 'Songs');
```

**Allow authenticated upload:**
```sql
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'Songs' 
  AND auth.role() = 'authenticated'
);
```

### 6. Start the development servers

**Terminal 1 - Next.js:**
```bash
npm run dev
```

**Terminal 2 - Socket.io Server:**
```bash
cd server
node server.js
```

Visit `http://localhost:3000` 🎉

---

## 🎮 Usage

### Creating a Room

1. **Sign up** or **Log in** to your account
2. Click **"Create a Room"** on the dashboard
3. Enter a room name
4. Click **"Generate"** to create a unique 6-digit code
5. **Upload audio files** (MP3, WAV, OGG supported)
6. Share the room code with friends!

### Joining a Room

1. **Log in** to your account
2. Click **"Join a Room"**
3. Enter the **6-digit room code**
4. Click **"Join Room"**
5. Start listening in sync! 🎵

### Host Controls

As the room host, you can:
- ▶️ Play / Pause tracks
- ⏭️ Skip to next track
- ⏮️ Go to previous track
- 🎚️ Seek to any position in the track
- 📤 Upload new songs to the playlist

### Participants

Participants can:
- 👀 See the current playing track
- 📋 View the playlist
- 🎧 Listen in perfect sync with the host

---

## 🏗️ Project Structure

```
meshbeat/
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # NextAuth endpoints
│   │   ├── rooms/        # Room CRUD operations
│   │   ├── tracks/       # Track management
│   │   ├── time/         # Server time sync
│   │   └── upload-url/   # Supabase upload URLs
│   ├── components/       # React components
│   │   ├── AnimatedPage.jsx
│   │   └── TransitionLink.jsx
│   ├── createroom/       # Create room page
│   ├── dashboard/        # Main dashboard
│   ├── join/             # Join room page
│   ├── login/            # Login page
│   ├── register/         # Registration page
│   ├── virtual/          # Virtual room page
│   ├── layout.js         # Root layout
│   ├── page.js           # Home page
│   └── view-transitions.css
├── lib/
│   └── prisma.js         # Prisma client
├── prisma/
│   └── schema.prisma     # Database schema
├── public/               # Static assets
│   ├── animations/       # Lottie animations
│   └── *.svg             # Icons
├── server/
│   └── server.js         # Socket.io server
└── package.json
```

---

## 🔧 Configuration

### Time Synchronization

MeshBeat uses advanced time synchronization to keep all users in perfect sync:

- **NTP-style sync** with median RTT calculation
- **Automatic drift correction** every 3 seconds
- **Smooth playback rate adjustments** instead of hard seeks
- **Sub-50ms accuracy** for synchronized playback

### Supported Audio Formats

- MP3 (`.mp3`)
- WAV (`.wav`)
- OGG (`.ogg`)
- Max file size: **50MB** per track

---

## 🐛 Troubleshooting

### Audio won't play
- Click the **"Start Listening"** button to unlock audio (browser requirement)
- Check if audio files are in supported formats
- Ensure Supabase bucket is public

### Out of sync playback
- Check your internet connection
- The app automatically corrects drift every 3 seconds
- Try refreshing the page

### Can't create/join rooms
- Verify PostgreSQL is running
- Check `.env.local` configuration
- Run `npx prisma migrate dev` to update database

### Supabase errors
- Ensure your Supabase project is active (not paused)
- Verify bucket policies are set correctly
- Check DNS resolution: `nslookup your-project.supabase.co`

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Your Name**
- GitHub: Deepak Sharma(https://github.com/deepak-sh-07)
- Email: deepakshar661@gmail.com

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - Amazing React framework
- [Socket.io](https://socket.io/) - Real-time communication
- [Prisma](https://www.prisma.io/) - Modern database toolkit
- [Supabase](https://supabase.com/) - Open source Firebase alternative
- [Lottie](https://lottiefiles.com/) - Beautiful animations

---

## 📊 Project Stats

![GitHub stars](https://img.shields.io/github/stars/yourusername/meshbeat?style=social)
![GitHub forks](https://img.shields.io/github/forks/yourusername/meshbeat?style=social)
![GitHub issues](https://img.shields.io/github/issues/yourusername/meshbeat)
![GitHub pull requests](https://img.shields.io/github/issues-pr/yourusername/meshbeat)

---

Made with ❤️ by Deepak Sharma