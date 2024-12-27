const vscode = require('vscode');
const Cerebras = require('@cerebras/cerebras_cloud_sdk');
const { marked } = require('marked');

let cerebrasInferenceWebview;
let selectedModel = 'llama-3.3-70b';

function extractCodeFromFence(text) {
    const htmlMatch = text.match(/```html\n([\s\S]*?)\n```/);
    const md = htmlMatch ? htmlMatch[1].trim() : text;
    const html = marked(md);
    return html;
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    const askCommandProvider = vscode.commands.registerCommand('cerebras-inference.ask', async function () {
        var apiKey = vscode.workspace.getConfiguration('cerebras-inference').get('apiKey');
        if (!apiKey) {
            apiKey = await setupApiKey();
            if (!apiKey) {
                return;
            }
        }

        const userInput = await vscode.window.showInputBox({ prompt: "Ask anything..." }) || "";

        await vscode.commands.executeCommand('workbench.view.extension.cerebrasInference');

        postQuestion(userInput);
    });
    context.subscriptions.push(askCommandProvider);

    const apiKeyCommandProvider = vscode.commands.registerCommand('cerebras-inference.setupApiKey', setupApiKey);
    context.subscriptions.push(apiKeyCommandProvider);

    const cerebrasInferenceViewProvider = {
        resolveWebviewView: function (webviewView) {
            cerebrasInferenceWebview = webviewView.webview;

            webviewView.webview.options = {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(context.extensionUri, 'media'),
                    vscode.Uri.joinPath(context.extensionUri, 'resources'),
                ]
            };
            webviewView.webview.html = getWebviewContent(context, webviewView.webview);

            webviewView.webview.onDidReceiveMessage(
                async message => {
                    switch (message.command) {
                        case 'cerebras-inference-ask':
                            postQuestion(message.text);
                            break;
                        case 'cerebras-inference-model-selection':
                            selectedModel = message.value;
                            break;
                    }
                },
                undefined,
                context.subscriptions
            );
        }
    };
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('cerebrasInferenceView', cerebrasInferenceViewProvider));
}

async function postQuestion(prompt) {
    if (!cerebrasInferenceWebview) {
        vscode.window.showErrorMessage('Could not find the Cerebras Inference webview.');
        return;
    }

    const apiKey = vscode.workspace.getConfiguration('cerebras-inference').get('apiKey');
    if (!apiKey) {
        vscode.window.showErrorMessage('API Key not set. Use the "Cerebras Inference: Setup API Key" command to set the API Key.');
        return;
    }

    cerebrasInferenceWebview.postMessage({ type: 'addQuestion', value: prompt });
    const client = new Cerebras({ apiKey: apiKey });
    const chatCompletion = await client.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: selectedModel,
    });
    const code = extractCodeFromFence(chatCompletion.choices[0].message.content);
    const time = chatCompletion.time_info?.completion_time || 0;
    const totalTokens = chatCompletion.usage?.completion_tokens || 1;
    const tokensPerSecond = time > 0 ? totalTokens / time : 0;
    cerebrasInferenceWebview.postMessage({ type: 'addResponse', value: code, tokensPerSecond: Math.floor(tokensPerSecond) });
}

async function setupApiKey() {
    const currentApiKey = vscode.workspace.getConfiguration('cerebras-inference').get('apiKey');
    const apiKey = await vscode.window.showInputBox({ value: currentApiKey, prompt: "Enter your API Key for Cerebras Inference" }) || "";
    if (apiKey) {
        await vscode.workspace.getConfiguration('cerebras-inference').update('apiKey', apiKey, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage('API Key has been set.');
        return apiKey;
    } else {
        await vscode.workspace.getConfiguration('cerebras-inference').update('apiKey', "", vscode.ConfigurationTarget.Global);
        vscode.window.showErrorMessage('API Key not set.');
        return null;
    }
}

function getWebviewContent(context, webview) {

    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'main.js'));
    const stylesMainUri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'main.css'));
    const prismJsUri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'prism.js'));
    const prismCssUri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'prism.css'));
    const tailwindUri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'tailwind.js'));
    const lCerebrasLogoUri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'resources', 'cb-main.png'));
    const sCerebrasLogoUri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'resources', 'cerebras-logo-black-cropped.svg'));

    const html = `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="${prismCssUri}" rel="stylesheet">
            <link href="${stylesMainUri}" rel="stylesheet">
            <script src="${tailwindUri}"></script>
        </head>
        <body class="overflow-hidden">
            <div class="mx-auto flex w-full items-center justify-between mb-6">
                <div class="flex items-center gap-x-2">
                    <div class="shrink-0" data-testid="header-logo-xs">
                        <img alt="Cerebras logo" fetchpriority="high" width="28" height="36" decoding="async" data-nimg="1" class="sm:hidden" src="${sCerebrasLogoUri}" style="color: transparent;">
                        <img alt="Cerebras logo" fetchpriority="high" width="154" height="36" decoding="async" data-nimg="1" class="max-sm:hidden" src="${lCerebrasLogoUri}" style="color: transparent;">
                    </div>
                </div>

                <div class="flex items-center gap-x-2">
                    <div class="hidden">
                        <button data-testid="dropdown-button" class="min-w-40 w-full px-3 bg-neutral border border-neutral-20 rounded-md shadow flex justify-between items-center text-md text-neutral-95 outline-none hover:bg-interactive-5 hover:border-neutral-15 focus:border-2 focus:border-interactive-50 h-9" type="button" id="radix-:r0:" aria-haspopup="menu" aria-expanded="false" data-state="closed"><div class="max-w-[80%] truncate">Llama3.1-8B</div><svg class="max-sm:w-3 max-sm:h-3 max-md:w-4 max-md:h-4 w-5 h-5 max-sm:stroke-[1.6667px] max-md:stroke-[1.5625px] stroke-1.5 shrink-0" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" role="img" aria-label="expand icon"><path d="M5 7.5L10 12.5L15 7.5" stroke-linecap="round" stroke-linejoin="round"></path></svg></button>
                    </div>
                    <button type="button" class="h-9 text-md-b px-3 py-0 rounded-md shadow outline-none focus:ring-0 relative flex justify-center items-center bg-neutral text-neutral-95 border border-neutral-15 hover:bg-interactive-10 focus:border-2 focus:border-interactive-50 active:border-neutral-50 active:shadow-none focus:active:bg-neutral focus:active:border-neutral-50 focus:px-[15px]" data-testid="clear-button" id="clear-button"><svg class="w-4 h-4 stroke-[1.5625px]" viewBox="0 0 20 20" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="clear icon"><path d="M5.83333 17.5L2.25 13.9166C1.41667 13.0833 1.41667 11.8333 2.25 11.0833L10.25 3.08331C11.0833 2.24998 12.3333 2.24998 13.0833 3.08331L17.75 7.74998C18.5833 8.58331 18.5833 9.83331 17.75 10.5833L10.8333 17.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M18.3333 17.5H5.83333" stroke-linecap="round" stroke-linejoin="round"></path><path d="M4.16667 9.16669L11.6667 16.6667" stroke-linecap="round" stroke-linejoin="round"></path></svg><span class="ml-1.5 max-sm:hidden">Clear</span></button>
                    <div class="bg-neutral-90 fixed inset-0 z-40 bg-opacity-80 transition-opacity hidden opacity-0"></div>
                    <div class="bg-neutral-90 fixed inset-0 z-40 bg-opacity-80 transition-opacity hidden opacity-0"></div>
                </div>
            </div>
            <div class="flex flex-col h-screen">
                <div class="flex-1 overflow-y-auto" id="message-list"></div>
                <div id="in-progress" class="p-4 flex items-center hidden">
                    <div style="text-align: center;">
                        <div>Brainstorming...</div>
                        <div class="loader"></div>
                    </div>
                </div>
                <div class="relative shrink-0 leading-none mb-20">
                    <textarea data-testid="chat-textarea" placeholder="Ask anything..." id="question-input" class="text-lg w-full inline-flex px-4 focus:px-[15px] bg-neutral border-neutral-15 focus:outline-none focus:ring-0 text-neutral-95 hover:bg-interactive-10 hover:border-neutral-15 active:border-interactive-50 active:rounded-lg focus:rounded-lg focus:border-interactive-50 placeholder:text-neutral-45 rounded-lg min-h-11 resize-none py-[11px] focus:py-[10px] border focus:border-2 active:border-2 shadow h-[84px] pr-9 focus:pr-9" style="height: 84px;"></textarea>
                    <div class="absolute right-[0px] bottom-[0px] items-center gap-2">
                        <select id="model-selection-dropdown" class="h-9 text-md-b px-3 py-2 rounded-md shadow outline-none focus:ring-0 bg-neutral text-neutral-95 border border-neutral-15 hover:bg-interactive-10 focus:border-2 focus:border-interactive-50 active:border-neutral-50 active:shadow-none focus:active:bg-neutral focus:active:border-neutral-50">
                            <option value="llama3.1-8b">Llama 3.1 8B</option>
                            <option value="llama-3.3-70b" selected>Llama 3.3 70B</option>
                        </select>
                        <button style="background: transparent; color: var(--vscode-editor-foreground);" id="ask-button" class="border-none shadow-none bg-transparent hover:bg-transparent focus:bg-transparent active:bg-transparent focus:active:bg-transparent hover:text-neutral-95 text-neutral-45 p-5 focus:px-5 active:px-5 focus:active:px-5"><span class=""><svg class="w-4 h-4 stroke-[1.5625px]" viewBox="0 0 20 20" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="send icon"><path d="M2.5 2.5L5 10L2.5 17.5L18.3333 10L2.5 2.5Z" stroke-linecap="round" stroke-linejoin="round"></path><path d="M5 10H18.3333" stroke-linecap="round" stroke-linejoin="round"></path></svg></span></button>
                    </div>
                </div>
            </div>
            <script src="${prismJsUri}"></script>
            <script src="${scriptUri}"></script>
        </body>
        </html>`;

    return html;
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
    activate,
    deactivate
}
