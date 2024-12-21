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
    let margin = 0; // Initialize margin
    if (score >= required) {
        const percentageExceed = ((score - required) / (max - min)) * 100;
        if (percentageExceed >= 10) {
            margin = 0.7 + ((percentageExceed - 10) / 100); // Bonus beyond 10%, mapped proportionally
        } else if (percentageExceed >= 5) {
            margin = 0.5 + ((percentageExceed - 5) / 5) * (0.7 - 0.5); // Linearly interpolate between 0.5 and 0.7
        } else {
            margin = 0.3 + (percentageExceed / 5) * (0.5 - 0.3); // Linearly interpolate between 0.3 and 0.5
        }
    } else {
        // If the user's score is below the program requirement, calculate a baseline margin
        const percentageBelow = ((required - score) / (max - min)) * 100;
        margin = Math.max(0, 0.3 - (percentageBelow / 10)); // Decrease margin proportionally
    }
    return Math.min(margin, 1.2);
};
export const calculateMatchPercentage = (testScores, program) => {
    let matchScore = 0, totalWeight = 0;
    for (const ele of testScores) {
        let margin, weight
        switch (ele.testType) {
            case "GPA":
                weight = program.weights.GPA || 70
                totalWeight += weight
                matchScore += getMatchScoreFromGPA(ele.overallScore, ele.ugOutOf, program) * weight;
                break;
            case "GMAT":
                weight = program.weights.GMAT || 30
                totalWeight += weight
                margin = calculateMargin(ele.overallScore, program.GmatScore, 805, 205)
                matchScore += margin * weight;
                break;
            case "GRE":
                weight = program.weights.GRE || 30
                totalWeight += weight
                margin = calculateMargin(ele.overallScore, program.GreScore, 340, 260)
                matchScore += margin * weight;
                break;
            case "Backlogs":
                weight = program.weights.Backlogs || 30
                totalWeight += weight
                margin = Math.max(0, 1 - (ele.overallScore / program.backlog) * (1 - 0.7));
                matchScore += margin * weight;
                break;
        }
    }
    return (matchScore / totalWeight) * 100;
};
export const categorizePrograms = (testScores, programs) => {
    const results = { safe: [], moderate: [], ambitious: [] };
    programs.forEach((program) => {
        const matchPercentage = calculateMatchPercentage(testScores, program);
        if (matchPercentage >= 95) {
            results.safe.push({ ...program, matchPercentage });
        } else if (matchPercentage >= 85) {
            results.moderate.push({ ...program, matchPercentage });
        }
        else if (matchPercentage >= 70) {
            results.moderate.push({ ...program, matchPercentage });
        }
    });
    const limitPrograms = (list) => list.sort((a, b) => a.QSRanking - b.QSRanking)
    results.safe = limitPrograms(results.safe);
    results.moderate = limitPrograms(results.moderate);
    results.ambitious = limitPrograms(results.ambitious);
    return results;
};
export const constructFilters = (filterData, testScores) => {
    const filter = {}, projections = { Name: 1, University: 1, QSRanking: 1, weights: 1, backlog: 1 }
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
            const score = Number(overallScore);
            if (!score) return;
            switch (testType) {
                case 'IELTS':
                    filter["IeltsRequired"] = true;
                    filter["IeltsOverall"] = { $lte: score };
                    if (sectionScore) filter["IeltsNoBandLessThan"] = { $lte: Number(sectionScore) };
                    projections["IeltsOverall"] = 1
                    break;
                case 'TOEFL':
                    filter["ToeflRequired"] = true;
                    filter["ToeflScore"] = { $lte: score };
                    if (sectionScore) filter["TOEFLNoSectionLessThan"] = { $lte: Number(sectionScore) };
                    projections["ToeflScore"] = 1
                    break;
                case 'PTE':
                    filter["PteRequired"] = true;
                    filter["PteScore"] = { $lte: score };
                    projections["PteScore"] = 1
                    break;
                case 'DET':
                    filter["DETRequired"] = true;
                    filter["DETScore"] = { $lte: score };
                    projections["DETScore"] = 1
                    break;
                case 'GRE':
                    filter["GreScore"] = { $lte: Math.min(340, score + 10), $gte: Math.max(260, score - 10) };
                    projections["GreScore"] = 1
                    break;
                case 'GMAT':
                    filter["GmatRequired"] = true;
                    filter["GmatScore"] = { $lte: Math.min(805, score + 30), $gte: Math.max(205, score - 30) };
                    projections["GmatScore"] = 1
                    break;
                case "Backlogs":
                    filter["backlog"] = { $gte: Math.max(0, score - 2) };
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
                            filter["EntryRequirementUgOutOf10"] = { $lte: score + 0.3 };
                            projections["EntryRequirementUgOutOf10"] = 1
                            break;
                        case 100:
                            filter["EntryRequirementUgOutOf100"] = { $lte: score + 5 };
                            projections["EntryRequirementUgOutOf100"] = 1
                            break;
                    }
                    break;
            }
        });
    }
    return { filter, projections };
}