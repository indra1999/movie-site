// ============================================================================
// core-data/firebase-sync.js  —  user Watchlist / Watched / Ratings / Notify + site content
// When a user signs in, these are saved to Firestore in the  users/{uid}  document.
// Guests (not signed in) keep them in localStorage on their own device.
// ============================================================================
(function () {
    'use strict';

    // localStorage key  ->  Firestore field
    const MAP = {
        cineguide_watchlist: 'watchlist',
        cineguide_watched: 'watched',
        cineguide_user_ratings: 'ratings',
        cineguide_notify_upcoming: 'notify'
    };
    const cfg = window.CINE_FIREBASE || {};
    const ready = !!(window.firebase && cfg.apiKey && cfg.projectId);

    let auth = null, db = null, user = null, timer = null, busy = false, authResolved = false;

    function lsRead(key, fb) {
        try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fb; } catch (e) { return fb; }
    }
    function lsWrite(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }
    function localState() {
        const s = {};
        Object.keys(MAP).forEach(k => { s[MAP[k]] = lsRead(k, MAP[k] === 'ratings' ? {} : []); });
        return s;
    }
    function union(a, b) { return Array.from(new Set([].concat(a || [], b || []))); }

    function push() {
        if (!ready || !user || user.isAnonymous || busy) return;
        const s = localState();
        db.collection('users').doc(user.uid).set({
            watchlist: s.watchlist, watched: s.watched, ratings: s.ratings, notify: s.notify,
            name: user.displayName || '', email: user.email || '',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).catch(e => console.warn('Cloud save failed', e));
    }

    // index.html's safeSave() calls this after every save
    function onLocalSave(key) {
        if (!ready || !user || user.isAnonymous || !MAP[key]) return;
        clearTimeout(timer);
        timer = setTimeout(push, 700);
    }

    async function pullAndMerge() {
        busy = true;
        try {
            const snap = await db.collection('users').doc(user.uid).get();
            const cloud = snap.exists ? snap.data() : {};
            const loc = localState();
            // items saved as a guest + items from the cloud: both are kept
            const mk = 'cineguide_cloud_merged_' + user.uid;
            if (lsRead(mk, false) && snap.exists) {
                // already merged once on this device: the cloud copy wins, so removed items stay removed
                lsWrite('cineguide_watchlist', cloud.watchlist || []);
                lsWrite('cineguide_watched', cloud.watched || []);
                lsWrite('cineguide_notify_upcoming', cloud.notify || []);
                lsWrite('cineguide_user_ratings', cloud.ratings || {});
            } else {
                // first sign-in on this device: keep guest items + cloud items
                lsWrite('cineguide_watchlist', union(cloud.watchlist, loc.watchlist));
                lsWrite('cineguide_watched', union(cloud.watched, loc.watched));
                lsWrite('cineguide_notify_upcoming', union(cloud.notify, loc.notify));
                lsWrite('cineguide_user_ratings', Object.assign({}, cloud.ratings || {}, loc.ratings || {}));
                lsWrite(mk, true);
            }
            if (typeof window.reloadUserLibrary === 'function') window.reloadUserLibrary();
        } catch (e) {
            console.warn('Cloud load failed', e);
            if (window.showToast) window.showToast('Cloud sync failed — check Firestore rules');
        }
        busy = false;
        push();
        syncLocalRatingsToCG();
    }


    // ------------------------------------------------------------------------
    // CG RATING — every user's rating is collected into one average
    //   cg_ratings/{postId}              -> { sum, count }   (summary)
    //   cg_ratings/{postId}/votes/{uid}  -> { value, uid }   (one vote per user)
    // If the same user rates again, the earlier vote is replaced (never counted twice).
    // ------------------------------------------------------------------------
    function cgId(postId) { return String(postId).replace(/[\/\s]+/g, '_'); }
    function syncedKey() { return 'cineguide_cg_synced_' + (user ? user.uid : 'guest'); }

    async function getCG(postId) {
        if (!ready) {
            // without Firebase only this device's own rating is shown
            const mine = lsRead('cineguide_user_ratings', {})[postId];
            return mine ? { avg: mine, count: 1, local: true } : { avg: 0, count: 0, local: true };
        }
        try {
            const snap = await db.collection('cg_ratings').doc(cgId(postId)).get();
            const d = snap.exists ? snap.data() : null;
            const count = d && d.count > 0 ? d.count : 0;
            return count ? { avg: (d.sum || 0) / count, count } : { avg: 0, count: 0 };
        } catch (e) {
            console.warn('CG read failed', e);
            return { avg: 0, count: 0, error: true };
        }
    }

    async function submitCG(postId, value) {
        value = Math.round(Number(value));
        if (!ready) return 'unavailable';
        if (!user || user.isAnonymous) return 'needs-login';
        if (!(value >= 1 && value <= 10)) return 'error';
        const agg = db.collection('cg_ratings').doc(cgId(postId));
        const vote = agg.collection('votes').doc(user.uid);
        try {
            await db.runTransaction(async tx => {
                const [a, v] = await Promise.all([tx.get(agg), tx.get(vote)]);
                let sum = a.exists ? (a.data().sum || 0) : 0;
                let count = a.exists ? (a.data().count || 0) : 0;
                if (v.exists) { sum -= (v.data().value || 0); } else { count += 1; }
                sum += value;
                tx.set(agg, { sum, count }, { merge: true });
                tx.set(vote, { value, uid: user.uid, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
            });
            const m = lsRead(syncedKey(), {}); m[postId] = value; lsWrite(syncedKey(), m);
            return 'ok';
        } catch (e) {
            console.warn('CG save failed', e);
            if (window.showToast) window.showToast('CG Rating save failed — check Firestore rules');
            return 'error';
        }
    }

    async function removeCG(postId) {
        if (!ready || !user || user.isAnonymous) return 'unavailable';
        const agg = db.collection('cg_ratings').doc(cgId(postId));
        const vote = agg.collection('votes').doc(user.uid);
        try {
            await db.runTransaction(async tx => {
                const [a, v] = await Promise.all([tx.get(agg), tx.get(vote)]);
                if (!v.exists) return;
                const sum = (a.exists ? (a.data().sum || 0) : 0) - (v.data().value || 0);
                const count = Math.max(0, (a.exists ? (a.data().count || 0) : 0) - 1);
                tx.set(agg, { sum: Math.max(0, sum), count }, { merge: true });
                tx.delete(vote);
            });
            const m = lsRead(syncedKey(), {}); delete m[postId]; lsWrite(syncedKey(), m);
            return 'ok';
        } catch (e) { console.warn('CG remove failed', e); return 'error'; }
    }

    // ratings given as a guest are sent to CG after sign-in (only once)
    async function syncLocalRatingsToCG() {
        if (!ready || !user || user.isAnonymous) return;
        const ratings = lsRead('cineguide_user_ratings', {});
        const done = lsRead(syncedKey(), {});
        for (const id of Object.keys(ratings)) {
            if (done[id] === ratings[id]) continue;
            await submitCG(id, ratings[id]);
        }
    }


    // ------------------------------------------------------------------------
    // COMMUNITY PARENTAL GUIDE — only signed-in users can vote
    //   pg_votes/{postId}              -> counters (total, fam_yes, fam_no, c_sex_0..3 ...)
    //   pg_votes/{postId}/votes/{uid}  -> { sex, violence, profanity, drugs (0-3), family: yes|no }
    // One user = one vote per post (voting again replaces the earlier vote).
    // ------------------------------------------------------------------------
    const PG_CATS = ['sex', 'violence', 'profanity', 'drugs'];
    function pgDoc(postId) { return db.collection('pg_votes').doc(cgId(postId)); }
    function pgDelta(vote, sign) {
        const d = {};
        PG_CATS.forEach(c => { if (vote && Number.isInteger(vote[c]) && vote[c] >= 0 && vote[c] <= 3) d['c_' + c + '_' + vote[c]] = sign; });
        if (vote && (vote.family === 'yes' || vote.family === 'no')) d['fam_' + vote.family] = sign;
        return d;
    }
    function pgApply(cur, delta, next) {
        for (const k in delta) next[k] = Math.max(0, (next[k] !== undefined ? next[k] : (cur[k] || 0)) + delta[k]);
    }
    async function getPG(postId) {
        if (!ready) return null;
        try { const s = await pgDoc(postId).get(); return s.exists ? s.data() : {}; } catch (e) { console.warn('PG read failed', e); return null; }
    }
    async function getMyPG(postId) {
        if (!ready || !user) return null;
        try { const s = await pgDoc(postId).collection('votes').doc(user.uid).get(); return s.exists ? s.data() : null; } catch (e) { return null; }
    }
    async function submitPG(postId, vote, allowGuest) {
        if (!ready) return 'unavailable';
        if (!user || (user.isAnonymous && !allowGuest)) {
            if (!allowGuest) return 'needs-login';
            try { const cred = await auth.signInAnonymously(); user = cred.user; }
            catch (e) { console.warn('Guest sign-in failed', e); return 'guest-unavailable'; }
        }
        const clean = {};
        PG_CATS.forEach(c => { const n = Number(vote && vote[c]); if (vote && vote[c] !== undefined && Number.isInteger(n) && n >= 0 && n <= 3) clean[c] = n; });
        if (vote && (vote.family === 'yes' || vote.family === 'no')) clean.family = vote.family;
        if (!Object.keys(clean).length) return 'error';
        const agg = pgDoc(postId), ref = agg.collection('votes').doc(user.uid);
        try {
            await db.runTransaction(async tx => {
                const [a, v] = await Promise.all([tx.get(agg), tx.get(ref)]);
                const cur = a.exists ? a.data() : {};
                const next = {};
                if (v.exists) pgApply(cur, pgDelta(v.data(), -1), next);
                pgApply(cur, pgDelta(clean, 1), next);
                next.total = (cur.total || 0) + (v.exists ? 0 : 1);
                tx.set(agg, next, { merge: true });
                tx.set(ref, Object.assign({}, clean, { uid: user.uid, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }));
            });
            return 'ok';
        } catch (e) { console.warn('PG save failed', e); return 'error'; }
    }
    async function removePG(postId) {
        if (!ready || !user) return 'unavailable';
        const agg = pgDoc(postId), ref = agg.collection('votes').doc(user.uid);
        try {
            await db.runTransaction(async tx => {
                const [a, v] = await Promise.all([tx.get(agg), tx.get(ref)]);
                if (!v.exists) return;
                const cur = a.exists ? a.data() : {};
                const next = {};
                pgApply(cur, pgDelta(v.data(), -1), next);
                next.total = Math.max(0, (cur.total || 0) - 1);
                tx.set(agg, next, { merge: true });
                tx.delete(ref);
            });
            return 'ok';
        } catch (e) { console.warn('PG remove failed', e); return 'error'; }
    }
    // ------------------------------------------------------------------------
    // SHARED COMMENTS — cg_comments/{id} = { postId, uid, name, text, createdAt }
    // Everyone reads; only signed-in (non-guest) users post; authors and the admin delete.
    // ------------------------------------------------------------------------
    function mapComment(d) {
        const v = d.data() || {};
        return { id: d.id, uid: v.uid, name: v.name, text: v.text, postId: v.postId, createdAt: v.createdAt && v.createdAt.toMillis ? v.createdAt.toMillis() : Date.now() };
    }
    async function getComments(postId) {
        if (!ready) return null;
        try {
            const snap = await db.collection('cg_comments').where('postId', '==', String(postId)).limit(100).get();
            const out = []; snap.forEach(d => out.push(mapComment(d)));
            return out.sort((a, b) => b.createdAt - a.createdAt);
        } catch (e) { console.warn('Comments read failed', e); return null; }
    }
    async function getRecentComments(limit) {
        if (!ready) return null;
        try {
            const snap = await db.collection('cg_comments').orderBy('createdAt', 'desc').limit(limit || 100).get();
            const out = []; snap.forEach(d => out.push(mapComment(d)));
            return out;
        } catch (e) { console.warn('Comments read failed', e); return null; }
    }
    async function addComment(postId, text, name) {
        if (!ready) return 'unavailable';
        if (!user || user.isAnonymous) return 'needs-login';
        text = String(text || '').trim().slice(0, 500);
        if (!text) return 'error';
        try {
            await db.collection('cg_comments').add({
                postId: String(postId).slice(0, 120), uid: user.uid,
                name: String(name || user.displayName || 'User').slice(0, 40), text,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return 'ok';
        } catch (e) { console.warn('Comment save failed', e); return 'error'; }
    }
    async function deleteComment(id) {
        if (!ready || !user) return 'unavailable';
        try { await db.collection('cg_comments').doc(String(id)).delete(); return 'ok'; }
        catch (e) { console.warn('Comment delete failed', e); return 'error'; }
    }
    function isSignedIn() { return !!(ready && user && !user.isAnonymous); }   // real (Google) member
    function hasSession() { return !!(ready && user); }                          // member or guest session

    function signInWithGoogle() {
        if (!ready) { if (window.showToast) window.showToast('Firebase not configured yet'); return; }
        auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())
            .catch(e => { console.warn(e); if (window.showToast) window.showToast('Sign-in cancelled or blocked'); });
    }
    function signOut() { if (ready) auth.signOut().catch(() => {}); }

    if (ready) {
        firebase.initializeApp(cfg);
        auth = firebase.auth();
        db = firebase.firestore();
        auth.onAuthStateChanged(u => {
            user = u;
            authResolved = true;
            if (window.onCineAuthChange) window.onCineAuthChange(!!u);
            if (u && !u.isAnonymous && !window.CINE_ADMIN_PAGE) {
                if (window.applyCloudUser) window.applyCloudUser(u.displayName || (u.email || 'User').split('@')[0], u.email || '');
                pullAndMerge();
            }
        });
    }

    // ------------------------------------------------------------------------
    // SITE CONTENT — posts/upcoming/ads... published by the admin for ALL visitors
    //   cg_site/meta      -> { json: "{upcoming,categories,ads,deleted,features,footer}" }
    //   cg_site/posts_0.. -> { json: "[ ...posts... ]" }   (split in chunks, Firestore doc limit = 1 MB)
    // Everybody can read; only the admin e-mail written in the Firestore rules can write.
    // ------------------------------------------------------------------------
    const byteLen = str => new TextEncoder().encode(str).length;
    function chunkList(list, maxBytes) {
        const chunks = []; let cur = [], size = 0;
        list.forEach(x => {
            const len = byteLen(JSON.stringify(x)) + 1;
            if (cur.length && size + len > maxBytes) { chunks.push(cur); cur = []; size = 0; }
            cur.push(x); size += len;
        });
        if (cur.length || !chunks.length) chunks.push(cur);
        return chunks;
    }
    // cached = { rev, data } from the visitor's last visit: if the revision is unchanged only ONE document is read.
    async function loadSiteContent(cached) {
        if (!ready) return null;
        const col = db.collection('cg_site');
        if (cached && cached.rev && cached.data) {
            try {
                const m = await col.doc('meta').get();
                if (m.exists) {
                    const v = JSON.parse((m.data() || {}).json || 'null');
                    if (v && Number(v.rev) === Number(cached.rev)) return cached.data;
                }
            } catch (e) { /* fall through to a full load */ }
        }
        const snap = await col.get();
        if (snap.empty) return null;
        const out = {}, posts = [], ups = [];
        snap.forEach(d => {
            let v = null;
            try { v = JSON.parse((d.data() || {}).json || 'null'); } catch (e) { return; }
            if (d.id === 'meta' && v && typeof v === 'object') Object.assign(out, v);
            else if (/^posts_\d+$/.test(d.id) && Array.isArray(v)) posts.push([parseInt(d.id.slice(6), 10), v]);
            else if (/^upcoming_\d+$/.test(d.id) && Array.isArray(v)) ups.push([parseInt(d.id.slice(9), 10), v]);
        });
        posts.sort((a, b) => a[0] - b[0]); ups.sort((a, b) => a[0] - b[0]);
        out.reviews = [].concat.apply([], posts.map(p => p[1]));
        if (ups.length) out.upcoming = [].concat.apply([], ups.map(p => p[1]));
        return out;
    }
    // expectedRev: the revision this browser loaded. If someone else saved in the meantime
    // the write is refused with { status: 'conflict' } instead of silently overwriting their work.
    async function publishSiteContent(data, expectedRev) {
        if (!ready) return { status: 'unavailable' };
        if (!user || user.isAnonymous) return { status: 'needs-login' };
        try {
            const reviews = Array.isArray(data.reviews) ? data.reviews : [];
            const upcoming = Array.isArray(data.upcoming) ? data.upcoming : [];
            const meta = Object.assign({}, data); delete meta.reviews; delete meta.upcoming; delete meta.rev;
            const big = reviews.concat(upcoming).find(x => byteLen(JSON.stringify(x)) > 900000);
            if (big) return { status: 'toolarge', message: 'The post "' + (big.title || big.id) + '" is larger than 900 KB. Remove embedded (base64) images and use image URLs instead.' };
            if (byteLen(JSON.stringify(meta)) > 900000) return { status: 'toolarge', message: 'Site settings are larger than 900 KB.' };
            const chunks = chunkList(reviews, 600000);
            const upChunks = chunkList(upcoming, 600000);
            const col = db.collection('cg_site');
            const metaRef = col.doc('meta');
            const existing = await col.get();
            const ts = firebase.firestore.FieldValue.serverTimestamp();
            let newRev = 0;
            await db.runTransaction(async tx => {
                const m = await tx.get(metaRef);
                let curRev = 0;
                if (m.exists) { try { curRev = Number(JSON.parse((m.data() || {}).json || '{}').rev) || 0; } catch (e) {} }
                if (expectedRev !== undefined && curRev !== expectedRev) {
                    const err = new Error('rev-conflict'); err.code = 'rev-conflict'; err.rev = curRev; throw err;
                }
                newRev = curRev + 1;
                tx.set(metaRef, { json: JSON.stringify(Object.assign({}, meta, { rev: newRev })), updatedAt: ts });
                upChunks.forEach((c, i) => tx.set(col.doc('upcoming_' + i), { json: JSON.stringify(c), updatedAt: ts }));
                existing.forEach(d => { if (/^upcoming_\d+$/.test(d.id) && parseInt(d.id.slice(9), 10) >= upChunks.length) tx.delete(d.ref); });
                chunks.forEach((c, i) => tx.set(col.doc('posts_' + i), { json: JSON.stringify(c), updatedAt: ts }));
                existing.forEach(d => { if (/^posts_\d+$/.test(d.id) && parseInt(d.id.slice(6), 10) >= chunks.length) tx.delete(d.ref); });
            });
            return { status: 'ok', posts: reviews.length, chunks: chunks.length, rev: newRev };
        } catch (e) {
            if (e && e.code === 'rev-conflict') return { status: 'conflict', rev: e.rev };
            console.warn('Publish failed', e);
            return { status: e && e.code === 'permission-denied' ? 'denied' : 'error', message: (e && e.message) || '' };
        }
    }

    // ------------------------------------------------------------------------
    // ADMIN-ONLY SETTINGS (TMDB key, custom domain): cg_admin/settings
    // The Firestore rules let ONLY the admin e-mail read or write this document.
    // Reading it successfully is also how the admin panel proves the user is the admin.
    // ------------------------------------------------------------------------
    async function getAdminSettings() {
        if (!ready) return { status: 'unavailable' };
        if (!user || user.isAnonymous) return { status: 'needs-login' };
        try {
            const snap = await db.collection('cg_admin').doc('settings').get();
            let data = {};
            if (snap.exists) { try { data = JSON.parse((snap.data() || {}).json || '{}') || {}; } catch (e) {} }
            return { status: 'ok', data };
        } catch (e) {
            return { status: e && e.code === 'permission-denied' ? 'denied' : 'error', message: (e && e.message) || '' };
        }
    }
    async function saveAdminSettings(obj) {
        if (!ready) return { status: 'unavailable' };
        if (!user || user.isAnonymous) return { status: 'needs-login' };
        try {
            await db.collection('cg_admin').doc('settings').set({
                json: JSON.stringify(obj || {}),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                by: user.email || ''
            });
            return { status: 'ok' };
        } catch (e) {
            return { status: e && e.code === 'permission-denied' ? 'denied' : 'error', message: (e && e.message) || '' };
        }
    }

    // ------------------------------------------------------------------------
    // E-MAIL + PASSWORD SIGN-IN (admin login)
    // ------------------------------------------------------------------------
    async function signInWithEmail(email, password) {
        if (!ready) return { status: 'unavailable' };
        try { await auth.signInWithEmailAndPassword(email, password); return { status: 'ok' }; }
        catch (e) { return { status: 'error', code: (e && e.code) || '', message: (e && e.message) || '' }; }
    }
    async function sendPasswordReset(email) {
        if (!ready) return { status: 'unavailable' };
        try { await auth.sendPasswordResetEmail(email); return { status: 'ok' }; }
        catch (e) { return { status: 'error', code: (e && e.code) || '', message: (e && e.message) || '' }; }
    }
    async function sendVerification() {
        if (!ready || !user) return { status: 'needs-login' };
        try { await user.sendEmailVerification(); return { status: 'ok' }; }
        catch (e) { return { status: 'error', code: (e && e.code) || '', message: (e && e.message) || '' }; }
    }
    function isEmailVerified() { return !!(user && user.emailVerified); }
    function getUser() { return user; }
    function isAuthResolved() { return authResolved; }

    function userEmail() { return user && user.email ? user.email : ''; }

    window.CineSync = { ready, onLocalSave, signInWithGoogle, signOut, getCG, submitCG, removeCG, getPG, getMyPG, submitPG, removePG, isSignedIn, hasSession, loadSiteContent, publishSiteContent, getAdminSettings, saveAdminSettings, signInWithEmail, sendPasswordReset, sendVerification, isEmailVerified, getUser, isAuthResolved, userEmail, getComments, getRecentComments, addComment, deleteComment };
})();
