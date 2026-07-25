<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import api from '../services/api'

const auth = useAuthStore()

const nombre = ref(auth.user?.name || '')
const passwordActual = ref('')
const passwordNueva = ref('')
const passwordConfirmar = ref('')

const guardandoNombre = ref(false)
const guardandoPass = ref(false)
const mensajeNombre = ref(null)
const mensajePass = ref(null)
const errorNombre = ref(null)
const errorPass = ref(null)

const ROLES = {
  superadmin: 'Super Administrador',
  admin: 'Administrador',
  personal: 'Personal',
  ciudadano: 'Ciudadano',
}

async function guardarNombre() {
  guardandoNombre.value = true
  mensajeNombre.value = null
  errorNombre.value = null
  const ok = await auth.actualizarPerfil({ name: nombre.value })
  guardandoNombre.value = false
  if (ok) mensajeNombre.value = 'Nombre actualizado correctamente.'
  else errorNombre.value = auth.error
}

async function cambiarPassword() {
  mensajePass.value = null
  errorPass.value = null

  if (passwordNueva.value !== passwordConfirmar.value) {
    errorPass.value = 'Las contraseñas nuevas no coinciden.'
    return
  }
  if (passwordNueva.value.length < 6) {
    errorPass.value = 'La contraseña debe tener al menos 6 caracteres.'
    return
  }

  guardandoPass.value = true
  try {
    await api.put('/perfil', {
      password_actual: passwordActual.value,
      password: passwordNueva.value,
      password_confirmation: passwordConfirmar.value,
    })
    mensajePass.value = 'Contraseña cambiada correctamente.'
    passwordActual.value = ''
    passwordNueva.value = ''
    passwordConfirmar.value = ''
  } catch (e) {
    errorPass.value = e.response?.data?.message || 'No se pudo cambiar la contraseña.'
  } finally {
    guardandoPass.value = false
  }
}
</script>

<template>
  <div>
    <div class="encabezado">
      <h1 class="titulo">Mi perfil</h1>
      <p class="subtitulo">Administra tu información personal</p>
    </div>

    <div class="rejilla">
      <section class="tarjeta">
        <div class="avatar">{{ (auth.user?.name || '?').charAt(0).toUpperCase() }}</div>
        <h2 class="nombre">{{ auth.user?.name }}</h2>
        <p class="correo mono">{{ auth.user?.email }}</p>

        <dl class="info">
          <div>
            <dt>Rol</dt>
            <dd><span class="chip">{{ ROLES[auth.user?.rol] || auth.user?.rol }}</span></dd>
          </div>
          <div>
            <dt>Organización</dt>
            <dd>{{ auth.user?.organizacion || 'Sistema' }}</dd>
          </div>
        </dl>
      </section>

      <div class="columna">
        <section class="tarjeta">
          <h2 class="seccion-titulo">Editar nombre</h2>
          <div class="grupo">
            <label class="etiqueta">Nombre completo</label>
            <input v-model="nombre" class="campo" type="text">
          </div>
          <p v-if="mensajeNombre" class="ok">{{ mensajeNombre }}</p>
          <p v-if="errorNombre" class="err">{{ errorNombre }}</p>
          <button class="btn btn-primario" :disabled="guardandoNombre" @click="guardarNombre">
            {{ guardandoNombre ? 'Guardando…' : 'Guardar nombre' }}
          </button>
        </section>

        <section class="tarjeta">
          <h2 class="seccion-titulo">Cambiar contraseña</h2>
          <div class="grupo">
            <label class="etiqueta">Contraseña actual</label>
            <input v-model="passwordActual" class="campo" type="password" autocomplete="current-password">
          </div>
          <div class="grupo">
            <label class="etiqueta">Nueva contraseña</label>
            <input v-model="passwordNueva" class="campo" type="password" autocomplete="new-password">
          </div>
          <div class="grupo">
            <label class="etiqueta">Confirmar nueva contraseña</label>
            <input v-model="passwordConfirmar" class="campo" type="password" autocomplete="new-password">
          </div>
          <p v-if="mensajePass" class="ok">{{ mensajePass }}</p>
          <p v-if="errorPass" class="err">{{ errorPass }}</p>
          <button class="btn btn-primario" :disabled="guardandoPass" @click="cambiarPassword">
            {{ guardandoPass ? 'Cambiando…' : 'Cambiar contraseña' }}
          </button>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.encabezado { margin-bottom: 22px; }
.titulo { font-size: 22px; font-weight: 600; }
.subtitulo { font-size: 13px; color: var(--texto-sec); margin-top: 4px; }

.rejilla { display: grid; grid-template-columns: 300px 1fr; gap: 16px; align-items: start; }
.columna { display: flex; flex-direction: column; gap: 16px; }

.tarjeta {
  background: var(--superficie);
  border: 1px solid var(--borde);
  border-radius: 10px;
  padding: 24px;
}

.avatar {
  width: 72px; height: 72px;
  border-radius: 50%;
  background: var(--acento);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  font-weight: 600;
  margin: 0 auto 16px;
}
.nombre { text-align: center; font-size: 18px; font-weight: 600; }
.correo { text-align: center; font-size: 12px; color: var(--texto-sec); margin-top: 4px; }

.info {
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid var(--borde);
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.info dt { font-size: 10px; color: var(--texto-sec); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 4px; }
.info dd { font-size: 13px; }
.chip {
  display: inline-block;
  padding: 3px 10px;
  border: 1px solid var(--acento);
  color: var(--acento);
  border-radius: 12px;
  font-size: 11px;
}

.seccion-titulo { font-size: 14px; font-weight: 600; margin-bottom: 16px; }
.grupo { margin-bottom: 16px; }

.ok {
  background: rgba(39,174,96,.12);
  border: 1px solid rgba(39,174,96,.3);
  color: var(--resuelto, #27AE60);
  padding: 9px 12px;
  border-radius: 5px;
  font-size: 12px;
  margin-bottom: 14px;
}
.err {
  background: rgba(235,87,87,.12);
  border: 1px solid rgba(235,87,87,.3);
  color: var(--alta);
  padding: 9px 12px;
  border-radius: 5px;
  font-size: 12px;
  margin-bottom: 14px;
}

@media (max-width: 900px) {
  .rejilla { grid-template-columns: 1fr; }
}
</style>