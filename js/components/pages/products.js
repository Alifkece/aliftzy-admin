// ===== PRODUCTS PAGE =====
import { listProducts, saveProduct, deleteProduct, uploadProductImage } from "../services/productsService.js";
import { openModal, closeModal } from "../components/modal.js";
import { confirmDialog } from "../components/confirmDialog.js";
import { toastSuccess, toastError } from "../components/toast.js";
import { skeletonTableRows } from "../components/skeleton.js";
import { emptyState, errorState } from "../components/state.js";
import { rupiah, escHtml, debounce, genId } from "../utils/format.js";
import { readFileAsDataUrl } from "../utils/dom.js";

let allProducts = [];
let searchTerm = "";
let activeCategory = "all";

export async function render(container) {
  container.innerHTML = `
    <div class="page-header flex-between">
      <div>
        <h1>Produk</h1>
        <p>Kelola katalog produk yang tampil di Store secara realtime.</p>
      </div>
      <button type="button" class="btn btn-primary" id="btn-add-product">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Tambah Produk
      </button>
    </div>

    <section class="section-card">
      <div class="toolbar">
        <div class="field-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="search" id="product-search" placeholder="Cari nama produk...">
        </div>
        <div class="chip-filter" id="category-filter"></div>
      </div>
      <div class="section-card-body">
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr><th>Produk</th><th>Kategori</th><th>Harga</th><th>Badge</th><th></th></tr>
            </thead>
            <tbody id="product-tbody">${skeletonTableRows(5, 6)}</tbody>
          </table>
        </div>
      </div>
    </section>
  `;

  container.querySelector("#btn-add-product").addEventListener("click", () => openProductForm(null));

  const searchInput = container.querySelector("#product-search");
  const prefill = sessionStorage.getItem("admin-global-search");
  if (prefill) {
    searchInput.value = prefill;
    searchTerm = prefill.trim().toLowerCase();
    sessionStorage.removeItem("admin-global-search");
  }
  searchInput.addEventListener(
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
    allProducts = await listProducts();
    renderCategoryChips();
    renderTable();
  } catch (e) {
    console.error(e);
    document.getElementById("product-tbody").innerHTML = `<tr><td colspan="5">${errorState({})}</td></tr>`;
  }
}

function renderCategoryChips() {
  const cats = ["all", ...new Set(allProducts.map((p) => p.category).filter(Boolean))];
  const wrap = document.getElementById("category-filter");
  wrap.innerHTML = cats
    .map((c) => `<button type="button" class="chip ${c === activeCategory ? "active" : ""}" data-cat="${escHtml(c)}">${c === "all" ? "Semua" : escHtml(c)}</button>`)
    .join("");
  wrap.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      activeCategory = chip.dataset.cat;
      renderCategoryChips();
      renderTable();
    });
  });
}

function renderTable() {
  const tbody = document.getElementById("product-tbody");
  let list = allProducts;
  if (activeCategory !== "all") list = list.filter((p) => p.category === activeCategory);
  if (searchTerm) list = list.filter((p) => (p.name || "").toLowerCase().includes(searchTerm));

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="5">${emptyState({
      title: "Produk tidak ditemukan",
      message: "Coba kata kunci lain atau tambahkan produk baru.",
    })}</td></tr>`;
    return;
  }

  tbody.innerHTML = list
    .map(
      (p, i) => `
    <tr class="stagger-item" style="animation-delay:${Math.min(i, 8) * 0.03}s">
      <td>
        <div class="cell-media">
          ${p.img ? `<img src="${escHtml(p.img)}" class="cell-thumb" alt="">` : `<div class="cell-thumb"></div>`}
          <div>
            <div style="font-weight:600;">${escHtml(p.name || "-")}</div>
            <div class="cell-muted">${escHtml((p.desc || "").slice(0, 40))}${(p.desc || "").length > 40 ? "…" : ""}</div>
          </div>
        </div>
      </td>
      <td><span class="badge badge-neutral">${escHtml(p.category || "-")}</span></td>
      <td class="cell-mono">${rupiah(p.price)}</td>
      <td>${p.badge ? `<span class="badge badge-amber">${escHtml(p.badge)}</span>` : `<span class="cell-muted">-</span>`}</td>
      <td>
        <div class="row-actions">
          <button type="button" class="btn btn-ghost btn-icon btn-sm" data-edit="${p.id}" aria-label="Edit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
          </button>
          <button type="button" class="btn btn-danger btn-icon btn-sm" data-delete="${p.id}" aria-label="Hapus">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    </tr>`
    )
    .join("");

  tbody.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => openProductForm(b.dataset.edit)));
  tbody.querySelectorAll("[data-delete]").forEach((b) => b.addEventListener("click", () => handleDelete(b.dataset.delete)));
}

async function handleDelete(id) {
  const p = allProducts.find((x) => x.id === id);
  const ok = await confirmDialog({
    title: "Hapus produk?",
    message: `<strong>${escHtml(p?.name || "")}</strong> akan dihapus permanen dan langsung hilang dari Store. Tindakan ini tidak dapat dibatalkan.`,
  });
  if (!ok) return;
  try {
    await deleteProduct(id);
    toastSuccess("Produk berhasil dihapus.");
    await loadAndRender();
  } catch (e) {
    toastError(e.message || "Gagal menghapus produk.");
  }
}

let pendingImageDataUrl = null;
let editingPackages = [];

function openProductForm(id) {
  const p = id ? allProducts.find((x) => x.id === id) : null;
  pendingImageDataUrl = null;
  editingPackages = Array.isArray(p?.packages) ? JSON.parse(JSON.stringify(p.packages)) : [];

  const bodyHtml = `
    <div class="field">
      <label>Gambar Produk</label>
      <label class="upload-drop" id="upload-drop">
        <img class="thumb" id="upload-preview" src="${p?.img ? escHtml(p.img) : ""}" style="${p?.img ? "" : "display:none;"}">
        <div class="upload-text">
          <strong>Klik untuk unggah gambar</strong>
          <span>PNG/JPG, disarankan rasio 1:1</span>
        </div>
        <input type="file" accept="image/*" id="upload-input" class="hidden">
      </label>
    </div>
    <div class="field-row">
      <div class="field">
        <label for="f-name">Nama Produk</label>
        <input type="text" id="f-name" value="${escHtml(p?.name || "")}" placeholder="Netflix Premium" required>
      </div>
      <div class="field">
        <label for="f-category">Kategori</label>
        <input type="text" id="f-category" value="${escHtml(p?.category || "")}" placeholder="streaming" required>
      </div>
    </div>
    <div class="field-row">
      <div class="field">
        <label for="f-price">Harga (Rp)</label>
        <input type="number" id="f-price" value="${p?.price ?? ""}" placeholder="15000" min="0" required>
      </div>
      <div class="field">
        <label for="f-badge">Badge (opsional)</label>
        <input type="text" id="f-badge" value="${escHtml(p?.badge || "")}" placeholder="POPULER">
      </div>
    </div>
    <div class="field">
      <label for="f-desc">Deskripsi</label>
      <textarea id="f-desc" placeholder="Deskripsi singkat produk...">${escHtml(p?.desc || "")}</textarea>
    </div>
    <div class="field">
      <label for="f-link">Link Order Fallback</label>
      <input type="text" id="f-link" value="${escHtml(p?.link || "https://wa.me/")}" placeholder="https://wa.me/62...">
      <span class="field-hint">Dipakai jika sistem QRIS gagal / sebagai kontak alternatif.</span>
    </div>
    <div class="field">
      <div class="flex-between" style="margin-bottom:8px;">
        <label style="margin:0;">Paket Harga (opsional)</label>
        <button type="button" class="btn btn-ghost btn-sm" id="btn-add-package">+ Tambah Paket</button>
      </div>
      <div id="packages-list"></div>
      <span class="field-hint">Jika diisi, pelanggan akan memilih salah satu paket saat memesan.</span>
    </div>
  `;

  const footHtml = `
    <button type="button" class="btn btn-ghost btn-sm" data-modal-close>Batal</button>
    <button type="button" class="btn btn-primary btn-sm" id="btn-save-product">
      <span id="save-product-label">${p ? "Simpan Perubahan" : "Tambah Produk"}</span>
    </button>
  `;

  const overlay = openModal({
    title: p ? "Edit Produk" : "Tambah Produk",
    subtitle: "Perubahan langsung tersinkron ke Store.",
    bodyHtml,
    footHtml,
    wide: true,
  });

  renderPackagesList(overlay);
  overlay.querySelector("#btn-add-package").addEventListener("click", () => {
    editingPackages.push({ name: "", price: 0 });
    renderPackagesList(overlay);
  });

  const dropzone = overlay.querySelector("#upload-drop");
  const fileInput = overlay.querySelector("#upload-input");
  dropzone.addEventListener("click", (e) => {
    if (e.target.tagName !== "INPUT") fileInput.click();
  });
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;
    pendingImageDataUrl = await readFileAsDataUrl(file);
    const preview = overlay.querySelector("#upload-preview");
    preview.src = pendingImageDataUrl;
    preview.style.display = "block";
  });

  overlay.querySelector("#btn-save-product").addEventListener("click", () => handleSaveProduct(overlay, p));
}

function renderPackagesList(overlay) {
  const wrap = overlay.querySelector("#packages-list");
  if (!editingPackages.length) {
    wrap.innerHTML = `<div class="field-hint" style="padding:8px 0;">Belum ada paket. Produk akan memakai harga utama.</div>`;
    return;
  }
  wrap.innerHTML = editingPackages
    .map(
      (pkg, i) => `
    <div class="field-row" style="margin-bottom:8px;align-items:end;" data-pkg-row="${i}">
      <div class="field" style="margin-bottom:0;">
        <input type="text" data-pkg-name="${i}" placeholder="Nama paket (1 bulan)" value="${escHtml(pkg.name)}">
      </div>
      <div class="field" style="margin-bottom:0;display:flex;gap:8px;">
        <input type="number" data-pkg-price="${i}" placeholder="Harga" value="${pkg.price}" min="0">
        <button type="button" class="btn btn-danger btn-icon btn-sm" data-pkg-remove="${i}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>`
    )
    .join("");

  wrap.querySelectorAll("[data-pkg-name]").forEach((inp) => inp.addEventListener("input", (e) => (editingPackages[+inp.dataset.pkgName].name = e.target.value)));
  wrap.querySelectorAll("[data-pkg-price]").forEach((inp) => inp.addEventListener("input", (e) => (editingPackages[+inp.dataset.pkgPrice].price = Number(e.target.value) || 0)));
  wrap.querySelectorAll("[data-pkg-remove]").forEach((btn) =>
    btn.addEventListener("click", () => {
      editingPackages.splice(+btn.dataset.pkgRemove, 1);
      renderPackagesList(overlay);
    })
  );
}

async function handleSaveProduct(overlay, existing) {
  const btn = overlay.querySelector("#btn-save-product");
  const label = overlay.querySelector("#save-product-label");
  const name = overlay.querySelector("#f-name").value.trim();
  const category = overlay.querySelector("#f-category").value.trim();
  const price = overlay.querySelector("#f-price").value;

  if (!name || !category || price === "") {
    toastError("Nama, kategori, dan harga wajib diisi.");
    return;
  }

  btn.disabled = true;
  label.innerHTML = `<span class="spinner"></span>`;

  try {
    const id = existing?.id || null;
    let img = existing?.img || "";
    if (pendingImageDataUrl) {
      img = await uploadProductImage(id || genId("prod"), pendingImageDataUrl);
    }
    const data = {
      name,
      category,
      price,
      desc: overlay.querySelector("#f-desc").value.trim(),
      badge: overlay.querySelector("#f-badge").value.trim(),
      link: overlay.querySelector("#f-link").value.trim() || "https://wa.me/",
      img,
      packages: editingPackages.filter((pk) => pk.name.trim()),
    };
    await saveProduct(id, data);
    toastSuccess(existing ? "Produk berhasil diperbarui." : "Produk berhasil ditambahkan.");
    closeModal();
    await loadAndRender();
  } catch (e) {
    console.error(e);
    toastError(e.message || "Gagal menyimpan produk.");
    btn.disabled = false;
    label.textContent = existing ? "Simpan Perubahan" : "Tambah Produk";
  }
}
