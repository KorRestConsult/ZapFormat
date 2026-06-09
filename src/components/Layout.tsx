import { Link, NavLink, Outlet } from 'react-router-dom';
import { LogOut, Menu, ShoppingCart, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useSettings } from '../contexts/SettingsContext';
import { Button } from './Button';

export function Layout() {
  const { settings } = useSettings();
  const { profile, isAdmin, logout } = useAuth();
  const { items } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <div className="app-shell">
      <header className="site-header">
        <Link to="/" className="brand">{settings.companyName}</Link>
        <button className="icon-button mobile-only" onClick={() => setOpen((value) => !value)} aria-label="Открыть меню">
          <Menu size={22} />
        </button>
        <nav className={`site-nav ${open ? 'open' : ''}`}>
          <NavLink to="/search">Поиск</NavLink>
          <NavLink to="/vin">VIN-подбор</NavLink>
          <NavLink to="/cart">Корзина <span className="pill">{items.length}</span></NavLink>
          <NavLink to="/account">Кабинет</NavLink>
          {isAdmin && <NavLink to="/admin">Админ</NavLink>}
        </nav>
        <div className="header-actions">
          <Link to="/cart" className="icon-link" aria-label="Корзина"><ShoppingCart size={20} /></Link>
          {profile ? (
            <Button variant="ghost" onClick={logout}><LogOut size={17} />Выйти</Button>
          ) : (
            <Link className="button button-secondary" to="/auth"><UserRound size={17} />Войти</Link>
          )}
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="site-footer">
        <div>
          <strong>{settings.companyName}</strong>
          <p>{settings.city}, {settings.pickupAddress}</p>
        </div>
        <div>
          <a href={`tel:${settings.phone}`}>{settings.phone}</a>
          <span>{settings.workingHours}</span>
        </div>
      </footer>
    </div>
  );
}
