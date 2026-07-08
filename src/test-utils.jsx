/**
 * Shared render helper for component/integration tests.
 *
 * Wraps a component in the providers the editor tree needs: a router (so
 * `useNavigate`/`useLocation`/`useParams` and `<Link>` resolve) plus the Toast
 * and Confirm contexts (both backend-free, so cheap to use for real).
 *
 * Auth is deliberately NOT provided here — the real `AuthProvider` gates its
 * children on an async `getSession()` and would render nothing synchronously.
 * Tests mock it instead: `vi.mock('./context/AuthContext', ...)`.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext';

export function renderWithProviders(ui, { route = '/editor', path = '/editor' } = {}) {
    return render(
        <MemoryRouter initialEntries={[route]}>
            <ToastProvider>
                <ConfirmProvider>
                    <Routes>
                        <Route path={path} element={ui} />
                    </Routes>
                </ConfirmProvider>
            </ToastProvider>
        </MemoryRouter>
    );
}
