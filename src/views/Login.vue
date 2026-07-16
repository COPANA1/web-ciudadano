<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')

const GOOGLE_CLIENT_ID = '705313421003-srae9tl5nh69n45ci53ut03c9g7u4720.apps.googleusercontent.com'

async function entrar() {
  const ok = await auth.login(email.value, password.value)
  if (ok) router.push('/dashboard')
}

async function manejarCredencialGoogle(response) {
  const ok = await auth.loginConGoogle(response.credential)
  if (ok) router.push('/dashboard')
}

function cargarScriptGoogle() {
  return new Promise((resolve) => {
    if (window.google?.accounts?.id) return resolve()
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    document.head.appendChild(s)
  })
}

onMounted(async () => {
  await cargarScriptGoogle()
  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: manejarCredencialGoogle,
  })
  window.google.accounts.id.renderButton(
    document.getElementById('boton-google'),
    { theme: 'filled_black', size: 'large', width: 316, text: 'continue_with', shape: 'rectangular' }
  )
})
</script>

<template>
  <div class="pantalla">
    <div class="caja">
      <div class="cabecera">
        <span class="icono">◈</span>
        <h1>Panel de reportes</h1>
        <p>Ingresa con tu cuenta administrativa</p>
      </div>

      <form @submit.prevent="entrar">
        <div class="grupo">
          <label class="etiqueta" for="email">Correo</label>
          <input
            id="email"
            v-model="email"
            type="email"
            class="campo"
            required
            autocomplete="username"
          >
        </div>

        <div class="grupo">
          <label class="etiqueta" for="pass">Contraseña</label>
          <input
            id="pass"
            v-model="password"
            type="password"
            class="campo"
            required
            autocomplete="current-password"
          >
        </div>

        <p v-if="auth.error" class="error">{{ auth.error }}</p>

        <button
          type="submit"
          class="btn btn-primario ancho"
          :disabled="auth.cargando"
        >
          {{ auth.cargando ? 'Entrando…' : 'Entrar' }}
        </button>

        <button type="button" class="olvide" @click="router.push('/recuperar')">
          ¿Olvidaste tu contraseña?
        </button>

        <button type="button" class="olvide" @click="router.push('/registro')">
          ¿No tienes cuenta? Regístrate
        </button>
      </form>

      <div class="separador"><span>o</span></div>

      <div id="boton-google" class="google-wrap"></div>
    </div>
  </div>
</template>

<style scoped>
.pantalla {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 20px;
}

.caja {
  width: 100%;
  max-width: 380px;
  background: var(--superficie);
  border: 1px solid var(--borde);
  border-radius: 8px;
  padding: 32px;
}

.cabecera { text-align: center; margin-bottom: 28px; }
.icono {
  font-size: 32px;
  color: var(--acento);
  display: block;
  margin-bottom: 12px;
}
.cabecera h1 { font-size: 20px; font-weight: 600; margin-bottom: 6px; }
.cabecera p { font-size: 13px; color: var(--texto-sec); }

.grupo { margin-bottom: 18px; }

.error {
  background: rgba(235,87,87,.12);
  border: 1px solid rgba(235,87,87,.3);
  color: var(--alta);
  padding: 10px 12px;
  border-radius: 4px;
  font-size: 13px;
  margin-bottom: 16px;
}

.ancho { width: 100%; padding: 11px; }
.ancho:disabled { opacity: .6; cursor: not-allowed; }

.olvide {
  background: none;
  border: none;
  color: var(--texto-sec);
  font-size: 12px;
  width: 100%;
  margin-top: 14px;
  transition: color .15s;
}
.olvide:hover { color: var(--acento); }

.separador {
  display: flex;
  align-items: center;
  text-align: center;
  color: var(--texto-sec);
  font-size: 12px;
  margin: 22px 0 18px;
}
.separador::before,
.separador::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--borde);
}
.separador span { padding: 0 12px; }

.google-wrap {
  display: flex;
  justify-content: center;
}
</style>