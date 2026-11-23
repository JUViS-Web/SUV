
/* SUV – Sammelimport der Lehrbefähigungen */

window.suvTeacherSubjectImport = {
  preview: [],
  ready: false
};

function normalizeImportValue(value) {
  return String(value || "").trim().toLocaleLowerCase("de-DE");
}

function parseTeacherSubjectImport(text) {
  const lines = text.split(/\r?\n/);
  const rows = [];

  lines.forEach((line, index) => {
    if (!line.trim()) return;

    let code = "";
    let qualificationText = "";

    if (line.includes("\t")) {
      const parts = line.split("\t");
      code = parts.shift().trim();
      qualificationText = parts.join(" ").trim();
    } else {
      const match = line.trim().match(/^(\S+)\s+(.+)$/);

      if (!match) {
        rows.push({
          line: index + 1,
          code: "",
          error: "Zeile konnte nicht gelesen werden."
        });
        return;
      }

      code = match[1].trim();
      qualificationText = match[2].trim();
    }

    if (
      ["kürzel", "kuerzel", "lehrkraft"].includes(
        normalizeImportValue(code)
      )
    ) {
      return;
    }

    const groups = qualificationText
      .split(",")
      .map(value => value.trim())
      .filter(Boolean);

    rows.push({
      line: index + 1,
      code,
      groups
    });
  });

  return rows;
}

async function createTeacherSubjectImportPreview() {
  const input = document.getElementById("teacherSubjectImportText");
  const previewContainer =
    document.getElementById("teacherSubjectImportPreview");
  const saveButton =
    document.getElementById("teacherSubjectImportSaveButton");

  saveButton.disabled = true;
  previewContainer.textContent = "Importvorschau wird erstellt ...";

  window.suvTeacherSubjectImport.ready = false;
  window.suvTeacherSubjectImport.preview = [];

  const [teacherResult, subjectResult] = await Promise.all([
    suvDb
      .from("teachers")
      .select("id, first_name, last_name, short_code"),

    suvDb
      .from("subjects")
      .select("id, name, short_code, department")
  ]);

  if (teacherResult.error || subjectResult.error) {
    previewContainer.textContent =
      "Fehler beim Laden: " +
      (teacherResult.error || subjectResult.error).message;
    return;
  }

  const teachers = teacherResult.data || [];
  const subjects = subjectResult.data || [];
  const rows = parseTeacherSubjectImport(input.value);

  if (!rows.length) {
    previewContainer.textContent =
      "Keine gültigen Daten gefunden.";
    return;
  }

  const seenCodes = new Set();

  const preview = rows.map(row => {
    const result = {
      ...row,
      teacher: null,
      resolvedGroups: [],
      resolvedSubjects: [],
      unknownGroups: [],
      placeholder: false,
      errors: [],
      valid: false
    };

    if (row.error) {
      result.errors.push(row.error);
      return result;
    }

    if (!row.code) {
      result.errors.push("Lehrkraft-Kürzel fehlt.");
      return result;
    }

    const normalizedCode = normalizeImportValue(row.code);

    if (seenCodes.has(normalizedCode)) {
      result.errors.push("Dieses Kürzel kommt mehrfach vor.");
      return result;
    }

    seenCodes.add(normalizedCode);

    result.teacher = teachers.find(
      teacher =>
        normalizeImportValue(teacher.short_code) === normalizedCode
    );

    if (!result.teacher) {
      result.errors.push(
        "Keine Lehrkraft mit diesem Kürzel gefunden."
      );
      return result;
    }

    row.groups.forEach(group => {
      if (group === "???") {
        result.placeholder = true;
        return;
      }

      const matchingSubjects = subjects.filter(
        subject =>
          normalizeImportValue(subject.department) ===
          normalizeImportValue(group)
      );

      if (!matchingSubjects.length) {
        result.unknownGroups.push(group);
        return;
      }

      result.resolvedGroups.push(group);

      matchingSubjects.forEach(subject => {
        if (
          !result.resolvedSubjects.some(
            item => item.id === subject.id
          )
        ) {
          result.resolvedSubjects.push(subject);
        }
      });
    });

    if (result.unknownGroups.length) {
      result.errors.push(
        "Unbekannte Fachgruppe: " +
        result.unknownGroups.join(", ")
      );
    }

    if (!result.resolvedSubjects.length) {
      result.errors.push(
        "Keine gültigen Fachzuordnungen vorhanden."
      );
    }

    result.valid = result.errors.length === 0;

    return result;
  });

  window.suvTeacherSubjectImport.preview = preview;

  renderTeacherSubjectImportPreview();
}

function renderTeacherSubjectImportPreview() {
  const container =
    document.getElementById("teacherSubjectImportPreview");
  const saveButton =
    document.getElementById("teacherSubjectImportSaveButton");

  const preview = window.suvTeacherSubjectImport.preview;

  container.innerHTML = "";

  const validRows = preview.filter(row => row.valid);
  const invalidRows = preview.filter(row => !row.valid);

  const summary = document.createElement("p");
  summary.textContent =
    `${validRows.length} gültige Lehrkräfte, ` +
    `${invalidRows.length} fehlerhafte Zeilen.`;
  container.appendChild(summary);

  const warning = document.createElement("p");
  warning.style.cssText =
    "padding:10px;background:#fff3cd;color:#664d03;border-radius:6px;";
  warning.textContent =
    "Hinweis: Bei gültigen Lehrkräften werden die bisherigen " +
    "Fachzuordnungen durch die importierten Zuordnungen ersetzt.";
  container.appendChild(warning);

  const tableWrapper = document.createElement("div");
  tableWrapper.style.cssText =
    "width:100%;overflow-x:auto;";

  const table = document.createElement("table");
  table.style.cssText =
    "width:100%;border-collapse:collapse;font-size:13px;";

  const header = document.createElement("tr");

  ["Kürzel / Lehrkraft", "Fachgruppen", "Ermittelte Fächer", "Status"]
    .forEach(label => {
      const th = document.createElement("th");
      th.textContent = label;
      th.style.cssText =
        "padding:8px;text-align:left;background:#17243a;color:white;";
      header.appendChild(th);
    });

  table.appendChild(header);

  preview.forEach(row => {
    const tr = document.createElement("tr");

    const teacherCell = document.createElement("td");
    teacherCell.textContent = row.teacher
      ? `${row.teacher.short_code} – ${row.teacher.first_name} ${row.teacher.last_name}`
      : row.code || "Unbekannt";
    tr.appendChild(teacherCell);

    const groupsCell = document.createElement("td");
    groupsCell.textContent = (row.groups || []).join(", ");
    tr.appendChild(groupsCell);

    const subjectsCell = document.createElement("td");
    subjectsCell.textContent =
      row.resolvedSubjects.map(subject => subject.name).join(", ");
    tr.appendChild(subjectsCell);

    const statusCell = document.createElement("td");

    if (row.errors.length) {
      statusCell.textContent = row.errors.join(" ");
      statusCell.style.color = "#b42318";
    } else {
      statusCell.textContent = "Importbereit";

      if (row.placeholder) {
        statusCell.textContent +=
          " – Zweites Fach noch nicht belegt (???).";
        statusCell.style.color = "#9a6700";
      } else {
        statusCell.style.color = "#16803c";
      }
    }

    tr.appendChild(statusCell);

    Array.from(tr.children).forEach(cell => {
      cell.style.cssText +=
        "padding:8px;border-bottom:1px solid #ddd;vertical-align:top;";
    });

    table.appendChild(tr);
  });

  tableWrapper.appendChild(table);
  container.appendChild(tableWrapper);

  const hasValidRows = validRows.length > 0;

  window.suvTeacherSubjectImport.ready = hasValidRows;
  saveButton.disabled = !hasValidRows;

  if (invalidRows.length) {
    const note = document.createElement("p");
    note.style.color = "#b42318";
    note.textContent =
      "Fehlerhafte Zeilen werden nicht importiert. " +
      "Bitte prüfe die Kürzel und Fachgruppen.";
    container.appendChild(note);
  }
}

async function saveTeacherSubjectImport() {
  const preview = window.suvTeacherSubjectImport.preview;
  const validRows = preview.filter(row => row.valid);

  const message =
    document.getElementById("teacherSubjectImportPreview");
  const saveButton =
    document.getElementById("teacherSubjectImportSaveButton");

  if (!validRows.length) return;

  const confirmed = confirm(
    `${validRows.length} Lehrkräfte werden importiert.\n\n` +
    "Ihre bisherigen Fachzuordnungen werden ersetzt.\n\n" +
    "Möchtest du fortfahren?"
  );

  if (!confirmed) return;

  saveButton.disabled = true;

  let successful = 0;
  const errors = [];

  for (const row of validRows) {
    const teacherId = row.teacher.id;
    const newSubjectIds =
      row.resolvedSubjects.map(subject => subject.id);

    const existingResult = await suvDb
      .from("teacher_subjects")
      .select("subject_id")
      .eq("teacher_id", teacherId);

    if (existingResult.error) {
      errors.push(
        `${row.code}: ${existingResult.error.message}`
      );
      continue;
    }

    const existingIds = existingResult.data.map(
      item => item.subject_id
    );

    const missingIds = newSubjectIds.filter(
      id => !existingIds.includes(id)
    );

    const obsoleteIds = existingIds.filter(
      id => !newSubjectIds.includes(id)
    );

    if (missingIds.length) {
      const insertResult = await suvDb
        .from("teacher_subjects")
        .insert(
          missingIds.map(subjectId => ({
            teacher_id: teacherId,
            subject_id: subjectId
          }))
        );

      if (insertResult.error) {
        errors.push(
          `${row.code}: ${insertResult.error.message}`
        );
        continue;
      }
    }

    if (obsoleteIds.length) {
      const deleteResult = await suvDb
        .from("teacher_subjects")
        .delete()
        .eq("teacher_id", teacherId)
        .in("subject_id", obsoleteIds);

      if (deleteResult.error) {
        errors.push(
          `${row.code}: Alte Zuordnungen konnten nicht vollständig ersetzt werden: ` +
          deleteResult.error.message
        );
        continue;
      }
    }

    successful++;
  }

  let resultText =
    `Import abgeschlossen: ${successful} von ${validRows.length} Lehrkräften verarbeitet.`;

  if (errors.length) {
    resultText += "\n\nFehler:\n" + errors.join("\n");
  }

  const result = document.createElement("p");
  result.style.whiteSpace = "pre-line";
  result.textContent = resultText;
  message.appendChild(result);

  saveButton.disabled = true;

  if (typeof loadTeacherSubjectMatrix === "function") {
    await loadTeacherSubjectMatrix();
  }
}

document
  .getElementById("teacherSubjectImportPreviewButton")
  .addEventListener("click", createTeacherSubjectImportPreview);

document
  .getElementById("teacherSubjectImportSaveButton")
  .addEventListener("click", saveTeacherSubjectImport);
