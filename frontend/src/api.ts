import type { Book, BookInput, Review, ReviewInput } from './types';
import { mockApi } from './mock';

const getBaseUrl = (): string => {
  return localStorage.getItem('apiBaseUrl') || import.meta.env.VITE_API_BASE_URL || '';
};

// API URL が未設定ならモックモードを使う
const isMockMode = (): boolean => !getBaseUrl();

const realApi = {
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

// API URL が設定されていれば実際の API を使い、未設定ならモックデータを返す
export const api = new Proxy(realApi, {
  get(target, prop: keyof typeof realApi) {
    return isMockMode() ? mockApi[prop] : target[prop];
  },
});
