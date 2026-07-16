<script setup>
import { ref, onMounted } from 'vue'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()

const usuarios = ref([])
const cargando = ref(true)
const error = ref(null)
const modal = ref(false)
const editando = ref(null)
const filtro = ref({ rol: '', buscar: '' })

const form = ref({ name: '', email: '', password: '', rol: 'personal' })

const ROLES = {
  superadmin: 'Superadmin',
  admin: 'Administrador',
  personal: 'Personal / cuadrilla',
  ciudadano: 'Ciudadano',
}

async function cargar() {
  cargando.value = true
  try {
    const params = Object.fromEntries(
      Object.entries(filtro.value).filter(([, v]) => v !== '')
    )
    const { data } = await api.get('/usuarios', { params })
    usuarios.value = data.data
  } catch (e) {
    error.value = 'No se pudieron cargar los usuarios.'
  } finally {
    cargando.value = false
  }
}

function abrirNuevo() {
  editando.value = null
  form.value = { name: '', email: '', password: '', rol: 'personal' }
  modal.value = true
}

function abrirEditar(u) {
  editando.value = u.id
  form.value = { name: u.name, email: u.email, password: '', rol: u.rol }
  modal.value = true
}

async function guardar() {
  try {
    if (editando.value) {
      const payload = { name: form.value.name, rol: form.value.rol }
      if (form.value.password) payload.password = form.value.password
      await api.put(`/usuarios/${editando.value}`, payload)
    } else {
      await api.post('/usuarios', form.value)
    }
    modal.value = false
    await cargar()
  } catch (e) {
    const errores = e.response?.data?.errors
    if (errores) {
      alert(Object.values(errores).flat().join('\n'))
    } else {
      alert(e.response?.data?.message || 'No se pudo guardar el usuario.')
    }
  }
}

async function eliminar(u) {
  if (!confirm(`¿Eliminar a ${u.name}? Esta acción no se puede deshacer.`)) return
  try {
    await api.delete(`/usuarios/${u.id}`)
    await cargar()
  } catch (e) {
    alert(e.response?.data?.message || 'No se pudo eliminar el usuario.')
  }
}

function fecha(iso) {
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

onMounted(cargar)
</script>

<template>
  <div>
    <header class="cabecera">
      <div>
        <h1>Usuarios</h1>
        <p>Personal, administradores y ciudadanos de tu organización</p>
      </div>
      <button class="btn btn-primario" @click="abrirNuevo">+ Nuevo usuario</button>
    </header>

    <section class="filtros">
      <input
        v-model="filtro.buscar"
        class="campo"
        placeholder="Buscar por nombre o correo…"
        @keyup.enter="cargar"
      >
      <select v-model="filtro.rol" class="campo" @change="cargar">
        <option value="">Todos los roles</option>
        <option value="admin">Administrador</option>
        <option value="personal">Personal</option>
        <option value="ciudadano">Ciudadano</option>
      </select>
      <button class="btn" @click="cargar">Filtrar</button>
    </section>

    <p v-if="cargando" class="aviso">Cargando…</p>
    <p v-else-if="error" class="aviso error">{{ error }}</p>
    <p v-else-if="!usuarios.length" class="aviso">No hay usuarios que coincidan.</p>

    <table v-else class="tabla">
      <thead>
        <tr>
          <th>Usuario</th>
          <th>Rol</th>
          <th>Reportes</th>
          <th>Registrado</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in usuarios" :key="u.id">
          <td>
            <div class="nombre">{{ u.name }}</div>
            <div class="correo">{{ u.email }}</div>
          </td>
          <td>
            <span class="chip" :class="`rol-${u.rol}`">{{ ROLES[u.rol] || u.rol }}</span>
          </td>
          <td class="mono num">{{ u.reportes_count ?? 0 }}</td>
          <td class="fecha">{{ fecha(u.created_at) }}</td>
          <td class="acciones">
            <button class="btn mini" @click="abrirEditar(u)">Editar</button>
            <button
              v-if="u.id !== auth.user?.id"
              class="btn mini btn-peligro"
              @click="eliminar(u)"
            >Eliminar</button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Modal -->
    <div v-if="modal" class="capa" @click.self="modal = false">
      <div class="dialogo">
        <h2>{{ editando ? 'Editar usuario' : 'Nuevo usuario' }}</h2>

        <div class="grupo">
          <label class="etiqueta">Nombre</label>
          <input v-model="form.name" class="campo" placeholder="Nombre completo">
        </div>

        <div class="grupo">
          <label class="etiqueta">Correo</label>
          <input
            v-model="form.email"
            class="campo"
            type="email"
            :disabled="!!editando"
            placeholder="correo@ejemplo.com"
          >
          <p v-if="editando" class="ayuda">El correo no se puede cambiar.</p>
        </div>

        <div class="grupo">
          <label class="etiqueta">
            {{ editando ? 'Nueva contraseña (opcional)' : 'Contraseña' }}
          </label>
          <input
            v-model="form.password"
            class="campo"
            type="password"
            placeholder="Mínimo 8 caracteres"
          >
        </div>

        <div class="grupo">
          <label class="etiqueta">Rol</label>
          <select v-model="form.rol" class="campo">
            <option value="personal">Personal / cuadrilla</option>
            <option value="admin">Administrador</option>
            <option value="ciudadano">Ciudadano</option>
          </select>
          <p class="ayuda">
            El personal atiende reportes. El administrador además gestiona el sistema.
          </p>
        </div>

        <div class="dialogo-botones">
          <button class="btn" @click="modal = false">Cancelar</button>
          <button class="btn btn-primario" @click="guardar">
            {{ editando ? 'Guardar cambios' : 'Crear usuario' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cabecera {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--borde);
}
.cabecera h1 { font-size: 24px; font-weight: 600; margin-bottom: 4px; }
.cabecera p { color: var(--texto-sec); font-size: 13px; }

.filtros {
  display: grid;
  grid-template-columns: 2fr 1fr auto;
  gap: 8px;
  margin-bottom: 18px;
}

.aviso { color: var(--texto-sec); padding: 60px 0; text-align: center; }
.aviso.error { color: var(--alta); }

.tabla {
  width: 100%;
  border-collapse: collapse;
  background: #161D26;
  border: 1px solid var(--borde);
  border-radius: 10px;
  overflow: hidden;
}
.tabla th {
  text-align: left;
  padding: 12px 16px;
  font-size: 10px;
  font-weight: 600;
  color: var(--texto-sec);
  text-transform: uppercase;
  letter-spacing: .07em;
  border-bottom: 1px solid var(--borde);
}
.tabla td {
  padding: 13px 16px;
  border-bottom: 1px solid var(--borde);
  vertical-align: middle;
}
.tabla tbody tr:last-child td { border-bottom: none; }
.tabla tbody tr:hover { background: var(--superficie-alta); }

.nombre { font-weight: 500; margin-bottom: 2px; }
.correo { font-size: 12px; color: var(--texto-sec); }
.num { color: var(--texto-sec); font-size: 13px; }
.fecha { font-size: 12px; color: var(--texto-sec); }

.rol-superadmin { background: rgba(142,36,170,.15); color: #C77DDB; }
.rol-admin      { background: rgba(45,156,219,.15); color: var(--proceso); }
.rol-personal   { background: rgba(242,153,74,.15); color: var(--pendiente); }
.rol-ciudadano  { background: rgba(122,139,156,.15); color: var(--texto-sec); }

.acciones { display: flex; gap: 6px; justify-content: flex-end; }
.mini { padding: 5px 11px; font-size: 12px; }

.ayuda { font-size: 11px; color: var(--texto-sec); margin-top: 6px; opacity: .8; }
.campo:disabled { opacity: .5; cursor: not-allowed; }

.capa {
  position: fixed; inset: 0;
  background: rgba(15,20,25,.8);
  display: grid; place-items: center;
  z-index: 100; padding: 20px;
}
.dialogo {
  background: var(--superficie);
  border: 1px solid var(--borde);
  border-radius: 10px;
  padding: 26px;
  width: 100%;
  max-width: 440px;
  max-height: 90vh;
  overflow-y: auto;
}
.dialogo h2 { font-size: 17px; font-weight: 600; margin-bottom: 20px; }
.grupo { margin-bottom: 18px; }
.dialogo-botones {
  display: flex; gap: 8px;
  justify-content: flex-end;
  margin-top: 24px;
}

@media (max-width: 800px) {
  .filtros { grid-template-columns: 1fr; }
  .tabla { display: block; overflow-x: auto; }
}
</style>