// ============================================================================
// core-data/store.js  —  THE DATA LAYER (one place that knows where data lives)
//
// Admin UI and the public site only *call* this file. You can redesign the
// admin panel, add/remove features, or change index.html — as long as the data
// keys below stay the same, nothing is lost.
// NOTE: on the admin page the content keys below are redirected to the cloud by
// admin-modules/cloud-store.js, so they are NOT stored in this browser any more.
// Never rename a key here.
//
//   cineguide_custom_reviews   -> your posts (and edited/seeded demo posts)
//   cineguide_upcoming         -> upcoming releases
//   cineguide_comments         -> public visitor comments { postId: [..] }
//   cineguide_tmdb_key         -> TMDB API key
//   cineguide_deleted_ids      -> ids of posts/upcoming you deleted
//                                 (so deleted demo posts never come back)
// ============================================================================
(function () {
    'use strict';

    const KEYS = {
        posts: 'cineguide_custom_reviews',
        upcoming: 'cineguide_upcoming',
        comments: 'cineguide_comments',
        tmdbKey: 'cineguide_tmdb_key',
        customDomain: 'cineguide_custom_domain',
        deleted: 'cineguide_deleted_ids'
    };

    function read(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            if (raw === null || raw === '') return fallback;
            const v = JSON.parse(raw);
            return v === null || v === undefined ? fallback : v;
        } catch (e) { return fallback; }
    }
    function write(key, val) {
        try { localStorage.setItem(key, JSON.stringify(val)); return true; }
        catch (e) { return false; }
    }

    // ---- API key: admin-saved value first, then optional core-data/config.js
    function getTmdbKey() {
        let k = '';
        try { k = (localStorage.getItem(KEYS.tmdbKey) || '').trim(); } catch (e) {}
        if (!k && window.CINE_CONFIG && window.CINE_CONFIG.tmdbKey) k = String(window.CINE_CONFIG.tmdbKey).trim();
        return k;
    }

    // ---- deleted ids (tombstones)
    function deletedIds(extra) {
        return new Set([].concat(read(KEYS.deleted, []), Array.isArray(extra) ? extra : []));
    }
    function markDeleted(id) {
        if (!id) return;
        const list = read(KEYS.deleted, []);
        if (!list.includes(id)) { list.push(id); write(KEYS.deleted, list); }
    }
    function withoutDeleted(list, extra) {
        const gone = deletedIds(extra);
        return (list || []).filter(x => x && !gone.has(x.id));
    }

    // ---- demo posts -> real, editable posts (admin panel calls this on load)
    // Copies each demo item into the editable list ONCE per id. Deleted ones
    // are skipped, edited ones are never overwritten.
    function seedDemo() {
        const demo = window.CINE_DEMO;
        if (!demo) return 0;
        let added = 0;
        const gone = deletedIds();
        [['posts', demo.reviews], ['upcoming', demo.upcoming]].forEach(([name, items]) => {
            if (!Array.isArray(items)) return;
            const cur = read(KEYS[name], []);
            const have = new Set(cur.map(x => x && x.id));
            const add = items.filter(x => x && x.id && !have.has(x.id) && !gone.has(x.id))
                             .map(x => JSON.parse(JSON.stringify(x)));
            if (add.length) { write(KEYS[name], [...cur, ...add]); added += add.length; }
        });
        return added;
    }

    window.CineStore = { KEYS, read, write, getTmdbKey, deletedIds, markDeleted, withoutDeleted, seedDemo };
})();
