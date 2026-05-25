import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { useProfitTotals } from "@/hooks/useSingletons";
import type { Sale, Closing, OperationalCost } from "@/types/db";
import { rp, today, generateId } from "@/lib/utils-app";
import { StatsCard } from "@/components/ui/StatsCard";
import { toast } from "@/components/ui/Toast";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

export const Route = createFileRoute("/closing")({ component: ClosingPage });

function ClosingPage() {
  const { data: sales } = useSupabaseData<Sale>("sales");
  const { data: closings, insert: insertClosing } = useSupabaseData<Closing>("closings");
  const { data: opcosts } = useSupabaseData<OperationalCost>("operational_costs");
  const { data: profit, update: updateProfit } = useProfitTotals();
  const [ask, setAsk] = useState(false);

  const last = useMemo(
    () => closings.slice().sort((a, b) => b.tanggal.localeCompare(a.tanggal))[0],
    [closings],
  );
  const periodStart = last?.tanggal || "1970-01-01";

  const sPeriod = sales.filter((s) => s.tanggal > periodStart);
  const oPeriod = opcosts.filter((o) => o.tanggal > periodStart && o.sumber_modal === "Laba Closing");

  const totalJual = sPeriod.reduce((a, s) => a + s.total_jual, 0);
  const pemasukanAktual = sPeriod.reduce(
    (a, s) => a + (s.cara_bayar === "lunas" ? s.total_jual : s.cicil_bayar || 0),
    0,
  );
  const totalModal = sPeriod.reduce((a, s) => a + (s.total_modal || 0), 0);
  const labaKotor = pemasukanAktual - totalModal;
  const totalOpsi = oPeriod.reduce((a, o) => a + o.nominal, 0);
  const piutang = sPeriod
    .filter((s) => s.cara_bayar === "cicilan")
    .reduce((a, s) => a + (s.total_jual - (s.cicil_bayar || 0)), 0);
  const labaBersih = Math.max(0, labaKotor - totalOpsi);

  const doClose = async () => {
    const zakat = Math.round(labaBersih * 0.05);
    const gaji = Math.round(labaBersih * 0.1);
    const modal = labaBersih - zakat - gaji;
    const c: Closing = {
      id: generateId(),
      tanggal: today(),
      periode_mulai: periodStart,
      periode_selesai: today(),
      jumlah_trx: sPeriod.length,
      total_jual: totalJual,
      total_pemasukan: pemasukanAktual,
      total_modal: totalModal,
      laba_kotor: labaKotor,
      piutang_cicilan: piutang,
      total_opsi: totalOpsi,
      laba: labaBersih,
      zakat, gaji, modal,
      opsi_items: oPeriod.map((o) => ({ nama: o.nama, nominal: o.nominal })),
    };
    await insertClosing(c);
    await updateProfit({
      total_zakat: profit.total_zakat + zakat,
      total_gaji: profit.total_gaji + gaji,
      total_modal: profit.total_modal + modal,
      total_profit: profit.total_profit + labaBersih,
      last_closing_date: today(),
    });
    toast.success("Closing berhasil!");
    setAsk(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatsCard label="Pemasukan Aktual" value={rp(pemasukanAktual)} tone="success" />
        <StatsCard label="Total Modal" value={rp(totalModal)} />
        <StatsCard label="Laba Kotor" value={rp(labaKotor)} tone="indigo" />
        <StatsCard label="Biaya Opsi" value={rp(totalOpsi)} tone="warning" />
      </div>
      {piutang > 0 && (
        <div className="alert alert-warning">Piutang cicilan: {rp(piutang)} (tidak masuk laba sampai dibayar)</div>
      )}

      <div className="card p-5">
        <h3 className="font-bold mb-3">Ringkasan Closing</h3>
        <div className="space-y-2 text-sm">
          <Row label="Pemasukan Aktual" value={rp(pemasukanAktual)} />
          <Row label="- Total Modal" value={"− " + rp(totalModal)} />
          <Row label="= Laba Kotor" value={rp(labaKotor)} bold />
          <Row label="- Biaya Operasional" value={"− " + rp(totalOpsi)} />
          <Row label="LABA BERSIH" value={rp(labaBersih)} bold className="text-emerald-700 text-base" />
          <hr className="my-2"/>
          <Row label="→ Zakat (5%)" value={rp(Math.round(labaBersih * 0.05))} />
          <Row label="→ Gaji (10%)" value={rp(Math.round(labaBersih * 0.1))} />
          <Row label="→ Modal Putar (85%)" value={rp(labaBersih - Math.round(labaBersih * 0.05) - Math.round(labaBersih * 0.1))} />
        </div>
        {oPeriod.length > 0 && (
          <div className="mt-4">
            <p className="font-semibold text-sm mb-1">Biaya Operasional Periode:</p>
            <ul className="text-xs text-slate-600 space-y-0.5">
              {oPeriod.map((o)=> <li key={o.id}>• {o.nama} — {rp(o.nominal)}</li>)}
            </ul>
          </div>
        )}
        <button
          className="btn btn-primary mt-4 w-full"
          disabled={sPeriod.length === 0}
          onClick={() => setAsk(true)}
        >
          Lakukan Closing ({sPeriod.length} transaksi)
        </button>
      </div>

      <ConfirmModal
        open={ask}
        title="Konfirmasi Closing"
        message={`Closing akan menutup periode dan membagi laba. Lanjutkan?`}
        onConfirm={doClose}
        onCancel={() => setAsk(false)}
      />
    </div>
  );
}

function Row({ label, value, bold, className }: { label: string; value: string; bold?: boolean; className?: string }) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold" : ""} ${className || ""}`}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}
