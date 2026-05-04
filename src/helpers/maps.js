import { usePlantasStore } from "@/stores/plantas"
import {
  mdiFaucet,
  mdiFlask,
  mdiWaves,
  mdiHockeyPuck,
} from '@mdi/js'
import L from 'leaflet'

export const getTipoInfrastructuraByPunto = (infraId) => {
  if (!infraId) return null

  const plantaStore = usePlantasStore()
  const infraestructuras = plantaStore.getInfraestructuras

  if (!infraestructuras || infraestructuras.length === 0) {
    return null
  }

  const infraestructura = infraestructuras.find((infra) => Number(infra.id) === Number(infraId))
  return infraestructura ? infraestructura.type : null
}

export const getIconByInfraestructura = (infId) => {
  switch (Number(getTipoInfrastructuraByPunto(infId))) {
    case 1: return 'water'
    case 2: return 'ring'
    case 3: return 'flask'
    case 4: return 'route'
    default: return 'faucet'
  }
}

// ─── Pin SVG config ───────────────────────────────────────────────────────────
// Each type has a two-stop gradient and an MDI icon path.
// Gradient IDs are stable per type so shared SVG defs work across all markers.
const PIN_CONFIG = {
  water:  { path: mdiWaves,        g1: '#42a5f5', g2: '#1565c0', gid: 'pg_water'  },
  ring:   { path: mdiHockeyPuck,      g1: '#26c6da', g2: '#00838f', gid: 'pg_ring'   },
  flask:  { path: mdiFlask,            g1: '#ab47bc', g2: '#6a1b9a', gid: 'pg_flask'  },
  route:  { path: mdiFaucet,             g1: '#ffa726', g2: '#bf360c', gid: 'pg_route'  },
  faucet: { path: mdiFaucet,           g1: '#78909c', g2: '#263238', gid: 'pg_faucet' },
}

const pinSvg = ({ path, g1, g2, gid }) => `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 48" width="36" height="48">
    <defs>
      <linearGradient id="${gid}" x1="20%" y1="0%" x2="80%" y2="100%">
        <stop offset="0%" stop-color="${g1}"/>
        <stop offset="100%" stop-color="${g2}"/>
      </linearGradient>
    </defs>
    <!-- Pin body: teardrop shape -->
    <path
      d="M18 0C8.059 0 0 8.059 0 18C0 27.941 18 48 18 48C18 48 36 27.941 36 18C36 8.059 27.941 0 18 0Z"
      fill="url(#${gid})"
    />
    <!-- Darker bottom tint for depth -->
    <path
      d="M18 48C18 48 36 27.941 36 18C36 13 18 48 18 48Z"
      fill="rgba(0,0,0,0.15)"
    />
    <!-- Shine highlight -->
    <ellipse cx="13" cy="11" rx="7" ry="5.5" fill="rgba(255,255,255,0.22)" transform="rotate(-20,13,11)"/>
    <!-- MDI icon — 24×24 grid mapped to 6,5 offset inside 36px circle -->
    <g transform="translate(6,5)" fill="white" opacity="0.95">
      <path d="${path}"/>
    </g>
  </svg>`

// Cache so each of the 5 types is created only once
const iconCache = {}

export const markerDivIcon = (iconName) => {
  if (iconCache[iconName]) return iconCache[iconName]
  const config = PIN_CONFIG[iconName] ?? PIN_CONFIG.faucet
  iconCache[iconName] = L.divIcon({
    html: `<div style="width:36px;height:48px;filter:drop-shadow(0 4px 6px rgba(0,0,0,0.40))">${pinSvg(config)}</div>`,
    className: '',
    iconSize: [36, 48],
    iconAnchor: [18, 48],
    popupAnchor: [0, -50],
  })
  return iconCache[iconName]
}

