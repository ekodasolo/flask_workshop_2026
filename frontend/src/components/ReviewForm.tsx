import { useState } from 'react';
import type { ReviewInput } from '../types';

type Props = {
  bookId: string;
  onSubmit: (review: ReviewInput) => void;
};

export function ReviewForm({ onSubmit }: Props) {
  const [reviewer, setReviewer] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewer || !comment) return;
    onSubmit({ reviewer, rating, comment });
    setReviewer('');
    setRating(5);
    setComment('');
  };

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      <h3>レビューを投稿</h3>
      <input
        type="text"
        placeholder="レビュアー名"
        value={reviewer}
        onChange={(e) => setReviewer(e.target.value)}
        required
      />
      <div className="rating-input">
        <label>評価: </label>
        <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>{'★'.repeat(n)}{'☆'.repeat(5 - n)} ({n})</option>
          ))}
        </select>
      </div>
      <textarea
        placeholder="コメント"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        required
      />
      <button type="submit">投稿</button>
    </form>
  );
}
