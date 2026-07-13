// ===========================================================
// Unified QR Platform — Frontend logic
// Talks to the same-origin Express API. Token stored in
// localStorage so the session survives refreshes.
// ===========================================================

const API = "/api";
const state = {
  token: localStorage.getItem("uqp_token") || null,
  user: null,
  qrCodes: [],
};

// Minimal inline SVG icons (16x16, stroke-based) used on QR card actions.
const ICONS = {
  copy: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:3px"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  download: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:3px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  edit: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:3px"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>',
  delete: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:3px"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
};

// ---------- DOM refs ----------
const authScreen = document.getElementById("authScreen");
const dashboardScreen = document.getElementById("dashboardScreen");
const toastEl = document.getElementById("toast");

// ---------- Helpers ----------
function showToast(message, isError = false) {
  toastEl.textContent = message;
  toastEl.classList.toggle("error", isError);
  toastEl.classList.remove("hidden");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toastEl.classList.add("hidden"), 3200);
}

async function api(path, options = {}) {
  const res = await fetch(API + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Something went wrong");
  return data;
}

function setSession(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem("uqp_token", token);
}

function clearSession() {
  state.token = null;
  state.user = null;
  localStorage.removeItem("uqp_token");
}

// ---------- Auth tab switching ----------
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".auth-form").forEach((f) => f.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab === "signin" ? "signinForm" : "signupForm").classList.add("active");
  });
});

// ---------- Sign in ----------
document.getElementById("signinForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById("signinError");
  errorEl.textContent = "";
  const fd = new FormData(e.target);
  try {
    const data = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: fd.get("email"), password: fd.get("password") }),
    });
    setSession(data.token, data);
    await enterDashboard();
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

// ---------- Sign up ----------
document.getElementById("signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById("signupError");
  errorEl.textContent = "";
  const fd = new FormData(e.target);
  try {
    const data = await api("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: fd.get("name"),
        email: fd.get("email"),
        password: fd.get("password"),
      }),
    });
    setSession(data.token, data);
    await enterDashboard();
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

// ---------- Logout ----------
document.getElementById("logoutBtn").addEventListener("click", () => {
  clearSession();
  dashboardScreen.classList.add("hidden");
  authScreen.classList.remove("hidden");
});

// ---------- Enter dashboard ----------
async function enterDashboard() {
  authScreen.classList.add("hidden");
  dashboardScreen.classList.remove("hidden");
  const displayName = state.user?.name || state.user?.email || "";
  document.getElementById("userChip").textContent = displayName;
  document.getElementById("avatarCircle").textContent = displayName.charAt(0).toUpperCase() || "•";
  await loadQrCodes();
}

async function loadQrCodes() {
  try {
    state.qrCodes = await api("/qr");
    renderGrid();
  } catch (err) {
    showToast(err.message, true);
  }
}

function renderGrid() {
  const grid = document.getElementById("qrGrid");
  const empty = document.getElementById("emptyState");
  const count = document.getElementById("qrCount");

  count.textContent = `${state.qrCodes.length} code${state.qrCodes.length === 1 ? "" : "s"} generated`;

  if (state.qrCodes.length === 0) {
    grid.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  grid.innerHTML = state.qrCodes
    .map((qr) => {
      const shortUrl = qr.type === "dynamic" ? `${location.origin}/r/${qr.shortId}` : null;
      return `
      <div class="qr-card" data-id="${qr._id}">
        <img src="${qr.qrImage}" alt="${escapeHtml(qr.title)} QR code" />
        <div class="qr-card-body">
          <div class="qr-card-top">
            <span class="qr-card-title">${escapeHtml(qr.title)}</span>
            <span class="badge ${qr.type}">${qr.type}</span>
          </div>
          <p class="qr-card-dest">${escapeHtml(qr.destination)}</p>
          <p class="qr-card-stats"><strong>${qr.scanCount}</strong> scan${qr.scanCount === 1 ? "" : "s"}</p>
          <div class="qr-card-actions">
            ${shortUrl ? `<button class="icon-btn" data-action="copy" data-url="${shortUrl}">${ICONS.copy} Copy link</button>` : ""}
            <button class="icon-btn" data-action="download" data-img="${qr.qrImage}" data-name="${escapeHtml(qr.title)}">${ICONS.download} PNG</button>
            <button class="icon-btn" data-action="edit" data-id="${qr._id}">${ICONS.edit} Edit</button>
            <button class="icon-btn danger" data-action="delete" data-id="${qr._id}">${ICONS.delete} Delete</button>
          </div>
        </div>
      </div>`;
    })
    .join("");
}

function escapeHtml(str = "") {
  return str.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---------- Grid actions (event delegation) ----------
document.getElementById("qrGrid").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;

  if (action === "copy") {
    navigator.clipboard.writeText(btn.dataset.url).then(() => showToast("Short URL copied"));
  }
  if (action === "download") {
    const a = document.createElement("a");
    a.href = btn.dataset.img;
    a.download = `${btn.dataset.name || "qr-code"}.png`;
    a.click();
  }
  if (action === "edit") openEditModal(btn.dataset.id);
  if (action === "delete") openDeleteModal(btn.dataset.id);
});

// ---------- New QR panel ----------
const newQrPanel = document.getElementById("newQrPanel");
document.getElementById("newQrBtn").addEventListener("click", () => {
  newQrPanel.classList.toggle("hidden");
});
document.getElementById("cancelNewQr").addEventListener("click", () => {
  newQrPanel.classList.add("hidden");
  document.getElementById("newQrForm").reset();
  resetLivePreview();
});

function resetLivePreview() {
  document.getElementById("livePreviewImg").classList.add("hidden");
  document.getElementById("livePreviewPlaceholder").classList.remove("hidden");
}

document.getElementById("newQrForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById("newQrError");
  errorEl.textContent = "";
  const fd = new FormData(e.target);
  const type = fd.get("type");
  const payload = {
    title: fd.get("title"),
    destination: fd.get("destination"),
    customization: {
      foregroundColor: fd.get("foregroundColor"),
      backgroundColor: fd.get("backgroundColor"),
    },
  };
  try {
    const qr = await api(`/qr/${type}`, { method: "POST", body: JSON.stringify(payload) });
    state.qrCodes.unshift(qr);
    renderGrid();
    showToast("QR code generated");
    e.target.reset();
    newQrPanel.classList.add("hidden");
    resetLivePreview();
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

// Live preview: re-generate a throwaway static QR as the user types
// (debounced) purely for visual feedback — not saved until submit.
let previewDebounce;
document.getElementById("newQrForm").addEventListener("input", () => {
  clearTimeout(previewDebounce);
  previewDebounce = setTimeout(updateLivePreview, 450);
});

async function updateLivePreview() {
  const form = document.getElementById("newQrForm");
  const destination = form.destination.value.trim();
  if (!destination) return resetLivePreview();
  try {
    const fg = form.foregroundColor.value.replace("#", "");
    const bg = form.backgroundColor.value.replace("#", "");
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
      destination
    )}&color=${fg}&bgcolor=${bg}`;
    const img = document.getElementById("livePreviewImg");
    img.src = url;
    img.classList.remove("hidden");
    document.getElementById("livePreviewPlaceholder").classList.add("hidden");
  } catch {
    resetLivePreview();
  }
}

// ---------- Edit modal ----------
const editModal = document.getElementById("editModalBackdrop");
function openEditModal(id) {
  const qr = state.qrCodes.find((q) => q._id === id);
  if (!qr) return;
  const form = document.getElementById("editForm");
  form.id.value = qr._id;
  form.title.value = qr.title;
  form.destination.value = qr.destination;
  document.getElementById("editStaticNote").textContent =
    qr.type === "static"
      ? "This is a static code — updating the destination regenerates the QR image."
      : "This is a dynamic code — the QR image stays the same; only where it redirects changes.";
  editModal.classList.remove("hidden");
}
document.getElementById("cancelEdit").addEventListener("click", () => editModal.classList.add("hidden"));

document.getElementById("editForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById("editError");
  errorEl.textContent = "";
  const fd = new FormData(e.target);
  const id = fd.get("id");
  try {
    const updated = await api(`/qr/${id}`, {
      method: "PUT",
      body: JSON.stringify({ title: fd.get("title"), destination: fd.get("destination") }),
    });
    const idx = state.qrCodes.findIndex((q) => q._id === id);
    state.qrCodes[idx] = updated;
    renderGrid();
    editModal.classList.add("hidden");
    showToast("Changes saved");
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

// ---------- Delete modal ----------
const deleteModal = document.getElementById("deleteModalBackdrop");
let pendingDeleteId = null;
function openDeleteModal(id) {
  pendingDeleteId = id;
  deleteModal.classList.remove("hidden");
}
document.getElementById("cancelDelete").addEventListener("click", () => {
  pendingDeleteId = null;
  deleteModal.classList.add("hidden");
});
document.getElementById("confirmDelete").addEventListener("click", async () => {
  if (!pendingDeleteId) return;
  try {
    await api(`/qr/${pendingDeleteId}`, { method: "DELETE" });
    state.qrCodes = state.qrCodes.filter((q) => q._id !== pendingDeleteId);
    renderGrid();
    showToast("QR code deleted");
  } catch (err) {
    showToast(err.message, true);
  } finally {
    pendingDeleteId = null;
    deleteModal.classList.add("hidden");
  }
});

// ---------- Boot ----------
(async function init() {
  if (state.token) {
    try {
      state.user = await api("/auth/me");
      await enterDashboard();
      return;
    } catch {
      clearSession();
    }
  }
  authScreen.classList.remove("hidden");
})();
