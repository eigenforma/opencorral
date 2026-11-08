import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { request as httpRequest } from 'node:http';
import { startServer } from '../apps/core/server.ts';

// fetch drops a caller-supplied Host header, so the host check needs a raw request.
const statusWithHost = (url: string, host: string) => new Promise<number>((resolve, reject) => {
  const req = httpRequest(url, { headers: { Host: host } }, response => { response.resume(); resolve(response.statusCode ?? 0); });
  req.on('error', reject);
  req.end();
});

test('loopback HTTP boundary, UI, commands, export and restart', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'opencorral-http-'));
  let app = await startServer({ dataDir: dir, port: 0 });
  try {
    const home = await fetch(app.url);
    assert.equal(home.status, 200);
    assert.match(await home.text(), /OpenCorral/);
    const { token } = await (await fetch(`${app.url}/api/session`)).json() as { token: string };
    const command = { commandId: randomUUID(), type: 'registerService', payload: { name: 'HTTP fixture', model: 'test only' } };
    const request = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(command) };
    assert.equal((await fetch(`${app.url}/api/commands`, request)).status, 403);
    assert.equal((await fetch(`${app.url}/api/commands`, { ...request, headers: { ...request.headers, 'X-Corral-Token': token, Origin: 'https://untrusted.example' } })).status, 403);
    assert.equal(await statusWithHost(`${app.url}/api/session`, 'untrusted.example'), 403);
    assert.equal((await fetch(`${app.url}/api/commands`, { ...request, headers: { ...request.headers, 'X-Corral-Token': token } })).status, 200);
    assert.equal((await fetch(`${app.url}/api/commands`, { ...request, headers: { ...request.headers, 'X-Corral-Token': token }, body: '{' })).status, 400);
    const state = await (await fetch(`${app.url}/api/state`)).json() as { services: unknown[] };
    assert.equal(state.services.length, 1);
    const exported = await fetch(`${app.url}/api/export`);
    assert.equal(exported.status, 200);
    assert.match(exported.headers.get('Content-Disposition') ?? '', /attachment/);
    assert.match(await exported.text(), /HTTP fixture/);
    assert.equal((await fetch(`${app.url}/package.json`)).status, 404);
    await app.close();
    app = await startServer({ dataDir: dir, port: 0 });
    const restarted = await (await fetch(`${app.url}/api/state`)).json() as { services: unknown[] };
    assert.equal(restarted.services.length, 1);
  } finally { await app.close(); rmSync(dir, { recursive: true, force: true }); }
});
