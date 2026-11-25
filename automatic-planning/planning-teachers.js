
/* SUV – Automatische Planung
   Modul: Lehrkräfte und Fachqualifikationen */

window.suvPlanningTeacherData = {
  teachers: [],
  assignments: []
};


// Lehrkräfte und Fachzuordnungen laden

async function loadPlanningTeacherData() {
  autoPlanningMessage.textContent =
    "Lehrkräfte und Fachqualifikationen werden geladen ...";

  const [teacherResult, assignmentResult] =
    await Promise.all([
      suvDb
        .from("teachers")
        .select(`
          id,
          first_name,
          last_name,
          short_code,
          weekly_required_hours,
          is_active
        `)
        .eq("is_active", true),

      suvDb
        .from("teacher_subjects")
        .select("teacher_id, subject_id")
    ]);

  if (teacherResult.error || assignmentResult.error) {
    const error =
      teacherResult.error || assignmentResult.error;

    autoPlanningMessage.textContent =
      "Fehler beim Laden der Lehrkräftequalifikationen: " +
      error.message;

    return false;
  }

  window.suvPlanningTeacherData.teachers =
    teacherResult.data || [];

  window.suvPlanningTeacherData.assignments =
    assignmentResult.data || [];

  autoPlanningMessage.textContent =
    window.suvPlanningTeacherData.teachers.length +
    " aktive Lehrkräfte und " +
    window.suvPlanningTeacherData.assignments.length +
    " Fachzuordnungen geladen.";

  return true;
}


// Fachlich geeignete Lehrkräfte ermitteln

function getQualifiedTeachersForSubject(subjectId) {
  const state = window.suvPlanningTeacherData;

  const qualifiedTeacherIds = new Set(
    state.assignments
      .filter(item => item.subject_id === subjectId)
      .map(item => item.teacher_id)
  );

  return state.teachers.filter(teacher =>
    qualifiedTeacherIds.has(teacher.id)
  );
}
