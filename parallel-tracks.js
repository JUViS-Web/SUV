
// SUV – Schienenverwaltung

const parallelTrackForm = document.getElementById("parallelTrackForm");
const parallelTrackList = document.getElementById("parallelTrackList");
const parallelTracksMessage = document.getElementById("parallelTracksMessage");

let parallelTrackSchoolYears = [];
let parallelTrackGrades = [];
let parallelTrackCourseGroups = [];

async function loadParallelTrackData() {
  parallelTrackForm.innerHTML = "<p>Daten werden geladen ...</p>";
  parallelTrackList.textContent = "Schienen werden geladen ...";

  const [yearsResult, gradesResult, groupsResult] = await Promise.all([
    suvDb.from("school_years")
      .select("id, name, is_active")
      .order("name", { ascending: false }),

    suvDb.from("grade_levels")
      .select("id, name, sort_order")
      .order("sort_order"),

    suvDb.from("grade_course_groups")
      .select(`
        id,
        school_year_id,
        grade_level_id,
        subject_id,
        weekly_periods,
        subjects(name, short_code)
      `)
      .order("created_at")
  ]);

  if (yearsResult.error || gradesResult.error || groupsResult.error) {
    parallelTrackForm.textContent =
      "Fehler beim Laden: " +
      (yearsResult.error || gradesResult.error || groupsResult.error).message;
    return;
  }

  parallelTrackSchoolYears = yearsResult.data || [];
  parallelTrackGrades = gradesResult.data || [];
  parallelTrackCourseGroups = groupsResult.data || [];

  renderParallelTrackForm();
  await loadParallelTracks();
}

function renderParallelTrackForm() {
  parallelTrackForm.innerHTML = `
    <form id="createParallelTrackForm">

      <div>
        <label for="parallelTrackSchoolYear">Schuljahr</label>
        <select id="parallelTrackSchoolYear" required>
          <option value="">Schuljahr auswählen</option>
          ${parallelTrackSchoolYears.map(year => `
            <option value="${year.id}" ${year.is_active ? "selected" : ""}>
              ${year.name}
            </option>
          `).join("")}
        </select>
      </div>

      <div>
        <label for="parallelTrackGrade">Jahrgang</label>
        <select id="parallelTrackGrade" required>
          <option value="">Jahrgang auswählen</option>
          ${parallelTrackGrades.map(grade => `
            <option value="${grade.id}">${grade.name}</option>
          `).join("")}
        </select>
      </div>

      <div>
        <label for="parallelTrackName">Name der Schiene</label>
        <input
          type="text"
          id="parallelTrackName"
          placeholder="z. B. Religion / Werte und Normen"
          required
        >
      </div>

      <div>
        <label for="parallelTrackNotes">Beschreibung</label>
        <textarea
          id="parallelTrackNotes"
          rows="3"
          placeholder="Optionale Beschreibung"
        ></textarea>
      </div>

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
  const { data, error } = await suvDb
    .from("timetable_parallel_groups")
    .select(`
      id,
      name,
      notes,
      is_active,
      school_year_id,
      grade_level_id,
      school_years(name),
      grade_levels(name),
      timetable_parallel_group_members(
        id,
        grade_course_group_id,
        grade_course_groups(
          id,
          weekly_periods,
          subjects(name, short_code)
        )
      )
    `)
    .order("name");

  if (error) {
    parallelTrackList.textContent =
      "Fehler beim Laden der Schienen: " + error.message;
    return;
  }

  if (!data || data.length === 0) {
    parallelTrackList.textContent =
      "Noch keine Schienen vorhanden.";
    return;
  }

  parallelTrackList.innerHTML = "";

  data.forEach(track => {
    const entry = document.createElement("div");
    entry.className = "teacher-entry";

    const details = document.createElement("div");

    const title = document.createElement("strong");
    title.textContent = track.name;

    const info = document.createElement("p");
    info.textContent =
      `${track.school_years?.name || "–"} · Jahrgang ${track.grade_levels?.name || "–"}`;

    const memberList = document.createElement("div");

    const memberTitle = document.createElement("strong");
    memberTitle.textContent = "Zugeordnete Kursgruppen:";
    memberList.appendChild(memberTitle);

    const members = track.timetable_parallel_group_members || [];

    if (members.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = "Noch keine Kursgruppen zugeordnet.";
      memberList.appendChild(empty);
    } else {
      members.forEach(member => {
        const group = member.grade_course_groups;
        const subject = group?.subjects;

        const line = document.createElement("p");
        line.textContent =
          `${subject?.name || "Unbekanntes Fach"} · ${group?.weekly_periods || 0} Wochenstunden`;

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.textContent = "Entfernen";
        removeButton.addEventListener("click", () => {
          removeParallelTrackMember(member.id);
        });

        line.appendChild(document.createTextNode(" "));
        line.appendChild(removeButton);
        memberList.appendChild(line);
      });
    }

    const actions = document.createElement("div");
    actions.className = "teacher-actions";

    const groupSelect = document.createElement("select");
    groupSelect.innerHTML =
      '<option value="">Kursgruppe hinzufügen</option>';

    parallelTrackCourseGroups
      .filter(group =>
        group.school_year_id === track.school_year_id &&
        group.grade_level_id === track.grade_level_id &&
        !members.some(member =>
          member.grade_course_group_id === group.id
        )
      )
      .forEach(group => {
        const option = document.createElement("option");
        option.value = group.id;
        option.textContent =
          `${group.subjects?.name || "Unbekanntes Fach"} · ${group.weekly_periods} Wochenstunden`;
        groupSelect.appendChild(option);
      });

    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.textContent = "Hinzufügen";
    addButton.addEventListener("click", () => {
      if (groupSelect.value) {
        addParallelTrackMember(track.id, groupSelect.value);
      }
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Schiene löschen";
    deleteButton.addEventListener("click", () => {
      deleteParallelTrack(track.id, track.name);
    });

    actions.appendChild(groupSelect);
    actions.appendChild(addButton);
    actions.appendChild(deleteButton);

    details.appendChild(title);
    details.appendChild(info);
    details.appendChild(memberList);
    details.appendChild(actions);

    entry.appendChild(details);
    parallelTrackList.appendChild(entry);
  });
}

async function addParallelTrackMember(trackId, courseGroupId) {
  const { error } = await suvDb
    .from("timetable_parallel_group_members")
    .insert({
      parallel_group_id: trackId,
      grade_course_group_id: courseGroupId
    });

  if (error) {
    parallelTracksMessage.textContent =
      "Fehler beim Hinzufügen: " + error.message;
    return;
  }

  parallelTracksMessage.textContent =
    "Kursgruppe erfolgreich hinzugefügt.";

  await loadParallelTracks();
}

async function removeParallelTrackMember(memberId) {
  const confirmed = confirm(
    "Möchtest du diese Kursgruppe aus der Schiene entfernen?"
  );

  if (!confirmed) return;

  const { error } = await suvDb
    .from("timetable_parallel_group_members")
    .delete()
    .eq("id", memberId);

  if (error) {
    parallelTracksMessage.textContent =
      "Fehler beim Entfernen: " + error.message;
    return;
  }

  parallelTracksMessage.textContent =
    "Kursgruppe wurde entfernt.";

  await loadParallelTracks();
}

async function deleteParallelTrack(trackId, trackName) {
  const confirmed = confirm(
    `Möchtest du die Schiene "${trackName}" wirklich löschen?`
  );

  if (!confirmed) return;

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
