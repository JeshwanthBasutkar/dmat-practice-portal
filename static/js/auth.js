async function handleLoginSubmit(e) {
    e.preventDefault();
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    const errDiv = document.getElementById('login-error');
    if (errDiv) errDiv.classList.add('hidden');

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: usernameInput.value, password: passwordInput.value })
        });

        const data = await res.json();
        if (data.success) {
            window.location.href = '/dashboard';
        } else if (errDiv) {
            errDiv.innerText = data.message;
            errDiv.classList.remove('hidden');
        }
    } catch (err) {
        if (errDiv) {
            errDiv.innerText = "Login failed. Please check server connection.";
            errDiv.classList.remove('hidden');
        }
    }
}

async function handleRegisterSubmit(e) {
    e.preventDefault();
    const usernameInput = document.getElementById('register-username');
    const passwordInput = document.getElementById('register-password');
    const errDiv = document.getElementById('register-error');
    if (errDiv) errDiv.classList.add('hidden');

    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: usernameInput.value, password: passwordInput.value })
        });

        const data = await res.json();
        if (data.success) {
            window.location.href = '/dashboard';
        } else if (errDiv) {
            errDiv.innerText = data.message;
            errDiv.classList.remove('hidden');
        }
    } catch (err) {
        if (errDiv) {
            errDiv.innerText = "Registration failed. Please check server connection.";
            errDiv.classList.remove('hidden');
        }
    }
}
