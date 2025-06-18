const namazTimeRegex = /var _[a-zA-Z]+ = "(\d+:\d+)";/g;

// On popup open
chrome.storage.sync.get("lastPopupOpenDate", (storage) =>
{
    const currentDateString = getCurrentDateString();
    if (storage.lastPopupOpenDate && storage.lastPopupOpenDate !== currentDateString)
    {
        chrome.runtime.sendMessage({ action: "newDay" });
        chrome.storage.sync.set({ namazPrayed: false });
    }

    chrome.storage.sync.set({ lastPopupOpenDate: currentDateString });
});

// On popup content loaded
document.addEventListener('DOMContentLoaded', function ()
{
    addTabButtonListeners();

    chrome.storage.sync.get([
        'activeTab',
        'allowYoutubePremiumQuality',
        'blurQuranWords',
        'cityCode',
        'currentDate',
        'playTiktoksInBackground',
        'enableYoutubeSetQuality',
        'enableTwitchTheatreMode',
        'youtubeMaxQuality',
        'namazPrayed',
        'namazTimesFormatted',
        'tiktokSessions',
    ], function (storage)
    {
        let isPrayed = storage.namazPrayed;

        openActiveTab(storage.activeTab);

        // Set display width
        const tabContentElements = document.getElementsByClassName("tabContent");
        for (let i = 0; i < tabContentElements.length; i++)
        {
            const originalDisplay = tabContentElements[i].style.display;

            tabContentElements[i].style.display = "block";

            const width = tabContentElements[i].offsetWidth;
            console.log(width);

            tabContentElements[i].style.display = originalDisplay;
        }

        // Namaz
        // Set the city code
        const cityCode = storage.cityCode || '13980'; // Default to Rotterdam if nothing is saved
        const cityCodeInput = document.getElementById('cityCode');
        cityCodeInput.value = cityCode;

        // Add event listener to the city code input to save city code to storage
        cityCodeInput.addEventListener('keydown', (event) =>
        {
            if (event.key === 'Enter' || event.key === 'Tab')
            {
                const cityCode = document.getElementById('cityCode').value;
                chrome.storage.sync.set({ cityCode: cityCode });
            }
        });

        // Create the namaz checkboxes
        const { currentDate, namazTimesFormatted } = storage;
        if (namazTimesFormatted)
        {
            createNamazSpans(currentDate, namazTimesFormatted);
        }

        const isPrayedButton = document.createElement('button');
        isPrayedButton.id = 'isPrayedButton';
        isPrayedButton.textContent = isPrayed ? 'PRAYED' : 'NOT PRAYED';
        isPrayedButton.addEventListener('click', () =>
        {
            isPrayed = !isPrayed;
            isPrayedButton.textContent = isPrayed ? 'PRAYED' : 'NOT PRAYED';
            chrome.storage.sync.set({ namazPrayed: isPrayed });
            chrome.runtime.sendMessage({ action: "isPrayed", data: isPrayed });
        });
        const namazTimesList = document.getElementById('namazTimesList');
        namazTimesList.appendChild(isPrayedButton);

        // Quran
        // Set the blur Quran words checkbox
        const { blurQuranWords } = storage;
        document.getElementById('blurQuranWords').checked = blurQuranWords;

        // Add event listener to the blur Quran words checkbox to save the setting to storage
        document.getElementById('blurQuranWords').addEventListener('change', function ()
        {
            const blurQuranWords = document.getElementById('blurQuranWords').checked;
            console.log(blurQuranWords);
            chrome.storage.sync.set({ blurQuranWords: blurQuranWords });
        });

        // TikTok
        // Set the play TikToks in background checkbox
        const { playTiktoksInBackground } = storage;
        document.getElementById('playTiktoksInBackground').checked = playTiktoksInBackground;

        // Add event listener to the play TikToks in background checkbox to save the setting to storage
        document.getElementById('playTiktoksInBackground').addEventListener('change', function ()
        {
            const playTiktoksInBackground = document.getElementById('playTiktoksInBackground').checked;
            chrome.storage.sync.set({ playTiktoksInBackground: playTiktoksInBackground });
        });

        // TODO remove later
        const e = document.getElementById('Export');
        e.addEventListener('click', exportStorageData);

        // TODO remove later
        document.getElementById('importButton').addEventListener('click', () =>
        {
            const fileInput = document.getElementById('fileInput');
            if (fileInput.files.length > 0)
            {
                const file = fileInput.files[0];
                importStorageData(file);
            } else
            {
                console.log("No file selected.");
            }
        });

        // Twitch
        // Set the enable Twitch theatre mode checkbox
        const { enableTwitchTheatreMode } = storage;
        document.getElementById('enableTwitchTheatreMode').checked = enableTwitchTheatreMode;

        // Add event listener to the enable Twitch theatre mode checkbox to save the setting to storage
        document.getElementById('enableTwitchTheatreMode').addEventListener('change', function ()
        {
            const enableTwitchTheatreMode = document.getElementById('enableTwitchTheatreMode').checked;
            chrome.storage.sync.set({ enableTwitchTheatreMode: enableTwitchTheatreMode });
        });

        // YouTube
        // Set the enable YouTube set quality checkbox
        const { enableYoutubeSetQuality } = storage;
        document.getElementById('enableYoutubeSetQuality').checked = enableYoutubeSetQuality;

        // Add event listener to the enable YouTube set quality checkbox to show/hide the quality settings container and save the setting to storage
        document.getElementById('enableYoutubeSetQuality').addEventListener('change', function ()
        {
            toggleYoutubeQualityContainer();
        });

        // Set the allow YouTube premium quality checkbox
        const { allowYoutubePremiumQuality } = storage;
        document.getElementById('allowYoutubePremiumQuality').checked = allowYoutubePremiumQuality;

        // Add event listener to the allow YouTube premium quality checkbox to save the setting to storage
        document.getElementById('allowYoutubePremiumQuality').addEventListener('change', function ()
        {
            const allowYoutubePremiumQuality = document.getElementById('allowYoutubePremiumQuality').checked;
            chrome.storage.sync.set({ allowYoutubePremiumQuality: allowYoutubePremiumQuality });
        });

        // Set the YouTube max quality select
        const { youtubeMaxQuality } = storage;
        document.getElementById('youtubeMaxQuality').value = youtubeMaxQuality;

        // Add event listener to the YouTube max quality select to save the selected quality to storage
        document.getElementById('youtubeMaxQuality').addEventListener('change', function ()
        {
            const selectedQuality = document.getElementById('youtubeMaxQuality').value;
            chrome.storage.sync.set({ youtubeMaxQuality: selectedQuality });
            console.log(selectedQuality);
        });
    });
});

function getCurrentDateString()
{
    const today = new Date();
    return today.toISOString().split('T')[0];
}

function openTab(event, tabName)
{
    // Get all tab content elements and hide them
    const tabContentElements = document.getElementsByClassName("tabContent");
    for (let i = 0; i < tabContentElements.length; i++)
    {
        tabContentElements[i].style.display = "none";
    }

    // Get all tab buttons and remove the "active" class
    const tabButtons = document.getElementsByClassName("tabButton");
    for (let i = 0; i < tabButtons.length; i++)
    {
        tabButtons[i].className = tabButtons[i].className.replace(" active", "");
    }

    // Show the active tab and add "active" class to the button
    const activeTab = document.getElementById(tabName);
    activeTab.style.display = "block";
    event.currentTarget.className += " active";
}

function addTabButtonListeners()
{
    const tabButtons = document.querySelectorAll('.tabButton');
    tabButtons.forEach(button =>
    {
        button.addEventListener('click', (event) =>
        {
            openTab(event, button.textContent);

            chrome.storage.sync.set({ activeTab: button.textContent });
        });
    });
}

function openActiveTab(activeTab = null)
{
    const tabButtons = document.querySelectorAll('.tabButton');
    if (!activeTab)
    {
        const button = tabButtons[0];
        activeTab = button.textContent;
        openTab({ currentTarget: button }, activeTab);
    }
    else
    {
        tabButtons.forEach(button =>
        {
            if (button.textContent.includes(activeTab))
            {
                openTab({ currentTarget: button }, activeTab);
            }
        });
    }
}

function createNamazSpans(currentDate, namazTimesFormatted)
{
    const namazTimesList = document.getElementById('namazTimesList');
    const namazNames = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha', 'Fajr (next day)'];
    namazTimesList.innerHTML = currentDate;

    // Loop through the array except for the last two elements (next day's imsak [-1])
    for (let i = 0; i < namazTimesFormatted.length; i++)
    {
        const namazName = namazNames[i];
        const namazTimeFormatted = namazTimesFormatted[i];

        const spanText = document.createElement('span');
        spanText.textContent = `${namazName}: ${namazTimeFormatted}`;

        namazTimesList.appendChild(spanText);
    }
}

function toggleYoutubeQualityContainer()
{
    const youtubeQualityContainer = document.getElementById('youtubeQualityContainer');
    const isEnabled = document.getElementById('enableYoutubeSetQuality').checked;
    if (isEnabled)
    {
        // Display the quality settings container
        youtubeQualityContainer.style.display = 'block';
    }
    else
    {
        // Hide the quality settings container
        youtubeQualityContainer.style.display = 'none';
    }

    chrome.storage.sync.set({ enableYoutubeSetQuality: isEnabled });
}

function exportStorageData()
{
    chrome.storage.sync.get(null, (items) =>
    {
        const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'storage-data.json';
        a.click();
        URL.revokeObjectURL(url);
    });
}

// Import function
function importStorageData(file)
{
    const reader = new FileReader();
    reader.onload = (event) =>
    {
        const data = JSON.parse(event.target.result);
        chrome.storage.sync.set(data, () =>
        {
            console.log('Data imported successfully');
        });
    };
    reader.readAsText(file);
}