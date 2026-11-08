import { createServer, type ServerResponse, type IncomingMessage } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Store } from '../../packages/storage/index.ts';
import type { Command } from '../../packages/contracts/index.ts';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const maxRequestBytes = 12 * 1024 * 1024;
const staticTypes: Record<string, string> = { '/': 'text/html; charset=utf-8', '/index.html': 'text/html; charset=utf-8', '/main.js': 'text/javascript; charset=utf-8', '/styles.css': 'text/css; charset=utf-8' };

function json(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxRequestBytes) throw Object.assign(new Error('Import is too large. Use a file of 8 MiB or less.'), { status: 413, code: 'request_too_large' });
    chunks.push(Buffer.from(chunk));
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw Object.assign(new Error('Request must contain valid JSON.'), { status: 400, code: 'invalid_json' }); }
}

export async function startServer(options: { dataDir?: string; port?: number; staticDir?: string } = {}) {
  const dataDir = options.dataDir ?? process.env.OPENCORRAL_DATA_DIR ?? path.join(appRoot, 'data');
  const staticDir = options.staticDir ?? path.join(appRoot, 'dist');
  const store = new Store(dataDir);
  const token = randomBytes(32).toString('hex');
  let port = options.port ?? 4317;
  const server = createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    try {
      const allowedHosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
      if (!allowedHosts.has(request.headers.host ?? '')) return json(response, 403, { error: 'Use the local station address.', code: 'invalid_host' });
      const origin = request.headers.origin;
      if (origin && ![...allowedHosts].some(host => origin === `http://${host}`)) return json(response, 403, { error: 'Cross-origin access is not allowed.', code: 'invalid_origin' });
      if (request.headers['sec-fetch-site'] === 'cross-site') return json(response, 403, { error: 'Cross-site access is not allowed.', code: 'invalid_origin' });
      const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`);
      const route = url.pathname;
      if (request.method === 'GET' && route === '/api/session') return json(response, 200, { token });
      if (request.method === 'GET' && route === '/api/state') return json(response, 200, store.state());
      if (request.method === 'GET' && route === '/api/export') {
        response.setHeader('Content-Disposition', `attachment; filename="opencorral-${new Date().toISOString().slice(0, 10)}.json"`);
        return json(response, 200, store.export());
      }
      if (request.method === 'GET' && route.startsWith('/api/artifacts/')) {
        const id = decodeURIComponent(route.slice('/api/artifacts/'.length));
        if (!/^[a-zA-Z0-9_-]{1,120}$/.test(id)) return json(response, 400, { error: 'Invalid artifact identifier.', code: 'invalid_id' });
        const { artifact, bytes } = store.getArtifact(id);
        response.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Length': bytes.length,
          'Content-Disposition': `attachment; filename="artifact-${id}"; filename*=UTF-8''${encodeURIComponent(artifact.name).replaceAll("'", '%27')}`,
        });
        response.end(bytes);
        return;
      }
      if (request.method === 'POST' && route === '/api/commands') {
        const supplied = request.headers['x-corral-token'];
        if (typeof supplied !== 'string' || Buffer.byteLength(supplied) !== Buffer.byteLength(token) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(token))) return json(response, 403, { error: 'Refresh the station to reconnect to the local service.', code: 'invalid_session' });
        if (!request.headers['content-type']?.startsWith('application/json')) return json(response, 415, { error: 'Use application/json.', code: 'invalid_content_type' });
        const command = await readJson(request);
        return json(response, 200, store.execute(command as Command));
      }
      if (request.method !== 'GET') return json(response, 405, { error: 'Method not allowed.', code: 'method_not_allowed' });
      if (Object.hasOwn(staticTypes, route)) {
        try {
          const content = await readFile(path.join(staticDir, route === '/' ? 'index.html' : route.slice(1)));
          response.writeHead(200, { 'Content-Type': staticTypes[route] });
          response.end(content);
        } catch {
          json(response, 503, { error: 'The station is not built. Run npm run build, then refresh.', code: 'station_not_built' });
        }
        return;
      }
      json(response, 404, { error: 'Not found.', code: 'not_found' });
    } catch (error) {
      const fault = error as { status?: number; code?: string; message?: string; blockers?: unknown };
      const status = typeof fault.status === 'number' && fault.status >= 400 && fault.status <= 599 ? fault.status : 500;
      if (status === 500) console.error(error);
      if (!response.headersSent) json(response, status, { error: status === 500 ? 'The local service could not complete this operation.' : fault.message, code: fault.code ?? 'internal_error', ...(fault.blockers ? { blockers: fault.blockers } : {}) });
      else response.end();
    }
  });
  server.requestTimeout = 30_000;
  server.headersTimeout = 15_000;
  try {
    await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  } catch (error) { store.close(); throw error; }
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Local server address was unavailable.');
  port = address.port;
  let closed = false;
  return {
    server, store, url: `http://127.0.0.1:${port}`,
    async close() {
      if (closed) return;
      closed = true;
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
      store.close();
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const options: { dataDir?: string; port?: number } = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--data-dir' && args[i + 1]) options.dataDir = path.resolve(args[++i]);
    else if (args[i] === '--port' && args[i + 1]) {
      const value = Number(args[++i]);
      if (!Number.isInteger(value) || value < 0 || value > 65535) throw new Error('Port must be an integer between 0 and 65535.');
      options.port = value;
    } else throw new Error(`Unknown or incomplete argument: ${args[i]}`);
  }
  const app = await startServer(options);
  console.log(`OpenCorral local station: ${app.url}`);
  console.log('Manual relay preview. Data is saved locally; no agents are dispatched.');
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, async () => { await app.close(); process.exit(0); });
}
