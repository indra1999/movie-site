// ============================================================================
// File: admin-modules/cloud-publish.js
// "Publish to Everyone": copies your posts / upcoming / categories / ads / footer /
// deleted ids / feature settings to Firestore (collection "cg_site").
// Every visitor's browser reads them from there, so a new post or a deletion shows
// up for everybody without uploading site-data.json again.
// Only the Google account written in your Firestore rules can publish.
// ============================================================================
(function () {
    'use strict';

    const WATCH = new Set([
        'cineguide_custom_reviews', 'cineguide_upcoming', 'cineguide_custom_categories', 'cineguide_ads_config',
        'cineguide_deleted_ids', 'cineguide_features',
        'cineguide_footer_tagline', 'cineguide_footer_copyright', 'cineguide_footer_credit'
    ]);
    const K_DIRTY = 'cineguide_cloud_dirty', K_AUTO = 'cineguide_cloud_auto', K_LAST = 'cineguide_cloud_last';
    let muted = false, timer = null, busy = false, cloudInfo = null, lastMsg = '';

    const S = () => window.CineSync;
    const toast = m => { if (typeof showAdminToast === 'function') showAdminToast(m); else console.log(m); };
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const rd = (k, fb) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb; } catch (e) { return fb; } };
    const isDirty = () => localStorage.getItem(K_DIRTY) === '1';
    const isAuto = () => localStorage.getItem(K_AUTO) !== '0';
    const signedIn = () => !!(S() && S().ready && S().isSignedIn && S().isSignedIn());

    function collect() {
        return {
            exportedAt: new Date().toISOString(),
            reviews: rd('cineguide_custom_reviews', []),
            upcoming: rd('cineguide_upcoming', []),
            categories: rd('cineguide_custom_categories', []),
            ads: rd('cineguide_ads_config', {}),
            deleted: rd('cineguide_deleted_ids', []),
            features: (typeof getSavedFeatures === 'function') ? getSavedFeatures() : undefined,
            footer: {
                tagline: localStorage.getItem('cineguide_footer_tagline') || '',
                copyright: localStorage.getItem('cineguide_footer_copyright') || '',
                credit: localStorage.getItem('cineguide_footer_credit') || ''
            }
        };
    }

    // ---- notice every change of the published data (works for all admin modules) ----
    const origSet = Storage.prototype.setItem, origRemove = Storage.prototype.removeItem;
    Storage.prototype.setItem = function (k) { const r = origSet.apply(this, arguments); if (this === window.localStorage && WATCH.has(k)) markDirty(); return r; };
    Storage.prototype.removeItem = function (k) { const r = origRemove.apply(this, arguments); if (this === window.localStorage && WATCH.has(k)) markDirty(); return r; };

    function markDirty() {
        if (muted) return;
        try { origSet.call(localStorage, K_DIRTY, '1'); } catch (e) {}
        render();
        clearTimeout(timer);
        if (isAuto() && signedIn()) timer = setTimeout(() => publishNow(false), 2500);
    }

    async function refreshCloudInfo() {
        try {
            const c = S() && S().ready ? await S().loadSiteContent() : null;
            cloudInfo = c ? { posts: (c.reviews || []).length, upcoming: (c.upcoming || []).length } : { posts: 0, upcoming: 0, empty: true };
        } catch (e) { cloudInfo = { error: e.code || e.message || 'error' }; }
        render();
    }

    async function publishNow(manual) {
        if (busy) return;
        const s = S();
        if (!s || !s.ready) { toast('Firebase is not configured (core-data/firebase-config.js).'); return; }
        if (!signedIn()) { toast('Sign in with Google first.'); if (manual) s.signInWithGoogle(); return; }
        busy = true; lastMsg = 'Publishing…'; render();
        try {
            const data = collect();
            let remote = null;
            try { remote = await s.loadSiteContent(); } catch (e) {}
            const rn = remote ? (remote.reviews || []).length : 0;
            if (rn > 0 && data.reviews.length === 0) {
                const ok = manual && confirm(`This browser has 0 posts but the cloud has ${rn}. Publishing will REMOVE them from the website. Continue?`);
                if (!ok) { lastMsg = 'Skipped: this browser has no posts. Use "Load from cloud" first.'; toast(lastMsg); return; }
            }
            const res = await s.publishSiteContent(data);
            if (res.status === 'ok') {
                try { origRemove.call(localStorage, K_DIRTY); origSet.call(localStorage, K_LAST, String(Date.now())); } catch (e) {}
                lastMsg = `Published ✓ (${res.posts} posts)`;
                toast('Published to everyone ✓');
                await refreshCloudInfo();
            } else if (res.status === 'denied') {
                lastMsg = 'This Google account is not allowed to publish. Put its email in the Firestore rules (see README).';
                toast(lastMsg);
            } else if (res.status === 'needs-login') {
                lastMsg = 'Please sign in with Google.'; toast(lastMsg);
            } else {
                lastMsg = 'Publish failed: ' + (res.message || res.status); toast(lastMsg);
            }
        } finally { busy = false; render(); }
    }

    async function pullFromCloud() {
        const s = S();
        if (!s || !s.ready) { toast('Firebase is not configured.'); return; }
        let c = null;
        try { c = await s.loadSiteContent(); } catch (e) { toast('Could not read the cloud: ' + (e.code || e.message)); return; }
        if (!c) { toast('Nothing has been published to the cloud yet.'); return; }
        if (!confirm(`Replace this browser's data with the cloud copy (${(c.reviews || []).length} posts)?`)) return;
        muted = true;
        try {
            const put = (k, v) => origSet.call(localStorage, k, JSON.stringify(v));
            put('cineguide_custom_reviews', c.reviews || []);
            put('cineguide_upcoming', c.upcoming || []);
            put('cineguide_custom_categories', c.categories || []);
            put('cineguide_ads_config', c.ads || {});
            put('cineguide_deleted_ids', c.deleted || []);
            if (c.features) put('cineguide_features', c.features);
            const f = c.footer || {};
            ['tagline', 'copyright', 'credit'].forEach(k => { if (f[k]) origSet.call(localStorage, 'cineguide_footer_' + k, f[k]); });
            origRemove.call(localStorage, K_DIRTY);
        } finally { muted = false; }
        if (typeof initAllAdminModules === 'function') initAllAdminModules();
        toast('Loaded from cloud ✓');
        render();
    }

    function setAuto(on) { origSet.call(localStorage, K_AUTO, on ? '1' : '0'); if (on && isDirty() && signedIn()) publishNow(false); render(); }

    function ensureBox() {
        const sec = document.getElementById('tabSection-settings');
        if (!sec) return null;
        let box = document.getElementById('cloudPublishBox');
        if (!box || !sec.contains(box)) {
            box = document.createElement('div');
            box.id = 'cloudPublishBox';
            box.className = 'mb-6 p-5 sm:p-6 rounded-2xl bg-card border border-sky-500/40';
            sec.insertBefore(box, sec.firstChild);
        }
        return box;
    }

    function render() {
        // floating reminder while there are unpublished changes
        let pill = document.getElementById('cloudPill');
        if (!pill) {
            pill = document.createElement('button');
            pill.id = 'cloudPill'; pill.type = 'button';
            pill.className = 'hidden fixed left-3 bottom-3 z-50 px-3.5 py-2 rounded-full bg-amber-500 text-black text-xs font-extrabold shadow-lg';
            pill.onclick = () => (signedIn() ? publishNow(true) : (typeof switchAdminTab === 'function' && switchAdminTab('settings')));
            document.body.appendChild(pill);
        }
        pill.classList.toggle('hidden', !(isDirty() && !busy));
        pill.textContent = signedIn() ? '● Unpublished changes — tap to publish' : '● Not published — open Settings to sign in';

        const box = ensureBox();
        if (!box) return;
        const s = S(), ready = !!(s && s.ready);
        const email = ready && s.userEmail ? s.userEmail() : '';
        const local = { posts: rd('cineguide_custom_reviews', []).length, upcoming: rd('cineguide_upcoming', []).length };
        const btn = 'px-3.5 py-2 rounded-xl text-xs font-bold border border-subtle bg-white/5 hover:bg-white/10 text-slate-100';
        const cloudTxt = !cloudInfo ? '…' : cloudInfo.error ? `<span class="text-rose-400">${esc(cloudInfo.error)}</span>` : (cloudInfo.empty ? 'nothing yet' : `${cloudInfo.posts} posts • ${cloudInfo.upcoming} upcoming`);
        const needPull = cloudInfo && !cloudInfo.error && cloudInfo.posts > 0 && local.posts === 0;
        box.innerHTML = `
            <h3 class="text-base font-extrabold mb-1">Publish to Everyone (Cloud)</h3>
            <p class="text-xs text-slate-400 mb-4">Posts, deletions, upcoming, categories, ads and footer are copied to Firestore. Visitors on any browser see them automatically — no file upload needed.</p>
            ${!ready ? `<div class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200 mb-3">Firebase is not configured. Fill <b>core-data/firebase-config.js</b>.</div>` : ''}
            <ul class="text-xs text-slate-400 space-y-1 mb-4">
                <li>Google account: <span class="text-slate-200">${signedIn() ? esc(email) : 'not signed in'}</span></li>
                <li>This browser: <span class="text-slate-200">${local.posts} posts • ${local.upcoming} upcoming</span></li>
                <li>Cloud (what visitors see): <span class="text-slate-200">${cloudTxt}</span></li>
                <li>Unpublished changes: <span class="${isDirty() ? 'text-amber-400' : 'text-emerald-400'} font-bold">${isDirty() ? 'yes' : 'no'}</span>${lastMsg ? ` <span class="text-slate-500">— ${esc(lastMsg)}</span>` : ''}</li>
            </ul>
            ${needPull ? `<div class="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-xs text-sky-200 mb-3">The cloud already has posts but this browser has none. Press <b>Load from cloud</b> before publishing.</div>` : ''}
            <div class="flex flex-wrap gap-2 mb-3">
                ${signedIn()
                    ? `<button type="button" onclick="CloudPublish.publish()" class="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-sky-600 hover:bg-sky-500 text-white" ${busy ? 'disabled' : ''}>${busy ? 'Publishing…' : 'Publish now'}</button>
                       <button type="button" onclick="CineSync.signOut()" class="${btn}">Sign out</button>`
                    : `<button type="button" onclick="CineSync.signInWithGoogle()" class="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-sky-600 hover:bg-sky-500 text-white" ${ready ? '' : 'disabled'}>Sign in with Google (admin)</button>`}
                <button type="button" onclick="CloudPublish.pull()" class="${btn}">Load from cloud</button>
            </div>
            <label class="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input type="checkbox" ${isAuto() ? 'checked' : ''} onchange="CloudPublish.setAuto(this.checked)" class="accent-sky-500">
                Publish automatically after every save
            </label>`;
    }

    // react to Google sign-in / sign-out
    const prevAuth = window.onCineAuthChange;
    window.onCineAuthChange = function (on) {
        if (typeof prevAuth === 'function') prevAuth(on);
        render();
        refreshCloudInfo();
        if (on && isDirty() && isAuto()) setTimeout(() => signedIn() && publishNow(false), 800);
    };

    window.CloudPublish = { publish: () => publishNow(true), pull: pullFromCloud, setAuto, refresh: render };
    window.initCloudPublishModule = function () { render(); refreshCloudInfo(); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render); else render();
})();
