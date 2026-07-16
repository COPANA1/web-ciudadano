<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()

const usuarios = ref([])
const organizaciones = ref([])
const cargando = ref(false)
const error = ref(null)

const filtroRol = ref('')
const busqueda = ref('')

const modalAbierto = ref(false)
const editando = ref(null)
const guardando = ref(false)
const errorModal = ref(null)

const form = ref({
  name: '',
  email: '',
  password: '',
  rol: 'personal',
  organizacion_id: null,
})

const roles = ['admin', 'personal', 'ciudadano']

const esSuperadmin = computed(() => auth.esSuperadmin)

async function cargar() {
  cargando.value = true
  error.value = null
  try {
    const params = {}
    if (filtroRol.value) params.rol = filtroRol.value
    if (busqueda.value) params.buscar = busqueda.value
    const { data } = await api.get('/usuarios', { params })
    usuarios.value = data.data || data
  } catch (e) {
    error.value = e.response?.data?.message || 'No se pudieron cargar los usuarios.'
  } finally {
    cargando.value = false
  }
}

async function cargarOrganizaciones() {
  if (!esSuperadmin.value) return
  try {
    const { data } = await api.get('/organizaciones')
    organizaciones.value = data.data || data
  } catch (e) {
    organizaciones.value = []
  }
}

function abrirCrear() {
  editando.value = null
  errorModal.value = null
  form.value = { name: '', email: '', password: '', rol: 'personal', organizacion_id: null }
  modalAbierto.value = true
}

function abrirEditar(u) {
  editando.value = u
  errorModal.value = null
  form.value = {
    name: u.name,
    email: u.email,
    password: '',
    rol: u.rol,
    organizacion_id: u.organizacion_id,
  }
  modalAbierto.value = true
}

function cerrarModal() {
  modalAbierto.value = false
}

async function guardar() {
  guardando.value = true
  errorModal.value = null
  try {
    if (editando.value) {
      const payload = { name: form.value.name, rol: form.value.rol }
      if (form.value.password) payload.password = form.value.password
      if (esSuperadmin.value) payload.organizacion_id = form.value.organizacion_id
      await api.put(`/usuarios/${editando.value.id}`, payload)
    } else {
      const payload = {
        name: form.value.name,
        email: form.value.email,
        password: form.value.password,
        rol: form.value.rol,
      }
      if (esSuperadmin.value) payload.organizacion_id = form.value.organizacion_id
      await api.post('/usuarios', payload)
    }
    modalAbierto.value = false
    await cargar()
  } catch (e) {
    const errores = e.response?.data?.errors
    errorModal.value = errores
      ? Object.values(errores).flat().join(' ')
      : (e.response?.data?.message || 'No se pudo guardar.')
  } finally {
    guardando.value = false
  }
}

async function eliminar(u) {
  if (!confirm(`¿Eliminar a ${u.name}? Esta acción no se puede deshacer.`)) return
  try {
    await api.delete(`/usuarios/${u.id}`)
    await cargar()
  } catch (e) {
    alert(e.response?.data?.message || 'No se pudo eliminar.')
  }
}

function colorRol(rol) {
  return {
    superadmin: 'var(--alta)',
    admin: 'var(--acento)',
    personal: 'var(--media)',
    ciudadano: 'var(--texto-sec)',
  }[rol] || 'var(--texto-sec)'
}

onMounted(() => {
  cargar()
  cargarOrganizaciones()
})
</script>

<template>
  <div>
    <div class="encabezado">
      <div>
        <h1 class="titulo">Usuarios</h1>
        <p class="subtitulo">Gestiona cuentas, roles y organizaciones</p>
      </div>
      <button class="btn btn-primario" @click="abrirCrear">+ Nuevo usuario</button>
    </div>

    <div class="filtros">
      <input
        v-model="busqueda"
        class="campo"
        placeholder="Buscar por nombre o correo…"
        @keyup.enter="cargar"
      >
      <select v-model="filtroRol" class="campo" @change="cargar">
        <option value="">Todos los roles</option>
        <option value="admin">Admin</option>
        <option value="personal">Personal</option>
        <option value="ciudadano">Ciudadano</option>
      </select>
      <button class="btn" @click="cargar">Filtrar</button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="cargando" class="cargando">Cargando usuarios…</div>

    <div v-else class="tabla-wrap">
      <table class="tabla">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Correo</th>
            <th>Rol</th>
            <th>Organización</th>
            <th>Reportes</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in usuarios" :key="u.id">
            <td>{{ u.name }}</td>
            <td class="mono">{{ u.email }}</td>
            <td>
              <span class="chip" :style="{ color: colorRol(u.rol), borderColor: colorRol(u.rol) }">
                {{ u.rol }}
              </span>
            </td>
            <td>{{ u.organizacion?.nombre || '—' }}</td>
            <td>{{ u.reportes_count ?? 0 }}</td>
            <td class="acciones">
              <button class="mini" @click="abrirEditar(u)">Editar</button>
              <button
                v-if="u.id !== auth.user?.id"
                class="mini mini-peligro"
                @click="eliminar(u)"
              >
                Eliminar
              </button>
            </td>
          </tr>
          <tr v-if="!usuarios.length">
            <td colspan="6" class="vacio">No hay usuarios que mostrar.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="modalAbierto" class="modal-fondo" @click.self="cerrarModal">
      <div class="modal">
        <h2 class="modal-titulo">{{ editando ? 'Editar usuario' : 'Nuevo usuario' }}</h2>

        <div class="grupo">
          <label class="etiqueta">Nombre</label>
          <input v-model="form.name" class="campo" type="text">
        </div>

        <div class="grupo" v-if="!editando">
          <label class="etiqueta">Correo</label>
          <input v-model="form.email" class="campo" type="email">
        </div>

        <div class="grupo">
          <label class="etiqueta">
            {{ editando ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña' }}
          </label>
          <input v-model="form.password" class="campo" type="password" autocomplete="new-password">
          <span class="ayuda">Mínimo 8 caracteres</span>
        </div>

        <div class="grupo">
          <label class="etiqueta">Rol</label>
          <select v-model="form.rol" class="campo">
            <option v-for="r in roles" :key="r" :value="r">{{ r }}</option>
          </select>
        </div>

        <div class="grupo" v-if="esSuperadmin">
          <label class="etiqueta">Organización</label>
          <select v-model="form.organizacion_id" class="campo">
            <option :value="null">Sin organización</option>
            <option v-for="o in organizaciones" :key="o.id" :value="o.id">{{ o.nombre }}</option>
          </select>
          <span class="ayuda">Un admin/personal necesita organización para ver sus reportes.</span>
        </div>

        <p v-if="errorModal" class="error">{{ errorModal }}</p>

        <div class="modal-botones">
          <button class="btn" @click="cerrarModal">Cancelar</button>
          <button class="btn btn-primario" :disabled="guardando" @click="guardar">
            {{ guardando ? 'Guardando…' : 'Guardar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.encabezado {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}
.titulo { font-size: 22px; font-weight: 600; }
.subtitulo { font-size: 13px; color: var(--texto-sec); margin-top: 4px; }

.filtros {
  display: flex;
  gap: 10px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}
.filtros .campo { max-width: 260px; }

.error {
  background: rgba(235,87,87,.12);
  border: 1px solid rgba(235,87,87,.3);
  color: var(--alta);
  padding: 10px 12px;
  border-radius: 4px;
  font-size: 13px;
  margin-bottom: 14px;
}

.cargando { color: var(--texto-sec); padding: 40px 0; text-align: center; }

.tabla-wrap {
  background: var(--superficie);
  border: 1px solid var(--borde);
  border-radius: 8px;
  overflow: hidden;
}
.tabla { width: 100%; border-collapse: collapse; }
.tabla th {
  text-align: left;
  padding: 12px 16px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .05em;
  color: var(--texto-sec);
  border-bottom: 1px solid var(--borde);
}
.tabla td {
  padding: 12px 16px;
  font-size: 14px;
  border-bottom: 1px solid var(--borde);
}
.tabla tbody tr:last-child td { border-bottom: none; }
.tabla tbody tr:hover { background: var(--superficie-alta); }

.chip {
  display: inline-block;
  padding: 2px 10px;
  border: 1px solid;
  border-radius: 12px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .04em;
}

.acciones { text-align: right; white-space: nowrap; }
.mini {
  background: none;
  border: 1px solid var(--borde);
  color: var(--texto-sec);
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  margin-left: 6px;
  transition: color .15s, border-color .15s;
}
.mini:hover { color: var(--texto); border-color: var(--texto-sec); }
.mini-peligro:hover { color: var(--alta); border-color: var(--alta); }

.vacio { text-align: center; color: var(--texto-sec); padding: 30px 0; }

.modal-fondo {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.6);
  display: grid;
  place-items: center;
  padding: 20px;
  z-index: 50;
}
.modal {
  width: 100%;
  max-width: 420px;
  background: var(--superficie);
  border: 1px solid var(--borde);
  border-radius: 8px;
  padding: 24px;
}
.modal-titulo { font-size: 18px; font-weight: 600; margin-bottom: 18px; }
.grupo { margin-bottom: 16px; }
.ayuda { display: block; font-size: 11px; color: var(--texto-sec); margin-top: 6px; }
.modal-botones {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}
</style>