// ============================================================================
// MODULE 2: UPCOMING MOVIES & SERIES MANAGER  (+ TMDB auto-fetch)
// File: admin-modules/upcoming.js
// ============================================================================

let upResults = [];          // current TMDB discover / search results
let upPage = 1;              // discover pagination
let upPendingCast = [];      // cast fetched from TMDB for the form
let upPendingMeta = {};      // tmdbId, tmdbType, releaseISO, status

function initUpcomingModule() {
    const container = document.getElementById('tabSection-upcoming');
    const sel = 'px-3 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs font-bold w-full';
    container.innerHTML = `
        <div class="mb-6">
            <h2 class="text-2xl font-black">Upcoming Movies & Web Series Manager</h2>
            <p class="text-xs text-slate-400 mt-1">Upload upcoming theatrical or OTT releases so users can add them to Watchlist & get release notifications.</p>
        </div>

        <!-- TMDB AUTO-FETCH -->
        <div class="p-5 rounded-2xl bg-card border border-amber-500/30 mb-6">
            <div class="flex items-center justify-between mb-3">
                <span class="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <i data-lucide="sparkles" class="w-4 h-4"></i> TMDB Upcoming Fetcher
                </span>
                <button onclick="switchAdminTab('settings')" class="text-[11px] text-slate-400 hover:text-white underline">TMDB API Key →</button>
            </div>

            <p class="text-[11px] text-slate-400 mb-2">১) আসন্ন রিলিজের লিস্ট আনুন — তারপর যেকোনোটায় ট্যাপ করলে রিলিজ ডেট, ট্রেলার ও কাস্ট সহ ফর্ম ভরে যাবে।</p>
            <div class="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <select id="upFetchType" class="${sel}">
                    <option value="movie">Movies</option>
                    <option value="tv">TV / Web Series</option>
                </select>
                <select id="upFetchRegion" class="${sel}" title="Release region">
                    <option value="">Region: Global</option>
                    <option value="US">US</option>
                    <option value="IN">India</option>
                    <option value="BD">Bangladesh</option>
                    <option value="GB">UK</option>
                    <option value="KR">South Korea</option>
                    <option value="JP">Japan</option>
                </select>
                <select id="upFetchLang" class="${sel}">
                    <option value="">Any language</option>
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                    <option value="bn">Bangla</option>
                    <option value="ta">Tamil</option>
                    <option value="te">Telugu</option>
                    <option value="ko">Korean</option>
                    <option value="ja">Japanese</option>
                </select>
                <select id="upFetchWindow" class="${sel}">
                    <option value="30">Next 30 days</option>
                    <option value="90" selected>Next 90 days</option>
                    <option value="180">Next 6 months</option>
                    <option value="365">Next 1 year</option>
                </select>
                <select id="upFetchSort" class="${sel}">
                    <option value="popularity.desc">Most popular</option>
                    <option value="date.asc">Soonest first</option>
                </select>
            </div>
            <button type="button" onclick="fetchUpcomingFromTMDB(true)" class="mt-2.5 w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs">
                Fetch Upcoming from TMDB
            </button>

            <div class="border-t border-subtle my-4"></div>

            <p class="text-[11px] text-slate-400 mb-2">২) অথবা সরাসরি <b>TMDB ID</b>, <b>TMDB লিংক</b> বা টাইটেল দিন।</p>
            <div class="flex flex-col sm:flex-row gap-2.5">
                <input type="text" id="upIdQuery" placeholder="TMDB ID (e.g. 83533), link (themoviedb.org/movie/83533) or title"
                    onkeydown="if(event.key==='Enter'){event.preventDefault();lookupUpcomingById();}"
                    class="flex-1 px-4 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs sm:text-sm focus:outline-none focus:border-amber-500">
                <button type="button" onclick="lookupUpcomingById()" class="px-5 py-2.5 rounded-xl accent-bg text-white font-extrabold text-xs shrink-0">Fetch by ID / Search</button>
            </div>

            <div id="upApiStatus" class="hidden text-xs mt-3"></div>
            <div id="upApiResults" class="hidden grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3"></div>
            <button type="button" id="upLoadMoreBtn" onclick="fetchUpcomingFromTMDB(false)" class="hidden mt-3 px-4 py-2 rounded-xl bg-white/5 border border-subtle text-xs font-bold text-slate-200">Load more</button>
        </div>

        <form id="upForm" onsubmit="saveNewUpcomingItem(event)" class="p-5 sm:p-6 rounded-2xl bg-card border border-subtle space-y-4 mb-8">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input type="text" id="upTitle" required placeholder="Upcoming Title (e.g. Avatar: Fire and Ash)" class="px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-sm">
                <input type="text" id="upDate" required placeholder="Release Date (e.g. December 18, 2026)" class="px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-sm">
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select id="upType" class="px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs font-bold">
                    <option value="Movie">Movie</option>
                    <option value="Web Series">Web Series</option>
                    <option value="Anime">Anime</option>
                </select>
                <input type="text" id="upWhere" required placeholder="Where (e.g. In Theaters & IMAX / Netflix)" class="px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
                <input type="text" id="upSafety" placeholder="Expected Rating (e.g. PG-13 Expected)" class="px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="url" id="upBackdrop" required placeholder="Backdrop Image URL (https://...)" class="px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
                <input type="url" id="upPoster" placeholder="Portrait Poster URL (Optional)" class="px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <input type="text" id="upGenres" placeholder="Genres (Action, Sci-Fi)" class="col-span-2 px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
                <input type="text" id="upLanguage" placeholder="Language" class="px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
                <input type="text" id="upDuration" placeholder="Duration" class="px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
            </div>
            <input type="text" id="upTrailer" placeholder="YouTube Trailer URL (auto-filled from TMDB)" class="w-full px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">

            <div id="upCastBox" class="hidden p-3 rounded-xl bg-[#090a0f] border border-subtle">
                <div class="flex items-center justify-between mb-2">
                    <span id="upCastTitle" class="text-[11px] font-bold uppercase text-slate-400"></span>
                    <button type="button" onclick="upClearCast()" class="text-[11px] text-rose-400 hover:underline">Clear cast</button>
                </div>
                <div id="upCastList" class="flex gap-2 overflow-x-auto pb-1"></div>
            </div>

            <textarea id="upNote" rows="2" required placeholder="Short release note or hype description..." class="w-full px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs"></textarea>

            <button type="submit" class="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm transition">
                + Add to Upcoming Calendar
            </button>
        </form>

        <div>
            <h3 class="text-base font-extrabold mb-3">Custom Upcoming Releases</h3>
            <div id="adminUpcomingList" class="space-y-2.5"></div>
        </div>
    `;
    renderAdminUpcomingList();
    lucide.createIcons();
}

// ---------------------------------------------------------------------------
// TMDB helpers (self-contained)
// ---------------------------------------------------------------------------
async function upTmdb(path, params) {
    const key = (localStorage.getItem('cineguide_tmdb_key') || '').trim();
    if (!key) throw new Error('Please save your TMDB API Key in Settings first!');
    const qs = new URLSearchParams(params || {});
    const headers = {};
    if (key.length > 60 && key.split('.').length === 3) headers['Authorization'] = 'Bearer ' + key; // v4 token
    else qs.set('api_key', key);                                                                       // v3 key
    const res = await fetch(`https://api.themoviedb.org/3${path}?${qs.toString()}`, { headers });
    let data = {};
    try { data = await res.json(); } catch (e) {}
    if (!res.ok) { const err = new Error(data.status_message || ('TMDB error ' + res.status)); err.status = res.status; throw err; }
    return data;
}

function upParseInput(input, type) {
    const q = String(input || '').trim();
    let m = q.match(/themoviedb\.org\/(?:[a-z]{2}(?:-[A-Z]{2})?\/)?(movie|tv)\/(\d+)/i);
    if (m) return { type: m[1].toLowerCase(), id: m[2] };
    m = q.match(/^(movie|tv)\s*[\/:\s]\s*(\d+)$/i);
    if (m) return { type: m[1].toLowerCase(), id: m[2] };
    if (/^\d{1,9}$/.test(q)) return { type, id: q, guessed: true };
    return null;
}

function upIsoDate(d) { return d.toISOString().slice(0, 10); }

function upFmtDate(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric', timeZone: 'UTC' });
}

function upRuntime(min) {
    min = Number(min || 0);
    if (!min) return '';
    const h = Math.floor(min / 60), m = min % 60;
    return h ? `${h}h ${m}m` : `${m}m`;
}

function upPickTrailer(videos) {
    const list = ((videos && videos.results) || []).filter(v => v.site === 'YouTube' && v.key);
    if (!list.length) return '';
    const score = v => (v.type === 'Trailer' ? 4 : v.type === 'Teaser' ? 2 : 0) + (v.official ? 2 : 0) + (v.iso_639_1 === 'en' ? 1 : 0);
    list.sort((a, b) => score(b) - score(a));
    return 'https://www.youtube.com/watch?v=' + list[0].key;
}

function upStatus(html, kind) {
    const el = document.getElementById('upApiStatus');
    if (!el) return;
    el.className = 'text-xs mt-3 ' + (kind === 'err' ? 'text-rose-400' : kind === 'ok' ? 'text-emerald-400' : 'text-slate-400');
    el.innerHTML = html;
}

// ---------------------------------------------------------------------------
// 1) Discover upcoming releases
// ---------------------------------------------------------------------------
async function fetchUpcomingFromTMDB(reset) {
    const type = document.getElementById('upFetchType').value;
    const region = document.getElementById('upFetchRegion').value;
    const lang = document.getElementById('upFetchLang').value;
    const days = parseInt(document.getElementById('upFetchWindow').value, 10) || 90;
    const sortPick = document.getElementById('upFetchSort').value;
    const box = document.getElementById('upApiResults');
    if (reset) { upPage = 1; upResults = []; } else { upPage++; }

    const today = new Date();
    const end = new Date(Date.now() + days * 86400000);
    const params = { page: String(upPage), include_adult: 'false', 'vote_count.gte': '0' };
    let sortBy;
    if (type === 'movie') {
        sortBy = sortPick === 'date.asc' ? 'primary_release_date.asc' : 'popularity.desc';
        if (region) {
            params.region = region;
            params.with_release_type = '2|3';           // theatrical releases in that region
            params['release_date.gte'] = upIsoDate(today);
            params['release_date.lte'] = upIsoDate(end);
        } else {
            params['primary_release_date.gte'] = upIsoDate(today);
            params['primary_release_date.lte'] = upIsoDate(end);
        }
    } else {
        sortBy = sortPick === 'date.asc' ? 'first_air_date.asc' : 'popularity.desc';
        params['first_air_date.gte'] = upIsoDate(today);
        params['first_air_date.lte'] = upIsoDate(end);
        if (region) params.watch_region = region;
    }
    params.sort_by = sortBy;
    if (lang) params.with_original_language = lang;

    box.classList.remove('hidden');
    upStatus('TMDB থেকে আসন্ন রিলিজ আনা হচ্ছে...');
    try {
        const data = await upTmdb(`/discover/${type}`, params);
        const fresh = (data.results || []).map(m => ({
            type, id: m.id,
            title: m.title || m.name,
            date: m.release_date || m.first_air_date || '',
            thumb: m.poster_path ? `https://image.tmdb.org/t/p/w200${m.poster_path}` : ''
        }));
        upResults = upResults.concat(fresh);
        renderUpApiResults();
        document.getElementById('upLoadMoreBtn').classList.toggle('hidden', !(data.total_pages > upPage));
        upStatus(upResults.length ? `${upResults.length} টি পাওয়া গেছে। যেকোনোটায় ট্যাপ করে ফর্ম ভরুন।` : 'এই ফিল্টারে কোনো আসন্ন রিলিজ পাওয়া যায়নি — Region/Language/সময় বদলে দেখুন।', upResults.length ? 'ok' : 'err');
    } catch (err) {
        if (!reset) upPage--;
        upStatus(esc(err.message || 'TMDB error'), 'err');
    }
}

function renderUpApiResults() {
    const box = document.getElementById('upApiResults');
    if (!upResults.length) { box.innerHTML = ''; return; }
    box.innerHTML = upResults.map((it, i) => `
        <div onclick="upPickResult(${i})" class="rounded-xl bg-[#090a0f] border border-subtle hover:border-amber-500 cursor-pointer overflow-hidden">
            <div class="aspect-[2/3] bg-black">
                <img src="${esc(it.thumb)}" alt="" class="w-full h-full object-cover" onerror="this.style.visibility='hidden'">
            </div>
            <div class="p-2">
                <h4 class="font-bold text-[11px] truncate">${esc(it.title)}</h4>
                <p class="text-[10px] text-amber-400">${esc(it.date ? upFmtDate(it.date) : 'Date TBA')}</p>
            </div>
        </div>`).join('');
}

async function upPickResult(i) {
    const it = upResults[i];
    if (!it) return;
    await loadUpcomingDetails(it.type, it.id);
}

// ---------------------------------------------------------------------------
// 2) Lookup by ID / link / title
// ---------------------------------------------------------------------------
async function lookupUpcomingById() {
    const q = document.getElementById('upIdQuery').value.trim();
    if (!q) return;
    const type = document.getElementById('upFetchType').value;
    const box = document.getElementById('upApiResults');
    const parsed = upParseInput(q, type);
    try {
        if (parsed) {
            try {
                await loadUpcomingDetails(parsed.type, parsed.id);
            } catch (e) {
                if (parsed.guessed && e.status === 404) await loadUpcomingDetails(parsed.type === 'movie' ? 'tv' : 'movie', parsed.id);
                else throw e;
            }
            return;
        }
        // title search → pick from list
        box.classList.remove('hidden');
        upStatus('Searching TMDB...');
        const data = await upTmdb(`/search/${type}`, { query: q });
        upResults = (data.results || []).slice(0, 8).map(m => ({
            type, id: m.id, title: m.title || m.name,
            date: m.release_date || m.first_air_date || '',
            thumb: m.poster_path ? `https://image.tmdb.org/t/p/w200${m.poster_path}` : ''
        }));
        renderUpApiResults();
        document.getElementById('upLoadMoreBtn').classList.add('hidden');
        upStatus(upResults.length ? 'যেকোনোটায় ট্যাপ করে ফর্ম ভরুন।' : 'কিছু পাওয়া যায়নি। অন্য টাইটেল বা TMDB ID দিন।', upResults.length ? 'ok' : 'err');
    } catch (err) {
        document.getElementById('upApiResults').classList.remove('hidden');
        upStatus(esc(err.message || 'TMDB error'), 'err');
    }
}

// ---------------------------------------------------------------------------
// Full details: dates, where, rating, trailer, cast
// ---------------------------------------------------------------------------
async function loadUpcomingDetails(type, id) {
    const region = (document.getElementById('upFetchRegion') || {}).value || '';
    upStatus(`TMDB থেকে ডিটেইল, ট্রেলার ও কাস্ট আনা হচ্ছে (ID ${esc(id)})...`);
    document.getElementById('upApiStatus').classList.remove('hidden');

    const extra = type === 'movie' ? 'videos,credits,release_dates,watch/providers' : 'videos,credits,content_ratings,watch/providers';
    let d;
    try {
        d = await upTmdb(`/${type}/${id}`, { append_to_response: extra, include_video_language: 'en,null,hi,bn' });
    } catch (e) {
        if (e.status === 404) { const err = new Error(`TMDB-তে ${type} ID ${id} পাওয়া যায়নি।`); err.status = 404; throw err; }
        throw e;
    }
    let trailer = upPickTrailer(d.videos);
    if (!trailer) { try { trailer = upPickTrailer(await upTmdb(`/${type}/${id}/videos`, {})); } catch (e) {} }

    const reg = region || 'US';
    const providers = ((((d['watch/providers'] || {}).results || {})[reg] || ((d['watch/providers'] || {}).results || {}).US || {}).flatrate || []).map(p => p.provider_name);
    let releaseISO = '', where = '', cert = '';

    if (type === 'movie') {
        const entry = ((d.release_dates || {}).results || []).find(r => r.iso_3166_1 === reg) || ((d.release_dates || {}).results || []).find(r => r.iso_3166_1 === 'US');
        const dates = (entry && entry.release_dates) || [];
        const pickType = types => dates.filter(x => types.includes(x.type) && x.release_date).sort((a, b) => a.release_date.localeCompare(b.release_date))[0];
        const theatrical = pickType([3, 2]);
        const digital = pickType([4, 6, 5]);
        const main = theatrical || digital;
        releaseISO = (main ? main.release_date : d.release_date || '').slice(0, 10);
        where = theatrical ? 'In Theaters' : (providers.length ? providers.slice(0, 2).join(' / ') : (digital ? 'Digital / OTT Release' : (d.status === 'Released' ? 'Out Now' : 'In Theaters')));
        if (theatrical && digital) { /* keep theatrical date as the headline date */ }
        cert = ((theatrical || digital || dates.find(x => x.certification) || {}).certification) || (dates.find(x => x.certification) || {}).certification || '';
    } else {
        releaseISO = (d.first_air_date || (d.next_episode_to_air || {}).air_date || '').slice(0, 10);
        where = providers.length ? providers.slice(0, 2).join(' / ') : (((d.networks || [])[0] || {}).name || 'TBA');
        const cr = ((d.content_ratings || {}).results || []);
        cert = ((cr.find(r => r.iso_3166_1 === reg) || cr.find(r => r.iso_3166_1 === 'US') || {}).rating) || '';
    }

    const cast = ((d.credits && d.credits.cast) || []).slice(0, 12).map(c => ({
        actorId: 'tmdb-' + c.id, tmdbPersonId: c.id, name: c.name, character: c.character || '',
        photo: c.profile_path ? `https://image.tmdb.org/t/p/w500${c.profile_path}` : ''
    }));

    const poster = d.poster_path ? `https://image.tmdb.org/t/p/w500${d.poster_path}` : '';
    const backdrop = d.backdrop_path ? `https://image.tmdb.org/t/p/w1280${d.backdrop_path}` : poster;
    const runtime = type === 'movie' ? d.runtime : ((d.episode_run_time || [])[0] || (d.last_episode_to_air || {}).runtime || 0);

    const full = {
        tmdbId: String(d.id), tmdbType: type,
        title: d.title || d.name,
        releaseISO, releaseDate: upFmtDate(releaseISO),
        category: type === 'tv' ? ((d.original_language === 'ja' && (d.genres || []).some(g => g.id === 16)) ? 'Anime' : 'Web Series') : 'Movie',
        where, cert,
        poster, backdrop,
        note: d.overview || d.tagline || '',
        genres: (d.genres || []).map(g => g.name).join(', '),
        language: ((d.spoken_languages || [])[0] || {}).english_name || (d.original_language || 'en').toUpperCase(),
        duration: upRuntime(runtime),
        trailer, cast, status: d.status || ''
    };
    fillUpcomingForm(full);
}

function fillUpcomingForm(f) {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
    set('upTitle', f.title);
    set('upDate', f.releaseDate);
    document.getElementById('upType').value = f.category;
    set('upWhere', f.where);
    set('upSafety', f.cert ? `${f.cert} (Expected)` : 'TBA');
    set('upBackdrop', f.backdrop || f.poster);
    set('upPoster', f.poster);
    set('upNote', f.note);
    set('upGenres', f.genres);
    set('upLanguage', f.language);
    set('upDuration', f.duration);
    set('upTrailer', f.trailer);
    upPendingCast = f.cast || [];
    upPendingMeta = { tmdbId: f.tmdbId, tmdbType: f.tmdbType, releaseISO: f.releaseISO, status: f.status };
    renderUpCast();

    const bits = [
        f.releaseDate ? `Release: ${esc(f.releaseDate)}` : '<span class="text-amber-400">release date TMDB-তে এখনো নেই — হাতে লিখুন</span>',
        f.trailer ? 'trailer ✓' : 'no trailer yet',
        `${upPendingCast.length} cast`
    ];
    upStatus(`✓ “${esc(f.title)}” ফর্মে ভরা হয়েছে — ${bits.join(' • ')}. নিচে স্ক্রল করে চেক করে সেভ করুন।`, 'ok');
    document.getElementById('upForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
    showAdminToast(`Auto-filled "${f.title}"!`);
}

function renderUpCast() {
    const box = document.getElementById('upCastBox');
    if (!box) return;
    if (!upPendingCast.length) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    document.getElementById('upCastTitle').textContent = `Cast (${upPendingCast.length}) — will be saved with the release`;
    document.getElementById('upCastList').innerHTML = upPendingCast.map((c, i) => `
        <div class="w-16 shrink-0 text-center relative">
            <button type="button" onclick="upRemoveCast(${i})" class="absolute -top-1 -right-1 z-10 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] leading-4">×</button>
            <img src="${esc(c.photo)}" alt="" class="w-16 h-20 object-cover rounded-lg bg-card" onerror="this.style.visibility='hidden'">
            <p class="text-[9px] text-slate-300 truncate mt-1">${esc(c.name)}</p>
        </div>`).join('');
}
function upRemoveCast(i) { upPendingCast.splice(i, 1); renderUpCast(); }
function upClearCast() { upPendingCast = []; renderUpCast(); }

// ---------------------------------------------------------------------------
// Save / list / delete
// ---------------------------------------------------------------------------
function saveNewUpcomingItem(e) {
    e.preventDefault();
    const val = id => document.getElementById(id).value.trim();
    const releaseDate = val('upDate');
    const parsedISO = isNaN(Date.parse(releaseDate)) ? '' : new Date(Date.parse(releaseDate)).toISOString().slice(0, 10);
    const genres = val('upGenres').split(',').map(g => g.trim()).filter(Boolean);
    const trailerRaw = val('upTrailer');
    const item = {
        id: 'up-' + Date.now(),
        title: val('upTitle'),
        year: (upPendingMeta.releaseISO || parsedISO || '').slice(0, 4) || String(new Date().getFullYear()),
        releaseDate,
        releaseISO: upPendingMeta.releaseISO || parsedISO,
        type: val('upType'),
        releaseWhere: val('upWhere'),
        expectedSafety: val('upSafety') || 'TBA',
        backdrop: val('upBackdrop'),
        poster: val('upPoster') || val('upBackdrop'),
        note: val('upNote'),
        rating: 'TBA',
        genres,
        language: val('upLanguage'),
        duration: val('upDuration'),
        trailerUrl: (typeof toEmbedUrl === 'function' && trailerRaw) ? toEmbedUrl(trailerRaw) : trailerRaw,
        cast: upPendingCast.slice(),
        tmdbId: upPendingMeta.tmdbId || '',
        tmdbType: upPendingMeta.tmdbType || '',
        tmdbStatus: upPendingMeta.status || ''
    };

    const list = safeParse('cineguide_upcoming', []);
    if (item.tmdbId && list.some(u => u.tmdbId === item.tmdbId && u.tmdbType === item.tmdbType)) {
        if (!confirm(`"${item.title}" is already in your Upcoming list. Add it again?`)) return;
    }
    list.unshift(item);
    if (!safeSave('cineguide_upcoming', list)) return;
    e.target.reset();
    upPendingCast = []; upPendingMeta = {};
    renderUpCast();
    renderAdminUpcomingList();
    if (isNaN(Date.parse(item.releaseDate))) {
        showAdminToast(`Added, but "${item.releaseDate}" is not a recognised date: use e.g. December 18, 2026 so alerts work.`);
    } else {
        showAdminToast(`Added "${item.title}" to Upcoming!`);
    }
}

function renderAdminUpcomingList() {
    const list = safeParse('cineguide_upcoming', []);
    const box = document.getElementById('adminUpcomingList');
    if (!box) return;
    if (list.length === 0) {
        box.innerHTML = `<p class="text-xs text-slate-500">No custom upcoming items added yet.</p>`;
        return;
    }
    box.innerHTML = list.map((u, idx) => `
        <div class="p-3.5 rounded-xl bg-card border border-subtle flex items-center justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
                ${u.poster ? `<img src="${esc(u.poster)}" alt="" class="w-10 h-14 object-cover rounded-lg bg-black shrink-0" onerror="this.style.visibility='hidden'">` : ''}
                <div class="min-w-0">
                    <span class="text-[10px] font-bold text-amber-400">${esc(u.releaseDate)} • ${esc(u.releaseWhere)}</span>
                    <h4 class="font-bold text-sm truncate">${esc(u.title)} (${esc(u.type)})</h4>
                    <p class="text-[10px] text-slate-500">${(u.cast && u.cast.length) ? u.cast.length + ' cast' : 'no cast'} • ${u.trailerUrl ? 'trailer ✓' : 'no trailer'}${u.tmdbId ? ' • TMDB #' + esc(u.tmdbId) : ''}</p>
                </div>
            </div>
            <button onclick="deleteUpcomingItem(${idx})" class="px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-400 text-xs font-bold shrink-0">Remove</button>
        </div>
    `).join('');
}

function deleteUpcomingItem(idx) {
    const list = safeParse('cineguide_upcoming', []);
    list.splice(idx, 1);
    safeSave('cineguide_upcoming', list);
    renderAdminUpcomingList();
    showAdminToast("Upcoming item removed!");
}
