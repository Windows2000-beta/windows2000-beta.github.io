let request;
let db;
let codeToSave = '';
let categoryName = '';

const tierSystem = {
    scrollable: true,
    listener: function listener(element) {
        if (this.scrollable === false) {
            element.preventDefault();
        }
    },
    renderCategoryImages: async function(c, variation) {
        const currentTemplatePics = await getTemplateImages(c, variation);
        return currentTemplatePics;
    },
    generateListFromCode: async function(code, isCreatePage, category, variation) {
        clearOutTable();
        const currentTemplatePics = await this.renderCategoryImages(category, variation);
        if (isCreatePage) {
            document.getElementById('create-image-carousel').innerHTML = '';
        }
        for (let i = 1; i < (currentTemplatePics.length); i++) {
            addImageToCarousel(category, currentTemplatePics[i], i, variation);
        }
        generateRowFromCode(code, currentTemplatePics, category, isCreatePage, variation)
        if (!isCreatePage) {
            hideSettingsColumn();
        }
    },
    fillCarousel: async function(category, variation = '') {
        const currentTemplatePics = await this.renderCategoryImages(category, variation);
        const carousel = document.getElementById('create-image-carousel');
        for (let i = 1; i < (currentTemplatePics.length); i++) {
            addImageToCarousel(category, currentTemplatePics[i], i);
        }
    },
    generateCodeFromList: function() {
        const { labels, codeColors, templatePics } = processRows();
        return this.stringifyCode(labels, codeColors, templatePics);
    },
    stringifyCode: function(labels, codeColors, templatePics) {
        let shareCode = categoryName + "==";
        return buildShareCode(shareCode, labels, templatePics, codeColors);
    },
    initList: function(initCode, category, variation = '') {
        categoryName = category;
        request = indexedDB.open("tiermakerDB", 1);
        if (initCode) {
            request.onupgradeneeded = function(event) {
                db = event.target.result;
                if (!db.objectStoreNames.contains('tierlists')) {
                    let objectStore = db.createObjectStore("tierlists", {keyPath: "urlKey", autoIncrement: false});
                    objectStore.createIndex("urlIndex", "urlKey", {unique: true});
                }
            };
            this.generateListFromCode(initCode, false, category, variation);
        } else {
            this.setupDragging(category);
            this.setupClickEvents(category);
            let currentStorageCode = getCookie(category) || localStorage.getItem(`${category}TierListMakerCode`);

            if (getCookie(category)) {
                document.cookie = `${category}=; domain=.tiermaker.com; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
            }

            const t = this;

            request.onerror = function(event) {
                console.error("Database error: " + event.target.errorCode);
            };

            request.onupgradeneeded = function(event) {
                db = event.target.result;
                if (!db.objectStoreNames.contains('tierlists')) {
                    let objectStore = db.createObjectStore("tierlists", {keyPath: "urlKey", autoIncrement: false});
                    objectStore.createIndex("urlIndex", "urlKey", {unique: true});
                }
            };

            request.onsuccess = function(event) {
                db = event.target.result;
                let transaction = db.transaction(["tierlists"], "readonly");
                let objectStore = transaction.objectStore("tierlists");

                let getRequest = objectStore.get(category);

                getRequest.onsuccess = function () {
                    const result = getRequest.result;
                    console.log("Retrieved data:", getRequest.result);
                    if (result && result.code) {
                        currentStorageCode = result.code;
                        // need to trigger after loading
                        if (!currentStorageCode || currentStorageCode ===  null) {
                            setDefaults();
                            t.fillCarousel(category, variation);
                        } else {
                            $("#exportcode").val(currentStorageCode);
                            t.generateListFromCode(currentStorageCode, true, category, variation);
                        }

                    } else {
                        if (currentStorageCode) {
                            $("#exportcode").val(currentStorageCode);
                            t.generateListFromCode(currentStorageCode, true, category, variation);
                        } else {
                            setDefaults();
                            t.fillCarousel(category, variation);
                        }
                    }
                    setupObserver(category);
                };

                getRequest.onerror = function() {
                    setDefaults();
                    this.fillCarousel(category, variation);
                };
            };
        }
    },
    setupDragging: function(category) {
        dragula({
            isContainer: function(element) {
                return element.classList.contains('sort');
            }
        }).on("drag", function() {
            this.scrollable = false;
        }.bind(this)).on("drop", function(element, target, source, sibling) {
            this.scrollable = true;
        }.bind(this)).on("cancel", function(element, target, source, sibling) {
            this.scrollable = true;
        }.bind(this));
    },
    setupClickEvents: function(category) {
        document.addEventListener('touchmove', this.listener.bind(this), {
            passive: false
        });

        $(document).on('click', function({target}) {
            if (target.id == "modal-wrapper" || target.id == "close") {
                hideModalDOM();
            }
        }.bind(this));

        $(document).on('click', ".settings", function({target}) {
            const currentTierRow = getTargetParent(target);
            setupModalContext(currentTierRow);
        }.bind(this));

        $(document).on('click', "#color-select span", function({target}) {
            resetColorSpan("#color-select span", target);
            const bg = $(target).css("background-color");
            const index = getModalId();
            $('.tier-row').eq(index).find(".label-holder").css("background-color", bg);
            // localStorage.setItem(`${category}TierListMakerCode`, this.generateCodeFromList());
            updateDBWithChanges(category);
        }.bind(this));

        $(document).on('click', "#backgroundcolorselect span", function({target}) {
            resetColorSpan("#backgroundcolorselect span", target);
            const bg = $(target).css("background-color");
            $(target.parentElement.parentElement.parentElement).find('#tier-container .tier-row').css("background-color", bg);
            localStorage.setItem(`${category}TierListMakerCodeBackground`, $(target).css("background-color"));
        }.bind(this));

        $("#labelName").on("change", function() {
            const index = getModalId();
            let labelText = $("#labelName").val().replace(/\n/g, "<br>");
            if (document.getElementById('labelName').value.includes('<script>')) {
                labelText = "";
            }
            $('.tier-row').eq(index).find(".label").html(labelText);
        }.bind(this));

        // $(document).on('DOMSubtreeModified', ".create .tier-row", function(element) {
        //     localStorage.setItem(`${category}TierListMakerCode`, this.generateCodeFromList());
        // }.bind(this));

        $(document).on('ready', function() {
            // const targetNode = document.getElementById('tier-container');
            // var config = { attributes: true, childList: true };
            // var callback = function(mutationsList) {
            //     for(var mutation of mutationsList) {
            //         localStorage.setItem(`${category}TierListMakerCode`, this.generateCodeFromList());
            //     }
            // };
            // var observer = new MutationObserver(callback);
            // observer.observe(targetNode, config);
            // // Later, you can stop observing
            // // observer.disconnect();
        }.bind(this));

        $(document).on('click', '#add-row-up', function() {
            const index = getModalId()
            addRow(index, SINGLE_ROW_DOM, 'before');
        }.bind(this));

        $(document).on('click', '#add-row-below', function() {
            const index = getModalId();
            addRow(index, SINGLE_ROW_DOM, 'after');
        }.bind(this));

        $(document).on('click', '.move-up', function({target}) {
            const currentTierRow = $(target).closest('#tier-container .tier-row');
            const hasPreviousRow = currentTierRow.prev('#tier-container .tier-row').length != 0;
            if (hasPreviousRow) {
                currentTierRow.insertBefore(currentTierRow.prev('#tier-container .tier-row'));
                // localStorage.setItem(`${category}TierListMakerCode`, this.generateCodeFromList());
                updateDBWithChanges(category);
            }
        }.bind(this));

        $(document).on('click', '.move-down', function({target}) {
            const currentTierRow = $(target).closest('#tier-container .tier-row');
            const hasNextRow = currentTierRow.next('#tier-container .tier-row').length != 0;
            if (hasNextRow) {
                currentTierRow.insertAfter(currentTierRow.next('#tier-container .tier-row'));
                // localStorage.setItem(`${category}TierListMakerCode`, this.generateCodeFromList());
                updateDBWithChanges(category);
            }
        }.bind(this));

        $(document).on('click', '#clear-row', function() {
            cleanupImages(false);
            // localStorage.setItem(`${category}TierListMakerCode`, this.generateCodeFromList());
            updateDBWithChanges(category);
        }.bind(this));

        $(document).on('click', '#delete-row', function() {
            cleanupImages(true);
            // localStorage.setItem(category + "TierListMakerCode", this.generateCodeFromList());
            updateDBWithChanges(category);
            hideModalDOM();
        }.bind(this));

        $(document).on('click', '#save', function() {
            // $("#save").prop("disabled",true);
            if (codeToSave != '' && $("#tierTitle").val() != '' && $('#tierImage').val() != '') {
                $('#tierCodeInput').val(codeToSave);
                $('#tierBackground').val(localStorage.getItem(`${category}TierListMakerCodeBackground`));
                return true;
            } else if ($("#tierTitle").val() == '') {
                // $("#save").prop("disabled",false);
                alert("Please add a title to your Tier List.");
                return false;
            } else if (!$('#tierImage').val()) {
                // $("#save").prop("disabled",false);
                alert("Please wait while we generate your preview image.");
                return false;
            } else {
                // $("#save").prop("disabled",false);
                alert("You must finish creating the list before saving it.");
                return false;
            }
        }.bind(this))

        const containerWidth = $('#main-container').css('width');
        const shareBtnDisplay = $('.share-link').css('display');
        const emojiDisplay = $('#emoji').css('display');

        $(document).on('click', '#preview', function(element) {
            $("#main-container").css("width", "2000px");
            $("#tier-wrap").css("width", "1200px");

            // if ($('#main-container').width() < 1120) {
            //     $(".rail-banners").css("display", "none");
            // }

            $("#exportcode").val(this.generateCodeFromList());
            $("#modal").css("display", "none");
            $("h1").css("display", "none");
            $("#breadcrumbs").css("display", "none");
            $(".share-link").css("display", "none");
            $('#emoji').css("display", "none");
            $("#export-container canvas").remove();
            $("#export-container").css("display", "block");
            $("#overlay").css("opacity", 1);
            $("#overlay").css("visibility", "visible");
            $(".settings-control").css("display", "none");
            const scaler = $(".draggable-filler").css('display') != 'inline-block' ? 1.2 : 1;
            const tierHeight = $(".character").height();
            const tierWidth = $('.label-holder').width();
            const characterHeight = $(".character").height();
            const characterWidth = $(".character").width();
            $(".label").css({
                "font-size": "20px",
                "line-height": "27px"
            });
            $(".tier").css("height", 'auto');
            $('.label-holder').css("width", tierWidth * 1.3 + 'px');
            if ($(".draggable-filler").css('display') != 'inline-block') {
                $(".character").css("height", characterHeight * scaler + 'px');
                $(".character").css("width", characterWidth * scaler + 'px');
            }

            $("#overlay-logo").css('display', 'block');
            $("#overlay-logo").css('width', '250px');

            let childBreak = 8;
            if ($(".character").width() > 129) {
                childBreak = 5;
            }

            $( `.tier-row:first-child .character:nth-child(${childBreak})`).after( "<div id='logo-breaker' style='width: 100%;'></div>" );
            $('#imageCount').val($('.character').length);
            // potential fix
            // window.scrollTo(0,0);

            html2canvas(document.getElementById('tier-wrap'), {
                scale: .95,
                scrollY: -window.scrollY
            }).then((canvas)=>{
                const previewCanvas = canvas;
                previewCanvas.style.width = '100%';
                previewCanvas.style.height = 'auto';
                $("#export-container span").after(previewCanvas);
                $("#export-container").css("top", "20px");
                $("#main-container").css("width", containerWidth);
                $("#tier-wrap").css("width", "auto");

                // if ($('#main-container').width() < 1120) {
                //     $(".rail-banners").css("display", "block");
                // }

                $(".settings-control").css("display", "flex");
                $(".tier").css("width", '100%');
                if ($(".draggable-filler").css('display') != 'inline-block') {
                    $(".character").css("height", characterHeight + 'px');
                    $(".character").css("width", characterWidth + 'px');
                }
                $(".label").css({
                    "font-size": "15px",
                    "line-height": "21px"
                });
                $('.label-holder').css("width", '100px');
                var img = canvas.toDataURL("image/png", 1.0);
                $('#tierImage').val(img);
                $('#downloadLink').attr({
                    'download': 'my-image.png',
                    'href': img
                });
                $("h1").css("display", "block");
                $("#breadcrumbs").css("display", "block");
                $(".share-link").css("display", shareBtnDisplay);
                $('#emoji').css("display", emojiDisplay);
                $('#emojiPluginMobile').css("display", "none");
                $('#emojiPluginMobileClose').css("display", "none");
                $("#overlay-logo").css('display', 'none');
                $("#logo-breaker").remove();
                console.log('Successfully created preview.');
                fetch('/includes/tracker.php?id=' + category).then(()=>{
                    console.log('updated' + category)
                });
            }).catch((error) => {
                console.log(`Error creating preview image: ${error}`);
            });
        }.bind(this));

        $(document).on('click', '#exportRetry', function(element) {
            $("#main-container").css("width", "2000px");
            $("#tier-wrap").css("width", "1200px");

            // if ($('#main-container').width() < 1120) {
            //     $(".rail-banners").css("display", "none");
            // }

            $("#exportcode").val(this.generateCodeFromList());
            $("#modal").css("display", "none");
            $("h1").css("display", "none");
            $("#breadcrumbs").css("display", "none");
            $(".share-link").css("display", "none");
            $('#emoji').css("display", "none");
            $("#export-container canvas").remove();
            $("#export-container").css("display", "block");
            $("#overlay").css("opacity", 1);
            $("#overlay").css("visibility", "visible");
            $(".settings-control").css("display", "none");
            const scaler = $(".draggable-filler").css('display') != 'inline-block' ? 1.2 : 1;
            const tierHeight = $(".character").height();
            const tierWidth = $('.label-holder').width();
            const characterHeight = $(".character").height();
            const characterWidth = $(".character").width();
            $(".label").css({
                "font-size": "20px",
                "line-height": "27px"
            });
            $(".tier").css("height", 'auto');
            $('.label-holder').css("width", tierWidth * 1.3 + 'px');
            if ($(".draggable-filler").css('display') != 'inline-block') {
                $(".character").css("height", characterHeight * scaler + 'px');
                $(".character").css("width", characterWidth * scaler + 'px');
            }

            $("#overlay-logo").css('display', 'block');
            $("#overlay-logo").css('width', '250px');

            let childBreak = 8;
            if ($(".character").width() > 129) {
                childBreak = 5;
            }

            $( `.tier-row:first-child .character:nth-child(${childBreak})`).after( "<div id='logo-breaker' style='width: 100%;'></div>" );
            $('#imageCount').val($('.character').length);
            // potential fix
            // window.scrollTo(0,0);

            html2canvas(document.getElementById('tier-wrap'), {
                scale: .95,
                scrollY: -window.scrollY
            }).then((canvas)=>{
                const previewCanvas = canvas;
                previewCanvas.style.width = '100%';
                previewCanvas.style.height = 'auto';
                $("#export-container span").after(previewCanvas);
                $("#export-container").css("top", "20px");
                $("#main-container").css("width", containerWidth);
                $("#tier-wrap").css("width", "auto");

                // if ($('#main-container').width() < 1120) {
                //     $(".rail-banners").css("display", "block");
                // }

                $(".settings-control").css("display", "flex");
                $(".tier").css("width", '100%');
                if ($(".draggable-filler").css('display') != 'inline-block') {
                    $(".character").css("height", characterHeight + 'px');
                    $(".character").css("width", characterWidth + 'px');
                }
                $(".label").css({
                    "font-size": "15px",
                    "line-height": "21px"
                });
                $('.label-holder').css("width", '100px');
                var img = canvas.toDataURL("image/png", 1.0);
                $('#tierImage').val(img);
                $('#downloadLink').attr({
                    'download': 'my-image.png',
                    'href': img
                });
                $("h1").css("display", "block");
                $("#breadcrumbs").css("display", "block");
                $(".share-link").css("display", shareBtnDisplay);
                $('#emoji').css("display", emojiDisplay);
                $('#emojiPluginMobile').css("display", "none");
                $('#emojiPluginMobileClose').css("display", "none");
                $("#overlay-logo").css('display', 'none');
                $("#logo-breaker").remove();
                console.log('Successfully created preview.');
            }).catch((error) => {
                console.log(`Error creating preview image: ${error}`);
            });
        }.bind(this));

        $(document).on('click', '#reset', function(element) {
            clearStorage(category);
        }.bind(this));
    }
}

const COLORS = [
    {
        'hex': '#FF7F7F',
        'rgb': 'rgb(255, 127, 127)',
    },
    {
        'hex': '#FFBF7F',
        'rgb': 'rgb(255, 191, 127)',
    },
    {
        'hex': '#FFDF7F',
        'rgb': 'rgb(255, 223, 127)',
    },
    {
        'hex': '#FFFF7F',
        'rgb': 'rgb(255, 255, 127)',
    },
    {
        'hex': '#BFFF7F',
        'rgb': 'rgb(191, 255, 127)',
    },
    {
        'hex': '#7FFF7F',
        'rgb': 'rgb(127, 255, 127)',
    },
    {
        'hex': '#7FFFFF',
        'rgb': 'rgb(127, 255, 255)',
    },
    {
        'hex': '#7FBFFF',
        'rgb': 'rgb(127, 191, 255)',
    },
    {
        'hex': '#7F7FFF',
        'rgb': 'rgb(127, 127, 255)',
    },
    {
        'hex': '#FF7FFF',
        'rgb': 'rgb(255, 127, 255)',
    },
    {
        'hex': '#BF7FBF',
        'rgb': 'rgb(191, 127, 191)',
    },
    {
        'hex': '#3B3B3B',
        'rgb': 'rgb(59, 59, 59)',
    },
    {
        'hex': '#858585',
        'rgb': 'rgb(133, 133, 133)',
    },
    {
        'hex': '#CFCFCF',
        'rgb': 'rgb(207, 207, 207)',
    },
    {
        'hex': '#F7F7F7',
        'rgb': 'rgb(247, 247, 247)',
    },
];

const SINGLE_ROW_DOM = "<div class=\"tier-row\"><div class=\"label-holder\" style='background-color:#FFFF7F' contenteditable=\"true\"><span class=\"label\">NEW</span></div><div class=\"tier sort\"></div><div class=\"settings-control\"><div class=\"settings\"></div><div class=\"move-buttons\"><div class=\"move-up\"></div><div class=\"move-down\"></div></div></div></div>";

function setDefaults() {
    $("#create-image-carousel").html("<div></div>");
    document.querySelectorAll('.tier-row .label-holder').forEach((label, i) => {
        const bgColor = COLORS[i].hex;
        label.style.backgroundColor = bgColor;
    });
}

function getTemplateImages(category, variation = '') {
    return fetch(`/api/?type=templates-v2&id=${category}&lastEdited=${dateLastEdited}&variation=${variation}`, {method: 'GET'}).then((response) => {
            if (response.status !== 200) {
                console.log('Looks like there was a problem. Status Code: ' + response.status);
                return;
            }
            return response.json();
        }
    ).catch((err) => {
            console.log('Fetch Error: ', err);
        }
    );
}

function clearOutTable() {
    document.querySelectorAll('#tier-container .tier-row').forEach((el) => {
        el.remove();
    });
}

function resetColorSpan(spanDOM, target) {
    document.querySelectorAll(spanDOM).forEach((el) => {
        el.className = '';
    })
    target.className = 'selected';
}

function clearStorage(category) {
    localStorage.removeItem(`${category}TierListMakerCode`);
    localStorage.removeItem(`${category}TierListMakerCodeBackground`);
    const transaction = db.transaction(["tierlists"], 'readwrite');
    const objectStore = transaction.objectStore('tierlists');

    const deleteRequest = objectStore.delete(category);

    deleteRequest.onsuccess = () => {
        console.log("Record deleted successfully!");
    };

    deleteRequest.onerror = (event) => {
        console.error("Error deleting record:", event.target.errorCode);
    };

    location.reload();
}

function hideSettingsColumn() {
    document.querySelectorAll('.settings-control').forEach((el) => {
        el.style.display = 'none';
    })
}

function getTargetParent(target) {
    return $(target).parent().parent();
}

function  removeFromRowAndMove(pic) {
    for (let i = 0; i < pic.length; i++) {
        $("#create-image-carousel div:last-child").after(pic);
    }
}

function getCurrentColor(currentTierRow) {
    return currentTierRow.find(".label-holder").css("background-color");
}

function hideModalDOM() {
    const urlParams = new URLSearchParams(window.location.search);
    const hasParam = urlParams.has('showPreviewModal'); // Replace 'paramName' with the actual parameter name

    if (hasParam) {
        window.location = window.location.href.split("?")[0];
    } else {
        document.getElementById('overlay').style.opacity = 0;
        document.getElementById('overlay').style.visibility = 'hidden';
        document.getElementById('modal').style.display = 'none';
        document.getElementById('export-container').style.display = 'none';
        document.getElementById('modal').removeAttribute('data-id');
    }
}
function showModalDOM(rowIndex) {
    document.getElementById('modal').style.display = 'block';
    document.getElementById('overlay').style.opacity = 1;
    document.getElementById('overlay').style.visibility = 'visible';
    document.getElementById('modal').setAttribute('data-id', rowIndex);
}

function setupModalContext(context) {
    const currentColor = getCurrentColor(context);
    const colorIndex = COLORS.findIndex((color) => currentColor === color.rgb);
    const rowText = context.find(".label-holder").text();
    $("textarea.settings-label").val(rowText);
    $('#modal span').attr("class", "");
    $(`#modal span:nth-of-type(${(colorIndex + 1)})`).attr("class", "selected");
    const rowIndex = $('#tier-container .tier-row').index(context)
    showModalDOM(rowIndex);
}

function addImageToCarousel(category, currentTemplatePic, i, variation) {
    let id, source;
    if(typeof currentTemplatePic === 'object') {
        id = currentTemplatePic.id;
        source = currentTemplatePic.src;
    } else {
        id = i;
        source = currentTemplatePic;
    }

    const urlPath = source.includes('tiermaker.com/') ? '' : `${baseTierImagePath}/`;
    const lastChild = document.getElementById('create-image-carousel');
    const bgImage = `url(${urlPath}${source})`;
    const itemNode = document.createElement("div");
    itemNode.style.backgroundImage = bgImage;
    itemNode.setAttribute('id', id);
    itemNode.setAttribute('class', 'character');

    const imageNode = document.createElement("img");
    imageNode.setAttribute('class', 'draggable-filler');
    imageNode.setAttribute('src', `${urlPath}${source}`);
    imageNode.setAttribute('style', 'visibility: hidden');
    itemNode.append(imageNode);

    if (lastChild) {
        lastChild.append(itemNode);
    }
}

function addImageToListRow(rowNode, lastChild, category, templatePic, picId, variation) {
    let id, source;
    if(typeof templatePic === 'object') {
        id = templatePic.id;
        source = templatePic.src;
    } else {
        id = picId;
        source = templatePic;
    }

    const urlPath = source.includes('tiermaker.com/') ? '' : `${baseTierImagePath}/`;
    const bgImage = `url(${urlPath}${source})`;
    if (rowNode.find(lastChild)) {
        rowNode.find('.tier').append("<div class='character'><img style='visibility: hidden' src='" + urlPath + source + "' class='draggable-filler'/></div>");
    } else {
        rowNode.find(lastChild).after("<div class='character'><img style='visibility: hidden' src='" + urlPath + source + "' class='draggable-filler'/></div>");
    }
    rowNode.find(lastChild).css("background-image", bgImage);
    rowNode.find(lastChild).attr("id", id);

    $("#create-image-carousel #" + id).remove();
}

function updateRowColorAndText(rowNode, color, label) {
    rowNode.find(".label-holder").css("background-color", color);
    rowNode.find(".label").html(label);
}

function addRow(i, row, direction) {
    const index = parseInt(i);
    const newRow = '.tier-row';
    if (direction === 'before') {
        $(newRow).eq(index).before(row);
        document.getElementById('modal').setAttribute('data-id', index + 1);
    } else {
        $(newRow).eq(index).after(row);
    }
}

function generateRowFromCode(code, currentTemplatePics, category, isCreatePage, variation) {
    const codeSplit = code.split("==");
    const rowArray = splitRows(codeSplit);

    for (let i = 1; i < rowArray.length; i++) {
        $("#tier-container").append(SINGLE_ROW_DOM);
        const rowNode = $(".tier-row:last-of-type");
        const lastChild = '.tier div:last-child';
        let colorIndex = rowArray[i][1];
        if (colorIndex == '-1') {
            colorIndex = i-1;
        }
        updateRowColorAndText(rowNode, COLORS[colorIndex].hex, rowArray[i][0]);
        for (var c = 2; c < rowArray[i].length; c++) {
            const picId = rowArray[i][c];
            let currentPic;
            if (variation) {
                currentPic = currentTemplatePics.find(item => item.id == picId);
            } else {
                currentPic = currentTemplatePics[picId];
            }
            if (currentPic) {
                addImageToListRow(rowNode, lastChild, category, currentPic, picId, variation);
            }
        }
    }

    const background = localStorage.getItem(`${category}TierListMakerCodeBackground`);
    if (background && isCreatePage) {
        $('#tier-container .tier-row').css("background-color", background);
    }
}

function processRows() {
    const codeColors = [], labels = [], templatePics = [];
    document.querySelectorAll('#tier-container .tier-row').forEach((element, index) => {
            const labelText = element.querySelector('.label-holder').textContent;
            labels.push(labelText);

            const bgColor = element.querySelector('.label-holder').style.backgroundColor;
            const colorIndex = COLORS.findIndex((color) => bgColor === color.rgb);
            codeColors.push(colorIndex);

            const currentPics = [];
            if (element.querySelectorAll('.character').length) {
                element.querySelectorAll('.character').forEach((element, index) => {
                        const imageId = $(element).attr("id");
                        currentPics.push(imageId);
                    }
                );
            }
            templatePics.push(currentPics);
        }
    );
    return {
        labels,
        codeColors,
        templatePics
    };
}

function buildShareCode(shareCode, labels, templatePics, codeColors) {
    for (let i = 0; i < labels.length; i++) {
        shareCode += labels[i] + "|" + codeColors[i];
        if (templatePics[i].length != 0) {
            shareCode += "|";
        }
        for (let c = 0; c < templatePics[i].length; c++) {
            shareCode += templatePics[i][c];
            if (c != templatePics[i].length - 1) {
                shareCode += "|";
            }
        }
        if (i != labels.length - 1) {
            shareCode += "==";
        }
    }
    return shareCode;
}

function splitRows(codeSplit) {
    const rowArray = [];
    for (let i = 0; i < codeSplit.length; i++) {
        const row = codeSplit[i].split("|");
        for (let c = 1; c < row.length; c++) {
            rowArray[i] = row;
        }
    }
    return rowArray;
}

function getModalId() {
    return document.getElementById('modal').getAttribute('data-id');
}

function cleanupImages(removeRow) {
    const index = getModalId();
    const row = $('.tier-row').eq(index).find('.tier div');
    removeFromRowAndMove(row);
    if (removeRow) {
        $('.tier-row').eq(index).remove();
    }
}

function getCookie(name) {
    var re = new RegExp(name + "=([^;]+)");
    var value = re.exec(document.cookie);
    return (value != null) ? unescape(value[1]) : null;
}

function setupObserver(category) {
    const targetNode = document.getElementById('tier-container');
    var config = {attributes: true, childList: true, subtree: true, characterDataOldValue: true};
    var callback = function (mutationsList) {
        for (var mutation of mutationsList) {
            // localStorage.setItem(`${category}TierListMakerCode`, tierSystem.generateCodeFromList());

            if(db) {
                let transaction = db.transaction(["tierlists"], "readwrite");
                let objectStore = transaction.objectStore("tierlists");

                let data = { urlKey: category, code: tierSystem.generateCodeFromList() };
                let addRequest = objectStore.put(data);

                addRequest.onsuccess = function() {
                    codeToSave = data?.code;
                    console.log("Data added successfully!");
                };

                addRequest.onerror = function() {
                    console.error("Error adding data.");
                };
            } else {
                localStorage.setItem(`${category}TierListMakerCode`, this.generateCodeFromList());
                codeToSave = localStorage.getItem(`${category}TierListMakerCode`);
            }
        }
    };
    var observer = new MutationObserver(callback);
    observer.observe(targetNode, config);
}


function updateDBWithChanges(category) {
    if(db) {
        let transaction = db.transaction(["tierlists"], "readwrite");
        let objectStore = transaction.objectStore("tierlists");

        let data = { urlKey: category, code: tierSystem.generateCodeFromList() };
        let addRequest = objectStore.put(data);

        addRequest.onsuccess = function() {
            codeToSave = data?.code;
            console.log("Data added successfully!");
        };

        addRequest.onerror = function() {
            console.error("Error adding data.");
        };
    } else {
        localStorage.setItem(`${category}TierListMakerCode`, this.generateCodeFromList());
        codeToSave = localStorage.getItem(`${category}TierListMakerCode`);
    }
}
