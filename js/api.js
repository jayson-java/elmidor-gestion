/* ════════════════════════════════════════════════════════
   ELMIDOR GESTIÓN · Cliente API
   ────────────────────────────────────────────────────────
   Funciones para hablar con el Google Apps Script.
   No necesitas editar este archivo.
   ════════════════════════════════════════════════════════ */

const API = (function(){

  function urlConfigurada(){
    return CFG.apiUrl && CFG.apiUrl.indexOf("script.google.com") !== -1;
  }

  /* Apps Script Web Apps no soportan bien CORS con POST+JSON desde fetch
     en todos los navegadores, así que usamos POST con form-encoded,
     que es más compatible y evita problemas de preflight. */
  function llamar(params){
    if(!urlConfigurada()){
      return Promise.reject(new Error("NO_CONFIG"));
    }
    var body = new URLSearchParams();
    Object.keys(params).forEach(function(k){ body.append(k, params[k]); });

    return fetch(CFG.apiUrl, {
      method: "POST",
      body: body
    })
    .then(function(r){
      if(!r.ok) throw new Error("HTTP_" + r.status);
      return r.json();
    })
    .then(function(json){
      if(json.error) throw new Error(json.error);
      return json;
    });
  }

  return {
    estaConectado: urlConfigurada,

    leer: function(hoja){
      return llamar({ accion:"leer", hoja:hoja }).then(function(r){ return r.filas || []; });
    },

    agregar: function(hoja, datos){
      return llamar({ accion:"agregar", hoja:hoja, datos:JSON.stringify(datos) });
    },

    editar: function(hoja, id, datos){
      return llamar({ accion:"editar", hoja:hoja, id:id, datos:JSON.stringify(datos) });
    },

    eliminar: function(hoja, id){
      return llamar({ accion:"eliminar", hoja:hoja, id:id });
    },

    resumen: function(){
      return llamar({ accion:"resumen" });
    }
  };
})();
