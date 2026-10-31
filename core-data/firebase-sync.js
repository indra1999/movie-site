// ============================================================================
// core-data/firebase-sync.js  —  ইউজারের Watchlist / Watched / Ratings / Notify
// Google দিয়ে লগইন করলে এগুলো Firestore-এ  users/{uid}  ডকুমেন্টে সেভ হয়।
// লগইন না করলে (Guest) আগের মতোই localStorage-এ থাকে।
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

    let auth = null, db = null, user = null, timer = null, busy = false;

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

    // index.html-এর safeSave() প্রতিবার সেভের পর এটা ডাকে
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
            // গেস্ট অবস্থায় সেভ করা আইটেম + ক্লাউডের আইটেম — দুটোই রাখা হয়
            lsWrite('cineguide_watchlist', union(cloud.watchlist, loc.watchlist));
            lsWrite('cineguide_watched', union(cloud.watched, loc.watched));
            lsWrite('cineguide_notify_upcoming', union(cloud.notify, loc.notify));
            lsWrite('cineguide_user_ratings', Object.assign({}, cloud.ratings || {}, loc.ratings || {}));
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
    // CG RATING — সব ইউজারের রেটিং একসাথে জমা হয়ে গড় (average) হয়
    //   cg_ratings/{postId}              -> { sum, count }   (সামারি)
    //   cg_ratings/{postId}/votes/{uid}  -> { value, uid }   (প্রতি ইউজারের ১টি ভোট)
    // একই ইউজার আবার রেটিং দিলে আগের ভোট বদলে যায় (দুইবার গোনা হয় না)।
    // ------------------------------------------------------------------------
    function cgId(postId) { return String(postId).replace(/[\/\s]+/g, '_'); }
    function syncedKey() { return 'cineguide_cg_synced_' + (user ? user.uid : 'guest'); }

    async function getCG(postId) {
        if (!ready) {
            // Firebase চালু না থাকলে শুধু এই ডিভাইসের নিজের রেটিংটাই দেখাবে
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

    // গেস্ট অবস্থায় দেওয়া রেটিং লগইনের পর CG-তে পাঠানো হয় (একবারই)
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
    // COMMUNITY PARENTAL GUIDE — শুধু লগইন করা ইউজাররা ভোট দিতে পারে
    //   pg_votes/{postId}              -> counters (total, fam_yes, fam_no, c_sex_0..3 ...)
    //   pg_votes/{postId}/votes/{uid}  -> { sex, violence, profanity, drugs (0-3), family: yes|no }
    // এক ইউজার = এক পোস্টে এক ভোট (আবার দিলে আগেরটা বদলে যায়)।
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
            if (window.onCineAuthChange) window.onCineAuthChange(!!u);
            if (u && !u.isAnonymous) {
                if (window.applyCloudUser) window.applyCloudUser(u.displayName || (u.email || 'User').split('@')[0], u.email || '');
                pullAndMerge();
            }
        });
    }

    window.CineSync = { ready, onLocalSave, signInWithGoogle, signOut, getCG, submitCG, removeCG, getPG, getMyPG, submitPG, removePG, isSignedIn, hasSession };
})();
