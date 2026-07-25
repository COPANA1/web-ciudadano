<script setup>
import { useRouter, useRoute } from 'vue-router'
import { computed, ref, watch } from 'vue'
import { useAuthStore } from './stores/auth'
import ToastContenedor from './components/ToastContenedor.vue'
import {
  LayoutDashboard, KanbanSquare, Map, Tag, Users, Building2, User, LogOut, ChevronDown, Menu, X
} from '@lucide/vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const esPublica = computed(() => route.meta.publica === true)
const menuUsuarioAbierto = ref(false)
const menuLateralAbierto = ref(false)

// Al cambiar de ruta se cierran los menús (clave en móvil)
watch(() => route.path, () => {
  menuLateralAbierto.value = false
  menuUsuarioAbierto.value = false
})

const menu = computed(() => {
  const items = [
    { nombre: 'Dashboard', ruta: '/dashboard', icono: LayoutDashboard },
    { nombre: 'Reportes', ruta: '/reportes', icono: KanbanSquare },
    { nombre: 'Mapa', ruta: '/mapa', icono: Map },
  ]
  if (auth.esAdmin) {
    items.push({ nombre: 'Categorías', ruta: '/categorias', icono: Tag })
    items.push({ nombre: 'Usuarios', ruta: '/usuarios', icono: Users })
  }
  if (auth.esSuperadmin) {
    items.push({ nombre: 'Organizaciones', ruta: '/organizaciones', icono: Building2 })
  }
  items.push({ nombre: 'Mi perfil', ruta: '/perfil', icono: User })
  return items
})

const tituloSeccion = computed(() => {
  const item = menu.value.find(i => route.path.startsWith(i.ruta))
  if (item) return item.nombre
  if (route.path.startsWith('/reportes/')) return 'Detalle de reporte'
  return 'Panel'
})

const inicial = computed(() => (auth.user?.name || '?').charAt(0).toUpperCase())

async function salir() {
  await auth.logout()
  router.push('/login')
}

function irPerfil() {
  menuUsuarioAbierto.value = false
  router.push('/perfil')
}
</script>

<template>
  <ToastContenedor />

  <div v-if="esPublica">
    <router-view />
  </div>

  <div v-else class="app">
    <!-- Capa oscura detrás del menú en móvil -->
    <div
      v-if="menuLateralAbierto"
      class="capa-movil"
      @click="menuLateralAbierto = false"
    ></div>

    <aside class="lateral" :class="{ 'lateral-abierto': menuLateralAbierto }">
      <div class="marca">
        <span class="marca-icono">◈</span>
        <div>
          <div class="marca-nombre">Reportes</div>
          <div class="marca-org">{{ auth.user?.organizacion || 'Sistema' }}</div>
        </div>
        <button class="cerrar-lateral" @click="menuLateralAbierto = false" aria-label="Cerrar menú">
          <X :size="20" />
        </button>
      </div>

      <nav class="nav">
        <router-link
          v-for="item in menu"
          :key="item.ruta"
          :to="item.ruta"
          class="nav-item"
          active-class="nav-activo"
        >
          <component :is="item.icono" :size="18" class="nav-icono" />
          {{ item.nombre }}
        </router-link>
      </nav>

      <div class="usuario">
        <div class="usuario-avatar">{{ inicial }}</div>
        <div class="usuario-datos">
          <div class="usuario-nombre">{{ auth.user?.name }}</div>
          <div class="usuario-rol mono">{{ auth.user?.rol }}</div>
        </div>
      </div>
    </aside>

    <div class="principal">
      <header class="cabecera-top">
        <div class="cabecera-izq">
          <button class="btn-hamburguesa" @click="menuLateralAbierto = true" aria-label="Abrir menú">
            <Menu :size="22" />
          </button>
          <h1 class="cabecera-titulo">{{ tituloSeccion }}</h1>
        </div>

        <div class="cabecera-derecha">
          <div class="menu-usuario" @click="menuUsuarioAbierto = !menuUsuarioAbierto">
            <div class="mini-avatar">{{ inicial }}</div>
            <div class="mini-datos">
              <div class="mini-nombre">{{ auth.user?.name }}</div>
              <div class="mini-org">{{ auth.user?.organizacion || 'Sistema' }}</div>
            </div>
            <ChevronDown :size="16" class="chevron" :class="{ girado: menuUsuarioAbierto }" />

            <div v-if="menuUsuarioAbierto" class="desplegable" @click.stop>
              <button class="desp-item" @click="irPerfil">
                <User :size="15" /> Mi perfil
              </button>
              <button class="desp-item desp-salir" @click="salir">
                <LogOut :size="15" /> Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <main class="contenido">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app {
  display: grid;
  grid-template-columns: 240px 1fr;
  min-height: 100vh;
}

.lateral {
  background: var(--superficie);
  border-right: 1px solid var(--borde);
  display: flex;
  flex-direction: column;
  padding: 20px 0;
}

.marca {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 20px 24px;
  border-bottom: 1px solid var(--borde);
  margin-bottom: 16px;
}
.marca-icono { font-size: 24px; color: var(--acento); }
.marca-nombre { font-weight: 600; font-size: 15px; }
.marca-org { font-size: 11px; color: var(--texto-sec); font-family: var(--mono); }

.cerrar-lateral {
  display: none;
  margin-left: auto;
  background: none;
  border: none;
  color: var(--texto-sec);
  padding: 4px;
}

.nav { flex: 1; padding: 0 12px; }
.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  color: var(--texto-sec);
  text-decoration: none;
  font-size: 14px;
  margin-bottom: 2px;
  transition: background .15s, color .15s;
}
.nav-item:hover { background: var(--superficie-alta); color: var(--texto); }
.nav-activo { background: var(--superficie-alta); color: var(--texto); font-weight: 500; }
.nav-activo .nav-icono { color: var(--acento); }
.nav-icono { flex-shrink: 0; }

.usuario {
  padding: 16px 20px 0;
  border-top: 1px solid var(--borde);
  display: flex;
  align-items: center;
  gap: 10px;
}
.usuario-avatar {
  width: 34px; height: 34px;
  border-radius: 50%;
  background: var(--acento);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}
.usuario-datos { min-width: 0; }
.usuario-nombre { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.usuario-rol { font-size: 10px; color: var(--texto-sec); text-transform: uppercase; letter-spacing: .05em; }

.principal { display: flex; flex-direction: column; max-height: 100vh; min-width: 0; }

.cabecera-top {
  height: 62px;
  border-bottom: 1px solid var(--borde);
  background: var(--superficie);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  flex-shrink: 0;
  gap: 12px;
}
.cabecera-izq { display: flex; align-items: center; gap: 12px; min-width: 0; }
.cabecera-titulo { font-size: 17px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.btn-hamburguesa {
  display: none;
  background: none;
  border: none;
  color: var(--texto);
  padding: 6px;
  border-radius: 6px;
}
.btn-hamburguesa:hover { background: var(--superficie-alta); }

.cabecera-derecha { display: flex; align-items: center; gap: 16px; }

.menu-usuario {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
  position: relative;
  transition: background .15s;
}
.menu-usuario:hover { background: var(--superficie-alta); }
.mini-avatar {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: var(--acento);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 13px;
  flex-shrink: 0;
}
.mini-datos { text-align: right; }
.mini-nombre { font-size: 13px; font-weight: 500; }
.mini-org { font-size: 11px; color: var(--texto-sec); }
.chevron { color: var(--texto-sec); transition: transform .2s; }
.chevron.girado { transform: rotate(180deg); }

.desplegable {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 180px;
  background: var(--superficie-alta);
  border: 1px solid var(--borde);
  border-radius: 8px;
  padding: 6px;
  box-shadow: 0 10px 30px rgba(0,0,0,.4);
  z-index: 100;
}
.desp-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 10px;
  background: none;
  border: none;
  color: var(--texto);
  font-size: 13px;
  border-radius: 5px;
  transition: background .15s;
}
.desp-item:hover { background: var(--fondo); }
.desp-salir { color: var(--alta); }

.contenido {
  padding: 28px 32px;
  overflow-y: auto;
  flex: 1;
}

.capa-movil { display: none; }

/* ---------- MÓVIL ---------- */
@media (max-width: 900px) {
  .app { grid-template-columns: 1fr; }

  .btn-hamburguesa { display: flex; align-items: center; }
  .cerrar-lateral { display: flex; align-items: center; }

  .lateral {
    display: flex;
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 260px;
    z-index: 200;
    transform: translateX(-100%);
    transition: transform .25s ease;
    overflow-y: auto;
  }
  .lateral-abierto { transform: translateX(0); }

  .capa-movil {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,.55);
    z-index: 150;
  }

  .cabecera-top { padding: 0 14px; height: 56px; }
  .cabecera-titulo { font-size: 15px; }
  .mini-datos { display: none; }
  .menu-usuario { padding: 4px; }
  .contenido { padding: 16px 14px; }
}
</style>