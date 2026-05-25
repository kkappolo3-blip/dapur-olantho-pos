import { supabase } from "./supabase";

export type QueueOp = "insert" | "update" | "upsert" | "delete";
export interface QueueItem {
  id: string;
  table: string;
  operation: QueueOp;
  data: any;
  matchId?: string;
  timestamp: number;
}

const KEY = "dapur_sync_queue";

function read(): QueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function write(items: QueueItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function addToQueue(
  table: string,
  operation: QueueOp,
  data: any,
  matchId?: string,
) {
  const items = read();
  items.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    table,
    operation,
    data,
    matchId,
    timestamp: Date.now(),
  });
  write(items);
}

export function getQueueCount(): number {
  return read().length;
}

export async function processQueue(): Promise<number> {
  const items = read();
  if (items.length === 0) return 0;
  const remaining: QueueItem[] = [];
  let synced = 0;
  for (const item of items) {
    try {
      if (item.operation === "insert") {
        await supabase.from(item.table).insert(item.data);
      } else if (item.operation === "upsert") {
        await supabase.from(item.table).upsert(item.data);
      } else if (item.operation === "update") {
        await supabase
          .from(item.table)
          .update(item.data)
          .eq("id", item.matchId);
      } else if (item.operation === "delete") {
        await supabase.from(item.table).delete().eq("id", item.matchId);
      }
      synced++;
    } catch {
      remaining.push(item);
    }
  }
  write(remaining);
  return synced;
}
