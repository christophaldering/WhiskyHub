import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, doublePrecision, timestamp, boolean, jsonb, date, index, uniqueIndex } from "drizzle-orm/pg-core";
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
  smokeAffinityIndex: real("smoke_affinity_index"),
  sweetnessBias: real("sweetness_bias"),
  ratingStabilityScore: real("rating_stability_score"),
  explorationIndex: real("exploration_index"),
  makingOfAccess: boolean("making_of_access").default(false),
  preferredRatingScale: integer("preferred_rating_scale"),
  privacyConsentAt: timestamp("privacy_consent_at"),
  lastSeenAt: timestamp("last_seen_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertParticipantSchema = createInsertSchema(participants).omit({ id: true, createdAt: true, emailVerified: true, verificationCode: true, verificationExpiry: true, lastSeenAt: true, makingOfAccess: true, privacyConsentAt: true });
export type InsertParticipant = z.infer<typeof insertParticipantSchema>;
export type Participant = typeof participants.$inferSelect;

// --- Tastings (sessions) ---
export const tastings = pgTable("tastings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  date: text("date").notNull(),
  time: text("time"),
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
  revealOrder: text("reveal_order"), // JSON: array of field group arrays, null=classic 3-stage
  presentationSlide: integer("presentation_slide"), // null=not presenting, 0+=active slide index
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
  aiNarrative: text("ai_narrative"), // AI-generated narrative session summary (Markdown)
  guestMode: text("guest_mode").default("standard"), // "standard" | "ultra" — guest participation flavor
  lockedDrams: text("locked_drams"), // JSON array of whisky IDs whose ratings are locked
  sessionUiMode: text("session_ui_mode"), // null | flow | focus | journal — host-enforced UI mode
  showRanking: boolean("show_ranking").default(true),
  showGroupAvg: boolean("show_group_avg").default(true),
  showReveal: boolean("show_reveal").default(true),
  isTestData: boolean("is_test_data").default(false),
  sharedPrintMaterials: text("shared_print_materials"),
  // Tasting-wide handout (one per tasting, e.g. "von Rudi" Programmheft)
  handoutUrl: text("handout_url"), // Object storage path to handout file (PDF or image)
  handoutContentType: text("handout_content_type"), // MIME type
  handoutTitle: text("handout_title"),
  handoutAuthor: text("handout_author"),
  handoutDescription: text("handout_description"),
  handoutVisibility: text("handout_visibility").default("always"), // "always" | "after_first_reveal"
  tastingType: text("tasting_type").default("standard"), // standard | bottle-sharing
  visibility: text("visibility").default("private"), // public | private | group
  sharingMessage: text("sharing_message"),
  targetCommunityIds: text("target_community_ids"), // JSON array of community IDs
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
}, (table) => ({
  uqTastingParticipant: uniqueIndex("uq_tasting_participant").on(table.tastingId, table.participantId),
}));

export const insertTastingParticipantSchema = createInsertSchema(tastingParticipants).omit({ id: true, joinedAt: true });
export type InsertTastingParticipant = z.infer<typeof insertTastingParticipantSchema>;
export type TastingParticipant = typeof tastingParticipants.$inferSelect;

// --- Sharing Participants (bottle-sharing participation requests/confirmations) ---
export const sharingParticipants = pgTable("sharing_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tastingId: varchar("tasting_id").notNull(),
  participantId: varchar("participant_id").notNull(),
  status: text("status").notNull().default("interested"), // interested | confirmed | declined
  createdAt: timestamp("created_at").defaultNow(),
  confirmedAt: timestamp("confirmed_at"),
});

export const insertSharingParticipantSchema = createInsertSchema(sharingParticipants).omit({ id: true, createdAt: true, confirmedAt: true });
export type InsertSharingParticipant = z.infer<typeof insertSharingParticipantSchema>;
export type SharingParticipant = typeof sharingParticipants.$inferSelect;

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
  caskType: text("cask_type"), // Bourbon, Sherry, Port, Wine, etc.
  peatLevel: text("peat_level"), // None, Light, Medium, Heavy
  ppm: real("ppm"), // phenol parts per million
  whiskybaseId: text("whiskybase_id"), // Whiskybase catalog number
  wbScore: real("wb_score"), // Whiskybase community score (0-100)
  imageUrl: text("image_url"),
  photoRevealed: boolean("photo_revealed").default(false),
  hostNotes: text("host_notes"),
  bottler: text("bottler"), // Independent Bottler or "OA" for official
  distilledYear: text("distilled_year"), // Year of distillation
  bottledYear: text("bottled_year"), // Year of bottling
  price: real("price"), // Bottle price (0.7l)
  hostSummary: text("host_summary"), // Host's detailed tasting assessment/review
  distilleryUrl: text("distillery_url"), // Distillery homepage URL
  aiFactsCache: text("ai_facts_cache"), // Cached AI-generated interesting facts (JSON)
  aiInsightsCache: text("ai_insights_cache"), // Cached AI-generated whisky insights (text)
  flavorProfile: text("flavor_profile"), // Host-set flavor profile for guided tasting tags
  handoutUrl: text("handout_url"), // Object storage path to handout file (PDF or image)
  handoutContentType: text("handout_content_type"), // MIME type (e.g. application/pdf, image/jpeg)
  handoutTitle: text("handout_title"),
  handoutAuthor: text("handout_author"),
  handoutDescription: text("handout_description"),
  handoutVisibility: text("handout_visibility").default("always"), // "always" | "after_reveal"
  distilleryId: varchar("distillery_id"), // optional FK -> distilleries.id (kept nullable for back-compat)
});

export const insertWhiskySchema = createInsertSchema(whiskies).omit({ id: true });
export type InsertWhisky = z.infer<typeof insertWhiskySchema>;
export type Whisky = typeof whiskies.$inferSelect;

// --- Whisky Handout Library (per-host reusable handouts) ---
export const whiskyHandoutLibrary = pgTable("whisky_handout_library", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hostId: varchar("host_id").notNull(),
  whiskyName: text("whisky_name").notNull(),
  distillery: text("distillery"),
  whiskybaseId: text("whiskybase_id"),
  age: integer("age"),
  caskType: text("cask_type"),
  fileUrl: text("file_url").notNull(),
  contentType: text("content_type").notNull(),
  fileSize: integer("file_size"),
  title: text("title"),
  author: text("author"),
  description: text("description"),
  documentDate: date("document_date"),
  isShared: boolean("is_shared").default(false).notNull(),
  sharedAt: timestamp("shared_at"),
  sharedByName: text("shared_by_name"),
  clonedFromId: varchar("cloned_from_id"),
  isProgramme: boolean("is_programme").default(false).notNull(),
  programmeSourceId: varchar("programme_source_id"),
  distilleryId: varchar("distillery_id"), // optional FK -> distilleries.id
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  hostIdx: index("idx_whisky_handout_library_host").on(table.hostId),
  hostWbIdx: index("idx_whisky_handout_library_host_wb").on(table.hostId, table.whiskybaseId),
  sharedIdx: index("idx_whisky_handout_library_shared").on(table.isShared),
}));

export const insertWhiskyHandoutLibrarySchema = createInsertSchema(whiskyHandoutLibrary).omit({ id: true, createdAt: true, isShared: true, sharedAt: true, sharedByName: true, clonedFromId: true });
export type InsertWhiskyHandoutLibraryEntry = z.infer<typeof insertWhiskyHandoutLibrarySchema>;
export type WhiskyHandoutLibraryEntry = typeof whiskyHandoutLibrary.$inferSelect;

// --- Multi-Handouts: per-whisky n:m handout entries ---
export const whiskyHandouts = pgTable("whisky_handouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  whiskyId: varchar("whisky_id").notNull(),
  position: integer("position").notNull().default(0),
  visibility: text("visibility").notNull().default("always"), // "always" | "after_reveal"
  fileUrl: text("file_url").notNull(),
  contentType: text("content_type").notNull(),
  title: text("title"),
  author: text("author"),
  description: text("description"),
  documentDate: date("document_date"),
  sourceLibraryId: varchar("source_library_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  whiskyIdx: index("idx_whisky_handouts_whisky").on(t.whiskyId, t.position),
}));
export const insertWhiskyHandoutSchema = createInsertSchema(whiskyHandouts).omit({ id: true, createdAt: true });
export type InsertWhiskyHandout = z.infer<typeof insertWhiskyHandoutSchema>;
export type WhiskyHandout = typeof whiskyHandouts.$inferSelect;

// --- Multi-Handouts: per-tasting n:m handout entries ---
export const tastingHandouts = pgTable("tasting_handouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tastingId: varchar("tasting_id").notNull(),
  position: integer("position").notNull().default(0),
  visibility: text("visibility").notNull().default("always"), // "always" | "after_first_reveal"
  fileUrl: text("file_url").notNull(),
  contentType: text("content_type").notNull(),
  title: text("title"),
  author: text("author"),
  description: text("description"),
  documentDate: date("document_date"),
  sourceLibraryId: varchar("source_library_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  tastingIdx: index("idx_tasting_handouts_tasting").on(t.tastingId, t.position),
}));
export const insertTastingHandoutSchema = createInsertSchema(tastingHandouts).omit({ id: true, createdAt: true });
export type InsertTastingHandout = z.infer<typeof insertTastingHandoutSchema>;
export type TastingHandout = typeof tastingHandouts.$inferSelect;

// --- Multi-Handouts: per-distillery n:m handout entries ---
// These are auto-attached to every whisky of the same distillery in the viewer.
export const distilleryHandouts = pgTable("distillery_handouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  distilleryId: varchar("distillery_id").notNull(),
  hostId: varchar("host_id").notNull(),
  position: integer("position").notNull().default(0),
  visibility: text("visibility").notNull().default("always"), // "always" | "after_reveal"
  fileUrl: text("file_url").notNull(),
  contentType: text("content_type").notNull(),
  title: text("title"),
  author: text("author"),
  description: text("description"),
  documentDate: date("document_date"),
  sourceLibraryId: varchar("source_library_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  distilleryIdx: index("idx_distillery_handouts_distillery").on(t.distilleryId, t.position),
  hostIdx: index("idx_distillery_handouts_host").on(t.hostId),
}));
export const insertDistilleryHandoutSchema = createInsertSchema(distilleryHandouts).omit({ id: true, createdAt: true });
export type InsertDistilleryHandout = z.infer<typeof insertDistilleryHandoutSchema>;
export type DistilleryHandout = typeof distilleryHandouts.$inferSelect;

// --- PDF Split Sessions (temporary store for split program PDFs awaiting assignment) ---
export interface PdfSplitPage {
  pageNumber: number;
  fileUrl: string;
  fileSize: number;
}

export const pdfSplitSessions = pgTable("pdf_split_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tastingId: varchar("tasting_id").notNull(),
  hostId: varchar("host_id").notNull(),
  pages: jsonb("pages").$type<PdfSplitPage[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  tastingIdx: index("idx_pdf_split_sessions_tasting").on(table.tastingId),
  createdAtIdx: index("idx_pdf_split_sessions_created").on(table.createdAt),
}));

export type PdfSplitSession = typeof pdfSplitSessions.$inferSelect;

// --- Participant Profiles ---
export const profiles = pgTable("profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  participantId: varchar("participant_id").notNull(),
  bio: text("bio"),
  favoriteWhisky: text("favorite_whisky"),
  goToDram: text("go_to_dram"),
  preferredRegions: text("preferred_regions"),
  preferredPeatLevel: text("preferred_peat_level"),
  preferredCaskType: text("preferred_cask_type"),
  photoUrl: text("photo_url"),
  openaiApiKey: text("openai_api_key"),
  friendNotificationsEnabled: boolean("friend_notifications_enabled").default(true),
  onlineToastLevel: text("online_toast_level").default("all"),
  cheersEnabled: boolean("cheers_enabled").default(true),
  tastingInviteEnabled: boolean("tasting_invite_enabled").default(true),
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

// --- Whisky Groups (Clubs) ---
export const whiskyGroups = pgTable("whisky_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: varchar("owner_id").notNull(),
  temporary: boolean("temporary").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWhiskyGroupSchema = createInsertSchema(whiskyGroups).omit({ id: true, createdAt: true });
export type InsertWhiskyGroup = z.infer<typeof insertWhiskyGroupSchema>;
export type WhiskyGroup = typeof whiskyGroups.$inferSelect;

export const whiskyGroupMembers = pgTable("whisky_group_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull(),
  friendId: varchar("friend_id").notNull(),
  role: text("role").notNull().default("member"),
  addedAt: timestamp("added_at").defaultNow(),
});

export const insertWhiskyGroupMemberSchema = createInsertSchema(whiskyGroupMembers).omit({ id: true, addedAt: true });
export type InsertWhiskyGroupMember = z.infer<typeof insertWhiskyGroupMemberSchema>;
export type WhiskyGroupMember = typeof whiskyGroupMembers.$inferSelect;

// --- Ratings (evaluations) ---
export const ratings = pgTable("ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tastingId: varchar("tasting_id").notNull(),
  whiskyId: varchar("whisky_id").notNull(),
  participantId: varchar("participant_id").notNull(),
  nose: real("nose").default(50),
  taste: real("taste").default(50),
  finish: real("finish").default(50),
  overall: real("overall").default(50),
  notes: text("notes").default(""),
  guessAbv: real("guess_abv"),
  guessAge: text("guess_age"),
  normalizedScore: real("normalized_score"),
  normalizedNose: real("normalized_nose"),
  normalizedTaste: real("normalized_taste"),
  normalizedFinish: real("normalized_finish"),
  calibrationDelta: real("calibration_delta"),
  blindVsOpenDelta: real("blind_vs_open_delta"),
  confidenceWeight: real("confidence_weight"),
  source: text("source").default("app"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRatingSchema = createInsertSchema(ratings).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRating = z.infer<typeof insertRatingSchema>;
export type Rating = typeof ratings.$inferSelect;

// --- Journal Entries (private tasting log) ---
export const journalEntries = pgTable("journal_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  participantId: varchar("participant_id").notNull(),
  title: text("title").notNull(),
  name: text("name"),
  distillery: text("distillery"),
  region: text("region"),
  country: text("country"),
  category: text("category"),
  age: text("age"),
  abv: real("abv"),
  caskType: text("cask_type"),
  peatLevel: text("peat_level"),
  bottler: text("bottler"),
  noseNotes: text("nose_notes"),
  tasteNotes: text("taste_notes"),
  finishNotes: text("finish_notes"),
  personalScore: real("personal_score"),
  noseScore: real("nose_score"),
  tasteScore: real("taste_score"),
  finishScore: real("finish_score"),
  whiskybaseId: text("whiskybase_id"),
  wbScore: real("wb_score"),
  price: real("price"),
  mood: text("mood"),
  occasion: text("occasion"),
  tastingContext: text("tasting_context"),
  imageUrl: text("image_url"),
  source: text("source").default("casksense"),
  voiceMemoUrl: text("voice_memo_url"),
  voiceMemoTranscript: text("voice_memo_transcript"),
  voiceMemoDuration: integer("voice_memo_duration"),
  status: text("status").default("final").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const insertJournalEntrySchema = createInsertSchema(journalEntries).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type JournalEntry = typeof journalEntries.$inferSelect;

// --- Benchmark Entries (AI-extracted tasting data from documents) ---
export const benchmarkEntries = pgTable("benchmark_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  distillery: text("distillery"),
  region: text("region"),
  country: text("country"),
  age: text("age"),
  abv: real("abv"),
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
  name: text("name").notNull(),
  distillery: text("distillery"),
  region: text("region"),
  country: text("country"),
  age: text("age"),
  abv: real("abv"),
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
  abv: real("abv"),
  unit: text("unit"),
  caskType: text("cask_type"),
  communityRating: real("community_rating"),
  personalRating: real("personal_rating"),
  pricePaid: real("price_paid"),
  currency: text("currency"),
  avgPrice: real("avg_price"),
  avgPriceCurrency: text("avg_price_currency"),
  distillery: text("distillery"),
  country: text("country"),
  region: text("region"),
  distilledYear: integer("distilled_year"),
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
  source: text("source").default("whiskybase"),
  locallyModified: jsonb("locally_modified").$type<Record<string, boolean>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWhiskybaseCollectionSchema = createInsertSchema(whiskybaseCollection).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWhiskybaseCollection = z.infer<typeof insertWhiskybaseCollectionSchema>;
export type WhiskybaseCollectionItem = typeof whiskybaseCollection.$inferSelect;

// --- Collection Sync Log ---
export const collectionSyncLog = pgTable("collection_sync_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  participantId: varchar("participant_id").notNull(),
  syncedAt: timestamp("synced_at").defaultNow(),
  summary: jsonb("summary").$type<{ added: number; updated: number; removed: number; conflicts: number; unchanged: number }>().notNull(),
  details: jsonb("details").$type<Array<{
    whiskybaseId: string;
    name: string;
    action: "added" | "removed" | "updated" | "conflict";
    changes?: Array<{ field: string; oldValue: any; newValue: any; source: "whiskybase" | "casksense" }>;
  }>>().notNull(),
});

export const insertCollectionSyncLogSchema = createInsertSchema(collectionSyncLog).omit({ id: true, syncedAt: true });
export type InsertCollectionSyncLog = z.infer<typeof insertCollectionSyncLogSchema>;
export type CollectionSyncLog = typeof collectionSyncLog.$inferSelect;

// --- Collection Import Log (for Undo) ---
export type CollectionImportLogDetail = {
  itemId: string;
  whiskybaseId: string | null;
  name: string;
  action: "added" | "updated";
  previous?: Record<string, any> | null;
};

export const collectionImportLog = pgTable("collection_import_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  participantId: varchar("participant_id").notNull(),
  importedAt: timestamp("imported_at").defaultNow(),
  filename: text("filename"),
  summary: jsonb("summary").$type<{ imported: number; updated: number; skipped: number; total: number }>().notNull(),
  details: jsonb("details").$type<CollectionImportLogDetail[]>().notNull(),
  undone: boolean("undone").default(false),
  undoneAt: timestamp("undone_at"),
});

export const insertCollectionImportLogSchema = createInsertSchema(collectionImportLog).omit({ id: true, importedAt: true, undone: true, undoneAt: true });
export type InsertCollectionImportLog = z.infer<typeof insertCollectionImportLogSchema>;
export type CollectionImportLog = typeof collectionImportLog.$inferSelect;

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

// --- AI Usage Log (tracking platform-key AI requests per user) ---
export const aiUsageLog = pgTable("ai_usage_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  participantId: varchar("participant_id").notNull(),
  featureId: text("feature_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_ai_usage_participant").on(table.participantId),
  index("idx_ai_usage_created").on(table.createdAt),
]);

export type AIUsageLogEntry = typeof aiUsageLog.$inferSelect;

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

// --- Communities (organizational groups for community-scoped content) ---
export const communities = pgTable("communities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  archiveVisibility: text("archive_visibility").notNull().default("community_only"),
  publicAggregatedEnabled: boolean("public_aggregated_enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCommunitySchema = createInsertSchema(communities).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCommunity = z.infer<typeof insertCommunitySchema>;
export type Community = typeof communities.$inferSelect;

// --- Community Memberships (links participants to communities) ---
export const communityMemberships = pgTable("community_memberships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  communityId: varchar("community_id").notNull(),
  participantId: varchar("participant_id").notNull(),
  role: text("role").notNull().default("member"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_community_memberships_community").on(table.communityId),
  index("idx_community_memberships_participant").on(table.participantId),
]);

export const insertCommunityMembershipSchema = createInsertSchema(communityMemberships).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCommunityMembership = z.infer<typeof insertCommunityMembershipSchema>;
export type CommunityMembership = typeof communityMemberships.$inferSelect;

// --- Community Invites (invitation tracking with status) ---
export const communityInvites = pgTable("community_invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  communityId: varchar("community_id").notNull(),
  invitedEmail: text("invited_email"),
  invitedParticipantId: varchar("invited_participant_id"),
  invitedByParticipantId: varchar("invited_by_participant_id").notNull(),
  token: text("token").notNull(),
  status: text("status").notNull().default("pending"),
  personalNote: text("personal_note"),
  createdAt: timestamp("created_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
}, (table) => [
  index("idx_community_invites_community").on(table.communityId),
  index("idx_community_invites_email").on(table.invitedEmail),
  index("idx_community_invites_participant").on(table.invitedParticipantId),
]);

export const insertCommunityInviteSchema = createInsertSchema(communityInvites).omit({ id: true, createdAt: true, acceptedAt: true });
export type InsertCommunityInvite = z.infer<typeof insertCommunityInviteSchema>;
export type CommunityInvite = typeof communityInvites.$inferSelect;

// --- Historical Tastings (imported external tasting data, independent from CaskSense live tastings) ---
export const historicalTastings = pgTable("historical_tastings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceKey: text("source_key").notNull().unique(),
  tastingNumber: integer("tasting_number").notNull(),
  titleDe: text("title_de"),
  titleEn: text("title_en"),
  tastingDate: text("tasting_date"),
  sourceFileName: text("source_file_name"),
  importBatchId: varchar("import_batch_id"),
  whiskyCount: integer("whisky_count").default(0),
  communityId: varchar("community_id"),
  visibilityLevel: text("visibility_level").notNull().default("community_only"),
  originType: text("origin_type").notNull().default("imported"),
  originTastingId: varchar("origin_tasting_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_historical_tastings_tasting_number").on(table.tastingNumber),
  index("idx_historical_tastings_community").on(table.communityId),
  index("idx_historical_tastings_origin_tasting").on(table.originTastingId),
]);

export const insertHistoricalTastingSchema = createInsertSchema(historicalTastings).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertHistoricalTasting = z.infer<typeof insertHistoricalTastingSchema>;
export type HistoricalTasting = typeof historicalTastings.$inferSelect;

// --- Historical Tasting Entries (individual whisky evaluations within a historical tasting) ---
export const historicalTastingEntries = pgTable("historical_tasting_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  historicalTastingId: varchar("historical_tasting_id").notNull(),
  sourceWhiskyKey: text("source_whisky_key").notNull().unique(),
  distilleryRaw: text("distillery_raw"),
  whiskyNameRaw: text("whisky_name_raw"),
  ageRaw: text("age_raw"),
  alcoholRaw: text("alcohol_raw"),
  priceRaw: text("price_raw"),
  countryRaw: text("country_raw"),
  regionRaw: text("region_raw"),
  typeRaw: text("type_raw"),
  smokyRaw: text("smoky_raw"),
  ppmRaw: text("ppm_raw"),
  caskRaw: text("cask_raw"),
  noseScore: real("nose_score"),
  noseRank: integer("nose_rank"),
  tasteScore: real("taste_score"),
  tasteRank: integer("taste_rank"),
  finishScore: real("finish_score"),
  finishRank: integer("finish_rank"),
  totalScore: real("total_score"),
  totalRank: integer("total_rank"),
  normalizedNose: real("normalized_nose"),
  normalizedTaste: real("normalized_taste"),
  normalizedFinish: real("normalized_finish"),
  normalizedTotal: real("normalized_total"),
  normalizedAge: integer("normalized_age"),
  normalizedAbv: real("normalized_abv"),
  normalizedPrice: real("normalized_price"),
  normalizedCountry: text("normalized_country"),
  normalizedRegion: text("normalized_region"),
  normalizedType: text("normalized_type"),
  normalizedIsSmoky: boolean("normalized_is_smoky"),
  normalizedPpm: real("normalized_ppm"),
  normalizedCask: text("normalized_cask"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_historical_entries_tasting_id").on(table.historicalTastingId),
]);

export const insertHistoricalTastingEntrySchema = createInsertSchema(historicalTastingEntries).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertHistoricalTastingEntry = z.infer<typeof insertHistoricalTastingEntrySchema>;
export type HistoricalTastingEntry = typeof historicalTastingEntries.$inferSelect;

// --- Historical Import Runs (tracking each import execution) ---
export const historicalImportRuns = pgTable("historical_import_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceFileName: text("source_file_name").notNull(),
  status: text("status").notNull().default("running"),
  rowsRead: integer("rows_read").default(0),
  rowsImported: integer("rows_imported").default(0),
  rowsSkipped: integer("rows_skipped").default(0),
  tastingsCreated: integer("tastings_created").default(0),
  entriesCreated: integer("entries_created").default(0),
  warningsCount: integer("warnings_count").default(0),
  errorsCount: integer("errors_count").default(0),
  summaryJson: text("summary_json"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertHistoricalImportRunSchema = createInsertSchema(historicalImportRuns).omit({ id: true, createdAt: true, completedAt: true });
export type InsertHistoricalImportRun = z.infer<typeof insertHistoricalImportRunSchema>;
export type HistoricalImportRun = typeof historicalImportRuns.$inferSelect;

// --- Historical Tasting Participants (self-service "I was there" claims) ---
export const historicalTastingParticipants = pgTable("historical_tasting_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  historicalTastingId: varchar("historical_tasting_id").notNull(),
  participantId: varchar("participant_id").notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => [
  index("idx_htp_tasting").on(table.historicalTastingId),
  index("idx_htp_participant").on(table.participantId),
  uniqueIndex("uq_htp_tasting_participant").on(table.historicalTastingId, table.participantId),
]);

export const insertHistoricalTastingParticipantSchema = createInsertSchema(historicalTastingParticipants).omit({ id: true, joinedAt: true });
export type InsertHistoricalTastingParticipant = z.infer<typeof insertHistoricalTastingParticipantSchema>;
export type HistoricalTastingParticipant = typeof historicalTastingParticipants.$inferSelect;

// --- Historical Personal Ratings (retroactive individual scores per whisky) ---
export const historicalPersonalRatings = pgTable("historical_personal_ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  historicalTastingEntryId: varchar("historical_tasting_entry_id").notNull(),
  participantId: varchar("participant_id").notNull(),
  nose: real("nose").default(50),
  taste: real("taste").default(50),
  finish: real("finish").default(50),
  overall: real("overall").default(50),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_hpr_entry").on(table.historicalTastingEntryId),
  index("idx_hpr_participant").on(table.participantId),
  uniqueIndex("uq_hpr_entry_participant").on(table.historicalTastingEntryId, table.participantId),
]);

export const insertHistoricalPersonalRatingSchema = createInsertSchema(historicalPersonalRatings).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertHistoricalPersonalRating = z.infer<typeof insertHistoricalPersonalRatingSchema>;
export type HistoricalPersonalRating = typeof historicalPersonalRatings.$inferSelect;

// --- Connoisseur Reports (AI-generated personal whisky profile) ---
export const connoisseurReports = pgTable("connoisseur_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  participantId: varchar("participant_id").notNull(),
  generatedAt: timestamp("generated_at").defaultNow(),
  reportContent: text("report_content").notNull(),
  summary: text("summary").notNull(),
  dataSnapshot: jsonb("data_snapshot"),
  language: text("language").default("en"),
});

export const insertConnoisseurReportSchema = createInsertSchema(connoisseurReports).omit({ id: true, generatedAt: true });
export type InsertConnoisseurReport = z.infer<typeof insertConnoisseurReportSchema>;
export type ConnoisseurReport = typeof connoisseurReports.$inferSelect;

// --- Voice Memos (audio recordings per whisky during tasting) ---
export const voiceMemos = pgTable("voice_memos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tastingId: varchar("tasting_id").notNull(),
  whiskyId: varchar("whisky_id").notNull(),
  participantId: varchar("participant_id").notNull(),
  audioUrl: text("audio_url"),
  transcript: text("transcript"),
  durationSeconds: integer("duration_seconds"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVoiceMemoSchema = createInsertSchema(voiceMemos).omit({ id: true, createdAt: true });
export type InsertVoiceMemo = z.infer<typeof insertVoiceMemoSchema>;
export type VoiceMemo = typeof voiceMemos.$inferSelect;

// --- Whisky Gallery (multi-photo per whisky) ---
export const whiskyGallery = pgTable("whisky_gallery", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  whiskyId: varchar("whisky_id").notNull(),
  photoUrl: text("photo_url").notNull(),
  source: text("source").default("manual"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("whisky_gallery_whisky_id_idx").on(table.whiskyId),
]);

export const insertWhiskyGallerySchema = createInsertSchema(whiskyGallery).omit({ id: true, createdAt: true });
export type InsertWhiskyGallery = z.infer<typeof insertWhiskyGallerySchema>;
export type WhiskyGalleryPhoto = typeof whiskyGallery.$inferSelect;

// --- Flavour Categories (admin-editable aroma categories) ---
export const flavourCategories = pgTable("flavour_categories", {
  id: varchar("id").primaryKey(),
  en: text("en").notNull(),
  de: text("de").notNull(),
  color: text("color").notNull().default("#888888"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertFlavourCategorySchema = createInsertSchema(flavourCategories);
export type InsertFlavourCategory = z.infer<typeof insertFlavourCategorySchema>;
export type FlavourCategory = typeof flavourCategories.$inferSelect;

// --- Flavour Descriptors (admin-editable aroma chips within categories) ---
export const flavourDescriptors = pgTable("flavour_descriptors", {
  id: varchar("id").primaryKey(),
  categoryId: varchar("category_id").notNull(),
  en: text("en").notNull(),
  de: text("de").notNull(),
  keywords: text("keywords").array().notNull().default(sql`'{}'::text[]`),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertFlavourDescriptorSchema = createInsertSchema(flavourDescriptors);
export type InsertFlavourDescriptor = z.infer<typeof insertFlavourDescriptorSchema>;
export type FlavourDescriptor = typeof flavourDescriptors.$inferSelect;

// --- Distilleries (encyclopedia of whisky distilleries) ---
export const distilleries = pgTable("distilleries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  region: text("region").notNull(),
  country: text("country").notNull(),
  founded: integer("founded"),
  description: text("description"),
  feature: text("feature"),
  status: text("status").notNull().default("active"),
  lat: real("lat"),
  lng: real("lng"),
});

export const insertDistillerySchema = createInsertSchema(distilleries).omit({ id: true });
export type InsertDistillery = z.infer<typeof insertDistillerySchema>;
export type Distillery = typeof distilleries.$inferSelect;

// --- Distillery name aliases (canonical normalized variants -> distilleryId) ---
// Used by findOrCreateDistilleryByName to avoid duplicate distillery rows when
// importers send punctuation/whitespace/article variants ("The Macallan" vs
// "Macallan", "Caol Ila" vs "Caol-Ila", etc.). The `alias` column stores the
// already-canonicalized form (see shared/distillery-normalizer.ts).
export const distilleryAliases = pgTable("distillery_aliases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  alias: text("alias").notNull(),
  distilleryId: varchar("distillery_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  aliasUnique: uniqueIndex("distillery_aliases_alias_unique").on(t.alias),
}));

export const insertDistilleryAliasSchema = createInsertSchema(distilleryAliases).omit({ id: true, createdAt: true });
export type InsertDistilleryAlias = z.infer<typeof insertDistilleryAliasSchema>;
export type DistilleryAlias = typeof distilleryAliases.$inferSelect;

// --- Bottlers (encyclopedia of independent bottlers) ---
export const bottlers = pgTable("bottlers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  country: text("country").notNull(),
  region: text("region").notNull(),
  founded: integer("founded"),
  description: text("description"),
  specialty: text("specialty"),
  website: text("website"),
  notableReleases: text("notable_releases").array(),
  status: text("status").notNull().default("active"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
});

export const insertBottlerSchema = createInsertSchema(bottlers).omit({ id: true });
export type InsertBottler = z.infer<typeof insertBottlerSchema>;
export type Bottler = typeof bottlers.$inferSelect;

// --- Bottle Splits (Flaschenteilung) ---
export const bottleSplits = pgTable("bottle_splits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hostId: varchar("host_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("draft"), // draft | open | confirmed | distributed | tasting | completed | cancelled
  visibility: text("visibility").notNull().default("public"), // public | private | group
  targetCommunityIds: text("target_community_ids"), // JSON array of community IDs
  tastingId: varchar("tasting_id"), // link to generated tasting session
  deadline: timestamp("deadline"),
  minClaims: integer("min_claims"),
  bottles: jsonb("bottles").notNull().$type<Array<{
    name: string;
    distillery?: string;
    age?: string;
    abv?: number | null;
    region?: string;
    category?: string;
    country?: string;
    caskType?: string;
    peatLevel?: string;
    whiskybaseId?: string;
    bottler?: string;
    ppm?: number | null;
    wbScore?: number | null;
    imageUrl?: string;
    distilledYear?: string;
    bottledYear?: string;
    price?: number | null;
    notes?: string;
    hostSummary?: string;
    flavorProfile?: string;
    totalVolumeMl: number;
    ownerKeepMl: number;
    sampleOptions: Array<{ sizeMl: number; priceEur: number }>;
  }>>(),
  createdAt: timestamp("created_at").defaultNow(),
  confirmedAt: timestamp("confirmed_at"),
  distributedAt: timestamp("distributed_at"),
  cancelledAt: timestamp("cancelled_at"),
});

export const insertBottleSplitSchema = createInsertSchema(bottleSplits).omit({ id: true, createdAt: true, confirmedAt: true, distributedAt: true, cancelledAt: true });
export type InsertBottleSplit = z.infer<typeof insertBottleSplitSchema>;
export type BottleSplit = typeof bottleSplits.$inferSelect;

// --- Bottle Split Claims ---
export const bottleSplitClaims = pgTable("bottle_split_claims", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  splitId: varchar("split_id").notNull(),
  participantId: varchar("participant_id").notNull(),
  bottleIndex: integer("bottle_index").notNull().default(0),
  sizeMl: integer("size_ml").notNull(),
  priceEur: real("price_eur").notNull(),
  status: text("status").notNull().default("claimed"), // claimed | confirmed | paid | shipped | received
  claimedAt: timestamp("claimed_at").defaultNow(),
  confirmedAt: timestamp("confirmed_at"),
});

export const insertBottleSplitClaimSchema = createInsertSchema(bottleSplitClaims).omit({ id: true, claimedAt: true, confirmedAt: true });
export type InsertBottleSplitClaim = z.infer<typeof insertBottleSplitClaimSchema>;
export type BottleSplitClaim = typeof bottleSplitClaims.$inferSelect;

// --- User Activity Sessions (admin tracking) ---
export const userActivitySessions = pgTable("user_activity_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  participantId: varchar("participant_id").notNull(),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at").notNull().defaultNow(),
  durationMinutes: integer("duration_minutes").notNull().default(0),
  durationSeconds: integer("duration_seconds"),
  pageContext: text("page_context"),
  entryPage: text("entry_page"),
  exitPage: text("exit_page"),
  pageCount: integer("page_count").default(0),
});
export type UserActivitySession = typeof userActivitySessions.$inferSelect;

// --- Page Views (granular page tracking) ---
export const pageViews = pgTable("page_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  participantId: varchar("participant_id").notNull(),
  sessionId: varchar("session_id"),
  pagePath: text("page_path").notNull(),
  normalizedPath: text("normalized_path").notNull(),
  referrerPath: text("referrer_path"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  durationSeconds: integer("duration_seconds"),
}, (table) => [
  index("idx_page_views_participant").on(table.participantId),
  index("idx_page_views_session").on(table.sessionId),
  index("idx_page_views_timestamp").on(table.timestamp),
  index("idx_page_views_normalized_path").on(table.normalizedPath),
]);
export type PageView = typeof pageViews.$inferSelect;

// --- Search Logs (tracking search queries) ---
export const searchLogs = pgTable("search_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  participantId: varchar("participant_id").notNull(),
  query: text("query").notNull(),
  resultCount: integer("result_count").notNull().default(0),
  context: text("context"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_search_logs_participant").on(table.participantId),
  index("idx_search_logs_created").on(table.createdAt),
]);
export type SearchLog = typeof searchLogs.$inferSelect;

// --- UTM Visits (acquisition tracking) ---
export const utmVisits = pgTable("utm_visits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  participantId: varchar("participant_id"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  referrer: text("referrer"),
  landingPage: text("landing_page"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_utm_visits_created").on(table.createdAt),
]);
export type UtmVisit = typeof utmVisits.$inferSelect;

// --- Funnel Counters (cookie-free aggregate tracking) ---
export const funnelCounters = pgTable("funnel_counters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bucketHour: timestamp("bucket_hour").notNull(),
  eventName: text("event_name").notNull(),
  pagePath: text("page_path").notNull().default(""),
  utmSource: text("utm_source").notNull().default(""),
  utmMedium: text("utm_medium").notNull().default(""),
  utmCampaign: text("utm_campaign").notNull().default(""),
  country: text("country").notNull().default(""),
  language: text("language").notNull().default(""),
  deviceType: text("device_type").notNull().default(""),
  count: integer("count").notNull().default(0),
}, (table) => [
  index("idx_funnel_counters_bucket").on(table.bucketHour),
  index("idx_funnel_counters_event").on(table.eventName),
  uniqueIndex("uq_funnel_counters_dim").on(
    table.bucketHour, table.eventName, table.pagePath,
    table.utmSource, table.utmMedium, table.utmCampaign,
    table.country, table.language, table.deviceType,
  ),
]);
export type FunnelCounter = typeof funnelCounters.$inferSelect;

export const funnelDimensionBuckets = pgTable("funnel_dimension_buckets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bucketHour: timestamp("bucket_hour").notNull(),
  pagePath: text("page_path").notNull().default(""),
  dimension: text("dimension").notNull(),
  bucketLabel: text("bucket_label").notNull(),
  count: integer("count").notNull().default(0),
}, (table) => [
  index("idx_funnel_dim_bucket").on(table.bucketHour),
  uniqueIndex("uq_funnel_dim_key").on(
    table.bucketHour, table.pagePath, table.dimension, table.bucketLabel,
  ),
]);
export type FunnelDimensionBucket = typeof funnelDimensionBuckets.$inferSelect;

// --- Daily Report Log (idempotency for daily admin emails) ---
export const dailyReportLog = pgTable("daily_report_log", {
  reportDate: text("report_date").primaryKey(),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
});
export type DailyReportLog = typeof dailyReportLog.$inferSelect;

// --- Auto-Handout: Distillery Profiles (encyclopedia cache per distillery) ---
//
// These rows feed the Auto-Handout-Generator. One profile per distillery name
// (lower-cased, whitespace-collapsed). Sources and chapter texts are produced
// once via web research + AI and reused for every future tasting that
// references the same distillery. The host can force a refresh.
export const distilleryProfiles = pgTable("distillery_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nameKey: text("name_key").notNull().unique(),
  displayName: text("display_name").notNull(),
  language: text("language").notNull().default("de"), // de | en
  tone: text("tone").notNull().default("erzaehlerisch"), // sachlich | erzaehlerisch | locker
  lengthPref: text("length_pref").notNull().default("medium"), // compact | medium | long
  chapters: jsonb("chapters").notNull().default(sql`'[]'::jsonb`).$type<AutoHandoutChapter[]>(),
  sources: jsonb("sources").notNull().default(sql`'[]'::jsonb`).$type<AutoHandoutSource[]>(),
  images: jsonb("images").notNull().default(sql`'[]'::jsonb`).$type<AutoHandoutImage[]>(),
  generatedAt: timestamp("generated_at").defaultNow(),
  refreshedAt: timestamp("refreshed_at").defaultNow(),
});
export type DistilleryProfile = typeof distilleryProfiles.$inferSelect;

// --- Auto-Handout: Whisky Profiles (encyclopedia cache per whisky) ---
export const whiskyProfiles = pgTable("whisky_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  whiskyKey: text("whisky_key").notNull().unique(), // wb:<id> or "<distillery>|<name>" (lowercased)
  name: text("name").notNull(),
  distillery: text("distillery"),
  whiskybaseId: text("whiskybase_id"),
  language: text("language").notNull().default("de"),
  tone: text("tone").notNull().default("erzaehlerisch"),
  lengthPref: text("length_pref").notNull().default("medium"),
  chapters: jsonb("chapters").notNull().default(sql`'[]'::jsonb`).$type<AutoHandoutChapter[]>(),
  sources: jsonb("sources").notNull().default(sql`'[]'::jsonb`).$type<AutoHandoutSource[]>(),
  generatedAt: timestamp("generated_at").defaultNow(),
});
export type WhiskyProfile = typeof whiskyProfiles.$inferSelect;

// --- Auto-Handout: per-tasting binding (host customizations + status) ---
export const tastingAutoHandouts = pgTable("tasting_auto_handouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tastingId: varchar("tasting_id").notNull().unique(),
  language: text("language").notNull().default("de"),
  tone: text("tone").notNull().default("erzaehlerisch"),
  lengthPref: text("length_pref").notNull().default("medium"), // compact | medium | long
  visibility: text("visibility").notNull().default("always"), // always | after_first_reveal
  // selection: { distilleries: { [nameKey]: { [chapterId]: { enabled, customContent? } } },
  //              whiskies:    { [whiskyKey]: { [chapterId]: { enabled, customContent? } } } }
  selection: jsonb("selection").notNull().default(sql`'{}'::jsonb`).$type<AutoHandoutSelection>(),
  // selectedImages: array of { subjectKey, url, title, source, license }
  selectedImages: jsonb("selected_images").notNull().default(sql`'[]'::jsonb`).$type<AutoHandoutSelectedImage[]>(),
  // chapterOrder: ordered list of "{kind}:{key}:{chapterId}" identifiers
  chapterOrder: jsonb("chapter_order").notNull().default(sql`'[]'::jsonb`).$type<string[]>(),
  status: text("status").notNull().default("idle"), // idle | generating | ready | error
  progress: integer("progress").notNull().default(0),
  progressTotal: integer("progress_total").notNull().default(0),
  errorMessage: text("error_message"),
  generatedAt: timestamp("generated_at"),
  acknowledgedNotice: boolean("acknowledged_notice").notNull().default(false),
});
export type TastingAutoHandout = typeof tastingAutoHandouts.$inferSelect;

// JSON shapes for the auto-handout system (kept here so client and server share them)
export interface AutoHandoutSource {
  url: string;
  title: string;
  snippet?: string;
  source: "wikipedia" | "whiskybase" | "distillery" | "web" | "forum" | "blog" | "news";
}

export interface AutoHandoutImage {
  url: string;
  title?: string;
  source: string;
  license?: string;
  pageUrl?: string;
}

export interface AutoHandoutChapter {
  id: string;
  type: string; // see CHAPTER_TYPES below
  title: string;
  content: string; // markdown text (may contain inline [n] citation markers)
  sources: number[]; // indices into the parent profile's sources[]
  confidence: "high" | "medium" | "low";
  tone?: string;
  length?: string;
}

export interface AutoHandoutSelectionEntry {
  enabled: boolean;
  customContent?: string;
}

export interface AutoHandoutSelection {
  distilleries?: Record<string, Record<string, AutoHandoutSelectionEntry>>;
  whiskies?: Record<string, Record<string, AutoHandoutSelectionEntry>>;
}

export interface AutoHandoutSelectedImage {
  subjectKind: "distillery" | "whisky";
  subjectKey: string;
  url: string;
  title?: string;
  source: string;
  license?: string;
}

export const AUTO_HANDOUT_CHAPTER_TYPES = {
  distillery: [
    { id: "steckbrief", title: "Steckbrief" },
    { id: "geschichte", title: "Geschichte in 3 Minuten" },
    { id: "stil", title: "Stil & Charakter" },
    { id: "weniger_bekannt", title: "Was man eher nicht weiß" },
    { id: "geheimtipps", title: "Geheimtipps & Insider-Wissen" },
    { id: "stories", title: "Stories & Anekdoten" },
    { id: "aktuelles", title: "Aktuelles" },
    { id: "kontroversen", title: "Kontroversen & Mythen" },
  ],
  whisky: [
    { id: "steckbrief", title: "Steckbrief" },
    { id: "besonderes", title: "Das Besondere an dieser Abfüllung" },
    { id: "sensorik", title: "Sensorik-Erwartung" },
    { id: "sammler", title: "Sammler-Notiz" },
  ],
} as const;
