
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


// Für einen Unterrichtsblock zutreffende Zeitregeln ermitteln

function getApplicableAutoPlanningTimeRules(
  data,
  block,
  weekday,
  periodStart,
  periodEnd,
  teacherId = null,
  roomId = null
) {
  const classIds =
    block.type === "track"
      ? block.participatingClassIds || []
      : [block.classId];

  const subjectIds =
    block.type === "track"
      ? (block.parallelGroups || []).map(
          group => group.subjectId
        )
      : [block.subjectId];

  return data.timeRules.filter(rule => {
    const overlaps =
      Number(rule.period_from) <= periodEnd &&
      Number(rule.period_to) >= periodStart;

    if (
      Number(rule.weekday) !== Number(weekday) ||
      !overlaps
    ) {
      return false;
    }

    if (
      rule.teacher_id &&
      rule.teacher_id !== teacherId
    ) {
      return false;
    }

    if (
      rule.room_id &&
      rule.room_id !== roomId
    ) {
      return false;
    }

    if (
      rule.class_id &&
      !classIds.includes(rule.class_id)
    ) {
      return false;
    }

    if (
      rule.subject_id &&
      !subjectIds.includes(rule.subject_id)
    ) {
      return false;
    }

    return true;
  });
}


function isAutoPlanningPlacementBlocked(
  data,
  block,
  weekday,
  periodStart,
  periodEnd,
  teacherId = null,
  roomId = null
) {
  const rules = getApplicableAutoPlanningTimeRules(
    data,
    block,
    weekday,
    periodStart,
    periodEnd,
    teacherId,
    roomId
  );

  return rules.some(
    rule => rule.rule_type === "blocked"
  );
}


function violatesAutoPlanningMustRules(
  data,
  block,
  weekday,
  periodStart,
  periodEnd,
  teacherId = null,
  roomId = null
) {
  const classIds =
    block.type === "track"
      ? block.participatingClassIds || []
      : [block.classId];

  const subjectIds =
    block.type === "track"
      ? (block.parallelGroups || []).map(
          group => group.subjectId
        )
      : [block.subjectId];

  const mustRules = data.timeRules.filter(rule => {
    if (rule.rule_type !== "must") {
      return false;
    }

    if (
      rule.teacher_id &&
      rule.teacher_id !== teacherId
    ) {
      return false;
    }

    if (
      rule.room_id &&
      rule.room_id !== roomId
    ) {
      return false;
    }

    if (
      rule.class_id &&
      !classIds.includes(rule.class_id)
    ) {
      return false;
    }

    if (
      rule.subject_id &&
      !subjectIds.includes(rule.subject_id)
    ) {
      return false;
    }

    return true;
  });

  return mustRules.some(rule =>
    Number(rule.weekday) !== Number(weekday) ||
    Number(periodStart) < Number(rule.period_from) ||
    Number(periodEnd) > Number(rule.period_to)
  );
}


function checkAutoPlanningPlacement(
  data,
  block,
  weekday,
  periodStart,
  periodEnd,
  teacherId = null,
  roomId = null
) {
  const blocked = isAutoPlanningPlacementBlocked(
    data,
    block,
    weekday,
    periodStart,
    periodEnd,
    teacherId,
    roomId
  );

  const violatesMust = violatesAutoPlanningMustRules(
    data,
    block,
    weekday,
    periodStart,
    periodEnd,
    teacherId,
    roomId
  );

  return {
    allowed: !blocked && !violatesMust,
    blocked,
    violatesMust,
    reason: blocked
      ? "Für diesen Zeitraum besteht eine Sperre."
      : violatesMust
        ? "Eine feste Zeitvorgabe wird nicht eingehalten."
        : null
  };
}


function evaluateAutoPlanningPreferences(
  data,
  block,
  weekday,
  periodStart,
  periodEnd,
  teacherId = null,
  roomId = null
) {
  const classIds =
    block.type === "track"
      ? block.participatingClassIds || []
      : [block.classId];

  const subjectIds =
    block.type === "track"
      ? (block.parallelGroups || []).map(
          group => group.subjectId
        )
      : [block.subjectId];

  const preferences = data.timeRules.filter(rule => {
    if (
      rule.rule_type !== "prefer" &&
      rule.rule_type !== "prefer_free"
    ) {
      return false;
    }

    if (
      rule.teacher_id &&
      rule.teacher_id !== teacherId
    ) {
      return false;
    }

    if (
      rule.room_id &&
      rule.room_id !== roomId
    ) {
      return false;
    }

    if (
      rule.class_id &&
      !classIds.includes(rule.class_id)
    ) {
      return false;
    }

    if (
      rule.subject_id &&
      !subjectIds.includes(rule.subject_id)
    ) {
      return false;
    }

    return true;
  });

  let score = 0;
  const deviations = [];
  const satisfied = [];

  for (const rule of preferences) {
    const priority = Number(rule.priority || 1);

const priorityWeight =
  Math.pow(preferences.length + 1, priority - 1);
     
    const sameDay =
      Number(rule.weekday) === Number(weekday);

    const overlaps =
      Number(periodStart) <= Number(rule.period_to) &&
      Number(periodEnd) >= Number(rule.period_from);

    if (rule.rule_type === "prefer") {
      if (
        sameDay &&
        Number(periodStart) >= Number(rule.period_from) &&
        Number(periodEnd) <= Number(rule.period_to)
      ) {
        score += priorityWeight;
        satisfied.push(rule);
      } else {
        score -= priorityWeight;
        deviations.push(rule);
      }
    }

    if (rule.rule_type === "prefer_free") {
      if (sameDay && overlaps) {
        score -= priorityWeight;
        deviations.push(rule);
      } else {
        score += priorityWeight;
        satisfied.push(rule);
      }
    }
  }

  return {
    score,
    satisfied,
    deviations
  };
}




function evaluateAutoPlanningCandidate(
  data,
  block,
  weekday,
  periodStart,
  periodEnd,
  teacherId = null,
  roomId = null,
  subjectId = null
) {
  const hardCheck = checkAutoPlanningPlacement(
    data,
    block,
    weekday,
    periodStart,
    periodEnd,
    teacherId,
    roomId
  );

  if (!hardCheck.allowed) {
    return {
      allowed: false,
      score: -Infinity,
      reason: hardCheck.reason,
      satisfied: [],
      deviations: []
    };
  }

  if (teacherId) {
    const checkedSubjectId =
      subjectId ||
      (block.type === "regular"
        ? block.subjectId
        : null);

    if (checkedSubjectId) {
      const teacherCheck =
        checkAutoPlanningTeacherCandidate(
          data,
          checkedSubjectId,
          teacherId,
          block.periodsCount
        );

      if (!teacherCheck.eligible) {
        return {
          allowed: false,
          score: -Infinity,
          reason: teacherCheck.reason,
          satisfied: [],
          deviations: []
        };
      }
    }
  }

  const preferenceCheck =
    evaluateAutoPlanningPreferences(
      data,
      block,
      weekday,
      periodStart,
      periodEnd,
      teacherId,
      roomId
    );

  return {
    allowed: true,
    score: preferenceCheck.score,
    reason: null,
    satisfied: preferenceCheck.satisfied,
    deviations: []
      .concat(preferenceCheck.deviations)
  };
}


function checkAutoPlanningTeacherCandidate(
  data,
  subjectId,
  teacherId,
  periodsCount = 1
) {
  const teacher = data.teachers.find(
    item => item.id === teacherId
  );

  if (!teacher) {
    return {
      eligible: false,
      qualified: false,
      hasCapacity: false,
      reason: "Lehrkraft wurde nicht gefunden."
    };
  }

  const qualified = data.teacherSubjects.some(
    assignment =>
      assignment.teacher_id === teacherId &&
      assignment.subject_id === subjectId
  );

  if (!qualified) {
    return {
      eligible: false,
      qualified: false,
      hasCapacity: false,
      reason: "Keine Lehrbefähigung für dieses Fach."
    };
  }

  const hasCapacity =
    hasPlanningTeacherCapacity(
      teacherId,
      periodsCount
    );

  if (!hasCapacity) {
    return {
      eligible: false,
      qualified: true,
      hasCapacity: false,
      reason: "Wochenstundenkapazität ausgeschöpft."
    };
  }

  return {
    eligible: true,
    qualified: true,
    hasCapacity: true,
    reason: null
  };
}



function getAutoPlanningQualifiedTeachers(
  data,
  subjectId,
  periodsCount = 1
) {
  const qualifiedTeachers = data.teacherSubjects
    .filter(
      assignment =>
        assignment.subject_id === subjectId
    )
    .map(assignment => assignment.teacher_id);

  const uniqueTeacherIds = [
    ...new Set(qualifiedTeachers)
  ];

  return uniqueTeacherIds
    .map(teacherId => {
      const check =
        checkAutoPlanningTeacherCandidate(
          data,
          subjectId,
          teacherId,
          periodsCount
        );

      if (!check.eligible) {
        return null;
      }

      const teacher = data.teachers.find(
        item => item.id === teacherId
      );

      if (!teacher) return null;

      const requiredHours =
        Number(teacher.weekly_required_hours || 0);

      const assignedPeriods =
        Number(
          window.suvPlanningTeacherData
            .assignedPeriods[teacherId] || 0
        );

      return {
        ...teacher,
        assignedPeriods,
        remainingHours:
          requiredHours - assignedPeriods,
        workloadRatio:
          assignedPeriods / requiredHours
      };
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        a.workloadRatio - b.workloadRatio
    );
}


function reserveAutoPlanningTeacher(
  data,
  subjectId,
  teacherId,
  periodsCount = 1
) {
  const check =
    checkAutoPlanningTeacherCandidate(
      data,
      subjectId,
      teacherId,
      periodsCount
    );

  if (!check.eligible) {
    return {
      success: false,
      reason: check.reason
    };
  }

  const recorded =
    recordPlanningTeacherAssignment(
      teacherId,
      periodsCount
    );

  if (!recorded) {
    return {
      success: false,
      reason:
        "Die Wochenstundenkapazität reicht nicht aus."
    };
  }

  const teacher = data.teachers.find(
    item => item.id === teacherId
  );

  const assignedPeriods =
    Number(
      window.suvPlanningTeacherData
        .assignedPeriods[teacherId] || 0
    );

  const requiredHours =
    Number(teacher.weekly_required_hours || 0);

  return {
    success: true,
    teacher,
    assignedPeriods,
    remainingHours:
      requiredHours - assignedPeriods
  };
}


function findAutoPlanningHardRuleConflicts(data) {
  const hardRules = (data.timeRules || []).filter(
    rule =>
      rule.rule_type === "blocked" ||
      rule.rule_type === "must"
  );

  const conflicts = [];
  const scopes = [
    "teacher_id",
    "class_id",
    "room_id",
    "subject_id"
  ];

  for (let i = 0; i < hardRules.length; i++) {
    for (let j = i + 1; j < hardRules.length; j++) {
      const first = hardRules[i];
      const second = hardRules[j];

      if (first.rule_type === second.rule_type) {
        continue;
      }

      if (
        Number(first.weekday) !==
        Number(second.weekday)
      ) {
        continue;
      }

      const overlaps =
        Number(first.period_from) <=
          Number(second.period_to) &&
        Number(second.period_from) <=
          Number(first.period_to);

      if (!overlaps) {
        continue;
      }

      const sameScope = scopes.some(
        scope =>
          first[scope] &&
          first[scope] === second[scope]
      );

      if (!sameScope) {
        continue;
      }

      conflicts.push({
        firstRule: first,
        secondRule: second,
        weekday: first.weekday,
        periodFrom: Math.max(
          Number(first.period_from),
          Number(second.period_from)
        ),
        periodTo: Math.min(
          Number(first.period_to),
          Number(second.period_to)
        )
      });
    }
  }

  return conflicts;
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

const hardRuleConflicts =
  findAutoPlanningHardRuleConflicts(data);
       
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


const regularBlocksWithoutTeachers = blocks
  .filter(item => item.type === "regular")
  .filter(item =>
    getAutoPlanningQualifiedTeachers(
      data,
      item.subjectId,
      item.periodsCount
    ).length === 0
  ).length;


const trackGroupsWithoutEnoughTeachers = blocks
  .filter(item => item.type === "track")
  .reduce(
    (sum, block) =>
      sum +
      block.parallelGroups.filter(group => {
        const candidates =
          getAutoPlanningQualifiedTeachers(
            data,
            group.subjectId,
            block.periodsCount
          );

        return candidates.length < group.courseCount;
      }).length,
    0
  );

const regularTeacherProblems = blocks
  .filter(item => item.type === "regular")
  .map(block => {
    const qualifiedIds = new Set(
      data.teacherSubjects
        .filter(item =>
          item.subject_id === block.subjectId
        )
        .map(item => item.teacher_id)
    );

    const qualifiedCount = data.teachers.filter(
      teacher => qualifiedIds.has(teacher.id)
    ).length;

    const availableCount =
      getAutoPlanningQualifiedTeachers(
        data,
        block.subjectId,
        block.periodsCount
      ).length;

    if (availableCount > 0) return null;

    return {
      text:
        block.className +
        " – " +
        block.subjectName +
        " (" +
        block.periodsCount +
        " Std.)",
      reason:
        qualifiedCount === 0
          ? "Keine Fachzuordnung"
          : "Wochenstundenkapazität ausgeschöpft"
    };
  })
  .filter(Boolean);

const trackTeacherProblems = blocks
  .filter(item => item.type === "track")
  .flatMap(block =>
    block.parallelGroups
      .filter(group =>
        getAutoPlanningQualifiedTeachers(
          data,
          group.subjectId,
          block.periodsCount
        ).length < group.courseCount
      )
      .map(group => ({
        text:
          block.offeringName +
          " – " +
          group.subjectName +
          " (benötigt: " +
          group.courseCount +
          ")",
        reason:
          data.teachers.some(teacher =>
            data.teacherSubjects.some(
              assignment =>
                assignment.teacher_id === teacher.id &&
                assignment.subject_id === group.subjectId
            )
          )
            ? "Zu wenige verfügbare Lehrkräfte"
            : "Keine Fachzuordnung"
      }))
  );

         
        return candidates.length < group.courseCount;
      }).length,
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
        ["Konflikte zwischen harten Zeitregeln", hardRuleConflicts.length],
        ["Klassen", data.classes.length],
        ["Fachbedarfe", data.demand.length],
        ["Fächer", data.subjects.length],
        ["Klassenlehrkraft-Zuordnungen", data.classTeachers.length],
        ["Lehrkräfte", data.teachers.length],
        ["Fachqualifikationen", data.teacherSubjects.length],
        ["Reguläre Unterrichtsblöcke", regularBlockCount],
        ["Gemeinsame Schienenblöcke", trackBlockCount],
        ["Einzelne Schienenkurse", totalTrackCourses],
        ["Reguläre Blöcke ohne geeignete Lehrkraft", regularBlocksWithoutTeachers],
        ["Schienenfachgruppen mit zu wenigen Lehrkräften", trackGroupsWithoutEnoughTeachers],
        ["Fehlerhafte Kursgruppen", invalidTrackGroups],
        ["Unterrichtsstunden in allen Blöcken", totalBlockPeriods],
        ["Fehlerhafte Blockgrößen", invalidBlocks]
      ];

const problemHeading = document.createElement("h4");
problemHeading.textContent =
  "Lehrkräfteprobleme im Detail";

const problemList = document.createElement("ul");

[
  ...regularTeacherProblems,
  ...trackTeacherProblems
].forEach(problem => {
  const item = document.createElement("li");

  item.textContent =
    problem.text + " – " + problem.reason;

  problemList.appendChild(item);
});

result.append(problemHeading, problemList);
       
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
