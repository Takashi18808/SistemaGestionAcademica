/* ================================================================
   APP.JS — Dashboard principal
   Página: dashboard.html
   Módulos: Eventos, Inscripción, Reportes, Logout
   Persistencia: localStorage
   Elaborado por: Yeison Fabian Martinez Teatino
   ================================================================ */
(function () {
    'use strict';

    /* ── Protección de ruta ──────────────────────────────────── */
    if (sessionStorage.getItem('sga_auth') !== '1') {
        window.location.replace('index.html');
        return;
    }

    /* ── Claves de almacenamiento ────────────────────────────── */
    var KEY_EVENTOS       = 'sga_eventos';
    var KEY_PARTICIPANTES = 'sga_participantes';
    var KEY_EV_ID         = 'sga_ev_id';
    var KEY_PA_ID         = 'sga_pa_id';

    /* ── Helpers de persistencia ─────────────────────────────── */
    function load(key, def) {
        try { return JSON.parse(localStorage.getItem(key)) || def; }
        catch (e) { return def; }
    }
    function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

    function getEventos()       { return load(KEY_EVENTOS, []); }
    function getParticipantes() { return load(KEY_PARTICIPANTES, []); }
    function nextEvId()  { var n = load(KEY_EV_ID, 1); save(KEY_EV_ID, n + 1); return n; }
    function nextPaId()  { var n = load(KEY_PA_ID, 1); save(KEY_PA_ID, n + 1); return n; }
    function saveEventos(d)       { save(KEY_EVENTOS, d); }
    function saveParticipantes(d) { save(KEY_PARTICIPANTES, d); }

    /* ── Helpers de UI ───────────────────────────────────────── */
    function el(id) { return document.getElementById(id); }

    function showAlert(id, msg) {
        var e = el(id); if (!e) return;
        e.textContent = msg; e.classList.add('show');
    }
    function hideAlert(id) {
        var e = el(id); if (!e) return;
        e.textContent = ''; e.classList.remove('show');
    }
    function autoHide(id, ms) { setTimeout(function () { hideAlert(id); }, ms || 3000); }

    function clearAllAlerts() {
        ['errorEvento','mensajeEvento','errorInscripcion','mensajeInscripcion',
         'errorReporte','mensajeReporte','mensajeExportar'].forEach(hideAlert);
    }

    function setVal(id, v) { var e = el(id); if (e) e.value = v || ''; }
    function getVal(id) { var e = el(id); return e ? e.value.trim() : ''; }

    function formatDate(iso) {
        /* iso = YYYY-MM-DD */
        var p = iso.split('-');
        if (p.length !== 3) return iso;
        var m = ['enero','febrero','marzo','abril','mayo','junio',
                 'julio','agosto','septiembre','octubre','noviembre','diciembre'];
        return parseInt(p[2], 10) + ' de ' + m[parseInt(p[1], 10) - 1] + ' de ' + p[0];
    }

    function esc(s) {
        return String(s)
            .replace(/&/g,'&amp;').replace(/</g,'&lt;')
            .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    /* ── Navegación ──────────────────────────────────────────── */
    var SECTIONS = {
        seccionEventos:     { menu: 'menuEventos',    bc: 'Inicio / Eventos Académicos' },
        seccionInscripcion: { menu: 'menuInscripcion', bc: 'Inicio / Inscripción de Participantes' },
        seccionReportes:    { menu: 'menuReportes',   bc: 'Inicio / Reportes' }
    };

    function navigateTo(sectionId) {
        /* Ocultar secciones y desactivar menú */
        document.querySelectorAll('.section').forEach(function (s) {
            s.classList.remove('section--active');
        });
        document.querySelectorAll('.nav-link[data-section]').forEach(function (n) {
            n.classList.remove('nav-link--active');
        });

        /* Activar sección */
        var sec = el(sectionId);
        if (sec) sec.classList.add('section--active');

        /* Activar ítem del menú y breadcrumb */
        var info = SECTIONS[sectionId];
        if (info) {
            var navEl = el(info.menu);
            if (navEl) navEl.classList.add('nav-link--active');
            var bc = el('breadcrumbText');
            if (bc) bc.textContent = info.bc;
        }

        /* Refrescar selectores */
        if (sectionId === 'seccionInscripcion') {
            fillSelect('selectEvento');
            renderParticipantes();
        }
        if (sectionId === 'seccionReportes') {
            fillSelect('reporteEvento');
        }

        clearAllAlerts();
        window.scrollTo(0, 0);
    }

    /* ── Bootstrap ───────────────────────────────────────────── */
    document.addEventListener('DOMContentLoaded', function () {

        /* Usuario en UI */
        var user = sessionStorage.getItem('sga_user') || 'admin';
        ['topbarUserName','sidebarUserName'].forEach(function (id) {
            var e = el(id);
            if (e) e.textContent = user.charAt(0).toUpperCase() + user.slice(1);
        });

        /* Navegación */
        document.querySelectorAll('.nav-link[data-section]').forEach(function (item) {
            item.addEventListener('click', function (e) {
                e.preventDefault();
                navigateTo(this.getAttribute('data-section'));
            });
        });

        /* Logout */
        el('logout').addEventListener('click', function (e) {
            e.preventDefault();
            sessionStorage.removeItem('sga_auth');
            sessionStorage.removeItem('sga_user');
            window.location.href = 'index.html';
        });

        /* Eventos */
        el('btnNuevoEvento').addEventListener('click', openFormEvento);
        el('btnCancelarEvento').addEventListener('click', closeFormEvento);
        el('btnGuardarEvento').addEventListener('click', guardarEvento);
        el('formEvento').addEventListener('submit', guardarEvento);

        /* Inscripción */
        el('btnInscribir').addEventListener('click', inscribirParticipante);
        el('formInscripcion').addEventListener('submit', inscribirParticipante);
        el('btnLimpiarInscripcion').addEventListener('click', limpiarFormInscripcion);

        /* Reportes */
        el('btnReporte').addEventListener('click', generarReporte);
        el('btnExportar').addEventListener('click', exportarReporte);

        /* Render inicial */
        renderEventos();
        navigateTo('seccionEventos');
    });


    /* ================================================================
       MÓDULO: GESTIÓN DE EVENTOS
       ================================================================ */

    function openFormEvento() {
        el('formularioEvento').classList.remove('d-none');
        limpiarFormEvento();
        el('eventoNombre').focus();
    }

    function closeFormEvento() {
        el('formularioEvento').classList.add('d-none');
        limpiarFormEvento();
    }

    function limpiarFormEvento() {
        ['eventoNombre','eventoInicio','eventoFin','eventoDescripcion'].forEach(function (id) {
            setVal(id, '');
        });
        hideAlert('errorEvento');
        hideAlert('mensajeEvento');
    }

    function guardarEvento(e) {
        e.preventDefault();
        hideAlert('errorEvento');
        hideAlert('mensajeEvento');

        var nombre      = getVal('eventoNombre');
        var inicio      = getVal('eventoInicio');
        var fin         = getVal('eventoFin');
        var descripcion = getVal('eventoDescripcion');

        if (!nombre) {
            showAlert('errorEvento', 'El nombre del evento es obligatorio.');
            el('eventoNombre').focus(); return;
        }
        if (!inicio) {
            showAlert('errorEvento', 'La fecha de inicio es obligatoria.'); return;
        }
        if (!fin) {
            showAlert('errorEvento', 'La fecha de fin es obligatoria.'); return;
        }
        if (fin < inicio) {
            showAlert('errorEvento', 'La fecha de fin debe ser posterior a la de inicio.'); return;
        }
        if (!descripcion) {
            showAlert('errorEvento', 'La descripción del evento es obligatoria.');
            el('eventoDescripcion').focus(); return;
        }

        var eventos = getEventos();
        eventos.push({
            id: nextEvId(), nombre: nombre,
            fechaInicio: inicio, fechaFin: fin,
            descripcion: descripcion,
            creadoEn: new Date().toISOString()
        });
        saveEventos(eventos);

        showAlert('mensajeEvento', 'Evento creado exitosamente');
        autoHide('mensajeEvento', 2500);
        limpiarFormEvento();
        renderEventos();
        /* Cerrar form automáticamente */
        setTimeout(closeFormEvento, 2600);
    }

    function renderEventos() {
        var container = el('listaEventos');
        var badge     = el('contadorEventos');
        var eventos   = getEventos();

        if (badge) badge.textContent = eventos.length + ' evento' + (eventos.length !== 1 ? 's' : '');

        if (!eventos.length) {
            container.innerHTML = buildEmptyState(
                '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
                'No hay eventos registrados',
                'Haga clic en "Nuevo Evento" para crear el primero.'
            );
            return;
        }

        var html = '';
        eventos.forEach(function (ev) {
            var count = getParticipantes().filter(function (p) { return p.eventoId === ev.id; }).length;
            html += '<div class="evento-card" data-evento-id="' + ev.id + '">'
                + '<div class="evento-card-top">'
                +   '<span class="evento-card-name">' + esc(ev.nombre) + '</span>'
                +   '<span class="evento-card-badge">'
                +     '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>'
                +     count + ' participante' + (count !== 1 ? 's' : '')
                +   '</span>'
                + '</div>'
                + '<div class="evento-card-meta">'
                +   '<div class="meta-item"><strong>Fecha Inicio</strong>' + formatDate(ev.fechaInicio) + '</div>'
                +   '<div class="meta-item"><strong>Fecha Fin</strong>' + formatDate(ev.fechaFin) + '</div>'
                +   '<div class="meta-item meta-item--full"><strong>Descripcion</strong>' + esc(ev.descripcion) + '</div>'
                + '</div>'
                + '</div>';
        });
        container.innerHTML = html;
    }

    /* ================================================================
       MÓDULO: INSCRIPCIÓN DE PARTICIPANTES
       ================================================================ */

    function fillSelect(selectId) {
        var sel = el(selectId);
        if (!sel) return;
        var eventos = getEventos();
        sel.innerHTML = '<option value="">-- Seleccione un evento --</option>';
        eventos.forEach(function (ev) {
            var opt = document.createElement('option');
            opt.value = ev.id;
            opt.textContent = ev.nombre;
            sel.appendChild(opt);
        });
    }

    function inscribirParticipante(e) {
        e.preventDefault();
        hideAlert('errorInscripcion');
        hideAlert('mensajeInscripcion');

        var eventoId = parseInt(getVal('selectEvento'), 10);
        var nombre   = getVal('participanteNombre');
        var email    = getVal('participanteEmail');
        var idNum    = getVal('participanteId');

        if (!eventoId) {
            showAlert('errorInscripcion', 'Debe seleccionar un evento.'); return;
        }
        if (!nombre) {
            showAlert('errorInscripcion', 'El nombre del participante es obligatorio.');
            el('participanteNombre').focus(); return;
        }
        if (!email) {
            showAlert('errorInscripcion', 'El correo electrónico es obligatorio.');
            el('participanteEmail').focus(); return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showAlert('errorInscripcion', 'El formato del correo electrónico no es válido.');
            el('participanteEmail').focus(); return;
        }
        if (!idNum) {
            showAlert('errorInscripcion', 'El número de identificación es obligatorio.');
            el('participanteId').focus(); return;
        }

        var eventos = getEventos();
        var evento  = eventos.find(function (ev) { return ev.id === eventoId; });
        if (!evento) {
            showAlert('errorInscripcion', 'El evento seleccionado no existe.'); return;
        }

        var participantes = getParticipantes();
        participantes.push({
            id: nextPaId(), eventoId: eventoId,
            eventoNombre: evento.nombre,
            nombre: nombre, email: email,
            identificacion: idNum,
            inscritoEn: new Date().toISOString()
        });
        saveParticipantes(participantes);

        showAlert('mensajeInscripcion', 'Inscripción exitosa');
        autoHide('mensajeInscripcion', 3000);
        limpiarFormInscripcion();
        renderParticipantes();
        renderEventos();
    }

    function limpiarFormInscripcion() {
        ['selectEvento','participanteNombre','participanteEmail','participanteId'].forEach(function (id) {
            setVal(id, '');
        });
        hideAlert('errorInscripcion');
        hideAlert('mensajeInscripcion');
    }

    function renderParticipantes() {
        var container     = el('listaParticipantes');
        var badge         = el('contadorParticipantes');
        var participantes = getParticipantes();

        if (badge) badge.textContent = participantes.length + ' participante' + (participantes.length !== 1 ? 's' : '');

        if (!participantes.length) {
            container.innerHTML = buildEmptyState(
                '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
                'No hay participantes inscritos',
                'Complete el formulario para inscribir participantes.'
            );
            return;
        }

        var html = '';
        participantes.forEach(function (p) {
            html += '<div class="participante-row" data-participante-id="' + p.id + '">'
                + '<div class="pr-field"><strong>Nombre</strong><span>' + esc(p.nombre) + '</span></div>'
                + '<div class="pr-field"><strong>Email</strong><span>' + esc(p.email) + '</span></div>'
                + '<div class="pr-field"><strong>Identificación</strong><span>' + esc(p.identificacion) + '</span></div>'
                + '<div class="pr-field"><strong>Evento</strong>'
                +   '<span class="pr-evento-tag">' + esc(p.eventoNombre) + '</span>'
                + '</div>'
                + '</div>';
        });
        container.innerHTML = html;
    }

    /* ================================================================
       MÓDULO: REPORTES
       ================================================================ */

    function generarReporte() {
        hideAlert('mensajeReporte');
        hideAlert('errorReporte');
        hideAlert('mensajeExportar');

        var eventoId = parseInt(getVal('reporteEvento'), 10);

        if (!eventoId) {
            showAlert('errorReporte', 'Debe seleccionar un evento para generar el reporte.');
            el('contenedorReporte').classList.add('d-none');
            return;
        }

        var evento = getEventos().find(function (ev) { return ev.id === eventoId; });
        if (!evento) {
            showAlert('errorReporte', 'El evento seleccionado no existe.');
            return;
        }

        var lista = getParticipantes().filter(function (p) { return p.eventoId === eventoId; });

        /* Título */
        var titulo = el('tituloReporte');
        if (titulo) titulo.textContent = 'Reporte — ' + evento.nombre;

        /* Tabla */
        var tablaEl = el('tablaReporte');
        if (!lista.length) {
            tablaEl.innerHTML = '<p class="table-no-data">No hay participantes inscritos en este evento.</p>';
        } else {
            var rows = lista.map(function (p, i) {
                var f = new Date(p.inscritoEn).toLocaleString('es-CO');
                return '<tr>'
                    + '<td>' + (i + 1) + '</td>'
                    + '<td>' + esc(p.nombre) + '</td>'
                    + '<td>' + esc(p.email) + '</td>'
                    + '<td>' + esc(p.identificacion) + '</td>'
                    + '<td>' + f + '</td>'
                    + '</tr>';
            }).join('');

            tablaEl.innerHTML = '<table>'
                + '<thead><tr>'
                + '<th>#</th><th>Nombre Completo</th><th>Correo Electrónico</th>'
                + '<th>Identificación</th><th>Fecha de Inscripción</th>'
                + '</tr></thead><tbody>' + rows + '</tbody></table>';
        }

        el('contenedorReporte').classList.remove('d-none');
        showAlert('mensajeReporte', 'Reporte generado correctamente');
        autoHide('mensajeReporte', 3000);
    }

    function exportarReporte() {
        hideAlert('mensajeExportar');
        var eventoId = parseInt(getVal('reporteEvento'), 10);
        if (!eventoId) return;

        var evento = getEventos().find(function (ev) { return ev.id === eventoId; });
        if (!evento) return;

        var lista = getParticipantes().filter(function (p) { return p.eventoId === eventoId; });

        var lines = [
            'Evento:,' + evento.nombre,
            'Generado:,' + new Date().toLocaleString('es-CO'),
            '',
            '#,Nombre Completo,Correo Electrónico,Identificación,Fecha de Inscripción'
        ];
        lista.forEach(function (p, i) {
            var f = new Date(p.inscritoEn).toLocaleString('es-CO');
            lines.push(
                (i + 1) + ',"' + p.nombre + '","' + p.email + '","' + p.identificacion + '","' + f + '"'
            );
        });

        var csv  = '\uFEFF' + lines.join('\n');
        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        var url  = URL.createObjectURL(blob);
        var a    = document.createElement('a');
        a.href     = url;
        a.download = 'reporte_' + evento.nombre.replace(/\s+/g, '_') + '.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showAlert('mensajeExportar', 'Reporte generado correctamente');
        autoHide('mensajeExportar', 3000);
    }

    /* ── Helpers HTML ───────────────────────────────────────────── */
    function buildEmptyState(svgPath, title, desc) {
        return '<div class="empty-state">'
            + '<div class="empty-state-icon">'
            + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">'
            + svgPath + '</svg></div>'
            + '<p class="empty-state-title">' + title + '</p>'
            + '<p class="empty-state-desc">' + desc + '</p>'
            + '</div>';
    }

}());
