let map, marker;
const mumbaiCoords = [19.0760, 72.8777];

document.addEventListener('DOMContentLoaded', function() {
    // 1. Initialize Map (Dark Mode)
    map = L.map('map', { zoomControl: false }).setView(mumbaiCoords, 5);
    
   // --- NEW GREY THEME MAP (Esri Dark Gray) ---
    // Layer 1: Base Map (Grey Land)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Esri',
        maxZoom: 16
    }).addTo(map);

    // Layer 2: Labels & Borders (City Names on Top) - Isse text saaf dikhega
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 16
    }).addTo(map);

    // 2. Click Handler
    map.on('click', function(e) {
        handleMapClick(e.latlng.lat, e.latlng.lng);
    });

    // 3. Search Handler (Enter Key)
    document.getElementById('map-search').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') searchLocation();
    });
});

// --- CORE LOGIC ---

async function handleMapClick(lat, lng) {
    // Remove old marker
    if(marker) map.removeLayer(marker);

    // Add glowing marker
    marker = L.marker([lat, lng], {
        icon: L.divIcon({ 
            className: 'custom-marker', 
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        })
    }).addTo(map);

    // Pan map smoothly
    map.flyTo([lat, lng], 8, { duration: 1.5 });

    // Open Panel & Show Loader
    const panel = document.getElementById('snapshot-panel');
    const loader = document.getElementById('panel-loader');
    const content = document.getElementById('panel-content');
    
    panel.style.transform = 'translateX(0)';
    loader.classList.remove('hidden');
    content.classList.add('hidden');

    try {
        // Fetch Data from Python Backend
        const response = await fetch('/api/explore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: lat, lon: lng })
        });
        
        const data = await response.json();

        if (data.success) {
            updatePanel(data);
            loader.classList.add('hidden');
            content.classList.remove('hidden');
        } else {
            alert("Solar Data Unavailable for this region.");
            closeSnapshot();
        }

    } catch (error) {
        console.error("Map Error:", error);
        loader.classList.add('hidden');
        alert("Connection Error");
    }
}

function updatePanel(data) {
    // Text Data
    document.getElementById('snap-location').innerText = data.location;
    document.getElementById('snap-coords').innerText = data.coords;
    document.getElementById('snap-flux').innerText = data.flux;
    document.getElementById('snap-gen').innerText = data.per_kw_gen.toLocaleString();
    document.getElementById('snap-tag').innerText = data.tag;
    document.getElementById('snap-score').innerText = data.suitability;

    // Visuals (Color Coding)
    const bar = document.getElementById('snap-bar');
    const tag = document.getElementById('snap-tag');
    
    // Reset classes
    tag.className = "text-sm font-bold";
    bar.className = "h-full w-[0%] transition-all duration-1000";

    if (data.flux > 5.0) {
        tag.classList.add("text-green-400");
        bar.classList.add("bg-gradient-to-r", "from-green-600", "to-green-400");
    } else if (data.flux > 4.0) {
        tag.classList.add("text-amber-400");
        bar.classList.add("bg-gradient-to-r", "from-amber-600", "to-amber-400");
    } else {
        tag.classList.add("text-orange-400");
        bar.classList.add("bg-gradient-to-r", "from-orange-600", "to-orange-400");
    }

    // Animate Bar Width
    setTimeout(() => {
        bar.style.width = `${data.suitability}%`;
    }, 100);

    // Update "Full Report" Button Link (Pass Data via URL logic if needed, or just simple link)
    // Here we simply redirect, but ideal UX would auto-fill the form on next page.
    // For now, simple redirect:
    document.getElementById('analyze-btn').onclick = function() {
        window.location.href = '/analyze';
    };
}

// --- UTILS ---

async function searchLocation() {
    const query = document.getElementById('map-search').value;
    if(!query) return;

    // Use Nominatim Public API for Search (Client Side is fine for this)
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`);
        const data = await res.json();
        
        if(data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);
            handleMapClick(lat, lon);
        } else {
            alert("City not found!");
        }
    } catch (e) {
        console.error(e);
    }
}

function closeSnapshot() {
    document.getElementById('snapshot-panel').style.transform = 'translateX(120%)';
    if(marker) map.removeLayer(marker);
}