// ============================================================================
// MODULE 0: DASHBOARD (stats, content health audit, sitemap + CSV tools, command palette)
// File: admin-modules/dashboard.js   — read-only: it never edits your posts.
// Note: views/comments/ratings come from THIS browser's storage (no server).
// ============================================================================
(function () {
    'use strict';
    const num = n => Number(n || 0).toLocaleString();
    const reviews = () => safeParse('cineguide_custom_reviews', []);
    const upcoming = () => safeParse('cineguide_upcoming', []);
    const views = () => safeParse('cineguide_views', {});
    const comments = () => safeParse('cineguide_comments', {});
    const totalViews = r => (parseInt(r.baseViews) || 100) + (views()[r.id] || 0);
    const score = r => { const n = parseFloat(r.rating); return isNaN(n) ? null : n; };
    const domain = () => (localStorage.getItem('cineguide_custom_domain') || location.origin).replace(/\/$/, '');

    function audit(list) {
        const issues = [], titles = {};
        list.forEach(r => { const k = (r.title || '').trim().toLowerCase() + '|' + r.year; (titles[k] = titles[k] || []).push(r); });
        list.forEach(r => {
            const p = [];
            if (!r.poster) p.push('No poster');
            if (!r.backdrop) p.push('No backdrop');
            if (!r.trailer) p.push('No trailer');
            if (!r.summary || r.summary.length < 80) p.push('Summary too short (<80 chars, weak for SEO)');
            if (!r.verdict) p.push('No verdict');
            if (score(r) === null) p.push('No rating');
            if (!Array.isArray(r.cast) || !r.cast.length) p.push('No cast');
            if (!r.slug) p.push('No slug (URL will use ID)');
            if (titles[(r.title || '').trim().toLowerCase() + '|' + r.year].length > 1) p.push('Possible duplicate');
            if (p.length) issues.push({ r, p });
        });
        return issues;
    }

    function card(label, value, icon, tone) {
        return `<div class="p-4 rounded-2xl bg-card border border-subtle">
            <div class="flex items-center justify-between mb-2"><span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">${label}</span>
            <i data-lucide="${icon}" class="w-4 h-4 ${tone}"></i></div><div class="text-2xl font-black">${value}</div></div>`;
    }

    window.renderAdminDashboard = function () {
        const el = document.getElementById('tabSection-dashboard'); if (!el) return;
        const R = reviews(), U = upcoming(), C = comments();
        const nComments = window.__cgCommentCount || 0;
        const scored = R.filter(r => score(r) !== null);
        const avg = scored.length ? (scored.reduce((a, r) => a + score(r), 0) / scored.length).toFixed(1) : '—';
        const tv = R.reduce((a, r) => a + totalViews(r), 0);
        const top = [...R].sort((a, b) => totalViews(b) - totalViews(a)).slice(0, 5);
        const maxV = top.length ? totalViews(top[0]) : 1;
        const byCat = {}; R.forEach(r => byCat[r.category || 'Other'] = (byCat[r.category || 'Other'] || 0) + 1);
        const issues = audit(R);
        const demoIds = new Set([].concat((window.CINE_DEMO || {}).reviews || [], (window.CINE_DEMO || {}).upcoming || []).map(x => x && x.id));
        const demoCount = R.filter(x => demoIds.has(x.id)).length + U.filter(x => demoIds.has(x.id)).length;
        const hour = new Date().getHours();
        const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
        const cs = (window.CloudStore && CloudStore.info) ? CloudStore.info() : { email: '', status: 'idle', dirty: false };
        const recent = [...R].sort((a, b) => (b.uploadedAt || 0) - (a.uploadedAt || 0)).slice(0, 5);

        el.innerHTML = `
        <div class="mb-6"><h1 class="text-2xl font-black">${greet}, Admin 👋</h1>
            <p class="text-xs text-slate-400 mt-1">Overview of your site • Press <kbd class="px-1.5 py-0.5 rounded bg-elevated text-[10px]">Ctrl</kbd>+<kbd class="px-1.5 py-0.5 rounded bg-elevated text-[10px]">K</kbd> to jump anywhere</p></div>
        <div class="mb-6 p-3.5 rounded-2xl bg-card border border-subtle text-xs flex items-center justify-between gap-3 flex-wrap">
            <span class="text-slate-300"><i data-lucide="cloud" class="w-4 h-4 inline -mt-0.5 text-emerald-500"></i> Cloud storage: <b>${esc(cs.email || 'signed in')}</b>${cs.dirty ? ' <span class="text-amber-400">• saving…</span>' : ' <span class="text-emerald-400">• all changes saved</span>'}</span>
            <button onclick="switchAdminTab('settings')" class="px-3 py-1.5 rounded-lg bg-elevated font-bold hover:bg-white/10">Account &amp; backup</button></div>

        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            ${card('Reviews', num(R.length), 'film', 'text-rose-500')}
            ${card('Upcoming', num(U.length), 'calendar-clock', 'text-amber-500')}
            ${card('Total views', num(tv), 'eye', 'text-sky-400')}
            ${card('Avg score', avg, 'star', 'text-amber-400')}
            ${card('Comments', num(nComments), 'message-square', 'text-emerald-400')}
            ${card('Categories', num(Object.keys(byCat).length), 'folder', 'text-violet-400')}
            ${card('Need attention', num(issues.length), 'alert-triangle', issues.length ? 'text-amber-400' : 'text-emerald-400')}
            ${card('Health score', R.length ? Math.round(100 * (R.length - issues.length) / R.length) + '%' : '—', 'activity', 'text-emerald-400')}
        </div>

        <div class="grid lg:grid-cols-2 gap-4 mb-6">
            <div class="p-4 rounded-2xl bg-card border border-subtle"><h2 class="font-extrabold text-sm mb-3">Most viewed</h2>
                ${top.length ? top.map(r => `<div class="mb-2.5"><div class="flex justify-between text-xs mb-1"><span class="truncate pr-2">${esc(r.title)}</span><span class="text-slate-400">${num(totalViews(r))}</span></div>
                <div class="h-2 rounded-full bg-elevated overflow-hidden"><div class="h-full accent-bg" style="width:${Math.max(4, Math.round(100 * totalViews(r) / maxV))}%"></div></div></div>`).join('') : '<p class="text-xs text-slate-500">No posts yet.</p>'}</div>
            <div class="p-4 rounded-2xl bg-card border border-subtle"><h2 class="font-extrabold text-sm mb-3">Posts by category</h2>
                ${Object.keys(byCat).length ? Object.entries(byCat).map(([k, v]) => `<div class="mb-2.5"><div class="flex justify-between text-xs mb-1"><span>${esc(k)}</span><span class="text-slate-400">${v}</span></div>
                <div class="h-2 rounded-full bg-elevated overflow-hidden"><div class="h-full bg-sky-500" style="width:${Math.round(100 * v / R.length)}%"></div></div></div>`).join('') : '<p class="text-xs text-slate-500">No posts yet.</p>'}</div>
        </div>

        <div class="p-4 rounded-2xl bg-card border border-subtle mb-6"><h2 class="font-extrabold text-sm mb-3">Quick actions</h2>
            <div class="flex flex-wrap gap-2 text-xs font-bold">
                <button onclick="switchAdminTab('posts')" class="px-3.5 py-2 rounded-xl accent-bg text-white">+ New review</button>
                <button onclick="switchAdminTab('upcoming')" class="px-3.5 py-2 rounded-xl bg-elevated hover:bg-white/10">+ Upcoming</button>
                <button onclick="dashDownloadSitemap()" class="px-3.5 py-2 rounded-xl bg-elevated hover:bg-white/10">Generate sitemap.xml</button>
                <button onclick="dashExportCSV()" class="px-3.5 py-2 rounded-xl bg-elevated hover:bg-white/10">Export reviews (CSV)</button>
                ${demoCount ? `<button onclick="dashRemoveDemo()" class="px-3.5 py-2 rounded-xl bg-rose-500/15 text-rose-300 hover:bg-rose-500/25">Remove ${demoCount} demo posts</button>` : ''}
                <a href="index.html" target="_blank" class="px-3.5 py-2 rounded-xl bg-elevated hover:bg-white/10">View live site ↗</a></div></div>

        <div class="p-4 rounded-2xl bg-card border border-subtle mb-6"><div class="flex items-center justify-between mb-3"><h2 class="font-extrabold text-sm">Content health audit</h2><span class="text-[11px] text-slate-400">${issues.length} of ${R.length} posts need work</span></div>
            ${issues.length ? issues.slice(0, 12).map(i => `<div class="py-2.5 border-t border-subtle first:border-0 text-xs"><b>${esc(i.r.title)}</b> <span class="text-slate-500">${esc(i.r.year)}</span>
                <div class="flex flex-wrap gap-1.5 mt-1.5">${i.p.map(x => `<span class="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-semibold">${esc(x)}</span>`).join('')}</div></div>`).join('')
                : '<p class="text-xs text-emerald-400">✓ All posts look complete.</p>'}
            ${issues.length > 12 ? `<p class="text-[11px] text-slate-500 mt-2">+${issues.length - 12} more…</p>` : ''}</div>

        <div class="p-4 rounded-2xl bg-card border border-subtle"><h2 class="font-extrabold text-sm mb-3">Recently added</h2>
            ${recent.length ? recent.map(r => `<div class="flex items-center gap-3 py-2 border-t border-subtle first:border-0 text-xs"><img src="${esc(r.poster || r.backdrop)}" class="w-8 h-11 rounded object-cover bg-elevated" alt=""><div class="flex-1 min-w-0"><div class="font-bold truncate">${esc(r.title)}</div><div class="text-slate-500">${esc(r.category)} • ${esc(r.year)}</div></div><span class="text-amber-400 font-bold">★ ${esc(r.rating)}</span></div>`).join('') : '<p class="text-xs text-slate-500">Nothing yet.</p>'}</div>`;
        lucide.createIcons();
    };

    function download(name, text, type) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([text], { type }));
        a.download = name; document.body.appendChild(a); a.click(); a.remove();
    }
    window.dashDownloadSitemap = function () {
        const d = domain(), today = new Date().toISOString().slice(0, 10);
        const urls = [`<url><loc>${d}/</loc><lastmod>${today}</lastmod><priority>1.0</priority></url>`]
            .concat(reviews().map(r => `<url><loc>${d}/?post=${encodeURIComponent(r.slug || r.id)}</loc><lastmod>${r.uploadedAt ? new Date(r.uploadedAt).toISOString().slice(0, 10) : today}</lastmod><priority>0.8</priority></url>`)
                .map(x => x.replace(/&/g, '&amp;')));
        download('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`, 'application/xml');
        showAdminToast('sitemap.xml downloaded — upload it next to index.html');
    };
    window.dashRemoveDemo = function () {
        const D = window.CINE_DEMO || {};
        const ids = new Set([].concat(D.reviews || [], D.upcoming || []).map(x => x && x.id));
        const R = reviews(), U = upcoming();
        const r2 = R.filter(x => !ids.has(x.id)), u2 = U.filter(x => !ids.has(x.id));
        const n = (R.length - r2.length) + (U.length - u2.length);
        if (!n) { showAdminToast('No demo posts found'); return; }
        if (!confirm('Delete ' + n + ' demo posts from the website? Your own posts are not touched.')) return;
        safeSave('cineguide_custom_reviews', r2); safeSave('cineguide_upcoming', u2);
        renderAdminDashboard(); showAdminToast(n + ' demo posts removed');
    };
    window.dashExportCSV = function () {
        const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
        const rows = [['Title', 'Year', 'Category', 'Language', 'Rating', 'Safety', 'Views', 'Slug']]
            .concat(reviews().map(r => [r.title, r.year, r.category, r.language, r.rating, r.safetyLevel, totalViews(r), r.slug || r.id]));
        download('cineguide-reviews.csv', '\ufeff' + rows.map(r => r.map(q).join(',')).join('\n'), 'text/csv');
        showAdminToast('CSV exported');
    };

    // ---- Command palette (Ctrl/Cmd + K) ----
    const TABS = [['dashboard', 'Dashboard'], ['posts', 'Add New Post'], ['manage', 'Manage Posts'], ['upcoming', 'Upcoming Releases'], ['categories', 'Categories & Ads'], ['users', 'Users & Comments'], ['settings', 'SEO, Footer, Security & Backups']];
    function closePalette() { const p = document.getElementById('cmdPalette'); if (p) p.remove(); }
    function openPalette() {
        if (document.getElementById('cmdPalette')) return closePalette();
        const items = TABS.map(t => ({ label: 'Go to: ' + t[1], run: () => switchAdminTab(t[0]) }))
            .concat([{ label: 'Action: Generate sitemap.xml', run: dashDownloadSitemap }, { label: 'Action: Export reviews CSV', run: dashExportCSV }, { label: 'Action: Open live site', run: () => window.open('index.html', '_blank') }]);
        reviews().forEach(r => items.push({ label: 'Post: ' + r.title + ' (' + r.year + ')', run: () => { switchAdminTab('manage'); } }));
        const p = document.createElement('div');
        p.id = 'cmdPalette'; p.className = 'fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 pt-24';
        p.innerHTML = `<div class="w-full max-w-lg bg-card border border-subtle rounded-2xl shadow-2xl overflow-hidden"><input id="cmdInput" placeholder="Type to search tabs, actions, posts…" class="w-full px-4 py-3.5 bg-transparent border-b border-subtle text-sm outline-none"><div id="cmdList" class="max-h-72 overflow-y-auto"></div></div>`;
        p.addEventListener('click', e => { if (e.target === p) closePalette(); });
        document.body.appendChild(p);
        const input = document.getElementById('cmdInput'), list = document.getElementById('cmdList'); let sel = 0, cur = [];
        const draw = () => {
            const q = input.value.toLowerCase();
            cur = items.filter(i => i.label.toLowerCase().includes(q)).slice(0, 30); sel = Math.min(sel, Math.max(cur.length - 1, 0));
            list.innerHTML = cur.map((i, n) => `<button data-i="${n}" class="w-full text-left px-4 py-2.5 text-xs ${n === sel ? 'bg-white/10' : ''} hover:bg-white/10">${esc(i.label)}</button>`).join('') || '<p class="p-4 text-xs text-slate-500">No results</p>';
        };
        input.addEventListener('input', () => { sel = 0; draw(); });
        input.addEventListener('keydown', e => {
            if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, cur.length - 1); draw(); e.preventDefault(); }
            else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); draw(); e.preventDefault(); }
            else if (e.key === 'Enter' && cur[sel]) { const f = cur[sel].run; closePalette(); f(); }
            else if (e.key === 'Escape') closePalette();
        });
        list.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) { const f = cur[+b.dataset.i].run; closePalette(); f(); } });
        draw(); input.focus();
    }
    document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && document.getElementById('adminAppWrapper') && !document.getElementById('adminAppWrapper').classList.contains('hidden')) { e.preventDefault(); openPalette(); }
    });
    window.openCommandPalette = openPalette;
    window.initDashboardModule = renderAdminDashboard;
})();
