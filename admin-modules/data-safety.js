// ============================================================================
// MODULE 6: DATA SAFETY (auto-copy, version history, backups, recovery)
// File: admin-modules/data-safety.js
//
// Posts, upcoming items, categories and ads live in this browser's localStorage.
// This module keeps them from ever being lost by:
//   1. Mirroring every save into IndexedDB (a second, independent storage area)
//   2. Keeping the last 25 versions of the data (undo / restore points)
//   3. Auto-restoring from the mirror, or from site-data.json on the server,
//      when the browser's list is found empty (e.g. after a cleared cache)
//   4. Showing a "changes not backed up" bar and one-click backup download
//   5. Asking the browser to mark storage as persistent (no automatic eviction)
// It never deletes anything on its own and never sends data anywhere.
// ============================================================================

(function () {
    'use strict';

    const TRACK = ['cineguide_custom_reviews', 'cineguide_upcoming', 'cineguide_custom_categories', 'cineguide_ads_config'];
    const STATE_KEY = 'cineguide_backup_state';     // { dirty, lastBackupAt }
    const EMPTY_FLAG = 'cineguide_user_emptied';    // set when the admin intentionally removed everything
    const DB_NAME = 'cineguide_safety';
    const STORE = 'kv';
    const MAX_SNAPSHOTS = 25;

    let suppressDirty = false;
    let lastSnapJson = null;
    let mirrorTimer = null;

    // ------------------------------------------------------------------ helpers
    function readJSON(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            if (raw === null || raw === '') return fallback;
            const v = JSON.parse(raw);
            return v === null || v === undefined ? fallback : v;
        } catch (e) { return fallback; }
    }

    function toast(msg) { if (typeof showAdminToast === 'function') showAdminToast(msg); }
    function escHtml(v) { return typeof esc === 'function' ? esc(v) : String(v == null ? '' : v); }

    function collect() {
        return {
            reviews: readJSON('cineguide_custom_reviews', []),
            upcoming: readJSON('cineguide_upcoming', []),
            categories: readJSON('cineguide_custom_categories', []),
            ads: readJSON('cineguide_ads_config', {}),
            footer: {
                tagline: localStorage.getItem('cineguide_footer_tagline') || '',
                copyright: localStorage.getItem('cineguide_footer_copyright') || '',
                credit: localStorage.getItem('cineguide_footer_credit') || ''
            }
        };
    }

    function isEmptyData(d) {
        return !d || !((d.reviews || []).length || (d.upcoming || []).length || (d.categories || []).length);
    }

    function countsOf(d) {
        return { posts: (d.reviews || []).length, upcoming: (d.upcoming || []).length };
    }

    function getState() {
        const s = readJSON(STATE_KEY, {});
        return { dirty: Number(s.dirty) || 0, lastBackupAt: Number(s.lastBackupAt) || 0 };
    }
    function setState(s) { try { localStorage.setItem(STATE_KEY, JSON.stringify(s)); } catch (e) {} }

    function fmtTime(ts) { return ts ? new Date(ts).toLocaleString() : 'never'; }

    // ------------------------------------------------------------------ IndexedDB (all calls fail soft)
    let dbPromise = null;
    function openDB() {
        if (dbPromise) return dbPromise;
        dbPromise = new Promise((resolve, reject) => {
            if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB not available')); return; }
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'key' });
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
        return dbPromise;
    }
    function idb(mode, fn) {
        return openDB().then(db => new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, mode);
            const out = fn(tx.objectStore(STORE));
            tx.oncomplete = () => resolve(out && out.result !== undefined ? out.result : undefined);
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        }));
    }
    const idbPut = rec => idb('readwrite', st => st.put(rec));
    const idbGet = key => idb('readonly', st => st.get(key));
    const idbAll = () => idb('readonly', st => st.getAll());
    const idbDel = key => idb('readwrite', st => st.delete(key));

    // ------------------------------------------------------------------ mirror + snapshots
    function scheduleMirror() {
        clearTimeout(mirrorTimer);
        mirrorTimer = setTimeout(() => {
            const d = collect();
            if (isEmptyData(d)) return;   // never overwrite the safe copy with an empty list
            idbPut({ key: 'mirror', ts: Date.now(), data: d }).catch(() => {});
        }, 300);
    }

    function snapshotNow(data) {
        if (isEmptyData(data)) return;
        const json = JSON.stringify(data);
        if (json === lastSnapJson) return;
        lastSnapJson = json;
        const ts = Date.now();
        idbPut({ key: 'snap:' + String(ts).padStart(15, '0'), ts, counts: countsOf(data), data })
            .then(pruneSnapshots)
            .catch(() => {});
    }

    function pruneSnapshots() {
        return idbAll().then(all => {
            const snaps = (all || []).filter(r => String(r.key).startsWith('snap:')).sort((a, b) => a.key.localeCompare(b.key));
            const extra = snaps.length - MAX_SNAPSHOTS;
            return Promise.all(snaps.slice(0, Math.max(0, extra)).map(r => idbDel(r.key)));
        });
    }

    // ------------------------------------------------------------------ apply data (merge / replace)
    function applyData(data, mode, silent) {
        if (!data || typeof data !== 'object') return;
        suppressDirty = !!silent;
        try {
            const save = (key, val) => window.safeSave(key, val);
            const mergeList = (key, incoming) => {
                if (!Array.isArray(incoming)) return;
                const cur = mode === 'replace' ? [] : readJSON(key, []);
                const ids = new Set(cur.map(x => x && x.id));
                save(key, [...cur, ...incoming.filter(x => x && x.id && !ids.has(x.id))]);
            };
            mergeList('cineguide_custom_reviews', data.reviews);
            mergeList('cineguide_upcoming', data.upcoming);
            if (Array.isArray(data.categories)) {
                const cur = mode === 'replace' ? [] : readJSON('cineguide_custom_categories', []);
                save('cineguide_custom_categories', [...new Set([...cur, ...data.categories])]);
            }
            if (data.ads && typeof data.ads === 'object' && (mode === 'replace' || !Object.keys(readJSON('cineguide_ads_config', {})).length)) {
                save('cineguide_ads_config', data.ads);
            }
            if (data.footer) {
                ['tagline', 'copyright', 'credit'].forEach(k => {
                    const key = 'cineguide_footer_' + k;
                    if (data.footer[k] && (mode === 'replace' || !localStorage.getItem(key))) localStorage.setItem(key, data.footer[k]);
                });
            }
        } finally {
            suppressDirty = false;
        }
        scheduleMirror();
        if (typeof initAllAdminModules === 'function') initAllAdminModules();
        renderBanner();
    }

    // ------------------------------------------------------------------ dirty tracking + banner
    function markDirty() {
        if (suppressDirty) return;
        const s = getState();
        s.dirty += 1;
        setState(s);
        renderBanner();
    }
    function markClean() {
        setState({ dirty: 0, lastBackupAt: Date.now() });
        renderBanner();
        renderCard();
    }

    function renderBanner() {
        const main = document.querySelector('#adminAppWrapper main');
        if (!main) return;
        let bar = document.getElementById('dsBanner');
        const s = getState();
        if (!s.dirty) { if (bar) bar.classList.add('hidden'); return; }
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'dsBanner';
            main.insertBefore(bar, main.firstChild);
        }
        bar.className = 'mb-5 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-2 text-xs';
        bar.innerHTML = `
            <span class="text-amber-300 font-bold">${s.dirty} change${s.dirty > 1 ? 's' : ''} not backed up yet</span>
            <button type="button" onclick="DataSafety.downloadBackup()" class="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-extrabold">Download backup</button>`;
    }

    // ------------------------------------------------------------------ backup file
    function downloadBackup() {
        const data = Object.assign({ exportedAt: new Date().toISOString(), backupVersion: 2 }, collect());
        const d = new Date();
        const pad = n => String(n).padStart(2, '0');
        const name = `cineguide-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        markClean();
        toast('Backup downloaded: ' + name);
    }

    // ------------------------------------------------------------------ recovery actions
    async function recoverFromMirror() {
        const m = await idbGet('mirror').catch(() => null);
        if (!m || !m.data || isEmptyData(m.data)) { toast('No automatic copy found in this browser.'); return; }
        applyData(m.data, 'merge', true);
        localStorage.removeItem(EMPTY_FLAG);
        toast('Recovered missing items from the automatic copy.');
    }

    async function restoreFromServer() {
        try {
            const r = await fetch('site-data.json', { cache: 'no-store' });
            if (!r.ok) throw new Error('not found');
            const data = await r.json();
            if (isEmptyData(data)) { toast('site-data.json on the server has no posts.'); return; }
            applyData(data, 'merge', true);
            localStorage.removeItem(EMPTY_FLAG);
            toast('Restored from site-data.json on the server.');
        } catch (e) {
            toast('Could not load site-data.json from the server.');
        }
    }

    async function restoreSnapshot(key) {
        const rec = await idbGet(key).catch(() => null);
        if (!rec || !rec.data) { toast('That version could not be read.'); return; }
        const c = rec.counts || countsOf(rec.data);
        if (!confirm(`Restore the version from ${fmtTime(rec.ts)}?\n\nThis replaces the current list with ${c.posts} posts and ${c.upcoming} upcoming items.\nYour current data is saved as a restore point first, so you can undo this.`)) return;
        snapshotNow(collect());
        lastSnapJson = null;
        applyData(rec.data, 'replace', true);
        localStorage.removeItem(EMPTY_FLAG);
        toast('Version restored.');
    }

    // ------------------------------------------------------------------ settings card
    async function renderCard() {
        const box = document.getElementById('dsCard');
        if (!box) return;

        const local = collect();
        const s = getState();
        let mirror = null, snaps = [], persisted = false;
        try { mirror = await idbGet('mirror'); } catch (e) {}
        try { snaps = ((await idbAll()) || []).filter(r => String(r.key).startsWith('snap:')).sort((a, b) => b.key.localeCompare(a.key)); } catch (e) {}
        try { persisted = !!(navigator.storage && navigator.storage.persisted && await navigator.storage.persisted()); } catch (e) {}

        const lc = countsOf(local);
        const mc = mirror && mirror.data ? countsOf(mirror.data) : null;
        const localIds = new Set((local.reviews || []).concat(local.upcoming || []).map(x => x && x.id));
        const missing = mirror && mirror.data ? ((mirror.data.reviews || []).concat(mirror.data.upcoming || [])).filter(x => x && x.id && !localIds.has(x.id)).length : 0;

        const btn = 'px-3.5 py-2 rounded-xl text-xs font-bold border border-subtle bg-white/5 hover:bg-white/10 text-slate-100';

        box.innerHTML = `
            <h3 class="text-base font-extrabold mb-1">Data Safety & Backups</h3>
            <p class="text-xs text-slate-400 mb-4">Your posts are stored separately from the website code, so replacing code files never touches them. They are also copied automatically to a second storage area and kept as restore points.</p>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4 text-center">
                <div class="p-3 rounded-xl bg-[#090a0f] border border-subtle"><div class="text-lg font-black text-white">${lc.posts}</div><div class="text-[10px] uppercase text-slate-400 font-bold">Posts</div></div>
                <div class="p-3 rounded-xl bg-[#090a0f] border border-subtle"><div class="text-lg font-black text-white">${lc.upcoming}</div><div class="text-[10px] uppercase text-slate-400 font-bold">Upcoming</div></div>
                <div class="p-3 rounded-xl bg-[#090a0f] border border-subtle"><div class="text-lg font-black ${mirror ? 'text-emerald-400' : 'text-amber-400'}">${mirror ? 'ON' : 'WAIT'}</div><div class="text-[10px] uppercase text-slate-400 font-bold">Auto-copy</div></div>
                <div class="p-3 rounded-xl bg-[#090a0f] border border-subtle"><div class="text-lg font-black ${persisted ? 'text-emerald-400' : 'text-slate-300'}">${persisted ? 'YES' : 'NO'}</div><div class="text-[10px] uppercase text-slate-400 font-bold">Protected storage</div></div>
            </div>

            <ul class="text-xs text-slate-400 space-y-1 mb-4">
                <li>Last automatic copy: <span class="text-slate-200">${mirror ? fmtTime(mirror.ts) : 'not created yet'}${mc ? ` (${mc.posts} posts, ${mc.upcoming} upcoming)` : ''}</span></li>
                <li>Last backup file downloaded: <span class="text-slate-200">${fmtTime(s.lastBackupAt)}</span></li>
                <li>Changes since last backup file: <span class="${s.dirty ? 'text-amber-400' : 'text-emerald-400'} font-bold">${s.dirty}</span></li>
            </ul>

            ${missing ? `<div class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200 mb-4 flex flex-wrap items-center justify-between gap-2">
                <span>${missing} item${missing > 1 ? 's' : ''} found in the automatic copy that are missing from the current list.</span>
                <button type="button" onclick="DataSafety.recoverFromMirror()" class="px-3 py-1.5 rounded-lg bg-rose-500 text-white font-extrabold">Recover them</button>
            </div>` : ''}

            <div class="flex flex-wrap gap-2 mb-5">
                <button type="button" onclick="DataSafety.downloadBackup()" class="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white">Download full backup now</button>
                <button type="button" onclick="DataSafety.recoverFromMirror()" class="${btn}">Recover from automatic copy</button>
                <button type="button" onclick="DataSafety.restoreFromServer()" class="${btn}">Restore from site-data.json on server</button>
            </div>

            <h4 class="text-xs font-extrabold uppercase text-slate-300 mb-2">Previous versions (restore points)</h4>
            ${snaps.length ? `<div class="space-y-1.5 max-h-64 overflow-y-auto">${snaps.slice(0, MAX_SNAPSHOTS).map(r => `
                <div class="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[#090a0f] border border-subtle">
                    <div class="min-w-0">
                        <div class="text-xs font-bold text-slate-200">${escHtml(fmtTime(r.ts))}</div>
                        <div class="text-[10px] text-slate-500">${r.counts ? r.counts.posts : 0} posts • ${r.counts ? r.counts.upcoming : 0} upcoming</div>
                    </div>
                    <button type="button" onclick="DataSafety.restoreSnapshot('${escHtml(r.key)}')" class="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500 hover:text-black text-amber-400 text-[11px] font-bold shrink-0">Restore</button>
                </div>`).join('')}</div>`
                : '<p class="text-xs text-slate-500">Restore points will appear here after your next save.</p>'}
        `;
    }

    function ensureCard() {
        const sec = document.getElementById('tabSection-settings');
        if (!sec) return;
        let box = document.getElementById('dsCard');
        if (!box || !sec.contains(box)) {
            box = document.createElement('div');
            box.id = 'dsCard';
            box.className = 'mt-6 p-5 sm:p-6 rounded-2xl bg-card border border-emerald-500/30';
            sec.appendChild(box);
        }
        renderCard();
    }

    // ------------------------------------------------------------------ hooks into existing code
    // 1) every save of site content: take a restore point BEFORE it, mirror AFTER it, count it as unsaved
    const originalSafeSave = window.safeSave;
    if (typeof originalSafeSave === 'function') {
        window.safeSave = function (key, val) {
            const tracked = TRACK.indexOf(key) !== -1;
            if (tracked) snapshotNow(collect());
            const ok = originalSafeSave.apply(this, arguments);
            if (ok && tracked) {
                if (isEmptyData(collect())) localStorage.setItem(EMPTY_FLAG, String(Date.now()));
                else localStorage.removeItem(EMPTY_FLAG);
                markDirty();
                scheduleMirror();
            }
            return ok;
        };
    }

    // 2) the existing "Export site-data.json" button counts as a backup
    const originalExport = window.exportSiteData;
    if (typeof originalExport === 'function') {
        window.exportSiteData = function () {
            const r = originalExport.apply(this, arguments);
            markClean();
            return r;
        };
    }

    // 3) draw the Data Safety card every time the settings tab is rendered
    const originalSettingsInit = window.initSettingsSecurityModule;
    if (typeof originalSettingsInit === 'function') {
        window.initSettingsSecurityModule = function () {
            const r = originalSettingsInit.apply(this, arguments);
            ensureCard();
            return r;
        };
    }

    // ------------------------------------------------------------------ boot
    async function boot() {
        try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) {}

        const local = collect();
        if (isEmptyData(local)) {
            // The list is empty. Unless the admin emptied it on purpose, try to bring the posts back.
            if (!localStorage.getItem(EMPTY_FLAG)) {
                const m = await idbGet('mirror').catch(() => null);
                if (m && m.data && !isEmptyData(m.data)) {
                    applyData(m.data, 'merge', true);
                    toast('Your posts were restored from the automatic copy.');
                } else {
                    try {
                        const r = await fetch('site-data.json', { cache: 'no-store' });
                        if (r.ok) {
                            const data = await r.json();
                            if (!isEmptyData(data)) {
                                applyData(data, 'merge', true);
                                toast('Your posts were restored from site-data.json on the server.');
                            }
                        }
                    } catch (e) { /* no server copy, nothing to restore */ }
                }
            }
        } else {
            snapshotNow(local);
            scheduleMirror();
        }
        renderBanner();
        ensureCard();
    }

    window.DataSafety = { downloadBackup, recoverFromMirror, restoreFromServer, restoreSnapshot, refresh: renderCard };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
