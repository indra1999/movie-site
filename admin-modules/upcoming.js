// ============================================================================
// MODULE 2: UPCOMING MOVIES & SERIES MANAGER
// File: admin-modules/upcoming.js
// ============================================================================

function initUpcomingModule() {
    const container = document.getElementById('tabSection-upcoming');
    container.innerHTML = `
        <div class="mb-6">
            <h2 class="text-2xl font-black">Upcoming Movies & Web Series Manager</h2>
            <p class="text-xs text-slate-400 mt-1">Upload upcoming theatrical or OTT releases so users can add them to Watchlist & get release notifications.</p>
        </div>

        <form onsubmit="saveNewUpcomingItem(event)" class="p-5 sm:p-6 rounded-2xl bg-card border border-subtle space-y-4 mb-8">
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
}

function saveNewUpcomingItem(e) {
    e.preventDefault();
    const item = {
        id: 'up-' + Date.now(),
        title: document.getElementById('upTitle').value.trim(),
        releaseDate: document.getElementById('upDate').value.trim(),
        type: document.getElementById('upType').value,
        releaseWhere: document.getElementById('upWhere').value.trim(),
        expectedSafety: document.getElementById('upSafety').value.trim() || 'TBA',
        backdrop: document.getElementById('upBackdrop').value.trim(),
        poster: document.getElementById('upPoster').value.trim() || document.getElementById('upBackdrop').value.trim(),
        note: document.getElementById('upNote').value.trim()
    };

    const list = safeParse('cineguide_upcoming', []);
    list.unshift(item);
    if (!safeSave('cineguide_upcoming', list)) return;
    e.target.reset();
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
        <div class="p-3.5 rounded-xl bg-card border border-subtle flex items-center justify-between">
            <div>
                <span class="text-[10px] font-bold text-amber-400">${esc(u.releaseDate)} • ${esc(u.releaseWhere)}</span>
                <h4 class="font-bold text-sm">${esc(u.title)} (${esc(u.type)})</h4>
            </div>
            <button onclick="deleteUpcomingItem(${idx})" class="px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-400 text-xs font-bold">Remove</button>
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
