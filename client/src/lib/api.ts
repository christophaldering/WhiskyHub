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
  loginOrCreate: (name: string, pin?: string) =>
    fetchJSON("/participants", { method: "POST", body: JSON.stringify({ name, pin }) }),
  get: (id: string) => fetchJSON(`/participants/${id}`),
  setLanguage: (id: string, language: string) =>
    fetchJSON(`/participants/${id}/language`, { method: "PATCH", body: JSON.stringify({ language }) }),
};

// ===== Tastings =====
export const tastingApi = {
  getAll: () => fetchJSON("/tastings"),
  get: (id: string) => fetchJSON(`/tastings/${id}`),
  getByCode: (code: string) => fetchJSON(`/tastings/code/${code}`),
  create: (data: any) => fetchJSON("/tastings", { method: "POST", body: JSON.stringify(data) }),
  updateStatus: (id: string, status: string, currentAct?: string) =>
    fetchJSON(`/tastings/${id}/status`, { method: "PATCH", body: JSON.stringify({ status, currentAct }) }),
  updateReflection: (id: string, reflection: string) =>
    fetchJSON(`/tastings/${id}/reflection`, { method: "PATCH", body: JSON.stringify({ reflection }) }),
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
  parse: async (tastingId: string, spreadsheet: File, imagesZip?: File) => {
    const formData = new FormData();
    formData.append("spreadsheet", spreadsheet);
    if (imagesZip) formData.append("images", imagesZip);
    const res = await fetch(`${API_BASE}/tastings/${tastingId}/import/parse`, { method: "POST", body: formData });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(error.message || "Parse failed");
    }
    return res.json();
  },
  confirm: async (tastingId: string, spreadsheet: File, imagesZip?: File) => {
    const formData = new FormData();
    formData.append("spreadsheet", spreadsheet);
    if (imagesZip) formData.append("images", imagesZip);
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

// ===== Ratings =====
export const ratingApi = {
  getForWhisky: (whiskyId: string) => fetchJSON(`/whiskies/${whiskyId}/ratings`),
  getForTasting: (tastingId: string) => fetchJSON(`/tastings/${tastingId}/ratings`),
  getMyRating: (participantId: string, whiskyId: string) =>
    fetchJSON(`/ratings/${participantId}/${whiskyId}`).catch(() => null),
  upsert: (data: any) => fetchJSON("/ratings", { method: "POST", body: JSON.stringify(data) }),
};
