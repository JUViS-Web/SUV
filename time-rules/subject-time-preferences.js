
/* SUV – Zeitwunschmatrix für Fächer */

window.suvSubjectTimePreferences = {
  subjects: [],
  days: [],
  lessons: [],
  rules: [],
  schoolYearId: null,
  selectedSubjectId: null,
  saving: false
};

const subjectTimeStates = [
  null,
  "prefer",
  "blocked",
  "prefer_free",
  "must"
];

const subjectTimeStateInfo = {
  prefer: {
    label: "Bevorzugt",
    color: "#bbf7d0",
    text: "#166534"
  },
  blocked: {
    label: "Nicht verfügbar",
    color: "#fecaca",
    text: "#991b1b"
  },
  prefer_free: {
    label: "Möglichst vermeiden",
    color: "#fef08a",
    text: "#854d0e"
  },
  must: {
    label: "Fest eingeplant",
    color: "#bfdbfe",
    text: "#1e40af"
  }
};

async function initSubjectTimePreferences() {
  const selector = document.getElementById(
    "subjectTimePreferenceSelect"
  );

  if (!selector) return;

  const message = document.getElementById(
    "subjectTimePreferenceMessage"
  );

  message.textContent = "Zeitwunschmatrix wird geladen ...";

  const [
    subjectResult,
    dayResult,
    lessonResult,
    yearResult
  ] = await Promise.all([
    suvDb.from("subjects")
      .select("id, name, short_code, department")
      .order("name"),

    suvDb.from("school_days")
      .select("day_number, day_name")
      .eq("is_active", true)
      .order("day_number"),

    suvDb.from("lesson_times")
      .select("lesson_number, start_time, end_time")
      .order("lesson_number"),

    suvDb.from("school_years")
      .select("id")
      .eq("is_active", true)
      .limit(1)
  ]);

  const error =
    subjectResult.error ||
    dayResult.error ||
    lessonResult.error ||
    yearResult.error;

  if (error) {
    message.textContent =
      "Fehler beim Laden: " + error.message;
    return;
  }

  const state = window.suvSubjectTimePreferences;

  state.subjects = subjectResult.data || [];
  state.days = dayResult.data || [];
  state.lessons = lessonResult.data || [];
  state.schoolYearId = yearResult.data?.[0]?.id || null;

  if (!state.schoolYearId) {
    message.textContent =
      "Es ist kein aktives Schuljahr vorhanden.";
    return;
  }

  selector.innerHTML =
    '<option value="">Fach auswählen ...</option>';

  state.subjects.forEach(subject => {
    const option = document.createElement("option");
    option.value = subject.id;

    option.textContent =
      subject.name +
      (subject.short_code
        ? ` (${subject.short_code})`
        : "");

    selector.appendChild(option);
  });

  if (!state.days.length || !state.lessons.length) {
    message.textContent =
      "Bitte zuerst Wochentage und Unterrichtsstunden " +
      "im Zeitmodell einrichten.";
    return;
  }

  selector.addEventListener("change", async () => {
    state.selectedSubjectId = selector.value || null;
    await loadSubjectTimeRules();
  });

  message.textContent = "Bitte ein Fach auswählen.";
}

async function loadSubjectTimeRules() {
  const state = window.suvSubjectTimePreferences;

  const container = document.getElementById(
    "subjectTimePreferenceMatrix"
  );

  const message = document.getElementById(
    "subjectTimePreferenceMessage"
  );

  if (!state.selectedSubjectId) {
    container.textContent =
      "Bitte zuerst ein Fach auswählen.";
    return;
  }

  container.textContent = "Zeitwünsche werden geladen ...";
  message.textContent = "";

  const { data, error } = await suvDb
    .from("time_rules")
    .select(
      "id, rule_type, weekday, period_from, period_to, priority, reason"
    )
    .eq("subject_id", state.selectedSubjectId)
    .eq("school_year_id", state.schoolYearId);

  if (error) {
    container.textContent =
      "Fehler beim Laden: " + error.message;
    return;
  }

  state.rules = data || [];
  renderSubjectTimePreferenceMatrix();
}

function renderSubjectTimePreferenceMatrix() {
  const state = window.suvSubjectTimePreferences;

  const container = document.getElementById(
    "subjectTimePreferenceMatrix"
  );

  container.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.style.cssText = `
    width:100%;
    overflow-x:auto;
    -webkit-overflow-scrolling:touch;
  `;

  const table = document.createElement("table");
  table.style.cssText = `
    width:100%;
    min-width:520px;
    border-collapse:separate;
    border-spacing:4px;
    font-size:13px;
  `;

  const thead = document.createElement("thead");
  const header = document.createElement("tr");

  const firstHeading = document.createElement("th");
  firstHeading.textContent = "Wochentag";
  firstHeading.style.cssText =
    "text-align:left;padding:8px;";
  header.appendChild(firstHeading);

  state.lessons.forEach(lesson => {
    const th = document.createElement("th");
    th.textContent = lesson.lesson_number;
    th.style.cssText =
      "padding:8px;text-align:center;min-width:42px;";
    header.appendChild(th);
  });

  thead.appendChild(header);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  state.days.forEach(day => {
    const row = document.createElement("tr");

    const dayCell = document.createElement("th");
    dayCell.textContent = day.day_name;
    dayCell.style.cssText =
      "text-align:left;padding:8px;white-space:nowrap;";
    row.appendChild(dayCell);

    state.lessons.forEach(lesson => {
      const cell = document.createElement("td");

      const matchingRules = state.rules.filter(rule =>
        rule.weekday === day.day_number &&
        rule.period_from <= lesson.lesson_number &&
        rule.period_to >= lesson.lesson_number
      );

      const exactRule = matchingRules.find(rule =>
        rule.period_from === lesson.lesson_number &&
        rule.period_to === lesson.lesson_number
      );

      const rangeRule = matchingRules.find(rule =>
        rule.period_from !== rule.period_to
      );

      const rule = exactRule || rangeRule;
      const currentType = rule?.rule_type || null;
      const info = subjectTimeStateInfo[currentType];

      const button = document.createElement("button");
      button.type = "button";

      button.dataset.day = day.day_number;
      button.dataset.lesson = lesson.lesson_number;

      button.textContent = info ? "●" : "–";
      button.title =
        `${day.day_name}, Stunde ${lesson.lesson_number}: ` +
        (info ? info.label : "Keine Vorgabe");

      button.setAttribute("aria-label", button.title);

      button.style.cssText = `
        width:100%;
        min-width:38px;
        min-height:42px;
        border:1px solid #cbd5e1;
        border-radius:7px;
        font-size:18px;
        font-weight:700;
        cursor:pointer;
        background:${info ? info.color : "#f1f5f9"};
        color:${info ? info.text : "#64748b"};
        touch-action:manipulation;
      `;

      button.addEventListener("click", async () => {
        if (state.saving) return;

        const currentRules = state.rules.filter(rule =>
          rule.weekday === day.day_number &&
          rule.period_from <= lesson.lesson_number &&
          rule.period_to >= lesson.lesson_number
        );

        const exact = currentRules.find(rule =>
          rule.period_from === lesson.lesson_number &&
          rule.period_to === lesson.lesson_number
        );

        const range = currentRules.find(rule =>
          rule.period_from !== rule.period_to
        );

        if (range) {
          document.getElementById(
            "subjectTimePreferenceMessage"
          ).textContent =
            "Diese Zelle gehört zu einer mehrstündigen Zeitregel.";
          return;
        }

        const currentType = exact?.rule_type || null;
        const currentIndex =
          subjectTimeStates.indexOf(currentType);

        const nextType =
          subjectTimeStates[
            (currentIndex + 1) % subjectTimeStates.length
          ];

        await saveSubjectTimeCell(
          day.day_number,
          lesson.lesson_number,
          nextType,
          exact
        );
      });

      cell.appendChild(button);
      row.appendChild(cell);
    });

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  wrapper.appendChild(table);
  container.appendChild(wrapper);
}

async function saveSubjectTimeCell(
  weekday,
  lessonNumber,
  ruleType,
  existingRule
) {
  const state = window.suvSubjectTimePreferences;

  const message = document.getElementById(
    "subjectTimePreferenceMessage"
  );

  state.saving = true;
  message.textContent = "Speichere ...";

  let result;
  let savedRule = null;

  if (ruleType === null) {
    if (existingRule) {
      result = await suvDb
        .from("time_rules")
        .delete()
        .eq("id", existingRule.id);
    }
  } else {
    const priority =
      ruleType === "blocked" || ruleType === "must" ? 3 :
      ruleType === "prefer_free" ? 2 : 1;

    const ruleData = {
      school_year_id: state.schoolYearId,
      subject_id: state.selectedSubjectId,
      rule_type: ruleType,
      weekday,
      period_from: lessonNumber,
      period_to: lessonNumber,
      priority,
      reason: null
    };

    if (existingRule) {
      result = await suvDb
        .from("time_rules")
        .update(ruleData)
        .eq("id", existingRule.id)
        .select()
        .single();
    } else {
      result = await suvDb
        .from("time_rules")
        .insert(ruleData)
        .select()
        .single();
    }

    if (!result.error) {
      savedRule = result.data;
    }
  }

  state.saving = false;

  if (result?.error) {
    message.textContent =
      "Speicherfehler: " + result.error.message;
    return;
  }

  if (ruleType === null) {
    state.rules = state.rules.filter(rule =>
      rule.id !== existingRule?.id
    );
  } else if (existingRule) {
    state.rules = state.rules.map(rule =>
      rule.id === existingRule.id ? savedRule : rule
    );
  } else {
    state.rules.push(savedRule);
  }

  updateSubjectTimeCellButton(
    weekday,
    lessonNumber,
    ruleType
  );

  message.textContent = "Zeitwunsch gespeichert.";
}

function updateSubjectTimeCellButton(
  weekday,
  lessonNumber,
  ruleType
) {
  const button = document.querySelector(
    `#subjectTimePreferenceMatrix button[data-day="${weekday}"][data-lesson="${lessonNumber}"]`
  );

  if (!button) return;

  const info = subjectTimeStateInfo[ruleType];

  button.textContent = info ? "●" : "–";
  button.title = info ? info.label : "Keine Vorgabe";
  button.setAttribute("aria-label", button.title);

  button.style.background =
    info ? info.color : "#f1f5f9";

  button.style.color =
    info ? info.text : "#64748b";
}

initSubjectTimePreferences();

