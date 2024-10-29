const namazTimeRegex = /var _[a-zA-Z]+ = "(\d+:\d+)";/g;
const nextImsakTimeRegex = /var nextImsakTime = "(\d+:\d+)";/;

let cityCode;
let badgeBackgroundColor;
let badgeTextColor;
let namazTimesFormatted;
let namazTimesSeconds;
let intervalId;
let intervalMilliseconds = 100;
let previousTimeSeconds = getCurrentTimeSeconds();

// Used to keep the service worker alive
chrome.alarms.create({ periodInMinutes: .49 })
chrome.alarms.onAlarm.addListener(() =>
{
    console.log('Keeping service worker alive')
});

// Open popup page when the extension icon is clicked
chrome.action.onClicked.addListener(() =>
{
    chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
});

// Start namaz timer when the extension is installed
chrome.runtime.onInstalled.addListener(() =>
{
    chrome.storage.sync.get(['cityCode', 'namazTimesFormatted'], storage =>
    {
        cityCode = storage.cityCode;
        setBadgeData();

        namazTimesFormatted = storage.namazTimesFormatted || [];
        namazTimesSeconds = namazTimesFormatted.map(time => convertFormattedTimeToSeconds(time)) || [];
        startInterval();
    });
});

// Start namaz timer when the extension is started
chrome.runtime.onStartup.addListener(() =>
{
    chrome.storage.sync.get(['cityCode', 'namazTimesFormatted'], storage =>
    {
        cityCode = storage.cityCode;
        setBadgeData();

        namazTimesFormatted = storage.namazTimesFormatted || [];
        namazTimesSeconds = namazTimesFormatted.map(time => convertFormattedTimeToSeconds(time)) || [];
        startInterval();
    });
});

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

function setBadgeData()
{
    chrome.action.getBadgeBackgroundColor({}, colorArray =>
    {
        badgeBackgroundColor = rgbaArrayToHex(colorArray);
    });

    chrome.action.getBadgeTextColor({}, colorArray =>
    {
        badgeTextColor = rgbaArrayToHex(colorArray);
    });
}

function convertFormattedTimeToSeconds(formattedTime)
{
    const [hours, minutes] = formattedTime.split(":").map(Number);
    if (!hours && !minutes)
    {
        return formattedTime;
    }

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
                let namazTimesFormatted = [...data.matchAll(namazTimeRegex)].map(match => match[1]);
                namazTimesFormatted.push(data.match(nextImsakTimeRegex)[1]);
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
            namazTimesFormatted = [...await getNamazTimes(cityCode), currentDateString];
            namazTimesSeconds = namazTimesFormatted.map(time => convertFormattedTimeToSeconds(time));
            console.log(namazTimesSeconds);

            chrome.storage.sync.set({ namazTimesFormatted: namazTimesFormatted });
            console.log('setNamazTimesFormatted');
        })();
    }

    // Get the time until the next prayer
    const currentTimeSeconds = getCurrentTimeSeconds();
    const nextNamazIndex = getNextNamazIndex(currentTimeSeconds, namazTimesSeconds);
    let secondsToNextNamaz;
    if (nextNamazIndex === 6)
    {
        // Next namaz is the next day's imsak
        // 24 hours in seconds - current time in seconds + imsak time in seconds
        secondsToNextNamaz = 86400 - currentTimeSeconds + namazTimesSeconds[6];
    }
    else
    {
        secondsToNextNamaz = namazTimesSeconds[nextNamazIndex] - currentTimeSeconds;
    }

    const hours = convertSecondsToHours(secondsToNextNamaz);
    const minutes = convertSecondsToMinutes(secondsToNextNamaz) % 60;

    let formattedTime;
    let backgroundColor;
    let textColor;
    if (hours > 0)
    {
        formattedTime = `${hours}:${String(minutes).padStart(2, '0')}`;
        backgroundColor = '#00ff00';
        textColor = '#000000';
    }
    else
    {
        if (minutes > 0)
        {
            formattedTime = `${String(minutes).padStart(2, '0')}m`;
        }
        else
        {
            formattedTime = `${String(secondsToNextNamaz % 60).padStart(2, '0')}`;
        }

        backgroundColor = '#ff0000';
        textColor = '#ffffff';
    }

    // Check if the next time is sunrise
    if (nextNamazIndex === 2)
    {
        backgroundColor = '#808080';
    }

    if (backgroundColor !== badgeBackgroundColor)
    {
        chrome.action.setBadgeBackgroundColor({ color: backgroundColor });
        chrome.storage.sync.set({ badgeColor: backgroundColor });
        console.log('setBadgeBackgroundColor');
    }

    if (textColor !== badgeTextColor)
    {
        chrome.action.setBadgeTextColor({ color: textColor });
        chrome.storage.sync.set({ badgeTextColor: textColor });
        console.log('setBadgeTextColor');
    }

    chrome.action.setBadgeText({ text: formattedTime });
    console.log('setBadgeText');

    if (intervalMilliseconds === 100 && currentTimeSeconds != previousTimeSeconds)
    {
        if (secondsToNextNamaz > 59) // TODO maybe 60 seconds is better?
        {
            // Restart with interval that is 61 seconds minus the current second so it starts at the beginning of the next minute
            // Using 60 seconds would cause the next interval to run on, for example, 1:30:00 instead of 1:29:59 and would thus display the wrong minute
            intervalMilliseconds = 61000 - currentTimeSeconds % 60 * 1000;
        }
        else
        {
            // Restart with interval of 1 second because the next namaz is less than 1 minute away
            intervalMilliseconds = 1000;
        }

        restartInterval();
    }
    else if (intervalMilliseconds > 100 && intervalMilliseconds < 60000)
    {
        // Restart with interval of 60 seconds
        intervalMilliseconds = 60000;
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