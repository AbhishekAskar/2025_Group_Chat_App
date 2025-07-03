document.getElementById("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const formData = {
        email: document.getElementById("email").value,
        password: document.getElementById("password").value
    }

    try {
        const response = await axios.post('/login', formData);

        const token = response.data.token;
        sessionStorage.setItem("token", token);
        console.log(token);

        if (response.data.success) {
            window.location.href = "/chatApp.html";
        } else {
            alert("Login failed: " + response.data.message);
        }
    } catch (error) {
        console.error(error);
        alert((error.response?.data || "Unknown error"));
    }

})