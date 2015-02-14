if (self !== undefined) {
	window = {};
	localStorage = null;
	document = null;
	isInWebWorker = true;
} else {
	isInWebWorker = false;
}