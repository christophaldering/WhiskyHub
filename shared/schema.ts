import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
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
  canAccessWhiskyDb: boolean("can_access_whisky_db").default(false),
  newsletterOptIn: boolean("newsletter_opt_in").default(false),
  communityContributor: boolean("community_contributor").default(false),
  experienceLevel: text("experience_level").default("connoisseur"),
  lastSeenAt: timestamp("last_seen_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertParticipantSchema = createInsertSchema(participants).omit({ id: true, createdAt: true, emailVerified: true, verificationCode: true, verificationExpiry: true, lastSeenAt: true });
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
  guidedMode: boolean("guided_mode").default(false),
  guidedWhiskyIndex: integer("guided_whisky_index").default(-1), // -1=waiting, 0+=active whisky
  guidedRevealStep: integer("guided_reveal_step").default(0), // 0=blind, 1=name, 2=meta, 3=image+links
  revealIndex: integer("reveal_index").default(0),
  revealStep: integer("reveal_step").default(0), // 0=blind, 1=name, 2=meta, 3=image
  reflectionEnabled: boolean("reflection_enabled").default(false),
  reflectionMode: text("reflection_mode").default("standard"), // standard | custom
  reflectionVisibility: text("reflection_visibility").default("named"), // named | anonymous | optional
  customPrompts: text("custom_prompts"), // JSON array of custom prompt strings
  coverImageUrl: text("cover_image_url"),
  coverImageRevealed: boolean("cover_image_revealed").default(false),
  videoLink: text("video_link"),
  dramStartedAt: timestamp("dram_started_at"),
  dramTimers: text("dram_timers"), // JSON: { [whiskyId]: accumulatedSeconds }
  ratingPrompt: text("rating_prompt"), // null | "rate" | "final" — host prompt to submit ratings
  ratingScale: integer("rating_scale").notNull().default(100), // 5 | 10 | 20 | 100
  activeWhiskyId: varchar("active_whisky_id"), // tracks which whisky is currently being discussed
  aiHighlightsCache: text("ai_highlights_cache"), // Cached AI session highlights (JSON)
  aiHighlightsRatingCount: integer("ai_highlights_rating_count"), // Rating count when highlights were cached
  guestMode: text("guest_mode").default("standard"), // "standard" | "ultra" — guest participation flavor
  sessionUiMode: text("session_ui_mode"), // null | flow | focus | journal — host-enforced UI mode
  showRanking: boolean("show_ranking").default(true),
  showGroupAvg: boolean("show_group_avg").default(true),
  showReveal: boolean("show_reveal").default(true),
  isTestData: boolean("is_test_data").default(false),
  viewerEnabled: boolean("viewer_enabled").default(false),
  viewerToken: text("viewer_token"),
  viewerLiveOnly: boolean("viewer_live_only").default(true),
  viewerAllowAverages: boolean("viewer_allow_averages").default(true),
  viewerAllowRanking: boolean("viewer_allow_ranking").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  openedAt: timestamp("opened_at"),
  closedAt: timestamp("closed_at"),
  revealedAt: timestamp("revealed_at"),
  archivedAt: timestamp("archived_at"),
});

export const insertTastingSchema = createInsertSchema(tastings).omit({ id: true, createdAt: true, openedAt: true, closedAt: true, revealedAt: true, archivedAt: true });
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
  photoRevealed: boolean("photo_revealed").default(false),
  hostNotes: text("host_notes"),
  bottler: text("bottler"), // Independent Bottler or "OA" for official
  vintage: text("vintage"), // Distillation/bottling vintage year(s)
  price: real("price"), // Bottle price (0.7l)
  hostSummary: text("host_summary"), // Host's detailed tasting assessment/review
  distilleryUrl: text("distillery_url"), // Distillery homepage URL
  aiFactsCache: text("ai_facts_cache"), // Cached AI-generated interesting facts (JSON)
  aiInsightsCache: text("ai_insights_cache"), // Cached AI-generated whisky insights (text)
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
  nose: real("nose").default(50),
  taste: real("taste").default(50),
  finish: real("finish").default(50),
  balance: real("balance").default(50),
  overall: real("overall").default(50),
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
  imageUrl: text("image_url"),
  body: text("body"),
  source: text("source").default("casksense"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertJournalEntrySchema = createInsertSchema(journalEntries).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type JournalEntry = typeof journalEntries.$inferSelect;

// --- Benchmark Entries (AI-extracted tasting data from documents) ---
export const benchmarkEntries = pgTable("benchmark_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  whiskyName: text("whisky_name").notNull(),
  distillery: text("distillery"),
  region: text("region"),
  country: text("country"),
  age: text("age"),
  abv: text("abv"),
  caskType: text("cask_type"),
  category: text("category"),
  noseNotes: text("nose_notes"),
  tasteNotes: text("taste_notes"),
  finishNotes: text("finish_notes"),
  overallNotes: text("overall_notes"),
  score: real("score"),
  scoreScale: text("score_scale"),
  sourceDocument: text("source_document"),
  sourceAuthor: text("source_author"),
  uploadedBy: varchar("uploaded_by").notNull(),
  libraryCategory: text("library_category").default("other"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBenchmarkEntrySchema = createInsertSchema(benchmarkEntries).omit({ id: true, createdAt: true });
export type InsertBenchmarkEntry = z.infer<typeof insertBenchmarkEntrySchema>;
export type BenchmarkEntry = typeof benchmarkEntries.$inferSelect;

// --- Wishlist Entries (whiskies the user wants to try) ---
export const wishlistEntries = pgTable("wishlist_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  participantId: varchar("participant_id").notNull(),
  whiskyName: text("whisky_name").notNull(),
  distillery: text("distillery"),
  region: text("region"),
  age: text("age"),
  abv: text("abv"),
  caskType: text("cask_type"),
  notes: text("notes"),
  priority: text("priority").default("medium"),
  source: text("source"),
  aiSummary: text("ai_summary"),
  aiSummaryDate: timestamp("ai_summary_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWishlistEntrySchema = createInsertSchema(wishlistEntries).omit({ id: true, createdAt: true });
export type InsertWishlistEntry = z.infer<typeof insertWishlistEntrySchema>;
export type WishlistEntry = typeof wishlistEntries.$inferSelect;

// --- Newsletters (admin newsletter management + archive) ---
export const newsletters = pgTable("newsletters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subject: text("subject").notNull(),
  contentHtml: text("content_html").notNull(),
  contentText: text("content_text"),
  recipientCount: integer("recipient_count").default(0),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNewsletterSchema = createInsertSchema(newsletters).omit({ id: true, createdAt: true });
export type InsertNewsletter = z.infer<typeof insertNewsletterSchema>;
export type Newsletter = typeof newsletters.$inferSelect;

// --- Newsletter Recipients (tracks who received which newsletter) ---
export const newsletterRecipients = pgTable("newsletter_recipients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  newsletterId: varchar("newsletter_id").notNull(),
  participantId: varchar("participant_id").notNull(),
  email: text("email").notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
});

// --- Whiskybase Collection (imported personal whisky collection from whiskybase.com) ---
export const whiskybaseCollection = pgTable("whiskybase_collection", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  participantId: varchar("participant_id").notNull(),
  whiskybaseId: text("whiskybase_id").notNull(),
  collectionId: text("collection_id"),
  brand: text("brand"),
  name: text("name").notNull(),
  bottlingSeries: text("bottling_series"),
  status: text("status"), // open, closed, empty
  statedAge: text("stated_age"),
  size: text("size"),
  abv: text("abv"),
  unit: text("unit"),
  caskType: text("cask_type"),
  communityRating: real("community_rating"),
  personalRating: real("personal_rating"),
  pricePaid: real("price_paid"),
  currency: text("currency"),
  avgPrice: real("avg_price"),
  avgPriceCurrency: text("avg_price_currency"),
  distillery: text("distillery"),
  vintage: text("vintage"),
  addedAt: text("added_at"),
  imageUrl: text("image_url"),
  auctionPrice: real("auction_price"),
  auctionCurrency: text("auction_currency"),
  notes: text("notes"),
  purchaseLocation: text("purchase_location"),
  estimatedPrice: real("estimated_price"),
  estimatedPriceCurrency: text("estimated_price_currency"),
  estimatedPriceDate: timestamp("estimated_price_date"),
  estimatedPriceSource: text("estimated_price_source"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWhiskybaseCollectionSchema = createInsertSchema(whiskybaseCollection).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWhiskybaseCollection = z.infer<typeof insertWhiskybaseCollectionSchema>;
export type WhiskybaseCollectionItem = typeof whiskybaseCollection.$inferSelect;

// --- Tasting Reminders ---

export const tastingReminders = pgTable("tasting_reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  participantId: varchar("participant_id").notNull(),
  tastingId: varchar("tasting_id"),
  enabled: boolean("enabled").default(true),
  offsetMinutes: integer("offset_minutes").notNull().default(1440),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTastingReminderSchema = createInsertSchema(tastingReminders).omit({ id: true, createdAt: true });
export type InsertTastingReminder = z.infer<typeof insertTastingReminderSchema>;
export type TastingReminder = typeof tastingReminders.$inferSelect;

export const reminderLog = pgTable("reminder_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  participantId: varchar("participant_id").notNull(),
  tastingId: varchar("tasting_id").notNull(),
  offsetMinutes: integer("offset_minutes").notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
});

// --- Encyclopedia Suggestions ---

export const encyclopediaSuggestions = pgTable("encyclopedia_suggestions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(),
  name: text("name").notNull(),
  country: text("country").notNull(),
  region: text("region").notNull(),
  founded: integer("founded"),
  description: text("description"),
  feature: text("feature"),
  website: text("website"),
  status: text("status").default("pending").notNull(),
  submittedBy: varchar("submitted_by"),
  submitterName: text("submitter_name"),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEncyclopediaSuggestionSchema = createInsertSchema(encyclopediaSuggestions).omit({ id: true, createdAt: true, status: true, adminNote: true });
export type InsertEncyclopediaSuggestion = z.infer<typeof insertEncyclopediaSuggestionSchema>;
export type EncyclopediaSuggestion = typeof encyclopediaSuggestions.$inferSelect;

// --- Tasting Photos ---
export const tastingPhotos = pgTable("tasting_photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tastingId: varchar("tasting_id").notNull(),
  participantId: varchar("participant_id").notNull(),
  participantName: text("participant_name"),
  whiskyId: varchar("whisky_id"),
  photoUrl: text("photo_url").notNull(),
  caption: text("caption"),
  printable: boolean("printable").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTastingPhotoSchema = createInsertSchema(tastingPhotos).omit({ id: true, createdAt: true });
export type InsertTastingPhoto = z.infer<typeof insertTastingPhotoSchema>;
export type TastingPhoto = typeof tastingPhotos.$inferSelect;

// --- User Feedback ---
export const userFeedback = pgTable("user_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  participantId: varchar("participant_id"),
  participantName: text("participant_name"),
  category: text("category").notNull().default("feature"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserFeedbackSchema = createInsertSchema(userFeedback).omit({ id: true, createdAt: true });
export type InsertUserFeedback = z.infer<typeof insertUserFeedbackSchema>;
export type UserFeedback = typeof userFeedback.$inferSelect;

// --- Notifications / News Feed ---
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recipientId: varchar("recipient_id"),
  type: text("type").notNull(), // invitation | join | reveal | platform_update | feature_update
  title: text("title").notNull(),
  message: text("message").notNull(),
  linkUrl: text("link_url"),
  tastingId: varchar("tasting_id"),
  isGlobal: boolean("is_global").default(false),
  readBy: text("read_by").default("[]"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// --- System Settings (key-value store for runtime config) ---
export const systemSettings = pgTable("system_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: text("updated_by"),
});

export type SystemSetting = typeof systemSettings.$inferSelect;

// --- Admin Audit Log ---
export const adminAuditLog = pgTable("admin_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  action: text("action").notNull(),
  actor: text("actor").notNull(),
  before: jsonb("before"),
  after: jsonb("after"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AdminAuditLogEntry = typeof adminAuditLog.$inferSelect;

// --- Changelog Entries (platform development log) ---
export const changelogEntries = pgTable("changelog_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull().default("feature"),
  date: text("date").notNull(),
  version: text("version"),
  visible: boolean("visible").default(true),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertChangelogEntrySchema = createInsertSchema(changelogEntries).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertChangelogEntry = z.infer<typeof insertChangelogEntrySchema>;
export type ChangelogEntry = typeof changelogEntries.$inferSelect;

// --- Session Presence (heartbeat tracking for active participants) ---
export const sessionPresence = pgTable("session_presence", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tastingId: varchar("tasting_id").notNull(),
  participantId: varchar("participant_id").notNull(),
  lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
});

export type SessionPresence = typeof sessionPresence.$inferSelect;

// --- App Settings (key-value store for admin-controlled platform settings) ---
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type AppSetting = typeof appSettings.$inferSelect;
