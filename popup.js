const namazTimeRegex = /var _[a-zA-Z]+ = "(\d+:\d+)";/g;

document.addEventListener('DOMContentLoaded', function ()
{
    fetch('https://namazvakitleri.diyanet.gov.tr/tr-TR/13980/rotterdam-icin-namaz-vakti')
        .then(response => response.text())
        .then(data =>
        {
            const matches = [...data.matchAll(namazTimeRegex)];

            chrome.storage.sync.set({ namazTimes: matches });

            console.log(matches); // Logs all matches
        })
        .catch(error => console.error('Error:', error));

    const tabButtons = document.querySelectorAll('.tablinks');
    tabButtons.forEach(button =>
    {
        button.addEventListener('click', (event) =>
        {
            openTab(event, button.textContent);

            chrome.storage.sync.set({ currentTab: button.textContent });
        });
    });

    chrome.storage.sync.get(['enableSetQuality', 'allowPremiumQuality', 'maxQuality', 'continuePlaying', 'currentTab', 'enableTheatreMode', 'namazTimes'], function (data)
    {
        const currentTab = data.currentTab || 'YouTube';
        const tabButtons = document.querySelectorAll('.tablinks');
        tabButtons.forEach(button =>
        {
            if (button.textContent.includes(currentTab))
            {
                tabButton = button;
            }
        });

        if (tabButton)
        {
            openTab({ currentTarget: tabButton }, currentTab);
        }

        const enableSetQuality = data.enableSetQuality || false; // Default to false if nothing is saved
        document.getElementById('enableSetQuality').checked = enableSetQuality;

        const onSetQualityEnabled = document.querySelector('.onSetQualityEnabled');
        if (enableSetQuality)
        {
            onSetQualityEnabled.style.display = 'block';

            const allowPremiumQuality = data.allowPremiumQuality || false; // Default to false if nothing is saved
            document.getElementById('allowPremiumQuality').checked = allowPremiumQuality;

            const savedQuality = data.maxQuality || '1080p'; // Default to 1080p if nothing is saved
            document.getElementById('quality').value = savedQuality;
        }
        else
        {
            onSetQualityEnabled.style.display = 'none';
        }

        const continuePlaying = data.continuePlaying || false;
        document.getElementById('continuePlaying').checked = continuePlaying;

        const enableTheatreMode = data.enableTheatreMode || false;
        document.getElementById('enableTheatreMode').checked = enableTheatreMode;

        const namazTimes = data.namazTimes || [];
        displayNamazTimes(namazTimes);

        const cityCode = data.cityCode || '13980'; // Default to Rotterdam if nothing is saved
        document.getElementById('cityCode').value = cityCode;
    });
});

// Save selected quality
document.getElementById('quality').addEventListener('change', function ()
{
    const selectedQuality = document.getElementById('quality').value;
    chrome.storage.sync.set({ maxQuality: selectedQuality });
});

// Save allow premium quality
document.getElementById('allowPremiumQuality').addEventListener('change', function ()
{
    const allowPremiumQuality = document.getElementById('allowPremiumQuality').checked;
    chrome.storage.sync.set({ allowPremiumQuality: allowPremiumQuality });
});

document.getElementById('enableSetQuality').addEventListener('change', function ()
{
    const setQualityEnabled = document.getElementById('enableSetQuality').checked;
    if (setQualityEnabled)
    {
        chrome.storage.sync.get(['allowPremiumQuality', 'maxQuality'], function (data)
        {
            const allowPremiumQuality = data.allowPremiumQuality || false; // Default to false if nothing is saved
            document.getElementById('allowPremiumQuality').checked = allowPremiumQuality;

            const savedQuality = data.maxQuality || '1080p'; // Default to 1080p if nothing is saved
            document.getElementById('quality').value = savedQuality;
        });
    }

    onSetQualitySwitch();

    chrome.storage.sync.set({ enableSetQuality: setQualityEnabled });
});

// Save continue playing
document.getElementById('continuePlaying').addEventListener('change', function ()
{
    const continuePlaying = document.getElementById('continuePlaying').checked;
    chrome.storage.sync.set({ continuePlaying: continuePlaying });
});

// Save enable theatre mode
document.getElementById('enableTheatreMode').addEventListener('change', function ()
{
    const enableTheatreMode = document.getElementById('enableTheatreMode').checked;
    chrome.storage.sync.set({ enableTheatreMode: enableTheatreMode });
});

// Save city code
document.getElementById('cityCode').addEventListener('keydown', (event) =>
{
    if (event.key === 'Enter' || event.key === 'Tab')
    {
        const cityCode = document.getElementById('cityCode').value;
        chrome.storage.sync.set({ cityCode: cityCode });
    }
});

function onSetQualitySwitch()
{
    const onSetQualityEnabled = document.querySelector('.onSetQualityEnabled');
    if (onSetQualityEnabled.style.display === 'none')
    {
        onSetQualityEnabled.style.display = 'block';
    }
    else
    {
        onSetQualityEnabled.style.display = 'none';
    }
}

function openTab(event, tabName)
{
    var i, tabcontent, tablinks;

    // Get all elements with class="tabcontent" and hide them
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++)
    {
        tabcontent[i].style.display = "none";
    }

    // Get all elements with class="tablinks" and remove the class "active"
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++)
    {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    // Show the current tab, and add an "active" class to the button that opened the tab
    document.getElementById(tabName).style.display = "block";
    event.currentTarget.className += " active";
}

function displayNamazTimes(namazTimes)
{
    const container = document.getElementById('Namaz'); // Assuming you have a div with this ID in your popup HTML

    const namazNames = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

    // Clear any existing content
    // container.innerHTML = '';

    // Loop through the array and create a new element for each item
    for (let i = 0; i < namazTimes.length; i++)
    {
        const namazTime = namazTimes[i][1];
        const namazName = namazNames[i];

        const p = document.createElement('p');
        p.textContent = `${namazName}: ${namazTime}`;

        container.appendChild(p);
    }
}