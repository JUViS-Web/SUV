
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

const prioritySelect = document.createElement("select");

[
  { value: 1, label: "1 – Niedrig" },
  { value: 2, label: "2 – Mittel" },
  { value: 3, label: "3 – Hoch" }
].forEach(item => {
  const option = document.createElement("option");
  option.value = item.value;
  option.textContent = item.label;

  prioritySelect.appendChild(option);
});

prioritySelect.value = String(rule.priority);

prioritySelect.addEventListener("change", () => {
  updatePlanningRulePriority(
    rule.id,
    prioritySelect.value
  );
});

priorityCell.appendChild(prioritySelect);

    const descriptionCell = document.createElement("td");

const descriptionInput = document.createElement("textarea");
descriptionInput.value = rule.description || "";
descriptionInput.rows = 3;
descriptionInput.placeholder = "Regelbeschreibung eingeben ...";
descriptionInput.style.minWidth = "220px";
descriptionInput.style.width = "100%";

const saveDescriptionButton =
  document.createElement("button");

saveDescriptionButton.type = "button";
saveDescriptionButton.textContent = "Speichern";

saveDescriptionButton.addEventListener("click", () => {
  updatePlanningRuleDescription(
    rule.id,
    descriptionInput.value
  );
});

descriptionCell.append(
  descriptionInput,
  saveDescriptionButton
);

    const valueCell = document.createElement("td");

if (rule.rule_code === "class_daily_target_periods") {
  const targetInput = document.createElement("input");
  targetInput.type = "number";
  targetInput.min = "1";
  targetInput.max = "10";
  targetInput.value = rule.rule_value.target ?? 6;
  targetInput.style.width = "75px";

  const minimumInput = document.createElement("input");
  minimumInput.type = "number";
  minimumInput.min = "1";
  minimumInput.max = "10";
  minimumInput.value =
    rule.rule_value.acceptable_minimum ?? 5;
  minimumInput.style.width = "75px";

  const targetLabel = document.createElement("label");
  targetLabel.textContent = "Tagesziel: ";
  targetLabel.appendChild(targetInput);

  const minimumLabel = document.createElement("label");
  minimumLabel.textContent = " Mindestzahl: ";
  minimumLabel.appendChild(minimumInput);

  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.textContent = "Speichern";

  saveButton.addEventListener("click", () => {
    updateDailyTargetRule(
      rule.id,
      targetInput.value,
      minimumInput.value
    );
  });

  valueCell.append(
    targetLabel,
    minimumLabel,
    saveButton
  );
} else {
  const valueDetails = document.createElement("details");
  const valueSummary = document.createElement("summary");

  valueSummary.textContent = "Werte anzeigen";

  const valueContent = document.createElement("pre");
  valueContent.textContent =
    JSON.stringify(rule.rule_value, null, 2);

  valueDetails.append(valueSummary, valueContent);
  valueCell.appendChild(valueDetails);
}

    const statusCell = document.createElement("td");

const statusText = document.createElement("span");
statusText.textContent =
  rule.is_active ? "Aktiv" : "Inaktiv";

const statusButton = document.createElement("button");
statusButton.type = "button";
statusButton.textContent =
  rule.is_active ? "Deaktivieren" : "Aktivieren";

statusButton.addEventListener("click", () => {
  togglePlanningRule(rule.id, !rule.is_active);
});

statusCell.append(statusText, statusButton);

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

// Priorität einer Planungsregel ändern

async function updatePlanningRulePriority(ruleId, newPriority) {
  const priority = Number(newPriority);

  if (![1, 2, 3].includes(priority)) {
    planningRulesMessage.textContent =
      "Ungültige Priorität.";
    return;
  }

  planningRulesMessage.textContent =
    "Priorität wird gespeichert ...";

  const { error } = await suvDb
    .from("planning_rules")
    .update({
      priority: priority,
      updated_at: new Date().toISOString()
    })
    .eq("id", ruleId);

  if (error) {
    planningRulesMessage.textContent =
      "Fehler beim Speichern der Priorität: " +
      error.message;
    return;
  }

  await loadPlanningRules();
}

// Beschreibung einer Planungsregel ändern

async function updatePlanningRuleDescription(ruleId, newDescription) {
  planningRulesMessage.textContent =
    "Beschreibung wird gespeichert ...";

  const { error } = await suvDb
    .from("planning_rules")
    .update({
      description: newDescription.trim() || null,
      updated_at: new Date().toISOString()
    })
    .eq("id", ruleId);

  if (error) {
    planningRulesMessage.textContent =
      "Fehler beim Speichern der Beschreibung: " +
      error.message;
    return;
  }

  planningRulesMessage.textContent =
    "Beschreibung erfolgreich gespeichert.";
}

// Tagesziel der Unterrichtsstunden bearbeiten

async function updateDailyTargetRule(ruleId, target, minimum) {
  const targetValue = Number(target);
  const minimumValue = Number(minimum);

  if (
    !Number.isInteger(targetValue) ||
    !Number.isInteger(minimumValue) ||
    targetValue < 1 ||
    minimumValue < 1 ||
    minimumValue > targetValue
  ) {
    planningRulesMessage.textContent =
      "Ungültige Stundenwerte. Bitte Eingaben prüfen.";
    return;
  }

  planningRulesMessage.textContent =
    "Tagesstunden werden gespeichert ...";

  const { error } = await suvDb
    .from("planning_rules")
    .update({
      rule_value: {
        target: targetValue,
        acceptable_minimum: minimumValue,
        ganztag_periods_excluded: true
      },
      updated_at: new Date().toISOString()
    })
    .eq("id", ruleId);

  if (error) {
    planningRulesMessage.textContent =
      "Fehler beim Speichern: " + error.message;
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
