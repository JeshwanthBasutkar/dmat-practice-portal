let latinSelectedSymbol = "";

window.addEventListener('DOMContentLoaded', () => {
    fetchLatinPuzzle();

    document.addEventListener('keydown', (e) => {
        const key = e.key.toUpperCase();
        if (['A', 'B', 'C', 'D', 'E'].includes(key)) {
            selectLatinSymbol(key);
        } else if (e.key === 'Enter' && latinSelectedSymbol) {
            submitLatinAnswer();
        }
    });
});

async function fetchLatinPuzzle() {
    latinSelectedSymbol = "";
    const inputEl = document.getElementById('user-answer-input');
    const feedbackBanner = document.getElementById('latin-feedback-banner');
    if (inputEl) inputEl.value = "";
    if (feedbackBanner) feedbackBanner.classList.add('hidden');

    try {
        const res = await fetch('/api/puzzle');
        const data = await res.json();
        renderLatinBoard(data.puzzle, data.target_coordinate);
    } catch (err) {
        console.error("Error loading Latin puzzle:", err);
    }
}

function renderLatinBoard(board, targetCoord) {
    const boardDiv = document.getElementById('puzzle-board');
    if (!boardDiv) return;
    boardDiv.innerHTML = "";

    board.forEach((row, r) => {
        row.forEach((cell, c) => {
            const cellEl = document.createElement('div');
            cellEl.className = "grid-cell aspect-square flex items-center justify-center text-xl sm:text-2xl font-black rounded-xl border border-slate-700/80 bg-slate-900 text-slate-200 shadow-md select-none transition-all";

            if (r === targetCoord.row && c === targetCoord.col) {
                cellEl.className += " target-cell bg-gradient-to-br from-amber-500 to-amber-600 text-white border-amber-300 font-extrabold shadow-amber-500/50";
                cellEl.innerText = "?";
            } else if (cell !== "") {
                cellEl.innerText = cell;
            } else {
                cellEl.className += " bg-slate-950/60 opacity-50";
            }

            boardDiv.appendChild(cellEl);
        });
    });
}

function selectLatinSymbol(sym) {
    latinSelectedSymbol = sym;
    const inputEl = document.getElementById('user-answer-input');
    if (inputEl) inputEl.value = sym;
    document.querySelectorAll('.symbol-btn').forEach(btn => {
        if (btn.innerText === sym) btn.classList.add('bg-brand-600', 'border-brand-300', 'ring-2', 'ring-brand-400');
        else btn.classList.remove('bg-brand-600', 'border-brand-300', 'ring-2', 'ring-brand-400');
    });
}

async function submitLatinAnswer() {
    if (!latinSelectedSymbol) {
        showLatinBanner("Please select a letter (A - E) first!", "warning");
        return;
    }

    try {
        const res = await fetch('/api/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answer: latinSelectedSymbol })
        });

        const data = await res.json();
        if (data.is_correct) {
            if (typeof confetti === 'function') confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
            showLatinBanner(`🎉 Correct! Target cell is '${data.correct_answer}'. Rewarded +5 Points!`, "success");
            if (data.stats && typeof updateStatsUI === 'function') updateStatsUI(data.stats);
            setTimeout(() => fetchLatinPuzzle(), 2000);
        } else {
            showLatinBanner(`❌ Incorrect. The answer was '${data.correct_answer}'. Try next puzzle!`, "error");
            if (data.stats && typeof updateStatsUI === 'function') updateStatsUI(data.stats);
        }
        if (typeof fetchLeaderboard === 'function') fetchLeaderboard();
    } catch (err) {
        console.error("Submission error:", err);
    }
}

function showLatinBanner(msg, type) {
    const banner = document.getElementById('latin-feedback-banner');
    if (!banner) return;
    banner.classList.remove('hidden', 'bg-emerald-950/80', 'text-emerald-300', 'bg-rose-950/80', 'text-rose-300', 'bg-amber-950/80', 'text-amber-300');
    if (type === 'success') banner.classList.add('bg-emerald-950/80', 'text-emerald-300');
    else if (type === 'error') banner.classList.add('bg-rose-950/80', 'text-rose-300');
    else banner.classList.add('bg-amber-950/80', 'text-amber-300');
    banner.innerText = msg;
}
