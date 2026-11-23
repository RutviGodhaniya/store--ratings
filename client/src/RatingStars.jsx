export default function RatingStars({ value }) {
  const score = Number(value) || 0;
  const filled = Math.round(score);

  return (
    <span className="star-rating" aria-label={`${score.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={star <= filled ? 'star-filled' : 'star-empty'} aria-hidden="true">★</span>
      ))}
    </span>
  );
}
