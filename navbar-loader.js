document.addEventListener('DOMContentLoaded', () => {
    fetch('/navbar-config.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(config => {
            const logo = document.getElementById('navbar-logo');
            if (logo && config.logoPath) {
                logo.src = config.logoPath;
            }
        })
        .catch(err => console.error('Error loading navbar config:', err));
});
