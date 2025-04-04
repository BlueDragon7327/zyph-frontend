document.addEventListener("DOMContentLoaded", function() {
    let messageInterval = null; // remove polling interval usage

    // Initialize Socket.IO client (make sure socket.io client script is included in your homepage.html)
    const socket = io("https://zyph-backend.onrender.com");

    // Utility: get cookie by name
    function getCookie(name) {
        const value = "; " + document.cookie;
        const parts = value.split("; " + name + "=");
        if (parts.length === 2) return parts.pop().split(";")[0];
        return "";
    }
  
    // Set the username in Settings tab
    document.getElementById("usernameDisplay").textContent = getCookie("username") || "Guest";
  
    // Logout
    document.getElementById("logoutButton").addEventListener("click", function() {
        document.cookie = "auth=; Max-Age=0; path=/";
        document.cookie = "username=; Max-Age=0; path=/";
        window.location.href = "index.html";
    });
  
    // Tab switching: add click listeners to all tabs
    const tabs = document.querySelectorAll("nav ul.nav-tabs li.tab");
    const panels = document.querySelectorAll(".tab-panel");
    tabs.forEach(tab => {
        tab.addEventListener("click", function() {
            // Clear auto-refresh if leaving messages tab
            if (tab.getAttribute("data-tab") !== "messages" && messageInterval) {
                clearInterval(messageInterval);
                messageInterval = null;
            }
            tabs.forEach(t => t.classList.remove("active"));
            panels.forEach(p => p.classList.remove("active"));
            tab.classList.add("active");
            const target = tab.getAttribute("data-tab");
            const panel = document.getElementById(target);
            if (panel) { panel.classList.add("active"); }
            if (target === "friends") {
                loadFriendRequests();
                loadFriends();
                loadSentFriendRequests(); // NEW: load sent friend requests
                const badge = document.getElementById("friendBadge");
                if (badge) { badge.style.display = "none"; }
            }
            // When Messages tab, always load the conversation list and keep the chat area hidden.
            if (target === "messages") {
                loadConversations();
                const chatArea = document.getElementById("chatArea");
                if (chatArea) { chatArea.style.display = "none"; }
            }
        });
    });
  
    // ---------- Friend Requests and Friends List ----------
  
    // Submit friend request
    const friendRequestForm = document.getElementById("friendRequestForm");
    friendRequestForm.addEventListener("submit", async function(e) {
        e.preventDefault();
        const friendUsername = document.getElementById("friendUsername").value.trim();
        if(friendUsername === "") return;
        const currentUsername = getCookie("username") || "Unknown";
        try {
            const res = await fetch("https://zyph-backend.onrender.com/api/friend/request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ from: currentUsername, to: friendUsername })
            });
            const data = await res.json();
            document.getElementById("friendResponse").textContent = data.message;
        } catch (err) {
            document.getElementById("friendResponse").textContent = "Failed to send friend request.";
        }
    });
  
    // Refresh friend request count every 10s
    async function fetchFriendRequestCount() {
        const username = getCookie("username") || "Guest";
        try {
            const res = await fetch("https://zyph-backend.onrender.com/api/friend/requests?to=" + encodeURIComponent(username));
            const requests = await res.json();
            const count = requests.length;
            const badge = document.getElementById("friendBadge");
            if(count > 0) {
                badge.textContent = count;
                badge.style.display = "inline-block";
            } else {
                badge.style.display = "none";
            }
        } catch (err) {
            console.error("Failed to fetch friend requests count.");
        }
    }
    fetchFriendRequestCount();
    setInterval(fetchFriendRequestCount, 10000);
  
    // Load pending friend requests into Friends tab
    async function loadFriendRequests() {
        const username = getCookie("username") || "Guest";
        const list = document.getElementById("friendRequestsList");
        list.innerHTML = "";
        try {
            const res = await fetch("https://zyph-backend.onrender.com/api/friend/requests?to=" + encodeURIComponent(username));
            const requests = await res.json();
            if(requests.length === 0) {
                list.innerHTML = "<p>No pending friend requests.</p>";
                return;
            }
            requests.forEach(request => {
                let div = document.createElement("div");
                div.classList.add("friend-request-item");
                let span = document.createElement("span");
                span.textContent = request.from;
                let btn = document.createElement("button");
                btn.textContent = "Accept";
                btn.addEventListener("click", async function() {
                    try {
                        const res = await fetch("https://zyph-backend.onrender.com/api/friend/accept", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ from: request.from, to: username })
                        });
                        const data = await res.json();
                        alert(data.message);
                        loadFriendRequests();
                    } catch (err) {
                        alert("Failed to accept friend request.");
                    }
                });
                div.appendChild(span);
                div.appendChild(btn);
                list.appendChild(div);
            });
        } catch (err) {
            list.innerHTML = "<p>Error loading friend requests.</p>";
        }
    }
  
    // Load friends list in Friends tab
    async function loadFriends() {
        const username = getCookie("username") || "Guest";
        const list = document.getElementById("friendsList");
        list.innerHTML = "";
        try {
            const res = await fetch("https://zyph-backend.onrender.com/api/friends?username=" + encodeURIComponent(username));
            const friends = await res.json();
            if(friends.length === 0) {
                list.innerHTML = "<p>You have no friends yet.</p>";
            } else {
                friends.forEach(friend => {
                    let div = document.createElement("div");
                    div.textContent = friend;
                    div.style.cursor = "pointer";
                    div.style.padding = "8px";
                    div.style.border = "1px solid #444";
                    div.style.marginBottom = "5px";
                    div.style.borderRadius = "4px";
                    div.addEventListener("click", function() {
                        openConversationByFriend(friend);
                        // Automatically switch to Messages tab
                        const msgTab = document.querySelector("nav ul.nav-tabs li.tab[data-tab='messages']");
                        if(msgTab) { msgTab.click(); }
                    });
                    list.appendChild(div);
                });
            }
        } catch (err) {
            list.innerHTML = "<p>Error loading friends list.</p>";
        }
    }

    // NEW: Function to load sent friend requests
    async function loadSentFriendRequests() {
        const username = getCookie("username") || "Guest";
        const list = document.getElementById("sentFriendRequestsList");
        list.innerHTML = "";
        try {
            const res = await fetch("https://zyph-backend.onrender.com/api/friend/sentRequests?from=" + encodeURIComponent(username));
            const requests = await res.json();
            if (requests.length === 0) {
                list.innerHTML = "<p>No sent friend requests.</p>";
            } else {
                requests.forEach(req => {
                    let div = document.createElement("div");
                    div.classList.add("friend-request-item");
                    let span = document.createElement("span");
                    span.textContent = req.to;
                    let btn = document.createElement("button");
                    btn.textContent = "Cancel";
                    btn.addEventListener("click", async function() {
                        try {
                            const res = await fetch("https://zyph-backend.onrender.com/api/friend/cancel", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ from: username, to: req.to })
                            });
                            const data = await res.json();
                            alert(data.message);
                            loadSentFriendRequests();
                        } catch (err) {
                            alert("Failed to cancel friend request.");
                        }
                    });
                    div.appendChild(span);
                    div.appendChild(btn);
                    list.appendChild(div);
                });
            }
        } catch (err) {
            list.innerHTML = "<p>Error loading sent friend requests.</p>";
        }
    }
  
    // ---------- Messaging (Messages Tab) ----------
  
    // Load conversations list on Messages tab
    async function loadConversations() {
        const currentUsername = getCookie("username") || "Guest";
        const list = document.getElementById("conversationsList");
        list.innerHTML = "";
        try {
            const res = await fetch("https://zyph-backend.onrender.com/api/conversations?username=" + encodeURIComponent(currentUsername));
            const convos = await res.json();
            if(convos.length === 0) {
                list.innerHTML = "<p>No conversations found.</p>";
            } else {
                convos.forEach(convo => {
                    let friend = convo.participants.find(p => p !== currentUsername);
                    let convDiv = document.createElement("div");
                    convDiv.classList.add("conv-item");
                    convDiv.textContent = friend;
                    convDiv.addEventListener("click", function() {
                        openConversation(convo._id, friend);
                    });
                    list.appendChild(convDiv);
                });
            }
        } catch (err) {
            list.innerHTML = "<p>Error loading conversations.</p>";
        }
    }
  
    // Helper: Open conversation by friend's username (search among conversation list)
    async function openConversationByFriend(friend) {
        const currentUsername = getCookie("username") || "Guest";
        try {
            let res = await fetch("https://zyph-backend.onrender.com/api/conversations?username=" + encodeURIComponent(currentUsername));
            let convos = await res.json();
            let convo = convos.find(c => c.participants.includes(friend) && c.participants.includes(currentUsername));
            if (!convo) {
                // Create a new conversation if none exists
                let createRes = await fetch("https://zyph-backend.onrender.com/api/conversation/create", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ user1: currentUsername, user2: friend })
                });
                convo = await createRes.json();
            }
            openConversation(convo._id, friend);
        } catch (err) {
            console.error("Error opening conversation by friend", err);
        }
    }
  
    // Consolidated openConversation: displays the chat area and starts auto-refresh for messages
    async function openConversation(conversationId, friend) {
        // NEW: If switching from a previous conversation, emit stopTyping on the old conversation
        if (window.currentConversationId && window.currentConversationId !== conversationId) {
            const currentUsername = getCookie("username") || "Guest";
            socket.emit("stopTyping", { conversationId: window.currentConversationId, sender: currentUsername });
        }
        const chatArea = document.getElementById("chatArea");
        if(chatArea) { chatArea.style.display = "flex"; }
        const headerElem = document.getElementById("conversationFriend");
        if(headerElem) { headerElem.textContent = friend; }
        window.currentConversationId = conversationId;
        loadMessages(conversationId);
        socket.emit('joinRoom', conversationId);
        if (messageInterval) clearInterval(messageInterval);
        // NEW: Create typing indicator element before message form if it does not exist
        const messageForm = document.getElementById("messageForm");
        if (!document.getElementById("typingIndicator")) {
            const indicator = document.createElement("div");
            indicator.id = "typingIndicator";
            indicator.style.display = "none";
            indicator.style.fontStyle = "italic";
            indicator.style.color = "#ccc";
            messageForm.parentNode.insertBefore(indicator, messageForm);
        }
    }
  
    // Listen for live message events from the server.
    socket.on('newMessage', (data) => {
        const currentUsername = getCookie("username") || "Guest";
        if(data.conversationId === window.currentConversationId) {
            // NEW: Skip adding duplicate self message
            if(data.sender === currentUsername && window.suppressSelfMessage) {
                window.suppressSelfMessage = false;
                return;
            }
            const messagesArea = document.getElementById("messagesArea");
            let msgDiv = document.createElement("div");
            msgDiv.classList.add("message");
            if(data.sender === currentUsername) {
                msgDiv.classList.add("my-message");
            } else {
                msgDiv.classList.add("their-message");
            }
            // Updated timestamp: remove seconds and add date
            const dateObj = new Date(data.timestamp);
            const formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const formattedDate = dateObj.toLocaleDateString();
            msgDiv.innerHTML = data.content + "<br><span class='timestamp'>" + formattedDate + " " + formattedTime + "</span>";
            messagesArea.appendChild(msgDiv);
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }
    });
  
    // Load messages for the active conversation and format messages based on sender
    async function loadMessages(conversationId) {
        const messagesArea = document.getElementById("messagesArea");
        const currentUsername = getCookie("username") || "Guest";
        try {
            const res = await fetch("https://zyph-backend.onrender.com/api/messages?conversationId=" + encodeURIComponent(conversationId));
            const msgs = await res.json();
            messagesArea.innerHTML = "";
            msgs.forEach(msg => {
                let msgDiv = document.createElement("div");
                msgDiv.classList.add("message");
                if(msg.sender === currentUsername) {
                    msgDiv.classList.add("my-message");
                } else {
                    msgDiv.classList.add("their-message");
                }
                // Updated timestamp: remove seconds and add date
                const dateObj = new Date(msg.timestamp);
                const formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const formattedDate = dateObj.toLocaleDateString();
                msgDiv.innerHTML = msg.content + "<br><span class='timestamp'>" + formattedDate + " " + formattedTime + "</span>";
                messagesArea.appendChild(msgDiv);
            });
            messagesArea.scrollTop = messagesArea.scrollHeight;
        } catch (err) {
            messagesArea.innerHTML = "<p>Error loading messages.</p>";
        }
    }
  
    // NEW: Emit typing events on input
    const messageInput = document.getElementById("messageInput");
    messageInput.addEventListener("input", function() {
        if(window.currentConversationId) {
            const currentUsername = getCookie("username") || "Guest";
            if(messageInput.value.trim() !== "") {
                socket.emit("typing", { conversationId: window.currentConversationId, sender: currentUsername });
            } else {
                socket.emit("stopTyping", { conversationId: window.currentConversationId, sender: currentUsername });
            }
        }
    });
  
    // NEW: Listen for typing events and show/hide indicator
    socket.on("typing", (data) => {
        if(data.conversationId === window.currentConversationId && data.sender !== (getCookie("username") || "Guest")) {
            const indicator = document.getElementById("typingIndicator");
            if(indicator) {
                indicator.textContent = `${data.sender} is typing...`;
                indicator.style.display = "block";
            }
        }
    });
    socket.on("stopTyping", (data) => {
        if(data.conversationId === window.currentConversationId) {
            const indicator = document.getElementById("typingIndicator");
            if(indicator) {
                indicator.style.display = "none";
            }
        }
    });
  
    // Message form: send new message then refresh messages
    document.getElementById("messageForm").addEventListener("submit", async function(e) {
        e.preventDefault();
        const messageInput = document.getElementById("messageInput");
        const content = messageInput.value.trim();
        if(content === "" || !window.currentConversationId) return;
        const currentUsername = getCookie("username") || "Guest";
        try {
            const res = await fetch("https://zyph-backend.onrender.com/api/message", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    conversationId: window.currentConversationId,
                    sender: currentUsername,
                    content: content
                })
            });
            const data = await res.json();
            if(data.message === "Message sent.") {
                // NEW: Set flag to suppress self message duplicates
                window.suppressSelfMessage = true;
                // Append message immediately to avoid pause
                const messagesArea = document.getElementById("messagesArea");
                let msgDiv = document.createElement("div");
                msgDiv.classList.add("message", "my-message");
                const now = new Date();
                const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const formattedDate = now.toLocaleDateString();
                msgDiv.innerHTML = content + "<br><span class='timestamp'>" + formattedDate + " " + formattedTime + "</span>";
                messagesArea.appendChild(msgDiv);
                messagesArea.scrollTop = messagesArea.scrollHeight;
                messageInput.value = "";
                socket.emit("stopTyping", { conversationId: window.currentConversationId, sender: currentUsername });
                // Removed loadMessages(window.currentConversationId); to eliminate extra delay
            } else {
                alert("Failed to send message.");
            }
        } catch (err) {
            alert("Error sending message.");
        }
    });

    // At page load, if the default active tab is "messages", load conversations immediately.
    const activeTab = document.querySelector("nav ul.nav-tabs li.tab.active");
    if (activeTab && activeTab.getAttribute("data-tab") === "messages") {
        loadConversations();
    }
});

window.suppressSelfMessage = false; // NEW: global flag for self messages