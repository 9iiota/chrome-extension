const namazTimeRegex = /var _[a-zA-Z]+ = "(\d+:\d+)";/g;

// Open popup page when the extension icon is clicked
chrome.action.onClicked.addListener(() =>
{
    chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
});

chrome.runtime.onInstalled.addListener(() =>
{
    // const secondsToMidnight = getSecondsToTomorrow();
    // setTimeout(() =>
    // {
    fetch('https://namazvakitleri.diyanet.gov.tr/tr-TR/13980/rotterdam-icin-namaz-vakti')
        .then(response => response.text())
        .then(data =>
        {
            const matches = [...data.matchAll(namazTimeRegex)];

            chrome.storage.sync.set({ namazTimes: matches });

            console.log(matches); // Logs all matches
        })
        .catch(error => console.error('Error:', error));
    // }, secondsToMidnight * 1000);
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

function getSecondsToTomorrow()
{
    const now = new Date();
    const midnight = new Date(now);

    // Set to midnight of the next day
    midnight.setHours(24, 0, 0, 0);

    // Calculate the difference in seconds
    return Math.floor((midnight - now) / 1000);
}