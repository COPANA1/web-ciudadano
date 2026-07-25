import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../services/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))
  const token = ref(localStorage.getItem('token') || null)
  const cargando = ref(false)
  const error = ref(null)

  const autenticado = computed(() => !!token.value)
  const esAdmin = computed(() => ['admin', 'superadmin'].includes(user.value?.rol))
  const esSuperadmin = computed(() => user.value?.rol === 'superadmin')
  const puedeGestionar = computed(() =>
    ['admin', 'superadmin', 'personal'].includes(user.value?.rol)
  )

  async function login(email, password) {
    cargando.value = true
    error.value = null
    try {
      const { data } = await api.post('/login', { email, password })

      if (!['admin', 'superadmin', 'personal'].includes(data.user.rol)) {
        error.value = 'Esta cuenta no tiene acceso al panel administrativo.'
        return false
      }

      user.value = data.user
      token.value = data.token
      localStorage.setItem('user', JSON.stringify(data.user))
      localStorage.setItem('token', data.token)
      return true
    } catch (e) {
      error.value = e.response?.data?.message || 'No se pudo iniciar sesión.'
      return false
    } finally {
      cargando.value = false
    }
  }

  async function loginConGoogle(idToken) {
    cargando.value = true
    error.value = null
    try {
      const { data } = await api.post('/google-login', { id_token: idToken })

      if (!['admin', 'superadmin', 'personal'].includes(data.user.rol)) {
        error.value = 'Esta cuenta de Google no tiene acceso al panel administrativo.'
        return false
      }

      user.value = data.user
      token.value = data.token
      localStorage.setItem('user', JSON.stringify(data.user))
      localStorage.setItem('token', data.token)
      return true
    } catch (e) {
      error.value = e.response?.data?.message || 'No se pudo iniciar sesión con Google.'
      return false
    } finally {
      cargando.value = false
    }
  }

  async function registrar(nombre, email, password) {
    cargando.value = true
    error.value = null
    try {
      await api.post('/registro', { name: nombre, email, password })
      return true
    } catch (e) {
      const errores = e.response?.data?.errors
      if (errores) {
        error.value = Object.values(errores).flat().join(' ')
      } else {
        error.value = e.response?.data?.message || 'No se pudo crear la cuenta.'
      }
      return false
    } finally {
      cargando.value = false
    }
  }
  async function actualizarPerfil(payload) {
    cargando.value = true
    error.value = null
    try {
      const { data } = await api.put('/perfil', payload)
      user.value = data
      localStorage.setItem('user', JSON.stringify(data))
      return true
    } catch (e) {
      error.value = e.response?.data?.message || 'No se pudo actualizar el perfil.'
      return false
    } finally {
      cargando.value = false
    }
  }
  async function logout() {
    try { await api.post('/logout') } catch (e) { /* el token ya puede estar muerto */ }
    user.value = null
    token.value = null
    localStorage.removeItem('user')
    localStorage.removeItem('token')
  }

  return {
    user, token, cargando, error,
    autenticado, esAdmin, esSuperadmin, puedeGestionar,
    login, loginConGoogle, registrar, actualizarPerfil, logout,
  }
})