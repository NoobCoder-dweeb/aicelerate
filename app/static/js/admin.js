async function addUser() {
    const username = document.getElementById('new-username').value;
    const password = document.getElementById('new-password').value;

    if (!username || !password) {
        alert("Both fields are required.");
        return;
    }

    const response = await fetch('/add_user', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username, password})
    });

    const result = await response.json();

    if (result.success) {
        location.reload();
    } else {
        alert("Error: " + result.error);
    }
}

async function deleteUser(username) {
    if (!confirm(`Delete user "${username}"?`)) return;
    const response = await fetch('/delete_user', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username})
    });
    const result = await response.json();
    if (result.success) {
        location.reload();
    } else {
        alert("Error: " + result.error);
    }
}

async function modifyUser(username) {
    const newPassword = prompt(`Enter new password for "${username}":`);
    if (!newPassword) return;
    const response = await fetch('/modify_user', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username, password: newPassword})
    });
    const result = await response.json();
    if (result.success) {
        location.reload();
    } else {
        alert("Error: " + result.error);
    }
}
