
/* SUV – Automatische Stundenplanung
   Modul: Planungsdaten laden und vorbereiten */

window.suvAutoPlanningEngine = {
  data: null
};


async function loadAutoPlanningEngineData(
  schoolYearId,
  gradeLevelId
) {
  if (!schoolYearId || !gradeLevelId) {
    throw new Error(
      "Schuljahr oder Jahrgang fehlt."
    );
  }

  const [
    daysResult,
    timesResult,
    roomsResult,
    rulesResult,
    timeRulesResult,
    demandResult
  ] = await Promise.all([
    suvDb
      .from("school_days")
      .select("id, day_number, day_name, is_active")
      .eq("is_active", true)
      .order("day_number"),

    suvDb
      .from("lesson_times")
      .select(
        "id, lesson_number, start_time, end_time"
      )
      .order("lesson_number"),

    suvDb
      .from("rooms")
      .select(
        "id, name, room_type, capacity, equipment"
      )
      .eq("is_active", true)
      .order("name"),

    suvDb
      .from("planning_rules")
      .select(
      "id, rule_code, scope_type, grade_level_id, class_id, teacher_id, subject_id, room_id, rule_value, rule_strength, priority"
)
      .eq("school_year_id", schoolYearId)
      .eq("is_active", true)
      .order("priority"),

    suvDb
      .from("time_rules")
      .select(
      "id, teacher_id, class_id, room_id, subject_id, rule_type, weekday, period_from, period_to, reason, priority"
)
      .eq("school_year_id", schoolYearId),

    loadPlanningDemandData(
      schoolYearId,
      gradeLevelId
    )
  ]);

  const results = [
    daysResult,
    timesResult,
    roomsResult,
    rulesResult,
    timeRulesResult
  ];

  const failedResult = results.find(
    result => result.error
  );

  if (failedResult) {
    throw failedResult.error;
  }

  const classIds = demandResult.classes.map(
    item => item.id
  );

  let classTeachers = [];

  if (classIds.length > 0) {
    const { data, error } = await suvDb
      .from("class_teachers")
      .select("class_id, teacher_id")
      .in("class_id", classIds);

    if (error) throw error;

    classTeachers = data || [];
  }

  const subjectIds = [
    ...new Set(
      demandResult.demand.map(
        item => item.subjectId
      )
    )
  ];

  let subjects = [];

  if (subjectIds.length > 0) {
    const { data, error } = await suvDb
      .from("subjects")
      .select(
        "id, name, short_code, department, required_room_type"
      )
      .in("id", subjectIds);

    if (error) throw error;

    subjects = data || [];
  }

  const teacherData =
    window.suvPlanningTeacherData || {
      teachers: [],
      assignments: []
    };

  const engineData = {
    schoolYearId,
    gradeLevelId,

    schoolDays: daysResult.data || [],
    lessonTimes: timesResult.data || [],
    rooms: roomsResult.data || [],

    planningRules: rulesResult.data || [],
    timeRules: timeRulesResult.data || [],

        classes: demandResult.classes,
    demand: demandResult.demand,

    requirements: demandResult.requirements,
    regularBlocks: demandResult.regularBlocks,

    offerings: demandResult.offerings,
    classLinks: demandResult.classLinks,
    courseGroups: demandResult.groups,
    trackBlocks: demandResult.trackBlocks,

    subjects,

    classTeachers,

    teachers: teacherData.teachers,
    teacherSubjects: teacherData.assignments
  };

  window.suvAutoPlanningEngine.data =
    engineData;

  return engineData;
}

// Unterrichtsbedarfe in planbare Blöcke umwandeln

function buildAutoPlanningBlocks(data) {
  const blocks = [];

  // Reguläre Unterrichtsblöcke
  for (const classItem of data.classes) {
    for (const requirement of data.requirements) {
      const subject = data.subjects.find(
        item => item.id === requirement.subject_id
      );

      const replacedByTrack = data.classLinks.some(
        link =>
          link.class_id === classItem.id &&
          data.courseGroups.some(
            group =>
              group.offering_id ===
                link.grade_course_offering_id &&
              group.subject_id === requirement.subject_id
          )
      );

      if (replacedByTrack) {
        continue;
      }
       
      const matchingBlocks = data.regularBlocks
        .filter(
          block =>
            block.grade_subject_requirement_id ===
            requirement.id
        )
        .sort(
          (a, b) => a.block_number - b.block_number
        );

      for (const block of matchingBlocks) {
        blocks.push({
          type: "regular",
          classId: classItem.id,
          className: classItem.name,
          subjectId: requirement.subject_id,
          subjectName: subject?.name || "Unbekannt",
          blockNumber: block.block_number,
          periodsCount: block.periods_count
        });
      }
    }
  }

   // Schienenunterricht als gemeinsame Zeitblöcke
  for (const offering of data.offerings) {
    const participatingClasses = data.classLinks
      .filter(
        link =>
          link.grade_course_offering_id === offering.id
      )
      .map(link =>
        data.classes.find(
          item => item.id === link.class_id
        )
      )
      .filter(Boolean);
     
    if (participatingClasses.length === 0) {
      continue;
    }
     
    const matchingBlocks = data.trackBlocks
      .filter(
        block =>
          block.grade_course_offering_id === offering.id
      )
      .sort(
        (a, b) => a.block_number - b.block_number
      );

    const groups = data.courseGroups
      .filter(
        group => group.offering_id === offering.id
      )
      .map(group => {
        const subject = data.subjects.find(
          item => item.id === group.subject_id
        );

                const courseCount = Number(
          group.course_count || 0
        );

        return {
          subjectId: group.subject_id,
          subjectName: subject?.name || "Unbekannt",
          courseCount,
          weeklyPeriods: Number(
            group.weekly_periods || 0
          ),

          courses: Array.from(
            { length: courseCount },
            (_, index) => ({
              courseNumber: index + 1,
              teacherId: null,
              roomId: null
            })
          )
        };
      });

    for (const block of matchingBlocks) {
      blocks.push({
        type: "track",
        offeringId: offering.id,
        offeringName: offering.offering_name,

        participatingClassIds:
          participatingClasses.map(item => item.id),

        participatingClassNames:
          participatingClasses.map(item => item.name),

        blockNumber: block.block_number,
        periodsCount: block.periods_count,

        parallelGroups: groups
      });
    }
  }

  return blocks;
}

// Testfunktion für die Planungsengine

document
  .getElementById("autoPlanningEngineTestButton")
  .addEventListener("click", async () => {
    const button = document.getElementById(
      "autoPlanningEngineTestButton"
    );

    const result = document.getElementById(
      "autoPlanningEngineTestResult"
    );

    const schoolYearId =
      document.getElementById(
        "autoPlanningSchoolYear"
      ).value;

    const gradeLevelId =
      document.getElementById(
        "autoPlanningGrade"
      ).value;

    if (!schoolYearId || !gradeLevelId) {
      result.textContent =
        "Bitte zuerst ein Schuljahr und einen Jahrgang auswählen.";
      return;
    }

    button.disabled = true;
    button.textContent = "Planungsdaten werden geladen ...";
    result.textContent = "";

    try {
            const data = await loadAutoPlanningEngineData(
        schoolYearId,
        gradeLevelId
      );

      const blocks = buildAutoPlanningBlocks(data);

      const regularBlockCount = blocks.filter(
        item => item.type === "regular"
      ).length;

      const trackBlockCount = blocks.filter(
        item => item.type === "track"
      ).length;

      const totalBlockPeriods = blocks.reduce(
        (sum, item) =>
          sum + Number(item.periodsCount || 0),
        0
      );

      const invalidBlocks = blocks.filter(
        item =>
          !item.periodsCount ||
          item.periodsCount < 1 ||
          !Number.isInteger(Number(item.periodsCount))
      ).length;

      const totalTrackCourses = blocks
        .filter(item => item.type === "track")
        .reduce(
          (sum, block) =>
            sum +
            block.parallelGroups.reduce(
              (groupSum, group) =>
                groupSum + group.courses.length,
              0
            ),
          0
        );

      const invalidTrackGroups = blocks
        .filter(item => item.type === "track")
        .reduce(
          (sum, block) =>
            sum +
            block.parallelGroups.filter(
              group =>
                group.courseCount < 1 ||
                !Number.isInteger(group.courseCount) ||
                group.courses.length !== group.courseCount
            ).length,
          0
        );
       
      result.innerHTML = "";

      const heading = document.createElement("h4");
      heading.textContent =
        "Planungsdaten erfolgreich geladen";

      const list = document.createElement("ul");

      const entries = [
        ["Unterrichtstage", data.schoolDays.length],
        ["Unterrichtszeiten", data.lessonTimes.length],
        ["Aktive Räume", data.rooms.length],
        ["Planungsregeln", data.planningRules.length],
        ["Zeitregeln", data.timeRules.length],
        ["Klassen", data.classes.length],
        ["Fachbedarfe", data.demand.length],
        ["Fächer", data.subjects.length],
        ["Klassenlehrkraft-Zuordnungen", data.classTeachers.length],
        ["Lehrkräfte", data.teachers.length],
        ["Fachqualifikationen", data.teacherSubjects.length],
        ["Reguläre Unterrichtsblöcke", regularBlockCount],
        ["Gemeinsame Schienenblöcke", trackBlockCount],
        ["Einzelne Schienenkurse", totalTrackCourses],
        ["Fehlerhafte Kursgruppen", invalidTrackGroups],
        ["Unterrichtsstunden in allen Blöcken", totalBlockPeriods],
        ["Fehlerhafte Blockgrößen", invalidBlocks]
      ];

      entries.forEach(([label, count]) => {
        const item = document.createElement("li");
        item.textContent = label + ": " + count;
        list.appendChild(item);
      });

      result.append(heading, list);

    } catch (error) {
      result.textContent =
        "Fehler beim Laden der Planungsdaten: " +
        error.message;
    } finally {
      button.disabled = false;
      button.textContent =
        "Planungsdaten laden und prüfen";
    }
  });
