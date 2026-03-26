import axios from 'axios'

const api = axios.create({ baseURL: '/api/v1' })

// ── Users ──────────────────────────────────────────────────────────────────
export const createUser = (data) => api.post('/portfolio/users', data).then(r => r.data)
export const getUser    = (id)   => api.get(`/portfolio/users/${id}`).then(r => r.data)

// ── Portfolio ──────────────────────────────────────────────────────────────
export const getCurrentPortfolio = (userId) =>
  api.get('/portfolio/current', { params: { user_id: userId } }).then(r => r.data)

export const listSnapshots = (userId) =>
  api.get('/portfolio/snapshots', { params: { user_id: userId } }).then(r => r.data)

export const deleteSnapshot = (id, userId) =>
  api.delete(`/portfolio/snapshots/${id}`, { params: { user_id: userId } }).then(r => r.data)

// ── History ────────────────────────────────────────────────────────────────
export const getValueHistory = (userId, period = 'ALL') =>
  api.get('/history/value', { params: { user_id: userId, period } }).then(r => r.data)

export const getReturnsHistory = (userId, period = 'ALL') =>
  api.get('/history/returns', { params: { user_id: userId, period } }).then(r => r.data)

// ── Models ─────────────────────────────────────────────────────────────────
export const getModels = () => api.get('/models/').then(r => r.data)

// ── AI Analysis ────────────────────────────────────────────────────────────
export const portfolioChat = (payload) =>
  api.post('/ai/portfolio-chat', payload).then(r => r.data)

// ── Upload ─────────────────────────────────────────────────────────────────
export const uploadScreenshot = (file, ocrModel = 'auto') => {
  const form = new FormData()
  form.append('file', file)
  form.append('ocr_model', ocrModel)
  return api.post('/upload/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}

export const confirmSnapshot = (payload) =>
  api.post('/upload/confirm', payload).then(r => r.data)
