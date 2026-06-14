function showPopup(message, title = "Notification", success = false) {
    document.getElementById("popupTitle").innerText = title;
    document.getElementById("popupMessage").innerText = message;

    const btn = document.getElementById("popupBtn");
    // Reset classes
    btn.className = "px-6 py-2 text-white rounded transition";

    if (success) {
      btn.classList.add("bg-green-500", "hover:bg-green-600");
    } else {
      btn.classList.add("bg-red-500", "hover:bg-red-600");
    }

    document.getElementById("popupModal").classList.remove("hidden");
  }

  function closePopup() {
    document.getElementById("popupModal").classList.add("hidden");
  }

  document.getElementById("password-form").addEventListener("submit", async function (event) {
    event.preventDefault();

    const currentPassword = document.getElementById("current_password").value;
    const newPassword = document.getElementById("new_password").value;
    const confirmPassword = document.getElementById("confirm_password").value;

    if (!currentPassword || !newPassword || !confirmPassword) {
      showPopup("All fields are required.", "Validation Error", false);
      return;
    }

    if (currentPassword === newPassword) {
      showPopup("New password cannot be the same as the current password.", "Validation Error", false);
      return;
    }

    if (newPassword !== confirmPassword) {
      showPopup("New password and confirm password do not match.", "Validation Error", false);
      return;
    }

    const response = await fetch(UPDATE_PASSWORD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword
      })
    });

    const result = await response.json();

    if (result.success) {
      showPopup(result.message, "Success", true);
      document.getElementById("password-form").reset();
    } else {
      showPopup(result.message, "Error", false);
    }
  });