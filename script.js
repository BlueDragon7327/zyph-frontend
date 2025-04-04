document.getElementById("registerForm").addEventListener("submit", async function (e) {
	e.preventDefault();
	const username = document.getElementById("registerUsername").value; // new username field
	const email = document.getElementById("registerEmail").value;
	const password = document.getElementById("registerPassword").value;
	try {
		const res = await fetch("https://zyph-backend.onrender.com/api/register", { // changed URL
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ username, email, password }) // updated payload
		});
		const data = await res.json();
		alert(data.message);
	} catch (err) {
		alert("Registration error");
	}
});

document.getElementById("loginForm").addEventListener("submit", async function (e) {
	e.preventDefault();
	const email = document.getElementById("loginEmail").value;
	const password = document.getElementById("loginPassword").value;
	try {
		const res = await fetch("https://zyph-backend.onrender.com/api/login", { // changed URL
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, password })
		});
		const data = await res.json();
		if(data.message === "Logged in successfully.") {
			// Save authentication info into cookies using the actual username
			document.cookie = "auth=true; path=/";
			document.cookie = "username=" + data.username + "; path=/";
			window.location.href = "homepage.html";
		} else {
			alert(data.message);
		}
	} catch (err) {
		alert("Login error");
	}
});

document.getElementById("showRegister").addEventListener("click", function () {
	// Toggle views: hide login, show register
	document.getElementById("loginContainer").classList.add("hidden");
	document.getElementById("registerContainer").classList.remove("hidden");
});

document.getElementById("showLogin").addEventListener("click", function () {
	// Toggle views: hide register, show login
	document.getElementById("registerContainer").classList.add("hidden");
	document.getElementById("loginContainer").classList.remove("hidden");
});
