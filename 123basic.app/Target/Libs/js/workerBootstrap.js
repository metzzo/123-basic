if (self !== undefined && !self.document) {
	window = self;
	localStorage = null;
	document = null;
	isInWebWorker = true;
	viewMode = "console";
} else {
	isInWebWorker = false;
}