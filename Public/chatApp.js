const token = sessionStorage.getItem("token");
const socket = io();
socket.off("receive-message");

socket.on("receive-message", (msg) => {
  const isGlobal = isInGlobalChat && !msg.groupId;
  const isCurrentGroup = selectedGroupId && msg.groupId == selectedGroupId;

  if (isGlobal || isCurrentGroup) {
    const label = msg.sender === currentUser ? "You" : msg.sender;
    appendMessage(label, msg.text, msg.mediaUrl);
    scrollToBottom();
  }
});

let currentUser = null;
let selectedGroupId = null;
let lastMessageId = 0;
let allUsers = [];
let currentGroupMembers = [];
let isInGlobalChat = false;
let lastGlobalMessageId = 0;

selectedGroupId = localStorage.getItem("selectedGroupId") || null;
isInGlobalChat = localStorage.getItem("isInGlobalChat") === "true";


async function loadGlobalChat() {
  selectedGroupId = null;
  isInGlobalChat = true;

  if (socket.currentRoom) leaveRoom(socket.currentRoom);
  await joinRoom("global");
  socket.currentRoom = "global";

  localStorage.setItem("selectedGroupId", "");
  localStorage.setItem("isInGlobalChat", "true");
  lastMessageId = 0;

  document.getElementById("groupName").textContent = "🌐 Public Chat";
  document.getElementById("chatBox").innerHTML = "";
  document.getElementById("inviteSection").style.display = "none";
  document.getElementById("groupMembers").style.display = "none";

  try {
    const res = await axios.get("/group/global/messages", {
      headers: { Authorization: `Bearer ${token}` }
    });

    res.data.forEach(msg => {
      const label = msg.sender === currentUser ? "You" : msg.sender;
      appendMessage(label, msg.text, msg.mediaUrl);
      lastMessageId = Math.max(lastMessageId, msg.id);
      console.log("📦 message object received:", msg);

    });

    scrollToBottom();
  } catch (err) {
    console.error("Error loading global messages", err);
  }
}

async function sendMessage(text) {
  if (selectedGroupId === null) {
    try {
      await axios.post("/group/global/message", { text }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error("Error sending global message", err);
    }
  } else {
    try {
      await axios.post(`/group/${selectedGroupId}/message`, {
        text,
        groupId: selectedGroupId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error("Error sending message", err);
    }
  }
}


async function getUsername() {
  try {
    const res = await axios.get("/details", {
      headers: { Authorization: `Bearer ${token}` }
    });
    currentUser = res.data.name;
    sessionStorage.setItem("username", currentUser);
  } catch (err) {
    console.error("Error getting user", err);
  }
}

async function fetchUsers() {
  try {
    const res = await axios.get("/all", {
      headers: { Authorization: `Bearer ${token}` }
    });
    allUsers = res.data;
    console.log("All Users:", allUsers);
  } catch (err) {
    console.error("Error fetching user list", err);
  }
}

async function renderUserCheckboxes() {
  const query = document.getElementById("searchInput").value.trim();

  if (!query || !selectedGroupId) {
    document.getElementById("userListContainer").innerHTML = "";
    return;
  }

  try {
    const res = await axios.get(`/group/${selectedGroupId}/search-users?query=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const container = document.getElementById("userListContainer");
    container.innerHTML = "";

    if (res.data.length === 0) {
      container.innerHTML = "<p>No users found</p>";
      return;
    }

    res.data.forEach(user => {
      const label = document.createElement("label");
      label.style.display = "block";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = user.id;

      label.appendChild(checkbox);
      label.append(` ${user.name} (${user.email || user.phone})`);
      container.appendChild(label);
    });

  } catch (err) {
    console.error("Error searching users", err);
  }
}

document.getElementById("searchInput").addEventListener("input", () => {
  clearTimeout(window._searchTimeout);
  window._searchTimeout = setTimeout(renderUserCheckboxes, 300);
});


document.getElementById("searchInput").addEventListener("input", renderUserCheckboxes);

document.getElementById("searchInput").addEventListener("input", (e) => {
  const query = e.target.value.toLowerCase();
  const checkboxes = document.querySelectorAll("#userListContainer label");
  checkboxes.forEach(label => {
    const name = label.textContent.toLowerCase();
    label.style.display = name.includes(query) ? "block" : "none";
  });
});

async function fetchGroups() {
  try {
    const res = await axios.get("/group/mygroups", {
      headers: { Authorization: `Bearer ${token}` }
    });

    const groupsContainer = document.getElementById("groupsContainer");
    groupsContainer.innerHTML = "";

    res.data.forEach(group => {
      const div = document.createElement("div");
      div.textContent = group.name;
      div.classList.add("groupItem");
      div.onclick = () => loadGroup(group.id, group.name);
      groupsContainer.appendChild(div);
    });
  } catch (err) {
    console.error("Error loading groups", err);
  }
}

async function loadGroup(groupId, groupName) {
  selectedGroupId = groupId;
  isInGlobalChat = false;

  if (socket.currentRoom) leaveRoom(socket.currentRoom);
  await joinRoom(groupId);
  socket.currentRoom = groupId;

  localStorage.setItem("selectedGroupId", groupId);
  localStorage.setItem("isInGlobalChat", "false");
  lastMessageId = 0;
  document.getElementById("groupName").textContent = groupName;
  document.getElementById("chatBox").innerHTML = "";
  document.getElementById("inviteSection").style.display = "block";

  await loadGroupMembers(groupId);
  await fetchUsers();

  renderUserCheckboxes();

  try {
    const res = await axios.get(`/group/${groupId}/messages`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    res.data.forEach(msg => {
      const label = msg.sender === currentUser ? "You" : msg.sender;
      appendMessage(label, msg.text, msg.mediaUrl);
      lastMessageId = Math.max(lastMessageId, msg.id);
      console.log("📦 message object received:", msg);

    });

    scrollToBottom();
  } catch (err) {
    console.error("Error loading group messages", err);
  }
}

document.getElementById("groupName").addEventListener("click", () => {
  const infoContainer = document.getElementById("groupInfoContainer");
  if (infoContainer.classList.contains("hidden")) {
    infoContainer.classList.remove("hidden");
  } else {
    infoContainer.classList.add("hidden");
  }
});

async function loadGroupMembers(groupId) {
  try {
    const res = await axios.get(`/group/${groupId}/members`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    currentGroupMembers = res.data.map(m => m.id);

    const currentUserObj = res.data.find(m => m.name === currentUser);
    const isCurrentUserAdmin = currentUserObj?.isAdmin;

    document.getElementById("inviteSection").style.display = isCurrentUserAdmin ? "block" : "none";

    const list = document.getElementById("membersList");
    list.innerHTML = "";

    for (const member of res.data) {
      const li = document.createElement("li");
      li.style.display = "flex";
      li.style.justifyContent = "space-between";
      li.style.alignItems = "center";

      let nameLabel = member.name;
      if (member.isAdmin) nameLabel += " (Admin)";
      const nameSpan = document.createElement("span");
      nameSpan.textContent = nameLabel;

      const controls = document.createElement("div");
      controls.style.display = "flex";
      controls.style.gap = "5px";

      const isYou = member.name === currentUser;

      if (isCurrentUserAdmin && !isYou) {
        if (!member.isAdmin) {
          const promoteBtn = document.createElement("button");
          promoteBtn.textContent = "Make Admin";
          promoteBtn.onclick = async () => {
            try {
              await axios.post("/group/promote", {
                groupId,
                userId: member.id
              }, {
                headers: { Authorization: `Bearer ${token}` }
              });
              alert(`${member.name} promoted to admin`);
              await loadGroupMembers(groupId);
            } catch (err) {
              console.error("Promote failed", err);
            }
          };
          controls.appendChild(promoteBtn);
        }

        if (!member.isAdmin) {
          const removeBtn = document.createElement("button");
          removeBtn.textContent = "Remove";
          removeBtn.onclick = async () => {
            try {
              await axios.post("/group/remove", {
                groupId,
                userId: member.id
              }, {
                headers: { Authorization: `Bearer ${token}` }
              });
              alert(`${member.name} removed`);
              await loadGroupMembers(groupId);
            } catch (err) {
              console.error("Remove failed", err);
            }
          };
          controls.appendChild(removeBtn);
        }
      }

      li.appendChild(nameSpan);
      li.appendChild(controls);
      list.appendChild(li);
    }


    document.getElementById("groupMembers").style.display = "block";

  } catch (err) {
    console.error("Error fetching group members", err);
  }
}


function appendMessage(sender, text = null, mediaUrl = null) {
  const chatBox = document.getElementById("chatBox");
  const div = document.createElement("div");
  div.classList.add("message-bubble");

  const senderLabel = document.createElement("strong");
  senderLabel.textContent = sender + ": ";
  div.appendChild(senderLabel);

  if (text) {
    const span = document.createElement("span");
    span.textContent = text;
    div.appendChild(span);
    div.appendChild(document.createElement("br"));
  }

  if (mediaUrl) {
    const mediaType = getMediaType(mediaUrl);

    if (mediaType === "image") {
      const img = document.createElement("img");
      img.src = mediaUrl;
      img.alt = "Image";
      img.classList.add("chat-image");
      div.appendChild(img);
    } else if (mediaType === "video") {
      const video = document.createElement("video");
      video.src = mediaUrl;
      video.controls = true;
      video.classList.add("chat-video");
      div.appendChild(video);
    } else {
      const fileLink = document.createElement("a");
      fileLink.href = mediaUrl;
      fileLink.target = "_blank";
      fileLink.innerHTML = "📎 Open File";
      fileLink.classList.add("file-link");
      div.appendChild(fileLink);
    }
  }

  chatBox.appendChild(div);
}

function getMediaType(url) {
  const imageRegex = /\.(jpg|jpeg|png|gif)(\?.*)?$/i;
  const videoRegex = /\.(mp4|webm|mov)(\?.*)?$/i;

  if (imageRegex.test(url)) return "image";
  if (videoRegex.test(url)) return "video";
  return "file";
}


function scrollToBottom() {
  const chatBox = document.getElementById("chatBox");
  chatBox.scrollTop = chatBox.scrollHeight;
}

async function pollNewMessages() {
  if (isInGlobalChat) {
    try {
      const res = await axios.get("/group/global/messages", {
        headers: { Authorization: `Bearer ${token}` }
      });

      const newMessages = res.data.filter(
        msg => msg.id > lastMessageId && msg.id !== lastGlobalMessageId
      );

      newMessages.forEach(msg => {
        const label = msg.sender === currentUser ? "You" : msg.sender;
        appendMessage(label, msg.text, msg.mediaUrl);
        lastMessageId = Math.max(lastMessageId, msg.id);
        lastGlobalMessageId = Math.max(lastGlobalMessageId, msg.id); // update
        console.log("📦 message object received via polling:", msg);
      });

      if (newMessages.length > 0) scrollToBottom();
    } catch (err) {
      console.error("Polling error (global)", err);
    }
  } else if (selectedGroupId) {
    try {
      const res = await axios.get(`/group/${selectedGroupId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const newMessages = res.data.filter(msg => msg.id > lastMessageId);

      newMessages.forEach(msg => {
        const label = msg.sender === currentUser ? "You" : msg.sender;
        appendMessage(label, msg.text, msg.mediaUrl);
        lastMessageId = Math.max(lastMessageId, msg.id);
        console.log("📦 message object received via polling:", msg);
      });

      if (newMessages.length > 0) scrollToBottom();
    } catch (err) {
      console.error("Polling error (group)", err);
    }
  }
}

function joinRoom(roomId) {
  return new Promise((resolve) => {
    socket.emit("join-room", roomId);
    setTimeout(resolve, 100);
  });
}

function leaveRoom(roomId) {
  socket.emit("leave-room", roomId);
}

document.getElementById("createGroupBtn").addEventListener("click", () => {
  document.getElementById("createGroupModal").classList.remove("hidden");
});

document.getElementById("submitGroupBtn").addEventListener("click", async () => {
  const name = document.getElementById("newGroupName").value.trim();
  if (!name) return;

  try {
    await axios.post("/group/create", { name }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    document.getElementById("newGroupName").value = "";
    document.getElementById("createGroupModal").classList.add("hidden");
    await fetchGroups();
    const res = await axios.get("/group/mygroups", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const newGroup = res.data.find(g => g.name === name);
    if (newGroup) {
      await loadGroup(newGroup.id, newGroup.name);
    }
  } catch (err) {
    console.error("Group creation failed", err);
  }
});

document.getElementById("inviteBtn").addEventListener("click", async () => {
  const selected = Array.from(document.querySelectorAll("#userListContainer input[type='checkbox']:checked"))
    .map(cb => parseInt(cb.value));
  if (!selectedGroupId || selected.length === 0) return;

  try {
    await axios.post("/group/invite", { groupId: selectedGroupId, userIds: selected }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    alert("Users invited!");
    await loadGroupMembers(selectedGroupId);
    renderUserCheckboxes();
  } catch (err) {
    console.error("Error inviting users", err);
  }
});

document.getElementById("chatForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const input = document.getElementById("messageInput");
  const fileInput = document.getElementById("fileInput");
  const message = input.value.trim();
  const file = fileInput.files[0];

  if (!message && !file) return;

  if (file) {
    const formData = new FormData();
    formData.append("file", file);
    if (message) formData.append("text", message);
    if (selectedGroupId) formData.append("groupId", selectedGroupId);

    try {
      const res = await axios.post("/group/upload", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("✅ File uploaded:", res.data);

      const payload = res.data.data;

      socket.emit("new-message", {
        roomId: selectedGroupId || "global",
        message: {
          text: payload.text,
          mediaUrl: payload.mediaUrl,
          sender: currentUser,
          groupId: selectedGroupId || null,
        }
      });


    } catch (err) {
      console.error("❌ File upload failed", err);
    }

    fileInput.value = "";
    input.value = "";
    return;
  }

  if (message) {
    await sendMessage(message);
    input.value = "";
  }
});


document.getElementById("publicChatBtn").addEventListener("click", loadGlobalChat);
document.getElementById("logoutBtn").addEventListener("click", () => {
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("username");
  window.location.href = "/login.html";
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.getElementById("createGroupModal").classList.add("hidden");
  }
});


(async () => {
  await getUsername();
  await fetchGroups();

  if (isInGlobalChat) {
    await loadGlobalChat();
  } else if (selectedGroupId) {
    try {
      const res = await axios.get("/group/mygroups", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const matched = res.data.find(g => g.id == selectedGroupId);
      if (matched) {
        await loadGroup(matched.id, matched.name);
      }
    } catch (err) {
      console.error("Failed to restore previous group", err);
    }
  }

  socket.off("receive-message");
  socket.on("receive-message", (msg) => {

    const isGlobal = isInGlobalChat && !msg.groupId;
    const isCurrentGroup = selectedGroupId && msg.groupId == selectedGroupId;

    if (isGlobal) {
      if (!msg.id || msg.id <= lastGlobalMessageId) return;
      lastGlobalMessageId = msg.id;
    }

    if (isGlobal || isCurrentGroup) {
      const label = msg.sender === currentUser ? "You" : msg.sender;
      appendMessage(label, msg.text, msg.mediaUrl);
      console.log("📦 message object received:", msg);

      scrollToBottom();
    }
  });

})();
