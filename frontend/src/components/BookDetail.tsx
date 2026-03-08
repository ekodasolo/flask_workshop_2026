import { useState } from 'react';
import type { Book, BookInput } from '../types';

type Props = {
  book: Book;
  onUpdate: (book: BookInput) => void;
  onDelete: (bookId: string) => void;
};

export function BookDetail({ book, onUpdate, onDelete }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author);
  const [description, setDescription] = useState(book.description);

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({ title, author, description });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <form className="book-detail editing" onSubmit={handleUpdate}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <input
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          required
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <div className="button-group">
          <button type="submit">保存</button>
          <button type="button" className="secondary" onClick={() => setIsEditing(false)}>
            キャンセル
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="book-detail">
      <h2>{book.title}</h2>
      <p className="book-author">{book.author}</p>
      <p className="book-description">{book.description}</p>
      <p className="book-date">登録日: {new Date(book.created_at).toLocaleDateString('ja-JP')}</p>
      <div className="button-group">
        <button onClick={() => setIsEditing(true)}>編集</button>
        <button className="danger" onClick={() => onDelete(book.book_id)}>削除</button>
      </div>
    </div>
  );
}
