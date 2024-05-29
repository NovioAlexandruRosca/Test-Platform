document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('form');

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); 
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            if (response.ok) {
                console.log('Client authenticated successfully');
                window.location.href = "/test";
            } else {
                console.error('Authentication failed');

                const errorMessage = document.createElement('div');
                errorMessage.textContent = 'Authentication failed.';
                errorMessage.style.color = 'red';
                errorMessage.style.textAlign = 'center';
                loginForm.appendChild(errorMessage);

                setTimeout(() => {
                    errorMessage.remove();
                }, 5000);
            }
        } catch (error) {
            console.error('Error:', error.message);
        }
       
    });
});