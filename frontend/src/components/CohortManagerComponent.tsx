import React, { useState } from 'react';
import { Cohort } from '../types/cohort';
import { initiateNewCohort, INITIAL_COHORT } from '../utils/cohortManager';

const CohortManagerComponent: React.FC = () => {
    const [cohorts, setCohorts] = useState<Cohort[]>([INITIAL_COHORT]);
    const [activeCohortId, setActiveCohortId] = useState<string>(INITIAL_COHORT.id);

    const handleInitiateNewCohort = () => {
        const currentActiveCohort = cohorts.find(c => c.id === activeCohortId);
        const { newActiveCohort, previouslyActiveCohort } = initiateNewCohort(currentActiveCohort);

        setCohorts(prevCohorts => {
            const updatedCohorts = prevCohorts.map(cohort =>
                cohort.id === previouslyActiveCohort?.id
                    ? { ...cohort, isActive: false }
                    : cohort
            );
            return [...updatedCohorts, newActiveCohort];
        });
        setActiveCohortId(newActiveCohort.id);
    };

    return (
        <div>
            <h1>Cohort Management</h1>

            <button onClick={handleInitiateNewCohort}>
                Initiate New Cohort
            </button>

            <h2>Current Active Cohort:</h2>
            {cohorts.find(c => c.id === activeCohortId) ? (
                <div>
                    <p><strong>ID:</strong> {cohorts.find(c => c.id === activeCohortId)?.id}</p>
                    <p><strong>Name:</strong> {cohorts.find(c => c.id === activeCohortId)?.name}</p>
                    <p><strong>Ordinal:</strong> {cohorts.find(c => c.id === activeCohortId)?.ordinal}</p>
                    <p><strong>Start Date:</strong> {cohorts.find(c => c.id === activeCohortId)?.startDate.toDateString()}</p>
                    <p><strong>Active:</strong> {cohorts.find(c => c.id === activeCohortId)?.isActive ? 'Yes' : 'No'}</p>
                </div>
            ) : (
                <p>No active cohort found.</p>
            )}

            <h2>All Cohorts:</h2>
            <ul>
                {cohorts.map(cohort => (
                    <li key={cohort.id}>
                        <strong>{cohort.name}</strong> (Ordinal: {cohort.ordinal}, Active: {cohort.isActive ? 'Yes' : 'No'})
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default CohortManagerComponent;