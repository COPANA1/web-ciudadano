<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()

const reportes = ref([])
const categorias = ref([])
const personal = ref([])
const cargando = ref(true)
const error = ref(null)
const exportando = ref(false)

const paginacion = ref({ actual: 1, ultima: 1, total: 0 })
const filtros = ref({ estado: '', categoria_id: '', prioridad: '', buscar: '' })

const ESTADOS = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  resuelto: 'Resuelto',
}

const hayFiltros = computed(() =>
  Object.values(filtros.value).some(v => v !== '')
)

async function cargar(pagina = 1) {
  cargando.value = true
  error.value = null
  try {
    const params = Object.fromEntries(
      Object.entries(filtros.value).filter(([, v]) => v !== '')
    )
    params.page = pagina

    const { data } = await api.get('/reportes', { params })
    reportes.value = data.data
    paginacion.value = {
      actual: data.current_page,
      ultima: data.last_page,
      total: data.total,
    }
  } catch (e) {
    error.value = 'No se pudieron cargar los reportes.'
  } finally {
    cargando.value = false
  }
}

async function cargarAuxiliares() {
  try {
    const { data } = await api.get('/categorias')
    categorias.value = data
  } catch (e) { /* silencioso */ }

  if (auth.esAdmin) {
    try {
      const { data } = await api.get('/usuarios', { params: { rol: 'personal', per_page: 100 } })
      personal.value = data.data
    } catch (e) { /* silencioso */ }
  }
}

function limpiarFiltros() {
  filtros.value = { estado: '', categoria_id: '', prioridad: '', buscar: '' }
  cargar(1)
}

async function asignar(reporte, userId) {
  try {
    if (!userId) return
    await api.put(`/reportes/${reporte.id}/asignar`, { asignado_a: userId })
    await cargar(paginacion.value.actual)
  } catch (e) {
    alert(e.response?.data?.message || 'No se pudo asignar el reporte.')
  }
}

function verDetalle(id) {
  router.push(`/reportes/${id}`)
}

/* Exportar todos los reportes (respetando filtros) a CSV */
async function exportar() {
  exportando.value = true
  try {
    const params = Object.fromEntries(
      Object.entries(filtros.value).filter(([, v]) => v !== '')
    )
    params.per_page = 1000

    const { data } = await api.get('/reportes', { params })
    const filas = data.data

    const encabezados = [
      'ID', 'Titulo', 'Descripcion', 'Categoria', 'Estado', 'Prioridad',
      'Direccion', 'Latitud', 'Longitud', 'Reportado por', 'Asignado a',
      'Fecha reporte', 'Fecha resolucion',
    ]

    const escapar = (v) => {
      const s = String(v ?? '').replace(/"/g, '""')
      return `"${s}"`
    }

    const lineas = filas.map(r => [
      r.id,
      r.titulo,
      r.descripcion,
      r.categoria?.nombre || '',
      ESTADOS[r.estado] || r.estado,
      r.prioridad,
      r.direccion || '',
      r.latitud,
      r.longitud,
      r.user?.name || '',
      r.asignado?.name || 'Sin asignar',
      new Date(r.created_at).toLocaleString('es-PE'),
      r.resuelto_en ? new Date(r.resuelto_en).toLocaleString('es-PE') : '',
    ].map(escapar).join(','))

    // BOM para que Excel lea bien las tildes
    const csv = '\uFEFF' + [encabezados.map(escapar).join(','), ...lineas].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = `reportes_${new Date().toISOString().slice(0, 10)}.csv`
    enlace.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    alert('No se pudo exportar. Intenta de nuevo.')
  } finally {
    exportando.value = false
  }
}

function fecha(iso) {
  return new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'short', year: '2-digit'
  })
}

function diasAbierto(r) {
  if (r.estado === 'resuelto') return null
  return Math.floor((Date.now() - new Date(r.created_at)) / 86400000)
}

onMounted(async () => {
  await Promise.all([cargar(), cargarAuxiliares()])
})
</script>

<template>
  <div>
    <header class="cabecera">
      <div>
        <h1>Reportes</h1>
        <p>{{ paginacion.total }} reportes en total</p>
      </div>
      <button
        class="btn"
        :disabled="exportando || !reportes.length"
        @click="exportar"
      >
        {{ exportando ? 'Exportando…' : '↓ Exportar a Excel' }}
      </button>
    </header>

    <section class="filtros">
      <input
        v-model="filtros.buscar"
        class="campo"
        placeholder="Buscar por título, descripción o dirección…"
        @keyup.enter="cargar(1)"
      >
      <select v-model="filtros.estado" class="campo" @change="cargar(1)">
        <option value="">Todos los estados</option>
        <option value="pendiente">Pendiente</option>
        <option value="en_proceso">En proceso</option>
        <option value="resuelto">Resuelto</option>
      </select>
      <select v-model="filtros.categoria_id" class="campo" @change="cargar(1)">
        <option value="">Todas las categorías</option>
        <option v-for="c in categorias" :key="c.id" :value="c.id">{{ c.nombre }}</option>
      </select>
      <select v-model="filtros.prioridad" class="campo" @change="cargar(1)">
        <option value="">Toda prioridad</option>
        <option value="alta">Alta</option>
        <option value="media">Media</option>
        <option value="baja">Baja</option>
      </select>
      <button class="btn" @click="cargar(1)">Filtrar</button>
      <button v-if="hayFiltros" class="btn" @click="limpiarFiltros">Limpiar</button>
    </section>

    <p v-if="cargando" class="aviso">Cargando reportes…</p>
    <p v-else-if="error" class="aviso error">{{ error }}</p>
    <p v-else-if="!reportes.length" class="aviso">
      No hay reportes que coincidan con estos filtros.
    </p>

    <template v-else>
      <table class="tabla">
        <thead>
          <tr>
            <th>ID</th>
            <th>Reporte</th>
            <th>Categoría</th>
            <th>Prioridad</th>
            <th>Estado</th>
            <th>Asignado</th>
            <th>Fecha</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="r in reportes"
            :key="r.id"
            class="fila"
            @click="verDetalle(r.id)"
          >
            <td class="mono id">#{{ r.id }}</td>
            <td>
              <div class="titulo">{{ r.titulo }}</div>
              <div class="direccion">{{ r.direccion || 'Sin dirección' }}</div>
            </td>
            <td>
              <span class="punto" :style="{ background: r.categoria?.color || '#7A8B9C' }"></span>
              {{ r.categoria?.nombre || '—' }}
            </td>
            <td>
              <span class="chip" :class="`chip-${r.prioridad}`">{{ r.prioridad }}</span>
            </td>
            <td>
              <span class="chip" :class="`chip-${r.estado}`">{{ ESTADOS[r.estado] }}</span>
              <span
                v-if="diasAbierto(r) > 14"
                class="alerta mono"
                title="Lleva más de 2 semanas sin resolverse"
              >{{ diasAbierto(r) }}d</span>
            </td>
            <td class="asignado" @click.stop>
              <select
                v-if="auth.esAdmin"
                class="campo mini"
                :value="r.asignado_a || ''"
                @change="asignar(r, $event.target.value)"
              >
                <option value="">Sin asignar</option>
                <option v-for="p in personal" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
              <span v-else class="sec">{{ r.asignado?.name || '—' }}</span>
            </td>
            <td class="mono fecha">{{ fecha(r.created_at) }}</td>
            <td class="flecha">→</td>
          </tr>
        </tbody>
      </table>

      <nav v-if="paginacion.ultima > 1" class="paginacion">
        <button
          class="btn mini"
          :disabled="paginacion.actual === 1"
          @click="cargar(paginacion.actual - 1)"
        >← Anterior</button>

        <span class="pagina mono">
          Página {{ paginacion.actual }} de {{ paginacion.ultima }}
        </span>

        <button
          class="btn mini"
          :disabled="paginacion.actual === paginacion.ultima"
          @click="cargar(paginacion.actual + 1)"
        >Siguiente →</button>
      </nav>
    </template>
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
.cabecera .btn:disabled { opacity: .4; cursor: not-allowed; }

.filtros {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr auto auto;
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

.fila { cursor: pointer; transition: background .12s; }
.fila:hover { background: var(--superficie-alta); }
.fila:hover .flecha { color: var(--acento); }

.id { color: var(--texto-sec); font-size: 12px; }
.titulo { font-weight: 500; margin-bottom: 2px; }
.direccion { font-size: 12px; color: var(--texto-sec); }
.fecha { font-size: 12px; color: var(--texto-sec); }
.sec { color: var(--texto-sec); }

.flecha {
  color: var(--borde);
  text-align: right;
  transition: color .12s;
}

.punto {
  display: inline-block;
  width: 8px; height: 8px;
  border-radius: 2px;
  margin-right: 8px;
}

.alerta {
  display: inline-block;
  margin-left: 6px;
  font-size: 10px;
  color: var(--alta);
  background: rgba(235,87,87,.12);
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 600;
}

.mini { padding: 5px 11px; font-size: 12px; }
.asignado .campo.mini { padding: 5px 8px; font-size: 12px; min-width: 130px; }

.paginacion {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 20px;
}
.paginacion .btn:disabled { opacity: .35; cursor: not-allowed; }
.pagina { font-size: 12px; color: var(--texto-sec); }

@media (max-width: 1100px) {
  .filtros { grid-template-columns: 1fr 1fr; }
  .tabla { display: block; overflow-x: auto; white-space: nowrap; }
}
</style>