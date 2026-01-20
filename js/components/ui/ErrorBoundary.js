window.addEventListener('error', (event) => {
    console.error('Dashboard error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Dashboard promise rejection:', event.reason);
});
