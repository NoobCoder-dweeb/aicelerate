function toggleDropdown(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.toggle('hidden');
    }
}

// change the arrow when onclick
function toggleDropdown(dropdownId, iconId) {
    const dropdown = document.getElementById(dropdownId);
    const icon = document.getElementById(iconId);

    dropdown.classList.toggle('hidden');

    if (dropdown.classList.contains('hidden')) {
      icon.classList.remove('fa-chevron-down');
      icon.classList.add('fa-chevron-right');
    } else {
      icon.classList.remove('fa-chevron-right');
      icon.classList.add('fa-chevron-down');
    }
  }