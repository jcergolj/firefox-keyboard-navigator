// ============================================
// background.js
// ============================================

browser.commands.onCommand.addListener((command) => {
    browser.tabs.query({ currentWindow: true }).then((tabs) => {
        browser.tabs.query({ active: true, currentWindow: true }).then((activeTabs) => {
            const currentTab = activeTabs[0];
            const currentIndex = tabs.findIndex((tab) => tab.id === currentTab.id);

            switch (command) {
                case "tab-left":
                    if (currentIndex > 0) {
                        browser.tabs.update(tabs[currentIndex - 1].id, { active: true });
                    }
                    break;

                case "tab-right":
                    if (currentIndex < tabs.length - 1) {
                        browser.tabs.update(tabs[currentIndex + 1].id, { active: true });
                    }
                    break;

                case "tab-first":
                    browser.tabs.update(tabs[0].id, { active: true });
                    break;

                case "tab-last":
                    browser.tabs.update(tabs[tabs.length - 1].id, { active: true });
                    break;
            }
        });
    });
});
