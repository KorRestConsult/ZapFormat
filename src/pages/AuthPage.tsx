import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';

export function AuthPage() {
  const { startPhoneLogin, confirmPhoneLogin } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('+7');
  const [profileDraft, setProfileDraft] = useState({ name: '', comment: '' });
  const [error, setError] = useState('');

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    try {
      await startPhoneLogin(phone);
      setStep('code');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось отправить SMS-код');
    }
  }

  async function confirmCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      await confirmPhoneLogin(String(form.get('code') ?? ''), { ...profileDraft, phone, city: 'Рязань' });
      navigate('/account');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось выполнить вход');
    }
  }

  return (
    <section className="page narrow">
      <div className="page-heading">
        <p className="eyebrow">Личный кабинет</p>
        <h1>Вход по номеру телефона</h1>
      </div>
      {step === 'phone' ? (
        <form className="panel-form" onSubmit={requestCode}>
          <input name="phone" required placeholder="+7 900 000-00-00" value={phone} onChange={(event) => setPhone(event.target.value)} />
          <input
            placeholder="Имя"
            value={profileDraft.name}
            onChange={(event) => setProfileDraft({ ...profileDraft, name: event.target.value })}
          />
          <textarea
            placeholder="Комментарий: адрес, удобное время звонка, что искать"
            value={profileDraft.comment}
            onChange={(event) => setProfileDraft({ ...profileDraft, comment: event.target.value })}
          />
          {error && <p className="error">{error}</p>}
          <div id="recaptcha-container" />
          <Button type="submit">Получить SMS-код</Button>
        </form>
      ) : (
        <form className="panel-form" onSubmit={confirmCode}>
          <input name="code" required inputMode="numeric" placeholder="Код из SMS" />
          {error && <p className="error">{error}</p>}
          <Button type="submit">Войти</Button>
          <button className="text-button" type="button" onClick={() => setStep('phone')}>
            Изменить номер
          </button>
        </form>
      )}
    </section>
  );
}
