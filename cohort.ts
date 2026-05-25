export interface Cohort {
    id: string;
    name: string; // e.g., "Cohort One"
    ordinal: number; // e.g., 1
    startDate: Date;
    isActive: boolean;
}

export type CohortInitiationData = Omit<Cohort, 'id' | 'name' | 'ordinal' | 'isActive'>;

export interface CohortTransition {
    newActiveCohort: Cohort;
    previouslyActiveCohort?: Cohort;
}