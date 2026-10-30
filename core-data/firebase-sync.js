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
        if (!ready || !user || busy) return;
        const s = localState();
        db.collection('users').doc(user.uid).set({
            watchlist: s.watchlist, watched: s.watched, ratings: s.ratings, notify: s.notify,
            name: user.displayName || '', email: user.email || '',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).catch(e => console.warn('Cloud save failed', e));
    }

    // index.html-এর safeSave() প্রতিবার সেভের পর এটা ডাকে
    function onLocalSave(key) {
        if (!ready || !user || !MAP[key]) return;
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
        if (!user) return 'needs-login';
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
        if (!ready || !user) return 'unavailable';
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
        if (!ready || !user) return;
        const ratings = lsRead('cineguide_user_ratings', {});
        const done = lsRead(syncedKey(), {});
        for (const id of Object.keys(ratings)) {
            if (done[id] === ratings[id]) continue;
            await submitCG(id, ratings[id]);
        }
    }

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
            if (u) {
                if (window.applyCloudUser) window.applyCloudUser(u.displayName || (u.email || 'User').split('@')[0], u.email || '');
                pullAndMerge();
            }
        });
    }

    window.CineSync = { ready, onLocalSave, signInWithGoogle, signOut, getCG, submitCG, removeCG };
})();
