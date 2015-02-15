if (self !== undefined) {
	window = self;
	localStorage = null;
	document = null;
	isInWebWorker = true;
	viewMode = "console";
} else {
	isInWebWorker = false;
}