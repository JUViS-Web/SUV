
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
      .select("subject_id, weekly_periods")
      .eq("school_year_id", schoolYearId)
      .eq("grade_level_id", gradeLevelId);

  if (requirementError) {
    container.textContent =
      "Fehler beim Laden der Unterrichtsvorgaben: " +
      requirementError.message;
    return;
  }

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
                ].join(" + ");

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

container.querySelectorAll(".auto-planning-periods")
  .forEach(input => {
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

    const blockText = blocksInput.value.trim();

    let blocks = [];

    if (value === 0 && blockText !== "") {
      autoPlanningMessage.textContent =
        "Bei 0 Wochenstunden dürfen keine Unterrichtsblöcke eingetragen sein.";
      blocksInput.focus();
      return;
    }

    if (value > 0) {
      blocks = blockText
        .split("+")
        .map(block => Number(block.trim()));

      if (
        blockText === "" ||
        blocks.some(block =>
          !Number.isInteger(block) || block < 1
        )
      ) {
        autoPlanningMessage.textContent =
          "Bitte gib gültige Unterrichtsblöcke ein, z. B. 2+3.";
        blocksInput.focus();
        return;
      }

      const blockTotal = blocks.reduce(
        (sum, block) => sum + block,
        0
      );

      if (blockTotal !== value) {
        autoPlanningMessage.textContent =
          "Die Unterrichtsblöcke müssen zusammen genau " +
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
  }

  saveButton.disabled = true;
  saveButton.textContent = "Speichern läuft ...";

  const { error } = await suvDb
    .from("grade_subject_requirements")
    .upsert(entries, {
      onConflict: "school_year_id,grade_level_id,subject_id"
    });

  if (error) {
    autoPlanningMessage.textContent =
      "Speichern fehlgeschlagen: " + error.message;

    saveButton.disabled = false;
    saveButton.textContent = "Unterrichtsvorgaben speichern";
    return;
  }

  autoPlanningMessage.textContent =
    "Unterrichtsvorgaben erfolgreich gespeichert.";

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
    autoPlanningCheckPassed = false;

    container.textContent =
      "Fehler bei der Klassenprüfung: " + error.message;
    return;
  }

  const inputs = document.querySelectorAll(
    ".auto-planning-periods"
  );

  let weeklyPeriods = 0;
  let activeSubjects = 0;

  inputs.forEach(input => {
    const value = Number(input.value) || 0;

    weeklyPeriods += value;

    if (value > 0) {
      activeSubjects++;
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
    autoPlanningCheckPassed = false;

    status.textContent =
      "Prüfung nicht bestanden: Für diesen Jahrgang existieren keine Klassen.";

  } else if (weeklyPeriods === 0) {
    autoPlanningCheckPassed = false;

    status.textContent =
      "Prüfung nicht bestanden: Es wurden noch keine Wochenstunden festgelegt.";

  } else {
    autoPlanningCheckPassed = true;

    status.textContent =
      "Grundprüfung bestanden: Klassen und Unterrichtsvorgaben sind vorhanden.";
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
