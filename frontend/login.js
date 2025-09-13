document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('login-btn');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');

    
    sessionStorage.removeItem('userRole');

    async function handleLogin() {
        const username = usernameInput.value;
        const password = passwordInput.value;

        if (!username || !password) {
            errorMessage.textContent = 'Por favor, preencha ambos os campos.';
            return;
        }

        try {
            const response = await fetch('https://chatbot-empresa-production.up.railway.app/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (data.success) {
                
                sessionStorage.setItem('userRole', data.role);
                window.location.href = 'index.html'; 
            } else {
                errorMessage.textContent = 'Usuário ou senha inválidos.';
            }
        } catch (error) {
            errorMessage.textContent = 'Erro de conexão com o servidor.';
        }
    }

    loginBtn.addEventListener('click', handleLogin);
    passwordInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            handleLogin();
        }
    });
});
