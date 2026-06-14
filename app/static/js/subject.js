// DOM Elements
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.getElementById('sidebar');
const addSubjectBtn = document.getElementById('add-subject-btn');
const addSubjectModal = document.getElementById('add-subject-modal');
const uploadCsvModal = document.getElementById('upload-csv-modal');
const successNotification = document.getElementById('success-notification');
const notificationMessage = document.getElementById('notification-message');

// Initialize data from HTML data attributes
const bodyElement = document.body;
window.programmesByDepartment = JSON.parse(bodyElement.dataset.programmes || '{}');
window.allDepartments = JSON.parse(bodyElement.dataset.departments || '[]').map(dept => ({
    id: dept.id,
    name: dept.name || dept.id
}));
window.classroomsByDepartment = JSON.parse(bodyElement.dataset.classrooms || '{}');
window.lecturersByDepartment = JSON.parse(bodyElement.dataset.lecturers || '{}');

// Toggle Sidebar
sidebarToggle.addEventListener('click', function() {
    sidebar.classList.toggle('-translate-x-full');
});
        

// ---------------------------------------------- universal showpopup function -----------------------------------------------------------
function showPopupMessageSubject(message, isSuccess = false, onConfirm = null) {
    return new Promise((resolve) => {
        const popup = document.getElementById('popup-message-subject');
        const text = document.getElementById('popup-text-subject');
        const confirmBtn = document.getElementById('popup-confirm-subject');
        const cancelBtn = document.getElementById('popup-close-subject');

        text.textContent = message;

        // Show/hide buttons - for success messages, hide both buttons (auto-close)
        // For error messages, show only OK button
        // For confirmation messages, show both OK and Cancel
        if (isSuccess) {
            confirmBtn.classList.add('hidden');
            cancelBtn.classList.add('hidden');
        } else if (typeof onConfirm === 'function') {
            // Confirmation dialog - show both buttons
            confirmBtn.classList.remove('hidden');
            cancelBtn.classList.remove('hidden');
        } else {
            // Error message - show only OK button
            confirmBtn.classList.remove('hidden');
            cancelBtn.classList.add('hidden');
        }

        // Reset click events
        const newConfirmBtn = confirmBtn.cloneNode(true);
        const newCancelBtn = cancelBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

        newConfirmBtn.onclick = () => {
            popup.classList.add('hidden');
            resolve(true);
            if (typeof onConfirm === 'function') onConfirm();
        };

        newCancelBtn.onclick = () => {
            popup.classList.add('hidden');
            resolve(false);
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



document.getElementById('popup-close-subject').onclick =
document.getElementById('popup-confirm-subject').onclick = function () {
    document.getElementById('popup-message-subject').classList.add('hidden');
};

// -----------------------------------------------Add Subject Modal------------------------------------------------------------
addSubjectBtn.onclick = function () {
    addSubjectModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
};
function resetForm() {
    document.getElementById('add-subject-form').reset();
    ['subject-code-error', 'subject-name-error', 'department-error', 'level-error', 'lecturer-error', 'duration-error','classroom-error'].forEach(e => {
        document.getElementById(e)?.classList.add('hidden');
    });
    // Always disable department, programme, classroom, and lecturer selects on reset
    const departmentSelect = document.getElementById('department');
    const programmeSelect = document.getElementById('programme');
    const classroomSelect = document.getElementById('classroom');
    const lecturerSelect = document.getElementById('lecturer');
    
    if (departmentSelect) {
        departmentSelect.disabled = true;
        departmentSelect.innerHTML = `<option value="" disabled selected>Select department</option>`;
    }
    if (programmeSelect) {
        programmeSelect.disabled = true;
        programmeSelect.innerHTML = `<option value="" disabled selected>Select programme</option>`;
    }
    if (classroomSelect) {
        classroomSelect.disabled = true;
        classroomSelect.innerHTML = `<option value="" disabled selected>Select classroom</option>`;
    }
    if (lecturerSelect) {
        lecturerSelect.innerHTML = `<option value="" disabled selected>Select lecturer</option>`;
    }
}
['cancel-add-subject', 'close-subject-modal'].forEach(id => {
    document.getElementById(id).onclick = function () {
        addSubjectModal.classList.add('hidden');
        resetForm();
        document.body.style.overflow = '';
    };
});

// --- Programme dropdown logic (moved from HTML to JS) ---

// Add Subject Modal: department change
document.getElementById('department').addEventListener('change', function () {
    const departmentId = this.value;
    const levelId = document.getElementById('level').value;
    const programmeSelect = document.getElementById('programme');
    const classroomSelect = document.getElementById('classroom');
    const lecturerSelect = document.getElementById('lecturer');
    
    programmeSelect.innerHTML = `<option value="" disabled selected>Select programme</option>`;
    programmeSelect.disabled = true;
    
    // Enable and filter classrooms when department is selected
    if (departmentId) {
        classroomSelect.disabled = false;
        classroomSelect.innerHTML = `<option value="" disabled selected>Select classroom</option>`;
        classroomSelect.innerHTML += `<option value="Random">Random Classroom</option>`;
        
        // Show classrooms for selected department
        if (window.classroomsByDepartment) {
            const deptClassrooms = window.classroomsByDepartment[departmentId] || [];
            deptClassrooms.forEach(classroom => {
                const option = document.createElement("option");
                option.value = classroom.id;  // Use classroom ID as value
                option.textContent = classroom.id;  // Display classroom ID instead of name
                classroomSelect.appendChild(option);
            });
        }

        // Filter and show lecturers for selected department
        lecturerSelect.innerHTML = `<option value="" disabled selected>Select lecturer</option>`;
        if (window.lecturersByDepartment) {
            const deptLecturers = window.lecturersByDepartment[departmentId] || [];
            deptLecturers.forEach(lecturer => {
                const option = document.createElement("option");
                option.value = lecturer.name;
                option.textContent = lecturer.name;
                lecturerSelect.appendChild(option);
            });
        }
    } else {
        // Reset and disable classroom when no department is selected
        classroomSelect.innerHTML = `<option value="" disabled selected>Select classroom</option>`;
        classroomSelect.disabled = true;
        
        // Reset lecturer dropdown
        lecturerSelect.innerHTML = `<option value="" disabled selected>Select lecturer</option>`;
    }
    
    // Handle programme filtering for specific departments with level
    if (departmentId && levelId && window.programmesByDepartment) {
        const programmes = window.programmesByDepartment[departmentId] || [];
        const levelText = document.getElementById('level').selectedOptions[0]?.textContent;
        
        const filteredProgrammes = programmes.filter(programme => 
            programme.subject_level === levelText || programme.subject_level === levelId
        );
        
        if (filteredProgrammes.length === 0) {
            const option = document.createElement("option");
            option.value = "";
            option.textContent = "No programmes available for " + levelText;
            option.disabled = true;
            programmeSelect.appendChild(option);
        } else {
            programmeSelect.disabled = false;
            filteredProgrammes.forEach(programme => {
                const option = document.createElement("option");
                option.value = programme.id;
                option.textContent = programme.name;
                programmeSelect.appendChild(option);
            });
        }
    }
});

// Edit Subject Modal: department change
document.getElementById('edit-department').addEventListener('change', function () {
    const departmentId = this.value;
    const levelId = document.getElementById('edit-level').value;
    const editProgrammeSelect = document.getElementById('edit-programme');
    const editClassroomSelect = document.getElementById('edit-classroom');
    const editLecturerSelect = document.getElementById('edit-lecturer');
    
    editProgrammeSelect.innerHTML = `<option value="" disabled selected>Select programme</option>`;
    editProgrammeSelect.disabled = true;
    
    // Enable and filter classrooms when department is selected
    if (departmentId) {
        editClassroomSelect.innerHTML = `<option value="" disabled selected>Select classroom</option>`;
        editClassroomSelect.innerHTML += `<option value="Random">Random Classroom</option>`;
        
        // Show classrooms for selected department
        if (window.classroomsByDepartment) {
            const deptClassrooms = window.classroomsByDepartment[departmentId] || [];
            deptClassrooms.forEach(classroom => {
                const option = document.createElement("option");
                option.value = classroom.id;  // Use classroom ID as value
                option.textContent = classroom.id;  // Display classroom ID instead of name
                editClassroomSelect.appendChild(option);
            });
        }

        // Filter and show lecturers for selected department
        editLecturerSelect.innerHTML = `<option value="" disabled selected>Select lecturer</option>`;
        if (window.lecturersByDepartment) {
            const deptLecturers = window.lecturersByDepartment[departmentId] || [];
            deptLecturers.forEach(lecturer => {
                const option = document.createElement("option");
                option.value = lecturer.name;
                option.textContent = lecturer.name;
                editLecturerSelect.appendChild(option);
            });
        }
    } else {
        // Reset lecturer dropdown
        editLecturerSelect.innerHTML = `<option value="" disabled selected>Select lecturer</option>`;
    }
    
    // Handle programme filtering for specific departments with level
    if (departmentId && levelId && window.programmesByDepartment) {
        const programmes = window.programmesByDepartment[departmentId] || [];
        const levelText = document.getElementById('edit-level').selectedOptions[0]?.textContent;
        
        const filteredProgrammes = programmes.filter(programme => 
            programme.subject_level === levelText || programme.subject_level === levelId
        );
        
        if (filteredProgrammes.length === 0) {
            const option = document.createElement("option");
            option.value = "";
            option.textContent = "No programmes available for " + levelText;
            option.disabled = true;
            editProgrammeSelect.appendChild(option);
        } else {
            editProgrammeSelect.disabled = false;
            filteredProgrammes.forEach(programme => {
                const option = document.createElement("option");
                option.value = programme.id;
                option.textContent = programme.name;
                editProgrammeSelect.appendChild(option);
            });
        }
    } else if (departmentId) {
        // Show all programmes for the department if no level filtering
        if (window.programmesByDepartment) {
            const programmes = window.programmesByDepartment[departmentId] || [];
            if (programmes.length > 0) {
                editProgrammeSelect.disabled = false;
                programmes.forEach(programme => {
                    const option = document.createElement("option");
                    option.value = programme.id;
                    option.textContent = programme.name;
                    editProgrammeSelect.appendChild(option);
                });
            }
        }
    }
});

// Add Subject Modal: level change
document.getElementById('level').addEventListener('change', function () {
    const levelId = this.value;
    const departmentSelect = document.getElementById('department');
    const programmeSelect = document.getElementById('programme');
    const classroomSelect = document.getElementById('classroom');
    
    programmeSelect.innerHTML = `<option value="" disabled selected>Select programme</option>`;
    programmeSelect.disabled = true;
    
    // Reset and disable classroom when level changes
    classroomSelect.innerHTML = `<option value="" disabled selected>Select classroom</option>`;
    classroomSelect.disabled = true;
    
    if (!levelId) {
        departmentSelect.innerHTML = `<option value="" disabled selected>Select department</option>`;
        departmentSelect.disabled = true;
        return;
    }
    
    if (window.allDepartments) {
        departmentSelect.disabled = false;
        const currentDepartmentId = departmentSelect.value;
        if (!currentDepartmentId) {
            departmentSelect.innerHTML = `<option value="" disabled selected>Select department</option>`;
            window.allDepartments.forEach(department => {
                const option = document.createElement('option');
                option.value = department.id;
                option.textContent = department.name;
                departmentSelect.appendChild(option);
            });
        }
    }
    
    const currentDepartmentId = departmentSelect.value;
    if (currentDepartmentId) {
        departmentSelect.dispatchEvent(new Event('change'));
    }
});

// Helper function to update programme options based on department and level
function updateProgrammeOptions(departmentId, levelId, programmeSelect) {
    if (window.programmesByDepartment) {
        const programmes = window.programmesByDepartment[departmentId] || [];
        const levelText = document.getElementById('level').selectedOptions[0]?.textContent;
        
        const filteredProgrammes = programmes.filter(programme => {
            return programme.subject_level === levelText ||
                   programme.level === levelId ||
                   programme.subject_level === levelId;
        });
        
        programmeSelect.innerHTML = `<option value="" disabled selected>Select programme</option>`;
        
        if (filteredProgrammes.length === 0) {
            const option = document.createElement("option");
            option.value = "";
            option.textContent = "No programmes available for this level";
            option.disabled = true;
            programmeSelect.appendChild(option);
            programmeSelect.disabled = true;
        } else {
            programmeSelect.disabled = false;
            filteredProgrammes.forEach(programme => {
                const option = document.createElement("option");
                option.value = programme.id;
                option.textContent = programme.name;
                programmeSelect.appendChild(option);
            });
        }
    }
}

// Add Subject
document.getElementById('add-subject-form').onsubmit = async function (e) {
    e.preventDefault();
    document.querySelectorAll('.error-message').forEach(el => el.classList.add('hidden'));
    const subject_id = document.getElementById('subject-code').value.trim();
    const name = document.getElementById('subject-name').value.trim();
    const department = document.getElementById('department').value;
    const programme = document.getElementById('programme').value;
    const credits = document.getElementById('credits').value;
    const level = document.getElementById('level').value;
    const lecturer = document.getElementById('lecturer').value;
    const duration = document.getElementById('duration').value;
    const classroom = document.getElementById('classroom').value;
    let valid = true;
    if (!subject_id) { document.getElementById('subject-code-error').classList.remove('hidden'); valid = false; }
    if (!name) { document.getElementById('subject-name-error').classList.remove('hidden'); valid = false; }
    if (!department) { document.getElementById('department-error').classList.remove('hidden'); valid = false; }
    if (!level) { document.getElementById('level-error').classList.remove('hidden'); valid = false; }
    if (!lecturer) { document.getElementById('lecturer-error').classList.remove('hidden'); valid = false; }
    if (!duration || isNaN(duration) || Number(duration) <= 0) { document.getElementById('duration-error').classList.remove('hidden'); valid = false; }
    if (!classroom) {document.getElementById('classroom-error').classList.remove('hidden');valid = false;}
    if (!programme) {
        document.getElementById('programme-error').classList.remove('hidden'); valid = false;
    }
    if (!valid) return;
    const payload = {
        subject_id, name, department, programme, credits, level, lecturer, duration,
        classroom: classroom || null
    };
    try {
        const res = await fetch('/add_subject', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result.success) {
            showPopupMessageSubject('Subject added successfully!',true);
            addSubjectModal.classList.add('hidden');
            resetForm();
            location.reload();
        } else {
            showPopupMessageSubject('Error: ' + (result.error || 'Unknown error'));
        }
    } catch (err) {
        showPopupMessageSubject('Error: ' + err.message);
    }
};





// Edit Subject Modal logic
window.editSubject = function (subject_id) {
    const row = document.querySelector(`tr[data-id="${subject_id}"]`);
    if (!row) return showPopupMessageSubject('Subject not found');
    const cells = row.querySelectorAll('td');
    document.getElementById('edit-subject-id').value = subject_id;
    document.getElementById('edit-subject-code').value = cells[1].textContent.trim();
    document.getElementById('edit-subject-name').value = cells[2].textContent.trim();

    // Set level first
    const levelValue = cells[6].textContent.trim();
    const levelSelect = document.getElementById('edit-level');
    Array.from(levelSelect.options).forEach(opt => {
        opt.selected = (opt.textContent.trim() === levelValue || opt.value === levelValue);
    });

    // Set department after level
    const departmentValue = cells[3].textContent.trim();
    const departmentSelect = document.getElementById('edit-department');
    Array.from(departmentSelect.options).forEach(opt => {
        opt.selected = (opt.textContent.trim() === departmentValue || opt.value === departmentValue);
    });

    // Trigger department change to populate programmes and classrooms with level filtering
    setTimeout(() => {
        departmentSelect.dispatchEvent(new Event('change'));
        
        // Set programme after department change has populated options
        setTimeout(() => {
            const programmeValue = cells[4].textContent.trim();
            const programmeSelect = document.getElementById('edit-programme');
            Array.from(programmeSelect.options).forEach(opt => {
                opt.selected = (opt.textContent.trim() === programmeValue || opt.value === programmeValue);
            });
        }, 50);

        // Set classroom after department change has populated options
        // Find classroom by matching the stored classroom ID in the subject data
        setTimeout(() => {
            const classroomIdValue = cells[9].textContent.trim(); // This should be the classroom ID stored in DB
            const classroomSelect = document.getElementById('edit-classroom');
            
            // Select the option with matching value (classroom ID)
            Array.from(classroomSelect.options).forEach(opt => {
                if (opt.value === classroomIdValue) {
                    opt.selected = true;
                }
            });
        }, 50);
    }, 50);

    // Set other fields
    document.getElementById('edit-credits').value = cells[5].textContent.trim();
    document.getElementById('edit-duration').value = cells[7].textContent.trim();

    const lecturerValue = cells[8].textContent.trim();
    const lecturerSelect = document.getElementById('edit-lecturer');
    Array.from(lecturerSelect.options).forEach(opt => {
        opt.selected = (opt.textContent.trim() === lecturerValue || opt.value === lecturerValue);
    });

    document.getElementById('edit-subject-modal').classList.remove('hidden');
};
['close-edit-subject', 'cancel-edit-subject'].forEach(id => {
    document.getElementById(id).onclick = function () {
        document.getElementById('edit-subject-modal').classList.add('hidden');
    };
});

// Save Edit Subject
document.getElementById('edit-subject-form').onsubmit = async function (e) {
    e.preventDefault();
    const subject_id = document.getElementById('edit-subject-code').value.trim();
    const name = document.getElementById('edit-subject-name').value.trim();
    const department = document.getElementById('edit-department').value;
    const programme = document.getElementById('edit-programme').value;
    const credits = document.getElementById('edit-credits').value;
    const level = document.getElementById('edit-level').value;
    const lecturer = document.getElementById('edit-lecturer').value;
    const duration = document.getElementById('edit-duration').value;
    const classroom = document.getElementById('edit-classroom').value;
    if (!subject_id || !name || !department || !credits || !level || !lecturer || !duration || isNaN(duration) || Number(duration) <= 0) {
        showPopupMessageSubject('Please fill in all required fields');
        return;
    }
    const btn = this.querySelector('button[type="submit"]');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Saving...'; btn.disabled = true;
    try {
        const res = await fetch('/edit_subject', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                subject_id, name, department, programme, credits, level, lecturer, duration,
                classroom: classroom || null
            })
        });
        const result = await res.json();
        if (result.success) {
            document.getElementById('edit-subject-modal').classList.add('hidden');
            location.reload();
        } else {
            showPopupMessageSubject('Error: ' + (result.error || 'Unknown error'));
        }
    } catch (err) {
        showPopupMessageSubject('Error: ' + err.message);
    }
    btn.innerHTML = 'Save Changes'; btn.disabled = false;
};

// Delete Subject (single)
window.deleteSubject = function (subject_id) {
    showPopupMessageSubject('Are you sure you want to delete this subject?', false, async () => {
        fetch('/delete_subject', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subject_id })
        })
        .then(res => res.json())
        .then(result => {
            if (result.success) {
                document.querySelector(`tr[data-id="${subject_id}"]`)?.remove();
                showPopupMessageSubject('Subject deleted successfully', true);
            } else {
                showPopupMessageSubject('Error: ' + (result.error || 'Unknown error'));
            }
        })
        .catch(err => showPopupMessageSubject('Error: ' + err.message));
    }); 
}; 

// Bulk Delete
document.addEventListener('DOMContentLoaded', function () {
    const checkboxes = document.querySelectorAll('.subject-checkbox');
    const selectAll = document.getElementById('select-all');
    const bulkBar = document.getElementById('bulk-actions');
    const selectedCount = document.getElementById('selected-count');
    const bulkDeleteBtn = document.getElementById('bulk-delete-btn');
    function updateUI() {
        const checked = document.querySelectorAll('.subject-checkbox:checked').length;
        bulkBar.classList.toggle('hidden', checked === 0);
        selectedCount.textContent = checked;
        document.querySelectorAll('.row-actions').forEach(row => {
            const showEdit = checked <= 1;
            row.querySelector('.edit-btn').style.display = showEdit ? 'inline-block' : 'none';
            row.querySelector('.delete-btn').style.display = 'inline-block';
        });
    }
    selectAll.onchange = function () {
        checkboxes.forEach(cb => cb.checked = this.checked);
        updateUI();
    };
    checkboxes.forEach(cb => cb.onchange = function () {
        selectAll.checked = document.querySelectorAll('.subject-checkbox:checked').length === checkboxes.length;
        updateUI();
    });
    bulkDeleteBtn.onclick = async function () {
        const ids = Array.from(document.querySelectorAll('.subject-checkbox:checked')).map(cb => cb.value);
        if (!ids.length) return;
        if (!confirm(`Are you sure you want to delete ${ids.length} selected subjects?`)) return;
        let success = 0;
        for (const id of ids) {
            try {
                const res = await fetch('/delete_subject', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ subject_id: id })
                });
                const result = await res.json();
                if (result.success) {
                    document.querySelector(`tr[data-id="${id}"]`)?.remove();
                    success++;
                }
            } catch {}
        }
        selectAll.checked = false; updateUI();
        showPopupMessageSubject(`Deleted ${success} subject(s) successfully!`);
    };
    updateUI();
});

// Upload CSV Modal
document.getElementById('upload-csv-btn').onclick = () => document.getElementById('upload-csv-modal').classList.remove('hidden');
['close-upload-csv', 'cancel-upload-csv'].forEach(id => {
    document.getElementById(id).onclick = () => {
        document.getElementById('upload-csv-modal').classList.add('hidden');
        document.getElementById('file-input').value = '';
        document.getElementById('file-info').classList.add('hidden');
    };
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
document.getElementById('remove-file').onclick = function () {
    fileInput.value = '';
    document.getElementById('file-info').classList.add('hidden');
};
function isValidFile(file) {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (ext !== '.csv') return showPopupMessageSubject('Please upload a CSV file only.'), false;
    if (file.size > 5 * 1024 * 1024) return showPopupMessageSubject('File size exceeds 5MB limit.'), false;
    return true;
}
document.getElementById('upload-file-btn').onclick = async () => {
    if (!fileInput.files.length) return showPopupMessageSubject('Please select a file first.');
    const file = fileInput.files[0], formData = new FormData();
    formData.append('file', file);
    const btn = document.getElementById('upload-file-btn');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Uploading...'; btn.disabled = true;
    
    try {
        const response = await fetch('/upload/subjects', { method: 'POST', body: formData });
        const result = await response.json();
        
        if (result.success) {
            let message = result.message;
            if (result.errors && result.errors.length > 0) {
                message += '\n\nErrors encountered:\n' + result.errors.join('\n');
            }
            showPopupMessageSubject(message, true);
            document.getElementById('upload-csv-modal').classList.add('hidden');
            document.getElementById('file-input').value = '';
            document.getElementById('file-info').classList.add('hidden');
            // Reload page to show new subjects
            setTimeout(() => location.reload(), 2000);
        } else {
            showPopupMessageSubject('Upload failed: ' + (result.error || 'Unknown error'));
        }
    } catch (error) {
        showPopupMessageSubject('Upload failed: ' + error.message);
    } finally {
        btn.innerHTML = '<i class="fa-solid fa-upload mr-2"></i>Upload CSV & Import'; 
        btn.disabled = false;
    }
};