/* ==========================================================================
   SOLAR MAP EXPLORER
   Interactive map using Leaflet.js with Esri Dark Gray tiles.
   Handles clicks, search queries, and side-panel data updates.
   ========================================================================== */

let map, marker;
const DEFAULT_COORDS = [19.0760, 72.8777]; // Mumbai (Default Center)

document.addEventListener('DOMContentLoaded', function() {
    initMap();
    initSearch();
});

/**
 * Initialize the Leaflet map with custom dark theme tiles
 */
function initMap() {
    // 1. Create Map Instance
    map = L.map('map', { 
        zoomControl: false, // We can add custom controls later if needed
        attributionControl: false // Cleaner look
    }).setView(DEFAULT_COORDS, 5);
    
    // 2. Add "Dark Gray Base" Layer (The landmass)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 16
    }).addTo(map);

    // 3. Add "Reference" Layer (Labels & Borders on top)
    // This ensures city names are legible on top of the dark map
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 16
    }).addTo(map);

    // 4. Attach Click Event
    map.on('click', function(e) {
        handleMapInteraction(e.latlng.lat, e.latlng.lng);
    });
}

/**
 * Initialize the search bar listener
 */
function initSearch() {
    const searchInput = document.getElementById('map-search');
    if (searchInput) {
        searchInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') performSearch();
        });
    }
}

/* ==========================================================================
   CORE INTERACTION LOGIC
   ========================================================================== */

/**
 * Handles both map clicks and search results.
 * 1. Drops a marker.
 * 2. Pans the map.
 * 3. Fetches solar data from the Python backend.
 */
async function handleMapInteraction(lat, lng) {
    // 1. UI Updates (Marker & Map Move)
    if(marker) map.removeLayer(marker);

    // Custom Glowing Marker using CSS class
    marker = L.marker([lat, lng], {
        icon: L.divIcon({ 
            className: 'custom-marker', 
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        })
    }).addTo(map);

    map.flyTo([lat, lng], 8, { duration: 1.5 });

    // 2. Open Side Panel & Show Loader
    const panel = document.getElementById('snapshot-panel');
    const loader = document.getElementById('panel-loader');
    const content = document.getElementById('panel-content');
    
    if(panel) {
        panel.style.transform = 'translateX(0)';
        loader.classList.remove('hidden');
        content.classList.add('hidden');
    }

    // 3. API Call to Backend
    try {
        const response = await fetch('/api/explore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: lat, lon: lng })
        });
        
        const data = await response.json();

        if (data.success) {
            updateSidePanel(data);
            loader.classList.add('hidden');
            content.classList.remove('hidden');
        } else {
            alert("Solar Data Unavailable for this region.");
            closeSnapshot();
        }

    } catch (error) {
        console.error("SolarSensei Map Error:", error);
        if(loader) loader.classList.add('hidden');
        alert("Connection Error. Please try again.");
    }
}

/**
 * Updates the side panel HTML with fetched data
 */
function updateSidePanel(data) {
    // 1. Text Fields
    document.getElementById('snap-location').innerText = data.location;
    document.getElementById('snap-coords').innerText = data.coords;
    document.getElementById('snap-flux').innerText = data.flux;
    document.getElementById('snap-gen').innerText = data.per_kw_gen.toLocaleString();
    document.getElementById('snap-tag').innerText = data.tag;
    document.getElementById('snap-score').innerText = data.suitability;

    // 2. Visual Logic (Color Coding based on Solar Flux)
    const bar = document.getElementById('snap-bar');
    const tag = document.getElementById('snap-tag');
    
    // Reset base classes
    tag.className = "text-sm font-bold";
    bar.className = "h-full w-[0%] transition-all duration-1000 rounded-full";
    // Remove old gradient classes (safe way is to overwrite className or use specific logic)
    // For simplicity, we re-assign standard Tailwind gradients below:

    if (data.flux > 5.0) {
        // Excellent
        tag.classList.add("text-green-400");
        bar.classList.add("bg-gradient-to-r", "from-green-600", "to-green-400");
    } else if (data.flux > 4.0) {
        // Good
        tag.classList.add("text-amber-400");
        bar.classList.add("bg-gradient-to-r", "from-amber-600", "to-amber-400");
    } else {
        // Average
        tag.classList.add("text-orange-400");
        bar.classList.add("bg-gradient-to-r", "from-orange-600", "to-orange-400");
    }

    // Animate the Suitability Bar
    setTimeout(() => {
        bar.style.width = `${data.suitability}%`;
    }, 100);

    // 3. Button Action
    document.getElementById('analyze-btn').onclick = function() {
        window.location.href = '/analyze';
    };
}

/* ==========================================================================
   UTILITY FUNCTIONS
   ========================================================================== */

/**
 * Search logic using OpenStreetMap (Nominatim)
 */
async function performSearch() {
    const query = document.getElementById('map-search').value;
    if(!query) return;

    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`);
        const data = await res.json();
        
        if(data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);
            handleMapInteraction(lat, lon);
        } else {
            alert("Location not found! Try a major city name.");
        }
    } catch (e) {
        console.error("Search API Error:", e);
    }
}

/**
 * Closes the side panel
 */
function closeSnapshot() {
    const panel = document.getElementById('snapshot-panel');
    if(panel) panel.style.transform = 'translateX(120%)';
    
    // Optional: Remove marker when closing
    // if(marker) map.removeLayer(marker);
}