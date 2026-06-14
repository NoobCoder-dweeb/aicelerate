// Toggle password visibility
function togglePasswordVisibility() {
    const passwordInput = document.getElementById('password');
    const eyeIcon = document.querySelector('.toggle-password');
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.classList.remove('fa-eye-slash');
        eyeIcon.classList.add('fa-eye');
    } else {
        passwordInput.type = 'password';
        eyeIcon.classList.remove('fa-eye');
        eyeIcon.classList.add('fa-eye-slash');
    }
}


function displayErrors(errors) {
    let flashes = document.querySelector(".flashes");
    if (!flashes) {
        flashes = document.createElement("ul");
        flashes.classList.add("flashes");
        document.querySelector(".login-container").insertBefore(flashes, document.querySelector("form"));
    }
    flashes.innerHTML = "";
    errors.forEach(error => {
        const li = document.createElement("li");
        li.className = "error text-red-500 mb-2";
        li.textContent = error;
        flashes.appendChild(li);
    });
}

document.addEventListener("DOMContentLoaded", function () {
    const form = document.querySelector("form");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");

    form.addEventListener("submit", function (e) {
        let valid = true;
        let errorMessages = [];

        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        if ( username === "" && password === "") {
            valid = false;
            errorMessages.push("Please enter your username and password.");
        }
        else if (username === "") {
            valid = false;
            errorMessages.push("Username is required.");
        }

        else if (password.length < 1) {
            valid = false;
            errorMessages.push("Password is required.");
        }

        if (!valid) {
            e.preventDefault();
            displayErrors(errorMessages);
        }
    });
});

