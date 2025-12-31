/* ==========================================================================
   SOLAR SENSEI - ANALYSIS LOGIC (ROBUST VERSION)
   Handles the multi-step wizard, validation, API communication, and chart rendering.
   Includes safety checks to prevent crashes if backend data is missing.
   ========================================================================== */

// State Management
const state = {
    currentStage: 1,
    totalStages: 4,
    isValid: false
};

// DOM Elements Cache
const dom = {};

document.addEventListener("DOMContentLoaded", () => {
    initDOM();
    initEventListeners();
    resetView();
});

function initDOM() {
    dom.formContainer = document.getElementById('form-container');
    dom.loadingBridge = document.getElementById('loading-bridge');
    dom.reportView = document.getElementById('report-view');
    dom.nextBtn = document.getElementById('nextBtn');
    dom.progressBar = document.getElementById('progress-bar');
    
    // Inputs
    dom.inputLocation = document.getElementById('input-location');
    dom.inputBill = document.getElementById('input-bill');
    dom.inputArea = document.getElementById('input-area');
    dom.budgetRange = document.getElementById('budgetRange');
    dom.budgetDisplay = document.getElementById('budgetValueDisplay');
}

function initEventListeners() {
    // Attach listeners only if elements exist to avoid errors on other pages
    if (dom.inputLocation) dom.inputLocation.addEventListener('input', () => validateCurrentStage());
    if (dom.inputBill) dom.inputBill.addEventListener('input', () => validateCurrentStage());
    if (dom.inputArea) dom.inputArea.addEventListener('input', () => validateCurrentStage());

    if (dom.budgetRange && dom.budgetDisplay) {
        dom.budgetRange.addEventListener('input', (e) => {
            const val = parseInt(e.target.value).toLocaleString('en-IN');
            dom.budgetDisplay.innerText = `₹${val}`;
        });
    }
    
    // Run initial validation
    if (dom.inputLocation) validateCurrentStage();
}

function resetView() {
    if(dom.formContainer) dom.formContainer.classList.remove('analysis-hidden');
    if(dom.loadingBridge) dom.loadingBridge.classList.add('analysis-hidden');
    if(dom.reportView) dom.reportView.classList.add('analysis-hidden');
}

/* --- VALIDATION LOGIC --- */
function validateCurrentStage() {
    let valid = false;
    const stage = state.currentStage;

    if (!dom.inputLocation) return false; // Safety check

    switch (stage) {
        case 1: 
            const loc = dom.inputLocation.value.trim();
            valid = loc.length >= 3 && isNaN(loc);
            break;
        case 2: 
            const bill = parseFloat(dom.inputBill.value);
            valid = !isNaN(bill) && bill > 100;
            break;
        case 3: 
            valid = true; // Slider is always valid
            break;
        case 4: 
            const area = parseFloat(dom.inputArea.value);
            valid = !isNaN(area) && area > 50;
            break;
    }

    state.isValid = valid;
    updateNavigationState(valid);
    return valid;
}

function updateNavigationState(isEnabled) {
    if (!dom.nextBtn) return;
    
    if (isEnabled) {
        dom.nextBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
        dom.nextBtn.classList.add('opacity-100', 'cursor-pointer', 'shadow-[0_0_20px_rgba(250,204,21,0.4)]');
    } else {
        dom.nextBtn.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
        dom.nextBtn.classList.remove('opacity-100', 'cursor-pointer', 'shadow-[0_0_20px_rgba(250,204,21,0.4)]');
    }
}

/* --- NAVIGATION LOGIC --- */
function changeStage(delta) {
    // Going back doesn't require validation
    if (delta === -1) {
        transitionToStage(state.currentStage + delta);
        return;
    }

    // Validate before going forward
    if (!state.isValid) {
        showToast("⚠️ Please enter valid details before proceeding.", "error");
        return;
    }

    // If on last stage and clicking next -> Submit
    if (state.currentStage === state.totalStages && delta === 1) {
        submitAnalysis();
        return;
    }

    transitionToStage(state.currentStage + delta);
}

function transitionToStage(targetStage) {
    if (targetStage < 1 || targetStage > state.totalStages) return;

    const currentEl = document.getElementById(`stage-${state.currentStage}`);
    const nextEl = document.getElementById(`stage-${targetStage}`);
    
    if (currentEl) {
        currentEl.classList.add('analysis-hidden', 'opacity-0');
        currentEl.classList.remove('opacity-100');
    }

    if (nextEl) {
        nextEl.classList.remove('analysis-hidden');
        
        state.currentStage = targetStage;
        updateUI();
        
        // Slight delay for fade-in animation
        setTimeout(() => {
            nextEl.classList.remove('opacity-0');
            nextEl.classList.add('opacity-100');
            validateCurrentStage();
        }, 50);
    }
}

function updateUI() {
    // Update Progress Bar
    const progressPercentage = ((state.currentStage - 1) / (state.totalStages - 1)) * 100;
    if (dom.progressBar) dom.progressBar.style.width = `${progressPercentage}%`;

    // Update Stepper Nodes
    for (let i = 1; i <= state.totalStages; i++) {
        const node = document.getElementById(`node-${i}`);
        if (!node) continue;

        if (i <= state.currentStage) {
            node.classList.replace('border-white/10', 'border-amber-500');
            node.classList.replace('text-gray-500', 'text-amber-500');
            // Add glow only to the current active step
            node.style.boxShadow = (i === state.currentStage) ? '0 0 20px rgba(250, 204, 21, 0.5)' : 'none';
        } else {
            node.classList.replace('border-amber-500', 'border-white/10');
            node.classList.replace('text-amber-500', 'text-gray-500');
            node.style.boxShadow = 'none';
        }
    }

    // Button Logic
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        if (state.currentStage === 1) backBtn.classList.add('opacity-0', 'pointer-events-none');
        else backBtn.classList.remove('opacity-0', 'pointer-events-none');
    }

    if (dom.nextBtn) {
        dom.nextBtn.innerHTML = (state.currentStage === state.totalStages) ? 'Generate Report ✨' : 'Next →';
    }
}

/* --- API & REPORT GENERATION --- */
function submitAnalysis() {
    const payload = {
        location: dom.inputLocation.value,
        bill: dom.inputBill.value,
        area: dom.inputArea.value
    };

    // Switch to Loading View
    dom.formContainer.classList.add('analysis-hidden');
    dom.loadingBridge.classList.remove('analysis-hidden');

    fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            renderReport(data);
        } else {
            throw new Error(data.error || "Analysis failed");
        }
    })
    .catch(err => {
        console.error("API Error:", err);
        showToast("Analysis Error. Check Console.", "error");
        
        // Revert to form on error
        dom.loadingBridge.classList.add('analysis-hidden');
        dom.formContainer.classList.remove('analysis-hidden');
    });
}

function renderReport(data) {
    // Helper to safely set text or default to "--"
    const safeMetric = (val, prefix='', suffix='') => val ? `${prefix}${val}${suffix}` : '--';

    setText('res-location', data.location || "Unknown");
    setText('res-size', safeMetric(data.metrics?.system_size, '', ' kW'));
    setText('res-tag', data.tag || "Standard");
    setText('res-cost', data.metrics?.final_cost ? `₹${(data.metrics.final_cost / 100000).toFixed(2)}L` : "--");
    setText('res-subsidy', data.metrics?.subsidy ? `Inc. ₹${(data.metrics.subsidy / 1000).toFixed(0)}k Subsidy` : "");
    setText('res-savings', data.metrics?.savings ? `₹${data.metrics.savings.toLocaleString('en-IN')}` : "--");
    setText('res-co2', safeMetric(data.metrics?.co2));
    setText('res-score', data.score || 0);
    setText('res-flux-val', data.flux || 0);

    // FIXED: Use empty array [] if data is missing to prevent .map() crash
    renderComparison(data.comparison || []); 
    renderInsights(data.ai_insights || []);
    
    // Charts need safe data too
    initCharts(data);

    // Show Report
    dom.loadingBridge.classList.add('analysis-hidden');
    dom.reportView.classList.remove('analysis-hidden');
}

const setText = (id, val) => {
    const el = document.getElementById(id);
    if(el) el.innerText = val;
};

function renderComparison(comparisonData) {
    const container = document.getElementById('comparison-container');
    if (!container) return;
    
    // Guard Clause: If data is missing or empty, show placeholder
    if (!Array.isArray(comparisonData) || comparisonData.length === 0) {
        container.innerHTML = "<p class='text-gray-500 text-xs italic'>Benchmark data unavailable.</p>";
        return;
    }

    container.innerHTML = comparisonData.map(city => {
        const percentage = Math.min(100, (city.user / city.yield) * 100);
        const isUserWinning = city.user >= city.yield;
        return `
            <div class="mb-3">
                <div class="flex justify-between text-xs font-bold text-gray-400 mb-1">
                    <span>${city.city}</span>
                    <span class="${isUserWinning ? 'text-green-400' : 'text-amber-500'}">${city.city === 'You' ? 'You' : city.yield}</span>
                </div>
                <div class="w-full h-2 bg-white/10 rounded-full overflow-hidden relative border border-white/5">
                    <div class="h-full ${isUserWinning ? 'bg-green-500' : 'bg-amber-500'} shadow-[0_0_10px_currentColor]" style="width: ${percentage}%"></div>
                </div>
            </div>`;
    }).join('');
}

function renderInsights(insights) {
    const container = document.getElementById('insights-container');
    if (!container) return;

    // Guard Clause
    if (!Array.isArray(insights) || insights.length === 0) {
        container.innerHTML = "<p class='text-gray-500 italic'>AI insights unavailable.</p>";
        return;
    }

    container.innerHTML = insights.map(tip => {
        let icon = "💡";
        let styleClass = "border-white/5";
        const lowerTip = tip.toLowerCase();
        
        if (lowerTip.includes("risk")) { icon = "⚠️"; styleClass = "border-red-500/20"; }
        else if (lowerTip.includes("save") || lowerTip.includes("gain")) { icon = "💰"; styleClass = "border-green-500/20"; }

        return `
            <div class="flex gap-3 items-start text-sm p-3 rounded-lg bg-white/5 border ${styleClass}">
                <span class="flex-shrink-0 text-lg">${icon}</span> 
                <span class="text-gray-300 leading-relaxed">${tip}</span>
            </div>`;
    }).join('');
}

/* --- CHARTS (With Safety Checks) --- */
function initCharts(data) {
    // Use optional chaining (?.) and fallback to empty arrays ([])
    const sizes = data.graphs?.sensitivity?.sizes || [];
    const savings = data.graphs?.sensitivity?.savings || [];
    const monthlyGen = data.metrics?.monthly_gen || [];
    const solarSavings = data.graphs?.grid_vs_solar?.solar || [];
    const gridCost = data.graphs?.grid_vs_solar?.grid || [];

    const commonOpt = {
        responsive: true, maintainAspectRatio: false,
        scales: { x: { display: false }, y: { display: false } },
        plugins: { legend: { display: false } }
    };

    // 1. Grid vs Solar Chart
    const ctxGrid = document.getElementById('gridChart');
    if (ctxGrid) {
        new Chart(ctxGrid, {
            type: 'line',
            data: {
                labels: Array.from({length: 25}, (_,i)=>i),
                datasets: [
                    { data: solarSavings, borderColor: '#facc15', fill: true, backgroundColor: 'rgba(250, 204, 21, 0.1)' }, 
                    { data: gridCost, borderColor: '#ef4444', borderDash: [5,5] }
                ]
            },
            options: commonOpt
        });
    }

    // 2. Monthly Generation Chart
    const ctxMonthly = document.getElementById('monthlyChart');
    if (ctxMonthly) {
        new Chart(ctxMonthly, {
            type: 'line',
            data: {
                labels: ['J','F','M','A','M','J','J','A','S','O','N','D'],
                datasets: [{ data: monthlyGen, borderColor: '#facc15', backgroundColor: '#facc15' }]
            },
            options: commonOpt
        });
    }

    // 3. Sensitivity Chart
    const ctxSens = document.getElementById('sensitivityChart');
    if (ctxSens) {
        new Chart(ctxSens, {
            type: 'bar',
            data: {
                labels: sizes,
                datasets: [{ data: savings, backgroundColor: '#facc15', borderRadius: 4 }]
            },
            options: commonOpt
        });
    }
}

// Custom Toast Notification
function showToast(message, type = "info") {
    const t = document.createElement('div');
    const borderColor = type === 'error' ? 'border-red-500' : 'border-amber-500';
    t.className = `fixed top-5 left-1/2 -translate-x-1/2 z-[3000] px-6 py-4 rounded-xl bg-gray-900 border ${borderColor} text-white font-bold shadow-lg`;
    t.innerHTML = message;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

function downloadReport() {
    const el = document.getElementById('report-view');
    html2pdf().from(el).save();
}