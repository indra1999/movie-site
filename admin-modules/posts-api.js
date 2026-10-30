// ============================================================================
// MODULE 1: POSTS, SEO SLUG GENERATOR & TMDB / JIKAN OPEN-SOURCE API FETCHER
// File: admin-modules/posts-api.js
// ============================================================================

function initPostsModule() {
    const container = document.getElementById('tabSection-posts');
    const customDomain = localStorage.getItem('cineguide_custom_domain') || window.location.origin;

    container.innerHTML = `
        <div class="mb-6">
            <h2 class="text-2xl font-black">Publish Movie, Series or Anime Review</h2>
            <p class="text-xs text-slate-400 mt-1">Auto-fetch metadata via TMDB / Free Jikan API or fill manually with automatic SEO-friendly links.</p>
        </div>

        <!-- API AUTO-FETCH SEARCH BAR -->
        <div class="p-5 rounded-2xl bg-card border border-rose-500/30 mb-6">
            <div class="flex items-center justify-between mb-3">
                <span class="text-xs font-extrabold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                    <i data-lucide="sparkles" class="w-4 h-4"></i> Instant API Data Fetcher (TMDB / Free Anime & Movie API)
                </span>
                <button onclick="switchAdminTab('settings')" class="text-[11px] text-slate-400 hover:text-white underline">Configure API Keys →</button>
            </div>
            <div class="flex flex-col sm:flex-row gap-2.5">
                <select id="apiSourceSelect" class="px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs font-bold">
                    <option value="tmdb_movie">TMDB — Movie</option>
                    <option value="tmdb_tv">TMDB — TV Series</option>
                    <option value="jikan_anime">Free Jikan API — Anime (No Key Needed)</option>
                    <option value="tvmaze_show">Free TVMaze API — Series/Shows (No Key Needed)</option>
                </select>
                <input type="text" id="apiSearchQuery" placeholder="Type title (e.g., The Ugly, Lupin, Naruto, Re:Zero)..." class="flex-1 px-4 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs sm:text-sm focus:outline-none focus:border-rose-500">
                <button type="button" onclick="searchExternalAPI()" class="px-5 py-2.5 rounded-xl accent-bg text-white font-extrabold text-xs shrink-0 hover:opacity-95">
                    Search & Auto-Fill
                </button>
            </div>
            <div id="apiSearchResults" class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3 hidden"></div>
        </div>

        <!-- NEW REVIEW POST FORM -->
        <form onsubmit="saveNewReviewPost(event)" class="p-5 sm:p-6 rounded-2xl bg-card border border-subtle space-y-4 mb-8">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="sm:col-span-2">
                    <label class="text-[11px] font-bold uppercase text-slate-400 block mb-1">Title *</label>
                    <input type="text" id="postTitle" required oninput="updateSEOPermalinkPreview()" placeholder="e.g. The Ugly" class="w-full px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-sm">
                </div>
                <div>
                    <label class="text-[11px] font-bold uppercase text-slate-400 block mb-1">Release Year *</label>
                    <input type="text" id="postYear" required oninput="updateSEOPermalinkPreview()" placeholder="2026" class="w-full px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-sm">
                </div>
            </div>

            <!-- SEO Permalink Preview Box (Point 21) -->
            <div class="p-3 rounded-xl bg-[#090a0f] border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div class="truncate">
                    <span class="font-bold text-emerald-400 mr-1.5">SEO Link Preview:</span>
                    <span id="seoLinkPreview" class="text-slate-300 font-mono">${customDomain}/?post=title-slug</span>
                </div>
                <input type="hidden" id="postSlug">
                <span class="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-bold shrink-0">Google SEO Ready</span>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                    <label class="text-[11px] font-bold uppercase text-slate-400 block mb-1">Main Category</label>
                    <select id="postCategory" class="w-full px-3 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs font-bold">
                        <option value="Movie">Movie</option>
                        <option value="TV Series">TV Series</option>
                        <option value="TV Shows">TV Shows</option>
                        <option value="Anime">Anime</option>
                    </select>
                </div>
                <div>
                    <label class="text-[11px] font-bold uppercase text-slate-400 block mb-1">Industry / Subcategory</label>
                    <input type="text" id="postIndustry" placeholder="Hollywood / Korean Movies" class="w-full px-3 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
                </div>
                <div>
                    <label class="text-[11px] font-bold uppercase text-slate-400 block mb-1">IMDb Rating</label>
                    <input type="text" id="postRating" placeholder="7.8" class="w-full px-3 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
                </div>
                <div>
                    <label class="text-[11px] font-bold uppercase text-slate-400 block mb-1">Safety Verdict</label>
                    <select id="postSafety" class="w-full px-3 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs font-bold">
                        <option value="Safe">Safe (Family Friendly)</option>
                        <option value="Moderate">Moderate (PG-13 Caution)</option>
                        <option value="Strict">Strict (18+ Only)</option>
                    </select>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label class="text-[11px] font-bold uppercase text-slate-400 block mb-1">Poster Image URL (Portrait) *</label>
                    <input type="url" id="postPoster" required placeholder="https://..." class="w-full px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
                </div>
                <div>
                    <label class="text-[11px] font-bold uppercase text-slate-400 block mb-1">Backdrop Image URL (Wide) *</label>
                    <input type="url" id="postBackdrop" required placeholder="https://..." class="w-full px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
                </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <input type="text" id="postLanguage" placeholder="Language (e.g. Korean)" class="px-3 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
                <input type="text" id="postDuration" placeholder="Duration (e.g. 1h 55m)" class="px-3 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
                <input type="text" id="postPlatform" placeholder="Platform (NF / AMZN)" class="px-3 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
                <input type="text" id="postAgeRating" placeholder="Age (PG-13 / TV-14)" class="px-3 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" id="postGenres" placeholder="Genres comma separated (Mystery, Thriller)" class="px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
                <input type="text" id="postTrailer" placeholder="YouTube Embed URL (https://www.youtube.com/embed/...)" class="px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
            </div>

            <div>
                <label class="text-[11px] font-bold uppercase text-slate-400 block mb-1">Story Summary & SEO Description *</label>
                <textarea id="postSummary" rows="3" required placeholder="Plot synopsis..." class="w-full px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs"></textarea>
            </div>

            <!-- Parental Content Guide Inputs -->
            <div class="p-4 rounded-xl bg-[#090a0f] border border-subtle space-y-3">
                <h4 class="text-xs font-extrabold uppercase text-rose-400">Parental Guide Breakdown</h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input type="text" id="pgSex" placeholder="Sex & Nudity (e.g. None — Zero nudity)" class="px-3 py-2 rounded-lg bg-card border border-subtle text-xs">
                    <input type="text" id="pgViolence" placeholder="Violence & Gore (e.g. Moderate action)" class="px-3 py-2 rounded-lg bg-card border border-subtle text-xs">
                    <input type="text" id="pgProfanity" placeholder="Profanity (e.g. Mild language)" class="px-3 py-2 rounded-lg bg-card border border-subtle text-xs">
                    <input type="text" id="pgDrugs" placeholder="Drugs & Alcohol (e.g. None)" class="px-3 py-2 rounded-lg bg-card border border-subtle text-xs">
                </div>
                <input type="text" id="pgVerdict" placeholder="Final Family Verdict (e.g. 100% Safe to watch with parents & kids)" class="w-full px-3 py-2 rounded-lg bg-card border border-subtle text-xs">
            </div>

            <button type="submit" class="w-full py-3.5 rounded-xl accent-bg text-white font-extrabold text-sm shadow-lg hover:opacity-95 transition">
                Publish Review Post
            </button>
        </form>

        <!-- PUBLISHED CUSTOM POSTS LIST -->
        <div>
            <h3 class="text-base font-extrabold mb-3">Your Custom Published Posts</h3>
            <div id="adminPublishedPostsList" class="space-y-2.5"></div>
        </div>
    `;
    renderAdminPublishedPosts();
}

function generateSEOSlug(title, year) {
    return `${title}-${year || ''}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

function updateSEOPermalinkPreview() {
    const title = document.getElementById('postTitle').value.trim() || 'movie-title';
    const year = document.getElementById('postYear').value.trim() || '2026';
    const slug = generateSEOSlug(title, year);
    const domain = (localStorage.getItem('cineguide_custom_domain') || window.location.origin).replace(/\/$/, '');
    document.getElementById('postSlug').value = slug;
    document.getElementById('seoLinkPreview').textContent = `${domain}/?post=${slug}`;
}

// Point 22: Search TMDB or Free Open-Source Jikan / TVMaze APIs
async function searchExternalAPI() {
    const source = document.getElementById('apiSourceSelect').value;
    const query = document.getElementById('apiSearchQuery').value.trim();
    const resultsBox = document.getElementById('apiSearchResults');
    if (!query) return;

    resultsBox.classList.remove('hidden');
    resultsBox.innerHTML = `<p class="text-xs text-slate-400 col-span-full">Searching API...</p>`;

    try {
        if (source === 'jikan_anime') {
            const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=3`);
            const data = await res.json();
            resultsBox.innerHTML = (data.data || []).map(item => `
                <div onclick='fillFormFromAPI(${JSON.stringify({
                    title: item.title_english || item.title,
                    year: item.year || (item.aired?.prop?.from?.year) || '2025',
                    category: 'Anime',
                    industry: 'Anime Movies',
                    rating: item.score || '8.0',
                    poster: item.images?.jpg?.large_image_url || '',
                    backdrop: item.images?.jpg?.large_image_url || '',
                    language: 'Japanese',
                    duration: item.duration || '24m / ep',
                    ageRating: item.rating || 'PG-13',
                    genres: (item.genres || []).map(g => g.name).join(', '),
                    summary: item.synopsis || ''
                }).replace(/'/g, "&apos;")})' class="p-2.5 rounded-xl bg-[#090a0f] border border-subtle hover:border-rose-500 cursor-pointer flex gap-2.5 items-center">
                    <img src="${item.images?.jpg?.image_url}" class="w-12 h-16 object-cover rounded-lg">
                    <div class="overflow-hidden">
                        <h4 class="font-bold text-xs truncate">${item.title}</h4>
                        <p class="text-[10px] text-amber-400">★ ${item.score || 'N/A'} • Anime</p>
                    </div>
                </div>
            `).join('');
        } else if (source === 'tvmaze_show') {
            const res = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            resultsBox.innerHTML = data.slice(0, 3).map(entry => {
                const s = entry.show;
                return `
                <div onclick='fillFormFromAPI(${JSON.stringify({
                    title: s.name,
                    year: (s.premiered || '2025').slice(0, 4),
                    category: 'TV Series',
                    industry: 'English TV Series',
                    rating: s.rating?.average || '7.5',
                    poster: s.image?.original || s.image?.medium || '',
                    backdrop: s.image?.original || s.image?.medium || '',
                    language: s.language || 'English',
                    duration: (s.runtime || 45) + 'm',
                    ageRating: 'TV-14',
                    genres: (s.genres || []).join(', '),
                    summary: (s.summary || '').replace(/<[^>]*>?/gm, '')
                }).replace(/'/g, "&apos;")})' class="p-2.5 rounded-xl bg-[#090a0f] border border-subtle hover:border-rose-500 cursor-pointer flex gap-2.5 items-center">
                    <img src="${s.image?.medium || ''}" class="w-12 h-16 object-cover rounded-lg bg-card">
                    <div class="overflow-hidden">
                        <h4 class="font-bold text-xs truncate">${s.name}</h4>
                        <p class="text-[10px] text-amber-400">★ ${s.rating?.average || '7.5'} • Series</p>
                    </div>
                </div>`;
            }).join('');
        } else {
            // TMDB Movie or TV
            const tmdbKey = localStorage.getItem('cineguide_tmdb_key');
            if (!tmdbKey) {
                resultsBox.innerHTML = `<p class="text-xs text-amber-400 col-span-full">Please save your free TMDB API Key in the "SEO, Footer & Security" tab first, or select the Free Jikan / TVMaze API option!</p>`;
                return;
            }
            const type = source === 'tmdb_tv' ? 'tv' : 'movie';
            const res = await fetch(`https://api.themoviedb.org/3/search/${type}?api_key=${tmdbKey}&query=${encodeURIComponent(query)}`);
            const data = await res.json();
            resultsBox.innerHTML = (data.results || []).slice(0, 3).map(m => `
                <div onclick='fillFormFromAPI(${JSON.stringify({
                    title: m.title || m.name,
                    year: (m.release_date || m.first_air_date || '2025').slice(0, 4),
                    category: type === 'tv' ? 'TV Series' : 'Movie',
                    industry: 'Hollywood',
                    rating: (m.vote_average || 7.0).toFixed(1),
                    poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : '',
                    backdrop: m.backdrop_path ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}` : '',
                    language: (m.original_language || 'EN').toUpperCase(),
                    duration: type === 'tv' ? '1 Season' : '1h 55m',
                    ageRating: m.adult ? '18+' : 'PG-13',
                    genres: 'Drama, Thriller',
                    summary: m.overview || ''
                }).replace(/'/g, "&apos;")})' class="p-2.5 rounded-xl bg-[#090a0f] border border-subtle hover:border-rose-500 cursor-pointer flex gap-2.5 items-center">
                    <img src="https://image.tmdb.org/t/p/w200${m.poster_path}" class="w-12 h-16 object-cover rounded-lg bg-card">
                    <div class="overflow-hidden">
                        <h4 class="font-bold text-xs truncate">${m.title || m.name}</h4>
                        <p class="text-[10px] text-amber-400">★ ${(m.vote_average || 7).toFixed(1)} • ${(m.release_date || m.first_air_date || '').slice(0,4)}</p>
                    </div>
                </div>
            `).join('');
        }
    } catch (err) {
        resultsBox.innerHTML = `<p class="text-xs text-rose-400 col-span-full">API Error. Check internet connection or API Key.</p>`;
    }
}

function fillFormFromAPI(item) {
    document.getElementById('postTitle').value = item.title || '';
    document.getElementById('postYear').value = item.year || '2026';
    document.getElementById('postCategory').value = item.category || 'Movie';
    document.getElementById('postIndustry').value = item.industry || 'Hollywood';
    document.getElementById('postRating').value = item.rating || '7.5';
    document.getElementById('postPoster').value = item.poster || '';
    document.getElementById('postBackdrop').value = item.backdrop || item.poster || '';
    document.getElementById('postLanguage').value = item.language || 'English';
    document.getElementById('postDuration').value = item.duration || '1h 50m';
    document.getElementById('postAgeRating').value = item.ageRating || 'PG-13';
    document.getElementById('postGenres').value = item.genres || 'Drama';
    document.getElementById('postSummary').value = item.summary || '';
    updateSEOPermalinkPreview();
    showAdminToast(`Auto-filled "${item.title}" from API!`);
}

function saveNewReviewPost(e) {
    e.preventDefault();
    const title = document.getElementById('postTitle').value.trim();
    const year = document.getElementById('postYear').value.trim();
    const slug = generateSEOSlug(title, year);
    const genres = document.getElementById('postGenres').value.split(',').map(g => g.trim()).filter(Boolean);
    const industry = document.getElementById('postIndustry').value.trim() || 'Hollywood';
    const category = document.getElementById('postCategory').value;

    const newPost = {
        id: slug || ('rev-' + Date.now()),
        slug: slug,
        title,
        year,
        tagline: document.getElementById('postSummary').value.slice(0, 65) + '...',
        category,
        industry,
        breadcrumb: `${category.toUpperCase()} › ${industry.toUpperCase()}`,
        language: document.getElementById('postLanguage').value.trim() || 'English',
        rating: document.getElementById('postRating').value.trim() || '7.5',
        ageRating: document.getElementById('postAgeRating').value.trim() || 'PG-13',
        duration: document.getElementById('postDuration').value.trim() || '1h 50m',
        platform: document.getElementById('postPlatform').value.trim() || 'HD',
        uploadedAt: Date.now(),
        baseViews: 1,
        safetyLevel: document.getElementById('postSafety').value,
        backdrop: document.getElementById('postBackdrop').value.trim(),
        poster: document.getElementById('postPoster').value.trim(),
        stills: [document.getElementById('postBackdrop').value.trim()],
        trailerUrl: document.getElementById('postTrailer').value.trim() || 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        genres: genres.length ? genres : ['Drama'],
        tags: [industry, year, category, ...genres],
        summary: document.getElementById('postSummary').value.trim(),
        parentalGuide: {
            sexNudity: document.getElementById('pgSex').value.trim() || 'None reported.',
            violence: document.getElementById('pgViolence').value.trim() || 'Mild.',
            profanity: document.getElementById('pgProfanity').value.trim() || 'Mild.',
            drugsAlcohol: document.getElementById('pgDrugs').value.trim() || 'None.'
        },
        verdict: document.getElementById('pgVerdict').value.trim() || 'Suitable for family viewing.',
        cast: [],
        episodes: [],
        defaultComments: []
    };

    const existing = JSON.parse(localStorage.getItem('cineguide_custom_reviews') || '[]');
    existing.unshift(newPost);
    localStorage.setItem('cineguide_custom_reviews', JSON.stringify(existing));

    e.target.reset();
    renderAdminPublishedPosts();
    showAdminToast(`Published "${title}" with SEO slug!`);
}

function renderAdminPublishedPosts() {
    const list = JSON.parse(localStorage.getItem('cineguide_custom_reviews') || '[]');
    const box = document.getElementById('adminPublishedPostsList');
    if (!box) return;
    if (list.length === 0) {
        box.innerHTML = `<p class="text-xs text-slate-500">No custom posts added yet. Default demo posts are active on the site.</p>`;
        return;
    }
    box.innerHTML = list.map((item, idx) => `
        <div class="p-3.5 rounded-xl bg-card border border-subtle flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
                <img src="${item.poster}" class="w-10 h-14 object-cover rounded-lg">
                <div>
                    <h4 class="font-bold text-sm">${item.title} (${item.year})</h4>
                    <p class="text-[11px] text-emerald-400 font-mono">/?post=${item.slug || item.id}</p>
                </div>
            </div>
            <button onclick="deleteCustomPost(${idx})" class="px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-400 hover:bg-rose-600 hover:text-white text-xs font-bold">
                Delete
            </button>
        </div>
    `).join('');
}

function deleteCustomPost(index) {
    const list = JSON.parse(localStorage.getItem('cineguide_custom_reviews') || '[]');
    list.splice(index, 1);
    localStorage.setItem('cineguide_custom_reviews', JSON.stringify(list));
    renderAdminPublishedPosts();
    showAdminToast("Post deleted!");
}
