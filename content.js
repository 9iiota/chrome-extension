let loopContainer = null;
let loopSliderContainer = null;

let loopStartInput = null;
let loopEndInput = null;

let loopSliderSelected = null;
let loopSliderUnselected = null;

const videoDuration = document.querySelector('.ytp-time-duration').innerText;
const videoDurationSeconds = timeToSeconds(videoDuration);

let widthPercentageInt = 100;
let leftMarginPercentageInt = 0;
let rightMarginPercentageInt = 0;

let startPointerText = null;
let endPointerText = null;

const videoPlayer = document.querySelector('.video-stream');

let looping = false;

let a, b = null;
let playEventListener;
let pauseEventListener;

let startInput = '0:00';
let endInput = videoDuration;

waitForElement('#top-level-buttons-computed', addLoopButton);
// document.addEventListener('DOMContentLoaded', function ()
// {
// });

function removeLoopListener()
{
    videoPlayer.removeEventListener('play', playEventListener);
    videoPlayer.removeEventListener('pause', pauseEventListener);

    // Clear intervals to prevent memory leaks
    clearInterval(a);
    clearInterval(b);

    looping = false;
}

function checkCurrentVideoTimeSeconds()
{
    return videoPlayer.currentTime.toFixed(0);
}

function waitForElement(selector, callback)
{
    console.log('Waiting for element...');
    const observer = new MutationObserver((mutations, observer) =>
    {
        if (document.querySelector(selector))
        {
            callback(document.querySelector(selector));
            observer.disconnect();
        }
    });

    observer.observe(document.body,
        {
            childList: true,
            subtree: true
        });
}

function adjustStartPointer(value)
{
    const loopStartInputValue = timeToSeconds(value);
    if (loopStartInputValue !== false && loopStartInputValue >= 0 && loopStartInputValue <= videoDurationSeconds)
    {
        leftMarginPercentageInt = (loopStartInputValue / videoDurationSeconds) * 100;
        widthPercentageInt = 100 - leftMarginPercentageInt - rightMarginPercentageInt;

        loopSliderUnselected.style.width = `${widthPercentageInt}%`;
        loopSliderUnselected.style.marginLeft = `${leftMarginPercentageInt}%`;

        startInput = loopStartInput.value;
        startPointerText.innerText = loopStartInput.value;
    }
}

function adjustEndPointer(value)
{
    const loopEndInputValue = timeToSeconds(value);
    if (loopEndInputValue !== false && loopEndInputValue >= 0 && loopEndInputValue <= videoDurationSeconds)
    {
        rightMarginPercentageInt = 100 - (loopEndInputValue / videoDurationSeconds) * 100;
        widthPercentageInt = 100 - leftMarginPercentageInt - rightMarginPercentageInt;

        loopSliderUnselected.style.width = `${widthPercentageInt}%`;
        loopSliderUnselected.style.marginRight = `${rightMarginPercentageInt}%`;

        endInput = loopEndInput.value;
        endPointerText.innerText = loopEndInput.value;
    }
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
            if (!looping)
            {
                addLoopContainer();
                addDynamicStyles();
            }
            else
            {
                const description = document.querySelector('#bottom-row #description');
                description.parentNode.removeChild(loopContainer);
                removeLoopListener();
            }
        });

        const loopIcon = document.createElement('img');
        loopIcon.src = chrome.runtime.getURL('images/loop-icon-24.png');
        loopIcon.style.verticalAlign = 'middle';
        loopIcon.style.width = '24px';
        loopIcon.style.height = '24px';
        loopIcon.style.marginRight = '6px';

        const loopTextNode = document.createTextNode('Loop');

        topLevelButtons.appendChild(ytButtonViewModel);

        ytButtonViewModel.appendChild(buttonViewModel);

        buttonViewModel.appendChild(loopButton);

        loopButton.appendChild(loopIcon);
        loopButton.appendChild(loopTextNode);
    }
    else
    {
        setTimeout(addLoopButton, 1000);
    }
}

function addLoopContainer()
{
    const bottomRow = document.querySelector('#bottom-row');
    if (bottomRow)
    {
        loopContainer = document.querySelector('#loop-container');
        if (!loopContainer)
        {
            bottomRow.style.display = 'block';

            const descriptionInner = document.querySelector('#description #description-inner');
            if (descriptionInner)
            {
                descriptionInner.style = 'padding-bottom: 12px; padding-top: 12px;';

                loopContainer = document.createElement('div');
                loopContainer.id = 'loop-container';
                loopContainer.className = 'loop-container';

                loopSliderContainer = document.createElement('div');
                loopSliderContainer.id = 'loop-slider-container';
                loopSliderContainer.className = 'loop-slider-container';

                loopInputsContainer = document.createElement('div');
                loopInputsContainer.id = 'loop-inputs-container';

                loopStartInput = document.createElement('input');
                loopStartInput.className = 'loop-input';
                loopStartInput.value = startInput;
                loopStartInput.addEventListener('keydown', (event) =>
                {
                    if (event.key === 'Enter')
                    {
                        adjustStartPointer(loopStartInput.value);
                    }
                });

                loopEndInput = document.createElement('input');
                loopEndInput.className = 'loop-input';
                loopEndInput.value = endInput;
                loopEndInput.addEventListener('keydown', (event) =>
                {
                    if (event.key === 'Enter')
                    {
                        adjustEndPointer(loopEndInput.value);
                    }
                });

                loopInputsContainer.appendChild(loopStartInput);
                loopInputsContainer.appendChild(loopEndInput);

                loopContainer.appendChild(loopSliderContainer);
                loopContainer.appendChild(loopInputsContainer);

                const description = document.querySelector('#bottom-row #description');
                description.parentNode.insertBefore(loopContainer, description);

                createLoopSlider(loopSliderContainer);

                playEventListener = () =>
                {
                    let currentVideoTimeSeconds = checkCurrentVideoTimeSeconds();

                    a = setInterval(() =>
                    {
                        if (checkCurrentVideoTimeSeconds() !== currentVideoTimeSeconds)
                        {
                            currentVideoTimeSeconds = checkCurrentVideoTimeSeconds();
                            clearInterval(a);

                            b = setInterval(() =>
                            {
                                currentVideoTimeSeconds = checkCurrentVideoTimeSeconds();
                                if (currentVideoTimeSeconds < timeToSeconds(startInput) || currentVideoTimeSeconds >= timeToSeconds(endInput))
                                {
                                    videoPlayer.currentTime = timeToSeconds(startInput);
                                }
                            }, 1000);
                        }
                    }, 100);
                };
                videoPlayer.addEventListener('play', playEventListener);

                pauseEventListener = () =>
                {
                    clearInterval(a);
                    clearInterval(b);
                };
                videoPlayer.addEventListener('pause', pauseEventListener);

                looping = true;

                adjustStartPointer(loopStartInput.value);
                adjustEndPointer(loopEndInput.value);
            }
        }
    }
}

function timeToSeconds(time)
{
    try
    {
        // This regex will match the following:
        // 0:00 - 9: 59 | 10:00 - 59: 59 | 1:00:00 - 9: 59: 59 | 10:00:00 - 99: 59: 59 | 100:00:00 - 999: 59: 59
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
    catch (error)
    {
        return false;
    }
}

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

function createLoopSlider()
{
    loopSliderSelected = document.createElement('div');
    loopSliderSelected.className = 'loop-slider-unselected';

    loopSliderUnselected = document.createElement('div');
    loopSliderUnselected.className = 'loop-slider-selected';

    const startPointer = document.createElement('div');
    startPointer.className = 'loop-slider-start-pointer';
    startPointer.addEventListener('mousedown', (event) =>
    {
        if (event.button === 0)
        {
            const moveHandler = (event) =>
            {
                movePointer(event, 'start');
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

    startPointerText = document.createElement('span');
    startPointerText.innerText = startInput;

    const endPointer = document.createElement('div');
    endPointer.className = 'loop-slider-end-pointer';
    endPointer.addEventListener('mousedown', (event) =>
    {
        if (event.button === 0)
        {
            const moveHandler = (event) =>
            {
                movePointer(event, 'end');
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

    endPointerText = document.createElement('span');
    endPointerText.innerText = endInput;

    startPointerTooltip.appendChild(startPointerText);
    endPointerTooltip.appendChild(endPointerText);

    loopSliderUnselected.appendChild(startPointer);
    loopSliderUnselected.appendChild(startPointerTooltip);
    loopSliderUnselected.appendChild(endPointer);
    loopSliderUnselected.appendChild(endPointerTooltip);

    loopSliderSelected.appendChild(loopSliderUnselected);

    loopSliderContainer.appendChild(loopSliderSelected);
}

function movePointer(event, pointer)
{
    let _container = loopContainer;
    let _containerOffsetLeft = 0;

    // This will get the total offset of the description container from the left of the page
    // It does this by looping through each parent element and adding the offsetLeft of each element until it reaches the top of the DOM tree
    while (_container.offsetParent != null)
    {
        _containerOffsetLeft += _container.offsetLeft;
        _container = _container.offsetParent;
    }

    // This refers to how far along the mouse is in the slider in percentages
    // For example, if the mouse is halfway through the slider, this will be 50
    const pos = ((event.pageX - loopSliderSelected.offsetLeft - _containerOffsetLeft) / loopSliderSelected.offsetWidth * 100).toFixed(4);
    const posInt = parseInt(pos);

    switch (pointer)
    {
        case 'start':
            if (posInt >= 0 && posInt <= 100 - rightMarginPercentageInt - 1)
            {
                leftMarginPercentageInt = posInt;
                widthPercentageInt = 100 - leftMarginPercentageInt - rightMarginPercentageInt;

                loopSliderUnselected.style.width = `${widthPercentageInt}%`;
                loopSliderUnselected.style.marginLeft = `${leftMarginPercentageInt}%`;

                const loopStartInputValue = videoDurationSeconds * (leftMarginPercentageInt / 100);
                startInput = secondsToTime(loopStartInputValue);
                loopStartInput.value = startInput;
                startPointerText.innerText = startInput;
            }
            break;
        case 'end':
            if ((100 - posInt) >= 0 && (100 - posInt) <= 100 - leftMarginPercentageInt - 1)
            {
                rightMarginPercentageInt = 100 - posInt;
                widthPercentageInt = 100 - leftMarginPercentageInt - rightMarginPercentageInt;

                loopSliderUnselected.style.width = `${widthPercentageInt}%`;
                loopSliderUnselected.style.marginRight = `${rightMarginPercentageInt}%`;

                const loopEndInputValue = videoDurationSeconds - videoDurationSeconds * (rightMarginPercentageInt / 100);
                endInput = secondsToTime(loopEndInputValue);
                loopEndInput.value = endInput;
                endPointerText.innerText = endInput;
            }
            break;
    }
}

// Function to add dynamic styles
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