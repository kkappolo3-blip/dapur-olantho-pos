import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useSettings } from "@/hooks/useSingletons";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/Toast";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Download, Upload, Trash2 } from "lucide-react";

export const Route = createFileRoute("/pengaturan")({ component: Pengaturan });

const TABLES = ["settings","profit_totals","orders","inventory","sales","closings","backorders","operational_costs","suppliers","holds"];

function Pengaturan() {
  const { data: s, update } = useSettings();
  const [nama,setNama]=useState(s.nama); const [pemilik,setPemilik]=useState(s.pemilik||"");
  const [alamat,setAlamat]=useState(s.alamat||""); const [hp,setHp]=useState(s.hp||""); const [lokasi,setLokasi]=useState(s.lokasi||"");
  const [delAsk,setDelAsk]=useState(false);

  const save = async () => {
    await update({ nama, pemilik, alamat, hp, lokasi });
    toast.success("Pengaturan disimpan");
  };

  const exportData = async () => {
    const dump: any = { exportedAt: new Date().toISOString() };
    for (const t of TABLES) {
      const { data } = await supabase.from(t).select("*");
      dump[t] = data || [];
    }
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `dapur-olantho-${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Backup diunduh");
  };

  const importData = async (file: File) => {
    try {
      const text = await file.text();
      const dump = JSON.parse(text);
      for (const t of TABLES) {
        if (Array.isArray(dump[t]) && dump[t].length>0) {
          await supabase.from(t).upsert(dump[t]);
        }
      }
      toast.success("Import selesai");
    } catch (e:any) { toast.error("Gagal import: "+e.message); }
  };

  const wipeAll = async () => {
    for (const t of ["orders","inventory","sales","closings","backorders","operational_costs","suppliers","holds"]) {
      await supabase.from(t).delete().neq("id","");
    }
    await supabase.from("profit_totals").upsert({ id: "main", total_profit:0, total_zakat:0, total_gaji:0, total_modal:0, modal_talangan:0, last_closing_date:null });
    toast.success("Semua data dihapus");
    setDelAsk(false);
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="card p-5">
        <h3 className="font-bold mb-3">Info Toko</h3>
        <div className="space-y-3">
          <div><label className="label">Nama Toko</label><input className="input" value={nama} onChange={(e)=>setNama(e.target.value)}/></div>
          <div><label className="label">Pemilik</label><input className="input" value={pemilik} onChange={(e)=>setPemilik(e.target.value)}/></div>
          <div><label className="label">Alamat</label><input className="input" value={alamat} onChange={(e)=>setAlamat(e.target.value)}/></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="label">HP/WA</label><input className="input" value={hp} onChange={(e)=>setHp(e.target.value)}/></div>
            <div><label className="label">Lokasi</label><input className="input" value={lokasi} onChange={(e)=>setLokasi(e.target.value)}/></div>
          </div>
        </div>
        <button className="btn btn-primary mt-3" onClick={save}>Simpan</button>
      </div>

      <div className="card p-5">
        <h3 className="font-bold mb-3">Backup & Restore</h3>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-ghost" onClick={exportData}><Download size={14}/> Export JSON</button>
          <label className="btn btn-ghost cursor-pointer">
            <Upload size={14}/> Import JSON
            <input type="file" accept=".json" className="hidden" onChange={(e)=>{const f=e.target.files?.[0]; if(f) importData(f);}}/>
          </label>
        </div>
      </div>

      <div className="card p-5 border-red-200">
        <h3 className="font-bold text-red-700 mb-2">Hapus Semua Data</h3>
        <p className="text-sm text-slate-600 mb-3">Reset seluruh data toko. Modal diset ke 0. Wajib kode: <code>88040773</code>.</p>
        <button className="btn btn-danger" onClick={()=>setDelAsk(true)}><Trash2 size={14}/> Hapus Semua</button>
      </div>

      <ConfirmModal open={delAsk} danger title="Hapus SEMUA Data?" message="Tindakan ini tidak dapat dibatalkan." requireCode="88040773" onConfirm={wipeAll} onCancel={()=>setDelAsk(false)}/>
    </div>
  );
}
