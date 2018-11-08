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

	var resultHtml = '';
	for (var i=0; i<result.length; i++) {
		resultHtml += generateHtmlForCodeSearchEntry(result[i], url, searchTerm, statisticsObj);
	}
	
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

	var header = '<h3>' + data.tableLabel + ' [<a href="' + url + '/' + data.recordType + '_list.do" target="_blank">' + data.recordType + '</a>]</h3><br /><br />';
	var result_body = "<div><p> Found <strong>" + data.hits.length + "</strong> records matching query.</p></div>";
	result_body += "<div>";
	
	statisticsObj.tables += 1;
	jQuery.each(data.hits, function(idx, hit) {
		var result_desc = '<p>Record <a href="' + url + '/' + data.recordType + '.do?sys_id=' + hit.sysId + '" target="_blank">' + hit.name + "</a> has <strong>" + hit.matches.length + "</strong> matching fields.</p>";
		var text = "<ul>";
		statisticsObj.hits += 1;
        	
		jQuery.each(hit.matches, function(indx, match) {
			text += "<li><p>" + match.fieldLabel + "</p>";
			text += "<pre>";
			jQuery.each(match.lineMatches, function(ix, fieldMatch) {
                if(fieldMatch.escaped.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1) {
					statisticsObj.lines += 1;
                    text += "Line: " + fieldMatch.line + " " + fieldMatch.escaped + "\n";
                }
			});
			text += "</pre></li>";
		});
		text += "</ul>";
		
		result_body += result_desc + text;
	});
	
	result_body += "</div>";
    
    return header + result_body;

}