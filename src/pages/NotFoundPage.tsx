import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <section className="page narrow">
      <div className="empty-state">
        Страница не найдена.
        <Link className="button button-primary" to="/">На главную</Link>
      </div>
    </section>
  );
}
