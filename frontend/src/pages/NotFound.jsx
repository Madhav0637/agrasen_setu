import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="not-found-page">
      <h1>404</h1>
      <p style={{ color: 'var(--color-text-muted)' }}>Page not found</p>
      <Link to="/" className="btn btn--primary">← Home</Link>
    </div>
  );
}
