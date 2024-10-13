// Load saved quality option when the options page is opened
document.addEventListener('DOMContentLoaded', function ()
{
    chrome.storage.sync.get('videoQuality', function (data)
    {
        const savedQuality = data.videoQuality || '1080p'; // Default to 1080p if nothing is saved
        document.getElementById('qualityOptions').value = savedQuality;
    });
});

// Save selected quality
document.getElementById('saveButton').addEventListener('click', function ()
{
    const selectedQuality = document.getElementById('qualityOptions').value;

    // Save the selected quality to Chrome storage
    chrome.storage.sync.set({ videoQuality: selectedQuality });
});