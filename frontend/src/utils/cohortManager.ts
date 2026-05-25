import { Cohort, CohortInitiationData, CohortTransition } from '../../../cohort';

const NUMBER_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

/**
 * Utility to convert an ordinal number to a term like "Cohort One"
 */
export function formatCohortName(ordinal: number): string {
    const word = NUMBER_WORDS[ordinal] || ordinal.toString();
    return `Cohort ${word}`;
}

/**
 * Logic to initiate a new cohort based on the previous one.
 * Defaults to "Cohort One" if no previous cohort exists.
 * Returns a CohortTransition object detailing the new active cohort and the
 * previously active cohort (now marked as inactive, if applicable).
 */
export function initiateNewCohort(lastCohort?: Cohort, data?: CohortInitiationData): CohortTransition {
    const nextOrdinal = lastCohort ? lastCohort.ordinal + 1 : 1;
    
    const newActiveCohort: Cohort = {
        id: globalThis.crypto.randomUUID(),
        name: formatCohortName(nextOrdinal),
        ordinal: nextOrdinal,
        startDate: data?.startDate || new Date(),
        isActive: true
    };

    const previouslyActiveCohort: Cohort | undefined = lastCohort ? { ...lastCohort, isActive: false } : undefined;

    return { newActiveCohort, previouslyActiveCohort };
}

/**
 * Example initial state as requested
 */
export const INITIAL_COHORT: Cohort = {
    id: 'initial-id-1',
    name: 'Cohort One',
    ordinal: 1,
    startDate: new Date(),
    isActive: true
};