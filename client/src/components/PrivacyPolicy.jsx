import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)',
      color: '#e2e8f0',
      padding: '2rem 1.5rem',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', background: 'rgba(255,255,255,0.03)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <h1 style={{ color: 'white', marginBottom: '1.5rem', fontSize: '2rem' }}>Privacy Policy</h1>
        
        <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
          <strong>Last updated:</strong> June 2026
        </p>

        <p style={{ marginBottom: '1.5rem', lineHeight: '1.6' }}>
          Nexus Relay ("we", "us", or "our") operates the Nexus Relay mobile application (the "Service"). 
          This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data.
        </p>

        <h2 style={{ color: 'white', marginTop: '2rem', marginBottom: '1rem', fontSize: '1.5rem' }}>1. Data We Collect and Why</h2>
        
        <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
          Our application acts as a private integration tool (Relay) connecting your mobile device with your personal/company Nexus CRM. To function properly, it requires access to specific sensitive data:
        </p>

        <ul style={{ marginBottom: '1.5rem', lineHeight: '1.6', paddingLeft: '1.5rem' }}>
          <li style={{ marginBottom: '0.5rem' }}>
            <strong>SMS Messages (READ_SMS, RECEIVE_SMS, SEND_SMS, WRITE_SMS):</strong> We require these permissions to function as a Default SMS handler. The app reads incoming SMS messages and securely transmits them exclusively to your designated, authenticated CRM instance. It can also send SMS messages initiated by your CRM.
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            <strong>Call Logs & Phone State (READ_CALL_LOG, READ_PHONE_STATE, PROCESS_OUTGOING_CALLS):</strong> We require these permissions to function as a Default Dialer handler. The app monitors incoming and outgoing calls to sync call records with your authenticated CRM instance.
          </li>
        </ul>

        <h2 style={{ color: 'white', marginTop: '2rem', marginBottom: '1rem', fontSize: '1.5rem' }}>2. Data Sharing and Disclosure</h2>
        <p style={{ marginBottom: '1.5rem', lineHeight: '1.6' }}>
          <strong>We do NOT sell, rent, or trade your personal data, including SMS messages or call logs, to any third parties.</strong>
          <br /><br />
          Data collected by the Service is transmitted using secure, encrypted protocols (HTTPS) directly to the server infrastructure you have configured (your CRM). The data is solely used to populate your own dashboard and maintain communication history for your own business purposes.
        </p>

        <h2 style={{ color: 'white', marginTop: '2rem', marginBottom: '1rem', fontSize: '1.5rem' }}>3. Data Security</h2>
        <p style={{ marginBottom: '1.5rem', lineHeight: '1.6' }}>
          The security of your data is important to us. We use commercially acceptable means (including end-to-end TLS encryption) to protect your Personal Data during transit. However, remember that no method of transmission over the Internet, or method of electronic storage, is 100% secure.
        </p>

        <h2 style={{ color: 'white', marginTop: '2rem', marginBottom: '1rem', fontSize: '1.5rem' }}>4. Changes to This Privacy Policy</h2>
        <p style={{ marginBottom: '1.5rem', lineHeight: '1.6' }}>
          We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
        </p>

        <h2 style={{ color: 'white', marginTop: '2rem', marginBottom: '1rem', fontSize: '1.5rem' }}>5. Contact Us</h2>
        <p style={{ marginBottom: '1.5rem', lineHeight: '1.6' }}>
          If you have any questions about this Privacy Policy, please contact your system administrator or the developer.
        </p>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
