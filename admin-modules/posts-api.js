// ============================================================================
// MODULE 1: POSTS, TMDB API (Link/ID Search + Trailer + Cast + Seasons), MANAGE TAB
// File: admin-modules/posts-api.js
// ============================================================================

let editingPostId = null;

const defaultDemoPosts = [
    {
        id: 'def-1',
        slug: 'verity-2026',
        title: 'Verity',
        year: '2026',
        tagline: 'When a mysterious sea creature terrorizes a small Newfoundland town...',
        category: 'Movie',
        industry: 'Hollywood',
        breadcrumb: 'MOVIE › HOLLYWOOD',
        language: 'English',
        rating: '6.4',
        ageRating: 'PG-13',
        duration: '1h 55m',
        platform: 'HD',
        uploadedAt: Date.now() - 3600000,
        safetyLevel: 'Safe',
        backdrop: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1280',
        poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500',
        stills: ['https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1280', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1280'],
        trailerUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        genres: ['Mystery', 'Thriller'],
        tags: ['Hollywood', '2026', 'Movie'],
        summary: 'Lowen Ashleigh, a struggling writer, is hired to complete the remaining books of a successful series after injured author Verity Crawford is unable to continue.',
        parentalGuide: { sexNudity: 'Mild romance scenes.', violence: 'Mild thriller tension.', profanity: 'Minor language.', drugsAlcohol: 'None.' },
        verdict: 'Suitable for mature teens and adults.',
        cast: [{ name: 'Anne Hathaway', role: 'Lowen' }, { name: 'Josh Hartnett', role: 'Jeremy' }],
        episodes: [],
        defaultComments: []
    },
    {
        id: 'def-2',
        slug: 'alibaba-aur-40-bhoot',
        title: 'Alibaba Aur 40 Bhoot',
        year: '2025',
        tagline: 'An epic fantasy adventure exploring hidden caves and ancient treasures.',
        category: 'TV Series',
        industry: 'Bollywood',
        breadcrumb: 'TV SERIES › BOLLYWOOD',
        language: 'Hindi',
        rating: '7.8',
        ageRating: 'TV-14',
        duration: '1 Season',
        platform: 'AMZN',
        uploadedAt: Date.now() - 86400000,
        safetyLevel: 'Moderate',
        backdrop: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1280',
        poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500',
        stills: ['https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1280'],
        trailerUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        genres: ['Action', 'Fantasy'],
        tags: ['Bollywood', 'Series', '2025'],
        summary: 'A poor woodcutter stumbles upon a magical cave belonging to forty thieves.',
        parentalGuide: { sexNudity: 'None.', violence: 'Action combat.', profanity: 'None.', drugsAlcohol: 'None.' },
        verdict: 'Great family entertainment.',
        cast: [{ name: 'Ali Fazal', role: 'Alibaba' }],
        episodes: [
            { season: 1, ep: 1, title: 'The Magical Cave', poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300' },
            { season: 1, ep: 2, title: 'Secret of the Thieves', poster: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=300' }
        ],
        defaultComments: []
    }
];

function initPostsModule() {
    renderAddPostFormTab();
    renderManagePostsTab();
}

function getStoredAllPosts() {
    const custom = JSON.parse(localStorage.getItem('cineguide_custom_reviews') || '[]');
    const hidden = JSON.parse(localStorage.getItem('cineguide_hidden_default_ids') || '[]');
    const visibleDefaults = defaultDemoPosts.filter(d => !hidden.includes(d.id));
    return [...custom, ...visibleDefaults];
}

function renderAddPostFormTab() {
    const container = document.getElementById('tabSection-posts');
    const customDomain = localStorage.getItem('cineguide_custom_domain') || window.location.origin;

    container.innerHTML = `
        <div class="mb-6 flex items-center justify-between">
            <div>
                <h2 id="formMainHeading" class="text-2xl font-black">Publish New Review Post</h2>
                <p class="text-xs text-slate-400 mt-1">Auto-fetch via TMDB Title, Link/ID or Jikan API.</p>
            </div>
            <button onclick="switchAdminTab('manage')" class="px-4 py-2 rounded-xl bg-elevated hover:bg-white/10 text-xs font-bold text-slate-200 border border-subtle flex items-center gap-1.5">
                <i data-lucide="film" class="w-3.5 h-3.5 text-rose-500"></i> Manage Posts
            </button>
        </div>

        <!-- API AUTO-FETCH SEARCH BAR (Supports Title or TMDB Link/ID) -->
        <div class="p-5 rounded-2xl bg-card border border-rose-500/30 mb-6">
            <div class="flex items-center justify-between mb-3">
                <span class="text-xs font-extrabold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                    <i data-lucide="sparkles" class="w-4 h-4"></i> TMDB Link / ID or Title Auto-Fetcher
                </span>
                <button onclick="switchAdminTab('settings')" class="text-[11px] text-slate-400 hover:text-white underline">API Settings →</button>
            </div>
            <div class="flex flex-col sm:flex-row gap-2.5">
                <select id="apiSourceSelect" class="px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs font-bold">
                    <option value="tmdb_auto">TMDB (Movie / TV / Link / ID)</option>
                    <option value="jikan_anime">Free Jikan API — Anime</option>
                </select>
                <input type="text" id="apiSearchQuery" placeholder="Type title or paste TMDB link (e.g. themoviedb.org/movie/12345)..." class="flex-1 px-4 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs sm:text-sm focus:outline-none focus:border-rose-500">
                <button type="button" onclick="searchExternalAPI()" class="px-5 py-2.5 rounded-xl accent-bg text-white font-extrabold text-xs shrink-0 hover:opacity-95">
                    Search & Auto-Fill
                </button>
            </div>
            <div id="apiSearchResults" class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3 hidden"></div>
        </div>

        <!-- NEW / EDIT POST FORM -->
        <form onsubmit="saveOrUpdateReviewPost(event)" class="p-5 sm:p-6 rounded-2xl bg-card border border-subtle space-y-4 mb-8">
            <div class="flex items-center justify-between mb-2">
                <h3 id="formSubTitle" class="text-sm font-extrabold text-emerald-400 uppercase tracking-wider">Create New Post</h3>
                <button type="button" id="cancelEditBtn" onclick="resetPostFormState()" class="hidden text-xs text-rose-400 hover:underline">Cancel Editing</button>
            </div>

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
                    <label class="text-[11px] font-bold uppercase text-slate-400 block mb-1">Category</label>
                    <select id="postCategory" class="w-full px-3 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs font-bold">
                        <option value="Movie">Movie</option>
                        <option value="TV Series">TV Series</option>
                        <option value="Anime">Anime</option>
                    </select>
                </div>
                <div>
                    <label class="text-[11px] font-bold uppercase text-slate-400 block mb-1">Industry</label>
                    <input type="text" id="postIndustry" placeholder="Hollywood / Bollywood" class="w-full px-3 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
                </div>
                <div>
                    <label class="text-[11px] font-bold uppercase text-slate-400 block mb-1">Rating</label>
                    <input type="text" id="postRating" placeholder="7.8" class="w-full px-3 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
                </div>
                <div>
                    <label class="text-[11px] font-bold uppercase text-slate-400 block mb-1">Safety</label>
                    <select id="postSafety" class="w-full px-3 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs font-bold">
                        <option value="Safe">Safe (Family)</option>
                        <option value="Moderate">Moderate</option>
                        <option value="Strict">Strict (18+)</option>
                    </select>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label class="text-[11px] font-bold uppercase text-slate-400 block mb-1">Poster URL *</label>
                    <input type="url" id="postPoster" required placeholder="https://..." class="w-full px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
                </div>
                <div>
                    <label class="text-[11px] font-bold uppercase text-slate-400 block mb-1">Backdrop URL *</label>
                    <input type="url" id="postBackdrop" required placeholder="https://..." class="w-full px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
                </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <input type="text" id="postLanguage" placeholder="Language" class="px-3 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
                <input type="text" id="postDuration" placeholder="Duration" class="px-3 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
                <input type="text" id="postPlatform" placeholder="Platform (Netflix)" class="px-3 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
                <input type="text" id="postAgeRating" placeholder="Age (PG-13)" class="px-3 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" id="postGenres" placeholder="Genres (Mystery, Thriller)" class="px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
                <input type="text" id="postTrailer" placeholder="YouTube Embed URL or ID" class="px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
            </div>

            <div>
                <label class="text-[11px] font-bold uppercase text-slate-400 block mb-1">Summary *</label>
                <textarea id="postSummary" rows="3" required placeholder="Plot synopsis..." class="w-full px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs"></textarea>
            </div>

            <!-- Hidden JSON storage fields for Cast, Stills, Episodes -->
            <input type="hidden" id="postCastJson">
            <input type="hidden" id="postStillsJson">
            <input type="hidden" id="postEpisodesJson">

            <button type="submit" id="formSubmitBtn" class="w-full py-3.5 rounded-xl accent-bg text-white font-extrabold text-sm shadow-lg hover:opacity-95 transition">
                Publish Review Post
            </button>
        </form>
    `;
    updateSEOPermalinkPreview();
}

function renderManagePostsTab() {
    const container = document.getElementById('tabSection-manage');
    if (!container) return;

    container.innerHTML = `
        <div class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
                <h2 class="text-2xl font-black">Manage Published Posts</h2>
                <p class="text-xs text-slate-400 mt-1">Compact view with live search, category filters and edit/delete options.</p>
            </div>
            <button onclick="switchAdminTab('posts')" class="px-4 py-2.5 rounded-xl accent-bg text-xs font-bold text-white flex items-center gap-1.5 shadow">
                <i data-lucide="plus" class="w-3.5 h-3.5"></i> Add New Post
            </button>
        </div>

        <!-- Filter & Search Bar -->
        <div class="p-4 rounded-2xl bg-card border border-subtle mb-6 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div class="flex items-center gap-2 overflow-x-auto w-full sm:w-auto no-scrollbar text-xs font-bold">
                <button onclick="filterAdminPosts('All')" id="adminCatBtn-All" class="admin-cat-tab px-3.5 py-2 rounded-xl bg-rose-600 text-white whitespace-nowrap">All</button>
                <button onclick="filterAdminPosts('Movie')" id="adminCatBtn-Movie" class="admin-cat-tab px-3.5 py-2 rounded-xl bg-[#090a0f] border border-subtle text-slate-300 whitespace-nowrap">Movies</button>
                <button onclick="filterAdminPosts('TV Series')" id="adminCatBtn-TV Series" class="admin-cat-tab px-3.5 py-2 rounded-xl bg-[#090a0f] border border-subtle text-slate-300 whitespace-nowrap">TV Series</button>
                <button onclick="filterAdminPosts('Anime')" id="adminCatBtn-Anime" class="admin-cat-tab px-3.5 py-2 rounded-xl bg-[#090a0f] border border-subtle text-slate-300 whitespace-nowrap">Anime</button>
            </div>
            <div class="w-full sm:w-64 relative">
                <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"></i>
                <input type="text" id="adminSearchInput" oninput="renderAdminPostsGrid()" placeholder="Search posts..." class="w-full pl-9 pr-3 py-2 rounded-xl bg-[#090a0f] border border-subtle text-xs focus:outline-none focus:border-rose-500">
            </div>
        </div>

        <div id="adminPublishedPostsGrid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"></div>
    `;
    renderAdminPostsGrid();
}

let adminCurrentFilterCat = 'All';

function filterAdminPosts(cat) {
    adminCurrentFilterCat = cat;
    document.querySelectorAll('.admin-cat-tab').forEach(b => {
        b.className = "admin-cat-tab px-3.5 py-2 rounded-xl bg-[#090a0f] border border-subtle text-slate-300 whitespace-nowrap";
    });
    const active = document.getElementById(`adminCatBtn-${cat}`);
    if (active) active.className = "admin-cat-tab px-3.5 py-2 rounded-xl bg-rose-600 text-white whitespace-nowrap";
    renderAdminPostsGrid();
}

function renderAdminPostsGrid() {
    const grid = document.getElementById('adminPublishedPostsGrid');
    if (!grid) return;

    const query = (document.getElementById('adminSearchInput')?.value || '').toLowerCase();
    const posts = getStoredAllPosts();

    const filtered = posts.filter(p => {
        const matchCat = adminCurrentFilterCat === 'All' || p.category === adminCurrentFilterCat;
        const matchQuery = !query || p.title.toLowerCase().includes(query) || (p.genres && p.genres.join(' ').toLowerCase().includes(query));
        return matchCat && matchQuery;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `<div class="col-span-full p-10 text-center rounded-2xl bg-card border border-subtle"><p class="text-xs text-slate-400">No posts found.</p></div>`;
        return;
    }

    grid.innerHTML = filtered.map(item => `
        <div class="p-2.5 rounded-2xl bg-card border border-subtle flex flex-col justify-between shadow">
            <div>
                <div class="relative aspect-[2/3] rounded-xl overflow-hidden bg-black mb-2 border border-subtle">
                    <img src="${item.poster}" alt="${item.title}" class="w-full h-full object-cover">
                    <span class="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/75 text-[10px] font-bold text-amber-400 uppercase">${item.category}</span>
                    <span class="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/75 text-[10px] font-bold text-white">★ ${item.rating}</span>
                </div>
                <h4 class="font-extrabold text-xs truncate text-white mb-0.5">${item.title} (${item.year})</h4>
                <p class="text-[10px] text-emerald-400 font-mono mb-2 truncate">/?post=${item.slug || item.id}</p>
            </div>
            <div class="flex items-center gap-1.5 pt-2 border-t border-subtle">
                <button onclick="loadPostForEditing('${item.id}')" class="flex-1 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500 hover:text-black text-amber-400 text-[11px] font-bold transition flex items-center justify-center gap-1">
                    <i data-lucide="edit-3" class="w-3 h-3"></i> Edit
                </button>
                <button onclick="deletePostItem('${item.id}')" class="flex-1 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-600 hover:text-white text-rose-400 text-[11px] font-bold transition flex items-center justify-center gap-1">
                    <i data-lucide="trash-2" class="w-3 h-3"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

async function searchExternalAPI() {
    const source = document.getElementById('apiSourceSelect').value;
    const rawInput = document.getElementById('apiSearchQuery').value.trim();
    const resultsBox = document.getElementById('apiSearchResults');
    if (!rawInput) return;

    resultsBox.classList.remove('hidden');
    resultsBox.innerHTML = `<p class="text-xs text-slate-400 col-span-full">Fetching data from API...</p>`;

    try {
        const tmdbKey = localStorage.getItem('cineguide_tmdb_key');
        
        // Check if user pasted a direct TMDB URL or ID
        let directType = null;
        let directId = null;
        if (rawInput.includes('themoviedb.org')) {
            if (rawInput.includes('/movie/')) { directType = 'movie'; directId = rawInput.split('/movie/')[1].split('/')[0]; }
            else if (rawInput.includes('/tv/')) { directType = 'tv'; directId = rawInput.split('/tv/')[1].split('/')[0]; }
        } else if (!isNaN(rawInput) && rawInput.length > 2) {
            directType = 'movie';
            directId = rawInput;
        }

        if (directId && tmdbKey) {
            const res = await fetch(`https://api.themoviedb.org/3/${directType}/${directId}?api_key=${tmdbKey}&append_to_response=credits,videos`);
            const m = await res.json();
            if (m.id) {
                processTmdbItem(m, directType === 'tv' ? 'TV Series' : 'Movie');
                resultsBox.classList.add('hidden');
                showAdminToast(`Successfully loaded "${m.title || m.name}"!`);
                return;
            }
        }

        if (source === 'jikan_anime') {
            const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(rawInput)}&limit=3`);
            const data = await res.json();
            resultsBox.innerHTML = (data.data || []).map(item => `
                <div onclick='fillFormFromAPI(${JSON.stringify({
                    title: item.title_english || item.title,
                    year: item.year || '2025',
                    category: 'Anime',
                    industry: 'Anime Movies',
                    rating: item.score || '8.0',
                    poster: item.images?.jpg?.large_image_url || '',
                    backdrop: item.images?.jpg?.large_image_url || '',
                    language: 'Japanese',
                    duration: item.duration || '24m / ep',
                    ageRating: item.rating || 'PG-13',
                    genres: (item.genres || []).map(g => g.name).join(', '),
                    summary: item.synopsis || '',
                    trailerUrl: item.trailer?.embed_url || 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                    cast: [],
                    stills: [item.images?.jpg?.large_image_url || ''],
                    episodes: []
                }).replace(/'/g, "&apos;")})' class="p-2.5 rounded-xl bg-[#090a0f] border border-subtle hover:border-rose-500 cursor-pointer flex gap-2.5 items-center">
                    <img src="${item.images?.jpg?.image_url}" class="w-12 h-16 object-cover rounded-lg">
                    <div class="overflow-hidden">
                        <h4 class="font-bold text-xs truncate">${item.title}</h4>
                        <p class="text-[10px] text-amber-400">★ ${item.score || 'N/A'} • Anime</p>
                    </div>
                </div>
            `).join('');
        } else {
            if (!tmdbKey) {
                resultsBox.innerHTML = `<p class="text-xs text-amber-400 col-span-full">Please save your TMDB API Key in Settings first!</p>`;
                return;
            }
            const searchRes = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${tmdbKey}&query=${encodeURIComponent(rawInput)}`);
            const searchData = await searchRes.json();
            const validItems = (searchData.results || []).filter(i => i.media_type === 'movie' || i.media_type === 'tv').slice(0, 3);

            if (validItems.length === 0) {
                resultsBox.innerHTML = `<p class="text-xs text-rose-400 col-span-full">No results found.</p>`;
                return;
            }

            resultsBox.innerHTML = validItems.map(item => `
                <div onclick='fetchAndFillTmdbDetails(${item.id}, "${item.media_type}")' class="p-2.5 rounded-xl bg-[#090a0f] border border-subtle hover:border-rose-500 cursor-pointer flex gap-2.5 items-center">
                    <img src="https://image.tmdb.org/t/p/w200${item.poster_path}" class="w-12 h-16 object-cover rounded-lg bg-card">
                    <div class="overflow-hidden">
                        <h4 class="font-bold text-xs truncate">${item.title || item.name}</h4>
                        <p class="text-[10px] text-amber-400">★ ${(item.vote_average || 7).toFixed(1)} • ${item.media_type.toUpperCase()}</p>
                    </div>
                </div>
            `).join('');
        }
    } catch (err) {
        resultsBox.innerHTML = `<p class="text-xs text-rose-400 col-span-full">API Error occurred.</p>`;
    }
}

async function fetchAndFillTmdbDetails(id, mediaType) {
    const tmdbKey = localStorage.getItem('cineguide_tmdb_key');
    try {
        const res = await fetch(`https://api.themoviedb.org/3/${mediaType}/${id}?api_key=${tmdbKey}&append_to_response=credits,videos,images`);
        const m = await res.json();
        processTmdbItem(m, mediaType === 'tv' ? 'TV Series' : 'Movie');
        document.getElementById('apiSearchResults').classList.add('hidden');
        showAdminToast(`Loaded "${m.title || m.name}" successfully!`);
    } catch (e) {
        showAdminToast("Failed to fetch details.");
    }
}

function processTmdbItem(m, category) {
    const title = m.title || m.name;
    const year = (m.release_date || m.first_air_date || '2026').slice(0, 4);
    const poster = m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : '';
    const backdrop = m.backdrop_path ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}` : poster;
    
    // Extract Stills
    let stills = [backdrop];
    if (m.images && m.images.backdrops && m.images.backdrops.length > 0) {
        stills = m.images.backdrops.slice(0, 4).map(b => `https://image.tmdb.org/t/p/w1280${b.file_path}`);
    }

    // Extract YouTube Trailer
    let trailerUrl = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
    if (m.videos && m.videos.results) {
        const yt = m.videos.results.find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));
        if (yt) trailerUrl = `https://www.youtube.com/embed/${yt.key}`;
    }

    // Extract Cast
    let cast = [];
    if (m.credits && m.credits.cast) {
        cast = m.credits.cast.slice(0, 6).map(c => ({ name: c.name, role: c.character }));
    }

    // Extract Episodes if TV
    let episodes = [];
    if (category === 'TV Series' && m.seasons) {
        m.seasons.forEach(s => {
            if (s.season_number > 0) {
                for (let i = 1; i <= Math.min(s.episode_count || 3, 3); i++) {
                    episodes.push({
                        season: s.season_number,
                        ep: i,
                        title: `${s.name} - Ep ${i}`,
                        poster: s.poster_path ? `https://image.tmdb.org/t/p/w300${s.poster_path}` : poster
                    });
                }
            }
        });
    }

    fillFormFromAPI({
        title, year, category,
        industry: 'Hollywood',
        rating: (m.vote_average || 7.5).toFixed(1),
        poster, backdrop,
        language: (m.original_language || 'EN').toUpperCase(),
        duration: category === 'TV Series' ? `${m.number_of_seasons || 1} Season` : '1h 55m',
        ageRating: m.adult ? '18+' : 'PG-13',
        genres: (m.genres || []).map(g => g.name).join(', '),
        summary: m.overview || '',
        trailerUrl, cast, stills, episodes
    });
}

function fillFormFromAPI(item) {
    document.getElementById('postTitle').value = item.title || '';
    document.getElementById('postYear').value = item.year || '2026';
    document.getElementById('postCategory').value = item.category || 'Movie';
    document.getElementById('postIndustry').value = item.industry || 'Hollywood';
    document.getElementById('postRating').value = item.rating || '7.5';
    document.getElementById('postPoster').value = item.poster || '';
    document.getElementById('postBackdrop').value = item.backdrop || '';
    document.getElementById('postLanguage').value = item.language || 'English';
    document.getElementById('postDuration').value = item.duration || '1h 50m';
    document.getElementById('postAgeRating').value = item.ageRating || 'PG-13';
    document.getElementById('postGenres').value = item.genres || 'Drama';
    document.getElementById('postTrailer').value = item.trailerUrl || '';
    document.getElementById('postSummary').value = item.summary || '';
    document.getElementById('postCastJson').value = JSON.stringify(item.cast || []);
    document.getElementById('postStillsJson').value = JSON.stringify(item.stills || []);
    document.getElementById('postEpisodesJson').value = JSON.stringify(item.episodes || []);
    updateSEOPermalinkPreview();
}

function generateSEOSlug(title, year) {
    return `${title}-${year || ''}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function updateSEOPermalinkPreview() {
    const title = document.getElementById('postTitle').value.trim() || 'movie-title';
    const year = document.getElementById('postYear').value.trim() || '2026';
    const slug = generateSEOSlug(title, year);
    const domain = (localStorage.getItem('cineguide_custom_domain') || window.location.origin).replace(/\/$/, '');
    const sEl = document.getElementById('postSlug');
    const pEl = document.getElementById('seoLinkPreview');
    if (sEl) sEl.value = slug;
    if (pEl) pEl.textContent = `${domain}/?post=${slug}`;
}

function saveOrUpdateReviewPost(e) {
    e.preventDefault();
    const title = document.getElementById('postTitle').value.trim();
    const year = document.getElementById('postYear').value.trim();
    const slug = generateSEOSlug(title, year);
    const genres = document.getElementById('postGenres').value.split(',').map(g => g.trim()).filter(Boolean);
    const industry = document.getElementById('postIndustry').value.trim() || 'Hollywood';
    const category = document.getElementById('postCategory').value;

    let cast = [];
    let stills = [];
    let episodes = [];
    try { cast = JSON.parse(document.getElementById('postCastJson').value || '[]'); } catch(e){}
    try { stills = JSON.parse(document.getElementById('postStillsJson').value || '[]'); } catch(e){}
    try { episodes = JSON.parse(document.getElementById('postEpisodesJson').value || '[]'); } catch(e){}

    if (stills.length === 0) stills = [document.getElementById('postBackdrop'].value.trim()];

    const customList = JSON.parse(localStorage.getItem('cineguide_custom_reviews') || '[]');

    const postData = {
        id: editingPostId ? editingPostId : ('rev-' + Date.now()),
        slug, title, year,
        tagline: document.getElementById('postSummary').value.slice(0, 65) + '...',
        category, industry,
        breadcrumb: `${category.toUpperCase()} › ${industry.toUpperCase()}`,
        language: document.getElementById('postLanguage').value.trim() || 'English',
        rating: document.getElementById('postRating').value.trim() || '7.5',
        ageRating: document.getElementById('postAgeRating').value.trim() || 'PG-13',
        duration: document.getElementById('postDuration').value.trim() || '1h 50m',
        platform: 'HD',
        uploadedAt: Date.now(),
        safetyLevel: document.getElementById('postSafety').value,
        backdrop: document.getElementById('postBackdrop').value.trim(),
        poster: document.getElementById('postPoster').value.trim(),
        stills,
        trailerUrl: document.getElementById('postTrailer').value.trim() || 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        genres: genres.length ? genres : ['Drama'],
        tags: [industry, year, category, ...genres],
        summary: document.getElementById('postSummary').value.trim(),
        parentalGuide: { sexNudity: 'None reported.', violence: 'Mild.', profanity: 'Mild.', drugsAlcohol: 'None.' },
        verdict: 'Suitable for family viewing.',
        cast,
        episodes,
        defaultComments: []
    };

    if (editingPostId) {
        // Check if editing a default post or custom post
        if (editingPostId.startsWith('def-')) {
            // Save as override in custom
            customList.unshift(postData);
            // Hide default
            let hidden = JSON.parse(localStorage.getItem('cineguide_hidden_default_ids') || '[]');
            if (!hidden.includes(editingPostId)) hidden.push(editingPostId);
            localStorage.setItem('cineguide_hidden_default_ids', JSON.stringify(hidden));
        } else {
            const idx = customList.findIndex(p => p.id === editingPostId);
            if (idx !== -1) customList[idx] = postData;
            else customList.unshift(postData);
        }
        showAdminToast(`Updated "${title}" successfully!`);
    } else {
        customList.unshift(postData);
        showAdminToast(`Published "${title}" successfully!`);
    }

    localStorage.setItem('cineguide_custom_reviews', JSON.stringify(customList));
    resetPostFormState();
    switchAdminTab('manage');
}

function loadPostForEditing(id) {
    let target = getStoredAllPosts().find(p => p.id === id);
    if (!target) return;

    editingPostId = id;
    switchAdminTab('posts');

    document.getElementById('formSubTitle').textContent = `Editing: ${target.title}`;
    document.getElementById('cancelEditBtn').classList.remove('hidden');
    document.getElementById('formSubmitBtn').textContent = 'Update Review Post';

    document.getElementById('postTitle').value = target.title || '';
    document.getElementById('postYear').value = target.year || '';
    document.getElementById('postCategory').value = target.category || 'Movie';
    document.getElementById('postIndustry').value = target.industry || '';
    document.getElementById('postRating').value = target.rating || '';
    document.getElementById('postPoster').value = target.poster || '';
    document.getElementById('postBackdrop').value = target.backdrop || '';
    document.getElementById('postLanguage').value = target.language || '';
    document.getElementById('postDuration').value = target.duration || '';
    document.getElementById('postAgeRating').value = target.ageRating || '';
    document.getElementById('postGenres').value = (target.genres || []).join(', ');
    document.getElementById('postTrailer').value = target.trailerUrl || '';
    document.getElementById('postSummary').value = target.summary || '';
    document.getElementById('postCastJson').value = JSON.stringify(target.cast || []);
    document.getElementById('postStillsJson').value = JSON.stringify(target.stills || []);
    document.getElementById('postEpisodesJson').value = JSON.stringify(target.episodes || []);
    updateSEOPermalinkPreview();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetPostFormState() {
    editingPostId = null;
    document.getElementById('formSubTitle').textContent = 'Create New Post';
    document.getElementById('cancelEditBtn').classList.add('hidden');
    document.getElementById('formSubmitBtn').textContent = 'Publish Review Post';
    const f = document.querySelector('form');
    if (f) f.reset();
    updateSEOPermalinkPreview();
}

function deletePostItem(id) {
    if (id.startsWith('def-')) {
        let hidden = JSON.parse(localStorage.getItem('cineguide_hidden_default_ids') || '[]');
        if (!hidden.includes(id)) hidden.push(id);
        localStorage.setItem('cineguide_hidden_default_ids', JSON.stringify(hidden));
    } else {
        let customList = JSON.parse(localStorage.getItem('cineguide_custom_reviews') || '[]');
        customList = customList.filter(p => p.id !== id);
        localStorage.setItem('cineguide_custom_reviews', JSON.stringify(customList));
    }
    renderAdminPostsGrid();
    showAdminToast("Post deleted successfully!");
}
