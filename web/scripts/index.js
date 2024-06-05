function makeButtonsSameWidth() {
    const buttons = document.querySelector('.button-container').querySelectorAll('.button');
    let maxWidth = 0;

    buttons.forEach(button => {
        const buttonWidth = button.offsetWidth;
        if (buttonWidth > maxWidth) {
            maxWidth = buttonWidth;
        }
    });

    buttons.forEach(button => button.style.width = `${maxWidth}px`);
}

function copyToClipboard(button) {
    void navigator.clipboard.writeText(button.parentElement.querySelector('pre').innerText.trim());
}

function initButtonListeners() {
    document.querySelectorAll('.copy-btn').forEach(button => button.addEventListener('click',
            () => copyToClipboard(button)))
    document.getElementById('launch-browser-version-button').addEventListener('click',
            () => window.open('spa/index.html', '_self'));
    document.getElementById('color-gallery-button').addEventListener('click',
            () => window.open('color-gallery.html', '_blank'));
    document.getElementById('monochrome-gallery-button').addEventListener('click',
            () => window.open('monochrome-gallery.html', '_blank'));
}

function init() {
    makeButtonsSameWidth();
    initButtonListeners();
}

document.addEventListener("DOMContentLoaded", init);