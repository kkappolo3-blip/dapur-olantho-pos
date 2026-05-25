import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { ProfitTotals, Settings } from "@/types/db";
import { saveToCache, loadFromCache } from "@/lib/localCache";

const DEFAULT_PROFIT: ProfitTotals = {
  id: "main",
  total_profit: 0,
  total_zakat: 0,
  total_gaji: 0,
  total_modal: 0,
  modal_talangan: 0,
  last_closing_date: null,
};

const DEFAULT_SETTINGS: Settings = {
  id: "main",
  nama: "Dapur Olantho",
  pemilik: "",
  alamat: "",
  hp: "",
  lokasi: "",
};

export function useProfitTotals() {
  const [data, setData] = useState<ProfitTotals>(
    () => loadFromCache<ProfitTotals>("profit_totals_single") || DEFAULT_PROFIT,
  );
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data: row } = await supabase
      .from("profit_totals")
      .select("*")
      .eq("id", "main")
      .maybeSingle();
    if (row) {
      setData(row as ProfitTotals);
      saveToCache("profit_totals_single", row);
    } else {
      await supabase.from("profit_totals").upsert(DEFAULT_PROFIT);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const ch = supabase
      .channel("rt-profit-totals")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profit_totals" },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [refresh]);

  const update = useCallback(async (patch: Partial<ProfitTotals>) => {
    const next = { ...data, ...patch, id: "main" };
    setData(next);
    saveToCache("profit_totals_single", next);
    await supabase.from("profit_totals").upsert(next);
  }, [data]);

  return { data, loading, refresh, update };
}

export function useSettings() {
  const [data, setData] = useState<Settings>(
    () => loadFromCache<Settings>("settings_single") || DEFAULT_SETTINGS,
  );

  const refresh = useCallback(async () => {
    const { data: row } = await supabase
      .from("settings")
      .select("*")
      .eq("id", "main")
      .maybeSingle();
    if (row) {
      setData(row as Settings);
      saveToCache("settings_single", row);
    } else {
      await supabase.from("settings").upsert(DEFAULT_SETTINGS);
    }
  }, []);

  useEffect(() => {
    refresh();
    const ch = supabase
      .channel("rt-settings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "settings" },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [refresh]);

  const update = useCallback(async (patch: Partial<Settings>) => {
    const next = { ...data, ...patch, id: "main" };
    setData(next);
    saveToCache("settings_single", next);
    await supabase.from("settings").upsert(next);
  }, [data]);

  return { data, refresh, update };
}
