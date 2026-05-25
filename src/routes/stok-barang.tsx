import { Fragment } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import type { Inventory } from "@/types/db";
import { rp, formatTanggalShort } from "@/lib/utils-app";
import { StatsCard } from "@/components/ui/StatsCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ChevronDown, ChevronRight, Search, Trash2 } from "lucide-react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { toast } from "@/components/ui/Toast";

export const Route = createFileRoute("/stok-barang")({ component: StokBarang });

function StokBarang() {
  const { data: inv, remove, upsert } = useSupabaseData<Inventory>("inventory");
  const [q, setQ] = useState("");
  const [exp, setExp] = useState<Record<string, boolean>>({});
  const [delAsk, setDelAsk] = useState<Inventory | null>(null);

  const filtered = useMemo(
    () => inv.filter((x) => x.nama.toLowerCase().includes(q.toLowerCase())).sort((a,b)=>a.nama.localeCompare(b.nama)),
    [inv, q],
  );

  const jenis = inv.length;
  const totalItem = inv.reduce((a,b)=>a+(b.stok||0),0);
  const rendah = inv.filter(x=>x.stok>0 && x.stok<=3).length;
  const habis = inv.filter(x=>x.stok===0).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatsCard label="Jenis Barang" value={jenis} tone="indigo" />
        <StatsCard label="Total Item" value={totalItem} tone="success" />
        <StatsCard label="Stok Rendah" value={rendah} tone="warning" />
        <StatsCard label="Stok Habis" value={habis} tone="danger" />
      </div>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-3 text-slate-400"/>
        <input className="input pl-9" placeholder="Cari barang..." value={q} onChange={(e)=>setQ(e.target.value)} />
      </div>
      <div className="card overflow-x-auto">
        {filtered.length === 0 ? (
          <EmptyState title="Tidak ada barang" />
        ) : (
          <table className="data-table">
            <thead><tr><th></th><th>Nama</th><th>Stok</th><th>Harga Beli</th><th>Harga Jual</th><th>Terakhir Masuk</th><th></th></tr></thead>
            <tbody>
              {filtered.map((x)=>(
                <>
                  <tr key={x.id}>
                    <td>
                      {x.variants?.length > 1 ? (
                        <button onClick={()=>setExp({...exp, [x.id]: !exp[x.id]})}>
                          {exp[x.id] ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                        </button>
                      ) : null}
                    </td>
                    <td data-label="Nama" className="font-semibold">{x.nama}</td>
                    <td data-label="Stok"><span className={`badge ${x.stok===0?"badge-danger":x.stok<=3?"badge-amber":"badge-success"}`}>{x.stok}</span></td>
                    <td data-label="Beli">{rp(x.harga_beli)}</td>
                    <td data-label="Jual" className="font-bold">{rp(x.harga_jual)}</td>
                    <td data-label="Masuk">{formatTanggalShort(x.terakhir_masuk)}</td>
                    <td data-label="Aksi"><button onClick={()=>setDelAsk(x)} className="text-red-500"><Trash2 size={14}/></button></td>
                  </tr>
                  {exp[x.id] && x.variants?.map(v=>(
                    <tr key={v.vid} className="bg-slate-50">
                      <td></td>
                      <td className="pl-8 text-sm">↳ {[v.size, v.color].filter(z=>z&&z!=="-"&&z!=="Standar").join("/") || "Standar"}</td>
                      <td><span className="badge">{v.stok}</span></td>
                      <td>{rp(v.hargaBeli)}</td>
                      <td>{rp(v.hargaJual)}</td>
                      <td>{formatTanggalShort(v.terakhirMasuk)}</td>
                      <td></td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <ConfirmModal open={!!delAsk} danger title="Hapus Barang?" message={`Hapus ${delAsk?.nama} dan semua varian.`} requireCode="88040773"
        onConfirm={async()=>{ if(delAsk){ await remove(delAsk.id); toast.success("Dihapus"); } setDelAsk(null); }}
        onCancel={()=>setDelAsk(null)} />
    </div>
  );
}
