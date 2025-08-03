import * as schema from "./db/schema";

import { createFiberplane, createOpenAPISpec } from "@fiberplane/hono";

import { Hono } from "hono";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPTransport } from "@hono/mcp";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { z } from "zod";

type Bindings = {
  DB: D1Database;
  SPOTIFY_CLIENT_ID: string;
  SPOTIFY_CLIENT_SECRET: string;
  SPOTIFY_REDIRECT_URI: string;
};

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

interface SpotifyUser {
  id: string;
  display_name: string;
  email: string;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: { name: string };
  duration_ms: number;
  audio_features?: {
    danceability: number;
    energy: number;
    valence: number;
    tempo: number;
    acousticness: number;
    instrumentalness: number;
  };
}

interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  tracks: { total: number };
  public: boolean;
}

interface SpotifySearchResponse {
  tracks: {
    items: SpotifyTrack[];
  };
}

class SpotifyAPI {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor(clientId: string, clientSecret: string, redirectUri: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
  }

  getAuthUrl(state?: string): string {
    const scopes = [
      'user-read-private',
      'user-read-email',
      'playlist-modify-public',
      'playlist-modify-private'
    ].join(' ');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      scope: scopes,
      redirect_uri: this.redirectUri,
      ...(state && { state })
    });

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<SpotifyTokenResponse> {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri
      })
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    return await response.json() as SpotifyTokenResponse;
  }

  async refreshToken(refreshToken: string): Promise<SpotifyTokenResponse> {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`);
    }

    return await response.json() as SpotifyTokenResponse;
  }

  async getUserProfile(accessToken: string): Promise<SpotifyUser> {
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get user profile: ${response.statusText}`);
    }

    return await response.json() as SpotifyUser;
  }

  async searchTracks(accessToken: string, query: string, limit: number = 20): Promise<SpotifyTrack[]> {
    const params = new URLSearchParams({
      q: query,
      type: 'track',
      limit: limit.toString()
    });

    const response = await fetch(`https://api.spotify.com/v1/search?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    const data = await response.json() as SpotifySearchResponse;
    return data.tracks.items;
  }

  async createPlaylist(accessToken: string, userId: string, name: string, description: string, isPublic: boolean = false): Promise<SpotifyPlaylist> {
    const response = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        description,
        public: isPublic
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to create playlist: ${response.statusText}`);
    }

    return await response.json() as SpotifyPlaylist;
  }

  async addTracksToPlaylist(accessToken: string, playlistId: string, trackUris: string[]): Promise<void> {
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uris: trackUris
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to add tracks to playlist: ${response.statusText}`);
    }
  }

  async getAudioFeatures(accessToken: string, trackIds: string[]): Promise<any[]> {
    const response = await fetch(`https://api.spotify.com/v1/audio-features?ids=${trackIds.join(',')}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get audio features: ${response.statusText}`);
    }

    const data = await response.json() as { audio_features: any[] };
    return data.audio_features;
  }
}

const app = new Hono<{ Bindings: Bindings }>();

function createMcpServer(env: Bindings) {
  const server = new McpServer({
    name: "focus-music-tool",
    version: "1.0.0",
    description: "MCP server for generating focus playlists with Spotify integration"
  });

  const db = drizzle(env.DB);
  const spotify = new SpotifyAPI(env.SPOTIFY_CLIENT_ID, env.SPOTIFY_CLIENT_SECRET, env.SPOTIFY_REDIRECT_URI);

  server.tool(
    "get_spotify_auth_url",
    {
      state: z.string().optional().describe("Optional state parameter for OAuth flow")
    },
    async ({ state }) => {
      const authUrl = spotify.getAuthUrl(state);

      return {
        content: [
          {
            type: "text",
            text: `Please visit this URL to authenticate with Spotify: ${authUrl}`
          }
        ]
      };
    }
  );

  server.tool(
    "authenticate_spotify",
    {
      code: z.string().describe("Authorization code from Spotify OAuth callback")
    },
    async ({ code }) => {
      try {
        const tokenResponse = await spotify.exchangeCodeForToken(code);
        const userProfile = await spotify.getUserProfile(tokenResponse.access_token);

        const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

        await db.insert(schema.users).values({
          spotifyId: userProfile.id,
          email: userProfile.email,
          displayName: userProfile.display_name,
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token,
          tokenExpiresAt: expiresAt
        }).onConflictDoUpdate({
          target: schema.users.spotifyId,
          set: {
            email: userProfile.email,
            displayName: userProfile.display_name,
            accessToken: tokenResponse.access_token,
            refreshToken: tokenResponse.refresh_token,
            tokenExpiresAt: expiresAt,
            updatedAt: new Date().toISOString()
          }
        }).returning();

        return {
          content: [
            {
              type: "text",
              text: `Successfully authenticated! User: ${userProfile.display_name} (${userProfile.email})`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Authentication failed: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ],
          isError: true
        };
      }
    }
  );

  server.tool(
    "generate_spotify_playlist",
    {
      userId: z.string().describe("User ID from the database"),
      mood: z.string().describe("Mood for the playlist (e.g., 'focused', 'energetic', 'calm')"),
      playlistName: z.string().describe("Name for the new Spotify playlist"),
      trackCount: z.number().min(1).max(50).default(20).describe("Number of tracks to include"),
      isPublic: z.boolean().default(false).describe("Whether the playlist should be public")
    },
    async ({ userId, mood, playlistName, trackCount, isPublic }) => {
      try {
        const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId));

        if (!user || !user.accessToken) {
          return {
            content: [
              {
                type: "text",
                text: "User not found or not authenticated with Spotify"
              }
            ],
            isError: true
          };
        }

        let accessToken = user.accessToken;

        if (user.tokenExpiresAt && new Date() > user.tokenExpiresAt) {
          if (!user.refreshToken) {
            return {
              content: [
                {
                  type: "text",
                  text: "Access token expired and no refresh token available. Please re-authenticate."
                }
              ],
              isError: true
            };
          }

          const refreshResponse = await spotify.refreshToken(user.refreshToken);
          accessToken = refreshResponse.access_token;

          await db.update(schema.users)
            .set({
              accessToken: refreshResponse.access_token,
              tokenExpiresAt: new Date(Date.now() + refreshResponse.expires_in * 1000),
              updatedAt: new Date().toISOString()
            })
            .where(eq(schema.users.id, userId));
        }

        const searchQueries = {
          focused: "instrumental focus ambient study",
          energetic: "upbeat electronic dance workout",
          calm: "acoustic chill relaxing peaceful",
          creative: "indie experimental atmospheric ambient",
          productive: "lo-fi beats study concentration",
          motivated: "motivational uplifting energetic"
        };

        const query = searchQueries[mood as keyof typeof searchQueries] || `${mood} music`;
        const tracks = await spotify.searchTracks(accessToken, query, trackCount);

        if (tracks.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `No tracks found for mood: ${mood}`
              }
            ],
            isError: true
          };
        }

        const playlist = await spotify.createPlaylist(
          accessToken,
          user.spotifyId!,
          playlistName,
          `A ${mood} playlist generated by Focus Music Tool`,
          isPublic
        );

        const trackUris = tracks.map(track => `spotify:track:${track.id}`);
        await spotify.addTracksToPlaylist(accessToken, playlist.id, trackUris);

        const [moodRecord] = await db.select().from(schema.moods).where(eq(schema.moods.name, mood));
        let moodId = moodRecord?.id;

        if (!moodRecord) {
          const [newMood] = await db.insert(schema.moods).values({
            name: mood,
            description: `${mood} music for enhanced focus and productivity`
          }).returning();
          moodId = newMood.id;
        }

        await db.insert(schema.spotifyPlaylists).values({
          userId: user.id,
          spotifyPlaylistId: playlist.id,
          name: playlistName,
          description: `A ${mood} playlist generated by Focus Music Tool`,
          moodId: moodId,
          trackCount: tracks.length,
          isPublic: isPublic
        }).returning();

        for (const track of tracks) {
          const [existingTrack] = await db.select().from(schema.tracks).where(eq(schema.tracks.spotifyId, track.id));

          if (!existingTrack) {
            await db.insert(schema.tracks).values({
              title: track.name,
              artist: track.artists.map(a => a.name).join(', '),
              album: track.album.name,
              durationSeconds: Math.floor(track.duration_ms / 1000),
              spotifyId: track.id,
              energyLevel: Math.floor(Math.random() * 10) + 1,
              focusRating: Math.floor(Math.random() * 10) + 1
            });
          }
        }

        return {
          content: [
            {
              type: "text",
              text: `Successfully created Spotify playlist "${playlistName}" with ${tracks.length} tracks!\nPlaylist URL: https://open.spotify.com/playlist/${playlist.id}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to create playlist: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ],
          isError: true
        };
      }
    }
  );

  server.tool(
    "get_available_moods",
    {},
    async () => {
      try {
        const moods = await db.select().from(schema.moods);

        const moodList = moods.length > 0
          ? moods.map(mood => `- ${mood.name}: ${mood.description || 'No description'}`).join('\n')
          : "No moods available. Try creating a playlist first!";

        return {
          content: [
            {
              type: "text",
              text: `Available moods:\n${moodList}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching moods: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ],
          isError: true
        };
      }
    }
  );

  server.tool(
    "get_user_playlists",
    {
      userId: z.string().describe("User ID from the database")
    },
    async ({ userId }) => {
      try {
        const playlists = await db.select({
          id: schema.spotifyPlaylists.id,
          name: schema.spotifyPlaylists.name,
          description: schema.spotifyPlaylists.description,
          trackCount: schema.spotifyPlaylists.trackCount,
          isPublic: schema.spotifyPlaylists.isPublic,
          createdAt: schema.spotifyPlaylists.createdAt,
          spotifyPlaylistId: schema.spotifyPlaylists.spotifyPlaylistId,
          moodName: schema.moods.name
        })
          .from(schema.spotifyPlaylists)
          .leftJoin(schema.moods, eq(schema.spotifyPlaylists.moodId, schema.moods.id))
          .where(eq(schema.spotifyPlaylists.userId, userId));

        if (playlists.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No playlists found for this user."
              }
            ]
          };
        }

        const playlistList = playlists.map(playlist =>
          `- ${playlist.name} (${playlist.trackCount} tracks, ${playlist.moodName || 'No mood'}) - https://open.spotify.com/playlist/${playlist.spotifyPlaylistId}`
        ).join('\n');

        return {
          content: [
            {
              type: "text",
              text: `Your Spotify playlists:\n${playlistList}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching playlists: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ],
          isError: true
        };
      }
    }
  );

  return server;
}

app.get("/", (c) => {
  return c.text("Focus Music Tool MCP Server");
});

app.get("/health", async (c) => {
  const db = drizzle(c.env.DB);

  try {
    const moodsCount = await db.select().from(schema.moods);
    const tracksCount = await db.select().from(schema.tracks);

    return c.json({
      status: "healthy",
      moods_available: moodsCount.length,
      tracks_available: tracksCount.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return c.json({
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

app.get("/auth/spotify", (c) => {
  const spotify = new SpotifyAPI(c.env.SPOTIFY_CLIENT_ID, c.env.SPOTIFY_CLIENT_SECRET, c.env.SPOTIFY_REDIRECT_URI);
  const authUrl = spotify.getAuthUrl();
  return c.redirect(authUrl);
});

app.get("/auth/spotify/callback", async (c) => {
  const code = c.req.query("code");
  const error = c.req.query("error");

  if (error) {
    return c.text(`Authentication error: ${error}`, 400);
  }

  if (!code) {
    return c.text("Missing authorization code", 400);
  }

  try {
    const spotify = new SpotifyAPI(c.env.SPOTIFY_CLIENT_ID, c.env.SPOTIFY_CLIENT_SECRET, c.env.SPOTIFY_REDIRECT_URI);
    const tokenResponse = await spotify.exchangeCodeForToken(code);
    const userProfile = await spotify.getUserProfile(tokenResponse.access_token);

    const db = drizzle(c.env.DB);
    const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

    const [user] = await db.insert(schema.users).values({
      spotifyId: userProfile.id,
      email: userProfile.email,
      displayName: userProfile.display_name,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      tokenExpiresAt: expiresAt
    }).onConflictDoUpdate({
      target: schema.users.spotifyId,
      set: {
        email: userProfile.email,
        displayName: userProfile.display_name,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        tokenExpiresAt: expiresAt,
        updatedAt: new Date().toISOString()
      }
    }).returning();

    return c.text(`Successfully authenticated! Welcome ${userProfile.display_name}. Your user ID is: ${user.id}`);
  } catch (error) {
    return c.text(`Authentication failed: ${error instanceof Error ? error.message : "Unknown error"}`, 500);
  }
});

app.all("/mcp", async (c) => {
  const mcpServer = createMcpServer(c.env);
  const transport = new StreamableHTTPTransport();

  await mcpServer.connect(transport);
  return transport.handleRequest(c);
});

app.get("/openapi.json", c => {
  return c.json(createOpenAPISpec(app, {
    info: {
      title: "Focus Music Tool MCP Server",
      version: "1.0.0",
      description: "MCP server for generating focus playlists with Spotify integration"
    },
  }));
});

app.use("/fp/*", createFiberplane({
  openapi: { url: "/openapi.json" }
}));

export default app;