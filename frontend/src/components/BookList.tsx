import type { Book } from '../types';
import { BookCard } from './BookCard';

type Props = {
  books: Book[];
  onSelect: (bookId: string) => void;
};

export function BookList({ books, onSelect }: Props) {
  if (books.length === 0) {
    return <p className="empty-message">書籍がまだ登録されていません</p>;
  }

  return (
    <div className="book-list">
      {books.map((book) => (
        <BookCard key={book.book_id} book={book} onClick={onSelect} />
      ))}
    </div>
  );
}
