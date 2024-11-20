const urlPattern = /https:\/\/quran\.com\/\d+/;
const blurDelay = 50;
let hoverTimeout;
let lastHoveredLocation = '';

chrome.storage.sync.get(['blurQuranWords'], function (storage)
{
    if (!storage.blurQuranWords)
    {
        return;
    }

    if (!urlPattern.test(window.location.href))
    {
        return;
    }

    blurWords();
});

function blurWords()
{
    const targetNode = document.body;

    observer = new MutationObserver(function (mutationsList, observer)
    {
        let words = document.querySelectorAll('.QuranWord_container__lmBE_.QuranWord_wbwContainer__REUuI.QuranWord_additionalWordGap__wEsc5');
        for (const word of words)
        {
            if (!word.classList.contains('blurred-image') && !word.classList.contains('unblurred'))
            {
                word.classList.add('blurred-image');
                word.addEventListener('mouseenter', handleHover);
                word.addEventListener('mouseleave', handleUnhover);
            }
        }
    });

    const config = {
        childList: true,    // Detect addition or removal of child nodes
        attributes: true,   // Detect attribute changes
        subtree: true       // Observe all descendant nodes
    };

    observer.observe(targetNode, config);
}

function handleHover(event)
{
    const hoveredWord = event.target;
    const hoveredLocation = hoveredWord.getAttribute('data-word-location');
    if (!hoveredLocation)
    {
        return;
    }

    const [hoveredSurah, hoveredAyah, hoveredWordIndex] = hoveredLocation.split(':').map(Number);

    // If the new hovered word is smaller (e.g., 1:1:3 after 1:1:5), instantly blur larger words
    if (lastHoveredLocation)
    {
        const [lastSurah, lastAyah, lastWordIndex] = lastHoveredLocation.split(':').map(Number);
        if (
            lastSurah === hoveredSurah &&
            lastAyah === hoveredAyah &&
            lastWordIndex > hoveredWordIndex
        )
        {
            // Blur larger words
            let words = document.querySelectorAll('.unblurred');
            for (const word of words)
            {
                const wordLocation = word.getAttribute('data-word-location');
                if (!wordLocation)
                {
                    continue;
                }

                const [surah, ayah, wordIndex] = wordLocation.split(':').map(Number);
                if (
                    surah === hoveredSurah &&
                    ayah === hoveredAyah &&
                    wordIndex > hoveredWordIndex
                )
                {
                    word.classList.remove('unblurred');
                    word.classList.add('blurred-image');
                }
            }
        }
    }

    // Unblur words with a smaller `data-word-location`
    let words = document.querySelectorAll('.blurred-image');
    for (const word of words)
    {
        const wordLocation = word.getAttribute('data-word-location');
        if (!wordLocation)
        {
            continue;
        }

        const [surah, ayah, wordIndex] = wordLocation.split(':').map(Number);
        if (
            surah === hoveredSurah &&
            ayah === hoveredAyah &&
            wordIndex <= hoveredWordIndex
        )
        {
            word.classList.remove('blurred-image');
            word.classList.add('unblurred');
        }
    }

    lastHoveredLocation = hoveredLocation;
    clearTimeout(hoverTimeout);
}

function handleUnhover(event)
{
    clearTimeout(hoverTimeout);

    hoverTimeout = setTimeout(() =>
    {
        // Re-blur all words
        let words = document.querySelectorAll('.unblurred');
        for (const word of words)
        {
            word.classList.remove('unblurred');
            word.classList.add('blurred-image');
        }

        lastHoveredLocation = '';
    }, blurDelay);
}