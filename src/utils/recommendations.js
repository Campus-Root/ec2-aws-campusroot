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
    for (const ele of testScores) {
        let margin, weight
        switch (ele.testType) {
            case "GPA":
                weight = program.coursefinder_weights?.GPA || 70
                totalWeight += weight
                matchScore += getMatchScoreFromGPA(ele.overallScore, Number(ele.ugOutOf), program) * weight;
                break;
            case "GMAT":
                if (program.coursefinder_GmatScore !== null) {
                    weight = program.coursefinder_weights?.GMAT || 30
                    totalWeight += weight
                    margin = calculateMargin(ele.overallScore, program.coursefinder_GmatScore, 805, 205)
                    matchScore += margin * weight;
                }
                break;
            case "GRE":
                if (program?.coursefinder_GreScore !== undefined && program.coursefinder_GreScore !== null) {
                    weight = program.coursefinder_weights?.GRE || 30
                    totalWeight += weight
                    margin = calculateMargin(ele.overallScore, program.coursefinder_GreScore, 340, 260)
                    matchScore += margin * weight;
                }
                break;
            case "WorkExperience":
                if (program?.coursefinder_WorkExp !== undefined && program.coursefinder_WorkExp !== null) bonus += Math.min((ele.overallScore - program.coursefinder_WorkExp) * 3, 15); break;
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
                if (program?.coursefinder_backlog !== undefined && program.coursefinder_backlog !== null) {
                    bonus += Math.min(15, (program.coursefinder_backlog - ele.overallScore) * 2)
                    weight = program.coursefinder_weights?.Backlogs || 30
                    totalWeight += weight
                }
                break;
        }
    }
    return ((matchScore / totalWeight) + bonus);
};
export const categorizePrograms = (testScores, programs, mode) => {
    const results = { safe: [], moderate: [], ambitious: [] };
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
            results.ambitious.push(program);
        } else if (rank <= moderateRange) {
            results.moderate.push(program);
        } else {
            results.safe.push(program);
        }
    });
    return results;
};
export const constructFilters = (filterData, testScores) => {
    const filter = { coursefinder_WebomatricsNationalRanking: { $lt: 2147483647 }, "$or": [], coursefinder_IsOnlineCourse: false }, projections = { _id:1,coursefinder_Name: 1, coursefinder_University: 1, coursefinder_WebomatricsNationalRanking: 1, coursefinder_weights: 1, coursefinder_backlog: 1 }
    if (filterData && Array.isArray(filterData)) {
        filterData.forEach(({ type, data }) => {
            if (data && Array.isArray(data)) {
                switch (type) {
                    case 'Country':
                        filter.coursefinder_Country = { $in: data };
                        projections.coursefinder_Country = 1
                        break;
                    case 'Category':
                        filter.coursefinder_CategoryNames = { $in: data };// get their indexes
                        projections.coursefinder_CategoryNames = 1
                        break;
                    case 'SubCategory':
                        filter.coursefinder_SubCategoryNames = { $in: data };
                        projections.coursefinder_SubCategoryNames = 1
                        break;
                    case 'StudyLevel':
                        filter.coursefinder_StudyLvl = { $in: data };
                        projections.coursefinder_StudyLvl = 1
                        break;
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
                case 'IELTS':
                    // filter["IeltsRequired"] = true;
                    filter["coursefinder_IeltsOverall"] = { $lte: score };
                    if (sectionScore) filter["coursefinder_IeltsNoBandLessThan"] = { $lte: Number(sectionScore) };
                    projections["coursefinder_IeltsOverall"] = 1
                    break;
                case 'TOEFL':
                    // filter["ToeflRequired"] = true;
                    filter["coursefinder_ToeflScore"] = { $lte: score };
                    if (sectionScore) filter["coursefinder_TOEFLNoSectionLessThan"] = { $lte: Number(sectionScore) };
                    projections["coursefinder_ToeflScore"] = 1
                    break;
                case 'PTE':
                    // filter["PteRequired"] = true;
                    filter["coursefinder_PteScore"] = { $lte: score };
                    projections["coursefinder_PteScore"] = 1
                    break;
                case 'DET':
                    // filter["DETRequired"] = true;
                    filter["coursefinder_DETScore"] = { $lte: score };
                    projections["coursefinder_DETScore"] = 1
                    break;
                case 'WorkExperience':
                    filter["coursefinder_WorkExp"] = { $lte: score };
                    projections["coursefinder_WorkExp"] = 1
                    break;
                case 'GRE':
                    filter["$or"].push({ coursefinder_GreScore: { $lte: Math.min(340, score + 10) } }, { coursefinder_GreScore: null });
                    projections["coursefinder_GreScore"] = 1
                    break;
                case 'GMAT':
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
                            filter["coursefinder_EntryRequirementUgOutOf4"] = { $lte: score + 0.2 };
                            projections["coursefinder_EntryRequirementUgOutOf4"] = 1
                            break;
                        case 5:
                            filter["coursefinder_EntryRequirementUgOutOf5"] = { $lte: score + 0.2 };
                            projections["coursefinder_EntryRequirementUgOutOf5"] = 1
                            break;
                        case 7:
                            filter["coursefinder_EntryRequirementUgOutOf7"] = { $lte: score + 0.2 };
                            projections["coursefinder_EntryRequirementUgOutOf7"] = 1
                            break;
                        case 10:
                            filter["coursefinder_EntryRequirementUgOutOf10"] = { $lte: score + 0.4 };
                            projections["coursefinder_EntryRequirementUgOutOf10"] = 1
                            break;
                        case 100:
                            filter["coursefinder_EntryRequirementUgOutOf100"] = { $lte: score + 8 };
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