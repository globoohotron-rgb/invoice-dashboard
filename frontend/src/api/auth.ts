import api from './client'
import { User } from '../types'

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ user: User; token: string }>('/auth/login', { email, password }),

  register: (email: string, password: string, name: string) =>
    api.post<{ user: User; token: string }>('/auth/register', { email, password, name }),

  logout: () => api.post('/auth/logout'),

  me: () => api.get<{ user: User }>('/auth/me'),
}
