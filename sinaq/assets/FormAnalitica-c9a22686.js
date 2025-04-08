import{u as F,a5 as q,c,$ as w,w as A,a as C,o as m,y as p,e as r,d as V,f as s,h as o,p as b,_ as I,j as B}from"./index-72c1ed64.js";import{u as Z}from"./useFormSelectData-52f7ab35.js";const D={class:"grid grid-cols-1 md:grid-cols-3 gap-4"},H={key:0,class:"grid grid-cols-1 md:grid-cols-4 gap-4"},L={class:"grid grid-cols-1 md:grid-cols-3 gap-4"},R={key:1},T={key:0},j={class:"border border-gray-300 p-4 rounded-md mb-6 flex flex-col items-center"},K={class:"grid grid-cols-1 md:grid-cols-3 gap-4"},$={class:"grid grid-cols-1 md:grid-cols-3 gap-4 mt-6"},Q={__name:"FormAnalitica",props:{initialPosition:{type:Number,default:null}},emits:["closeModal"],setup(x,{emit:_}){const v=F(),n=q(),u=x,h=_,{form:e,selectZona:k,selectPuntosMuestra:U,selectInfraestructura:E,selectUO:z,operarioPorZona:M,findOperarioByUser:P,operarioLogueado:d}=Z(),N=()=>{e.punto_muestreo_fk="",e.fecha="",e.color=1,e.olor=1,e.sabor=1,e.cloro="",e.type="",e.observaciones="",e.operario="",e.ph="",e.turbidez="",e.zona="",e.infraestructura="",e.uo="",e.type=""},f=c({get:()=>e.olor===0,set:i=>e.olor=i?0:1}),y=c({get:()=>e.color===0,set:i=>e.color=i?0:1}),g=c({get:()=>e.sabor===0,set:i=>e.sabor=i?0:1}),O=()=>{e.operario=n.isAuthenticated?d.value?.id:null,e.uo=n.isAuthenticated?d.value?.ud_operativa_fk:null},S=async()=>{try{const{data:i,error:l}=await B.from("analiticas").insert([{punto_muestreo_fk:e.punto_muestreo_fk,fecha:e.fecha,color:e.color?Number(e.color):null,olor:e.olor,sabor:e.sabor,cloro:e.cloro?Number(e.cloro):null,type:e.type,observaciones:e.observaciones,personal_fk:e.operario,ph:e.ph?Number(e.ph):null,turbidez:e.turbidez?Number(e.turbidez):null,zona_fk:e.zona}]);l?(console.error("Error al insertar datos:",l),alert("Error al insertar datos: "+l.message)):(v.loadAnaliticas(),console.log("Datos insertados:",i),N(),h("closeModal"),alert("Datos insertados correctamente"))}catch(i){console.error("Error en la solicitud:",i),alert("Error en la solicitud: "+i.message)}finally{O()}};return w(async()=>{await v.loadOperarios(),P(n.userEmail),e.operario=n.isAuthenticated?d.value?.id:null,e.uo=n.isAuthenticated?d.value?.ud_operativa_fk:null,u.initialPosition&&(e.punto_muestreo_fk=u.initialPosition,console.log("Punto de muestreo:",u.initialPosition))}),A(()=>u.initialPosition,async i=>{i&&(e.punto_muestreo_fk=i)},{immediate:!0}),(i,l)=>{const t=C("FormKit");return m(),p("div",null,[r(I,null,{default:V(()=>[r(t,{type:"form","submit-label":"Enviar",onSubmit:S},{default:V(()=>[s("div",D,[r(t,{modelValue:o(e).operario,"onUpdate:modelValue":l[0]||(l[0]=a=>o(e).operario=a),modelModifiers:{number:!0},type:"select",options:o(M),placeholder:"Operario",disabled:"loginStore.userLogged?true:false"},null,8,["modelValue","options"]),r(t,{modelValue:o(e).fecha,"onUpdate:modelValue":l[1]||(l[1]=a=>o(e).fecha=a),type:"date",placeholder:"Fecha de la toma de la muestra"},null,8,["modelValue"])]),u.initialPosition?b("",!0):(m(),p("div",H,[r(t,{modelValue:o(e).uo,"onUpdate:modelValue":l[2]||(l[2]=a=>o(e).uo=a),type:"select",options:o(z),placeholder:"Unidad Operativa",label:"Unidad Operativa"},null,8,["modelValue","options"]),r(t,{modelValue:o(e).zona,"onUpdate:modelValue":l[3]||(l[3]=a=>o(e).zona=a),type:"select",options:o(e).uo?o(k):[],placeholder:"Zona de Muestra",label:"Zona"},null,8,["modelValue","options"]),r(t,{modelValue:o(e).infraestructura,"onUpdate:modelValue":l[4]||(l[4]=a=>o(e).infraestructura=a),type:"select",options:o(e).zona?o(E):[],placeholder:"Infraestructura",label:"Infraestructura"},null,8,["modelValue","options"]),r(t,{modelValue:o(e).punto_muestreo_fk,"onUpdate:modelValue":l[5]||(l[5]=a=>o(e).punto_muestreo_fk=a),type:"select",options:o(U),placeholder:"Punto de muestra",label:"Punto de Muestra"},null,8,["modelValue","options"])])),s("div",L,[r(t,{modelValue:o(e).type,"onUpdate:modelValue":l[6]||(l[6]=a=>o(e).type=a),modelModifiers:{number:!0},type:"radio",options:{29:"Rutina",28:"Operacional",99:"Seguimiento"},label:"Tipo de Analítica"},null,8,["modelValue"])]),o(e).type?(m(),p("div",R,[o(e).type===29?(m(),p("div",T,[l[14]||(l[14]=s("h2",{class:"font-bold text-xl mb-3 mt-3 text-gray-600 flex justify-center"}," Caracteristicas Organolépticas ",-1)),s("div",j,[s("div",K,[r(t,{modelValue:f.value,"onUpdate:modelValue":l[7]||(l[7]=a=>f.value=a),type:"checkbox",label:"Olor",help:"Marca si el agua tiene mal olor",name:"olor","validation-visibility":"dirty"},null,8,["modelValue"]),r(t,{modelValue:y.value,"onUpdate:modelValue":l[8]||(l[8]=a=>y.value=a),type:"checkbox",label:"Color",help:"Marca si el agua tiene mal color",name:"color","validation-visibility":"dirty"},null,8,["modelValue"]),r(t,{modelValue:g.value,"onUpdate:modelValue":l[9]||(l[9]=a=>g.value=a),type:"checkbox",label:"Sabor",help:"Marca si el agua tiene mal sabor",name:"sabor","validation-visibility":"dirty"},null,8,["modelValue"])])])])):b("",!0),s("div",$,[r(t,{modelValue:o(e).cloro,"onUpdate:modelValue":l[10]||(l[10]=a=>o(e).cloro=a),modelModifiers:{number:!0},type:"number",placeholder:"Cloro Residual",label:"Cloro Residual",help:"mg/l",validation:o(e).type===29||o(e).type===28?"required|number|min:0|max:99":"number|min:0|max:99","validation-messages":{required:"Este campo es obligatorio",number:"Introduce un número",min:"El valor mínimo es 0",max:"El valor máximo es 99"}},null,8,["modelValue","validation"]),r(t,{modelValue:o(e).ph,"onUpdate:modelValue":l[11]||(l[11]=a=>o(e).ph=a),type:"number",placeholder:"pH",label:"pH",help:"ud",validation:o(e).type===29||o(e).type===28?"required|number|min:0|max:14":"number|min:0|max:14","validation-messages":{required:"Este campo es obligatorio",number:"Introduce un número",min:"El valor mínimo es 0",max:"El valor máximo es 14"}},null,8,["modelValue","validation"]),r(t,{modelValue:o(e).turbidez,"onUpdate:modelValue":l[12]||(l[12]=a=>o(e).turbidez=a),modelModifiers:{number:!0},type:"number",placeholder:"Turbidez",label:"Turbidez",help:"UNF",validation:o(e).type===29||o(e).type===28?"required|number|min:0|max:999":"number|min:0|max:999","validation-messages":{required:"Este campo es obligatorio",number:"Introduce un número",min:"El valor mínimo es 0",max:"El valor máximo es 999"}},null,8,["modelValue","validation"])]),s("div",null,[r(t,{modelValue:o(e).observaciones,"onUpdate:modelValue":l[13]||(l[13]=a=>o(e).observaciones=a),type:"textarea",placeholder:"Introduce cualquier tipo de incidencia","inner-class":"w-full","wrapper-class":"w-full"},null,8,["modelValue"])])])):b("",!0)]),_:1})]),_:1})])}}};export{Q as _};
