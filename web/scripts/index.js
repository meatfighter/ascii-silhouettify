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

function goToPage(url) {
    window.location.href = url;
}

function initButtonListeners() {
    document.querySelectorAll('.copy-btn').forEach(button => button.addEventListener('click',
            () => copyToClipboard(button)))
    document.getElementById('launch-browser-version-button').addEventListener('click',
            () => goToPage('spa/index.html'));
    document.getElementById('color-gallery-button').addEventListener('click',
            () => goToPage('color-gallery.html'));
    document.getElementById('monochrome-gallery-button').addEventListener('click',
            () => goToPage('monochrome-gallery.html'));
}

function init() {
    makeButtonsSameWidth();
    initButtonListeners();
}

document.addEventListener("DOMContentLoaded", init);