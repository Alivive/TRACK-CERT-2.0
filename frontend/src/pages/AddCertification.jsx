import React, { useState } from 'react';
import { useCohorts } from '../context/CohortContext';
import { useDatabase } from '../utils/useDatabase'; // Assuming this hook exists
import { Cohort } from '../components/cohort';
import { useCategories } from '../context/CategoriesContext';
import { Plus } from 'lucide-react';

const AddCertification = () => {
  const { activeCohort } = useCohorts();
  const { addCertification, interns } = useDatabase(); // Assuming addCertification is now available
  const { categories } = useCategories();

  const [newCert, setNewCert] = useState({
    intern_id: '',
    name: '',
    provider: '',
    hours: 0,
    date: new Date().toISOString().split('T')[0],
    category: '',
    certificate_file: null,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, files } = e.target;
    setNewCert((prev) => ({
      ...prev,
      [name]: type === 'file' ? files[0] : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    if (!activeCohort || !activeCohort.id) {
      alert('No active cohort found. Please select or create a cohort.');
      setIsSaving(false);
      return;
    }

    try {
      const certData = {
        ...newCert,
        cohort_id: activeCohort.id, // Associate with the active cohort
        hours: parseInt(newCert.hours, 10),
      };
      const { error } = await addCertification(certData);

      if (error) {
        alert('Failed to add certification: ' + error.message);
      } else {
        alert('Certification added successfully!');
        setNewCert({
          intern_id: '',
          name: '',
          provider: '',
          hours: 0,
          date: new Date().toISOString().split('T')[0],
          category: '',
          certificate_file: null,
        });
      }
    } catch (err) {
      alert('Error adding certification: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">ADD NEW CERTIFICATION</span>
        <span style={{ fontSize: '12px', color: 'var(--gray)', marginLeft: '10px' }}>
          FOR COHORT: {activeCohort?.name || 'N/A'}
        </span>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Intern</label>
            <select name="intern_id" value={newCert.intern_id} onChange={handleInputChange} className="form-input" required>
              <option value="">Select an Intern</option>
              {interns.map(intern => (
                <option key={intern.id} value={intern.id}>{intern.first_name} {intern.last_name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Certification Name</label>
            <input type="text" name="name" value={newCert.name} onChange={handleInputChange} className="form-input" required />
          </div>
          <div className="form-group">
            <label className="form-label">Provider</label>
            <input type="text" name="provider" value={newCert.provider} onChange={handleInputChange} className="form-input" required />
          </div>
          <div className="form-group">
            <label className="form-label">Hours</label>
            <input type="number" name="hours" value={newCert.hours} onChange={handleInputChange} className="form-input" required />
          </div>
          <div className="form-group">
            <label className="form-label">Date Completed</label>
            <input type="date" name="date" value={newCert.date} onChange={handleInputChange} className="form-input" required />
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select name="category" value={newCert.category} onChange={handleInputChange} className="form-input" required>
              <option value="">Select a Category</option>
              {Object.keys(categories).map(key => (
                <option key={key} value={key}>{categories[key].name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Certificate File (PDF, JPG, PNG)</label>
            <input type="file" name="certificate_file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleInputChange} className="form-input" />
          </div>
          <button type="submit" className="btn btn-primary" disabled={isSaving}>
            <Plus size={16} /> {isSaving ? 'ADDING...' : 'ADD CERTIFICATION'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddCertification;