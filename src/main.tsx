import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AdminPage } from './admin/AdminPage';
import { Layout } from './components/Layout';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { AccountPage } from './pages/AccountPage';
import { AuthPage } from './pages/AuthPage';
import { CartPage } from './pages/CartPage';
import { CatalogsPage } from './pages/CatalogsPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ReturnsPage } from './pages/ReturnsPage';
import { SearchPage } from './pages/SearchPage';
import { VinRequestPage } from './pages/VinRequestPage';
import './styles/global.css';

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <Layout />,
      errorElement: <NotFoundPage />,
      children: [
        { index: true, element: <HomePage /> },
        { path: 'search', element: <SearchPage /> },
        { path: 'catalogs', element: <CatalogsPage /> },
        { path: 'vin', element: <VinRequestPage /> },
        { path: 'cart', element: <CartPage /> },
        { path: 'account', element: <AccountPage /> },
        { path: 'returns', element: <ReturnsPage /> },
        { path: 'auth', element: <AuthPage /> },
        { path: 'admin', element: <AdminPage /> },
      ],
    },
  ],
  { basename: '/ZapFormat' },
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SettingsProvider>
      <AuthProvider>
        <CartProvider>
          <RouterProvider router={router} />
        </CartProvider>
      </AuthProvider>
    </SettingsProvider>
  </React.StrictMode>,
);
