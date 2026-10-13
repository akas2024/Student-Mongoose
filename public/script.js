/**
 * Academic Portal Frontend Script
 * Connects to Express API running at http://localhost:4000
 */

// API Base URL - Uses current origin if served from localhost:4000, otherwise points to http://localhost:4000
const API_BASE = window.location.origin.includes(":4000") 
  ? window.location.origin 
  : "http://localhost:4000";

// In-memory data store for quick edits
let studentsList = [];
let facultyList = [];

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  // Load initial data for the faculty portal
  loadFaculty();
  loadStudents();
});

// ==========================================
// TAB SWITCHING
// ==========================================
function switchTab(tabName) {
  const studentTab = document.getElementById("tab-student");
  const facultyTab = document.getElementById("tab-faculty");
  const btnStudent = document.getElementById("btn-tab-student");
  const btnFaculty = document.getElementById("btn-tab-faculty");

  if (tabName === "student") {
    studentTab.classList.add("active");
    facultyTab.classList.remove("active");
    btnStudent.classList.add("active");
    btnFaculty.classList.remove("active");
  } else {
    facultyTab.classList.add("active");
    studentTab.classList.remove("active");
    btnFaculty.classList.add("active");
    btnStudent.classList.remove("active");
    // Refresh tables when opening faculty tab
    loadStudents();
    loadFaculty();
  }
}

function switchFacultySubTab(subTabName) {
  const studentsPanel = document.getElementById("faculty-students-panel");
  const facultyPanel = document.getElementById("faculty-records-panel");
  const btnStudents = document.getElementById("sub-tab-students-btn");
  const btnFaculty = document.getElementById("sub-tab-faculty-btn");

  if (subTabName === "students") {
    studentsPanel.classList.add("active");
    facultyPanel.classList.remove("active");
    btnStudents.classList.add("active");
    btnFaculty.classList.remove("active");
  } else {
    facultyPanel.classList.add("active");
    studentsPanel.classList.remove("active");
    btnFaculty.classList.add("active");
    btnStudents.classList.remove("active");
  }
}

// ==========================================
// NOTIFICATIONS
// ==========================================
let notificationTimeout = null;

function showNotification(message, type = "success") {
  const container = document.getElementById("notification");
  const messageEl = document.getElementById("notification-message");

  clearTimeout(notificationTimeout);

  container.className = `notification ${type}`;
  messageEl.textContent = message;
  container.classList.remove("hidden");

  // Auto-hide after 5 seconds
  notificationTimeout = setTimeout(() => {
    hideNotification();
  }, 5000);
}

function hideNotification() {
  const container = document.getElementById("notification");
  container.classList.add("hidden");
}

// ==========================================
// TAB 1: STUDENT PROFILE LOOKUP
// ==========================================
async function searchStudentProfile(event) {
  event.preventDefault();
  const studentIdInput = document.getElementById("search-student-id");
  const studentId = studentIdInput.value.trim();

  if (!studentId) {
    showNotification("Please enter a valid Student ID", "error");
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/students/${studentId}`);
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Student not found");
    }

    const student = data.data;
    displayStudentProfile(student);
    showNotification("Student profile loaded successfully!", "success");
  } catch (error) {
    document.getElementById("student-profile-container").classList.add("hidden");
    showNotification(error.message, "error");
  }
}

function displayStudentProfile(student) {
  const container = document.getElementById("student-profile-container");
  
  document.getElementById("profile-name").textContent = student.name;
  document.getElementById("profile-avatar").textContent = (student.name || "S").charAt(0).toUpperCase();
  document.getElementById("profile-course").textContent = `${student.course} (Sem ${student.semester})`;
  document.getElementById("profile-id").textContent = student._id;
  document.getElementById("profile-roll").textContent = student.rollNo;
  document.getElementById("profile-email").textContent = student.email;
  document.getElementById("profile-semester").textContent = `Semester ${student.semester}`;

  const mentorBox = document.getElementById("mentor-details");
  if (student.facultyId && typeof student.facultyId === "object") {
    mentorBox.innerHTML = `
      <p><strong>${student.facultyId.name}</strong> &bull; ${student.facultyId.designation || ""}</p>
      <p style="font-size: 13px; color: #6b7280;">Department: ${student.facultyId.department} | Email: ${student.facultyId.email}</p>
    `;
  } else {
    mentorBox.innerHTML = `<p style="color: #6b7280; font-style: italic;">No faculty mentor assigned yet.</p>`;
  }

  container.classList.remove("hidden");
}

// ==========================================
// TAB 2: FACULTY - STUDENTS MANAGEMENT
// ==========================================

// Fetch and render all students
async function loadStudents() {
  const tbody = document.getElementById("students-table-body");
  const countEl = document.getElementById("students-count");

  try {
    const response = await fetch(`${API_BASE}/api/faculty/students`);
    const result = await response.json();

    if (!response.ok) throw new Error(result.message || "Failed to load students");

    studentsList = result.data || [];
    countEl.textContent = studentsList.length;

    if (studentsList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center loading-cell">No students registered yet. Add one above!</td></tr>`;
      return;
    }

    tbody.innerHTML = studentsList.map((s) => {
      const mentor = s.facultyId ? `${s.facultyId.name} (${s.facultyId.department})` : "<em>None</em>";
      return `
        <tr>
          <td><strong>${escapeHtml(s.rollNo)}</strong></td>
          <td>${escapeHtml(s.name)}</td>
          <td>${escapeHtml(s.email)}</td>
          <td>${escapeHtml(s.course)}</td>
          <td>${escapeHtml(String(s.semester))}</td>
          <td>${mentor}</td>
          <td>
            <span class="code-badge" title="Click to copy ID" onclick="copyToClipboard('${s._id}')">
              ${s._id.substring(0, 8)}... 📋
            </span>
          </td>
          <td>
            <div class="actions-cell">
              <button class="btn btn-small btn-secondary" onclick="editStudent('${s._id}')">✏️ Edit</button>
              <button class="btn btn-small btn-danger" onclick="deleteStudent('${s._id}')">🗑️ Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center loading-cell" style="color: red;">Error: ${escapeHtml(error.message)}</td></tr>`;
  }
}

// Handle Add/Edit Student form submit
async function handleStudentFormSubmit(event) {
  event.preventDefault();

  const id = document.getElementById("student-id-field").value;
  const name = document.getElementById("student-name").value.trim();
  const email = document.getElementById("student-email").value.trim();
  const rollNo = document.getElementById("student-roll").value.trim();
  const course = document.getElementById("student-course").value.trim();
  const semester = parseInt(document.getElementById("student-semester").value, 10);
  const facultyId = document.getElementById("student-faculty").value || null;

  const payload = { name, email, rollNo, course, semester, facultyId };

  try {
    const isEdit = Boolean(id);
    const url = isEdit ? `${API_BASE}/api/faculty/students/${id}` : `${API_BASE}/api/students`;
    const method = isEdit ? "PUT" : "POST";

    const response = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to save student");
    }

    showNotification(isEdit ? "Student updated successfully!" : "Student added successfully!", "success");
    cancelStudentEdit();
    loadStudents();
  } catch (error) {
    showNotification(error.message, "error");
  }
}

// Populate form for editing student
function editStudent(id) {
  const student = studentsList.find((s) => s._id === id);
  if (!student) return;

  document.getElementById("student-id-field").value = student._id;
  document.getElementById("student-name").value = student.name;
  document.getElementById("student-email").value = student.email;
  document.getElementById("student-roll").value = student.rollNo;
  document.getElementById("student-course").value = student.course;
  document.getElementById("student-semester").value = student.semester;
  document.getElementById("student-faculty").value = student.facultyId ? (student.facultyId._id || student.facultyId) : "";

  document.getElementById("student-form-title").textContent = "✏️ Edit Student Details";
  document.getElementById("btn-save-student").innerHTML = "<span>💾</span> Update Student";
  document.getElementById("btn-cancel-student").classList.remove("hidden");

  // Scroll to form smoothly
  document.getElementById("student-form").scrollIntoView({ behavior: "smooth" });
}

// Reset student form to Add mode
function cancelStudentEdit() {
  document.getElementById("student-form").reset();
  document.getElementById("student-id-field").value = "";
  document.getElementById("student-form-title").textContent = "➕ Add New Student";
  document.getElementById("btn-save-student").innerHTML = "<span>💾</span> Save Student";
  document.getElementById("btn-cancel-student").classList.add("hidden");
}

// Delete student
async function deleteStudent(id) {
  if (!confirm("Are you sure you want to delete this student record?")) return;

  try {
    const response = await fetch(`${API_BASE}/api/faculty/students/${id}`, {
      method: "DELETE"
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to delete student");
    }

    showNotification("Student deleted successfully!", "success");
    loadStudents();
  } catch (error) {
    showNotification(error.message, "error");
  }
}

// ==========================================
// TAB 2: FACULTY RECORDS MANAGEMENT
// ==========================================

// Fetch and render faculty records
async function loadFaculty() {
  const tbody = document.getElementById("faculty-table-body");
  const countEl = document.getElementById("faculty-count");
  const selectDropdown = document.getElementById("student-faculty");

  try {
    const response = await fetch(`${API_BASE}/api/faculty`);
    const result = await response.json();

    if (!response.ok) throw new Error(result.message || "Failed to load faculty");

    facultyList = result.data || [];
    countEl.textContent = facultyList.length;

    // Update faculty dropdown in Student form
    const currentVal = selectDropdown.value;
    selectDropdown.innerHTML = `<option value="">-- No Faculty Assigned --</option>` +
      facultyList.map(f => `<option value="${f._id}">${escapeHtml(f.name)} (${escapeHtml(f.department)})</option>`).join("");
    selectDropdown.value = currentVal;

    if (facultyList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center loading-cell">No faculty members registered yet. Add one above!</td></tr>`;
      return;
    }

    tbody.innerHTML = facultyList.map((f) => `
      <tr>
        <td><strong>${escapeHtml(f.name)}</strong></td>
        <td>${escapeHtml(f.email)}</td>
        <td>${escapeHtml(f.department)}</td>
        <td>${escapeHtml(f.designation)}</td>
        <td>
          <span class="code-badge" title="Click to copy ID" onclick="copyToClipboard('${f._id}')">
            ${f._id.substring(0, 8)}... 📋
          </span>
        </td>
        <td>
          <div class="actions-cell">
            <button class="btn btn-small btn-secondary" onclick="editFaculty('${f._id}')">✏️ Edit</button>
            <button class="btn btn-small btn-danger" onclick="deleteFaculty('${f._id}')">🗑️ Delete</button>
          </div>
        </td>
      </tr>
    `).join("");
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center loading-cell" style="color: red;">Error: ${escapeHtml(error.message)}</td></tr>`;
  }
}

// Handle Add/Edit Faculty form submit
async function handleFacultyFormSubmit(event) {
  event.preventDefault();

  const id = document.getElementById("faculty-id-field").value;
  const name = document.getElementById("faculty-name").value.trim();
  const email = document.getElementById("faculty-email").value.trim();
  const department = document.getElementById("faculty-department").value.trim();
  const designation = document.getElementById("faculty-designation").value.trim();

  const payload = { name, email, department, designation };

  try {
    const isEdit = Boolean(id);
    const url = isEdit ? `${API_BASE}/api/faculty/${id}` : `${API_BASE}/api/faculty`;
    const method = isEdit ? "PUT" : "POST";

    const response = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to save faculty");
    }

    showNotification(isEdit ? "Faculty member updated successfully!" : "Faculty member registered successfully!", "success");
    cancelFacultyEdit();
    loadFaculty();
    loadStudents(); // Refresh student mentor display if updated
  } catch (error) {
    showNotification(error.message, "error");
  }
}

// Populate form for editing faculty
function editFaculty(id) {
  const faculty = facultyList.find((f) => f._id === id);
  if (!faculty) return;

  document.getElementById("faculty-id-field").value = faculty._id;
  document.getElementById("faculty-name").value = faculty.name;
  document.getElementById("faculty-email").value = faculty.email;
  document.getElementById("faculty-department").value = faculty.department;
  document.getElementById("faculty-designation").value = faculty.designation;

  document.getElementById("faculty-form-title").textContent = "✏️ Edit Faculty Details";
  document.getElementById("btn-save-faculty").innerHTML = "<span>💾</span> Update Faculty";
  document.getElementById("btn-cancel-faculty").classList.remove("hidden");

  document.getElementById("faculty-form").scrollIntoView({ behavior: "smooth" });
}

// Reset faculty form to Add mode
function cancelFacultyEdit() {
  document.getElementById("faculty-form").reset();
  document.getElementById("faculty-id-field").value = "";
  document.getElementById("faculty-form-title").textContent = "➕ Add New Faculty Member";
  document.getElementById("btn-save-faculty").innerHTML = "<span>💾</span> Save Faculty";
  document.getElementById("btn-cancel-faculty").classList.add("hidden");
}

// Delete faculty
async function deleteFaculty(id) {
  if (!confirm("Are you sure you want to delete this faculty member? Assigned students will have their mentor unlinked.")) return;

  try {
    const response = await fetch(`${API_BASE}/api/faculty/${id}`, {
      method: "DELETE"
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to delete faculty");
    }

    showNotification("Faculty deleted successfully!", "success");
    loadFaculty();
    loadStudents();
  } catch (error) {
    showNotification(error.message, "error");
  }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showNotification(`Copied ID to clipboard: ${text}`, "success");
    });
  } else {
    // Fallback
    const input = document.createElement("input");
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    document.body.removeChild(input);
    showNotification(`Copied ID: ${text}`, "success");
  }
}

function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
