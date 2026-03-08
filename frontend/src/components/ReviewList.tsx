import type { Review } from '../types';
import { ReviewCard } from './ReviewCard';

type Props = {
  reviews: Review[];
};

export function ReviewList({ reviews }: Props) {
  if (reviews.length === 0) {
    return <p className="empty-message">レビューはまだありません</p>;
  }

  return (
    <div className="review-list">
      {reviews.map((review) => (
        <ReviewCard key={review.review_id} review={review} />
      ))}
    </div>
  );
}
