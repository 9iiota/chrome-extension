const namazTimeRegex = /var _[a-zA-Z]+ = "(\d+:\d+)";/g;

// On popup open
chrome.storage.sync.get("lastPopupOpenDate", (storage) =>
{
    const currentDateString = getCurrentDateString();
    if (storage.lastPopupOpenDate && storage.lastPopupOpenDate !== currentDateString)
    {
        chrome.runtime.sendMessage({ action: "newDay" });
        chrome.storage.sync.set({ namazPrayed: [false, false, false, false, false, false] });
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
        'cityCode',
        'playTiktoksInBackground',
        'enableYoutubeSetQuality',
        'enableTwitchTheatreMode',
        'youtubeMaxQuality',
        'namazPrayed',
        'namazTimesFormatted',
        'tiktokSessions',
    ], function (storage)
    {
        openActiveTab(storage.activeTab);

        // set display width
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
        const { cityCode } = storage;
        const cityCodeInput = document.getElementById('cityCode');
        cityCodeInput.value = cityCode;

        // Add event listener to the city code input to save city code to storage
        cityCodeInput.addEventListener('keydown', (event) =>
        {
            if (event.key === 'Enter' || event.key === 'Tab')
            {
                const cityCode = document.getElementById('cityCode').value;

                chrome.storage.sync.set({ cityCode: cityCode });
                chrome.storage.sync.set({ namazTimesFormatted: [] });

                chrome.runtime.sendMessage({ action: "cityCodeChanged", cityCode: cityCode });
            }
        });

        // Create the namaz checkboxes
        const { namazTimesFormatted } = storage;
        if (namazTimesFormatted)
        {
            createNamazCheckboxes(namazTimesFormatted);

            // Add event listeners to the namaz checkboxes to save the namazPrayed array to storage and send a message to the background script
            const { namazPrayed } = storage;
            addNamazCheckboxesListeners(namazPrayed);
        }

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

function createNamazCheckboxes(namazTimesFormatted)
{
    const namazTimesList = document.getElementById('namazTimesList');
    const namazNames = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    namazTimesList.innerHTML = '';

    // Loop through the array except for the last two elements (next day's imsak [-2] and the date of the namaz times [-1])
    for (let i = 0; i < namazTimesFormatted.length - 2; i++)
    {
        const namazName = namazNames[i];
        const namazTimeFormatted = namazTimesFormatted[i];

        // Create the checkbox-wrapper div
        const checkboxWrapper = document.createElement('div');
        checkboxWrapper.classList.add('checkbox-wrapper');

        // Create the checkbox input
        const inputCheckbox = document.createElement('input');
        inputCheckbox.classList.add('inp-cbx');
        inputCheckbox.id = `${namazNames[i]}`; // Unique ID for each checkbox
        inputCheckbox.type = 'checkbox';

        // Create the label element
        const label = document.createElement('label');
        label.classList.add('cbx');
        label.setAttribute('for', `${namazNames[i]}`); // Match label's `for` with the checkbox `id`

        // Create the first span for the SVG
        const spanSvg = document.createElement('span');

        // Create the SVG element for the checkmark
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '12px');
        svg.setAttribute('height', '10px');

        const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#check');
        svg.appendChild(use);

        // Append SVG to the first span
        spanSvg.appendChild(svg);

        // Create the second span for the label text
        const spanText = document.createElement('span');
        spanText.textContent = `${namazName}: ${namazTimeFormatted}`;

        // Append spans to the label
        label.appendChild(spanSvg);
        label.appendChild(spanText);

        // Append checkbox input and label to the wrapper
        checkboxWrapper.appendChild(inputCheckbox);
        checkboxWrapper.appendChild(label);

        // Create the SVG symbol element for the checkmark definition
        const svgSymbol = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svgSymbol.classList.add('inline-svg');

        const symbol = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
        symbol.id = 'check';
        symbol.setAttribute('viewBox', '0 0 12 10');

        const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        polyline.setAttribute('points', '1.5 6 4.5 9 10.5 1');
        symbol.appendChild(polyline);

        svgSymbol.appendChild(symbol);

        // Append the symbol SVG to the wrapper
        checkboxWrapper.appendChild(svgSymbol);

        // Finally, append the checkbox-wrapper to the container
        namazTimesList.appendChild(checkboxWrapper);
    }
}

function addNamazCheckboxesListeners(namazPrayed)
{
    const namazCheckboxes = document.querySelectorAll("#namazTimesList input[type='checkbox']");
    namazCheckboxes.forEach((checkbox, index) =>
    {
        checkbox.checked = namazPrayed[index];
        checkbox.addEventListener("change", () =>
        {
            namazPrayed[index] = !namazPrayed[index];
            const checkboxData = { index: index, isChecked: namazPrayed[index] };

            chrome.storage.sync.set({ namazPrayed: namazPrayed });
            chrome.runtime.sendMessage({ action: "checkboxChanged", data: checkboxData });
        });
    });
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