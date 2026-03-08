import { useState } from 'react';
import type { BookInput } from '../types';

type Props = {
  onSubmit: (book: BookInput) => void;
};

export function BookForm({ onSubmit }: Props) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !author || !description) return;
    onSubmit({ title, author, description });
    setTitle('');
    setAuthor('');
    setDescription('');
  };

  return (
    <form className="book-form" onSubmit={handleSubmit}>
      <h3>書籍を登録</h3>
      <input
        type="text"
        placeholder="タイトル"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <input
        type="text"
        placeholder="著者"
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
        required
      />
      <textarea
        placeholder="紹介文"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        required
      />
      <button type="submit">登録</button>
    </form>
  );
}
