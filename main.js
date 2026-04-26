/**
 * Main Initialization for Super Mario HTML5 (Vanilla JS)
 */

var Mario = window.Mario;
var Enjine = window.Enjine;

const hudState = {
    intervalId: null,
    currentState: 'boot',
    activeLevelState: null,
    statusOverride: null
};

const audioState = {
    enabled: true,
    volume: 0.35
};

function pad(value, length) {
    return String(value).padStart(length, '0');
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) {
        el.innerText = value;
    }
}

function setGameStatus(label) {
    const pill = document.getElementById('game-status-pill');
    if (!pill) return;
    pill.innerText = label;
}

function setTemporaryStatus(label, durationMs) {
    hudState.statusOverride = label;
    setGameStatus(label);

    window.setTimeout(function() {
        if (hudState.statusOverride === label) {
            hudState.statusOverride = null;
        }
    }, durationMs);
}

function clearScoreSubmission() {
    const container = document.getElementById('submit-container');
    if (container) {
        container.replaceChildren();
    }
}

function updateHud() {
    const marioCharacter = window.Mario && window.Mario.MarioCharacter;
    const activeLevelState = hudState.activeLevelState;
    const rawScore = window.Mario && Number.isFinite(window.Mario.Score) ? window.Mario.Score : 0;
    const coins = marioCharacter && Number.isFinite(marioCharacter.Coins) ? marioCharacter.Coins : 0;
    const world = marioCharacter && marioCharacter.LevelString ? marioCharacter.LevelString : '1-1';
    const timeLeft = activeLevelState && Number.isFinite(activeLevelState.TimeLeft)
        ? Math.max(0, activeLevelState.TimeLeft | 0)
        : 200;

    setText('live-score-value', pad(rawScore, 8));
    setText('live-coins-value', pad(coins, 2));
    setText('live-world-value', world);
    setText('live-time-value', pad(timeLeft, 3));

    if (hudState.statusOverride) {
        setGameStatus(hudState.statusOverride);
        return;
    }

    if (hudState.currentState === 'title') {
        setGameStatus('READY');
        clearScoreSubmission();
    } else if (hudState.currentState === 'map') {
        setGameStatus('WORLD MAP');
    } else if (hudState.currentState === 'level') {
        setGameStatus('IN LEVEL');
        clearScoreSubmission();
    } else if (hudState.currentState === 'lose') {
        setGameStatus('GAME OVER');
    } else if (hudState.currentState === 'win') {
        setGameStatus('COURSE CLEAR');
    }
}

function startHudLoop() {
    if (hudState.intervalId !== null) return;
    updateHud();
    hudState.intervalId = window.setInterval(updateHud, 100);
}

function setAudioVolume(value) {
    const nextVolume = Math.max(0, Math.min(1, Number(value)));
    audioState.volume = Number.isFinite(nextVolume) ? nextVolume : 0.35;
    syncAudioChannels();
}

function syncAudioChannels() {
    if (window.Enjine && Enjine.Resources && Enjine.Resources.Sounds) {
        Object.keys(Enjine.Resources.Sounds).forEach(function(name) {
            Enjine.Resources.Sounds[name].forEach(function(channel) {
                if (channel && typeof channel.volume === 'number') {
                    channel.volume = audioState.enabled ? audioState.volume : 0;
                    channel.muted = !audioState.enabled;
                }
            });
        });
    }
}

function unlockAudioChannels() {
    if (!window.Enjine || !Enjine.Resources || !Enjine.Resources.Sounds) return;

    Object.keys(Enjine.Resources.Sounds).forEach(function(name) {
        Enjine.Resources.Sounds[name].forEach(function(channel) {
            if (!channel) return;
            channel.muted = true;
            channel.volume = audioState.volume;

            const playAttempt = channel.play();
            if (playAttempt && typeof playAttempt.then === 'function') {
                playAttempt
                    .then(function() {
                        channel.pause();
                        channel.currentTime = 0;
                        channel.muted = !audioState.enabled;
                    })
                    .catch(function() {});
            } else {
                channel.pause();
                channel.currentTime = 0;
                channel.muted = !audioState.enabled;
            }
        });
    });
}

function installAudioVolumeControls() {
    if (!window.Enjine || !Enjine.Resources || Enjine.Resources.__volumePatched) return;

    const originalAddSound = Enjine.Resources.AddSound;
    Enjine.Resources.AddSound = function(name, src, maxChannels) {
        const result = originalAddSound.apply(this, arguments);
        syncAudioChannels();
        return result;
    };

    Enjine.Resources.PlaySound = function(name, loop) {
        if (!audioState.enabled || !this.Sounds[name]) {
            return this.Sounds[name] ? this.Sounds[name].index : 0;
        }

        if (this.Sounds[name].index >= this.Sounds[name].length) {
            this.Sounds[name].index = 0;
        }

        const channel = this.Sounds[name][this.Sounds[name].index];
        channel.volume = audioState.volume;
        channel.muted = false;

        if (loop) {
            channel.addEventListener('ended', this.LoopCallback, false);
        }

        this.Sounds[name].index++;
        const playAttempt = channel.play();
        if (playAttempt && typeof playAttempt.catch === 'function') {
            playAttempt.catch(function() {});
        }
        return this.Sounds[name].index;
    };

    Enjine.Resources.__volumePatched = true;
}

function bindVolumeSlider() {
    const slider = document.getElementById('volume-slider');
    const valueLabel = document.getElementById('volume-value');
    const audioCheckbox = document.getElementById('audio-enabled');
    if (!slider || !valueLabel || !audioCheckbox) return;

    const savedVolume = window.localStorage.getItem('mario-volume');
    const savedEnabled = window.localStorage.getItem('mario-audio-enabled');
    const initialVolume = savedVolume === null ? 35 : Math.max(0, Math.min(100, Number(savedVolume)));

    slider.value = Number.isFinite(initialVolume) ? initialVolume : 35;
    audioCheckbox.checked = savedEnabled === null ? true : savedEnabled === 'true';
    audioState.enabled = audioCheckbox.checked;

    const syncVolume = function() {
        const percent = Math.max(0, Math.min(100, Number(slider.value)));
        valueLabel.innerText = `${percent}%`;
        window.localStorage.setItem('mario-volume', String(percent));
        setAudioVolume(percent / 100);
    };

    const syncEnabled = function() {
        audioState.enabled = audioCheckbox.checked;
        window.localStorage.setItem('mario-audio-enabled', String(audioState.enabled));
        syncAudioChannels();

        if (audioState.enabled) {
            unlockAudioChannels();
        }
    };

    slider.addEventListener('input', syncVolume);
    audioCheckbox.addEventListener('change', syncEnabled);
    document.addEventListener('pointerdown', function() {
        if (audioState.enabled) unlockAudioChannels();
    }, { once: true });
    document.addEventListener('keydown', function() {
        if (audioState.enabled) unlockAudioChannels();
    }, { once: true });
    syncVolume();
    syncEnabled();
}

function wrapState(stateName, onEnter, onExit) {
    const StateCtor = window.Mario && window.Mario[stateName];
    if (!StateCtor || !StateCtor.prototype) return;

    const originalEnter = StateCtor.prototype.Enter;
    const originalExit = StateCtor.prototype.Exit;

    if (typeof originalEnter === 'function') {
        StateCtor.prototype.Enter = function() {
            if (typeof onEnter === 'function') {
                onEnter.call(this);
            }
            return originalEnter.apply(this, arguments);
        };
    }

    if (typeof originalExit === 'function') {
        StateCtor.prototype.Exit = function() {
            if (typeof onExit === 'function') {
                onExit.call(this);
            }
            return originalExit.apply(this, arguments);
        };
    }
}

function installStateHooks() {
    wrapState('TitleState', function() {
        hudState.currentState = 'title';
        hudState.activeLevelState = null;
    });

    wrapState('MapState', function() {
        hudState.currentState = 'map';
        hudState.activeLevelState = null;
    });

    wrapState('LevelState', function() {
        hudState.currentState = 'level';
        hudState.activeLevelState = this;
    }, function() {
        if (hudState.activeLevelState === this) {
            hudState.activeLevelState = null;
        }
    });

    wrapState('LoseState', function() {
        hudState.currentState = 'lose';
        hudState.activeLevelState = null;
    });

    wrapState('WinState', function() {
        hudState.currentState = 'win';
        hudState.activeLevelState = null;
    });
}

document.addEventListener('DOMContentLoaded', function() {
    installAudioVolumeControls();
    bindVolumeSlider();
    installStateHooks();
    startHudLoop();

    setTimeout(() => {
        const marioApp = new window.Enjine.Application();
        marioApp.Initialize(new window.Mario.LoadingState(), 320, 240);
        console.log('Mario Engine Initialized');
    }, 100);

    window.onMarioGameOver = function(score) {
        const finalScore = score !== undefined ? score : (window.Mario ? window.Mario.Score : 0);
        showScoreSubmission(finalScore);
    };

    function resetInputs() {
        if (Enjine.KeyboardInput && Enjine.KeyboardInput.Pressed) {
            Object.keys(Enjine.KeyboardInput.Pressed).forEach(key => {
                Enjine.KeyboardInput.Pressed[key] = false;
            });
        }
    }

    window.addEventListener('blur', resetInputs);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) resetInputs();
    });

    function bindTouch(id, key) {
        const el = document.getElementById(id);
        if (!el) return;

        const handleStart = function(e) {
            e.preventDefault();
            Enjine.KeyboardInput.Pressed[key] = true;
        };

        const handleEnd = function(e) {
            e.preventDefault();
            Enjine.KeyboardInput.Pressed[key] = false;
        };

        el.addEventListener('touchstart', handleStart, { passive: false });
        el.addEventListener('touchend', handleEnd, { passive: false });
        el.addEventListener('touchcancel', handleEnd, { passive: false });
        el.addEventListener('mousedown', handleStart);
        el.addEventListener('mouseup', handleEnd);
        el.addEventListener('mouseleave', handleEnd);
    }

    bindTouch('btn-up', Enjine.Keys.Up);
    bindTouch('btn-down', Enjine.Keys.Down);
    bindTouch('btn-left', Enjine.Keys.Left);
    bindTouch('btn-right', Enjine.Keys.Right);
    bindTouch('btn-jump', Enjine.Keys.S);
    bindTouch('btn-run', Enjine.Keys.A);
    bindTouch('btn-start', Enjine.Keys.S);
    bindTouch('btn-select', Enjine.Keys.A);
});

/**
 * UI Logic for Score Submission
 */
function showScoreSubmission(score) {
    const container = document.getElementById('submit-container');
    if (!container) return;

    container.replaceChildren();

    const submitWrap = document.createElement('div');
    submitWrap.className = 'score-submit';

    const title = document.createElement('div');
    title.className = 'score-submit-title';
    title.innerText = `FINAL SCORE: ${score}`;

    const inputRow = document.createElement('div');
    inputRow.className = 'score-submit-row';

    const nameInput = document.createElement('input');
    nameInput.id = 'player-name';
    nameInput.type = 'text';
    nameInput.maxLength = 6;
    nameInput.placeholder = 'NAME';
    nameInput.className = 'nes-input';
    nameInput.autocomplete = 'off';
    nameInput.spellcheck = false;
    nameInput.autocapitalize = 'characters';

    inputRow.appendChild(nameInput);

    const actionRow = document.createElement('div');
    actionRow.className = 'score-submit-actions';

    const saveButton = document.createElement('button');
    saveButton.id = 'save-score-btn';
    saveButton.className = 'nes-btn nes-btn-gold';
    saveButton.type = 'button';
    saveButton.innerText = 'SAVE SCORE';

    const cancelButton = document.createElement('button');
    cancelButton.id = 'cancel-score-btn';
    cancelButton.className = 'nes-btn';
    cancelButton.type = 'button';
    cancelButton.innerText = 'CANCEL';

    actionRow.append(saveButton, cancelButton);

    const msg = document.createElement('div');
    msg.id = 'submit-msg';
    msg.className = 'score-submit-message';

    submitWrap.append(title, inputRow, actionRow, msg);
    container.appendChild(submitWrap);

    setGameStatus('SUBMIT SCORE');

    if (nameInput) {
        nameInput.focus();
    }

    saveButton.onclick = async function() {
        let name = nameInput.value
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .slice(0, 6);

        if (!name) name = 'PLAYER';

        saveButton.disabled = true;
        saveButton.innerText = 'SAVING...';

        try {
            const result = await submitScore(name, score);
            if (result.ok) {
                msg.innerText = 'SCORE SAVED!';
                msg.className = 'score-submit-message score-submit-message-success';
                setTemporaryStatus('SAVED', 2000);
                window.setTimeout(() => {
                    clearScoreSubmission();
                }, 2000);
            } else {
                if (result.reason === 'invalid_score') {
                    msg.innerText = 'INVALID SCORE';
                } else if (result.reason === 'network_error') {
                    msg.innerText = 'NETWORK ERROR';
                } else {
                    msg.innerText = 'ERROR SAVING';
                }

                msg.className = 'score-submit-message score-submit-message-error';
                saveButton.disabled = false;
                saveButton.innerText = 'SAVE SCORE';
                setTemporaryStatus('SAVE FAILED', 2000);
            }
        } catch (err) {
            console.error('Submission UI error:', err);
            msg.innerText = 'ERROR SAVING';
            msg.className = 'score-submit-message score-submit-message-error';
            saveButton.disabled = false;
            saveButton.innerText = 'SAVE SCORE';
            setTemporaryStatus('SAVE FAILED', 2000);
        }
    };

    cancelButton.onclick = function() {
        clearScoreSubmission();
        updateHud();
    };
}
