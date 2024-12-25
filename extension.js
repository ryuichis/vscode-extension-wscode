// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const Cerebras = require('@cerebras/cerebras_cloud_sdk');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

function extractCodeFromFence(text) {
    const htmlMatch = text.match(/```html\n([\s\S]*?)\n```/);
    return htmlMatch ? htmlMatch[1].trim() : text;
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "cerebras-inference" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    const disposable = vscode.commands.registerCommand('cerebras-inference.ask', async function () {
        var apiKey = vscode.workspace.getConfiguration('cerebras-inference').get('apiKey');
        if (!apiKey) {
            apiKey = await vscode.window.showInputBox({ prompt: "Enter your API Key for Cerebras Inference" }) || "";
            if (apiKey) {
                await vscode.workspace.getConfiguration('cerebras-inference').update('apiKey', apiKey, vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage('API Key has been set.');
            } else {
                vscode.window.showErrorMessage('API Key not set.');
                return;
            }
        }

        const userInput = await vscode.window.showInputBox({ prompt: "Ask anything..." }) || "";

        const client = new Cerebras({ apiKey: apiKey });
        const chatCompletion = await client.chat.completions.create({
            messages: [{ role: 'user', content: userInput }],
            // model: 'llama3.1-8b',
            model: 'llama-3.3-70b',
        });
        const code = extractCodeFromFence(chatCompletion.choices[0].message.content);
        const time = chatCompletion.time_info?.completion_time || 0;
        const totalTokens = chatCompletion.usage?.completion_tokens || 1;
        const tokensPerSecond = time > 0 ? totalTokens / time : 0;

        // Display a message box to the user
        vscode.window.showInformationMessage(`Input: ${userInput}\nResponse: ${code}\nTokens per second: ${tokensPerSecond}`);
    });
    context.subscriptions.push(disposable);

    const openChatPanelCommand = vscode.commands.registerCommand('cerebras-inference.openChatPanel', function () {
        const panel = vscode.window.createWebviewPanel(
            'askCerebrasInference', // Identifies the type of the webview. Used internally
            'Cerebras Inference', // Title of the panel displayed to the user
            vscode.ViewColumn.Beside, // Editor column to show the new webview panel in
            { enableScripts: true } // Webview options. More on these later.
        );

        // And set its HTML content
        panel.webview.html = getWebviewContent();

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'ask':
                        const apiKey = vscode.workspace.getConfiguration('cerebras-inference').get('apiKey');
                        const client = new Cerebras({ apiKey: apiKey });
                        const chatCompletion = await client.chat.completions.create({
                            messages: [{ role: 'user', content: message.text }],
                            model: 'llama-3.3-70b',
                        });
                        const code = extractCodeFromFence(chatCompletion.choices[0].message.content);
                        const time = chatCompletion.time_info?.completion_time || 0;
                        const totalTokens = chatCompletion.usage?.completion_tokens || 1;
                        const tokensPerSecond = time > 0 ? totalTokens / time : 0;
                        panel.webview.postMessage({ text: code, tokensPerSecond:  Math.floor(tokensPerSecond) });
                        return;
                }
            },
            undefined,
            context.subscriptions
        );
    });
    context.subscriptions.push(openChatPanelCommand);
}

function getWebviewContent() {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ask Cerebras Inference</title>
    </head>
    <body>
        <h1>Ask Cerebras Inference</h1>
        <input type="text" id="userInput" placeholder="Ask anything..." />
        <button onclick="sendMessage()">Send</button>
        <div id="response"></div>
        <div id="responseTPS"></div>
        <script>
            const vscode = acquireVsCodeApi();
            function sendMessage() {
                const userInput = document.getElementById('userInput').value;
                vscode.postMessage({ command: 'ask', text: userInput });
            }
            window.addEventListener('message', event => {
                const message = event.data;
                document.getElementById('response').innerText = message.text;
                document.getElementById('responseTPS').innerText = message.tokensPerSecond + ' T/s';
            });
        </script>
    </body>
    </html>`;
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
    activate,
    deactivate
}
