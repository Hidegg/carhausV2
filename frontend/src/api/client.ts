import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
})

// Auth
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }).then(r => r.data),
  logout: () => api.post('/auth/logout').then(r => r.data),
  me: () => api.get('/auth/me').then(r => r.data),
}

// Manager
export const managerApi = {
  formData: () => api.get('/manager/form-data').then(r => r.data),
  addServicii: (data: object) => api.post('/manager/servicii', data).then(r => r.data),
  deleteServiciu: (id: number) => api.delete(`/manager/servicii/${id}`).then(r => r.data),
  editServiciu: (id: number, data: object) => api.put(`/manager/servicii/${id}`, data).then(r => r.data),
  nrFirmaSuggestions: () => api.get('/manager/nrfirma-suggestions').then(r => r.data),
  platesSearch: (q: string) => api.get(`/manager/plates-search?q=${encodeURIComponent(q)}`).then(r => r.data),
  dashboard: () => api.get('/manager/dashboard').then(r => r.data),
  updatePayment: (id: number, tipPlata: string, nrFirma?: string) =>
    api.post(`/manager/update-payment/${id}`, { tipPlata, ...(nrFirma ? { nrFirma } : {}) }).then(r => r.data),
  getClient: (plate: string) => api.get(`/manager/client/${plate}`).then(r => r.data),
  analytics: () => api.get('/manager/analytics').then(r => r.data),
  getEchipa: () => api.get('/manager/echipa').then(r => r.data),
  addSpalator: (numeSpalator: string) => api.post('/manager/echipa', { numeSpalator }).then(r => r.data),
  toggleSpalator: (id: number, prezentAzi: boolean) => api.put(`/manager/echipa/${id}`, { prezentAzi }).then(r => r.data),
  deleteSpalator: (id: number) => api.delete(`/manager/echipa/${id}`).then(r => r.data),
}

// Admin
export const adminApi = {
  overview: () => api.get('/admin/overview').then(r => r.data),
  zilnic: () => api.get('/admin/zilnic').then(r => r.data),
  saptamanal: () => api.get('/admin/saptamanal').then(r => r.data),
  lunar: () => api.get('/admin/lunar').then(r => r.data),
  spalatori: () => api.get('/admin/spalatori').then(r => r.data),
  settings: () => api.get('/admin/settings').then(r => r.data),
  addLocatie: (numeLocatie: string) =>
    api.post('/admin/settings/locatie', { numeLocatie }).then(r => r.data),
  editLocatie: (id: number, numeLocatie: string) =>
    api.put(`/admin/settings/locatie/${id}`, { numeLocatie }).then(r => r.data),
  deleteLocatie: (id: number) =>
    api.delete(`/admin/settings/locatie/${id}`).then(r => r.data),
  addSpalator: (numeSpalator: string, locatie_id: number) =>
    api.post('/admin/settings/spalator', { numeSpalator, locatie_id }).then(r => r.data),
  editSpalator: (id: number, numeSpalator: string, locatie_id: number) =>
    api.put(`/admin/settings/spalator/${id}`, { numeSpalator, locatie_id }).then(r => r.data),
  deleteSpalator: (id: number) =>
    api.delete(`/admin/settings/spalator/${id}`).then(r => r.data),
  editPreturi: (preturi: object[]) =>
    api.put('/admin/settings/preturi', preturi).then(r => r.data),
  editPret: (id: number, data: object) =>
    api.put(`/admin/settings/pret/${id}`, data).then(r => r.data),
  addPret: (serviciiPrestate: string, locatie_id?: number | null) =>
    api.post('/admin/settings/pret', { serviciiPrestate, locatie_id }).then(r => r.data),
  deletePret: (id: number) =>
    api.delete(`/admin/settings/pret/${id}`).then(r => r.data),
  cursPending: (locatie_id?: number) =>
    api.get('/admin/curs-pending', { params: locatie_id ? { locatie_id } : {} }).then(r => r.data),
  istoric: (params: { locatie_id?: number; year?: number; month?: number }) =>
    api.get('/admin/istoric', { params }).then(r => r.data),
  clienti: (params: { locatie_id?: number; sort?: string; dir?: string; q?: string; brand?: string }) =>
    api.get('/admin/clienti', { params }).then(r => r.data),
  clientHistory: (plate: string) =>
    api.get(`/admin/clienti/${plate}/history`).then(r => r.data),
  getManagers: () => api.get('/admin/settings/managers').then(r => r.data),
  addManager: (data: { username: string; password: string; locatie_id: number | null }) =>
    api.post('/admin/settings/manager', data).then(r => r.data),
  editManager: (id: number, data: { username?: string; password?: string; locatie_id?: number | null }) =>
    api.put(`/admin/settings/manager/${id}`, data).then(r => r.data),
  deleteManager: (id: number) =>
    api.delete(`/admin/settings/manager/${id}`).then(r => r.data),
}

// Dev
export const devApi = {
  overview: () => api.get('/dev/overview').then(r => r.data),
  clients: (q: string, page: number) =>
    api.get('/dev/clients', { params: { q, page } }).then(r => r.data),
  clientHistory: (plate: string) =>
    api.get(`/dev/client/${plate}/history`).then(r => r.data),
  accounts: () => api.get('/dev/accounts').then(r => r.data),
  addAccount: (data: { username: string; password: string; rol: string; locatie_id: number | null }) =>
    api.post('/dev/accounts', data).then(r => r.data),
  editAccount: (id: number, data: { username?: string; password?: string; rol?: string; locatie_id?: number | null }) =>
    api.put(`/dev/accounts/${id}`, data).then(r => r.data),
  deleteAccount: (id: number) =>
    api.delete(`/dev/accounts/${id}`).then(r => r.data),
  system: () => api.get('/dev/system').then(r => r.data),
  backup: () => api.post('/dev/backup').then(r => r.data),
}

export default api
