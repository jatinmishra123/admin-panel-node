document.getElementById("loginForm").addEventListener("submit", async function(e) {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        const response = await fetch("/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem("token", data.token);
            alert("Login Successful");
            window.location.href = "/dashboard";
        } else {
            alert(data.message);
        }

    } catch (error) {
        alert("Login failed");
    }
});