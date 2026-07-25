import { reactive } from 'vue'

const estado = reactive({
  lista: [],
})

let siguienteId = 1

function agregar(mensaje, tipo = 'info', duracion = 3500) {
  const id = siguienteId++
  estado.lista.push({ id, mensaje, tipo })
  setTimeout(() => quitar(id), duracion)
}

function quitar(id) {
  const i = estado.lista.findIndex(t => t.id === id)
  if (i !== -1) estado.lista.splice(i, 1)
}

export function useToast() {
  return {
    estado,
    quitar,
    exito: (msg) => agregar(msg, 'exito'),
    error: (msg) => agregar(msg, 'error'),
    info: (msg) => agregar(msg, 'info'),
  }
}