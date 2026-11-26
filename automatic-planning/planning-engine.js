
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
        "rule_code, rule_value, rule_strength, priority"
      )
      .eq("school_year_id", schoolYearId)
      .eq("is_active", true)
      .order("priority"),

    suvDb
      .from("time_rules")
      .select(
        "teacher_id, class_id, room_id, subject_id, rule_type, weekday, period_from, period_to, priority"
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
    subjects,

    classTeachers,

    teachers: teacherData.teachers,
    teacherSubjects: teacherData.assignments
  };

  window.suvAutoPlanningEngine.data =
    engineData;

  return engineData;
}
