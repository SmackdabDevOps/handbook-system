#!/usr/bin/env ts-node
/**
 * Validation Runner Server - Config-Driven
 *
 * HTTP server for running validation suites with SSE progress updates
 * - Configurable via handbook.config.json
 * - Supports streaming logs and status updates
 * - Handles single validator or full suite runs
 *
 * Usage: npx ts-node runner.ts
 */

import * as http from 'http';
import * as path from 'path';
import { spawn } from 'child_process';
import { loadConfig, findProjectRoot } from './config/loader';

// Default port if not configured
const DEFAULT_PORT = 8810;

type Client = http.ServerResponse;

interface RunnerState {
  running: boolean;
  startedAt?: string;
  finishedAt?: string;
  exitCode?: number;
  pid?: number;
  failures?: string[];
}

const clients = new Set<Client>();
let currentProc: ReturnType<typeof spawn> | null = null;
let state: RunnerState = { running: false };

function cors(res: http.ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendSse(client: Client, event: string, data: any) {
  client.write(`event: ${event}\n`);
  client.write(`data: ${JSON.stringify(data)}\n\n`);
}

function broadcast(event: string, data: any) {
  for (const client of clients) {
    sendSse(client, event, data);
  }
}

function handleStatus(res: http.ServerResponse) {
  cors(res);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(state));
}

function startRun(req: http.IncomingMessage, res: http.ServerResponse, projectRoot: string, config: any) {
  cors(res);
  if (state.running) {
    res.writeHead(409, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Validation already running' }));
    return;
  }

  const url = new URL(req.url || '', 'http://localhost');
  const validator = url.searchParams.get('validator');

  // Use configured validation command
  const validateCommand = config.commands['validate:gates'] || 'npm run validate:all';
  const cmdParts = validateCommand.split(' ');
  const cmd = validator
    ? [...cmdParts, '--', `--validator=${validator}`]
    : cmdParts;

  const env = { ...process.env };
  const proc = spawn(cmd[0], cmd.slice(1), { cwd: projectRoot, env });
  currentProc = proc;
  state = { running: true, startedAt: new Date().toISOString(), pid: proc.pid };
  broadcast('status', state);

  const handleChunk = (buf: Buffer) => {
    const text = buf.toString();
    text.split(/\n/).forEach((line) => {
      if (!line) return;
      if (line.startsWith('RUNNER_EVENT')) {
        const payload = line.replace('RUNNER_EVENT', '').trim();
        try {
          const evt = JSON.parse(payload);
          broadcast('event', evt);
        } catch {
          // fall through
        }
      }
    });
    broadcast('log', text);
  };

  proc.stdout.on('data', handleChunk);
  proc.stderr.on('data', handleChunk);

  proc.on('close', (code) => {
    state = {
      running: false,
      startedAt: state.startedAt,
      finishedAt: new Date().toISOString(),
      exitCode: code ?? 1
    };
    broadcast('status', state);
    currentProc = null;
  });

  res.writeHead(202, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ message: 'Started validation', pid: proc.pid }));
}

function handleEvents(req: http.IncomingMessage, res: http.ServerResponse) {
  cors(res);
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  sendSse(res, 'status', state);
  clients.add(res);
  req.on('close', () => {
    clients.delete(res);
  });
}

function createRouter(projectRoot: string, config: any) {
  return (req: http.IncomingMessage, res: http.ServerResponse) => {
    const fullUrl = req.url || '';
    const url = fullUrl.split('?')[0]; // Strip query string for route matching

    if (req.method === 'OPTIONS') {
      cors(res);
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.method === 'GET' && url === '/health') {
      cors(res);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, project: config.projectName }));
      return;
    }

    if (req.method === 'GET' && url === '/api/validate/status') {
      return handleStatus(res);
    }

    if (req.method === 'POST' && url === '/api/validate/run') {
      return startRun(req, res, projectRoot, config);
    }

    if (req.method === 'GET' && url === '/api/validate/events') {
      return handleEvents(req, res);
    }

    cors(res);
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  };
}

function startServer() {
  try {
    const projectRoot = findProjectRoot();
    const config = loadConfig(projectRoot);

    // Get port from environment or config (could be added to schema)
    const port = process.env.VALIDATION_RUNNER_PORT
      ? parseInt(process.env.VALIDATION_RUNNER_PORT, 10)
      : DEFAULT_PORT;

    const router = createRouter(projectRoot, config);
    const server = http.createServer(router);

    server.listen(port, () => {
      console.log(`✅ Validation runner listening on http://127.0.0.1:${port}`);
      console.log(`   Project: ${config.projectName}`);
      console.log(`   Stack: ${config.stackProfile}`);
    });
  } catch (error: any) {
    console.error('❌ Failed to start validation runner:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}
