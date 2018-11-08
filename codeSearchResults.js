chrome.runtime.sendMessage({src: "codeSearchLoaded"}, function(response) {
    if(response && response.action === 'initialize') {
        initialize(response.url, response.result, response.searchTerm)
    }
});

function initialize(url, result, searchTerm) {
	var statisticsObj = {
		tables: 0,
		hits: 0,
		lines: 0
	};

	var resultHtml = '<div class="accordion" id="searchCodeAccordion">';
	for (var i=0; i<result.length; i++) {
		resultHtml += generateHtmlForCodeSearchEntry(result[i], url, searchTerm, statisticsObj);
	}
	resultHtml += '</div>';
	
	var html = '<h1>Code Search results for "' + searchTerm + '"</h1>';
	html += '<h4>' + statisticsObj.tables + ' Table(s) / ' + statisticsObj.hits + ' Record(s) / ' + statisticsObj.lines + ' Line(s) of Code - Time: ' + (new Date()).toUTCString() + '</h4>';
	html += '<h4>Instance: ' + url + '</h4>';
	html += '<hr />';
	html += resultHtml;
    jQuery('body').html(html);
}

function generateHtmlForCodeSearchEntry(data, url, searchTerm, statisticsObj) {
	if(!data || !data.hits || data.hits.length == 0)
		return '';

	var header = '' + 
		'<div class="card">' +
			'<div class="card-header" id="head_' + data.recordType + '">' +
			'' +
				'<h5 class="mb-0"><button class="btn btn-link" type="button" data-toggle="collapse" data-target="#collapse_' + data.recordType + '" aria-expanded="true" aria-controls="collapse_' + data.recordType + '">' +
					data.tableLabel + ' [' + data.recordType + '] (' + data.hits.length + ')' +
				'</button>' +
			'</h5></div>' + 
			'<div id="collapse_' + data.recordType + '" class="collapse show" aria-labelledby="' + data.recordType + '" idata-parent="#searchCodeAccordion"><div class="card-body">' +
			'';

	var footer = '' + 
		'</div> <!--card-body-->' +
		'</div> <!--collapse-->' +
		'</div> <!--card-->';

		
	statisticsObj.tables += 1;
	var tableAccordion = '<div class="accordion" id="searchCodeTableAccordion_' + data.recordType + '">';
	
	jQuery.each(data.hits, function(idx, hit) {
		var recordHeader = '' +
			'<div class="card">' +
			'<div class="card-header" id="head_' + hit.sysId + '">' +
			'' +
			'<h5 class="mb-0"><button class="btn btn-link" type="button" data-toggle="collapse" data-target="#collapse_' + hit.sysId + '" aria-expanded="true" aria-controls="collapse_' + hit.sysId + '">' +
			hit.name + ' (' + hit.matches.length + ')' +
			'</button>' +
			' [<a href="' + url + '/' + data.recordType + '.do?sys_id=' + hit.sysId + '" target="_blank">Open</a>]' +
			'</h5></div>' +
			'<div id="collapse_' + hit.sysId + '" class="collapse show" aria-labelledby="' + hit.sysId + '" idata-parent="#searchCodeTableAccordion_' + data.recordType + '"><div class="card-body">' +
			'';

		var recordFooter = '' +
			'</div> <!--card-body-->' +
			'</div> <!--collapse-->' +
			'</div> <!--card-->';


		var text = '<ul class="record">';
		statisticsObj.hits += 1;
        	
		jQuery.each(hit.matches, function(indx, match) {
			text += "<li><span>" + match.fieldLabel + "</span>";
			text += "<pre><code>";
			jQuery.each(match.lineMatches, function(ix, fieldMatch) {
                if(fieldMatch.escaped.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1) {
					statisticsObj.lines += 1;
					var fieldMatchHighlighted = fieldMatch.escaped.replace(new RegExp(searchTerm, 'gi'), function(m) { return '<strong>' + m + '</strong>'});
                    text += "Line: " + fieldMatch.line + " " + fieldMatchHighlighted + "\n";
                }
			});
			text += "</code></pre></li>";
		});
		text += "</ul>";
		
		tableAccordion += recordHeader + text + recordFooter;
	});
	
	tableAccordion += "</div>";
    
    return header + tableAccordion + footer;

}