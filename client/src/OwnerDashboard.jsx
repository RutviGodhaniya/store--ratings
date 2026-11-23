import { useEffect, useState } from 'react';
import PasswordChangeForm from './PasswordChangeForm.jsx';
import RatingStars from './RatingStars.jsx';

async function readResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`The API returned an unexpected response (${response.status}).`);
  }
}

export default function OwnerDashboard({ user, onLogOut }) {
  const [data, setData] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/owner/dashboard', {
      headers: { Authorization: `Bearer ${sessionStorage.getItem('store-ratings-token')}` },
    })
      .then(readResponse)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((error) => {
        if (!cancelled) {
          setMessage(error instanceof TypeError ? 'Could not reach the API.' : error.message);
        }
      });
    return () => { cancelled = true; };
  }, [user.id]);

  return (
    <div className="owner-dashboard">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">STORE OWNER</p>
          <h2>Welcome, {user.name.split(' ')[0]}.</h2>
          <p className="muted">See how customers rate your store.</p>
        </div>
        <button className="button secondary logout-button" onClick={onLogOut}>Log out</button>
      </div>

      {message && <p className="message error" role="alert">{message}</p>}
      {data?.store ? (
        <>
          <section className="owner-store-card">
            <div>
              <p className="eyebrow">YOUR STORE</p>
              <h3>{data.store.name}</h3>
              <p>{data.store.address}</p>
            </div>
            <div className="owner-average"><span>★</span><strong>{data.store.average_rating ?? '—'}</strong><small>Average · {data.store.rating_count} ratings</small><RatingStars value={data.store.average_rating} /></div>
          </section>

          <section className="owner-ratings">
            <p className="eyebrow">CUSTOMER FEEDBACK</p>
            <h3>Submitted ratings</h3>
            {data.ratings.length === 0 ? (
              <div className="empty-state compact"><h3>No ratings yet</h3><p>Customer ratings will appear here.</p></div>
            ) : (
              <div className="owner-rating-list">
                {data.ratings.map((rating, index) => (
                  <article className="owner-rating-row" key={`${rating.user_email}-${index}`}>
                    <div><strong>{rating.user_name}</strong><span>{rating.user_email}</span></div>
                    <span className="store-rating-pill"><RatingStars value={rating.score} /> {rating.score} / 5</span>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      ) : data && (
        <div className="empty-state"><h3>No store is linked to your account yet</h3><p>An administrator must assign your account when adding a store.</p></div>
      )}

      <PasswordChangeForm />
    </div>
  );
}
