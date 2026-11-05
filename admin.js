
const ADMIN_UID = "1e0558dc-839f-4c35-b384-6ae80fb69228";

const loginForm = document.getElementById("login-form");
const loginButton = document.getElementById("login-button");
const loginMessage = document.getElementById("login-message");

loginForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    loginButton.disabled = true;
    loginButton.textContent = "Entrando...";
    loginMessage.textContent = "";

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            throw error;
        }

        // Verificar se a conta é o administrador autorizado
        if (data.user.id !== ADMIN_UID) {
            await supabaseClient.auth.signOut();

            throw new Error("Esta conta não tem autorização para acessar o painel.");
        }

        loginMessage.style.color = "green";
        loginMessage.textContent = "Login realizado! Redirecionando...";

        window.location.href = "dashboard.html";

    } catch (error) {
        loginMessage.style.color = "#c0392b";
        loginMessage.textContent = error.message;

        loginButton.disabled = false;
        loginButton.textContent = "Entrar no painel";
    }
});
