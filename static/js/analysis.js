// --- GLOBAL VARIABLES ---
let stage = 1;
const totalStages = 4;

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", function() {
    // 1. Initial Cleanup
    const formContainer = document.getElementById('form-container');
    const loadingBridge = document.getElementById('loading-bridge');
    const reportView = document.getElementById('report-view');

    if(formContainer) formContainer.classList.remove('analysis-hidden');
    if(loadingBridge) loadingBridge.classList.add('analysis-hidden');
    if(reportView) reportView.classList.add('analysis-hidden');

    // 2. Budget Slider Logic
    const budgetRange = document.getElementById('budgetRange');
    const budgetDisplay = document.getElementById('budgetValueDisplay');
    if (budgetRange && budgetDisplay) {
        budgetRange.addEventListener('input', (e) => {
            budgetDisplay.innerText = `₹${parseInt(e.target.value).toLocaleString('en-IN')}`;
        });
    }

    // 3. ATTACH VALIDATION LISTENERS (Real-time checking)
    document.getElementById('input-location').addEventListener('input', () => validateStage(1));
    document.getElementById('input-bill').addEventListener('input', () => validateStage(2));
    document.getElementById('input-area').addEventListener('input', () => validateStage(4));

    // Initial Check (Button ko pehle disable karne ke liye)
    validateStage(1);
});

// --- VALIDATION LOGIC ---
function validateStage(currentStage) {
    let isValid = false;
    const nextBtn = document.getElementById('nextBtn');

    if (currentStage === 1) {
        const loc = document.getElementById('input-location').value.trim();
        // Rule: At least 3 characters, No numbers only
        isValid = loc.length >= 3 && isNaN(loc);
    } 
    else if (currentStage === 2) {
        const bill = document.getElementById('input-bill').value;
        // Rule: Must be number, Positive, and realistic (> 100)
        isValid = bill && !isNaN(bill) && parseInt(bill) > 100;
    } 
    else if (currentStage === 3) {
        // Budget slider is always valid
        isValid = true;
    } 
    else if (currentStage === 4) {
        const area = document.getElementById('input-area').value;
        // Rule: Must be number, Positive (> 50 sq ft)
        isValid = area && !isNaN(area) && parseInt(area) > 50;
    }

    // Update Button State
    if (isValid) {
        nextBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
        nextBtn.classList.add('opacity-100', 'cursor-pointer', 'shadow-[0_0_20px_rgba(250,204,21,0.4)]');
    } else {
        nextBtn.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
        nextBtn.classList.remove('opacity-100', 'cursor-pointer', 'shadow-[0_0_20px_rgba(250,204,21,0.4)]');
    }

    return isValid;
}

// --- STEPPER LOGIC ---
function changeStage(delta) {
    const nextBtn = document.getElementById('nextBtn');

    // 1. BACK BUTTON CLICK
    if (delta === -1) {
        moveStage(delta);
        return;
    }

    // 2. NEXT BUTTON CLICK (Validate first)
    if (!validateStage(stage)) {
        // Agar hack karke click kiya toh error dikhao
        showToast("⚠️ Please enter valid details before proceeding.", "error");
        return;
    }

    // 3. FINAL STAGE -> SUBMIT
    if (stage === totalStages && delta === 1) {
        startLoading();
        return;
    }

    // 4. MOVE TO NEXT STAGE
    moveStage(delta);
}

function moveStage(delta) {
    const nextStage = stage + delta;
    if (nextStage < 1 || nextStage > totalStages) return;

    // Hide Current
    const currentEl = document.getElementById(`stage-${stage}`);
    currentEl.classList.add('analysis-hidden', 'opacity-0');
    currentEl.classList.remove('opacity-100');

    // Show Next
    const nextEl = document.getElementById(`stage-${nextStage}`);
    nextEl.classList.remove('analysis-hidden');
    
    // Slight delay for animation
    setTimeout(() => {
        nextEl.classList.remove('opacity-0');
        nextEl.classList.add('opacity-100');
        
        // Naye stage ke liye validation run karo taaki button reset ho jaye
        validateStage(nextStage);
    }, 50);

    stage = nextStage;
    updateUI();
}

function updateUI() {
    // Update Progress Bar
    const progressBar = document.getElementById('progress-bar');
    if(progressBar) progressBar.style.width = `${((stage - 1) / (totalStages - 1)) * 100}%`;

    // Update Nodes
    for (let i = 1; i <= totalStages; i++) {
        const node = document.getElementById(`node-${i}`);
        if (node) {
            if (i <= stage) { 
                node.classList.replace('border-white/10', 'border-amber-500'); 
                node.classList.replace('text-gray-500', 'text-amber-500'); 
                if (i === stage) node.style.boxShadow = '0 0 20px rgba(250, 204, 21, 0.5)'; 
            } else { 
                node.classList.replace('border-amber-500', 'border-white/10'); 
                node.classList.replace('text-amber-500', 'text-gray-500'); 
                node.style.boxShadow = 'none'; 
            }
        }
    }

    // Buttons Visibility
    const backBtn = document.getElementById('backBtn');
    const nextBtn = document.getElementById('nextBtn');

    if(backBtn) {
        if (stage === 1) backBtn.classList.add('opacity-0', 'pointer-events-none');
        else backBtn.classList.remove('opacity-0', 'pointer-events-none');
    }

    if(nextBtn) {
        nextBtn.innerHTML = stage === totalStages ? 'Generate Report ✨' : 'Next →';
    }
}

// --- CUSTOM TOAST NOTIFICATION (POPUP) ---
function showToast(message, type = "info") {
    // Remove existing toast if any
    const existingToast = document.getElementById('custom-toast');
    if (existingToast) existingToast.remove();

    // Create Toast Element
    const toast = document.createElement('div');
    toast.id = 'custom-toast';
    
    // Style classes based on Amber Theme
    let borderColor = type === 'error' ? 'border-red-500' : 'border-amber-500';
    let icon = type === 'error' ? '🛑' : '✨';
    
    toast.className = `fixed top-5 left-1/2 transform -translate-x-1/2 z-[3000] flex items-center gap-3 px-6 py-4 rounded-xl bg-[#030712] border ${borderColor} shadow-[0_0_20px_rgba(0,0,0,0.8)] text-white font-bold transition-all duration-300 translate-y-[-100px]`;
    
    toast.innerHTML = `
        <span class="text-xl">${icon}</span>
        <span>${message}</span>
    `;

    document.body.appendChild(toast);

    // Animate In
    setTimeout(() => {
        toast.classList.remove('translate-y-[-100px]');
        toast.classList.add('translate-y-0');
    }, 10);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('translate-y-0');
        toast.classList.add('translate-y-[-100px]');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- API & LOADING LOGIC ---
function startLoading() {
    const loc = document.getElementById('input-location').value;
    const bill = document.getElementById('input-bill').value;
    const area = document.getElementById('input-area').value;

    // Final Validation before API Call
    if(!loc || loc.length < 3) { showToast("Invalid Location!", "error"); return; }
    if(!bill || bill <= 100) { showToast("Bill amount too low!", "error"); return; }
    if(!area || area <= 50) { showToast("Roof area too small!", "error"); return; }

    document.getElementById('form-container').classList.add('analysis-hidden');
    document.getElementById('loading-bridge').classList.remove('analysis-hidden');

    fetch('/api/analyze', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ location: loc, bill: bill, area: area })
    })
    .then(r => r.json()).then(data => {
        if(data.success) { renderReport(data); } 
        else { 
            showToast(data.error, "error"); 
            // Reset View
            document.getElementById('loading-bridge').classList.add('analysis-hidden');
            document.getElementById('form-container').classList.remove('analysis-hidden');
        }
    })
    .catch(e => { 
        console.error(e); 
        showToast("Connection Failed. Check Server.", "error"); 
        document.getElementById('loading-bridge').classList.add('analysis-hidden');
        document.getElementById('form-container').classList.remove('analysis-hidden');
    });
}

// --- RENDER REPORT ---
function renderReport(data) {
    document.getElementById('res-location').innerText = data.location;
    document.getElementById('res-size').innerText = data.metrics.system_size + " kW";
    document.getElementById('res-tag').innerText = data.tag;
    
    let costL = (data.metrics.final_cost / 100000).toFixed(2);
    document.getElementById('res-cost').innerText = "₹" + costL + "L";
    document.getElementById('res-subsidy').innerText = `Inc. ₹${(data.metrics.subsidy/1000).toFixed(0)}k Subsidy`;
    
    document.getElementById('res-savings').innerText = "₹" + data.metrics.savings.toLocaleString('en-IN');
    document.getElementById('res-co2').innerText = data.metrics.co2;
    document.getElementById('res-score').innerText = data.score;
    document.getElementById('res-flux-val').innerText = data.flux;
    
    setTimeout(() => { const offset = 314 - (314 * data.score / 100); document.getElementById('score-ring').style.strokeDashoffset = offset; }, 500);

    // Comparison
    const compDiv = document.getElementById('comparison-container'); compDiv.innerHTML = '';
    data.comparison.forEach(city => {
        const width = (city.user / city.yield) * 100;
        const color = city.user >= city.yield ? 'bg-green-500' : 'bg-amber-500';
        compDiv.innerHTML += `
            <div class="mb-3">
                <div class="flex justify-between text-xs font-bold text-gray-400 mb-1">
                    <span>${city.city}</span>
                    <span class="${city.user >= city.yield ? 'text-green-400' : 'text-amber-500'}">${city.city === 'You' ? 'You' : city.yield}</span>
                </div>
                <div class="w-full h-2 bg-white/10 rounded-full overflow-hidden relative border border-white/5">
                    <div class="h-full ${color} shadow-[0_0_10px_currentColor]" style="width: ${Math.min(100, width)}%"></div>
                </div>
            </div>`;
    });

    // Insights
    const insDiv = document.getElementById('insights-container'); insDiv.innerHTML = '';
    data.ai_insights.forEach(tip => {
        // Detect sentiment roughly
        let icon = "💡";
        let colorClass = "text-amber-400";
        if(tip.toLowerCase().includes("risk") || tip.toLowerCase().includes("alert")) { icon = "⚠️"; colorClass = "text-red-400"; }
        else if(tip.toLowerCase().includes("gain") || tip.toLowerCase().includes("save")) { icon = "💰"; colorClass = "text-green-400"; }

        insDiv.innerHTML += `
        <div class="flex gap-3 items-start text-sm p-3 rounded-lg bg-white/5 border border-white/5 hover:border-amber-500/30 transition-all">
            <span class="flex-shrink-0 text-lg">${icon}</span> 
            <span class="text-gray-300 leading-relaxed">${tip}</span>
        </div>`;
    });

    document.getElementById('loading-bridge').classList.add('analysis-hidden');
    document.getElementById('report-view').classList.remove('analysis-hidden');
    initCharts(data);
}

// --- CHARTS (Same as before) ---
function initCharts(data) {
    const commonScales = {
        x: { display: true, grid: { display: false }, ticks: { color: '#9ca3af', font: {size: 11} } }, 
        y: { display: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#6b7280', font: {size: 10} } } 
    };

    new Chart(document.getElementById('gridChart'), {
        type: 'line',
        data: {
            labels: Array.from({length: 25}, (_, i) => `Y${i+1}`),
            datasets: [
                { label: 'Cumulative Savings', data: data.graphs.grid_vs_solar.solar, borderColor: '#facc15', backgroundColor: 'rgba(250, 204, 21, 0.1)', borderWidth: 3, fill: true, tension: 0.4, pointRadius: 0 },
                { label: 'Grid Cost', data: data.graphs.grid_vs_solar.grid, borderColor: '#ef4444', borderWidth: 2, borderDash: [5, 5], pointRadius: 0 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, labels: { color: '#9ca3af' } } }, scales: { x: { ...commonScales.x, ticks: { color: '#9ca3af', maxTicksLimit: 6 } }, y: { ...commonScales.y, ticks: { color: '#6b7280', callback: v => '₹'+(v/100000).toFixed(0)+'L' } } } }
    });

    new Chart(document.getElementById('monthlyChart'), {
        type: 'line',
        data: {
            labels: ['J','F','M','A','M','J','J','A','S','O','N','D'],
            datasets: [{ label: 'Gen (kWh)', data: data.metrics.monthly_gen, borderColor: '#facc15', backgroundColor: '#facc15', borderWidth: 2, tension: 0.4, pointBackgroundColor: '#000', pointBorderColor: '#facc15', pointBorderWidth: 2, pointRadius: 4 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: commonScales.x, y: { ...commonScales.y, title: { display: true, text: 'Units (kWh)', color: '#4b5563', font: {size: 9} } } } }
    });

    new Chart(document.getElementById('sensitivityChart'), {
        type: 'bar',
        data: {
            labels: data.graphs.sensitivity.sizes.map(s => `${s}kW`),
            datasets: [{ label: 'Savings', data: data.graphs.sensitivity.savings, backgroundColor: data.graphs.sensitivity.sizes.map(s => s === data.metrics.system_size ? '#22c55e' : '#facc15'), borderRadius: 4, barThickness: 30 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: commonScales.x, y: { ...commonScales.y, ticks: { color: '#6b7280', callback: v => '₹' + (v / 1000).toFixed(0) + 'k' } } } }
    });
}

// --- PDF DOWNLOAD ---
function downloadReport() {
    const element = document.getElementById('report-view');
    const locationName = document.getElementById('res-location').innerText;
    const opt = { margin: [10, 10], filename: `SolarSensei_Report_${locationName}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, backgroundColor: '#030712' }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
    element.classList.add('pdf-mode');
    html2pdf().set(opt).from(element).save().then(() => { element.classList.remove('pdf-mode'); });
}