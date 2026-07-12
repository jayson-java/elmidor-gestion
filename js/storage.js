/* ════════════════════════════════════════════════════════
   ELMIDOR GESTIÓN · Almacenamiento local + cola offline
   ────────────────────────────────────────────────────────
   En el campo no siempre hay señal. Este módulo guarda los
   datos localmente y los sincroniza con Google Sheets cuando
   vuelve la conexión. No necesitas editar este archivo.
   ════════════════════════════════════════════════════════ */

const LOCAL = (function(){

  var KEY_DATA  = "elmidor_data_v1";
  var KEY_QUEUE = "elmidor_queue_v1";

  function leer(key, fallback){
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch(e){ return fallback; }
  }
  function guardar(key, val){
    try { localStorage.setItem(key, JSON.stringify(val)); } catch(e){}
  }

  /* ── Caché de datos (lo último que se leyó de Sheets) ── */
  function getCache(){
    return leer(KEY_DATA, { Produccion:[], Stock:[], Gastos:[], Ventas:[], _resumen:null, _actualizado:null });
  }
  function setCache(hoja, filas){
    var data = getCache();
    data[hoja] = filas;
    data._actualizado = new Date().toISOString();
    guardar(KEY_DATA, data);
  }
  function setResumenCache(resumen){
    var data = getCache();
    data._resumen = resumen;
    guardar(KEY_DATA, data);
  }
  function agregarACache(hoja, fila){
    var data = getCache();
    if(!data[hoja]) data[hoja] = [];
    data[hoja].push(fila);
    guardar(KEY_DATA, data);
  }
  function eliminarDeCache(hoja, id){
    var data = getCache();
    if(data[hoja]){
      data[hoja] = data[hoja].filter(function(f){ return String(f.id) !== String(id); });
      guardar(KEY_DATA, data);
    }
  }

  /* ── Cola de operaciones pendientes (cuando no hay internet) ── */
  function getQueue(){
    return leer(KEY_QUEUE, []);
  }
  function pushQueue(op){
    var q = getQueue();
    op.localId = "local_" + Date.now() + "_" + Math.floor(Math.random()*1000);
    op.creado = new Date().toISOString();
    q.push(op);
    guardar(KEY_QUEUE, q);
    return op;
  }
  function removeQueue(localId){
    var q = getQueue().filter(function(o){ return o.localId !== localId; });
    guardar(KEY_QUEUE, q);
  }
  function clearQueue(){
    guardar(KEY_QUEUE, []);
  }

  return {
    getCache: getCache,
    setCache: setCache,
    setResumenCache: setResumenCache,
    agregarACache: agregarACache,
    eliminarDeCache: eliminarDeCache,
    getQueue: getQueue,
    pushQueue: pushQueue,
    removeQueue: removeQueue,
    clearQueue: clearQueue
  };
})();
