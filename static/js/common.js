let currentUser = null;
const EXAM_DATE = new Date("2026-09-26T00:00:00").getTime();

window.addEventListener('DOMContentLoaded', async () => {
    startExamCountdown();
    await checkAuthStatus();
    await fetchLeaderboard();
});

function startExamCountdown() {
    function updateCountdown() {
        const now = new Date().getTime();
        const distance = EXAM_DATE - now;

        const daysEl = document.getElementById('cnt-days');
        const hoursEl = document.getElementById('cnt-hours');
        const minsEl = document.getElementById('cnt-mins');
        const secsEl = document.getElementById('cnt-secs');

        if (!daysEl) return;

        if (distance < 0) {
            daysEl.innerText = "00";
            hoursEl.innerText = "00";
            minsEl.innerText = "00";
            secsEl.innerText = "00";
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((distance % (1000 * 60)) / 1000);

        daysEl.innerText = String(days).padStart(2, '0');
        hoursEl.innerText = String(hours).padStart(2, '0');
        minsEl.innerText = String(mins).padStart(2, '0');
        secsEl.innerText = String(secs).padStart(2, '0');
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);
}

async function checkAuthStatus() {
    try {
        const res = await fetch('/api/me');
        const data = await res.json();
        if (data.logged_in) {
            setAuthenticatedUser(data.user, data.stats);
        } else {
            setGuestState();
        }
    } catch (e) {
        console.error("Auth status error:", e);
        setGuestState();
    }
}

function setAuthenticatedUser(user, stats) {
    currentUser = user;
    const dashUsername = document.getElementById('dash-username');
    if (dashUsername) dashUsername.innerText = user.username;

    const authContainer = document.getElementById('auth-header-container');
    if (authContainer) {
        authContainer.innerHTML = `
            <div class="flex items-center space-x-3 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-xl">
                <div class="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center text-xs font-bold text-white">
                    ${user.username.charAt(0).toUpperCase()}
                </div>
                <span class="text-sm font-semibold text-white">${escapeHtml(user.username)}</span>
                <button onclick="handleLogout()" title="Log Out" class="text-slate-400 hover:text-rose-400 transition ml-2">
                    <i class="fa-solid fa-right-from-bracket text-xs"></i>
                </button>
            </div>
        `;
    }

    if (stats) updateStatsUI(stats);
}

function setGuestState() {
    currentUser = null;
    const authContainer = document.getElementById('auth-header-container');
    if (authContainer) {
        authContainer.innerHTML = `
            <a href="/login" class="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-accent-cyan transition rounded-xl shadow-lg hover:opacity-90">
                Sign In / Register
            </a>
        `;
    }
}

function updateStatsUI(stats) {
    const scoreEl = document.getElementById('dash-score');
    const streakEl = document.getElementById('dash-streak');
    if (scoreEl) scoreEl.innerText = `${stats.score} pts`;
    if (streakEl) streakEl.innerText = `${stats.streak} 🔥`;
}

async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' });
    setGuestState();
    window.location.href = '/';
}

function navigateToUrl(url) {
    window.location.href = url;
}

function startInstantPractice() {
    if (currentUser) {
        window.location.href = '/dashboard';
    } else {
        window.location.href = '/register';
    }
}

async function fetchLeaderboard() {
    try {
        const res = await fetch('/api/leaderboard');
        const data = await res.json();
        renderLeaderboards(data.leaderboard);
    } catch (e) {
        console.error("Leaderboard error:", e);
    }
}

function renderLeaderboards(list) {
    const dashList = document.getElementById('dash-leaderboard-list');
    if (dashList) {
        dashList.innerHTML = "";
        if (!list || list.length === 0) {
            dashList.innerHTML = `<p class="text-xs text-slate-500 text-center col-span-3 py-4">No ranked candidates yet.</p>`;
        } else {
            list.slice(0, 3).forEach((player, idx) => {
                const badges = ['🥇 1st Place', '🥈 2nd Place', '🥉 3rd Place'];
                const card = document.createElement('div');
                card.className = "glass-card p-4 rounded-2xl border border-slate-800 flex items-center justify-between";
                card.innerHTML = `
                    <div class="flex items-center space-x-3">
                        <span class="text-xl">${badges[idx].split(' ')[0]}</span>
                        <div>
                            <span class="block text-sm font-bold text-white">${escapeHtml(player.username)}</span>
                            <span class="text-[10px] text-slate-400">${player.puzzles_solved} solved</span>
                        </div>
                    </div>
                    <span class="text-base font-black text-brand-400">${player.score} pts</span>
                `;
                dashList.appendChild(card);
            });
        }
    }

    const modalTable = document.getElementById('full-leaderboard-tbody');
    if (modalTable) {
        modalTable.innerHTML = "";
        if (!list || list.length === 0) {
            modalTable.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-slate-500">No candidates registered yet.</td></tr>`;
        } else {
            list.forEach((player, idx) => {
                const row = document.createElement('tr');
                row.className = "hover:bg-slate-900/50 transition";
                row.innerHTML = `
                    <td class="px-4 py-3 font-bold ${idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-600' : 'text-slate-500'}">
                        #${idx + 1}
                    </td>
                    <td class="px-4 py-3 font-semibold text-white">${escapeHtml(player.username)}</td>
                    <td class="px-4 py-3 text-center text-slate-300">${player.puzzles_solved}</td>
                    <td class="px-4 py-3 text-center text-amber-400 font-medium">${player.best_streak} 🔥</td>
                    <td class="px-4 py-3 text-right font-black text-brand-400">${player.score} pts</td>
                `;
                modalTable.appendChild(row);
            });
        }
    }
}

function openModal(id) { const el = document.getElementById(id); if (el) el.classList.remove('hidden'); }
function closeModal(id) { const el = document.getElementById(id); if (el) el.classList.add('hidden'); }
function escapeHtml(str) { return (str || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
