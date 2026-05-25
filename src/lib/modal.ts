import type { ProfitTotals, SumberModal } from "@/types/db";

/**
 * Hitung sumber modal saat bayar pesanan.
 * Mengembalikan: { sumber, modalPutarUsed, modalTalanganUsed, nextProfitPatch }
 */
export function computeSumberModal(
  totalBiaya: number,
  profit: ProfitTotals,
): {
  sumber: SumberModal;
  modalPutarUsed: number;
  modalTalanganUsed: number;
  nextProfitPatch: Partial<ProfitTotals>;
} {
  const modalPutar = profit.total_modal || 0;
  let sumber: SumberModal;
  let modalPutarUsed = 0;
  let modalTalanganUsed = 0;

  if (modalPutar >= totalBiaya) {
    sumber = "Modal Putar";
    modalPutarUsed = totalBiaya;
  } else if (modalPutar > 0) {
    sumber = "Gabungan";
    modalPutarUsed = modalPutar;
    modalTalanganUsed = totalBiaya - modalPutar;
  } else {
    sumber = "Modal Talangan";
    modalTalanganUsed = totalBiaya;
  }

  return {
    sumber,
    modalPutarUsed,
    modalTalanganUsed,
    nextProfitPatch: {
      total_modal: modalPutar - modalPutarUsed,
      modal_talangan: (profit.modal_talangan || 0) - modalTalanganUsed,
    },
  };
}

/**
 * Simulasi untuk status Rencana — tidak mengubah profit
 */
export function simulateSumberModal(
  totalBiaya: number,
  profit: ProfitTotals,
): { sumber: SumberModal; modalPutar: number; modalTalangan: number } {
  const r = computeSumberModal(totalBiaya, profit);
  return {
    sumber: r.sumber,
    modalPutar: r.modalPutarUsed,
    modalTalangan: r.modalTalanganUsed,
  };
}
