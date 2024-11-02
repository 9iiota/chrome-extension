const performanceObserver = new PerformanceObserver((list) =>
{
    list.getEntries().forEach((entry) =>
    {
        if (entry.name === 'click' || entry.type === 'reload')
        {
            const video = document.querySelector('video');
            if (!video)
            {
                return;
            }

            video.addEventListener('play', () =>
            {
                clickTheatreMode();
            });
        }
    });
});

chrome.storage.sync.get(['enableTwitchTheatreMode'], function (data)
{
    isTheatreModeEnabled = data.enableTwitchTheatreMode;
    if (!data.enableTwitchTheatreMode)
    {
        return;
    }

    performanceObserver.observe({ entryTypes: ["event", "navigation"] });
});

function clickTheatreMode()
{
    const theatreModeButton = document.querySelector('button[aria-label="Theatre Mode (alt+t)"]');
    theatreModeButton?.click();
}