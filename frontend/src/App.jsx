import { useEffect, useState } from 'react'

async function api(path, { method='GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const resp = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined })
  if (!resp.ok) throw await resp.json()
  return resp.json()
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('access') || '')
  const [user, setUser]   = useState(null)
  const [boards, setBoards] = useState([])
  const [form, setForm] = useState({ username:'', password:'' })
  const [title, setTitle] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!token) return
    api('/api/auth/user/', { token })
      .then(setUser)
      .catch(() => { setUser(null); setToken(''); localStorage.clear() })
  }, [token])

  useEffect(() => {
    if (!token) return
    api('/api/boards/', { token }).then(setBoards).catch(e => setErr(JSON.stringify(e)))
  }, [token])

  const login = async (e) => {
    e.preventDefault()
    try {
      const { access, refresh } = await api('/api/auth/token/', {
        method:'POST',
        body: { username: form.username, password: form.password }
      })
      localStorage.setItem('access', access)
      localStorage.setItem('refresh', refresh)
      setToken(access)
    } catch (e) { setErr(e.detail || 'Login failed') }
  }

  const createBoard = async () => {
    if (!title.trim()) return
    try {
      const b = await api('/api/boards/', { method:'POST', token, body: { title: title.trim() } })
      setBoards([b, ...boards]); setTitle('')
    } catch (e) { setErr(JSON.stringify(e)) }
  }

  if (!token)
    return (
      <form onSubmit={login} style={{ display:'grid', gap:8, width:320, margin:'100px auto' }}>
        <h2>Login</h2>
        <input placeholder="Username" value={form.username} onChange={e=>setForm({...form, username:e.target.value})}/>
        <input placeholder="Password" type="password" value={form.password} onChange={e=>setForm({...form, password:e.target.value})}/>
        <button>Login</button>
        {err && <div style={{color:'crimson'}}>{String(err)}</div>}
      </form>
    )

  if (!user) return <div style={{padding:40}}>Loading…</div>

  return (
    <div style={{ maxWidth: 800, margin:'40px auto' }}>
      <header style={{display:'flex', gap:12, alignItems:'center'}}>
        <h2 style={{margin:0}}>Hi, {user.username}</h2>
        <button onClick={()=>{ localStorage.clear(); setToken('') }}>Logout</button>
      </header>

      <section style={{marginTop:16}}>
        <div style={{display:'flex', gap:8}}>
          <input placeholder="New board title" value={title} onChange={e=>setTitle(e.target.value)}/>
          <button onClick={createBoard}>Create</button>
        </div>
        <ul>
          {boards.map(b => <li key={b.id}>{b.title}</li>)}
        </ul>
        {err && <pre style={{color:'crimson'}}>{err}</pre>}
      </section>
    </div>
  )
}
