# Aliftzy Admin

Dashboard Admin terpisah untuk **Aliftzy Store**, dibangun sebagai referensi
terhadap repository `Aliftzy-Store` yang dikirim (tidak ada satu baris pun
di repository Store yang diubah).

---

## 1. Ringkasan Arsitektur

- **Jenis aplikasi**: situs statis (tanpa build step/bundler) — HTML + CSS +
  JavaScript ES Modules, persis pola yang sudah dipakai `Aliftzy-Store`
  (import Firebase langsung dari CDN `gstatic.com`). Ini dipilih supaya
  Admin bisa di-deploy ke Vercel/Firebase Hosting/Netlify tanpa Node build
  step, dan agar tetap konsisten dengan gaya teknis repo Store.
- **Struktur folder**:
  ```
  Aliftzy-Admin/
    index.html                 # shell: login screen + app shell + router outlet
    firestore.rules            # referensi security rules (deploy manual)
    package.json
    css/
      tokens.css                # design tokens (warna, tipografi, radius, motion)
      base.css                  # reset & tipografi dasar
      layout.css                 # sidebar, topbar, shell, auth screen
      components.css             # tombol, card, tabel, modal, toast, form, badge
      animations.css             # transisi halaman, stagger, reduced-motion
      pages.css                  # layout khusus per halaman
    js/
      firebase-config.js         # SAMA PERSIS dengan project Firebase Store
      router.js                  # hash router ringan (#/dashboard, #/products, ...)
      app.js                     # entry point: auth flow + wiring shell
      utils/                     # format.js, dom.js
      services/                  # 1 file = 1 collection Firestore
        authService.js
        productsService.js
        stockService.js
        ordersService.js
        songsService.js
        announcementsService.js
        settingsService.js
        statsService.js
      components/                # UI reusable: sidebar, topbar, modal,
                                  # confirmDialog, toast, skeleton, state (empty/error)
      pages/                     # 1 file = 1 halaman dashboard
        dashboard.js, products.js, stock.js, orders.js,
        songs.js, announcements.js, settings.js, profile.js
  ```
- **Pola arsitektur**: setiap Firestore collection punya satu `service`
  (lapisan akses data), setiap halaman punya satu `page` module yang
  memanggil service tsb dan merender UI ke `<main id="page-content">` lewat
  router. Komponen UI (modal, toast, dsb) dipisah agar dipakai ulang di
  semua halaman — tidak ada duplikasi markup modal/toast.
- **Autentikasi & otorisasi Admin**: login memakai Firebase Authentication
  (project sama dengan Store). Status admin di rules Anda ditentukan oleh
  **email** (`request.auth.token.email == "aliftzy@my.id"`), bukan
  collection terpisah. Supaya frontend tidak menduplikasi hardcode email
  ini (dan berpotensi tidak sinkron kalau rules berubah), `authService.
  checkIsAdmin()` memverifikasi status admin dengan **mencoba membaca**
  `settings/adminConfig` — dokumen yang rules-nya sudah mensyaratkan
  `isAdmin()`. Kalau request diizinkan, berarti Firestore sendiri sudah
  mengonfirmasi user tsb admin. Jika ditolak (`permission-denied`), sesi
  langsung di-sign-out dan pengguna ditolak masuk ke Dashboard.

---

## 2. Bagaimana Admin Terhubung ke Store (Firebase/Firestore)

Admin dan Store menunjuk ke **project Firebase yang benar-benar sama**
(`aliftzy-store`), dengan `firebase-config.js` yang identik. Karena
keduanya membaca/menulis Firestore yang sama secara langsung (tanpa API
perantara), setiap perubahan dari Admin **langsung** terlihat di Store
begitu Store melakukan fetch berikutnya (refresh / navigasi halaman) —
tanpa deploy ulang, tanpa sinkronisasi manual.

Collection yang dipakai bersama (diverifikasi langsung dari kode
`Aliftzy-Store/js/app.js` dan `api/webhook.js`):

| Collection | Dibaca Store dari | Field yang dipakai Store | Ditulis Admin dari |
|---|---|---|---|
| `products` | `loadProducts()` | `name, category, price, desc, badge, img, link, packages[]` | `productsService.js` |
| `songs` | `loadSongs()` | `title, artist, url` | `songsService.js` |
| `stock` | `loadStockPublic()` | `productId, sold` (untuk badge "x/y tersedia") | `stockService.js` |
| `announcements` | `loadAnnouncements()` | `title, msg, type, active, createdAt` (angka epoch, bukan Timestamp — lihat catatan) | `announcementsService.js` |
| `settings/store` | `loadStoreProfile()` | `avatarUrl` | `settingsService.js` |
| `orders` | `loadMyOrders()` (milik user sendiri) | `productName, price, status, createdAt, deliveredEmail, deliveredPassword, deliveredLoginUrl, deliveredNote` | `ordersService.js` (update saja, order dibuat backend pembayaran) |

**Field tambahan yang dibuat Admin** (tidak mengubah field yang sudah
dipakai Store, hanya menambah):
- `stock`: `label, email, password, note, assignedOrderId, createdAt` —
  seluruhnya di dokumen `stock/{id}` yang sama (flat, tanpa subcollection),
  karena Firestore Rules production sudah mengunci seluruh collection ini
  `allow read/write: if isAdmin()`. Store tetap hanya membaca `productId`
  & `sold`; field lain diabaikan dengan aman.
- `settings/store`: `storeName, whatsapp, description` — disiapkan untuk
  kebutuhan Admin/pembaruan Store berikutnya; Store versi yang dikirim
  mengabaikannya secara aman.
- `orders`: `deliveredAt, statusUpdatedAt` — metadata proses, tidak
  memengaruhi field yang dibaca Store.

**Tidak ada collection atau subcollection baru** yang dibuat. Status
admin memakai mekanisme email yang sudah ada di rules Anda
(`request.auth.token.email == "aliftzy@my.id"`) — lihat bagian
Autentikasi di bawah.

**Catatan kompatibilitas penting**: `announcements.createdAt` di Store
diurutkan dengan `(b.createdAt||0) - (a.createdAt||0)` — operasi
pengurangan angka biasa. Karena itu `announcementsService.js` sengaja
menyimpan `createdAt` sebagai **epoch milliseconds** (`Date.now()`),
BUKAN Firestore `Timestamp`, supaya sorting di Store tidak rusak.

**Catatan faktual (bukan permintaan perubahan)**: dengan rules production
saat ini, `stock` hanya bisa dibaca akun admin. `Aliftzy-Store/js/app.js`
punya `loadStockPublic()` yang dipanggil semua user login untuk badge
"x/y tersedia" — pemanggilan itu akan mendapat `permission-denied` untuk
user non-admin. Ini adalah konsekuensi dari rules yang sudah Anda
tetapkan sebagai acuan utama, sehingga repository Admin ini mengikutinya
apa adanya tanpa mengusulkan perubahan rules maupun struktur database,
sesuai instruksi Anda.

---

## 3. Daftar Fitur

**Dashboard**
- Statistik: Total Produk, Total Order, Pending Order, Paid Order, Total
  Stok, Stok Tersedia, Total User (didekati dari `userId` unik di
  `orders`, karena Store tidak punya collection `users`), Penghasilan
  (dijumlahkan dari order berstatus PAID/DELIVERED)
- Order terbaru (10 terakhir) & grafik distribusi status order
- Skeleton loading saat data dimuat, error state jika Firestore gagal

**Produk** — CRUD penuh: nama, kategori, harga, deskripsi, badge, link
fallback WhatsApp, upload gambar (Firebase Storage), editor multi-paket
harga (opsional). Search realtime + filter kategori.

**Stock** — CRUD akun per produk (email, password, catatan), tandai
tersedia/terjual, search + filter produk + filter status.

**Orders** — daftar semua order, search (produk/ID transaksi/user),
filter status, detail order lengkap, ubah status manual, proses
pengiriman akun (isi otomatis dari Stock yang tersedia atau manual),
otomatis menandai stok terpakai sebagai terjual.

**Songs** — CRUD judul, artis, URL audio untuk playlist Store.

**Announcements** — CRUD judul, pesan, tipe (info/peringatan/update/
penting), status aktif/nonaktif.

**Settings** — kelola profil toko (`settings/store`): avatar/video
(upload atau URL langsung), nama toko, WhatsApp, deskripsi. Halaman
menjelaskan secara eksplisit field mana yang benar-benar dipakai Store
saat ini.

**Profile** — info akun Admin yang login, ubah kata sandi, logout.

**Pengalaman pengguna** (sesuai brief):
Sidebar animasi + collapsible + responsive drawer di mobile, smooth page
transition, skeleton loading, toast notification, modal dengan animasi
buka/tutup, hover & card animation, empty state & error state khusus di
setiap tabel, confirmation dialog sebelum aksi hapus/kirim akun, search
realtime + filter chip di setiap halaman data, tema dark glassmorphism
dengan aksen indigo/amber ("Signal Room" — lihat `css/tokens.css`).

---

## 4. Sebelum Dipakai di Production

1. **Login admin**: gunakan akun Firebase Authentication dengan email
   persis `aliftzy@my.id` (sesuai `isAdmin()` di rules production Anda).
   Tidak perlu setup collection/subcollection tambahan apa pun.
2. Rules **tidak perlu diubah atau di-deploy ulang** — repository Admin
   ini dibangun mengikuti rules yang Anda kirim apa adanya
   (`firestore.rules` di root repo hanya salinan referensi/dokumentasi).
3. Pastikan **Firebase Storage** aktif di project (dipakai untuk upload
   gambar produk & avatar toko — di luar cakupan Firestore Rules di atas).
4. Jalankan lokal tanpa build step: buka `index.html` lewat static server
   apa pun, mis. `npx serve .` atau `python3 -m http.server`.

## Audit yang Sudah Dilakukan

- Seluruh file JavaScript lolos `node --check` (parse ES module valid,
  tidak ada Syntax Error).
- Semua `id` yang dipanggil `getElementById`/`querySelector("#...")` oleh
  shell (`app.js`, `sidebar.js`, `topbar.js`, `router.js`) diverifikasi
  ada di `index.html`.
- Semua `id` yang dipakai tiap `page` module diverifikasi didefinisikan
  di template halaman itu sendiri (tidak ada referensi ke elemen yang
  belum dirender).
- CSS diverifikasi seimbang kurung kurawal di seluruh file `css/*.css`.
- Tidak ada perubahan pada file di dalam `Aliftzy-Store/` yang dikirim.
