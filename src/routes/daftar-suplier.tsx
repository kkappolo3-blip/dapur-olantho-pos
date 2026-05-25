import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import type { Supplier } from "@/types/db";
import { generateId, sanitize, toNumber } from "@/lib/utils-app";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "@/components/ui/Toast";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Star, ExternalLink, Plus, Trash2, Edit3 } from "lucide-react";

export const Route = createFileRoute("/daftar-suplier")({ component: DaftarSuplier });

function DaftarSuplier() {
  const { data: suppliers, insert, update, remove } = useSupabaseData<Supplier>("suppliers");
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [open, setOpen] = useState(false);
  const [delAsk, setDelAsk] = useState<Supplier | null>(null);

  const sorted = suppliers.slice().sort((a,b)=>(b.rating||0)-(a.rating||0));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="btn btn-primary" onClick={()=>{ setEditing(null); setOpen(true); }}><Plus size={14}/> Suplier Baru</button>
      </div>
      {sorted.length === 0 ? (
        <div className="card"><EmptyState title="Belum ada suplier" desc="Suplier juga otomatis ditambah saat pesanan baru."/></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sorted.map(s=>(
            <div key={s.id} className="card p-4">
              <div className="flex justify-between items-start mb-1">
                <div>
                  <div className="font-bold">{s.nama}</div>
                  <span className={`badge ${s.platform==="Shopee"?"badge-amber":s.platform==="TikTok"?"badge-indigo":"badge-muted"}`}>{s.platform}</span>
                </div>
                {s.auto_added && <span className="badge badge-info text-[10px]">auto</span>}
              </div>
              {s.link && (
                <a href={s.link} target="_blank" className="text-xs text-indigo-600 flex items-center gap-1 mb-2"><ExternalLink size={11}/> Buka toko</a>
              )}
              <div className="flex gap-0.5 mb-2">
                {[1,2,3,4,5].map(n=>(
                  <button key={n} onClick={()=>update(s.id,{rating:n})}>
                    <Star size={16} className={n<=(s.rating||0)?"fill-amber-400 text-amber-400":"text-slate-300"}/>
                  </button>
                ))}
              </div>
              {s.bagus && <p className="text-xs text-emerald-700">👍 {s.bagus}</p>}
              {s.jelek && <p className="text-xs text-red-700">👎 {s.jelek}</p>}
              <div className="flex gap-1 mt-3">
                <button className="btn btn-ghost !py-1 !px-2 text-xs" onClick={()=>{setEditing(s); setOpen(true);}}><Edit3 size={12}/></button>
                <button className="text-red-500" onClick={()=>setDelAsk(s)}><Trash2 size={14}/></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <SupplierForm
          initial={editing}
          onCancel={()=>{setOpen(false); setEditing(null);}}
          onSave={async(s)=>{
            if(editing) { await update(editing.id, s); } else { await insert(s); }
            toast.success("Disimpan"); setOpen(false); setEditing(null);
          }}
        />
      )}
      <ConfirmModal open={!!delAsk} danger title="Hapus Suplier?" requireCode="88040773"
        onConfirm={async()=>{ if(delAsk){ await remove(delAsk.id); toast.success("Dihapus"); } setDelAsk(null); }}
        onCancel={()=>setDelAsk(null)} />
    </div>
  );
}

function SupplierForm({ initial, onSave, onCancel }: { initial: Supplier | null; onSave: (s: Supplier)=>void; onCancel: ()=>void }) {
  const [nama, setNama] = useState(initial?.nama||"");
  const [platform, setPlatform] = useState<Supplier["platform"]>(initial?.platform||"Shopee");
  const [link, setLink] = useState(initial?.link||"");
  const [rating, setRating] = useState(initial?.rating||0);
  const [bagus, setBagus] = useState(initial?.bagus||"");
  const [jelek, setJelek] = useState(initial?.jelek||"");

  return (
    <div className="fixed inset-0 z-[150] bg-slate-900/50 flex items-center justify-center p-4">
      <div className="card max-w-lg w-full p-5">
        <h3 className="text-lg font-bold mb-3">{initial?"Edit":"Tambah"} Suplier</h3>
        <div className="space-y-2">
          <div><label className="label">Nama</label><input className="input" value={nama} onChange={(e)=>setNama(e.target.value)}/></div>
          <div><label className="label">Platform</label>
            <select className="input" value={platform} onChange={(e)=>setPlatform(e.target.value as any)}>
              <option>Shopee</option><option>TikTok</option><option>Lainnya</option>
            </select>
          </div>
          <div><label className="label">Link Toko</label><input className="input" value={link} onChange={(e)=>setLink(e.target.value)}/></div>
          <div>
            <label className="label">Rating</label>
            <div className="flex gap-1">
              {[1,2,3,4,5].map(n=>(
                <button key={n} onClick={()=>setRating(n)}>
                  <Star size={20} className={n<=rating?"fill-amber-400 text-amber-400":"text-slate-300"}/>
                </button>
              ))}
            </div>
          </div>
          <div><label className="label">Kelebihan</label><input className="input" value={bagus} onChange={(e)=>setBagus(e.target.value)}/></div>
          <div><label className="label">Kekurangan</label><input className="input" value={jelek} onChange={(e)=>setJelek(e.target.value)}/></div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button className="btn btn-ghost" onClick={onCancel}>Batal</button>
          <button className="btn btn-primary" onClick={()=>{
            if(!nama.trim()) { toast.error("Nama wajib"); return; }
            onSave({ id: initial?.id||generateId(), nama: sanitize(nama), platform, link: sanitize(link), rating, bagus: sanitize(bagus), jelek: sanitize(jelek), auto_added: initial?.auto_added||false });
          }}>Simpan</button>
        </div>
      </div>
    </div>
  );
}
