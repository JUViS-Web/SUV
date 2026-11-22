
// SUV – Automatische Planung
// Schuljahre und Jahrgänge laden

const autoPlanningSchoolYear =
  document.getElementById("autoPlanningSchoolYear");

const autoPlanningGrade =
  document.getElementById("autoPlanningGrade");

const autoPlanningMessage =
  document.getElementById("autoPlanningMessage");

let automaticPlanningLoaded = false;


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
}


// Schuljahr geändert

autoPlanningSchoolYear.addEventListener(
  "change",
  loadAutoPlanningGrades
);


// Jahrgang ausgewählt

autoPlanningGrade.addEventListener("change", () => {
  if (!autoPlanningGrade.value) {
    autoPlanningMessage.textContent =
      "Bitte einen Jahrgang auswählen.";
    return;
  }

  autoPlanningMessage.textContent =
    "Ausgewählter Jahrgang: " +
    autoPlanningGrade.options[
      autoPlanningGrade.selectedIndex
    ].textContent +
    ". Die Unterrichtsvorgaben werden im nächsten Schritt ergänzt.";
});


// Automatische Planung öffnen

document
  .querySelector('[data-page="automaticPlanning"]')
  .addEventListener("click", async () => {

    if (automaticPlanningLoaded) return;

    const { data } = await suvDb.auth.getSession();

    if (!data.session) return;

    await loadAutoPlanningSchoolYears();

    automaticPlanningLoaded = true;
  });
