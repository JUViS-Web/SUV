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
