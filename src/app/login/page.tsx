'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import './login.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Redirect to dashboard
        router.push('/');
        router.refresh(); // Force a refresh to ensure middleware checks the new cookie
      } else {
        setError(data.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError('An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Dynamic Background elements handled purely in CSS pseudo-elements now! */}
      
      
        <div className="login-wrapper">
          <div className="login-logo-container">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://mediasoftbd.com/wp-content/uploads/2025/06/mediasoft-logo.png" alt="Mediasoft Logo" />
            <h1>WHATSAPP GATEWAY</h1>
          </div>

          <div className="login-card">
            <h2 className="login-title">Welcome Back</h2>
            <p className="login-subtitle">Sign in to your administration panel</p>
            
            {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="form-group">
              <input
                type="email"
                placeholder="Email address"
                className="wa-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <input
                type="password"
                placeholder="Password"
                className="wa-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="wa-btn" disabled={isLoading}>
              {isLoading ? <Loader2 className="spin" size={20} /> : 'Log In'}
            </button>
          </form>
          
            <div className="secure-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>
              Secured by Mediasoft
            </div>
          </div>
        </div>
    </div>
  );
}
