<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()

const nombre = ref('')
const email = ref('')
const password = ref('')
const registrado = ref(false)

async function registrarse() {
  const ok = await auth.registrar(nombre.value, email.value, password.value)
  if (ok) registrado.value = true
}
</script>

<template>
  <div class="pantalla">
    <div class="caja">
      <div class="cabecera">
        <span class="icono">◈</span>
        <h1>Crear cuenta</h1>
        <p>Regístrate para acceder al sistema</p>
      </div>

      <div v-if="registrado" class="exito">
        <p class="exito-titulo">¡Cuenta creada!</p>
        <p class="exito-texto">
          Tu cuenta fue registrada correctamente. Un administrador debe
          asignarte acceso al panel antes de que puedas ingresar.
        </p>
        <button class="btn btn-primario ancho" @click="router.push('/login')">
          Ir a iniciar sesión
        </button>
      </div>

      <form v-else @submit.prevent="registrarse">
        <div class="grupo">
          <label class="etiqueta" for="nombre">Nombre completo</label>
          <input
            id="nombre"
            v-model="nombre"
            type="text"
            class="campo"
            required
            autocomplete="name"
          >
        </div>

        <div class="grupo">
          <label class="etiqueta" for="email">Correo</label>
          <input
            id="email"
            v-model="email"
            type="email"
            class="campo"
            required
            autocomplete="email"
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
            minlength="6"
            autocomplete="new-password"
          >
          <span class="ayuda">Mínimo 6 caracteres</span>
        </div>

        <p v-if="auth.error" class="error">{{ auth.error }}</p>

        <button
          type="submit"
          class="btn btn-primario ancho"
          :disabled="auth.cargando"
        >
          {{ auth.cargando ? 'Creando…' : 'Crear cuenta' }}
        </button>

        <button type="button" class="olvide" @click="router.push('/login')">
          ¿Ya tienes cuenta? Inicia sesión
        </button>
      </form>
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

.ayuda {
  display: block;
  font-size: 11px;
  color: var(--texto-sec);
  margin-top: 6px;
}

.error {
  background: rgba(235,87,87,.12);
  border: 1px solid rgba(235,87,87,.3);
  color: var(--alta);
  padding: 10px 12px;
  border-radius: 4px;
  font-size: 13px;
  margin-bottom: 16px;
}

.exito { text-align: center; }
.exito-titulo {
  color: var(--resuelto);
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 10px;
}
.exito-texto {
  color: var(--texto-sec);
  font-size: 13px;
  line-height: 1.5;
  margin-bottom: 20px;
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
</style>