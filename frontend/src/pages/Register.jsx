import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/auth';

export default function RegisterPage() {
  const navigate = useNavigate();

  // Form field status
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    password2: '',
    first_name: '',
    last_name: '',
  });
  // Error message
  const [errors, setErrors] = useState({});

  // Input box change handling
  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Submit the form
  const handleSubmit = async e => {
    e.preventDefault();
    setErrors({});
    try {
      await API.register(form);
      // After successful registration, you will be taken to the login page
      navigate('/login');
    } catch (err) {
      // err is a field-level error or detail returned by the backend
      setErrors(err);
    }
  };

  return (
    <div>
      <h2>User registration</h2>
      <form onSubmit={handleSubmit}>
        {/* Username */}
        <div>
          <label>Username:</label>
          <input
            name="username"
            value={form.username}
            onChange={handleChange}
            placeholder="Enter Username"
          />
          {errors.username && <div style={{ color: 'red' }}>{errors.username}</div>}
        </div>

        {/* Email */}
        <div>
          <label>Email:</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Enter Email"
          />
          {errors.email && <div style={{ color: 'red' }}>{errors.email}</div>}
        </div>

        {/* Password */}
        <div>
          <label>Password:</label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Enter Password(At least 8 digits)"
          />
          {errors.password && <div style={{ color: 'red' }}>{errors.password}</div>}
        </div>

        {/* Confirm Password */}
        <div>
          <label>Confirm Password:</label>
          <input
            name="password2"
            type="password"
            value={form.password2}
            onChange={handleChange}
            placeholder="Enter Password Again"
          />
          {errors.password2 && <div style={{ color: 'red' }}>{errors.password2}</div>}
        </div>

        {/* Name */}
        <div>
          <label>Name:</label>
          <input
            name="first_name"
            value={form.first_name}
            onChange={handleChange}
            placeholder="Enter Name"
          />
        </div>

        {/* Surname */}
        <div>
          <label>Surname:</label>
          <input
            name="last_name"
            value={form.last_name}
            onChange={handleChange}
            placeholder="Enter Surname"
          />
        </div>

        {/* Submit Button */}
        <button type="submit">Registration</button>

        {/* Backend non-field error */}
        {errors.detail && <div style={{ color: 'red' }}>{errors.detail}</div>}
      </form>
    </div>
  );
}
