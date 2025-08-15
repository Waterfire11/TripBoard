const base = ''

export async function api(path, { method='GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const resp = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined })
  if (!resp.ok) throw await resp.json().catch(() => ({ detail: resp.statusText }))
  return resp.json()
}

// 业务 API
export const Auth = {
  login: (u,p) => api('/api/auth/token/', { method:'POST', body:{ username:u, password:p } }),
  me:   (token) => api('/api/auth/user/', { token }),
}
export const Boards = {
  list:  (token)            => api('/api/boards/', { token }),
  create:(token, title)     => api('/api/boards/', { method:'POST', token, body:{ title } }),
}
export const Cards = {
  create:(token, boardId, title, position=0) =>
    api('/api/cards/', { method:'POST', token, body:{ board: boardId, title, position } }),
}
