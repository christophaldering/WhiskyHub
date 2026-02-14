import { eq, ne, and, asc, sql, inArray } from "drizzle-orm";
import { db } from "./db";
import {
  participants, tastings, tastingParticipants, whiskies, ratings,
  profiles, sessionInvites, discussionEntries, reflectionEntries, whiskyFriends, journalEntries,
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
  updateParticipant(id: string, data: Partial<{name: string; email: string; pin: string}>): Promise<Participant | undefined>;
  updateParticipantLanguage(id: string, language: string): Promise<Participant | undefined>;
  updateParticipantPin(id: string, pin: string): Promise<Participant | undefined>;

  // Tastings
  getTasting(id: string): Promise<Tasting | undefined>;
  getTastingByCode(code: string): Promise<Tasting | undefined>;
  getAllTastings(): Promise<Tasting[]>;
  createTasting(data: InsertTasting): Promise<Tasting>;
  updateTastingStatus(id: string, status: string, currentAct?: string): Promise<Tasting | undefined>;
  updateTastingReflection(id: string, reflection: string): Promise<Tasting | undefined>;

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

  // Journal Entries
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

  // Hard Delete (admin only)
  hardDeleteTasting(id: string): Promise<void>;
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

  async updateParticipant(id: string, data: Partial<{name: string; email: string; pin: string}>): Promise<Participant | undefined> {
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

  // --- Journal Entries ---
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

    const whiskyIds = [...new Set(allRatings.map(r => r.whiskyId))];
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

  async hardDeleteTasting(id: string): Promise<void> {
    await db.delete(ratings).where(eq(ratings.tastingId, id));
    await db.delete(discussionEntries).where(eq(discussionEntries.tastingId, id));
    await db.delete(reflectionEntries).where(eq(reflectionEntries.tastingId, id));
    await db.delete(sessionInvites).where(eq(sessionInvites.tastingId, id));
    await db.delete(whiskies).where(eq(whiskies.tastingId, id));
    await db.delete(tastingParticipants).where(eq(tastingParticipants.tastingId, id));
    await db.delete(tastings).where(eq(tastings.id, id));
  }
}

export const storage = new DatabaseStorage();
