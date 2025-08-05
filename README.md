# 🎵 Focus Music Tool - MCP Server

Need a playlist while you're working? Coding and tired? Problem solving and excited? This is a Model Context Protocol (MCP) server that creates real Spotify playlists based on your mood and focus needs. Built for seamless integration with AI assistants and MCP-compatible clients.

## 🎯 What This Does

This MCP server connects to Spotify's Web API to create actual playlists in your Spotify account based on mood parameters like "focused", "energetic", "calm", or "creative". Instead of just suggesting tracks, it creates real playlists you can immediately play.

## ✨ Key Features

- 🎧 **Real Spotify Integration** - Creates actual playlists in your Spotify account
- 🔐 **OAuth Authentication** - Secure Spotify login flow
- 🎨 **Mood-Based Generation** - Curated playlists for different focus states
- 🤖 **AI Assistant Ready** - Works with any MCP-compatible AI client
- ☁️ **Cloud Deployed** - Hosted on Cloudflare Workers for global accessic Tool - MCP Server
A Model Context Protocol (MCP) server that creates real Spotify playlists based on your mood and focus needs. Built for seamless integration with AI assistants and MCP-compatible clients.

🎯 What This Does
This MCP server connects to Spotify's Web API to create actual playlists in your Spotify account based on mood parameters like "focused", "energetic", "calm", or "creative". Instead of just suggesting tracks, it creates real playlists you can immediately play.

✨ Key Features
🎧 Real Spotify Integration - Creates actual playlists in your Spotify account
🔐 OAuth Authentication - Secure Spotify login flow
🎨 Mood-Based Generation - Curated playlists for different focus states
🤖 AI Assistant Ready - Works with any MCP-compatible AI client
☁️ Cloud Deployed - Hosted on Cloudflare Workers for global access
## 🚀 Live Demo

**MCP Server URL:** `https://6cdf29fb3b345ce5e8b4bb57.fp.dev/mcp`

You can connect to this URL from any MCP-compatible client and start creating playlists immediately!

## 📋 Prerequisites

### For Users:
- Spotify Account (Free or Premium)
- MCP-Compatible Client (like Fiberplane Codegen, Claude Desktop, etc.)

### For Developers:
- Spotify Developer Account (to get your own API credentials)
- Cloudflare Account (for deployment)
- Node.js/Bun (for local development)
## 🎮 How to Use (For End Users)

### Step 1: Connect to the MCP Server

In your MCP-compatible client (like Fiberplane Codegen):

1. Add MCP Server
2. URL: `https://6cdf29fb3b345ce5e8b4bb57.fp.dev/mcp`
3. Name: "Focus Music Tool"

### Step 2: Authenticate with Spotify

1. Ask your AI assistant: "Get me a Spotify authentication URL"
2. Click the provided URL
3. Log in to Spotify
4. Authorize the app
5. Copy your User ID from the success page

### Step 3: Create Playlists

Ask your AI assistant: "Create a focused study playlist with 20 tracks"

The AI will use your User ID to create a real Spotify playlist!

### Step 4: Enjoy Your Music

1. Get a direct Spotify URL
2. Click to open in Spotify app
3. Start listening immediately
## 🛠️ Available MCP Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `get_spotify_auth_url` | Get Spotify OAuth URL | `state` (optional) |
| `authenticate_spotify` | Complete authentication | `code` (from callback) |
| `generate_spotify_playlist` | Create real Spotify playlist | `userId`, `mood`, `playlistName`, `trackCount`, `isPublic` |
| `get_available_moods` | List available mood categories | None |
| `get_user_playlists` | View user's created playlists | `userId` |

## 🎨 Supported Moods

- **focused** - Deep concentration music for study sessions
- **energetic** - Upbeat tracks for motivation and workouts
- **calm** - Relaxing sounds to reduce anxiety and stress
- **creative** - Inspiring melodies for creative thinking
- **productive** - Lo-fi beats for productivity
- **motivated** - Motivational tracks for goal achievement
## 🏗️ Technical Stack

### Backend
- **Runtime:** Cloudflare Workers
- **Framework:** Hono.js
- **Database:** Cloudflare D1 (SQLite)
- **ORM:** Drizzle ORM
- **Protocol:** Model Context Protocol (MCP)

### APIs & Services
- **Spotify Web API** - Music data and playlist creation
- **OAuth 2.0** - Secure authentication flow
- **MCP Transport** - HTTP-based communication

### Database Schema
- **Users** - Spotify authentication tokens
- **Moods** - Mood categories and descriptions
- **Tracks** - Cached Spotify track metadata
- **Playlists** - Created playlist records
- **Mood-Track Associations** - Curated mood mappings
## 🔧 Development Setup

### 1. Clone Repository
```bash
git clone <your-repo-url>
cd focus-music-tool-mcp
```

### 2. Install Dependencies
```bash
bun install
```

### 3. Set Up Spotify App
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create new app
3. Set redirect URI: `http://localhost:8787/auth/spotify/callback`
4. Copy Client ID and Client Secret

### 4. Configure Environment
```bash
# .env
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
SPOTIFY_REDIRECT_URI=http://localhost:8787/auth/spotify/callback
```

### 5. Run Locally
```bash
bun run dev
```

### 6. Test MCP Connection
Connect your MCP client to: `http://localhost:8787/mcp`

## 🚀 Deployment

### Cloudflare Workers

1. **Install Wrangler CLI**
   ```bash
   npm install -g wrangler
   ```

2. **Configure Secrets**
   ```bash
   wrangler secret put SPOTIFY_CLIENT_ID
   wrangler secret put SPOTIFY_CLIENT_SECRET
   wrangler secret put SPOTIFY_REDIRECT_URI
   ```

3. **Deploy**
   ```bash
   wrangler deploy
   ```

### Alternative: Fiberplane Codegen
- Use the built-in deployment tools
- Set secrets in the dashboard
- Deploy with one click
## 🔌 MCP Client Integration

### Fiberplane Codegen
Add MCP Server → Enter URL → Connect

### Claude Desktop
```json
{
  "mcpServers": {
    "focus-music-tool": {
      "command": "node",
      "args": ["mcp-client.js"],
      "env": {
        "MCP_SERVER_URL": "https://your-deployment-url.com/mcp"
      }
    }
  }
}
```
## 🎵 Example Usage

### Creating a Study Playlist
- **User:** "I need a focused playlist for studying, about 45 minutes"
- **AI:** Creates "Deep Focus Study Session" with 15 tracks
- **Result:** Real Spotify playlist ready to play

### Workout Motivation
- **User:** "Create an energetic workout playlist"
- **AI:** Generates high-energy playlist with upbeat tracks
- **Result:** Motivational playlist for your workout

### Anxiety Relief
- **User:** "I'm feeling anxious, can you make a calming playlist?"
- **AI:** Creates soothing playlist with relaxing tracks
- **Result:** Peaceful music to help reduce stress
## 🔒 Security & Privacy

- **OAuth 2.0** - Industry-standard authentication
- **Token Encryption** - Secure storage of access tokens
- **Private Playlists** - Default to private (user can choose public)
- **No Music Storage** - Only metadata cached, no audio files
- **User Control** - Users own their Spotify data

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙋‍♂️ Support

- **Issues:** [Open a GitHub issue](https://github.com/your-repo/issues)
- **Questions:** [Start a discussion](https://github.com/your-repo/discussions)
- **MCP Documentation:** [Model Context Protocol](https://modelcontextprotocol.io)
- **Spotify API:** [Spotify Web API Documentation](https://developer.spotify.com/documentation/web-api)

## 🎉 Acknowledgments

- **Model Context Protocol** - For the amazing protocol specification
- **Spotify** - For the comprehensive Web API
- **Cloudflare** - For the excellent Workers platform
- **Fiberplane** - For the MCP development tools

---

**Made with ❤️ for developers and music lovers who want AI-generated playlists that actually work!**