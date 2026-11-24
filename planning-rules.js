
// SUV – Verwaltung der allgemeinen Planungsregeln

const planningRulesSchoolYear =
  document.getElementById("planningRulesSchoolYear");

const planningRulesMessage =
  document.getElementById("planningRulesMessage");

const planningRulesList =
  document.getElementById("planningRulesList");


// Schuljahre laden

async function loadPlanningRulesSchoolYears() {
  planningRulesMessage.textContent =
    "Schuljahre werden geladen ...";

  const { data, error } = await suvDb
    .from("school_years")
    .select("id, name, is_active, start_date")
    .order("start_date", { ascending: false });

  if (error) {
    planningRulesMessage.textContent =
      "Fehler beim Laden der Schuljahre: " + error.message;
    return;
  }

  planningRulesSchoolYear.innerHTML =
    '<option value="">Schuljahr auswählen</option>';

  (data || []).forEach(year => {
    const option = document.createElement("option");

    option.value = year.id;
    option.textContent =
      year.name + (year.is_active ? " (Aktuell)" : "");

    planningRulesSchoolYear.appendChild(option);
  });

  const activeYear = (data || []).find(year => year.is_active);

  if (activeYear) {
    planningRulesSchoolYear.value = activeYear.id;
    await loadPlanningRules();
  } else {
    planningRulesMessage.textContent =
      "Bitte ein Schuljahr auswählen.";
  }
}


// Regeln des ausgewählten Schuljahres laden

async function loadPlanningRules() {
  const schoolYearId = planningRulesSchoolYear.value;

  planningRulesList.innerHTML = "";
  
  if (!schoolYearId) {
    planningRulesList.textContent =
      "Bitte zuerst ein Schuljahr auswählen.";
    return;
  }

  planningRulesMessage.textContent =
    "Planungsregeln werden geladen ...";

  const { data, error } = await suvDb
    .from("planning_rules")
    .select(`
      id,
      rule_code,
      scope_type,
      rule_value,
      rule_strength,
      priority,
      is_active,
      description
    `)
    .eq("school_year_id", schoolYearId)
    .order("priority", { ascending: false })
    .order("rule_code");

  if (error) {
    planningRulesMessage.textContent =
      "Fehler beim Laden der Planungsregeln: " +
      error.message;
    return;
  }

  if (!data || data.length === 0) {
    planningRulesList.textContent =
      "Für dieses Schuljahr sind noch keine Regeln hinterlegt.";

    planningRulesMessage.textContent =
      "Keine Planungsregeln gefunden.";
    return;
  }

  const table = document.createElement("table");
  table.className = "data-table";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  [
    "Regel",
    "Regeltyp",
    "Priorität",
    "Beschreibung",
    "Konfiguration",
    "Status"
  ].forEach(label => {
    const th = document.createElement("th");
    th.textContent = label;
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);

  const tbody = document.createElement("tbody");

  data.forEach(rule => {
    const row = document.createElement("tr");

    const codeCell = document.createElement("td");
    codeCell.textContent = rule.rule_code;

    const strengthCell = document.createElement("td");
    strengthCell.textContent =
      rule.rule_strength === "hard"
        ? "Verbindlich"
        : "Optimierung";

    const priorityCell = document.createElement("td");
    priorityCell.textContent = rule.priority;

    const descriptionCell = document.createElement("td");
    descriptionCell.textContent =
      rule.description || "Keine Beschreibung";

    const valueCell = document.createElement("td");
    const valueDetails = document.createElement("details");
    const valueSummary = document.createElement("summary");

    valueSummary.textContent = "Werte anzeigen";

    const valueContent = document.createElement("pre");
    valueContent.textContent =
      JSON.stringify(rule.rule_value, null, 2);

    valueDetails.append(valueSummary, valueContent);
    valueCell.appendChild(valueDetails);

    const statusCell = document.createElement("td");
    statusCell.textContent =
      rule.is_active ? "Aktiv" : "Inaktiv";

    row.append(
      codeCell,
      strengthCell,
      priorityCell,
      descriptionCell,
      valueCell,
      statusCell
    );

    tbody.appendChild(row);
  });

  table.append(thead, tbody);
  planningRulesList.appendChild(table);

  planningRulesMessage.textContent =
    data.length + " Planungsregeln erfolgreich geladen.";
}

// Planungsregel aktivieren oder deaktivieren

async function togglePlanningRule(ruleId, newStatus) {
  planningRulesMessage.textContent =
    "Regelstatus wird gespeichert ...";

  const { error } = await suvDb
    .from("planning_rules")
    .update({
      is_active: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq("id", ruleId);

  if (error) {
    planningRulesMessage.textContent =
      "Fehler beim Ändern des Regelstatus: " +
      error.message;
    return;
  }

  await loadPlanningRules();
}

// Schuljahr wechseln

planningRulesSchoolYear.addEventListener(
  "change",
  loadPlanningRules
);


// Initialisierung

loadPlanningRulesSchoolYears();
