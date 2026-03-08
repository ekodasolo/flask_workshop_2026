// 書籍（API レスポンス）
export type Book = {
  book_id: string;
  title: string;
  author: string;
  description: string;
  created_at: string;
};

// 書籍登録・更新時の入力
export type BookInput = {
  title: string;
  author: string;
  description: string;
};

// レビュー（API レスポンス）
export type Review = {
  review_id: string;
  book_id: string;
  reviewer: string;
  rating: number;
  comment: string;
  created_at: string;
};

// レビュー投稿時の入力
export type ReviewInput = {
  reviewer: string;
  rating: number;
  comment: string;
};
