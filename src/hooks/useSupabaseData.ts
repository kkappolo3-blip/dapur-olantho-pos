import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { saveToCache, loadFromCache } from "@/lib/localCache";
import { addToQueue } from "@/lib/offlineQueue";

interface Options {
  orderBy?: { column: string; ascending?: boolean };
  realtime?: boolean;
}

export function useSupabaseData<T extends { id: string }>(
  table: string,
  opts: Options = { realtime: true },
) {
  const [data, setData] = useState<T[]>(() => loadFromCache<T[]>(table) || []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const chanId = useRef(Math.random().toString(36).slice(2));

  const refresh = useCallback(async () => {
    try {
      let q = supabase.from(table).select("*");
      if (opts.orderBy) {
        q = q.order(opts.orderBy.column, {
          ascending: opts.orderBy.ascending !== false,
        });
      }
      const { data: rows, error } = await q;
      if (error) throw error;
      if (mounted.current) {
        const arr = (rows || []) as T[];
        setData(arr);
        saveToCache(table, arr);
        setError(null);
      }
    } catch (e: any) {
      if (mounted.current) setError(e?.message || String(e));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [table, opts.orderBy?.column, opts.orderBy?.ascending]);

  useEffect(() => {
    mounted.current = true;
    refresh();
    if (!opts.realtime) return () => { mounted.current = false; };
    const channel = supabase
      .channel(`rt-${table}-${chanId.current}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => refresh(),
      )
      .subscribe();
    return () => {
      mounted.current = false;
      supabase.removeChannel(channel);
    };
  }, [table, refresh, opts.realtime]);

  const insert = useCallback(
    async (row: Partial<T>) => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        addToQueue(table, "insert", row);
        setData((d) => [...d, row as T]);
        return { error: null };
      }
      const { error } = await supabase.from(table).insert(row as any);
      if (error) return { error };
      await refresh();
      return { error: null };
    },
    [table, refresh],
  );

  const upsert = useCallback(
    async (row: Partial<T>) => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        addToQueue(table, "upsert", row);
        setData((d) => {
          const idx = d.findIndex((x) => x.id === (row as any).id);
          if (idx >= 0) {
            const next = d.slice();
            next[idx] = { ...d[idx], ...(row as any) };
            return next;
          }
          return [...d, row as T];
        });
        return { error: null };
      }
      const { error } = await supabase.from(table).upsert(row as any);
      if (error) return { error };
      await refresh();
      return { error: null };
    },
    [table, refresh],
  );

  const update = useCallback(
    async (id: string, patch: Partial<T>) => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        addToQueue(table, "update", patch, id);
        setData((d) =>
          d.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        );
        return { error: null };
      }
      const { error } = await supabase
        .from(table)
        .update(patch as any)
        .eq("id", id);
      if (error) return { error };
      await refresh();
      return { error: null };
    },
    [table, refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        addToQueue(table, "delete", null, id);
        setData((d) => d.filter((x) => x.id !== id));
        return { error: null };
      }
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) return { error };
      await refresh();
      return { error: null };
    },
    [table, refresh],
  );

  return { data, loading, error, refresh, insert, upsert, update, remove };
}
