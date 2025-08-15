import { useState } from 'react'
import { Auth } from '../api/client'

export default function Login({ onLogin }) {
  const [username, setU] = useState(''); const [password, setP] = useState('')
  const [err, setErr]   = useState('')
  return (
    <form onSubmit={async e => {
      e.preventDefault()
      try {
        const { access, refresh } = await Auth.login(username, password)
        localStorage.setItem('access', access); localStorage.setItem('refresh', refresh)
        onLogin(access)
      } catch (e) { setErr(e.detail || 'Login failed') }
    }}>
      <h2>Login</h2>
      <input placeholder="Username" value={username} onChange={e=>setU(e.target.value)} />
      <input placeholder="Password" type="password" value={password} onChange={e=>setP(e.target.value)} />
      <button>Login</button>
      {err && <p style={{color:'red'}}>{err}</p>}
    </form>
  )
}
