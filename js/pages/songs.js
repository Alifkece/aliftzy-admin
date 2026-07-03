// ===== SONGS PAGE =====
import { listSongs, saveSong, deleteSong } from "../services/songsService.js";
import { openModal, closeModal } from "../components/modal.js";
import { confirmDialog } from "../components/confirmDialog.js";
import { toastSuccess, toastError } from "../components/toast.js";
import { skeletonTableRows } from "../components/skeleton.js";
import { emptyState, errorState } from "../components/state.js";
import { escHtml, debounce } from "../utils/format.js";

let allSongs = [];
let searchTerm = "";

export async function render(container) {
  container.innerHTML = `
    <div class="page-header flex-between">
      <div>
        <h1>Songs</h1>
        <p>Playlist yang diputar di music player Store.</p>
      </div>
      <button type="button" class="btn btn-primary" id="btn-add-song">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Tambah Lagu
      </button>
    </div>
    <section class="section-card">
      <div class="toolbar">
        <div class="field-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="search" id="song-search" placeholder="Cari judul / artis...">
        </div>
      </div>
      <div class="section-card-body">
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Judul</th><th>Artis</th><th>URL</th><th></th></tr></thead>
            <tbody id="song-tbody">${skeletonTableRows(3, 5)}</tbody>
          </table>
        </div>
      </div>
    </section>
  `;

  container.querySelector("#btn-add-song").addEventListener("click", () => openSongForm(null));
  container.querySelector("#song-search").addEventListener(
    "input",
    debounce((e) => {
      searchTerm = e.target.value.trim().toLowerCase();
      renderTable();
    }, 200)
  );

  await loadAndRender();
}

async function loadAndRender() {
  try {
    allSongs = await listSongs();
    renderTable();
  } catch (e) {
    console.error(e);
    document.getElementById("song-tbody").innerHTML = `<tr><td colspan="4">${errorState({})}</td></tr>`;
  }
}

function renderTable() {
  const tbody = document.getElementById("song-tbody");
  let list = allSongs;
  if (searchTerm) list = list.filter((s) => `${s.title} ${s.artist}`.toLowerCase().includes(searchTerm));

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="4">${emptyState({ title: "Belum ada lagu", message: "Tambahkan lagu agar muncul di music player Store." })}</td></tr>`;
    return;
  }

  tbody.innerHTML = list
    .map(
      (s, i) => `
    <tr class="stagger-item" style="animation-delay:${Math.min(i, 8) * 0.03}s">
      <td style="font-weight:600;">${escHtml(s.title || "-")}</td>
      <td class="cell-muted">${escHtml(s.artist || "-")}</td>
      <td class="cell-mono cell-muted" style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(s.url || "-")}</td>
      <td>
        <div class="row-actions">
          <button type="button" class="btn btn-ghost btn-icon btn-sm" data-edit="${s.id}" aria-label="Edit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
          </button>
          <button type="button" class="btn btn-danger btn-icon btn-sm" data-delete="${s.id}" aria-label="Hapus">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    </tr>`
    )
    .join("");

  tbody.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => openSongForm(b.dataset.edit)));
  tbody.querySelectorAll("[data-delete]").forEach((b) => b.addEventListener("click", () => handleDelete(b.dataset.delete)));
}

async function handleDelete(id) {
  const ok = await confirmDialog({ title: "Hapus lagu?", message: "Lagu ini akan dihapus dari playlist Store." });
  if (!ok) return;
  try {
    await deleteSong(id);
    toastSuccess("Lagu berhasil dihapus.");
    await loadAndRender();
  } catch (e) {
    toastError(e.message || "Gagal menghapus lagu.");
  }
}

function openSongForm(id) {
  const s = id ? allSongs.find((x) => x.id === id) : null;
  const bodyHtml = `
    <div class="field">
      <label for="sf-title">Judul Lagu</label>
      <input type="text" id="sf-title" value="${escHtml(s?.title || "")}" placeholder="Nama lagu" required>
    </div>
    <div class="field">
      <label for="sf-artist">Artis</label>
      <input type="text" id="sf-artist" value="${escHtml(s?.artist || "")}" placeholder="Nama artis">
    </div>
    <div class="field">
      <label for="sf-url">URL Audio (mp3)</label>
      <input type="url" id="sf-url" value="${escHtml(s?.url || "")}" placeholder="https://.../lagu.mp3" required>
    </div>
  `;
  const footHtml = `
    <button type="button" class="btn btn-ghost btn-sm" data-modal-close>Batal</button>
    <button type="button" class="btn btn-primary btn-sm" id="btn-save-song"><span id="save-song-label">${s ? "Simpan" : "Tambah"}</span></button>
  `;
  const overlay = openModal({ title: s ? "Edit Lagu" : "Tambah Lagu", bodyHtml, footHtml });

  overlay.querySelector("#btn-save-song").addEventListener("click", async () => {
    const title = overlay.querySelector("#sf-title").value.trim();
    const url = overlay.querySelector("#sf-url").value.trim();
    if (!title || !url) { toastError("Judul dan URL wajib diisi."); return; }
    const btn = overlay.querySelector("#btn-save-song");
    const label = overlay.querySelector("#save-song-label");
    btn.disabled = true;
    label.innerHTML = `<span class="spinner"></span>`;
    try {
      await saveSong(s?.id || null, { title, artist: overlay.querySelector("#sf-artist").value.trim(), url });
      toastSuccess(s ? "Lagu berhasil diperbarui." : "Lagu berhasil ditambahkan.");
      closeModal();
      await loadAndRender();
    } catch (e) {
      toastError(e.message || "Gagal menyimpan lagu.");
      btn.disabled = false;
      label.textContent = s ? "Simpan" : "Tambah";
    }
  });
}
