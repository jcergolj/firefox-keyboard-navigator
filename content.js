// ============================================
// content.js
// ============================================

(function () {
    let hintsVisible = false;
    let formHintsVisible = false;
    let linkMap = new Map();
    let formMap = new Map();
    let currentInput = "";
    let linkStats = {};
    let currentFormIndex = 0;
    let followLinkTimeout = null;
    let keySequence = "";
    let keySequenceTimeout = null;

    const CHARS = "abcdefghijklmnopqrstuvwxyz";
    const PRIORITY_SELECTORS = ["nav a", "header a", '[role="navigation"] a', ".menu a", ".nav a"];

    // Load link statistics from storage
    function loadStats() {
        browser.storage.local.get(["linkStats"]).then((result) => {
            linkStats = result.linkStats || {};
        });
    }

    // Save link click
    function saveClick(url) {
        const hostname = window.location.hostname;
        if (!linkStats[hostname]) {
            linkStats[hostname] = {};
        }
        linkStats[hostname][url] = (linkStats[hostname][url] || 0) + 1;
        browser.storage.local.set({ linkStats: linkStats });
    }

    // Get click count for a link
    function getClickCount(url) {
        const hostname = window.location.hostname;
        return (linkStats[hostname] && linkStats[hostname][url]) || 0;
    }

    function generateHintCode(index, isPriority = false) {
        // Priority links get single letters
        if (isPriority && index < 26) {
            return CHARS[index];
        }

        if (index < 26) {
            return CHARS[index];
        }
        const first = Math.floor(index / 26);
        const second = index % 26;
        return CHARS[first] + CHARS[second];
    }

    function isInViewport(rect) {
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    function isVisible(element) {
        const style = window.getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
    }

    // Get a unique identifier for any clickable element (for buttons without href)
    function getElementIdentifier(element) {
        const text = element.textContent?.trim() || '';
        const id = element.id || '';
        const className = element.className || '';
        const tagName = element.tagName.toLowerCase();
        return `${tagName}:${id}:${className}:${text}`.substring(0, 200);
    }

    function showHints() {
        if (hintsVisible) return;

        removeHints();
        hintsVisible = true;
        linkMap.clear();
        formMap.clear();
        currentInput = "";

        // Get all links and buttons and categorize them
        const allLinks = Array.from(document.querySelectorAll('a[href], button, input[type="button"], input[type="submit"], [role="button"]'));
        const priorityLinks = [];
        const viewportLinks = [];
        const otherLinks = [];

        allLinks.forEach((link) => {
            const rect = link.getBoundingClientRect();

            if (rect.width === 0 || rect.height === 0) return;
            if (!isVisible(link)) return;

            const isPriority = PRIORITY_SELECTORS.some((selector) => link.matches(selector));

            const inViewport = isInViewport(rect);
            const elementId = link.href || getElementIdentifier(link);
            const clickCount = getClickCount(elementId);

            link._navData = {
                rect,
                isPriority,
                inViewport,
                clickCount,
            };

            if (isPriority || clickCount > 2) {
                priorityLinks.push(link);
            } else if (inViewport) {
                viewportLinks.push(link);
            } else {
                otherLinks.push(link);
            }
        });

        // Sort by click count
        priorityLinks.sort((a, b) => b._navData.clickCount - a._navData.clickCount);
        viewportLinks.sort((a, b) => b._navData.clickCount - a._navData.clickCount);

        // Get all form elements (excluding buttons since they're now in link hints)
        const formElements = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select'));
        const visibleFormElements = formElements.filter((element) => {
            if (!isVisible(element)) return false;
            const rect = element.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
        });

        // Assign hint codes - links first, then form elements
        let codeIndex = 0;
        const orderedLinks = [...priorityLinks, ...viewportLinks, ...otherLinks];

        orderedLinks.forEach((link, index) => {
            const isPriority = index < priorityLinks.length;
            const hintCode = generateHintCode(codeIndex++, isPriority);
            linkMap.set(hintCode, link);

            const hint = document.createElement("div");
            hint.className = "jc-nav-hint";
            if (isPriority) hint.classList.add("jc-nav-hint-priority");
            hint.textContent = hintCode.toUpperCase();
            hint.style.left = link._navData.rect.left + window.scrollX + "px";
            hint.style.top = link._navData.rect.top + window.scrollY + "px";
            hint.dataset.code = hintCode;

            document.body.appendChild(hint);
        });

        // Add form elements
        visibleFormElements.forEach((element) => {
            const rect = element.getBoundingClientRect();
            const hintCode = generateHintCode(codeIndex++);
            formMap.set(hintCode, element);

            const hint = document.createElement("div");
            hint.className = "jc-nav-hint jc-nav-hint-form";
            hint.textContent = hintCode.toUpperCase();
            hint.style.left = rect.left + window.scrollX + "px";
            hint.style.top = rect.top + window.scrollY + "px";
            hint.dataset.code = hintCode;

            document.body.appendChild(hint);
        });
    }

    function removeHints() {
        document.querySelectorAll(".jc-nav-hint").forEach((el) => el.remove());
        document.querySelectorAll(".jc-nav-hint-form").forEach((el) => el.remove());
        hintsVisible = false;
        linkMap.clear();
        formMap.clear();
        currentInput = "";
        keySequence = "";
        if (followLinkTimeout) {
            clearTimeout(followLinkTimeout);
            followLinkTimeout = null;
        }
        if (keySequenceTimeout) {
            clearTimeout(keySequenceTimeout);
            keySequenceTimeout = null;
        }
    }

    function showFormHints() {
        if (formHintsVisible) return;

        removeFormHints();
        formHintsVisible = true;
        formMap.clear();
        currentInput = "";
        currentFormIndex = 0;

        const formElements = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), ' + 'textarea, select, button[type="submit"]');

        formElements.forEach((element, index) => {
            if (!isVisible(element)) return;

            const rect = element.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;

            const hintCode = generateHintCode(index);
            formMap.set(hintCode, element);

            const hint = document.createElement("div");
            hint.className = "jc-nav-hint jc-nav-hint-form";
            hint.textContent = hintCode.toUpperCase();
            hint.style.left = rect.left + window.scrollX + "px";
            hint.style.top = rect.top + window.scrollY + "px";
            hint.dataset.code = hintCode;

            document.body.appendChild(hint);
        });

        // Auto-focus first element
        if (formElements.length > 0 && isVisible(formElements[0])) {
            formElements[0].focus();
            formElements[0].scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }

    function removeFormHints() {
        document.querySelectorAll(".jc-nav-hint-form").forEach((el) => el.remove());
        formHintsVisible = false;
        formMap.clear();
        currentInput = "";
        keySequence = "";
        if (followLinkTimeout) {
            clearTimeout(followLinkTimeout);
            followLinkTimeout = null;
        }
        if (keySequenceTimeout) {
            clearTimeout(keySequenceTimeout);
            keySequenceTimeout = null;
        }
    }

    function focusFormElement(code) {
        const element = formMap.get(code.toLowerCase());
        if (element) {
            element.focus();
            element.scrollIntoView({ behavior: "smooth", block: "center" });

            // Select text in input fields
            if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
                element.select();
            }
        }
    }

    function focusNextFormElement() {
        const elements = Array.from(formMap.values());
        if (elements.length === 0) return;

        currentFormIndex = (currentFormIndex + 1) % elements.length;
        const element = elements[currentFormIndex];
        element.focus();
        element.scrollIntoView({ behavior: "smooth", block: "center" });

        if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
            element.select();
        }
    }

    function filterHints(input, isForm = false) {
        // When hintsVisible is true, filter both link and form hints
        const selectors = isForm ? [".jc-nav-hint-form"] : [".jc-nav-hint", ".jc-nav-hint-form"];

        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach((hint) => {
                const code = hint.dataset.code;
                if (code.startsWith(input.toLowerCase())) {
                    hint.style.display = "flex";
                    const matchLen = input.length;

                    // Clear existing content
                    hint.textContent = '';

                    // Create matched portion (underlined)
                    const matchedSpan = document.createElement('span');
                    matchedSpan.style.color = '#000';
                    matchedSpan.style.fontWeight = 'bold';
                    matchedSpan.style.textDecoration = 'underline';
                    matchedSpan.textContent = code.substring(0, matchLen).toUpperCase();

                    // Create remaining portion
                    const remainingSpan = document.createElement('span');
                    remainingSpan.style.color = '#000';
                    remainingSpan.style.fontWeight = 'bold';
                    remainingSpan.textContent = code.substring(matchLen).toUpperCase();

                    // Append both spans
                    hint.appendChild(matchedSpan);
                    hint.appendChild(remainingSpan);
                } else {
                    hint.style.display = "none";
                }
            });
        });
    }

    function followLink(code) {
        const link = linkMap.get(code.toLowerCase());
        if (link) {
            const elementId = link.href || getElementIdentifier(link);
            saveClick(elementId);
            link.click();
            removeHints();
        }
    }

    function submitForm() {
        const form = document.activeElement?.closest("form");
        if (form) {
            form.submit();
        } else {
            // Try to find and click submit button
            const submitBtn = document.querySelector('button[type="submit"], input[type="submit"]');
            if (submitBtn) {
                submitBtn.click();
            }
        }
    }

    document.addEventListener("keydown", (e) => {
        // Ignore if typing in input fields (except for Ctrl+Enter)
        const inInputField = e.target.matches('input, textarea, select, [contenteditable="true"]');

        // Ctrl+Enter to submit form
        if (e.ctrlKey && e.key === "Enter" && inInputField) {
            e.preventDefault();
            submitForm();
            return;
        }

        // Tab to cycle through form elements when form hints visible
        if (formHintsVisible && e.key === "Tab" && !e.shiftKey) {
            e.preventDefault();
            focusNextFormElement();
            return;
        }

        if (inInputField && !formHintsVisible) {
            return;
        }

        // Press ; to show link hints
        if (e.key === ";" && !hintsVisible && !formHintsVisible) {
            e.preventDefault();
            showHints();
            return;
        }

        // Press , to show form hints
        if (e.key === "," && !hintsVisible && !formHintsVisible) {
            e.preventDefault();
            showFormHints();
            return;
        }

        // Press Escape to hide hints
        if (e.key === "Escape") {
            e.preventDefault();
            if (hintsVisible) removeHints();
            if (formHintsVisible) removeFormHints();
            return;
        }

        // Key sequence detection for multi-key shortcuts (e.g., b -> bm)
        // This runs when hints are visible and allows 300ms to complete a sequence
        if ((hintsVisible || formHintsVisible) && /^[a-z]$/i.test(e.key)) {
            e.preventDefault();

            // Clear the follow link timeout
            if (followLinkTimeout) {
                clearTimeout(followLinkTimeout);
                followLinkTimeout = null;
            }

            // Clear the key sequence timeout
            if (keySequenceTimeout) {
                clearTimeout(keySequenceTimeout);
                keySequenceTimeout = null;
            }

            // Add the pressed key to both sequences
            currentInput += e.key.toLowerCase();
            keySequence += e.key.toLowerCase();

            // Filter hints based on current input
            filterHints(currentInput, formHintsVisible);

            // Check if current sequence matches any hint codes
            const hasLinkMatch = linkMap.has(keySequence);
            const hasFormMatch = formMap.has(keySequence);
            const hasExactMatch = hasLinkMatch || hasFormMatch;

            // Check if other hints start with this sequence
            const allKeys = [...linkMap.keys(), ...formMap.keys()];
            const hasOtherMatches = allKeys.some(
                code => code.startsWith(keySequence) && code !== keySequence
            );

            // If exact match exists
            if (hasExactMatch) {
                if (hasOtherMatches) {
                    // Wait 500ms to see if user continues the sequence
                    const sequenceToFollow = keySequence;
                    keySequenceTimeout = setTimeout(() => {
                        if (linkMap.has(sequenceToFollow)) {
                            followLink(sequenceToFollow);
                        } else if (formMap.has(sequenceToFollow)) {
                            focusFormElement(sequenceToFollow);
                            if (hintsVisible) removeHints();
                        }
                        keySequence = "";
                        keySequenceTimeout = null;
                    }, 500);
                } else {
                    // No other matches, follow immediately (with small delay for UX)
                    const sequenceToFollow = keySequence;
                    followLinkTimeout = setTimeout(() => {
                        if (linkMap.has(sequenceToFollow)) {
                            followLink(sequenceToFollow);
                        } else if (formMap.has(sequenceToFollow)) {
                            focusFormElement(sequenceToFollow);
                            if (hintsVisible) removeHints();
                        }
                        keySequence = "";
                        followLinkTimeout = null;
                    }, 500);
                }
            } else if (!hasOtherMatches) {
                // No matches at all, reset
                keySequence = "";
                currentInput = "";
                filterHints(currentInput, formHintsVisible);
            }
            return;
        }


        // Backspace to remove last character
        if ((hintsVisible || formHintsVisible) && e.key === "Backspace") {
            e.preventDefault();

            // Clear any existing timeouts
            if (followLinkTimeout) {
                clearTimeout(followLinkTimeout);
                followLinkTimeout = null;
            }
            if (keySequenceTimeout) {
                clearTimeout(keySequenceTimeout);
                keySequenceTimeout = null;
            }

            currentInput = currentInput.slice(0, -1);
            keySequence = keySequence.slice(0, -1);

            if (currentInput.length === 0) {
                if (hintsVisible) removeHints();
                if (formHintsVisible) removeFormHints();
            } else {
                filterHints(currentInput, formHintsVisible);
            }
            return;
        }
    });

    // Load stats on page load
    loadStats();

    // Clean up on page unload
    window.addEventListener("beforeunload", () => {
        removeHints();
        removeFormHints();
    });
})();
