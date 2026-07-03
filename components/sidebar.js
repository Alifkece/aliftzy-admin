// ===== SIDEBAR BEHAVIOR =====
import { qs, qsa } from "../utils/dom.js";

const COLLAPSE_KEY = "aliftzy-admin-sidebar-collapsed";

export function initSidebar() {
  const shell = qs("#app-shell");
  const collapseBtn = qs("#btn-collapse-sidebar");
  const mobileBtn = qs("#btn-mobile-sidebar");
  const backdrop = qs("[data-close-mobile-sidebar]");

  if (localStorage.getItem(COLLAPSE_KEY) === "1") {
    shell.classList.add("sidebar-collapsed");
  }

  collapseBtn?.addEventListener("click", () => {
    shell.classList.toggle("sidebar-collapsed");
    localStorage.setItem(COLLAPSE_KEY, shell.classList.contains("sidebar-collapsed") ? "1" : "0");
  });

  mobileBtn?.addEventListener("click", () => shell.classList.add("mobile-open"));
  backdrop?.addEventListener("click", () => shell.classList.remove("mobile-open"));

  qsa(".nav-item").forEach((item) => {
    item.addEventListener("click", () => shell.classList.remove("mobile-open"));
  });
}

export function setActiveNav(route) {
  qsa(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.route === route);
  });
}

export function setOrdersBadge(count) {
  const badge = qs("#nav-badge-orders");
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count > 99 ? "99+" : String(count);
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }
}
