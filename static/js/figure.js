let figureSelectedOpt1 = null;
let figureSelectedOpt2 = null;
let figureCurrentDifficulty = 'random';
let figureSubmitted = false;
let figureAutoNextTimer = null;

window.addEventListener('DOMContentLoaded', () => {
    fetchFigurePuzzle();
});

function changeFigureDifficulty() {
    const sel = document.getElementById('figure-diff-select');
    if (sel) figureCurrentDifficulty = sel.value;
    fetchFigurePuzzle();
}

async function fetchFigurePuzzle() {
    if (figureAutoNextTimer) clearTimeout(figureAutoNextTimer);
    figureSelectedOpt1 = null;
    figureSelectedOpt2 = null;
    figureSubmitted = false;

    const label5 = document.getElementById('fig5-selected-label');
    const label6 = document.getElementById('fig6-selected-label');
    if (label5) label5.innerText = "None selected";
    if (label6) label6.innerText = "None selected";
    
    const fbBanner = document.getElementById('figure-feedback-banner');
    const rulesBox = document.getElementById('figure-rules-box');
    if (fbBanner) fbBanner.classList.add('hidden');
    if (rulesBox) rulesBox.classList.add('hidden');

    const seqContainer = document.getElementById('figure-sequence-container');
    const group1Container = document.getElementById('options-group-1');
    const group2Container = document.getElementById('options-group-2');

    if (seqContainer) {
        seqContainer.innerHTML = `<div class="col-span-6 py-8 text-center text-slate-400 text-sm flex items-center justify-center space-x-2">
            <i class="fa-solid fa-circle-notch fa-spin text-amber-400 text-lg"></i>
            <span>Generating procedural Figure Sequence puzzle...</span>
        </div>`;
    }
    if (group1Container) group1Container.innerHTML = "";
    if (group2Container) group2Container.innerHTML = "";

    try {
        const res = await fetch(`/api/figure_sequence?difficulty=${figureCurrentDifficulty}`);
        const data = await res.json();
        if (data.success) {
            renderFigurePuzzle(data);
        } else if (seqContainer) {
            seqContainer.innerHTML = `<div class="col-span-6 py-4 text-center text-rose-400 text-sm">Failed to load puzzle: ${data.message}</div>`;
        }
    } catch (err) {
        console.error("Error fetching figure puzzle:", err);
        if (seqContainer) seqContainer.innerHTML = `<div class="col-span-6 py-4 text-center text-rose-400 text-sm">Error connecting to server.</div>`;
    }
}

function renderFigurePuzzle(data) {
    const diffTag = document.getElementById('figure-difficulty-tag');
    if (diffTag) diffTag.innerText = data.difficulty.toUpperCase();

    const seqContainer = document.getElementById('figure-sequence-container');
    if (!seqContainer) return;
    seqContainer.innerHTML = "";

    data.frames.forEach((imgUrl, idx) => {
        const item = document.createElement('div');
        item.className = "bg-slate-900 border border-slate-700/80 rounded-xl p-2 flex flex-col items-center shadow-md";
        item.innerHTML = `
            <div class="w-full aspect-square bg-white rounded-lg overflow-hidden flex items-center justify-center p-1 border border-slate-300">
                <img src="${imgUrl}" alt="Figure ${idx + 1}" class="w-full h-full object-contain">
            </div>
            <span class="text-[11px] font-bold text-slate-300 mt-1.5">Figure ${idx + 1}</span>
        `;
        seqContainer.appendChild(item);
    });

    for (let m = 5; m <= 6; m++) {
        const item = document.createElement('div');
        item.className = "bg-amber-950/30 border-2 border-dashed border-amber-500/60 rounded-xl p-2 flex flex-col items-center justify-between shadow-md relative";
        item.innerHTML = `
            <div class="w-full aspect-square bg-slate-900/80 rounded-lg flex flex-col items-center justify-center p-1 border border-amber-500/40 text-amber-400">
                <span id="seq-missing-${m}-box" class="text-2xl font-black animate-pulse">?</span>
            </div>
            <span class="text-[11px] font-bold text-amber-300 mt-1.5">Missing Fig ${m}</span>
        `;
        seqContainer.appendChild(item);
    }

    const group1Container = document.getElementById('options-group-1');
    if (group1Container) {
        group1Container.innerHTML = "";
        data.options_1.forEach((imgUrl, idx) => {
            const btn = document.createElement('button');
            btn.type = "button";
            btn.id = `opt-1-btn-${idx + 1}`;
            btn.onclick = () => selectFigureOption(1, idx + 1);
            btn.className = "figure-opt-btn bg-slate-950 hover:bg-slate-800 border-2 border-slate-700/80 rounded-xl p-2 flex flex-col items-center transition transform hover:-translate-y-0.5 focus:outline-none";
            btn.innerHTML = `
                <div class="w-full aspect-square bg-white rounded-lg overflow-hidden p-1 border border-slate-300 mb-1">
                    <img src="${imgUrl}" alt="Choice ${idx + 1}" class="w-full h-full object-contain">
                </div>
                <span class="text-xs font-bold text-slate-200">Option ${idx + 1}</span>
            `;
            group1Container.appendChild(btn);
        });
    }

    const group2Container = document.getElementById('options-group-2');
    if (group2Container) {
        group2Container.innerHTML = "";
        data.options_2.forEach((imgUrl, idx) => {
            const btn = document.createElement('button');
            btn.type = "button";
            btn.id = `opt-2-btn-${idx + 1}`;
            btn.onclick = () => selectFigureOption(2, idx + 1);
            btn.className = "figure-opt-btn bg-slate-950 hover:bg-slate-800 border-2 border-slate-700/80 rounded-xl p-2 flex flex-col items-center transition transform hover:-translate-y-0.5 focus:outline-none";
            btn.innerHTML = `
                <div class="w-full aspect-square bg-white rounded-lg overflow-hidden p-1 border border-slate-300 mb-1">
                    <img src="${imgUrl}" alt="Choice ${idx + 1}" class="w-full h-full object-contain">
                </div>
                <span class="text-xs font-bold text-slate-200">Option ${idx + 1}</span>
            `;
            group2Container.appendChild(btn);
        });
    }
}

function selectFigureOption(group, index) {
    if (figureSubmitted) return;

    if (group === 1) {
        figureSelectedOpt1 = index;
        const label = document.getElementById('fig5-selected-label');
        if (label) label.innerText = `Selected Option #${index}`;
        document.querySelectorAll('#options-group-1 .figure-opt-btn').forEach((b, i) => {
            if (i + 1 === index) {
                b.className = "figure-opt-btn bg-amber-950/80 border-2 border-amber-400 ring-2 ring-amber-400/50 rounded-xl p-2 flex flex-col items-center transition transform scale-105";
            } else {
                b.className = "figure-opt-btn bg-slate-950 hover:bg-slate-800 border-2 border-slate-700/80 rounded-xl p-2 flex flex-col items-center transition transform hover:-translate-y-0.5 focus:outline-none";
            }
        });
    } else {
        figureSelectedOpt2 = index;
        const label = document.getElementById('fig6-selected-label');
        if (label) label.innerText = `Selected Option #${index}`;
        document.querySelectorAll('#options-group-2 .figure-opt-btn').forEach((b, i) => {
            if (i + 1 === index) {
                b.className = "figure-opt-btn bg-indigo-950/80 border-2 border-indigo-400 ring-2 ring-indigo-400/50 rounded-xl p-2 flex flex-col items-center transition transform scale-105";
            } else {
                b.className = "figure-opt-btn bg-slate-950 hover:bg-slate-800 border-2 border-slate-700/80 rounded-xl p-2 flex flex-col items-center transition transform hover:-translate-y-0.5 focus:outline-none";
            }
        });
    }
}

async function submitFigureAnswer() {
    if (!figureSelectedOpt1 || !figureSelectedOpt2) {
        showFigureBanner("Please select an option for BOTH Missing Figure 5 and Missing Figure 6!", "warning");
        return;
    }

    try {
        const res = await fetch('/api/submit_figure_sequence', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answer_1: figureSelectedOpt1, answer_2: figureSelectedOpt2 })
        });

        const data = await res.json();

        if (data.rules && data.rules.length > 0) {
            const rulesBox = document.getElementById('figure-rules-box');
            const rulesList = document.getElementById('figure-rules-list');
            if (rulesList) rulesList.innerHTML = data.rules.map(r => `<li>${r}</li>`).join('');
            if (rulesBox) rulesBox.classList.remove('hidden');
        }

        if (data.is_correct) {
            figureSubmitted = true;
            if (typeof confetti === 'function') confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            showFigureBanner(`🎉 Perfect Figure Sequence Logic! Both choices correct. Rewarded +5 Points! Auto-generating next question...`, "success");
            if (data.stats && typeof updateStatsUI === 'function') updateStatsUI(data.stats);
            
            figureAutoNextTimer = setTimeout(() => {
                fetchFigurePuzzle();
            }, 2500);
        } else {
            figureSubmitted = false;
            if (data.one_correct) {
                showFigureBanner(`½ Partial match! You got one figure right. Edit your selections to fix it and click Submit again!`, "warning");
            } else {
                showFigureBanner(`❌ Incorrect choices. Review the rule breakdown below, edit your choices, and try again!`, "error");
            }
            if (data.stats && typeof updateStatsUI === 'function') updateStatsUI(data.stats);
        }
        if (typeof fetchLeaderboard === 'function') fetchLeaderboard();
    } catch (err) {
        console.error("Figure submission error:", err);
    }
}

function showFigureBanner(msg, type) {
    const banner = document.getElementById('figure-feedback-banner');
    if (!banner) return;
    banner.classList.remove('hidden', 'bg-emerald-950/80', 'text-emerald-300', 'bg-rose-950/80', 'text-rose-300', 'bg-amber-950/80', 'text-amber-300');
    if (type === 'success') banner.classList.add('bg-emerald-950/80', 'text-emerald-300');
    else if (type === 'error') banner.classList.add('bg-rose-950/80', 'text-rose-300');
    else banner.classList.add('bg-amber-950/80', 'text-amber-300');
    banner.innerText = msg;
}
