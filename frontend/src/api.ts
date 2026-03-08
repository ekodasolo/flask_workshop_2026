import type { Book, BookInput, Review, ReviewInput } from './types';

const getBaseUrl = (): string => {
  return localStorage.getItem('apiBaseUrl') || import.meta.env.VITE_API_BASE_URL || '';
};

export const api = {
  // Books
  getBooks: async (): Promise<{ books: Book[] }> => {
    const res = await fetch(`${getBaseUrl()}/api/v1/books`);
    if (!res.ok) throw new Error('Failed to fetch books');
    return res.json();
  },

  createBook: async (body: BookInput): Promise<Book> => {
    const res = await fetch(`${getBaseUrl()}/api/v1/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Failed to create book');
    return res.json();
  },

  getBook: async (bookId: string): Promise<Book> => {
    const res = await fetch(`${getBaseUrl()}/api/v1/books/${bookId}`);
    if (!res.ok) throw new Error('Failed to fetch book');
    return res.json();
  },

  updateBook: async (bookId: string, body: Partial<BookInput>): Promise<Book> => {
    const res = await fetch(`${getBaseUrl()}/api/v1/books/${bookId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Failed to update book');
    return res.json();
  },

  deleteBook: async (bookId: string): Promise<{ message: string }> => {
    const res = await fetch(`${getBaseUrl()}/api/v1/books/${bookId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete book');
    return res.json();
  },

  // Reviews
  getReviews: async (bookId: string): Promise<{ reviews: Review[] }> => {
    const res = await fetch(`${getBaseUrl()}/api/v1/books/${bookId}/reviews`);
    if (!res.ok) throw new Error('Failed to fetch reviews');
    return res.json();
  },

  createReview: async (bookId: string, body: ReviewInput): Promise<Review> => {
    const res = await fetch(`${getBaseUrl()}/api/v1/books/${bookId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Failed to create review');
    return res.json();
  },
};
