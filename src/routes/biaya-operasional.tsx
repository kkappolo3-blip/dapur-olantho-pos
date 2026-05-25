import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { useProfitTotals } from "@/hooks/useSingletons";
import type { OperationalCost } from "@/types/db";
import { rp, formatTanggalShort, today, generateId, sanitize, toNumber } from "@/lib/utils-app";
import { StatsCard } from "@/components/ui/StatsCard";
import { toast } from "@/components/ui/Toast";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/biaya-operasional")({ component: BiayaOperasional });

function BiayaOperasional() {
  const { data: opcosts, insert, remove } = useSupabaseData<OperationalCost>("operational_costs");
  const { data: profit, update: updateProfit } = useProfitTotals();

  const [nama, setNama] = useState("");
  const [nominal, setNominal] = useState(0);
  const [tgl, setTgl] = useState(today());
  const [catatan, setCatatan] = useState("");

  const sortedByDate = opcosts.slice().sort((a,b)=>b.tanggal.localeCompare(a.tanggal));
  const totalAll = opcosts.reduce((a,o)=>a+o.nominal,0);
  const totalPeriode = opcosts.reduce((a,o)=>a+o.nominal,0); // simplified

  const preview = (() => {
    if (profit.total_modal <= 0) return "Akan langsung jadi utang Modal Talangan";
    return "Akan dipotong dari LABA saat closing";
  })();

  const add = async () => {
    if (!nama.trim() || nominal <= 0) { toast.error("Nama & nominal wajib"); return; }
    let sumber: OperationalCost["sumber_modal"] = "Laba Closing";
    let putar = 0, tal = 0;
    if (profit.total_modal <= 0) {
      sumber = "Modal Talangan";
      tal = nominal;
      await updateProfit({ modal_talangan: profit.modal_talangan - nominal });
    }
    await insert({
      id: generateId(),
      tanggal: tgl, nama: sanitize(nama), nominal: toNumber(nominal),
      catatan: sanitize(catatan), sumber_modal: sumber, modal_putar_used: putar, modal_talangan_used: tal,
    } as OperationalCost);
    setNama(""); setNominal(0); setCatatan("");
    toast.success("Biaya tercatat");
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatsCard label="Periode Berjalan" value={rp(totalPeriode)} tone="warning" />
        <StatsCard label="Total Semua" value={rp(totalAll)} />
        <StatsCard label="Modal Putar" value={rp(profit.total_modal)} tone="success" />
        <StatsCard label="Modal Talangan" value={rp(profit.modal_talangan)} tone={profit.modal_talangan<0?"danger":"indigo"} />
      </div>

      <div className="card p-5">
        <h3 className="font-bold mb-3">Tambah Biaya Operasional</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className="label">Tanggal</label><input type="date" className="input" value={tgl} onChange={(e)=>setTgl(e.target.value)} /></div>
          <div><label className="label">Nominal</label><input type="number" className="input" value={nominal} onChange={(e)=>setNominal(toNumber(e.target.value))} /></div>
          <div className="sm:col-span-2"><label className="label">Nama Biaya</label><input className="input" value={nama} onChange={(e)=>setNama(e.target.value)} placeholder="e.g. Listrik, kemasan, transport"/></div>
          <div className="sm:col-span-2"><label className="label">Catatan</label><input className="input" value={catatan} onChange={(e)=>setCatatan(e.target.value)} /></div>
        </div>
        <p className="text-xs text-slate-500 mt-2">💡 {preview}</p>
        <button className="btn btn-primary mt-3" onClick={add}>Tambah</button>
      </div>

      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Tanggal</th><th>Nama</th><th>Nominal</th><th>Sumber</th><th>Catatan</th><th></th></tr></thead>
          <tbody>
            {sortedByDate.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-slate-400 py-6">Belum ada biaya</td></tr>
            ) : sortedByDate.map((o)=>(
              <tr key={o.id}>
                <td data-label="Tanggal">{formatTanggalShort(o.tanggal)}</td>
                <td data-label="Nama" className="font-semibold">{o.nama}</td>
                <td data-label="Nominal">{rp(o.nominal)}</td>
                <td data-label="Sumber"><span className="badge">{o.sumber_modal}</span></td>
                <td data-label="Catatan" className="text-xs text-slate-500">{o.catatan||"-"}</td>
                <td data-label="Aksi"><button className="text-red-500" onClick={()=>remove(o.id)}><Trash2 size={14}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
