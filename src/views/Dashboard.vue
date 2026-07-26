<script setup>
import { ref, onMounted, computed, nextTick, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'
import { Line, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS, Title, Tooltip, Legend, Filler,
  LineElement, PointElement, CategoryScale, LinearScale, ArcElement
} from 'chart.js'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

ChartJS.register(Title, Tooltip, Legend, Filler, LineElement, PointElement, CategoryScale, LinearScale, ArcElement)

const auth = useAuthStore()
const router = useRouter()

const stats = ref(null)
const cargando = ref(true)
const error = ref(null)
const mapaEl = ref(null)
let mapaInstancia = null
let observador = null
let intentos = 0

const COLORES = {
  pendiente: '#F2994A',
  en_proceso: '#2D9CDB',
  resuelto: '#27AE60',
}

onMounted(async () => {
  try {
    const { data } = await api.get('/estadisticas')
    stats.value = data
  } catch (e) {
    error.value = 'No se pudieron cargar las estadísticas.'
  } finally {
    cargando.value = false
    await nextTick()
    dibujarMapa()
  }
})

onUnmounted(() => {
  observador?.disconnect()
  mapaInstancia?.remove()
})

function dibujarMapa() {
  const puntos = stats.value?.mapa || []
  if (!mapaEl.value || !puntos.length) return
  if (mapaInstancia) return

  if (mapaEl.value.offsetHeight === 0 && intentos < 20) {
    intentos++
    setTimeout(dibujarMapa, 50)
    return
  }

  mapaInstancia = L.map(mapaEl.value, {
    zoomControl: true,
    attributionControl: false,
  }).setView([-16.409, -71.537], 13)

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 })
    .addTo(mapaInstancia)

  const coords = []
  puntos.forEach(p => {
    const lat = parseFloat(p.latitud)
    const lng = parseFloat(p.longitud)
    if (isNaN(lat) || isNaN(lng)) return
    L.circleMarker([lat, lng], {
      radius: p.prioridad === 'alta' ? 9 : 6,
      fillColor: COLORES[p.estado] || '#7A8B9C',
      color: p.prioridad === 'alta' ? '#EB5757' : '#0F1419',
      weight: p.prioridad === 'alta' ? 2 : 1.5,
      fillOpacity: 0.9,
    }).bindPopup(`<strong>${p.titulo}</strong><br><span style="color:#7A8B9C;font-size:11px">${p.estado.replace('_',' ')} · ${p.prioridad}</span>`)
      .addTo(mapaInstancia)
    coords.push([lat, lng])
  })

  if (coords.length) mapaInstancia.fitBounds(coords, { padding: [40, 40], maxZoom: 15 })

  observador = new ResizeObserver(() => mapaInstancia?.invalidateSize())
  observador.observe(mapaEl.value)
  mapaInstancia.invalidateSize()
  setTimeout(() => mapaInstancia?.invalidateSize(), 300)
}

const total      = computed(() => stats.value?.total || 0)
const pendientes = computed(() => stats.value?.por_estado?.pendiente || 0)
const enProceso  = computed(() => stats.value?.por_estado?.en_proceso || 0)
const resueltos  = computed(() => stats.value?.por_estado?.resuelto || 0)
const altas      = computed(() => stats.value?.por_prioridad?.alta || 0)

// Satisfaccion ciudadana
const satisfaccion = computed(() => stats.value?.satisfaccion || null)
const totalCalificaciones = computed(() => stats.value?.total_calificaciones || 0)
const totalConfirmaciones = computed(() => stats.value?.total_confirmaciones || 0)

const porcentajeResuelto = computed(() => total.value ? Math.round((resueltos.value / total.value) * 100) : 0)
const dias = computed(() => {
  const h = stats.value?.horas_resolucion
  return h ? (h / 24).toFixed(1) : null
})

const barra = computed(() => {
  const t = total.value || 1
  return {
    pendiente: (pendientes.value / t) * 100,
    proceso: (enProceso.value / t) * 100,
    resuelto: (resueltos.value / t) * 100,
  }
})

const categorias = computed(() => {
  const cats = stats.value?.por_categoria || []
  const max = Math.max(...cats.map(c => c.total), 1)
  return cats.map(c => ({ ...c, pct: (c.total / max) * 100 }))
})

const datosLinea = computed(() => {
  const meses = stats.value?.por_mes || []
  const nombres = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return {
    labels: meses.map(m => {
      const [a, mm] = m.mes.split('-')
      return `${nombres[+mm - 1]} ${a.slice(2)}`
    }),
    datasets: [{
      data: meses.map(m => m.total),
      borderColor: '#2D9CDB',
      backgroundColor: (ctx) => {
        const c = ctx.chart.ctx
        const g = c.createLinearGradient(0, 0, 0, 240)
        g.addColorStop(0, 'rgba(45,156,219,.35)')
        g.addColorStop(1, 'rgba(45,156,219,0)')
        return g
      },
      fill: true,
      tension: 0.4,
      borderWidth: 2,
      pointBackgroundColor: '#2D9CDB',
      pointBorderColor: '#0F1419',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
    }]
  }
})

const datosDona = computed(() => {
  const cats = stats.value?.por_categoria || []
  return {
    labels: cats.map(c => c.nombre),
    datasets: [{
      data: cats.map(c => c.total),
      backgroundColor: cats.map(c => c.color || '#2D9CDB'),
      borderColor: '#12181F',
      borderWidth: 3,
      hoverOffset: 6,
    }]
  }
})

const opcionesLinea = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { backgroundColor: '#0F1419', borderColor: '#2C3948', borderWidth: 1, padding: 10, displayColors: false },
  },
  scales: {
    x: { ticks: { color: '#7A8B9C', font: { size: 11 } }, grid: { display: false }, border: { color: '#2C3948' } },
    y: { ticks: { color: '#7A8B9C', font: { size: 11 }, precision: 0 }, grid: { color: '#1E2731' }, border: { display: false }, beginAtZero: true },
  },
}

const opcionesDona = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '68%',
  plugins: {
    legend: { position: 'bottom', labels: { color: '#7A8B9C', boxWidth: 8, boxHeight: 8, usePointStyle: true, pointStyle: 'circle', padding: 12, font: { size: 11 } } },
    tooltip: { backgroundColor: '#0F1419', borderColor: '#2C3948', borderWidth: 1, padding: 10, displayColors: false },
  },
}

function iniciales(nombre) {
  return (nombre || '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
}
</script>

<template>
  <div class="tablero">
    <header class="cabecera">
      <div>
        <h1>Panel de control</h1>
        <p>{{ auth.user?.organizacion || 'Sistema' }} · resumen operativo</p>
      </div>
      <button class="btn btn-primario" @click="router.push('/reportes')">Ver todos los reportes</button>
    </header>

    <p v-if="cargando" class="aviso">Cargando datos…</p>
    <p v-else-if="error" class="aviso error">{{ error }}</p>

    <template v-else-if="stats">
      <!-- Fila de KPIs con íconos -->
      <section class="kpis">
        <article class="kpi">
          <div class="kpi-icono ic-total">◈</div>
          <div class="kpi-cuerpo">
            <div class="kpi-num mono">{{ total }}</div>
            <div class="kpi-lbl">Reportes totales</div>
          </div>
        </article>

        <article class="kpi">
          <div class="kpi-icono ic-pendiente">◔</div>
          <div class="kpi-cuerpo">
            <div class="kpi-num mono">{{ pendientes }}</div>
            <div class="kpi-lbl">Pendientes</div>
          </div>
        </article>

        <article class="kpi">
          <div class="kpi-icono ic-proceso">◑</div>
          <div class="kpi-cuerpo">
            <div class="kpi-num mono">{{ enProceso }}</div>
            <div class="kpi-lbl">En proceso</div>
          </div>
        </article>

        <article class="kpi">
          <div class="kpi-icono ic-resuelto">●</div>
          <div class="kpi-cuerpo">
            <div class="kpi-num mono">{{ resueltos }}</div>
            <div class="kpi-lbl">Resueltos</div>
          </div>
        </article>

        <article v-if="satisfaccion" class="kpi">
          <div class="kpi-icono ic-satisfaccion">★</div>
          <div class="kpi-cuerpo">
            <div class="kpi-num mono">{{ satisfaccion }}</div>
            <div class="kpi-lbl">
              Satisfacción · {{ totalCalificaciones }}
              {{ totalCalificaciones === 1 ? 'voto' : 'votos' }}
            </div>
          </div>
        </article>

        <article v-if="totalConfirmaciones" class="kpi">
          <div class="kpi-icono ic-confirma">👁</div>
          <div class="kpi-cuerpo">
            <div class="kpi-num mono">{{ totalConfirmaciones }}</div>
            <div class="kpi-lbl">Confirmaciones</div>
          </div>
        </article>
      </section>

      <!-- Fila principal: mapa grande + tarjeta destacada -->
      <section class="fila-principal">
        <article class="panel panel-mapa">
          <header class="panel-cab">
            <div>
              <h2>Mapa de incidencias</h2>
              <span class="panel-sub">{{ stats.mapa?.length || 0 }} reportes georreferenciados</span>
            </div>
            <div class="leyenda">
              <span><i style="background: var(--pendiente)"></i>Pendiente</span>
              <span><i style="background: var(--proceso)"></i>Proceso</span>
              <span><i style="background: var(--resuelto)"></i>Resuelto</span>
            </div>
          </header>
          <div ref="mapaEl" class="mapa"></div>
        </article>

        <article class="panel panel-destacado">
          <div class="destacado-halo"></div>
          <div class="destacado-etq">Tiempo de resolución</div>
          <div class="destacado-num mono">{{ dias ?? '—' }}<span v-if="dias">d</span></div>
          <div class="destacado-desc">
            {{ stats.horas_resolucion ? `${stats.horas_resolucion} horas en promedio` : 'Sin reportes resueltos aún' }}
          </div>

          <div class="destacado-sep"></div>

          <div class="mini-metricas">
            <div class="mini">
              <div class="mini-num mono" style="color: var(--resuelto)">{{ porcentajeResuelto }}%</div>
              <div class="mini-lbl">Resueltos</div>
            </div>
            <div class="mini">
              <div class="mini-num mono" style="color: var(--alta)">{{ altas }}</div>
              <div class="mini-lbl">Alta prioridad</div>
            </div>
          </div>

          <div v-if="satisfaccion" class="estrellas-resumen">
            <span
              v-for="n in 5"
              :key="n"
              class="estrella-mini"
              :class="{ activa: n <= Math.round(satisfaccion) }"
            >★</span>
            <span class="estrellas-txt mono">{{ satisfaccion }}/5</span>
          </div>

          <div class="barra-mini">
            <div class="seg seg-p" :style="{ width: barra.pendiente + '%' }"></div>
            <div class="seg seg-e" :style="{ width: barra.proceso + '%' }"></div>
            <div class="seg seg-r" :style="{ width: barra.resuelto + '%' }"></div>
          </div>
        </article>
      </section>

      <!-- Fila inferior: gráfico de área + dona + ranking categorías -->
      <section class="fila-inferior">
        <article class="panel">
          <header class="panel-cab">
            <div>
              <h2>Tendencia de reportes</h2>
              <span class="panel-sub">Últimos 6 meses</span>
            </div>
          </header>
          <div class="lienzo">
            <Line v-if="stats.por_mes?.length" :data="datosLinea" :options="opcionesLinea" />
            <p v-else class="vacio">Sin datos.</p>
          </div>
        </article>

        <article class="panel">
          <header class="panel-cab">
            <div><h2>Distribución</h2><span class="panel-sub">Por categoría</span></div>
          </header>
          <div class="lienzo lienzo-dona">
            <Doughnut v-if="stats.por_categoria?.length" :data="datosDona" :options="opcionesDona" />
            <p v-else class="vacio">Sin datos.</p>
          </div>
        </article>

        <article class="panel">
          <header class="panel-cab">
            <div><h2>Ranking</h2><span class="panel-sub">Categorías más reportadas</span></div>
          </header>
          <ul class="ranking">
            <li v-for="(c, i) in categorias" :key="c.nombre">
              <span class="rank-pos mono">{{ i + 1 }}</span>
              <div class="rank-cuerpo">
                <div class="rank-top">
                  <span class="rank-nombre">{{ c.nombre }}</span>
                  <span class="rank-num mono">{{ c.total }}</span>
                </div>
                <div class="rank-barra">
                  <div class="rank-fill" :style="{ width: c.pct + '%', background: c.color || '#2D9CDB' }"></div>
                </div>
              </div>
            </li>
            <li v-if="!categorias.length" class="vacio">Sin datos.</li>
          </ul>
        </article>
      </section>
    </template>
  </div>
</template>

<style scoped>
.tablero { padding-bottom: 32px; }

.cabecera {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 20px;
}
.cabecera h1 { font-size: 24px; font-weight: 600; letter-spacing: -.01em; margin-bottom: 4px; }
.cabecera p { color: var(--texto-sec); font-size: 13px; }

.aviso { color: var(--texto-sec); padding: 80px 0; text-align: center; }
.aviso.error { color: var(--alta); }

/* KPIs con íconos */
.kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 14px;
  margin-bottom: 14px;
}
.kpi {
  background: linear-gradient(135deg, #1A222C, #12181F);
  border: 1px solid var(--borde);
  border-radius: 12px;
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  transition: transform .15s, border-color .15s;
}
.kpi:hover { transform: translateY(-2px); border-color: #3A4757; }
.kpi-icono {
  width: 46px; height: 46px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  font-size: 20px;
  flex-shrink: 0;
}
.ic-total     { background: rgba(45,156,219,.15);  color: #2D9CDB; }
.ic-pendiente { background: rgba(242,153,74,.15);  color: #F2994A; }
.ic-proceso   { background: rgba(45,156,219,.15);  color: #56CCF2; }
.ic-resuelto  { background: rgba(39,174,96,.15);   color: #27AE60; }
.ic-satisfaccion { background: rgba(242,201,76,.15); color: #F2C94C; }
.ic-confirma  { background: rgba(45,156,219,.15);  color: #56CCF2; font-size: 17px; }
.kpi-num { font-size: 26px; font-weight: 700; line-height: 1; }
.kpi-lbl { font-size: 11px; color: var(--texto-sec); text-transform: uppercase; letter-spacing: .05em; margin-top: 5px; }

/* Paneles genéricos */
.panel {
  background: #12181F;
  border: 1px solid var(--borde);
  border-radius: 12px;
  padding: 18px;
}
.panel-cab {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}
.panel-cab h2 { font-size: 14px; font-weight: 600; }
.panel-sub { font-size: 11px; color: var(--texto-sec); }

/* Fila principal */
.fila-principal {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 14px;
  margin-bottom: 14px;
}
.mapa {
  height: 340px;
  min-height: 340px;
  border-radius: 8px;
  background: var(--fondo);
  border: 1px solid var(--borde);
  z-index: 1;
}
.leyenda { display: flex; gap: 12px; }
.leyenda span { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--texto-sec); }
.leyenda i { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }

/* Tarjeta destacada */
.panel-destacado {
  background: linear-gradient(160deg, #17222E, #12181F);
  border-color: rgba(45,156,219,.3);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.destacado-halo {
  position: absolute;
  top: -60px; right: -60px;
  width: 180px; height: 180px;
  background: radial-gradient(circle, rgba(45,156,219,.25), transparent 70%);
  pointer-events: none;
}
.destacado-etq {
  font-size: 11px; color: var(--texto-sec);
  text-transform: uppercase; letter-spacing: .07em;
  position: relative;
}
.destacado-num {
  font-size: 52px; font-weight: 700; color: #56CCF2;
  line-height: 1; margin: 10px 0 6px;
}
.destacado-num span { font-size: 20px; color: var(--texto-sec); margin-left: 4px; }
.destacado-desc { font-size: 12px; color: var(--texto-sec); }
.destacado-sep { height: 1px; background: var(--borde); margin: 18px 0; }

.mini-metricas { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
.mini-num { font-size: 24px; font-weight: 700; line-height: 1; }
.mini-lbl { font-size: 10px; color: var(--texto-sec); text-transform: uppercase; letter-spacing: .05em; margin-top: 4px; }

/* Estrellas de satisfacción */
.estrellas-resumen {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-bottom: 16px;
  padding-top: 4px;
}
.estrella-mini { font-size: 15px; color: var(--borde); line-height: 1; }
.estrella-mini.activa { color: #F2C94C; }
.estrellas-txt { font-size: 11px; color: var(--texto-sec); margin-left: 7px; }

.barra-mini { display: flex; height: 6px; border-radius: 3px; overflow: hidden; background: var(--fondo); margin-top: auto; }
.seg { transition: width .4s; }
.seg-p { background: var(--pendiente); }
.seg-e { background: var(--proceso); }
.seg-r { background: var(--resuelto); }

/* Fila inferior */
.fila-inferior {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr;
  gap: 14px;
}
.lienzo { height: 240px; position: relative; }
.lienzo-dona { height: 260px; }
.vacio { color: var(--texto-sec); font-size: 13px; display: grid; place-items: center; height: 100%; }

/* Ranking */
.ranking { list-style: none; display: flex; flex-direction: column; gap: 14px; }
.ranking li { display: flex; align-items: center; gap: 12px; }
.rank-pos {
  width: 22px; height: 22px;
  border-radius: 6px;
  background: var(--fondo);
  display: grid; place-items: center;
  font-size: 11px; color: var(--texto-sec);
  flex-shrink: 0;
}
.rank-cuerpo { flex: 1; }
.rank-top { display: flex; justify-content: space-between; margin-bottom: 5px; }
.rank-nombre { font-size: 13px; }
.rank-num { font-size: 13px; color: var(--texto-sec); }
.rank-barra { height: 5px; border-radius: 3px; background: var(--fondo); overflow: hidden; }
.rank-fill { height: 100%; border-radius: 3px; transition: width .4s; }

/* Tema oscuro Leaflet */
:deep(.leaflet-tile-pane) { filter: invert(1) hue-rotate(180deg) brightness(.92) contrast(.88) saturate(.7); }
:deep(.leaflet-container) { background: #0F1419; border-radius: 8px; }
:deep(.leaflet-popup-content-wrapper) { background: var(--superficie); color: var(--texto); border-radius: 6px; }
:deep(.leaflet-popup-tip) { background: var(--superficie); }
:deep(.leaflet-control-zoom a) { background: var(--superficie); color: var(--texto); border-color: var(--borde); }

@media (max-width: 1250px) {
  .fila-principal { grid-template-columns: 1fr; }
  .fila-inferior { grid-template-columns: 1fr; }
}
</style>