let currentUser = null;
const EXAM_DATE = new Date("2026-09-26T00:00:00").getTime();

window.addEventListener('DOMContentLoaded', async () => {
    startExamCountdown();
    await checkAuthStatus();
    await fetchLeaderboard();
    await fetchComments();
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

    const nameInput = document.getElementById('comment-user-name');
    if (nameInput && (!nameInput.value || nameInput.value === 'Anonymous Candidate')) {
        nameInput.value = user.username;
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

// --- RATINGS AND COMMENTS ---

let currentRatingSelection = 0;

function setRating(rating) {
    if (currentRatingSelection === rating) {
        currentRatingSelection = 0;
    } else {
        currentRatingSelection = rating;
    }

    const label = document.getElementById('rating-selected-text');

    for (let i = 1; i <= 5; i++) {
        const star = document.getElementById(`star-btn-${i}`);
        if (star) {
            if (i <= currentRatingSelection) {
                star.className = "fa-solid fa-star text-amber-400 text-xl cursor-pointer hover:scale-110 transition";
            } else {
                star.className = "fa-regular fa-star text-slate-600 text-xl cursor-pointer hover:scale-110 transition";
            }
        }
    }

    if (label) {
        if (currentRatingSelection > 0) {
            label.innerText = `${currentRatingSelection} Star${currentRatingSelection > 1 ? 's' : ''} Selected`;
            label.className = "text-xs font-bold text-amber-400 ml-auto";
        } else {
            label.innerText = "No rating (optional)";
            label.className = "text-xs font-semibold text-slate-400 ml-auto";
        }
    }
}

async function fetchComments() {
    const container = document.getElementById('comments-list-container');
    if (!container) return;

    try {
        const res = await fetch('/api/comments');
        const data = await res.json();
        if (data.success) {
            renderCommentsUI(data);
        }
    } catch (e) {
        console.error("Error fetching comments:", e);
    }
}

function renderCommentsUI(data) {
    const avgEl = document.getElementById('avg-rating-value');
    const starsEl = document.getElementById('avg-rating-stars');
    const countEl = document.getElementById('comments-count-label');
    const container = document.getElementById('comments-list-container');

    const totalCount = data.total_count || 0;
    const ratingCount = data.rating_count || 0;
    const avg = data.avg_rating || 0;

    if (avgEl) {
        avgEl.innerText = ratingCount > 0 ? avg.toFixed(1) : "--";
    }
    if (countEl) {
        countEl.innerText = `Based on ${totalCount} candidate review${totalCount === 1 ? '' : 's'}`;
    }

    if (starsEl) {
        if (ratingCount > 0) {
            const fullStars = Math.floor(avg);
            let starsHtml = '';
            for (let i = 1; i <= 5; i++) {
                if (i <= fullStars) {
                    starsHtml += `<i class="fa-solid fa-star text-amber-400"></i>`;
                } else if (i - 0.5 <= avg) {
                    starsHtml += `<i class="fa-solid fa-star-half-stroke text-amber-400"></i>`;
                } else {
                    starsHtml += `<i class="fa-regular fa-star text-slate-600"></i>`;
                }
            }
            starsEl.innerHTML = starsHtml;
        } else {
            starsEl.innerHTML = `<span class="text-xs text-slate-500 italic">No ratings yet</span>`;
        }
    }

    if (container) {
        container.innerHTML = "";
        if (!data.comments || data.comments.length === 0) {
            container.innerHTML = `
                <div class="p-8 text-center bg-slate-900/60 border border-slate-800/80 rounded-2xl text-slate-400 text-xs font-medium space-y-2">
                    <i class="fa-solid fa-comments text-3xl text-slate-600 block mb-1"></i>
                    <p class="font-bold text-white text-sm">No candidate reviews submitted yet.</p>
                    <p class="text-slate-400">Be the first candidate to leave a rating or comment!</p>
                </div>
            `;
            return;
        }

        data.comments.forEach(c => {
            const card = document.createElement('div');
            card.className = "bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2.5 shadow-md hover:border-slate-700 transition";

            let starsHtml = '';
            if (c.rating && c.rating > 0) {
                for (let i = 1; i <= 5; i++) {
                    if (i <= c.rating) {
                        starsHtml += `<i class="fa-solid fa-star text-amber-400 text-xs"></i>`;
                    } else {
                        starsHtml += `<i class="fa-regular fa-star text-slate-600 text-xs"></i>`;
                    }
                }
            } else {
                starsHtml = `<span class="text-[10px] text-slate-500 italic">Comment Only</span>`;
            }

            const initial = (c.user_name || 'A').charAt(0).toUpperCase();

            let commentContentHtml = '';
            if (c.comment && c.comment.trim() !== '') {
                commentContentHtml = `<p class="text-xs text-slate-300 leading-relaxed font-normal">${escapeHtml(c.comment)}</p>`;
            } else {
                commentContentHtml = `<span class="text-[10px] font-semibold text-amber-400 bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-800/60 inline-block"><i class="fa-solid fa-star mr-1"></i>Rated ${c.rating} Stars</span>`;
            }

            card.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2.5">
                        <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-accent-cyan flex items-center justify-center font-bold text-white text-xs shadow-md">
                            ${initial}
                        </div>
                        <div>
                            <span class="block text-xs font-bold text-white">${escapeHtml(c.user_name)}</span>
                            <span class="text-[10px] text-slate-400">${c.created_at || 'Recently'}</span>
                        </div>
                    </div>
                    <div class="flex items-center space-x-1">
                        ${starsHtml}
                    </div>
                </div>
                ${commentContentHtml}
            `;
            container.appendChild(card);
        });
    }
}

async function submitRatingComment(e) {
    if (e) e.preventDefault();
    const nameInput = document.getElementById('comment-user-name');
    const commentInput = document.getElementById('comment-text-input');
    const msgBanner = document.getElementById('comment-status-banner');

    const name = nameInput ? nameInput.value.trim() : '';
    const comment = commentInput ? commentInput.value.trim() : '';
    const rating = currentRatingSelection > 0 ? currentRatingSelection : null;

    if (!rating && !comment) {
        if (msgBanner) {
            msgBanner.className = "p-3 rounded-xl text-xs font-semibold bg-rose-950/80 text-rose-300 border border-rose-800 block";
            msgBanner.innerText = "Please select a star rating or write a comment (or both).";
        }
        return;
    }

    try {
        const res = await fetch('/api/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_name: name,
                rating: rating,
                comment: comment
            })
        });

        const data = await res.json();
        if (data.success) {
            if (msgBanner) {
                msgBanner.className = "p-3 rounded-xl text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800 block";
                msgBanner.innerText = "Thank you! Your feedback has been posted successfully.";
            }
            if (commentInput) commentInput.value = "";
            setRating(0);
            renderCommentsUI(data);
        } else if (msgBanner) {
            msgBanner.className = "p-3 rounded-xl text-xs font-semibold bg-rose-950/80 text-rose-300 border border-rose-800 block";
            msgBanner.innerText = data.message || "Failed to submit feedback.";
        }
    } catch (err) {
        console.error("Error submitting rating comment:", err);
        if (msgBanner) {
            msgBanner.className = "p-3 rounded-xl text-xs font-semibold bg-rose-950/80 text-rose-300 border border-rose-800 block";
            msgBanner.innerText = "Connection error. Please try again.";
        }
    }
}
