// SUV – Supabase-Verbindung

const { createClient } = supabase;

const suvDb = createClient(
  window.SUV_CONFIG.SUPABASE_URL,
  window.SUV_CONFIG.SUPABASE_KEY
);

console.log("SUV: Supabase-Verbindung initialisiert.");
document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", () => {
    const pageId = button.dataset.page;

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

    const title = button.textContent.trim();
    document.getElementById("pageTitle").textContent = title;
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

        // SUV – Benutzerrolle erkennen

    const allowedRoles = [
      "administrator",
      "planner",
      "teacher"
    ];

    if (!allowedRoles.includes(profile.role)) {
      throw new Error("Ungültige Benutzerrolle: " + profile.role);
    }

    // Benutzerinformationen anzeigen

    document.querySelector(".user-avatar").textContent =
      (profile.first_name || "U").charAt(0).toUpperCase();

    const userArea = document.querySelector(".user-area");

    userArea.querySelector("strong").textContent =
      [profile.first_name, profile.last_name]
        .filter(Boolean)
        .join(" ") || "Benutzer";

    const roleNames = {
      administrator: "Administrator",
      planner: "Stundenplaner",
      teacher: "Lehrkraft"
    };

    userArea.querySelector("span").textContent =
      roleNames[profile.role];

  } catch (error) {
    loginMessage.textContent = error.message;
    loginMessage.style.color = "#b42318";
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Anmelden";
  }
});

// Vorhandene Anmeldung überprüfen

async function checkSUVLogin() {
  const { data, error } = await suvDb.auth.getSession();

  if (error) {
    loginMessage.textContent = error.message;
    return;
  }

  if (data.session) {
    loginScreen.style.display = "none";
  }
}

checkSUVLogin();
