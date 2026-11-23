import { useState } from 'react';

async function readResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`The API returned an unexpected response (${response.status}).`);
  }
}

export default function PasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function changePassword(event) {
    event.preventDefault();
    setIsSaving(true);
    setMessage('');
    setIsError(false);

    try {
      const response = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('store-ratings-token')}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const result = await readResponse(response);
      if (!response.ok) throw new Error(result.message || 'Could not change password');
      setCurrentPassword('');
      setNewPassword('');
      setMessage('Password updated successfully.');
    } catch (error) {
      setMessage(error instanceof TypeError ? 'Could not reach the API.' : error.message);
      setIsError(true);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="account-settings">
      <p className="eyebrow">ACCOUNT SETTINGS</p>
      <h3>Change password</h3>
      <form onSubmit={changePassword} className="password-form">
        <label>
          Current password
          <input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
        </label>
        <label>
          New password
          <input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} maxLength={16} required />
        </label>
        <p className="field-hint">8–16 characters, with an uppercase letter and a special character.</p>
        <button className="button" disabled={isSaving}>{isSaving ? 'Saving…' : 'Update password'}</button>
      </form>
      {message && <p className={`message ${isError ? 'error' : 'success'}`} role={isError ? 'alert' : 'status'}>{message}</p>}
    </section>
  );
}
