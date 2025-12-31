/* ==========================================================================
   SOLAR SENSEI - ANALYSIS LOGIC
   Handles the multi-step wizard, validation, API communication, and chart rendering.
   ========================================================================== */

// State Management
const state = {
    currentStage: 1,
    totalStages: 4,
    isValid: false
};

// DOM Elements Cache (Populated on load)
const dom = {};

document.addEventListener("DOMContentLoaded", () => {
    initDOM();
    initEventListeners();
    resetView();
});

/**
 * Initialize DOM references to avoid repeated document.getElementById calls
 */
function initDOM() {
    dom.formContainer = document.getElementById('form-container');
    dom.loadingBridge = document.getElementById('loading-bridge');
    dom.reportView = document.getElementById('report-view');
    dom.nextBtn = document.getElementById('nextBtn');
    dom.backBtn = document.getElementById('backBtn');
    dom.progressBar = document.getElementById('progress-bar');
    
    // Inputs
    dom.inputLocation = document.getElementById('input-location');
    dom.inputBill = document.getElementById('input-bill');
    dom.inputArea = document.getElementById('input-area');
    dom.budgetRange = document.getElementById('budgetRange');
    dom.budgetDisplay = document.getElementById('budgetValueDisplay');
}

/**
 * Bind all necessary event listeners
 */
function initEventListeners() {
    // Real-time Validation Listeners
    if (dom.inputLocation) dom.inputLocation.addEventListener('input', () => validateCurrentStage());
    if (dom.inputBill) dom.inputBill.addEventListener('input', () => validateCurrentStage());
    if (dom.inputArea) dom.inputArea.addEventListener('input', () => validateCurrentStage());

    // Budget Slider UI Update
    if (dom.budgetRange && dom.budgetDisplay) {
        dom.budgetRange.addEventListener('input', (e) => {
            const val = parseInt(e.target.value).toLocaleString('en-IN');
            dom.budgetDisplay.innerText = `₹${val}`;
        });
    }

    // Run initial validation check
    validateCurrentStage();
}

/**
 * Resets the view state to show the form first
 */
function resetView() {
    dom.formContainer?.classList.remove('analysis-hidden');
    dom.loadingBridge?.classList.add('analysis-hidden');
    dom.reportView?.classList.add('analysis-hidden');
}

/* ==========================================================================
   VALIDATION LOGIC
   ========================================================================== */

function validateCurrentStage() {
    let valid = false;
    const stage = state.currentStage;

    switch (stage) {
        case 1: // Location Check
            const loc = dom.inputLocation.value.trim();
            // User must type at least 3 chars and it shouldn't be just numbers
            valid = loc.length >= 3 && isNaN(loc);
            break;

        case 2: // Bill Amount Check
            const bill = parseFloat(dom.inputBill.value);
            // Must be a number > 100 (Unrealistic to have bill < 100)
            valid = !isNaN(bill) && bill > 100;
            break;

        case 3: // Budget (Slider is always valid)
            valid = true;
            break;

        case 4: // Roof Area Check
            const area = parseFloat(dom.inputArea.value);
            // Minimum 50 sq ft required for a basic panel
            valid = !isNaN(area) && area > 50;
            break;
    }

    state.isValid = valid;
    updateNavigationState(valid);
    return valid;
}

function updateNavigationState(isEnabled) {
    if (isEnabled) {
        dom.nextBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
        dom.nextBtn.classList.add('opacity-100', 'cursor-pointer', 'shadow-[0_0_20px_rgba(250,204,21,0.4)]');
    } else {
        dom.nextBtn.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
        dom.nextBtn.classList.remove('opacity-100', 'cursor-pointer', 'shadow-[0_0_20px_rgba(250,204,21,0.4)]');
    }
}

/* ==========================================================================
   NAVIGATION & STEPPER
   ========================================================================== */

/**
 * Handles navigation clicks (Next/Back)
 * @param {number} delta - +1 for Next, -1 for Back
 */
function changeStage(delta) {
    // Allow going back without validation
    if (delta === -1) {
        transitionToStage(state.currentStage + delta);
        return;
    }

    // Block going forward if invalid
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

    // 1. Hide Current Stage with Fade Out
    const currentEl = document.getElementById(`stage-${state.currentStage}`);
    currentEl.classList.add('analysis-hidden', 'opacity-0');
    currentEl.classList.remove('opacity-100');

    // 2. Prepare Next Stage
    const nextEl = document.getElementById(`stage-${targetStage}`);
    nextEl.classList.remove('analysis-hidden');

    // 3. Update State
    state.currentStage = targetStage;
    updateUI();

    // 4. Fade In Next Stage (Small delay for smoothness)
    setTimeout(() => {
        nextEl.classList.remove('opacity-0');
        nextEl.classList.add('opacity-100');
        validateCurrentStage(); // Re-validate new stage to update button state
    }, 50);
}

function updateUI() {
    // Progress Bar
    const progressPercentage = ((state.currentStage - 1) / (state.totalStages - 1)) * 100;
    if (dom.progressBar) dom.progressBar.style.width = `${progressPercentage}%`;

    // Update Top Nodes (Circles)
    for (let i = 1; i <= state.totalStages; i++) {
        const node = document.getElementById(`node-${i}`);
        if (!node) continue;

        if (i <= state.currentStage) {
            // Active or Completed Node
            node.classList.replace('border-white/10', 'border-amber-500');
            node.classList.replace('text-gray-500', 'text-amber-500');
            
            // Only add glow to the strictly current node
            if (i === state.currentStage) {
                node.style.boxShadow = '0 0 20px rgba(250, 204, 21, 0.5)';
            } else {
                node.style.boxShadow = 'none';
            }
        } else {
            // Future Node
            node.classList.replace('border-amber-500', 'border-white/10');
            node.classList.replace('text-amber-500', 'text-gray-500');
            node.style.boxShadow = 'none';
        }
    }

    // Button Visibility Logic
    if (dom.backBtn) {
        if (state.currentStage === 1) dom.backBtn.classList.add('opacity-0', 'pointer-events-none');
        else dom.backBtn.classList.remove('opacity-0', 'pointer-events-none');
    }

    if (dom.nextBtn) {
        dom.nextBtn.innerHTML = (state.currentStage === state.totalStages) 
            ? 'Generate Report ✨' 
            : 'Next →';
    }
}

/* ==========================================================================
   API & REPORT GENERATION
   ========================================================================== */

function submitAnalysis() {
    // Sanity check before network request
    const payload = {
        location: dom.inputLocation.value,
        bill: dom.inputBill.value,
        area: dom.inputArea.value
    };

    if (!payload.location || !payload.bill || !payload.area) {
        showToast("Missing required fields.", "error");
        return;
    }

    // UI: Switch to Loading View
    dom.formContainer.classList.add('analysis-hidden');
    dom.loadingBridge.classList.remove('analysis-hidden');

    // API Call
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
        showToast(err.message || "Connection Failed. Try again.", "error");
        
        // Revert UI on error
        dom.loadingBridge.classList.add('analysis-hidden');
        dom.formContainer.classList.remove('analysis-hidden');
    });
}

function renderReport(data) {
    // 1. Populate Text Metrics
    setText('res-location', data.location);
    setText('res-size', `${data.metrics.system_size} kW`);
    setText('res-tag', data.tag);
    setText('res-cost', `₹${(data.metrics.final_cost / 100000).toFixed(2)}L`);
    setText('res-subsidy', `Inc. ₹${(data.metrics.subsidy / 1000).toFixed(0)}k Subsidy`);
    setText('res-savings', `₹${data.metrics.savings.toLocaleString('en-IN')}`);
    setText('res-co2', data.metrics.co2);
    setText('res-score', data.score);
    setText('res-flux-val', data.flux);

    // 2. Animate Score Ring (SVG Stroke Offset)
    setTimeout(() => {
        const offset = 314 - (314 * data.score / 100);
        const ring = document.getElementById('score-ring');
        if(ring) ring.style.strokeDashoffset = offset;
    }, 500);

    // 3. Render Comparison Bars
    renderComparison(data.comparison);

    // 4. Render Insights
    renderInsights(data.ai_insights);

    // 5. Initialize Charts
    initCharts(data);

    // 6. Switch View
    dom.loadingBridge.classList.add('analysis-hidden');
    dom.reportView.classList.remove('analysis-hidden');
}

// Helper to safely set text content
const setText = (id, val) => {
    const el = document.getElementById(id);
    if(el) el.innerText = val;
};

function renderComparison(comparisonData) {
    const container = document.getElementById('comparison-container');
    if (!container) return;

    container.innerHTML = comparisonData.map(city => {
        const percentage = Math.min(100, (city.user / city.yield) * 100);
        const isUserWinning = city.user >= city.yield;
        const colorClass = isUserWinning ? 'bg-green-500' : 'bg-amber-500';
        const textColor = isUserWinning ? 'text-green-400' : 'text-amber-500';

        return `
            <div class="mb-3">
                <div class="flex justify-between text-xs font-bold text-gray-400 mb-1">
                    <span>${city.city}</span>
                    <span class="${textColor}">${city.city === 'You' ? 'You' : city.yield}</span>
                </div>
                <div class="w-full h-2 bg-white/10 rounded-full overflow-hidden relative border border-white/5">
                    <div class="h-full ${colorClass} shadow-[0_0_10px_currentColor] transition-all duration-1000" style="width: ${percentage}%"></div>
                </div>
            </div>`;
    }).join('');
}

function renderInsights(insights) {
    const container = document.getElementById('insights-container');
    if (!container) return;

    container.innerHTML = insights.map(tip => {
        let icon = "💡";
        let styleClass = "border-white/5 hover:border-amber-500/30";

        // Simple sentiment analysis for styling
        const lowerTip = tip.toLowerCase();
        if (lowerTip.includes("risk") || lowerTip.includes("alert")) {
            icon = "⚠️";
            styleClass = "border-red-500/20 hover:border-red-500/50";
        } else if (lowerTip.includes("gain") || lowerTip.includes("save")) {
            icon = "💰";
            styleClass = "border-green-500/20 hover:border-green-500/50";
        }

        return `
            <div class="flex gap-3 items-start text-sm p-3 rounded-lg bg-white/5 border ${styleClass} transition-all">
                <span class="flex-shrink-0 text-lg">${icon}</span> 
                <span class="text-gray-300 leading-relaxed">${tip}</span>
            </div>`;
    }).join('');
}

/* ==========================================================================
   CHARTS (Chart.js Configuration)
   ========================================================================== */

function initCharts(data) {
    // Common Styles for uniformity
    const axisStyles = {
        x: { display: true, grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 11 } } },
        y: { display: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#6b7280', font: { size: 10 } } }
    };

    // 1. Grid vs Solar Cost (Line Chart)
    const ctxGrid = document.getElementById('gridChart');
    if (ctxGrid) {
        new Chart(ctxGrid, {
            type: 'line',
            data: {
                labels: Array.from({ length: 25 }, (_, i) => `Y${i + 1}`),
                datasets: [
                    {
                        label: 'Cumulative Savings',
                        data: data.graphs.grid_vs_solar.solar,
                        borderColor: '#facc15',
                        backgroundColor: 'rgba(250, 204, 21, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0
                    },
                    {
                        label: 'Grid Cost',
                        data: data.graphs.grid_vs_solar.grid,
                        borderColor: '#ef4444',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: true, labels: { color: '#9ca3af' } } },
                scales: {
                    x: { ...axisStyles.x, ticks: { ...axisStyles.x.ticks, maxTicksLimit: 6 } },
                    y: { ...axisStyles.y, ticks: { ...axisStyles.y.ticks, callback: v => '₹' + (v / 100000).toFixed(0) + 'L' } }
                }
            }
        });
    }

    // 2. Monthly Generation (Line/Area Chart)
    const ctxMonthly = document.getElementById('monthlyChart');
    if (ctxMonthly) {
        new Chart(ctxMonthly, {
            type: 'line',
            data: {
                labels: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'],
                datasets: [{
                    label: 'Gen (kWh)',
                    data: data.metrics.monthly_gen,
                    borderColor: '#facc15',
                    backgroundColor: '#facc15',
                    borderWidth: 2,
                    tension: 0.4,
                    pointBackgroundColor: '#000',
                    pointBorderColor: '#facc15',
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: axisStyles.x,
                    y: { ...axisStyles.y, title: { display: true, text: 'Units (kWh)', color: '#4b5563', font: { size: 9 } } }
                }
            }
        });
    }

    // 3. Sensitivity Analysis (Bar Chart)
    const ctxSensitivity = document.getElementById('sensitivityChart');
    if (ctxSensitivity) {
        new Chart(ctxSensitivity, {
            type: 'bar',
            data: {
                labels: data.graphs.sensitivity.sizes.map(s => `${s}kW`),
                datasets: [{
                    label: 'Savings',
                    data: data.graphs.sensitivity.savings,
                    backgroundColor: data.graphs.sensitivity.sizes.map(s => s === data.metrics.system_size ? '#22c55e' : '#facc15'),
                    borderRadius: 4,
                    barThickness: 30
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: axisStyles.x,
                    y: { ...axisStyles.y, ticks: { ...axisStyles.y.ticks, callback: v => '₹' + (v / 1000).toFixed(0) + 'k' } }
                }
            }
        });
    }
}

/* ==========================================================================
   UTILITIES
   ========================================================================== */

/**
 * Creates a floating toast notification
 */
function showToast(message, type = "info") {
    // Clean up old toasts first
    const existing = document.getElementById('custom-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'custom-toast';

    const config = type === 'error' 
        ? { border: 'border-red-500', icon: '🛑' } 
        : { border: 'border-amber-500', icon: '✨' };

    toast.className = `fixed top-5 left-1/2 transform -translate-x-1/2 z-[3000] flex items-center gap-3 px-6 py-4 rounded-xl bg-[#030712] border ${config.border} shadow-[0_0_20px_rgba(0,0,0,0.8)] text-white font-bold transition-all duration-300 translate-y-[-100px]`;
    toast.innerHTML = `<span class="text-xl">${config.icon}</span><span>${message}</span>`;

    document.body.appendChild(toast);

    // Entrance Animation
    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-[-100px]');
        toast.classList.add('translate-y-0');
    });

    // Auto Dismiss
    setTimeout(() => {
        toast.classList.remove('translate-y-0');
        toast.classList.add('translate-y-[-100px]');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * HTML2PDF Wrapper for report download
 */
function downloadReport() {
    const element = document.getElementById('report-view');
    const locName = document.getElementById('res-location').innerText;
    
    // Config for better quality
    const opt = {
        margin: [10, 10],
        filename: `SolarSensei_Report_${locName}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#030712' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Temporary class for PDF specific styling if needed
    element.classList.add('pdf-mode');

    html2pdf().set(opt).from(element).save()
        .then(() => element.classList.remove('pdf-mode'))
        .catch(err => console.error("PDF Gen Error:", err));
}