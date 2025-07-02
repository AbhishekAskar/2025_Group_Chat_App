document.getElementById("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const formData = {
        email: document.getElementById("email").value,
        password: document.getElementById("password").value
    }

    try {
        const response = await axios.post('/login', formData);

        if (response.data.success) {
            alert("Login successful!");
        } else {
            alert("Login failed: " + response.data.message);
        }
    } catch (error) {
        console.error(error);
        alert((error.response?.data || "Unknown error"));
    }

})