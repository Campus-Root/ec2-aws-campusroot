export const getMatchScoreFromGPA = (score, outOf, program) => {
    let result;
    switch (outOf) {
        case 100:
            result = calculateMargin(score, program.EntryRequirementUgOutOf100, 100, 36)
            break;
        case 10:
            result = calculateMargin(score, program.EntryRequirementUgOutOf10, 10, 4)
            break;
        case 7:
            result = calculateMargin(score, program.EntryRequirementUgOutOf7, 7, 2)
            break;
        case 5:
            result = calculateMargin(score, program.EntryRequirementUgOutOf5, 5, 2)
            break;
        case 4:
            result = calculateMargin(score, program.EntryRequirementUgOutOf4, 4, 2)
            break;
    }
    return result
};
export const calculateMargin = (score, required, max, min) => {
    let diff = (score - required) / (max - min)
    if (diff < -0.1) return 0; // If the score is significantly below the required value, return 0
    else if (diff > 1) return 1
    else return 3.26446281 * diff**3 - 7.02892562 * diff**2 + 4.26446281 * diff + 0.6
};
export const calculateMatchPercentage = (testScores, program) => {
    let matchScore = 0, totalWeight = 0, bonus = 0;
    for (const ele of testScores) {
        let margin, weight
        switch (ele.testType) {
            case "GPA":
                weight = program.weights?.GPA || 70
                totalWeight += weight
                matchScore += getMatchScoreFromGPA(ele.overallScore, ele.ugOutOf, program) * weight;
                break;
            case "GMAT":
                if (program.GmatScore !== null) {
                    weight = program.weights?.GMAT || 30
                    totalWeight += weight
                    margin = calculateMargin(ele.overallScore, program.GmatScore, 805, 205)
                    matchScore += margin * weight;
                }
                break;
            case "GRE":
                if (program?.GreScore !== undefined && program.GreScore !== null) {
                    weight = program.weights?.GRE || 30
                    totalWeight += weight
                    margin = calculateMargin(ele.overallScore, program.GreScore, 340, 260)
                    matchScore += margin * weight;
                }
                break;
            case "WorkExperience":
                if (program?.WorkExp !== undefined && program.WorkExp !== null) bonus += Math.min((ele.overallScore - program.WorkExp) * 3, 15);
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
                if (program?.backlog !== undefined && program.backlog !== null) {
                    weight = program.weights?.Backlogs || 30
                    totalWeight += weight
                    // margin = Math.max(0, 1 - (ele.overallScore / program.backlog) * (1 - 0.7));
                    margin = Math.min(15, (program.backlog - ele.overallScore) * 2)
                    matchScore += margin * weight;
                }
                break;
        }
    }
    return ((matchScore / totalWeight) * 100) + bonus;
};
export const categorizePrograms = (testScores, programs) => {
    const results = { safe: [], moderate: [], ambitious: [] };
    programs = programs.filter(ele => {
        ele.matchPercentage = calculateMatchPercentage(testScores, ele); // Assign the match percentage
        return ele.matchPercentage >= 50;
    });
    const rankings = [...new Set(programs.map(p => p.WebomatricsNationalRanking))].sort((a, b) => a - b);
    const ambitiousRange = rankings[Math.floor(rankings.length * 0.2)];
    const moderateRange = rankings[Math.floor(rankings.length * 0.5)];
    programs.forEach(program => {
        const rank = program.WebomatricsNationalRanking;
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
export const constructFilters = (filterData, testScores, mode) => {
    const filter = { WebomatricsNationalRanking: { $lt: 2147483647 }, "$or": [], IsOnlineCourse: false }, projections = { Name: 1, University: 1, WebomatricsNationalRanking: 1, weights: 1, backlog: 1 }
    if (filterData && Array.isArray(filterData)) {
        filterData.forEach(({ type, data }) => {
            if (data && Array.isArray(data)) {
                switch (type) {
                    case 'Country':
                        filter.Country = { $in: data };
                        projections.Country = 1
                        break;
                    case 'Category':
                        filter.CategoryNames = { $in: data };
                        projections.CategoryNames = 1
                        break;
                    case 'SubCategory':
                        filter.SubCategoryNames = { $in: data };
                        projections.SubCategoryNames = 1
                        break;
                    case 'StudyLevel':
                        filter.StudyLvl = { $in: data };
                        projections.StudyLvl = 1
                        break;
                }
            }
        });
    }
    // Process test scores
    if (testScores && Array.isArray(testScores)) {
        testScores.forEach(({ testType, overallScore, sectionScore, ugOutOf }) => {
            // skip this iteration if overallScore doesn't exist
            // if (!overallScore) return;
            const score = Number(overallScore);
            if (!score) return;
            switch (testType) {
                case 'IELTS':
                    // filter["IeltsRequired"] = true;
                    filter["IeltsOverall"] = { $lte: score };
                    if (sectionScore) filter["IeltsNoBandLessThan"] = { $lte: Number(sectionScore) };
                    projections["IeltsOverall"] = 1
                    break;
                case 'TOEFL':
                    // filter["ToeflRequired"] = true;
                    filter["ToeflScore"] = { $lte: score };
                    if (sectionScore) filter["TOEFLNoSectionLessThan"] = { $lte: Number(sectionScore) };
                    projections["ToeflScore"] = 1
                    break;
                case 'PTE':
                    // filter["PteRequired"] = true;
                    filter["PteScore"] = { $lte: score };
                    projections["PteScore"] = 1
                    break;
                case 'DET':
                    // filter["DETRequired"] = true;
                    filter["DETScore"] = { $lte: score };
                    projections["DETScore"] = 1
                    break;
                case 'WorkExperience':
                    filter["WorkExp"] = { $lte: score };
                    projections["WorkExp"] = 1
                    break;
                case 'GRE':
                    filter["$or"].push({ GreScore: { $lte: Math.min(340, score + 10) } }, { GreScore: null });
                    projections["GreScore"] = 1
                    break;
                case 'GMAT':
                    filter["$or"].push({ GmatScore: { $lte: Math.min(805, score + 40) } }, { GmatScore: null });
                    projections["GmatScore"] = 1
                    break;
                case "Backlogs":
                    filter["$or"].push({ backlog: { $gte: Math.max(0, score) } }, { backlog: null });
                    projections["backlog"] = 1
                    break;
                case 'GPA':
                    switch (Number(ugOutOf)) {
                        case 4:
                            filter["EntryRequirementUgOutOf4"] = { $lte: score + 0.2 };
                            projections["EntryRequirementUgOutOf4"] = 1
                            break;
                        case 5:
                            filter["EntryRequirementUgOutOf5"] = { $lte: score + 0.2 };
                            projections["EntryRequirementUgOutOf5"] = 1
                            break;
                        case 7:
                            filter["EntryRequirementUgOutOf7"] = { $lte: score + 0.2 };
                            projections["EntryRequirementUgOutOf7"] = 1
                            break;
                        case 10:
                            filter["EntryRequirementUgOutOf10"] = { $lte: score + 0.4 };
                            projections["EntryRequirementUgOutOf10"] = 1
                            break;
                        case 100:
                            filter["EntryRequirementUgOutOf100"] = { $lte: score + 8 };
                            projections["EntryRequirementUgOutOf100"] = 1
                            break;
                    }
                    break;
            }
        });
    }
    if (filter["$or"].length == 0) delete filter["$or"]
    return { filter, projections };
}