import assert from 'node:assert/strict';
import test from 'node:test';
import bcrypt from 'bcryptjs';
import {
  parseAdminCredentials,
  syncAdminAccount,
  type AdminUserClient
} from './bootstrapAdmin.js';

function createMockClient(initialUser: { id: string; email: string; role: string; password: string } | null = null) {
  let stored = initialUser ? { ...initialUser } : null;

  const client: AdminUserClient = {
    user: {
      async findUnique({ where }) {
        if (stored && stored.email === where.email) {
          return { id: stored.id, role: stored.role };
        }
        return null;
      },
      async create({ data }) {
        stored = { id: 'admin-1', email: data.email, role: data.role, password: data.password };
        return { id: stored.id, email: stored.email };
      },
      async update({ where, data }) {
        assert.ok(stored && stored.id === where.id);
        stored = { ...stored, password: data.password, role: data.role };
        return { id: stored.id, email: stored.email };
      }
    }
  };

  return {
    client,
    getStored: () => stored
  };
}

test('parseAdminCredentials normalizes email and rejects short passwords', () => {
  assert.deepEqual(
    parseAdminCredentials({ ADMIN_EMAIL: ' Admin@Alhidayah.sch.id ', ADMIN_PASSWORD: 'AdminAlhidayah2026!#' }),
    { email: 'admin@alhidayah.sch.id', password: 'AdminAlhidayah2026!#' }
  );
  assert.equal(parseAdminCredentials({ ADMIN_EMAIL: 'admin@alhidayah.sch.id', ADMIN_PASSWORD: 'short' }), null);
  assert.equal(parseAdminCredentials({ ADMIN_EMAIL: 'not-an-email', ADMIN_PASSWORD: 'AdminAlhidayah2026!#' }), null);
});

test('syncAdminAccount skips silently when env vars are missing in non-strict mode', async () => {
  const { client } = createMockClient();
  const result = await syncAdminAccount({ env: {}, strict: false, client });
  assert.deepEqual(result, { status: 'skipped', reason: 'missing_env' });
});

test('syncAdminAccount throws in strict mode when env vars are invalid or missing', async () => {
  const { client } = createMockClient();
  await assert.rejects(
    () => syncAdminAccount({ env: { ADMIN_EMAIL: 'admin@alhidayah.sch.id', ADMIN_PASSWORD: 'short' }, strict: true, client }),
    /minimal 12 karakter/i
  );
});

test('syncAdminAccount creates a new ADMIN account with hashed password when missing', async () => {
  const { client, getStored } = createMockClient();
  const result = await syncAdminAccount({
    env: { ADMIN_EMAIL: 'Admin@Alhidayah.sch.id', ADMIN_PASSWORD: 'AdminAlhidayah2026!#' },
    client
  });

  assert.deepEqual(result, { status: 'created', email: 'admin@alhidayah.sch.id' });
  const user = getStored();
  assert.ok(user);
  assert.equal(user.role, 'ADMIN');
  assert.equal(await bcrypt.compare('AdminAlhidayah2026!#', user.password), true);
});

test('syncAdminAccount preserves existing password unless forceUpdate is enabled', async () => {
  const oldHash = await bcrypt.hash('ExistingPass123!', 4);
  const { client, getStored } = createMockClient({
    id: 'admin-1',
    email: 'admin@alhidayah.sch.id',
    role: 'ADMIN',
    password: oldHash
  });

  const keepResult = await syncAdminAccount({
    env: { ADMIN_EMAIL: 'admin@alhidayah.sch.id', ADMIN_PASSWORD: 'AdminAlhidayah2026!#' },
    forceUpdate: false,
    client
  });
  assert.deepEqual(keepResult, { status: 'exists', email: 'admin@alhidayah.sch.id' });
  assert.equal(getStored()?.password, oldHash);

  const updateResult = await syncAdminAccount({
    env: { ADMIN_EMAIL: 'admin@alhidayah.sch.id', ADMIN_PASSWORD: 'AdminAlhidayah2026!#' },
    forceUpdate: true,
    client
  });
  assert.deepEqual(updateResult, { status: 'updated', email: 'admin@alhidayah.sch.id' });
  assert.equal(await bcrypt.compare('AdminAlhidayah2026!#', getStored()!.password), true);
});
