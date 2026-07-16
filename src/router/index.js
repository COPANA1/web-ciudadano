import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  { path: '/login', name: 'login', component: () => import('../views/Login.vue'), meta: { publica: true } },
  { path: '/registro', name: 'registro', component: () => import('../views/Registro.vue'), meta: { publica: true } },
  { path: '/recuperar', name: 'recuperar', component: () => import('../views/RecuperarPassword.vue'), meta: { publica: true } },
  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', name: 'dashboard', component: () => import('../views/Dashboard.vue') },
  { path: '/reportes', name: 'reportes', component: () => import('../views/Reportes.vue') },
  { path: '/reportes/:id', name: 'reporte-detalle', component: () => import('../views/ReporteDetalle.vue') },
  { path: '/categorias', name: 'categorias', component: () => import('../views/Categorias.vue'), meta: { soloAdmin: true } },
  { path: '/usuarios', name: 'usuarios', component: () => import('../views/Usuarios.vue'), meta: { soloAdmin: true } },
  { path: '/organizaciones', name: 'organizaciones', component: () => import('../views/Organizaciones.vue'), meta: { soloSuperadmin: true } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (!to.meta.publica && !auth.autenticado) return { name: 'login' }
  if (to.name === 'login' && auth.autenticado) return { name: 'dashboard' }
  if (to.meta.soloAdmin && !auth.esAdmin) return { name: 'dashboard' }
  if (to.meta.soloSuperadmin && !auth.esSuperadmin) return { name: 'dashboard' }
})

export default router