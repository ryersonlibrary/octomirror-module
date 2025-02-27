/* global Module */

/* Magic Mirror
 * Module: OctoMirror-Module
 *
 * By Kieran Ramnarine
 * MIT Licensed.
 */

Module.register("octomirror-module", {
	defaults: {
		updateInterval: 60 * 1000,
		retryDelay: 2500,
		initialLoadDelay: 2500,
	},
	
	//Override dom generator.
	getDom: function() {
		var self = this;
		var wrapper = document.createElement("div");
		var stream = document.createElement("img");
		stream.src = this.config.url + ":8080/?action=stream";
		var fileMenu = document.createElement("div");
		var fileList = document.createElement("select");
		for (var f in this.files) {
			var option = document.createElement("option");
			option.setAttribute("value", this.files[f]);
			option.appendChild(document.createTextNode(this.files[f]));
			fileList.appendChild(option);
		}
		var printButton = document.createElement("button");
		printButton.appendChild(document.createTextNode("Send to Printer"));
		printButton.addEventListener("click", function() {
			self.sendPrint(fileList.value);
		});
		var fileUpload = document.createElement("div");
		var uploadFileInput = document.createElement("input");
		uploadFileInput.setAttribute("type", "file");
		var uploadButton = document.createElement("button");
		uploadButton.appendChild(document.createTextNode("Upload Files"));
		uploadButton.addEventListener("click", function () {
			self.uploadFile(uploadFileInput.value);
		});
		fileUpload.appendChild(uploadFileInput);
		fileUpload.appendChild(uploadButton);
		fileMenu.appendChild(fileList);
		fileMenu.appendChild(printButton);
		fileMenu.appendChild(fileUpload);
		wrapper.appendChild(stream);
		wrapper.appendChild(document.createElement("br"));
		wrapper.appendChild(fileMenu);
		return wrapper;
		
	},
	
	start: function(){
		Log.info("Starting module: " + this.name);
		this.files = [];
		this.loaded = false; 
		this.scheduleUpdate(this.config.initialLoadDelay);
		this.updateTimer = null;
	},
	
	getHeader: function() {
		return 'Octoprint!';
	},
	
	processFiles: function(data) {
		this.files = [];
		for(var x in data.files){
			this.files.push(data.files[x].name);
		}
		this.show(this.config.animationSpeed, {lockString: this.identifier});
		this.loaded = true;
		this.updateDom(this.config.animationSpeed);
	},
	
	scheduleUpdate: function(delay) {
		var nextLoad = this.config.updateInterval;
		if (typeof delay !== "undefined" && delay >= 0) {
			nextLoad = delay;
		}

		var self = this;
		clearTimeout(this.updateTimer);
		this.updateTimer = setTimeout(function() {
			self.updateFiles();
		}, nextLoad);
	},
	
	updateFiles: function() {
		var self = this;
		var retry = true;
		var fileRequest = new XMLHttpRequest();
		fileRequest.open("GET", this.config.url + "/api/files?recursive=true", true);
		fileRequest.setRequestHeader("x-api-key", this.config.api_key);
		fileRequest.onreadystatechange = function() {
			if(this.readyState == 4 && this.status == 200){
				self.processFiles(JSON.parse(this.responseText));
			}
			if(retry){
				self.scheduleUpdate((self.loaded) ? -1 : self.config.retryDelay);
			}
		}
		fileRequest.send();
		
	},
	
	sendPrint: function(filename){
		var data = JSON.stringify({
			"command": "select",
			"print": true
		});
		var printRequest = new XMLHttpRequest();
		printRequest.open("POST", this.config.url + "/api/files/local/" + filename, true);
		printRequest.setRequestHeader("x-api-key", this.config.api_key);
		printRequest.setRequestHeader("content-type", "application/json");
		printRequest.send(data);  
	},
	
	uploadFile: function (file) {
		var self = this;
		var data = new FormData();
		data.append("file", file);
		var uploadRequest = new XMLHttpRequest();
		uploadRequest.onreadystatechange = function() {
				if (this.readState == 4 && this.status == 200){
					self.updateFiles();
			}
		}
		uploadRequest.open("POST", this.config.url + "/api/files/local", true);
		uploadRequest.setRequestHeader("x-api-key", this.config.api_key);
		uploadRequest.setRequestHeader("content-type", "multipart/form-data");
		uploadRequest.send();
	}
});
