document.getElementById("signupForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const formData = {
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        phone: document.getElementById("phone").value,
        password: document.getElementById("password").value
    }

    try {
        const response = await axios.post("/", formData);

        if (response.data.success) {
            alert("Signup successful!");
            window.location.href = "/login.html";
        } else {
            alert("Signup failed: " + response.data.message);
        }
    } catch (error) {
        console.error(error);
        alert("Something went wrong: " + (error.response?.data || "Unknown error"));
    }

})