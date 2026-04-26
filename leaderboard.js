// Supabase Configuration
const SUPABASE_URL = 'https://ltmdzeyclsmnqpooerpz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0bWR6ZXljbHNtbnFwb29lcnB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4OTQyMDYsImV4cCI6MjA5MjQ3MDIwNn0.Tg8LoIIZxQUYg-6L6Kfq6TQEtul9FkA7kt3A5QY6NGk';
const SUPABASE_HEADERS = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`
};
const LEADERBOARD_POLL_MS = 15000;

async function supabaseRequest(path, options) {
    const response = await fetch(`${SUPABASE_URL}${path}`, {
        ...options,
        headers: {
            ...SUPABASE_HEADERS,
            ...(options && options.headers ? options.headers : {})
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Supabase request failed with status ${response.status}`);
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
}

const RANK_ICONS = ['1ST', '2ND', '3RD'];
const RANK_COLORS = ['rank-gold', 'rank-silver', 'rank-bronze', 'rank-standard', 'rank-standard'];

function pad(n, len) {
    return String(n).padStart(len, '0');
}

function updateStatus(status) {
    const dot = document.getElementById('db-status-dot');
    const text = document.getElementById('db-status-text');
    if (!dot || !text) return;

    if (status === 'online') {
        dot.className = 'status-dot status-online';
        text.className = 'db-status-text db-status-text-online';
        text.innerText = 'DB ONLINE';
        return;
    }

    if (status === 'offline') {
        dot.className = 'status-dot status-offline';
        text.className = 'db-status-text db-status-text-offline';
        text.innerText = 'DB OFFLINE';
        return;
    }

    dot.className = 'status-dot status-connecting';
    text.className = 'db-status-text db-status-text-connecting';
    text.innerText = 'DB CONNECTING...';
}

window.fetchScores = async function() {
    updateStatus('connecting');

    try {
        const data = await supabaseRequest('/rest/v1/leaderboard?select=*&order=score.desc,created_at.asc&limit=8');

        updateStatus('online');
        if (data && data.length > 0) {
            renderScores(data);
        } else {
            renderScores([], 'NO SCORES YET');
        }
    } catch (err) {
        console.error('Error fetching scores:', err);
        updateStatus('offline');
        renderScores([], 'LEADERBOARD OFFLINE');
    }
};

function renderScores(scores, statusMessage) {
    const rowsContainer = document.getElementById('leaderboard-rows');
    if (!rowsContainer) return;

    rowsContainer.replaceChildren();

    if (statusMessage) {
        const msgEl = document.createElement('div');
        msgEl.className = 'leaderboard-message';
        msgEl.innerText = statusMessage;
        rowsContainer.appendChild(msgEl);
        return;
    }

    const header = document.createElement('div');
    header.className = 'lb-header';

    const rankHeader = document.createElement('span');
    rankHeader.className = 'lb-head-cell';
    rankHeader.innerText = '#';

    const nameHeader = document.createElement('span');
    nameHeader.className = 'lb-head-cell';
    nameHeader.innerText = 'NAME';

    const scoreHeader = document.createElement('span');
    scoreHeader.className = 'lb-head-cell lb-score-cell';
    scoreHeader.innerText = 'SCORE';

    header.append(rankHeader, nameHeader, scoreHeader);
    rowsContainer.appendChild(header);

    scores.forEach((row, i) => {
        const colorClass = RANK_COLORS[i] || 'rank-standard';
        const rankDisplay = i < 3 ? RANK_ICONS[i] : (i + 1);
        const safeName = String(row.name || 'ANON').toUpperCase().slice(0, 6);
        const safeScore = pad(row.score || 0, 7);

        const rowEl = document.createElement('div');
        rowEl.className = 'lb-row';

        const rankCell = document.createElement('span');
        rankCell.className = `lb-cell ${colorClass}`;
        rankCell.innerText = rankDisplay;

        const nameCell = document.createElement('span');
        nameCell.className = `lb-cell ${colorClass}`;
        nameCell.innerText = safeName;

        const scoreCell = document.createElement('span');
        scoreCell.className = `lb-cell lb-score-cell ${colorClass}`;
        scoreCell.innerText = safeScore;

        rowEl.append(rankCell, nameCell, scoreCell);
        rowsContainer.appendChild(rowEl);
    });
}

window.submitScore = async function(name, score) {
    const cleanName = String(name || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 6) || 'PLAYER';

    const cleanScore = Number(score);

    if (!Number.isInteger(cleanScore) || cleanScore < 0 || cleanScore > 9999999) {
        console.error('Invalid score:', score);
        return { ok: false, reason: 'invalid_score' };
    }

    try {
        await supabaseRequest('/rest/v1/rpc/submit_score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                p_name: cleanName,
                p_score: cleanScore
            })
        });

        window.fetchScores();
        return { ok: true };
    } catch (err) {
        console.error('Error submitting score:', err.message || err);
        if (String(err.message || '').includes('Invalid score')) {
            return { ok: false, reason: 'invalid_score' };
        }
        return { ok: false, reason: 'network_error' };
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.fetchScores();
    window.setInterval(window.fetchScores, LEADERBOARD_POLL_MS);
});
