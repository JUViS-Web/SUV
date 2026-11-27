
/* SUV – Automatische Planung
   Modul: Lehrkräfte und Fachqualifikationen */

window.suvPlanningTeacherData = {
  teachers: [],
  assignments: [],
  assignedPeriods: {}
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

// Geeignete Lehrkräfte ermitteln,
// Kapazität prüfen und nach Belastung sortieren

function getPlanningTeacherCandidates(
  subjectId,
  periodsCount = 1
) {
  const state = window.suvPlanningTeacherData;

  const qualifiedTeacherIds = new Set(
    state.assignments
      .filter(item => item.subject_id === subjectId)
      .map(item => item.teacher_id)
  );

  return state.teachers
    .filter(teacher =>
      qualifiedTeacherIds.has(teacher.id)
    )
    .filter(teacher =>
      hasPlanningTeacherCapacity(
        teacher.id,
        periodsCount
      )
    )
    .map(teacher => {
      const assignedPeriods =
        Number(state.assignedPeriods[teacher.id] || 0);

      const requiredHours =
        Number(teacher.weekly_required_hours || 0);

      const workloadRatio =
        assignedPeriods / requiredHours;

      return {
        ...teacher,
        assignedPeriods,
        requiredHours,
        remainingHours:
          requiredHours - assignedPeriods,
        workloadRatio
      };
    })
    .sort((a, b) =>
      a.workloadRatio - b.workloadRatio
    );
}

// Belastungswerte für einen neuen Planungslauf zurücksetzen

function resetPlanningTeacherWorkload() {
  window.suvPlanningTeacherData.assignedPeriods = {};
}


// Eine geplante Unterrichtsstunde registrieren

// Unterrichtszuteilung nur verbuchen,
// wenn die Wochenstunden-Obergrenze eingehalten wird

function recordPlanningTeacherAssignment(
  teacherId,
  periodsCount = 1
) {
  const state = window.suvPlanningTeacherData;

  if (!teacherId) return false;

  if (
    !Number.isInteger(periodsCount) ||
    periodsCount < 1
  ) {
    return false;
  }

  if (
    !hasPlanningTeacherCapacity(
      teacherId,
      periodsCount
    )
  ) {
    return false;
  }

  state.assignedPeriods[teacherId] =
    Number(state.assignedPeriods[teacherId] || 0) +
    periodsCount;

  return true;
}

// Prüfen, ob eine Lehrkraft noch Wochenstunden-Kapazität hat


function hasPlanningTeacherCapacity(
  teacherId,
  periodsCount = 1
) {
  const state = window.suvPlanningTeacherData;

  if (
    !teacherId ||
    !Number.isInteger(periodsCount) ||
    periodsCount < 1
  ) {
    return false;
  }

  const teacher = state.teachers.find(
    item => item.id === teacherId
  );

  if (!teacher) return false;

  const requiredHours =
    Number(teacher.weekly_required_hours || 0);

  const assignedPeriods =
    Number(state.assignedPeriods[teacherId] || 0);

  if (
    !Number.isFinite(requiredHours) ||
    requiredHours <= 0 ||
    !Number.isFinite(assignedPeriods) ||
    assignedPeriods < 0
  ) {
    return false;
  }

  return (
    assignedPeriods + periodsCount <= requiredHours
  );
}


// Lehrkraft für einen Unterrichtsbedarf auswählen
// und ihre Wochenstunden direkt reservieren

function assignPlanningTeacher(
  subjectId,
  periodsCount = 1
) {
  const candidates =
    getPlanningTeacherCandidates(
      subjectId,
      periodsCount
    );

  if (candidates.length === 0) {
    return null;
  }

  const teacher = candidates[0];

  const recorded =
    recordPlanningTeacherAssignment(
      teacher.id,
      periodsCount
    );

  if (!recorded) {
    return null;
  }

  return {
    teacher,
    assignedPeriods: periodsCount,
    remainingHours:
      teacher.requiredHours -
      teacher.assignedPeriods -
      periodsCount
  };
}
