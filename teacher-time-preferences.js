
/* SUV – Zeitwunschmatrix für Lehrkräfte */

window.suvTeacherTimePreferences = {
  teachers: [],
  days: [],
  lessons: [],
  rules: [],
  schoolYearId: null,
  selectedTeacherId: null,
  saving: false
};

const teacherTimeStates = [
  null,
  "prefer",
  "blocked",
  "prefer_free",
  "must"
];

const teacherTimeStateInfo = {
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

function teacherTimeCellKey(day, lesson) {
  return `${day}_${lesson}`;
}

async function initTeacherTimePreferences() {
  const selector = document.getElementById(
    "teacherTimePreferenceSelect"
  );

  if (!selector) return;

  const message = document.getElementById(
    "teacherTimePreferenceMessage"
  );

  message.textContent = "Zeitwunschmatrix wird geladen ...";

  const [teacherResult, dayResult, lessonResult, yearResult] =
    await Promise.all([
      suvDb.from("teachers")
        .select("id, first_name, last_name, short_code")
        .eq("is_active", true)
        .order("last_name"),

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
    teacherResult.error ||
    dayResult.error ||
    lessonResult.error ||
    yearResult.error;

  if (error) {
    message.textContent =
      "Fehler beim Laden: " + error.message;
    return;
  }

  const state = window.suvTeacherTimePreferences;

  state.teachers = teacherResult.data || [];
  state.days = dayResult.data || [];
  state.lessons = lessonResult.data || [];
  state.schoolYearId = yearResult.data?.[0]?.id || null;

  if (!state.schoolYearId) {
    message.textContent =
      "Es ist kein aktives Schuljahr vorhanden.";
    return;
  }

  selector.innerHTML =
    '<option value="">Lehrkraft auswählen ...</option>';

  state.teachers.forEach(teacher => {
    const option = document.createElement("option");
    option.value = teacher.id;
    option.textContent =
      `${teacher.last_name}, ${teacher.first_name}` +
      (teacher.short_code ? ` (${teacher.short_code})` : "");

    selector.appendChild(option);
  });

  if (!state.days.length || !state.lessons.length) {
    message.textContent =
      "Bitte zuerst Wochentage und Unterrichtsstunden " +
      "im Zeitmodell einrichten.";
    return;
  }

  selector.addEventListener(
    "change",
    async () => {
      state.selectedTeacherId = selector.value || null;
      await loadTeacherTimeRules();
    }
  );

  message.textContent =
    "Bitte eine Lehrkraft auswählen.";
}

async function loadTeacherTimeRules() {
  const state = window.suvTeacherTimePreferences;
  const container = document.getElementById(
    "teacherTimePreferenceMatrix"
  );
  const message = document.getElementById(
    "teacherTimePreferenceMessage"
  );

  if (!state.selectedTeacherId) {
    container.textContent =
      "Bitte zuerst eine Lehrkraft auswählen.";
    return;
  }

  container.textContent = "Zeitwünsche werden geladen ...";
  message.textContent = "";

  const { data, error } = await suvDb
    .from("time_rules")
    .select(
      "id, rule_type, weekday, period_from, period_to, priority, reason"
    )
    .eq("teacher_id", state.selectedTeacherId)
    .eq("school_year_id", state.schoolYearId);

  if (error) {
    container.textContent =
      "Fehler beim Laden: " + error.message;
    return;
  }

  state.rules = data || [];
  renderTeacherTimePreferenceMatrix();
}

function renderTeacherTimePreferenceMatrix() {
  const state = window.suvTeacherTimePreferences;
  const container = document.getElementById(
    "teacherTimePreferenceMatrix"
  );

  container.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.style.cssText = `
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  `;

  const table = document.createElement("table");
  table.style.cssText = `
    width: 100%;
    min-width: 520px;
    border-collapse: separate;
    border-spacing: 4px;
    font-size: 13px;
  `;

  const thead = document.createElement("thead");
  const header = document.createElement("tr");

  const firstHeading = document.createElement("th");
  firstHeading.textContent = "Wochentag";
  firstHeading.style.cssText =
    "text-align:left; padding:8px;";
  header.appendChild(firstHeading);

  state.lessons.forEach(lesson => {
    const th = document.createElement("th");
    th.textContent = lesson.lesson_number;
    th.style.cssText =
      "padding:8px; text-align:center; min-width:42px;";
    header.appendChild(th);
  });

  thead.appendChild(header);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  state.days.forEach(day => {
    const row = document.createElement("tr");

    const dayCell = document.createElement("th");
    dayCell.textContent = day.day_name;
    dayCell.style.cssText = `
      text-align:left;
      padding:8px;
      white-space:nowrap;
    `;
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
      const info = teacherTimeStateInfo[currentType];

      const button = document.createElement("button");
      button.type = "button";

      button.textContent = info ? "●" : "–";
      button.title =
        `${day.day_name}, Stunde ${lesson.lesson_number}: ` +
        (info ? info.label : "Keine Vorgabe");

      button.setAttribute(
        "aria-label",
        button.title
      );

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

        if (rangeRule) {
          document.getElementById(
            "teacherTimePreferenceMessage"
          ).textContent =
            "Diese Zelle gehört zu einer bestehenden " +
            "mehrstündigen Zeitregel. Bitte diese Regel " +
            "zunächst separat bearbeiten.";

          return;
        }

        const currentIndex =
          teacherTimeStates.indexOf(currentType);

        const nextIndex =
          (currentIndex + 1) % teacherTimeStates.length;

        const nextType = teacherTimeStates[nextIndex];

        await saveTeacherTimeCell(
          day.day_number,
          lesson.lesson_number,
          nextType,
          exactRule
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

async function saveTeacherTimeCell(
  weekday,
  lessonNumber,
  ruleType,
  existingRule
) {
  const state = window.suvTeacherTimePreferences;
  const message = document.getElementById(
    "teacherTimePreferenceMessage"
  );

  state.saving = true;
  message.textContent = "Zeitwunsch wird gespeichert ...";

  let result;

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
      teacher_id: state.selectedTeacherId,
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
        .eq("id", existingRule.id);
    } else {
      result = await suvDb
        .from("time_rules")
        .insert(ruleData);
    }
  }

  state.saving = false;

  if (result?.error) {
    message.textContent =
      "Speicherfehler: " + result.error.message;
    return;
  }

  await loadTeacherTimeRules();

  message.textContent =
    "Zeitwunsch erfolgreich gespeichert.";
}

initTeacherTimePreferences();
