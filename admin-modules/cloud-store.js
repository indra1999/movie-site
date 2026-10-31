// ============================================================================
// File: admin-modules/cloud-store.js
// CLOUD-ONLY STORAGE + FIREBASE E-MAIL LOGIN for the admin panel.
//
//  * Nothing the admin manages is stored in this browser any more.
//    Posts, upcoming items, categories, ads, footer texts, feature settings and
//    the delete list live in Firestore (collection "cg_site").
//    The TMDB API key and custom domain live in Firestore too, in "cg_admin/settings",
//    a document that ONLY the admin e-mail can read or write.
//  * The other admin modules are unchanged: they still call localStorage / safeParse /
//    safeSave, but for the keys below those calls are redirected to an in-memory copy that
//    is saved to the cloud automatically (about 1 second after every change).
//  * Login: Firebase Authentication (e-mail + password, or Google). The panel opens only
//    if Firestore accepts the account as admin (see the rules in README.md).
//  * Every save carries a revision number. If the site was changed from another device
//    or tab meanwhile, the save is refused and you choose what to do, so work is never
//    silently overwritten.
// ============================================================================
(function () {
    'use strict';

    window.CINE_ADMIN_PAGE = true;

    // ---------------------------------------------------------------- key map
    const JSON_KEYS = {
        cineguide_custom_reviews: 'reviews',
        cineguide_upcoming: 'upcoming',
        cineguide_custom_categories: 'categories',
        cineguide_ads_config: 'ads',
        cineguide_deleted_ids: 'deleted',
        cineguide_features: 'features'
    };
    const FOOTER_KEYS = {
        cineguide_footer_tagline: 'tagline',
        cineguide_footer_copyright: 'copyright',
        cineguide_footer_credit: 'credit'
    };
    const PRIVATE_KEYS = {
        cineguide_tmdb_key: 'tmdbKey',
        cineguide_custom_domain: 'customDomain'
    };
    // Old versions kept data (and the old password login) in the browser. Only touched by the one-time migration.
    const LEGACY_EXTRA_KEYS = [
        'cineguide_admin_user', 'cineguide_admin_pass', 'cineguide_backup_state', 'cineguide_cloud_dirty',
        'cineguide_cloud_auto', 'cineguide_cloud_last', 'cineguide_cloud_cache', 'cineguide_user_emptied'
    ];
    const isManaged = k => (k in JSON_KEYS) || (k in FOOTER_KEYS) || (k in PRIVATE_KEYS);

    // ---------------------------------------------------------------- storage redirect
    const proto = Storage.prototype;
    const rawGet = proto.getItem, rawSet = proto.setItem, rawRemove = proto.removeItem;
    const mem = Object.create(null);   // the only place the managed data lives while the panel is open
    const isLS = self => { try { return self === window.localStorage; } catch (e) { return false; } };

    proto.getItem = function (k) {
        if (isLS(this) && isManaged(k)) return (k in mem) ? mem[k] : null;
        return rawGet.apply(this, arguments);
    };
    proto.setItem = function (k, v) {
        if (isLS(this) && isManaged(k)) { mem[k] = String(v); onChange(); return; }
        return rawSet.apply(this, arguments);
    };
    proto.removeItem = function (k) {
        if (isLS(this) && isManaged(k)) { delete mem[k]; onChange(); return; }
        return rawRemove.apply(this, arguments);
    };

    // ---------------------------------------------------------------- state
    let loaded = false, rev = 0, dirty = false, seq = 0, saving = false;
    let status = 'idle';               // idle | pending | saving | saved | error | conflict
    let statusMsg = '', cloudRev = 0, lastSavedAt = 0, lastKnownPosts = 0, lastPrivJson = '';
    let saveTimer = null, retryTimer = null, hideTimer = null, authBusy = false, loginNotice = '', currentUid = '';

    const S = () => window.CineSync;
    const toast = m => { if (typeof showAdminToast === 'function') showAdminToast(m); else console.log(m); };
    const escH = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const $ = id => document.getElementById(id);

    function readJ(k, fb) {
        try {
            const r = mem[k];
            if (r === undefined || r === null || r === '') return fb;
            const v = JSON.parse(r);
            return v === null || v === undefined ? fb : v;
        } catch (e) { return fb; }
    }

    function buildPublic() {
        return {
            exportedAt: new Date().toISOString(),
            reviews: readJ('cineguide_custom_reviews', []),
            upcoming: readJ('cineguide_upcoming', []),
            categories: readJ('cineguide_custom_categories', []),
            ads: readJ('cineguide_ads_config', {}),
            deleted: readJ('cineguide_deleted_ids', []),
            features: readJ('cineguide_features', null),
            footer: {
                tagline: mem.cineguide_footer_tagline || '',
                copyright: mem.cineguide_footer_copyright || '',
                credit: mem.cineguide_footer_credit || ''
            }
        };
    }
    function buildPrivate() {
        return { tmdbKey: mem.cineguide_tmdb_key || '', customDomain: mem.cineguide_custom_domain || '' };
    }

    function clearMem() { Object.keys(mem).forEach(k => delete mem[k]); }

    function applyCloudToMem(pub, priv) {
        clearMem();
        if (pub) {
            ['reviews', 'upcoming', 'categories', 'deleted'].forEach(f => {
                const key = Object.keys(JSON_KEYS).find(k => JSON_KEYS[k] === f);
                if (Array.isArray(pub[f])) mem[key] = JSON.stringify(pub[f]);
            });
            if (pub.ads && typeof pub.ads === 'object') mem.cineguide_ads_config = JSON.stringify(pub.ads);
            if (pub.features && typeof pub.features === 'object') mem.cineguide_features = JSON.stringify(pub.features);
            const f = pub.footer || {};
            Object.keys(FOOTER_KEYS).forEach(k => { if (f[FOOTER_KEYS[k]]) mem[k] = f[FOOTER_KEYS[k]]; });
        }
        if (priv) {
            if (priv.tmdbKey) mem.cineguide_tmdb_key = priv.tmdbKey;
            if (priv.customDomain) mem.cineguide_custom_domain = priv.customDomain;
        }
        lastPrivJson = JSON.stringify(buildPrivate());
        lastKnownPosts = readJ('cineguide_custom_reviews', []).length;
    }

    // ---------------------------------------------------------------- saving
    function onChange() {
        if (!loaded) return;
        dirty = true;
        seq++;
        if (status === 'conflict') { renderPill(); return; }
        setStatus('pending');
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => saveNow(), 1000);
    }

    function setStatus(s, msg) {
        status = s; statusMsg = msg || '';
        clearTimeout(hideTimer);
        if (s === 'saved') hideTimer = setTimeout(renderPill, 3000);
        renderPill();
        renderBox();
    }

    // returns true when the cloud accepted the data
    async function saveNow(force) {
        clearTimeout(saveTimer); clearTimeout(retryTimer);
        if (!loaded) return false;
        if (saving) return false;
        if (status === 'conflict' && !force) return false;
        const sync = S();
        if (!sync || !sync.ready || !sync.isSignedIn()) { setStatus('error', 'You are signed out. Sign in again.'); return false; }

        const pub = buildPublic(), priv = buildPrivate();

        // Safety net: never wipe every post without an explicit OK
        if (lastKnownPosts > 0 && pub.reviews.length === 0) {
            if (!confirm(`This will remove all ${lastKnownPosts} posts from the website. Continue?\n\nCancel = restore the cloud copy.`)) {
                dirty = false;
                await reload(true);
                return false;
            }
        }

        saving = true;
        const mySeq = seq;
        setStatus('saving');
        const res = await sync.publishSiteContent(pub, rev);
        if (res.status === 'ok') {
            rev = res.rev;   // remember the new revision first, so a later retry never conflicts with our own save
            const privJson = JSON.stringify(priv);
            if (privJson !== lastPrivJson) {
                const r2 = await sync.saveAdminSettings(priv);
                if (r2.status !== 'ok') {
                    saving = false;
                    setStatus('error', 'Posts saved, but the API key / domain could not be saved: ' + (r2.message || r2.status));
                    retryTimer = setTimeout(() => saveNow(), 10000);
                    return false;
                }
                lastPrivJson = privJson;
            }
            rev = res.rev;
            lastKnownPosts = pub.reviews.length;
            lastSavedAt = Date.now();
            saving = false;
            if (seq !== mySeq) {          // more edits arrived while saving
                dirty = true;
                setStatus('pending');
                saveTimer = setTimeout(() => saveNow(), 600);
            } else {
                dirty = false;
                setStatus('saved');
            }
            return true;
        }
        saving = false;
        if (res.status === 'toolarge') { setStatus('error', res.message); return false; }   // no endless retry
        if (res.status === 'conflict') {
            cloudRev = res.rev;
            setStatus('conflict', 'The site was changed from another device or tab.');
            return false;
        }
        if (res.status === 'denied') {
            setStatus('error', 'This account is not allowed to save. Check the Firestore rules.');
            return false;
        }
        setStatus('error', res.message || res.status || 'Save failed');
        retryTimer = setTimeout(() => saveNow(), 10000);   // keeps trying; nothing is lost while the tab stays open
        return false;
    }

    function resolveConflict() {
        const overwrite = confirm(
            'The site was changed from another device or tab after you opened this panel.\n\n' +
            'OK = overwrite the cloud with what you see here.\n' +
            'Cancel = discard this screen\'s unsaved changes and reload the cloud copy.');
        if (overwrite) { rev = cloudRev; status = 'pending'; saveNow(true); }
        else reload(true);
    }

    async function reload(silent) {
        const sync = S();
        try {
            const pub = await sync.loadSiteContent();
            const adm = await sync.getAdminSettings();
            if (adm.status !== 'ok') throw new Error('Could not read admin settings: ' + adm.status);
            applyCloudToMem(pub, adm.data);
            rev = (pub && Number(pub.rev)) || 0;
            dirty = false; seq++;
            setStatus('saved');
            if (typeof initAllAdminModules === 'function') initAllAdminModules();
            if (!silent) toast('Reloaded from cloud');
        } catch (e) {
            setStatus('error', 'Could not reload: ' + (e.code || e.message || e));
        }
    }

    window.addEventListener('beforeunload', e => {
        if (dirty || saving) { e.preventDefault(); e.returnValue = ''; }
    });

    // ---------------------------------------------------------------- status pill (bottom-left)
    function renderPill() {
        let pill = $('cloudPill');
        if (!pill) {
            pill = document.createElement('button');
            pill.id = 'cloudPill'; pill.type = 'button';
            pill.className = 'hidden fixed left-3 bottom-3 z-50 px-3.5 py-2 rounded-full text-xs font-extrabold shadow-lg';
            pill.onclick = () => { if (status === 'conflict') resolveConflict(); else if (status === 'error') saveNow(true); };
            document.body.appendChild(pill);
        }
        const map = {
            pending: ['Saving soon…', 'bg-amber-500 text-black'],
            saving: ['Saving to cloud…', 'bg-amber-500 text-black'],
            saved: ['✓ Saved to cloud', 'bg-emerald-600 text-white'],
            error: ['⚠ Not saved — tap to retry', 'bg-rose-600 text-white'],
            conflict: ['⚠ Changed elsewhere — tap to resolve', 'bg-rose-600 text-white']
        };
        const m = map[status];
        const visible = !!m && loaded && !(status === 'saved' && Date.now() - lastSavedAt > 2500);
        pill.className = 'fixed left-3 bottom-3 z-50 px-3.5 py-2 rounded-full text-xs font-extrabold shadow-lg ' + (m ? m[1] : '') + (visible ? '' : ' hidden');
        if (m) pill.textContent = m[0];
        pill.title = statusMsg || '';
    }

    // ---------------------------------------------------------------- login screen
    function setLoginMsg(text, kind) {
        const el = $('loginMsg');
        if (!el) return;
        el.textContent = text || '';
        el.className = 'text-xs mb-1 ' + (kind === 'error' ? 'text-rose-400' : kind === 'ok' ? 'text-emerald-400' : 'text-slate-400') + (text ? '' : ' hidden');
    }
    function showLogin(msg, kind) {
        loaded = false; currentUid = '';
        clearMem();
        const lock = $('adminLockScreen'), wrap = $('adminAppWrapper');
        if (lock) lock.classList.remove('hidden');
        if (wrap) wrap.classList.add('hidden');
        if ($('loginChecking')) $('loginChecking').classList.add('hidden');
        if ($('loginForm')) $('loginForm').classList.remove('hidden');
        if ($('loginBtn')) { $('loginBtn').disabled = false; $('loginBtn').textContent = 'Sign in'; }
        setLoginMsg(msg || loginNotice, kind || (loginNotice ? 'error' : ''));
        loginNotice = '';
        renderPill();
    }

    function mapAuthError(code, message) {
        switch (code) {
            case 'auth/invalid-credential':
            case 'auth/wrong-password':
            case 'auth/user-not-found': return 'Incorrect e-mail or password.';
            case 'auth/invalid-email': return 'That e-mail address is not valid.';
            case 'auth/too-many-requests': return 'Too many attempts. Wait a few minutes or reset your password.';
            case 'auth/network-request-failed': return 'Network error. Check your connection.';
            case 'auth/operation-not-allowed': return 'E-mail/password sign-in is not enabled in Firebase (Authentication → Sign-in method).';
            case 'auth/user-disabled': return 'This account has been disabled.';
            default: return message || 'Sign-in failed.';
        }
    }

    async function login(e) {
        if (e && e.preventDefault) e.preventDefault();
        const email = ($('adminEmailInput').value || '').trim();
        const pass = $('adminPassInput').value || '';
        if (!email || !pass) { setLoginMsg('Enter your e-mail and password.', 'error'); return; }
        loginNotice = '';
        $('loginBtn').disabled = true; $('loginBtn').textContent = 'Signing in…';
        setLoginMsg('', '');
        const r = await S().signInWithEmail(email, pass);
        if (r.status === 'ok') return;          // onAuthStateChanged continues the flow
        if (r.status === 'unavailable') showLogin('Firebase is not configured (core-data/firebase-config.js).', 'error');
        else showLogin(mapAuthError(r.code, r.message), 'error');
    }
    function google() { if (S() && S().ready) S().signInWithGoogle(); else showLogin('Firebase is not configured (core-data/firebase-config.js).', 'error'); }
    async function forgot() {
        const email = ($('adminEmailInput').value || '').trim();
        if (!email) { setLoginMsg('Type your e-mail above first, then press "Forgot password".', 'error'); return; }
        const r = await S().sendPasswordReset(email);
        if (r.status === 'ok') setLoginMsg('If this e-mail has an account, a password reset link has been sent.', 'ok');
        else setLoginMsg(mapAuthError(r.code, r.message), 'error');
    }
    async function logout() {
        if (dirty && !confirm('You have changes that are not saved yet. Sign out anyway?')) return;
        dirty = false;
        try { await S().signOut(); } catch (e) {}
        location.reload();
    }

    // ---------------------------------------------------------------- auth flow
    async function onAuth() {
        const sync = S();
        if (!sync || !sync.ready) { showLogin('Firebase is not configured (core-data/firebase-config.js).', 'error'); return; }
        const u = sync.getUser();
        if (!u || u.isAnonymous) { showLogin(); return; }
        if (loaded && currentUid === u.uid) return;
        if (authBusy) return;
        authBusy = true;
        try {
            if ($('loginChecking')) { $('loginChecking').textContent = 'Checking access…'; $('loginChecking').classList.remove('hidden'); }
            if ($('loginForm')) $('loginForm').classList.add('hidden');

            const adm = await sync.getAdminSettings();
            if (adm.status === 'denied') {
                const email = u.email || 'this account';
                const passwordUser = (u.providerData || []).some(p => p.providerId === 'password');
                let msg;
                if (passwordUser && !sync.isEmailVerified()) {
                    const lastV = Number(sessionStorage.getItem('cg_verify_sent') || 0);
                    if (Date.now() - lastV > 120000) { sessionStorage.setItem('cg_verify_sent', String(Date.now())); await sync.sendVerification(); }
                    msg = `Your e-mail address (${email}) is not verified yet. A verification link was just sent. Open it, then press Sign in again.`;
                } else {
                    msg = `${email} is not allowed to manage this site.`;
                }
                loginNotice = msg;
                await sync.signOut();
                showLogin(msg, 'error');      // signOut also triggers showLogin() through the auth listener; this keeps the message either way
                return;
            }
            if (adm.status !== 'ok') { showLogin('Could not reach the cloud: ' + (adm.message || adm.status), 'error'); return; }

            let pub = null;
            try { pub = await sync.loadSiteContent(); }
            catch (e) { showLogin('Could not load the site content: ' + (e.code || e.message || e), 'error'); return; }

            applyCloudToMem(pub, adm.data);
            rev = (pub && Number(pub.rev)) || 0;
            currentUid = u.uid;

            // demo posts become normal editable posts (done before saving is switched on, so it never triggers a save by itself)
            try { if (!pub && window.CineStore && CineStore.seedDemo) CineStore.seedDemo(); } catch (e) { console.warn('Demo seed failed', e); }

            loaded = true; dirty = false; status = 'saved'; lastSavedAt = Date.now();
            if (typeof unlockDashboard === 'function') unlockDashboard();
            renderPill();
            checkLegacy();
        } finally { authBusy = false; }
    }

    const prevAuth = window.onCineAuthChange;
    window.onCineAuthChange = function (on) {
        if (typeof prevAuth === 'function') prevAuth(on);
        onAuth();
    };

    // ---------------------------------------------------------------- one-time migration of old browser data
    function legacySnapshot() {
        const g = k => { try { return rawGet.call(window.localStorage, k); } catch (e) { return null; } };
        const j = (k, fb) => { try { const r = g(k); const v = r ? JSON.parse(r) : null; return v == null ? fb : v; } catch (e) { return fb; } };
        return {
            reviews: j('cineguide_custom_reviews', []), upcoming: j('cineguide_upcoming', []),
            categories: j('cineguide_custom_categories', []), deleted: j('cineguide_deleted_ids', []),
            ads: j('cineguide_ads_config', {}), features: j('cineguide_features', null),
            footer: { tagline: g('cineguide_footer_tagline') || '', copyright: g('cineguide_footer_copyright') || '', credit: g('cineguide_footer_credit') || '' },
            tmdbKey: g('cineguide_tmdb_key') || '', customDomain: g('cineguide_custom_domain') || ''
        };
    }
    function legacyHasData(L) {
        return !!(L.reviews.length || L.upcoming.length || L.categories.length || L.deleted.length ||
            (L.ads && Object.keys(L.ads).length) || L.features || L.footer.tagline || L.footer.copyright || L.footer.credit || L.tmdbKey || L.customDomain);
    }

    function checkLegacy() {
        const L = legacySnapshot();
        const old = $('legacyBanner');
        if (!legacyHasData(L)) { if (old) old.remove(); return; }
        const main = document.querySelector('#adminAppWrapper main');
        if (!main) return;
        let bar = old;
        if (!bar) { bar = document.createElement('div'); bar.id = 'legacyBanner'; main.insertBefore(bar, main.firstChild); }
        bar.className = 'mb-5 p-4 rounded-2xl bg-sky-500/10 border border-sky-500/40 text-xs text-sky-100';
        bar.innerHTML = `
            <p class="mb-3"><b>Older data found in this browser:</b> ${L.reviews.length} posts and ${L.upcoming.length} upcoming items from the previous (local) version.
            Upload them to the cloud (merged with what is already there) and remove the local copy?</p>
            <div class="flex flex-wrap gap-2">
                <button type="button" onclick="CloudStore.migrateLegacy()" class="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold">Upload to cloud &amp; remove local copy</button>
                <button type="button" onclick="CloudStore.dismissLegacy()" class="px-3.5 py-2 rounded-xl bg-white/5 border border-subtle font-bold">Not now</button>
            </div>`;
    }
    function dismissLegacy() { const b = $('legacyBanner'); if (b) b.remove(); }

    async function migrateLegacy() {
        const L = legacySnapshot();
        const mergeList = (key, incoming) => {
            if (!Array.isArray(incoming) || !incoming.length) return;
            const cur = readJ(key, []);
            const ids = new Set(cur.map(x => x && x.id));
            mem[key] = JSON.stringify([...cur, ...incoming.filter(x => x && x.id && !ids.has(x.id))]);
        };
        const union = (key, incoming) => {
            if (!Array.isArray(incoming) || !incoming.length) return;
            mem[key] = JSON.stringify([...new Set([...readJ(key, []), ...incoming])]);
        };
        mergeList('cineguide_custom_reviews', L.reviews);
        mergeList('cineguide_upcoming', L.upcoming);
        union('cineguide_custom_categories', L.categories);
        union('cineguide_deleted_ids', L.deleted);
        if (L.ads && Object.keys(L.ads).length && !Object.keys(readJ('cineguide_ads_config', {})).length) mem.cineguide_ads_config = JSON.stringify(L.ads);
        if (L.features && !mem.cineguide_features) mem.cineguide_features = JSON.stringify(L.features);
        Object.keys(FOOTER_KEYS).forEach(k => { if (!mem[k] && L.footer[FOOTER_KEYS[k]]) mem[k] = L.footer[FOOTER_KEYS[k]]; });
        if (!mem.cineguide_tmdb_key && L.tmdbKey) mem.cineguide_tmdb_key = L.tmdbKey;
        if (!mem.cineguide_custom_domain && L.customDomain) mem.cineguide_custom_domain = L.customDomain;

        dirty = true; seq++;
        const ok = await saveNow(true);
        if (!ok) { toast('Upload failed — your local copy was NOT removed.'); return; }

        Object.keys(JSON_KEYS).concat(Object.keys(FOOTER_KEYS), Object.keys(PRIVATE_KEYS), LEGACY_EXTRA_KEYS)
            .forEach(k => { try { rawRemove.call(window.localStorage, k); } catch (e) {} });
        try { if (window.indexedDB) indexedDB.deleteDatabase('cineguide_safety'); } catch (e) {}   // old browser-side mirror
        dismissLegacy();
        if (typeof initAllAdminModules === 'function') initAllAdminModules();
        toast('Local data uploaded to the cloud and removed from this browser ✓');
    }

    // ---------------------------------------------------------------- Settings card
    function info() {
        const sync = S();
        return {
            email: sync && sync.userEmail ? sync.userEmail() : '',
            status, statusMsg, dirty, rev, lastSavedAt,
            posts: readJ('cineguide_custom_reviews', []).length,
            upcoming: readJ('cineguide_upcoming', []).length
        };
    }

    function renderBox() {
        const sec = $('tabSection-settings');
        if (!sec || !loaded) return;
        let box = $('cloudStoreBox');
        if (!box || !sec.contains(box)) {
            box = document.createElement('div');
            box.id = 'cloudStoreBox';
            box.className = 'mb-6 p-5 sm:p-6 rounded-2xl bg-card border border-sky-500/40';
            sec.insertBefore(box, sec.firstChild);
        }
        const i = info();
        const btn = 'px-3.5 py-2 rounded-xl text-xs font-bold border border-subtle bg-white/5 hover:bg-white/10 text-slate-100';
        const stTxt = { idle: 'ready', pending: 'saving soon…', saving: 'saving…', saved: 'all changes saved', error: 'not saved', conflict: 'changed elsewhere' }[status] || status;
        const stCls = status === 'saved' || status === 'idle' ? 'text-emerald-400' : status === 'error' || status === 'conflict' ? 'text-rose-400' : 'text-amber-400';
        box.innerHTML = `
            <h3 class="text-base font-extrabold mb-1">Cloud Storage &amp; Account</h3>
            <p class="text-xs text-slate-400 mb-4">All content is stored only in Firebase (Firestore). Nothing is kept in this browser. Every change is saved to the cloud automatically.</p>
            <ul class="text-xs text-slate-400 space-y-1 mb-4">
                <li>Signed in as: <span class="text-slate-200 font-bold">${escH(i.email)}</span></li>
                <li>Content: <span class="text-slate-200">${i.posts} posts • ${i.upcoming} upcoming</span></li>
                <li>Status: <span class="${stCls} font-bold">${stTxt}</span>${i.statusMsg ? ` <span class="text-slate-500">— ${escH(i.statusMsg)}</span>` : ''}</li>
                <li>Last saved: <span class="text-slate-200">${i.lastSavedAt ? new Date(i.lastSavedAt).toLocaleString() : '—'}</span> <span class="text-slate-600">(revision ${i.rev})</span></li>
            </ul>
            <div class="flex flex-wrap gap-2">
                <button type="button" onclick="CloudStore.saveNow(true)" class="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-sky-600 hover:bg-sky-500 text-white">Save now</button>
                <button type="button" onclick="CloudStore.reload()" class="${btn}">Reload from cloud</button>
                <button type="button" onclick="exportSiteData()" class="${btn}">Download backup file</button>
                <button type="button" onclick="CloudStore.logout()" class="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400">Sign out</button>
            </div>`;
    }

    window.initCloudStoreModule = function () { renderBox(); };

    window.CloudStore = {
        login, google, forgot, logout, saveNow, resolveConflict, migrateLegacy, dismissLegacy, info,
        reload: () => {
            if (dirty && !confirm('Discard unsaved changes and reload the cloud copy?')) return;
            reload(false);
        }
    };

    // ---------------------------------------------------------------- boot
    function boot() {
        renderPill();
        const sync = S();
        if (!sync || !sync.ready) { showLogin('Firebase is not configured (core-data/firebase-config.js).', 'error'); return; }
        if (sync.isAuthResolved()) onAuth();      // otherwise onCineAuthChange fires as soon as Firebase knows
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
