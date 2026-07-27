import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

function parseHashParams(hash) {
  const params = {};
  hash.replace(/^#/, '').split('&').forEach((kv) => {
    const [key, value] = kv.split('=');
    params[key] = value;
  });
  return params;
}

const ResetPasswordPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Parse tokens from hash fragment
    const params = parseHashParams(location.hash);
    if (params.access_token && params.refresh_token) {
      setAccessToken(params.access_token);
      setRefreshToken(params.refresh_token);
      // Set session so user is authenticated
      supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });
    }
  }, [location.hash]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setSuccess(true);
      setTimeout(() => navigate('/admin'), 2000);
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  if (!accessToken || !refreshToken) {
    return <div className="min-h-screen flex items-center justify-center text-red-600">Invalid or expired reset link.</div>;
  }

  if (success) {
    return <div className="min-h-screen flex items-center justify-center text-green-600">Password reset! Redirecting to admin login...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Reset Password</h2>
        {error && <div className="mb-4 text-red-600">{error}</div>}
        <label className="block mb-2 font-medium">New Password</label>
        <input
          type="password"
          className="w-full px-4 py-2 border rounded mb-4"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          required
          minLength={8}
          disabled={loading}
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 transition"
          disabled={loading}
        >
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </div>
  );
};

export default ResetPasswordPage;
