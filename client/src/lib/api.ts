import { queryClient } from "./queryClient";

const API_BASE = "/api";

async function fetchJSON(url: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || "Request failed");
  }
  if (res.status === 204) return null;
  return res.json();
}

// ===== Participants =====
export const participantApi = {
  loginOrCreate: (name: string, pin?: string, email?: string) =>
    fetchJSON("/participants", { method: "POST", body: JSON.stringify({ name, pin, email }) }),
  get: (id: string) => fetchJSON(`/participants/${id}`),
  setLanguage: (id: string, language: string) =>
    fetchJSON(`/participants/${id}/language`, { method: "PATCH", body: JSON.stringify({ language }) }),
  verify: (id: string, code: string) =>
    fetchJSON(`/participants/${id}/verify`, { method: "POST", body: JSON.stringify({ code }) }),
  resendVerification: (id: string) =>
    fetchJSON(`/participants/${id}/resend-verification`, { method: "POST", body: JSON.stringify({}) }),
};

// ===== Tastings =====
export const tastingApi = {
  getAll: () => fetchJSON("/tastings"),
  get: (id: string) => fetchJSON(`/tastings/${id}`),
  getByCode: (code: string) => fetchJSON(`/tastings/code/${code}`),
  create: (data: any) => fetchJSON("/tastings", { method: "POST", body: JSON.stringify(data) }),
  updateStatus: (id: string, status: string, currentAct?: string, hostId?: string) =>
    fetchJSON(`/tastings/${id}/status`, { method: "PATCH", body: JSON.stringify({ status, currentAct, hostId }) }),
  updateReflection: (id: string, reflection: string) =>
    fetchJSON(`/tastings/${id}/reflection`, { method: "PATCH", body: JSON.stringify({ reflection }) }),
  hardDelete: (id: string, participantId: string) =>
    fetchJSON(`/tastings/${id}`, { method: "DELETE", body: JSON.stringify({ participantId }) }),
  updateDetails: (id: string, hostId: string, data: any) =>
    fetchJSON(`/tastings/${id}/details`, { method: "PATCH", body: JSON.stringify({ hostId, ...data }) }),
  duplicate: (id: string, hostId: string) =>
    fetchJSON(`/tastings/${id}/duplicate`, { method: "POST", body: JSON.stringify({ hostId }) }),
  getParticipants: (id: string) => fetchJSON(`/tastings/${id}/participants`),
  join: (id: string, participantId: string) =>
    fetchJSON(`/tastings/${id}/join`, { method: "POST", body: JSON.stringify({ participantId }) }),
  getAnalytics: (id: string) => fetchJSON(`/tastings/${id}/analytics`),
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

// ===== Flavor Profile =====
export const flavorProfileApi = {
  get: (participantId: string) => fetchJSON(`/participants/${participantId}/flavor-profile`),
  getGlobal: () => fetchJSON(`/flavor-profile/global`),
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
  getAll: () => fetchJSON("/calendar"),
};

// ===== Ratings =====
export const ratingApi = {
  getForWhisky: (whiskyId: string) => fetchJSON(`/whiskies/${whiskyId}/ratings`),
  getForTasting: (tastingId: string) => fetchJSON(`/tastings/${tastingId}/ratings`),
  getMyRating: (participantId: string, whiskyId: string) =>
    fetchJSON(`/ratings/${participantId}/${whiskyId}`).catch(() => null),
  upsert: (data: any) => fetchJSON("/ratings", { method: "POST", body: JSON.stringify(data) }),
};

// ===== Export Notes =====
export const exportApi = {
  getParticipantNotes: (tastingId: string, participantId: string) =>
    fetchJSON(`/tastings/${tastingId}/participant-notes?participantId=${participantId}`),
};

// ===== Host Dashboard =====
export const hostDashboardApi = {
  getSummary: (hostId: string) => fetchJSON(`/hosts/${hostId}/summary`),
};

// ===== Tasting Recap =====
export const recapApi = {
  get: (tastingId: string) => fetchJSON(`/tastings/${tastingId}/recap`),
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
};
