// ============================================================================
// MODULE 3: CUSTOM CATEGORIES & ADVERTISEMENT MANAGER (Point 8 & 23)
// File: admin-modules/categories-ads.js
// ============================================================================

function initCategoriesAdsModule() {
    const container = document.getElementById('tabSection-categories');
    const ads = JSON.parse(localStorage.getItem('cineguide_ads_config') || '{"topBanner":"","detailBanner":"","footerBanner":""}');

    container.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <!-- CUSTOM CATEGORY CREATOR -->
            <div class="p-5 sm:p-6 rounded-2xl bg-card border border-subtle">
                <h3 class="text-lg font-extrabold mb-1">Custom Category Builder</h3>
                <p class="text-xs text-slate-400 mb-4">Create new categories that appear in the top navigation bar and slide-out menu drawer.</p>
                
                <form onsubmit="addAdminCategory(event)" class="flex gap-2 mb-5">
                    <input type="text" id="newCategoryInput" required placeholder="e.g. K-Drama / Documentary / Thriller" class="flex-1 px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-subtle text-xs">
                    <button type="submit" class="px-4 py-2.5 rounded-xl accent-bg text-white font-bold text-xs shrink-0">+ Add Category</button>
                </form>

                <div id="customCategoriesPills" class="flex flex-wrap gap-2"></div>
            </div>

            <!-- ADVERTISEMENT CODE MANAGER (Point 23) -->
            <div class="p-5 sm:p-6 rounded-2xl bg-card border border-subtle">
                <h3 class="text-lg font-extrabold mb-1 flex items-center gap-2">
                    <i data-lucide="megaphone" class="w-5 h-5 text-emerald-400"></i> Advertisement Code Manager
                </h3>
                <p class="text-xs text-slate-400 mb-4">Paste Google AdSense, Banner HTML, or Sponsor scripts to monetize your website.</p>

                <form onsubmit="saveAdCodes(event)" class="space-y-3">
                    <div>
                        <label class="text-[11px] font-bold uppercase text-slate-400 block mb-1">Home Top Banner Ad Code (HTML / Script)</label>
                        <textarea id="adTopInput" rows="2" placeholder="<script>...</script> or <a href='...'><img src='...'></a>" class="w-full px-3 py-2 rounded-xl bg-[#090a0f] border border-subtle text-xs font-mono">${ads.topBanner || ''}</textarea>
                    </div>
                    <div>
                        <label class="text-[11px] font-bold uppercase text-slate-400 block mb-1">Post Detail Page Ad Slot Code</label>
                        <textarea id="adDetailInput" rows="2" placeholder="Ad code inside movie review page..." class="w-full px-3 py-2 rounded-xl bg-[#090a0f] border border-subtle text-xs font-mono">${ads.detailBanner || ''}</textarea>
                    </div>
                    <div>
                        <label class="text-[11px] font-bold uppercase text-slate-400 block mb-1">Footer Sticky / Sponsor Ad Code</label>
                        <textarea id="adFooterInput" rows="2" placeholder="Footer ad code..." class="w-full px-3 py-2 rounded-xl bg-[#090a0f] border border-subtle text-xs font-mono">${ads.footerBanner || ''}</textarea>
                    </div>
                    <button type="submit" class="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs">
                        Publish Ad Codes to Website
                    </button>
                </form>
            </div>
        </div>
    `;
    renderAdminCategoriesPills();
}

function addAdminCategory(e) {
    e.preventDefault();
    const val = document.getElementById('newCategoryInput').value.trim();
    if (!val) return;
    const list = JSON.parse(localStorage.getItem('cineguide_custom_categories') || '[]');
    if (!list.includes(val)) {
        list.push(val);
        localStorage.setItem('cineguide_custom_categories', JSON.stringify(list));
    }
    document.getElementById('newCategoryInput').value = '';
    renderAdminCategoriesPills();
    showAdminToast(`Category "${val}" created!`);
}

function renderAdminCategoriesPills() {
    const list = JSON.parse(localStorage.getItem('cineguide_custom_categories') || '[]');
    const box = document.getElementById('customCategoriesPills');
    if (!box) return;
    if (list.length === 0) {
        box.innerHTML = `<span class="text-xs text-slate-500">No custom categories added yet.</span>`;
        return;
    }
    box.innerHTML = list.map((c, idx) => `
        <span class="px-3 py-1.5 rounded-xl bg-[#090a0f] border border-subtle text-xs font-bold flex items-center gap-2">
            ${c}
            <button onclick="removeAdminCategory(${idx})" class="text-rose-400 hover:text-white">✕</button>
        </span>
    `).join('');
}

function removeAdminCategory(idx) {
    const list = JSON.parse(localStorage.getItem('cineguide_custom_categories') || '[]');
    list.splice(idx, 1);
    localStorage.setItem('cineguide_custom_categories', JSON.stringify(list));
    renderAdminCategoriesPills();
    showAdminToast("Category removed!");
}

function saveAdCodes(e) {
    e.preventDefault();
    const config = {
        topBanner: document.getElementById('adTopInput').value.trim(),
        detailBanner: document.getElementById('adDetailInput').value.trim(),
        footerBanner: document.getElementById('adFooterInput').value.trim()
    };
    localStorage.setItem('cineguide_ads_config', JSON.stringify(config));
    showAdminToast("Advertisement codes published!");
}
