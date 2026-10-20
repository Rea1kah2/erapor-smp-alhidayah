import assert from 'node:assert/strict';
import test from 'node:test';
import { isDatabaseUnavailableError } from './database.js';

test('classifies Prisma connectivity errors as database unavailable', () => {
  for (const code of ['P1000', 'P1001', 'P1002', 'P1017']) {
    assert.equal(isDatabaseUnavailableError({ code }), true);
  }
});

test('does not classify validation or unknown errors as database unavailable', () => {
  assert.equal(isDatabaseUnavailableError({ code: 'P2002' }), false);
  assert.equal(isDatabaseUnavailableError(new Error('network error')), false);
  assert.equal(isDatabaseUnavailableError(null), false);
});
