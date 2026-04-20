import { eq, ne, and, or, asc, desc, sql, inArray, gte, isNull, isNotNull, lt, type SQL } from "drizzle-orm";
import { db } from "./db";
import { markJournalUpdated } from "./whiskyDnaCache";
import { canonicalizeDistilleryName } from "@shared/distillery-normalizer";
import { getParticipantOverallScores, computeStabilityScore } from "./participant-scores";
import {
  participants, tastings, tastingParticipants, sharingParticipants, whiskies, whiskyHandoutLibrary, pdfSplitSessions, ratings,
  profiles, sessionInvites, discussionEntries, reflectionEntries, whiskyFriends, whiskyGroups, whiskyGroupMembers, journalEntries, benchmarkEntries, wishlistEntries,
  newsletters, newsletterRecipients, whiskybaseCollection, tastingReminders, reminderLog, encyclopediaSuggestions, tastingPhotos, userFeedback,
  type InsertParticipant, type Participant,
  type InsertTasting, type Tasting,
  type InsertTastingParticipant, type TastingParticipant,
  type InsertSharingParticipant, type SharingParticipant,
  type InsertWhisky, type Whisky,
  type InsertWhiskyHandoutLibraryEntry, type WhiskyHandoutLibraryEntry,
  type PdfSplitSession, type PdfSplitPage,
  type InsertRating, type Rating,
  type InsertProfile, type Profile,
  type InsertSessionInvite, type SessionInvite,
  type InsertDiscussionEntry, type DiscussionEntry,
  type InsertReflectionEntry, type ReflectionEntry,
  type InsertWhiskyFriend, type WhiskyFriend,
  type InsertWhiskyGroup, type WhiskyGroup,
  type InsertWhiskyGroupMember, type WhiskyGroupMember,
  type InsertJournalEntry, type JournalEntry,
  type InsertBenchmarkEntry, type BenchmarkEntry,
  type InsertWishlistEntry, type WishlistEntry,
  type InsertNewsletter, type Newsletter,
  type InsertWhiskybaseCollection, type WhiskybaseCollectionItem,
  collectionSyncLog,
  type InsertCollectionSyncLog, type CollectionSyncLog,
  collectionImportLog,
  type InsertCollectionImportLog, type CollectionImportLog,
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
  historicalTastingParticipants,
  historicalPersonalRatings,
  type InsertHistoricalTasting, type HistoricalTasting,
  type InsertHistoricalTastingEntry, type HistoricalTastingEntry,
  type InsertHistoricalImportRun, type HistoricalImportRun,
  type InsertHistoricalTastingParticipant, type HistoricalTastingParticipant,
  type InsertHistoricalPersonalRating, type HistoricalPersonalRating,
  communities,
  communityMemberships,
  communityInvites,
  type InsertCommunity, type Community,
  type InsertCommunityMembership, type CommunityMembership,
  type InsertCommunityInvite, type CommunityInvite,
  connoisseurReports,
  type InsertConnoisseurReport, type ConnoisseurReport,
  voiceMemos,
  type InsertVoiceMemo, type VoiceMemo,
  whiskyGallery,
  type InsertWhiskyGallery, type WhiskyGalleryPhoto,
  userActivitySessions,
  type UserActivitySession,
  pageViews,
  type PageView,
  flavourCategories,
  flavourDescriptors,
  type InsertFlavourCategory, type FlavourCategory,
  type InsertFlavourDescriptor, type FlavourDescriptor,
  distilleries,
  type InsertDistillery, type Distillery,
  distilleryAliases,
  type DistilleryAlias,
  bottlers,
  type InsertBottler, type Bottler,
  bottleSplits,
  bottleSplitClaims,
  type InsertBottleSplit, type BottleSplit,
  type InsertBottleSplitClaim, type BottleSplitClaim,
  historicalPersonalRatings,
  type InsertHistoricalPersonalRating, type HistoricalPersonalRating,
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

// ---------- Unified community ratings helper ----------
//
// The community-aggregate views must combine four real user-rating sources:
//   - ratings           (group tastings, including bottle-sharing)
//   - journalEntries    (solo / "Meine Welt" with personalScore)
//   - whiskybaseCollection (personalRating)
//   - historicalPersonalRatings (retroactive overall scores)
//
// Bottle sharing is a regular tasting (tastingType='bottle-sharing') so its
// ratings already flow through the `ratings` source — verified explicitly by
// this helper (no special branch required, but documented for posterity).

export type CommunityRatingSource = 'rating' | 'journal' | 'collection' | 'historical';

export interface CommunityRatingEntry {
  source: CommunityRatingSource;
  whiskyKey: string;
  whiskyId: string | null;     // present only for `rating` source
  whiskybaseId: string | null;
  name: string;
  distillery: string | null;
  region: string | null;
  category: string | null;
  caskType: string | null;
  peatLevel: string | null;
  age: string | null;
  abv: number | null;
  imageUrl: string | null;
  participantId: string;
  score: number;               // 0-100 normalized
  nose: number | null;
  taste: number | null;
  finish: number | null;
}

export function buildCommunityWhiskyKey(name: string | null | undefined, distillery: string | null | undefined, whiskybaseId: string | null | undefined): string {
  if (whiskybaseId) return `wb:${whiskybaseId}`;
  return `name:${(name || '').toLowerCase().trim()}|${(distillery || '').toLowerCase().trim()}`;
}

let communityRatingsCache: { data: CommunityRatingEntry[]; expiresAt: number } | null = null;
const COMMUNITY_RATINGS_TTL_MS = 60 * 1000;

export function invalidateCommunityRatingsCache() {
  communityRatingsCache = null;
}

export async function getAllCommunityRatings(): Promise<CommunityRatingEntry[]> {
  const now = Date.now();
  if (communityRatingsCache && communityRatingsCache.expiresAt > now) {
    return communityRatingsCache.data;
  }

  const [allRatings, allTastings, allWhiskies, allJournals, allCollection, allHistRatings, allHistEntries] = await Promise.all([
    db.select().from(ratings),
    db.select().from(tastings),
    db.select().from(whiskies),
    db.select().from(journalEntries).where(and(isNull(journalEntries.deletedAt), ne(journalEntries.status, 'draft'))),
    db.select().from(whiskybaseCollection),
    db.select().from(historicalPersonalRatings),
    db.select().from(historicalTastingEntries),
  ]);

  const tastingScale = new Map(allTastings.map(t => [t.id, t.ratingScale ?? 100]));
  const testTastingIds = new Set(allTastings.filter(t => t.isTestData).map(t => t.id));
  const whiskyMap = new Map(allWhiskies.map(w => [w.id, w]));
  const histEntryMap = new Map(allHistEntries.map(e => [e.id, e]));

  const result: CommunityRatingEntry[] = [];
  // Per (source, participant, whiskyKey) dedup so the same person/whisky/source
  // never inflates the count even if two rows exist.
  const dedup = new Set<string>();
  const pushEntry = (entry: CommunityRatingEntry) => {
    const dk = `${entry.source}::${entry.participantId}::${entry.whiskyKey}`;
    if (dedup.has(dk)) return;
    dedup.add(dk);
    result.push(entry);
  };

  // 1) ratings (group tastings + bottle-sharing tastings — both flow here)
  for (const r of allRatings) {
    if (testTastingIds.has(r.tastingId)) continue;
    const w = whiskyMap.get(r.whiskyId);
    if (!w) continue;
    const scale = 100 / (tastingScale.get(r.tastingId) ?? 100);
    const score = r.normalizedScore ?? (r.overall != null ? r.overall * scale : null);
    if (score == null) continue;
    pushEntry({
      source: 'rating',
      whiskyKey: buildCommunityWhiskyKey(w.name, w.distillery, w.whiskybaseId),
      whiskyId: w.id,
      whiskybaseId: w.whiskybaseId ?? null,
      name: w.name,
      distillery: w.distillery ?? null,
      region: w.region ?? null,
      category: w.category ?? null,
      caskType: w.caskType ?? null,
      peatLevel: w.peatLevel ?? null,
      age: w.age ?? null,
      abv: w.abv ?? null,
      imageUrl: w.imageUrl ?? null,
      participantId: r.participantId,
      score,
      nose: r.normalizedNose ?? (r.nose != null ? r.nose * scale : null),
      taste: r.normalizedTaste ?? (r.taste != null ? r.taste * scale : null),
      finish: r.normalizedFinish ?? (r.finish != null ? r.finish * scale : null),
    });
  }

  // 2) journal entries with a personal score (already 0-100)
  for (const j of allJournals) {
    if (j.personalScore == null) continue;
    const name = j.name || j.title;
    if (!name) continue;
    pushEntry({
      source: 'journal',
      whiskyKey: buildCommunityWhiskyKey(name, j.distillery, j.whiskybaseId),
      whiskyId: null,
      whiskybaseId: j.whiskybaseId ?? null,
      name,
      distillery: j.distillery ?? null,
      region: j.region ?? null,
      category: j.category ?? null,
      caskType: j.caskType ?? null,
      peatLevel: j.peatLevel ?? null,
      age: j.age ?? null,
      abv: j.abv ?? null,
      imageUrl: j.imageUrl ?? null,
      participantId: j.participantId,
      score: j.personalScore,
      nose: j.noseScore ?? null,
      taste: j.tasteScore ?? null,
      finish: j.finishScore ?? null,
    });
  }

  // 3) whiskybase collection personal ratings (already 0-100)
  for (const c of allCollection) {
    if (c.personalRating == null) continue;
    if (!c.name) continue;
    pushEntry({
      source: 'collection',
      whiskyKey: buildCommunityWhiskyKey(c.name, c.distillery, c.whiskybaseId),
      whiskyId: null,
      whiskybaseId: c.whiskybaseId ?? null,
      name: c.name,
      distillery: c.distillery ?? null,
      region: c.region ?? null,
      category: null,
      caskType: c.caskType ?? null,
      peatLevel: null,
      age: c.statedAge ?? null,
      abv: c.abv ?? null,
      imageUrl: c.imageUrl ?? null,
      participantId: c.participantId,
      score: c.personalRating,
      nose: null,
      taste: null,
      finish: null,
    });
  }

  // 4) historical personal ratings (retroactive scores; already 0-100)
  for (const h of allHistRatings) {
    if (h.overall == null) continue;
    const entry = histEntryMap.get(h.historicalTastingEntryId);
    if (!entry) continue;
    const name = entry.whiskyNameRaw || entry.distilleryRaw || '';
    if (!name) continue;
    const distillery = entry.distilleryRaw || null;
    pushEntry({
      source: 'historical',
      whiskyKey: buildCommunityWhiskyKey(name, distillery, null),
      whiskyId: null,
      whiskybaseId: null,
      name,
      distillery,
      region: entry.normalizedRegion || entry.regionRaw || null,
      category: entry.normalizedType || entry.typeRaw || null,
      caskType: entry.normalizedCask || entry.caskRaw || null,
      peatLevel: null,
      age: entry.ageRaw || null,
      abv: null,
      imageUrl: null,
      participantId: h.participantId,
      score: h.overall,
      nose: h.nose ?? null,
      taste: h.taste ?? null,
      finish: h.finish ?? null,
    });
  }

  communityRatingsCache = { data: result, expiresAt: now + COMMUNITY_RATINGS_TTL_MS };
  return result;
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
  markOffline(id: string): Promise<void>;
  getOnlineParticipants(thresholdMinutes?: number): Promise<Participant[]>;
  updateParticipantLanguage(id: string, language: string): Promise<Participant | undefined>;
  updateParticipantPin(id: string, pin: string): Promise<Participant | undefined>;
  setPrivacyConsent(id: string): Promise<void>;
  setVerificationCode(id: string, code: string, expiry: Date): Promise<Participant | undefined>;
  verifyEmail(id: string): Promise<Participant | undefined>;
  updateWhiskyDbAccess(id: string, canAccess: boolean): Promise<Participant | undefined>;
  updateMakingOfAccess(id: string, access: boolean): Promise<Participant | undefined>;
  getMakingOfLiveStats(): Promise<{ registeredUsers: number; totalTastings: number; totalRatings: number; whiskiesTasted: number; activeCommunities: number }>;

  // Tastings
  getTasting(id: string): Promise<Tasting | undefined>;
  getTastingByCode(code: string): Promise<Tasting | undefined>;
  getAllTastings(): Promise<Tasting[]>;
  getTastingsForParticipant(participantId: string): Promise<Tasting[]>;
  createTasting(data: InsertTasting): Promise<Tasting>;
  updateTastingStatus(id: string, status: string, currentAct?: string): Promise<Tasting | undefined>;
  updateTastingReflection(id: string, reflection: string): Promise<Tasting | undefined>;
  updateTastingDetails(id: string, data: Partial<{ title: string; date: string; location: string; description: string; blindMode: boolean; ratingScale: number; guidedMode: boolean; ratingPrompt: string | null; reflectionEnabled: boolean; reflectionMode: string; reflectionVisibility: string; coverImageUrl: string | null; coverImageRevealed: boolean; videoLink: string | null; guestMode: string; sessionUiMode: string | null; showRanking: boolean; showGroupAvg: boolean; showReveal: boolean; lockedDrams: string | null; targetCommunityIds: string | null; visibility: string }>): Promise<Tasting | undefined>;
  updateTasting(id: string, data: Partial<Record<string, any>>): Promise<Tasting | undefined>;
  transferTastingHost(id: string, newHostId: string): Promise<Tasting | undefined>;
  duplicateTasting(id: string, hostId: string): Promise<Tasting>;

  // Tasting Participants
  getTastingParticipants(tastingId: string): Promise<(TastingParticipant & { participant: Participant })[]>;
  addParticipantToTasting(data: InsertTastingParticipant): Promise<TastingParticipant>;
  isParticipantInTasting(tastingId: string, participantId: string): Promise<boolean>;

  // Sharing Participants (Bottle-Sharing)
  getSharingParticipants(tastingId: string): Promise<(SharingParticipant & { participant: Participant })[]>;
  addSharingParticipant(data: InsertSharingParticipant): Promise<SharingParticipant>;
  updateSharingParticipantStatus(tastingId: string, participantId: string, status: string): Promise<SharingParticipant | undefined>;
  getSharingParticipant(tastingId: string, participantId: string): Promise<SharingParticipant | undefined>;
  getPublicBottleSharings(): Promise<Tasting[]>;
  getBottleSharingsForParticipant(participantId: string): Promise<Tasting[]>;

  // Whiskies
  getWhiskiesForTasting(tastingId: string): Promise<Whisky[]>;
  getWhiskiesByIds(ids: string[]): Promise<Whisky[]>;
  getAllWhiskies(): Promise<Whisky[]>;
  getActiveWhiskies(): Promise<Whisky[]>;
  getWhisky(id: string): Promise<Whisky | undefined>;
  createWhisky(data: InsertWhisky): Promise<Whisky>;
  updateWhisky(id: string, data: Partial<InsertWhisky>): Promise<Whisky | undefined>;
  deleteWhisky(id: string): Promise<void>;

  // Whisky Handout Library (per-host reusable handouts)
  listHandoutLibraryByHost(hostId: string, opts?: { search?: string }): Promise<WhiskyHandoutLibraryEntry[]>;
  suggestHandoutLibrary(hostId: string, match: { whiskybaseId?: string | null; whiskyName?: string | null; distillery?: string | null }): Promise<WhiskyHandoutLibraryEntry[]>;
  getHandoutLibraryEntry(id: string): Promise<WhiskyHandoutLibraryEntry | undefined>;
  createHandoutLibraryEntry(data: InsertWhiskyHandoutLibraryEntry): Promise<WhiskyHandoutLibraryEntry>;
  updateHandoutLibraryEntry(id: string, data: Partial<InsertWhiskyHandoutLibraryEntry>): Promise<WhiskyHandoutLibraryEntry | undefined>;
  deleteHandoutLibraryEntry(id: string): Promise<void>;
  isHandoutFileReferencedByLibrary(fileUrl: string): Promise<boolean>;
  setHandoutLibraryEntryShared(id: string, isShared: boolean, sharedByName: string | null): Promise<WhiskyHandoutLibraryEntry | undefined>;
  listSharedHandoutLibrary(opts?: { search?: string; excludeHostId?: string; limit?: number }): Promise<WhiskyHandoutLibraryEntry[]>;
  setHandoutLibraryEntryAttribution(id: string, data: { clonedFromId?: string | null; sharedByName?: string | null }): Promise<void>;
  findWhiskiesByWhiskybaseIdForHost(whiskybaseId: string, hostId: string): Promise<Array<{ id: string; name: string; distillery: string | null; tastingId: string; tastingTitle: string; tastingDate: string | null }>>;
  findDistilleryByName(name: string): Promise<{ id: string; name: string; country: string; region: string } | undefined>;
  findOrCreateDistilleryByName(name: string, fallback?: { country?: string | null; region?: string | null; founded?: number | null; description?: string | null; feature?: string | null }): Promise<{ distillery: Distillery; created: boolean }>;
  addDistilleryAlias(distilleryId: string, alias: string): Promise<DistilleryAlias | undefined>;
  listDistilleryAliases(distilleryId: string): Promise<DistilleryAlias[]>;
  listAllDistilleryAliases(): Promise<DistilleryAlias[]>;
  removeDistilleryAlias(aliasId: string): Promise<boolean>;

  // PDF Split Sessions (temporary store for splitting multi-page program PDFs)
  createPdfSplitSession(data: { tastingId: string; hostId: string; pages: PdfSplitPage[] }): Promise<PdfSplitSession>;
  getPdfSplitSession(id: string): Promise<PdfSplitSession | undefined>;
  deletePdfSplitSession(id: string): Promise<void>;
  listExpiredPdfSplitSessions(olderThan: Date): Promise<PdfSplitSession[]>;

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

  // Whisky Groups
  getWhiskyGroups(ownerId: string): Promise<WhiskyGroup[]>;
  getWhiskyGroup(id: string): Promise<WhiskyGroup | undefined>;
  createWhiskyGroup(data: InsertWhiskyGroup): Promise<WhiskyGroup>;
  updateWhiskyGroup(id: string, ownerId: string, data: Partial<{ name: string; description: string | null; temporary: boolean }>): Promise<WhiskyGroup | undefined>;
  deleteWhiskyGroup(id: string, ownerId: string): Promise<void>;
  getWhiskyGroupMembers(groupId: string): Promise<WhiskyGroupMember[]>;
  addWhiskyGroupMember(data: InsertWhiskyGroupMember): Promise<WhiskyGroupMember>;
  removeWhiskyGroupMember(groupId: string, friendId: string): Promise<void>;

  // Rating Notes
  getRatingNotes(participantId: string): Promise<Array<{ id: string; notes: string | null; overall: number | null; normalizedScore: number | null; createdAt: Date | null }>>;

  // Tasting History (whiskies tasted via sessions)
  getTastingHistory(participantId: string): Promise<any[]>;

  // Journal Entries
  getAllJournalEntries(): Promise<JournalEntry[]>;
  getCuratedDatabaseEntries(): Promise<JournalEntry[]>;
  getJournalEntries(participantId: string, statusFilter?: string): Promise<JournalEntry[]>;
  getJournalEntry(id: string, participantId: string): Promise<JournalEntry | undefined>;
  getJournalEntryById(id: string): Promise<JournalEntry | undefined>;
  createJournalEntry(data: InsertJournalEntry): Promise<JournalEntry>;
  updateJournalEntry(id: string, participantId: string, data: Partial<InsertJournalEntry>): Promise<JournalEntry | undefined>;
  deleteJournalEntry(id: string, participantId: string): Promise<void>;
  restoreJournalEntry(id: string, participantId: string): Promise<void>;
  permanentlyDeleteJournalEntry(id: string, participantId: string): Promise<void>;
  getDeletedJournalEntries(participantId: string): Promise<JournalEntry[]>;
  getAdminDeletedJournalEntries(): Promise<JournalEntry[]>;
  restoreJournalEntryById(id: string): Promise<void>;
  purgeExpiredJournalEntries(olderThanDays: number): Promise<number>;

  logDataAudit(action: string, tableName: string, recordId: string, performedBy: string, details?: Record<string, any>): Promise<void>;

  updateParticipantIndices(participantId: string): Promise<void>;

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
    ratingStabilityScore: number | null;
    explorationIndex: number | null;
  }>;

  // Flavor Profile (aggregated ratings with whisky metadata)
  getFlavorProfile(participantId: string): Promise<{
    avgScores: { nose: number; taste: number; finish: number; overall: number };
    dimensionStats: {
      nose: { stdDev: number; min: number; max: number };
      taste: { stdDev: number; min: number; max: number };
      finish: { stdDev: number; min: number; max: number };
      overall: { stdDev: number; min: number; max: number };
    };
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
    caskType: string | null;
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

  getPublicInsights(): Promise<{
    communityPulse: { totalRatings: number; totalWhiskies: number; totalTasters: number; avgOverall: number };
    topRated: Array<{ name: string; distillery: string | null; region: string | null; avgOverall: number; ratingCount: number; imageUrl: string | null }>;
    mostExplored: Array<{ name: string; distillery: string | null; region: string | null; avgOverall: number; ratingCount: number; imageUrl: string | null }>;
    regionalHighlights: Array<{ region: string; avgOverall: number; count: number }>;
    flavorTrends: { peatLevels: Record<string, number>; caskTypes: Record<string, number> };
    divisiveDrams: Array<{ name: string; distillery: string | null; region: string | null; avgOverall: number; variance: number; ratingCount: number; imageUrl: string | null }>;
  }>;

  // Hard Delete (admin only)
  hardDeleteTasting(id: string): Promise<void>;
  getWhiskyHandoutUrlsForTasting(id: string): Promise<string[]>;
  getTastingHandoutUrl(id: string): Promise<string | null>;

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
  getCollectionItemById(id: string): Promise<WhiskybaseCollectionItem | undefined>;
  upsertWhiskybaseCollectionItem(data: InsertWhiskybaseCollection): Promise<WhiskybaseCollectionItem>;
  patchWhiskybaseCollectionItem(id: string, participantId: string, fields: Partial<{ status: string; personalRating: number | null; notes: string | null }>): Promise<WhiskybaseCollectionItem | null>;
  deleteWhiskybaseCollectionItem(id: string, participantId: string): Promise<void>;
  deleteWhiskybaseCollection(participantId: string): Promise<void>;
  restoreCollectionItemSnapshot(snapshot: WhiskybaseCollectionItem): Promise<void>;
  updateWhiskybaseCollectionItemPrice(id: string, participantId: string, price: number, currency: string, source: string): Promise<WhiskybaseCollectionItem | null>;

  // Collection Sync Log
  createCollectionSyncLog(data: InsertCollectionSyncLog): Promise<CollectionSyncLog>;
  getCollectionSyncLogs(participantId: string): Promise<CollectionSyncLog[]>;
  getCollectionSyncLog(id: string): Promise<CollectionSyncLog | undefined>;

  // Collection Import Log (Undo)
  createCollectionImportLog(data: InsertCollectionImportLog): Promise<CollectionImportLog>;
  getCollectionImportLogs(participantId: string): Promise<CollectionImportLog[]>;
  getCollectionImportLog(id: string): Promise<CollectionImportLog | undefined>;
  markCollectionImportLogUndone(id: string): Promise<void>;
  restoreCollectionItemFields(id: string, participantId: string, fields: Record<string, any>): Promise<void>;

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
  getCommunityMemberRole(communityId: string, participantId: string): Promise<string | null>;
  updateCommunityMemberRole(communityId: string, participantId: string, role: string): Promise<CommunityMembership | undefined>;
  getCommunityTastings(communityId: string): Promise<{ upcoming: any[]; past: any[] }>;

  // Community Invites
  createCommunityInvite(data: InsertCommunityInvite): Promise<CommunityInvite>;
  getCommunityInviteById(id: string): Promise<CommunityInvite | undefined>;
  getCommunityInviteByToken(token: string): Promise<CommunityInvite | undefined>;
  getPendingCommunityInvites(participantId: string): Promise<(CommunityInvite & { communityName?: string; inviterName?: string })[]>;
  getPendingCommunityInvitesByEmail(email: string): Promise<(CommunityInvite & { communityName?: string; inviterName?: string })[]>;
  acceptCommunityInvite(id: string): Promise<CommunityInvite | undefined>;
  declineCommunityInvite(id: string): Promise<CommunityInvite | undefined>;

  // Historical Tastings
  getAccessibleHistoricalTastingIds(communityIds: string[], isAdmin: boolean): Promise<string[] | "all">;
  getHistoricalTastings(options?: { limit?: number; offset?: number; search?: string; tastingIds?: string[] }): Promise<{ tastings: HistoricalTasting[]; total: number }>;
  getHistoricalTastingsEnriched(options?: { limit?: number; offset?: number; search?: string; tastingIds?: string[] }): Promise<{ tastings: Array<HistoricalTasting & { avgTotalScore: number | null; winnerDistillery: string | null; winnerName: string | null; winnerScore: number | null }>; total: number }>;
  getHistoricalTasting(id: string): Promise<(HistoricalTasting & { entries: HistoricalTastingEntry[] }) | undefined>;
  getHistoricalTastingEntries(tastingId: string): Promise<HistoricalTastingEntry[]>;
  getHistoricalWhiskyStats(tastingIds?: string[]): Promise<{
    totalTastings: number;
    totalEntries: number;
    topWhiskies: Array<{ distillery: string | null; name: string | null; totalScore: number | null; normalizedTotal: number | null; tastingNumber: number; titleDe: string | null; titleEn: string | null }>;
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

  // Historical Tasting Participation
  claimHistoricalParticipation(historicalTastingId: string, participantId: string): Promise<HistoricalTastingParticipant>;
  unclaimHistoricalParticipation(historicalTastingId: string, participantId: string): Promise<void>;
  getHistoricalParticipants(historicalTastingId: string): Promise<HistoricalTastingParticipant[]>;
  getHistoricalParticipationForUser(participantId: string): Promise<HistoricalTastingParticipant[]>;
  isHistoricalParticipant(historicalTastingId: string, participantId: string): Promise<boolean>;
  getHistoricalParticipantCounts(tastingIds: string[]): Promise<Record<string, number>>;

  getHistoricalTastingEntryById(entryId: string): Promise<any | undefined>;

  // Historical Personal Ratings
  upsertHistoricalPersonalRating(data: InsertHistoricalPersonalRating): Promise<HistoricalPersonalRating>;
  getHistoricalPersonalRatings(historicalTastingId: string, participantId: string): Promise<HistoricalPersonalRating[]>;
  getHistoricalPersonalRatingsForTasting(participantId: string, tastingId: string): Promise<HistoricalPersonalRating[]>;
  getHistoricalPersonalRating(entryId: string, participantId: string): Promise<HistoricalPersonalRating | undefined>;

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

  // Distilleries
  getAllDistilleries(): Promise<Distillery[]>;
  getDistillery(id: string): Promise<Distillery | undefined>;
  createDistillery(data: InsertDistillery): Promise<Distillery>;
  updateDistillery(id: string, data: Partial<InsertDistillery>): Promise<Distillery | undefined>;
  deleteDistillery(id: string): Promise<void>;
  getDistilleryCount(): Promise<number>;
  createDistilleries(data: InsertDistillery[]): Promise<Distillery[]>;

  // Bottlers
  getAllBottlers(): Promise<Bottler[]>;
  getBottler(id: string): Promise<Bottler | undefined>;
  createBottler(data: InsertBottler): Promise<Bottler>;
  updateBottler(id: string, data: Partial<InsertBottler>): Promise<Bottler | undefined>;
  deleteBottler(id: string): Promise<void>;
  getBottlerCount(): Promise<number>;
  createBottlers(data: InsertBottler[]): Promise<Bottler[]>;

  // Bottle Splits
  getBottleSplit(id: string): Promise<BottleSplit | undefined>;
  getPublicBottleSplits(): Promise<BottleSplit[]>;
  getBottleSplitsForParticipant(participantId: string): Promise<BottleSplit[]>;
  createBottleSplit(data: InsertBottleSplit): Promise<BottleSplit>;
  updateBottleSplit(id: string, data: Partial<Record<string, any>>): Promise<BottleSplit | undefined>;
  deleteBottleSplit(id: string): Promise<void>;

  // Bottle Split Claims
  getClaimsForSplit(splitId: string): Promise<(BottleSplitClaim & { participantName: string })[]>;
  createBottleSplitClaim(data: InsertBottleSplitClaim): Promise<BottleSplitClaim>;
  updateBottleSplitClaim(id: string, data: Partial<{ status: string }>): Promise<BottleSplitClaim | undefined>;
  deleteBottleSplitClaim(id: string): Promise<void>;

  // Page Views
  createPageViews(views: Array<{ participantId: string; sessionId?: string; pagePath: string; normalizedPath: string; referrerPath?: string; timestamp: Date; durationSeconds?: number }>): Promise<void>;
  getPageViewsForSession(sessionId: string): Promise<PageView[]>;
  getPageViewsForParticipant(participantId: string, from?: Date, to?: Date, limit?: number): Promise<PageView[]>;
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

  async markOffline(id: string): Promise<void> {
    const pastDate = new Date(Date.now() - 10 * 60 * 1000);
    await db.update(participants).set({ lastSeenAt: pastDate }).where(eq(participants.id, id));
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

  async updateTastingDetails(id: string, data: Partial<{ title: string; date: string; location: string; description: string; blindMode: boolean; ratingScale: number; guidedMode: boolean; ratingPrompt: string | null; reflectionEnabled: boolean; reflectionMode: string; reflectionVisibility: string; coverImageUrl: string | null; coverImageRevealed: boolean; videoLink: string | null; guestMode: string; sessionUiMode: string | null; showRanking: boolean; showGroupAvg: boolean; showReveal: boolean; lockedDrams: string | null; targetCommunityIds: string | null; visibility: string }>): Promise<Tasting | undefined> {
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
    if (data.targetCommunityIds !== undefined) updateData.targetCommunityIds = data.targetCommunityIds;
    if (data.visibility !== undefined) updateData.visibility = data.visibility;
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
        caskType: w.caskType,
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

  // --- Sharing Participants (Bottle-Sharing) ---
  async getSharingParticipants(tastingId: string): Promise<(SharingParticipant & { participant: Participant })[]> {
    const rows = await db.select().from(sharingParticipants).where(eq(sharingParticipants.tastingId, tastingId));
    const result: (SharingParticipant & { participant: Participant })[] = [];
    for (const row of rows) {
      const [p] = await db.select().from(participants).where(eq(participants.id, row.participantId));
      if (p) result.push({ ...row, participant: p });
    }
    return result;
  }

  async addSharingParticipant(data: InsertSharingParticipant): Promise<SharingParticipant> {
    const [result] = await db.insert(sharingParticipants).values(data).returning();
    return result;
  }

  async updateSharingParticipantStatus(tastingId: string, participantId: string, status: string): Promise<SharingParticipant | undefined> {
    const updates: Record<string, any> = { status };
    if (status === 'confirmed') updates.confirmedAt = new Date();
    const [result] = await db.update(sharingParticipants)
      .set(updates)
      .where(and(eq(sharingParticipants.tastingId, tastingId), eq(sharingParticipants.participantId, participantId)))
      .returning();
    return result;
  }

  async getSharingParticipant(tastingId: string, participantId: string): Promise<SharingParticipant | undefined> {
    const [result] = await db.select().from(sharingParticipants)
      .where(and(eq(sharingParticipants.tastingId, tastingId), eq(sharingParticipants.participantId, participantId)));
    return result;
  }

  async getPublicBottleSharings(): Promise<Tasting[]> {
    return db.select().from(tastings)
      .where(and(
        eq(tastings.tastingType, 'bottle-sharing'),
        eq(tastings.visibility, 'public'),
      ))
      .orderBy(desc(tastings.createdAt));
  }

  async getBottleSharingsForParticipant(participantId: string): Promise<Tasting[]> {
    const hosted = await db.select().from(tastings)
      .where(and(eq(tastings.tastingType, 'bottle-sharing'), eq(tastings.hostId, participantId)))
      .orderBy(desc(tastings.createdAt));
    const participatingRows = await db.select().from(sharingParticipants)
      .where(eq(sharingParticipants.participantId, participantId));
    const participatingIds = participatingRows.map(r => r.tastingId);
    let participating: Tasting[] = [];
    if (participatingIds.length > 0) {
      participating = await db.select().from(tastings)
        .where(and(eq(tastings.tastingType, 'bottle-sharing'), inArray(tastings.id, participatingIds)))
        .orderBy(desc(tastings.createdAt));
    }
    const seen = new Set<string>();
    const result: Tasting[] = [];
    for (const t of [...hosted, ...participating]) {
      if (!seen.has(t.id)) { seen.add(t.id); result.push(t); }
    }
    return result;
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

  // --- Whisky Handout Library ---
  async listHandoutLibraryByHost(hostId: string, opts?: { search?: string }): Promise<WhiskyHandoutLibraryEntry[]> {
    const search = opts?.search?.trim();
    if (search) {
      const pattern = `%${search.toLowerCase()}%`;
      return db.select().from(whiskyHandoutLibrary).where(and(
        eq(whiskyHandoutLibrary.hostId, hostId),
        sql`(LOWER(${whiskyHandoutLibrary.whiskyName}) LIKE ${pattern}
          OR LOWER(COALESCE(${whiskyHandoutLibrary.distillery}, '')) LIKE ${pattern}
          OR LOWER(COALESCE(${whiskyHandoutLibrary.title}, '')) LIKE ${pattern}
          OR LOWER(COALESCE(${whiskyHandoutLibrary.author}, '')) LIKE ${pattern}
          OR LOWER(COALESCE(${whiskyHandoutLibrary.whiskybaseId}, '')) LIKE ${pattern})`
      )).orderBy(desc(whiskyHandoutLibrary.createdAt));
    }
    return db.select().from(whiskyHandoutLibrary)
      .where(eq(whiskyHandoutLibrary.hostId, hostId))
      .orderBy(desc(whiskyHandoutLibrary.createdAt));
  }

  async suggestHandoutLibrary(hostId: string, match: { whiskybaseId?: string | null; whiskyName?: string | null; distillery?: string | null }): Promise<WhiskyHandoutLibraryEntry[]> {
    const wb = match.whiskybaseId?.trim();
    const name = match.whiskyName?.trim().toLowerCase();
    const dist = match.distillery?.trim().toLowerCase();
    if (!wb && !name && !dist) return [];
    const ors: SQL[] = [];
    if (wb) ors.push(eq(whiskyHandoutLibrary.whiskybaseId, wb));
    if (name) ors.push(sql`LOWER(${whiskyHandoutLibrary.whiskyName}) = ${name}`);
    if (dist) ors.push(sql`LOWER(${whiskyHandoutLibrary.distillery}) = ${dist}`);
    const matchClause = or(...ors);
    if (!matchClause) return [];
    const rows = await db.select().from(whiskyHandoutLibrary).where(and(
      eq(whiskyHandoutLibrary.hostId, hostId),
      matchClause,
    )).orderBy(desc(whiskyHandoutLibrary.createdAt));
    // Score: wb match = 3, name+dist = 2, name = 1.5, dist = 1
    const scored = rows.map((r) => {
      let s = 0;
      if (wb && r.whiskybaseId && r.whiskybaseId === wb) s += 3;
      if (name && r.whiskyName.toLowerCase() === name) s += 1.5;
      if (dist && r.distillery && r.distillery.toLowerCase() === dist) s += 1;
      return { r, s };
    });
    scored.sort((a, b) => b.s - a.s);
    // Dedupe by file URL keeping highest-scored entry
    const seen = new Set<string>();
    const out: WhiskyHandoutLibraryEntry[] = [];
    for (const { r } of scored) {
      if (seen.has(r.fileUrl)) continue;
      seen.add(r.fileUrl);
      out.push(r);
    }
    return out.slice(0, 10);
  }

  async getHandoutLibraryEntry(id: string): Promise<WhiskyHandoutLibraryEntry | undefined> {
    const [row] = await db.select().from(whiskyHandoutLibrary).where(eq(whiskyHandoutLibrary.id, id));
    return row;
  }

  async createHandoutLibraryEntry(data: InsertWhiskyHandoutLibraryEntry): Promise<WhiskyHandoutLibraryEntry> {
    const [row] = await db.insert(whiskyHandoutLibrary).values(data).returning();
    return row;
  }

  async updateHandoutLibraryEntry(id: string, data: Partial<InsertWhiskyHandoutLibraryEntry>): Promise<WhiskyHandoutLibraryEntry | undefined> {
    const [row] = await db.update(whiskyHandoutLibrary).set(data).where(eq(whiskyHandoutLibrary.id, id)).returning();
    return row;
  }

  async deleteHandoutLibraryEntry(id: string): Promise<void> {
    await db.delete(whiskyHandoutLibrary).where(eq(whiskyHandoutLibrary.id, id));
  }

  async setHandoutLibraryEntryShared(id: string, isShared: boolean, sharedByName: string | null): Promise<WhiskyHandoutLibraryEntry | undefined> {
    const [row] = await db.update(whiskyHandoutLibrary).set({
      isShared,
      sharedAt: isShared ? new Date() : null,
      sharedByName: isShared ? sharedByName : null,
    }).where(eq(whiskyHandoutLibrary.id, id)).returning();
    return row;
  }

  async setHandoutLibraryEntryAttribution(id: string, data: { clonedFromId?: string | null; sharedByName?: string | null }): Promise<void> {
    const patch: Record<string, unknown> = {};
    if (data.clonedFromId !== undefined) patch.clonedFromId = data.clonedFromId;
    if (data.sharedByName !== undefined) patch.sharedByName = data.sharedByName;
    if (Object.keys(patch).length === 0) return;
    await db.update(whiskyHandoutLibrary).set(patch).where(eq(whiskyHandoutLibrary.id, id));
  }

  async findWhiskiesByWhiskybaseIdForHost(whiskybaseId: string, hostId: string): Promise<Array<{ id: string; name: string; distillery: string | null; tastingId: string; tastingTitle: string; tastingDate: string | null }>> {
    const trimmed = whiskybaseId.trim();
    if (!trimmed) return [];
    const rows = await db
      .select({
        id: whiskies.id,
        name: whiskies.name,
        distillery: whiskies.distillery,
        tastingId: whiskies.tastingId,
        tastingTitle: tastings.title,
        tastingDate: tastings.date,
      })
      .from(whiskies)
      .innerJoin(tastings, eq(whiskies.tastingId, tastings.id))
      .where(and(eq(whiskies.whiskybaseId, trimmed), eq(tastings.hostId, hostId)))
      .orderBy(desc(tastings.date))
      .limit(50);
    return rows;
  }

  async findDistilleryByName(name: string): Promise<{ id: string; name: string; country: string; region: string } | undefined> {
    const trimmed = name.trim();
    if (!trimmed) return undefined;
    const match = await this.lookupDistilleryByCanonicalName(trimmed);
    if (!match) return undefined;
    return { id: match.id, name: match.name, country: match.country, region: match.region };
  }

  // Resolve a distillery row from a free-form name using:
  //  1) exact case-insensitive name match (fast path)
  //  2) alias table lookup keyed by canonical form
  //  3) full canonical scan over all distilleries (handles legacy duplicates)
  private async lookupDistilleryByCanonicalName(name: string): Promise<Distillery | undefined> {
    const trimmed = (name || "").trim();
    if (!trimmed) return undefined;

    const [exact] = await db
      .select()
      .from(distilleries)
      .where(sql`LOWER(${distilleries.name}) = LOWER(${trimmed})`)
      .limit(1);
    if (exact) return exact;

    const canonical = canonicalizeDistilleryName(trimmed);
    if (!canonical) return undefined;

    // Alias lookup is best-effort: if the table is missing (e.g. a deploy
    // raced ahead of its migration) we degrade to the canonical scan below
    // instead of breaking distillery resolution entirely.
    try {
      const [aliasRow] = await db
        .select()
        .from(distilleryAliases)
        .where(eq(distilleryAliases.alias, canonical))
        .limit(1);
      if (aliasRow) {
        const [byAlias] = await db
          .select()
          .from(distilleries)
          .where(eq(distilleries.id, aliasRow.distilleryId))
          .limit(1);
        if (byAlias) return byAlias;
      }
    } catch (aliasErr) {
      console.warn("[distillery] alias lookup failed", aliasErr);
    }

    const all = await db.select().from(distilleries);
    return all.find(d => canonicalizeDistilleryName(d.name) === canonical);
  }

  async findOrCreateDistilleryByName(
    name: string,
    fallback?: { country?: string | null; region?: string | null; founded?: number | null; description?: string | null; feature?: string | null },
  ): Promise<{ distillery: Distillery; created: boolean }> {
    const trimmed = (name || "").trim();
    if (!trimmed) throw new Error("Distillery name is required");
    const canonical = canonicalizeDistilleryName(trimmed);
    if (!canonical) throw new Error("Distillery name is required");

    const existing = await this.lookupDistilleryByCanonicalName(trimmed);
    if (existing) {
      // Remember the variant we just resolved so future lookups skip the scan.
      if (canonicalizeDistilleryName(existing.name) !== canonical) {
        try {
          await db.insert(distilleryAliases)
            .values({ alias: canonical, distilleryId: existing.id })
            .onConflictDoNothing();
        } catch (aliasErr) {
          console.warn("[distillery] alias insert failed", aliasErr);
        }
      }
      const patch: Partial<InsertDistillery> = {};
      if (!existing.description && fallback?.description) patch.description = fallback.description;
      if (!existing.founded && fallback?.founded) patch.founded = fallback.founded;
      if (!existing.feature && fallback?.feature) patch.feature = fallback.feature;
      if ((existing.region === "Unknown" || !existing.region) && fallback?.region) patch.region = fallback.region;
      if ((existing.country === "Unknown" || !existing.country) && fallback?.country) patch.country = fallback.country;
      if (Object.keys(patch).length > 0) {
        const [updated] = await db.update(distilleries).set(patch).where(eq(distilleries.id, existing.id)).returning();
        return { distillery: updated ?? existing, created: false };
      }
      return { distillery: existing, created: false };
    }
    const [created] = await db
      .insert(distilleries)
      .values({
        name: trimmed,
        country: (fallback?.country || "Unknown").slice(0, 100),
        region: (fallback?.region || "Unknown").slice(0, 100),
        founded: fallback?.founded ?? null,
        description: fallback?.description ?? null,
        feature: fallback?.feature ?? null,
        status: "active",
      } as InsertDistillery)
      .returning();
    return { distillery: created, created: true };
  }

  async addDistilleryAlias(distilleryId: string, alias: string): Promise<DistilleryAlias | undefined> {
    const canonical = canonicalizeDistilleryName(alias);
    if (!canonical) return undefined;
    try {
      const [row] = await db.insert(distilleryAliases)
        .values({ alias: canonical, distilleryId })
        .onConflictDoNothing()
        .returning();
      return row;
    } catch (aliasErr) {
      console.warn("[distillery] alias insert failed", aliasErr);
      return undefined;
    }
  }

  async listDistilleryAliases(distilleryId: string): Promise<DistilleryAlias[]> {
    try {
      return await db.select().from(distilleryAliases).where(eq(distilleryAliases.distilleryId, distilleryId));
    } catch (aliasErr) {
      console.warn("[distillery] alias list failed", aliasErr);
      return [];
    }
  }

  async listAllDistilleryAliases(): Promise<DistilleryAlias[]> {
    return await db.select().from(distilleryAliases);
  }

  async removeDistilleryAlias(aliasId: string): Promise<boolean> {
    const result = await db.delete(distilleryAliases).where(eq(distilleryAliases.id, aliasId)).returning({ id: distilleryAliases.id });
    return result.length > 0;
  }

  async listSharedHandoutLibrary(opts?: { search?: string; excludeHostId?: string; limit?: number }): Promise<WhiskyHandoutLibraryEntry[]> {
    const filters = [eq(whiskyHandoutLibrary.isShared, true)] as any[];
    if (opts?.excludeHostId) {
      filters.push(sql`${whiskyHandoutLibrary.hostId} <> ${opts.excludeHostId}`);
    }
    if (opts?.search && opts.search.trim()) {
      const pattern = `%${opts.search.trim().toLowerCase()}%`;
      filters.push(sql`(LOWER(${whiskyHandoutLibrary.whiskyName}) LIKE ${pattern}
        OR LOWER(COALESCE(${whiskyHandoutLibrary.distillery}, '')) LIKE ${pattern}
        OR LOWER(COALESCE(${whiskyHandoutLibrary.title}, '')) LIKE ${pattern}
        OR LOWER(COALESCE(${whiskyHandoutLibrary.author}, '')) LIKE ${pattern}
        OR LOWER(COALESCE(${whiskyHandoutLibrary.whiskybaseId}, '')) LIKE ${pattern}
        OR LOWER(COALESCE(${whiskyHandoutLibrary.sharedByName}, '')) LIKE ${pattern})`);
    }
    const limit = Math.min(Math.max(opts?.limit ?? 100, 1), 200);
    return db.select().from(whiskyHandoutLibrary)
      .where(and(...filters))
      .orderBy(desc(whiskyHandoutLibrary.sharedAt))
      .limit(limit);
  }

  // --- PDF Split Sessions ---
  async createPdfSplitSession(data: { tastingId: string; hostId: string; pages: PdfSplitPage[] }): Promise<PdfSplitSession> {
    const [row] = await db.insert(pdfSplitSessions).values({
      tastingId: data.tastingId,
      hostId: data.hostId,
      pages: data.pages,
    }).returning();
    return row;
  }

  async getPdfSplitSession(id: string): Promise<PdfSplitSession | undefined> {
    const [row] = await db.select().from(pdfSplitSessions).where(eq(pdfSplitSessions.id, id));
    return row;
  }

  async deletePdfSplitSession(id: string): Promise<void> {
    await db.delete(pdfSplitSessions).where(eq(pdfSplitSessions.id, id));
  }

  async listExpiredPdfSplitSessions(olderThan: Date): Promise<PdfSplitSession[]> {
    return db.select().from(pdfSplitSessions).where(lt(pdfSplitSessions.createdAt, olderThan));
  }

  async isHandoutFileReferencedByLibrary(fileUrl: string): Promise<boolean> {
    if (!fileUrl) return false;
    const [libRow] = await db.select({ id: whiskyHandoutLibrary.id }).from(whiskyHandoutLibrary)
      .where(eq(whiskyHandoutLibrary.fileUrl, fileUrl)).limit(1);
    if (libRow) return true;
    const [whiskyRow] = await db.select({ id: whiskies.id }).from(whiskies)
      .where(eq(whiskies.handoutUrl, fileUrl)).limit(1);
    if (whiskyRow) return true;
    const [tastingRow] = await db.select({ id: tastings.id }).from(tastings)
      .where(eq(tastings.handoutUrl, fileUrl)).limit(1);
    return !!tastingRow;
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
      invalidateCommunityRatingsCache();
      return result;
    }
    const [result] = await db.insert(ratings).values(data).returning();
    invalidateCommunityRatingsCache();
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
        caskType: whiskies.caskType,
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

  // --- Whisky Groups ---
  async getWhiskyGroups(ownerId: string): Promise<WhiskyGroup[]> {
    return db.select().from(whiskyGroups).where(eq(whiskyGroups.ownerId, ownerId)).orderBy(desc(whiskyGroups.createdAt));
  }

  async getWhiskyGroup(id: string): Promise<WhiskyGroup | undefined> {
    const [result] = await db.select().from(whiskyGroups).where(eq(whiskyGroups.id, id));
    return result;
  }

  async createWhiskyGroup(data: InsertWhiskyGroup): Promise<WhiskyGroup> {
    const [result] = await db.insert(whiskyGroups).values(data).returning();
    return result;
  }

  async updateWhiskyGroup(id: string, ownerId: string, data: Partial<{ name: string; description: string | null; temporary: boolean }>): Promise<WhiskyGroup | undefined> {
    const [result] = await db.update(whiskyGroups).set(data).where(and(eq(whiskyGroups.id, id), eq(whiskyGroups.ownerId, ownerId))).returning();
    return result;
  }

  async deleteWhiskyGroup(id: string, ownerId: string): Promise<void> {
    const [group] = await db.select().from(whiskyGroups).where(and(eq(whiskyGroups.id, id), eq(whiskyGroups.ownerId, ownerId)));
    if (!group) return;
    await db.delete(whiskyGroupMembers).where(eq(whiskyGroupMembers.groupId, id));
    await db.delete(whiskyGroups).where(eq(whiskyGroups.id, id));
  }

  async getWhiskyGroupMembers(groupId: string): Promise<WhiskyGroupMember[]> {
    return db.select().from(whiskyGroupMembers).where(eq(whiskyGroupMembers.groupId, groupId));
  }

  async addWhiskyGroupMember(data: InsertWhiskyGroupMember): Promise<WhiskyGroupMember> {
    const [result] = await db.insert(whiskyGroupMembers).values(data).returning();
    return result;
  }

  async removeWhiskyGroupMember(groupId: string, friendId: string): Promise<void> {
    await db.delete(whiskyGroupMembers).where(and(eq(whiskyGroupMembers.groupId, groupId), eq(whiskyGroupMembers.friendId, friendId)));
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
    return db.select().from(journalEntries).where(isNull(journalEntries.deletedAt)).orderBy(desc(journalEntries.createdAt));
  }

  async getCuratedDatabaseEntries(): Promise<JournalEntry[]> {
    return db.select().from(journalEntries)
      .where(and(eq(journalEntries.source, "casksense-database"), isNull(journalEntries.deletedAt)))
      .orderBy(desc(journalEntries.createdAt));
  }

  async getJournalEntries(participantId: string, statusFilter?: string): Promise<JournalEntry[]> {
    const conditions = [eq(journalEntries.participantId, participantId), isNull(journalEntries.deletedAt)];
    if (statusFilter) {
      conditions.push(eq(journalEntries.status, statusFilter));
    }
    return db.select().from(journalEntries).where(and(...conditions)).orderBy(asc(journalEntries.createdAt));
  }

  async getJournalEntry(id: string, participantId: string): Promise<JournalEntry | undefined> {
    const [result] = await db.select().from(journalEntries).where(and(eq(journalEntries.id, id), eq(journalEntries.participantId, participantId), isNull(journalEntries.deletedAt)));
    return result;
  }

  async getJournalEntryById(id: string): Promise<JournalEntry | undefined> {
    const [result] = await db.select().from(journalEntries).where(
      and(eq(journalEntries.id, id), eq(journalEntries.source, "casksense-database"), isNull(journalEntries.deletedAt))
    );
    return result;
  }

  async createJournalEntry(data: InsertJournalEntry): Promise<JournalEntry> {
    const [result] = await db.insert(journalEntries).values(data).returning();
    if (result) markJournalUpdated(result.participantId);
    invalidateCommunityRatingsCache();
    return result;
  }

  async updateJournalEntry(id: string, participantId: string, data: Partial<InsertJournalEntry>): Promise<JournalEntry | undefined> {
    const [result] = await db.update(journalEntries).set({ ...data, updatedAt: new Date() }).where(and(eq(journalEntries.id, id), eq(journalEntries.participantId, participantId))).returning();
    if (result) markJournalUpdated(participantId);
    invalidateCommunityRatingsCache();
    return result;
  }

  async deleteJournalEntry(id: string, participantId: string): Promise<void> {
    await db.update(journalEntries).set({ deletedAt: new Date() }).where(and(eq(journalEntries.id, id), eq(journalEntries.participantId, participantId)));
    markJournalUpdated(participantId);
    invalidateCommunityRatingsCache();
  }

  async restoreJournalEntry(id: string, participantId: string): Promise<void> {
    await db.update(journalEntries).set({ deletedAt: null }).where(and(eq(journalEntries.id, id), eq(journalEntries.participantId, participantId)));
    markJournalUpdated(participantId);
    invalidateCommunityRatingsCache();
  }

  async permanentlyDeleteJournalEntry(id: string, participantId: string): Promise<void> {
    await db.delete(journalEntries).where(and(eq(journalEntries.id, id), eq(journalEntries.participantId, participantId)));
    markJournalUpdated(participantId);
    invalidateCommunityRatingsCache();
  }

  async getDeletedJournalEntries(participantId: string): Promise<JournalEntry[]> {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return db.select().from(journalEntries).where(and(eq(journalEntries.participantId, participantId), isNotNull(journalEntries.deletedAt), gte(journalEntries.deletedAt, cutoff))).orderBy(desc(journalEntries.deletedAt));
  }

  async getAdminDeletedJournalEntries(): Promise<JournalEntry[]> {
    return db.select().from(journalEntries).where(isNotNull(journalEntries.deletedAt)).orderBy(desc(journalEntries.deletedAt));
  }

  async restoreJournalEntryById(id: string): Promise<void> {
    const [updated] = await db.update(journalEntries).set({ deletedAt: null }).where(eq(journalEntries.id, id)).returning();
    if (updated) markJournalUpdated(updated.participantId);
  }

  async purgeExpiredJournalEntries(olderThanDays: number): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const deleted = await db.delete(journalEntries).where(and(isNotNull(journalEntries.deletedAt), lt(journalEntries.deletedAt, cutoff))).returning();
    if (deleted.length > 0) {
      const seen = new Set<string>();
      for (const entry of deleted) {
        console.log(`[DATA_GUARD] Auto-purged expired journal entry: id=${entry.id} name="${entry.name}" participant=${entry.participantId} deletedAt=${entry.deletedAt}`);
        if (entry.participantId && !seen.has(entry.participantId)) {
          seen.add(entry.participantId);
          markJournalUpdated(entry.participantId);
        }
      }
    }
    return deleted.length;
  }

  async logDataAudit(action: string, tableName: string, recordId: string, performedBy: string, details?: Record<string, any>): Promise<void> {
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS _data_audit_log (
          id serial PRIMARY KEY,
          action text NOT NULL,
          table_name text NOT NULL,
          record_id text NOT NULL,
          performed_by text NOT NULL,
          details jsonb,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      await db.execute(sql`
        INSERT INTO _data_audit_log (action, table_name, record_id, performed_by, details)
        VALUES (${action}, ${tableName}, ${recordId}, ${performedBy}, ${JSON.stringify(details || {})}::jsonb)
      `);
    } catch (e: any) {
      console.error(`[DATA_GUARD] Failed to write audit log: ${e.message}`);
    }
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
    ratingStabilityScore: number | null;
    explorationIndex: number | null;
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
        ne(journalEntries.status, 'draft'),
        isNull(journalEntries.deletedAt)
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
        if (w.caskType) ratedCaskTypes[w.caskType] = (ratedCaskTypes[w.caskType] || 0) + 1;
        if (w.peatLevel) ratedPeatLevels[w.peatLevel] = (ratedPeatLevels[w.peatLevel] || 0) + 1;
      }
    }

    const journalRows = await db.select().from(journalEntries).where(
      and(
        eq(journalEntries.participantId, participantId),
        ne(journalEntries.status, 'draft'),
        isNull(journalEntries.deletedAt)
      )
    );

    const overallScorePoints = await getParticipantOverallScores(participantId);
    const allOverallScores = overallScorePoints.map(p => p.normalizedScore);
    const ratingStabilityScore = computeStabilityScore(allOverallScores);

    const uniqueRegions = new Set<string>();
    const uniqueCategories = new Set<string>();
    const uniqueCaskTypes = new Set<string>();

    for (const r of allRatings) {
      const w = whiskyMap.get(r.whiskyId);
      if (w) {
        if (w.region) uniqueRegions.add(w.region);
        if (w.category) uniqueCategories.add(w.category);
        if (w.caskType) uniqueCaskTypes.add(w.caskType);
      }
    }
    for (const j of journalRows) {
      if (j.personalScore != null && j.personalScore > 0) {
        if (j.region) uniqueRegions.add(j.region);
        if (j.category) uniqueCategories.add(j.category);
        if (j.caskType) uniqueCaskTypes.add(j.caskType);
      }
    }

    let explorationIndex: number | null = null;
    const totalEntries = allRatings.length + journalRows.filter(j => j.personalScore != null && j.personalScore > 0).length;
    if (totalEntries >= 3) {
      const regionScore = Math.min(uniqueRegions.size / 8, 1);
      const categoryScore = Math.min(uniqueCategories.size / 5, 1);
      const caskScore = Math.min(uniqueCaskTypes.size / 6, 1);
      explorationIndex = Math.round(((regionScore * 0.4 + categoryScore * 0.3 + caskScore * 0.3) * 10) * 10) / 10;
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
      ratingStabilityScore,
      explorationIndex,
    };
  }

  async updateParticipantIndices(participantId: string): Promise<void> {
    try {
      const stats = await this.getParticipantStats(participantId);
      const totalEntries = stats.totalRatings + stats.totalJournalEntries;
      if (totalEntries < 3) return;

      const { ratingStabilityScore, explorationIndex } = stats;

      const allRatings = await db.select().from(ratings).where(eq(ratings.participantId, participantId));
      const whiskyIds = Array.from(new Set(allRatings.map(r => r.whiskyId)));
      const allWhiskies = whiskyIds.length > 0
        ? await db.select().from(whiskies).where(inArray(whiskies.id, whiskyIds))
        : [];
      const whiskyMap = new Map(allWhiskies.map(w => [w.id, w]));

      const tastingIds = Array.from(new Set(allRatings.map(r => r.tastingId)));
      const tastingRows = tastingIds.length > 0
        ? await db.select().from(tastings).where(inArray(tastings.id, tastingIds))
        : [];
      const tastingScaleMap = new Map(tastingRows.map(t => [t.id, t.ratingScale ?? 100]));

      const journalRows = await db.select().from(journalEntries).where(
        and(
          eq(journalEntries.participantId, participantId),
          ne(journalEntries.status, 'draft'),
          isNull(journalEntries.deletedAt)
        )
      );

      let smokeAffinityIndex: number | null = null;
      const smokyScores: number[] = [];
      const nonSmokyScores: number[] = [];

      for (const r of allRatings) {
        const w = whiskyMap.get(r.whiskyId);
        if (!w || !w.peatLevel) continue;
        const score = r.normalizedScore ?? r.overall * (100 / (tastingScaleMap.get(r.tastingId) ?? 100));
        const level = w.peatLevel.toLowerCase();
        if (level === "medium" || level === "heavy") {
          smokyScores.push(score);
        } else if (level === "none" || level === "light") {
          nonSmokyScores.push(score);
        }
      }
      for (const j of journalRows) {
        if (j.personalScore != null && j.personalScore > 0 && j.peatLevel) {
          const level = j.peatLevel.toLowerCase();
          if (level === "medium" || level === "heavy") {
            smokyScores.push(j.personalScore);
          } else if (level === "none" || level === "light") {
            nonSmokyScores.push(j.personalScore);
          }
        }
      }

      if (smokyScores.length >= 1 && nonSmokyScores.length >= 1) {
        const smokyAvg = smokyScores.reduce((a, b) => a + b, 0) / smokyScores.length;
        const nonSmokyAvg = nonSmokyScores.reduce((a, b) => a + b, 0) / nonSmokyScores.length;
        const delta = smokyAvg - nonSmokyAvg;
        smokeAffinityIndex = Math.round(Math.max(0, Math.min(1, 0.5 + delta / 40)) * 100) / 100;
      }

      let sweetnessBias: number | null = null;
      const sherryScores: number[] = [];
      const bourbonScores: number[] = [];

      for (const r of allRatings) {
        const w = whiskyMap.get(r.whiskyId);
        if (!w || !w.caskType) continue;
        const score = r.normalizedScore ?? r.overall * (100 / (tastingScaleMap.get(r.tastingId) ?? 100));
        const cask = w.caskType.toLowerCase();
        if (cask.includes("sherry") || cask.includes("port") || cask.includes("wine") || cask.includes("madeira") || cask.includes("rum")) {
          sherryScores.push(score);
        } else if (cask.includes("bourbon") || cask.includes("refill") || cask.includes("virgin")) {
          bourbonScores.push(score);
        }
      }
      for (const j of journalRows) {
        if (j.personalScore != null && j.personalScore > 0 && j.caskType) {
          const cask = j.caskType.toLowerCase();
          if (cask.includes("sherry") || cask.includes("port") || cask.includes("wine") || cask.includes("madeira") || cask.includes("rum")) {
            sherryScores.push(j.personalScore);
          } else if (cask.includes("bourbon") || cask.includes("refill") || cask.includes("virgin")) {
            bourbonScores.push(j.personalScore);
          }
        }
      }

      if (sherryScores.length >= 1 && bourbonScores.length >= 1) {
        const sherryAvg = sherryScores.reduce((a, b) => a + b, 0) / sherryScores.length;
        const bourbonAvg = bourbonScores.reduce((a, b) => a + b, 0) / bourbonScores.length;
        const delta = sherryAvg - bourbonAvg;
        sweetnessBias = Math.round(Math.max(0, Math.min(1, 0.5 + delta / 40)) * 100) / 100;
      }

      await db.update(participants).set({
        smokeAffinityIndex,
        sweetnessBias,
        ratingStabilityScore,
        explorationIndex,
      }).where(eq(participants.id, participantId));
    } catch (err) {
      console.error(`[updateParticipantIndices] Error for participant ${participantId}:`, err);
    }
  }

  async getFlavorProfile(participantId: string): Promise<{
    avgScores: { nose: number; taste: number; finish: number; overall: number };
    dimensionStats: {
      nose: { stdDev: number; min: number; max: number };
      taste: { stdDev: number; min: number; max: number };
      finish: { stdDev: number; min: number; max: number };
      overall: { stdDev: number; min: number; max: number };
    };
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
    const noseScores: number[] = [];
    const tasteScores: number[] = [];
    const finishScores: number[] = [];
    const overallScores: number[] = [];
    const regionAcc: Record<string, { total: number; count: number }> = {};
    const caskAcc: Record<string, { total: number; count: number }> = {};
    const peatAcc: Record<string, { total: number; count: number }> = {};
    const categoryAcc: Record<string, { total: number; count: number }> = {};

    for (const r of allRatings) {
      const scale = tastingScaleMap.get(r.tastingId) ?? 100;
      const norm = 100 / scale;
      const nNose = r.normalizedNose ?? r.nose * norm;
      const nTaste = r.normalizedTaste ?? r.taste * norm;
      const nFinish = r.normalizedFinish ?? r.finish * norm;
      const nOverall = r.normalizedScore ?? r.overall * norm;
      sumNose += nNose; sumTaste += nTaste; sumFinish += nFinish; sumOverall += nOverall;
      noseScores.push(nNose); tasteScores.push(nTaste); finishScores.push(nFinish); overallScores.push(nOverall);
      const w = whiskyMap.get(r.whiskyId);
      if (w) {
        const normOverall = (r.normalizedScore ?? r.overall * norm);
        if (w.region) {
          if (!regionAcc[w.region]) regionAcc[w.region] = { total: 0, count: 0 };
          regionAcc[w.region].total += normOverall; regionAcc[w.region].count++;
        }
        if (w.caskType) {
          if (!caskAcc[w.caskType]) caskAcc[w.caskType] = { total: 0, count: 0 };
          caskAcc[w.caskType].total += normOverall; caskAcc[w.caskType].count++;
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

    const journal = await db.select().from(journalEntries).where(and(eq(journalEntries.participantId, participantId), ne(journalEntries.status, 'draft'), isNull(journalEntries.deletedAt)));
    let journalScoreCount = 0;

    let journalDimCount = 0;

    for (const j of journal) {
      const score = j.personalScore;
      if (score != null && score > 0) {
        sumOverall += score;
        overallScores.push(score);
        journalScoreCount++;

        if (j.noseScore != null && j.noseScore > 0) {
          sumNose += j.noseScore;
          noseScores.push(j.noseScore);
        }
        if (j.tasteScore != null && j.tasteScore > 0) {
          sumTaste += j.tasteScore;
          tasteScores.push(j.tasteScore);
        }
        if (j.finishScore != null && j.finishScore > 0) {
          sumFinish += j.finishScore;
          finishScores.push(j.finishScore);
        }
        if (j.noseScore != null || j.tasteScore != null || j.finishScore != null) {
          journalDimCount++;
        }

        if (j.region) {
          if (!regionAcc[j.region]) regionAcc[j.region] = { total: 0, count: 0 };
          regionAcc[j.region].total += score; regionAcc[j.region].count++;
        }
        if (j.caskType) {
          if (!caskAcc[j.caskType]) caskAcc[j.caskType] = { total: 0, count: 0 };
          caskAcc[j.caskType].total += score; caskAcc[j.caskType].count++;
        }
        if (j.category) {
          if (!categoryAcc[j.category]) categoryAcc[j.category] = { total: 0, count: 0 };
          categoryAcc[j.category].total += score; categoryAcc[j.category].count++;
        }
      }
    }

    const ratingCount = allRatings.length;
    const totalOverallCount = ratingCount + journalScoreCount;
    const nOverall = totalOverallCount || 1;

    const toBreakdown = (acc: Record<string, { total: number; count: number }>) => {
      const result: Record<string, { count: number; avgScore: number }> = {};
      for (const [k, v] of Object.entries(acc)) {
        result[k] = { count: v.count, avgScore: Math.round((v.total / v.count) * 10) / 10 };
      }
      return result;
    };

    const computeStats = (scores: number[]) => {
      if (scores.length === 0) return { stdDev: 0, min: 0, max: 0 };
      const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
      const variance = scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / scores.length;
      return {
        stdDev: Math.round(Math.sqrt(variance) * 10) / 10,
        min: Math.round(Math.min(...scores) * 10) / 10,
        max: Math.round(Math.max(...scores) * 10) / 10,
      };
    };

    const allWhiskyRows = await db.select().from(whiskies);

    const ratedWhiskiesResult = allRatings.map(r => {
      const w = whiskyMap.get(r.whiskyId);
      return w ? { whisky: w, rating: r } : null;
    }).filter(Boolean) as Array<{ whisky: typeof whiskies.$inferSelect; rating: typeof ratings.$inferSelect }>;

    return {
      avgScores: {
        nose: Math.round((sumNose / (noseScores.length || 1)) * 10) / 10,
        taste: Math.round((sumTaste / (tasteScores.length || 1)) * 10) / 10,
        finish: Math.round((sumFinish / (finishScores.length || 1)) * 10) / 10,
        overall: Math.round((sumOverall / nOverall) * 10) / 10,
      },
      dimensionStats: {
        nose: computeStats(noseScores),
        taste: computeStats(tasteScores),
        finish: computeStats(finishScores),
        overall: computeStats(overallScores),
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

  async getWhiskyHandoutUrlsForTasting(id: string): Promise<string[]> {
    const rows = await db.select({ url: whiskies.handoutUrl }).from(whiskies).where(eq(whiskies.tastingId, id));
    return rows.map(r => r.url).filter((u): u is string => !!u);
  }

  async getTastingHandoutUrl(id: string): Promise<string | null> {
    const [row] = await db.select({ url: tastings.handoutUrl }).from(tastings).where(eq(tastings.id, id));
    return row?.url ?? null;
  }

  async hardDeleteTasting(id: string): Promise<void> {
    await db.delete(voiceMemos).where(eq(voiceMemos.tastingId, id));
    await db.delete(tastingPhotos).where(eq(tastingPhotos.tastingId, id));
    await db.delete(sharingParticipants).where(eq(sharingParticipants.tastingId, id));
    await db.delete(sessionPresence).where(eq(sessionPresence.tastingId, id));
    await db.delete(tastingReminders).where(eq(tastingReminders.tastingId, id));
    await db.delete(notifications).where(eq(notifications.tastingId, id));
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
    const tastingIds = Array.from(new Set(allRatings.map(r => r.tastingId)));
    const tastingRows = tastingIds.length > 0
      ? await db.select().from(tastings).where(inArray(tastings.id, tastingIds))
      : [];
    const testTastingIds = new Set(tastingRows.filter(t => t.isTestData).map(t => t.id));
    const filteredRatings = allRatings.filter(r => !testTastingIds.has(r.tastingId));
    const tastingScaleMap = new Map(tastingRows.map(t => [t.id, t.ratingScale ?? 100]));

    let sumNose = 0, sumTaste = 0, sumFinish = 0, sumOverall = 0;
    let noseCount = 0;
    const participantIds = new Set<string>();

    for (const r of filteredRatings) {
      const scale = tastingScaleMap.get(r.tastingId) ?? 100;
      const norm = 100 / scale;
      sumNose += (r.normalizedNose ?? r.nose * norm); sumTaste += (r.normalizedTaste ?? r.taste * norm); sumFinish += (r.normalizedFinish ?? r.finish * norm);
      sumOverall += (r.normalizedScore ?? r.overall * norm);
      noseCount++;
      participantIds.add(r.participantId);
    }

    const allJournal = await db.select().from(journalEntries).where(isNull(journalEntries.deletedAt));
    let journalScoreCount = 0;
    for (const j of allJournal) {
      if (j.personalScore != null && j.personalScore > 0) {
        sumOverall += j.personalScore;
        journalScoreCount++;
        participantIds.add(j.participantId);
      }
    }

    const totalOverallCount = noseCount + journalScoreCount;
    if (totalOverallCount === 0) {
      return { nose: 0, taste: 0, finish: 0, overall: 0, totalRatings: 0, totalParticipants: 0 };
    }

    const uniquePersons = await getUniquePersonCount(Array.from(participantIds));
    return {
      nose: noseCount > 0 ? Math.round((sumNose / noseCount) * 10) / 10 : 0,
      taste: noseCount > 0 ? Math.round((sumTaste / noseCount) * 10) / 10 : 0,
      finish: noseCount > 0 ? Math.round((sumFinish / noseCount) * 10) / 10 : 0,
      overall: Math.round((sumOverall / totalOverallCount) * 10) / 10,
      totalRatings: totalOverallCount,
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

  async getMakingOfLiveStats(): Promise<{ registeredUsers: number; totalTastings: number; totalRatings: number; whiskiesTasted: number; activeCommunities: number }> {
    const [usersResult] = await db.select({ count: sql<number>`count(*)::int` }).from(participants);
    const [tastingsResult] = await db.select({ count: sql<number>`count(*)::int` }).from(tastings);
    const [historicalResult] = await db.select({ count: sql<number>`count(*)::int` }).from(historicalTastings);
    const [ratingsResult] = await db.select({ count: sql<number>`count(*)::int` }).from(ratings);
    const [whiskiesResult] = await db.select({ count: sql<number>`count(*)::int` }).from(whiskies);
    const [communitiesResult] = await db.select({ count: sql<number>`count(*)::int` }).from(communities);

    return {
      registeredUsers: usersResult.count,
      totalTastings: tastingsResult.count + historicalResult.count,
      totalRatings: ratingsResult.count,
      whiskiesTasted: whiskiesResult.count,
      activeCommunities: communitiesResult.count,
    };
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
      invalidateCommunityRatingsCache();
      return updated;
    }
    
    const [created] = await db.insert(whiskybaseCollection).values(data).returning();
    invalidateCommunityRatingsCache();
    return created;
  }

  async deleteWhiskybaseCollectionItem(id: string, participantId: string): Promise<void> {
    await db.delete(whiskybaseCollection).where(and(
      eq(whiskybaseCollection.id, id),
      eq(whiskybaseCollection.participantId, participantId)
    ));
    invalidateCommunityRatingsCache();
  }

  async getWhiskybaseCollectionItem(id: string, participantId: string): Promise<WhiskybaseCollectionItem | undefined> {
    const [result] = await db.select().from(whiskybaseCollection).where(and(eq(whiskybaseCollection.id, id), eq(whiskybaseCollection.participantId, participantId)));
    return result;
  }

  async getCollectionItemById(id: string): Promise<WhiskybaseCollectionItem | undefined> {
    const [result] = await db.select().from(whiskybaseCollection).where(eq(whiskybaseCollection.id, id));
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

  async restoreCollectionItemSnapshot(snapshot: WhiskybaseCollectionItem): Promise<void> {
    const { id, participantId, createdAt, ...rest } = snapshot as any;
    await db.update(whiskybaseCollection)
      .set({ ...rest, updatedAt: snapshot.updatedAt ?? new Date() })
      .where(and(
        eq(whiskybaseCollection.id, id),
        eq(whiskybaseCollection.participantId, participantId),
      ));
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

  // --- Collection Import Log (Undo) ---
  async createCollectionImportLog(data: InsertCollectionImportLog): Promise<CollectionImportLog> {
    const [result] = await db.insert(collectionImportLog).values(data).returning();
    return result;
  }

  async getCollectionImportLogs(participantId: string): Promise<CollectionImportLog[]> {
    return db.select().from(collectionImportLog).where(eq(collectionImportLog.participantId, participantId)).orderBy(desc(collectionImportLog.importedAt));
  }

  async getCollectionImportLog(id: string): Promise<CollectionImportLog | undefined> {
    const [result] = await db.select().from(collectionImportLog).where(eq(collectionImportLog.id, id));
    return result;
  }

  async markCollectionImportLogUndone(id: string): Promise<void> {
    await db.update(collectionImportLog)
      .set({ undone: true, undoneAt: new Date() })
      .where(eq(collectionImportLog.id, id));
  }

  async restoreCollectionItemFields(id: string, participantId: string, fields: Record<string, any>): Promise<void> {
    await db.update(whiskybaseCollection)
      .set({ ...fields, updatedAt: new Date() })
      .where(and(eq(whiskybaseCollection.id, id), eq(whiskybaseCollection.participantId, participantId)));
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
    const HISTORIC_TASTINGS = 32;
    const HISTORIC_PARTICIPANTS_TOTAL = 35;
    const HISTORIC_PARTICIPANTS_PER_TASTING_ACTUAL = 15;
    const HISTORIC_WHISKIES_PER_TASTING = 12;
    const HISTORIC_TASTINGS_OFFSET = HISTORIC_TASTINGS;
    const HISTORIC_PARTICIPANTS_OFFSET = HISTORIC_PARTICIPANTS_TOTAL;
    const HISTORIC_RATINGS_OFFSET = HISTORIC_PARTICIPANTS_PER_TASTING_ACTUAL * HISTORIC_WHISKIES_PER_TASTING * HISTORIC_TASTINGS;

    const [tastingCount] = await db.select({ count: sql<number>`count(*)::int` }).from(tastings).where(ne(tastings.status, "deleted"));
    const allParticipantRecords = await db.select({ id: participants.id, name: participants.name, pin: participants.pin }).from(participants);
    const uniquePersonCount = await deduplicateParticipantList(allParticipantRecords);
    const [ratingCount] = await db.select({ count: sql<number>`count(*)::int` }).from(ratings);
    const [journalCount] = await db.select({ count: sql<number>`count(*)::int` }).from(journalEntries).where(isNull(journalEntries.deletedAt));
    const countryResult = await db.select({ country: whiskies.country }).from(whiskies).where(sql`${whiskies.country} IS NOT NULL AND ${whiskies.country} != ''`).groupBy(whiskies.country);

    const ratedWhiskyKeys = await db.select({
      name: sql<string>`lower(${whiskies.name})`,
      distillery: sql<string>`lower(coalesce(${whiskies.distillery}, ''))`,
    }).from(ratings)
      .innerJoin(whiskies, sql`${ratings.whiskyId} = ${whiskies.id}`)
      .groupBy(sql`lower(${whiskies.name})`, sql`lower(coalesce(${whiskies.distillery}, ''))`);

    const benchmarkKeys = new Set<string>(
      ratedWhiskyKeys.map(r => `${r.name}::${r.distillery}`)
    );

    try {
      const historicalWhiskyKeys = await db.select({
        name: sql<string>`lower(coalesce(${historicalTastingEntries.whiskyNameRaw}, ''))`,
        distillery: sql<string>`lower(coalesce(${historicalTastingEntries.distilleryRaw}, ''))`,
      }).from(historicalTastingEntries)
        .where(sql`(${historicalTastingEntries.normalizedTotal} IS NOT NULL OR ${historicalTastingEntries.totalScore} IS NOT NULL) AND (${historicalTastingEntries.whiskyNameRaw} IS NOT NULL AND ${historicalTastingEntries.whiskyNameRaw} != '')`)
        .groupBy(
          sql`lower(coalesce(${historicalTastingEntries.whiskyNameRaw}, ''))`,
          sql`lower(coalesce(${historicalTastingEntries.distilleryRaw}, ''))`
        );

      for (const h of historicalWhiskyKeys) {
        benchmarkKeys.add(`${h.name}::${h.distillery}`);
      }
    } catch (histErr) {
      console.error("getPlatformStats: failed to load historical entries for benchmark count", histErr);
    }

    return {
      totalTastings: (tastingCount?.count ?? 0) + HISTORIC_TASTINGS_OFFSET,
      totalParticipants: uniquePersonCount + HISTORIC_PARTICIPANTS_OFFSET,
      totalWhiskies: benchmarkKeys.size,
      totalRatings: (ratingCount?.count ?? 0) + HISTORIC_RATINGS_OFFSET,
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
    caskType: string | null;
    peatLevel: string | null;
    age: string | null;
    abv: number | null;
    imageUrl: string | null;
  }>> {
    const all = await getAllCommunityRatings();

    type Group = {
      entries: CommunityRatingEntry[];
      meta: {
        name: string;
        distillery: string | null;
        whiskybaseId: string | null;
        region: string | null;
        category: string | null;
        caskType: string | null;
        peatLevel: string | null;
        age: string | null;
        abv: number | null;
        imageUrl: string | null;
      };
    };
    const sourcePriority: Record<CommunityRatingSource, number> = { rating: 0, journal: 1, collection: 2, historical: 3 };
    const grouped = new Map<string, Group>();
    for (const e of all) {
      let g = grouped.get(e.whiskyKey);
      if (!g) {
        g = {
          entries: [],
          meta: {
            name: e.name,
            distillery: e.distillery,
            whiskybaseId: e.whiskybaseId,
            region: e.region,
            category: e.category,
            caskType: e.caskType,
            peatLevel: e.peatLevel,
            age: e.age,
            abv: e.abv,
            imageUrl: e.imageUrl,
          },
        };
        grouped.set(e.whiskyKey, g);
      }
      g.entries.push(e);
      // Prefer the most-canonical source's metadata (rating > journal > collection > historical)
      // and fill in any missing fields from later sources.
      const m = g.meta;
      const fillIfMissing = <K extends keyof typeof m>(k: K, v: typeof m[K]) => { if (m[k] == null && v != null) m[k] = v; };
      fillIfMissing('imageUrl', e.imageUrl);
      fillIfMissing('region', e.region);
      fillIfMissing('category', e.category);
      fillIfMissing('caskType', e.caskType);
      fillIfMissing('peatLevel', e.peatLevel);
      fillIfMissing('age', e.age);
      fillIfMissing('abv', e.abv);
      fillIfMissing('whiskybaseId', e.whiskybaseId);
    }

    const avg = (arr: number[]) => Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;

    const results = [];
    for (const [key, data] of grouped) {
      const { entries, meta } = data;
      if (entries.length < 2) continue;

      // Pick the canonical name/distillery from the highest-priority source present.
      const canonical = [...entries].sort((a, b) => sourcePriority[a.source] - sourcePriority[b.source])[0];
      const overalls = entries.map(e => e.score);
      const noses = entries.map(e => e.nose).filter((v): v is number => v != null);
      const tastes = entries.map(e => e.taste).filter((v): v is number => v != null);
      const finishes = entries.map(e => e.finish).filter((v): v is number => v != null);
      const raters = new Set(entries.map(e => e.participantId));

      results.push({
        whiskyKey: key,
        name: canonical.name || meta.name,
        distillery: canonical.distillery ?? meta.distillery,
        whiskybaseId: meta.whiskybaseId,
        avgOverall: avg(overalls),
        avgNose: noses.length ? avg(noses) : 0,
        avgTaste: tastes.length ? avg(tastes) : 0,
        avgFinish: finishes.length ? avg(finishes) : 0,
        totalRatings: entries.length,
        totalRaters: raters.size,
        region: meta.region,
        category: meta.category,
        caskType: meta.caskType,
        peatLevel: meta.peatLevel,
        age: meta.age,
        abv: meta.abv,
        imageUrl: meta.imageUrl,
      });
    }

    return results.sort((a, b) => b.avgOverall - a.avgOverall);
  }

  async getPublicInsights(): Promise<{
    communityPulse: { totalRatings: number; totalWhiskies: number; totalTasters: number; avgOverall: number };
    topRated: Array<{ name: string; distillery: string | null; region: string | null; avgOverall: number; ratingCount: number; imageUrl: string | null }>;
    mostExplored: Array<{ name: string; distillery: string | null; region: string | null; avgOverall: number; ratingCount: number; imageUrl: string | null }>;
    regionalHighlights: Array<{ region: string; avgOverall: number; count: number }>;
    flavorTrends: { peatLevels: Record<string, number>; caskTypes: Record<string, number> };
    divisiveDrams: Array<{ name: string; distillery: string | null; region: string | null; avgOverall: number; variance: number; ratingCount: number; imageUrl: string | null }>;
  }> {
    const all = await getAllCommunityRatings();

    type Group = {
      scores: number[];
      participantIds: Set<string>;
      meta: {
        name: string;
        distillery: string | null;
        region: string | null;
        peatLevel: string | null;
        caskType: string | null;
        imageUrl: string | null;
      };
    };
    const sourcePriority: Record<CommunityRatingSource, number> = { rating: 0, journal: 1, collection: 2, historical: 3 };
    const groupedMap = new Map<string, Group>();
    for (const e of all) {
      let g = groupedMap.get(e.whiskyKey);
      if (!g) {
        g = {
          scores: [],
          participantIds: new Set(),
          meta: { name: e.name, distillery: e.distillery, region: e.region, peatLevel: e.peatLevel, caskType: e.caskType, imageUrl: e.imageUrl },
        };
        groupedMap.set(e.whiskyKey, g);
      }
      g.scores.push(e.score);
      g.participantIds.add(e.participantId);
      const m = g.meta;
      if (!m.imageUrl && e.imageUrl) m.imageUrl = e.imageUrl;
      if (!m.region && e.region) m.region = e.region;
      if (!m.peatLevel && e.peatLevel) m.peatLevel = e.peatLevel;
      if (!m.caskType && e.caskType) m.caskType = e.caskType;
    }
    // Replace name/distillery with the canonical (highest-priority) source representation.
    const bySource = new Map<string, CommunityRatingEntry>();
    for (const e of all) {
      const cur = bySource.get(e.whiskyKey);
      if (!cur || sourcePriority[e.source] < sourcePriority[cur.source]) bySource.set(e.whiskyKey, e);
    }
    for (const [key, g] of groupedMap) {
      const c = bySource.get(key);
      if (c) { g.meta.name = c.name; g.meta.distillery = c.distillery; }
    }

    const allParticipantIds = new Set<string>();
    const entries = Array.from(groupedMap.values()).filter(g => g.scores.length >= 1);
    for (const g of entries) {
      for (const pid of g.participantIds) allParticipantIds.add(pid);
    }

    const avg = (arr: number[]) => arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0;
    const variance = (arr: number[]) => {
      if (arr.length < 2) return 0;
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
      return Math.round((arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length) * 10) / 10;
    };

    const allOveralls = entries.flatMap(g => g.scores);
    const uniqueTasters = await getUniquePersonCount(Array.from(allParticipantIds));

    const communityPulse = {
      totalRatings: allOveralls.length,
      totalWhiskies: entries.length,
      totalTasters: uniqueTasters,
      avgOverall: avg(allOveralls),
    };

    const scored = entries.map(g => ({
      name: g.meta.name,
      distillery: g.meta.distillery,
      region: g.meta.region,
      avgOverall: avg(g.scores),
      ratingCount: g.scores.length,
      imageUrl: g.meta.imageUrl,
      peatLevel: g.meta.peatLevel,
      caskType: g.meta.caskType,
      variance: variance(g.scores),
    }));

    const topRated = [...scored]
      .sort((a, b) => b.avgOverall - a.avgOverall)
      .slice(0, 5)
      .map(({ peatLevel, caskType, variance, ...rest }) => rest);

    const mostExplored = [...scored]
      .sort((a, b) => b.ratingCount - a.ratingCount)
      .slice(0, 5)
      .map(({ peatLevel, caskType, variance, ...rest }) => rest);

    const regionMap: Record<string, { scores: number[] }> = {};
    for (const s of scored) {
      if (!s.region) continue;
      if (!regionMap[s.region]) regionMap[s.region] = { scores: [] };
      regionMap[s.region].scores.push(s.avgOverall);
    }
    const regionalHighlights = Object.entries(regionMap)
      .map(([region, data]) => ({ region, avgOverall: avg(data.scores), count: data.scores.length }))
      .filter(r => r.count >= 2)
      .sort((a, b) => b.avgOverall - a.avgOverall);

    const peatLevels: Record<string, number> = {};
    const caskTypes: Record<string, number> = {};
    for (const s of scored) {
      if (s.peatLevel) peatLevels[s.peatLevel] = (peatLevels[s.peatLevel] || 0) + 1;
      if (s.caskType) caskTypes[s.caskType] = (caskTypes[s.caskType] || 0) + 1;
    }

    const divisiveDrams = [...scored]
      .filter(s => s.ratingCount >= 3)
      .sort((a, b) => b.variance - a.variance)
      .slice(0, 3)
      .map(({ peatLevel, caskType, ...rest }) => rest);

    return { communityPulse, topRated, mostExplored, regionalHighlights, flavorTrends: { peatLevels, caskTypes }, divisiveDrams };
  }

  async getTasteTwins(participantId: string): Promise<Array<{
    participantId: string;
    participantName: string;
    correlation: number;
    sharedWhiskies: number;
  }>> {
    const all = await getAllCommunityRatings();

    // Average per (participant, whiskyKey) so multiple sources for the same person/whisky collapse.
    const perPerson = new Map<string, Map<string, number[]>>();
    for (const e of all) {
      let p = perPerson.get(e.participantId);
      if (!p) { p = new Map(); perPerson.set(e.participantId, p); }
      let arr = p.get(e.whiskyKey);
      if (!arr) { arr = []; p.set(e.whiskyKey, arr); }
      arr.push(e.score);
    }
    const collapsed = new Map<string, Map<string, number>>();
    for (const [pid, m] of perPerson) {
      const inner = new Map<string, number>();
      for (const [k, scores] of m) {
        inner.set(k, scores.reduce((a, b) => a + b, 0) / scores.length);
      }
      collapsed.set(pid, inner);
    }

    const myScores = collapsed.get(participantId);
    if (!myScores || myScores.size === 0) return [];

    const allParticipants = await db.select().from(participants);
    const nameMap = new Map(allParticipants.map(p => [p.id, p.name]));

    const twins = [];
    for (const [pid, theirScores] of collapsed) {
      if (pid === participantId) continue;

      const pairs: Array<{ mine: number; theirs: number }> = [];
      for (const [k, mine] of myScores) {
        const theirs = theirScores.get(k);
        if (theirs != null) pairs.push({ mine, theirs });
      }

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

  async getChangelogEntries(options?: { category?: string; from?: string; to?: string; visibleOnly?: boolean; limit?: number }): Promise<ChangelogEntry[]> {
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
    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
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

  async getCommunityMemberRole(communityId: string, participantId: string): Promise<string | null> {
    const [result] = await db.select({ role: communityMemberships.role })
      .from(communityMemberships)
      .where(and(
        eq(communityMemberships.communityId, communityId),
        eq(communityMemberships.participantId, participantId),
        eq(communityMemberships.status, "active")
      ))
      .limit(1);
    return result?.role ?? null;
  }

  async updateCommunityMemberRole(communityId: string, participantId: string, role: string): Promise<CommunityMembership | undefined> {
    const [result] = await db.update(communityMemberships)
      .set({ role, updatedAt: new Date() })
      .where(and(
        eq(communityMemberships.communityId, communityId),
        eq(communityMemberships.participantId, participantId)
      ))
      .returning();
    return result;
  }

  async getCommunityTastings(communityId: string): Promise<{ upcoming: any[]; past: any[] }> {
    const allTastingRows = await db.select().from(tastings).where(
      and(
        ne(tastings.status, "deleted"),
        sql`COALESCE(${tastings.tastingType}, 'standard') = 'standard'`,
        sql`${tastings.targetCommunityIds} IS NOT NULL AND ${tastings.targetCommunityIds} != '' AND (
          CASE WHEN ${tastings.targetCommunityIds} ~ '^\[.*\]$' THEN ${tastings.targetCommunityIds}::jsonb @> ${JSON.stringify([communityId])}::jsonb ELSE false END
        )`
      )
    );

    const tastingIds = allTastingRows.map(t => t.id);
    if (tastingIds.length === 0) return { upcoming: [], past: [] };

    const [allWhiskies, allParticipants, hostIds] = await Promise.all([
      db.select({ tastingId: whiskies.tastingId, id: whiskies.id }).from(whiskies).where(inArray(whiskies.tastingId, tastingIds)),
      db.select({ tastingId: tastingParticipants.tastingId, id: tastingParticipants.id }).from(tastingParticipants).where(inArray(tastingParticipants.tastingId, tastingIds)),
      db.select({ id: participants.id, name: participants.name }).from(participants).where(inArray(participants.id, [...new Set(allTastingRows.map(t => t.hostId))])),
    ]);

    const whiskyCounts = new Map<string, number>();
    for (const w of allWhiskies) {
      whiskyCounts.set(w.tastingId, (whiskyCounts.get(w.tastingId) || 0) + 1);
    }
    const participantCounts = new Map<string, number>();
    for (const p of allParticipants) {
      participantCounts.set(p.tastingId, (participantCounts.get(p.tastingId) || 0) + 1);
    }
    const hostNames = new Map<string, string>();
    for (const h of hostIds) {
      hostNames.set(h.id, h.name);
    }

    const now = new Date();
    const upcoming: any[] = [];
    const past: any[] = [];

    for (const t of allTastingRows) {
      const entry = {
        id: t.id,
        title: t.title,
        date: t.date,
        status: t.status,
        hostId: t.hostId,
        hostName: hostNames.get(t.hostId) || "Unknown",
        whiskyCount: whiskyCounts.get(t.id) || 0,
        participantCount: participantCounts.get(t.id) || 0,
        coverImageUrl: t.coverImageUrl,
      };

      const tastingDate = new Date(t.date);
      const isUpcoming = ["draft", "open"].includes(t.status) || tastingDate > now;
      if (isUpcoming) {
        upcoming.push(entry);
      } else {
        past.push(entry);
      }
    }

    upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    past.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { upcoming, past };
  }

  async createCommunityInvite(data: InsertCommunityInvite): Promise<CommunityInvite> {
    const [result] = await db.insert(communityInvites).values(data).returning();
    return result;
  }

  async getCommunityInviteById(id: string): Promise<CommunityInvite | undefined> {
    const [result] = await db.select().from(communityInvites).where(eq(communityInvites.id, id)).limit(1);
    return result;
  }

  async getCommunityInviteByToken(token: string): Promise<CommunityInvite | undefined> {
    const [result] = await db.select().from(communityInvites).where(eq(communityInvites.token, token)).limit(1);
    return result;
  }

  async getPendingCommunityInvites(participantId: string): Promise<(CommunityInvite & { communityName?: string; inviterName?: string })[]> {
    const rows = await db.select({
      id: communityInvites.id,
      communityId: communityInvites.communityId,
      invitedEmail: communityInvites.invitedEmail,
      invitedParticipantId: communityInvites.invitedParticipantId,
      invitedByParticipantId: communityInvites.invitedByParticipantId,
      token: communityInvites.token,
      status: communityInvites.status,
      personalNote: communityInvites.personalNote,
      createdAt: communityInvites.createdAt,
      acceptedAt: communityInvites.acceptedAt,
      communityName: communities.name,
      inviterName: participants.name,
    })
    .from(communityInvites)
    .leftJoin(communities, eq(communityInvites.communityId, communities.id))
    .leftJoin(participants, eq(communityInvites.invitedByParticipantId, participants.id))
    .where(and(
      eq(communityInvites.invitedParticipantId, participantId),
      eq(communityInvites.status, "pending")
    ))
    .orderBy(desc(communityInvites.createdAt));
    return rows.map(r => ({ ...r, communityName: r.communityName ?? undefined, inviterName: r.inviterName ?? undefined }));
  }

  async getPendingCommunityInvitesByEmail(email: string): Promise<(CommunityInvite & { communityName?: string; inviterName?: string })[]> {
    const rows = await db.select({
      id: communityInvites.id,
      communityId: communityInvites.communityId,
      invitedEmail: communityInvites.invitedEmail,
      invitedParticipantId: communityInvites.invitedParticipantId,
      invitedByParticipantId: communityInvites.invitedByParticipantId,
      token: communityInvites.token,
      status: communityInvites.status,
      personalNote: communityInvites.personalNote,
      createdAt: communityInvites.createdAt,
      acceptedAt: communityInvites.acceptedAt,
      communityName: communities.name,
      inviterName: participants.name,
    })
    .from(communityInvites)
    .leftJoin(communities, eq(communityInvites.communityId, communities.id))
    .leftJoin(participants, eq(communityInvites.invitedByParticipantId, participants.id))
    .where(and(
      sql`lower(${communityInvites.invitedEmail}) = ${email.toLowerCase().trim()}`,
      eq(communityInvites.status, "pending")
    ))
    .orderBy(desc(communityInvites.createdAt));
    return rows.map(r => ({ ...r, communityName: r.communityName ?? undefined, inviterName: r.inviterName ?? undefined }));
  }

  async acceptCommunityInvite(id: string): Promise<CommunityInvite | undefined> {
    const [result] = await db.update(communityInvites)
      .set({ status: "accepted", acceptedAt: new Date() })
      .where(eq(communityInvites.id, id))
      .returning();
    return result;
  }

  async declineCommunityInvite(id: string): Promise<CommunityInvite | undefined> {
    const [result] = await db.update(communityInvites)
      .set({ status: "declined" })
      .where(eq(communityInvites.id, id))
      .returning();
    return result;
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
    topWhiskies: Array<{ distillery: string | null; name: string | null; totalScore: number | null; normalizedTotal: number | null; tastingNumber: number; titleDe: string | null; titleEn: string | null }>;
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
        titleDe: historicalTastings.titleDe,
        titleEn: historicalTastings.titleEn,
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
      titleDe: r.titleDe,
      titleEn: r.titleEn,
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
      const durationSeconds = Math.round(durationMs / 1000);
      const durationMinutes = Math.round(durationMs / 60000);
      const updateData: Record<string, any> = { endedAt: now, durationMinutes, durationSeconds };
      if (pageContext) {
        updateData.exitPage = pageContext;
        updateData.pageContext = pageContext;
        updateData.pageCount = sql`COALESCE(${userActivitySessions.pageCount}, 0) + 1`;
      }
      await db.update(userActivitySessions)
        .set(updateData)
        .where(eq(userActivitySessions.id, existing.id));
    } else {
      await db.insert(userActivitySessions).values({
        participantId,
        startedAt: now,
        endedAt: now,
        durationMinutes: 0,
        durationSeconds: 0,
        pageContext: pageContext || null,
        entryPage: pageContext || null,
        exitPage: pageContext || null,
        pageCount: 1,
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
    if (filters.minDuration) conditions.push(sql`COALESCE(${userActivitySessions.durationSeconds}, ${userActivitySessions.durationMinutes} * 60) >= ${filters.minDuration}`);

    let query = db.select().from(userActivitySessions);
    if (conditions.length > 0) query = query.where(and(...conditions)) as typeof query;
    query = query.orderBy(desc(userActivitySessions.startedAt)) as typeof query;
    if (filters.limit) query = query.limit(filters.limit) as typeof query;
    if (filters.offset) query = query.offset(filters.offset) as typeof query;
    return query;
  }

  async getActivitySummary(from?: Date, to?: Date, userIds?: string[]): Promise<{
    totalSessions: number;
    uniqueUsers: number;
    avgDurationSeconds: number;
    medianDurationSeconds: number;
    totalSeconds: number;
    byDay: { date: string; sessions: number; uniqueUsers: number }[];
    byHour: { hour: number; sessions: number }[];
    topUsers: { id: string; name: string; email: string; sessions: number; totalSeconds: number; lastActive: Date | null }[];
  }> {
    const conditions = [];
    if (from) conditions.push(gte(userActivitySessions.startedAt, from));
    if (to) conditions.push(sql`${userActivitySessions.startedAt} <= ${to}`);
    if (userIds && userIds.length > 0) {
      conditions.push(inArray(userActivitySessions.participantId, userIds));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const secExpr = sql`COALESCE(${userActivitySessions.durationSeconds}, ${userActivitySessions.durationMinutes} * 60)`;

    const [totals] = await db.select({
      totalSessions: sql<number>`count(*)::int`,
      uniqueUsers: sql<number>`count(distinct ${userActivitySessions.participantId})::int`,
      avgDuration: sql<number>`coalesce(avg(${secExpr}), 0)::int`,
      medianDuration: sql<number>`coalesce(percentile_cont(0.5) within group (order by ${secExpr}), 0)::int`,
      totalSeconds: sql<number>`coalesce(sum(${secExpr}), 0)::int`,
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
      totalSeconds: sql<number>`coalesce(sum(${secExpr}), 0)::int`,
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
      avgDurationSeconds: totals?.avgDuration || 0,
      medianDurationSeconds: totals?.medianDuration || 0,
      totalSeconds: totals?.totalSeconds || 0,
      byDay: byDay as { date: string; sessions: number; uniqueUsers: number }[],
      byHour: byHour as { hour: number; sessions: number }[],
      topUsers: topUsers as { id: string; name: string; email: string; sessions: number; totalSeconds: number; lastActive: Date | null }[],
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

  // --- Distilleries ---
  async getAllDistilleries(): Promise<Distillery[]> {
    return db.select().from(distilleries).orderBy(asc(distilleries.name));
  }

  async getDistillery(id: string): Promise<Distillery | undefined> {
    const [result] = await db.select().from(distilleries).where(eq(distilleries.id, id));
    return result;
  }

  async createDistillery(data: InsertDistillery): Promise<Distillery> {
    const [result] = await db.insert(distilleries).values(data).returning();
    return result;
  }

  async updateDistillery(id: string, data: Partial<InsertDistillery>): Promise<Distillery | undefined> {
    const [result] = await db.update(distilleries).set(data).where(eq(distilleries.id, id)).returning();
    return result;
  }

  async deleteDistillery(id: string): Promise<void> {
    await db.delete(distilleries).where(eq(distilleries.id, id));
  }

  async getDistilleryCount(): Promise<number> {
    const [{ cnt }] = await db.select({ cnt: sql`count(*)::int` }).from(distilleries);
    return Number(cnt);
  }

  async createDistilleries(data: InsertDistillery[]): Promise<Distillery[]> {
    if (data.length === 0) return [];
    return db.insert(distilleries).values(data).returning();
  }

  async getAllBottlers(): Promise<Bottler[]> {
    return db.select().from(bottlers).orderBy(asc(bottlers.name));
  }

  async getBottler(id: string): Promise<Bottler | undefined> {
    const [result] = await db.select().from(bottlers).where(eq(bottlers.id, id));
    return result;
  }

  async createBottler(data: InsertBottler): Promise<Bottler> {
    const [result] = await db.insert(bottlers).values(data).returning();
    return result;
  }

  async updateBottler(id: string, data: Partial<InsertBottler>): Promise<Bottler | undefined> {
    const [result] = await db.update(bottlers).set(data).where(eq(bottlers.id, id)).returning();
    return result;
  }

  async deleteBottler(id: string): Promise<void> {
    await db.delete(bottlers).where(eq(bottlers.id, id));
  }

  async getBottlerCount(): Promise<number> {
    const [{ cnt }] = await db.select({ cnt: sql`count(*)::int` }).from(bottlers);
    return Number(cnt);
  }

  async createBottlers(data: InsertBottler[]): Promise<Bottler[]> {
    if (data.length === 0) return [];
    return db.insert(bottlers).values(data).returning();
  }

  // --- Bottle Splits ---
  async getBottleSplit(id: string): Promise<BottleSplit | undefined> {
    const [result] = await db.select().from(bottleSplits).where(eq(bottleSplits.id, id));
    return result;
  }

  async getPublicBottleSplits(): Promise<BottleSplit[]> {
    return db.select().from(bottleSplits)
      .where(and(eq(bottleSplits.visibility, "public"), ne(bottleSplits.status, "cancelled")))
      .orderBy(desc(bottleSplits.createdAt));
  }

  async getBottleSplitsForParticipant(participantId: string): Promise<BottleSplit[]> {
    const hosted = await db.select().from(bottleSplits).where(eq(bottleSplits.hostId, participantId)).orderBy(desc(bottleSplits.createdAt));
    const claimedRows = await db.select({ splitId: bottleSplitClaims.splitId }).from(bottleSplitClaims).where(eq(bottleSplitClaims.participantId, participantId));
    const claimedIds = claimedRows.map(r => r.splitId).filter(id => !hosted.some(h => h.id === id));
    let claimed: BottleSplit[] = [];
    if (claimedIds.length > 0) {
      claimed = await db.select().from(bottleSplits).where(inArray(bottleSplits.id, claimedIds)).orderBy(desc(bottleSplits.createdAt));
    }
    return [...hosted, ...claimed];
  }

  async createBottleSplit(data: InsertBottleSplit): Promise<BottleSplit> {
    const [result] = await db.insert(bottleSplits).values(data).returning();
    return result;
  }

  async updateBottleSplit(id: string, data: Partial<Record<string, any>>): Promise<BottleSplit | undefined> {
    const [result] = await db.update(bottleSplits).set(data).where(eq(bottleSplits.id, id)).returning();
    return result;
  }

  async deleteBottleSplit(id: string): Promise<void> {
    await db.delete(bottleSplitClaims).where(eq(bottleSplitClaims.splitId, id));
    await db.delete(bottleSplits).where(eq(bottleSplits.id, id));
  }

  // --- Bottle Split Claims ---
  async getClaimsForSplit(splitId: string): Promise<(BottleSplitClaim & { participantName: string })[]> {
    const claims = await db.select().from(bottleSplitClaims).where(eq(bottleSplitClaims.splitId, splitId)).orderBy(asc(bottleSplitClaims.claimedAt));
    const enriched = await Promise.all(claims.map(async (c) => {
      const p = await this.getParticipant(c.participantId);
      return { ...c, participantName: p?.name || "Unknown" };
    }));
    return enriched;
  }

  async createBottleSplitClaim(data: InsertBottleSplitClaim): Promise<BottleSplitClaim> {
    return await db.transaction(async (tx) => {
      const existingClaims = await tx.select().from(bottleSplitClaims)
        .where(eq(bottleSplitClaims.splitId, data.splitId));
      const bottleClaims = existingClaims.filter(c => c.bottleIndex === data.bottleIndex);
      const claimedMl = bottleClaims.reduce((sum, c) => sum + c.sizeMl, 0);

      const [split] = await tx.select().from(bottleSplits)
        .where(eq(bottleSplits.id, data.splitId));
      if (!split) throw new Error("Split not found");
      const bottle = (split.bottles as any[])[data.bottleIndex];
      if (!bottle) throw new Error("Invalid bottle index");
      const availableMl = bottle.totalVolumeMl - (bottle.ownerKeepMl || 0) - claimedMl;
      if (data.sizeMl > availableMl) {
        throw new Error(`Not enough capacity. Only ${availableMl}ml remaining.`);
      }

      const [result] = await tx.insert(bottleSplitClaims).values(data).returning();
      return result;
    });
  }

  async updateBottleSplitClaim(id: string, data: Partial<{ status: string }>): Promise<BottleSplitClaim | undefined> {
    const updateData: any = { ...data };
    if (data.status === "confirmed") updateData.confirmedAt = new Date();
    const [result] = await db.update(bottleSplitClaims).set(updateData).where(eq(bottleSplitClaims.id, id)).returning();
    return result;
  }

  async deleteBottleSplitClaim(id: string): Promise<void> {
    await db.delete(bottleSplitClaims).where(eq(bottleSplitClaims.id, id));
  }

  // --- Historical Tasting Participation ---
  async claimHistoricalParticipation(historicalTastingId: string, participantId: string): Promise<HistoricalTastingParticipant> {
    const [result] = await db.insert(historicalTastingParticipants)
      .values({ historicalTastingId, participantId })
      .onConflictDoNothing({
        target: [historicalTastingParticipants.historicalTastingId, historicalTastingParticipants.participantId],
      })
      .returning();
    if (result) return result;
    const [existing] = await db.select().from(historicalTastingParticipants)
      .where(and(
        eq(historicalTastingParticipants.historicalTastingId, historicalTastingId),
        eq(historicalTastingParticipants.participantId, participantId)
      )).limit(1);
    return existing;
  }

  async unclaimHistoricalParticipation(historicalTastingId: string, participantId: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(historicalPersonalRatings)
        .where(and(
          eq(historicalPersonalRatings.participantId, participantId),
          sql`${historicalPersonalRatings.historicalTastingEntryId} IN (
            SELECT id FROM historical_tasting_entries WHERE historical_tasting_id = ${historicalTastingId}
          )`
        ));
      await tx.delete(historicalTastingParticipants)
        .where(and(
          eq(historicalTastingParticipants.historicalTastingId, historicalTastingId),
          eq(historicalTastingParticipants.participantId, participantId)
        ));
    });
  }

  async getHistoricalParticipants(historicalTastingId: string): Promise<HistoricalTastingParticipant[]> {
    return db.select().from(historicalTastingParticipants)
      .where(eq(historicalTastingParticipants.historicalTastingId, historicalTastingId));
  }

  async getHistoricalParticipationForUser(participantId: string): Promise<HistoricalTastingParticipant[]> {
    return db.select().from(historicalTastingParticipants)
      .where(eq(historicalTastingParticipants.participantId, participantId));
  }

  async isHistoricalParticipant(historicalTastingId: string, participantId: string): Promise<boolean> {
    const [result] = await db.select({ id: historicalTastingParticipants.id })
      .from(historicalTastingParticipants)
      .where(and(
        eq(historicalTastingParticipants.historicalTastingId, historicalTastingId),
        eq(historicalTastingParticipants.participantId, participantId)
      )).limit(1);
    return !!result;
  }

  async getHistoricalParticipantCounts(tastingIds: string[]): Promise<Record<string, number>> {
    if (tastingIds.length === 0) return {};
    const rows = await db.select({
      historicalTastingId: historicalTastingParticipants.historicalTastingId,
      count: sql<number>`count(*)::int`,
    }).from(historicalTastingParticipants)
      .where(inArray(historicalTastingParticipants.historicalTastingId, tastingIds))
      .groupBy(historicalTastingParticipants.historicalTastingId);
    const result: Record<string, number> = {};
    for (const r of rows) result[r.historicalTastingId] = r.count;
    return result;
  }

  async getHistoricalTastingEntryById(entryId: string): Promise<any | undefined> {
    const [entry] = await db.select().from(historicalTastingEntries).where(eq(historicalTastingEntries.id, entryId)).limit(1);
    return entry;
  }

  // --- Historical Personal Ratings ---
  async upsertHistoricalPersonalRating(data: InsertHistoricalPersonalRating): Promise<HistoricalPersonalRating> {
    const [result] = await db.insert(historicalPersonalRatings)
      .values(data)
      .onConflictDoUpdate({
        target: [historicalPersonalRatings.historicalTastingEntryId, historicalPersonalRatings.participantId],
        set: {
          nose: data.nose,
          taste: data.taste,
          finish: data.finish,
          overall: data.overall,
          notes: data.notes,
          updatedAt: new Date(),
        },
      })
      .returning();
    invalidateCommunityRatingsCache();
    return result;
  }

  async getHistoricalPersonalRatings(historicalTastingId: string, participantId: string): Promise<HistoricalPersonalRating[]> {
    return db.select().from(historicalPersonalRatings)
      .where(and(
        eq(historicalPersonalRatings.participantId, participantId),
        sql`${historicalPersonalRatings.historicalTastingEntryId} IN (
          SELECT id FROM historical_tasting_entries WHERE historical_tasting_id = ${historicalTastingId}
        )`
      ));
  }

  async getHistoricalPersonalRatingsForTasting(participantId: string, tastingId: string): Promise<HistoricalPersonalRating[]> {
    const entries = await db.select({ id: historicalTastingEntries.id })
      .from(historicalTastingEntries)
      .where(eq(historicalTastingEntries.historicalTastingId, tastingId));
    if (entries.length === 0) return [];
    const entryIds = entries.map(e => e.id);
    return db.select().from(historicalPersonalRatings)
      .where(and(
        eq(historicalPersonalRatings.participantId, participantId),
        inArray(historicalPersonalRatings.historicalTastingEntryId, entryIds),
      ));
  }

  async getHistoricalPersonalRating(entryId: string, participantId: string): Promise<HistoricalPersonalRating | undefined> {
    const [result] = await db.select().from(historicalPersonalRatings)
      .where(and(
        eq(historicalPersonalRatings.historicalTastingEntryId, entryId),
        eq(historicalPersonalRatings.participantId, participantId)
      )).limit(1);
    return result;
  }

  async createPageViews(views: Array<{ participantId: string; sessionId?: string; pagePath: string; normalizedPath: string; referrerPath?: string; timestamp: Date; durationSeconds?: number }>): Promise<void> {
    if (views.length === 0) return;
    await db.insert(pageViews).values(views.map(v => ({
      participantId: v.participantId,
      sessionId: v.sessionId || null,
      pagePath: v.pagePath,
      normalizedPath: v.normalizedPath,
      referrerPath: v.referrerPath || null,
      timestamp: v.timestamp,
      durationSeconds: v.durationSeconds ?? null,
    })));
  }

  async getPageViewsForSession(sessionId: string): Promise<PageView[]> {
    return db.select().from(pageViews)
      .where(eq(pageViews.sessionId, sessionId))
      .orderBy(asc(pageViews.timestamp));
  }

  async getPageViewsForParticipant(participantId: string, from?: Date, to?: Date, limit?: number): Promise<PageView[]> {
    const conditions = [eq(pageViews.participantId, participantId)];
    if (from) conditions.push(gte(pageViews.timestamp, from));
    if (to) conditions.push(sql`${pageViews.timestamp} <= ${to}`);
    let query = db.select().from(pageViews).where(and(...conditions)).orderBy(desc(pageViews.timestamp));
    if (limit) query = query.limit(limit) as typeof query;
    return query;
  }
}

export const storage = new DatabaseStorage();
