import React, { useState } from 'react';
import { signup } from '../services/api';

const SignupForm = ({ onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      await signup({
        name: formData.name,
        email: formData.email,
        password: formData.password
      });
      setSuccess(true);
      setTimeout(() => {
        onSwitchToLogin();
      }, 2000);
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      {error && <div className="alert error">{error}</div>}
      {success && (
        <div className="alert success">
          Account created successfully! Redirecting to login...
        </div>
      )}
      
      <div className="form-group">
        <label htmlFor="name" className="form-label">Full Name</label>
        <input
          id="name"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleChange}
          className="form-input"
          placeholder="Enter your full name"
          autoComplete="name"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="signup-email" className="form-label">Email</label>
        <input
          id="signup-email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          className="form-input"
          placeholder="Enter your email"
          autoComplete="email"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="signup-password" className="form-label">Password</label>
        <input
          id="signup-password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          className="form-input"
          placeholder="Create a password"
          autoComplete="new-password"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="confirm-password" className="form-label">Confirm Password</label>
        <input
          id="confirm-password"
          name="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={handleChange}
          className="form-input"
          placeholder="Confirm your password"
          autoComplete="new-password"
          required
        />
      </div>

      <button
        type="submit"
        className="auth-button"
        disabled={loading}
      >
        {loading ? 'Creating Account...' : 'Sign Up'}
      </button>

      <p className="auth-switch">
        Already have an account?{' '}
        <button
          type="button"
          className="auth-link"
          onClick={onSwitchToLogin}
        >
          Sign In
        </button>
      </p>
    </form>
  );
};

export default SignupForm;
