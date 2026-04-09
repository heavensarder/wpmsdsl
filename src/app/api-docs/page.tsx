'use client';

import { ShieldCheck, ArrowLeft, Code } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import './../globals.css';

export default function ApiDocs() {
  const [baseUrl, setBaseUrl] = useState('http://localhost:3000');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
    }
  }, []);

  return (
    <div className="container" style={{ maxWidth: '800px', padding: '2rem' }}>
      <div className="dashboard-card docs-card" style={{ padding: '3rem' }}>
        <Link href="/" className="back-btn">
          <ArrowLeft size={18} />
          Back to Dashboard
        </Link>
        
        <div className="header" style={{ textAlign: 'left', marginTop: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
             {/* eslint-disable-next-line @next/next/no-img-element */}
             <img src="https://mediasoftbd.com/wp-content/uploads/2025/06/mediasoft-logo.png" alt="Mediasoft" style={{ height: '36px', objectFit: 'contain' }} />
             <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 0.5rem' }}></div>
             <Code size={32} color="var(--accent-color)" />
             <h1 className="title" style={{ marginBottom: 0 }}>API Documentation</h1>
          </div>
          <p className="subtitle">Integrate your WhatsApp bot with external applications via simple HTTP requests.</p>
        </div>

        <div className="docs-content">
          <section className="docs-section">
            <h2>1. Check Bot Status</h2>
            <p>Determine if the bot is alive, needs a QR scan, or is fully connected.</p>
            <div className="endpoint-badge get">GET</div> <code className="endpoint-url">/api/whatsapp/status</code>
            
            <div className="code-block">
{`{
  "status": "CONNECTED_READY",
  "qrCodeUrl": null
}`}
            </div>
            <p className="docs-note">The <code>status</code> property returns <code>DISCONNECTED</code>, <code>INITIALIZING</code>, <code>PENDING_QR</code>, or <code>CONNECTED_READY</code>.</p>
          </section>

          <section className="docs-section">
            <h2>2. Send Message & Media</h2>
            <p>Send text and multimedia attachments natively via WhatsApp.</p>
            <div className="endpoint-badge post">POST</div> <code className="endpoint-url">/api/whatsapp/send</code>

            <table className="docs-table">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Required</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>instance_id</code></td>
                  <td><span style={{color: 'var(--accent-color)', fontWeight: 600}}>Yes</span></td>
                  <td>Your Secure API Instance ID found on the dashboard. Mandatory for all requests.</td>
                </tr>
                <tr>
                  <td><code>phoneNumber</code></td>
                  <td><span style={{color: 'var(--accent-color)', fontWeight: 600}}>Yes</span></td>
                  <td>Target number with Country Code (e.g. <code>88017xxxxxxx</code>). No plus signs.</td>
                </tr>
                <tr>
                  <td><code>message</code></td>
                  <td>No</td>
                  <td>WhatsApp text message.</td>
                </tr>
                <tr>
                  <td><code>fileUrl</code></td>
                  <td>No</td>
                  <td>Publicly accessible URL to an image or document (e.g. PDF). The server will download it and attach it to the WhatsApp payload!</td>
                </tr>
                <tr>
                  <td><code>fileName</code></td>
                  <td>No</td>
                  <td>Use to force a specific file name when downloading on the recipient's phone.</td>
                </tr>
              </tbody>
            </table>

            <h3>Example (Node.js/Browser Fetch)</h3>
            <div className="code-block">
{`fetch('${baseUrl}/api/whatsapp/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    instance_id: "YOUR_SECURE_INSTANCE_ID",
    phoneNumber: "88017xxxxxxx",
    message: "Here is your invoice attachment.",
    fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    fileName: "invoice.pdf"
  })
})
.then(res => res.json())
.then(data => console.log(data));`}
            </div>
            
            <h3>Success Response</h3>
            <div className="code-block">
{`{
  "success": true,
  "messageId": "true_88017xxxxxxx@c.us_3EB03A4..."
}`}
            </div>
          </section>

          <section className="docs-section">
            <h2>3. Remote Logout</h2>
            <p>Remotely terminate the session and clear persisted WhatsApp files.</p>
            <div className="endpoint-badge post">POST</div> <code className="endpoint-url">/api/whatsapp/logout</code>
            <br />
            <br />
            <h3>Success Response</h3>
            <div className="code-block">
{`{
  "success": true,
  "message": "Logged out successfully."
}`}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
