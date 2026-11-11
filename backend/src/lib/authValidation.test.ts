import assert from 'node:assert/strict';
import test from 'node:test';
import { assertUniqueUserIdentifier } from './authValidation.js';

test('rejects empty or whitespace identifier', async () => {
  const res = await assertUniqueUserIdentifier({
    identifier: '   ',
    entityType: 'SISWA'
  });
  assert.equal(res.ok, false);
  assert.match(res.error || '', /wajib diisi/i);
});

test('rejects invalid NISN format for SISWA (must be exactly 10 digits)', async () => {
  const shortNisn = await assertUniqueUserIdentifier({
    identifier: '12345',
    entityType: 'SISWA'
  });
  assert.equal(shortNisn.ok, false);
  assert.match(shortNisn.error || '', /10 digit/i);

  const nonNumericNisn = await assertUniqueUserIdentifier({
    identifier: '123456789A',
    entityType: 'SISWA'
  });
  assert.equal(nonNumericNisn.ok, false);
  assert.match(nonNumericNisn.error || '', /10 digit/i);
});

test('rejects invalid NIK format for ORTU (must be exactly 16 digits)', async () => {
  const shortNik = await assertUniqueUserIdentifier({
    identifier: '123456789012345',
    entityType: 'ORTU'
  });
  assert.equal(shortNik.ok, false);
  assert.match(shortNik.error || '', /16 digit/i);
});

test('rejects invalid NIP format for GURU (must be at least 8 alphanumeric characters)', async () => {
  const shortNip = await assertUniqueUserIdentifier({
    identifier: '123',
    entityType: 'GURU'
  });
  assert.equal(shortNip.ok, false);
  assert.match(shortNip.error || '', /minimal 8 karakter/i);
});
