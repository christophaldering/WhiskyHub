import { eq, ne, and, asc, desc, sql, inArray } from "drizzle-orm";
import { db } from "./db";
import {
  participants, tastings, tastingParticipants, whiskies, ratings,
  profiles, sessionInvites, discussionEntries, reflectionEntries, whiskyFriends, journalEntries, benchmarkEntries, wishlistEntries,
  newsletters, newsletterRecipients, whiskybaseCollection, tastingReminders, reminderLog, encyclopediaSuggestions,
  type InsertParticipant, type Participant,
  type InsertTasting, type Tasting,
  type InsertTastingParticipant, type TastingParticipant,
  type InsertWhisky, type Whisky,
  type InsertRating, type Rating,
  type InsertProfile, type Profile,
  type InsertSessionInvite, type SessionInvite,
  type InsertDiscussionEntry, type DiscussionEntry,
  type InsertReflectionEntry, type ReflectionEntry,
  type InsertWhiskyFriend, type WhiskyFriend,
  type InsertJournalEntry, type JournalEntry,
  type InsertBenchmarkEntry, type BenchmarkEntry,
  type InsertWishlistEntry, type WishlistEntry,
  type InsertNewsletter, type Newsletter,
  type InsertWhiskybaseCollection, type WhiskybaseCollectionItem,
  type InsertTastingReminder, type TastingReminder,
  type InsertEncyclopediaSuggestion, type EncyclopediaSuggestion,
} from "@shared/schema";

export interface WhiskyOfTheDay {
  whisky: Whisky;
  avgRating: number;
  ratingCount: number;
  categories: { nose: number; taste: number; finish: number; balance: number };
}

export interface IStorage {
  // Participants
  getParticipant(id: string): Promise<Participant | undefined>;
  getParticipantByName(name: string): Promise<Participant | undefined>;
  getParticipantByEmail(email: string): Promise<Participant | undefined>;
  createParticipant(data: InsertParticipant): Promise<Participant>;
  updateParticipant(id: string, data: Partial<{name: string; email: string; pin: string; newsletterOptIn: boolean}>): Promise<Participant | undefined>;
  updateParticipantLanguage(id: string, language: string): Promise<Participant | undefined>;
  updateParticipantPin(id: string, pin: string): Promise<Participant | undefined>;
  setVerificationCode(id: string, code: string, expiry: Date): Promise<Participant | undefined>;
  verifyEmail(id: string): Promise<Participant | undefined>;
  updateWhiskyDbAccess(id: string, canAccess: boolean): Promise<Participant | undefined>;

  // Tastings
  getTasting(id: string): Promise<Tasting | undefined>;
  getTastingByCode(code: string): Promise<Tasting | undefined>;
  getAllTastings(): Promise<Tasting[]>;
  createTasting(data: InsertTasting): Promise<Tasting>;
  updateTastingStatus(id: string, status: string, currentAct?: string): Promise<Tasting | undefined>;
  updateTastingReflection(id: string, reflection: string): Promise<Tasting | undefined>;
  updateTastingDetails(id: string, data: Partial<{ title: string; date: string; location: string; blindMode: boolean; reflectionEnabled: boolean; reflectionMode: string; reflectionVisibility: string }>): Promise<Tasting | undefined>;
  duplicateTasting(id: string, hostId: string): Promise<Tasting>;

  // Tasting Participants
  getTastingParticipants(tastingId: string): Promise<(TastingParticipant & { participant: Participant })[]>;
  addParticipantToTasting(data: InsertTastingParticipant): Promise<TastingParticipant>;
  isParticipantInTasting(tastingId: string, participantId: string): Promise<boolean>;

  // Whiskies
  getWhiskiesForTasting(tastingId: string): Promise<Whisky[]>;
  getAllWhiskies(): Promise<Whisky[]>;
  getWhisky(id: string): Promise<Whisky | undefined>;
  createWhisky(data: InsertWhisky): Promise<Whisky>;
  updateWhisky(id: string, data: Partial<InsertWhisky>): Promise<Whisky | undefined>;
  deleteWhisky(id: string): Promise<void>;

  // Ratings
  getRatingsForWhisky(whiskyId: string): Promise<Rating[]>;
  getRatingsForTasting(tastingId: string): Promise<Rating[]>;
  getAllRatings(): Promise<Rating[]>;
  getRatingByParticipantAndWhisky(participantId: string, whiskyId: string): Promise<Rating | undefined>;
  upsertRating(data: InsertRating): Promise<Rating>;

  // Profiles
  getProfile(participantId: string): Promise<Profile | undefined>;
  upsertProfile(data: InsertProfile): Promise<Profile>;

  // Session Invites
  createInvite(data: InsertSessionInvite): Promise<SessionInvite>;
  getInvitesByTasting(tastingId: string): Promise<SessionInvite[]>;
  getInviteByToken(token: string): Promise<SessionInvite | undefined>;
  updateInviteStatus(id: string, status: string, acceptedAt?: Date): Promise<SessionInvite | undefined>;

  // Blind Mode / Reveal
  updateTastingBlindMode(id: string, data: { blindMode?: boolean; revealIndex?: number; revealStep?: number; reflectionEnabled?: boolean; reflectionMode?: string; reflectionVisibility?: string; customPrompts?: string }): Promise<Tasting | undefined>;

  // Discussion Entries
  getDiscussionEntries(tastingId: string): Promise<DiscussionEntry[]>;
  createDiscussionEntry(data: InsertDiscussionEntry): Promise<DiscussionEntry>;

  // Reflection Entries
  getReflectionEntries(tastingId: string): Promise<ReflectionEntry[]>;
  createReflectionEntry(data: InsertReflectionEntry): Promise<ReflectionEntry>;
  getReflectionsByParticipant(tastingId: string, participantId: string): Promise<ReflectionEntry[]>;

  // Whisky Friends
  getWhiskyFriends(participantId: string): Promise<WhiskyFriend[]>;
  getPendingFriendRequests(participantId: string): Promise<WhiskyFriend[]>;
  getWhiskyFriendsByEmail(email: string): Promise<WhiskyFriend[]>;
  createWhiskyFriend(data: InsertWhiskyFriend): Promise<WhiskyFriend>;
  acceptFriendRequest(id: string, participantId: string): Promise<WhiskyFriend | undefined>;
  declineFriendRequest(id: string, participantId: string): Promise<void>;
  deleteWhiskyFriend(id: string, participantId: string): Promise<void>;
  updateWhiskyFriend(id: string, participantId: string, data: { firstName: string; lastName: string; email: string }): Promise<WhiskyFriend | undefined>;

  // Rating Notes
  getRatingNotes(participantId: string): Promise<Array<{ id: string; notes: string | null }>>;

  // Journal Entries
  getAllJournalEntries(): Promise<JournalEntry[]>;
  getJournalEntries(participantId: string): Promise<JournalEntry[]>;
  getJournalEntry(id: string, participantId: string): Promise<JournalEntry | undefined>;
  createJournalEntry(data: InsertJournalEntry): Promise<JournalEntry>;
  updateJournalEntry(id: string, participantId: string, data: Partial<InsertJournalEntry>): Promise<JournalEntry | undefined>;
  deleteJournalEntry(id: string, participantId: string): Promise<void>;

  // Participant Stats (for badges)
  getParticipantStats(participantId: string): Promise<{
    totalRatings: number;
    totalTastings: number;
    totalJournalEntries: number;
    ratedRegions: Record<string, number>;
    ratedCaskTypes: Record<string, number>;
    ratedPeatLevels: Record<string, number>;
    highestOverall: number;
  }>;

  // Flavor Profile (aggregated ratings with whisky metadata)
  getFlavorProfile(participantId: string): Promise<{
    avgScores: { nose: number; taste: number; finish: number; balance: number; overall: number };
    regionBreakdown: Record<string, { count: number; avgScore: number }>;
    caskBreakdown: Record<string, { count: number; avgScore: number }>;
    peatBreakdown: Record<string, { count: number; avgScore: number }>;
    categoryBreakdown: Record<string, { count: number; avgScore: number }>;
    ratedWhiskies: Array<{
      whisky: Whisky;
      rating: Rating;
    }>;
    allWhiskies: Whisky[];
    sources: { tastingRatings: number; journalEntries: number };
  }>;

  // Hard Delete (admin only)
  hardDeleteTasting(id: string): Promise<void>;

  // Global Averages
  getGlobalAverages(): Promise<{ nose: number; taste: number; finish: number; balance: number; overall: number; totalRatings: number; totalParticipants: number }>;

  // Admin
  getAllParticipants(): Promise<Participant[]>;
  updateParticipantRole(id: string, role: string): Promise<Participant | undefined>;
  deleteParticipant(id: string): Promise<void>;

  // Benchmark Entries
  getBenchmarkEntries(): Promise<BenchmarkEntry[]>;
  createBenchmarkEntry(data: InsertBenchmarkEntry): Promise<BenchmarkEntry>;
  createBenchmarkEntries(data: InsertBenchmarkEntry[]): Promise<BenchmarkEntry[]>;
  deleteBenchmarkEntry(id: string): Promise<void>;

  // Wishlist Entries
  getWishlistEntries(participantId: string): Promise<WishlistEntry[]>;
  createWishlistEntry(data: InsertWishlistEntry): Promise<WishlistEntry>;
  updateWishlistEntry(id: string, participantId: string, data: Partial<InsertWishlistEntry>): Promise<WishlistEntry | undefined>;
  deleteWishlistEntry(id: string, participantId: string): Promise<void>;

  // Newsletters
  getNewsletters(): Promise<Newsletter[]>;
  getNewsletter(id: string): Promise<Newsletter | undefined>;
  createNewsletter(data: InsertNewsletter): Promise<Newsletter>;
  addNewsletterRecipients(newsletterId: string, recipients: { participantId: string; email: string }[]): Promise<void>;
  getNewsletterRecipients(newsletterId: string): Promise<{ participantId: string; email: string; sentAt: Date | null }[]>;

  // Tasting Reminders
  getRemindersForParticipant(participantId: string): Promise<TastingReminder[]>;
  setReminder(data: InsertTastingReminder): Promise<TastingReminder>;
  deleteReminder(id: string, participantId: string): Promise<void>;
  deleteRemindersForTasting(tastingId: string, participantId: string): Promise<void>;
  getUpcomingRemindersToSend(): Promise<{ reminder: TastingReminder; tasting: any; participant: any }[]>;
  logReminderSent(participantId: string, tastingId: string, offsetMinutes: number): Promise<void>;
  hasReminderBeenSent(participantId: string, tastingId: string, offsetMinutes: number): Promise<boolean>;

  // Whiskybase Collection
  getWhiskybaseCollection(participantId: string): Promise<WhiskybaseCollectionItem[]>;
  upsertWhiskybaseCollectionItem(data: InsertWhiskybaseCollection): Promise<WhiskybaseCollectionItem>;
  deleteWhiskybaseCollectionItem(id: string, participantId: string): Promise<void>;
  deleteWhiskybaseCollection(participantId: string): Promise<void>;

  // Encyclopedia Suggestions
  getEncyclopediaSuggestions(status?: string): Promise<EncyclopediaSuggestion[]>;
  createEncyclopediaSuggestion(data: InsertEncyclopediaSuggestion): Promise<EncyclopediaSuggestion>;
  updateSuggestionStatus(id: string, status: string, adminNote?: string): Promise<EncyclopediaSuggestion>;
}

export class DatabaseStorage implements IStorage {
  // --- Participants ---
  async getParticipant(id: string): Promise<Participant | undefined> {
    const [result] = await db.select().from(participants).where(eq(participants.id, id));
    return result;
  }

  async getParticipantByName(name: string): Promise<Participant | undefined> {
    const [result] = await db.select().from(participants).where(eq(participants.name, name));
    return result;
  }

  async getParticipantByEmail(email: string): Promise<Participant | undefined> {
    const [result] = await db.select().from(participants).where(sql`lower(${participants.email}) = ${email.toLowerCase()}`);
    return result;
  }

  async createParticipant(data: InsertParticipant): Promise<Participant> {
    const [result] = await db.insert(participants).values(data).returning();
    return result;
  }

  async updateParticipant(id: string, data: Partial<{name: string; email: string; pin: string; newsletterOptIn: boolean}>): Promise<Participant | undefined> {
    const [result] = await db.update(participants).set(data).where(eq(participants.id, id)).returning();
    return result;
  }

  async updateParticipantLanguage(id: string, language: string): Promise<Participant | undefined> {
    const [result] = await db.update(participants).set({ language }).where(eq(participants.id, id)).returning();
    return result;
  }

  async updateParticipantPin(id: string, pin: string): Promise<Participant | undefined> {
    const [result] = await db.update(participants).set({ pin }).where(eq(participants.id, id)).returning();
    return result;
  }

  async setVerificationCode(id: string, code: string, expiry: Date): Promise<Participant | undefined> {
    const [result] = await db.update(participants).set({ verificationCode: code, verificationExpiry: expiry }).where(eq(participants.id, id)).returning();
    return result;
  }

  async verifyEmail(id: string): Promise<Participant | undefined> {
    const [result] = await db.update(participants).set({ emailVerified: true, verificationCode: null, verificationExpiry: null }).where(eq(participants.id, id)).returning();
    return result;
  }

  // --- Tastings ---
  async getTasting(id: string): Promise<Tasting | undefined> {
    const [result] = await db.select().from(tastings).where(eq(tastings.id, id));
    return result;
  }

  async getTastingByCode(code: string): Promise<Tasting | undefined> {
    const [result] = await db.select().from(tastings).where(eq(tastings.code, code));
    return result;
  }

  async getAllTastings(): Promise<Tasting[]> {
    return db.select().from(tastings).where(ne(tastings.status, "deleted"));
  }

  async createTasting(data: InsertTasting): Promise<Tasting> {
    const [result] = await db.insert(tastings).values(data).returning();
    return result;
  }

  async updateTastingStatus(id: string, status: string, currentAct?: string): Promise<Tasting | undefined> {
    const updateData: any = { status };
    if (currentAct) updateData.currentAct = currentAct;
    const [result] = await db.update(tastings).set(updateData).where(eq(tastings.id, id)).returning();
    return result;
  }

  async updateTastingReflection(id: string, reflection: string): Promise<Tasting | undefined> {
    const [result] = await db.update(tastings).set({ hostReflection: reflection }).where(eq(tastings.id, id)).returning();
    return result;
  }

  async updateTastingDetails(id: string, data: Partial<{ title: string; date: string; location: string; blindMode: boolean; reflectionEnabled: boolean; reflectionMode: string; reflectionVisibility: string }>): Promise<Tasting | undefined> {
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.date !== undefined) updateData.date = data.date;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.blindMode !== undefined) updateData.blindMode = data.blindMode;
    if (data.reflectionEnabled !== undefined) updateData.reflectionEnabled = data.reflectionEnabled;
    if (data.reflectionMode !== undefined) updateData.reflectionMode = data.reflectionMode;
    if (data.reflectionVisibility !== undefined) updateData.reflectionVisibility = data.reflectionVisibility;
    if (Object.keys(updateData).length === 0) return this.getTasting(id);
    const [result] = await db.update(tastings).set(updateData).where(eq(tastings.id, id)).returning();
    return result;
  }

  async duplicateTasting(sourceId: string, hostId: string): Promise<Tasting> {
    const source = await this.getTasting(sourceId);
    if (!source) throw new Error("Source tasting not found");
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const today = new Date().toISOString().split("T")[0];
    const [newTasting] = await db.insert(tastings).values({
      title: `${source.title} (Copy)`,
      date: today,
      location: source.location,
      hostId,
      code,
      status: "draft",
      blindMode: source.blindMode,
      reflectionEnabled: source.reflectionEnabled,
      reflectionMode: source.reflectionMode,
      reflectionVisibility: source.reflectionVisibility,
    }).returning();
    const sourceWhiskies = await this.getWhiskiesForTasting(sourceId);
    for (const w of sourceWhiskies) {
      await db.insert(whiskies).values({
        tastingId: newTasting.id,
        name: w.name,
        distillery: w.distillery,
        age: w.age,
        abv: w.abv,
        type: w.type,
        notes: w.notes,
        sortOrder: w.sortOrder,
        category: w.category,
        region: w.region,
        abvBand: w.abvBand,
        ageBand: w.ageBand,
        caskInfluence: w.caskInfluence,
        peatLevel: w.peatLevel,
        ppm: w.ppm,
        whiskybaseId: w.whiskybaseId,
        imageUrl: w.imageUrl,
      });
    }
    return newTasting;
  }

  // --- Tasting Participants ---
  async getTastingParticipants(tastingId: string): Promise<(TastingParticipant & { participant: Participant })[]> {
    const results = await db
      .select()
      .from(tastingParticipants)
      .innerJoin(participants, eq(tastingParticipants.participantId, participants.id))
      .where(eq(tastingParticipants.tastingId, tastingId));

    return results.map(r => ({
      ...r.tasting_participants,
      participant: r.participants,
    }));
  }

  async addParticipantToTasting(data: InsertTastingParticipant): Promise<TastingParticipant> {
    const [result] = await db.insert(tastingParticipants).values(data).returning();
    return result;
  }

  async isParticipantInTasting(tastingId: string, participantId: string): Promise<boolean> {
    const [result] = await db
      .select()
      .from(tastingParticipants)
      .where(and(eq(tastingParticipants.tastingId, tastingId), eq(tastingParticipants.participantId, participantId)));
    return !!result;
  }

  // --- Whiskies ---
  async getWhiskiesForTasting(tastingId: string): Promise<Whisky[]> {
    return db.select().from(whiskies).where(eq(whiskies.tastingId, tastingId)).orderBy(asc(whiskies.sortOrder));
  }

  async getAllWhiskies(): Promise<Whisky[]> {
    return db.select().from(whiskies);
  }

  async getWhisky(id: string): Promise<Whisky | undefined> {
    const [result] = await db.select().from(whiskies).where(eq(whiskies.id, id));
    return result;
  }

  async createWhisky(data: InsertWhisky): Promise<Whisky> {
    const [result] = await db.insert(whiskies).values(data).returning();
    return result;
  }

  async updateWhisky(id: string, data: Partial<InsertWhisky>): Promise<Whisky | undefined> {
    const [result] = await db.update(whiskies).set(data).where(eq(whiskies.id, id)).returning();
    return result;
  }

  async deleteWhisky(id: string): Promise<void> {
    await db.delete(ratings).where(eq(ratings.whiskyId, id));
    await db.delete(whiskies).where(eq(whiskies.id, id));
  }

  // --- Ratings ---
  async getRatingsForWhisky(whiskyId: string): Promise<Rating[]> {
    return db.select().from(ratings).where(eq(ratings.whiskyId, whiskyId));
  }

  async getRatingsForTasting(tastingId: string): Promise<Rating[]> {
    return db.select().from(ratings).where(eq(ratings.tastingId, tastingId));
  }

  async getAllRatings(): Promise<Rating[]> {
    return db.select().from(ratings);
  }

  async getRatingByParticipantAndWhisky(participantId: string, whiskyId: string): Promise<Rating | undefined> {
    const [result] = await db
      .select()
      .from(ratings)
      .where(and(eq(ratings.participantId, participantId), eq(ratings.whiskyId, whiskyId)));
    return result;
  }

  async upsertRating(data: InsertRating): Promise<Rating> {
    const existing = await this.getRatingByParticipantAndWhisky(data.participantId, data.whiskyId);
    if (existing) {
      const [result] = await db
        .update(ratings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(ratings.id, existing.id))
        .returning();
      return result;
    }
    const [result] = await db.insert(ratings).values(data).returning();
    return result;
  }

  // --- Profiles ---
  async getProfile(participantId: string): Promise<Profile | undefined> {
    const [result] = await db.select().from(profiles).where(eq(profiles.participantId, participantId));
    return result;
  }

  async upsertProfile(data: InsertProfile): Promise<Profile> {
    const existing = await this.getProfile(data.participantId);
    if (existing) {
      const [result] = await db
        .update(profiles)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(profiles.id, existing.id))
        .returning();
      return result;
    }
    const [result] = await db.insert(profiles).values(data).returning();
    return result;
  }

  // --- Session Invites ---
  async createInvite(data: InsertSessionInvite): Promise<SessionInvite> {
    const [result] = await db.insert(sessionInvites).values(data).returning();
    return result;
  }

  async getInvitesByTasting(tastingId: string): Promise<SessionInvite[]> {
    return db.select().from(sessionInvites).where(eq(sessionInvites.tastingId, tastingId));
  }

  async getInviteByToken(token: string): Promise<SessionInvite | undefined> {
    const [result] = await db.select().from(sessionInvites).where(eq(sessionInvites.token, token));
    return result;
  }

  async updateInviteStatus(id: string, status: string, acceptedAt?: Date): Promise<SessionInvite | undefined> {
    const updateData: any = { status };
    if (acceptedAt) updateData.acceptedAt = acceptedAt;
    const [result] = await db.update(sessionInvites).set(updateData).where(eq(sessionInvites.id, id)).returning();
    return result;
  }

  // --- Blind Mode / Reveal ---
  async updateTastingBlindMode(id: string, data: { blindMode?: boolean; revealIndex?: number; revealStep?: number; reflectionEnabled?: boolean; reflectionMode?: string; reflectionVisibility?: string; customPrompts?: string }): Promise<Tasting | undefined> {
    const updateObj: any = {};
    if (data.blindMode !== undefined) updateObj.blindMode = data.blindMode;
    if (data.revealIndex !== undefined) updateObj.revealIndex = data.revealIndex;
    if (data.revealStep !== undefined) updateObj.revealStep = data.revealStep;
    if (data.reflectionEnabled !== undefined) updateObj.reflectionEnabled = data.reflectionEnabled;
    if (data.reflectionMode !== undefined) updateObj.reflectionMode = data.reflectionMode;
    if (data.reflectionVisibility !== undefined) updateObj.reflectionVisibility = data.reflectionVisibility;
    if (data.customPrompts !== undefined) updateObj.customPrompts = data.customPrompts;
    const [result] = await db.update(tastings).set(updateObj).where(eq(tastings.id, id)).returning();
    return result;
  }

  // --- Discussion Entries ---
  async getDiscussionEntries(tastingId: string): Promise<DiscussionEntry[]> {
    return db.select().from(discussionEntries).where(eq(discussionEntries.tastingId, tastingId)).orderBy(asc(discussionEntries.createdAt));
  }

  async createDiscussionEntry(data: InsertDiscussionEntry): Promise<DiscussionEntry> {
    const [result] = await db.insert(discussionEntries).values(data).returning();
    return result;
  }

  // --- Reflection Entries ---
  async getReflectionEntries(tastingId: string): Promise<ReflectionEntry[]> {
    return db.select().from(reflectionEntries).where(eq(reflectionEntries.tastingId, tastingId)).orderBy(asc(reflectionEntries.createdAt));
  }

  async createReflectionEntry(data: InsertReflectionEntry): Promise<ReflectionEntry> {
    const [result] = await db.insert(reflectionEntries).values(data).returning();
    return result;
  }

  async getReflectionsByParticipant(tastingId: string, participantId: string): Promise<ReflectionEntry[]> {
    return db.select().from(reflectionEntries).where(and(eq(reflectionEntries.tastingId, tastingId), eq(reflectionEntries.participantId, participantId))).orderBy(asc(reflectionEntries.createdAt));
  }

  // --- Whisky Friends ---
  async getWhiskyFriends(participantId: string): Promise<WhiskyFriend[]> {
    return db.select().from(whiskyFriends).where(and(eq(whiskyFriends.participantId, participantId), eq(whiskyFriends.status, "accepted"))).orderBy(asc(whiskyFriends.lastName), asc(whiskyFriends.firstName));
  }

  async getPendingFriendRequests(participantId: string): Promise<WhiskyFriend[]> {
    return db.select().from(whiskyFriends).where(and(eq(whiskyFriends.participantId, participantId), eq(whiskyFriends.status, "pending"))).orderBy(asc(whiskyFriends.createdAt));
  }

  async getWhiskyFriendsByEmail(email: string): Promise<WhiskyFriend[]> {
    return db.select().from(whiskyFriends).where(sql`lower(${whiskyFriends.email}) = ${email.toLowerCase()}`);
  }

  async createWhiskyFriend(data: InsertWhiskyFriend): Promise<WhiskyFriend> {
    const [result] = await db.insert(whiskyFriends).values(data).returning();
    return result;
  }

  async acceptFriendRequest(id: string, participantId: string): Promise<WhiskyFriend | undefined> {
    const [result] = await db.update(whiskyFriends).set({ status: "accepted" }).where(and(eq(whiskyFriends.id, id), eq(whiskyFriends.participantId, participantId), eq(whiskyFriends.status, "pending"))).returning();
    return result;
  }

  async declineFriendRequest(id: string, participantId: string): Promise<void> {
    await db.delete(whiskyFriends).where(and(eq(whiskyFriends.id, id), eq(whiskyFriends.participantId, participantId), eq(whiskyFriends.status, "pending")));
  }

  async deleteWhiskyFriend(id: string, participantId: string): Promise<void> {
    await db.delete(whiskyFriends).where(and(eq(whiskyFriends.id, id), eq(whiskyFriends.participantId, participantId)));
  }

  async updateWhiskyFriend(id: string, participantId: string, data: { firstName: string; lastName: string; email: string }): Promise<WhiskyFriend | undefined> {
    const [result] = await db.update(whiskyFriends).set(data).where(and(eq(whiskyFriends.id, id), eq(whiskyFriends.participantId, participantId))).returning();
    return result;
  }

  // --- Rating Notes ---
  async getRatingNotes(participantId: string): Promise<Array<{ id: string; notes: string | null }>> {
    return db.select({ id: ratings.id, notes: ratings.notes }).from(ratings).where(eq(ratings.participantId, participantId));
  }

  // --- Journal Entries ---
  async getAllJournalEntries(): Promise<JournalEntry[]> {
    return db.select().from(journalEntries).orderBy(desc(journalEntries.createdAt));
  }

  async getJournalEntries(participantId: string): Promise<JournalEntry[]> {
    return db.select().from(journalEntries).where(eq(journalEntries.participantId, participantId)).orderBy(asc(journalEntries.createdAt));
  }

  async getJournalEntry(id: string, participantId: string): Promise<JournalEntry | undefined> {
    const [result] = await db.select().from(journalEntries).where(and(eq(journalEntries.id, id), eq(journalEntries.participantId, participantId)));
    return result;
  }

  async createJournalEntry(data: InsertJournalEntry): Promise<JournalEntry> {
    const [result] = await db.insert(journalEntries).values(data).returning();
    return result;
  }

  async updateJournalEntry(id: string, participantId: string, data: Partial<InsertJournalEntry>): Promise<JournalEntry | undefined> {
    const [result] = await db.update(journalEntries).set({ ...data, updatedAt: new Date() }).where(and(eq(journalEntries.id, id), eq(journalEntries.participantId, participantId))).returning();
    return result;
  }

  async deleteJournalEntry(id: string, participantId: string): Promise<void> {
    await db.delete(journalEntries).where(and(eq(journalEntries.id, id), eq(journalEntries.participantId, participantId)));
  }

  async getParticipantStats(participantId: string): Promise<{
    totalRatings: number;
    totalTastings: number;
    totalJournalEntries: number;
    ratedRegions: Record<string, number>;
    ratedCaskTypes: Record<string, number>;
    ratedPeatLevels: Record<string, number>;
    highestOverall: number;
  }> {
    const allRatings = await db.select().from(ratings).where(eq(ratings.participantId, participantId));

    const whiskyIds = Array.from(new Set(allRatings.map(r => r.whiskyId)));
    const allWhiskies = whiskyIds.length > 0
      ? await db.select().from(whiskies).where(inArray(whiskies.id, whiskyIds))
      : [];
    const whiskyMap = new Map(allWhiskies.map(w => [w.id, w]));

    const participations = await db.select().from(tastingParticipants).where(eq(tastingParticipants.participantId, participantId));
    const totalTastings = participations.length;

    const journalCount = await db.select({ count: sql<number>`count(*)::int` }).from(journalEntries).where(eq(journalEntries.participantId, participantId));

    const ratedRegions: Record<string, number> = {};
    const ratedCaskTypes: Record<string, number> = {};
    const ratedPeatLevels: Record<string, number> = {};
    let highestOverall = 0;

    for (const rating of allRatings) {
      if (rating.overall > highestOverall) highestOverall = rating.overall;
      const w = whiskyMap.get(rating.whiskyId);
      if (w) {
        if (w.region) ratedRegions[w.region] = (ratedRegions[w.region] || 0) + 1;
        if (w.caskInfluence) ratedCaskTypes[w.caskInfluence] = (ratedCaskTypes[w.caskInfluence] || 0) + 1;
        if (w.peatLevel) ratedPeatLevels[w.peatLevel] = (ratedPeatLevels[w.peatLevel] || 0) + 1;
      }
    }

    return {
      totalRatings: allRatings.length,
      totalTastings,
      totalJournalEntries: journalCount[0]?.count || 0,
      ratedRegions,
      ratedCaskTypes,
      ratedPeatLevels,
      highestOverall,
    };
  }

  async getFlavorProfile(participantId: string): Promise<{
    avgScores: { nose: number; taste: number; finish: number; balance: number; overall: number };
    regionBreakdown: Record<string, { count: number; avgScore: number }>;
    caskBreakdown: Record<string, { count: number; avgScore: number }>;
    peatBreakdown: Record<string, { count: number; avgScore: number }>;
    categoryBreakdown: Record<string, { count: number; avgScore: number }>;
    ratedWhiskies: Array<{ whisky: typeof whiskies.$inferSelect; rating: typeof ratings.$inferSelect }>;
    allWhiskies: Array<typeof whiskies.$inferSelect>;
    sources: { tastingRatings: number; journalEntries: number };
  }> {
    const allRatings = await db.select().from(ratings).where(eq(ratings.participantId, participantId));
    const whiskyIds = Array.from(new Set(allRatings.map(r => r.whiskyId)));
    const ratedWhiskyRows = whiskyIds.length > 0
      ? await db.select().from(whiskies).where(inArray(whiskies.id, whiskyIds))
      : [];
    const whiskyMap = new Map(ratedWhiskyRows.map(w => [w.id, w]));

    let sumNose = 0, sumTaste = 0, sumFinish = 0, sumBalance = 0, sumOverall = 0;
    const regionAcc: Record<string, { total: number; count: number }> = {};
    const caskAcc: Record<string, { total: number; count: number }> = {};
    const peatAcc: Record<string, { total: number; count: number }> = {};
    const categoryAcc: Record<string, { total: number; count: number }> = {};

    for (const r of allRatings) {
      sumNose += r.nose; sumTaste += r.taste; sumFinish += r.finish;
      sumBalance += r.balance; sumOverall += r.overall;
      const w = whiskyMap.get(r.whiskyId);
      if (w) {
        if (w.region) {
          if (!regionAcc[w.region]) regionAcc[w.region] = { total: 0, count: 0 };
          regionAcc[w.region].total += r.overall; regionAcc[w.region].count++;
        }
        if (w.caskInfluence) {
          if (!caskAcc[w.caskInfluence]) caskAcc[w.caskInfluence] = { total: 0, count: 0 };
          caskAcc[w.caskInfluence].total += r.overall; caskAcc[w.caskInfluence].count++;
        }
        if (w.peatLevel) {
          if (!peatAcc[w.peatLevel]) peatAcc[w.peatLevel] = { total: 0, count: 0 };
          peatAcc[w.peatLevel].total += r.overall; peatAcc[w.peatLevel].count++;
        }
        if (w.category) {
          if (!categoryAcc[w.category]) categoryAcc[w.category] = { total: 0, count: 0 };
          categoryAcc[w.category].total += r.overall; categoryAcc[w.category].count++;
        }
      }
    }

    const journal = await db.select().from(journalEntries).where(eq(journalEntries.participantId, participantId));
    let journalScoreCount = 0;

    for (const j of journal) {
      const score = j.personalScore;
      if (score != null && score > 0) {
        sumOverall += score;
        journalScoreCount++;

        if (j.region) {
          if (!regionAcc[j.region]) regionAcc[j.region] = { total: 0, count: 0 };
          regionAcc[j.region].total += score; regionAcc[j.region].count++;
        }
        if (j.caskType) {
          if (!caskAcc[j.caskType]) caskAcc[j.caskType] = { total: 0, count: 0 };
          caskAcc[j.caskType].total += score; caskAcc[j.caskType].count++;
        }
      }
    }

    const ratingCount = allRatings.length;
    const totalOverallCount = ratingCount + journalScoreCount;
    const n = ratingCount || 1;
    const nOverall = totalOverallCount || 1;

    const toBreakdown = (acc: Record<string, { total: number; count: number }>) => {
      const result: Record<string, { count: number; avgScore: number }> = {};
      for (const [k, v] of Object.entries(acc)) {
        result[k] = { count: v.count, avgScore: Math.round((v.total / v.count) * 10) / 10 };
      }
      return result;
    };

    const allWhiskyRows = await db.select().from(whiskies);

    const ratedWhiskiesResult = allRatings.map(r => {
      const w = whiskyMap.get(r.whiskyId);
      return w ? { whisky: w, rating: r } : null;
    }).filter(Boolean) as Array<{ whisky: typeof whiskies.$inferSelect; rating: typeof ratings.$inferSelect }>;

    return {
      avgScores: {
        nose: Math.round((sumNose / n) * 10) / 10,
        taste: Math.round((sumTaste / n) * 10) / 10,
        finish: Math.round((sumFinish / n) * 10) / 10,
        balance: Math.round((sumBalance / n) * 10) / 10,
        overall: Math.round((sumOverall / nOverall) * 10) / 10,
      },
      regionBreakdown: toBreakdown(regionAcc),
      caskBreakdown: toBreakdown(caskAcc),
      peatBreakdown: toBreakdown(peatAcc),
      categoryBreakdown: toBreakdown(categoryAcc),
      ratedWhiskies: ratedWhiskiesResult,
      allWhiskies: allWhiskyRows,
      sources: { tastingRatings: ratingCount, journalEntries: journalScoreCount },
    };
  }

  async hardDeleteTasting(id: string): Promise<void> {
    await db.delete(ratings).where(eq(ratings.tastingId, id));
    await db.delete(discussionEntries).where(eq(discussionEntries.tastingId, id));
    await db.delete(reflectionEntries).where(eq(reflectionEntries.tastingId, id));
    await db.delete(sessionInvites).where(eq(sessionInvites.tastingId, id));
    await db.delete(whiskies).where(eq(whiskies.tastingId, id));
    await db.delete(tastingParticipants).where(eq(tastingParticipants.tastingId, id));
    await db.delete(tastings).where(eq(tastings.id, id));
  }

  async getGlobalAverages(): Promise<{ nose: number; taste: number; finish: number; balance: number; overall: number; totalRatings: number; totalParticipants: number }> {
    const allRatings = await db.select().from(ratings);
    if (allRatings.length === 0) {
      return { nose: 0, taste: 0, finish: 0, balance: 0, overall: 0, totalRatings: 0, totalParticipants: 0 };
    }
    let sumNose = 0, sumTaste = 0, sumFinish = 0, sumBalance = 0, sumOverall = 0;
    const participantIds: string[] = [];
    for (const r of allRatings) {
      sumNose += r.nose; sumTaste += r.taste; sumFinish += r.finish;
      sumBalance += r.balance; sumOverall += r.overall;
      if (!participantIds.includes(r.participantId)) participantIds.push(r.participantId);
    }
    const n = allRatings.length;
    return {
      nose: Math.round((sumNose / n) * 10) / 10,
      taste: Math.round((sumTaste / n) * 10) / 10,
      finish: Math.round((sumFinish / n) * 10) / 10,
      balance: Math.round((sumBalance / n) * 10) / 10,
      overall: Math.round((sumOverall / n) * 10) / 10,
      totalRatings: n,
      totalParticipants: participantIds.length,
    };
  }

  async getAllParticipants(): Promise<Participant[]> {
    return db.select().from(participants).orderBy(participants.createdAt);
  }

  async updateParticipantRole(id: string, role: string): Promise<Participant | undefined> {
    const [result] = await db.update(participants).set({ role }).where(eq(participants.id, id)).returning();
    return result;
  }

  async updateWhiskyDbAccess(id: string, canAccess: boolean): Promise<Participant | undefined> {
    const [result] = await db.update(participants).set({ canAccessWhiskyDb: canAccess }).where(eq(participants.id, id)).returning();
    return result;
  }

  async deleteParticipant(id: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(ratings).where(eq(ratings.participantId, id));
      await tx.delete(journalEntries).where(eq(journalEntries.participantId, id));
      await tx.delete(discussionEntries).where(eq(discussionEntries.participantId, id));
      await tx.delete(reflectionEntries).where(eq(reflectionEntries.participantId, id));
      await tx.delete(tastingParticipants).where(eq(tastingParticipants.participantId, id));
      await tx.delete(whiskyFriends).where(eq(whiskyFriends.participantId, id));
      await tx.delete(wishlistEntries).where(eq(wishlistEntries.participantId, id));
      await tx.delete(profiles).where(eq(profiles.participantId, id));
      await tx.delete(participants).where(eq(participants.id, id));
    });
  }
  // --- Benchmark Entries ---
  async getBenchmarkEntries(): Promise<BenchmarkEntry[]> {
    return db.select().from(benchmarkEntries).orderBy(desc(benchmarkEntries.createdAt));
  }

  async createBenchmarkEntry(data: InsertBenchmarkEntry): Promise<BenchmarkEntry> {
    const [result] = await db.insert(benchmarkEntries).values(data).returning();
    return result;
  }

  async createBenchmarkEntries(data: InsertBenchmarkEntry[]): Promise<BenchmarkEntry[]> {
    if (data.length === 0) return [];
    const results = await db.insert(benchmarkEntries).values(data).returning();
    return results;
  }

  async deleteBenchmarkEntry(id: string): Promise<void> {
    await db.delete(benchmarkEntries).where(eq(benchmarkEntries.id, id));
  }

  // --- Wishlist Entries ---
  async getWishlistEntries(participantId: string): Promise<WishlistEntry[]> {
    return db.select().from(wishlistEntries)
      .where(eq(wishlistEntries.participantId, participantId))
      .orderBy(desc(wishlistEntries.createdAt));
  }

  async createWishlistEntry(data: InsertWishlistEntry): Promise<WishlistEntry> {
    const [result] = await db.insert(wishlistEntries).values(data).returning();
    return result;
  }

  async updateWishlistEntry(id: string, participantId: string, data: Partial<InsertWishlistEntry>): Promise<WishlistEntry | undefined> {
    const { participantId: _, ...updateData } = data as any;
    const [result] = await db.update(wishlistEntries).set(updateData)
      .where(and(eq(wishlistEntries.id, id), eq(wishlistEntries.participantId, participantId)))
      .returning();
    return result;
  }

  async deleteWishlistEntry(id: string, participantId: string): Promise<void> {
    await db.delete(wishlistEntries)
      .where(and(eq(wishlistEntries.id, id), eq(wishlistEntries.participantId, participantId)));
  }

  // --- Newsletters ---
  async getNewsletters(): Promise<Newsletter[]> {
    return db.select().from(newsletters).orderBy(desc(newsletters.createdAt));
  }

  async getNewsletter(id: string): Promise<Newsletter | undefined> {
    const [result] = await db.select().from(newsletters).where(eq(newsletters.id, id));
    return result;
  }

  async createNewsletter(data: InsertNewsletter): Promise<Newsletter> {
    const [result] = await db.insert(newsletters).values(data).returning();
    return result;
  }

  async addNewsletterRecipients(newsletterId: string, recipients: { participantId: string; email: string }[]): Promise<void> {
    if (recipients.length === 0) return;
    await db.insert(newsletterRecipients).values(
      recipients.map(r => ({ newsletterId, participantId: r.participantId, email: r.email }))
    );
  }

  async getNewsletterRecipients(newsletterId: string): Promise<{ participantId: string; email: string; sentAt: Date | null }[]> {
    return db.select({
      participantId: newsletterRecipients.participantId,
      email: newsletterRecipients.email,
      sentAt: newsletterRecipients.sentAt,
    }).from(newsletterRecipients).where(eq(newsletterRecipients.newsletterId, newsletterId));
  }
  // --- Whiskybase Collection ---
  async getWhiskybaseCollection(participantId: string): Promise<WhiskybaseCollectionItem[]> {
    return await db.select().from(whiskybaseCollection).where(eq(whiskybaseCollection.participantId, participantId)).orderBy(whiskybaseCollection.brand, whiskybaseCollection.name);
  }

  async upsertWhiskybaseCollectionItem(data: InsertWhiskybaseCollection): Promise<WhiskybaseCollectionItem> {
    const [existing] = await db.select().from(whiskybaseCollection)
      .where(and(
        eq(whiskybaseCollection.participantId, data.participantId),
        eq(whiskybaseCollection.whiskybaseId, data.whiskybaseId)
      ));
    
    if (existing) {
      const [updated] = await db.update(whiskybaseCollection)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(whiskybaseCollection.id, existing.id))
        .returning();
      return updated;
    }
    
    const [created] = await db.insert(whiskybaseCollection).values(data).returning();
    return created;
  }

  async deleteWhiskybaseCollectionItem(id: string, participantId: string): Promise<void> {
    await db.delete(whiskybaseCollection).where(and(
      eq(whiskybaseCollection.id, id),
      eq(whiskybaseCollection.participantId, participantId)
    ));
  }

  async deleteWhiskybaseCollection(participantId: string): Promise<void> {
    await db.delete(whiskybaseCollection).where(eq(whiskybaseCollection.participantId, participantId));
  }

  // --- Tasting Reminders ---

  async getRemindersForParticipant(participantId: string): Promise<TastingReminder[]> {
    return db.select().from(tastingReminders).where(eq(tastingReminders.participantId, participantId));
  }

  async setReminder(data: InsertTastingReminder): Promise<TastingReminder> {
    if (data.tastingId) {
      const existing = await db.select().from(tastingReminders).where(
        and(
          eq(tastingReminders.participantId, data.participantId),
          eq(tastingReminders.tastingId, data.tastingId),
          sql`${tastingReminders.offsetMinutes} = ${data.offsetMinutes}`
        )
      );
      if (existing.length > 0) {
        const [updated] = await db.update(tastingReminders)
          .set({ enabled: data.enabled })
          .where(eq(tastingReminders.id, existing[0].id))
          .returning();
        return updated;
      }
    } else {
      const existing = await db.select().from(tastingReminders).where(
        and(
          eq(tastingReminders.participantId, data.participantId),
          sql`${tastingReminders.tastingId} IS NULL`,
          sql`${tastingReminders.offsetMinutes} = ${data.offsetMinutes}`
        )
      );
      if (existing.length > 0) {
        const [updated] = await db.update(tastingReminders)
          .set({ enabled: data.enabled })
          .where(eq(tastingReminders.id, existing[0].id))
          .returning();
        return updated;
      }
    }
    const [result] = await db.insert(tastingReminders).values(data).returning();
    return result;
  }

  async deleteReminder(id: string, participantId: string): Promise<void> {
    await db.delete(tastingReminders).where(and(
      eq(tastingReminders.id, id),
      eq(tastingReminders.participantId, participantId)
    ));
  }

  async deleteRemindersForTasting(tastingId: string, participantId: string): Promise<void> {
    await db.delete(tastingReminders).where(and(
      eq(tastingReminders.tastingId, tastingId),
      eq(tastingReminders.participantId, participantId)
    ));
  }

  async getUpcomingRemindersToSend(): Promise<{ reminder: TastingReminder; tasting: any; participant: any }[]> {
    const now = new Date();
    const allReminders = await db.select().from(tastingReminders).where(eq(tastingReminders.enabled, true));
    const results: { reminder: TastingReminder; tasting: any; participant: any }[] = [];

    for (const reminder of allReminders) {
      const pId = reminder.participantId;
      const participant = await this.getParticipant(pId);
      if (!participant?.email || !participant.emailVerified) continue;

      let tastingIds: string[] = [];
      if (reminder.tastingId) {
        tastingIds = [reminder.tastingId];
      } else {
        const joined = await db.select().from(tastingParticipants).where(eq(tastingParticipants.participantId, pId));
        tastingIds = joined.map(j => j.tastingId);
      }

      for (const tId of tastingIds) {
        const tasting = await this.getTasting(tId);
        if (!tasting || tasting.status === "archived") continue;

        const tastingDate = new Date(tasting.date + "T18:00:00");
        const reminderTime = new Date(tastingDate.getTime() - reminder.offsetMinutes * 60 * 1000);

        if (now >= reminderTime && now < tastingDate) {
          const alreadySent = await this.hasReminderBeenSent(pId, tId, reminder.offsetMinutes);
          if (!alreadySent) {
            results.push({ reminder, tasting, participant });
          }
        }
      }
    }
    return results;
  }

  async logReminderSent(participantId: string, tastingId: string, offsetMinutes: number): Promise<void> {
    await db.insert(reminderLog).values({ participantId, tastingId, offsetMinutes });
  }

  async hasReminderBeenSent(participantId: string, tastingId: string, offsetMinutes: number): Promise<boolean> {
    const rows = await db.select().from(reminderLog).where(
      and(
        eq(reminderLog.participantId, participantId),
        eq(reminderLog.tastingId, tastingId),
        eq(reminderLog.offsetMinutes, offsetMinutes)
      )
    );
    return rows.length > 0;
  }

  // --- Encyclopedia Suggestions ---
  async getEncyclopediaSuggestions(status?: string): Promise<EncyclopediaSuggestion[]> {
    if (status) {
      return db.select().from(encyclopediaSuggestions).where(eq(encyclopediaSuggestions.status, status)).orderBy(desc(encyclopediaSuggestions.createdAt));
    }
    return db.select().from(encyclopediaSuggestions).orderBy(desc(encyclopediaSuggestions.createdAt));
  }

  async createEncyclopediaSuggestion(data: InsertEncyclopediaSuggestion): Promise<EncyclopediaSuggestion> {
    const [result] = await db.insert(encyclopediaSuggestions).values(data).returning();
    return result;
  }

  async updateSuggestionStatus(id: string, status: string, adminNote?: string): Promise<EncyclopediaSuggestion> {
    const updateData: any = { status };
    if (adminNote !== undefined) updateData.adminNote = adminNote;
    const [result] = await db.update(encyclopediaSuggestions).set(updateData).where(eq(encyclopediaSuggestions.id, id)).returning();
    return result;
  }
}

export const storage = new DatabaseStorage();
