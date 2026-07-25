<script setup>
import { useToast } from '../composables/useToast'
const { estado, quitar } = useToast()
</script>

<template>
  <div class="toast-zona">
    <transition-group name="toast">
      <div
        v-for="t in estado.lista"
        :key="t.id"
        class="toast"
        :class="`toast-${t.tipo}`"
        @click="quitar(t.id)"
      >
        <span class="toast-icono">
          {{ t.tipo === 'exito' ? '✓' : t.tipo === 'error' ? '✕' : 'ℹ' }}
        </span>
        <span class="toast-msg">{{ t.mensaje }}</span>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.toast-zona {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 500;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 260px;
  max-width: 360px;
  padding: 12px 14px;
  background: var(--superficie-alta);
  border: 1px solid var(--borde);
  border-left: 3px solid var(--acento);
  border-radius: 8px;
  color: var(--texto);
  font-size: 13px;
  box-shadow: 0 8px 30px rgba(0,0,0,.4);
  cursor: pointer;
  pointer-events: auto;
}

.toast-exito { border-left-color: var(--resuelto); }
.toast-error { border-left-color: var(--alta); }
.toast-info { border-left-color: var(--acento); }

.toast-icono {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
  color: #fff;
}
.toast-exito .toast-icono { background: var(--resuelto); }
.toast-error .toast-icono { background: var(--alta); }
.toast-info .toast-icono { background: var(--acento); }

.toast-msg { line-height: 1.4; }

.toast-enter-active, .toast-leave-active {
  transition: all .3s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(40px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(40px);
}
</style>