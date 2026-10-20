export interface GradeSummary {
  akhir: number;
  predikat: string;
  status: string;
  keterangan: string;
}

export function hitungNilaiAkhir(
  tugas?: number | null,
  uts?: number | null,
  uas?: number | null,
  kkm = 75
): GradeSummary {
  const components = [
    { score: tugas, weight: 0.4 },
    { score: uts, weight: 0.3 },
    { score: uas, weight: 0.3 }
  ].filter((component): component is { score: number; weight: number } =>
    component.score !== undefined && component.score !== null
  );

  if (components.length === 0) {
    return { akhir: 0, predikat: '-', status: 'Belum Ada Nilai', keterangan: '-' };
  }

  const totalWeight = components.reduce((sum, component) => sum + component.weight, 0);
  const weightedTotal = components.reduce((sum, component) => sum + component.score * component.weight, 0);
  const akhir = Math.round((weightedTotal / totalWeight) * 10) / 10;

  if (akhir >= 90) return { akhir, predikat: 'A', status: 'Tuntas', keterangan: 'Sangat Baik' };
  if (akhir >= 80) return { akhir, predikat: 'B', status: 'Tuntas', keterangan: 'Baik' };
  if (akhir >= kkm) return { akhir, predikat: 'C', status: 'Tuntas', keterangan: 'Cukup (Tuntas KKM)' };
  return { akhir, predikat: 'D', status: 'Belum Tuntas', keterangan: 'Kurang (Perlu Perbaikan)' };
}
