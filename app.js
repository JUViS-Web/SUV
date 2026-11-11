window.onerror = function(message, source, lineno, colno) {
  alert(
    "JavaScript-Fehler:\n" +
    message +
    "\nZeile: " + lineno +
    "\nSpalte: " + colno
  );
};

// SUV – Supabase-Verbindung

const { createClient } = supabase;
alert("TEST 1: Supabase-Bibliothek verfügbar");

const suvDb = createClient(
  window.SUV_CONFIG.SUPABASE_URL,
  window.SUV_CONFIG.SUPABASE_KEY
);

alert("TEST 2: Supabase-Client erstellt");

console.log("SUV: Supabase-Verbindung initialisiert.");

alert("TEST 1: app.js gestartet");

window.onerror = function(message, source, lineno, colno) {
  alert(
    "JavaScript-Fehler:\n" +
    message +
    "\nZeile: " + lineno
  );
};

alert("TEST 2: JavaScript funktioniert");

alert("TEST 3: Supabase-Bibliothek gefunden");

alert("TEST 4: Supabase initialisiert");
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
alert("SUV-Test: Login-Code wird ausgeführt.");

console.log("SUV: Login-Formular gefunden", loginForm);
loginForm.onsubmit = async (event) => {
  loginMessage.textContent = "TEST: Anmelde-Handler wurde gestartet.";
  console.log("SUV: Anmelde-Event wurde ausgelöst");
  console.log("SUV: Submit-Handler gestartet");
  event.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const loginButton = document.getElementById("loginButton");

  loginButton.disabled = true;
  loginButton.textContent = "Anmeldung läuft ...";
  loginMessage.textContent = "";

  try {
   alert("SUV-Test: Anmelde-Handler wird registriert.");
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
};

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



async function loadClassTeacherOptions() {
  const container = document.getElementById("classTeachersSelection");

  if (!container) return;

  container.innerHTML = "";

  const { data, error } = await suvDb
    .from("teachers")
    .select("id, first_name, last_name")
    .eq("is_active", true)
    .order("last_name");

  if (error) {
    container.textContent =
      "Fehler beim Laden: " + error.message;
    return;
  }

  if (!data || data.length === 0) {
    container.textContent = "Keine aktiven Lehrkräfte vorhanden.";
    return;
  }

  const selectedIds = new Set();

  const selectedArea = document.createElement("div");
  selectedArea.className = "class-teacher-selected";

  const search = document.createElement("input");
  search.type = "search";
  search.placeholder = "Lehrkraft suchen ...";
  search.className = "class-teacher-search";

  const results = document.createElement("div");
  results.className = "class-teacher-results";

  container.append(selectedArea, search, results);

  function renderSelected() {
    selectedArea.innerHTML = "";

    const heading = document.createElement("strong");
    heading.textContent =
      "Ausgewählt (" + selectedIds.size + "/3)";
    selectedArea.appendChild(heading);

    if (selectedIds.size === 0) {
      const empty = document.createElement("p");
      empty.textContent = "Noch keine Lehrkräfte ausgewählt.";
      selectedArea.appendChild(empty);
      return;
    }

    data
      .filter(teacher => selectedIds.has(String(teacher.id)))
      .forEach(teacher => {
        const chip = document.createElement("span");
        chip.className = "class-teacher-chip";

        const name = document.createElement("span");
        name.textContent =
          teacher.first_name + " " + teacher.last_name;

        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "×";
        remove.title = "Zuordnung entfernen";

        remove.addEventListener("click", () => {
          selectedIds.delete(String(teacher.id));
          renderSelected();
          renderResults();
        });

        chip.append(name, remove);
        selectedArea.appendChild(chip);
      });
  }

  function renderResults() {
    results.innerHTML = "";

    const searchTerm = search.value.trim().toLowerCase();

    const filteredTeachers = data.filter(teacher => {
      const fullName =
        (teacher.first_name + " " + teacher.last_name).toLowerCase();

      return fullName.includes(searchTerm);
    });

    if (filteredTeachers.length === 0) {
      results.textContent = "Keine passenden Lehrkräfte gefunden.";
      return;
    }

    filteredTeachers.forEach(teacher => {
      const label = document.createElement("label");
      label.className = "class-teacher-option";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.name = "classTeacherIds";
      checkbox.value = teacher.id;
      checkbox.checked = selectedIds.has(String(teacher.id));

      checkbox.addEventListener("change", () => {
        const teacherId = String(teacher.id);

        if (checkbox.checked) {
          if (selectedIds.size >= 3) {
            checkbox.checked = false;
            classMessage.textContent =
              "Es können maximal drei Klassenlehrkräfte ausgewählt werden.";
            return;
          }

          selectedIds.add(teacherId);
        } else {
          selectedIds.delete(teacherId);
        }

        classMessage.textContent = "";
        renderSelected();
        renderResults();
      });

      const name = document.createElement("span");
      name.textContent =
        teacher.first_name + " " + teacher.last_name;

      label.append(checkbox, name);
      results.appendChild(label);
    });
  }

  search.addEventListener("input", renderResults);

  container._setSelectedTeacherIds = ids => {
    selectedIds.clear();

    (ids || []).forEach(id => {
      selectedIds.add(String(id));
    });

    renderSelected();
    renderResults();
  };

  container._getSelectedTeacherIds = () => {
    return Array.from(selectedIds);
  };

  renderSelected();
  renderResults();
}



async function loadClasses() {
  await loadClassTeacherOptions();
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
  ),
  class_teachers (
    teacher_id,
    teachers (
      first_name,
      last_name
    )
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

    const header = document.createElement("div");
header.className = "class-card-header";

const heading = document.createElement("h4");
heading.textContent = schoolClass.name;

const gradeBadge = document.createElement("span");
gradeBadge.className = "class-grade-badge";
gradeBadge.textContent =
  "Jahrgang " + (schoolClass.grade_levels?.name || "?");

header.append(heading, gradeBadge);

const stats = document.createElement("div");
stats.className = "class-card-stats";

const studentStat = document.createElement("div");
studentStat.className = "class-card-stat";

const studentNumber = document.createElement("strong");
studentNumber.textContent = schoolClass.student_count ?? 0;

const studentLabel = document.createElement("span");
studentLabel.textContent = "Schülerinnen und Schüler";

studentStat.append(studentNumber, studentLabel);
stats.appendChild(studentStat);

const teacherSection = document.createElement("div");
teacherSection.className = "class-card-teachers";

const teacherTitle = document.createElement("strong");
teacherTitle.textContent = "Klassenlehrkräfte";

const teacherList = document.createElement("div");
teacherList.className = "class-card-teacher-list";

const teacherNames = (schoolClass.class_teachers || [])
  .map(item => {
    const teacher = item.teachers;
    if (!teacher) return null;
    return teacher.first_name + " " + teacher.last_name;
  })
  .filter(Boolean);

if (teacherNames.length) {
  teacherNames.forEach(name => {
    const chip = document.createElement("span");
    chip.className = "class-card-teacher-chip";
    chip.textContent = name;
    teacherList.appendChild(chip);
  });
} else {
  const empty = document.createElement("span");
  empty.className = "class-card-no-teacher";
  empty.textContent = "Noch nicht zugeordnet";
  teacherList.appendChild(empty);
}

teacherSection.append(teacherTitle, teacherList);

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

const actions = document.createElement("div");
actions.className = "class-card-actions";
actions.append(editButton, deleteButton);

card.append(header, stats, teacherSection, actions);
classList.appendChild(card);
  });
}


// Klasse bearbeiten


async function editClass(schoolClass) {

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

  await loadClassTeacherOptions();

  const { data, error } = await suvDb
    .from("class_teachers")
    .select("teacher_id")
    .eq("class_id", schoolClass.id);

  if (error) {
    classMessage.textContent =
      "Fehler beim Laden der Klassenlehrkräfte: " + error.message;
    return;
  }

  const selectedTeacherIds = (data || [])
  .map(item => item.teacher_id);

const teacherContainer =
  document.getElementById("classTeachersSelection");

if (teacherContainer?._setSelectedTeacherIds) {
  teacherContainer._setSelectedTeacherIds(selectedTeacherIds);
}

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

    const teacherContainer =
  document.getElementById("classTeachersSelection");

const selectedTeacherIds =
  teacherContainer?._getSelectedTeacherIds
    ? teacherContainer._getSelectedTeacherIds()
    : [];
    
    if (selectedTeacherIds.length > 3) {
      classMessage.textContent =
        "Es können maximal drei Klassenlehrkräfte zugeordnet werden.";
      return;
    }

    const classData = {
      school_year_id: activeSUVSchoolYearId,
      grade_level_id: classGrade.value,
      name: document.getElementById("className").value.trim(),
      student_count: Number(
        document.getElementById("classStudentCount").value
      )
    };

    let savedClassId;

    if (classId) {
      const { error } = await suvDb
        .from("classes")
        .update(classData)
        .eq("id", classId);

      if (error) {
        classMessage.textContent = error.message;
        return;
      }

      savedClassId = classId;

    } else {
      const { data, error } = await suvDb
        .from("classes")
        .insert(classData)
        .select("id")
        .single();

      if (error) {
        classMessage.textContent = error.message;
        return;
      }

      savedClassId = data.id;
    }

    // Bisherige Klassenlehrkräfte entfernen

    const { error: deleteError } = await suvDb
      .from("class_teachers")
      .delete()
      .eq("class_id", savedClassId);

    if (deleteError) {
      classMessage.textContent =
        "Klasse gespeichert, aber alte Lehrkräfte konnten nicht entfernt werden: " +
        deleteError.message;
      return;
    }

    // Neue Klassenlehrkräfte speichern

    if (selectedTeacherIds.length > 0) {
      const teacherAssignments = selectedTeacherIds.map(teacherId => ({
        class_id: savedClassId,
        teacher_id: teacherId
      }));

      const { error: teacherError } = await suvDb
        .from("class_teachers")
        .insert(teacherAssignments);

      if (teacherError) {
        classMessage.textContent =
          "Klasse gespeichert, aber Klassenlehrkräfte konnten nicht gespeichert werden: " +
          teacherError.message;
        return;
      }
    }

    classMessage.textContent = classId
      ? "Klasse und Klassenlehrkräfte erfolgreich aktualisiert."
      : "Klasse und Klassenlehrkräfte erfolgreich gespeichert.";

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

    document
      .querySelectorAll('input[name="classTeacherIds"]')
      .forEach(checkbox => {
        checkbox.checked = false;
      });

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

const timetableTeachers =
  document.getElementById("timetableTeachers");

const timetableParallelGroup =
  document.getElementById("timetableParallelGroup");

const timetableRoom =
  document.getElementById("timetableRoom");

const timetableSaveButton =
  document.getElementById("timetableSaveButton");

const timetableCancelEdit =
  document.getElementById("timetableCancelEdit");

// Vorhandene Parallelgruppen laden

async function loadParallelGroups() {
  alert("loadParallelGroups wird aufgerufen");
  alert(
  "Klasse: " + selectedTimetableClassId +
  "\nTag: " + timetableDay.value +
  "\nStunde: " + timetableLesson.value +
  "\nStundenplan-Version: " + activeTimetableVersionId
);
  timetableParallelGroup.innerHTML = `
    <option value="">Normaler Unterricht</option>
    <option value="new">Neue Parallelgruppe erstellen</option>
  `;

  if (
    !selectedTimetableClassId ||
    !timetableDay.value ||
    !timetableLesson.value ||
    !activeTimetableVersionId
  ) {
    return;
  }

  alert("Datenbankabfrage wird gestartet");
  const { data, error } = await suvDb
    .from("timetable_entries")
    .select("parallel_group_id")
    .eq("timetable_version_id", activeTimetableVersionId)
    .eq("class_id", selectedTimetableClassId)
    .eq("weekday", Number(timetableDay.value))
    .eq("period_number", Number(timetableLesson.value))
    .not("parallel_group_id", "is", null);
  alert("Datenbankabfrage abgeschlossen");

  if (error) {
  timetableMessage.textContent =
    "Fehler beim Laden: " + error.message;
  return;
}

timetableMessage.textContent =
  "Gefundene Parallelgruppen: " + (data || []).length;
  alert(
  "Gefundene Parallelgruppen: " + (data || []).length
);

  alert(
  "Datenbankergebnis: " +
  JSON.stringify(data)
);
  const groupIds = [
    ...new Set(
      (data || []).map(item => item.parallel_group_id)
    )
  ];

  groupIds.forEach((groupId, index) => {
    const option = document.createElement("option");

    option.value = groupId;
    option.textContent =
      "Parallelgruppe " + (index + 1);

    timetableParallelGroup.appendChild(option);
  });
}

// Parallelgruppen bei Änderungen neu laden

timetableDay.addEventListener("change", loadParallelGroups);

timetableLesson.addEventListener("change", loadParallelGroups);

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

// Klassen für die Unterrichtsverteilung laden

async function loadDistributionClasses(schoolYearId) {

  distributionClass.innerHTML =
    '<option value="">Klasse auswählen</option>';

  const { data, error } = await suvDb
    .from("classes")
    .select("id, name, school_year_id")
    .eq("school_year_id", schoolYearId)
    .order("name");

  if (error) {
    distributionMessage.textContent =
      "Klassen konnten nicht geladen werden: " + error.message;
    return;
  }

  if (!data || data.length === 0) {
    distributionMessage.textContent =
      "Für dieses Schuljahr sind keine Klassen angelegt.";
  } else {
    data.forEach(schoolClass => {
      const option = document.createElement("option");
      option.value = schoolClass.id;
      option.textContent = schoolClass.name;
      distributionClass.appendChild(option);
    });
  }

  // Jahrgänge für die Kursverteilung laden
  await loadGradeCourseGrades(schoolYearId);

  // Bestehende Kursangebote laden
  await loadGradeCourseGroups(schoolYearId);
}


// Jahrgänge laden

async function loadGradeCourseGrades(schoolYearId) {

  gradeCourseGrade.innerHTML =
    '<option value="">Jahrgang auswählen</option>';

  gradeCourseClasses.innerHTML = "";

  if (!schoolYearId) return;

  const { data, error } = await suvDb
    .from("grade_levels")
    .select("id, name, sort_order")
    .order("sort_order");

  if (error) {
    gradeCourseGroupMessage.textContent =
      "Jahrgänge konnten nicht geladen werden: " + error.message;
    return;
  }

  data.forEach(grade => {
    const option = document.createElement("option");
    option.value = grade.id;
    option.textContent = grade.name;
    gradeCourseGrade.appendChild(option);
  });
}

// Unterrichtsverteilung einer Klasse laden

async function loadDistributionEntries() {

  distributionList.innerHTML =
    "<p>Unterrichtsverteilung wird geladen ...</p>";

  const { data, error } = await suvDb
    .from("class_subjects")
    .select(`
      id,
      weekly_periods,
      notes,
      subjects (
        id,
        name,
        short_code
      ),
      class_subject_teachers (
        teacher_id,
        teachers (
  id,
  first_name,
  last_name,
  short_code
)
      )
    `)
    .eq("class_id", selectedDistributionClassId)
    .order("created_at");

  if (error) {
    distributionList.textContent =
      "Unterrichtsverteilung konnte nicht geladen werden: " +
      error.message;
    return;
  }

  distributionEntries = data || [];

  distributionList.innerHTML = "";

  if (distributionEntries.length === 0) {
    distributionList.innerHTML =
      "<p>Für diese Klasse gibt es noch keine Unterrichtszuordnungen.</p>";
    return;
  }

  const table = document.createElement("table");

  table.innerHTML = `
    <thead>
      <tr>
        <th>Fach</th>
        <th>Wochenstunden</th>
        <th>Lehrkräfte</th>
        <th>Anmerkungen</th>
        <th>Aktionen</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody");

  distributionEntries.forEach(entry => {

    const row = document.createElement("tr");

    const assignedTeachers =
  (entry.class_subject_teachers || [])
    .map(item => item.teachers)
    .filter(Boolean);

const teacherNames = assignedTeachers
  .map(teacher =>
    teacher.first_name + " " + teacher.last_name
  )
  .join(", ");

const teacherCount = assignedTeachers.length;

const teacherDisplay = teacherCount > 0
  ? `${teacherNames} (${teacherCount} Lehrkraft${teacherCount === 1 ? "" : "kräfte"})`
  : "Keine Lehrkraft zugeordnet";

    row.innerHTML = `
      <td>${entry.subjects?.name || "Unbekannt"}</td>
      <td>${entry.weekly_periods}</td>
      <td>${teacherDisplay}</td>
      <td>${entry.notes || "–"}</td>
      <td>
        <button type="button"
          data-distribution-edit="${entry.id}">
          Bearbeiten
        </button>
        <button type="button"
          data-distribution-delete="${entry.id}">
          Löschen
        </button>
      </td>
    `;

    tbody.appendChild(row);

  });

  distributionList.appendChild(table);
}

// Fächer und Lehrkräfte laden


async function loadDistributionOptions() {

  distributionSubject.innerHTML =
    '<option value="">Fach auswählen</option>';

  gradeCourseSubject.innerHTML =
    '<option value="">Fach auswählen</option>';

  distributionTeachers.innerHTML = "";

  const { data: subjects, error: subjectsError } = await suvDb
    .from("subjects")
    .select("id, name, short_code")
    .order("name");

  if (subjectsError) {
    distributionMessage.textContent =
      "Fächer konnten nicht geladen werden.";
    return;
  }

  subjects.forEach(subject => {

    const option = document.createElement("option");

    option.value = subject.id;
    option.textContent =
      subject.name + " (" + subject.short_code + ")";

    distributionSubject.appendChild(option);

    const gradeOption = document.createElement("option");

    gradeOption.value = subject.id;
    gradeOption.textContent =
      subject.name + " (" + subject.short_code + ")";

    gradeCourseSubject.appendChild(gradeOption);

  });

  const { data: teachers, error: teachersError } = await suvDb
    .from("teachers")
    .select("id, first_name, last_name, short_code")
    .eq("is_active", true)
    .order("last_name");

  if (teachersError) {
    distributionMessage.textContent =
      "Lehrkräfte konnten nicht geladen werden.";
    return;
  }

  teachers.forEach(teacher => {

    const option = document.createElement("option");

    option.value = teacher.id;
    option.textContent =
      teacher.last_name + ", " + teacher.first_name +
      " (" + teacher.short_code + ")";

    distributionTeachers.appendChild(option);

  });
}

// DOM-Elemente
const distributionSchoolYear =
  document.getElementById("distributionSchoolYear");

const distributionClass =
  document.getElementById("distributionClass");

const distributionMessage =
  document.getElementById("distributionMessage");

const distributionForm =
  document.getElementById("distributionForm");

const distributionEntryId =
  document.getElementById("distributionEntryId");

const distributionSubject =
  document.getElementById("distributionSubject");

const distributionWeeklyPeriods =
  document.getElementById("distributionWeeklyPeriods");

const distributionTeachers =
  document.getElementById("distributionTeachers");

const distributionNotes =
  document.getElementById("distributionNotes");

const distributionList =
  document.getElementById("distributionList");

const distributionSaveButton =
  document.getElementById("distributionSaveButton");

const distributionCancelEdit =
  document.getElementById("distributionCancelEdit");

// DOM-Elemente der jahrgangsweiten Kursverteilung

const gradeCourseGroupForm =
  document.getElementById("gradeCourseGroupForm");

const gradeCourseGrade =
  document.getElementById("gradeCourseGrade");

const gradeCourseClasses =
  document.getElementById("gradeCourseClasses");

const gradeCourseSubject =
  document.getElementById("gradeCourseSubject");

const gradeCourseWeeklyPeriods =
  document.getElementById("gradeCourseWeeklyPeriods");

const gradeCourseCount =
  document.getElementById("gradeCourseCount");

const gradeCourseNotes =
  document.getElementById("gradeCourseNotes");

const gradeCourseGroupSaveButton =
  document.getElementById("gradeCourseGroupSaveButton");

const gradeCourseGroupMessage =
  document.getElementById("gradeCourseGroupMessage");

const gradeCourseGroupList =
  document.getElementById("gradeCourseGroupList");

// Aktuell bearbeitetes jahrgangsweites Kursangebot
let editingGradeCourseGroupId = null;

// Jahrgangsweites Kursangebot erstellen

gradeCourseGroupForm.addEventListener("submit", async (event) => {

  event.preventDefault();

  gradeCourseGroupMessage.textContent = "";

  const schoolYearId = distributionSchoolYear.value;
  const gradeId = gradeCourseGrade.value;
  const subjectId = gradeCourseSubject.value;
  const weeklyPeriods = Number(gradeCourseWeeklyPeriods.value);
  const courseCount = Number(gradeCourseCount.value);

  const selectedClassIds = Array.from(
    gradeCourseClasses.selectedOptions
  ).map(option => option.value);

  if (!schoolYearId || !gradeId || !subjectId) {
    gradeCourseGroupMessage.textContent =
      "Bitte Schuljahr, Jahrgang und Fach auswählen.";
    return;
  }

  if (selectedClassIds.length < 2) {
    gradeCourseGroupMessage.textContent =
      "Bitte mindestens zwei Klassen auswählen.";
    return;
  }

  if (weeklyPeriods < 1 || courseCount < 2) {
    gradeCourseGroupMessage.textContent =
      "Bitte gültige Wochenstunden und mindestens zwei Kurse angeben.";
    return;
  }

  gradeCourseGroupSaveButton.disabled = true;
  gradeCourseGroupMessage.textContent =
    "Kursangebot wird erstellt ...";

  try {


// Bestehendes Kursangebot bearbeiten

    if (editingGradeCourseGroupId) {

      const groupId = editingGradeCourseGroupId;

      // Kursgruppe aktualisieren

      const { error: updateError } = await suvDb
        .from("grade_course_groups")
        .update({
          grade_level_id: gradeId,
          subject_id: subjectId,
          weekly_periods: weeklyPeriods,
          notes: gradeCourseNotes.value.trim() || null
        })
        .eq("id", groupId);

      if (updateError) throw updateError;

      // Bisherige Klassenzuordnungen entfernen

      const { error: deleteClassesError } = await suvDb
        .from("grade_course_group_classes")
        .delete()
        .eq("grade_course_group_id", groupId);

      if (deleteClassesError) throw deleteClassesError;

      // Neue Klassenzuordnungen speichern

      const classEntries = selectedClassIds.map(classId => ({
        grade_course_group_id: groupId,
        class_id: classId
      }));

      const { error: insertClassesError } = await suvDb
        .from("grade_course_group_classes")
        .insert(classEntries);

      if (insertClassesError) throw insertClassesError;

      // Vorhandene Parallelkurse laden

      const { data: existingCourses, error: loadCoursesError } =
        await suvDb
          .from("grade_courses")
          .select("id, course_number")
          .eq("grade_course_group_id", groupId);

      if (loadCoursesError) throw loadCoursesError;

      const subjectName = gradeCourseSubject
        .selectedOptions[0].textContent
        .split(" (")[0];

      // Kurse aktualisieren, ergänzen oder entfernen

      for (let i = 1; i <= courseCount; i++) {

        const existingCourse = existingCourses.find(
          course => course.course_number === i
        );

        if (existingCourse) {

          const { error } = await suvDb
            .from("grade_courses")
            .update({
              course_name: subjectName + " " + i
            })
            .eq("id", existingCourse.id);

          if (error) throw error;

        } else {

          const { error } = await suvDb
            .from("grade_courses")
            .insert({
              grade_course_group_id: groupId,
              course_number: i,
              course_name: subjectName + " " + i
            });

          if (error) throw error;

        }
      }

      // Überzählige Kurse entfernen

      const coursesToDelete = existingCourses.filter(
        course => course.course_number > courseCount
      );

      for (const course of coursesToDelete) {

        const { error } = await suvDb
          .from("grade_courses")
          .delete()
          .eq("id", course.id);

        if (error) throw error;

      }

      // Bearbeitungsmodus beenden

      editingGradeCourseGroupId = null;

      gradeCourseGroupForm.reset();
      gradeCourseCount.value = 5;
      gradeCourseClasses.innerHTML = "";

      gradeCourseGroupSaveButton.textContent =
        "Kursangebot erstellen";

      gradeCourseGroupMessage.textContent =
        "Kursangebot wurde erfolgreich aktualisiert.";

      await loadGradeCourseGroups(schoolYearId);

      return;
    }
    
    // Prüfen, ob für diesen Jahrgang und dieses Fach
    // bereits ein Kursangebot existiert

    const { data: existingGroup, error: checkError } = await suvDb
      .from("grade_course_groups")
      .select("id")
      .eq("school_year_id", schoolYearId)
      .eq("grade_level_id", gradeId)
      .eq("subject_id", subjectId)
      .maybeSingle();

    if (checkError) {
      throw checkError;
    }

    if (existingGroup) {
      throw new Error(
        "Für diesen Jahrgang und dieses Fach existiert bereits ein Kursangebot."
      );
    }

    // Kursgruppe erstellen

    const { data: newGroup, error: groupError } = await suvDb
      .from("grade_course_groups")
      .insert({
        school_year_id: schoolYearId,
        grade_level_id: gradeId,
        subject_id: subjectId,
        weekly_periods: weeklyPeriods,
        notes: gradeCourseNotes.value.trim() || null
      })
      .select("id")
      .single();

    if (groupError) {
      throw groupError;
    }

    // Beteiligte Klassen speichern

    const classEntries = selectedClassIds.map(classId => ({
      grade_course_group_id: newGroup.id,
      class_id: classId
    }));

    const { error: classesError } = await suvDb
      .from("grade_course_group_classes")
      .insert(classEntries);

    if (classesError) {
      await suvDb
        .from("grade_course_groups")
        .delete()
        .eq("id", newGroup.id);

      throw classesError;
    }

    // Parallelkurse erstellen

    const subjectName = gradeCourseSubject
      .selectedOptions[0].textContent
      .split(" (")[0];

    const courseEntries = [];

    for (let i = 1; i <= courseCount; i++) {
      courseEntries.push({
        grade_course_group_id: newGroup.id,
        course_number: i,
        course_name: subjectName + " " + i
      });
    }

    const { error: coursesError } = await suvDb
      .from("grade_courses")
      .insert(courseEntries);

    if (coursesError) {

      await suvDb
        .from("grade_course_group_classes")
        .delete()
        .eq("grade_course_group_id", newGroup.id);

      await suvDb
        .from("grade_course_groups")
        .delete()
        .eq("id", newGroup.id);

      throw coursesError;
    }

    gradeCourseGroupMessage.textContent =
      courseCount + " Parallelkurse wurden erfolgreich erstellt.";
await loadGradeCourseGroups(schoolYearId);
    
    gradeCourseGroupForm.reset();

    gradeCourseCount.value = 5;
    gradeCourseClasses.innerHTML = "";

  } catch (error) {

    gradeCourseGroupMessage.textContent =
      "Fehler: " + error.message;

  } finally {

    gradeCourseGroupSaveButton.disabled = false;

  }

});

// Klassen passend zum Jahrgang laden

gradeCourseGrade.addEventListener("change", async () => {

  gradeCourseClasses.innerHTML = "";

  const gradeId = gradeCourseGrade.value;
  const schoolYearId = distributionSchoolYear.value;

  if (!gradeId || !schoolYearId) return;

  const { data, error } = await suvDb
    .from("classes")
    .select("id, name")
    .eq("school_year_id", schoolYearId)
    .eq("grade_level_id", gradeId)
    .order("name");

  if (error) {
    gradeCourseGroupMessage.textContent =
      "Klassen konnten nicht geladen werden: " + error.message;
    return;
  }

  if (!data || data.length === 0) {
    gradeCourseGroupMessage.textContent =
      "Für diesen Jahrgang gibt es noch keine Klassen.";
    return;
  }

  data.forEach(schoolClass => {
    const option = document.createElement("option");
    option.value = schoolClass.id;
    option.textContent = schoolClass.name;
    gradeCourseClasses.appendChild(option);
  });

  gradeCourseGroupMessage.textContent = "";
});


// Bestehende jahrgangsweite Kursangebote laden

async function loadGradeCourseGroups(schoolYearId) {

  gradeCourseGroupList.innerHTML =
    "Kursangebote werden geladen ...";

  if (!schoolYearId) {
    gradeCourseGroupList.textContent =
      "Bitte zuerst ein Schuljahr auswählen.";
    return;
  }

  const { data: groups, error: groupsError } = await suvDb
    .from("grade_course_groups")
    .select("id, grade_level_id, subject_id, weekly_periods, notes")
    .eq("school_year_id", schoolYearId)
    .order("created_at", { ascending: false });

  if (groupsError) {
    gradeCourseGroupList.textContent =
      "Kursangebote konnten nicht geladen werden: " +
      groupsError.message;
    return;
  }

  if (!groups || groups.length === 0) {
    gradeCourseGroupList.textContent =
      "Für dieses Schuljahr gibt es noch keine jahrgangsweiten Kursangebote.";
    return;
  }

  const groupIds = groups.map(group => group.id);

  const gradeIds = [...new Set(
    groups.map(group => group.grade_level_id)
  )];

  const subjectIds = [...new Set(
    groups.map(group => group.subject_id)
  )];

  const { data: grades, error: gradesError } = await suvDb
    .from("grade_levels")
    .select("id, name")
    .in("id", gradeIds);

  if (gradesError) {
    gradeCourseGroupList.textContent =
      "Jahrgänge konnten nicht geladen werden: " +
      gradesError.message;
    return;
  }

  const { data: subjects, error: subjectsError } = await suvDb
    .from("subjects")
    .select("id, name")
    .in("id", subjectIds);

  if (subjectsError) {
    gradeCourseGroupList.textContent =
      "Fächer konnten nicht geladen werden: " +
      subjectsError.message;
    return;
  }

  const { data: groupClasses, error: classesError } = await suvDb
    .from("grade_course_group_classes")
    .select("grade_course_group_id, class_id")
    .in("grade_course_group_id", groupIds);

  if (classesError) {
    gradeCourseGroupList.textContent =
      "Klassenzuordnungen konnten nicht geladen werden: " +
      classesError.message;
    return;
  }

  const classIds = [...new Set(
    groupClasses.map(entry => entry.class_id)
  )];

  let classes = [];

  if (classIds.length > 0) {

    const { data, error } = await suvDb
      .from("classes")
      .select("id, name")
      .in("id", classIds);

    if (error) {
      gradeCourseGroupList.textContent =
        "Klassen konnten nicht geladen werden: " +
        error.message;
      return;
    }

    classes = data || [];
  }

  const { data: courses, error: coursesError } = await suvDb
    .from("grade_courses")
    .select("id, grade_course_group_id, course_number, course_name")
    .in("grade_course_group_id", groupIds)
    .order("course_number");

  if (coursesError) {
    gradeCourseGroupList.textContent =
      "Parallelkurse konnten nicht geladen werden: " +
      coursesError.message;
    return;
  }

  gradeCourseGroupList.innerHTML = "";

  groups.forEach(group => {

    const card = document.createElement("div");
    card.className = "distribution-card";

    const grade = grades.find(item =>
      item.id === group.grade_level_id
    );

    const subject = subjects.find(item =>
      item.id === group.subject_id
    );

    const groupClassNames = groupClasses
      .filter(item =>
        item.grade_course_group_id === group.id
      )
      .map(item => {
        const schoolClass = classes.find(cls =>
          cls.id === item.class_id
        );

        return schoolClass ? schoolClass.name : null;
      })
      .filter(Boolean);

    const groupCourses = courses.filter(course =>
      course.grade_course_group_id === group.id
    );

    const heading = document.createElement("h4");
    heading.textContent =
      (grade ? grade.name : "Unbekannter Jahrgang") +
      " – " +
      (subject ? subject.name : "Unbekanntes Fach");

    const details = document.createElement("p");
    details.textContent =
      "Klassen: " + groupClassNames.join(", ") +
      " | Wochenstunden: " + group.weekly_periods;

    const courseHeading = document.createElement("p");
    courseHeading.textContent =
      "Parallelkurse: " + groupCourses.length;

    const courseList = document.createElement("ul");

    groupCourses.forEach(course => {
      const item = document.createElement("li");
      item.textContent = course.course_name;
      courseList.appendChild(item);
    });

    card.append(
      heading,
      details,
      courseHeading,
      courseList
    );

    if (group.notes) {
      const notes = document.createElement("p");
      notes.textContent = "Anmerkungen: " + group.notes;
      card.appendChild(notes);
    }


// Kursangebot bearbeiten

const editButton = document.createElement("button");
editButton.textContent = "Bearbeiten";
editButton.className = "edit-button";

editButton.addEventListener("click", async () => {

  editingGradeCourseGroupId = group.id;

  gradeCourseGrade.value = group.grade_level_id;
  gradeCourseSubject.value = group.subject_id;
  gradeCourseWeeklyPeriods.value = group.weekly_periods;
  gradeCourseNotes.value = group.notes || "";

  // Zugehörige Klassen laden

  const { data: assignedClasses, error } = await suvDb
    .from("grade_course_group_classes")
    .select("class_id")
    .eq("grade_course_group_id", group.id);

  if (error) {
    alert("Klassen konnten nicht geladen werden: " + error.message);
    return;
  }

  // Klassen des Jahrgangs laden

  const { data: availableClasses, error: classError } = await suvDb
    .from("classes")
    .select("id, name")
    .eq("school_year_id", distributionSchoolYear.value)
    .eq("grade_level_id", group.grade_level_id)
    .order("name");

  if (classError) {
    alert("Klassen konnten nicht geladen werden: " + classError.message);
    return;
  }

  gradeCourseClasses.innerHTML = "";

  availableClasses.forEach(schoolClass => {

    const option = document.createElement("option");
    option.value = schoolClass.id;
    option.textContent = schoolClass.name;

    option.selected = assignedClasses.some(
      item => item.class_id === schoolClass.id
    );

    gradeCourseClasses.appendChild(option);

  });

  // Anzahl der vorhandenen Parallelkurse laden

  const { data: existingCourses, error: courseError } = await suvDb
    .from("grade_courses")
    .select("id, course_number")
    .eq("grade_course_group_id", group.id);

  if (courseError) {
    alert("Parallelkurse konnten nicht geladen werden: " + courseError.message);
    return;
  }

  gradeCourseCount.value = existingCourses.length;

  gradeCourseGroupSaveButton.textContent =
    "Änderungen speichern";

  gradeCourseGroupMessage.textContent =
    "Bearbeitungsmodus: Änderungen vornehmen und speichern.";

  gradeCourseGroupForm.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

});
    
    // Kursangebot löschen

const deleteButton = document.createElement("button");
deleteButton.textContent = "Kursangebot löschen";
deleteButton.className = "delete-button";

deleteButton.addEventListener("click", async () => {

  const confirmed = confirm(
    "Möchtest du dieses Kursangebot wirklich löschen?"
  );

  if (!confirmed) return;

  deleteButton.disabled = true;
  deleteButton.textContent = "Wird gelöscht ...";

  try {

    const { error: coursesError } = await suvDb
      .from("grade_courses")
      .delete()
      .eq("grade_course_group_id", group.id);

    if (coursesError) throw coursesError;

    const { error: periodsError } = await suvDb
      .from("grade_course_group_periods")
      .delete()
      .eq("grade_course_group_id", group.id);

    if (periodsError) throw periodsError;

    const { error: classesError } = await suvDb
      .from("grade_course_group_classes")
      .delete()
      .eq("grade_course_group_id", group.id);

    if (classesError) throw classesError;

    const { error: groupError } = await suvDb
      .from("grade_course_groups")
      .delete()
      .eq("id", group.id);

    if (groupError) throw groupError;

    await loadGradeCourseGroups(schoolYearId);

  } catch (error) {

    alert("Kursangebot konnte nicht gelöscht werden: " + error.message);
    deleteButton.disabled = false;
    deleteButton.textContent = "Kursangebot löschen";

  }

});

card.appendChild(deleteButton);

gradeCourseGroupList.appendChild(card);

  });

}

// Zustände
let selectedDistributionClassId = null;
let selectedDistributionSchoolYearId = null;
let distributionEntries = [];

// Unterrichtsverteilung speichern

distributionForm.addEventListener("submit", async (event) => {

  event.preventDefault();

  if (!selectedDistributionClassId) {
    distributionMessage.textContent =
      "Bitte zuerst eine Klasse auswählen.";
    return;
  }

  const subjectId = distributionSubject.value;
  const weeklyPeriods = Number(distributionWeeklyPeriods.value);

  const teacherIds = Array.from(
    distributionTeachers.selectedOptions
  ).map(option => option.value);

  const notes = distributionNotes.value.trim();

  if (!subjectId || weeklyPeriods < 1) {
  distributionMessage.textContent =
    "Bitte Fach und gültige Wochenstunden angeben.";
  return;
}

if (teacherIds.length === 0) {
  distributionMessage.textContent =
    "Bitte mindestens eine Lehrkraft auswählen.";
  return;
}
  distributionSaveButton.disabled = true;
  distributionSaveButton.textContent = "Wird gespeichert ...";
  
  // Fachzuordnung speichern
  let classSubject;
let subjectError;

if (distributionEntryId.value) {

  const { data, error } = await suvDb
    .from("class_subjects")
    .update({
      subject_id: subjectId,
      weekly_periods: weeklyPeriods,
      notes: notes || null
    })
    .eq("id", distributionEntryId.value)
    .select("id")
    .single();

  classSubject = data;
  subjectError = error;

} else {

  const { data, error } = await suvDb
    .from("class_subjects")
    .upsert({
      class_id: selectedDistributionClassId,
      subject_id: subjectId,
      weekly_periods: weeklyPeriods,
      notes: notes || null
    }, {
      onConflict: "class_id,subject_id"
    })
    .select("id")
    .single();

  classSubject = data;
  subjectError = error;

}

  if (subjectError) {
    distributionMessage.textContent =
      "Zuordnung konnte nicht gespeichert werden: " +
      subjectError.message;

    distributionSaveButton.disabled = false;
    distributionSaveButton.textContent = "Zuordnung speichern";
    return;
  }

  // Lehrkräfte zuordnen
  const { error: deleteTeachersError } = await suvDb
  .from("class_subject_teachers")
  .delete()
  .eq("class_subject_id", classSubject.id);

if (deleteTeachersError) {
  distributionMessage.textContent =
    "Fach wurde gespeichert, aber alte Lehrkräfte konnten nicht entfernt werden: " +
    deleteTeachersError.message;
  distributionSaveButton.disabled = false;
  distributionSaveButton.textContent = "Zuordnung speichern";
  return;
}

if (teacherIds.length > 0) {
  const teacherRows = teacherIds.map(teacherId => ({
    class_subject_id: classSubject.id,
    teacher_id: teacherId
  }));

  const { error: teacherError } = await suvDb
    .from("class_subject_teachers")
    .insert(teacherRows);

  if (teacherError) {
    distributionMessage.textContent =
      "Fach wurde gespeichert, aber die Lehrkräfte konnten nicht zugeordnet werden: " +
      teacherError.message;
    distributionSaveButton.disabled = false;
    distributionSaveButton.textContent = "Zuordnung speichern";
    await loadDistributionEntries();
    return;
  }
}
  
  distributionMessage.textContent =
    "Unterrichtsverteilung erfolgreich gespeichert.";

  distributionForm.reset();

distributionEntryId.value = "";

distributionSaveButton.textContent =
  "Zuordnung speichern";

distributionCancelEdit.hidden = true;

Array.from(distributionTeachers.options).forEach(option => {
  option.selected = false;
});

await loadDistributionEntries();

  distributionSaveButton.disabled = false;
  distributionSaveButton.textContent = "Zuordnung speichern";

});

// Bearbeitung abbrechen
distributionCancelEdit.addEventListener("click", () => {

  distributionForm.reset();

  distributionEntryId.value = "";

  distributionSaveButton.textContent =
    "Zuordnung speichern";

  distributionCancelEdit.hidden = true;

  Array.from(distributionTeachers.options).forEach(option => {
    option.selected = false;
  });

  distributionMessage.textContent =
    "Bearbeitung abgebrochen.";

});

// Schuljahr-Auswahl
distributionSchoolYear.addEventListener("change", async () => {

  selectedDistributionSchoolYearId =
    distributionSchoolYear.value;

  selectedDistributionClassId = null;

  distributionClass.innerHTML =
    '<option value="">Klasse auswählen</option>';

  distributionList.innerHTML =
    "<p>Bitte zuerst eine Klasse auswählen.</p>";

  distributionMessage.textContent = "";

  if (selectedDistributionSchoolYearId) {
    await loadDistributionClasses(
      selectedDistributionSchoolYearId
    );
  }
});

// Bearbeiten und Löschen von Unterrichtszuordnungen

distributionList.addEventListener("click", async (event) => {

  const editButton = event.target.closest(
    "[data-distribution-edit]"
  );

  const deleteButton = event.target.closest(
    "[data-distribution-delete]"
  );

  const moreButton = event.target.closest(
  ".timetable-more-button"
);

  // Eintrag bearbeiten
  if (editButton) {
    const entryId = editButton.dataset.distributionEdit;

    const entry = distributionEntries.find(
      item => item.id === entryId
    );

    if (!entry) return;

    distributionEntryId.value = entry.id;
    distributionSubject.value = entry.subjects?.id || "";
    distributionWeeklyPeriods.value = entry.weekly_periods;
    distributionNotes.value = entry.notes || "";

    const selectedTeacherIds =
      (entry.class_subject_teachers || [])
        .map(item => item.teacher_id);

    Array.from(distributionTeachers.options).forEach(option => {
      option.selected = selectedTeacherIds.includes(option.value);
    });

    distributionSaveButton.textContent = "Änderungen speichern";
    distributionCancelEdit.hidden = false;

    distributionMessage.textContent =
      "Unterrichtszuordnung wird bearbeitet.";

    distributionForm.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    return;
  }

  // Eintrag löschen
  if (deleteButton) {
    const entryId = deleteButton.dataset.distributionDelete;

    if (!confirm("Soll diese Unterrichtszuordnung wirklich gelöscht werden?")) {
      return;
    }

    const { error: teacherDeleteError } = await suvDb
      .from("class_subject_teachers")
      .delete()
      .eq("class_subject_id", entryId);

    if (teacherDeleteError) {
      distributionMessage.textContent =
        "Lehrkräfte-Zuordnungen konnten nicht gelöscht werden: " +
        teacherDeleteError.message;
      return;
    }

    const { error: entryDeleteError } = await suvDb
      .from("class_subjects")
      .delete()
      .eq("id", entryId);

    if (entryDeleteError) {
      distributionMessage.textContent =
        "Unterrichtszuordnung konnte nicht gelöscht werden: " +
        entryDeleteError.message;
      return;
    }

    distributionMessage.textContent =
      "Unterrichtszuordnung erfolgreich gelöscht.";

    await loadDistributionEntries();
  }

});

// Klassen-Auswahl
distributionClass.addEventListener("change", async () => {

  selectedDistributionClassId =
    distributionClass.value;

  distributionMessage.textContent = "";

  if (selectedDistributionClassId) {
    await loadDistributionEntries();
  } else {
    distributionList.innerHTML =
      "<p>Bitte zuerst eine Klasse auswählen.</p>";
  }

});

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


// Offene Unterrichtsstunden berechnen und anzeigen

async function loadUnplacedLessons() {

  const container = document.getElementById(
    "timetableUnplacedLessons"
  );

  if (!container) {
  console.error("Element timetableUnplacedLessons wurde nicht gefunden.");
  return;
}

if (!selectedTimetableClassId) {
  container.textContent =
    "FEHLER: Keine Klassen-ID übergeben.";
  return;
}

  container.innerHTML =
    "<p>Offene Unterrichtsstunden werden geladen ...</p>";

  // Unterrichtszuordnungen der Klasse laden

  const { data: classSubjects, error } = await suvDb
    .from("class_subjects")
    .select(`
      id,
      weekly_periods,
      subjects (
        name,
        short_code
      ),
      class_subject_teachers (
        teacher_id,
        teachers (
          first_name,
          last_name,
          short_code
        )
      )
    `)
    .eq("class_id", selectedTimetableClassId);

  if (error) {
    container.textContent =
      "Unterrichtszuordnungen konnten nicht geladen werden.";
    return;
  }

  container.innerHTML = "";

  let totalOpenLessons = 0;

  classSubjects.forEach(item => {

    // Bereits verplante Stunden ermitteln

    const existingEntries = timetableEntries.filter(
      entry => entry.class_subject_id === item.id
    );

    // Parallele Unterrichtseinheiten nur einmal zählen

    const countedLessons = new Set(
      existingEntries.map(entry =>
        entry.parallel_group_id
          ? "parallel-" + entry.parallel_group_id
          : "entry-" + entry.id
      )
    );

    const openCount = Math.max(
      0,
      item.weekly_periods - countedLessons.size
    );

    if (openCount === 0) {
      return;
    }

    totalOpenLessons += openCount;

    const subject = item.subjects;

    const assignedTeachers =
      item.class_subject_teachers || [];

    const teacherNames = assignedTeachers
      .map(link => {
        const teacher = link.teachers;

        if (!teacher) return null;

        return teacher.first_name + " " + teacher.last_name;
      })
      .filter(Boolean)
      .join(", ");

    // Karte für die Unterrichtszuordnung

    const card = document.createElement("div");
    card.className = "unplaced-subject-card";

    const title = document.createElement("strong");

    title.textContent =
      subject?.short_code || subject?.name || "Fach";

    const details = document.createElement("p");

    details.textContent =
      teacherNames || "Keine Lehrkraft zugeordnet";

    const count = document.createElement("p");

    count.textContent =
      openCount + " offene Unterrichtsstunde" +
      (openCount === 1 ? "" : "n");

    card.appendChild(title);
    card.appendChild(details);
    card.appendChild(count);

    // Einzelne offene Unterrichtsstunden anzeigen

    for (let i = 0; i < openCount; i++) {

      const lessonCard = document.createElement("div");

      lessonCard.className = "unplaced-lesson";
      lessonCard.textContent =
        (subject?.short_code || subject?.name || "Fach") +
        " – Stunde " + (i + 1);

      lessonCard.dataset.classSubjectId = item.id;

      card.appendChild(lessonCard);
    }

    container.appendChild(card);

  });

  if (totalOpenLessons === 0) {
    container.textContent =
      "Alle Wochenstunden dieser Klasse sind verplant.";
  }
}


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
  .select("day_number, day_name, is_active")
  .order("day_number");

alert(
  "Geladene Unterrichtstage:\n" +
  days.map(day =>
    day.day_number + " – " +
    day.day_name + " – Aktiv: " +
    day.is_active
  ).join("\n")
);

  if (daysError) {
    timetableGrid.textContent =
      "Unterrichtstage konnten nicht geladen werden.";
    return;
  }
  timetableGrid.textContent = "TEST 1: Unterrichtstage geladen";

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
  timetableGrid.textContent = "TEST 2: Unterrichtsstunden geladen";

  // Unterrichtseinheiten laden

  const { data: entries, error: entriesError } = await suvDb
  .from("timetable_entries")
  .select(`
  id,
  class_subject_id,
  room_id,
  weekday,
  period_number,
  parallel_group_id,
  class_subjects (
    weekly_periods,
    subjects (
      name,
      short_code,
      color
    )
  ),
  timetable_entry_teachers (
    teacher_id,
    teachers (
      first_name,
      last_name,
      short_code
    )
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
  timetableGrid.textContent = "TEST 3: Unterrichtseinheiten geladen";

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

// Drop-Ziel für Drag & Drop vorbereiten

cell.dataset.weekday = String(day.day_number);
cell.dataset.periodNumber = String(lesson.lesson_number);

      const matchingEntries = timetableEntries.filter(item =>
  item.weekday === day.day_number &&
  item.period_number === lesson.lesson_number
);

      
if (matchingEntries.length > 0) {

  // Höchstens drei Unterrichtskurse direkt anzeigen
  const visibleEntries = matchingEntries.slice(0, 3);

  // Anzahl der weiteren Kurse
  const hiddenCount = matchingEntries.length - 3;

  // Anzahl der Spalten festlegen
  const columnCount =
    visibleEntries.length + (hiddenCount > 0 ? 1 : 0);

  cell.style.display = "grid";
  cell.style.gridTemplateColumns =
    `repeat(${columnCount}, minmax(0, 1fr))`;
  cell.style.gap = "3px";

  // Sichtbare Unterrichtskurse erstellen
  visibleEntries.forEach(entry => {

    const subject =
      entry.class_subjects?.subjects;

    const assignedTeachers =
      entry.timetable_entry_teachers || [];

    const room = entry.rooms;

    const subjectName = document.createElement("strong");
    subjectName.textContent =
      subject?.short_code || subject?.name || "Fach";

    const teacherName = document.createElement("span");

    if (assignedTeachers.length > 0) {
      teacherName.textContent = assignedTeachers
        .map(item => {
          const teacher = item.teachers;

          if (!teacher) return null;

          return teacher.first_name + " " + teacher.last_name;
        })
        .filter(Boolean)
        .join(", ");
    } else {
      teacherName.textContent = "Keine Lehrkraft";
    }

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

    const entryContainer = document.createElement("div");
    entryContainer.className = "timetable-entry";

// Fachfarbe aus den Stammdaten übernehmen
entryContainer.style.borderLeftColor =
  subject?.color || "#b91c1c";
    
    entryContainer.appendChild(subjectName);
    entryContainer.appendChild(teacherName);
    entryContainer.appendChild(roomName);
    entryContainer.appendChild(editButton);
    entryContainer.appendChild(deleteButton);

    cell.appendChild(entryContainer);

  });

  // Weitere Kurse als +N anzeigen
  if (hiddenCount > 0) {

    const moreButton = document.createElement("button");

    moreButton.type = "button";
    moreButton.className = "timetable-more-button";
    moreButton.textContent = "+" + hiddenCount;

    moreButton.dataset.weekday = day.day_number;
    moreButton.dataset.periodNumber = lesson.lesson_number;

    cell.appendChild(moreButton);
  }

  cell.className = "timetable-filled";

} else {

  cell.textContent = "–";
  cell.className = "timetable-empty";

}

      cell.classList.add("timetable-drop-target");

    row.appendChild(cell);
      
              });

        tbody.appendChild(row);
      });

      table.appendChild(tbody);

      timetableGrid.innerHTML = "";
      timetableGrid.appendChild(table);

  await loadUnplacedLessons();
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
    ),
    class_subject_teachers (
      teacher_id,
      teachers (
        id,
        first_name,
        last_name,
        short_code
      )
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


  /// Lehrkräfte passend zum ausgewählten Fach anzeigen

timetableSubject.addEventListener("change", () => {

  timetableTeachers.innerHTML = "";

  const selectedClassSubject = classSubjects.find(
    item => item.id === timetableSubject.value
  );

  if (!selectedClassSubject) return;

  const assignedTeachers =
    selectedClassSubject.class_subject_teachers || [];

  assignedTeachers.forEach(item => {

    const teacher = item.teachers;

    if (!teacher) return;

    const option = document.createElement("option");

    option.value = item.teacher_id;

    option.textContent =
      teacher.first_name + " " + teacher.last_name +
      (teacher.short_code ? " (" + teacher.short_code + ")" : "");

    // Jede zugeordnete Lehrkraft automatisch auswählen
    option.selected = true;

    timetableTeachers.appendChild(option);

  });

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


/// Auswahlfelder bei Klassenwechsel aktualisieren

timetableClass.addEventListener("change", async () => {
  selectedTimetableClassId = timetableClass.value;

  if (!selectedTimetableClassId) {
    return;
  }

  await loadTimetableFormOptions();

  await loadParallelGroups();
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

  const selectedTeacherIds = Array.from(
  timetableTeachers.selectedOptions
).map(option => option.value);

if (
  !day ||
  day < 1 ||
  day > 5 ||
  !lesson ||
  !timetableSubject.value ||
  selectedTeacherIds.length === 0
) {
  timetableMessage.textContent =
    "Bitte alle Pflichtfelder ausfüllen und mindestens eine Lehrkraft auswählen.";
  return;
}
  
  const entryId = timetableEntryId.value;

  // Parallelgruppe festlegen

  let parallelGroupId = null;

  if (timetableParallelGroup.value === "new") {
    parallelGroupId = crypto.randomUUID();
  } else if (timetableParallelGroup.value !== "") {
    parallelGroupId = timetableParallelGroup.value;
  }
  
  const entryData = {
  timetable_version_id: activeTimetableVersionId,
  class_subject_id: timetableSubject.value,
  room_id: timetableRoom.value || null,
  class_id: selectedTimetableClassId,
  weekday: day,
  period_number: lesson,
  parallel_group_id: parallelGroupId
};
  
// Mehrfachbelegung einer Klasse ist erlaubt.
// Die Parallelgruppen-ID kennzeichnet zusammengehörige Kurse.

// Belegte Unterrichtseinheiten zum gleichen Zeitpunkt laden

let conflictQuery = suvDb
  .from("timetable_entries")
  .select(`
    id,
    teacher_id,
    room_id,
    timetable_entry_teachers (
      teacher_id
    )
  `)
  .eq("timetable_version_id", activeTimetableVersionId)
  .eq("weekday", day)
  .eq("period_number", lesson);

if (entryId) {
  conflictQuery = conflictQuery.neq("id", entryId);
}

const { data: conflictingEntries, error: conflictError } =
  await conflictQuery;

if (conflictError) {
  timetableMessage.textContent =
    "Belegungskonflikte konnten nicht geprüft werden.";
  return;
}

// Bereits belegte Lehrkräfte ermitteln

const occupiedTeacherIds = new Set();

conflictingEntries.forEach(entry => {
  if (entry.teacher_id) {
    occupiedTeacherIds.add(entry.teacher_id);
  }

  (entry.timetable_entry_teachers || []).forEach(item => {
    occupiedTeacherIds.add(item.teacher_id);
  });
});

// Lehrkraftkonflikt prüfen

const teacherConflict = selectedTeacherIds.some(
  teacherId => occupiedTeacherIds.has(teacherId)
);

if (teacherConflict) {
  timetableMessage.textContent =
    "Mindestens eine ausgewählte Lehrkraft hat zu diesem Zeitpunkt bereits Unterricht.";
  return;
}

// Raumkonflikt prüfen

const roomConflict = entryData.room_id &&
  conflictingEntries.some(
    entry => entry.room_id === entryData.room_id
  );

if (roomConflict) {
  timetableMessage.textContent =
    "Dieser Raum ist zu diesem Zeitpunkt bereits belegt.";
  return;
}

  // Wochenstunden des Fachs prüfen

  const { data: subjectData, error: subjectDataError } =
    await suvDb
      .from("class_subjects")
      .select("weekly_periods")
      .eq("id", timetableSubject.value)
      .single();

  if (subjectDataError || !subjectData) {
    timetableMessage.textContent =
      "Wochenstunden konnten nicht geladen werden.";
    return;
  }

  let weeklyQuery = suvDb
  .from("timetable_entries")
  .select("id, parallel_group_id")
  .eq("timetable_version_id", activeTimetableVersionId)
  .eq("class_subject_id", timetableSubject.value);

  if (entryId) {
    weeklyQuery = weeklyQuery.neq("id", entryId);
  }

  const { data: existingLessons, error: weeklyError } =
  await weeklyQuery;

if (weeklyError) {
  timetableMessage.textContent =
    "Wochenstunden konnten nicht überprüft werden.";
  return;
}

// Parallele Kurse nur einmal als Wochenstunde zählen

const countedLessons = new Set(
  (existingLessons || []).map(item =>
    item.parallel_group_id
      ? "parallel-" + item.parallel_group_id
      : "entry-" + item.id
  )
);

  if (weeklyError) {
    timetableMessage.textContent =
      "Wochenstunden konnten nicht überprüft werden.";
    return;
  }

  if (countedLessons.size >= subjectData.weekly_periods) {
    timetableMessage.textContent =
      "Die festgelegten Wochenstunden für dieses Fach sind bereits vollständig verplant.";
    return;
  }
  
  
  // Erste Lehrkraft für die bisherige Datenbankspalte übernehmen

  entryData.teacher_id = selectedTeacherIds[0];

  // Unterrichtseinheit speichern oder aktualisieren

  let result;

  if (entryId) {
    result = await suvDb
      .from("timetable_entries")
      .update(entryData)
      .eq("id", entryId)
      .select("id")
      .single();
  } else {
    result = await suvDb
      .from("timetable_entries")
      .insert(entryData)
      .select("id")
      .single();
  }

  if (result.error) {
  timetableMessage.textContent =
    "Speicherfehler: " +
    result.error.message +
    " | Code: " +
    result.error.code;

  return;
}

  const savedEntryId = result.data.id;

  // Bisherige Lehrkraft-Zuordnungen entfernen

  const { error: deleteTeachersError } = await suvDb
    .from("timetable_entry_teachers")
    .delete()
    .eq("timetable_entry_id", savedEntryId);

  if (deleteTeachersError) {
    timetableMessage.textContent =
      "Lehrkraft-Zuordnungen konnten nicht aktualisiert werden.";
    return;
  }

  // Neue Lehrkraft-Zuordnungen speichern

  const teacherAssignments = selectedTeacherIds.map(teacherId => ({
    timetable_entry_id: savedEntryId,
    teacher_id: teacherId
  }));

  const { error: insertTeachersError } = await suvDb
    .from("timetable_entry_teachers")
    .insert(teacherAssignments);

  if (insertTeachersError) {
    timetableMessage.textContent =
      "Lehrkräfte konnten nicht zugeordnet werden.";
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

  timetableParallelGroup.value = "";

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

alert("Test 0: app.js wird ausgeführt");

                 // Unterrichtseinheit bearbeiten und löschen

alert("Test A: Vor dem Listener");
timetableGrid.addEventListener("click", async (event) => {
  alert("Klick-Listener funktioniert");

  const editButton = event.target.closest(
    ".timetable-edit-button"
  );

  const deleteButton = event.target.closest(
    ".timetable-delete-button"
  );

  const moreButton = event.target.closest(
  ".timetable-more-button"
);


  // Weitere Unterrichtskurse anzeigen

  if (moreButton) {

    const weekday = Number(moreButton.dataset.weekday);
    const periodNumber = Number(moreButton.dataset.periodNumber);

    const allEntries = timetableEntries.filter(entry =>
      entry.weekday === weekday &&
      entry.period_number === periodNumber
    );

    // Hintergrund des Fensters
    const overlay = document.createElement("div");
    overlay.className = "timetable-more-overlay";

    // Fenster
    const modal = document.createElement("div");
    modal.className = "timetable-more-modal";

    // Kopfbereich
    const header = document.createElement("div");
    header.className = "timetable-more-header";

    const heading = document.createElement("h2");
    heading.textContent = "Unterrichtskurse";

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.textContent = "×";
    closeButton.className = "timetable-more-close";

    closeButton.addEventListener("click", () => {
      overlay.remove();
    });

    header.appendChild(heading);
    header.appendChild(closeButton);

    modal.appendChild(header);

    // Alle Unterrichtskurse anzeigen
    const courseList = document.createElement("div");
    courseList.className = "timetable-more-list";

    allEntries.forEach(entry => {

      const subject =
        entry.class_subjects?.subjects;

      const assignedTeachers =
        entry.timetable_entry_teachers || [];

      const teacherNames = assignedTeachers
        .map(item => {
          const teacher = item.teachers;

          if (!teacher) return null;

          return teacher.first_name + " " + teacher.last_name;
        })
        .filter(Boolean)
        .join(", ");

      const course = document.createElement("div");
      course.className = "timetable-more-course";

      const subjectName = document.createElement("strong");
      subjectName.textContent =
        subject?.short_code || subject?.name || "Fach";

      const teacherName = document.createElement("span");
      teacherName.textContent =
        teacherNames || "Keine Lehrkraft";

      const roomName = document.createElement("span");
      roomName.textContent =
        entry.rooms?.name || "Kein Raum";

      const actions = document.createElement("div");
      actions.className = "timetable-more-actions";

      const editCourseButton = document.createElement("button");
      editCourseButton.type = "button";
      editCourseButton.textContent = "Bearbeiten";
      editCourseButton.className = "timetable-edit-button";

      editCourseButton.addEventListener("click", () => {
        overlay.remove();

        const originalButton = Array.from(
          timetableGrid.querySelectorAll(".timetable-edit-button")
        ).find(button =>
          button.dataset.entryId === entry.id
        );

        if (originalButton) originalButton.click();
      });

      const deleteCourseButton = document.createElement("button");
      deleteCourseButton.type = "button";
      deleteCourseButton.textContent = "Löschen";
      deleteCourseButton.className = "timetable-delete-button";

      deleteCourseButton.addEventListener("click", () => {
        overlay.remove();

        const originalButton = Array.from(
          timetableGrid.querySelectorAll(".timetable-delete-button")
        ).find(button =>
          button.dataset.entryId === entry.id
        );

        if (originalButton) originalButton.click();
      });

      actions.appendChild(editCourseButton);
      actions.appendChild(deleteCourseButton);

      course.appendChild(subjectName);
      course.appendChild(teacherName);
      course.appendChild(roomName);
      course.appendChild(actions);

      courseList.appendChild(course);
    });

    modal.appendChild(courseList);
    overlay.appendChild(modal);

    // Klick außerhalb des Fensters schließt es
    overlay.addEventListener("click", event => {
      if (event.target === overlay) {
        overlay.remove();
      }
    });

    document.body.appendChild(overlay);

    return;
  }

  
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
    await loadParallelGroups();
    timetableParallelGroup.value = entry.parallel_group_id || "";
    
timetableSubject.value = entry.class_subject_id;

// Lehrkräfte-Auswahl für das Fach aktualisieren
timetableSubject.dispatchEvent(new Event("change"));

// Zugeordnete Lehrkräfte laden
const { data: assignedTeachers, error: assignedTeachersError } =
  await suvDb
    .from("timetable_entry_teachers")
    .select("teacher_id")
    .eq("timetable_entry_id", entry.id);

if (assignedTeachersError) {
  timetableMessage.textContent =
    "Zugeordnete Lehrkräfte konnten nicht geladen werden.";
  return;
}

// Bisher ausgewählte Lehrkräfte wiederherstellen
const assignedTeacherIds = new Set(
  (assignedTeachers || []).map(item => item.teacher_id)
);

Array.from(timetableTeachers.options).forEach(option => {
  option.selected = assignedTeacherIds.has(option.value);
});

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
    alert("Test B: Nach dem Listener");
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


// ==========================================
// SUV – Unterrichtsverteilung
// ==========================================
alert("Vor Unterrichtsverteilung erreicht");

// Schuljahre für die Unterrichtsverteilung laden

async function loadDistributionSchoolYears() {

  const { data, error } = await suvDb
    .from("school_years")
    .select("id, name, is_active")
    .order("name", { ascending: false });

  if (error) {
    distributionMessage.textContent =
      "Schuljahre konnten nicht geladen werden: " +
      error.message;
    return;
  }

  distributionSchoolYear.innerHTML =
    '<option value="">Schuljahr auswählen</option>';

  if (!data || data.length === 0) {
    distributionMessage.textContent =
      "Keine Schuljahre vorhanden.";
    return;
  }

  data.forEach(year => {

    const option = document.createElement("option");

    option.value = year.id;
    option.textContent = year.name;

    distributionSchoolYear.appendChild(option);

  });

  const activeYear = data.find(year => year.is_active);

  if (activeYear) {

    distributionSchoolYear.value = activeYear.id;

    selectedDistributionSchoolYearId = activeYear.id;

    await loadDistributionClasses(activeYear.id);

  }
}

// Initialisierung Unterrichtsverteilung

loadDistributionOptions().catch(error => {
  distributionMessage.textContent =
    "Fehler beim Laden von Fächern und Lehrkräften: " +
    error.message;
});

loadDistributionSchoolYears().catch(error => {
  distributionMessage.textContent =
    "Fehler beim Laden der Schuljahre: " +
    error.message;
});
