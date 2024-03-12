import { subDisciplineEnum, disciplineEnum, keywords } from "./enum.js"
import { SequenceMatcher } from 'difflib';
export const disciplineRegexMatch = (search) => {
    const regex = new RegExp(search, "i");
    return Object.values(disciplineEnum).filter(ele => regex.test(ele)).slice(0, 5);
}
export const subDisciplineRegexMatch = (search) => {
    const regex = new RegExp(search, "i");
    return Object.values(subDisciplineEnum).filter(ele => regex.test(ele)).slice(0, 5);
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