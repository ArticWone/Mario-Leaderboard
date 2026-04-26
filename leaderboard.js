const LEADERBOARD_POLL_MS = 15000;

const RANK_ICONS = ['1ST', '2ND', '3RD'];
const RANK_COLORS = ['rank-gold', 'rank-silver', 'rank-bronze', 'rank-standard', 'rank-standard'];

async function scoreRequest(path, options) {
    const response = await fetch(path, {
        ...(options || {}),
        headers: {
            ...(options && options.headers ? options.headers : {})
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Score request failed with status ${response.status}`);
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
}

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
        text.innerText = 'SCORES READY';
        return;
    }

    if (status === 'offline') {
        dot.className = 'status-dot status-offline';
        text.className = 'db-status-text db-status-text-offline';
        text.innerText = 'SCORES OFFLINE';
        return;
    }

    dot.className = 'status-dot status-connecting';
    text.className = 'db-status-text db-status-text-connecting';
    text.innerText = 'SCORES LOADING...';
}

window.fetchScores = async function() {
    updateStatus('connecting');

    try {
        const data = await scoreRequest('/api/scores');

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
        await scoreRequest('/api/scores', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: cleanName,
                score: cleanScore
            })
        });

        window.fetchScores();
        return { ok: true };
    } catch (err) {
        console.error('Error submitting score:', err.message || err);
        if (String(err.message || '').includes('invalid_score')) {
            return { ok: false, reason: 'invalid_score' };
        }
        return { ok: false, reason: 'network_error' };
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.fetchScores();
    window.setInterval(window.fetchScores, LEADERBOARD_POLL_MS);
});
