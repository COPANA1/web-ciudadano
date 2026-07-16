<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'

const router = useRouter()

const paso = ref(1)            // 1 = pedir correo, 2 = código + nueva contraseña
const email = ref('')
const code = ref('')
const password = ref('')
const password2 = ref('')

const cargando = ref(false)
const error = ref(null)
const exito = ref(null)

async function pedirCodigo() {
  error.value = null
  cargando.value = true
  try {
    const { data } = await api.post('/password/forgot', { email: email.value })
    exito.value = data.message
    paso.value = 2
  } catch (e) {
    error.value = e.response?.data?.message || 'No se pudo enviar el código.'
  } finally {
    cargando.value = false
  }
}

async function cambiar() {
  error.value = null

  if (password.value !== password2.value) {
    error.value = 'Las contraseñas no coinciden.'
    return
  }
  if (password.value.length < 6) {
    error.value = 'La contraseña debe tener al menos 6 caracteres.'
    return
  }

  cargando.value = true
  try {
    await api.post('/password/reset', {
      email: email.value,
      code: code.value,
      password: password.value,
    })
    exito.value = 'Contraseña actualizada. Redirigiendo al login…'
    setTimeout(() => router.push('/login'), 1500)
  } catch (e) {
    error.value = e.response?.data?.message || 'No se pudo cambiar la contraseña.'
  } finally {
    cargando.value = false
  }
}
</script>

<template>
  <div class="pantalla">
    <div class="caja">
      <div class="cabecera">
        <span class="icono">◈</span>
        <h1>Recuperar contraseña</h1>
        <p v-if="paso === 1">Te enviaremos un código a tu correo</p>
        <p v-else>Revisa tu correo e ingresa el código</p>
      </div>

      <!-- Paso 1: correo -->
      <form v-if="paso === 1" @submit.prevent="pedirCodigo">
        <div class="grupo">
          <label class="etiqueta">Correo</label>
          <input v-model="email" type="email" class="campo" required autocomplete="email">
        </div>

        <p v-if="error" class="error">{{ error }}</p>

        <button type="submit" class="btn btn-primario ancho" :disabled="cargando">
          {{ cargando ? 'Enviando…' : 'Enviar código' }}
        </button>
      </form>

      <!-- Paso 2: código + nueva contraseña -->
      <form v-else @submit.prevent="cambiar">
        <p v-if="exito" class="aviso-ok">{{ exito }}</p>

        <div class="grupo">
          <label class="etiqueta">Código de 6 dígitos</label>
          <input v-model="code" class="campo mono codigo" maxlength="6" required placeholder="000000">
        </div>

        <div class="grupo">
          <label class="etiqueta">Nueva contraseña</label>
          <input v-model="password" type="password" class="campo" required>
        </div>

        <div class="grupo">
          <label class="etiqueta">Repite la contraseña</label>
          <input v-model="password2" type="password" class="campo" required>
        </div>

        <p v-if="error" class="error">{{ error }}</p>

        <button type="submit" class="btn btn-primario ancho" :disabled="cargando">
          {{ cargando ? 'Guardando…' : 'Cambiar contraseña' }}
        </button>
      </form>

      <button class="volver" @click="router.push('/login')">← Volver al inicio de sesión</button>
    </div>
  </div>
</template>

<style scoped>
.pantalla { min-height: 100vh; display: grid; place-items: center; padding: 20px; }
.caja {
  width: 100%;
  max-width: 380px;
  background: var(--superficie);
  border: 1px solid var(--borde);
  border-radius: 8px;
  padding: 32px;
}
.cabecera { text-align: center; margin-bottom: 24px; }
.icono { font-size: 32px; color: var(--acento); display: block; margin-bottom: 12px; }
.cabecera h1 { font-size: 20px; font-weight: 600; margin-bottom: 6px; }
.cabecera p { font-size: 13px; color: var(--texto-sec); }

.grupo { margin-bottom: 18px; }
.codigo { text-align: center; font-size: 22px; letter-spacing: .3em; }

.error {
  background: rgba(235,87,87,.12);
  border: 1px solid rgba(235,87,87,.3);
  color: var(--alta);
  padding: 10px 12px;
  border-radius: 4px;
  font-size: 13px;
  margin-bottom: 16px;
}
.aviso-ok {
  background: rgba(39,174,96,.12);
  border: 1px solid rgba(39,174,96,.3);
  color: var(--resuelto);
  padding: 10px 12px;
  border-radius: 4px;
  font-size: 13px;
  margin-bottom: 16px;
}

.ancho { width: 100%; padding: 11px; }
.ancho:disabled { opacity: .6; cursor: not-allowed; }

.volver {
  background: none;
  border: none;
  color: var(--texto-sec);
  font-size: 13px;
  width: 100%;
  margin-top: 18px;
  transition: color .15s;
}
.volver:hover { color: var(--texto); }
</style>