// Load saved quality option when the options page is opened
document.addEventListener('DOMContentLoaded', function ()
{
    chrome.storage.sync.get(['enableSetQuality', 'maxQuality'], function (data)
    {
        const enableSetQuality = data.enableSetQuality || false; // Default to false if nothing is saved
        document.getElementById('enableSetQuality').checked = enableSetQuality;

        const dropdown = document.getElementById('qualityDropdown');
        if (enableSetQuality)
        {
            dropdown.style.display = 'block';

            const savedQuality = data.maxQuality || '1080p'; // Default to 1080p if nothing is saved
            document.getElementById('qualityOptions').value = savedQuality;
        }
        else
        {
            dropdown.style.display = 'none';
        }
    });
});

// Save selected quality
document.getElementById('qualityOptions').addEventListener('change', function ()
{
    const selectedQuality = document.getElementById('qualityOptions').value;

    // Save the selected quality to Chrome storage
    chrome.storage.sync.set({ maxQuality: selectedQuality });
});

document.getElementById('enableSetQuality').addEventListener('change', function ()
{
    const enabled = document.getElementById('enableSetQuality').checked;
    const dropdown = document.getElementById('qualityDropdown');

    if (enabled)
    {
        chrome.storage.sync.get('maxQuality', function (data)
        {
            const savedQuality = data.maxQuality || '1080p'; // Default to 1080p if nothing is saved
            document.getElementById('qualityOptions').value = savedQuality;
        });
    }

    showQualityOptions(dropdown);

    chrome.storage.sync.set({ enableSetQuality: enabled });
});

function showQualityOptions(dropdown)
{
    if (dropdown.style.display === 'none')
    {
        dropdown.style.display = 'block';
    }
    else
    {
        dropdown.style.display = 'none';
    }
}