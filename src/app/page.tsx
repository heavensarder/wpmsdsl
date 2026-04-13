'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Smartphone, ShieldCheck, LogOut, Send, Loader2, History, Settings } from 'lucide-react';
import './globals.css';

type BotStatus = 'DISCONNECTED' | 'INITIALIZING' | 'PENDING_QR' | 'AUTHENTICATING' | 'CONNECTED_READY';

interface StatusResponse {
  status: BotStatus;
  qrCodeUrl: string | null;
  active_engine?: 'wwebjs' | 'meta';
}

export default function Home() {
  const [data, setData] = useState<StatusResponse>({
    status: 'INITIALIZING',
    qrCodeUrl: null,
    active_engine: 'wwebjs'
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'wwebjs' | 'meta'>('meta');

  // Meta Settings State
  const [metaAccessToken, setMetaAccessToken] = useState('');
  const [metaPhoneId, setMetaPhoneId] = useState('');
  const [isSavingMeta, setIsSavingMeta] = useState(false);

  // Test form state
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [fileData, setFileData] = useState('');
  const [fileMimeType, setFileMimeType] = useState('');
  const [fileName, setFileName] = useState('');
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

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const json = await res.json();
        if (json.settings) {
          setMetaAccessToken(json.settings.meta_access_token || '');
          setMetaPhoneId(json.settings.meta_phone_id || '');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchStatus();
    
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d.instance_id) setInstanceId(d.instance_id);
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

  const handleSaveMetaSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingMeta(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          active_engine: 'meta',
          meta_access_token: metaAccessToken,
          meta_phone_id: metaPhoneId
        })
      });
      await fetchStatus();
      alert('Meta settings saved and engine activated!');
    } catch (err) {
      alert('Failed to save settings');
    } finally {
      setIsSavingMeta(false);
    }
  };

  const handleActivateWWebJS = async () => {
    setIsSavingMeta(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active_engine: 'wwebjs' })
      });
      await fetchStatus();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingMeta(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const match = dataUrl.match(/^data:(.*);base64,(.*)$/);
      if (match) {
        setFileMimeType(match[1]);
        setFileData(match[2]);
      }
    };
    reader.readAsDataURL(file);
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
        body: JSON.stringify({ 
          instance_id: instanceId, 
          phoneNumber: phone, 
          message, 
          fileData: fileData || undefined,
          fileMimeType: fileMimeType || undefined,
          fileName: fileName || undefined
        })
      });
      const result = await res.json();
      
      if (res.ok) {
         setTestResult({ success: true, msg: 'Message sent successfully!' });
         setMessage(''); 
         setFileData('');
         setFileMimeType('');
         setFileName('');
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ textAlign: 'left', flex: 1, minWidth: '300px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://mediasoftbd.com/wp-content/uploads/2025/06/mediasoft-logo.png" alt="Mediasoft" style={{ height: '28px', objectFit: 'contain', marginBottom: '1.2rem', display: 'block' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
              <Smartphone size={22} color="var(--accent-primary)" />
              <h1 className="title" style={{ marginBottom: 0, fontSize: '1.6rem', whiteSpace: 'nowrap' }}>WhatsApp Gateway</h1>
            </div>
            <p className="subtitle" style={{ fontSize: '0.9rem' }}>Manage your bot connection</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Link href="/history" className="history-nav-btn">
              <History size={16} /> History
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
              Sign Out
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
            {data.status === 'CONNECTED_READY' && `System Online (${data.active_engine === 'meta' ? 'Meta Cloud' : 'Local Web'})`}
          </div>
        </div>

        {/* Tab Selection */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '2rem', marginTop: '1rem' }}>
          <button
            onClick={() => setActiveTab('meta')}
            style={{
              flex: 1, padding: '1rem', background: 'none', border: 'none',
              color: activeTab === 'meta' ? 'white' : 'var(--text-secondary)',
              borderBottom: activeTab === 'meta' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s'
            }}
          >
            Meta Cloud API
          </button>
          <button
            onClick={() => setActiveTab('wwebjs')}
            style={{
              flex: 1, padding: '1rem', background: 'none', border: 'none',
              color: activeTab === 'wwebjs' ? 'white' : 'var(--text-secondary)',
              borderBottom: activeTab === 'wwebjs' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s'
            }}
          >
            Local Session (QR)
          </button>
        </div>

        <div className="content-area">
          {isLoading ? (
             <div className="loader"></div>
          ) : (
             <>
               {/* META CLOUD TAB */}
               {activeTab === 'meta' && (
                 <div style={{ width: '100%', textAlign: 'left' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                      <Settings size={20} color="var(--accent-primary)" />
                      <h3 style={{ fontSize: '1.2rem', margin: 0, color: 'white' }}>Meta API Configuration</h3>
                   </div>
                   <form onSubmit={handleSaveMetaSettings}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1rem' }}>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Permanent Access Token</label>
                        <input 
                          type="password" 
                          className="input-field" 
                          placeholder="EAA..." 
                          value={metaAccessToken}
                          onChange={e => setMetaAccessToken(e.target.value)}
                          required
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1rem' }}>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Phone Number ID</label>
                        <input 
                          type="text" 
                          className="input-field" 
                          placeholder="e.g. 1045xxxxxx" 
                          value={metaPhoneId}
                          onChange={e => setMetaPhoneId(e.target.value)}
                          required
                        />
                      </div>
                      <button type="submit" className="btn" disabled={isSavingMeta} style={{ width: '100%', justifyContent: 'center' }}>
                         {isSavingMeta ? <Loader2 size={18} className="spin" /> : 'Save & Activate Meta API'}
                      </button>
                   </form>
                 </div>
               )}

               {/* LOCAL SESSION TAB */}
               {activeTab === 'wwebjs' && (
                 <>
                   {data.active_engine === 'meta' && (
                     <div style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.1)', marginBottom: '2rem' }}>
                       <p style={{ color: '#ef4444', marginBottom: '1rem' }}>Local QR engine is currently <strong>disabled</strong> because the Meta Cloud API is active.</p>
                       <button className="btn" onClick={handleActivateWWebJS} disabled={isSavingMeta}>Activate Local QR Engine</button>
                     </div>
                   )}

                   {data.active_engine === 'wwebjs' && (
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
                           <p className="info-text">Open WhatsApp on your phone.<br/>Tap <strong>Menu</strong> or <strong>Settings</strong> and select <strong>Linked Devices</strong>.</p>
                         </div>
                       )}
                     </>
                   )}
                 </>
               )}

               {/* TEST PANEL (SHOWN FOR BOTH IF READY) */}
               {data.status === 'CONNECTED_READY' && data.active_engine === activeTab && (
                 <div style={{ width: '100%', textAlign: 'center', marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem' }}>
                   
                   <div className="api-key-container">
                     <div className="api-key-header">
                       <ShieldCheck size={20} /> Your Secure API Instance ID
                     </div>
                     <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'left' }}>
                       Include this Instance ID in your API requests to <code style={{color:'#818cf8'}}>/api/whatsapp/send</code>
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
                      <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                        <Send size={18} color="var(--accent-primary)"/> Test Interface
                      </h3>
                      <form onSubmit={handleSendTestMessage} style={{ textAlign: 'left' }}>
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1rem' }}>
                           <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>Destination</label>
                           <input 
                             type="text" 
                             className="input-field" 
                             placeholder="Phone Number (e.g. 88017xxxxxxx)" 
                             value={phone}
                             onChange={e => setPhone(e.target.value)}
                             required
                             style={{ marginBottom: '0' }}
                           />
                         </div>
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1rem' }}>
                           <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>Attachment (Optional)</label>
                           <input 
                             type="file" 
                             className="input-field" 
                             onChange={handleFileChange}
                             style={{ marginBottom: '0', padding: '0.85rem' }}
                           />
                           {data.active_engine === 'meta' && (
                             <span style={{ fontSize: '0.75rem', color: '#ef4444', marginLeft: '0.5rem' }}>* Base64 file upload directly is not supported in Meta mode. Use fileUrl in your API calls instead.</span>
                           )}
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
                            {data.active_engine === 'wwebjs' && (
                              <button type="button" className="btn btn-danger" onClick={handleLogout} style={{ justifyContent: 'center' }}>
                                 <LogOut size={18} /> Disconnect Local
                              </button>
                            )}
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
