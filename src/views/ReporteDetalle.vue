<script setup>
import { ref, onMounted, computed, nextTick, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'
import { useToast } from '../composables/useToast'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToast()

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

const modalFoto = ref(false)
const tipoActual = ref('problema')
const modoCamara = ref(false)
const videoEl = ref(null)
const canvasEl = ref(null)
const inputArchivo = ref(null)
const previsualizacion = ref(null)
const archivoFinal = ref(null)
const subiendo = ref(false)
const errorFoto = ref(null)
let streamCamara = null

const inputReemplazo = ref(null)
const imagenAReemplazar = ref(null)

const COLORES = { pendiente: '#F2994A', en_proceso: '#2D9CDB', resuelto: '#27AE60' }
const ESTADOS = { pendiente: 'Pendiente', en_proceso: 'En proceso', resuelto: 'Resuelto' }

const SECCIONES = [
  { tipo: 'problema', titulo: 'Problema reportado', desc: 'Cómo se encontró la incidencia' },
  { tipo: 'proceso', titulo: 'Trabajo en proceso', desc: 'Durante la intervención' },
  { tipo: 'solucion', titulo: 'Trabajo terminado', desc: 'Resultado final' },
]

const imagenesPorTipo = computed(() => {
  const grupos = { problema: [], proceso: [], solucion: [] }
  for (const img of reporte.value?.imagenes || []) {
    const t = img.tipo || 'problema'
    ;(grupos[t] || grupos.problema).push(img)
  }
  return grupos
})

// ---------- Notas de voz ----------
const audios = ref([])
const cargandoAudios = ref(true)

async function cargarAudios() {
  cargandoAudios.value = true
  try {
    const { data } = await api.get(`/reportes/${route.params.id}/audios`)
    audios.value = Array.isArray(data) ? data : (data.data || [])
  } catch (e) {
    audios.value = []
  } finally {
    cargandoAudios.value = false
  }
}

async function eliminarAudio(audio) {
  if (!confirm('¿Eliminar esta nota de voz?')) return
  try {
    await api.delete(`/reportes/${reporte.value.id}/audios/${audio.id}`)
    await cargarAudios()
    toast.exito('Nota de voz eliminada')
  } catch (e) {
    toast.error(e.response?.data?.message || 'No se pudo eliminar.')
  }
}

function duracionTexto(seg) {
  const s = Number(seg) || 0
  if (s <= 0) return ''
  const m = String(Math.floor(s / 60)).padStart(2, '0')
  const r = String(s % 60).padStart(2, '0')
  return `${m}:${r}`
}

async function cargar() {
  cargando.value = true
  try {
    const { data } = await api.get(`/reportes/${route.params.id}`)
    reporte.value = data
  } catch (e) {
    error.value = 'No se pudo cargar el reporte.'
  } finally {
    cargando.value = false
    await nextTick()
    dibujarMapa()
  }
}

function dibujarMapa() {
  if (!mapaEl.value || !reporte.value || mapaInstancia) return
  const lat = parseFloat(reporte.value.latitud)
  const lng = parseFloat(reporte.value.longitud)
  if (isNaN(lat) || isNaN(lng)) return

  if (mapaEl.value.offsetHeight === 0 && intentos < 20) {
    intentos++
    setTimeout(dibujarMapa, 50)
    return
  }

  mapaInstancia = L.map(mapaEl.value, {
    zoomControl: false, attributionControl: false, scrollWheelZoom: false,
  }).setView([lat, lng], 16)

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mapaInstancia)

  L.circleMarker([lat, lng], {
    radius: 10,
    fillColor: COLORES[reporte.value.estado] || '#7A8B9C',
    color: '#fff', weight: 2, fillOpacity: 1,
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
    const { data } = await api.get(`/reportes/${route.params.id}`)
    reporte.value = data
    toast.exito(`Estado cambiado a ${ESTADOS[nuevo]}`)
  } catch (e) {
    toast.error(e.response?.data?.message || 'No se pudo cambiar el estado.')
  } finally {
    guardando.value = false
  }
}

function abrirModalFoto(tipo) {
  tipoActual.value = tipo
  modalFoto.value = true
  modoCamara.value = false
  previsualizacion.value = null
  archivoFinal.value = null
  errorFoto.value = null
}

function cerrarModalFoto() {
  detenerCamara()
  modalFoto.value = false
  previsualizacion.value = null
  archivoFinal.value = null
  errorFoto.value = null
}

async function activarCamara() {
  errorFoto.value = null
  previsualizacion.value = null
  archivoFinal.value = null
  modoCamara.value = true
  await nextTick()
  try {
    streamCamara = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }, audio: false,
    })
    if (videoEl.value) {
      videoEl.value.srcObject = streamCamara
      await videoEl.value.play()
    }
  } catch (e) {
    modoCamara.value = false
    errorFoto.value = 'No se pudo acceder a la cámara. Revisa los permisos.'
  }
}

function detenerCamara() {
  if (streamCamara) {
    streamCamara.getTracks().forEach(t => t.stop())
    streamCamara = null
  }
  modoCamara.value = false
}

function capturar() {
  if (!videoEl.value || !canvasEl.value) return
  const v = videoEl.value, c = canvasEl.value
  c.width = v.videoWidth
  c.height = v.videoHeight
  c.getContext('2d').drawImage(v, 0, 0, c.width, c.height)
  c.toBlob((blob) => {
    if (!blob) return
    archivoFinal.value = new File([blob], `foto_${Date.now()}.jpg`, { type: 'image/jpeg' })
    previsualizacion.value = URL.createObjectURL(blob)
    detenerCamara()
  }, 'image/jpeg', 0.9)
}

function elegirArchivo(e) {
  const file = e.target.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) { errorFoto.value = 'El archivo debe ser una imagen.'; return }
  if (file.size > 5 * 1024 * 1024) { errorFoto.value = 'Máximo 5 MB.'; return }
  errorFoto.value = null
  archivoFinal.value = file
  previsualizacion.value = URL.createObjectURL(file)
  detenerCamara()
}

function repetir() {
  previsualizacion.value = null
  archivoFinal.value = null
  errorFoto.value = null
}

async function subirFoto() {
  if (!archivoFinal.value) return
  subiendo.value = true
  errorFoto.value = null
  try {
    const fd = new FormData()
    fd.append('imagen', archivoFinal.value)
    fd.append('tipo', tipoActual.value)
    await api.post(`/reportes/${reporte.value.id}/imagenes`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    const { data } = await api.get(`/reportes/${route.params.id}`)
    reporte.value = data
    cerrarModalFoto()
    toast.exito('Foto agregada')
  } catch (e) {
    const errs = e.response?.data?.errors
    errorFoto.value = errs ? Object.values(errs).flat().join(' ')
      : (e.response?.data?.message || 'No se pudo subir la imagen.')
  } finally {
    subiendo.value = false
  }
}

async function eliminarFoto(img) {
  if (!confirm('¿Eliminar esta foto?')) return
  try {
    await api.delete(`/reportes/${reporte.value.id}/imagenes/${img.id}`)
    const { data } = await api.get(`/reportes/${route.params.id}`)
    reporte.value = data
    toast.exito('Foto eliminada')
  } catch (e) {
    toast.error(e.response?.data?.message || 'No se pudo eliminar.')
  }
}

async function moverFoto(img, nuevoTipo) {
  if (nuevoTipo === img.tipo) return
  try {
    const fd = new FormData()
    fd.append('tipo', nuevoTipo)
    fd.append('_method', 'PUT')
    await api.post(`/reportes/${reporte.value.id}/imagenes/${img.id}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    const { data } = await api.get(`/reportes/${route.params.id}`)
    reporte.value = data
    toast.exito('Foto movida')
  } catch (e) {
    toast.error(e.response?.data?.message || 'No se pudo mover.')
  }
}

function pedirReemplazo(img) {
  imagenAReemplazar.value = img
  inputReemplazo.value.click()
}

async function reemplazarFoto(e) {
  const file = e.target.files?.[0]
  if (!file || !imagenAReemplazar.value) return
  try {
    const fd = new FormData()
    fd.append('imagen', file)
    fd.append('_method', 'PUT')
    await api.post(`/reportes/${reporte.value.id}/imagenes/${imagenAReemplazar.value.id}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    const { data } = await api.get(`/reportes/${route.params.id}`)
    reporte.value = data
    toast.exito('Foto reemplazada')
  } catch (err) {
    toast.error(err.response?.data?.message || 'No se pudo reemplazar.')
  } finally {
    imagenAReemplazar.value = null
    e.target.value = ''
  }
}

const fechaLarga = (iso) => new Date(iso).toLocaleString('es-PE', {
  day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
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

onMounted(() => {
  cargar()
  cargarAudios()
})
onUnmounted(() => {
  detenerCamara()
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
            <span class="chip" :class="`chip-${reporte.estado}`">{{ ESTADOS[reporte.estado] }}</span>
            <span class="chip" :class="`chip-${reporte.prioridad}`">prioridad {{ reporte.prioridad }}</span>
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
                <dd><span class="punto" :style="{ background: reporte.categoria?.color }"></span>{{ reporte.categoria?.nombre || '—' }}</dd>
              </div>
              <div><dt>Reportado por</dt><dd>{{ reporte.user?.name || '—' }}</dd></div>
              <div><dt>Asignado a</dt><dd>{{ reporte.asignado?.name || 'Sin asignar' }}</dd></div>
              <div><dt>Fecha del reporte</dt><dd>{{ fechaLarga(reporte.created_at) }}</dd></div>
            </dl>
          </section>

          <section
            v-for="sec in SECCIONES"
            :key="sec.tipo"
            class="tarjeta"
          >
            <div class="tarjeta-cabecera">
              <div>
                <h2>{{ sec.titulo }}</h2>
                <p class="seccion-desc">{{ sec.desc }}</p>
              </div>
              <button
                v-if="auth.puedeGestionar"
                class="btn-foto"
                @click="abrirModalFoto(sec.tipo)"
              >
                + Agregar
              </button>
            </div>

            <div v-if="imagenesPorTipo[sec.tipo].length" class="galeria">
              <div v-for="img in imagenesPorTipo[sec.tipo]" :key="img.id" class="foto-wrap">
                <button class="foto" @click="fotoAmpliada = img.url">
                  <img :src="img.url" :alt="sec.titulo">
                </button>
                <div v-if="auth.puedeGestionar" class="foto-acciones">
                  <button class="fa-btn" title="Reemplazar" @click.stop="pedirReemplazo(img)">↻</button>
                  <select
                    class="fa-mover"
                    :value="img.tipo"
                    title="Mover a otra etapa"
                    @change="moverFoto(img, $event.target.value)"
                    @click.stop
                  >
                    <option v-for="s in SECCIONES" :key="s.tipo" :value="s.tipo">{{ s.titulo }}</option>
                  </select>
                  <button class="fa-btn fa-del" title="Eliminar" @click.stop="eliminarFoto(img)">✕</button>
                </div>
              </div>
            </div>
            <p v-else class="vacio">Sin fotos en esta etapa.</p>
          </section>

          <section class="tarjeta">
            <div class="tarjeta-cabecera">
              <div>
                <h2>Notas de voz</h2>
                <p class="seccion-desc">Audio enviado desde la app móvil</p>
              </div>
            </div>

            <p v-if="cargandoAudios" class="vacio">Cargando…</p>

            <div v-else-if="audios.length" class="lista-audios">
              <div v-for="a in audios" :key="a.id" class="audio-item">
                <div class="audio-datos">
                  <span class="audio-autor">{{ a.user?.name || 'Usuario' }}</span>
                  <span v-if="duracionTexto(a.duracion)" class="audio-dur mono">
                    {{ duracionTexto(a.duracion) }}
                  </span>
                </div>
                <audio :src="a.url" controls preload="none" class="audio-player"></audio>
                <button
                  v-if="auth.puedeGestionar"
                  class="fa-btn fa-del audio-borrar"
                  title="Eliminar"
                  @click="eliminarAudio(a)"
                >✕</button>
              </div>
            </div>

            <p v-else class="vacio">Sin notas de voz.</p>
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
            <textarea v-model="comentario" class="campo" rows="3" placeholder="¿Qué se hizo? (opcional)"></textarea>
            <div class="botones-estado">
              <button
                v-for="(nombre, clave) in ESTADOS"
                :key="clave"
                class="btn"
                :class="{ 'btn-primario': clave === 'resuelto' }"
                :disabled="guardando || reporte.estado === clave"
                @click="cambiarEstado(clave)"
              >{{ nombre }}</button>
            </div>
          </section>

          <section class="tarjeta">
            <h2>Línea de tiempo</h2>
            <ol v-if="reporte.historial?.length" class="linea">
              <li v-for="h in reporte.historial" :key="h.id">
                <span class="linea-punto" :style="{ background: COLORES[h.estado_nuevo] || '#7A8B9C' }"></span>
                <div class="linea-contenido">
                  <div class="linea-titulo">
                    {{ h.estado_anterior ? `${ESTADOS[h.estado_anterior]} → ${ESTADOS[h.estado_nuevo]}` : 'Reporte creado' }}
                  </div>
                  <div v-if="h.comentario" class="linea-comentario">{{ h.comentario }}</div>
                  <div class="linea-pie">{{ h.user?.name || 'Sistema' }} · {{ fechaCorta(h.created_at) }}</div>
                </div>
              </li>
            </ol>
            <p v-else class="vacio">Sin movimientos registrados.</p>
          </section>
        </div>
      </div>

      <input ref="inputReemplazo" type="file" accept="image/*" class="oculto" @change="reemplazarFoto">

      <div v-if="modalFoto" class="modal-fondo" @click.self="cerrarModalFoto">
        <div class="modal">
          <h2 class="modal-titulo">Agregar foto — {{ SECCIONES.find(s => s.tipo === tipoActual)?.titulo }}</h2>

          <div v-if="!previsualizacion && !modoCamara" class="opciones">
            <button class="opcion" @click="activarCamara">
              <span class="opcion-icono">📷</span><span class="opcion-txt">Tomar foto</span>
            </button>
            <button class="opcion" @click="inputArchivo.click()">
              <span class="opcion-icono">📁</span><span class="opcion-txt">Subir archivo</span>
            </button>
            <input ref="inputArchivo" type="file" accept="image/*" class="oculto" @change="elegirArchivo">
          </div>

          <div v-if="modoCamara" class="camara-caja">
            <video ref="videoEl" class="camara" playsinline muted></video>
            <div class="camara-botones">
              <button class="btn" @click="detenerCamara">Cancelar</button>
              <button class="btn btn-primario" @click="capturar">Capturar</button>
            </div>
          </div>

          <div v-if="previsualizacion" class="previa-caja">
            <img :src="previsualizacion" class="previa" alt="Vista previa">
            <div class="camara-botones">
              <button class="btn" @click="repetir">Repetir</button>
              <button class="btn btn-primario" :disabled="subiendo" @click="subirFoto">
                {{ subiendo ? 'Subiendo…' : 'Guardar foto' }}
              </button>
            </div>
          </div>

          <canvas ref="canvasEl" class="oculto"></canvas>
          <p v-if="errorFoto" class="error-foto">{{ errorFoto }}</p>
          <button class="cerrar-modal" @click="cerrarModalFoto">Cerrar</button>
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
.volver { background: none; border: none; color: var(--texto-sec); font-size: 13px; padding: 0; margin-bottom: 18px; transition: color .15s; }
.volver:hover { color: var(--texto); }
.aviso { color: var(--texto-sec); padding: 60px 0; text-align: center; }
.aviso.error { color: var(--alta); }
.cabecera { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-bottom: 22px; padding-bottom: 20px; border-bottom: 1px solid var(--borde); }
.meta { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.id { font-size: 12px; color: var(--texto-sec); }
.cabecera h1 { font-size: 24px; font-weight: 600; margin-bottom: 5px; }
.direccion { font-size: 13px; color: var(--texto-sec); }
.antiguedad { text-align: right; flex-shrink: 0; }
.antiguedad-num { font-size: 32px; font-weight: 600; line-height: 1; }
.antiguedad-lbl { font-size: 10px; color: var(--texto-sec); text-transform: uppercase; letter-spacing: .06em; margin-top: 4px; }
.rejilla { display: grid; grid-template-columns: 1.5fr 1fr; gap: 16px; align-items: start; }
.columna { display: flex; flex-direction: column; gap: 16px; }
.tarjeta { background: #161D26; border: 1px solid var(--borde); border-radius: 10px; padding: 20px; }
.tarjeta h2 { font-size: 11px; font-weight: 600; color: var(--texto-sec); text-transform: uppercase; letter-spacing: .07em; margin-bottom: 14px; }
.tarjeta-cabecera { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; gap: 12px; }
.tarjeta-cabecera h2 { margin-bottom: 2px; }
.seccion-desc { font-size: 11px; color: var(--texto-sec); opacity: .7; }
.btn-foto { background: var(--superficie-alta); border: 1px solid var(--borde); color: var(--texto-sec); font-size: 12px; padding: 5px 12px; border-radius: 5px; white-space: nowrap; transition: color .15s, border-color .15s; }
.btn-foto:hover { color: var(--acento); border-color: var(--acento); }
.descripcion { font-size: 14px; line-height: 1.6; margin-bottom: 20px; }
.datos { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; padding-top: 16px; border-top: 1px solid var(--borde); }
.datos dt { font-size: 10px; color: var(--texto-sec); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 4px; }
.datos dd { font-size: 13px; display: flex; align-items: center; gap: 7px; }
.punto { width: 8px; height: 8px; border-radius: 2px; display: inline-block; }
.galeria { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; }
.foto-wrap { position: relative; }
.foto { aspect-ratio: 1; width: 100%; border: 1px solid var(--borde); border-radius: 6px; overflow: hidden; padding: 0; background: var(--fondo); transition: border-color .15s; }
.foto:hover { border-color: var(--acento); }
.foto img { width: 100%; height: 100%; object-fit: cover; display: block; }
.foto-acciones { position: absolute; top: 4px; left: 4px; right: 4px; display: flex; gap: 4px; align-items: center; opacity: 0; transition: opacity .15s; }
.foto-wrap:hover .foto-acciones { opacity: 1; }
.fa-btn { width: 22px; height: 22px; background: rgba(15,20,25,.88); border: 1px solid var(--borde); border-radius: 50%; color: var(--texto); font-size: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.fa-btn:hover { background: var(--acento); color: #fff; }
.fa-del { color: var(--alta); }
.fa-del:hover { background: var(--alta); color: #fff; }
.fa-mover { flex: 1; min-width: 0; background: rgba(15,20,25,.88); border: 1px solid var(--borde); border-radius: 4px; color: var(--texto); font-size: 10px; padding: 2px 4px; height: 22px; }

/* ---------- Notas de voz ---------- */
.lista-audios { display: flex; flex-direction: column; gap: 12px; }
.audio-item {
  background: var(--fondo);
  border: 1px solid var(--borde);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.audio-datos { display: flex; flex-direction: column; min-width: 110px; }
.audio-autor { font-size: 13px; font-weight: 500; }
.audio-dur { font-size: 11px; color: var(--texto-sec); }
.audio-player { flex: 1; min-width: 200px; height: 36px; }
.audio-borrar { opacity: 1; }

.mapa { height: 220px; min-height: 220px; border-radius: 6px; border: 1px solid var(--borde); background: var(--fondo); position: relative; z-index: 1; }
.coords { font-size: 11px; color: var(--texto-sec); margin-top: 8px; }
.botones-estado { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
.botones-estado .btn:disabled { opacity: .35; cursor: not-allowed; }
.campo { resize: vertical; }
.linea { list-style: none; position: relative; }
.linea::before { content: ''; position: absolute; left: 4px; top: 8px; bottom: 8px; width: 1px; background: var(--borde); }
.linea li { position: relative; padding-left: 22px; padding-bottom: 20px; }
.linea li:last-child { padding-bottom: 0; }
.linea-punto { position: absolute; left: 0; top: 4px; width: 9px; height: 9px; border-radius: 50%; border: 2px solid #161D26; box-shadow: 0 0 0 1px var(--borde); }
.linea-titulo { font-size: 13px; font-weight: 500; margin-bottom: 3px; }
.linea-comentario { font-size: 12px; color: var(--texto-sec); line-height: 1.5; margin-bottom: 4px; padding: 7px 10px; background: var(--fondo); border-radius: 4px; border-left: 2px solid var(--borde); }
.linea-pie { font-size: 11px; color: var(--texto-sec); opacity: .7; }
.vacio { color: var(--texto-sec); font-size: 13px; }
.modal-fondo { position: fixed; inset: 0; background: rgba(0,0,0,.65); display: grid; place-items: center; z-index: 150; padding: 20px; }
.modal { width: 100%; max-width: 460px; background: var(--superficie); border: 1px solid var(--borde); border-radius: 10px; padding: 22px; }
.modal-titulo { font-size: 15px; font-weight: 600; margin-bottom: 18px; }
.opciones { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.opcion { background: var(--superficie-alta); border: 1px solid var(--borde); border-radius: 8px; padding: 22px 10px; display: flex; flex-direction: column; align-items: center; gap: 8px; color: var(--texto); transition: border-color .15s, background .15s; }
.opcion:hover { border-color: var(--acento); background: #1F2A36; }
.opcion-icono { font-size: 26px; }
.opcion-txt { font-size: 13px; }
.camara-caja, .previa-caja { display: flex; flex-direction: column; gap: 12px; }
.camara, .previa { width: 100%; border-radius: 8px; border: 1px solid var(--borde); background: #000; max-height: 320px; object-fit: contain; }
.camara-botones { display: flex; gap: 10px; justify-content: flex-end; }
.oculto { display: none; }
.error-foto { background: rgba(235,87,87,.12); border: 1px solid rgba(235,87,87,.3); color: var(--alta); padding: 9px 12px; border-radius: 5px; font-size: 12px; margin-top: 14px; }
.cerrar-modal { width: 100%; margin-top: 16px; background: none; border: none; color: var(--texto-sec); font-size: 12px; padding: 6px; }
.cerrar-modal:hover { color: var(--texto); }
.visor { position: fixed; inset: 0; background: rgba(15,20,25,.94); display: grid; place-items: center; z-index: 200; padding: 40px; }
.visor img { max-width: 100%; max-height: 100%; border-radius: 8px; box-shadow: 0 8px 40px rgba(0,0,0,.6); }
.cerrar { position: absolute; top: 24px; right: 24px; width: 36px; height: 36px; background: var(--superficie); border: 1px solid var(--borde); border-radius: 50%; color: var(--texto); font-size: 15px; }
.cerrar:hover { background: var(--superficie-alta); }
:deep(.leaflet-tile-pane) { filter: invert(1) hue-rotate(180deg) brightness(.92) contrast(.88) saturate(.7); }
:deep(.leaflet-container) { background: #0F1419; border-radius: 6px; }
@media (max-width: 1000px) {
  .rejilla { grid-template-columns: 1fr; }
  .cabecera { flex-direction: column; }
  .antiguedad { text-align: left; }
  .opciones { grid-template-columns: 1fr; }
  .audio-item { flex-direction: column; align-items: stretch; }
  .audio-player { width: 100%; }
}
</style>