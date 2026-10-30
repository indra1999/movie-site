// ============================================================================
// MODULE 1: POSTS, SEO SLUG, TMDB API & SEPARATE MANAGE/EDIT TAB
// File: admin-modules/posts-api.js
// ============================================================================

let editingPostIndex = null;

function initPostsModule() {
    renderAddPostFormTab();
    renderManagePostsTab();
}

function renderAddPostFormTab() {
    const container = document.getElementById('tabSection-posts');
    const customDomain = localStorage.getItem('cineguide_custom_domain') || window.location.origin;
    const customCats = safeParse('cineguide_custom_categories', []);
    const customCatOptions = customCats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');

    container.innerHTML = `
        <div class="mb-6 flex items-center justify-between">
            <div>
                <h2 id="formMainHeading" class="text-2xl font-black">Publish New Review Post</h2>
                <p class="text-xs text-slate-400 mt-1">Auto-fetch metadata via TMDB / Free Jikan API or publish manually.</p>
            </div>
            <button onclick="switchAdminTab('manage')" class="px-4 py-2 rounded-xl bg-elevated hover:bg-white/10 text-xs font-bold text-slate-200 border border-subtle flex items-center gap-1.5">
                <i data-lucide="film" class="w-3.5 h-3.5 text-rose-500"></i> View All Posts
            </button>
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
                    <option value="jikan_anime">Free Jikan API — Anime</option>
                    <option value="tvmaze_show">Free TVMaze API — Shows</option>
                </select>
                <input type="text" id="apiSearchQuery" placeholder="Title, TMDB ID (e.g. 550) or TMDB link (themoviedb.org/movie/550)" class="flex-1 px-4 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs sm:text-sm focus:outline-none focus:border-rose-500">
                <button type="button" onclick="searchExternalAPI()" class="px-5 py-2.5 rounded-xl accent-bg text-white font-extrabold text-xs shrink-0 hover:opacity-95">
                    Search & Auto-Fill
                </button>
            </div>
            <p class="text-[10px] text-slate-500 mt-2">টাইটেল লিখে সার্চ করলে API কল বেশি লাগে। তাই সরাসরি <b>TMDB ID</b> বা <b>TMDB লিংক</b> দিন — ১টা কলেই সব ডেটা, ট্রেলার ও কাস্ট ছবি আসবে।</p>
            <div id="apiSearchResults" class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3 hidden"></div>
        </div>

        <!-- NEW / EDIT REVIEW POST FORM -->
        <form id="postForm" onsubmit="saveOrUpdateReviewPost(event)" class="p-5 sm:p-6 rounded-2xl bg-card border border-subtle space-y-4 mb-8">
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
                    <input type="text" id="postYear" required maxlength="4" inputmode="numeric" oninput="updateSEOPermalinkPreview()" placeholder="2026" class="w-full px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-sm">
                </div>
            </div>

            <!-- SEO Permalink Preview Box -->
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
                        ${customCatOptions}
                    </select>
                </div>
                <div>
                    <label class="text-[11px] font-bold uppercase text-slate-400 block mb-1">Industry</label>
                    <input type="text" id="postIndustry" placeholder="Hollywood / Korean" class="w-full px-3 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
                </div>
                <div>
                    <label class="text-[11px] font-bold uppercase text-slate-400 block mb-1">IMDb Rating</label>
                    <input type="text" id="postRating" placeholder="7.8" class="w-full px-3 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
                </div>
                <div>
                    <label class="text-[11px] font-bold uppercase text-slate-400 block mb-1">Safety Verdict</label>
                    <select id="postSafety" class="w-full px-3 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs font-bold">
                        <option value="Safe">Safe (Family)</option>
                        <option value="Moderate">Moderate (PG-13)</option>
                        <option value="Strict">Strict (18+)</option>
                    </select>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label class="text-[11px] font-bold uppercase text-slate-400 block mb-1">Poster Image URL (Portrait) *</label>
                    <input type="url" id="postPoster" required placeholder="https://..." class="w-full px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
                </div>
                <div>
                    <label class="text-[11px] font-bold uppercase text-slate-400 block mb-1">Backdrop Image URL (Wide) <span class="normal-case text-slate-500">(optional — poster is used if empty)</span></label>
                    <input type="url" id="postBackdrop" placeholder="https://..." class="w-full px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
                </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <input type="text" id="postLanguage" placeholder="Language" class="px-3 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
                <input type="text" id="postDuration" placeholder="Duration" class="px-3 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
                <input type="text" id="postPlatform" placeholder="Platform (NF/AMZN)" class="px-3 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
                <input type="text" id="postAgeRating" placeholder="Age (PG-13)" class="px-3 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" id="postGenres" placeholder="Genres (Mystery, Thriller)" class="px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
                <input type="text" id="postTrailer" placeholder="YouTube Trailer URL (any YouTube link works)" class="px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
            </div>

            <div id="castPreviewBox" class="hidden p-3 rounded-xl bg-[#090a0f] border border-subtle">
                <div class="flex items-center justify-between mb-2">
                    <span id="castPreviewTitle" class="text-[11px] font-bold uppercase text-slate-400"></span>
                    <button type="button" onclick="clearPendingCast()" class="text-[11px] text-rose-400 hover:underline">Clear cast</button>
                </div>
                <div id="castPreviewList" class="flex gap-2 overflow-x-auto pb-1"></div>
            </div>

            <div>
                <label class="text-[11px] font-bold uppercase text-slate-400 block mb-1">Story Summary *</label>
                <textarea id="postSummary" rows="3" required placeholder="Plot synopsis..." class="w-full px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs"></textarea>
            </div>

            <div class="p-4 rounded-xl bg-[#090a0f] border border-subtle space-y-3">
                <h4 class="text-xs font-extrabold uppercase text-rose-400">Parental Guide Breakdown</h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input type="text" id="pgSex" placeholder="Sex & Nudity" class="px-3 py-2 rounded-lg bg-card border border-subtle text-xs">
                    <input type="text" id="pgViolence" placeholder="Violence" class="px-3 py-2 rounded-lg bg-card border border-subtle text-xs">
                    <input type="text" id="pgProfanity" placeholder="Profanity" class="px-3 py-2 rounded-lg bg-card border border-subtle text-xs">
                    <input type="text" id="pgDrugs" placeholder="Drugs" class="px-3 py-2 rounded-lg bg-card border border-subtle text-xs">
                </div>
                <input type="text" id="pgVerdict" placeholder="Final Family Verdict" class="w-full px-3 py-2 rounded-lg bg-card border border-subtle text-xs">
            </div>

            <button type="submit" id="formSubmitBtn" class="w-full py-3.5 rounded-xl accent-bg text-white font-extrabold text-sm shadow-lg hover:opacity-95 transition">
                Publish Review Post
            </button>
        </form>
    `;
    updateSEOPermalinkPreview();
    if (typeof renderCastPreview === 'function') renderCastPreview();
}

function renderManagePostsTab() {
    const container = document.getElementById('tabSection-manage');
    container.innerHTML = `
        <div class="mb-6 flex items-center justify-between">
            <div>
                <h2 class="text-2xl font-black">Manage Published Posts</h2>
                <p class="text-xs text-slate-400 mt-1">View all your published posts with posters, edit details or delete instantly.</p>
            </div>
            <button onclick="switchAdminTab('posts')" class="px-4 py-2 rounded-xl accent-bg text-xs font-bold text-white flex items-center gap-1.5 shadow">
                <i data-lucide="plus" class="w-3.5 h-3.5"></i> Add New Post
            </button>
        </div>

        <div id="adminPublishedPostsGrid" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"></div>
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
    const slugEl = document.getElementById('postSlug');
    const previewEl = document.getElementById('seoLinkPreview');
    if (slugEl) slugEl.value = slug;
    if (previewEl) previewEl.textContent = `${domain}/?post=${slug}`;
}


let apiResultsCache = [];
const TMDB_GENRES = {28:'Action',12:'Adventure',16:'Animation',35:'Comedy',80:'Crime',99:'Documentary',18:'Drama',10751:'Family',14:'Fantasy',36:'History',27:'Horror',10402:'Music',9648:'Mystery',10749:'Romance',878:'Sci-Fi',10770:'TV Movie',53:'Thriller',10752:'War',37:'Western',10759:'Action & Adventure',10762:'Kids',10763:'News',10764:'Reality',10765:'Sci-Fi & Fantasy',10766:'Soap',10767:'Talk',10768:'War & Politics'};

function renderApiResults(items) {
    apiResultsCache = items;
    const box = document.getElementById('apiSearchResults');
    if (!items.length) {
        box.innerHTML = `<p class="text-xs text-slate-400 col-span-full">No results found. Try another title.</p>`;
        return;
    }
    box.innerHTML = items.map((it, i) => `
        <div onclick="pickApiResult(${i})" class="p-2.5 rounded-xl bg-[#090a0f] border border-subtle hover:border-rose-500 cursor-pointer flex gap-2.5 items-center">
            <img src="${esc(it.thumb || it.poster)}" alt="" class="w-12 h-16 object-cover rounded-lg bg-card" onerror="this.style.visibility='hidden'">
            <div class="overflow-hidden">
                <h4 class="font-bold text-xs truncate">${esc(it.title)}</h4>
                <p class="text-[10px] text-amber-400">★ ${esc(it.rating)} • ${esc(it.year)}</p>
            </div>
        </div>`).join('');
}

async function searchExternalAPI() {
    const source = document.getElementById('apiSourceSelect').value;
    const query = document.getElementById('apiSearchQuery').value.trim();
    const resultsBox = document.getElementById('apiSearchResults');
    if (!query) return;

    resultsBox.classList.remove('hidden');
    resultsBox.innerHTML = `<p class="text-xs text-slate-400 col-span-full">Searching API...</p>`;

    try {
        if (parseTmdbInput(query, source)) {
            await tmdbSearchOrLookup(source, query, resultsBox);
        } else if (source === 'jikan_anime') {
            const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=3`);
            if (!res.ok) throw new Error(res.status === 429 ? 'Too many requests, wait a few seconds and try again.' : 'Jikan API error ' + res.status);
            const data = await res.json();
            renderApiResults((data.data || []).map(item => {
                const img = (item.images && item.images.jpg && (item.images.jpg.large_image_url || item.images.jpg.image_url)) || '';
                return {
                    title: item.title_english || item.title,
                    year: String(item.year || (item.aired && item.aired.prop && item.aired.prop.from && item.aired.prop.from.year) || new Date().getFullYear()),
                    category: 'Anime', industry: 'Anime Movies',
                    rating: item.score ? String(item.score) : '8.0',
                    poster: img, backdrop: img, thumb: (item.images && item.images.jpg && item.images.jpg.image_url) || img,
                    language: 'Japanese', duration: item.duration || '24m / ep',
                    ageRating: item.rating || 'PG-13',
                    genres: (item.genres || []).map(g => g.name).join(', '),
                    summary: item.synopsis || ''
                };
            }));
        } else if (source === 'tvmaze_show') {
            const res = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`);
            if (!res.ok) throw new Error('TVMaze API error ' + res.status);
            const data = await res.json();
            renderApiResults(data.slice(0, 3).map(entry => {
                const s = entry.show;
                const img = (s.image && (s.image.original || s.image.medium)) || '';
                return {
                    title: s.name,
                    year: (s.premiered || String(new Date().getFullYear())).slice(0, 4),
                    category: 'TV Series', industry: 'English TV Series',
                    rating: (s.rating && s.rating.average) ? String(s.rating.average) : '7.5',
                    poster: img, backdrop: img, thumb: (s.image && s.image.medium) || img,
                    language: s.language || 'English',
                    duration: (s.runtime || s.averageRuntime || 45) + 'm',
                    ageRating: 'TV-14',
                    genres: (s.genres || []).join(', '),
                    summary: (s.summary || '').replace(/<[^>]*>?/gm, '')
                };
            }));
        } else {
            await tmdbSearchOrLookup(source, query, resultsBox);
        }
    } catch (err) {
        resultsBox.innerHTML = `<p class="text-xs text-rose-400 col-span-full">${esc(err.message || 'API Error. Check your internet connection.')}</p>`;
    }
}


// ===================== TMDB: ID / LINK LOOKUP + FULL DETAILS =====================
let pendingCast = [];
let pendingTmdbId = '';

function parseTmdbInput(input, source) {
    const q = String(input || '').trim();
    // link: themoviedb.org/movie/550-fight-club  or  /tv/1399
    let m = q.match(/themoviedb\.org\/(?:[a-z]{2}(?:-[A-Z]{2})?\/)?(movie|tv)\/(\d+)/i);
    if (m) return { type: m[1].toLowerCase(), id: m[2] };
    // "movie/550" or "tv/1399"
    m = q.match(/^(movie|tv)\s*[\/:\s]\s*(\d+)$/i);
    if (m) return { type: m[1].toLowerCase(), id: m[2] };
    // plain number
    if (/^\d{1,9}$/.test(q)) return { type: source === 'tmdb_tv' ? 'tv' : 'movie', id: q, guessed: true };
    return null;
}

async function tmdbRequest(path, params) {
    const key = (localStorage.getItem('cineguide_tmdb_key') || '').trim();
    if (!key) throw new Error('Please save your TMDB API Key in Settings first!');
    const qs = new URLSearchParams(params || {});
    const headers = {};
    // v4 "Read Access Token" (long JWT) or v3 api_key — both work
    if (key.length > 60 && key.split('.').length === 3) headers['Authorization'] = 'Bearer ' + key;
    else qs.set('api_key', key);
    const res = await fetch(`https://api.themoviedb.org/3${path}?${qs.toString()}`, { headers });
    let data = {};
    try { data = await res.json(); } catch (e) {}
    if (!res.ok) {
        const err = new Error(data.status_message || ('TMDB error ' + res.status));
        err.status = res.status;
        throw err;
    }
    return data;
}

function pickTmdbTrailer(videos) {
    const list = ((videos && videos.results) || []).filter(v => v.site === 'YouTube' && v.key);
    if (!list.length) return '';
    const score = v => (v.type === 'Trailer' ? 4 : v.type === 'Teaser' ? 2 : 0) + (v.official ? 2 : 0) + (v.iso_639_1 === 'en' ? 1 : 0);
    list.sort((a, b) => score(b) - score(a));
    return 'https://www.youtube.com/watch?v=' + list[0].key;
}

function fmtRuntime(min) {
    min = Number(min || 0);
    if (!min) return '';
    const h = Math.floor(min / 60), m = min % 60;
    return h ? `${h}h ${m}m` : `${m}m`;
}

function tmdbIndustry(d) {
    const c = ((d.production_countries || [])[0] || {}).iso_3166_1 || (d.origin_country || [])[0] || '';
    return ({ US: 'Hollywood', GB: 'Hollywood', IN: 'Bollywood', KR: 'Korean', JP: 'Japanese', CN: 'Chinese', TH: 'Thai', TR: 'Turkish', BD: 'Bangla' })[c] || 'Hollywood';
}

async function fetchTmdbFull(type, id) {
    const detail = { append_to_response: 'videos,credits', include_video_language: 'en,null,hi,bn' };
    let d;
    try {
        d = await tmdbRequest(`/${type}/${id}`, detail);
    } catch (e) {
        throw new Error(e.status === 404 ? `TMDB-তে ${type} ID ${id} পাওয়া যায়নি।` : e.message);
    }
    // if the first call came back without any YouTube video, retry videos with no language filter
    let trailer = pickTmdbTrailer(d.videos);
    if (!trailer) {
        try { trailer = pickTmdbTrailer(await tmdbRequest(`/${type}/${id}/videos`, {})); } catch (e) {}
    }
    const isTv = type === 'tv';
    const cast = ((d.credits && d.credits.cast) || []).slice(0, 12).map(c => ({
        actorId: 'tmdb-' + c.id,
        tmdbPersonId: c.id,
        name: c.name,
        character: c.character || '',
        photo: c.profile_path ? `https://image.tmdb.org/t/p/w500${c.profile_path}` : ''
    }));
    const runtime = isTv ? ((d.episode_run_time || [])[0] || (d.last_episode_to_air && d.last_episode_to_air.runtime) || 0) : d.runtime;
    return {
        tmdbId: String(d.id),
        title: d.title || d.name,
        year: (d.release_date || d.first_air_date || String(new Date().getFullYear())).slice(0, 4),
        category: isTv ? 'TV Series' : 'Movie',
        industry: tmdbIndustry(d),
        rating: Number(d.vote_average || 7).toFixed(1),
        poster: d.poster_path ? `https://image.tmdb.org/t/p/w500${d.poster_path}` : '',
        backdrop: d.backdrop_path ? `https://image.tmdb.org/t/p/w1280${d.backdrop_path}` : '',
        thumb: d.poster_path ? `https://image.tmdb.org/t/p/w200${d.poster_path}` : '',
        language: ((d.spoken_languages || [])[0] || {}).english_name || (d.original_language || 'en').toUpperCase(),
        duration: fmtRuntime(runtime) || (isTv ? `${d.number_of_seasons || 1} Season` : '1h 55m'),
        ageRating: d.adult ? '18+' : 'PG-13',
        platform: isTv ? (((d.networks || [])[0] || {}).name || '') : '',
        genres: (d.genres || []).map(g => g.name).join(', ') || 'Drama',
        summary: d.overview || '',
        trailer,
        cast
    };
}

async function tmdbSearchOrLookup(source, query, resultsBox) {
    const parsed = parseTmdbInput(query, source);
    if (parsed) {
        // ID / link → ONE direct lookup, no title search
        resultsBox.innerHTML = `<p class="text-xs text-slate-400 col-span-full">TMDB থেকে ডেটা আনা হচ্ছে (ID ${esc(parsed.id)})...</p>`;
        let full;
        try {
            full = await fetchTmdbFull(parsed.type, parsed.id);
        } catch (e) {
            // a bare number might belong to the other type (movie <-> tv)
            if (parsed.guessed) full = await fetchTmdbFull(parsed.type === 'movie' ? 'tv' : 'movie', parsed.id);
            else throw e;
        }
        renderApiResults([full]);
        fillFormFromAPI(full);
        return;
    }

    const type = source === 'tmdb_tv' ? 'tv' : 'movie';
    const data = await tmdbRequest(`/search/${type}`, { query });
    renderApiResults((data.results || []).slice(0, 3).map(m => ({
        tmdbLookup: { type, id: m.id },
        title: m.title || m.name,
        year: (m.release_date || m.first_air_date || String(new Date().getFullYear())).slice(0, 4),
        rating: Number(m.vote_average || 7).toFixed(1),
        thumb: m.poster_path ? `https://image.tmdb.org/t/p/w200${m.poster_path}` : ''
    })));
}

function renderCastPreview() {
    const box = document.getElementById('castPreviewBox');
    if (!box) return;
    if (!pendingCast.length) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    document.getElementById('castPreviewTitle').textContent = `Cast (${pendingCast.length}) — will be saved with the post`;
    document.getElementById('castPreviewList').innerHTML = pendingCast.map((c, i) => `
        <div class="w-16 shrink-0 text-center relative">
            <button type="button" onclick="removePendingCast(${i})" class="absolute -top-1 -right-1 z-10 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] leading-4">×</button>
            <img src="${esc(c.photo)}" alt="" class="w-16 h-20 object-cover rounded-lg bg-card" onerror="this.style.visibility='hidden'">
            <p class="text-[9px] text-slate-300 truncate mt-1">${esc(c.name)}</p>
        </div>`).join('');
}
function removePendingCast(i) { pendingCast.splice(i, 1); renderCastPreview(); }
function clearPendingCast() { pendingCast = []; renderCastPreview(); }

async function pickApiResult(i) {
    const it = apiResultsCache[i];
    if (!it) return;
    if (it.tmdbLookup) {
        // user tapped a title-search result → now fetch full details (trailer + cast)
        try {
            showAdminToast('Fetching trailer & cast...');
            const full = await fetchTmdbFull(it.tmdbLookup.type, it.tmdbLookup.id);
            fillFormFromAPI(full);
        } catch (e) {
            showAdminToast(e.message || 'TMDB error');
        }
        return;
    }
    fillFormFromAPI(it);
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
    if (item.platform) document.getElementById('postPlatform').value = item.platform;
    if (item.trailer) document.getElementById('postTrailer').value = item.trailer;
    pendingCast = Array.isArray(item.cast) ? item.cast : [];
    pendingTmdbId = item.tmdbId || '';
    renderCastPreview();
    updateSEOPermalinkPreview();
    const extra = item.tmdbId ? ` (${item.trailer ? 'trailer ✓' : 'no trailer found'}, ${pendingCast.length} cast)` : '';
    showAdminToast(`Auto-filled "${item.title}"!${extra}`);
}


function saveOrUpdateReviewPost(e) {
    e.preventDefault();
    const title = document.getElementById('postTitle').value.trim();
    const year = document.getElementById('postYear').value.trim();
    const genres = document.getElementById('postGenres').value.split(',').map(g => g.trim()).filter(Boolean);
    const industry = document.getElementById('postIndustry').value.trim() || 'Hollywood';
    const category = document.getElementById('postCategory').value;
    const poster = document.getElementById('postPoster').value.trim();
    const backdrop = document.getElementById('postBackdrop').value.trim() || poster;

    const existing = safeParse('cineguide_custom_reviews', []);
    const old = editingPostIndex !== null ? existing[editingPostIndex] : null;
    const id = old ? old.id : ('rev-' + Date.now());

    // unique SEO slug (adds -2, -3 ... if another post already uses it)
    let baseSlug = generateSEOSlug(title, year) || id;
    let slug = baseSlug, n = 2;
    while (existing.some((p, i) => p.slug === slug && i !== editingPostIndex)) { slug = `${baseSlug}-${n++}`; }

    const summary = document.getElementById('postSummary').value.trim();
    const postData = {
        id,
        slug,
        title,
        year,
        tagline: summary.length > 65 ? summary.slice(0, 65) + '...' : summary,
        category,
        industry,
        breadcrumb: `${category.toUpperCase()} › ${industry.toUpperCase()}`,
        language: document.getElementById('postLanguage').value.trim() || 'English',
        rating: document.getElementById('postRating').value.trim() || '7.5',
        ageRating: document.getElementById('postAgeRating').value.trim() || 'PG-13',
        duration: document.getElementById('postDuration').value.trim() || '1h 50m',
        platform: document.getElementById('postPlatform').value.trim() || 'HD',
        uploadedAt: old ? old.uploadedAt : Date.now(),
        baseViews: old ? (old.baseViews || 1) : 1,
        safetyLevel: document.getElementById('postSafety').value,
        backdrop,
        poster,
        stills: [backdrop, ...((old && Array.isArray(old.stills)) ? old.stills.slice(1) : [])],
        trailerUrl: toEmbedUrl(document.getElementById('postTrailer').value),
        genres: genres.length ? genres : ['Drama'],
        tags: [...new Set([industry, year, category, ...genres])],
        summary,
        parentalGuide: {
            sexNudity: document.getElementById('pgSex').value.trim() || 'None reported.',
            violence: document.getElementById('pgViolence').value.trim() || 'Mild.',
            profanity: document.getElementById('pgProfanity').value.trim() || 'Mild.',
            drugsAlcohol: document.getElementById('pgDrugs').value.trim() || 'None.'
        },
        verdict: document.getElementById('pgVerdict').value.trim() || 'Suitable for family viewing.',
        tmdbId: pendingTmdbId || (old ? (old.tmdbId || '') : ''),
        cast: pendingCast.slice(),
        episodes: old ? (old.episodes || []) : [],
        defaultComments: old ? (old.defaultComments || []) : []
    };

    if (old) existing[editingPostIndex] = postData; else existing.unshift(postData);
    if (!safeSave('cineguide_custom_reviews', existing)) return;

    showAdminToast(old ? `Updated "${title}" successfully!` : `Published "${title}" successfully!`);
    resetPostFormState();
    switchAdminTab('manage');
}

function renderAdminPublishedPosts() {
    const list = safeParse('cineguide_custom_reviews', []);
    const grid = document.getElementById('adminPublishedPostsGrid');
    if (!grid) return;
    
    if (list.length === 0) {
        grid.innerHTML = `<div class="col-span-full p-10 text-center rounded-2xl bg-card border border-subtle">
            <p class="text-xs text-slate-400 mb-2">No custom posts created yet.</p>
            <button onclick="switchAdminTab('posts')" class="px-4 py-2 rounded-xl accent-bg text-white font-bold text-xs">Create First Post</button>
        </div>`;
        return;
    }

    grid.innerHTML = list.map((item, idx) => `
        <div class="p-3 rounded-2xl bg-card border border-subtle flex flex-col justify-between shadow">
            <div>
                <div class="relative aspect-[2/3] rounded-xl overflow-hidden bg-black mb-3 border border-subtle">
                    <img src="${esc(item.poster)}" alt="${esc(item.title)}" onerror="this.style.visibility='hidden'" class="w-full h-full object-cover">
                    <span class="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/75 text-[10px] font-bold text-amber-400 uppercase">${esc(item.category)}</span>
                    <span class="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/75 text-[10px] font-bold text-white">★ ${esc(item.rating)}</span>
                </div>
                <h4 class="font-extrabold text-sm truncate text-white mb-0.5">${esc(item.title)} (${esc(item.year)})</h4>
                <p class="text-[11px] text-emerald-400 font-mono mb-3 truncate">/?post=${esc(item.slug || item.id)}</p>
            </div>
            <div class="flex items-center gap-2 pt-2 border-t border-subtle">
                <button onclick="loadPostForEditing(${idx})" class="flex-1 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500 hover:text-black text-amber-400 text-xs font-bold transition flex items-center justify-center gap-1">
                    <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Edit
                </button>
                <button onclick="deleteCustomPost(${idx})" class="flex-1 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-600 hover:text-white text-rose-400 text-xs font-bold transition flex items-center justify-center gap-1">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

function loadPostForEditing(index) {
    const list = safeParse('cineguide_custom_reviews', []);
    const item = list[index];
    if (!item) return;

    editingPostIndex = index;
    switchAdminTab('posts');

    document.getElementById('formSubTitle').textContent = `Editing: ${item.title}`;
    document.getElementById('postTrailer').value = item.trailerUrl || '';
    document.getElementById('cancelEditBtn').classList.remove('hidden');
    document.getElementById('formSubmitBtn').textContent = 'Update Review Post';

    document.getElementById('postTitle').value = item.title || '';
    document.getElementById('postYear').value = item.year || '';
    document.getElementById('postCategory').value = item.category || 'Movie';
    document.getElementById('postIndustry').value = item.industry || '';
    document.getElementById('postRating').value = item.rating || '';
    document.getElementById('postPoster').value = item.poster || '';
    document.getElementById('postBackdrop').value = item.backdrop || '';
    document.getElementById('postLanguage').value = item.language || '';
    document.getElementById('postDuration').value = item.duration || '';
    document.getElementById('postPlatform').value = item.platform || '';
    document.getElementById('postAgeRating').value = item.ageRating || '';
    document.getElementById('postGenres').value = (item.genres || []).join(', ');
    document.getElementById('postTrailer').value = item.trailerUrl || '';
    document.getElementById('postSummary').value = item.summary || '';

    if (item.parentalGuide) {
        document.getElementById('pgSex').value = item.parentalGuide.sexNudity || '';
        document.getElementById('pgViolence').value = item.parentalGuide.violence || '';
        document.getElementById('pgProfanity').value = item.parentalGuide.profanity || '';
        document.getElementById('pgDrugs').value = item.parentalGuide.drugsAlcohol || '';
    }
    document.getElementById('pgVerdict').value = item.verdict || '';
    pendingCast = Array.isArray(item.cast) ? item.cast.slice() : [];
    pendingTmdbId = item.tmdbId || '';
    renderCastPreview();

    updateSEOPermalinkPreview();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}


function resetPostFormState() {
    editingPostIndex = null;
    const sub = document.getElementById('formSubTitle');
    if (sub) sub.textContent = 'Create New Post';
    const cancel = document.getElementById('cancelEditBtn');
    if (cancel) cancel.classList.add('hidden');
    const btn = document.getElementById('formSubmitBtn');
    if (btn) btn.textContent = 'Publish Review Post';
    const form = document.getElementById('postForm');
    if (form) form.reset();
    pendingCast = [];
    pendingTmdbId = '';
    renderCastPreview();
    updateSEOPermalinkPreview();
}


function deleteCustomPost(index) {
    const list = safeParse('cineguide_custom_reviews', []);
    const item = list[index];
    if (!item) return;
    if (!confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    list.splice(index, 1);
    safeSave('cineguide_custom_reviews', list);
    if (editingPostIndex !== null) resetPostFormState();
    renderAdminPublishedPosts();
    showAdminToast("Post deleted!");
}
