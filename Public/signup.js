document.getElementById("signupForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const phone = document.getElementById("phone").value;
    const password = document.getElementById("password").value;

    try {
      const response = await axios.post("/", {
        name,
        email,
        phone,
        password
      });

      if (response.data.success) {
        alert("✅ Signup successful!");
        // Optional redirect
      } else {
        alert("⚠️ Signup failed: " + response.data.message);
      }
    } catch (error) {
      console.error(error);
      alert("❌ Something went wrong: " + (error.response?.data || "Unknown error"));
    }

})