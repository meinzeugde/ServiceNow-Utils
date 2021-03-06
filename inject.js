var fields = [];
var g_list = {};
var mySysId = '';
//Initialize Typeahead Data
var bloodhound = {};
var autoCompletionLimit = 100;
var autoComletionMinLength = 2;
var iframeId = 'gsft_main';
var applicationFilterId = 'filter';
var globalSearchId = 'sysparm_search';

if (typeof jQuery != "undefined") {
    var applicationFilterEl = jQuery('#' + applicationFilterId);
    var globalSearchEl = jQuery('#' + globalSearchId);

    makeUpdateSetIconClickable();

    jQuery(function () {
        if (typeof angular != "undefined")
            setTimeout(getListV3Fields, 2000);
        else
            doubleClickToSetQueryListV2();


        doubleClickToShowField();
        clickToList();
        setShortCuts();
        bindPaste();
        initializeAutocomplete();
        extendReferenceIconsToOpenInTabs();
        makeReadOnlyContentCopyable();
        showCustomerUpdateRelatedRecordLinks();
    
        //Initialize Alert
        var alertContainer = '<div class="notification-container service-now-util-alert" role="alert" style="top: 20px;"><div class="notification outputmsg outputmsg_has_text"><span class="outputmsg_text role="alert"></span></div></div>';
        jQuery('header').prepend(alertContainer);
    });
}

function extendReferenceIconsToOpenInTabs() {
    //EXPERIMENTAL: this allows to hold Ctrl to open the current form in a new tab
    jQuery('[data-type=reference_popup]').attr('href','#');
}

function showCustomerUpdateRelatedRecordLinks() {
    if (typeof g_listHandlersLoaded != 'undefined') {
        // jQuery("table[id*='sys_update_xml'] tr[id*='sys_update_xml'] td[data-original-title]").filter(function() {
        jQuery("table[id*='sys_update_xml'] tr[id*='sys_update_xml'] td a[data-popover-title]").filter(function(id,el) {
            var elm = jQuery(el);
            var match = elm.attr('data-popover-title').match(/[_a-z^0-9]*([a-z0-9]{32})/g);
            var hasLink = elm.parent('td').find('a.snowutils-related-record').size() > 0;
            return match  && !hasLink;
        }).each(function (index, el) {
            var elm = jQuery(this);
            var title = elm.attr('data-popover-title') || '';
            if(title.trim() != '') {
                var table = title.substr(0, title.lastIndexOf('_'));
                var sysId = title.substr(title.lastIndexOf('_') + 1);
                elm.parent('td').prepend('<a class="snowutils-related-record" style="padding:5px;" href="' + table + '.do?sys_id=' + sysId + '" title="Show related record"><i class="glyphicon glyphicon-eye-open table-btn-lg"></a>');
            }
        });
    }
}

function showTableSysIds() {
    jQuery("table tr a[class*='list_popup']").each(function (index, el) {
        var elm = jQuery(this);
        var href = elm.attr('href');
        var sysId = retrieveSysId(href)
        elm.parent().html(sysId);
    });
}

function showTableFullLengthNames() {
    jQuery("table tr td:contains('...')").each(function (index, el) {
        var elm = jQuery(this);
        var title = elm.attr('title') || elm.attr('data-original-title') || elm.parent().attr('title');
        elm.html(title);
    });
    jQuery("table tr td a:contains('...')").each(function (index, el) {
        var elm = jQuery(this);
        var title = elm.attr('title') || elm.attr('data-original-title');
        elm.html(title);
    });
}

function initializeAutocomplete(array) {
    if (typeof Bloodhound == 'undefined') return;

    bloodhound = new Bloodhound({
        local: array || [],
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        datumTokenizer: Bloodhound.tokenizers.whitespace
    });
    //Activate autocomplete for technical table names
    applicationFilterEl.typeahead({
        minLength: autoComletionMinLength,
        highlight: true,
        classNames: {
            'cursor': 'mark'
        }
    }, {
        name: 'my-dataset',
        limit: autoCompletionLimit,
        source: bloodhound
    });
}

function makeUpdateSetIconClickable() {
    if (!jQuery("a.icon-document-multiple[href*='sys_update_set']").length) { //starting Jakarta this is oob
        jQuery('update-set-picker')
            .find('.icon-document-multiple')
            .first()
            .css('color', 'red')
            .wrap("<a name='openupdateset' href='#' ></a>");


        jQuery("[name='openupdateset']").on('click', function (e) {
            var ussysid = jQuery("[name='update_set_picker_select']").val().replace('string:', '');
            var url = '/sys_update_set.do?sys_id=' + ussysid;

            if (e.shiftKey || e.ctrlKey || e.metaKey)
                jQuery("<a>").attr("href", url).attr("target", "_blank")[0].click();
            else
                jQuery('#' + iframeId).attr('src', url);
        });
    }
}


function doubleClickToShowField() {
    if (typeof g_form != 'undefined') {
        document.addEventListener("dblclick", function (event) {
            if (jQuery(event.target).hasClass('label-text')) {
                var elm = jQuery(event.target).closest('div.form-group').attr('id').split('.').slice(2).join('.');
                var val = g_form.getValue(elm);
                var newValue = prompt('Value of ' + elm, val);
                if (newValue !== null)
                    g_form.setValue(elm, newValue);
            }
        }, true);
    }
}

function setAllMandatoryFieldsToFalse() {
    if (typeof g_form != 'undefined' && typeof g_user != 'undefined') {
        if (g_user.hasRole('admin')) {
            var fields = g_form.getEditableFields();
            for (var x = 0; x < fields.length; x++) {
                g_form.setMandatory(fields[x], false);
            }
            showAlert('Removed mandatory restriction from all fields.', 'success');
        } else {
            showAlert('Admin rights required.', 'danger');
        }
    }
}

/**
 * this solves an issue where e.g. OOTB read-only Script Include content was not copyable
 */
function makeReadOnlyContentCopyable() {
    try {
        if (typeof g_glideEditorArray != 'undefined' && g_glideEditorArray instanceof Array) {
            for (var i = 0; i < g_glideEditorArray.length; i++) {
                if (g_glideEditorArray[i].editor.getOption('readOnly') == 'nocursor')
                    g_glideEditorArray[i].editor.setOption('readOnly', true);
            }
        }
    } catch (error) {
        console.error(error)
    }
}

function doubleClickToSetQueryListV2() {
    //dbl click to view and update filter condition
    jQuery('div.breadcrumb_container').on("dblclick", function (event) {
        var qry = GlideList2.get(jQuery('#sys_target').val());
        var newValue = prompt('Filter condition:', qry.filter);
        if (newValue !== qry.filter && newValue !== null) {
            qry.setFilterAndRefresh(newValue);
        }
    });
}

var qry = ''
function clickToList() {
    if (typeof g_form != 'undefined') {
        document.addEventListener("click", function (event) {

            if ((event.ctrlKey || event.metaKey)) {
                var tpe = '';
                var tbl = g_form.getTableName();
                var elm = 'sys_id';
                var sysId = g_form.getUniqueValue();
                var operator = '=';
                var sysId;
                if (jQuery(event.target).hasClass('label-text')) {
                    elm = jQuery(event.target).closest('div.form-group').attr('id').split('.').slice(2).join('.');
                    tpe = jQuery(event.target).closest('div.label_spacing').attr('type');
                    sysId = g_form.getValue(elm);
                }

                if (tpe == 'glide_list' && elm != 'sys_id') {
                    operator = 'LIKE';
                }
                else if (sysId.length != 32 && sysId.length > 20) {
                    sysId = sysId.substring(0, 32);
                    operator = 'LIKE';
                }
                else if (sysId.length == 0) {
                    sysId = '';
                    operator = 'ISEMPTY';
                }

                var idx = qry.indexOf(elm + operator);
                if (idx > -1)
                    qry = qry.replace(elm + operator + sysId + '^', '');
                else
                    qry += elm + operator + sysId + '^';

                var listurl = '/' + tbl + '_list.do?sysparm_query=' + qry;
                g_form.clearMessages();
                if (elm == 'sys_id' && qry.length <= 45) {
                    qry = '';
                    if (!$j(event.target).hasClass('btn') && !$j(event.target).is('a') && !$j(event.target.parentElement).is('a') && !$j(event.target).is('option')) {
                        var name = g_form.getValue('name');
                        var number = g_form.getValue('number');
                        if(name) listurl += 'ORname=' + name;
                        if(number) listurl += 'ORnumber=' + number;                        
                        window.open(listurl, tbl);
                    }
                }
                else if (qry)
                    g_form.addInfoMessage('Filter <a href="javascript:delQry()">delete</a> :<a href="' + listurl + '" target="' + tbl + '">' + listurl + '</a>');

            }
        }, true);
    }
}

function delQry() {
    qry = '';
    g_form.clearMessages();
}


function loadScript(url) {
    return new Promise(function (resolve, reject) {
        var script = document.createElement("script");
        script.onload = resolve;
        script.onerror = reject;
        script.src = url;
        document.getElementsByTagName("head")[0].appendChild(script);
    });
}

function loadjQuery() {
    if (window.jQuery) {
        // already loaded and ready to go
        return Promise.resolve();
    } else {
        return loadScript('//code.jquery.com/jquery-latest.min.js');
    }
}


function addTechnicalNames() {

    if (typeof jQuery == 'undefined') return; //not in studio

    if (typeof g_form != 'undefined') {
        jQuery(".label-text:not(:contains('|'))").each(function (index, value) {

            var elm = jQuery(this).closest('div.form-group').attr('id').split('.').slice(2).join('.');
            jQuery(this).prepend('<i>' + elm + ' | </i> ');
        });
    };

    jQuery('th.list_hdr, th.table-column-header').each(function (index) {
        var tname = jQuery(this).attr('name') || jQuery(this).data('column-name');
        if (jQuery(this).find('a.list_hdrcell, a.sort-columns').text().indexOf('|') == -1)
            jQuery(this).find('a.list_hdrcell, a.sort-columns').prepend('<i>' + tname + ' | </i> ');
    });
}

function showSelectFieldValues() {
    if (typeof jQuery == 'undefined') return; //not in studio

    jQuery('option').not(":contains('|')").each(function(i,el) {
        var jqEl = jQuery(el);
        jqEl.html(el.text + ' | ' + el.value);
    });

    jQuery('#tableTreeDiv td.tree_item_text > a').not(":contains('|')").each(function(i,el) {
        var jqEl = jQuery(el);
        jqEl.html(el.text + ' | ' + el.name);
    });
}

function showFormSections() {
    if (typeof jQuery == 'undefined') return; //not in studio

    jQuery('form [data-section-id]').each(function (i, el) {
        var jqEl = jQuery(el);
        var sectionSysId = jqEl.attr('data-section-id');
        
        var container = '<div class="outputmsg_div service-now-util-section"><div class="outputmsg outputmsg_info notification notification-info"><span class="outputmsg_text">' +
        '<a href="sys_ui_section.do?sys_id=' + sectionSysId + '" target="_blank">Go to Form Section "' + sectionSysId + '"</a>' +
        ' | ' +
        '<a href="sys_update_xml_list.do?sysparm_query=nameCONTAINS' + sectionSysId + '" target="_blank">Go to Customer Updates for Form Section</a>' +
        '</span></div></div>';
        
        jqSecEl = jqEl.find('div#' + sectionSysId);
        if(jqSecEl.find('.service-now-util-section').size() == 0) {
            jqSecEl.css({border: '1px solid #ff0000'}).prepend(container);
        }
    });
}

function setShortCuts() {

    document.addEventListener("keydown", function (event) {

        //across all pages to set focus to left menu
        if (((event.ctrlKey || event.metaKey) && event.shiftKey) && event.keyCode == 70) { //cmd||ctrl-shift-s
            var doc = (window.self == window.top) ? document : top.document;
            if (applicationFilterEl) { //switch between Navigator and search on hitting cmd-shift-f
                var elm = (document.activeElement.id != applicationFilterId) ? applicationFilterId : globalSearchId;
                doc.getElementById(elm).focus();
                doc.getElementById(elm).select();
            }
        }

        else if (event.ctrlKey && event.keyCode == 32) { //cmd||ctrl-space
            
            var doc = (window.self == window.top) ? document : top.document;
            if (applicationFilterEl && document.activeElement.id == applicationFilterId) {
                var value = applicationFilterEl.val();
                if(value.length < autoComletionMinLength) return;

                if (value.indexOf('.') > -1) {
                    applicationFilterEl.typeahead('destroy');
                    value = value.substr(0, value.indexOf('.'));
                    appendices = ['li', 'LI', 'struct', 'STRUCT', 'mine', 'MINE', 'config', 'CONFIG', 'do', 'DO'];
                    initializeAutocomplete(appendices.map(function (a) { return value + '.' + a }));

                    applicationFilterEl.focus();
                    applicationFilterEl.select();
                } else {

                    var myurl = '/api/now/table/sys_db_object?sysparm_fields=name&sysparm_query=sys_update_nameISNOTEMPTY^nameSTARTSWITH' + value + '^nameNOT LIKE00%5EORDERBYname&&sysparm_limit=' + autoCompletionLimit;
                    loadXMLDoc(g_ck, myurl, null, function (json) {
                        applicationFilterEl.typeahead('destroy');
                        json = (json.result.map(function (t) { return t.name }));
                        initializeAutocomplete(json);

                        applicationFilterEl.focus();
                        applicationFilterEl.select();
                        setTimeout(function() {
                            applicationFilterEl.prop({
                                'selectionStart': value.length,
                                'selectionEnd': value.length
                            });
                        },10);
                    });
                }
            }
        }

        else if (event.keyCode == 13) { //return
            var doc = (window.self == window.top) ? document : top.document;
            if (applicationFilterEl && document.activeElement.id == applicationFilterId) {
                var value = applicationFilterEl.val();
                var listurl = '';
                var query = [];
                var orderAttr = 'sys_updated_on';
                var table, action;

                if(value.indexOf('>') > -1 && value.indexOf('.') == -1) {
                    query.push(value.substr(value.indexOf('>') + 1));
                    table = value.substr(0, value.indexOf('>'));
                    if(isSysId(query[0])) {
                        listurl = '/' + table + '.do?sys_id=' + query[0];
                    } else {
                        listurl = '/' + table + '_list.do' + getSysParmAppendix(query, orderAttr);
                    }
                    
                    //open window if action is applicable
                    loadIframe(listurl);
                } else if (value.indexOf('.') > -1) {
                    table = value.substr(0, value.indexOf('.'));
                    if(value.indexOf('>') > -1) {
                        action = value.substr(value.indexOf('.') + 1, value.indexOf('>') - value.indexOf('.') - 1 );
                        query.push(value.substr(value.indexOf('>') + 1));
                        if(isSysId(query[0])) query[0] = 'sys_id='+query[0];
                    } else {
                        action = value.substr(value.indexOf('.') + 1);
                    }                
                
                    //Restrict records to today for certain tables
                    if (['sys_update_version', 'syslog'].indexOf(table) > -1) {
                        query.push('sys_created_onONToday@javascript:gs.daysAgoStart(0)@javascript:gs.daysAgoEnd(0)');
                        orderAttr = 'sys_created_on';
                    }
                    //set url for all actions
                    if (action.toLowerCase() == 'do') {
                        if(query.length > 0) {
                            sysparmArr = query[0].split('=');
                            if(!sysparmArr[1]) {
                                sysparmArr[1] = sysparmArr[0];
                                sysparmArr[0] = 'number';
                            }
                            listurl = '/' + table + '.do?sysparm_refkey='+sysparmArr[0]+'&sys_id='+sysparmArr[1];
                        } else {
                            listurl = '/' + table + '.do';
                        }
                    }
                    else if (action.toLowerCase() == 'li') {
                        listurl = '/' + table + '_list.do' + getSysParmAppendix(query, orderAttr);
                    }
                    else if (action.toLowerCase() == 'mine') {
                        query.push('sys_created_by=' + window.NOW.user.name + '^ORsys_updated_by=' + window.NOW.user.name);
                        listurl = '/' + table + '_list.do' + getSysParmAppendix(query, orderAttr);
                    }
                    else if (action.toLowerCase() == 'struct') {
                        listurl = '/sys_db_object.do?sysparm_query=name=' + table;
                    }
                    else if (action.toLowerCase() == 'config') {
                        listurl = '/personalize_all.do?sysparm_rules_table=' + table + '&sysparm_rules_label=' + table;
                    }
                    else {
                        return;
                    }
                    //open window if action is applicable
                    if (action == action.toUpperCase()) {
                        window.open(listurl, table)
                    } else {
                        loadIframe(listurl);
                    }
                }

                console.log('table: ' + table, 'action: ' + action, 'query: ' + query);
            } else if (globalSearchEl &&  document.activeElement.id == globalSearchId) {
                var value = globalSearchEl.val();
                if(isSysId(value)) {
                    event.preventDefault();
                    searchSysIdTables(value);
                }
            }
        }

        //a few specific for forms
        else if (typeof g_form != 'undefined') {
            mySysId = g_form.getUniqueValue();
            if ((event.ctrlKey || event.metaKey) && event.keyCode == 83) { //cmd-s

                event.preventDefault();
                var doInsertStay = false;
                if (event.shiftKey) {
                    doInsertStay = document.querySelectorAll('#sysverb_insert_and_stay').length;
                    if (!doInsertStay) {
                        g_form.addWarningMessage("Insert and Stay not available for this record (SN Utils Exentsion)");
                        return false;
                    }
                }
                var action = (g_form.newRecord || doInsertStay) ? "sysverb_insert_and_stay" : "sysverb_update_and_stay";
                gsftSubmit(null, g_form.getFormElement(), action);
                return false;
            }
            else if ((event.ctrlKey || event.metaKey) && event.keyCode == 85) { //cmd-u 
                event.preventDefault();
                var action = (g_form.newRecord) ? "sysverb_insert" : "sysverb_update";
                gsftSubmit(null, g_form.getFormElement(), action);
                return false;
            }
        }


    }, false);


    if (document.getElementById(applicationFilterId)) {
        var ky = (window.navigator.platform.startsWith("Mac")) ? "(CMD-SHIFT-F)" : "(CTRL-SHIFT-F)";
        document.getElementById(applicationFilterId).placeholder = "Filter navigator " + ky;

    }

}

function getSysParmAppendix(encodedQueryArr, orderAttr) {
    if(typeof orderAttr == 'undefined') orderAttr = 'sys_updated_on';
    var orderQuery = 'sysparm_order=' + orderAttr + '&sysparm_order_direction=desc';
    if(encodedQueryArr.length > 0) {
        return '?sysparm_query=' + encodedQueryArr.join('^') + '&' + orderQuery;   
    }
    return '?' + orderQuery;
}

function retrieveSysId(value) {
    var match = value.match(/[a-z0-9]{32,32}/);
    return (match!=null) ? match[0] : '';
}

function isSysId(value) {
    return (value.match(/^[a-z0-9]{32,32}$/g) != null && value.length == 32);
}

function bindPaste() {

    if (typeof jQuery == 'undefined') return; //not in studio

    if (typeof g_form != 'undefined') {

        jQuery('#header_add_attachment').after('<button id="header_paste_image" title="Paste screenshot as attachment" class="btn btn-icon glyphicon glyphicon-paste navbar-btn" aria-label="Paste Image as Attachments" data-original-title="Paste Image as Attachments" onclick="tryPaste()"></button>');


        jQuery('body').bind('paste', function (e) {
            if (e.originalEvent.clipboardData.items.length > 0 && e.originalEvent.clipboardData.items[0].kind == "file") {
                if (g_form.isNewRecord()) {
                    g_form.clearMessages();
                    g_form.addWarningMessage('Please save record before pasting...');
                    return false;
                }
                g_form.addInfoMessage('<span class="icon icon-loading"></span> Pasted image being processed...');

                var fileInfo = e.originalEvent.clipboardData.items[0].getAsFile();
                var fr = new FileReader;
                fr.onloadend = function () {
                    var imgData = getBlob(fr.result);
                    saveImage(imgData, fileInfo);
                };
                fr.readAsDataURL(fileInfo);
            }
        });

    };
}

function tryPaste() {
    if (!document.execCommand('paste')) {
        g_form.clearMessages();
        g_form.addInfoMessage("Please hit cmd-v or ctrl-v if you want to paste a copied screenshot as attachment to this record. (SN Utils Exentsion)");
    }
}

function getBlob(encoded) {
    encoded = encoded.replace(/^data:image\/(png|jpeg);base64,/, "");
    var sliceSize = 1024;
    var byteCharacters = atob(encoded);
    var bytesLength = byteCharacters.length;
    var slicesCount = Math.ceil(bytesLength / sliceSize);
    var byteArrays = new Array(slicesCount);

    for (var sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
        var begin = sliceIndex * sliceSize;
        var end = Math.min(begin + sliceSize, bytesLength);

        var bytes = new Array(end - begin);
        for (var offset = begin, i = 0; offset < end; ++i, ++offset) {
            bytes[i] = byteCharacters[offset].charCodeAt(0);
        }
        byteArrays[sliceIndex] = new Uint8Array(bytes);
    }
    return new Blob(byteArrays, { type: "image/png" });
}

function saveImage(imgData, fileInfo) {

    if (typeof jQuery == 'undefined') return; //not in studio

    //var fileName = prompt("Filename to use:", fileInfo.name) || fileInfo.name;
    

    var URL = "/api/now/attachment/file?table_name=" +
        g_form.getTableName() + "&table_sys_id=" + g_form.getUniqueValue() + "&file_name=" + fileInfo.name;

    jQuery.ajax({
        url: URL,
        type: 'POST',
        contentType: 'application/octet-stream',
        data: imgData,
        processData: false,
        headers: {
            'Accept': 'application/json',
            'Content-Type': fileInfo.type,
            'Access-Control-Allow-Origin': '*',
            'X-UserToken': (typeof g_ck === 'undefined') ? '' : g_ck
        },
        contentType: 'application/json; charset=utf-8',
        success: function (r) {
            g_form.clearMessages();
            console.log(r);
            g_form.addInfoMessage("<span>Pasted image added as attachment<br /><a href='/" + r.result.sys_id + ".iix' target='myimg'><img src='" + r.result.sys_id + ".iix?t=small' alt='upload' style='display:inline!important; padding:20px;'/></a><br />" + 
        `<div class="input-group">
        <input id='tbxImageName' onKeyUp='if (event.keyCode == 13) renamePasted("` + r.result.sys_id + `")' type="text" value="`+ r.result.file_name.replace('.png','')+`" style='width:200px;'class="form-control" placeholder="Image name">
        <span class="input-group-btn" style="display: inline; ">
          <button class="btn btn-primary" onClick='renamePasted("` + r.result.sys_id + `")' style="width: 80px;" type="button">.png Save..</button>
        </span>
      </div><span id='divRenamed'></span></form>`);
$j('#tbxImageName').focus().select();

        },
        error: function (error) {
            console.log(error);
            g_form.clearMessages();
            g_form.addErrorMessage(error.responseJSON.error.detail)

        }
    });

};


function renamePasted(sysID, check){

if (!$j('#tbxImageName').val()){
    alert("Please insert a valid filename.");
    return false;
}


var requestBody = {
    "file_name" : $j('#tbxImageName').val()
}

var client=new XMLHttpRequest();
client.open("put","/api/now/table/sys_attachment/" + sysID);
client.setRequestHeader('Accept','application/json');
client.setRequestHeader('Content-Type','application/json');
if (typeof g_ck != 'undefined')
    client.setRequestHeader('X-UserToken',g_ck);

client.onreadystatechange = function() { 
	if(this.readyState == this.DONE) {
        if (this.status == 200) 
		    document.getElementById("divRenamed").innerHTML= " Filename saved!"; 
        else
		    document.getElementById("divRenamed").innerHTML=this.status + this.response; 
	}
}; 
client.send(JSON.stringify(requestBody));
   

}

function getListV3Fields() {
    try {
        //g_list.filter,g_list.tableName,g_list.sortBy,g_list.sortDir,g_list.,g_list.fields

        if (document.getElementsByClassName('list-container').length == 0)
            return false;

        var ang = angular.element('.list-container').scope().$parent.$parent;


        for (var i = 0; i < ang.data.columns.length; i++) {
            fields.push(ang.data.columns[i].name);
        }
        g_list = {
            "filter": ang.queryString,
            "tableName": ang.table,
            "sortBy": ang.data.filterWidgetConfig.sort[0].column_name,
            "sortDir": ang.data.filterWidgetConfig.sort[0].ascending ? "ASC" : "DESC",
            "rowsPerPage": ang.parameters.sysparm_limit,
            "fields": fields.toString()

        };

        //dbl click to view and update filter condition
        jQuery('div.breadcrumb-container').on("dblclick", function (event) {
            var qry = angular.element('.list-container').scope().$parent.$parent.queryString;
            var newValue = prompt('Filter condition:', qry);
            if (newValue !== qry && newValue !== null) {
                var qry = angular.element('.list-container').scope().$parent.$parent.queryString = newValue || '';
                setTimeout(function () {
                    angular.element('.list-container').scope().$parent.$parent.updateList();
                }, 300);
            }
        });

    }
    catch (err) {
        console.log(err);

    }
}

function loadIframe(url) {
    var $iframe = jQuery('#' + iframeId);
    if ($iframe.length) {
        $iframe.attr('src', url);
        return false;
    }
    return true;
}

var elNames = '';
function getFormElementNames() {
    if (typeof g_form !== 'undefined') {
        var elArr = []
        for (i = 0; i < g_form.elements.length; i++) {
            elArr.push(g_form.elements[i].fieldName);
        }
        elNames = (elArr.toString());
    }

}
getFormElementNames();

// if (typeof g_form !== 'undefined') {
//     // The ID of the extension we want to talk to.
//     //var chUtilsId = "pebbidlifabkglkbebloodgglcpcljgb"; //dev
//     var chUtilsId = "jgaodbdddndbaijmcljdbglhpdhnjobg"; //prod

//     // Make a simple request:
//     chrome.runtime.sendMessage(chUtilsId, { "table": g_form.tableName, "g_ck": g_ck },
//         function (response) {
//             console.log(response)
//         });
// }



//Query ServiceNow for tables and set to chrome storage
function setUpdateSetTables() {

    var myurl =  "/api/now/table/sys_dictionary?sysparm_fields=name&sysparm_query=" +
        "name=javascript:new PAUtils().getTableDecendants('sys_metadata')^internal_type=collection^attributesNOT LIKEupdate_synch=false^NQattributesLIKEupdate_synch=true";
    loadXMLDoc(g_ck, myurl, null, function (jsn) {

        var tbls = [];
        for (var t in jsn.result) {
            if(jsn.result[t].name.length > 1)
                tbls.push(jsn.result[t].name);
        }
        localStorage.setItem("updatesettables", JSON.stringify(tbls));
        //updateSetTables = tbls;
    });
}

//Function to query Servicenow API
function loadXMLDoc(token, url, post, callback) {
    try {
        var hdrs = {
            'Cache-Control': 'no-cache',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }

        if (token) //only for instances with high security plugin enabled
            hdrs['X-UserToken'] = token;

        var method = "GET";
        if (post) method = "PUT";

        jQuery.ajax({
            url: url,
            method: method,
            data: post,
            headers: hdrs
        }).done(function (rspns) {
            callback(rspns);
        }).fail(function (jqXHR, textStatus) {
            showAlert('Server Request failed (' + jqXHR.statusText + ')', 'danger');
            callback(textStatus);
        });
    } catch(error) {
        showAlert('Server Request failed (' + error + ')', 'danger');
    }
};

function searchSysIdTables(sysId) {
    try {
        showAlert('Searching for sys_id. This could take some seconds...')
        var script = 'function findSysID(e){var s,d,n=new GlideRecord("sys_db_object");n.addEncodedQuery("' +
            [
                'super_class=NULL', //do not include extended tables 
                'sys_update_nameISNOTEMPTY',
                'nameNOT LIKEts_',
                'nameNOT LIKEsysx_',
                'nameNOT LIKEv_',
                'nameNOT LIKE00',
                'nameNOT LIKEsys_rollback_',
                'nameNOT LIKEpa_',
            ].join('^') +
            '"),n.query();for(var a=[];n.next();)d=n.name+"",(s=new GlideRecord(d)).isValid()&&(s.addQuery("sys_id",e),s.queryNoDomain(),s.setLimit(1),s.query(),s.hasNext()&&a.push(d));gs.print("###"+a+"###")}findSysID("' + sysId + '");'
        startBackgroundScript(script, function (rspns) {
            answer = rspns.match(/###(.*)###/);
            if (answer != null && answer[1]) {
                showAlert('Success! All found records will be opened in a separate browser tab.', 'success');
                var tables = answer[1].split(',');
                var url;
                for (var i = 0; i < tables.length; i++) {
                    url = tables[i] + '.do?sys_id=' + sysId;
                    window.open(url, '_blank');
                }
            } else {
                showAlert('sys_id was not found in the system.', 'warning');
            }
        });
    } catch (error) {
        showAlert(error, 'danger');
    }
}

/**
 * @function startBackgroundScript
 * @param  {String} script   {the script that should be executed}
 * @param  {Function} callback {the function that's called after successful execution (function takes 1 argument: response)}
 * @return {undefined}
 */
function startBackgroundScript(script, callback) {
    try {
        jQuery.ajax({
            url: 'sys.scripts.do',
            method: 'GET', //POST does not work somehow
            headers: {
                'X-UserToken': g_ck,
                'Cache-Control': 'no-cache',
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            data: {
                script: script,
                runscript: "Run script",
                sysparm_ck: g_ck,
                sys_scope: 'e24e9692d7702100738dc0da9e6103dd'
            }
        }).done(function (rspns) {
            callback(rspns);
        }).fail(function (jqXHR, textStatus) {
            showAlert('Background Script failed (' + jqXHR.statusText + ')', 'danger');
        });
    } catch (error) {
        showAlert('Background Script failed (' + error + ')', 'danger');
    }
}

/**
 * @function showAlert
 * @param  {String} msg  {Message to show}
 * @param  {String} type {types: success, info, warning, danger (defaults to 'info')}
 * @param  {Integer} timeout {time to close the flash message in ms (defaults to '3000')}
 * @return {undefined}
 */
function showAlert(msg, type, timeout) {
    msg = 'ServiceNow Utils (Chrome Extension): ' + msg;
    if (typeof type == 'undefined') type = 'info';
    if (typeof timeout == 'undefined') timeout = 3000;
    var parent = window.parent.document;
    jQuery('header .service-now-util-alert>div>span', parent).html(msg);
    jQuery('header .service-now-util-alert', parent).addClass('visible');
    jQuery('header .service-now-util-alert>.notification', parent).addClass('notification-' + type);
    setTimeout(function () {
        jQuery('header .service-now-util-alert', parent).removeClass('visible');
        jQuery('header .service-now-util-alert>.notification', parent).removeClass('notification-' + type);
    }, timeout)
}