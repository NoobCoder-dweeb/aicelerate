// theme.js - universal dark mode handler

document.addEventListener("DOMContentLoaded", () => {
  const isDark = localStorage.getItem("theme") === "dark";

  if (isDark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }

  // Optional: also sync toggle if it exists on page
  const darkToggle = document.getElementById("dark_mode");
  if (darkToggle) {
    darkToggle.checked = isDark;

    darkToggle.addEventListener("change", function () {
      if (this.checked) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      }
    });
  }
});
