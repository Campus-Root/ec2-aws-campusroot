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
export const locationRegexMatch = (search, skip = 0, perPage = 5, hint = {}) => {
    const regex = new RegExp(search, "i");
    const result = {
        countries: new Set(),
        states: new Set(),
        cities: new Set()
    };
    const hasCountry = hint.country && Array.isArray(hint.country);
    const hasState = hint.state && Array.isArray(hint.state);
    switch (true) {
        case hasCountry && hasState:
            hint.state.forEach(state => result.cities.add(...Object.values(destinationList[hint.country][state]).filter(city => regex.test(city))));
            break;
        case hasState:
            for (const [country, states] of Object.entries(destinationList)) {
                hint.state.forEach(state => { if (states[state]) result.cities.add(...states[state].filter(city => regex.test(city))); });
            }
            break;
        case hasCountry:
            hint.country.forEach(country => {
                if (destinationList[country]) {
                    result.states.add(...Object.keys(destinationList[country]).filter(state => regex.test(state)));
                    result.cities.add(...Object.values(destinationList[country]).flat().filter(city => regex.test(city)));
                }
            });
            break;
        default:
            // If no hint, iterate over the entire destination list
            for (const [country, states] of Object.entries(destinationList)) {
                if (regex.test(country)) result.countries.add(country);
                for (const [state, cities] of Object.entries(states)) {
                    if (regex.test(state)) result.states.add(state);
                    cities.forEach(city => { if (regex.test(city)) result.cities.add(city) });
                }
            }
            break;
    }

    const countriesArray = Array.from(result.countries);
    const statesArray = Array.from(result.states);
    const citiesArray = Array.from(result.cities);
    const totalDocs = Math.max(countriesArray.length, statesArray.length, citiesArray.length);

    return {
        countries: countriesArray.slice(Number(skip), Number(skip) + Number(perPage)),
        states: statesArray.slice(Number(skip), Number(skip) + Number(perPage)),
        cities: citiesArray.slice(Number(skip), Number(skip) + Number(perPage)),
        totalDocs
    };
};
