function copyToClipboard(button) {
    void navigator.clipboard.writeText(button.parentElement.querySelector('pre').innerText.trim());
}

function init() {
    const buttonContainer = document.querySelector(".button-container");
    const buttons = buttonContainer.querySelectorAll(".button");
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