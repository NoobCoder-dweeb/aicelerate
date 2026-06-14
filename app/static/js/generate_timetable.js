const colors = {
    blue: { label: "Blue", hex: "#165DFF" },
    green: { label: "Green", hex: "#36D399" },
    yellow: { label: "Yellow", hex: "#FFD633" },
    red: { label: "Red", hex: "#FF6B35" },
    purple: { label: "Purple", hex: "#A855F7" },
    brown: { label: "Brown", hex: "#8B5E3C" },
    teal: { label: "Teal", hex: "#14B8A6" },
    orange: { label: "Orange", hex: "#FB923C" },
    gray: { label: "Gray", hex: "#9CA3AF" },
};

document.addEventListener('DOMContentLoaded', function () {

    // DOM Elements
    const sections = document.querySelectorAll('.section-container');
    const progressBar = document.getElementById('progress-bar');
    const stepIndicators = document.querySelectorAll('.step-indicator');
    const sectionHeaders = document.querySelectorAll('.section-header');

    // Section 1 Elements (Departments)
    const deptRadios = document.querySelectorAll('input[name="departments"]');
    const section1Proceed = document.getElementById('section-1-proceed');

    // Section 2 Elements (Programs)
    const programCheckboxes = document.querySelectorAll('input[name="programs"]');
    const section2Back = document.getElementById('section-2-back');
    const section2Proceed = document.getElementById('section-2-proceed');

    // Section 3 Elements (Subjects & Classrooms)
    const subjectItems = document.querySelectorAll('.subject-item');
    const classroomItems = document.querySelectorAll('.classroom-item');
    const dragAreas = document.querySelectorAll('.drag-area');
    const section3Back = document.getElementById('section-3-back');
    const generateBtn = document.getElementById('generate-timetable');

    // Section 4 Elements (Results)
    const section4 = document.getElementById('section-4');
    const dataContent = document.getElementById('data-content');
    const successDescription = document.getElementById('success-description');


    // -------------------------- Section Progression Logic --------------------------
    function showSection(sectionNumber) {
        sections.forEach((section, index) => {
            const sectionNum = index + 1;
            const content = section.querySelector('.section-content');
            const header = section.querySelector('.section-header');

            if (sectionNum === sectionNumber) {
                // Show current section
                section.classList.remove('section-collapsed');
                section.classList.add('section-expanded');
                content.classList.remove('hidden');
                header.classList.remove('opacity-50');
                header.classList.add('cursor-pointer');
                section.querySelector('.section-icon').classList.add('rotate-180');
            } else if (sectionNum < sectionNumber) {
                // Collapse previous sections but keep headers active
                section.classList.remove('section-expanded');
                section.classList.add('section-collapsed');
                content.classList.add('hidden');
                header.classList.remove('opacity-50');
                section.querySelector('.section-icon').classList.remove('rotate-180');
            } else {
                // Keep future sections locked
                section.classList.remove('section-expanded');
                section.classList.add('section-collapsed');
                content.classList.add('hidden');
                header.classList.add('opacity-50');
                header.classList.remove('cursor-pointer');
                section.querySelector('.section-icon').classList.remove('rotate-180');
            }
        });

        // ✅ Update progress bar (4 steps total, so 33.3% increments)
        progressBar.style.width = `${((sectionNumber - 1) / (sections.length - 1)) * 100}%`;

        // ✅ Update step indicators
        stepIndicators.forEach((indicator, index) => {
            const stepNum = index + 1;
            if (stepNum < sectionNumber) {
                indicator.classList.remove('bg-gray-200', 'text-gray-500');
                indicator.classList.add('bg-secondary', 'text-white');
                indicator.innerHTML = '<i class="fa-solid fa-check"></i>';
            } else if (stepNum === sectionNumber) {
                indicator.classList.remove('bg-gray-200', 'text-gray-500', 'bg-secondary');
                indicator.classList.add('bg-primary', 'text-white');
                indicator.textContent = stepNum;
            } else {
                indicator.classList.remove('bg-primary', 'bg-secondary', 'text-white');
                indicator.classList.add('bg-gray-200', 'text-gray-500');
                indicator.textContent = stepNum;
            }
        });

        // Smooth scroll to active section
        setTimeout(() => {
            const activeSection = document.getElementById(`section-${sectionNumber}`);
            if (activeSection) {
                const headerOffset = 100;
                const elementPosition = activeSection.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        }, 300);
    }


    // -------------------------- Section 1 Logic (Departments) --------------------------
    // Initial check on load
    const isAnyDeptSelected = Array.from(deptRadios).some(rd => rd.checked);
    section1Proceed.disabled = !isAnyDeptSelected;

    deptRadios.forEach(radio => {
        radio.addEventListener('change', function () {
            section1Proceed.disabled = !Array.from(deptRadios).some(rd => rd.checked);
        });
    });

    // Section 1 Proceed button
    section1Proceed.addEventListener('click', () => {
        // Clear section 2 and 3 when moving forward from section 1
        clearSection2Selections();
        clearSection3Assignments();
        // Filter programs based on selected department before showing section 2
        filterProgramsByDepartment();
        showSection(2);
    });


    // -------------------------- Section 2 Logic (Programs) --------------------------
    // Initial check for Section 2 on page load
    const isAnyProgramSelected = Array.from(programCheckboxes).some(cb => cb.checked);
    section2Proceed.disabled = !isAnyProgramSelected;

    // Enable Proceed when at least one program is selected
    programCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function () {
            updateSection2ProceedButton();
        });
    });

    // Section 2 Back button
    section2Back.addEventListener('click', () => {
        // Clear section 3 when going back to section 1
        clearSection3Assignments();
        showSection(1);
    });

    // Section 2 Proceed button
    section2Proceed.addEventListener('click', () => {
        // Filter subjects in Section 3 based on selected programs
        filterSubjectsInSection3();
        showSection(3);
    });


    // -------------------------- Section 3 Drag & Drop Logic (Subjects & Classrooms) --------------------------
    // Function to filter subjects in Section 3 based on selected programs from Section 2
    function filterSubjectsInSection3() {
        const selectedPrograms = Array.from(document.querySelectorAll('input[name="programs"]:checked'))
            .map(cb => cb.value);

        // Filter subjects in both columns
        document.querySelectorAll('#section-3 .subject-item, #section-3 .flex.flex-col').forEach(item => {
            // Get subject name from the item
            const subjectNameElement = item.querySelector('.font-medium');
            if (!subjectNameElement) return;

            const subjectName = subjectNameElement.textContent.trim();

            // Find the subject data attribute or get from global subjects data
            const subjectData = window.subjectsData?.find(s => s.name === subjectName);

            if (selectedPrograms.length === 0 || (subjectData && selectedPrograms.includes(subjectData.programme))) {
                item.style.display = '';
            } else {
                item.style.display = 'none';

                // Clear drag area if hiding the subject (only if it's not pre-assigned)
                const dragArea = item.querySelector('.drag-area');
                if (dragArea && !dragArea.querySelector('[draggable="true"]')) {
                    dragArea.innerHTML = '<div class="text-center text-gray-400 text-sm py-2">Drop classroom here or leave it blank for random assignment</div>';
                }
            }
        });

        // Filter classrooms based on selected department
        filterClassroomsByDepartment();

        // Update generate button state after filtering
        updateGenerateButtonState();
    }

    // Function to filter classrooms in Column 3 based on selected department from Section 1
    function filterClassroomsByDepartment() {
        const selectedDepartment = document.querySelector('input[name="departments"]:checked')?.value;

        // Filter classrooms in Column 3
        document.querySelectorAll('#section-3 .classroom-item').forEach(item => {
            // Get classroom ID from data-classroom attribute (now it's the actual ID)
            const classroomId = item.dataset.classroom;

            // Find classroom data using the ID
            const classroomData = window.classroomsData?.find(c => c.id === classroomId);

            if (!classroomData) {
                return;
            }

            // Show classroom only if it belongs to the selected department
            if (!selectedDepartment || classroomData.department === selectedDepartment) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    }

    // Function to update the state of the generate button
    function updateGenerateButtonState() {
        const visibleDragAreas = Array.from(document.querySelectorAll('#section-3 .drag-area')).filter(area =>
            area.closest('.flex.flex-col').style.display !== 'none'
        );

        // Enable generate button if there are any visible subjects (don't require all to be assigned)
        generateBtn.disabled = visibleDragAreas.length === 0;
    }

    // Drag start (classrooms) - Updated to handle both Column 3 and Column 2 classrooms
    document.addEventListener('dragstart', function (e) {
        if (e.target.classList.contains('classroom-item') ||
            (e.target.closest('.drag-area') && e.target.draggable)) {

            let classroomId;
            if (e.target.classList.contains('classroom-item')) {
                // Column 3 classroom - use data-classroom which is now the classroom ID
                classroomId = e.target.dataset.classroom;
            } else {
                // Column 2 pre-assigned classroom - get classroom ID from content
                const classroomIdElement = e.target.querySelector('.font-large');
                if (classroomIdElement) {
                    classroomId = classroomIdElement.textContent.trim();
                }
            }

            e.dataTransfer.setData('text/plain', classroomId);
            e.dataTransfer.setData('source', e.target.closest('.drag-area') ? 'column2' : 'column3');
            e.target.classList.add('opacity-50');
        }
    });

    document.addEventListener('dragend', function (e) {
        if (e.target.classList.contains('classroom-item') ||
            (e.target.closest('.drag-area') && e.target.draggable)) {
            e.target.classList.remove('opacity-50');
        }
    });

    // Drag over (drop zones)
    dragAreas.forEach(area => {
        area.addEventListener('dragover', function (e) {
            e.preventDefault();
            this.classList.add('drag-area-active');
        });

        area.addEventListener('dragleave', function () {
            this.classList.remove('drag-area-active');
        });

        // Drop functionality
        area.addEventListener('drop', function (e) {
            e.preventDefault();
            this.classList.remove('drag-area-active');

            const classroomId = e.dataTransfer.getData('text/plain');
            const source = e.dataTransfer.getData('source');

            // Find classroom element using the classroom ID
            let classroom = null;

            if (source === 'column3') {
                // Find from Column 3 using data-classroom attribute
                classroom = document.querySelector(`[data-classroom="${classroomId}"]`);
            } else if (source === 'column2') {
                // For Column 2, we need to find the classroom data and recreate it
                const classroomData = window.classroomsData?.find(c => c.id === classroomId);
                if (classroomData) {
                    // Create a temporary element to clone from
                    const tempDiv = document.createElement('div');
                    tempDiv.className = 'p-4 border border-gray-200 rounded-xl bg-white cursor-move hover-scale';
                    tempDiv.innerHTML = `
                        <div class="flex justify-between items-start">
                            <div>
                                <p class="font-large">${classroomData.id}</p>
                                <p class="font-medium text-gray-500">${classroomData.name}</p>
                                <p class="text-sm text-gray-500">Capacity: ${classroomData.capacity}</p>
                            </div>
                            <span class="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                Assigned
                            </span>
                        </div>
                    `;
                    classroom = tempDiv;
                }
            }

            if (classroom) {
                // Create a copy of the classroom for the drop zone
                const classroomCopy = classroom.cloneNode(true);
                classroomCopy.classList.remove('cursor-move', 'classroom-item', 'opacity-50');
                classroomCopy.removeAttribute('draggable');
                classroomCopy.removeAttribute('data-classroom');
                classroomCopy.setAttribute('draggable', 'true');

                // Ensure proper styling for dropped classroom
                classroomCopy.classList.add('cursor-move', 'hover-scale');

                // Clear existing content and add new classroom
                this.innerHTML = '';
                this.appendChild(classroomCopy);
            }

            // Check if all classrooms are assigned
            updateGenerateButtonState();
        });
    });

    // Add drop zone for canceling assignments (outside Column 2)
    document.addEventListener('dragover', function (e) {
        // Allow dropping anywhere on the document
        if (!e.target.closest('.drag-area')) {
            e.preventDefault();
        }
    });

    document.addEventListener('drop', function (e) {
        const source = e.dataTransfer.getData('source');

        // Only handle drops from Column 2 that are outside drag areas
        if (source === 'column2' && !e.target.closest('.drag-area')) {
            e.preventDefault();

            const draggedElement = document.querySelector('.opacity-50');
            if (draggedElement && draggedElement.closest('.drag-area')) {
                // Clear the drag area and reset to empty state
                const dragArea = draggedElement.closest('.drag-area');
                dragArea.innerHTML = '<div class="text-center text-gray-400 text-sm py-2">Drop classroom here or leave it blank for random assignment</div>';

                // Update generate button state
                updateGenerateButtonState();
            }
        }
    });

    // Section 3 Back button
    section3Back.addEventListener('click', () => {
        // Clear section 3 drag and drop assignments when going back
        clearSection3Assignments();
        showSection(2);
    });

    // -------------------------- Section 4 Logic (Customization) --------------------------
    //append lecturer avaiability down there
    // -------------------------- Section 4 Logic (Customization) --------------------------
    // ✅ Lecturer Availability Constraint — one constraint per lecturer
    const addLecturerBtn = document.getElementById("add-lecturer-constraint");
    // lecturerSelect = document.getElementById("lecturer-select");
    const lecturerConstraintsList = document.getElementById("lecturer-constraints-list");
    const removedLecturerOptions = new Map();

    addLecturerBtn.addEventListener("click", function () {
        const selectedLecturer = lecturerSelect.options[lecturerSelect.selectedIndex]?.text || "";
        const lecturerValue = lecturerSelect.value;

        const dayCheckboxes = document.querySelectorAll(".day-checkbox");
        const selectedDays = Array.from(dayCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);

        // Validation
        if (!lecturerValue) {
            alert("Please select a lecturer.");
            return;
        }
        if (selectedDays.length === 0) {
            alert("Please select at least one day.");
            return;
        }

        // Prevent duplicate constraints
        if (lecturerConstraintsList.querySelector(`[data-lecturer-id="${lecturerValue}"]`)) {
            alert("This lecturer already has a constraint.");
            return;
        }

        // Create constraint element
        const constraintDiv = document.createElement("div");
        constraintDiv.className =
            "p-3 border border-gray-200 rounded-lg flex justify-between items-center bg-gray-50";
        constraintDiv.dataset.lecturerId = lecturerValue;
        constraintDiv.dataset.lecturerDays = selectedDays.join(",");

        const cleanLecturerName = selectedLecturer.replace(/\s*\(ID:\s*.*?\)\s*/i, "").trim();
        constraintDiv.dataset.lecturerName = cleanLecturerName;

        constraintDiv.innerHTML = `
        <div>
            <span class="font-semibold text-gray-800">${selectedLecturer}</span>
            <span class="text-gray-600"> — ${selectedDays.join(", ")}</span>
        </div>
        <button class="text-red-500 hover:text-red-700 text-sm remove-btn">Remove</button>
    `;

        // Append to list
        lecturerConstraintsList.appendChild(constraintDiv);

        // ✅ Remove the lecturer option from dropdown (so it can’t be selected again)
        const option = lecturerSelect.querySelector(`option[value="${lecturerValue}"]`);
        if (option) {
            removedLecturerOptions.set(lecturerValue, option);
            option.remove();
        }

        // Reset selections
        lecturerSelect.value = "";
        dayCheckboxes.forEach(cb => (cb.checked = false));
    });

    // ♻️ Reinsert lecturer when removed
    lecturerConstraintsList.addEventListener("click", function (e) {
        if (!e.target.classList.contains("remove-btn")) return;

        const div = e.target.closest("[data-lecturer-id]");
        if (!div) return;

        const lecturerId = div.dataset.lecturerId;
        const option = removedLecturerOptions.get(lecturerId);
        if (option) {
            lecturerSelect.appendChild(option);
            removedLecturerOptions.delete(lecturerId);
        }

        div.remove();
    });




    //append subject constraint availability down there
    // -------------------------- Subject Constraints --------------------------
    document.getElementById("add-subject-constraint").addEventListener("click", function () {
        const subjectSelect = document.getElementById("subject-select");
        const selectedSubject = subjectSelect.options[subjectSelect.selectedIndex]?.text || "";
        const subjectValue = subjectSelect.value;
        const dayCheckboxes = document.querySelectorAll(".subject-day-checkbox");
        const selectedDays = Array.from(dayCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);

        // Basic validation
        if (!subjectValue) {
            alert("Please select a subject.");
            return;
        }
        if (selectedDays.length === 0) {
            alert("Please select at least one day.");
            return;
        }

        // 🧩 Find lecturer teaching this subject
        const subjectData = window.subjectsData?.find(s => s.subject_id === subjectValue);
        const lecturerId = subjectData?.lecturer;
        let lecturerConstraint = null;

        // 🧩 Find lecturer constraint if exists
        if (lecturerId) {
            lecturerConstraint = document.querySelector(
                `#lecturer-constraints-list [data-lecturer-name*="${lecturerId}"], #lecturer-constraints-list [data-lecturer-id="${lecturerId}"]`
            );
        }





        // ✅ Prevent duplicate subject constraints
        const subjectConstraintsList = document.getElementById("subject-constraints-list");
        if (subjectConstraintsList.querySelector(`[data-subject-id="${subjectValue}"]`)) {
            alert("This subject already has a constraint.");
            return;
        }

        // ✅ Create constraint element
        const constraintDiv = document.createElement("div");
        constraintDiv.className =
            "p-3 border border-gray-200 rounded-lg flex justify-between items-center bg-gray-50";
        constraintDiv.dataset.subjectId = subjectValue;
        constraintDiv.dataset.subjectDays = selectedDays.join(",");

        constraintDiv.innerHTML = `
        <div>
            <span class="font-semibold text-gray-800">${selectedSubject}</span>
            <span class="text-gray-600"> — ${selectedDays.join(", ")}</span>
        </div>
        <button class="text-red-500 hover:text-red-700 text-sm remove-btn">Remove</button>
    `;

        // ✅ Remove function
        constraintDiv.querySelector(".remove-btn").addEventListener("click", () => {
            constraintDiv.remove();
        });

        // ✅ Append to list
        subjectConstraintsList.appendChild(constraintDiv);

        // ✅ Remove the selected subject from dropdown (disable duplicate)
        const option = subjectSelect.querySelector(`option[value="${subjectValue}"]`);
        if (option) {
            option.disabled = true; // visually greyed out
            option.hidden = true;   // completely hidden
        }

        // ♻️ Handle remove click (re-enable subject in dropdown)
        constraintDiv.querySelector(".remove-btn").addEventListener("click", () => {
            constraintDiv.remove();
            if (option) {
                option.disabled = false;
                option.hidden = false;
            }
        });

        // Reset
        subjectSelect.value = "";
        dayCheckboxes.forEach(cb => (cb.checked = false));
    });



    // show lecturer based on selected department
    const departmentRadios = document.querySelectorAll('input[name="departments"]');
    const lecturerSelect = document.getElementById('lecturer-select');

    departmentRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            const selectedDept = document.querySelector('input[name="departments"]:checked')?.value;

            for (let option of lecturerSelect.options) {
                if (option.value === "") {
                    option.hidden = false; // keep placeholder visible
                    continue;
                }

                const dept = option.getAttribute('data-department');
                option.hidden = selectedDept && dept !== selectedDept;
            }

            lecturerSelect.value = ""; // reset selection when department changes
        });
    });

    // ✅ Add Lecturer Constraint

    // ✅ Ensure only one lecturer constraint per lecturer
    document.addEventListener("DOMContentLoaded", function () {
        const addLecturerBtn = document.getElementById("add-lecturer-constraint");
        const lecturerSelect = document.getElementById("lecturer-select");
        const lecturerConstraintsList = document.getElementById("lecturer-constraints-list");

        if (!addLecturerBtn || !lecturerSelect || !lecturerConstraintsList) {
            console.warn("Lecturer controls not found");
            return;
        }

        // store removed option nodes so we can re-insert later
        const removedOptions = new Map();

        addLecturerBtn.addEventListener("click", function () {
            const lecturerValue = lecturerSelect.value;
            const lecturerText = lecturerSelect.options[lecturerSelect.selectedIndex]?.text || "";

            console.log("Add lecturer clicked:", lecturerValue, lecturerText);

            if (!lecturerValue) { alert("Please select a lecturer first."); return; }

            // Prevent adding duplicates (based on dataset in list)
            if (lecturerConstraintsList.querySelector(`[data-lecturer-id="${lecturerValue}"]`)) {
                alert("This lecturer already has a constraint.");
                return;
            }

            const selectedDays = Array.from(document.querySelectorAll(".day-checkbox:checked")).map(cb => cb.value);
            if (selectedDays.length === 0) { alert("Please select at least one unavailable day."); return; }

            // create constraint block
            const cleanName = lecturerText.replace(/\s*\(ID:\s*.*?\)\s*/i, "").trim();
            const constraintDiv = document.createElement("div");
            constraintDiv.className = "bg-gray-50 p-3 rounded-lg flex justify-between items-center";
            constraintDiv.dataset.lecturerId = lecturerValue;
            constraintDiv.dataset.lecturerName = cleanName;
            constraintDiv.dataset.lecturerDays = selectedDays.join(",");

            constraintDiv.innerHTML = `
      <div>
        <p class="font-medium text-gray-800">${lecturerText}</p>
        <p class="text-sm text-gray-600">Not available on: ${selectedDays.join(", ")}</p>
      </div>
      <button class="text-red-500 hover:text-red-700 remove-lecturer">Remove</button>
    `;

            lecturerConstraintsList.appendChild(constraintDiv);

            // --- REMOVE the <option> element entirely from the select and keep it in memory ---
            const option = lecturerSelect.querySelector(`option[value="${lecturerValue}"]`);
            if (option) {
                // keep reference to re-insert at the same index
                const index = Array.from(lecturerSelect.options).indexOf(option);
                removedOptions.set(lecturerValue, { optionNode: option, index });
                option.remove();
                console.log(`Option removed for lecturer ${lecturerValue} (index ${index})`);
            } else {
                console.warn("Option to remove was not found in the select:", lecturerValue);
            }

            // Reset UI
            lecturerSelect.value = "";
            document.querySelectorAll(".day-checkbox").forEach(cb => cb.checked = false);
        });

        // handle remove click using event delegation
        lecturerConstraintsList.addEventListener("click", function (e) {
            if (!e.target.closest(".remove-lecturer")) return;

            const div = e.target.closest("[data-lecturer-id]");
            if (!div) return;

            const lecturerId = div.dataset.lecturerId;
            console.log("Removing constraint for lecturer:", lecturerId);

            // Re-insert the original option if we stored it
            const stored = removedOptions.get(lecturerId);
            if (stored && stored.optionNode) {
                // If select currently has fewer options than the original index, append
                const opts = lecturerSelect.options;
                if (opts.length >= stored.index) {
                    // Try to insert at original index
                    lecturerSelect.insertBefore(stored.optionNode, lecturerSelect.options[stored.index] || null);
                } else {
                    lecturerSelect.appendChild(stored.optionNode);
                }
                removedOptions.delete(lecturerId);
                console.log(`Option re-inserted for lecturer ${lecturerId}`);
            } else {
                console.warn("No stored option found to re-insert for:", lecturerId);
            }

            // remove the visual constraint block
            div.remove();
        });
    });




    //show subject based on selected program
    function filterSubjectsDropdown() {
        const selectedPrograms = Array.from(document.querySelectorAll('input[name="programs"]:checked'))
            .map(cb => cb.value);

        const subjectSelect = document.getElementById("subject-select");
        const options = subjectSelect.querySelectorAll("option[data-program]");

        options.forEach(option => {
            const subjectProgram = option.dataset.program;
            if (selectedPrograms.length === 0 || selectedPrograms.includes(subjectProgram)) {
                option.hidden = false;
            } else {
                option.hidden = true;
            }
        });

        // Reset if current value is hidden
        if (subjectSelect.value) {
            const current = subjectSelect.querySelector(`option[value="${subjectSelect.value}"]`);
            if (current && current.hidden) {
                subjectSelect.value = "";
            }
        }
    }

    // Bind change event to program checkboxes
    document.querySelectorAll('input[name="programs"]').forEach(cb => {
        cb.addEventListener("change", filterSubjectsDropdown);

    });

    // Proceed from Section 3 → open Section 5 (Customization)
    document.getElementById('section-3-proceed').addEventListener('click', () => {
        const section5 = document.getElementById('section-5-customization');

        // Remove collapsed state
        section5.classList.remove('section-collapsed');
        section5.querySelector('.section-content').classList.remove('hidden');
        section5.querySelector('.section-header').classList.remove('opacity-50');

        // Rotate the chevron icon if you use that effect
        const icon = section5.querySelector('.section-icon');
        if (icon) icon.classList.add('rotate-180');

        // Optionally collapse previous sections if needed
        const section3 = document.getElementById('section-3');
        if (section3) {
            section3.classList.add('section-collapsed');
            section3.querySelector('.section-content').classList.add('hidden');
            section3.querySelector('.section-header').classList.add('opacity-50');
            const icon3 = section3.querySelector('.section-icon');
            if (icon3) icon3.classList.remove('rotate-180');
        }

        // Smooth scroll to Section 5
        setTimeout(() => {
            section5.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
    });

    // Back to Section 3 from Section 5 (Customization)
    document.getElementById('section-5-back').addEventListener('click', () => {
        const section3 = document.getElementById('section-3');
        const section5 = document.getElementById('section-5-customization');

        // Collapse Section 5
        section5.classList.add('section-collapsed');
        section5.querySelector('.section-content').classList.add('hidden');
        section5.querySelector('.section-header').classList.add('opacity-50');
        const icon5 = section5.querySelector('.section-icon');
        if (icon5) icon5.classList.remove('rotate-180');

        // Expand Section 3
        section3.classList.remove('section-collapsed');
        section3.querySelector('.section-content').classList.remove('hidden');
        section3.querySelector('.section-header').classList.remove('opacity-50');
        const icon3 = section3.querySelector('.section-icon');
        if (icon3) icon3.classList.add('rotate-180');

        // Smooth scroll back to Section 3
        setTimeout(() => {
            section3.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
    });


    // ----------------------------------------Generate Timetable Section-------------------------------------------------

    // Async function to generate timetable
    async function generateTimetableAsync(timetableData) {
        console.log('Data being sent:', JSON.stringify(timetableData, null, 2));

        try {
            // Add timeout to the fetch request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

            const response = await fetch('/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(timetableData),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                let errorText;
                try {
                    errorText = await response.text();
                } catch (textError) {
                    errorText = `Failed to read error response: ${textError.message}`;
                }
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            let result;
            try {
                result = await response.json();
            } catch (jsonError) {
                const responseText = await response.text();
                throw new Error(`Invalid JSON response: ${jsonError.message}`);
            }

            return result;
        } catch (error) {
            // Handle specific error types
            if (error.name === 'AbortError') {
                throw new Error('Request timed out after 30 seconds');
            } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network error: Unable to connect to server');
            } else if (error.name === 'TypeError' && error.message.includes('JSON')) {
                throw new Error('Server returned invalid response format');
            }

            throw error;
        }
    }

    // Generate Timetable button click handler
    generateBtn.addEventListener('click', async function () {
        let timetableRequest;
        try {
            timetableRequest = collectTimetableData();
        } catch (collectError) {
            alert('Error collecting form data: ' + collectError.message);
            return;
        }

        if (!timetableRequest) {
            alert('Please complete all required sections');
            return;
        }

        // Show loading state
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Generating...';

        try {
            const result = await generateTimetableAsync(timetableRequest);

            console.log('Data received from backend:', result);

            // Safely check result properties
            if (result && typeof result === 'object') {
                if (result.success === true) {
                    showSection4WithResults(result);
                } else if (result.success === false) {
                    throw new Error(result.message || 'Backend returned failure status');
                } else {
                    // Try to use the response directly as timetable data
                    const mockResponse = {
                        success: true,
                        message: 'Timetable generated successfully',
                        received_data: result
                    };
                    showSection4WithResults(mockResponse);
                }
            } else {
                throw new Error('Invalid response format from server');
            }
        } catch (error) {
            let errorMessage = 'Failed to generate timetable';
            if (error.message) {
                errorMessage += ': ' + error.message;
            }

            alert(errorMessage);
        } finally {
            // Reset button state
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="fa-solid fa-magic mr-2"></i> Generate Timetable';
        }
    });

    // Function to show Section 4 with results
    function showSection4WithResults(data) {
        const oldTimetableResult = document.getElementById('timetable-result');
        if (oldTimetableResult) {
            oldTimetableResult.classList.add('hidden');
        }

        renderTimetableTable(data.received_data, data.batches || {});

        successDescription.textContent = data.message || 'Your timetable has been generated based on your requirements.';

        section4.classList.remove('hidden');

        setTimeout(() => {
            section4.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
    }

    // Function to render timetable table
    function renderTimetableTable(timetableData, batchesData = {}) {
        if (!timetableData) {
            const dataContentContainer = document.getElementById('generated-data');
            if (dataContentContainer) {
                dataContentContainer.innerHTML = '<div class="p-6 text-center text-red-600">No timetable data available</div>';
            }
            return;
        }

        const subjects = Object.keys(timetableData);

        if (subjects.length === 0) {
            const dataContentContainer = document.getElementById('generated-data');
            if (dataContentContainer) {
                dataContentContainer.innerHTML = '<div class="p-6 text-center text-yellow-600">No subjects found in timetable data</div>';
            }
            return;
        }

        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const timeSlots = [
            '0800-0830', '0830-0900', '0900-0930', '0930-1000',
            '1000-1030', '1030-1100', '1100-1130', '1130-1200',
            '1200-1230', '1230-1300', '1300-1330', '1330-1400',
            '1400-1430', '1430-1500', '1500-1530', '1530-1600',
            '1600-1630', '1630-1700', '1700-1730', '1730-1800'
        ];

        const classroomsInUse = new Set();
        try {
            Object.values(timetableData).forEach(subject => {
                if (subject && subject.classroom_id) {
                    classroomsInUse.add(subject.classroom_id);
                }
            });
        } catch (error) {
            const dataContentContainer = document.getElementById('generated-data');
            if (dataContentContainer) {
                dataContentContainer.innerHTML = '<div class="p-6 text-center text-red-600">Error processing timetable data: ' + error.message + '</div>';
            }
            return;
        }

        const sortedClassrooms = Array.from(classroomsInUse).sort();

        if (sortedClassrooms.length === 0) {
            const dataContentContainer = document.getElementById('generated-data');
            if (dataContentContainer) {
                dataContentContainer.innerHTML = '<div class="p-6 text-center text-yellow-600">No classroom assignments found in timetable data</div>';
            }
            return;
        }

        // Create the main schedule grid for all days
        const masterScheduleGrid = {};
        days.forEach(day => {
            masterScheduleGrid[day] = {};
            sortedClassrooms.forEach(classroom => {
                masterScheduleGrid[day][classroom] = {};
            });
        });

        // Fill the master schedule grid
        try {
            Object.entries(timetableData).forEach(([subjectId, subject]) => {
                try {
                    if (subject && subject.day && subject.start && subject.end && subject.classroom_id) {
                        const startHour = parseInt(subject.start.split(':')[0]);
                        const startMinutes = parseInt(subject.start.split(':')[1]);
                        const endHour = parseInt(subject.end.split(':')[0]);
                        const endMinutes = parseInt(subject.end.split(':')[1]);

                        const startTotalMinutes = startHour * 60 + startMinutes;
                        const endTotalMinutes = endHour * 60 + endMinutes;
                        const durationMinutes = endTotalMinutes - startTotalMinutes;
                        const spanSlots = Math.ceil(durationMinutes / 30);

                        const subjectName = getSubjectName(subjectId);

                        const startSlotIndex = timeSlots.findIndex(slot => {
                            const slotStartTime = slot.split('-')[0];
                            const slotHour = parseInt(slotStartTime.substring(0, 2));
                            const slotMinutes = parseInt(slotStartTime.substring(2, 4));
                            const slotTotalMinutes = slotHour * 60 + slotMinutes;
                            return slotTotalMinutes >= startTotalMinutes;
                        });

                        if (startSlotIndex !== -1 && masterScheduleGrid[subject.day][subject.classroom_id]) {
                            masterScheduleGrid[subject.day][subject.classroom_id][startSlotIndex] = {
                                subjectId,
                                subjectName,
                                lecturer: subject.lecturer_id || 'TBA',
                                span: spanSlots,
                                startTime: subject.start,
                                endTime: subject.end
                            };

                            for (let i = 1; i < spanSlots && (startSlotIndex + i) < timeSlots.length; i++) {
                                masterScheduleGrid[subject.day][subject.classroom_id][startSlotIndex + i] = 'occupied';
                            }
                        }
                    }
                } catch (subjectError) {
                    // Skip problematic subjects
                }
            });
        } catch (error) {
            const dataContentContainer = document.getElementById('generated-data');
            if (dataContentContainer) {
                dataContentContainer.innerHTML = '<div class="p-6 text-center text-red-600">Error generating table: ' + error.message + '</div>';
            }
            return;
        }

        // Generate the unified table HTML
        let tableHTML = `
            <div class="overflow-x-auto">
                <table class="min-w-full bg-white border border-gray-200 rounded-lg timetable-table">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-3 py-3 text-left text-sm font-medium text-gray-700 border border-gray-300 min-w-[100px] sticky left-0 bg-gray-50 z-10">VENUE</th>
                            ${timeSlots.map(slot => {
            const startTime = slot.split('-')[0];
            const endTime = slot.split('-')[1];
            const displayStart = startTime.substring(0, 2) + ':' + startTime.substring(2, 4);
            const displayEnd = endTime.substring(0, 2) + ':' + endTime.substring(2, 4);
            return `<th class="px-1 py-2 text-center text-xs font-medium text-gray-700 border border-gray-300 min-w-[80px]">${displayStart}<br>${displayEnd}</th>`;
        }).join('')}
                        </tr>
                    </thead>
                    <tbody>
        `;

        // Generate rows for each day
        days.forEach((day, dayIndex) => {
            // Add day header row
            tableHTML += `
                <tr class="bg-pink-200">
                    <td colspan="${timeSlots.length + 1}" class="px-3 py-2 text-center font-bold text-gray-800 border border-gray-300">
                        ${day.toUpperCase()}
                    </td>
                </tr>
            `;

            // Filter classrooms that have subjects for this specific day
            const classroomsUsedToday = sortedClassrooms.filter(classroom => {
                // Check if this classroom has any subjects scheduled for this day
                for (let slotIndex = 0; slotIndex < timeSlots.length; slotIndex++) {
                    const cellData = masterScheduleGrid[day][classroom][slotIndex];
                    if (cellData && cellData !== 'occupied') {
                        return true; // Found a subject in this classroom for this day
                    }
                }
                return false; // No subjects found in this classroom for this day
            });

            // Only generate rows for classrooms that are actually used today
            classroomsUsedToday.forEach((classroom, classroomIndex) => {
                tableHTML += `<tr class="${classroomIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">`;
                tableHTML += `<td class="px-3 py-3 font-medium text-gray-900 border border-gray-300 sticky left-0 ${classroomIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'} z-10">${classroom}</td>`;

                let slotIndex = 0;
                while (slotIndex < timeSlots.length) {
                    const cellData = masterScheduleGrid[day][classroom][slotIndex];

                    if (cellData && cellData !== 'occupied') {
                        const subjectColor = getSubjectColor(cellData.subjectId);
                        const backgroundColor = getLighterColor(subjectColor);
                        const borderColor = getBorderColor(subjectColor);
                        const textColor = getTextColor(subjectColor);

                        tableHTML += `
                            <td class="px-1 py-2 border border-gray-300 text-center" colspan="${cellData.span}">
                                <div class="event subject-${cellData.subjectId.replace(/\s+/g, '-').toLowerCase()} border rounded-lg p-2 text-xs h-full" style="background-color: ${backgroundColor}; border-color: ${borderColor};">
                                    <div class="event-code font-semibold text-xs" style="color: ${textColor};">${cellData.subjectId}</div>
                                    <div class="text-xs truncate" style="color: ${textColor};" title="${cellData.subjectName}">${cellData.subjectName}</div>
                                    <div class="text-xs truncate" style="color: ${textColor};" title="${cellData.lecturer}">${cellData.lecturer}</div>
                                </div>
                            </td>
                        `;
                        slotIndex += cellData.span;
                    } else if (cellData === 'occupied') {
                        slotIndex++;
                    } else {
                        tableHTML += `<td class="px-1 py-3 border border-gray-300 text-center text-gray-400 text-xs min-h-[60px]"></td>`;
                        slotIndex++;
                    }
                }

                tableHTML += '</tr>';
            });

            // If no classrooms are used on this day, show a message
            if (classroomsUsedToday.length === 0) {
                tableHTML += `
                    <tr class="bg-gray-50">
                        <td colspan="${timeSlots.length + 1}" class="px-3 py-4 text-center text-gray-500 italic border border-gray-300">
                            No classes scheduled for ${day}
                        </td>
                    </tr>
                `;
            }
        });

        tableHTML += `
                    </tbody>
                </table>
            </div>
        `;

        // Create sidebar HTML if batches exist
        let sidebarHTML = '';
        if (batchesData && Object.keys(batchesData).length > 0) {
            sidebarHTML = `
                <div class="timetable-sidebar">
                    <div class="sidebar-header">
                        <h2>Batches</h2>
                        <button class="clear-batch-btn" id="clear-batch-selection" title="Clear selection">
                            <i class="fa fa-times"></i>
                        </button>
                    </div>
                    <div class="batch-list" id="batch-list">
            `;

            // Add batch buttons
            Object.entries(batchesData).forEach(([batchName, subjects]) => {
                const batchId = batchName.replace(/\s+/g, '-').toLowerCase();
                sidebarHTML += `
                    <button class="batch-btn" data-batch-id="${batchId}" data-batch-name="${batchName}" data-subjects='${JSON.stringify(subjects)}'>
                        <div class="font-semibold text-sm">${batchName}</div>
                        <div class="text-xs text-gray-500 mt-1">${subjects.length} subjects</div>
                    </button>
                `;
            });

            sidebarHTML += `
                    </div>
                </div>
            `;
        }

        // Wrap table and sidebar in layout
        const layoutHTML = `
            <div class="timetable-layout-wrapper">
                <div class="timetable-container">
                    ${tableHTML}
                </div>
                ${sidebarHTML}
            </div>
        `;

        const dataContentContainer = document.getElementById('generated-data');
        if (dataContentContainer) {
            dataContentContainer.innerHTML = layoutHTML;

            // Add batch highlighting functionality if batches exist
            if (batchesData && Object.keys(batchesData).length > 0) {
                setupBatchHighlighting();
            }
        }

        window.currentTimetableData = timetableData;
    }


    // Function to collect all timetable data from sections
    function collectTimetableData() {
        const selectedDepartment = document.querySelector('input[name="departments"]:checked')?.value;
        if (!selectedDepartment) {
            alert('Please select a department');
            return null;
        }

        const selectedPrograms = Array.from(document.querySelectorAll('input[name="programs"]:checked')).map(cb => cb.value);
        if (selectedPrograms.length === 0) {
            alert('Please select at least one program');
            return null;
        }

        const filteredClassrooms = [];
        if (window.classroomsData) {
            window.classroomsData.forEach(classroom => {
                // Include classroom only if it belongs to the selected department
                if (classroom.department === selectedDepartment) {
                    if (!filteredClassrooms.includes(classroom.id)) {
                        filteredClassrooms.push(classroom.id);
                    }
                }
            });
        }

        const subjects = [];
        const visibleSubjectContainers = Array.from(document.querySelectorAll('#section-3 .flex.flex-col')).filter(container =>
            container.style.display !== 'none'
        );

        visibleSubjectContainers.forEach((container, index) => {
            const subjectNameElement = container.querySelector('.font-medium');
            const subjectIdElement = container.querySelector('.text-gray-500');
            const dragArea = container.querySelector('.drag-area');

            if (!subjectNameElement || !subjectIdElement) {
                return;
            }

            const subjectName = subjectNameElement.textContent.trim();
            const subjectId = subjectIdElement.textContent.trim();

            const subjectData = window.subjectsData?.find(s => s.name === subjectName && s.subject_id === subjectId);

            if (!subjectData) {
                return;
            }

            let assignedClassroom = null;
            if (dragArea) {
                const classroomElement = dragArea.querySelector('[draggable="true"]');
                if (classroomElement) {
                    const classroomIdElement = classroomElement.querySelector('.font-large');
                    if (classroomIdElement) {
                        assignedClassroom = classroomIdElement.textContent.trim();
                    }
                }
            }

            const subject = {
                subject_id: subjectData.subject_id,
                name: subjectData.name,
                lecturer_id: subjectData.lecturer,
                level: subjectData.level,
                duration: parseFloat(subjectData.duration)
            };

            if (assignedClassroom) {
                subject.classroom_id = assignedClassroom;
            }

            subjects.push(subject);
        });

        //Customization constraints
        // Collect selected working days
        const dayLabels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        const selectedDays = Array.from(
            document.querySelectorAll('.working-day-checkbox:checked')
        )
            .map(cb => cb.value.toLowerCase())
            .map(val => {
                if (val === 'mon') return 1;
                if (val === 'tue') return 2;
                if (val === 'wed') return 3;
                if (val === 'thu') return 4;
                if (val === 'fri') return 5;
                if (val === 'sat') return 6;
                if (val === 'sun') return 7;
            })
            .filter(Boolean);




        // Collect working hours
        const workingHourInputs = document.querySelectorAll('.mb-8:nth-of-type(2) input[type="time"]');
        const workingStart = workingHourInputs[0]?.value || "";
        const workingEnd = workingHourInputs[1]?.value || "";
        const workingHours = `${workingStart.replace(':', '')}-${workingEnd.replace(':', '')}`;

        // Collect lunch break hours
        const lunchInputs = document.querySelectorAll('.mb-8:nth-of-type(3) input[type="time"]');
        const lunchStart = lunchInputs[0]?.value || "";
        const lunchEnd = lunchInputs[1]?.value || "";
        const lunchBreak = `${lunchStart.replace(':', '')}-${lunchEnd.replace(':', '')}`;



        const operations = {
            days: selectedDays,
            working_hours: workingHours,
            lunch_break: lunchBreak
        };

        // ✅ Multiple Lecturer Constraints
        // ✅ Multiple Lecturer Constraints (auto-detect lecturer name)
        // reverse the lecturer day
        const lecturers = [];
        const lecturerConstraintsElements = document.querySelectorAll('#lecturer-constraints-list .bg-gray-50');
        console.log(`🔍 [FRONTEND DEBUG] Found ${lecturerConstraintsElements.length} lecturer constraint elements`);

        document.querySelectorAll('#lecturer-constraints-list .bg-gray-50').forEach((container, idx) => {
            const lecturerId = container.dataset.lecturerId;

            // Try to get lecturer name directly from dataset, or look up from global data
            let lecturerName = container.dataset.lecturerName;

            if (!lecturerName && window.lecturersData) {
                const match = window.lecturersData.find(l => l.lecturer_id === lecturerId);
                if (match) lecturerName = match.name || match.lecturer_name;
            }

            if (!lecturerName && window.subjectsData) {
                const match = window.subjectsData.find(s => s.lecturer === lecturerId || s.lecturer_id === lecturerId);
                if (match) lecturerName = match.lecturer;
            }

            if (!lecturerName) lecturerName = lecturerId;

            // Get unavailable days from dataset (e.g. ["mon", "wed"])
            const days = container.dataset.lecturerDays?.split(',') || [];

            // Map them to numbers (Mon=1 ... Fri=5)
            const unavailableNums = days.map(val => {
                val = val.toLowerCase();
                if (val === 'mon') return 1;
                if (val === 'tue') return 2;
                if (val === 'wed') return 3;
                if (val === 'thu') return 4;
                if (val === 'fri') return 5;
                if (val === 'sat') return 6;
                if (val === 'sun') return 7;
            }).filter(Boolean);

            // ✅ Now invert: available = all weekdays except unavailable
            const allWeekdays = [1, 2, 3, 4, 5]; // Mon–Fri
            const availableDays = allWeekdays.filter(d => !unavailableNums.includes(d));

            console.log(`  📌 Lecturer ${idx}: ${lecturerName}, unavailable on ${days}, available: ${availableDays}`);

            if (lecturerName && availableDays.length) {
                lecturers.push({
                    lecturer_name: lecturerName,
                    lecturer_availability: availableDays
                });
                console.log(`  ✅ Added: ${lecturerName}`);
            }
        });




        // ✅ Multiple Subject Constraints
        //reverse the day of availability to be passed to json
        const subjectConstraintsElements = document.querySelectorAll('#subject-constraints-list .bg-gray-50');
        console.log(`🔍 [FRONTEND DEBUG] Found ${subjectConstraintsElements.length} subject constraint elements`);

        document.querySelectorAll('#subject-constraints-list .bg-gray-50').forEach((container, idx) => {
            const subjectId = container.dataset.subjectId;
            const days = container.dataset.subjectDays?.split(',') || [];

            // Map unavailable days to numbers (Mon=1 ... Fri=5)
            const unavailableNums = days.map(val => {
                val = val.toLowerCase();
                if (val === 'mon') return 1;
                if (val === 'tue') return 2;
                if (val === 'wed') return 3;
                if (val === 'thu') return 4;
                if (val === 'fri') return 5;
                if (val === 'sat') return 6;
                if (val === 'sun') return 7;
            }).filter(Boolean);

            // ✅ Invert to get available days (Mon–Fri)
            const allWeekdays = [1, 2, 3, 4, 5];
            const availableDays = allWeekdays.filter(d => !unavailableNums.includes(d));

            console.log(`  📌 Subject ${idx}: ${subjectId}, cannot schedule on ${days}, available: ${availableDays}`);

            const targetSubject = subjects.find(s => s.subject_id === subjectId);
            if (targetSubject) {
                // ✅ Always include availability (even if all days)
                targetSubject.subject_availability = availableDays;
                console.log(`  ✅ Added availability to subject: ${subjectId}`);
            } else {
                console.log(`  ⚠️ Subject not found: ${subjectId}`);
            }
        });



        // ✅ Final JSON
        const requestData = {
            operations: operations,
            programmes: selectedPrograms,
            classrooms: filteredClassrooms,
            lecturers: lecturers,
            subjects: subjects
        };

        return requestData;
    }

    // -------------------------- Filter Logic for Program --------------------------
    function filterProgramsByDepartment() {
        const selectedDepartment = document.querySelector('input[name="departments"]:checked')?.value;

        document.querySelectorAll('.program-item').forEach(programItem => {
            const programDepartment = programItem.dataset.department;

            // Show program only if it matches selected department
            if (!selectedDepartment || programDepartment === selectedDepartment) {
                programItem.style.display = '';
            } else {
                programItem.style.display = 'none';
            }
        });

        // Update section 2 proceed button status after filtering
        updateSection2ProceedButton();
    }

    function updateSection2ProceedButton() {
        const visiblePrograms = Array.from(document.querySelectorAll('.program-item')).filter(item =>
            item.style.display !== 'none'
        );
        const checkedPrograms = visiblePrograms.filter(item =>
            item.querySelector('input[name="programs"]').checked
        );

        section2Proceed.disabled = checkedPrograms.length === 0;
    }

    // Run filtering when department selection changes
    deptRadios.forEach(radio => {
        radio.addEventListener('change', function () {
            section1Proceed.disabled = !Array.from(deptRadios).some(rd => rd.checked);
        });
    });

    // run once on load in case something was pre‑checked
    filterProgramsByDepartment();

    // Initial check for section 2 proceed button status
    updateSection2ProceedButton();

    // Function to clear Section 2 program selections
    function clearSection2Selections() {
        // Uncheck all program checkboxes
        programCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });

        // Update section 2 proceed button state
        updateSection2ProceedButton();
    }

    // Function to clear Section 3 drag and drop assignments
    function clearSection3Assignments() {
        // Reset all subject items visibility to show all subjects
        document.querySelectorAll('#section-3 .subject-item, #section-3 .flex.flex-col').forEach(item => {
            item.style.display = '';
        });

        // Reset all classroom items visibility to show all classrooms
        document.querySelectorAll('#section-3 .classroom-item').forEach(item => {
            item.style.display = '';
        });

        // Reset only non-pre-assigned drag areas to initial state
        dragAreas.forEach(area => {
            // Check if this area has a pre-assigned classroom
            const hasPreAssigned = area.querySelector('[draggable="true"]');
            if (!hasPreAssigned) {
                area.innerHTML = '<div class="text-center text-gray-400 text-sm py-2">Drop classroom here or leave it blank for random assignment</div>';
            }
        });

        // Reset generate button state
        generateBtn.disabled = true;
    }

    // Setup batch highlighting functionality
    function setupBatchHighlighting() {
        const batchButtons = document.querySelectorAll('.batch-btn');
        const clearBtn = document.getElementById('clear-batch-selection');
        let activeBatch = null;

        // Clear selection button
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                batchButtons.forEach(btn => btn.classList.remove('active'));
                clearHighlights();
                activeBatch = null;
            });
        }

        // Batch button click handler
        batchButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const batchId = btn.dataset.batchId;
                const batchName = btn.dataset.batchName;
                const subjects = JSON.parse(btn.dataset.subjects);

                // Toggle active state
                if (activeBatch === batchId) {
                    btn.classList.remove('active');
                    clearHighlights();
                    activeBatch = null;
                } else {
                    // Remove active class from all buttons
                    batchButtons.forEach(b => b.classList.remove('active'));
                    // Add active class to clicked button
                    btn.classList.add('active');
                    activeBatch = batchId;
                    // Highlight subjects in table
                    highlightSubjectsInTimetable(subjects);
                }
            });

            // Hover handler
            btn.addEventListener('mouseenter', () => {
                if (!activeBatch) {
                    const subjects = JSON.parse(btn.dataset.subjects);
                    highlightSubjectsInTimetable(subjects, true);
                }
            });

            btn.addEventListener('mouseleave', () => {
                if (!activeBatch) {
                    clearHighlights();
                }
            });
        });
    }

    // Highlight subjects in timetable
    function highlightSubjectsInTimetable(subjectIds, isHover = false) {
        const eventCells = document.querySelectorAll('.event');

        eventCells.forEach(cell => {
            const codeElement = cell.querySelector('.event-code');
            const subjectId = codeElement ? codeElement.textContent.trim() : '';

            if (subjectIds.includes(subjectId)) {
                cell.classList.add('batch-highlight');
                cell.classList.remove('batch-dim');
            } else {
                cell.classList.remove('batch-highlight');
                if (!isHover) {
                    cell.classList.add('batch-dim');
                } else {
                    cell.classList.add('batch-dim');
                }
            }
        });
    }

    // Clear all highlights
    function clearHighlights() {
        const eventCells = document.querySelectorAll('.event');
        eventCells.forEach(cell => {
            cell.classList.remove('batch-highlight');
            cell.classList.remove('batch-dim');
        });
    }

    // Helper function to get subject name from subject ID
    function getSubjectName(subjectId) {
        if (!window.subjectsData) {
            return subjectId;
        }

        const subject = window.subjectsData.find(s => s.subject_id === subjectId);
        const name = subject ? subject.name : subjectId;
        return name;
    }

    // Function to get color for a subject based on its level
    function getSubjectColor(subjectId) {
        // Find the subject data to get its level
        const subject = window.subjectsData.find(s => s.subject_id === subjectId);

        if (!subject) {
            return colors.blue.hex;
        }

        // Find the tagging subject that matches this level to get the color
        const taggingSubject = window.taggingSubjectsData.find(ts => ts.id === subject.level);

        if (!taggingSubject || !taggingSubject.color) {
            return colors.blue.hex;
        }

        // Get the color name from tagging_subjects and convert to lowercase for matching
        const colorName = taggingSubject.color.toLowerCase();

        // Return the hex color from the colors object, or default if color not found
        return colors[colorName] ? colors[colorName].hex : colors.blue.hex;
    }

    // Function to get lighter background color (for cell background)
    function getLighterColor(hexColor) {
        // Convert hex to RGB
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);

        // Create lighter version by blending with white
        const lightR = Math.round(r + (255 - r) * 0.8);
        const lightG = Math.round(g + (255 - g) * 0.8);
        const lightB = Math.round(b + (255 - b) * 0.8);

        return `rgb(${lightR}, ${lightG}, ${lightB})`;
    }

    // Function to get border color (slightly darker than the main color)
    function getBorderColor(hexColor) {
        // Convert hex to RGB
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);

        // Create darker version for border
        const darkR = Math.round(r * 0.7);
        const darkG = Math.round(g * 0.7);
        const darkB = Math.round(b * 0.7);

        return `rgb(${darkR}, ${darkG}, ${darkB})`;
    }

    // Function to get text color (darker version for good contrast)
    function getTextColor(hexColor) {
        return '#000000'; // Black text
    }

});
// ✅ Dynamically disable unavailable subject days based on lecturer constraints
document.addEventListener("DOMContentLoaded", () => {
    const lecturerConstraintsList = document.getElementById("lecturer-constraints-list");
    const subjectContainer = document.getElementById("subject-constraints-container");

    // 🧠 Build a quick lookup: lecturer name → unavailable days
    function getUnavailableDaysMap() {
        const map = {};
        lecturerConstraintsList.querySelectorAll("[data-lecturer-name]").forEach(div => {
            const lecturerName = div.dataset.lecturerName?.trim();
            const unavailableDays = (div.dataset.lecturerDays || "")
                .split(",")
                .map(d => d.trim())
                .filter(Boolean);
            if (lecturerName) {
                map[lecturerName] = unavailableDays;
            }
        });
        return map;
    }

    // 🧩 Apply grey-out for subjects based on their lecturer’s unavailability
    function applyGreyOut() {
        const unavailableMap = getUnavailableDaysMap();

        document.querySelectorAll("#subject-constraints-container .bg-gray-50").forEach(block => {
            const subjectSelect = block.querySelector("#subject-select");
            const checkboxes = block.querySelectorAll(".subject-day-checkbox");

            // reset all
            checkboxes.forEach(cb => {
                cb.disabled = false;
                cb.parentElement.classList.remove("opacity-50");
                cb.removeAttribute("title");
            });

            if (!subjectSelect || !subjectSelect.value) return;

            // 🧠 find which lecturer teaches this subject
            const subjectId = subjectSelect.value;
            const subjectData = window.subjectsData.find(
                s => s.subject_id === subjectId || s.id === subjectId
            );

            if (!subjectData) return;

            // 🔍 get lecturer name directly (since Firestore stores it as "lecturer")
            const lecturerName = subjectData.lecturer?.trim();
            if (!lecturerName) return;

            const unavailableDays = unavailableMap[lecturerName];
            if (!unavailableDays || unavailableDays.length === 0) return;

            // 🧩 disable only unavailable days
            checkboxes.forEach(cb => {
                if (unavailableDays.includes(cb.value)) {
                    cb.disabled = true;
                    cb.checked = false;
                    cb.title = `${lecturerName} is unavailable on ${cb.value}`;
                    cb.parentElement.classList.add("opacity-50");
                }
            });
        });
    }

    // 🔄 run when subject is changed
    subjectContainer.addEventListener("change", e => {
        if (e.target.matches("#subject-select")) applyGreyOut();
    });

    // 🔄 reapply when new constraints added or removed
    document.getElementById("add-subject-constraint")?.addEventListener("click", () => {
        setTimeout(applyGreyOut, 300);
    });
    document.getElementById("add-lecturer-constraint")?.addEventListener("click", () => {
        setTimeout(applyGreyOut, 300);
    });
    lecturerConstraintsList.addEventListener("click", e => {
        if (e.target.classList.contains("remove-btn")) {
            setTimeout(applyGreyOut, 300);
        }
    });

    // initial run
    applyGreyOut();
});







