import {
  mdiWaterCircle,
} from '@mdi/js'

export default [
  {
    label: 'SinAQ',
    icon: mdiWaterCircle,
    menu: [
      {
        label: 'Excel uploader',
        to: '/sinaq',
        blockedFor: [1, '1', 10, '10']
      },
      {
        label: 'Formulario Analítica',
        to: {name: "forms"},
        blockedFor: [10, '10']
        // icon: mdiSquareEditOutline
      },
      {
        label: 'Analíticas',
        to: { name: "tablaAnaliticas" },
        // maxRole: 1,
        // minRole: 90
        // icon: mdiSquareEditOutline
      },
      {
        label: 'Mapa',
        to: {name: "mapa"},
      },
      // {
      //   label: 'Video',
      //   to: { name: "video" },
      // },
      // {
      //   label: 'Prime Table Example',
      //   to: {name: "prime-table"},
      //   icon: mdiSquareEditOutline
      // }
    ]
  },
  // {
  //   label: 'Panel de control',
  //   to: {name:'settings'},
  //   icon: mdiCog,
  // }
]
