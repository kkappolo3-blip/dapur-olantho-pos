import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import type { Sale } from "@/types/db";
import { rp, formatTanggalShort, today, toNumber, sanitize } from "@/lib/utils-app";
import { StatsCard } from "@/components/ui/StatsCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "@/components/ui/Toast";

export const Route = createFileRoute("/pelanggan-cicilan")({ component: PelangganCicilan });

function PelangganCicilan() {
  const { data: sales, update } = useSupabaseData<Sale>("sales");
  const [pay, setPay] = useState<Sale | null>(null);
  const [nominal, setNominal] = useState(0);
  const [ket, setKet] = useState("");

  const cicilan = sales.filter(s => s.cara_bayar === "cicilan");
  const aktif = cicilan.filter(s => (s.cicil_bayar||0) < s.total_jual);
  const piutang = aktif.reduce((a,s)=>a+(s.total_jual-(s.cicil_bayar||0)),0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatsCard label="Cicilan Aktif" value={aktif.length} tone="warning"/>
        <StatsCard label="Total Piutang" value={rp(piutang)} tone="danger"/>
        <StatsCard label="Total Cicilan" value={cicilan.length}/>
      </div>
      <div className="card overflow-x-auto">
        {cicilan.length === 0 ? (
          <EmptyState title="Belum ada cicilan"/>
        ) : (
          <table className="data-table">
            <thead><tr><th>Pembeli</th><th>Total</th><th>Dibayar</th><th>Progress</th><th></th></tr></thead>
            <tbody>
              {cicilan.map((s)=>{
                const pct = Math.min(100, Math.round(((s.cicil_bayar||0)/s.total_jual)*100));
                const lunas = (s.cicil_bayar||0) >= s.total_jual;
                return (
                  <tr key={s.id}>
                    <td data-label="Pembeli">
                      <div className="font-semibold">{s.pembeli}</div>
                      <div className="text-xs text-slate-500">{formatTanggalShort(s.tanggal)}</div>
                    </td>
                    <td data-label="Total">{rp(s.total_jual)}</td>
                    <td data-label="Dibayar">{rp(s.cicil_bayar||0)}</td>
                    <td data-label="Progress">
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div className={`h-2 rounded-full ${lunas?"bg-emerald-500":"bg-amber-400"}`} style={{width:`${pct}%`}}/>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{pct}%</div>
                    </td>
                    <td data-label="Aksi">
                      {!lunas && <button className="btn btn-primary !py-1 !px-2" onClick={()=>{ setPay(s); setNominal(0); setKet(""); }}>Bayar</button>}
                      {lunas && <span className="badge badge-success">Lunas</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {pay && (
        <div className="fixed inset-0 z-[150] bg-slate-900/50 flex items-center justify-center p-4">
          <div className="card max-w-md w-full p-5">
            <h3 className="text-lg font-bold mb-3">Bayar Cicilan — {pay.pembeli}</h3>
            <p className="text-sm mb-2">Sisa: <b>{rp(pay.total_jual - (pay.cicil_bayar||0))}</b></p>
            <label className="label">Nominal</label>
            <input type="number" className="input mb-2" value={nominal} onChange={(e)=>setNominal(toNumber(e.target.value))} />
            <label className="label">Keterangan</label>
            <input className="input mb-3" value={ket} onChange={(e)=>setKet(e.target.value)} placeholder="opsional" />
            <div className="flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={()=>setPay(null)}>Batal</button>
              <button className="btn btn-primary" disabled={nominal<=0} onClick={async()=>{
                const newBayar = Math.min(pay.total_jual, (pay.cicil_bayar||0)+nominal);
                const newRiwayat = [...(pay.cicil_riwayat||[]), { tgl: today(), nominal, ket: sanitize(ket) }];
                await update(pay.id, { cicil_bayar: newBayar, cicil_riwayat: newRiwayat } as any);
                toast.success("Cicilan dicatat"); setPay(null);
              }}>Catat</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
