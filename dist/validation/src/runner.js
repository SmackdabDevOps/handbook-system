#!/usr/bin/env ts-node
"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const http = __importStar(require("http"));
const child_process_1 = require("child_process");
const loader_1 = require("./config/loader");
// Default port if not configured
const DEFAULT_PORT = 8810;
const clients = new Set();
let currentProc = null;
let state = { running: false };
function cors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
function sendSse(client, event, data) {
    client.write(`event: ${event}\n`);
    client.write(`data: ${JSON.stringify(data)}\n\n`);
}
function broadcast(event, data) {
    for (const client of clients) {
        sendSse(client, event, data);
    }
}
function handleStatus(res) {
    cors(res);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(state));
}
function startRun(req, res, projectRoot, config) {
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
    const proc = (0, child_process_1.spawn)(cmd[0], cmd.slice(1), { cwd: projectRoot, env });
    currentProc = proc;
    state = { running: true, startedAt: new Date().toISOString(), pid: proc.pid };
    broadcast('status', state);
    const handleChunk = (buf) => {
        const text = buf.toString();
        text.split(/\n/).forEach((line) => {
            if (!line)
                return;
            if (line.startsWith('RUNNER_EVENT')) {
                const payload = line.replace('RUNNER_EVENT', '').trim();
                try {
                    const evt = JSON.parse(payload);
                    broadcast('event', evt);
                }
                catch {
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
function handleEvents(req, res) {
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
function createRouter(projectRoot, config) {
    return (req, res) => {
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
        const projectRoot = (0, loader_1.findProjectRoot)();
        const config = (0, loader_1.loadConfig)(projectRoot);
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
    }
    catch (error) {
        console.error('❌ Failed to start validation runner:', error.message);
        process.exit(1);
    }
}
if (require.main === module) {
    startServer();
}
