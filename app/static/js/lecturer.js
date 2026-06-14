// Utility: show/hide modal
function showModal(id) { document.getElementById(id).classList.remove('hidden'); }
function hideModal(id) { document.getElementById(id).classList.add('hidden'); }

// Sidebar toggle
document.getElementById('sidebar-toggle').onclick = () => {
    document.getElementById('sidebar').classList.toggle('-translate-x-full');
};

// Add Lecturer Modal
const addBtn = document.getElementById('add-lecturer-btn');
const addModal = 'add-lecturer-modal';
addBtn.onclick = () => showModal(addModal);

['close-add-lecturer', 'cancel-add-lecturer'].forEach(id => {
    document.getElementById(id).onclick = () => { hideModal(addModal); resetForm(); };
});
function resetForm() {
    // If using a form element, reset it; otherwise, clear fields manually
    document.getElementById('lecturer-staff-id').value = '';
    document.getElementById('lecturer-name').value = '';
    document.getElementById('lecturer-department').selectedIndex = 0;
    document.getElementById('lecturer-position').selectedIndex = 0;
    document.getElementById('lecturer-description').value = '';
    ['lecturer-staff-id-error', 'lecturer-name-error', 'lecturer-department-error'].forEach(e => {
        document.getElementById(e)?.classList.add('hidden');
    });
}

// Add Lecturer
document.getElementById('add-lecturer-save-btn').onclick = async function () {
    const staff_id = document.getElementById('lecturer-staff-id').value.trim();
    const name = document.getElementById('lecturer-name').value.trim();
    const department = document.getElementById('lecturer-department').value;
    const position = document.getElementById('lecturer-position').value;
    const description = document.getElementById('lecturer-description').value.trim();
    // Validation
    let valid = true;
    if (!staff_id) { document.getElementById('lecturer-staff-id-error').classList.remove('hidden'); valid = false; }
    if (!name) { document.getElementById('lecturer-name-error').classList.remove('hidden'); valid = false; }
    if (!department) { document.getElementById('lecturer-department-error').classList.remove('hidden'); valid = false; }
    if (!position) { 
        let err = document.getElementById('lecturer-position-error');
        if (!err) {
            err = document.createElement('div');
            err.id = 'lecturer-position-error';
            err.className = 'error-message text-red-500 text-sm mt-1';
            err.textContent = '*required';                                                                               
            document.getElementById('lecturer-position').parentNode.appendChild(err);
        }
        err.classList.remove('hidden');
        valid = false;
    } else {
        const err = document.getElementById('lecturer-position-error');
        if (err) err.classList.add('hidden');
    }
    if (!valid) return;
    const lecturerId = staff_id; // Use staff_id as unique id
    const payload = { lecturerId, staff_id, name, department, position, description: description || null };
    try {
        const res = await fetch('/add_lecturer', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
        const result = await res.json();
        if (result.success) { lecturershowPopup('Lecturer added successfully!', { onlyOk: true }); location.reload(); }
        else lecturershowPopup("Error: " + (result.error || "Unknown error"), { onlyOk: true });
    } catch (err) { lecturershowPopup("Error: " + (result.error || "Unknown error"), { onlyOk: true }); }
};

// Edit Lecturer Modal logic
window.editLecturer = function(id) {
    showModal('edit-lecturer-modal');
    const row = document.querySelector(`tr[data-id="${id}"]`);
    if (!row) return hideModal('edit-lecturer-modal'),  lecturershowPopup('Lecturer not found', { onlyOk: true });
    const cells = row.querySelectorAll('td');
    document.getElementById('edit-lecturer-id').value = id;
    document.getElementById('edit-lecturer-staff-id').value = cells[1].textContent.trim();
    document.getElementById('edit-lecturer-staff-id').readOnly = true;
    document.getElementById('edit-lecturer-name').value = cells[2].textContent.trim();
    document.getElementById('edit-lecturer-department').value = cells[3].textContent.trim();
    document.getElementById('edit-lecturer-position').value = cells[4].textContent.trim();
    document.getElementById('edit-lecturer-description').value = cells[5].textContent.trim();
};
['close-edit-lecturer', 'cancel-edit-lecturer'].forEach(id => {
    document.getElementById(id).onclick = () => hideModal('edit-lecturer-modal');
});

// Save Edit Lecturer
document.getElementById('edit-lecturer-save-btn').onclick = async function () {
    // Use staff_id as the document id
    const staff_id = document.getElementById('edit-lecturer-staff-id').value.trim();
    const name = document.getElementById('edit-lecturer-name').value.trim();
    const department = document.getElementById('edit-lecturer-department').value;
    const position = document.getElementById('edit-lecturer-position').value;
    const description = document.getElementById('edit-lecturer-description').value.trim();
    // Validation
    let valid = true;
    if (!staff_id) valid = false;
    if (!name) { document.getElementById('edit-lecturer-name-error').classList.remove('hidden'); valid = false; }
    if (!department) { document.getElementById('edit-lecturer-department-error').classList.remove('hidden'); valid = false; }
    if (!position) {
        let err = document.getElementById('edit-lecturer-position-error');
        if (!err) {
            err = document.createElement('div');
            err.id = 'edit-lecturer-position-error';
            err.className = 'error-message text-red-500 text-sm mt-1';
            err.textContent = 'Position is required';
            document.getElementById('edit-lecturer-position').parentNode.appendChild(err);
        }
        err.classList.remove('hidden');
        valid = false;
    } else {
        const err = document.getElementById('edit-lecturer-position-error');
        if (err) err.classList.add('hidden');
    }
    if (!valid) return;
    const btn = this;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Saving...'; btn.disabled = true;
    try {
        // Send staff_id as the document id
        const res = await fetch('/edit_lecturer', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ staff_id, name, department, position, description })
        });
        const result = await res.json();
        if (result.success) {
            hideModal('edit-lecturer-modal');
            const row = document.querySelector(`tr[data-id="${staff_id}"]`);
            if (row) {
                row.querySelector('td:nth-child(3)').textContent = name;
                row.querySelector('td:nth-child(4)').textContent = department;
                row.querySelector('td:nth-child(5)').textContent = position;
                row.querySelector('td:nth-child(6)').textContent = description || '';
            }
            lecturershowPopup('Lecturer updated successfully', { onlyOk: true });
        } else lecturershowPopup("Error: " + (result.error || "Unknown error"), { onlyOk: true });
    } catch (err) { lecturershowPopup("Error: " + (result.error || "Unknown error"), { onlyOk: true }); }
    btn.innerHTML = 'Save Changes'; btn.disabled = false;
};

// Upload CSV Modal
document.getElementById('upload-csv-btn').onclick = () => showModal('upload-csv-modal');
['close-upload-csv', 'cancel-upload-csv'].forEach(id => {
    document.getElementById(id).onclick = () => { hideModal('upload-csv-modal'); removeFile(); };
});
const fileInput = document.getElementById('file-input');
document.getElementById('browse-files-btn').onclick = () => fileInput.click();
fileInput.onchange = () => fileInput.files.length && displayFileInfo(fileInput.files[0]);
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(e => {
    document.getElementById('drop-area').addEventListener(e, ev => { ev.preventDefault(); ev.stopPropagation(); });
});
['dragenter', 'dragover'].forEach(e => {
    document.getElementById('drop-area').addEventListener(e, () => document.getElementById('drop-area').classList.add('border-primary'));
});
['dragleave', 'drop'].forEach(e => {
    document.getElementById('drop-area').addEventListener(e, () => document.getElementById('drop-area').classList.remove('border-primary'));
});
document.getElementById('drop-area').addEventListener('drop', e => {
    const file = e.dataTransfer.files[0];
    if (file && isValidFile(file)) { fileInput.files = e.dataTransfer.files; displayFileInfo(file); }
});
function displayFileInfo(file) {
    document.getElementById('file-name').textContent = file.name;
    document.getElementById('file-info').classList.remove('hidden');
}
function removeFile() {
    fileInput.value = '';
    document.getElementById('file-info').classList.add('hidden');
}
document.getElementById('remove-file').onclick = removeFile;
function isValidFile(file) {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (ext !== '.csv') return lecturershowPopup('Please upload a CSV file only.', { onlyOk: true }), false;
    if (file.size > 5 * 1024 * 1024) return lecturershowPopup('File size exceeds 5MB limit.', { onlyOk: true }), false;
    return true;
}
document.getElementById('upload-file-btn').onclick = async () => {
    if (!fileInput.files.length) return lecturershowPopup('Please select a file first.', { onlyOk: true });
    const file = fileInput.files[0], formData = new FormData();
    formData.append('file', file);
    const btn = document.getElementById('upload-file-btn');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Uploading...'; btn.disabled = true;
    
    try {
        const response = await fetch('/upload/lecturers', { method: 'POST', body: formData });
        const result = await response.json();
        
        if (result.success) {
            let message = result.message;
            if (result.errors && result.errors.length > 0) {
                message += '\n\nErrors encountered:\n' + result.errors.join('\n');
            }
            lecturershowPopup(message, { onlyOk: true });
            hideModal('upload-csv-modal');
            removeFile();
            // Reload page to show new lecturers
            setTimeout(() => location.reload(), 2000);
        } else {
            lecturershowPopup('Upload failed: ' + (result.error || 'Unknown error'), { onlyOk: true });
        }
    } catch (error) {
        lecturershowPopup('Upload failed: ' + error.message, { onlyOk: true });
    } finally {
        btn.innerHTML = '<i class="fa-solid fa-upload mr-2"></i>Upload CSV & Import'; 
        btn.disabled = false;
    }
};

// Bulk actions and row actions
document.addEventListener('DOMContentLoaded', function() {
    const checkboxes = document.querySelectorAll('.lecturer-checkbox');
    const selectAll = document.getElementById('lecturer-select-all');
    const bulkBar = document.getElementById('lecturer-bulk-actions');
    const selectedCount = document.getElementById('lecturer-selected-count');
    const bulkDeleteBtn = document.getElementById('lecturer-bulk-delete-btn');
    function updateUI() {
        const checked = document.querySelectorAll('.lecturer-checkbox:checked').length;
        bulkBar.classList.toggle('hidden', checked === 0);
        selectedCount.textContent = checked;
        document.querySelectorAll('.row-actions').forEach(row => {
            const cb = row.closest('tr').querySelector('.lecturer-checkbox');
            const showEdit = checked <= 1;
            row.querySelector('.edit-btn').style.display = showEdit ? 'inline-block' : 'none';
            row.querySelector('.delete-btn').style.display = 'inline-block';
        });
    }
    selectAll.onchange = function() {
        checkboxes.forEach(cb => cb.checked = this.checked);
        updateUI();
    };
    checkboxes.forEach(cb => cb.onchange = function() {
        selectAll.checked = document.querySelectorAll('.lecturer-checkbox:checked').length === checkboxes.length;
        updateUI();
    });
    bulkDeleteBtn.onclick = async function() {
        const ids = Array.from(document.querySelectorAll('.lecturer-checkbox:checked')).map(cb => cb.value);
        if (!ids.length) return;
        const confirmed = await lecturershowPopup(`Are you sure you want to delete ${ids.length} selected lecturers?`, { onlyOk: false });
        if (!confirmed) return;
        let success = 0;
        for (const id of ids) {
            try {
                const res = await fetch('/delete_lecturer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lecturer_id: id }) });
                const result = await res.json();
                if (result.success) { document.querySelector(`tr[data-id="${id}"]`)?.remove(); success++; }
            } catch {}
        }
        selectAll.checked = false; updateUI();
        lecturershowPopup(`Deleted ${success} lecturer(s) successfully!`, { onlyOk: true });

    };
    updateUI();
});

// Delete lecturer (single)
window.showDeleteLecturerModal = function(lecturerId) {
    window.lecturerIdToDelete = lecturerId;
    showModal('delete-lecturer-modal');
};
document.getElementById('cancel-delete-lecturer').onclick = function () {
    window.lecturerIdToDelete = null;
    hideModal('delete-lecturer-modal');
};
document.getElementById('confirm-delete-lecturer').onclick = async function () {
    const id = window.lecturerIdToDelete;
    if (!id) return;
    try {
        const res = await fetch('/delete_lecturer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lecturer_id: id }) });
        const result = await res.json();
        if (result.success) { document.querySelector(`tr[data-id="${id}"]`)?.remove(); lecturershowPopup('Lecturer deleted successfully!', { onlyOk: true }); }
        else lecturershowPopup("Error: " + (result.error || "Unknown error"), { onlyOk: true });
    } catch (err) { lecturershowPopup("Error: " + (result.error || "Unknown error"), { onlyOk: true }); }
    window.lecturerIdToDelete = null;
    hideModal('delete-lecturer-modal');
};


// Message Box Popup
function lecturershowPopup(message, options = {}) {
    return new Promise((resolve) => {
        const popup = document.getElementById('lec-popup-message');
        const popupText = document.getElementById('lec-popup-text');
        const confirmBtn = document.getElementById('lec-popup-confirm');
        const closeBtn = document.getElementById('lec-popup-close');

        popupText.textContent = message;
        popup.classList.remove('hidden');

        const closePopup = () => {
            popup.classList.add('hidden');
            confirmBtn.removeEventListener('click', onConfirm);
            closeBtn.removeEventListener('click', onCancel);
        };

        const onConfirm = () => {
            closePopup();
            resolve(true); 
        };

        const onCancel = () => {
            closePopup();
            resolve(false); 
        };

        // Reset event listeners
        const newConfirmBtn = confirmBtn.cloneNode(true);
        const newCloseBtn = closeBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);

        newConfirmBtn.addEventListener('click', onConfirm);
        newCloseBtn.addEventListener('click', onCancel);

        if (options.onlyOk) {
            newCloseBtn.classList.add('hidden');
            newConfirmBtn.classList.remove('hidden');
            
            // Only auto-hide for success messages (when it's a success operation)
            // Check if the message indicates success
            const isSuccessMessage = message.toLowerCase().includes('success') || 
                                   message.toLowerCase().includes('added') || 
                                   message.toLowerCase().includes('updated') || 
                                   message.toLowerCase().includes('deleted');
            
            if (isSuccessMessage) {
                setTimeout(() => {
                    popup.classList.add('hidden');
                    resolve(true);
                }, 2000);
            }
        } else {
            newCloseBtn.classList.remove('hidden');
            newConfirmBtn.classList.remove('hidden');
        }
    });
}
