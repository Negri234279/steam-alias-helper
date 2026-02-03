chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "LOG") {
        console.log(`[${msg.from}]`, msg.payload)
    }
})
