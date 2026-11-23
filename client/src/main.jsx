import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import AdminDashboard from './AdminDashboard.jsx';
import OwnerDashboard from './OwnerDashboard.jsx';
import PasswordChangeForm from './PasswordChangeForm.jsx';
import RatingStars from './RatingStars.jsx';
import { communityPortraits, storePhotoFor } from './media.js';

const creator = {
  name: 'Rutvi Godhaniya',
  github: 'https://github.com/RutviGodhaniya',
  linkedin: 'https://www.linkedin.com/in/rutvi-godhaniya-3a3a52336/',
};
import './style.css';

function readSavedUser() {
  try {
    return JSON.parse(sessionStorage.getItem('store-ratings-user') || 'null');
  } catch {
    return null;
  }
}

async function readApiResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`The API returned an unexpected response (${response.status}).`);
  }
}

function UserDashboard({ user, onLogOut }) {
  const [stores, setStores] = useState([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [order, setOrder] = useState('asc');
  const [drafts, setDrafts] = useState({});
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const token = sessionStorage.getItem('store-ratings-token');

    fetch(`/api/stores?search=${encodeURIComponent(search)}&sortBy=${sortBy}&order=${order}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(readApiResponse)
      .then((result) => {
        if (!cancelled) {
          setStores(result.stores || []);
          setMessage('');
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
  }, [search, user.id, refresh, sortBy, order]);

  async function saveRating(storeId) {
    const store = stores.find((item) => item.id === storeId);
    const score = Number(drafts[storeId] ?? store?.user_rating ?? 5);
    const token = sessionStorage.getItem('store-ratings-token');
    setMessage('');
    setIsError(false);

    try {
      const response = await fetch(`/api/stores/${storeId}/rating`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ score }),
      });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(result.message || 'Could not save your rating');
      setMessage('Your rating has been saved.');
      setRefresh((current) => current + 1);
    } catch (error) {
      setMessage(error instanceof TypeError
        ? 'Could not reach the API. Make sure the server is running.'
        : error.message);
      setIsError(true);
    }
  }

  return (
    <div className="user-dashboard">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">YOUR COMMUNITY</p>
          <h2>Welcome, {user.name.split(' ')[0]}.</h2>
          <p className="muted">Find a store and share your experience.</p>
        </div>
        <button className="button secondary logout-button" onClick={onLogOut}>Log out</button>
      </div>

      <label className="search-label">
        Search stores
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by store name or address" />
      </label>

      <div className="list-toolbar">
        <label>Sort by
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="name">Name</option>
            <option value="address">Address</option>
            <option value="overall_rating">Overall rating</option>
          </select>
        </label>
        <button className="sort-button" onClick={() => setOrder((current) => current === 'asc' ? 'desc' : 'asc')}>
          {order === 'asc' ? 'Ascending ↑' : 'Descending ↓'}
        </button>
      </div>

      {message && <p className={`message ${isError ? 'error' : 'success'}`} role={isError ? 'alert' : 'status'}>{message}</p>}

      {stores.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">⌕</span>
          <h3>{search ? 'No matching stores' : 'No stores yet'}</h3>
          <p>{search ? 'Try another name or address.' : 'Stores will appear here after an administrator adds them.'}</p>
        </div>
      ) : (
        <div className="store-list">
          {stores.map((store) => (
            <article className="store-card" key={store.id}>
              <div className="store-photo">
                <img src={storePhotoFor(store.name)} alt="Illustrative neighborhood store interior" loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
                <span className="photo-label">ILLUSTRATIVE PHOTO</span>
              </div>
              <div className="store-card-top">
                <div>
                  <h3>{store.name}</h3>
                  <p>{store.address}</p>
                </div>
                <div className="average-rating">
                  <span className="note-icon">★</span>
                  <strong>{store.overall_rating ?? '—'}</strong>
                  <small>{store.rating_count} {store.rating_count === 1 ? 'rating' : 'ratings'}</small>
                </div>
              </div>
              <div className="store-rating-summary">
                <RatingStars value={store.overall_rating} />
                <span>{store.overall_rating ? `${store.overall_rating} average` : 'Be the first to rate'}</span>
              </div>
              <div className="rating-controls">
                <label>
                  Your rating
                  <select
                    value={drafts[store.id] ?? store.user_rating ?? '5'}
                    onChange={(event) => setDrafts((current) => ({ ...current, [store.id]: event.target.value }))}
                  >
                    {[1, 2, 3, 4, 5].map((score) => <option key={score} value={score}>{score} / 5</option>)}
                  </select>
                </label>
                <button className="button" onClick={() => saveRating(store.id)}>
                  {store.user_rating ? 'Update rating' : 'Submit rating'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <PasswordChangeForm />
    </div>
  );
}

function App() {
  const [user, setUser] = useState(readSavedUser);
  const [mode, setMode] = useState('register');
  const [form, setForm] = useState({ name: '', email: '', address: '', password: '' });
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submitForm(event) {
    event.preventDefault();
    setMessage('');
    setIsError(false);
    setIsSubmitting(true);

    const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
    const body = mode === 'register'
      ? { ...form, name: form.name.trim(), email: form.email.trim(), address: form.address.trim() }
      : { email: form.email.trim(), password: form.password };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const responseText = await response.text();
      let result;
      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch {
        throw new Error(`The API returned a non-JSON response (${response.status}). Check that the server is running.`);
      }

      if (!responseText) {
        throw new Error(`The API returned an empty response (${response.status}). Check the server terminal.`);
      }

      if (!response.ok) {
        const validationErrors = result.errors?.map((error) => error.message).join('. ');
        throw new Error(validationErrors || result.message || 'Something went wrong');
      }

      sessionStorage.setItem('store-ratings-user', JSON.stringify(result.user));
      sessionStorage.setItem('store-ratings-token', result.token);
      setUser(result.user);
      setMessage(mode === 'register' ? 'Your account is ready.' : 'You are logged in.');
      setForm({ name: '', email: '', address: '', password: '' });
    } catch (error) {
      setMessage(error instanceof TypeError
        ? 'Could not reach the API. Start the server in the server folder, then try again.'
        : error.message || 'Something went wrong. Check that both apps are running.');
      setIsError(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  function logOut() {
    sessionStorage.removeItem('store-ratings-user');
    sessionStorage.removeItem('store-ratings-token');
    setUser(null);
    setMessage('You have logged out.');
    setIsError(false);
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setMessage('');
    setIsError(false);
  }

  return (
    <main className="page">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Store Ratings home">SR</a>
        <span className="brand-name">Store Ratings</span>
        <span className="topbar-note">A better way to share your experience</span>
      </header>

      <section className={`layout ${user?.role === 'admin' ? 'admin-layout' : ''}`}>
        <div className="intro-panel">
          <p className="eyebrow">COMMUNITY REVIEWS</p>
          <h1>Find a store.<br />Share your view.</h1>
          <p className="intro-copy">Honest ratings help people discover great local businesses.</p>
          <div className="hero-photo">
            <img src={storePhotoFor('coffee house')} alt="Illustrative warm neighborhood coffee shop interior" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
            <div className="hero-photo-caption"><span>GOOD PLACES, SHARED</span><strong>Discover your next local favorite.</strong></div>
            <div className="hero-score-card"><RatingStars value={5} /><span>Ratings from 1 to 5</span></div>
          </div>
          <div className="community-proof">
            <div className="portrait-stack">
              {communityPortraits.map((portrait, index) => <img key={`${portrait}-${index}`} src={portrait} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none'; }} />)}
              <span>+</span>
            </div>
            <div><strong>Built around community</strong><small>Illustrative portraits · real user ratings</small></div>
          </div>
        </div>

        <section className={`auth-card ${user?.role === 'admin' ? 'admin-card' : ''}`} aria-labelledby="auth-title">
          {user?.role === 'admin' ? (
            <AdminDashboard user={user} onLogOut={logOut} />
          ) : user?.role === 'user' ? (
            <UserDashboard user={user} onLogOut={logOut} />
          ) : user?.role === 'store_owner' ? (
            <OwnerDashboard user={user} onLogOut={logOut} />
          ) : user ? (
            <div className="signed-in">
              <p className="eyebrow">YOU’RE SIGNED IN</p>
              <h2 id="auth-title">Welcome, {user.name.split(' ')[0]}.</h2>
              <p className="muted">Your account role is <strong>{user.role}</strong>.</p>
              <p className="message success" role="status">{message || 'Your account is connected.'}</p>
              <button className="button secondary" onClick={logOut}>Log out</button>
            </div>
          ) : (
            <>
              <div className="card-heading">
                <p className="eyebrow">GET STARTED</p>
                <h2 id="auth-title">{mode === 'register' ? 'Create your account' : 'Welcome back'}</h2>
                <p className="muted">{mode === 'register' ? 'Join the community and rate local stores.' : 'Log in to continue to your account.'}</p>
              </div>

              <div className="mode-switch" role="tablist" aria-label="Account action">
                <button className={mode === 'register' ? 'active' : ''} onClick={() => switchMode('register')} role="tab" aria-selected={mode === 'register'}>Sign up</button>
                <button className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')} role="tab" aria-selected={mode === 'login'}>Log in</button>
              </div>

              <form onSubmit={submitForm} className="auth-form">
                {mode === 'register' && (
                  <>
                    <label>
                      Full name
                      <input name="name" autoComplete="name" value={form.name} onChange={updateField} minLength={20} maxLength={60} required placeholder="At least 20 characters" />
                    </label>
                    <label>
                      Address
                      <textarea name="address" autoComplete="street-address" value={form.address} onChange={updateField} maxLength={400} required rows={2} placeholder="Your address (up to 400 characters)" />
                    </label>
                  </>
                )}
                <label>
                  Email address
                  <input name="email" type="email" autoComplete="email" value={form.email} onChange={updateField} required placeholder="you@example.com" />
                </label>
                <label>
                  Password
                  <input name="password" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={form.password} onChange={updateField} minLength={mode === 'register' ? 8 : undefined} maxLength={mode === 'register' ? 16 : undefined} required placeholder={mode === 'register' ? '8–16 characters' : 'Your password'} />
                  {mode === 'register' && <span className="field-hint">Must include an uppercase letter and a special character.</span>}
                </label>

                {message && <p className={`message ${isError ? 'error' : 'success'}`} role={isError ? 'alert' : 'status'}>{message}</p>}
                <button className="button" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Log in'}
                  {!isSubmitting && <span aria-hidden="true">→</span>}
                </button>
              </form>
              <p className="terms-note">By continuing, you agree to use the platform respectfully.</p>
            </>
          )}
        </section>
      </section>

      <footer className="footer">
        <div className="footer-brand"><strong>Store Ratings</strong><span>Built for local communities</span></div>
        <div className="footer-credit">
          <span>Created by <strong>{creator.name}</strong></span>
          <span>© {new Date().getFullYear()} {creator.name}. All rights reserved.</span>
          <div className="footer-links" aria-label="Creator profiles">
            <a href={creator.github} target="_blank" rel="noreferrer">GitHub ↗</a>
            <a href={creator.linkedin} target="_blank" rel="noreferrer">LinkedIn ↗</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
