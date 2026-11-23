
// SUV – Schienenverwaltung

const parallelTrackForm = document.getElementById("parallelTrackForm");
const parallelTrackList = document.getElementById("parallelTrackList");
const parallelTracksMessage = document.getElementById("parallelTracksMessage");

let parallelTrackSchoolYears = [];
let parallelTrackGrades = [];
let parallelTrackRequirements = [];
let parallelTrackAssignments = [];

async function loadParallelTrackData() {
  parallelTrackForm.innerHTML = "<p>Daten werden geladen ...</p>";
  parallelTrackList.textContent = "Schienen werden geladen ...";

  const [yearsResult, gradesResult, requirementsResult] =
    await Promise.all([
      suvDb.from("school_years")
        .select("id, name, is_active")
        .order("name", { ascending: false }),

      suvDb.from("grade_levels")
        .select("id, name, sort_order")
        .order("sort_order"),

      suvDb.from("grade_subject_requirements")
        .select(`
          id,
          school_year_id,
          grade_level_id,
          weekly_periods,
          is_active,
          subjects(name, short_code)
        `)
        .eq("is_active", true)
        .order("created_at")
    ]);

  if (yearsResult.error || gradesResult.error || requirementsResult.error) {
    parallelTrackForm.textContent =
      "Fehler beim Laden: " +
      (yearsResult.error || gradesResult.error ||
       requirementsResult.error).message;
    return;
  }

  parallelTrackSchoolYears = yearsResult.data || [];
  parallelTrackGrades = gradesResult.data || [];
  parallelTrackRequirements = requirementsResult.data || [];

  renderParallelTrackForm();
  await loadParallelTracks();
}

function renderParallelTrackForm() {
  parallelTrackForm.innerHTML = `
    <form id="createParallelTrackForm">

      <label for="parallelTrackSchoolYear">Schuljahr</label>
      <select id="parallelTrackSchoolYear" required>
        <option value="">Schuljahr auswählen</option>
        ${parallelTrackSchoolYears.map(year => `
          <option value="${year.id}"
            ${year.is_active ? "selected" : ""}>
            ${year.name}
          </option>
        `).join("")}
      </select>

      <label for="parallelTrackGrade">Jahrgang</label>
      <select id="parallelTrackGrade" required>
        <option value="">Jahrgang auswählen</option>
        ${parallelTrackGrades.map(grade => `
          <option value="${grade.id}">${grade.name}</option>
        `).join("")}
      </select>

      <label for="parallelTrackName">Name der Schiene</label>
      <input
        type="text"
        id="parallelTrackName"
        placeholder="z. B. Religion / Werte und Normen"
        required
      >

      <label for="parallelTrackNotes">Beschreibung</label>
      <textarea
        id="parallelTrackNotes"
        rows="3"
        placeholder="Optionale Beschreibung"
      ></textarea>

      <button type="submit">Schiene erstellen</button>

    </form>
  `;

  document.getElementById("createParallelTrackForm")
    .addEventListener("submit", createParallelTrack);
}

async function createParallelTrack(event) {
  event.preventDefault();

  const schoolYearId =
    document.getElementById("parallelTrackSchoolYear").value;

  const gradeLevelId =
    document.getElementById("parallelTrackGrade").value;

  const name =
    document.getElementById("parallelTrackName").value.trim();

  const notes =
    document.getElementById("parallelTrackNotes").value.trim();

  parallelTracksMessage.textContent = "Schiene wird gespeichert ...";

  const { error } = await suvDb
    .from("timetable_parallel_groups")
    .insert({
      school_year_id: schoolYearId,
      grade_level_id: gradeLevelId,
      name,
      notes: notes || null
    });

  if (error) {
    parallelTracksMessage.textContent =
      "Fehler beim Speichern: " + error.message;
    return;
  }

  parallelTracksMessage.textContent =
    "Schiene erfolgreich erstellt.";

  document.getElementById("parallelTrackName").value = "";
  document.getElementById("parallelTrackNotes").value = "";

  await loadParallelTracks();
}

async function loadParallelTracks() {
  const [tracksResult, assignmentsResult] = await Promise.all([
    suvDb.from("timetable_parallel_groups")
      .select(`
        id,
        name,
        notes,
        school_year_id,
        grade_level_id,
        school_years(name),
        grade_levels(name)
      `)
      .order("name"),

    suvDb.from("timetable_parallel_group_subjects")
      .select(`
        id,
        parallel_group_id,
        grade_subject_requirement_id
      `)
  ]);

  if (tracksResult.error || assignmentsResult.error) {
    parallelTrackList.textContent =
      "Fehler beim Laden: " +
      (tracksResult.error || assignmentsResult.error).message;
    return;
  }

  const tracks = tracksResult.data || [];
  parallelTrackAssignments = assignmentsResult.data || [];

  if (tracks.length === 0) {
    parallelTrackList.textContent = "Noch keine Schienen vorhanden.";
    return;
  }

  parallelTrackList.innerHTML = "";

  tracks.forEach(track => {
    const entry = document.createElement("div");
    entry.className = "teacher-entry";

    const title = document.createElement("strong");
    title.textContent = track.name;

    const info = document.createElement("p");
    info.textContent =
      `${track.school_years?.name || "–"} · Jahrgang ${track.grade_levels?.name || "–"}`;

    const subjectArea = document.createElement("div");

    const subjectTitle = document.createElement("strong");
    subjectTitle.textContent = "Zugeordnete Fächer:";
    subjectArea.appendChild(subjectTitle);

    const assignments = parallelTrackAssignments.filter(
      item => item.parallel_group_id === track.id
    );

    const assignedIds = assignments.map(
      item => item.grade_subject_requirement_id
    );

    if (assignments.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = "Noch keine Fächer zugeordnet.";
      subjectArea.appendChild(empty);
    }

    assignments.forEach(assignment => {
      const requirement = parallelTrackRequirements.find(
        item => item.id === assignment.grade_subject_requirement_id
      );

      const subject = requirement?.subjects;

      const line = document.createElement("p");
      line.textContent =
        `${subject?.name || "Unbekanntes Fach"} · ${requirement?.weekly_periods ?? "–"} Wochenstunden`;

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.textContent = "Entfernen";
      removeButton.addEventListener("click", () => {
        removeParallelTrackSubject(assignment.id);
      });

      line.appendChild(document.createTextNode(" "));
      line.appendChild(removeButton);
      subjectArea.appendChild(line);
    });

    const actions = document.createElement("div");
    actions.className = "teacher-actions";

    const subjectSelect = document.createElement("select");

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Fach hinzufügen";
    subjectSelect.appendChild(placeholder);

    parallelTrackRequirements
      .filter(requirement =>
        requirement.school_year_id === track.school_year_id &&
        requirement.grade_level_id === track.grade_level_id &&
        !parallelTrackAssignments.some(item =>
          item.grade_subject_requirement_id === requirement.id
        )
      )
      .forEach(requirement => {
        const option = document.createElement("option");
        option.value = requirement.id;
        option.textContent =
          `${requirement.subjects?.name || "Unbekanntes Fach"} · ${requirement.weekly_periods} Wochenstunden`;
        subjectSelect.appendChild(option);
      });

    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.textContent = "Hinzufügen";
    addButton.addEventListener("click", () => {
      if (subjectSelect.value) {
        addParallelTrackSubject(track.id, subjectSelect.value);
      }
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Schiene löschen";
    deleteButton.addEventListener("click", () => {
      deleteParallelTrack(track.id, track.name);
    });

    actions.appendChild(subjectSelect);
    actions.appendChild(addButton);
    actions.appendChild(deleteButton);

    entry.appendChild(title);
    entry.appendChild(info);
    entry.appendChild(subjectArea);
    entry.appendChild(actions);

    parallelTrackList.appendChild(entry);
  });
}

async function addParallelTrackSubject(trackId, requirementId) {
  const track = await suvDb
    .from("timetable_parallel_groups")
    .select("school_year_id, grade_level_id")
    .eq("id", trackId)
    .single();

  if (track.error) {
    parallelTracksMessage.textContent =
      "Fehler beim Laden der Schiene: " + track.error.message;
    return;
  }

  const { error } = await suvDb
    .from("timetable_parallel_group_subjects")
    .insert({
      parallel_group_id: trackId,
      grade_subject_requirement_id: requirementId,
      school_year_id: track.data.school_year_id,
      grade_level_id: track.data.grade_level_id
    });

  if (error) {
    parallelTracksMessage.textContent =
      "Fehler beim Hinzufügen: " + error.message;
    return;
  }

  parallelTracksMessage.textContent =
    "Fach erfolgreich hinzugefügt.";

  await loadParallelTracks();
}

async function removeParallelTrackSubject(assignmentId) {
  if (!confirm("Möchtest du dieses Fach aus der Schiene entfernen?")) {
    return;
  }

  const { error } = await suvDb
    .from("timetable_parallel_group_subjects")
    .delete()
    .eq("id", assignmentId);

  if (error) {
    parallelTracksMessage.textContent =
      "Fehler beim Entfernen: " + error.message;
    return;
  }

  parallelTracksMessage.textContent = "Fach wurde entfernt.";

  await loadParallelTracks();
}

async function deleteParallelTrack(trackId, trackName) {
  if (!confirm(`Möchtest du die Schiene "${trackName}" wirklich löschen?`)) {
    return;
  }

  const { error } = await suvDb
    .from("timetable_parallel_groups")
    .delete()
    .eq("id", trackId);

  if (error) {
    parallelTracksMessage.textContent =
      "Fehler beim Löschen: " + error.message;
    return;
  }

  parallelTracksMessage.textContent =
    "Schiene erfolgreich gelöscht.";

  await loadParallelTracks();
}

loadParallelTrackData();
