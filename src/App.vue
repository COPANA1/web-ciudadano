<script setup>
import { useRouter, useRoute } from 'vue-router'
import { computed } from 'vue'
import { useAuthStore } from './stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const esPublica = computed(() => route.meta.publica === true)

const menu = computed(() => {
  const items = [
    { nombre: 'Dashboard', ruta: '/dashboard', icono: '▣' },
    { nombre: 'Reportes', ruta: '/reportes', icono: '◈' },
  ]
  if (auth.esAdmin) {
    items.push({ nombre: 'Categorías', ruta: '/categorias', icono: '◉' })
    items.push({ nombre: 'Usuarios', ruta: '/usuarios', icono: '●' })
  }
  if (auth.esSuperadmin) {
    items.push({ nombre: 'Organizaciones', ruta: '/organizaciones', icono: '⬢' })
  }
  return items
})

async function salir() {
  await auth.logout()
  router.push('/login')
}
</script>

<template>
  <div v-if="esPublica">
    <router-view />
  </div>

  <div v-else class="app">
    <aside class="lateral">
      <div class="marca">
        <span class="marca-icono">◈</span>
        <div>
          <div class="marca-nombre">Reportes</div>
          <div class="marca-org">{{ auth.user?.organizacion || 'Sistema' }}</div>
        </div>
      </div>

      <nav class="nav">
        <router-link
          v-for="item in menu"
          :key="item.ruta"
          :to="item.ruta"
          class="nav-item"
          active-class="nav-activo"
        >
          <span class="nav-icono">{{ item.icono }}</span>
          {{ item.nombre }}
        </router-link>
      </nav>

      <div class="usuario">
        <div class="usuario-datos">
          <div class="usuario-nombre">{{ auth.user?.name }}</div>
          <div class="usuario-rol mono">{{ auth.user?.rol }}</div>
        </div>
        <button class="btn" @click="salir">Salir</button>
      </div>
    </aside>

    <main class="contenido">
      <router-view />
    </main>
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
.marca-icono {
  font-size: 24px;
  color: var(--acento);
}
.marca-nombre { font-weight: 600; font-size: 15px; }
.marca-org {
  font-size: 11px;
  color: var(--texto-sec);
  font-family: var(--mono);
}

.nav { flex: 1; padding: 0 12px; }
.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 4px;
  color: var(--texto-sec);
  text-decoration: none;
  font-size: 14px;
  margin-bottom: 2px;
  transition: background .15s, color .15s;
}
.nav-item:hover { background: var(--superficie-alta); color: var(--texto); }
.nav-activo {
  background: var(--superficie-alta);
  color: var(--texto);
  font-weight: 500;
}
.nav-activo .nav-icono { color: var(--acento); }
.nav-icono { font-size: 14px; width: 16px; }

.usuario {
  padding: 16px 20px 0;
  border-top: 1px solid var(--borde);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.usuario-nombre { font-size: 13px; font-weight: 500; }
.usuario-rol {
  font-size: 10px;
  color: var(--texto-sec);
  text-transform: uppercase;
  letter-spacing: .05em;
}

.contenido {
  padding: 28px 32px;
  overflow-y: auto;
  max-height: 100vh;
}

@media (max-width: 768px) {
  .app { grid-template-columns: 1fr; }
  .lateral { display: none; }
}
</style>