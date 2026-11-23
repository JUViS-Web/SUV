
// SUV – Schienenverwaltung mit jahrgangsübergreifenden Kursangeboten

const parallelTrackForm = document.getElementById("parallelTrackForm");
const parallelTrackList = document.getElementById("parallelTrackList");
const parallelTracksMessage = document.getElementById("parallelTracksMessage");

let parallelTrackSchoolYears = [];
let parallelTrackSubjects = [];
let parallelTrackClasses = [];
let parallelTrackTeachers = [];
let parallelTrackRooms = [];

function escapeParallelTrackHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

async function loadParallelTrackData() {
  parallelTrackForm.innerHTML = "<p>Daten werden geladen ...</p>";
  parallelTrackList.textContent = "Schienen werden geladen ...";

    const [
    yearsResult,
    subjectsResult,
    classesResult,
    teachersResult,
    roomsResult
  ] = await Promise.all([
    suvDb.from("school_years")
      .select("id, name, is_active")
      .order("name", { ascending: false }),

    suvDb.from("subjects")
      .select("id, name, short_code")
      .order("name"),

    suvDb.from("classes")
      .select("id, name, school_year_id, grade_levels(name)")
      .order("name"),

    suvDb.from("teachers")
      .select("id, first_name, last_name, short_code")
      .eq("is_active", true)
      .order("last_name"),

    suvDb.from("rooms")
      .select("id, name, room_type")
      .eq("is_active", true)
      .order("name")
  ]);

    const error =
    yearsResult.error ||
    subjectsResult.error ||
    classesResult.error ||
    teachersResult.error ||
    roomsResult.error;

  if (error) {
    parallelTrackForm.textContent =
      "Fehler beim Laden: " + error.message;
    return;
  }

  parallelTrackSchoolYears = yearsResult.data || [];
  parallelTrackSubjects = subjectsResult.data || [];
  parallelTrackClasses = classesResult.data || [];
  parallelTrackTeachers = teachersResult.data || [];
  parallelTrackRooms = roomsResult.data || [];

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
            ${escapeParallelTrackHtml(year.name)}
          </option>
        `).join("")}
      </select>

      <label for="parallelTrackName">Name der Schiene / des Blocks</label>
      <input
        type="text"
        id="parallelTrackName"
        placeholder="z. B. Wahlpflichtband 1"
        required
      >

      <label for="parallelTrackWeeklyPeriods">Wochenstunden der gesamten Schiene</label>
      <input
        type="number"
        id="parallelTrackWeeklyPeriods"
        min="1"
        max="40"
        value="2"
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

  const name =
    document.getElementById("parallelTrackName").value.trim();

  const weeklyPeriods =
    Number(document.getElementById("parallelTrackWeeklyPeriods").value);

  const notes =
    document.getElementById("parallelTrackNotes").value.trim();

  if (!schoolYearId || !name || weeklyPeriods < 1 || weeklyPeriods > 40) {
    parallelTracksMessage.textContent =
      "Bitte überprüfe deine Eingaben.";
    return;
  }

  parallelTracksMessage.textContent = "Schiene wird gespeichert ...";

  const { error } = await suvDb
    .from("timetable_parallel_groups")
    .insert({
      school_year_id: schoolYearId,
      grade_level_id: null,
      name,
      notes: notes || null,
      weekly_periods: weeklyPeriods
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
  const { data: tracks, error } = await suvDb
    .from("timetable_parallel_groups")
    .select(`
      id,
      name,
      notes,
      school_year_id,
      weekly_periods,
      school_years(name)
    `)
    .order("name");

  if (error) {
    parallelTrackList.textContent =
      "Fehler beim Laden: " + error.message;
    return;
  }

  if (!tracks || tracks.length === 0) {
    parallelTrackList.textContent = "Noch keine Schienen vorhanden.";
    return;
  }

  parallelTrackList.innerHTML = "";

  for (const track of tracks) {
    await renderParallelTrack(track);
  }
}

async function renderParallelTrack(track) {
    const [
    coursesResult,
    classesResult,
    instancesResult
  ] = await Promise.all([
    suvDb.from("timetable_parallel_courses")
      .select(`
        id,
        parallel_group_id,
        school_year_id,
        subject_id,
        course_name,
        course_count,
        subjects(name, short_code)
      `)
      .eq("parallel_group_id", track.id)
      .order("course_name"),

    suvDb.from("timetable_parallel_course_classes")
      .select(`
        id,
        course_id,
        class_id,
        classes(name, grade_levels(name))
      `)
      .eq("school_year_id", track.school_year_id),

    suvDb.from("timetable_parallel_course_instances")
      .select(`
        id,
        course_id,
        course_number,
        teacher_id,
        room_id
      `)
      .eq("school_year_id", track.school_year_id)
      .order("course_number")
  ]);

  if (
    coursesResult.error ||
    classesResult.error ||
    instancesResult.error
  ) {
    const error =
      coursesResult.error ||
      classesResult.error ||
      instancesResult.error;

    parallelTrackList.textContent =
      "Fehler beim Laden der Kursdaten: " + error.message;
    return;
  }

  const courses = coursesResult.data || [];
  const classLinks = classesResult.data || [];
  const courseInstances = instancesResult.data || [];

  if (coursesResult.error || classesResult.error) {
    const error = coursesResult.error || classesResult.error;
    parallelTrackList.textContent =
      "Fehler beim Laden der Kursangebote: " + error.message;
    return;
  }

  const courses = coursesResult.data || [];
  const classLinks = classesResult.data || [];

  const entry = document.createElement("div");
  entry.className = "teacher-entry";

  const title = document.createElement("strong");
  title.textContent = track.name;

  const info = document.createElement("p");
  info.textContent =
    `${track.school_years?.name || "–"} · ${track.weekly_periods} Wochenstunden · alle Angebote parallel`;

  const courseArea = document.createElement("div");

  const courseTitle = document.createElement("strong");
  courseTitle.textContent = "Kursangebote:";
  courseArea.appendChild(courseTitle);

  if (courses.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "Noch keine Kursangebote vorhanden.";
    courseArea.appendChild(empty);
  }

  courses.forEach(course => {
    const courseBox = document.createElement("div");
    courseBox.className = "teacher-entry";

    const courseHeading = document.createElement("strong");
    courseHeading.textContent = course.course_name;

    const subjectInfo = document.createElement("p");
subjectInfo.textContent =
  `Fach: ${course.subjects?.name || "Unbekannt"} · Anzahl der Kurse: ${course.course_count}`;

    const assignedClasses = classLinks.filter(
      link => link.course_id === course.id
    );

    const classList = document.createElement("div");
    const classTitle = document.createElement("strong");
    classTitle.textContent = "Beteiligte Klassen:";
    classList.appendChild(classTitle);

    if (assignedClasses.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = "Noch keine Klassen zugeordnet.";
      classList.appendChild(empty);
    }

    assignedClasses.forEach(link => {
      const line = document.createElement("p");
      const grade = link.classes?.grade_levels?.name || "Jahrgang ?";
      const className = link.classes?.name || "Unbekannte Klasse";

      line.textContent = `${grade} · ${className} `;

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.textContent = "Entfernen";
      removeButton.addEventListener("click", () => {
        removeParallelCourseClass(link.id);
      });

      line.appendChild(removeButton);
      classList.appendChild(line);
    });

    const instanceArea = document.createElement("div");
    instanceArea.className = "teacher-actions";

    const instanceTitle = document.createElement("strong");
    instanceTitle.textContent = "Lehrkräfte- und Raumzuordnung:";
    instanceArea.appendChild(instanceTitle);

    const instances = courseInstances.filter(
      instance => instance.course_id === course.id
    );

    instances.forEach(instance => {
      const instanceBox = document.createElement("div");
      instanceBox.className = "teacher-entry";

      const instanceHeading = document.createElement("strong");
      instanceHeading.textContent =
        course.course_name + " – Kurs " + instance.course_number;

      const teacherSelect = document.createElement("select");

      const teacherPlaceholder = document.createElement("option");
      teacherPlaceholder.value = "";
      teacherPlaceholder.textContent = "Lehrkraft auswählen";
      teacherSelect.appendChild(teacherPlaceholder);

      parallelTrackTeachers.forEach(teacher => {
        const option = document.createElement("option");
        option.value = teacher.id;
        option.textContent =
          `${teacher.short_code} – ${teacher.first_name} ${teacher.last_name}`;
        teacherSelect.appendChild(option);
      });

      teacherSelect.value = instance.teacher_id || "";

      const roomSelect = document.createElement("select");

      const roomPlaceholder = document.createElement("option");
      roomPlaceholder.value = "";
      roomPlaceholder.textContent = "Raum auswählen";
      roomSelect.appendChild(roomPlaceholder);

      parallelTrackRooms.forEach(room => {
        const option = document.createElement("option");
        option.value = room.id;
        option.textContent =
          room.name + (room.room_type ? " – " + room.room_type : "");
        roomSelect.appendChild(option);
      });

      roomSelect.value = instance.room_id || "";

      const saveButton = document.createElement("button");
      saveButton.type = "button";
      saveButton.textContent = "Zuordnung speichern";

      saveButton.addEventListener("click", () => {
        saveParallelCourseInstance(
          instance.id,
          teacherSelect.value || null,
          roomSelect.value || null
        );
      });

      instanceBox.appendChild(instanceHeading);
      instanceBox.appendChild(teacherSelect);
      instanceBox.appendChild(roomSelect);
      instanceBox.appendChild(saveButton);

      instanceArea.appendChild(instanceBox);
    });

    if (instances.length === 0) {
      const emptyInstances = document.createElement("p");
      emptyInstances.textContent =
        "Für dieses Angebot sind noch keine Kursinstanzen angelegt.";
      instanceArea.appendChild(emptyInstances);
    }

    courseBox.appendChild(instanceArea);
    
    const deleteCourseButton = document.createElement("button");
    deleteCourseButton.type = "button";
    deleteCourseButton.textContent = "Kursangebot löschen";
    deleteCourseButton.addEventListener("click", () => {
      deleteParallelCourse(course.id, course.course_name);
    });

    courseBox.appendChild(courseHeading);
    courseBox.appendChild(subjectInfo);
    courseBox.appendChild(classList);
    courseBox.appendChild(deleteCourseButton);

    courseArea.appendChild(courseBox);
  });

  const addCourseArea = document.createElement("div");
  addCourseArea.className = "teacher-actions";

  const addCourseTitle = document.createElement("strong");
  addCourseTitle.textContent = "Neues Kursangebot hinzufügen";
  addCourseArea.appendChild(addCourseTitle);

  const courseForm = document.createElement("form");

  const subjectSelect = document.createElement("select");
  subjectSelect.required = true;

  const subjectPlaceholder = document.createElement("option");
  subjectPlaceholder.value = "";
  subjectPlaceholder.textContent = "Fach auswählen";
  subjectSelect.appendChild(subjectPlaceholder);

  parallelTrackSubjects.forEach(subject => {
    const option = document.createElement("option");
    option.value = subject.id;
    option.textContent = subject.name;
    subjectSelect.appendChild(option);
  });

  const courseNameInput = document.createElement("input");
  courseNameInput.type = "text";
  courseNameInput.placeholder = "Kursname (optional)";

const courseCountInput = document.createElement("input");
courseCountInput.type = "number";
courseCountInput.min = "1";
courseCountInput.max = "50";
courseCountInput.value = "1";
courseCountInput.required = true;
courseCountInput.placeholder = "Anzahl der Kurse";
  
  const classTitle = document.createElement("p");
  classTitle.textContent = "Beteiligte Klassen auswählen:";

  const classSelection = document.createElement("div");

  const availableClasses = parallelTrackClasses.filter(
    item => item.school_year_id === track.school_year_id
  );

  if (availableClasses.length === 0) {
    const noClasses = document.createElement("p");
    noClasses.textContent =
      "Für dieses Schuljahr sind noch keine Klassen angelegt.";
    classSelection.appendChild(noClasses);
  }

  availableClasses.forEach(item => {
    const label = document.createElement("label");
    label.style.display = "block";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "parallelCourseClass";
    checkbox.value = item.id;

    const grade = item.grade_levels?.name || "Jahrgang ?";
    label.appendChild(checkbox);
    label.appendChild(
      document.createTextNode(` ${grade} · ${item.name}`)
    );

    classSelection.appendChild(label);
  });

  const addButton = document.createElement("button");
  addButton.type = "submit";
  addButton.textContent = "Kursangebot hinzufügen";

  courseForm.appendChild(subjectSelect);
  courseForm.appendChild(courseCountInput);
  courseForm.appendChild(courseNameInput);
  courseForm.appendChild(classTitle);
  courseForm.appendChild(classSelection);
  courseForm.appendChild(addButton);

  courseForm.addEventListener("submit", event => {
    event.preventDefault();

    const selectedClassIds = Array.from(
      courseForm.querySelectorAll(
        'input[name="parallelCourseClass"]:checked'
      )
    ).map(input => input.value);

    if (!subjectSelect.value) {
      parallelTracksMessage.textContent =
        "Bitte wähle ein Fach aus.";
      return;
    }

    if (selectedClassIds.length === 0) {
      parallelTracksMessage.textContent =
        "Bitte wähle mindestens eine Klasse aus.";
      return;
    }

    const subject = parallelTrackSubjects.find(
      item => item.id === subjectSelect.value
    );

    const courseName =
      courseNameInput.value.trim() || subject.name;

const courseCount = Number(courseCountInput.value);

if (!Number.isInteger(courseCount) || courseCount < 1 || courseCount > 50) {
  parallelTracksMessage.textContent =
    "Bitte gib eine Kursanzahl zwischen 1 und 50 ein.";
  return;
}
    
    addParallelCourse(
  track,
  subjectSelect.value,
  courseName,
  courseCount,
  selectedClassIds
);
  });

  addCourseArea.appendChild(courseForm);

  const deleteTrackButton = document.createElement("button");
  deleteTrackButton.type = "button";
  deleteTrackButton.textContent = "Schiene löschen";
  deleteTrackButton.addEventListener("click", () => {
    deleteParallelTrack(track.id, track.name);
  });

  entry.appendChild(title);
  entry.appendChild(info);
  entry.appendChild(courseArea);
  entry.appendChild(addCourseArea);
  entry.appendChild(deleteTrackButton);

  parallelTrackList.appendChild(entry);
}

async function addParallelCourse(track, subjectId, courseName, courseCount, classIds) {
  parallelTracksMessage.textContent =
    "Kursangebot wird gespeichert ...";

  const { data: course, error } = await suvDb
    .from("timetable_parallel_courses")
    .insert({
  parallel_group_id: track.id,
  school_year_id: track.school_year_id,
  subject_id: subjectId,
  course_name: courseName,
  course_count: courseCount
})
    .select("id")
    .single();

  if (error) {
    parallelTracksMessage.textContent =
      "Fehler beim Erstellen des Kursangebots: " + error.message;
    return;
  }

  const classRows = classIds.map(classId => ({
    course_id: course.id,
    school_year_id: track.school_year_id,
    class_id: classId
  }));

  const { error: classError } = await suvDb
    .from("timetable_parallel_course_classes")
    .insert(classRows);

  if (classError) {
    await suvDb
      .from("timetable_parallel_courses")
      .delete()
      .eq("id", course.id);

    parallelTracksMessage.textContent =
      "Fehler bei der Klassenzuordnung: " + classError.message;
    return;
  }

  parallelTracksMessage.textContent =
    "Kursangebot und Klassen wurden gespeichert.";

  await loadParallelTracks();
}

async function removeParallelCourseClass(linkId) {
  if (!confirm("Möchtest du diese Klasse aus dem Kursangebot entfernen?")) {
    return;
  }

  const { error } = await suvDb
    .from("timetable_parallel_course_classes")
    .delete()
    .eq("id", linkId);

  if (error) {
    parallelTracksMessage.textContent =
      "Fehler beim Entfernen: " + error.message;
    return;
  }

  parallelTracksMessage.textContent =
    "Klasse wurde aus dem Kursangebot entfernt.";

  await loadParallelTracks();
}

async function deleteParallelCourse(courseId, courseName) {
  if (!confirm(`Möchtest du das Kursangebot "${courseName}" wirklich löschen?`)) {
    return;
  }

  const { error } = await suvDb
    .from("timetable_parallel_courses")
    .delete()
    .eq("id", courseId);

  if (error) {
    parallelTracksMessage.textContent =
      "Fehler beim Löschen: " + error.message;
    return;
  }

  parallelTracksMessage.textContent =
    "Kursangebot wurde gelöscht.";

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
    "Schiene wurde gelöscht.";

  await loadParallelTracks();
}

loadParallelTrackData();
