import { useEffect, useState } from 'react'
import { Boards, Cards } from '../api/client'

export default function BoardsPage({ token }) {
  const [boards, setBoards] = useState([])
  const [title, setTitle]   = useState('')

  async function load() {
    const data = await Boards.list(token)
    setBoards(data)
  }
  useEffect(() => { load() }, [])

  return (
    <div>
      <h2>Boards</h2>
      <ul>
        {boards.map(b => (
          <li key={b.id}>
            {b.title}
            <button onClick={async ()=>{
              await Cards.create(token, b.id, 'New Card', 0)
              await load()
            }}>+ Card</button>
          </li>
        ))}
      </ul>

      <h3>Create Board</h3>
      <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Board title" />
      <button onClick={async ()=>{
        if (!title.trim()) return
        await Boards.create(token, title.trim())
        setTitle(''); await load()
      }}>Create</button>
    </div>
  )
}
