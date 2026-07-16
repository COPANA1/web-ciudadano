<script setup>
import { ref, onMounted, computed, nextTick, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const reporte = ref(null)
const cargando = ref(true)
const error = ref(null)
const mapaEl = ref(null)
const fotoAmpliada = ref(null)
const comentario = ref('')
const guardando = ref(false)
let mapaInstancia = null
let observador = null
let intentos = 0

const COLORES = {
  pendiente: '#F2994A',
  en_proceso: '#2D9CDB',
  resuelto: '#27AE60',
}

const ESTADOS = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  resuelto: 'Resuelto',
}

async function cargar() {
  cargando.value = true
  try {
    const { data } = await api.get(`/reportes/${route.params.id}`)
    reporte.value = data
  } catch (e) {
    error.value = 'No se pudo cargar el reporte.'
  } finally {
    cargando.value = false   // primero apaga "cargando"
    await nextTick()         // espera a que Vue pinte el DOM
    dibujarMapa()            // ahora el div ya existe
  }
}

function dibujarMapa() {
  if (!mapaEl.value || !reporte.value) return
  if (mapaInstancia) return

  const lat = parseFloat(reporte.value.latitud)
  const lng = parseFloat(reporte.value.longitud)
  if (isNaN(lat) || isNaN(lng)) return

  // Reintenta si el contenedor aún no tiene altura, máximo 20 veces
  if (mapaEl.value.offsetHeight === 0 && intentos < 20) {
    intentos++
    setTimeout(dibujarMapa, 50)
    return
  }

  mapaInstancia = L.map(mapaEl.value, {
    zoomControl: false,
    attributionControl: false,
    scrollWheelZoom: false,
  }).setView([lat, lng], 16)

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
  }).addTo(mapaInstancia)

  L.circleMarker([lat, lng], {
    radius: 10,
    fillColor: COLORES[reporte.value.estado] || '#7A8B9C',
    color: '#fff',
    weight: 2,
    fillOpacity: 1,
  }).addTo(mapaInstancia)

  observador = new ResizeObserver(() => mapaInstancia?.invalidateSize())
  observador.observe(mapaEl.value)

  mapaInstancia.invalidateSize()
  setTimeout(() => mapaInstancia?.invalidateSize(), 300)
}

async function cambiarEstado(nuevo) {
  guardando.value = true
  try {
    await api.put(`/reportes/${reporte.value.id}/estado`, {
      estado: nuevo,
      comentario: comentario.value || null,
    })
    comentario.value = ''

    // Recarga solo los datos, sin recrear el mapa
    const { data } = await api.get(`/reportes/${route.params.id}`)
    reporte.value = data
  } catch (e) {
    alert(e.response?.data?.message || 'No se pudo cambiar el estado.')
  } finally {
    guardando.value = false
  }
}

const fechaLarga = (iso) => new Date(iso).toLocaleString('es-PE', {
  day: '2-digit', month: 'long', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
})

const fechaCorta = (iso) => new Date(iso).toLocaleString('es-PE', {
  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
})

const diasAbierto = computed(() => {
  if (!reporte.value) return 0
  const inicio = new Date(reporte.value.created_at)
  const fin = reporte.value.resuelto_en ? new Date(reporte.value.resuelto_en) : new Date()
  return Math.floor((fin - inicio) / 86400000)
})

onMounted(cargar)
onUnmounted(() => {
  observador?.disconnect()
  mapaInstancia?.remove()
})
</script>

<template>
  <div>
    <button class="volver" @click="router.push('/reportes')">← Volver a reportes</button>

    <p v-if="cargando" class="aviso">Cargando…</p>
    <p v-else-if="error" class="aviso error">{{ error }}</p>

    <template v-else-if="reporte">
      <header class="cabecera">
        <div>
          <div class="meta">
            <span class="mono id">#{{ reporte.id }}</span>
            <span class="chip" :class="`chip-${reporte.estado}`">
              {{ ESTADOS[reporte.estado] }}
            </span>
            <span class="chip" :class="`chip-${reporte.prioridad}`">
              prioridad {{ reporte.prioridad }}
            </span>
          </div>
          <h1>{{ reporte.titulo }}</h1>
          <p class="direccion">{{ reporte.direccion || 'Sin dirección registrada' }}</p>
        </div>

        <div class="antiguedad">
          <div class="antiguedad-num mono">{{ diasAbierto }}</div>
          <div class="antiguedad-lbl">
            {{ reporte.resuelto_en ? 'días hasta resolver' : 'días abierto' }}
          </div>
        </div>
      </header>

      <div class="rejilla">
        <div class="columna">
          <section class="tarjeta">
            <h2>Descripción</h2>
            <p class="descripcion">{{ reporte.descripcion }}</p>

            <dl class="datos">
              <div>
                <dt>Categoría</dt>
                <dd>
                  <span class="punto" :style="{ background: reporte.categoria?.color }"></span>
                  {{ reporte.categoria?.nombre || '—' }}
                </dd>
              </div>
              <div>
                <dt>Reportado por</dt>
                <dd>{{ reporte.user?.name || '—' }}</dd>
              </div>
              <div>
                <dt>Asignado a</dt>
                <dd>{{ reporte.asignado?.name || 'Sin asignar' }}</dd>
              </div>
              <div>
                <dt>Fecha del reporte</dt>
                <dd>{{ fechaLarga(reporte.created_at) }}</dd>
              </div>
            </dl>
          </section>

          <section v-if="reporte.imagenes?.length" class="tarjeta">
            <h2>Evidencia fotográfica</h2>
            <div class="galeria">
              <button
                v-for="img in reporte.imagenes"
                :key="img.id"
                class="foto"
                @click="fotoAmpliada = img.url"
              >
                <img :src="img.url" :alt="`Foto del reporte ${reporte.id}`">
              </button>
            </div>
          </section>

          <section class="tarjeta">
            <h2>Ubicación</h2>
            <div ref="mapaEl" class="mapa"></div>
            <p class="coords mono">
              {{ parseFloat(reporte.latitud).toFixed(5) }}, {{ parseFloat(reporte.longitud).toFixed(5) }}
            </p>
          </section>
        </div>

        <div class="columna">
          <section v-if="auth.puedeGestionar" class="tarjeta">
            <h2>Actualizar estado</h2>
            <textarea
              v-model="comentario"
              class="campo"
              rows="3"
              placeholder="¿Qué se hizo? ¿Qué falta? (opcional)"
            ></textarea>
            <div class="botones-estado">
              <button
                v-for="(nombre, clave) in ESTADOS"
                :key="clave"
                class="btn"
                :class="{ 'btn-primario': clave === 'resuelto' }"
                :disabled="guardando || reporte.estado === clave"
                @click="cambiarEstado(clave)"
              >
                {{ nombre }}
              </button>
            </div>
          </section>

          <section class="tarjeta">
            <h2>Línea de tiempo</h2>
            <ol v-if="reporte.historial?.length" class="linea">
              <li v-for="h in reporte.historial" :key="h.id">
                <span class="linea-punto" :style="{ background: COLORES[h.estado_nuevo] || '#7A8B9C' }"></span>
                <div class="linea-contenido">
                  <div class="linea-titulo">
                    {{ h.estado_anterior
                      ? `${ESTADOS[h.estado_anterior]} → ${ESTADOS[h.estado_nuevo]}`
                      : 'Reporte creado' }}
                  </div>
                  <div v-if="h.comentario" class="linea-comentario">{{ h.comentario }}</div>
                  <div class="linea-pie">
                    {{ h.user?.name || 'Sistema' }} · {{ fechaCorta(h.created_at) }}
                  </div>
                </div>
              </li>
            </ol>
            <p v-else class="vacio">Sin movimientos registrados.</p>
          </section>
        </div>
      </div>

      <div v-if="fotoAmpliada" class="visor" @click="fotoAmpliada = null">
        <img :src="fotoAmpliada" alt="Foto ampliada">
        <button class="cerrar" @click="fotoAmpliada = null">✕</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.volver {
  background: none;
  border: none;
  color: var(--texto-sec);
  font-size: 13px;
  padding: 0;
  margin-bottom: 18px;
  transition: color .15s;
}
.volver:hover { color: var(--texto); }

.aviso { color: var(--texto-sec); padding: 60px 0; text-align: center; }
.aviso.error { color: var(--alta); }

.cabecera {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 22px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--borde);
}
.meta { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.id { font-size: 12px; color: var(--texto-sec); }
.cabecera h1 { font-size: 24px; font-weight: 600; margin-bottom: 5px; }
.direccion { font-size: 13px; color: var(--texto-sec); }

.antiguedad { text-align: right; flex-shrink: 0; }
.antiguedad-num { font-size: 32px; font-weight: 600; line-height: 1; }
.antiguedad-lbl {
  font-size: 10px;
  color: var(--texto-sec);
  text-transform: uppercase;
  letter-spacing: .06em;
  margin-top: 4px;
}

.rejilla {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 16px;
  align-items: start;
}
.columna { display: flex; flex-direction: column; gap: 16px; }

.tarjeta {
  background: #161D26;
  border: 1px solid var(--borde);
  border-radius: 10px;
  padding: 20px;
}
.tarjeta h2 {
  font-size: 11px;
  font-weight: 600;
  color: var(--texto-sec);
  text-transform: uppercase;
  letter-spacing: .07em;
  margin-bottom: 14px;
}

.descripcion { font-size: 14px; line-height: 1.6; margin-bottom: 20px; }

.datos {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--borde);
}
.datos dt {
  font-size: 10px;
  color: var(--texto-sec);
  text-transform: uppercase;
  letter-spacing: .06em;
  margin-bottom: 4px;
}
.datos dd { font-size: 13px; display: flex; align-items: center; gap: 7px; }
.punto { width: 8px; height: 8px; border-radius: 2px; display: inline-block; }

.galeria {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 8px;
}
.foto {
  aspect-ratio: 1;
  border: 1px solid var(--borde);
  border-radius: 6px;
  overflow: hidden;
  padding: 0;
  background: var(--fondo);
  transition: border-color .15s, transform .15s;
}
.foto:hover { border-color: var(--acento); transform: scale(1.02); }
.foto img { width: 100%; height: 100%; object-fit: cover; display: block; }

.mapa {
  height: 220px;
  min-height: 220px;
  border-radius: 6px;
  border: 1px solid var(--borde);
  background: var(--fondo);
  position: relative;
  z-index: 1;
}
.coords { font-size: 11px; color: var(--texto-sec); margin-top: 8px; }

.botones-estado { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
.botones-estado .btn:disabled { opacity: .35; cursor: not-allowed; }
.campo { resize: vertical; }

.linea { list-style: none; position: relative; }
.linea::before {
  content: '';
  position: absolute;
  left: 4px; top: 8px; bottom: 8px;
  width: 1px;
  background: var(--borde);
}
.linea li {
  position: relative;
  padding-left: 22px;
  padding-bottom: 20px;
}
.linea li:last-child { padding-bottom: 0; }

.linea-punto {
  position: absolute;
  left: 0; top: 4px;
  width: 9px; height: 9px;
  border-radius: 50%;
  border: 2px solid #161D26;
  box-shadow: 0 0 0 1px var(--borde);
}
.linea-titulo { font-size: 13px; font-weight: 500; margin-bottom: 3px; }
.linea-comentario {
  font-size: 12px;
  color: var(--texto-sec);
  line-height: 1.5;
  margin-bottom: 4px;
  padding: 7px 10px;
  background: var(--fondo);
  border-radius: 4px;
  border-left: 2px solid var(--borde);
}
.linea-pie { font-size: 11px; color: var(--texto-sec); opacity: .7; }

.vacio { color: var(--texto-sec); font-size: 13px; }

.visor {
  position: fixed;
  inset: 0;
  background: rgba(15,20,25,.94);
  display: grid;
  place-items: center;
  z-index: 200;
  padding: 40px;
}
.visor img {
  max-width: 100%;
  max-height: 100%;
  border-radius: 8px;
  box-shadow: 0 8px 40px rgba(0,0,0,.6);
}
.cerrar {
  position: absolute;
  top: 24px; right: 24px;
  width: 36px; height: 36px;
  background: var(--superficie);
  border: 1px solid var(--borde);
  border-radius: 50%;
  color: var(--texto);
  font-size: 15px;
}
.cerrar:hover { background: var(--superficie-alta); }

/* Tema oscuro para el mapa */
:deep(.leaflet-tile-pane) {
  filter: invert(1) hue-rotate(180deg) brightness(.92) contrast(.88) saturate(.7);
}
:deep(.leaflet-container) { background: #0F1419; border-radius: 6px; }

@media (max-width: 1000px) {
  .rejilla { grid-template-columns: 1fr; }
  .cabecera { flex-direction: column; }
  .antiguedad { text-align: left; }
}
</style>