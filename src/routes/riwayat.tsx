import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import type { Order, Sale, Closing } from "@/types/db";
import { rp, formatTanggalShort } from "@/lib/utils-app";
import { EmptyState } from "@/components/ui/EmptyState";
import { ExternalLink } from "lucide-react";

export const Route = createFileRoute("/riwayat")({ component: Riwayat });

function Riwayat() {
  const { data: orders } = useSupabaseData<Order>("orders");
  const { data: sales } = useSupabaseData<Sale>("sales");
  const { data: closings } = useSupabaseData<Closing>("closings");
  const [tab, setTab] = useState<"semua"|"pesanan"|"penjualan"|"closing">("semua");

  const items = useMemo(() => {
    const arr: { tipe: string; tanggal: string; node: React.ReactNode }[] = [];
    if (tab==="semua"||tab==="pesanan") orders.filter(o=>o.status!=="Rencana").forEach(o=>arr.push({
      tipe: "Pesanan", tanggal: o.tanggal_bayar||o.tanggal,
      node: (
        <div>
          <div className="flex justify-between flex-wrap gap-2">
            <span className="font-semibold">{o.platform} · {o.toko||"-"} {o.link && <a href={o.link} target="_blank" className="text-indigo-600 inline-block"><ExternalLink size={11} className="inline"/></a>}</span>
            <span className="badge badge-info">{o.status}</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">{o.items.map(i=>`${i.qty}x ${i.nama}`).join(", ")}</div>
          <div className="font-bold text-sm mt-1">{rp(o.total_biaya)}</div>
        </div>
      ),
    }));
    if (tab==="semua"||tab==="penjualan") sales.forEach(s=>arr.push({
      tipe: "Penjualan", tanggal: s.tanggal,
      node: (
        <div>
          <div className="flex justify-between flex-wrap gap-2">
            <span className="font-semibold">{s.pembeli} · {s.channel}</span>
            <span className={`badge ${s.cara_bayar==="lunas"?"badge-success":"badge-amber"}`}>{s.cara_bayar}</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">{s.items.map(i=>`${i.qty}x ${i.nama}`).join(", ")}</div>
          <div className="font-bold text-sm mt-1">{rp(s.total_jual)}</div>
        </div>
      ),
    }));
    if (tab==="semua"||tab==="closing") closings.forEach(c=>arr.push({
      tipe: "Closing", tanggal: c.tanggal,
      node: (
        <div>
          <div className="flex justify-between"><span className="font-semibold">Closing #{c.id.slice(-4)}</span><span className="badge badge-indigo">{c.jumlah_trx} trx</span></div>
          <div className="text-xs text-slate-500">Laba {rp(c.laba)} · Zakat {rp(c.zakat)} · Gaji {rp(c.gaji)}</div>
        </div>
      ),
    }));
    return arr.sort((a,b)=>(b.tanggal||"").localeCompare(a.tanggal||""));
  }, [orders, sales, closings, tab]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(["semua","pesanan","penjualan","closing"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${tab===t?"bg-indigo-600 text-white":"bg-white border text-slate-600"}`}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>
      {items.length === 0 ? (
        <div className="card"><EmptyState title="Belum ada riwayat"/></div>
      ) : (
        <div className="space-y-2">
          {items.map((it, i)=>(
            <div key={i} className="card p-3 flex gap-3 items-start">
              <div className="text-xs font-bold text-slate-500 w-20 flex-shrink-0">
                <div className="badge badge-muted">{it.tipe}</div>
                <div className="mt-1">{formatTanggalShort(it.tanggal)}</div>
              </div>
              <div className="flex-1">{it.node}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
