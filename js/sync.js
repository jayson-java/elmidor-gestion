/* ════════════════════════════════════════════════════════
   ELMIDOR GESTIÓN · Motor de sincronización
   ────────────────────────────────────────────────────────
   Decide cuándo leer de Sheets, cuándo usar caché local,
   y reintenta la cola pendiente cuando vuelve la conexión.
   No necesitas editar este archivo.
   ════════════════════════════════════════════════════════ */

const SYNC = (function(){

  var sincronizando = false;
  var listeners = [];

  function onCambioEstado(fn){ listeners.push(fn); }
  function avisar(estado){ listeners.forEach(function(fn){ fn(estado); }); }

  /* ── Estado de conexión ──
     navigator.onLine no es confiable (puede marcar "sin conexión" con
     internet real, sobre todo en datos móviles). La prueba real es
     intentar la llamada y encolar solo si falla de verdad. */
  function online(){ return API.estaConectado(); }

  /* ── Leer una hoja: intenta Sheets, si falla usa caché ── */
  function leer(hoja){
    if(!API.estaConectado()){
      return Promise.resolve(LOCAL.getCache()[hoja] || []);
    }
    return API.leer(hoja)
      .then(function(filas){
        LOCAL.setCache(hoja, filas);
        intentarFlush();
        return filas;
      })
      .catch(function(){
        return LOCAL.getCache()[hoja] || [];
      });
  }

  /* ── Leer el resumen del dashboard ── */
  function resumen(){
    if(!API.estaConectado()){
      return Promise.resolve(LOCAL.getCache()._resumen);
    }
    return API.resumen()
      .then(function(r){
        LOCAL.setResumenCache(r);
        intentarFlush();
        return r;
      })
      .catch(function(){
        return LOCAL.getCache()._resumen;
      });
  }

  /* ── Agregar un registro nuevo ──
     Si hay conexión: lo manda directo.
     Si no hay conexión: lo guarda en cola y lo manda apenas vuelva. */
  function encolarAgregar(hoja, datos){
    var op = LOCAL.pushQueue({ accion:"agregar", hoja:hoja, datos:datos });
    var fila = {};
    Object.keys(datos).forEach(function(k){ fila[k] = datos[k]; });
    fila.id = op.localId;
    LOCAL.agregarACache(hoja, fila);
    avisar({ tipo:"encolado", hoja:hoja });
    return { ok:true, encolado:true };
  }

  function agregar(hoja, datos){
    if(online()){
      return API.agregar(hoja, datos)
        .then(function(r){
          avisar({ tipo:"guardado", hoja:hoja });
          intentarFlush();
          return r;
        })
        .catch(function(err){
          // falló igual estando "online" (ej: token vencido) → encolar
          return encolarAgregar(hoja, datos);
        });
    } else {
      return Promise.resolve(encolarAgregar(hoja, datos));
    }
  }

  function encolarEliminar(hoja, id){
    LOCAL.pushQueue({ accion:"eliminar", hoja:hoja, id:id });
    LOCAL.eliminarDeCache(hoja, id);
    avisar({ tipo:"encolado", hoja:hoja });
    return { ok:true, encolado:true };
  }

  function eliminar(hoja, id){
    // Si el registro todavía no se sincronizó (fue creado offline y sigue
    // en la cola), no existe en la planilla: basta con cancelar el "agregar"
    // pendiente, sin avisarle nada al servidor.
    var agregarPendiente = LOCAL.getQueue().find(function(op){
      return op.accion === "agregar" && op.localId === id;
    });
    if(agregarPendiente){
      LOCAL.removeQueue(id);
      LOCAL.eliminarDeCache(hoja, id);
      return Promise.resolve({ ok:true, encolado:false });
    }

    if(online()){
      return API.eliminar(hoja, id)
        .then(function(r){
          avisar({ tipo:"guardado", hoja:hoja });
          intentarFlush();
          return r;
        })
        .catch(function(err){
          // falló igual estando "online" (ej: sin señal real) → encolar
          return encolarEliminar(hoja, id);
        });
    } else {
      return Promise.resolve(encolarEliminar(hoja, id));
    }
  }

  /* ── Procesar la cola pendiente (llamar al recuperar conexión) ── */
  function procesarCola(){
    if(sincronizando || !online()) return Promise.resolve();
    var cola = LOCAL.getQueue();
    if(cola.length === 0) return Promise.resolve();

    // Autolimpieza: un "eliminar" que apunta a un id local (registro creado
    // offline que nunca se sincronizó) nunca va a encontrar esa fila en el
    // servidor. Se cancelan ambas operaciones sin red, para no quedar
    // reintentando algo imposible.
    cola.forEach(function(op){
      if(op.accion === "eliminar" && String(op.id).indexOf("local_") === 0){
        var match = cola.find(function(o){ return o.accion === "agregar" && o.localId === op.id; });
        LOCAL.removeQueue(op.localId);
        if(match) LOCAL.removeQueue(match.localId);
      }
    });
    cola = LOCAL.getQueue();
    if(cola.length === 0) return Promise.resolve();

    sincronizando = true;
    avisar({ tipo:"sincronizando", pendientes:cola.length });

    var promesas = cola.map(function(op){
      var p;
      if(op.accion === "agregar") p = API.agregar(op.hoja, op.datos);
      else if(op.accion === "eliminar") p = API.eliminar(op.hoja, op.id);
      else p = Promise.resolve();

      return p.then(function(){
        LOCAL.removeQueue(op.localId);
      }).catch(function(){
        /* se queda en la cola para reintentar después */
      });
    });

    return Promise.all(promesas).then(function(){
      sincronizando = false;
      avisar({ tipo:"sincronizado" });
    });
  }

  /* ── Vaciar la cola sin bloquear, ignorando errores ── */
  function intentarFlush(){
    procesarCola().catch(function(){});
  }

  /* ── Escuchar reconexión automática ── */
  window.addEventListener("online", function(){
    avisar({ tipo:"conexion-recuperada" });
    procesarCola();
  });
  window.addEventListener("offline", function(){
    avisar({ tipo:"conexion-perdida" });
  });

  /* ── Reintento periódico de fondo: por si el navegador no avisa
     que volvió la conexión, igual reintentamos cada cierto tiempo
     mientras haya registros pendientes. ── */
  setInterval(function(){
    if(LOCAL.getQueue().length > 0) intentarFlush();
  }, 20000);

  return {
    online: online,
    leer: leer,
    resumen: resumen,
    agregar: agregar,
    eliminar: eliminar,
    procesarCola: procesarCola,
    pendientes: function(){ return LOCAL.getQueue().length; },
    onCambioEstado: onCambioEstado
  };
})();
