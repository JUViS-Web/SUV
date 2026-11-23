

/* SUV – Zentrale Fach-Lehrkraft-Zuordnung */

window.suvTeacherSubjectMatrix = {
  teachers: [],
  subjects: [],
  assignments: []
};

async function loadTeacherSubjectMatrix() {
  const container = document.getElementById("teacherSubjectMatrix");
  const message = document.getElementById("teacherSubjectMatrixMessage");

  if (!container) return;

  container.textContent = "Zuordnungen werden geladen ...";
  message.textContent = "";

  const [teacherResult, subjectResult, assignmentResult] =
    await Promise.all([
      suvDb
        .from("teachers")
        .select("id, first_name, last_name, short_code")
        .order("last_name", { ascending: true }),

      suvDb
        .from("subjects")
        .select("id, name, short_code")
        .order("name", { ascending: true }),

      suvDb
        .from("teacher_subjects")
        .select("teacher_id, subject_id")
    ]);

  if (teacherResult.error || subjectResult.error || assignmentResult.error) {
    container.textContent =
      "Fehler beim Laden der Daten: " +
      (
        teacherResult.error ||
        subjectResult.error ||
        assignmentResult.error
      ).message;
    return;
  }

  window.suvTeacherSubjectMatrix.teachers = teacherResult.data || [];
  window.suvTeacherSubjectMatrix.subjects = subjectResult.data || [];
  window.suvTeacherSubjectMatrix.assignments = assignmentResult.data || [];

  const filter = document.getElementById("teacherSubjectMatrixFilter");
  const previousFilter = filter.value;

  filter.innerHTML = '<option value="">Alle Fächer anzeigen</option>';

  window.suvTeacherSubjectMatrix.subjects.forEach(subject => {
    const option = document.createElement("option");
    option.value = subject.id;
    option.textContent = subject.name;
    filter.appendChild(option);
  });

  if (
    window.suvTeacherSubjectMatrix.subjects.some(
      subject => subject.id === previousFilter
    )
  ) {
    filter.value = previousFilter;
  }

  renderTeacherSubjectMatrix();
}

function renderTeacherSubjectMatrix() {
  const container = document.getElementById("teacherSubjectMatrix");
  const search = document
    .getElementById("teacherSubjectMatrixSearch")
    .value.trim()
    .toLowerCase();

  const selectedSubject =
    document.getElementById("teacherSubjectMatrixFilter").value;

  const state = window.suvTeacherSubjectMatrix;

  const visibleTeachers = state.teachers.filter(teacher => {
    const fullName =
      `${teacher.first_name || ""} ${teacher.last_name || ""} ${teacher.short_code || ""}`
        .toLowerCase();

    return fullName.includes(search);
  });

  const visibleSubjects = selectedSubject
    ? state.subjects.filter(subject => subject.id === selectedSubject)
    : state.subjects;

  if (!visibleTeachers.length || !visibleSubjects.length) {
    container.textContent = "Keine passenden Einträge gefunden.";
    return;
  }

  container.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.style.cssText = `
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  `;

  const table = document.createElement("table");
  table.style.cssText = `
    width: 100%;
    min-width: 600px;
    border-collapse: collapse;
    font-size: 13px;
  `;

  const thead = document.createElement("thead");
  const header = document.createElement("tr");

  const teacherHeading = document.createElement("th");
  teacherHeading.textContent = "Lehrkraft";
  teacherHeading.style.cssText = `
    position: sticky;
    left: 0;
    background: #17243a;
    color: white;
    padding: 10px;
    text-align: left;
    z-index: 2;
  `;
  header.appendChild(teacherHeading);

  visibleSubjects.forEach(subject => {
    const heading = document.createElement("th");
    heading.style.cssText = `
      padding: 8px;
      background: #17243a;
      color: white;
      text-align: center;
      min-width: 115px;
    `;

    const title = document.createElement("div");
    title.textContent =
      subject.name +
      (subject.short_code ? ` (${subject.short_code})` : "");

    const assignAllButton = document.createElement("button");
    assignAllButton.type = "button";
    assignAllButton.textContent = "Alle zuordnen";
    assignAllButton.style.cssText = `
      display: block;
      margin: 7px auto 0;
      padding: 5px 8px;
      font-size: 11px;
      cursor: pointer;
    `;

    assignAllButton.addEventListener("click", () => {
      assignSubjectToAllTeachers(subject, assignAllButton);
    });

    heading.appendChild(title);
    heading.appendChild(assignAllButton);
    header.appendChild(heading);
  });

  thead.appendChild(header);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  visibleTeachers.forEach(teacher => {
    const row = document.createElement("tr");

    const nameCell = document.createElement("td");
    nameCell.textContent =
      `${teacher.last_name}, ${teacher.first_name}` +
      (teacher.short_code ? ` (${teacher.short_code})` : "");

    nameCell.style.cssText = `
      position: sticky;
      left: 0;
      background: white;
      padding: 10px;
      border-bottom: 1px solid #ddd;
      font-weight: 600;
      z-index: 1;
    `;

    row.appendChild(nameCell);

    visibleSubjects.forEach(subject => {
      const cell = document.createElement("td");
      cell.style.cssText = `
        padding: 10px;
        text-align: center;
        border-bottom: 1px solid #ddd;
      `;

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = state.assignments.some(
        item =>
          item.teacher_id === teacher.id &&
          item.subject_id === subject.id
      );

      checkbox.style.cssText = `
        width: 22px;
        height: 22px;
        cursor: pointer;
      `;

      checkbox.addEventListener("change", async () => {
        await changeTeacherSubject(teacher, subject, checkbox);
      });

      cell.appendChild(checkbox);
      row.appendChild(cell);
    });

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  wrapper.appendChild(table);
  container.appendChild(wrapper);
}

async function changeTeacherSubject(teacher, subject, checkbox) {
  const state = window.suvTeacherSubjectMatrix;
  const message = document.getElementById("teacherSubjectMatrixMessage");

  const wasChecked = !checkbox.checked;

  const teacherAssignments = state.assignments.filter(
    item => item.teacher_id === teacher.id
  );

  if (!checkbox.checked && teacherAssignments.length <= 2) {
    checkbox.checked = true;
    message.textContent =
      "Mindestens 2 Fächer pro Lehrkraft müssen zugeordnet bleiben.";
    return;
  }

  checkbox.disabled = true;
  message.textContent = "Änderung wird gespeichert ...";

  let result;

  if (checkbox.checked) {
    result = await suvDb
      .from("teacher_subjects")
      .insert({
        teacher_id: teacher.id,
        subject_id: subject.id
      });
  } else {
    result = await suvDb
      .from("teacher_subjects")
      .delete()
      .eq("teacher_id", teacher.id)
      .eq("subject_id", subject.id);
  }

  if (result.error) {
    checkbox.checked = wasChecked;
    checkbox.disabled = false;
    message.textContent = "Fehler beim Speichern: " + result.error.message;
    return;
  }

  if (checkbox.checked) {
    state.assignments.push({
      teacher_id: teacher.id,
      subject_id: subject.id
    });
  } else {
    state.assignments = state.assignments.filter(
      item =>
        !(item.teacher_id === teacher.id &&
          item.subject_id === subject.id)
    );
  }

  checkbox.disabled = false;
  message.textContent = "Änderung erfolgreich gespeichert.";
}

async function assignSubjectToAllTeachers(subject, button) {
  const state = window.suvTeacherSubjectMatrix;
  const message = document.getElementById("teacherSubjectMatrixMessage");

  const missingAssignments = state.teachers
    .filter(teacher =>
      !state.assignments.some(
        item =>
          item.teacher_id === teacher.id &&
          item.subject_id === subject.id
      )
    )
    .map(teacher => ({
      teacher_id: teacher.id,
      subject_id: subject.id
    }));

  if (!missingAssignments.length) {
    message.textContent = "Dieses Fach ist bereits allen Lehrkräften zugeordnet.";
    return;
  }

  button.disabled = true;
  message.textContent =
    `Ordne ${subject.name} allen Lehrkräften zu ...`;

  const { error } = await suvDb
    .from("teacher_subjects")
    .insert(missingAssignments);

  if (error) {
    button.disabled = false;
    message.textContent =
      "Fehler beim Zuordnen: " + error.message;
    return;
  }

  state.assignments.push(...missingAssignments);

  renderTeacherSubjectMatrix();

  message.textContent =
    `${subject.name} wurde ${missingAssignments.length} weiteren Lehrkräften zugeordnet.`;
}

// Suche und Fachfilter

document
  .getElementById("teacherSubjectMatrixSearch")
  .addEventListener("input", renderTeacherSubjectMatrix);

document
  .getElementById("teacherSubjectMatrixFilter")
  .addEventListener("change", renderTeacherSubjectMatrix);

// Matrix beim Öffnen laden

document
  .querySelector('[data-page="teacherSubjects"]')
  .addEventListener("click", loadTeacherSubjectMatrix);


