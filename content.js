const PointerType = {
    START: 'start',
    END: 'end'
};
const excludedQualityOptions = ['Auto', 'Premium'];
const videoPlayer = document.querySelector('.video-stream');
const videoDurationFormatted = document.querySelector('.ytp-time-duration').innerText;
const videoDurationSeconds = timeToSeconds(videoDurationFormatted);

let looping = false;
let loopStart = '0:00';
let loopEnd = videoDurationFormatted;
let smallIntervalPlayEvent = null;
let bigIntervalPlayEvent = null;
let loopSliderBackground = null;

chrome.storage.sync.get(['enableSetQuality', 'maxQuality'], function (data)
{
    if (!data.enableSetQuality)
    {
        return;
    }

    // Wait for settings panel
    const onSettingsFound = [[clickHighestQuality, data.maxQuality], [focusVideoPlayer, null]];
    waitForElement('.ytp-panel', onSettingsFound);
});

const onTopLevelButtonsFound = [[addLoopButton, null]];
waitForElement('.style-scope ytd-watch-metadata #top-level-buttons-computed', onTopLevelButtonsFound);

document.addEventListener('visibilitychange', function ()
{
    if (!document.hidden)
    {
        waitForElement('.style-scope ytd-watch-metadata #top-level-buttons-computed', onTopLevelButtonsFound);
    }
});

function waitForElement(selector, onElementFound)
{
    const observer = new MutationObserver((mutations, observer) =>
    {
        if (document.querySelector(selector))
        {
            for (const callback of onElementFound)
            {
                // Call the function with argument if it exists, else call it without arguments
                callback[0](callback[1] ?? undefined);
            }
            observer.disconnect();
        }
    });
    const config = { childList: true, subtree: true };

    observer.observe(document.body, config);
}

function clickSettingsButton()
{
    const settingsButton = document.querySelector('.ytp-settings-button');
    settingsButton?.click();
}

function clickQualityButton()
{
    const labels = Array.from(document.querySelectorAll('.ytp-panel .ytp-panel-menu .ytp-menuitem .ytp-menuitem-label'));
    const qualityButton = labels.find(label => label.textContent.includes('Quality'));
    qualityButton?.click();
}

function openQualityMenu()
{
    clickSettingsButton();
    clickQualityButton();
}

function convertQualityToInt(quality)
{
    return parseInt(quality.split('p')[0], 10);
}

function clickHighestQuality(maxQuality)
{
    openQualityMenu();

    const maxQualityInt = convertQualityToInt(maxQuality);
    const qualityOptions = document.querySelectorAll('.ytp-panel.ytp-quality-menu .ytp-panel-menu .ytp-menuitem');
    for (const option of qualityOptions)
    {
        const span = option.querySelector('.ytp-menuitem-label div span');
        const isExcluded = excludedQualityOptions.some(option => span.textContent.includes(option));
        if (span && !isExcluded)
        {
            const qualityInt = convertQualityToInt(span.textContent);
            if (qualityInt <= maxQualityInt)
            {
                span.click();
                return true;
            }
        }
    }
}

function focusVideoPlayer()
{
    const videoPlayer = document.querySelector('.video-stream');
    videoPlayer?.focus();
}

function getCurrentVideoSeconds()
{
    return videoPlayer.currentTime.toFixed(0);
}

/**
 * Convert time to seconds
 * @param {string} time - The time in the format "M:SS", "MM:SS", "H:MM:SS" or "HH:MM:SS"
 * @returns {number} - The total number of seconds
 */
function timeToSeconds(time)
{
    // This regex will match the following:
    // 0:00 - 9:59 | 10:00 - 59:59 | 1:00:00 - 9:59:59 | 10:00:00 - 99:59:59 | 100:00:00 - 999:59:59
    const regex = /^(\d{1}:[0-5]{1}\d{1})$|^([1-5]{1}\d{1}:[0-5]{1}\d{1})$|^([1-9]{1}:[0-5]{1}\d{1}:[0-5]{1}\d{1})$|^([1-9]{1}\d{1}:[0-5]{1}\d{1}:[0-5]{1}\d{1})$|^([1-9]{1}\d{1}\d{1}:[0-5]{1}\d{1}:[0-5]{1}\d{1})$/;
    const parts = time.toString().split(':');

    if (regex.test(time))
    {
        let totalSeconds = 0;
        for (let i = parts.length - 1; i >= 0; i--)
        {
            // This converts the string to an integer
            // We starts with seconds, then minutes, etc.
            const part = parseInt(parts[i], 10);

            // This will multiply the part by 60 to the power of the position in the array
            // For example, if the part is 4 and the position is 2 (hours) starting from the back, this will be 4 * 60^2 (3600) = 14400 seconds 
            totalSeconds += part * Math.pow(60, parts.length - 1 - i);
        }

        return totalSeconds;
    }
}

// This function is used when the user inputs a time in the input field
function setSliderPointerPosition(type, formattedTime)
{
    const seconds = timeToSeconds(formattedTime);
    const loopSliderSelection = document.querySelector('.loop-slider-selection');
    if (type === PointerType.START)
    {
        if (seconds >= 0 && seconds < timeToSeconds(loopEnd))
        {
            const leftMarginPercentageInt = parseFloat((seconds / videoDurationSeconds) * 100);
            loopSliderSelection.style.marginLeft = `${leftMarginPercentageInt}%`;

            const startInput = document.querySelector('#loop-start-input');
            const startPointerTooltip = document.querySelector('.start-pointer-tooltip');
            startPointerTooltip.innerText = loopStart = startInput.value;
        }
        else
        {
            const startInput = document.querySelector('#loop-start-input');
            startInput.value = loopStart;
        }
    }
    else if (type === PointerType.END)
    {
        if (seconds > timeToSeconds(loopStart) && seconds <= videoDurationSeconds)
        {
            const rightMarginPercentageInt = parseFloat(100 - (seconds / videoDurationSeconds) * 100);
            loopSliderSelection.style.marginRight = `${rightMarginPercentageInt}%`;

            const endInput = document.querySelector('#loop-end-input');
            const endPointerTooltip = document.querySelector('.end-pointer-tooltip');
            endPointerTooltip.innerText = loopEnd = endInput.value;
        }
        else
        {
            const endInput = document.querySelector('#loop-end-input');
            endInput.value = loopEnd;
        }
    }

    loopSliderSelection.style.width = `${100 - parseFloat(loopSliderSelection.style.marginLeft) - parseFloat(loopSliderSelection.style.marginRight)}%`;
}

/**
 * Convert seconds to time
 * @param {number} totalSeconds - The total number of seconds
 * @returns {string} - The time in the format "M:SS", "MM:SS", "H:MM:SS" or "HH:MM:SS" 
 */
function secondsToTime(totalSeconds)
{
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    // Always pad seconds to 2 digits
    const paddedSeconds = seconds.toString().padStart(2, '0');

    if (hours > 0)
    {
        // If there are hours, format as "H:MM:SS" or "HH:MM:SS"
        const paddedMinutes = minutes.toString().padStart(2, '0');
        return `${hours}:${paddedMinutes}:${paddedSeconds}`;
    } else if (minutes > 0)
    {
        // If there are no hours, format as "MM:SS" or "M:SS"
        return `${minutes}:${paddedSeconds}`;
    } else
    {
        // If there are only seconds, format as "0:SS"
        return `0:${paddedSeconds}`;
    }
}

function getLoopSliderBackground()
{
    if (!loopSliderBackground)
    {
        loopSliderBackground = document.querySelector('.loop-slider-background');
    }

    return loopSliderBackground;
}

// This function is used when dragging a pointer to a new position
function moveSliderPointer(event, pointerType)
{
    let parent = document.querySelector('#loop-container');
    const loopSliderSelection = document.querySelector('.loop-slider-selection');

    // This will get the total offset of the description container from the left of the page
    // It does this by looping through each parent element and adding the offsetLeft of each element until it reaches the top of the DOM tree
    let leftOffset = 0;
    while (parent.offsetParent != null)
    {
        leftOffset += parent.offsetLeft;
        parent = parent.offsetParent;
    }

    // This refers to how far along the mouse is in the slider in percentages
    // For example, if the mouse is halfway through the slider, this will be 50
    const loopSliderBackground = getLoopSliderBackground();
    const pos = ((event.pageX - loopSliderBackground.offsetLeft - leftOffset) / loopSliderBackground.offsetWidth * 100).toFixed(4);

    let leftMarginPercentageInt = parseFloat(loopSliderSelection.style.marginLeft) || 0;
    let rightMarginPercentageInt = parseFloat(loopSliderSelection.style.marginRight) || 0;

    // Check if pointer is within bounds
    if (pointerType == PointerType.START && pos >= 0 && pos <= 100 - rightMarginPercentageInt)
    {
        leftMarginPercentageInt = pos;
        loopSliderSelection.style.width = `${100 - leftMarginPercentageInt - parseFloat(loopSliderSelection.style.marginRight)}%`;
        loopSliderSelection.style.marginLeft = `${leftMarginPercentageInt}%`;

        const start = videoDurationSeconds * (leftMarginPercentageInt / 100);
        const startInput = document.querySelector('#loop-start-input');
        const startPointerTooltip = document.querySelector('.start-pointer-tooltip');
        loopStart = startInput.value = startPointerTooltip.innerText = secondsToTime(start);
    }
    else if (pointerType == PointerType.END && ((100 - pos) >= 0 && (100 - pos) <= 100 - leftMarginPercentageInt))
    {
        rightMarginPercentageInt = 100 - pos;
        loopSliderSelection.style.width = `${100 - rightMarginPercentageInt - parseFloat(loopSliderSelection.style.marginLeft)}%`;
        loopSliderSelection.style.marginRight = `${rightMarginPercentageInt}%`;

        const end = videoDurationSeconds - videoDurationSeconds * (rightMarginPercentageInt / 100);
        const endInput = document.querySelector('#loop-end-input');
        const endPointerTooltip = document.querySelector('.end-pointer-tooltip');
        loopEnd = endInput.value = endPointerTooltip.innerText = secondsToTime(end);
    }
}

function addLoopSlider()
{
    const loopSliderContainer = document.querySelector('#loop-slider-container');

    if (loopSliderBackground)
    {
        loopSliderContainer.appendChild(loopSliderBackground);
        return;
    }

    loopSliderBackground = document.createElement('div');
    loopSliderBackground.className = 'loop-slider-background';

    const loopSliderSelection = document.createElement('div');
    loopSliderSelection.className = 'loop-slider-selection';

    const startPointer = document.createElement('div');
    startPointer.className = 'loop-slider-start-pointer';
    startPointer.addEventListener('mousedown', (event) =>
    {
        if (event.button === 0)
        {
            const moveHandler = (event) =>
            {
                moveSliderPointer(event, PointerType.START);
            }

            window.addEventListener('mousemove', moveHandler, false);
            window.addEventListener('mouseup', () =>
            {
                window.removeEventListener('mousemove', moveHandler, false);
            }, false);
        }
    });

    const startPointerTooltip = document.createElement('div');
    startPointerTooltip.className = 'start-pointer-tooltip';

    const startPointerTextNode = document.createTextNode(loopStart);

    const endPointer = document.createElement('div');
    endPointer.className = 'loop-slider-end-pointer';
    endPointer.addEventListener('mousedown', (event) =>
    {
        if (event.button === 0)
        {
            const moveHandler = (event) =>
            {
                moveSliderPointer(event, PointerType.END);
            }

            window.addEventListener('mousemove', moveHandler, false);
            window.addEventListener('mouseup', () =>
            {
                window.removeEventListener('mousemove', moveHandler, false);
            }, false);
        }
    });

    const endPointerTooltip = document.createElement('div');
    endPointerTooltip.className = 'end-pointer-tooltip';

    const endPointerTextNode = document.createTextNode(loopEnd)

    loopSliderContainer.appendChild(loopSliderBackground);
    loopSliderBackground.appendChild(loopSliderSelection);
    loopSliderSelection.appendChild(startPointer);
    loopSliderSelection.appendChild(startPointerTooltip);
    loopSliderSelection.appendChild(endPointer);
    loopSliderSelection.appendChild(endPointerTooltip);
    startPointerTooltip.appendChild(startPointerTextNode);
    endPointerTooltip.appendChild(endPointerTextNode);
}

function videoPlayEventListener()
{
    let currentVideoSeconds = getCurrentVideoSeconds();

    smallIntervalPlayEvent = setInterval(() =>
    {
        if (getCurrentVideoSeconds() !== currentVideoSeconds)
        {
            clearInterval(smallIntervalPlayEvent);

            bigIntervalPlayEvent = setInterval(() =>
            {
                currentVideoSeconds = getCurrentVideoSeconds();
                if (currentVideoSeconds < timeToSeconds(loopStart) || currentVideoSeconds >= timeToSeconds(loopEnd))
                {
                    videoPlayer.currentTime = timeToSeconds(loopStart);
                }
            }, 1000);
        }
    }, 100);
}

function videoPauseEventListener()
{
    clearInterval(smallIntervalPlayEvent);
    clearInterval(bigIntervalPlayEvent);
}

function addLoopContainer()
{
    const bottomRow = document.querySelector('#bottom-row');
    if (!bottomRow)
    {
        return;
    }

    let loopContainer = document.querySelector('#loop-container');
    if (loopContainer)
    {
        return;
    }

    const descriptionInner = document.querySelector('#description #description-inner');
    if (!descriptionInner)
    {
        return;
    }

    bottomRow.style.display = 'block';
    descriptionInner.style = 'padding-bottom: 12px; padding-top: 12px;';

    loopContainer = document.createElement('div');
    loopContainer.id = 'loop-container';
    loopContainer.className = 'loop-container';

    const sliderContainer = document.createElement('div');
    sliderContainer.id = 'loop-slider-container';
    sliderContainer.className = 'loop-slider-container';

    const inputsContainer = document.createElement('div');
    inputsContainer.id = 'loop-inputs-container';
    inputsContainer.className = 'loop-inputs-container';

    const startInput = document.createElement('input');
    startInput.id = 'loop-start-input';
    startInput.className = 'loop-input';
    startInput.value = loopStart;
    startInput.addEventListener('keydown', (event) =>
    {
        if (event.key === 'Enter' || event.key === 'Tab')
        {
            setSliderPointerPosition(PointerType.START, startInput.value);
        }
    });

    const endInput = document.createElement('input');
    endInput.id = 'loop-end-input';
    endInput.className = 'loop-input';
    endInput.value = loopEnd;
    endInput.addEventListener('keydown', (event) =>
    {
        if (event.key === 'Enter' || event.key === 'Tab')
        {
            setSliderPointerPosition(PointerType.END, endInput.value);
        }
    });

    const description = document.querySelector('#bottom-row #description');
    description.parentNode.insertBefore(loopContainer, description);
    loopContainer.appendChild(sliderContainer);
    loopContainer.appendChild(inputsContainer);
    inputsContainer.appendChild(startInput);
    inputsContainer.appendChild(endInput);

    addLoopSlider();

    videoPlayer.addEventListener('play', videoPlayEventListener);
    videoPlayer.addEventListener('pause', videoPauseEventListener);

    if (!videoPlayer.paused)
    {
        videoPlayEventListener();
    }

    setSliderPointerPosition(PointerType.START, startInput.value);
    setSliderPointerPosition(PointerType.END, endInput.value);
}

function addDynamicStyles()
{
    const style = document.createElement('style');
    style.textContent = `
        section.range-slider {
            position: relative;
            width: 200px;
            height: 35px;
            text-align: center;
        }

        section.range-slider input {
            pointer-events: none;
            position: absolute;
            overflow: hidden;
            left: 0;
            top: 15px;
            width: 200px;
            outline: none;
            height: 18px;
            margin: 0;
            padding: 0;
        }

        section.range-slider input::-webkit-slider-thumb {
            pointer-events: all;
            position: relative;
            z-index: 1;
            outline: 0;
        }

        section.range-slider input::-moz-range-thumb {
            pointer-events: all;
            position: relative;
            z-index: 10;
            -moz-appearance: none;
            width: 9px;
        }

        section.range-slider input::-moz-range-track {
            position: relative;
            z-index: -1;
            background-color: rgba(0, 0, 0, 1);
            border: 0;
        }

        section.range-slider input:last-of-type::-moz-range-track {
            -moz-appearance: none;
            background: none transparent;
            border: 0;
        }

        section.range-slider input[type=range]::-moz-focus-outer {
            border: 0;
        }
    `;
    document.head.appendChild(style);
}

function removeLoopListener()
{
    videoPauseEventListener();

    videoPlayer.removeEventListener('play', videoPlayEventListener);
    videoPlayer.removeEventListener('pause', videoPauseEventListener);
}

function addLoopButton()
{
    let loopButton = document.querySelector('#loop-button');
    if (!loopButton)
    {
        const topLevelButtons = document.querySelector('#top-level-buttons-computed');

        const ytButtonViewModel = document.createElement('yt-button-view-model')
        ytButtonViewModel.className = 'style-scope ytd-button-renderer';

        const buttonViewModel = document.createElement('button-view-model');
        buttonViewModel.className = 'yt-spec-button-view-model';

        loopButton = document.createElement('button');
        loopButton.id = 'loop-button';
        loopButton.className = 'loop-button yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m yt-spec-button-shape-next--icon-leading yt-spec-button-shape-next--enable-backdrop-filter-experiment';
        loopButton.addEventListener('click', function ()
        {
            loopButton.classList.toggle('pressed');

            if (!looping)
            {
                addLoopContainer();
                addDynamicStyles();
            }
            else
            {
                removeLoopListener();

                const loopContainer = document.querySelector('#loop-container');
                const description = document.querySelector('#bottom-row #description');
                description.parentNode.removeChild(loopContainer);
            }

            looping = !looping;
            loopIcon.src = looping ? chrome.runtime.getURL('images/loop-icon-24-pressed.png') : chrome.runtime.getURL('images/loop-icon-24.png');
        });

        const loopIcon = document.createElement('img');
        loopIcon.src = chrome.runtime.getURL('images/loop-icon-24.png');
        loopIcon.className = 'loop-icon';

        const loopTextNode = document.createTextNode('Loop');

        topLevelButtons.appendChild(ytButtonViewModel);
        ytButtonViewModel.appendChild(buttonViewModel);
        buttonViewModel.appendChild(loopButton);
        loopButton.appendChild(loopIcon);
        loopButton.appendChild(loopTextNode);
    }
}