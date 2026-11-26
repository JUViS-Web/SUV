
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

await loadAutoPlanningParallelTracks(schoolYearId);
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
    container.textContent =
      "Bitte zuerst ein Schuljahr auswählen.";
    return;
  }

  // Neue Schienenangebote laden

  const { data: offerings, error: offeringError } =
    await suvDb
      .from("grade_course_offerings")
      .select("id, offering_name, grade_level_id")
      .eq("school_year_id", schoolYearId)
      .order("offering_name");

  if (offeringError) {
    container.textContent =
      "Fehler beim Laden der Schienenangebote: " +
      offeringError.message;
    return;
  }

  const offeringIds = (offerings || []).map(item => item.id);

  let groups = [];
  let courses = [];
  let classLinks = [];
  let blocks = [];
  let subjects = [];
  let classes = [];
  let grades = [];

  if (offeringIds.length > 0) {
    const { data, error } = await suvDb
      .from("grade_course_groups")
      .select(
        "id, offering_id, subject_id, weekly_periods, course_count"
      )
      .in("offering_id", offeringIds);

    if (error) {
      container.textContent =
        "Fehler beim Laden der Fächergruppen: " +
        error.message;
      return;
    }

    groups = data || [];

    const groupIds = groups.map(item => item.id);

    if (groupIds.length > 0) {
      const { data, error } = await suvDb
        .from("grade_courses")
        .select(
          "id, grade_course_group_id, course_number, course_name"
        )
        .in("grade_course_group_id", groupIds)
        .order("course_number");

      if (error) {
        container.textContent =
          "Fehler beim Laden der Einzelkurse: " +
          error.message;
        return;
      }

      courses = data || [];
    }

    const { data: links, error: linkError } = await suvDb
      .from("grade_course_offering_classes")
      .select("grade_course_offering_id, class_id")
      .in("grade_course_offering_id", offeringIds);

    if (linkError) {
      container.textContent =
        "Fehler beim Laden der Klassenzuordnungen: " +
        linkError.message;
      return;
    }

    classLinks = links || [];

    const { data: blockData, error: blockError } =
      await suvDb
        .from("lesson_block_requirements")
        .select(
          "id, grade_course_offering_id, block_number, periods_count"
        )
        .in("grade_course_offering_id", offeringIds)
        .order("block_number");

    if (blockError) {
      container.textContent =
        "Fehler beim Laden der Unterrichtsblöcke: " +
        blockError.message;
      return;
    }

    blocks = blockData || [];

    const subjectIds = [
      ...new Set(groups.map(item => item.subject_id))
    ];

    if (subjectIds.length > 0) {
      const { data, error } = await suvDb
        .from("subjects")
        .select("id, name, short_code")
        .in("id", subjectIds);

      if (error) {
        container.textContent =
          "Fehler beim Laden der Fächer: " +
          error.message;
        return;
      }

      subjects = data || [];
    }

    const classIds = [
      ...new Set(classLinks.map(item => item.class_id))
    ];

    if (classIds.length > 0) {
      const { data, error } = await suvDb
        .from("classes")
        .select("id, name, grade_level_id")
        .in("id", classIds);

      if (error) {
        container.textContent =
          "Fehler beim Laden der Klassen: " +
          error.message;
        return;
      }

      classes = data || [];
    }

    const { data: gradeData, error: gradeError } =
      await suvDb
        .from("grade_levels")
        .select("id, name");

    if (gradeError) {
      container.textContent =
        "Fehler beim Laden der Jahrgänge: " +
        gradeError.message;
      return;
    }

    grades = gradeData || [];
  }

  container.innerHTML = "";

  // Neue Schienenangebote darstellen

  (offerings || []).forEach(offering => {
    const box = document.createElement("div");
    box.className = "teacher-entry";

    const heading = document.createElement("h4");
    heading.textContent = offering.offering_name;

    const offeringGrade = grades.find(
      grade => grade.id === offering.grade_level_id
    );

    const info = document.createElement("p");
    info.textContent =
      "Jahrgang: " +
      (offeringGrade?.name || "Mehrere Jahrgänge") +
      " · Alle Kurse dieses Angebots laufen parallel.";

    box.append(heading, info);

    const offeringGroups = groups.filter(
      group => group.offering_id === offering.id
    );

    offeringGroups.forEach(group => {
      const groupBox = document.createElement("div");
      groupBox.className = "teacher-entry";

      const subject = subjects.find(
        item => item.id === group.subject_id
      );

      const groupHeading = document.createElement("strong");
      groupHeading.textContent =
        subject?.name || "Unbekanntes Fach";

      const groupInfo = document.createElement("p");
      groupInfo.textContent =
        group.weekly_periods +
        " Wochenstunden · " +
        group.course_count +
        " parallele Kurse";

      groupBox.append(groupHeading, groupInfo);

      const groupCourses = courses.filter(
        course =>
          course.grade_course_group_id === group.id
      );

      const courseInfo = document.createElement("p");
      courseInfo.textContent =
        "Angelegte Kursdatensätze: " +
        groupCourses.length +
        " von " +
        group.course_count;

      groupBox.appendChild(courseInfo);

      if (groupCourses.length !== group.course_count) {
        const warning = document.createElement("p");
        warning.textContent =
          "Hinweis: Die Anzahl der Kursdatensätze stimmt " +
          "noch nicht mit der festgelegten Kursanzahl überein.";
        groupBox.appendChild(warning);
      }

      groupCourses.forEach(course => {
        const courseLine = document.createElement("p");
        courseLine.textContent =
          course.course_name ||
          ((subject?.name || "Kurs") +
            " " +
            course.course_number);

        groupBox.appendChild(courseLine);
      });

      box.appendChild(groupBox);
    });

    const assignedClasses = classLinks
      .filter(link =>
        link.grade_course_offering_id === offering.id
      )
      .map(link => {
        const classItem = classes.find(
          item => item.id === link.class_id
        );

        if (!classItem) return null;

        const grade = grades.find(
          item => item.id === classItem.grade_level_id
        );

        return (
          (grade?.name || "Jahrgang ?") +
          " · " +
          classItem.name
        );
      })
      .filter(Boolean);

    const classInfo = document.createElement("p");
    classInfo.textContent =
      "Beteiligte Klassen: " +
      (assignedClasses.length
        ? assignedClasses.join(", ")
        : "Keine Klassen zugeordnet.");

    box.appendChild(classInfo);

    const offeringBlocks = blocks
      .filter(block =>
        block.grade_course_offering_id === offering.id
      )
      .sort((a, b) => a.block_number - b.block_number);

    const blockInfo = document.createElement("p");
    blockInfo.textContent =
      "Unterrichtsblöcke: " +
      (offeringBlocks.length
        ? offeringBlocks.map(block =>
            block.periods_count
          ).join(" + ")
        : "Noch keine Blöcke festgelegt.");

    box.appendChild(blockInfo);

    container.appendChild(box);
  });

  // Alte Schienenstruktur weiterhin laden

  const { data: tracks, error: trackError } = await suvDb
    .from("timetable_parallel_groups")
    .select("id, name, weekly_periods")
    .eq("school_year_id", schoolYearId)
    .order("name");

  if (trackError) {
    container.textContent =
      "Fehler beim Laden der alten Schienen: " +
      trackError.message;
    return;
  }

  if (tracks && tracks.length > 0) {
    const { data: oldCourses, error: courseError } =
      await suvDb
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
        "Fehler beim Laden der alten Kursangebote: " +
        courseError.message;
      return;
    }

    const { data: oldClassLinks, error: classError } =
      await suvDb
        .from("timetable_parallel_course_classes")
        .select(`
          course_id,
          classes(name, grade_levels(name))
        `)
        .eq("school_year_id", schoolYearId);

    if (classError) {
      container.textContent =
        "Fehler beim Laden der alten Klassenzuordnungen: " +
        classError.message;
      return;
    }

    tracks.forEach(track => {
      const trackBox = document.createElement("div");
      trackBox.className = "teacher-entry";

      const heading = document.createElement("h4");
      heading.textContent = track.name;

      const info = document.createElement("p");
      info.textContent =
        track.weekly_periods +
        " Wochenstunden · Alle Kurse parallel";

      trackBox.append(heading, info);

      (oldCourses || [])
        .filter(course =>
          course.parallel_group_id === track.id
        )
        .forEach(course => {
          const courseBox = document.createElement("div");
          courseBox.className = "teacher-entry";

          const title = document.createElement("strong");
          title.textContent =
            course.course_name +
            " · " +
            (course.subjects?.name || "Unbekanntes Fach");

          const count = document.createElement("p");
          count.textContent =
            "Einzuplanende Kurse: " + course.course_count;

          const assigned = (oldClassLinks || []).filter(
            link => link.course_id === course.id
          );

          const classInfo = document.createElement("p");
          classInfo.textContent =
            "Beteiligte Klassen: " +
            (assigned.length
              ? assigned.map(link =>
                  (link.classes?.grade_levels?.name ||
                    "Jahrgang ?") +
                  " · " +
                  (link.classes?.name ||
                    "Unbekannte Klasse")
                ).join(", ")
              : "Keine Klassen zugeordnet.");

          courseBox.append(title, count, classInfo);

          trackBox.appendChild(courseBox);
        });

      container.appendChild(trackBox);
    });
  }

  if (
    (!offerings || offerings.length === 0) &&
    (!tracks || tracks.length === 0)
  ) {
    container.textContent =
      "Für dieses Schuljahr wurden noch keine Schienen angelegt.";
    return;
  }

  autoPlanningMessage.textContent =
    (offerings?.length || 0) +
    " neue Schienenangebote und " +
    (tracks?.length || 0) +
    " alte Schienen geladen.";
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

  [
  "Fach",
  "Kürzel",
  "Geeignete Lehrkräfte",
  "Wochenstunden",
  "Unterrichtsblöcke"
].forEach(title => {
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

// Fachlich geeignete Lehrkräfte anzeigen
const teachersCell = document.createElement("td");

const qualifiedTeachers =
  getPlanningTeacherCandidates(subject.id);

teachersCell.textContent =
  qualifiedTeachers.length > 0
    ? qualifiedTeachers.map(teacher =>
        teacher.short_code ||
        `${teacher.first_name || ""} ${teacher.last_name || ""}`.trim()
      ).join(", ")
    : "Keine Zuordnung";

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

    row.append(
  nameCell,
  codeCell,
  teachersCell,
  periodsCell,
  blocksCell
);
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
  await renderPlanningDemand(schoolYearId, gradeLevelId);
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

    saveButton.disabled = false;
  saveButton.textContent = "Unterrichtsvorgaben speichern";

  autoPlanningMessage.textContent =
    "Unterrichtsvorgaben und Unterrichtsblöcke erfolgreich gespeichert.";

  await runAutoPlanningCheck();

  await renderPlanningDemand(
    schoolYearId,
    gradeLevelId
  );
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

    let demandResult;

  try {
    demandResult = await loadPlanningDemandData(
      schoolYearId,
      gradeLevelId
    );
  } catch (demandError) {
    container.textContent =
      "Fehler beim Laden des Unterrichtsbedarfs: " +
      demandError.message;
    return;
  }

  const inputs = document.querySelectorAll(
    ".auto-planning-periods"
  );

  let weeklyPeriods = 0;

const activeSubjects = new Set(
  demandResult.demand
    .filter(item => item.totalHours > 0)
    .map(item => item.subjectId)
).size;

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
    "Reguläre Wochenstunden je Klasse: " + weeklyPeriods;

  const totalInfo = document.createElement("p");
  totalInfo.textContent =
    "Tatsächliche Unterrichtsstunden im gesamten Jahrgang: " +
    demandResult.totalWeeklyHours;

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

    } else if (demandResult.totalWeeklyHours === 0) {
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
    await loadPlanningTeacherData();

    automaticPlanningLoaded = true;
  });
