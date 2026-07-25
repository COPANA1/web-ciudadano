<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const router = useRouter()

const reportes = ref([])
const categorias = ref([])
const cargando = ref(true)
const error = ref(null)

const filtroEstado = ref('')
const filtroCategoria = ref('')

const mapaEl = ref(null)
let mapa = null
let capaMarcadores = null

const COLORES = { pendiente: '#F2994A', en_proceso: '#2D9CDB', resuelto: '#27AE60' }
const ESTADOS = { pendiente: 'Pendiente', en_proceso: 'En proceso', resuelto: 'Resuelto' }

async function cargar() {
  cargando.value = true
  error.value = null
  try {
    const params = { per_page: 500 }
    if (filtroEstado.value) params.estado = filtroEstado.value
    if (filtroCategoria.value) params.categoria_id = filtroCategoria.value
    const { data } = await api.get('/reportes', { params })
    reportes.value = (data.data || data).filter(r => r.latitud && r.longitud)
  } catch (e) {
    error.value = e.response?.data?.message || 'No se pudieron cargar los reportes.'
  } finally {
    cargando.value = false
    await nextTick()
    dibujarMarcadores()
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

function iniciarMapa() {
  if (mapa || !mapaEl.value) return

  mapa = L.map(mapaEl.value, {
    zoomControl: true,
    attributionControl: false,
  }).setView([-15.8402, -70.0219], 13) // Puno/Juliaca por defecto

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mapa)

  capaMarcadores = L.layerGroup().addTo(mapa)
  setTimeout(() => mapa?.invalidateSize(), 200)
}

function dibujarMarcadores() {
  if (!mapa || !capaMarcadores) return
  capaMarcadores.clearLayers()

  const puntos = []
  for (const r of reportes.value) {
    const lat = parseFloat(r.latitud)
    const lng = parseFloat(r.longitud)
    if (isNaN(lat) || isNaN(lng)) continue

    const marcador = L.circleMarker([lat, lng], {
      radius: 9,
      fillColor: COLORES[r.estado] || '#7A8B9C',
      color: '#fff',
      weight: 2,
      fillOpacity: .95,
    })

    const foto = r.imagenes?.[0]?.url
    const popup = `
      <div style="min-width:180px;font-family:system-ui;">
        ${foto ? `<img src="${foto}" style="width:100%;height:100px;object-fit:cover;border-radius:4px;margin-bottom:8px;">` : ''}
        <div style="font-size:11px;color:#888;">#${r.id} · ${ESTADOS[r.estado] || r.estado}</div>
        <div style="font-size:14px;font-weight:600;margin:2px 0;">${r.titulo}</div>
        <div style="font-size:12px;color:#666;">${r.categoria?.nombre || ''}</div>
        <button onclick="window.__verReporte(${r.id})" style="margin-top:8px;width:100%;padding:6px;background:#2D9CDB;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;">Ver detalle</button>
      </div>`

    marcador.bindPopup(popup)
    marcador.addTo(capaMarcadores)
    puntos.push([lat, lng])
  }

  if (puntos.length) {
    mapa.fitBounds(puntos, { padding: [50, 50], maxZoom: 15 })
  }
}

// Función global para el botón del popup
window.__verReporte = (id) => router.push(`/reportes/${id}`)

watch([filtroEstado, filtroCategoria], cargar)

onMounted(async () => {
  await cargarCategorias()
  iniciarMapa()
  await cargar()
})

onUnmounted(() => {
  mapa?.remove()
  mapa = null
  delete window.__verReporte
})
</script>

<template>
  <div class="mapa-vista">
    <div class="encabezado">
      <div>
        <h1 class="titulo">Mapa de incidencias</h1>
        <p class="subtitulo">{{ reportes.length }} reportes georreferenciados</p>
      </div>
    </div>

    <div class="controles">
      <select v-model="filtroEstado" class="campo">
        <option value="">Todos los estados</option>
        <option value="pendiente">Pendiente</option>
        <option value="en_proceso">En proceso</option>
        <option value="resuelto">Resuelto</option>
      </select>
      <select v-model="filtroCategoria" class="campo">
        <option value="">Todas las categorías</option>
        <option v-for="c in categorias" :key="c.id" :value="c.id">{{ c.nombre }}</option>
      </select>

      <div class="leyenda">
        <span class="ley"><span class="ley-punto" style="background:#F2994A"></span>Pendiente</span>
        <span class="ley"><span class="ley-punto" style="background:#2D9CDB"></span>En proceso</span>
        <span class="ley"><span class="ley-punto" style="background:#27AE60"></span>Resuelto</span>
      </div>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <div class="mapa-contenedor">
      <div ref="mapaEl" class="mapa"></div>
      <div v-if="cargando" class="cargando-overlay">Cargando reportes…</div>
    </div>
  </div>
</template>

<style scoped>
.encabezado { margin-bottom: 16px; }
.titulo { font-size: 22px; font-weight: 600; }
.subtitulo { font-size: 13px; color: var(--texto-sec); margin-top: 4px; }

.controles {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  align-items: center;
  flex-wrap: wrap;
}
.controles .campo { max-width: 220px; }

.leyenda {
  display: flex;
  gap: 16px;
  margin-left: auto;
  align-items: center;
}
.ley {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--texto-sec);
}
.ley-punto { width: 10px; height: 10px; border-radius: 50%; }

.error {
  background: rgba(235,87,87,.12);
  border: 1px solid rgba(235,87,87,.3);
  color: var(--alta);
  padding: 10px 12px;
  border-radius: 5px;
  font-size: 13px;
  margin-bottom: 14px;
}

.mapa-contenedor {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--borde);
}
.mapa {
  height: calc(100vh - 220px);
  min-height: 400px;
  background: var(--fondo);
}
.cargando-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(15,20,25,.6);
  color: var(--texto-sec);
  font-size: 14px;
}

:deep(.leaflet-tile-pane) {
  filter: invert(1) hue-rotate(180deg) brightness(.92) contrast(.88) saturate(.7);
}
:deep(.leaflet-container) { background: #0F1419; }
:deep(.leaflet-popup-content-wrapper) {
  background: var(--superficie);
  color: var(--texto);
  border-radius: 8px;
}
:deep(.leaflet-popup-tip) { background: var(--superficie); }
</style>