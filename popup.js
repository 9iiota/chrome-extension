document.addEventListener('DOMContentLoaded', function ()
{
    const tabButtons = document.querySelectorAll('.tablinks');
    tabButtons.forEach(button =>
    {
        button.addEventListener('click', (event) =>
        {
            openTab(event, button.textContent);
        });
    });

    chrome.storage.sync.get(['enableSetQuality', 'allowPremiumQuality', 'maxQuality', 'continuePlaying'], function (data)
    {
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