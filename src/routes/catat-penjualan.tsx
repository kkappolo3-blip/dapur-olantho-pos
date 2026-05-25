import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Trash2, PauseCircle } from "lucide-react";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import type { Inventory, Sale, SaleItem, Backorder, Hold, Variant } from "@/types/db";
import { rp, formatTanggalShort, today, generateId, sanitize, toNumber } from "@/lib/utils-app";
import { toast } from "@/components/ui/Toast";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { EmptyState } from "@/components/ui/EmptyState";

export const Route = createFileRoute("/catat-penjualan")({ component: CatatPenjualan });

interface CartItem {
  invId: string;
  vid: string;
  nama: string;
  qty: number;
  hargaJual: number;
  hargaModal: number;
  maxStok: number;
}

function CatatPenjualan() {
  const { data: inventory, upsert: upsertInv } = useSupabaseData<Inventory>("inventory");
  const { data: sales, insert: insertSale, remove: removeSale } = useSupabaseData<Sale>("sales");
  const { data: holds, insert: insertHold, remove: removeHold } = useSupabaseData<Hold>("holds");
  const { insert: insertBO } = useSupabaseData<Backorder>("backorders");

  const [open, setOpen] = useState(false);
  const [resumeHold, setResumeHold] = useState<Hold | null>(null);
  const [delSale, setDelSale] = useState<Sale | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-base">Penjualan</h2>
        <button className="btn btn-primary" onClick={() => { setResumeHold(null); setOpen(true); }}>
          <Plus size={16}/> Penjualan Baru
        </button>
      </div>

      {holds.length > 0 && (
        <div className="card p-4">
          <p className="text-sm font-semibold mb-2">📋 Penjualan Tertunda</p>
          <div className="flex flex-wrap gap-2">
            {holds.map((h) => (
              <div key={h.id} className="chip group">
                <span onClick={() => { setResumeHold(h); setOpen(true); }}>
                  {h.pembeli || "tanpa nama"} · {rp(h.total_jual)}
                </span>
                <button onClick={() => removeHold(h.id)} className="text-red-500"><Trash2 size={11}/></button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        {sales.length === 0 ? (
          <EmptyState title="Belum ada penjualan" />
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Tanggal</th><th>Pembeli</th><th>Channel</th><th>Items</th><th>Total</th><th>Bayar</th><th></th></tr>
            </thead>
            <tbody>
              {sales.slice().sort((a,b)=>b.tanggal.localeCompare(a.tanggal)).map((s)=>(
                <tr key={s.id}>
                  <td data-label="Tanggal">{formatTanggalShort(s.tanggal)}</td>
                  <td data-label="Pembeli">{s.pembeli}</td>
                  <td data-label="Channel"><span className="badge">{s.channel}</span></td>
                  <td data-label="Items" className="text-xs">{s.items.map(i=>`${i.qty}x ${i.nama}`).join(", ")}</td>
                  <td data-label="Total" className="font-bold">{rp(s.total_jual)}</td>
                  <td data-label="Bayar">
                    {s.cara_bayar === "lunas" ? (
                      <span className="badge badge-success">Lunas</span>
                    ) : (
                      <span className="badge badge-amber">Cicil {rp(s.cicil_bayar||0)}/{rp(s.total_jual)}</span>
                    )}
                  </td>
                  <td data-label="Aksi">
                    <button className="btn btn-ghost !py-1 !px-2" onClick={() => setDelSale(s)}><Trash2 size={14}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {open && (
        <SaleForm
          inventory={inventory}
          resume={resumeHold}
          onCancel={() => { setOpen(false); setResumeHold(null); }}
          onHold={async (h) => {
            await insertHold(h);
            if (resumeHold) await removeHold(resumeHold.id);
            toast.success("Disimpan sebagai draft");
            setOpen(false);
            setResumeHold(null);
          }}
          onSubmit={async (sale, nostok) => {
            // reduce stock per variant
            for (const it of sale.items) {
              const inv = inventory.find((x) => x.id === it.invId);
              if (!inv) continue;
              const variants = inv.variants.map((v) => v.vid === it.vid ? { ...v, stok: Math.max(0, v.stok - it.qty) } : v);
              await upsertInv({ ...inv, variants, stok: variants.reduce((a,v)=>a+v.stok,0) });
            }
            // backorders for no-stock items
            for (const ns of nostok) {
              await insertBO({
                id: generateId(),
                tanggal: today(),
                nama: ns.nama,
                qty: ns.qty,
                pembeli: sale.pembeli,
                channel: sale.channel,
                status: "Menunggu",
              } as Backorder);
            }
            await insertSale(sale);
            if (resumeHold) await removeHold(resumeHold.id);
            toast.success("Penjualan dicatat");
            setOpen(false);
            setResumeHold(null);
          }}
        />
      )}

      <ConfirmModal
        open={!!delSale}
        danger
        title="Hapus Penjualan?"
        message="Stok akan dikembalikan ke varian masing-masing."
        requireCode="88040773"
        onConfirm={async () => {
          if (!delSale) return;
          // restore stock
          for (const it of delSale.items) {
            const inv = inventory.find((x) => x.id === it.invId);
            if (!inv) continue;
            const variants = inv.variants.map((v) => v.vid === it.vid ? { ...v, stok: v.stok + it.qty } : v);
            await upsertInv({ ...inv, variants, stok: variants.reduce((a,v)=>a+v.stok,0) });
          }
          await removeSale(delSale.id);
          toast.success("Penjualan dihapus");
          setDelSale(null);
        }}
        onCancel={() => setDelSale(null)}
      />
    </div>
  );
}

function SaleForm({
  inventory,
  resume,
  onSubmit,
  onHold,
  onCancel,
}: {
  inventory: Inventory[];
  resume: Hold | null;
  onSubmit: (s: Sale, nostok: { nama: string; qty: number }[]) => void;
  onHold: (h: Hold) => void;
  onCancel: () => void;
}) {
  const [pembeli, setPembeli] = useState(resume?.pembeli || "");
  const [channel, setChannel] = useState(resume?.channel || "Teras");
  const [carabayar, setCB] = useState<"lunas" | "cicilan">(resume?.cara_bayar || "lunas");
  const [dp, setDp] = useState(resume?.dp || 0);
  const [tenor, setTenor] = useState(resume?.tenor || 4);
  const [items, setItems] = useState<CartItem[]>(() =>
    resume ? resume.items.map((i) => {
      const inv = inventory.find(x => x.id === i.invId);
      const v = inv?.variants.find(x => x.vid === i.vid);
      return { ...i, maxStok: v?.stok || 0 };
    }) : [],
  );
  const [nsName, setNsName] = useState("");
  const [nsQty, setNsQty] = useState(1);
  const [nostok, setNostok] = useState<{ nama: string; qty: number }[]>(resume?.nostok || []);

  const total = items.reduce((a, i) => a + i.qty * i.hargaJual, 0);
  const totalModal = items.reduce((a, i) => a + i.qty * i.hargaModal, 0);

  const variantOptions = useMemo(() => {
    const opts: { key: string; label: string; invId: string; vid: string; nama: string; hb: number; hj: number; stok: number }[] = [];
    inventory.forEach((inv) =>
      inv.variants.forEach((v) => {
        if (v.stok > 0) {
          opts.push({
            key: inv.id + "_" + v.vid,
            label: `${inv.nama} ${v.size !== "Standar" || v.color !== "-" ? `(${[v.size, v.color].filter(x=>x&&x!=="-"&&x!=="Standar").join("/")})` : ""} · stok ${v.stok}`,
            invId: inv.id, vid: v.vid, nama: inv.nama, hb: v.hargaBeli, hj: v.hargaJual, stok: v.stok,
          });
        }
      }),
    );
    return opts;
  }, [inventory]);

  const addItem = (key: string) => {
    const o = variantOptions.find((x) => x.key === key);
    if (!o) return;
    setItems([...items, { invId: o.invId, vid: o.vid, nama: o.nama, qty: 1, hargaJual: o.hj, hargaModal: o.hb, maxStok: o.stok }]);
  };

  const submit = () => {
    if (items.length === 0 && nostok.length === 0) { toast.error("Tambah minimal 1 item"); return; }
    if (!pembeli.trim()) { toast.error("Nama pembeli wajib"); return; }
    const sale: Sale = {
      id: generateId(),
      tanggal: today(),
      channel: sanitize(channel),
      pembeli: sanitize(pembeli),
      items: items.map(({ maxStok, ...rest }) => rest as SaleItem),
      total_jual: total,
      total_modal: totalModal,
      cara_bayar: carabayar,
      dp: carabayar === "cicilan" ? toNumber(dp) : undefined,
      tenor: carabayar === "cicilan" ? toNumber(tenor) : undefined,
      cicil_bayar: carabayar === "cicilan" ? toNumber(dp) : undefined,
      cicil_riwayat: carabayar === "cicilan" && dp > 0 ? [{ tgl: today(), nominal: toNumber(dp), ket: "DP" }] : [],
    };
    onSubmit(sale, nostok);
  };

  const hold = () => {
    const h: Hold = {
      id: resume?.id || generateId(),
      tanggal: today(),
      channel: sanitize(channel),
      pembeli: sanitize(pembeli),
      items: items.map(({ maxStok, ...rest }) => rest as SaleItem),
      nostok,
      total_jual: total,
      cara_bayar: carabayar,
      dp: toNumber(dp),
      tenor: toNumber(tenor),
    };
    onHold(h);
  };

  return (
    <div className="fixed inset-0 z-[150] bg-slate-900/50 flex items-center justify-center p-4">
      <div className="card w-full max-w-3xl max-h-[92vh] overflow-y-auto p-5">
        <h3 className="text-lg font-bold mb-3">Catat Penjualan</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          <div><label className="label">Pembeli</label><input className="input" value={pembeli} onChange={(e)=>setPembeli(e.target.value)} /></div>
          <div><label className="label">Channel</label>
            <select className="input" value={channel} onChange={(e)=>setChannel(e.target.value)}>
              <option>Teras</option><option>WA</option><option>FB</option><option>IG</option><option>Lainnya</option>
            </select>
          </div>
          <div><label className="label">Cara Bayar</label>
            <select className="input" value={carabayar} onChange={(e)=>setCB(e.target.value as any)}>
              <option value="lunas">Lunas</option><option value="cicilan">Cicilan</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="label">Tambah Item dari Stok</label>
          <select className="input" value="" onChange={(e)=>{ if(e.target.value) addItem(e.target.value); e.target.value=""; }}>
            <option value="">— Pilih barang —</option>
            {variantOptions.map(o=> <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>

        {items.length > 0 && (
          <div className="mt-3 space-y-2">
            {items.map((it, idx)=>(
              <div key={idx} className="grid grid-cols-12 gap-1.5 items-center">
                <div className="col-span-12 sm:col-span-5 text-sm font-medium">{it.nama}</div>
                <input type="number" className="input col-span-3 sm:col-span-2" min={1} max={it.maxStok} value={it.qty}
                  onChange={(e)=>setItems(items.map((x,i)=>i===idx?{...x, qty: Math.min(it.maxStok, Math.max(1, toNumber(e.target.value, 1)))}:x))}/>
                <input type="number" className="input col-span-5 sm:col-span-3" value={it.hargaJual}
                  onChange={(e)=>setItems(items.map((x,i)=>i===idx?{...x, hargaJual: toNumber(e.target.value)}:x))}/>
                <div className="col-span-3 sm:col-span-1 text-sm font-bold">{rp(it.qty*it.hargaJual)}</div>
                <button onClick={()=>setItems(items.filter((_,i)=>i!==idx))} className="col-span-1 text-red-500"><Trash2 size={14}/></button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 border-t pt-3">
          <label className="label">Barang Tanpa Stok (auto-backorder)</label>
          <div className="flex gap-2">
            <input className="input flex-1" placeholder="Nama barang" value={nsName} onChange={(e)=>setNsName(e.target.value)} />
            <input type="number" className="input w-20" value={nsQty} onChange={(e)=>setNsQty(toNumber(e.target.value,1))} />
            <button className="btn btn-ghost" onClick={()=>{
              if(!nsName.trim()) return;
              setNostok([...nostok, { nama: sanitize(nsName), qty: nsQty }]); setNsName(""); setNsQty(1);
            }}>Tambah</button>
          </div>
          {nostok.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {nostok.map((n,i)=>(
                <span key={i} className="chip">{n.qty}x {n.nama}
                  <button onClick={()=>setNostok(nostok.filter((_,j)=>j!==i))} className="text-red-500 ml-1">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {carabayar === "cicilan" && (
          <div className="grid sm:grid-cols-2 gap-3 mt-3 bg-amber-50 p-3 rounded-xl">
            <div><label className="label">DP</label><input type="number" className="input" value={dp} onChange={(e)=>setDp(toNumber(e.target.value))}/></div>
            <div><label className="label">Tenor (kali)</label><input type="number" className="input" value={tenor} onChange={(e)=>setTenor(toNumber(e.target.value))}/></div>
          </div>
        )}

        <div className="alert alert-info mt-4">
          <b>Total: {rp(total)}</b> · Modal: {rp(totalModal)} · Profit: {rp(total - totalModal)}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button className="btn btn-ghost" onClick={onCancel}>Batal</button>
          <button className="btn btn-ghost" onClick={hold}><PauseCircle size={14}/> Tahan</button>
          <button className="btn btn-primary" onClick={submit}>Catat Penjualan</button>
        </div>
      </div>
    </div>
  );
}
