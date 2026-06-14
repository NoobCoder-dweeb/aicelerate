// Color options for tags
const colors = {
  blue:   { label: "Blue", hex: "#165DFF" },
  green:  { label: "Green", hex: "#36D399" },
  yellow: { label: "Yellow", hex: "#FFD633" },
  red:    { label: "Red", hex: "#FF6B35" },
  purple: { label: "Purple", hex: "#A855F7" },
  brown:  { label: "Brown", hex: "#8B5E3C" },
  teal:   { label: "Teal", hex: "#14B8A6" },
  orange: { label: "Orange", hex: "#FB923C" },
  gray:   { label: "Gray", hex: "#9CA3AF" },
};

// Render color dropdowns for tag creation and edit popout
function renderColorOptions() {
  ["tag-color", "popout-tag-color"].forEach(selectId => {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = "";
    Object.entries(colors).forEach(([value, { label, hex }]) => {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = `● ${label}`;
      opt.style.color = hex;
      opt.setAttribute("data-hex", hex);
      select.appendChild(opt);
    });
    if (select.options.length) select.style.color = select.options[0].getAttribute("data-hex");
  });
}

// Handle select all/deselect all and bulk delete
function setupSelectAllButton() {
  const selectAllBtn = document.getElementById('select-all');
  const bulkDeleteBtn = document.getElementById('bulk-delete');
  let isSelecting = false;
  selectAllBtn.addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('.tag-checkbox');
    isSelecting = !isSelecting;
    checkboxes.forEach(cb => {
      cb.classList.toggle('hidden', !isSelecting);
      cb.checked = isSelecting;
    });
    bulkDeleteBtn.classList.toggle('hidden', !isSelecting);
    bulkDeleteBtn.disabled = !isSelecting;
    selectAllBtn.textContent = isSelecting ? 'Deselect All' : 'Select All';
  });
  bulkDeleteBtn.addEventListener('click', async () => {
    const checked = [...document.querySelectorAll('.tag-checkbox:checked')];
    if (!checked.length) {  
      document.getElementById("popup-text-tag").textContent = "No tags selected to delete.";
      document.getElementById("popup-confirm-tag").textContent = "OK";
      document.getElementById("popup-close-tag").classList.add("hidden");
      document.getElementById("popup-message-tag").classList.remove("hidden");

      document.getElementById("popup-confirm-tag").onclick = () => {
        document.getElementById("popup-message-tag").classList.add("hidden");
        document.getElementById("popup-close-tag").classList.remove("hidden"); 
      };
      return;
    }
    document.getElementById("popup-text-tag").textContent = `Delete ${checked.length} selected tag${checked.length > 1 ? 's' : ''}?`;
    document.getElementById("popup-confirm-tag").textContent = "Yes, delete";
    document.getElementById("popup-close-tag").classList.remove("hidden");
    document.getElementById("popup-message-tag").classList.remove("hidden");

    document.getElementById("popup-confirm-tag").onclick = async () => {
      document.getElementById("popup-message-tag").classList.add("hidden");
        const taggingType = window.TAGGING_TYPE;
        for (const cb of checked) {
          await fetch('/delete_tag', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ tag_id: cb.getAttribute('data-id'), tagging_type: taggingType })
          });
        }
        location.reload();
      };
    document.getElementById("popup-close-tag").onclick = () => {
      document.getElementById("popup-message-tag").classList.add("hidden");
    };
  });
}

// Create new tag
async function addTag() {
  const tagName = document.getElementById('new-tag').value.trim();
  const taggingType = window.TAGGING_TYPE;
  let colorKey = null, department = null, subject_level = null;

  const existingTags = document.querySelectorAll('.tag-badge');
  for (const tag of existingTags) {
    if (tag.textContent.trim().toLowerCase() === tagName.toLowerCase()) {
      const popup = document.getElementById("popup-message-tag");
      document.getElementById("popup-text-tag").textContent = `Tag "  ${tagName}  " already exists.`;
      document.getElementById("popup-confirm-tag").textContent = "OK";
      document.getElementById("popup-close-tag").classList.add("hidden");
      popup.classList.remove("hidden");

      document.getElementById("popup-confirm-tag").onclick = () => {
        popup.classList.add("hidden");
        document.getElementById("popup-close-tag").classList.remove("hidden");
      };
      return;
    }
  }

  // Only get color or department if the input exists in DOM
  const colorInput = document.getElementById('tag-color');
  if (colorInput) colorKey = colorInput.value;

  const deptInput = document.getElementById('department');
  if (deptInput) department = deptInput.value;

  const subjectInput = document.getElementById('subject-level');
  if (subjectInput) subject_level = subjectInput.value;

  // Validation: tagName and taggingType are always required
  const errortag = document.getElementById('tag-error');                                                          //-----NEWLY MODIFIED------

  if (!tagName || !taggingType) {
    errortag.textContent = "Please enter a tag name.";
    errortag.classList.remove("hidden");
  return;
  }                                                                                                               //-----NEWLY MODIFIED------

  const englishOnlyRegex = /^[A-Za-z\s\-\!\@\#\$\%\^\&\*\(\)\_\+\=\:\;\,\.\?\>\<\/\\]+$/;                         //-----NEWLY ADDED---------
  if (!englishOnlyRegex.test(tagName)) {
    errortag.textContent = "Only English letters and  special characters are allowed. eg： ! @ # $ % ^ & * ( ) _ + = : ; , . ? > < / \ ";
    errortag.classList.remove("hidden");
    return;
  }


  // For department tagging, color is required; for programme, department is required
  if (taggingType === "tagging_department" && !colorKey) {
    errortag.textContent = "Please select a color.";
    errortag.classList.remove("hidden");
    return;
  }                                                                                                               //-----NEWLY MODIFIED------
  if (taggingType === "tagging_programme" && !department) {
    errortag.textContent = "Please select a department.";
    errortag.classList.remove("hidden");
    return;
  }                                                                                                               //-----NEWLY MODIFIED------
  if (taggingType === "tagging_programme" && !subject_level) {
    errortag.textContent = "Please select a subject.";
    errortag.classList.remove("hidden");
    return;
  }

  // Prepare payload
  const payload = { name: tagName, tagging_type: taggingType };
  if (taggingType === "tagging_programme") {
    payload.department = department;
    payload.subject_level = subject_level;
  } else {
    if (colorKey) payload.color = colorKey;
  }

  const res = await fetch('/add_tag', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload)
  });
  const result = await res.json();
  result.success ? location.reload() : alert("Error: " + result.error);
}

// Edit tag (update in DB)
async function updateTag() {
  const popout = document.getElementById('tag-edit-popout');
  const oldTagId = popout.getAttribute('data-editing-id');
  const newName = document.getElementById('popout-tag-name').value.trim();
  const taggingType = window.TAGGING_TYPE;

  let newColor = null, department = null, subject_level = null;
  // Only get color or department if the input exists in DOM
  const colorInput = document.getElementById('popout-tag-color');
  if (colorInput && colorInput.offsetParent !== null) newColor = colorInput.value;

  const deptInput = document.getElementById('popout-department');
  if (deptInput) department = deptInput.value;

  // Get subject_level from hidden input if present
  const origInput = document.getElementById('popout-original-subject-level');
  if (origInput) subject_level = origInput.value;

  if (!oldTagId || !newName || !taggingType) {
    const popup = document.getElementById("popup-message");
    document.getElementById("popup-text").textContent = "All fields are required.";
    popup.classList.remove("hidden");

    const closePopup = () => popup.classList.add("hidden");
    document.getElementById("popup-confirm").onclick = closePopup;
    document.getElementById("popup-close").onclick = closePopup;

    return;
  }

  // Prepare payload
  const payload = { old_tag_id: oldTagId, name: newName, tagging_type: taggingType };
  if (taggingType === "tagging_programme") {
    payload.department = department;
    // Always send subject_level, even if unchanged
    payload.subject_level = subject_level;
  } else if (newColor) {
    payload.color = newColor;
  }

  await fetch('/update_tag', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload)
  });
  location.reload();
}

// DOM ready: setup all handlers
document.addEventListener("DOMContentLoaded", () => {
  renderColorOptions();

  // Color select styling
  ["tag-color", "popout-tag-color"].forEach(id => {
    const sel = document.getElementById(id);
    if (sel) sel.addEventListener("change", () => {
      const opt = sel.options[sel.selectedIndex];
      sel.style.color = opt.getAttribute("data-hex") || "#000000";
    });
  });

  // Popup message close
  const popup = document.getElementById('popup-message');
  const popupClose = document.getElementById('popup-close');
  if (popup && popupClose) {
    popup.addEventListener('click', e => {
      // Close if clicking on the overlay OR the OK button
      if (e.target === popup || e.target === popupClose) {
        popup.classList.add('hidden');
      }
    });
  }

  // Attach addTag to Create Tag button
  const createBtn = document.getElementById('create-tag');
  if (createBtn) {
    createBtn.addEventListener('click', addTag);
  }

  // Hide the error when typing into #new-tag                                                                      //-----NEWLY ADDED------         
  const tagInput = document.getElementById('new-tag');
  if (tagInput) {
    tagInput.addEventListener('input', () => {
      const error = document.getElementById('tag-error');
      if (error) error.classList.add('hidden');
    });
  }


  // Attach edit and delete handlers for each tag
  document.querySelectorAll('.edit-tag-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const tagId = this.getAttribute('data-tag-id');
      const tagCard = this.closest('.tag-card');
      const tagName = tagCard.querySelector('.tag-badge').textContent.trim();
      const tagColor = tagCard.querySelector('.tag-badge').className.match(/tag-badge-([a-z]+)/)?.[1] || 'blue';

      // Fill popout fields
      const popout = document.getElementById('tag-edit-popout');
      document.getElementById('popout-tag-name').value = tagName;
      document.getElementById('popout-tag-color').value = tagColor;

      // Set department if programme tagging (keep disabled)
      const deptSelect = document.getElementById('popout-department');
      if (deptSelect) {
        let tagDepartment = null;
        if (tagCard.dataset && tagCard.dataset.department) {
          tagDepartment = tagCard.dataset.department;
        } else if (window.tags && Array.isArray(window.tags)) {
          const tagObj = window.tags.find(t => t.id === tagId);
          if (tagObj && tagObj.department) tagDepartment = tagObj.department;
        } else {
          tagDepartment = tagCard.getAttribute('data-department');
        }
        if (tagDepartment) {
          deptSelect.value = tagDepartment;
        }
        // keep disabled, do not enable
        deptSelect.disabled = true;
      }

      // Store original subject-level in hidden input if present
      const origInput = document.getElementById('popout-original-subject-level');
      if (origInput) {
        let tagSubjectLevel = null;
        // Use data-subject_level (HTML attribute is always lowercase with dashes)
        if (tagCard.dataset && tagCard.dataset.subject_level !== undefined) {
          tagSubjectLevel = tagCard.dataset.subject_level;
        } else if (window.tags && Array.isArray(window.tags)) {
          const tagObj = window.tags.find(t => t.id === tagId);
          if (tagObj && tagObj.subject_level) tagSubjectLevel = tagObj.subject_level;
        }
        origInput.value = tagSubjectLevel || '';
      }

      // Set the select text color to match the selected color
      const popoutColorSelect = document.getElementById('popout-tag-color');
      const selectedOption = popoutColorSelect.querySelector(`option[value="${tagColor}"]`);
      if (selectedOption) {
        popoutColorSelect.style.color = selectedOption.getAttribute("data-hex") || "#000000";
      } else {
        popoutColorSelect.style.color = "#165DFF"; // fallback to blue
      }

      popout.classList.remove('hidden');
      document.getElementById('tag-edit-overlay').classList.remove('hidden');

      popout.setAttribute('data-editing-id', tagId);
    });
  });

  document.querySelectorAll('.delete-tag-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const tagId = this.getAttribute('data-tag-id');
      const deletePopout = document.getElementById('delete-popout');
      deletePopout.classList.remove('hidden');
      deletePopout.setAttribute('data-deleting-id', tagId);
    });
  });

  // Save button in edit popout
  const saveBtn = document.getElementById('save-popout');
  if (saveBtn) {
    saveBtn.addEventListener('click', updateTag);
  }

  // Cancel button in edit popout
  const cancelBtn = document.getElementById('cancel-popout');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      document.getElementById('tag-edit-popout').classList.add('hidden');
      document.getElementById('tag-edit-overlay').classList.add('hidden');
    });
  }

  // Click outside edit popout to close
  document.addEventListener('mousedown', function (e) {
    const popout = document.getElementById('tag-edit-popout');
    const overlay = document.getElementById('tag-edit-overlay');
    if (!popout.classList.contains('hidden') && !popout.contains(e.target) && !e.target.classList.contains('edit-tag-btn')) {
      popout.classList.add('hidden');
      overlay.classList.add('hidden');
    }
  });

  // Confirm delete button in delete popout
  const confirmDeleteBtn = document.getElementById('confirm-delete');
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async function () {
      const deletePopout = document.getElementById('delete-popout');
      const tagId = deletePopout.getAttribute('data-deleting-id');
      const taggingType = window.TAGGING_TYPE;
      if (!tagId || !taggingType) return;
      await fetch('/delete_tag', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ tag_id: tagId, tagging_type: taggingType })
      });
      location.reload();
    });
  }

  // Cancel delete button in delete popout
  const cancelDeleteBtn = document.getElementById('cancel-delete');
  if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener('click', () => {
      document.getElementById('delete-popout').classList.add('hidden');
    });
  }

  setupSelectAllButton();
});


