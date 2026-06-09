import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';

export function AuthPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '');
    const password = String(form.get('password') ?? '');
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, String(form.get('name') ?? ''), String(form.get('phone') ?? ''));
      }
      navigate('/account');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось выполнить вход');
    }
  }

  return (
    <section className="page narrow">
      <div className="page-heading">
        <p className="eyebrow">Личный кабинет</p>
        <h1>{mode === 'login' ? 'Вход' : 'Регистрация'}</h1>
      </div>
      <form className="panel-form" onSubmit={onSubmit}>
        {mode === 'register' && <input name="name" required placeholder="Имя" />}
        {mode === 'register' && <input name="phone" required placeholder="Телефон" />}
        <input name="email" required type="email" placeholder="Email" />
        <input name="password" required type="password" placeholder="Пароль" minLength={6} />
        {error && <p className="error">{error}</p>}
        <Button type="submit">{mode === 'login' ? 'Войти' : 'Создать аккаунт'}</Button>
        <button className="text-button" type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Зарегистрироваться' : 'У меня уже есть аккаунт'}
        </button>
      </form>
    </section>
  );
}
