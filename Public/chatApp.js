const token = sessionStorage.getItem("token");
let currentUser = null;
let selectedGroupId = null;
let lastMessageId = 0;
let allUsers = [];
let currentGroupMembers = [];

async function loadGlobalChat() {
  selectedGroupId = null;
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
      appendMessage(`${label}: ${msg.content}`);
      lastMessageId = Math.max(lastMessageId, msg.id);
    });

    scrollToBottom();
  } catch (err) {
    console.error("Error loading global messages", err);
  }
}

async function sendMessage(content) {
  if (selectedGroupId === null) {
    // Global chat
    try {
      await axios.post("/group/global/message", { content }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error("Error sending global message", err);
    }
  } else {
    // Group chat
    try {
      await axios.post(`/group/${selectedGroupId}/message`, { content }, {
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

function renderUserCheckboxes() {
  const container = document.getElementById("userListContainer");
  const query = document.getElementById("searchInput").value.toLowerCase();
  container.innerHTML = "";

  allUsers.forEach(user => {
    const name = user.name.toLowerCase();
    if (!name.includes(query)) return;

    if (currentGroupMembers.includes(user.id)) return; // 🧠 Filter out members

    const label = document.createElement("label");
    label.style.display = "block";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = user.id;

    label.appendChild(checkbox);
    label.append(` ${user.name}`);
    container.appendChild(label);
  });
}


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
    lastMessageId = 0;
    document.getElementById("groupName").textContent = groupName;
    document.getElementById("chatBox").innerHTML = "";
    document.getElementById("inviteSection").style.display = "block";

    await loadGroupMembers(groupId); // ✅ first load members
    await fetchUsers();              // ✅ then fetch all users

    renderUserCheckboxes();          // ✅ NOW render checkboxes

    try {
        const res = await axios.get(`/group/${groupId}/messages`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.data.forEach(msg => {
            const label = msg.sender === currentUser ? "You" : msg.sender;
            appendMessage(`${label}: ${msg.content}`);
            lastMessageId = Math.max(lastMessageId, msg.id);
        });

        scrollToBottom();
    } catch (err) {
        console.error("Error loading group messages", err);
    }
}


async function loadGroupMembers(groupId) {
  try {
    const res = await axios.get(`/group/${groupId}/members`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    currentGroupMembers = res.data.map(m => m.id); // store member IDs

    const list = document.getElementById("membersList");
    list.innerHTML = "";

    res.data.forEach(member => {
      const li = document.createElement("li");
      li.textContent = member.name;
      list.appendChild(li);
    });

    document.getElementById("groupMembers").style.display = "block";

  } catch (err) {
    console.error("Error fetching group members", err);
  }
}


async function sendMessage(content) {
    if (!selectedGroupId) return;

    try {
        await axios.post(`/group/${selectedGroupId}/message`, { content }, {
            headers: { Authorization: `Bearer ${token}` }
        });
    } catch (err) {
        console.error("Error sending message", err);
    }
}

function appendMessage(msg) {
    const chatBox = document.getElementById("chatBox");
    const div = document.createElement("div");
    div.textContent = msg;
    chatBox.appendChild(div);
}

function scrollToBottom() {
    const chatBox = document.getElementById("chatBox");
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function pollNewMessages() {
  if (selectedGroupId === null) {
    try {
      const res = await axios.get("/group/global/messages", {
        headers: { Authorization: `Bearer ${token}` }
      });

      const newMessages = res.data.filter(msg => msg.id > lastMessageId);
      newMessages.forEach(msg => {
        const label = msg.sender === currentUser ? "You" : msg.sender;
        appendMessage(`${label}: ${msg.content}`);
        lastMessageId = Math.max(lastMessageId, msg.id);
      });

      if (newMessages.length > 0) scrollToBottom();
    } catch (err) {
      console.error("Polling error (global)", err);
    }
  } else {
    try {
      const res = await axios.get(`/group/${selectedGroupId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const newMessages = res.data.filter(msg => msg.id > lastMessageId);
      newMessages.forEach(msg => {
        const label = msg.sender === currentUser ? "You" : msg.sender;
        appendMessage(`${label}: ${msg.content}`);
        lastMessageId = Math.max(lastMessageId, msg.id);
      });

      if (newMessages.length > 0) scrollToBottom();
    } catch (err) {
      console.error("Polling error (group)", err);
    }
  }
}

// 💬 Create Group Button Handler
document.getElementById("createGroupBtn").addEventListener("click", () => {
    document.getElementById("createGroupModal").style.display = "block";
});

document.getElementById("submitGroupBtn").addEventListener("click", async () => {
    const name = document.getElementById("newGroupName").value.trim();
    if (!name) return;

    try {
        await axios.post("/group/create", { name }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        document.getElementById("newGroupName").value = "";
        document.getElementById("createGroupModal").style.display = "none";
        await fetchGroups(); // refresh sidebar
    } catch (err) {
        console.error("Group creation failed", err);
    }
});

// 🙋 Invite Selected Users
document.getElementById("inviteBtn").addEventListener("click", async () => {
    const selected = Array.from(document.querySelectorAll("#userListContainer input[type='checkbox']:checked"))
        .map(cb => parseInt(cb.value));
    if (!selectedGroupId || selected.length === 0) return;

    try {
        await axios.post("/group/invite", { groupId: selectedGroupId, userIds: selected }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        alert("Users invited!");
        renderUserCheckboxes(); // uncheck all
    } catch (err) {
        console.error("Error inviting users", err);
    }
});

// 💬 Chat Form Submit
document.getElementById("chatForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("messageInput");
    const message = input.value.trim();
    if (message && selectedGroupId) {
        await sendMessage(message);
        input.value = "";
    }
});

document.getElementById("publicChatBtn").addEventListener("click", loadGlobalChat);

// 🚀 Init
(async () => {
    await getUsername();
    await fetchGroups();
    setInterval(pollNewMessages, 1000);
})();
