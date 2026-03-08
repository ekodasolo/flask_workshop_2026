import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Book, BookInput, Review, ReviewInput } from '../types';
import { api } from '../api';
import { BookDetail } from '../components/BookDetail';
import { ReviewList } from '../components/ReviewList';
import { ReviewForm } from '../components/ReviewForm';

export function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const [bookData, reviewsData] = await Promise.all([
        api.getBook(id),
        api.getReviews(id),
      ]);
      setBook(bookData);
      setReviews(reviewsData.reviews);
    } catch {
      setError('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleUpdate = async (input: BookInput) => {
    if (!id) return;
    try {
      setError(null);
      const updated = await api.updateBook(id, input);
      setBook(updated);
    } catch {
      setError('書籍の更新に失敗しました');
    }
  };

  const handleDelete = async (bookId: string) => {
    try {
      setError(null);
      await api.deleteBook(bookId);
      navigate('/');
    } catch {
      setError('書籍の削除に失敗しました');
    }
  };

  const handleCreateReview = async (input: ReviewInput) => {
    if (!id) return;
    try {
      setError(null);
      await api.createReview(id, input);
      const data = await api.getReviews(id);
      setReviews(data.reviews);
    } catch {
      setError('レビューの投稿に失敗しました');
    }
  };

  if (loading) return <p className="loading">読み込み中...</p>;

  if (!book) {
    return (
      <div className="page">
        <p className="error-message">{error || '書籍が見つかりません'}</p>
        <button onClick={() => navigate('/')}>一覧に戻る</button>
      </div>
    );
  }

  return (
    <div className="page">
      <button className="back-button" onClick={() => navigate('/')}>← 一覧に戻る</button>
      {error && <p className="error-message">{error}</p>}
      <BookDetail book={book} onUpdate={handleUpdate} onDelete={handleDelete} />
      <hr />
      <h2>レビュー ({reviews.length}件)</h2>
      <ReviewForm bookId={book.book_id} onSubmit={handleCreateReview} />
      <ReviewList reviews={reviews} />
    </div>
  );
}
