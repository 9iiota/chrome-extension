let video;
let observer;

chrome.runtime.onMessage.addListener((obj, sender, response) =>
{
    console.log("Received message from background script");
    console.log(obj);

    if (obj.action === "createDownloadButton")
    {
        createDownloadButton();
    }
    else if (obj.action === "downloadTiktok")
    {
        downloadTiktok();
    }
});

chrome.storage.sync.get(['playTiktoksInBackground'], function (storage)
{
    if (!storage.playTiktoksInBackground)
    {
        return;
    }

    playVideo();
});

chrome.storage.onChanged.addListener(function (changes, namespace)
{
    if (changes.playTiktoksInBackground)
    {
        const playTiktoksInBackground = changes.playTiktoksInBackground.newValue;
        if (!playTiktoksInBackground)
        {
            observer.disconnect(); // Disconnect the observer if unchecked
            document.removeEventListener('visibilitychange', onVisibilityChange);
        }
        else
        {
            playVideo();
        }
    }
});

function playVideo()
{
    // Select the node you want to observe (e.g., the body of the document)
    const targetNode = document.body;

    // Create a new MutationObserver instance
    observer = new MutationObserver(function (mutationsList, observer)
    {
        const _video = document.querySelector('video');
        if (_video && _video !== video)
        {
            video = _video;
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

function createDownloadSymbol()
{
    const symbol = document.createElementNS("http://www.w3.org/2000/svg", "symbol");
    symbol.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    symbol.setAttribute("viewBox", "0 0 48 48");
    symbol.setAttribute("id", "download_button_symbol");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M21.9 7.38v19.86l-6.73-6.73a.87.87 0 0 0-1.24 0l-1.73 1.73a.88.88 0 0 0 0 1.24l11.18 11.18c.34.35.9.35 1.24 0L35.8 23.48a.88.88 0 0 0 0-1.24l-1.73-1.73a.87.87 0 0 0-1.24 0l-6.73 6.73V7.38c0-.49-.4-.88-.87-.88h-2.45c-.49 0-.88.4-.88.88ZM10.88 37.13c-.49 0-.88.39-.88.87v2.63c0 .48.4.87.88.87h26.24c.49 0 .88-.4.88-.87V38c0-.48-.4-.87-.88-.87H10.89Z");

    symbol.appendChild(path);

    const container = document.getElementById("svg-sprite-container");
    container.appendChild(symbol);
}

function createActionBarDownloadButton()
{
    const button = document.createElement("button");
    button.className = "tiktok-rninf8-ButtonActionItem edu4zum0"; // TODO
    button.setAttribute("type", "button");
    button.setAttribute("style", "margin-top: 12px; margin-bottom:0;"); // TODO improve
    button.setAttribute("id", "download_button");
    button.addEventListener("click", downloadTiktok);

    const span = document.createElement("span");
    span.className = "tiktok-1eor4vt-SpanIconWrapper edu4zum1";
    span.setAttribute("style", "width:unset;height:unset");
    span.setAttribute("data-e2e", "download-icon");

    const div = document.createElement("div");
    div.className = "tiktok-vzi0wx-DivAnimationContainer er2ywmz8"; // TODO

    const div2 = document.createElement("div");
    div2.setAttribute("width", "40");
    div2.setAttribute("height", "40");
    div2.className = "tiktok-31r1ke-DivContainer e14gjqdw0"; // TODO

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("viewBox", "0 0 168 168")
    svg.setAttribute("width", "168");
    svg.setAttribute("height", "168");
    svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
    svg.setAttribute("style", "width: 100%; height: 100%; transform: translate3d(0px, 0px, 0px); content-visibility: visible;");
    svg.setAttribute("fill", "rgba(255, 255, 255, .9)");

    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#download_button_symbol");

    svg.appendChild(use);
    div2.appendChild(svg);
    div.appendChild(div2);
    span.appendChild(div);
    button.appendChild(span);

    let actionBar = document.querySelector(".css-1elr43g-DivActionBarWrapper.eqrezik8");
    const downloadButtonExists = setInterval(() => // TODO improve
    {
        const downloadButton = document.getElementById("download_button");
        if (!downloadButton)
        {
            actionBar.insertBefore(button, actionBar.lastChild);
        }
        else
        {
            clearInterval(downloadButtonExists);
        }
    }, 1000);

    // let videoSwitchWrapper = document.querySelector(".css-z6mz7r-DivVideoSwitchWrapper.e1djgv9u0");
    // videoSwitchWrapper.setAttribute("style", "left:unset;right:22px;z-index:1;top:196px;transform:unset;position:absolute;margin-top:-68px"); // TODO
}

function createNormalDownloadButton()
{
    const button = document.createElement("button");
    button.className = "css-rninf8-ButtonActionItem edu4zum0";
    button.setAttribute("type", "button");
    button.setAttribute("id", "download_button");
    button.addEventListener("click", downloadTiktok);

    const span = document.createElement("span");
    span.className = "tiktok-6jak4n-SpanIconWrapper e1hk3hf91";
    span.setAttribute("data-e2e", "download-icon");

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("width", "20");
    svg.setAttribute("height", "20");
    svg.setAttribute("fill", "rgba(255, 255, 255, .9)");

    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#download_button_symbol");

    svg.appendChild(use);
    span.appendChild(svg);
    button.appendChild(span);

    let actionItems = document.querySelector(".css-1d39a26-DivFlexCenterRow.ehlq8k31");
    actionItems.append(button);
}

function createDownloadButton()
{
    console.log("Creating download button");
    const downloadButton = document.getElementById("download_button");
    if (!downloadButton)
    {
        const downloadSymbol = document.getElementById("download_button_symbol");
        if (!downloadSymbol)
        {
            createDownloadSymbol();
        }

        const actionBar = document.querySelector(".css-1elr43g-DivActionBarWrapper.eqrezik8");
        if (actionBar)
        {
            console.log("Creating action bar download button");
            createActionBarDownloadButton();
        }
        else
        {
            createNormalDownloadButton();
        }
    }
}

function downloadTiktok()
{
    const link = document.querySelector('source[data-index="1"]').src;
    const options = { method: 'GET', headers: { 'Referer': 'https://www.tiktok.com/' }, credentials: 'include' };
    fetch(link, options)
        .then(response =>
        {
            if (!response.ok)
            {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            return response.blob();
        })
        .then(blob =>
        {
            const url = URL.createObjectURL(blob);
            const tiktokId = window.location.href.split("/").pop();
            const a = document.createElement('a');
            a.href = url;
            a.download = `${tiktokId}.mp4`;

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        })
        .catch(error => console.error('Fetch error:', error));
}