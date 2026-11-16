window.onerror = function(message, source, lineno, colno) {
  alert(
    "JavaScript-Fehler:\n" +
    message +
    "\nZeile: " + lineno +
    "\nSpalte: " + colno
  );
};

// SUV – Supabase-Verbindung - Aktialisiert

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

const timetableClassSubjectBlock =
  document.getElementById("timetableClassSubjectBlock");

const timetableClassSubjectBlock = 
  document.getElementById("timetableClassSubjectBlock");

const timetableGradeCourseGroup =
  document.getElementById("timetableGradeCourseGroup");

const timetableGradeCourseBlock =
  document.getElementById("timetableGradeCourseBlock");

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
// SUV – Auswahl für die Stundenplan-Anzeige

const timetableViewType =
  document.getElementById("timetableViewType");

const timetableViewSelection =
  document.getElementById("timetableViewSelection");

const timetableViewGrid =
  document.getElementById("timetableViewGrid");


timetableViewType.addEventListener("change", async () => {

  const type = timetableViewType.value;

  timetableViewSelection.innerHTML = "";

  timetableViewGrid.innerHTML =
    "<p>Bitte zuerst einen Eintrag auswählen.</p>";

  if (!type) {
    timetableViewGrid.innerHTML =
      "<p>Bitte zuerst eine Stundenplanart auswählen.</p>";
    return;
  }

  const labels = {
    class: "Klasse",
    teacher: "Lehrkraft",
    room: "Raum",
    subject: "Fach"
  };

  const selectionLabel = document.createElement("label");
  selectionLabel.textContent = labels[type] + " auswählen";

  const selection = document.createElement("select");
  selection.id = "timetableViewItem";
  selection.innerHTML =
    '<option value="">Bitte auswählen</option>';

  timetableViewSelection.appendChild(selectionLabel);
  timetableViewSelection.appendChild(selection);

  let data = [];
  let error = null;

  if (type === "class") {

    const { data: schoolYear, error: yearError } = await suvDb
      .from("school_years")
      .select("id")
      .eq("is_active", true)
      .maybeSingle();

    if (yearError || !schoolYear) {
      timetableViewGrid.textContent =
        "Das aktive Schuljahr konnte nicht geladen werden.";
      return;
    }

    const result = await suvDb
      .from("classes")
      .select("id, name")
      .eq("school_year_id", schoolYear.id)
      .order("name");

    data = result.data || [];
    error = result.error;

  } else if (type === "teacher") {

    const result = await suvDb
      .from("teachers")
      .select("id, first_name, last_name, short_code")
      .order("last_name");

    data = result.data || [];
    error = result.error;

  } else if (type === "room") {

    const result = await suvDb
      .from("rooms")
      .select("id, name")
      .eq("is_active", true)
      .order("name");

    data = result.data || [];
    error = result.error;

  } else if (type === "subject") {

    const result = await suvDb
      .from("subjects")
      .select("id, name, short_code")
      .order("name");

    data = result.data || [];
    error = result.error;
  }

  if (error) {
    timetableViewGrid.textContent =
      "Fehler beim Laden: " + error.message;
    return;
  }

  if (data.length === 0) {
    selection.innerHTML =
      '<option value="">Keine Einträge vorhanden</option>';
    return;
  }

  data.forEach(item => {

    const option = document.createElement("option");
    option.value = item.id;

    if (type === "teacher") {
      option.textContent =
        `${item.first_name} ${item.last_name} (${item.short_code || "–"})`;
    } else {
      option.textContent =
        item.name +
        (item.short_code ? ` (${item.short_code})` : "");
    }

        selection.appendChild(option);
  });

  selection.addEventListener("change", () => {

    if (!selection.value) {
      timetableViewGrid.innerHTML =
        "<p>Bitte zuerst einen Eintrag auswählen.</p>";
      return;
    }

    loadTimetableViewGrid(type, selection.value);

  });

});


async function loadTimetableViewGrid(type, selectedId) {

  if (!activeTimetableVersionId) {
    timetableViewGrid.textContent =
      "Es ist keine aktive Stundenplanversion vorhanden.";
    return;
  }

  timetableViewGrid.innerHTML =
    "<p>Stundenplan wird geladen ...</p>";

  const { data: days, error: daysError } = await suvDb
    .from("school_days")
    .select("day_number, day_name, is_active")
    .order("day_number");

  if (daysError) {
    timetableViewGrid.textContent =
      "Unterrichtstage konnten nicht geladen werden: " +
      daysError.message;
    return;
  }

  const { data: lessons, error: lessonsError } = await suvDb
    .from("lesson_times")
    .select("lesson_number, start_time, end_time")
    .order("lesson_number");

  if (lessonsError) {
    timetableViewGrid.textContent =
      "Unterrichtsstunden konnten nicht geladen werden: " +
      lessonsError.message;
    return;
  }

  const { data: entries, error: entriesError } = await suvDb
    .from("timetable_entries")
    .select(`
      id,
      class_id,
      room_id,
      weekday,
      period_number,
      lesson_block_requirement_id,
      lesson_block_requirements (
        periods_count
      ),
      classes (
        name
      ),
      class_subjects (
        subjects (
          id,
          name,
          short_code,
          color
        )
      ),
      grade_courses (
        course_name,
        teachers (
          id,
          first_name,
          last_name,
          short_code
        ),
        rooms (
          id,
          name
        ),
        grade_course_groups (
          subjects (
            id,
            name,
            short_code,
            color
          ),
          grade_course_group_classes (
            class_id,
            classes (
              name
            )
          )
        )
      ),
      timetable_entry_teachers (
        teacher_id,
        teachers (
          id,
          first_name,
          last_name,
          short_code
        )
      ),
      rooms (
        id,
        name
      )
    `)
    .eq("timetable_version_id", activeTimetableVersionId);

  if (entriesError) {
    timetableViewGrid.textContent =
      "Unterrichtseinheiten konnten nicht geladen werden: " +
      entriesError.message;
    return;
  }

  const filteredEntries = (entries || []).filter(entry => {

    const gradeClasses =
      entry.grade_courses?.grade_course_groups
        ?.grade_course_group_classes || [];

    const subject =
      entry.class_subjects?.subjects ||
      entry.grade_courses?.grade_course_groups?.subjects;

    const teachers =
      entry.timetable_entry_teachers || [];

    const gradeTeacher =
      entry.grade_courses?.teachers;

    const room =
      entry.rooms || entry.grade_courses?.rooms;

    if (type === "class") {
      return entry.class_id === selectedId ||
        gradeClasses.some(item => item.class_id === selectedId);
    }

    if (type === "teacher") {
      return teachers.some(item =>
        item.teacher_id === selectedId
      ) || gradeTeacher?.id === selectedId;
    }

    if (type === "room") {
      return room?.id === selectedId;
    }

    if (type === "subject") {
      return subject?.id === selectedId;
    }

    return false;
  });

  const activeDays = (days || []).filter(day =>
    day.is_active !== false
  );

  const table = document.createElement("table");
  table.className = "timetable-table";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  const firstHeader = document.createElement("th");
  firstHeader.textContent = "Stunde";
  headerRow.appendChild(firstHeader);

  activeDays.forEach(day => {
    const th = document.createElement("th");
    th.textContent = day.day_name;
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  const renderedBlocks = new Set();

  lessons.forEach(lesson => {

    const row = document.createElement("tr");

    const lessonCell = document.createElement("th");
    lessonCell.textContent =
      lesson.lesson_number + ". Stunde\n" +
      lesson.start_time.slice(0, 5) + "–" +
      lesson.end_time.slice(0, 5);

    row.appendChild(lessonCell);

    activeDays.forEach(day => {

      const cell = document.createElement("td");

      const matchingEntries = filteredEntries.filter(entry =>
        entry.weekday === day.day_number &&
        entry.period_number === lesson.lesson_number
      );

      const entriesToRender = matchingEntries.filter(entry => {
        if (!entry.lesson_block_requirement_id) {
          return true;
        }

        const key =
          `${day.day_number}:${entry.lesson_block_requirement_id}`;

        return !renderedBlocks.has(key);
      });

      const blockIds = [
        ...new Set(
          entriesToRender
            .map(entry => entry.lesson_block_requirement_id)
            .filter(Boolean)
        )
      ];

      if (
        blockIds.length === 1 &&
        entriesToRender.every(entry =>
          entry.lesson_block_requirement_id === blockIds[0]
        )
      ) {
        const blockId = blockIds[0];

        const periodsCount = Math.max(
          ...entriesToRender.map(entry =>
            Number(
              entry.lesson_block_requirements?.periods_count || 1
            )
          )
        );

        cell.rowSpan = periodsCount;
        renderedBlocks.add(`${day.day_number}:${blockId}`);
      }

            if (
        matchingEntries.length > 0 &&
        entriesToRender.length === 0
      ) {
        return;
      }

      if (entriesToRender.length === 0) {
        cell.textContent = "–";
        cell.className = "timetable-empty";
        row.appendChild(cell);
        return;
      }

            const cardGrid = document.createElement("div");
      cardGrid.style.display = "grid";
      cardGrid.style.gridTemplateColumns =
        entriesToRender.length === 1
          ? "minmax(0, 1fr)"
          : "repeat(2, minmax(0, 1fr))";
      cardGrid.style.gap = "3px";
      cardGrid.style.width = "100%";
      cardGrid.style.height = "100%";

            const visibleLimit =
        window.innerWidth < 600 ? 2 : 3;

      const hiddenCount =
        Math.max(0, entriesToRender.length - visibleLimit);

      entriesToRender.forEach((entry, index) => {

        const gradeCourse = entry.grade_courses;

        const subject =
          entry.class_subjects?.subjects ||
          gradeCourse?.grade_course_groups?.subjects;

        const teachers =
          entry.timetable_entry_teachers || [];

        const teacherNames = [
          ...teachers.map(item =>
            item.teachers?.short_code
          ),
          gradeCourse?.teachers?.short_code
        ].filter(Boolean);

        const room =
          entry.rooms || gradeCourse?.rooms;

        const gradeClasses =
          gradeCourse?.grade_course_groups
            ?.grade_course_group_classes || [];

        const classNames = gradeClasses
          .map(item => item.classes?.name)
          .filter(Boolean);

        if (entry.classes?.name) {
          classNames.push(entry.classes.name);
        }

        const card = document.createElement("div");
                card.className = "timetable-entry";

        if (index >= visibleLimit) {
          card.style.display = "none";
          card.dataset.hiddenCourse = "true";
        }
        card.style.borderLeftColor =
          subject?.color || "#b91c1c";

        const teacher = document.createElement("strong");
        teacher.textContent =
          [...new Set(teacherNames)].join(", ") ||
          "Keine Lehrkraft";

        const subjectName = document.createElement("span");
        subjectName.textContent =
          gradeCourse?.course_name ||
          subject?.name ||
          subject?.short_code ||
          "Fach";

        const roomName = document.createElement("span");
        roomName.textContent =
          room?.name || "Kein Raum";

        const classes = document.createElement("span");
        classes.textContent =
          "Klassen: " +
          ([...new Set(classNames)].join(", ") || "–");

        card.appendChild(teacher);
        card.appendChild(subjectName);
        card.appendChild(roomName);
        card.appendChild(classes);

        cardGrid.appendChild(card);
      });

            if (hiddenCount > 0) {

        const moreButton = document.createElement("button");
        moreButton.type = "button";
        moreButton.className = "timetable-more-button";
        moreButton.textContent = "+" + hiddenCount;
        moreButton.style.gridColumn = "1 / -1";

                moreButton.addEventListener("click", () => {

          const overlay = document.createElement("div");
          overlay.className = "timetable-more-overlay";

          const modal = document.createElement("div");
          modal.className = "timetable-more-modal";

          const header = document.createElement("div");
          header.className = "timetable-more-header";

          const heading = document.createElement("h2");
          heading.textContent = "Weitere Unterrichtskurse";

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

          const courseList = document.createElement("div");
          courseList.className = "timetable-more-list";

          cardGrid.querySelectorAll(".timetable-entry").forEach(card => {

            const course = card.cloneNode(true);

            course.style.display = "flex";
            course.classList.add("timetable-more-course");

            courseList.appendChild(course);

          });

          modal.appendChild(courseList);
          overlay.appendChild(modal);

          overlay.addEventListener("click", event => {
            if (event.target === overlay) {
              overlay.remove();
            }
          });

          document.body.appendChild(overlay);

        });

        cardGrid.appendChild(moreButton);
      }

            cell.appendChild(cardGrid);
      cell.className = "timetable-filled";
      row.appendChild(cell);

    });

    tbody.appendChild(row);

  });

  table.appendChild(tbody);

  timetableViewGrid.innerHTML = "";

  if (filteredEntries.length === 0) {
    timetableViewGrid.textContent =
      "Für diese Auswahl wurden keine Unterrichtseinheiten gefunden.";
    return;
  }

  timetableViewGrid.appendChild(table);
}


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

const distributionBlocks = 
  document.getElementById("distributionBlocks");

const distributionBlockPattern =
  document.getElementById("distributionBlockPattern");

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

const gradeCourseBlockPattern =
  document.getElementById("gradeCourseBlockPattern");

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

const blockPattern = gradeCourseBlockPattern.value.trim();

const blockSizes = blockPattern
  .split("+")
  .map(value => Number(value.trim()));

const validBlockPattern =
  blockPattern !== "" &&
  blockSizes.every(value =>
    Number.isInteger(value) && value > 0
  ) &&
  blockSizes.reduce((sum, value) => sum + value, 0) === weeklyPeriods;

if (!validBlockPattern) {
  gradeCourseGroupMessage.textContent =
    "Die Unterrichtsblöcke müssen positive ganze Zahlen enthalten und zusammen genau " +
    weeklyPeriods + " Wochenstunden ergeben. Beispiel: 2 + 2.";

  return;
}
  
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

// Bisherige Unterrichtsblöcke entfernen

const { error: deleteBlocksError } = await suvDb
  .from("lesson_block_requirements")
  .delete()
  .eq("grade_course_group_id", groupId);

if (deleteBlocksError) throw deleteBlocksError;

// Neue Unterrichtsblöcke speichern

const blockRows = blockSizes.map((periodsCount, index) => ({
  grade_course_group_id: groupId,
  block_number: index + 1,
  periods_count: periodsCount
}));

const { error: insertBlocksError } = await suvDb
  .from("lesson_block_requirements")
  .insert(blockRows);

if (insertBlocksError) throw insertBlocksError;
      
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

// Unterrichtsblöcke speichern

const blockRows = blockSizes.map((periodsCount, index) => ({
  grade_course_group_id: newGroup.id,
  block_number: index + 1,
  periods_count: periodsCount
}));

const { error: blockError } = await suvDb
  .from("lesson_block_requirements")
  .insert(blockRows);

if (blockError) {
  await suvDb
    .from("grade_course_groups")
    .delete()
    .eq("id", newGroup.id);

  throw blockError;
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
        .select("id, grade_course_group_id, course_number, course_name, teacher_id, room_id")
    .in("grade_course_group_id", groupIds)
    .order("course_number");

  if (coursesError) {
    gradeCourseGroupList.textContent =
      "Parallelkurse konnten nicht geladen werden: " +
      coursesError.message;
    return;
  }

  
  // Verfügbare Lehrkräfte laden

  const { data: teachers, error: teachersError } = await suvDb
    .from("teachers")
    .select("id, first_name, last_name, short_code")
    .eq("is_active", true)
    .order("last_name");

  if (teachersError) {
    gradeCourseGroupList.textContent =
      "Lehrkräfte konnten nicht geladen werden: " +
      teachersError.message;
    return;
  }

  // Verfügbare Unterrichtsräume laden

  const { data: rooms, error: roomsError } = await suvDb
    .from("rooms")
    .select("id, name")
    .order("name");

  if (roomsError) {
    gradeCourseGroupList.textContent =
      "Räume konnten nicht geladen werden: " +
      roomsError.message;
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

      const courseTitle = document.createElement("strong");
      courseTitle.textContent = course.course_name;

      const teacherSelect = document.createElement("select");

      const teacherPlaceholder = document.createElement("option");
      teacherPlaceholder.value = "";
      teacherPlaceholder.textContent = "Lehrkraft auswählen";
      teacherSelect.appendChild(teacherPlaceholder);

      teachers.forEach(teacher => {
        const option = document.createElement("option");
        option.value = teacher.id;
        option.textContent =
          teacher.last_name + ", " + teacher.first_name +
          (teacher.short_code ? " (" + teacher.short_code + ")" : "");

        option.selected = teacher.id === course.teacher_id;
        teacherSelect.appendChild(option);
      });

      const roomSelect = document.createElement("select");

      const roomPlaceholder = document.createElement("option");
      roomPlaceholder.value = "";
      roomPlaceholder.textContent = "Raum auswählen";
      roomSelect.appendChild(roomPlaceholder);

      rooms.forEach(room => {
        const option = document.createElement("option");
        option.value = room.id;
        option.textContent = room.name;
        option.selected = room.id === course.room_id;
        roomSelect.appendChild(option);
      });

      
      // Lehrkraft speichern

      teacherSelect.addEventListener("change", async () => {

        teacherSelect.disabled = true;

        const { error } = await suvDb
          .from("grade_courses")
          .update({
            teacher_id: teacherSelect.value || null
          })
          .eq("id", course.id);

        teacherSelect.disabled = false;

        if (error) {
          alert("Lehrkraft konnte nicht gespeichert werden: " + error.message);
          return;
        }

      });

      // Unterrichtsraum speichern

      roomSelect.addEventListener("change", async () => {

        roomSelect.disabled = true;

        const { error } = await suvDb
          .from("grade_courses")
          .update({
            room_id: roomSelect.value || null
          })
          .eq("id", course.id);

        roomSelect.disabled = false;

        if (error) {
          alert("Raum konnte nicht gespeichert werden: " + error.message);
          return;
        }

      });


      item.append(
        courseTitle,
        document.createElement("br"),
        teacherSelect,
        document.createElement("br"),
        roomSelect
      );
      
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

  // Gespeicherte Unterrichtsblöcke laden

const { data: savedBlocks, error: blocksError } = await suvDb
  .from("lesson_block_requirements")
  .select("periods_count")
  .eq("grade_course_group_id", group.id)
  .order("block_number");

if (blocksError) {
  alert("Unterrichtsblöcke konnten nicht geladen werden: " + blocksError.message);
  return;
}

gradeCourseBlockPattern.value = (savedBlocks || [])
  .map(block => block.periods_count)
  .join(" + ");
  
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

card.appendChild(editButton);
    
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

const blockPattern = distributionBlockPattern.value.trim();

const blockSizes = blockPattern
  .split("+")
  .map(value => Number(value.trim()));

const validBlockPattern =
  blockPattern !== "" &&
  blockSizes.every(value =>
    Number.isInteger(value) && value > 0
  ) &&
  blockSizes.reduce((sum, value) => sum + value, 0) === weeklyPeriods;

if (!validBlockPattern) {
  distributionMessage.textContent =
    "Die Unterrichtsblöcke müssen positive ganze Zahlen enthalten und zusammen genau " +
    weeklyPeriods + " Wochenstunden ergeben. Beispiel: 2 + 2.";

  return;
}
  
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

  // Alte Unterrichtsblöcke entfernen

  const { error: deleteBlocksError } = await suvDb
    .from("lesson_block_requirements")
    .delete()
    .eq("class_subject_id", classSubject.id);

  if (deleteBlocksError) {
    distributionMessage.textContent =
      "Fach wurde gespeichert, aber alte Unterrichtsblöcke konnten nicht entfernt werden: " +
      deleteBlocksError.message;

    distributionSaveButton.disabled = false;
    distributionSaveButton.textContent = "Zuordnung speichern";
    return;
  }

  // Neue Unterrichtsblöcke speichern

  const blockRows = blockSizes.map((periodsCount, index) => ({
    class_subject_id: classSubject.id,
    block_number: index + 1,
    periods_count: periodsCount
  }));

  const { error: insertBlocksError } = await suvDb
    .from("lesson_block_requirements")
    .insert(blockRows);

  if (insertBlocksError) {
    distributionMessage.textContent =
      "Fach wurde gespeichert, aber die Unterrichtsblöcke konnten nicht gespeichert werden: " +
      insertBlocksError.message;

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

    const { data: savedBlocks, error: blocksError } = await suvDb
      .from("lesson_block_requirements")
      .select("periods_count")
      .eq("class_subject_id", entry.id)
      .order("block_number");

    if (blocksError) {
      distributionMessage.textContent =
        "Unterrichtsblöcke konnten nicht geladen werden: " +
        blocksError.message;
      return;
    }

    distributionBlockPattern.value = (savedBlocks || [])
      .map(block => block.periods_count)
      .join(" + ");
    
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
    class_id,
    class_subject_id,
    grade_course_id,
    room_id,
    classes (
  name
),
    weekday,
period_number,
lesson_block_requirement_id,
lesson_block_requirements (
  block_number,
  periods_count
),
    parallel_group_id,
    class_subjects (
      weekly_periods,
      subjects (
        name,
        short_code,
        color
      )
    ),
    grade_courses (
      course_name,
      teachers (
        first_name,
        last_name,
        short_code
      ),
      rooms (
        name
      ),
      grade_course_groups (
        subjects (
          name,
          short_code,
          color
        ),
        grade_course_group_classes (
  class_id,
  classes (
    name
  )
)
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
  .eq("timetable_version_id", activeTimetableVersionId);

if (entriesError) {
  timetableGrid.textContent =
    "Unterrichtseinheiten konnten nicht geladen werden.";
  return;
}

timetableGrid.textContent = "TEST 3: Unterrichtseinheiten geladen";

timetableEntries = (entries || []).filter(entry => {
  if (entry.class_id === selectedTimetableClassId) {
    return true;
  }

  const participatingClasses =
    entry.grade_courses?.grade_course_groups
      ?.grade_course_group_classes || [];

  return participatingClasses.some(item =>
    item.class_id === selectedTimetableClassId
  );
});

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

    const renderedLessonBlocks = new Set();
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

const entriesToRender = matchingEntries.filter(entry => {
  if (!entry.lesson_block_requirement_id) {
    return true;
  }

  const blockKey =
    `${day.day_number}:${entry.lesson_block_requirement_id}`;

  return !renderedLessonBlocks.has(blockKey);
});

if (
  matchingEntries.length > 0 &&
  entriesToRender.length === 0
) {
  return;
}

const blockIds = [
  ...new Set(
    entriesToRender
      .map(entry => entry.lesson_block_requirement_id)
      .filter(Boolean)
  )
];

if (
  blockIds.length === 1 &&
  entriesToRender.every(
    entry => entry.lesson_block_requirement_id === blockIds[0]
  )
) {
  const blockKey = `${day.day_number}:${blockIds[0]}`;

  const periodsCount = Math.max(
    ...entriesToRender.map(
      entry => Number(
        entry.lesson_block_requirements?.periods_count || 1
      )
    )
  );

  cell.rowSpan = periodsCount;
  renderedLessonBlocks.add(blockKey);
}

      
if (entriesToRender.length > 0) {

  // Höchstens zwie bei Handys und bei iPads drei Unterrichtskurse direkt anzeigen
  const visibleLimit = window.innerWidth < 600 ? 2 : 3;

const visibleEntries = entriesToRender.slice(0, visibleLimit);

  // Anzahl der weiteren Kurse
  const hiddenCount = entriesToRender.length - visibleLimit;

  // Anzahl der Spalten festlegen
  const columnCount = visibleLimit;

  const cardGrid = document.createElement("div");

cardGrid.style.display = "grid";
cardGrid.style.gridTemplateColumns =
  `repeat(${columnCount}, minmax(0, 1fr))`;
cardGrid.style.gap = "3px";
cardGrid.style.width = "100%";
cardGrid.style.height = "100%";

  // Sichtbare Unterrichtskurse erstellen
visibleEntries.forEach(entry => {

  const gradeCourse = entry.grade_courses;

  const subject =
    entry.class_subjects?.subjects ||
    gradeCourse?.grade_course_groups?.subjects;

  const assignedTeachers =
    entry.timetable_entry_teachers || [];

  const courseTeacher = gradeCourse?.teachers;

  const room =
    entry.rooms || gradeCourse?.rooms;

  // Lehrkraft-Kürzel
  const teacherName = document.createElement("strong");
  teacherName.className = "timetable-teacher-code";

  if (courseTeacher?.short_code) {
    teacherName.textContent = courseTeacher.short_code;
  } else {
    teacherName.textContent = assignedTeachers
      .map(item => item.teachers?.short_code)
      .filter(Boolean)
      .join(", ") || "Kein Kürzel";
  }

  // Fach
  const subjectName = document.createElement("span");
  subjectName.className = "timetable-subject-name";
  subjectName.textContent =
    gradeCourse?.course_name ||
    subject?.name ||
    subject?.short_code ||
    "Fach";

  // Raum
  const roomName = document.createElement("span");
  roomName.className = "timetable-room-name";
  roomName.textContent = room?.name || "Kein Raum";

  // Zugehörige Klassen
  const gradeGroupClasses =
    gradeCourse?.grade_course_groups?.grade_course_group_classes || [];

  const classNames = gradeGroupClasses
    .map(item => item.classes?.name)
    .filter(Boolean);

  if (entry.classes?.name) {
    classNames.push(entry.classes.name);
  }

  const uniqueClassNames = [...new Set(classNames)];

  const className = document.createElement("span");
  className.className = "timetable-class-name";
  className.textContent = uniqueClassNames.length > 0
    ? "Klassen: " + uniqueClassNames.join(", ")
    : "Keine Klasse zugeordnet";

  // Bearbeiten
  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "timetable-edit-button";
  editButton.dataset.entryId = entry.id;
  editButton.setAttribute("aria-label", "Unterricht bearbeiten");
  editButton.title = "Bearbeiten";
  editButton.innerHTML = `
    <svg viewBox="0 0 24 24" width="20" height="20"
         fill="none" stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 20h9"/>
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>
    </svg>
  `;

  // Löschen
  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "timetable-delete-button";
  deleteButton.dataset.entryId = entry.id;
  deleteButton.setAttribute("aria-label", "Unterricht löschen");
  deleteButton.title = "Löschen";
  deleteButton.innerHTML = `
    <svg viewBox="0 0 24 24" width="20" height="20"
         fill="none" stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 6h18"/>
      <path d="M8 6V4h8v2"/>
      <path d="m19 6-1 14H6L5 6"/>
      <path d="M10 11v5M14 11v5"/>
    </svg>
  `;

  const actions = document.createElement("div");
actions.className = "timetable-actions";
actions.appendChild(editButton);
actions.appendChild(deleteButton);

// Kopfzeile mit Lehrkraft-Kürzel und Symbolen
const entryHeader = document.createElement("div");
entryHeader.className = "timetable-entry-header";
entryHeader.appendChild(teacherName);
entryHeader.appendChild(actions);

  // Unterrichtskarte
  const entryContainer = document.createElement("div");
  entryContainer.className = "timetable-entry";
  entryContainer.dataset.periodsCount =
    String(entry.lesson_block_requirements?.periods_count || 1);


  
  entryContainer.style.borderLeftColor =
    subject?.color || "#b91c1c";

  entryContainer.appendChild(entryHeader);
entryContainer.appendChild(subjectName);
entryContainer.appendChild(roomName);
entryContainer.appendChild(className);

  cardGrid.appendChild(entryContainer);

});

  // Weitere Kurse als +N anzeigen
  if (hiddenCount > 0) {

    const moreButton = document.createElement("button");

    moreButton.type = "button";
    moreButton.className = "timetable-more-button";
    moreButton.textContent = "+" + hiddenCount;
    moreButton.style.gridColumn = "1 / -1";

    moreButton.dataset.weekday = day.day_number;
    moreButton.dataset.periodNumber = lesson.lesson_number;

    cardGrid.appendChild(moreButton);
  }

  cell.appendChild(cardGrid);
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

  
  // Jahrgangsweite Kursgruppen der ausgewählten Klasse laden

  timetableGradeCourseGroup.innerHTML =
    '<option value="">Keine Jahrgangskursgruppe</option>';

  if (!selectedTimetableClassId || !activeTimetableVersionId) {
    return;
  }

  const { data: version, error: versionError } = await suvDb
    .from("timetable_versions")
    .select("school_year_id")
    .eq("id", activeTimetableVersionId)
    .single();

  if (versionError) {
    timetableMessage.textContent =
      "Schuljahr der Stundenplanversion konnte nicht geladen werden.";
    return;
  }

  const { data: memberships, error: membershipsError } = await suvDb
    .from("grade_course_group_classes")
    .select("grade_course_group_id")
    .eq("class_id", selectedTimetableClassId);

  if (membershipsError) {
    timetableMessage.textContent =
      "Jahrgangskursgruppen konnten nicht geladen werden.";
    return;
  }

  const groupIds = (memberships || []).map(
    item => item.grade_course_group_id
  );

  if (groupIds.length === 0) {
    return;
  }

  const { data: groups, error: groupsError } = await suvDb
    .from("grade_course_groups")
    .select(`
      id,
      weekly_periods,
      subjects (
        name,
        short_code
      )
    `)
    .eq("school_year_id", version.school_year_id)
    .in("id", groupIds);

  if (groupsError) {
    timetableMessage.textContent =
      "Jahrgangskursgruppen konnten nicht geladen werden.";
    return;
  }

  (groups || []).forEach(group => {
    const option = document.createElement("option");

    option.value = group.id;

    const subject = group.subjects;

    option.textContent =
      (subject?.short_code || subject?.name || "Fach") +
      " – Jahrgangskurs (" +
      group.weekly_periods +
      " Wochenstunden)";

    timetableGradeCourseGroup.appendChild(option);
  });
}

// Unterrichtsblöcke einer Jahrgangskursgruppe laden

async function loadGradeCourseBlocks() {
  timetableGradeCourseBlock.innerHTML =
    '<option value="">Block auswählen</option>';

  timetableGradeCourseBlock.disabled = true;

  const groupId = timetableGradeCourseGroup.value;

  if (!groupId) {
    return;
  }

  const { data: blocks, error } = await suvDb
    .from("lesson_block_requirements")
    .select("id, block_number, periods_count")
    .eq("grade_course_group_id", groupId)
    .order("block_number");

  if (error) {
    timetableMessage.textContent =
      "Unterrichtsblöcke konnten nicht geladen werden: " +
      error.message;
    return;
  }

  if (!blocks || blocks.length === 0) {
    timetableGradeCourseBlock.innerHTML =
      '<option value="">Keine Blöcke hinterlegt</option>';
    return;
  }

  blocks.forEach(block => {
    const option = document.createElement("option");

    option.value = block.id;
    option.textContent =
      "Block " + block.block_number +
      " – " + block.periods_count +
      (block.periods_count === 1 ? " Stunde" : " Stunden");

    timetableGradeCourseBlock.appendChild(option);
  });

  timetableGradeCourseBlock.disabled = false;
}

async function loadClassSubjectBlocks() {
  timetableClassSubjectBlock.innerHTML =
    '<option value="">Block auswählen</option>';

  timetableClassSubjectBlock.disabled = true;

  const classSubjectId = timetableSubject.value;

  if (!classSubjectId) {
    timetableClassSubjectBlock.innerHTML =
      '<option value="">Zuerst ein Fach auswählen</option>';
    return;
  }

  const { data: blocks, error } = await suvDb
    .from("lesson_block_requirements")
    .select("id, block_number, periods_count")
    .eq("class_subject_id", classSubjectId)
    .order("block_number");

  if (error) {
    timetableMessage.textContent =
      "Unterrichtsblöcke konnten nicht geladen werden: " +
      error.message;
    return;
  }

  if (!blocks || blocks.length === 0) {
    timetableClassSubjectBlock.innerHTML =
      '<option value="">Keine Blöcke hinterlegt</option>';
    return;
  }

  blocks.forEach(block => {
    const option = document.createElement("option");

    option.value = block.id;
    option.textContent =
      "Block " + block.block_number +
      " – " + block.periods_count +
      (block.periods_count === 1 ? " Stunde" : " Stunden");

    timetableClassSubjectBlock.appendChild(option);
  });

  timetableClassSubjectBlock.disabled = false;
}

// Blöcke bei Auswahl einer Kursgruppe neu laden

timetableGradeCourseGroup.addEventListener(
  "change",
  loadGradeCourseBlocks
);

timetableSubject.addEventListener(
  "change",
  loadClassSubjectBlocks
);

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

const selectedGradeCourseGroupId =
  timetableGradeCourseGroup.value;

const selectedGradeCourseBlockId =
  timetableGradeCourseBlock.value;

const selectedClassSubjectBlockId =
  timetableClassSubjectBlock.value;
  
if (
  !day ||
  day < 1 ||
  day > 5 ||
  !lesson ||
  (!timetableSubject.value && !selectedGradeCourseGroupId) ||
  (timetableSubject.value && selectedGradeCourseGroupId) ||
  (selectedGradeCourseGroupId && !selectedGradeCourseBlockId) ||
  (!selectedGradeCourseGroupId &&
  (
    !selectedClassSubjectBlockId ||
    selectedTeacherIds.length === 0 ||
    !timetableRoom.value
  ))
) {
  timetableMessage.textContent =
    "Bitte entweder eine Jahrgangskursgruppe mit Unterrichtsblock oder ein vollständiges normales Unterrichtsfach mit Lehrkraft und Raum auswählen.";
  return;
} 

  // Jahrgangsweite Kursgruppe gemeinsam einplanen

  if (selectedGradeCourseGroupId) {
    if (timetableEntryId.value) {
      timetableMessage.textContent =
        "Jahrgangskurse können derzeit nur neu eingeplant werden.";
      return;
    }

    const { data: group, error: groupError } = await suvDb
      .from("grade_course_groups")
      .select(`
        id,
        school_year_id,
        grade_course_group_classes (
          class_id
        ),
        grade_courses (
          id,
          course_name,
          teacher_id,
          room_id
        )
      `)
      .eq("id", selectedGradeCourseGroupId)
      .single();

    if (groupError || !group) {
      timetableMessage.textContent =
        "Die Jahrgangskursgruppe konnte nicht geladen werden.";
      return;
    }

// Ausgewählten Unterrichtsblock laden

const { data: selectedBlock, error: blockError } = await suvDb
  .from("lesson_block_requirements")
  .select("id, block_number, periods_count")
  .eq("id", selectedGradeCourseBlockId)
  .eq("grade_course_group_id", selectedGradeCourseGroupId)
  .single();

if (blockError || !selectedBlock) {
  timetableMessage.textContent =
    "Der ausgewählte Unterrichtsblock konnte nicht geladen werden.";
  return;
}

// Prüfen, ob dieser Unterrichtsblock bereits eingeplant wurde

const { data: existingBlockEntries, error: existingBlockError } =
  await suvDb
    .from("timetable_entries")
    .select("id")
    .eq("timetable_version_id", activeTimetableVersionId)
    .eq("lesson_block_requirement_id", selectedBlock.id)
    .limit(1);

if (existingBlockError) {
  timetableMessage.textContent =
    "Die bisherige Blockplanung konnte nicht geprüft werden.";
  return;
}

if (existingBlockEntries && existingBlockEntries.length > 0) {
  timetableMessage.textContent =
    "Dieser Unterrichtsblock wurde bereits eingeplant.";
  return;
}
    
const blockLength = selectedBlock.periods_count;

// Alle Unterrichtsstunden des Blocks bestimmen

const blockPeriodNumbers = Array.from(
  { length: blockLength },
  (_, index) => lesson + index
);

const { data: availablePeriods, error: periodsError } = await suvDb
  .from("lesson_times")
  .select("lesson_number")
  .in("lesson_number", blockPeriodNumbers);

if (periodsError || !availablePeriods ||
    availablePeriods.length !== blockLength) {
  timetableMessage.textContent =
    "Der Unterrichtsblock passt ab dieser Stunde nicht mehr vollständig in den Schultag.";
  return;
}
    
    const { data: version, error: versionError } = await suvDb
      .from("timetable_versions")
      .select("school_year_id")
      .eq("id", activeTimetableVersionId)
      .single();

    if (versionError || group.school_year_id !== version.school_year_id) {
      timetableMessage.textContent =
        "Die Kursgruppe gehört nicht zum Schuljahr dieser Stundenplanversion.";
      return;
    }

    const courses = group.grade_courses || [];

    const participatingClassIds =
      (group.grade_course_group_classes || [])
        .map(item => item.class_id);

    if (
      courses.length === 0 ||
      participatingClassIds.length === 0 ||
      !participatingClassIds.includes(selectedTimetableClassId)
    ) {
      timetableMessage.textContent =
        "Die Kursgruppe enthält keine gültigen Kurse oder gehört nicht zur ausgewählten Klasse.";
      return;
    }

    if (courses.some(course => !course.teacher_id || !course.room_id)) {
      timetableMessage.textContent =
        "Bitte weise zuerst jedem Parallelkurs eine Lehrkraft und einen Raum zu.";
      return;
    }

    const teacherIds = courses.map(course => course.teacher_id);
    const roomIds = courses.map(course => course.room_id);

    if (
      new Set(teacherIds).size !== teacherIds.length ||
      new Set(roomIds).size !== roomIds.length
    ) {
      timetableMessage.textContent =
        "Jeder Parallelkurs benötigt eine eigene Lehrkraft und einen eigenen Raum.";
      return;
    }

    const { data: occupiedEntries, error: occupiedError } = await suvDb
      .from("timetable_entries")
      .select(`
  id,
  teacher_id,
  room_id,
  class_id,
  timetable_entry_teachers (
    teacher_id
  ),
  grade_courses (
    grade_course_groups (
      grade_course_group_classes (
        class_id
      )
    )
  )
`)          
      .eq("timetable_version_id", activeTimetableVersionId)
      .eq("weekday", day)
      .in("period_number", blockPeriodNumbers);

    if (occupiedError) {
      timetableMessage.textContent =
        "Belegungskonflikte konnten nicht geprüft werden.";
      return;
    }

    const occupiedClassIds = new Set();

    (occupiedEntries || []).forEach(entry => {
      if (entry.class_id) {
        occupiedClassIds.add(entry.class_id);
      }

      const classes =
        entry.grade_courses?.grade_course_groups
          ?.grade_course_group_classes || [];

      classes.forEach(item => {
        occupiedClassIds.add(item.class_id);
      });
    });

    if (
      participatingClassIds.some(id => occupiedClassIds.has(id))
    ) {
      timetableMessage.textContent =
        "Mindestens eine beteiligte Klasse hat zu diesem Zeitpunkt bereits Unterricht.";
      return;
    }

        if (
      courses.some(course =>
        (occupiedEntries || []).some(entry =>
          entry.teacher_id === course.teacher_id ||
          (entry.timetable_entry_teachers || []).some(
            assignedTeacher =>
              assignedTeacher.teacher_id === course.teacher_id
          )
        )
      )
    ) {
      timetableMessage.textContent =
        "Mindestens eine Lehrkraft hat zu diesem Zeitpunkt bereits Unterricht.";
      return;
    }

    if (
      courses.some(course =>
        (occupiedEntries || []).some(entry =>
          entry.room_id === course.room_id
        )
      )
    ) {
      timetableMessage.textContent =
        "Mindestens ein Kursraum ist zu diesem Zeitpunkt bereits belegt.";
      return;
    }

    const courseEntries = courses.flatMap(course =>
  blockPeriodNumbers.map(periodNumber => ({
    timetable_version_id: activeTimetableVersionId,
    lesson_block_requirement_id: selectedBlock.id,
    grade_course_id: course.id,
    teacher_id: course.teacher_id,
    room_id: course.room_id,
    class_id: null,
    class_subject_id: null,
    weekday: day,
    period_number: periodNumber,
    parallel_group_id: null
  }))
);

    const { error: insertError } = await suvDb
      .from("timetable_entries")
      .insert(courseEntries);

    if (insertError) {
      timetableMessage.textContent =
        "Jahrgangskurse konnten nicht gespeichert werden: " +
        insertError.message;
      return;
    }

    timetableMessage.textContent =
      "Alle Parallelkurse wurden gleichzeitig eingeplant.";

    resetTimetableEntryForm();

    await loadTimetableGrid();

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

  // Ausgewählten normalen Unterrichtsblock laden

  const { data: selectedClassSubjectBlock, error: classBlockError } =
    await suvDb
      .from("lesson_block_requirements")
      .select("id, block_number, periods_count")
      .eq("id", selectedClassSubjectBlockId)
      .eq("class_subject_id", timetableSubject.value)
      .single();

  if (classBlockError || !selectedClassSubjectBlock) {
    timetableMessage.textContent =
      "Der ausgewählte Unterrichtsblock konnte nicht geladen werden.";
    return;
  }

  // Blocklänge bestimmen

  const blockLength = selectedClassSubjectBlock.periods_count;

  // Alle Unterrichtsstunden des Blocks bestimmen

  const blockPeriodNumbers = Array.from(
    { length: blockLength },
    (_, index) => lesson + index
  );

  // Prüfen, ob alle Stunden im Schultag existieren

  const { data: availablePeriods, error: periodsError } = await suvDb
    .from("lesson_times")
    .select("lesson_number")
    .in("lesson_number", blockPeriodNumbers);

  if (
    periodsError ||
    !availablePeriods ||
    availablePeriods.length !== blockLength
  ) {
    timetableMessage.textContent =
      "Der Unterrichtsblock passt ab dieser Stunde nicht mehr vollständig in den Schultag.";
    return;
  }

  // Prüfen, ob der Block bereits eingeplant wurde

  const { data: existingBlockEntries, error: existingBlockError } =
    await suvDb
      .from("timetable_entries")
      .select("id")
      .eq("timetable_version_id", activeTimetableVersionId)
      .eq("lesson_block_requirement_id", selectedClassSubjectBlock.id)
      .limit(1);

  if (existingBlockError) {
    timetableMessage.textContent =
      "Die bisherige Blockplanung konnte nicht geprüft werden.";
    return;
  }

  if (existingBlockEntries && existingBlockEntries.length > 0) {
    timetableMessage.textContent =
      "Dieser Unterrichtsblock wurde bereits eingeplant.";
    return;
  }
  
  const entryData = {
  timetable_version_id: activeTimetableVersionId,
  class_subject_id: timetableSubject.value,
  lesson_block_requirement_id: selectedClassSubjectBlock.id,
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
    class_id,
    class_subject_id,
    lesson_block_requirement_id,
    grade_courses (
      grade_course_groups (
        grade_course_group_classes (
          class_id
        )
      )
    ),
    timetable_entry_teachers (
      teacher_id
    )
  `)
  .eq("timetable_version_id", activeTimetableVersionId)
  .eq("weekday", day)
  .in("period_number", blockPeriodNumbers);

const {
  data: loadedConflictingEntries,
  error: conflictError
} = await conflictQuery;

if (conflictError) {
  timetableMessage.textContent =
    "Belegungskonflikte konnten nicht geprüft werden.";
  return;
}

// Beim Bearbeiten alle bisherigen Stunden des eigenen Blocks ausschließen

const conflictingEntries = (loadedConflictingEntries || []).filter(entry => {

  if (!entryId) return true;

  if (
    selectedClassSubjectBlockId &&
    entry.lesson_block_requirement_id === selectedClassSubjectBlockId &&
    entry.class_subject_id === timetableSubject.value
  ) {
    return false;
  }

  return entry.id !== entryId;
});

if (conflictError) {
  timetableMessage.textContent =
    "Belegungskonflikte konnten nicht geprüft werden.";
  return;
}

// Prüfen, ob die Klasse bereits an einem Jahrgangskurs teilnimmt

const gradeCourseClassConflict = conflictingEntries.some(entry => {
  const groupClasses =
    entry.grade_courses?.grade_course_groups
      ?.grade_course_group_classes || [];

  return groupClasses.some(
    item => item.class_id === selectedTimetableClassId
  );
});

if (gradeCourseClassConflict) {
  timetableMessage.textContent =
    "Diese Klasse nimmt zu diesem Zeitpunkt bereits an einem Jahrgangskurs teil.";
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

    // Bereits verplante Unterrichtseinheiten laden

  const { data: existingLessons, error: weeklyError } = await suvDb
    .from("timetable_entries")
    .select("id, parallel_group_id, lesson_block_requirement_id")
    .eq("timetable_version_id", activeTimetableVersionId)
    .eq("class_subject_id", timetableSubject.value);

  if (weeklyError) {
    timetableMessage.textContent =
      "Wochenstunden konnten nicht überprüft werden.";
    return;
  }

  // Bereits verplante Blöcke und Einzelstunden ermitteln

  const blockIds = [
    ...new Set(
      (existingLessons || [])
        .map(item => item.lesson_block_requirement_id)
        .filter(Boolean)
    )
  ];

  const countedLessons = new Set();
  let plannedPeriods = 0;

  // Unterrichtsblöcke zählen ihre tatsächliche Stundenanzahl

  if (blockIds.length > 0) {
    const { data: blocks, error: blocksError } = await suvDb
      .from("lesson_block_requirements")
      .select("id, periods_count")
      .in("id", blockIds);

    if (blocksError) {
      timetableMessage.textContent =
        "Verplante Unterrichtsblöcke konnten nicht geladen werden.";
      return;
    }

    (blocks || []).forEach(block => {
      plannedPeriods += block.periods_count;
    });
  }

  // Einzelstunden und Parallelgruppen berücksichtigen

  (existingLessons || []).forEach(item => {
    if (item.lesson_block_requirement_id) return;

    const key = item.parallel_group_id
      ? "parallel-" + item.parallel_group_id
      : "entry-" + item.id;

    if (!countedLessons.has(key)) {
      countedLessons.add(key);
      plannedPeriods++;
    }
  });

  // Prüfen, ob der neue Block noch in die Wochenstunden passt

  if (plannedPeriods + blockLength > subjectData.weekly_periods) {
    timetableMessage.textContent =
      "Dieser Unterrichtsblock überschreitet die noch verfügbaren Wochenstunden des Fachs.";
    return;
  }
  
  
  
// Erste Lehrkraft für die bisherige Datenbankspalte übernehmen

entryData.teacher_id = selectedTeacherIds[0];

// Alle Stunden des Unterrichtsblocks vorbereiten

const blockEntries = blockPeriodNumbers.map(periodNumber => ({
  ...entryData,
  period_number: periodNumber
}));

let savedEntries = [];

// Unterrichtsblock neu speichern oder bearbeiten

if (entryId) {

  // Bisherigen Eintrag laden

  const { data: originalEntry, error: originalEntryError } = await suvDb
    .from("timetable_entries")
    .select("id, lesson_block_requirement_id, class_subject_id")
    .eq("id", entryId)
    .eq("timetable_version_id", activeTimetableVersionId)
    .single();

  if (originalEntryError || !originalEntry) {
    timetableMessage.textContent =
      "Der bisherige Eintrag konnte nicht geladen werden.";
    return;
  }

  let existingBlockEntries = [];

  // Alle bisherigen Stunden des Blocks laden

  if (originalEntry.lesson_block_requirement_id) {

    const { data, error } = await suvDb
      .from("timetable_entries")
      .select("id, period_number")
      .eq("timetable_version_id", activeTimetableVersionId)
      .eq(
        "lesson_block_requirement_id",
        originalEntry.lesson_block_requirement_id
      )
      .eq("class_subject_id", originalEntry.class_subject_id)
      .order("period_number");

    if (error) {
      timetableMessage.textContent =
        "Bisherige Blockstunden konnten nicht geladen werden.";
      return;
    }

    existingBlockEntries = data || [];

  } else {
    existingBlockEntries = [{
      id: originalEntry.id,
      period_number: null
    }];
  }

  // Vorhandene Stunden aktualisieren

  for (
    let index = 0;
    index < Math.min(existingBlockEntries.length, blockEntries.length);
    index++
  ) {

    const { data, error } = await suvDb
      .from("timetable_entries")
      .update(blockEntries[index])
      .eq("id", existingBlockEntries[index].id)
      .select("id")
      .single();

    if (error) {
      timetableMessage.textContent =
        "Blockstunde konnte nicht aktualisiert werden: " +
        error.message;
      return;
    }

    savedEntries.push(data);
  }

  // Fehlende Stunden ergänzen

  if (blockEntries.length > existingBlockEntries.length) {

    const remainingEntries = blockEntries.slice(
      existingBlockEntries.length
    );

    const { data, error } = await suvDb
      .from("timetable_entries")
      .insert(remainingEntries)
      .select("id");

    if (error) {
      timetableMessage.textContent =
        "Zusätzliche Blockstunden konnten nicht gespeichert werden: " +
        error.message;
      return;
    }

    savedEntries.push(...data);
  }

  // Nicht mehr benötigte Stunden entfernen

  if (existingBlockEntries.length > blockEntries.length) {

    const entriesToDelete = existingBlockEntries.slice(
      blockEntries.length
    );

    const idsToDelete = entriesToDelete.map(entry => entry.id);

    const { error } = await suvDb
      .from("timetable_entries")
      .delete()
      .in("id", idsToDelete)
      .eq("timetable_version_id", activeTimetableVersionId);

    if (error) {
      timetableMessage.textContent =
        "Überzählige Blockstunden konnten nicht entfernt werden.";
      return;
    }
  }

} else {

  // Neuen Unterrichtsblock mit allen Stunden speichern

  const { data, error } = await suvDb
    .from("timetable_entries")
    .insert(blockEntries)
    .select("id");

  if (error) {
    timetableMessage.textContent =
      "Speicherfehler: " + error.message;
    return;
  }

  savedEntries = data || [];
}

// Lehrkraft-Zuordnungen für alle Blockstunden aktualisieren

for (const savedEntry of savedEntries) {

  const { error: deleteTeachersError } = await suvDb
    .from("timetable_entry_teachers")
    .delete()
    .eq("timetable_entry_id", savedEntry.id);

  if (deleteTeachersError) {
    timetableMessage.textContent =
      "Bisherige Lehrkraft-Zuordnungen konnten nicht entfernt werden.";
    return;
  }

  const teacherAssignments = selectedTeacherIds.map(teacherId => ({
    timetable_entry_id: savedEntry.id,
    teacher_id: teacherId
  }));

  const { error: insertTeachersError } = await suvDb
    .from("timetable_entry_teachers")
    .insert(teacherAssignments);

  if (insertTeachersError) {
    timetableMessage.textContent =
      "Lehrkräfte konnten nicht allen Blockstunden zugeordnet werden.";
    return;
  }
}

timetableMessage.textContent =
  "Unterrichtsblock erfolgreich gespeichert.";

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
const course = document.createElement("div");
course.className = "timetable-more-course";
      
const gradeCourse = entry.grade_courses;

const subject =
  entry.class_subjects?.subjects ||
  gradeCourse?.grade_course_groups?.subjects;

const assignedTeachers =
  entry.timetable_entry_teachers || [];

const courseTeacher = gradeCourse?.teachers;

const room =
  entry.rooms || gradeCourse?.rooms;

// Lehrkraft-Kürzel
const teacherName = document.createElement("strong");
teacherName.className = "timetable-teacher-code";

if (courseTeacher?.short_code) {
  teacherName.textContent = courseTeacher.short_code;
} else {
  teacherName.textContent = assignedTeachers
    .map(item => item.teachers?.short_code)
    .filter(Boolean)
    .join(", ") || "Kein Kürzel";
}

// Fach
const subjectName = document.createElement("span");
subjectName.className = "timetable-subject-name";
subjectName.textContent =
  gradeCourse?.course_name ||
  subject?.name ||
  subject?.short_code ||
  "Fach";

// Raum
const roomName = document.createElement("span");
roomName.className = "timetable-room-name";
roomName.textContent = room?.name || "Kein Raum";

// Klassen
const gradeGroupClasses =
  gradeCourse?.grade_course_groups?.grade_course_group_classes || [];

const classNames = gradeGroupClasses
  .map(item => item.classes?.name)
  .filter(Boolean);

if (entry.classes?.name) {
  classNames.push(entry.classes.name);
}

const uniqueClassNames = [...new Set(classNames)];

const className = document.createElement("span");
className.className = "timetable-class-name";
className.textContent = uniqueClassNames.length
  ? "Klassen: " + uniqueClassNames.join(", ")
  : "Keine Klasse zugeordnet";

course.style.borderLeftColor =
  subject?.color || "#b91c1c";
      
      const actions = document.createElement("div");
      actions.className = "timetable-more-actions";

      const editCourseButton = document.createElement("button");
editCourseButton.type = "button";
editCourseButton.className = "timetable-edit-button";
editCourseButton.setAttribute("aria-label", "Unterricht bearbeiten");
editCourseButton.title = "Bearbeiten";
editCourseButton.innerHTML = `
  <svg viewBox="0 0 24 24" width="20" height="20"
       fill="none" stroke="currentColor" stroke-width="2"
       stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 20h9"/>
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>
  </svg>
`;

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
deleteCourseButton.className = "timetable-delete-button";
deleteCourseButton.setAttribute("aria-label", "Unterricht löschen");
deleteCourseButton.title = "Löschen";
deleteCourseButton.innerHTML = `
  <svg viewBox="0 0 24 24" width="20" height="20"
       fill="none" stroke="currentColor" stroke-width="2"
       stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 6h18"/>
    <path d="M8 6V4h8v2"/>
    <path d="m19 6-1 14H6L5 6"/>
    <path d="M10 11v5M14 11v5"/>
  </svg>
`;

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

      course.appendChild(teacherName);
course.appendChild(subjectName);
course.appendChild(roomName);
course.appendChild(className);
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

// Zugehörigen Unterrichtsblock wiederherstellen
if (entry.lesson_block_requirement_id) {
  await loadClassSubjectBlocks();
  timetableClassSubjectBlock.value =
    entry.lesson_block_requirement_id;
}
    
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

// Zu löschenden Eintrag laden

const { data: entryToDelete, error: loadDeleteError } = await suvDb
  .from("timetable_entries")
  .select("id, lesson_block_requirement_id, class_subject_id")
  .eq("id", entryId)
  .eq("timetable_version_id", activeTimetableVersionId)
  .single();

if (loadDeleteError || !entryToDelete) {
  timetableMessage.textContent =
    "Unterrichtseinheit konnte nicht gefunden werden.";
  return;
}

let deleteQuery = suvDb
  .from("timetable_entries")
  .delete()
  .eq("timetable_version_id", activeTimetableVersionId);

// Bei normalen Unterrichtsblöcken alle Blockstunden löschen

if (
  entryToDelete.lesson_block_requirement_id &&
  entryToDelete.class_subject_id
) {
  deleteQuery = deleteQuery
    .eq(
      "lesson_block_requirement_id",
      entryToDelete.lesson_block_requirement_id
    )
    .eq("class_subject_id", entryToDelete.class_subject_id);
} else {
  deleteQuery = deleteQuery.eq("id", entryId);
}

const { error } = await deleteQuery;

if (error) {
  timetableMessage.textContent =
    "Unterrichtseinheit konnte nicht gelöscht werden: " +
    error.message;
  return;
}

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


// ==========================================
// SUV – Vertretungsplanung: Abwesenheiten
// ==========================================

const absenceForm = document.getElementById(
  "substitutionAbsenceForm"
);

const absenceTeacherSelect = document.getElementById(
  "absenceTeacher"
);

const absenceMessage = document.getElementById(
  "substitutionAbsenceMessage"
);

const absenceList = document.getElementById(
  "substitutionAbsences"
);


// Lehrkräfte für die Auswahl laden

async function loadAbsenceTeachers() {

  if (!absenceTeacherSelect) return;

  const { data, error } = await suvDb
    .from("teachers")
    .select("id, first_name, last_name")
    .eq("is_active", true)
    .order("last_name", { ascending: true });

  if (error) {
    absenceMessage.textContent =
      "Lehrkräfte konnten nicht geladen werden: " +
      error.message;
    return;
  }

  absenceTeacherSelect.innerHTML =
    '<option value="">Lehrkraft auswählen</option>';

  (data || []).forEach(teacher => {

    const option = document.createElement("option");

    option.value = teacher.id;
    option.textContent =
      teacher.first_name + " " + teacher.last_name;

    absenceTeacherSelect.appendChild(option);

  });
}


// Erfasste Abwesenheiten anzeigen

async function loadSubstitutionAbsences() {

  if (!absenceList) return;

  absenceList.textContent =
    "Abwesenheiten werden geladen ...";

  const { data, error } = await suvDb
    .from("teacher_absences")
    .select(`
      id,
      teacher_id,
      start_date,
      end_date,
      absence_type,
      note
    `)
    .order("start_date", { ascending: true });

  if (error) {
    absenceList.textContent =
      "Fehler beim Laden: " + error.message;
    return;
  }

  if (!data || data.length === 0) {
    absenceList.textContent =
      "Noch keine Abwesenheiten eingetragen.";
    return;
  }

  const { data: teachers, error: teacherError } =
    await suvDb
      .from("teachers")
      .select("id, first_name, last_name");

  if (teacherError) {
    absenceList.textContent =
      "Lehrkräfte konnten nicht zugeordnet werden.";
    return;
  }

  const teacherMap = new Map(
    (teachers || []).map(teacher => [
      teacher.id,
      teacher.first_name + " " + teacher.last_name
    ])
  );

  absenceList.innerHTML = "";

  data.forEach(absence => {

    const entry = document.createElement("div");
    entry.className = "teacher-entry";

    const details = document.createElement("div");

    const name = document.createElement("strong");
    name.textContent =
      teacherMap.get(absence.teacher_id) ||
      "Unbekannte Lehrkraft";

    const dates = document.createElement("p");

    const startDate = new Date(
      absence.start_date + "T00:00:00"
    ).toLocaleDateString("de-DE");

    const endDate = new Date(
      absence.end_date + "T00:00:00"
    ).toLocaleDateString("de-DE");

    dates.textContent =
      startDate === endDate
        ? startDate
        : startDate + " bis " + endDate;

    const type = document.createElement("p");
    type.textContent = absence.absence_type;

    details.appendChild(name);
    details.appendChild(dates);
    details.appendChild(type);

    if (absence.note) {
      const note = document.createElement("p");
      note.textContent = absence.note;
      details.appendChild(note);
    }

    entry.appendChild(details);
    absenceList.appendChild(entry);

  });
}


// Neue Abwesenheit speichern

if (absenceForm) {

  absenceForm.addEventListener("submit", async event => {

    event.preventDefault();

    const teacherId = absenceTeacherSelect.value;
    const startDate =
      document.getElementById("absenceStartDate").value;
    const endDate =
      document.getElementById("absenceEndDate").value;
    const absenceType =
      document.getElementById("absenceType").value;
    const note =
      document.getElementById("absenceNote").value.trim();

    if (endDate < startDate) {
      absenceMessage.textContent =
        "Das Enddatum darf nicht vor dem Anfangsdatum liegen.";
      return;
    }

    const { data: userData, error: userError } =
      await suvDb.auth.getUser();

    if (userError || !userData.user) {
      absenceMessage.textContent =
        "Benutzer konnte nicht ermittelt werden.";
      return;
    }

    const saveButton =
      absenceForm.querySelector('button[type="submit"]');

    saveButton.disabled = true;
    saveButton.textContent = "Wird gespeichert ...";

    const { error } = await suvDb
      .from("teacher_absences")
      .insert({
        teacher_id: teacherId,
        start_date: startDate,
        end_date: endDate,
        absence_type: absenceType,
        note: note || null,
        created_by: userData.user.id
      });

    saveButton.disabled = false;
    saveButton.textContent = "Abwesenheit speichern";

    if (error) {
      absenceMessage.textContent =
        "Fehler beim Speichern: " + error.message;
      return;
    }

    absenceMessage.textContent =
      "Abwesenheit erfolgreich gespeichert.";

    absenceForm.reset();

    await loadSubstitutionAbsences();

  });

}


// Initialisierung

loadAbsenceTeachers();
loadSubstitutionAbsences();


// ==========================================
// SUV – Vertretungsplanung: Tagesauswertung
// ==========================================

const substitutionDate = document.getElementById(
  "substitutionDate"
);

const substitutionLoadDay = document.getElementById(
  "substitutionLoadDay"
);

const substitutionOpenLessons = document.getElementById(
  "substitutionOpenLessons"
);


// Tagesübersicht laden

async function loadSubstitutionDay() {

  const selectedDate = substitutionDate.value;

  if (!selectedDate) {
    substitutionOpenLessons.textContent =
      "Bitte zuerst einen Schultag auswählen.";
    return;
  }

  if (!activeTimetableVersionId) {
    substitutionOpenLessons.textContent =
      "Es ist keine aktive Stundenplanversion vorhanden.";
    return;
  }

  substitutionOpenLessons.textContent =
    "Betroffene Unterrichtsstunden werden ermittelt ...";

  // Wochentag bestimmen:
  // Montag = 1, Dienstag = 2 usw.

  const date = new Date(selectedDate + "T12:00:00");
  const weekday = date.getDay() === 0
    ? 7
    : date.getDay();

  // Abwesende Lehrkräfte für diesen Tag laden

  const { data: absences, error: absenceError } =
    await suvDb
      .from("teacher_absences")
      .select(`
        id,
        teacher_id,
        absence_type,
        note
      `)
      .lte("start_date", selectedDate)
      .gte("end_date", selectedDate);

  if (absenceError) {
    substitutionOpenLessons.textContent =
      "Abwesenheiten konnten nicht geladen werden: " +
      absenceError.message;
    return;
  }

  if (!absences || absences.length === 0) {
    substitutionOpenLessons.textContent =
      "Für diesen Tag sind keine Lehrkräfte als abwesend eingetragen.";
    return;
  }

  const absentTeacherIds = new Set(
    absences.map(item => item.teacher_id)
  );

  // Reguläre Unterrichtsstunden dieses Wochentags laden

  const { data: entries, error: entriesError } =
    await suvDb
      .from("timetable_entries")
      .select(`
        id,
        teacher_id,
        weekday,
        period_number,
        classes (
          name
        ),
        class_subjects (
          subjects (
            name,
            short_code
          )
        ),
        grade_courses (
          course_name,
          teachers (
            id,
            first_name,
            last_name,
            short_code
          ),
          grade_course_groups (
            subjects (
              name,
              short_code
            ),
            grade_course_group_classes (
              classes (
                name
              )
            )
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
      .eq("weekday", weekday)
      .order("period_number");

  if (entriesError) {
    substitutionOpenLessons.textContent =
      "Unterrichtsstunden konnten nicht geladen werden: " +
      entriesError.message;
    return;
  }

  // Nur Stunden der abwesenden Lehrkräfte behalten

  const affectedLessons = (entries || []).filter(entry => {

    const assignedTeachers =
      entry.timetable_entry_teachers || [];

    const gradeTeacher =
      entry.grade_courses?.teachers;

    return absentTeacherIds.has(entry.teacher_id) ||
      assignedTeachers.some(item =>
        absentTeacherIds.has(item.teacher_id)
      ) ||
      absentTeacherIds.has(gradeTeacher?.id);

  });

  substitutionOpenLessons.innerHTML = "";

  if (affectedLessons.length === 0) {
    substitutionOpenLessons.textContent =
      "Für die abwesenden Lehrkräfte wurden an diesem Tag keine Unterrichtsstunden gefunden.";
    return;
  }

  // Lehrkraftnamen laden

  const { data: teachers, error: teachersError } =
    await suvDb
      .from("teachers")
      .select("id, first_name, last_name, short_code");

  if (teachersError) {
    substitutionOpenLessons.textContent =
      "Lehrkraftdaten konnten nicht geladen werden.";
    return;
  }

  const teacherMap = new Map(
    (teachers || []).map(teacher => [
      teacher.id,
      teacher
    ])
  );

  // Betroffene Stunden anzeigen

  affectedLessons.forEach(entry => {

    const card = document.createElement("div");
    card.className = "teacher-entry";

    const subject =
      entry.class_subjects?.subjects ||
      entry.grade_courses?.grade_course_groups?.subjects;

    const heading = document.createElement("strong");
    heading.textContent =
      entry.period_number + ". Stunde – " +
      (
        entry.grade_courses?.course_name ||
        subject?.name ||
        subject?.short_code ||
        "Unterricht"
      );

    const teacherIds = [
      entry.teacher_id,
      ...(entry.timetable_entry_teachers || [])
        .map(item => item.teacher_id),
      entry.grade_courses?.teachers?.id
    ].filter(id =>
      id && absentTeacherIds.has(id)
    );

    const uniqueTeacherIds = [...new Set(teacherIds)];

    const teacherNames = uniqueTeacherIds.map(id => {
      const teacher = teacherMap.get(id);
      return teacher
        ? teacher.first_name + " " + teacher.last_name
        : "Unbekannte Lehrkraft";
    });

    const teacherInfo = document.createElement("p");
    teacherInfo.textContent =
      "Abwesend: " + teacherNames.join(", ");

    const classNames = [];

    if (entry.classes?.name) {
      classNames.push(entry.classes.name);
    }

    const groupClasses =
      entry.grade_courses?.grade_course_groups
        ?.grade_course_group_classes || [];

    groupClasses.forEach(item => {
      if (item.classes?.name) {
        classNames.push(item.classes.name);
      }
    });

    const classInfo = document.createElement("p");
    classInfo.textContent =
      "Klasse(n): " +
      ([...new Set(classNames)].join(", ") || "Nicht zugeordnet");

    const roomInfo = document.createElement("p");
    roomInfo.textContent =
      "Raum: " + (entry.rooms?.name || "Nicht zugeordnet");

    card.appendChild(heading);
    card.appendChild(teacherInfo);
    card.appendChild(classInfo);
    card.appendChild(roomInfo);

    substitutionOpenLessons.appendChild(card);

  });

  const summary = document.createElement("p");
  summary.textContent =
    affectedLessons.length +
    " betroffene Unterrichtseinheit(en) gefunden.";

  substitutionOpenLessons.prepend(summary);

}


// Tagesübersicht-Schaltfläche

if (substitutionLoadDay) {
  substitutionLoadDay.addEventListener(
    "click",
    loadSubstitutionDay
  );
}
