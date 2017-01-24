/*
reads AssetCryptImpl files and return struct with Titanium file names and source codes.
*/
var fs = require('fs');
var lineReader = require('line-reader');
var java = require('java');
java.classpath.push('java/commons-lang-2.6.jar');

var resp = {};
var meta = {};
var classes = {
	charset 	: 	java.import('java.nio.charset.Charset'),
	integer 	: 	java.import('java.lang.Integer'),
	string 		: 	java.import('java.lang.String'),
	escapeu 	: 	java.import('org.apache.commons.lang.StringEscapeUtils'),
	charbuf 	: 	java.import('java.nio.CharBuffer')
};

var init = function(config, onReady) {
	// read AssetCryptImpl.smali (for ranges)
	// get bytes from smali
	var bytesC = { start:false, bufferlen:0, charbuf:'', line:'', array:[] };
	var count = 0;
	lineReader.eachLine('test/AssetCryptImpl.smali', function(line, last){
		bytesC.line = line;
		if (line.indexOf('private static initAssetsBytes()Ljava/nio/CharBuffer')!=-1) {
			bytesC.start = true;
		} else if (bytesC.start && line.indexOf('const v0, ')!=-1) {
			// titanium < v5
			bytesC.line = line.split('const v0, ').join('').trim();
			bytesC.bufferlen = classes.integer.decodeSync(bytesC.line);
			bytesC.charbuf = classes.charbuf.allocateSync(bytesC.bufferlen);
		} else if (bytesC.start && line.indexOf('const/16 v0, ')!=-1) {
			// titanium v5.x +
			bytesC.line = line.split('const/16 v0, ').join('').trim();
			bytesC.bufferlen = classes.integer.decodeSync(bytesC.line);
			bytesC.charbuf = classes.charbuf.allocateSync(bytesC.bufferlen);
		} else if (bytesC.start && line.indexOf('const-string v1')!=-1) {
			// content
			bytesC.line = line.split('const-string v1, "').join('').trim();
			bytesC.line = bytesC.line.slice(0,-1); // remove last " char
			bytesC.line = classes.escapeu.unescapeJavaSync(bytesC.line);
			bytesC.charbuf.append(bytesC.line);
		} else if (line.indexOf('rewind()Ljava/nio/Buffer;')!=-1) {
			bytesC.charbuf.rewind();
			console.log('decoding bytes ... takes some time');
			bytesC.assetBytes = classes.charset.forNameSync('ISO-8859-1').encodeSync(bytesC.charbuf).arraySync();
			//read file byte ranges from AssetCryptImpl.java
			var passed_maps = false;
			console.log('extracting file ranges ...');
			meta.totalBytes = 0;
			lineReader.eachLine('test/AssetCryptImpl.java', function(line2, last2) {
				var tmp = {};
				if (line2.indexOf('hashmap.put')!=-1) {
					tmp.file = line2.split(',')[0].split('hashmap.put(').join('').split('"').join('').trim();
					tmp.offset = line2.split(',')[1].split('new Range(').join('').trim();
					tmp.length = line2.split(',')[2].split('));').join('').trim();
					resp[tmp.file] = {
						offset 	: 	classes.integer.decodeSync(tmp.offset),
						bytes 	: 	classes.integer.decodeSync(tmp.length)
					};
					meta.totalBytes += resp[tmp.file].bytes;
					passed_maps = true;
				} else {
					if (passed_maps) {
						onReady(bytesC, resp);
						return false;
					}
				}
			});
			
		}
	});
	//bytesC.array = classes.charset.forName('ISO-8859-1'); //.encode(bytesC.charbuf).array();
	//onReady(bytesC);
	/*
	var reply = {};
	fs.readFile('test/AssetCryptImpl.java','utf8', function(err, data1) {
		if (err) throw err;
		reply.java = data1;
		fs.readFile('test/AssetCryptImpl.smali','utf8', function(err2, data2) {
			if (err2) throw err2;
			reply.smali = data2;
			onReady(reply);
		});
	});
	// read AssetCryptImpl.java (for content)
	*/
};

var unpack = function(SmaliBytes) {

};

var filterDataInRange = function(bytes, offset, length) {

};

init({}, function(info, full) {
	//console.log(info);
	console.log(full);
	console.log(meta);
});