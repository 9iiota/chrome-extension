let video;
let observer;

chrome.storage.sync.get(['continuePlaying'], function (data)
{
    if (!data.continuePlaying)
    {
        return;
    }

    test();
});

chrome.storage.onChanged.addListener(function (changes, namespace)
{
    if (changes.continuePlaying)
    {
        const continuePlaying = changes.continuePlaying.newValue;

        if (!continuePlaying)
        {
            observer.disconnect(); // Disconnect the observer if unchecked
            document.removeEventListener('visibilitychange', onVisibilityChange);
        }
        else
        {
            test();
        }
    }
});

function test()
{
    // Select the node you want to observe (e.g., the body of the document)
    const targetNode = document.body;

    // Create a new MutationObserver instance
    observer = new MutationObserver(function (mutationsList, observer)
    {
        const videoElement = document.querySelector('video');
        if (videoElement && videoElement !== video)
        {
            video = videoElement;
            if (video.paused)
            {
                video.play();
            }
        }
    });

    // Define what to observe: child nodes, attributes, etc.
    const config = {
        childList: true,        // Detect addition or removal of child nodes
        attributes: true,       // Detect attribute changes
        subtree: true           // Observe all descendant nodes
    };

    // Start observing the target node for configured changes
    observer.observe(targetNode, config);

    document.addEventListener('visibilitychange', onVisibilityChange);
}

function onVisibilityChange()
{
    if (document.visibilityState === 'hidden' && !video.paused)
    {
        setTimeout(() =>
        {
            video.play();
        }, 1);
    }
}