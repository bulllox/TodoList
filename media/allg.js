const vscode = acquireVsCodeApi();

var sended = 0;

function updateTree(categories, entries) {
    sended = 0;
    const categoryList = document.getElementById('categoryList');
    categoryList.innerHTML = '';
    // Create an object to store entries for each category
    const categorizedEntries = {};
    categories.forEach(category => {
        categorizedEntries[category] = [];
    });

    // Categorize entries
    entries.forEach(entry => {
        categorizedEntries[entry.category].push(entry);
    });


    categories.forEach((category, index) => {

        var progressItem = document.createElement("div");
        progressItem.style.marginBottom = "5px";


        var catItem = document.createElement("div");
        catItem.id = "catItem";
        catItem.classList.add("active");

        catItem.addEventListener("click", (e) => {
            var itemboxID = `itembox-${e.currentTarget.dataset.itembox}`;
            if ($(`#${itemboxID}`).css("display") == "block") {
                $(`#${itemboxID}`).hide();

                window.localStorage.setItem(itemboxID, "hidden");
                catItem.classList.remove("active");
            } else {
                $(`#${itemboxID}`).show();
                window.localStorage.removeItem(itemboxID);
                e.currentTarget.classList.add("active");
            }
        })
        catItem.setAttribute("data-itembox", index);

        var itemBox = document.createElement("div");
        itemBox.id = `itembox-${index}`;
        itemBox.setAttribute("data-category", category);

        const deleteButton1 = document.createElement('button');
        deleteButton1.id = "deleteCat";
        deleteButton1.setAttribute("data-category", category);
        deleteButton1.innerHTML = "<i role='button' class='fas fa-trash' style='color: #ffffff;'></i>";
        catItem.innerHTML = "<div style='display: flex; justify-content: space-between; font-size: 17px; margin-bottom: 4px;' id='title'>" + category + "<div>" + deleteButton1.outerHTML + "</div></div>";
        var classNames = "nrm";

        entries.forEach(entry => {
            if (entry.category == category) {
                const item = document.createElement("li");
                item.id = "dragItem";
                item.style.display = "flex";
                item.className = classNames;
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.setAttribute("data-category", entry.category);
                checkbox.setAttribute("data-item", entry.entry);
                checkbox.setAttribute("data-checkedState", entry.checked);
                checkbox.checked = entry.checked; // Set the checked state
                checkbox.style.margin = "4px";
                const deleteButton = document.createElement("button");
                deleteButton.innerHTML = "<i role='button' class='fas fa-trash' style='color: #ffffff;'></i>";
                deleteButton.id = "delete";
                deleteButton.style.margin = "4px";
                deleteButton.setAttribute("data-category", entry.category);
                deleteButton.setAttribute("data-entry", entry.entry);
                deleteButton.addEventListener("click", () => { console.log("debug 1"); vscode.postMessage({ action: "deleteEntry", data: entry }); });

                item.appendChild(checkbox);
                item.appendChild(deleteButton);
                item.innerHTML += "<div stlye='font-size: 12px !important; width: 400px;'>" + entry.entry + "</div>";

                itemBox.appendChild(item);

                classNames = (classNames === "nrm") ? "mid" : "nrm";
            }
        });


        progressItem.appendChild(catItem);
        progressItem.appendChild(itemBox);

        categoryList.appendChild(progressItem);
        $('input[type="checkbox"]').each((index, box) => {
            const checkbox = box; // Cast to HTMLInputElement
            const checkedState = checkbox.dataset.checkedstate; // Retrieve the checked state from the dataset
            checkbox.checked = checkedState === "true";

        });
        $('div[id^="itembox-"]').each((index, box) => {
            var state = window.localStorage.getItem(`itembox-${index}`);
            if (state === "hidden") {
                $(`#itembox-${index}`).hide();
            }
        });
        $('div[id^="itembox-"]').sortable({
            update: function (event, ui) {
                var category = event.target.dataset.category;
                var sortedEntries = [];

                // Retrieve sorted entries from the DOM and categorize them
                $(this).children().each(function () {
                    var entry = $(this).text().trim(); // Trim whitespace
                    if (entry !== "") {
                        sortedEntries.push(entry);
                    }
                });

                // Rearrange entries in the array based on the sorted order
                categorizedEntries[category] = categorizedEntries[category].sort((a, b) => {
                    return sortedEntries.indexOf(a.entry) - sortedEntries.indexOf(b.entry);
                });

                // Flatten the categorized entries back into the entries array
                const flattenedEntries = categories.flatMap(category => categorizedEntries[category]);

                vscode.postMessage({ action: "sortEntry", data: flattenedEntries })
            }
        });


        $('button[id="delete"]').on("click", (e) => {
            if (sended === 0) {
                vscode.postMessage({
                    action: "deleteEntry",
                    data: {
                        category: e.currentTarget.dataset.category,
                        entry: e.currentTarget.dataset.entry
                    }
                });
                sended = 1;
            }
        });
        $('button[id="deleteCat"]').on('click', (e) => {
            if (sended === 0) {
                vscode.postMessage({
                    action: "deleteCat",
                    data: {
                        category: e.currentTarget.dataset.category
                    }
                });
                sended = 1;
            }
        });
        $('#clearAll').on("click", () => {
            if (sended === 0) {
                vscode.postMessage({
                    action: "clearAll"
                });
                sended = 1;
            }
        });
        $('input[type="checkbox"]').on("change", (e) => {
            if (sended === 0) {
                vscode.postMessage({
                    action: "changeState",
                    data: {
                        category: e.target.getAttribute("data-category"),
                        item: e.target.getAttribute("data-item"),
                        checked: e.target.checked,
                    }
                });
                sended = 1;
            }
        });
    });
}


try {
    document.addEventListener("DOMContentLoaded", function () {
        var cat = document.getElementById("addCat");
        cat.addEventListener("click", () => {
            vscode.postMessage({ action: "addCategory" });
        });
        var entryButton = document.getElementById("addEntry");
        entryButton.addEventListener("click", () => {
            vscode.postMessage({ action: "addEntry" });
        });
        window.addEventListener("message", (message) => {
            const data = message.data;
            switch (data.action) {
                case "updateData":
                    updateTree(data.categories, data.entries);

                    break;
                case "rese1tSendValue":
                    sended = 0;
                    break;
                default:
                    return;
            }
        });
    });
} catch (error) {
    console.log(error);
}