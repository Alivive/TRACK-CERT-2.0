import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { booksClient } from '../utils/booksClient';
import { Book, BookOpen, CheckCircle, Clock, Plus, Trash2, Edit2, Save, X, Calendar, User } from 'lucide-react';

const ReadingList = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  
  const [books, setBooks] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(isAdmin ? 'library' : 'my-books');
  
  // Modals
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  
  // Forms
  const [bookForm, setBookForm] = useState({
    title: '',
    author: '',
    category: 'technical',
    description: '',
    pages: '',
    isbn: ''
  });
  
  const [assignForm, setAssignForm] = useState({
    book_id: '',
    intern_id: '',
    due_date: ''
  });

  useEffect(() => {
    loadData();
  }, [profile]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load books
      const booksRes = await booksClient.getBooks();
      if (booksRes.success) {
        setBooks(booksRes.data || []);
      }

      // Load assignments
      const assignmentsRes = isAdmin 
        ? await booksClient.getAssignments()
        : await booksClient.getAssignments(profile?.intern_id);
      
      if (assignmentsRes.success) {
        setAssignments(assignmentsRes.data || []);
      }

      // Load interns (admin only)
      if (isAdmin) {
        const { supabase } = await import('../utils/supabaseClient');
        const { data } = await supabase.from('interns').select('*').order('first_name');
        setInterns(data || []);
      }
    } catch (error) {
      console.error('[READING] Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBook = async (e) => {
    e.preventDefault();
    const result = await booksClient.addBook({
      ...bookForm,
      pages: parseInt(bookForm.pages) || null
    });
    
    if (result.success) {
      setBooks([...books, result.data]);
      setShowAddBookModal(false);
      setBookForm({ title: '', author: '', category: 'technical', description: '', pages: '', isbn: '' });
    } else {
      alert('Failed to add book: ' + result.error.message);
    }
  };

  const handleAssignBook = async (e) => {
    e.preventDefault();
    const result = await booksClient.assignBook(
      assignForm.book_id,
      assignForm.intern_id,
      assignForm.due_date || null
    );
    
    if (result.success) {
      await loadData();
      setShowAssignModal(false);
      setAssignForm({ book_id: '', intern_id: '', due_date: '' });
    } else {
      alert('Failed to assign book: ' + result.error.message);
    }
  };

  const handleUpdateStatus = async (assignmentId, newStatus) => {
    const result = await booksClient.updateAssignmentStatus(assignmentId, newStatus);
    if (result.success) {
      await loadData();
    } else {
      alert('Failed to update status: ' + result.error.message);
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (window.confirm('Remove this book assignment?')) {
      const result = await booksClient.deleteAssignment(assignmentId);
      if (result.success) {
        await loadData();
      }
    }
  };

  const handleDeleteBook = async (bookId) => {
    if (window.confirm('Delete this book? This will remove all assignments.')) {
      const result = await booksClient.deleteBook(bookId);
      if (result.success) {
        setBooks(books.filter(b => b.id !== bookId));
      }
    }
  };

  // Filter assignments for current user
  const myAssignments = useMemo(() => {
    if (isAdmin) return assignments;
    return assignments.filter(a => a.intern_id === profile?.intern_id);
  }, [assignments, isAdmin, profile]);

  // Stats
  const stats = useMemo(() => {
    const assigned = myAssignments.filter(a => a.status === 'assigned').length;
    const inProgress = myAssignments.filter(a => a.status === 'in-progress').length;
    const completed = myAssignments.filter(a => a.status === 'completed').length;
    
    return { assigned, inProgress, completed, total: myAssignments.length };
  }, [myAssignments]);

  const getStatusBadge = (status) => {
    const badges = {
      'assigned': { color: 'var(--gray)', icon: <Book size={12} />, label: 'ASSIGNED' },
      'in-progress': { color: '#f39c12', icon: <BookOpen size={12} />, label: 'READING' },
      'completed': { color: '#2ecc71', icon: <CheckCircle size={12} />, label: 'COMPLETED' }
    };
    
    const badge = badges[status] || badges.assigned;
    
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 10px',
        borderRadius: '6px',
        fontSize: '10px',
        fontWeight: '600',
        background: `${badge.color}20`,
        color: badge.color,
        border: `1px solid ${badge.color}40`
      }}>
        {badge.icon}
        {badge.label}
      </span>
    );
  };

  const getCategoryBadge = (category) => {
    const colors = {
      'technical': '#3498db',
      'leadership': '#9b59b6',
      'soft-skills': '#e67e22',
      'industry': '#1abc9c'
    };
    
    const color = colors[category] || colors.technical;
    
    return (
      <span style={{
        padding: '3px 8px',
        borderRadius: '4px',
        fontSize: '10px',
        fontWeight: '500',
        background: `${color}20`,
        color: color,
        textTransform: 'uppercase'
      }}>
        {category.replace('-', ' ')}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '14px', color: 'var(--gray)', marginBottom: '10px' }}>Loading reading list...</div>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--border2)', borderTop: '3px solid var(--red-light)', borderRadius: '50%', margin: '0 auto', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <div id="page-reading" className="page active">
      <div className="section-header">
        <span className="section-title">READING LIST</span>
        {isAdmin && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-ghost" onClick={() => setShowAssignModal(true)}>
              <User size={14} /> ASSIGN BOOK
            </button>
            <button className="btn btn-primary" onClick={() => setShowAddBookModal(true)}>
              <Plus size={14} /> ADD BOOK
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="stats-grid" style={{ marginBottom: '30px' }}>
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-label">TOTAL BOOKS</div>
            <Book size={18} color="var(--red-light)" />
          </div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-delta">Assigned to you</div>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-label">READING</div>
            <BookOpen size={18} color="#f39c12" />
          </div>
          <div className="stat-value">{stats.inProgress}</div>
          <div className="stat-delta">In progress</div>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-label">COMPLETED</div>
            <CheckCircle size={18} color="#2ecc71" />
          </div>
          <div className="stat-value">{stats.completed}</div>
          <div className="stat-delta">Books finished</div>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-label">PENDING</div>
            <Clock size={18} color="var(--gray)" />
          </div>
          <div className="stat-value">{stats.assigned}</div>
          <div className="stat-delta">Not started</div>
        </div>
      </div>

      {/* Tabs */}
      {isAdmin && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border2)' }}>
          <button
            onClick={() => setActiveTab('library')}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'library' ? '2px solid var(--red-light)' : '2px solid transparent',
              color: activeTab === 'library' ? 'var(--white)' : 'var(--gray)',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            BOOK LIBRARY
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'assignments' ? '2px solid var(--red-light)' : '2px solid transparent',
              color: activeTab === 'assignments' ? 'var(--white)' : 'var(--gray)',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            ALL ASSIGNMENTS
          </button>
        </div>
      )}

      {/* Book Library (Admin) */}
      {isAdmin && activeTab === 'library' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">BOOK LIBRARY</span>
            <span style={{ fontSize: '12px', color: 'var(--gray2)' }}>{books.length} books</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {books.map(book => (
                <div key={book.id} className="card" style={{ background: 'var(--black3)', border: '1px solid var(--border2)' }}>
                  <div className="card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      {getCategoryBadge(book.category)}
                      <button
                        className="btn btn-ghost"
                        style={{ padding: '4px', color: 'var(--red-light)' }}
                        onClick={() => handleDeleteBook(book.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '6px', lineHeight: '1.3' }}>{book.title}</h3>
                    <p style={{ fontSize: '12px', color: 'var(--gray)', marginBottom: '8px' }}>{book.author}</p>
                    {book.description && (
                      <p style={{ fontSize: '11px', color: 'var(--gray2)', marginBottom: '12px', lineHeight: '1.4' }}>
                        {book.description.substring(0, 100)}{book.description.length > 100 ? '...' : ''}
                      </p>
                    )}
                    {book.pages && (
                      <div style={{ fontSize: '11px', color: 'var(--gray2)', marginBottom: '12px' }}>
                        📖 {book.pages} pages
                      </div>
                    )}
                    <button
                      className="btn btn-ghost"
                      style={{ width: '100%', justifyContent: 'center', fontSize: '11px' }}
                      onClick={() => {
                        setAssignForm({ ...assignForm, book_id: book.id });
                        setShowAssignModal(true);
                      }}
                    >
                      <User size={12} /> ASSIGN TO INTERN
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Assignments View */}
      {(activeTab === 'assignments' || activeTab === 'my-books') && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">{isAdmin ? 'ALL ASSIGNMENTS' : 'MY READING LIST'}</span>
            <span style={{ fontSize: '12px', color: 'var(--gray2)' }}>{myAssignments.length} assignments</span>
          </div>
          <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
            <table style={{ minWidth: '800px' }}>
              <thead>
                <tr>
                  {isAdmin && <th>INTERN</th>}
                  <th>BOOK</th>
                  <th>AUTHOR</th>
                  <th>CATEGORY</th>
                  <th>STATUS</th>
                  <th>ASSIGNED</th>
                  <th>DUE DATE</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {myAssignments.length > 0 ? myAssignments.map(assignment => (
                  <tr key={assignment.id}>
                    {isAdmin && (
                      <td>
                        <div style={{ fontSize: '12px', fontWeight: '600' }}>
                          {assignment.intern_first_name} {assignment.intern_last_name}
                        </div>
                      </td>
                    )}
                    <td>
                      <div style={{ fontSize: '13px', fontWeight: '600' }}>{assignment.book_title}</div>
                      {assignment.book_pages && (
                        <div style={{ fontSize: '10px', color: 'var(--gray2)' }}>{assignment.book_pages} pages</div>
                      )}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--gray)' }}>{assignment.book_author}</td>
                    <td>{getCategoryBadge(assignment.book_category)}</td>
                    <td>{getStatusBadge(assignment.status)}</td>
                    <td style={{ fontSize: '11px', color: 'var(--gray2)', fontFamily: 'var(--font-mono)' }}>
                      {new Date(assignment.assigned_at).toLocaleDateString()}
                    </td>
                    <td style={{ fontSize: '11px', color: 'var(--gray2)', fontFamily: 'var(--font-mono)' }}>
                      {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        {assignment.status === 'assigned' && (
                          <button
                            className="btn btn-ghost"
                            style={{ padding: '5px 10px', fontSize: '10px', color: '#f39c12' }}
                            onClick={() => handleUpdateStatus(assignment.id, 'in-progress')}
                          >
                            START
                          </button>
                        )}
                        {assignment.status === 'in-progress' && (
                          <button
                            className="btn btn-ghost"
                            style={{ padding: '5px 10px', fontSize: '10px', color: '#2ecc71' }}
                            onClick={() => handleUpdateStatus(assignment.id, 'completed')}
                          >
                            COMPLETE
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            className="btn btn-ghost"
                            style={{ padding: '5px', color: 'var(--red-light)' }}
                            onClick={() => handleDeleteAssignment(assignment.id)}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={isAdmin ? "8" : "7"} style={{ textAlign: 'center', padding: '40px', color: 'var(--gray)' }}>
                      {isAdmin ? 'No book assignments yet.' : 'No books assigned to you yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Book Modal */}
      {showAddBookModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%' }}>
            <div className="card-header">
              <span className="card-title">ADD NEW BOOK</span>
              <button className="btn btn-ghost" style={{ padding: '5px' }} onClick={() => setShowAddBookModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="card-body">
              <form onSubmit={handleAddBook}>
                <div className="form-group">
                  <label className="form-label">Book Title</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={bookForm.title}
                    onChange={e => setBookForm({ ...bookForm, title: e.target.value })}
                    placeholder="e.g., Clean Code"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Author</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={bookForm.author}
                    onChange={e => setBookForm({ ...bookForm, author: e.target.value })}
                    placeholder="e.g., Robert C. Martin"
                  />
                </div>
                <div className="grid-2" style={{ gap: '15px' }}>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      className="form-input"
                      value={bookForm.category}
                      onChange={e => setBookForm({ ...bookForm, category: e.target.value })}
                    >
                      <option value="technical">Technical</option>
                      <option value="leadership">Leadership</option>
                      <option value="soft-skills">Soft Skills</option>
                      <option value="industry">Industry</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pages</label>
                    <input
                      type="number"
                      className="form-input"
                      value={bookForm.pages}
                      onChange={e => setBookForm({ ...bookForm, pages: e.target.value })}
                      placeholder="e.g., 464"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-input"
                    rows="3"
                    value={bookForm.description}
                    onChange={e => setBookForm({ ...bookForm, description: e.target.value })}
                    placeholder="Brief description of the book..."
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">ISBN (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={bookForm.isbn}
                    onChange={e => setBookForm({ ...bookForm, isbn: e.target.value })}
                    placeholder="e.g., 978-0132350884"
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                    <Plus size={16} /> ADD BOOK
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowAddBookModal(false)}>
                    CANCEL
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Assign Book Modal */}
      {showAssignModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="card" style={{ maxWidth: '450px', width: '100%' }}>
            <div className="card-header">
              <span className="card-title">ASSIGN BOOK TO INTERN</span>
              <button className="btn btn-ghost" style={{ padding: '5px' }} onClick={() => setShowAssignModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="card-body">
              <form onSubmit={handleAssignBook}>
                <div className="form-group">
                  <label className="form-label">Select Book</label>
                  <select
                    className="form-input"
                    required
                    value={assignForm.book_id}
                    onChange={e => setAssignForm({ ...assignForm, book_id: e.target.value })}
                  >
                    <option value="">Choose a book...</option>
                    {books.map(book => (
                      <option key={book.id} value={book.id}>
                        {book.title} - {book.author}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Select Intern</label>
                  <select
                    className="form-input"
                    required
                    value={assignForm.intern_id}
                    onChange={e => setAssignForm({ ...assignForm, intern_id: e.target.value })}
                  >
                    <option value="">Choose an intern...</option>
                    {interns.map(intern => (
                      <option key={intern.id} value={intern.id}>
                        {intern.first_name} {intern.last_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date (Optional)</label>
                  <input
                    type="date"
                    className="form-input"
                    value={assignForm.due_date}
                    onChange={e => setAssignForm({ ...assignForm, due_date: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                    <User size={16} /> ASSIGN BOOK
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowAssignModal(false)}>
                    CANCEL
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReadingList;
