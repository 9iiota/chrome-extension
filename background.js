const namazTimeRegex = /var _[a-zA-Z]+ = "(\d+:\d+)";/g;
let intervalId;
let condition = false;
let intervalMilliseconds = 1000;
let previousTimeMinutes = getCurrentTimeMinutes();
let namazTimesFormatted;
let namazTimesSeconds;
let storageBadgeColor;
let storageCityCode;

// Open popup page when the extension icon is clicked
chrome.action.onClicked.addListener(() =>
{
    chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
});

chrome.runtime.onInstalled.addListener(() =>
{
    chrome.storage.sync.get(['badgeColor', 'cityCode', 'namazTimesFormatted'], storage =>
    {
        storageBadgeColor = storage.badgeColor;
        storageCityCode = storage.cityCode;

        chrome.action.getBadgeBackgroundColor({}, badgeColor =>
        {
            badgeColor = rgbaArrayToHex(badgeColor);
            if (badgeColor !== storage.badgeColor)
            {
                chrome.action.setBadgeBackgroundColor({ color: storage.badgeColor });
                console.log('setBadgeBackgroundColor');
            }

            namazTimesFormatted = storage.namazTimesFormatted || [];
            namazTimesSeconds = namazTimesFormatted.map(time => convertFormattedTimeToSeconds(time)) || [];
            startInterval();
        });
    });
});

// // chrome.runtime.onStartup.addListener(() =>
// // {
// //     // const secondsToMidnight = getSecondsToTomorrow();
// //     // setTimeout(() =>
// //     // {
// //     fetch('https://namazvakitleri.diyanet.gov.tr/tr-TR/13980/rotterdam-icin-namaz-vakti')
// //         .then(response => response.json())
// //         .then(data => alert(data))
// //     // }, secondsToMidnight * 1000);
// // });

function rgbaArrayToHex(colorArray)
{
    if (colorArray.length < 3)
    {
        return null;
    }  // Ensure at least RGB values are provided

    // Extract RGB values, ignore alpha for hex conversion
    const [r, g, b] = colorArray;

    // Convert each component to a two-digit hex string and concatenate
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
}

function convertFormattedTimeToSeconds(formattedTime)
{
    const [hours, minutes] = formattedTime.split(":").map(Number);
    return (hours * 60 + minutes) * 60;
}

function getCurrentTimeMinutes()
{
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
}

async function getNamazTimes(cityCode)
{
    return new Promise((resolve) =>
    {
        fetch(`https://namazvakitleri.diyanet.gov.tr/tr-TR/${cityCode}`)
            .then(response => response.text())
            .then(data =>
            {
                const namazTimesFormatted = [...data.matchAll(namazTimeRegex)].map(match => match[1]);
                resolve(namazTimesFormatted);
            })
    });
}

function getCurrentDateString()
{
    const today = new Date();
    return today.toISOString().split('T')[0];
}

function getCurrentTimeSeconds()
{
    const now = new Date();
    return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
}

function getNextNamazIndex(currentTimeSeconds, namazTimeSeconds)
{
    return namazTimeSeconds.findIndex(time => time > currentTimeSeconds);
}

function convertSecondsToHours(seconds)
{
    return Math.floor(seconds / 3600);
}

function convertSecondsToMinutes(seconds)
{
    return Math.floor(seconds / 60);
}

function intervalTask()
{
    const currentDateString = getCurrentDateString();
    if (namazTimesFormatted.length === 0 || namazTimesFormatted.at(-1) !== currentDateString)
    {
        (async () =>
        {
            namazTimesFormatted = [...await getNamazTimes(storageCityCode), currentDateString];
            namazTimesSeconds = namazTimesFormatted.map(time => convertFormattedTimeToSeconds(time));

            chrome.storage.sync.set({ namazTimesFormatted: namazTimesFormatted });
            console.log('setNamazTimesFormatted');
        })();
    }

    // Get the time until the next prayer
    const currentTimeSeconds = getCurrentTimeSeconds();
    const nextNamazIndex = getNextNamazIndex(currentTimeSeconds, namazTimesSeconds);
    const secondsToNextNamaz = namazTimesSeconds[nextNamazIndex] - currentTimeSeconds;
    const hours = convertSecondsToHours(secondsToNextNamaz);
    const minutes = convertSecondsToMinutes(secondsToNextNamaz) % 60;

    // Set the badge text and color
    let formattedTime;
    let color;
    if (hours > 0)
    {
        formattedTime = `${hours}:${String(minutes).padStart(2, '0')}`;
        color = '#00ff00';
    }
    else
    {
        formattedTime = `${minutes}:${String(secondsToNextNamaz % 60).padStart(2, '0')}`;
        color = '#ff0000';
    }

    // Check if the next time is sunrise
    if (nextNamazIndex === 2)
    {
        color = '#808080';
    }

    if (color !== storageBadgeColor)
    {
        chrome.action.setBadgeBackgroundColor({ color: color });
        chrome.storage.sync.set({ badgeColor: color });
        console.log('setBadgeBackgroundColor 2');
    }

    chrome.action.setBadgeText({ text: formattedTime });
    console.log('setBadgeText');

    const currentTimeMinutes = getCurrentTimeMinutes();
    if (
        intervalMilliseconds === 1000
        && currentTimeMinutes !== previousTimeMinutes
        && (
            hours > 0
            || hours === 0 && minutes > 0
        )
    )
    {
        intervalMilliseconds = 60000;
        previousTimeMinutes = currentTimeMinutes;
        restartInterval();
    }
    else if (
        intervalMilliseconds !== 1000
        && minutes < 0
    )
    {
        intervalMilliseconds = 1000;
        previousTimeMinutes = currentTimeMinutes;
        restartInterval();
    }
}

function startInterval()
{
    intervalId = setInterval(intervalTask, intervalMilliseconds);
}

function restartInterval()
{
    clearInterval(intervalId);
    startInterval();
}