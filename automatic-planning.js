
// SUV – Automatische Planung
// Schuljahre und Jahrgänge laden

const autoPlanningSchoolYear =
  document.getElementById("autoPlanningSchoolYear");

const autoPlanningGrade =
  document.getElementById("autoPlanningGrade");

const autoPlanningMessage =
  document.getElementById("autoPlanningMessage");

let automaticPlanningLoaded = false;
let autoPlanningCheckPassed = false;

// Schuljahre laden

async function loadAutoPlanningSchoolYears() {
  autoPlanningMessage.textContent =
    "Schuljahre werden geladen ...";

  const { data, error } = await suvDb
    .from("school_years")
    .select("id, name, is_active, start_date")
    .order("start_date", { ascending: false });

  if (error) {
    autoPlanningMessage.textContent =
      "Fehler beim Laden der Schuljahre: " + error.message;
    return;
  }

  autoPlanningSchoolYear.innerHTML =
    '<option value="">Schuljahr auswählen</option>';

  data.forEach(year => {
    const option = document.createElement("option");

    option.value = year.id;
    option.textContent =
      year.name + (year.is_active ? " (Aktuell)" : "");

    autoPlanningSchoolYear.appendChild(option);
  });

  const activeYear = data.find(year => year.is_active);

  if (activeYear) {
    autoPlanningSchoolYear.value = activeYear.id;
    await loadAutoPlanningGrades();
  } else {
    autoPlanningMessage.textContent =
      "Bitte wähle ein Schuljahr aus.";
  }
}


// Jahrgänge laden

async function loadAutoPlanningGrades() {
  const schoolYearId = autoPlanningSchoolYear.value;

  autoPlanningGrade.innerHTML =
    '<option value="">Jahrgang auswählen</option>';

  autoPlanningGrade.disabled = true;

  // Alte Planungsprüfung zurücksetzen

  autoPlanningCheckPassed = false;

  document.getElementById("autoPlanningCheck").innerHTML =
    '<p class="muted">Bitte einen Jahrgang auswählen.</p>';

  document.getElementById("autoPlanningRequirements").innerHTML =
    '<p class="muted">Bitte zuerst einen Jahrgang auswählen.</p>';
  
  if (!schoolYearId) {
    autoPlanningMessage.textContent =
      "Bitte zuerst ein Schuljahr auswählen.";
    return;
  }

  autoPlanningMessage.textContent =
    "Jahrgänge werden geladen ...";

  const { data, error } = await suvDb
    .from("grade_levels")
    .select("id, name, sort_order")
    .order("sort_order");

  if (error) {
    autoPlanningMessage.textContent =
      "Fehler beim Laden der Jahrgänge: " + error.message;
    return;
  }

  data.forEach(grade => {
    const option = document.createElement("option");

    option.value = grade.id;
    option.textContent = grade.name;

    autoPlanningGrade.appendChild(option);
  });

  autoPlanningGrade.disabled = false;

  autoPlanningMessage.textContent =
    "Schuljahr und Jahrgänge wurden erfolgreich geladen.";
}


// Schuljahr geändert

autoPlanningSchoolYear.addEventListener(
  "change",
  loadAutoPlanningGrades
);


// Schienen und parallele Kursangebote laden

async function loadAutoPlanningParallelTracks(schoolYearId) {
  const container = document.getElementById(
    "autoPlanningParallelTracks"
  );

  container.textContent = "Schienen werden geladen ...";

  if (!schoolYearId) {
    container.textContent = "Bitte zuerst ein Schuljahr auswählen.";
    return;
  }

  const { data: tracks, error: trackError } = await suvDb
    .from("timetable_parallel_groups")
    .select("id, name, weekly_periods")
    .eq("school_year_id", schoolYearId)
    .order("name");

  if (trackError) {
    container.textContent =
      "Fehler beim Laden der Schienen: " + trackError.message;
    return;
  }

  if (!tracks || tracks.length === 0) {
    container.textContent =
      "Für dieses Schuljahr wurden noch keine Schienen angelegt.";
    return;
  }

  const { data: courses, error: courseError } = await suvDb
    .from("timetable_parallel_courses")
    .select(`
      id,
      parallel_group_id,
      course_name,
      course_count,
      subjects(name, short_code)
    `)
    .eq("school_year_id", schoolYearId)
    .order("course_name");

  if (courseError) {
    container.textContent =
      "Fehler beim Laden der Kursangebote: " + courseError.message;
    return;
  }

  const { data: classLinks, error: classError } = await suvDb
    .from("timetable_parallel_course_classes")
    .select(`
      course_id,
      classes(name, grade_levels(name))
    `)
    .eq("school_year_id", schoolYearId);

  if (classError) {
    container.textContent =
      "Fehler beim Laden der Klassenzuordnungen: " +
      classError.message;
    return;
  }

  container.innerHTML = "";

  tracks.forEach(track => {
    const trackBox = document.createElement("div");
    trackBox.className = "teacher-entry";

    const heading = document.createElement("h4");
    heading.textContent = track.name;

    const info = document.createElement("p");
    info.textContent =
      track.weekly_periods + " Wochenstunden · Alle Kurse parallel";

    trackBox.append(heading, info);

    const trackCourses = (courses || []).filter(
      course => course.parallel_group_id === track.id
    );

    if (trackCourses.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = "Keine Kursangebote vorhanden.";
      trackBox.appendChild(empty);
    }

    trackCourses.forEach(course => {
      const courseBox = document.createElement("div");
      courseBox.className = "teacher-entry";

      const courseHeading = document.createElement("strong");
      courseHeading.textContent =
        course.course_name + " · " +
        (course.subjects?.name || "Unbekanntes Fach");

      courseBox.appendChild(courseHeading);

      const countInfo = document.createElement("p");
      countInfo.textContent =
        "Einzuplanende Kurse: " + course.course_count;

      courseBox.appendChild(countInfo);

      const assignedClasses = (classLinks || []).filter(
        link => link.course_id === course.id
      );

      const classInfo = document.createElement("p");
      classInfo.textContent =
        "Beteiligte Klassen: " +
        (assignedClasses.length
          ? assignedClasses.map(link => {
              const grade =
                link.classes?.grade_levels?.name || "Jahrgang ?";
              const name =
                link.classes?.name || "Unbekannte Klasse";

              return grade + " · " + name;
            }).join(", ")
          : "Keine Klassen zugeordnet.");

      courseBox.appendChild(classInfo);

      const units = document.createElement("p");
      units.textContent = "Einzelne Planungseinheiten:";

      courseBox.appendChild(units);

      for (let i = 1; i <= course.course_count; i++) {
        const unit = document.createElement("p");
        unit.textContent =
          course.course_name + " – Kurs " +
          i + " von " + course.course_count;

        courseBox.appendChild(unit);
      }

      trackBox.appendChild(courseBox);
    });

    container.appendChild(trackBox);
  });
}

// Unterrichtsvorgaben eines Jahrgangs laden

async function loadAutoPlanningRequirements() {
  const schoolYearId = autoPlanningSchoolYear.value;
  const gradeLevelId = autoPlanningGrade.value;
  const container = document.getElementById(
    "autoPlanningRequirements"
  );

  // Alte Ergebnisse beim Jahrgangswechsel zurücksetzen

  autoPlanningCheckPassed = false;

  document.getElementById("autoPlanningCheck").innerHTML =
    '<p class="muted">Bitte einen Jahrgang auswählen.</p>';

  if (!schoolYearId || !gradeLevelId) {
    container.innerHTML =
      '<p class="muted">Bitte zuerst ein Schuljahr und einen Jahrgang auswählen.</p>';
    return;
  }
  
  if (!schoolYearId || !gradeLevelId) return;

  container.textContent = "Fächer werden geladen ...";

  const { data: subjects, error: subjectError } = await suvDb
    .from("subjects")
    .select("id, name, short_code")
    .order("name");

  if (subjectError) {
    container.textContent =
      "Fehler beim Laden der Fächer: " + subjectError.message;
    return;
  }

  const { data: requirements, error: requirementError } =
  await suvDb
    .from("grade_subject_requirements")
    .select("id, subject_id, weekly_periods")
    .eq("school_year_id", schoolYearId)
    .eq("grade_level_id", gradeLevelId);

  if (requirementError) {
    container.textContent =
      "Fehler beim Laden der Unterrichtsvorgaben: " +
      requirementError.message;
    return;
  }

const requirementIds = requirements.map(item => item.id);

let existingBlocks = [];

if (requirementIds.length > 0) {
  const { data: blocks, error: blockError } = await suvDb
    .from("lesson_block_requirements")
    .select("grade_subject_requirement_id, block_number, periods_count")
    .in("grade_subject_requirement_id", requirementIds)
    .order("block_number");

  if (blockError) {
    container.textContent =
      "Fehler beim Laden der Unterrichtsblöcke: " +
      blockError.message;
    return;
  }

  existingBlocks = blocks || [];
}

const blocksByRequirement = new Map();

requirements.forEach(requirement => {
  const subjectBlocks = existingBlocks
    .filter(block =>
      block.grade_subject_requirement_id === requirement.id
    )
    .sort((a, b) => a.block_number - b.block_number);

  blocksByRequirement.set(
    requirement.subject_id,
    subjectBlocks.map(block => block.periods_count).join(" + ")
  );
});
  
  const existingValues = new Map(
    requirements.map(item => [
      item.subject_id,
      item.weekly_periods
    ])
  );

  container.innerHTML = "";

  if (!subjects || subjects.length === 0) {
    container.textContent = "Es sind keine Fächer vorhanden.";
    return;
  }

  const table = document.createElement("table");
  table.className = "data-table";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  ["Fach", "Kürzel", "Wochenstunden", "Unterrichtsblöcke"].forEach(title => {
    const th = document.createElement("th");
    th.textContent = title;
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);

  const tbody = document.createElement("tbody");

  subjects.forEach(subject => {
    const row = document.createElement("tr");

    const nameCell = document.createElement("td");
    nameCell.textContent = subject.name;

    const codeCell = document.createElement("td");
    codeCell.textContent = subject.short_code || "–";

    const periodsCell = document.createElement("td");
    const input = document.createElement("input");

    input.type = "number";
    input.min = "0";
    input.max = "40";
    input.step = "1";
    input.value = existingValues.get(subject.id) ?? 0;
    input.dataset.subjectId = subject.id;
    input.className = "auto-planning-periods";
    input.style.width = "90px";

        periodsCell.appendChild(input);

    const blocksCell = document.createElement("td");
    const blocksInput = document.createElement("input");

    blocksInput.type = "text";
    blocksInput.placeholder = "z. B. 2+3";
    blocksInput.value =
  blocksByRequirement.get(subject.id) ??
  (
    Number(input.value) === 0
      ? ""
      : Number(input.value) === 1
        ? "1"
        : Number(input.value) % 2 === 0
          ? Array(Number(input.value) / 2).fill(2).join(" + ")
          : Number(input.value) === 3
            ? "3"
            : [
                ...Array((Number(input.value) - 3) / 2).fill(2),
                3
              ].join(" + ")
  );

    blocksInput.dataset.subjectId = subject.id;
    blocksInput.className = "auto-planning-blocks";
    blocksInput.style.width = "130px";

    blocksCell.appendChild(blocksInput);

    row.append(nameCell, codeCell, periodsCell, blocksCell);
    tbody.appendChild(row);
  });

  table.append(thead, tbody);
  container.appendChild(table);

  // Planungsprüfung bei Änderungen aktualisieren

container.querySelectorAll(
  ".auto-planning-periods, .auto-planning-blocks"
).forEach(input => {
  input.addEventListener("input", runAutoPlanningCheck);
});

  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.textContent = "Unterrichtsvorgaben speichern";
  saveButton.className = "primary-button";

  saveButton.addEventListener("click", saveAutoPlanningRequirements);

  container.appendChild(saveButton);

  autoPlanningMessage.textContent =
    subjects.length + " Fächer für den ausgewählten Jahrgang geladen.";

  await runAutoPlanningCheck();
}


// Unterrichtsvorgaben speichern


async function saveAutoPlanningRequirements() {
  const schoolYearId = autoPlanningSchoolYear.value;
  const gradeLevelId = autoPlanningGrade.value;

  const inputs = document.querySelectorAll(
    ".auto-planning-periods"
  );

  const saveButton = document.querySelector(
    "#autoPlanningRequirements button"
  );

  const entries = [];
  const blockEntries = [];

  for (const input of inputs) {
    const value = Number(input.value);

    if (
      !Number.isInteger(value) ||
      value < 0 ||
      value > 40
    ) {
      autoPlanningMessage.textContent =
        "Bitte nur ganze Zahlen zwischen 0 und 40 eingeben.";
      input.focus();
      return;
    }

    const blocksInput = document.querySelector(
      '.auto-planning-blocks[data-subject-id="' +
      input.dataset.subjectId + '"]'
    );

    if (!blocksInput) {
      autoPlanningMessage.textContent =
        "Unterrichtsblöcke wurden nicht gefunden.";
      return;
    }

    const blockText = blocksInput.value.trim();
    let blocks = [];

    if (value === 0 && blockText !== "") {
      autoPlanningMessage.textContent =
        "Bei 0 Wochenstunden dürfen keine Blöcke eingetragen sein.";
      blocksInput.focus();
      return;
    }

    if (value > 0) {
      blocks = blockText.split("+").map(block =>
        Number(block.trim())
      );

      if (
        blockText === "" ||
        blocks.some(block =>
          !Number.isInteger(block) || block < 1
        )
      ) {
        autoPlanningMessage.textContent =
          "Bitte gültige Unterrichtsblöcke eingeben.";
        blocksInput.focus();
        return;
      }

      const blockTotal = blocks.reduce(
        (sum, block) => sum + block,
        0
      );

      if (blockTotal !== value) {
        autoPlanningMessage.textContent =
          "Die Blöcke müssen zusammen genau " +
          value + " Wochenstunden ergeben.";
        blocksInput.focus();
        return;
      }
    }

    entries.push({
      school_year_id: schoolYearId,
      grade_level_id: gradeLevelId,
      subject_id: input.dataset.subjectId,
      weekly_periods: value,
      is_active: true,
      updated_at: new Date().toISOString()
    });

    blocks.forEach((periodsCount, index) => {
      blockEntries.push({
        subject_id: input.dataset.subjectId,
        block_number: index + 1,
        periods_count: periodsCount
      });
    });
  }

  saveButton.disabled = true;
  saveButton.textContent = "Speichern läuft ...";

  const { error: requirementError } = await suvDb
    .from("grade_subject_requirements")
    .upsert(entries, {
      onConflict: "school_year_id,grade_level_id,subject_id"
    });

  if (requirementError) {
    autoPlanningMessage.textContent =
      "Speichern der Unterrichtsvorgaben fehlgeschlagen: " +
      requirementError.message;

    saveButton.disabled = false;
    saveButton.textContent = "Unterrichtsvorgaben speichern";
    return;
  }

  const { data: requirements, error: loadError } = await suvDb
    .from("grade_subject_requirements")
    .select("id, subject_id")
    .eq("school_year_id", schoolYearId)
    .eq("grade_level_id", gradeLevelId);

  if (loadError) {
    autoPlanningMessage.textContent =
      "Unterrichtsvorgaben gespeichert, aber IDs konnten nicht geladen werden: " +
      loadError.message;

    saveButton.disabled = false;
    saveButton.textContent = "Unterrichtsvorgaben speichern";
    return;
  }

  const requirementIds = new Map(
    requirements.map(item => [item.subject_id, item.id])
  );

  const databaseBlocks = blockEntries.map(block => ({
    grade_subject_requirement_id:
      requirementIds.get(block.subject_id),
    block_number: block.block_number,
    periods_count: block.periods_count
  }));

  if (databaseBlocks.length > 0) {
    const { error: blockError } = await suvDb
      .from("lesson_block_requirements")
      .upsert(databaseBlocks, {
        onConflict: "grade_subject_requirement_id,block_number"
      });

    if (blockError) {
      autoPlanningMessage.textContent =
        "Wochenstunden gespeichert, aber Blockverteilung fehlgeschlagen: " +
        blockError.message;

      saveButton.disabled = false;
      saveButton.textContent = "Unterrichtsvorgaben speichern";
      return;
    }
  }

  for (const requirement of requirements) {
    const subjectBlocks = blockEntries.filter(
      block => block.subject_id === requirement.subject_id
    );

    let deleteQuery = suvDb
      .from("lesson_block_requirements")
      .delete()
      .eq("grade_subject_requirement_id", requirement.id);

    if (subjectBlocks.length > 0) {
      deleteQuery = deleteQuery.gt(
        "block_number",
        subjectBlocks.length
      );
    }

    const { error: cleanupError } = await deleteQuery;

    if (cleanupError) {
      autoPlanningMessage.textContent =
        "Blockverteilung gespeichert, aber alte Blöcke konnten nicht bereinigt werden: " +
        cleanupError.message;

      saveButton.disabled = false;
      saveButton.textContent = "Unterrichtsvorgaben speichern";
      return;
    }
  }

  autoPlanningMessage.textContent =
    "Unterrichtsvorgaben und Unterrichtsblöcke erfolgreich gespeichert.";

  saveButton.disabled = false;
  saveButton.textContent = "Unterrichtsvorgaben speichern";
}


// Planungsgrundlage prüfen


async function runAutoPlanningCheck() {
  const schoolYearId = autoPlanningSchoolYear.value;
  const gradeLevelId = autoPlanningGrade.value;

  const container = document.getElementById(
    "autoPlanningCheck"
  );

  autoPlanningCheckPassed = false;

  if (!schoolYearId || !gradeLevelId) return;

  container.textContent = "Planungsgrundlage wird geprüft ...";

  const { data: classes, error } = await suvDb
    .from("classes")
    .select("id, name")
    .eq("school_year_id", schoolYearId)
    .eq("grade_level_id", gradeLevelId)
    .order("name");

  if (error) {
    container.textContent =
      "Fehler bei der Klassenprüfung: " + error.message;
    return;
  }

  const inputs = document.querySelectorAll(
    ".auto-planning-periods"
  );

  let weeklyPeriods = 0;
  let activeSubjects = 0;
  const invalidSubjects = [];

  inputs.forEach(input => {
    const row = input.closest("tr");
    const subjectName =
      row?.cells[0]?.textContent || "Unbekanntes Fach";

    const rawValue = input.value.trim();
    const value = Number(rawValue);

    const blocksInput = document.querySelector(
      '.auto-planning-blocks[data-subject-id="' +
      input.dataset.subjectId + '"]'
    );

    let valid = true;

    if (
      rawValue === "" ||
      !Number.isInteger(value) ||
      value < 0 ||
      value > 40
    ) {
      valid = false;
    } else {
      weeklyPeriods += value;

      if (value > 0) {
        activeSubjects++;
      }
    }

    if (!blocksInput) {
      valid = false;
    } else {
      const blockText = blocksInput.value.trim();

      if (value === 0 && blockText !== "") {
        valid = false;
      }

      if (value > 0) {
        const parts = blockText.split("+").map(part =>
          part.trim()
        );

        const blocksValid =
          blockText !== "" &&
          parts.every(part => /^\d+$/.test(part)) &&
          parts.every(part => Number(part) >= 1);

        if (!blocksValid) {
          valid = false;
        } else {
          const blockTotal = parts.reduce(
            (sum, part) => sum + Number(part),
            0
          );

          if (blockTotal !== value) {
            valid = false;
          }
        }
      }
    }

    if (!valid) {
      invalidSubjects.push(subjectName);
    }
  });

  container.innerHTML = "";

  const classInfo = document.createElement("p");
  classInfo.textContent =
    "Vorhandene Klassen: " + classes.length;

  const subjectInfo = document.createElement("p");
  subjectInfo.textContent =
    "Fächer mit Unterricht: " + activeSubjects;

  const hoursInfo = document.createElement("p");
  hoursInfo.textContent =
    "Wochenstunden je Klasse: " + weeklyPeriods;

  const totalInfo = document.createElement("p");
  totalInfo.textContent =
    "Unterrichtsstunden im gesamten Jahrgang: " +
    (weeklyPeriods * classes.length);

  container.append(
    classInfo,
    subjectInfo,
    hoursInfo,
    totalInfo
  );

  const status = document.createElement("p");

  if (classes.length === 0) {
    status.textContent =
      "Prüfung nicht bestanden: Für diesen Jahrgang existieren keine Klassen.";

  } else if (invalidSubjects.length > 0) {
    status.textContent =
      "Prüfung nicht bestanden: Bei folgenden Fächern sind die Wochenstunden oder Unterrichtsblöcke ungültig: " +
      invalidSubjects.join(", ");

  } else if (weeklyPeriods === 0) {
    status.textContent =
      "Prüfung nicht bestanden: Es wurden noch keine Wochenstunden festgelegt.";

  } else {
    autoPlanningCheckPassed = true;

    status.textContent =
      "Grundprüfung bestanden: Klassen, Wochenstunden und Unterrichtsblöcke sind gültig.";
  }

  container.appendChild(status);
}


// Jahrgang ausgewählt

autoPlanningGrade.addEventListener(
  "change",
  loadAutoPlanningRequirements
);

// Schuljahr ausgewählt

autoPlanningSchoolYear.addEventListener(
  "change",
  loadAutoPlanningGrades
);

// Automatische Planung öffnen

document
  .querySelector('[data-page="automaticPlanning"]')
  .addEventListener("click", async () => {

    if (automaticPlanningLoaded) return;

    const { data } = await suvDb.auth.getSession();

    if (!data.session) return;

    await loadAutoPlanningSchoolYears();

    automaticPlanningLoaded = true;
  });
