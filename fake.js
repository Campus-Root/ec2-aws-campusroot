import { disciplineEnum, subDisciplineEnum } from "./src/utils/enum.js";

// class TrieNode {
//     constructor() {
//         this.children = new Map();
//         this.isEndOfWord = false;
//     }
// }

// class Trie {
//     constructor() {
//         this.root = new TrieNode();
//     }

//     insert(word) {
//         let node = this.root;
//         for (const char of word) {
//             if (!node.children.has(char)) {
//                 node.children.set(char, new TrieNode());
//             }
//             node = node.children.get(char);
//         }
//         node.isEndOfWord = true;
//     }

//     findClosestString(input) {
//         let node = this.root;
//         let prefix = '';

//         for (const char of input) {
//             if (node.children.has(char)) {
//                 prefix += char;
//                 node = node.children.get(char);
//             } else {
//                 break;
//             }
//         }

//         if (!prefix) return null;

//         const queue = [[node, prefix]];
//         let closestString = null;
//         let minDistance = Number.MAX_SAFE_INTEGER;

//         while (queue.length > 0) {
//             const [currentNode, currentPrefix] = queue.shift();

//             if (currentNode.isEndOfWord) {
//                 const distance = levenshteinDistance(input, currentPrefix);
//                 if (distance < minDistance) {
//                     minDistance = distance;
//                     closestString = currentPrefix;
//                 }
//             }

//             for (const [char, nextNode] of currentNode.children) {
//                 queue.push([nextNode, currentPrefix + char]);
//             }
//         }

//         return closestString;
//     }
// }

// // Function to calculate Levenshtein distance between two strings
// function levenshteinDistance(s1, s2) {
//     const len1 = s1.length;
//     const len2 = s2.length;
//     const matrix = [];

//     for (let i = 0; i <= len1; i++) {
//         matrix[i] = [i];
//     }
//     for (let j = 0; j <= len2; j++) {
//         matrix[0][j] = j;
//     }

//     for (let i = 1; i <= len1; i++) {
//         for (let j = 1; j <= len2; j++) {
//             const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
//             matrix[i][j] = Math.min(
//                 matrix[i - 1][j] + 1,
//                 matrix[i][j - 1] + 1,
//                 matrix[i - 1][j - 1] + cost
//             );
//         }
//     }

//     return matrix[len1][len2];
// }

// // Example usage:
// const predefinedStrings = [...Object.values(subDisciplineEnum),...Object.values(disciplineEnum)];
// const trie = new Trie();
// predefinedStrings.forEach(word => trie.insert(word));

// const inputString = 'history';
// const closestString = trie.findClosestString(inputString);
// console.log('Closest string:', closestString);


function findClosestString(input, predefinedStrings) {
    let closestString = null;
    let minDistance = Number.MAX_SAFE_INTEGER;

    // Loop through all predefined strings
    predefinedStrings.forEach((str) => {
        const distance = levenshteinDistance(input, str);
        if (distance < minDistance) {
            minDistance = distance;
            closestString = str;
        }
    });

    return closestString;
}

// Function to calculate Levenshtein distance between two strings
function levenshteinDistance(s1, s2) {
    const len1 = s1.length;
    const len2 = s2.length;
    const matrix = [];

    // Initialize matrix with 0s
    for (let i = 0; i <= len1; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
    }

    // Calculate Levenshtein distance
    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }

    return matrix[len1][len2];
}

// Example usage:
const predefinedStrings = [...Object.values(subDisciplineEnum),...Object.values(disciplineEnum)];
const inputString = 'interi';
const closestString = findClosestString(inputString, predefinedStrings);
console.log('Closest string:', closestString);
