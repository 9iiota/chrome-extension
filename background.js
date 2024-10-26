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
        const timerInterval = setInterval(() =>
        {
            const currentDate = getCurrentDate();
            let { namazTimes } = data;
            if (data.namazTimes && data.namazTimes.at(-1) !== currentDate)
            {
                console.log(data.cityCode);
                (async () =>
                {
                    namazTimes = [...await getNamazTimes(data.cityCode), currentDate];
                    chrome.storage.sync.set({ namazTimes: namazTimes });
                })();
            }

            const timesInSeconds = namazTimes.map(time =>
            {
                const [hours, minutes] = time.at(-1).split(":").map(Number); // Split and convert to numbers
                return (hours * 60 + minutes) * 60; // Convert to total seconds
            });

            const now = new Date();
            const currentTimeSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
            const nextNamazIndex = timesInSeconds.findIndex(time => time > currentTimeSeconds);
            const nextNamazTimeSeconds = timesInSeconds[nextNamazIndex];
            const secondsToNextNamaz = nextNamazTimeSeconds - currentTimeSeconds;

            const hours = Math.floor(secondsToNextNamaz / 3600);
            const minutes = Math.floor((secondsToNextNamaz % 3600) / 60);
            let formattedTime;
            let color;
            if (hours > 0)
            {
                formattedTime = `${hours}:${minutes}`;
                color = '#00ff00';
            }
            else
            {
                const seconds = secondsToNextNamaz % 60;
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

    //         const timerInterval = setInterval(() =>
    //         {
    //             if (secondsToNextNamaz > 0)
    //             {
    //                 updateBadge(formattedTime);
    //             }
    //             else
    //             {
    //                 clearInterval(timerInterval);
    //             }
    //         }, 1000);
    //     })
    //     .catch(error => console.error('Error:', error));
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

function updateBadge(text)
{
    chrome.action.setBadgeText({ text: text });
}