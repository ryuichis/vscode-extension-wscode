// Derived from https://github.com/barnesoir/chatgpt-vscode-plugin/blob/main/media/main.js

(function () {
    const vscode = acquireVsCodeApi();
    const list = document.getElementById("message-list");

    window.addEventListener("message", (event) => {
        const message = event.data;

        switch (message.type) {
            case "addQuestion":
                const html = message.code != null
                    ? marked.parseInline(message.value + "<br /> <br /><pre class='overflow-auto'><code>```" + message.code + "```</code></pre>")
                    : message.value;

                list.innerHTML +=
                    `<div class="p-4 self-end mb-4">
                        <p class="font-bold mb-5 flex">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2"><path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            You
                        </p>
                        <div>${html}</div>
                    </div>`;

                document.getElementById("in-progress")?.classList?.remove("hidden");
                list.scrollTo(0, list.scrollHeight);
                break;
            case "addResponse":
                document.getElementById("in-progress")?.classList?.add("hidden");

                list.innerHTML +=
                    `<div class="p-4 self-end mb-4 pb-8">
                        <div class="flex justify-middle">
                            <div class="flex-1 text-left">
                                <p class="font-bold mb-5 flex">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" /></svg>
                                    Cerebras Inference
                                </p>
                            </div>
                            <div class="flex text-right items-center gap-1 mb-5">
                                <svg data-testid="bolt-icon" class="w-5 h-5 stroke-1.5 rounded-full" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="bolt icon"><rect width="20" height="20" rx="10" fill="#F1592A"></rect><path d="M13.8725 9.2496C13.858 9.3689 13.8133 9.48245 13.7426 9.5796L9.77258 14.9446C9.70723 15.0319 9.61353 15.0937 9.50758 15.1196C9.47108 15.1245 9.43408 15.1245 9.39758 15.1196C9.32898 15.1188 9.26113 15.1053 9.19758 15.0796C9.10618 15.0342 9.03088 14.962 8.98175 14.8727C8.93259 14.7833 8.91194 14.681 8.92257 14.5796L9.32258 11.4746H6.75756C6.63324 11.4694 6.51247 11.4315 6.40756 11.3646C6.30645 11.2943 6.22685 11.1974 6.17758 11.0846C6.1331 10.9754 6.11592 10.8569 6.12756 10.7396C6.14224 10.6219 6.18702 10.5099 6.25756 10.4146L10.2276 5.05959C10.2909 4.97574 10.3808 4.91582 10.4826 4.8896C10.588 4.86523 10.6986 4.87576 10.7976 4.91959C10.8921 4.96328 10.9695 5.03715 11.0176 5.12959C11.0618 5.21414 11.0808 5.30956 11.0726 5.4046L10.6726 8.50959H13.2426C13.3681 8.50742 13.4909 8.54602 13.5925 8.61959C13.6896 8.69071 13.7671 8.78534 13.8176 8.89459C13.8654 9.00645 13.8843 9.12855 13.8725 9.2496Z" fill="white"></path></svg>
                                <p class="text-xl">
                                    ${message.tokensPerSecond} T/s
                                </p>
                            </div>
                        </div>
                        <div class="response-message">${message.value}</div>
                    </div>`;

                list.scrollTo(0, list.scrollHeight);
                break;
            default:
                break;
        }
    });

    let submitHandler = function (e) {
        e.preventDefault();
        e.stopPropagation();
        const input = document.getElementById("question-input");

        if (input.value?.length > 0) {
            vscode.postMessage({
                command: 'cerebras-inference-ask',
                text: input.value,
            });

            input.value = "";
        }
    };

    document.getElementById("clear-button")?.addEventListener("click", () => {
        list.innerHTML = "";
        vscode.postMessage({ type: "clearChat", });
    });
    document.getElementById("ask-button")?.addEventListener("click", submitHandler);
    document.getElementById("question-input")?.addEventListener("keydown", function (e) {
        console.log(e.key);
        if (e.key === "Enter" && !e.shiftKey) {
            submitHandler(e);
        }
    });


    // Function to highlight all code blocks under a specific element
    function highlightCodeBlocks(element) {
        Prism.highlightAllUnder(element);
    }

    // Observe changes in the DOM to detect new <pre><code> elements
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    if (node.matches('pre code')) {
                        Prism.highlightElement(node);
                    } else if (node.querySelectorAll) {
                        node.querySelectorAll('pre code').forEach((codeBlock) => {
                            Prism.highlightElement(codeBlock);
                        });
                    }
                }
            });
        });
    });

    // Start observing the document body for changes
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Initial highlighting of existing code blocks
    highlightCodeBlocks(document.body);
})();
