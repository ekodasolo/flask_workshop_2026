import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { BooksPage } from './pages/BooksPage';
import { BookDetailPage } from './pages/BookDetailPage';
import './App.css';

function App() {
  const [apiUrl, setApiUrl] = useState(
    localStorage.getItem('apiBaseUrl') || import.meta.env.VITE_API_BASE_URL || ''
  );

  const handleApiUrlChange = (url: string) => {
    setApiUrl(url);
    localStorage.setItem('apiBaseUrl', url);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 onClick={() => window.location.href = '/'}>Book Review</h1>
        <div className="api-url-config">
          {!apiUrl && <span className="mock-badge">Mock Mode</span>}
          <label>API URL: </label>
          <input
            type="text"
            value={apiUrl}
            onChange={(e) => handleApiUrlChange(e.target.value)}
            placeholder="未設定 = モックモード"
          />
        </div>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<BooksPage />} />
          <Route path="/books/:id" element={<BookDetailPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
