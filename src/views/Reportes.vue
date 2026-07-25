<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'
import { useToast } from '../composables/useToast'

const router = useRouter()
const auth = useAuthStore()
const toast = useToast()

const reportes = ref([])
const categorias = ref([])
const cargando = ref(true)
const error = ref(null)

const filtroCategoria = ref('')
const busqueda = ref('')

const arrastrando = ref(null)
const columnaHover = ref(null)

const COLUMNAS = [
  { estado: 'pendiente', titulo: 'Pendiente', color: '#F2994A' },
  { estado: 'en_proceso', titulo: 'En proceso', color: '#2D9CDB' },
  { estado: 'resuelto', titulo: 'Resuelto', color: '#27AE60' },
]

const PRIORIDAD_COLOR = { alta: '#EB5757', media: '#F2C94C', baja: '#7A8B9C' }

async function cargar() {
  cargando.value = true
  error.value = null
  try {
    const params = { per_page: 200 }
    if (filtroCategoria.value) params.categoria_id = filtroCategoria.value
    if (busqueda.value) params.buscar = busqueda.value
    const { data } = await api.get('/reportes', { params })
    reportes.value = data.data || data
  } catch (e) {
    error.value = e.response?.data?.message || 'No se pudieron cargar los reportes.'
  } finally {
    cargando.value = false
  }
}

async function cargarCategorias() {
  try {
    const { data } = await api.get('/categorias')
    categorias.value = data.data || data
  } catch (e) {
    categorias.value = []
  }
}

const porColumna = computed(() => {
  const grupos = { pendiente: [], en_proceso: [], resuelto: [] }
  for (const r of reportes.value) {
    ;(grupos[r.estado] || grupos.pendiente).push(r)
  }
  return grupos
})

function fotoPortada(r) {
  const img = r.imagenes?.[0]
  return img?.url || null
}

function diasAbierto(r) {
  const inicio = new Date(r.created_at)
  const fin = r.resuelto_en ? new Date(r.resuelto_en) : new Date()
  return Math.floor((fin - inicio) / 86400000)
}

// --- Drag & drop (escritorio) ---
function iniciarArrastre(reporte) {
  if (!auth.puedeGestionar) return
  arrastrando.value = reporte
}

function permitirSoltar(e, estado) {
  if (!arrastrando.value) return
  e.preventDefault()
  columnaHover.value = estado
}

function salirColumna() {
  columnaHover.value = null
}

async function soltar(nuevoEstado) {
  const reporte = arrastrando.value
  columnaHover.value = null
  arrastrando.value = null

  if (!reporte || reporte.estado === nuevoEstado) return
  await cambiarEstado(reporte, nuevoEstado)
}

// --- Mover con botones (móvil: el drag & drop no funciona con el dedo) ---
async function moverA(reporte, nuevoEstado) {
  if (!auth.puedeGestionar || reporte.estado === nuevoEstado) return
  await cambiarEstado(reporte, nuevoEstado)
}

// Lógica compartida por el arrastre y los botones
async function cambiarEstado(reporte, nuevoEstado) {
  const estadoPrevio = reporte.estado
  reporte.estado = nuevoEstado  // optimista

  const nombres = { pendiente: 'Pendiente', en_proceso: 'En proceso', resuelto: 'Resuelto' }

  try {
    await api.put(`/reportes/${reporte.id}/estado`, { estado: nuevoEstado })
    reporte.resuelto_en = nuevoEstado === 'resuelto' ? new Date().toISOString() : null
    toast.exito(`Reporte #${reporte.id} movido a ${nombres[nuevoEstado]}`)
  } catch (e) {
    reporte.estado = estadoPrevio  // revertir si falla
    toast.error(e.response?.data?.message || 'No se pudo cambiar el estado.')
  }
}

function abrirDetalle(id) {
  router.push(`/reportes/${id}`)
}

onMounted(() => {
  cargar()
  cargarCategorias()
})
</script>

<template>
  <div class="kanban-vista">
    <div class="encabezado">
      <div>
        <h1 class="titulo">Reportes</h1>
        <p class="subtitulo">Arrastra las tarjetas para cambiar su estado</p>
      </div>
    </div>

    <div class="filtros">
      <input
        v-model="busqueda"
        class="campo"
        placeholder="Buscar por título o descripción…"
        @keyup.enter="cargar"
      >
      <select v-model="filtroCategoria" class="campo" @change="cargar">
        <option value="">Todas las categorías</option>
        <option v-for="c in categorias" :key="c.id" :value="c.id">{{ c.nombre }}</option>
      </select>
      <button class="btn" @click="cargar">Filtrar</button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="cargando" class="cargando">Cargando reportes…</p>

    <div v-else class="tablero">
      <div
        v-for="col in COLUMNAS"
        :key="col.estado"
        class="columna"
        :class="{ 'columna-hover': columnaHover === col.estado }"
        @dragover="permitirSoltar($event, col.estado)"
        @dragleave="salirColumna"
        @drop="soltar(col.estado)"
      >
        <div class="columna-cabecera">
          <span class="columna-punto" :style="{ background: col.color }"></span>
          <span class="columna-titulo">{{ col.titulo }}</span>
          <span class="columna-conteo">{{ porColumna[col.estado].length }}</span>
        </div>

        <div class="columna-cuerpo">
          <article
            v-for="r in porColumna[col.estado]"
            :key="r.id"
            class="tarjeta"
            :class="{ 'tarjeta-arrastrando': arrastrando?.id === r.id }"
            :draggable="auth.puedeGestionar"
            @dragstart="iniciarArrastre(r)"
            @dragend="arrastrando = null"
            @click="abrirDetalle(r.id)"
          >
            <div v-if="fotoPortada(r)" class="tarjeta-foto">
              <img :src="fotoPortada(r)" :alt="r.titulo">
            </div>
            <div v-else class="tarjeta-foto tarjeta-foto-vacia">
              <span>Sin foto</span>
            </div>

            <div class="tarjeta-cuerpo">
              <div class="tarjeta-top">
                <span class="tarjeta-id mono">#{{ r.id }}</span>
                <span
                  class="tarjeta-prioridad"
                  :style="{ color: PRIORIDAD_COLOR[r.prioridad], borderColor: PRIORIDAD_COLOR[r.prioridad] }"
                >{{ r.prioridad }}</span>
              </div>

              <h3 class="tarjeta-titulo">{{ r.titulo }}</h3>

              <div v-if="r.categoria" class="tarjeta-categoria">
                <span class="punto" :style="{ background: r.categoria.color }"></span>
                {{ r.categoria.nombre }}
              </div>

              <div class="tarjeta-pie">
                <span class="tarjeta-asignado">
                  {{ r.asignado?.name || 'Sin asignar' }}
                </span>
                <span class="tarjeta-dias">{{ diasAbierto(r) }}d</span>
              </div>

              <div v-if="auth.puedeGestionar" class="mover-movil" @click.stop>
                <button
                  v-for="c in COLUMNAS.filter(c => c.estado !== r.estado)"
                  :key="c.estado"
                  class="btn-mover"
                  :style="{ borderColor: c.color, color: c.color }"
                  @click="moverA(r, c.estado)"
                >
                  → {{ c.titulo }}
                </button>
              </div>
            </div>
          </article>

          <p v-if="!porColumna[col.estado].length" class="columna-vacia">
            Sin reportes
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.encabezado { margin-bottom: 18px; }
.titulo { font-size: 22px; font-weight: 600; }
.subtitulo { font-size: 13px; color: var(--texto-sec); margin-top: 4px; }

.filtros { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
.filtros .campo { max-width: 280px; }

.error {
  background: rgba(235,87,87,.12);
  border: 1px solid rgba(235,87,87,.3);
  color: var(--alta);
  padding: 10px 12px;
  border-radius: 5px;
  font-size: 13px;
  margin-bottom: 14px;
}
.cargando { color: var(--texto-sec); padding: 40px 0; text-align: center; }

.tablero {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  align-items: start;
}

.columna {
  background: var(--superficie);
  border: 1px solid var(--borde);
  border-radius: 10px;
  padding: 14px;
  min-height: 200px;
  transition: background .15s, border-color .15s;
}
.columna-hover {
  background: var(--superficie-alta);
  border-color: var(--acento);
}

.columna-cabecera {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--borde);
}
.columna-punto { width: 9px; height: 9px; border-radius: 50%; }
.columna-titulo { font-size: 13px; font-weight: 600; flex: 1; }
.columna-conteo {
  font-size: 11px;
  color: var(--texto-sec);
  background: var(--fondo);
  border-radius: 10px;
  padding: 2px 9px;
  font-family: var(--mono);
}

.columna-cuerpo { display: flex; flex-direction: column; gap: 10px; }

.tarjeta {
  background: var(--fondo);
  border: 1px solid var(--borde);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color .15s, transform .1s;
}
.tarjeta:hover { border-color: var(--acento); }
.tarjeta:active { transform: scale(.98); }
.tarjeta-arrastrando { opacity: .4; }

.tarjeta-foto { height: 110px; background: var(--superficie); }
.tarjeta-foto img { width: 100%; height: 100%; object-fit: cover; display: block; }
.tarjeta-foto-vacia {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--texto-sec);
  font-size: 11px;
  opacity: .5;
}

.tarjeta-cuerpo { padding: 12px; }
.tarjeta-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.tarjeta-id { font-size: 11px; color: var(--texto-sec); }
.tarjeta-prioridad {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: .04em;
  border: 1px solid;
  border-radius: 10px;
  padding: 1px 8px;
}
.tarjeta-titulo { font-size: 14px; font-weight: 500; line-height: 1.3; margin-bottom: 8px; }
.tarjeta-categoria {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--texto-sec);
  margin-bottom: 10px;
}
.punto { width: 7px; height: 7px; border-radius: 2px; }

.tarjeta-pie {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;
  border-top: 1px solid var(--borde);
}
.tarjeta-asignado { font-size: 11px; color: var(--texto-sec); }
.tarjeta-dias {
  font-size: 11px;
  color: var(--texto-sec);
  font-family: var(--mono);
}

.columna-vacia {
  text-align: center;
  color: var(--texto-sec);
  font-size: 12px;
  opacity: .5;
  padding: 30px 0;
}

/* Los botones de mover solo se muestran en pantallas pequeñas */
.mover-movil { display: none; }

@media (max-width: 900px) {
  .tablero { grid-template-columns: 1fr; }
  .subtitulo { display: none; }
  .titulo { font-size: 19px; }
  .filtros .campo { max-width: none; flex: 1 1 100%; }
  .tarjeta-foto { height: 140px; }

  .mover-movil {
    display: flex;
    gap: 6px;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid var(--borde);
  }
  .btn-mover {
    flex: 1;
    background: none;
    border: 1px solid;
    border-radius: 5px;
    padding: 7px 4px;
    font-size: 11px;
    font-weight: 500;
  }
}
</style>