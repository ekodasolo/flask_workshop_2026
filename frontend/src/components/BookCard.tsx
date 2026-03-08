import type { Book } from '../types';

type Props = {
  book: Book;
  onClick: (bookId: string) => void;
};

export function BookCard({ book, onClick }: Props) {
  return (
    <div className="book-card" onClick={() => onClick(book.book_id)}>
      <h3>{book.title}</h3>
      <p className="book-author">{book.author}</p>
      <p className="book-description">{book.description}</p>
    </div>
  );
}
