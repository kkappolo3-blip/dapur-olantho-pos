import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { useProfitTotals } from "@/hooks/useSingletons";
import type { OperationalCost, Order } from "@/types/db";
import { rp, formatTanggalShort, today, generateId, sanitize, toNumber } from "@/lib/utils-app";
import { StatsCard } from "@/components/ui/StatsCard";
import { toast } from "@/components/ui/Toast";

export const Route = createFileRoute("/modal-talangan")({ component: ModalTalangan });

function ModalTalangan() {
  const { data: profit, update } = useProfitTotals();
  const { data: orders } = useSupabaseData<Order>("orders");
  const { data: opcosts } = useSupabaseData<OperationalCost>("operational_costs");
  const [tambah, setTambah] = useState(0);
  const [bayar, setBayar] = useState(0);

  const utang = profit.modal_talangan < 0 ? Math.abs(profit.modal_talangan) : 0;
  const ordersTalangan = orders.filter((o) => (o.modal_talangan_used || 0) > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatsCard label="Modal Putar" value={rp(profit.total_modal)} tone="success" />
        <StatsCard
          label={utang > 0 ? "Utang Talangan" : "Modal Talangan"}
          value={rp(profit.modal_talangan)}
          tone={utang > 0 ? "danger" : "indigo"}
        />
        <StatsCard label="Total Modal" value={rp(profit.total_modal + profit.modal_talangan)} />
      </div>

      <div className="alert alert-info text-xs">
        <b>Logika modal:</b> Saat bayar pesanan, sistem otomatis pakai Modal Putar dulu; bila tidak cukup, sisanya dari Talangan. Talangan bisa MINUS (utang).
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="card p-5">
          <h3 className="font-bold mb-3">Tambah Modal Talangan</h3>
          <input type="number" className="input mb-2" value={tambah} onChange={(e)=>setTambah(toNumber(e.target.value))} />
          <button className="btn btn-primary w-full" disabled={tambah<=0} onClick={async()=>{
            await update({ modal_talangan: profit.modal_talangan + tambah });
            setTambah(0); toast.success("Talangan ditambah");
          }}>Tambah</button>
        </div>
        <div className="card p-5">
          <h3 className="font-bold mb-3">Bayar Utang Talangan (dari kantong)</h3>
          <input type="number" className="input mb-2" value={bayar} onChange={(e)=>setBayar(toNumber(e.target.value))} max={utang} />
          <button className="btn btn-success w-full" disabled={bayar<=0 || utang<=0} onClick={async()=>{
            await update({ modal_talangan: profit.modal_talangan + bayar });
            setBayar(0); toast.success("Utang berkurang");
          }}>Bayar (utang saat ini: {rp(utang)})</button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <div className="p-4 border-b font-bold">Pesanan yang Pakai Talangan</div>
        <table className="data-table">
          <thead><tr><th>Tanggal</th><th>Platform</th><th>Total</th><th>Pakai Talangan</th><th>Status</th></tr></thead>
          <tbody>
            {ordersTalangan.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-slate-400 py-6">Belum ada</td></tr>
            ) : ordersTalangan.map((o)=>(
              <tr key={o.id}>
                <td data-label="Tanggal">{formatTanggalShort(o.tanggal_bayar)}</td>
                <td data-label="Platform">{o.platform}</td>
                <td data-label="Total">{rp(o.total_biaya)}</td>
                <td data-label="Talangan" className="text-red-600 font-bold">{rp(o.modal_talangan_used)}</td>
                <td data-label="Status"><span className="badge badge-info">{o.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
