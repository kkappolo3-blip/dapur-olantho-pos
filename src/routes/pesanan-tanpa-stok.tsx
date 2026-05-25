import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import type { Backorder } from "@/types/db";
import { rp, formatTanggalShort, today, generateId, sanitize, toNumber } from "@/lib/utils-app";
import { StatsCard } from "@/components/ui/StatsCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "@/components/ui/Toast";
import { Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/pesanan-tanpa-stok")({ component: BackorderPage });

function BackorderPage() {
  const { data: bos, insert, update, remove } = useSupabaseData<Backorder>("backorders");
  const [nama, setNama] = useState(""); const [qty, setQty] = useState(1); const [pembeli, setPembeli] = useState("");

  const pending = bos.filter(b=>b.status==="Menunggu");
  const totalQty = pending.reduce((a,b)=>a+b.qty,0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatsCard label="Pending" value={pending.length} tone="danger"/>
        <StatsCard label="Total Qty" value={totalQty}/>
        <StatsCard label="Selesai" value={bos.length-pending.length} tone="success"/>
      </div>

      <div className="card p-4">
        <p className="font-semibold mb-2 text-sm">Tambah Permintaan</p>
        <div className="grid sm:grid-cols-4 gap-2">
          <input className="input sm:col-span-2" placeholder="Nama barang" value={nama} onChange={(e)=>setNama(e.target.value)} />
          <input type="number" className="input" placeholder="Qty" value={qty} onChange={(e)=>setQty(toNumber(e.target.value,1))} />
          <input className="input" placeholder="Pembeli (opsional)" value={pembeli} onChange={(e)=>setPembeli(e.target.value)} />
        </div>
        <button className="btn btn-primary mt-2" onClick={async()=>{
          if(!nama.trim()) return toast.error("Nama wajib");
          await insert({ id: generateId(), tanggal: today(), nama: sanitize(nama), qty, pembeli: sanitize(pembeli), status: "Menunggu" } as Backorder);
          setNama(""); setQty(1); setPembeli(""); toast.success("Ditambahkan");
        }}><Plus size={14}/> Tambah</button>
      </div>

      <div className="card overflow-x-auto">
        {bos.length===0 ? <EmptyState title="Tidak ada backorder"/> : (
          <table className="data-table">
            <thead><tr><th>Tanggal</th><th>Barang</th><th>Qty</th><th>Pembeli</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {bos.slice().sort((a,b)=>b.tanggal.localeCompare(a.tanggal)).map((b)=>(
                <tr key={b.id}>
                  <td data-label="Tanggal">{formatTanggalShort(b.tanggal)}</td>
                  <td data-label="Barang" className="font-semibold">{b.nama}</td>
                  <td data-label="Qty">{b.qty}</td>
                  <td data-label="Pembeli">{b.pembeli||"-"}</td>
                  <td data-label="Status"><span className={`badge ${b.status==="Dipenuhi"?"badge-success":"badge-danger"}`}>{b.status}</span></td>
                  <td data-label="Aksi">
                    <div className="flex gap-1">
                      {b.status==="Menunggu" && (
                        <button className="btn btn-success !py-1 !px-2 text-xs" onClick={async()=>{
                          await update(b.id, { status: "Dipenuhi", tanggal_dipenuhi: today() });
                        }}>Selesai</button>
                      )}
                      <button className="text-red-500" onClick={()=>remove(b.id)}><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
