let currentGames = [];

function getPlatformIcons(platforms) {
    if (!platforms || platforms.length === 0) return '';

    const iconFiles = ["windows", "playstation", "xbox", "nintendo", "linux", "apple", "ios", "android"];
    const detectedIcons = new Set();

    platforms.forEach(p => {
        const name = p.toLowerCase();
        
        if (name.includes("playstation") || name.includes("ps5") || name.includes("ps4")) {
            detectedIcons.add("playstation");
        } 
        else if (name.includes("xbox")) {
            detectedIcons.add("xbox");
        }
        else if (name.includes("nintendo") || name.includes("switch")) {
            detectedIcons.add("nintendo");
        }
        else if (name.includes("windows") || name.includes("pc") || name.includes("microsoft")) {
            detectedIcons.add("windows");
        }
        else {
            iconFiles.forEach(icon => {
                if (name.includes(icon)) detectedIcons.add(icon);
            });
        }
    });

    return Array.from(detectedIcons).map(icon => 
        `<img src="assets/icons/${icon}.svg" class="platform-svg" width="24" height="24">`
    ).join('');
}

function init(data) {
    if (!data) return; // Prevent crash if data is missing

    const today = Math.floor(Date.now() / 1000);
    const windowStart = today - (60 * 86400); // 60 days ago
    
    const processedGames = data.map(game => {
        const releaseDates = game.release_dates || [];
        
        // 1. Find the absolute first release date in the array
        const firstDate = Math.min(...releaseDates.map(rd => rd.date));
        
        // 2. Identify all platforms that launched on that absolute first day
        const originalPlatforms = releaseDates
            .filter(rd => rd.date <= firstDate + 86400) // 24h grace period
            .map(rd => rd.platform.id);

        // 3. Find our current display event (the one in our 2-month window)
        const validEvents = releaseDates
            .filter(rd => rd.date >= windowStart)
            .sort((a, b) => a.date - b.date);
        
        const displayEvent = validEvents[0] || { date: game.first_release_date, platform: { id: 0, name: "TBA" } };

        // 4. SMART LABELING
        let labels = [];

        if (game.status === 4) {
            labels.push({text: "EARLY ACCESS", class: "tag-ea"});
        }
        if (game.category === 2) {
            labels.push({text: "EXPANSION", class: "tag-exp"});
        }
        
        // Port Logic (Original Platform Check)
        const originalReleaseDate = Math.min(...game.release_dates.map(rd => rd.date));
        const originalPlatform = game.release_dates
            .filter(rd => rd.date <= originalReleaseDate + 86400)
            .map(rd => rd.platform.id);

        if (displayEvent.date > (originalReleaseDate + 86400) && !originalPlatform.includes(displayEvent.platform.id)) {
            labels.push({ text: "PORT", class: "tag-port" });
        }

        return {
            date: displayEvent.date,
            platforms: validEvents.filter(rd => rd.date === displayEvent.date).map(rd => rd.platform.name),
            labels: labels,
            details: game,
            steamUrl: game.websites?.find(w => w.category === 13)?.url || ""
        };
    });

    currentGames = processedGames.sort((a, b) => a.date - b.date);
    renderCarousel();
    setupDragScroll();

    const wrapper = document.querySelector('.carousel-wrapper');
    const cards = document.querySelectorAll('.game-card');

    // Find the first card that has a date >= today
    let targetCard = null;
    for (let card of cards) {
        // Assuming you stored the timestamp in a data attribute during render
        // If not, we can find it by index
        if (parseInt(card.dataset.date) >= today) {
            targetCard = card;
            break;
        }
    }

    if (targetCard) {
        // Calculate the position: 
        // Card's left offset - half the wrapper width + half the card width
        const scrollPos = targetCard.offsetLeft - (wrapper.offsetWidth / 2) + (targetCard.offsetWidth / 2);
        
        wrapper.scrollTo({
            left: scrollPos,
            behavior: 'auto'
        });
    }
}

function renderCarousel() {
    // Note: Changed from 'carousel-container' to 'carousel' to match your index.html ID
    const container = document.getElementById('carousel');
    if (!container) return;

    container.innerHTML = currentGames.map((item, index) => {
        const game = item.details;
        const coverUrl = game.cover ? game.cover.url.replace('t_thumb', 't_cover_big') : '';
        
        return `
            <div class="game-card" data-date="${item.date}" onclick="openPopup(${index})">
                <div class="tag-container">
                    ${item.labels.map(l => `<div class="status-tag ${l.class}">${l.text}</div>`).join('')}
                </div>
                <div class="poster-wrapper">
                    <img src="https:${coverUrl}" alt="${game.name}" class="main-cover">
                    <div class="hover-info">
                        ${getPlatformIcons(item.platforms)}
                    </div>
                </div>
                <span class="date-label">${formatDate(item.date)}</span>
            </div>
        `;
    }).join('');
}

function formatDate(timestamp, mode = 'short') {
    if (!timestamp) return "TBA";
    
    const d = new Date(timestamp * 1000);
    const day = d.getDate();
    const year = d.getFullYear();
    
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const getSuffix = (n) => {
        if (n > 3 && n < 21) return 'th'; 
        switch (n % 10) {
            case 1:  return "st";
            case 2:  return "nd";
            case 3:  return "rd";
            default: return "th";
        }
    };

    const monthName = months[d.getMonth()];

    // Mode 1: 'short' -> "7 APR" (Perfect for Carousel Cards)
    if (mode === 'short') {
        return `${day} ${monthName.slice(0, 3).toUpperCase()}`;
    }

    // Mode 2: 'long' -> "7th of April 2026" (Perfect for Popups/Articles)
    const formattedDay = `${day}${getSuffix(day)}`;
    return `${formattedDay} of ${monthName} ${year}`;
}

// THEME TOGGLE
window.toggleTheme = function() {
    const body = document.body;
    const current = body.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    body.setAttribute('data-theme', next);
    document.getElementById('theme-toggle').innerText = next === 'light' ? 'Dark Mode' : 'Light Mode';
}

// LOADING DATA
fetch('games.json')
    .then(response => response.json())
    .then(data => init(data))
    .catch(err => console.error("Error loading games.json:", err));

// --- Drag to Scroll Logic ---
function setupDragScroll() {
    // 1. SELECT BOTH ELEMENTS
    const wrapper = document.querySelector('.carousel-wrapper');
    const container = document.getElementById('carousel');
    
    if (!wrapper || !container) return;

    let isDown = false;
    let startX, scrollLeft, lastX, velocity;
    let dragDistance = 0;
    let rafId = null;

    // 2. LISTEN ON THE CONTAINER (where the cards are)
    container.addEventListener('mousedown', (e) => {
        const isCard = e.target.closest('.game-card');
        if (!isCard) return; 

        isDown = true;
        dragDistance = 0;
        
        // 3. MOVE THE WRAPPER (the element that actually has the scrollbar)
        wrapper.style.scrollBehavior = 'auto';
        startX = e.pageX - wrapper.offsetLeft;
        scrollLeft = wrapper.scrollLeft;
        lastX = e.pageX;
        velocity = 0; // Reset velocity on new click
        
        document.body.classList.add('is-dragging-cards');
        cancelAnimationFrame(rafId);
    });

    window.addEventListener('mouseup', () => {
        if (!isDown) return;
        isDown = false;
        document.body.classList.remove('is-dragging-cards');

        // Momentum Slide
        const beginSlide = () => {
            if (Math.abs(velocity) < 0.2) return;
            wrapper.scrollLeft -= velocity;
            velocity *= 0.99; 
            rafId = requestAnimationFrame(beginSlide);
        };
        requestAnimationFrame(beginSlide);
    });

    // 4. MOVE LISTENER SHOULD BE GLOBAL OR ON CONTAINER
    container.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        
        const x = e.pageX - wrapper.offsetLeft;
        const walk = (x - startX);
        
        velocity = e.pageX - lastX;
        dragDistance += Math.abs(velocity);
        lastX = e.pageX;

        wrapper.scrollLeft = scrollLeft - walk;
    });

    container.addEventListener('click', (e) => {
        if (dragDistance > 10) {
            e.preventDefault();
            e.stopImmediatePropagation();
        }
    }, true);
}

function openPopup(index) {
    const item = currentGames[index];
    const game = item.details;
    const modal = document.getElementById('game-modal');
    const fixUrl = (url) => url ? (url.startsWith('http') ? url : `https:${url}`) : '';

    // 1. Sidebar Data Aggregation
    const devs = game.involved_companies?.filter(c => c.developer).map(c => c.company.name).join(', ') || 'N/A';
    const pubs = game.involved_companies?.filter(c => c.publisher).map(c => c.company.name).join(', ') || 'N/A';
    const modes = game.game_modes?.map(m => m.name).join(', ') || 'N/A';
    
    // Get unique platforms from all release dates
    const allPlatforms = [...new Set(game.release_dates?.map(rd => rd.platform.name))].join(', ') || 'N/A';
    
    const sidebar = document.getElementById('modal-sidebar');
    sidebar.innerHTML = `
        <img src="${fixUrl(game.cover?.url.replace('t_thumb', 't_cover_big'))}" class="sidebar-cover">
        <div class="sidebar-stats">
            <div class="stat-item"><span class="label">DEVELOPER</span><p>${devs}</p></div>
            <div class="stat-item"><span class="label">PUBLISHER</span><p>${pubs}</p></div>
            <div class="stat-item"><span class="label">GAME MODES</span><p>${modes}</p></div>
            <div class="stat-item"><span class="label">ALL PLATFORMS</span><p>${allPlatforms}</p></div>
            <div class="stat-item"><span class="label">GENRES</span><p>${game.genres?.map(g => g.name).join(', ') || 'N/A'}</p></div>
            <div class="stat-item"><span class="label">ORIGINAL RELEASE</span><p>${formatDate(game.first_release_date, "long")}</p></div>
        </div>
    `;

    // 2. Link Logic (Using the Types from your JSON)
    let finalUrl = null;
    let buttonText = "VISIT WEBSITE";
    if (game.websites) {
        const steam = game.websites.find(w => w.type?.type === "Steam");
        const official = game.websites.find(w => w.type?.type === "Official Website");
        finalUrl = steam ? steam.url : (official ? official.url : game.websites[0]?.url);
        buttonText = steam ? "STEAM STORE" : (official ? "OFFICIAL SITE" : "VIEW INFO");
    }

    // 3. Media HTML
    // --- Inside your openPopup function, update the mediaHtml mapping ---
    let mediaHtml = '';

    // 1. Add Video (Keep as is)
    if (game.videos?.[0]) {
        mediaHtml += `<div class="gallery-slide"><iframe src="https://www.youtube.com/embed/${game.videos[0].video_id}" frameborder="0" allowfullscreen></iframe></div>`;
    }

    // 2. Add Clickable Screenshots
    if (game.screenshots) {
        const allFullRes = game.screenshots.map(ss => fixUrl(ss.url.replace('t_thumb', 't_1080p')));
        const urlsJson = JSON.stringify(allFullRes).replace(/"/g, '&quot;'); // Escape for HTML attribute

        mediaHtml += allFullRes.slice(0, 5).map((url, idx) => `
            <div class="gallery-slide">
                <img src="${url}" 
                    class="clickable-screenshot" 
                    onclick="openFullscreenPreview('${url}', ${idx}, '${urlsJson}')">
            </div>`).join('');
    }
    // 4. MAIN INJECTION (Gallery & Button in Footer)
    const updateText = item.labels.map(l => l.text).join(' & ') || 'FULL RELEASE';
    
    document.getElementById('modal-main').innerHTML = `
        <div id="modal-header">
            <h1>${game.name}</h1>
            <div class="update-banner">${updateText} ON ${item.platforms.join(', ').toUpperCase()}</div>
        </div>
        
        <div class="modal-description">${game.summary || 'No description available.'}</div>
        
        <div class="modal-footer-row">
            <div class="gallery-wrapper">
                <button class="gallery-nav prev" onclick="moveGallery(-1)">&#10094;</button>
                <div class="gallery-viewport" id="gallery-viewport">${mediaHtml}</div>
                <button class="gallery-nav next" onclick="moveGallery(1)">&#10095;</button>
                <div class="gallery-dots" id="gallery-dots"></div>
            </div>

            <div class="shop-section">
                ${finalUrl ? `<a href="${finalUrl}" target="_blank" class="steam-link">${buttonText}</a>` : ''}
            </div>
        </div>
    `;

    setupGalleryDots();
    modal.style.display = 'flex';
}

// THE CLOSE LOGIC (Add this once at the bottom of your file)
//function closeModal() {
//    document.getElementById('game-modal').style.display = 'none';
//    document.body.style.overflow = 'auto';
//}

window.addEventListener('keydown', (e) => { if (e.key === "Escape") closeModal(); });
window.addEventListener('mousedown', (e) => {
    if (e.target === document.getElementById('game-modal')) closeModal();
});

// Function to close modal
function closeModal() {
    const modal = document.getElementById('game-modal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto'; // Re-enable scrolling on the main page
}

// 1. Close on Escape Key
window.addEventListener('keydown', (e) => {
    if (e.key === "Escape") closeModal();
});

// 2. Close on Click Outside
window.addEventListener('mousedown', (e) => {
    const modal = document.getElementById('game-modal');
    // If the user clicks the overlay (the dark part) but NOT the content box
    if (e.target === modal) {
        closeModal();
    }
});

let currentGalleryIndex = 0;

function moveGallery(direction) {
    const viewport = document.getElementById('gallery-viewport');
    const slides = document.querySelectorAll('.gallery-slide');
    if (!slides.length) return;

    currentGalleryIndex = (currentGalleryIndex + direction + slides.length) % slides.length;
    
    viewport.scrollTo({
        left: viewport.offsetWidth * currentGalleryIndex,
        behavior: 'smooth'
    });
    updateGalleryDots();
}

function setupGalleryDots() {
    const slides = document.querySelectorAll('.gallery-slide');
    const dotsContainer = document.getElementById('gallery-dots');
    currentGalleryIndex = 0; // Reset index on new popup
    
    dotsContainer.innerHTML = Array.from(slides).map((_, i) => 
        `<div class="gallery-dot ${i === 0 ? 'active' : ''}" onclick="goToGallerySlide(${i})"></div>`
    ).join('');
}

function updateGalleryDots() {
    const dots = document.querySelectorAll('.gallery-dot');
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentGalleryIndex);
    });
}

function goToGallerySlide(index) {
    currentGalleryIndex = index;
    moveGallery(0);
}

let currentPreviewArray = [];
let currentPreviewIndex = 0;

function openFullscreenPreview(url, index, allUrlsJson) {
    currentPreviewArray = JSON.parse(allUrlsJson);
    currentPreviewIndex = index;

    let previewOverlay = document.getElementById('screenshot-preview');
    if (!previewOverlay) {
        previewOverlay = document.createElement('div');
        previewOverlay.id = 'screenshot-preview';
        document.body.appendChild(previewOverlay);
    }

    renderPreview();
    previewOverlay.style.display = 'flex';
}

function renderPreview() {
    const url = currentPreviewArray[currentPreviewIndex];
    const overlay = document.getElementById('screenshot-preview');
    
    overlay.innerHTML = `
        <div class="preview-container">
            <button class="preview-nav prev" onclick="changePreview(-1); event.stopPropagation();">&#10094;</button>
            <img src="${url}" class="preview-image">
            <button class="preview-nav next" onclick="changePreview(1); event.stopPropagation();">&#10095;</button>
            <button class="preview-close" onclick="closeFullscreenPreview()">&#10005;</button>
        </div>
    `;
    
    // Clicking the dark background still closes it
    overlay.onclick = closeFullscreenPreview;
}

function changePreview(step) {
    currentPreviewIndex += step;
    if (currentPreviewIndex < 0) currentPreviewIndex = currentPreviewArray.length - 1;
    if (currentPreviewIndex >= currentPreviewArray.length) currentPreviewIndex = 0;
    renderPreview();
}

function closeFullscreenPreview() {
    document.getElementById('screenshot-preview').style.display = 'none';
}

document.addEventListener('keydown', (e) => {
    const preview = document.getElementById('screenshot-preview');
    if (preview && preview.style.display === 'flex') {
        if (e.key === "ArrowLeft") changePreview(-1);
        if (e.key === "ArrowRight") changePreview(1);
        if (e.key === "Escape") closeFullscreenPreview();
    }
});

// news stuff

async function loadNews() {
    try {
        const response = await fetch('news.json');
        const news = await response.json();
        const grid = document.getElementById('news-grid');

        grid.innerHTML = news.map(item => `
            <div class="news-card">
                <div class="news-image-wrapper">
                    <img src="${item.thumbnail}" class="news-image" loading="lazy">
                </div>
                <div class="news-body">
                    <div class="news-meta">
                        <span class="news-source">${item.source} • ${formatDate(item.date / 1000, 'long')}</span>
                        <span class="news-category-tag">${item.category}</span>
                    </div>
                    <h3 class="news-title">${item.title}</h3>
                    <div class="news-footer">
                        <a href="${item.link}" target="_blank" class="btn-news btn-visit">READ ARTICLE</a>
                        <button class="btn-news btn-copy" onclick="copyToClipboard('${item.link}', this)">COPY LINK</button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error("News load failed:", err);
    }
}

function copyToClipboard(url, btn) {
    navigator.clipboard.writeText(url);
    const original = btn.innerText;
    btn.innerText = "COPIED!";
    btn.style.color = "#4BB543"; // Success Green
    setTimeout(() => {
        btn.innerText = original;
        btn.style.color = "";
    }, 2000);
}

// Call this on page load
loadNews();