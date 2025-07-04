const token = sessionStorage.getItem("token");

let currentUser = null;
let selectedGroupId = null;
let lastMessageId = 0;
let allUsers = [];
let currentGroupMembers = [];
let isInGlobalChat = false;

// Restore persisted state AFTER declarations
selectedGroupId = localStorage.getItem("selectedGroupId") || null;
isInGlobalChat = localStorage.getItem("isInGlobalChat") === "true";


async function loadGlobalChat() {
  selectedGroupId = null;
  isInGlobalChat = true;

  // Persist to localStorage
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
  // Wait 300ms before firing search (to avoid spamming server)
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

  // Persist to localStorage
  localStorage.setItem("selectedGroupId", groupId);
  localStorage.setItem("isInGlobalChat", "false");
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

    currentGroupMembers = res.data.map(m => m.id); // store member IDs

    const currentUserObj = res.data.find(m => m.name === currentUser);
    const isCurrentUserAdmin = currentUserObj?.isAdmin;

    // Show or hide "Invite Users" section based on admin status
    document.getElementById("inviteSection").style.display = isCurrentUserAdmin ? "block" : "none";

    const list = document.getElementById("membersList");
    list.innerHTML = "";

    for (const member of res.data) {
      const li = document.createElement("li");
      li.style.display = "flex";
      li.style.justifyContent = "space-between";
      li.style.alignItems = "center";

      // Label with (Admin) if user is admin
      let nameLabel = member.name;
      if (member.isAdmin) nameLabel += " (Admin)";
      const nameSpan = document.createElement("span");
      nameSpan.textContent = nameLabel;

      const controls = document.createElement("div");
      controls.style.display = "flex";
      controls.style.gap = "5px";

      const isYou = member.name === currentUser;

      if (isCurrentUserAdmin && !isYou) {
        // ✅ Show "Make Admin" only if member is not admin
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

        // ✅ Show "Remove" only if member is not admin
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
  if (isInGlobalChat) {
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
  } else if (selectedGroupId) {
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
    await fetchGroups(); // refresh sidebar
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
    // Refresh members + checkboxes after invite
    await loadGroupMembers(selectedGroupId);
    renderUserCheckboxes();
  } catch (err) {
    console.error("Error inviting users", err);
  }
});

// 💬 Chat Form Submit
document.getElementById("chatForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("messageInput");
  const message = input.value.trim();
  if (message) {
    await sendMessage(message);
    input.value = "";
  }

});

document.getElementById("publicChatBtn").addEventListener("click", loadGlobalChat);
document.getElementById("logoutBtn").addEventListener("click", () => {
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("username");
  window.location.href = "/login.html"; // change if your login path is different
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.getElementById("createGroupModal").classList.add("hidden");
  }
});


(async () => {
  await getUsername();
  await fetchGroups();

  // 👇 Restore last session (group or global)
  if (isInGlobalChat) {
    await loadGlobalChat();
  } else if (selectedGroupId) {
    // Get group name for display
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

  setInterval(pollNewMessages, 1000);
})();

