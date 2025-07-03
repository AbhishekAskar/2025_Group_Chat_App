const token = sessionStorage.getItem("token");
let currentUser = null;
let lastMessageId = 0; // 🆕 Track last message shown

// 👤 Get username from backend and store per-tab
async function getUsername() {
  try {
    const res = await axios.get("/user/details", {
      headers: { Authorization: `Bearer ${token}` }
    });

    const name = res.data.name;
    sessionStorage.setItem("username", name);
    return name;
  } catch (err) {
    console.error("Failed to get user details", err);
    return null;
  }
}

// 💬 Load all messages (initial load)
async function loadMessages(currentUser) {
  try {
    const res = await axios.get("/messages", {
      headers: { Authorization: `Bearer ${token}` }
    });

    const chatBox = document.getElementById("chatBox");
    chatBox.innerHTML = "";

    const messages = res.data;
    const uniqueUsers = [...new Set(messages.map(msg => msg.sender))];

    uniqueUsers.forEach(name => {
      appendJoinMessage(name === currentUser ? "You joined" : `${name} joined`);
    });

    messages.forEach(msg => {
      const label = msg.sender === currentUser ? "You" : msg.sender;
      appendMessage(`${label}: ${msg.content}`);
      lastMessageId = Math.max(lastMessageId, msg.id); // 🆕 Track highest message ID
    });

    scrollToBottom();
  } catch (err) {
    console.error("Failed to load messages", err);
  }
}

// 🔁 Real-time polling (every second)
async function pollNewMessages() {
  try {
    const res = await axios.get("/messages", {
      headers: { Authorization: `Bearer ${token}` }
    });

    const messages = res.data;

    const newMessages = messages.filter(msg => msg.id > lastMessageId);
    newMessages.forEach(msg => {
      const label = msg.sender === currentUser ? "You" : msg.sender;
      appendMessage(`${label}: ${msg.content}`);
      lastMessageId = Math.max(lastMessageId, msg.id);
    });

    if (newMessages.length > 0) scrollToBottom();
  } catch (err) {
    console.error("Polling error:", err);
  }
}

// 📤 Send a message
async function sendMessage(content) {
  try {
    await axios.post("/message", { content }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    // Don't reload entire chat — polling will catch it
  } catch (err) {
    console.error("Failed to send message", err);
  }
}

// 🧾 Append message
function appendMessage(msg) {
  const chatBox = document.getElementById("chatBox");
  const div = document.createElement("div");
  div.textContent = msg;
  chatBox.appendChild(div);
}

// 👥 Append join info
function appendJoinMessage(msg) {
  const chatBox = document.getElementById("chatBox");
  const div = document.createElement("div");
  div.textContent = msg;
  div.style.fontStyle = "italic";
  div.style.color = "gray";
  chatBox.appendChild(div);
}

// 🔓 Logout function
function logout() {
  sessionStorage.removeItem("token");
  sessionStorage.clear();
  window.location.href = "/login.html";
}

// ⬇️ Auto scroll chat
function scrollToBottom() {
  const chatBox = document.getElementById("chatBox");
  chatBox.scrollTop = chatBox.scrollHeight;
}

// ✉️ On submit
document.getElementById("chatForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("messageInput");
  const message = input.value.trim();
  if (message) {
    await sendMessage(message);
    input.value = "";
  }
});

// 🔘 Logout button
document.getElementById("logoutBtn").addEventListener("click", logout);

// 🚀 On page load
(async () => {
  currentUser = await getUsername();
  if (currentUser) {
    await loadMessages(currentUser);
    setInterval(pollNewMessages, 1000); // ⏱️ Poll every second
  }
})();
