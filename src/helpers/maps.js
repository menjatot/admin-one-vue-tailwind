import { usePlantasStore } from "@/stores/plantas";

export const getTipoInfrastructuraByPunto = (infraId) => {
  if (!infraId) return null
  
  const plantaStore = usePlantasStore()
  const infraestructuras = plantaStore.getInfraestructuras
  
  if (!infraestructuras || infraestructuras.length === 0) {
    // console.log('DEBUG: Infraestructuras vacías en el store. ID buscado:', infraId)
    return null
  }

  const infraestructura = infraestructuras.find((infra) => Number(infra.id) === Number(infraId))
  return infraestructura ? infraestructura.type : null
}
  
export const getIconByInfraestructura = (infId) => {
    switch (getTipoInfrastructuraByPunto(infId)) {
      case 1:
        return 'water'
        // return 'faucet'
      case 2:
        return 'ring'
      case 3:
        return 'flask'
      case 4:
        return 'route'
        default:
        return 'faucet'
    }
}

