import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAcademicYearPlan, isAcademicYearLabel } from './academic.js';
import { hitungNilaiAkhir } from './grade.js';

test('accepts consecutive academic years only', () => {
  assert.equal(isAcademicYearLabel('2025/2026'), true);
  assert.equal(isAcademicYearLabel('2025/2025'), false);
  assert.equal(isAcademicYearLabel('2025-2026'), false);
  assert.equal(isAcademicYearLabel(null), false);
});

test('keeps an existing active year when there are no grade or report rows', () => {
  assert.deepEqual(buildAcademicYearPlan([], [], [], '2026/2027'), {
    labels: ['2026/2027'],
    activeYear: '2026/2027'
  });
});

test('keeps all existing years and selects the latest when none is active', () => {
  assert.deepEqual(buildAcademicYearPlan([], [], ['2024/2025', '2025/2026']), {
    labels: ['2024/2025', '2025/2026'],
    activeYear: '2025/2026'
  });
});

test('calculates weighted score and grade when all components exist', () => {
  assert.deepEqual(hitungNilaiAkhir(80, 75, 85), {
    akhir: 80,
    predikat: 'B',
    status: 'Tuntas',
    keterangan: 'Baik'
  });
});

test('renormalizes weights when only some components exist', () => {
  assert.equal(hitungNilaiAkhir(null, 80, null).akhir, 80);
});

test('does not mark missing grades as assessed', () => {
  assert.deepEqual(hitungNilaiAkhir(null, undefined, null), {
    akhir: 0,
    predikat: '-',
    status: 'Belum Ada Nilai',
    keterangan: '-'
  });
});
