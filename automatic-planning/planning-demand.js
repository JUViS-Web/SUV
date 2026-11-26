// SUV – Gemeinsame Berechnung des Unterrichtsbedarfs

async function loadPlanningDemandData(schoolYearId, gradeLevelId) {
  const { data: classes, error: classError } = await suvDb
    .from("classes")
    .select("id, name")
    .eq("school_year_id", schoolYearId)
    .eq("grade_level_id", gradeLevelId)
    .order("name");

  if (classError) throw classError;

  const { data: requirements, error: requirementError } =
    await suvDb
      .from("grade_subject_requirements")
      .select("subject_id, weekly_periods")
      .eq("school_year_id", schoolYearId)
      .eq("grade_level_id", gradeLevelId)
      .eq("is_active", true);

  if (requirementError) throw requirementError;

  const { data: offerings, error: offeringError } =
    await suvDb
      .from("grade_course_offerings")
      .select("id, offering_name")
      .eq("school_year_id", schoolYearId);

  if (offeringError) throw offeringError;

  const offeringIds = (offerings || []).map(item => item.id);
  const classIds = (classes || []).map(item => item.id);

  let classLinks = [];
  let groups = [];

  if (offeringIds.length > 0 && classIds.length > 0) {
    const { data, error } = await suvDb
      .from("grade_course_offering_classes")
      .select("grade_course_offering_id, class_id")
      .in("grade_course_offering_id", offeringIds)
      .in("class_id", classIds);

    if (error) throw error;

    classLinks = data || [];

    const relevantOfferingIds = [
      ...new Set(
        classLinks.map(item => item.grade_course_offering_id)
      )
    ];

    if (relevantOfferingIds.length > 0) {
      const { data: groupData, error: groupError } =
        await suvDb
          .from("grade_course_groups")
          .select(
            "id, offering_id, subject_id, weekly_periods, course_count"
          )
          .in("offering_id", relevantOfferingIds);

      if (groupError) throw groupError;

      groups = groupData || [];
    }
  }

  const { data: subjects, error: subjectError } = await suvDb
    .from("subjects")
    .select("id, name, short_code")
    .order("name");

  if (subjectError) throw subjectError;

  const demand = [];

  for (const classItem of classes || []) {
    const subjectIds = new Set([
      ...(requirements || []).map(item => item.subject_id),
      ...groups.map(item => item.subject_id)
    ]);

    for (const subjectId of subjectIds) {
      const regularHours = Number(
        (requirements || []).find(
          item => item.subject_id === subjectId
        )?.weekly_periods || 0
      );

      const relevantLinks = classLinks.filter(
        link => link.class_id === classItem.id
      );

      const relevantOfferingIds = relevantLinks.map(
        link => link.grade_course_offering_id
      );

      const subjectGroups = groups.filter(
        group =>
          group.subject_id === subjectId &&
          relevantOfferingIds.includes(group.offering_id)
      );

      const trackHours = subjectGroups.reduce(
        (sum, group) => sum + Number(group.weekly_periods || 0),
        0
      );

      const parallelCourseCount = subjectGroups.reduce(
        (sum, group) => sum + Number(group.course_count || 0),
        0
      );

      const subject = (subjects || []).find(
        item => item.id === subjectId
      );

      demand.push({
        classId: classItem.id,
        className: classItem.name,
        subjectId,
        subjectName: subject?.name || "Unbekanntes Fach",
        regularHours,
        trackHours,
        totalHours: regularHours + trackHours,
        parallelCourseCount
      });
    }
  }

  return {
    classes: classes || [],
    demand,
    totalWeeklyHours: demand.reduce(
      (sum, item) => sum + item.totalHours,
      0
    )
  };
}
