import type { Response } from "express";

export type SSEEventType =
  | "reveal_triggered"
  | "status_changed"
  | "presentation_changed"
  | "dram_advanced"
  | "heartbeat";

export interface SSEEvent {
  type: SSEEventType;
  data?: Record<string, unknown>;
}

const connections = new Map<string, Set<Response>>();

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

function ensureHeartbeat() {
  if (heartbeatTimer) return;
  heartbeatTimer = setInterval(() => {
    for (const [tastingId, clients] of connections) {
      for (const res of clients) {
        try {
          res.write(`event: heartbeat\ndata: {}\n\n`);
        } catch {
          clients.delete(res);
        }
      }
      if (clients.size === 0) connections.delete(tastingId);
    }
    if (connections.size === 0 && heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }, 30_000);
}

export function addConnection(tastingId: string, res: Response): void {
  if (!connections.has(tastingId)) {
    connections.set(tastingId, new Set());
  }
  connections.get(tastingId)!.add(res);
  ensureHeartbeat();

  res.on("close", () => removeConnection(tastingId, res));
}

export function removeConnection(tastingId: string, res: Response): void {
  const clients = connections.get(tastingId);
  if (clients) {
    clients.delete(res);
    if (clients.size === 0) connections.delete(tastingId);
  }
}

export function broadcastToTasting(tastingId: string, event: SSEEvent): void {
  const clients = connections.get(tastingId);
  if (!clients || clients.size === 0) return;

  const payload = `event: ${event.type}\ndata: ${JSON.stringify(event.data || {})}\n\n`;

  for (const res of clients) {
    try {
      res.write(payload);
    } catch {
      clients.delete(res);
    }
  }
}

export function getConnectionCount(tastingId?: string): number {
  if (tastingId) {
    return connections.get(tastingId)?.size || 0;
  }
  let total = 0;
  for (const clients of connections.values()) {
    total += clients.size;
  }
  return total;
}
