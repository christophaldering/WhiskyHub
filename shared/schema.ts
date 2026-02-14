import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// --- Participants (lightweight auth: name + optional pin) ---
export const participants = pgTable("participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  pin: text("pin"),
  language: text("language").default("en"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertParticipantSchema = createInsertSchema(participants).omit({ id: true, createdAt: true });
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
  imageUrl: text("image_url"),
});

export const insertWhiskySchema = createInsertSchema(whiskies).omit({ id: true });
export type InsertWhisky = z.infer<typeof insertWhiskySchema>;
export type Whisky = typeof whiskies.$inferSelect;

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
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRatingSchema = createInsertSchema(ratings).omit({ id: true, updatedAt: true });
export type InsertRating = z.infer<typeof insertRatingSchema>;
export type Rating = typeof ratings.$inferSelect;
