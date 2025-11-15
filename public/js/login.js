document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const messageEl = document.getElementById('message');

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
        });

        const data = await response.json();

        if (data.success) {
            messageEl.textContent = 'A magic link has been sent to your email.';
            messageEl.style.color = 'green';
        } else {
            messageEl.textContent = 'An error occurred. Please try again.';
            messageEl.style.color = 'red';
        }
    } catch (error) {
        messageEl.textContent = 'An error occurred. Please try again.';
        messageEl.style.color = 'red';
    }
});
