import{k as I,c as T,w as te,o as _,y as O,f as t,e as r,h as a,Q as v,p as g,u as ae,a5 as he,$ as De,d as L,z as f,B as se,b as P,D as G,A as c,F as B,C as ne,R as xe,S as Ve,n as k,a1 as S,G as Me,H as Se,m as re,I as ke,at as $e,au as we,af as Ue,O as Fe,P as Be,av as Pe,aw as ze,ax as Ge,_ as He,i as je}from"./index-72c1ed64.js";import{u as Ze}from"./useFormSelectData-52f7ab35.js";import{d as We,b as H}from"./index-0e6eac59.js";const Xe={key:0},qe={key:0},Je={class:"border border-gray-300 p-4 rounded-md mb-6 flex flex-col items-center"},Ke={class:"grid grid-cols-1 md:grid-cols-3 gap-4"},Qe={class:"grid grid-cols-1 md:grid-cols-3 gap-4 mt-6"},Ye={class:"grid grid-cols-2 justify-between mt-6"},j=0,el=1,ll={__name:"AnaliticsEdit",props:{analitic:{type:Object,required:!0}},emits:["update"],setup(h,{emit:E}){const m=h,d=E,s=I({...m.analitic}),p=T({get:()=>+s.value.olor===j,set:A=>{s.value.olor=A?j:el}}),C=T({get:()=>+s.value.color===j,set:A=>s.value.color=A?0:1}),b=T({get:()=>+s.value.sabor==0,set:A=>s.value.sabor=A?0:1});return te(()=>m.analitic,A=>{s.value={...A}},{immediate:!0}),te(s,A=>{d("update",A)},{deep:!0}),(A,n)=>s.value.type?(_(),O("div",Xe,[s.value.type===29?(_(),O("div",qe,[n[8]||(n[8]=t("h2",{class:"font-bold text-xl mb-3 mt-3 text-gray-600 flex justify-center"}," Caracteristicas Organolépticas ",-1)),t("div",Je,[t("div",Ke,[r(a(v),{modelValue:p.value,"onUpdate:modelValue":n[0]||(n[0]=i=>p.value=i),type:"checkbox",label:"Olor",help:"Marca si el agua tiene mal olor",name:"olor","validation-visibility":"dirty"},null,8,["modelValue"]),r(a(v),{modelValue:C.value,"onUpdate:modelValue":n[1]||(n[1]=i=>C.value=i),type:"checkbox",label:"Color",help:"Marca si el agua tiene mal color",name:"color","validation-visibility":"dirty"},null,8,["modelValue"]),r(a(v),{modelValue:b.value,"onUpdate:modelValue":n[2]||(n[2]=i=>b.value=i),type:"checkbox",label:"Sabor",help:"Marca si el agua tiene mal sabor",name:"sabor","validation-visibility":"dirty"},null,8,["modelValue"])])])])):g("",!0),t("div",Qe,[r(a(v),{modelValue:s.value.cloro,"onUpdate:modelValue":n[3]||(n[3]=i=>s.value.cloro=i),modelModifiers:{number:!0},type:"number",placeholder:"Cloro Residual",label:"Cloro Residual",help:"mg/l",validation:"number|min:0|max:99","validation-messages":{number:"Introduce un número",min:"El valor mínimo es 0",max:"El valor máximo es 99"}},null,8,["modelValue"]),r(a(v),{modelValue:s.value.ph,"onUpdate:modelValue":n[4]||(n[4]=i=>s.value.ph=i),type:"number",placeholder:"pH",label:"pH",help:"ud",validation:"number|min:0|max:14","validation-messages":{number:"Introduce un número",min:"El valor mínimo es 0",max:"El valor máximo es 14"}},null,8,["modelValue"]),r(a(v),{modelValue:s.value.turbidez,"onUpdate:modelValue":n[5]||(n[5]=i=>s.value.turbidez=i),modelModifiers:{number:!0},type:"number",placeholder:"Turbidez",label:"Turbidez",help:"UNF",validation:"number|min:0|max:999","validation-messages":{number:"Introduce un número",min:"El valor mínimo es 0",max:"El valor máximo es 999"}},null,8,["modelValue"])]),t("div",Ye,[r(a(v),{modelValue:s.value.observaciones,"onUpdate:modelValue":n[6]||(n[6]=i=>s.value.observaciones=i),label:"Observaciones",type:"textarea",placeholder:"Introduce cualquier tipo de incidencia","inner-class":"w-full","wrapper-class":"w-full"},null,8,["modelValue"]),r(a(v),{modelValue:s.value.registro,"onUpdate:modelValue":n[7]||(n[7]=i=>s.value.registro=i),label:"Registro",disabled:"",type:"textarea",placeholder:"Introduce cualquier tipo de incidencia","inner-class":"w-full","wrapper-class":"w-full"},null,8,["modelValue"])])])):g("",!0)}},ol={class:"grid grid-cols-1 md:grid-cols-3 gap-4"},tl={class:"grid grid-cols-1 md:grid-cols-4 gap-4"},al={key:0,class:"text-center"},sl={key:0},nl={key:0},rl={key:0},ul={key:0},il={class:"text-center"},dl={"data-label":"Fecha"},cl={"data-label":"Punto de Muestreo"},ml={"data-label":"Persona"},pl={"data-label":"Tipo Analítica",class:"lg:w-32"},Al={colspan:"5",class:"lg:w-1"},_l={class:"flex justify-center gap-40"},vl={class:"text-gray-600"},fl={class:"text-gray-600"},Il={class:"text-gray-600"},Ol={key:0},El={class:"text-gray-600"},bl={class:"text-gray-600"},gl={class:"text-gray-600"},Tl={class:"ml-4"},Cl={class:"before:hidden lg:w-1 whitespace-nowrap"},Nl={class:"p-3 lg:px-6 border-t border-gray-100 dark:border-slate-800"},Z=1,Ll={__name:"AnaliticsTable",props:{checkable:Boolean},setup(h,{expose:E}){const m=I([]),d=ae(),s=he(),p={min:0,max:4},C={min:6.5,max:9.5},b={min:.4,max:1},A=I(null),n=I(null),i=I(""),R=I("asc"),{form:u,selectZona:W,selectPuntosMuestra:ue,selectInfraestructura:ie,selectUO:X,operarioPorZona:de,resetForm:q}=Ze();E({resetForm:q,checkedRows:m});const z=I(!1),D=I([]),ce=o=>{D.value.includes(o)?D.value=D.value.filter(l=>l!==o):D.value.push(o)},y=ae(),me=T(()=>y.getAnaliticas),x=I(null),w=I(!1),$=I(!1),pe=I(20),U=I(0),Ae=T(()=>{if(s.userRole===99)return null;const o=y.getOperarios.find(l=>l.email?.toLowerCase()===s.userEmail?.toLowerCase());return o?o.zonas||[]:null}),J=o=>{const l=y.getPuntosMuestreo.find(e=>e.id===o.punto_muestreo_fk);return l?l.zona_fk:null},V=T(()=>d.getAnaliticas.filter(o=>{const l=s.userRole===99||Ae.value.some(N=>N===J(o));console.log("ZONAFILTER: ",l,"ANALITICA: ",o),console.log("ZonaFilter: ",l);const e=!z.value||le(o);return l&&e&&(!u.fecha_inicio||o.fecha>=u.fecha_inicio)&&(!u.fecha_final||o.fecha<=u.fecha_final)&&(!u.punto_muestreo_fk||o.punto_muestreo_fk===u.punto_muestreo_fk)&&(!u.persona||o.personal_fk===u.persona)&&(!u.zona||J(o)===u.zona)&&(!u.operario||o.personal_fk===u.operario)&&(!u.infraestructura||o.infraestructura_id===u.infraestructura)&&(!u.type||o.type===u.type)})),_e=T(()=>{const o=V.value;return i.value?[...o].sort((l,e)=>{const N=l[i.value],oe=e[i.value];return R.value==="asc"?N>oe?1:-1:N<oe?1:-1}):o}),F=o=>{i.value===o?R.value=R.value==="asc"?"desc":"asc":(i.value=o,R.value="asc")},K=T(()=>Math.ceil(me.value.length/pe.value)),ve=T(()=>U.value+1),fe=T(()=>{const o=[];for(let l=0;l<K.value;l++)o.push(l);return o}),Ie=o=>{const l=y.getOperarios.find(e=>e.id===o);return l?l.name:"No asignado"},Oe=o=>{const l=y.getPuntosMuestreo.find(e=>e.id===o);return l?l.name:"No asignado"},Ee=o=>{switch(o){case 28:return"Operacional";case 29:return"Rutina";case 99:return"Seguimiento";default:return"Desconocido"}},be=T(()=>V.value.length>0&&V.value.every(o=>m.value.some(l=>l.id===o.id))),Q=o=>o.cloro===null||o.cloro===void 0?!1:o.cloro<b.min||o.cloro>b.max,Y=o=>o.ph===null||o.ph===void 0?!1:o.ph<C.min||o.ph>C.max,ee=o=>o.turbidez===null||o.turbidez===void 0?!1:o.turbidez<p.min||o.turbidez>p.max,M=o=>o==null?!1:+o==0,le=o=>{if(Q(o)||Y(o)||ee(o)||M(o.olor)||M(o.color)||M(o.sabor))return!0},ge=o=>{o?V.value.forEach(l=>{m.value.some(e=>e.id===l.id)||m.value.push(l)}):m.value=m.value.filter(l=>!V.value.some(e=>e.id===l.id))},Te=(o,l)=>{l?m.value.some(e=>e.id===o.id)||m.value.push(o):m.value=m.value.filter(e=>e.id!==o.id)},Ce=async()=>{try{await $e(A.value.id),await y.loadAnaliticas(),w.value=!1,A.value=null}catch(o){console.error("Error al eliminar:",o),alert("Error al eliminar la analítica")}},Ne=async()=>{try{if(!x.value)throw new Error("No hay analítica para actualizar");await we(x.value.id,x.value),await y.loadAnaliticas(),$.value=!1,n.value=null,x.value=null}catch(o){console.error("Error al eliminar:",o),alert("Error al actualizar la analítica")}},Le=()=>{$.value=!1,n.value=null,x.value=null},Re=async o=>{A.value=o,w.value=!0},ye=async o=>{n.value=JSON.parse(JSON.stringify(o));const e=`${new Date().toLocaleDateString()} - Modificado por: ${s.userName}
${n.value.observaciones}`;n.value.registro?n.value.registro=`${e}
${n.value.registro}`:n.value.registro=e,await Ue(),$.value=!0};return De(()=>{q()}),(o,l)=>(_(),O(B,null,[r(se,{modelValue:w.value,"onUpdate:modelValue":l[0]||(l[0]=e=>w.value=e),title:"Desea Borrar la Analítica?",button:"danger","has-cancel":"",onConfirm:Ce},{default:L(()=>l[15]||(l[15]=[t("p",null,[f("Si confirma la analitica se borrara "),t("b",null,"definitivamente")],-1),t("p",null,"Esta seguro de ejecutar esta acción?",-1)])),_:1},8,["modelValue"]),r(se,{modelValue:$.value,"onUpdate:modelValue":l[2]||(l[2]=e=>$.value=e),title:"Actualizar analítica","has-cancel":"",onConfirm:Ne,onCancel:Le},{default:L(()=>[n.value?(_(),P(ll,{key:0,analitic:n.value,onUpdate:l[1]||(l[1]=e=>x.value=e)},null,8,["analitic"])):g("",!0),l[16]||(l[16]=t("p",{class:"text-red-600 font-bold"},"ATENCIÓN:",-1)),l[17]||(l[17]=t("p",null,[f(" La modificacion de esta analítica será "),t("b",null,"definitiva"),f(" y se realizará bajo su propia responsabilidad ")],-1))]),_:1},8,["modelValue"]),t("div",ol,[r(a(v),{modelValue:a(u).fecha_inicio,"onUpdate:modelValue":l[3]||(l[3]=e=>a(u).fecha_inicio=e),type:"date",options:a(X),placeholder:"Fecha Inicio",label:"Fecha Inicio"},null,8,["modelValue","options"]),r(a(v),{modelValue:a(u).fecha_final,"onUpdate:modelValue":l[4]||(l[4]=e=>a(u).fecha_final=e),type:"date",options:a(W),placeholder:"Fecha Final",label:"Fecha Final"},null,8,["modelValue","options"]),r(a(v),{modelValue:a(u).uo,"onUpdate:modelValue":l[5]||(l[5]=e=>a(u).uo=e),type:"select",options:a(X),placeholder:"Unidad Operativa",label:"Unidad Operativa"},null,8,["modelValue","options"])]),t("div",tl,[r(a(v),{modelValue:a(u).zona,"onUpdate:modelValue":l[6]||(l[6]=e=>a(u).zona=e),type:"select",options:a(W),placeholder:"Zona de Muestra",label:"Zona"},null,8,["modelValue","options"]),r(a(v),{modelValue:a(u).infraestructura,"onUpdate:modelValue":l[7]||(l[7]=e=>a(u).infraestructura=e),type:"select",options:a(ie),placeholder:"Infraestructura",label:"Infraestructura"},null,8,["modelValue","options"]),r(a(v),{modelValue:a(u).punto_muestreo_fk,"onUpdate:modelValue":l[8]||(l[8]=e=>a(u).punto_muestreo_fk=e),type:"select",options:a(ue),placeholder:"Punto de muestra",label:"Punto de Muestra"},null,8,["modelValue","options"]),r(a(v),{modelValue:a(u).operario,"onUpdate:modelValue":l[9]||(l[9]=e=>a(u).operario=e),modelModifiers:{number:!0},type:"select",options:a(de),placeholder:"Operario",label:"Operario"},null,8,["modelValue","options"])]),t("table",null,[t("thead",null,[t("tr",null,[h.checkable?(_(),O("th",al,[r(G,{"model-value":be.value,"onUpdate:modelValue":ge},null,8,["model-value"])])):g("",!0),t("th",{class:"cursor-pointer",onClick:l[10]||(l[10]=e=>F("fecha"))},[l[18]||(l[18]=f("Fecha ")),i.value==="fecha"?(_(),O("span",sl,c(R.value==="asc"?"↑":"↓"),1)):g("",!0)]),t("th",{class:"cursor-pointer",onClick:l[11]||(l[11]=e=>F("punto_muestreo_fk"))},[l[19]||(l[19]=f("Punto Muestreo ")),i.value==="punto_muestreo_fk"?(_(),O("span",nl,c(R.value==="asc"?"↑":"↓"),1)):g("",!0)]),t("th",{class:"cursor-pointer",onClick:l[12]||(l[12]=e=>F("personal_fk"))},[l[20]||(l[20]=f("Operario")),i.value==="personal_fk"?(_(),O("span",rl,c(R.value==="asc"?"↑":"↓"),1)):g("",!0)]),t("th",{class:"cursor-pointer",onClick:l[13]||(l[13]=e=>F("type"))},[l[21]||(l[21]=f("Tipo")),i.value==="type"?(_(),O("span",ul,c(R.value==="asc"?"↑":"↓"),1)):g("",!0)]),t("th",il,[r(G,{"model-value":z.value,label:"Solo valores incorrectos","onUpdate:modelValue":l[14]||(l[14]=e=>z.value=e)},null,8,["model-value"])])])]),t("tbody",null,[(_(!0),O(B,null,ne(_e.value,e=>(_(),O(B,{key:e.id},[t("tr",null,[h.checkable?(_(),P(G,{key:0,"model-value":m.value.includes(e),"onUpdate:modelValue":N=>Te(e,N)},null,8,["model-value","onUpdate:modelValue"])):g("",!0),t("td",dl,c(e.fecha),1),t("td",cl,c(Oe(e.punto_muestreo_fk)),1),t("td",ml,c(Ie(e.personal_fk)),1),t("td",pl,c(Ee(e.type)),1),t("td",null,[r(k,{icon:D.value.includes(e.id)?a(xe):a(Ve),color:le(e)?"danger":"info",onClick:N=>ce(e.id)},null,8,["icon","color","onClick"])])]),D.value.includes(e.id)?(_(),O("tr",{key:`expanded-${e.id}`},[t("td",Al,[l[23]||(l[23]=t("p",null,[t("strong",null,"Información adicional:")],-1)),t("div",_l,[t("div",null,[t("li",vl,[t("span",{class:S(["font-semibold text-lg text-gray-700",{"text-red-500 underline":Q(e)}])},"Cloro:",2),f(" "+c(e.cloro?e.cloro+" mg/l":"Sin muestra"),1)]),t("li",fl,[t("span",{class:S(["font-semibold text-lg text-gray-700",{"text-red-500 underline":Y(e)}])},"pH:",2),f(" "+c(e.ph?e.ph+" ud":"Sin Muestra"),1)]),t("li",Il,[t("span",{class:S(["font-semibold text-lg text-gray-700",{"text-red-500 underline":ee(e)}])},"Turbidez:",2),f(" "+c(e.turbidez?e.turbidez+" UNT":"Sin Muestra"),1)])]),e.type===29?(_(),O("div",Ol,[t("li",El,[t("span",{class:S(["font-semibold text-lg text-gray-700",{"text-red-500 underline":M(e.olor)}])},"Olor:",2),f(" "+c(e.olor===Z?"Correcto":"Incorrecto"),1)]),t("li",bl,[t("span",{class:S(["font-semibold text-lg text-gray-700",{"text-red-500 underline":M(e.color)}])},"Color:",2),f(" "+c(e.color===Z?"Correcto":"Incorrecto"),1)]),t("li",gl,[t("span",{class:S(["font-semibold text-lg text-gray-700",{"text-red-500 underline":M(e.sabor)}])},"Sabor:",2),f(" "+c(e.sabor===Z?"Correcto":"Incorrecto"),1)])])):g("",!0)]),t("li",Tl,[l[22]||(l[22]=t("span",{class:"text-gray-800 font-semibold"},"Observaciones: ",-1)),f(" "+c(e.observaciones),1)])]),t("td",Cl,[r(re,null,{default:L(()=>[r(k,{color:"info",icon:a(Me),small:"",onClick:N=>ye(e)},null,8,["icon","onClick"]),r(k,{color:"danger",icon:a(Se),small:"",onClick:N=>Re(e)},null,8,["icon","onClick"])]),_:2},1024)])])):g("",!0)],64))),128))])]),t("div",Nl,[r(ke,null,{default:L(()=>[r(re,null,{default:L(()=>[(_(!0),O(B,null,ne(fe.value,e=>(_(),P(k,{key:e,active:e===U.value,label:e+1,color:e===U.value?"lightDark":"whiteDark",small:"",onClick:N=>U.value=e},null,8,["active","label","color","onClick"]))),128))]),_:1}),t("small",null,"Total Analíticas "+c(V.value.length),1),t("small",null,"Page "+c(ve.value)+" of "+c(K.value),1)]),_:1})])],64))}};function Rl(){return{exportXMLData:E=>`<?xml version="1.0" encoding="UTF-8"?>
<BOLETINES_GENERAL xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="Boletines.xsd">
${E.map(d=>{const s=[],p="ANAL001",C="4053",b=We(d.fecha);return d.cloro!==null&&s.push(`
            <DETERMINACION_BOLETIN>
              <COD_PARAMETRO>045</COD_PARAMETRO>
              <ID_MET_ANALISIS>50680</ID_MET_ANALISIS>
              <VALOR_CUANTIF>${H(d.cloro)}</VALOR_CUANTIF>
              <COD_ANALISTA>${p}</COD_ANALISTA>
            </DETERMINACION_BOLETIN>
          `),d.ph!==null&&s.push(`
            <DETERMINACION_BOLETIN>
              <COD_PARAMETRO>051</COD_PARAMETRO>
              <ID_MET_ANALISIS>50678</ID_MET_ANALISIS>
              <VALOR_CUANTIF>${H(d.ph)}</VALOR_CUANTIF>
              <COD_ANALISTA>${p}</COD_ANALISTA>
            </DETERMINACION_BOLETIN>
          `),d.turbidez!==null&&s.push(`
            <DETERMINACION_BOLETIN>
              <COD_PARAMETRO>054</COD_PARAMETRO>
              <ID_MET_ANALISIS>50679</ID_MET_ANALISIS>
              <VALOR_CUANTIF>${H(d.turbidez)}</VALOR_CUANTIF>
              <COD_ANALISTA>${p}</COD_ANALISTA>
            </DETERMINACION_BOLETIN>
          `),d.olor&&s.push(`
            <DETERMINACION_BOLETIN>
              <COD_PARAMETRO>057</COD_PARAMETRO>
              <ID_MET_ANALISIS>50960</ID_MET_ANALISIS>
              <VALOR_CUALIF>${d.olor}</VALOR_CUALIF>
              <COD_ANALISTA>${p}</COD_ANALISTA>
            </DETERMINACION_BOLETIN>
          `),d.color&&s.push(`
            <DETERMINACION_BOLETIN>
              <COD_PARAMETRO>056</COD_PARAMETRO>
              <ID_MET_ANALISIS>50962</ID_MET_ANALISIS>
              <VALOR_CUALIF>${d.color}</VALOR_CUALIF>
              <COD_ANALISTA>${p}</COD_ANALISTA>
            </DETERMINACION_BOLETIN>
          `),d.sabor&&s.push(`
            <DETERMINACION_BOLETIN>
              <COD_PARAMETRO>058</COD_PARAMETRO>
              <ID_MET_ANALISIS>50961</ID_MET_ANALISIS>
              <VALOR_CUALIF>${d.sabor}</VALOR_CUALIF>
              <COD_ANALISTA>${p}</COD_ANALISTA>
            </DETERMINACION_BOLETIN>
          `),`<!-- BOLETIN_GENERAL para el ${d.fecha} -->
          <BOLETIN_GENERAL>
            <ID_TIPO_ANALISIS>${d.type}</ID_TIPO_ANALISIS>
            <ID_PM>${d.punto_muestreo_fk}</ID_PM>
            <FECHA_TOMA>${b}</FECHA_TOMA>          
            <BOLETINES>
              <BOLETIN>
                <FECHA_LLEGADA_LAB>${b}</FECHA_LLEGADA_LAB>
                <ID_LABORATORIO>${C}</ID_LABORATORIO>
                <COD_MUESTRA_LAB>M${d.punto_muestreo_fk}${d.fecha.replace(/[^0-9]/g,"")}</COD_MUESTRA_LAB>
                <FECHA_INFORME>${b}</FECHA_INFORME>
                <DETERMINACIONES>
                  ${s.join(`
`)}
                </DETERMINACIONES>
              </BOLETIN>
            </BOLETINES>
          </BOLETIN_GENERAL>
        `}).join(`
`)}
</BOLETINES_GENERAL>`}}const yl={class:"flex gap-2"},Vl={__name:"AnaliticsTableView",emits:["clean-filters"],setup(h){const E=I(),{exportXMLData:m}=Rl(),d=()=>{E.value?.resetForm()},s=()=>{console.log("TablaAnaliticas:",E.value),console.log("CheckedRows:",E.value?.checkedRows);const p=(E.value?.checkedRows||[]).filter(i=>i.type===28||i.type===29);if(console.log("Analíticas seleccionadas:",p),p.length===0){alert("Por favor, seleccione al menos una analítica");return}const C=m(p),b=new Blob([C],{type:"application/xml"}),A=window.URL.createObjectURL(b),n=document.createElement("a");n.href=A,n.setAttribute("download",`analiticas_${new Date().toISOString().split("T")[0]}.xml`),document.body.appendChild(n),n.click(),document.body.removeChild(n),window.URL.revokeObjectURL(A)};return(p,C)=>(_(),P(Fe,null,{default:L(()=>[r(je,null,{default:L(()=>[r(Be,{icon:a(Pe),title:"Analíticas",main:""},{default:L(()=>[t("div",yl,[r(k,{target:"_blank",icon:a(ze),label:"Download XML",color:"info","rounded-full":"",small:"",onClick:s},null,8,["icon"]),r(k,{target:"_blank",icon:a(Ge),label:"Limpiar filtros",color:"contrast","rounded-full":"",small:"",onClick:d},null,8,["icon"])])]),_:1},8,["icon"]),r(He,{class:"mb-6","has-table":""},{default:L(()=>[r(Ll,{ref_key:"tablaAnaliticas",ref:E,checkable:""},null,512)]),_:1})]),_:1})]),_:1}))}};export{Vl as default};
