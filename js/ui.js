/* ════════════════════════════════════════════════════════
   ELMIDOR GESTIÓN · Controlador de interfaz
   ════════════════════════════════════════════════════════ */

const UI = (function(){

  var vistaActual = "dashboard";
  var datos = { Produccion:[], Stock:[], Gastos:[], Ventas:[] };
  var resumen = null;
  var rolActual = null;

  function init(){
    var urlGuardada = localStorage.getItem("elmidor_api_url");
    if(urlGuardada) CFG.apiUrl = urlGuardada;

    if(!CFG.apiUrl){
      document.getElementById("setup-screen").style.display = "block";
      return;
    }

    var rolGuardado = sessionStorage.getItem("elmidor_rol");
    if(rolGuardado){
      rolActual = rolGuardado;
      mostrarApp();
    } else {
      mostrarLogin();
    }
  }

  function mostrarLogin(){
    var sel = document.getElementById("login-usuario");
    sel.innerHTML = CFG.usuarios.map(function(u){
      return '<option value="'+u.rol+'">'+u.nombre+'</option>';
    }).join('');
    document.getElementById("login-pin").value = "";
    document.getElementById("login-screen").style.display = "block";
    setTimeout(function(){ document.getElementById("login-pin").focus(); }, 100);
  }

  function hacerLogin(){
    var rolSel = document.getElementById("login-usuario").value;
    var pin    = document.getElementById("login-pin").value;
    var usuario = CFG.usuarios.find(function(u){ return u.rol === rolSel; });
    if(!usuario || usuario.pin !== pin){
      toast("PIN incorrecto", true);
      document.getElementById("login-pin").value = "";
      return;
    }
    rolActual = usuario.rol;
    sessionStorage.setItem("elmidor_rol",     rolActual);
    sessionStorage.setItem("elmidor_usuario", usuario.nombre);
    document.getElementById("login-screen").style.display = "none";
    mostrarApp();
  }

  function cerrarSesion(){
    sessionStorage.removeItem("elmidor_rol");
    sessionStorage.removeItem("elmidor_usuario");
    rolActual = null;
    document.getElementById("app-root").style.display  = "none";
    document.getElementById("mob-nav").style.display   = "none";
    mostrarLogin();
  }

  function aplicarRol(){
    var esAdmin = rolActual === "admin";
    var vistasSoloAdmin = ["dashboard","stock","gastos","ventas"];
    vistasSoloAdmin.forEach(function(v){
      document.querySelectorAll('[data-view="'+v+'"]').forEach(function(el){
        el.style.display = esAdmin ? "" : "none";
      });
    });
    document.getElementById("btn-ajustes").style.display = esAdmin ? "" : "none";
    if(!esAdmin) irVista("produccion");
  }

  function mostrarApp(){
    document.getElementById("setup-screen").style.display = "none";
    document.getElementById("app-root").style.display = "block";
    document.getElementById("mob-nav").style.display = "flex";

    poblarSelects();
    fecharHoyEnFormularios();
    actualizarFechaTopbar();
    actualizarBadgeConexion();
    aplicarRol();

    SYNC.onCambioEstado(function(estado){
      actualizarBadgeConexion();
      if(estado.tipo === "sincronizado") refrescarTodo();
    });

    refrescarTodo();
  }

  function guardarUrl(){
    var url = document.getElementById("setup-url").value.trim();
    if(!url || url.indexOf("script.google.com") === -1){
      toast("Pega una URL válida de Apps Script", true);
      return;
    }
    localStorage.setItem("elmidor_api_url", url);
    CFG.apiUrl = url;
    document.getElementById("setup-screen").style.display = "none";
    mostrarLogin();
    toast("¡Conectado!");
  }

  function abrirAjustes(){
    document.getElementById("ajustes-url").value = CFG.apiUrl || "";
    document.getElementById("ajustes-pendientes").textContent = SYNC.pendientes();
    abrirModal("ajustes");
  }
  function guardarAjustes(){
    var url = document.getElementById("ajustes-url").value.trim();
    if(url){
      localStorage.setItem("elmidor_api_url", url);
      CFG.apiUrl = url;
      toast("Ajustes guardados");
      refrescarTodo();
    }
    cerrarModal("modal-ajustes");
  }
  function forzarSync(){
    SYNC.procesarCola().then(function(){
      toast("Sincronización completada");
      document.getElementById("ajustes-pendientes").textContent = SYNC.pendientes();
    });
  }

  function irVista(nombre){
    vistaActual = nombre;
    document.querySelectorAll(".view").forEach(function(v){ v.classList.remove("on"); });
    document.getElementById("view-" + nombre).classList.add("on");
    document.querySelectorAll(".desk-tab, .mob-tab").forEach(function(t){
      t.classList.toggle("on", t.getAttribute("data-view") === nombre);
    });
  }

  function refrescarTodo(){
    mostrarBannerSync();
    Promise.all([
      SYNC.leer("Produccion"),
      SYNC.leer("Stock"),
      SYNC.leer("Gastos"),
      SYNC.leer("Ventas"),
      SYNC.resumen()
    ]).then(function(r){
      datos.Produccion = r[0] || [];
      datos.Stock      = r[1] || [];
      datos.Gastos     = r[2] || [];
      datos.Ventas      = r[3] || [];
      resumen           = r[4];
      renderDashboard();
      renderProduccion();
      renderStock();
      renderGastos();
      renderVentas();
      actualizarBadgeConexion();
      ocultarBannerSync();
    }).catch(function(err){
      ocultarBannerSync();
      toast("No se pudo actualizar: " + err.message, true);
    });
  }

  function mostrarBannerSync(){
    var pend = SYNC.pendientes();
    var wrap = document.getElementById("sync-banner-wrap");
    if(pend > 0){
      wrap.innerHTML = '<div class="sync-banner"><i class="ti ti-cloud-upload"></i> ' + pend + ' registro(s) pendiente(s) de sincronizar. Se enviarán automáticamente al recuperar conexión.</div>';
    } else {
      wrap.innerHTML = "";
    }
  }
  function ocultarBannerSync(){ mostrarBannerSync(); }

  function actualizarBadgeConexion(){
    var badge = document.getElementById("conn-badge");
    var text  = document.getElementById("conn-text");
    if(SYNC.online()){
      badge.className = "conn-badge conn-ok";
      text.textContent = "Conectado";
    } else {
      badge.className = "conn-badge conn-off";
      text.textContent = "Sin conexión";
    }
  }

  function actualizarFechaTopbar(){
    var f = new Date();
    var opciones = { weekday:"long", day:"numeric", month:"long" };
    document.getElementById("topbar-fecha").textContent = f.toLocaleDateString("es-CL", opciones);
  }

  function poblarSelects(){
    var optTallas = CFG.tallas.map(function(t){ return '<option value="'+t+'">'+t+'</option>'; }).join('');
    document.getElementById("prod-talla").innerHTML = optTallas;
    document.getElementById("venta-talla").innerHTML = optTallas;

    var optFormatos = CFG.formatos.map(function(f){ return '<option value="'+f.id+'">'+f.nombre+'</option>'; }).join('');
    document.getElementById("stock-formato").innerHTML = optFormatos;
    document.getElementById("venta-formato").innerHTML = optFormatos;

    var optCategorias = CFG.categoriasGasto.map(function(c){ return '<option value="'+c+'">'+c+'</option>'; }).join('');
    document.getElementById("gasto-categoria").innerHTML = optCategorias;

    var optPago = CFG.metodosPago.map(function(m){ return '<option value="'+m+'">'+m+'</option>'; }).join('');
    document.getElementById("venta-pago").innerHTML = optPago;

    actualizarMotivosStock();
  }

  function actualizarMotivosStock(){
    var tipo = document.getElementById("stock-tipo").value;
    var motivos = CFG.motivosStock[tipo] || [];
    document.getElementById("stock-motivo").innerHTML = motivos.map(function(m){ return '<option value="'+m+'">'+m+'</option>'; }).join('');
  }

  function fecharHoyEnFormularios(){
    var hoy = hoyISO();
    ["prod-fecha","stock-fecha","gasto-fecha","venta-fecha"].forEach(function(id){
      var el = document.getElementById(id);
      if(el) el.value = hoy;
    });
  }

  function calcularSugerenciaVenta(){
    var formatoId = document.getElementById("venta-formato").value;
    var cant = parseInt(document.getElementById("venta-cantidad").value) || 0;
  }

  function abrirModal(nombre){
    document.getElementById("modal-" + nombre).classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function cerrarModal(id){
    document.getElementById(id).classList.remove("open");
    document.body.style.overflow = "";
  }

  function guardarProduccion(){
    var fecha = document.getElementById("prod-fecha").value;
    var cantidad = parseInt(document.getElementById("prod-cantidad").value) || 0;
    var talla = document.getElementById("prod-talla").value;
    var quebrados = parseInt(document.getElementById("prod-quebrados").value) || 0;
    var obs = document.getElementById("prod-obs").value.trim();

    if(!fecha || cantidad <= 0){ toast("Completa fecha y cantidad", true); return; }
    if(quebrados > cantidad){ toast("Los quebrados no pueden superar la cantidad producida", true); return; }

    var btn = document.getElementById("btn-guardar-produccion");
    btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2"></i> Guardando...';

    SYNC.agregar("Produccion", {
      fecha: fecha, cantidad: cantidad, talla: talla, quebrados: quebrados, observacion: obs
    }).then(function(r){
      btn.disabled = false; btn.innerHTML = '<i class="ti ti-check"></i> Guardar';
      cerrarModal("modal-produccion");
      limpiarForm(["prod-cantidad","prod-obs"]);
      document.getElementById("prod-quebrados").value = 0;
      toast(r.encolado ? "Guardado localmente (sin conexión)" : "Producción registrada");
      refrescarTodo();
    }).catch(function(err){
      btn.disabled = false; btn.innerHTML = '<i class="ti ti-check"></i> Guardar';
      toast("Error al guardar: " + err.message, true);
    });
  }

  function renderProduccion(){
    var tbody = document.getElementById("tabla-produccion");
    var filas = (datos.Produccion || []).slice().sort(function(a,b){ return (b.fecha||"").localeCompare(a.fecha||""); });
    if(filas.length === 0){
      tbody.innerHTML = filaVacia(7, "ti-egg-off", "Aún no registras producción");
      return;
    }
    tbody.innerHTML = filas.map(function(p){
      var pct = p.cantidad > 0 ? Math.round((Number(p.quebrados||0)/Number(p.cantidad))*1000)/10 : 0;
      var pillClase = pct > 5 ? "pill-red" : "pill-green";
      return "<tr>"
        + "<td>" + fechaCorta(p.fecha) + "</td>"
        + "<td><strong>" + fmtNum(p.cantidad) + "</strong></td>"
        + "<td><span class='pill pill-gray'>" + (p.talla||"-") + "</span></td>"
        + "<td>" + fmtNum(p.quebrados||0) + "</td>"
        + "<td><span class='pill " + pillClase + "'>" + pct + "%</span></td>"
        + "<td class='muted' style='white-space:normal;max-width:160px'>" + (p.observacion||"—") + "</td>"
        + "<td><div class='row-actions'>" + botonEliminar("Produccion", p.id) + "</div></td>"
        + "</tr>";
    }).join("");
  }

  function guardarStock(){
    var fecha = document.getElementById("stock-fecha").value;
    var tipo = document.getElementById("stock-tipo").value;
    var formato = document.getElementById("stock-formato").value;
    var cantidad = parseInt(document.getElementById("stock-cantidad").value) || 0;
    var motivo = document.getElementById("stock-motivo").value;

    if(!fecha || cantidad <= 0){ toast("Completa fecha y cantidad", true); return; }

    var btn = document.getElementById("btn-guardar-stock");
    btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2"></i> Guardando...';

    SYNC.agregar("Stock", {
      fecha: fecha, formato: formato, cantidadHuevos: cantidad, tipoMovimiento: tipo, motivo: motivo
    }).then(function(r){
      btn.disabled = false; btn.innerHTML = '<i class="ti ti-check"></i> Guardar';
      cerrarModal("modal-stock");
      limpiarForm(["stock-cantidad"]);
      toast(r.encolado ? "Guardado localmente (sin conexión)" : "Movimiento de stock registrado");
      refrescarTodo();
    }).catch(function(err){
      btn.disabled = false; btn.innerHTML = '<i class="ti ti-check"></i> Guardar';
      toast("Error al guardar: " + err.message, true);
    });
  }

  function renderStock(){
    var tbody = document.getElementById("tabla-stock");
    var filas = (datos.Stock || []).slice().sort(function(a,b){ return (b.fecha||"").localeCompare(a.fecha||""); });

    var totalHuevos = 0;
    (datos.Stock||[]).forEach(function(m){
      var cant = Number(m.cantidadHuevos)||0;
      totalHuevos += m.tipoMovimiento === "entrada" ? cant : -cant;
    });
    var resumenWrap = document.getElementById("stock-resumen");
    resumenWrap.innerHTML =
      '<div class="metric-card"><p class="metric-label">Stock total disponible</p><p class="metric-value">' + fmtNum(totalHuevos) + '</p><p class="metric-unit">huevos</p></div>' +
      '<div class="metric-card"><p class="metric-label">Equivalente en bandejas</p><p class="metric-value">' + fmtNum(Math.floor(totalHuevos/30)) + '</p><p class="metric-unit">de 30 unidades</p></div>';

    if(filas.length === 0){
      tbody.innerHTML = filaVacia(6, "ti-package-off", "Sin movimientos de stock");
      return;
    }
    tbody.innerHTML = filas.map(function(m){
      var formatoNombre = nombreFormato(m.formato);
      var esEntrada = m.tipoMovimiento === "entrada";
      return "<tr>"
        + "<td>" + fechaCorta(m.fecha) + "</td>"
        + "<td>" + formatoNombre + "</td>"
        + "<td><strong>" + (esEntrada?"+":"-") + fmtNum(m.cantidadHuevos) + "</strong></td>"
        + "<td><span class='pill " + (esEntrada?"pill-green":"pill-red") + "'>" + (esEntrada?"Entrada":"Salida") + "</span></td>"
        + "<td class='muted'>" + (m.motivo||"—") + "</td>"
        + "<td><div class='row-actions'>" + botonEliminar("Stock", m.id) + "</div></td>"
        + "</tr>";
    }).join("");
  }

  function guardarGasto(){
    var fecha = document.getElementById("gasto-fecha").value;
    var categoria = document.getElementById("gasto-categoria").value;
    var desc = document.getElementById("gasto-desc").value.trim();
    var monto = parseInt(document.getElementById("gasto-monto").value) || 0;

    if(!fecha || monto <= 0){ toast("Completa fecha y monto", true); return; }

    var btn = document.getElementById("btn-guardar-gastos");
    btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2"></i> Guardando...';

    SYNC.agregar("Gastos", {
      fecha: fecha, categoria: categoria, descripcion: desc, monto: monto
    }).then(function(r){
      btn.disabled = false; btn.innerHTML = '<i class="ti ti-check"></i> Guardar';
      cerrarModal("modal-gastos");
      limpiarForm(["gasto-desc","gasto-monto"]);
      toast(r.encolado ? "Guardado localmente (sin conexión)" : "Gasto registrado");
      refrescarTodo();
    }).catch(function(err){
      btn.disabled = false; btn.innerHTML = '<i class="ti ti-check"></i> Guardar';
      toast("Error al guardar: " + err.message, true);
    });
  }

  function renderGastos(){
    var tbody = document.getElementById("tabla-gastos");
    var filas = (datos.Gastos || []).slice().sort(function(a,b){ return (b.fecha||"").localeCompare(a.fecha||""); });
    if(filas.length === 0){
      tbody.innerHTML = filaVacia(5, "ti-receipt-off", "Sin gastos registrados");
      return;
    }
    tbody.innerHTML = filas.map(function(g){
      return "<tr>"
        + "<td>" + fechaCorta(g.fecha) + "</td>"
        + "<td><span class='pill pill-gray'>" + (g.categoria||"-") + "</span></td>"
        + "<td style='white-space:normal;max-width:200px'>" + (g.descripcion||"—") + "</td>"
        + "<td><strong>" + fmt(g.monto) + "</strong></td>"
        + "<td><div class='row-actions'>" + botonEliminar("Gastos", g.id) + "</div></td>"
        + "</tr>";
    }).join("");
  }

  function guardarVenta(){
    var fecha = document.getElementById("venta-fecha").value;
    var cliente = document.getElementById("venta-cliente").value.trim();
    var formato = document.getElementById("venta-formato").value;
    var talla = document.getElementById("venta-talla").value;
    var cantidad = parseInt(document.getElementById("venta-cantidad").value) || 0;
    var monto = parseInt(document.getElementById("venta-monto").value) || 0;
    var pago = document.getElementById("venta-pago").value;

    if(!fecha || !cliente || monto <= 0){ toast("Completa fecha, cliente y monto", true); return; }

    var btn = document.getElementById("btn-guardar-ventas");
    btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2"></i> Guardando...';

    SYNC.agregar("Ventas", {
      fecha: fecha, cliente: cliente, formato: formato, talla: talla,
      cantidad: cantidad, montoTotal: monto, metodoPago: pago
    }).then(function(r){
      btn.disabled = false; btn.innerHTML = '<i class="ti ti-check"></i> Guardar';
      cerrarModal("modal-ventas");
      limpiarForm(["venta-cliente","venta-monto"]);
      document.getElementById("venta-cantidad").value = 1;
      toast(r.encolado ? "Guardado localmente (sin conexión)" : "Venta registrada");
      refrescarTodo();
    }).catch(function(err){
      btn.disabled = false; btn.innerHTML = '<i class="ti ti-check"></i> Guardar';
      toast("Error al guardar: " + err.message, true);
    });
  }

  function renderVentas(){
    var tbody = document.getElementById("tabla-ventas");
    var filas = (datos.Ventas || []).slice().sort(function(a,b){ return (b.fecha||"").localeCompare(a.fecha||""); });
    if(filas.length === 0){
      tbody.innerHTML = filaVacia(7, "ti-shopping-cart-off", "Sin ventas registradas");
      return;
    }
    tbody.innerHTML = filas.map(function(v){
      var pillPago = v.metodoPago === "Por cobrar" ? "pill-red" : "pill-green";
      return "<tr>"
        + "<td>" + fechaCorta(v.fecha) + "</td>"
        + "<td>" + (v.cliente||"—") + "</td>"
        + "<td>" + nombreFormato(v.formato) + "</td>"
        + "<td>" + fmtNum(v.cantidad||0) + "</td>"
        + "<td><strong>" + fmt(v.montoTotal) + "</strong></td>"
        + "<td><span class='pill " + pillPago + "'>" + (v.metodoPago||"-") + "</span></td>"
        + "<td><div class='row-actions'>" + botonEliminar("Ventas", v.id) + "</div></td>"
        + "</tr>";
    }).join("");
  }

  function renderDashboard(){
    var r = resumen || {};
    var wrap = document.getElementById("dash-metrics");

    var variacion = r.variacionVentas;
    var trendHtml = "";
    if(variacion !== null && variacion !== undefined){
      var up = variacion >= 0;
      trendHtml = '<p class="metric-trend ' + (up?"trend-up":"trend-down") + '"><i class="ti ti-' + (up?"trending-up":"trending-down") + '"></i> ' + (up?"+":"") + variacion + '% vs mes anterior</p>';
    }

    wrap.innerHTML =
      metricCard("ti-egg", "var(--green-pale)", "var(--green-dk)", "Producción hoy", fmtNum(r.produccionHoy||0), "huevos") +
      metricCard("ti-package", "var(--blue-pale)", "var(--blue)", "Stock disponible", fmtNum(r.stockActual||0), "huevos") +
      metricCard("ti-receipt-2", "#fdecea", "var(--red)", "Gastos del mes", fmt(r.gastosMes||0), "alimento y log\u00edstica") +
      metricCard("ti-shopping-cart", "#fff6e0", "var(--gold)", "Ventas del mes", fmt(r.ventasMes||0), "", trendHtml);

    var ultimos7 = ultimosNDias(7);
    var maxCant = 1;
    var porDia = {};
    (datos.Produccion||[]).forEach(function(p){
      porDia[p.fecha] = (porDia[p.fecha]||0) + (Number(p.cantidad)||0);
    });
    ultimos7.forEach(function(d){ if(porDia[d] > maxCant) maxCant = porDia[d]; });

    var chartHtml = ultimos7.map(function(d){
      var cant = porDia[d] || 0;
      var alto = Math.max(3, Math.round((cant/maxCant)*120));
      var diaLabel = new Date(d+"T00:00:00").toLocaleDateString("es-CL",{weekday:"short"}).replace(".","");
      return '<div class="bar-col"><div class="bar" style="height:'+alto+'px" title="'+cant+' huevos"></div><span class="bar-label">'+diaLabel+'</span></div>';
    }).join("");
    document.getElementById("dash-chart").innerHTML = chartHtml;

    var catWrap = document.getElementById("dash-gastos-cat");
    var cats = r.gastosPorCategoria || {};
    var catKeys = Object.keys(cats);
    if(catKeys.length === 0){
      catWrap.innerHTML = '<p class="muted" style="font-size:.82rem">Sin gastos este mes</p>';
    } else {
      var totalCat = catKeys.reduce(function(s,k){ return s+cats[k]; },0);
      catWrap.innerHTML = catKeys.sort(function(a,b){return cats[b]-cats[a];}).map(function(k){
        var pct = totalCat>0 ? Math.round((cats[k]/totalCat)*100) : 0;
        return '<div style="margin-bottom:.6rem">'
          + '<div class="flex" style="justify-content:space-between;font-size:.78rem;margin-bottom:.25rem"><span>'+k+'</span><strong>'+fmt(cats[k])+'</strong></div>'
          + '<div style="height:6px;background:#f0ede6;border-radius:4px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:var(--green)"></div></div>'
          + '</div>';
      }).join("");
    }

    var ultimosWrap = document.getElementById("dash-ultimos");
    var combinados = [];
    (datos.Produccion||[]).slice(-5).forEach(function(p){ combinados.push({fecha:p.fecha, tipo:"Producción", detalle: fmtNum(p.cantidad)+" huevos", icon:"ti-egg", color:"var(--green-dk)"}); });
    (datos.Ventas||[]).slice(-5).forEach(function(v){ combinados.push({fecha:v.fecha, tipo:"Venta", detalle: (v.cliente||"")+" · "+fmt(v.montoTotal), icon:"ti-shopping-cart", color:"var(--gold)"}); });
    (datos.Gastos||[]).slice(-5).forEach(function(g){ combinados.push({fecha:g.fecha, tipo:"Gasto", detalle: (g.categoria||"")+" · "+fmt(g.monto), icon:"ti-receipt-2", color:"var(--red)"}); });
    combinados.sort(function(a,b){ return (b.fecha||"").localeCompare(a.fecha||""); });
    combinados = combinados.slice(0,8);

    if(combinados.length === 0){
      ultimosWrap.innerHTML = '<p class="muted" style="font-size:.82rem">Aún no hay movimientos registrados</p>';
    } else {
      ultimosWrap.innerHTML = combinados.map(function(m){
        return '<div class="flex" style="justify-content:space-between;padding:.5rem 0;border-bottom:1px solid var(--border)">'
          + '<div class="flex gap-2"><i class="'+m.icon+'" style="color:'+m.color+'"></i><div><p style="font-size:.82rem;font-weight:600">'+m.tipo+'</p><p style="font-size:.72rem;color:var(--text-light)">'+m.detalle+'</p></div></div>'
          + '<span style="font-size:.72rem;color:var(--text-light)">'+fechaCorta(m.fecha)+'</span>'
          + '</div>';
      }).join("");
    }
  }

  function metricCard(icon, bg, color, label, value, unit, extraHtml){
    return '<div class="metric-card">'
      + '<div class="metric-icon" style="background:'+bg+';color:'+color+'"><i class="'+icon+'"></i></div>'
      + '<p class="metric-label">'+label+'</p>'
      + '<p class="metric-value">'+value+'</p>'
      + (unit ? '<p class="metric-unit">'+unit+'</p>' : '')
      + (extraHtml || '')
      + '</div>';
  }

  function botonEliminar(hoja, id){
    if(!id) return "";
    return '<button class="icon-btn danger" onclick="UI.eliminar(\''+hoja+'\',\''+id+'\')" title="Eliminar"><i class="ti ti-trash"></i></button>';
  }
  function eliminar(hoja, id){
    if(!confirm("¿Eliminar este registro? Esta acción no se puede deshacer.")) return;
    SYNC.eliminar(hoja, id).then(function(r){
      toast(r.encolado ? "Eliminado localmente (sin conexión)" : "Registro eliminado");
      refrescarTodo();
    }).catch(function(err){
      toast("Error al eliminar: " + err.message, true);
    });
  }

  function filaVacia(colspan, icon, texto){
    return '<tr><td colspan="'+colspan+'"><div class="empty-state"><i class="ti '+icon+'"></i><p>'+texto+'</p></div></td></tr>';
  }
  function nombreFormato(id){
    var f = CFG.formatos.find(function(x){ return x.id === id; });
    return f ? f.nombre : id;
  }
  function fechaCorta(iso){
    if(!iso) return "—";
    var d = new Date(iso + "T00:00:00");
    if(isNaN(d)) return iso;
    return d.toLocaleDateString("es-CL", { day:"2-digit", month:"short" });
  }
  function ultimosNDias(n){
    var arr = [];
    for(var i=n-1; i>=0; i--){
      var d = new Date();
      d.setDate(d.getDate()-i);
      arr.push(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"));
    }
    return arr;
  }
  function limpiarForm(ids){
    ids.forEach(function(id){
      var el = document.getElementById(id);
      if(el) el.value = "";
    });
  }
  function toast(msg, esError){
    var t = document.getElementById("toast");
    t.textContent = msg;
    t.className = "toast show" + (esError ? " err" : "");
    clearTimeout(t._timer);
    t._timer = setTimeout(function(){ t.classList.remove("show"); }, 3200);
  }

  return {
    init: init,
    hacerLogin: hacerLogin,
    cerrarSesion: cerrarSesion,
    guardarUrl: guardarUrl,
    abrirAjustes: abrirAjustes,
    guardarAjustes: guardarAjustes,
    forzarSync: forzarSync,
    irVista: irVista,
    refrescarTodo: refrescarTodo,
    abrirModal: abrirModal,
    cerrarModal: cerrarModal,
    actualizarMotivosStock: actualizarMotivosStock,
    calcularSugerenciaVenta: calcularSugerenciaVenta,
    guardarProduccion: guardarProduccion,
    guardarStock: guardarStock,
    guardarGasto: guardarGasto,
    guardarVenta: guardarVenta,
    eliminar: eliminar
  };
})();

document.addEventListener("DOMContentLoaded", UI.init);
