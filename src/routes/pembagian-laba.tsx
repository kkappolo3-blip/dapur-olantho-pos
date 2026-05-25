import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { useProfitTotals } from "@/hooks/useSingletons";
import type { Closing } from "@/types/db";
import { rp, formatTanggalShort } from "@/lib/utils-app";
import { StatsCard } from "@/components/ui/StatsCard";
import { toast } from "@/components/ui/Toast";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

export const Route = createFileRoute("/pembagian-laba")({ component: PembagianLaba });

function PembagianLaba() {
  const { data: closings } = useSupabaseData<Closing>("closings");
  const { data: profit, update } = useProfitTotals();
  const [ask, setAsk] = useState<null | "zakat" | "gaji" | "modal">(null);

  const doPay = async () => {
    if (!ask) return;
    if (ask === "zakat") await update({ total_zakat: 0 });
    if (ask === "gaji") await update({ total_gaji: 0 });
    if (ask === "modal") await update({ total_modal: 0 });
    toast.success("Dibayar");
    setAsk(null);
  };

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-3">
        <SplitCard label="Zakat (5%)" value={profit.total_zakat} tone="success" onPay={() => setAsk("zakat")} />
        <SplitCard label="Gaji (10%)" value={profit.total_gaji} tone="info" onPay={() => setAsk("gaji")} />
        <SplitCard label="Modal Putar (85%)" value={profit.total_modal} tone="indigo" onPay={() => setAsk("modal")} payLabel="Tarik" />
      </div>
      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Tanggal</th><th>Trx</th><th>Pemasukan</th><th>Laba</th><th>Zakat</th><th>Gaji</th><th>Modal</th></tr></thead>
          <tbody>
            {closings.slice().sort((a,b)=>b.tanggal.localeCompare(a.tanggal)).map((c)=>(
              <tr key={c.id}>
                <td data-label="Tanggal">{formatTanggalShort(c.tanggal)}</td>
                <td data-label="Trx">{c.jumlah_trx}</td>
                <td data-label="Pemasukan">{rp(c.total_pemasukan)}</td>
                <td data-label="Laba">{rp(c.laba)}</td>
                <td data-label="Zakat">{rp(c.zakat)}</td>
                <td data-label="Gaji">{rp(c.gaji)}</td>
                <td data-label="Modal">{rp(c.modal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal open={!!ask} title="Konfirmasi Bayar" message="Saldo akan di-reset ke 0." onConfirm={doPay} onCancel={() => setAsk(null)} />
    </div>
  );
}

function SplitCard({ label, value, tone, onPay, payLabel = "Bayar" }: { label: string; value: number; tone: any; onPay: () => void; payLabel?: string }) {
  return (
    <div className="card p-5 text-center">
      <p className="text-xs uppercase tracking-wide text-slate-500 font-bold">{label}</p>
      <p className="text-3xl font-bold mt-2 text-slate-900">{rp(value)}</p>
      <button className="btn btn-primary mt-3 w-full" disabled={value <= 0} onClick={onPay}>{payLabel}</button>
    </div>
  );
}
