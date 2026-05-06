import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../utils/useDatabase';
import { useCategories } from '../context/CategoriesContext';
import { Trash2, Plus, Edit2, Save, X, CheckSquare, Square, ExternalLink, Search } from 'lucide-react';

const Categories = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const { internDict, certifications, loading, deleteCertification, updateCertification } = useDatabase();
  const { categories, addCategory, updateCategory, deleteCategory, getCategoryObject, getCategoryBadges } = useCategories();
  
  const [filter, setFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [editingCert, setEditingCert] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Bulk delete state
  const [selectedCerts, setSelectedCerts] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showBulkCategoryModal, setShowBulkCategoryModal] = useState(false);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkUpdating, setBulkUpdating] = useState(false);
  
  const [newCategory, setNewCategory] = useState({
    id: '',
    name: '',
    icon: '◎',
    fill_class: '',
    badge_class: 'badge-gray'
  });

  // Use dynamic categories or fallback to static
  const CATS = categories.length > 0 ? getCategoryObject() : {};
  const CAT_BADGE = categories.length > 0 ? getCategoryBadges() : {};

  // Category groups for filtering - use dynamic categories
  const categoryGroups = useMemo(() => {
    const allCategoryIds = Object.keys(CATS);
    return {
      'all': allCategoryIds,
      'web-dev': ['FE', 'BE', 'API'].filter(id => allCategoryIds.includes(id)),
      'security-cloud': ['CYBER', 'CLOUD'].filter(id => allCategoryIds.includes(id)),
      'ai-apis': ['AI', 'API'].filter(id => allCategoryIds.includes(id))
    };
  }, [CATS]);

  const handleDeleteCert = async (certId) => {
    const cert = certifications.find(c => c.id === certId);
    const certName = cert ? cert.name : 'this certification';
    
    if (window.confirm(`Are you sure you want to delete "${certName}"? This action cannot be undone.`)) {
      const { error } = await deleteCertification(certId);
      if (error) {
        alert('Failed to delete certification: ' + error.message);
      }
    }
  };

  // Bulk delete functions
  const handleSelectCert = (certId) => {
    const newSelected = new Set(selectedCerts);
    if (newSelected.has(certId)) {
      newSelected.delete(certId);
    } else {
      newSelected.add(certId);
    }
    setSelectedCerts(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedCerts.size === filteredCerts.length) {
      // Deselect all
      setSelectedCerts(new Set());
    } else {
      // Select all visible certifications that user can delete
      const selectableCerts = filteredCerts
        .filter(c => isAdmin || profile?.intern_id === c.intern_id)
        .map(c => c.id);
      setSelectedCerts(new Set(selectableCerts));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCerts.size === 0) return;
    
    const certNames = Array.from(selectedCerts)
      .map(id => certifications.find(c => c.id === id)?.name)
      .filter(Boolean)
      .slice(0, 3); // Show first 3 names
    
    const displayNames = certNames.join(', ') + (selectedCerts.size > 3 ? ` and ${selectedCerts.size - 3} more` : '');
    
    if (!window.confirm(`Are you sure you want to delete ${selectedCerts.size} certification(s)?\n\n${displayNames}\n\nThis action cannot be undone.`)) {
      return;
    }
    
    setBulkDeleting(true);
    let successCount = 0;
    let errorCount = 0;
    
    // Delete certifications one by one
    for (const certId of selectedCerts) {
      try {
        const { error } = await deleteCertification(certId);
        if (error) {
          errorCount++;
          console.error('Failed to delete certification:', certId, error);
        } else {
          successCount++;
        }
      } catch (error) {
        errorCount++;
        console.error('Exception deleting certification:', certId, error);
      }
    }
    
    setBulkDeleting(false);
    setSelectedCerts(new Set());
    
    if (errorCount > 0) {
      alert(`Deleted ${successCount} certifications successfully. ${errorCount} failed to delete.`);
    } else {
      alert(`Successfully deleted ${successCount} certification(s).`);
    }
  };

  const handleBulkCategoryChange = async () => {
    if (!bulkCategory) {
      alert('Please select a category');
      return;
    }
    
    setBulkUpdating(true);
    let successCount = 0;
    let errorCount = 0;
    
    // Update all in parallel for speed
    const updatePromises = Array.from(selectedCerts).map(certId =>
      updateCertification(certId, { category: bulkCategory })
    );
    
    const results = await Promise.all(updatePromises);
    results.forEach(result => {
      if (result.error) {
        errorCount++;
      } else {
        successCount++;
      }
    });
    
    setBulkUpdating(false);
    setShowBulkCategoryModal(false);
    setSelectedCerts(new Set());
    setBulkCategory('');
    
    if (errorCount > 0) {
      alert(`Updated ${successCount} certifications successfully. ${errorCount} failed.`);
    } else {
      alert(`✓ Successfully updated ${successCount} certification(s) to ${CATS[bulkCategory]?.name}`);
    }
  };

  const handleEditCert = (cert) => {
    setEditingCert({ ...cert });
  };

  const handleSaveCert = async () => {
    if (!editingCert) return;
    
    const { id, ...updates } = editingCert;
    const result = await updateCertification(id, updates);
    
    if (result.error) {
      alert('Failed to update certification: ' + result.error.message);
    } else {
      setEditingCert(null);
    }
  };

  const handleCancelEditCert = () => {
    setEditingCert(null);
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    const result = await addCategory(newCategory);
    if (result.success) {
      setShowAddModal(false);
      setNewCategory({ id: '', name: '', icon: '◎', fill_class: '', badge_class: 'badge-gray' });
    } else {
      alert('Failed to add category: ' + result.error);
    }
  };

  const handleDeleteCategory = async (catId) => {
    if (window.confirm(`Are you sure you want to delete this category? Existing certifications will keep their category.`)) {
      const result = await deleteCategory(catId);
      if (!result.success) {
        alert('Failed to delete category: ' + result.error);
      }
    }
  };

  const getInit = (first, last) => ((first?.[0] || '?') + (last?.[0] || '')).toUpperCase();
  const getTH = (cl) => cl.reduce((s, c) => s + (c.hours || 0), 0);

  // Filter certifications based on role - interns see only their own
  const displayCertifications = useMemo(() => {
    if (isAdmin) {
      return certifications;
    }
    // For interns, show only their own certifications
    return certifications.filter(c => c.intern_id === profile?.intern_id);
  }, [certifications, isAdmin, profile?.intern_id]);

  const filteredCerts = useMemo(() => {
    let certs = filter === 'all' ? displayCertifications : displayCertifications.filter(c => c.category === filter);
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      certs = certs.filter(c => 
        c.name?.toLowerCase().includes(term) ||
        c.provider?.toLowerCase().includes(term) ||
        internDict[c.intern_id]?.first_name?.toLowerCase().includes(term) ||
        internDict[c.intern_id]?.last_name?.toLowerCase().includes(term)
      );
    }
    
    return certs;
  }, [filter, displayCertifications, searchTerm, internDict]);

  // Calculate stats per category using displayCertifications
  const categoryStats = useMemo(() => {
    const filteredCategories = groupFilter === 'all' 
      ? Object.keys(CATS) 
      : categoryGroups[groupFilter];
    
    return filteredCategories.map(key => {
      const catCerts = displayCertifications.filter(c => c.category === key);
      const hours = getTH(catCerts);
      const activeInterns = new Set(catCerts.map(c => c.intern_id)).size;
      return {
        key,
        name: CATS[key].name,
        icon: CATS[key].icon,
        count: catCerts.length,
        hours,
        activeInterns,
        badge: CAT_BADGE[key]
      };
    });
  }, [displayCertifications, groupFilter]);

  if (loading) return <div style={{ color: 'var(--white)', padding: '40px' }}>Loading Track Data...</div>;

  return (
    <div id="page-categories" className="page active">
      <div className="section-header">
        <span className="section-title">{isAdmin ? 'CATEGORY OVERVIEW' : 'MY CATEGORY OVERVIEW'}</span>
      </div>

      {/* Admin Category Management Section */}
      {isAdmin && (
        <>
          <div className="section-header" style={{ marginTop: '40px' }}>
            <span className="section-title">MANAGE CATEGORIES</span>
            <button 
              className="btn btn-primary"
              onClick={() => setShowAddModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Plus size={16} /> ADD CATEGORY
            </button>
          </div>

          <div className="card">
            <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
              <table style={{ minWidth: '600px' }}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>NAME</th>
                    <th>ICON</th>
                    <th>COLOR</th>
                    <th>ORDER</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map(cat => (
                    <tr key={cat.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{cat.id}</td>
                      <td style={{ fontSize: '12px' }}>{cat.name}</td>
                      <td><span style={{ fontSize: '20px' }}>{cat.icon}</span></td>
                      <td><span className={`badge ${cat.badge_class}`}>{cat.badge_class}</span></td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{cat.display_order}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            className="btn btn-ghost" 
                            style={{ padding: '5px', color: 'var(--blue)' }}
                            onClick={() => setEditingCat(cat)}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            className="btn btn-ghost" 
                            style={{ padding: '5px', color: 'var(--red-light)' }}
                            onClick={() => handleDeleteCategory(cat.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Filter Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '30px',
        flexWrap: 'wrap'
      }}>
        {[
          { key: 'all', label: 'All' },
          { key: 'web-dev', label: 'Web dev' },
          { key: 'security-cloud', label: 'Security & cloud' },
          { key: 'ai-apis', label: 'AI & APIs' }
        ].map(group => (
          <button
            key={group.key}
            onClick={() => setGroupFilter(group.key)}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: groupFilter === group.key ? '1px solid var(--white)' : '1px solid var(--border2)',
              background: groupFilter === group.key ? 'var(--black3)' : 'transparent',
              color: groupFilter === group.key ? 'var(--white)' : 'var(--gray)',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (groupFilter !== group.key) {
                e.target.style.borderColor = 'var(--gray)';
              }
            }}
            onMouseLeave={(e) => {
              if (groupFilter !== group.key) {
                e.target.style.borderColor = 'var(--border2)';
              }
            }}
          >
            {group.label}
          </button>
        ))}
      </div>

      {/* Category Cards Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '20px', 
        marginBottom: '30px' 
      }}>
        {categoryStats.map(cat => {
          const borderColors = {
            'badge-ai': '#e74c3c',
            'badge-fe': '#3498db',
            'badge-be': '#2ecc71',
            'badge-api': '#f39c12',
            'badge-cyber': '#9b59b6',
            'badge-cloud': '#1abc9c',
            'badge-soft': '#e67e22'
          };
          
          return (
            <div 
              key={cat.key}
              className="card"
              style={{ 
                cursor: 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                border: filter === cat.key 
                  ? `2px solid ${borderColors[cat.badge] || 'var(--red-light)'}` 
                  : `1px solid ${borderColors[cat.badge] || 'var(--border)'}`,
                position: 'relative',
                overflow: 'hidden'
              }}
              onClick={() => setFilter(cat.key)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = `0 8px 24px ${borderColors[cat.badge]}40`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Top colored bar */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: borderColors[cat.badge] || 'var(--red-light)'
              }}></div>

              <div className="card-body" style={{ paddingTop: '20px' }}>
                {cat.count === 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    fontSize: '11px',
                    color: borderColors[cat.badge] || 'var(--gray)',
                    fontWeight: '500'
                  }}>
                    No certs yet
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <span 
                    className={`badge ${cat.badge}`} 
                    style={{ 
                      fontSize: '24px', 
                      padding: '12px',
                      background: `${borderColors[cat.badge]}20`
                    }}
                  >
                    {cat.icon}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--white)', marginBottom: '4px' }}>
                      {cat.name}
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--white)' }}>
                      {cat.count}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', paddingTop: '12px', borderTop: '1px solid var(--border2)' }}>
                  <span style={{ color: 'var(--gray2)' }}>Hours logged</span>
                  <span style={{ color: borderColors[cat.badge] || 'var(--white)', fontWeight: '600' }}>{cat.hours}h</span>
                </div>
                {isAdmin && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '4px' }}>
                    <span style={{ color: 'var(--gray2)' }}>Active interns</span>
                    <span style={{ color: 'var(--white)', fontWeight: '600' }}>{cat.activeInterns}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="section-header">
        <span className="section-title">{isAdmin ? 'CERTIFICATIONS BY CATEGORY' : 'MY CERTIFICATIONS BY CATEGORY'}</span>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div className="search-bar" style={{ width: '250px' }}>
            <Search size={14} color="var(--gray2)" />
            <input 
              type="text" 
              placeholder="Search certifications..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select className="form-input" style={{ width: '200px' }} value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All Categories</option>
            {Object.keys(CATS).map(key => (
              <option key={key} value={key}>{CATS[key].name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">
            {filter === 'all' ? 'ALL CERTIFICATIONS' : CATS[filter].name.toUpperCase()}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--gray2)' }}>
            {filteredCerts.length} total · {getTH(filteredCerts)}h total
          </span>
        </div>
        
        {/* Bulk Actions Bar */}
        {(isAdmin || profile?.role === 'intern') && (
          <div style={{ 
            padding: '12px 20px', 
            borderBottom: '1px solid var(--border2)', 
            background: selectedCerts.size > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.02)',
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            transition: 'all 0.2s'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                className="btn btn-ghost"
                onClick={handleSelectAll}
                style={{ 
                  fontSize: '11px', 
                  padding: '6px 12px',
                  color: selectedCerts.size > 0 ? 'var(--red-light)' : 'var(--gray)'
                }}
              >
                {selectedCerts.size === filteredCerts.filter(c => isAdmin || profile?.intern_id === c.intern_id).length && filteredCerts.length > 0 ? (
                  <><CheckSquare size={14} /> DESELECT ALL</>
                ) : (
                  <><Square size={14} /> SELECT ALL</>
                )}
              </button>
              {selectedCerts.size > 0 && (
                <span style={{ fontSize: '12px', color: 'var(--gray2)' }}>
                  {selectedCerts.size} selected
                </span>
              )}
            </div>
            
            {selectedCerts.size > 0 && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-outline"
                  onClick={() => setShowBulkCategoryModal(true)}
                  style={{ 
                    fontSize: '11px', 
                    padding: '6px 16px',
                    color: 'var(--blue)',
                    borderColor: 'var(--blue)'
                  }}
                >
                  <Edit2 size={14} /> CHANGE CATEGORY
                </button>
                
                <button
                  className="btn btn-outline"
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                  style={{ 
                    fontSize: '11px', 
                    padding: '6px 16px',
                    color: 'var(--red-light)',
                    borderColor: 'var(--red-light)'
                  }}
                >
                  <Trash2 size={14} /> {bulkDeleting ? 'DELETING...' : `DELETE ${selectedCerts.size}`}
                </button>
                
                {!isAdmin && (
                  <button
                    className="btn btn-outline"
                    onClick={() => {
                      const myCerts = filteredCerts.filter(c => profile?.intern_id === c.intern_id);
                      setSelectedCerts(new Set(myCerts.map(c => c.id)));
                    }}
                    style={{ 
                      fontSize: '11px', 
                      padding: '6px 16px',
                      color: 'var(--red-light)',
                      borderColor: 'var(--red-light)'
                    }}
                  >
                    SELECT ALL MINE
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        
        <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ minWidth: '600px' }}>
            <thead>
              <tr>
                {(isAdmin || profile?.role === 'intern') && <th style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={selectedCerts.size > 0 && selectedCerts.size === filteredCerts.filter(c => isAdmin || profile?.intern_id === c.intern_id).length}
                    onChange={handleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>}
                {isAdmin && <th>NAME</th>}
                <th>CERTIFICATION</th>
                <th>CATEGORY</th>
                <th>PROVIDER</th>
                <th>HRS</th>
                <th>DATE</th>
                <th>CERTIFICATE</th>
                {(isAdmin || profile?.role === 'intern') && <th>ACTIONS</th>}
              </tr>
            </thead>
            <tbody>
              {filteredCerts.map(c => {
                const intern = internDict[c.intern_id];
                const canEdit = isAdmin || profile?.intern_id === c.intern_id;
                const isEditing = editingCert?.id === c.id;
                
                return (
                  <tr key={c.id} style={{ background: selectedCerts.has(c.id) ? 'rgba(239, 68, 68, 0.1)' : 'transparent' }}>
                    {(isAdmin || profile?.role === 'intern') && (
                      <td>
                        {canEdit && (
                          <input
                            type="checkbox"
                            checked={selectedCerts.has(c.id)}
                            onChange={() => handleSelectCert(c.id)}
                            style={{ cursor: 'pointer' }}
                          />
                        )}
                      </td>
                    )}
                    {isAdmin && (
                      <td>
                        <div className="intern-name-cell">
                          <div className="avatar">{intern ? getInit(intern.first_name, intern.last_name) : '??'}</div>
                          <div className="intern-name">{intern ? `${intern.first_name} ${intern.last_name}` : 'Unknown'}</div>
                        </div>
                      </td>
                    )}
                    <td style={{ fontSize: '12px' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          className="form-input"
                          style={{ fontSize: '12px', padding: '4px 8px', width: '100%' }}
                          value={editingCert.name}
                          onChange={(e) => setEditingCert({ ...editingCert, name: e.target.value })}
                        />
                      ) : (
                        c.name
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <select
                          className="form-input"
                          style={{ fontSize: '12px', padding: '4px 8px' }}
                          value={editingCert.category}
                          onChange={(e) => setEditingCert({ ...editingCert, category: e.target.value })}
                        >
                          {Object.keys(CATS).map(key => (
                            <option key={key} value={key}>{CATS[key].name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`badge ${CAT_BADGE[c.category]}`}>{CATS[c.category]?.name || c.category}</span>
                      )}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--gray)' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          className="form-input"
                          style={{ fontSize: '12px', padding: '4px 8px', width: '100%' }}
                          value={editingCert.provider}
                          onChange={(e) => setEditingCert({ ...editingCert, provider: e.target.value })}
                        />
                      ) : (
                        c.provider
                      )}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                      {isEditing ? (
                        <input
                          type="number"
                          className="form-input"
                          style={{ fontSize: '12px', padding: '4px 8px', width: '60px' }}
                          value={editingCert.hours}
                          onChange={(e) => setEditingCert({ ...editingCert, hours: parseInt(e.target.value) || 0 })}
                        />
                      ) : (
                        `${c.hours}h`
                      )}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--gray)' }}>
                      {isEditing ? (
                        <input
                          type="date"
                          className="form-input"
                          style={{ fontSize: '11px', padding: '4px 8px' }}
                          value={editingCert.date}
                          onChange={(e) => setEditingCert({ ...editingCert, date: e.target.value })}
                        />
                      ) : (
                        c.date
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        {/* Only show certificate link if user provided URL (not uploaded to Supabase) */}
                        {c.certificate_file_url && !c.certificate_file_url.includes('supabase') && (
                          <a 
                            href={c.certificate_file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn btn-ghost"
                            style={{ padding: '4px', color: 'var(--blue)', fontSize: '10px' }}
                            title="View Certificate"
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}
                        {(!c.certificate_file_url || c.certificate_file_url.includes('supabase')) && (
                          <span style={{ fontSize: '10px', color: 'var(--gray)' }}>—</span>
                        )}
                      </div>
                    </td>
                    {(isAdmin || profile?.role === 'intern') && (
                      <td>
                        {canEdit && (
                          <div style={{ display: 'flex', gap: '5px' }}>
                            {isEditing ? (
                              <>
                                <button 
                                  className="btn btn-ghost" 
                                  style={{ padding: '5px', color: 'var(--green)' }}
                                  onClick={handleSaveCert}
                                  title="Save"
                                >
                                  <Save size={14} />
                                </button>
                                <button 
                                  className="btn btn-ghost" 
                                  style={{ padding: '5px', color: 'var(--gray)' }}
                                  onClick={handleCancelEditCert}
                                  title="Cancel"
                                >
                                  <X size={14} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button 
                                  className="btn btn-ghost" 
                                  style={{ padding: '5px', color: 'var(--blue)' }}
                                  onClick={() => handleEditCert(c)}
                                  title="Edit"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button 
                                  className="btn btn-ghost" 
                                  style={{ padding: '5px', color: 'var(--red-light)' }}
                                  onClick={() => handleDeleteCert(c.id)}
                                  title="Delete"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
              {filteredCerts.length === 0 && (
                <tr><td colSpan={isAdmin ? "7" : "6"} style={{ textAlign: 'center', padding: '30px', color: 'var(--gray)' }}>No certifications found in this category.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Category Modal */}
      {(showAddModal || editingCat) && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ maxWidth: '500px', width: '90%', margin: '20px' }}>
            <div className="card-header">
              <span className="card-title">{editingCat ? 'EDIT CATEGORY' : 'ADD NEW CATEGORY'}</span>
              <button 
                className="btn btn-ghost"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingCat(null);
                  setNewCategory({ id: '', name: '', icon: '◎', fill_class: '', badge_class: 'badge-gray' });
                }}
                style={{ padding: '5px' }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="card-body">
              <form onSubmit={editingCat ? async (e) => {
                e.preventDefault();
                const result = await updateCategory(editingCat.id, {
                  name: editingCat.name,
                  icon: editingCat.icon,
                  fill_class: editingCat.fill_class,
                  badge_class: editingCat.badge_class,
                  display_order: editingCat.display_order
                });
                if (result.success) {
                  setEditingCat(null);
                } else {
                  alert('Failed to update category: ' + result.error);
                }
              } : handleAddCategory}>
                <div className="form-group">
                  <label className="form-label">Category ID</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g., ML, DATA" 
                    required 
                    disabled={!!editingCat}
                    value={editingCat ? editingCat.id : newCategory.id}
                    onChange={(e) => editingCat 
                      ? setEditingCat({...editingCat, id: e.target.value})
                      : setNewCategory({...newCategory, id: e.target.value.toUpperCase()})
                    }
                  />
                  <small style={{ color: 'var(--gray2)', fontSize: '11px' }}>Short code (2-10 characters, uppercase)</small>
                </div>

                <div className="form-group">
                  <label className="form-label">Category Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g., Machine Learning" 
                    required 
                    value={editingCat ? editingCat.name : newCategory.name}
                    onChange={(e) => editingCat 
                      ? setEditingCat({...editingCat, name: e.target.value})
                      : setNewCategory({...newCategory, name: e.target.value})
                    }
                  />
                </div>

                <div className="grid-2" style={{ gap: '20px' }}>
                  <div className="form-group">
                    <label className="form-label">Icon</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="◎" 
                      required 
                      value={editingCat ? editingCat.icon : newCategory.icon}
                      onChange={(e) => editingCat 
                        ? setEditingCat({...editingCat, icon: e.target.value})
                        : setNewCategory({...newCategory, icon: e.target.value})
                      }
                    />
                    <small style={{ color: 'var(--gray2)', fontSize: '11px' }}>Unicode symbol</small>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Display Order</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      placeholder="0" 
                      value={editingCat ? editingCat.display_order : categories.length + 1}
                      onChange={(e) => editingCat 
                        ? setEditingCat({...editingCat, display_order: parseInt(e.target.value)})
                        : setNewCategory({...newCategory, display_order: parseInt(e.target.value)})
                      }
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Badge Color</label>
                  <select 
                    className="form-input" 
                    required
                    value={editingCat ? editingCat.badge_class : newCategory.badge_class}
                    onChange={(e) => editingCat 
                      ? setEditingCat({...editingCat, badge_class: e.target.value})
                      : setNewCategory({...newCategory, badge_class: e.target.value})
                    }
                  >
                    <option value="badge-gray">Gray</option>
                    <option value="badge-red">Red</option>
                    <option value="badge-blue">Blue</option>
                    <option value="badge-green">Green</option>
                    <option value="badge-teal">Teal</option>
                    <option value="badge-amber">Amber</option>
                    <option value="badge-purple">Purple</option>
                    <option value="badge-orange">Orange</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    <Save size={16} /> {editingCat ? 'UPDATE' : 'CREATE'}
                  </button>
                  <button 
                    type="button"
                    className="btn btn-ghost" 
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingCat(null);
                      setNewCategory({ id: '', name: '', icon: '◎', fill_class: '', badge_class: 'badge-gray' });
                    }}
                  >
                    CANCEL
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Category Change Modal */}
      {showBulkCategoryModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ maxWidth: '400px', width: '90%', margin: '20px' }}>
            <div className="card-header">
              <span className="card-title">CHANGE CATEGORY</span>
              <button 
                className="btn btn-ghost"
                onClick={() => {
                  setShowBulkCategoryModal(false);
                  setBulkCategory('');
                }}
                style={{ padding: '5px' }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="card-body">
              <p style={{ fontSize: '13px', color: 'var(--gray2)', marginBottom: '20px' }}>
                Change category for {selectedCerts.size} selected certification(s)
              </p>
              
              <div className="form-group">
                <label className="form-label">New Category</label>
                <select
                  className="form-input"
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">Select category...</option>
                  {Object.keys(CATS).map(key => (
                    <option key={key} value={key}>{CATS[key].name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={handleBulkCategoryChange}
                  disabled={bulkUpdating || !bulkCategory}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <Save size={16} /> {bulkUpdating ? 'UPDATING...' : 'UPDATE CATEGORY'}
                </button>
                <button 
                  className="btn btn-ghost" 
                  onClick={() => {
                    setShowBulkCategoryModal(false);
                    setBulkCategory('');
                  }}
                  disabled={bulkUpdating}
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
