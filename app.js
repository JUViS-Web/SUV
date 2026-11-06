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
    subjectList.textContent =
      "Fehler beim Laden: " + error.message;
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
      <p>${room.equipment || "Keine Ausstattung angegeben"}</p>
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
  document.getElementById("roomEquipment").value = room.equipment || "";
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
      capacity: Number(document.getElementById("roomCapacity").value),
      equipment:
        document.getElementById("roomEquipment").value.trim() || null,
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
