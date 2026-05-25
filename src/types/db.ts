export interface Settings {
  id: string;
  nama: string;
  pemilik?: string;
  alamat?: string;
  hp?: string;
  lokasi?: string;
}

export interface ProfitTotals {
  id: string;
  total_profit: number;
  total_zakat: number;
  total_gaji: number;
  total_modal: number;
  modal_talangan: number;
  last_closing_date?: string | null;
}

export interface OrderItem {
  nama: string;
  size?: string;
  color?: string;
  qty: number;
  harga: number;
}

export type OrderStatus = "Rencana" | "Dipesan" | "Dikirim" | "Diterima";
export type SumberModal = "Modal Putar" | "Modal Talangan" | "Gabungan";

export interface Order {
  id: string;
  platform: string;
  tanggal: string;
  tanggal_bayar?: string | null;
  resi?: string;
  toko?: string;
  link?: string;
  catatan?: string;
  ongkir: number;
  harga_avg: number;
  total_biaya: number;
  status: OrderStatus;
  tanggal_terima?: string | null;
  items: OrderItem[];
  sumber_modal?: SumberModal | null;
  modal_putar_used: number;
  modal_talangan_used: number;
  sim_modal_putar?: number;
  sim_modal_talangan?: number;
  sim_sumber?: SumberModal | null;
}

export interface Variant {
  vid: string;
  size: string;
  color: string;
  stok: number;
  hargaBeli: number;
  hargaJual: number;
  terakhirMasuk?: string;
}

export interface Inventory {
  id: string;
  nama: string;
  variants: Variant[];
  stok: number;
  harga_beli: number;
  harga_jual: number;
  terakhir_masuk?: string;
}

export interface SaleItem {
  invId: string;
  vid: string;
  nama: string;
  qty: number;
  hargaJual: number;
  hargaModal: number;
}

export interface CicilRiwayat {
  tgl: string;
  nominal: number;
  ket?: string;
}

export interface Sale {
  id: string;
  tanggal: string;
  channel: string;
  pembeli: string;
  items: SaleItem[];
  total_jual: number;
  total_modal: number;
  cara_bayar: "lunas" | "cicilan";
  dp?: number;
  tenor?: number;
  cicil_bayar?: number;
  cicil_riwayat?: CicilRiwayat[];
}

export interface Closing {
  id: string;
  tanggal: string;
  periode_mulai: string;
  periode_selesai: string;
  jumlah_trx: number;
  total_jual: number;
  total_pemasukan: number;
  total_modal: number;
  laba_kotor: number;
  piutang_cicilan: number;
  total_opsi: number;
  laba: number;
  zakat: number;
  gaji: number;
  modal: number;
  opsi_items: { nama: string; nominal: number }[];
}

export interface Backorder {
  id: string;
  tanggal: string;
  nama: string;
  qty: number;
  pembeli?: string;
  channel?: string;
  catatan?: string;
  status: "Menunggu" | "Dipenuhi";
  tanggal_dipenuhi?: string | null;
}

export interface OperationalCost {
  id: string;
  tanggal: string;
  nama: string;
  nominal: number;
  catatan?: string;
  sumber_modal: "Laba Closing" | "Modal Putar" | "Modal Talangan";
  modal_putar_used: number;
  modal_talangan_used: number;
}

export interface Supplier {
  id: string;
  nama: string;
  platform: "Shopee" | "TikTok" | "Lainnya";
  link?: string;
  rating: number;
  bagus?: string;
  jelek?: string;
  auto_added: boolean;
}

export interface Hold {
  id: string;
  tanggal: string;
  channel: string;
  pembeli: string;
  items: SaleItem[];
  nostok: { nama: string; qty: number }[];
  total_jual: number;
  cara_bayar: "lunas" | "cicilan";
  dp?: number;
  tenor?: number;
}
