import type { Book, BookInput, Review, ReviewInput } from './types';

// メモリ上のモックデータストア
let books: Book[] = [
  {
    book_id: 'mock-1',
    title: 'Clean Code',
    author: 'Robert C. Martin',
    description: '読みやすいコードの書き方を解説した名著',
    created_at: '2024-01-15T10:00:00Z',
  },
  {
    book_id: 'mock-2',
    title: 'リーダブルコード',
    author: 'Dustin Boswell',
    description: 'より良いコードを書くためのシンプルで実践的なテクニック',
    created_at: '2024-02-20T09:00:00Z',
  },
];

let reviews: Review[] = [
  {
    review_id: 'review-1',
    book_id: 'mock-1',
    reviewer: 'Yohei',
    rating: 5,
    comment: '実務で即使える内容でした',
    created_at: '2024-01-20T14:00:00Z',
  },
  {
    review_id: 'review-2',
    book_id: 'mock-1',
    reviewer: 'Tanaka',
    rating: 4,
    comment: '翻訳が少し読みにくいが内容は素晴らしい',
    created_at: '2024-01-25T11:00:00Z',
  },
];

// 疑似的な遅延（API呼び出しのリアルさを出す）
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let nextId = 100;

export const mockApi = {
  getBooks: async (): Promise<{ books: Book[] }> => {
    await delay(300);
    return { books: [...books] };
  },

  createBook: async (body: BookInput): Promise<Book> => {
    await delay(300);
    const book: Book = {
      book_id: `mock-${nextId++}`,
      ...body,
      created_at: new Date().toISOString(),
    };
    books = [...books, book];
    return book;
  },

  getBook: async (bookId: string): Promise<Book> => {
    await delay(200);
    const book = books.find((b) => b.book_id === bookId);
    if (!book) throw new Error('Book not found');
    return { ...book };
  },

  updateBook: async (bookId: string, body: Partial<BookInput>): Promise<Book> => {
    await delay(300);
    const index = books.findIndex((b) => b.book_id === bookId);
    if (index === -1) throw new Error('Book not found');
    books[index] = { ...books[index], ...body };
    return { ...books[index] };
  },

  deleteBook: async (bookId: string): Promise<{ message: string }> => {
    await delay(300);
    books = books.filter((b) => b.book_id !== bookId);
    reviews = reviews.filter((r) => r.book_id !== bookId);
    return { message: 'Book deleted' };
  },

  getReviews: async (bookId: string): Promise<{ reviews: Review[] }> => {
    await delay(200);
    return { reviews: reviews.filter((r) => r.book_id === bookId) };
  },

  createReview: async (bookId: string, body: ReviewInput): Promise<Review> => {
    await delay(300);
    const review: Review = {
      review_id: `review-${nextId++}`,
      book_id: bookId,
      ...body,
      created_at: new Date().toISOString(),
    };
    reviews = [...reviews, review];
    return review;
  },
};
