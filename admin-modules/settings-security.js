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
                    <input type="url" id="setDomainInput" value="${domain}" placeholder="https://yourdomain.com" class="w-full px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
                </div>

                <div>
                    <label class="text-[11px] font-bold uppercase text-slate-400 block mb-1">TMDB API Key (v3 Auth)</label>
                    <input type="text" id="setTmdbKeyInput" value="${tmdbKey}" placeholder="Paste TMDB API key..." class="w-full px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs font-mono">
                </div>

                <div>
                    <label class="text-[11px] font-bold uppercase text-slate-400 block mb-1">Footer Tagline Text</label>
                    <input type="text" id="setTaglineInput" value="${tagline}" class="w-full px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
                </div>

                <div>
                    <label class="text-[11px] font-bold uppercase text-slate-400 block mb-1">Footer Copyright Text</label>
                    <input type="text" id="setCopyrightInput" value="${copyright}" class="w-full px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
                </div>

                <div>
                    <label class="text-[11px] font-bold uppercase text-slate-400 block mb-1">Footer Developer Credit Text</label>
                    <input type="text" id="setCreditInput" value='${credit}' class="w-full px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
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
                        <label class="text-[11px] font-bold uppercase text-slate-400 block mb-1">New Admin Username</label>
                        <input type="text" id="newAdminUserInput" value="${currentAdminUser}" required class="w-full px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
                    </div>

                    <div>
                        <label class="text-[11px] font-bold uppercase text-slate-400 block mb-1">New Admin Password</label>
                        <input type="password" id="newAdminPassInput" required placeholder="Enter new password..." class="w-full px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
                    </div>

                    <button type="submit" class="w-full py-3 rounded-xl bg-amber-500 text-black font-extrabold text-xs">
                        Update Admin Credentials
                    </button>
                </form>
            </div>
        </div>
    `;
}

function saveSiteSettings(e) {
    e.preventDefault();
    localStorage.setItem('cineguide_custom_domain', document.getElementById('setDomainInput').value.trim());
    localStorage.setItem('cineguide_tmdb_key', document.getElementById('setTmdbKeyInput').value.trim());
    localStorage.setItem('cineguide_footer_tagline', document.getElementById('setTaglineInput').value.trim());
    localStorage.setItem('cineguide_footer_copyright', document.getElementById('setCopyrightInput').value.trim());
    localStorage.setItem('cineguide_footer_credit', document.getElementById('setCreditInput').value.trim());
    showAdminToast("Domain, API Key & Footer Texts Updated!");
}

function changeAdminCredentials(e) {
    e.preventDefault();
    const newUser = document.getElementById('newAdminUserInput').value.trim();
    const newPass = document.getElementById('newAdminPassInput').value.trim();
    if (!newUser || !newPass) return;
    
    localStorage.setItem('cineguide_admin_user', newUser);
    localStorage.setItem('cineguide_admin_pass', newPass);
    showAdminToast("Admin credentials updated successfully!");
}
