import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Book, BookInput } from '../types';
import { api } from '../api';
import { BookList } from '../components/BookList';
import { BookForm } from '../components/BookForm';

export function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchBooks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getBooks();
      setBooks(data.books);
    } catch {
      setError('書籍一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleCreate = async (input: BookInput) => {
    try {
      setError(null);
      await api.createBook(input);
      await fetchBooks();
    } catch {
      setError('書籍の登録に失敗しました');
    }
  };

  const handleSelect = (bookId: string) => {
    navigate(`/books/${bookId}`);
  };

  return (
    <div className="page">
      <h1>書籍一覧</h1>
      {error && <p className="error-message">{error}</p>}
      <BookForm onSubmit={handleCreate} />
      {loading ? (
        <p className="loading">読み込み中...</p>
      ) : (
        <BookList books={books} onSelect={handleSelect} />
      )}
    </div>
  );
}
