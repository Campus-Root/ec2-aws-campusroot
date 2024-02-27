import { subDisciplineEnum,disciplineEnum } from "./enum.js"
export const disciplineRegexMatch = (search) => {
    const regex = new RegExp(search, "i");
    return Object.values(disciplineEnum).filter(ele => regex.test(ele));
}
export const subDisciplineRegexMatch = (search) => {
    const regex = new RegExp(search, "i");
    return Object.values(subDisciplineEnum).filter(ele => regex.test(ele));
}