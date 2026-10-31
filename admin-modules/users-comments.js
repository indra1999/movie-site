// ============================================================================
// MODULE 4: COMMENT MODERATION (shared comments stored in Firestore: cg_comments)
// File: admin-modules/users-comments.js
// ============================================================================
async function initUsersCommentsModule() {
    const container = document.getElementById('tabSection-users');
    if (!container) return;
    container.innerHTML = `<div class="p-5 sm:p-6 rounded-2xl bg-card border border-subtle"><h3 class="text-lg font-extrabold mb-1">Comment Moderation</h3><p class="text-xs text-slate-400">Loading comments…</p></div>`;
    const list = window.CineSync && CineSync.getRecentComments ? await CineSync.getRecentComments(100) : null;
    if (list) window.__cgCommentCount = list.length;
    const titleOf = id => { const r = safeParse('cineguide_custom_reviews', []).find(x => x && x.id === id); return r ? r.title : id; };
    container.innerHTML = `
        <div class="p-5 sm:p-6 rounded-2xl bg-card border border-subtle">
            <div class="flex items-center justify-between mb-1"><h3 class="text-lg font-extrabold">Comment Moderation</h3>
                <button onclick="initUsersCommentsModule()" class="px-3 py-1.5 rounded-lg bg-elevated text-xs font-bold hover:bg-white/10">Refresh</button></div>
            <p class="text-xs text-slate-400 mb-4">Latest 100 public comments from all visitors. Users are managed in Firebase Console → Authentication.</p>
            <div class="space-y-2.5">
                ${list === null ? '<p class="text-xs text-rose-400">Could not load comments. Check the Firestore rules (cg_comments).</p>' :
                  list.length === 0 ? '<p class="text-xs text-slate-500">No comments yet.</p>' :
                  list.map(c => `
                    <div class="p-3 rounded-xl bg-[#090a0f] border border-subtle flex items-center justify-between gap-2">
                        <div class="text-xs min-w-0">
                            <span class="font-bold text-white">${esc(c.name)}</span> <span class="text-slate-500">on ${esc(titleOf(c.postId))} • ${esc(new Date(c.createdAt).toLocaleString())}</span>
                            <p class="text-slate-300 mt-0.5 break-words">${esc(c.text)}</p>
                        </div>
                        <button onclick="deleteUserComment('${esc(c.id)}')" class="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-400 text-xs font-bold shrink-0">Delete</button>
                    </div>`).join('')}
            </div>
        </div>`;
}

async function deleteUserComment(id) {
    if (!confirm('Delete this comment for everyone?')) return;
    const r = await CineSync.deleteComment(id);
    showAdminToast(r === 'ok' ? 'Comment deleted' : 'Could not delete the comment');
    initUsersCommentsModule();
}
