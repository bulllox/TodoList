"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = __importStar(require("vscode"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
function activate(context) {
    const provider = new TodoListProvider(context.extensionUri, context.extensionPath);
    const webviewProvider = vscode.window.registerWebviewViewProvider(TodoListProvider.viewType, provider);
    context.subscriptions.push(webviewProvider);
    // Register the configuration setting
    vscode.workspace.onDidChangeConfiguration(() => {
        const config = vscode.workspace.getConfiguration('todolist');
        const webViewLocation = config.get('webViewLocation');
        // Handle the changed configuration here, e.g., move the WebView based on the setting
        // provider.moveWebView(webViewLocation);
    });
}
exports.activate = activate;
class TodoListProvider {
    _extensionUri;
    _extensionPath;
    static viewType = "vscode.todolist";
    _view;
    categories = [];
    entries = [];
    constructor(_extensionUri, _extensionPath) {
        this._extensionUri = _extensionUri;
        this._extensionPath = _extensionPath;
    }
    // Define default configuration values
    resolveWebviewView(webviewView, context, token) {
        this._view = webviewView;
        this._view.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        this._view.webview.html = this.GetHtml();
        this._view.webview.onDidReceiveMessage((message) => {
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
                        .showInformationMessage("Do you want to delete this Entry?", "Yes", "No")
                        .then(answer => {
                        if (answer === "Yes") {
                            this.deleteEntry(message.data);
                        }
                        else {
                            this._view?.webview.postMessage({ action: "rese1tSendValue" });
                        }
                    });
                    break;
                case "deleteCat":
                    vscode.window
                        .showInformationMessage("Do you realy want to delete the Category?", "Yes", "No")
                        .then(answer => {
                        if (answer === "Yes") {
                            this.deleteCat(message.data);
                        }
                        else {
                            this._view?.webview.postMessage({ action: "rese1tSendValue" });
                        }
                    });
                    break;
                case "clearAll":
                    vscode.window
                        .showInformationMessage("Are you sure to Clear the List?", "Yes", "No")
                        .then(answer => {
                        if (answer === "Yes") {
                            this.clearAll();
                        }
                        else {
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
                    console.log("clicked");
                    break;
            }
        });
        this.loadProgress();
        webviewView.onDidChangeVisibility((event) => {
            if (webviewView.visible) {
                // Webview is now visible, reload the content
                this.loadProgress();
            }
        });
    }
    ChangeState(data) {
        var entry = this.entries.filter(x => x.category === data.category && x.entry === data.item)[0];
        entry.checked = data.checked;
        this.updateWebview();
    }
    deleteCat(data) {
        // Filter entries to exclude entries from the specified category
        this.entries = this.entries.filter(entry => entry.category !== data.category);
        // Filter categories to exclude the specified category
        this.categories = this.categories.filter(category => category !== data.category);
        // Update the webview to reflect the changes
        this.updateWebview();
    }
    deleteEntry(data) {
        const index = this.entries.findIndex((e) => e.category === data.category && e.entry === data.entry);
        if (index !== -1) {
            this.entries.splice(index, 1);
            console.log('After deletion:', this.entries);
            this.updateWebview(); // Save changes
        }
    }
    clearAll() {
        this.categories = [];
        this.entries = [];
        this.updateWebview();
    }
    addEntry() {
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
    saveTree(categories, entries) {
        const vscodeFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (vscodeFolder) {
            const vscodeConfigFolder = path_1.default.join(vscodeFolder, '.vscode');
            if (!fs_1.default.existsSync(vscodeConfigFolder)) {
                fs_1.default.mkdirSync(vscodeConfigFolder);
            }
            const filePath = path_1.default.join(vscodeConfigFolder, 'todolist.json');
            fs_1.default.writeFileSync(filePath, JSON.stringify({ categories, entries }, null, 2));
            vscode.window.showInformationMessage('todolist saved successfully!');
        }
        else {
            vscode.window.showErrorMessage('Unable to save todolist. Please open a workspace first.');
        }
    }
    loadProgress() {
        const vscodeFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (vscodeFolder) {
            const vscodeConfigFolder = path_1.default.join(vscodeFolder, '.vscode');
            const filePath = path_1.default.join(vscodeConfigFolder, 'todoList.json');
            if (fs_1.default.existsSync(filePath)) {
                const fileContents = fs_1.default.readFileSync(filePath, 'utf-8');
                const data = JSON.parse(fileContents);
                this.categories = data.categories || [];
                this.entries = data.entries || [];
                this.updateWebview();
                vscode.window.showInformationMessage('TodoList loaded successfully!');
            }
            else {
            }
        }
        else {
            vscode.window.showErrorMessage('Unable to load TodoList. Please open a workspace first.');
        }
    }
    addCategory() {
        vscode.window.showInputBox({ prompt: "Enter a new category name" })
            .then((categoryName) => {
            if (categoryName) {
                this.categories.push(categoryName);
                this.updateWebview();
            }
        });
    }
    updateWebview() {
        const message = {
            action: "updateData",
            categories: this.categories,
            entries: this.entries
        };
        this.saveTree(this.categories, this.entries);
        this._view?.webview.postMessage(message);
    }
    GetHtml() {
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
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map