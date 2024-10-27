const namazTimeRegex = /var _[a-zA-Z]+ = "(\d+:\d+)";/g;

// Open popup page when the extension icon is clicked
chrome.action.onClicked.addListener(() =>
{
    chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
});

chrome.runtime.onInstalled.addListener(() =>
{
    chrome.storage.sync.get(['namazTimes', 'cityCode', 'badgeColor'], data =>
    {
        chrome.action.getBadgeBackgroundColor({}, badgeColor => 
        {
            badgeColor = rgbaArrayToHex(badgeColor);
            if (badgeColor !== data.badgeColor)
            {
                chrome.action.setBadgeBackgroundColor({ color: badgeColor });
                chrome.storage.sync.set({ badgeColor: badgeColor });
            }
        });

        let namazTimes = data.namazTimes || [];
        let timesInSeconds = namazTimes.map(time =>
        {
            const [hours, minutes] = time.at(-1).split(":").map(Number); // Split and convert to numbers
            return (hours * 60 + minutes) * 60; // Convert to total seconds
        });

        const timerInterval = setInterval(() =>
        {
            const currentDate = getCurrentDate();
            if (namazTimes.length === 0 || namazTimes.at(-1) !== currentDate)
            {
                (async () =>
                {
                    namazTimes = [...await getNamazTimes(data.cityCode), currentDate];
                    chrome.storage.sync.set({ namazTimes: namazTimes });

                    timesInSeconds = namazTimes.map(time =>
                    {
                        const [hours, minutes] = time.at(-1).split(":").map(Number); // Split and convert to numbers
                        return (hours * 60 + minutes) * 60; // Convert to total seconds
                    });
                })();
            }

            const now = new Date();
            const currentTimeSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
            const nextNamazIndex = timesInSeconds.findIndex(time => time > currentTimeSeconds);
            const nextNamazTimeSeconds = timesInSeconds[nextNamazIndex];
            const secondsToNextNamaz = nextNamazTimeSeconds - currentTimeSeconds;

            const hours = Math.floor(secondsToNextNamaz / 3600);
            const minutes = String(Math.floor((secondsToNextNamaz % 3600) / 60)).padStart(2, '0');
            let formattedTime;
            let color;
            if (hours > 0)
            {
                formattedTime = `${hours}:${minutes}`;
                color = '#00ff00';
            }
            else
            {
                const seconds = String(secondsToNextNamaz % 60).padStart(2, '0');
                formattedTime = `${minutes}:${seconds}`;
                color = '#ff0000';
            }

            if (color !== data.badgeColor)
            {
                chrome.action.setBadgeBackgroundColor({ color: color });
                chrome.storage.sync.set({ badgeColor: color });
            }

            if (secondsToNextNamaz > 0)
            {
                updateBadge(formattedTime);
            }
        }, 1000);
    });
});

// chrome.runtime.onStartup.addListener(() =>
// {
//     // const secondsToMidnight = getSecondsToTomorrow();
//     // setTimeout(() =>
//     // {
//     fetch('https://namazvakitleri.diyanet.gov.tr/tr-TR/13980/rotterdam-icin-namaz-vakti')
//         .then(response => response.json())
//         .then(data => alert(data))
//     // }, secondsToMidnight * 1000);
// });

function getCurrentDate()
{
    const today = new Date();
    return today.toISOString().split('T')[0];
}

async function getNamazTimes(cityCode)
{
    return new Promise((resolve) =>
    {
        fetch(`https://namazvakitleri.diyanet.gov.tr/tr-TR/${cityCode}`)
            .then(response => response.text())
            .then(data =>
            {
                const matches = [...data.matchAll(namazTimeRegex)];
                resolve(matches);
            })
    });
}

function rgbaArrayToHex(colorArray)
{
    if (colorArray.length < 3) return null;  // Ensure at least RGB values are provided

    // Extract RGB values, ignore alpha for hex conversion
    const [r, g, b] = colorArray;

    // Convert each component to a two-digit hex string and concatenate
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
}

function updateBadge(text)
{
    chrome.action.setBadgeText({ text: text });
}