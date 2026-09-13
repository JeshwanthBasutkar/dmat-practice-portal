window.addEventListener('DOMContentLoaded', () => {
    fetchMathPuzzle();
});

async function fetchMathPuzzle() {
    const elA = document.getElementById('math-val-A');
    const elB = document.getElementById('math-val-B');
    const elC = document.getElementById('math-val-C');
    const elD = document.getElementById('math-val-D');
    const banner = document.getElementById('math-feedback-banner');

    if (elA) elA.value = "";
    if (elB) elB.value = "";
    if (elC) elC.value = "";
    if (elD) elD.value = "";
    if (banner) banner.classList.add('hidden');

    try {
        const res = await fetch('/api/math_puzzle');
        const data = await res.json();
        renderMathEquations(data.equations);
    } catch (err) {
        console.error("Error fetching math puzzle:", err);
    }
}

function renderMathEquations(equations) {
    const container = document.getElementById('equations-list');
    if (!container) return;
    container.innerHTML = "";

    equations.forEach((eq, idx) => {
        const card = document.createElement('div');
        card.className = "bg-slate-900/90 p-4 rounded-xl border border-slate-700/70 flex items-center space-x-3";
        card.innerHTML = `
            <span class="w-7 h-7 rounded-lg bg-accent-cyan/20 text-accent-cyan font-bold text-xs flex items-center justify-center">Eq ${idx + 1}</span>
            <span class="text-lg font-mono font-bold text-white tracking-wide">${eq}</span>
        `;
        container.appendChild(card);
    });
}

async function submitMathAnswers() {
    const valA = document.getElementById('math-val-A').value;
    const valB = document.getElementById('math-val-B').value;
    const valC = document.getElementById('math-val-C').value;
    const valD = document.getElementById('math-val-D').value;

    if (valA === "" || valB === "" || valC === "" || valD === "") {
        showMathBanner("Please enter values for all 4 variables (A, B, C, D)!", "warning");
        return;
    }

    try {
        const res = await fetch('/api/submit_math', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answers: { A: valA, B: valB, C: valC, D: valD } })
        });

        const data = await res.json();
        if (data.is_correct) {
            if (typeof confetti === 'function') confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            showMathBanner(`🎉 Perfect Math Logic! Rewarded +5 Points!`, "success");
            if (data.stats && typeof updateStatsUI === 'function') updateStatsUI(data.stats);
            setTimeout(() => fetchMathPuzzle(), 2500);
        } else {
            const ans = data.correct_answers;
            showMathBanner(`❌ Incorrect. Correct answers: A=${ans.A}, B=${ans.B}, C=${ans.C}, D=${ans.D}. Try next system!`, "error");
            if (data.stats && typeof updateStatsUI === 'function') updateStatsUI(data.stats);
        }
        if (typeof fetchLeaderboard === 'function') fetchLeaderboard();
    } catch (err) {
        console.error("Math error:", err);
    }
}

function showMathBanner(msg, type) {
    const banner = document.getElementById('math-feedback-banner');
    if (!banner) return;
    banner.classList.remove('hidden', 'bg-emerald-950/80', 'text-emerald-300', 'bg-rose-950/80', 'text-rose-300', 'bg-amber-950/80', 'text-amber-300');
    if (type === 'success') banner.classList.add('bg-emerald-950/80', 'text-emerald-300');
    else if (type === 'error') banner.classList.add('bg-rose-950/80', 'text-rose-300');
    else banner.classList.add('bg-amber-950/80', 'text-amber-300');
    banner.innerText = msg;
}
