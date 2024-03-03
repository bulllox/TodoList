// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import fs from 'fs';
import path from 'path';
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	const provider = new TodoListProvider(context.extensionUri, context.extensionPath);
	const webviewProvider = vscode.window.registerWebviewViewProvider(TodoListProvider.viewType, provider);
	context.subscriptions.push(webviewProvider);
	// Register the configuration setting
	vscode.workspace.onDidChangeConfiguration(() => {
		const config = vscode.workspace.getConfiguration('todolist');
		const webViewLocation = config.get<string>('webViewLocation');
		// Handle the changed configuration here, e.g., move the WebView based on the setting
		// provider.moveWebView(webViewLocation);

	});
}

class TodoListProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = "vscode.todolist";
	private _view?: vscode.WebviewView;
	private categories: string[] = [];
	private entries: { category: string; entry: string; checked: boolean }[] = [];
	constructor(private readonly _extensionUri: vscode.Uri, private readonly _extensionPath: string) { }
	// Define default configuration values


	resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext<unknown>, token: vscode.CancellationToken): void | Thenable<void> {
		this._view = webviewView;
		this._view.webview.options = {
			enableScripts: true,
			localResourceRoots: [this._extensionUri]
		};


		this._view.webview.html = this.GetHtml();

		this._view.webview.onDidReceiveMessage(
			(message) => {
				switch (message.action) {
					case 'addCategory':
						this.addCategory();
						break;
					case "addEntry":
						this.addEntry();
						break;
					case "changeState":
						this.ChangeState(message.data);
						break;
					case 'deleteEntry':
						console.log(message.data);
						vscode.window
							.showInformationMessage("Den Eintrag wirklich löschen?", "Yes", "No")
							.then(answer => {
								if (answer === "Yes") {
									this.deleteEntry(message.data);
								} else {
									this._view?.webview.postMessage({ action: "rese1tSendValue" });
								}
							});

						break;
					case "deleteCat":

						vscode.window
							.showInformationMessage("Die Kategorie und dessen Einträge Wirklich löschen?", "Yes", "No")
							.then(answer => {
								if (answer === "Yes") {
									this.deleteCat(message.data);
								} else {
									this._view?.webview.postMessage({ action: "rese1tSendValue" });
								}
							});
						break;
					case "clearAll":
						vscode.window
							.showInformationMessage("Wirklich alles löschen?", "Yes", "No")
							.then(answer => {
								if (answer === "Yes") {
									this.clearAll();
								} else {
									this._view?.webview.postMessage({ action: "rese1tSendValue" });
								}
							});

						break;
					case "sortEntry":
						var sortedEntries = message.data;
						this.entries = [];
						this.entries = sortedEntries;
						this.saveTree(this.categories, this.entries);
						break;
					default:
						console.log("clicked")
						break;
				}

			},

		);
		this.loadProgress();
		webviewView.onDidChangeVisibility((event) => {
			if (webviewView.visible) {
				// Webview is now visible, reload the content
				this.loadProgress();
			}
		});

	}
	private ChangeState(data: { category: string, checked: boolean, item: string }) {
		var entry = this.entries.filter(x => x.category === data.category && x.entry === data.item)[0];
		entry.checked = data.checked;
		this.updateWebview();
	}
	private deleteCat(data: { category: string }) {

		// Filter entries to exclude entries from the specified category
		this.entries = this.entries.filter(entry => entry.category !== data.category);

		// Filter categories to exclude the specified category
		this.categories = this.categories.filter(category => category !== data.category);

		// Update the webview to reflect the changes
		this.updateWebview();
	}

	private deleteEntry(data: { category: string; entry: string }) {

		const index = this.entries.findIndex((e) => e.category === data.category && e.entry === data.entry);


		if (index !== -1) {
			this.entries.splice(index, 1);
			console.log('After deletion:', this.entries);
			this.updateWebview(); // Save changes
		}
	}

	private clearAll() {
		this.categories = [];
		this.entries = [];
		this.updateWebview();
	}
	private addEntry() {
		if (this.categories.length === 0) {
			vscode.window.showErrorMessage('Please add a category first.');
			return;
		}


		vscode.window.showQuickPick(this.categories, { placeHolder: 'Select a category for the entry' }).then((selectedCategory) => {
			if (selectedCategory) {
				vscode.window.showInputBox({ prompt: 'Enter a new entry name' }).then((entryName) => {
					if (entryName) {
						this.entries.push({ category: selectedCategory, entry: entryName, checked: false });

						this.updateWebview();
					}
				});
			}
		});

	}
	private saveTree(categories: string[], entries: { category: string; entry: string; checked: boolean }[]) {
		const vscodeFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

		if (vscodeFolder) {
			const vscodeConfigFolder = path.join(vscodeFolder, '.vscode');
			if (!fs.existsSync(vscodeConfigFolder)) {
				fs.mkdirSync(vscodeConfigFolder);
			}

			const filePath = path.join(vscodeConfigFolder, 'todolist.json');
			fs.writeFileSync(filePath, JSON.stringify({ categories, entries }, null, 2));

			vscode.window.showInformationMessage('todolist saved successfully!');
		} else {
			vscode.window.showErrorMessage('Unable to save todolist. Please open a workspace first.');
		}
	}

	public loadProgress() {
		const vscodeFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

		if (vscodeFolder) {
			const vscodeConfigFolder = path.join(vscodeFolder, '.vscode');
			const filePath = path.join(vscodeConfigFolder, 'todoList.json');

			if (fs.existsSync(filePath)) {
				const fileContents = fs.readFileSync(filePath, 'utf-8');
				const data = JSON.parse(fileContents);

				this.categories = data.categories || [];
				this.entries = data.entries || [];
				this.updateWebview();

				vscode.window.showInformationMessage('TodoList loaded successfully!');
			} else {

			}
		} else {
			vscode.window.showErrorMessage('Unable to load TodoList. Please open a workspace first.');
		}
	}

	private addCategory() {
		vscode.window.showInputBox({ prompt: "Enter a new category name" })
			.then((categoryName) => {
				if (categoryName) {
					this.categories.push(categoryName);
					this.updateWebview();
				}
			});
	}
	private updateWebview() {
		const message = {
			action: "updateData",
			categories: this.categories,
			entries: this.entries
		};
		this.saveTree(this.categories, this.entries);
		this._view?.webview.postMessage(message);
	}


	private GetHtml() {
		var cssFile = this._view?.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "style.css"));
		var jsFile = this._view?.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "allg.js"));
		return `<!DOCTYPE html>
<html lang="de">

<head>
    <meta charset="UTF-8">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
        integrity="sha512-Avb2QiuDEEvB4bZJYdft2mNjVShBftLdPG8FJ0V7irTLQ8Uo0qcPxh4Plq7G5tGm0rU+1SPhVotteLpBERwTkw=="
        crossorigin="anonymous" referrerpolicy="no-referrer" />
    <link rel="stylesheet" href="${cssFile}" />
	   <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous">
		<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.13.2/themes/base/jquery-ui.min.css" integrity="sha512-ELV+xyi8IhEApPS/pSj66+Jiw+sOT1Mqkzlh8ExXihe4zfqbWkxPRi8wptXIO9g73FSlhmquFlUOuMSoXz5IRw==" crossorigin="anonymous" referrerpolicy="no-referrer" />
	   </head>

<body class="bg-transparent">
    <div class="buttons mb-3">
        <button id="addEntry"><i class="fa-solid fa-folder-plus" style="color: #ffffff;" title="Eintrag Erstellen"></i></button>
        <button id="addCat"><i class="fa-solid fa-layer-group" style="color: #ffffff;"
                title="Kategorie erstellen"></i></button>
        <button id="clearAll"><i class="fas fa-trash" style="color: #ffffff;"
                title="Alles löschen"></i></button>
    </div>
       <div id="progress-tracker">
        <ul id="categoryList"></ul>
    </div>
    <script>
    
    </script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/js/all.min.js"
        integrity="sha512-xgIrH5DRuEOcZK5cPtVXx/WSp5DTir2JNcKE5ahV2u51NCTD9UDxbQgZHYHVBlPc4H8tug6BZTYIl2RdA/X0Vg=="
        crossorigin="anonymous" referrerpolicy="no-referrer"></script>
	<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.12.9/umd/popper.min.js" integrity="sha384-ApNbgh9B+Y1QKtv3Rn7W3mgPxhU9K/ScQsAP7hUibX39j7fakFPskvXusvfa0b4Q" crossorigin="anonymous"></script>
    <script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/js/bootstrap.min.js" integrity="sha384-JZR6Spejh4U02d8jOt6vLEHfe/JQGiRRSQQxSfFWpi1MquVdAyjUar5+76PVCmYl" crossorigin="anonymous"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.13.2/jquery-ui.min.js" integrity="sha512-57oZ/vW8ANMjR/KQ6Be9v/+/h6bq9/l3f0Oc7vn6qMqyhvPd1cvKBRWWpzu0QoneImqr2SkmO4MSqU+RpHom3Q==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
	<script src="${jsFile}"></script>
</body>

</html>`;
	}
}

// This method is called when your extension is deactivated
export function deactivate() { }
