// SUV – Supabase-Verbindung

const { createClient } = supabase;

const suvDb = createClient(
  window.SUV_CONFIG.SUPABASE_URL,
  window.SUV_CONFIG.SUPABASE_KEY
);

console.log("SUV: Supabase-Verbindung initialisiert.");
// SUV – Navigation mit Rollenprüfung

document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", async () => {
    const pageId = button.dataset.page;

    // Benutzerrolle aus der Datenbank prüfen
    const { data: sessionData } = await suvDb.auth.getSession();

    if (!sessionData.session) {
      return;
    }

    const { data: profile, error } = await suvDb
      .from("profiles")
      .select("role")
      .eq("id", sessionData.session.user.id)
      .single();

    if (error || !profile) {
      alert("Benutzerrechte konnten nicht geprüft werden.");
      return;
    }

    // Administrationsbereich schützen
    if (
      pageId === "administration" &&
      profile.role !== "administrator"
    ) {
      alert("Du hast keine Berechtigung für diesen Bereich.");
      return;
    }

    // Navigation ausführen
    document.querySelectorAll(".nav-item").forEach(item => {
      item.classList.remove("active");
    });

    document.querySelectorAll(".page").forEach(page => {
      page.classList.remove("active");
    });

    button.classList.add("active");

    const selectedPage = document.getElementById(pageId);

    if (selectedPage) {
      selectedPage.classList.add("active");
    }

    document.getElementById("pageTitle").textContent =
      button.textContent.trim();
  });
});
// SUV – Verbindungstest

async function testSUVConnection() {
  const status = document.getElementById("connectionStatus");

  status.textContent = "Verbindung zu Supabase wird geprüft ...";

  try {
    const { data, error } = await suvDb
      .from("profiles")
      .select("id, role")
      .limit(1);

    if (error) {
      status.textContent =
        "Datenbank antwortet, aber Zugriff nicht möglich: " +
        error.message;

      status.style.background = "#fff0e5";
      status.style.color = "#8a3b08";
      return;
    }

    status.textContent =
      "Verbindung zur SUV-Datenbank erfolgreich.";

    status.style.background = "#e5f5e9";
    status.style.color = "#176b35";

  } catch (error) {
    status.textContent =
      "Verbindungsfehler: " + error.message;

    status.style.background = "#fde8e8";
    status.style.color = "#a12626";
  }
}

testSUVConnection();

// SUV – Benutzeranmeldung

const loginForm = document.getElementById("loginForm");
const loginScreen = document.getElementById("loginScreen");
const loginMessage = document.getElementById("loginMessage");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const loginButton = document.getElementById("loginButton");

  loginButton.disabled = true;
  loginButton.textContent = "Anmeldung läuft ...";
  loginMessage.textContent = "";

  try {
    const { data, error } = await suvDb.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    const { data: profile, error: profileError } = await suvDb
      .from("profiles")
      .select("first_name, last_name, role")
      .eq("id", data.user.id)
      .single();

    if (profileError) {
      throw new Error(
        "Benutzerprofil konnte nicht geladen werden: " +
        profileError.message
      );
    }

    const roleNames = {
      administrator: "Administrator",
      planner: "Stundenplaner",
      teacher: "Lehrkraft"
    };

    if (!roleNames[profile.role]) {
      throw new Error("Ungültige Benutzerrolle: " + profile.role);
    }

    document.querySelector(".user-avatar").textContent =
      (profile.first_name || "U").charAt(0).toUpperCase();

    const userArea = document.querySelector(".user-area");

    userArea.querySelector("strong").textContent =
      [profile.first_name, profile.last_name]
        .filter(Boolean)
        .join(" ") || "Benutzer";

    userArea.querySelector("span").textContent =
      roleNames[profile.role];

    const adminNavItem = document.getElementById("adminNavItem");

    if (adminNavItem) {
      adminNavItem.style.display =
        profile.role === "administrator" ? "flex" : "none";
    }

    // Anmeldemaske nach erfolgreicher Anmeldung ausblenden
    loginScreen.style.display = "none";

  } catch (error) {
    loginMessage.textContent = error.message;
    loginMessage.style.color = "#b42318";
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Anmelden";
  }
});

/// SUV – Anmeldung und Benutzerrolle wiederherstellen

async function checkSUVLogin() {
  const { data, error } = await suvDb.auth.getSession();

  if (error) {
    loginMessage.textContent = error.message;
    return;
  }

  if (!data.session) {
    loginScreen.style.display = "flex";
    return;
  }

  const userId = data.session.user.id;

  const { data: profile, error: profileError } = await suvDb
    .from("profiles")
    .select("first_name, last_name, role")
    .eq("id", userId)
    .single();

  if (profileError) {
    loginMessage.textContent =
      "Benutzerprofil konnte nicht geladen werden: " +
      profileError.message;
    return;
  }

  const roleNames = {
    administrator: "Administrator",
    planner: "Stundenplaner",
    teacher: "Lehrkraft"
  };

  if (!roleNames[profile.role]) {
    loginMessage.textContent = "Ungültige Benutzerrolle.";
    return;
  }

  // Benutzeranzeige aktualisieren

  document.querySelector(".user-avatar").textContent =
    (profile.first_name || "U").charAt(0).toUpperCase();

  const userArea = document.querySelector(".user-area");

  userArea.querySelector("strong").textContent =
    [profile.first_name, profile.last_name]
      .filter(Boolean)
      .join(" ") || "Benutzer";

  userArea.querySelector("span").textContent =
    roleNames[profile.role];

  // Administrationsmenü steuern

  const adminNavItem = document.getElementById("adminNavItem");

  if (adminNavItem) {
    adminNavItem.style.display =
      profile.role === "administrator" ? "flex" : "none";
  }

  loginScreen.style.display = "none";
}

checkSUVLogin();

// SUV – Lehrkräfteverwaltung

const teacherForm = document.getElementById("teacherForm");
const teacherList = document.getElementById("teacherList");
const teacherMessage = document.getElementById("teacherMessage");

async function loadTeachers() {
  if (!teacherList) return;

  teacherList.textContent = "Lehrkräfte werden geladen ...";

  const { data, error } = await suvDb
    .from("teachers")
    .select("*")
    .order("last_name", { ascending: true });

  if (error) {
    teacherList.textContent =
      "Fehler beim Laden: " + error.message;
    return;
  }

  if (!data || data.length === 0) {
    teacherList.textContent = "Noch keine Lehrkräfte vorhanden.";
    return;
  }

  teacherList.innerHTML = "";

  data.forEach(teacher => {
    const entry = document.createElement("div");
    entry.className = "teacher-entry";

    const details = document.createElement("div");

    const name = document.createElement("strong");
    name.textContent =
      `${teacher.first_name} ${teacher.last_name}`;

    const info = document.createElement("p");
    info.textContent =
      `Kürzel: ${teacher.short_code || "–"} · Pflichtstunden: ${teacher.weekly_required_hours ?? "–"}`;

    details.appendChild(name);
    details.appendChild(info);

    const actions = document.createElement("div");
    actions.className = "teacher-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Bearbeiten";
    editButton.addEventListener("click", () => {
      editTeacher(teacher);
    });
    
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Löschen";
    deleteButton.addEventListener("click", () => {
      deleteTeacher(teacher.id);
    });

    actions.appendChild(editButton);
    actions.appendChild(deleteButton);

    entry.appendChild(details);
    entry.appendChild(actions);

    teacherList.appendChild(entry);
  });
}

if (teacherForm) {
  teacherForm.addEventListener("submit", async event => {
    event.preventDefault();

    const id = document.getElementById("teacherId").value;

    const firstName =
      document.getElementById("teacherFirstName").value.trim();

    const lastName =
      document.getElementById("teacherLastName").value.trim();

    const shortCode =
      document.getElementById("teacherShortCode").value
        .trim()
        .toUpperCase();

    const weeklyHours =
      Number(document.getElementById("teacherWeeklyHours").value);

    const saveButton =
      document.getElementById("teacherSaveButton");

    saveButton.disabled = true;
    teacherMessage.textContent = "Wird gespeichert ...";

    const teacherData = {
      first_name: firstName,
      last_name: lastName,
      short_code: shortCode,
      weekly_required_hours: weeklyHours
    };

    let result;

    if (id) {
      result = await suvDb
        .from("teachers")
        .update(teacherData)
        .eq("id", id);
    } else {
      result = await suvDb
        .from("teachers")
        .insert(teacherData);
    }

    saveButton.disabled = false;

    if (result.error) {
      teacherMessage.textContent =
        "Fehler: " + result.error.message;
      return;
    }

    teacherMessage.textContent = id
      ? "Lehrkraft erfolgreich aktualisiert."
      : "Lehrkraft erfolgreich gespeichert.";

    teacherForm.reset();

    document.getElementById("teacherId").value = "";

    saveButton.textContent = "Lehrkraft speichern";

    document.getElementById("teacherCancelEdit").style.display =
      "none";

    await loadTeachers();
  });
}

loadTeachers();

// Lehrkraft bearbeiten

function editTeacher(teacher) {
  document.getElementById("teacherId").value = teacher.id;

  document.getElementById("teacherFirstName").value =
    teacher.first_name;

  document.getElementById("teacherLastName").value =
    teacher.last_name;

  document.getElementById("teacherShortCode").value =
    teacher.short_code || "";

  document.getElementById("teacherWeeklyHours").value =
    teacher.weekly_required_hours ?? "";

  document.getElementById("teacherSaveButton").textContent =
    "Änderungen speichern";

  document.getElementById("teacherCancelEdit").style.display =
    "inline-block";

  teacherMessage.textContent =
    "Bearbeitungsmodus: " +
    teacher.first_name + " " + teacher.last_name;

  document.getElementById("teacherFirstName").focus();
}


// Bearbeitung abbrechen

document.getElementById("teacherCancelEdit")
  .addEventListener("click", () => {
    teacherForm.reset();

    document.getElementById("teacherId").value = "";

    document.getElementById("teacherSaveButton").textContent =
      "Lehrkraft speichern";

    document.getElementById("teacherCancelEdit").style.display =
      "none";

    teacherMessage.textContent = "";
  });


// Lehrkraft löschen

async function deleteTeacher(id) {
  const confirmed = confirm(
    "Möchtest du diese Lehrkraft wirklich löschen?"
  );

  if (!confirmed) return;

  const { error } = await suvDb
    .from("teachers")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Fehler beim Löschen: " + error.message);
    return;
  }

  teacherMessage.textContent =
    "Lehrkraft erfolgreich gelöscht.";

  await loadTeachers();
}

// SUV – Fächerverwaltung

const subjectForm = document.getElementById("subjectForm");
const subjectList = document.getElementById("subjectList");
const subjectMessage = document.getElementById("subjectMessage");

async function loadSubjects() {
  if (!subjectList) return;

  subjectList.textContent = "Fächer werden geladen ...";

  const { data, error } = await suvDb
    .from("subjects")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
  roomList.textContent =
    "Fehler beim Laden der Räume: " +
    error.message +
    " (Code: " + error.code + ")";

  console.error("SUV Räume:", error);
  return;
}

  if (!data || data.length === 0) {
    subjectList.textContent = "Noch keine Fächer vorhanden.";
    return;
  }

  subjectList.innerHTML = "";

  data.forEach(subject => {
    const entry = document.createElement("div");
    entry.className = "teacher-entry";

    const details = document.createElement("div");

    const name = document.createElement("strong");
    name.textContent = subject.name;

    const info = document.createElement("p");
    info.textContent =
      `Kürzel: ${subject.short_code || "–"} · Fachbereich: ${subject.department || "–"} · Raumtyp: ${subject.required_room_type || "Keiner"}`;

    details.appendChild(name);
    details.appendChild(info);

    const actions = document.createElement("div");
    actions.className = "teacher-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Bearbeiten";
    editButton.addEventListener("click", () => {
      editSubject(subject);
    });
    
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Löschen";
    deleteButton.addEventListener("click", () => {
      deleteSubject(subject.id);
    });

    actions.appendChild(editButton);
    actions.appendChild(deleteButton);

    entry.appendChild(details);
    entry.appendChild(actions);

    subjectList.appendChild(entry);
  });
}


// Fach bearbeiten

function editSubject(subject) {
  document.getElementById("subjectId").value = subject.id;

  document.getElementById("subjectName").value =
    subject.name || "";

  document.getElementById("subjectShortCode").value =
    subject.short_code || "";

  document.getElementById("subjectDepartment").value =
    subject.department || "";

  document.getElementById("subjectRoomType").value =
    subject.required_room_type || "";

  document.getElementById("subjectColor").value =
    subject.color || "#2563eb";

  document.getElementById("subjectSaveButton").textContent =
    "Änderungen speichern";

  document.getElementById("subjectCancelEdit").style.display =
    "inline-block";

  subjectMessage.textContent =
    "Bearbeitungsmodus: " + subject.name;
}


// Bearbeitung abbrechen

document.getElementById("subjectCancelEdit")
  .addEventListener("click", () => {
    subjectForm.reset();

    document.getElementById("subjectId").value = "";

    document.getElementById("subjectSaveButton").textContent =
      "Fach speichern";

    document.getElementById("subjectCancelEdit").style.display =
      "none";

    subjectMessage.textContent = "";
  });


// Fach löschen

async function deleteSubject(id) {
  const confirmed = confirm(
    "Möchtest du dieses Fach wirklich löschen?"
  );

  if (!confirmed) return;

  const { error } = await suvDb
    .from("subjects")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Fehler beim Löschen: " + error.message);
    return;
  }

  subjectMessage.textContent =
    "Fach erfolgreich gelöscht.";

  await loadSubjects();
}


// Fach speichern oder aktualisieren

if (subjectForm) {
  subjectForm.addEventListener("submit", async event => {
    event.preventDefault();

    const id = document.getElementById("subjectId").value;

    const subjectData = {
      name: document.getElementById("subjectName").value.trim(),
      short_code: document.getElementById("subjectShortCode").value
        .trim()
        .toUpperCase(),
      department: document.getElementById("subjectDepartment").value.trim() || null,
      required_room_type:
        document.getElementById("subjectRoomType").value || null,
      color: document.getElementById("subjectColor").value
    };

    const saveButton =
      document.getElementById("subjectSaveButton");

    saveButton.disabled = true;
    subjectMessage.textContent = "Fach wird gespeichert ...";

    let result;

    if (id) {
      result = await suvDb
        .from("subjects")
        .update(subjectData)
        .eq("id", id);
    } else {
      result = await suvDb
        .from("subjects")
        .insert(subjectData);
    }

    saveButton.disabled = false;

    if (result.error) {
      subjectMessage.textContent =
        "Fehler: " + result.error.message;
      return;
    }

    subjectMessage.textContent = id
      ? "Fach erfolgreich aktualisiert."
      : "Fach erfolgreich gespeichert.";

    subjectForm.reset();

    document.getElementById("subjectId").value = "";

    saveButton.textContent = "Fach speichern";

    document.getElementById("subjectCancelEdit").style.display =
      "none";

    await loadSubjects();
  });
}

loadSubjects();

// Bearbeitung abbrechen

document.getElementById("subjectCancelEdit")
  .addEventListener("click", () => {
    subjectForm.reset();

    document.getElementById("subjectId").value = "";

    document.getElementById("subjectSaveButton").textContent =
      "Fach speichern";

    document.getElementById("subjectCancelEdit").style.display =
      "none";

    subjectMessage.textContent = "";
  });


// Fach löschen

async function deleteSubject(id) {
  const confirmed = confirm(
    "Möchtest du dieses Fach wirklich löschen?"
  );

  if (!confirmed) return;

  const { error } = await suvDb
    .from("subjects")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Fehler beim Löschen: " + error.message);
    return;
  }

  subjectMessage.textContent =
    "Fach erfolgreich gelöscht.";

  await loadSubjects();
}


// Fach speichern oder aktualisieren

if (subjectForm) {
  subjectForm.addEventListener("submit", async event => {
    event.preventDefault();

    const id = document.getElementById("subjectId").value;

    const subjectData = {
  name: document.getElementById("subjectName").value.trim(),
  short_code: document.getElementById("subjectShortCode").value
    .trim()
    .toUpperCase(),
  department: document.getElementById("subjectDepartment").value.trim() || null,
  required_room_type:
    document.getElementById("subjectRoomType").value || null,
  color: document.getElementById("subjectColor").value
};

    const saveButton =
      document.getElementById("subjectSaveButton");

    saveButton.disabled = true;
    subjectMessage.textContent = "Fach wird gespeichert ...";

    let result;

    if (id) {
      result = await suvDb
        .from("subjects")
        .update(subjectData)
        .eq("id", id);
    } else {
      result = await suvDb
        .from("subjects")
        .insert(subjectData);
    }

    saveButton.disabled = false;

    if (result.error) {
      subjectMessage.textContent =
        "Fehler: " + result.error.message;
      return;
    }

    subjectMessage.textContent = id
      ? "Fach erfolgreich aktualisiert."
      : "Fach erfolgreich gespeichert.";

    subjectForm.reset();

    document.getElementById("subjectId").value = "";

    saveButton.textContent = "Fach speichern";

    document.getElementById("subjectCancelEdit").style.display =
      "none";

    await loadSubjects();
  });
}

loadSubjects();


// SUV – Räumeverwaltung

const roomForm = document.getElementById("roomForm");
const roomList = document.getElementById("roomList");
const roomMessage = document.getElementById("roomMessage");


// Räume laden

async function loadRooms() {
  const { data, error } = await suvDb
    .from("rooms")
    .select("*")
    .order("name");

  if (error) {
    roomList.textContent =
      "Fehler beim Laden: " + error.message;
    return;
  }

  roomList.innerHTML = "";

  if (!data || data.length === 0) {
    roomList.textContent = "Noch keine Räume vorhanden.";
    return;
  }

  data.forEach(room => {
    const card = document.createElement("div");
    card.className = "teacher-entry";

    const info = document.createElement("div");

    info.innerHTML = `
      <strong>${room.name}</strong>
      <p>
        ${room.room_type || "Kein Raumtyp"} ·
        ${room.capacity} Plätze ·
        ${room.is_active ? "Aktiv" : "Inaktiv"}
      </p>
    `;

    const actions = document.createElement("div");
    actions.className = "teacher-entry-actions";

    const editButton = document.createElement("button");
    editButton.textContent = "Bearbeiten";
    editButton.addEventListener("click", () => editRoom(room));

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Löschen";
    deleteButton.addEventListener("click", () => deleteRoom(room.id));

    actions.append(editButton, deleteButton);
    card.append(info, actions);
    roomList.appendChild(card);
  });
}


// Raum bearbeiten

function editRoom(room) {
  document.getElementById("roomId").value = room.id;
  document.getElementById("roomName").value = room.name || "";
  document.getElementById("roomType").value = room.room_type || "";
  document.getElementById("roomCapacity").value = room.capacity || "";
  document.getElementById("roomActive").value =
    String(room.is_active !== false);

  document.getElementById("roomSaveButton").textContent =
    "Änderungen speichern";

  document.getElementById("roomCancelEdit").style.display =
    "inline-block";

  roomMessage.textContent =
    "Bearbeitungsmodus: " + room.name;
}


// Bearbeitung abbrechen

document.getElementById("roomCancelEdit")
  .addEventListener("click", () => {
    roomForm.reset();

    document.getElementById("roomId").value = "";

    document.getElementById("roomSaveButton").textContent =
      "Raum speichern";

    document.getElementById("roomCancelEdit").style.display =
      "none";

    roomMessage.textContent = "";
  });


// Raum löschen

async function deleteRoom(id) {
  const confirmed = confirm(
    "Möchtest du diesen Raum wirklich löschen?"
  );

  if (!confirmed) return;

  const { error } = await suvDb
    .from("rooms")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Fehler beim Löschen: " + error.message);
    return;
  }

  roomMessage.textContent = "Raum erfolgreich gelöscht.";

  await loadRooms();
}


// Raum speichern oder aktualisieren

if (roomForm) {
  roomForm.addEventListener("submit", async event => {
    event.preventDefault();

    const id = document.getElementById("roomId").value;

   const roomData = {
  name: document.getElementById("roomName").value.trim(),

  room_type: document.getElementById("roomType").value,

  capacity: Number(
    document.getElementById("roomCapacity").value
  ),

  is_active:
    document.getElementById("roomActive").value === "true"
};

    const saveButton =
      document.getElementById("roomSaveButton");

    saveButton.disabled = true;
    roomMessage.textContent = "Raum wird gespeichert ...";

    let result;

    if (id) {
      result = await suvDb
        .from("rooms")
        .update(roomData)
        .eq("id", id);
    } else {
      result = await suvDb
        .from("rooms")
        .insert(roomData);
    }

    saveButton.disabled = false;

    if (result.error) {
      roomMessage.textContent =
        "Fehler: " + result.error.message;
      return;
    }

    roomMessage.textContent = id
      ? "Raum erfolgreich aktualisiert."
      : "Raum erfolgreich gespeichert.";

    roomForm.reset();

    document.getElementById("roomId").value = "";

    saveButton.textContent = "Raum speichern";

    document.getElementById("roomCancelEdit").style.display =
      "none";

    await loadRooms();
  });
}

loadRooms();

// SUV – Klassenverwaltung

const classForm = document.getElementById("classForm");
const classList = document.getElementById("classList");
const classGrade = document.getElementById("classGrade");
const classMessage = document.getElementById("classMessage");
const classSchoolYearSelect =
  document.getElementById("classSchoolYearSelect");

let activeSUVSchoolYearId = null;
let selectedSUVSchoolYearId = null;


// Jahrgangsstufen laden

async function loadClassGradeLevels() {
  const { data, error } = await suvDb
    .from("grade_levels")
    .select("id, name, sort_order")
    .order("sort_order");

  if (error) {
    classMessage.textContent = error.message;
    return;
  }

  classGrade.innerHTML =
    '<option value="">Jahrgangsstufe auswählen</option>';

  data.forEach(grade => {
    const option = document.createElement("option");
    option.value = grade.id;
    option.textContent = grade.name;
    classGrade.appendChild(option);
  });
}


// Aktives Schuljahr laden

async function loadActiveSUVSchoolYear() {
  const { data, error } = await suvDb
    .from("school_years")
    .select("id, name")
    .eq("is_active", true)
    .single();

  if (error) {
    classMessage.textContent =
      "Aktives Schuljahr konnte nicht geladen werden.";
    return;
  }

  activeSUVSchoolYearId = data.id;
  selectedSUVSchoolYearId = data.id;

  await loadClasses();
}


// Schuljahre laden

async function loadClassSchoolYears() {
  const { data, error } = await suvDb
    .from("school_years")
    .select("id, name, is_active")
    .order("start_date", { ascending: false });

  if (error) {
    classMessage.textContent = error.message;
    return;
  }

  classSchoolYearSelect.innerHTML = "";

  data.forEach(schoolYear => {
    const option = document.createElement("option");

    option.value = schoolYear.id;
    option.textContent = schoolYear.name +
      (schoolYear.is_active ? " (Aktuell)" : "");

    classSchoolYearSelect.appendChild(option);
  });
}


// Klassen laden

async function loadClasses() {
  const { data, error } = await suvDb
    .from("classes")
    .select(`
      id,
      name,
      grade_level_id,
      student_count,
      grade_levels (
        name,
        sort_order
      )
    `)
    .eq("school_year_id", selectedSUVSchoolYearId)
    .order("name");

  if (error) {
    classList.textContent = error.message;
    return;
  }

  classList.innerHTML = "";

  if (!data.length) {
    classList.textContent = "Noch keine Klassen vorhanden.";
    return;
  }

  data.forEach(schoolClass => {
    const card = document.createElement("div");
    card.className = "class-card";

    const heading = document.createElement("h4");
    heading.textContent = schoolClass.name;

    const grade = document.createElement("p");
    grade.textContent =
      "Jahrgangsstufe: " +
      (schoolClass.grade_levels?.name || "Unbekannt");

    const students = document.createElement("p");
    students.textContent =
      "Schülerzahl: " + schoolClass.student_count;

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Bearbeiten";

    editButton.addEventListener("click", () => {
      editClass(schoolClass);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Löschen";

    deleteButton.addEventListener("click", async () => {

      if (selectedSUVSchoolYearId !== activeSUVSchoolYearId) {
        classMessage.textContent =
          "Klassen vergangener Schuljahre können nicht gelöscht werden.";
        return;
      }

      if (!confirm(
        "Soll die Klasse " + schoolClass.name +
        " wirklich gelöscht werden?"
      )) {
        return;
      }

      const { error } = await suvDb
        .from("classes")
        .delete()
        .eq("id", schoolClass.id);

      if (error) {
        classMessage.textContent = error.message;
        return;
      }

      classMessage.textContent = "Klasse erfolgreich gelöscht.";
      await loadClasses();
    });

    card.append(
      heading,
      grade,
      students,
      editButton,
      deleteButton
    );

    classList.appendChild(card);
  });
}


// Klasse bearbeiten

function editClass(schoolClass) {

  if (selectedSUVSchoolYearId !== activeSUVSchoolYearId) {
    classMessage.textContent =
      "Klassen vergangener Schuljahre können nicht bearbeitet werden.";
    return;
  }

  document.getElementById("classId").value = schoolClass.id;
  document.getElementById("className").value = schoolClass.name;
  classGrade.value = schoolClass.grade_level_id;

  document.getElementById("classStudentCount").value =
    schoolClass.student_count;

  document.getElementById("classSaveButton").textContent =
    "Änderungen speichern";

  document.getElementById("classCancelEdit").style.display =
    "inline-block";

  classMessage.textContent = "Klasse wird bearbeitet.";
}


// Bearbeitungsrechte aktualisieren

function updateClassEditingState() {
  const canEdit =
    selectedSUVSchoolYearId === activeSUVSchoolYearId;

  classForm.querySelectorAll("input, select, button").forEach(element => {
    element.disabled = !canEdit;
  });

  classMessage.textContent = canEdit
    ? "Aktuelles Schuljahr: Bearbeitung möglich."
    : "Vergangenes Schuljahr: Nur Lesezugriff.";
}


// Schuljahr wechseln

classSchoolYearSelect.addEventListener("change", async () => {
  selectedSUVSchoolYearId = classSchoolYearSelect.value;

  await loadClasses();
  updateClassEditingState();
});


// Klassenverwaltung initialisieren

async function initClassManagement() {
  await loadClassGradeLevels();
  await loadActiveSUVSchoolYear();
  await loadClassSchoolYears();

  classSchoolYearSelect.value = activeSUVSchoolYearId;

  updateClassEditingState();
}

initClassManagement();


// Klasse speichern oder aktualisieren

if (classForm) {
  classForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (selectedSUVSchoolYearId !== activeSUVSchoolYearId) {
      classMessage.textContent =
        "Vergangene Schuljahre können nicht bearbeitet werden.";
      return;
    }

    if (!activeSUVSchoolYearId) {
      classMessage.textContent = "Kein aktives Schuljahr gefunden.";
      return;
    }

    const classId = document.getElementById("classId").value;

    const classData = {
      school_year_id: activeSUVSchoolYearId,
      grade_level_id: classGrade.value,
      name: document.getElementById("className").value.trim(),
      student_count: Number(
        document.getElementById("classStudentCount").value
      )
    };

    let result;

    if (classId) {
      result = await suvDb
        .from("classes")
        .update(classData)
        .eq("id", classId);
    } else {
      result = await suvDb
        .from("classes")
        .insert(classData);
    }

    if (result.error) {
      classMessage.textContent = result.error.message;
      return;
    }

    classMessage.textContent = classId
      ? "Klasse erfolgreich aktualisiert."
      : "Klasse erfolgreich gespeichert.";

    classForm.reset();

    document.getElementById("classId").value = "";
    document.getElementById("classStudentCount").value = 0;

    document.getElementById("classSaveButton").textContent =
      "Klasse speichern";

    document.getElementById("classCancelEdit").style.display =
      "none";

    await loadClasses();
  });
}


// Bearbeitung abbrechen

const classCancelEdit =
  document.getElementById("classCancelEdit");

if (classCancelEdit) {
  classCancelEdit.addEventListener("click", () => {
    classForm.reset();

    document.getElementById("classId").value = "";
    document.getElementById("classStudentCount").value = 0;

    document.getElementById("classSaveButton").textContent =
      "Klasse speichern";

    classCancelEdit.style.display = "none";

    classMessage.textContent = "";
  });
}

// SUV – Schuljahresverwaltung

const schoolYearForm = document.getElementById("schoolYearForm");
const schoolYearList = document.getElementById("schoolYearList");
const schoolYearMessage = document.getElementById("schoolYearMessage");


// Schuljahre laden

async function loadSchoolYears() {
  const { data, error } = await suvDb
    .from("school_years")
    .select("id, name, start_date, end_date, is_active")
    .order("start_date", { ascending: false });

  if (error) {
    schoolYearList.textContent = error.message;
    return;
  }

  if (!data.length) {
    schoolYearList.textContent = "Noch keine Schuljahre vorhanden.";
    return;
  }

  schoolYearList.innerHTML = "";

  data.forEach(schoolYear => {
    const card = document.createElement("div");
    card.className = "class-card";

    const heading = document.createElement("h4");
    heading.textContent = schoolYear.name;

    const start = document.createElement("p");
    start.textContent = "Beginn: " + schoolYear.start_date;

    const end = document.createElement("p");
    end.textContent = "Ende: " + schoolYear.end_date;

    const status = document.createElement("p");
    status.textContent = schoolYear.is_active
      ? "Status: Aktives Schuljahr"
      : "Status: Inaktiv";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Bearbeiten";

    editButton.addEventListener("click", () => {
      document.getElementById("schoolYearId").value = schoolYear.id;
      document.getElementById("schoolYearName").value = schoolYear.name;
      document.getElementById("schoolYearStart").value = schoolYear.start_date;
      document.getElementById("schoolYearEnd").value = schoolYear.end_date;

      document.getElementById("schoolYearSaveButton").textContent =
        "Änderungen speichern";

      document.getElementById("schoolYearCancelEdit").style.display =
        "inline-block";

      schoolYearMessage.textContent = "Schuljahr wird bearbeitet.";

      schoolYearForm.scrollIntoView({ behavior: "smooth" });
    });

// Schuljahr aktivieren

if (!schoolYear.is_active) {
  const activateButton = document.createElement("button");
  activateButton.type = "button";
  activateButton.textContent = "Schuljahr aktivieren";

  activateButton.addEventListener("click", async () => {
    const confirmed = confirm(
      "Möchtest du das Schuljahr " +
      schoolYear.name +
      " aktivieren?"
    );

    if (!confirmed) return;

    const { error } = await suvDb.rpc(
      "activate_school_year",
      {
        target_school_year_id: schoolYear.id
      }
    );

    if (error) {
      schoolYearMessage.textContent = error.message;
      return;
    }

    schoolYearMessage.textContent =
      "Schuljahr erfolgreich aktiviert.";

    await loadSchoolYears();
    await loadActiveSUVSchoolYear();
  });

  card.appendChild(activateButton);
}
    
    const deleteButton = document.createElement("button");
deleteButton.type = "button";
deleteButton.textContent = "Löschen";

deleteButton.addEventListener("click", async () => {

  if (schoolYear.is_active) {
    schoolYearMessage.textContent =
      "Das aktive Schuljahr kann nicht gelöscht werden.";
    return;
  }

  const { count, error: countError } = await suvDb
    .from("classes")
    .select("id", { count: "exact", head: true })
    .eq("school_year_id", schoolYear.id);

  if (countError) {
    schoolYearMessage.textContent = countError.message;
    return;
  }

  if (count > 0) {
    schoolYearMessage.textContent =
      "Dieses Schuljahr enthält noch Klassen und kann nicht gelöscht werden.";
    return;
  }

  const confirmed = confirm(
    "Soll das Schuljahr " + schoolYear.name + " wirklich gelöscht werden?"
  );

  if (!confirmed) return;

  const { error } = await suvDb
    .from("school_years")
    .delete()
    .eq("id", schoolYear.id);

  if (error) {
    schoolYearMessage.textContent = error.message;
    return;
  }

  schoolYearMessage.textContent =
    "Schuljahr erfolgreich gelöscht.";

  await loadSchoolYears();
});

card.append(heading, start, end, status, editButton, deleteButton);
schoolYearList.appendChild(card);
  });
}


// Schuljahr speichern oder aktualisieren

if (schoolYearForm) {
  schoolYearForm.addEventListener("submit", async event => {
    event.preventDefault();

    const id = document.getElementById("schoolYearId").value;

    const schoolYearData = {
      name: document.getElementById("schoolYearName").value.trim(),
      start_date: document.getElementById("schoolYearStart").value,
      end_date: document.getElementById("schoolYearEnd").value
    };

    if (schoolYearData.start_date >= schoolYearData.end_date) {
      schoolYearMessage.textContent =
        "Das Enddatum muss nach dem Anfangsdatum liegen.";
      return;
    }

    let result;

    if (id) {
      result = await suvDb
        .from("school_years")
        .update(schoolYearData)
        .eq("id", id);
    } else {
      result = await suvDb
        .from("school_years")
        .insert(schoolYearData);
    }

    if (result.error) {
      schoolYearMessage.textContent = result.error.message;
      return;
    }

    schoolYearMessage.textContent = id
      ? "Schuljahr erfolgreich aktualisiert."
      : "Schuljahr erfolgreich gespeichert.";

    resetSchoolYearForm();
    await loadSchoolYears();
  });
}


// Formular zurücksetzen

function resetSchoolYearForm() {
  schoolYearForm.reset();

  document.getElementById("schoolYearId").value = "";

  document.getElementById("schoolYearSaveButton").textContent =
    "Schuljahr speichern";

  document.getElementById("schoolYearCancelEdit").style.display =
    "none";
}


// Bearbeitung abbrechen

const schoolYearCancelEdit =
  document.getElementById("schoolYearCancelEdit");

if (schoolYearCancelEdit) {
  schoolYearCancelEdit.addEventListener("click", () => {
    resetSchoolYearForm();
    schoolYearMessage.textContent = "";
  });
}

// Schuljahresverwaltung initialisieren

loadSchoolYears();

// SUV – Zeitmodell: Unterrichtstage

const timeModelDays = document.getElementById("timeModelDays");

const weekDays = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag"
];


// Unterrichtstage laden

async function loadTimeModelDays() {
  timeModelDays.innerHTML = "Unterrichtstage werden geladen ...";

  const { data, error } = await suvDb
    .from("school_days")
    .select("*")
    .order("day_number");

  if (error) {
    timeModelDays.textContent = error.message;
    return;
  }

  // Standardtage beim ersten Aufruf anlegen

  if (data.length === 0) {
    const defaultDays = weekDays.map((day, index) => ({
      day_number: index + 1,
      day_name: day,
      is_active: true
    }));

    const { error: insertError } = await suvDb
      .from("school_days")
      .insert(defaultDays);

    if (insertError) {
      timeModelDays.textContent = insertError.message;
      return;
    }

    await loadTimeModelDays();
    return;
  }

  timeModelDays.innerHTML = "";

  weekDays.forEach((day, index) => {
    const savedDay = data.find(
      item => item.day_number === index + 1
    );

    const label = document.createElement("label");
    label.className = "time-day-option";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = index + 1;
    checkbox.checked = savedDay
      ? savedDay.is_active
      : false;

    const text = document.createElement("span");
    text.textContent = day;

    checkbox.addEventListener("change", async () => {
      const { error } = await suvDb
        .from("school_days")
        .update({
          is_active: checkbox.checked
        })
        .eq("day_number", index + 1);

      if (error) {
        checkbox.checked = !checkbox.checked;
        timeModelMessage.textContent =
          "Unterrichtstag konnte nicht gespeichert werden: " +
          error.message;
        return;
      }

      timeModelMessage.textContent =
        day + " wurde erfolgreich gespeichert.";
    });

    label.append(checkbox, text);
    timeModelDays.appendChild(label);
  });
}


// Unterrichtstage initialisieren

loadTimeModelDays();

// SUV – Zeitmodell: Unterrichtsstunden

const lessonTimeForm = document.getElementById("lessonTimeForm");
const lessonTimeList = document.getElementById("lessonTimeList");
const timeModelMessage = document.getElementById("timeModelMessage");


// Unterrichtsstunden laden

async function loadLessonTimes() {
  const { data, error } = await suvDb
    .from("lesson_times")
    .select("*")
    .order("lesson_number");

  if (error) {
    timeModelMessage.textContent = error.message;
    return;
  }

  lessonTimeList.innerHTML = "";

  if (!data.length) {
    lessonTimeList.textContent =
      "Noch keine Unterrichtsstunden vorhanden.";
    return;
  }

  data.forEach(lesson => {
    const card = document.createElement("div");
    card.className = "class-card";

    const heading = document.createElement("h4");
    heading.textContent = lesson.lesson_number + ". Stunde";

    const time = document.createElement("p");
    time.textContent =
      lesson.start_time.slice(0, 5) +
      " – " +
      lesson.end_time.slice(0, 5) +
      " Uhr";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Bearbeiten";

    editButton.addEventListener("click", () => {
      document.getElementById("lessonTimeId").value = lesson.id;
      document.getElementById("lessonNumber").value =
        lesson.lesson_number;
      document.getElementById("lessonStart").value =
        lesson.start_time.slice(0, 5);
      document.getElementById("lessonEnd").value =
        lesson.end_time.slice(0, 5);

      document.getElementById("lessonTimeSaveButton").textContent =
        "Änderungen speichern";

      document.getElementById("lessonTimeCancelEdit").style.display =
        "inline-block";

      timeModelMessage.textContent =
        "Unterrichtsstunde wird bearbeitet.";
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Löschen";

    deleteButton.addEventListener("click", async () => {
      if (!confirm(
        "Soll die " + lesson.lesson_number +
        ". Unterrichtsstunde wirklich gelöscht werden?"
      )) {
        return;
      }

      const { error } = await suvDb
        .from("lesson_times")
        .delete()
        .eq("id", lesson.id);

      if (error) {
        timeModelMessage.textContent = error.message;
        return;
      }

      timeModelMessage.textContent =
        "Unterrichtsstunde erfolgreich gelöscht.";

      await loadLessonTimes();
    });

    card.append(heading, time, editButton, deleteButton);
    lessonTimeList.appendChild(card);
  });
}


// Unterrichtsstunde speichern oder aktualisieren

if (lessonTimeForm) {
  lessonTimeForm.addEventListener("submit", async event => {
    event.preventDefault();

    const lessonId =
      document.getElementById("lessonTimeId").value;

    const startTime =
      document.getElementById("lessonStart").value;

    const endTime =
      document.getElementById("lessonEnd").value;

    if (endTime <= startTime) {
      timeModelMessage.textContent =
        "Das Ende muss nach dem Beginn liegen.";
      return;
    }

    const lessonData = {
      lesson_number: Number(
        document.getElementById("lessonNumber").value
      ),
      start_time: startTime,
      end_time: endTime
    };

    let result;

    if (lessonId) {
      result = await suvDb
        .from("lesson_times")
        .update(lessonData)
        .eq("id", lessonId);
    } else {
      result = await suvDb
        .from("lesson_times")
        .insert(lessonData);
    }

    if (result.error) {
      timeModelMessage.textContent = result.error.message;
      return;
    }

    timeModelMessage.textContent = lessonId
      ? "Unterrichtsstunde erfolgreich aktualisiert."
      : "Unterrichtsstunde erfolgreich gespeichert.";

    resetLessonTimeForm();
    await loadLessonTimes();
  });
}


// Formular zurücksetzen

function resetLessonTimeForm() {
  lessonTimeForm.reset();

  document.getElementById("lessonTimeId").value = "";

  document.getElementById("lessonTimeSaveButton").textContent =
    "Unterrichtsstunde speichern";

  document.getElementById("lessonTimeCancelEdit").style.display =
    "none";
}


// Bearbeitung abbrechen

document.getElementById("lessonTimeCancelEdit")
  .addEventListener("click", () => {
    resetLessonTimeForm();
    timeModelMessage.textContent = "";
  });


// Zeitmodell initialisieren

loadLessonTimes();


// SUV – Zeitmodell: Pausenverwaltung

const breakTimeForm = document.getElementById("breakTimeForm");
const breakTimeList = document.getElementById("breakTimeList");
const breakTimeMessage = document.getElementById("breakTimeMessage");


// Pausen laden

async function loadBreakTimes() {
  const { data, error } = await suvDb
    .from("break_times")
    .select("*")
    .order("start_time");

  if (error) {
    breakTimeMessage.textContent = error.message;
    return;
  }

  breakTimeList.innerHTML = "";

  if (!data.length) {
    breakTimeList.textContent = "Noch keine Pausen vorhanden.";
    return;
  }

  data.forEach(breakTime => {
    const card = document.createElement("div");
    card.className = "class-card";

    const heading = document.createElement("h4");
    heading.textContent = breakTime.name;

    const time = document.createElement("p");
    time.textContent =
      breakTime.start_time.slice(0, 5) +
      " – " +
      breakTime.end_time.slice(0, 5) +
      " Uhr";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Bearbeiten";

    editButton.addEventListener("click", () => {
      document.getElementById("breakTimeId").value = breakTime.id;
      document.getElementById("breakName").value = breakTime.name;
      document.getElementById("breakStart").value =
        breakTime.start_time.slice(0, 5);
      document.getElementById("breakEnd").value =
        breakTime.end_time.slice(0, 5);

      document.getElementById("breakTimeSaveButton").textContent =
        "Änderungen speichern";

      document.getElementById("breakTimeCancelEdit").style.display =
        "inline-block";

      breakTimeMessage.textContent = "Pause wird bearbeitet.";
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Löschen";

    deleteButton.addEventListener("click", async () => {
      if (!confirm(
        "Soll die Pause " + breakTime.name +
        " wirklich gelöscht werden?"
      )) {
        return;
      }

      const { error } = await suvDb
        .from("break_times")
        .delete()
        .eq("id", breakTime.id);

      if (error) {
        breakTimeMessage.textContent = error.message;
        return;
      }

      breakTimeMessage.textContent = "Pause erfolgreich gelöscht.";
      await loadBreakTimes();
    });

    card.append(heading, time, editButton, deleteButton);
    breakTimeList.appendChild(card);
  });
}


// Pause speichern oder aktualisieren

if (breakTimeForm) {
  breakTimeForm.addEventListener("submit", async event => {
    event.preventDefault();

    const breakId =
      document.getElementById("breakTimeId").value;

    const startTime =
      document.getElementById("breakStart").value;

    const endTime =
      document.getElementById("breakEnd").value;

    if (endTime <= startTime) {
      breakTimeMessage.textContent =
        "Das Ende muss nach dem Beginn liegen.";
      return;
    }

    const breakData = {
      name: document.getElementById("breakName").value.trim(),
      start_time: startTime,
      end_time: endTime
    };

    let result;

    if (breakId) {
      result = await suvDb
        .from("break_times")
        .update(breakData)
        .eq("id", breakId);
    } else {
      result = await suvDb
        .from("break_times")
        .insert(breakData);
    }

    if (result.error) {
      breakTimeMessage.textContent = result.error.message;
      return;
    }

    breakTimeMessage.textContent = breakId
      ? "Pause erfolgreich aktualisiert."
      : "Pause erfolgreich gespeichert.";

    resetBreakTimeForm();
    await loadBreakTimes();
  });
}


// Formular zurücksetzen

function resetBreakTimeForm() {
  breakTimeForm.reset();

  document.getElementById("breakTimeId").value = "";

  document.getElementById("breakTimeSaveButton").textContent =
    "Pause speichern";

  document.getElementById("breakTimeCancelEdit").style.display =
    "none";
}


// Bearbeitung abbrechen

document.getElementById("breakTimeCancelEdit")
  .addEventListener("click", () => {
    resetBreakTimeForm();
    breakTimeMessage.textContent = "";
  });


// Pausenverwaltung initialisieren

loadBreakTimes();


// SUV – Stundenplanung
// DOM-Elemente

const timetableSchoolYear =
  document.getElementById("timetableSchoolYear");

const timetableClass =
  document.getElementById("timetableClass");

const timetableMessage =
  document.getElementById("timetableMessage");

const timetableGrid =
  document.getElementById("timetableGrid");

const timetableEntryForm =
  document.getElementById("timetableEntryForm");

const timetableEntryId =
  document.getElementById("timetableEntryId");

const timetableDay =
  document.getElementById("timetableDay");

const timetableLesson =
  document.getElementById("timetableLesson");

const timetableSubject =
  document.getElementById("timetableSubject");

const timetableTeacher =
  document.getElementById("timetableTeacher");

const timetableRoom =
  document.getElementById("timetableRoom");

const timetableSaveButton =
  document.getElementById("timetableSaveButton");

const timetableCancelEdit =
  document.getElementById("timetableCancelEdit");


// Aktuelle Stundenplan-Auswahl

let activeTimetableVersionId = null;
let selectedTimetableClassId = null;
let selectedTimetableSchoolYearId = null;
let timetableEntries = [];
let activeTimetableVersionStatus = null;

// Schuljahre für die Stundenplanung laden

async function loadTimetableSchoolYears() {
  const { data, error } = await suvDb
    .from("school_years")
    .select("id, name, is_active")
    .order("name", { ascending: false });

  if (error) {
    timetableMessage.textContent =
      "Schuljahre konnten nicht geladen werden.";
    return;
  }

  timetableSchoolYear.innerHTML =
    '<option value="">Schuljahr auswählen</option>';

  data.forEach(year => {
    const option = document.createElement("option");

    option.value = year.id;
    option.textContent = year.name;

    timetableSchoolYear.appendChild(option);
  });

  const activeYear = data.find(year => year.is_active);

  if (activeYear) {
    timetableSchoolYear.value = activeYear.id;
    await loadTimetableVersion(activeYear.id);
  }
}


// Stundenplanversion laden

async function loadTimetableVersion(schoolYearId) {
  selectedTimetableSchoolYearId = schoolYearId;
  activeTimetableVersionId = null;

  const { data, error } = await suvDb
    .from("timetable_versions")
    .select("id, name, status")
    .eq("school_year_id", schoolYearId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    timetableMessage.textContent =
      "Stundenplanversion konnte nicht geladen werden.";
    return;
  }

  if (!data || data.length === 0) {
    timetableMessage.textContent =
      "Für dieses Schuljahr gibt es noch keine Stundenplanversion.";
    return;
  }

  activeTimetableVersionId = data[0].id;
  activeTimetableVersionStatus = data[0].status;

  timetableMessage.textContent =
    "Stundenplan: " + data[0].name +
    " (" + data[0].status + ")";

  await loadTimetableClasses(schoolYearId);
}


// Schuljahresauswahl

timetableSchoolYear.addEventListener("change", async () => {
  const schoolYearId = timetableSchoolYear.value;

  timetableClass.innerHTML =
    '<option value="">Bitte Klasse auswählen</option>';

  timetableGrid.innerHTML =
    "<p>Bitte zuerst eine Klasse auswählen.</p>";

  if (!schoolYearId) {
    activeTimetableVersionId = null;
    selectedTimetableSchoolYearId = null;
    return;
  }

  await loadTimetableVersion(schoolYearId);
});


// Initialisierung

loadTimetableSchoolYears();


// Klassen für die Stundenplanung laden

async function loadTimetableClasses(schoolYearId) {
  timetableClass.innerHTML =
    '<option value="">Klasse auswählen</option>';

  const { data, error } = await suvDb
    .from("classes")
    .select(`
      id,
      name,
      school_year_id
    `)
    .eq("school_year_id", schoolYearId)
    .order("name");

  if (error) {
    timetableMessage.textContent =
      "Klassen konnten nicht geladen werden.";
    return;
  }

  if (!data || data.length === 0) {
    timetableMessage.textContent =
      "Für dieses Schuljahr sind keine Klassen angelegt.";
    return;
  }

  data.forEach(schoolClass => {
    const option = document.createElement("option");

    option.value = schoolClass.id;
    option.textContent = schoolClass.name;

    timetableClass.appendChild(option);
  });
}


// Klassenauswahl

timetableClass.addEventListener("change", async () => {
  selectedTimetableClassId = timetableClass.value;

  timetableGrid.innerHTML =
    "<p>Stundenplan wird geladen ...</p>";

  if (!selectedTimetableClassId) {
    timetableGrid.innerHTML =
      "<p>Bitte zuerst eine Klasse auswählen.</p>";
    return;
  }

  await loadTimetableGrid();
});


// Wochenstundenplan laden

async function loadTimetableGrid() {
  if (!activeTimetableVersionId || !selectedTimetableClassId) {
    return;
  }

  timetableGrid.innerHTML =
    "<p>Stundenplan wird geladen ...</p>";

  // Unterrichtstage laden

  const { data: days, error: daysError } = await suvDb
    .from("school_days")
    .select("day_number, day_name")
    .eq("is_active", true)
    .order("day_number");

  if (daysError) {
    timetableGrid.textContent =
      "Unterrichtstage konnten nicht geladen werden.";
    return;
  }

  // Unterrichtsstunden laden

  const { data: lessons, error: lessonsError } = await suvDb
    .from("lesson_times")
    .select("lesson_number, start_time, end_time")
    .order("lesson_number");

  if (lessonsError) {
    timetableGrid.textContent =
      "Unterrichtsstunden konnten nicht geladen werden.";
    return;
  }

  // Unterrichtseinheiten laden

  const { data: entries, error: entriesError } = await suvDb
    .from("timetable_entries")
    .select(`
      id,
      weekday,
      period_number,
      class_subjects (
        subjects (
          name,
          short_code,
          color
        )
      ),
      teachers (
        first_name,
        last_name,
        short_code
      ),
      rooms (
        name
      )
    `)
    .eq("timetable_version_id", activeTimetableVersionId)
    .eq("class_id", selectedTimetableClassId);

  if (entriesError) {
    timetableGrid.textContent =
      "Unterrichtseinheiten konnten nicht geladen werden.";
    return;
  }

  timetableEntries = entries || [];

  // Tabellenraster erstellen

  const table = document.createElement("table");
  table.className = "timetable-table";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  const firstHeader = document.createElement("th");
  firstHeader.textContent = "Stunde";
  headerRow.appendChild(firstHeader);

  days.forEach(day => {
    const th = document.createElement("th");
    th.textContent = day.day_name;
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  lessons.forEach(lesson => {
    const row = document.createElement("tr");

    const lessonCell = document.createElement("th");

    lessonCell.textContent =
      lesson.lesson_number + ". Stunde\n" +
      lesson.start_time.slice(0, 5) + "–" +
      lesson.end_time.slice(0, 5);

    row.appendChild(lessonCell);

    days.forEach(day => {
      const cell = document.createElement("td");

      const entry = timetableEntries.find(item =>
        item.weekday === day.day_number &&
        item.period_number === lesson.lesson_number
      );

      if (entry) {
  const subject =
    entry.class_subjects?.subjects;

  const teacher = entry.teachers;
  const room = entry.rooms;

  const subjectName = document.createElement("strong");
  subjectName.textContent =
    subject?.short_code || subject?.name || "Fach";

  const teacherName = document.createElement("span");
  teacherName.textContent = teacher
    ? teacher.first_name + " " + teacher.last_name
    : "Keine Lehrkraft";

  const roomName = document.createElement("span");
  roomName.textContent =
    room?.name || "Kein Raum";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.textContent = "Bearbeiten";
  editButton.className = "timetable-edit-button";
  editButton.dataset.entryId = entry.id;

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.textContent = "Löschen";
  deleteButton.className = "timetable-delete-button";
  deleteButton.dataset.entryId = entry.id;

  cell.appendChild(subjectName);
  cell.appendChild(teacherName);
  cell.appendChild(roomName);
  cell.appendChild(editButton);
  cell.appendChild(deleteButton);

  cell.className = "timetable-filled";
} else {
  cell.textContent = "–";
  cell.className = "timetable-empty";
}


// Eingabefelder der Stundenplanung befüllen

async function loadTimetableFormOptions() {

  // Unterrichtsstunden laden

  const { data: lessons, error: lessonsError } = await suvDb
    .from("lesson_times")
    .select("lesson_number")
    .order("lesson_number");

  if (lessonsError) {
    timetableMessage.textContent =
      "Unterrichtsstunden konnten nicht geladen werden.";
    return;
  }

  timetableLesson.innerHTML =
    '<option value="">Stunde auswählen</option>';

  lessons.forEach(lesson => {
    const option = document.createElement("option");
    option.value = lesson.lesson_number;
    option.textContent = lesson.lesson_number + ". Stunde";
    timetableLesson.appendChild(option);
  });


  // Fächer der ausgewählten Klasse laden

  const { data: classSubjects, error: subjectsError } = await suvDb
    .from("class_subjects")
    .select(`
      id,
      weekly_periods,
      subjects (
        name,
        short_code
      )
    `)
    .eq("class_id", selectedTimetableClassId);

  if (subjectsError) {
    timetableMessage.textContent =
      "Klassenfächer konnten nicht geladen werden.";
    return;
  }

  timetableSubject.innerHTML =
    '<option value="">Fach auswählen</option>';

  classSubjects.forEach(item => {
    const option = document.createElement("option");

    option.value = item.id;

    const subject = item.subjects;

    option.textContent =
      (subject?.short_code || subject?.name || "Fach") +
      " (" + item.weekly_periods + " Wochenstunden)";

    timetableSubject.appendChild(option);
  });


  // Aktive Lehrkräfte laden

  const { data: teachers, error: teachersError } = await suvDb
    .from("teachers")
    .select("id, first_name, last_name, short_code")
    .eq("is_active", true)
    .order("last_name");

  if (teachersError) {
    timetableMessage.textContent =
      "Lehrkräfte konnten nicht geladen werden.";
    return;
  }

  timetableTeacher.innerHTML =
    '<option value="">Lehrkraft auswählen</option>';

  teachers.forEach(teacher => {
    const option = document.createElement("option");

    option.value = teacher.id;
    option.textContent =
      teacher.first_name + " " + teacher.last_name +
      (teacher.short_code ? " (" + teacher.short_code + ")" : "");

    timetableTeacher.appendChild(option);
  });


  // Aktive Räume laden

  const { data: rooms, error: roomsError } = await suvDb
    .from("rooms")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  if (roomsError) {
    timetableMessage.textContent =
      "Räume konnten nicht geladen werden.";
    return;
  }

  timetableRoom.innerHTML =
    '<option value="">Raum auswählen</option>';

  rooms.forEach(room => {
    const option = document.createElement("option");

    option.value = room.id;
    option.textContent = room.name;

    timetableRoom.appendChild(option);
  });
}


// Auswahlfelder bei Klassenwechsel aktualisieren

timetableClass.addEventListener("change", async () => {
  if (!selectedTimetableClassId) {
    return;
  }

  await loadTimetableFormOptions();
});


// Unterrichtseinheit speichern

timetableEntryForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!activeTimetableVersionId || !selectedTimetableClassId) {
    timetableMessage.textContent =
      "Bitte zuerst Schuljahr und Klasse auswählen.";
    return;
  }

  if (activeTimetableVersionStatus !== "draft") {
    timetableMessage.textContent =
      "Dieser Stundenplan ist nicht mehr bearbeitbar.";
    return;
  }

  const day = Number(timetableDay.value);
  const lesson = Number(timetableLesson.value);

  if (
    !day ||
    day < 1 ||
    day > 5 ||
    !lesson ||
    !timetableSubject.value ||
    !timetableTeacher.value
  ) {
    timetableMessage.textContent =
      "Bitte alle Pflichtfelder ausfüllen.";
    return;
  }

  const entryId = timetableEntryId.value;

  const entryData = {
    timetable_version_id: activeTimetableVersionId,
    class_subject_id: timetableSubject.value,
    teacher_id: timetableTeacher.value,
    room_id: timetableRoom.value || null,
    class_id: selectedTimetableClassId,
    weekday: day,
    period_number: lesson
  };

  // Doppelte Belegung der Klasse prüfen

  let duplicateQuery = suvDb
    .from("timetable_entries")
    .select("id")
    .eq("timetable_version_id", activeTimetableVersionId)
    .eq("class_id", selectedTimetableClassId)
    .eq("weekday", day)
    .eq("period_number", lesson);

  if (entryId) {
    duplicateQuery = duplicateQuery.neq("id", entryId);
  }

  const { data: duplicates, error: duplicateError } =
    await duplicateQuery;

  if (duplicateError) {
    timetableMessage.textContent =
      "Belegung konnte nicht geprüft werden.";
    return;
  }

  if (duplicates.length > 0) {
    timetableMessage.textContent =
      "Diese Klasse hat zu diesem Zeitpunkt bereits Unterricht.";
    return;
  }

  // Speichern oder aktualisieren

  let result;

  if (entryId) {
    result = await suvDb
      .from("timetable_entries")
      .update(entryData)
      .eq("id", entryId);
  } else {
    result = await suvDb
      .from("timetable_entries")
      .insert(entryData);
  }

  if (result.error) {
    timetableMessage.textContent =
      "Unterrichtseinheit konnte nicht gespeichert werden.";
    return;
  }

  timetableMessage.textContent =
    "Unterrichtseinheit erfolgreich gespeichert.";

  resetTimetableEntryForm();

  await loadTimetableGrid();
});


// Stundenplanformular zurücksetzen

function resetTimetableEntryForm() {
  timetableEntryForm.reset();

  timetableEntryId.value = "";

  timetableSaveButton.textContent =
    "Unterrichtseinheit speichern";

  timetableCancelEdit.style.display =
    "none";
}


// Bearbeitung abbrechen

timetableCancelEdit.addEventListener("click", () => {
  resetTimetableEntryForm();

  timetableMessage.textContent =
    "Bearbeitung abgebrochen.";
});


                 // Unterrichtseinheit bearbeiten und löschen

timetableGrid.addEventListener("click", async (event) => {

  const editButton = event.target.closest(
    ".timetable-edit-button"
  );

  const deleteButton = event.target.closest(
    ".timetable-delete-button"
  );


  // Bearbeiten

  if (editButton) {

    if (activeTimetableVersionStatus !== "draft") {
      timetableMessage.textContent =
        "Dieser Stundenplan ist nicht bearbeitbar.";
      return;
    }

    const entry = timetableEntries.find(
      item => item.id === editButton.dataset.entryId
    );

    if (!entry) return;

    timetableEntryId.value = entry.id;
    timetableDay.value = entry.weekday;
    timetableLesson.value = entry.period_number;

    await loadTimetableFormOptions();

    timetableSubject.value = entry.class_subject_id;
    timetableTeacher.value = entry.teacher_id;
    timetableRoom.value = entry.room_id || "";

    timetableSaveButton.textContent =
      "Änderungen speichern";

    timetableCancelEdit.style.display =
      "inline-block";

    timetableMessage.textContent =
      "Unterrichtseinheit wird bearbeitet.";

    timetableEntryForm.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }


  // Löschen

  if (deleteButton) {

    if (activeTimetableVersionStatus !== "draft") {
      timetableMessage.textContent =
        "Dieser Stundenplan ist nicht bearbeitbar.";
      return;
    }

    const confirmed = confirm(
      "Möchtest du diese Unterrichtseinheit wirklich löschen?"
    );

    if (!confirmed) return;

    const entryId = deleteButton.dataset.entryId;

    const { error } = await suvDb
      .from("timetable_entries")
      .delete()
      .eq("id", entryId)
      .eq("timetable_version_id", activeTimetableVersionId);

    if (error) {
      timetableMessage.textContent =
        "Unterrichtseinheit konnte nicht gelöscht werden.";
      return;
    }

    timetableMessage.textContent =
      "Unterrichtseinheit wurde gelöscht.";

    await loadTimetableGrid();
  }

});
