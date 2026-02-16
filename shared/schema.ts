import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// --- Participants (lightweight auth: name + optional pin) ---
export const participants = pgTable("participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  pin: text("pin"),
  email: text("email"),
  role: text("role").default("user"),
  language: text("language").default("en"),
  emailVerified: boolean("email_verified").default(false),
  verificationCode: text("verification_code"),
  verificationExpiry: timestamp("verification_expiry"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertParticipantSchema = createInsertSchema(participants).omit({ id: true, createdAt: true, emailVerified: true, verificationCode: true, verificationExpiry: true });
export type InsertParticipant = z.infer<typeof insertParticipantSchema>;
export type Participant = typeof participants.$inferSelect;

// --- Tastings (sessions) ---
export const tastings = pgTable("tastings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  date: text("date").notNull(),
  location: text("location").notNull(),
  hostId: varchar("host_id").notNull(),
  code: text("code").notNull(),
  status: text("status").notNull().default("draft"), // draft | open | closed | reveal | archived
  currentAct: text("current_act").default("act1"), // act1 | act2 | act3 | act4
  hostReflection: text("host_reflection"),
  blindMode: boolean("blind_mode").default(false),
  revealIndex: integer("reveal_index").default(0),
  revealStep: integer("reveal_step").default(0), // 0=blind, 1=name, 2=meta, 3=image
  reflectionEnabled: boolean("reflection_enabled").default(false),
  reflectionMode: text("reflection_mode").default("standard"), // standard | custom
  reflectionVisibility: text("reflection_visibility").default("named"), // named | anonymous | optional
  customPrompts: text("custom_prompts"), // JSON array of custom prompt strings
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTastingSchema = createInsertSchema(tastings).omit({ id: true, createdAt: true });
export type InsertTasting = z.infer<typeof insertTastingSchema>;
export type Tasting = typeof tastings.$inferSelect;

// --- Tasting Participants (join table) ---
export const tastingParticipants = pgTable("tasting_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tastingId: varchar("tasting_id").notNull(),
  participantId: varchar("participant_id").notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const insertTastingParticipantSchema = createInsertSchema(tastingParticipants).omit({ id: true, joinedAt: true });
export type InsertTastingParticipant = z.infer<typeof insertTastingParticipantSchema>;
export type TastingParticipant = typeof tastingParticipants.$inferSelect;

// --- Whiskies (items in a tasting flight) ---
export const whiskies = pgTable("whiskies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tastingId: varchar("tasting_id").notNull(),
  name: text("name").notNull(),
  distillery: text("distillery"),
  age: text("age"),
  abv: real("abv"),
  type: text("type"),
  country: text("country"),
  notes: text("notes"),
  sortOrder: integer("sort_order").notNull().default(0),
  // Taxonomy backbone
  category: text("category"), // Single Malt, Blended Malt, Bourbon, Rye, etc.
  region: text("region"), // Islay, Speyside, Highland, Kentucky, etc.
  abvBand: text("abv_band"), // Low (<40%), Standard (40-46%), High (46-55%), Cask Strength (>55%)
  ageBand: text("age_band"), // NAS, Young (3-9), Classic (10-17), Mature (18-25), Old (25+)
  caskInfluence: text("cask_influence"), // Bourbon, Sherry, Port, Wine, etc.
  peatLevel: text("peat_level"), // None, Light, Medium, Heavy
  ppm: real("ppm"), // phenol parts per million
  whiskybaseId: text("whiskybase_id"), // Whiskybase catalog number
  wbScore: real("wb_score"), // Whiskybase community score (0-100)
  imageUrl: text("image_url"),
});

export const insertWhiskySchema = createInsertSchema(whiskies).omit({ id: true });
export type InsertWhisky = z.infer<typeof insertWhiskySchema>;
export type Whisky = typeof whiskies.$inferSelect;

// --- Participant Profiles ---
export const profiles = pgTable("profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  participantId: varchar("participant_id").notNull(),
  bio: text("bio"),
  favoriteWhisky: text("favorite_whisky"),
  goToDram: text("go_to_dram"),
  preferredRegions: text("preferred_regions"),
  preferredPeatLevel: text("preferred_peat_level"),
  preferredCaskInfluence: text("preferred_cask_influence"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProfileSchema = createInsertSchema(profiles).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profiles.$inferSelect;

// --- Session Invites ---
export const sessionInvites = pgTable("session_invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tastingId: varchar("tasting_id").notNull(),
  email: text("email").notNull(),
  token: text("token").notNull(),
  personalNote: text("personal_note"),
  status: text("status").notNull().default("invited"),
  createdAt: timestamp("created_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
});

export const insertSessionInviteSchema = createInsertSchema(sessionInvites).omit({ id: true, createdAt: true, acceptedAt: true });
export type InsertSessionInvite = z.infer<typeof insertSessionInviteSchema>;
export type SessionInvite = typeof sessionInvites.$inferSelect;

// --- Discussion Entries ---
export const discussionEntries = pgTable("discussion_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tastingId: varchar("tasting_id").notNull(),
  participantId: varchar("participant_id").notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDiscussionEntrySchema = createInsertSchema(discussionEntries).omit({ id: true, createdAt: true });
export type InsertDiscussionEntry = z.infer<typeof insertDiscussionEntrySchema>;
export type DiscussionEntry = typeof discussionEntries.$inferSelect;

// --- Reflection Entries ---
export const reflectionEntries = pgTable("reflection_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tastingId: varchar("tasting_id").notNull(),
  participantId: varchar("participant_id").notNull(),
  promptText: text("prompt_text").notNull(),
  text: text("text").notNull(),
  isAnonymous: boolean("is_anonymous").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReflectionEntrySchema = createInsertSchema(reflectionEntries).omit({ id: true, createdAt: true });
export type InsertReflectionEntry = z.infer<typeof insertReflectionEntrySchema>;
export type ReflectionEntry = typeof reflectionEntries.$inferSelect;

// --- Whisky Friends (contact list) ---
export const whiskyFriends = pgTable("whisky_friends", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  participantId: varchar("participant_id").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  status: text("status").notNull().default("accepted"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWhiskyFriendSchema = createInsertSchema(whiskyFriends).omit({ id: true, createdAt: true });
export type InsertWhiskyFriend = z.infer<typeof insertWhiskyFriendSchema>;
export type WhiskyFriend = typeof whiskyFriends.$inferSelect;

// --- Ratings (evaluations) ---
export const ratings = pgTable("ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tastingId: varchar("tasting_id").notNull(),
  whiskyId: varchar("whisky_id").notNull(),
  participantId: varchar("participant_id").notNull(),
  nose: real("nose").notNull().default(50),
  taste: real("taste").notNull().default(50),
  finish: real("finish").notNull().default(50),
  balance: real("balance").notNull().default(50),
  overall: real("overall").notNull().default(50),
  notes: text("notes").default(""),
  guessAbv: real("guess_abv"),
  guessAge: text("guess_age"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRatingSchema = createInsertSchema(ratings).omit({ id: true, updatedAt: true });
export type InsertRating = z.infer<typeof insertRatingSchema>;
export type Rating = typeof ratings.$inferSelect;

// --- Journal Entries (private tasting log) ---
export const journalEntries = pgTable("journal_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  participantId: varchar("participant_id").notNull(),
  title: text("title").notNull(),
  whiskyName: text("whisky_name"),
  distillery: text("distillery"),
  region: text("region"),
  age: text("age"),
  abv: text("abv"),
  caskType: text("cask_type"),
  noseNotes: text("nose_notes"),
  tasteNotes: text("taste_notes"),
  finishNotes: text("finish_notes"),
  personalScore: real("personal_score"),
  whiskybaseId: text("whiskybase_id"),
  wbScore: real("wb_score"),
  mood: text("mood"),
  occasion: text("occasion"),
  body: text("body"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertJournalEntrySchema = createInsertSchema(journalEntries).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type JournalEntry = typeof journalEntries.$inferSelect;
