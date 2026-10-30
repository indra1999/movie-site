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

    window.CineSync = { ready, onLocalSave, signInWithGoogle, signOut };
})();
