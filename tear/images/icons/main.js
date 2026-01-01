var uploadedImageCount = 0;
var baseTierImagePath = '/images/chart/chart/';
var dateLastEdited = '';
function readURL(input, imageType, isDraggable, isXY) {
    if(!isDraggable) {
        document.getElementById(imageType).innerHTML = "";
    }
    if (input.files && input.files[0]) {
        if ((uploadedImageCount + input.files.length) > 3000) {
            alert('You have exceeded the max image count of 3,000. If you want to go above this limit please email tiermakersite@gmail.com to request access.');
            input.value = '';
        } else if (input.files.length > 500) {
            alert('You cannout upload more than 500 images at a time.');
            input.value = '';
        } else {
            var totalSize = 0;
            for (i = 0; i < input.files.length; i++) {
                totalSize += input.files[i].size;
            }
            console.log('file size: ' + totalSize)
            if (totalSize > 50000000) {
                alert('You have exceeded the max upload file size limit. Please reduce the file sizes.');
                input.value = '';
            } else {
                for (i = 0; i < input.files.length; i++) {
                    var reader = new FileReader();
                    reader.onload = function(e) {
                        if (isDraggable) {
                            var node = document.createElement("div");
                            node.style.backgroundImage = `url('${e.target.result}')`;
                            node.style.display = 'inline-block';

                            const imageNode = document.createElement("img");
                            imageNode.setAttribute('class', 'draggable-filler');
                            imageNode.setAttribute('src', `${e.target.result}`);
                            imageNode.setAttribute('style', 'visibility: hidden;');
                            node.append(imageNode);

                            if (isXY) {
                                node.setAttribute("class", "draggable extra-images");
                                document.getElementById(imageType).appendChild(node);
                                $('.extra-images').draggable({
                                    containment: '#drop',
                                    stop: function () {
                                        const $this = $(this);
                                        const thisPos = $this.position();
                                        const parent = $this.closest('#draggable-container');
                                        var x = ( 100 * parseFloat($j(this).position().left / parseFloat($(this).parent().width())) ) + "%" ;
                                        var y = (parseFloat($(this).position().top) / 600) * 100 + "%" ;

                                        $(this).css("left", x);
                                        $(this).css("top", y);
                                        $(this).css("position", 'absolute');
                                    }
                                });
                            } else {
                                node.setAttribute("class", "character extra-images");
                                document.getElementById(imageType).appendChild(node);
                            }
                            document.getElementById('save').style.display = 'none';
                        } else {
                            var node = document.createElement("img");
                            node.setAttribute("src", e.target.result);
                            node.setAttribute("class", "preview-image");
                            document.getElementById(imageType).appendChild(node);
                        }
                    }
                    reader.readAsDataURL(input.files[i]);
                }
            }
        }
    }
}

async function getTemplateImagesForEdit(game, variation = '') {
    try {
        var results = await fetch(`/api/?type=templates-v2&id=${game}&lastEdited=${dateLastEdited}&variation=${variation}`, {
            method: 'GET'
        });
        var images = await results.json();
        uploadedImageCount = images.length || 0;
        console.log(`image count: ${uploadedImageCount}`);
        if (uploadedImageCount > 2500) {
            const maxImageDiv = "<p class=\"center\">You cannot upload more than 2500 images per template.</p>";
            document.getElementById("new-template-images-container").innerHTML = maxImageDiv;
        }
        for (i = 0; i < images.length; i++) {
            if (i !== 0) {
                var node = document.createElement("img");

                if (typeof images[i] === 'object') {
                    const { id, src } = images[i];
                    const urlPath = src.includes('tiermaker.com/') ? '' : `${baseTierImagePath}/`;
                    node.setAttribute("src", urlPath + src);
                    node.setAttribute("class", "preview-image");
                    node.setAttribute("id", id);
                } else {
                    const urlPath = images[i].includes('tiermaker.com/') ? '' : `${baseTierImagePath}/`;
                    node.setAttribute("src", urlPath + images[i]);
                    node.setAttribute("class", "preview-image");
                    node.setAttribute("id", i);
                }

                document.getElementById("current-images").appendChild(node);
            }
        }
    } catch (e) {
        console.log(e);
    }
}

async function getDeletedTemplateImagesForEdit(game, variation = '') {
    try {
        var currentImages = await fetch(`/api/?type=templates-v2&id=${game}&lastEdited=${dateLastEdited}&variation=${variation}&normalize=true`, {
            method: 'GET'
        });
        var currentImagesJson = await currentImages.json();

        var allImages = await fetch(`/api/?type=templates-v2&id=${game}&lastEdited=${dateLastEdited}&showDeleted=true`, {
            method: 'GET'
        });
        var allImagesJson = await allImages.json();
        const allImagesNormalized = [];
        allImagesJson.forEach((element,i) => allImagesNormalized.push({ src: element, id: i}));


        // const images = allImagesJson.filter(x => !currentImagesJson.includes(x));
        const images = allImagesJson.filter(({ id: id1 }) => !currentImagesJson.some(({ id: id2 }) => id2 == id1));

        for (i = 0; i < images.length; i++) {
                var node = document.createElement("img");

                if (typeof images[i] === 'object') {
                    const image = images[i];
                    node.setAttribute("src", image.src);
                    node.setAttribute("class", "preview-image");
                    node.setAttribute("id", image.id);
                } else {
                    const urlPath = images[i].includes('tiermaker.com/') ? '' : `${baseTierImagePath}/`;
                    node.setAttribute("src", urlPath + images[i]);
                    node.setAttribute("class", "preview-image");
                    node.setAttribute("id", i);
                }

                document.getElementById("images-to-hide").appendChild(node);
        }
    } catch (e) {
        console.log(e);
    }
}

function arr_diff (a1, a2) {

    var a = [], diff = [];

    for (var i = 0; i < a1.length; i++) {
        a[a1[i]] = true;
    }

    for (var i = 0; i < a2.length; i++) {
        if (a[a2[i]]) {
            delete a[a2[i]];
        } else {
            a[a2[i]] = true;
        }
    }

    for (var k in a) {
        diff.push(k);
    }

    return diff;
}

async function getTemplateImagesFromS3ForEdit(game) {
    try {
        var results = await fetch('/api/s3.php?type=templates&id=' + game);
        var images = await results.json();
        for (i = 0; i < images.length; i++) {
            if (i !== 0) {
                var node = document.createElement("img");
                node.setAttribute("src", "https://d3c78rhyxtisvh.cloudfront.net/" + images[i]);
                node.setAttribute("class", "preview-image");
                document.getElementById("preview-images").appendChild(node);
            }
        }
    } catch (e) {
        console.log(e);
    }
}
function confirmDelete() {
    if (confirm("Are you sure you want to delete this?") == true) {
        window.location = '?delete=true';
        return true;
    } else {
        return false;
    }
}
$(document).ready(function() {
    // $("#header-search").autocomplete({
    //     delay: 1500,
    //     open: function(result) {
    //         if (navigator.userAgent.match(/(iPod|iPhone|iPad)/)) {
    //             $('.ui-autocomplete').off('menufocus hover mouseover');
    //         }
    //     },
    //     focus: function(event, ui) {
    //         event.preventDefault();
    //         $("#template-list").val(ui.item.name);
    //     },
    //     source: function(request, response) {
    //         $.ajax({
    //             url: "/api/?type=autocomplete",
    //             dataType: "json",
    //             data: {
    //                 maxRows: 12,
    //                 q: encodeURI(request.term),
    //             },
    //             success: function(data) {
    //                 response($.map(data, function(item) {
    //                     const image = item.template_hero || '/tiermaker-icon.png';
    //                     return {
    //                         label: item.name,
    //                         full: image,
    //                         value: '/create/' + item.url_key
    //                     }
    //                 }));
    //             }
    //         });
    //     },
    //     select: function(event, ui) {
    //         event.preventDefault();
    //         $("#header-search").val(ui.item.name);
    //         window.location.replace(ui.item.value);
    //     },
    // }).autocomplete("instance")._renderItem = function(ul, item) {
    //     var inner_html = "<div><img src='/images/templates/" + item.full + "'/><div class='li-title'>" + item.label + "</div></div>";
    //     return $("<li role='menuitem'></li>").data("item.autocomplete", item).append(inner_html).appendTo(ul);
    // };
    // $("#header-search-mobile").autocomplete({
    //     delay: 1500,
    //     open: function(result) {
    //         if (navigator.userAgent.match(/(iPod|iPhone|iPad)/)) {
    //             $('.ui-autocomplete').off('menufocus hover mouseover');
    //         }
    //     },
    //     focus: function(event, ui) {
    //         event.preventDefault();
    //         $("#header-search-mobile").val(ui.item.name);
    //     },
    //     source: function(request, response) {
    //         $.ajax({
    //             url: "/api/?type=autocomplete",
    //             dataType: "json",
    //             data: {
    //                 maxRows: 12,
    //                 q: request.term
    //             },
    //             success: function(data) {
    //                 response($.map(data, function(item) {
    //                     const image = item.template_hero || '/tiermaker-icon.png';
    //                     return {
    //                         label: item.name,
    //                         full: image,
    //                         value: '/create/' + item.url_key
    //                     }
    //                 }));
    //             }
    //         });
    //     },
    //     select: function(event, ui) {
    //         event.preventDefault();
    //         $("#header-search-mobile").val(ui.item.name);
    //         window.location.replace(ui.item.value);
    //     },
    // }).autocomplete("instance")._renderItem = function(ul, item) {
    //     var inner_html = "<div><img src='/images/templates/" + item.full + "'/><div class='li-title'>" + item.label + "</div></div>";
    //     return $("<li role='menuitem'></li>").data("item.autocomplete", item).append(inner_html).appendTo(ul);
    // };

    $('#header-search-mobile').keypress(function(e) {
        if (e.which == 13) {
            $('#mobile-search').submit();
            return false;
        }
    });
    $('#header-search').keypress(function(e) {
        if (e.which == 13) {
            $('#desktop-search').submit();
            return false;
        }
    });
    $('#nav-icon').click(function() {
        $(this).toggleClass('open');
        $('#mobile-main-nav').slideToggle('slow');
        $('#mobile-create-nav').css('display', 'none');
        $('#createIcon').removeClass('open');
    });
    $("#header-search-icon").click(function(e) {
        e.preventDefault();
        e.stopPropagation();
        $('#header-search-container').toggle('slide', {
            direction: "right"
        });
        $('#header-search').focus();
    });
    $("#header-search").click(function(e) {
        e.preventDefault();
        e.stopPropagation();
    });
    $("#outer-container").click(function() {
        if ($("#header-search-container").is(':visible')) {
            $('#header-search-container').toggle('slide', {
                direction: "right"
            });
        }
    });
    $("#header-search-icon-mobile").click(function() {
        $('#header-search-container-mobile').slideToggle('slow');
    });
    const lazyLoadInstances = [];
    new LazyLoad({
        elements_selector: ".lazy",
        callback_enter: function(el) {
            const oneLL = new LazyLoad({
                container: el
            });
            lazyLoadInstances.push(oneLL);
        }
    });
});
