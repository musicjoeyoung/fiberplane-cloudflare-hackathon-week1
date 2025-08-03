import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  spotifyId: text("spotify_id").unique(),
  email: text("email"),
  displayName: text("display_name"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: integer("token_expires_at", { mode: "timestamp" }),
  createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
}, t => [
  index("users_spotify_id_idx").on(t.spotifyId),
]);

export const moods = sqliteTable("moods", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
}, t => [
  index("moods_name_idx").on(t.name),
]);

export const tracks = sqliteTable("tracks", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  album: text("album"),
  durationSeconds: integer("duration_seconds"),
  spotifyId: text("spotify_id").unique(),
  energyLevel: integer("energy_level"),
  focusRating: integer("focus_rating"),
  audioFeatures: text("audio_features", { mode: "json" }).$type<{
    danceability?: number;
    energy?: number;
    valence?: number;
    tempo?: number;
    acousticness?: number;
    instrumentalness?: number;
  }>(),
  createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
}, t => [
  index("tracks_spotify_id_idx").on(t.spotifyId),
  index("tracks_artist_idx").on(t.artist),
]);

export const moodTracks = sqliteTable("mood_tracks", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  moodId: integer("mood_id").notNull().references(() => moods.id),
  trackId: integer("track_id").notNull().references(() => tracks.id),
  weight: integer("weight"),
}, t => [
  index("mood_tracks_mood_id_idx").on(t.moodId),
  index("mood_tracks_track_id_idx").on(t.trackId),
]);

export const playlists = sqliteTable("playlists", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  moodId: integer("mood_id").references(() => moods.id),
  description: text("description"),
  trackCount: integer("track_count"),
  totalDurationSeconds: integer("total_duration_seconds"),
  createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
}, t => [
  index("playlists_mood_id_idx").on(t.moodId),
]);

export const spotifyPlaylists = sqliteTable("spotify_playlists", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id),
  spotifyPlaylistId: text("spotify_playlist_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  moodId: integer("mood_id").references(() => moods.id),
  trackCount: integer("track_count"),
  isPublic: integer("is_public", { mode: "boolean" }).default(false),
  createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
}, t => [
  index("spotify_playlists_user_id_idx").on(t.userId),
  index("spotify_playlists_spotify_id_idx").on(t.spotifyPlaylistId),
]);

export const usersRelations = relations(users, ({ many }) => ({
  spotifyPlaylists: many(spotifyPlaylists),
}));

export const moodsRelations = relations(moods, ({ many }) => ({
  moodTracks: many(moodTracks),
  playlists: many(playlists),
  spotifyPlaylists: many(spotifyPlaylists),
}));

export const tracksRelations = relations(tracks, ({ many }) => ({
  moodTracks: many(moodTracks),
}));

export const moodTracksRelations = relations(moodTracks, ({ one }) => ({
  mood: one(moods, {
    fields: [moodTracks.moodId],
    references: [moods.id],
  }),
  track: one(tracks, {
    fields: [moodTracks.trackId],
    references: [tracks.id],
  }),
}));

export const playlistsRelations = relations(playlists, ({ one }) => ({
  mood: one(moods, {
    fields: [playlists.moodId],
    references: [moods.id],
  }),
}));

export const spotifyPlaylistsRelations = relations(spotifyPlaylists, ({ one }) => ({
  user: one(users, {
    fields: [spotifyPlaylists.userId],
    references: [users.id],
  }),
  mood: one(moods, {
    fields: [spotifyPlaylists.moodId],
    references: [moods.id],
  }),
}));