// ============================================================================
// MODULE 4: USER MANAGEMENT & COMMENT MODERATION (Points 24 & 25)
// File: admin-modules/users-comments.js
// ============================================================================

function initUsersCommentsModule() {
    const container = document.getElementById('tabSection-users');
    const activeUser = JSON.parse(localStorage.getItem('cineguide_user') || 'null');
    const allCommentsObj = JSON.parse(localStorage.getItem('cineguide_comments') || '{}');

    let flatComments = [];
    Object.keys(allCommentsObj).forEach(postId => {
        (allCommentsObj[postId] || []).forEach((c, idx) => {
            flatComments.push({ postId, index: idx, ...c });
        });
    });

    container.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- REGISTERED USERS -->
            <div class="p-5 sm:p-6 rounded-2xl bg-card border border-subtle">
                <h3 class="text-lg font-extrabold mb-1">User Management</h3>
                <p class="text-xs text-slate-400 mb-4">View synced user profiles and manage access.</p>
                ${activeUser ? `
                    <div class="p-4 rounded-xl bg-[#090a0f] border border-subtle flex items-center justify-between">
                        <div>
                            <h4 class="font-bold text-sm">${activeUser.name}</h4>
                            <p class="text-xs text-slate-400">${activeUser.email}</p>
                        </div>
                        <button onclick="removeRegisteredUser()" class="px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-400 text-xs font-bold">Remove User</button>
                    </div>
                ` : `<p class="text-xs text-slate-500">No external users registered on this browser yet.</p>`}
            </div>

            <!-- COMMENT MODERATION -->
            <div class="p-5 sm:p-6 rounded-2xl bg-card border border-subtle">
                <h3 class="text-lg font-extrabold mb-1">Comment Moderation</h3>
                <p class="text-xs text-slate-400 mb-4">Review or delete audience comments across all posts.</p>
                <div class="space-y-2.5">
                    ${flatComments.length === 0 ? `<p class="text-xs text-slate-500">No user comments submitted yet.</p>` : 
                        flatComments.map(c => `
                            <div class="p-3 rounded-xl bg-[#090a0f] border border-subtle flex items-center justify-between gap-2">
                                <div class="text-xs">
                                    <span class="font-bold text-white">${c.user}</span> <span class="text-slate-500">on ${c.postId}</span>
                                    <p class="text-slate-300 mt-0.5">${c.text}</p>
                                </div>
                                <button onclick="deleteUserComment('${c.postId}', ${c.index})" class="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-400 text-xs font-bold shrink-0">Delete</button>
                            </div>
                        `).join('')
                    }
                </div>
            </div>
        </div>
    `;
}

function removeRegisteredUser() {
    localStorage.removeItem('cineguide_user');
    initUsersCommentsModule();
    showAdminToast("User removed!");
}

function deleteUserComment(postId, idx) {
    const allCommentsObj = JSON.parse(localStorage.getItem('cineguide_comments') || '{}');
    if (allCommentsObj[postId]) {
        allCommentsObj[postId].splice(idx, 1);
        localStorage.setItem('cineguide_comments', JSON.stringify(allCommentsObj));
        initUsersCommentsModule();
        showAdminToast("Comment deleted!");
    }
}
