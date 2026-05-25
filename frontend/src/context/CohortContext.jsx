import { createContext, useContext, useState, useEffect } from 'react';
import { INITIAL_COHORT, initiateNewCohort } from '../utils/cohortManager';

const CohortContext = createContext();

export const CohortProvider = ({ children }) => {
  // Load from localStorage or default to Cohort One
  const [activeCohort, setActiveCohort] = useState(() => {
    const saved = localStorage.getItem('active_cohort');
    if (saved) {
        const parsed = JSON.parse(saved);
        return { ...parsed, startDate: new Date(parsed.startDate) };
    }
    return INITIAL_COHORT;
  });

  const [allCohorts, setAllCohorts] = useState(() => {
    const saved = localStorage.getItem('all_cohorts');
    if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map(c => ({ ...c, startDate: new Date(c.startDate) }));
    }
    return [INITIAL_COHORT];
  });

  useEffect(() => {
    localStorage.setItem('active_cohort', JSON.stringify(activeCohort));
    localStorage.setItem('all_cohorts', JSON.stringify(allCohorts));
  }, [activeCohort, allCohorts]);

  const startNextCohort = (data) => {
    const { newActiveCohort, previouslyActiveCohort } = initiateNewCohort(activeCohort, data);
    
    setAllCohorts(prev => {
      const updated = prev.map(c => c.id === previouslyActiveCohort?.id ? previouslyActiveCohort : c);
      return [...updated, newActiveCohort];
    });
    setActiveCohort(newActiveCohort);
  };

  return (
    <CohortContext.Provider value={{ activeCohort, allCohorts, startNextCohort }}>
      {children}
    </CohortContext.Provider>
  );
};

export const useCohorts = () => useContext(CohortContext);