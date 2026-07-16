<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '../services/api'

const organizaciones = ref([])
const cargando = ref(true)
const error = ref(null)
const modal = ref(false)
const editando = ref(null)

const form = ref({ nombre: '', tipo: 'municipalidad', telefono: '', direccion: '' })

const TIPOS = {
  municipalidad: { nombre: 'Municipalidad', icono: '🏛', color: '#2D9CDB' },
  universidad:   { nombre: 'Universidad',   icono: '🎓', color: '#8E24AA' },
  colegio:       { nombre: 'Colegio',       icono: '🏫', color: '#F2994A' },
  condominio:    { nombre: 'Condominio',    icono: '🏢', color: '#27AE60' },
  empresa:       { nombre: 'Empresa',       icono: '🏭', color: '#EB5757' },
  otro:          { nombre: 'Otro',          icono: '📍', color: '#7A8B9C' },
}

const activas = computed(() => organizaciones.value.filter(o => o.activo))
const inactivas = computed(() => organizaciones.value.filter(o => !o.activo))

async function cargar() {
  cargando.value = true
  try {
    const { data } = await api.get('/organizaciones')
    organizaciones.value = data
  } catch (e) {
    error.value = 'No se pudieron cargar las organizaciones.'
  } finally {
    cargando.value = false
  }
}

function abrirNueva() {
  editando.value = null
  form.value = { nombre: '', tipo: 'municipalidad', telefono: '', direccion: '' }
  modal.value = true
}

function abrirEditar(org) {
  editando.value = org.id
  form.value = {
    nombre: org.nombre,
    tipo: org.tipo,
    telefono: org.telefono || '',
    direccion: org.direccion || '',
  }
  modal.value = true
}

async function guardar() {
  try {
    if (editando.value) {
      await api.put(`/organizaciones/${editando.value}`, form.value)
    } else {
      await api.post('/organizaciones', form.value)
    }
    modal.value = false
    await cargar()
  } catch (e) {
    const errores = e.response?.data?.errors
    alert(errores ? Object.values(errores).flat().join('\n') : 'No se pudo guardar.')
  }
}

async function alternarActivo(org) {
  const accion = org.activo ? 'desactivar' : 'activar'
  if (!confirm(`¿Seguro que quieres ${accion} "${org.nombre}"?`)) return

  try {
    if (org.activo) {
      await api.delete(`/organizaciones/${org.id}`)
    } else {
      await api.put(`/organizaciones/${org.id}`, { activo: true })
    }
    await cargar()
  } catch (e) {
    alert('No se pudo cambiar el estado.')
  }
}

onMounted(cargar)
</script>

<template>
  <div>
    <header class="cabecera">
      <div>
        <h1>Organizaciones</h1>
        <p>Cada cliente que usa el sistema: municipios, colegios, condominios, empresas</p>
      </div>
      <button class="btn btn-primario" @click="abrirNueva">+ Nueva organización</button>
    </header>

    <p v-if="cargando" class="aviso">Cargando…</p>
    <p v-else-if="error" class="aviso error">{{ error }}</p>
    <p v-else-if="!organizaciones.length" class="aviso">
      Aún no hay organizaciones. Crea la primera para empezar.
    </p>

    <template v-else>
      <section class="rejilla">
        <article
          v-for="o in activas"
          :key="o.id"
          class="tarjeta"
          :style="{ '--tipo-color': TIPOS[o.tipo]?.color || '#7A8B9C' }"
        >
          <div class="tarjeta-top">
            <span class="tipo-icono">{{ TIPOS[o.tipo]?.icono || '📍' }}</span>
            <span class="tipo-nombre">{{ TIPOS[o.tipo]?.nombre || o.tipo }}</span>
          </div>

          <h3>{{ o.nombre }}</h3>
          <p v-if="o.direccion" class="direccion">{{ o.direccion }}</p>

          <div class="metricas">
            <div>
              <span class="metrica-num mono">{{ o.users_count ?? 0 }}</span>
              <span class="metrica-lbl">usuarios</span>
            </div>
            <div>
              <span class="metrica-num mono">{{ o.reportes_count ?? 0 }}</span>
              <span class="metrica-lbl">reportes</span>
            </div>
          </div>

          <div class="acciones">
            <button class="btn mini" @click="abrirEditar(o)">Editar</button>
            <button class="btn mini btn-peligro" @click="alternarActivo(o)">Desactivar</button>
          </div>
        </article>
      </section>

      <section v-if="inactivas.length" class="inactivas">
        <h2>Desactivadas</h2>
        <div class="rejilla">
          <article
            v-for="o in inactivas"
            :key="o.id"
            class="tarjeta apagada"
          >
            <div class="tarjeta-top">
              <span class="tipo-icono">{{ TIPOS[o.tipo]?.icono || '📍' }}</span>
              <span class="tipo-nombre">{{ TIPOS[o.tipo]?.nombre || o.tipo }}</span>
            </div>
            <h3>{{ o.nombre }}</h3>
            <div class="acciones">
              <button class="btn mini" @click="alternarActivo(o)">Reactivar</button>
            </div>
          </article>
        </div>
      </section>
    </template>

    <!-- Modal -->
    <div v-if="modal" class="capa" @click.self="modal = false">
      <div class="dialogo">
        <h2>{{ editando ? 'Editar organización' : 'Nueva organización' }}</h2>

        <div class="grupo">
          <label class="etiqueta">Nombre</label>
          <input v-model="form.nombre" class="campo" placeholder="Ej. Municipalidad de Sachaca">
        </div>

        <div class="grupo">
          <label class="etiqueta">Tipo</label>
          <div class="tipos">
            <button
              v-for="(t, clave) in TIPOS"
              :key="clave"
              class="tipo-boton"
              :class="{ activo: form.tipo === clave }"
              @click="form.tipo = clave"
            >
              <span class="tipo-boton-icono">{{ t.icono }}</span>
              {{ t.nombre }}
            </button>
          </div>
        </div>

        <div class="grupo">
          <label class="etiqueta">Teléfono (opcional)</label>
          <input v-model="form.telefono" class="campo" placeholder="054 123456">
        </div>

        <div class="grupo">
          <label class="etiqueta">Dirección (opcional)</label>
          <input v-model="form.direccion" class="campo" placeholder="Av. Ejército 100, Arequipa">
        </div>

        <div class="dialogo-botones">
          <button class="btn" @click="modal = false">Cancelar</button>
          <button class="btn btn-primario" @click="guardar">
            {{ editando ? 'Guardar cambios' : 'Crear organización' }}
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
  margin-bottom: 22px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--borde);
}
.cabecera h1 { font-size: 24px; font-weight: 600; margin-bottom: 4px; }
.cabecera p { color: var(--texto-sec); font-size: 13px; }

.aviso { color: var(--texto-sec); padding: 60px 0; text-align: center; }
.aviso.error { color: var(--alta); }

.rejilla {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}

.tarjeta {
  background: #161D26;
  border: 1px solid var(--borde);
  border-left: 3px solid var(--tipo-color, var(--borde));
  border-radius: 10px;
  padding: 18px;
  transition: border-color .15s, transform .15s;
}
.tarjeta:hover { transform: translateY(-2px); }
.apagada { opacity: .5; border-left-color: var(--borde); }

.tarjeta-top {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 10px;
}
.tipo-icono { font-size: 15px; }
.tipo-nombre {
  font-size: 10px;
  color: var(--texto-sec);
  text-transform: uppercase;
  letter-spacing: .07em;
  font-weight: 600;
}

.tarjeta h3 { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
.direccion { font-size: 12px; color: var(--texto-sec); margin-bottom: 14px; }

.metricas {
  display: flex;
  gap: 20px;
  padding: 12px 0;
  margin-bottom: 12px;
  border-top: 1px solid var(--borde);
  border-bottom: 1px solid var(--borde);
}
.metrica-num { font-size: 18px; font-weight: 600; display: block; }
.metrica-lbl { font-size: 10px; color: var(--texto-sec); text-transform: uppercase; letter-spacing: .06em; }

.acciones { display: flex; gap: 8px; }
.mini { padding: 5px 12px; font-size: 12px; }

.inactivas { margin-top: 32px; }
.inactivas h2 {
  font-size: 11px;
  color: var(--texto-sec);
  text-transform: uppercase;
  letter-spacing: .07em;
  margin-bottom: 14px;
}

/* Modal */
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
  max-width: 460px;
  max-height: 90vh;
  overflow-y: auto;
}
.dialogo h2 { font-size: 17px; font-weight: 600; margin-bottom: 20px; }
.grupo { margin-bottom: 18px; }

.tipos {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.tipo-boton {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 6px;
  background: var(--fondo);
  border: 1px solid var(--borde);
  border-radius: 6px;
  color: var(--texto-sec);
  font-size: 11px;
  transition: all .15s;
}
.tipo-boton:hover { border-color: #3A4757; color: var(--texto); }
.tipo-boton.activo {
  border-color: var(--acento);
  background: rgba(45,156,219,.1);
  color: var(--texto);
}
.tipo-boton-icono { font-size: 18px; }

.dialogo-botones {
  display: flex; gap: 8px;
  justify-content: flex-end;
  margin-top: 24px;
}
</style>