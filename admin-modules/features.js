// ============================================================================
// MODULE 7: SITE FEATURES (turn on/off + numbers)
// File: admin-modules/features.js
// Saved in localStorage key "cineguide_features" and exported inside site-data.json
// (key "features"), so every visitor gets the same settings after you upload it.
// ============================================================================

const FEATURE_DEFAULTS = {
    spotlight:      { enabled: true, count: 5, autoplay: true, seconds: 4 },
    heroSlider:     { autoplay: true, seconds: 4 },
    communityGuide: { enabled: true, guestVoting: false },
    cgRating:       { enabled: true },
    keepBinging:    { enabled: true, count: 6 }
};

function normalizeFeatures(raw) {
    const r = (raw && typeof raw === 'object') ? raw : {};
    const num = (v, min, max, d) => { v = Math.round(Number(v)); return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d; };
    const bool = (v, d) => typeof v === 'boolean' ? v : d;
    const D = FEATURE_DEFAULTS, s = r.spotlight || {}, h = r.heroSlider || {}, c = r.communityGuide || {}, g = r.cgRating || {}, k = r.keepBinging || {};
    return {
        spotlight:      { enabled: bool(s.enabled, D.spotlight.enabled), count: num(s.count, 1, 20, D.spotlight.count), autoplay: bool(s.autoplay, D.spotlight.autoplay), seconds: num(s.seconds, 2, 15, D.spotlight.seconds) },
        heroSlider:     { autoplay: bool(h.autoplay, D.heroSlider.autoplay), seconds: num(h.seconds, 2, 15, D.heroSlider.seconds) },
        communityGuide: { enabled: bool(c.enabled, D.communityGuide.enabled), guestVoting: bool(c.guestVoting, D.communityGuide.guestVoting) },
        cgRating:       { enabled: bool(g.enabled, D.cgRating.enabled) },
        keepBinging:    { enabled: bool(k.enabled, D.keepBinging.enabled), count: num(k.count, 1, 12, D.keepBinging.count) }
    };
}

function getSavedFeatures() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem('cineguide_features') || 'null'); } catch (e) {}
    return normalizeFeatures(saved);
}

function ftToggle(id, checked) {
    return `<label class="relative inline-flex items-center cursor-pointer shrink-0">
        <input type="checkbox" id="${id}" class="sr-only peer" ${checked ? 'checked' : ''}>
        <div class="w-11 h-6 rounded-full bg-slate-600 peer-checked:bg-emerald-500 transition relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5"></div>
    </label>`;
}
function ftRow(title, hint, control) {
    return `<div class="flex items-center justify-between gap-4 py-3 border-t border-subtle first:border-t-0">
        <div class="min-w-0"><p class="text-xs font-bold text-white">${title}</p><p class="text-[11px] text-slate-400 mt-0.5">${hint}</p></div>
        ${control}
    </div>`;
}
function ftNumber(id, value, min, max, unit) {
    return `<div class="shrink-0 flex items-center gap-1.5"><input type="number" id="${id}" value="${value}" min="${min}" max="${max}" inputmode="numeric" class="w-16 px-2 py-2 rounded-lg bg-[#090a0f] border border-subtle text-xs text-center"><span class="text-[11px] text-slate-400">${unit}</span></div>`;
}
function ftCard(title, sub, rows) {
    return `<div class="p-5 rounded-2xl bg-card border border-subtle">
        <h3 class="text-sm font-extrabold">${title}</h3><p class="text-[11px] text-slate-400 mb-1">${sub}</p>${rows}</div>`;
}

function initFeaturesModule() {
    const box = document.getElementById('tabSection-features');
    if (!box) return;
    const f = getSavedFeatures();
    box.innerHTML = `
        <div class="mb-5">
            <h2 class="text-xl font-extrabold">Site Features</h2>
            <p class="text-xs text-slate-400 mt-1">Turn website features on or off and change their numbers from here.</p>
        </div>
        <form onsubmit="saveFeatures(event)" class="space-y-4 max-w-3xl">
            ${ftCard("Editor's Pick • Top Rated slider", 'The big auto-sliding box at the top of the home page', `
                ${ftRow('Show this slider', 'Off = the box disappears from the home page', ftToggle('ft_spot_on', f.spotlight.enabled))}
                ${ftRow('Number of posts', 'How many top-rated posts slide (1 – 20)', ftNumber('ft_spot_count', f.spotlight.count, 1, 20, 'posts'))}
                ${ftRow('Auto slide', 'Off = visitors swipe by hand only', ftToggle('ft_spot_auto', f.spotlight.autoplay))}
                ${ftRow('Slide speed', 'Seconds each post stays (2 – 15)', ftNumber('ft_spot_sec', f.spotlight.seconds, 2, 15, 'sec'))}`)}

            ${ftCard('Post page background image slider', 'The images that slide behind the title inside every post', `
                ${ftRow('Auto slide', 'Off = images change only with the arrows / swipe', ftToggle('ft_hero_auto', f.heroSlider.autoplay))}
                ${ftRow('Slide speed', 'Seconds each image stays (2 – 15)', ftNumber('ft_hero_sec', f.heroSlider.seconds, 2, 15, 'sec'))}`)}

            ${ftCard('Community Guide (viewer voting)', 'Viewers vote on nudity, violence, language and "okay for family?"', `
                ${ftRow('Show Community Guide', 'Off = the whole voting box is hidden', ftToggle('ft_cg_on', f.communityGuide.enabled))}
                ${ftRow('Allow guests to vote', 'Off = only members signed in with Google can vote. On = anyone can vote without login (needs Anonymous sign-in enabled in Firebase; easier to spam)', ftToggle('ft_cg_guest', f.communityGuide.guestVoting))}`)}

            ${ftCard('CG Rating', "The CineGuide community star rating collected from every user's rating", `
                ${ftRow('Show CG Rating', 'Off = the CG Rating card is hidden and new ratings are not added to it', ftToggle('ft_cgr_on', f.cgRating.enabled))}`)}

            ${ftCard('Keep Binging', 'Related posts shown at the bottom of every post', `
                ${ftRow('Show Keep Binging', 'Off = the section disappears', ftToggle('ft_kb_on', f.keepBinging.enabled))}
                ${ftRow('Number of posts', 'How many posts to show (1 – 12)', ftNumber('ft_kb_count', f.keepBinging.count, 1, 12, 'posts'))}`)}

            <div class="flex flex-wrap gap-2.5">
                <button type="submit" class="flex-1 min-w-[160px] py-3 rounded-xl accent-bg text-white font-extrabold text-xs">Save features</button>
                <button type="button" onclick="resetFeatures()" class="px-5 py-3 rounded-xl bg-white/5 border border-subtle text-slate-300 font-bold text-xs">Reset to default</button>
            </div>

            <div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 leading-relaxed">
                <b>Important:</b> Saving changes the site in <b>this browser</b> right away (so you can preview it). To make it live for <b>all visitors</b>, export <code>site-data.json</code> and upload it to your repo (same as you do for new posts).
                <button type="button" onclick="exportSiteData()" class="mt-2.5 block w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs">Export site-data.json</button>
            </div>
        </form>`;
    lucide.createIcons();
}

function saveFeatures(ev) {
    if (ev) ev.preventDefault();
    const v = id => document.getElementById(id);
    const features = normalizeFeatures({
        spotlight:      { enabled: v('ft_spot_on').checked, count: v('ft_spot_count').value, autoplay: v('ft_spot_auto').checked, seconds: v('ft_spot_sec').value },
        heroSlider:     { autoplay: v('ft_hero_auto').checked, seconds: v('ft_hero_sec').value },
        communityGuide: { enabled: v('ft_cg_on').checked, guestVoting: v('ft_cg_guest').checked },
        cgRating:       { enabled: v('ft_cgr_on').checked },
        keepBinging:    { enabled: v('ft_kb_on').checked, count: v('ft_kb_count').value }
    });
    try { localStorage.setItem('cineguide_features', JSON.stringify(features)); } catch (e) { showAdminToast('Could not save (browser storage full?)'); return; }
    initFeaturesModule();   // shows the clamped numbers
    showAdminToast('Features saved ✓  (Export site-data.json to publish for everyone)');
}

function resetFeatures() {
    try { localStorage.removeItem('cineguide_features'); } catch (e) {}
    initFeaturesModule();
    showAdminToast('Features reset to default');
}
