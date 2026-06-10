<script setup>
import { defineProps, toRefs, ref } from 'vue';
import BaseIcon from '@/components/BaseIcon.vue';
import { mdiPrinter, mdiFileExcel, mdiLoading } from '@mdi/js';
import { usePlantasStore } from '@/stores/plantas';
import * as XLSX from 'xlsx';
import { useNotifications } from '@/composables/useNotifications'
import { CATALUNA_COMUNIDAD_ID } from '@/constants/comunidades'

const props = defineProps({
  selectedRows: {
    type: Array,
    default: () => []
  },
  allAnaliticasForDateRange: {
    type: Array,
    default: () => []
  },
  fileNameBase: { // Aunque no se usa para el nombre de archivo, puede ser útil para el título del HTML
    type: String,
    default: 'Informe_Analiticas'
  },
  logoUrl: {
    type: String,
    default: 'https://www.aqlara.com/wp-content/uploads/2022/01/Logo-aclara-300x126-v2.jpg' // Ajusta esta ruta si es necesario
  },
  companyName: {
    type: String,
    default: 'AQLARA Ciclo Integral del Agua'
  },
  enableHtmlPrint: { // Prop para mantener la consistencia, aunque ahora será la única función
    type: Boolean,
    default: true
  },
  selectedZona: {
    type: [Number, null],
    default: null
  },
  onBeforeExport: {
    type: Function,
    default: null
  }
});

const { selectedRows, allAnaliticasForDateRange, fileNameBase, logoUrl, companyName, selectedZona } = toRefs(props);
const plantasStore = usePlantasStore();
const exporting = ref(false)

const groupByZona = ref(false)

const getZonaNombre = (zonaId) => {
  if (!zonaId) return '';
  const zona = plantasStore.getZonas.find(z => z.id === zonaId);
  return zona ? zona.name : '';
};

// Resuelve la zona de abastecimiento de una analítica (id + nombre). Usa la zona
// embebida del punto de muestreo si viene del servidor, con fallback al store.
const getZonaInfoFromAnalitica = (a) => {
  if (a.zona_name) return { id: a.zona_id ?? null, name: a.zona_name };
  const zonaFk =
    a.punto_muestreo?.zona_fk ??
    plantasStore.getPuntosMuestreo.find(p => p.id === a.punto_muestreo_fk)?.zona_fk;
  if (!zonaFk) return { id: null, name: 'Sin zona' };
  const zona = plantasStore.getZonas.find(z => z.id === zonaFk);
  return { id: zona?.id ?? null, name: zona?.name ?? 'Sin zona' };
};

// --- Funciones auxiliares de formato ---
const getPuntoMuestreoNombre = (id) => plantasStore.getPuntosMuestreo.find(p => p.id === id)?.name || 'N/A';
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
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};
const formatOrganoleptico = (value) => {
  if (value === 1) return 'Conforme';
  if (value === 0) return 'No Conforme';
  return '';
};
// --- Fin de funciones auxiliares ---

// --- Cálculo de volumen y m³/día ---
const getPrevAnalitica = (analitica) => {
  if (analitica.totalizador == null) return null
  return allAnaliticasForDateRange.value
    .filter(a =>
      a.punto_muestreo_fk === analitica.punto_muestreo_fk &&
      a.totalizador != null &&
      a.id !== analitica.id &&
      new Date(a.fecha) <= new Date(analitica.fecha)
    )
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0] ?? null
}
const getVolumen = (analitica) => {
  const prev = getPrevAnalitica(analitica)
  return prev != null ? analitica.totalizador - prev.totalizador : null
}
const getM3PerDia = (analitica) => {
  const prev = getPrevAnalitica(analitica)
  if (prev == null) return null
  const volumen = analitica.totalizador - prev.totalizador
  const dias = Math.round((new Date(analitica.fecha) - new Date(prev.fecha)) / (1000 * 60 * 60 * 24))
  return dias > 0 ? Math.round((volumen / dias) * 100) / 100 : null
}

const { warning: notifyWarning } = useNotifications()

const getAnaliticasParaExportar = () => {
  if (selectedRows.value.length === 0) {
    notifyWarning('Selecciona al menos una analitica para exportar.', {
      title: 'Seleccion requerida'
    })
    return null;
  }

  // Exportar solo las analíticas seleccionadas (marcadas con checkbox), no todas las filtradas
  let minDate = selectedRows.value[0].fecha;
  let maxDate = selectedRows.value[0].fecha;
  selectedRows.value.forEach(row => {
    if (row.fecha < minDate) minDate = row.fecha;
    if (row.fecha > maxDate) maxDate = row.fecha;
  });

  return { analiticas: [...selectedRows.value], minDate, maxDate };
};

// ...existing code...

const handlePrintHTML = async () => {
  exporting.value = true
  try {
    if (props.onBeforeExport) {
      await props.onBeforeExport()
    }

    const exportData = getAnaliticasParaExportar();
    if (!exportData) return;
    let { analiticas, minDate, maxDate } = exportData;

  analiticas = [...analiticas].sort((a, b) => {
    if (a.punto_muestreo_fk !== b.punto_muestreo_fk) {
      return a.punto_muestreo_fk - b.punto_muestreo_fk;
    }
    return new Date(a.fecha) - new Date(b.fecha);
  });

  let tituloInforme = `Informe de Analíticas (${formatDateForDisplay(minDate)} - ${formatDateForDisplay(maxDate)})`;
  if (selectedZona.value) {
    const nombreZona = getZonaNombre(selectedZona.value);
    if (nombreZona) {
      tituloInforme = `Informe de Analíticas - ${nombreZona} (${formatDateForDisplay(minDate)} - ${formatDateForDisplay(maxDate)})`;
    }
  }

  function getComunidadFromAnalitica(a) {
    if (a.comunidad_id) return a.comunidad_id
    const punto = plantasStore.getPuntosMuestreo.find(p => p.id === a.punto_muestreo_fk)
    if (!punto?.zona_fk) return null
    const zona = plantasStore.getZonas.find(z => z.id === punto.zona_fk)
    return zona?.com_autonoma_fk ?? null
  }

  // Definición centralizada de columnas
  const hasCataluna = analiticas.some(a => getComunidadFromAnalitica(a) === CATALUNA_COMUNIDAD_ID)

  const columns = [
    { label: 'Fecha',              value: a => formatDateForDisplay(a.fecha) },
    { label: 'Punto de Muestreo',  value: a => getPuntoMuestreoNombre(a.punto_muestreo_fk) },
    { label: 'Zona de Abastecimiento', value: a => getZonaInfoFromAnalitica(a).name },
    { label: 'Operario',           value: a => getOperarioNombre(a) },
    { label: 'Código SINAC',       value: a => a.punto_muestreo_fk },
    { label: 'Cloro (mg/l)',       value: a => a.cloro != null ? a.cloro : '' },
    { label: 'pH',                 value: a => a.ph != null ? a.ph : '' },
    { label: 'Turbidez (NTU)',     value: a => a.turbidez != null ? a.turbidez : '' },
    { label: 'Olor',               value: a => formatOrganoleptico(a.olor) },
    { label: 'Sabor',              value: a => formatOrganoleptico(a.sabor) },
    { label: 'Color',              value: a => formatOrganoleptico(a.color) },
    ...(hasCataluna ? [
      { label: 'Cloro Total (mg/l)',     value: a => a.cloro_total != null ? a.cloro_total : '' },
      { label: 'Cloro Combinado (mg/l)', value: a => a.cloro_combinado != null ? a.cloro_combinado : '' }
    ] : []),
    { label: 'Totalizador (m³)',   value: a => a.totalizador != null ? a.totalizador : '' },
    { label: 'Volumen (m³)',       value: a => getVolumen(a) != null ? getVolumen(a) : '' },
    { label: 'Consumo (m³/día)',   value: a => getM3PerDia(a) != null ? getM3PerDia(a) : '' },
    { label: 'Observaciones',      value: a => a.observaciones ?? '' }
  ]

  // Pre-computar todos los valores de celda + metadata de zona para el JS del HTML
  const serializedData = analiticas.map(a => {
    const zona = getZonaInfoFromAnalitica(a)
    return {
      zona_id: zona.id,
      zona_name: zona.name,
      punto_muestreo_fk: a.punto_muestreo_fk,
      fecha: a.fecha,
      cells: columns.map(col => String(col.value(a) ?? ''))
    }
  })

  const columnSelectorHtml = columns.map((col, i) =>
    `<label class="col-check-label"><input type="checkbox" checked onchange="toggleColumn(${i}, this.checked)" />${col.label}</label>`
  ).join('')

  const htmlContent = `
    <html>
      <head>
        <title>${fileNameBase.value} - ${companyName.value}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #00447C; }
          .logo-container { flex-shrink: 0; }
          .logo { max-height: 60px; }
          .header-text { text-align: right; flex-grow: 1; }
          .company-name-html { font-size: 20px; font-weight: bold; color: #00447C; margin-bottom: 5px; }
          .report-title-html { font-size: 16px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10px; }
          th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
          th { background-color: #00447C; color: white; }
          th.sortable { cursor: pointer; user-select: none; }
          th.sortable:hover { background-color: #003060; }
          tr.grupo-nuevo td { border-top: 2px solid #00447C; }
          tr.zone-header-row td { background: #dce8f4; font-weight: bold; color: #00447C; font-size: 11px; border-top: 3px solid #00447C; border-bottom: 1px solid #9ab8d8; letter-spacing: 0.02em; }
          .controls-panel { margin: 14px 0 4px; padding: 10px 14px; background: #f0f4f8; border: 1px solid #c0cfe0; border-radius: 6px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; }
          .controls-panel strong { color: #00447C; font-size: 13px; }
          .controls-divider { align-self: stretch; width: 1px; background: #aac4e0; margin: 0 4px; }
          .col-check-label { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; cursor: pointer; user-select: none; }
          .col-check-label input { cursor: pointer; }
          .group-check-label { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: #00447C; cursor: pointer; user-select: none; }
          .print-btn { margin-top: 16px; padding: 8px 22px; background: #00447C; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
          .print-btn:hover { background: #003060; }
          @page { size: A4 landscape; margin: 0.8cm; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
            .page-header { justify-content: flex-start; }
            .header-text { text-align: center; margin-left: 20px; }
            table { font-size: 8px; }
            th, td { padding: 4px; }
          }
        </style>
      </head>
      <body>
        <div class="page-header">
          <div class="logo-container">
            ${logoUrl.value ? `<img src="${logoUrl.value}" alt="Logo" class="logo"/>` : ''}
          </div>
          <div class="header-text">
            <div class="company-name-html">${companyName.value}</div>
            <div class="report-title-html">${tituloInforme}</div>
          </div>
        </div>

        <div class="no-print controls-panel">
          <label class="group-check-label">
            <input type="checkbox" ${groupByZona.value ? 'checked' : ''} onchange="toggleGroupByZona(this.checked)" />
            &#128205; Agrupar por zona de abastecimiento
          </label>
          <div class="controls-divider"></div>
          <strong>Columnas:</strong>
          ${columnSelectorHtml}
        </div>

        <table>
          <thead><tr></tr></thead>
          <tbody></tbody>
        </table>
        <button class="no-print print-btn" onclick="window.print()">Imprimir</button>

        <script>
          var REPORT_DATA = ${JSON.stringify(serializedData)};
          var COLUMN_LABELS = ${JSON.stringify(columns.map(c => c.label))};
          var visibleCols = COLUMN_LABELS.map(function(_, i) { return i; });
          var groupByZona = ${groupByZona.value};
          var sortCol = -1;
          var sortAsc = true;

          function renderHeader() {
            var tr = document.querySelector('thead tr');
            tr.innerHTML = visibleCols
              .map(function(i) {
                var arrow = '';
                if (sortCol === i) {
                  arrow = sortAsc ? ' \u2191' : ' \u2193';
                }
                return '<th class="sortable" data-col="' + i + '">' + COLUMN_LABELS[i] + arrow + '</th>';
              })
              .join('');
            document.querySelectorAll('thead th.sortable').forEach(function(th) {
              th.style.cursor = 'pointer';
              th.style.userSelect = 'none';
              th.addEventListener('click', function() { handleSort(Number(th.dataset.col)); });
            });
          }

          function handleSort(colIndex) {
            if (sortCol === colIndex) {
              sortAsc = !sortAsc;
            } else {
              sortCol = colIndex;
              sortAsc = true;
            }
            renderBody();
            renderHeader();
          }

          function sortValue(row, colIdx) {
            var v = row.cells[colIdx];
            if (v === '' || v == null) return -Infinity;
            if (colIdx === 0) return new Date(row.fecha).getTime();
            var n = parseFloat(v);
            if (!isNaN(n) && v.indexOf('/') === -1) return n;
            return v;
          }

          function renderBody() {
            var sorted = REPORT_DATA.slice().sort(function(a, b) {
              if (groupByZona) {
                var zc = (a.zona_name || '').localeCompare(b.zona_name || '', 'es');
                if (zc !== 0) return zc;
              }
              if (sortCol >= 0) {
                var av = sortValue(a, sortCol);
                var bv = sortValue(b, sortCol);
                if (av !== bv) {
                  if (typeof av === 'number' && typeof bv === 'number') return sortAsc ? av - bv : bv - av;
                  var sc = String(av).localeCompare(String(bv), 'es', { numeric: true });
                  return sortAsc ? sc : -sc;
                }
              }
              if (a.punto_muestreo_fk !== b.punto_muestreo_fk) return a.punto_muestreo_fk - b.punto_muestreo_fk;
              return new Date(a.fecha) - new Date(b.fecha);
            });

            var html = '';
            var prevZona = null;
            var prevPunto = null;

            sorted.forEach(function(row) {
              if (groupByZona && row.zona_id !== prevZona) {
                html += '<tr class="zone-header-row"><td colspan="' + visibleCols.length + '">' +
                  '&#9670; ' + (row.zona_name || 'Sin zona') +
                  '</td></tr>';
                prevZona = row.zona_id;
                prevPunto = null;
              }
              var isNewGroup = row.punto_muestreo_fk !== prevPunto;
              prevPunto = row.punto_muestreo_fk;
              var cls = isNewGroup ? ' class="grupo-nuevo"' : '';
              html += '<tr' + cls + '>' +
                visibleCols.map(function(i) { return '<td>' + (row.cells[i] || '') + '</td>'; }).join('') +
                '</tr>';
            });

            document.querySelector('tbody').innerHTML = html;
          }

          function renderAll() {
            renderHeader();
            renderBody();
          }

          function toggleColumn(colIndex, visible) {
            if (visible) {
              if (visibleCols.indexOf(colIndex) === -1) {
                visibleCols.push(colIndex);
                visibleCols.sort(function(a, b) { return a - b; });
              }
            } else {
              visibleCols = visibleCols.filter(function(i) { return i !== colIndex; });
            }
            renderAll();
          }

          function toggleGroupByZona(enabled) {
            groupByZona = enabled;
            renderBody();
          }

          window.onload = renderAll;
        <\/script>
      </body>
    </html>
  `

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  const printWindow = window.open(blobUrl, '_blank');
  if (printWindow) {
    printWindow.addEventListener('unload', () => URL.revokeObjectURL(blobUrl), { once: true });
  }
  } finally {
    exporting.value = false
  }
};

const handleExportExcel = async () => {
  exporting.value = true
  try {
    // Llamar a la función de callback antes de exportar (si existe)
    if (props.onBeforeExport) {
    await props.onBeforeExport()
  }

  const exportData = getAnaliticasParaExportar();
  if (!exportData) return;
  let { analiticas, minDate, maxDate } = exportData;

  // Ordenar las analíticas de la misma manera que en el PDF
  analiticas = [...analiticas].sort((a, b) => {
    if (a.punto_muestreo_fk !== b.punto_muestreo_fk) {
      return a.punto_muestreo_fk - b.punto_muestreo_fk;
    }
    const fechaA = new Date(a.fecha);
    const fechaB = new Date(b.fecha);
    return fechaA - fechaB;
  });

  // Construir el título con la zona si está seleccionada
  let tituloInforme = `Informe de Analíticas (${formatDateForDisplay(minDate)} - ${formatDateForDisplay(maxDate)})`;
  if (selectedZona.value) {
    const nombreZona = getZonaNombre(selectedZona.value);
    if (nombreZona) {
      tituloInforme = `Informe de Analíticas - ${nombreZona} (${formatDateForDisplay(minDate)} - ${formatDateForDisplay(maxDate)})`;
    }
  }

  // Preparar los datos para Excel
  const excelData = [];

  // Fila de título
  excelData.push([companyName.value]);
  excelData.push([tituloInforme]);
  excelData.push([]); // Fila vacía para separación

  const hasCatalunaExcel = analiticas.some(a => a.comunidad_id === CATALUNA_COMUNIDAD_ID)

  // Encabezados de la tabla (incluye Zona de Abastecimiento)
  const headers = [
    'Fecha',
    'Punto de Muestreo',
    'Zona de Abastecimiento',
    'Operario',
    'Código SINAC',
    'Cloro (mg/l)',
    'pH',
    'Turbidez (NTU)',
    'Olor',
    'Sabor',
    'Color'
  ]
  if (hasCatalunaExcel) {
    headers.push('Cloro Total (mg/l)', 'Cloro Combinado (mg/l)')
  }
  headers.push(
    'Totalizador (m³)',
    'Volumen (m³)',
    'Consumo (m³/día)',
    'Observaciones'
  )
  excelData.push(headers)

  const lastColIndex = headers.length - 1
  const groupMerges = []

  // Construye la fila de datos de una analítica
  const buildExcelRow = (a) => {
    const row = [
      formatDateForDisplay(a.fecha),
      getPuntoMuestreoNombre(a.punto_muestreo_fk),
      getZonaInfoFromAnalitica(a).name,
      getOperarioNombre(a),
      a.punto_muestreo_fk,
      a.cloro !== null && a.cloro !== undefined ? a.cloro : '',
      a.ph !== null && a.ph !== undefined ? a.ph : '',
      a.turbidez !== null && a.turbidez !== undefined ? a.turbidez : '',
      formatOrganoleptico(a.olor),
      formatOrganoleptico(a.sabor),
      formatOrganoleptico(a.color)
    ]
    if (hasCatalunaExcel) {
      row.push(
        a.cloro_total != null ? a.cloro_total : '',
        a.cloro_combinado != null ? a.cloro_combinado : ''
      )
    }
    row.push(
      a.totalizador != null ? a.totalizador : '',
      getVolumen(a) != null ? getVolumen(a) : '',
      getM3PerDia(a) != null ? getM3PerDia(a) : '',
      a.observaciones ?? ''
    )
    return row
  }

  if (groupByZona.value) {
    // Agrupado por zona: ordenar por zona -> punto -> fecha e insertar una fila
    // de cabecera (celda combinada) por cada zona, igual que el informe HTML agrupado.
    const ordenadas = [...analiticas].sort((a, b) => {
      const zc = (getZonaInfoFromAnalitica(a).name || '').localeCompare(
        getZonaInfoFromAnalitica(b).name || '', 'es'
      )
      if (zc !== 0) return zc
      if (a.punto_muestreo_fk !== b.punto_muestreo_fk) return a.punto_muestreo_fk - b.punto_muestreo_fk
      return new Date(a.fecha) - new Date(b.fecha)
    })

    let prevZonaId = Symbol('init')
    ordenadas.forEach(a => {
      const zona = getZonaInfoFromAnalitica(a)
      if (zona.id !== prevZonaId) {
        const headerRow = new Array(headers.length).fill('')
        headerRow[0] = `◆ ${zona.name || 'Sin zona'}`
        excelData.push(headerRow)
        groupMerges.push({
          s: { r: excelData.length - 1, c: 0 },
          e: { r: excelData.length - 1, c: lastColIndex }
        })
        prevZonaId = zona.id
      }
      excelData.push(buildExcelRow(a))
    })
  } else {
    analiticas.forEach(a => excelData.push(buildExcelRow(a)))
  }

  // Crear libro de trabajo y hoja
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(excelData);

  // Configurar anchos de columna
  const colWidths = [
    { wch: 12 },  // Fecha
    { wch: 30 },  // Punto de Muestreo
    { wch: 28 },  // Zona de Abastecimiento
    { wch: 20 },  // Operario
    { wch: 15 },  // Código SINAC
    { wch: 15 },  // Cloro
    { wch: 10 },  // pH
    { wch: 15 },  // Turbidez
    { wch: 15 },  // Olor
    { wch: 15 },  // Sabor
    { wch: 15 }   // Color
  ]
  if (hasCatalunaExcel) {
    colWidths.push({ wch: 15 }, { wch: 15 })
  }
  colWidths.push(
    { wch: 16 },  // Totalizador
    { wch: 14 },  // Volumen
    { wch: 16 },  // Consumo m³/día
    { wch: 40 }   // Observaciones
  )
  ws['!cols'] = colWidths

  // Aplicar estilos a las celdas de título y encabezado
  const range = XLSX.utils.decode_range(ws['!ref']);

  // Estilo para el título (primera fila)
  if (ws['A1']) {
    ws['A1'].s = {
      font: { bold: true, sz: 14, color: { rgb: '00447C' } },
      alignment: { horizontal: 'center' }
    };
  }

  // Estilo para el subtítulo (segunda fila)
  if (ws['A2']) {
    ws['A2'].s = {
      font: { bold: true, sz: 12 },
      alignment: { horizontal: 'center' }
    };
  }

  // Estilo para los encabezados (cuarta fila - índice 3)
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 3, c: col });
    if (ws[cellAddress]) {
      ws[cellAddress].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '00447C' } },
        alignment: { horizontal: 'center' }
      };
    }
  }

  // Combinar celdas del título/subtítulo (a lo ancho de todas las columnas) y de
  // las filas de cabecera de cada zona cuando se agrupa.
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastColIndex } }, // Título
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastColIndex } }, // Subtítulo
    ...groupMerges
  ];

  // Agregar la hoja al libro
  XLSX.utils.book_append_sheet(wb, ws, 'Analíticas');

  // Generar nombre de archivo
  const nombreZona = selectedZona.value ? `_${getZonaNombre(selectedZona.value).replace(/\s+/g, '_')}` : '';
  const fileName = `Informe_Analiticas_AQLARA${nombreZona}_${formatDateForDisplay(minDate).replace(/\//g, '-')}_${formatDateForDisplay(maxDate).replace(/\//g, '-')}.xlsx`;

  // Descargar el archivo
  XLSX.writeFile(wb, fileName);
  } finally {
    exporting.value = false
  }
};

// const handlePrintHTML = () => {
//   const exportData = getAnaliticasParaExportar();
//   if (!exportData) return;
//   const { analiticas, minDate, maxDate } = exportData;

//   let htmlContent = `
//     <html>
//       <head>
//         <title>${fileNameBase.value} - ${companyName.value}</title>
//         <style>
//           body { font-family: Arial, sans-serif; margin: 20px; }
//           .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #00447C;}
//           .logo-container { flex-shrink: 0; }
//           .logo { max-height: 60px; }
//           .header-text { text-align: right; flex-grow: 1;}
//           .company-name-html { font-size: 20px; font-weight: bold; color: #00447C; margin-bottom: 5px;}
//           .report-title-html { font-size: 16px; }
//           table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10px; }
//           th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
//           th { background-color: #00447C; color: white; }
//           @media print {
//             body { margin: 0.5cm; }
//             .no-print { display: none; }
//             .page-header { justify-content: flex-start; }
//             .header-text { text-align: center; margin-left: 20px; }
//           }
//         </style>
//       </head>
//       <body>
//         <div class="page-header">
//           <div class="logo-container">
//             ${logoUrl.value ? `<img src="${logoUrl.value}" alt="Logo" class="logo"/>` : ''}
//           </div>
//           <div class="header-text">
//             <div class="company-name-html">${companyName.value}</div>
//             <div class="report-title-html">Informe de Analíticas (${formatDateForDisplay(minDate)} - ${formatDateForDisplay(maxDate)})</div>
//           </div>
//         </div>
//         <table>
//           <thead>
//             <tr>
//               <th>Fecha</th>
//               <th>Punto de Muestreo</th>
//               <th>Código SINAC</th>
//               <th>Cloro (mg/l)</th>
//               <th>pH</th>
//               <th>Turbidez (NTU)</th>
//               <th>Olor</th>
//               <th>Sabor</th>
//               <th>Color</th>
//             </tr>
//           </thead>
//           <tbody>
//   `;

//   analiticas.forEach(a => {
//     htmlContent += `
//             <tr>
//               <td>${formatDateForDisplay(a.fecha)}</td>
//               <td>${getPuntoMuestreoNombre(a.punto_muestreo_fk)}</td>
//               <td>${a.punto_muestreo_fk}</td>
//               <td>${a.cloro !== null && a.cloro !== undefined ? a.cloro : ''}</td>
//               <td>${a.ph !== null && a.ph !== undefined ? a.ph : ''}</td>
//               <td>${a.turbidez !== null && a.turbidez !== undefined ? a.turbidez : ''}</td>
//               <td>${formatOrganoleptico(a.olor)}</td>
//               <td>${formatOrganoleptico(a.sabor)}</td>
//               <td>${formatOrganoleptico(a.color)}</td>
//             </tr>
//     `;
//   });

//   htmlContent += `
//           </tbody>
//         </table>
//         <button class="no-print" onclick="window.print()" style="margin-top: 20px;">Imprimir</button>
//       </body>
//     </html>
//   `;

//   const printWindow = window.open('', '_blank');
//   printWindow.document.open();
//   printWindow.document.write(htmlContent);
//   printWindow.document.close();
// };

</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <label
      class="inline-flex items-center gap-1.5 px-2 text-sm font-medium text-gray-600 dark:text-gray-300 cursor-pointer select-none"
      title="Agrupa las filas por zona de abastecimiento en el Excel y abre el informe de impresión ya agrupado"
    >
      <input v-model="groupByZona" type="checkbox" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
      Agrupar por zona
    </label>

    <button
      v-if="props.enableHtmlPrint"
      class="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-slate-500 to-slate-700 shadow-md shadow-slate-300/50 dark:shadow-slate-900/40 transition-all duration-200 hover:from-slate-600 hover:to-slate-800 hover:-translate-y-0.5 hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-md"
      :disabled="selectedRows.length === 0 || exporting"
      @click="handlePrintHTML"
    >
      <BaseIcon :path="exporting ? mdiLoading : mdiPrinter" size="16" :class="{ 'animate-spin': exporting }" />
      <span>{{ exporting ? 'Exportando...' : 'Imprimir' }}</span>
    </button>

    <button
      class="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-600 shadow-md shadow-green-300/50 dark:shadow-green-900/40 transition-all duration-200 hover:from-green-600 hover:to-emerald-700 hover:-translate-y-0.5 hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-md"
      :disabled="selectedRows.length === 0 || exporting"
      @click="handleExportExcel"
    >
      <BaseIcon :path="exporting ? mdiLoading : mdiFileExcel" size="16" :class="{ 'animate-spin': exporting }" />
      <span>{{ exporting ? 'Exportando...' : 'Excel' }}</span>
    </button>
  </div>
</template>