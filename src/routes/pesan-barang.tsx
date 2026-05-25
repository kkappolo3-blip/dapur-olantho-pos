import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Trash2, CreditCard, ExternalLink } from "lucide-react";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { useProfitTotals } from "@/hooks/useSingletons";
import type { Order, OrderItem, Backorder, Supplier } from "@/types/db";
import { rp, formatTanggalShort, today, generateId, sanitize, toNumber } from "@/lib/utils-app";
import { computeSumberModal, simulateSumberModal } from "@/lib/modal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { toast } from "@/components/ui/Toast";
import { EmptyState } from "@/components/ui/EmptyState";

export const Route = createFileRoute("/pesan-barang")({ component: PesanBarang });

const STATUSES: Order["status"][] = ["Rencana", "Dipesan", "Dikirim", "Diterima"];

function PesanBarang() {
  const { data: orders, insert, update, remove } = useSupabaseData<Order>("orders");
  const { data: backorders } = useSupabaseData<Backorder>("backorders");
  const { data: suppliers, upsert: upsertSupplier } = useSupabaseData<Supplier>("suppliers");
  const { data: profit, update: updateProfit } = useProfitTotals();

  const [filter, setFilter] = useState<Order["status"] | "Semua">("Semua");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);
  const [payAsk, setPayAsk] = useState<Order | null>(null);
  const [delAsk, setDelAsk] = useState<Order | null>(null);

  const filtered = useMemo(() => {
    const sorted = orders.slice().sort((a, b) =>
      (b.tanggal || "").localeCompare(a.tanggal || ""),
    );
    return filter === "Semua" ? sorted : sorted.filter((o) => o.status === filter);
  }, [orders, filter]);

  const rencanaList = orders.filter((o) => o.status === "Rencana");

  // backorder rekomendasi
  const recs = backorders.filter((b) => b.status === "Menunggu").slice(0, 6);

  const onSave = async (o: Order) => {
    const exists = orders.find((x) => x.id === o.id);
    if (exists) {
      await update(o.id, o);
      toast.success("Pesanan diperbarui");
    } else {
      await insert(o);
      toast.success("Pesanan dibuat");
    }
    // auto-sync supplier
    if (o.toko && !suppliers.find((s) => s.nama.toLowerCase() === o.toko!.toLowerCase())) {
      await upsertSupplier({
        id: generateId(),
        nama: o.toko,
        platform: (o.platform as any) || "Lainnya",
        link: o.link || "",
        rating: 0,
        auto_added: true,
      } as Supplier);
    }
    setShowForm(false);
    setEditing(null);
  };

  const onPay = async () => {
    if (!payAsk) return;
    const o = payAsk;
    const r = computeSumberModal(o.total_biaya, profit);
    await update(o.id, {
      status: "Dipesan",
      tanggal_bayar: today(),
      sumber_modal: r.sumber,
      modal_putar_used: r.modalPutarUsed,
      modal_talangan_used: r.modalTalanganUsed,
    });
    await updateProfit(r.nextProfitPatch);
    toast.success(`Pesanan dibayar via ${r.sumber}`);
    setPayAsk(null);
  };

  const onDelete = async () => {
    if (!delAsk) return;
    const o = delAsk;
    // restore modal if not Rencana
    if (o.status !== "Rencana") {
      await updateProfit({
        total_modal: (profit.total_modal || 0) + (o.modal_putar_used || 0),
        modal_talangan: (profit.modal_talangan || 0) + (o.modal_talangan_used || 0),
      });
    }
    await remove(o.id);
    toast.success("Pesanan dihapus");
    setDelAsk(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <div className="flex flex-wrap gap-2">
          {(["Semua", ...STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                filter === s
                  ? "bg-indigo-600 text-white"
                  : "bg-white border text-slate-600"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus size={16} /> Pesanan Baru
        </button>
      </div>

      {rencanaList.length > 0 && (
        <div className="alert alert-warning">
          <b>Simulasi Rencana ({rencanaList.length}):</b> Modal BELUM dipotong. Klik
          tombol <CreditCard size={12} className="inline" /> Bayar di tabel untuk
          memproses pembayaran nyata.
        </div>
      )}

      {recs.length > 0 && (
        <div className="card p-4">
          <p className="text-sm font-semibold mb-2">📦 Rekomendasi dari Backorder:</p>
          <div className="flex flex-wrap gap-2">
            {recs.map((b) => (
              <button
                key={b.id}
                className="chip"
                onClick={() => {
                  setEditing({
                    id: generateId(),
                    platform: "Shopee",
                    tanggal: today(),
                    status: "Rencana",
                    items: [{ nama: b.nama, size: "Standar", color: "-", qty: b.qty, harga: 0 }],
                    ongkir: 0,
                    harga_avg: 0,
                    total_biaya: 0,
                    modal_putar_used: 0,
                    modal_talangan_used: 0,
                  } as Order);
                  setShowForm(true);
                }}
              >
                + {b.nama} ({b.qty})
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        {filtered.length === 0 ? (
          <EmptyState title="Belum ada pesanan" desc="Klik 'Pesanan Baru' untuk mulai." />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Platform / Toko</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Sumber Modal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id}>
                  <td data-label="Tanggal">
                    <div>{formatTanggalShort(o.tanggal)}</div>
                    {o.tanggal_bayar && (
                      <div className="text-[10px] text-emerald-600">Bayar: {formatTanggalShort(o.tanggal_bayar)}</div>
                    )}
                  </td>
                  <td data-label="Platform">
                    <div className="font-semibold">{o.platform}</div>
                    {o.toko && (
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        {o.toko}
                        {o.link && <a href={o.link} target="_blank" className="text-indigo-600"><ExternalLink size={11}/></a>}
                      </div>
                    )}
                  </td>
                  <td data-label="Items">
                    <div className="text-xs space-y-0.5">
                      {o.items.map((i, idx) => (
                        <div key={idx}>
                          <span className="font-semibold">{i.qty}x</span> {i.nama}
                          {(i.size && i.size !== "Standar") || (i.color && i.color !== "-") ? (
                            <span className="text-slate-400"> ({[i.size, i.color].filter(Boolean).join("/")})</span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td data-label="Total" className="font-bold">{rp(o.total_biaya)}</td>
                  <td data-label="Status">
                    <span className={`badge ${
                      o.status === "Rencana" ? "badge-amber" :
                      o.status === "Dipesan" ? "badge-indigo" :
                      o.status === "Dikirim" ? "badge-info" : "badge-success"
                    }`}>{o.status}</span>
                  </td>
                  <td data-label="Modal">
                    {o.sumber_modal ? (
                      <span className="text-xs">{o.sumber_modal}</span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td data-label="Aksi">
                    <div className="flex gap-1">
                      {o.status === "Rencana" && (
                        <button className="btn btn-success !py-1.5 !px-2.5" onClick={() => setPayAsk(o)}>
                          <CreditCard size={14}/> Bayar
                        </button>
                      )}
                      {o.status === "Dipesan" && (
                        <button className="btn btn-primary !py-1.5 !px-2.5" onClick={() => {
                          const resi = prompt("Nomor resi:");
                          if (resi) update(o.id, { status: "Dikirim", resi: sanitize(resi) });
                        }}>Kirim</button>
                      )}
                      <button className="btn btn-ghost !py-1.5 !px-2" onClick={() => setDelAsk(o)}>
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <OrderForm
          initial={editing}
          profit={profit}
          onSave={onSave}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      <ConfirmModal
        open={!!payAsk}
        title="Bayar Pesanan?"
        message={payAsk ? `Total ${rp(payAsk.total_biaya)} akan dipotong dari modal sesuai logika otomatis.` : ""}
        confirmLabel="Bayar Sekarang"
        onConfirm={onPay}
        onCancel={() => setPayAsk(null)}
      />
      <ConfirmModal
        open={!!delAsk}
        danger
        title="Hapus Pesanan?"
        message={delAsk?.status === "Rencana" ? "Rencana akan dihapus (modal tidak terpengaruh)." : "Modal akan dikembalikan. Stok TIDAK dipulihkan jika status sudah Diterima."}
        requireCode="88040773"
        confirmLabel="Hapus"
        onConfirm={onDelete}
        onCancel={() => setDelAsk(null)}
      />
    </div>
  );
}

function OrderForm({
  initial,
  profit,
  onSave,
  onCancel,
}: {
  initial: Order | null;
  profit: any;
  onSave: (o: Order) => void;
  onCancel: () => void;
}) {
  const [platform, setPlatform] = useState(initial?.platform || "Shopee");
  const [tanggal, setTanggal] = useState(initial?.tanggal || today());
  const [toko, setToko] = useState(initial?.toko || "");
  const [link, setLink] = useState(initial?.link || "");
  const [ongkir, setOngkir] = useState(initial?.ongkir || 0);
  const [catatan, setCatatan] = useState(initial?.catatan || "");
  const [items, setItems] = useState<OrderItem[]>(
    initial?.items?.length ? initial.items : [{ nama: "", size: "Standar", color: "-", qty: 1, harga: 0 }],
  );

  const subtotal = items.reduce((a, i) => a + i.qty * i.harga, 0);
  const total = subtotal + toNumber(ongkir);
  const totalQty = items.reduce((a, i) => a + i.qty, 0);
  const avgOngkir = totalQty > 0 ? Math.round(toNumber(ongkir) / totalQty) : 0;
  const sim = simulateSumberModal(total, profit);

  const save = () => {
    const valid = items.filter((i) => i.nama.trim() && i.qty > 0);
    if (valid.length === 0) {
      toast.error("Minimal 1 item dengan nama & qty");
      return;
    }
    const o: Order = {
      id: initial?.id || generateId(),
      platform,
      tanggal,
      tanggal_bayar: initial?.tanggal_bayar || null,
      toko: sanitize(toko),
      link: sanitize(link),
      ongkir: toNumber(ongkir),
      harga_avg: avgOngkir,
      total_biaya: total,
      status: initial?.status || "Rencana",
      items: valid.map((i) => ({
        nama: sanitize(i.nama),
        size: sanitize(i.size || "Standar"),
        color: sanitize(i.color || "-"),
        qty: toNumber(i.qty),
        harga: toNumber(i.harga),
      })),
      catatan: sanitize(catatan),
      modal_putar_used: initial?.modal_putar_used || 0,
      modal_talangan_used: initial?.modal_talangan_used || 0,
      sumber_modal: initial?.sumber_modal || null,
      sim_sumber: sim.sumber,
      sim_modal_putar: sim.modalPutar,
      sim_modal_talangan: sim.modalTalangan,
    };
    onSave(o);
  };

  return (
    <div className="fixed inset-0 z-[150] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="card w-full max-w-3xl max-h-[90vh] overflow-y-auto p-5 sm:p-6">
        <h3 className="text-lg font-bold mb-4">{initial?.id ? "Edit Pesanan" : "Pesanan Baru"}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Platform</label>
            <select className="input" value={platform} onChange={(e) => setPlatform(e.target.value)}>
              <option>Shopee</option>
              <option>TikTok</option>
            </select>
          </div>
          <div>
            <label className="label">Tanggal Rencana</label>
            <input type="date" className="input" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          </div>
          <div>
            <label className="label">Nama Toko Suplier</label>
            <input className="input" value={toko} onChange={(e) => setToko(e.target.value)} placeholder="e.g. Dapur Murah" />
          </div>
          <div>
            <label className="label">Link Toko</label>
            <input className="input" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." />
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <label className="label">Items</label>
            <button
              className="btn btn-ghost !py-1 !px-2 text-xs"
              onClick={() => setItems([...items, { nama: "", size: "Standar", color: "-", qty: 1, harga: 0 }])}
            >
              <Plus size={12} /> Item
            </button>
          </div>
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-1.5 items-center">
                <input
                  className="input col-span-12 sm:col-span-4"
                  placeholder="Nama barang"
                  value={it.nama}
                  onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, nama: e.target.value } : x)))}
                />
                <input
                  className="input col-span-6 sm:col-span-2"
                  placeholder="Size"
                  value={it.size}
                  onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, size: e.target.value } : x)))}
                />
                <input
                  className="input col-span-6 sm:col-span-2"
                  placeholder="Warna"
                  value={it.color}
                  onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, color: e.target.value } : x)))}
                />
                <input
                  type="number"
                  className="input col-span-3 sm:col-span-1"
                  placeholder="Qty"
                  value={it.qty}
                  onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, qty: toNumber(e.target.value) } : x)))}
                />
                <input
                  type="number"
                  className="input col-span-7 sm:col-span-2"
                  placeholder="Harga"
                  value={it.harga}
                  onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, harga: toNumber(e.target.value) } : x)))}
                />
                <button
                  className="col-span-2 sm:col-span-1 text-red-500 hover:bg-red-50 rounded-lg p-2"
                  onClick={() => setItems(items.filter((_, i) => i !== idx))}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mt-4">
          <div>
            <label className="label">Ongkir Total</label>
            <input type="number" className="input" value={ongkir} onChange={(e) => setOngkir(toNumber(e.target.value))} />
            <p className="text-xs text-slate-500 mt-1">Avg ongkir/item: {rp(avgOngkir)}</p>
          </div>
          <div>
            <label className="label">Catatan</label>
            <input className="input" value={catatan} onChange={(e) => setCatatan(e.target.value)} />
          </div>
        </div>

        <div className="alert alert-info mt-4 text-xs">
          <b>Total: {rp(total)}</b> · Simulasi sumber modal: <b>{sim.sumber}</b>
          {sim.modalTalangan > 0 && <> (Talangan: {rp(sim.modalTalangan)})</>}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button className="btn btn-ghost" onClick={onCancel}>Batal</button>
          <button className="btn btn-primary" onClick={save}>Simpan Rencana</button>
        </div>
      </div>
    </div>
  );
}
