/* ================================================================
   AUTH.JS — Módulo de autenticación
   Página: index.html
   Credenciales válidas: admin / 12345
   Al autenticar redirige a dashboard.html
   ================================================================ */
(function () {
    'use strict';

    /* Si ya existe sesión activa, ir directo al dashboard */
    if (sessionStorage.getItem('sga_auth') === '1') {
        window.location.replace('dashboard.html');
        return;
    }

    document.addEventListener('DOMContentLoaded', function () {

        var form     = document.getElementById('loginForm');
        var errorBox = document.getElementById('loginError');

        /* ── helpers ── */
        function showError(msg) {
            errorBox.textContent = msg;
            errorBox.classList.add('show');
            document.getElementById('password').value = '';
            document.getElementById('password').focus();
        }

        function clearError() {
            errorBox.textContent = '';
            errorBox.classList.remove('show');
        }

        /* ── lógica de login ── */
        function doLogin(e) {
            e.preventDefault();
            clearError();

            var user = document.getElementById('username').value.trim();
            var pass = document.getElementById('password').value;

            if (!user || !pass) {
                showError('Por favor ingrese usuario y contraseña.');
                return;
            }

            if (user === 'admin' && pass === '12345') {
                sessionStorage.setItem('sga_auth', '1');
                sessionStorage.setItem('sga_user', user);
                window.location.href = 'dashboard.html';
            } else {
                showError('Credenciales inválidas');
            }
        }

        form.addEventListener('submit', doLogin);
    });

}());
