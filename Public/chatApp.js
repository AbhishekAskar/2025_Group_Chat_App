// ✅ Final chatApp.js using sessionStorage to prevent tripling bug
const token = sessionStorage.getItem("token");
let currentUser = null;
let lastMessageId = 0;
const messageSet = new Set(); // 🧠 Track shown messages

// 👤 Get current user's name
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

// 💬 Load messages from sessionStorage
function loadMessagesFromSession(currentUser) {
  const stored = JSON.parse(sessionStorage.getItem("chatMessages")) || [];

  stored.forEach(msg => {
    const label = msg.sender === currentUser ? "You" : msg.sender;
    appendMessage(`${label}: ${msg.content}`);
    messageSet.add(msg.id);
    lastMessageId = Math.max(lastMessageId, msg.id);
  });

  scrollToBottom();
}

// 🔁 Poll backend for new messages
async function pollNewMessages() {
  try {
    const res = await axios.get("/messages", {
      headers: { Authorization: `Bearer ${token}` }
    });

    const allMessages = res.data;
    const newMessages = allMessages.filter(msg => msg.id > lastMessageId);

    newMessages.forEach(msg => {
      if (!messageSet.has(msg.id)) {
        const label = msg.sender === currentUser ? "You" : msg.sender;
        appendMessage(`${label}: ${msg.content}`);
        saveToSessionStorageLimited(msg);
        messageSet.add(msg.id);
        lastMessageId = Math.max(lastMessageId, msg.id);
      }
    });

    if (newMessages.length > 0) scrollToBottom();
  } catch (err) {
    console.error("Polling error:", err);
  }
}

// 📤 Send message
async function sendMessage(content) {
  try {
    await axios.post("/message", { content }, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (err) {
    console.error("Failed to send message", err);
  }
}

// 💾 Save last 10 messages to sessionStorage
function saveToSessionStorageLimited(message) {
  let stored = JSON.parse(sessionStorage.getItem("chatMessages")) || [];
  stored.push(message);
  if (stored.length > 10) {
    stored = stored.slice(-10); // Keep last 10
  }
  sessionStorage.setItem("chatMessages", JSON.stringify(stored));
}

// 🧾 Append chat message
function appendMessage(msg) {
  const chatBox = document.getElementById("chatBox");
  const div = document.createElement("div");
  div.textContent = msg;
  chatBox.appendChild(div);
}

// ⬇️ Scroll to bottom
function scrollToBottom() {
  const chatBox = document.getElementById("chatBox");
  chatBox.scrollTop = chatBox.scrollHeight;
}

// 🔓 Logout
function logout() {
  sessionStorage.clear();
  window.location.href = "/login.html";
}

// 📩 On message submit
document.getElementById("chatForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("messageInput");
  const message = input.value.trim();
  if (message) {
    await sendMessage(message);
    input.value = "";
  }
});

// 🔘 Logout button click
document.getElementById("logoutBtn").addEventListener("click", logout);

// 🚀 Initialize chat on page load
(async () => {
  currentUser = await getUsername();
  if (currentUser) {
    loadMessagesFromSession(currentUser);
    setInterval(pollNewMessages, 1000); // ⏱️ Poll every second
  }
})();
