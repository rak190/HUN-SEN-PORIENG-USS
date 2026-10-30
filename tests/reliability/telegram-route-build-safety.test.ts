import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('Telegram route imports do not initialize privileged clients when Supabase env is absent; request guards fail closed', () => {
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { NextRequest } from 'next/server.js';
    let networkCalls = 0;
    globalThis.fetch = async () => { networkCalls++; throw new Error('Unexpected external request'); };
    const routes = [
      './app/api/admin/broadcast-scores/batch/route.ts',
      './app/api/admin/broadcast-scores/route.ts',
      './app/api/telegram/webhook/route.ts',
    ];
    const handlers = [];
    for (const route of routes) {
      const module = await import(route);
      const handler = module.POST || module.default?.POST;
      assert.equal(typeof handler, 'function', route);
      handlers.push(handler);
    }
    assert.equal(networkCalls, 0, 'Build-time imports must not contact Supabase or Telegram');
    for (const handler of handlers.slice(0, 2)) {
      const response = await handler(new NextRequest('http://localhost/api/admin/broadcast-scores', { method: 'POST', body: JSON.stringify({ class_ids: ['forged'], class_id: 'forged', month: 'nov' }) }));
      assert.equal(response.status, 403, 'Unauthenticated caller must be rejected before constructing a service client');
    }
    const webhook = handlers[2];
    const request = (secret) => new NextRequest('http://localhost/api/telegram/webhook', { method: 'POST', headers: secret ? { 'x-telegram-bot-api-secret-token': secret } : {}, body: '{}' });
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    assert.equal((await webhook(request())).status, 401);
    process.env.TELEGRAM_WEBHOOK_SECRET = 'synthetic-test-secret';
    assert.equal((await webhook(request('wrong-secret'))).status, 401);
    const unconfigured = await webhook(request('synthetic-test-secret'));
    assert.equal(unconfigured.status, 503, 'Authorized webhook reports missing configuration at request time');
    assert.match((await unconfigured.json()).error, /SUPABASE_SERVICE_ROLE_KEY/);
    assert.equal(networkCalls, 0, 'No side effects when authentication/configuration fails');
    const admin = await import('./lib/supabase/admin.ts');
    assert.throws(() => (admin.createAdminClient || admin.default.createAdminClient)(), /must be defined/, 'Runtime admin factory must still reject missing credentials');
  `], {
    cwd: process.cwd(),
    env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_ANON_KEY: '', SUPABASE_SERVICE_ROLE_KEY: '', TELEGRAM_WEBHOOK_SECRET: '', PARENT_TELEGRAM_BOT_TOKEN: '' },
    encoding: 'utf8',
    timeout: 30000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});
