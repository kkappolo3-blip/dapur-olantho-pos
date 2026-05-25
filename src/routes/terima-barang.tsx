import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import type { Order, Inventory, Variant, Backorder } from "@/types/db";
import { rp, formatTanggalShort, today, generateId, toNumber } from "@/lib/utils-app";
import { defaultHargaJual, hargaBeli } from "@/lib/pricing";
import { toast } from "@/components/ui/Toast";
import { EmptyState } from "@/components/ui/EmptyState";
import { PackageCheck } from "lucide-react";

export const Route = createFileRoute("/terima-barang")({ component: TerimaBarang });

function TerimaBarang() {
  const { data: orders, update: updateOrder } = useSupabaseData<Order>("orders");
  const { data: inventory, upsert: upsertInv } = useSupabaseData<Inventory>("inventory");
  const { data: backorders, update: updateBO } = useSupabaseData<Backorder>("backorders");

  const [receiving, setReceiving] = useState<Order | null>(null);
  const dikirim = orders.filter((o) => o.status === "Dikirim");

  return (
    <div className="space-y-4">
      <div className="alert alert-info">
        Pesanan yang sudah dikirim oleh suplier. Klik <b>Terima</b> untuk memasukkan ke stok.
      </div>
      {dikirim.length === 0 ? (
        <div className="card"><EmptyState icon={<PackageCheck size={48}/>} title="Belum ada pesanan dikirim" /></div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {dikirim.map((o) => (
            <div key={o.id} className="card p-4">
              <div className="flex justify-between mb-2">
                <div>
                  <div className="font-bold">{o.platform} · {o.toko || "-"}</div>
                  <div className="text-xs text-slate-500">Dipesan: {formatTanggalShort(o.tanggal_bayar)}</div>
                </div>
                <span className="badge badge-info">Dikirim</span>
              </div>
              <div className="text-sm space-y-1">
                {o.items.map((i, idx) => (
                  <div key={idx}>{i.qty}x {i.nama} ({[i.size, i.color].filter(x=>x&&x!=="-"&&x!=="Standar").join("/") || "Standar"})</div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-3">
                <span className="font-bold">{rp(o.total_biaya)}</span>
                <button className="btn btn-primary !py-1.5 !px-3" onClick={() => setReceiving(o)}>Terima</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {receiving && (
        <ReceiveModal
          order={receiving}
          inventory={inventory}
          onClose={() => setReceiving(null)}
          onConfirm={async (hargaJualPerItem) => {
            const o = receiving;
            const avgOngkir = o.harga_avg || 0;
            // Update inventory per varian
            for (let idx = 0; idx < o.items.length; idx++) {
              const it = o.items[idx];
              const hb = hargaBeli(it.harga, avgOngkir);
              const hj = toNumber(hargaJualPerItem[idx], defaultHargaJual(it.harga, avgOngkir));
              // find existing inventory by name
              const existing = inventory.find((x) => x.nama.toLowerCase() === it.nama.toLowerCase());
              if (existing) {
                const variants = (existing.variants || []).slice();
                const vIdx = variants.findIndex(
                  (v) => (v.size || "Standar") === (it.size || "Standar") && (v.color || "-") === (it.color || "-"),
                );
                if (vIdx >= 0) {
                  variants[vIdx] = { ...variants[vIdx], stok: variants[vIdx].stok + it.qty, hargaBeli: hb, hargaJual: hj, terakhirMasuk: today() };
                } else {
                  variants.push({ vid: generateId(), size: it.size || "Standar", color: it.color || "-", stok: it.qty, hargaBeli: hb, hargaJual: hj, terakhirMasuk: today() });
                }
                const stok = variants.reduce((a, v) => a + v.stok, 0);
                await upsertInv({ ...existing, variants, stok, harga_beli: hb, harga_jual: hj, terakhir_masuk: today() });
              } else {
                const v: Variant = { vid: generateId(), size: it.size || "Standar", color: it.color || "-", stok: it.qty, hargaBeli: hb, hargaJual: hj, terakhirMasuk: today() };
                await upsertInv({
                  id: generateId(),
                  nama: it.nama,
                  variants: [v],
                  stok: it.qty,
                  harga_beli: hb,
                  harga_jual: hj,
                  terakhir_masuk: today(),
                });
              }
              // resolve backorder for this product
              const pending = backorders.filter(
                (b) => b.status === "Menunggu" && b.nama.toLowerCase() === it.nama.toLowerCase(),
              );
              for (const b of pending) {
                await updateBO(b.id, { status: "Dipenuhi", tanggal_dipenuhi: today() });
              }
            }
            await updateOrder(o.id, { status: "Diterima", tanggal_terima: today() });
            toast.success("Barang masuk stok");
            setReceiving(null);
          }}
        />
      )}
    </div>
  );
}

function ReceiveModal({
  order,
  onClose,
  onConfirm,
}: {
  order: Order;
  inventory: Inventory[];
  onClose: () => void;
  onConfirm: (jualPerItem: number[]) => void;
}) {
  const avg = order.harga_avg || 0;
  const [jual, setJual] = useState<number[]>(order.items.map((i) => defaultHargaJual(i.harga, avg)));
  const valid = order.items.every((i, idx) => jual[idx] >= hargaBeli(i.harga, avg));

  return (
    <div className="fixed inset-0 z-[150] bg-slate-900/50 flex items-center justify-center p-4">
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5">
        <h3 className="text-lg font-bold mb-3">Terima Barang</h3>
        <div className="space-y-3">
          {order.items.map((i, idx) => {
            const hb = hargaBeli(i.harga, avg);
            return (
              <div key={idx} className="border rounded-xl p-3">
                <div className="font-semibold">{i.nama}</div>
                <div className="text-xs text-slate-500">{[i.size, i.color].filter(x=>x&&x!=="-"&&x!=="Standar").join("/") || "Standar"} · {i.qty}x</div>
                <div className="text-xs mt-1">
                  Harga Asli: <b>{rp(i.harga)}</b> + Avg Ongkir <b>{rp(avg)}</b> = Harga Beli <b>{rp(hb)}</b>
                </div>
                <div className="mt-2">
                  <label className="label">Harga Jual</label>
                  <input
                    type="number"
                    className={`input ${jual[idx] < hb ? "border-red-500" : ""}`}
                    value={jual[idx]}
                    onChange={(e) => {
                      const v = toNumber(e.target.value);
                      setJual(jual.map((x, j) => (j === idx ? v : x)));
                    }}
                  />
                  {jual[idx] < hb && <p className="text-xs text-red-600 mt-1">Harga jual harus ≥ harga beli</p>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button className="btn btn-ghost" onClick={onClose}>Batal</button>
          <button className="btn btn-primary" disabled={!valid} onClick={() => onConfirm(jual)}>Masukkan ke Stok</button>
        </div>
      </div>
    </div>
  );
}
