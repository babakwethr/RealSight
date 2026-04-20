/**
 * LoginRedirect — redirects /login to the home page and opens the AuthModal.
 * This way direct links (/login, /login?mode=signup) still work,
 * but users see the app behind the modal like Flova.
 */
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function LoginRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const mode = params.get('mode') === 'signup' ? 'signup' : 'login';

  useEffect(() => {
    // Redirect to home with modal state in URL hash so it opens immediately
    navigate(`/?auth=${mode}`, { replace: true });
  }, []);

  return null;
}
