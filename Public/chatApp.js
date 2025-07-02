const socket = io();
const chatBox = document.getElementById("chat-box");
const form = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");

const token = localStorage.getItem("token");
let username = "Anonymous";

// 👇 Fetch username using token
if (token) {
  axios.get("/user/details", {
    headers: { Authorization: `Bearer ${token}` }
  })
  .then((response) => {
    username = response.data.name;
    socket.emit("join", username);
  });
}

socket.on("user-joined", (msg) => {
  appendSystemMessage(msg);
});

socket.on("receive", (data) => {
  const isOwnMessage = data.username === username;
  const displayName = isOwnMessage ? "You" : data.username;
  appendMessage(`${displayName}: ${data.message}`);
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const msg = messageInput.value.trim();
  if (msg) {
    socket.emit("send", { message: msg });
    messageInput.value = "";
  }
});

function appendMessage(msg) {
  const div = document.createElement("div");
  div.classList.add("message");
  div.innerText = msg;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function appendSystemMessage(msg) {
  const div = document.createElement("div");
  div.classList.add("message", "system");
  div.innerText = msg;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}
