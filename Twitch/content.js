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

chrome.storage.sync.get(['enableTheatreMode'], function (data)
{
    isTheatreModeEnabled = data.enableTheatreMode;
    if (!data.enableTheatreMode)
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