// Optional: Simple script to focus the password input on page load
window.onload = function() {
    const pwdInput = document.querySelector('input[type="password"]');
    if (pwdInput) {
        pwdInput.focus();
    }
};