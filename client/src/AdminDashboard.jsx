import { useEffect, useState } from 'react';
import PasswordChangeForm from './PasswordChangeForm.jsx';
import { storePhotoFor } from './media.js';

async function readResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`The API returned an unexpected response (${response.status}).`);
  }
}

export default function AdminDashboard({ user, onLogOut }) {
  const [summary, setSummary] = useState(null);
  const [stores, setStores] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [order, setOrder] = useState('asc');
  const [storeSort, setStoreSort] = useState('name');
  const [form, setForm] = useState({ name: '', email: '', address: '', ownerEmail: '' });
  const [userSearch, setUserSearch] = useState('');
  const [userRole, setUserRole] = useState('all');
  const [userSort, setUserSort] = useState('name');
  const [userOrder, setUserOrder] = useState('asc');
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', address: '', role: 'user' });
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const token = sessionStorage.getItem('store-ratings-token');

  useEffect(() => {
    let cancelled = false;
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch('/api/admin/summary', { headers }).then(readResponse),
      fetch(`/api/admin/stores?search=${encodeURIComponent(search)}&sortBy=${storeSort}&order=${order}`, { headers }).then(readResponse),
      fetch(`/api/admin/users?search=${encodeURIComponent(userSearch)}&role=${userRole}&sortBy=${userSort}&order=${userOrder}`, { headers }).then(readResponse),
    ])
      .then(([summaryResult, storesResult, usersResult]) => {
        if (!cancelled) {
          setSummary(summaryResult.summary);
          setStores(storesResult.stores || []);
          setUsers(usersResult.users || []);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setMessage(error instanceof TypeError
            ? 'Could not reach the API. Make sure the server is running.'
            : error.message);
          setIsError(true);
        }
      });

    return () => { cancelled = true; };
  }, [token, search, order, storeSort, userSearch, userRole, userSort, userOrder, refresh]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function updateUserField(event) {
    setUserForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function createStore(event) {
    event.preventDefault();
    setIsSaving(true);
    setMessage('');
    setIsError(false);

    try {
      const response = await fetch('/api/admin/stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          name: form.name.trim(),
          email: form.email.trim(),
          address: form.address.trim(),
        }),
      });
      const result = await readResponse(response);
      if (!response.ok) {
        const validationErrors = result.errors?.map((error) => error.message).join('. ');
        throw new Error(validationErrors || result.message || 'Could not create store');
      }

      setForm({ name: '', email: '', address: '', ownerEmail: '' });
      setMessage('Store added successfully.');
      setRefresh((current) => current + 1);
    } catch (error) {
      setMessage(error instanceof TypeError
        ? 'Could not reach the API. Make sure the server is running.'
        : error.message);
      setIsError(true);
    } finally {
      setIsSaving(false);
    }
  }

  async function createUser(event) {
    event.preventDefault();
    setIsSaving(true);
    setMessage('');
    setIsError(false);

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...userForm,
          name: userForm.name.trim(),
          email: userForm.email.trim(),
          address: userForm.address.trim(),
        }),
      });
      const result = await readResponse(response);
      if (!response.ok) {
        const validationErrors = result.errors?.map((error) => error.message).join('. ');
        throw new Error(validationErrors || result.message || 'Could not create user');
      }

      setUserForm({ name: '', email: '', password: '', address: '', role: 'user' });
      setMessage('User account created successfully.');
      setRefresh((current) => current + 1);
    } catch (error) {
      setMessage(error instanceof TypeError
        ? 'Could not reach the API. Make sure the server is running.'
        : error.message);
      setIsError(true);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">SYSTEM ADMINISTRATOR</p>
          <h2>Good to see you, {user.name.split(' ')[0]}.</h2>
          <p className="muted">Manage the platform and its registered stores.</p>
        </div>
        <button className="button secondary logout-button" onClick={onLogOut}>Log out</button>
      </div>

      <div className="stat-grid">
        <article className="stat-card"><span>Total users</span><strong>{summary?.total_users ?? '—'}</strong></article>
        <article className="stat-card"><span>Total stores</span><strong>{summary?.total_stores ?? '—'}</strong></article>
        <article className="stat-card"><span>Ratings submitted</span><strong>{summary?.total_ratings ?? '—'}</strong></article>
      </div>

      <div className="admin-columns">
        <section className="admin-section">
          <p className="eyebrow">ADD A STORE</p>
          <h3>Register a store</h3>
          <form onSubmit={createStore} className="auth-form admin-form">
            <label>
              Store name
              <input name="name" value={form.name} onChange={updateField} minLength={20} maxLength={60} required placeholder="20–60 characters" />
            </label>
            <label>
              Store email
              <input name="email" type="email" value={form.email} onChange={updateField} required placeholder="store@example.com" />
            </label>
            <label>
              Address
              <textarea name="address" value={form.address} onChange={updateField} maxLength={400} required rows={2} placeholder="Up to 400 characters" />
            </label>
            <label>
              Store owner email (optional)
              <input name="ownerEmail" type="email" value={form.ownerEmail} onChange={updateField} placeholder="Create a store-owner account first" />
            </label>
            <button className="button" disabled={isSaving}>{isSaving ? 'Saving…' : 'Add store'}<span aria-hidden="true">→</span></button>
          </form>
        </section>

        <section className="admin-section store-management">
          <div className="store-management-heading">
            <div><p className="eyebrow">PLATFORM DIRECTORY</p><h3>Registered stores</h3></div>
            <div className="store-sort-controls">
              <select value={storeSort} onChange={(event) => setStoreSort(event.target.value)} aria-label="Sort stores by">
                <option value="name">Name</option>
                <option value="email">Email</option>
                <option value="address">Address</option>
                <option value="overall_rating">Rating</option>
              </select>
              <button className="sort-button" onClick={() => setOrder((current) => current === 'asc' ? 'desc' : 'asc')} aria-label="Reverse store sort order">{order === 'asc' ? '↑' : '↓'}</button>
            </div>
          </div>
          <label className="search-label">
            Filter stores
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, email, or address" />
          </label>
          <div className="admin-store-list">
            {stores.length === 0 ? (
              <div className="empty-state compact"><h3>No stores found</h3><p>Add a store with the form.</p></div>
            ) : stores.map((store) => (
              <article className="admin-store-row" key={store.id}>
                <img className="admin-store-thumb" src={storePhotoFor(store.name)} alt="Illustrative store photo" loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
                <div><strong>{store.name}</strong><span>{store.email}</span><small>{store.address}</small></div>
                <span className="store-rating-pill">★ {store.overall_rating ?? '—'}</span>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="admin-section user-management">
        <div className="user-management-grid">
          <div>
            <p className="eyebrow">ADD AN ACCOUNT</p>
            <h3>Create a user</h3>
            <form onSubmit={createUser} className="auth-form admin-form">
              <label>
                Name
                <input name="name" value={userForm.name} onChange={updateUserField} minLength={20} maxLength={60} required placeholder="20–60 characters" />
              </label>
              <label>
                Email
                <input name="email" type="email" value={userForm.email} onChange={updateUserField} required placeholder="person@example.com" />
              </label>
              <label>
                Temporary password
                <input name="password" type="password" value={userForm.password} onChange={updateUserField} minLength={8} maxLength={16} required placeholder="8–16 characters" />
                <span className="field-hint">Use an uppercase letter and a special character.</span>
              </label>
              <label>
                Address
                <textarea name="address" value={userForm.address} onChange={updateUserField} maxLength={400} required rows={2} placeholder="Up to 400 characters" />
              </label>
              <label>
                Role
                <select name="role" value={userForm.role} onChange={updateUserField}>
                  <option value="user">Normal user</option>
                  <option value="admin">System administrator</option>
                  <option value="store_owner">Store owner</option>
                </select>
              </label>
              <button className="button" disabled={isSaving}>{isSaving ? 'Saving…' : 'Create account'}<span aria-hidden="true">→</span></button>
            </form>
          </div>

          <div className="user-directory">
            <div className="store-management-heading">
              <div><p className="eyebrow">PLATFORM DIRECTORY</p><h3>Users</h3></div>
            </div>
            <div className="user-filters">
              <input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Filter name, email, address, role" aria-label="Filter users" />
              <select value={userRole} onChange={(event) => setUserRole(event.target.value)} aria-label="Filter by role">
                <option value="all">All roles</option>
                <option value="user">Normal user</option>
                <option value="admin">Administrator</option>
                <option value="store_owner">Store owner</option>
              </select>
              <select value={userSort} onChange={(event) => setUserSort(event.target.value)} aria-label="Sort users by">
                <option value="name">Sort: name</option>
                <option value="email">Sort: email</option>
                <option value="address">Sort: address</option>
                <option value="role">Sort: role</option>
              </select>
              <button className="sort-button" onClick={() => setUserOrder((current) => current === 'asc' ? 'desc' : 'asc')} aria-label="Reverse sort order">{userOrder === 'asc' ? '↑' : '↓'}</button>
            </div>
            <div className="user-list">
              {users.length === 0 ? (
                <div className="empty-state compact"><h3>No matching users</h3><p>Accounts will appear here.</p></div>
              ) : users.map((listedUser) => (
                <article className="admin-user-row" key={listedUser.id}>
                  <div><strong>{listedUser.name}</strong><span>{listedUser.email}</span><small>{listedUser.address}</small></div>
                  <div className="user-role-rating"><span className="role-pill">{listedUser.role.replace('_', ' ')}</span>{listedUser.role === 'store_owner' && <small>Rating: {listedUser.store_rating ?? 'No ratings'}</small>}</div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <PasswordChangeForm />

      {message && <p className={`message ${isError ? 'error' : 'success'}`} role={isError ? 'alert' : 'status'}>{message}</p>}
    </div>
  );
}
