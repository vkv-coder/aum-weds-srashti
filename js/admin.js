// ==========================================
// Aum weds Srashti - admin panel
// ==========================================

const ADMIN_TOKEN_KEY = 'wd_admin_token';
let adminFamilies = [];
let adminTab = null;

async function adminLogin() {
  const pin = document.getElementById('admin-pin').value;
  const errEl = document.getElementById('admin-login-error');
  errEl.textContent = '';
  if (!pin) { errEl.textContent = 'Enter the admin PIN.'; return; }
  const { data, error } = await db.rpc('wd_admin_login', { p_pin: pin });
  if (error) { errEl.textContent = 'Incorrect PIN.'; return; }
  sessionStorage.setItem(ADMIN_TOKEN_KEY, data);
  enterAdminApp();
}

function adminLogout() {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  document.getElementById('admin-main-screen').style.display = 'none';
  document.getElementById('admin-login-screen').style.display = 'flex';
  document.getElementById('admin-pin').value = '';
}

function adminToken() {
  return sessionStorage.getItem(ADMIN_TOKEN_KEY);
}

function enterAdminApp() {
  document.getElementById('admin-login-screen').style.display = 'none';
  document.getElementById('admin-main-screen').style.display = 'block';
  goAdminTab('families');
}

async function tryAdminAutoLogin() {
  const token = adminToken();
  if (!token) return;
  const { error } = await db.rpc('wd_admin_list_families', { p_token: token });
  if (error) { sessionStorage.removeItem(ADMIN_TOKEN_KEY); return; }
  enterAdminApp();
}

function renderAdminNavTabs() {
  const tabs = [
    { id: 'families', label: 'Families' },
    { id: 'itinerary', label: 'Itinerary' },
    { id: 'announcements', label: 'Announcements' },
    { id: 'gallery', label: 'Gallery' }
  ];
  const nav = document.getElementById('admin-nav-tabs');
  nav.innerHTML = tabs.map(t =>
    `<div class="nav-tab${t.id === adminTab ? ' active' : ''}" onclick="goAdminTab('${t.id}')">${t.label}</div>`
  ).join('');
}

function goAdminTab(tabId) {
  adminTab = tabId;
  renderAdminNavTabs();
  const content = document.getElementById('admin-page-content');
  if (tabId === 'families') renderFamiliesTab(content);
  else if (tabId === 'itinerary') renderItineraryTab(content);
  else if (tabId === 'announcements') renderAnnouncementsTab(content);
  else if (tabId === 'gallery') renderGalleryTab(content);
}

// ---------- Families ----------
async function renderFamiliesTab(container) {
  container.innerHTML = `
    <div class="card">
      <div class="section-header"><h3>Families</h3><button class="btn-primary btn-sm" onclick="openAddFamilyModal()">+ Add Family</button></div>
      <div id="families-list">Loading...</div>
    </div>
  `;
  await loadFamilies();
}

async function loadFamilies() {
  const { data, error } = await db.rpc('wd_admin_list_families', { p_token: adminToken() });
  const listEl = document.getElementById('families-list');
  if (error) { listEl.innerHTML = `<div class="error-msg">${error.message}</div>`; return; }
  adminFamilies = data || [];
  if (adminFamilies.length === 0) { listEl.innerHTML = `<div class="empty-state"><p>No families added yet.</p></div>`; return; }
  listEl.innerHTML = adminFamilies.map(f => `
    <div class="member-row">
      <div class="section-header">
        <div class="member-name">${escapeHtml(f.family_name)} <span class="form-hint">(code: ${escapeHtml(f.code)})</span></div>
        <button class="btn-danger btn-sm" onclick="deleteFamily('${f.code}')">Delete</button>
      </div>
      ${(f.members || []).map(m => `
        <div style="display:flex;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap;">
          <span style="min-width:150px;">${escapeHtml(m.name)} <span class="form-hint">(${escapeHtml(m.member_code)})</span></span>
          <input type="text" placeholder="Room no." value="${escapeHtml(m.room_no || '')}" style="width:110px;padding:6px 8px;border:1px solid var(--border);border-radius:6px;" id="room-${m.id}">
          <button class="btn-secondary btn-sm" onclick="saveRoom('${m.id}')">Save Room</button>
          <button class="btn-danger btn-sm" onclick="deleteMember('${m.id}','${f.code}')">Remove</button>
        </div>
      `).join('')}
      <div style="margin-top:10px;">
        <button class="btn-secondary btn-sm" onclick="addMemberPrompt('${f.code}')">+ Add Member</button>
      </div>
    </div>
  `).join('');
}

function openAddFamilyModal() {
  openModal(`
    <div class="modal-title">Add Family</div>
    <div class="form-group"><label>Family Code (e.g. v001)</label><input type="text" id="new-family-code"></div>
    <div class="form-group"><label>Family Name</label><input type="text" id="new-family-name" placeholder="e.g. Vijay Family"></div>
    <div class="form-group"><label>Member Names (one per line)</label><textarea id="new-family-members" rows="4" placeholder="Vijay&#10;Mrs. Vijay&#10;Raj"></textarea></div>
    <div class="error-msg" id="new-family-error"></div>
    <div class="modal-actions">
      <button class="btn-primary" onclick="createFamily()">Create</button>
      <button class="btn-secondary" onclick="closeModal()">Cancel</button>
    </div>
  `);
}

async function createFamily() {
  const errEl = document.getElementById('new-family-error');
  const code = document.getElementById('new-family-code').value.trim();
  const name = document.getElementById('new-family-name').value.trim();
  const members = document.getElementById('new-family-members').value.split('\n').map(s => s.trim()).filter(Boolean);
  if (!code || !name) { errEl.textContent = 'Code and family name are required.'; return; }
  const { error } = await db.rpc('wd_admin_create_family', {
    p_token: adminToken(), p_code: code, p_family_name: name, p_member_names: members
  });
  if (error) { errEl.textContent = error.message; return; }
  closeModal();
  showToast('✅ Family added');
  loadFamilies();
}

async function deleteFamily(code) {
  if (!confirm(`Delete family "${code}"? This removes all their members, rooms and travel details.`)) return;
  const { error } = await db.rpc('wd_admin_delete_family', { p_token: adminToken(), p_code: code });
  if (error) { showToast(error.message, 'error'); return; }
  showToast('Family deleted');
  loadFamilies();
}

async function addMemberPrompt(code) {
  const name = prompt('New member name:');
  if (!name || !name.trim()) return;
  const { error } = await db.rpc('wd_admin_add_member', { p_token: adminToken(), p_code: code, p_name: name.trim() });
  if (error) { showToast(error.message, 'error'); return; }
  loadFamilies();
}

async function deleteMember(memberId, code) {
  if (!confirm('Remove this member?')) return;
  const { error } = await db.rpc('wd_admin_delete_member', { p_token: adminToken(), p_member_id: memberId });
  if (error) { showToast(error.message, 'error'); return; }
  loadFamilies();
}

async function saveRoom(memberId) {
  const val = document.getElementById(`room-${memberId}`).value.trim();
  const { error } = await db.rpc('wd_admin_set_room', { p_token: adminToken(), p_member_id: memberId, p_room_no: val });
  if (error) { showToast(error.message, 'error'); return; }
  showToast('✅ Room saved');
}

// ---------- Itinerary ----------
async function renderItineraryTab(container) {
  container.innerHTML = `
    <div class="card">
      <div class="section-header"><h3>Itinerary</h3><button class="btn-primary btn-sm" onclick="openItineraryModal(null)">+ Add Event</button></div>
      <div id="itinerary-admin-list">Loading...</div>
    </div>
  `;
  await loadItineraryAdmin();
}

let adminItineraryCache = [];

async function loadItineraryAdmin() {
  const { data, error } = await db.from('wd_itinerary').select('*').order('sort_order').order('event_date');
  const listEl = document.getElementById('itinerary-admin-list');
  adminItineraryCache = data || [];
  if (error || !data || data.length === 0) { listEl.innerHTML = `<div class="empty-state"><p>No events yet.</p></div>`; return; }
  listEl.innerHTML = data.map(ev => `
    <div class="itinerary-item">
      <div class="section-header">
        <div class="ev-name">${escapeHtml(ev.event_name)}</div>
        <div>
          <button class="btn-secondary btn-sm" onclick="openItineraryModalById('${ev.id}')">Edit</button>
          <button class="btn-danger btn-sm" onclick="deleteItinerary('${ev.id}')">Delete</button>
        </div>
      </div>
      <div class="ev-meta">${ev.event_date ? formatDate(ev.event_date) : ''} ${ev.start_time ? formatTime(ev.start_time) : ''}</div>
      <div class="ev-meta">${escapeHtml(ev.venue || '')}</div>
    </div>
  `).join('');
}

function openItineraryModalById(id) {
  openItineraryModal(adminItineraryCache.find(e => e.id === id));
}

function openItineraryModal(ev) {
  ev = ev || {};
  openModal(`
    <div class="modal-title">${ev.id ? 'Edit' : 'Add'} Event</div>
    <div class="form-group"><label>Event Name</label><input type="text" id="ev-name" value="${escapeHtml(ev.event_name || '')}"></div>
    <div class="form-group"><label>Date</label><input type="date" id="ev-date" value="${ev.event_date || ''}"></div>
    <div class="form-group"><label>Start Time</label><input type="time" id="ev-start" value="${ev.start_time || ''}"></div>
    <div class="form-group"><label>End Time</label><input type="time" id="ev-end" value="${ev.end_time || ''}"></div>
    <div class="form-group"><label>Venue</label><input type="text" id="ev-venue" value="${escapeHtml(ev.venue || '')}"></div>
    <div class="form-group"><label>Menu</label><textarea id="ev-menu" rows="2">${escapeHtml(ev.menu || '')}</textarea></div>
    <div class="form-group"><label>Dress Code</label><input type="text" id="ev-dress" value="${escapeHtml(ev.dress_code || '')}"></div>
    <div class="error-msg" id="ev-error"></div>
    <div class="modal-actions">
      <button class="btn-primary" onclick="saveItinerary('${ev.id || ''}')">Save</button>
      <button class="btn-secondary" onclick="closeModal()">Cancel</button>
    </div>
  `);
}

async function saveItinerary(id) {
  const errEl = document.getElementById('ev-error');
  const { error } = await db.rpc('wd_admin_upsert_itinerary', {
    p_token: adminToken(), p_id: id || null,
    p_event_name: document.getElementById('ev-name').value.trim(),
    p_event_date: document.getElementById('ev-date').value || null,
    p_start_time: document.getElementById('ev-start').value || null,
    p_end_time: document.getElementById('ev-end').value || null,
    p_venue: document.getElementById('ev-venue').value.trim() || null,
    p_menu: document.getElementById('ev-menu').value.trim() || null,
    p_dress_code: document.getElementById('ev-dress').value.trim() || null,
    p_sort_order: 0
  });
  if (error) { errEl.textContent = error.message; return; }
  closeModal();
  showToast('✅ Saved');
  loadItineraryAdmin();
}

async function deleteItinerary(id) {
  if (!confirm('Delete this event?')) return;
  const { error } = await db.rpc('wd_admin_delete_itinerary', { p_token: adminToken(), p_id: id });
  if (error) { showToast(error.message, 'error'); return; }
  loadItineraryAdmin();
}

// ---------- Announcements ----------
async function renderAnnouncementsTab(container) {
  container.innerHTML = `
    <div class="card">
      <div class="card-title">Post an Announcement</div>
      <div class="form-group"><label>Title</label><input type="text" id="an-title"></div>
      <div class="form-group"><label>Message</label><textarea id="an-message" rows="3"></textarea></div>
      <button class="btn-primary" onclick="postAnnouncement()">🔔 Post &amp; Buzz Everyone</button>
      <div class="error-msg" id="an-error"></div>
    </div>
    <div class="card"><div class="card-title">Recent Announcements</div><div id="announcements-admin-list">Loading...</div></div>
  `;
  await loadAnnouncementsAdmin();
}

async function loadAnnouncementsAdmin() {
  const { data, error } = await db.from('wd_announcements').select('*').order('created_at', { ascending: false });
  const listEl = document.getElementById('announcements-admin-list');
  if (error || !data || data.length === 0) { listEl.innerHTML = `<div class="empty-state"><p>No announcements yet.</p></div>`; return; }
  listEl.innerHTML = data.map(a => `
    <div class="announcement-item">
      <div class="an-title">${escapeHtml(a.title)}</div>
      <div>${escapeHtml(a.message)}</div>
      <div class="an-time">${new Date(a.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
    </div>
  `).join('');
}

async function postAnnouncement() {
  const errEl = document.getElementById('an-error');
  errEl.textContent = '';
  const title = document.getElementById('an-title').value.trim();
  const message = document.getElementById('an-message').value.trim();
  if (!title || !message) { errEl.textContent = 'Title and message are required.'; return; }

  const { error } = await db.rpc('wd_admin_post_announcement', { p_token: adminToken(), p_title: title, p_message: message });
  if (error) { errEl.textContent = error.message; return; }

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/wd-send-push`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_token: adminToken(), title, message })
    });
    const result = await res.json();
    showToast(`✅ Posted - buzzed ${result.sent || 0} device(s)`);
  } catch (e) {
    showToast('Posted, but the buzz notification failed to send.', 'error');
  }

  document.getElementById('an-title').value = '';
  document.getElementById('an-message').value = '';
  loadAnnouncementsAdmin();
}

// ---------- Gallery ----------
async function renderGalleryTab(container) {
  container.innerHTML = `<div class="card"><div class="card-title">Gallery Moderation</div><div id="gallery-admin-grid">Loading...</div></div>`;
  await loadGalleryAdmin();
}

async function loadGalleryAdmin() {
  const { data, error } = await db.rpc('wd_admin_list_gallery', { p_token: adminToken() });
  const grid = document.getElementById('gallery-admin-grid');
  if (error) { grid.innerHTML = `<div class="error-msg">${error.message}</div>`; return; }
  if (!data || data.length === 0) { grid.innerHTML = `<div class="empty-state"><p>No photos yet.</p></div>`; return; }
  grid.innerHTML = `<div class="gallery-grid">` + data.map(p => {
    const { data: urlData } = db.storage.from(GALLERY_BUCKET).getPublicUrl(p.storage_path);
    return `<div style="position:relative;">
      <img src="${urlData.publicUrl}" loading="lazy">
      <button class="btn-danger btn-sm" style="position:absolute;top:4px;right:4px;padding:2px 8px;" onclick="deletePhoto('${p.id}')">✕</button>
    </div>`;
  }).join('') + `</div>`;
}

async function deletePhoto(id) {
  if (!confirm('Delete this photo for everyone?')) return;
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/wd-admin-delete-photo`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_token: adminToken(), p_id: id })
    });
    if (!res.ok) throw new Error(await res.text());
    showToast('Photo deleted');
    loadGalleryAdmin();
  } catch (e) {
    showToast('Could not delete photo', 'error');
  }
}

tryAdminAutoLogin();
