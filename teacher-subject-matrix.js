
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
      `${teacher.first_name} ${teacher.last_name} ${teacher.short_code || ""}`
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
    heading.textContent =
      subject.name +
      (subject.short_code ? ` (${subject.short_code})` : "");

    heading.style.cssText = `
      padding: 10px;
      background: #17243a;
      color: white;
      text-align: center;
      min-width: 90px;
    `;

    header.appendChild(heading);
  });

  table.appendChild(header);

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

    const teacherAssignments = state.assignments.filter(
      item => item.teacher_id === teacher.id
    );

    visibleSubjects.forEach(subject => {
      const cell = document.createElement("td");
      cell.style.cssText = `
        padding: 10px;
        text-align: center;
        border-bottom: 1px solid #ddd;
      `;

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = teacherAssignments.some(
        item => item.subject_id === subject.id
      );

      checkbox.style.cssText = `
        width: 22px;
        height: 22px;
        cursor: pointer;
      `;

      checkbox.addEventListener("change", async () => {
        checkbox.disabled = true;

        const currentAssignments =
          window.suvTeacherSubjectMatrix.assignments;

        const teacherCount = currentAssignments.filter(
          item => item.teacher_id === teacher.id
        ).length;

        if (!checkbox.checked && teacherCount <= 2) {
          checkbox.checked = true;
          checkbox.disabled = false;

          document.getElementById(
            "teacherSubjectMatrixMessage"
          ).textContent =
            "Mindestens 2 Fächer pro Lehrkraft müssen zugeordnet bleiben.";

          return;
        }

        document.getElementById(
          "teacherSubjectMatrixMessage"
        ).textContent = "Änderung wird gespeichert ...";

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
          checkbox.checked = !checkbox.checked;
          checkbox.disabled = false;

          document.getElementById(
            "teacherSubjectMatrixMessage"
          ).textContent =
            "Fehler beim Speichern: " + result.error.message;

          return;
        }

        await loadTeacherSubjectMatrix();

        document.getElementById(
          "teacherSubjectMatrixMessage"
        ).textContent = "Änderung erfolgreich gespeichert.";
      });

      cell.appendChild(checkbox);
      row.appendChild(cell);
    });

    table.appendChild(row);
  });

  wrapper.appendChild(table);
  container.appendChild(wrapper);
}

// Suche und Fachfilter

document
  .getElementById("teacherSubjectMatrixSearch")
  .addEventListener("input", renderTeacherSubjectMatrix);

document
  .getElementById("teacherSubjectMatrixFilter")
  .addEventListener("change", renderTeacherSubjectMatrix);

// Matrix beim Öffnen der Seite laden

document
  .querySelector('[data-page="teacherSubjects"]')
  .addEventListener("click", loadTeacherSubjectMatrix);

