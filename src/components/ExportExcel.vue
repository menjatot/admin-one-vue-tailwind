<script setup>
import { defineProps, toRefs } from 'vue';
import BaseButton from '@/components/BaseButton.vue';
import { mdiDownload, mdiFileExcel } from '@mdi/js';
import useExtractdata from '@/composables/useUploadFormData'; // Para la lógica XML
import * as XLSX from 'xlsx'; // Para la lógica Excel
import { usePlantasStore } from '@/stores/plantas'; // Para obtener nombres/datos adicionales si es necesario
import { useNotifications } from '@/composables/useNotifications'
import { CATALUNA_COMUNIDAD_ID } from '@/constants/comunidades'

const props = defineProps({
  selectedRows: {
    type: Array,
    default: () => []
  },
  allAnaliticasForDateRange: { // Para el caso de Excel que necesita un rango de fechas basado en selección
    type: Array,
    default: () => []
  },
  fileNameBase: {
    type: String,
    default: 'exportacion'
  },
  enableXmlExport: {
    type: Boolean,
    default: true
  },
  enableExcelExport: {
    type: Boolean,
    default: true
  }
});

const { selectedRows, allAnaliticasForDateRange, fileNameBase } = toRefs(props);
const { exportXMLData } = useExtractdata(); // Asumiendo que esta es tu lógica de generación de XML
const plantasStore = usePlantasStore(); // Para obtener datos de referencia como nombres
const { warning: notifyWarning, info: notifyInfo } = useNotifications()

// --- Lógica para formatear datos para Excel (similar a la propuesta anterior) ---
const getPuntoMuestreoNombre = (id) => plantasStore.getPuntosMuestreo.find(p => p.id === id)?.name || 'N/A';
const getComunidadFromAnalitica = (a) => {
  if (a.comunidad_id) return a.comunidad_id
  const punto = plantasStore.getPuntosMuestreo.find(p => p.id === a.punto_muestreo_fk)
  if (!punto?.zona_fk) return null
  const zona = plantasStore.getZonas.find(z => z.id === punto.zona_fk)
  return zona?.com_autonoma_fk ?? null
};
const getOperarioNombre = (analitica) => {
  // Primero intentar usar los datos ya cargados desde el servidor (personal.name)
  if (analitica?.personal?.name) return analitica.personal.name;
  // Fallback: buscar en el store de operarios
  return plantasStore.getOperarios.find(o => o.id === analitica?.personal_fk)?.name || 'N/A';
};
const getTipoAnaliticaNombre = (id) => {
  if (id === 28) return 'Operacional';
  if (id === 29) return 'Rutina';
  return 'N/A';
};
const formatDateForDisplay = (dateString) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};
const formatOrganoleptico = (value) => {
  if (value === 1) return 'Conforme';
  if (value === 0) return 'No Conforme';
  return '';
};
// --- Fin de la lógica para formatear datos para Excel ---

const handleDownloadXML = () => {
  if (selectedRows.value.length === 0) {
    notifyWarning('Selecciona al menos una analitica para exportar a XML.', {
      title: 'Seleccion requerida'
    })
    return;
  }
  // Filtrar solo tipos 28 y 29 para XML
  const analiticasParaXml = selectedRows.value.filter(item => item.type === 28 || item.type === 29);

  if (analiticasParaXml.length === 0) {
    notifyWarning(
      'Las analiticas seleccionadas deben ser de tipo Operacional o Rutina para exportar XML.',
      {
        title: 'Tipos no validos'
      }
    )
    return;
  }

  const xmlContent = exportXMLData(analiticasParaXml);
  const blob = new Blob([xmlContent], { type: 'application/xml' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${fileNameBase.value}_${new Date().toISOString().split('T')[0]}.xml`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
  notifyInfo('La descarga del XML se ha iniciado.', {
    title: 'Exportacion en curso'
  })
};

const handleDownloadExcel = () => {
  if (selectedRows.value.length === 0) {
    notifyWarning(
      'Selecciona al menos una analitica para exportar a Excel.',
      {
        title: 'Seleccion requerida'
      }
    )
    return;
  }

  // Exportar solo las analíticas seleccionadas (marcadas con checkbox), no todas las filtradas
  let minDate = selectedRows.value[0].fecha
  let maxDate = selectedRows.value[0].fecha

  selectedRows.value.forEach(row => {
    if (row.fecha < minDate) minDate = row.fecha
    if (row.fecha > maxDate) maxDate = row.fecha
  })

  const hasCataluna = selectedRows.value.some(a => getComunidadFromAnalitica(a) === CATALUNA_COMUNIDAD_ID)

  const dataForSheet = selectedRows.value.map(a => {
    const row = {
      'Fecha': formatDateForDisplay(a.fecha),
      'Punto de Muestreo': getPuntoMuestreoNombre(a.punto_muestreo_fk),
      'Operario': getOperarioNombre(a),
      'Tipo Analítica': getTipoAnaliticaNombre(a.type),
      'Cloro (mg/l)': a.cloro,
      'pH': a.ph,
      'Turbidez (NTU)': a.turbidez,
      'Olor': formatOrganoleptico(a.olor),
      'Sabor': formatOrganoleptico(a.sabor),
      'Observaciones': a.observaciones
    }
    if (hasCataluna) {
      row['Cloro Total (mg/l)'] = a.cloro_total != null ? a.cloro_total : ''
      row['Cloro Combinado (mg/l)'] = a.cloro_combinado != null ? a.cloro_combinado : ''
    }
    return row
  })

  const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Analíticas');
  const excelFileName = `${fileNameBase.value}_${minDate}_a_${maxDate}.xlsx`;
  XLSX.writeFile(workbook, excelFileName);
  notifyInfo('La descarga del Excel se ha iniciado.', {
    title: 'Exportacion en curso'
  })
};

</script>

<template>
  <div class="flex gap-2">
    <BaseButton
      v-if="props.enableXmlExport"
      :icon="mdiDownload"
      label="Download XML"
      color="info"
      rounded-full
      small
      :disabled="selectedRows.length === 0"
      @click="handleDownloadXML"
    />
    <BaseButton
      v-if="props.enableExcelExport"
      label="Exportar Excel"
      color="success"
      :icon="mdiFileExcel"
      rounded-full
      small
      :disabled="selectedRows.length === 0"
      @click="handleDownloadExcel"
    />
    <!-- Puedes añadir más botones de exportación aquí -->
  </div>
</template>