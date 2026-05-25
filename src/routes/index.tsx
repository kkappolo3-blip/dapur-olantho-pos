import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Package,
  TrendingUp,
  Wallet,
  Boxes,
  AlertCircle,
  Receipt,
  PiggyBank,
} from "lucide-react";
import { StatsCard } from "@/components/ui/StatsCard";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { useProfitTotals } from "@/hooks/useSingletons";
import type {
  Order,
  Sale,
  Inventory,
  Backorder,
  Closing,
  OperationalCost,
} from "@/types/db";
import { rp, formatTanggal, today } from "@/lib/utils-app";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export const Route = createFileRoute("/")({ component: Dashboard });

function Dashboard() {
  const [tab, setTab] = useState<"ringkas" | "insight" | "evaluasi">("ringkas");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b">
        {[
          { id: "ringkas", label: "Ringkasan" },
          { id: "insight", label: "Insight Penjualan" },
          { id: "evaluasi", label: "Evaluasi Bulanan" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              tab === t.id
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "ringkas" && <RingkasTab />}
      {tab === "insight" && <InsightTab />}
      {tab === "evaluasi" && <EvaluasiTab />}
    </div>
  );
}

function RingkasTab() {
  const { data: orders } = useSupabaseData<Order>("orders");
  const { data: sales } = useSupabaseData<Sale>("sales");
  const { data: inv } = useSupabaseData<Inventory>("inventory");
  const { data: backorders } = useSupabaseData<Backorder>("backorders");
  const { data: closings } = useSupabaseData<Closing>("closings");
  const { data: opcosts } = useSupabaseData<OperationalCost>("operational_costs");
  const { data: profit } = useProfitTotals();

  const stats = useMemo(() => {
    const pesananAktif = orders.filter(
      (o) => o.status !== "Rencana" && o.status !== "Diterima",
    ).length;
    const lastClosing = closings.sort((a, b) =>
      (b.tanggal || "").localeCompare(a.tanggal || ""),
    )[0];
    const periodStart = lastClosing?.tanggal || "1970-01-01";
    const sPeriod = sales.filter((s) => s.tanggal > periodStart);
    const pemasukan = sPeriod.reduce(
      (acc, s) =>
        acc +
        (s.cara_bayar === "lunas" ? s.total_jual : s.cicil_bayar || 0),
      0,
    );
    const totalModal = sPeriod.reduce((a, s) => a + (s.total_modal || 0), 0);
    const labaKotor = pemasukan - totalModal;
    const opsiPeriod = opcosts
      .filter((o) => o.tanggal > periodStart)
      .reduce((a, o) => a + o.nominal, 0);
    const nilaiStok = inv.reduce(
      (a, b) => a + (b.harga_beli || 0) * (b.stok || 0),
      0,
    );
    const piutang = sales
      .filter((s) => s.cara_bayar === "cicilan")
      .reduce((a, s) => a + (s.total_jual - (s.cicil_bayar || 0)), 0);
    const backorderPending = backorders.filter(
      (b) => b.status === "Menunggu",
    ).length;

    return {
      pesananAktif,
      pemasukan,
      labaKotor,
      nilaiStok,
      piutang,
      backorderPending,
      lastClosing,
      opsiPeriod,
      totalModal,
    };
  }, [orders, sales, inv, backorders, closings, opcosts]);

  const aktivitas = useMemo(() => {
    const t = today();
    const items: { time: string; text: string; tone: string }[] = [];
    sales
      .filter((s) => s.tanggal === t)
      .slice(0, 10)
      .forEach((s) =>
        items.push({
          time: s.tanggal,
          text: `Penjualan ${rp(s.total_jual)} ke ${s.pembeli}`,
          tone: "success",
        }),
      );
    orders
      .filter(
        (o) => (o.tanggal === t || o.tanggal_bayar === t || o.tanggal_terima === t),
      )
      .slice(0, 10)
      .forEach((o) =>
        items.push({
          time: o.tanggal,
          text: `Pesanan ${o.platform} — ${o.status} (${rp(o.total_biaya)})`,
          tone: "info",
        }),
      );
    return items.slice(0, 10);
  }, [sales, orders]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatsCard icon={<Package size={18} />} label="Pesanan Aktif" value={stats.pesananAktif} tone="indigo" />
        <StatsCard icon={<TrendingUp size={18} />} label="Pemasukan Periode" value={rp(stats.pemasukan)} tone="success" />
        <StatsCard icon={<PiggyBank size={18} />} label="Laba Kotor" value={rp(stats.labaKotor)} tone="indigo" />
        <StatsCard icon={<Boxes size={18} />} label="Nilai Stok" value={rp(stats.nilaiStok)} />
      </div>

      {stats.piutang > 0 && (
        <div className="alert alert-warning flex items-center gap-2">
          <AlertCircle size={18} />
          <span>
            <b>Piutang cicilan: {rp(stats.piutang)}</b> — pantau di menu Pelanggan Cicilan.
          </span>
        </div>
      )}
      {stats.backorderPending > 0 && (
        <div className="alert alert-danger flex items-center gap-2">
          <AlertCircle size={18} />
          <span>
            <b>{stats.backorderPending} pesanan tanpa stok</b> — perlu dipesan ulang.
          </span>
        </div>
      )}

      <div className="card p-5">
        <h3 className="font-bold mb-3">Periode Aktif</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Row label="Akum. Zakat" value={rp(profit.total_zakat)} />
          <Row label="Akum. Gaji" value={rp(profit.total_gaji)} />
          <Row label="Modal Putar" value={rp(profit.total_modal)} />
          <Row
            label="Modal Talangan"
            value={rp(profit.modal_talangan)}
            tone={profit.modal_talangan < 0 ? "danger" : undefined}
          />
          <Row label="Biaya Opsi (periode)" value={rp(stats.opsiPeriod)} />
          <Row label="Total Modal Periode" value={rp(stats.totalModal)} />
          <Row label="Laba Kotor Periode" value={rp(stats.labaKotor)} />
          <Row
            label="Closing Terakhir"
            value={
              stats.lastClosing ? formatTanggal(stats.lastClosing.tanggal) : "—"
            }
          />
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <Receipt size={16} /> Aktivitas Hari Ini
        </h3>
        {aktivitas.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada aktivitas hari ini.</p>
        ) : (
          <ul className="space-y-2">
            {aktivitas.map((a, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-sm border-l-2 border-slate-200 pl-3"
              >
                <span className="text-slate-700">{a.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "danger";
}) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">
        {label}
      </div>
      <div
        className={`font-bold ${tone === "danger" ? "text-red-600" : "text-slate-900"}`}
      >
        {value}
      </div>
    </div>
  );
}

function InsightTab() {
  const { data: sales } = useSupabaseData<Sale>("sales");
  const { data: profit } = useProfitTotals();

  const totalPendapatan = sales.reduce(
    (a, s) =>
      a + (s.cara_bayar === "lunas" ? s.total_jual : s.cicil_bayar || 0),
    0,
  );
  const totalProfit = sales.reduce(
    (a, s) => a + (s.total_jual - (s.total_modal || 0)),
    0,
  );
  const totalQty = sales.reduce(
    (a, s) => a + s.items.reduce((b, i) => b + i.qty, 0),
    0,
  );

  // Top produk by qty
  const byQty: Record<string, { nama: string; qty: number; revenue: number; profit: number }> = {};
  sales.forEach((s) =>
    s.items.forEach((i) => {
      const k = i.nama;
      if (!byQty[k]) byQty[k] = { nama: k, qty: 0, revenue: 0, profit: 0 };
      byQty[k].qty += i.qty;
      byQty[k].revenue += i.qty * i.hargaJual;
      byQty[k].profit += i.qty * (i.hargaJual - i.hargaModal);
    }),
  );
  const topQty = Object.values(byQty).sort((a, b) => b.qty - a.qty).slice(0, 6);

  // Channel performance
  const chan: Record<string, { name: string; value: number }> = {};
  sales.forEach((s) => {
    chan[s.channel] = chan[s.channel] || { name: s.channel, value: 0 };
    chan[s.channel].value +=
      s.cara_bayar === "lunas" ? s.total_jual : s.cicil_bayar || 0;
  });
  const channelData = Object.values(chan);
  const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#3b82f6", "#ef4444"];

  // Tren tanggal
  const tren: Record<string, number> = {};
  sales.forEach((s) => {
    tren[s.tanggal] = (tren[s.tanggal] || 0) + s.total_jual;
  });
  const trenData = Object.entries(tren)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-14)
    .map(([k, v]) => ({ tgl: k.slice(5), total: v }));

  // Saran modal talangan
  let saran = { tone: "alert-success", title: "Modal Sehat", text: "Modal putar cukup, tidak ada utang." };
  if (profit.modal_talangan < 0) {
    saran = {
      tone: "alert-danger",
      title: "Bahaya — Utang Talangan",
      text: `Utang modal talangan ${rp(Math.abs(profit.modal_talangan))}. Prioritaskan closing & bayar dari laba.`,
    };
  } else if (profit.total_modal < 500_000) {
    saran = {
      tone: "alert-warning",
      title: "Waspada",
      text: "Modal putar mulai menipis. Pertimbangkan tambah talangan sebelum stok habis.",
    };
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatsCard label="Total Pendapatan" value={rp(totalPendapatan)} tone="success" />
        <StatsCard label="Total Profit" value={rp(totalProfit)} tone="indigo" />
        <StatsCard label="Barang Terjual" value={totalQty} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-bold mb-3">Produk Terlaris (Qty)</h3>
          {topQty.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada data penjualan.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topQty}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="nama" tick={{ fontSize: 11 }} interval={0} angle={-15} height={50} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="qty" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="card p-5">
          <h3 className="font-bold mb-3">Penjualan per Channel</h3>
          {channelData.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada data.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={channelData} dataKey="value" nameKey="name" outerRadius={80} label>
                  {channelData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => rp(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-bold mb-3">Tren Penjualan</h3>
        {trenData.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada data.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={trenData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="tgl" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => rp(Number(v))} />
              <Bar dataKey="total" fill="#f59e0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className={`alert ${saran.tone}`}>
        <b>{saran.title}.</b> {saran.text}
      </div>
    </div>
  );
}

function EvaluasiTab() {
  const { data: sales } = useSupabaseData<Sale>("sales");
  const { data: opcosts } = useSupabaseData<OperationalCost>("operational_costs");

  const months = useMemo(() => {
    const s = new Set<string>();
    sales.forEach((x) => s.add(x.tanggal.slice(0, 7)));
    opcosts.forEach((x) => s.add(x.tanggal.slice(0, 7)));
    return Array.from(s).sort().reverse();
  }, [sales, opcosts]);

  const [bulan, setBulan] = useState(months[0] || today().slice(0, 7));

  const ms = sales.filter((s) => s.tanggal.startsWith(bulan));
  const mo = opcosts.filter((o) => o.tanggal.startsWith(bulan));
  const rev = ms.reduce(
    (a, s) => a + (s.cara_bayar === "lunas" ? s.total_jual : s.cicil_bayar || 0),
    0,
  );
  const profit = ms.reduce((a, s) => a + (s.total_jual - (s.total_modal || 0)), 0);
  const opsi = mo.reduce((a, o) => a + o.nominal, 0);

  const prods: Record<string, { nama: string; qty: number; profit: number }> = {};
  ms.forEach((s) =>
    s.items.forEach((i) => {
      prods[i.nama] = prods[i.nama] || { nama: i.nama, qty: 0, profit: 0 };
      prods[i.nama].qty += i.qty;
      prods[i.nama].profit += i.qty * (i.hargaJual - i.hargaModal);
    }),
  );
  const top10 = Object.values(prods).sort((a, b) => b.qty - a.qty).slice(0, 10);
  const slow = Object.values(prods).sort((a, b) => a.qty - b.qty).slice(0, 5);

  const saran: string[] = [];
  if (rev === 0) saran.push("Belum ada penjualan bulan ini. Coba promosi di FB/WA.");
  if (opsi > profit * 0.3 && profit > 0) saran.push("Biaya operasional > 30% laba — evaluasi pengeluaran.");
  if (top10[0]) saran.push(`Produk terlaris: ${top10[0].nama}. Stok ulang sebelum habis.`);
  if (slow[0] && slow[0].qty <= 1) saran.push(`Produk lambat: ${slow[0].nama}. Pertimbangkan promo/bundling.`);
  if (profit > 0) saran.push(`Margin bulan ini ${((profit / Math.max(rev,1)) * 100).toFixed(1)}%.`);
  if (saran.length < 5) saran.push("Lakukan closing tepat waktu untuk akurasi laba.");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm font-semibold">Bulan:</label>
        <select
          className="input max-w-[200px]"
          value={bulan}
          onChange={(e) => setBulan(e.target.value)}
        >
          {months.length === 0 && <option>{bulan}</option>}
          {months.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatsCard label="Pendapatan" value={rp(rev)} tone="success" />
        <StatsCard label="Laba" value={rp(profit)} tone="indigo" />
        <StatsCard label="Biaya Operasional" value={rp(opsi)} tone="warning" />
        <StatsCard label="Transaksi" value={ms.length} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-bold mb-2">Top 10 Produk</h3>
          {top10.length === 0 ? (
            <p className="text-sm text-slate-500">Tidak ada data.</p>
          ) : (
            <ul className="space-y-1.5">
              {top10.map((p, i) => (
                <li key={i} className="flex justify-between text-sm border-b pb-1.5">
                  <span>{i + 1}. {p.nama}</span>
                  <span className="font-semibold">{p.qty}x · {rp(p.profit)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card p-5">
          <h3 className="font-bold mb-2">Slow Movers</h3>
          {slow.length === 0 ? (
            <p className="text-sm text-slate-500">Tidak ada data.</p>
          ) : (
            <ul className="space-y-1.5">
              {slow.map((p, i) => (
                <li key={i} className="flex justify-between text-sm border-b pb-1.5">
                  <span>{p.nama}</span>
                  <span className="font-semibold text-amber-600">{p.qty}x</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-bold mb-2">Saran & Rekomendasi</h3>
        <ul className="space-y-2 text-sm">
          {saran.map((s, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-indigo-600">💡</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
