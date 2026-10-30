// ============================================================================
// MODULE 5: DOMAIN SEO, FOOTER CREDITS, TMDB API KEY & ADMIN SECURITY (Username + Password)
// File: admin-modules/settings-security.js
// ============================================================================

function initSettingsSecurityModule() {
    const container = document.getElementById('tabSection-settings');
    const domain = localStorage.getItem('cineguide_custom_domain') || 'https://cineguide.com';
    const tmdbKey = localStorage.getItem('cineguide_tmdb_key') || '';
    const copyright = localStorage.getItem('cineguide_footer_copyright') || '© 2026 CINEGUIDE. All rights reserved.';
    const credit = localStorage.getItem('cineguide_footer_credit') || 'Designed & Developed with ❤️ by <span class="font-bold accent-text">Indra Mondal</span>';
    const tagline = localStorage.getItem('cineguide_footer_tagline') || 'Verified Movie, Web Series & Anime Reviews with Complete Family Parental Guide.';
    const currentAdminUser = localStorage.getItem('cineguide_admin_user') || 'admin';

    container.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <!-- SEO DOMAIN, API KEYS & FOOTER TEXT -->
            <form onsubmit="saveSiteSettings(event)" class="p-5 sm:p-6 rounded-2xl bg-card border border-subtle space-y-4">
                <h3 class="text-lg font-extrabold mb-1">Domain SEO, API Keys & Footer Text</h3>

                <div>
                    <label class="text-[11px] font-bold uppercase text-slate-400 block mb-1">Primary Custom Domain Name</label>
                    <input type="url" id="setDomainInput" value="${esc(domain)}" placeholder="https://yourdomain.com" class="w-full px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
                </div>

                <div>
                    <label class="text-[11px] font-bold uppercase text-slate-400 block mb-1">TMDB API Key (v3 Auth)</label>
                    <input type="text" id="setTmdbKeyInput" value="${esc(tmdbKey)}" placeholder="Paste TMDB API key..." class="w-full px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs font-mono">
                </div>

                <div>
                    <label class="text-[11px] font-bold uppercase text-slate-400 block mb-1">Footer Tagline Text</label>
                    <input type="text" id="setTaglineInput" value="${esc(tagline)}" class="w-full px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
                </div>

                <div>
                    <label class="text-[11px] font-bold uppercase text-slate-400 block mb-1">Footer Copyright Text</label>
                    <input type="text" id="setCopyrightInput" value="${esc(copyright)}" class="w-full px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
                </div>

                <div>
                    <label class="text-[11px] font-bold uppercase text-slate-400 block mb-1">Footer Developer Credit Text</label>
                    <input type="text" id="setCreditInput" value="${esc(credit)}" class="w-full px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
                </div>

                <button type="submit" class="w-full py-3 rounded-xl accent-bg text-white font-extrabold text-xs">
                    Save Domain, API & Footer Settings
                </button>
            </form>

            <!-- ADMIN USERNAME & PASSWORD SECURITY -->
            <div class="space-y-6">
                <form onsubmit="changeAdminCredentials(event)" class="p-5 sm:p-6 rounded-2xl bg-card border border-subtle space-y-3">
                    <h3 class="text-lg font-extrabold mb-1">Admin Credentials Security</h3>
                    <p class="text-xs text-slate-400">Change your admin username and lock-screen password.</p>
                    
                    <div>
                        <label class="text-[11px] font-bold uppercase text-slate-400 block mb-1">Current Password</label>
                        <input type="password" id="oldAdminPassInput" required placeholder="Enter current password..." class="w-full px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
                    </div>

                    <div>
                        <label class="text-[11px] font-bold uppercase text-slate-400 block mb-1">New Admin Username</label>
                        <input type="text" id="newAdminUserInput" value="${esc(currentAdminUser)}" required class="w-full px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
                    </div>

                    <div>
                        <label class="text-[11px] font-bold uppercase text-slate-400 block mb-1">New Admin Password</label>
                        <input type="password" id="newAdminPassInput" required placeholder="Enter new password..." class="w-full px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
                    </div>

                    <button type="submit" class="w-full py-3 rounded-xl bg-amber-500 text-black font-extrabold text-xs">
                        Update Admin Credentials
                    </button>
                </form>

                <!-- BACKUP & PUBLISH -->
                <div class="p-5 sm:p-6 rounded-2xl bg-card border border-subtle space-y-3">
                    <h3 class="text-lg font-extrabold mb-1">Backup & Publish to Visitors</h3>
                    <p class="text-xs text-slate-400">Posts, upcoming items, categories and ads are saved in <b>this browser only</b>. Export <code class="text-emerald-400">site-data.json</code> and upload it next to <code class="text-emerald-400">index.html</code> in your GitHub repo so every visitor sees them.</p>
                    <button type="button" onclick="exportSiteData()" class="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs">Export site-data.json</button>
                    <label class="block w-full py-3 rounded-xl bg-elevated border border-subtle text-center text-xs font-bold cursor-pointer hover:bg-white/10">
                        Import / Restore site-data.json
                        <input type="file" accept="application/json,.json" class="hidden" onchange="importSiteData(event)">
                    </label>
                </div>
            </div>
        </div>
    `;
}


function saveSiteSettings(e) {
    e.preventDefault();
    try {
        localStorage.setItem('cineguide_custom_domain', document.getElementById('setDomainInput').value.trim());
        localStorage.setItem('cineguide_tmdb_key', document.getElementById('setTmdbKeyInput').value.trim());
        localStorage.setItem('cineguide_footer_tagline', document.getElementById('setTaglineInput').value.trim());
        localStorage.setItem('cineguide_footer_copyright', document.getElementById('setCopyrightInput').value.trim());
        localStorage.setItem('cineguide_footer_credit', document.getElementById('setCreditInput').value.trim());
        showAdminToast("Domain, API Key & Footer Texts Updated!");
    } catch (err) {
        alert('Could not save: browser storage is full or blocked.');
    }
}


function changeAdminCredentials(e) {
    e.preventDefault();
    const oldPass = document.getElementById('oldAdminPassInput').value;
    const newUser = document.getElementById('newAdminUserInput').value.trim();
    const newPass = document.getElementById('newAdminPassInput').value.trim();
    const savedPass = localStorage.getItem('cineguide_admin_pass') || 'admin123';
    if (oldPass !== savedPass) { showAdminToast("Current password is incorrect!"); return; }
    if (!newUser || newPass.length < 6) { showAdminToast("Username required and password must be 6+ characters"); return; }

    localStorage.setItem('cineguide_admin_user', newUser);
    localStorage.setItem('cineguide_admin_pass', newPass);
    e.target.reset();
    document.getElementById('newAdminUserInput').value = newUser;
    showAdminToast("Admin credentials updated successfully!");
}

function exportSiteData() {
    const data = {
        exportedAt: new Date().toISOString(),
        reviews: safeParse('cineguide_custom_reviews', []),
        upcoming: safeParse('cineguide_upcoming', []),
        categories: safeParse('cineguide_custom_categories', []),
        ads: safeParse('cineguide_ads_config', {}),
        footer: {
            tagline: localStorage.getItem('cineguide_footer_tagline') || '',
            copyright: localStorage.getItem('cineguide_footer_copyright') || '',
            credit: localStorage.getItem('cineguide_footer_credit') || ''
        }
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'site-data.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    showAdminToast("site-data.json exported!");
}

function importSiteData(ev) {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const data = JSON.parse(reader.result);
            const mergeById = (key, incoming) => {
                if (!Array.isArray(incoming)) return;
                const cur = safeParse(key, []);
                const ids = new Set(cur.map(x => x.id));
                safeSave(key, [...cur, ...incoming.filter(x => x && x.id && !ids.has(x.id))]);
            };
            mergeById('cineguide_custom_reviews', data.reviews);
            mergeById('cineguide_upcoming', data.upcoming);
            if (Array.isArray(data.categories)) {
                const cats = safeParse('cineguide_custom_categories', []);
                safeSave('cineguide_custom_categories', [...new Set([...cats, ...data.categories])]);
            }
            if (data.ads && typeof data.ads === 'object') safeSave('cineguide_ads_config', data.ads);
            if (data.footer) {
                ['tagline', 'copyright', 'credit'].forEach(k => { if (data.footer[k]) localStorage.setItem('cineguide_footer_' + k, data.footer[k]); });
            }
            initAllAdminModules();
            showAdminToast("Data imported successfully!");
        } catch (err) {
            alert('This file is not a valid site-data.json');
        }
    };
    reader.readAsText(file);
    ev.target.value = '';
}
