import type { Review } from '../types';

type Props = {
  review: Review;
};

export function ReviewCard({ review }: Props) {
  return (
    <div className="review-card">
      <div className="review-header">
        <span className="reviewer">{review.reviewer}</span>
        <span className="rating">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
      </div>
      <p className="review-comment">{review.comment}</p>
      <p className="review-date">{new Date(review.created_at).toLocaleDateString('ja-JP')}</p>
    </div>
  );
}
