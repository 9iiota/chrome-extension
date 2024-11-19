chrome.storage.sync.get(['blurQuranWords'], function (storage)
{
    if (!storage.blurQuranWords)
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
                word.addEventListener('mouseenter', handleHover); // Add hover listener
                word.addEventListener('mouseleave', handleUnhover); // Add unhover listener
            }
        }
    });

    const config = {
        childList: true, // Detect addition or removal of child nodes
        attributes: true, // Detect attribute changes
        subtree: true // Observe all descendant nodes
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
    console.log(`Hovered: ${hoveredSurah}:${hoveredAyah}:${hoveredWordIndex}`);

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

        // Compare locations and unblur if smaller
        if (surah === hoveredSurah && ayah === hoveredAyah && wordIndex <= hoveredWordIndex)
        {
            console.log(`Unblurring: ${surah}:${ayah}:${wordIndex}`);
            word.classList.remove('blurred-image');
            word.classList.add('unblurred'); // Mark as unblurred
        }
    }
}

function handleUnhover(event)
{
    const unhoveredWord = event.target;

    // Re-blur all words by adding the 'blurred-image' class and removing the 'unblurred' class
    let words = document.querySelectorAll('.unblurred');
    for (const word of words)
    {
        word.classList.remove('unblurred'); // Remove the unblurred class
        word.classList.add('blurred-image'); // Add the blurred-image class back
    }

    console.log("All words are re-blurred.");
}
