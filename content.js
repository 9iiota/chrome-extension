// Wait for the YouTube page to dynamically load content
function waitForElement(selector, callback)
{
    const observer = new MutationObserver((mutations, observer) =>
    {
        if (document.querySelector(selector))
        {
            callback(document.querySelector(selector));
            observer.disconnect(); // Stop observing once the element is found
        }
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

function addLoopButton()
{
    const topLevelButtons = document.querySelector('#top-level-buttons-computed');

    if (topLevelButtons)
    {
        const loopButton = document.createElement('button');
        loopButton.innerText = 'Loop';
        loopButton.className = 'loop-button yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m';

        loopButton.addEventListener('click', function ()
        {
            createLoopContainer();
            addDynamicStyles();
        });

        topLevelButtons.appendChild(loopButton);
    } else
    {
        setTimeout(addLoopButton, 1000);
    }
}

let loopContainer = null;

function createLoopContainer()
{
    const bottomRow = document.querySelector('#bottom-row');

    if (bottomRow)
    {
        loopContainer = document.querySelector('#loop-container');
        if (!loopContainer)
        {
            bottomRow.style.display = 'block';

            const descriptionElements = document.querySelectorAll('#description');
            const originalDescription = descriptionElements[1];

            if (originalDescription)
            {
                loopContainer = document.createElement('div');
                loopContainer.id = 'loop-container';
                loopContainer.className = 'loop-container style-scope ytd-watch-metadata';

                const loopSliderContainer = document.createElement('div');
                loopSliderContainer.id = 'loop-slider-container';
                loopSliderContainer.className = 'loop-slider-container style-scope ytd-watch-metadata';

                loopContainer.appendChild(loopSliderContainer);
                originalDescription.parentNode.insertBefore(loopContainer, originalDescription);

                createLoopSlider(loopSliderContainer); // Create the slider in the cloned description
            }
        }
    }
}

function timeToSeconds(time)
{
    const parts = time.toString().split(':');
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

function secondsToTime(totalSeconds)
{
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

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

let loopSliderForeground = null;
let loopSliderBackground = null;

function createLoopSlider(clonedDescriptionInner)
{
    loopSliderForeground = document.createElement('div');
    loopSliderForeground.className = 'loop-slider-foreground';

    loopSliderBackground = document.createElement('div');
    loopSliderBackground.className = 'loop-slider-background';

    const startPointer = document.createElement('div');
    startPointer.className = 'loop-slider-start-pointer';

    startPointer.addEventListener('mousedown', (event) =>
    {
        if (event.button === 0)
        {
            window.addEventListener('mousemove', movePointer(event, 'start'), false);
            window.addEventListener('mouseup', () =>
            {
                window.removeEventListener('mousemove', movePointer(event, 'start'), false);
            }, false);
        }
    });

    const endPointer = document.createElement('div');
    endPointer.className = 'loop-slider-end-pointer';

    endPointer.addEventListener('mousedown', (event) =>
    {
        if (event.button === 0)
        {
            window.addEventListener('mousemove', movePointer(event, 'end'), false);
            window.addEventListener('mouseup', () =>
            {
                window.removeEventListener('mousemove', movePointer(event, 'end'), false);
            }, false);
        }
    });

    loopSliderForeground.appendChild(loopSliderBackground);

    loopSliderBackground.appendChild(startPointer);
    loopSliderBackground.appendChild(endPointer);

    clonedDescriptionInner.appendChild(loopSliderForeground);
}

const videoDurationSeconds = timeToSeconds(document.querySelector('.ytp-time-duration'));

let widthPercentageInt = 100;
let leftMarginPercentageInt = 0;
let rightMarginPercentageInt = 0;

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
    const pos = ((event.pageX - loopSliderForeground.offsetLeft - _containerOffsetLeft) / loopSliderForeground.offsetWidth * 100).toFixed(4);
    const posInt = parseInt(pos);

    switch (pointer)
    {
        case 'start':
            if (posInt >= 0 && posInt <= 100 - rightMarginPercentageInt - 1)
            {
                leftMarginPercentageInt = posInt;
                widthPercentageInt = 100 - leftMarginPercentageInt - rightMarginPercentageInt;
                loopSliderBackground.style.width = `${widthPercentageInt}%`;
                loopSliderBackground.style.marginLeft = `${leftMarginPercentageInt}%`;

                // t = (parseInt(pos) / 100 * duration).toFixed(0);
                // if (t >= duration || t < 0)
                // {
                //     t = 0;
                // }
            }
            break;
        case 'end':
            if ((100 - posInt) >= 0 && (100 - posInt) <= 100 - leftMarginPercentageInt - 1)
            {
                rightMarginPercentageInt = 100 - posInt;
                widthPercentageInt = 100 - leftMarginPercentageInt - rightMarginPercentageInt;
                loopSliderBackground.style.width = `${widthPercentageInt}%`;
                loopSliderBackground.style.marginRight = `${rightMarginPercentageInt}%`;
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


// Wait for the YouTube button container to appear, then add the custom button
waitForElement('#top-level-buttons-computed', addLoopButton);