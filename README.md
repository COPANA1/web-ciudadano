# Reporte Ciudadano — Panel Web Administrativo

Panel de administración del sistema **Reporte Ciudadano**, orientado al personal municipal: gestión de reportes en tablero Kanban, dashboard con estadísticas, mapa de incidencias y comunicación directa con los ciudadanos.

Consume la misma API REST que la app móvil:

- 🔌 **API REST Laravel** → [reporte-ciudadano-api](https://github.com/COPANA1/reporte-ciudadano-api)
- 📱 **App móvil Flutter** → [reporte-ciudadano-app](https://github.com/COPANA1/reporte-ciudadano-app)

**Panel en producción:** https://reporteciudadano.duckdns.org

Credenciales de demostración:

| Rol | Correo | Contraseña |
|---|---|---|
| Superadmin | superadmin@sistema.com | Prueba123 |
| Admin de organización | admin@muni-demo.com | Prueba123 |

---

## Tecnologías

| Componente | Tecnología |
|---|---|
| Framework | Vue 3 (Composition API, `<script setup>`) |
| Build | Vite |
| Estado | Pinia |
| Rutas | vue-router |
| HTTP | Axios (interceptor con token Bearer) |
| Mapas | Leaflet + OpenStreetMap (tema oscuro) |
| Gráficos | Chart.js + vue-chartjs |
| Login social | Google Identity Services |

## Funcionalidades

- **Login** normal y con Google; registro público; recuperación de contraseña.
- **Dashboard:** KPIs (totales, pendientes, en proceso, resueltos, satisfacción ciudadana ★, confirmaciones), tiempo promedio de resolución, tendencia de 6 meses, distribución por categoría, ranking y **mapa de incidencias** con todos los reportes georreferenciados.
- **Kanban de reportes:** tres columnas (Pendiente / En proceso / Resuelto) con drag & drop en escritorio y botones "mover a" en móvil; buscador y filtro por categoría; badge 👁 con el número de ciudadanos que confirmaron cada incidencia.
- **Detalle de reporte:** descripción, mapa de ubicación, **fotos por etapa** (problema / trabajo en proceso / trabajo terminado, con cámara del navegador o archivo, reemplazar/mover/eliminar), **notas de voz** con reproductor, **hilo de comentarios** con el ciudadano (etiqueta "Autoridad"), **calificación con estrellas** del ciudadano, línea de tiempo del historial de estados y cambio de estado con comentario.
- **Módulos administrativos (CRUD):** Categorías, Usuarios (roles y organización) y Organizaciones (solo superadmin).
- **Mi Perfil:** editar nombre y cambiar contraseña.
- Diseño responsive (hamburguesa y kanban adaptado en móvil) con tema oscuro.

## Requisitos previos

- Node.js >= 18 y npm
- La API corriendo (local o producción)

## Instalación (desarrollo local)

```bash
# 1. Clonar el repositorio
git clone https://github.com/COPANA1/web-ciudadano.git
cd web-ciudadano

# 2. Instalar dependencias
npm install

# 3. Configurar la URL de la API
```

Crear un archivo `.env.local` en la raíz:

```env
# Apuntar a la API local...
VITE_API_URL=http://127.0.0.1:8000/api

# ...o directamente a producción
# VITE_API_URL=https://reporteciudadano.duckdns.org/api
```

```bash
# 4. Levantar en modo desarrollo
npm run dev
```

El panel queda en `http://localhost:5173`.

> **Nota sobre Google Login:** solo funciona desde los orígenes autorizados en Google Cloud (`localhost:5173` y el dominio de producción). Desde una IP no funciona.

## Compilar y desplegar

```bash
npm run build
```

Genera la carpeta `dist/`. En este proyecto se publica en el mismo droplet de DigitalOcean:

```bash
scp -r dist/* root@SERVIDOR:/var/www/panel/
# En el servidor:
chown -R www-data:www-data /var/www/panel
chmod -R 755 /var/www/panel
```

Nginx sirve `/var/www/panel` como sitio estático con fallback a `index.html` para las rutas de Vue.

## Estructura del proyecto

```
src/
├── views/            # Pantallas: Dashboard, Reportes (kanban), ReporteDetalle,
│                     # MapaGeneral, Categorias, Usuarios, Organizaciones, Perfil, Login...
├── stores/           # Pinia (auth con token y rol)
├── services/         # api.js (axios con interceptor Bearer)
├── composables/      # useToast, etc.
└── router/           # Rutas con guard de autenticación
public/
└── privacidad.html   # Política de privacidad (requerida por Google Play)
```



### Integrantes del grupo

- Brayan Copana torres
- Huamani Quispe Sebastian Abel
- Rody Michaell Huancapaza Quispe
- Anthony Junior Quispe Cruz
- Boris Yeltsin Quispe Quispe
## Licencia

Uso académico.