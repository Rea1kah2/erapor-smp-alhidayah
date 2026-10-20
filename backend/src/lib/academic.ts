export const isAcademicYearLabel = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}\/\d{4}$/.test(value) &&
  Number(value.slice(5)) === Number(value.slice(0, 4)) + 1;

export function buildAcademicYearPlan(
  gradeYearLabels: string[],
  noteYearLabels: string[],
  existingYearLabels: string[] = [],
  existingActiveYear?: string,
  initialYear = '2025/2026'
) {
  if (existingActiveYear && !isAcademicYearLabel(existingActiveYear)) {
    throw new Error('Tahun ajaran aktif tersimpan dengan format tidak valid.');
  }

  const labels = [...new Set([
    ...gradeYearLabels,
    ...noteYearLabels,
    ...existingYearLabels,
    ...(existingActiveYear ? [existingActiveYear] : [])
  ])].filter(isAcademicYearLabel).sort();

  if (labels.length === 0) {
    if (!isAcademicYearLabel(initialYear)) {
      throw new Error('INITIAL_ACADEMIC_YEAR harus berformat YYYY/YYYY dan berurutan.');
    }
    labels.push(initialYear);
  }

  const latestExistingYear = [...existingYearLabels].filter(isAcademicYearLabel).sort().at(-1);
  const activeYear = existingActiveYear || latestExistingYear || labels[labels.length - 1];
  if (!activeYear) throw new Error('Tahun ajaran aktif tidak dapat ditentukan.');
  if (!labels.includes(activeYear)) labels.push(activeYear);
  return { labels, activeYear };
}
