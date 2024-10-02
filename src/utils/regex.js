import { subDisciplineEnum, disciplineEnum, keywords } from "./enum.js"
import { destinationList } from "./lists.js";
export const disciplineRegexMatch = (search, skip = 0, perPage = 5) => {
    const regex = new RegExp(search, "i");
    const arr = Object.values(disciplineEnum).filter(ele => regex.test(ele))
    const totalDocs = arr.length;
    return { arr: arr.slice(skip, skip + perPage), totalDocs };
}
export const subDisciplineRegexMatch = (search, skip = 0, perPage = 5) => {
    const regex = new RegExp(search, "i");
    const arr = Object.values(subDisciplineEnum).filter(ele => regex.test(ele))
    const totalDocs = arr.length;
    return { arr: arr.slice(skip, skip + perPage), totalDocs };
}
export const searchSimilarWords = (inputWord) => {
    let bestMatches = [];
    let bestSimilarity = 0.0;

    for (const entry of keywords) {
        for (const word of entry.strings) {
            const similarity = new SequenceMatcher(null, inputWord.toLowerCase(), word.toLowerCase()).ratio();
            if (similarity > bestSimilarity) {
                bestMatches = [{ data: word, type: entry.type }];
                bestSimilarity = similarity;
            } else if (similarity === bestSimilarity) {
                bestMatches.push({ data: word, type: entry.type });
            }
        }
    }

    return bestSimilarity >= 0.5 ? bestMatches.slice(0, 5) : [];
};
export const locationRegexMatch = (search, skip = 0, perPage = 5) => {
    const regex = new RegExp(search, "i");

    const result = {
        countries: new Set(),
        states: new Set(),
        cities: new Set()
    };

    // Iterate through countries and states in one pass
    for (const [country, states] of Object.entries(destinationList)) {
        // Check for country match
        if (regex.test(country)) result.countries.add(country);
        // Iterate through states and cities
        for (const [state, cities] of Object.entries(states)) {
            // Check for state match
            if (regex.test(state)) result.states.add(state);
            // Check for city match
            cities.forEach(city => { if (regex.test(city)) result.cities.add(city) })
        }
    }
    const totalDocs = Math.max(Array.from(result.countries).length, Array.from(result.states).length, Array.from(result.cities).length);
    return {
        countries: Array.from(result.countries).slice(skip, skip + perPage),
        states: Array.from(result.states).slice(skip, skip + perPage),
        cities: Array.from(result.cities).slice(skip, skip + perPage),
        totalDocs
    };
};