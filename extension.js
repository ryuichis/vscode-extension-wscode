// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

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

		// Display a message box to the user
		vscode.window.showInformationMessage(`Echo: ${userInput} and API Key: ${apiKey}`);
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
