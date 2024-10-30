const namazTimeRegex = /var _[a-zA-Z]+ = "(\d+:\d+)";/g;
const nextImsakTimeRegex = /var nextImsakTime = "(\d+:\d+)";/;

let BADGE_BACKGROUND_COLOR;
let BADGE_TEXT_COLOR;
let CITY_CODE;
let INTERVAL_MILLISECONDS = 1;

let namazTimesFormatted;
let namazTimesSeconds;
let intervalId;
let previousTimeSeconds = getCurrentTimeSeconds();

let c = '#ff0000';
chrome.runtime.onMessage.addListener((message, sender, sendResponse) =>
{
    console.log(message);
    if (message.action === "checkboxChanged")
    {
        const { id, checked } = message.data;
        console.log(`Checkbox ${id} is now ${checked ? "checked" : "unchecked"}`);

        c = checked ? '#00ff00' : '#ff0000';
        // Do something with this data
    }
});

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
        CITY_CODE = storage.cityCode;
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
        CITY_CODE = storage.cityCode;
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
        BADGE_BACKGROUND_COLOR = rgbaArrayToHex(colorArray);
    });

    chrome.action.getBadgeTextColor({}, colorArray =>
    {
        BADGE_TEXT_COLOR = rgbaArrayToHex(colorArray);
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

function getCurrentTimeMilliseconds()
{
    const now = new Date();
    return now.getHours() * 3600000 + now.getMinutes() * 60000 + now.getSeconds() * 1000 + now.getMilliseconds();
}

function getCurrentTimeMinutes()
{
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
}

function intervalTask()
{
    const currentDateString = getCurrentDateString();
    if (namazTimesFormatted.length === 0 || namazTimesFormatted.at(-1) !== currentDateString)
    {
        (async () =>
        {
            namazTimesFormatted = [...await getNamazTimes(CITY_CODE), currentDateString];
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
    if (nextNamazIndex === -1)
    {
        // Next namaz is the next day's imsak
        // 24 hours in seconds - current time in seconds + imsak time in seconds
        secondsToNextNamaz = 86400 - currentTimeSeconds + namazTimesSeconds[6];
    }
    else
    {
        secondsToNextNamaz = namazTimesSeconds[nextNamazIndex] - currentTimeSeconds;
    }

    let formattedTime;
    let badgeBackgroundColor;
    let badgeTextColor = '#000000';
    if (secondsToNextNamaz >= 60)
    {
        const minutes = convertSecondsToMinutes(secondsToNextNamaz) % 60;
        if (secondsToNextNamaz >= 3600)
        {
            // 1 hour or more left until the next namaz
            const hours = convertSecondsToHours(secondsToNextNamaz);
            const paddedMinutes = String(minutes).padStart(2, '0');
            formattedTime = `${hours}:${paddedMinutes}`;
            badgeBackgroundColor = '#00ff00'; // Green
        }
        else
        {
            // Less than 1 hour left until the next namaz but 1 minute or more left
            formattedTime = `${minutes}m`;
            badgeBackgroundColor = '#ff0000'; // Red
        }
    }
    else
    {
        // Less than 1 minute left until the next namaz
        formattedTime = `${secondsToNextNamaz}s`;
        badgeBackgroundColor = '#ff0000'; // Red
    }

    // Check if the next time is sunrise
    if (nextNamazIndex === 2)
    {
        badgeBackgroundColor = '#808080';
        badgeTextColor = '#ffffff';
    }

    if (badgeBackgroundColor !== BADGE_BACKGROUND_COLOR)
    {
        chrome.action.setBadgeBackgroundColor({ color: badgeBackgroundColor });
        chrome.storage.sync.set({ badgeColor: badgeBackgroundColor });
        console.log('setBadgeBackgroundColor');
    }

    if (badgeTextColor !== BADGE_TEXT_COLOR)
    {
        chrome.action.setBadgeTextColor({ color: badgeTextColor });
        chrome.storage.sync.set({ badgeTextColor: badgeTextColor });
        console.log('setBadgeTextColor');
    }

    chrome.action.setBadgeText({ text: formattedTime });
    console.log('setBadgeText');

    const currentTimeMilliseconds = getCurrentTimeMilliseconds();
    if (INTERVAL_MILLISECONDS === 1)
    {
        // Only runs once at the startup of the extension
        // Restarts at the start of the next second
        const nextSecond = currentTimeSeconds + 1;
        const nextSecondMilliseconds = nextSecond * 1000;
        INTERVAL_MILLISECONDS = nextSecondMilliseconds - currentTimeMilliseconds;
        restartInterval(); // 130ms
    }
    else if (INTERVAL_MILLISECONDS !== 1000 && secondsToNextNamaz <= 59)
    {
        // Restart in 1 second when the next namaz is less than 1 minute away
        INTERVAL_MILLISECONDS = 1000;
        restartInterval();
    }
    else if (INTERVAL_MILLISECONDS < 1000 && secondsToNextNamaz >= 60)
    {
        // Restart at the next :59 second when the next namaz is more than 1 minute away
        const currentTimeMinutes = getCurrentTimeMinutes();
        const nextMinute = currentTimeMinutes + 1;
        const nextMinuteMilliseconds = nextMinute * 60000;
        INTERVAL_MILLISECONDS = nextMinuteMilliseconds - currentTimeMilliseconds + 1000;
        restartInterval(); // 43000ms
    }
    else if (INTERVAL_MILLISECONDS !== 60000 && secondsToNextNamaz >= 60)
    {
        // Restart in 1 minute when the next namaz is more than 1 minute away
        INTERVAL_MILLISECONDS = 60000;
        restartInterval();
    }
}

function startInterval()
{
    intervalId = setInterval(intervalTask, INTERVAL_MILLISECONDS);
}

function restartInterval()
{
    clearInterval(intervalId);
    startInterval();
}