const NAMAZ_TIME_REGEX = /var _[a-zA-Z]+ = "(\d+:\d+)";/g;
const NEXT_IMSAK_TIME_REGEX = /var nextImsakTime = "(\d+:\d+)";/;

let BADGE_BACKGROUND_COLOR;
let BADGE_TEXT_COLOR;
let CURRENT_NAMAZ_INDEX;
let CURRENT_NAMAZ_PRAYED;
let NAMAZ_TIMES_FORMATTED;
let NAMAZ_TIMES_SECONDS;
let SET_BADGE_TASK_ID;
let SET_BADGE_TASK_INTERVAL_MILLISECONDS = 1;
let UPDATE_NAMAZ_TIMES_TASK_ID;

// Used to keep the service worker alive
chrome.alarms.create({ periodInMinutes: .4 })
chrome.alarms.onAlarm.addListener(() =>
{
    console.log('Keeping service worker alive...')
});

// TODO citycode change, checkbox change
// chrome.runtime.onMessage.addListener((message, sender, sendResponse) =>
// {
// });

// Open popup page when the extension icon is clicked
chrome.action.onClicked.addListener(() =>
{
    chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
});

// Start namaz timer when the extension is installed
chrome.runtime.onInstalled.addListener(async () =>
{
    await populateStorage();
    await updateNamazTimes();
    await updateCurrentNamaz();
    await retrieveBadgeColors();
    SET_BADGE_TASK_ID = startTask(badgeTask, SET_BADGE_TASK_INTERVAL_MILLISECONDS);
});

// Start namaz timer when the extension is started
chrome.runtime.onStartup.addListener(async () =>
{
    await updateNamazTimes();
    await updateCurrentNamaz();
    await retrieveBadgeColors();
    SET_BADGE_TASK_ID = startTask(badgeTask, SET_BADGE_TASK_INTERVAL_MILLISECONDS);
});

function getCurrentDateString()
{
    const today = new Date();
    return today.toISOString().split('T')[0];
}

function populateStorage()
{
    const storagePairs = [
        { key: 'activeTab', value: 'Namaz' },
        { key: 'allowYoutubePremiumQuality', value: false },
        { key: 'cityCode', value: '13980' },
        { key: 'currentDate', value: getCurrentDateString() },
        { key: 'playTiktoksInBackground', value: false },
        { key: 'enableYoutubeSetQuality', value: false },
        { key: 'enableTwitchTheatreMode', value: false },
        { key: 'youtubeMaxQuality', value: '1080p' },
        { key: 'namazPrayed', value: Array(6).fill(false) },
        { key: 'namazTimesFormatted', value: [] },
    ]

    // Check if storage key exists, if not, set it
    chrome.storage.sync.get(storagePairs.map(pair => pair.key), function (storage)
    {
        storagePairs.forEach(pair =>
        {
            if (!storage[pair.key])
            {
                chrome.storage.sync.set({ [pair.key]: pair.value });
            }
        });
    });
}

function fetchFormattedNamazTimes(cityCode, callback)
{
    fetch(`https://namazvakitleri.diyanet.gov.tr/tr-TR/${cityCode}`)
        .then(response => response.text())
        .then(data =>
        {
            const matches = [...data.matchAll(NAMAZ_TIME_REGEX)];
            if (matches.length !== 6)
            {
                throw new Error('Failed to match namaz times due to an invalid city code');
            }

            const nextImsakTime = data.match(NEXT_IMSAK_TIME_REGEX)[1];
            let namazTimesFormatted = matches.map(match => match[1]);
            namazTimesFormatted.push(nextImsakTime);

            callback(namazTimesFormatted);
        })
        .catch(() =>
        {
            throw new Error('Failed to fetch namaz times');
        });
}

function syncFormattedNamazTimes(cityCode)
{
    return new Promise((resolve, reject) =>
    {
        fetchFormattedNamazTimes(cityCode, namazTimesFormatted =>
        {
            chrome.storage.sync.set({ namazTimesFormatted: namazTimesFormatted });
            console.log('setNamazTimesFormatted');

            resolve(namazTimesFormatted);
        });
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

function mapFormattedNamazTimesToSeconds()
{
    return NAMAZ_TIMES_FORMATTED.map(time => convertFormattedTimeToSeconds(time));
}

async function updateNamazTimes()
{
    const storage = await new Promise((resolve, reject) =>
    {
        chrome.storage.sync.get(['cityCode', 'currentDate', 'namazTimesFormatted'], (result) =>
        {
            if (chrome.runtime.lastError)
            {
                return reject(new Error(chrome.runtime.lastError));
            }
            resolve(result);
        });
    });

    if (!storage.cityCode)
    {
        throw new Error('City code is not set');
    }

    const currentDateString = getCurrentDateString();
    if (storage.currentDate !== currentDateString || storage.namazTimesFormatted.length === 0)
    {
        NAMAZ_TIMES_FORMATTED = await syncFormattedNamazTimes(storage.cityCode);

        await new Promise((resolve, reject) =>
        {
            chrome.storage.sync.set({ currentDate: currentDateString }, () =>
            {
                if (chrome.runtime.lastError)
                {
                    return reject(new Error(chrome.runtime.lastError));
                }
                resolve();
            });
        });
    }
    else
    {
        NAMAZ_TIMES_FORMATTED = storage.namazTimesFormatted;
    }

    NAMAZ_TIMES_SECONDS = mapFormattedNamazTimesToSeconds();
}


function rgbaArrayToHex(colorArray)
{
    // Ensure at least RGB values are provided
    if (colorArray.length < 3)
    {
        return false;
    }

    // Extract RGB values, ignore alpha for hex conversion
    const [r, g, b] = colorArray;

    // Convert each component to a two-digit hex string and concatenate
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
}

function retrieveBadgeColors()
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

function startTask(taskFunction, intervalMilliseconds)
{
    return setInterval(taskFunction, intervalMilliseconds);
}

function restartTask(taskId, taskFunction, intervalMilliseconds)
{
    clearInterval(taskId);
    return startTask(taskFunction, intervalMilliseconds);
}

function getCurrentTimeSeconds()
{
    const now = new Date();
    return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
}

function getCurrentNamazIndex()
{
    const currentTimeSeconds = getCurrentTimeSeconds();

    // Remove the last element (next day's imsak) and get the times that have already passed
    const validTimes = NAMAZ_TIMES_SECONDS.slice(0, -1).filter(time => time < currentTimeSeconds);

    // Find the closest time by getting the max of the filtered times
    const closestTime = Math.max(...validTimes);

    return NAMAZ_TIMES_SECONDS.indexOf(closestTime);
}

async function updateCurrentNamaz()
{
    const currentNamazIndex = getCurrentNamazIndex();
    if (!CURRENT_NAMAZ_INDEX)
    {
        CURRENT_NAMAZ_INDEX = currentNamazIndex;
        const storage = await new Promise((resolve, reject) =>
        {
            chrome.storage.sync.get('namazPrayed', (result) =>
            {
                if (chrome.runtime.lastError)
                {
                    return reject(new Error(chrome.runtime.lastError));
                }
                resolve(result);
            });
        });
        CURRENT_NAMAZ_PRAYED = storage.namazPrayed[currentNamazIndex];
    }
    else if (currentNamazIndex !== CURRENT_NAMAZ_INDEX)
    {
        CURRENT_NAMAZ_INDEX = currentNamazIndex;
        CURRENT_NAMAZ_PRAYED = false;
    }
}


function getSecondsToNextNamaz()
{
    const currentTimeSeconds = getCurrentTimeSeconds();
    const nextNamazIndex = CURRENT_NAMAZ_INDEX + 1;
    if (!NAMAZ_TIMES_SECONDS[nextNamazIndex])
    {
        // Next namaz is the next day's imsak
        // 24 hours in seconds - current time in seconds + imsak time in seconds
        return 86400 - currentTimeSeconds + NAMAZ_TIMES_SECONDS.at(-1);
    }

    return NAMAZ_TIMES_SECONDS[CURRENT_NAMAZ_INDEX + 1] - currentTimeSeconds;
}

function convertSecondsToHours(seconds)
{
    return Math.floor(seconds / 3600);
}

function convertSecondsToMinutes(seconds)
{
    return Math.ceil(seconds / 60);
}

function setBadgeColors(badgeBackgroundColor, badgeTextColor)
{
    if (badgeBackgroundColor !== BADGE_BACKGROUND_COLOR)
    {
        chrome.action.setBadgeBackgroundColor({ color: badgeBackgroundColor });
        BADGE_BACKGROUND_COLOR = badgeBackgroundColor;
        console.log('setBadgeBackgroundColor');
    }

    if (badgeTextColor !== BADGE_TEXT_COLOR)
    {
        chrome.action.setBadgeTextColor({ color: badgeTextColor });
        BADGE_TEXT_COLOR = badgeTextColor
        console.log('setBadgeTextColor');
    }
}

function updateBadge()
{
    let badgeBackgroundColor;
    let badgeTextColor = '#000000'; // Black
    if (CURRENT_NAMAZ_PRAYED)
    {
        badgeBackgroundColor = '#00ff00'; // Green
    }
    else if (CURRENT_NAMAZ_INDEX === 1)
    {
        // Current namaz is sunrise
        badgeBackgroundColor = '#808080'; // Gray
        badgeTextColor = '#ffffff'; // White
    }
    else
    {
        badgeBackgroundColor = '#ff0000'; // Red
    }

    const secondsToNextNamaz = getSecondsToNextNamaz();
    let formattedTime;
    if (secondsToNextNamaz > 3600)
    {
        // 1 hour or more left until the next namaz
        const hours = convertSecondsToHours(secondsToNextNamaz);
        const minutes = convertSecondsToMinutes(secondsToNextNamaz) % 60;
        const paddedMinutes = String(minutes).padStart(2, '0');
        formattedTime = `${hours}:${paddedMinutes}`;

        if (!CURRENT_NAMAZ_PRAYED)
        {
            badgeBackgroundColor = '#00ffff'; // Cyan
        }
    }
    else if (secondsToNextNamaz > 60)
    {
        // Less than 1 hour left until the next namaz but 1 minute or more left
        const minutes = convertSecondsToMinutes(secondsToNextNamaz);
        formattedTime = `${minutes}m`;
    }
    else
    {
        // Less than 1 minute left until the next namaz
        formattedTime = `${secondsToNextNamaz}s`;
    }

    setBadgeColors(badgeBackgroundColor, badgeTextColor);

    chrome.action.setBadgeText({ text: formattedTime });
    console.log('setBadgeText');
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

function badgeTask()
{
    const currentTimeSeconds = getCurrentTimeSeconds();
    if (!UPDATE_NAMAZ_TIMES_TASK_ID)
    {
        const secondsToTomorrowImsak = 86400 - currentTimeSeconds + NAMAZ_TIMES_SECONDS.at(-1);
        UPDATE_NAMAZ_TIMES_TASK_ID = setTimeout(() =>
        {
            updateNamazTimes();
            updateCurrentNamaz();
            UPDATE_NAMAZ_TIMES_TASK_ID = null;
        }, secondsToTomorrowImsak * 1000);
    }

    updateBadge();

    const currentTimeMilliseconds = getCurrentTimeMilliseconds();
    const secondsToNextNamaz = getSecondsToNextNamaz();
    let restart = true;
    if (SET_BADGE_TASK_INTERVAL_MILLISECONDS === 1)
    {
        // Only runs once at the startup of the extension
        // Restarts at the start of the next second
        const nextSecond = currentTimeSeconds + 1;
        const nextSecondMilliseconds = nextSecond * 1000;
        SET_BADGE_TASK_INTERVAL_MILLISECONDS = nextSecondMilliseconds - currentTimeMilliseconds;
    }
    else if (SET_BADGE_TASK_INTERVAL_MILLISECONDS !== 1000 && secondsToNextNamaz <= 60)
    {
        // Restart in 1 second when the next namaz is less than 1 minute away
        SET_BADGE_TASK_INTERVAL_MILLISECONDS = 1000;
    }
    else if (SET_BADGE_TASK_INTERVAL_MILLISECONDS < 1000 && secondsToNextNamaz > 60)
    {
        // Restart at the next :59 second when the next namaz is more than 1 minute away
        const currentTimeMinutes = getCurrentTimeMinutes();
        const nextMinute = currentTimeMinutes + 1;
        const nextMinuteMilliseconds = nextMinute * 60000;
        SET_BADGE_TASK_INTERVAL_MILLISECONDS = nextMinuteMilliseconds - currentTimeMilliseconds + 1000;
    }
    else if (SET_BADGE_TASK_INTERVAL_MILLISECONDS !== 60000 && secondsToNextNamaz >= 60)
    {
        // Restart in 1 minute when the next namaz is more than 1 minute away
        SET_BADGE_TASK_INTERVAL_MILLISECONDS = 60000;
    }
    else
    {
        restart = false;
    }

    if (restart)
    {
        console.log(`Restarting badge task in ${SET_BADGE_TASK_INTERVAL_MILLISECONDS} milliseconds`);
        SET_BADGE_TASK_ID = restartTask(SET_BADGE_TASK_ID, badgeTask, SET_BADGE_TASK_INTERVAL_MILLISECONDS);
    }
}



















function namazCheckboxChanged(index, isChecked)
{
    const currentTimeSeconds = getCurrentTimeSeconds();
    const currentNamazIndex = getCurrentNamazIndex(currentTimeSeconds, NAMAZ_TIMES_SECONDS);
    if (index === currentNamazIndex)
    {
        CURRENT_NAMAZ_PRAYED = isChecked;
        intervalTask();
    }
}

function newDay()
{
    CURRENT_NAMAZ_PRAYED = false;
    intervalTask();
}