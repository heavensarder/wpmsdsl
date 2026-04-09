'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Smartphone, CheckCircle2, ShieldCheck, LogOut, Send, Loader2, History } from 'lucide-react';
import './globals.css';

type BotStatus = 'DISCONNECTED' | 'INITIALIZING' | 'PENDING_QR' | 'AUTHENTICATING' | 'CONNECTED_READY';

interface StatusResponse {
  status: BotStatus;
  qrCodeUrl: string | null;
}

export default function Home() {
  const [data, setData] = useState<StatusResponse>({
    status: 'INITIALIZING',
    qrCodeUrl: null
  });
  
  const [isLoading, setIsLoading] = useState(true);

  // Test form state
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [testResult, setTestResult] = useState<{success?: boolean, msg?: string} | null>(null);
  const [instanceId, setInstanceId] = useState<string>('');

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/whatsapp/status');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error('Failed to fetch status', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    
    // Fetch Instance ID
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data.instance_id) setInstanceId(data.instance_id);
      })
      .catch(e => console.error(e));

    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to log out from this WhatsApp account?')) return;
    setIsLoading(true);
    try {
      await fetch('/api/whatsapp/logout', { method: 'POST' });
      await fetchStatus();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !message) return;
    
    setIsSending(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instance_id: instanceId, phoneNumber: phone, message })
      });
      const result = await res.json();
      
      if (res.ok) {
         setTestResult({ success: true, msg: 'Message sent successfully!' });
         setMessage(''); // clear message but keep phone for easier re-testing
      } else {
         setTestResult({ success: false, msg: result.error || 'Failed to send message.' });
      }
    } catch (err) {
      setTestResult({ success: false, msg: 'A network error occurred.' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="container">
      <div className="dashboard-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: '2.5rem' }}>
          <div style={{ textAlign: 'left', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://mediasoftbd.com/wp-content/uploads/2025/06/mediasoft-logo.png" alt="Mediasoft" style={{ height: '36px', objectFit: 'contain' }} />
              <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 0.5rem' }}></div>
              <Smartphone size={24} color="var(--accent-color)" />
              <h1 className="title" style={{ marginBottom: 0, fontSize: '1.4rem' }}>WhatsApp Gateway</h1>
            </div>
            <p className="subtitle">Manage your bot connection</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Link href="/history" className="history-nav-btn">
              <History size={16} />
              History
            </Link>
            <button 
              type="button"
              className="btn btn-danger" 
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', marginTop: 0 }}
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' });
                window.location.reload();
              }}
            >
              Sign Out Engine
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div className={`status-badge ${data.status === 'CONNECTED_READY' ? 'connected' : (data.status === 'PENDING_QR' ? 'pending' : (data.status === 'AUTHENTICATING' ? 'connected' : ''))}`}>
            <span className="status-indicator"></span>
            {data.status === 'DISCONNECTED' && 'Disconnected'}
            {data.status === 'INITIALIZING' && 'Starting Engine...'}
            {data.status === 'PENDING_QR' && 'Scan QR Code'}
            {data.status === 'AUTHENTICATING' && 'Connecting...'}
            {data.status === 'CONNECTED_READY' && 'System Online'}
          </div>
        </div>

        <div className="content-area">
          {isLoading ? (
             <div className="loader"></div>
          ) : (
             <>
               {(data.status === 'INITIALIZING' || data.status === 'DISCONNECTED') && (
                 <div style={{ textAlign: 'center' }}>
                   <div className="loader" style={{ margin: '0 auto' }}></div>
                   <p className="info-text" style={{ marginTop: '1rem' }}>Initializing WhatsApp engine in the background...</p>
                 </div>
               )}

               {data.status === 'AUTHENTICATING' && (
                 <div style={{ textAlign: 'center' }}>
                   <div className="loader" style={{ margin: '0 auto' }}></div>
                   <p className="info-text" style={{ marginTop: '1rem' }}>QR scanned successfully! Establishing secure session...</p>
                 </div>
               )}

               {data.status === 'PENDING_QR' && data.qrCodeUrl && (
                 <div style={{ textAlign: 'center' }}>
                   <div className="qr-container">
                     {/* eslint-disable-next-line @next/next/no-img-element */}
                     <img src={data.qrCodeUrl} alt="WhatsApp QR Code" className="qr-image" />
                   </div>
                   <p className="info-text">Open WhatsApp on your phone.<br/>Tap <strong>Menu</strong> or <strong>Settings</strong> and select <strong>Linked Devices</strong>.<br/>Point your phone to this screen to capture the code.</p>
                 </div>
               )}

               {data.status === 'CONNECTED_READY' && (
                 <div style={{ width: '100%', textAlign: 'center' }}>
                   <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', color: '#10b981', marginBottom: '2rem' }}>
                     <ShieldCheck size={28} />
                     <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>Secure Session Active</span>
                   </div>
                   
                   <div className="api-key-container">
                     <div className="api-key-header">
                       <ShieldCheck size={20} />
                       Your Secure API Instance ID
                     </div>
                     <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'left' }}>
                       You must include this Instance ID in all your external API requests to <code style={{color:'#818cf8'}}>/api/whatsapp/send</code> to authenticate.
                     </p>
                     <div className="api-key-display">
                       <span className="api-key-value">{instanceId || 'LOADING...'}</span>
                       <button className="copy-btn" onClick={() => {
                         navigator.clipboard.writeText(instanceId);
                         alert('Copied to clipboard!');
                       }}>Copy Key</button>
                     </div>
                   </div>

                   <div className="test-panel">
                      <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'white' }}>Test Interface</h3>
                      <form onSubmit={handleSendTestMessage}>
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1rem' }}>
                           <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>Authentication</label>
                           <input 
                             type="text" 
                             className="input-field" 
                             placeholder="Instance ID" 
                             value={instanceId}
                             onChange={e => setInstanceId(e.target.value)}
                             required
                             style={{ marginBottom: '0', background: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.2)' }}
                           />
                         </div>
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1rem' }}>
                           <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>Destination</label>
                           <input 
                             type="text" 
                             className="input-field" 
                             placeholder="Phone Number (e.g. 15551234567)" 
                             value={phone}
                             onChange={e => setPhone(e.target.value)}
                             required
                             style={{ marginBottom: '0' }}
                           />
                         </div>
                         <textarea 
                           className="input-field" 
                           placeholder="Enter your test message..." 
                           value={message}
                           onChange={e => setMessage(e.target.value)}
                           required
                         />
                         
                         {testResult && (
                            <div style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: '8px', fontSize: '0.9rem', backgroundColor: testResult.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: testResult.success ? 'var(--accent-color)' : '#ef4444', border: `1px solid ${testResult.success ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                               {testResult.msg}
                            </div>
                         )}

                         <div style={{ display: 'flex', gap: '1rem' }}>
                            <button type="submit" className="btn" disabled={isSending} style={{ flex: 1, justifyContent: 'center' }}>
                               {isSending ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
                               {isSending ? 'Sending...' : 'Send Message'}
                            </button>
                            <button type="button" className="btn btn-danger" onClick={handleLogout} style={{ justifyContent: 'center' }}>
                               <LogOut size={18} />
                               Disconnect WA
                            </button>
                         </div>
                      </form>
                   </div>
                 </div>
               )}
             </>
          )}
        </div>
      </div>
    </div>
  );
}
