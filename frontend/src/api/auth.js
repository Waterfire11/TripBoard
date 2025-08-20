const API = {
  login: async ({ username, password }) => {
    const resp = await fetch('/api/auth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!resp.ok) throw new Error('Login failed');
    return resp.json(); // { access, refresh }
  },
  refresh: async (refresh) => {
    const resp = await fetch('/api/auth/token/refresh/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (!resp.ok) throw new Error('Refresh token failed');
    return resp.json(); // { access }
  },
  getUser: async (access) => {
    const resp = await fetch('/api/auth/user/', {
      headers: {'Authorization': `Bearer ${access}`},
    });
    if (!resp.ok) throw new Error('Not authenticated');
    return resp.json(); // user info
  },

  register: async ({ username, email, password, password2, first_name, last_name }) => {
    const resp = await fetch('/api/auth/register/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, password2, first_name, last_name }),
    });
    if (!resp.ok) {
      const err = await resp.json();
      throw err;
    }
    return resp.json(); // { detail: "Registration successful." }
  },
};

export default API;
