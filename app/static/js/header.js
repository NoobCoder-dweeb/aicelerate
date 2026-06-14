document.addEventListener("DOMContentLoaded", function () {
  // Sidebar toggle
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const sidebar = document.getElementById("sidebar");

  sidebarToggle?.addEventListener("click", function () {
    sidebar?.classList.toggle("-translate-x-full");
  });

  // Logout confirmation popup
  const logoutBtn = document.getElementById("logout-btn");
  const popup = document.getElementById("popup-message");
  const confirmBtn = document.getElementById("popup-confirm");
  const cancelBtn = document.getElementById("popup-close");

  logoutBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    popup?.classList.remove("hidden");
  });

  confirmBtn?.addEventListener("click", () => {
    logoutBtn.closest("form")?.submit();
  });

  cancelBtn?.addEventListener("click", () => {
    popup?.classList.add("hidden");
  });

  popup?.addEventListener("click", (e) => {
    if (e.target === popup) popup.classList.add("hidden");
  });
});
