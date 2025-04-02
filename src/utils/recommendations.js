export const getMatchScoreFromGPA = (score, outOf, program) => {
    let result;
    switch (outOf) {
        case 100:
            result = calculateMargin(score, program.coursefinder_EntryRequirementUgOutOf100, 100, 36)
            break;
        case 10:
            result = calculateMargin(score, program.coursefinder_EntryRequirementUgOutOf10, 10, 4)
            break;
        case 7:
            result = calculateMargin(score, program.coursefinder_EntryRequirementUgOutOf7, 7, 2)
            break;
        case 5:
            result = calculateMargin(score, program.coursefinder_EntryRequirementUgOutOf5, 5, 2)
            break;
        case 4:
            result = calculateMargin(score, program.coursefinder_EntryRequirementUgOutOf4, 4, 2)
            break;
    }
    return result
};
export const calculateMargin = (score, required, max, min) => {
    let diff = (score - required) / (max - min)
    let margin
    if (diff < -0.1) margin = 0; // If the score is significantly below the required value, margin = 0
    else if (diff > 1) margin = 100
    margin = 3.26446281 * diff ** 3 - 7.02892562 * diff ** 2 + 4.26446281 * diff + 0.6
    return margin * 100
};
export const calculateMatchPercentage = (testScores, program) => {
    let matchScore = 0, totalWeight = 0, bonus = 0;
    const plainProgram = program.toObject(); // or program.toJSON()
    for (const ele of testScores) {
        let margin = 0, weight = 0
        switch (ele.testType) {
            case "GPA":
                weight = plainProgram.coursefinder_weights?.GPA || 70
                totalWeight += weight
                matchScore += getMatchScoreFromGPA(ele.overallScore, Number(ele.ugOutOf), plainProgram) * weight;
                break;
            case "Graduate Management Admission Test":
                if (plainProgram.coursefinder_GmatScore !== null) {
                    weight = plainProgram.coursefinder_weights?.GMAT || 30
                    totalWeight += weight
                    margin = calculateMargin(ele.overallScore, plainProgram.coursefinder_GmatScore, 805, 205)
                    matchScore += margin * weight;
                }
                break;
            case "Graduate Record Examination":
                if (plainProgram?.coursefinder_GreScore !== undefined && plainProgram.coursefinder_GreScore !== null) {
                    weight = program.coursefinder_weights?.GRE || 30
                    totalWeight += weight
                    margin = calculateMargin(ele.overallScore, plainProgram.coursefinder_GreScore, 340, 260)
                    matchScore += margin * weight;
                }
                break;
            case "WorkExperience":
                if (plainProgram?.coursefinder_WorkExp !== undefined && plainProgram.coursefinder_WorkExp !== null) bonus += Math.min((ele.overallScore - plainProgram.coursefinder_WorkExp) * 3, 15);
                break;
            case "Publications":
                switch (ele.level) {
                    case "National":
                        bonus += 3;
                        break;
                    case "International":
                        bonus += 5;
                        break;
                }
                break;
            case "Backlogs":
                if (plainProgram?.coursefinder_backlog !== undefined && plainProgram.coursefinder_backlog !== null) {
                    bonus += Math.min(15, (plainProgram.coursefinder_backlog - ele.overallScore) * 2)
                    weight = program.coursefinder_weights?.Backlogs || 30
                    totalWeight += weight
                }
                break;
        }
    }
    return ((matchScore / totalWeight) + bonus);
};
export const categorizePrograms = (testScores, programs, mode = "Student") => {
    const results = [];
    switch (mode) {
        case "Student":
            programs = programs.filter(ele => {
                ele.matchPercentage = calculateMatchPercentage(testScores, ele); // Assign the match percentage
                return ele.matchPercentage >= 50;
            });
            break;
        case "Counsellor":
            programs = programs.filter(ele => {
                ele.matchPercentage = calculateMatchPercentage(testScores, ele); // Assign the match percentage
                return true;
            });
            break;
        default:
            break;
    }
    const rankings = [...new Set(programs.map(p => p.coursefinder_WebomatricsNationalRanking))].sort((a, b) => a - b);
    const ambitiousRange = rankings[Math.floor(rankings.length * 0.2)];
    const moderateRange = rankings[Math.floor(rankings.length * 0.5)];
    programs.forEach(program => {
        const rank = program.coursefinder_WebomatricsNationalRanking;
        if (rank <= ambitiousRange) {
            results.push({ course: program._id, possibilityOfAdmit: "Ambitious" });
        } else if (rank <= moderateRange) {
            results.push({ course: program._id, possibilityOfAdmit: "Moderate" });
        } else {
            results.push({ course: program._id, possibilityOfAdmit: "Safe" });
        }
    });
    return results;
};
export const constructFilters = (filterData, testScores) => {
    const filter = { coursefinder_WebomatricsNationalRanking: { $lte: 2147483647 }, "$or": [], coursefinder_IsOnlineCourse: false }, projections = { _id: 1, coursefinder_Name: 1, coursefinder_University: 1, coursefinder_WebomatricsNationalRanking: 1, coursefinder_weights: 1, coursefinder_backlog: 1 }
    if (filterData && Array.isArray(filterData)) {
        filterData.forEach(({ type, data }) => {
            if (data && Array.isArray(data)) {
                switch (type) {
                    case 'Country':
                        filter.coursefinder_Country = { $in: data };
                        projections.coursefinder_Country = 1
                        break;
                    case 'Category':
                        filter.discipline = { $in: data };// get their indexes
                        projections.discipline = 1
                        break;
                    case 'SubCategory':
                        filter.subDiscipline = { $in: data };
                        projections.subDiscipline = 1
                        break;
                    // case 'StudyLevel':
                    //     filter.coursefinder_StudyLvl = { $in: data };
                    //     projections.coursefinder_StudyLvl = 1
                    //     break;
                }
            }
        });
    }
    // Process test scores
    if (testScores && Array.isArray(testScores)) {
        testScores.forEach(({ testType, overallScore, sectionScore, ugOutOf }) => {
            // skip this iteration if overallScore doesn't exist
            const score = Number(overallScore);
            if (!score) return;
            switch (testType) {
                case 'International English Language Testing System':
                    // filter["IeltsRequired"] = true;
                    filter["$or"].push({ coursefinder_IeltsOverall: { $lte: score } }, { coursefinder_IeltsOverall: null });
                    if (sectionScore) filter["coursefinder_IeltsNoBandLessThan"] = { $lte: Number(sectionScore) };
                    projections["coursefinder_IeltsOverall"] = 1
                    break;
                case 'Test of English as a Foreign Language':
                    // filter["ToeflRequired"] = true;
                    filter["$or"].push({ coursefinder_ToeflScore: { $lte: score } }, { coursefinder_ToeflScore: null });
                    if (sectionScore) filter["coursefinder_TOEFLNoSectionLessThan"] = { $lte: Number(sectionScore) };
                    projections["coursefinder_ToeflScore"] = 1
                    break;
                case 'Pearson Test of English':
                    // filter["PteRequired"] = true;
                    filter["$or"].push({ coursefinder_PteScore: { $lte: score } }, { coursefinder_PteScore: null });
                    projections["coursefinder_PteScore"] = 1
                    break;
                case 'Duolingo English Test':
                    // filter["DETRequired"] = true;
                    filter["$or"].push({ coursefinder_DETScore: { $lte: score } }, { coursefinder_DETScore: null });
                    projections["coursefinder_DETScore"] = 1
                    break;
                case 'WorkExperience':
                    filter["$or"].push({ coursefinder_WorkExp: { $lte: score } }, { coursefinder_WorkExp: null });
                    projections["coursefinder_WorkExp"] = 1
                    break;
                case 'Graduate Record Examination':
                    filter["$or"].push({ coursefinder_GreScore: { $lte: Math.min(340, score + 10) } }, { coursefinder_GreScore: null });
                    projections["coursefinder_GreScore"] = 1
                    break;
                case 'Graduate Management Admission Test':
                    filter["$or"].push({ coursefinder_GmatScore: { $lte: Math.min(805, score + 40) } }, { coursefinder_GmatScore: null });
                    projections["coursefinder_GmatScore"] = 1
                    break;
                case "Backlogs":
                    filter["$or"].push({ coursefinder_backlog: { $gte: Math.max(0, score) } }, { coursefinder_backlog: null });
                    projections["coursefinder_backlog"] = 1
                    break;
                case 'GPA':
                    switch (Number(ugOutOf)) {
                        case 4:
                            filter["$or"].push({ coursefinder_EntryRequirementUgOutOf4: { $lte: score + 0.2 } }, { coursefinder_EntryRequirementUgOutOf4: null });
                            projections["coursefinder_EntryRequirementUgOutOf4"] = 1
                            break;
                        case 5:
                            filter["$or"].push({ coursefinder_EntryRequirementUgOutOf5: { $lte: score + 0.2 } }, { coursefinder_EntryRequirementUgOutOf5: null });
                            projections["coursefinder_EntryRequirementUgOutOf5"] = 1
                            break;
                        case 7:
                            filter["$or"].push({ coursefinder_EntryRequirementUgOutOf7: { $lte: score + 0.2 } }, { coursefinder_EntryRequirementUgOutOf7: null });
                            projections["coursefinder_EntryRequirementUgOutOf7"] = 1
                            break;
                        case 10:
                            filter["$or"].push({ coursefinder_EntryRequirementUgOutOf10: { $lte: score + 0.2 } }, { coursefinder_EntryRequirementUgOutOf10: null });
                            projections["coursefinder_EntryRequirementUgOutOf10"] = 1
                            break;
                        case 100:
                            filter["$or"].push({ coursefinder_EntryRequirementUgOutOf100: { $lte: score + 0.2 } }, { coursefinder_EntryRequirementUgOutOf100: null });
                            projections["coursefinder_EntryRequirementUgOutOf100"] = 1
                            break;
                    }
                    break;
            }
        });
    }
    if (filter["$or"].length == 0) delete filter["$or"]
    return { filter, projections };
}