import { supabase } from '@/integrations/supabase/client';

/**
 * Normalizes a string by lowercasing, removing punctuation, and trimming spaces.
 * @param str The string to normalize
 * @returns The normalized string
 */
export function normalizeString(str: string | null | undefined): string {
    if (!str) return '';
    return str
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // remove punctuation
        .trim();
}

/**
 * Calculates a simple string similarity score between 0 and 1.
 * Currently uses simple containment/exact match logic for speed, 
 * but can be expanded to Levenshtein distance if needed.
 */
function calculateSimilarity(str1: string, str2: string): number {
    const s1 = normalizeString(str1);
    const s2 = normalizeString(str2);

    if (!s1 || !s2) return 0;
    if (s1 === s2) return 1;
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;

    // Very basic word overlap
    const words1 = s1.split(' ');
    const words2 = s2.split(' ');
    let matches = 0;
    for (const w1 of words1) {
        if (words2.includes(w1)) matches++;
    }
    return matches / Math.max(words1.length, words2.length);
}

export interface DLDMatchResult {
    area_id: string | null;
    developer_id: string | null;
    match_confidence: number;
    message?: string;
}

/**
 * Matches a portfolio holding with DLD data (areas and developers).
 * @param location The project location string from the holding
 * @param developer The project developer string from the holding
 * @returns DLDMatchResult with area_id, developer_id, and match_confidence
 */
export async function matchHoldingWithDLD(
    location: string | null,
    developer: string | null
): Promise<DLDMatchResult> {
    let matchedAreaId: string | null = null;
    let matchedDevId: string | null = null;
    let highestAreaScore = 0;
    let highestDevScore = 0;

    const targetLocation = normalizeString(location);
    const targetDeveloper = normalizeString(developer);

    try {
        // 1. Match Area
        if (targetLocation) {
            // Fetch all areas to find the best match (could be optimized with Postgres pg_trgm but keeping it simple as requested)
            const { data: areas, error: areaError } = await supabase
                .from('dld_areas')
                .select('id, name, name_normalized');

            if (!areaError && areas) {
                for (const area of areas) {
                    const score = calculateSimilarity(targetLocation, area.name_normalized || area.name);
                    if (score > highestAreaScore) {
                        highestAreaScore = score;
                        matchedAreaId = area.id;
                    }
                }
            }
        }

        // 2. Match Developer
        if (targetDeveloper) {
            const { data: devs, error: devError } = await supabase
                .from('dld_developers')
                .select('id, name, name_normalized');

            if (!devError && devs) {
                for (const dev of devs) {
                    const score = calculateSimilarity(targetDeveloper, dev.name_normalized || dev.name);
                    if (score > highestDevScore) {
                        highestDevScore = score;
                        matchedDevId = dev.id;
                    }
                }
            }
        }

        // Calculate overall confidence
        // We average the scores of the components that were provided
        let totalScore = 0;
        let componentsCount = 0;

        if (targetLocation) {
            totalScore += highestAreaScore;
            componentsCount++;
        }
        if (targetDeveloper) {
            totalScore += highestDevScore;
            componentsCount++;
        }

        const match_confidence = componentsCount > 0 ? totalScore / componentsCount : 0;

        if (match_confidence < 0.6) {
            return {
                area_id: null,
                developer_id: null,
                match_confidence,
                message: "data not matched"
            };
        }

        return {
            area_id: matchedAreaId,
            developer_id: matchedDevId,
            match_confidence
        };

    } catch (error) {
        console.error("Error matching holding with DLD data:", error);
        return {
            area_id: null,
            developer_id: null,
            match_confidence: 0,
            message: "Error during matching process"
        };
    }
}
