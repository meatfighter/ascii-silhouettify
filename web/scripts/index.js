function copyToClipboard(button) {
    void navigator.clipboard.writeText(button.parentElement.querySelector('pre').innerText.trim());
}

function init() {
    const buttons = document.querySelector(".button-container").querySelectorAll(".button");
    let maxWidth = 0;

    buttons.forEach(button => {
        const buttonWidth = button.offsetWidth;
        if (buttonWidth > maxWidth) {
            maxWidth = buttonWidth;
        }
    });

    buttons.forEach(button => button.style.width = `${maxWidth}px`);
}

document.addEventListener("DOMContentLoaded", init);