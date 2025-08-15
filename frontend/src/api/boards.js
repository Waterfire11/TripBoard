const API_BOARDS = {
  list:  (token) => fetch("/api/boards/", {
    headers: { Authorization:`Bearer ${token}` }
  }).then(r=>r.json()),
  create:(token, title) => fetch("/api/boards/", {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      Authorization:`Bearer ${token}`
    },
    body: JSON.stringify({ title })
  }).then(r=>r.json()),
  listCards: (token, boardId) => fetch(`/api/boards/${boardId}/cards/`, {
    headers:{ Authorization:`Bearer ${token}` }
  }).then(r=>r.json()),
  createCard:(token, boardId, title, pos) => fetch(`/api/boards/${boardId}/cards/`, {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      Authorization:`Bearer ${token}`
    },
    body: JSON.stringify({ title, position:pos })
  }).then(r=>r.json()),
  reorderCard:(token, cardId, pos) => fetch(`/api/boards/cards/${cardId}/reorder/`, {
    method:"PATCH",
    headers:{
      "Content-Type":"application/json",
      Authorization:`Bearer ${token}`
    },
    body: JSON.stringify({ position:pos })
  }).then(r=>r.json()),
}
export default API_BOARDS;
