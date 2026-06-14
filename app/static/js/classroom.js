// Utility: show/hide modal
function showModal(id) { document.getElementById(id).classList.remove('hidden'); }
function hideModal(id) { document.getElementById(id).classList.add('hidden'); }

// Sidebar toggle
document.getElementById('sidebar-toggle').onclick = () => {
    document.getElementById('sidebar').classList.toggle('-translate-x-full');
};

// Add Classroom Modal
const addBtn = document.getElementById('add-classroom-btn');
const addModal = 'add-classroom-modal';
addBtn.onclick = () => showModal(addModal);

['close-add-classroom', 'cancel-add-classroom'].forEach(id => {
    document.getElementById(id).onclick = () => { hideModal(addModal); resetForm(); };
});
function resetForm() {
    document.getElementById('add-classroom-form')?.reset?.();
    ['classroom-id-error', 'classroom-name-error', 'capacity-null-error'].forEach(e => {
        document.getElementById(e)?.classList.add('hidden');
    });
}

// Add Classroom
document.getElementById('add-classroom-save-btn').onclick = async function () {
    const classroomId = document.getElementById('classroom-id').value.trim();
    const name = document.getElementById('classroom-name').value.trim();
    const department = document.getElementById('department').value;
    const capacity = document.getElementById('capacity').value;
    const description = document.getElementById('description').value.trim();

    let valid = true;

    ['classroom-id-error', 'classroom-name-error', 'capacity-null-error'].forEach(id =>document.getElementById(id).classList.add('hidden'));

    if (!classroomId) {document.getElementById('classroom-id-error').classList.remove('hidden');valid = false;}
    if (!name) {document.getElementById('classroom-name-error').classList.remove('hidden');valid = false;}
    if (!department) { document.getElementById('classroom-department-error')?.classList.remove('hidden');valid = false;}
    if (!capacity || isNaN(capacity) || Number(capacity) <= 0) {document.getElementById('capacity-null-error').classList.remove('hidden');valid = false;}

    if (!valid) return showPopupMessageClassroom("All fields are required.", false, true);

    const payload = {classroomId,name,department,capacity: parseInt(capacity),description: description || null};
    try {
        const res = await fetch('/add_classroom', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
        const result = await res.json();
        if (result.success) { showPopupMessageClassroom('Classroom added successfully!',true); location.reload(); }
        else showPopupMessageClassroom("Error: " + (result.error || "Unknown error"));
    } catch (err) { showPopupMessageClassroom("Error: " + err.message); }
};

// Edit Classroom Modal logic
window.editClassroom = function(id) {
    showModal('edit-classroom-modal');
    document.getElementById('edit-classroom-title').textContent = 'Edit Classroom';
    const row = document.querySelector(`tr[data-id="${id}"]`);
    if (!row) return hideModal('edit-classroom-modal'), showPopupMessageClassroom('Classroom not found',false, true);
    const cells = row.querySelectorAll('td');
    document.getElementById('edit-classroom-id').value = id;
    document.getElementById('edit-classroom-name').value = cells[2].textContent.trim();
    document.getElementById('edit-department').value = cells[3].textContent.trim();
    document.getElementById('edit-capacity').value = cells[4].textContent.trim();
    document.getElementById('edit-description').value = cells[5].textContent.trim();
};
['close-edit-classroom', 'cancel-edit-classroom'].forEach(id => {
    document.getElementById(id).onclick = () => hideModal('edit-classroom-modal');
});

// Save Edit Classroom
document.getElementById('edit-classroom-save-btn').onclick = async function () {
    const id = document.getElementById('edit-classroom-id').value;
    const name = document.getElementById('edit-classroom-name').value;
    const department = document.getElementById('edit-department').value;
    const capacity = parseInt(document.getElementById('edit-capacity').value, 10);
    const description = document.getElementById('edit-description').value || null;

    ['edit-classroom-name-error', 'edit-department-error', 'edit-capacity-error'].forEach(id =>document.getElementById(id)?.classList.add('hidden'));
    let valid = true;
    if (!name) {document.getElementById('edit-classroom-name-error')?.classList.remove('hidden');valid = false;}
    if (!department) {document.getElementById('edit-department-error')?.classList.remove('hidden');valid = false;}
    if (!capacity || isNaN(capacity) || Number(capacity) <= 0) {document.getElementById('edit-capacity-error')?.classList.remove('hidden');valid = false;}

    if (!valid) return showPopupMessageClassroom('Please fill in all required fields.', false, true);

    const btn = this;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Saving...'; btn.disabled = true;
    try {
        const res = await fetch('/edit_classroom', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, name, department, capacity, description }) });
        const result = await res.json();
        if (result.name) {
            hideModal('edit-classroom-modal');
            const row = document.querySelector(`tr[data-id="${id}"]`);
            if (row) {
                row.querySelector('td:nth-child(3)').textContent = result.name;
                row.querySelector('td:nth-child(4)').textContent = result.department;
                row.querySelector('td:nth-child(5)').textContent = result.capacity;
                row.querySelector('td:nth-child(6)').textContent = result.description || '';
            }
            showPopupMessageClassroom('Classroom updated successfully',true);
        } else showPopupMessageClassroom("Error: " + (result.error || "Unknown error"));
    } catch (err) { showPopupMessageClassroom("Error: " + err.message); }
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
    if (ext !== '.csv') return showPopupMessageClassroom('Please upload a CSV file only.',false,true), false;
    if (file.size > 5 * 1024 * 1024) return showPopupMessageClassroom('File size exceeds 5MB limit.',false,true), false;
    return true;
}
document.getElementById('upload-file-btn').onclick = async () => {
    if (!fileInput.files.length) return showPopupMessageClassroom('Please select a file first.',false, true);
    const file = fileInput.files[0], formData = new FormData();
    formData.append('file', file);
    const btn = document.getElementById('upload-file-btn');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Uploading...'; btn.disabled = true;
    
    try {
        const response = await fetch('/upload/classrooms', { method: 'POST', body: formData });
        const result = await response.json();
        
        if (result.success) {
            let message = result.message;
            if (result.errors && result.errors.length > 0) {
                message += '\n\nErrors encountered:\n' + result.errors.join('\n');
            }
            showPopupMessageClassroom(message, true);
            hideModal('upload-csv-modal');
            removeFile();
            // Reload page to show new classrooms
            setTimeout(() => location.reload(), 2000);
        } else {
            showPopupMessageClassroom('Upload failed: ' + (result.error || 'Unknown error'), false, true);
        }
    } catch (error) {
        showPopupMessageClassroom('Upload failed: ' + error.message, false, true);
    } finally {
        btn.innerHTML = '<i class="fa-solid fa-upload mr-2"></i>Upload CSV & Import'; 
        btn.disabled = false;
    }
};

// Bulk actions and row actions
document.addEventListener('DOMContentLoaded', function() {
    const checkboxes = document.querySelectorAll('.classroom-checkbox');
    const selectAll = document.getElementById('classroom-select-all');
    const bulkBar = document.getElementById('classroom-bulk-actions');
    const selectedCount = document.getElementById('classroom-selected-count');
    const bulkDeleteBtn = document.getElementById('classroom-bulk-delete-btn');
    function updateUI() {
        const checked = document.querySelectorAll('.classroom-checkbox:checked').length;
        bulkBar.classList.toggle('hidden', checked === 0);
        selectedCount.textContent = checked;
        document.querySelectorAll('.row-actions').forEach(row => {
            const cb = row.closest('tr').querySelector('.classroom-checkbox');
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
        selectAll.checked = document.querySelectorAll('.classroom-checkbox:checked').length === checkboxes.length;
        updateUI();
    });
    bulkDeleteBtn.onclick = async function() {
        const ids = Array.from(document.querySelectorAll('.classroom-checkbox:checked')).map(cb => cb.value);
        if (!ids.length) return;
        const confirmed = await showPopupMessageClassroom(`Are you sure you want to delete ${ids.length} selected classrooms?`,false,true,  true  );
        if (!confirmed) return;
        let success = 0;
        for (const id of ids) {
            try {
                const res = await fetch('/delete_classroom', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ classroom_id: id }) });
                const result = await res.json();
                if (result.success) { document.querySelector(`tr[data-id="${id}"]`)?.remove(); success++; }
            } catch {}
        }
        selectAll.checked = false; updateUI();
        showPopupMessageClassroom(`Deleted ${success} classroom(s) successfully!`,true);
    };
    updateUI();
});

// Delete classroom (single)
window.showDeleteClassroomModal = function(classroomId) {
    window.classroomIdToDelete = classroomId;
    showModal('delete-classroom-modal');
};
document.getElementById('cancel-delete-classroom').onclick = function () {
    window.classroomIdToDelete = null;
    hideModal('delete-classroom-modal');
};
document.getElementById('confirm-delete-classroom').onclick = async function () {
    const id = window.classroomIdToDelete;
    if (!id) return;
    try {
        const res = await fetch('/delete_classroom', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ classroom_id: id }) });
        const result = await res.json();
        if (result.success) { document.querySelector(`tr[data-id="${id}"]`)?.remove(); showPopupMessageClassroom('Classroom deleted successfully!',true); }
        else showPopupMessageClassroom("Error: " + (result.error || "Unknown error"));
    } catch (err) { showPopupMessageClassroom("Error: " + err.message); }
    window.classroomIdToDelete = null;
    hideModal('delete-classroom-modal');
};


// ---------------------------------------------- universal showpopup function -----------------------------------------------------------
function showPopupMessageClassroom(message, isSuccess = false, OKBtn = false, CancelBtn = false) {
  return new Promise((resolve) => {
    const popup = document.getElementById('popup-message-classroom');
    const text = document.getElementById('popup-text-classroom');
    const confirmBtn = document.getElementById('popup-confirm-classroom');
    const closeBtn = document.getElementById('popup-close-classroom');

    text.textContent = message;

    // Show/hide buttons
    confirmBtn.classList.toggle('hidden', !OKBtn);
    closeBtn.classList.toggle('hidden', !CancelBtn);

    // Reset click events
    confirmBtn.onclick = () => {
      popup.classList.add('hidden');
      resolve(true);  // user clicked OK
    };
    closeBtn.onclick = () => {
      popup.classList.add('hidden');
      resolve(false); // user clicked Cancel
    };

    popup.classList.remove('hidden');

    if (isSuccess) {
      setTimeout(() => {
        popup.classList.add('hidden');
        resolve(true);
      }, 2000);
    }
  });
}
