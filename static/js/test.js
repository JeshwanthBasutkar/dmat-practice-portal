let testData = null;
let currentSectionIndex = 0; // 0: Section 1 (Latin), 1: Section 2 (Math), 2: Section 3 (Figure)
let currentQuestionIndex = 0; // 0..19

let sectionTimerInterval = null;
let sectionTimeLeft = 25 * 60; // 25 minutes = 1500 seconds

let breakTimerInterval = null;
let breakTimeLeft = 2 * 60; // 2 minutes = 120 seconds

// User Answers Storage for 60 questions
let userAnswers = {
    section1: {}, // { "0": "A", "1": "B", ... }
    section2: {}, // { "0": { A: 2, B: 3, C: 1, D: 4 }, ... }
    section3: {}  // { "0": { ans1: 1, ans2: 3 }, ... }
};

window.addEventListener('DOMContentLoaded', async () => {
    enableFullscreen();
    await initTestExam();
});

function enableFullscreen() {
    try {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
        }
    } catch (e) {}
}

async function initTestExam() {
    const loadingScreen = document.getElementById('test-loading-screen');
    const examInterface = document.getElementById('test-exam-interface');
    if (loadingScreen) loadingScreen.classList.remove('hidden');
    if (examInterface) examInterface.classList.add('hidden');

    try {
        const res = await fetch('/api/test/generate', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            testData = data;
            if (loadingScreen) loadingScreen.classList.add('hidden');
            if (examInterface) examInterface.classList.remove('hidden');
            
            currentSectionIndex = 0;
            currentQuestionIndex = 0;
            startSection(0);
        } else {
            alert("Failed to generate test: " + data.message);
        }
    } catch (err) {
        console.error("Error generating test:", err);
        alert("Server error initializing test exam.");
    }
}

function startSection(sectionIdx) {
    currentSectionIndex = sectionIdx;
    currentQuestionIndex = 0;
    sectionTimeLeft = 25 * 60;

    if (sectionTimerInterval) clearInterval(sectionTimerInterval);
    startSectionTimer();

    updateSectionHeader();
    renderCurrentQuestion();
    renderBottomQuestionBar();
}

function startSectionTimer() {
    updateTimerDisplay();
    sectionTimerInterval = setInterval(() => {
        sectionTimeLeft--;
        updateTimerDisplay();
        if (sectionTimeLeft <= 0) {
            clearInterval(sectionTimerInterval);
            handleSectionTimeout();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const timerEl = document.getElementById('section-timer-display');
    if (!timerEl) return;
    const mins = Math.floor(sectionTimeLeft / 60);
    const secs = sectionTimeLeft % 60;
    timerEl.innerText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function updateSectionHeader() {
    const titles = ["Section 1: 5×5 Latin Square Matrix", "Section 2: System of Mathematical Equations", "Section 3: Figure Sequence Engine"];
    const titleEl = document.getElementById('test-section-title');
    if (titleEl) titleEl.innerText = titles[currentSectionIndex];

    const submitBtn = document.getElementById('top-right-submit-btn');
    if (submitBtn) {
        if (currentSectionIndex === 2) {
            submitBtn.innerText = "Submit Final Exam 🏁";
            submitBtn.className = "px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-white font-extrabold text-sm rounded-xl shadow-lg transition";
        } else {
            submitBtn.innerText = `Submit Section ${currentSectionIndex + 1} →`;
            submitBtn.className = "px-5 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:opacity-95 text-white font-extrabold text-sm rounded-xl shadow-lg transition";
        }
    }
}

function renderCurrentQuestion() {
    const container = document.getElementById('test-question-content');
    if (!container || !testData) return;
    container.innerHTML = "";

    const qNum = currentQuestionIndex + 1;

    if (currentSectionIndex === 0) {
        // Section 1: Latin Square
        const q = testData.section1[currentQuestionIndex];
        const savedAns = userAnswers.section1[currentQuestionIndex] || "";

        const wrapper = document.createElement('div');
        wrapper.className = "max-w-2xl mx-auto space-y-6";
        wrapper.innerHTML = `
            <div class="flex items-center justify-between pb-3 border-b border-slate-700/60">
                <span class="text-xs font-extrabold uppercase tracking-wider text-brand-400">Question ${qNum} of 20 • Latin Square</span>
                <span class="text-xs font-semibold text-slate-400">Select letter for target '?'</span>
            </div>

            <div class="relative max-w-sm mx-auto aspect-square p-4 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-inner flex flex-col justify-center">
                <div id="test-latin-grid" class="grid grid-cols-5 gap-2 w-full h-full"></div>
            </div>

            <div class="space-y-3 max-w-md mx-auto">
                <label class="block text-center text-xs font-bold uppercase text-slate-400">Choose Symbol:</label>
                <div class="flex justify-center gap-3">
                    ${['A','B','C','D','E'].map(sym => `
                        <button type="button" onclick="selectTestLatinSymbol('${sym}')" 
                            class="test-latin-btn flex-1 py-3.5 bg-slate-800 hover:bg-brand-600 text-white font-black text-xl rounded-xl border ${savedAns === sym ? 'bg-brand-600 border-brand-300 ring-2 ring-brand-400' : 'border-slate-700'} transition shadow-md">
                            ${sym}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
        container.appendChild(wrapper);
        renderTestLatinGrid(q.puzzle, q.target_coordinate);

    } else if (currentSectionIndex === 1) {
        // Section 2: Math System
        const q = testData.section2[currentQuestionIndex];
        const savedAns = userAnswers.section2[currentQuestionIndex] || {};

        const wrapper = document.createElement('div');
        wrapper.className = "max-w-3xl mx-auto space-y-6";
        wrapper.innerHTML = `
            <div class="flex items-center justify-between pb-3 border-b border-slate-700/60">
                <span class="text-xs font-extrabold uppercase tracking-wider text-accent-cyan">Question ${qNum} of 20 • Math Equations</span>
                <span class="text-xs font-semibold text-slate-400">Enter integer values for A, B, C, D</span>
            </div>

            <div class="bg-slate-950/80 p-6 rounded-2xl border border-slate-800 space-y-3">
                <span class="block text-xs font-bold uppercase text-slate-400 mb-2">Equations System:</span>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    ${q.equations.map((eq, i) => `
                        <div class="bg-slate-900/90 p-3 rounded-xl border border-slate-700/70 flex items-center space-x-3">
                            <span class="w-6 h-6 rounded-md bg-cyan-950 text-cyan-400 font-bold text-xs flex items-center justify-center">Eq ${i+1}</span>
                            <span class="text-base font-mono font-bold text-white">${eq}</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-lg mx-auto">
                ${['A','B','C','D'].map(v => `
                    <div class="bg-slate-900/90 p-3 rounded-2xl border border-slate-700 text-center">
                        <span class="block text-xs font-bold text-accent-cyan mb-1">Var ${v}</span>
                        <input type="number" id="test-math-input-${v}" value="${savedAns[v] !== undefined ? savedAns[v] : ''}" onchange="saveTestMathAnswer()" placeholder="${v}" class="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 text-center text-xl font-bold text-white focus:outline-none focus:border-accent-cyan">
                    </div>
                `).join('')}
            </div>
        `;
        container.appendChild(wrapper);

    } else if (currentSectionIndex === 2) {
        // Section 3: Figure Sequence
        const q = testData.section3[currentQuestionIndex];
        const savedAns = userAnswers.section3[currentQuestionIndex] || {};

        const wrapper = document.createElement('div');
        wrapper.className = "max-w-4xl mx-auto space-y-6";
        wrapper.innerHTML = `
            <div class="flex items-center justify-between pb-3 border-b border-slate-700/60">
                <span class="text-xs font-extrabold uppercase tracking-wider text-amber-400">Question ${qNum} of 20 • Figure Sequence (${q.difficulty.toUpperCase()})</span>
                <span class="text-xs font-semibold text-slate-400">Choose Missing Fig 5 and Fig 6</span>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                ${q.frames.map((imgUrl, i) => `
                    <div class="bg-slate-900 border border-slate-700/80 rounded-xl p-1.5 flex flex-col items-center">
                        <div class="w-full aspect-square bg-white rounded-lg p-1 border border-slate-300">
                            <img src="${imgUrl}" class="w-full h-full object-contain">
                        </div>
                        <span class="text-[10px] font-bold text-slate-300 mt-1">Figure ${i+1}</span>
                    </div>
                `).join('')}
                <div class="bg-amber-950/30 border-2 border-dashed border-amber-500/60 rounded-xl p-1.5 flex flex-col items-center justify-between">
                    <div class="w-full aspect-square bg-slate-900 rounded-lg flex items-center justify-center text-amber-400 font-black text-xl">?</div>
                    <span class="text-[10px] font-bold text-amber-300 mt-1">Missing Fig 5</span>
                </div>
                <div class="bg-amber-950/30 border-2 border-dashed border-amber-500/60 rounded-xl p-1.5 flex flex-col items-center justify-between">
                    <div class="w-full aspect-square bg-slate-900 rounded-lg flex items-center justify-center text-amber-400 font-black text-xl">?</div>
                    <span class="text-[10px] font-bold text-amber-300 mt-1">Missing Fig 6</span>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Group 1 -->
                <div class="bg-slate-900/80 p-4 rounded-2xl border border-slate-700/70 space-y-2">
                    <span class="block text-xs font-bold text-amber-400">Choose Missing Figure 5:</span>
                    <div class="grid grid-cols-2 gap-2">
                        ${q.options_1.map((imgUrl, idx) => `
                            <button type="button" onclick="selectTestFigureOption(1, ${idx+1})" class="test-fig-opt-1 bg-slate-950 border-2 ${savedAns.ans1 === idx+1 ? 'border-amber-400 ring-2 ring-amber-400/50 bg-amber-950/80' : 'border-slate-700'} rounded-xl p-1.5 flex flex-col items-center">
                                <div class="w-full aspect-square bg-white rounded-lg p-1 border border-slate-300 mb-1">
                                    <img src="${imgUrl}" class="w-full h-full object-contain">
                                </div>
                                <span class="text-[10px] font-bold text-slate-200">Opt ${idx+1}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- Group 2 -->
                <div class="bg-slate-900/80 p-4 rounded-2xl border border-slate-700/70 space-y-2">
                    <span class="block text-xs font-bold text-indigo-400">Choose Missing Figure 6:</span>
                    <div class="grid grid-cols-2 gap-2">
                        ${q.options_2.map((imgUrl, idx) => `
                            <button type="button" onclick="selectTestFigureOption(2, ${idx+1})" class="test-fig-opt-2 bg-slate-950 border-2 ${savedAns.ans2 === idx+1 ? 'border-indigo-400 ring-2 ring-indigo-400/50 bg-indigo-950/80' : 'border-slate-700'} rounded-xl p-1.5 flex flex-col items-center">
                                <div class="w-full aspect-square bg-white rounded-lg p-1 border border-slate-300 mb-1">
                                    <img src="${imgUrl}" class="w-full h-full object-contain">
                                </div>
                                <span class="text-[10px] font-bold text-slate-200">Opt ${idx+1}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        container.appendChild(wrapper);
    }
}

function renderTestLatinGrid(board, targetCoord) {
    const gridDiv = document.getElementById('test-latin-grid');
    if (!gridDiv) return;
    gridDiv.innerHTML = "";

    board.forEach((row, r) => {
        row.forEach((cell, c) => {
            const cellEl = document.createElement('div');
            cellEl.className = "aspect-square flex items-center justify-center text-lg font-black rounded-lg border border-slate-700 bg-slate-900 text-slate-200 select-none";
            if (r === targetCoord.row && c === targetCoord.col) {
                cellEl.className += " bg-amber-500 text-white border-amber-300 font-extrabold animate-pulse";
                cellEl.innerText = "?";
            } else if (cell !== "") {
                cellEl.innerText = cell;
            } else {
                cellEl.className += " opacity-40";
            }
            gridDiv.appendChild(cellEl);
        });
    });
}

function selectTestLatinSymbol(sym) {
    userAnswers.section1[currentQuestionIndex] = sym;
    renderCurrentQuestion();
    renderBottomQuestionBar();
}

function saveTestMathAnswer() {
    const valA = document.getElementById('test-math-input-A')?.value;
    const valB = document.getElementById('test-math-input-B')?.value;
    const valC = document.getElementById('test-math-input-C')?.value;
    const valD = document.getElementById('test-math-input-D')?.value;

    userAnswers.section2[currentQuestionIndex] = {
        A: valA !== "" ? parseInt(valA) : undefined,
        B: valB !== "" ? parseInt(valB) : undefined,
        C: valC !== "" ? parseInt(valC) : undefined,
        D: valD !== "" ? parseInt(valD) : undefined
    };
    renderBottomQuestionBar();
}

function selectTestFigureOption(group, index) {
    if (!userAnswers.section3[currentQuestionIndex]) {
        userAnswers.section3[currentQuestionIndex] = {};
    }
    if (group === 1) {
        userAnswers.section3[currentQuestionIndex].ans1 = index;
    } else {
        userAnswers.section3[currentQuestionIndex].ans2 = index;
    }
    renderCurrentQuestion();
    renderBottomQuestionBar();
}

function renderBottomQuestionBar() {
    const bar = document.getElementById('bottom-linear-question-bar');
    if (!bar) return;
    bar.innerHTML = "";

    for (let i = 0; i < 20; i++) {
        const isCurrent = (i === currentQuestionIndex);
        const isAnswered = isQuestionAnswered(currentSectionIndex, i);

        const btn = document.createElement('button');
        btn.type = "button";
        btn.onclick = () => jumpToQuestion(i);
        btn.className = `flex-shrink-0 w-10 h-10 rounded-xl font-bold text-xs flex items-center justify-center transition ${
            isCurrent 
                ? 'bg-cyan-500 text-white ring-2 ring-cyan-300 shadow-lg scale-110' 
                : isAnswered 
                    ? 'bg-emerald-600/80 text-white border border-emerald-400' 
                    : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
        }`;
        btn.innerHTML = isAnswered ? `${i+1}<i class="fa-solid fa-check text-[9px] ml-0.5"></i>` : `${i+1}`;
        bar.appendChild(btn);
    }
}

function isQuestionAnswered(secIdx, qIdx) {
    if (secIdx === 0) {
        return !!userAnswers.section1[qIdx];
    } else if (secIdx === 1) {
        const ans = userAnswers.section2[qIdx];
        return ans && (ans.A !== undefined || ans.B !== undefined || ans.C !== undefined || ans.D !== undefined);
    } else {
        const ans = userAnswers.section3[qIdx];
        return ans && (ans.ans1 !== undefined && ans.ans2 !== undefined);
    }
}

function jumpToQuestion(idx) {
    currentQuestionIndex = idx;
    renderCurrentQuestion();
    renderBottomQuestionBar();
}

function handleSectionTimeout() {
    if (currentSectionIndex < 2) {
        openBreakModal();
    } else {
        handleFinalSubmitConfirm();
    }
}

function clickTopRightSubmit() {
    if (currentSectionIndex < 2) {
        openBreakModal();
    } else {
        openModal('final-submit-modal');
    }
}

function openBreakModal() {
    if (sectionTimerInterval) clearInterval(sectionTimerInterval);

    const breakModal = document.getElementById('break-modal');
    if (breakModal) breakModal.classList.remove('hidden');

    breakTimeLeft = 2 * 60;
    updateBreakTimerDisplay();

    breakTimerInterval = setInterval(() => {
        breakTimeLeft--;
        updateBreakTimerDisplay();
        if (breakTimeLeft <= 0) {
            clearInterval(breakTimerInterval);
            closeBreakModalAndNext();
        }
    }, 1000);
}

function updateBreakTimerDisplay() {
    const timerEl = document.getElementById('break-timer-display');
    if (!timerEl) return;
    const mins = Math.floor(breakTimeLeft / 60);
    const secs = breakTimeLeft % 60;
    timerEl.innerText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function skipBreak() {
    if (breakTimerInterval) clearInterval(breakTimerInterval);
    closeBreakModalAndNext();
}

function closeBreakModalAndNext() {
    const breakModal = document.getElementById('break-modal');
    if (breakModal) breakModal.classList.add('hidden');
    startSection(currentSectionIndex + 1);
}

async function handleFinalSubmitConfirm() {
    closeModal('final-submit-modal');
    if (sectionTimerInterval) clearInterval(sectionTimerInterval);

    const examInterface = document.getElementById('test-exam-interface');
    const loadingScreen = document.getElementById('test-loading-screen');
    if (examInterface) examInterface.classList.add('hidden');
    if (loadingScreen) {
        loadingScreen.classList.remove('hidden');
        loadingScreen.querySelector('span').innerText = "Calculating official test results & analytics...";
    }

    try {
        const res = await fetch('/api/test/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userAnswers)
        });

        const data = await res.json();
        if (data.success) {
            if (loadingScreen) loadingScreen.classList.add('hidden');
            renderTestResults(data);
        } else {
            alert("Error submitting test: " + data.message);
        }
    } catch (err) {
        console.error("Submission error:", err);
        alert("Server error submitting test.");
    }
}

function renderTestResults(data) {
    const resultsView = document.getElementById('test-results-view');
    if (!resultsView) return;
    resultsView.classList.remove('hidden');

    if (typeof confetti === 'function') confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 } });

    document.getElementById('res-total-qs').innerText = data.total_questions;
    document.getElementById('res-answered-qs').innerText = data.answered_questions;
    document.getElementById('res-correct-qs').innerText = data.correct_questions;
    document.getElementById('res-wrong-qs').innerText = data.wrong_questions;
    document.getElementById('res-percentage').innerText = `${data.percentage}%`;

    const secLatin = data.sections.latin;
    const secMath = data.sections.math;
    const secFig = data.sections.figure;

    document.getElementById('res-latin-breakdown').innerText = `${secLatin.correct} / 20 correct (${secLatin.answered} answered)`;
    document.getElementById('res-math-breakdown').innerText = `${secMath.correct} / 20 correct (${secMath.answered} answered)`;
    document.getElementById('res-figure-breakdown').innerText = `${secFig.correct} / 20 correct (${secFig.answered} answered)`;
}
