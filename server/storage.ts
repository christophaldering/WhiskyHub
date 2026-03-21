import { eq, ne, and, asc, desc, sql, inArray, gte } from "drizzle-orm";
import { db } from "./db";
import {
  participants, tastings, tastingParticipants, whiskies, ratings,
  profiles, sessionInvites, discussionEntries, reflectionEntries, whiskyFriends, journalEntries, benchmarkEntries, wishlistEntries,
  newsletters, newsletterRecipients, whiskybaseCollection, tastingReminders, reminderLog, encyclopediaSuggestions, tastingPhotos, userFeedback,
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
  collectionSyncLog,
  type InsertCollectionSyncLog, type CollectionSyncLog,
  type InsertTastingReminder, type TastingReminder,
  type InsertEncyclopediaSuggestion, type EncyclopediaSuggestion,
  type InsertTastingPhoto, type TastingPhoto,
  type InsertUserFeedback, type UserFeedback,
  notifications,
  type InsertNotification, type Notification,
  changelogEntries,
  type InsertChangelogEntry, type ChangelogEntry,
  sessionPresence,
  type SessionPresence,
  appSettings,
  type AppSetting,
  historicalTastings,
  historicalTastingEntries,
  historicalImportRuns,
  type InsertHistoricalTasting, type HistoricalTasting,
  type InsertHistoricalTastingEntry, type HistoricalTastingEntry,
  type InsertHistoricalImportRun, type HistoricalImportRun,
  communities,
  communityMemberships,
  type InsertCommunity, type Community,
  type InsertCommunityMembership, type CommunityMembership,
  connoisseurReports,
  type InsertConnoisseurReport, type ConnoisseurReport,
  voiceMemos,
  type InsertVoiceMemo, type VoiceMemo,
  whiskyGallery,
  type InsertWhiskyGallery, type WhiskyGalleryPhoto,
  userActivitySessions,
  type UserActivitySession,
  flavourCategories,
  flavourDescriptors,
  type InsertFlavourCategory, type FlavourCategory,
  type InsertFlavourDescriptor, type FlavourDescriptor,
} from "@shared/schema";

export async function getUniquePersonCount(participantIds: string[]): Promise<number> {
  if (participantIds.length === 0) return 0;
  const records = await db.select({ id: participants.id, name: participants.name, pin: participants.pin }).from(participants).where(inArray(participants.id, participantIds));
  const seen = new Set<string>();
  for (const r of records) {
    const key = `${(r.name || '').toLowerCase().trim()}::${(r.pin || '').trim()}`;
    seen.add(key);
  }
  return seen.size;
}

export async function deduplicateParticipantList(allParticipantRecords: { id: string; name: string; pin: string | null }[]): Promise<number> {
  const seen = new Set<string>();
  for (const r of allParticipantRecords) {
    const key = `${(r.name || '').toLowerCase().trim()}::${(r.pin || '').trim()}`;
    seen.add(key);
  }
  return seen.size;
}

export interface WhiskyOfTheDay {
  whisky: Whisky;
  avgRating: number;
  ratingCount: number;
  categories: { nose: number; taste: number; finish: number };
}

export interface IStorage {
  // Participants
  getParticipant(id: string): Promise<Participant | undefined>;
  getParticipantByName(name: string): Promise<Participant | undefined>;
  getParticipantByEmail(email: string): Promise<Participant | undefined>;
  createParticipant(data: InsertParticipant): Promise<Participant>;
  updateParticipant(id: string, data: Partial<{name: string; email: string; pin: string; newsletterOptIn: boolean; experienceLevel: string; preferredRatingScale: number | null}>): Promise<Participant | undefined>;
  updateLastSeen(id: string): Promise<void>;
  getOnlineParticipants(thresholdMinutes?: number): Promise<Participant[]>;
  updateParticipantLanguage(id: string, language: string): Promise<Participant | undefined>;
  updateParticipantPin(id: string, pin: string): Promise<Participant | undefined>;
  setPrivacyConsent(id: string): Promise<void>;
  setVerificationCode(id: string, code: string, expiry: Date): Promise<Participant | undefined>;
  verifyEmail(id: string): Promise<Participant | undefined>;
  updateWhiskyDbAccess(id: string, canAccess: boolean): Promise<Participant | undefined>;
  updateMakingOfAccess(id: string, access: boolean): Promise<Participant | undefined>;

  // Tastings
  getTasting(id: string): Promise<Tasting | undefined>;
  getTastingByCode(code: string): Promise<Tasting | undefined>;
  getAllTastings(): Promise<Tasting[]>;
  getTastingsForParticipant(participantId: string): Promise<Tasting[]>;
  createTasting(data: InsertTasting): Promise<Tasting>;
  updateTastingStatus(id: string, status: string, currentAct?: string): Promise<Tasting | undefined>;
  updateTastingReflection(id: string, reflection: string): Promise<Tasting | undefined>;
  updateTastingDetails(id: string, data: Partial<{ title: string; date: string; location: string; description: string; blindMode: boolean; ratingScale: number; guidedMode: boolean; ratingPrompt: string | null; reflectionEnabled: boolean; reflectionMode: string; reflectionVisibility: string; coverImageUrl: string | null; coverImageRevealed: boolean; videoLink: string | null; guestMode: string; sessionUiMode: string | null; showRanking: boolean; showGroupAvg: boolean; showReveal: boolean; lockedDrams: string | null }>): Promise<Tasting | undefined>;
  updateTasting(id: string, data: Partial<Record<string, any>>): Promise<Tasting | undefined>;
  transferTastingHost(id: string, newHostId: string): Promise<Tasting | undefined>;
  duplicateTasting(id: string, hostId: string): Promise<Tasting>;

  // Tasting Participants
  getTastingParticipants(tastingId: string): Promise<(TastingParticipant & { participant: Participant })[]>;
  addParticipantToTasting(data: InsertTastingParticipant): Promise<TastingParticipant>;
  isParticipantInTasting(tastingId: string, participantId: string): Promise<boolean>;

  // Whiskies
  getWhiskiesForTasting(tastingId: string): Promise<Whisky[]>;
  getWhiskiesByIds(ids: string[]): Promise<Whisky[]>;
  getAllWhiskies(): Promise<Whisky[]>;
  getActiveWhiskies(): Promise<Whisky[]>;
  getWhisky(id: string): Promise<Whisky | undefined>;
  createWhisky(data: InsertWhisky): Promise<Whisky>;
  updateWhisky(id: string, data: Partial<InsertWhisky>): Promise<Whisky | undefined>;
  deleteWhisky(id: string): Promise<void>;

  // Ratings
  getRatingsForWhisky(whiskyId: string): Promise<Rating[]>;
  getRatingsForTasting(tastingId: string): Promise<Rating[]>;
  getRatingsForParticipant(participantId: string): Promise<Rating[]>;
  getAllRatings(): Promise<Rating[]>;
  getRatingByParticipantAndWhisky(participantId: string, whiskyId: string): Promise<Rating | undefined>;
  upsertRating(data: InsertRating): Promise<Rating>;
  deleteRatingsByTasting(tastingId: string): Promise<void>;

  // Profiles
  getProfile(participantId: string): Promise<Profile | undefined>;
  upsertProfile(data: InsertProfile): Promise<Profile>;

  // Session Invites
  createInvite(data: InsertSessionInvite): Promise<SessionInvite>;
  getInvitesByTasting(tastingId: string): Promise<SessionInvite[]>;
  getInvitesByEmail(email: string): Promise<SessionInvite[]>;
  getInviteByToken(token: string): Promise<SessionInvite | undefined>;
  updateInviteStatus(id: string, status: string, acceptedAt?: Date): Promise<SessionInvite | undefined>;

  // Blind Mode / Reveal
  updateTastingBlindMode(id: string, data: { blindMode?: boolean; revealIndex?: number; revealStep?: number; reflectionEnabled?: boolean; reflectionMode?: string; reflectionVisibility?: string; customPrompts?: string; guidedMode?: boolean; guidedWhiskyIndex?: number; guidedRevealStep?: number; presentationSlide?: number | null }): Promise<Tasting | undefined>;

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
  getRatingNotes(participantId: string): Promise<Array<{ id: string; notes: string | null; overall: number | null; normalizedScore: number | null; createdAt: Date | null }>>;

  // Tasting History (whiskies tasted via sessions)
  getTastingHistory(participantId: string): Promise<any[]>;

  // Journal Entries
  getAllJournalEntries(): Promise<JournalEntry[]>;
  getCuratedDatabaseEntries(): Promise<JournalEntry[]>;
  getJournalEntries(participantId: string, statusFilter?: string): Promise<JournalEntry[]>;
  getJournalEntry(id: string, participantId: string): Promise<JournalEntry | undefined>;
  createJournalEntry(data: InsertJournalEntry): Promise<JournalEntry>;
  updateJournalEntry(id: string, participantId: string, data: Partial<InsertJournalEntry>): Promise<JournalEntry | undefined>;
  deleteJournalEntry(id: string, participantId: string): Promise<void>;

  // Participant Stats (for badges)
  getParticipantStats(participantId: string): Promise<{
    totalRatings: number;
    totalTastings: number;
    totalTastingWhiskies: number;
    totalJournalEntries: number;
    ratedRegions: Record<string, number>;
    ratedCaskTypes: Record<string, number>;
    ratedPeatLevels: Record<string, number>;
    highestOverall: number;
  }>;

  // Flavor Profile (aggregated ratings with whisky metadata)
  getFlavorProfile(participantId: string): Promise<{
    avgScores: { nose: number; taste: number; finish: number; overall: number };
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

  // Community Scores
  getCommunityScores(): Promise<Array<{
    whiskyKey: string;
    name: string;
    distillery: string | null;
    whiskybaseId: string | null;
    avgOverall: number;
    avgNose: number;
    avgTaste: number;
    avgFinish: number;
    totalRatings: number;
    totalRaters: number;
    region: string | null;
    category: string | null;
    caskInfluence: string | null;
    peatLevel: string | null;
    age: string | null;
    abv: number | null;
    imageUrl: string | null;
  }>>;

  getTasteTwins(participantId: string): Promise<Array<{
    participantId: string;
    participantName: string;
    correlation: number;
    sharedWhiskies: number;
  }>>;

  // Hard Delete (admin only)
  hardDeleteTasting(id: string): Promise<void>;

  // Global Averages
  getGlobalAverages(): Promise<{ nose: number; taste: number; finish: number; overall: number; totalRatings: number; totalParticipants: number }>;

  // Admin
  getAllParticipants(): Promise<Participant[]>;
  updateParticipantRole(id: string, role: string): Promise<Participant | undefined>;
  updateCommunityContributor(id: string, status: boolean): Promise<Participant | undefined>;
  getCommunityContributors(): Promise<Participant[]>;
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
  getAllCollectionItems(): Promise<WhiskybaseCollectionItem[]>;
  getWhiskybaseCollection(participantId: string): Promise<WhiskybaseCollectionItem[]>;
  getWhiskybaseCollectionItem(id: string, participantId: string): Promise<WhiskybaseCollectionItem | undefined>;
  upsertWhiskybaseCollectionItem(data: InsertWhiskybaseCollection): Promise<WhiskybaseCollectionItem>;
  patchWhiskybaseCollectionItem(id: string, participantId: string, fields: Partial<{ status: string; personalRating: number | null; notes: string | null }>): Promise<WhiskybaseCollectionItem | null>;
  deleteWhiskybaseCollectionItem(id: string, participantId: string): Promise<void>;
  deleteWhiskybaseCollection(participantId: string): Promise<void>;
  updateWhiskybaseCollectionItemPrice(id: string, participantId: string, price: number, currency: string, source: string): Promise<WhiskybaseCollectionItem | null>;

  // Collection Sync Log
  createCollectionSyncLog(data: InsertCollectionSyncLog): Promise<CollectionSyncLog>;
  getCollectionSyncLogs(participantId: string): Promise<CollectionSyncLog[]>;
  getCollectionSyncLog(id: string): Promise<CollectionSyncLog | undefined>;

  // Encyclopedia Suggestions
  getEncyclopediaSuggestions(status?: string): Promise<EncyclopediaSuggestion[]>;
  createEncyclopediaSuggestion(data: InsertEncyclopediaSuggestion): Promise<EncyclopediaSuggestion>;
  updateSuggestionStatus(id: string, status: string, adminNote?: string): Promise<EncyclopediaSuggestion>;

  // Tasting Photos
  getTastingPhotos(tastingId: string): Promise<TastingPhoto[]>;
  createTastingPhoto(data: InsertTastingPhoto): Promise<TastingPhoto>;
  updateTastingPhoto(id: string, participantId: string, data: Partial<{ caption: string; printable: boolean }>): Promise<TastingPhoto | undefined>;
  updateTastingPhotoAsHost(id: string, hostParticipantId: string, data: Partial<{ caption: string; printable: boolean }>): Promise<TastingPhoto | undefined>;
  deleteTastingPhoto(id: string, participantId: string): Promise<void>;

  // User Feedback
  createUserFeedback(data: InsertUserFeedback): Promise<UserFeedback>;
  getUserFeedback(): Promise<UserFeedback[]>;

  // Notifications
  getNotificationsForParticipant(participantId: string): Promise<Notification[]>;
  createNotification(data: InsertNotification): Promise<Notification>;
  markNotificationRead(notificationId: string, participantId: string): Promise<void>;
  markAllNotificationsRead(participantId: string): Promise<void>;
  getUnreadNotificationCount(participantId: string): Promise<number>;

  // Session Presence
  upsertPresence(tastingId: string, participantId: string): Promise<void>;
  getActiveParticipants(tastingId: string, thresholdSeconds?: number): Promise<{ participantId: string; participantName: string; lastSeenAt: Date }[]>;
  cleanupStalePresence(thresholdSeconds?: number): Promise<void>;

  // Platform Stats
  getPlatformStats(): Promise<{
    totalTastings: number;
    totalParticipants: number;
    totalWhiskies: number;
    totalRatings: number;
    totalJournalEntries: number;
    countriesRepresented: number;
  }>;

  // App Settings
  getAppSettings(): Promise<Record<string, string>>;
  getAppSetting(key: string): Promise<string | null>;
  setAppSetting(key: string, value: string): Promise<void>;
  setAppSettings(settings: Record<string, string>): Promise<void>;

  // Test Data Flag
  setTastingTestFlag(id: string, isTest: boolean): Promise<Tasting | undefined>;
  bulkCleanupTastings(filter: { titlePattern?: string; beforeDate?: string; maxParticipants?: number; onlyTestData?: boolean }, action: "preview" | "markAsTest" | "delete"): Promise<{ count: number; tastings: Array<{ id: string; title: string; date: string; participantCount: number; isTestData: boolean }> }>;

  // Communities
  getCommunities(): Promise<Community[]>;
  getCommunityBySlug(slug: string): Promise<Community | undefined>;
  getCommunityById(id: string): Promise<Community | undefined>;
  createCommunity(data: InsertCommunity): Promise<Community>;
  updateCommunity(id: string, data: Partial<Community>): Promise<Community | undefined>;
  getCommunityMemberships(communityId: string): Promise<(CommunityMembership & { participantName?: string; participantEmail?: string })[]>;
  getParticipantCommunities(participantId: string): Promise<Community[]>;
  addCommunityMember(data: InsertCommunityMembership): Promise<CommunityMembership>;
  removeCommunityMember(communityId: string, participantId: string): Promise<void>;
  isCommunityMember(communityId: string, participantId: string): Promise<boolean>;

  // Historical Tastings
  getAccessibleHistoricalTastingIds(communityIds: string[], isAdmin: boolean): Promise<string[] | "all">;
  getHistoricalTastings(options?: { limit?: number; offset?: number; search?: string; tastingIds?: string[] }): Promise<{ tastings: HistoricalTasting[]; total: number }>;
  getHistoricalTastingsEnriched(options?: { limit?: number; offset?: number; search?: string; tastingIds?: string[] }): Promise<{ tastings: Array<HistoricalTasting & { avgTotalScore: number | null; winnerDistillery: string | null; winnerName: string | null; winnerScore: number | null }>; total: number }>;
  getHistoricalTasting(id: string): Promise<(HistoricalTasting & { entries: HistoricalTastingEntry[] }) | undefined>;
  getHistoricalTastingEntries(tastingId: string): Promise<HistoricalTastingEntry[]>;
  getHistoricalWhiskyStats(tastingIds?: string[]): Promise<{
    totalTastings: number;
    totalEntries: number;
    topWhiskies: Array<{ distillery: string | null; name: string | null; totalScore: number | null; normalizedTotal: number | null; tastingNumber: number }>;
    regionBreakdown: Record<string, number>;
    smokyBreakdown: { smoky: number; nonSmoky: number; unknown: number };
    caskBreakdown: Record<string, number>;
    scoreDistribution: Array<{ range: string; count: number }>;
  }>;
  getAllHistoricalTastingEntries(tastingIds?: string[]): Promise<HistoricalTastingEntry[]>;
  createHistoricalTasting(data: InsertHistoricalTasting): Promise<HistoricalTasting>;
  createHistoricalTastingEntry(data: InsertHistoricalTastingEntry): Promise<HistoricalTastingEntry>;
  createHistoricalImportRun(data: InsertHistoricalImportRun): Promise<HistoricalImportRun>;
  updateHistoricalImportRun(id: string, data: Partial<HistoricalImportRun>): Promise<HistoricalImportRun | undefined>;
  getHistoricalImportRuns(): Promise<HistoricalImportRun[]>;

  // Connoisseur Reports
  createConnoisseurReport(data: InsertConnoisseurReport): Promise<ConnoisseurReport>;
  getConnoisseurReports(participantId: string): Promise<ConnoisseurReport[]>;
  getConnoisseurReport(id: string): Promise<ConnoisseurReport | undefined>;
  deleteConnoisseurReport(id: string): Promise<void>;

  // Voice Memos
  createVoiceMemo(data: InsertVoiceMemo): Promise<VoiceMemo>;
  getVoiceMemosForWhisky(tastingId: string, whiskyId: string): Promise<VoiceMemo[]>;
  getVoiceMemosForTasting(tastingId: string): Promise<VoiceMemo[]>;
  deleteVoiceMemo(id: string, participantId: string): Promise<void>;

  // Whisky Gallery
  getWhiskyGallery(whiskyId: string): Promise<WhiskyGalleryPhoto[]>;
  addWhiskyGalleryPhoto(data: InsertWhiskyGallery): Promise<WhiskyGalleryPhoto>;
  getWhiskyGalleryCount(whiskyId: string): Promise<number>;

  // Flavour Categories & Descriptors
  getFlavourCategories(): Promise<FlavourCategory[]>;
  createFlavourCategory(data: InsertFlavourCategory): Promise<FlavourCategory>;
  updateFlavourCategory(id: string, data: Partial<Omit<InsertFlavourCategory, "id">>): Promise<FlavourCategory | undefined>;
  deleteFlavourCategory(id: string): Promise<void>;
  getFlavourDescriptors(categoryId?: string): Promise<FlavourDescriptor[]>;
  createFlavourDescriptor(data: InsertFlavourDescriptor): Promise<FlavourDescriptor>;
  updateFlavourDescriptor(id: string, data: Partial<Omit<InsertFlavourDescriptor, "id">>): Promise<FlavourDescriptor | undefined>;
  deleteFlavourDescriptor(id: string): Promise<void>;
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

  async updateParticipant(id: string, data: Partial<{name: string; email: string; pin: string; newsletterOptIn: boolean; experienceLevel: string; preferredRatingScale: number | null}>): Promise<Participant | undefined> {
    const [result] = await db.update(participants).set(data).where(eq(participants.id, id)).returning();
    return result;
  }

  async updateLastSeen(id: string): Promise<void> {
    await db.update(participants).set({ lastSeenAt: new Date() }).where(eq(participants.id, id));
  }

  async getOnlineParticipants(thresholdMinutes: number = 5): Promise<Participant[]> {
    const cutoff = new Date(Date.now() - thresholdMinutes * 60 * 1000);
    return db.select().from(participants).where(gte(participants.lastSeenAt, cutoff)).orderBy(desc(participants.lastSeenAt));
  }

  async updateParticipantLanguage(id: string, language: string): Promise<Participant | undefined> {
    const [result] = await db.update(participants).set({ language }).where(eq(participants.id, id)).returning();
    return result;
  }

  async updateParticipantPin(id: string, pin: string): Promise<Participant | undefined> {
    const [result] = await db.update(participants).set({ pin }).where(eq(participants.id, id)).returning();
    return result;
  }

  async setPrivacyConsent(id: string): Promise<void> {
    await db.update(participants).set({ privacyConsentAt: new Date() }).where(eq(participants.id, id));
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

  async getTastingsForParticipant(participantId: string): Promise<Tasting[]> {
    const joinedTastingIds = db
      .select({ tastingId: tastingParticipants.tastingId })
      .from(tastingParticipants)
      .where(eq(tastingParticipants.participantId, participantId));

    const results = await db
      .select()
      .from(tastings)
      .where(
        and(
          ne(tastings.status, "deleted"),
          sql`(${tastings.hostId} = ${participantId} OR ${tastings.id} IN (${joinedTastingIds}))`
        )
      );
    return results;
  }

  async createTasting(data: InsertTasting): Promise<Tasting> {
    const [result] = await db.insert(tastings).values(data).returning();
    return result;
  }

  async updateTastingStatus(id: string, status: string, currentAct?: string): Promise<Tasting | undefined> {
    const updateData: any = { status };
    if (currentAct) updateData.currentAct = currentAct;
    const now = new Date();
    const existing = await this.getTasting(id);
    if (status === "open" && !existing?.openedAt) updateData.openedAt = now;
    if (status === "closed" && !existing?.closedAt) updateData.closedAt = now;
    if (status === "reveal" && !existing?.revealedAt) updateData.revealedAt = now;
    if (status === "archived" && !existing?.archivedAt) updateData.archivedAt = now;
    if (status === "open" && existing && ["closed", "reveal", "archived"].includes(existing.status)) {
      updateData.revealStep = 0;
      updateData.revealIndex = 0;
      updateData.guidedWhiskyIndex = -1;
      updateData.guidedRevealStep = 0;
      updateData.currentAct = "act1";
      updateData.ratingPrompt = null;
      updateData.closedAt = null;
      updateData.revealedAt = null;
      updateData.archivedAt = null;
    }
    const [result] = await db.update(tastings).set(updateData).where(eq(tastings.id, id)).returning();
    return result;
  }

  async deleteRatingsByTasting(tastingId: string): Promise<void> {
    await db.delete(ratings).where(eq(ratings.tastingId, tastingId));
  }

  async updateTastingReflection(id: string, reflection: string): Promise<Tasting | undefined> {
    const [result] = await db.update(tastings).set({ hostReflection: reflection }).where(eq(tastings.id, id)).returning();
    return result;
  }

  async updateTastingDetails(id: string, data: Partial<{ title: string; date: string; location: string; description: string; blindMode: boolean; ratingScale: number; guidedMode: boolean; ratingPrompt: string | null; reflectionEnabled: boolean; reflectionMode: string; reflectionVisibility: string; coverImageUrl: string | null; coverImageRevealed: boolean; videoLink: string | null; guestMode: string; sessionUiMode: string | null; showRanking: boolean; showGroupAvg: boolean; showReveal: boolean; lockedDrams: string | null }>): Promise<Tasting | undefined> {
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.date !== undefined) updateData.date = data.date;
    if ((data as any).time !== undefined) updateData.time = (data as any).time;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.blindMode !== undefined) updateData.blindMode = data.blindMode;
    if (data.ratingScale !== undefined) updateData.ratingScale = data.ratingScale;
    if (data.guidedMode !== undefined) updateData.guidedMode = data.guidedMode;
    if (data.ratingPrompt !== undefined) updateData.ratingPrompt = data.ratingPrompt;
    if (data.reflectionEnabled !== undefined) updateData.reflectionEnabled = data.reflectionEnabled;
    if (data.reflectionMode !== undefined) updateData.reflectionMode = data.reflectionMode;
    if (data.reflectionVisibility !== undefined) updateData.reflectionVisibility = data.reflectionVisibility;
    if (data.coverImageUrl !== undefined) updateData.coverImageUrl = data.coverImageUrl;
    if (data.coverImageRevealed !== undefined) updateData.coverImageRevealed = data.coverImageRevealed;
    if (data.videoLink !== undefined) updateData.videoLink = data.videoLink;
    if (data.guestMode !== undefined) updateData.guestMode = data.guestMode;
    if (data.sessionUiMode !== undefined) updateData.sessionUiMode = data.sessionUiMode;
    if (data.showRanking !== undefined) updateData.showRanking = data.showRanking;
    if (data.showGroupAvg !== undefined) updateData.showGroupAvg = data.showGroupAvg;
    if (data.showReveal !== undefined) updateData.showReveal = data.showReveal;
    if ((data as any).revealOrder !== undefined) updateData.revealOrder = (data as any).revealOrder;
    if ((data as any).lockedDrams !== undefined) updateData.lockedDrams = (data as any).lockedDrams;
    if (Object.keys(updateData).length === 0) return this.getTasting(id);
    const [result] = await db.update(tastings).set(updateData).where(eq(tastings.id, id)).returning();
    return result;
  }

  async updateTasting(id: string, data: Partial<Record<string, any>>): Promise<Tasting | undefined> {
    if (Object.keys(data).length === 0) return this.getTasting(id);
    const [result] = await db.update(tastings).set(data).where(eq(tastings.id, id)).returning();
    return result;
  }

  async transferTastingHost(id: string, newHostId: string): Promise<Tasting | undefined> {
    const [result] = await db.update(tastings).set({ hostId: newHostId }).where(eq(tastings.id, id)).returning();
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
    const [result] = await db.insert(tastingParticipants).values(data).onConflictDoNothing({ target: [tastingParticipants.tastingId, tastingParticipants.participantId] }).returning();
    if (!result) {
      const [existing] = await db
        .select()
        .from(tastingParticipants)
        .where(and(eq(tastingParticipants.tastingId, data.tastingId), eq(tastingParticipants.participantId, data.participantId)));
      return existing;
    }
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

  async getWhiskiesByIds(ids: string[]): Promise<Whisky[]> {
    if (ids.length === 0) return [];
    return db.select().from(whiskies).where(inArray(whiskies.id, ids));
  }

  async getAllWhiskies(): Promise<Whisky[]> {
    return db.select().from(whiskies);
  }

  async getActiveWhiskies(): Promise<Whisky[]> {
    const deletedTastingIds = await db.select({ id: tastings.id }).from(tastings).where(eq(tastings.status, "deleted"));
    const deletedIds = deletedTastingIds.map(t => t.id);
    if (deletedIds.length === 0) return db.select().from(whiskies);
    return db.select().from(whiskies).where(sql`${whiskies.tastingId} NOT IN (${sql.join(deletedIds.map(id => sql`${id}`), sql`, `)})`);
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

  async getRatingsForParticipant(participantId: string): Promise<Rating[]> {
    return db.select().from(ratings).where(eq(ratings.participantId, participantId));
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

  // --- Tasting History ---
  async getTastingHistory(participantId: string): Promise<any[]> {
    const results = await db
      .select({
        whiskyId: whiskies.id,
        whiskyName: whiskies.name,
        distillery: whiskies.distillery,
        age: whiskies.age,
        abv: whiskies.abv,
        type: whiskies.type,
        country: whiskies.country,
        region: whiskies.region,
        category: whiskies.category,
        caskInfluence: whiskies.caskInfluence,
        imageUrl: whiskies.imageUrl,
        tastingId: tastings.id,
        tastingTitle: tastings.title,
        tastingDate: tastings.date,
        tastingLocation: tastings.location,
        ratingNose: ratings.nose,
        ratingTaste: ratings.taste,
        ratingFinish: ratings.finish,
        ratingOverall: ratings.overall,
        ratingNotes: ratings.notes,
        ratingUpdatedAt: ratings.updatedAt,
      })
      .from(ratings)
      .innerJoin(whiskies, eq(ratings.whiskyId, whiskies.id))
      .innerJoin(tastings, eq(ratings.tastingId, tastings.id))
      .where(eq(ratings.participantId, participantId))
      .orderBy(desc(tastings.date), desc(ratings.updatedAt));

    return results;
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

  async getInvitesByEmail(email: string): Promise<SessionInvite[]> {
    return db.select().from(sessionInvites).where(
      and(
        eq(sessionInvites.email, email.toLowerCase()),
        eq(sessionInvites.status, "invited")
      )
    );
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
  async updateTastingBlindMode(id: string, data: { blindMode?: boolean; revealIndex?: number; revealStep?: number; reflectionEnabled?: boolean; reflectionMode?: string; reflectionVisibility?: string; customPrompts?: string; guidedMode?: boolean; guidedWhiskyIndex?: number; guidedRevealStep?: number; presentationSlide?: number | null }): Promise<Tasting | undefined> {
    const updateObj: any = {};
    if (data.blindMode !== undefined) updateObj.blindMode = data.blindMode;
    if (data.revealIndex !== undefined) updateObj.revealIndex = data.revealIndex;
    if (data.revealStep !== undefined) updateObj.revealStep = data.revealStep;
    if (data.reflectionEnabled !== undefined) updateObj.reflectionEnabled = data.reflectionEnabled;
    if (data.reflectionMode !== undefined) updateObj.reflectionMode = data.reflectionMode;
    if (data.reflectionVisibility !== undefined) updateObj.reflectionVisibility = data.reflectionVisibility;
    if (data.customPrompts !== undefined) updateObj.customPrompts = data.customPrompts;
    if (data.guidedMode !== undefined) updateObj.guidedMode = data.guidedMode;
    if (data.guidedWhiskyIndex !== undefined) updateObj.guidedWhiskyIndex = data.guidedWhiskyIndex;
    if (data.guidedRevealStep !== undefined) updateObj.guidedRevealStep = data.guidedRevealStep;
    if (data.presentationSlide !== undefined) updateObj.presentationSlide = data.presentationSlide;
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
  async getRatingNotes(participantId: string): Promise<Array<{ id: string; notes: string | null; overall: number | null; normalizedScore: number | null; createdAt: Date | null }>> {
    return db.select({
      id: ratings.id,
      notes: ratings.notes,
      overall: ratings.overall,
      normalizedScore: ratings.normalizedScore,
      createdAt: ratings.createdAt,
    }).from(ratings).where(eq(ratings.participantId, participantId));
  }

  // --- Journal Entries ---
  async getAllJournalEntries(): Promise<JournalEntry[]> {
    return db.select().from(journalEntries).orderBy(desc(journalEntries.createdAt));
  }

  async getCuratedDatabaseEntries(): Promise<JournalEntry[]> {
    return db.select().from(journalEntries)
      .where(eq(journalEntries.source, "casksense-database"))
      .orderBy(desc(journalEntries.createdAt));
  }

  async getJournalEntries(participantId: string, statusFilter?: string): Promise<JournalEntry[]> {
    const conditions = [eq(journalEntries.participantId, participantId)];
    if (statusFilter) {
      conditions.push(eq(journalEntries.status, statusFilter));
    }
    return db.select().from(journalEntries).where(and(...conditions)).orderBy(asc(journalEntries.createdAt));
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
    totalTastingWhiskies: number;
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

    const tastingsForParticipant = await this.getTastingsForParticipant(participantId);
    const whiskyArrays = await Promise.all(
      tastingsForParticipant.map(tasting => this.getWhiskiesForTasting(tasting.id))
    );
    const totalTastingWhiskies = whiskyArrays.reduce((sum, arr) => sum + arr.length, 0);

    const journalCount = await db.select({ count: sql<number>`count(*)::int` }).from(journalEntries).where(
      and(
        eq(journalEntries.participantId, participantId),
        ne(journalEntries.status, 'draft')
      )
    );

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
      totalTastingWhiskies,
      totalJournalEntries: journalCount[0]?.count || 0,
      ratedRegions,
      ratedCaskTypes,
      ratedPeatLevels,
      highestOverall,
    };
  }

  async getFlavorProfile(participantId: string): Promise<{
    avgScores: { nose: number; taste: number; finish: number; overall: number };
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

    const tastingIds = Array.from(new Set(allRatings.map(r => r.tastingId)));
    const tastingRows = tastingIds.length > 0
      ? await db.select().from(tastings).where(inArray(tastings.id, tastingIds))
      : [];
    const tastingScaleMap = new Map(tastingRows.map(t => [t.id, t.ratingScale ?? 100]));

    let sumNose = 0, sumTaste = 0, sumFinish = 0, sumOverall = 0;
    const regionAcc: Record<string, { total: number; count: number }> = {};
    const caskAcc: Record<string, { total: number; count: number }> = {};
    const peatAcc: Record<string, { total: number; count: number }> = {};
    const categoryAcc: Record<string, { total: number; count: number }> = {};

    for (const r of allRatings) {
      const scale = tastingScaleMap.get(r.tastingId) ?? 100;
      const norm = 100 / scale;
      sumNose += (r.normalizedNose ?? r.nose * norm); sumTaste += (r.normalizedTaste ?? r.taste * norm); sumFinish += (r.normalizedFinish ?? r.finish * norm);
      sumOverall += (r.normalizedScore ?? r.overall * norm);
      const w = whiskyMap.get(r.whiskyId);
      if (w) {
        const normOverall = (r.normalizedScore ?? r.overall * norm);
        if (w.region) {
          if (!regionAcc[w.region]) regionAcc[w.region] = { total: 0, count: 0 };
          regionAcc[w.region].total += normOverall; regionAcc[w.region].count++;
        }
        if (w.caskInfluence) {
          if (!caskAcc[w.caskInfluence]) caskAcc[w.caskInfluence] = { total: 0, count: 0 };
          caskAcc[w.caskInfluence].total += normOverall; caskAcc[w.caskInfluence].count++;
        }
        if (w.peatLevel) {
          if (!peatAcc[w.peatLevel]) peatAcc[w.peatLevel] = { total: 0, count: 0 };
          peatAcc[w.peatLevel].total += normOverall; peatAcc[w.peatLevel].count++;
        }
        if (w.category) {
          if (!categoryAcc[w.category]) categoryAcc[w.category] = { total: 0, count: 0 };
          categoryAcc[w.category].total += normOverall; categoryAcc[w.category].count++;
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

  async getGlobalAverages(): Promise<{ nose: number; taste: number; finish: number; overall: number; totalRatings: number; totalParticipants: number }> {
    const allRatings = await db.select().from(ratings);
    if (allRatings.length === 0) {
      return { nose: 0, taste: 0, finish: 0, overall: 0, totalRatings: 0, totalParticipants: 0 };
    }
    const tastingIds = Array.from(new Set(allRatings.map(r => r.tastingId)));
    const tastingRows = tastingIds.length > 0
      ? await db.select().from(tastings).where(inArray(tastings.id, tastingIds))
      : [];
    const testTastingIds = new Set(tastingRows.filter(t => t.isTestData).map(t => t.id));
    const filteredRatings = allRatings.filter(r => !testTastingIds.has(r.tastingId));
    if (filteredRatings.length === 0) {
      return { nose: 0, taste: 0, finish: 0, overall: 0, totalRatings: 0, totalParticipants: 0 };
    }
    const tastingScaleMap = new Map(tastingRows.map(t => [t.id, t.ratingScale ?? 100]));

    let sumNose = 0, sumTaste = 0, sumFinish = 0, sumOverall = 0;
    const participantIds: string[] = [];
    for (const r of filteredRatings) {
      const scale = tastingScaleMap.get(r.tastingId) ?? 100;
      const norm = 100 / scale;
      sumNose += (r.normalizedNose ?? r.nose * norm); sumTaste += (r.normalizedTaste ?? r.taste * norm); sumFinish += (r.normalizedFinish ?? r.finish * norm);
      sumOverall += (r.normalizedScore ?? r.overall * norm);
      if (!participantIds.includes(r.participantId)) participantIds.push(r.participantId);
    }
    const n = filteredRatings.length;
    const uniquePersons = await getUniquePersonCount(participantIds);
    return {
      nose: Math.round((sumNose / n) * 10) / 10,
      taste: Math.round((sumTaste / n) * 10) / 10,
      finish: Math.round((sumFinish / n) * 10) / 10,
      overall: Math.round((sumOverall / n) * 10) / 10,
      totalRatings: n,
      totalParticipants: uniquePersons,
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

  async updateMakingOfAccess(id: string, access: boolean): Promise<Participant | undefined> {
    const [result] = await db.update(participants).set({ makingOfAccess: access }).where(eq(participants.id, id)).returning();
    return result;
  }

  async updateCommunityContributor(id: string, status: boolean): Promise<Participant | undefined> {
    const [result] = await db.update(participants).set({ communityContributor: status }).where(eq(participants.id, id)).returning();
    return result;
  }

  async getCommunityContributors(): Promise<Participant[]> {
    return db.select().from(participants).where(eq(participants.communityContributor, true)).orderBy(participants.name);
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
  async getAllCollectionItems(): Promise<WhiskybaseCollectionItem[]> {
    return await db.select().from(whiskybaseCollection).orderBy(whiskybaseCollection.brand, whiskybaseCollection.name);
  }

  async getWhiskybaseCollection(participantId: string): Promise<WhiskybaseCollectionItem[]> {
    return await db.select().from(whiskybaseCollection).where(eq(whiskybaseCollection.participantId, participantId)).orderBy(whiskybaseCollection.brand, whiskybaseCollection.name);
  }

  async upsertWhiskybaseCollectionItem(data: InsertWhiskybaseCollection): Promise<WhiskybaseCollectionItem> {
    const lookupCol = data.collectionId
      ? eq(whiskybaseCollection.collectionId, data.collectionId)
      : eq(whiskybaseCollection.whiskybaseId, data.whiskybaseId);
    const [existing] = await db.select().from(whiskybaseCollection)
      .where(and(
        eq(whiskybaseCollection.participantId, data.participantId),
        lookupCol
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

  async getWhiskybaseCollectionItem(id: string, participantId: string): Promise<WhiskybaseCollectionItem | undefined> {
    const [result] = await db.select().from(whiskybaseCollection).where(and(eq(whiskybaseCollection.id, id), eq(whiskybaseCollection.participantId, participantId)));
    return result;
  }

  async patchWhiskybaseCollectionItem(id: string, participantId: string, fields: Partial<{ status: string; personalRating: number | null; notes: string | null }>): Promise<WhiskybaseCollectionItem | null> {
    const [existing] = await db.select().from(whiskybaseCollection).where(and(eq(whiskybaseCollection.id, id), eq(whiskybaseCollection.participantId, participantId)));
    if (!existing) return null;
    const currentModified = (existing.locallyModified as Record<string, boolean>) || {};
    const newModified = { ...currentModified };
    for (const key of Object.keys(fields)) {
      newModified[key] = true;
    }
    const [updated] = await db.update(whiskybaseCollection)
      .set({ ...fields, locallyModified: newModified, updatedAt: new Date() })
      .where(and(eq(whiskybaseCollection.id, id), eq(whiskybaseCollection.participantId, participantId)))
      .returning();
    return updated || null;
  }

  async deleteWhiskybaseCollection(participantId: string): Promise<void> {
    await db.delete(whiskybaseCollection).where(eq(whiskybaseCollection.participantId, participantId));
  }

  async updateWhiskybaseCollectionItemPrice(id: string, participantId: string, price: number, currency: string, source: string): Promise<WhiskybaseCollectionItem | null> {
    const [updated] = await db.update(whiskybaseCollection)
      .set({ estimatedPrice: price, estimatedPriceCurrency: currency, estimatedPriceSource: source, estimatedPriceDate: new Date(), updatedAt: new Date() })
      .where(and(eq(whiskybaseCollection.id, id), eq(whiskybaseCollection.participantId, participantId)))
      .returning();
    return updated || null;
  }

  // --- Collection Sync Log ---
  async createCollectionSyncLog(data: InsertCollectionSyncLog): Promise<CollectionSyncLog> {
    const [result] = await db.insert(collectionSyncLog).values(data).returning();
    return result;
  }

  async getCollectionSyncLogs(participantId: string): Promise<CollectionSyncLog[]> {
    return db.select().from(collectionSyncLog).where(eq(collectionSyncLog.participantId, participantId)).orderBy(desc(collectionSyncLog.syncedAt));
  }

  async getCollectionSyncLog(id: string): Promise<CollectionSyncLog | undefined> {
    const [result] = await db.select().from(collectionSyncLog).where(eq(collectionSyncLog.id, id));
    return result;
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

  async getPlatformStats() {
    const [tastingCount] = await db.select({ count: sql<number>`count(*)::int` }).from(tastings).where(ne(tastings.status, "deleted"));
    const allParticipantRecords = await db.select({ id: participants.id, name: participants.name, pin: participants.pin }).from(participants);
    const uniquePersonCount = await deduplicateParticipantList(allParticipantRecords);
    const [whiskyCount] = await db.select({ count: sql<number>`count(*)::int` }).from(whiskies);
    const [ratingCount] = await db.select({ count: sql<number>`count(*)::int` }).from(ratings);
    const [journalCount] = await db.select({ count: sql<number>`count(*)::int` }).from(journalEntries);
    const countryResult = await db.select({ country: whiskies.country }).from(whiskies).where(sql`${whiskies.country} IS NOT NULL AND ${whiskies.country} != ''`).groupBy(whiskies.country);
    return {
      totalTastings: tastingCount?.count ?? 0,
      totalParticipants: uniquePersonCount,
      totalWhiskies: whiskyCount?.count ?? 0,
      totalRatings: ratingCount?.count ?? 0,
      totalJournalEntries: journalCount?.count ?? 0,
      countriesRepresented: countryResult.length,
    };
  }
  async getCommunityScores(): Promise<Array<{
    whiskyKey: string;
    name: string;
    distillery: string | null;
    whiskybaseId: string | null;
    avgOverall: number;
    avgNose: number;
    avgTaste: number;
    avgFinish: number;
    totalRatings: number;
    totalRaters: number;
    region: string | null;
    category: string | null;
    caskInfluence: string | null;
    peatLevel: string | null;
    age: string | null;
    abv: number | null;
    imageUrl: string | null;
  }>> {
    const allWhiskyRows = await db.select().from(whiskies);
    const allRatings = await db.select().from(ratings);
    const allTastingsRows = await db.select().from(tastings);
    const tastingScaleMap = new Map(allTastingsRows.map(t => [t.id, t.ratingScale ?? 100]));

    const whiskyMap = new Map(allWhiskyRows.map(w => [w.id, w]));

    const grouped: Record<string, {
      ratings: Array<{ nose: number; taste: number; finish: number; overall: number; participantId: string }>;
      whisky: typeof whiskies.$inferSelect;
    }> = {};

    for (const r of allRatings) {
      const w = whiskyMap.get(r.whiskyId);
      if (!w) continue;

      const key = w.whiskybaseId
        ? `wb:${w.whiskybaseId}`
        : `name:${(w.name || "").toLowerCase().trim()}|${(w.distillery || "").toLowerCase().trim()}`;

      if (!grouped[key]) {
        grouped[key] = { ratings: [], whisky: w };
      }
      if (!grouped[key].whisky.imageUrl && w.imageUrl) {
        grouped[key].whisky = w;
      }
      const scaleNorm = 100 / (tastingScaleMap.get(r.tastingId) ?? 100);
      grouped[key].ratings.push({
        nose: r.normalizedNose ?? r.nose * scaleNorm, taste: r.normalizedTaste ?? r.taste * scaleNorm, finish: r.normalizedFinish ?? r.finish * scaleNorm,
        overall: r.normalizedScore ?? r.overall * scaleNorm, participantId: r.participantId,
      });
    }

    const results = [];
    for (const [key, data] of Object.entries(grouped)) {
      const { ratings: rList, whisky: w } = data;
      if (rList.length < 2) continue;

      const raters = new Set(rList.map(r => r.participantId));
      const avg = (arr: number[]) => Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;

      results.push({
        whiskyKey: key,
        name: w.name,
        distillery: w.distillery,
        whiskybaseId: w.whiskybaseId,
        avgOverall: avg(rList.map(r => r.overall)),
        avgNose: avg(rList.map(r => r.nose)),
        avgTaste: avg(rList.map(r => r.taste)),
        avgFinish: avg(rList.map(r => r.finish)),
        totalRatings: rList.length,
        totalRaters: raters.size,
        region: w.region,
        category: w.category,
        caskInfluence: w.caskInfluence,
        peatLevel: w.peatLevel,
        age: w.age,
        abv: w.abv,
        imageUrl: w.imageUrl,
      });
    }

    return results.sort((a, b) => b.avgOverall - a.avgOverall);
  }

  async getTasteTwins(participantId: string): Promise<Array<{
    participantId: string;
    participantName: string;
    correlation: number;
    sharedWhiskies: number;
  }>> {
    const myRatings = await db.select().from(ratings).where(eq(ratings.participantId, participantId));
    if (myRatings.length === 0) return [];

    const myWhiskyIds = myRatings.map(r => r.whiskyId);
    const otherRatings = await db.select().from(ratings)
      .where(and(
        ne(ratings.participantId, participantId),
        inArray(ratings.whiskyId, myWhiskyIds)
      ));

    const allTastingsForTwins = await db.select().from(tastings);
    const twinsScaleMap = new Map(allTastingsForTwins.map(t => [t.id, t.ratingScale ?? 100]));
    const twinsNorm = (r: typeof myRatings[0]) => 100 / (twinsScaleMap.get(r.tastingId) ?? 100);

    const myScores = new Map(myRatings.map(r => [r.whiskyId, r.normalizedScore ?? r.overall * twinsNorm(r)]));

    const byParticipant: Record<string, Array<{ whiskyId: string; score: number }>> = {};
    for (const r of otherRatings) {
      if (!byParticipant[r.participantId]) byParticipant[r.participantId] = [];
      byParticipant[r.participantId].push({ whiskyId: r.whiskyId, score: r.normalizedScore ?? r.overall * twinsNorm(r) });
    }

    const allParticipants = await db.select().from(participants);
    const nameMap = new Map(allParticipants.map(p => [p.id, p.name]));

    const twins = [];
    for (const [pid, pRatings] of Object.entries(byParticipant)) {
      if (pRatings.length < 3) continue;

      const pairs = pRatings
        .filter(r => myScores.has(r.whiskyId))
        .map(r => ({ mine: myScores.get(r.whiskyId)!, theirs: r.score }));

      if (pairs.length < 3) continue;

      const meanMine = pairs.reduce((s, p) => s + p.mine, 0) / pairs.length;
      const meanTheirs = pairs.reduce((s, p) => s + p.theirs, 0) / pairs.length;

      let num = 0, denA = 0, denB = 0;
      for (const p of pairs) {
        const dA = p.mine - meanMine;
        const dB = p.theirs - meanTheirs;
        num += dA * dB;
        denA += dA * dA;
        denB += dB * dB;
      }

      const correlation = denA > 0 && denB > 0 ? num / Math.sqrt(denA * denB) : 0;

      twins.push({
        participantId: pid,
        participantName: nameMap.get(pid) || "Unknown",
        correlation: Math.round(correlation * 100) / 100,
        sharedWhiskies: pairs.length,
      });
    }

    return twins.sort((a, b) => b.correlation - a.correlation).slice(0, 10);
  }

  // --- Tasting Photos ---
  async getTastingPhotos(tastingId: string): Promise<TastingPhoto[]> {
    return db.select().from(tastingPhotos).where(eq(tastingPhotos.tastingId, tastingId)).orderBy(desc(tastingPhotos.createdAt));
  }

  async createTastingPhoto(data: InsertTastingPhoto): Promise<TastingPhoto> {
    const [result] = await db.insert(tastingPhotos).values(data).returning();
    return result;
  }

  async updateTastingPhoto(id: string, participantId: string, data: Partial<{ caption: string; printable: boolean }>): Promise<TastingPhoto | undefined> {
    const [result] = await db.update(tastingPhotos).set(data).where(and(eq(tastingPhotos.id, id), eq(tastingPhotos.participantId, participantId))).returning();
    return result;
  }

  async updateTastingPhotoAsHost(id: string, hostParticipantId: string, data: Partial<{ caption: string; printable: boolean }>): Promise<TastingPhoto | undefined> {
    const photos = await db.select().from(tastingPhotos).where(eq(tastingPhotos.id, id)).limit(1);
    if (photos.length === 0 || !photos[0].tastingId) return undefined;
    const tasting = await this.getTasting(photos[0].tastingId);
    if (!tasting || tasting.hostId !== hostParticipantId) return undefined;
    const [result] = await db.update(tastingPhotos).set(data).where(eq(tastingPhotos.id, id)).returning();
    return result;
  }

  async deleteTastingPhoto(id: string, participantId: string): Promise<void> {
    await db.delete(tastingPhotos).where(and(eq(tastingPhotos.id, id), eq(tastingPhotos.participantId, participantId)));
  }

  // --- User Feedback ---
  async createUserFeedback(data: InsertUserFeedback): Promise<UserFeedback> {
    const [result] = await db.insert(userFeedback).values(data).returning();
    return result;
  }

  async getUserFeedback(): Promise<UserFeedback[]> {
    return db.select().from(userFeedback).orderBy(desc(userFeedback.createdAt));
  }

  // --- Notifications ---
  async getNotificationsForParticipant(participantId: string): Promise<Notification[]> {
    const personal = await db.select().from(notifications)
      .where(eq(notifications.recipientId, participantId))
      .orderBy(desc(notifications.createdAt));
    const global = await db.select().from(notifications)
      .where(eq(notifications.isGlobal, true))
      .orderBy(desc(notifications.createdAt));
    const merged = [...personal, ...global];
    const seen = new Set<string>();
    const unique = merged.filter(n => { if (seen.has(n.id)) return false; seen.add(n.id); return true; });
    unique.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
    return unique;
  }

  async createNotification(data: InsertNotification): Promise<Notification> {
    const [result] = await db.insert(notifications).values(data).returning();
    return result;
  }

  async markNotificationRead(notificationId: string, participantId: string): Promise<void> {
    const [notif] = await db.select().from(notifications).where(eq(notifications.id, notificationId)).limit(1);
    if (!notif) return;
    const readByList: string[] = JSON.parse(notif.readBy || "[]");
    if (!readByList.includes(participantId)) {
      readByList.push(participantId);
      await db.update(notifications).set({ readBy: JSON.stringify(readByList) }).where(eq(notifications.id, notificationId));
    }
  }

  async markAllNotificationsRead(participantId: string): Promise<void> {
    const all = await this.getNotificationsForParticipant(participantId);
    for (const notif of all) {
      const readByList: string[] = JSON.parse(notif.readBy || "[]");
      if (!readByList.includes(participantId)) {
        readByList.push(participantId);
        await db.update(notifications).set({ readBy: JSON.stringify(readByList) }).where(eq(notifications.id, notif.id));
      }
    }
  }

  async getUnreadNotificationCount(participantId: string): Promise<number> {
    const all = await this.getNotificationsForParticipant(participantId);
    return all.filter(n => {
      const readByList: string[] = JSON.parse(n.readBy || "[]");
      return !readByList.includes(participantId);
    }).length;
  }

  async getChangelogEntries(options?: { category?: string; from?: string; to?: string; visibleOnly?: boolean }): Promise<ChangelogEntry[]> {
    let query = db.select().from(changelogEntries).orderBy(desc(changelogEntries.date));
    const results = await query;
    let filtered = results;
    if (options?.visibleOnly) {
      filtered = filtered.filter(e => e.visible);
    }
    if (options?.category && options.category !== "all") {
      filtered = filtered.filter(e => e.category === options.category);
    }
    if (options?.from) {
      filtered = filtered.filter(e => e.date >= options.from!);
    }
    if (options?.to) {
      filtered = filtered.filter(e => e.date <= options.to!);
    }
    return filtered;
  }

  async getChangelogEntry(id: string): Promise<ChangelogEntry | undefined> {
    const [entry] = await db.select().from(changelogEntries).where(eq(changelogEntries.id, id));
    return entry;
  }

  async createChangelogEntry(data: InsertChangelogEntry): Promise<ChangelogEntry> {
    const [result] = await db.insert(changelogEntries).values(data).returning();
    return result;
  }

  async updateChangelogEntry(id: string, data: Partial<InsertChangelogEntry>): Promise<ChangelogEntry> {
    const [result] = await db.update(changelogEntries)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(changelogEntries.id, id))
      .returning();
    return result;
  }

  async deleteChangelogEntry(id: string): Promise<void> {
    await db.delete(changelogEntries).where(eq(changelogEntries.id, id));
  }

  // --- Session Presence ---
  async upsertPresence(tastingId: string, participantId: string): Promise<void> {
    const existing = await db.select().from(sessionPresence)
      .where(and(eq(sessionPresence.tastingId, tastingId), eq(sessionPresence.participantId, participantId)));
    if (existing.length > 0) {
      await db.update(sessionPresence)
        .set({ lastSeenAt: new Date() })
        .where(and(eq(sessionPresence.tastingId, tastingId), eq(sessionPresence.participantId, participantId)));
    } else {
      await db.insert(sessionPresence).values({ tastingId, participantId, lastSeenAt: new Date() });
    }
  }

  async getActiveParticipants(tastingId: string, thresholdSeconds: number = 60): Promise<{ participantId: string; participantName: string; lastSeenAt: Date }[]> {
    const cutoff = new Date(Date.now() - thresholdSeconds * 1000);
    const results = await db.select({
      participantId: sessionPresence.participantId,
      participantName: participants.name,
      lastSeenAt: sessionPresence.lastSeenAt,
    })
    .from(sessionPresence)
    .innerJoin(participants, eq(sessionPresence.participantId, participants.id))
    .where(and(
      eq(sessionPresence.tastingId, tastingId),
      sql`${sessionPresence.lastSeenAt} > ${cutoff}`
    ));
    return results;
  }

  async cleanupStalePresence(thresholdSeconds: number = 300): Promise<void> {
    const cutoff = new Date(Date.now() - thresholdSeconds * 1000);
    await db.delete(sessionPresence).where(sql`${sessionPresence.lastSeenAt} < ${cutoff}`);
  }

  async getAppSettings(): Promise<Record<string, string>> {
    const rows = await db.select().from(appSettings);
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  }

  async getAppSetting(key: string): Promise<string | null> {
    const [row] = await db.select().from(appSettings).where(eq(appSettings.key, key));
    return row ? row.value : null;
  }

  async setAppSetting(key: string, value: string): Promise<void> {
    await db.insert(appSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } });
  }

  async setAppSettings(settings: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(settings)) {
      await this.setAppSetting(key, value);
    }
  }

  async setTastingTestFlag(id: string, isTest: boolean): Promise<Tasting | undefined> {
    const [result] = await db.update(tastings).set({ isTestData: isTest }).where(eq(tastings.id, id)).returning();
    return result;
  }

  async bulkCleanupTastings(
    filter: { titlePattern?: string; beforeDate?: string; maxParticipants?: number; onlyTestData?: boolean },
    action: "preview" | "markAsTest" | "delete"
  ): Promise<{ count: number; tastings: Array<{ id: string; title: string; date: string; participantCount: number; isTestData: boolean }> }> {
    const allTastings = await db.select().from(tastings).where(ne(tastings.status, "deleted"));

    const participantCounts = await db.select({
      tastingId: tastingParticipants.tastingId,
      count: sql<number>`count(*)::int`,
    }).from(tastingParticipants).groupBy(tastingParticipants.tastingId);
    const countMap = new Map(participantCounts.map(p => [p.tastingId, p.count]));

    let filtered = allTastings.filter(t => {
      if (filter.titlePattern) {
        const pattern = filter.titlePattern.toLowerCase();
        if (!t.title.toLowerCase().includes(pattern)) return false;
      }
      if (filter.beforeDate) {
        if (t.date >= filter.beforeDate) return false;
      }
      if (filter.maxParticipants !== undefined && filter.maxParticipants !== null) {
        const pc = countMap.get(t.id) || 0;
        if (pc > filter.maxParticipants) return false;
      }
      if (filter.onlyTestData) {
        if (!t.isTestData) return false;
      }
      return true;
    });

    const result = filtered.map(t => ({
      id: t.id,
      title: t.title,
      date: t.date,
      participantCount: countMap.get(t.id) || 0,
      isTestData: t.isTestData ?? false,
    }));

    if (action === "markAsTest") {
      const ids = filtered.map(t => t.id);
      if (ids.length > 0) {
        await db.update(tastings).set({ isTestData: true }).where(inArray(tastings.id, ids));
      }
    } else if (action === "delete") {
      for (const t of filtered) {
        await this.hardDeleteTasting(t.id);
      }
    }

    return { count: result.length, tastings: result };
  }

  // --- Communities ---
  async getCommunities(): Promise<Community[]> {
    return db.select().from(communities).orderBy(asc(communities.name));
  }

  async getCommunityBySlug(slug: string): Promise<Community | undefined> {
    const [result] = await db.select().from(communities).where(eq(communities.slug, slug)).limit(1);
    return result;
  }

  async getCommunityById(id: string): Promise<Community | undefined> {
    const [result] = await db.select().from(communities).where(eq(communities.id, id)).limit(1);
    return result;
  }

  async createCommunity(data: InsertCommunity): Promise<Community> {
    const [result] = await db.insert(communities).values(data).returning();
    return result;
  }

  async updateCommunity(id: string, data: Partial<Community>): Promise<Community | undefined> {
    const [result] = await db.update(communities).set({ ...data, updatedAt: new Date() }).where(eq(communities.id, id)).returning();
    return result;
  }

  async getCommunityMemberships(communityId: string): Promise<(CommunityMembership & { participantName?: string; participantEmail?: string })[]> {
    const rows = await db.select({
      id: communityMemberships.id,
      communityId: communityMemberships.communityId,
      participantId: communityMemberships.participantId,
      role: communityMemberships.role,
      status: communityMemberships.status,
      createdAt: communityMemberships.createdAt,
      updatedAt: communityMemberships.updatedAt,
      participantName: participants.name,
      participantEmail: participants.email,
    })
    .from(communityMemberships)
    .leftJoin(participants, eq(communityMemberships.participantId, participants.id))
    .where(and(eq(communityMemberships.communityId, communityId), eq(communityMemberships.status, "active")))
    .orderBy(asc(communityMemberships.role));
    return rows.map(r => ({ ...r, participantName: r.participantName ?? undefined, participantEmail: r.participantEmail ?? undefined }));
  }

  async getParticipantCommunities(participantId: string): Promise<Community[]> {
    const rows = await db.select({ community: communities })
      .from(communityMemberships)
      .innerJoin(communities, eq(communityMemberships.communityId, communities.id))
      .where(and(eq(communityMemberships.participantId, participantId), eq(communityMemberships.status, "active")));
    return rows.map(r => r.community);
  }

  async addCommunityMember(data: InsertCommunityMembership): Promise<CommunityMembership> {
    const existing = await db.select().from(communityMemberships)
      .where(and(eq(communityMemberships.communityId, data.communityId), eq(communityMemberships.participantId, data.participantId)))
      .limit(1);
    if (existing.length > 0) {
      const [updated] = await db.update(communityMemberships)
        .set({ status: "active", role: data.role || "member", updatedAt: new Date() })
        .where(eq(communityMemberships.id, existing[0].id))
        .returning();
      return updated;
    }
    const [result] = await db.insert(communityMemberships).values(data).returning();
    return result;
  }

  async removeCommunityMember(communityId: string, participantId: string): Promise<void> {
    await db.update(communityMemberships)
      .set({ status: "removed", updatedAt: new Date() })
      .where(and(eq(communityMemberships.communityId, communityId), eq(communityMemberships.participantId, participantId)));
  }

  async isCommunityMember(communityId: string, participantId: string): Promise<boolean> {
    const [result] = await db.select({ id: communityMemberships.id })
      .from(communityMemberships)
      .where(and(
        eq(communityMemberships.communityId, communityId),
        eq(communityMemberships.participantId, participantId),
        eq(communityMemberships.status, "active")
      ))
      .limit(1);
    return !!result;
  }

  // --- Historical Tastings ---

  async getAccessibleHistoricalTastingIds(communityIds: string[], isAdmin: boolean): Promise<string[] | "all"> {
    if (isAdmin) return "all";
    const publicCondition = sql`${historicalTastings.visibilityLevel} IN ('public_full','public_aggregated')`;
    let whereClause;
    if (communityIds.length > 0) {
      const communityCondition = sql`(${historicalTastings.communityId} IN (${sql.join(communityIds.map(id => sql`${id}`), sql`,`)}) AND ${historicalTastings.visibilityLevel} IN ('community_only','public_full','public_aggregated'))`;
      whereClause = sql`(${publicCondition} OR ${communityCondition})`;
    } else {
      whereClause = publicCondition;
    }
    const rows = await db.select({ id: historicalTastings.id }).from(historicalTastings).where(whereClause);
    return rows.map(r => r.id);
  }

  async getHistoricalTastings(options?: { limit?: number; offset?: number; search?: string; tastingIds?: string[] }): Promise<{ tastings: HistoricalTasting[]; total: number }> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;
    const search = options?.search?.trim();

    const buildWhere = () => {
      const conditions = [];
      if (options?.tastingIds) {
        if (options.tastingIds.length === 0) return sql`1=0`;
        conditions.push(inArray(historicalTastings.id, options.tastingIds));
      }
      if (search) {
        const pattern = `%${search}%`;
        conditions.push(sql`(${historicalTastings.titleDe} ILIKE ${pattern} OR ${historicalTastings.titleEn} ILIKE ${pattern} OR CAST(${historicalTastings.tastingNumber} AS TEXT) = ${search})`);
      }
      return conditions.length > 0 ? (conditions.length === 1 ? conditions[0] : sql`${sql.join(conditions, sql` AND `)}`) : undefined;
    };

    const where = buildWhere();
    const countQuery = await db.select({ count: sql<number>`count(*)::int` }).from(historicalTastings).where(where);
    const dataQuery = await db.select().from(historicalTastings).where(where)
      .orderBy(asc(historicalTastings.tastingNumber))
      .limit(limit)
      .offset(offset);

    return { tastings: dataQuery, total: countQuery[0]?.count ?? 0 };
  }

  async getHistoricalTastingsEnriched(options?: { limit?: number; offset?: number; search?: string; tastingIds?: string[] }): Promise<{ tastings: Array<HistoricalTasting & { avgTotalScore: number | null; winnerDistillery: string | null; winnerName: string | null; winnerScore: number | null }>; total: number }> {
    const base = await this.getHistoricalTastings(options);
    if (base.tastings.length === 0) return { tastings: [], total: base.total };

    const ids = base.tastings.map(t => t.id);
    const entries = await db.select().from(historicalTastingEntries).where(inArray(historicalTastingEntries.historicalTastingId, ids));

    const grouped = new Map<string, HistoricalTastingEntry[]>();
    for (const e of entries) {
      const arr = grouped.get(e.historicalTastingId) || [];
      arr.push(e);
      grouped.set(e.historicalTastingId, arr);
    }

    const enriched = base.tastings.map(t => {
      const tEntries = grouped.get(t.id) || [];
      const normScores = tEntries
        .map(e => e.normalizedTotal ?? (e.totalScore != null ? e.totalScore * 10 : null))
        .filter((s): s is number => s != null);
      const avgTotalScore = normScores.length > 0 ? normScores.reduce((a, b) => a + b, 0) / normScores.length : null;
      const winner = tEntries.reduce<HistoricalTastingEntry | null>((best, e) => {
        if (e.totalRank === 1) return e;
        if (!best && e.totalScore != null) return e;
        if (best && e.totalScore != null && (best.totalScore == null || e.totalScore > best.totalScore)) return e;
        return best;
      }, null);
      const winnerNorm = winner ? (winner.normalizedTotal ?? (winner.totalScore != null ? winner.totalScore * 10 : null)) : null;
      return {
        ...t,
        avgTotalScore: avgTotalScore != null ? Math.round(avgTotalScore) : null,
        winnerDistillery: winner?.distilleryRaw ?? null,
        winnerName: winner?.whiskyNameRaw ?? null,
        winnerScore: winnerNorm != null ? Math.round(winnerNorm) : null,
      };
    });

    return { tastings: enriched, total: base.total };
  }

  async getHistoricalTasting(id: string): Promise<(HistoricalTasting & { entries: HistoricalTastingEntry[] }) | undefined> {
    const [tasting] = await db.select().from(historicalTastings).where(eq(historicalTastings.id, id));
    if (!tasting) return undefined;
    const entries = await db.select().from(historicalTastingEntries)
      .where(eq(historicalTastingEntries.historicalTastingId, id))
      .orderBy(asc(historicalTastingEntries.totalRank));
    return { ...tasting, entries };
  }

  async getHistoricalTastingEntries(tastingId: string): Promise<HistoricalTastingEntry[]> {
    return db.select().from(historicalTastingEntries)
      .where(eq(historicalTastingEntries.historicalTastingId, tastingId))
      .orderBy(asc(historicalTastingEntries.totalRank));
  }

  async getAllHistoricalTastingEntries(tastingIds?: string[]): Promise<HistoricalTastingEntry[]> {
    if (tastingIds) {
      if (tastingIds.length === 0) return [];
      return db.select().from(historicalTastingEntries).where(inArray(historicalTastingEntries.historicalTastingId, tastingIds));
    }
    return db.select().from(historicalTastingEntries);
  }

  async getHistoricalWhiskyStats(tastingIds?: string[]): Promise<{
    totalTastings: number;
    totalEntries: number;
    topWhiskies: Array<{ distillery: string | null; name: string | null; totalScore: number | null; normalizedTotal: number | null; tastingNumber: number }>;
    regionBreakdown: Record<string, number>;
    smokyBreakdown: { smoky: number; nonSmoky: number; unknown: number };
    caskBreakdown: Record<string, number>;
    scoreDistribution: Array<{ range: string; count: number }>;
  }> {
    const emptyResult = {
      totalTastings: 0, totalEntries: 0, topWhiskies: [],
      regionBreakdown: {}, smokyBreakdown: { smoky: 0, nonSmoky: 0, unknown: 0 },
      caskBreakdown: {}, scoreDistribution: [
        { range: "0–10", count: 0 }, { range: "10–20", count: 0 }, { range: "20–30", count: 0 },
        { range: "30–40", count: 0 }, { range: "40–50", count: 0 }, { range: "50–60", count: 0 },
        { range: "60–70", count: 0 }, { range: "70–80", count: 0 }, { range: "80–90", count: 0 },
        { range: "90–100", count: 0 },
      ],
    };
    if (tastingIds && tastingIds.length === 0) return emptyResult;

    const tastingFilter = tastingIds ? inArray(historicalTastings.id, tastingIds) : undefined;
    const entryFilter = tastingIds ? inArray(historicalTastingEntries.historicalTastingId, tastingIds) : undefined;

    const [tastingCount] = await db.select({ count: sql<number>`count(*)::int` }).from(historicalTastings).where(tastingFilter);
    const [entryCount] = await db.select({ count: sql<number>`count(*)::int` }).from(historicalTastingEntries).where(entryFilter);

    const entryScoreFilter = tastingIds
      ? sql`COALESCE(${historicalTastingEntries.normalizedTotal}, ${historicalTastingEntries.totalScore}) IS NOT NULL AND ${historicalTastingEntries.historicalTastingId} IN (${sql.join(tastingIds.map(id => sql`${id}`), sql`,`)})`
      : sql`COALESCE(${historicalTastingEntries.normalizedTotal}, ${historicalTastingEntries.totalScore}) IS NOT NULL`;

    const topWhiskiesRows = await db
      .select({
        distillery: historicalTastingEntries.distilleryRaw,
        name: historicalTastingEntries.whiskyNameRaw,
        totalScore: historicalTastingEntries.totalScore,
        normalizedTotal: historicalTastingEntries.normalizedTotal,
        tastingNumber: historicalTastings.tastingNumber,
      })
      .from(historicalTastingEntries)
      .innerJoin(historicalTastings, eq(historicalTastingEntries.historicalTastingId, historicalTastings.id))
      .where(entryScoreFilter)
      .orderBy(desc(sql`LEAST(COALESCE(${historicalTastingEntries.normalizedTotal}, ${historicalTastingEntries.totalScore} * 10), 100)`))
      .limit(20);

    const topWhiskies = topWhiskiesRows.map(r => ({
      distillery: r.distillery,
      name: r.name,
      totalScore: r.totalScore,
      normalizedTotal: (() => { const v = r.normalizedTotal ?? (r.totalScore != null ? r.totalScore * 10 : null); return v != null ? Math.min(v, 100) : null; })(),
      tastingNumber: r.tastingNumber,
    }));

    const regionBaseFilter = tastingIds
      ? sql`COALESCE(${historicalTastingEntries.normalizedRegion}, ${historicalTastingEntries.regionRaw}) IS NOT NULL AND ${historicalTastingEntries.historicalTastingId} IN (${sql.join(tastingIds.map(id => sql`${id}`), sql`,`)})`
      : sql`COALESCE(${historicalTastingEntries.normalizedRegion}, ${historicalTastingEntries.regionRaw}) IS NOT NULL`;

    const regionRows = await db
      .select({
        region: sql<string>`COALESCE(${historicalTastingEntries.normalizedRegion}, ${historicalTastingEntries.regionRaw})`,
        count: sql<number>`count(*)::int`,
      })
      .from(historicalTastingEntries)
      .where(regionBaseFilter)
      .groupBy(sql`COALESCE(${historicalTastingEntries.normalizedRegion}, ${historicalTastingEntries.regionRaw})`);

    const regionBreakdown: Record<string, number> = {};
    for (const r of regionRows) {
      regionBreakdown[r.region] = r.count;
    }

    const caskBaseFilter = tastingIds
      ? sql`COALESCE(${historicalTastingEntries.normalizedCask}, ${historicalTastingEntries.caskRaw}) IS NOT NULL AND ${historicalTastingEntries.historicalTastingId} IN (${sql.join(tastingIds.map(id => sql`${id}`), sql`,`)})`
      : sql`COALESCE(${historicalTastingEntries.normalizedCask}, ${historicalTastingEntries.caskRaw}) IS NOT NULL`;

    const caskRows = await db
      .select({
        cask: sql<string>`COALESCE(${historicalTastingEntries.normalizedCask}, ${historicalTastingEntries.caskRaw})`,
        count: sql<number>`count(*)::int`,
      })
      .from(historicalTastingEntries)
      .where(caskBaseFilter)
      .groupBy(sql`COALESCE(${historicalTastingEntries.normalizedCask}, ${historicalTastingEntries.caskRaw})`);

    const caskBreakdown: Record<string, number> = {};
    for (const r of caskRows) {
      caskBreakdown[r.cask] = r.count;
    }

    const smokyRows = await db
      .select({
        smoky: sql<number>`count(*) FILTER (WHERE ${historicalTastingEntries.normalizedIsSmoky} = true)::int`,
        nonSmoky: sql<number>`count(*) FILTER (WHERE ${historicalTastingEntries.normalizedIsSmoky} = false)::int`,
        unknown: sql<number>`count(*) FILTER (WHERE ${historicalTastingEntries.normalizedIsSmoky} IS NULL)::int`,
      })
      .from(historicalTastingEntries)
      .where(entryFilter);

    const smokyBreakdown = {
      smoky: smokyRows[0]?.smoky ?? 0,
      nonSmoky: smokyRows[0]?.nonSmoky ?? 0,
      unknown: smokyRows[0]?.unknown ?? 0,
    };

    const scoreDistFilter = tastingIds
      ? sql`COALESCE(${historicalTastingEntries.normalizedTotal}, ${historicalTastingEntries.totalScore} * 10) IS NOT NULL AND COALESCE(${historicalTastingEntries.normalizedTotal}, ${historicalTastingEntries.totalScore} * 10) >= 0 AND ${historicalTastingEntries.historicalTastingId} IN (${sql.join(tastingIds.map(id => sql`${id}`), sql`,`)})`
      : sql`COALESCE(${historicalTastingEntries.normalizedTotal}, ${historicalTastingEntries.totalScore} * 10) IS NOT NULL AND COALESCE(${historicalTastingEntries.normalizedTotal}, ${historicalTastingEntries.totalScore} * 10) >= 0`;

    const scoreDistRows = await db
      .select({
        bucket: sql<number>`LEAST(FLOOR(COALESCE(${historicalTastingEntries.normalizedTotal}, ${historicalTastingEntries.totalScore} * 10) / 10)::int, 9)`,
        count: sql<number>`count(*)::int`,
      })
      .from(historicalTastingEntries)
      .where(scoreDistFilter)
      .groupBy(sql`LEAST(FLOOR(COALESCE(${historicalTastingEntries.normalizedTotal}, ${historicalTastingEntries.totalScore} * 10) / 10)::int, 9)`);

    const scoreRanges = [
      { range: "0–10", count: 0 },
      { range: "10–20", count: 0 },
      { range: "20–30", count: 0 },
      { range: "30–40", count: 0 },
      { range: "40–50", count: 0 },
      { range: "50–60", count: 0 },
      { range: "60–70", count: 0 },
      { range: "70–80", count: 0 },
      { range: "80–90", count: 0 },
      { range: "90–100", count: 0 },
    ];
    for (const r of scoreDistRows) {
      const idx = r.bucket;
      if (idx >= 0 && idx < 10) scoreRanges[idx].count = r.count;
    }

    return {
      totalTastings: tastingCount?.count ?? 0,
      totalEntries: entryCount?.count ?? 0,
      topWhiskies,
      regionBreakdown,
      smokyBreakdown,
      caskBreakdown,
      scoreDistribution: scoreRanges,
    };
  }

  async createHistoricalTasting(data: InsertHistoricalTasting): Promise<HistoricalTasting> {
    const [result] = await db.insert(historicalTastings).values(data)
      .onConflictDoUpdate({
        target: historicalTastings.sourceKey,
        set: { ...data, updatedAt: new Date() },
      })
      .returning();
    return result;
  }

  async createHistoricalTastingEntry(data: InsertHistoricalTastingEntry): Promise<HistoricalTastingEntry> {
    const [result] = await db.insert(historicalTastingEntries).values(data)
      .onConflictDoUpdate({
        target: historicalTastingEntries.sourceWhiskyKey,
        set: { ...data, updatedAt: new Date() },
      })
      .returning();
    return result;
  }

  async createHistoricalImportRun(data: InsertHistoricalImportRun): Promise<HistoricalImportRun> {
    const [result] = await db.insert(historicalImportRuns).values(data).returning();
    return result;
  }

  async updateHistoricalImportRun(id: string, data: Partial<HistoricalImportRun>): Promise<HistoricalImportRun | undefined> {
    const { id: _id, createdAt: _ca, ...updateData } = data as any;
    const [result] = await db.update(historicalImportRuns).set(updateData).where(eq(historicalImportRuns.id, id)).returning();
    return result;
  }

  async getHistoricalImportRuns(): Promise<HistoricalImportRun[]> {
    return db.select().from(historicalImportRuns).orderBy(desc(historicalImportRuns.createdAt));
  }

  // --- Connoisseur Reports ---
  async createConnoisseurReport(data: InsertConnoisseurReport): Promise<ConnoisseurReport> {
    const [result] = await db.insert(connoisseurReports).values(data).returning();
    return result;
  }

  async getConnoisseurReports(participantId: string): Promise<ConnoisseurReport[]> {
    return db.select().from(connoisseurReports).where(eq(connoisseurReports.participantId, participantId)).orderBy(desc(connoisseurReports.generatedAt));
  }

  async getConnoisseurReport(id: string): Promise<ConnoisseurReport | undefined> {
    const [result] = await db.select().from(connoisseurReports).where(eq(connoisseurReports.id, id));
    return result;
  }

  async deleteConnoisseurReport(id: string): Promise<void> {
    await db.delete(connoisseurReports).where(eq(connoisseurReports.id, id));
  }

  // --- Voice Memos ---
  async createVoiceMemo(data: InsertVoiceMemo): Promise<VoiceMemo> {
    const [result] = await db.insert(voiceMemos).values(data).returning();
    return result;
  }

  async getVoiceMemosForWhisky(tastingId: string, whiskyId: string): Promise<VoiceMemo[]> {
    return db.select().from(voiceMemos).where(and(eq(voiceMemos.tastingId, tastingId), eq(voiceMemos.whiskyId, whiskyId))).orderBy(asc(voiceMemos.createdAt));
  }

  async getVoiceMemosForTasting(tastingId: string): Promise<VoiceMemo[]> {
    return db.select().from(voiceMemos).where(eq(voiceMemos.tastingId, tastingId)).orderBy(asc(voiceMemos.createdAt));
  }

  async deleteVoiceMemo(id: string, participantId: string): Promise<void> {
    await db.delete(voiceMemos).where(and(eq(voiceMemos.id, id), eq(voiceMemos.participantId, participantId)));
  }

  // --- Whisky Gallery ---
  async getWhiskyGallery(whiskyId: string): Promise<WhiskyGalleryPhoto[]> {
    return db.select().from(whiskyGallery).where(eq(whiskyGallery.whiskyId, whiskyId)).orderBy(desc(whiskyGallery.createdAt));
  }

  async addWhiskyGalleryPhoto(data: InsertWhiskyGallery): Promise<WhiskyGalleryPhoto> {
    const [result] = await db.insert(whiskyGallery).values(data).returning();
    return result;
  }

  async getWhiskyGalleryCount(whiskyId: string): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)::int` }).from(whiskyGallery).where(eq(whiskyGallery.whiskyId, whiskyId));
    return result?.count || 0;
  }

  // --- User Activity Sessions ---
  async upsertActivitySession(participantId: string, pageContext?: string): Promise<void> {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const [existing] = await db.select().from(userActivitySessions)
      .where(and(
        eq(userActivitySessions.participantId, participantId),
        gte(userActivitySessions.endedAt, fiveMinAgo),
      ))
      .orderBy(desc(userActivitySessions.endedAt))
      .limit(1);

    const now = new Date();
    if (existing) {
      const durationMs = now.getTime() - new Date(existing.startedAt).getTime();
      const durationMinutes = Math.round(durationMs / 60000);
      await db.update(userActivitySessions)
        .set({ endedAt: now, durationMinutes })
        .where(eq(userActivitySessions.id, existing.id));
    } else {
      await db.insert(userActivitySessions).values({
        participantId,
        startedAt: now,
        endedAt: now,
        durationMinutes: 0,
        pageContext: pageContext || null,
      });
    }
  }

  async getActivitySessions(filters: {
    participantId?: string;
    from?: Date;
    to?: Date;
    minDuration?: number;
    limit?: number;
    offset?: number;
  }): Promise<UserActivitySession[]> {
    const conditions = [];
    if (filters.participantId) conditions.push(eq(userActivitySessions.participantId, filters.participantId));
    if (filters.from) conditions.push(gte(userActivitySessions.startedAt, filters.from));
    if (filters.to) conditions.push(sql`${userActivitySessions.startedAt} <= ${filters.to}`);
    if (filters.minDuration) conditions.push(gte(userActivitySessions.durationMinutes, filters.minDuration));

    let query = db.select().from(userActivitySessions);
    if (conditions.length > 0) query = query.where(and(...conditions)) as typeof query;
    query = query.orderBy(desc(userActivitySessions.startedAt)) as typeof query;
    if (filters.limit) query = query.limit(filters.limit) as typeof query;
    if (filters.offset) query = query.offset(filters.offset) as typeof query;
    return query;
  }

  async getActivitySummary(from?: Date, to?: Date): Promise<{
    totalSessions: number;
    uniqueUsers: number;
    avgDurationMinutes: number;
    totalMinutes: number;
    byDay: { date: string; sessions: number; uniqueUsers: number }[];
    byHour: { hour: number; sessions: number }[];
    topUsers: { id: string; name: string; email: string; sessions: number; totalMinutes: number; lastActive: Date | null }[];
  }> {
    const conditions = [];
    if (from) conditions.push(gte(userActivitySessions.startedAt, from));
    if (to) conditions.push(sql`${userActivitySessions.startedAt} <= ${to}`);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totals] = await db.select({
      totalSessions: sql<number>`count(*)::int`,
      uniqueUsers: sql<number>`count(distinct ${userActivitySessions.participantId})::int`,
      avgDuration: sql<number>`coalesce(avg(${userActivitySessions.durationMinutes}), 0)::int`,
      totalMinutes: sql<number>`coalesce(sum(${userActivitySessions.durationMinutes}), 0)::int`,
    }).from(userActivitySessions).where(whereClause);

    const byDay = await db.select({
      date: sql<string>`to_char(${userActivitySessions.startedAt}, 'YYYY-MM-DD')`,
      sessions: sql<number>`count(*)::int`,
      uniqueUsers: sql<number>`count(distinct ${userActivitySessions.participantId})::int`,
    }).from(userActivitySessions).where(whereClause)
      .groupBy(sql`to_char(${userActivitySessions.startedAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${userActivitySessions.startedAt}, 'YYYY-MM-DD')`);

    const byHour = await db.select({
      hour: sql<number>`extract(hour from ${userActivitySessions.startedAt})::int`,
      sessions: sql<number>`count(*)::int`,
    }).from(userActivitySessions).where(whereClause)
      .groupBy(sql`extract(hour from ${userActivitySessions.startedAt})`)
      .orderBy(sql`extract(hour from ${userActivitySessions.startedAt})`);

    const topUsers = await db.select({
      id: userActivitySessions.participantId,
      name: participants.name,
      email: participants.email,
      sessions: sql<number>`count(*)::int`,
      totalMinutes: sql<number>`coalesce(sum(${userActivitySessions.durationMinutes}), 0)::int`,
      lastActive: sql<Date | null>`max(${userActivitySessions.endedAt})`,
    }).from(userActivitySessions)
      .leftJoin(participants, eq(userActivitySessions.participantId, participants.id))
      .where(whereClause)
      .groupBy(userActivitySessions.participantId, participants.name, participants.email)
      .orderBy(sql`count(*) desc`)
      .limit(50);

    return {
      totalSessions: totals?.totalSessions || 0,
      uniqueUsers: totals?.uniqueUsers || 0,
      avgDurationMinutes: totals?.avgDuration || 0,
      totalMinutes: totals?.totalMinutes || 0,
      byDay: byDay as { date: string; sessions: number; uniqueUsers: number }[],
      byHour: byHour as { hour: number; sessions: number }[],
      topUsers: topUsers as { id: string; name: string; email: string; sessions: number; totalMinutes: number; lastActive: Date | null }[],
    };
  }

  // --- Flavour Categories & Descriptors ---
  async getFlavourCategories(): Promise<FlavourCategory[]> {
    return db.select().from(flavourCategories).orderBy(asc(flavourCategories.sortOrder));
  }

  async createFlavourCategory(data: InsertFlavourCategory): Promise<FlavourCategory> {
    const [result] = await db.insert(flavourCategories).values(data).returning();
    return result;
  }

  async updateFlavourCategory(id: string, data: Partial<Omit<InsertFlavourCategory, "id">>): Promise<FlavourCategory | undefined> {
    const [result] = await db.update(flavourCategories).set(data).where(eq(flavourCategories.id, id)).returning();
    return result;
  }

  async deleteFlavourCategory(id: string): Promise<void> {
    await db.delete(flavourDescriptors).where(eq(flavourDescriptors.categoryId, id));
    await db.delete(flavourCategories).where(eq(flavourCategories.id, id));
  }

  async getFlavourDescriptors(categoryId?: string): Promise<FlavourDescriptor[]> {
    if (categoryId) {
      return db.select().from(flavourDescriptors).where(eq(flavourDescriptors.categoryId, categoryId)).orderBy(asc(flavourDescriptors.sortOrder));
    }
    return db.select().from(flavourDescriptors).orderBy(asc(flavourDescriptors.sortOrder));
  }

  async createFlavourDescriptor(data: InsertFlavourDescriptor): Promise<FlavourDescriptor> {
    const [result] = await db.insert(flavourDescriptors).values(data).returning();
    return result;
  }

  async updateFlavourDescriptor(id: string, data: Partial<Omit<InsertFlavourDescriptor, "id">>): Promise<FlavourDescriptor | undefined> {
    const [result] = await db.update(flavourDescriptors).set(data).where(eq(flavourDescriptors.id, id)).returning();
    return result;
  }

  async deleteFlavourDescriptor(id: string): Promise<void> {
    await db.delete(flavourDescriptors).where(eq(flavourDescriptors.id, id));
  }
}

export const storage = new DatabaseStorage();
