import { queryClient } from "./queryClient";

const API_BASE = "/api";

export function getParticipantId(): string | null {
  try {
    return sessionStorage.getItem("session_pid") || localStorage.getItem("casksense_participant_id") || null;
  } catch { return null; }
}

export function pidHeaders(): Record<string, string> {
  const pid = getParticipantId();
  return pid ? { "x-participant-id": pid } : {};
}

async function fetchJSON(url: string, options?: RequestInit) {
  const pid = getParticipantId();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (pid) headers["x-participant-id"] = pid;
  const res = await fetch(`${API_BASE}${url}`, {
    headers,
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    const err = new Error(error.message || "Request failed") as Error & { code?: string; adminEmail?: string; participantId?: string };
    if (error.code) err.code = error.code;
    if (error.adminEmail) err.adminEmail = error.adminEmail;
    if (error.participantId) err.participantId = error.participantId;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

// ===== Participants =====
export const participantApi = {
  loginOrCreate: (name: string, pin?: string, email?: string, newsletterOptIn?: boolean, privacyConsent?: boolean) =>
    fetchJSON("/participants", { method: "POST", body: JSON.stringify({ name, pin, email, newsletterOptIn, privacyConsent }) }),
  loginByEmail: (email: string, pin: string, privacyConsent?: boolean) =>
    fetchJSON("/participants/login", { method: "POST", body: JSON.stringify({ email, pin, privacyConsent }) }),
  guestJoin: (name: string, pin: string, privacyConsent?: boolean) =>
    fetchJSON("/participants/guest", { method: "POST", body: JSON.stringify({ name, pin, privacyConsent }) }),
  acceptPrivacyConsent: (id: string) =>
    fetchJSON(`/participants/${id}/privacy-consent`, { method: "PATCH", body: JSON.stringify({}) }),
  get: (id: string) => fetchJSON(`/participants/${id}`),
  setLanguage: (id: string, language: string) =>
    fetchJSON(`/participants/${id}/language`, { method: "PATCH", body: JSON.stringify({ language }) }),
  verify: (id: string, code: string) =>
    fetchJSON(`/participants/${id}/verify`, { method: "POST", body: JSON.stringify({ code }) }),
  resendVerification: (id: string) =>
    fetchJSON(`/participants/${id}/resend-verification`, { method: "POST", body: JSON.stringify({}) }),
  heartbeat: (id: string, pageContext?: string) =>
    fetchJSON(`/participants/${id}/heartbeat`, { method: "POST", body: JSON.stringify({ pageContext }) }),
};

// ===== Tastings =====
export const tastingApi = {
  getAll: (participantId?: string) => fetchJSON(participantId ? `/tastings?participantId=${participantId}` : "/tastings"),
  get: (id: string) => fetchJSON(`/tastings/${id}`),
  getByCode: (code: string) => fetchJSON(`/tastings/code/${code}`),
  create: (data: any) => fetchJSON("/tastings", { method: "POST", body: JSON.stringify(data) }),
  updateStatus: (id: string, status: string, currentAct?: string, hostId?: string, clearRatings?: boolean) =>
    fetchJSON(`/tastings/${id}/status`, { method: "PATCH", body: JSON.stringify({ status, currentAct, hostId, clearRatings }) }),
  updateReflection: (id: string, reflection: string) =>
    fetchJSON(`/tastings/${id}/reflection`, { method: "PATCH", body: JSON.stringify({ reflection }) }),
  hardDelete: (id: string, participantId: string) =>
    fetchJSON(`/tastings/${id}`, { method: "DELETE", body: JSON.stringify({ participantId }) }),
  updateDetails: (id: string, hostId: string, data: any) =>
    fetchJSON(`/tastings/${id}/details`, { method: "PATCH", body: JSON.stringify({ hostId, ...data }) }),
  duplicate: (id: string, hostId: string) =>
    fetchJSON(`/tastings/${id}/duplicate`, { method: "POST", body: JSON.stringify({ hostId }) }),
  getParticipants: (id: string) => fetchJSON(`/tastings/${id}/participants`),
  heartbeat: (id: string, participantId: string) =>
    fetchJSON(`/tastings/${id}/heartbeat`, { method: "POST", body: JSON.stringify({ participantId }) }),
  getPresence: (id: string) => fetchJSON(`/tastings/${id}/presence`),
  join: (id: string, participantId: string, code?: string) =>
    fetchJSON(`/tastings/${id}/join`, { method: "POST", body: JSON.stringify({ participantId, code }) }),
  guestJoin: (id: string, name: string, code?: string) =>
    fetchJSON(`/tastings/${id}/guest-join`, { method: "POST", body: JSON.stringify({ name, code }) }),
  getAnalytics: (id: string, requesterId?: string) => fetchJSON(`/tastings/${id}/analytics${requesterId ? `?requesterId=${requesterId}` : ''}`),
  revealAllPhotos: (id: string, revealed: boolean, hostId: string) => fetchJSON(`/tastings/${id}/reveal-all-photos`, { method: "POST", body: JSON.stringify({ revealed, hostId }) }),
  uploadCoverImage: async (id: string, file: File, hostId: string) => {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("hostId", hostId);
    const res = await fetch(`${API_BASE}/tastings/${id}/cover-image`, { method: "POST", body: formData });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(error.message || "Upload failed");
    }
    return res.json();
  },
  deleteCoverImage: (id: string, hostId: string) =>
    fetchJSON(`/tastings/${id}/cover-image`, { method: "DELETE", body: JSON.stringify({ hostId }) }),
  transferHost: (id: string, hostId: string, newHostId: string) =>
    fetchJSON(`/tastings/${id}/transfer-host`, { method: "POST", body: JSON.stringify({ hostId, newHostId }) }),
  toggleCoverImageReveal: (id: string, hostId: string, revealed: boolean) =>
    fetchJSON(`/tastings/${id}/cover-image-reveal`, { method: "PATCH", body: JSON.stringify({ hostId, revealed }) }),
  aiImport: async (files: File[], text: string, hostId: string) => {
    const formData = new FormData();
    formData.append("hostId", hostId);
    formData.append("text", text);
    for (const file of files) {
      formData.append("files", file);
    }
    const res = await fetch(`${API_BASE}/tastings/ai-import`, { method: "POST", body: formData });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(error.message || "Import failed");
    }
    return res.json();
  },
  createFromImport: (data: any) =>
    fetchJSON("/tastings/create-from-import", { method: "POST", body: JSON.stringify(data) }),
};

// ===== Whiskies =====
export const whiskyApi = {
  getForTasting: (tastingId: string) => fetchJSON(`/tastings/${tastingId}/whiskies`),
  create: (data: any) => fetchJSON("/whiskies", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: any) => fetchJSON(`/whiskies/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) => fetchJSON(`/whiskies/${id}`, { method: "DELETE" }),
  reorder: (tastingId: string, order: { id: string; sortOrder: number }[]) =>
    fetchJSON(`/tastings/${tastingId}/reorder`, { method: "PATCH", body: JSON.stringify({ order }) }),
  uploadImage: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    const res = await fetch(`${API_BASE}/whiskies/${id}/image`, { method: "POST", body: formData });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(error.message || "Upload failed");
    }
    return res.json();
  },
  deleteImage: (id: string) => fetchJSON(`/whiskies/${id}/image`, { method: "DELETE" }),
  revealPhoto: (id: string, revealed: boolean, hostId: string) => fetchJSON(`/whiskies/${id}/reveal-photo`, { method: "PATCH", body: JSON.stringify({ revealed, hostId }) }),
};

// ===== Flight Import =====
export const importApi = {
  parse: async (tastingId: string, spreadsheet: File, imageFiles?: File[]) => {
    const formData = new FormData();
    formData.append("spreadsheet", spreadsheet);
    if (imageFiles) {
      for (const f of imageFiles) formData.append("images", f);
    }
    const res = await fetch(`${API_BASE}/tastings/${tastingId}/import/parse`, { method: "POST", body: formData });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(error.message || "Parse failed");
    }
    return res.json();
  },
  confirm: async (tastingId: string, spreadsheet: File, imageFiles?: File[], imageMapping?: Record<string, string>) => {
    const formData = new FormData();
    formData.append("spreadsheet", spreadsheet);
    if (imageFiles) {
      for (const f of imageFiles) formData.append("images", f);
    }
    if (imageMapping) {
      formData.append("imageMapping", JSON.stringify(imageMapping));
    }
    const res = await fetch(`${API_BASE}/tastings/${tastingId}/import/confirm`, { method: "POST", body: formData });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(error.message || "Import failed");
    }
    return res.json();
  },
};

// ===== Whisky of the Day =====
export const wotdApi = {
  get: () => fetchJSON("/whisky-of-the-day"),
};

// ===== Profiles =====
export const profileApi = {
  get: (participantId: string) => fetchJSON(`/profiles/${participantId}`),
  update: (participantId: string, data: any) =>
    fetchJSON(`/profiles/${participantId}`, { method: "PUT", body: JSON.stringify(data) }),
  uploadPhoto: async (participantId: string, file: File) => {
    const formData = new FormData();
    formData.append("photo", file);
    const res = await fetch(`${API_BASE}/profiles/${participantId}/photo`, { method: "POST", body: formData });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(error.message || "Upload failed");
    }
    return res.json();
  },
  deletePhoto: (participantId: string) =>
    fetchJSON(`/profiles/${participantId}/photo`, { method: "DELETE" }),
};

// ===== Invites =====
export const inviteApi = {
  getForTasting: (tastingId: string) => fetchJSON(`/tastings/${tastingId}/invites`),
  sendInvites: (tastingId: string, emails: string[], personalNote?: string) =>
    fetchJSON(`/tastings/${tastingId}/invites`, {
      method: "POST",
      body: JSON.stringify({ emails, personalNote }),
    }),
  getByToken: (token: string) => fetchJSON(`/invites/${token}`),
  accept: (token: string, participantId: string) =>
    fetchJSON(`/invites/${token}/accept`, {
      method: "POST",
      body: JSON.stringify({ participantId }),
    }),
  getMyInvites: () => fetchJSON(`/my-invites`),
  smtpStatus: () => fetchJSON(`/smtp/status`),
};

// ===== Roster =====
export const rosterApi = {
  get: (tastingId: string) => fetchJSON(`/tastings/${tastingId}/roster`),
};

// ===== Participant update =====
export const participantUpdateApi = {
  update: (id: string, data: any) =>
    fetchJSON(`/participants/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
};

// ===== Blind Mode / Reveal =====
export const blindModeApi = {
  update: (tastingId: string, hostId: string, data: any) =>
    fetchJSON(`/tastings/${tastingId}/blind-mode`, {
      method: "PATCH",
      body: JSON.stringify({ hostId, ...data }),
    }),
  revealNext: (tastingId: string, hostId: string) =>
    fetchJSON(`/tastings/${tastingId}/reveal-next`, {
      method: "POST",
      body: JSON.stringify({ hostId }),
    }),
};

// ===== Guided Tasting =====
export const guidedApi = {
  updateMode: (tastingId: string, hostId: string, data: any) =>
    fetchJSON(`/tastings/${tastingId}/guided-mode`, {
      method: "PATCH",
      body: JSON.stringify({ hostId, ...data }),
    }),
  advance: (tastingId: string, hostId: string) =>
    fetchJSON(`/tastings/${tastingId}/guided-advance`, {
      method: "PATCH",
      body: JSON.stringify({ hostId }),
    }),
  goTo: (tastingId: string, hostId: string, whiskyIndex: number, revealStep?: number) =>
    fetchJSON(`/tastings/${tastingId}/guided-goto`, {
      method: "POST",
      body: JSON.stringify({ hostId, whiskyIndex, revealStep }),
    }),
  enrichWhisky: (whiskyId: string, participantId: string) =>
    fetchJSON(`/whiskies/${whiskyId}/ai-enrich`, {
      method: "POST",
      body: JSON.stringify({ participantId }),
    }),
};

// ===== Presentation =====
export const presentationApi = {
  start: (tastingId: string, hostId: string) =>
    fetchJSON(`/tastings/${tastingId}/presentation-start`, {
      method: "POST",
      body: JSON.stringify({ hostId }),
    }),
  setSlide: (tastingId: string, hostId: string, slide: number) =>
    fetchJSON(`/tastings/${tastingId}/presentation-slide`, {
      method: "POST",
      body: JSON.stringify({ hostId, slide }),
    }),
  stop: (tastingId: string, hostId: string) =>
    fetchJSON(`/tastings/${tastingId}/presentation-stop`, {
      method: "POST",
      body: JSON.stringify({ hostId }),
    }),
};

// ===== Discussions =====
export const discussionApi = {
  get: (tastingId: string) => fetchJSON(`/tastings/${tastingId}/discussions`),
  post: (tastingId: string, participantId: string, text: string) =>
    fetchJSON(`/tastings/${tastingId}/discussions`, {
      method: "POST",
      body: JSON.stringify({ participantId, text }),
    }),
};

// ===== Reflections =====
export const reflectionApi = {
  getAll: (tastingId: string) => fetchJSON(`/tastings/${tastingId}/reflections`),
  getMine: (tastingId: string, participantId: string) =>
    fetchJSON(`/tastings/${tastingId}/reflections/mine/${participantId}`),
  post: (tastingId: string, data: { participantId: string; promptText: string; text: string; isAnonymous?: boolean }) =>
    fetchJSON(`/tastings/${tastingId}/reflections`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ===== Whisky Friends =====
export const friendsApi = {
  getAll: (participantId: string) => fetchJSON(`/participants/${participantId}/friends`),
  getPending: (participantId: string) => fetchJSON(`/participants/${participantId}/friends/pending`),
  create: (participantId: string, data: { firstName: string; lastName: string; email: string }) =>
    fetchJSON(`/participants/${participantId}/friends`, { method: "POST", body: JSON.stringify(data) }),
  update: (participantId: string, friendId: string, data: { firstName: string; lastName: string; email: string }) =>
    fetchJSON(`/participants/${participantId}/friends/${friendId}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (participantId: string, friendId: string) =>
    fetchJSON(`/participants/${participantId}/friends/${friendId}`, { method: "DELETE" }),
  accept: (participantId: string, friendId: string) =>
    fetchJSON(`/participants/${participantId}/friends/${friendId}/accept`, { method: "POST" }),
  decline: (participantId: string, friendId: string) =>
    fetchJSON(`/participants/${participantId}/friends/${friendId}/decline`, { method: "POST" }),
};

// ===== Journal =====
export const journalApi = {
  getAll: (participantId: string) => fetchJSON(`/journal/${participantId}`),
  get: (participantId: string, id: string) => fetchJSON(`/journal/${participantId}/${id}`),
  create: (participantId: string, data: any) =>
    fetchJSON(`/journal/${participantId}`, { method: "POST", body: JSON.stringify(data) }),
  update: (participantId: string, id: string, data: any) =>
    fetchJSON(`/journal/${participantId}/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (participantId: string, id: string) =>
    fetchJSON(`/journal/${participantId}/${id}`, { method: "DELETE" }),
};

// ===== Participant Stats =====
export const statsApi = {
  get: (participantId: string) => fetchJSON(`/participants/${participantId}/stats`),
};

export const platformStatsApi = {
  get: () => fetchJSON(`/platform-stats`),
};

export const platformAnalyticsApi = {
  get: (requesterId: string) => fetchJSON(`/platform-analytics?requesterId=${requesterId}`),
  getAiAnalysis: (requesterId: string, analyticsData: any) =>
    fetchJSON(`/platform-analytics/ai-analysis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requesterId, analyticsData }),
    }),
};

// ===== Flavor Profile =====
export const flavorProfileApi = {
  get: (participantId: string) => fetchJSON(`/participants/${participantId}/flavor-profile`),
  getGlobal: () => fetchJSON(`/flavor-profile/global`),
  getWhiskyProfile: (participantId: string, source?: string, compare?: string) => {
    const params = new URLSearchParams();
    if (source) params.set("source", source);
    if (compare) params.set("compare", compare);
    return fetchJSON(`/participants/${participantId}/whisky-profile?${params.toString()}`);
  },
};

// ===== Community Scores =====
export const communityApi = {
  getScores: () => fetchJSON(`/community-scores`),
  getTasteTwins: (participantId: string) => fetchJSON(`/participants/${participantId}/taste-twins`),
  getContributors: () => fetchJSON("/community-contributors"),
};

// ===== Public Insights (no auth needed) =====
export const publicInsightsApi = {
  get: async () => {
    const res = await fetch(`${API_BASE}/public/insights`);
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(error.message || "Request failed");
    }
    return res.json();
  },
};

// ===== Rating Notes =====
export const ratingNotesApi = {
  get: (participantId: string) => fetchJSON(`/participants/${participantId}/rating-notes`),
};

// ===== Friend Activity Feed =====
export const activityApi = {
  getFriendActivity: (participantId: string) => fetchJSON(`/participants/${participantId}/friend-activity`),
};

// ===== Calendar =====
export const calendarApi = {
  getAll: (participantId?: string) => fetchJSON(participantId ? `/calendar?participantId=${participantId}` : "/calendar"),
};

// ===== Ratings =====
export const ratingApi = {
  getForWhisky: (whiskyId: string) => fetchJSON(`/whiskies/${whiskyId}/ratings`),
  getForTasting: (tastingId: string) => fetchJSON(`/tastings/${tastingId}/ratings`),
  getMyRating: (participantId: string, whiskyId: string) =>
    fetchJSON(`/ratings/${participantId}/${whiskyId}`).catch(() => null),
  upsert: (data: any) => fetchJSON("/ratings", { method: "POST", body: JSON.stringify(data) }),
};

// ===== Labs Explore =====
export const exploreApi = {
  getWhiskies: (search?: string, region?: string) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (region) params.set("region", region);
    const qs = params.toString();
    return fetchJSON(`/labs/explore/whiskies${qs ? `?${qs}` : ""}`);
  },
  getWhisky: (id: string, participantId?: string) => {
    const qs = participantId ? `?participantId=${participantId}` : "";
    return fetchJSON(`/labs/explore/whiskies/${id}${qs}`);
  },
};

// ===== Paper Sheet Scanning =====
export const paperScanApi = {
  scanSheet: async (tastingId: string, photos: File[], participantId?: string) => {
    const formData = new FormData();
    photos.forEach(p => formData.append("photos", p));
    if (participantId) formData.append("participantId", participantId);
    const pid = getParticipantId();
    const headers: Record<string, string> = {};
    if (pid) headers["x-participant-id"] = pid;
    const res = await fetch(`${API_BASE}/tastings/${tastingId}/scan-sheet`, {
      method: "POST",
      body: formData,
      headers,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(error.message || "Scan failed");
    }
    return res.json();
  },
  confirmScores: (tastingId: string, participantId: string, scores: any[]) =>
    fetchJSON(`/tastings/${tastingId}/confirm-scores`, {
      method: "POST",
      body: JSON.stringify({ participantId, scores }),
    }),
};

// ===== Export Notes =====
export const exportApi = {
  getParticipantNotes: (tastingId: string, participantId: string) =>
    fetchJSON(`/tastings/${tastingId}/participant-notes?participantId=${participantId}`),
};

// ===== Tasting History =====
export const tastingHistoryApi = {
  get: (participantId: string) => fetchJSON(`/participants/${participantId}/tasting-history`),
};

// ===== Host Dashboard =====
export const hostDashboardApi = {
  getSummary: (hostId: string) => fetchJSON(`/hosts/${hostId}/summary`),
};

// ===== Tasting Recap =====
export const recapApi = {
  get: (tastingId: string) => fetchJSON(`/tastings/${tastingId}/recap`),
  sendThankYou: (tastingId: string, hostId: string, message: string, language: string) =>
    fetchJSON(`/tastings/${tastingId}/thank-you`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostId, message, language }),
    }),
};

// ===== Pairing Suggestions =====
export const pairingsApi = {
  get: (tastingId: string) => fetchJSON(`/tastings/${tastingId}/pairings`),
};

// ===== Leaderboard =====
export const leaderboardApi = {
  get: () => fetchJSON("/leaderboard"),
};

// ===== Benchmark =====
export const benchmarkApi = {
  getAll: (participantId: string) => fetchJSON(`/benchmark?participantId=${participantId}`),
  analyze: async (file: File, participantId: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("participantId", participantId);
    const res = await fetch(`${API_BASE}/benchmark/analyze`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(error.message || "Analysis failed");
    }
    return res.json();
  },
  saveEntries: (entries: any[], participantId: string) =>
    fetchJSON("/benchmark", { method: "POST", body: JSON.stringify({ entries, participantId }) }),
  deleteEntry: (id: string, participantId: string) =>
    fetchJSON(`/benchmark/${id}?participantId=${participantId}`, { method: "DELETE" }),
  toWishlist: (entries: any[], participantId: string) =>
    fetchJSON("/benchmark/to-wishlist", { method: "POST", body: JSON.stringify({ entries, participantId }) }),
  toJournal: (entries: any[], participantId: string) =>
    fetchJSON("/benchmark/to-journal", { method: "POST", body: JSON.stringify({ entries, participantId }) }),
};

// ===== Journal Bottle Identification =====
export const journalBottleApi = {
  identify: async (photo: File, participantId: string) => {
    const formData = new FormData();
    formData.append("photo", photo);
    formData.append("participantId", participantId);
    const res = await fetch(`${API_BASE}/journal/identify-bottle`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(error.message || "Identification failed");
    }
    return res.json();
  },
};

// ===== Photo Tasting =====
export const photoTastingApi = {
  identify: async (photos: File[], participantId: string) => {
    const formData = new FormData();
    photos.forEach(p => formData.append("photos", p));
    formData.append("participantId", participantId);
    const res = await fetch(`${API_BASE}/photo-tasting/identify`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(error.message || "Identification failed");
    }
    return res.json();
  },
  createTasting: async (data: { participantId: string; title: string; date: string; location: string; whiskies: any[]; coverPhoto?: File }) => {
    const formData = new FormData();
    formData.append("participantId", data.participantId);
    formData.append("title", data.title);
    formData.append("date", data.date);
    formData.append("location", data.location);
    formData.append("whiskies", JSON.stringify(data.whiskies));
    if (data.coverPhoto) {
      formData.append("coverPhoto", data.coverPhoto);
    }
    const res = await fetch(`${API_BASE}/photo-tasting/create`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(error.message || "Create failed");
    }
    return res.json();
  },
};

// ===== Wishlist =====
export const wishlistApi = {
  getAll: (participantId: string) => fetchJSON(`/wishlist/${participantId}`),
  create: (participantId: string, data: any) =>
    fetchJSON(`/wishlist/${participantId}`, { method: "POST", body: JSON.stringify(data) }),
  update: (participantId: string, id: string, data: any) =>
    fetchJSON(`/wishlist/${participantId}/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (participantId: string, id: string) =>
    fetchJSON(`/wishlist/${participantId}/${id}`, { method: "DELETE" }),
};

// ===== Wishlist Photo Identification =====
export const wishlistScanApi = {
  identify: async (photo: File, participantId: string) => {
    const formData = new FormData();
    formData.append("photo", photo);
    formData.append("participantId", participantId);
    const res = await fetch(`${API_BASE}/wishlist/identify`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(error.message || "Identification failed");
    }
    return res.json();
  },
  generateSummary: (data: { participantId: string; whiskyName: string; distillery?: string; region?: string; age?: string; abv?: string; caskType?: string; notes?: string; customPrompt?: string; language?: string }) =>
    fetchJSON("/wishlist/generate-summary", { method: "POST", body: JSON.stringify(data) }),
};

// ===== Text-based Whisky Extraction =====
export const textExtractApi = {
  extract: (text: string, participantId: string) =>
    fetchJSON("/extract-whisky-text", { method: "POST", body: JSON.stringify({ text, participantId }) }),
};

// ===== Whiskybase Collection =====
export const collectionApi = {
  getAll: (participantId: string) => fetchJSON(`/collection/${participantId}`),
  add: (participantId: string, data: { name: string; distillery?: string; whiskybaseId?: string; brand?: string; statedAge?: string; abv?: string; caskType?: string; status?: string; imageUrl?: string }) =>
    fetchJSON(`/collection/${participantId}/add`, { method: "POST", body: JSON.stringify(data) }),
  check: (participantId: string) => fetchJSON(`/collection/${participantId}/check`) as Promise<{ items: Record<string, { id: string; status: string | null }> }>,
  importFile: async (participantId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/collection/${participantId}/import`, { method: "POST", body: formData });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Import failed" }));
      throw new Error(error.error || "Import failed");
    }
    return res.json();
  },
  sync: async (participantId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/collection/${participantId}/sync`, { method: "POST", body: formData, headers: pidHeaders() });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Sync failed" }));
      throw new Error(error.error || "Sync failed");
    }
    return res.json();
  },
  syncApply: (participantId: string, data: { addItems: any[]; removeItemIds: string[]; updateItems: { id: string; data: any }[]; unchangedCount?: number }) =>
    fetchJSON(`/collection/${participantId}/sync/apply`, { method: "POST", body: JSON.stringify(data) }),
  delete: (participantId: string, id: string) =>
    fetchJSON(`/collection/${participantId}/${id}`, { method: "DELETE" }),
  patch: (participantId: string, id: string, fields: { status?: string; personalRating?: number | null; notes?: string | null }) =>
    fetchJSON(`/collection/${participantId}/${id}`, { method: "PATCH", body: JSON.stringify(fields) }),
  getSyncHistory: (participantId: string) =>
    fetchJSON(`/collection/${participantId}/sync-history`),
  getSyncLogDetail: (participantId: string, logId: string) =>
    fetchJSON(`/collection/${participantId}/sync-history/${logId}`),
  toJournal: (participantId: string, id: string) =>
    fetchJSON(`/collection/${participantId}/${id}/to-journal`, { method: "POST" }),
  estimatePrice: (participantId: string, itemIds: string[]) =>
    fetchJSON(`/collection/${participantId}/price-estimate`, { method: "POST", body: JSON.stringify({ itemIds }) }),
  manualPrice: (participantId: string, itemId: string, price: number, currency: string) =>
    fetchJSON(`/collection/${participantId}/price-manual`, { method: "POST", body: JSON.stringify({ itemId, price, currency }) }),
};

// ===== Admin =====
export const adminApi = {
  getOverview: (participantId: string) => fetchJSON(`/admin/overview?participantId=${participantId}`),
  updateRole: (participantId: string, role: string, requesterId: string) =>
    fetchJSON(`/admin/participants/${participantId}/role`, { method: "PATCH", body: JSON.stringify({ role, requesterId }) }),
  deleteParticipant: (participantId: string, requesterId: string) =>
    fetchJSON(`/admin/participants/${participantId}?requesterId=${requesterId}`, { method: "DELETE" }),
  deleteTasting: (tastingId: string, requesterId: string) =>
    fetchJSON(`/admin/tastings/${tastingId}?requesterId=${requesterId}`, { method: "DELETE" }),
  getTastingDetails: (tastingId: string, requesterId: string) =>
    fetchJSON(`/admin/tasting-details/${tastingId}?requesterId=${requesterId}`),
  getAllJournals: (requesterId: string) =>
    fetchJSON(`/admin/all-journals?requesterId=${requesterId}`),
  getAnalytics: (requesterId: string) =>
    fetchJSON(`/admin/analytics?requesterId=${requesterId}`),
  updateWhiskyDbAccess: (participantId: string, canAccess: boolean, requesterId: string) =>
    fetchJSON(`/admin/participants/${participantId}/whisky-db-access`, { method: "PATCH", body: JSON.stringify({ canAccess, requesterId }) }),
  getNewsletters: (requesterId: string) =>
    fetchJSON(`/admin/newsletters?requesterId=${requesterId}`),
  generateNewsletter: (requesterId: string, type: string, customNotes?: string) =>
    fetchJSON("/admin/newsletters/generate", { method: "POST", body: JSON.stringify({ requesterId, type, customNotes }) }),
  sendNewsletter: (requesterId: string, subject: string, contentHtml: string, recipientIds: string[]) =>
    fetchJSON("/admin/newsletters/send", { method: "POST", body: JSON.stringify({ requesterId, subject, contentHtml, recipientIds }) }),
  resendNewsletter: (requesterId: string, newsletterId: string, recipientIds: string[]) =>
    fetchJSON(`/admin/newsletters/${newsletterId}/resend`, { method: "POST", body: JSON.stringify({ requesterId, recipientIds }) }),
  updateCommunityContributor: (participantId: string, status: boolean, requesterId: string) =>
    fetchJSON(`/admin/participants/${participantId}/community-contributor`, { method: "PATCH", body: JSON.stringify({ status, requesterId }) }),
  updateExperienceLevel: (participantId: string, level: string, requesterId: string) =>
    fetchJSON(`/admin/participants/${participantId}/experience-level`, { method: "PATCH", body: JSON.stringify({ level, requesterId }) }),
  batchExperienceLevel: (participantIds: string[], level: string, requesterId: string) =>
    fetchJSON(`/admin/participants/batch-experience-level`, { method: "PATCH", body: JSON.stringify({ participantIds, level, requesterId }) }),
  getParticipantAiProfiles: (requesterId: string, pin: string) =>
    fetchJSON("/admin/participant-ai-profiles", { method: "POST", body: JSON.stringify({ requesterId, pin }) }),
  updateMakingOfAccess: (participantId: string, access: boolean, requesterId: string) =>
    fetchJSON(`/admin/participants/${participantId}/making-of-access`, { method: "PATCH", body: JSON.stringify({ access, requesterId }) }),
  getActivitySessions: (requesterId: string, filters?: { userId?: string; from?: string; to?: string; minDuration?: number }) => {
    const params = new URLSearchParams({ participantId: requesterId });
    if (filters?.userId) params.set("userId", filters.userId);
    if (filters?.from) params.set("from", filters.from);
    if (filters?.to) params.set("to", filters.to);
    if (filters?.minDuration) params.set("minDuration", String(filters.minDuration));
    return fetchJSON(`/admin/activity-sessions?${params}`);
  },
  getActivitySessionsForUser: (requesterId: string, userId: string, filters?: { from?: string; to?: string }) => {
    const params = new URLSearchParams({ requesterId });
    if (filters?.from) params.set("from", filters.from);
    if (filters?.to) params.set("to", filters.to);
    return fetchJSON(`/admin/activity-sessions/${userId}?${params}`);
  },
  getActivitySummary: (requesterId: string, filters?: { from?: string; to?: string }) => {
    const params = new URLSearchParams({ participantId: requesterId });
    if (filters?.from) params.set("from", filters.from);
    if (filters?.to) params.set("to", filters.to);
    return fetchJSON(`/admin/activity-summary?${params}`);
  },
};

export const tastingPhotoApi = {
  getAll: (tastingId: string) => fetchJSON(`/tastings/${tastingId}/photos`),
  upload: async (tastingId: string, file: File, participantId: string, participantName: string, whiskyId?: string, caption?: string) => {
    const formData = new FormData();
    formData.append("photo", file);
    formData.append("participantId", participantId);
    formData.append("participantName", participantName);
    if (whiskyId) formData.append("whiskyId", whiskyId);
    if (caption) formData.append("caption", caption);
    const res = await fetch(`${API_BASE}/tastings/${tastingId}/photos`, { method: "POST", body: formData });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(error.message || "Upload failed");
    }
    return res.json();
  },
  update: (photoId: string, participantId: string, data: { printable?: boolean; caption?: string }) =>
    fetchJSON(`/tasting-photos/${photoId}`, { method: "PATCH", body: JSON.stringify({ participantId, ...data }) }),
  delete: (photoId: string, participantId: string) =>
    fetchJSON(`/tasting-photos/${photoId}`, { method: "DELETE", body: JSON.stringify({ participantId }) }),
};

export const feedbackApi = {
  submit: (data: { participantId?: string; participantName?: string; category: string; message: string }) =>
    fetchJSON("/feedback", { method: "POST", body: JSON.stringify(data) }),
  getAll: (participantId: string) =>
    fetchJSON(`/feedback?participantId=${participantId}`),
};

export const notificationApi = {
  getAll: (participantId: string) =>
    fetchJSON(`/notifications?participantId=${participantId}`),
  getUnreadCount: (participantId: string) =>
    fetchJSON(`/notifications/unread-count?participantId=${participantId}`),
  markRead: (notificationId: string, participantId: string) =>
    fetchJSON(`/notifications/${notificationId}/read`, { method: "PATCH", body: JSON.stringify({ participantId }) }),
  markAllRead: (participantId: string) =>
    fetchJSON(`/notifications/read-all`, { method: "PATCH", body: JSON.stringify({ participantId }) }),
  createGlobal: (data: { participantId: string; title: string; message: string; type?: string; linkUrl?: string }) =>
    fetchJSON("/notifications", { method: "POST", body: JSON.stringify(data) }),
};
