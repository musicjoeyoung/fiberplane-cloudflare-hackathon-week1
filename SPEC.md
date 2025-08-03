# Focus Music Tool MCP Server Specification

This document outlines the design and implementation plan for a Focus Music Tool MCP server that generates curated playlists based on mood parameters.

The MCP server will accept mood inputs and return carefully curated playlists designed to enhance focus and productivity. The system uses realistic but fake data to simulate music recommendations, with an architecture that can easily integrate with real music APIs like Spotify in the future.

The system will be built using Cloudflare Workers with Hono as the API framework, the MCP SDK for server functionality, and Cloudflare D1 for storing playlist and track data.

## 1. Technology Stack

- **Edge Runtime:** Cloudflare Workers
- **API Framework:** Hono.js (TypeScript-based API framework)
- **MCP Framework:** @modelcontextprotocol/sdk and @hono/mcp
- **Database:** Cloudflare D1 (serverless SQLite)
- **ORM:** Drizzle ORM for type-safe database operations

## 2. Database Schema Design

The database will store curated playlists organized by mood categories, with individual tracks that can be associated with multiple moods for flexible playlist generation.

### 2.1. Moods Table

- id (INTEGER, Primary Key, Auto Increment)
- name (TEXT, Unique) - e.g., "focused", "energetic", "calm", "creative"
- description (TEXT) - Brief description of the mood
- created_at (TEXT, ISO timestamp)

### 2.2. Tracks Table

- id (INTEGER, Primary Key, Auto Increment)
- title (TEXT, Not Null)
- artist (TEXT, Not Null)
- album (TEXT)
- duration_seconds (INTEGER)
- spotify_id (TEXT, Nullable) - For future Spotify integration
- energy_level (INTEGER) - 1-10 scale for mood matching
- focus_rating (INTEGER) - 1-10 scale for focus enhancement
- created_at (TEXT, ISO timestamp)

### 2.3. Mood_Tracks Table (Junction Table)

- id (INTEGER, Primary Key, Auto Increment)
- mood_id (INTEGER, Foreign Key to moods.id)
- track_id (INTEGER, Foreign Key to tracks.id)
- weight (INTEGER) - Priority/relevance score for this mood-track pairing

### 2.4. Playlists Table

- id (INTEGER, Primary Key, Auto Increment)
- name (TEXT, Not Null)
- mood_id (INTEGER, Foreign Key to moods.id)
- description (TEXT)
- track_count (INTEGER)
- total_duration_seconds (INTEGER)
- created_at (TEXT, ISO timestamp)

## 3. MCP Server Implementation

The MCP server will expose tools for playlist generation and mood-based music discovery.

### 3.1. MCP Tools

- **generate_focus_playlist**
  - Description: Generate a curated playlist based on mood and optional parameters
  - Parameters:
    ```json
    {
      "mood": "string (required) - The mood/genre for the playlist",
      "duration_minutes": "number (optional) - Target playlist duration",
      "track_count": "number (optional) - Number of tracks to include"
    }
    ```

- **get_available_moods**
  - Description: List all available mood categories
  - Parameters: None

- **get_mood_details**
  - Description: Get detailed information about a specific mood
  - Parameters:
    ```json
    {
      "mood": "string (required) - The mood name to get details for"
    }
    ```

### 3.2. MCP Resources

- **playlist/{playlist_id}**
  - Description: Access to generated playlist details
  - MIME Type: application/json

## 4. API Endpoints

### 4.1. MCP Communication

- **POST /mcp**
  - Description: Handle all MCP JSON-RPC requests
  - Uses StreamableHTTPTransport for direct Hono context handling

### 4.2. Health Check

- **GET /health**
  - Description: Basic health check endpoint
  - Returns server status and available moods count

## 5. Data Seeding Strategy

The system will include a comprehensive seed dataset with realistic music data across different mood categories:

- **Focus Moods:** ambient, instrumental, lo-fi, classical
- **Energy Moods:** upbeat, electronic, rock, pop
- **Calm Moods:** acoustic, nature sounds, meditation, soft jazz
- **Creative Moods:** experimental, world music, indie, atmospheric

Each mood category will have 20-50 curated tracks with realistic metadata including artist names, album titles, and duration information.

## 6. Future Integration Architecture

The system is designed for easy integration with real music APIs:

- Track records include `spotify_id` field for Spotify API integration
- Playlist generation logic is abstracted to easily swap data sources
- Energy and focus ratings can be enhanced with real audio analysis data
- Authentication system can be added for user-specific playlists

## 7. Additional Notes

The MCP server will be stateless, generating fresh playlists on each request while maintaining consistent quality through the curated database. The mood parameter acts as the primary filter, with additional parameters allowing for playlist customization.

The fake data should be realistic enough to demonstrate the system's capabilities while clearly being sample data (avoid using real copyrighted song titles).

## 8. Further Reading

Take inspiration from the project template here: https://github.com/fiberplane/create-honc-app/tree/main/templates/d1