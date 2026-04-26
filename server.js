const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { URL } = require('node:url');

const PORT = Number(process.env.PORT || 80);
const PUBLIC_DIR = path.resolve(process.env.PUBLIC_DIR || '/usr/share/mario/html');
const SCORE_FILE = path.resolve(process.env.SCORE_FILE || '/data/scores.json');
const MAX_SCORES = 10;

const MIME_TYPES = {
    '.css': 'text/css; charset=utf-8',
    '.gif': 'image/gif',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.js': 'text/javascript; charset=utf-8',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.json': 'application/json; charset=utf-8',
    '.mid': 'audio/midi',
    '.mp3': 'audio/mpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav'
};

const SECURITY_HEADERS = {
    'Content-Security-Policy': "default-src 'self'; script-src 'self' https://static.cloudflareinsights.com; style-src 'self'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; media-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=()',
    'Strict-Transport-Security': 'max-age=2592000'
};

let writeQueue = Promise.resolve();

function send(res, status, body, headers = {}) {
    res.writeHead(status, {
        ...SECURITY_HEADERS,
        ...headers
    });
    res.end(body);
}

function sendJson(res, status, data) {
    send(res, status, JSON.stringify(data), {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
    });
}

async function readBody(req) {
    const chunks = [];
    let size = 0;

    for await (const chunk of req) {
        size += chunk.length;
        if (size > 1024) {
            throw new Error('body_too_large');
        }
        chunks.push(chunk);
    }

    return Buffer.concat(chunks).toString('utf8');
}

function compareScores(a, b) {
    if (b.score !== a.score) return b.score - a.score;
    return String(a.created_at).localeCompare(String(b.created_at));
}

function normalizeName(name) {
    return String(name || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 6) || 'PLAYER';
}

function normalizeScores(rawScores) {
    if (!Array.isArray(rawScores)) return [];

    return rawScores
        .map((row) => ({
            name: normalizeName(row.name),
            score: Number(row.score),
            created_at: typeof row.created_at === 'string' ? row.created_at : new Date().toISOString()
        }))
        .filter((row) => Number.isInteger(row.score) && row.score >= 0 && row.score <= 9999999)
        .sort(compareScores)
        .slice(0, MAX_SCORES);
}

async function ensureScoreFile() {
    await fs.mkdir(path.dirname(SCORE_FILE), { recursive: true });

    try {
        await fs.access(SCORE_FILE);
    } catch {
        await fs.writeFile(SCORE_FILE, '[]\n', 'utf8');
    }
}

async function loadScores() {
    await ensureScoreFile();
    const text = await fs.readFile(SCORE_FILE, 'utf8');

    try {
        return normalizeScores(JSON.parse(text));
    } catch {
        return [];
    }
}

async function saveScores(scores) {
    await ensureScoreFile();
    const normalized = normalizeScores(scores);
    const tempFile = `${SCORE_FILE}.tmp`;
    await fs.writeFile(tempFile, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
    await fs.rename(tempFile, SCORE_FILE);
    return normalized;
}

async function addScore(name, score) {
    writeQueue = writeQueue.then(async () => {
        const currentScores = await loadScores();
        currentScores.push({
            name,
            score,
            created_at: new Date().toISOString()
        });
        return saveScores(currentScores);
    });

    return writeQueue;
}

async function handleScores(req, res) {
    if (req.method === 'GET') {
        sendJson(res, 200, await loadScores());
        return;
    }

    if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'method_not_allowed' });
        return;
    }

    let payload;
    try {
        payload = JSON.parse(await readBody(req));
    } catch {
        sendJson(res, 400, { error: 'invalid_json' });
        return;
    }

    const name = normalizeName(payload.name);
    const score = Number(payload.score);

    if (!Number.isInteger(score) || score < 0 || score > 9999999) {
        sendJson(res, 400, { error: 'invalid_score' });
        return;
    }

    const scores = await addScore(name, score);
    sendJson(res, 201, { ok: true, scores });
}

async function serveStatic(req, res, pathname) {
    const relativePath = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1));
    const filePath = path.resolve(PUBLIC_DIR, relativePath);
    const allowedRoot = `${PUBLIC_DIR}${path.sep}`;

    if (!filePath.startsWith(allowedRoot)) {
        send(res, 404, 'Not Found\n', { 'Content-Type': 'text/plain; charset=utf-8' });
        return;
    }

    let stat;
    try {
        stat = await fs.stat(filePath);
    } catch {
        send(res, 404, 'Not Found\n', { 'Content-Type': 'text/plain; charset=utf-8' });
        return;
    }

    if (!stat.isFile()) {
        send(res, 404, 'Not Found\n', { 'Content-Type': 'text/plain; charset=utf-8' });
        return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const immutable = /\.(?:png|jpg|jpeg|gif|svg|ico|wav|mp3|mid)$/i.test(filePath);
    const body = await fs.readFile(filePath);

    send(res, 200, body, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Cache-Control': immutable ? 'public, max-age=604800, immutable' : 'no-cache'
    });
}

const server = http.createServer(async (req, res) => {
    try {
        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

        if (url.pathname === '/healthz') {
            send(res, 200, 'ok\n', {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-store'
            });
            return;
        }

        if (url.pathname === '/api/scores') {
            await handleScores(req, res);
            return;
        }

        await serveStatic(req, res, url.pathname);
    } catch (err) {
        console.error(err);
        sendJson(res, 500, { error: 'server_error' });
    }
});

ensureScoreFile()
    .then(() => {
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`Mario Leaderboard listening on ${PORT}`);
            console.log(`Score file: ${SCORE_FILE}`);
        });
    })
    .catch((err) => {
        console.error('Unable to initialize score file:', err);
        process.exit(1);
    });
