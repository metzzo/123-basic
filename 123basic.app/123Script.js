if (self !== undefined && !self.document) {
	window = self;
	localStorage = null;
	document = null;
	isInWebWorker = true;
	viewMode = "console";
} else {
	isInWebWorker = false;
}
if (typeof preInitFuncs == 'undefined') preInitFuncs = [];
preInitFuncs.push(function() {
	if (viewMode == 'console') {
		if (document) {
			window.onload=function( e ){
				var e = document.createElement('textarea');
				e.style.width = '100%';
				e.style.height = '480px';
				e.id = "OTTCONSOLE";
				
				document.body.appendChild(e);
				
				updateConsole();
			}
		} else {
			//egal, rufe updateconsole auf
			updateConsole();
		}
	}
});

var startTime = new Date().getTime();

/**
* @constructor
*/
function OTTException(text, file, line) {
	this.text = text;
	this.line = line;
	this.file = file;
}

/**
* @constructor
*/
function OTTExitException() {
	//exit
}

OTTExitException.prototype.toString = function() {
	return "OTT Exit";
}

OTTException.prototype.toString = function() {
	return "Unhandled exception '"+text+"' in file '"+this.file+"' in line'"+this.line+"'";
}

OTTException.prototype.getText = function() {
	return this.text;
}

OTTException.prototype.toString = function() {
	return "Uncaught 123Basic Exception '"+this.text+"' stacktrace: "+STACKTRACE_Str();
}

//alert = function() {}

//------------------------------------------------------------
//Funny variables
//------------------------------------------------------------

var waitload			= 0; //auf wieviel wird gewartet (gibts auch in 2d.js) 
var exec 				= false;
var tmpPositionCache 	= -1; 
var arrargs				= new Array(64); //Die Parameter (in umgeandelter form), 64 maximal
var consoleOutput;
var consoleSize 		= 10000;
var currentDir;
var mainCall			= false;

//------------------------------------------------------------
//Output
//------------------------------------------------------------

function STDOUT(text) {
	if (consoleOutput == undefined) {
		consoleOutput = document ? document.getElementById("OTTCONSOLE") : null;
	}
	
	if (consoleOutput) {
		consoleOutput.value = consoleOutput.value + text;
		consoleOutput.scrollTop = consoleOutput.scrollHeight;
	} else {
		console.log(text);
	}
}


function STDERR(text) {
	STDOUT("Error: "+text);
}

function STDCOLOR(back, fore) {
	//ignore :)
}

function DEBUG(text) {
	console.log(text);
}

function END() {
	window.onbeforeunload();
	throw new OTTExitException();
}


//------------------------------------------------------------
//Info Stuff
//------------------------------------------------------------
var $time = Date.now || function() {
  return +new Date;
};
function GETTIMERALL() {
	return $time() - startTime;
}

function PLATFORMINFO_Str(info) {
	switch(info) {
		case "":
			return "HTML5";
		case "DOCUMENTS":
		case "APPDATA":
		case "TEMP":
			return "/";
		case "ID":
			return ""+uniqueId;
		case "DEVICE":
			//TODO: Andere Devices berÃ¼cksichtigen
			return "DESKTOP";
		case "BATTERY":
			var bat = navigator.battery || window.navigator.battery || navigator.battery || navigator.mozBattery || navigator.webkitBattery;
			return bat ? bat.level*100 : 100;
		case "TIME":
			var d = new Date();
			var f = function(val) {
				val = CAST2STRING(val);
				if (val.length == 1) val = "0" + val;
				return val;
			}
			return f(d.getFullYear())+"-"+f(d.getMonth())+"-"+f(d.getDate())+" "+f(d.getHours())+":"+f(d.getMinutes())+":"+f(d.getSeconds());
		case "COMPILED":
			return rot13(compileTime);
		case "VERSION":
			return rot13(userDefVersion);
		case "HOSTID":
			return rot13(hostId);
		case "LOCALE":
			return navigator.language || window.navigator.userLanguage || window.navigator.language;
		default:
			if (info.length > "GLEXT:".length && MID_Str(info, 0, "GLEXT:".length) == "GLEXT:") {
				return "0"; //vorerst nichts
			} else {
				return "";
			}
	}
}


function GETLASTERROR_Str() {
	return "0 Successfull";
}

//wait und show wird ignoriert
function SHELLCMD(cmd, wait, show, rv) {
	try {
		rv[0] = CAST2FLOAT(eval(cmd));
	} catch(ex) {
		rv[0] = 0
		rv[0] = 0
		throwError("SHELLCMD raised ab error.");
	}
}

function SHELLEND(cmd) {
	try {
		eval(cmd);
	} catch(ex) {
		throwError("SHELLEND raised an error");
	}
	END();
}

function CALLBYNAME(name) {
	if (!!window[name]) {
		window[name]();
		return 1;
	} else {
		return 0;
	}
}

//------------------------------------------------------------
//Runtime stuff
//------------------------------------------------------------

var callStack = []
/**
* @constructor
*/
function StackFrame(name, info, dbg) {
	this.apply(name, info, dbg);
}
StackFrame.prototype.apply = function(name, info, dbg) {
	this.name = name;
	this.info = info;
	this.dbg  = dbg;
}

function stackPush(name, info) {
	if (!!callStack[callStack.length]) {
		callStack[callStack.length].apply(name, info, __debugInfo);
		callStack.length++;
	} else {
		callStack.push(new StackFrame(name, info, __debugInfo));
	}
}

function stackPop() {
	__debugInfo = callStack[callStack.length];
	callStack.length--; 
}

function stackTrace() {
	var output = "";
	for (var i = callStack.length-1; i >= 0 ; i--) {
		output += "\tin '"+callStack[i].name+"' in file '"+MID_Str(callStack[i].info, INSTR(callStack[i].info, ":")+1)+"' in line '"+MID_Str(callStack[i].info, 0, INSTR(callStack[i].info, ":"))+"'\n";
	}
	
	return output;
}

function throwError(msg) {
	throw msg;
}

function formatError(msg) {
	msg = msg.message ? msg.message : msg.toString();
	if (msg.indexOf("OTTERR") == 0) msg = msg.substring("OTTERR".length);
	if (debugMode) {
		msg = "Error:\n '"+msg+"' ";
		var info = __debugInfo;
		//debug modus
		msg += "\nAppeared in line '"+MID_Str(info, 0, INSTR(info, ":"))+"' in file '"+MID_Str(info, INSTR(info, ":")+1)+"' "
		
		msg += "\n\n"+stackTrace();
	}
	return msg;
}

function dumpArray(arr) {
	var acc = "";
	var start = false;
	for (var i = 0; i < arr.length; i++) {
		if (start) acc += ", "
		acc += "'"+arr[i]+"'";
		start = true;
	}
	return "["+acc+"]";
}

function toCheck(cur, to, step) {
	if (step > 0) {
		return cur <= to;
	} else if(step < 0) {
		return cur >= to;
	} else {
		return cur !== to;
	}
	//return (step > 0) ? (cur <= to) : ((step > 0) ? (cur >= to) : true);
}

function untilCheck(cur, to, step) {
	if (step > 0) {
		return cur < to;
	} else if(step < 0) {
		return cur > to;
	} else {
		return cur !== to;
	}
}

function isKnownException(ex) {
	return ex instanceof OTTExitException || ex instanceof OTTException;
}

//versucht zu dereferenzieren falls notwendig
function unref(v) {
	if (v instanceof Array) {
		//damn i have to unref it
		return v[0];
	} else {
		//nothing to do here bro...
		return v;
	}
}

//versucht zu referenzieren falls notwendig
function ref(v) {
	if (v instanceof Array) {
		return v;
	} else {
		return [v];
	}
}


function tryClone(o) {
	switch (typeof o) {
		case 'undefined':
		case 'function':
		case 'string':
		case 'boolean':
		case 'number':
			break;
		default:
			if (o instanceof Array) {
				return [tryClone(o[0])];
			} else {
				return o.clone();
			}
	}
	return o;
	//return (o instanceof Array) ? ([tryClone(o[0])]) : (o.clone ? o.clone() : o);
}

function updateConsole() {
	try {
		if (initStatics !== undefined) initStatics();
		
		if (!mainCall) {
			main();
			mainCall = true;
		}
		
		if (!waitload && !exec) {
			exec = true;

			if (typeof(GLB_ON_INIT) == 'function') GLB_ON_INIT(); //call the 123basic defined initialization function
		} else {
			window.requestAnimFrame(updateConsole, 100);
		}
	} catch(ex) {
		if (ex instanceof OTTExitException) throw(formatError(ex));
	}
}

function castobj(obj, target) {
	if (obj instanceof Array) {
		if (obj[0] instanceof target)
			return obj;
		else
			return [eval("new "+target+"()")];
	} else {
		if (obj instanceof target)
			return obj;
		else
			return eval("new "+target+"()");
	}
	
}


//------------------------------------------------------------
//DATA
//------------------------------------------------------------


var dataLabel, dataPosition;
function RESTORE(label) {
	dataLabel = label;
	dataPosition = 0;
}

function READ() {
	var d = dataLabel[dataPosition];
	dataPosition++;
	return d;
}



//Castet die gegebene Value in eine Ganzzahl (falls NaN kommt => 0 returnen)
function CAST2INT(value) {
	if (value.constructor === Array) { //not sure about this
		return [CAST2INT(value[0])];
	} else {
		switch (typeof value) {
			case 'function':
				return 1;
			case 'undefined':
				throwError("Cannot cast 'undefined'");
			case 'number':
				return ~~value; //experimental
			case 'string':
				if (isNaN(value) || value == '') 
					return 0; //Falls keine Nummer => 0
				else
					return parseInt(value, 10);
			case 'boolean':
				return value ? 1 : 0;
			case 'object':
				return CAST2INT(value.toString());
			default:
				throwError("Unknown type!");
		}
	}
}

function INT2STR(value) {
	if (isNaN(value) || value == '') 
		return 0; //Falls keine Nummer => 0
	else
		return parseInt(value, 10);
}

function INTEGER(value) {
	return CAST2INT(value);
}

//Castet die gegebene Value in eine Gleitkommazahl (falls NaN kommt => 0 returnen)
function CAST2FLOAT(value) {
	if (value instanceof Array) { //not sure about this
		return [CAST2FLOAT(value[0])];
	} else {
		switch (typeof value) {
			case 'function':
				return 1.0;
			case 'undefined':
				throwError("Cannot cast 'undefined'");
			case 'number':
				return value;
			case 'string':
				if (isNaN(value) || value == '') 
					return 0.0; //Falls keine Nummer => nummer machen
				else //Ist eine Nummer
					return parseFloat(value);
			case 'boolean':
				return value ? 1.0 : 0.0;
			case 'object':
				return CAST2FLOAT(value.toString());
			default:
				throwError("Unknown type!");
		}
	}
}

function FLOAT2STR(value) {
	if (isNaN(value) || value == '') 
		return 0.0; //Falls keine Nummer => nummer machen
	else //Ist eine Nummer
		return parseFloat(value);
}

function STACKTRACE_Str() {
	return stackTrace();
}


//Castet die gegebene Value in eine Zeichenkette
function CAST2STRING(value) {
	if (value instanceof Array) { //not sure about this
		return [CAST2STRING(value[0])];
	} else {
		switch (typeof value) {
			case 'function':
				return "1";
			case 'undefined':
				throwError("Cannot cast undefined to string");
			case 'boolean':
				return value ? "1" : "0";
			case 'number':
				return ""+value;
			case 'string':
				return value;
			case 'object':
				return value.toString();
			default:
				throwError("Unknown type");
		}
	}
}



function PUTENV(name, value) {
	localStorage.setItem(("env_"+name).toLowerCase(), value);
}

function GETENV_Str(name) {
	return localStorage.getItem(("env_"+name).toLowerCase());
}


function SLEEP(time) {
	var start = GETTIMERALL();
	while ((GETTIMERALL() - start)<time) {} //Ã¼bler hack :/
}




//-----------------------------------------------------------
//LocalStorage wrapper to cookies (if there is no localStorage) Found on the MDN
//-----------------------------------------------------------

if (!window.localStorage && !isInWebWorker) {
  Object.defineProperty(window, "localStorage", new (function () {
    var aKeys = [], oStorage = {};
    Object.defineProperty(oStorage, "getItem", {
      value: function (sKey) { return sKey ? this[sKey] : null; },
      writable: false,
      configurable: false,
      enumerable: false
    });
    Object.defineProperty(oStorage, "key", {
      value: function (nKeyId) { return aKeys[nKeyId]; },
      writable: false,
      configurable: false,
      enumerable: false
    });
    Object.defineProperty(oStorage, "setItem", {
      value: function (sKey, sValue) {
        if(!sKey) { return; }
        document.cookie = escape(sKey) + "=" + escape(sValue) + "; path=/";
      },
      writable: false,
      configurable: false,
      enumerable: false
    });
    Object.defineProperty(oStorage, "length", {
      get: function () { return aKeys.length; },
      configurable: false,
      enumerable: false
    });
    Object.defineProperty(oStorage, "removeItem", {
      value: function (sKey) {
        if(!sKey) { return; }
        var sExpDate = new Date();
        sExpDate.setDate(sExpDate.getDate() - 1);
        document.cookie = escape(sKey) + "=; expires=" + sExpDate.toGMTString() + "; path=/";
      },
      writable: false,
      configurable: false,
      enumerable: false
    });
    this.get = function () {
      var iThisIndx;
      for (var sKey in oStorage) {
        iThisIndx = aKeys.indexOf(sKey);
        if (iThisIndx === -1) { oStorage.setItem(sKey, oStorage[sKey]); }
        else { aKeys.splice(iThisIndx, 1); }
        delete oStorage[sKey];
      }
      for (/*aKeys*/; aKeys.length > 0; aKeys.splice(0, 1)) { 
		oStorage.removeItem(aKeys[0]);
	  }
      for (var iCouple, iKey, iCouplId = 0, aCouples = document.cookie.split(/\s*;\s*/); iCouplId < aCouples.length; iCouplId++) {
        iCouple = aCouples[iCouplId].split(/\s*=\s*/);
        if (iCouple.length > 1) {
          oStorage[iKey = unescape(iCouple[0])] = unescape(iCouple[1]);
          aKeys.push(iKey);
        }
      }
      return oStorage;
    };
    this.configurable = false;
    this.enumerable = true;
  })());
}

//-----------------------------------------------------------
//Misc
//-----------------------------------------------------------

function NETWEBEND(url) {
	window.location.href = url;
	END();
}


window.requestAnimFrame = (function() {
  return window.requestAnimationFrame ||
         window.webkitRequestAnimationFrame ||
         window.mozRequestAnimationFrame ||
         window.oRequestAnimationFrame ||
         window.msRequestAnimationFrame ||
         function(/* function FrameRequestCallback */ callback, /* DOMElement Element */ element) {
           window.setTimeout(callback, 1000/60);
         };
})();

function checkBrowserName(name){  
	var agent = navigator.userAgent.toLowerCase();  
	if (agent.indexOf(name.toLowerCase())>-1) {  
		return true;  
	}  
	return false;  
}  

window.onbeforeunload = function (e) {
	e = e || window.event;
	
	//rufe noch GLB_ON_QUIT auf
	CALLBYNAME("GLB_ON_QUIT");
	
	//versuche nun das filesystem zu speichern
	saveFileSystem();
};

function saveFileSystem() {
	if (localStorage) {
		localStorage.setItem("filesystem", fileSystem.save());
	}
}

//------------------------------------------------------------
//ARRAY FUN
//------------------------------------------------------------

/**
* Ein OTTArray ist ein Array, welches versucht die OTTArrays unter GLBasic so gut wie möglich zu simulieren.
* @constructor
*/
function OTTArray(def) {
	this.values = [];
	this.dimensions = [0];
	this.defval = !!def ? def : 0;
	this.succ = null;
}

function tryBridge(o, isJSON) {
	switch (typeof o) {
		case 'undefined':
		case 'function':
		case 'string':
		case 'boolean':
		case 'number':
			break;
		default:
			if (o instanceof Array) {
				return [tryBridge(o[0]), isJSON];
			} else {
				return o.bridgeToJS(isJSON);
			}
	}
	return o;
}

// bridges to JS (= making it useable in JS without special knowledge)
OTTArray.prototype.bridgeToJS= function(isJSON) {
	var array = [];
	for (var i = 0; i < this.values.length; i++) {
		var val = tryBridge(this.values[i], isJSON);
		array.push(val);
	}
	return array;
}

//Klonen!
OTTArray.prototype.clone = function() {
	var other = pool_array.alloc(this.defval);
	
	other.dimensions = this.dimensions.slice(0);
	other.defval = this.defval;
	
	//Klonen die drinnen sind!
	switch (typeof this.defval) {
		case 'number':
		case 'string':
		case 'boolean':
		case 'function':
			other.values = this.values.slice(0);
			break;
		default:
			//es muss geklont werden
			if (this.values !== undefined) {
				for (var i = 0; i < this.values.length; i++) {
					other.values[i] = tryClone(this.values[i]);
				}
			} else {
				other.values = [];
			}
	}
	
	return other;
};

//Zugriff!
OTTArray.prototype.arrAccess = function() {
	if (arguments.length === 1) {
		var dim0 = this.dimensions[0];
		var position = arguments[0];
		if (position < 0) position = (dim0 + position);
		if (position < 0 || position >= dim0) throwError("Array index out of bounds access, position: "+dumpArray(arguments));
		tmpPositionCache = position;
	} else if (arguments.length === 2) {
		var dim0 = this.dimensions[0], dim1 = this.dimensions[1];
		var position1 = arguments[0];
		if (position1 < 0) position1 = (dim0 + position1);
		if (position1 < 0 || position1 >= dim0) throwError("Array index out of bounds access, position: "+dumpArray(arguments));
		
		var position2 = arguments[1];
		if (position2 < 0) position2 = (dim1 + position2);
		if (position2 < 0 || position2 >= dim1) throwError("Array index out of bounds access, position: "+dumpArray(arguments));
		
		tmpPositionCache = position1 + position2*dim0;
	} else {
		tmpPositionCache = 0;
		for (var i = arguments.length-1; i >= 0 ; i--) {
			if (i >= this.dimensions.length) throwError("Wrong dimension count '"+(arguments.length-1)+"' expected '"+this.dimensions.length+"'");
			
			var position = arguments[i]; //CAST2INT( normalerweise sollten access automatisch nach INT gecastet worden sein!
			
			if (position < 0) position = (this.dimensions[i] + position);
			
			if (position < 0 || position >= this.dimensions[i]) throwError("Array index out of bounds access, position: "+dumpArray(arguments));
			
			arrargs[i] = position;
		}
		
		
		switch (arguments.length) {
			case 3:
				tmpPositionCache = arrargs[0] + arrargs[1]*this.dimensions[0] + arrargs[2]*this.dimensions[0]*this.dimensions[1] 
				break;
			case 4:
				tmpPositionCache = arrargs[0] + arrargs[1]*this.dimensions[0] + arrargs[2]*this.dimensions[0]*this.dimensions[1] + arrargs[3]*this.dimensions[0]*this.dimensions[1]*this.dimensions[2];
				break;
			default:
				var mul = this.values.length/this.dimensions[arguments.length-1];
				for (var i = arguments.length-1; i >= 0 ; i--) {
					tmpPositionCache += arrargs[i]*mul;
					mul /= this.dimensions[i-1];
				}
		}
	}
	
	return this;
}

function realArrSize(dims) {
	var realSize = 1;
	for(d in dims) {
		dims[d] = ~~dims[d];
		realSize *= dims[d];
	}
	return realSize;
}

//Dimensioniert das gegebene Array
function DIM(vari, dims, value) {
	vari.values = new Array(realArrSize(dims)); //[];//vari.values.length = realArrSize(dims);
	vari.dimensions = dims;
	vari.defval = value;
	
	
	for(var i = 0; i < vari.values.length; i++) {
		vari.values[i] = tryClone(value);
	}
	
	
	return vari;
}
//Redimensioniert das gegebene Array.
function REDIM(vari, dims, value) {
	var oldLength = vari.values.length;
	var doDim = false, action;
	var oldDim = vari.dimensions;
	
	if (!oldDim || oldDim.length !== vari.dimensions.length) {
		doDim = true;
	}
	
	if (vari.defval !== value) {
		doDim = true;
		if (value instanceof Array && !(vari.defval instanceof Array)) {
			//Es muss ein Array sein
			action = 1
		} else if (!(value instanceof Array) && vari.defval instanceof Array) {
			//Es darf kein Array sein
			action = 2
		} else {
			action = 0 //nichts
		}
	}
	vari.defval = value;
	
	if (doDim || vari.dimensions.length === 1) {
		vari.dimensions = dims;
		vari.values.length = realArrSize(dims);
		
		for(var i = doDim ? 0 : oldLength; i < vari.values.length; i++) {
			if (vari.values[i]) {
				if (action === 1) {
					//Es muss ein Array sein
					vari.values[i] = [vari.values[i]];
				} else if (action === 2) {
					//Es darf kein Array sein
					vari.values[i] = vari.values[i][0];
				}
			} else {
				//default wert geben
				vari.values[i] = tryClone(vari.defval);
			}
		}
	} else {
		// reposition stuff
		var newOTTArray = new OTTArray(vari.defval);
		DIM(newOTTArray, dims, vari.defval);
		
		var positionArray = new Array(oldDim.length);
		for (var i = 0; i < positionArray.length; i++) { positionArray[i] = 0; }
		
		for (var i = 0; i < oldLength; i++) {
			// copy value
			var value = vari.arrAccess.apply(vari, positionArray).values[tmpPositionCache];
			
			if (action === 1) {
				//Es muss ein Array sein
				value = [value];
			} else if (action === 2) {
				//Es darf kein Array sein
				value = value[0];
			}
			
			// set value
			try { // this should NOT be done with exception handling... VERY slow TODO
				newOTTArray.arrAccess.apply(newOTTArray, positionArray).values[tmpPositionCache] = value;
			} catch(e) { }
			
			positionArray[0]++;
			var overflow, j = 0;
			do {
				overflow = false;
				if (positionArray[j] >= oldDim[j]) {
					positionArray[j] = 0;
					positionArray[j + 1]++;
					overflow = true;
					j++;
				}
			} while(overflow);
		}
		
		vari.values = newOTTArray.values;
		vari.dimensions = dims;
	}
	
	
	return vari;
}

function BOUNDS(array, dimension) {
	return array.dimensions[dimension];
}

function DIMPUSH(array, value) {
	//OBACHT bei Mehrdimensionalen Arrays
	REDIM(array, [array.values.length+1], array.defval);
	array.values[array.values.length-1] = tryClone(value);
}

function DIMDEL(array, position) {
	if (array.defval.pool !== undefined) { // add to object pool if possible
		var val = array.values[position];
		val.pool.free(val);
	}
	
	array.values.splice(position, 1);
	array.dimensions[0]--;
}

function DIMDATA(array, values) {
	array.values = values;
	array.dimensions = [values.length];
}

var array_pools = { };

var pool_array = {
	alloc: function(defval) {
		if (defval.constructor === Array) return new OTTArray(defval);
		
		var typ = defval.getTypeName !== undefined ? defval.getTypeName() : typeof defval;
		var obj = array_pools[typ];
		if (obj !== undefined && obj !== null) {
			array_pools[typ] = obj.succ;
			obj.succ = null;
		} else {
			obj = new OTTArray(defval);
		}
		return obj;
	},
	free: function(obj) {
		if (obj.succ !== null || obj.constructor === Array) return;
		var typ = obj.getTypeName !== undefined ? obj.getTypeName() : typeof obj;
		if (array_pools[typ] === undefined) {
			array_pools[typ] = null;
		}
		obj.succ = array_pools[typ];
		array_pools[typ] = obj;
	}
};

//------------------------------------------------------------
//MATH
//------------------------------------------------------------

function SEEDRND(seed) {
	randomseed = seed;
}


function RND(range) {
    if (range == 0) return 0;
	if (range < 0) range = -range;
    //return MAX((Math.random()+.1)*range, range);
	return ~~((range+1) * random());
}

function MIN(a,b) {
	if (a < b) return a; else return b;
}

function MAX(a, b) {
	if (a > b) return a; else return b;
}

function ABS(a) {
	return Math.abs(a);
}

function SGN(a) {
	return a > 0 ? 1 : (a < 0 ? -1 : 0);
}

function SIN(a) {
	return Math.sin(deg2rad(a));
}

function COS(a) {
	return Math.cos(deg2rad(a));
}

function TAN(a) {
	return Math.tan(deg2rad(a));
}

function ACOS(a) {
	return Math.acos(deg2rad(a));
}

function ASIN(a) {
	return Math.asin(deg2rad(a));
}

function ASL(num, shift) {
	return num << shift;
}

function ASR(num, shift) {
	return num >> shift;
}

function ATAN(dy, dx) {
	return rad2deg(Math.atan2(dy, dx));
}

function bAND(a, b) {
	return a & b;
}

function bOR(a, b) {
	return a | b;
}

function bXOR(a, b) {
	return a ^ b;
}

function bNOT(a) {
	return ~a;
}

function MOD(a, b) {
	return CAST2INT(a%b);
}

function FMOD(num, div) {
	return num%div;
}

function FINDPATH(map, result, heu, startx, starty, endx, endy) {
	alert("TODO: findpath");
}

function LOGN(a) {
	return Math.log(a);
}

function POW(a, b) {
	return Math.pow(a, b);
}

function SQR(a) {
	return Math.sqrt(a);
}

function SWAP(a, b) {
	var tmp = a;
	a[0] = b[0];
	b[0] = tmp[0];
}

function SORTARRAY(array, cmp) {
	var cmpFunc;
	if (cmp == 0) {
		cmpFunc = function(a, b) {
			a = unref(a);
			b = unref(b);
			switch (typeof o) {
				case 'undefined':
				case 'function':
				case 'string':
				case 'boolean':
				case 'number':
					return a < b ? -1 : (a > b ? 1 : 0)
				default:
					return 0;
			}
		}
	} else {
		cmpFunc = function(a, b) {
			return cmp([a], [b]);
		}
	}
	array.values.sort(cmpFunc);
}

function deg2rad(val) {
	return (val*(Math.PI/180));
}

function rad2deg(val) {
	return (val*(180/Math.PI));
}

var randomseed = new Date().getTime();
function random() {
	randomseed = (randomseed*9301+49297) % 233280;
	return randomseed/(233280.0);
}

//------------------------------------------------------------
//String:
//------------------------------------------------------------

function strcmp(a, b) {
	return ( a < b ? -1 : ( a > b ? 1 : 0)); 
}

function FORMAT_Str(numLetter, numKommas, Number) {
	var str = CAST2STRING(Number);
	var l = INSTR(str, ".");
	var r = REVINSTR(str, ".");
	
	//wenn länger als erwartet
	for(var i = l; i < numLetter; i++) {
		str = " " + str;
	}
	for(var i = r; i < numKommas; i++) {
		str = str + "0";
	}
	
	//wenn kürzer als erwartet
	for (var i = numLetter; i < l; i++) {
		str = MID_Str(str, 1);
	}
	for (var i = numKommas; i < r; i++) {
		str = MID_Str(str, 0, str.length-1);
	}
	
	return str;
}

function ENCRYPT_Str(code, text) {
	var add = 0;
	for (i = 0; i < code.length; i++) {
		add += ASC(code, i);
	}
	add = add %  16;
	
	var newText = "";
	for (i = 0; i < text.length; i++) {
		newText = newText + CHR_Str(ASC(text, i)+add);
	}
	return newText;
}

function DECRYPT_Str(code, text) {
	var add = 0;
	for (i = 0; i < code.length; i++) {
		add += ASC(code, i);
	}
	add = add % 16;
	
	var newText = "";
	for (i = 0; i < text.length; i++) {
		newText = newText + CHR_Str(ASC(text, i)-add);
	}
	return newText;
}

function LCASE_Str(str) {
	return str.toLowerCase();
}

function UCASE_Str(str) {
	return str.toUpperCase();
}

function MID_Str(str, start, count) {
	try {
		if (count == 1) {
			return str.charAt(start);
		} else {
			if (count == -1)
				return str.substr(start);
			else
				return str.substr(start, count);
		}
	} catch (ex) {
		throwError("string error (MID$): '"+str+"' start: '"+start+"' count: '"+count+"'");
	}
}

function LEFT_Str(str, count) {
	try {
		return str.substr(0, count);
	} catch(ex) {
		throwError("string error (LEFT$): '"+str+"' count: '"+count+"'");
	}
}

function RIGHT_Str(str, count) {
	try {
		return str.substr(str.length - count, count);
	} catch (ex) {
		throwError("string error (RIGHT$): '"+str+"' count: '"+count+"'");
	}
}



function INSTR(str, text, start) {
	if (start == -1) {
		return str.indexOf(text);
	} else {
		return str.indexOf(text, start);
	}
}
function REVINSTR(str, text, start) {
	if (start == -1) {
		return str.lastIndexOf(text);
	} else {
		return str.lastIndexOf(text, start);
	}
}

function CHR_Str(character) {
	return String.fromCharCode(character);
}

function REPLACE_Str(text, from, to) {
	var i=0;
	for(;;){
		i=text.indexOf( from,i );
		if( i==-1 ) return text;
		text=text.substring( 0,i )+to+text.substring( i+from.length );
		i+=to.length;
	}
	return text;
	//return text.replace(from, to);
}

function TRIM_Str(text, repl) {
	return LTRIM_Str(RTRIM_Str(text, repl), repl);
}

function LTRIM_Str(text, repl) {
	for (i =0; i < text.length; i++) {
		var c = text.charAt(i);
		if (repl.indexOf(c) == -1) {
			return text.substr(i);
		}
	}
	return "";
}

function RTRIM_Str(text, repl) {
	for (i =text.length-1; i >= 0 ; i--) {
		var c = text.charAt(i);
		if (repl.indexOf(c) == -1) {
			return text.substr(0,i+1);
		}
	}
	return "";
}

function ASC(text, index) {
	try {
		return text.charCodeAt(index);
	} catch(ex) {
		throwError("string error (ASC): '"+text+"' index: '"+index+"'");
	}
}


function SPLITSTR(text, array, split, dropEmpty) {
	try {
		var last = 0;
		REDIM(array, [0], array.defval);
		for (var i = 0; i <=text.length; i++) {
			var c = text.charAt(i);
			if (split.indexOf(c) != -1 || i == (text.length)) {
				var t = MID_Str(text, last, i - last);
				if (t != "" || !dropEmpty) {
					if (array.defval instanceof Array) {
						DIMPUSH(array, [t]); //wenns ein ref dings ist, in ref packen!
					} else {
						DIMPUSH(array, t);
					}
				}
				last = i+1;
			}
		}
		
		return BOUNDS(array, 0);
	} catch(ex) {
		throwError("string error (SPLITSTR): '"+str+"' split: '"+split+"' dropEmpty: "+dropEmpty);
	}
}

function URLENCODE_Str(url) {
	return encodeURI(url);
}

function URLDECODE_Str(url) {
	return decodeURI(url);
}
//------------------------------------------------------------
//FILE:
//------------------------------------------------------------
function createXMLHttpRequest() {
	try { return new XMLHttpRequest(); } catch(e) {}
	try { return new ActiveXObject("Msxml2.XMLHTTP"); } catch (e) {}
	throwError("XMLHttpRequest not supported");
	return null;
}

function loadText(text) {
	var load = createXMLHttpRequest();
	if (text.charAt(0) == '/') text = text.substring(1); // slash am ans
	load.open("get", text, false);
	load.requestType = 'text';
	load.send(null);
	
	return load.responseText;
}
//FileSystem und variablen laden!
var fileSystem = new VirtualFileSystem(localStorage ? localStorage.getItem("filesystem") : "");; //dynamisch (= kann verändert werden)
var staticFileSystem = new VirtualFileSystem(); //statisch (= temporär)

if (!isInWebWorker) {
	var text = loadText("DIR_STRUCTURE");
	if (text == null) {
		throwError("Cannot load dir structure!");
	} else {
		var lines = text.split("\n");
		for (var pos = 0; pos < lines.length; pos++) {
			var line = lines[pos];
			if (line.indexOf(":") != -1) {
				// es gibt ein .
				var command = line.substring(0, line.indexOf(":"));
				var param = line.substring(line.indexOf(":")+1);
				
				switch(command) {
					case 'var':
						if (param.indexOf("=") != -1) {
							var name = param.substring(0, param.indexOf("="));
							var value = param.substring(param.indexOf("=")+1);
							if (typeof isInWebWorker == 'undefined') {
								window[name] = value; //setzen \o/
							} else {
								eval(name+" = '"+value+"'");
							}
							
						} else {
							throwError("Expecting '='");
						}
						break;
					case 'folder':
						fileSystem.createDir(param);
						staticFileSystem.createDir(param);
						break;
					case 'static':
						staticFileSystem.createFile(param, []); //unlesbar aber da!
						break;
					case 'editable':
						//TODO!
						staticFileSystem.createFile(param, function(file) {
							var text = loadText(file.path+".123SCRIPT_DATA");
							file.data = text.split(",");
							return file.data;
						});
						break;
					default:
						throwError("Unknown command '"+command+"'");
				}
			}
		}
	}
}

var channels 	= []
function GENFILE() {
	for (var i = 0; i < channels.length; i++) {
		if (!channels[i]) return i;
	}
	return channels.length;
}

//converts the given path "/lol/hallo/wtf.txt" to the result dir and filename
function rawpath(path, dir) {
	path = (TRIM_Str(dir.getFileSystem().getCurrentDir()," ") + TRIM_Str(path," ")).toLowerCase();
	var last = 0;
	var curDir = dir;
	
	for (var i = 0; i < path.length; i++) {
		switch(path.charAt(i)) {
			case '/':
				if (i > 0) {
					//oha ein / also einen tab höher
					var name = path.substr(last, i - last);
					curDir = curDir.getSubDir(name);
					last = i+1;
				} else {
					last = 1;
				}
				break;
			case '.':
				//schauen was danach kommt
				var nextSymbol = function() {
					i++;
					return i < path.length;
				}
				if (!nextSymbol()) break;
				if (path.charAt(i) == '.') {
					curDir = curDir.getParent();
					if (!nextSymbol()) break; //nun muss ein / sein
					if (path.charAt(i) != '/') throwError("Expecting '/'");
					last = i+1;
				} else if (path.charAt(i) == '/') {
					//wenn ein / ist, ignorieren
					last = i+1;
				}
				
				break;
		}
	}
	
	return new FilePointer(path.substr(last, path.length - last), curDir);
}

/**
* @constructor
*/
function FilePointer(name, dir) {
	this.name = name;
	this.dir = dir;
}

/**
* @constructor
*/
function VirtualFileSystem(text) {
	this.mainDir = new VirtualDirectory("", null, this);
	this.curDir = "";
	
	
	this.copyFile = function(from, to) {
		if (this.doesFileExist(form)) {
			var data = this.getFile(from).getData();
			this.createFile(to, data);
		}
	}
	
	this.getCurrentDir = function() {
		return this.curDir;
	}	
	
	this.setCurrentDir = function(dir) {
		if (RIGHT_Str(dir, 1) != "/") dir += "/" //muss mit / enden!
		this.curDir = dir;
	}
	
	this.getFile = function(file) {
		var d = rawpath(file, this.mainDir);
		return d.dir.getFile(d.name);
	}
	
	this.getDir = function(dir) {
		var d = rawpath(dir, this.mainDir);
		return d.dir;
		//return d.dir.getDir(d.name);
	}
	
	this.doesFileExist = function(file) {
		try {
			var d = rawpath(file, this.mainDir);
			return d.dir.doesFileExist(d.name);
		} catch (ex) {}
		return false;
	}
	
	this.doesDirExist = function(dir) {
		try {
			var d = rawpath(dir, this.mainDir);
			return d.dir.doesDirExist(d.name);
		} catch (ex) {}
		return false;
	}
	
	this.removeFile = function(file) {
		var d= rawpath(file, this.mainDir);
		d.dir.removeFile(d.name);
	}
	
	this.removeDir = function(path) {
		var d = rawpath(path, this.mainDir);
		d.dir.removePath(d.name);
	}
	
	this.createFile = function(file, data) {
		//if (!file || !file.name || file.name.length == 0) return;
		if (!this.doesFileExist(file)) {
			var d = rawpath(file, this.mainDir);
			return d.dir.createFile(file, d.name, data);
		} else {
			var f = this.getFile(file);
			f.data = data;
			return f;
		}
	}
	
	this.createDir = function(dir) {
		//if (!dir || !dir.name || dir.name.length == 0) return;
		if (!this.doesDirExist(dir)) {
			var d = rawpath(dir, this.mainDir);
			return d.dir.createDir(d.name);
		} else return this.getDir(dir);
	}
	
	this["cD"] = this.createDir;
	this["cF"] = this.createFile;
	
	this.getMainDir = function() {
		return this.mainDir; //this.mainDir.charAt(this.mainDir.length - 1) != '/' : this.mainDir+"/" : this.mainDir;
	}
	
	this.save = function() {
		return this.mainDir.save();
	}
	
	if (text != undefined) {
		//temporär die kürzel erstellen
		window["filesystem"] = this;
		eval(REPLACE_Str(text, "t.", "window.filesystem."));
	}
}


/**
* @constructor
*/
function VirtualDirectory(name, parent, system) {
	this.name = name;
	this.parent = parent;
	this.subDirs = [];
	this.files = [];
	this.fileSystem = system;
	
	this.getList = function() {
		return this.subDirs.concat(this.files);
	}
	
	this.getFileSystem = function() {
		return this.fileSystem;
	}
	
	this.doesDirExist = function(dir) {
		for (var i = 0; i < this.subDirs.length; i++) {
			if (this.subDirs[i].name == dir) {
				return true;
			}
		}
		return false;
	}
	
	this.doesFileExist = function(file) {
		for (var i = 0; i < this.files.length; i++) {
			if (this.files[i].name == file) {
				return true;
			}
		}
		return false;
	}
	
	this.removeFile = function(file) {
		for (var i = 0; i < this.files.length; i++) {
			if (this.files[i].name == file) {
				this.files.splice(i, 1);
				return;
			}
		}
		throwError("FileNotFound "+file);
	}
	
	this.removeDir = function(file) {
		for (var i = 0; i < this.subDirs.length; i++) {
			if (this.subDirs[i].name == file) {
				this.subDirs.splice(i, 1);
				return;
			}
		}
		throwError("DirNotFound "+file);
	}
	
	this.createDir = function(name) {
		var d = new VirtualDirectory(name, this,this.fileSystem);
		this.subDirs.push(d);
		return d;
	}
	
	this.createFile = function(path, name, data) {
		var f = new VirtualFile(this, name, data, path);
		this.files.push(f);
		
		return f;
	}
	
	this.getFile = function(name) {
		for (var i = 0; i < this.files.length; i++) {
			if (this.files[i].name == name) {
				return this.files[i];
			}
		}
		throwError("file not found");
	}
	
	this.getDir = function(name) {
		for (var i = 0; i < this.subDirs.length; i++) {
			if (this.subDirs[i].name == name) {
				return this.subDirs[i];
			}
		}
		throwError("Dir not found");
	}
	
	this.getSubDir = function(name) {
		for (var i = 0; i < this.subDirs.length; i++) {
			if (this.subDirs[i].name == name) {
				return this.subDirs[i];
			}
		}
		throwError("Dir not found: "+name);
	}
	
	this.getParent = function() {
		return this.parent;
	}
	
	this.getPath = function() {
		return ((!!this.getParent()) ? this.getParent().getPath()+"/" : "")+this.name;
	}
	
	this.save = function() {
		var text = "";
		if (this.getParent() != null ) text = "t.cD(\""+this.getPath()+"\");\n";
		for (var i = 0; i < this.files.length; i++) {
			text += this.files[i].save();
		}
		for (var i = 0; i < this.subDirs.length; i++) {
			text += this.subDirs[i].save();
		}
		return text;
	}
}

/**
* @constructor
*/
function VirtualFile(dir, name, data, path) {
	this.name = name;
	this.data = data;
	this.dir = dir;
	this.path = path;
	
	this.getName = function() {
		return this.name;
	}
	
	this.getData = function() {
		if (typeof this.data == 'function') {
			return this.data(this);
		} else {
			return this.data;
		}
	}
	
	this.save = function() {
		return "t.cF(\""+this.dir.getPath()+"/"+this.name+"\", "+JSON.stringify(this.getData())+");\n";
	}
}

/**
* @constructor
*/
function Channel(channel, file, mode) {
	this.channel = channel;
	this.mode = mode;
	this.ptr = 0;
	file = file.toLowerCase();
	
	//existiert das file auf der platte?
	if (fileSystem.doesFileExist(file)) {
		//yep ist schon da!
		this.file = fileSystem.getFile(file);
	} else {
		//schauen obs im statischen filesystem liegt
		if (staticFileSystem.doesFileExist(file)) {
			//yey!
			if (mode == 1) { //ist nur lesen, da muss das file nicht ins andere filesystem kopiert werden
				this.file = staticFileSystem.getFile(file);
			} else { //muss ins dynamische hinkopiert werden
				var tmp = staticFileSystem.getFile(file);
				this.file = fileSystem.createFile(file, tmp.getData());
			}
		} else {
			// :( nope... erstelle es im normalen, sofern es gerade nicht im lesemodus ist
			if (mode != 1) {
				try {
					this.file = fileSystem.createFile(file, []);
				} catch (ex) {
					throwError("cannot create file: "+file);
				}
			} else {
				throwError("file not found: "+file);
			}
		}
	}
	
	if (mode == -1) {
		//ptr
		this.ptr = this.file.getData().length;
	}
	
	this.updateSize = function() {
		if (this.ptr > this.file.getData().length) this.file.getData().length = this.ptr;
	}
	
	this.checkPosition = function() {
		if (this.ptr > this.file.getData().length) throwError("Reached end of file: '"+this.ptr+"' filesize: '"+this.file.getData().length+"'");
	}
	
	this.ENDOFFILE = function() {
		return this.ptr >= this.file.getData().length || this.ptr < 0; //TODO: not sure about >= !!111
	}
	this.FILESEEK = function(bytes, dir) {
		var old = this.ptr;
		switch(dir) {
			case -1:
				this.ptr = this.file.getData().length - bytes;
				break;
			case 0:
				this.ptr = bytes;
				break;
			case 1:
				this.ptr += bytes;
				break;
		}
		if (this.ENDOFFILE()) this.ptr = this.file.getData().length; //throwError("Seeked out of file..."); //wenn außerhalb, dann zurücksetzen
	}
	
	//reads:
	this.READLINE = function() {
		var line = ""
		var character = "";
		while((character = String.fromCharCode(this.file.getData()[this.ptr])) != "\n" && (this.ptr < this.file.getData().length)) {
			line = line + character;
			this.ptr++;
		}
		this.checkPosition();
		this.ptr++;
		//das \r am ende weg
		if (line.substr(line.length-1,1)=="\r") {
			line = line.substr(0, line.length-1);
		}
		
		return line;
	}
	this.READBYTE = function() {
		this.ptr++;
		var tmp = new Int8Array(1);
		tmp[0] = this.file.getData()[this.ptr-1]; //in ein byte converten
		this.checkPosition();
		return tmp[0];
	}
	this.READUBYTE = function() {
		this.ptr++;
		var tmp = new Uint8Array(1);
		tmp[0] = this.file.getData()[this.ptr-1]; //in ein ubyte casten
		this.checkPosition();
		return tmp[0];
	}
	this.READWORD = function() {
		this.ptr+=2;
		var buf = new ArrayBuffer(2);
		var view8 = new Uint8Array(buf);
		view8[0] = this.file.getData()[this.ptr-2];
		view8[1] = this.file.getData()[this.ptr-1];
		var tmp = new Int16Array(buf);
		this.checkPosition();
		return tmp[0];
	}
	this.READUWORD = function() {
		this.ptr+=2;
		var buf = new ArrayBuffer(2);
		var view8 = new Uint8Array(buf);
		view8[0] = this.file.getData()[this.ptr-2];
		view8[1] = this.file.getData()[this.ptr-1];
		var tmp = new Uint16Array(buf);
		this.checkPosition();
		return tmp[0];
	}
	this.READLONG = function() {
		this.ptr+=4;
		var buf = new ArrayBuffer(4);
		var view8 = new Uint8Array(buf);
		view8[0] = this.file.getData()[this.ptr-4];
		view8[1] = this.file.getData()[this.ptr-3];
		view8[2] = this.file.getData()[this.ptr-2];
		view8[3] = this.file.getData()[this.ptr-1];
		var tmp = new Int32Array(buf);
		this.checkPosition();
		return tmp[0];
	}
	this.READULONG = function() {
		this.ptr+=4;
		var buf = new ArrayBuffer(4);
		var view8 = new Uint8Array(buf);
		view8[0] = this.file.getData()[this.ptr-4];
		view8[1] = this.file.getData()[this.ptr-3];
		view8[2] = this.file.getData()[this.ptr-2];
		view8[3] = this.file.getData()[this.ptr-1];
		var tmp = new Uint32Array(buf);
		this.checkPosition();
		return tmp[0];
	}
	this.READIEEE = function() {
		this.ptr+=8;
		var buf = new ArrayBuffer(8);
		var view8 = new Uint8Array(buf);
		view8[0] = this.file.getData()[this.ptr-8];
		view8[1] = this.file.getData()[this.ptr-7];
		view8[2] = this.file.getData()[this.ptr-6];
		view8[3] = this.file.getData()[this.ptr-5];
		view8[4] = this.file.getData()[this.ptr-4];
		view8[5] = this.file.getData()[this.ptr-3];
		view8[6] = this.file.getData()[this.ptr-2];
		view8[7] = this.file.getData()[this.ptr-1];
		var tmp = new Float64Array(buf);
		this.checkPosition();
		return tmp[0];
	}
	this.READSHORTIEEE = function() {
		this.ptr+=4;
		var buf = new ArrayBuffer(4);
		var view8 = new Uint8Array(buf);
		view8[0] = this.file.getData()[this.ptr-4];
		view8[1] = this.file.getData()[this.ptr-3];
		view8[2] = this.file.getData()[this.ptr-2];
		view8[3] = this.file.getData()[this.ptr-1];
		var tmp = new Float32Array(buf);
		this.checkPosition();
		return tmp[0];
	}
	this.READSTR = function(count) {
		var text = "";
		for (var i = 0; i < count; i++) {
			text += CHR_Str(this.READUBYTE());
		}
		return text;
	}
	
	//writes:
	this.WRITEBYTE = function(data) {
		var tmp = new Int8Array(1);
		tmp[0] = data;
		this.file.getData()[this.ptr] = tmp[0];
		
		this.ptr++;
		this.updateSize();
	}
	this.WRITEUBYTE = function(data) {
		var tmp = new Uint8Array(1);
		tmp[0] = data;
		this.file.getData()[this.ptr] = tmp[0];
		
		this.ptr++;
		this.updateSize();
	}
	this.WRITEWORD = function(data) {
		var buffer = new ArrayBuffer(2);
		var wordView = new Int16Array(buffer);
		wordView[0] = data;
		var byteView = new Uint8Array(buffer);
		for (var i = 0; i < byteView.length; i++) {
			this.WRITEUBYTE(byteView[i]);
		}
		this.updateSize();
	}
	this.WRITEUWORD = function(data) {
		var buffer = new ArrayBuffer(2);
		var wordView = new Uint16Array(buffer);
		wordView[0] = data;
		var byteView = new Uint8Array(buffer);
		for (var i = 0; i < byteView.length; i++) {
			this.WRITEUBYTE(byteView[i]);
		}
		this.updateSize();
	}
	this.WRITELONG = function(data) {
		var buffer = new ArrayBuffer(4);
		var longView = new Int32Array(buffer);
		longView[0] = data;
		var byteView = new Uint8Array(buffer);
		for (var i = 0; i < byteView.length; i++) {
			this.WRITEUBYTE(byteView[i]);
		}
		this.updateSize();
	}
	this.WRITEULONG = function(data) {
		var buffer = new ArrayBuffer(4);
		var longView = new Uint32Array(buffer);
		longView[0] = data;
		var byteView = new Uint8Array(buffer);
		for (var i = 0; i < byteView.length; i++) {
			this.WRITEUBYTE(byteView[i]);
		}
		this.updateSize();
	}
	this.WRITEIEEE = function(data) {
		var buffer = new ArrayBuffer(8);
		var floatView = new Float64Array(buffer);
		floatView[0] = data;
		var byteView = new Uint8Array(buffer);
		for (var i = 0; i < byteView.length; i++) {
			this.WRITEUBYTE(byteView[i]);
		}
		this.updateSize();
	}
	this.WRITESHORTIEEE = function(data) {
		var buffer = new ArrayBuffer(4);
		var floatView = new Float32Array(buffer);
		floatView[0] = data;
		var byteView = new Uint8Array(buffer);
		for (var i = 0; i < byteView.length; i++) {
			this.WRITEUBYTE(byteView[i]);
		}
		this.updateSize();
	}
	this.WRITESTR = function(data) {
		for (var i = 0; i <data.length; i++) {
			this.WRITEUBYTE(ASC(data, i));
			//this.file.getData()[this.ptr] = ASC(data, i);
			//this.ptr++;
		}
		this.updateSize();
	}
	this.WRITELINE = function(data) {
		this.WRITESTR(data+"\r\n");
	}
}

function OPENFILE(channel, file, mode) {
	try {
		channels[channel] = new Channel(channel, file, mode);
		if (channel >= channels.length) channels.length = channel + 1;
		return 1;
	} catch(ex) {
		return 0;
	}
}

function getChannel(chn) {
	if (!channels[chn]) throwError("Cannot find channel: "+chn);
	return channels[chn];
}

function ENDOFFILE(channel) {
	return getChannel(channel).ENDOFFILE() ? 1 : 0;
}

function FILEPOSITION(channel) {
	return getChannel(channel).ptr;
}

function FILESEEK(channel, bytes, dir) {
	getChannel(channel).FILESEEK(bytes, dir);
}

function KILLFILE(file) {
	try {
		if (fileSystem.doesDirExist(file)) {
			fileSystem.removeDir(file);
		} else if (fileSystem.doesFileExist(file)) {
			fileSystem.removeFile(file);
		}
	} catch (ex) {}
	
	try {
		if (staticFileSystem.doesDirExist(file)) {
			staticFileSystem.removeDir(file);
		} else if (staticFileSystem.doesFileExist(file)) {
			staticFileSystem.removeFile(file);
		}
	} catch (ex) {}
}

function CLOSEFILE(channel) {
	channels[channel] = null;
	saveFileSystem(); //fs abspeichern
}

//READ Wrapper
function READUBYTE(channel, b) {
	b[0] = getChannel(channel).READUBYTE();
}

function READBYTE(channel, b) {
	b[0] = getChannel(channel).READBYTE();
}

function READWORD(channel, b) {
	b[0] = getChannel(channel).READWORD();
}

function READUWORD(channel, b) {
	b[0] = getChannel(channel).READUWORD();
}

function READLONG(channel, b) {
	b[0] = getChannel(channel).READLONG();
}

function READULONG(channel, b) {
	b[0] = getChannel(channel).READULONG();
}

function READSHORTIEEE(channel, b) {
	b[0] = getChannel(channel).READSHORTIEEE();
}

function READIEEE(channel, b) {
	b[0] = getChannel(channel).READIEEE();
}

function READLINE(channel, line) {
	line[0] = getChannel(channel).READLINE();
}

function READSTR(channel, str, count) {
	str[0] = getChannel(channel).READSTR(count);
}

//WRITE Wrapper
function WRITEUBYTE(channel, data) {
	getChannel(channel).WRITEUBYTE(data);
}

function WRITEBYTE(channel, data) {
	getChannel(channel).WRITEBYTE(data);
}

function WRITEWORD(channel, data) {
	getChannel(channel).WRITEWORD(data);
}

function WRITEUWORD(channel, data) {
	getChannel(channel).WRITEUWORD(data);
}

function WRITELONG(channel, data) {
	getChannel(channel).WRITELONG(data);
}

function WRITEULONG(channel, data) {
	getChannel(channel).WRITEULONG(data);
}

function WRITESHORTIEEE(channel, data) {
	getChannel(channel).WRITESHORTIEEE(data);
}

function WRITEIEEE(channel, data) {
	getChannel(channel).WRITEIEEE(data);
}
function WRITELINE(channel, data) {
	getChannel(channel).WRITELINE(data);
}

function WRITESTR(channel, data) {
	getChannel(channel).WRITESTR(data);
}

function SETSHOEBOX(data, media) {
	//ignore!
}

function GETCOMMANDLINE_Str() {
	var c = window.location.href;
	var l = INSTR(c, "?");
	if (l == -1) return "";
	return REPLACE_Str(MID_Str(c, l+1), "&", " ");
}

function GETCURRENTDIR_Str() {
	return fileSystem.getCurrentDir();
}

function SETCURRENTDIR(dir) {
	if (dir == '') return;
	
	var tmpDir = rawpath(dir, fileSystem.getMainDir());
	dir = tmpDir.dir.getPath()+dir;
	
	var fs1 = false, fs2 = false;
	try {
		fileSystem.setCurrentDir(dir);
		fs1 = true;
	} catch (ex) {}
	try {
		staticFileSystem.setCurrentDir(dir);
		fs2 = true;
	} catch (ex) {}
	return (fs1 && fs2) ? 1 : 0;
}

function DOESFILEEXIST(file) {
	return (fileSystem.doesFileExist(file) || staticFileSystem.doesFileExist(file)) ? 1 : 0;
}

function DOESDIREXIST(dir) {
	return (fileSystem.doesDirExist(dir) || staticFileSystem.doesDirExist(dir)) ? 1 : 0;
}

function GETFILESIZE(file) {
	try {
		var f = null;
		if (fileSystem.doesFileExist(file)) {
			f = fileSystem.getFile(file);
		} else if (staticFileSystem.doesFileExist(file)) {
			f = staticFileSystem.getFile(file);
		} else {
			throwError("Cannot find file: "+file);
		}
		if (!!f) return f.getData().length;
	} catch(ex) {}
	return 0;
}

function GETFILELIST(find, files) {
	try {
		REDIM(files, [0], files.defval);
		var doesMatch = function(name) {
			var i = 0, j = 0;
			for (var j = 0; j <= find.length; j++) {
				var c = find.charAt(j);
				switch(c) {
					case '*':
						//beliebig lang
						j++;
						var endTok = find.charAt(j);
						j--;
						while(name.charAt(i) != endTok && i < name.length) i++; //bis es wieder zu einem spezialzeichen kommt, wiederholen
						break;
					case '?':
						//ignoriere!
						i++;
						break;
					default:
						if (c != name.charAt(i)) return false;
						i++;
				}
			}
			
			return true;
		}
		
		var data = fileSystem.getDir("").getList().concat(staticFileSystem.getDir("").getList());
		
		var numDir = 0, numFile = 0;
		
		var output = [];
		output.push(".");
		output.push("..");
		for (var i = 0; i <data.length; i++) {
			var o = data[i];
			
			if (doesMatch(o.name)) {
				if (o instanceof VirtualDirectory) {
					numDir++;
				} else if (o instanceof VirtualFile) {
					numFile++;
				} else {
					throwError("Unknown file type");
				}
				
				output.push(o.name);
			}
		}
		
		//output array in das echte array rein
		for (var i = 0; i < output.length; i++) {
			if (files.defval instanceof Array) {
				DIMPUSH(files, [output[i]]);
			} else {
				DIMPUSH(files, output[i]);
			}
		}
		
		//fertig
		return numDir*0x1000+numFile;
	} catch (ex) {
		throwError("GETFILELIST error: find: '"+find+"'");
	}
}

function COPYFILE(source, dest) {
	fileSystem.copyFile(source, dest);
	staticFileSystem.copyFile(source, dest);
}

function CREATEDIR(dir) {
	try {
		fileSystem.createDir(dir);
		staticFileSystem.createDir(dir);
		return 1;
	} catch(ex) {}
	return 0;
}

//-----------------------------------------------------------
//INI
//-----------------------------------------------------------

/**
* @constructor
*/
function INI(file) {
	this.parse = function(text) {
		try {
			var lines = text.replace("\r").split("\n");
			var cat = "";
			for (var i = 0; i < lines.length; i++) {
				var l = lines[i];
				if (INSTR(l, ";") != -1) {
					l = MID_Str(l, 0, INSTR(l, ";"));
				}
				if (MID_Str(l, 0, 1) == '[') {
					//kategorie
					cat = MID_Str(l, 1, REVINSTR(l, ']')-1);
				} else if (INSTR(l, "=") != -1) {
					var k = MID_Str(l, 0, INSTR(l,"="));
					var v = MID_Str(l, INSTR(l,"=")+1);
					INIPUT(cat, k, v);
				}
			}
		} catch(ex) {
			throwError("INI parse error: '"+text*"'");
		}
	}
	
	
	this.put = function(cat, key, value) {
		try {
			cat = cat.toLowerCase();
			var c;
			for (var i = 0;i < this.cats.length; i++) {
				if (this.cats[i].name == cat) {
					c = this.cats[i];
					if (key == "" && value == "") {
						//löschen
						this.cats.splice(i, 1);
						return;
					}
					break;
				}
			}
			if (!c) {
				c = new INICat(cat);
				this.cats.push(c);
			}
			c.put(key, value);
		} catch(ex) {
			throwError("INIPUT error cat: '"+cat+"' key: '"+key+"' value: '"+value+"'");
		}
	}
	
	
	this.get = function(cat, key) {
		try {
			cat = cat.toLowerCase();
			var c;
			for (var i = 0;i < this.cats.length; i++) {
				if (this.cats[i].name == cat) {
					c = this.cats[i];
					break;
				}
			}
			if (!c) {
				c = new INICat(cat);
			}
			return c.get(key);
		} catch(ex) {
			throwError("INIGET error cat: '"+cat+"' key: '"+key+"'");
		}
	}
	
	this.save = function() {
		var text = "";
		for (var i = 0;i < this.cats.length; i++) {
			text += "["+this.cats[i].name+"]\n"
			text += this.cats[i].save();
		}
		return text;
	}
	
	this.cats = [];	
	this.channel = 1337*2;
	
	try {
		OPENFILE(this.channel, file, 0)
		var size = GETFILESIZE(file);
		if (size > 0) {
			var text = [""];
			READSTR(this.channel, text, size);
			var o = curIni;
			curIni = this;
			this.parse(text[0]);
			curIni = o;
		}
	} catch(ex) {
		throwError("INI load error: '"+file+"'");
	}
	
}

/**
* @constructor
*/
function INICat(name) {
	this.name = name;
	this.keys = [];
	
	this.put = function(key, value) {
		key = key.toLowerCase();
		var kv;
		for (var i = 0;i < this.keys.length; i++) {
			if (this.keys[i].key == key) {
				kv = this.keys[i];
				if (value == "") {
					this.keys.splice(i, 1);
					return;
				}
				break;
			}
		}
		if (!kv) {
			kv = new INIKeyValue(key, value);
			this.keys.push(kv);
		}
	}
	
	this.get = function(key) {
		key = key.toLowerCase();
		var kv;
		for (var i = 0;i < this.keys.length; i++) {
			if (this.keys[i].key == key) {
				kv = this.keys[i];
				break;
			}
		}
		
		if (!kv) {
			return "NO_DATA"
		} else {
			return kv.value;
		}
	}
	
	this.save = function() {
		var text = "";
		for(var i = 0; i < this.keys.length; i++) {
			text += this.keys[i].key+"="+this.keys[i].value+"\n";
		}
		return text;
	}
}

/**
* @constructor
*/
function INIKeyValue(key, value) {
	this.key = key;
	this.value = value;
}

var curIni = null;

function INIOPEN(file) {
	if (!!curIni) {
		//speichern
		var text = curIni.save();
		WRITESTR(curIni.channel, text);
		CLOSEFILE(curIni.channel);
	}
	if (file == "") {
		curIni = null;
	} else {
		curIni = new INI(file);
	}
}

function INIPUT(cat, name, key) {
	if (!!curIni) {
		curIni.put(cat, name, key);
	}
}

function INIGET_Str(cat, name) {
	if (!!curIni) {
		return curIni.get(cat, name);
	}
}
//------------------------------------------------------------
//Variables
//------------------------------------------------------------
if (typeof preInitFuncs == 'undefined') preInitFuncs = [];
preInitFuncs.push(function() {
	if (viewMode == '2d') {
		if (typeof window == 'undefined') window = {};
		window.onload=function( e ) {
			if (typeof GFX_WIDTH 	== 'undefined')
				window["GFX_WIDTH"] = 640;
				
			if (typeof GFX_HEIGHT 	== 'undefined')
				window["GFX_HEIGHT"] = 480;
			
			var c = document.createElement('canvas');
			c.width = GFX_WIDTH;
			c.height = GFX_HEIGHT
			c.id = "OTTCANVAS";
			
			document.body.appendChild(c);
			
			if (initStatics !== undefined) initStatics();
			
			init2D('OTTCANVAS');
		}
	}
});

var useDoubleBuffering = false; // soll double buffering verwendet werden?
var waitload	= 0; 		//Auf wieviele Sachen muss noch gewartet werden
var curScreen	= null;		//Der aktuell ausgewählte Screen
var context		= null; 	//Der JavaScript Kontext
var canvas		= null;		//Das Canvas auf das gezeichnet wird
var clrColor	= RGB(0,0,0); //Die Hintergrundfarbe
var keyInput 	= [];		//Das Inputarray
var fontbuffer	= null;		//der frontbuffer
var backbuffer	= null;		//Der hintergrundbuffer
var initCalled	= false;	//wurde init aufgerufen?
var lastShwscrn	= 0;		//Wann wurde das letzte showscreen gemacht?
var showFPS		= -1; 		//wieviele fps?
var framePrev	= 0;		//welche ms gabs davor?
var frameDelay	= 0;		//wie lange soll gewarten werden?
var canvasWidth, canvasHeight; //Die breite/höhe
var	background	= null;		//Das Hintergrundbg (USEASBMP oder LOADBMP)
var loopFunc 	= function() { throwError('GLB_ON_LOOP not found.') }; //Aktueller LOOP
var loops 	 	= [];		//Der Loopstack
var usedSoundformat = 'ogg';	//Das benutzte Soundformat
var hibernate	= false;	//SOlls warten
var transCol	= null;		//Die durchsichtige farbe
var setBmp 		= null;		//die funktion die den hintergrund setzen soll
var lastKey		= ""; //der zuletzt gedrückte Buchstabe (ist für INKEY)
var inFullscreen= false;
var canvasOffsetLeft = 0;
var canvasOffsetTop = 0;
var autopauseEnabled = false; // is autopause enabled?
var autopauseActive = false; // is it currently autopausing?

var waitForFont = false;

var sub_loadingName = "GLB_ON_LOADING";
var sub_loopName = "GLB_ON_LOOP";

//------------------------------------------------------------
// Basic 2D stuff
//------------------------------------------------------------

var doCurrentFunction = function() {
	if (!useDoubleBuffering) {
		CLEARSCREEN(clrColor);
	}
	if (!!background) {
		backbuffer.context.drawImage(background, 0, 0);
	}
	
	if (!waitload) {
		loopFunc(); //mainloop
	} else if (!!window[sub_loadingName]) {
		window[sub_loadingName]();
	}
	
	//Nun wieder auf normal
	ALPHAMODE(0);
	if (inPoly) {
		ENDPOLY();
	}
	if (inViewport) {
		context.restore();
		inViewport = false;
	}
}

function update2D() {
	try {
		opt_update2D();
	} catch(ex) {
		if (!(ex instanceof OTTExitException)) throw(formatError(ex));
	}
}

function opt_update2D() {
	if (!initCalled) {
		if (waitForFont) {
			if (!waitload) {
				waitForFont = false;
			}
		} else {
			//Erst wenn Font fertig geladen ist
			initCalled = true;
			
			main();
		}
	} else {
		if (setBmp) {
			setBmp();
			setBmp = null;
		}
		
		updateTouches();
		
		if (hibernate) {
			if (ANYMOUSE() || ANYKEY() || globalSpeedX || globalSpeedY) {
				hibernate = false;
			}
		} else if (autopauseEnabled && autopauseActive) {
			// do nothing
		} else {
			if (showFPS == -1) {
				doCurrentFunction();
			} else {
				var frameStart = GETTIMERALL();
				var frameDelta = frameStart - framePrev;
				
				if (frameDelta >= frameDelay) {
					doCurrentFunction();
						
					frameDelay = showFPS;
					if (frameDelta > frameDelay) {
						frameDelay = frameDelay - (frameDelta - frameDelay);
					}
					framePrev = frameStart;
				}
			}
			
		}
		
		anyKeyPress = false;
	}
	window.requestAnimFrame(update2D, frontbuffer.canvas);
}

function domExceptionError(ex) {
	if (ex instanceof DOMException) {
		if (ex.code == 18) {
			throwError("Cannot access to ressource (maybe pixel data?). If you use Chrome, please run in localhost or use another browser!");
		} else {
			throwError("Unknown DOM error :(");
		}
	} else throw ex;
}

function PUSHLOOP(loop) {
	var f = eval("window['"+loop+"']");
	if (f == undefined) {
		loopFunc = function() {
			throwError("Call to undefined loop!");
		}
		throwError("Cannot push undefined loop: '"+loop+"'");
	}
	loopFunc = f;
	
	loops.push([f, loop]);
}

function POPLOOP() {
	loops.pop();
	
	if (loops.length == 0) {
		throwError("Cannot pop loop, because loop stack is empty!");
	}
	
	var f = loops[loops.length-1];
	loopFunc = f[0];
}

function GETCURRENTLOOP_Str() {
	var f = loops[loops.length-1];
	return f[1];
}

function RETURNTOLOOP(loop) {
	var f = eval("window."+loop);
	if (f == undefined) {
		throwError("Cannot return to undefined loop: '"+loop+"'");
	}
	while(GETCURRENTLOOP_Str() != loop) {
		POPLOOP();
	}
}

function X_MAKE2D() {
	//noch nichts tun, erst wenn 3D da ist
}

function SHOWSCREEN() {
	
	lastShwscrn = GETTIMERALL();
	if (initCalled) {
		if (useDoubleBuffering) {
			USESCREEN(-2);
			CLEARSCREEN(clrColor);
			USESCREEN(-1);
			frontbuffer.context.drawImage(backbuffer.canvas,0, 0);
			CLEARSCREEN(clrColor);
		}
	}
}


function init2D(canvasName) {
	var myAudio = document.createElement('audio'); 
    var canPlayMp3 = false, canPlayOgg = false;
    if (myAudio.canPlayType) {
		canPlayMp3 = !!myAudio.canPlayType && "" != myAudio.canPlayType('audio/mpeg');
		if (canPlayMp3 == "maybe" || canPlayMp3 == "probably" || canPlayMp3 == true) canPlayMp3 = true; else canPlayMp3 = false;
		canPlayOgg = !!myAudio.canPlayType && "" != myAudio.canPlayType('audio/ogg; codecs="vorbis"');
		if (canPlayOgg == "maybe" || canPlayOgg == "probably" || canPlayOgg == true) canPlayOgg = true; else canPlayOgg = false;
	}
	if (!canPlayOgg && !canPlayMp3) {
		noSound = true; //throwError("Your browser is not able to play sound... please use a newer browser.");
		console.log("No sound playback possible!");
	}
	
	if (canPlayOgg) {
		usedSoundFormat = 'ogg';
	} else {
		usedSoundFormat = 'mp3';
	}
	
	if (useDoubleBuffering) {
		frontbuffer = new Screen(document.getElementById(canvasName), -2);
		register(frontbuffer);
		
		var cnvs = document.createElement('canvas');
		cnvs.width = frontbuffer.canvas.width
		cnvs.height = frontbuffer.canvas.height
		backbuffer = new Screen(cnvs, -1);
		register(backbuffer);
	} else {
		frontbuffer = new Screen(document.getElementById(canvasName), -2);
		register(frontbuffer);
		
		backbuffer = new Screen(document.getElementById(canvasName), -1);
		register(backbuffer);
	}
	
	if (typeof window[sub_loadingName] == 'undefined') window[sub_loadingName] = null;
	
	USESCREEN(-2);
    if (!context) {
		throwError("Canvas unsupported, please use a newer browser.");
		END();
	}
	
	function finishEvent(e){
		if(e.stopPropagation){
			e.stopPropagation();
			e.preventDefault();
		} else {
			e.cancelBubble=true;
			e.returnValue=false;
		}
	}
	
	canvas.oncontextmenu = function() {
		return false;
	}
	
	touches.push(new Touch()); //Einen Touch gibts immer!
	
	canvasOffsetLeft = getOffsetLeft(canvas);
	canvasOffsetTop = getOffsetTop(canvas);
	
	//mouse listener
	if (!touchable) {
		canvas.onmousemove = function(ev) {
			if(!ev) ev = window.event();
			
			touches[0].x = ev.pageX - canvasOffsetLeft;
			touches[0].y = ev.pageY - canvasOffsetTop;
		}
		canvas.onmousedown=function( e ) {
			if(!e) e = window.event();
			
			switch( e.button ){
				case 0: touches[0].left 	= true; break;
				case 1: touches[0].middle 	= true; break;
				case 2: touches[0].right 	= true; break;
			}
			
			finishEvent(e);
		}
		
		canvas.onmouseup=function( e ) {
			if(!e) e = window.event();
			
			switch( e.button ){
				case 0: touches[0].left 	= false; break;
				case 1: touches[0].middle 	= false; break;
				case 2: touches[0].right 	= false; break;
			}
			finishEvent(e);
		}
		
		canvas.onmouseout=function( e ){
			if(!e) e = window.event();
			
			touches[0].left 	= false;
			touches[0].right	= false;
			touches[0].middle 	= false;
			finishEvent(e);
		}
		
		wheel = function(ev) {
			var delta = 0;
			if (!ev) ev = window.event;
			if (ev.wheelDelta){
				delta = ev.wheelDelta/120;
				if (window.opera) delta = -delta;
			} else if(ev.detail){
				delta = -ev.detail/3;
			}
			
			touches[0].wheel = (delta > 0) ? 1 : ((delta < 0) ? -1 : 0);
			if(ev.preventDefault) ev.preventDefault();
			ev.returnValue = false;
			
			finishEvent(ev);
		}
		
		if(window.addEventListener) window.addEventListener("DOMMouseScroll", wheel, false);
		window.onmousewheel = document.onmousewheel = wheel;
	} else {
		canvas.addEventListener('touchmove', function(event) {
			updateTouches(event.changedTouches, 'move');
			
			finishEvent(event);
		}, false);
		
		
		canvas.addEventListener('touchstart', function(event) {
			//Beginn...
			updateTouches(event.changedTouches, 'start');
			finishEvent(event);
		}, false);
		
		canvas.addEventListener('touchend', function(event) {
			//Ende...
			updateTouches(event.changedTouches, 'end');
			finishEvent(event);
		}, false);
	}
	//key listener
	document.onkeydown = canvas.onkeydown = function(ev) {
		if(!ev) ev = window.event();
		keyInput[ev.keyCode] = true;
		anyKeyPress = true;
		
		finishEvent(ev);
	}
	document.onkeyup = canvas.onkeyup = function(ev) {
		if(!ev) ev = window.event();
		keyInput[ev.keyCode] = false;
		
		finishEvent(ev);
	}
	// press listener (for INKEY$)
	document.onkeypress = canvas.onkeypress = function(ev) {
		if (!ev) ev = window.event();
		if (ev.keyCode == 8) 
			lastKey = "\b";
		else if (ev.keyCode == 13)
			lastKey = "\n";
		else
			lastKey = CHR_Str(ev.which);
	}
	
	// gamepad listener
	gamepads = navigator.getGamepads || navigator.webkitGetGamepads || navigator.webkitGamepads || navigator.gamepads || navigator.mozGetGamepads || navigator.mozGamepads;
	
	USESCREEN(-1);
	CLEARSCREEN(RGB(0,0,0)); //black background color
	SHOWSCREEN();
	
	if (!!window[sub_loopName]) {
		PUSHLOOP(sub_loopName);
	}
	
	SYSTEMPOINTER(0);
	
	var possibleDirs = ["Media/smalfont.png", "smalfont.png", "smallfont.png", "Media/smallfont.png", "Media/smalfont.bmp", "smalfont.bmp", "smallfont.bmp", "Media/smallfont.bmp"];
	var f = null;
	for (var i = 0; i < possibleDirs.length; i++) {
		if (DOESFILEEXIST(possibleDirs[i])) {
			f = possibleDirs[i];
			break;
		}
	}
	
	if (f != null) {
		LOADFONT(f, 0);
		SETFONT(0);
		waitForFont = true;
	}
	
	// TODO: Add event listener for changes
	canvasWidth = canvas.width; 
	canvasHeight = canvas.height;
	canvasOffsetLeft = getOffsetLeft(canvas);
	canvasOffsetTop = getOffsetTop(canvas);
	
    update2D(); //call the render function
}

function deInit2D() {
	canvas = null;
	context = null;
    sprites = [];
    screens = [];
    waitload = 0;
    curScreen = null;
    clrColor = RGB(0, 0, 0);
    keyInput = [];
    fontbuffer = null;
    backbuffer = null;
	initCalled = false;
}

function register(obj) {
	if (obj instanceof Sprite) {
		sprites[obj.num] = obj;
		if (obj.num >= sprites.length) sprites.length = obj.num + 1;
	} else if (obj instanceof Screen) {
		screens[obj.num] = obj;
		if (obj.num>=screens.length) screens.length = obj.num + 1; //vllt +3
	} else if (obj instanceof Sound) {
		sounds[obj.num] = obj;
		if (obj.num >= sounds.length) sounds.length = obj.num + 1;
	} else if (obj instanceof SoundChannel) {
		soundChannels[obj.num] = obj;
		if (obj.num >= soundChannels.length) soundChannels.length = obj.num + 1;
	} else if (obj instanceof Font) {
		fonts[obj.num] = obj;
		if (obj.num >= fonts.length) fonts.length = obj.num+1;
	} else {
		throwError("Cannot register unknown object: "+obj.constructor);
	}
	
	return obj.num;
}



//------------------------------------------------------------
//Misc
//------------------------------------------------------------

function FOCEFEEDBACK(joy, dur, x, y) {
	var f = navigator.vibrate || navigator.mozVibrate;
	if (f) f(dur);
}

function GETTIMER() {
	return GETTIMERALL() - lastShwscrn;
}

function ALPHAMODE(mode) {
	var val;
	if (mode < 0) {
		context.globalCompositeOperation = 'source-atop';
		val = 1 - (1 + mode);
	} else if (mode > 0) {
		context.globalCompositeOperation = 'source-atop';
		val = mode;
	} else {
		context.globalCompositeOperation = 'source-over'; 
		val = 1;
	}
	
	context.globalAlpha = val;
}

function SETPIXEL(x, y, col) {
	DRAWRECT(x,y,1,1,col);
}

function LIMITFPS(fps) {
	showFPS = fps;
}

function RGB(r, g, b) {
	r = r%256; if (r < 0) r = 256 + r;
	g = g%256; if (g < 0) g = 256 + g;
	b = b%256; if (b < 0) b = 256 + b;
	return r*0x10000 + g*0x100 + b;
}

var whiteRGB = RGB(255,255,255);

function SETTRANSPARENCY(rgb) {
	transCol = rgb;
	transFontCol = rgb;
}

function SMOOTHSHADING(mode) {
	if (typeof context.imageSmoothingEnabled != 'undefined')
		context.imageSmoothingEnabled = mode ? true : false;
		
	if (typeof context.mozImageSmoothingEnabled != 'undefined')
		context.mozImageSmoothingEnabled = mode ? true : false;
		
	if (typeof context.oImageSmoothingEnabled != 'undefined')
		context.oImageSmoothingEnabled = mode ? true : false;
		
	if (typeof context.webkitImageSmoothingEnabled != 'undefined')
		context.webkitImageSmoothingEnabled = mode ? true : false;
		
	if (typeof context.msImageSmoothingEnabled != 'undefined')
		context.msImageSmoothingEnabled = mode ? true : false;
}

// unused: because fullscreen has to be triggered by the user
function toggleFullScreen() {
  if (!document.fullscreenElement &&    // alternative standard method
      !document.mozFullScreenElement && !document.webkitFullscreenElement) {  // current working methods
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    } else if (document.documentElement.mozRequestFullScreen) {
      document.documentElement.mozRequestFullScreen();
    } else if (document.documentElement.webkitRequestFullscreen) {
      document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
    }
  } else {
    if (document.cancelFullScreen) {
      document.cancelFullScreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.webkitCancelFullScreen) {
      document.webkitCancelFullScreen();
    }
  }
}

function SETSCREEN(width, height, fullscreen) {
	if (fullscreen && !inFullscreen) {
		width = window.innerWidth;
		height = window.innerHeight;
		inFullscreen = true;
	} else if (!fullscreen && inFullscreen) {
		
		inFullscreen = false;
	}
	var set = function(cvs) {
		cvs.width = width
		cvs.height = height;
		cvs.style.width = width+"px";
		cvs.style.height = height+"px";
	}
	
	set(frontbuffer.canvas);
	set(backbuffer.canvas);
	set(canvas);
	
	
	canvasWidth = width
	canvasHeight = height
	
	USESCREEN(-1);
	CLEARSCREEN(RGB(0,0,0)); //black background color
	SHOWSCREEN();
	
	canvasOffsetLeft = getOffsetLeft(canvas);
	canvasOffsetTop = getOffsetTop(canvas);
}

var inViewport = false;
function VIEWPORT(x, y, width, height) {
	if (inViewport) {
		context.restore();
		inViewport = false;
	}
	
	if (x != 0 || y != 0 || width != 0 || height != 0) {
		//clipping \o/
		context.save();
		
		context.beginPath();
		context.rect( x,y,width,height );
		context.clip();
		
		context.translate(x, y);
		inViewport = true;
	}
}

function ALLOWESCAPE(allow) {
	// do nothing
}

function AUTOPAUSE(mode) {
	autopauseEnabled = mode;
}

function HIBERNATE() {
	hibernate = true;
}

function SETORIENTATION(orientation) {
	throwError("TODO: implement setorientation");
}

//------------------------------------------------------------
//get functions
//------------------------------------------------------------

function GETSCREENSIZE(width, height) {
	width[0] = canvas.width
	height[0] = canvas.height;
}

function GETSPRITESIZE(num, width, height) {
	width[0] = 0;
	height[0] = 0;
	
	if (sprites[num] && sprites[num].loaded) {
		width[0] = sprites[num].img.width;
		height[0] = sprites[num].img.height;
	}
}

function GETDESKTOPSIZE(width, height) {
	width[0] = window.innerWidth;
	height[0] = window.innerHeight;
}

function ISFULLSCREEN() {
	return 0;
}

function GETPIXEL(x, y) {
	var data = context.getImageData(x, y, 1, 1);
	return RGB(data[0], data[1], data[2]);
}

function GETORIENTATION() {
	throwError("TODO: implement getorientation");
}

function removeTransparency(image, col) {
	if (typeof col == 'undefined') {
		col = transCol
	}
	//Weird hack...
	var width = image.width, height = image.height;
	var buf = document.createElement('canvas');
	buf.width = width;
	buf.height = height;
	
	var scrn = new Screen(buf, -42);
	scrn.context.drawImage(image, 0, 0);
	
	//data modifizieren
	var imageData = scrn.context.getImageData(0, 0, width, height);
	
	for (var y = 0; y < height; y++) {
		inpos = y * width * 4; // *4 for 4 ints per pixel
		outpos = inpos;
		for (var x = 0; x < width; x++) {
			var r = imageData.data[inpos++];
			var g = imageData.data[inpos++];
			var b = imageData.data[inpos++];
			var a = imageData.data[inpos++];
			
			var rgb = RGB(r, g, b);
			if (rgb == col) {
				//Transparent machen!
				a = 0;
			}
			
			imageData.data[outpos++] = r;
			imageData.data[outpos++] = g;
			imageData.data[outpos++] = b;
			imageData.data[outpos++] = a;
		}
	}
	
	scrn.context.putImageData(imageData, 0, 0);
	
	return buf;
}


//------------------------------------------------------------
//save functions
//------------------------------------------------------------
function SAVEBMP(file) {
	throwError("TODO: savebmp");
}

function SAVESPRITE(file, num) {
	throwError("TODO: savesprite");
}

//------------------------------------------------------------
//shape functions
//------------------------------------------------------------
function DRAWLINE(x1, y1, x2, y2, col) {
	context.save();
	context.strokeStyle	= formatColor(col);
	context.beginPath();
	context.moveTo(~~x1 + .5, ~~y1 + .5); // +.5 in order to ensure lines are 1 px thick
	context.lineTo(~~x2 + .5, ~~y2 + .5);
	// context.lineWidth = 1;
	context.stroke();
	context.restore();
}

function DRAWRECT(x,y,w,h,col) {
	if (col == transCol) {
		// delete this from the canvas
		context.clearRect(x,y,w,h);
	} else {
		context.save();
		context.fillStyle	= formatColor(col);
		context.fillRect(~~x, ~~y, ~~w, ~~h);
		context.restore();
	}
}

function formatColor(origcol) {
	var col = origcol.toString(16);
	switch (col.length) {
		case 5:
			return "#0"+col;
		case 4:
			return "#00"+col;
		case 3:
			return "#000"+col;
		case 2:
			return "#0000"+col;
		case 1:
			return "#00000"+col;
		case 0:
			return "#000000"+col;
		default:
			return "#"+col;
	}
	/*while(col.length<6) {
		col = "00"+col;
	}
	return '#'+col;*/
}


//------------------------------------------------------------
//movie
//------------------------------------------------------------
function LOOPMOVIE(movie) {
	throwError("TODO: loopmovie");
}

function PLAYMOVIE(movie) {
	throwError("TODO:playmovie");
}

function loadAsset(path) {
	var oldpath = path;
	path = path.toLowerCase();
	
	if (!!window.assets) {
		for (var i = 0; i < window.assets.length; i++) {
			if (window.assets[i].name.toLowerCase() == path) {
				return window.assets[i].path;
			}
		}
	}
	return oldpath;
}

function getOffsetLeft(elem) {
    var offsetLeft = 0;
    do {
      if (!isNaN( elem.offsetLeft )) {
          offsetLeft += elem.offsetLeft;
      }
    } while(elem = elem.offsetParent);
    return offsetLeft;
}
function getOffsetTop(elem) {
    var offsetTop = 0;
    do {
      if (!isNaN( elem.offsetTop )) {
          offsetTop += elem.offsetTop;
      }
    } while(elem = elem.offsetParent);
    return offsetTop;
}

if (document) {
	(function() {
	  var hidden = "hidden";

	  // Standards:
	  if (hidden in document)
		document.addEventListener("visibilitychange", onchange);
	  else if ((hidden = "mozHidden") in document)
		document.addEventListener("mozvisibilitychange", onchange);
	  else if ((hidden = "webkitHidden") in document)
		document.addEventListener("webkitvisibilitychange", onchange);
	  else if ((hidden = "msHidden") in document)
		document.addEventListener("msvisibilitychange", onchange);
	  // IE 9 and lower:
	  else if ("onfocusin" in document)
		document.onfocusin = document.onfocusout = onchange;
	  // All others:
	  else
		window.onpageshow = window.onpagehide
		= window.onfocus = window.onblur = onchange;

	  function onchange (evt) {
		var v = "visible", h = "hidden",
			evtMap = {
			  focus:v, focusin:v, pageshow:v, blur:h, focusout:h, pagehide:h
			};

		evt = evt || window.event;
		
		var prev = autopauseActive;
		
		if (evt.type in evtMap)
		  autopauseActive = evtMap[evt.type] === "hidden" ? true : false;
		else
		  autopauseActive = this[hidden];
		  
		if (autopauseEnabled && autopauseActive != prev) {
			if (autopauseActive && window['GLB_ON_PAUSE']) {
				window['GLB_ON_PAUSE']();
			}
			if (!autopauseActive && window['GLB_ON_RESUME']) {
				window['GLB_ON_RESUME']();
			}
			lastShwscrn = GETTIMERALL();
		}
	  }

	  // set the initial state (but only if browser supports the Page Visibility API)
	  if( document[hidden] !== undefined )
		onchange({type: document[hidden] ? "blur" : "focus"});
	})();
}
//------------------------------------------------------------
//text
//------------------------------------------------------------

var transFontCol = null;
var fonts = [];
var currentFont = -1;

/**
 * @constructor
 */
function Font(path, num, img) {
	this.loaded = false;
	this.path = path;
	this.num = num;
	this.charwidth = 0;
	this.charheight = 0;
	this.chars = new Array(256);
	this.img = img;
	this.oimg = img;
}


function LOADFONT(path, num) {
	if (!transFontCol) {
		transFontCol = RGB(0,0,0);
	}
	var image = new Image();
	var font = new Font(path, num, image);
	
	
	//existiert das bild im filesystem?
	image.onerror = function() {
		if (fonts[num]) {
			waitload--;
			fonts[num] = null;
			if (path != "" && path != "0") {
				throwError("Font '"+num+"' '"+path+"' not found!");
			}
		} //else => es wurde schon gelöscht
	};
	//nein, also lade es von der hdd
	image.onload = function () { 
		if (!font.loaded) {
			waitload--;
			font.loaded = true;
			
			try {
				var width = image.width, height = image.height;
				var buf = document.createElement('canvas');
				buf.width = width;
				buf.height = height;
				
				var scrn = new Screen(buf, -42);
				scrn.context.drawImage(image, 0, 0);
				
				//data modifizieren
				var imageData = scrn.context.getImageData(0, 0, width, height);
				
				var data = imageData.data;
				var fx = 0, fy = 0;
				var sizing = true;
				
				var i = 0;
				
				var getCol = function(x, y) {
					return RGB(data[(y*width + x)*4], data[(y*width + x)*4 + 1], data[(y*width + x)*4 + 2]);
				}
				var trans = function(x,y) {
					return data[(y*width + x)*4 + 3];
				}
				
				var charwidth = null, charheight = null;
				var is256 = height > width;
				charwidth = INTEGER(width/16);
				charheight = INTEGER(height/(is256 ? 16 : 8));
				
				
				font.charwidth = charwidth;
				font.charheight = charheight;
				
				for (var y = fy; y < height; y += charheight) {
					for (var x = fx; x < width; x += charwidth) {
						var realwidth = charwidth;
						
						var startx = null, endx = null;
						
						//DO KERNING STUFF \o/
						for (var leftx = x; leftx < x + charwidth; leftx++) {
							var pixel = false;
							for (var tmpy = y; tmpy < y + charheight; tmpy++) {
								if (getCol(leftx, tmpy) != transFontCol) {
									pixel = true;
									break;
								}
							}
							if (pixel) {
								startx = leftx;
								break;
							}
						}
						
						for (var rightx = x + charwidth - 1; rightx > x; rightx--) {
							var pixel = false;
							for (var tmpy = y; tmpy < y + charheight; tmpy++) {
								if (getCol(rightx, tmpy) != transFontCol) {
									pixel = true;
									break;
								}
							}
							if (pixel) {
								endx = rightx;
								break;
							}
						}
						
						if (typeof startx != 'undefined' && typeof endx != 'undefined' && endx >= startx) {
							realwidth = (endx - startx)+1;
						} else {
							realwidth = INTEGER(charwidth/3) - 1;
							startx = x;
						}
						
						font.chars[i] = {
							x: x, y: y,
							//kerning data
							kernx: startx, kernwidth: realwidth,
							width: realwidth+1
						};
						
						i++;
					}
				}
				
				
				
				font.img = removeTransparency(font.img, transFontCol);
			}  catch(ex) {
				//kann keine imagedata holen
				domExceptionError(ex);
			}
		}
	}
	image.src = loadAsset(fileSystem.getCurrentDir() + path);
	
	register(font);
	
	waitload++;
}



function PRINT(text, x, y, kerning) {
	if (currentFont == -1 || !fonts[currentFont].loaded) {
		context.save();
		context.font = "12pt Consolas";
		context.fillStyle	= '#ffffff';
		context.fillText(text, ~~(x+.5), ~~(y+.5)+12);
		context.restore();
	} else {
		context.save();
		x = ~~(x+.5);
		y = ~~(y+.5);
		
		var curposx = 0;
		
		var font = fonts[currentFont];
		for (var i = 0; i < text.length; i++) {
			var pos = text.charCodeAt(i);
			
			if (pos >= font.chars.length) {
				throwError("Unicode unsupported! "+pos);
			}
			var c = font.chars[pos];
			if (!!c && pos > 26) {
				var pos, tex, w;
				if (kerning) {
					pos = x; //-~~(font.charwidth/2+.5)+~~(c.width/2+.5);
					tex = c.kernx;
					w = c.kernwidth;
				} else {
					pos = x;
					tex = c.x;
					w = font.charwidth;
				}
				
				context.drawImage(font.img, tex, c.y, w, font.charheight, pos, y, w, font.charheight);
				
				
				if (kerning) {
					x += c.width;
				} else {
					x += font.charwidth;
				}
			} else {
				x += font.charwidth;
			}
		}
		context.restore();
	}
}

function SETFONT(num) {
	currentFont = num;
}

function KERNLEN(text, len) {
	if (currentFont == -1 || !fonts[currentFont].loaded) {
		throwError("Font not yet loaded - unable to determine length!");
	} else {
		var font = fonts[currentFont];
		var w = 0;
		for (var i = 0; i < text.length; i++) {
			var pos = text.charCodeAt(i);
		
			if (pos >= font.chars.length) {
				throwError("Unicode unsupported! "+pos);
			}
			var c = font.chars[pos];
			
			if (!!c) {
				if (len) {
					w+=c.width;
				} else {
					w+=font.charwidth;
				}
			}
		}
		return w;
	}
}

function GETFONTSIZE(width, height) {
	if (currentFont == -1 || !fonts[currentFont].loaded) {
		throwError("Font not yet loaded - unable to determine length!");
	} else {
		width[0] =  fonts[currentFont].charwidth;
		height[0] = fonts[currentFont].charheight;
	}
}

/* Copyright 2013 Chris Wilson
   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at
       http://www.apache.org/licenses/LICENSE-2.0
   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

/* 
This monkeypatch library is intended to be included in projects that are
written to the proper AudioContext spec (instead of webkitAudioContext), 
and that use the new naming and proper bits of the Web Audio API (e.g. 
using BufferSourceNode.start() instead of BufferSourceNode.noteOn()), but may
have to run on systems that only support the deprecated bits.
This library should be harmless to include if the browser supports 
unprefixed "AudioContext", and/or if it supports the new names.  
The patches this library handles:
if window.AudioContext is unsupported, it will be aliased to webkitAudioContext().
if AudioBufferSourceNode.start() is unimplemented, it will be routed to noteOn() or
noteGrainOn(), depending on parameters.
The following aliases only take effect if the new names are not already in place:
AudioBufferSourceNode.stop() is aliased to noteOff()
AudioContext.createGain() is aliased to createGainNode()
AudioContext.createDelay() is aliased to createDelayNode()
AudioContext.createScriptProcessor() is aliased to createJavaScriptNode()
AudioContext.createPeriodicWave() is aliased to createWaveTable()
OscillatorNode.start() is aliased to noteOn()
OscillatorNode.stop() is aliased to noteOff()
OscillatorNode.setPeriodicWave() is aliased to setWaveTable()
AudioParam.setTargetAtTime() is aliased to setTargetValueAtTime()
This library does NOT patch the enumerated type changes, as it is 
recommended in the specification that implementations support both integer
and string types for AudioPannerNode.panningModel, AudioPannerNode.distanceModel 
BiquadFilterNode.type and OscillatorNode.type.
*/
(function (global, exports, perf) {
  'use strict';

  function fixSetTarget(param) {
    if (!param)	// if NYI, just return
      return;
    if (!param.setTargetAtTime)
      param.setTargetAtTime = param.setTargetValueAtTime; 
  }

  if (window.hasOwnProperty('webkitAudioContext') && 
      !window.hasOwnProperty('AudioContext')) {
    window.AudioContext = webkitAudioContext;

    if (!AudioContext.prototype.hasOwnProperty('createGain'))
      AudioContext.prototype.createGain = AudioContext.prototype.createGainNode;
    if (!AudioContext.prototype.hasOwnProperty('createDelay'))
      AudioContext.prototype.createDelay = AudioContext.prototype.createDelayNode;
    if (!AudioContext.prototype.hasOwnProperty('createScriptProcessor'))
      AudioContext.prototype.createScriptProcessor = AudioContext.prototype.createJavaScriptNode;
    if (!AudioContext.prototype.hasOwnProperty('createPeriodicWave'))
      AudioContext.prototype.createPeriodicWave = AudioContext.prototype.createWaveTable;


    AudioContext.prototype.internal_createGain = AudioContext.prototype.createGain;
    AudioContext.prototype.createGain = function() { 
      var node = this.internal_createGain();
      fixSetTarget(node.gain);
      return node;
    };

    AudioContext.prototype.internal_createDelay = AudioContext.prototype.createDelay;
    AudioContext.prototype.createDelay = function(maxDelayTime) { 
      var node = maxDelayTime ? this.internal_createDelay(maxDelayTime) : this.internal_createDelay();
      fixSetTarget(node.delayTime);
      return node;
    };

    AudioContext.prototype.internal_createBufferSource = AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource = function() { 
      var node = this.internal_createBufferSource();
      if (!node.start) {
        node.start = function ( when, offset, duration ) {
          if ( offset || duration )
            this.noteGrainOn( when || 0, offset, duration );
          else
            this.noteOn( when || 0 );
        };
      } else {
        node.internal_start = node.start;
        node.start = function( when, offset, duration ) {
          if( typeof duration !== 'undefined' )
            node.internal_start( when || 0, offset, duration );
          else
            node.internal_start( when || 0, offset );     
        };
      }
      if (!node.stop) {
        node.stop = function ( when ) {
          this.noteOff( when || 0 );
        };
      } else {
        node.internal_stop = node.stop;
        node.stop = function( when ) {
          node.internal_stop( when || 0 );
        };
      }
      fixSetTarget(node.playbackRate);
      return node;
    };

    AudioContext.prototype.internal_createDynamicsCompressor = AudioContext.prototype.createDynamicsCompressor;
    AudioContext.prototype.createDynamicsCompressor = function() { 
      var node = this.internal_createDynamicsCompressor();
      fixSetTarget(node.threshold);
      fixSetTarget(node.knee);
      fixSetTarget(node.ratio);
      fixSetTarget(node.reduction);
      fixSetTarget(node.attack);
      fixSetTarget(node.release);
      return node;
    };

    AudioContext.prototype.internal_createBiquadFilter = AudioContext.prototype.createBiquadFilter;
    AudioContext.prototype.createBiquadFilter = function() { 
      var node = this.internal_createBiquadFilter();
      fixSetTarget(node.frequency);
      fixSetTarget(node.detune);
      fixSetTarget(node.Q);
      fixSetTarget(node.gain);
      return node;
    };

    if (AudioContext.prototype.hasOwnProperty( 'createOscillator' )) {
      AudioContext.prototype.internal_createOscillator = AudioContext.prototype.createOscillator;
      AudioContext.prototype.createOscillator = function() { 
        var node = this.internal_createOscillator();
        if (!node.start) {
          node.start = function ( when ) {
            this.noteOn( when || 0 );
          };
        } else {
          node.internal_start = node.start;
          node.start = function ( when ) {
            node.internal_start( when || 0);
          };
        }
        if (!node.stop) {
          node.stop = function ( when ) {
            this.noteOff( when || 0 );
          };
        } else {
          node.internal_stop = node.stop;
          node.stop = function( when ) {
            node.internal_stop( when || 0 );
          };
        }
        if (!node.setPeriodicWave)
          node.setPeriodicWave = node.setWaveTable;
        fixSetTarget(node.frequency);
        fixSetTarget(node.detune);
        return node;
      };
    }
  }

  if (window.hasOwnProperty('webkitOfflineAudioContext') && 
      !window.hasOwnProperty('OfflineAudioContext')) {
    window.OfflineAudioContext = webkitOfflineAudioContext;
  }
  
}(window));
//------------------------------------------------------------
//sound
//------------------------------------------------------------
var engines = {
	// this engine is way more flexible, but is not supported by a lot of browsers
	WEBAUDIO: {
		play: function(sound, pan, volume) {
			var curChn = sound.getNextFreeChannel();
			if (!curChn) {
				curChn = sound.buffers[0];
			}
			
			curChn.gainNode = audioContext.createGain();
			curChn.panner = audioContext.createPanner();
			curChn.source = audioContext.createBufferSource();
			
			curChn.source.buffer = curChn.sound.data;
			
			curChn.startTime = null; // used when starting
			curChn.pauseTime = null; // used when pausing
			
			if (sound.loop) {
				curChn.source.loop = true;
			}
			// clear timeout if exists
			if (!!curChn.timeout) {
				clearTimeout(curChn.timeout);
				curChn.timeout = null;
			}
			
			curChn.panner.setPosition(pan, 0, 1 - Math.abs(pan));
			curChn.gainNode.gain.value = volume;
			
			curChn.source.connect(audioContext.destination);
			curChn.gainNode.connect(curChn.panner);
			curChn.panner.connect(audioContext.destination);
			curChn.panner.panningModel = 'equalpower';
			
			curChn.playing = true;
			var startPos = 0;
			if (!!curChn.pauseTime) {
				curChn.startTime = GETTIMERALL() - curChn.pauseTime;
				curChn.source.start(0, startPos = (curChn.pauseTime / 1000));
			} else {
				curChn.startTime = GETTIMERALL();
				curChn.source.start(0);
			}
			
			curChn.timeout = setTimeout(function() {
				soundEngine.stop(curChn);
			}, (curChn.sound.data.duration+1)*1000 - startPos*1000);
			
			return curChn.num;
		},
		setVolume: function(channel, volume) {
			channel.gainNode.gain.value = volume;
		},
		stop: function(channel) {
			if (channel.playing) {
				channel.pauseTime = null;
				channel.startTime = null;
				channel.source.stop(0);
				channel.playing = false;
				
				// clear timeout if exists
				if (!!channel.timeout) {
					clearTimeout(channel.timeout);
					channel.timeout = null;
				}

			}
		},
		pause: function(channel) {
			if (channel.playing) {
				channel.pauseTime = GETTIMERALL() - channel.startTime;
				channel.source.stop(0);
				channel.playing = false;
				
				// clear timeout if exists
				if (!!channel.timeout) {
					clearTimeout(channel.timeout);
					channel.timeout = null;
				}
			}
		},
		load: function(sound) {
			var request = new XMLHttpRequest();
			request.open('GET', sound.file, true);
			request.responseType = 'arraybuffer';

			request.onload = function() {
				audioContext.decodeAudioData(request.response, function(buffer) {
					waitload--;
					sound.loaded = true;
					sound.data = buffer;
					// sound sourcen erstellen
					for (var i = 0; i < sound.buffers.length; i++) {
						var channel = new SoundChannel(sound);
						sound.buffers[i] = channel;
						channel.timeout = null; // when audio is finished
						channel.finishedLoading();
					}
				}, function() {
					waitload--;
					throwError("Could not load WebAudio file.");
				});
			}
			request.send();
		}
	},
	
	// this is more or less the fallback, because it is widely supported
	AUDIO: {
		play: function(sound, pan, volume) {
			var curChn = sound.getNextFreeChannel();
			if (!curChn) {
				curChn = sound.buffers[0];
				soundEngine.stop(curChn);
			}
			if (!volume) volume = curChn.audio.volume;
			if (!pan) pan = 0;
			
			if (curChn.playing) sound.stop(curChn);
			
			curChn.playing = true;
			curChn.audio.volume = volume;
			curChn.audio.pan = pan;
			curChn.audio.play();
			return curChn.num;
		},
		setVolume: function(channel, volume) {
			channel.audio.volume = volume;
		},
		stop: function(channel) {
			if (channel.playing) {
				channel.audio.pause();
				channel.audio.currentTime = 0;
				channel.playing = false;
			}
		},
		pause: function(channel) {
			if (channel.playing) {
				channel.audio.pause();
				channel.playing = false;
			}
		},
		load: function(sound) {
			sound.audio =  new Audio(sound.file);
			sound.audio.autoplay = false;
			sound.audio.load();
			document.body.appendChild( sound.audio );
			
			sound.audio.addEventListener("onerror", function() {
				waitload--;
				if (sound.file != "" && sound.file != "0") {
					throwError("Sound '"+sound.num+"' '"+sound.file+"' not found!");
				}
			}, false);
			sound.audio.addEventListener("canplaythrough", function() {
				if (!sound.loaded) {
					sound.loaded = true;
					waitload--;
					
					//buffer erstellen
					for (var i = 0; i < sound.buffers.length; i++) { 
						(function() {
							var channel = new SoundChannel(sound);
							channel.audio = sound.audio.cloneNode(true);
							channel.audio.load();
							
							channel.audio.addEventListener( 'canplaythrough', function() {
								channel.finishedLoading();
							}, false );
							channel.audio.addEventListener("ended", function() {
								channel.finishedPlaying();
							}, false);
							
							sound.buffers[i] = channel;
						})();
					}
					
					
				}
			}, false);
		}
	}
};



var audioContext;
var soundEngine // which sound engine is currently being used
var sounds = [];
var soundChannels = [ ];
var music = null, musicVolume = 1;

function initSoundEngine() {
	try {
		audioContext = new AudioContext();
		audioContext.listener.setPosition(0,0,0);
	} catch(e) {
		audioContext = null;
	}
	
	soundEngine =  !!audioContext ? engines.WEBAUDIO : engines.AUDIO;
	
	initSoundEngine = null;
}

/**
* @constructor
*/
function Sound(file, num, buffer) {
	this.file = file;
	this.num = num;
	this.buffer = buffer;
	this.music = false;
	this.loop = false;
	this.loaded = false;
	this.buffers = [ ];
	this.buffers.length = this.buffer;
	
	soundEngine.load(this);
	waitload++;
}
Sound.prototype.getNextFreeChannel = function() {
	var curChn = null;
	for (var i = 0; i < this.buffers.length; i++) {
		if (!this.buffers[i].playing) {
			curChn = this.buffers[i];
			break;
		}
	}
	return curChn;
}


/**
* @constructor
*/
function SoundChannel(sound) {
	this.sound = sound;
	this.playing = false;
	this.loaded = false;
	
	this.id = null;
	// find next free channel ID
	for (var i = 0; i < soundChannels.length; i++) {
		if (!soundChannels[i]) {
			this.id = i;
			break;
		}
	}
	if (!this.id) {
		this.id = soundChannels.length;
		soundChannels.length++;
	}
	
	soundChannels[this.id] = this;
}

SoundChannel.prototype.finishedLoading = function() {
	if (!this.loaded) {
		this.loaded = true;
		if (this.sound.music) {
			soundEngine.setVolume(this, musicVolume);
			
			var that = this;
			setTimeout(function() {
				 soundEngine.play(that.sound, 0, musicVolume);
			}, 0);
		}
	}
}
SoundChannel.prototype.finishedPlaying = function() {
	this.playing = false;
	if (this.sound.loop) {
		var that = this;
		setTimeout(function() {
			soundEngine.play(that.sound, 0, musicVolume);
		}, 0);
	}
}

function LOADSOUND(file, num, buffer) {
	if (initSoundEngine) initSoundEngine();
	
	if (file === "") {
		// TODO: free up
	} else {
		var ass = loadAsset(file);
		
		if (ass == file) {
			var fileName = REPLACE_Str(MID_Str(file, MAX(0, file.lastIndexOf('/')), -1),"/","");
			file = REPLACE_Str(file, fileName, ".html5_convertedsounds_"+fileName)+"/";
			
			if (usedSoundFormat == 'ogg') {
				file +="sound.ogg";
			} else { //mp3
				file +="sound.mp3";
			}
			file = "./"+file;
		} else {
			file = ass;
		}
		if (buffer <= 0) throwError("LOADSOUND buffer size must not be 0");
		
		var sound = new Sound(file, num, buffer);
		register(sound);
	}
}

function PLAYSOUND(num, pan, volume) {
	var s = sounds[num];
	if (!!s) {
		if (s.loaded) {
			return soundEngine.play(s, pan, volume);
		} else {
			return -1;
		}
	} else {
		throwError("Attempt to play unavailable sound '"+num+"'");
	}
}

function HUSH() {
	for (var i = 0; i < soundChannels.length; i++) {
		if (!!soundChannels[i]&& soundChannels[i].playing) soundChannels[i].stop();
	}
}

function SOUNDPLAYING(chn) {
	return (!!soundChannels[chn] && soundChannels[chn].playing ) ? 0 : 1;
}

function PLAYMUSIC(file, loop) {
	if (initSoundEngine) initSoundEngine();
	
	if (file === "") {
		// TODO: free up
	} else {
		var ass = loadAsset(file);
		if (ass == file) {
			var fileName = REPLACE_Str(MID_Str(file, MAX(0, file.lastIndexOf('/')), -1),"/","");
			file = REPLACE_Str(file, fileName, ".html5_convertedsounds_"+fileName)+"/";
			
			if (usedSoundFormat == 'ogg') {
				file +="sound.ogg";
			} else { //mp3
				file +="sound.mp3";
			}
			file = "./"+file;
		} else {
			file = ass;
		}
		
		music = new Sound(file, -42, 1);
		
		music.loop = loop;
		music.music = true;
	}
	
}

function STOPMUSIC() {
	soundEngine.stop(music.buffers[0]);
}

function ISMUSICPLAYING() {
	return music.buffers[0].playing ? 1 : 0;
}

function PAUSEMUSIC(pause) {
	soundEngine.stop(music.buffers[0]);
}

function MUSICVOLUME(vol) {
	musicVolume = vol;
	if (!!music.loaded) {
		soundEngine.setVolume(music.buffers[0], vol);
	}
}

//------------------------------------------------------------
//input
//------------------------------------------------------------

var currentMouse= 0;


//Mouse/Touch Input
var anyKeyPress = false;	//Wurde eine Taste gedrückt?
var anyMousePress = false;	//Wurde eine Mouse gedrückt?

var globalSpeedX, globalSpeedY; //für HIBERNATE
var touches		= [];
var touchable	= document ? ('createTouch' in document) : false;

var gamepads;

/**
* @constructor
*/
function Touch() {
	this.lastx 	= 0;
	this.lasty 	= 0;
	this.speedx = 0;
	this.speedy = 0;
	
	this.x = 0;
	this.y = 0;
	
	this.left	= false;
	this.right 	= false;
	this.middle = false;
	this.wheel 	= 0;
	this.reallywheel = 0;
	
	this.identifier = null; // used by touch API
}
Touch.prototype.applyTouch = function(touch) {
	this.left = true;
	this.identifier = touch.identifier;
	this.x = touch.pageX - canvasOffsetLeft;
	this.y = touch.pageY - canvasOffsetTop;
}

function findTouchIndexByIdentifier(identifier) {
	for (var i = 0; i < touches.length; i++) {
		if (touches[i].identifier == identifier) {
			return i;
		}
	}
	return -1;
}

function updateTouches(t, state) {
	anyMousePress = false;
	if (t) {
		switch(state) {
			case 'start':
				//falls neue tasten => draufhauen
				for (var i = 0; i < t.length; i++) {
					var tmp = t[i];
					var touch = tmp.identifier != 0 ? new Touch() : touches[0];
					touch.applyTouch(tmp);
					if (tmp.identifier != 0) touches.push(touch);
				}
				break;
			case 'end':
				//Alle Tasten zurücksetzen
				for (var i = 0; i < t.length; i++) {
					var tmp = t[i];
					var touchid = findTouchIndexByIdentifier(tmp.identifier);
					if (tmp.identifier != 0) {
						if (touchid >= 0) {
							touches.splice(touchid, 1);
						}
					} else {
						touches[0].left = false;
					}
				}
				break;
			case 'move':
				//Nun die gedrückten Tasten setzen
				for (var i = 0; i < t.length; i++) {
					var tmp = t[i];
					var touchid = findTouchIndexByIdentifier(tmp.identifier);
					if (touchid >= 0) {
						touches[touchid].applyTouch(tmp);
					}
				}
				break;
		}
	} else {
		globalSpeedX = 0;
		globalSpeedY = 0;
		
		for (var i = 0; i <touches.length;i++) {
			var touch = touches[i];
			if (!!touch) {
				touch.reallywheel = touch.wheel
				touch.wheel = 0;
				
				touch.speedx = (touch.x - touch.lastx);
				touch.speedy = (touch.y - touch.lasty);
				
				globalSpeedX += touch.speedx;
				globalSpeedY += touch.speedy;
				
				touch.lastX = touch.x;
				touch.lastY = touch.y;
				
				if (touch.left || touch.right || touch.middle) {
					anyMousePress = true;
				}
			}
		}
	}
}

// GAMEPAD
function GETNUMJOYSTICKS() {
	if (!!gamepads) {
		return gamepads.length;
	} else return 0;
}

function GETJOYNAME_Str(n) {
	return gamepads[n].id;
}

function GETJOYX(n) {
	return gamepads[n].axes[0];
}

function GETJOYY(n) {
	return gamepads[n].axes[1];
}

function GETJOYZ(n) {
	return 0; // umimplemented
}

function GETJOYRX(n) {
	return gamepads[n].axes[2];
}

function GETJOYRY(n) {
	return gamepads[n].axes[3];
}

function GETJOYRZ(n) {
	return 0;
}

function GETJOYBUTTON(n, m) {
	return gamepads[n].buttons[m];
}

function GETDIGIX(n) {
	return gamepads[n].buttons[15]-gamepads[n].buttons[14];
}

function GETDIGIY(n) {
	return gamepads[n].buttons[13]-gamepads[n].buttons[12];
}

// stuff
function MOUSEAXIS(info) {
	if (currentMouse >= 0 && currentMouse < touches.length) {} else {
		return;
	}
	var t = touches[currentMouse];
	switch(info) {
		case 0:
			return t.speedx;
		case 1:
			return t.speedy;
		case 2:
			return t.reallywheel;
		case 3:
			return t.left ? 1 : 0;
		case 4:
			return t.right ? 1 : 0;
		case 5:
			return t.middle ? 1 : 0;
	}
}

function SETACTIVEMOUSE(mouse) {
	currentMouse = mouse;
	if (mouse < 0 || mouse >= touches.length) throwError("Invalid mouse index '"+mouse+"' max: '"+touches.length+"'");
}

function GETMOUSECOUNT() {
	return touches.length;
}

function MOUSESTATE(x, y, ml, mr) {
	if (currentMouse >= 0 && currentMouse < touches.length) {} else {
		return;
	}
	var t = touches[currentMouse];
	x[0] 	= t.x
	y[0] 	= t.y;
	ml[0]	= t.left ? 1 : 0;
	mr[0]	= t.right ? 1 : 0;
}

function SYSTEMPOINTER(show) {
	if (show) {
		canvas.style.cursor = '';
	} else {
		canvas.style.cursor = 'none';
	}
}

function KEY(key) {
	key = ott2jsKeyCode(key);
	return keyInput[key] ? 1 : 0;
}

function ott2jsKeyCode(key) {
	switch(key) {
		case 14:
			return 8;
		case 15:
			return 9;
		case 28:
			return 13;
		case 42:
			return 16;
		case 29:
		case 157:
			return 17;
		case 56:
		case 29: //ALT GR
		case 184: //ALT GR
			return 18;
		case 197:
			return 19;
		case 58:
			return 20;
		case 1:
			return 27;
		case 201:
			return 33;
		case 57:
			return 32;
		case 209:
			return 34;
		case 207:
			return 35;
		case 178:
			return 36;
		case 203:
			return 37;
		case 200:
			return 38;
		case 205:
			return 39;
		case 208:
			return 40;
		case 183:
			return 44;
		case 210:
			return 45;
		case 211:
			return 46;
		case 11:
			return 48;
		case 2:
			return 49;
		case 3:
			return 50;
		case 4:
			return 51;
		case 5:
			return 52;
		case 6:
			return 53;
		case 7:
			return 54;
		case 8:
			return 55;
		case 9:
			return 56;
		case 10:
			return 57;
		case 30:
			return 65;
		case 48:
			return 66;
		case 46:
			return 67;
		case 32:
			return 68;
		case 18:
			return 69;
		case 33:
			return 70;
		case 34:
			return 71;
		case 35:
			return 72;
		case 23:
			return 73;
		case 36:
			return 74;
		case 37:
			return 75;
		case 38:
			return 76;
		case 50:
			return 77;
		case 49:
			return 78;
		case 24:
			return 79;
		case 25:
			return 80;
		case 16:
			return 81;
		case 19:
			return 82;
		case 31:
			return 83;
		case 20:
			return 84;
		case 22:
			return 85;
		case 47:
			return 86;
		case 17:
			return 87;
		case 45:
			return 88;
		case 44:
			return 89;
		case 21:
			return 90;
		case 219:
			return 91;
		case 220:
			return 92;
		//case KEY_SELECT = 93:
		//	return 93;
		case 82:
			return 96;
		case 79:
			return 97;
		case 80:
			return 98;
		case 81:
			return 99;
		case 75:
			return 100;
		case 76:
			return 101;
		case 77:
			return 102;
		case 71:
			return 103;
		case 72:
			return 104;
		case 73:
			return 105;
		case 55:
			return 106;
		case 78:
			return 107;
		case 74:
			return 109;
		case 83:
			return 110;
		case 181:
			return 111;
		case 59:
			return 112;
		case 60:
			return 113;
		case 61:
			return 114;
		case 62:
			return 115;
		case 63:
			return 116;
		case 64:
			return 117;
		case 65:
			return 118;
		case 66:
			return 119;
		case 67:
			return 120;
		case 68:
			return 121;
		case 87:
			return 122;
		case 88:
			return 123;
		case 69:
			return 144;
		case KEY_SCROLLLOCK= 145:
			return 70;
	}
}

function INKEY_Str() {
	var k = lastKey;
	lastKey = "";
	return k;
}

function ANYKEY() {
	return anyKeyPress ? 1 : 0;
}

function ANYMOUSE() {
	return anyMousePress ? 1 : 0;
}
//------------------------------------------------------------
//Basic classes (Sprite, Screen, etc)
//------------------------------------------------------------

var sprites		= []; 		//Alle Sprites im Array

/**
* @constructor
*/
function Sprite(img, num) {
	this.img = img;
	this.oimg = img;
	this.num = num;
	this.data = null;
	this.loaded = false;
	this.tint = null; //Hat es das tinting?
	
	this.frames = null;
	this.frameWidth = -1;
	this.frameHeight = -1;
}

function getSprite(num, notstrict) {
	if (!!sprites[num]) {
		if (!sprites[num].loaded) throwError("Image not yet loaded '"+num+"'");
		return sprites[num];
	} else {
		if (!notstrict) {
			throwError("Image not available '"+num+"'");
		} else {
			return null;
		}
	}
}


//------------------------------------------------------------
// sprite loading
//------------------------------------------------------------

function LOADSPRITE(path, num) {
	var image = new Image();
	var spr = new Sprite(image, num);
	//existiert das bild im filesystem?

	image.onerror = function() {
		if (sprites[num]) {
			waitload--;
			sprites[num] = null;
			if (path != "" && path != "0") {
				throwError("Image '"+num+"' '"+path+"' not found!");
			}
		} //else => es wurde schon gelöscht
	};
	//nein, also lade es von der hdd
	image.onload = function () { 
		if (!spr.loaded) {
			waitload--;
			spr.loaded = true;
			
			updateFrames(num);
			
			//transparency rauslöschen
			try {
				if (typeof transCol != 'undefined' && !!transCol) {
					spr.img = removeTransparency(spr.oimg);
				}
			}  catch(ex) {
				//kann keine imagedata holen
				domExceptionError(ex);
			}
			//on sprite loaded rufen
			
		}
	}
	image.src = loadAsset(fileSystem.getCurrentDir() + path);
	
	register(spr);
	
	waitload++;
}


function SETSPRITEANIM(num, frmw, frmh) {
	var spr = sprites[num];
	if (!spr) throwError("Cannot SETSPRITEANIM to unloaded sprite '"+num+"'");
	spr.frames = null;
	if (frmw && frmh) {
		//animation!
		spr.frameWidth = frmw;
		spr.frameHeight = frmh;
	} else {
		spr.frameWidth = -1;
		spr.frameHeight = -1;
	}
	
	if (spr.loaded) {
		//direkt updaten!
		updateFrames(num);
	}
}

function updateFrames(num) {
	//nun die frames in das sprite
	var spr = getSprite(num);
	if (spr.frameWidth != -1 && spr.frameHeight != -1) {
		spr.frameWidth = MAX(MIN(spr.frameWidth, spr.img.width), 0);
		spr.frameHeight = MAX(MIN(spr.frameHeight, spr.img.height), 0);
		
		spr.frames = [];
		var i = 0;
		for (var y = 0; y < spr.img.height; y+= spr.frameHeight) {
			for (var x = 0; x < spr.img.width; x += spr.frameWidth) {
				spr.frames.push({posx: x, posy: y, data: null});
			}
		}
	}
}

function LOADANIM(path,num, width, height) {
	LOADSPRITE(path, num, width, height);
	SETSPRITEANIM(num, width, height);
}


function MEM2SPRITE(pixels, num, width, height) {
	try {
		opt_MEM2SPRITE(pixels, num, width, height);
	} catch(ex) {
		//kann keine imagedata holen
		return 0;
	}
	return 1;
}

function opt_MEM2SPRITE(pixels,num,width,height) {
	var buf = document.createElement('canvas');
	buf.width = width;
	buf.height = height;
	var spr = new Sprite(buf, num);
	register(spr);
	spr.loaded = true;
	var scrn = new Screen(buf, -42);
	
	var isref = pixels.deval instanceof Array;
	var imageData = scrn.context.getImageData(0,0,width, height);
	var data = imageData.data;
	for (var x = 0; x < width; x++) {
		for (var y = 0; y < height; y++) {
			var pos = x + y*width;
			var p = pixels.arrAccess(pos).values[tmpPositionCache];
			if (isref) p = p[0]; // Dereferenzieren, falls notwendig
			
			var a = (p & 0xFF000000)/0x1000000;
			var b = (p & 0xFF0000)/0x10000;
			var g = (p & 0xFF00)/0x100;
			var r =  p & 0xFF;
			
			if (a === -1) a = 255;
			
			pos *= 4;
			data[pos]   = r; 
			data[pos+1] = g;
			data[pos+2] = b;
			data[pos+3] = a;
		}
	}
	scrn.context.putImageData(imageData, 0, 0);
}

function SPRITE2MEM(pixels, num) {
	try {
		opt_SPRITE2MEM(pixels, num);
	}  catch(ex) {
		return 0;
	}
	
	return 1;
}

function opt_SPRITE2MEM(pixels, num) {
	var isref = pixels.deval instanceof Array;
	
	var spr = getSprite(num);
	if (isref)
		DIM(pixels, [spr.img.width*spr.img.height], [0]);
	else
		DIM(pixels, [spr.img.width*spr.img.height], 0);
	
	var width = spr.img.width, height = spr.img.height;
	var buf = document.createElement('canvas');
	buf.width = width;
	buf.height = height;
	
	var scrn = new Screen(buf, -42);
	scrn.context.drawImage(spr.img, 0, 0);
	
	
	var imageData = scrn.context.getImageData(0, 0, width, height);
	
	for (var y = 0; y < height; y++) {
		var inpos = y * width * 4; // *4 for 4 ints per pixel
		for (var x = 0; x < width; x++) {
			var r = imageData.data[inpos++];
			var g = imageData.data[inpos++];
			var b = imageData.data[inpos++];
			var a = imageData.data[inpos++];
			var v = a*0x1000000 + b*0x10000 + g*0x100 + r;
			if (isref)
				v = [v];
			pixels.arrAccess(x + y*width).values[tmpPositionCache] = v
		}
	}
}

function LOADSPRITEMEM(file, w, h, pixels) {
	throwError("TODO: loadspritemem");
}


//------------------------------------------------------------
// poly functions
//------------------------------------------------------------

var inPoly = false;
var num, mode;
var polyStack = [];
var tmpPolyStack = new Array(2);

function ENDPOLY() {
	if (!inPoly) throwError("ENDPOLY has to be in STARTPOLY - ENDPOLY ");
	var plzTint = false;
	if (polyStack.length > 0) {
		//schließen!
		if (polyStack.length === 4) {
			POLYNEWSTRIP();
		} else {
			context.save();
			//Zeichnen
			if (mode === 1) {
				if ((polyStack.length % 3) != 0) throwError("Polyvector cannot draw non power of 3 triangles");
				var spr = getSprite(num, true);
				for (var i = 0; i < polyStack.length; i+=3) {
					if (!spr) {
						context.beginPath();
						context.moveTo(polyStack[i].x, polyStack[i].y);
						context.lineTo(polyStack[i+1].x, polyStack[i+1].y);
						context.lineTo(polyStack[i+2].x, polyStack[i+2].y);
						context.closePath();
						context.fillStyle	= formatColor(polyStack[0].col);
						context.fill();
					} else {
						tmpPolyStack[0] = polyStack[i];
						tmpPolyStack[1] = polyStack[i+1];
						tmpPolyStack[2] = polyStack[i+2];
						
						if (tmpPolyStack[0].col !== whiteRGB && tmpPolyStack[1].col !== whiteRGB && tmpPolyStack[2].col !== whiteRGB) {
							plzTint = true;
						} else {
							plzTint = false;
						}
						
						drawPolygon(plzTint, drawingtris[0], tmpPolyStack, spr);
					}
				}
			} else if (mode === 0) {
				if ((polyStack.length % 3) != 0) throwError("Polyvector cannot draw non power of 3 triangles");
				var spr = getSprite(num, true);
				for (var i = 0; i < polyStack.length-1; i++) {
					if (!spr) {
						context.beginPath();
						context.moveTo(polyStack[0].x, polyStack[0].y);
						context.lineTo(polyStack[i].x, polyStack[i].y);
						context.lineTo(polyStack[i+1].x, polyStack[i+1].y);
						context.closePath();
						context.fillStyle	= formatColor(polyStack[0].col);
						context.fill();
					} else {
						tmpPolyStack[0] = polyStack[0];
						tmpPolyStack[1] = polyStack[i];
						tmpPolyStack[2] = polyStack[i+1];
						if (tmpPolyStack[0].col !== whiteRGB && tmpPolyStack[1].col !== whiteRGB && tmpPolyStack[2].col !== whiteRGB) {
							plzTint = true;
						} else {
							plzTint = false;
						}
						drawPolygon(plzTint, drawingtris[0], tmpPolyStack, spr);
					}
				}
			} else if (mode === 2) {
				throwError("Unimplemented ENDPOLY drawing mode: 2");
			} else {
				throwError("Unknown draw mode.");
			}
			context.restore();
		}
		polyStack.length = 0;
	}
	
	inPoly = false;
	
	context.restore();
}

var drawingtris = [
	[[0, 1, 2]],
	[[0, 1, 2], [2, 3, 0]],
	[[0, 1, 2], [2, 1, 3]]
];

function POLYNEWSTRIP() {
	if (!inPoly) throwError("POLYNEWSTRIP has to be in STARTPOLY - ENDPOLY ");
		
	context.save();
	if (num === -1) {
		//use pure html5!
		context.fillStyle = formatColor(polyStack[0].col);
		context.beginPath();
		context.moveTo(0, 0);
		for (var i = 0; i <polyStack.length; i++) {
			context.lineTo(~~(polyStack[i].x+.5), ~~(polyStack[i].y+.5));
		}
		context.closePath();
		context.fill();
		polyStack.length=0;
	} else {
		//use the texture!
		//got code from: http://stackoverflow.com/questions/4774172/image-manipulation-and-texture-mapping-using-html5-canvas Thanks, you saved my life!!
		var spr = getSprite(num);
		
		//muss das sprite gefärbt werden?
		var plzTint;
		if (polyStack[0].col !== whiteRGB && polyStack[1].col !== whiteRGB && polyStack[2].col !== whiteRGB  && (polyStack.length > 2 ? polyStack[3].col !== whiteRGB : true)) {
			plzTint = true;
		} else {
			plzTint = false;
		}
		
		
		drawPolygon(plzTint, drawingtris[mode], polyStack, spr);
	}
	
	context.restore();
	
	polyStack.length = 0; //anstatt = []
}

function drawPolygon(plzTint, tris, polyStack, spr) {
	try {
		opt_drawPolygon(plzTint, tris, polyStack, spr)
	} catch (ex) {
		domExceptionError(ex);
	}
}

function opt_drawPolygon(plzTint, tris, polyStack, spr) {
	if (plzTint) {
		var tmpAlpha = context.globalAlpha;
		var tmpOperation = context.globalCompositeOperation;
	}
	
	if (plzTint) {
		//schauen ob alle gleiche Farbe haben
		var col;
		if (!(polyStack[0].col === polyStack[1].col && polyStack[1].col === polyStack[2].col && (polyStack.length > 3 && polyStack[2].col === polyStack[3].col))) {
			plzTint = false;
		} else {
			col = polyStack[0];
			if (!spr.tint) {
				//Hat noch nicht die Tinting Farbchannel
				spr.tint = generateRGBKs(spr.img);
			}
			
			var red = ((polyStack[0].col & 0xFF0000)/0x10000)/255.0;
			var green = ((polyStack[0].col & 0xFF00)/0x100)/255.0;
			var blue = (polyStack[0].col & 0xFF)/255.0;
		}
	}
	
	var pts = polyStack
	for (var t=0; t<tris.length; t++) {
		var pp = tris[t];
		var x0 = pts[pp[0]].x, x1 = pts[pp[1]].x, x2 = pts[pp[2]].x;
		var y0 = pts[pp[0]].y, y1 = pts[pp[1]].y, y2 = pts[pp[2]].y;
		var u0 = pts[pp[0]].u, u1 = pts[pp[1]].u, u2 = pts[pp[2]].u;
		var v0 = pts[pp[0]].v, v1 = pts[pp[1]].v, v2 = pts[pp[2]].v;

		// Compute matrix transform
		var delta = u0*v1 + v0*u2 + u1*v2 - v1*u2 - v0*u1 - u0*v2;
		var delta_a = x0*v1 + v0*x2 + x1*v2 - v1*x2 - v0*x1 - x0*v2;
		var delta_b = u0*x1 + x0*u2 + u1*x2 - x1*u2 - x0*u1 - u0*x2;
		var delta_c = u0*v1*x2 + v0*x1*u2 + x0*u1*v2 - x0*v1*u2
					  - v0*u1*x2 - u0*x1*v2;
		var delta_d = y0*v1 + v0*y2 + y1*v2 - v1*y2 - v0*y1 - y0*v2;
		var delta_e = u0*y1 + y0*u2 + u1*y2 - y1*u2 - y0*u1 - u0*y2;
		var delta_f = u0*v1*y2 + v0*y1*u2 + y0*u1*v2 - y0*v1*u2
					  - v0*u1*y2 - u0*y1*v2;
		
		// Set clipping area so that only pixels inside the triangle will
		// be affected by the image drawing operation
		context.save();
		context.beginPath(); context.moveTo(x0, y0); context.lineTo(x1, y1);
		context.lineTo(x2, y2); context.closePath(); context.clip();
		
		// Draw the transformed image
		delta = delta === 0 ? 1 : delta;
		context.transform(delta_a/delta, delta_d/delta,
					  delta_b/delta, delta_e/delta,
					  delta_c/delta, delta_f/delta);
		
		if (plzTint && spr.tint) {
			context.globalAlpha = 1;
			context.globalCompositeOperation = 'copy';
			context.drawImage( spr.tint[3], 0, 0 );

			context.globalCompositeOperation = 'lighter';
			if ( red > 0 ) {
				context.globalAlpha = red;
				context.drawImage( spr.tint[0], 0, 0 );
			}
			if ( green > 0 ) {
				context.globalAlpha = green;
				context.drawImage( spr.tint[1], 0, 0 );
			}
			if ( blue > 0 ) {
				context.globalAlpha = blue;
				context.drawImage( spr.tint[2], 0, 0 );
			}
		} else {
			context.drawImage(spr.img, 0, 0);
		}
		context.restore();
	}
	if (plzTint) {
		context.globalAlpha = tmpAlpha;
		context.globalCompositeOperation = tmpOperation;
	}
}

function POLYVECTOR(posx, posy, tx, ty, color) {
	if (!inPoly) throwError("POLYVECTOR has to be in STARTPOLY - ENDPODRAWANIMLY ");
	
	if (polyStack[polyStack.length] !== undefined) {
		//existiert bereits!
		polyStack[polyStack.length].x = ~~(posx);
		polyStack[polyStack.length].y = ~~(posy);
		polyStack[polyStack.length].u = tx;
		polyStack[polyStack.length].v = ty;
		polyStack[polyStack.length].col = color;
		polyStack.length++;
	} else {
		//existiert noch nicht!
		polyStack.push({
			x: posx, y: posy, u: tx, v: ty, col: color
		});
	}
}

function STARTPOLY(n, m) {
	if (inPoly) throwError("STARTPOLY has not to be in STARTPOLY - ENDPOLY ");
	inPoly = true;
	polyStack.length = 0;
	num = n;
	mode = m;
	
	context.save();
}

//------------------------------------------------------------
//Sprite Rendering
//------------------------------------------------------------

function GENSPRITE() {
	for (var i = 0; i < sprites.length; i++) {
		if (!sprites[i]) return i;
	}
	return sprites.length;
}

function DRAWSPRITE(num, x, y) {
	var spr = getSprite(num);
	context.drawImage(spr.img, ~~(x+.5), ~~(y+.5));
}

function ROTOSPRITE(num, x, y, phi) {
	if ((phi%360) === 0) {
		DRAWSPRITE(num, x, y);
	} else {
		context.save();
		var spr = getSprite(num);
		context.translate(x+spr.img.width/2, y+spr.img.height/2);
		context.rotate(phi * Math.PI / 180); //convert into RAD
		DRAWSPRITE(num, -spr.img.width/2, -spr.img.height/2);
		context.restore();
	}
}

function ZOOMSPRITE(num, x, y, sx, sy) {
	if (sx === 0 || sy === 0) return;

	context.save();
	var spr = getSprite(num);
	var dx = 0, dy = 0
	// doc is wrong, it is mid handled
	
	if (sx < 0) dx = -spr.img.width*sx;
	if (sy < 0) dy = -spr.img.height*sy;
	
	if (sx > 0) dx = spr.img.width*sx;
	if (sy > 0) dy = spr.img.height*sy;
	
	
	context.translate(x + dx/2,y + dy/2);
	context.scale(sx, sy);
	context.translate(-dx/2, -dy/2);
	DRAWSPRITE(num, 0, 0);
	context.restore();
}

function STRETCHSPRITE(num,  x, y, width, height) {
	var spr = getSprite(num);
	if (width !== 0 && height !== 0) {
		context.save();
		var sx = width/spr.img.width, sy = height/spr.img.height;
		context.translate(x, y);
		context.scale(sx, sy);
		DRAWSPRITE(num, 0, 0);
		context.restore();
	}
}

function ROTOZOOMSPRITE(num, x, y,phi, scale) {
	context.save();
	var spr = getSprite(num);
	context.translate(x+spr.img.width*scale, y+spr.img.height*scale)
	context.scale(scale, scale);
	ROTOSPRITE(num, 0, 0, phi);
	context.restore();
}

function DRAWANIM(num, frame, x, y) {
	var spr = getSprite(num);
	if (spr.frames === undefined) throwError("DRAWANIM can only draw an animation!");
	frame = frame % spr.frames.length;
	if (frame < 0) throwError("Invalid frame '"+frame+"'");
	context.drawImage(spr.img, ~~(spr.frames[frame].posx+.5), ~~(spr.frames[frame].posy+.5), spr.frameWidth, spr.frameHeight, ~~(x + .5), ~~(y + .5), spr.frameWidth, spr.frameHeight);
}

function ROTOZOOMANIM(num, frame, x, y,phi, scale) {
	context.save();
	var spr = getSprite(num);
	context.translate(x+spr.frameWidth*scale, y+spr.frameHeight*scale)
	context.scale(scale, scale);
	ROTOANIM(num, frame, 0, 0, phi);
	context.restore();
}

function ROTOANIM(num, frame, x, y, phi) {
	if ((phi%360) === 0) {
		DRAWANIM(num, frame, x, y);
	} else {
		context.save();
		var spr = getSprite(num);
		context.translate(x+spr.frameWidth/2, y+spr.frameHeight/2);
		context.rotate(phi * Math.PI / 180); //convert into RAD
		DRAWANIM(num, frame, -spr.frameWidth/2, -spr.frameHeight/2);
		context.restore();
	}
}

function ZOOMANIM(num,frame, x, y, sx, sy) {
	if (sx === 0 || sy === 0) return;

	context.save();
	var spr = getSprite(num);
	var dx = 0, dy = 0
	// doc is wrong, it is mid handled
	
	if (sx < 0) dx = -spr.frameWidth*sx;
	if (sy < 0) dy = -spr.frameHeight*sy;
	
	if (sx > 0) dx = spr.frameWidth*sx;
	if (sy > 0) dy = spr.frameHeight*sy;
	
	
	context.translate(x + dx/2,y + dy/2);
	context.scale(sx, sy);
	context.translate(-dx/2, -dy/2);
	DRAWANIM(num,frame, 0, 0);
	context.restore();
}

function STRETCHANIM(num,frame,  x, y, width, height) {
	var spr = getSprite(num);
	if (width !== 0 && height !== 0) {
		context.save();
		var sx = width/spr.frameWidth, sy = height/spr.frameHeight;
		context.translate(x, y);
		context.scale(sx, sy);
		DRAWANIM(num,frame, 0, 0);
		context.restore();
	}
}

function GRABSPRITE(num, x, y, width, height) {
	if (width < 1 || height < 1) throwError("Invalid width/height!");
	try {
		opt_GRABSPRITE(num,x,y,width,height);
	}  catch(ex) {
		//kann keine imagedata holen
		domExceptionError(ex);
	}
}

function opt_GRABSPRITE(num, x, y, width, height) {
	var data = context.getImageData(x, y, width, height);
	var canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	var ctxt = canvas.getContext("2d");
	ctxt.putImageData(data, 0, 0);
	
	var spr = new Sprite(canvas, num);
	spr.loaded = true;
	register(spr);
}

/**
 * @author Joseph Lenton - PlayMyCode.com
 *
 * @param img the image with tinting
 */
function generateRGBKs( img ) {
	var w = img.width;
	var h = img.height;
	var rgbks = [];

	var canvas = document.createElement("canvas");
	canvas.width = w;
	canvas.height = h;

	var ctx = canvas.getContext("2d");
	ctx.drawImage( img, 0, 0 );

	var pixels = ctx.getImageData( 0, 0, w, h ).data;

	// 4 is used to ask for 3 images: red, green, blue and
	// black in that order.
	for ( var rgbI = 0; rgbI < 4; rgbI++ ) {
		var canvas = document.createElement("canvas");
		canvas.width  = w;
		canvas.height = h;

		var ctx = canvas.getContext('2d');
		ctx.drawImage( img, 0, 0 );
		var to = ctx.getImageData( 0, 0, w, h );
		var toData = to.data;

		for (
				var i = 0, len = pixels.length;
				i < len;
				i += 4
		) {
			toData[i  ] = (rgbI === 0) ? pixels[i  ] : 0;
			toData[i+1] = (rgbI === 1) ? pixels[i+1] : 0;
			toData[i+2] = (rgbI === 2) ? pixels[i+2] : 0;
			toData[i+3] =                pixels[i+3]    ;
		}

		ctx.putImageData( to, 0, 0 );

		// image is _slightly_ faster then canvas for this, so convert
		var imgComp = new Image();
		imgComp.src = canvas.toDataURL();

		rgbks.push( canvas );
	}

	return rgbks;
}
//------------------------------------------------------------
//collision
//------------------------------------------------------------

function SPRCOLL(spr1, x1, y1, spr2, x2, y2) {
	var s1, s2;
	s1 = getSprite(spr1);
	s2 = getSprite(spr2);
	
	
	if (!s1.data || !s2.data) {
		var getMyData = function(s) {
			//oha get the data!
			try {
				var canvas = document.createElement('canvas');
				canvas.width = s.img.width;
				canvas.height = s.img.height;
				var context = canvas.getContext("2d");
				
				context.drawImage(s.img, 0, 0);
				s.data = context.getImageData(0, 0, canvas.width, canvas.height);
			} catch (ex) {
				domExceptionError(ex);
			}
		}
		
		if (s1.data == null) {
			getMyData(s1);
		}
		if (s2.data == null) {
			getMyData(s2);
		}
	}
	
	return isPixelCollision(s1.data, x1, y1, s2.data, x2, y2) ? 1 : 0;
}

function ANIMCOLL(ani1, tile1, x1, y1, ani2, tile2, x2, y2) {
	var s1, s2;
	s1 = getSprite(ani1);
	s2 = getSprite(ani2);
	
	
	if (!s1.frames[tile1].data || !s2.frames[tile2].data) {
		var getMyData = function(s, frame) {
			//oha get the data!
			try {
				var canvas = document.createElement('canvas');
				canvas.width = s.img.width;
				canvas.height = s.img.height;
				var context = canvas.getContext("2d");
				
				context.drawImage(s.img, 0, 0);
				frame.data = context.getImageData(frame.posx, frame.posy, s.frameWidth, s.frameHeight);
			} catch (ex) {
				domExceptionError(ex);
			}
		}
		
		if (!s1.frames[tile1].data) {
			getMyData(s1, s1.frames[tile1]);
		}
		if (!s2.frames[tile2].data) {
			getMyData(s2, s2.frames[tile2]);
		}
	}
	
	return isPixelCollision(s1.frames[tile1].data, x1, y1, s2.frames[tile2].data, x2, y2) ? 1 : 0;
}

//Thanks Joseph for these two useful functions!
/**
 * @author Joseph Lenton - PlayMyCode.com
 *
 * @param first An ImageData object from the first image we are colliding with.
 * @param x The x location of 'first'.
 * @param y The y location of 'first'.
 * @param other An ImageData object from the second image involved in the collision check.
 * @param x2 The x location of 'other'.
 * @param y2 The y location of 'other'.
 * @param isCentred True if the locations refer to the centre of 'first' and 'other', false to specify the top left corner.
 */
function isPixelCollision( first, x, y, other, x2, y2 ) {
	var isCentred = false;
	
    // we need to avoid using floats, as were doing array lookups
    x  = Math.round( x );
    y  = Math.round( y );
    x2 = Math.round( x2 );
    y2 = Math.round( y2 );

    var w  = first.width,
        h  = first.height,
        w2 = other.width,
        h2 = other.height ;

    // deal with the image being centred
    if ( isCentred ) {
        // fast rounding, but positive only
        x  -= ( w/2 + 0.5) << 0
        y  -= ( h/2 + 0.5) << 0
        x2 -= (w2/2 + 0.5) << 0
        y2 -= (h2/2 + 0.5) << 0
    }

    // find the top left and bottom right corners of overlapping area
    var xMin = Math.max( x, x2 ),
        yMin = Math.max( y, y2 ),
        xMax = Math.min( x+w, x2+w2 ),
        yMax = Math.min( y+h, y2+h2 );

    // Sanity collision check, we ensure that the top-left corner is both
    // above and to the left of the bottom-right corner.
    if ( xMin >= xMax || yMin >= yMax ) {
        return false;
    }

    var xDiff = xMax - xMin,
        yDiff = yMax - yMin;

    // get the pixels out from the images
    var pixels  = first.data,
        pixels2 = other.data;

    // if the area is really small,
    // then just perform a normal image collision check
    if ( xDiff < 4 && yDiff < 4 ) {
        for ( var pixelX = xMin; pixelX < xMax; pixelX++ ) {
            for ( var pixelY = yMin; pixelY < yMax; pixelY++ ) {
                if (
                        ( pixels [ ((pixelX-x ) + (pixelY-y )*w )*4 + 3 ] !== 0 ) &&
                        ( pixels2[ ((pixelX-x2) + (pixelY-y2)*w2)*4 + 3 ] !== 0 )
                ) {
                    return true;
                }
            }
        }
    } else {
        var incX = xDiff / 3.0,
            incY = yDiff / 3.0;
        incX = (~~incX === incX) ? incX : (incX+1 | 0);
        incY = (~~incY === incY) ? incY : (incY+1 | 0);

        for ( var offsetY = 0; offsetY < incY; offsetY++ ) {
            for ( var offsetX = 0; offsetX < incX; offsetX++ ) {
                for ( var pixelY = yMin+offsetY; pixelY < yMax; pixelY += incY ) {
                    for ( var pixelX = xMin+offsetX; pixelX < xMax; pixelX += incX ) {
                        if (
                                ( pixels [ ((pixelX-x ) + (pixelY-y )*w )*4 + 3 ] !== 0 ) &&
                                ( pixels2[ ((pixelX-x2) + (pixelY-y2)*w2)*4 + 3 ] !== 0 )
                        ) {
                            return true;
                        }
                    }
                }
            }
        }
    }

    return false;
}

function BOXCOLL(x1,y1,breite1,hoehe1,x2,y2,breite2,hoehe2) {
	if (breite1 < 0) {
		breite1 = -breite1;
		x1 -= breite1;
	}
	if (hoehe1 < 0) {
		hoehe1 = -hoehe1;
		y1 -= hoehe1;
	}
	if (breite2 < 0) {
		breite2 = -breite2;
		x2 -= breite2;
	}
	if (hoehe2 < 0) {
		hoehe2 = -hoehe2;
		y2 -= hoehe2;
	}
    if (x1<=(x2+breite2) && y1<=y2+hoehe2 && (x1+breite1) >=x2 && (y1+hoehe1)>= y2) return 1; else return 0; 
}
//------------------------------------------------------------
// Screens
//------------------------------------------------------------


var screens		= [];		//Alle Screens

/**
 * @constructor
 */
function Screen(buffer, num, sprid) {
	this.canvas = buffer;
	this.context = buffer.getContext('2d');
	this.realwidth = this.canvas.width;
	this.realheight = this.canvas.height;
	this.realx = this.canvas.offsetLeft;
	this.realy = this.canvas.offsetRight;
	this.num = num + 2;
	this.spr = sprid;
	
	if (this.context == null) throwError("Given buffer does not support '2d'");
}

function CREATESCREEN(scrid, sprid, width, height) {
	var buffer = document.createElement('canvas');
    buffer.width = width;
    buffer.height = height;
	
	register(new Screen(buffer, scrid, sprid));
	var spr = new Sprite(buffer, sprid);
	register(spr);
	spr.loaded = true; //es ist bereits geladen...
}

function USESCREEN(id) {
	var oScreen = curScreen;
	if (oScreen && oScreen.spr) {
		//die pixel und tint daten raushauen
		getSprite(oScreen.spr).data = null;
		getSprite(oScreen.spr).tint = null;
	}
	curScreen = screens[id + 2];
	if (!curScreen) {
		curScreen = oScreen;
	} else {
		context = curScreen.context;
		canvas = curScreen.canvas;
	}
}

function BLENDSCREEN(file, duration) {
	throwError("TODO: blendscreen");
}

function CLEARSCREEN(col) {
	var tmpAlpha = context.globalAlpha;
	var tmpOperation = context.globalCompositeOperation;
	
	context.globalCompositeOperation = '';
	context.globalAlpha = 1;
	
	context.save();
	context.fillStyle = formatColor(col);
	context.fillRect(0,0,canvas.width, canvas.height);
	clrColor = col;
	context.restore();
	
	context.globalAlpha = tmpAlpha;
	context.globalCompositeOperation = tmpOperation;
}

function BLACKSCREEN() {
	CLEARSCREEN(RGB(0,0,0));
}

function USEASBMP() {
	var buffer = document.createElement('canvas');
    buffer.width = canvasWidth;
    buffer.height = canvasHeight;
	buffer.getContext('2d').drawImage(backbuffer.canvas, 0, 0);
	
	background = buffer;
}

function LOADBMP(path) {
	var image = new Image();
	
	image.onload = function () {
		background = image;
	}
	image.onerror = function() {
		//fehler
		throwError("BMP '"+path+"' not found!");
	}
	image.src = loadAsset(fileSystem.getCurrentDir() + path);
	
}
var static12_Factor_DIMASEXPRErr;
var static12_Keyword_SelectHelper;
var debugMode = false;
window['main'] = function(){
	var local1_G_1810 = pool_TGenerator.alloc();
	DIM(global10_Generators, [0], pool_TGenerator.alloc());
	local1_G_1810.attr8_Name_Str = "JS";
	local1_G_1810.attr8_genProto = func16_JS_Generator_Str;
	DIMPUSH(global10_Generators, local1_G_1810);
	global12_GbapPath_Str = "./";
	global7_CONSOLE = 0;
	global10_LastExprID = 0;
	global13_SettingIn_Str = "";
	global13_SettingIn_Str = "";
	MaxPasses = 6;
	global9_GFX_WIDTH = 640;
	global10_GFX_HEIGHT = 480;
	global10_FULLSCREEN = 0;
	global9_FRAMERATE = 60;
	global11_APPNAME_Str = "123basic Program";
	global9_DEBUGMODE = 1;
	global7_CONSOLE = 1;
	global6_STRICT = 1;
	global15_USRDEF_VERS_Str = "0.00001";
	global6_Ignore = 0;
	global13_OptimizeLevel = 1;
	global12_CurrentScope = -(1);
	global11_CurrentFunc = -(1);
	global8_IsInGoto = 0;
	global11_LoopBreakID = 0;
	global14_LoopContinueID = 0;
	global14_StaticText_Str = "";
	global13_VariUndef_Str = "";
	global10_Target_Str = "";
	global8_Lang_Str = "";
	global5_NoRun = 0;
	global10_SaveHeader = 0;
	pool_TGenerator.free(local1_G_1810);
}
main = window['main'];
window['func8_Analyser'] = function() {
	var local6_CurTyp_2457 = 0;
	func5_Start();
	while (func8_EOFParse()) {
		{
			var Err_Str = "";
			try {
				{
					var local17___SelectHelper35__2452 = "";
					local17___SelectHelper35__2452 = func14_GetCurrent_Str();
					if ((((local17___SelectHelper35__2452) === ("TYPE")) ? 1 : 0)) {
						var local3_typ_ref_2453 = [pool_TIdentifierType.alloc()];
						func5_Match("TYPE", 16, "src\CompilerPasses\Analyser.gbas");
						local3_typ_ref_2453[0].attr8_Name_Str = func14_GetCurrent_Str();
						local3_typ_ref_2453[0].attr12_RealName_Str = local3_typ_ref_2453[0].attr8_Name_Str;
						local3_typ_ref_2453[0].attr2_ID = BOUNDS(global8_Compiler.attr5_Types_ref[0], 0);
						DIMPUSH(global8_Compiler.attr5_Types_ref[0], local3_typ_ref_2453);
						func7_GetNext();
						pool_TIdentifierType.free(local3_typ_ref_2453);
					} else if ((((local17___SelectHelper35__2452) === ("PROTOTYPE")) ? 1 : 0)) {
						var local4_func_2454 = pool_TIdentifierFunc.alloc();
						func5_Match("PROTOTYPE", 25, "src\CompilerPasses\Analyser.gbas");
						local4_func_2454.attr8_Name_Str = func14_GetCurrent_Str();
						local4_func_2454.attr3_Typ = ~~(4);
						func11_AddFunction(local4_func_2454);
						func7_GetNext();
						pool_TIdentifierFunc.free(local4_func_2454);
					} else if ((((local17___SelectHelper35__2452) === ("CONSTANT")) ? 1 : 0)) {
						do {
							var local4_Vari_2455 = pool_TIdentifierVari.alloc();
							if (func7_IsToken("CONSTANT")) {
								func5_Match("CONSTANT", 44, "src\CompilerPasses\Analyser.gbas");
								
							} else {
								func5_Match(",", 46, "src\CompilerPasses\Analyser.gbas");
								
							};
							local4_Vari_2455 = func7_VariDef(0).clone(/* In Assign */);
							local4_Vari_2455.attr3_Typ = ~~(6);
							func11_AddVariable(local4_Vari_2455, 0);
							DIMPUSH(global8_Compiler.attr7_Globals, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
							pool_TIdentifierVari.free(local4_Vari_2455);
						} while (!((((func7_IsToken(",")) === (0)) ? 1 : 0)));
						
					};
					
				};
				func7_GetNext();
				
			} catch (Err_Str) {
				if (Err_Str instanceof OTTException) Err_Str = Err_Str.getText(); else throwError(Err_Str);{
					func8_FixError();
					
				}
			};
			
		};
		
	};
	local6_CurTyp_2457 = -(1);
	func5_Start();
	while (func8_EOFParse()) {
		{
			var Err_Str = "";
			try {
				var local10_IsCallback_2458 = 0, local8_IsNative_2459 = 0, local10_IsAbstract_2460 = 0;
				local10_IsCallback_2458 = 0;
				local8_IsNative_2459 = 0;
				local10_IsAbstract_2460 = 0;
				if (func7_IsToken("CALLBACK")) {
					func5_Match("CALLBACK", 72, "src\CompilerPasses\Analyser.gbas");
					local10_IsCallback_2458 = 1;
					if ((((func7_IsToken("FUNCTION")) === (0)) ? 1 : 0)) {
						func5_Match("FUNCTION", 74, "src\CompilerPasses\Analyser.gbas");
						
					};
					
				};
				if (func7_IsToken("NATIVE")) {
					func5_Match("NATIVE", 77, "src\CompilerPasses\Analyser.gbas");
					local8_IsNative_2459 = 1;
					if ((((func7_IsToken("FUNCTION")) === (0)) ? 1 : 0)) {
						func5_Match("FUNCTION", 79, "src\CompilerPasses\Analyser.gbas");
						
					};
					
				};
				if (func7_IsToken("ABSTRACT")) {
					func5_Match("ABSTRACT", 82, "src\CompilerPasses\Analyser.gbas");
					local10_IsAbstract_2460 = 1;
					if ((((func7_IsToken("FUNCTION")) === (0)) ? 1 : 0)) {
						func5_Match("FUNCTION", 84, "src\CompilerPasses\Analyser.gbas");
						
					};
					
				};
				{
					var local17___SelectHelper36__2461 = "";
					local17___SelectHelper36__2461 = func14_GetCurrent_Str();
					if ((((local17___SelectHelper36__2461) === ("PROTOTYPE")) ? 1 : 0)) {
						var local3_var_2462 = pool_TIdentifierVari.alloc(), local5_Found_2463 = 0;
						func5_Match("PROTOTYPE", 89, "src\CompilerPasses\Analyser.gbas");
						local3_var_2462 = func7_VariDef(0).clone(/* In Assign */);
						local5_Found_2463 = 0;
						var forEachSaver21649 = global8_Compiler.attr5_Funcs_ref[0];
						for(var forEachCounter21649 = 0 ; forEachCounter21649 < forEachSaver21649.values.length ; forEachCounter21649++) {
							var local4_func_ref_2464 = forEachSaver21649.values[forEachCounter21649];
						{
								if ((((local4_func_ref_2464[0].attr8_Name_Str) === (local3_var_2462.attr8_Name_Str)) ? 1 : 0)) {
									local4_func_ref_2464[0].attr8_datatype = local3_var_2462.attr8_datatype.clone(/* In Assign */);
									local5_Found_2463 = 1;
									break;
									
								};
								
							}
							forEachSaver21649.values[forEachCounter21649] = local4_func_ref_2464;
						
						};
						if ((((local5_Found_2463) === (0)) ? 1 : 0)) {
							func5_Error((("Internal error (prototype not found: ") + (local3_var_2462.attr8_Name_Str)), 100, "src\CompilerPasses\Analyser.gbas");
							
						};
						if ((((local6_CurTyp_2457) !== (-(1))) ? 1 : 0)) {
							func5_Error("PROTOTYPE definition not in Type allowed.", 101, "src\CompilerPasses\Analyser.gbas");
							
						};
						pool_TIdentifierVari.free(local3_var_2462);
					} else if ((((local17___SelectHelper36__2461) === ("FUNCTION")) ? 1 : 0)) {
						var local3_var_2465 = pool_TIdentifierVari.alloc(), local4_func_2466 = pool_TIdentifierFunc.alloc();
						func5_Match("FUNCTION", 103, "src\CompilerPasses\Analyser.gbas");
						local3_var_2465 = func7_VariDef(0).clone(/* In Assign */);
						local4_func_2466.attr8_Name_Str = local3_var_2465.attr8_Name_Str;
						local4_func_2466.attr8_datatype = local3_var_2465.attr8_datatype.clone(/* In Assign */);
						local4_func_2466.attr10_IsCallback = local10_IsCallback_2458;
						local4_func_2466.attr10_IsAbstract = local10_IsAbstract_2460;
						local4_func_2466.attr6_DefTok = global8_Compiler.attr11_currentPosi;
						if ((((local6_CurTyp_2457) !== (-(1))) ? 1 : 0)) {
							local4_func_2466.attr3_Typ = ~~(3);
							DIMPUSH(global8_Compiler.attr5_Types_ref[0].arrAccess(local6_CurTyp_2457).values[tmpPositionCache][0].attr7_Methods, BOUNDS(global8_Compiler.attr5_Funcs_ref[0], 0));
							local4_func_2466.attr6_MyType = local6_CurTyp_2457;
							
						} else {
							local4_func_2466.attr3_Typ = ~~(1);
							
						};
						func11_AddFunction(local4_func_2466);
						if (((((((local8_IsNative_2459) === (0)) ? 1 : 0)) && ((((local10_IsAbstract_2460) === (0)) ? 1 : 0))) ? 1 : 0)) {
							func10_SkipTokens("FUNCTION", "ENDFUNCTION", local4_func_2466.attr8_Name_Str);
							
						};
						pool_TIdentifierVari.free(local3_var_2465);pool_TIdentifierFunc.free(local4_func_2466);
					} else if ((((local17___SelectHelper36__2461) === ("SUB")) ? 1 : 0)) {
						var local4_func_2467 = pool_TIdentifierFunc.alloc();
						func5_Match("SUB", 126, "src\CompilerPasses\Analyser.gbas");
						local4_func_2467.attr8_Name_Str = func14_GetCurrent_Str();
						local4_func_2467.attr8_datatype = global12_voidDatatype.clone(/* In Assign */);
						local4_func_2467.attr3_Typ = ~~(2);
						local4_func_2467.attr6_DefTok = global8_Compiler.attr11_currentPosi;
						func11_AddFunction(local4_func_2467);
						func10_SkipTokens("SUB", "ENDSUB", local4_func_2467.attr8_Name_Str);
						pool_TIdentifierFunc.free(local4_func_2467);
					} else if ((((local17___SelectHelper36__2461) === ("TYPE")) ? 1 : 0)) {
						func5_Match("TYPE", 135, "src\CompilerPasses\Analyser.gbas");
						if ((((func6_IsType("")) === (0)) ? 1 : 0)) {
							func5_Error((((("Internal error (unrecognized type: ") + (func14_GetCurrent_Str()))) + (")")), 136, "src\CompilerPasses\Analyser.gbas");
							
						};
						local6_CurTyp_2457 = global8_LastType.attr2_ID;
						
					} else if ((((local17___SelectHelper36__2461) === ("ENDTYPE")) ? 1 : 0)) {
						local6_CurTyp_2457 = -(1);
						
					};
					
				};
				func7_GetNext();
				
			} catch (Err_Str) {
				if (Err_Str instanceof OTTException) Err_Str = Err_Str.getText(); else throwError(Err_Str);{
					func8_FixError();
					
				}
			};
			
		};
		
	};
	if ((((local6_CurTyp_2457) !== (-(1))) ? 1 : 0)) {
		func5_Error((((("Type '") + (global8_Compiler.attr5_Types_ref[0].arrAccess(local6_CurTyp_2457).values[tmpPositionCache][0].attr8_Name_Str))) + (" not closed with 'ENDTYPE'")), 149, "src\CompilerPasses\Analyser.gbas");
		
	};
	local6_CurTyp_2457 = -(1);
	var forEachSaver21946 = global8_Compiler.attr5_Funcs_ref[0];
	for(var forEachCounter21946 = 0 ; forEachCounter21946 < forEachSaver21946.values.length ; forEachCounter21946++) {
		var local1_F_ref_2469 = forEachSaver21946.values[forEachCounter21946];
	{
			if (local1_F_ref_2469[0].attr10_IsCallback) {
				var local12_alreadyExist_2470 = 0;
				local12_alreadyExist_2470 = 0;
				var forEachSaver21931 = global8_Compiler.attr5_Funcs_ref[0];
				for(var forEachCounter21931 = 0 ; forEachCounter21931 < forEachSaver21931.values.length ; forEachCounter21931++) {
					var local2_F2_ref_2471 = forEachSaver21931.values[forEachCounter21931];
				{
						if (((((((local2_F2_ref_2471[0].attr8_Name_Str) === (local1_F_ref_2469[0].attr8_Name_Str)) ? 1 : 0)) && ((((local2_F2_ref_2471[0].attr10_IsCallback) === (0)) ? 1 : 0))) ? 1 : 0)) {
							local12_alreadyExist_2470 = 1;
							break;
							
						};
						
					}
					forEachSaver21931.values[forEachCounter21931] = local2_F2_ref_2471;
				
				};
				if (local12_alreadyExist_2470) {
					local1_F_ref_2469[0].attr8_Name_Str = (("Overwritten Callback method (screw them!): ") + (local1_F_ref_2469[0].attr8_Name_Str));
					
				};
				
			};
			
		}
		forEachSaver21946.values[forEachCounter21946] = local1_F_ref_2469;
	
	};
	var forEachSaver21985 = global8_Compiler.attr5_Funcs_ref[0];
	for(var forEachCounter21985 = 0 ; forEachCounter21985 < forEachSaver21985.values.length ; forEachCounter21985++) {
		var local1_F_ref_2472 = forEachSaver21985.values[forEachCounter21985];
	{
			if ((((((((((local1_F_ref_2472[0].attr3_Typ) !== (3)) ? 1 : 0)) && ((((local1_F_ref_2472[0].attr3_Typ) !== (2)) ? 1 : 0))) ? 1 : 0)) && (((local1_F_ref_2472[0].attr10_IsCallback) ? 0 : 1))) ? 1 : 0)) {
				(global8_Compiler.attr11_GlobalFuncs).Put(local1_F_ref_2472[0].attr8_Name_Str, local1_F_ref_2472[0].attr2_ID);
				
			};
			
		}
		forEachSaver21985.values[forEachCounter21985] = local1_F_ref_2472;
	
	};
	func5_Start();
	while (func8_EOFParse()) {
		{
			var Err_Str = "";
			try {
				{
					var local17___SelectHelper37__2473 = "";
					local17___SelectHelper37__2473 = func14_GetCurrent_Str();
					if ((((local17___SelectHelper37__2473) === ("GLOBAL")) ? 1 : 0)) {
						do {
							var local4_Vari_2474 = pool_TIdentifierVari.alloc();
							if (func7_IsToken("GLOBAL")) {
								func5_Match("GLOBAL", 195, "src\CompilerPasses\Analyser.gbas");
								
							} else {
								func5_Match(",", 197, "src\CompilerPasses\Analyser.gbas");
								
							};
							local4_Vari_2474 = func7_VariDef(0).clone(/* In Assign */);
							local4_Vari_2474.attr3_Typ = ~~(2);
							func11_AddVariable(local4_Vari_2474, 1);
							DIMPUSH(global8_Compiler.attr7_Globals, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
							pool_TIdentifierVari.free(local4_Vari_2474);
						} while (!((((func7_IsToken(",")) === (0)) ? 1 : 0)));
						
					};
					
				};
				func7_GetNext();
				
			} catch (Err_Str) {
				if (Err_Str instanceof OTTException) Err_Str = Err_Str.getText(); else throwError(Err_Str);{
					func8_FixError();
					
				}
			};
			
		};
		
	};
	func5_Start();
	while (func8_EOFParse()) {
		{
			var Err_Str = "";
			try {
				{
					var local17___SelectHelper38__2476 = "";
					local17___SelectHelper38__2476 = func14_GetCurrent_Str();
					if ((((local17___SelectHelper38__2476) === ("TYPE")) ? 1 : 0)) {
						func8_TypeDefi();
						
					};
					
				};
				func7_GetNext();
				
			} catch (Err_Str) {
				if (Err_Str instanceof OTTException) Err_Str = Err_Str.getText(); else throwError(Err_Str);{
					func8_FixError();
					
				}
			};
			
		};
		
	};
	local6_CurTyp_2457 = -(1);
	var forEachSaver22086 = global8_Compiler.attr5_Types_ref[0];
	for(var forEachCounter22086 = 0 ; forEachCounter22086 < forEachSaver22086.values.length ; forEachCounter22086++) {
		var local3_typ_ref_2478 = forEachSaver22086.values[forEachCounter22086];
	{
			func10_ExtendType(unref(local3_typ_ref_2478[0]));
			
		}
		forEachSaver22086.values[forEachCounter22086] = local3_typ_ref_2478;
	
	};
	var forEachSaver22099 = global8_Compiler.attr5_Types_ref[0];
	for(var forEachCounter22099 = 0 ; forEachCounter22099 < forEachSaver22099.values.length ; forEachCounter22099++) {
		var local3_typ_ref_2479 = forEachSaver22099.values[forEachCounter22099];
	{
			func11_CheckCyclic(local3_typ_ref_2479[0].attr8_Name_Str, unref(local3_typ_ref_2479[0]));
			
		}
		forEachSaver22099.values[forEachCounter22099] = local3_typ_ref_2479;
	
	};
	func5_Start();
	while (func8_EOFParse()) {
		{
			var Err_Str = "";
			try {
				var local8_isNative_2480 = 0, local10_isCallBack_2481 = 0;
				local8_isNative_2480 = 0;
				local10_isCallBack_2481 = 0;
				{
					var local17___SelectHelper39__2482 = "";
					local17___SelectHelper39__2482 = func14_GetCurrent_Str();
					if ((((local17___SelectHelper39__2482) === ("NATIVE")) ? 1 : 0)) {
						local8_isNative_2480 = 1;
						func7_GetNext();
						
					} else if ((((local17___SelectHelper39__2482) === ("CALLBACK")) ? 1 : 0)) {
						local10_isCallBack_2481 = 1;
						func7_GetNext();
						
					} else if ((((local17___SelectHelper39__2482) === ("ABSTRACT")) ? 1 : 0)) {
						func7_GetNext();
						
					};
					
				};
				{
					var local17___SelectHelper40__2483 = "";
					local17___SelectHelper40__2483 = func14_GetCurrent_Str();
					if ((((local17___SelectHelper40__2483) === ("FUNCTION")) ? 1 : 0)) {
						var local3_Typ_2484 = 0.0;
						if ((((local6_CurTyp_2457) === (-(1))) ? 1 : 0)) {
							local3_Typ_2484 = 1;
							
						} else {
							local3_Typ_2484 = 3;
							
						};
						func7_FuncDef(local8_isNative_2480, local10_isCallBack_2481, ~~(local3_Typ_2484), local6_CurTyp_2457);
						
					} else if ((((local17___SelectHelper40__2483) === ("PROTOTYPE")) ? 1 : 0)) {
						func7_FuncDef(0, 0, ~~(4), -(1));
						
					} else if ((((local17___SelectHelper40__2483) === ("SUB")) ? 1 : 0)) {
						func6_SubDef();
						
					} else if ((((local17___SelectHelper40__2483) === ("TYPE")) ? 1 : 0)) {
						func5_Match("TYPE", 270, "src\CompilerPasses\Analyser.gbas");
						if ((((func6_IsType("")) === (0)) ? 1 : 0)) {
							func5_Error((((("Internal error (unrecognized type: ") + (func14_GetCurrent_Str()))) + (")")), 271, "src\CompilerPasses\Analyser.gbas");
							
						};
						local6_CurTyp_2457 = global8_LastType.attr2_ID;
						
					} else if ((((local17___SelectHelper40__2483) === ("ENDTYPE")) ? 1 : 0)) {
						local6_CurTyp_2457 = -(1);
						
					} else if ((((local17___SelectHelper40__2483) === ("STARTDATA")) ? 1 : 0)) {
						var local8_Name_Str_2485 = "", local5_Datas_2486 = pool_array.alloc(0), local5_dataB_2490 = pool_TDataBlock.alloc();
						func5_Match("STARTDATA", 276, "src\CompilerPasses\Analyser.gbas");
						local8_Name_Str_2485 = func14_GetCurrent_Str();
						if ((((func14_IsValidVarName()) === (0)) ? 1 : 0)) {
							func5_Error("Invalid DATA name", 278, "src\CompilerPasses\Analyser.gbas");
							
						};
						func5_Match(local8_Name_Str_2485, 279, "src\CompilerPasses\Analyser.gbas");
						func5_Match(":", 280, "src\CompilerPasses\Analyser.gbas");
						func5_Match("\n", 281, "src\CompilerPasses\Analyser.gbas");
						while (func7_IsToken("DATA")) {
							var local4_Done_2487 = 0;
							func5_Match("DATA", 284, "src\CompilerPasses\Analyser.gbas");
							local4_Done_2487 = 0;
							while ((((func7_IsToken("\n")) === (0)) ? 1 : 0)) {
								var local1_e_2488 = 0.0, local7_tmpData_2489 = pool_TDatatype.alloc();
								if ((((local4_Done_2487) === (1)) ? 1 : 0)) {
									func5_Match(",", 287, "src\CompilerPasses\Analyser.gbas");
									
								};
								local1_e_2488 = func10_Expression(0);
								local7_tmpData_2489 = global5_Exprs_ref[0].arrAccess(~~(local1_e_2488)).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
								local7_tmpData_2489.attr7_IsArray = 0;
								func14_EnsureDatatype(~~(local1_e_2488), local7_tmpData_2489, 0, 0);
								if ((((((((((global5_Exprs_ref[0].arrAccess(~~(local1_e_2488)).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("int")) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(~~(local1_e_2488)).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("float")) ? 1 : 0))) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(~~(local1_e_2488)).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("string")) ? 1 : 0))) ? 1 : 0)) {
									
								} else {
									func5_Error((((("Must be primitive datatype (int, float or string), got '") + (global5_Exprs_ref[0].arrAccess(~~(local1_e_2488)).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) + ("'")), 295, "src\CompilerPasses\Analyser.gbas");
									
								};
								DIMPUSH(local5_Datas_2486, ~~(local1_e_2488));
								local4_Done_2487 = 1;
								pool_TDatatype.free(local7_tmpData_2489);
							};
							func5_Match("\n", 300, "src\CompilerPasses\Analyser.gbas");
							
						};
						func5_Match("ENDDATA", 302, "src\CompilerPasses\Analyser.gbas");
						local5_dataB_2490.attr8_Name_Str = local8_Name_Str_2485;
						local5_dataB_2490.attr5_Datas = local5_Datas_2486.clone(/* In Assign */);
						DIMPUSH(global8_Compiler.attr10_DataBlocks, local5_dataB_2490);
						pool_array.free(local5_Datas_2486);pool_TDataBlock.free(local5_dataB_2490);
					};
					
				};
				func7_GetNext();
				
			} catch (Err_Str) {
				if (Err_Str instanceof OTTException) Err_Str = Err_Str.getText(); else throwError(Err_Str);{
					func8_FixError();
					
				}
			};
			
		};
		
	};
	return 0;
	
};
func8_Analyser = window['func8_Analyser'];
window['func11_CheckCyclic'] = function(param8_Name_Str, param3_typ) {
	var forEachSaver22453 = param3_typ.attr10_Attributes;
	for(var forEachCounter22453 = 0 ; forEachCounter22453 < forEachSaver22453.values.length ; forEachCounter22453++) {
		var local1_t_2494 = forEachSaver22453.values[forEachCounter22453];
	{
			if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_t_2494).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === (param8_Name_Str)) ? 1 : 0)) {
				func5_Error((((((((("Cyclic reference '") + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_t_2494).values[tmpPositionCache][0].attr8_Name_Str))) + ("' to type '"))) + (param8_Name_Str))) + ("'")), 322, "src\CompilerPasses\Analyser.gbas");
				
			} else if (func6_IsType(global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_t_2494).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str)) {
				func11_CheckCyclic(param8_Name_Str, global8_LastType);
				
			} else {
				
			};
			
		}
		forEachSaver22453.values[forEachCounter22453] = local1_t_2494;
	
	};
	return 0;
	
};
func11_CheckCyclic = window['func11_CheckCyclic'];
window['func10_ExtendType'] = function(param3_typ) {
	if ((((param3_typ.attr9_Extending) !== (-(1))) ? 1 : 0)) {
		var alias6_ExtTyp_ref_2496 = [pool_TIdentifierType.alloc()], local6_tmpTyp_2497 = 0, local9_Abstracts_2498 = pool_array.alloc(0);
		func10_ExtendType(unref(global8_Compiler.attr5_Types_ref[0].arrAccess(param3_typ.attr9_Extending).values[tmpPositionCache][0]));
		alias6_ExtTyp_ref_2496 = global8_Compiler.attr5_Types_ref[0].arrAccess(param3_typ.attr9_Extending).values[tmpPositionCache] /* ALIAS */;
		local6_tmpTyp_2497 = alias6_ExtTyp_ref_2496[0].attr2_ID;
		while ((((local6_tmpTyp_2497) !== (-(1))) ? 1 : 0)) {
			var forEachSaver22521 = global8_Compiler.attr5_Types_ref[0].arrAccess(local6_tmpTyp_2497).values[tmpPositionCache][0].attr7_Methods;
			for(var forEachCounter22521 = 0 ; forEachCounter22521 < forEachSaver22521.values.length ; forEachCounter22521++) {
				var local1_M_2499 = forEachSaver22521.values[forEachCounter22521];
			{
					if (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local1_M_2499).values[tmpPositionCache][0].attr10_IsAbstract) {
						DIMPUSH(local9_Abstracts_2498, local1_M_2499);
						
					};
					
				}
				forEachSaver22521.values[forEachCounter22521] = local1_M_2499;
			
			};
			local6_tmpTyp_2497 = global8_Compiler.attr5_Types_ref[0].arrAccess(local6_tmpTyp_2497).values[tmpPositionCache][0].attr9_Extending;
			
		};
		var forEachSaver22625 = local9_Abstracts_2498;
		for(var forEachCounter22625 = 0 ; forEachCounter22625 < forEachSaver22625.values.length ; forEachCounter22625++) {
			var local2_Ab_2500 = forEachSaver22625.values[forEachCounter22625];
		{
				var local5_Found_2501 = 0;
				local5_Found_2501 = 0;
				local6_tmpTyp_2497 = alias6_ExtTyp_ref_2496[0].attr2_ID;
				while ((((local6_tmpTyp_2497) !== (-(1))) ? 1 : 0)) {
					var forEachSaver22598 = global8_Compiler.attr5_Types_ref[0].arrAccess(local6_tmpTyp_2497).values[tmpPositionCache][0].attr7_Methods;
					for(var forEachCounter22598 = 0 ; forEachCounter22598 < forEachSaver22598.values.length ; forEachCounter22598++) {
						var local1_M_2502 = forEachSaver22598.values[forEachCounter22598];
					{
							if (((((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local1_M_2502).values[tmpPositionCache][0].attr8_Name_Str) === (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local2_Ab_2500).values[tmpPositionCache][0].attr8_Name_Str)) ? 1 : 0)) && (((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local1_M_2502).values[tmpPositionCache][0].attr10_IsAbstract) ? 0 : 1))) ? 1 : 0)) {
								local5_Found_2501 = 1;
								break;
								
							};
							
						}
						forEachSaver22598.values[forEachCounter22598] = local1_M_2502;
					
					};
					if (local5_Found_2501) {
						break;
						
					};
					local6_tmpTyp_2497 = global8_Compiler.attr5_Types_ref[0].arrAccess(local6_tmpTyp_2497).values[tmpPositionCache][0].attr9_Extending;
					
				};
				if (((local5_Found_2501) ? 0 : 1)) {
					alias6_ExtTyp_ref_2496[0].attr10_Createable = 0;
					
				};
				
			}
			forEachSaver22625.values[forEachCounter22625] = local2_Ab_2500;
		
		};
		var forEachSaver22683 = alias6_ExtTyp_ref_2496[0].attr10_Attributes;
		for(var forEachCounter22683 = 0 ; forEachCounter22683 < forEachSaver22683.values.length ; forEachCounter22683++) {
			var local1_A_2503 = forEachSaver22683.values[forEachCounter22683];
		{
				var alias3_Att_ref_2504 = [pool_TIdentifierVari.alloc()], local6_Exists_2505 = 0;
				alias3_Att_ref_2504 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_A_2503).values[tmpPositionCache] /* ALIAS */;
				local6_Exists_2505 = 0;
				var forEachSaver22671 = param3_typ.attr10_Attributes;
				for(var forEachCounter22671 = 0 ; forEachCounter22671 < forEachSaver22671.values.length ; forEachCounter22671++) {
					var local2_A2_2506 = forEachSaver22671.values[forEachCounter22671];
				{
						var alias4_Att2_ref_2507 = [pool_TIdentifierVari.alloc()];
						alias4_Att2_ref_2507 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local2_A2_2506).values[tmpPositionCache] /* ALIAS */;
						if ((((alias3_Att_ref_2504[0].attr8_Name_Str) === (alias4_Att2_ref_2507[0].attr8_Name_Str)) ? 1 : 0)) {
							local6_Exists_2505 = 1;
							break;
							
						};
						pool_TIdentifierVari.free(alias4_Att2_ref_2507);
					}
					forEachSaver22671.values[forEachCounter22671] = local2_A2_2506;
				
				};
				if (((local6_Exists_2505) ? 0 : 1)) {
					DIMPUSH(param3_typ.attr10_Attributes, local1_A_2503);
					
				};
				pool_TIdentifierVari.free(alias3_Att_ref_2504);
			}
			forEachSaver22683.values[forEachCounter22683] = local1_A_2503;
		
		};
		pool_array.free(local9_Abstracts_2498);
	};
	return 0;
	
};
func10_ExtendType = window['func10_ExtendType'];
window['func12_LoadFile_Str'] = function(param8_Path_Str) {
	var local8_Text_Str_2509 = "", local4_File_2510 = 0;
	local4_File_2510 = GENFILE();
	if (OPENFILE(local4_File_2510, param8_Path_Str, 1)) {
		while ((((ENDOFFILE(local4_File_2510)) === (0)) ? 1 : 0)) {
			var local8_Line_Str_ref_2511 = [""];
			READLINE(local4_File_2510, local8_Line_Str_ref_2511);
			local8_Text_Str_2509 = ((((local8_Text_Str_2509) + (local8_Line_Str_ref_2511[0]))) + ("\n"));
			
		};
		CLOSEFILE(local4_File_2510);
		
	} else {
		func5_Error((("Cannot find file: ") + (param8_Path_Str)), 388, "src\Compiler.gbas");
		
	};
	return tryClone(local8_Text_Str_2509);
	return "";
	
};
func12_LoadFile_Str = window['func12_LoadFile_Str'];
window['func5_Error'] = function(param7_Msg_Str, param4_Line, param8_File_Str) {
	var local11_OrigMsg_Str_2515 = "", local3_tok_2516 = pool_TToken.alloc();
	local11_OrigMsg_Str_2515 = param7_Msg_Str;
	local3_tok_2516 = func15_GetCurrentToken().clone(/* In Assign */);
	param7_Msg_Str = (((((("Error: '") + (REPLACE_Str(param7_Msg_Str, "\n", "NEWLINE")))) + (global8_Compiler.attr14_errorState_Str))) + ("'\n"));
	param7_Msg_Str = ((((((((((((((param7_Msg_Str) + ("in line '"))) + (CAST2STRING(local3_tok_2516.attr4_Line)))) + ("' at character '"))) + (CAST2STRING(local3_tok_2516.attr9_Character)))) + ("' near '"))) + (REPLACE_Str(local3_tok_2516.attr8_Text_Str, "\n", "NEWLINE")))) + ("'\n"));
	param7_Msg_Str = ((((((param7_Msg_Str) + ("in file '"))) + (local3_tok_2516.attr8_Path_Str))) + ("'\n"));
	param7_Msg_Str = ((((((param7_Msg_Str) + ("\t '"))) + (local3_tok_2516.attr15_LineContent_Str))) + ("'\n"));
	param7_Msg_Str = ((param7_Msg_Str) + ("-----------------------------------\n"));
	param7_Msg_Str = (("\n-----------------------------------\n") + (param7_Msg_Str));
	STDERR(param7_Msg_Str);
	global8_Compiler.attr8_WasError = 1;
	END();
	if (((global8_Compiler.attr13_FaultTolerant) ? 0 : 1)) {
		throw new OTTException((((("syntaxerror '") + (param7_Msg_Str))) + ("'")), "\src\Compiler.gbas", 420);
		
	} else {
		var local3_err_2517 = pool_TError.alloc();
		local3_err_2517.attr5_token = local3_tok_2516.clone(/* In Assign */);
		local3_err_2517.attr7_Msg_Str = local11_OrigMsg_Str_2515;
		local3_err_2517.attr14_errorState_Str = global8_Compiler.attr14_errorState_Str;
		local3_err_2517.attr3_Typ = ~~(0);
		DIMPUSH(global8_Compiler.attr6_Errors, local3_err_2517);
		pool_TError.free(local3_err_2517);
	};
	return 0;
	pool_TToken.free(local3_tok_2516);
};
func5_Error = window['func5_Error'];
window['func7_Warning'] = function(param7_Msg_Str) {
	var local11_OrigMsg_Str_2519 = "", local3_tok_2520 = pool_TToken.alloc(), local3_err_2521 = pool_TError.alloc();
	local11_OrigMsg_Str_2519 = param7_Msg_Str;
	local3_tok_2520 = func15_GetCurrentToken().clone(/* In Assign */);
	param7_Msg_Str = (((("Warning: '") + (REPLACE_Str(param7_Msg_Str, "\n", "NEWLINE")))) + ("'\n"));
	param7_Msg_Str = ((((((((((((((param7_Msg_Str) + ("in line '"))) + (CAST2STRING(local3_tok_2520.attr4_Line)))) + ("' at character '"))) + (CAST2STRING(local3_tok_2520.attr9_Character)))) + ("' near '"))) + (REPLACE_Str(local3_tok_2520.attr8_Text_Str, "\n", "NEWLINE")))) + ("'\n"));
	param7_Msg_Str = ((((((param7_Msg_Str) + ("in file '"))) + (local3_tok_2520.attr8_Path_Str))) + ("'\n"));
	param7_Msg_Str = ((((((param7_Msg_Str) + ("\t '"))) + (local3_tok_2520.attr15_LineContent_Str))) + ("'\n"));
	param7_Msg_Str = ((param7_Msg_Str) + ("-----------------------------------\n"));
	param7_Msg_Str = (("\n-----------------------------------\n") + (param7_Msg_Str));
	STDOUT(param7_Msg_Str);
	local3_err_2521.attr5_token = local3_tok_2520.clone(/* In Assign */);
	local3_err_2521.attr7_Msg_Str = local11_OrigMsg_Str_2519;
	local3_err_2521.attr14_errorState_Str = global8_Compiler.attr14_errorState_Str;
	local3_err_2521.attr3_Typ = ~~(1);
	DIMPUSH(global8_Compiler.attr6_Errors, local3_err_2521);
	return 0;
	pool_TToken.free(local3_tok_2520);pool_TError.free(local3_err_2521);
};
func7_Warning = window['func7_Warning'];
window['func11_CreateToken'] = function(param8_Text_Str, param15_LineContent_Str, param4_Line, param9_Character, param8_Path_Str) {
	if (((((((((((((param8_Text_Str) !== ("\n")) ? 1 : 0)) && ((((TRIM_Str(param8_Text_Str, " \t\r\n\v\f")) === ("")) ? 1 : 0))) ? 1 : 0)) || ((((param8_Text_Str) === ("\t")) ? 1 : 0))) ? 1 : 0)) || ((((param8_Text_Str) === ("\r")) ? 1 : 0))) ? 1 : 0)) {
		
	} else {
		var local6_ascval_2527 = 0, local3_pos_2528 = 0.0;
		local6_ascval_2527 = ASC(param8_Text_Str, 0);
		if ((((((((((local6_ascval_2527) === (8)) ? 1 : 0)) || ((((local6_ascval_2527) === (12)) ? 1 : 0))) ? 1 : 0)) || ((((CAST2STRING(local6_ascval_2527)) === (global11_SHLASHF_Str)) ? 1 : 0))) ? 1 : 0)) {
			param8_Text_Str = "\n";
			
		};
		local3_pos_2528 = global8_Compiler.attr11_LastTokenID;
		global8_Compiler.attr11_LastTokenID = ((global8_Compiler.attr11_LastTokenID) + (1));
		if ((((global8_Compiler.attr11_LastTokenID) >= (((BOUNDS(global8_Compiler.attr6_Tokens, 0)) - (10)))) ? 1 : 0)) {
			REDIM(global8_Compiler.attr6_Tokens, [((global8_Compiler.attr11_LastTokenID) + (50))], pool_TToken.alloc() );
			
		};
		global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2528)).values[tmpPositionCache].attr4_Line = param4_Line;
		global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2528)).values[tmpPositionCache].attr9_Character = param9_Character;
		global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2528)).values[tmpPositionCache].attr15_LineContent_Str = param15_LineContent_Str;
		global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2528)).values[tmpPositionCache].attr8_Path_Str = param8_Path_Str;
		global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2528)).values[tmpPositionCache].attr8_Text_Str = param8_Text_Str;
		if ((((LEFT_Str(global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2528)).values[tmpPositionCache].attr8_Text_Str, 1)) === ("@")) ? 1 : 0)) {
			global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2528)).values[tmpPositionCache].attr8_Text_Str = MID_Str(global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2528)).values[tmpPositionCache].attr8_Text_Str, 1, -(1));
			
		};
		
	};
	return tryClone(unref(pool_TToken.alloc()));
	
};
func11_CreateToken = window['func11_CreateToken'];
window['func15_GetCurrentToken'] = function() {
	if ((((global8_Compiler.attr11_currentPosi) < (global8_Compiler.attr11_LastTokenID)) ? 1 : 0)) {
		return tryClone(global8_Compiler.attr6_Tokens.arrAccess(global8_Compiler.attr11_currentPosi).values[tmpPositionCache]);
		
	} else {
		var local1_t_2529 = pool_TToken.alloc();
		return tryClone(local1_t_2529);
		pool_TToken.free(local1_t_2529);
	};
	return tryClone(unref(pool_TToken.alloc()));
	
};
func15_GetCurrentToken = window['func15_GetCurrentToken'];
window['func5_Start'] = function() {
	global8_Compiler.attr11_currentPosi = 0;
	func7_GetNext();
	return 0;
	
};
func5_Start = window['func5_Start'];
window['func7_HasNext'] = function() {
	if ((((global8_Compiler.attr11_currentPosi) > (((global8_Compiler.attr11_LastTokenID) - (2)))) ? 1 : 0)) {
		return tryClone(0);
		
	} else {
		return 1;
		
	};
	return 0;
	
};
func7_HasNext = window['func7_HasNext'];
window['func7_GetNext'] = function() {
	do {
		global8_Compiler.attr11_currentPosi+=1;
		if ((((global8_Compiler.attr11_currentPosi) > (((global8_Compiler.attr11_LastTokenID) - (1)))) ? 1 : 0)) {
			func5_Error("Unexpected end of line", 508, "src\Compiler.gbas");
			
		};
		
	} while (!(((global8_Compiler.attr6_Tokens.arrAccess(global8_Compiler.attr11_currentPosi).values[tmpPositionCache].attr5_IsDel) ? 0 : 1)));
	return 0;
	
};
func7_GetNext = window['func7_GetNext'];
window['func5_Match'] = function(param8_Text_Str, param4_Line, param8_File_Str) {
	if ((((global8_Compiler.attr6_Tokens.arrAccess(global8_Compiler.attr11_currentPosi).values[tmpPositionCache].attr8_Text_Str) !== (param8_Text_Str)) ? 1 : 0)) {
		func5_Error((((("Unexpected token, expecting: '") + (param8_Text_Str))) + ("'")), ~~(param4_Line), param8_File_Str);
		
	};
	func7_GetNext();
	return 0;
	
};
func5_Match = window['func5_Match'];
window['func8_EOFParse'] = function() {
	return tryClone((((global8_Compiler.attr11_currentPosi) < (((global8_Compiler.attr11_LastTokenID) - (1)))) ? 1 : 0));
	return 0;
	
};
func8_EOFParse = window['func8_EOFParse'];
window['func14_GetCurrent_Str'] = function() {
	return tryClone(global8_Compiler.attr6_Tokens.arrAccess(global8_Compiler.attr11_currentPosi).values[tmpPositionCache].attr8_Text_Str);
	return "";
	
};
func14_GetCurrent_Str = window['func14_GetCurrent_Str'];
window['func13_RemoveCurrent'] = function() {
	global8_Compiler.attr6_Tokens.arrAccess(global8_Compiler.attr11_currentPosi).values[tmpPositionCache].attr5_IsDel = 1;
	global8_Compiler.attr11_currentPosi+=1;
	return 0;
	
};
func13_RemoveCurrent = window['func13_RemoveCurrent'];
window['func14_MatchAndRemove'] = function(param8_Text_Str, param4_Line, param8_File_Str) {
	if ((((func14_GetCurrent_Str()) !== (param8_Text_Str)) ? 1 : 0)) {
		func5_Error((((("Unexpected token, expecting: '") + (param8_Text_Str))) + ("'")), ~~(param4_Line), param8_File_Str);
		
	};
	func13_RemoveCurrent();
	return 0;
	
};
func14_MatchAndRemove = window['func14_MatchAndRemove'];
window['func14_CreateDatatype'] = function(param8_Name_Str, param7_IsArray) {
	var local1_d_2538 = pool_TDatatype.alloc();
	local1_d_2538.attr8_Name_Str = param8_Name_Str;
	local1_d_2538.attr7_IsArray = param7_IsArray;
	return tryClone(local1_d_2538);
	return tryClone(unref(pool_TDatatype.alloc()));
	pool_TDatatype.free(local1_d_2538);
};
func14_CreateDatatype = window['func14_CreateDatatype'];
window['func7_IsToken'] = function(param8_Text_Str) {
	if ((((func14_GetCurrent_Str()) === (param8_Text_Str)) ? 1 : 0)) {
		return 1;
		
	} else {
		return tryClone(0);
		
	};
	return 0;
	
};
func7_IsToken = window['func7_IsToken'];
window['func14_CreateOperator'] = function(param8_Name_Str, param7_Sym_Str, param4_Prio, param3_Typ) {
	var local2_Op_ref_2544 = [pool_TOperator.alloc()];
	local2_Op_ref_2544[0].attr8_Name_Str = param8_Name_Str;
	local2_Op_ref_2544[0].attr7_Sym_Str = param7_Sym_Str;
	local2_Op_ref_2544[0].attr4_Prio = param4_Prio;
	local2_Op_ref_2544[0].attr3_Typ = param3_Typ;
	local2_Op_ref_2544[0].attr2_ID = BOUNDS(global9_Operators_ref[0], 0);
	DIMPUSH(global9_Operators_ref[0], local2_Op_ref_2544);
	return 0;
	pool_TOperator.free(local2_Op_ref_2544);
};
func14_CreateOperator = window['func14_CreateOperator'];
window['func11_AddVariable'] = function(param4_Vari, param6_Ignore) {
	var local4_Vari_ref_2545 = [param4_Vari];
	if (((((((param6_Ignore) === (0)) ? 1 : 0)) && (func13_IsVarExisting(local4_Vari_ref_2545[0].attr8_Name_Str))) ? 1 : 0)) {
		func5_Error((((("Variable already exists, is a keyword or a type: '") + (local4_Vari_ref_2545[0].attr8_Name_Str))) + ("'")), 581, "src\Compiler.gbas");
		
	};
	local4_Vari_ref_2545[0].attr2_ID = BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0);
	local4_Vari_ref_2545[0].attr3_Tok = global8_Compiler.attr11_currentPosi;
	DIMPUSH(global8_Compiler.attr5_Varis_ref[0], local4_Vari_ref_2545);
	return 0;
	
};
func11_AddVariable = window['func11_AddVariable'];
window['func11_AddFunction'] = function(param4_Func) {
	var local4_Func_ref_2547 = [param4_Func];
	if (((((((local4_Func_ref_2547[0].attr3_Typ) !== (3)) ? 1 : 0)) && (func14_IsFuncExisting(local4_Func_ref_2547[0].attr8_Name_Str, local4_Func_ref_2547[0].attr10_IsCallback))) ? 1 : 0)) {
		func5_Error((((("Function already exists, is a keyword or a type: '") + (local4_Func_ref_2547[0].attr8_Name_Str))) + ("'")), 589, "src\Compiler.gbas");
		
	};
	local4_Func_ref_2547[0].attr2_ID = BOUNDS(global8_Compiler.attr5_Funcs_ref[0], 0);
	DIMPUSH(global8_Compiler.attr5_Funcs_ref[0], local4_Func_ref_2547);
	return 0;
	
};
func11_AddFunction = window['func11_AddFunction'];
window['InitCompiler'] = function() {
	var local13_newKeywordMap_1811 = pool_HashMap.alloc();
	REDIM(global7_Defines, [0], pool_TDefine.alloc() );
	global12_voidDatatype = func14_CreateDatatype("void", 0).clone(/* In Assign */);
	global11_intDatatype = func14_CreateDatatype("int", 0).clone(/* In Assign */);
	global13_floatDatatype = func14_CreateDatatype("float", 0).clone(/* In Assign */);
	global11_strDatatype = func14_CreateDatatype("string", 0).clone(/* In Assign */);
	global11_SHLASHF_Str = CHR_Str(INT2STR("\f"));
	REDIM(unref(global9_Operators_ref[0]), [0], [pool_TOperator.alloc()] );
	func14_CreateOperator("add", "+", 4, ~~(2));
	func14_CreateOperator("sub", "-", 4, ~~(2));
	func14_CreateOperator("mul", "*", 5, ~~(2));
	func14_CreateOperator("div", "/", 5, ~~(2));
	func14_CreateOperator("pot", "^", 6, ~~(2));
	func14_CreateOperator("equ", "=", 3, ~~(3));
	func14_CreateOperator("grt", ">", 3, ~~(3));
	func14_CreateOperator("less", "<", 3, ~~(3));
	func14_CreateOperator("lessequ", "<=", 3, ~~(3));
	func14_CreateOperator("grtequ", ">=", 3, ~~(3));
	func14_CreateOperator("unequ", "<>", 3, ~~(3));
	func14_CreateOperator("and", "AND", 2, ~~(3));
	func14_CreateOperator("or", "OR", 2, ~~(3));
	DIMDATA(global12_Keywords_Str, ["CALLBACK", "FUNCTION", "ENDFUNCTION", "SUB", "ENDSUB", "GOSUB", "IF", "ELSE", "ELSEIF", "THEN", "ENDIF", "WHILE", "WEND", "BREAK", "CONTINUE", "FOR", "FOREACH", "IN", "TO", "STEP", "NEXT", "REPEAT", "UNTIL", "TYPE", "ENDTYPE", "RETURN", "NATIVE", "LOCAL", "GLOBAL", "STATIC", "DIM", "REDIM", "INLINE", "ENDINLINE", "PROTOTYPE", "REQUIRE", "BREAK", "CONTINUE", "TRY", "CATCH", "FINALLY", "THROW", "SELECT", "CASE", "DEFAULT", "ENDSELECT", "STARTDATA", "ENDDATA", "DATA", "RESTORE", "READ", "GOTO", "ALIAS", "AS", "CONSTANT", "INC", "DEC", "DIMPUSH", "LEN", "DIMDATA", "DELETE", "DIMDEL", "DEBUG", "ASSERT", "ABSTRACT", "EXPORT"]);
	global10_KeywordMap = local13_newKeywordMap_1811.clone(/* In Assign */);
	(global10_KeywordMap).SetSize(((BOUNDS(global12_Keywords_Str, 0)) * (8)));
	var forEachSaver2301 = global12_Keywords_Str;
	for(var forEachCounter2301 = 0 ; forEachCounter2301 < forEachSaver2301.values.length ; forEachCounter2301++) {
		var local7_key_Str_1812 = forEachSaver2301.values[forEachCounter2301];
	{
			(global10_KeywordMap).Put(local7_key_Str_1812, 1);
			
		}
		forEachSaver2301.values[forEachCounter2301] = local7_key_Str_1812;
	
	};
	RegisterDefine("GLB_VERSION", "1");
	RegisterDefine("oTT_VERSION", "1");
	RegisterDefine("OTTBASIC", CAST2STRING(1));
	RegisterDefine("ADDON_2D", CAST2STRING(1));
	RegisterDefine("ADDON_3D", CAST2STRING(1));
	RegisterDefine("ADDON_NET", CAST2STRING(1));
	RegisterDefine("ADDON_INPUT", CAST2STRING(1));
	RegisterDefine("ADDON_CONSOLE", CAST2STRING(1));
	RegisterDefine("ADDON_SOUND", CAST2STRING(1));
	RegisterDefine("ADDON_NET", CAST2STRING(1));
	func16_ResetExpressions();
	REDIM(global14_Documentations, [0], pool_Documentation.alloc() );
	global8_Compiler.attr13_FaultTolerant = 0;
	REDIM(global8_Compiler.attr6_Errors, [0], pool_TError.alloc() );
	return 0;
	pool_HashMap.free(local13_newKeywordMap_1811);
};
InitCompiler = window['InitCompiler'];
window['Compile_Str'] = function(param8_Text_Str, param10_Target_Str) {
	var local1_c_1815 = pool_TCompiler.alloc(), local10_Output_Str_1816 = "";
	global8_Compiler = local1_c_1815.clone(/* In Assign */);
	InitCompiler();
	func16_ResetExpressions();
	func9_PushTimer();
	func11_SetupTarget(param10_Target_Str);
	PassSuccessfull(1, ~~(6));
	func8_PopTimer("Header load & setup target!");
	global8_Compiler.attr8_Code_Str = ((param8_Text_Str) + ("\n"));
	func9_PushTimer();
	func5_Lexer();
	func8_PopTimer("Lexer!");
	PassSuccessfull(2, ~~(6));
	STDOUT("Lexing successful! \n");
	global8_Compiler.attr14_errorState_Str = " (precompiler error)";
	func9_PushTimer();
	func11_Precompiler();
	func8_PopTimer("Precompiler");
	PassSuccessfull(3, ~~(6));
	STDOUT("Preprocessing successful! \n");
	global8_Compiler.attr13_LastMaxTokens = global8_Compiler.attr11_LastTokenID;
	func16_ResetExpressions();
	global8_Compiler.attr14_errorState_Str = " (analyse error)";
	func9_PushTimer();
	func8_Analyser();
	func8_PopTimer("Analyser");
	PassSuccessfull(4, ~~(6));
	if (global8_Compiler.attr8_WasError) {
		STDOUT("Analysing failed :( \n");
		return "";
		
	} else {
		STDOUT("Analysing successful! \n");
		
	};
	global8_Compiler.attr14_errorState_Str = " (parse error)";
	func9_PushTimer();
	func6_Parser();
	func8_PopTimer("Parser");
	PassSuccessfull(5, ~~(6));
	if (global8_Compiler.attr8_WasError) {
		STDOUT("Parsing failed :( \n");
		return "";
		
	} else {
		STDOUT("Parsing successful! \n");
		
	};
	global8_Compiler.attr14_errorState_Str = " (doc generation error)";
	func9_PushTimer();
	func11_GenerateDoc();
	func8_PopTimer("Generate Doc");
	if (global8_Compiler.attr8_WasError) {
		STDOUT("Doc Generation failed :( \n");
		return "";
		
	} else {
		STDOUT("Doc Generation successful! \n");
		
	};
	global8_Compiler.attr14_errorState_Str = " (generate error)";
	func9_PushTimer();
	local10_Output_Str_1816 = func12_DoTarget_Str(param10_Target_Str);
	func8_PopTimer("Target stuff");
	PassSuccessfull(6, ~~(6));
	if (global8_Compiler.attr8_WasError) {
		STDOUT("Generating failed :( \n");
		return "";
		
	} else {
		STDOUT((((("Generating successful to target ") + (param10_Target_Str))) + ("! \n")));
		
	};
	return tryClone(local10_Output_Str_1816);
	return "";
	pool_TCompiler.free(local1_c_1815);
};
Compile_Str = window['Compile_Str'];
window['func16_ResetExpressions'] = function() {
	DIM(unref(global5_Exprs_ref[0]), [0], [pool_TExpr.alloc()]);
	global10_LastExprID = 0;
	func21_CreateDebugExpression();
	return 0;
	
};
func16_ResetExpressions = window['func16_ResetExpressions'];
window['func9_PushTimer'] = function() {
	return 0;
	
};
func9_PushTimer = window['func9_PushTimer'];
window['func8_PopTimer'] = function(param8_Text_Str) {
	return 0;
	
};
func8_PopTimer = window['func8_PopTimer'];
window['RegisterDefine'] = function(param7_Key_Str, param9_Value_Str) {
	var local3_Def_1820 = pool_TDefine.alloc();
	local3_Def_1820.attr7_Key_Str = param7_Key_Str;
	local3_Def_1820.attr9_Value_Str = param9_Value_Str;
	DIMPUSH(global7_Defines, local3_Def_1820);
	return 0;
	pool_TDefine.free(local3_Def_1820);
};
RegisterDefine = window['RegisterDefine'];
window['func11_GenerateDoc'] = function() {
	func22_GenerateDocForLanguage("EN");
	func22_GenerateDocForLanguage("DE");
	return 0;
	
};
func11_GenerateDoc = window['func11_GenerateDoc'];
window['func22_GenerateDocForLanguage'] = function(param8_Lang_Str) {
	var local17_Documentation_Str_1822 = "", local11_JSONDoc_Str_1823 = "", local12_Glossary_Str_1824 = "";
	local17_Documentation_Str_1822 = "";
	local11_JSONDoc_Str_1823 = "";
	local12_Glossary_Str_1824 = "# Overview";
	var forEachSaver2844 = global14_Documentations;
	for(var forEachCounter2844 = 0 ; forEachCounter2844 < forEachSaver2844.values.length ; forEachCounter2844++) {
		var local6_module_1825 = forEachSaver2844.values[forEachCounter2844];
	{
			if ((((local6_module_1825.attr7_typ_Str) === ("MODULE")) ? 1 : 0)) {
				local12_Glossary_Str_1824+=(((((((("\n## [Module ") + (local6_module_1825.attr8_name_Str))) + ("] (#"))) + (local6_module_1825.attr8_name_Str))) + (")\n"));
				local17_Documentation_Str_1822+=(((("# ") + (local6_module_1825.attr8_name_Str))) + ("\n"));
				local17_Documentation_Str_1822+=((func18_DocLangElement_Str(unref(local6_module_1825.attr4_desc), param8_Lang_Str)) + ("\n"));
				var forEachSaver2842 = global14_Documentations;
				for(var forEachCounter2842 = 0 ; forEachCounter2842 < forEachSaver2842.values.length ; forEachCounter2842++) {
					var local1_D_1826 = forEachSaver2842.values[forEachCounter2842];
				{
						if ((((local1_D_1826.attr10_module_Str) === (local6_module_1825.attr8_name_Str)) ? 1 : 0)) {
							var local8_name_Str_1827 = "";
							local8_name_Str_1827 = local1_D_1826.attr8_name_Str;
							local17_Documentation_Str_1822+=(((("## ") + (local8_name_Str_1827))) + ("\n"));
							{
								var local16___SelectHelper1__1828 = "";
								local16___SelectHelper1__1828 = local1_D_1826.attr7_typ_Str;
								if ((((local16___SelectHelper1__1828) === ("FUNCTION")) ? 1 : 0)) {
									local12_Glossary_Str_1824+=(((((((("* [") + (local8_name_Str_1827))) + ("] ("))) + (local8_name_Str_1827))) + (")\n"));
									var forEachSaver2681 = global8_Compiler.attr5_Funcs_ref[0];
									for(var forEachCounter2681 = 0 ; forEachCounter2681 < forEachSaver2681.values.length ; forEachCounter2681++) {
										var local1_F_ref_1829 = forEachSaver2681.values[forEachCounter2681];
									{
											if ((((local1_F_ref_1829[0].attr9_OName_Str) === (local1_D_1826.attr8_name_Str)) ? 1 : 0)) {
												local17_Documentation_Str_1822+=((((">`") + (func20_GenerateFuncName_Str(unref(local1_F_ref_1829[0]))))) + ("`\n\n"));
												break;
												
											};
											
										}
										forEachSaver2681.values[forEachCounter2681] = local1_F_ref_1829;
									
									};
									if ((((BOUNDS(local1_D_1826.attr6_params, 0)) > (0)) ? 1 : 0)) {
										{
											var local16___SelectHelper2__1830 = "";
											local16___SelectHelper2__1830 = param8_Lang_Str;
											if ((((local16___SelectHelper2__1830) === ("EN")) ? 1 : 0)) {
												local17_Documentation_Str_1822+="Parameter | Description\n";
												
											} else if ((((local16___SelectHelper2__1830) === ("DE")) ? 1 : 0)) {
												local17_Documentation_Str_1822+="Parameter | Beschreibung\n";
												
											};
											
										};
										local17_Documentation_Str_1822+="-----------|-----------------------------------------------------------------------\n";
										var forEachSaver2738 = local1_D_1826.attr6_params;
										for(var forEachCounter2738 = 0 ; forEachCounter2738 < forEachSaver2738.values.length ; forEachCounter2738++) {
											var local1_P_1831 = forEachSaver2738.values[forEachCounter2738];
										{
												local17_Documentation_Str_1822+=(((("`") + (local1_P_1831.attr8_name_Str))) + ("`|"));
												local17_Documentation_Str_1822+=((func18_DocLangElement_Str(unref(local1_P_1831.attr4_desc), param8_Lang_Str)) + ("\n"));
												
											}
											forEachSaver2738.values[forEachCounter2738] = local1_P_1831;
										
										};
										
									};
									if ((((BOUNDS(local1_D_1826.attr7_example, 0)) > (0)) ? 1 : 0)) {
										local17_Documentation_Str_1822+=(((("```\n") + (func18_DocLangElement_Str(unref(local1_D_1826.attr7_example), param8_Lang_Str)))) + ("```\n"));
										
									};
									local17_Documentation_Str_1822+=(((("\n") + (func18_DocLangElement_Str(unref(local1_D_1826.attr4_desc), param8_Lang_Str)))) + ("\n"));
									if ((((BOUNDS(local1_D_1826.attr7_see_Str, 0)) > (0)) ? 1 : 0)) {
										var local5_first_1833 = 0;
										{
											var local16___SelectHelper3__1832 = "";
											local16___SelectHelper3__1832 = param8_Lang_Str;
											if ((((local16___SelectHelper3__1832) === ("EN")) ? 1 : 0)) {
												local17_Documentation_Str_1822+="See also: ";
												
											} else if ((((local16___SelectHelper3__1832) === ("DE")) ? 1 : 0)) {
												local17_Documentation_Str_1822+="Siehe auch: ";
												
											};
											
										};
										local5_first_1833 = 0;
										var forEachSaver2835 = local1_D_1826.attr7_see_Str;
										for(var forEachCounter2835 = 0 ; forEachCounter2835 < forEachSaver2835.values.length ; forEachCounter2835++) {
											var local5_s_Str_1834 = forEachSaver2835.values[forEachCounter2835];
										{
												if (local5_first_1833) {
													local17_Documentation_Str_1822+=", ";
													
												};
												local17_Documentation_Str_1822+=(((((((("[") + (local5_s_Str_1834))) + ("] (#"))) + (local5_s_Str_1834))) + (")"));
												local5_first_1833 = 1;
												
											}
											forEachSaver2835.values[forEachCounter2835] = local5_s_Str_1834;
										
										};
										local17_Documentation_Str_1822+="\n";
										
									};
									
								};
								
							};
							
						};
						
					}
					forEachSaver2842.values[forEachCounter2842] = local1_D_1826;
				
				};
				
			};
			
		}
		forEachSaver2844.values[forEachCounter2844] = local6_module_1825;
	
	};
	local17_Documentation_Str_1822 = ((((local12_Glossary_Str_1824) + ("\n"))) + (local17_Documentation_Str_1822));
	func9_WriteFile((((("Documentation_") + (param8_Lang_Str))) + (".md")), local17_Documentation_Str_1822);
	return 0;
	
};
func22_GenerateDocForLanguage = window['func22_GenerateDocForLanguage'];
window['func18_DocLangElement_Str'] = function(param5_Langs, param8_Lang_Str) {
	var local8_Text_Str_1837 = "";
	local8_Text_Str_1837 = "";
	var forEachSaver2886 = param5_Langs;
	for(var forEachCounter2886 = 0 ; forEachCounter2886 < forEachSaver2886.values.length ; forEachCounter2886++) {
		var local1_L_1838 = forEachSaver2886.values[forEachCounter2886];
	{
			if ((((local1_L_1838.attr8_lang_Str) === (param8_Lang_Str)) ? 1 : 0)) {
				local8_Text_Str_1837+=((local1_L_1838.attr8_desc_Str) + ("\n"));
				
			};
			
		}
		forEachSaver2886.values[forEachCounter2886] = local1_L_1838;
	
	};
	return tryClone(local8_Text_Str_1837);
	return "";
	pool_array.free(param5_Langs);
};
func18_DocLangElement_Str = window['func18_DocLangElement_Str'];
window['func20_GenerateFuncName_Str'] = function(param1_F) {
	return tryClone(global8_Compiler.attr6_Tokens.arrAccess(param1_F.attr6_DefTok).values[tmpPositionCache].attr15_LineContent_Str);
	return "";
	
};
func20_GenerateFuncName_Str = window['func20_GenerateFuncName_Str'];
window['func8_ParseDoc'] = function() {
	var local3_doc_2548 = pool_Documentation.alloc(), local8_name_Str_2549 = "";
	local3_doc_2548.attr7_typ_Str = func14_GetCurrent_Str();
	if ((((((func7_IsToken("MODULE")) || (func7_IsToken("FUNCTION"))) ? 1 : 0)) ? 0 : 1)) {
		func5_Error("Unknown ?DOC", 132, "src\DocParser.gbas");
		
	};
	local8_name_Str_2549 = "";
	do {
		func13_RemoveCurrent();
		if ((((local8_name_Str_2549) !== ("")) ? 1 : 0)) {
			local8_name_Str_2549 = ((local8_name_Str_2549) + ("."));
			
		};
		local8_name_Str_2549 = ((local8_name_Str_2549) + (func14_GetCurrent_Str()));
		func13_RemoveCurrent();
		
	} while (!(((func7_IsToken(".")) ? 0 : 1)));
	local3_doc_2548.attr8_name_Str = local8_name_Str_2549;
	func11_RemoveAllNL();
	while ((((func8_EOFParse()) === (1)) ? 1 : 0)) {
		func14_MatchAndRemove("?", 145, "src\DocParser.gbas");
		{
			var local17___SelectHelper41__2550 = "";
			local17___SelectHelper41__2550 = func14_GetCurrent_Str();
			if ((((local17___SelectHelper41__2550) === ("PARAM")) ? 1 : 0)) {
				var local5_param_2551 = pool_ParamElement.alloc();
				func13_RemoveCurrent();
				local5_param_2551.attr8_name_Str = func14_GetCurrent_Str();
				func13_RemoveCurrent();
				func14_MatchAndRemove("\n", 152, "src\DocParser.gbas");
				func12_ParseDocLang(unref(local5_param_2551.attr4_desc), "ENDPARAM");
				DIMPUSH(local3_doc_2548.attr6_params, local5_param_2551);
				pool_ParamElement.free(local5_param_2551);
			} else if ((((local17___SelectHelper41__2550) === ("DESC")) ? 1 : 0)) {
				func13_RemoveCurrent();
				func14_MatchAndRemove("\n", 159, "src\DocParser.gbas");
				func12_ParseDocLang(unref(local3_doc_2548.attr4_desc), "ENDDESC");
				
			} else if ((((local17___SelectHelper41__2550) === ("EXAMPLE")) ? 1 : 0)) {
				func13_RemoveCurrent();
				func14_MatchAndRemove("\n", 164, "src\DocParser.gbas");
				func12_ParseDocLang(unref(local3_doc_2548.attr7_example), "ENDEXAMPLE");
				
			} else if ((((local17___SelectHelper41__2550) === ("SEE")) ? 1 : 0)) {
				func13_RemoveCurrent();
				do {
					DIMPUSH(local3_doc_2548.attr7_see_Str, func14_GetCurrent_Str());
					func13_RemoveCurrent();
					
				} while (!(func7_IsToken("\n")));
				
			} else if ((((local17___SelectHelper41__2550) === ("MODULE")) ? 1 : 0)) {
				func13_RemoveCurrent();
				local3_doc_2548.attr10_module_Str = func14_GetCurrent_Str();
				func13_RemoveCurrent();
				func14_MatchAndRemove("\n", 178, "src\DocParser.gbas");
				
			} else if ((((local17___SelectHelper41__2550) === ("ENDDOC")) ? 1 : 0)) {
				func13_RemoveCurrent();
				break;
				
			};
			
		};
		func11_RemoveAllNL();
		
	};
	DIMPUSH(global14_Documentations, local3_doc_2548);
	return 0;
	pool_Documentation.free(local3_doc_2548);
};
func8_ParseDoc = window['func8_ParseDoc'];
window['func12_ParseDocLang'] = function(param5_langs, param12_endToken_Str) {
	while (func7_IsToken("?")) {
		var local1_l_2554 = pool_LangElement.alloc(), local8_lang_Str_2555 = "", local8_text_Str_2556 = "";
		func13_RemoveCurrent();
		if (func7_IsToken(param12_endToken_Str)) {
			func13_RemoveCurrent();
			return 0;
			
		};
		func14_MatchAndRemove("LANG", 198, "src\DocParser.gbas");
		local8_lang_Str_2555 = func14_GetCurrent_Str();
		func13_RemoveCurrent();
		local8_text_Str_2556 = MID_Str(func14_GetCurrent_Str(), 1, (((func14_GetCurrent_Str()).length) - (2)));
		func13_RemoveCurrent();
		local1_l_2554.attr8_lang_Str = local8_lang_Str_2555;
		local1_l_2554.attr8_desc_Str = REPLACE_Str(local8_text_Str_2556, (("\\") + ("\"")), "\"");
		DIMPUSH(param5_langs, local1_l_2554);
		func11_RemoveAllNL();
		pool_LangElement.free(local1_l_2554);
	};
	if ((((BOUNDS(param5_langs, 0)) === (1)) ? 1 : 0)) {
		var local2_l2_2557 = pool_LangElement.alloc();
		local2_l2_2557 = param5_langs.arrAccess(0).values[tmpPositionCache].clone(/* In Assign */);
		if ((((local2_l2_2557.attr8_lang_Str) === ("EN")) ? 1 : 0)) {
			local2_l2_2557.attr8_lang_Str = "DE";
			
		} else {
			local2_l2_2557.attr8_lang_Str = "EN";
			
		};
		DIMPUSH(param5_langs, local2_l2_2557);
		pool_LangElement.free(local2_l2_2557);
	};
	return 0;
	pool_array.free(param5_langs);
};
func12_ParseDocLang = window['func12_ParseDocLang'];
window['func11_RemoveAllNL'] = function() {
	func14_MatchAndRemove("\n", 225, "src\DocParser.gbas");
	while (func7_IsToken("\n")) {
		func14_MatchAndRemove("\n", 227, "src\DocParser.gbas");
		
	};
	return 0;
	
};
func11_RemoveAllNL = window['func11_RemoveAllNL'];
window['func16_CreateExpression'] = function(param3_Typ, param8_datatype) {
	var local4_tmpD_2560 = pool_TDatatype.alloc(), local3_pos_2561 = 0.0, local1_d_2562 = pool_TDatatype.alloc();
	local4_tmpD_2560 = param8_datatype.clone(/* In Assign */);
	local3_pos_2561 = global10_LastExprID;
	global10_LastExprID = ((global10_LastExprID) + (1));
	if ((((global10_LastExprID) >= (((BOUNDS(global5_Exprs_ref[0], 0)) - (10)))) ? 1 : 0)) {
		REDIM(unref(global5_Exprs_ref[0]), [~~(((global10_LastExprID) + (50)))], [pool_TExpr.alloc()] );
		
	};
	global5_Exprs_ref[0].arrAccess(~~(local3_pos_2561)).values[tmpPositionCache][0].attr3_Typ = param3_Typ;
	local1_d_2562.attr8_Name_Str = local4_tmpD_2560.attr8_Name_Str;
	local1_d_2562.attr7_IsArray = local4_tmpD_2560.attr7_IsArray;
	global5_Exprs_ref[0].arrAccess(~~(local3_pos_2561)).values[tmpPositionCache][0].attr8_datatype = local1_d_2562.clone(/* In Assign */);
	global5_Exprs_ref[0].arrAccess(~~(local3_pos_2561)).values[tmpPositionCache][0].attr2_ID = ~~(local3_pos_2561);
	global5_Exprs_ref[0].arrAccess(~~(local3_pos_2561)).values[tmpPositionCache][0].attr5_tokID = global8_Compiler.attr11_currentPosi;
	return tryClone(~~(local3_pos_2561));
	return 0;
	pool_TDatatype.free(local4_tmpD_2560);pool_TDatatype.free(local1_d_2562);
};
func16_CreateExpression = window['func16_CreateExpression'];
window['func24_CreateOperatorExpression'] = function(param2_Op, param4_Left, param5_Right) {
	var local4_Expr_2566 = 0, local8_datatype_2567 = pool_TDatatype.alloc();
	var local4_Left_ref_2564 = [param4_Left];
	var local5_Right_ref_2565 = [param5_Right];
	local8_datatype_2567 = func12_CastDatatype(local4_Left_ref_2564, local5_Right_ref_2565).clone(/* In Assign */);
	if ((((param2_Op.attr3_Typ) === (3)) ? 1 : 0)) {
		local8_datatype_2567 = global11_intDatatype.clone(/* In Assign */);
		
	};
	local4_Expr_2566 = func16_CreateExpression(~~(1), local8_datatype_2567);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2566).values[tmpPositionCache][0].attr4_Left = local4_Left_ref_2564[0];
	global5_Exprs_ref[0].arrAccess(local4_Expr_2566).values[tmpPositionCache][0].attr5_Right = local5_Right_ref_2565[0];
	global5_Exprs_ref[0].arrAccess(local4_Expr_2566).values[tmpPositionCache][0].attr2_Op = param2_Op.attr2_ID;
	return tryClone(local4_Expr_2566);
	return 0;
	pool_TDatatype.free(local8_datatype_2567);
};
func24_CreateOperatorExpression = window['func24_CreateOperatorExpression'];
window['func19_CreateIntExpression'] = function(param3_Num) {
	var local4_Expr_2569 = 0;
	local4_Expr_2569 = func16_CreateExpression(~~(3), global11_intDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2569).values[tmpPositionCache][0].attr6_intval = param3_Num;
	return tryClone(local4_Expr_2569);
	return 0;
	
};
func19_CreateIntExpression = window['func19_CreateIntExpression'];
window['func21_CreateFloatExpression'] = function(param3_Num) {
	var local4_Expr_2571 = 0;
	local4_Expr_2571 = func16_CreateExpression(~~(4), global13_floatDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2571).values[tmpPositionCache][0].attr8_floatval = param3_Num;
	return tryClone(local4_Expr_2571);
	return 0;
	
};
func21_CreateFloatExpression = window['func21_CreateFloatExpression'];
window['func19_CreateStrExpression'] = function(param7_Str_Str) {
	var local4_Expr_2573 = 0;
	local4_Expr_2573 = func16_CreateExpression(~~(5), global11_strDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2573).values[tmpPositionCache][0].attr10_strval_Str = param7_Str_Str;
	return tryClone(local4_Expr_2573);
	return 0;
	
};
func19_CreateStrExpression = window['func19_CreateStrExpression'];
window['func21_CreateScopeExpression'] = function(param6_ScpTyp) {
	var local3_Scp_2575 = 0;
	local3_Scp_2575 = func16_CreateExpression(~~(2), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local3_Scp_2575).values[tmpPositionCache][0].attr10_SuperScope = global8_Compiler.attr12_CurrentScope;
	global5_Exprs_ref[0].arrAccess(local3_Scp_2575).values[tmpPositionCache][0].attr6_ScpTyp = param6_ScpTyp;
	return tryClone(local3_Scp_2575);
	return 0;
	
};
func21_CreateScopeExpression = window['func21_CreateScopeExpression'];
window['func24_CreateFuncCallExpression'] = function(param4_func, param6_Params) {
	var local4_Expr_2578 = 0;
	local4_Expr_2578 = func16_CreateExpression(~~(6), global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr8_datatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2578).values[tmpPositionCache][0].attr6_Params = param6_Params.clone(/* In Assign */);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2578).values[tmpPositionCache][0].attr4_func = param4_func;
	return tryClone(local4_Expr_2578);
	return 0;
	pool_array.free(param6_Params);
};
func24_CreateFuncCallExpression = window['func24_CreateFuncCallExpression'];
window['func21_CreateEmptyExpression'] = function() {
	return tryClone(func16_CreateExpression(~~(7), global12_voidDatatype));
	return 0;
	
};
func21_CreateEmptyExpression = window['func21_CreateEmptyExpression'];
window['func21_CreateDebugExpression'] = function() {
	return tryClone(func16_CreateExpression(~~(8), global12_voidDatatype));
	return 0;
	
};
func21_CreateDebugExpression = window['func21_CreateDebugExpression'];
window['func24_CreateVariableExpression'] = function(param4_vari) {
	if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_vari).values[tmpPositionCache][0].attr3_Typ) === (6)) ? 1 : 0)) {
		return tryClone(global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_vari).values[tmpPositionCache][0].attr6_PreDef);
		
	} else {
		var local4_Expr_2580 = 0;
		local4_Expr_2580 = func16_CreateExpression(~~(9), global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_vari).values[tmpPositionCache][0].attr8_datatype);
		global5_Exprs_ref[0].arrAccess(local4_Expr_2580).values[tmpPositionCache][0].attr4_vari = param4_vari;
		return tryClone(local4_Expr_2580);
		
	};
	return 0;
	
};
func24_CreateVariableExpression = window['func24_CreateVariableExpression'];
window['func22_CreateAssignExpression'] = function(param4_Vari, param5_Right) {
	var local4_Expr_2583 = 0;
	local4_Expr_2583 = func16_CreateExpression(~~(10), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2583).values[tmpPositionCache][0].attr4_vari = param4_Vari;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2583).values[tmpPositionCache][0].attr5_Right = param5_Right;
	return tryClone(local4_Expr_2583);
	return 0;
	
};
func22_CreateAssignExpression = window['func22_CreateAssignExpression'];
window['func19_CreateDimExpression'] = function(param5_Array, param4_Dims) {
	var local4_Expr_2586 = 0;
	local4_Expr_2586 = func16_CreateExpression(~~(11), global5_Exprs_ref[0].arrAccess(param5_Array).values[tmpPositionCache][0].attr8_datatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2586).values[tmpPositionCache][0].attr5_array = param5_Array;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2586).values[tmpPositionCache][0].attr4_dims = param4_Dims.clone(/* In Assign */);
	return tryClone(local4_Expr_2586);
	return 0;
	pool_array.free(param4_Dims);
};
func19_CreateDimExpression = window['func19_CreateDimExpression'];
window['func21_CreateReDimExpression'] = function(param5_Array, param4_Dims) {
	var local4_Expr_2589 = 0;
	local4_Expr_2589 = func16_CreateExpression(~~(12), global5_Exprs_ref[0].arrAccess(param5_Array).values[tmpPositionCache][0].attr8_datatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2589).values[tmpPositionCache][0].attr5_array = param5_Array;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2589).values[tmpPositionCache][0].attr4_dims = param4_Dims.clone(/* In Assign */);
	return tryClone(local4_Expr_2589);
	return 0;
	pool_array.free(param4_Dims);
};
func21_CreateReDimExpression = window['func21_CreateReDimExpression'];
window['func21_CreateArrayExpression'] = function(param5_Array, param4_Dims) {
	var local7_tmpData_2592 = pool_TDatatype.alloc(), local4_Expr_2593 = 0;
	local7_tmpData_2592 = global5_Exprs_ref[0].arrAccess(param5_Array).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
	if (((((((global5_Exprs_ref[0].arrAccess(param5_Array).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) && (global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(param5_Array, 1)).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray)) ? 1 : 0)) && (BOUNDS(param4_Dims, 0))) ? 1 : 0)) {
		local7_tmpData_2592.attr7_IsArray = 0;
		
	};
	local4_Expr_2593 = func16_CreateExpression(~~(13), local7_tmpData_2592);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2593).values[tmpPositionCache][0].attr5_array = param5_Array;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2593).values[tmpPositionCache][0].attr4_dims = param4_Dims.clone(/* In Assign */);
	return tryClone(local4_Expr_2593);
	return 0;
	pool_array.free(param4_Dims);pool_TDatatype.free(local7_tmpData_2592);
};
func21_CreateArrayExpression = window['func21_CreateArrayExpression'];
window['func24_CreateCast2IntExpression'] = function(param4_expr) {
	var local4_Expr_2762 = 0;
	local4_Expr_2762 = func16_CreateExpression(~~(15), global11_intDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2762).values[tmpPositionCache][0].attr4_expr = param4_expr;
	return tryClone(local4_Expr_2762);
	return 0;
	
};
func24_CreateCast2IntExpression = window['func24_CreateCast2IntExpression'];
window['func26_CreateCast2FloatExpression'] = function(param4_expr) {
	var local4_Expr_2764 = 0;
	local4_Expr_2764 = func16_CreateExpression(~~(16), global13_floatDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2764).values[tmpPositionCache][0].attr4_expr = param4_expr;
	return tryClone(local4_Expr_2764);
	return 0;
	
};
func26_CreateCast2FloatExpression = window['func26_CreateCast2FloatExpression'];
window['func27_CreateCast2StringExpression'] = function(param4_expr) {
	var local4_Expr_2766 = 0;
	local4_Expr_2766 = func16_CreateExpression(~~(17), global11_strDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2766).values[tmpPositionCache][0].attr4_expr = param4_expr;
	return tryClone(local4_Expr_2766);
	return 0;
	
};
func27_CreateCast2StringExpression = window['func27_CreateCast2StringExpression'];
window['func22_CreateAccessExpression'] = function(param4_expr, param8_NextExpr) {
	if (((((((param4_expr) === (param8_NextExpr)) ? 1 : 0)) && ((((param4_expr) === (-(1))) ? 1 : 0))) ? 1 : 0)) {
		func5_Error("Internal error (expr and nextexpr = -1)", 347, "src\Expression.gbas");
		
	};
	if ((((param4_expr) === (-(1))) ? 1 : 0)) {
		return tryClone(param8_NextExpr);
		
	} else if ((((param8_NextExpr) === (-(1))) ? 1 : 0)) {
		return tryClone(param4_expr);
		
	} else {
		var local9_ONextExpr_2596 = 0;
		local9_ONextExpr_2596 = param8_NextExpr;
		if ((((global5_Exprs_ref[0].arrAccess(param8_NextExpr).values[tmpPositionCache][0].attr3_Typ) === (13)) ? 1 : 0)) {
			param8_NextExpr = global5_Exprs_ref[0].arrAccess(param8_NextExpr).values[tmpPositionCache][0].attr5_array;
			
		};
		if ((((global5_Exprs_ref[0].arrAccess(param8_NextExpr).values[tmpPositionCache][0].attr3_Typ) === (6)) ? 1 : 0)) {
			DIMPUSH(global5_Exprs_ref[0].arrAccess(param8_NextExpr).values[tmpPositionCache][0].attr6_Params, param4_expr);
			return tryClone(local9_ONextExpr_2596);
			
		} else {
			var local4_Expr_2597 = 0;
			param8_NextExpr = local9_ONextExpr_2596;
			local4_Expr_2597 = func16_CreateExpression(~~(18), global5_Exprs_ref[0].arrAccess(param8_NextExpr).values[tmpPositionCache][0].attr8_datatype);
			global5_Exprs_ref[0].arrAccess(local4_Expr_2597).values[tmpPositionCache][0].attr4_expr = param4_expr;
			global5_Exprs_ref[0].arrAccess(local4_Expr_2597).values[tmpPositionCache][0].attr8_nextExpr = param8_NextExpr;
			return tryClone(local4_Expr_2597);
			
		};
		
	};
	return 0;
	
};
func22_CreateAccessExpression = window['func22_CreateAccessExpression'];
window['func22_CreateReturnExpression'] = function(param4_expr) {
	var local4_Expr_2599 = 0;
	local4_Expr_2599 = func16_CreateExpression(~~(19), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2599).values[tmpPositionCache][0].attr4_expr = param4_expr;
	return tryClone(local4_Expr_2599);
	return 0;
	
};
func22_CreateReturnExpression = window['func22_CreateReturnExpression'];
window['func20_CreateGotoExpression'] = function(param8_Name_Str) {
	var local4_Expr_2601 = 0;
	local4_Expr_2601 = func16_CreateExpression(~~(20), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2601).values[tmpPositionCache][0].attr8_Name_Str = param8_Name_Str;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2601).values[tmpPositionCache][0].attr3_Scp = global8_Compiler.attr12_CurrentScope;
	return tryClone(local4_Expr_2601);
	return 0;
	
};
func20_CreateGotoExpression = window['func20_CreateGotoExpression'];
window['func21_CreateLabelExpression'] = function(param8_Name_Str) {
	var local4_Expr_2603 = 0;
	local4_Expr_2603 = func16_CreateExpression(~~(21), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2603).values[tmpPositionCache][0].attr8_Name_Str = param8_Name_Str;
	return tryClone(local4_Expr_2603);
	return 0;
	
};
func21_CreateLabelExpression = window['func21_CreateLabelExpression'];
window['func24_CreateFuncDataExpression'] = function(param1_d) {
	return tryClone(func16_CreateExpression(~~(22), param1_d));
	return 0;
	
};
func24_CreateFuncDataExpression = window['func24_CreateFuncDataExpression'];
window['func25_CreateProtoCallExpression'] = function(param4_expr, param6_Params) {
	var local4_Func_2607 = 0, local4_Expr_2608 = 0;
	local4_Func_2607 = func14_SearchPrototyp(global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str);
	if ((((local4_Func_2607) === (-(1))) ? 1 : 0)) {
		func5_Error((((("Internal error (could not find prototype: ") + (global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) + (")")), 399, "src\Expression.gbas");
		
	};
	local4_Expr_2608 = func16_CreateExpression(~~(23), global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr8_datatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2608).values[tmpPositionCache][0].attr4_expr = param4_expr;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2608).values[tmpPositionCache][0].attr6_Params = param6_Params.clone(/* In Assign */);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2608).values[tmpPositionCache][0].attr4_func = local4_Func_2607;
	return tryClone(local4_Expr_2608);
	return 0;
	pool_array.free(param6_Params);
};
func25_CreateProtoCallExpression = window['func25_CreateProtoCallExpression'];
window['func18_CreateIfExpression'] = function(param5_Conds, param4_Scps, param7_elseScp) {
	var local4_Expr_2612 = 0;
	local4_Expr_2612 = func16_CreateExpression(~~(24), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2612).values[tmpPositionCache][0].attr10_Conditions = param5_Conds.clone(/* In Assign */);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2612).values[tmpPositionCache][0].attr6_Scopes = param4_Scps.clone(/* In Assign */);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2612).values[tmpPositionCache][0].attr9_elseScope = param7_elseScp;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2612).values[tmpPositionCache][0].attr5_dummy = func21_CreateDummyExpression();
	return tryClone(local4_Expr_2612);
	return 0;
	pool_array.free(param4_Scps);
};
func18_CreateIfExpression = window['func18_CreateIfExpression'];
window['func21_CreateWhileExpression'] = function(param4_expr, param3_Scp) {
	var local4_Expr_2615 = 0;
	local4_Expr_2615 = func16_CreateExpression(~~(25), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2615).values[tmpPositionCache][0].attr4_expr = param4_expr;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2615).values[tmpPositionCache][0].attr3_Scp = param3_Scp;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2615).values[tmpPositionCache][0].attr5_dummy = func21_CreateDummyExpression();
	return tryClone(local4_Expr_2615);
	return 0;
	
};
func21_CreateWhileExpression = window['func21_CreateWhileExpression'];
window['func22_CreateRepeatExpression'] = function(param4_expr, param3_Scp) {
	var local4_Expr_2618 = 0;
	local4_Expr_2618 = func16_CreateExpression(~~(26), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2618).values[tmpPositionCache][0].attr4_expr = param4_expr;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2618).values[tmpPositionCache][0].attr3_Scp = param3_Scp;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2618).values[tmpPositionCache][0].attr5_dummy = func21_CreateDummyExpression();
	return tryClone(local4_Expr_2618);
	return 0;
	
};
func22_CreateRepeatExpression = window['func22_CreateRepeatExpression'];
window['func19_CreateForExpression'] = function(param7_varExpr, param6_toExpr, param8_stepExpr, param5_hasTo, param3_Scp) {
	var local4_Expr_2624 = 0;
	local4_Expr_2624 = func16_CreateExpression(~~(27), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2624).values[tmpPositionCache][0].attr7_varExpr = param7_varExpr;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2624).values[tmpPositionCache][0].attr6_toExpr = param6_toExpr;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2624).values[tmpPositionCache][0].attr8_stepExpr = param8_stepExpr;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2624).values[tmpPositionCache][0].attr3_Scp = param3_Scp;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2624).values[tmpPositionCache][0].attr5_hasTo = param5_hasTo;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2624).values[tmpPositionCache][0].attr5_dummy = func21_CreateDummyExpression();
	return tryClone(local4_Expr_2624);
	return 0;
	
};
func19_CreateForExpression = window['func19_CreateForExpression'];
window['func23_CreateForEachExpression'] = function(param7_varExpr, param6_inExpr, param3_Scp) {
	var local4_Expr_2628 = 0;
	local4_Expr_2628 = func16_CreateExpression(~~(38), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2628).values[tmpPositionCache][0].attr7_varExpr = param7_varExpr;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2628).values[tmpPositionCache][0].attr6_inExpr = param6_inExpr;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2628).values[tmpPositionCache][0].attr3_Scp = param3_Scp;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2628).values[tmpPositionCache][0].attr5_dummy = func21_CreateDummyExpression();
	return tryClone(local4_Expr_2628);
	return 0;
	
};
func23_CreateForEachExpression = window['func23_CreateForEachExpression'];
window['func21_CreateBreakExpression'] = function() {
	return tryClone(func16_CreateExpression(~~(29), global12_voidDatatype));
	return 0;
	
};
func21_CreateBreakExpression = window['func21_CreateBreakExpression'];
window['func24_CreateContinueExpression'] = function() {
	return tryClone(func16_CreateExpression(~~(30), global12_voidDatatype));
	return 0;
	
};
func24_CreateContinueExpression = window['func24_CreateContinueExpression'];
window['func19_CreateTryExpression'] = function(param6_tryScp, param7_ctchScp, param4_vari) {
	var local4_Expr_2632 = 0;
	local4_Expr_2632 = func16_CreateExpression(~~(31), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2632).values[tmpPositionCache][0].attr3_Scp = param6_tryScp;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2632).values[tmpPositionCache][0].attr8_catchScp = param7_ctchScp;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2632).values[tmpPositionCache][0].attr4_vari = param4_vari;
	return tryClone(local4_Expr_2632);
	return 0;
	
};
func19_CreateTryExpression = window['func19_CreateTryExpression'];
window['func21_CreateThrowExpression'] = function(param5_value) {
	var local4_Expr_2634 = 0;
	local4_Expr_2634 = func16_CreateExpression(~~(32), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2634).values[tmpPositionCache][0].attr4_expr = param5_value;
	return tryClone(local4_Expr_2634);
	return 0;
	
};
func21_CreateThrowExpression = window['func21_CreateThrowExpression'];
window['func23_CreateRestoreExpression'] = function(param8_Name_Str) {
	var local4_Expr_2636 = 0;
	local4_Expr_2636 = func16_CreateExpression(~~(33), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2636).values[tmpPositionCache][0].attr8_Name_Str = param8_Name_Str;
	return tryClone(local4_Expr_2636);
	return 0;
	
};
func23_CreateRestoreExpression = window['func23_CreateRestoreExpression'];
window['func20_CreateReadExpression'] = function(param5_Reads) {
	var local4_Expr_2638 = 0;
	local4_Expr_2638 = func16_CreateExpression(~~(34), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2638).values[tmpPositionCache][0].attr5_Reads = param5_Reads.clone(/* In Assign */);
	return tryClone(local4_Expr_2638);
	return 0;
	pool_array.free(param5_Reads);
};
func20_CreateReadExpression = window['func20_CreateReadExpression'];
window['func28_CreateDefaultValueExpression'] = function(param8_datatype) {
	if (param8_datatype.attr7_IsArray) {
		return tryClone(func16_CreateExpression(~~(35), param8_datatype));
		
	} else {
		{
			var local17___SelectHelper42__2640 = "";
			local17___SelectHelper42__2640 = param8_datatype.attr8_Name_Str;
			if ((((local17___SelectHelper42__2640) === ("int")) ? 1 : 0)) {
				return tryClone(func19_CreateIntExpression(0));
				
			} else if ((((local17___SelectHelper42__2640) === ("float")) ? 1 : 0)) {
				return tryClone(func21_CreateFloatExpression(0));
				
			} else if ((((local17___SelectHelper42__2640) === ("string")) ? 1 : 0)) {
				return tryClone(func19_CreateStrExpression("\"\""));
				
			} else if ((((local17___SelectHelper42__2640) === ("void")) ? 1 : 0)) {
				return tryClone(func19_CreateIntExpression(0));
				
			} else {
				return tryClone(func16_CreateExpression(~~(35), param8_datatype));
				
			};
			
		};
		
	};
	return 0;
	
};
func28_CreateDefaultValueExpression = window['func28_CreateDefaultValueExpression'];
window['func25_CreateDimAsExprExpression'] = function(param8_datatype, param4_dims) {
	var local4_Expr_2769 = 0;
	local4_Expr_2769 = func16_CreateExpression(~~(36), param8_datatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2769).values[tmpPositionCache][0].attr4_dims = param4_dims.clone(/* In Assign */);
	return tryClone(local4_Expr_2769);
	return 0;
	pool_array.free(param4_dims);
};
func25_CreateDimAsExprExpression = window['func25_CreateDimAsExprExpression'];
window['func21_CreateAliasExpression'] = function(param4_vari, param4_expr) {
	var local4_Expr_2643 = 0;
	local4_Expr_2643 = func16_CreateExpression(~~(37), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2643).values[tmpPositionCache][0].attr4_vari = param4_vari;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2643).values[tmpPositionCache][0].attr4_expr = param4_expr;
	return tryClone(local4_Expr_2643);
	return 0;
	
};
func21_CreateAliasExpression = window['func21_CreateAliasExpression'];
window['func19_CreateIncExpression'] = function(param4_Vari, param7_AddExpr) {
	var local4_Expr_2646 = 0;
	local4_Expr_2646 = func16_CreateExpression(~~(39), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2646).values[tmpPositionCache][0].attr4_vari = param4_Vari;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2646).values[tmpPositionCache][0].attr4_expr = param7_AddExpr;
	return tryClone(local4_Expr_2646);
	return 0;
	
};
func19_CreateIncExpression = window['func19_CreateIncExpression'];
window['func23_CreateDimpushExpression'] = function(param4_vari, param4_expr) {
	var local4_Expr_2649 = 0;
	local4_Expr_2649 = func16_CreateExpression(~~(40), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2649).values[tmpPositionCache][0].attr4_vari = param4_vari;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2649).values[tmpPositionCache][0].attr4_expr = param4_expr;
	return tryClone(local4_Expr_2649);
	return 0;
	
};
func23_CreateDimpushExpression = window['func23_CreateDimpushExpression'];
window['func19_CreateLenExpression'] = function(param4_expr, param4_kern) {
	var local4_Expr_2772 = 0;
	local4_Expr_2772 = func16_CreateExpression(~~(41), global11_intDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2772).values[tmpPositionCache][0].attr4_expr = param4_expr;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2772).values[tmpPositionCache][0].attr4_kern = param4_kern;
	return tryClone(local4_Expr_2772);
	return 0;
	
};
func19_CreateLenExpression = window['func19_CreateLenExpression'];
window['func23_CreateDimDataExpression'] = function(param5_array, param5_exprs) {
	var local4_Expr_2652 = 0;
	local4_Expr_2652 = func16_CreateExpression(~~(42), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2652).values[tmpPositionCache][0].attr5_array = param5_array;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2652).values[tmpPositionCache][0].attr5_Exprs = param5_exprs.clone(/* In Assign */);
	return tryClone(local4_Expr_2652);
	return 0;
	pool_array.free(param5_exprs);
};
func23_CreateDimDataExpression = window['func23_CreateDimDataExpression'];
window['func22_CreateDeleteExpression'] = function() {
	return tryClone(func16_CreateExpression(~~(43), global12_voidDatatype));
	return 0;
	
};
func22_CreateDeleteExpression = window['func22_CreateDeleteExpression'];
window['func22_CreateDimDelExpression'] = function(param5_array, param8_position) {
	var local4_Expr_2655 = 0;
	local4_Expr_2655 = func16_CreateExpression(~~(44), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2655).values[tmpPositionCache][0].attr5_array = param5_array;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2655).values[tmpPositionCache][0].attr8_position = param8_position;
	return tryClone(local4_Expr_2655);
	return 0;
	
};
func22_CreateDimDelExpression = window['func22_CreateDimDelExpression'];
window['func21_CreateBoundExpression'] = function(param4_expr, param8_position) {
	var local4_Expr_2775 = 0;
	local4_Expr_2775 = func16_CreateExpression(~~(45), global11_intDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2775).values[tmpPositionCache][0].attr5_array = param4_expr;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2775).values[tmpPositionCache][0].attr8_position = param8_position;
	return tryClone(local4_Expr_2775);
	return 0;
	
};
func21_CreateBoundExpression = window['func21_CreateBoundExpression'];
window['func19_CreateNotExpression'] = function(param4_expr) {
	var local4_Expr_2777 = 0;
	local4_Expr_2777 = func16_CreateExpression(~~(46), global13_floatDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2777).values[tmpPositionCache][0].attr4_expr = param4_expr;
	return tryClone(local4_Expr_2777);
	return 0;
	
};
func19_CreateNotExpression = window['func19_CreateNotExpression'];
window['func21_CreateDummyExpression'] = function() {
	return 0;
	return 0;
	
};
func21_CreateDummyExpression = window['func21_CreateDummyExpression'];
window['func25_CreateAddressOfExpression'] = function(param4_func) {
	var local4_Expr_2779 = 0;
	local4_Expr_2779 = func16_CreateExpression(~~(48), global11_intDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2779).values[tmpPositionCache][0].attr4_func = param4_func;
	return tryClone(local4_Expr_2779);
	return 0;
	
};
func25_CreateAddressOfExpression = window['func25_CreateAddressOfExpression'];
window['func22_CreateAssertExpression'] = function(param4_expr) {
	var local4_Expr_2657 = 0;
	local4_Expr_2657 = func16_CreateExpression(~~(49), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2657).values[tmpPositionCache][0].attr4_expr = param4_expr;
	return tryClone(local4_Expr_2657);
	return 0;
	
};
func22_CreateAssertExpression = window['func22_CreateAssertExpression'];
window['func27_CreateDebugOutputExpression'] = function(param4_expr) {
	var local4_Expr_2659 = 0;
	local4_Expr_2659 = func16_CreateExpression(~~(50), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2659).values[tmpPositionCache][0].attr4_expr = param4_expr;
	return tryClone(local4_Expr_2659);
	return 0;
	
};
func27_CreateDebugOutputExpression = window['func27_CreateDebugOutputExpression'];
window['func19_CreateIIFExpression'] = function(param4_Cond, param6_onTrue, param7_onFalse) {
	var local4_Expr_2783 = 0;
	local4_Expr_2783 = func16_CreateExpression(~~(51), global5_Exprs_ref[0].arrAccess(param6_onTrue).values[tmpPositionCache][0].attr8_datatype);
	DIMDATA(global5_Exprs_ref[0].arrAccess(local4_Expr_2783).values[tmpPositionCache][0].attr10_Conditions, [param4_Cond]);
	DIMDATA(global5_Exprs_ref[0].arrAccess(local4_Expr_2783).values[tmpPositionCache][0].attr6_Scopes, [param6_onTrue]);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2783).values[tmpPositionCache][0].attr9_elseScope = param7_onFalse;
	return tryClone(local4_Expr_2783);
	return 0;
	
};
func19_CreateIIFExpression = window['func19_CreateIIFExpression'];
window['func23_CreateRequireExpression'] = function(param8_Path_Str) {
	var local4_Expr_2661 = 0;
	local4_Expr_2661 = func16_CreateExpression(~~(52), global12_voidDatatype);
	if ((((REVINSTR(param8_Path_Str, ".", -(1))) !== (-(1))) ? 1 : 0)) {
		{
			var local17___SelectHelper43__2662 = "";
			local17___SelectHelper43__2662 = MID_Str(param8_Path_Str, ((REVINSTR(param8_Path_Str, ".", -(1))) + (1)), -(1));
			if ((((local17___SelectHelper43__2662) === ("js")) ? 1 : 0)) {
				
			} else {
				func5_Error("Cannot not REQUIRE non javascript files...", 643, "src\Expression.gbas");
				
			};
			
		};
		
	};
	global5_Exprs_ref[0].arrAccess(local4_Expr_2661).values[tmpPositionCache][0].attr8_Name_Str = param8_Path_Str;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2661).values[tmpPositionCache][0].attr11_Content_Str = func12_LoadFile_Str(param8_Path_Str);
	return tryClone(local4_Expr_2661);
	return 0;
	
};
func23_CreateRequireExpression = window['func23_CreateRequireExpression'];
window['func21_CreateSuperExpression'] = function(param3_typ) {
	var local1_d_2664 = pool_TDatatype.alloc();
	local1_d_2664.attr7_IsArray = 0;
	local1_d_2664.attr8_Name_Str = global8_Compiler.attr5_Types_ref[0].arrAccess(param3_typ).values[tmpPositionCache][0].attr8_Name_Str;
	return tryClone(func16_CreateExpression(~~(53), local1_d_2664));
	return 0;
	pool_TDatatype.free(local1_d_2664);
};
func21_CreateSuperExpression = window['func21_CreateSuperExpression'];
window['func14_CreateCast2Obj'] = function(param7_Obj_Str, param4_expr) {
	var local1_d_2667 = pool_TDatatype.alloc(), local4_Expr_2668 = 0;
	local1_d_2667.attr7_IsArray = 0;
	local1_d_2667.attr8_Name_Str = param7_Obj_Str;
	local4_Expr_2668 = func16_CreateExpression(~~(54), local1_d_2667);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2668).values[tmpPositionCache][0].attr4_expr = param4_expr;
	return tryClone(local4_Expr_2668);
	return 0;
	pool_TDatatype.free(local1_d_2667);
};
func14_CreateCast2Obj = window['func14_CreateCast2Obj'];
window['method13_type7_HashMap_3_Put'] = function(param7_Key_Str, param5_Value, param4_self) {
	var local2_KV_1844 = pool_KeyValue.alloc(), local4_hash_1845 = 0, alias6_Bucket_ref_1846 = [pool_Bucket.alloc()];
	if ((((param7_Key_Str) === ("")) ? 1 : 0)) {
		func5_Error("Cannot insert empty key you son of a bitch.", 19, "Hashmap.gbas");
		
	};
	if ((((BOUNDS(param4_self.attr7_Buckets_ref[0], 0)) === (0)) ? 1 : 0)) {
		(param4_self).SetSize(32);
		
	};
	if ((((param4_self).DoesKeyExist(param7_Key_Str)) ? 0 : 1)) {
		param4_self.attr8_Elements+=1;
		
	};
	if ((((param4_self.attr8_Elements) > (((CAST2INT(((BOUNDS(param4_self.attr7_Buckets_ref[0], 0)) / (3)))) * (2)))) ? 1 : 0)) {
		(param4_self).SetSize(((BOUNDS(param4_self.attr7_Buckets_ref[0], 0)) * (4)));
		
	};
	local2_KV_1844.attr7_Key_Str = param7_Key_Str;
	local2_KV_1844.attr5_Value = param5_Value;
	local4_hash_1845 = func7_HashStr(param7_Key_Str, ((BOUNDS(param4_self.attr7_Buckets_ref[0], 0)) - (1)));
	alias6_Bucket_ref_1846 = param4_self.attr7_Buckets_ref[0].arrAccess(local4_hash_1845).values[tmpPositionCache] /* ALIAS */;
	if (alias6_Bucket_ref_1846[0].attr3_Set) {
		if ((((BOUNDS(alias6_Bucket_ref_1846[0].attr8_Elements, 0)) === (0)) ? 1 : 0)) {
			DIMPUSH(alias6_Bucket_ref_1846[0].attr8_Elements, alias6_Bucket_ref_1846[0].attr7_Element);
			
		};
		DIMPUSH(alias6_Bucket_ref_1846[0].attr8_Elements, local2_KV_1844);
		
	} else {
		alias6_Bucket_ref_1846[0].attr3_Set = 1;
		alias6_Bucket_ref_1846[0].attr7_Element = local2_KV_1844.clone(/* In Assign */);
		
	};
	return 0;
	pool_KeyValue.free(local2_KV_1844);pool_Bucket.free(alias6_Bucket_ref_1846);
};
method13_type7_HashMap_3_Put = window['method13_type7_HashMap_3_Put'];
window['method13_type7_HashMap_12_DoesKeyExist'] = function(param7_Key_Str, param4_self) {
	var local5_Value_ref_1850 = [0];
	return tryClone((param4_self).GetValue(param7_Key_Str, local5_Value_ref_1850));
	return 0;
	
};
method13_type7_HashMap_12_DoesKeyExist = window['method13_type7_HashMap_12_DoesKeyExist'];
window['method13_type7_HashMap_8_GetValue'] = function(param7_Key_Str, param5_Value_ref, param4_self) {
	var local4_hash_1855 = 0, alias6_Bucket_ref_1856 = [pool_Bucket.alloc()];
	local4_hash_1855 = func7_HashStr(param7_Key_Str, ((BOUNDS(param4_self.attr7_Buckets_ref[0], 0)) - (1)));
	if ((((local4_hash_1855) >= (BOUNDS(param4_self.attr7_Buckets_ref[0], 0))) ? 1 : 0)) {
		return tryClone(0);
		
	};
	alias6_Bucket_ref_1856 = param4_self.attr7_Buckets_ref[0].arrAccess(local4_hash_1855).values[tmpPositionCache] /* ALIAS */;
	if (alias6_Bucket_ref_1856[0].attr3_Set) {
		if ((((BOUNDS(alias6_Bucket_ref_1856[0].attr8_Elements, 0)) === (0)) ? 1 : 0)) {
			if ((((alias6_Bucket_ref_1856[0].attr7_Element.attr7_Key_Str) !== (param7_Key_Str)) ? 1 : 0)) {
				param5_Value_ref[0] = 0;
				return tryClone(0);
				
			} else {
				param5_Value_ref[0] = alias6_Bucket_ref_1856[0].attr7_Element.attr5_Value;
				return 1;
				
			};
			
		} else {
			{
				var local1_i_1857 = 0.0;
				for (local1_i_1857 = 0;toCheck(local1_i_1857, ((BOUNDS(alias6_Bucket_ref_1856[0].attr8_Elements, 0)) - (1)), 1);local1_i_1857 += 1) {
					if ((((alias6_Bucket_ref_1856[0].attr8_Elements.arrAccess(~~(local1_i_1857)).values[tmpPositionCache].attr7_Key_Str) === (param7_Key_Str)) ? 1 : 0)) {
						param5_Value_ref[0] = alias6_Bucket_ref_1856[0].attr8_Elements.arrAccess(~~(local1_i_1857)).values[tmpPositionCache].attr5_Value;
						return 1;
						
					};
					
				};
				
			};
			return tryClone(0);
			
		};
		
	} else {
		return tryClone(0);
		
	};
	return 0;
	pool_Bucket.free(alias6_Bucket_ref_1856);
};
method13_type7_HashMap_8_GetValue = window['method13_type7_HashMap_8_GetValue'];
window['method13_type7_HashMap_6_Remove'] = function(param7_Key_Str, param4_self) {
	var local4_hash_1861 = 0, alias6_Bucket_ref_1862 = [pool_Bucket.alloc()];
	local4_hash_1861 = func7_HashStr(param7_Key_Str, ((BOUNDS(param4_self.attr7_Buckets_ref[0], 0)) - (1)));
	alias6_Bucket_ref_1862 = param4_self.attr7_Buckets_ref[0].arrAccess(local4_hash_1861).values[tmpPositionCache] /* ALIAS */;
	if (alias6_Bucket_ref_1862[0].attr3_Set) {
		if ((((alias6_Bucket_ref_1862[0].attr7_Element.attr7_Key_Str) === (param7_Key_Str)) ? 1 : 0)) {
			var local1_e_1863 = pool_KeyValue.alloc();
			param4_self.attr8_Elements+=-1;
			alias6_Bucket_ref_1862[0].attr7_Element = local1_e_1863.clone(/* In Assign */);
			alias6_Bucket_ref_1862[0].attr3_Set = 0;
			pool_KeyValue.free(local1_e_1863);
		} else {
			var local4_Find_1864 = 0;
			local4_Find_1864 = 0;
			{
				var local1_i_1865 = 0.0;
				for (local1_i_1865 = 0;toCheck(local1_i_1865, ((BOUNDS(alias6_Bucket_ref_1862[0].attr8_Elements, 0)) - (1)), 1);local1_i_1865 += 1) {
					if ((((alias6_Bucket_ref_1862[0].attr8_Elements.arrAccess(~~(local1_i_1865)).values[tmpPositionCache].attr7_Key_Str) === (param7_Key_Str)) ? 1 : 0)) {
						local4_Find_1864 = 1;
						DIMDEL(alias6_Bucket_ref_1862[0].attr8_Elements, ~~(local1_i_1865));
						break;
						
					};
					
				};
				
			};
			if ((((BOUNDS(alias6_Bucket_ref_1862[0].attr8_Elements, 0)) === (1)) ? 1 : 0)) {
				alias6_Bucket_ref_1862[0].attr7_Element = alias6_Bucket_ref_1862[0].attr8_Elements.arrAccess(0).values[tmpPositionCache].clone(/* In Assign */);
				DIMDEL(alias6_Bucket_ref_1862[0].attr8_Elements, 0);
				
			};
			if (local4_Find_1864) {
				param4_self.attr8_Elements+=-1;
				
			};
			return tryClone(local4_Find_1864);
			
		};
		
	} else {
		return tryClone(0);
		
	};
	return 0;
	pool_Bucket.free(alias6_Bucket_ref_1862);
};
method13_type7_HashMap_6_Remove = window['method13_type7_HashMap_6_Remove'];
window['method13_type7_HashMap_7_ToArray'] = function(param5_Array, param4_self) {
	DIM(param5_Array, [0], pool_KeyValue.alloc());
	{
		var local1_i_1869 = 0.0;
		for (local1_i_1869 = 0;toCheck(local1_i_1869, ((BOUNDS(param4_self.attr7_Buckets_ref[0], 0)) - (1)), 1);local1_i_1869 += 1) {
			var alias1_B_ref_1870 = [pool_Bucket.alloc()];
			alias1_B_ref_1870 = param4_self.attr7_Buckets_ref[0].arrAccess(~~(local1_i_1869)).values[tmpPositionCache] /* ALIAS */;
			if (alias1_B_ref_1870[0].attr3_Set) {
				if (BOUNDS(alias1_B_ref_1870[0].attr8_Elements, 0)) {
					{
						var local1_j_1871 = 0.0;
						for (local1_j_1871 = 0;toCheck(local1_j_1871, ((BOUNDS(alias1_B_ref_1870[0].attr8_Elements, 0)) - (1)), 1);local1_j_1871 += 1) {
							DIMPUSH(param5_Array, alias1_B_ref_1870[0].attr8_Elements.arrAccess(~~(local1_j_1871)).values[tmpPositionCache]);
							
						};
						
					};
					
				} else {
					DIMPUSH(param5_Array, alias1_B_ref_1870[0].attr7_Element);
					
				};
				
			};
			pool_Bucket.free(alias1_B_ref_1870);
		};
		
	};
	return 0;
	pool_array.free(param5_Array);
};
method13_type7_HashMap_7_ToArray = window['method13_type7_HashMap_7_ToArray'];
window['method13_type7_HashMap_7_SetSize'] = function(param4_Size, param4_self) {
	var local3_Arr_1875 = pool_array.alloc(pool_KeyValue.alloc());
	(param4_self).ToArray(unref(local3_Arr_1875));
	param4_self.attr8_Elements = 0;
	REDIM(unref(param4_self.attr7_Buckets_ref[0]), [param4_Size], [pool_Bucket.alloc()] );
	var forEachSaver3438 = local3_Arr_1875;
	for(var forEachCounter3438 = 0 ; forEachCounter3438 < forEachSaver3438.values.length ; forEachCounter3438++) {
		var local1_E_1876 = forEachSaver3438.values[forEachCounter3438];
	{
			(param4_self).Put(local1_E_1876.attr7_Key_Str, local1_E_1876.attr5_Value);
			
		}
		forEachSaver3438.values[forEachCounter3438] = local1_E_1876;
	
	};
	return 0;
	pool_array.free(local3_Arr_1875);
};
method13_type7_HashMap_7_SetSize = window['method13_type7_HashMap_7_SetSize'];
window['func7_HashStr'] = function(param7_Str_Str, param6_MaxLen) {
	var local4_Hash_1879 = 0;
	{
		var local1_i_1880 = 0.0;
		for (local1_i_1880 = 0;toCheck(local1_i_1880, (((param7_Str_Str).length) - (1)), 1);local1_i_1880 += 1) {
			local4_Hash_1879+=~~(((ASC(param7_Str_Str, ~~(local1_i_1880))) + (((local1_i_1880) * (26)))));
			
		};
		
	};
	local4_Hash_1879 = MOD(local4_Hash_1879, param6_MaxLen);
	return tryClone(local4_Hash_1879);
	return 0;
	
};
func7_HashStr = window['func7_HashStr'];
window['GetErrors'] = function() {
	return tryClone(unref(global8_Compiler.attr6_Errors));
	return tryClone(unref(pool_array.alloc(pool_TError.alloc())));
	
};
GetErrors = window['GetErrors'];
window['ParseIdentifiers'] = function(param8_Text_Str, param5_Parse, param6_GenDoc) {
	var local1_c_1884 = pool_TCompiler.alloc();
	global8_Compiler = local1_c_1884.clone(/* In Assign */);
	InitCompiler();
	func16_ResetExpressions();
	global8_Compiler.attr13_FaultTolerant = 1;
	global8_Compiler.attr8_Code_Str = ((param8_Text_Str) + ("\n"));
	func5_Lexer();
	func11_Precompiler();
	func16_ResetExpressions();
	func8_Analyser();
	if (param5_Parse) {
		func6_Parser();
		
	};
	if (param6_GenDoc) {
		func11_GenerateDoc();
		
	};
	return tryClone(unref(GetIdentifierList()));
	return tryClone(unref(pool_array.alloc(pool_TIDEIdentifier.alloc())));
	pool_TCompiler.free(local1_c_1884);
};
ParseIdentifiers = window['ParseIdentifiers'];
window['GetIdentifierList'] = function() {
	var local11_Identifiers_1885 = pool_array.alloc(pool_TIDEIdentifier.alloc()), local5_ident_1894 = pool_TIDEIdentifier.alloc();
	var forEachSaver3580 = global8_Compiler.attr5_Funcs_ref[0];
	for(var forEachCounter3580 = 0 ; forEachCounter3580 < forEachSaver3580.values.length ; forEachCounter3580++) {
		var local4_Func_ref_1886 = forEachSaver3580.values[forEachCounter3580];
	{
			var local5_ident_1887 = pool_TIDEIdentifier.alloc();
			local5_ident_1887.attr8_Name_Str = local4_Func_ref_1886[0].attr9_OName_Str;
			local5_ident_1887.attr8_datatype = local4_Func_ref_1886[0].attr8_datatype.clone(/* In Assign */);
			local5_ident_1887.attr6_Native = local4_Func_ref_1886[0].attr6_Native;
			local5_ident_1887.attr7_Typ_Str = "function";
			local5_ident_1887.attr6_SubTyp = local4_Func_ref_1886[0].attr3_Typ;
			local5_ident_1887.attr5_token = global8_Compiler.attr6_Tokens.arrAccess(local4_Func_ref_1886[0].attr3_Tok).values[tmpPositionCache].clone(/* In Assign */);
			DIMPUSH(local11_Identifiers_1885, local5_ident_1887);
			pool_TIDEIdentifier.free(local5_ident_1887);
		}
		forEachSaver3580.values[forEachCounter3580] = local4_Func_ref_1886;
	
	};
	var forEachSaver3630 = global8_Compiler.attr5_Varis_ref[0];
	for(var forEachCounter3630 = 0 ; forEachCounter3630 < forEachSaver3630.values.length ; forEachCounter3630++) {
		var local4_Vari_ref_1888 = forEachSaver3630.values[forEachCounter3630];
	{
			var local5_ident_1889 = pool_TIDEIdentifier.alloc();
			local5_ident_1889.attr8_Name_Str = local4_Vari_ref_1888[0].attr9_OName_Str;
			local5_ident_1889.attr8_datatype = local4_Vari_ref_1888[0].attr8_datatype.clone(/* In Assign */);
			local5_ident_1889.attr7_Typ_Str = "variable";
			local5_ident_1889.attr6_SubTyp = local4_Vari_ref_1888[0].attr3_Typ;
			local5_ident_1889.attr5_token = global8_Compiler.attr6_Tokens.arrAccess(local4_Vari_ref_1888[0].attr3_Tok).values[tmpPositionCache].clone(/* In Assign */);
			DIMPUSH(local11_Identifiers_1885, local5_ident_1889);
			pool_TIDEIdentifier.free(local5_ident_1889);
		}
		forEachSaver3630.values[forEachCounter3630] = local4_Vari_ref_1888;
	
	};
	var forEachSaver3671 = global8_Compiler.attr5_Types_ref[0];
	for(var forEachCounter3671 = 0 ; forEachCounter3671 < forEachSaver3671.values.length ; forEachCounter3671++) {
		var local3_typ_ref_1890 = forEachSaver3671.values[forEachCounter3671];
	{
			var local5_ident_1891 = pool_TIDEIdentifier.alloc();
			local5_ident_1891.attr8_Name_Str = local3_typ_ref_1890[0].attr9_OName_Str;
			local5_ident_1891.attr7_Typ_Str = "type";
			local5_ident_1891.attr6_SubTyp = 0;
			local5_ident_1891.attr5_token = global8_Compiler.attr6_Tokens.arrAccess(local3_typ_ref_1890[0].attr3_Tok).values[tmpPositionCache].clone(/* In Assign */);
			DIMPUSH(local11_Identifiers_1885, local5_ident_1891);
			pool_TIDEIdentifier.free(local5_ident_1891);
		}
		forEachSaver3671.values[forEachCounter3671] = local3_typ_ref_1890;
	
	};
	var forEachSaver3697 = global12_Keywords_Str;
	for(var forEachCounter3697 = 0 ; forEachCounter3697 < forEachSaver3697.values.length ; forEachCounter3697++) {
		var local6_kw_Str_1892 = forEachSaver3697.values[forEachCounter3697];
	{
			var local5_ident_1893 = pool_TIDEIdentifier.alloc();
			local5_ident_1893.attr8_Name_Str = local6_kw_Str_1892;
			local5_ident_1893.attr7_Typ_Str = "keyword";
			local5_ident_1893.attr6_SubTyp = 0;
			DIMPUSH(local11_Identifiers_1885, local5_ident_1893);
			pool_TIDEIdentifier.free(local5_ident_1893);
		}
		forEachSaver3697.values[forEachCounter3697] = local6_kw_Str_1892;
	
	};
	local5_ident_1894.attr8_Name_Str = "int";
	local5_ident_1894.attr7_Typ_Str = "type";
	local5_ident_1894.attr6_SubTyp = 1;
	DIMPUSH(local11_Identifiers_1885, local5_ident_1894);
	local5_ident_1894.attr8_Name_Str = "string";
	local5_ident_1894.attr7_Typ_Str = "type";
	local5_ident_1894.attr6_SubTyp = 1;
	DIMPUSH(local11_Identifiers_1885, local5_ident_1894);
	local5_ident_1894.attr8_Name_Str = "float";
	local5_ident_1894.attr7_Typ_Str = "type";
	local5_ident_1894.attr6_SubTyp = 1;
	DIMPUSH(local11_Identifiers_1885, local5_ident_1894);
	local5_ident_1894.attr8_Name_Str = "void";
	local5_ident_1894.attr7_Typ_Str = "type";
	local5_ident_1894.attr6_SubTyp = 1;
	DIMPUSH(local11_Identifiers_1885, local5_ident_1894);
	return tryClone(unref(local11_Identifiers_1885));
	return tryClone(unref(pool_array.alloc(pool_TIDEIdentifier.alloc())));
	pool_array.free(local11_Identifiers_1885);pool_TIDEIdentifier.free(local5_ident_1894);
};
GetIdentifierList = window['GetIdentifierList'];
window['func16_JS_Generator_Str'] = function() {
	{
		var Err_Str = "";
		try {
			var local11_InWebWorker_1895 = 0, local8_Text_Str_1896 = "", local14_StaticText_Str_1897 = "", local17_StaticDefText_Str_1898 = "";
			local11_InWebWorker_1895 = func8_IsDefine("HTML5_WEBWORKER");
			func23_ManageFuncParamOverlaps();
			global14_StaticText_Str = "";
			local8_Text_Str_1896 = "";
			if (global9_DEBUGMODE) {
				local8_Text_Str_1896 = ((((local8_Text_Str_1896) + ("var __debugInfo = \"\";"))) + (func11_NewLine_Str()));
				local8_Text_Str_1896 = ((((local8_Text_Str_1896) + ("var debugMode = true;"))) + (func11_NewLine_Str()));
				
			} else {
				local8_Text_Str_1896 = ((((local8_Text_Str_1896) + ("var debugMode = false;"))) + (func11_NewLine_Str()));
				
			};
			global11_LastDummyID = ~~(((global10_LastExprID) + (1337)));
			local8_Text_Str_1896 = ((local8_Text_Str_1896) + ("window['main'] = function()"));
			local8_Text_Str_1896 = ((((local8_Text_Str_1896) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr9_MainScope).values[tmpPositionCache][0]))))) + (func11_NewLine_Str()));
			if (local11_InWebWorker_1895) {
				local8_Text_Str_1896 = ((((local8_Text_Str_1896) + ("main = window['main'];"))) + (func11_NewLine_Str()));
				
			};
			local14_StaticText_Str_1897 = "";
			local17_StaticDefText_Str_1898 = "";
			var forEachSaver4046 = global8_Compiler.attr5_Funcs_ref[0];
			for(var forEachCounter4046 = 0 ; forEachCounter4046 < forEachSaver4046.values.length ; forEachCounter4046++) {
				var local4_Func_ref_1899 = forEachSaver4046.values[forEachCounter4046];
			{
					if (((((((local4_Func_ref_1899[0].attr6_Native) === (0)) ? 1 : 0)) && ((((local4_Func_ref_1899[0].attr3_Scp) !== (-(1))) ? 1 : 0))) ? 1 : 0)) {
						var local4_Find_1900 = 0.0;
						if ((((BOUNDS(local4_Func_ref_1899[0].attr7_Statics, 0)) > (0)) ? 1 : 0)) {
							local17_StaticDefText_Str_1898 = ((((((((local17_StaticDefText_Str_1898) + ("var "))) + (func13_JSVariDef_Str(unref(local4_Func_ref_1899[0].attr7_Statics), 1, 0, 0)))) + (";"))) + (func11_NewLine_Str()));
							local14_StaticText_Str_1897 = ((((((local14_StaticText_Str_1897) + (func13_JSVariDef_Str(unref(local4_Func_ref_1899[0].attr7_Statics), 0, 0, 1)))) + (";"))) + (func11_NewLine_Str()));
							
						};
						local8_Text_Str_1896 = ((((((local8_Text_Str_1896) + ("window['"))) + (local4_Func_ref_1899[0].attr8_Name_Str))) + ("'] = function("));
						local4_Find_1900 = 0;
						var forEachSaver3972 = local4_Func_ref_1899[0].attr6_Params;
						for(var forEachCounter3972 = 0 ; forEachCounter3972 < forEachSaver3972.values.length ; forEachCounter3972++) {
							var local1_P_1901 = forEachSaver3972.values[forEachCounter3972];
						{
								if (local4_Find_1900) {
									local8_Text_Str_1896 = ((local8_Text_Str_1896) + (", "));
									
								};
								local8_Text_Str_1896 = ((local8_Text_Str_1896) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_1901).values[tmpPositionCache][0].attr8_Name_Str));
								local4_Find_1900 = 1;
								
							}
							forEachSaver3972.values[forEachCounter3972] = local1_P_1901;
						
						};
						local8_Text_Str_1896 = ((local8_Text_Str_1896) + (") "));
						local8_Text_Str_1896 = ((((((local8_Text_Str_1896) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local4_Func_ref_1899[0].attr3_Scp).values[tmpPositionCache][0]))))) + (";"))) + (func11_NewLine_Str()));
						if (((((((global9_DEBUGMODE) === (0)) ? 1 : 0)) && ((((local4_Func_ref_1899[0].attr3_Typ) === (2)) ? 1 : 0))) ? 1 : 0)) {
							local8_Text_Str_1896 = ((((((((((((local8_Text_Str_1896) + ("window['"))) + (local4_Func_ref_1899[0].attr8_Name_Str))) + ("'] = "))) + (local4_Func_ref_1899[0].attr8_Name_Str))) + (";"))) + (func11_NewLine_Str()));
							
						};
						if (local11_InWebWorker_1895) {
							local8_Text_Str_1896 = ((((((((((local8_Text_Str_1896) + (local4_Func_ref_1899[0].attr8_Name_Str))) + (" = window['"))) + (local4_Func_ref_1899[0].attr8_Name_Str))) + ("'];"))) + (func11_NewLine_Str()));
							
						};
						
					};
					
				}
				forEachSaver4046.values[forEachCounter4046] = local4_Func_ref_1899;
			
			};
			var forEachSaver4112 = global8_Compiler.attr5_Funcs_ref[0];
			for(var forEachCounter4112 = 0 ; forEachCounter4112 < forEachSaver4112.values.length ; forEachCounter4112++) {
				var local4_Func_ref_1902 = forEachSaver4112.values[forEachCounter4112];
			{
					if ((((local4_Func_ref_1902[0].attr3_Typ) === (4)) ? 1 : 0)) {
						func8_IndentUp();
						local8_Text_Str_1896 = ((((((((local8_Text_Str_1896) + ("window['"))) + (local4_Func_ref_1902[0].attr9_OName_Str))) + ("'] = function() {"))) + (func11_NewLine_Str()));
						local8_Text_Str_1896 = ((local8_Text_Str_1896) + ("return function() { throwError(\"NullPrototypeException\"); };"));
						func10_IndentDown();
						local8_Text_Str_1896 = ((((((local8_Text_Str_1896) + (func11_NewLine_Str()))) + ("};"))) + (func11_NewLine_Str()));
						if (local11_InWebWorker_1895) {
							local8_Text_Str_1896 = ((((((((((local8_Text_Str_1896) + (local4_Func_ref_1902[0].attr9_OName_Str))) + (" = window['"))) + (local4_Func_ref_1902[0].attr9_OName_Str))) + ("'];"))) + (func11_NewLine_Str()));
							
						};
						
					};
					
				}
				forEachSaver4112.values[forEachCounter4112] = local4_Func_ref_1902;
			
			};
			var forEachSaver5262 = global8_Compiler.attr5_Types_ref[0];
			for(var forEachCounter5262 = 0 ; forEachCounter5262 < forEachSaver5262.values.length ; forEachCounter5262++) {
				var local3_Typ_ref_1903 = forEachSaver5262.values[forEachCounter5262];
			{
					var local5_typId_1904 = 0, local3_map_1905 = pool_HashMap.alloc(), local5_First_1906 = 0, local4_map2_1918 = pool_HashMap.alloc();
					local5_typId_1904 = local3_Typ_ref_1903[0].attr2_ID;
					func8_IndentUp();
					local8_Text_Str_1896 = ((((((((local8_Text_Str_1896) + ("var vtbl_"))) + (local3_Typ_ref_1903[0].attr8_Name_Str))) + (" = {"))) + (func11_NewLine_Str()));
					local5_First_1906 = 0;
					while ((((local5_typId_1904) !== (-(1))) ? 1 : 0)) {
						var forEachSaver4236 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_1904).values[tmpPositionCache][0].attr7_Methods;
						for(var forEachCounter4236 = 0 ; forEachCounter4236 < forEachSaver4236.values.length ; forEachCounter4236++) {
							var local3_Mth_1907 = forEachSaver4236.values[forEachCounter4236];
						{
								if (((((((local3_map_1905).DoesKeyExist(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1907).values[tmpPositionCache][0].attr9_OName_Str)) ? 0 : 1)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1907).values[tmpPositionCache][0].attr3_Scp) !== (-(1))) ? 1 : 0))) ? 1 : 0)) {
									if (local5_First_1906) {
										local8_Text_Str_1896 = ((((local8_Text_Str_1896) + (", "))) + (func11_NewLine_Str()));
										
									};
									local8_Text_Str_1896 = ((((((local8_Text_Str_1896) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1907).values[tmpPositionCache][0].attr9_OName_Str))) + (": "))) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1907).values[tmpPositionCache][0].attr8_Name_Str));
									(local3_map_1905).Put(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1907).values[tmpPositionCache][0].attr9_OName_Str, local3_Mth_1907);
									local5_First_1906 = 1;
									
								};
								
							}
							forEachSaver4236.values[forEachCounter4236] = local3_Mth_1907;
						
						};
						local5_typId_1904 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_1904).values[tmpPositionCache][0].attr9_Extending;
						
					};
					func10_IndentDown();
					local8_Text_Str_1896 = ((((((local8_Text_Str_1896) + (func11_NewLine_Str()))) + ("};"))) + (func11_NewLine_Str()));
					if ((((global9_DEBUGMODE) === (0)) ? 1 : 0)) {
						local8_Text_Str_1896 = ((((local8_Text_Str_1896) + ("/**"))) + (func11_NewLine_Str()));
						local8_Text_Str_1896 = ((((local8_Text_Str_1896) + ("* @constructor"))) + (func11_NewLine_Str()));
						local8_Text_Str_1896 = ((((local8_Text_Str_1896) + ("*/"))) + (func11_NewLine_Str()));
						
					};
					local8_Text_Str_1896 = ((((((((local8_Text_Str_1896) + ("window ['"))) + (local3_Typ_ref_1903[0].attr8_Name_Str))) + ("'] = function() { this.reset(); }"))) + (func11_NewLine_Str()));
					func8_IndentUp();
					local8_Text_Str_1896 = ((((((((((((local8_Text_Str_1896) + ("window['"))) + (local3_Typ_ref_1903[0].attr8_Name_Str))) + ("'].prototype.getTypeName = function() { return \""))) + (local3_Typ_ref_1903[0].attr8_Name_Str))) + ("\" };"))) + (func11_NewLine_Str()));
					local8_Text_Str_1896 = ((((((((local8_Text_Str_1896) + ("window['"))) + (local3_Typ_ref_1903[0].attr8_Name_Str))) + ("'].prototype.reset = function() {"))) + (func11_NewLine_Str()));
					var forEachSaver4377 = local3_Typ_ref_1903[0].attr10_Attributes;
					for(var forEachCounter4377 = 0 ; forEachCounter4377 < forEachSaver4377.values.length ; forEachCounter4377++) {
						var local4_Attr_1908 = forEachSaver4377.values[forEachCounter4377];
					{
							var alias8_variable_ref_1909 = [pool_TIdentifierVari.alloc()];
							alias8_variable_ref_1909 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1908).values[tmpPositionCache] /* ALIAS */;
							local8_Text_Str_1896 = ((((local8_Text_Str_1896) + ("this."))) + (alias8_variable_ref_1909[0].attr8_Name_Str));
							local8_Text_Str_1896 = ((local8_Text_Str_1896) + (" = "));
							local8_Text_Str_1896 = ((local8_Text_Str_1896) + (func21_JSGetDefaultValue_Str(alias8_variable_ref_1909[0].attr8_datatype, alias8_variable_ref_1909[0].attr3_ref, 0)));
							local8_Text_Str_1896 = ((((local8_Text_Str_1896) + (";"))) + (func11_NewLine_Str()));
							pool_TIdentifierVari.free(alias8_variable_ref_1909);
						}
						forEachSaver4377.values[forEachCounter4377] = local4_Attr_1908;
					
					};
					local8_Text_Str_1896 = ((((((((local8_Text_Str_1896) + ("this.vtbl = vtbl_"))) + (local3_Typ_ref_1903[0].attr8_Name_Str))) + (";"))) + (func11_NewLine_Str()));
					var forEachSaver4467 = local3_Typ_ref_1903[0].attr10_Attributes;
					for(var forEachCounter4467 = 0 ; forEachCounter4467 < forEachSaver4467.values.length ; forEachCounter4467++) {
						var local4_Attr_1910 = forEachSaver4467.values[forEachCounter4467];
					{
							var alias8_variable_ref_1911 = [pool_TIdentifierVari.alloc()];
							alias8_variable_ref_1911 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1910).values[tmpPositionCache] /* ALIAS */;
							if ((((alias8_variable_ref_1911[0].attr6_PreDef) !== (-(1))) ? 1 : 0)) {
								local8_Text_Str_1896 = ((((local8_Text_Str_1896) + ("this."))) + (alias8_variable_ref_1911[0].attr8_Name_Str));
								local8_Text_Str_1896 = ((local8_Text_Str_1896) + (" = "));
								if (alias8_variable_ref_1911[0].attr3_ref) {
									local8_Text_Str_1896 = ((local8_Text_Str_1896) + ("["));
									
								};
								local8_Text_Str_1896 = ((local8_Text_Str_1896) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(alias8_variable_ref_1911[0].attr6_PreDef).values[tmpPositionCache][0]))));
								if (alias8_variable_ref_1911[0].attr3_ref) {
									local8_Text_Str_1896 = ((local8_Text_Str_1896) + ("]"));
									
								};
								local8_Text_Str_1896 = ((((local8_Text_Str_1896) + (";"))) + (func11_NewLine_Str()));
								
							};
							pool_TIdentifierVari.free(alias8_variable_ref_1911);
						}
						forEachSaver4467.values[forEachCounter4467] = local4_Attr_1910;
					
					};
					local8_Text_Str_1896 = ((((((((local8_Text_Str_1896) + ("this.pool = pool_"))) + (local3_Typ_ref_1903[0].attr9_OName_Str))) + (";"))) + (func11_NewLine_Str()));
					local8_Text_Str_1896 = ((((local8_Text_Str_1896) + ("this.succ = null;"))) + (func11_NewLine_Str()));
					func10_IndentDown();
					local8_Text_Str_1896 = ((((((local8_Text_Str_1896) + (func11_NewLine_Str()))) + ("};"))) + (func11_NewLine_Str()));
					func8_IndentUp();
					local8_Text_Str_1896 = ((((((((local8_Text_Str_1896) + ("window['"))) + (local3_Typ_ref_1903[0].attr8_Name_Str))) + ("'].prototype.clone = function() {"))) + (func11_NewLine_Str()));
					local8_Text_Str_1896 = ((((((((local8_Text_Str_1896) + ("var other = pool_"))) + (local3_Typ_ref_1903[0].attr9_OName_Str))) + (".alloc();"))) + (func11_NewLine_Str()));
					var forEachSaver4659 = local3_Typ_ref_1903[0].attr10_Attributes;
					for(var forEachCounter4659 = 0 ; forEachCounter4659 < forEachSaver4659.values.length ; forEachCounter4659++) {
						var local4_Attr_1912 = forEachSaver4659.values[forEachCounter4659];
					{
							var alias8_variable_ref_1913 = [pool_TIdentifierVari.alloc()], local8_plzclone_1914 = 0;
							alias8_variable_ref_1913 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1912).values[tmpPositionCache] /* ALIAS */;
							local8_plzclone_1914 = 0;
							if (((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1912).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0)) && ((((((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1912).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("int")) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1912).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("float")) ? 1 : 0))) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1912).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("string")) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) {
								local8_plzclone_1914 = 0;
								
							} else {
								local8_plzclone_1914 = 1;
								
							};
							if (global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1912).values[tmpPositionCache][0].attr3_ref) {
								local8_plzclone_1914 = 1;
								
							};
							local8_Text_Str_1896 = ((((((local8_Text_Str_1896) + ("other."))) + (alias8_variable_ref_1913[0].attr8_Name_Str))) + (" = "));
							if (local8_plzclone_1914) {
								local8_Text_Str_1896 = ((local8_Text_Str_1896) + ("tryClone("));
								
							};
							local8_Text_Str_1896 = ((((local8_Text_Str_1896) + ("this."))) + (alias8_variable_ref_1913[0].attr8_Name_Str));
							if (local8_plzclone_1914) {
								local8_Text_Str_1896 = ((local8_Text_Str_1896) + (")"));
								
							};
							local8_Text_Str_1896 = ((((local8_Text_Str_1896) + (";"))) + (func11_NewLine_Str()));
							pool_TIdentifierVari.free(alias8_variable_ref_1913);
						}
						forEachSaver4659.values[forEachCounter4659] = local4_Attr_1912;
					
					};
					local8_Text_Str_1896 = ((((local8_Text_Str_1896) + ("other.vtbl = this.vtbl;"))) + (func11_NewLine_Str()));
					local8_Text_Str_1896 = ((((local8_Text_Str_1896) + ("other.pool = this.pool;"))) + (func11_NewLine_Str()));
					func10_IndentDown();
					local8_Text_Str_1896 = ((((local8_Text_Str_1896) + ("return other;"))) + (func11_NewLine_Str()));
					local8_Text_Str_1896 = ((((local8_Text_Str_1896) + ("};"))) + (func11_NewLine_Str()));
					if ((((BOUNDS(global8_Compiler.attr7_Exports, 0)) > (0)) ? 1 : 0)) {
						func8_IndentUp();
						local8_Text_Str_1896 = ((((((((local8_Text_Str_1896) + ("window['"))) + (local3_Typ_ref_1903[0].attr8_Name_Str))) + ("'].prototype.bridgeToJS = function(isJSON) {"))) + (func11_NewLine_Str()));
						func8_IndentUp();
						local8_Text_Str_1896 = ((((local8_Text_Str_1896) + ("return {"))) + (func11_NewLine_Str()));
						var forEachSaver4858 = local3_Typ_ref_1903[0].attr10_Attributes;
						for(var forEachCounter4858 = 0 ; forEachCounter4858 < forEachSaver4858.values.length ; forEachCounter4858++) {
							var local4_Attr_1915 = forEachSaver4858.values[forEachCounter4858];
						{
								var alias8_variable_ref_1916 = [pool_TIdentifierVari.alloc()], local8_plzclone_1917 = 0;
								alias8_variable_ref_1916 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1915).values[tmpPositionCache] /* ALIAS */;
								local8_plzclone_1917 = 0;
								if (((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1915).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0)) && ((((((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1915).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("int")) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1915).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("float")) ? 1 : 0))) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1915).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("string")) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) {
									local8_plzclone_1917 = 0;
									
								} else {
									local8_plzclone_1917 = 1;
									
								};
								if (global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1915).values[tmpPositionCache][0].attr3_ref) {
									local8_plzclone_1917 = 1;
									
								};
								local8_Text_Str_1896 = ((((((local8_Text_Str_1896) + ("\""))) + (REPLACE_Str(alias8_variable_ref_1916[0].attr9_OName_Str, "$", "_Str")))) + ("\": "));
								if (local8_plzclone_1917) {
									local8_Text_Str_1896 = ((local8_Text_Str_1896) + ("("));
									
								};
								local8_Text_Str_1896 = ((((local8_Text_Str_1896) + ("this."))) + (alias8_variable_ref_1916[0].attr8_Name_Str));
								if (local8_plzclone_1917) {
									local8_Text_Str_1896 = ((local8_Text_Str_1896) + (").bridgeToJS(isJSON)"));
									
								};
								local8_Text_Str_1896 = ((((local8_Text_Str_1896) + (","))) + (func11_NewLine_Str()));
								pool_TIdentifierVari.free(alias8_variable_ref_1916);
							}
							forEachSaver4858.values[forEachCounter4858] = local4_Attr_1915;
						
						};
						func10_IndentDown();
						local8_Text_Str_1896 = ((((local8_Text_Str_1896) + ("\"__vtbl\": !isJSON ? this.vtbl : undefined"))) + (func11_NewLine_Str()));
						func10_IndentDown();
						local8_Text_Str_1896 = ((((local8_Text_Str_1896) + ("};"))) + (func11_NewLine_Str()));
						local8_Text_Str_1896 = ((((local8_Text_Str_1896) + ("};"))) + (func11_NewLine_Str()));
						
					};
					func8_IndentUp();
					local8_Text_Str_1896 = ((((((((local8_Text_Str_1896) + ("pool_"))) + (local3_Typ_ref_1903[0].attr9_OName_Str))) + (" = { "))) + (func11_NewLine_Str()));
					local8_Text_Str_1896 = ((((local8_Text_Str_1896) + ("last: null, "))) + (func11_NewLine_Str()));
					func8_IndentUp();
					local8_Text_Str_1896 = ((((local8_Text_Str_1896) + ("alloc: function() { "))) + (func11_NewLine_Str()));
					local8_Text_Str_1896 = ((((local8_Text_Str_1896) + ("var obj = null;"))) + (func11_NewLine_Str()));
					func8_IndentUp();
					local8_Text_Str_1896 = ((((((((local8_Text_Str_1896) + ("if (pool_"))) + (local3_Typ_ref_1903[0].attr9_OName_Str))) + (".last !== null) {"))) + (func11_NewLine_Str()));
					local8_Text_Str_1896 = ((((((((local8_Text_Str_1896) + ("obj = pool_"))) + (local3_Typ_ref_1903[0].attr9_OName_Str))) + (".last;"))) + (func11_NewLine_Str()));
					local8_Text_Str_1896 = ((((((((local8_Text_Str_1896) + ("pool_"))) + (local3_Typ_ref_1903[0].attr9_OName_Str))) + (".last = obj.succ;"))) + (func11_NewLine_Str()));
					func10_IndentDown();
					local8_Text_Str_1896 = ((((local8_Text_Str_1896) + ("obj.succ = null;"))) + (func11_NewLine_Str()));
					func8_IndentUp();
					local8_Text_Str_1896 = ((((local8_Text_Str_1896) + ("} else {"))) + (func11_NewLine_Str()));
					func10_IndentDown();
					local8_Text_Str_1896 = ((((((((local8_Text_Str_1896) + ("obj = new "))) + (local3_Typ_ref_1903[0].attr8_Name_Str))) + ("();"))) + (func11_NewLine_Str()));
					local8_Text_Str_1896 = ((((local8_Text_Str_1896) + ("}"))) + (func11_NewLine_Str()));
					func10_IndentDown();
					local8_Text_Str_1896 = ((((local8_Text_Str_1896) + ("return obj;"))) + (func11_NewLine_Str()));
					local8_Text_Str_1896 = ((((local8_Text_Str_1896) + ("},"))) + (func11_NewLine_Str()));
					func8_IndentUp();
					local8_Text_Str_1896 = ((((local8_Text_Str_1896) + ("free: function(obj)  {"))) + (func11_NewLine_Str()));
					local8_Text_Str_1896 = ((((local8_Text_Str_1896) + ("if (obj.succ !== null) return;"))) + (func11_NewLine_Str()));
					local8_Text_Str_1896 = ((((local8_Text_Str_1896) + ("obj.reset();"))) + (func11_NewLine_Str()));
					local8_Text_Str_1896 = ((((((((local8_Text_Str_1896) + ("obj.succ = pool_"))) + (local3_Typ_ref_1903[0].attr9_OName_Str))) + (".last;"))) + (func11_NewLine_Str()));
					func10_IndentDown();
					local8_Text_Str_1896 = ((((((((local8_Text_Str_1896) + ("pool_"))) + (local3_Typ_ref_1903[0].attr9_OName_Str))) + (".last = obj;"))) + (func11_NewLine_Str()));
					func10_IndentDown();
					local8_Text_Str_1896 = ((((local8_Text_Str_1896) + ("}"))) + (func11_NewLine_Str()));
					local8_Text_Str_1896 = ((((local8_Text_Str_1896) + ("}"))) + (func11_NewLine_Str()));
					if (local11_InWebWorker_1895) {
						local8_Text_Str_1896 = ((((((((((local8_Text_Str_1896) + (local3_Typ_ref_1903[0].attr8_Name_Str))) + (" = window['"))) + (local3_Typ_ref_1903[0].attr8_Name_Str))) + ("'];"))) + (func11_NewLine_Str()));
						
					};
					local5_typId_1904 = local3_Typ_ref_1903[0].attr2_ID;
					local5_First_1906 = 0;
					while ((((local5_typId_1904) !== (-(1))) ? 1 : 0)) {
						var forEachSaver5251 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_1904).values[tmpPositionCache][0].attr7_Methods;
						for(var forEachCounter5251 = 0 ; forEachCounter5251 < forEachSaver5251.values.length ; forEachCounter5251++) {
							var local3_Mth_1919 = forEachSaver5251.values[forEachCounter5251];
						{
								if (((((((local4_map2_1918).DoesKeyExist(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1919).values[tmpPositionCache][0].attr9_OName_Str)) ? 0 : 1)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1919).values[tmpPositionCache][0].attr3_Scp) !== (-(1))) ? 1 : 0))) ? 1 : 0)) {
									func8_IndentUp();
									local8_Text_Str_1896 = ((((((((((((local8_Text_Str_1896) + (local3_Typ_ref_1903[0].attr8_Name_Str))) + (".prototype."))) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1919).values[tmpPositionCache][0].attr9_OName_Str))) + (" = function() {"))) + (func11_NewLine_Str()))) + (" return "));
									local8_Text_Str_1896 = ((((((local8_Text_Str_1896) + ("this.vtbl."))) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1919).values[tmpPositionCache][0].attr9_OName_Str))) + ("("));
									{
										var local1_i_1920 = 0.0;
										for (local1_i_1920 = 0;toCheck(local1_i_1920, ((BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1919).values[tmpPositionCache][0].attr6_Params, 0)) - (2)), 1);local1_i_1920 += 1) {
											local8_Text_Str_1896 = ((((((local8_Text_Str_1896) + ("arguments["))) + (CAST2STRING(local1_i_1920)))) + ("], "));
											
										};
										
									};
									local8_Text_Str_1896 = ((local8_Text_Str_1896) + ("this"));
									func10_IndentDown();
									local8_Text_Str_1896 = ((((((((local8_Text_Str_1896) + (");"))) + (func11_NewLine_Str()))) + ("};"))) + (func11_NewLine_Str()));
									(local4_map2_1918).Put(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1919).values[tmpPositionCache][0].attr9_OName_Str, local3_Mth_1919);
									
								};
								
							}
							forEachSaver5251.values[forEachCounter5251] = local3_Mth_1919;
						
						};
						local5_typId_1904 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_1904).values[tmpPositionCache][0].attr9_Extending;
						
					};
					pool_HashMap.free(local3_map_1905);pool_HashMap.free(local4_map2_1918);
				}
				forEachSaver5262.values[forEachCounter5262] = local3_Typ_ref_1903;
			
			};
			var forEachSaver5321 = global8_Compiler.attr10_DataBlocks;
			for(var forEachCounter5321 = 0 ; forEachCounter5321 < forEachSaver5321.values.length ; forEachCounter5321++) {
				var local5_block_1921 = forEachSaver5321.values[forEachCounter5321];
			{
					var local4_Done_1922 = 0;
					local8_Text_Str_1896 = ((((((local8_Text_Str_1896) + ("var datablock_"))) + (local5_block_1921.attr8_Name_Str))) + (" = [ "));
					local4_Done_1922 = 0;
					var forEachSaver5313 = local5_block_1921.attr5_Datas;
					for(var forEachCounter5313 = 0 ; forEachCounter5313 < forEachSaver5313.values.length ; forEachCounter5313++) {
						var local1_d_1923 = forEachSaver5313.values[forEachCounter5313];
					{
							if (local4_Done_1922) {
								local8_Text_Str_1896 = ((local8_Text_Str_1896) + (", "));
								
							};
							local8_Text_Str_1896 = ((local8_Text_Str_1896) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local1_d_1923).values[tmpPositionCache][0]))));
							local4_Done_1922 = 1;
							
						}
						forEachSaver5313.values[forEachCounter5313] = local1_d_1923;
					
					};
					local8_Text_Str_1896 = ((((local8_Text_Str_1896) + (" ];"))) + (func11_NewLine_Str()));
					
				}
				forEachSaver5321.values[forEachCounter5321] = local5_block_1921;
			
			};
			if ((((BOUNDS(global8_Compiler.attr7_Globals, 0)) > (0)) ? 1 : 0)) {
				local8_Text_Str_1896 = ((local8_Text_Str_1896) + ("var "));
				local8_Text_Str_1896 = ((local8_Text_Str_1896) + (func13_JSVariDef_Str(unref(global8_Compiler.attr7_Globals), 1, 0, 1)));
				local8_Text_Str_1896 = ((((local8_Text_Str_1896) + (";"))) + (func11_NewLine_Str()));
				
			};
			if ((((TRIM_Str(local14_StaticText_Str_1897, " \t\r\n\v\f")) !== ("")) ? 1 : 0)) {
				local8_Text_Str_1896 = ((((local8_Text_Str_1896) + ("// set default statics:"))) + (func11_NewLine_Str()));
				local8_Text_Str_1896 = ((local17_StaticDefText_Str_1898) + (local8_Text_Str_1896));
				func8_IndentUp();
				local8_Text_Str_1896 = ((((local8_Text_Str_1896) + ("window['initStatics'] = function() {"))) + (func11_NewLine_Str()));
				func10_IndentDown();
				local8_Text_Str_1896 = ((((local8_Text_Str_1896) + (local14_StaticText_Str_1897))) + (func11_NewLine_Str()));
				local8_Text_Str_1896 = ((((local8_Text_Str_1896) + ("}"))) + (func11_NewLine_Str()));
				
			} else {
				local8_Text_Str_1896 = ((((local8_Text_Str_1896) + ("window['initStatics'] = function() {}"))) + (func11_NewLine_Str()));
				
			};
			if (local11_InWebWorker_1895) {
				local8_Text_Str_1896 = ((((local8_Text_Str_1896) + ("initStatics = window['initStatics'];"))) + (func11_NewLine_Str()));
				
			};
			local8_Text_Str_1896 = ((((local8_Text_Str_1896) + ("for (var __init = 0; __init < preInitFuncs.length; __init++) preInitFuncs[__init]();"))) + (func11_NewLine_Str()));
			local8_Text_Str_1896 = ((((local8_Text_Str_1896) + ("preInitFuncs = [];"))) + (func11_NewLine_Str()));
			return tryClone(local8_Text_Str_1896);
			
		} catch (Err_Str) {
			if (Err_Str instanceof OTTException) Err_Str = Err_Str.getText(); else throwError(Err_Str);{
				
			}
		};
		
	};
	return "";
	
};
func16_JS_Generator_Str = window['func16_JS_Generator_Str'];
window['func14_JSGenerate_Str'] = function(param4_expr) {
	var __labels = {"Exit": 6888};
	
	var local8_Text_Str_1926 = "";
	var __pc = 5444;
	while(__pc >= 0) {
		switch(__pc) {
			case 5444:
				global8_Compiler.attr11_currentPosi = param4_expr.attr5_tokID;
				
			local8_Text_Str_1926 = "";
			
				var local16___SelectHelper4__1927 = 0;
				case 5454:
					local16___SelectHelper4__1927 = param4_expr.attr3_Typ;
					
				case 9940:
					if (!((((local16___SelectHelper4__1927) === (~~(2))) ? 1 : 0))) { __pc = 5456; break; }
				
				var local4_oScp_1928 = 0.0, local5_oFunc_1929 = 0.0, local13_oLabelDef_Str_1930 = "", local9_oIsInGoto_1931 = 0, local6_IsFunc_1932 = 0, local7_mngGoto_1933 = 0, local13_IsStackPusher_1934 = 0, local7_Def_Str_1938 = "", local15_BeforeUndef_Str_1939 = "", local11_MyUndef_Str_1940 = "", local8_ERes_Str_1944 = pool_array.alloc(""), local13_FirstText_Str_1947 = "";
				case 5461:
					local4_oScp_1928 = global12_CurrentScope;
					
				local5_oFunc_1929 = global11_CurrentFunc;
				local13_oLabelDef_Str_1930 = global12_LabelDef_Str;
				local9_oIsInGoto_1931 = global8_IsInGoto;
				local6_IsFunc_1932 = 0;
				local7_mngGoto_1933 = 0;
				local13_IsStackPusher_1934 = 0;
				case 5507:
					if (!(((((((param4_expr.attr6_ScpTyp) === (2)) ? 1 : 0)) || ((((param4_expr.attr6_ScpTyp) === (4)) ? 1 : 0))) ? 1 : 0))) { __pc = 5502; break; }
				
				case 5506:
					local13_IsStackPusher_1934 = 1;
					
				
				
			case 5502: //dummy jumper1
				;
					
				case 5520:
					if (!((((func12_ScopeHasGoto(param4_expr)) && (local13_IsStackPusher_1934)) ? 1 : 0))) { __pc = 5512; break; }
				
				case 5516:
					local7_mngGoto_1933 = 1;
					
				global8_IsInGoto = 1;
				
				
			case 5512: //dummy jumper1
				;
					
				case 5557:
					if (!((((param4_expr.attr6_ScpTyp) === (2)) ? 1 : 0))) { __pc = 5526; break; }
				
				var local1_i_1935 = 0;
				case 5556:
					var forEachSaver5556 = global8_Compiler.attr5_Funcs_ref[0];
				var forEachCounter5556 = 0
				
			case 5534: //dummy for1
				if (!(forEachCounter5556 < forEachSaver5556.values.length)) {__pc = 5530; break;}
				var local4_Func_ref_1936 = forEachSaver5556.values[forEachCounter5556];
				
				
				case 5552:
					if (!((((local4_Func_ref_1936[0].attr3_Scp) === (param4_expr.attr2_ID)) ? 1 : 0))) { __pc = 5543; break; }
				
				case 5547:
					global11_CurrentFunc = local1_i_1935;
					
				local6_IsFunc_1932 = 1;
				case 5551:
					__pc = 5530; break;
					
				
				
			case 5543: //dummy jumper1
				;
					
				local1_i_1935+=1;
				
				forEachSaver5556.values[forEachCounter5556] = local4_Func_ref_1936;
				
				forEachCounter5556++
				__pc = 5534; break; //back jump
				
			case 5530: //dummy for
				;
					
				
				
			case 5526: //dummy jumper1
				;
					
				global12_CurrentScope = param4_expr.attr2_ID;
				case 5573:
					if (!((((((global8_IsInGoto) ? 0 : 1)) || (local7_mngGoto_1933)) ? 1 : 0))) { __pc = 5569; break; }
				
				case 5571:
					func8_IndentUp();
					
				
				__pc = 29955;
				break;
				
			case 5569: //dummy jumper1
				
				
				
			case 29955: //dummy jumper2
				;
					
				local8_Text_Str_1926 = ((local8_Text_Str_1926) + (func11_NewLine_Str()));
				case 5604:
					if (!((((global9_DEBUGMODE) && (local13_IsStackPusher_1934)) ? 1 : 0))) { __pc = 5582; break; }
				
				case 5595:
					local8_Text_Str_1926 = ((((((((local8_Text_Str_1926) + ("stackPush(\""))) + (func13_ScopeName_Str(param4_expr)))) + ("\", __debugInfo);"))) + (func11_NewLine_Str()));
					
				func8_IndentUp();
				local8_Text_Str_1926 = ((((local8_Text_Str_1926) + ("try {"))) + (func11_NewLine_Str()));
				
				
			case 5582: //dummy jumper1
				;
					
				case 5667:
					if (!((((local6_IsFunc_1932) && (global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr15_UsedAsPrototype)) ? 1 : 0))) { __pc = 5614; break; }
				
				case 5666:
					var forEachSaver5666 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr6_Params;
				var forEachCounter5666 = 0
				
			case 5625: //dummy for1
				if (!(forEachCounter5666 < forEachSaver5666.values.length)) {__pc = 5617; break;}
				var local1_P_1937 = forEachSaver5666.values[forEachCounter5666];
				
				
				case 5665:
					if (!((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_1937).values[tmpPositionCache][0].attr3_ref) === (0)) ? 1 : 0))) { __pc = 5637; break; }
				
				case 5663:
					local8_Text_Str_1926 = ((((((((((local8_Text_Str_1926) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_1937).values[tmpPositionCache][0].attr8_Name_Str))) + (" = unref("))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_1937).values[tmpPositionCache][0].attr8_Name_Str))) + (");"))) + (func11_NewLine_Str()));
					
				
				__pc = 29958;
				break;
				
			case 5637: //dummy jumper1
				
				
				
			case 29958: //dummy jumper2
				;
					
				
				forEachSaver5666.values[forEachCounter5666] = local1_P_1937;
				
				forEachCounter5666++
				__pc = 5625; break; //back jump
				
			case 5617: //dummy for
				;
					
				
				
			case 5614: //dummy jumper1
				;
					
				local7_Def_Str_1938 = func13_JSVariDef_Str(unref(param4_expr.attr5_Varis), 0, 1, 1);
				case 5701:
					if (!((((TRIM_Str(local7_Def_Str_1938, " \t\r\n\v\f")) !== ("")) ? 1 : 0))) { __pc = 5682; break; }
				
				case 5688:
					local8_Text_Str_1926 = ((local8_Text_Str_1926) + ("var "));
					
				local8_Text_Str_1926 = ((local8_Text_Str_1926) + (local7_Def_Str_1938));
				local8_Text_Str_1926 = ((((local8_Text_Str_1926) + (";"))) + (func11_NewLine_Str()));
				
				
			case 5682: //dummy jumper1
				;
					
				local15_BeforeUndef_Str_1939 = global13_VariUndef_Str;
				local11_MyUndef_Str_1940 = "";
				case 5810:
					var forEachSaver5810 = param4_expr.attr5_Varis;
				var forEachCounter5810 = 0
				
			case 5715: //dummy for1
				if (!(forEachCounter5810 < forEachSaver5810.values.length)) {__pc = 5711; break;}
				var local3_Var_1941 = forEachSaver5810.values[forEachCounter5810];
				
				
				case 5809:
					if (!((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_1941).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0))) { __pc = 5728; break; }
				
				case 5794:
					if (!(func6_IsType(global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_1941).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) { __pc = 5740; break; }
				
				case 5793:
					if (!((((((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_1941).values[tmpPositionCache][0].attr3_Typ) !== (5)) ? 1 : 0)) && ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_1941).values[tmpPositionCache][0].attr3_Typ) !== (4)) ? 1 : 0))) ? 1 : 0)) && (func17_JSShouldRedeclare(local3_Var_1941))) ? 1 : 0))) { __pc = 5764; break; }
				
				case 5792:
					local11_MyUndef_Str_1940 = ((((((((((local11_MyUndef_Str_1940) + ("pool_"))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_1941).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) + (".free("))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_1941).values[tmpPositionCache][0].attr8_Name_Str))) + (");"));
					
				
				
			case 5764: //dummy jumper1
				;
					
				
				
			case 5740: //dummy jumper1
				;
					
				
				__pc = 29960;
				break;
				
			case 5728: //dummy jumper1
				
				case 5808:
					local11_MyUndef_Str_1940 = (((("pool_array.free(") + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_1941).values[tmpPositionCache][0].attr8_Name_Str))) + (");"));
					
				
				
			case 29960: //dummy jumper2
				;
					
				
				forEachSaver5810.values[forEachCounter5810] = local3_Var_1941;
				
				forEachCounter5810++
				__pc = 5715; break; //back jump
				
			case 5711: //dummy for
				;
					
				case 5888:
					if (!(((((((global11_CurrentFunc) !== (-(1))) ? 1 : 0)) && ((((local5_oFunc_1929) === (-(1))) ? 1 : 0))) ? 1 : 0))) { __pc = 5823; break; }
				
				var local1_i_1942 = 0;
				case 5887:
					var forEachSaver5887 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr6_Params;
				var forEachCounter5887 = 0
				
			case 5835: //dummy for1
				if (!(forEachCounter5887 < forEachSaver5887.values.length)) {__pc = 5827; break;}
				var local5_Param_1943 = forEachSaver5887.values[forEachCounter5887];
				
				
				case 5886:
					if (!((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local5_Param_1943).values[tmpPositionCache][0].attr9_OwnerVari) !== (-(1))) ? 1 : 0))) { __pc = 5848; break; }
				
				case 5882:
					local8_Text_Str_1926 = ((((((((((((local8_Text_Str_1926) + ("var "))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(global8_Compiler.attr5_Varis_ref[0].arrAccess(local5_Param_1943).values[tmpPositionCache][0].attr9_OwnerVari).values[tmpPositionCache][0].attr8_Name_Str))) + (" = ["))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local5_Param_1943).values[tmpPositionCache][0].attr8_Name_Str))) + ("];"))) + (func11_NewLine_Str()));
					
				local1_i_1942+=1;
				
				
			case 5848: //dummy jumper1
				;
					
				
				forEachSaver5887.values[forEachCounter5887] = local5_Param_1943;
				
				forEachCounter5887++
				__pc = 5835; break; //back jump
				
			case 5827: //dummy for
				;
					
				
				
			case 5823: //dummy jumper1
				;
					
				case 5895:
					if (!(local7_mngGoto_1933)) { __pc = 5890; break; }
				
				case 5892:
					func8_IndentUp();
					
				func8_IndentUp();
				func8_IndentUp();
				
				
			case 5890: //dummy jumper1
				;
					
				case 5927:
					var forEachSaver5927 = param4_expr.attr5_Exprs;
				var forEachCounter5927 = 0
				
			case 5902: //dummy for1
				if (!(forEachCounter5927 < forEachSaver5927.values.length)) {__pc = 5898; break;}
				var local2_Ex_1945 = forEachSaver5927.values[forEachCounter5927];
				
				
				var local7_add_Str_1946 = "";
				case 5909:
					local7_add_Str_1946 = func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local2_Ex_1945).values[tmpPositionCache][0]));
					
				case 5926:
					if (!((((TRIM_Str(local7_add_Str_1946, " \t\r\n\v\f")) !== ("")) ? 1 : 0))) { __pc = 5915; break; }
				
				case 5921:
					DIMPUSH(local8_ERes_Str_1944, CAST2STRING(local2_Ex_1945));
					
				DIMPUSH(local8_ERes_Str_1944, local7_add_Str_1946);
				
				
			case 5915: //dummy jumper1
				;
					
				
				forEachSaver5927.values[forEachCounter5927] = local2_Ex_1945;
				
				forEachCounter5927++
				__pc = 5902; break; //back jump
				
			case 5898: //dummy for
				;
					
				case 5984:
					if (!(local7_mngGoto_1933)) { __pc = 5929; break; }
				
				case 5931:
					func10_IndentDown();
					
				func10_IndentDown();
				func10_IndentDown();
				local8_Text_Str_1926 = ((local8_Text_Str_1926) + ("var __pc = "));
				case 5960:
					if (!((((BOUNDS(local8_ERes_Str_1944, 0)) > (0)) ? 1 : 0))) { __pc = 5945; break; }
				
				case 5953:
					local8_Text_Str_1926 = ((local8_Text_Str_1926) + (local8_ERes_Str_1944.arrAccess(0).values[tmpPositionCache]));
					
				
				__pc = 29968;
				break;
				
			case 5945: //dummy jumper1
				
				case 5959:
					local8_Text_Str_1926 = ((local8_Text_Str_1926) + ("0"));
					
				
				
			case 29968: //dummy jumper2
				;
					
				local8_Text_Str_1926 = ((((local8_Text_Str_1926) + (";"))) + (func11_NewLine_Str()));
				func8_IndentUp();
				local8_Text_Str_1926 = ((((local8_Text_Str_1926) + ("while(__pc >= 0) {"))) + (func11_NewLine_Str()));
				func8_IndentUp();
				local8_Text_Str_1926 = ((((local8_Text_Str_1926) + ("switch(__pc) {"))) + (func11_NewLine_Str()));
				
				
			case 5929: //dummy jumper1
				;
					
				local13_FirstText_Str_1947 = "";
				
				var local1_i_1948 = 0.0;
				case 6199:
					local1_i_1948 = 0
				
			case 5993: //dummy for1
				if (!toCheck(local1_i_1948, ((BOUNDS(local8_ERes_Str_1944, 0)) - (1)), 2)) {__pc = 6004; break;}
				
				var local7_add_Str_1949 = "", local2_Ex_1950 = 0, alias4_ExEx_ref_1951 = [pool_TExpr.alloc()], local7_HasCase_1952 = 0;
				case 6014:
					local7_add_Str_1949 = local8_ERes_Str_1944.arrAccess(~~(((local1_i_1948) + (1)))).values[tmpPositionCache];
					
				local2_Ex_1950 = INT2STR(local8_ERes_Str_1944.arrAccess(~~(local1_i_1948)).values[tmpPositionCache]);
				alias4_ExEx_ref_1951 = global5_Exprs_ref[0].arrAccess(local2_Ex_1950).values[tmpPositionCache] /* ALIAS */;
				local7_HasCase_1952 = 0;
				case 6123:
					if (!(((((((local7_mngGoto_1933) || (global8_IsInGoto)) ? 1 : 0)) && ((((((((((((((((((((((((((((((((((local1_i_1948) === (0)) ? 1 : 0)) || ((((alias4_ExEx_ref_1951[0].attr3_Typ) === (20)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1951[0].attr3_Typ) === (21)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1951[0].attr3_Typ) === (24)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1951[0].attr3_Typ) === (25)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1951[0].attr3_Typ) === (27)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1951[0].attr3_Typ) === (38)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1951[0].attr3_Typ) === (26)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1951[0].attr3_Typ) === (29)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1951[0].attr3_Typ) === (30)) ? 1 : 0))) ? 1 : 0)) || ((((local1_i_1948) === (((BOUNDS(local8_ERes_Str_1944, 0)) - (1)))) ? 1 : 0))) ? 1 : 0))) ? 1 : 0))) { __pc = 6105; break; }
				
				case 6107:
					func8_IndentUp();
					
				local7_HasCase_1952 = 1;
				local8_Text_Str_1926 = ((((((((local8_Text_Str_1926) + ("case "))) + (CAST2STRING(local2_Ex_1950)))) + (":"))) + (func11_NewLine_Str()));
				
				
			case 6105: //dummy jumper1
				;
					
				case 6176:
					if (!(global9_DEBUGMODE)) { __pc = 6125; break; }
				
				var local7_Add_Str_1953 = "";
				case 6158:
					local7_Add_Str_1953 = (((((((("__debugInfo = \"") + (CAST2STRING(global8_Compiler.attr6_Tokens.arrAccess(global5_Exprs_ref[0].arrAccess(local2_Ex_1950).values[tmpPositionCache][0].attr5_tokID).values[tmpPositionCache].attr4_Line)))) + (":"))) + (global8_Compiler.attr6_Tokens.arrAccess(global5_Exprs_ref[0].arrAccess(local2_Ex_1950).values[tmpPositionCache][0].attr5_tokID).values[tmpPositionCache].attr8_Path_Str))) + ("\";"));
					
				local8_Text_Str_1926 = ((((local8_Text_Str_1926) + (local7_Add_Str_1953))) + (func11_NewLine_Str()));
				case 6175:
					if (!((((local13_FirstText_Str_1947) === ("")) ? 1 : 0))) { __pc = 6170; break; }
				
				case 6174:
					local13_FirstText_Str_1947 = local7_Add_Str_1953;
					
				
				
			case 6170: //dummy jumper1
				;
					
				
				
			case 6125: //dummy jumper1
				;
					
				local8_Text_Str_1926 = ((local8_Text_Str_1926) + (local7_add_Str_1949));
				local8_Text_Str_1926 = ((((local8_Text_Str_1926) + (";"))) + (func11_NewLine_Str()));
				case 6198:
					if (!(local7_HasCase_1952)) { __pc = 6190; break; }
				
				case 6192:
					func10_IndentDown();
					
				local8_Text_Str_1926 = ((local8_Text_Str_1926) + (func11_NewLine_Str()));
				
				
			case 6190: //dummy jumper1
				;
					
				pool_TExpr.free(alias4_ExEx_ref_1951);
				local1_i_1948 += 2;
				__pc = 5993; break; //back jump
				
			case 6004: //dummy for
				;
					
				
				;
				case 6210:
					if (!((((local13_FirstText_Str_1947) !== ("")) ? 1 : 0))) { __pc = 6203; break; }
				
				case 6209:
					local8_Text_Str_1926 = ((local8_Text_Str_1926) + (local13_FirstText_Str_1947));
					
				
				
			case 6203: //dummy jumper1
				;
					
				local8_Text_Str_1926 = ((local8_Text_Str_1926) + (local11_MyUndef_Str_1940));
				case 6276:
					if (!(local7_mngGoto_1933)) { __pc = 6217; break; }
				
				case 6225:
					local8_Text_Str_1926 = ((((local8_Text_Str_1926) + ("__pc = -1; break;"))) + (func11_NewLine_Str()));
					
				func8_IndentUp();
				local8_Text_Str_1926 = ((((local8_Text_Str_1926) + ("default:"))) + (func11_NewLine_Str()));
				func10_IndentDown();
				local8_Text_Str_1926 = ((((local8_Text_Str_1926) + ("throwError(\"Gotocounter exception pc: \"+__pc);"))) + (func11_NewLine_Str()));
				func10_IndentDown();
				local8_Text_Str_1926 = ((((local8_Text_Str_1926) + (func11_NewLine_Str()))) + ("}"));
				func10_IndentDown();
				local8_Text_Str_1926 = ((((local8_Text_Str_1926) + (func11_NewLine_Str()))) + ("}"));
				local8_Text_Str_1926 = (((((((("var __labels = {") + (func16_JSRemoveLast_Str(global12_LabelDef_Str, ", ")))) + ("};"))) + (func11_NewLine_Str()))) + (local8_Text_Str_1926));
				local8_Text_Str_1926 = ((func11_NewLine_Str()) + (local8_Text_Str_1926));
				
				
			case 6217: //dummy jumper1
				;
					
				case 6290:
					if (!((((((global8_IsInGoto) ? 0 : 1)) || (local7_mngGoto_1933)) ? 1 : 0))) { __pc = 6283; break; }
				
				case 6289:
					local8_Text_Str_1926 = (("{") + (local8_Text_Str_1926));
					
				
				
			case 6283: //dummy jumper1
				;
					
				case 6352:
					if (!((((global9_DEBUGMODE) && (local13_IsStackPusher_1934)) ? 1 : 0))) { __pc = 6294; break; }
				
				case 6296:
					func10_IndentDown();
					
				local8_Text_Str_1926 = ((((local8_Text_Str_1926) + (func11_NewLine_Str()))) + ("} catch(ex) {"));
				func8_IndentUp();
				local8_Text_Str_1926 = ((((local8_Text_Str_1926) + (func11_NewLine_Str()))) + ("if (isKnownException(ex)) throw ex;"));
				local8_Text_Str_1926 = ((((local8_Text_Str_1926) + (func11_NewLine_Str()))) + ("alert(formatError(ex));"));
				local8_Text_Str_1926 = ((((local8_Text_Str_1926) + (func11_NewLine_Str()))) + ("END();"));
				func10_IndentDown();
				local8_Text_Str_1926 = ((((local8_Text_Str_1926) + (func11_NewLine_Str()))) + ("} finally {"));
				func8_IndentUp();
				local8_Text_Str_1926 = ((((local8_Text_Str_1926) + (func11_NewLine_Str()))) + ("stackPop();"));
				func10_IndentDown();
				local8_Text_Str_1926 = ((((((local8_Text_Str_1926) + (func11_NewLine_Str()))) + ("}"))) + (func11_NewLine_Str()));
				
				
			case 6294: //dummy jumper1
				;
					
				case 6378:
					if (!((((((global8_IsInGoto) ? 0 : 1)) || (local7_mngGoto_1933)) ? 1 : 0))) { __pc = 6359; break; }
				
				case 6361:
					func10_IndentDown();
					
				local8_Text_Str_1926 = ((local8_Text_Str_1926) + (func11_NewLine_Str()));
				local8_Text_Str_1926 = ((local8_Text_Str_1926) + ("}"));
				
				__pc = 29977;
				break;
				
			case 6359: //dummy jumper1
				
				case 6377:
					local8_Text_Str_1926 = ((local8_Text_Str_1926) + (func11_NewLine_Str()));
					
				
				
			case 29977: //dummy jumper2
				;
					
				global13_VariUndef_Str = local15_BeforeUndef_Str_1939;
				global12_CurrentScope = ~~(local4_oScp_1928);
				global11_CurrentFunc = ~~(local5_oFunc_1929);
				case 6399:
					if (!(local7_mngGoto_1933)) { __pc = 6391; break; }
				
				case 6395:
					global12_LabelDef_Str = local13_oLabelDef_Str_1930;
					
				global8_IsInGoto = local9_oIsInGoto_1931;
				
				
			case 6391: //dummy jumper1
				;
					
				pool_array.free(local8_ERes_Str_1944);
				__pc = 29950;
				break;
				
			case 5456: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(1))) ? 1 : 0))) { __pc = 6401; break; }
				
				var local7_Sym_Str_1954 = "", local10_HasToBeInt_1955 = 0.0, local10_MightBeInt_1956 = 0;
				case 6411:
					local7_Sym_Str_1954 = global9_Operators_ref[0].arrAccess(param4_expr.attr2_Op).values[tmpPositionCache][0].attr7_Sym_Str;
					
				local10_HasToBeInt_1955 = 0;
				local10_MightBeInt_1956 = 0;
				
				var local16___SelectHelper5__1957 = "";
				case 6424:
					local16___SelectHelper5__1957 = local7_Sym_Str_1954;
					
				case 6489:
					if (!((((local16___SelectHelper5__1957) === ("=")) ? 1 : 0))) { __pc = 6426; break; }
				
				case 6430:
					local7_Sym_Str_1954 = "===";
					
				local10_HasToBeInt_1955 = 1;
				
				
			case 6426: //dummy jumper1
				if (!((((local16___SelectHelper5__1957) === ("<>")) ? 1 : 0))) { __pc = 6436; break; }
				
				case 6440:
					local7_Sym_Str_1954 = "!==";
					
				local10_HasToBeInt_1955 = 1;
				
				
			case 6436: //dummy jumper1
				if (!((((local16___SelectHelper5__1957) === ("OR")) ? 1 : 0))) { __pc = 6446; break; }
				
				case 6450:
					local7_Sym_Str_1954 = "||";
					
				local10_HasToBeInt_1955 = 1;
				
				
			case 6446: //dummy jumper1
				if (!((((local16___SelectHelper5__1957) === ("AND")) ? 1 : 0))) { __pc = 6456; break; }
				
				case 6460:
					local7_Sym_Str_1954 = "&&";
					
				local10_HasToBeInt_1955 = 1;
				
				
			case 6456: //dummy jumper1
				if (!((((local16___SelectHelper5__1957) === ("<")) ? 1 : 0))) { __pc = 6466; break; }
				
				case 6470:
					local10_MightBeInt_1956 = 1;
					
				
				
			case 6466: //dummy jumper1
				if (!((((local16___SelectHelper5__1957) === (">")) ? 1 : 0))) { __pc = 6472; break; }
				
				case 6476:
					local10_MightBeInt_1956 = 1;
					
				
				
			case 6472: //dummy jumper1
				if (!((((local16___SelectHelper5__1957) === (">=")) ? 1 : 0))) { __pc = 6478; break; }
				
				case 6482:
					local10_MightBeInt_1956 = 1;
					
				
				
			case 6478: //dummy jumper1
				if (!((((local16___SelectHelper5__1957) === ("<=")) ? 1 : 0))) { __pc = 6484; break; }
				
				case 6488:
					local10_MightBeInt_1956 = 1;
					
				
				
			case 6484: //dummy jumper1
				;
					
				
				;
				case 6666:
					if (!((((local10_HasToBeInt_1955) || (local10_MightBeInt_1956)) ? 1 : 0))) { __pc = 6494; break; }
				
				case 6608:
					if (!(((((((local10_MightBeInt_1956) && ((((global5_Exprs_ref[0].arrAccess(param4_expr.attr4_Left).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("string")) ? 1 : 0))) ? 1 : 0)) && ((((global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("string")) ? 1 : 0))) ? 1 : 0))) { __pc = 6521; break; }
				
				var local7_Res_Str_1958 = "";
				case 6525:
					
				var local16___SelectHelper6__1959 = "";
				case 6527:
					local16___SelectHelper6__1959 = local7_Sym_Str_1954;
					
				case 6552:
					if (!((((local16___SelectHelper6__1959) === ("<")) ? 1 : 0))) { __pc = 6529; break; }
				
				case 6533:
					local7_Res_Str_1958 = " === -1";
					
				
				
			case 6529: //dummy jumper1
				if (!((((local16___SelectHelper6__1959) === (">")) ? 1 : 0))) { __pc = 6535; break; }
				
				case 6539:
					local7_Res_Str_1958 = " === 1";
					
				
				
			case 6535: //dummy jumper1
				if (!((((local16___SelectHelper6__1959) === ("<=")) ? 1 : 0))) { __pc = 6541; break; }
				
				case 6545:
					local7_Res_Str_1958 = " <= 0";
					
				
				
			case 6541: //dummy jumper1
				if (!((((local16___SelectHelper6__1959) === (">=")) ? 1 : 0))) { __pc = 6547; break; }
				
				case 6551:
					local7_Res_Str_1958 = " >= 0";
					
				
				
			case 6547: //dummy jumper1
				;
					
				
				;
					
				local8_Text_Str_1926 = ((((((((((((((local8_Text_Str_1926) + ("((strcmp(("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_Left).values[tmpPositionCache][0]))))) + ("), ("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0]))))) + (")) "))) + (local7_Res_Str_1958))) + (" ) ? 1 : 0)"));
				
				__pc = 29981;
				break;
				
			case 6521: //dummy jumper1
				
				case 6607:
					local8_Text_Str_1926 = ((((((((((((((local8_Text_Str_1926) + ("((("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_Left).values[tmpPositionCache][0]))))) + (") "))) + (local7_Sym_Str_1954))) + (" ("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0]))))) + (")) ? 1 : 0)"));
					
				
				
			case 29981: //dummy jumper2
				;
					
				
				__pc = 29980;
				break;
				
			case 6494: //dummy jumper1
				
				var local5_l_Str_1960 = "";
				case 6617:
					local5_l_Str_1960 = func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_Left).values[tmpPositionCache][0]));
					
				case 6665:
					if (!(((((((local7_Sym_Str_1954) === ("-")) ? 1 : 0)) && ((((local5_l_Str_1960) === ("0")) ? 1 : 0))) ? 1 : 0))) { __pc = 6626; break; }
				
				case 6641:
					local8_Text_Str_1926 = ((((((local8_Text_Str_1926) + ("-("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0]))))) + (")"));
					
				
				__pc = 29983;
				break;
				
			case 6626: //dummy jumper1
				
				case 6664:
					local8_Text_Str_1926 = ((((((((((((((local8_Text_Str_1926) + ("(("))) + (local5_l_Str_1960))) + (") "))) + (local7_Sym_Str_1954))) + (" ("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0]))))) + ("))"));
					
				
				
			case 29983: //dummy jumper2
				;
					
				
				
			case 29980: //dummy jumper2
				;
					
				case 6703:
					if (!((((((((((local7_Sym_Str_1954) === ("/")) ? 1 : 0)) && ((((global5_Exprs_ref[0].arrAccess(param4_expr.attr4_Left).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("int")) ? 1 : 0))) ? 1 : 0)) && ((((global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("int")) ? 1 : 0))) ? 1 : 0))) { __pc = 6694; break; }
				
				case 6702:
					local8_Text_Str_1926 = (((("CAST2INT(") + (local8_Text_Str_1926))) + (")"));
					
				
				
			case 6694: //dummy jumper1
				;
					
				
				__pc = 29950;
				break;
				
			case 6401: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(3))) ? 1 : 0))) { __pc = 6705; break; }
				
				case 6713:
					local8_Text_Str_1926 = CAST2STRING(INTEGER(param4_expr.attr6_intval));
					
				
				__pc = 29950;
				break;
				
			case 6705: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(4))) ? 1 : 0))) { __pc = 6715; break; }
				
				case 6722:
					local8_Text_Str_1926 = CAST2STRING(param4_expr.attr8_floatval);
					
				
				__pc = 29950;
				break;
				
			case 6715: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(5))) ? 1 : 0))) { __pc = 6724; break; }
				
				case 6730:
					local8_Text_Str_1926 = param4_expr.attr10_strval_Str;
					
				
				__pc = 29950;
				break;
				
			case 6724: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(6))) ? 1 : 0))) { __pc = 6732; break; }
				
				case 6939:
					if (!((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_expr.attr4_func).values[tmpPositionCache][0].attr3_Typ) === (3)) ? 1 : 0))) { __pc = 6745; break; }
				
				var local1_P_1961 = 0, alias2_Ex_ref_1962 = [pool_TExpr.alloc()];
				case 6755:
					local1_P_1961 = param4_expr.attr6_Params.arrAccess(-(1)).values[tmpPositionCache];
					
				alias2_Ex_ref_1962 = global5_Exprs_ref[0].arrAccess(local1_P_1961).values[tmpPositionCache] /* ALIAS */;
				case 6918:
					if (!((((alias2_Ex_ref_1962[0].attr3_Typ) === (53)) ? 1 : 0))) { __pc = 6766; break; }
				
				var local5_Found_1963 = 0, local5_typId_1964 = 0;
				case 6789:
					if (!(((func6_IsType(alias2_Ex_ref_1962[0].attr8_datatype.attr8_Name_Str)) ? 0 : 1))) { __pc = 6775; break; }
				
				case 6788:
					func5_Error((((("Internal error (Unable to find '") + (alias2_Ex_ref_1962[0].attr8_datatype.attr8_Name_Str))) + ("')")), 616, "src\CompilerPasses\Generator\JSGenerator.gbas");
					
				
				
			case 6775: //dummy jumper1
				;
					
				local5_Found_1963 = 0;
				local5_typId_1964 = global8_LastType.attr2_ID;
				case 6887:
					if (!((((local5_typId_1964) !== (-(1))) ? 1 : 0))) {__pc = 29988; break;}
				
				case 6877:
					var forEachSaver6877 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_1964).values[tmpPositionCache][0].attr7_Methods;
				var forEachCounter6877 = 0
				
			case 6817: //dummy for1
				if (!(forEachCounter6877 < forEachSaver6877.values.length)) {__pc = 6809; break;}
				var local3_Mth_1965 = forEachSaver6877.values[forEachCounter6877];
				
				
				case 6876:
					if (!((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1965).values[tmpPositionCache][0].attr9_OName_Str) === (global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_expr.attr4_func).values[tmpPositionCache][0].attr9_OName_Str)) ? 1 : 0))) { __pc = 6836; break; }
				
				var local10_Params_Str_1966 = "";
				case 6845:
					local10_Params_Str_1966 = func17_JSDoParameter_Str(param4_expr, param4_expr.attr4_func, 0);
					
				case 6857:
					if (!((((local10_Params_Str_1966) !== ("")) ? 1 : 0))) { __pc = 6850; break; }
				
				case 6856:
					local10_Params_Str_1966 = ((local10_Params_Str_1966) + (", "));
					
				
				
			case 6850: //dummy jumper1
				;
					
				local8_Text_Str_1926 = ((((((((local8_Text_Str_1926) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1965).values[tmpPositionCache][0].attr8_Name_Str))) + ("("))) + (local10_Params_Str_1966))) + ("param4_self)"));
				case 6875:
					__pc = __labels["Exit"]; break;
					
				
				
			case 6836: //dummy jumper1
				;
					
				
				forEachSaver6877.values[forEachCounter6877] = local3_Mth_1965;
				
				forEachCounter6877++
				__pc = 6817; break; //back jump
				
			case 6809: //dummy for
				;
					
				local5_typId_1964 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_1964).values[tmpPositionCache][0].attr9_Extending;
				
				__pc = 6887; break; //back jump
				
			case 29988:
				;
					
				case 6888:
					//label: Exit;
					
				
				__pc = 29986;
				break;
				
			case 6766: //dummy jumper1
				
				case 6917:
					local8_Text_Str_1926 = ((((((((((local8_Text_Str_1926) + ("("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local1_P_1961).values[tmpPositionCache][0]))))) + (")."))) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_expr.attr4_func).values[tmpPositionCache][0].attr9_OName_Str))) + (func17_JSDoParameter_Str(param4_expr, param4_expr.attr4_func, 1)));
					
				
				
			case 29986: //dummy jumper2
				;
					
				pool_TExpr.free(alias2_Ex_ref_1962);
				__pc = 29985;
				break;
				
			case 6745: //dummy jumper1
				
				case 6938:
					local8_Text_Str_1926 = ((((local8_Text_Str_1926) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_expr.attr4_func).values[tmpPositionCache][0].attr8_Name_Str))) + (func17_JSDoParameter_Str(param4_expr, param4_expr.attr4_func, 1)));
					
				
				
			case 29985: //dummy jumper2
				;
					
				
				__pc = 29950;
				break;
				
			case 6732: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(23))) ? 1 : 0))) { __pc = 6941; break; }
				
				case 6958:
					local8_Text_Str_1926 = ((((local8_Text_Str_1926) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (func17_JSDoParameter_Str(param4_expr, -(1), 1)));
					
				
				__pc = 29950;
				break;
				
			case 6941: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(9))) ? 1 : 0))) { __pc = 6960; break; }
				
				case 6974:
					local8_Text_Str_1926 = ((local8_Text_Str_1926) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_Name_Str));
					
				case 6991:
					if (!(global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr3_ref)) { __pc = 6984; break; }
				
				case 6990:
					local8_Text_Str_1926 = ((local8_Text_Str_1926) + ("[0]"));
					
				
				
			case 6984: //dummy jumper1
				;
					
				
				__pc = 29950;
				break;
				
			case 6960: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(13))) ? 1 : 0))) { __pc = 6993; break; }
				
				case 7004:
					local8_Text_Str_1926 = ((local8_Text_Str_1926) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_array).values[tmpPositionCache][0]))));
					
				case 7091:
					if (!((((BOUNDS(param4_expr.attr4_dims, 0)) !== (0)) ? 1 : 0))) { __pc = 7013; break; }
				
				var local1_s_1967 = 0, local7_Add_Str_1968 = "";
				case 7019:
					local8_Text_Str_1926 = ((local8_Text_Str_1926) + (".arrAccess("));
					
				local1_s_1967 = 0;
				local7_Add_Str_1968 = "";
				case 7083:
					var forEachSaver7083 = param4_expr.attr4_dims;
				var forEachCounter7083 = 0
				
			case 7034: //dummy for1
				if (!(forEachCounter7083 < forEachSaver7083.values.length)) {__pc = 7030; break;}
				var local1_d_1969 = forEachSaver7083.values[forEachCounter7083];
				
				
				var local1_v_1970 = 0;
				case 7044:
					if (!(local1_s_1967)) { __pc = 7037; break; }
				
				case 7043:
					local8_Text_Str_1926 = ((local8_Text_Str_1926) + (", "));
					
				
				
			case 7037: //dummy jumper1
				;
					
				local8_Text_Str_1926 = ((local8_Text_Str_1926) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local1_d_1969).values[tmpPositionCache][0]))));
				local1_s_1967 = 1;
				local1_v_1970 = func11_GetVariable(param4_expr.attr5_array, 0);
				case 7082:
					if (!(((((((local1_v_1970) !== (-(1))) ? 1 : 0)) && (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_v_1970).values[tmpPositionCache][0].attr3_ref)) ? 1 : 0))) { __pc = 7077; break; }
				
				case 7081:
					local7_Add_Str_1968 = "[0]";
					
				
				
			case 7077: //dummy jumper1
				;
					
				
				forEachSaver7083.values[forEachCounter7083] = local1_d_1969;
				
				forEachCounter7083++
				__pc = 7034; break; //back jump
				
			case 7030: //dummy for
				;
					
				local8_Text_Str_1926 = ((((local8_Text_Str_1926) + (").values[tmpPositionCache]"))) + (local7_Add_Str_1968));
				
				
			case 7013: //dummy jumper1
				;
					
				
				__pc = 29950;
				break;
				
			case 6993: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(10))) ? 1 : 0))) { __pc = 7093; break; }
				
				case 7106:
					local8_Text_Str_1926 = ((((local8_Text_Str_1926) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0]))))) + (" = "));
					
				local8_Text_Str_1926 = ((local8_Text_Str_1926) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0]))));
				case 7166:
					if (!((((global5_Exprs_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) || (func6_IsType(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) ? 1 : 0))) { __pc = 7137; break; }
				
				case 7165:
					if (!(((((((global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0].attr3_Typ) !== (35)) ? 1 : 0)) && ((((global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0].attr3_Typ) !== (36)) ? 1 : 0))) ? 1 : 0))) { __pc = 7158; break; }
				
				case 7164:
					local8_Text_Str_1926 = ((local8_Text_Str_1926) + (".clone(/* In Assign */)"));
					
				
				
			case 7158: //dummy jumper1
				;
					
				
				
			case 7137: //dummy jumper1
				;
					
				
				__pc = 29950;
				break;
				
			case 7093: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(11))) ? 1 : 0))) { __pc = 7168; break; }
				
				var local1_v_1971 = 0, local6_hasRef_1972 = 0, local4_Find_1973 = 0;
				case 7176:
					local1_v_1971 = func11_GetVariable(param4_expr.attr5_array, 0);
					
				local6_hasRef_1972 = 0;
				case 7201:
					if (!(((((((local1_v_1971) === (-(1))) ? 1 : 0)) || (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_v_1971).values[tmpPositionCache][0].attr3_ref)) ? 1 : 0))) { __pc = 7196; break; }
				
				case 7200:
					local6_hasRef_1972 = 1;
					
				
				
			case 7196: //dummy jumper1
				;
					
				local8_Text_Str_1926 = ((((((local8_Text_Str_1926) + ("DIM("))) + (func14_JSTryUnref_Str(param4_expr.attr5_array)))) + (", ["));
				local4_Find_1973 = 0;
				case 7248:
					var forEachSaver7248 = param4_expr.attr4_dims;
				var forEachCounter7248 = 0
				
			case 7224: //dummy for1
				if (!(forEachCounter7248 < forEachSaver7248.values.length)) {__pc = 7220; break;}
				var local1_D_1974 = forEachSaver7248.values[forEachCounter7248];
				
				
				case 7236:
					if (!((((local4_Find_1973) === (1)) ? 1 : 0))) { __pc = 7229; break; }
				
				case 7235:
					local8_Text_Str_1926 = ((local8_Text_Str_1926) + (", "));
					
				
				
			case 7229: //dummy jumper1
				;
					
				local8_Text_Str_1926 = ((local8_Text_Str_1926) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local1_D_1974).values[tmpPositionCache][0]))));
				local4_Find_1973 = 1;
				
				forEachSaver7248.values[forEachCounter7248] = local1_D_1974;
				
				forEachCounter7248++
				__pc = 7224; break; //back jump
				
			case 7220: //dummy for
				;
					
				local8_Text_Str_1926 = ((((((local8_Text_Str_1926) + ("], "))) + (func21_JSGetDefaultValue_Str(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_array).values[tmpPositionCache][0].attr8_datatype, local6_hasRef_1972, 1)))) + (")"));
				
				__pc = 29950;
				break;
				
			case 7168: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(12))) ? 1 : 0))) { __pc = 7268; break; }
				
				var local1_v_1975 = 0, local6_hasRef_1976 = 0, local4_Find_1977 = 0;
				case 7276:
					local1_v_1975 = func11_GetVariable(param4_expr.attr5_array, 0);
					
				local6_hasRef_1976 = 0;
				case 7301:
					if (!(((((((local1_v_1975) === (-(1))) ? 1 : 0)) || (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_v_1975).values[tmpPositionCache][0].attr3_ref)) ? 1 : 0))) { __pc = 7296; break; }
				
				case 7300:
					local6_hasRef_1976 = 1;
					
				
				
			case 7296: //dummy jumper1
				;
					
				local8_Text_Str_1926 = ((((((local8_Text_Str_1926) + ("REDIM("))) + (func14_JSTryUnref_Str(param4_expr.attr5_array)))) + (", ["));
				local4_Find_1977 = 0;
				case 7348:
					var forEachSaver7348 = param4_expr.attr4_dims;
				var forEachCounter7348 = 0
				
			case 7324: //dummy for1
				if (!(forEachCounter7348 < forEachSaver7348.values.length)) {__pc = 7320; break;}
				var local1_D_1978 = forEachSaver7348.values[forEachCounter7348];
				
				
				case 7336:
					if (!((((local4_Find_1977) === (1)) ? 1 : 0))) { __pc = 7329; break; }
				
				case 7335:
					local8_Text_Str_1926 = ((local8_Text_Str_1926) + (", "));
					
				
				
			case 7329: //dummy jumper1
				;
					
				local8_Text_Str_1926 = ((local8_Text_Str_1926) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local1_D_1978).values[tmpPositionCache][0]))));
				local4_Find_1977 = 1;
				
				forEachSaver7348.values[forEachCounter7348] = local1_D_1978;
				
				forEachCounter7348++
				__pc = 7324; break; //back jump
				
			case 7320: //dummy for
				;
					
				local8_Text_Str_1926 = ((((((local8_Text_Str_1926) + ("], "))) + (func21_JSGetDefaultValue_Str(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_array).values[tmpPositionCache][0].attr8_datatype, local6_hasRef_1976, 1)))) + (" )"));
				
				__pc = 29950;
				break;
				
			case 7268: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(15))) ? 1 : 0))) { __pc = 7368; break; }
				
				var local4_cast_1979 = 0;
				case 7372:
					local4_cast_1979 = 1;
					
				case 7454:
					if (!((((global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr3_Typ) === (4)) ? 1 : 0))) { __pc = 7383; break; }
				
				var local5_f_Str_1980 = "";
				case 7388:
					local4_cast_1979 = 0;
					
				local5_f_Str_1980 = ((CAST2STRING(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr8_floatval)) + (""));
				
				var local1_i_1981 = 0.0;
				case 7428:
					local1_i_1981 = 0
				
			case 7406: //dummy for1
				if (!toCheck(local1_i_1981, (((local5_f_Str_1980).length) - (1)), 1)) {__pc = 7413; break;}
				
				case 7427:
					if (!((((ASC(local5_f_Str_1980, ~~(local1_i_1981))) === (ASC(".", 0))) ? 1 : 0))) { __pc = 7421; break; }
				
				case 7425:
					local4_cast_1979 = 1;
					
				case 7426:
					__pc = 7413; break;
					
				
				
			case 7421: //dummy jumper1
				;
					
				
				local1_i_1981 += 1;
				__pc = 7406; break; //back jump
				
			case 7413: //dummy for
				;
					
				
				;
				
				
			case 7383: //dummy jumper1
				if (!(((((((global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("float")) ? 1 : 0)) && ((((global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0))) ? 1 : 0))) { __pc = 7452; break; }
				
				
				
			case 7452: //dummy jumper1
				;
					
				case 7544:
					if (!(local4_cast_1979)) { __pc = 7456; break; }
				
				case 7467:
					
				var local16___SelectHelper7__1982 = "";
				case 7469:
					local16___SelectHelper7__1982 = global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str;
					
				case 7532:
					if (!((((local16___SelectHelper7__1982) === ("int")) ? 1 : 0))) { __pc = 7471; break; }
				
				case 7482:
					local8_Text_Str_1926 = ((local8_Text_Str_1926) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))));
					
				
				__pc = 30004;
				break;
				
			case 7471: //dummy jumper1
				if (!((((local16___SelectHelper7__1982) === ("float")) ? 1 : 0))) { __pc = 7484; break; }
				
				case 7499:
					local8_Text_Str_1926 = ((((((local8_Text_Str_1926) + ("~~("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")"));
					
				
				__pc = 30004;
				break;
				
			case 7484: //dummy jumper1
				if (!((((local16___SelectHelper7__1982) === ("string")) ? 1 : 0))) { __pc = 7501; break; }
				
				case 7516:
					local8_Text_Str_1926 = ((((((local8_Text_Str_1926) + ("INT2STR("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")"));
					
				
				__pc = 30004;
				break;
				
			case 7501: //dummy jumper1
				
				case 7531:
					local8_Text_Str_1926 = ((((((local8_Text_Str_1926) + ("CAST2INT("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")"));
					
				
				
			case 30004: //dummy jumper2
				;
					
				
				;
					
				
				__pc = 30003;
				break;
				
			case 7456: //dummy jumper1
				
				case 7543:
					local8_Text_Str_1926 = ((local8_Text_Str_1926) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))));
					
				
				
			case 30003: //dummy jumper2
				;
					
				
				__pc = 29950;
				break;
				
			case 7368: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(16))) ? 1 : 0))) { __pc = 7546; break; }
				
				case 7641:
					if (!((((global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr3_Typ) === (3)) ? 1 : 0))) { __pc = 7557; break; }
				
				case 7568:
					local8_Text_Str_1926 = ((local8_Text_Str_1926) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))));
					
				
				__pc = 30005;
				break;
				
			case 7557: //dummy jumper1
				
				case 7579:
					
				var local16___SelectHelper8__1983 = "";
				case 7581:
					local16___SelectHelper8__1983 = global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str;
					
				case 7640:
					if (!((((local16___SelectHelper8__1983) === ("int")) ? 1 : 0))) { __pc = 7583; break; }
				
				case 7594:
					local8_Text_Str_1926 = ((local8_Text_Str_1926) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))));
					
				
				__pc = 30006;
				break;
				
			case 7583: //dummy jumper1
				if (!((((local16___SelectHelper8__1983) === ("float")) ? 1 : 0))) { __pc = 7596; break; }
				
				case 7607:
					local8_Text_Str_1926 = ((local8_Text_Str_1926) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))));
					
				
				__pc = 30006;
				break;
				
			case 7596: //dummy jumper1
				if (!((((local16___SelectHelper8__1983) === ("string")) ? 1 : 0))) { __pc = 7609; break; }
				
				case 7624:
					local8_Text_Str_1926 = ((((((local8_Text_Str_1926) + ("FLOAT2STR("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")"));
					
				
				__pc = 30006;
				break;
				
			case 7609: //dummy jumper1
				
				case 7639:
					local8_Text_Str_1926 = ((((((local8_Text_Str_1926) + ("CAST2FLOAT("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")"));
					
				
				
			case 30006: //dummy jumper2
				;
					
				
				;
					
				
				
			case 30005: //dummy jumper2
				;
					
				
				__pc = 29950;
				break;
				
			case 7546: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(17))) ? 1 : 0))) { __pc = 7643; break; }
				
				case 7658:
					local8_Text_Str_1926 = ((((((local8_Text_Str_1926) + ("CAST2STRING("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")"));
					
				
				__pc = 29950;
				break;
				
			case 7643: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(18))) ? 1 : 0))) { __pc = 7660; break; }
				
				case 7680:
					local8_Text_Str_1926 = ((((((local8_Text_Str_1926) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + ("."))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_nextExpr).values[tmpPositionCache][0]))));
					
				
				__pc = 29950;
				break;
				
			case 7660: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(19))) ? 1 : 0))) { __pc = 7682; break; }
				
				var local1_F_1984 = 0;
				case 7687:
					local1_F_1984 = 0;
					
				
				var local16___SelectHelper9__1985 = 0;
				case 7698:
					local16___SelectHelper9__1985 = global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr3_Typ;
					
				case 7717:
					if (!((((local16___SelectHelper9__1985) === (~~(3))) ? 1 : 0))) { __pc = 7700; break; }
				
				case 7704:
					local1_F_1984 = 1;
					
				
				
			case 7700: //dummy jumper1
				if (!((((local16___SelectHelper9__1985) === (~~(4))) ? 1 : 0))) { __pc = 7706; break; }
				
				case 7710:
					local1_F_1984 = 1;
					
				
				
			case 7706: //dummy jumper1
				if (!((((local16___SelectHelper9__1985) === (~~(5))) ? 1 : 0))) { __pc = 7712; break; }
				
				case 7716:
					local1_F_1984 = 1;
					
				
				
			case 7712: //dummy jumper1
				;
					
				
				;
				local8_Text_Str_1926 = ((local8_Text_Str_1926) + (global13_VariUndef_Str));
				case 7749:
					if (!(local1_F_1984)) { __pc = 7724; break; }
				
				case 7735:
					local8_Text_Str_1926 = ((((local8_Text_Str_1926) + ("return "))) + (func14_JSTryUnref_Str(param4_expr.attr4_expr)));
					
				
				__pc = 30008;
				break;
				
			case 7724: //dummy jumper1
				
				case 7748:
					local8_Text_Str_1926 = ((((((local8_Text_Str_1926) + ("return tryClone("))) + (func14_JSTryUnref_Str(param4_expr.attr4_expr)))) + (")"));
					
				
				
			case 30008: //dummy jumper2
				;
					
				
				__pc = 29950;
				break;
				
			case 7682: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(22))) ? 1 : 0))) { __pc = 7751; break; }
				
				var local8_Name_Str_1986 = "", local5_Found_1987 = 0;
				case 7762:
					local8_Name_Str_1986 = REPLACE_Str(param4_expr.attr8_datatype.attr8_Name_Str, "$", "_Str");
					
				case 7791:
					var forEachSaver7791 = global8_Compiler.attr5_Funcs_ref[0];
				var forEachCounter7791 = 0
				
			case 7770: //dummy for1
				if (!(forEachCounter7791 < forEachSaver7791.values.length)) {__pc = 7766; break;}
				var local4_Func_ref_1988 = forEachSaver7791.values[forEachCounter7791];
				
				
				case 7790:
					if (!((((local4_Func_ref_1988[0].attr9_OName_Str) === (local8_Name_Str_1986)) ? 1 : 0))) { __pc = 7777; break; }
				
				case 7785:
					local8_Text_Str_1926 = ((local8_Text_Str_1926) + (local4_Func_ref_1988[0].attr8_Name_Str));
					
				local5_Found_1987 = 1;
				case 7789:
					__pc = 7766; break;
					
				
				
			case 7777: //dummy jumper1
				;
					
				
				forEachSaver7791.values[forEachCounter7791] = local4_Func_ref_1988;
				
				forEachCounter7791++
				__pc = 7770; break; //back jump
				
			case 7766: //dummy for
				;
					
				case 7801:
					if (!(((local5_Found_1987) ? 0 : 1))) { __pc = 7794; break; }
				
				case 7800:
					local8_Text_Str_1926 = ((local8_Text_Str_1926) + (local8_Name_Str_1986));
					
				
				
			case 7794: //dummy jumper1
				;
					
				
				__pc = 29950;
				break;
				
			case 7751: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(24))) ? 1 : 0))) { __pc = 7803; break; }
				
				case 8066:
					if (!(global8_IsInGoto)) { __pc = 7806; break; }
				
				var local5_dummy_1989 = 0;
				case 7810:
					local5_dummy_1989 = global11_LastDummyID;
					
				global11_LastDummyID+=1;
				
				var local1_i_1990 = 0.0;
				case 7927:
					local1_i_1990 = 0
				
			case 7819: //dummy for1
				if (!toCheck(local1_i_1990, ((BOUNDS(param4_expr.attr10_Conditions, 0)) - (1)), 1)) {__pc = 7830; break;}
				
				case 7860:
					local8_Text_Str_1926 = ((((((((((((local8_Text_Str_1926) + ("if (!("))) + (func23_ConditionJSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr10_Conditions.arrAccess(~~(local1_i_1990)).values[tmpPositionCache]).values[tmpPositionCache][0]))))) + (")) { __pc = "))) + (CAST2STRING(param4_expr.attr10_Conditions.arrAccess(~~(local1_i_1990)).values[tmpPositionCache])))) + ("; break; }"))) + (func11_NewLine_Str()));
					
				local8_Text_Str_1926 = ((local8_Text_Str_1926) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr6_Scopes.arrAccess(~~(local1_i_1990)).values[tmpPositionCache]).values[tmpPositionCache][0]))));
				case 7902:
					if (!((((param4_expr.attr9_elseScope) !== (-(1))) ? 1 : 0))) { __pc = 7881; break; }
				
				case 7894:
					local8_Text_Str_1926 = ((((((((local8_Text_Str_1926) + ("__pc = "))) + (CAST2STRING(local5_dummy_1989)))) + (";"))) + (func11_NewLine_Str()));
					
				local8_Text_Str_1926 = ((((local8_Text_Str_1926) + ("break;"))) + (func11_NewLine_Str()));
				
				
			case 7881: //dummy jumper1
				;
					
				func10_IndentDown();
				local8_Text_Str_1926 = ((local8_Text_Str_1926) + (func11_NewLine_Str()));
				func8_IndentUp();
				local8_Text_Str_1926 = ((((((((local8_Text_Str_1926) + ("case "))) + (CAST2STRING(param4_expr.attr10_Conditions.arrAccess(~~(local1_i_1990)).values[tmpPositionCache])))) + (": //dummy jumper1"))) + (func11_NewLine_Str()));
				
				local1_i_1990 += 1;
				__pc = 7819; break; //back jump
				
			case 7830: //dummy for
				;
					
				
				;
				case 7966:
					if (!((((param4_expr.attr9_elseScope) !== (-(1))) ? 1 : 0))) { __pc = 7935; break; }
				
				case 7946:
					local8_Text_Str_1926 = ((local8_Text_Str_1926) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr9_elseScope).values[tmpPositionCache][0]))));
					
				func10_IndentDown();
				local8_Text_Str_1926 = ((local8_Text_Str_1926) + (func11_NewLine_Str()));
				func8_IndentUp();
				local8_Text_Str_1926 = ((((((((local8_Text_Str_1926) + ("case "))) + (CAST2STRING(local5_dummy_1989)))) + (": //dummy jumper2"))) + (func11_NewLine_Str()));
				
				
			case 7935: //dummy jumper1
				;
					
				
				__pc = 30011;
				break;
				
			case 7806: //dummy jumper1
				
				var local8_IsSwitch_1991 = 0;
				case 7971:
					local8_IsSwitch_1991 = 0;
					
				case 8065:
					if (!(local8_IsSwitch_1991)) { __pc = 7974; break; }
				
				
				__pc = 30014;
				break;
				
			case 7974: //dummy jumper1
				
				case 7977:
					
				var local1_i_1992 = 0.0;
				case 8042:
					local1_i_1992 = 0
				
			case 7981: //dummy for1
				if (!toCheck(local1_i_1992, ((BOUNDS(param4_expr.attr10_Conditions, 0)) - (1)), 1)) {__pc = 7992; break;}
				
				case 8011:
					if (!((((local1_i_1992) === (0)) ? 1 : 0))) { __pc = 7998; break; }
				
				case 8004:
					local8_Text_Str_1926 = ((local8_Text_Str_1926) + ("if"));
					
				
				__pc = 30015;
				break;
				
			case 7998: //dummy jumper1
				
				case 8010:
					local8_Text_Str_1926 = ((local8_Text_Str_1926) + (" else if"));
					
				
				
			case 30015: //dummy jumper2
				;
					
				local8_Text_Str_1926 = ((((((local8_Text_Str_1926) + (" ("))) + (func23_ConditionJSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr10_Conditions.arrAccess(~~(local1_i_1992)).values[tmpPositionCache]).values[tmpPositionCache][0]))))) + (") "));
				local8_Text_Str_1926 = ((local8_Text_Str_1926) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr6_Scopes.arrAccess(~~(local1_i_1992)).values[tmpPositionCache]).values[tmpPositionCache][0]))));
				
				local1_i_1992 += 1;
				__pc = 7981; break; //back jump
				
			case 7992: //dummy for
				;
					
				
				;
					
				case 8064:
					if (!((((param4_expr.attr9_elseScope) !== (-(1))) ? 1 : 0))) { __pc = 8050; break; }
				
				case 8063:
					local8_Text_Str_1926 = ((((local8_Text_Str_1926) + (" else "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr9_elseScope).values[tmpPositionCache][0]))));
					
				
				
			case 8050: //dummy jumper1
				;
					
				
				
			case 30014: //dummy jumper2
				;
					
				
				
			case 30011: //dummy jumper2
				;
					
				
				__pc = 29950;
				break;
				
			case 7803: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(25))) ? 1 : 0))) { __pc = 8068; break; }
				
				case 8187:
					if (!(global8_IsInGoto)) { __pc = 8071; break; }
				
				var local6_TmpBID_1993 = 0, local6_TmpCID_1994 = 0;
				case 8075:
					local6_TmpBID_1993 = global11_LoopBreakID;
					
				local6_TmpCID_1994 = global14_LoopContinueID;
				global11_LoopBreakID = global11_LastDummyID;
				global14_LoopContinueID = param4_expr.attr2_ID;
				global11_LastDummyID+=1;
				local8_Text_Str_1926 = ((((((((((((local8_Text_Str_1926) + ("if (!("))) + (func23_ConditionJSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")) {__pc = "))) + (CAST2STRING(global11_LoopBreakID)))) + ("; break;}"))) + (func11_NewLine_Str()));
				local8_Text_Str_1926 = ((local8_Text_Str_1926) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
				local8_Text_Str_1926 = ((((((((local8_Text_Str_1926) + ("__pc = "))) + (CAST2STRING(param4_expr.attr2_ID)))) + ("; break; //back jump"))) + (func11_NewLine_Str()));
				func10_IndentDown();
				local8_Text_Str_1926 = ((local8_Text_Str_1926) + (func11_NewLine_Str()));
				func8_IndentUp();
				local8_Text_Str_1926 = ((((((((local8_Text_Str_1926) + ("case "))) + (CAST2STRING(global11_LoopBreakID)))) + (":"))) + (func11_NewLine_Str()));
				global11_LoopBreakID = local6_TmpBID_1993;
				global14_LoopContinueID = local6_TmpCID_1994;
				
				__pc = 30017;
				break;
				
			case 8071: //dummy jumper1
				
				case 8176:
					local8_Text_Str_1926 = ((((((local8_Text_Str_1926) + ("while ("))) + (func23_ConditionJSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (") "));
					
				local8_Text_Str_1926 = ((local8_Text_Str_1926) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
				
				
			case 30017: //dummy jumper2
				;
					
				
				__pc = 29950;
				break;
				
			case 8068: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(26))) ? 1 : 0))) { __pc = 8189; break; }
				
				case 8313:
					if (!(global8_IsInGoto)) { __pc = 8192; break; }
				
				var local6_TmpBID_1995 = 0, local6_TmpCID_1996 = 0;
				case 8196:
					local6_TmpBID_1995 = global11_LoopBreakID;
					
				local6_TmpCID_1996 = global14_LoopContinueID;
				global11_LoopBreakID = global11_LastDummyID;
				global14_LoopContinueID = param4_expr.attr2_ID;
				global11_LastDummyID+=1;
				local8_Text_Str_1926 = ((local8_Text_Str_1926) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
				local8_Text_Str_1926 = ((((((((((((local8_Text_Str_1926) + ("if ("))) + (func23_ConditionJSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (") {__pc = "))) + (CAST2STRING(global11_LoopBreakID)))) + ("; break;}"))) + (func11_NewLine_Str()));
				local8_Text_Str_1926 = ((((((((local8_Text_Str_1926) + ("__pc = "))) + (CAST2STRING(param4_expr.attr2_ID)))) + ("; break; //back jump"))) + (func11_NewLine_Str()));
				func10_IndentDown();
				local8_Text_Str_1926 = ((local8_Text_Str_1926) + (func11_NewLine_Str()));
				func8_IndentUp();
				local8_Text_Str_1926 = ((((((((local8_Text_Str_1926) + ("case "))) + (CAST2STRING(global11_LoopBreakID)))) + (": //dummy repeat"))) + (func11_NewLine_Str()));
				global11_LoopBreakID = local6_TmpBID_1995;
				global14_LoopContinueID = local6_TmpCID_1996;
				
				__pc = 30018;
				break;
				
			case 8192: //dummy jumper1
				
				case 8288:
					local8_Text_Str_1926 = ((local8_Text_Str_1926) + ("do "));
					
				local8_Text_Str_1926 = ((local8_Text_Str_1926) + (func23_ConditionJSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
				local8_Text_Str_1926 = ((((((local8_Text_Str_1926) + (" while (!("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + ("))"));
				
				
			case 30018: //dummy jumper2
				;
					
				
				__pc = 29950;
				break;
				
			case 8189: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(27))) ? 1 : 0))) { __pc = 8315; break; }
				
				var local13_CheckComm_Str_1997 = "";
				case 8330:
					if (!(param4_expr.attr5_hasTo)) { __pc = 8321; break; }
				
				case 8325:
					local13_CheckComm_Str_1997 = "toCheck";
					
				
				__pc = 30019;
				break;
				
			case 8321: //dummy jumper1
				
				case 8329:
					local13_CheckComm_Str_1997 = "untilCheck";
					
				
				
			case 30019: //dummy jumper2
				;
					
				case 8594:
					if (!(global8_IsInGoto)) { __pc = 8332; break; }
				
				var local6_TmpBID_1998 = 0, local6_TmpCID_1999 = 0;
				case 8336:
					local6_TmpBID_1998 = global11_LoopBreakID;
					
				local6_TmpCID_1999 = global14_LoopContinueID;
				global11_LoopBreakID = param4_expr.attr8_stepExpr;
				global14_LoopContinueID = param4_expr.attr7_varExpr;
				local8_Text_Str_1926 = ((((local8_Text_Str_1926) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr7_varExpr).values[tmpPositionCache][0]))))) + (func11_NewLine_Str()));
				func10_IndentDown();
				local8_Text_Str_1926 = ((local8_Text_Str_1926) + (func11_NewLine_Str()));
				func8_IndentUp();
				local8_Text_Str_1926 = ((((((((local8_Text_Str_1926) + ("case "))) + (CAST2STRING(param4_expr.attr7_varExpr)))) + (": //dummy for1"))) + (func11_NewLine_Str()));
				local8_Text_Str_1926 = ((((((((((((((((((((((((local8_Text_Str_1926) + ("if (!"))) + (local13_CheckComm_Str_1997))) + ("("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(param4_expr.attr7_varExpr).values[tmpPositionCache][0].attr4_vari).values[tmpPositionCache][0]))))) + (", "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr6_toExpr).values[tmpPositionCache][0]))))) + (", "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_stepExpr).values[tmpPositionCache][0]))))) + (")) {__pc = "))) + (CAST2STRING(param4_expr.attr8_stepExpr)))) + ("; break;}"))) + (func11_NewLine_Str()));
				local8_Text_Str_1926 = ((local8_Text_Str_1926) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
				local8_Text_Str_1926 = ((((((((((local8_Text_Str_1926) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(param4_expr.attr7_varExpr).values[tmpPositionCache][0].attr4_vari).values[tmpPositionCache][0]))))) + (" += "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_stepExpr).values[tmpPositionCache][0]))))) + (";"))) + (func11_NewLine_Str()));
				local8_Text_Str_1926 = ((((((((local8_Text_Str_1926) + ("__pc = "))) + (CAST2STRING(param4_expr.attr7_varExpr)))) + ("; break; //back jump"))) + (func11_NewLine_Str()));
				func10_IndentDown();
				local8_Text_Str_1926 = ((local8_Text_Str_1926) + (func11_NewLine_Str()));
				func8_IndentUp();
				local8_Text_Str_1926 = ((((((((local8_Text_Str_1926) + ("case "))) + (CAST2STRING(param4_expr.attr8_stepExpr)))) + (": //dummy for"))) + (func11_NewLine_Str()));
				global11_LoopBreakID = local6_TmpBID_1998;
				global14_LoopContinueID = local6_TmpCID_1999;
				
				__pc = 30020;
				break;
				
			case 8332: //dummy jumper1
				
				case 8583:
					local8_Text_Str_1926 = ((((((((((((((((((((((((((((((local8_Text_Str_1926) + ("for ("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr7_varExpr).values[tmpPositionCache][0]))))) + (";"))) + (local13_CheckComm_Str_1997))) + ("("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(param4_expr.attr7_varExpr).values[tmpPositionCache][0].attr4_vari).values[tmpPositionCache][0]))))) + (", "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr6_toExpr).values[tmpPositionCache][0]))))) + (", "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_stepExpr).values[tmpPositionCache][0]))))) + (");"))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(param4_expr.attr7_varExpr).values[tmpPositionCache][0].attr4_vari).values[tmpPositionCache][0]))))) + (" += "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_stepExpr).values[tmpPositionCache][0]))))) + (") "));
					
				local8_Text_Str_1926 = ((local8_Text_Str_1926) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
				
				
			case 30020: //dummy jumper2
				;
					
				
				__pc = 29950;
				break;
				
			case 8315: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(38))) ? 1 : 0))) { __pc = 8596; break; }
				
				var local1_c_2000 = 0, local11_varName_Str_2001 = "", local13_StartText_Str_2002 = "", local12_CondText_Str_2003 = "", local11_IncText_Str_2004 = "", local13_EachBegin_Str_2005 = "", local11_EachEnd_Str_2006 = "";
				case 8602:
					global14_ForEachCounter = param4_expr.attr2_ID;
					
				local1_c_2000 = global14_ForEachCounter;
				local8_Text_Str_1926 = ((((((((((((local8_Text_Str_1926) + ("var forEachSaver"))) + (CAST2STRING(local1_c_2000)))) + (" = "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr6_inExpr).values[tmpPositionCache][0]))))) + (";"))) + (func11_NewLine_Str()));
				local11_varName_Str_2001 = func16_JSRemoveLast_Str(func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr7_varExpr).values[tmpPositionCache][0])), "[0]");
				local13_StartText_Str_2002 = (((("var forEachCounter") + (CAST2STRING(local1_c_2000)))) + (" = 0"));
				local12_CondText_Str_2003 = (((((((("forEachCounter") + (CAST2STRING(local1_c_2000)))) + (" < forEachSaver"))) + (CAST2STRING(local1_c_2000)))) + (".values.length"));
				local11_IncText_Str_2004 = (((("forEachCounter") + (CAST2STRING(local1_c_2000)))) + ("++"));
				local13_EachBegin_Str_2005 = (((((((((((((("var ") + (local11_varName_Str_2001))) + (" = forEachSaver"))) + (CAST2STRING(local1_c_2000)))) + (".values[forEachCounter"))) + (CAST2STRING(local1_c_2000)))) + ("];"))) + (func11_NewLine_Str()));
				local11_EachEnd_Str_2006 = (((((((((((((("forEachSaver") + (CAST2STRING(local1_c_2000)))) + (".values[forEachCounter"))) + (CAST2STRING(local1_c_2000)))) + ("] = "))) + (local11_varName_Str_2001))) + (";"))) + (func11_NewLine_Str()));
				case 8900:
					if (!(global8_IsInGoto)) { __pc = 8711; break; }
				
				var local6_TmpBID_2007 = 0, local6_TmpCID_2008 = 0;
				case 8715:
					local6_TmpBID_2007 = global11_LoopBreakID;
					
				local6_TmpCID_2008 = global14_LoopContinueID;
				global11_LoopBreakID = param4_expr.attr7_varExpr;
				global14_LoopContinueID = param4_expr.attr6_inExpr;
				local8_Text_Str_1926 = ((((local8_Text_Str_1926) + (local13_StartText_Str_2002))) + (func11_NewLine_Str()));
				func10_IndentDown();
				local8_Text_Str_1926 = ((local8_Text_Str_1926) + (func11_NewLine_Str()));
				func8_IndentUp();
				local8_Text_Str_1926 = ((((((((local8_Text_Str_1926) + ("case "))) + (CAST2STRING(param4_expr.attr6_inExpr)))) + (": //dummy for1"))) + (func11_NewLine_Str()));
				local8_Text_Str_1926 = ((((((((((((local8_Text_Str_1926) + ("if (!("))) + (local12_CondText_Str_2003))) + (")) {__pc = "))) + (CAST2STRING(param4_expr.attr7_varExpr)))) + ("; break;}"))) + (func11_NewLine_Str()));
				local8_Text_Str_1926 = ((((local8_Text_Str_1926) + (local13_EachBegin_Str_2005))) + (func11_NewLine_Str()));
				local8_Text_Str_1926 = ((local8_Text_Str_1926) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
				local8_Text_Str_1926 = ((((local8_Text_Str_1926) + (local11_EachEnd_Str_2006))) + (func11_NewLine_Str()));
				local8_Text_Str_1926 = ((((local8_Text_Str_1926) + (local11_IncText_Str_2004))) + (func11_NewLine_Str()));
				local8_Text_Str_1926 = ((((((((local8_Text_Str_1926) + ("__pc = "))) + (CAST2STRING(param4_expr.attr6_inExpr)))) + ("; break; //back jump"))) + (func11_NewLine_Str()));
				func10_IndentDown();
				local8_Text_Str_1926 = ((local8_Text_Str_1926) + (func11_NewLine_Str()));
				func8_IndentUp();
				local8_Text_Str_1926 = ((((((((local8_Text_Str_1926) + ("case "))) + (CAST2STRING(param4_expr.attr7_varExpr)))) + (": //dummy for"))) + (func11_NewLine_Str()));
				global11_LoopBreakID = local6_TmpBID_2007;
				global14_LoopContinueID = local6_TmpCID_2008;
				
				__pc = 30021;
				break;
				
			case 8711: //dummy jumper1
				
				case 8850:
					func8_IndentUp();
					
				local8_Text_Str_1926 = ((((((((((((((((local8_Text_Str_1926) + ("for("))) + (local13_StartText_Str_2002))) + (" ; "))) + (local12_CondText_Str_2003))) + (" ; "))) + (local11_IncText_Str_2004))) + (") {"))) + (func11_NewLine_Str()));
				local8_Text_Str_1926 = ((local8_Text_Str_1926) + (local13_EachBegin_Str_2005));
				local8_Text_Str_1926 = ((((local8_Text_Str_1926) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))))) + (func11_NewLine_Str()));
				local8_Text_Str_1926 = ((local8_Text_Str_1926) + (local11_EachEnd_Str_2006));
				func10_IndentDown();
				local8_Text_Str_1926 = ((((local8_Text_Str_1926) + (func11_NewLine_Str()))) + ("}"));
				
				
			case 30021: //dummy jumper2
				;
					
				
				__pc = 29950;
				break;
				
			case 8596: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(30))) ? 1 : 0))) { __pc = 8902; break; }
				
				case 8923:
					if (!(global8_IsInGoto)) { __pc = 8905; break; }
				
				case 8916:
					local8_Text_Str_1926 = ((((((local8_Text_Str_1926) + ("__pc = "))) + (CAST2STRING(global14_LoopContinueID)))) + ("; break"));
					
				
				__pc = 30022;
				break;
				
			case 8905: //dummy jumper1
				
				case 8922:
					local8_Text_Str_1926 = ((local8_Text_Str_1926) + ("continue"));
					
				
				
			case 30022: //dummy jumper2
				;
					
				
				__pc = 29950;
				break;
				
			case 8902: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(29))) ? 1 : 0))) { __pc = 8925; break; }
				
				case 8946:
					if (!(global8_IsInGoto)) { __pc = 8928; break; }
				
				case 8939:
					local8_Text_Str_1926 = ((((((local8_Text_Str_1926) + ("__pc = "))) + (CAST2STRING(global11_LoopBreakID)))) + ("; break"));
					
				
				__pc = 30023;
				break;
				
			case 8928: //dummy jumper1
				
				case 8945:
					local8_Text_Str_1926 = ((local8_Text_Str_1926) + ("break"));
					
				
				
			case 30023: //dummy jumper2
				;
					
				
				__pc = 29950;
				break;
				
			case 8925: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(31))) ? 1 : 0))) { __pc = 8948; break; }
				
				var local9_oIsInGoto_2009 = 0;
				case 8952:
					local9_oIsInGoto_2009 = global8_IsInGoto;
					
				global8_IsInGoto = 0;
				local8_Text_Str_1926 = ((local8_Text_Str_1926) + ("try "));
				local8_Text_Str_1926 = ((local8_Text_Str_1926) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
				func8_IndentUp();
				local8_Text_Str_1926 = ((((((((local8_Text_Str_1926) + (" catch ("))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_Name_Str))) + (") {"))) + (func11_NewLine_Str()));
				local8_Text_Str_1926 = ((((((((((((((((((local8_Text_Str_1926) + ("if ("))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_Name_Str))) + (" instanceof OTTException) "))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_Name_Str))) + (" = "))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_Name_Str))) + (".getText(); else throwError("))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_Name_Str))) + (");"));
				local8_Text_Str_1926 = ((local8_Text_Str_1926) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_catchScp).values[tmpPositionCache][0]))));
				func10_IndentDown();
				local8_Text_Str_1926 = ((((local8_Text_Str_1926) + (func11_NewLine_Str()))) + ("}"));
				global8_IsInGoto = local9_oIsInGoto_2009;
				
				__pc = 29950;
				break;
				
			case 8948: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(32))) ? 1 : 0))) { __pc = 9068; break; }
				
				case 9108:
					local8_Text_Str_1926 = ((((((((((((((local8_Text_Str_1926) + ("throw new OTTException("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (", \""))) + (global8_Compiler.attr6_Tokens.arrAccess(param4_expr.attr5_tokID).values[tmpPositionCache].attr8_Path_Str))) + ("\", "))) + (CAST2STRING(global8_Compiler.attr6_Tokens.arrAccess(param4_expr.attr5_tokID).values[tmpPositionCache].attr4_Line)))) + (")"));
					
				
				__pc = 29950;
				break;
				
			case 9068: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(33))) ? 1 : 0))) { __pc = 9110; break; }
				
				case 9122:
					local8_Text_Str_1926 = ((((((local8_Text_Str_1926) + ("RESTORE(datablock_"))) + (param4_expr.attr8_Name_Str))) + (")"));
					
				
				__pc = 29950;
				break;
				
			case 9110: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(34))) ? 1 : 0))) { __pc = 9124; break; }
				
				var local1_i_2010 = 0.0;
				case 9129:
					local1_i_2010 = 0;
					
				case 9172:
					var forEachSaver9172 = param4_expr.attr5_Reads;
				var forEachCounter9172 = 0
				
			case 9136: //dummy for1
				if (!(forEachCounter9172 < forEachSaver9172.values.length)) {__pc = 9132; break;}
				var local1_R_2011 = forEachSaver9172.values[forEachCounter9172];
				
				
				case 9147:
					local8_Text_Str_1926 = ((((local8_Text_Str_1926) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local1_R_2011).values[tmpPositionCache][0]))))) + (" = READ()"));
					
				case 9168:
					if (!((((local1_i_2010) < (((BOUNDS(param4_expr.attr5_Reads, 0)) - (1)))) ? 1 : 0))) { __pc = 9159; break; }
				
				case 9167:
					local8_Text_Str_1926 = ((((local8_Text_Str_1926) + (";"))) + (func11_NewLine_Str()));
					
				
				
			case 9159: //dummy jumper1
				;
					
				local1_i_2010+=1;
				
				forEachSaver9172.values[forEachCounter9172] = local1_R_2011;
				
				forEachCounter9172++
				__pc = 9136; break; //back jump
				
			case 9132: //dummy for
				;
					
				
				__pc = 29950;
				break;
				
			case 9124: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(35))) ? 1 : 0))) { __pc = 9174; break; }
				
				case 9185:
					local8_Text_Str_1926 = ((local8_Text_Str_1926) + (func21_JSGetDefaultValue_Str(param4_expr.attr8_datatype, 0, 0)));
					
				
				__pc = 29950;
				break;
				
			case 9174: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(36))) ? 1 : 0))) { __pc = 9187; break; }
				
				var local7_def_Str_2012 = "", local4_Find_2013 = 0;
				case 9196:
					local7_def_Str_2012 = func21_JSGetDefaultValue_Str(param4_expr.attr8_datatype, 1, 1);
					
				local8_Text_Str_1926 = ((((((local8_Text_Str_1926) + ("DIM(pool_array.alloc("))) + (local7_def_Str_2012))) + ("), ["));
				local4_Find_2013 = 0;
				case 9241:
					var forEachSaver9241 = param4_expr.attr4_dims;
				var forEachCounter9241 = 0
				
			case 9217: //dummy for1
				if (!(forEachCounter9241 < forEachSaver9241.values.length)) {__pc = 9213; break;}
				var local1_D_2014 = forEachSaver9241.values[forEachCounter9241];
				
				
				case 9229:
					if (!((((local4_Find_2013) === (1)) ? 1 : 0))) { __pc = 9222; break; }
				
				case 9228:
					local8_Text_Str_1926 = ((local8_Text_Str_1926) + (", "));
					
				
				
			case 9222: //dummy jumper1
				;
					
				local8_Text_Str_1926 = ((local8_Text_Str_1926) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local1_D_2014).values[tmpPositionCache][0]))));
				local4_Find_2013 = 1;
				
				forEachSaver9241.values[forEachCounter9241] = local1_D_2014;
				
				forEachCounter9241++
				__pc = 9217; break; //back jump
				
			case 9213: //dummy for
				;
					
				local8_Text_Str_1926 = ((((((local8_Text_Str_1926) + ("], "))) + (local7_def_Str_2012))) + (")"));
				
				__pc = 29950;
				break;
				
			case 9187: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(37))) ? 1 : 0))) { __pc = 9252; break; }
				
				case 9268:
					local8_Text_Str_1926 = ((((local8_Text_Str_1926) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_Name_Str))) + (" = "));
					
				case 9324:
					if (!((((global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr3_Typ) === (54)) ? 1 : 0))) { __pc = 9278; break; }
				
				case 9311:
					local8_Text_Str_1926 = ((((((((((local8_Text_Str_1926) + ("castobj("))) + (func16_JSRemoveLast_Str(func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr4_expr).values[tmpPositionCache][0])), "[0]")))) + (", "))) + (func18_ChangeTypeName_Str(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str)))) + (")"));
					
				
				__pc = 30026;
				break;
				
			case 9278: //dummy jumper1
				
				case 9323:
					local8_Text_Str_1926 = ((local8_Text_Str_1926) + (func16_JSRemoveLast_Str(func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0])), "[0]")));
					
				
				
			case 30026: //dummy jumper2
				;
					
				local8_Text_Str_1926 = ((local8_Text_Str_1926) + (" /* ALIAS */"));
				
				__pc = 29950;
				break;
				
			case 9252: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(20))) ? 1 : 0))) { __pc = 9331; break; }
				
				case 9343:
					local8_Text_Str_1926 = ((((((local8_Text_Str_1926) + ("__pc = __labels[\""))) + (param4_expr.attr8_Name_Str))) + ("\"]; break"));
					
				
				__pc = 29950;
				break;
				
			case 9331: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(21))) ? 1 : 0))) { __pc = 9345; break; }
				
				case 9364:
					global12_LabelDef_Str = ((((((((((global12_LabelDef_Str) + ("\""))) + (param4_expr.attr8_Name_Str))) + ("\": "))) + (CAST2STRING(param4_expr.attr2_ID)))) + (", "));
					
				local8_Text_Str_1926 = ((((local8_Text_Str_1926) + ("//label: "))) + (param4_expr.attr8_Name_Str));
				
				__pc = 29950;
				break;
				
			case 9345: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(39))) ? 1 : 0))) { __pc = 9375; break; }
				
				case 9395:
					local8_Text_Str_1926 = ((((((local8_Text_Str_1926) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0]))))) + ("+="))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))));
					
				
				__pc = 29950;
				break;
				
			case 9375: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(40))) ? 1 : 0))) { __pc = 9397; break; }
				
				case 9422:
					local8_Text_Str_1926 = ((((((((((local8_Text_Str_1926) + ("DIMPUSH("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0]))))) + (", "))) + (func16_JSRemoveLast_Str(func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0])), "[0]")))) + (")"));
					
				
				__pc = 29950;
				break;
				
			case 9397: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(41))) ? 1 : 0))) { __pc = 9424; break; }
				
				case 9473:
					if (!((((param4_expr.attr4_kern) !== (-(1))) ? 1 : 0))) { __pc = 9433; break; }
				
				case 9457:
					local8_Text_Str_1926 = ((((((((((local8_Text_Str_1926) + ("KERNLEN("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (", "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_kern).values[tmpPositionCache][0]))))) + (")"));
					
				
				__pc = 30027;
				break;
				
			case 9433: //dummy jumper1
				
				case 9472:
					local8_Text_Str_1926 = ((((((local8_Text_Str_1926) + ("("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (").length"));
					
				
				
			case 30027: //dummy jumper2
				;
					
				
				__pc = 29950;
				break;
				
			case 9424: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(45))) ? 1 : 0))) { __pc = 9475; break; }
				
				case 9499:
					local8_Text_Str_1926 = ((((((((((local8_Text_Str_1926) + ("BOUNDS("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_array).values[tmpPositionCache][0]))))) + (", "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_position).values[tmpPositionCache][0]))))) + (")"));
					
				
				__pc = 29950;
				break;
				
			case 9475: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(42))) ? 1 : 0))) { __pc = 9501; break; }
				
				var local4_Find_2015 = 0;
				case 9516:
					local8_Text_Str_1926 = ((((((local8_Text_Str_1926) + ("DIMDATA("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_array).values[tmpPositionCache][0]))))) + (", ["));
					
				case 9545:
					var forEachSaver9545 = param4_expr.attr5_Exprs;
				var forEachCounter9545 = 0
				
			case 9523: //dummy for1
				if (!(forEachCounter9545 < forEachSaver9545.values.length)) {__pc = 9519; break;}
				var local4_Elem_2016 = forEachSaver9545.values[forEachCounter9545];
				
				
				case 9533:
					if (!(local4_Find_2015)) { __pc = 9526; break; }
				
				case 9532:
					local8_Text_Str_1926 = ((local8_Text_Str_1926) + (", "));
					
				
				
			case 9526: //dummy jumper1
				;
					
				local8_Text_Str_1926 = ((local8_Text_Str_1926) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local4_Elem_2016).values[tmpPositionCache][0]))));
				local4_Find_2015 = 1;
				
				forEachSaver9545.values[forEachCounter9545] = local4_Elem_2016;
				
				forEachCounter9545++
				__pc = 9523; break; //back jump
				
			case 9519: //dummy for
				;
					
				local8_Text_Str_1926 = ((local8_Text_Str_1926) + ("])"));
				
				__pc = 29950;
				break;
				
			case 9501: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(43))) ? 1 : 0))) { __pc = 9552; break; }
				
				case 9581:
					local8_Text_Str_1926 = ((((((((((((((((local8_Text_Str_1926) + ("forEachSaver"))) + (CAST2STRING(global14_ForEachCounter)))) + (".values[forEachCounter"))) + (CAST2STRING(global14_ForEachCounter)))) + ("] = "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(global14_ForEachCounter).values[tmpPositionCache][0].attr7_varExpr).values[tmpPositionCache][0]))))) + (";"))) + (func11_NewLine_Str()));
					
				local8_Text_Str_1926 = ((((((((((((local8_Text_Str_1926) + ("DIMDEL(forEachSaver"))) + (CAST2STRING(global14_ForEachCounter)))) + (", forEachCounter"))) + (CAST2STRING(global14_ForEachCounter)))) + (");"))) + (func11_NewLine_Str()));
				local8_Text_Str_1926 = ((((((((local8_Text_Str_1926) + ("forEachCounter"))) + (CAST2STRING(global14_ForEachCounter)))) + ("--;"))) + (func11_NewLine_Str()));
				local8_Text_Str_1926 = ((local8_Text_Str_1926) + ("continue"));
				
				__pc = 29950;
				break;
				
			case 9552: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(44))) ? 1 : 0))) { __pc = 9617; break; }
				
				case 9641:
					local8_Text_Str_1926 = ((((((((((local8_Text_Str_1926) + ("DIMDEL("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_array).values[tmpPositionCache][0]))))) + (", "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_position).values[tmpPositionCache][0]))))) + (")"));
					
				
				__pc = 29950;
				break;
				
			case 9617: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(46))) ? 1 : 0))) { __pc = 9643; break; }
				
				case 9658:
					local8_Text_Str_1926 = ((((((local8_Text_Str_1926) + ("(("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (") ? 0 : 1)"));
					
				
				__pc = 29950;
				break;
				
			case 9643: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(48))) ? 1 : 0))) { __pc = 9660; break; }
				
				case 9674:
					local8_Text_Str_1926 = ((local8_Text_Str_1926) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_expr.attr4_func).values[tmpPositionCache][0].attr8_Name_Str));
					
				
				__pc = 29950;
				break;
				
			case 9660: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(49))) ? 1 : 0))) { __pc = 9676; break; }
				
				var local8_Cond_Str_2017 = "";
				case 9685:
					local8_Cond_Str_2017 = func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]));
					
				local8_Text_Str_1926 = ((((((((((local8_Text_Str_1926) + ("if (!("))) + (local8_Cond_Str_2017))) + (")) throwError(\"AssertException "))) + (REPLACE_Str(local8_Cond_Str_2017, "\"", "'")))) + ("\")"));
				
				__pc = 29950;
				break;
				
			case 9676: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(50))) ? 1 : 0))) { __pc = 9704; break; }
				
				case 9719:
					local8_Text_Str_1926 = ((((((local8_Text_Str_1926) + ("DEBUG("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")"));
					
				
				__pc = 29950;
				break;
				
			case 9704: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(51))) ? 1 : 0))) { __pc = 9721; break; }
				
				case 9758:
					local8_Text_Str_1926 = ((((((((((((((local8_Text_Str_1926) + ("(("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr10_Conditions.arrAccess(0).values[tmpPositionCache]).values[tmpPositionCache][0]))))) + (") ? ("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr6_Scopes.arrAccess(0).values[tmpPositionCache]).values[tmpPositionCache][0]))))) + (") : ("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr9_elseScope).values[tmpPositionCache][0]))))) + ("))"));
					
				
				__pc = 29950;
				break;
				
			case 9721: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(52))) ? 1 : 0))) { __pc = 9760; break; }
				
				case 9772:
					local8_Text_Str_1926 = ((((((local8_Text_Str_1926) + ("//REQUIRE: "))) + (param4_expr.attr8_Name_Str))) + ("\n"));
					
				local8_Text_Str_1926 = ((((local8_Text_Str_1926) + (param4_expr.attr11_Content_Str))) + (func11_NewLine_Str()));
				local8_Text_Str_1926 = ((((((local8_Text_Str_1926) + ("//ENDREQUIRE: "))) + (param4_expr.attr8_Name_Str))) + (func11_NewLine_Str()));
				
				__pc = 29950;
				break;
				
			case 9760: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(53))) ? 1 : 0))) { __pc = 9794; break; }
				
				var local5_Found_2018 = 0, local3_Scp_2019 = 0;
				case 9799:
					local5_Found_2018 = 0;
					
				local3_Scp_2019 = global12_CurrentScope;
				case 9884:
					if (!((((((((((local3_Scp_2019) !== (-(1))) ? 1 : 0)) && (((((((((global5_Exprs_ref[0].arrAccess(local3_Scp_2019).values[tmpPositionCache][0].attr6_ScpTyp) === (2)) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(local3_Scp_2019).values[tmpPositionCache][0].attr6_ScpTyp) === (4)) ? 1 : 0))) ? 1 : 0)) ? 0 : 1))) ? 1 : 0)) && (((local5_Found_2018) ? 0 : 1))) ? 1 : 0))) {__pc = 30029; break;}
				
				var local5_Varis_2020 = pool_array.alloc(0);
				case 9840:
					func8_GetVaris(unref(local5_Varis_2020), local3_Scp_2019, 0);
					
				case 9876:
					var forEachSaver9876 = local5_Varis_2020;
				var forEachCounter9876 = 0
				
			case 9844: //dummy for1
				if (!(forEachCounter9876 < forEachSaver9876.values.length)) {__pc = 9842; break;}
				var local1_V_2021 = forEachSaver9876.values[forEachCounter9876];
				
				
				var alias3_Var_ref_2022 = [pool_TIdentifierVari.alloc()];
				case 9851:
					alias3_Var_ref_2022 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_V_2021).values[tmpPositionCache] /* ALIAS */;
					
				case 9875:
					if (!((((alias3_Var_ref_2022[0].attr8_Name_Str) === ((("param4_self_") + (CAST2STRING(alias3_Var_ref_2022[0].attr2_ID))))) ? 1 : 0))) { __pc = 9862; break; }
				
				case 9870:
					local8_Text_Str_1926 = ((local8_Text_Str_1926) + (alias3_Var_ref_2022[0].attr8_Name_Str));
					
				local5_Found_2018 = 1;
				case 9874:
					__pc = 9842; break;
					
				
				
			case 9862: //dummy jumper1
				;
					
				pool_TIdentifierVari.free(alias3_Var_ref_2022);
				forEachSaver9876.values[forEachCounter9876] = local1_V_2021;
				
				forEachCounter9876++
				__pc = 9844; break; //back jump
				
			case 9842: //dummy for
				;
					
				local3_Scp_2019 = global5_Exprs_ref[0].arrAccess(local3_Scp_2019).values[tmpPositionCache][0].attr10_SuperScope;
				pool_array.free(local5_Varis_2020);
				__pc = 9884; break; //back jump
				
			case 30029:
				;
					
				case 9893:
					if (!(((local5_Found_2018) ? 0 : 1))) { __pc = 9887; break; }
				
				case 9892:
					func5_Error("Self not found for super", 1149, "src\CompilerPasses\Generator\JSGenerator.gbas");
					
				
				
			case 9887: //dummy jumper1
				;
					
				
				__pc = 29950;
				break;
				
			case 9794: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(54))) ? 1 : 0))) { __pc = 9895; break; }
				
				case 9919:
					local8_Text_Str_1926 = ((((((((((local8_Text_Str_1926) + ("castobj("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (", "))) + (func18_ChangeTypeName_Str(param4_expr.attr8_datatype.attr8_Name_Str)))) + (")"));
					
				
				__pc = 29950;
				break;
				
			case 9895: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(7))) ? 1 : 0))) { __pc = 9921; break; }
				
				
				__pc = 29950;
				break;
				
			case 9921: //dummy jumper1
				if (!((((local16___SelectHelper4__1927) === (~~(8))) ? 1 : 0))) { __pc = 9924; break; }
				
				case 9929:
					func5_Error("Invalid Expression", 1155, "src\CompilerPasses\Generator\JSGenerator.gbas");
					
				
				__pc = 29950;
				break;
				
			case 9924: //dummy jumper1
				
				case 9939:
					func5_Error((("Unknown expression type: ") + (CAST2STRING(param4_expr.attr3_Typ))), 1157, "src\CompilerPasses\Generator\JSGenerator.gbas");
					
				
				
			case 29950: //dummy jumper2
				;
					
				
				;
			return tryClone(local8_Text_Str_1926);
			return "";
			__pc = -1; break;
			default:
				throwError("Gotocounter exception pc: "+__pc);
			
		}
	}
};
func14_JSGenerate_Str = window['func14_JSGenerate_Str'];
window['func14_JSTryUnref_Str'] = function(param1_E) {
	if (func11_JSDoesUnref(param1_E)) {
		return tryClone((((("unref(") + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param1_E).values[tmpPositionCache][0]))))) + (")")));
		
	} else {
		return tryClone(func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param1_E).values[tmpPositionCache][0])));
		
	};
	return "";
	
};
func14_JSTryUnref_Str = window['func14_JSTryUnref_Str'];
window['func11_JSDoesUnref'] = function(param4_Expr) {
	var local5_unref_2025 = 0;
	local5_unref_2025 = 1;
	if (((global5_Exprs_ref[0].arrAccess(param4_Expr).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) ? 0 : 1)) {
		{
			var local17___SelectHelper10__2026 = 0;
			local17___SelectHelper10__2026 = global5_Exprs_ref[0].arrAccess(param4_Expr).values[tmpPositionCache][0].attr3_Typ;
			if ((((local17___SelectHelper10__2026) === (~~(3))) ? 1 : 0)) {
				local5_unref_2025 = 0;
				
			} else if ((((local17___SelectHelper10__2026) === (~~(4))) ? 1 : 0)) {
				local5_unref_2025 = 0;
				
			} else if ((((local17___SelectHelper10__2026) === (~~(5))) ? 1 : 0)) {
				local5_unref_2025 = 0;
				
			} else if ((((local17___SelectHelper10__2026) === (~~(15))) ? 1 : 0)) {
				local5_unref_2025 = func11_JSDoesUnref(global5_Exprs_ref[0].arrAccess(param4_Expr).values[tmpPositionCache][0].attr4_expr);
				
			} else if ((((local17___SelectHelper10__2026) === (~~(16))) ? 1 : 0)) {
				local5_unref_2025 = func11_JSDoesUnref(global5_Exprs_ref[0].arrAccess(param4_Expr).values[tmpPositionCache][0].attr4_expr);
				
			} else if ((((local17___SelectHelper10__2026) === (~~(17))) ? 1 : 0)) {
				local5_unref_2025 = func11_JSDoesUnref(global5_Exprs_ref[0].arrAccess(param4_Expr).values[tmpPositionCache][0].attr4_expr);
				
			} else if ((((local17___SelectHelper10__2026) === (~~(1))) ? 1 : 0)) {
				local5_unref_2025 = 0;
				
			} else if ((((local17___SelectHelper10__2026) === (~~(6))) ? 1 : 0)) {
				local5_unref_2025 = 0;
				
			} else if ((((local17___SelectHelper10__2026) === (~~(23))) ? 1 : 0)) {
				local5_unref_2025 = 0;
				
			} else if ((((local17___SelectHelper10__2026) === (~~(45))) ? 1 : 0)) {
				local5_unref_2025 = 0;
				
			} else if ((((local17___SelectHelper10__2026) === (~~(41))) ? 1 : 0)) {
				local5_unref_2025 = 0;
				
			} else {
				var local1_v_2027 = 0;
				local1_v_2027 = func11_GetVariable(param4_Expr, 0);
				if ((((local1_v_2027) !== (-(1))) ? 1 : 0)) {
					if (((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_v_2027).values[tmpPositionCache][0].attr3_ref) ? 0 : 1)) {
						local5_unref_2025 = 0;
						
					};
					
				};
				
			};
			
		};
		
	};
	return tryClone(local5_unref_2025);
	return 0;
	
};
func11_JSDoesUnref = window['func11_JSDoesUnref'];
window['func17_JSDoParameter_Str'] = function(param4_expr, param4_func, param7_DoParam) {
	var local8_Text_Str_2031 = "", local1_i_2032 = 0.0;
	if (param7_DoParam) {
		local8_Text_Str_2031 = "(";
		
	};
	local1_i_2032 = 0;
	var forEachSaver10234 = param4_expr.attr6_Params;
	for(var forEachCounter10234 = 0 ; forEachCounter10234 < forEachSaver10234.values.length ; forEachCounter10234++) {
		var local5_param_2033 = forEachSaver10234.values[forEachCounter10234];
	{
			if ((((((((((param4_func) !== (-(1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr3_Typ) === (3)) ? 1 : 0))) ? 1 : 0)) && ((((local1_i_2032) === (((BOUNDS(param4_expr.attr6_Params, 0)) - (1)))) ? 1 : 0))) ? 1 : 0)) {
				break;
				
			};
			if (local1_i_2032) {
				local8_Text_Str_2031 = ((local8_Text_Str_2031) + (", "));
				
			};
			if ((((((((((param4_func) !== (-(1))) ? 1 : 0)) && (((global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr15_UsedAsPrototype) ? 0 : 1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_i_2032)).values[tmpPositionCache]).values[tmpPositionCache][0].attr3_ref) === (0)) ? 1 : 0))) ? 1 : 0)) {
				local8_Text_Str_2031 = ((local8_Text_Str_2031) + (func14_JSTryUnref_Str(local5_param_2033)));
				
			} else {
				local8_Text_Str_2031 = ((local8_Text_Str_2031) + (func16_JSRemoveLast_Str(func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local5_param_2033).values[tmpPositionCache][0])), "[0]")));
				
			};
			local1_i_2032+=1;
			
		}
		forEachSaver10234.values[forEachCounter10234] = local5_param_2033;
	
	};
	if (param7_DoParam) {
		local8_Text_Str_2031 = ((local8_Text_Str_2031) + (")"));
		
	};
	return tryClone(local8_Text_Str_2031);
	return "";
	
};
func17_JSDoParameter_Str = window['func17_JSDoParameter_Str'];
window['func13_JSVariDef_Str'] = function(param5_Varis, param12_ForceDefault, param8_NoStatic, param7_InitVal) {
	var local8_Text_Str_2038 = "", local4_Find_2039 = 0.0;
	local8_Text_Str_2038 = "";
	local4_Find_2039 = 0;
	var forEachSaver10388 = param5_Varis;
	for(var forEachCounter10388 = 0 ; forEachCounter10388 < forEachSaver10388.values.length ; forEachCounter10388++) {
		var local3_Var_2040 = forEachSaver10388.values[forEachCounter10388];
	{
			if ((((((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2040).values[tmpPositionCache][0].attr3_Typ) !== (5)) ? 1 : 0)) && (((((((param8_NoStatic) === (0)) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2040).values[tmpPositionCache][0].attr3_Typ) !== (4)) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) && (func17_JSShouldRedeclare(local3_Var_2040))) ? 1 : 0)) {
				if (local4_Find_2039) {
					local8_Text_Str_2038 = ((local8_Text_Str_2038) + (", "));
					
				};
				local8_Text_Str_2038 = ((local8_Text_Str_2038) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2040).values[tmpPositionCache][0].attr8_Name_Str));
				if (param7_InitVal) {
					local8_Text_Str_2038 = ((local8_Text_Str_2038) + (" = "));
					if (((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2040).values[tmpPositionCache][0].attr6_PreDef) !== (-(1))) ? 1 : 0)) && (((((((param12_ForceDefault) === (0)) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2040).values[tmpPositionCache][0].attr3_Typ) === (6)) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) {
						local8_Text_Str_2038 = ((local8_Text_Str_2038) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2040).values[tmpPositionCache][0].attr6_PreDef).values[tmpPositionCache][0]))));
						
					} else {
						local8_Text_Str_2038 = ((local8_Text_Str_2038) + (func21_JSGetDefaultValue_Str(global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2040).values[tmpPositionCache][0].attr8_datatype, global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2040).values[tmpPositionCache][0].attr3_ref, 0)));
						
					};
					
				};
				local4_Find_2039 = 1;
				
			};
			
		}
		forEachSaver10388.values[forEachCounter10388] = local3_Var_2040;
	
	};
	return tryClone(local8_Text_Str_2038);
	return "";
	pool_array.free(param5_Varis);
};
func13_JSVariDef_Str = window['func13_JSVariDef_Str'];
window['func23_ConditionJSGenerate_Str'] = function(param4_expr) {
	if ((((param4_expr.attr3_Typ) === (16)) ? 1 : 0)) {
		return tryClone(func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0])));
		
	} else {
		return tryClone(func14_JSGenerate_Str(param4_expr));
		
	};
	return "";
	
};
func23_ConditionJSGenerate_Str = window['func23_ConditionJSGenerate_Str'];
window['func17_JSShouldRedeclare'] = function(param3_Var) {
	if ((((global11_CurrentFunc) !== (-(1))) ? 1 : 0)) {
		var forEachSaver10443 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr10_CopyParams;
		for(var forEachCounter10443 = 0 ; forEachCounter10443 < forEachSaver10443.values.length ; forEachCounter10443++) {
			var local1_P_2043 = forEachSaver10443.values[forEachCounter10443];
		{
				if ((((local1_P_2043) === (param3_Var)) ? 1 : 0)) {
					return tryClone(0);
					
				};
				
			}
			forEachSaver10443.values[forEachCounter10443] = local1_P_2043;
		
		};
		
	};
	return 1;
	return 0;
	
};
func17_JSShouldRedeclare = window['func17_JSShouldRedeclare'];
window['func21_JSGetDefaultValue_Str'] = function(param8_datatype, param3_Ref, param11_IgnoreArray) {
	var local10_RetVal_Str_2047 = "";
	local10_RetVal_Str_2047 = "";
	if ((((param8_datatype.attr7_IsArray) && ((((param11_IgnoreArray) === (0)) ? 1 : 0))) ? 1 : 0)) {
		local10_RetVal_Str_2047 = (((("pool_array.alloc(") + (func21_JSGetDefaultValue_Str(param8_datatype, param3_Ref, 1)))) + (")"));
		
	} else {
		{
			var local17___SelectHelper11__2048 = "";
			local17___SelectHelper11__2048 = param8_datatype.attr8_Name_Str;
			if ((((local17___SelectHelper11__2048) === ("int")) ? 1 : 0)) {
				local10_RetVal_Str_2047 = "0";
				
			} else if ((((local17___SelectHelper11__2048) === ("float")) ? 1 : 0)) {
				local10_RetVal_Str_2047 = "0.0";
				
			} else if ((((local17___SelectHelper11__2048) === ("string")) ? 1 : 0)) {
				local10_RetVal_Str_2047 = "\"\"";
				
			} else {
				if (func6_IsType(param8_datatype.attr8_Name_Str)) {
					local10_RetVal_Str_2047 = (((("pool_") + (param8_datatype.attr8_Name_Str))) + (".alloc()"));
					
				} else {
					local10_RetVal_Str_2047 = REPLACE_Str(param8_datatype.attr8_Name_Str, "$", "_Str");
					
				};
				
			};
			
		};
		
	};
	if (param3_Ref) {
		local10_RetVal_Str_2047 = (((("[") + (local10_RetVal_Str_2047))) + ("]"));
		
	};
	return tryClone(local10_RetVal_Str_2047);
	return "";
	
};
func21_JSGetDefaultValue_Str = window['func21_JSGetDefaultValue_Str'];
window['func16_JSRemoveLast_Str'] = function(param8_Text_Str, param5_L_Str) {
	if ((((((((param8_Text_Str).length) > ((param5_L_Str).length)) ? 1 : 0)) && ((((RIGHT_Str(param8_Text_Str, (param5_L_Str).length)) === (param5_L_Str)) ? 1 : 0))) ? 1 : 0)) {
		param8_Text_Str = LEFT_Str(param8_Text_Str, (((param8_Text_Str).length) - ((param5_L_Str).length)));
		
	};
	return tryClone(param8_Text_Str);
	return "";
	
};
func16_JSRemoveLast_Str = window['func16_JSRemoveLast_Str'];
window['func5_Lexer'] = function() {
	var local12_Splitter_Str_2051 = pool_array.alloc(""), local11_SplitterMap_2052 = pool_HashMap.alloc(), local9_LastFound_2054 = 0, local4_Line_2055 = 0, local15_LineContent_Str_2056 = "", local18_NewLineContent_Str_2057 = "", local8_Path_Str_2058 = "", local9_Character_2059 = 0, local5_WasNL_2073 = 0, local6_WasRem_2074 = 0, local6_HasDel_2075 = 0, local1_i_2079 = 0.0;
	REDIM(global8_Compiler.attr6_Tokens, [0], pool_TToken.alloc() );
	global8_Compiler.attr11_LastTokenID = 0;
	DIMDATA(local12_Splitter_Str_2051, [" ", "\t", "\n", "-", "+", "*", "/", "^", ",", "=", "<", ">", "|", "&", "[", "]", "(", ")", "!", "\"", "?", ";", ".", ":", CHR_Str(8), CHR_Str(12), "\r", "\f"]);
	(local11_SplitterMap_2052).SetSize(((BOUNDS(local12_Splitter_Str_2051, 0)) * (8)));
	var forEachSaver10635 = local12_Splitter_Str_2051;
	for(var forEachCounter10635 = 0 ; forEachCounter10635 < forEachSaver10635.values.length ; forEachCounter10635++) {
		var local9_Split_Str_2053 = forEachSaver10635.values[forEachCounter10635];
	{
			(local11_SplitterMap_2052).Put(local9_Split_Str_2053, 1);
			
		}
		forEachSaver10635.values[forEachCounter10635] = local9_Split_Str_2053;
	
	};
	global8_Compiler.attr8_Code_Str = (("\n") + (global8_Compiler.attr8_Code_Str));
	{
		var local1_i_2060 = 0;
		for (local1_i_2060 = 0;toCheck(local1_i_2060, (((global8_Compiler.attr8_Code_Str).length) - (1)), 1);local1_i_2060 += 1) {
			var local14_DoubleChar_Str_2061 = "", local11_curChar_Str_2064 = "", local15_TmpLineCont_Str_2065 = "";
			local9_Character_2059+=1;
			if ((((local1_i_2060) < ((((global8_Compiler.attr8_Code_Str).length) - (2)))) ? 1 : 0)) {
				local14_DoubleChar_Str_2061 = MID_Str(global8_Compiler.attr8_Code_Str, local1_i_2060, 2);
				
			};
			if ((((local14_DoubleChar_Str_2061) === ("//")) ? 1 : 0)) {
				var local8_Text_Str_2062 = "", local3_Pos_2063 = 0;
				local8_Text_Str_2062 = MID_Str(global8_Compiler.attr8_Code_Str, local9_LastFound_2054, ((local1_i_2060) - (local9_LastFound_2054)));
				if ((((TRIM_Str(local8_Text_Str_2062, " \t\r\n\v\f")) !== ("")) ? 1 : 0)) {
					func11_CreateToken(local8_Text_Str_2062, local15_LineContent_Str_2056, local4_Line_2055, local9_Character_2059, local8_Path_Str_2058);
					
				};
				local3_Pos_2063 = local1_i_2060;
				while (((((((MID_Str(global8_Compiler.attr8_Code_Str, local1_i_2060, 1)) !== ("\n")) ? 1 : 0)) && ((((MID_Str(global8_Compiler.attr8_Code_Str, local1_i_2060, 1)) !== ("\f")) ? 1 : 0))) ? 1 : 0)) {
					local1_i_2060+=1;
					
				};
				local8_Text_Str_2062 = MID_Str(global8_Compiler.attr8_Code_Str, local3_Pos_2063, ((local1_i_2060) - (local3_Pos_2063)));
				if ((((((((local8_Text_Str_2062).length) > (("//$$RESETFILE").length)) ? 1 : 0)) && ((((LEFT_Str(local8_Text_Str_2062, ("//$$RESETFILE").length)) === ("//$$RESETFILE")) ? 1 : 0))) ? 1 : 0)) {
					local8_Text_Str_2062 = MID_Str(local8_Text_Str_2062, ((("//$$RESETFILE").length) + (1)), -(1));
					local8_Path_Str_2058 = local8_Text_Str_2062;
					local4_Line_2055 = 0;
					
				};
				local9_LastFound_2054 = local1_i_2060;
				
			};
			local11_curChar_Str_2064 = MID_Str(global8_Compiler.attr8_Code_Str, local1_i_2060, 1);
			local15_TmpLineCont_Str_2065 = local15_LineContent_Str_2056;
			if ((((local11_curChar_Str_2064) === ("\f")) ? 1 : 0)) {
				local11_curChar_Str_2064 = "\n";
				
			};
			{
				var local17___SelectHelper12__2066 = "";
				local17___SelectHelper12__2066 = local11_curChar_Str_2064;
				if ((((local17___SelectHelper12__2066) === ("\n")) ? 1 : 0)) {
					local9_Character_2059 = 0;
					local4_Line_2055+=1;
					{
						var local1_j_2067 = 0;
						for (local1_j_2067 = ((local1_i_2060) + (1));toCheck(local1_j_2067, (((global8_Compiler.attr8_Code_Str).length) - (1)), 1);local1_j_2067 += 1) {
							if (((((((MID_Str(global8_Compiler.attr8_Code_Str, local1_j_2067, 1)) === ("\n")) ? 1 : 0)) || ((((MID_Str(global8_Compiler.attr8_Code_Str, local1_j_2067, 1)) === ("\f")) ? 1 : 0))) ? 1 : 0)) {
								local15_TmpLineCont_Str_2065 = TRIM_Str(MID_Str(global8_Compiler.attr8_Code_Str, local1_i_2060, ((local1_j_2067) - (local1_i_2060))), " \t\r\n\v\f");
								if ((((RIGHT_Str(local15_TmpLineCont_Str_2065, 1)) === ("\f")) ? 1 : 0)) {
									local15_TmpLineCont_Str_2065 = ((MID_Str(local15_TmpLineCont_Str_2065, 0, (((local15_TmpLineCont_Str_2065).length) - (1)))) + ("\n"));
									
								};
								break;
								
							};
							
						};
						
					};
					
				} else if ((((local17___SelectHelper12__2066) === ("\"")) ? 1 : 0)) {
					var local12_WasBackSlash_2068 = 0, local10_WasWasBack_2069 = 0;
					local12_WasBackSlash_2068 = 0;
					local10_WasWasBack_2069 = 0;
					{
						var local1_j_2070 = 0;
						for (local1_j_2070 = ((local1_i_2060) + (1));toCheck(local1_j_2070, (((global8_Compiler.attr8_Code_Str).length) - (1)), 1);local1_j_2070 += 1) {
							if (((((((MID_Str(global8_Compiler.attr8_Code_Str, local1_j_2070, 1)) === ("\n")) ? 1 : 0)) || ((((MID_Str(global8_Compiler.attr8_Code_Str, local1_j_2070, 1)) === ("\f")) ? 1 : 0))) ? 1 : 0)) {
								local4_Line_2055+=1;
								
							};
							if (((((((MID_Str(global8_Compiler.attr8_Code_Str, local1_j_2070, 1)) === ("\"")) ? 1 : 0)) && (((((((local12_WasBackSlash_2068) === (0)) ? 1 : 0)) || (local10_WasWasBack_2069)) ? 1 : 0))) ? 1 : 0)) {
								local1_i_2060 = local1_j_2070;
								break;
								
							};
							local10_WasWasBack_2069 = local12_WasBackSlash_2068;
							local12_WasBackSlash_2068 = 0;
							if ((((MID_Str(global8_Compiler.attr8_Code_Str, local1_j_2070, 1)) === ("\\")) ? 1 : 0)) {
								local12_WasBackSlash_2068 = 1;
								
							};
							
						};
						
					};
					continue;
					
				};
				
			};
			if ((local11_SplitterMap_2052).DoesKeyExist(local11_curChar_Str_2064)) {
				var local9_Split_Str_2071 = "", local8_Text_Str_2072 = "";
				local9_Split_Str_2071 = local11_curChar_Str_2064;
				local8_Text_Str_2072 = MID_Str(global8_Compiler.attr8_Code_Str, local9_LastFound_2054, ((local1_i_2060) - (local9_LastFound_2054)));
				if ((((local8_Text_Str_2072) === (";")) ? 1 : 0)) {
					local8_Text_Str_2072 = "\n";
					
				};
				func11_CreateToken(local8_Text_Str_2072, local15_LineContent_Str_2056, local4_Line_2055, local9_Character_2059, local8_Path_Str_2058);
				local8_Text_Str_2072 = MID_Str(global8_Compiler.attr8_Code_Str, local1_i_2060, (local9_Split_Str_2071).length);
				if ((((local8_Text_Str_2072) === (";")) ? 1 : 0)) {
					local8_Text_Str_2072 = "\n";
					
				};
				func11_CreateToken(local8_Text_Str_2072, local15_LineContent_Str_2056, local4_Line_2055, local9_Character_2059, local8_Path_Str_2058);
				local9_LastFound_2054 = ((local1_i_2060) + ((local9_Split_Str_2071).length));
				
			};
			local15_LineContent_Str_2056 = local15_TmpLineCont_Str_2065;
			
		};
		
	};
	func11_CreateToken("__EOFFILE__", "__EOFFILE__", local4_Line_2055, 0, local8_Path_Str_2058);
	func11_CreateToken("\n", "__EOFFILE__", local4_Line_2055, 0, local8_Path_Str_2058);
	local5_WasNL_2073 = 0;
	local6_WasRem_2074 = 0;
	local6_HasDel_2075 = 0;
	{
		var local1_i_2076 = 0.0;
		for (local1_i_2076 = 0;toCheck(local1_i_2076, ((global8_Compiler.attr11_LastTokenID) - (1)), 1);local1_i_2076 += 1) {
			var local8_Text_Str_2077 = "";
			if (local6_HasDel_2075) {
				local6_HasDel_2075 = 0;
				global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2076)).values[tmpPositionCache].attr5_IsDel = 1;
				continue;
				
			};
			local8_Text_Str_2077 = global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2076)).values[tmpPositionCache].attr8_Text_Str;
			if ((((global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2076)).values[tmpPositionCache].attr8_Text_Str) === ("\n")) ? 1 : 0)) {
				local8_Text_Str_2077 = "NEWLINE";
				if (local5_WasNL_2073) {
					global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2076)).values[tmpPositionCache].attr5_IsDel = 1;
					continue;
					
				};
				local5_WasNL_2073 = 1;
				
			} else {
				local5_WasNL_2073 = 0;
				
			};
			if ((((global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2076)).values[tmpPositionCache].attr8_Text_Str) === ("REM")) ? 1 : 0)) {
				local6_WasRem_2074 = 1;
				
			};
			if ((((local6_WasRem_2074) && ((((global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2076)).values[tmpPositionCache].attr8_Text_Str) === ("ENDREM")) ? 1 : 0))) ? 1 : 0)) {
				local6_WasRem_2074 = 0;
				local6_HasDel_2075 = 1;
				global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2076)).values[tmpPositionCache].attr5_IsDel = 1;
				continue;
				
			};
			if (local6_WasRem_2074) {
				global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2076)).values[tmpPositionCache].attr5_IsDel = 1;
				continue;
				
			};
			if ((((local1_i_2076) < (((global8_Compiler.attr11_LastTokenID) - (1)))) ? 1 : 0)) {
				{
					var local17___SelectHelper13__2078 = "";
					local17___SelectHelper13__2078 = global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2076)).values[tmpPositionCache].attr8_Text_Str;
					if ((((local17___SelectHelper13__2078) === ("<")) ? 1 : 0)) {
						if ((((global8_Compiler.attr6_Tokens.arrAccess(~~(((local1_i_2076) + (1)))).values[tmpPositionCache].attr8_Text_Str) === (">")) ? 1 : 0)) {
							global8_Compiler.attr6_Tokens.arrAccess(~~(((local1_i_2076) + (1)))).values[tmpPositionCache].attr5_IsDel = 1;
							global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2076)).values[tmpPositionCache].attr8_Text_Str = "<>";
							
						};
						if ((((global8_Compiler.attr6_Tokens.arrAccess(~~(((local1_i_2076) + (1)))).values[tmpPositionCache].attr8_Text_Str) === ("=")) ? 1 : 0)) {
							global8_Compiler.attr6_Tokens.arrAccess(~~(((local1_i_2076) + (1)))).values[tmpPositionCache].attr5_IsDel = 1;
							global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2076)).values[tmpPositionCache].attr8_Text_Str = "<=";
							
						};
						
					} else if ((((local17___SelectHelper13__2078) === (">")) ? 1 : 0)) {
						if ((((global8_Compiler.attr6_Tokens.arrAccess(~~(((local1_i_2076) + (1)))).values[tmpPositionCache].attr8_Text_Str) === ("=")) ? 1 : 0)) {
							global8_Compiler.attr6_Tokens.arrAccess(~~(((local1_i_2076) + (1)))).values[tmpPositionCache].attr5_IsDel = 1;
							global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2076)).values[tmpPositionCache].attr8_Text_Str = ">=";
							
						};
						
					};
					
				};
				
			};
			
		};
		
	};
	local1_i_2079 = 0;
	return 0;
	pool_array.free(local12_Splitter_Str_2051);pool_HashMap.free(local11_SplitterMap_2052);
};
func5_Lexer = window['func5_Lexer'];
window['func7_VariDef'] = function(param9_NoDefault) {
	var local8_Name_Str_2670 = "", local12_datatype_Str_2671 = "", local7_IsArray_2672 = 0, local12_RightTok_Str_2673 = "", local11_LeftTok_Str_2674 = "", local6_DefVal_2675 = 0, local4_dims_2676 = pool_array.alloc(0), local4_vari_2679 = pool_TIdentifierVari.alloc();
	local8_Name_Str_2670 = func14_GetCurrent_Str();
	func14_IsValidVarName();
	func5_Match(local8_Name_Str_2670, 10, "src\CompilerPasses\Parser.gbas");
	local12_datatype_Str_2671 = "float";
	local7_IsArray_2672 = 0;
	local12_RightTok_Str_2673 = RIGHT_Str(local8_Name_Str_2670, 1);
	local11_LeftTok_Str_2674 = LEFT_Str(local8_Name_Str_2670, (((local8_Name_Str_2670).length) - (1)));
	local6_DefVal_2675 = -(1);
	{
		var local17___SelectHelper44__2677 = "";
		local17___SelectHelper44__2677 = local12_RightTok_Str_2673;
		if ((((local17___SelectHelper44__2677) === ("%")) ? 1 : 0)) {
			local12_datatype_Str_2671 = "int";
			local8_Name_Str_2670 = local11_LeftTok_Str_2674;
			
		} else if ((((local17___SelectHelper44__2677) === ("#")) ? 1 : 0)) {
			local12_datatype_Str_2671 = "float";
			local8_Name_Str_2670 = local11_LeftTok_Str_2674;
			
		} else if ((((local17___SelectHelper44__2677) === ("$")) ? 1 : 0)) {
			local12_datatype_Str_2671 = "string";
			
		};
		
	};
	if (func7_IsToken("[")) {
		func5_Match("[", 32, "src\CompilerPasses\Parser.gbas");
		if (func7_IsToken("]")) {
			func5_Match("]", 34, "src\CompilerPasses\Parser.gbas");
			
		} else {
			var local1_E_2678 = 0;
			local1_E_2678 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 36, 0);
			func5_Match("]", 37, "src\CompilerPasses\Parser.gbas");
			DIMPUSH(local4_dims_2676, local1_E_2678);
			while (func7_IsToken("[")) {
				func5_Match("[", 40, "src\CompilerPasses\Parser.gbas");
				local1_E_2678 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 41, 0);
				DIMPUSH(local4_dims_2676, local1_E_2678);
				func5_Match("]", 43, "src\CompilerPasses\Parser.gbas");
				
			};
			
		};
		local7_IsArray_2672 = 1;
		
	};
	if (func7_IsToken("AS")) {
		if ((((local12_datatype_Str_2671) === ("float")) ? 1 : 0)) {
			func5_Match("AS", 51, "src\CompilerPasses\Parser.gbas");
			if (((((((((((((((((((func7_IsToken("int")) || (func7_IsToken("short"))) ? 1 : 0)) || (func7_IsToken("byte"))) ? 1 : 0)) || (func7_IsToken("bool"))) ? 1 : 0)) || (func7_IsToken("boolean"))) ? 1 : 0)) || (func7_IsToken("long"))) ? 1 : 0)) || (func7_IsToken("single"))) ? 1 : 0)) {
				local12_datatype_Str_2671 = "int";
				
			} else if ((((func7_IsToken("float")) || (func7_IsToken("double"))) ? 1 : 0)) {
				local12_datatype_Str_2671 = "float";
				
			} else if (func7_IsToken("void")) {
				local12_datatype_Str_2671 = "void";
				
			} else if (func7_IsToken("string")) {
				local12_datatype_Str_2671 = "string";
				
			} else {
				func15_IsValidDatatype();
				local12_datatype_Str_2671 = func14_GetCurrent_Str();
				
			};
			func7_GetNext();
			
		} else {
			func5_Error("Unexpected AS", 66, "src\CompilerPasses\Parser.gbas");
			
		};
		
	};
	local4_vari_2679.attr8_Name_Str = local8_Name_Str_2670;
	local4_vari_2679.attr8_datatype.attr8_Name_Str = local12_datatype_Str_2671;
	local4_vari_2679.attr8_datatype.attr7_IsArray = local7_IsArray_2672;
	if ((((BOUNDS(local4_dims_2676, 0)) > (0)) ? 1 : 0)) {
		local6_DefVal_2675 = func25_CreateDimAsExprExpression(local4_vari_2679.attr8_datatype, unref(local4_dims_2676));
		
	};
	if ((((func7_IsToken("=")) && (((param9_NoDefault) ? 0 : 1))) ? 1 : 0)) {
		func5_Match("=", 80, "src\CompilerPasses\Parser.gbas");
		local6_DefVal_2675 = func14_EnsureDatatype(func10_Expression(0), local4_vari_2679.attr8_datatype, 81, 0);
		
	};
	local4_vari_2679.attr6_PreDef = local6_DefVal_2675;
	return tryClone(local4_vari_2679);
	return tryClone(unref(pool_TIdentifierVari.alloc()));
	pool_array.free(local4_dims_2676);pool_TIdentifierVari.free(local4_vari_2679);
};
func7_VariDef = window['func7_VariDef'];
window['func7_FuncDef'] = function(param6_Native, param10_IsCallBack, param3_Typ, param6_CurTyp) {
	var local8_Name_Str_2684 = "";
	if ((((param3_Typ) === (4)) ? 1 : 0)) {
		func5_Match("PROTOTYPE", 91, "src\CompilerPasses\Parser.gbas");
		
	} else {
		func5_Match("FUNCTION", 93, "src\CompilerPasses\Parser.gbas");
		
	};
	local8_Name_Str_2684 = func14_GetCurrent_Str();
	var forEachSaver25620 = global8_Compiler.attr5_Funcs_ref[0];
	for(var forEachCounter25620 = 0 ; forEachCounter25620 < forEachSaver25620.values.length ; forEachCounter25620++) {
		var local4_func_ref_2685 = forEachSaver25620.values[forEachCounter25620];
	{
			if (((((((((((((func7_IsToken(func16_AddDataChars_Str(local4_func_ref_2685[0].attr8_Name_Str, unref(local4_func_ref_2685[0])))) || (func7_IsToken(local4_func_ref_2685[0].attr8_Name_Str))) ? 1 : 0)) && ((((local4_func_ref_2685[0].attr10_IsCallback) === (param10_IsCallBack)) ? 1 : 0))) ? 1 : 0)) && ((((local4_func_ref_2685[0].attr3_Typ) === (param3_Typ)) ? 1 : 0))) ? 1 : 0)) && ((((local4_func_ref_2685[0].attr6_MyType) === (param6_CurTyp)) ? 1 : 0))) ? 1 : 0)) {
				var local7_tmpVari_2686 = pool_TIdentifierVari.alloc(), local10_MustDefVal_2687 = 0;
				local7_tmpVari_2686 = func7_VariDef(0).clone(/* In Assign */);
				func5_Match(":", 104, "src\CompilerPasses\Parser.gbas");
				local10_MustDefVal_2687 = 0;
				while ((((func7_IsToken("\n")) === (0)) ? 1 : 0)) {
					var local3_ref_2688 = 0, local4_vari_ref_2689 = [pool_TIdentifierVari.alloc()];
					local3_ref_2688 = 0;
					if (func7_IsToken("BYREF")) {
						local3_ref_2688 = 1;
						func5_Match("BYREF", 111, "src\CompilerPasses\Parser.gbas");
						local4_func_ref_2685[0].attr6_HasRef = 1;
						
					};
					local4_vari_ref_2689[0] = func7_VariDef(0).clone(/* In Assign */);
					if (local10_MustDefVal_2687) {
						if ((((local4_vari_ref_2689[0].attr6_PreDef) === (-(1))) ? 1 : 0)) {
							func5_Error((((("Parameter '") + (local4_vari_ref_2689[0].attr8_Name_Str))) + ("' has to have default value.")), 117, "src\CompilerPasses\Parser.gbas");
							
						};
						
					} else {
						if ((((local4_vari_ref_2689[0].attr6_PreDef) !== (-(1))) ? 1 : 0)) {
							local10_MustDefVal_2687 = 1;
							
						};
						
					};
					local4_vari_ref_2689[0].attr3_Typ = ~~(5);
					local4_vari_ref_2689[0].attr3_ref = local3_ref_2688;
					local4_vari_ref_2689[0].attr2_ID = BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0);
					DIMPUSH(global8_Compiler.attr5_Varis_ref[0], local4_vari_ref_2689);
					DIMPUSH(local4_func_ref_2685[0].attr6_Params, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
					if ((((func7_IsToken("\n")) === (0)) ? 1 : 0)) {
						func5_Match(",", 126, "src\CompilerPasses\Parser.gbas");
						
					};
					pool_TIdentifierVari.free(local4_vari_ref_2689);
				};
				if ((((param3_Typ) !== (3)) ? 1 : 0)) {
					(global8_Compiler.attr11_GlobalFuncs).Put(local4_func_ref_2685[0].attr8_Name_Str, local4_func_ref_2685[0].attr2_ID);
					
				};
				if ((((param3_Typ) !== (4)) ? 1 : 0)) {
					if (((((((param6_Native) === (0)) ? 1 : 0)) && ((((local4_func_ref_2685[0].attr10_IsAbstract) === (0)) ? 1 : 0))) ? 1 : 0)) {
						local4_func_ref_2685[0].attr6_Native = 0;
						func5_Match("\n", 145, "src\CompilerPasses\Parser.gbas");
						local4_func_ref_2685[0].attr3_Tok = global8_Compiler.attr11_currentPosi;
						func10_SkipTokens("FUNCTION", "ENDFUNCTION", local4_func_ref_2685[0].attr8_Name_Str);
						
					} else {
						if (((local4_func_ref_2685[0].attr10_IsAbstract) ? 0 : 1)) {
							local4_func_ref_2685[0].attr6_Native = 1;
							
						};
						
					};
					
				};
				return 0;
				pool_TIdentifierVari.free(local7_tmpVari_2686);
			};
			
		}
		forEachSaver25620.values[forEachCounter25620] = local4_func_ref_2685;
	
	};
	if (param10_IsCallBack) {
		func10_SkipTokens("FUNCTION", "ENDFUNCTION", local8_Name_Str_2684);
		
	} else {
		func5_Error((((("Internal error (func definition for unknown type: ") + (local8_Name_Str_2684))) + (")")), 160, "src\CompilerPasses\Parser.gbas");
		
	};
	return 0;
	
};
func7_FuncDef = window['func7_FuncDef'];
window['func6_SubDef'] = function() {
	func5_Match("SUB", 166, "src\CompilerPasses\Parser.gbas");
	var forEachSaver25719 = global8_Compiler.attr5_Funcs_ref[0];
	for(var forEachCounter25719 = 0 ; forEachCounter25719 < forEachSaver25719.values.length ; forEachCounter25719++) {
		var local4_func_ref_2690 = forEachSaver25719.values[forEachCounter25719];
	{
			if ((((func7_IsToken(local4_func_ref_2690[0].attr8_Name_Str)) && ((((local4_func_ref_2690[0].attr3_Typ) === (2)) ? 1 : 0))) ? 1 : 0)) {
				local4_func_ref_2690[0].attr8_Name_Str = func14_GetCurrent_Str();
				local4_func_ref_2690[0].attr8_datatype = global12_voidDatatype.clone(/* In Assign */);
				local4_func_ref_2690[0].attr3_Typ = ~~(2);
				(global8_Compiler.attr11_GlobalFuncs).Put(local4_func_ref_2690[0].attr8_Name_Str, local4_func_ref_2690[0].attr2_ID);
				func5_Match(local4_func_ref_2690[0].attr8_Name_Str, 175, "src\CompilerPasses\Parser.gbas");
				func5_Match(":", 176, "src\CompilerPasses\Parser.gbas");
				func5_Match("\n", 177, "src\CompilerPasses\Parser.gbas");
				local4_func_ref_2690[0].attr3_Tok = global8_Compiler.attr11_currentPosi;
				func10_SkipTokens("SUB", "ENDSUB", local4_func_ref_2690[0].attr8_Name_Str);
				return 0;
				
			};
			
		}
		forEachSaver25719.values[forEachCounter25719] = local4_func_ref_2690;
	
	};
	func5_Error("Internal error (sub definition for unknown type)", 183, "src\CompilerPasses\Parser.gbas");
	return 0;
	
};
func6_SubDef = window['func6_SubDef'];
window['func8_TypeDefi'] = function() {
	func5_Match("TYPE", 188, "src\CompilerPasses\Parser.gbas");
	var forEachSaver25981 = global8_Compiler.attr5_Types_ref[0];
	for(var forEachCounter25981 = 0 ; forEachCounter25981 < forEachSaver25981.values.length ; forEachCounter25981++) {
		var local3_typ_ref_2691 = forEachSaver25981.values[forEachCounter25981];
	{
			if (func7_IsToken(local3_typ_ref_2691[0].attr8_Name_Str)) {
				var local11_ExtName_Str_2692 = "";
				local3_typ_ref_2691[0].attr8_Name_Str = func14_GetCurrent_Str();
				local3_typ_ref_2691[0].attr3_Tok = global8_Compiler.attr11_currentPosi;
				func5_Match(local3_typ_ref_2691[0].attr8_Name_Str, 193, "src\CompilerPasses\Parser.gbas");
				if (func7_IsToken("EXTENDS")) {
					func5_Match("EXTENDS", 198, "src\CompilerPasses\Parser.gbas");
					local11_ExtName_Str_2692 = func14_GetCurrent_Str();
					func7_GetNext();
					
				} else if ((((local3_typ_ref_2691[0].attr8_Name_Str) !== ("TObject")) ? 1 : 0)) {
					local11_ExtName_Str_2692 = "TObject";
					
				};
				if ((((local11_ExtName_Str_2692) !== ("")) ? 1 : 0)) {
					if ((((local11_ExtName_Str_2692) === (local3_typ_ref_2691[0].attr8_Name_Str)) ? 1 : 0)) {
						func5_Error("Type cannot extend itself!", 205, "src\CompilerPasses\Parser.gbas");
						
					};
					var forEachSaver25826 = global8_Compiler.attr5_Types_ref[0];
					for(var forEachCounter25826 = 0 ; forEachCounter25826 < forEachSaver25826.values.length ; forEachCounter25826++) {
						var local1_T_ref_2693 = forEachSaver25826.values[forEachCounter25826];
					{
							if ((((local1_T_ref_2693[0].attr8_Name_Str) === (local11_ExtName_Str_2692)) ? 1 : 0)) {
								local3_typ_ref_2691[0].attr9_Extending = local1_T_ref_2693[0].attr2_ID;
								break;
								
							};
							
						}
						forEachSaver25826.values[forEachCounter25826] = local1_T_ref_2693;
					
					};
					
				};
				if (func7_IsToken(":")) {
					func5_Match(":", 214, "src\CompilerPasses\Parser.gbas");
					
				};
				func5_Match("\n", 215, "src\CompilerPasses\Parser.gbas");
				var forEachSaver25892 = local3_typ_ref_2691[0].attr7_Methods;
				for(var forEachCounter25892 = 0 ; forEachCounter25892 < forEachSaver25892.values.length ; forEachCounter25892++) {
					var local2_M1_2694 = forEachSaver25892.values[forEachCounter25892];
				{
						var forEachSaver25891 = local3_typ_ref_2691[0].attr7_Methods;
						for(var forEachCounter25891 = 0 ; forEachCounter25891 < forEachSaver25891.values.length ; forEachCounter25891++) {
							var local2_M2_2695 = forEachSaver25891.values[forEachCounter25891];
						{
								if (((((((local2_M1_2694) !== (local2_M2_2695)) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local2_M2_2695).values[tmpPositionCache][0].attr8_Name_Str) === (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local2_M1_2694).values[tmpPositionCache][0].attr8_Name_Str)) ? 1 : 0))) ? 1 : 0)) {
									func5_Error((((("Method '") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local2_M1_2694).values[tmpPositionCache][0].attr8_Name_Str))) + ("' already exists")), 218, "src\CompilerPasses\Parser.gbas");
									
								};
								
							}
							forEachSaver25891.values[forEachCounter25891] = local2_M2_2695;
						
						};
						
					}
					forEachSaver25892.values[forEachCounter25892] = local2_M1_2694;
				
				};
				while ((((func7_IsToken("ENDTYPE")) === (0)) ? 1 : 0)) {
					var local10_IsAbstract_2696 = 0;
					local10_IsAbstract_2696 = 0;
					if (func7_IsToken("ABSTRACT")) {
						func5_Match("ABSTRACT", 224, "src\CompilerPasses\Parser.gbas");
						local10_IsAbstract_2696 = 1;
						
					};
					if (func7_IsToken("FUNCTION")) {
						if (local10_IsAbstract_2696) {
							func10_SkipTokens("FUNCTION", "\n", "ABSTRACT FUNCTION");
							
						} else {
							func10_SkipTokens("FUNCTION", "ENDFUNCTION", "FUNCTION IN TYPE");
							
						};
						
					} else {
						var local4_Vari_2697 = pool_TIdentifierVari.alloc();
						local4_Vari_2697 = func7_VariDef(0).clone(/* In Assign */);
						local4_Vari_2697.attr3_Typ = ~~(3);
						func11_AddVariable(local4_Vari_2697, 1);
						DIMPUSH(local3_typ_ref_2691[0].attr10_Attributes, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
						pool_TIdentifierVari.free(local4_Vari_2697);
					};
					if ((((func7_IsToken("ENDTYPE")) === (0)) ? 1 : 0)) {
						func5_Match("\n", 251, "src\CompilerPasses\Parser.gbas");
						
					};
					
				};
				func5_Match("ENDTYPE", 254, "src\CompilerPasses\Parser.gbas");
				return 0;
				
			};
			
		}
		forEachSaver25981.values[forEachCounter25981] = local3_typ_ref_2691;
	
	};
	func5_Error("Internal error (type definition for unknown type)", 258, "src\CompilerPasses\Parser.gbas");
	return 0;
	
};
func8_TypeDefi = window['func8_TypeDefi'];
window['func11_CompileFunc'] = function(param4_func) {
	if ((((((((((param4_func.attr3_Scp) === (-(1))) ? 1 : 0)) && ((((param4_func.attr6_Native) === (0)) ? 1 : 0))) ? 1 : 0)) && ((((param4_func.attr10_PlzCompile) === (1)) ? 1 : 0))) ? 1 : 0)) {
		var local6_TmpScp_2699 = 0.0, local3_Tok_2700 = 0, local7_Curfunc_2701 = 0.0, local3_Scp_2703 = 0;
		if (param4_func.attr10_IsAbstract) {
			
		};
		local6_TmpScp_2699 = global8_Compiler.attr12_CurrentScope;
		global8_Compiler.attr12_CurrentScope = global8_Compiler.attr9_MainScope;
		local3_Tok_2700 = global8_Compiler.attr11_currentPosi;
		local7_Curfunc_2701 = global8_Compiler.attr11_currentFunc;
		global8_Compiler.attr11_currentFunc = param4_func.attr2_ID;
		global8_Compiler.attr11_currentPosi = ((param4_func.attr3_Tok) - (1));
		if (((((((param4_func.attr3_Tok) === (0)) ? 1 : 0)) && (((param4_func.attr10_IsAbstract) ? 0 : 1))) ? 1 : 0)) {
			func5_Error("Internal error (function has no start token)", 273, "src\CompilerPasses\Parser.gbas");
			
		};
		if ((((param4_func.attr3_Typ) === (3)) ? 1 : 0)) {
			var local4_Vari_2702 = pool_TIdentifierVari.alloc();
			local4_Vari_2702.attr8_Name_Str = "self";
			local4_Vari_2702.attr8_datatype.attr8_Name_Str = global8_Compiler.attr5_Types_ref[0].arrAccess(param4_func.attr6_MyType).values[tmpPositionCache][0].attr8_Name_Str;
			local4_Vari_2702.attr8_datatype.attr7_IsArray = 0;
			local4_Vari_2702.attr3_Typ = ~~(5);
			func11_AddVariable(local4_Vari_2702, 1);
			DIMPUSH(param4_func.attr6_Params, local4_Vari_2702.attr2_ID);
			param4_func.attr7_SelfVar = local4_Vari_2702.attr2_ID;
			pool_TIdentifierVari.free(local4_Vari_2702);
		};
		func7_GetNext();
		{
			var Err_Str = "";
			try {
				if (((param4_func.attr10_IsAbstract) ? 0 : 1)) {
					if ((((param4_func.attr3_Typ) === (2)) ? 1 : 0)) {
						local3_Scp_2703 = func5_Scope("ENDSUB", param4_func.attr2_ID);
						
					} else {
						var local1_e_2704 = 0;
						local3_Scp_2703 = func5_Scope("ENDFUNCTION", param4_func.attr2_ID);
						local1_e_2704 = func22_CreateReturnExpression(func28_CreateDefaultValueExpression(param4_func.attr8_datatype));
						DIMPUSH(global5_Exprs_ref[0].arrAccess(local3_Scp_2703).values[tmpPositionCache][0].attr5_Exprs, local1_e_2704);
						
					};
					
				} else {
					local3_Scp_2703 = func21_CreateScopeExpression(~~(2));
					DIMPUSH(global5_Exprs_ref[0].arrAccess(local3_Scp_2703).values[tmpPositionCache][0].attr5_Exprs, func21_CreateEmptyExpression());
					
				};
				
			} catch (Err_Str) {
				if (Err_Str instanceof OTTException) Err_Str = Err_Str.getText(); else throwError(Err_Str);{
					local3_Scp_2703 = func21_CreateEmptyExpression();
					
				}
			};
			
		};
		param4_func.attr3_Scp = local3_Scp_2703;
		global8_Compiler.attr11_currentPosi = ((local3_Tok_2700) - (1));
		func7_GetNext();
		global8_Compiler.attr11_currentFunc = ~~(local7_Curfunc_2701);
		global8_Compiler.attr12_CurrentScope = ~~(local6_TmpScp_2699);
		return 1;
		
	} else {
		return tryClone(0);
		
	};
	return 0;
	
};
func11_CompileFunc = window['func11_CompileFunc'];
window['func10_Expression'] = function(param4_Prio) {
	if ((((param4_Prio) < (15)) ? 1 : 0)) {
		var local4_Left_2707 = 0, local5_Right_2708 = 0, local5_Found_2709 = 0;
		local4_Left_2707 = func10_Expression(((param4_Prio) + (1)));
		local5_Right_2708 = -(1);
		local5_Found_2709 = 0;
		do {
			local5_Found_2709 = 0;
			var forEachSaver26335 = global9_Operators_ref[0];
			for(var forEachCounter26335 = 0 ; forEachCounter26335 < forEachSaver26335.values.length ; forEachCounter26335++) {
				var local2_Op_ref_2710 = forEachSaver26335.values[forEachCounter26335];
			{
					while (((((((local2_Op_ref_2710[0].attr4_Prio) === (param4_Prio)) ? 1 : 0)) && (func7_IsToken(local2_Op_ref_2710[0].attr7_Sym_Str))) ? 1 : 0)) {
						func5_Match(local2_Op_ref_2710[0].attr7_Sym_Str, 338, "src\CompilerPasses\Parser.gbas");
						local5_Right_2708 = func10_Expression(((param4_Prio) + (1)));
						local4_Left_2707 = func24_CreateOperatorExpression(unref(local2_Op_ref_2710[0]), local4_Left_2707, local5_Right_2708);
						{
							var Error_Str = "";
							try {
								var local6_Result_2711 = 0.0;
								local6_Result_2711 = func13_CalculateTree(unref(global5_Exprs_ref[0].arrAccess(local4_Left_2707).values[tmpPositionCache][0]));
								if ((((INTEGER(local6_Result_2711)) === (local6_Result_2711)) ? 1 : 0)) {
									local4_Left_2707 = func19_CreateIntExpression(~~(local6_Result_2711));
									
								} else {
									local5_Right_2708 = func21_CreateFloatExpression(local6_Result_2711);
									
								};
								
							} catch (Error_Str) {
								if (Error_Str instanceof OTTException) Error_Str = Error_Str.getText(); else throwError(Error_Str);{
									
								}
							};
							
						};
						local5_Found_2709 = 1;
						break;
						
					};
					
				}
				forEachSaver26335.values[forEachCounter26335] = local2_Op_ref_2710;
			
			};
			
		} while (!((((local5_Found_2709) === (0)) ? 1 : 0)));
		return tryClone(local4_Left_2707);
		
	} else {
		return tryClone(func6_Factor());
		
	};
	return 0;
	
};
func10_Expression = window['func10_Expression'];
window['func12_CastDatatype'] = function(param8_RetData1_ref, param8_RetData2_ref) {
	var local5_Data1_2715 = 0, local5_Data2_2716 = 0;
	local5_Data1_2715 = param8_RetData1_ref[0];
	local5_Data2_2716 = param8_RetData2_ref[0];
	if ((((global5_Exprs_ref[0].arrAccess(local5_Data1_2715).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (global5_Exprs_ref[0].arrAccess(local5_Data2_2716).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray)) ? 1 : 0)) {
		if ((((global5_Exprs_ref[0].arrAccess(local5_Data1_2715).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === (global5_Exprs_ref[0].arrAccess(local5_Data2_2716).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str)) ? 1 : 0)) {
			param8_RetData1_ref[0] = local5_Data1_2715;
			param8_RetData2_ref[0] = local5_Data2_2716;
			return tryClone(global5_Exprs_ref[0].arrAccess(param8_RetData1_ref[0]).values[tmpPositionCache][0].attr8_datatype);
			
		} else {
			if ((((global5_Exprs_ref[0].arrAccess(local5_Data1_2715).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("string")) ? 1 : 0)) {
				param8_RetData2_ref[0] = func27_CreateCast2StringExpression(local5_Data2_2716);
				
			} else if ((((global5_Exprs_ref[0].arrAccess(local5_Data2_2716).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("string")) ? 1 : 0)) {
				param8_RetData1_ref[0] = func27_CreateCast2StringExpression(local5_Data1_2715);
				
			} else if ((((global5_Exprs_ref[0].arrAccess(local5_Data1_2715).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("float")) ? 1 : 0)) {
				param8_RetData2_ref[0] = func26_CreateCast2FloatExpression(local5_Data2_2716);
				
			} else if ((((global5_Exprs_ref[0].arrAccess(local5_Data2_2716).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("float")) ? 1 : 0)) {
				param8_RetData1_ref[0] = func26_CreateCast2FloatExpression(local5_Data1_2715);
				
			} else {
				func5_Error((((((((((((("Cannot cast '") + (global5_Exprs_ref[0].arrAccess(local5_Data1_2715).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) + (func20_BuildArrBrackets_Str(global5_Exprs_ref[0].arrAccess(local5_Data1_2715).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray)))) + ("' to '"))) + (global5_Exprs_ref[0].arrAccess(local5_Data2_2716).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) + (func20_BuildArrBrackets_Str(global5_Exprs_ref[0].arrAccess(local5_Data2_2716).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray)))) + ("'")), 383, "src\CompilerPasses\Parser.gbas");
				
			};
			return tryClone(global5_Exprs_ref[0].arrAccess(param8_RetData1_ref[0]).values[tmpPositionCache][0].attr8_datatype);
			
		};
		
	} else {
		func5_Error((((((((((("Dimensions are different: ") + (global5_Exprs_ref[0].arrAccess(local5_Data1_2715).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) + (func20_BuildArrBrackets_Str(global5_Exprs_ref[0].arrAccess(local5_Data1_2715).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray)))) + (", "))) + (global5_Exprs_ref[0].arrAccess(local5_Data2_2716).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) + (func20_BuildArrBrackets_Str(global5_Exprs_ref[0].arrAccess(local5_Data2_2716).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray))), 389, "src\CompilerPasses\Parser.gbas");
		
	};
	return tryClone(unref(pool_TDatatype.alloc()));
	
};
func12_CastDatatype = window['func12_CastDatatype'];
window['func14_EnsureDatatype'] = function(param4_Expr, param8_NeedData, param4_Line, param6_Strict) {
	var local6_myData_2721 = pool_TDatatype.alloc();
	param6_Strict = 0;
	if ((((param8_NeedData.attr8_Name_Str) === ("")) ? 1 : 0)) {
		func5_Error("Internal error (datatype is empty)", 402, "src\CompilerPasses\Parser.gbas");
		
	};
	local6_myData_2721 = global5_Exprs_ref[0].arrAccess(param4_Expr).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
	if (((((((local6_myData_2721.attr8_Name_Str) === (param8_NeedData.attr8_Name_Str)) ? 1 : 0)) && ((((local6_myData_2721.attr7_IsArray) === (param8_NeedData.attr7_IsArray)) ? 1 : 0))) ? 1 : 0)) {
		return tryClone(param4_Expr);
		
	} else {
		var local5_func1_2723 = 0, local5_func2_2724 = 0, local7_add_Str_2727 = "";
		if ((((param6_Strict) === (0)) ? 1 : 0)) {
			if ((((local6_myData_2721.attr7_IsArray) === (param8_NeedData.attr7_IsArray)) ? 1 : 0)) {
				if ((((((((((local6_myData_2721.attr8_Name_Str) === ("int")) ? 1 : 0)) || ((((local6_myData_2721.attr8_Name_Str) === ("float")) ? 1 : 0))) ? 1 : 0)) || ((((local6_myData_2721.attr8_Name_Str) === ("string")) ? 1 : 0))) ? 1 : 0)) {
					if ((((((((((param8_NeedData.attr8_Name_Str) === ("int")) ? 1 : 0)) || ((((param8_NeedData.attr8_Name_Str) === ("float")) ? 1 : 0))) ? 1 : 0)) || ((((param8_NeedData.attr8_Name_Str) === ("string")) ? 1 : 0))) ? 1 : 0)) {
						{
							var local17___SelectHelper45__2722 = "";
							local17___SelectHelper45__2722 = param8_NeedData.attr8_Name_Str;
							if ((((local17___SelectHelper45__2722) === ("int")) ? 1 : 0)) {
								return tryClone(func24_CreateCast2IntExpression(param4_Expr));
								
							} else if ((((local17___SelectHelper45__2722) === ("float")) ? 1 : 0)) {
								return tryClone(func26_CreateCast2FloatExpression(param4_Expr));
								
							} else if ((((local17___SelectHelper45__2722) === ("string")) ? 1 : 0)) {
								return tryClone(func27_CreateCast2StringExpression(param4_Expr));
								
							};
							
						};
						
					};
					
				};
				
			};
			
		};
		local5_func1_2723 = func14_SearchPrototyp(local6_myData_2721.attr8_Name_Str);
		local5_func2_2724 = func14_SearchPrototyp(param8_NeedData.attr8_Name_Str);
		if ((((local5_func1_2723) !== (-(1))) ? 1 : 0)) {
			if ((((local5_func2_2724) !== (-(1))) ? 1 : 0)) {
				var local7_checker_2725 = pool_TProtoChecker.alloc();
				if ((((local6_myData_2721.attr7_IsArray) || (param8_NeedData.attr7_IsArray)) ? 1 : 0)) {
					func5_Error("PROTOTYPE cannot be an array.", 429, "src\CompilerPasses\Parser.gbas");
					
				};
				local7_checker_2725.attr8_fromFunc = global8_Compiler.attr5_Funcs_ref[0].arrAccess(local5_func1_2723).values[tmpPositionCache][0].attr2_ID;
				local7_checker_2725.attr6_toFunc = global8_Compiler.attr5_Funcs_ref[0].arrAccess(local5_func2_2724).values[tmpPositionCache][0].attr2_ID;
				local7_checker_2725.attr3_Tok = func15_GetCurrentToken().clone(/* In Assign */);
				DIMPUSH(global8_Compiler.attr13_protoCheckers, local7_checker_2725);
				return tryClone(param4_Expr);
				pool_TProtoChecker.free(local7_checker_2725);
			} else {
				if (((((((((((((param8_NeedData.attr8_Name_Str) === ("int")) ? 1 : 0)) || ((((param8_NeedData.attr8_Name_Str) === ("float")) ? 1 : 0))) ? 1 : 0)) || ((((param8_NeedData.attr8_Name_Str) === ("string")) ? 1 : 0))) ? 1 : 0)) && ((((param8_NeedData.attr7_IsArray) === (0)) ? 1 : 0))) ? 1 : 0)) {
					{
						var local17___SelectHelper46__2726 = "";
						local17___SelectHelper46__2726 = param8_NeedData.attr8_Name_Str;
						if ((((local17___SelectHelper46__2726) === ("int")) ? 1 : 0)) {
							return tryClone(func24_CreateCast2IntExpression(param4_Expr));
							
						} else if ((((local17___SelectHelper46__2726) === ("float")) ? 1 : 0)) {
							return tryClone(func26_CreateCast2FloatExpression(param4_Expr));
							
						} else if ((((local17___SelectHelper46__2726) === ("string")) ? 1 : 0)) {
							return tryClone(func27_CreateCast2StringExpression(param4_Expr));
							
						};
						
					};
					
				};
				
			};
			
		};
		if ((((func6_IsType(local6_myData_2721.attr8_Name_Str)) && (func6_IsType(param8_NeedData.attr8_Name_Str))) ? 1 : 0)) {
			return tryClone(param4_Expr);
			
		};
		local7_add_Str_2727 = "";
		if (param6_Strict) {
			local7_add_Str_2727 = " , and maybe can't cast, because it is BYREF (screw you BYREF >:O)!!";
			
		};
		func5_Error((((((((((((((("Cannot cast datatypes. Needs '") + (param8_NeedData.attr8_Name_Str))) + (func20_BuildArrBrackets_Str(param8_NeedData.attr7_IsArray)))) + ("', got '"))) + (local6_myData_2721.attr8_Name_Str))) + (func20_BuildArrBrackets_Str(local6_myData_2721.attr7_IsArray)))) + ("'"))) + (local7_add_Str_2727)), param4_Line, "src\CompilerPasses\Parser.gbas");
		
	};
	return 0;
	pool_TDatatype.free(local6_myData_2721);
};
func14_EnsureDatatype = window['func14_EnsureDatatype'];
window['func20_BuildArrBrackets_Str'] = function(param7_IsArray) {
	if (param7_IsArray) {
		return "[]";
		
	} else {
		return "";
		
	};
	return "";
	
};
func20_BuildArrBrackets_Str = window['func20_BuildArrBrackets_Str'];
window['func7_Hex2Dec'] = function(param10_hexStr_Str) {
	var local1_i_2785 = 0, local1_j_2786 = 0, local4_loop_2787 = 0;
	local1_i_2785 = 0;
	local1_j_2786 = 0;
	{
		for (local4_loop_2787 = 0;toCheck(local4_loop_2787, (((param10_hexStr_Str).length) - (1)), 1);local4_loop_2787 += 1) {
			local1_i_2785 = ((ASC(MID_Str(param10_hexStr_Str, local4_loop_2787, 1), 0)) - (48));
			if ((((9) < (local1_i_2785)) ? 1 : 0)) {
				local1_i_2785+=-(7);
				
			};
			local1_j_2786 = ((local1_j_2786) * (16));
			local1_j_2786 = bOR(local1_j_2786, bAND(local1_i_2785, 15));
			
		};
		
	};
	return tryClone(local1_j_2786);
	return 0;
	
};
func7_Hex2Dec = window['func7_Hex2Dec'];
window['func6_Factor'] = function() {
	if (func7_IsToken("(")) {
		var local4_Expr_2729 = 0;
		func5_Match("(", 499, "src\CompilerPasses\Parser.gbas");
		local4_Expr_2729 = func10_Expression(0);
		func5_Match(")", 501, "src\CompilerPasses\Parser.gbas");
		return tryClone(local4_Expr_2729);
		
	} else if (func12_IsIdentifier(1, 0)) {
		return tryClone(func10_Identifier(0));
		
	} else if (func8_IsString()) {
		var local7_Str_Str_2730 = "";
		local7_Str_Str_2730 = func14_GetCurrent_Str();
		if ((((INSTR(local7_Str_Str_2730, "\n", 0)) !== (-(1))) ? 1 : 0)) {
			func5_Error("Expecting '\"'", 509, "src\CompilerPasses\Parser.gbas");
			
		};
		func7_GetNext();
		return tryClone(func19_CreateStrExpression(local7_Str_Str_2730));
		
	} else if ((((MID_Str(func14_GetCurrent_Str(), 0, 2)) === ("0x")) ? 1 : 0)) {
		var local7_hex_Str_2731 = "";
		local7_hex_Str_2731 = MID_Str(func14_GetCurrent_Str(), 2, -(1));
		func7_GetNext();
		return tryClone(func19_CreateIntExpression(func7_Hex2Dec(local7_hex_Str_2731)));
		
	} else if ((((func8_IsNumber()) || (func7_IsToken("."))) ? 1 : 0)) {
		var local3_Num_2732 = 0, local12_hasToHaveNum_2733 = 0;
		local12_hasToHaveNum_2733 = 0;
		if (func7_IsToken(".")) {
			local3_Num_2732 = 0;
			local12_hasToHaveNum_2733 = 1;
			
		} else {
			local3_Num_2732 = INT2STR(func14_GetCurrent_Str());
			func7_GetNext();
			
		};
		if (func7_IsToken(".")) {
			var local4_Num2_2734 = 0, local3_pos_2735 = 0, local4_FNum_2736 = 0.0;
			func5_Match(".", 529, "src\CompilerPasses\Parser.gbas");
			local4_Num2_2734 = INT2STR(func14_GetCurrent_Str());
			local3_pos_2735 = global8_Compiler.attr11_currentPosi;
			if (func8_IsNumber()) {
				func7_GetNext();
				
			};
			local4_FNum_2736 = FLOAT2STR(((((((CAST2STRING(local3_Num_2732)) + ("."))) + (CAST2STRING(local4_Num2_2734)))) + (CAST2STRING(0))));
			return tryClone(func21_CreateFloatExpression(local4_FNum_2736));
			
		} else {
			if (local12_hasToHaveNum_2733) {
				func5_Error("Expecting number!", 542, "src\CompilerPasses\Parser.gbas");
				
			};
			return tryClone(func19_CreateIntExpression(local3_Num_2732));
			
		};
		
	} else if (func7_IsToken("-")) {
		var local4_Expr_2737 = 0, alias2_Op_ref_2738 = [pool_TOperator.alloc()], local7_tmpData_2739 = pool_TDatatype.alloc();
		func5_Match("-", 546, "src\CompilerPasses\Parser.gbas");
		local4_Expr_2737 = func6_Factor();
		alias2_Op_ref_2738 = global9_Operators_ref[0].arrAccess(func14_SearchOperator("sub")).values[tmpPositionCache] /* ALIAS */;
		local7_tmpData_2739 = global5_Exprs_ref[0].arrAccess(local4_Expr_2737).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
		local7_tmpData_2739.attr7_IsArray = 0;
		local4_Expr_2737 = func14_EnsureDatatype(local4_Expr_2737, local7_tmpData_2739, 553, 0);
		if ((((global5_Exprs_ref[0].arrAccess(local4_Expr_2737).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("float")) ? 1 : 0)) {
			local4_Expr_2737 = func24_CreateOperatorExpression(unref(alias2_Op_ref_2738[0]), func21_CreateFloatExpression(0), func14_EnsureDatatype(local4_Expr_2737, global13_floatDatatype, 555, 0));
			
		} else if (((((((global5_Exprs_ref[0].arrAccess(local4_Expr_2737).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("int")) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(local4_Expr_2737).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("string")) ? 1 : 0))) ? 1 : 0)) {
			local4_Expr_2737 = func24_CreateOperatorExpression(unref(alias2_Op_ref_2738[0]), func19_CreateIntExpression(0), func14_EnsureDatatype(local4_Expr_2737, global11_intDatatype, 557, 0));
			
		} else {
			func5_Error((((("Unexpected datatype, expecting 'float/int' got '") + (global5_Exprs_ref[0].arrAccess(local4_Expr_2737).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) + ("'")), 559, "src\CompilerPasses\Parser.gbas");
			
		};
		return tryClone(local4_Expr_2737);
		pool_TOperator.free(alias2_Op_ref_2738);pool_TDatatype.free(local7_tmpData_2739);
	} else if (func7_IsToken("TRUE")) {
		func5_Match("TRUE", 563, "src\CompilerPasses\Parser.gbas");
		return tryClone(func19_CreateIntExpression(1));
		
	} else if (func7_IsToken("FALSE")) {
		func5_Match("FALSE", 566, "src\CompilerPasses\Parser.gbas");
		return tryClone(func21_CreateFloatExpression(0));
		
	} else if (func7_IsToken("CODELINE")) {
		func5_Match("CODELINE", 569, "src\CompilerPasses\Parser.gbas");
		func5_Match("(", 570, "src\CompilerPasses\Parser.gbas");
		func5_Match(")", 571, "src\CompilerPasses\Parser.gbas");
		return tryClone(func19_CreateIntExpression(global8_Compiler.attr6_Tokens.arrAccess(global8_Compiler.attr11_currentPosi).values[tmpPositionCache].attr4_Line));
		
	} else if (func7_IsToken("CODEFILE$")) {
		func5_Match("CODEFILE$", 574, "src\CompilerPasses\Parser.gbas");
		func5_Match("(", 575, "src\CompilerPasses\Parser.gbas");
		func5_Match(")", 576, "src\CompilerPasses\Parser.gbas");
		return tryClone(func19_CreateStrExpression((((("\"") + (MID_Str(global8_Compiler.attr6_Tokens.arrAccess(global8_Compiler.attr11_currentPosi).values[tmpPositionCache].attr8_Path_Str, 1, -(1))))) + ("\""))));
		
	} else if (func7_IsToken("LEN")) {
		var local4_Expr_2740 = 0, local7_Kerning_2741 = 0;
		func5_Match("LEN", 579, "src\CompilerPasses\Parser.gbas");
		func5_Match("(", 580, "src\CompilerPasses\Parser.gbas");
		local4_Expr_2740 = func10_Expression(0);
		local7_Kerning_2741 = 0;
		if (func7_IsToken(",")) {
			func5_Match(",", 585, "src\CompilerPasses\Parser.gbas");
			local7_Kerning_2741 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 586, 0);
			func5_Match(")", 587, "src\CompilerPasses\Parser.gbas");
			local4_Expr_2740 = func14_EnsureDatatype(local4_Expr_2740, global11_strDatatype, 590, 0);
			return tryClone(func19_CreateLenExpression(local4_Expr_2740, local7_Kerning_2741));
			
		} else {
			func5_Match(")", 594, "src\CompilerPasses\Parser.gbas");
			if ((((global5_Exprs_ref[0].arrAccess(local4_Expr_2740).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0)) {
				if ((((((((((global5_Exprs_ref[0].arrAccess(local4_Expr_2740).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("int")) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(local4_Expr_2740).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("float")) ? 1 : 0))) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(local4_Expr_2740).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("string")) ? 1 : 0))) ? 1 : 0)) {
					local4_Expr_2740 = func14_EnsureDatatype(local4_Expr_2740, global11_strDatatype, 598, 0);
					return tryClone(func19_CreateLenExpression(local4_Expr_2740, -(1)));
					
				} else {
					func5_Error((((("Cannot get the length of Type '") + (global5_Exprs_ref[0].arrAccess(local4_Expr_2740).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) + ("'")), 602, "src\CompilerPasses\Parser.gbas");
					
				};
				
			} else {
				return tryClone(func21_CreateBoundExpression(local4_Expr_2740, func19_CreateIntExpression(0)));
				
			};
			
		};
		
	} else if (func7_IsToken("BOUNDS")) {
		var local4_Expr_2742 = 0, local9_Dimension_2743 = 0;
		func5_Match("BOUNDS", 609, "src\CompilerPasses\Parser.gbas");
		func5_Match("(", 610, "src\CompilerPasses\Parser.gbas");
		local4_Expr_2742 = func10_Expression(0);
		func5_Match(",", 612, "src\CompilerPasses\Parser.gbas");
		if ((((global5_Exprs_ref[0].arrAccess(local4_Expr_2742).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0)) {
			func5_Error("BOUNDS needs array!", 613, "src\CompilerPasses\Parser.gbas");
			
		};
		local9_Dimension_2743 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 614, 0);
		func5_Match(")", 615, "src\CompilerPasses\Parser.gbas");
		return tryClone(func21_CreateBoundExpression(local4_Expr_2742, local9_Dimension_2743));
		
	} else if (func7_IsToken("ADDRESSOF")) {
		var local8_Name_Str_2744 = "", local6_MyFunc_2745 = 0;
		func5_Match("ADDRESSOF", 619, "src\CompilerPasses\Parser.gbas");
		func5_Match("(", 620, "src\CompilerPasses\Parser.gbas");
		local8_Name_Str_2744 = func14_GetCurrent_Str();
		local6_MyFunc_2745 = -(1);
		var forEachSaver27464 = global8_Compiler.attr5_Funcs_ref[0];
		for(var forEachCounter27464 = 0 ; forEachCounter27464 < forEachSaver27464.values.length ; forEachCounter27464++) {
			var local4_Func_ref_2746 = forEachSaver27464.values[forEachCounter27464];
		{
				if ((((((((((local4_Func_ref_2746[0].attr3_Typ) === (1)) ? 1 : 0)) || ((((local4_Func_ref_2746[0].attr3_Typ) === (2)) ? 1 : 0))) ? 1 : 0)) && ((((local4_Func_ref_2746[0].attr8_Name_Str) === (local8_Name_Str_2744)) ? 1 : 0))) ? 1 : 0)) {
					local6_MyFunc_2745 = local4_Func_ref_2746[0].attr2_ID;
					break;
					
				};
				
			}
			forEachSaver27464.values[forEachCounter27464] = local4_Func_ref_2746;
		
		};
		if ((((local6_MyFunc_2745) === (-(1))) ? 1 : 0)) {
			func5_Error((((("Function '") + (local8_Name_Str_2744))) + ("' is unknown!")), 629, "src\CompilerPasses\Parser.gbas");
			
		};
		global8_Compiler.attr5_Funcs_ref[0].arrAccess(local6_MyFunc_2745).values[tmpPositionCache][0].attr10_PlzCompile = 1;
		func7_GetNext();
		func5_Match(")", 632, "src\CompilerPasses\Parser.gbas");
		return tryClone(func25_CreateAddressOfExpression(local6_MyFunc_2745));
		
	} else if (func7_IsToken("NOT")) {
		func5_Match("NOT", 636, "src\CompilerPasses\Parser.gbas");
		return tryClone(func19_CreateNotExpression(func14_EnsureDatatype(func6_Factor(), global13_floatDatatype, 637, 0)));
		
	} else if ((((((((((func7_IsToken("DIM")) || (func7_IsToken("DIM%"))) ? 1 : 0)) || (func7_IsToken("DIM$"))) ? 1 : 0)) || (func7_IsToken("DIM#"))) ? 1 : 0)) {
		var local8_datatype_2748 = pool_TDatatype.alloc(), local4_dims_2749 = pool_array.alloc(0);
		if (((static12_Factor_DIMASEXPRErr) ? 0 : 1)) {
			static12_Factor_DIMASEXPRErr = 1;
			func7_Warning("Experimental feature 'DIMASEXPR'");
			
		};
		local8_datatype_2748.attr7_IsArray = 1;
		local8_datatype_2748.attr8_Name_Str = "float";
		if (func7_IsToken("DIM%")) {
			local8_datatype_2748.attr8_Name_Str = "int";
			
		};
		if (func7_IsToken("DIM$")) {
			local8_datatype_2748.attr8_Name_Str = "string";
			
		};
		if (func7_IsToken("DIM#")) {
			local8_datatype_2748.attr8_Name_Str = "float";
			
		};
		func7_GetNext();
		do {
			var local1_E_2750 = 0;
			func5_Match("[", 654, "src\CompilerPasses\Parser.gbas");
			local1_E_2750 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 655, 0);
			func5_Match("]", 656, "src\CompilerPasses\Parser.gbas");
			DIMPUSH(local4_dims_2749, local1_E_2750);
			
		} while (!((((func7_IsToken("[")) === (0)) ? 1 : 0)));
		if (func7_IsToken("AS")) {
			if ((((local8_datatype_2748.attr8_Name_Str) === ("float")) ? 1 : 0)) {
				func5_Match("AS", 662, "src\CompilerPasses\Parser.gbas");
				func15_IsValidDatatype();
				local8_datatype_2748.attr8_Name_Str = func14_GetCurrent_Str();
				
			} else {
				func5_Error("Unexpected AS", 666, "src\CompilerPasses\Parser.gbas");
				
			};
			
		};
		return tryClone(func25_CreateDimAsExprExpression(local8_datatype_2748, unref(local4_dims_2749)));
		pool_array.free(local4_dims_2749);
	} else if (func7_IsToken("DEFINED")) {
		var local4_Find_2751 = 0;
		func5_Match("DEFINED", 672, "src\CompilerPasses\Parser.gbas");
		func5_Match("(", 673, "src\CompilerPasses\Parser.gbas");
		local4_Find_2751 = 0;
		var forEachSaver27679 = global7_Defines;
		for(var forEachCounter27679 = 0 ; forEachCounter27679 < forEachSaver27679.values.length ; forEachCounter27679++) {
			var local3_Def_2752 = forEachSaver27679.values[forEachCounter27679];
		{
				if ((((func7_IsToken(local3_Def_2752.attr7_Key_Str)) && ((((INTEGER(FLOAT2STR(local3_Def_2752.attr9_Value_Str))) !== (0)) ? 1 : 0))) ? 1 : 0)) {
					local4_Find_2751 = 1;
					break;
					
				};
				
			}
			forEachSaver27679.values[forEachCounter27679] = local3_Def_2752;
		
		};
		func7_GetNext();
		func5_Match(")", 682, "src\CompilerPasses\Parser.gbas");
		return tryClone(func19_CreateIntExpression(local4_Find_2751));
		
	} else if (func7_IsToken("IIF")) {
		var local4_Cond_2753 = 0, local6_onTrue_2754 = 0, local7_onFalse_2755 = 0;
		func5_Match("IIF", 686, "src\CompilerPasses\Parser.gbas");
		func5_Match("(", 687, "src\CompilerPasses\Parser.gbas");
		local4_Cond_2753 = func14_EnsureDatatype(func10_Expression(0), global13_floatDatatype, 689, 0);
		func5_Match(",", 690, "src\CompilerPasses\Parser.gbas");
		local6_onTrue_2754 = func10_Expression(0);
		func5_Match(",", 692, "src\CompilerPasses\Parser.gbas");
		local7_onFalse_2755 = func10_Expression(0);
		func5_Match(")", 694, "src\CompilerPasses\Parser.gbas");
		if (((((((global5_Exprs_ref[0].arrAccess(local6_onTrue_2754).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) !== (global5_Exprs_ref[0].arrAccess(local7_onFalse_2755).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str)) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(local6_onTrue_2754).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) !== (global5_Exprs_ref[0].arrAccess(local7_onFalse_2755).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray)) ? 1 : 0))) ? 1 : 0)) {
			func5_Error("IIF parameters do not match!", 697, "src\CompilerPasses\Parser.gbas");
			
		};
		return tryClone(func19_CreateIIFExpression(local4_Cond_2753, local6_onTrue_2754, local7_onFalse_2755));
		
	} else if (func8_IsDefine("")) {
		func7_GetNext();
		if ((((CAST2STRING(INTEGER(FLOAT2STR(global10_LastDefine.attr9_Value_Str)))) === (global10_LastDefine.attr9_Value_Str)) ? 1 : 0)) {
			return tryClone(func19_CreateIntExpression(INT2STR(global10_LastDefine.attr9_Value_Str)));
			
		} else if (((((((MID_Str(global10_LastDefine.attr9_Value_Str, 0, 1)) === ("\"")) ? 1 : 0)) && ((((MID_Str(global10_LastDefine.attr9_Value_Str, (((global10_LastDefine.attr9_Value_Str).length) - (1)), 1)) === ("\"")) ? 1 : 0))) ? 1 : 0)) {
			return tryClone(func19_CreateStrExpression(global10_LastDefine.attr9_Value_Str));
			
		} else {
			return tryClone(func21_CreateFloatExpression(FLOAT2STR(global10_LastDefine.attr9_Value_Str)));
			
		};
		
	} else {
		if (((global6_STRICT) ? 0 : 1)) {
			func14_ImplicitDefine();
			return tryClone(func10_Identifier(0));
			
		} else {
			func14_ImplicitDefine();
			func5_Error((("Unknown variable/function: ") + (func14_GetCurrent_Str())), 726, "src\CompilerPasses\Parser.gbas");
			
		};
		
	};
	return 0;
	
};
func6_Factor = window['func6_Factor'];
window['func8_FixError'] = function() {
	func7_GetNext();
	if (((func7_IsToken("\n")) ? 0 : 1)) {
		while (((((((func9_IsKeyword()) === (0)) ? 1 : 0)) && ((((func7_IsToken("\n")) === (0)) ? 1 : 0))) ? 1 : 0)) {
			func7_GetNext();
			
		};
		
	};
	return 0;
	
};
func8_FixError = window['func8_FixError'];
window['func6_Parser'] = function() {
	{
		var Err_Str = "";
		try {
			var local5_found_2098 = 0;
			func5_Start();
			func5_Scope("__EOFFILE__", -(1));
			var forEachSaver11406 = global8_Compiler.attr5_Funcs_ref[0];
			for(var forEachCounter11406 = 0 ; forEachCounter11406 < forEachSaver11406.values.length ; forEachCounter11406++) {
				var local4_func_ref_2080 = forEachSaver11406.values[forEachCounter11406];
			{
					if (((((((local4_func_ref_2080[0].attr3_Typ) === (2)) ? 1 : 0)) || ((((local4_func_ref_2080[0].attr3_Typ) === (3)) ? 1 : 0))) ? 1 : 0)) {
						local4_func_ref_2080[0].attr10_PlzCompile = 1;
						
					};
					
				}
				forEachSaver11406.values[forEachCounter11406] = local4_func_ref_2080;
			
			};
			while (1) {
				var local5_Found_2081 = 0;
				local5_Found_2081 = 0;
				var forEachSaver11444 = global8_Compiler.attr5_Funcs_ref[0];
				for(var forEachCounter11444 = 0 ; forEachCounter11444 < forEachSaver11444.values.length ; forEachCounter11444++) {
					var local4_func_ref_2082 = forEachSaver11444.values[forEachCounter11444];
				{
						if ((((local4_func_ref_2082[0].attr10_PlzCompile) && ((((local4_func_ref_2082[0].attr3_Scp) === (-(1))) ? 1 : 0))) ? 1 : 0)) {
							if (func11_CompileFunc(unref(local4_func_ref_2082[0]))) {
								local5_Found_2081 = 1;
								
							};
							
						};
						
					}
					forEachSaver11444.values[forEachCounter11444] = local4_func_ref_2082;
				
				};
				if ((((local5_Found_2081) === (0)) ? 1 : 0)) {
					break;
					
				};
				
			};
			{
				var local1_i_2083 = 0.0;
				for (local1_i_2083 = 0;toCheck(local1_i_2083, ((global10_LastExprID) - (1)), 1);local1_i_2083 += 1) {
					var alias4_Expr_ref_2084 = [pool_TExpr.alloc()];
					alias4_Expr_ref_2084 = global5_Exprs_ref[0].arrAccess(~~(local1_i_2083)).values[tmpPositionCache] /* ALIAS */;
					if (((((((alias4_Expr_ref_2084[0].attr3_Typ) === (6)) ? 1 : 0)) || ((((alias4_Expr_ref_2084[0].attr3_Typ) === (23)) ? 1 : 0))) ? 1 : 0)) {
						if (((((((BOUNDS(alias4_Expr_ref_2084[0].attr6_Params, 0)) < (BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(alias4_Expr_ref_2084[0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0))) ? 1 : 0)) && ((((alias4_Expr_ref_2084[0].attr8_wasAdded) === (0)) ? 1 : 0))) ? 1 : 0)) {
							var local4_Meth_2085 = 0, local7_TmpSave_2086 = 0;
							alias4_Expr_ref_2084[0].attr8_wasAdded = 1;
							local4_Meth_2085 = 0;
							if ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(alias4_Expr_ref_2084[0].attr4_func).values[tmpPositionCache][0].attr3_Typ) === (3)) ? 1 : 0)) {
								if ((((BOUNDS(alias4_Expr_ref_2084[0].attr6_Params, 0)) === (0)) ? 1 : 0)) {
									func5_Error((((("Internal error (method '") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(alias4_Expr_ref_2084[0].attr4_func).values[tmpPositionCache][0].attr8_Name_Str))) + ("' didn't get self parameter)")), 802, "src\CompilerPasses\Parser.gbas");
									
								};
								local4_Meth_2085 = 1;
								local7_TmpSave_2086 = alias4_Expr_ref_2084[0].attr6_Params.arrAccess(-(1)).values[tmpPositionCache];
								DIMDEL(alias4_Expr_ref_2084[0].attr6_Params, -(1));
								
							};
							{
								for (local1_i_2083 = BOUNDS(alias4_Expr_ref_2084[0].attr6_Params, 0);toCheck(local1_i_2083, ((((BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(alias4_Expr_ref_2084[0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0)) - (1))) - (local4_Meth_2085)), 1);local1_i_2083 += 1) {
									if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(alias4_Expr_ref_2084[0].attr4_func).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_i_2083)).values[tmpPositionCache]).values[tmpPositionCache][0].attr6_PreDef) !== (-(1))) ? 1 : 0)) {
										DIMPUSH(alias4_Expr_ref_2084[0].attr6_Params, global8_Compiler.attr5_Varis_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(alias4_Expr_ref_2084[0].attr4_func).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_i_2083)).values[tmpPositionCache]).values[tmpPositionCache][0].attr6_PreDef);
										
									};
									
								};
								
							};
							if (local4_Meth_2085) {
								DIMPUSH(alias4_Expr_ref_2084[0].attr6_Params, local7_TmpSave_2086);
								
							};
							
						};
						
					};
					pool_TExpr.free(alias4_Expr_ref_2084);
				};
				
			};
			func15_CheckPrototypes();
			{
				var local1_i_2087 = 0.0;
				for (local1_i_2087 = 0;toCheck(local1_i_2087, ((global10_LastExprID) - (1)), 1);local1_i_2087 += 1) {
					if (((((((global5_Exprs_ref[0].arrAccess(~~(local1_i_2087)).values[tmpPositionCache][0].attr3_Typ) === (6)) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(~~(local1_i_2087)).values[tmpPositionCache][0].attr3_Typ) === (23)) ? 1 : 0))) ? 1 : 0)) {
						var local4_Meth_2088 = 0;
						local4_Meth_2088 = 0;
						if ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2087)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr3_Typ) === (3)) ? 1 : 0)) {
							local4_Meth_2088 = 1;
							
						};
						global8_Compiler.attr11_currentPosi = global5_Exprs_ref[0].arrAccess(~~(local1_i_2087)).values[tmpPositionCache][0].attr5_tokID;
						if ((((BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2087)).values[tmpPositionCache][0].attr6_Params, 0)) === (BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2087)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0))) ? 1 : 0)) {
							var local1_j_2089 = 0.0, local9_NewParams_2090 = pool_array.alloc(0);
							local1_j_2089 = 0;
							var forEachSaver11871 = global5_Exprs_ref[0].arrAccess(~~(local1_i_2087)).values[tmpPositionCache][0].attr6_Params;
							for(var forEachCounter11871 = 0 ; forEachCounter11871 < forEachSaver11871.values.length ; forEachCounter11871++) {
								var local1_P_2091 = forEachSaver11871.values[forEachCounter11871];
							{
									var local1_S_2092 = 0, local3_Tmp_2093 = 0;
									local1_S_2092 = 0;
									if (global8_Compiler.attr5_Varis_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2087)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_j_2089)).values[tmpPositionCache]).values[tmpPositionCache][0].attr3_ref) {
										global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(local1_P_2091, 1)).values[tmpPositionCache][0].attr3_ref = 1;
										local1_S_2092 = 1;
										
									};
									if (((local1_S_2092) ? 0 : 1)) {
										local3_Tmp_2093 = func14_EnsureDatatype(local1_P_2091, global8_Compiler.attr5_Varis_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2087)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_j_2089)).values[tmpPositionCache]).values[tmpPositionCache][0].attr8_datatype, 851, local1_S_2092);
										
									} else {
										local3_Tmp_2093 = local1_P_2091;
										
									};
									DIMPUSH(local9_NewParams_2090, local3_Tmp_2093);
									local1_j_2089+=1;
									
								}
								forEachSaver11871.values[forEachCounter11871] = local1_P_2091;
							
							};
							global5_Exprs_ref[0].arrAccess(~~(local1_i_2087)).values[tmpPositionCache][0].attr6_Params = local9_NewParams_2090.clone(/* In Assign */);
							pool_array.free(local9_NewParams_2090);
						} else {
							var local8_miss_Str_2094 = "", local9_datas_Str_2095 = "";
							local8_miss_Str_2094 = "";
							if ((((BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2087)).values[tmpPositionCache][0].attr6_Params, 0)) < (BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2087)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0))) ? 1 : 0)) {
								{
									var local1_j_2096 = 0.0;
									for (local1_j_2096 = BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2087)).values[tmpPositionCache][0].attr6_Params, 0);toCheck(local1_j_2096, ((((BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2087)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0)) - (1))) - (local4_Meth_2088)), 1);local1_j_2096 += 1) {
										local8_miss_Str_2094 = ((((local8_miss_Str_2094) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2087)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_j_2096)).values[tmpPositionCache]).values[tmpPositionCache][0].attr8_Name_Str))) + (", "));
										
									};
									
								};
								
							} else if ((((BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2087)).values[tmpPositionCache][0].attr6_Params, 0)) > (BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2087)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0))) ? 1 : 0)) {
								{
									var local1_j_2097 = 0.0;
									for (local1_j_2097 = BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2087)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0);toCheck(local1_j_2097, ((((BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2087)).values[tmpPositionCache][0].attr6_Params, 0)) - (local4_Meth_2088))) - (1)), 1);local1_j_2097 += 1) {
										if ((((global5_Exprs_ref[0].arrAccess(~~(local1_i_2087)).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_j_2097)).values[tmpPositionCache]) < (BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0))) ? 1 : 0)) {
											local9_datas_Str_2095 = ((((local9_datas_Str_2095) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2087)).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_j_2097)).values[tmpPositionCache]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) + (", "));
											
										};
										
									};
									
								};
								
							};
							global8_Compiler.attr11_currentPosi = global5_Exprs_ref[0].arrAccess(~~(local1_i_2087)).values[tmpPositionCache][0].attr5_tokID;
							if ((((BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2087)).values[tmpPositionCache][0].attr6_Params, 0)) > (BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2087)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0))) ? 1 : 0)) {
								func5_Error((((((((((((((((("Too many parameters, function '") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2087)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr8_Name_Str))) + ("' has: '"))) + (CAST2STRING(((BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2087)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0)) - (local4_Meth_2088)))))) + ("' got '"))) + (CAST2STRING(BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2087)).values[tmpPositionCache][0].attr6_Params, 0))))) + ("' datatypes '"))) + (local9_datas_Str_2095))) + ("'")), 874, "src\CompilerPasses\Parser.gbas");
								
							} else if ((((BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2087)).values[tmpPositionCache][0].attr6_Params, 0)) < (BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2087)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0))) ? 1 : 0)) {
								func5_Error((((((((((((((((("Too less parameters, function '") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2087)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr8_Name_Str))) + ("' has: '"))) + (CAST2STRING(((BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2087)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0)) - (local4_Meth_2088)))))) + ("' got '"))) + (CAST2STRING(BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2087)).values[tmpPositionCache][0].attr6_Params, 0))))) + ("' missing '"))) + (local8_miss_Str_2094))) + ("'")), 876, "src\CompilerPasses\Parser.gbas");
								
							} else {
								func5_Error((((((((("Internal error (wtf? call: ") + (CAST2STRING(BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2087)).values[tmpPositionCache][0].attr6_Params, 0))))) + (", "))) + (CAST2STRING(BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2087)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0))))) + (")")), 878, "src\CompilerPasses\Parser.gbas");
								
							};
							
						};
						
					};
					
				};
				
			};
			func15_CheckPrototypes();
			local5_found_2098 = 1;
			while (local5_found_2098) {
				local5_found_2098 = 0;
				{
					var local1_i_2099 = 0.0;
					for (local1_i_2099 = 0;toCheck(local1_i_2099, ((global10_LastExprID) - (1)), 1);local1_i_2099 += 1) {
						var alias1_E_ref_2100 = [pool_TExpr.alloc()], local3_set_2101 = 0, local4_Vari_2102 = 0, local3_var_2103 = 0;
						alias1_E_ref_2100 = global5_Exprs_ref[0].arrAccess(~~(local1_i_2099)).values[tmpPositionCache] /* ALIAS */;
						local3_set_2101 = 0;
						{
							var local17___SelectHelper14__2104 = 0;
							local17___SelectHelper14__2104 = alias1_E_ref_2100[0].attr3_Typ;
							if ((((local17___SelectHelper14__2104) === (~~(40))) ? 1 : 0)) {
								local4_Vari_2102 = alias1_E_ref_2100[0].attr4_vari;
								local3_var_2103 = func11_GetVariable(alias1_E_ref_2100[0].attr4_expr, 0);
								local3_set_2101 = 1;
								
							} else if ((((local17___SelectHelper14__2104) === (~~(38))) ? 1 : 0)) {
								local4_Vari_2102 = alias1_E_ref_2100[0].attr6_inExpr;
								local3_var_2103 = func11_GetVariable(alias1_E_ref_2100[0].attr7_varExpr, 0);
								local3_set_2101 = 1;
								
							} else if ((((local17___SelectHelper14__2104) === (~~(6))) ? 1 : 0)) {
								
							};
							
						};
						if ((((local3_set_2101) && ((((local3_var_2103) >= (0)) ? 1 : 0))) ? 1 : 0)) {
							var local1_v_2105 = 0;
							local1_v_2105 = func11_GetVariable(local4_Vari_2102, 1);
							if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_var_2103).values[tmpPositionCache][0].attr3_ref) !== (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_v_2105).values[tmpPositionCache][0].attr3_ref)) ? 1 : 0)) {
								local5_found_2098 = 1;
								
							};
							global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_var_2103).values[tmpPositionCache][0].attr3_ref = global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_v_2105).values[tmpPositionCache][0].attr3_ref;
							
						};
						pool_TExpr.free(alias1_E_ref_2100);
					};
					
				};
				
			};
			{
				var local1_i_2106 = 0.0;
				for (local1_i_2106 = 0;toCheck(local1_i_2106, ((global10_LastExprID) - (1)), 1);local1_i_2106 += 1) {
					var alias4_Expr_ref_2107 = [pool_TExpr.alloc()];
					alias4_Expr_ref_2107 = global5_Exprs_ref[0].arrAccess(~~(local1_i_2106)).values[tmpPositionCache] /* ALIAS */;
					{
						var local17___SelectHelper15__2108 = 0;
						local17___SelectHelper15__2108 = alias4_Expr_ref_2107[0].attr3_Typ;
						if ((((local17___SelectHelper15__2108) === (~~(2))) ? 1 : 0)) {
							if ((((((((((alias4_Expr_ref_2107[0].attr6_ScpTyp) === (2)) ? 1 : 0)) || ((((alias4_Expr_ref_2107[0].attr6_ScpTyp) === (4)) ? 1 : 0))) ? 1 : 0)) && (BOUNDS(alias4_Expr_ref_2107[0].attr5_Gotos, 0))) ? 1 : 0)) {
								if (((func12_ScopeHasGoto(unref(alias4_Expr_ref_2107[0]))) ? 0 : 1)) {
									func5_Error("Internal Error (There is a goto, but I can't find it)", 941, "src\CompilerPasses\Parser.gbas");
									
								};
								var forEachSaver12556 = alias4_Expr_ref_2107[0].attr5_Gotos;
								for(var forEachCounter12556 = 0 ; forEachCounter12556 < forEachSaver12556.values.length ; forEachCounter12556++) {
									var local1_G_2109 = forEachSaver12556.values[forEachCounter12556];
								{
										var local5_Found_2110 = 0;
										local5_Found_2110 = 0;
										var forEachSaver12529 = alias4_Expr_ref_2107[0].attr6_Labels;
										for(var forEachCounter12529 = 0 ; forEachCounter12529 < forEachSaver12529.values.length ; forEachCounter12529++) {
											var local1_L_2111 = forEachSaver12529.values[forEachCounter12529];
										{
												if ((((global5_Exprs_ref[0].arrAccess(local1_L_2111).values[tmpPositionCache][0].attr8_Name_Str) === (global5_Exprs_ref[0].arrAccess(local1_G_2109).values[tmpPositionCache][0].attr8_Name_Str)) ? 1 : 0)) {
													local5_Found_2110 = 1;
													break;
													
												};
												
											}
											forEachSaver12529.values[forEachCounter12529] = local1_L_2111;
										
										};
										if (((local5_Found_2110) ? 0 : 1)) {
											global8_Compiler.attr11_currentPosi = global5_Exprs_ref[0].arrAccess(local1_G_2109).values[tmpPositionCache][0].attr5_tokID;
											func5_Error((((("Label '") + (global5_Exprs_ref[0].arrAccess(local1_G_2109).values[tmpPositionCache][0].attr8_Name_Str))) + ("' does not exist, please use an existing label badass!")), 952, "src\CompilerPasses\Parser.gbas");
											
										};
										
									}
									forEachSaver12556.values[forEachCounter12556] = local1_G_2109;
								
								};
								
							};
							
						};
						
					};
					pool_TExpr.free(alias4_Expr_ref_2107);
				};
				
			};
			var forEachSaver12582 = global8_Compiler.attr5_Types_ref[0];
			for(var forEachCounter12582 = 0 ; forEachCounter12582 < forEachSaver12582.values.length ; forEachCounter12582++) {
				var local3_Typ_ref_2112 = forEachSaver12582.values[forEachCounter12582];
			{
					local3_Typ_ref_2112[0].attr9_OName_Str = local3_Typ_ref_2112[0].attr8_Name_Str;
					local3_Typ_ref_2112[0].attr8_Name_Str = func18_ChangeTypeName_Str(local3_Typ_ref_2112[0].attr8_Name_Str);
					
				}
				forEachSaver12582.values[forEachCounter12582] = local3_Typ_ref_2112;
			
			};
			var forEachSaver12592 = global8_Compiler.attr5_Funcs_ref[0];
			for(var forEachCounter12592 = 0 ; forEachCounter12592 < forEachSaver12592.values.length ; forEachCounter12592++) {
				var local4_Func_ref_2113 = forEachSaver12592.values[forEachCounter12592];
			{
					func14_ChangeFuncName(unref(local4_Func_ref_2113[0]));
					
				}
				forEachSaver12592.values[forEachCounter12592] = local4_Func_ref_2113;
			
			};
			var forEachSaver12602 = global8_Compiler.attr5_Varis_ref[0];
			for(var forEachCounter12602 = 0 ; forEachCounter12602 < forEachSaver12602.values.length ; forEachCounter12602++) {
				var local4_Vari_ref_2114 = forEachSaver12602.values[forEachCounter12602];
			{
					func13_ChangeVarName(unref(local4_Vari_ref_2114[0]));
					
				}
				forEachSaver12602.values[forEachCounter12602] = local4_Vari_ref_2114;
			
			};
			var forEachSaver12638 = global8_Compiler.attr5_Varis_ref[0];
			for(var forEachCounter12638 = 0 ; forEachCounter12638 < forEachSaver12638.values.length ; forEachCounter12638++) {
				var local1_V_ref_2115 = forEachSaver12638.values[forEachCounter12638];
			{
					if (((((((local1_V_ref_2115[0].attr3_Typ) === (1)) ? 1 : 0)) || ((((local1_V_ref_2115[0].attr3_Typ) === (7)) ? 1 : 0))) ? 1 : 0)) {
						local1_V_ref_2115[0].attr8_Name_Str = ((((local1_V_ref_2115[0].attr8_Name_Str) + ("_"))) + (CAST2STRING(local1_V_ref_2115[0].attr2_ID)));
						
					};
					
				}
				forEachSaver12638.values[forEachCounter12638] = local1_V_ref_2115;
			
			};
			{
				var local1_i_2116 = 0.0;
				for (local1_i_2116 = 0;toCheck(local1_i_2116, ((global10_LastExprID) - (1)), 1);local1_i_2116 += 1) {
					var alias1_E_ref_2117 = [pool_TExpr.alloc()];
					alias1_E_ref_2117 = global5_Exprs_ref[0].arrAccess(~~(local1_i_2116)).values[tmpPositionCache] /* ALIAS */;
					if (((((((((((((alias1_E_ref_2117[0].attr8_datatype.attr8_Name_Str) === ("void")) ? 1 : 0)) || ((((alias1_E_ref_2117[0].attr8_datatype.attr8_Name_Str) === ("int")) ? 1 : 0))) ? 1 : 0)) || ((((alias1_E_ref_2117[0].attr8_datatype.attr8_Name_Str) === ("float")) ? 1 : 0))) ? 1 : 0)) || ((((alias1_E_ref_2117[0].attr8_datatype.attr8_Name_Str) === ("string")) ? 1 : 0))) ? 1 : 0)) {
						
					} else {
						if ((((func6_IsType(alias1_E_ref_2117[0].attr8_datatype.attr8_Name_Str)) === (0)) ? 1 : 0)) {
							var forEachSaver12729 = global8_Compiler.attr5_Funcs_ref[0];
							for(var forEachCounter12729 = 0 ; forEachCounter12729 < forEachSaver12729.values.length ; forEachCounter12729++) {
								var local1_F_ref_2118 = forEachSaver12729.values[forEachCounter12729];
							{
									if ((((alias1_E_ref_2117[0].attr8_datatype.attr8_Name_Str) === (local1_F_ref_2118[0].attr9_OName_Str)) ? 1 : 0)) {
										alias1_E_ref_2117[0].attr8_datatype.attr8_Name_Str = local1_F_ref_2118[0].attr8_Name_Str;
										
									};
									
								}
								forEachSaver12729.values[forEachCounter12729] = local1_F_ref_2118;
							
							};
							
						};
						
					};
					pool_TExpr.free(alias1_E_ref_2117);
				};
				
			};
			func23_ManageFuncParamOverlaps();
			
		} catch (Err_Str) {
			if (Err_Str instanceof OTTException) Err_Str = Err_Str.getText(); else throwError(Err_Str);{
				
			}
		};
		
	};
	return 0;
	
};
func6_Parser = window['func6_Parser'];
window['func15_CheckPrototypes'] = function() {
	if ((((BOUNDS(global8_Compiler.attr13_protoCheckers, 0)) > (0)) ? 1 : 0)) {
		var forEachSaver12918 = global8_Compiler.attr13_protoCheckers;
		for(var forEachCounter12918 = 0 ; forEachCounter12918 < forEachSaver12918.values.length ; forEachCounter12918++) {
			var local7_checker_2120 = forEachSaver12918.values[forEachCounter12918];
		{
				var alias5_func1_ref_2121 = [pool_TIdentifierFunc.alloc()], alias5_func2_ref_2122 = [pool_TIdentifierFunc.alloc()], local5_valid_2123 = 0;
				alias5_func1_ref_2121 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(local7_checker_2120.attr8_fromFunc).values[tmpPositionCache] /* ALIAS */;
				alias5_func2_ref_2122 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(local7_checker_2120.attr6_toFunc).values[tmpPositionCache] /* ALIAS */;
				local5_valid_2123 = 0;
				if (((((((alias5_func1_ref_2121[0].attr8_datatype.attr8_Name_Str) === (alias5_func2_ref_2122[0].attr8_datatype.attr8_Name_Str)) ? 1 : 0)) && ((((alias5_func1_ref_2121[0].attr8_datatype.attr7_IsArray) === (alias5_func2_ref_2122[0].attr8_datatype.attr7_IsArray)) ? 1 : 0))) ? 1 : 0)) {
					if ((((BOUNDS(alias5_func1_ref_2121[0].attr6_Params, 0)) === (BOUNDS(alias5_func2_ref_2122[0].attr6_Params, 0))) ? 1 : 0)) {
						local5_valid_2123 = 1;
						{
							var local1_i_2124 = 0.0;
							for (local1_i_2124 = 0;toCheck(local1_i_2124, ((BOUNDS(alias5_func1_ref_2121[0].attr6_Params, 0)) - (1)), 1);local1_i_2124 += 1) {
								var alias2_p1_ref_2125 = [pool_TIdentifierVari.alloc()], alias2_p2_ref_2126 = [pool_TIdentifierVari.alloc()];
								alias2_p1_ref_2125 = global8_Compiler.attr5_Varis_ref[0].arrAccess(alias5_func1_ref_2121[0].attr6_Params.arrAccess(~~(local1_i_2124)).values[tmpPositionCache]).values[tmpPositionCache] /* ALIAS */;
								alias2_p2_ref_2126 = global8_Compiler.attr5_Varis_ref[0].arrAccess(alias5_func2_ref_2122[0].attr6_Params.arrAccess(~~(local1_i_2124)).values[tmpPositionCache]).values[tmpPositionCache] /* ALIAS */;
								if (((((((alias2_p1_ref_2125[0].attr8_datatype.attr8_Name_Str) !== (alias2_p2_ref_2126[0].attr8_datatype.attr8_Name_Str)) ? 1 : 0)) || ((((alias2_p1_ref_2125[0].attr8_datatype.attr7_IsArray) !== (alias2_p2_ref_2126[0].attr8_datatype.attr7_IsArray)) ? 1 : 0))) ? 1 : 0)) {
									local5_valid_2123 = 0;
									
								};
								pool_TIdentifierVari.free(alias2_p1_ref_2125);pool_TIdentifierVari.free(alias2_p2_ref_2126);
							};
							
						};
						
					};
					
				};
				if ((((local5_valid_2123) === (0)) ? 1 : 0)) {
					func5_Error((((((((("Cannot cast prototype '") + (func17_BuildPrototyp_Str(local7_checker_2120.attr8_fromFunc)))) + ("' to '"))) + (func17_BuildPrototyp_Str(local7_checker_2120.attr6_toFunc)))) + ("'")), 1036, "src\CompilerPasses\Parser.gbas");
					
				};
				pool_TIdentifierFunc.free(alias5_func1_ref_2121);pool_TIdentifierFunc.free(alias5_func2_ref_2122);
			}
			forEachSaver12918.values[forEachCounter12918] = local7_checker_2120;
		
		};
		REDIM(global8_Compiler.attr13_protoCheckers, [0], pool_TProtoChecker.alloc() );
		
	};
	return 0;
	
};
func15_CheckPrototypes = window['func15_CheckPrototypes'];
window['func5_Scope'] = function(param12_CloseStr_Str, param4_func) {
	var local6_ScpTyp_2129 = 0, local9_Important_2130 = 0, local7_befLoop_2132 = 0, local8_TmpScope_2133 = 0.0, local12_TmpImportant_2134 = 0, local7_OneLine_2137 = 0, local13_OCloseStr_Str_2138 = "", local7_MyScope_2145 = 0;
	var local12_CloseStr_Str_ref_2127 = [param12_CloseStr_Str];
	local6_ScpTyp_2129 = 0;
	local9_Important_2130 = 0;
	{
		var local17___SelectHelper16__2131 = "";
		local17___SelectHelper16__2131 = local12_CloseStr_Str_ref_2127[0];
		if ((((local17___SelectHelper16__2131) === ("ENDIF")) ? 1 : 0)) {
			local6_ScpTyp_2129 = ~~(1);
			
		} else if ((((local17___SelectHelper16__2131) === ("ENDSELECT")) ? 1 : 0)) {
			local6_ScpTyp_2129 = ~~(6);
			
		} else if ((((local17___SelectHelper16__2131) === ("WEND")) ? 1 : 0)) {
			local6_ScpTyp_2129 = ~~(3);
			
		} else if ((((local17___SelectHelper16__2131) === ("UNTIL")) ? 1 : 0)) {
			local6_ScpTyp_2129 = ~~(3);
			
		} else if ((((local17___SelectHelper16__2131) === ("NEXT")) ? 1 : 0)) {
			local6_ScpTyp_2129 = ~~(3);
			
		} else if ((((local17___SelectHelper16__2131) === ("ENDFUNCTION")) ? 1 : 0)) {
			local6_ScpTyp_2129 = ~~(2);
			local9_Important_2130 = 1;
			
		} else if ((((local17___SelectHelper16__2131) === ("ENDSUB")) ? 1 : 0)) {
			local6_ScpTyp_2129 = ~~(2);
			local9_Important_2130 = 1;
			
		} else if ((((local17___SelectHelper16__2131) === ("CATCH")) ? 1 : 0)) {
			local6_ScpTyp_2129 = ~~(5);
			
		} else if ((((local17___SelectHelper16__2131) === ("FINALLY")) ? 1 : 0)) {
			local6_ScpTyp_2129 = ~~(5);
			
		} else if ((((local17___SelectHelper16__2131) === ("__EOFFILE__")) ? 1 : 0)) {
			local6_ScpTyp_2129 = ~~(4);
			local9_Important_2130 = 1;
			
		} else {
			func5_Error("Internal error (unknown scope type)", 1073, "src\CompilerPasses\Parser.gbas");
			
		};
		
	};
	local7_befLoop_2132 = global8_Compiler.attr6_inLoop;
	if ((((local6_ScpTyp_2129) === (3)) ? 1 : 0)) {
		global8_Compiler.attr6_inLoop = 1;
		
	};
	local8_TmpScope_2133 = global8_Compiler.attr12_CurrentScope;
	local12_TmpImportant_2134 = global8_Compiler.attr14_ImportantScope;
	global8_Compiler.attr12_CurrentScope = func21_CreateScopeExpression(local6_ScpTyp_2129);
	if ((((local12_CloseStr_Str_ref_2127[0]) === ("__EOFFILE__")) ? 1 : 0)) {
		global8_Compiler.attr9_MainScope = global8_Compiler.attr12_CurrentScope;
		
	};
	if (local9_Important_2130) {
		global8_Compiler.attr14_ImportantScope = global8_Compiler.attr12_CurrentScope;
		
	};
	if (((((((local6_ScpTyp_2129) === (2)) ? 1 : 0)) && ((((param4_func) !== (-(1))) ? 1 : 0))) ? 1 : 0)) {
		var forEachSaver13148 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr6_Params;
		for(var forEachCounter13148 = 0 ; forEachCounter13148 < forEachSaver13148.values.length ; forEachCounter13148++) {
			var local5_param_2135 = forEachSaver13148.values[forEachCounter13148];
		{
				var local4_vari_2136 = pool_TIdentifierVari.alloc();
				local4_vari_2136 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local5_param_2135).values[tmpPositionCache][0].clone(/* In Assign */);
				local4_vari_2136.attr3_Typ = ~~(1);
				func11_AddVariable(local4_vari_2136, 1);
				DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
				DIMPUSH(global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr10_CopyParams, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
				pool_TIdentifierVari.free(local4_vari_2136);
			}
			forEachSaver13148.values[forEachCounter13148] = local5_param_2135;
		
		};
		
	};
	local7_OneLine_2137 = 0;
	if (func7_IsToken("THEN")) {
		local7_OneLine_2137 = 1;
		func5_Match("THEN", 1102, "src\CompilerPasses\Parser.gbas");
		
	};
	local13_OCloseStr_Str_2138 = local12_CloseStr_Str_ref_2127[0];
	while ((((func7_IsToken(func13_IsClosing_Str(local12_CloseStr_Str_ref_2127, local6_ScpTyp_2129))) === (0)) ? 1 : 0)) {
		if ((((func8_EOFParse()) === (0)) ? 1 : 0)) {
			func5_Error((("Missing closing: ") + (local12_CloseStr_Str_ref_2127[0])), 1106, "src\CompilerPasses\Parser.gbas");
			
		};
		{
			var Err_Str = "";
			try {
				var local4_Expr_2139 = 0;
				local4_Expr_2139 = -(1);
				if (func7_IsToken("LET")) {
					func5_Match("LET", 1113, "src\CompilerPasses\Parser.gbas");
					if ((((func12_IsIdentifier(0, 0)) === (0)) ? 1 : 0)) {
						func5_Error("Expecting identifier after LET.", 1115, "src\CompilerPasses\Parser.gbas");
						
					};
					
				};
				if (func7_IsToken("GOSUB")) {
					func5_Match("GOSUB", 1119, "src\CompilerPasses\Parser.gbas");
					if ((((func14_IsFuncExisting(func14_GetCurrent_Str(), 0)) === (0)) ? 1 : 0)) {
						func5_Error("Expecting sub after GOSUB.", 1121, "src\CompilerPasses\Parser.gbas");
						
					};
					
				};
				if (func9_IsKeyword()) {
					local4_Expr_2139 = func7_Keyword();
					
				} else if (func12_IsIdentifier(1, 0)) {
					local4_Expr_2139 = func10_Identifier(1);
					
				} else if (func7_IsToken("super")) {
					local4_Expr_2139 = func10_Identifier(1);
					
				} else {
					var local3_pos_2140 = 0, local8_Name_Str_2141 = "";
					local3_pos_2140 = global8_Compiler.attr11_currentPosi;
					local8_Name_Str_2141 = REPLACE_Str(func14_GetCurrent_Str(), "@", "");
					func7_GetNext();
					if (func7_IsToken(":")) {
						var local3_Scp_2142 = 0;
						func5_Match(":", 1137, "src\CompilerPasses\Parser.gbas");
						local4_Expr_2139 = func21_CreateLabelExpression(local8_Name_Str_2141);
						local3_Scp_2142 = global8_Compiler.attr12_CurrentScope;
						do {
							var forEachSaver13323 = global5_Exprs_ref[0].arrAccess(local3_Scp_2142).values[tmpPositionCache][0].attr6_Labels;
							for(var forEachCounter13323 = 0 ; forEachCounter13323 < forEachSaver13323.values.length ; forEachCounter13323++) {
								var local3_lbl_2143 = forEachSaver13323.values[forEachCounter13323];
							{
									if ((((global5_Exprs_ref[0].arrAccess(local3_lbl_2143).values[tmpPositionCache][0].attr8_Name_Str) === (local8_Name_Str_2141)) ? 1 : 0)) {
										func10_ResetError((((("Duplicate label identifier '") + (local8_Name_Str_2141))) + ("'")), local3_pos_2140);
										
									};
									
								}
								forEachSaver13323.values[forEachCounter13323] = local3_lbl_2143;
							
							};
							local3_Scp_2142 = global5_Exprs_ref[0].arrAccess(local3_Scp_2142).values[tmpPositionCache][0].attr10_SuperScope;
							
						} while (!(((((((local3_Scp_2142) === (-(1))) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(local3_Scp_2142).values[tmpPositionCache][0].attr6_ScpTyp) === (2)) ? 1 : 0))) ? 1 : 0)));
						DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr14_ImportantScope).values[tmpPositionCache][0].attr6_Labels, local4_Expr_2139);
						
					} else {
						if (func7_IsToken("[")) {
							func5_Match("[", 1152, "src\CompilerPasses\Parser.gbas");
							func5_Match("]", 1153, "src\CompilerPasses\Parser.gbas");
							
						};
						if ((((func7_IsToken("=")) && (((global6_STRICT) ? 0 : 1))) ? 1 : 0)) {
							global8_Compiler.attr11_currentPosi = ((local3_pos_2140) - (1));
							func7_GetNext();
							func14_ImplicitDefine();
							if (func12_IsIdentifier(0, 0)) {
								local4_Expr_2139 = func10_Identifier(1);
								
							} else {
								func5_Error("Internal error (implicit not created)", 1165, "src\CompilerPasses\Parser.gbas");
								
							};
							
						} else {
							func10_ResetError("Invalid command (unknown function, variable or keyword).", local3_pos_2140);
							
						};
						
					};
					
				};
				if ((((local4_Expr_2139) !== (-(1))) ? 1 : 0)) {
					DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local4_Expr_2139);
					
				};
				if (local7_OneLine_2137) {
					break;
					
				};
				do {
					func5_Match("\n", 1178, "src\CompilerPasses\Parser.gbas");
					
				} while (!((((func7_IsToken("\n")) === (0)) ? 1 : 0)));
				
			} catch (Err_Str) {
				if (Err_Str instanceof OTTException) Err_Str = Err_Str.getText(); else throwError(Err_Str);{
					func8_FixError();
					
				}
			};
			
		};
		
	};
	if (((((((local7_OneLine_2137) === (0)) ? 1 : 0)) && ((((local12_CloseStr_Str_ref_2127[0]) === (local13_OCloseStr_Str_2138)) ? 1 : 0))) ? 1 : 0)) {
		func5_Match(unref(local12_CloseStr_Str_ref_2127[0]), 1186, "src\CompilerPasses\Parser.gbas");
		
	};
	local7_MyScope_2145 = global8_Compiler.attr12_CurrentScope;
	global8_Compiler.attr12_CurrentScope = ~~(local8_TmpScope_2133);
	global8_Compiler.attr6_inLoop = local7_befLoop_2132;
	if (local9_Important_2130) {
		global8_Compiler.attr14_ImportantScope = local12_TmpImportant_2134;
		
	};
	return tryClone(local7_MyScope_2145);
	return 0;
	
};
func5_Scope = window['func5_Scope'];
window['func10_ResetError'] = function(param7_err_Str, param3_pos) {
	var local3_tmp_2148 = 0.0;
	local3_tmp_2148 = global8_Compiler.attr11_currentPosi;
	global8_Compiler.attr11_currentPosi = param3_pos;
	{
		var Ex_Str = "";
		try {
			func5_Error(param7_err_Str, 1203, "src\CompilerPasses\Parser.gbas");
			
		} catch (Ex_Str) {
			if (Ex_Str instanceof OTTException) Ex_Str = Ex_Str.getText(); else throwError(Ex_Str);{
				global8_Compiler.attr11_currentPosi = ~~(local3_tmp_2148);
				throw new OTTException(Ex_Str, "\src\CompilerPasses\Parser.gbas", 1207);
				
			}
		};
		
	};
	return 0;
	
};
func10_ResetError = window['func10_ResetError'];
window['func13_IsClosing_Str'] = function(param12_CloseStr_Str_ref, param6_ScpTyp) {
	{
		var local17___SelectHelper17__2152 = 0;
		local17___SelectHelper17__2152 = param6_ScpTyp;
		if ((((local17___SelectHelper17__2152) === (~~(1))) ? 1 : 0)) {
			if (func7_IsToken("ELSE")) {
				param12_CloseStr_Str_ref[0] = "ELSE";
				
			};
			if (func7_IsToken("ELSEIF")) {
				param12_CloseStr_Str_ref[0] = "ELSEIF";
				
			};
			
		} else if ((((local17___SelectHelper17__2152) === (~~(6))) ? 1 : 0)) {
			if (func7_IsToken("CASE")) {
				param12_CloseStr_Str_ref[0] = "CASE";
				
			};
			if (func7_IsToken("DEFAULT")) {
				param12_CloseStr_Str_ref[0] = "DEFAULT";
				
			};
			
		};
		
	};
	return tryClone(unref(param12_CloseStr_Str_ref[0]));
	return "";
	
};
func13_IsClosing_Str = window['func13_IsClosing_Str'];
window['func10_Identifier'] = function(param9_IsCommand) {
	var local9_PreferVar_2154 = 0, local4_Expr_ref_2155 = [0], local5_IsAcc_2156 = 0;
	local9_PreferVar_2154 = 0;
	if ((((func7_IsToken("LOCAL")) && ((((param9_IsCommand) === (0)) ? 1 : 0))) ? 1 : 0)) {
		local9_PreferVar_2154 = 1;
		
	};
	if ((((func7_IsToken("GLOBAL")) && ((((param9_IsCommand) === (0)) ? 1 : 0))) ? 1 : 0)) {
		local9_PreferVar_2154 = -(1);
		
	};
	if ((((local9_PreferVar_2154) !== (0)) ? 1 : 0)) {
		func7_GetNext();
		
	};
	local4_Expr_ref_2155[0] = -(1);
	local5_IsAcc_2156 = 0;
	if (func7_IsToken("super")) {
		func5_Match("super", 1236, "src\CompilerPasses\Parser.gbas");
		if (((((((global8_Compiler.attr11_currentFunc) !== (-(1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType) !== (-(1))) ? 1 : 0))) ? 1 : 0)) {
			var local3_typ_2157 = 0;
			local3_typ_2157 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType;
			if ((((global8_Compiler.attr5_Types_ref[0].arrAccess(local3_typ_2157).values[tmpPositionCache][0].attr9_Extending) !== (-(1))) ? 1 : 0)) {
				local4_Expr_ref_2155[0] = func21_CreateSuperExpression(global8_Compiler.attr5_Types_ref[0].arrAccess(local3_typ_2157).values[tmpPositionCache][0].attr9_Extending);
				func5_Match(".", 1241, "src\CompilerPasses\Parser.gbas");
				local5_IsAcc_2156 = 1;
				
			} else {
				func5_Error("There is no super class/type", 1244, "src\CompilerPasses\Parser.gbas");
				
			};
			
		} else {
			func5_Error("Super has to be in method", 1247, "src\CompilerPasses\Parser.gbas");
			
		};
		
	};
	if ((((func6_IsType("")) && (((func12_IsIdentifier(0, 0)) ? 0 : 1))) ? 1 : 0)) {
		var local4_posi_2158 = 0.0, local7_typ_Str_2159 = "";
		local4_posi_2158 = global8_Compiler.attr11_currentPosi;
		local7_typ_Str_2159 = func14_GetCurrent_Str();
		func7_GetNext();
		if (func7_IsToken("(")) {
			func5_Match("(", 1256, "src\CompilerPasses\Parser.gbas");
			local4_Expr_ref_2155[0] = func10_Expression(0);
			func5_Match(")", 1258, "src\CompilerPasses\Parser.gbas");
			if ((((func6_IsType(global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2155[0]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str)) && ((((global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2155[0]).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0))) ? 1 : 0)) {
				local4_Expr_ref_2155[0] = func14_CreateCast2Obj(local7_typ_Str_2159, unref(local4_Expr_ref_2155[0]));
				if (func7_IsToken(".")) {
					func5_Match(".", 1262, "src\CompilerPasses\Parser.gbas");
					local5_IsAcc_2156 = 1;
					
				} else {
					return tryClone(unref(local4_Expr_ref_2155[0]));
					
				};
				
			} else {
				func5_Error("Cannot cast non TYPE or array", 1268, "src\CompilerPasses\Parser.gbas");
				
			};
			
		} else {
			global8_Compiler.attr11_currentPosi = ~~(local4_posi_2158);
			
		};
		
	};
	do {
		var local8_Name_Str_2160 = "", local9_SuperExpr_ref_2161 = [0], local5_Varis_2162 = pool_array.alloc(0), local5_Found_2163 = 0;
		local8_Name_Str_2160 = func17_CleanVariable_Str(func14_GetCurrent_Str());
		func7_GetNext();
		if ((((func7_IsToken("%")) || (func7_IsToken("%"))) ? 1 : 0)) {
			func7_GetNext();
			
		};
		local9_SuperExpr_ref_2161[0] = local4_Expr_ref_2155[0];
		if ((((local4_Expr_ref_2155[0]) === (-(1))) ? 1 : 0)) {
			func8_GetVaris(unref(local5_Varis_2162), -(1), local9_PreferVar_2154);
			local9_PreferVar_2154 = 0;
			
		} else {
			if ((((func6_IsType(global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2155[0]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str)) === (0)) ? 1 : 0)) {
				func5_Error((((("Expecting type, got primitive datatype '") + (global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2155[0]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) + ("'")), 1293, "src\CompilerPasses\Parser.gbas");
				
			};
			local5_Varis_2162 = global8_LastType.attr10_Attributes.clone(/* In Assign */);
			
		};
		local5_Found_2163 = 0;
		var forEachSaver14063 = local5_Varis_2162;
		for(var forEachCounter14063 = 0 ; forEachCounter14063 < forEachSaver14063.values.length ; forEachCounter14063++) {
			var local4_Vari_2164 = forEachSaver14063.values[forEachCounter14063];
		{
				if ((((local8_Name_Str_2160) === (global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Vari_2164).values[tmpPositionCache][0].attr8_Name_Str)) ? 1 : 0)) {
					if ((((((((((global8_Compiler.attr11_currentFunc) !== (-(1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType) !== (-(1))) ? 1 : 0))) ? 1 : 0)) && ((((local4_Expr_ref_2155[0]) === (-(1))) ? 1 : 0))) ? 1 : 0)) {
						var local13_IsNotImplicit_2165 = 0;
						local13_IsNotImplicit_2165 = 0;
						var forEachSaver14004 = local5_Varis_2162;
						for(var forEachCounter14004 = 0 ; forEachCounter14004 < forEachSaver14004.values.length ; forEachCounter14004++) {
							var local9_OtherVari_2166 = forEachSaver14004.values[forEachCounter14004];
						{
								if ((((((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local9_OtherVari_2166).values[tmpPositionCache][0].attr8_Name_Str) === (local8_Name_Str_2160)) ? 1 : 0)) && ((((((((((((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local9_OtherVari_2166).values[tmpPositionCache][0].attr3_Typ) === (1)) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local9_OtherVari_2166).values[tmpPositionCache][0].attr3_Typ) === (5)) ? 1 : 0))) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local9_OtherVari_2166).values[tmpPositionCache][0].attr3_Typ) === (4)) ? 1 : 0))) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local9_OtherVari_2166).values[tmpPositionCache][0].attr3_Typ) === (7)) ? 1 : 0))) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local9_OtherVari_2166).values[tmpPositionCache][0].attr3_Typ) === (6)) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) && ((((local9_OtherVari_2166) !== (local4_Vari_2164)) ? 1 : 0))) ? 1 : 0)) {
									local13_IsNotImplicit_2165 = 1;
									break;
									
								};
								
							}
							forEachSaver14004.values[forEachCounter14004] = local9_OtherVari_2166;
						
						};
						if (((local13_IsNotImplicit_2165) ? 0 : 1)) {
							var alias3_Typ_ref_2167 = [pool_TIdentifierType.alloc()];
							alias3_Typ_ref_2167 = global8_Compiler.attr5_Types_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType).values[tmpPositionCache] /* ALIAS */;
							var forEachSaver14049 = alias3_Typ_ref_2167[0].attr10_Attributes;
							for(var forEachCounter14049 = 0 ; forEachCounter14049 < forEachSaver14049.values.length ; forEachCounter14049++) {
								var local1_A_2168 = forEachSaver14049.values[forEachCounter14049];
							{
									if ((((local4_Vari_2164) === (local1_A_2168)) ? 1 : 0)) {
										local9_SuperExpr_ref_2161[0] = func24_CreateVariableExpression(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr7_SelfVar);
										break;
										
									};
									
								}
								forEachSaver14049.values[forEachCounter14049] = local1_A_2168;
							
							};
							pool_TIdentifierType.free(alias3_Typ_ref_2167);
						} else {
							continue;
							
						};
						
					};
					local4_Expr_ref_2155[0] = func24_CreateVariableExpression(local4_Vari_2164);
					local5_Found_2163 = 1;
					break;
					
				};
				
			}
			forEachSaver14063.values[forEachCounter14063] = local4_Vari_2164;
		
		};
		while ((((func7_IsToken("(")) && (local5_Found_2163)) ? 1 : 0)) {
			var local4_func_2169 = 0;
			local4_func_2169 = func14_SearchPrototyp(global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2155[0]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str);
			if ((((local4_func_2169) !== (-(1))) ? 1 : 0)) {
				var local6_Params_2170 = pool_array.alloc(0);
				func13_ParseFuncCall(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local4_func_2169).values[tmpPositionCache][0].attr8_datatype, unref(local6_Params_2170), param9_IsCommand);
				local4_Expr_ref_2155[0] = func25_CreateProtoCallExpression(unref(local4_Expr_ref_2155[0]), unref(local6_Params_2170));
				pool_array.free(local6_Params_2170);
			} else {
				func5_Error("Can only call PROTOTYPEs", 1338, "src\CompilerPasses\Parser.gbas");
				
			};
			
		};
		if ((((local5_Found_2163) === (0)) ? 1 : 0)) {
			if ((((local4_Expr_ref_2155[0]) !== (-(1))) ? 1 : 0)) {
				var local5_typId_2171 = 0;
				func6_IsType(global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2155[0]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str);
				if (global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2155[0]).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) {
					func5_Error("Cannot access to array.", 1344, "src\CompilerPasses\Parser.gbas");
					
				};
				local5_typId_2171 = global8_LastType.attr2_ID;
				while ((((local5_typId_2171) !== (-(1))) ? 1 : 0)) {
					var forEachSaver14211 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_2171).values[tmpPositionCache][0].attr7_Methods;
					for(var forEachCounter14211 = 0 ; forEachCounter14211 < forEachSaver14211.values.length ; forEachCounter14211++) {
						var local1_M_2172 = forEachSaver14211.values[forEachCounter14211];
					{
							if ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local1_M_2172).values[tmpPositionCache][0].attr8_Name_Str) === (local8_Name_Str_2160)) ? 1 : 0)) {
								if (((local5_Found_2163) ? 0 : 1)) {
									var local1_a_2173 = 0;
									local1_a_2173 = func19_ParseIdentifierFunc(local4_Expr_ref_2155, local9_SuperExpr_ref_2161, param9_IsCommand, local8_Name_Str_2160, local1_M_2172);
									if ((((local1_a_2173) !== (-(1))) ? 1 : 0)) {
										return tryClone(local1_a_2173);
										
									};
									
								};
								local5_Found_2163 = 1;
								
							};
							
						}
						forEachSaver14211.values[forEachCounter14211] = local1_M_2172;
					
					};
					local5_typId_2171 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_2171).values[tmpPositionCache][0].attr9_Extending;
					
				};
				
			} else {
				var local3_Val_ref_2174 = [0];
				if ((global8_Compiler.attr11_GlobalFuncs).GetValue(local8_Name_Str_2160, local3_Val_ref_2174)) {
					var local1_a_2175 = 0;
					local1_a_2175 = func19_ParseIdentifierFunc(local4_Expr_ref_2155, local9_SuperExpr_ref_2161, param9_IsCommand, local8_Name_Str_2160, unref(local3_Val_ref_2174[0]));
					if ((((local1_a_2175) !== (-(1))) ? 1 : 0)) {
						return tryClone(local1_a_2175);
						
					};
					local5_Found_2163 = 1;
					
				} else if (((((((global8_Compiler.attr11_currentFunc) !== (-(1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType) !== (-(1))) ? 1 : 0))) ? 1 : 0)) {
					var alias3_Typ_ref_2176 = [pool_TIdentifierType.alloc()], local5_typId_2177 = 0;
					alias3_Typ_ref_2176 = global8_Compiler.attr5_Types_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType).values[tmpPositionCache] /* ALIAS */;
					local5_typId_2177 = alias3_Typ_ref_2176[0].attr2_ID;
					while ((((local5_typId_2177) !== (-(1))) ? 1 : 0)) {
						var forEachSaver14354 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_2177).values[tmpPositionCache][0].attr7_Methods;
						for(var forEachCounter14354 = 0 ; forEachCounter14354 < forEachSaver14354.values.length ; forEachCounter14354++) {
							var local1_M_2178 = forEachSaver14354.values[forEachCounter14354];
						{
								if ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local1_M_2178).values[tmpPositionCache][0].attr8_Name_Str) === (local8_Name_Str_2160)) ? 1 : 0)) {
									if (((local5_Found_2163) ? 0 : 1)) {
										var local1_a_2179 = 0;
										local1_a_2179 = func19_ParseIdentifierFunc(local4_Expr_ref_2155, local9_SuperExpr_ref_2161, param9_IsCommand, local8_Name_Str_2160, local1_M_2178);
										if ((((local1_a_2179) !== (-(1))) ? 1 : 0)) {
											return tryClone(local1_a_2179);
											
										};
										
									};
									local5_Found_2163 = 1;
									
								};
								
							}
							forEachSaver14354.values[forEachCounter14354] = local1_M_2178;
						
						};
						local5_typId_2177 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_2177).values[tmpPositionCache][0].attr9_Extending;
						
					};
					pool_TIdentifierType.free(alias3_Typ_ref_2176);
				};
				
			};
			while ((((func7_IsToken("(")) && (local5_Found_2163)) ? 1 : 0)) {
				var local4_func_2180 = 0;
				local4_func_2180 = func14_SearchPrototyp(global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2155[0]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str);
				if ((((local4_func_2180) !== (-(1))) ? 1 : 0)) {
					var local6_Params_2181 = pool_array.alloc(0);
					func13_ParseFuncCall(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local4_func_2180).values[tmpPositionCache][0].attr8_datatype, unref(local6_Params_2181), param9_IsCommand);
					local4_Expr_ref_2155[0] = func25_CreateProtoCallExpression(unref(local4_Expr_ref_2155[0]), unref(local6_Params_2181));
					pool_array.free(local6_Params_2181);
				} else {
					func5_Error("Can only call PROTOTYPEs", 1397, "src\CompilerPasses\Parser.gbas");
					
				};
				
			};
			if ((((local5_Found_2163) === (0)) ? 1 : 0)) {
				if ((((local4_Expr_ref_2155[0]) !== (-(1))) ? 1 : 0)) {
					var local8_Atts_Str_2182 = "";
					local8_Atts_Str_2182 = "";
					var forEachSaver14463 = local5_Varis_2162;
					for(var forEachCounter14463 = 0 ; forEachCounter14463 < forEachSaver14463.values.length ; forEachCounter14463++) {
						var local4_Vari_2183 = forEachSaver14463.values[forEachCounter14463];
					{
							if ((((local8_Name_Str_2160) === (global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Vari_2183).values[tmpPositionCache][0].attr8_Name_Str)) ? 1 : 0)) {
								local8_Atts_Str_2182 = ((((local8_Atts_Str_2182) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Vari_2183).values[tmpPositionCache][0].attr8_Name_Str))) + (", "));
								
							};
							
						}
						forEachSaver14463.values[forEachCounter14463] = local4_Vari_2183;
					
					};
					func6_IsType(global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2155[0]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str);
					func5_Error((((((((((((("Cannot find attribute '") + (local8_Name_Str_2160))) + ("' in type '"))) + (global8_LastType.attr8_Name_Str))) + ("' possible attributes '"))) + (local8_Atts_Str_2182))) + ("'")), 1410, "src\CompilerPasses\Parser.gbas");
					
				} else {
					func5_Error((((("Internal error ") + (local8_Name_Str_2160))) + (" (expected identifier).")), 1412, "src\CompilerPasses\Parser.gbas");
					
				};
				
			};
			
		};
		if (func7_IsToken("[")) {
			var local4_Dims_2184 = pool_array.alloc(0);
			if ((((global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2155[0]).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0)) {
				func5_Error("Array access, but this identifier is no array", 1421, "src\CompilerPasses\Parser.gbas");
				
			};
			while (func7_IsToken("[")) {
				var local7_dimExpr_2185 = 0;
				func5_Match("[", 1424, "src\CompilerPasses\Parser.gbas");
				if (func7_IsToken("]")) {
					func5_Match("]", 1426, "src\CompilerPasses\Parser.gbas");
					break;
					
				};
				local7_dimExpr_2185 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 1429, 0);
				func5_Match("]", 1430, "src\CompilerPasses\Parser.gbas");
				DIMPUSH(local4_Dims_2184, local7_dimExpr_2185);
				
			};
			local4_Expr_ref_2155[0] = func21_CreateArrayExpression(unref(local4_Expr_ref_2155[0]), unref(local4_Dims_2184));
			pool_array.free(local4_Dims_2184);
		};
		local4_Expr_ref_2155[0] = func22_CreateAccessExpression(unref(local9_SuperExpr_ref_2161[0]), unref(local4_Expr_ref_2155[0]));
		if (func7_IsToken(".")) {
			func5_Match(".", 1441, "src\CompilerPasses\Parser.gbas");
			local5_IsAcc_2156 = 1;
			
		} else {
			local5_IsAcc_2156 = 0;
			
		};
		pool_array.free(local5_Varis_2162);
	} while (!((((local5_IsAcc_2156) === (0)) ? 1 : 0)));
	if (((((((func7_IsToken("=")) && ((((local4_Expr_ref_2155[0]) !== (-(1))) ? 1 : 0))) ? 1 : 0)) && (param9_IsCommand)) ? 1 : 0)) {
		var local7_tmpData_2186 = pool_TDatatype.alloc();
		if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(unref(local4_Expr_ref_2155[0]), 1)).values[tmpPositionCache][0].attr3_Typ) === (6)) ? 1 : 0)) {
			func5_Error("Assignment invalid, because of CONSTANT variable.", 1450, "src\CompilerPasses\Parser.gbas");
			
		};
		if (((((((global5_Exprs_ref[0].arrAccess(func12_GetRightExpr(unref(local4_Expr_ref_2155[0]))).values[tmpPositionCache][0].attr3_Typ) === (6)) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(func12_GetRightExpr(unref(local4_Expr_ref_2155[0]))).values[tmpPositionCache][0].attr3_Typ) === (23)) ? 1 : 0))) ? 1 : 0)) {
			func5_Error("Cannot assign to function call.", 1452, "src\CompilerPasses\Parser.gbas");
			
		};
		func5_Match("=", 1453, "src\CompilerPasses\Parser.gbas");
		if ((((param9_IsCommand) === (0)) ? 1 : 0)) {
			func5_Error("Assignment is a statement.", 1454, "src\CompilerPasses\Parser.gbas");
			
		};
		local7_tmpData_2186 = global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2155[0]).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
		return tryClone(func22_CreateAssignExpression(unref(local4_Expr_ref_2155[0]), func14_EnsureDatatype(func10_Expression(0), local7_tmpData_2186, 1458, 0)));
		pool_TDatatype.free(local7_tmpData_2186);
	};
	if ((((local4_Expr_ref_2155[0]) !== (-(1))) ? 1 : 0)) {
		return tryClone(unref(local4_Expr_ref_2155[0]));
		
	} else {
		func5_Error("Internal error (Expecting identifier)", 1464, "src\CompilerPasses\Parser.gbas");
		
	};
	return 0;
	
};
func10_Identifier = window['func10_Identifier'];
window['func19_ParseIdentifierFunc'] = function(param4_Expr_ref, param9_SuperExpr_ref, param9_IsCommand, param8_Name_Str, param4_func) {
	if ((((param4_func) === (-(1))) ? 1 : 0)) {
		func5_Error("Internal Error (func is -1, ParseIdentifierFunc", 1470, "src\CompilerPasses\Parser.gbas");
		
	};
	if ((((((((((global8_Compiler.attr11_currentFunc) !== (-(1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType) !== (-(1))) ? 1 : 0))) ? 1 : 0)) && ((((param4_Expr_ref[0]) === (-(1))) ? 1 : 0))) ? 1 : 0)) {
		var local3_typ_2192 = 0;
		local3_typ_2192 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType;
		while ((((local3_typ_2192) !== (-(1))) ? 1 : 0)) {
			if (((((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr6_MyType) === (local3_typ_2192)) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr6_MyType) !== (-(1))) ? 1 : 0))) ? 1 : 0)) {
				param9_SuperExpr_ref[0] = func24_CreateVariableExpression(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr7_SelfVar);
				break;
				
			};
			local3_typ_2192 = global8_Compiler.attr5_Types_ref[0].arrAccess(local3_typ_2192).values[tmpPositionCache][0].attr9_Extending;
			
		};
		
	};
	global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr10_PlzCompile = 1;
	if (((((((func7_IsToken("(")) === (0)) ? 1 : 0)) && ((((param9_IsCommand) === (0)) ? 1 : 0))) ? 1 : 0)) {
		var local8_datatype_2193 = pool_TDatatype.alloc();
		local8_datatype_2193.attr8_Name_Str = param8_Name_Str;
		local8_datatype_2193.attr7_IsArray = 0;
		global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr15_UsedAsPrototype = 1;
		return tryClone(func24_CreateFuncDataExpression(local8_datatype_2193));
		pool_TDatatype.free(local8_datatype_2193);
	} else {
		var local6_Params_2194 = pool_array.alloc(0);
		func13_ParseFuncCall(global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr8_datatype, unref(local6_Params_2194), param9_IsCommand);
		param4_Expr_ref[0] = func24_CreateFuncCallExpression(global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr2_ID, unref(local6_Params_2194));
		pool_array.free(local6_Params_2194);
	};
	return tryClone(-(1));
	return 0;
	
};
func19_ParseIdentifierFunc = window['func19_ParseIdentifierFunc'];
window['func13_ParseFuncCall'] = function(param8_datatype, param6_Params, param9_IsCommand) {
	var local9_OpBracket_2198 = 0, local4_Find_2199 = 0.0, local12_CloseBracket_2200 = 0;
	local9_OpBracket_2198 = func7_IsToken("(");
	if ((((param8_datatype.attr8_Name_Str) === ("void")) ? 1 : 0)) {
		if (((param9_IsCommand) ? 0 : 1)) {
			func5_Error("Void function has to be a command!", 1514, "src\CompilerPasses\Parser.gbas");
			
		};
		local9_OpBracket_2198 = 0;
		
	} else {
		if (local9_OpBracket_2198) {
			func5_Match("(", 1521, "src\CompilerPasses\Parser.gbas");
			
		};
		
	};
	local4_Find_2199 = 0;
	while (((((((func7_IsToken("\n")) === (0)) ? 1 : 0)) && ((((func7_IsToken(")")) === (0)) ? 1 : 0))) ? 1 : 0)) {
		if (local4_Find_2199) {
			func5_Match(",", 1529, "src\CompilerPasses\Parser.gbas");
			
		};
		DIMPUSH(param6_Params, func10_Expression(0));
		local4_Find_2199 = 1;
		
	};
	local12_CloseBracket_2200 = func7_IsToken(")");
	if (local12_CloseBracket_2200) {
		func5_Match(")", 1535, "src\CompilerPasses\Parser.gbas");
		
	};
	if ((((local12_CloseBracket_2200) !== (local9_OpBracket_2198)) ? 1 : 0)) {
		func5_Error("Brackets are not closed.", 1538, "src\CompilerPasses\Parser.gbas");
		
	};
	return 0;
	pool_array.free(param6_Params);
};
func13_ParseFuncCall = window['func13_ParseFuncCall'];
window['func7_Keyword'] = function() {
	{
		var local17___SelectHelper18__2201 = 0;
		local17___SelectHelper18__2201 = 1;
		if ((((local17___SelectHelper18__2201) === (func7_IsToken("CALLBACK"))) ? 1 : 0)) {
			func5_Match("CALLBACK", 1547, "src\CompilerPasses\Parser.gbas");
			func7_Keyword();
			
		} else if ((((local17___SelectHelper18__2201) === (func7_IsToken("NATIVE"))) ? 1 : 0)) {
			func5_Match("NATIVE", 1550, "src\CompilerPasses\Parser.gbas");
			func10_SkipTokens("NATIVE", "\n", "");
			
		} else if ((((local17___SelectHelper18__2201) === (func7_IsToken("ABSTRACT"))) ? 1 : 0)) {
			func5_Match("ABSTRACT", 1553, "src\CompilerPasses\Parser.gbas");
			func10_SkipTokens("ABSTRACT", "\n", "");
			
		} else if ((((local17___SelectHelper18__2201) === (func7_IsToken("FUNCTION"))) ? 1 : 0)) {
			func10_SkipTokens("FUNCTION", "ENDFUNCTION", "");
			
		} else if ((((local17___SelectHelper18__2201) === (func7_IsToken("SUB"))) ? 1 : 0)) {
			func10_SkipTokens("SUB", "ENDSUB", "");
			
		} else if ((((local17___SelectHelper18__2201) === (func7_IsToken("TYPE"))) ? 1 : 0)) {
			func10_SkipTokens("TYPE", "ENDTYPE", "");
			
		} else if ((((local17___SelectHelper18__2201) === (func7_IsToken("PROTOTYPE"))) ? 1 : 0)) {
			func10_SkipTokens("PROTOTYPE", "\n", "");
			
		} else if ((((local17___SelectHelper18__2201) === (func7_IsToken("CONSTANT"))) ? 1 : 0)) {
			func10_SkipTokens("CONSTANT", "\n", "");
			
		} else if ((((local17___SelectHelper18__2201) === (func7_IsToken("GLOBAL"))) ? 1 : 0)) {
			do {
				var local7_tmpVari_2202 = pool_TIdentifierVari.alloc();
				if (func7_IsToken("GLOBAL")) {
					func5_Match("GLOBAL", 1568, "src\CompilerPasses\Parser.gbas");
					
				} else {
					func5_Match(",", 1570, "src\CompilerPasses\Parser.gbas");
					
				};
				local7_tmpVari_2202 = func7_VariDef(0).clone(/* In Assign */);
				var forEachSaver15147 = global8_Compiler.attr7_Globals;
				for(var forEachCounter15147 = 0 ; forEachCounter15147 < forEachSaver15147.values.length ; forEachCounter15147++) {
					var local1_V_2203 = forEachSaver15147.values[forEachCounter15147];
				{
						var alias4_Vari_ref_2204 = [pool_TIdentifierVari.alloc()];
						alias4_Vari_ref_2204 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_V_2203).values[tmpPositionCache] /* ALIAS */;
						if (((((((alias4_Vari_ref_2204[0].attr8_Name_Str) === (local7_tmpVari_2202.attr8_Name_Str)) ? 1 : 0)) && ((((alias4_Vari_ref_2204[0].attr6_PreDef) !== (-(1))) ? 1 : 0))) ? 1 : 0)) {
							var local7_tmpExpr_2205 = 0;
							if ((((global8_Compiler.attr12_CurrentScope) === (-(1))) ? 1 : 0)) {
								func5_Error("Internal error (GLOBAL in -1 scope)", 1577, "src\CompilerPasses\Parser.gbas");
								
							};
							local7_tmpExpr_2205 = func22_CreateAssignExpression(func24_CreateVariableExpression(alias4_Vari_ref_2204[0].attr2_ID), alias4_Vari_ref_2204[0].attr6_PreDef);
							DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local7_tmpExpr_2205);
							alias4_Vari_ref_2204[0].attr6_PreDef = -(1);
							
						};
						pool_TIdentifierVari.free(alias4_Vari_ref_2204);
					}
					forEachSaver15147.values[forEachCounter15147] = local1_V_2203;
				
				};
				pool_TIdentifierVari.free(local7_tmpVari_2202);
			} while (!((((func7_IsToken(",")) === (0)) ? 1 : 0)));
			
		} else if ((((local17___SelectHelper18__2201) === (func7_IsToken("LOCAL"))) ? 1 : 0)) {
			do {
				var local10_DontCreate_2206 = 0;
				if (func7_IsToken("LOCAL")) {
					func5_Match("LOCAL", 1587, "src\CompilerPasses\Parser.gbas");
					
				} else {
					func5_Match(",", 1589, "src\CompilerPasses\Parser.gbas");
					
				};
				local10_DontCreate_2206 = 0;
				if (func13_IsVarExisting(func17_CleanVariable_Str(func14_GetCurrent_Str()))) {
					var local5_Varis_2207 = pool_array.alloc(0);
					local10_DontCreate_2206 = 1;
					func8_GetVaris(unref(local5_Varis_2207), -(1), 0);
					var forEachSaver15226 = local5_Varis_2207;
					for(var forEachCounter15226 = 0 ; forEachCounter15226 < forEachSaver15226.values.length ; forEachCounter15226++) {
						var local1_V_2208 = forEachSaver15226.values[forEachCounter15226];
					{
							if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_V_2208).values[tmpPositionCache][0].attr8_Name_Str) === (func17_CleanVariable_Str(func14_GetCurrent_Str()))) ? 1 : 0)) {
								if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_V_2208).values[tmpPositionCache][0].attr3_Typ) === (2)) ? 1 : 0)) {
									local10_DontCreate_2206 = 0;
									break;
									
								};
								
							};
							
						}
						forEachSaver15226.values[forEachCounter15226] = local1_V_2208;
					
					};
					if (local10_DontCreate_2206) {
						var local4_Expr_2209 = 0;
						func7_Warning((((("Variable '") + (func14_GetCurrent_Str()))) + ("' already exists...")));
						local4_Expr_2209 = func10_Identifier(1);
						DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local4_Expr_2209);
						
					};
					pool_array.free(local5_Varis_2207);
				};
				if (((local10_DontCreate_2206) ? 0 : 1)) {
					var local4_Vari_2210 = pool_TIdentifierVari.alloc(), local4_PDef_2211 = 0;
					local4_Vari_2210 = func7_VariDef(0).clone(/* In Assign */);
					local4_Vari_2210.attr3_Typ = ~~(1);
					local4_PDef_2211 = -(1);
					if ((((local4_Vari_2210.attr6_PreDef) !== (-(1))) ? 1 : 0)) {
						local4_PDef_2211 = local4_Vari_2210.attr6_PreDef;
						local4_Vari_2210.attr6_PreDef = -(1);
						
					};
					func11_AddVariable(local4_Vari_2210, 1);
					DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
					if ((((local4_PDef_2211) !== (-(1))) ? 1 : 0)) {
						var local7_tmpExpr_2212 = 0;
						if ((((global8_Compiler.attr12_CurrentScope) === (-(1))) ? 1 : 0)) {
							func5_Error("Internal error (LOCAL in -1 scope)", 1628, "src\CompilerPasses\Parser.gbas");
							
						};
						local7_tmpExpr_2212 = func22_CreateAssignExpression(func24_CreateVariableExpression(((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1))), local4_PDef_2211);
						DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local7_tmpExpr_2212);
						
					};
					pool_TIdentifierVari.free(local4_Vari_2210);
				};
				
			} while (!((((func7_IsToken(",")) === (0)) ? 1 : 0)));
			
		} else if ((((local17___SelectHelper18__2201) === (func7_IsToken("ALIAS"))) ? 1 : 0)) {
			do {
				var local4_Vari_2213 = pool_TIdentifierVari.alloc(), local4_PDef_2214 = 0, local7_tmpExpr_2215 = 0;
				if (func7_IsToken("ALIAS")) {
					func5_Match("ALIAS", 1639, "src\CompilerPasses\Parser.gbas");
					
				} else {
					func5_Match(",", 1641, "src\CompilerPasses\Parser.gbas");
					
				};
				func14_IsValidVarName();
				local4_Vari_2213.attr8_Name_Str = func14_GetCurrent_Str();
				local4_Vari_2213.attr3_Typ = ~~(7);
				local4_Vari_2213.attr3_ref = 1;
				func5_Match(local4_Vari_2213.attr8_Name_Str, 1649, "src\CompilerPasses\Parser.gbas");
				func5_Match("AS", 1650, "src\CompilerPasses\Parser.gbas");
				local4_PDef_2214 = func10_Identifier(0);
				global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(local4_PDef_2214, 1)).values[tmpPositionCache][0].attr3_ref = 1;
				local4_Vari_2213.attr8_datatype = global5_Exprs_ref[0].arrAccess(local4_PDef_2214).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
				func11_AddVariable(local4_Vari_2213, 1);
				DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
				local7_tmpExpr_2215 = func21_CreateAliasExpression(((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)), local4_PDef_2214);
				if (func7_IsToken(",")) {
					DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local7_tmpExpr_2215);
					
				} else {
					return tryClone(local7_tmpExpr_2215);
					
				};
				pool_TIdentifierVari.free(local4_Vari_2213);
			} while (!((((func7_IsToken(",")) === (0)) ? 1 : 0)));
			
		} else if ((((local17___SelectHelper18__2201) === (func7_IsToken("STATIC"))) ? 1 : 0)) {
			if ((((global8_Compiler.attr11_currentFunc) === (-(1))) ? 1 : 0)) {
				func5_Error("Static has to be in a FUNCTION", 1669, "src\CompilerPasses\Parser.gbas");
				
			};
			do {
				var local4_Vari_2216 = pool_TIdentifierVari.alloc();
				if (func7_IsToken("STATIC")) {
					func5_Match("STATIC", 1673, "src\CompilerPasses\Parser.gbas");
					
				} else {
					func5_Match(",", 1675, "src\CompilerPasses\Parser.gbas");
					
				};
				local4_Vari_2216 = func7_VariDef(0).clone(/* In Assign */);
				local4_Vari_2216.attr3_Typ = ~~(4);
				local4_Vari_2216.attr4_func = global8_Compiler.attr11_currentFunc;
				func11_AddVariable(local4_Vari_2216, 1);
				DIMPUSH(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr7_Statics, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
				DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
				pool_TIdentifierVari.free(local4_Vari_2216);
			} while (!((((func7_IsToken(",")) === (0)) ? 1 : 0)));
			
		} else if ((((local17___SelectHelper18__2201) === (func7_IsToken("DIMPUSH"))) ? 1 : 0)) {
			var local4_Vari_2217 = 0, local8_datatype_2218 = pool_TDatatype.alloc(), local4_Expr_2219 = 0;
			func5_Match("DIMPUSH", 1687, "src\CompilerPasses\Parser.gbas");
			local4_Vari_2217 = func10_Identifier(0);
			if ((((global5_Exprs_ref[0].arrAccess(local4_Vari_2217).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0)) {
				func5_Error("DIMPUSH needs array", 1689, "src\CompilerPasses\Parser.gbas");
				
			};
			func5_Match(",", 1690, "src\CompilerPasses\Parser.gbas");
			local8_datatype_2218 = global5_Exprs_ref[0].arrAccess(local4_Vari_2217).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
			local8_datatype_2218.attr7_IsArray = 0;
			local4_Expr_2219 = func14_EnsureDatatype(func10_Expression(0), local8_datatype_2218, 1695, 0);
			return tryClone(func23_CreateDimpushExpression(local4_Vari_2217, local4_Expr_2219));
			pool_TDatatype.free(local8_datatype_2218);
		} else if ((((local17___SelectHelper18__2201) === (func7_IsToken("DIM"))) ? 1 : 0)) {
			var local3_Arr_2220 = 0;
			func5_Match("DIM", 1706, "src\CompilerPasses\Parser.gbas");
			local3_Arr_2220 = func14_ImplicitDefine();
			if ((((local3_Arr_2220) !== (-(1))) ? 1 : 0)) {
				global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Arr_2220).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray = 1;
				
			};
			if (func12_IsIdentifier(0, 0)) {
				var local4_expr_2221 = 0, local5_LExpr_2222 = 0, local4_Dims_2223 = pool_array.alloc(0);
				local4_expr_2221 = func10_Identifier(0);
				local5_LExpr_2222 = func12_GetRightExpr(local4_expr_2221);
				if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(local4_expr_2221, 1)).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0)) {
					func5_Error("Array expected.", 1715, "src\CompilerPasses\Parser.gbas");
					
				};
				{
					var local17___SelectHelper19__2224 = 0;
					local17___SelectHelper19__2224 = global5_Exprs_ref[0].arrAccess(local5_LExpr_2222).values[tmpPositionCache][0].attr3_Typ;
					if ((((local17___SelectHelper19__2224) === (~~(13))) ? 1 : 0)) {
						local4_Dims_2223 = global5_Exprs_ref[0].arrAccess(local5_LExpr_2222).values[tmpPositionCache][0].attr4_dims.clone(/* In Assign */);
						DIM(global5_Exprs_ref[0].arrAccess(local5_LExpr_2222).values[tmpPositionCache][0].attr4_dims, [0], 0);
						
					} else {
						func5_Error("Internal error (array not parsed)", 1722, "src\CompilerPasses\Parser.gbas");
						
					};
					
				};
				return tryClone(func19_CreateDimExpression(local4_expr_2221, unref(local4_Dims_2223)));
				pool_array.free(local4_Dims_2223);
			} else {
				func5_Error("DIM needs identifier", 1727, "src\CompilerPasses\Parser.gbas");
				
			};
			
		} else if ((((local17___SelectHelper18__2201) === (func7_IsToken("REDIM"))) ? 1 : 0)) {
			var local3_Arr_2225 = 0;
			func5_Match("REDIM", 1730, "src\CompilerPasses\Parser.gbas");
			local3_Arr_2225 = func14_ImplicitDefine();
			if ((((local3_Arr_2225) !== (-(1))) ? 1 : 0)) {
				global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Arr_2225).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray = 1;
				
			};
			if (func12_IsIdentifier(0, 0)) {
				var local4_expr_2226 = 0, local5_LExpr_2227 = 0, local4_Dims_2228 = pool_array.alloc(0);
				local4_expr_2226 = func10_Identifier(0);
				local5_LExpr_2227 = func12_GetRightExpr(local4_expr_2226);
				if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(local4_expr_2226, 1)).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0)) {
					func5_Error("Array expected.", 1738, "src\CompilerPasses\Parser.gbas");
					
				};
				{
					var local17___SelectHelper20__2229 = 0;
					local17___SelectHelper20__2229 = global5_Exprs_ref[0].arrAccess(local5_LExpr_2227).values[tmpPositionCache][0].attr3_Typ;
					if ((((local17___SelectHelper20__2229) === (~~(13))) ? 1 : 0)) {
						local4_Dims_2228 = global5_Exprs_ref[0].arrAccess(local5_LExpr_2227).values[tmpPositionCache][0].attr4_dims.clone(/* In Assign */);
						DIM(global5_Exprs_ref[0].arrAccess(local5_LExpr_2227).values[tmpPositionCache][0].attr4_dims, [0], 0);
						
					} else {
						func5_Error("Internal error (array not parsed)", 1745, "src\CompilerPasses\Parser.gbas");
						
					};
					
				};
				return tryClone(func21_CreateReDimExpression(local4_expr_2226, unref(local4_Dims_2228)));
				pool_array.free(local4_Dims_2228);
			} else {
				func5_Error("REDIM needs identifier", 1749, "src\CompilerPasses\Parser.gbas");
				
			};
			
		} else if ((((local17___SelectHelper18__2201) === (func7_IsToken("DIMDATA"))) ? 1 : 0)) {
			var local5_Array_2230 = 0, local2_Ex_2231 = pool_array.alloc(0);
			func5_Match("DIMDATA", 1752, "src\CompilerPasses\Parser.gbas");
			local5_Array_2230 = func14_ImplicitDefine();
			if ((((local5_Array_2230) !== (-(1))) ? 1 : 0)) {
				global8_Compiler.attr5_Varis_ref[0].arrAccess(local5_Array_2230).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray = 1;
				local5_Array_2230 = func10_Identifier(0);
				
			} else {
				local5_Array_2230 = func10_Expression(0);
				
			};
			if ((((global5_Exprs_ref[0].arrAccess(local5_Array_2230).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0)) {
				func5_Error("DIMDATA needs array, stupid...", 1762, "src\CompilerPasses\Parser.gbas");
				
			};
			while ((((func7_IsToken("\n")) === (0)) ? 1 : 0)) {
				func5_Match(",", 1765, "src\CompilerPasses\Parser.gbas");
				if ((((BOUNDS(local2_Ex_2231, 0)) === (0)) ? 1 : 0)) {
					DIMPUSH(local2_Ex_2231, func10_Expression(0));
					
				} else {
					var local7_datatyp_2232 = pool_TDatatype.alloc(), local1_E_2233 = 0;
					local7_datatyp_2232 = global5_Exprs_ref[0].arrAccess(local2_Ex_2231.arrAccess(0).values[tmpPositionCache]).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
					local1_E_2233 = func14_EnsureDatatype(func10_Expression(0), local7_datatyp_2232, 1771, 0);
					DIMPUSH(local2_Ex_2231, local1_E_2233);
					pool_TDatatype.free(local7_datatyp_2232);
				};
				
			};
			return tryClone(func23_CreateDimDataExpression(local5_Array_2230, unref(local2_Ex_2231)));
			pool_array.free(local2_Ex_2231);
		} else if ((((local17___SelectHelper18__2201) === (func7_IsToken("DELETE"))) ? 1 : 0)) {
			var local11_VarName_Str_2234 = "";
			func5_Match("DELETE", 1778, "src\CompilerPasses\Parser.gbas");
			local11_VarName_Str_2234 = func14_GetCurrent_Str();
			if (((((((local11_VarName_Str_2234) !== (global8_Compiler.attr18_currentForEach_Str)) ? 1 : 0)) && ((((local11_VarName_Str_2234) !== ("\n")) ? 1 : 0))) ? 1 : 0)) {
				func5_Error((((((((("DELETE, invalid name '") + (local11_VarName_Str_2234))) + ("' expecting '"))) + (global8_Compiler.attr18_currentForEach_Str))) + ("'")), 1780, "src\CompilerPasses\Parser.gbas");
				
			};
			if ((((func7_IsToken("\n")) === (0)) ? 1 : 0)) {
				func7_GetNext();
				
			};
			return tryClone(func22_CreateDeleteExpression());
			
		} else if ((((local17___SelectHelper18__2201) === (func7_IsToken("DIMDEL"))) ? 1 : 0)) {
			var local5_Array_2235 = 0;
			func5_Match("DIMDEL", 1784, "src\CompilerPasses\Parser.gbas");
			local5_Array_2235 = func10_Identifier(0);
			func5_Match(",", 1786, "src\CompilerPasses\Parser.gbas");
			return tryClone(func22_CreateDimDelExpression(local5_Array_2235, func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 1787, 0)));
			
		} else if ((((local17___SelectHelper18__2201) === (func7_IsToken("RETURN"))) ? 1 : 0)) {
			if ((((global8_Compiler.attr11_currentFunc) !== (-(1))) ? 1 : 0)) {
				var local4_Expr_2236 = 0, local8_datatype_2237 = pool_TDatatype.alloc();
				func5_Match("RETURN", 1790, "src\CompilerPasses\Parser.gbas");
				local8_datatype_2237 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
				if (func7_IsToken("\n")) {
					local4_Expr_2236 = func28_CreateDefaultValueExpression(local8_datatype_2237);
					
				} else if ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr3_Typ) === (2)) ? 1 : 0)) {
					func5_Error("Sub cannot return a value", 1797, "src\CompilerPasses\Parser.gbas");
					
				} else {
					local4_Expr_2236 = func14_EnsureDatatype(func10_Expression(0), local8_datatype_2237, 1799, 0);
					
				};
				return tryClone(func22_CreateReturnExpression(local4_Expr_2236));
				pool_TDatatype.free(local8_datatype_2237);
			} else {
				func5_Error("RETURN have to be in a function or sub.", 1803, "src\CompilerPasses\Parser.gbas");
				
			};
			
		} else if ((((local17___SelectHelper18__2201) === (func7_IsToken("INLINE"))) ? 1 : 0)) {
			func5_Error("INLINE/ENDINLINE not supported", 1806, "src\CompilerPasses\Parser.gbas");
			
		} else if ((((local17___SelectHelper18__2201) === (func7_IsToken("REQUIRE"))) ? 1 : 0)) {
			var local8_Name_Str_2238 = "";
			func5_Match("REQUIRE", 1808, "src\CompilerPasses\Parser.gbas");
			local8_Name_Str_2238 = REPLACE_Str(func14_GetCurrent_Str(), "\"", "");
			func7_GetNext();
			return tryClone(~~(func23_CreateRequireExpression(local8_Name_Str_2238)));
			
		} else if ((((local17___SelectHelper18__2201) === (func7_IsToken("EXPORT"))) ? 1 : 0)) {
			var local3_Exp_2239 = pool_TExport.alloc(), local5_Found_2240 = 0;
			func5_Match("EXPORT", 1813, "src\CompilerPasses\Parser.gbas");
			local3_Exp_2239.attr8_Name_Str = REPLACE_Str(func14_GetCurrent_Str(), "\"", "");
			local5_Found_2240 = 0;
			var forEachSaver16203 = global8_Compiler.attr5_Funcs_ref[0];
			for(var forEachCounter16203 = 0 ; forEachCounter16203 < forEachSaver16203.values.length ; forEachCounter16203++) {
				var local1_F_ref_2241 = forEachSaver16203.values[forEachCounter16203];
			{
					if (((((((local1_F_ref_2241[0].attr3_Typ) === (1)) ? 1 : 0)) && ((((local3_Exp_2239.attr8_Name_Str) === (local1_F_ref_2241[0].attr8_Name_Str)) ? 1 : 0))) ? 1 : 0)) {
						local1_F_ref_2241[0].attr10_PlzCompile = 1;
						local5_Found_2240 = 1;
						break;
						
					};
					
				}
				forEachSaver16203.values[forEachCounter16203] = local1_F_ref_2241;
			
			};
			if (((local5_Found_2240) ? 0 : 1)) {
				var forEachSaver16243 = global8_Compiler.attr7_Globals;
				for(var forEachCounter16243 = 0 ; forEachCounter16243 < forEachSaver16243.values.length ; forEachCounter16243++) {
					var local1_V_2242 = forEachSaver16243.values[forEachCounter16243];
				{
						if (((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_V_2242).values[tmpPositionCache][0].attr3_Typ) === (2)) ? 1 : 0)) && ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_V_2242).values[tmpPositionCache][0].attr8_Name_Str) === (local3_Exp_2239.attr8_Name_Str)) ? 1 : 0))) ? 1 : 0)) {
							local5_Found_2240 = 1;
							break;
							
						};
						
					}
					forEachSaver16243.values[forEachCounter16243] = local1_V_2242;
				
				};
				
			};
			if (((local5_Found_2240) ? 0 : 1)) {
				func5_Error((((("Cannot export undefined function/global '") + (local3_Exp_2239.attr8_Name_Str))) + ("'")), 1836, "src\CompilerPasses\Parser.gbas");
				
			};
			local3_Exp_2239.attr8_Name_Str = REPLACE_Str(local3_Exp_2239.attr8_Name_Str, "$", "_Str");
			func7_GetNext();
			if (func7_IsToken(",")) {
				func5_Match(",", 1840, "src\CompilerPasses\Parser.gbas");
				local3_Exp_2239.attr12_RealName_Str = REPLACE_Str(func14_GetCurrent_Str(), "\"", "");
				func7_GetNext();
				
			};
			DIMPUSH(global8_Compiler.attr7_Exports, local3_Exp_2239);
			return tryClone(func21_CreateEmptyExpression());
			pool_TExport.free(local3_Exp_2239);
		} else if ((((local17___SelectHelper18__2201) === (func7_IsToken("IF"))) ? 1 : 0)) {
			var local4_Cnds_2243 = pool_array.alloc(0), local4_Scps_2244 = pool_array.alloc(0), local7_elseScp_2245 = 0;
			func5_Match("IF", 1849, "src\CompilerPasses\Parser.gbas");
			DIMPUSH(local4_Cnds_2243, func14_EnsureDatatype(func10_Expression(0), global13_floatDatatype, 1851, 0));
			if ((((func7_IsToken("THEN")) === (0)) ? 1 : 0)) {
				func5_Match("\n", 1853, "src\CompilerPasses\Parser.gbas");
				
			};
			DIMPUSH(local4_Scps_2244, func5_Scope("ENDIF", -(1)));
			while (func7_IsToken("ELSEIF")) {
				func5_Match("ELSEIF", 1860, "src\CompilerPasses\Parser.gbas");
				DIMPUSH(local4_Cnds_2243, func14_EnsureDatatype(func10_Expression(0), global13_floatDatatype, 1861, 0));
				func5_Match("\n", 1862, "src\CompilerPasses\Parser.gbas");
				DIMPUSH(local4_Scps_2244, func5_Scope("ENDIF", -(1)));
				
			};
			if (func7_IsToken("ELSE")) {
				func5_Match("ELSE", 1866, "src\CompilerPasses\Parser.gbas");
				func5_Match("\n", 1867, "src\CompilerPasses\Parser.gbas");
				local7_elseScp_2245 = func5_Scope("ENDIF", -(1));
				
			} else {
				local7_elseScp_2245 = -(1);
				
			};
			return tryClone(func18_CreateIfExpression(unref(local4_Cnds_2243), unref(local4_Scps_2244), local7_elseScp_2245));
			pool_array.free(local4_Scps_2244);
		} else if ((((local17___SelectHelper18__2201) === (func7_IsToken("WHILE"))) ? 1 : 0)) {
			var local4_Expr_2246 = 0, local3_Scp_2247 = 0;
			func5_Match("WHILE", 1875, "src\CompilerPasses\Parser.gbas");
			local4_Expr_2246 = func14_EnsureDatatype(func10_Expression(0), global13_floatDatatype, 1876, 0);
			func5_Match("\n", 1877, "src\CompilerPasses\Parser.gbas");
			local3_Scp_2247 = func5_Scope("WEND", -(1));
			return tryClone(func21_CreateWhileExpression(local4_Expr_2246, local3_Scp_2247));
			
		} else if ((((local17___SelectHelper18__2201) === (func7_IsToken("REPEAT"))) ? 1 : 0)) {
			var local3_Scp_2248 = 0, local4_Expr_2249 = 0;
			func5_Match("REPEAT", 1881, "src\CompilerPasses\Parser.gbas");
			func5_Match("\n", 1882, "src\CompilerPasses\Parser.gbas");
			local3_Scp_2248 = func5_Scope("UNTIL", -(1));
			local4_Expr_2249 = func14_EnsureDatatype(func10_Expression(0), global13_floatDatatype, 1884, 0);
			return tryClone(func22_CreateRepeatExpression(local4_Expr_2249, local3_Scp_2248));
			
		} else if ((((local17___SelectHelper18__2201) === (func7_IsToken("FOR"))) ? 1 : 0)) {
			var local8_TmpScope_2250 = 0.0, local4_Expr_2251 = 0, local6_OScope_2261 = 0;
			local8_TmpScope_2250 = global8_Compiler.attr12_CurrentScope;
			global8_Compiler.attr12_CurrentScope = func21_CreateScopeExpression(~~(3));
			local4_Expr_2251 = -(1);
			{
				var Error_Str = "";
				try {
					var local10_IsImplicit_2252 = 0, local7_varExpr_2253 = 0, local3_Var_2256 = 0.0, local5_hasTo_2257 = 0, local6_toExpr_2258 = 0, local8_stepExpr_2259 = 0;
					func5_Match("FOR", 1891, "src\CompilerPasses\Parser.gbas");
					local10_IsImplicit_2252 = -(1);
					if (func12_IsIdentifier(0, 1)) {
						local7_varExpr_2253 = func10_Identifier(1);
						
					} else {
						var local4_Vari_2254 = pool_TIdentifierVari.alloc(), local4_PDef_2255 = 0;
						local10_IsImplicit_2252 = 1;
						local4_Vari_2254 = func7_VariDef(0).clone(/* In Assign */);
						local4_Vari_2254.attr3_Typ = ~~(1);
						local4_PDef_2255 = -(1);
						if ((((local4_Vari_2254.attr6_PreDef) !== (-(1))) ? 1 : 0)) {
							local4_PDef_2255 = local4_Vari_2254.attr6_PreDef;
							local4_Vari_2254.attr6_PreDef = -(1);
							
						};
						func11_AddVariable(local4_Vari_2254, 1);
						local10_IsImplicit_2252 = ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1));
						DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
						if ((((local4_PDef_2255) !== (-(1))) ? 1 : 0)) {
							local7_varExpr_2253 = func22_CreateAssignExpression(func24_CreateVariableExpression(((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1))), local4_PDef_2255);
							
						};
						pool_TIdentifierVari.free(local4_Vari_2254);
					};
					if ((((global5_Exprs_ref[0].arrAccess(local7_varExpr_2253).values[tmpPositionCache][0].attr3_Typ) !== (10)) ? 1 : 0)) {
						func5_Error("FOR, variable needs assignment.", 1921, "src\CompilerPasses\Parser.gbas");
						
					};
					local3_Var_2256 = func11_GetVariable(global5_Exprs_ref[0].arrAccess(local7_varExpr_2253).values[tmpPositionCache][0].attr4_vari, 1);
					if (func7_IsToken("TO")) {
						local5_hasTo_2257 = 1;
						func5_Match("TO", 1926, "src\CompilerPasses\Parser.gbas");
						
					} else if (func7_IsToken("UNTIL")) {
						local5_hasTo_2257 = 0;
						func5_Match("UNTIL", 1929, "src\CompilerPasses\Parser.gbas");
						
					} else {
						func5_Error("FOR needs TO or UNTIL!", 1931, "src\CompilerPasses\Parser.gbas");
						
					};
					local6_toExpr_2258 = func14_EnsureDatatype(func10_Expression(0), global8_Compiler.attr5_Varis_ref[0].arrAccess(~~(local3_Var_2256)).values[tmpPositionCache][0].attr8_datatype, 1933, 0);
					local8_stepExpr_2259 = func14_EnsureDatatype(func19_CreateIntExpression(1), global8_Compiler.attr5_Varis_ref[0].arrAccess(~~(local3_Var_2256)).values[tmpPositionCache][0].attr8_datatype, 1934, 0);
					if (func7_IsToken("STEP")) {
						func5_Match("STEP", 1936, "src\CompilerPasses\Parser.gbas");
						local8_stepExpr_2259 = func14_EnsureDatatype(func10_Expression(0), global8_Compiler.attr5_Varis_ref[0].arrAccess(~~(local3_Var_2256)).values[tmpPositionCache][0].attr8_datatype, 1937, 0);
						
					};
					func5_Match("\n", 1939, "src\CompilerPasses\Parser.gbas");
					local4_Expr_2251 = func19_CreateForExpression(local7_varExpr_2253, local6_toExpr_2258, local8_stepExpr_2259, local5_hasTo_2257, func5_Scope("NEXT", -(1)));
					DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local4_Expr_2251);
					
				} catch (Error_Str) {
					if (Error_Str instanceof OTTException) Error_Str = Error_Str.getText(); else throwError(Error_Str);{
						func8_FixError();
						
					}
				};
				
			};
			local6_OScope_2261 = global8_Compiler.attr12_CurrentScope;
			global8_Compiler.attr12_CurrentScope = ~~(local8_TmpScope_2250);
			return tryClone(local6_OScope_2261);
			
		} else if ((((local17___SelectHelper18__2201) === (func7_IsToken("FOREACH"))) ? 1 : 0)) {
			var local8_TmpScope_2262 = 0.0, local14_TmpForEach_Str_2263 = "", local4_Expr_2264 = 0;
			local8_TmpScope_2262 = global8_Compiler.attr12_CurrentScope;
			local14_TmpForEach_Str_2263 = global8_Compiler.attr18_currentForEach_Str;
			global8_Compiler.attr12_CurrentScope = func21_CreateScopeExpression(~~(3));
			local4_Expr_2264 = -(1);
			{
				var Error_Str = "";
				try {
					var local7_varExpr_2265 = 0, local4_Vari_2266 = pool_TIdentifierVari.alloc(), local6_InExpr_2267 = 0, local3_var_2268 = 0;
					func5_Match("FOREACH", 1957, "src\CompilerPasses\Parser.gbas");
					local4_Vari_2266 = func7_VariDef(0).clone(/* In Assign */);
					local4_Vari_2266.attr3_Typ = ~~(1);
					if ((((local4_Vari_2266.attr6_PreDef) !== (-(1))) ? 1 : 0)) {
						func5_Error("No default value, in FOREACH", 1972, "src\CompilerPasses\Parser.gbas");
						
					};
					func11_AddVariable(local4_Vari_2266, 1);
					DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
					local7_varExpr_2265 = func24_CreateVariableExpression(((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
					global8_Compiler.attr18_currentForEach_Str = global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(local7_varExpr_2265, 1)).values[tmpPositionCache][0].attr8_Name_Str;
					func5_Match("IN", 1979, "src\CompilerPasses\Parser.gbas");
					local6_InExpr_2267 = func10_Identifier(0);
					if ((((global5_Exprs_ref[0].arrAccess(local6_InExpr_2267).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0)) {
						func5_Error("Expecting Array", 1982, "src\CompilerPasses\Parser.gbas");
						
					};
					global5_Exprs_ref[0].arrAccess(local7_varExpr_2265).values[tmpPositionCache][0].attr8_datatype = global5_Exprs_ref[0].arrAccess(local6_InExpr_2267).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
					global5_Exprs_ref[0].arrAccess(local7_varExpr_2265).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray = 0;
					local3_var_2268 = func11_GetVariable(local7_varExpr_2265, 1);
					global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_var_2268).values[tmpPositionCache][0].attr8_datatype = global5_Exprs_ref[0].arrAccess(local6_InExpr_2267).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
					global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_var_2268).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray = 0;
					global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_var_2268).values[tmpPositionCache][0].attr3_ref = global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(local6_InExpr_2267, 1)).values[tmpPositionCache][0].attr3_ref;
					func5_Match("\n", 1992, "src\CompilerPasses\Parser.gbas");
					local4_Expr_2264 = func23_CreateForEachExpression(local7_varExpr_2265, local6_InExpr_2267, func5_Scope("NEXT", -(1)));
					pool_TIdentifierVari.free(local4_Vari_2266);
				} catch (Error_Str) {
					if (Error_Str instanceof OTTException) Error_Str = Error_Str.getText(); else throwError(Error_Str);{
						func8_FixError();
						
					}
				};
				
			};
			global8_Compiler.attr12_CurrentScope = ~~(local8_TmpScope_2262);
			global8_Compiler.attr18_currentForEach_Str = local14_TmpForEach_Str_2263;
			return tryClone(local4_Expr_2264);
			
		} else if ((((local17___SelectHelper18__2201) === (func7_IsToken("BREAK"))) ? 1 : 0)) {
			func5_Match("BREAK", 2001, "src\CompilerPasses\Parser.gbas");
			if ((((global8_Compiler.attr6_inLoop) === (0)) ? 1 : 0)) {
				func5_Error("BREAK not inside loop", 2002, "src\CompilerPasses\Parser.gbas");
				
			};
			return tryClone(func21_CreateBreakExpression());
			
		} else if ((((local17___SelectHelper18__2201) === (func7_IsToken("CONTINUE"))) ? 1 : 0)) {
			func5_Match("CONTINUE", 2005, "src\CompilerPasses\Parser.gbas");
			if ((((global8_Compiler.attr6_inLoop) === (0)) ? 1 : 0)) {
				func5_Error("CONTINUE not inside loop", 2006, "src\CompilerPasses\Parser.gbas");
				
			};
			return tryClone(func24_CreateContinueExpression());
			
		} else if ((((local17___SelectHelper18__2201) === (func7_IsToken("TRY"))) ? 1 : 0)) {
			var local6_tryScp_2270 = 0, local4_Vari_2271 = pool_TIdentifierVari.alloc(), local2_id_2272 = 0.0, local7_myScope_2273 = 0, local8_TmpScope_2274 = 0.0;
			func5_Match("TRY", 2009, "src\CompilerPasses\Parser.gbas");
			func5_Match("\n", 2010, "src\CompilerPasses\Parser.gbas");
			local6_tryScp_2270 = func5_Scope("CATCH", -(1));
			local4_Vari_2271 = func7_VariDef(0).clone(/* In Assign */);
			if ((((local4_Vari_2271.attr8_datatype.attr8_Name_Str) !== ("string")) ? 1 : 0)) {
				func5_Error("Catch variable must be string", 2014, "src\CompilerPasses\Parser.gbas");
				
			};
			if (local4_Vari_2271.attr8_datatype.attr7_IsArray) {
				func5_Error("Catch variable must be non array", 2015, "src\CompilerPasses\Parser.gbas");
				
			};
			local2_id_2272 = BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0);
			func11_AddVariable(local4_Vari_2271, 0);
			local7_myScope_2273 = -(1);
			local8_TmpScope_2274 = global8_Compiler.attr12_CurrentScope;
			global8_Compiler.attr12_CurrentScope = func21_CreateScopeExpression(~~(1));
			{
				var Error_Str = "";
				try {
					var local7_ctchScp_2275 = 0, local1_e_2276 = 0;
					DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ~~(local2_id_2272));
					func5_Match("\n", 2025, "src\CompilerPasses\Parser.gbas");
					local7_ctchScp_2275 = func5_Scope("FINALLY", -(1));
					local1_e_2276 = func19_CreateTryExpression(local6_tryScp_2270, local7_ctchScp_2275, ~~(local2_id_2272));
					DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local1_e_2276);
					local7_myScope_2273 = global8_Compiler.attr12_CurrentScope;
					
				} catch (Error_Str) {
					if (Error_Str instanceof OTTException) Error_Str = Error_Str.getText(); else throwError(Error_Str);{
						func8_FixError();
						
					}
				};
				
			};
			global8_Compiler.attr12_CurrentScope = ~~(local8_TmpScope_2274);
			return tryClone(local7_myScope_2273);
			pool_TIdentifierVari.free(local4_Vari_2271);
		} else if ((((local17___SelectHelper18__2201) === (func7_IsToken("THROW"))) ? 1 : 0)) {
			func5_Match("THROW", 2039, "src\CompilerPasses\Parser.gbas");
			return tryClone(func21_CreateThrowExpression(func14_EnsureDatatype(func10_Expression(0), global11_strDatatype, 2040, 0)));
			
		} else if ((((local17___SelectHelper18__2201) === (func7_IsToken("SELECT"))) ? 1 : 0)) {
			var local4_Vari_2279 = pool_TIdentifierVari.alloc(), local5_Cond1_2280 = 0, local8_datatype_2281 = pool_TDatatype.alloc(), local5_Conds_2282 = pool_array.alloc(0), local4_Scps_2283 = pool_array.alloc(0), local7_elseScp_2284 = 0, local8_TmpScope_2285 = 0.0, local8_VariExpr_2286 = 0, local1_e_2287 = 0, local7_myScope_2293 = 0;
			static12_Keyword_SelectHelper+=1;
			local4_Vari_2279.attr8_Name_Str = (((("__SelectHelper") + (CAST2STRING(static12_Keyword_SelectHelper)))) + ("_"));
			local4_Vari_2279.attr3_Typ = ~~(1);
			func5_Match("SELECT", 2049, "src\CompilerPasses\Parser.gbas");
			local5_Cond1_2280 = func10_Expression(0);
			local8_datatype_2281 = global5_Exprs_ref[0].arrAccess(local5_Cond1_2280).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
			local4_Vari_2279.attr8_datatype = local8_datatype_2281.clone(/* In Assign */);
			local7_elseScp_2284 = -(1);
			func11_AddVariable(local4_Vari_2279, 0);
			local8_TmpScope_2285 = global8_Compiler.attr12_CurrentScope;
			global8_Compiler.attr12_CurrentScope = func21_CreateScopeExpression(~~(1));
			DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
			local8_VariExpr_2286 = func24_CreateVariableExpression(((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
			local1_e_2287 = func22_CreateAssignExpression(local8_VariExpr_2286, local5_Cond1_2280);
			DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local1_e_2287);
			local5_Cond1_2280 = local8_VariExpr_2286;
			func5_Match("\n", 2073, "src\CompilerPasses\Parser.gbas");
			while (func7_IsToken("CASE")) {
				var local5_Cond2_2288 = 0;
				func5_Match("CASE", 2075, "src\CompilerPasses\Parser.gbas");
				local5_Cond2_2288 = -(1);
				do {
					var local2_Op_2289 = 0.0, local5_Expr1_2290 = 0, local5_Expr2_2291 = 0, local7_tmpCond_2292 = 0;
					if (func7_IsToken(",")) {
						func5_Match(",", 2078, "src\CompilerPasses\Parser.gbas");
						
					};
					local2_Op_2289 = func14_SearchOperator("=");
					if (func10_IsOperator()) {
						local2_Op_2289 = func14_SearchOperator(func14_GetCurrent_Str());
						func7_GetNext();
						
					};
					local5_Expr1_2290 = -(1);
					local5_Expr2_2291 = -(1);
					local5_Expr1_2290 = func14_EnsureDatatype(func10_Expression(0), local8_datatype_2281, 2088, 0);
					if (func7_IsToken("TO")) {
						func5_Match("TO", 2090, "src\CompilerPasses\Parser.gbas");
						local5_Expr2_2291 = func14_EnsureDatatype(func10_Expression(0), local8_datatype_2281, 2091, 0);
						local5_Expr1_2290 = func24_CreateOperatorExpression(unref(global9_Operators_ref[0].arrAccess(func14_SearchOperator(">=")).values[tmpPositionCache][0]), local5_Cond1_2280, local5_Expr1_2290);
						local5_Expr2_2291 = func24_CreateOperatorExpression(unref(global9_Operators_ref[0].arrAccess(func14_SearchOperator("<=")).values[tmpPositionCache][0]), local5_Cond1_2280, local5_Expr2_2291);
						local7_tmpCond_2292 = func24_CreateOperatorExpression(unref(global9_Operators_ref[0].arrAccess(func14_SearchOperator("AND")).values[tmpPositionCache][0]), local5_Expr1_2290, local5_Expr2_2291);
						
					} else {
						local7_tmpCond_2292 = func24_CreateOperatorExpression(unref(global9_Operators_ref[0].arrAccess(~~(local2_Op_2289)).values[tmpPositionCache][0]), local5_Cond1_2280, local5_Expr1_2290);
						
					};
					if ((((local5_Cond2_2288) === (-(1))) ? 1 : 0)) {
						local5_Cond2_2288 = local7_tmpCond_2292;
						
					} else {
						local5_Cond2_2288 = func24_CreateOperatorExpression(unref(global9_Operators_ref[0].arrAccess(func14_SearchOperator("OR")).values[tmpPositionCache][0]), local5_Cond2_2288, local7_tmpCond_2292);
						
					};
					
				} while (!((((func7_IsToken(",")) === (0)) ? 1 : 0)));
				func5_Match("\n", 2107, "src\CompilerPasses\Parser.gbas");
				DIMPUSH(local5_Conds_2282, local5_Cond2_2288);
				DIMPUSH(local4_Scps_2283, func5_Scope("ENDSELECT", -(1)));
				
			};
			if (func7_IsToken("DEFAULT")) {
				func5_Match("DEFAULT", 2112, "src\CompilerPasses\Parser.gbas");
				func5_Match("\n", 2113, "src\CompilerPasses\Parser.gbas");
				local7_elseScp_2284 = func5_Scope("ENDSELECT", -(1));
				
			};
			if (((((((local7_elseScp_2284) === (-(1))) ? 1 : 0)) && ((((BOUNDS(local5_Conds_2282, 0)) === (0)) ? 1 : 0))) ? 1 : 0)) {
				func5_Match("ENDSELECT", 2117, "src\CompilerPasses\Parser.gbas");
				
			};
			local1_e_2287 = func18_CreateIfExpression(unref(local5_Conds_2282), unref(local4_Scps_2283), local7_elseScp_2284);
			DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local1_e_2287);
			local7_myScope_2293 = global8_Compiler.attr12_CurrentScope;
			global8_Compiler.attr12_CurrentScope = ~~(local8_TmpScope_2285);
			return tryClone(local7_myScope_2293);
			pool_array.free(local4_Scps_2283);
		} else if ((((local17___SelectHelper18__2201) === (func7_IsToken("STARTDATA"))) ? 1 : 0)) {
			func5_Match("STARTDATA", 2126, "src\CompilerPasses\Parser.gbas");
			func10_SkipTokens("STARTDATA", "ENDDATA", func14_GetCurrent_Str());
			
		} else if ((((local17___SelectHelper18__2201) === (func7_IsToken("RESTORE"))) ? 1 : 0)) {
			var local8_Name_Str_2294 = "";
			func5_Match("RESTORE", 2129, "src\CompilerPasses\Parser.gbas");
			local8_Name_Str_2294 = func14_GetCurrent_Str();
			func5_Match(local8_Name_Str_2294, 2131, "src\CompilerPasses\Parser.gbas");
			var forEachSaver17520 = global8_Compiler.attr10_DataBlocks;
			for(var forEachCounter17520 = 0 ; forEachCounter17520 < forEachSaver17520.values.length ; forEachCounter17520++) {
				var local5_block_2295 = forEachSaver17520.values[forEachCounter17520];
			{
					if ((((local5_block_2295.attr8_Name_Str) === (local8_Name_Str_2294)) ? 1 : 0)) {
						return tryClone(func23_CreateRestoreExpression(local8_Name_Str_2294));
						
					};
					
				}
				forEachSaver17520.values[forEachCounter17520] = local5_block_2295;
			
			};
			func5_Error((((("RESTORE label '") + (local8_Name_Str_2294))) + ("' unknown.")), 2137, "src\CompilerPasses\Parser.gbas");
			
		} else if ((((local17___SelectHelper18__2201) === (func7_IsToken("READ"))) ? 1 : 0)) {
			var local5_Reads_2296 = pool_array.alloc(0);
			func5_Match("READ", 2139, "src\CompilerPasses\Parser.gbas");
			do {
				var local1_e_2297 = 0;
				if (func7_IsToken(",")) {
					func5_Match(",", 2142, "src\CompilerPasses\Parser.gbas");
					
				};
				local1_e_2297 = func10_Identifier(0);
				DIMPUSH(local5_Reads_2296, local1_e_2297);
				
			} while (!((((func7_IsToken(",")) === (0)) ? 1 : 0)));
			return tryClone(func20_CreateReadExpression(unref(local5_Reads_2296)));
			pool_array.free(local5_Reads_2296);
		} else if ((((local17___SelectHelper18__2201) === (func7_IsToken("GOTO"))) ? 1 : 0)) {
			var local8_Name_Str_2298 = "", local4_Expr_2299 = 0, local3_Scp_2300 = 0;
			func5_Match("GOTO", 2149, "src\CompilerPasses\Parser.gbas");
			local8_Name_Str_2298 = func14_GetCurrent_Str();
			func7_GetNext();
			global8_Compiler.attr7_HasGoto = 1;
			if (((global8_Compiler.attr7_GOTOErr) ? 0 : 1)) {
				global8_Compiler.attr7_GOTOErr = 1;
				func7_Warning("GOTO may cause problems!");
				
			};
			local4_Expr_2299 = func20_CreateGotoExpression(local8_Name_Str_2298);
			local3_Scp_2300 = global8_Compiler.attr14_ImportantScope;
			if ((((local3_Scp_2300) === (-(1))) ? 1 : 0)) {
				func5_Error("Internal error (GOTO Scp is -1", 2162, "src\CompilerPasses\Parser.gbas");
				
			};
			DIMPUSH(global5_Exprs_ref[0].arrAccess(local3_Scp_2300).values[tmpPositionCache][0].attr5_Gotos, local4_Expr_2299);
			return tryClone(local4_Expr_2299);
			
		} else if ((((local17___SelectHelper18__2201) === (func7_IsToken("INC"))) ? 1 : 0)) {
			var local4_Vari_2301 = 0, local7_AddExpr_2302 = 0;
			func5_Match("INC", 2168, "src\CompilerPasses\Parser.gbas");
			local4_Vari_2301 = func10_Identifier(0);
			if (global5_Exprs_ref[0].arrAccess(local4_Vari_2301).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) {
				func5_Error("Cannot increment array...", 2170, "src\CompilerPasses\Parser.gbas");
				
			};
			{
				var local17___SelectHelper21__2303 = "";
				local17___SelectHelper21__2303 = global5_Exprs_ref[0].arrAccess(local4_Vari_2301).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str;
				if ((((local17___SelectHelper21__2303) === ("int")) ? 1 : 0)) {
					if (func7_IsToken(",")) {
						func5_Match(",", 2175, "src\CompilerPasses\Parser.gbas");
						local7_AddExpr_2302 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 2176, 0);
						
					} else {
						local7_AddExpr_2302 = func19_CreateIntExpression(1);
						
					};
					
				} else if ((((local17___SelectHelper21__2303) === ("float")) ? 1 : 0)) {
					if (func7_IsToken(",")) {
						func5_Match(",", 2182, "src\CompilerPasses\Parser.gbas");
						local7_AddExpr_2302 = func14_EnsureDatatype(func10_Expression(0), global13_floatDatatype, 2183, 0);
						
					} else {
						local7_AddExpr_2302 = func21_CreateFloatExpression(1);
						
					};
					
				} else if ((((local17___SelectHelper21__2303) === ("string")) ? 1 : 0)) {
					if (func7_IsToken(",")) {
						func5_Match(",", 2189, "src\CompilerPasses\Parser.gbas");
						local7_AddExpr_2302 = func14_EnsureDatatype(func10_Expression(0), global11_strDatatype, 2190, 0);
						
					} else {
						local7_AddExpr_2302 = func19_CreateStrExpression(" ");
						
					};
					
				} else {
					func5_Error("Cannot increment type or prototype", 2195, "src\CompilerPasses\Parser.gbas");
					
				};
				
			};
			return tryClone(func19_CreateIncExpression(local4_Vari_2301, local7_AddExpr_2302));
			
		} else if ((((local17___SelectHelper18__2201) === (func7_IsToken("DEC"))) ? 1 : 0)) {
			var local4_Vari_2304 = 0, local7_AddExpr_2305 = 0;
			func5_Match("DEC", 2199, "src\CompilerPasses\Parser.gbas");
			local4_Vari_2304 = func10_Identifier(0);
			if (global5_Exprs_ref[0].arrAccess(local4_Vari_2304).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) {
				func5_Error("Cannot decrement array...", 2202, "src\CompilerPasses\Parser.gbas");
				
			};
			{
				var local17___SelectHelper22__2306 = "";
				local17___SelectHelper22__2306 = global5_Exprs_ref[0].arrAccess(local4_Vari_2304).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str;
				if ((((local17___SelectHelper22__2306) === ("int")) ? 1 : 0)) {
					if (func7_IsToken(",")) {
						var alias2_Op_ref_2307 = [pool_TOperator.alloc()];
						func5_Match(",", 2206, "src\CompilerPasses\Parser.gbas");
						alias2_Op_ref_2307 = global9_Operators_ref[0].arrAccess(func14_SearchOperator("sub")).values[tmpPositionCache] /* ALIAS */;
						local7_AddExpr_2305 = func24_CreateOperatorExpression(unref(alias2_Op_ref_2307[0]), func19_CreateIntExpression(0), func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 2208, 0));
						pool_TOperator.free(alias2_Op_ref_2307);
					} else {
						local7_AddExpr_2305 = func19_CreateIntExpression(-(1));
						
					};
					
				} else if ((((local17___SelectHelper22__2306) === ("float")) ? 1 : 0)) {
					if (func7_IsToken(",")) {
						var alias2_Op_ref_2308 = [pool_TOperator.alloc()];
						func5_Match(",", 2214, "src\CompilerPasses\Parser.gbas");
						alias2_Op_ref_2308 = global9_Operators_ref[0].arrAccess(func14_SearchOperator("sub")).values[tmpPositionCache] /* ALIAS */;
						local7_AddExpr_2305 = func24_CreateOperatorExpression(unref(alias2_Op_ref_2308[0]), func21_CreateFloatExpression(0), func14_EnsureDatatype(func10_Expression(0), global13_floatDatatype, 2216, 0));
						pool_TOperator.free(alias2_Op_ref_2308);
					} else {
						local7_AddExpr_2305 = func21_CreateFloatExpression(-(1));
						
					};
					
				} else if ((((local17___SelectHelper22__2306) === ("string")) ? 1 : 0)) {
					func5_Error("Cannot decrement string...", 2221, "src\CompilerPasses\Parser.gbas");
					
				} else {
					func5_Error("Cannot decrement type or prototype", 2223, "src\CompilerPasses\Parser.gbas");
					
				};
				
			};
			return tryClone(func19_CreateIncExpression(local4_Vari_2304, local7_AddExpr_2305));
			
		} else if ((((local17___SelectHelper18__2201) === (func7_IsToken("ASSERT"))) ? 1 : 0)) {
			var local4_Expr_2309 = 0;
			func5_Match("ASSERT", 2227, "src\CompilerPasses\Parser.gbas");
			local4_Expr_2309 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 2228, 0);
			if (global9_DEBUGMODE) {
				return tryClone(func22_CreateAssertExpression(local4_Expr_2309));
				
			};
			
		} else if ((((local17___SelectHelper18__2201) === (func7_IsToken("DEBUG"))) ? 1 : 0)) {
			var local4_Expr_2310 = 0;
			func5_Match("DEBUG", 2234, "src\CompilerPasses\Parser.gbas");
			local4_Expr_2310 = func14_EnsureDatatype(func10_Expression(0), global11_strDatatype, 2235, 0);
			if (global9_DEBUGMODE) {
				return tryClone(func27_CreateDebugOutputExpression(local4_Expr_2310));
				
			};
			
		} else {
			func5_Error("Unexpected keyword", 2241, "src\CompilerPasses\Parser.gbas");
			
		};
		
	};
	return tryClone(func21_CreateEmptyExpression());
	return 0;
	
};
func7_Keyword = window['func7_Keyword'];
window['func14_ImplicitDefine'] = function() {
	if ((((global6_STRICT) === (0)) ? 1 : 0)) {
		if (((func12_IsIdentifier(0, 0)) ? 0 : 1)) {
			var local3_pos_2311 = 0, local4_Vari_2312 = pool_TIdentifierVari.alloc();
			local3_pos_2311 = global8_Compiler.attr11_currentPosi;
			local4_Vari_2312 = func7_VariDef(1).clone(/* In Assign */);
			local4_Vari_2312.attr3_Typ = ~~(2);
			func11_AddVariable(local4_Vari_2312, 0);
			DIMPUSH(global8_Compiler.attr7_Globals, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
			func7_Warning((((("Implicit variable declaration '") + (local4_Vari_2312.attr8_Name_Str))) + ("'")));
			global8_Compiler.attr11_currentPosi = ((local3_pos_2311) - (1));
			func7_GetNext();
			return tryClone(((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
			pool_TIdentifierVari.free(local4_Vari_2312);
		};
		
	};
	return tryClone(-(1));
	return 0;
	
};
func14_ImplicitDefine = window['func14_ImplicitDefine'];
window['func9_IsKeyword'] = function() {
	return tryClone((global10_KeywordMap).DoesKeyExist(func14_GetCurrent_Str()));
	return 0;
	
};
func9_IsKeyword = window['func9_IsKeyword'];
window['func12_IsIdentifier'] = function(param9_CheckType, param18_IgnoreImplicitSelf) {
	var local11_Current_Str_2317 = "", local5_dummy_ref_2318 = [0], local5_Varis_2319 = pool_array.alloc(0);
	if ((((func7_IsToken("GLOBAL")) || (func7_IsToken("LOCAL"))) ? 1 : 0)) {
		return 1;
		
	};
	if ((((func6_IsType("")) && (param9_CheckType)) ? 1 : 0)) {
		var local3_pos_2315 = 0, local3_ret_2316 = 0;
		local3_pos_2315 = global8_Compiler.attr11_currentPosi;
		func7_GetNext();
		if (func7_IsToken("(")) {
			local3_ret_2316 = 1;
			
		} else {
			local3_ret_2316 = 0;
			
		};
		global8_Compiler.attr11_currentPosi = local3_pos_2315;
		
	};
	local11_Current_Str_2317 = func14_GetCurrent_Str();
	if ((global8_Compiler.attr11_GlobalFuncs).GetValue(local11_Current_Str_2317, local5_dummy_ref_2318)) {
		return 1;
		
	};
	func8_GetVaris(unref(local5_Varis_2319), -(1), 0);
	{
		var local1_i_2320 = 0.0;
		for (local1_i_2320 = ((BOUNDS(local5_Varis_2319, 0)) - (1));toCheck(local1_i_2320, 0, -(1));local1_i_2320 += -(1)) {
			if ((((func17_CleanVariable_Str(local11_Current_Str_2317)) === (global8_Compiler.attr5_Varis_ref[0].arrAccess(local5_Varis_2319.arrAccess(~~(local1_i_2320)).values[tmpPositionCache]).values[tmpPositionCache][0].attr8_Name_Str)) ? 1 : 0)) {
				if ((((param18_IgnoreImplicitSelf) && ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local5_Varis_2319.arrAccess(~~(local1_i_2320)).values[tmpPositionCache]).values[tmpPositionCache][0].attr3_Typ) === (3)) ? 1 : 0))) ? 1 : 0)) {
					return tryClone(0);
					
				} else {
					return 1;
					
				};
				
			};
			
		};
		
	};
	if ((((((((((global8_Compiler.attr11_currentFunc) !== (-(1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType) !== (-(1))) ? 1 : 0))) ? 1 : 0)) && (((param18_IgnoreImplicitSelf) ? 0 : 1))) ? 1 : 0)) {
		var alias3_Typ_ref_2321 = [pool_TIdentifierType.alloc()], local5_myTyp_2322 = 0;
		alias3_Typ_ref_2321 = global8_Compiler.attr5_Types_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType).values[tmpPositionCache] /* ALIAS */;
		local5_myTyp_2322 = alias3_Typ_ref_2321[0].attr2_ID;
		while ((((local5_myTyp_2322) !== (-(1))) ? 1 : 0)) {
			var forEachSaver18210 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_myTyp_2322).values[tmpPositionCache][0].attr7_Methods;
			for(var forEachCounter18210 = 0 ; forEachCounter18210 < forEachSaver18210.values.length ; forEachCounter18210++) {
				var local1_M_2323 = forEachSaver18210.values[forEachCounter18210];
			{
					if (func7_IsToken(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local1_M_2323).values[tmpPositionCache][0].attr8_Name_Str)) {
						return 1;
						
					};
					
				}
				forEachSaver18210.values[forEachCounter18210] = local1_M_2323;
			
			};
			local5_myTyp_2322 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_myTyp_2322).values[tmpPositionCache][0].attr9_Extending;
			
		};
		var forEachSaver18241 = alias3_Typ_ref_2321[0].attr10_Attributes;
		for(var forEachCounter18241 = 0 ; forEachCounter18241 < forEachSaver18241.values.length ; forEachCounter18241++) {
			var local1_A_2324 = forEachSaver18241.values[forEachCounter18241];
		{
				if (func7_IsToken(global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_A_2324).values[tmpPositionCache][0].attr8_Name_Str)) {
					return 1;
					
				};
				
			}
			forEachSaver18241.values[forEachCounter18241] = local1_A_2324;
		
		};
		pool_TIdentifierType.free(alias3_Typ_ref_2321);
	};
	return tryClone(0);
	return 0;
	pool_array.free(local5_Varis_2319);
};
func12_IsIdentifier = window['func12_IsIdentifier'];
window['func8_IsNumber'] = function() {
	{
		var local1_i_2756 = 0.0;
		for (local1_i_2756 = 0;toCheck(local1_i_2756, (((func14_GetCurrent_Str()).length) - (1)), 1);local1_i_2756 += 1) {
			if (((((((ASC(func14_GetCurrent_Str(), ~~(local1_i_2756))) < (48)) ? 1 : 0)) || ((((ASC(func14_GetCurrent_Str(), ~~(local1_i_2756))) > (57)) ? 1 : 0))) ? 1 : 0)) {
				return tryClone(0);
				
			};
			
		};
		
	};
	return 1;
	return 0;
	
};
func8_IsNumber = window['func8_IsNumber'];
window['func8_IsString'] = function() {
	if (((((((MID_Str(func14_GetCurrent_Str(), 0, 1)) === ("\"")) ? 1 : 0)) && ((((MID_Str(func14_GetCurrent_Str(), (((func14_GetCurrent_Str()).length) - (1)), 1)) === ("\"")) ? 1 : 0))) ? 1 : 0)) {
		return 1;
		
	} else {
		return tryClone(0);
		
	};
	return 0;
	
};
func8_IsString = window['func8_IsString'];
window['func6_IsType'] = function(param7_Str_Str) {
	if ((((param7_Str_Str) === ("")) ? 1 : 0)) {
		param7_Str_Str = func14_GetCurrent_Str();
		
	};
	var forEachSaver18278 = global8_Compiler.attr5_Types_ref[0];
	for(var forEachCounter18278 = 0 ; forEachCounter18278 < forEachSaver18278.values.length ; forEachCounter18278++) {
		var local3_typ_ref_2326 = forEachSaver18278.values[forEachCounter18278];
	{
			if ((((local3_typ_ref_2326[0].attr12_RealName_Str) === (param7_Str_Str)) ? 1 : 0)) {
				global8_LastType = local3_typ_ref_2326[0].clone(/* In Assign */);
				return 1;
				
			};
			
		}
		forEachSaver18278.values[forEachCounter18278] = local3_typ_ref_2326;
	
	};
	return tryClone(0);
	return 0;
	
};
func6_IsType = window['func6_IsType'];
window['func13_IsVarExisting'] = function(param7_Var_Str) {
	var local4_Vars_2328 = pool_array.alloc(0);
	func8_GetVaris(unref(local4_Vars_2328), -(1), 0);
	{
		var local1_i_2329 = 0.0;
		for (local1_i_2329 = ((BOUNDS(local4_Vars_2328, 0)) - (1));toCheck(local1_i_2329, 0, -(1));local1_i_2329 += -(1)) {
			if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Vars_2328.arrAccess(~~(local1_i_2329)).values[tmpPositionCache]).values[tmpPositionCache][0].attr8_Name_Str) === (param7_Var_Str)) ? 1 : 0)) {
				return 1;
				
			};
			
		};
		
	};
	return tryClone((global10_KeywordMap).DoesKeyExist(param7_Var_Str));
	return 0;
	pool_array.free(local4_Vars_2328);
};
func13_IsVarExisting = window['func13_IsVarExisting'];
window['func14_IsValidVarName'] = function() {
	if (func9_IsKeyword()) {
		func5_Error((((("Invalid identifier name: '") + (func14_GetCurrent_Str()))) + ("' is already a keyword")), 2386, "src\CompilerPasses\Parser.gbas");
		
	};
	if (func8_IsNumber()) {
		func5_Error((((("Invalid Identifier name: '") + (func14_GetCurrent_Str()))) + ("' is a number")), 2388, "src\CompilerPasses\Parser.gbas");
		
	};
	if (func8_IsString()) {
		func5_Error((((("Invalid identifier name: '") + (func14_GetCurrent_Str()))) + ("' is a string")), 2389, "src\CompilerPasses\Parser.gbas");
		
	};
	if (func10_IsOperator()) {
		func5_Error((((("Invalid identifier name: '") + (func14_GetCurrent_Str()))) + ("' is an operator")), 2390, "src\CompilerPasses\Parser.gbas");
		
	};
	return 1;
	return 0;
	
};
func14_IsValidVarName = window['func14_IsValidVarName'];
window['func14_IsFuncExisting'] = function(param8_func_Str, param10_IsCallback) {
	var forEachSaver18403 = global8_Compiler.attr5_Types_ref[0];
	for(var forEachCounter18403 = 0 ; forEachCounter18403 < forEachSaver18403.values.length ; forEachCounter18403++) {
		var local1_T_ref_2332 = forEachSaver18403.values[forEachCounter18403];
	{
			if ((((local1_T_ref_2332[0].attr8_Name_Str) === (param8_func_Str)) ? 1 : 0)) {
				return 1;
				
			};
			
		}
		forEachSaver18403.values[forEachCounter18403] = local1_T_ref_2332;
	
	};
	if ((global10_KeywordMap).DoesKeyExist(param8_func_Str)) {
		return 1;
		
	};
	var forEachSaver18447 = global8_Compiler.attr5_Funcs_ref[0];
	for(var forEachCounter18447 = 0 ; forEachCounter18447 < forEachSaver18447.values.length ; forEachCounter18447++) {
		var local1_F_ref_2333 = forEachSaver18447.values[forEachCounter18447];
	{
			if ((((((((((param8_func_Str) === (local1_F_ref_2333[0].attr8_Name_Str)) ? 1 : 0)) && (((((((local1_F_ref_2333[0].attr3_Typ) === (2)) ? 1 : 0)) || ((((local1_F_ref_2333[0].attr3_Typ) === (1)) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) && ((((local1_F_ref_2333[0].attr10_IsCallback) === (param10_IsCallback)) ? 1 : 0))) ? 1 : 0)) {
				return 1;
				
			};
			
		}
		forEachSaver18447.values[forEachCounter18447] = local1_F_ref_2333;
	
	};
	return tryClone(0);
	return 0;
	
};
func14_IsFuncExisting = window['func14_IsFuncExisting'];
window['func10_IsOperator'] = function() {
	var forEachSaver18468 = global9_Operators_ref[0];
	for(var forEachCounter18468 = 0 ; forEachCounter18468 < forEachSaver18468.values.length ; forEachCounter18468++) {
		var local2_Op_ref_2334 = forEachSaver18468.values[forEachCounter18468];
	{
			if (func7_IsToken(local2_Op_ref_2334[0].attr7_Sym_Str)) {
				return 1;
				
			};
			
		}
		forEachSaver18468.values[forEachCounter18468] = local2_Op_ref_2334;
	
	};
	return tryClone(0);
	return 0;
	
};
func10_IsOperator = window['func10_IsOperator'];
window['func15_IsValidDatatype'] = function() {
	if (func6_IsType("")) {
		return 1;
		
	};
	var forEachSaver27961 = global8_Compiler.attr5_Funcs_ref[0];
	for(var forEachCounter27961 = 0 ; forEachCounter27961 < forEachSaver27961.values.length ; forEachCounter27961++) {
		var local4_func_ref_2757 = forEachSaver27961.values[forEachCounter27961];
	{
			if (((((((local4_func_ref_2757[0].attr3_Typ) === (4)) ? 1 : 0)) && (func7_IsToken(local4_func_ref_2757[0].attr8_Name_Str))) ? 1 : 0)) {
				return 1;
				
			};
			
		}
		forEachSaver27961.values[forEachCounter27961] = local4_func_ref_2757;
	
	};
	var forEachSaver27975 = global8_Compiler.attr5_Types_ref[0];
	for(var forEachCounter27975 = 0 ; forEachCounter27975 < forEachSaver27975.values.length ; forEachCounter27975++) {
		var local3_typ_ref_2758 = forEachSaver27975.values[forEachCounter27975];
	{
			STDOUT(((local3_typ_ref_2758[0].attr12_RealName_Str) + ("\n")));
			
		}
		forEachSaver27975.values[forEachCounter27975] = local3_typ_ref_2758;
	
	};
	func5_Error((("Unknown datatype: ") + (func14_GetCurrent_Str())), 2433, "src\CompilerPasses\Parser.gbas");
	return 0;
	
};
func15_IsValidDatatype = window['func15_IsValidDatatype'];
window['func8_IsDefine'] = function(param7_Def_Str) {
	if ((((param7_Def_Str) === ("")) ? 1 : 0)) {
		param7_Def_Str = func14_GetCurrent_Str();
		
	};
	var forEachSaver18502 = global7_Defines;
	for(var forEachCounter18502 = 0 ; forEachCounter18502 < forEachSaver18502.values.length ; forEachCounter18502++) {
		var local3_Def_2336 = forEachSaver18502.values[forEachCounter18502];
	{
			if ((((local3_Def_2336.attr7_Key_Str) === (param7_Def_Str)) ? 1 : 0)) {
				global10_LastDefine = local3_Def_2336.clone(/* In Assign */);
				return 1;
				
			};
			
		}
		forEachSaver18502.values[forEachCounter18502] = local3_Def_2336;
	
	};
	return tryClone(0);
	return 0;
	
};
func8_IsDefine = window['func8_IsDefine'];
window['func8_GetVaris'] = function(param5_Varis, param3_Scp, param9_PreferVar) {
	if ((((param3_Scp) === (-(1))) ? 1 : 0)) {
		param3_Scp = global8_Compiler.attr12_CurrentScope;
		
	};
	if (((((((param9_PreferVar) === (-(1))) ? 1 : 0)) && ((((BOUNDS(param5_Varis, 0)) === (0)) ? 1 : 0))) ? 1 : 0)) {
		var forEachSaver18549 = global8_Compiler.attr7_Globals;
		for(var forEachCounter18549 = 0 ; forEachCounter18549 < forEachSaver18549.values.length ; forEachCounter18549++) {
			var local4_Vari_2340 = forEachSaver18549.values[forEachCounter18549];
		{
				DIMPUSH(param5_Varis, local4_Vari_2340);
				
			}
			forEachSaver18549.values[forEachCounter18549] = local4_Vari_2340;
		
		};
		
	};
	if ((((param3_Scp) !== (-(1))) ? 1 : 0)) {
		var forEachSaver18573 = global5_Exprs_ref[0].arrAccess(~~(param3_Scp)).values[tmpPositionCache][0].attr5_Varis;
		for(var forEachCounter18573 = 0 ; forEachCounter18573 < forEachSaver18573.values.length ; forEachCounter18573++) {
			var local4_Vari_2341 = forEachSaver18573.values[forEachCounter18573];
		{
				DIMPUSH(param5_Varis, local4_Vari_2341);
				
			}
			forEachSaver18573.values[forEachCounter18573] = local4_Vari_2341;
		
		};
		if (((((((global8_Compiler.attr11_currentFunc) !== (-(1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType) !== (-(1))) ? 1 : 0))) ? 1 : 0)) {
			var alias3_Typ_ref_2342 = [pool_TIdentifierType.alloc()];
			alias3_Typ_ref_2342 = global8_Compiler.attr5_Types_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType).values[tmpPositionCache] /* ALIAS */;
			var forEachSaver18622 = alias3_Typ_ref_2342[0].attr10_Attributes;
			for(var forEachCounter18622 = 0 ; forEachCounter18622 < forEachSaver18622.values.length ; forEachCounter18622++) {
				var local1_A_2343 = forEachSaver18622.values[forEachCounter18622];
			{
					DIMPUSH(param5_Varis, local1_A_2343);
					
				}
				forEachSaver18622.values[forEachCounter18622] = local1_A_2343;
			
			};
			pool_TIdentifierType.free(alias3_Typ_ref_2342);
		};
		
	};
	if (((((((global5_Exprs_ref[0].arrAccess(~~(param3_Scp)).values[tmpPositionCache][0].attr10_SuperScope) !== (-(1))) ? 1 : 0)) && ((((global5_Exprs_ref[0].arrAccess(~~(param3_Scp)).values[tmpPositionCache][0].attr6_ScpTyp) !== (2)) ? 1 : 0))) ? 1 : 0)) {
		func8_GetVaris(unref(param5_Varis), global5_Exprs_ref[0].arrAccess(~~(param3_Scp)).values[tmpPositionCache][0].attr10_SuperScope, 0);
		
	} else if ((((param9_PreferVar) >= (0)) ? 1 : 0)) {
		var forEachSaver18671 = global8_Compiler.attr7_Globals;
		for(var forEachCounter18671 = 0 ; forEachCounter18671 < forEachSaver18671.values.length ; forEachCounter18671++) {
			var local4_Vari_2344 = forEachSaver18671.values[forEachCounter18671];
		{
				DIMPUSH(param5_Varis, local4_Vari_2344);
				
			}
			forEachSaver18671.values[forEachCounter18671] = local4_Vari_2344;
		
		};
		
	};
	return 0;
	pool_array.free(param5_Varis);
};
func8_GetVaris = window['func8_GetVaris'];
window['func11_GetVariable'] = function(param4_expr, param3_err) {
	var local6_hasErr_2347 = 0;
	local6_hasErr_2347 = 0;
	{
		var local17___SelectHelper23__2348 = 0;
		local17___SelectHelper23__2348 = global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr3_Typ;
		if ((((local17___SelectHelper23__2348) === (~~(9))) ? 1 : 0)) {
			return tryClone(global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr4_vari);
			
		} else if ((((local17___SelectHelper23__2348) === (~~(13))) ? 1 : 0)) {
			return tryClone(func11_GetVariable(global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr5_array, param3_err));
			
		} else if ((((local17___SelectHelper23__2348) === (~~(18))) ? 1 : 0)) {
			return tryClone(func11_GetVariable(global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr8_nextExpr, param3_err));
			
		} else if ((((local17___SelectHelper23__2348) === (~~(54))) ? 1 : 0)) {
			return tryClone(func11_GetVariable(global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr4_expr, param3_err));
			
		} else if ((((local17___SelectHelper23__2348) === (~~(6))) ? 1 : 0)) {
			if ((((global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr4_func) !== (-(1))) ? 1 : 0)) {
				var alias4_func_ref_2349 = [pool_TIdentifierFunc.alloc()];
				alias4_func_ref_2349 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache] /* ALIAS */;
				if ((((alias4_func_ref_2349[0].attr3_Typ) === (3)) ? 1 : 0)) {
					return tryClone(-(1));
					
				} else {
					local6_hasErr_2347 = 1;
					
				};
				pool_TIdentifierFunc.free(alias4_func_ref_2349);
			} else {
				local6_hasErr_2347 = 1;
				
			};
			
		} else {
			local6_hasErr_2347 = 1;
			
		};
		
	};
	if ((((local6_hasErr_2347) && (param3_err)) ? 1 : 0)) {
		var local7_add_Str_2350 = "";
		local7_add_Str_2350 = "";
		func5_Error((("Variable expected.") + (local7_add_Str_2350)), 2518, "src\CompilerPasses\Parser.gbas");
		
	} else {
		return tryClone(-(1));
		
	};
	return 0;
	
};
func11_GetVariable = window['func11_GetVariable'];
window['func12_GetRightExpr'] = function(param4_expr) {
	{
		var local17___SelectHelper24__2352 = 0;
		local17___SelectHelper24__2352 = global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr3_Typ;
		if ((((local17___SelectHelper24__2352) === (~~(18))) ? 1 : 0)) {
			return tryClone(func12_GetRightExpr(global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr8_nextExpr));
			
		} else {
			return tryClone(param4_expr);
			
		};
		
	};
	return 0;
	
};
func12_GetRightExpr = window['func12_GetRightExpr'];
window['func16_AddDataChars_Str'] = function(param8_Text_Str, param4_func) {
	if ((((param4_func.attr8_datatype.attr8_Name_Str) === ("int")) ? 1 : 0)) {
		return tryClone(((param8_Text_Str) + ("%")));
		
	};
	if ((((param4_func.attr8_datatype.attr8_Name_Str) === ("float")) ? 1 : 0)) {
		return tryClone(((param8_Text_Str) + ("#")));
		
	};
	return tryClone(param8_Text_Str);
	return "";
	
};
func16_AddDataChars_Str = window['func16_AddDataChars_Str'];
window['func10_SkipTokens'] = function(param8_Open_Str, param9_Close_Str, param8_Name_Str) {
	var local8_startpos_2356 = 0;
	local8_startpos_2356 = global8_Compiler.attr11_currentPosi;
	while (((((((func7_IsToken(param9_Close_Str)) === (0)) ? 1 : 0)) && (func7_HasNext())) ? 1 : 0)) {
		if (func7_HasNext()) {
			func7_GetNext();
			
		};
		
	};
	if ((((func7_HasNext()) === (0)) ? 1 : 0)) {
		var local6_tmpPos_2357 = 0.0;
		local6_tmpPos_2357 = global8_Compiler.attr11_currentPosi;
		global8_Compiler.attr11_currentPosi = local8_startpos_2356;
		{
			var ex_Str = "";
			try {
				func5_Error(((((((((((param8_Open_Str) + (" "))) + (param8_Name_Str))) + (" needs '"))) + (param9_Close_Str))) + ("', unexpected end of file.")), 2554, "src\CompilerPasses\Parser.gbas");
				
			} catch (ex_Str) {
				if (ex_Str instanceof OTTException) ex_Str = ex_Str.getText(); else throwError(ex_Str);{
					global8_Compiler.attr11_currentPosi = ~~(local6_tmpPos_2357);
					throw new OTTException(ex_Str, "\src\CompilerPasses\Parser.gbas", 2558);
					
				}
			};
			
		};
		
	};
	if ((((param9_Close_Str) !== ("\n")) ? 1 : 0)) {
		func5_Match(param9_Close_Str, 2560, "src\CompilerPasses\Parser.gbas");
		
	};
	return 0;
	
};
func10_SkipTokens = window['func10_SkipTokens'];
window['func17_BuildPrototyp_Str'] = function(param1_F) {
	var alias4_Func_ref_2360 = [pool_TIdentifierFunc.alloc()], local8_Text_Str_2361 = "", local5_Found_2362 = 0;
	alias4_Func_ref_2360 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(param1_F).values[tmpPositionCache] /* ALIAS */;
	local8_Text_Str_2361 = (((((("RETURN TYPE: ") + (alias4_Func_ref_2360[0].attr8_datatype.attr8_Name_Str))) + (func20_BuildArrBrackets_Str(alias4_Func_ref_2360[0].attr8_datatype.attr7_IsArray)))) + (" PARAMETER:"));
	local5_Found_2362 = 0;
	var forEachSaver18980 = alias4_Func_ref_2360[0].attr6_Params;
	for(var forEachCounter18980 = 0 ; forEachCounter18980 < forEachSaver18980.values.length ; forEachCounter18980++) {
		var local1_P_2363 = forEachSaver18980.values[forEachCounter18980];
	{
			var alias5_Param_ref_2364 = [pool_TIdentifierVari.alloc()];
			alias5_Param_ref_2364 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_2363).values[tmpPositionCache] /* ALIAS */;
			if (local5_Found_2362) {
				local8_Text_Str_2361 = ((local8_Text_Str_2361) + (", "));
				
			};
			local8_Text_Str_2361 = ((((local8_Text_Str_2361) + (alias5_Param_ref_2364[0].attr8_datatype.attr8_Name_Str))) + (func20_BuildArrBrackets_Str(alias5_Param_ref_2364[0].attr8_datatype.attr7_IsArray)));
			local5_Found_2362 = 1;
			pool_TIdentifierVari.free(alias5_Param_ref_2364);
		}
		forEachSaver18980.values[forEachCounter18980] = local1_P_2363;
	
	};
	return tryClone(local8_Text_Str_2361);
	return "";
	pool_TIdentifierFunc.free(alias4_Func_ref_2360);
};
func17_BuildPrototyp_Str = window['func17_BuildPrototyp_Str'];
window['func14_SearchPrototyp'] = function(param8_Name_Str) {
	var local3_Ret_ref_2366 = [0];
	if ((global8_Compiler.attr11_GlobalFuncs).GetValue(param8_Name_Str, local3_Ret_ref_2366)) {
		if ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Ret_ref_2366[0]).values[tmpPositionCache][0].attr3_Typ) === (2)) ? 1 : 0)) {
			return tryClone(-(1));
			
		} else {
			return tryClone(unref(local3_Ret_ref_2366[0]));
			
		};
		
	} else {
		return tryClone(-(1));
		
	};
	return 0;
	
};
func14_SearchPrototyp = window['func14_SearchPrototyp'];
window['func14_SearchOperator'] = function(param8_Name_Str) {
	var forEachSaver19046 = global9_Operators_ref[0];
	for(var forEachCounter19046 = 0 ; forEachCounter19046 < forEachSaver19046.values.length ; forEachCounter19046++) {
		var local2_Op_ref_2368 = forEachSaver19046.values[forEachCounter19046];
	{
			if (((((((local2_Op_ref_2368[0].attr7_Sym_Str) === (param8_Name_Str)) ? 1 : 0)) || ((((local2_Op_ref_2368[0].attr8_Name_Str) === (param8_Name_Str)) ? 1 : 0))) ? 1 : 0)) {
				return tryClone(local2_Op_ref_2368[0].attr2_ID);
				
			};
			
		}
		forEachSaver19046.values[forEachCounter19046] = local2_Op_ref_2368;
	
	};
	return tryClone(-(1));
	return 0;
	
};
func14_SearchOperator = window['func14_SearchOperator'];
window['func17_CleanVariable_Str'] = function(param7_Var_Str) {
	var local11_Postfix_Str_2370 = "";
	local11_Postfix_Str_2370 = RIGHT_Str(param7_Var_Str, 1);
	if (((((((local11_Postfix_Str_2370) === ("%")) ? 1 : 0)) || ((((local11_Postfix_Str_2370) === ("#")) ? 1 : 0))) ? 1 : 0)) {
		return tryClone(LEFT_Str(param7_Var_Str, (((param7_Var_Str).length) - (1))));
		
	} else {
		return tryClone(param7_Var_Str);
		
	};
	return "";
	
};
func17_CleanVariable_Str = window['func17_CleanVariable_Str'];
window['func12_ScopeHasGoto'] = function(param3_scp) {
	if ((((param3_scp.attr3_Typ) !== (2)) ? 1 : 0)) {
		func5_Error("Internal error (Cant look for Scope)", 2615, "src\CompilerPasses\Parser.gbas");
		
	};
	var forEachSaver19251 = param3_scp.attr5_Exprs;
	for(var forEachCounter19251 = 0 ; forEachCounter19251 < forEachSaver19251.values.length ; forEachCounter19251++) {
		var local1_E_2372 = forEachSaver19251.values[forEachCounter19251];
	{
			var alias4_SubE_ref_2373 = [pool_TExpr.alloc()];
			alias4_SubE_ref_2373 = global5_Exprs_ref[0].arrAccess(local1_E_2372).values[tmpPositionCache] /* ALIAS */;
			{
				var local17___SelectHelper25__2374 = 0;
				local17___SelectHelper25__2374 = alias4_SubE_ref_2373[0].attr3_Typ;
				if ((((local17___SelectHelper25__2374) === (~~(24))) ? 1 : 0)) {
					var forEachSaver19131 = alias4_SubE_ref_2373[0].attr6_Scopes;
					for(var forEachCounter19131 = 0 ; forEachCounter19131 < forEachSaver19131.values.length ; forEachCounter19131++) {
						var local1_E_2375 = forEachSaver19131.values[forEachCounter19131];
					{
							if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(local1_E_2375).values[tmpPositionCache][0]))) {
								return 1;
								
							};
							
						}
						forEachSaver19131.values[forEachCounter19131] = local1_E_2375;
					
					};
					if ((((alias4_SubE_ref_2373[0].attr9_elseScope) !== (-(1))) ? 1 : 0)) {
						if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(alias4_SubE_ref_2373[0].attr9_elseScope).values[tmpPositionCache][0]))) {
							return 1;
							
						};
						
					};
					
				} else if ((((local17___SelectHelper25__2374) === (~~(25))) ? 1 : 0)) {
					if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(alias4_SubE_ref_2373[0].attr3_Scp).values[tmpPositionCache][0]))) {
						return 1;
						
					};
					
				} else if ((((local17___SelectHelper25__2374) === (~~(26))) ? 1 : 0)) {
					if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(alias4_SubE_ref_2373[0].attr3_Scp).values[tmpPositionCache][0]))) {
						return 1;
						
					};
					
				} else if ((((local17___SelectHelper25__2374) === (~~(27))) ? 1 : 0)) {
					if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(alias4_SubE_ref_2373[0].attr3_Scp).values[tmpPositionCache][0]))) {
						return 1;
						
					};
					
				} else if ((((local17___SelectHelper25__2374) === (~~(38))) ? 1 : 0)) {
					if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(alias4_SubE_ref_2373[0].attr3_Scp).values[tmpPositionCache][0]))) {
						return 1;
						
					};
					
				} else if ((((local17___SelectHelper25__2374) === (~~(31))) ? 1 : 0)) {
					if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(alias4_SubE_ref_2373[0].attr3_Scp).values[tmpPositionCache][0]))) {
						return 1;
						
					};
					if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(alias4_SubE_ref_2373[0].attr8_catchScp).values[tmpPositionCache][0]))) {
						return 1;
						
					};
					
				} else if ((((local17___SelectHelper25__2374) === (~~(20))) ? 1 : 0)) {
					return 1;
					
				} else if ((((local17___SelectHelper25__2374) === (~~(2))) ? 1 : 0)) {
					if (func12_ScopeHasGoto(unref(alias4_SubE_ref_2373[0]))) {
						return 1;
						
					};
					
				} else {
					
				};
				
			};
			pool_TExpr.free(alias4_SubE_ref_2373);
		}
		forEachSaver19251.values[forEachCounter19251] = local1_E_2372;
	
	};
	return tryClone(0);
	return 0;
	
};
func12_ScopeHasGoto = window['func12_ScopeHasGoto'];
window['func13_ScopeName_Str'] = function(param4_expr) {
	{
		var local17___SelectHelper26__2377 = 0;
		local17___SelectHelper26__2377 = param4_expr.attr6_ScpTyp;
		if ((((local17___SelectHelper26__2377) === (~~(1))) ? 1 : 0)) {
			return "if";
			
		} else if ((((local17___SelectHelper26__2377) === (~~(3))) ? 1 : 0)) {
			return "loop";
			
		} else if ((((local17___SelectHelper26__2377) === (~~(5))) ? 1 : 0)) {
			return "try";
			
		} else if ((((local17___SelectHelper26__2377) === (~~(4))) ? 1 : 0)) {
			return "main";
			
		} else if ((((local17___SelectHelper26__2377) === (~~(2))) ? 1 : 0)) {
			{
				var local17___SelectHelper27__2378 = 0;
				local17___SelectHelper27__2378 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr3_Typ;
				if ((((local17___SelectHelper27__2378) === (~~(2))) ? 1 : 0)) {
					return tryClone((("sub: ") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr9_OName_Str)));
					
				} else if ((((local17___SelectHelper27__2378) === (~~(3))) ? 1 : 0)) {
					return tryClone((("method: ") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr9_OName_Str)));
					
				} else if ((((local17___SelectHelper27__2378) === (~~(1))) ? 1 : 0)) {
					return tryClone((("function: ") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr9_OName_Str)));
					
				} else if ((((local17___SelectHelper27__2378) === (~~(4))) ? 1 : 0)) {
					return tryClone((("prototype: ") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr9_OName_Str)));
					
				};
				
			};
			
		} else if ((((local17___SelectHelper26__2377) === (~~(6))) ? 1 : 0)) {
			return "select";
			
		} else {
			func5_Error("Internal error (unknown scope type)", 2675, "src\CompilerPasses\Parser.gbas");
			
		};
		
	};
	return "";
	
};
func13_ScopeName_Str = window['func13_ScopeName_Str'];
window['func13_ChangeVarName'] = function(param4_Vari) {
	param4_Vari.attr9_OName_Str = param4_Vari.attr8_Name_Str;
	param4_Vari.attr8_Name_Str = TRIM_Str(REPLACE_Str(param4_Vari.attr8_Name_Str, "$", "_Str"), " \t\r\n\v\f");
	{
		var local17___SelectHelper28__2380 = 0;
		local17___SelectHelper28__2380 = param4_Vari.attr3_Typ;
		if ((((local17___SelectHelper28__2380) === (~~(1))) ? 1 : 0)) {
			param4_Vari.attr8_Name_Str = (((((("local") + (CAST2STRING((param4_Vari.attr8_Name_Str).length)))) + ("_"))) + (param4_Vari.attr8_Name_Str));
			
		} else if ((((local17___SelectHelper28__2380) === (~~(2))) ? 1 : 0)) {
			var local5_Found_2381 = 0;
			local5_Found_2381 = 0;
			var forEachSaver19469 = global8_Compiler.attr7_Exports;
			for(var forEachCounter19469 = 0 ; forEachCounter19469 < forEachSaver19469.values.length ; forEachCounter19469++) {
				var local3_Exp_2382 = forEachSaver19469.values[forEachCounter19469];
			{
					if ((((local3_Exp_2382.attr8_Name_Str) === (param4_Vari.attr8_Name_Str)) ? 1 : 0)) {
						local5_Found_2381 = 1;
						if (param4_Vari.attr3_ref) {
							func5_Error((((("Cannot export '") + (param4_Vari.attr8_Name_Str))) + ("' because it is a reference (dont use in connection with BYREF and ALIAS!)")), 2694, "src\CompilerPasses\Parser.gbas");
							
						};
						if ((((local3_Exp_2382.attr12_RealName_Str) !== ("")) ? 1 : 0)) {
							param4_Vari.attr8_Name_Str = local3_Exp_2382.attr12_RealName_Str;
							
						};
						return 0;
						
					};
					
				}
				forEachSaver19469.values[forEachCounter19469] = local3_Exp_2382;
			
			};
			param4_Vari.attr8_Name_Str = (((((("global") + (CAST2STRING((param4_Vari.attr8_Name_Str).length)))) + ("_"))) + (param4_Vari.attr8_Name_Str));
			
		} else if ((((local17___SelectHelper28__2380) === (~~(3))) ? 1 : 0)) {
			param4_Vari.attr8_Name_Str = (((((("attr") + (CAST2STRING((param4_Vari.attr8_Name_Str).length)))) + ("_"))) + (param4_Vari.attr8_Name_Str));
			
		} else if ((((local17___SelectHelper28__2380) === (~~(4))) ? 1 : 0)) {
			param4_Vari.attr8_Name_Str = (((((((((("static") + (CAST2STRING((param4_Vari.attr8_Name_Str).length)))) + ("_"))) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_Vari.attr4_func).values[tmpPositionCache][0].attr9_OName_Str))) + ("_"))) + (param4_Vari.attr8_Name_Str));
			
		} else if ((((local17___SelectHelper28__2380) === (~~(5))) ? 1 : 0)) {
			param4_Vari.attr8_Name_Str = (((((("param") + (CAST2STRING((param4_Vari.attr8_Name_Str).length)))) + ("_"))) + (param4_Vari.attr8_Name_Str));
			
		} else if ((((local17___SelectHelper28__2380) === (~~(6))) ? 1 : 0)) {
			param4_Vari.attr8_Name_Str = (((((("const") + (CAST2STRING((param4_Vari.attr8_Name_Str).length)))) + ("_"))) + (param4_Vari.attr8_Name_Str));
			
		} else if ((((local17___SelectHelper28__2380) === (~~(7))) ? 1 : 0)) {
			param4_Vari.attr8_Name_Str = (((((("alias") + (CAST2STRING((param4_Vari.attr8_Name_Str).length)))) + ("_"))) + (param4_Vari.attr8_Name_Str));
			
		};
		
	};
	if (param4_Vari.attr3_ref) {
		param4_Vari.attr8_Name_Str = ((param4_Vari.attr8_Name_Str) + ("_ref"));
		
	};
	if ((((param4_Vari.attr6_PreDef) !== (-(1))) ? 1 : 0)) {
		if ((((global5_Exprs_ref[0].arrAccess(param4_Vari.attr6_PreDef).values[tmpPositionCache][0].attr3_Typ) === (36)) ? 1 : 0)) {
			global5_Exprs_ref[0].arrAccess(param4_Vari.attr6_PreDef).values[tmpPositionCache][0].attr4_vari = param4_Vari.attr2_ID;
			
		};
		
	};
	return 0;
	
};
func13_ChangeVarName = window['func13_ChangeVarName'];
window['func14_ChangeFuncName'] = function(param4_Func) {
	param4_Func.attr8_Name_Str = TRIM_Str(REPLACE_Str(param4_Func.attr8_Name_Str, "$", "_Str"), " \t\r\n\v\f");
	param4_Func.attr9_OName_Str = param4_Func.attr8_Name_Str;
	{
		var local17___SelectHelper29__2384 = 0;
		local17___SelectHelper29__2384 = param4_Func.attr3_Typ;
		if ((((local17___SelectHelper29__2384) === (~~(3))) ? 1 : 0)) {
			param4_Func.attr8_Name_Str = (((((((((((((("method") + (CAST2STRING((global8_Compiler.attr5_Types_ref[0].arrAccess(param4_Func.attr6_MyType).values[tmpPositionCache][0].attr8_Name_Str).length)))) + ("_"))) + (global8_Compiler.attr5_Types_ref[0].arrAccess(param4_Func.attr6_MyType).values[tmpPositionCache][0].attr8_Name_Str))) + ("_"))) + (CAST2STRING((param4_Func.attr8_Name_Str).length)))) + ("_"))) + (param4_Func.attr8_Name_Str));
			
		} else if ((((local17___SelectHelper29__2384) === (~~(1))) ? 1 : 0)) {
			if ((((param4_Func.attr6_Native) === (0)) ? 1 : 0)) {
				var local5_Found_2385 = 0;
				local5_Found_2385 = 0;
				var forEachSaver19773 = global8_Compiler.attr7_Exports;
				for(var forEachCounter19773 = 0 ; forEachCounter19773 < forEachSaver19773.values.length ; forEachCounter19773++) {
					var local3_Exp_2386 = forEachSaver19773.values[forEachCounter19773];
				{
						if ((((local3_Exp_2386.attr8_Name_Str) === (param4_Func.attr8_Name_Str)) ? 1 : 0)) {
							local5_Found_2385 = 1;
							if ((((local3_Exp_2386.attr12_RealName_Str) !== ("")) ? 1 : 0)) {
								param4_Func.attr8_Name_Str = local3_Exp_2386.attr12_RealName_Str;
								
							};
							break;
							
						};
						
					}
					forEachSaver19773.values[forEachCounter19773] = local3_Exp_2386;
				
				};
				if (((local5_Found_2385) ? 0 : 1)) {
					param4_Func.attr8_Name_Str = (((((("func") + (CAST2STRING((param4_Func.attr8_Name_Str).length)))) + ("_"))) + (param4_Func.attr8_Name_Str));
					
				};
				
			};
			
		} else if ((((local17___SelectHelper29__2384) === (~~(2))) ? 1 : 0)) {
			
		};
		
	};
	return 0;
	
};
func14_ChangeFuncName = window['func14_ChangeFuncName'];
window['func18_ChangeTypeName_Str'] = function(param8_Name_Str) {
	if ((((((((((((((((((((((((((((((((((param8_Name_Str) === ("string")) ? 1 : 0)) || ((((param8_Name_Str) === ("void")) ? 1 : 0))) ? 1 : 0)) || ((((param8_Name_Str) === ("float")) ? 1 : 0))) ? 1 : 0)) || ((((param8_Name_Str) === ("double")) ? 1 : 0))) ? 1 : 0)) || ((((param8_Name_Str) === ("int")) ? 1 : 0))) ? 1 : 0)) || ((((param8_Name_Str) === ("short")) ? 1 : 0))) ? 1 : 0)) || ((((param8_Name_Str) === ("byte")) ? 1 : 0))) ? 1 : 0)) || ((((param8_Name_Str) === ("bool")) ? 1 : 0))) ? 1 : 0)) || ((((param8_Name_Str) === ("boolean")) ? 1 : 0))) ? 1 : 0)) || ((((param8_Name_Str) === ("long")) ? 1 : 0))) ? 1 : 0)) || ((((param8_Name_Str) === ("single")) ? 1 : 0))) ? 1 : 0)) {
		return tryClone(param8_Name_Str);
		
	} else {
		return tryClone((((((("type") + (CAST2STRING((param8_Name_Str).length)))) + ("_"))) + (param8_Name_Str)));
		
	};
	return "";
	
};
func18_ChangeTypeName_Str = window['func18_ChangeTypeName_Str'];
window['func11_NewLine_Str'] = function() {
	var local8_Text_Str_2388 = "";
	local8_Text_Str_2388 = "\n";
	{
		var local1_i_2389 = 0.0;
		for (local1_i_2389 = 1;toCheck(local1_i_2389, global6_Indent, 1);local1_i_2389 += 1) {
			local8_Text_Str_2388 = ((local8_Text_Str_2388) + ("\t"));
			
		};
		
	};
	return tryClone(local8_Text_Str_2388);
	return "";
	
};
func11_NewLine_Str = window['func11_NewLine_Str'];
window['func8_IndentUp'] = function() {
	global6_Indent+=1;
	return 0;
	
};
func8_IndentUp = window['func8_IndentUp'];
window['func10_IndentDown'] = function() {
	global6_Indent+=-1;
	return 0;
	
};
func10_IndentDown = window['func10_IndentDown'];
window['func23_ManageFuncParamOverlaps'] = function() {
	var forEachSaver20004 = global8_Compiler.attr5_Funcs_ref[0];
	for(var forEachCounter20004 = 0 ; forEachCounter20004 < forEachSaver20004.values.length ; forEachCounter20004++) {
		var local4_Func_ref_2390 = forEachSaver20004.values[forEachCounter20004];
	{
			if ((((((((((local4_Func_ref_2390[0].attr6_Native) === (0)) ? 1 : 0)) && ((((local4_Func_ref_2390[0].attr3_Scp) !== (-(1))) ? 1 : 0))) ? 1 : 0)) && ((((local4_Func_ref_2390[0].attr10_IsAbstract) === (0)) ? 1 : 0))) ? 1 : 0)) {
				var local1_i_2391 = 0;
				local1_i_2391 = 0;
				var forEachSaver20002 = local4_Func_ref_2390[0].attr6_Params;
				for(var forEachCounter20002 = 0 ; forEachCounter20002 < forEachSaver20002.values.length ; forEachCounter20002++) {
					var local1_P_2392 = forEachSaver20002.values[forEachCounter20002];
				{
						if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_2392).values[tmpPositionCache][0].attr3_ref) !== (global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Func_ref_2390[0].attr10_CopyParams.arrAccess(local1_i_2391).values[tmpPositionCache]).values[tmpPositionCache][0].attr3_ref)) ? 1 : 0)) {
							global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_2392).values[tmpPositionCache][0].attr9_OwnerVari = local4_Func_ref_2390[0].attr10_CopyParams.arrAccess(local1_i_2391).values[tmpPositionCache];
							
						} else {
							global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Func_ref_2390[0].attr10_CopyParams.arrAccess(local1_i_2391).values[tmpPositionCache]).values[tmpPositionCache][0].attr8_Name_Str = global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_2392).values[tmpPositionCache][0].attr8_Name_Str;
							
						};
						local1_i_2391+=1;
						
					}
					forEachSaver20002.values[forEachCounter20002] = local1_P_2392;
				
				};
				
			};
			
		}
		forEachSaver20004.values[forEachCounter20004] = local4_Func_ref_2390;
	
	};
	return 0;
	
};
func23_ManageFuncParamOverlaps = window['func23_ManageFuncParamOverlaps'];
window['func11_Precompiler'] = function() {
	func5_Start();
	{
		var Err_Str = "";
		try {
			while (func8_EOFParse()) {
				func10_PreCommand(0);
				
			};
			
		} catch (Err_Str) {
			if (Err_Str instanceof OTTException) Err_Str = Err_Str.getText(); else throwError(Err_Str);{
				
			}
		};
		
	};
	return 0;
	
};
func11_Precompiler = window['func11_Precompiler'];
window['func10_PreCommand'] = function(param9_IgnoreAll) {
	if (func7_IsToken("?")) {
		var local7_Cur_Str_2395 = "";
		func14_MatchAndRemove("?", 17, "src\CompilerPasses\Preprocessor.gbas");
		local7_Cur_Str_2395 = func14_GetCurrent_Str();
		func13_RemoveCurrent();
		{
			var local17___SelectHelper30__2396 = "";
			local17___SelectHelper30__2396 = local7_Cur_Str_2395;
			if ((((local17___SelectHelper30__2396) === ("DEFINE")) ? 1 : 0)) {
				var local3_Def_2397 = pool_TDefine.alloc();
				local3_Def_2397.attr7_Key_Str = func14_GetCurrent_Str();
				func13_RemoveCurrent();
				if ((((func7_IsToken("\n")) === (0)) ? 1 : 0)) {
					local3_Def_2397.attr9_Value_Str = func14_GetCurrent_Str();
					func13_RemoveCurrent();
					
				} else {
					local3_Def_2397.attr9_Value_Str = CAST2STRING(1);
					
				};
				if (((param9_IgnoreAll) ? 0 : 1)) {
					DIMPUSH(global7_Defines, local3_Def_2397);
					
				};
				pool_TDefine.free(local3_Def_2397);
			} else if ((((local17___SelectHelper30__2396) === ("UNDEF")) ? 1 : 0)) {
				if (((param9_IgnoreAll) ? 0 : 1)) {
					var forEachSaver20099 = global7_Defines;
					for(var forEachCounter20099 = 0 ; forEachCounter20099 < forEachSaver20099.values.length ; forEachCounter20099++) {
						var local3_Def_2398 = forEachSaver20099.values[forEachCounter20099];
					{
							if (func7_IsToken(local3_Def_2398.attr7_Key_Str)) {
								forEachSaver20099.values[forEachCounter20099] = local3_Def_2398;
								DIMDEL(forEachSaver20099, forEachCounter20099);
								forEachCounter20099--;
								continue;
								
							};
							
						}
						forEachSaver20099.values[forEachCounter20099] = local3_Def_2398;
					
					};
					
				};
				func13_RemoveCurrent();
				
			} else if ((((local17___SelectHelper30__2396) === ("IFDEF")) ? 1 : 0)) {
				if (((param9_IgnoreAll) ? 0 : 1)) {
					var local4_doIt_2399 = 0;
					local4_doIt_2399 = 0;
					var forEachSaver20130 = global7_Defines;
					for(var forEachCounter20130 = 0 ; forEachCounter20130 < forEachSaver20130.values.length ; forEachCounter20130++) {
						var local3_Def_2400 = forEachSaver20130.values[forEachCounter20130];
					{
							if (func7_IsToken(local3_Def_2400.attr7_Key_Str)) {
								local4_doIt_2399 = 1;
								break;
								
							};
							
						}
						forEachSaver20130.values[forEachCounter20130] = local3_Def_2400;
					
					};
					func13_RemoveCurrent();
					func14_MatchAndRemove("\n", 49, "src\CompilerPasses\Preprocessor.gbas");
					func5_PreIf(local4_doIt_2399);
					
				} else {
					func13_RemoveCurrent();
					func14_MatchAndRemove("\n", 53, "src\CompilerPasses\Preprocessor.gbas");
					func5_PreIf(2);
					
				};
				
			} else if ((((local17___SelectHelper30__2396) === ("IFNDEF")) ? 1 : 0)) {
				if (((param9_IgnoreAll) ? 0 : 1)) {
					var local4_doIt_2401 = 0;
					local4_doIt_2401 = 1;
					var forEachSaver20175 = global7_Defines;
					for(var forEachCounter20175 = 0 ; forEachCounter20175 < forEachSaver20175.values.length ; forEachCounter20175++) {
						var local3_Def_2402 = forEachSaver20175.values[forEachCounter20175];
					{
							if (func7_IsToken(local3_Def_2402.attr7_Key_Str)) {
								local4_doIt_2401 = 0;
								break;
								
							};
							
						}
						forEachSaver20175.values[forEachCounter20175] = local3_Def_2402;
					
					};
					func13_RemoveCurrent();
					func14_MatchAndRemove("\n", 66, "src\CompilerPasses\Preprocessor.gbas");
					func5_PreIf(local4_doIt_2401);
					
				} else {
					func13_RemoveCurrent();
					func14_MatchAndRemove("\n", 71, "src\CompilerPasses\Preprocessor.gbas");
					func5_PreIf(2);
					
				};
				
			} else if ((((local17___SelectHelper30__2396) === ("IF")) ? 1 : 0)) {
				if (((param9_IgnoreAll) ? 0 : 1)) {
					var local6_Result_2403 = 0, local3_Pos_2404 = 0.0;
					local6_Result_2403 = 0;
					local3_Pos_2404 = global8_Compiler.attr11_currentPosi;
					{
						var Error_Str = "";
						try {
							local6_Result_2403 = ~~(func13_CalculateTree(unref(global5_Exprs_ref[0].arrAccess(func10_Expression(0)).values[tmpPositionCache][0])));
							
						} catch (Error_Str) {
							if (Error_Str instanceof OTTException) Error_Str = Error_Str.getText(); else throwError(Error_Str);{
								func5_Error((((("Unable to evaluate IF (syntax error?) '") + (Error_Str))) + ("'")), 82, "src\CompilerPasses\Preprocessor.gbas");
								
							}
						};
						
					};
					global8_Compiler.attr11_currentPosi = ~~(((local3_Pos_2404) - (1)));
					func7_GetNext();
					while (((func7_IsToken("\n")) ? 0 : 1)) {
						func13_RemoveCurrent();
						
					};
					func14_MatchAndRemove("\n", 91, "src\CompilerPasses\Preprocessor.gbas");
					if ((((local6_Result_2403) === (1)) ? 1 : 0)) {
						func5_PreIf(1);
						
					} else {
						func5_PreIf(0);
						
					};
					
				} else {
					while (((func7_IsToken("\n")) ? 0 : 1)) {
						func13_RemoveCurrent();
						
					};
					func14_MatchAndRemove("\n", 103, "src\CompilerPasses\Preprocessor.gbas");
					func5_PreIf(2);
					
				};
				
			} else if ((((local17___SelectHelper30__2396) === ("WARNING")) ? 1 : 0)) {
				if (((param9_IgnoreAll) ? 0 : 1)) {
					func7_Warning(func14_GetCurrent_Str());
					
				};
				func13_RemoveCurrent();
				
			} else if ((((local17___SelectHelper30__2396) === ("ERROR")) ? 1 : 0)) {
				if (((param9_IgnoreAll) ? 0 : 1)) {
					func5_Error(func14_GetCurrent_Str(), 111, "src\CompilerPasses\Preprocessor.gbas");
					
				};
				func13_RemoveCurrent();
				
			} else if ((((local17___SelectHelper30__2396) === ("ELSE")) ? 1 : 0)) {
				return 1;
				
			} else if ((((local17___SelectHelper30__2396) === ("ENDIF")) ? 1 : 0)) {
				return 2;
				
			} else if ((((local17___SelectHelper30__2396) === ("OPTIMIZE")) ? 1 : 0)) {
				if (((param9_IgnoreAll) ? 0 : 1)) {
					{
						var local17___SelectHelper31__2406 = "";
						local17___SelectHelper31__2406 = func14_GetCurrent_Str();
						if ((((local17___SelectHelper31__2406) === ("SIMPLE")) ? 1 : 0)) {
							global13_OptimizeLevel = 1;
							
						} else if ((((local17___SelectHelper31__2406) === ("AGGRESSIVE")) ? 1 : 0)) {
							global13_OptimizeLevel = 2;
							
						} else if ((((local17___SelectHelper31__2406) === ("NONE")) ? 1 : 0)) {
							global13_OptimizeLevel = 0;
							
						} else {
							func5_Error("Unknown optimization level", 137, "src\CompilerPasses\Preprocessor.gbas");
							
						};
						
					};
					
				};
				func13_RemoveCurrent();
				
			} else if ((((local17___SelectHelper30__2396) === ("GRAPHICS")) ? 1 : 0)) {
				if (((param9_IgnoreAll) ? 0 : 1)) {
					global7_CONSOLE = 0;
					
				};
				
			} else if ((((local17___SelectHelper30__2396) === ("DOC")) ? 1 : 0)) {
				func8_ParseDoc();
				
			} else {
				func5_Error((((("Expecting preprocessor command got '") + (local7_Cur_Str_2395))) + ("'")), 148, "src\CompilerPasses\Preprocessor.gbas");
				
			};
			
		};
		func14_MatchAndRemove("\n", 151, "src\CompilerPasses\Preprocessor.gbas");
		
	} else {
		var local6_Is_Str_2407 = "";
		local6_Is_Str_2407 = func14_GetCurrent_Str();
		if ((((local6_Is_Str_2407) === ("_")) ? 1 : 0)) {
			func13_RemoveCurrent();
			func14_MatchAndRemove("\n", 156, "src\CompilerPasses\Preprocessor.gbas");
			
		} else {
			if (param9_IgnoreAll) {
				func13_RemoveCurrent();
				
			} else {
				func7_GetNext();
				
			};
			
		};
		
	};
	return 0;
	return 0;
	
};
func10_PreCommand = window['func10_PreCommand'];
window['func5_PreIf'] = function(param4_doIt) {
	var local8_Text_Str_2409 = "";
	if ((((param4_doIt) === (0)) ? 1 : 0)) {
		if ((((func7_PreSkip(1)) === (1)) ? 1 : 0)) {
			func14_MatchAndRemove("\n", 173, "src\CompilerPasses\Preprocessor.gbas");
			if ((((func7_PreSkip(0)) === (1)) ? 1 : 0)) {
				func5_Error("Expecting '?ENDIF'", 175, "src\CompilerPasses\Preprocessor.gbas");
				
			};
			
		};
		
	} else if ((((param4_doIt) === (1)) ? 1 : 0)) {
		if ((((func7_PreSkip(0)) === (1)) ? 1 : 0)) {
			if ((((func7_PreSkip(1)) === (1)) ? 1 : 0)) {
				func5_Error("Expectiong '?ENDIF'", 179, "src\CompilerPasses\Preprocessor.gbas");
				
			};
			
		};
		
	} else if ((((param4_doIt) === (2)) ? 1 : 0)) {
		if ((((func7_PreSkip(1)) === (1)) ? 1 : 0)) {
			if ((((func7_PreSkip(1)) === (1)) ? 1 : 0)) {
				func5_Error("Expecting '?ENDIF'", 184, "src\CompilerPasses\Preprocessor.gbas");
				
			};
			
		};
		
	} else {
		func5_Error("Internal error (unknown preif)", 187, "src\CompilerPasses\Preprocessor.gbas");
		
	};
	return 0;
	
};
func5_PreIf = window['func5_PreIf'];
window['func7_PreSkip'] = function(param9_RemoveAll) {
	while (func8_EOFParse()) {
		var local1_E_2411 = 0;
		local1_E_2411 = func10_PreCommand(param9_RemoveAll);
		if ((((local1_E_2411) > (0)) ? 1 : 0)) {
			return tryClone(local1_E_2411);
			
		};
		
	};
	func5_Error("Unexpected End Of File (maybe missing ?ENDIF)", 198, "src\CompilerPasses\Preprocessor.gbas");
	return 0;
	
};
func7_PreSkip = window['func7_PreSkip'];
window['func13_CalculateTree'] = function(param4_expr) {
	{
		var local17___SelectHelper32__2413 = 0;
		local17___SelectHelper32__2413 = param4_expr.attr3_Typ;
		if ((((local17___SelectHelper32__2413) === (~~(3))) ? 1 : 0)) {
			return tryClone(param4_expr.attr6_intval);
			
		} else if ((((local17___SelectHelper32__2413) === (~~(4))) ? 1 : 0)) {
			return tryClone(param4_expr.attr8_floatval);
			
		} else if ((((local17___SelectHelper32__2413) === (~~(46))) ? 1 : 0)) {
			return tryClone(unref(((func13_CalculateTree(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))) ? 0 : 1)));
			
		} else if ((((local17___SelectHelper32__2413) === (~~(15))) ? 1 : 0)) {
			return tryClone(INTEGER(func13_CalculateTree(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))));
			
		} else if ((((local17___SelectHelper32__2413) === (~~(16))) ? 1 : 0)) {
			return tryClone(func13_CalculateTree(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0])));
			
		} else if ((((local17___SelectHelper32__2413) === (~~(1))) ? 1 : 0)) {
			var local4_Left_2414 = 0.0, local5_Right_2415 = 0.0;
			local4_Left_2414 = func13_CalculateTree(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_Left).values[tmpPositionCache][0]));
			local5_Right_2415 = func13_CalculateTree(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0]));
			{
				var local17___SelectHelper33__2416 = "";
				local17___SelectHelper33__2416 = global9_Operators_ref[0].arrAccess(param4_expr.attr2_Op).values[tmpPositionCache][0].attr7_Sym_Str;
				if ((((local17___SelectHelper33__2416) === ("+")) ? 1 : 0)) {
					return tryClone(((local4_Left_2414) + (local5_Right_2415)));
					
				} else if ((((local17___SelectHelper33__2416) === ("-")) ? 1 : 0)) {
					return tryClone(((local4_Left_2414) - (local5_Right_2415)));
					
				} else if ((((local17___SelectHelper33__2416) === ("*")) ? 1 : 0)) {
					return tryClone(((local4_Left_2414) * (local5_Right_2415)));
					
				} else if ((((local17___SelectHelper33__2416) === ("/")) ? 1 : 0)) {
					return tryClone(((local4_Left_2414) / (local5_Right_2415)));
					
				} else if ((((local17___SelectHelper33__2416) === ("^")) ? 1 : 0)) {
					return tryClone(POW(local4_Left_2414, local5_Right_2415));
					
				} else if ((((local17___SelectHelper33__2416) === ("=")) ? 1 : 0)) {
					return tryClone((((local4_Left_2414) === (local5_Right_2415)) ? 1 : 0));
					
				} else if ((((local17___SelectHelper33__2416) === (">")) ? 1 : 0)) {
					return tryClone((((local4_Left_2414) > (local5_Right_2415)) ? 1 : 0));
					
				} else if ((((local17___SelectHelper33__2416) === ("<")) ? 1 : 0)) {
					return tryClone((((local4_Left_2414) < (local5_Right_2415)) ? 1 : 0));
					
				} else if ((((local17___SelectHelper33__2416) === ("<=")) ? 1 : 0)) {
					return tryClone((((local4_Left_2414) <= (local5_Right_2415)) ? 1 : 0));
					
				} else if ((((local17___SelectHelper33__2416) === (">=")) ? 1 : 0)) {
					return tryClone((((local4_Left_2414) >= (local5_Right_2415)) ? 1 : 0));
					
				} else if ((((local17___SelectHelper33__2416) === ("AND")) ? 1 : 0)) {
					return tryClone((((local4_Left_2414) && (local5_Right_2415)) ? 1 : 0));
					
				} else if ((((local17___SelectHelper33__2416) === ("OR")) ? 1 : 0)) {
					return tryClone((((local4_Left_2414) || (local5_Right_2415)) ? 1 : 0));
					
				} else {
					func5_Error("Internal error (unimplemented operator!)", 242, "src\CompilerPasses\Preprocessor.gbas");
					
				};
				
			};
			
		} else {
			throw new OTTException((((("Unable to resolve '") + (CAST2STRING(param4_expr.attr3_Typ)))) + ("'")), "\src\CompilerPasses\Preprocessor.gbas", 246);
			
		};
		
	};
	return 0;
	
};
func13_CalculateTree = window['func13_CalculateTree'];
window['func12_DoTarget_Str'] = function(param8_Name_Str) {
	var local10_Output_Str_2418 = "";
	global8_Compiler.attr14_errorState_Str = ((((" (target '") + (param8_Name_Str))) + ("' error)"));
	global10_Target_Str = param8_Name_Str;
	global13_SettingIn_Str = "";
	REDIM(global9_Templates, [0], pool_TTemplate.alloc() );
	REDIM(global9_Libraries, [0], pool_TLibrary.alloc() );
	REDIM(global10_Blacklists, [0], pool_TBlackList.alloc() );
	REDIM(global7_Actions, [0], pool_TAction.alloc() );
	local10_Output_Str_2418 = "";
	var forEachSaver20791 = global10_Generators;
	for(var forEachCounter20791 = 0 ; forEachCounter20791 < forEachSaver20791.values.length ; forEachCounter20791++) {
		var local1_G_2419 = forEachSaver20791.values[forEachCounter20791];
	{
			if ((((UCASE_Str(local1_G_2419.attr8_Name_Str)) === (UCASE_Str(global8_Lang_Str))) ? 1 : 0)) {
				global8_Compiler.attr14_errorState_Str = " (generate error)";
				local10_Output_Str_2418 = (("") + (CAST2STRING(local1_G_2419.attr8_genProto())));
				global8_Compiler.attr14_errorState_Str = ((((" (target '") + (param8_Name_Str))) + ("' error)"));
				break;
				
			};
			
		}
		forEachSaver20791.values[forEachCounter20791] = local1_G_2419;
	
	};
	if ((((local10_Output_Str_2418) === ("")) ? 1 : 0)) {
		func5_Error("Empty output!", 81, "src\Target.gbas");
		
	};
	return tryClone(local10_Output_Str_2418);
	return "";
	
};
func12_DoTarget_Str = window['func12_DoTarget_Str'];
window['func11_SetupTarget'] = function(param8_Name_Str) {
	global13_SettingIn_Str = "";
	global10_Target_Str = param8_Name_Str;
	if (global7_CONSOLE) {
		global8_Mode_Str = "console";
		
	} else {
		global8_Mode_Str = "2d";
		
	};
	global10_Target_Str = "HTML5";
	global8_Lang_Str = "js";
	RegisterDefine(UCASE_Str(global10_Target_Str), "1");
	RegisterDefine("JS", "1");
	return 0;
	
};
func11_SetupTarget = window['func11_SetupTarget'];
window['func9_WriteFile'] = function(param8_File_Str, param8_Text_Str) {
	return 0;
	
};
func9_WriteFile = window['func9_WriteFile'];
window['method9_type3_XML_7_ReadXML'] = function(param8_File_Str, param5_event, param4_self) {
	param4_self.attr5_Event = param5_event;
	param4_self.attr8_Text_Str = func12_LoadFile_Str(param8_File_Str);
	param4_self.attr8_Position = 0;
	(param4_self).SkipWhitespaces();
	while (((((param4_self).Get_Str()) !== ("<")) ? 1 : 0)) {
		param4_self.attr8_Position+=1;
		
	};
	if ((((MID_Str(param4_self.attr8_Text_Str, param4_self.attr8_Position, 2)) === ("<?")) ? 1 : 0)) {
		while (((((param4_self).Get_Str()) !== (">")) ? 1 : 0)) {
			param4_self.attr8_Position+=1;
			
		};
		param4_self.attr8_Position+=1;
		
	};
	(param4_self).SkipWhitespaces();
	{
		var Err_Str = "";
		try {
			(param4_self).ParseNode();
			
		} catch (Err_Str) {
			if (Err_Str instanceof OTTException) Err_Str = Err_Str.getText(); else throwError(Err_Str);{
				if ((((Err_Str) === ("EXIT")) ? 1 : 0)) {
					
				} else {
					STDOUT(Err_Str);
					
				};
				
			}
		};
		
	};
	return 0;
	
};
method9_type3_XML_7_ReadXML = window['method9_type3_XML_7_ReadXML'];
window['method9_type3_XML_10_ParseLayer'] = function(param4_self) {
	(param4_self).SkipWhitespaces();
	while (((((param4_self).Get_Str()) === ("<")) ? 1 : 0)) {
		var local8_HasSlash_2430 = 0;
		local8_HasSlash_2430 = 0;
		param4_self.attr8_Position+=1;
		(param4_self).SkipWhitespaces();
		if (((((param4_self).Get_Str()) === ("/")) ? 1 : 0)) {
			local8_HasSlash_2430 = 1;
			
		};
		while (((((param4_self).Get_Str()) !== ("<")) ? 1 : 0)) {
			param4_self.attr8_Position+=-1;
			
		};
		if (local8_HasSlash_2430) {
			return tryClone(0);
			
		};
		(param4_self).ParseNode();
		
	};
	return tryClone(1);
	return 0;
	
};
method9_type3_XML_10_ParseLayer = window['method9_type3_XML_10_ParseLayer'];
window['method9_type3_XML_9_ParseNode'] = function(param4_self) {
	var local8_Name_Str_2433 = "", local10_Attributes_2434 = pool_array.alloc(pool_xmlAttribute.alloc());
	if (((((param4_self).Get_Str()) !== ("<")) ? 1 : 0)) {
		throw new OTTException("XML Error - Expecting '<'", "\src\Utils\XMLReader.gbas", 69);
		
	};
	param4_self.attr8_Position+=1;
	(param4_self).SkipWhitespaces();
	local8_Name_Str_2433 = (param4_self).ParseIdentifier_Str();
	if (((((param4_self).Get_Str()) === (" ")) ? 1 : 0)) {
		(param4_self).SkipWhitespaces();
		while ((((((((param4_self).Get_Str()) !== ("/")) ? 1 : 0)) && (((((param4_self).Get_Str()) !== (">")) ? 1 : 0))) ? 1 : 0)) {
			var local3_Att_2435 = pool_xmlAttribute.alloc(), local3_Pos_2436 = 0;
			(param4_self).SkipWhitespaces();
			local3_Att_2435.attr8_Name_Str = (param4_self).ParseIdentifier_Str();
			(param4_self).SkipWhitespaces();
			if (((((param4_self).Get_Str()) !== ("=")) ? 1 : 0)) {
				throw new OTTException("XML Error - Expecting '='", "\src\Utils\XMLReader.gbas", 86);
				
			};
			param4_self.attr8_Position+=1;
			(param4_self).SkipWhitespaces();
			if (((((param4_self).Get_Str()) !== ("\"")) ? 1 : 0)) {
				throw new OTTException("XML Error - Expecting '\"'", "\src\Utils\XMLReader.gbas", 91);
				
			};
			param4_self.attr8_Position+=1;
			local3_Pos_2436 = param4_self.attr8_Position;
			while (((((param4_self).Get_Str()) !== ("\"")) ? 1 : 0)) {
				param4_self.attr8_Position+=1;
				
			};
			param4_self.attr8_Position+=1;
			local3_Att_2435.attr9_Value_Str = MID_Str(param4_self.attr8_Text_Str, local3_Pos_2436, ((((param4_self.attr8_Position) - (local3_Pos_2436))) - (1)));
			(param4_self).SkipWhitespaces();
			DIMPUSH(local10_Attributes_2434, local3_Att_2435);
			pool_xmlAttribute.free(local3_Att_2435);
		};
		
	};
	param4_self.attr5_Event(local8_Name_Str_2433, local10_Attributes_2434);
	{
		var local17___SelectHelper34__2437 = "";
		local17___SelectHelper34__2437 = (param4_self).Get_Str();
		if ((((local17___SelectHelper34__2437) === (">")) ? 1 : 0)) {
			param4_self.attr8_Position+=1;
			(param4_self).SkipWhitespaces();
			if ((param4_self).ParseLayer()) {
				throw new OTTException((((("XML Error - Unexpected End of File, expecting </") + (local8_Name_Str_2433))) + (">")), "\src\Utils\XMLReader.gbas", 113);
				
			};
			(param4_self).SkipWhitespaces();
			if (((((param4_self).Get_Str()) !== ("<")) ? 1 : 0)) {
				throw new OTTException("XML Error - Expecting '<'", "\src\Utils\XMLReader.gbas", 117);
				
			};
			param4_self.attr8_Position+=1;
			(param4_self).SkipWhitespaces();
			if (((((param4_self).Get_Str()) !== ("/")) ? 1 : 0)) {
				throw new OTTException("XML Error - Expecting '/'", "\src\Utils\XMLReader.gbas", 120);
				
			};
			param4_self.attr8_Position+=1;
			if ((((local8_Name_Str_2433) !== ((param4_self).ParseIdentifier_Str())) ? 1 : 0)) {
				throw new OTTException("XML Error - Nodes do not match", "\src\Utils\XMLReader.gbas", 123);
				
			};
			if (((((param4_self).Get_Str()) !== (">")) ? 1 : 0)) {
				throw new OTTException("XML Error Expecting '>'", "\src\Utils\XMLReader.gbas", 124);
				
			};
			param4_self.attr8_Position+=1;
			(param4_self).SkipWhitespaces();
			
		} else if ((((local17___SelectHelper34__2437) === ("/")) ? 1 : 0)) {
			param4_self.attr8_Position+=1;
			if (((((param4_self).Get_Str()) !== (">")) ? 1 : 0)) {
				throw new OTTException("XML Error - Expecting '>'", "\src\Utils\XMLReader.gbas", 130);
				
			};
			param4_self.attr8_Position+=1;
			(param4_self).SkipWhitespaces();
			
		} else {
			throw new OTTException("XML Error", "\src\Utils\XMLReader.gbas", 134);
			
		};
		
	};
	return 0;
	pool_array.free(local10_Attributes_2434);
};
method9_type3_XML_9_ParseNode = window['method9_type3_XML_9_ParseNode'];
window['method9_type3_XML_19_ParseIdentifier_Str'] = function(param4_self) {
	var local3_Pos_2440 = 0;
	local3_Pos_2440 = param4_self.attr8_Position;
	while ((((((((((((((param4_self).Get_Str()) !== (" ")) ? 1 : 0)) && (((((param4_self).Get_Str()) !== ("/")) ? 1 : 0))) ? 1 : 0)) && (((((param4_self).Get_Str()) !== (">")) ? 1 : 0))) ? 1 : 0)) && (((((param4_self).Get_Str()) !== ("=")) ? 1 : 0))) ? 1 : 0)) {
		param4_self.attr8_Position+=1;
		
	};
	if ((((param4_self.attr8_Position) >= ((param4_self.attr8_Text_Str).length)) ? 1 : 0)) {
		throw new OTTException("XML Error", "\src\Utils\XMLReader.gbas", 143);
		
	};
	return tryClone(UCASE_Str(MID_Str(param4_self.attr8_Text_Str, local3_Pos_2440, ((param4_self.attr8_Position) - (local3_Pos_2440)))));
	return "";
	
};
method9_type3_XML_19_ParseIdentifier_Str = window['method9_type3_XML_19_ParseIdentifier_Str'];
window['method9_type3_XML_7_Get_Str'] = function(param4_self) {
	if ((((param4_self.attr8_Position) >= ((param4_self.attr8_Text_Str).length)) ? 1 : 0)) {
		throw new OTTException("XML Error - Unexpected End Of File", "\src\Utils\XMLReader.gbas", 149);
		
	} else {
		return tryClone(MID_Str(param4_self.attr8_Text_Str, param4_self.attr8_Position, 1));
		
	};
	return "";
	
};
method9_type3_XML_7_Get_Str = window['method9_type3_XML_7_Get_Str'];
window['method9_type3_XML_15_SkipWhitespaces'] = function(param4_self) {
	while (((((((param4_self.attr8_Position) < ((param4_self.attr8_Text_Str).length)) ? 1 : 0)) && ((((((((((((((param4_self).Get_Str()) === (" ")) ? 1 : 0)) || (((((param4_self).Get_Str()) === ("\n")) ? 1 : 0))) ? 1 : 0)) || (((((param4_self).Get_Str()) === (CHR_Str(13))) ? 1 : 0))) ? 1 : 0)) || (((((param4_self).Get_Str()) === ("\t")) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) {
		param4_self.attr8_Position+=1;
		
	};
	return 0;
	
};
method9_type3_XML_15_SkipWhitespaces = window['method9_type3_XML_15_SkipWhitespaces'];
window['method13_type7_TObject_12_ToString_Str'] = function(param4_self) {
	return "Object";
	return "";
	
};
method13_type7_TObject_12_ToString_Str = window['method13_type7_TObject_12_ToString_Str'];
window['method13_type7_TObject_6_Equals'] = function(param3_Obj, param4_self) {
	if ((((param3_Obj) === (param4_self)) ? 1 : 0)) {
		return 1;
		
	} else {
		return tryClone(0);
		
	};
	return 0;
	
};
method13_type7_TObject_6_Equals = window['method13_type7_TObject_6_Equals'];
window['method13_type7_TObject_10_ToHashCode'] = function(param4_self) {
	return 0;
	return 0;
	
};
method13_type7_TObject_10_ToHashCode = window['method13_type7_TObject_10_ToHashCode'];
window['Lang_Generator_Str'] = function() {
	return function() { throwError("NullPrototypeException"); };
};
Lang_Generator_Str = window['Lang_Generator_Str'];
window['XMLEvent'] = function() {
	return function() { throwError("NullPrototypeException"); };
};
XMLEvent = window['XMLEvent'];
var vtbl_type9_TCompiler = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
window ['type9_TCompiler'] = function() { this.reset(); }
window['type9_TCompiler'].prototype.getTypeName = function() { return "type9_TCompiler" };
	window['type9_TCompiler'].prototype.reset = function() {
	this.attr8_Code_Str = "";
	this.attr6_Tokens = pool_array.alloc(pool_TToken.alloc());
	this.attr11_currentPosi = 0;
	this.attr11_GlobalFuncs = pool_HashMap.alloc();
	this.attr5_Funcs_ref = [pool_array.alloc([pool_TIdentifierFunc.alloc()])];
	this.attr7_Globals = pool_array.alloc(0);
	this.attr5_Types_ref = [pool_array.alloc([pool_TIdentifierType.alloc()])];
	this.attr5_Varis_ref = [pool_array.alloc([pool_TIdentifierVari.alloc()])];
	this.attr13_protoCheckers = pool_array.alloc(pool_TProtoChecker.alloc());
	this.attr10_DataBlocks = pool_array.alloc(pool_TDataBlock.alloc());
	this.attr9_MainScope = 0;
	this.attr12_CurrentScope = 0;
	this.attr14_ImportantScope = 0;
	this.attr11_currentFunc = 0;
	this.attr18_currentForEach_Str = "";
	this.attr6_inLoop = 0;
	this.attr13_LastMaxTokens = 0;
	this.attr8_WasError = 0;
	this.attr7_HasGoto = 0;
	this.attr14_errorState_Str = "";
	this.attr7_Exports = pool_array.alloc(pool_TExport.alloc());
	this.attr11_LastTokenID = 0;
	this.attr13_FaultTolerant = 0;
	this.attr6_Errors = pool_array.alloc(pool_TError.alloc());
	this.attr15_HeaderFiles_Str = pool_array.alloc("");
	this.attr14_HeaderText_Str = "";
	this.attr7_GOTOErr = 0;
	this.vtbl = vtbl_type9_TCompiler;
	this.attr12_CurrentScope = -(1);
	this.attr14_ImportantScope = -(1);
	this.attr11_currentFunc = -(1);
	this.attr8_WasError = 0;
	this.attr7_HasGoto = 0;
	this.attr14_errorState_Str = "";
	this.attr11_LastTokenID = 0;
	this.attr13_FaultTolerant = 0;
	this.pool = pool_TCompiler;
	this.succ = null;
	
};
window['type9_TCompiler'].prototype.clone = function() {
	var other = pool_TCompiler.alloc();
	other.attr8_Code_Str = this.attr8_Code_Str;
	other.attr6_Tokens = tryClone(this.attr6_Tokens);
	other.attr11_currentPosi = this.attr11_currentPosi;
	other.attr11_GlobalFuncs = tryClone(this.attr11_GlobalFuncs);
	other.attr5_Funcs_ref = tryClone(this.attr5_Funcs_ref);
	other.attr7_Globals = tryClone(this.attr7_Globals);
	other.attr5_Types_ref = tryClone(this.attr5_Types_ref);
	other.attr5_Varis_ref = tryClone(this.attr5_Varis_ref);
	other.attr13_protoCheckers = tryClone(this.attr13_protoCheckers);
	other.attr10_DataBlocks = tryClone(this.attr10_DataBlocks);
	other.attr9_MainScope = this.attr9_MainScope;
	other.attr12_CurrentScope = this.attr12_CurrentScope;
	other.attr14_ImportantScope = this.attr14_ImportantScope;
	other.attr11_currentFunc = this.attr11_currentFunc;
	other.attr18_currentForEach_Str = this.attr18_currentForEach_Str;
	other.attr6_inLoop = this.attr6_inLoop;
	other.attr13_LastMaxTokens = this.attr13_LastMaxTokens;
	other.attr8_WasError = this.attr8_WasError;
	other.attr7_HasGoto = this.attr7_HasGoto;
	other.attr14_errorState_Str = this.attr14_errorState_Str;
	other.attr7_Exports = tryClone(this.attr7_Exports);
	other.attr11_LastTokenID = this.attr11_LastTokenID;
	other.attr13_FaultTolerant = this.attr13_FaultTolerant;
	other.attr6_Errors = tryClone(this.attr6_Errors);
	other.attr15_HeaderFiles_Str = tryClone(this.attr15_HeaderFiles_Str);
	other.attr14_HeaderText_Str = this.attr14_HeaderText_Str;
	other.attr7_GOTOErr = this.attr7_GOTOErr;
	other.vtbl = this.vtbl;
	other.pool = this.pool;
	return other;
};
window['type9_TCompiler'].prototype.bridgeToJS = function(isJSON) {
	return {
		"Code_Str": this.attr8_Code_Str,
		"Tokens": (this.attr6_Tokens).bridgeToJS(isJSON),
		"currentPosi": this.attr11_currentPosi,
		"GlobalFuncs": (this.attr11_GlobalFuncs).bridgeToJS(isJSON),
		"Funcs": (this.attr5_Funcs_ref).bridgeToJS(isJSON),
		"Globals": (this.attr7_Globals).bridgeToJS(isJSON),
		"Types": (this.attr5_Types_ref).bridgeToJS(isJSON),
		"Varis": (this.attr5_Varis_ref).bridgeToJS(isJSON),
		"protoCheckers": (this.attr13_protoCheckers).bridgeToJS(isJSON),
		"DataBlocks": (this.attr10_DataBlocks).bridgeToJS(isJSON),
		"MainScope": this.attr9_MainScope,
		"CurrentScope": this.attr12_CurrentScope,
		"ImportantScope": this.attr14_ImportantScope,
		"currentFunc": this.attr11_currentFunc,
		"currentForEach_Str": this.attr18_currentForEach_Str,
		"inLoop": this.attr6_inLoop,
		"LastMaxTokens": this.attr13_LastMaxTokens,
		"WasError": this.attr8_WasError,
		"HasGoto": this.attr7_HasGoto,
		"errorState_Str": this.attr14_errorState_Str,
		"Exports": (this.attr7_Exports).bridgeToJS(isJSON),
		"LastTokenID": this.attr11_LastTokenID,
		"FaultTolerant": this.attr13_FaultTolerant,
		"Errors": (this.attr6_Errors).bridgeToJS(isJSON),
		"HeaderFiles_Str": (this.attr15_HeaderFiles_Str).bridgeToJS(isJSON),
		"HeaderText_Str": this.attr14_HeaderText_Str,
		"GOTOErr": this.attr7_GOTOErr,
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
pool_TCompiler = { 
	last: null, 
	alloc: function() { 
		var obj = null;
		if (pool_TCompiler.last !== null) {
			obj = pool_TCompiler.last;
			pool_TCompiler.last = obj.succ;
			obj.succ = null;
		} else {
			obj = new type9_TCompiler();
		}
		return obj;
	},
	free: function(obj)  {
		if (obj.succ !== null) return;
		obj.reset();
		obj.succ = pool_TCompiler.last;
		pool_TCompiler.last = obj;
	}
}
type9_TCompiler = window['type9_TCompiler'];
type9_TCompiler.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type9_TCompiler.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type9_TCompiler.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type15_TIdentifierFunc = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
window ['type15_TIdentifierFunc'] = function() { this.reset(); }
window['type15_TIdentifierFunc'].prototype.getTypeName = function() { return "type15_TIdentifierFunc" };
	window['type15_TIdentifierFunc'].prototype.reset = function() {
	this.attr9_OName_Str = "";
	this.attr8_Name_Str = "";
	this.attr6_Params = pool_array.alloc(0);
	this.attr10_CopyParams = pool_array.alloc(0);
	this.attr7_Statics = pool_array.alloc(0);
	this.attr8_datatype = pool_TDatatype.alloc();
	this.attr6_Native = 0;
	this.attr3_Scp = 0;
	this.attr2_ID = 0;
	this.attr3_Typ = 0;
	this.attr3_Tok = 0;
	this.attr10_PlzCompile = 0;
	this.attr6_HasRef = 0;
	this.attr6_DefTok = 0;
	this.attr15_UsedAsPrototype = 0;
	this.attr6_MyType = 0;
	this.attr7_SelfVar = 0;
	this.attr10_IsAbstract = 0;
	this.attr10_IsCallback = 0;
	this.vtbl = vtbl_type15_TIdentifierFunc;
	this.attr3_Scp = -(1);
	this.attr6_HasRef = 0;
	this.attr15_UsedAsPrototype = 0;
	this.attr6_MyType = -(1);
	this.attr7_SelfVar = -(1);
	this.attr10_IsCallback = 0;
	this.pool = pool_TIdentifierFunc;
	this.succ = null;
	
};
window['type15_TIdentifierFunc'].prototype.clone = function() {
	var other = pool_TIdentifierFunc.alloc();
	other.attr9_OName_Str = this.attr9_OName_Str;
	other.attr8_Name_Str = this.attr8_Name_Str;
	other.attr6_Params = tryClone(this.attr6_Params);
	other.attr10_CopyParams = tryClone(this.attr10_CopyParams);
	other.attr7_Statics = tryClone(this.attr7_Statics);
	other.attr8_datatype = tryClone(this.attr8_datatype);
	other.attr6_Native = this.attr6_Native;
	other.attr3_Scp = this.attr3_Scp;
	other.attr2_ID = this.attr2_ID;
	other.attr3_Typ = this.attr3_Typ;
	other.attr3_Tok = this.attr3_Tok;
	other.attr10_PlzCompile = this.attr10_PlzCompile;
	other.attr6_HasRef = this.attr6_HasRef;
	other.attr6_DefTok = this.attr6_DefTok;
	other.attr15_UsedAsPrototype = this.attr15_UsedAsPrototype;
	other.attr6_MyType = this.attr6_MyType;
	other.attr7_SelfVar = this.attr7_SelfVar;
	other.attr10_IsAbstract = this.attr10_IsAbstract;
	other.attr10_IsCallback = this.attr10_IsCallback;
	other.vtbl = this.vtbl;
	other.pool = this.pool;
	return other;
};
window['type15_TIdentifierFunc'].prototype.bridgeToJS = function(isJSON) {
	return {
		"OName_Str": this.attr9_OName_Str,
		"Name_Str": this.attr8_Name_Str,
		"Params": (this.attr6_Params).bridgeToJS(isJSON),
		"CopyParams": (this.attr10_CopyParams).bridgeToJS(isJSON),
		"Statics": (this.attr7_Statics).bridgeToJS(isJSON),
		"datatype": (this.attr8_datatype).bridgeToJS(isJSON),
		"Native": this.attr6_Native,
		"Scp": this.attr3_Scp,
		"ID": this.attr2_ID,
		"Typ": this.attr3_Typ,
		"Tok": this.attr3_Tok,
		"PlzCompile": this.attr10_PlzCompile,
		"HasRef": this.attr6_HasRef,
		"DefTok": this.attr6_DefTok,
		"UsedAsPrototype": this.attr15_UsedAsPrototype,
		"MyType": this.attr6_MyType,
		"SelfVar": this.attr7_SelfVar,
		"IsAbstract": this.attr10_IsAbstract,
		"IsCallback": this.attr10_IsCallback,
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
pool_TIdentifierFunc = { 
	last: null, 
	alloc: function() { 
		var obj = null;
		if (pool_TIdentifierFunc.last !== null) {
			obj = pool_TIdentifierFunc.last;
			pool_TIdentifierFunc.last = obj.succ;
			obj.succ = null;
		} else {
			obj = new type15_TIdentifierFunc();
		}
		return obj;
	},
	free: function(obj)  {
		if (obj.succ !== null) return;
		obj.reset();
		obj.succ = pool_TIdentifierFunc.last;
		pool_TIdentifierFunc.last = obj;
	}
}
type15_TIdentifierFunc = window['type15_TIdentifierFunc'];
type15_TIdentifierFunc.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type15_TIdentifierFunc.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type15_TIdentifierFunc.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type15_TIdentifierVari = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
window ['type15_TIdentifierVari'] = function() { this.reset(); }
window['type15_TIdentifierVari'].prototype.getTypeName = function() { return "type15_TIdentifierVari" };
	window['type15_TIdentifierVari'].prototype.reset = function() {
	this.attr8_Name_Str = "";
	this.attr9_OName_Str = "";
	this.attr8_datatype = pool_TDatatype.alloc();
	this.attr3_Typ = 0;
	this.attr2_ID = 0;
	this.attr6_PreDef = 0;
	this.attr3_ref = 0;
	this.attr9_OwnerVari = 0;
	this.attr3_Tok = 0;
	this.attr4_func = 0;
	this.vtbl = vtbl_type15_TIdentifierVari;
	this.attr6_PreDef = -(1);
	this.attr3_ref = 0;
	this.attr9_OwnerVari = -(1);
	this.pool = pool_TIdentifierVari;
	this.succ = null;
	
};
window['type15_TIdentifierVari'].prototype.clone = function() {
	var other = pool_TIdentifierVari.alloc();
	other.attr8_Name_Str = this.attr8_Name_Str;
	other.attr9_OName_Str = this.attr9_OName_Str;
	other.attr8_datatype = tryClone(this.attr8_datatype);
	other.attr3_Typ = this.attr3_Typ;
	other.attr2_ID = this.attr2_ID;
	other.attr6_PreDef = this.attr6_PreDef;
	other.attr3_ref = this.attr3_ref;
	other.attr9_OwnerVari = this.attr9_OwnerVari;
	other.attr3_Tok = this.attr3_Tok;
	other.attr4_func = this.attr4_func;
	other.vtbl = this.vtbl;
	other.pool = this.pool;
	return other;
};
window['type15_TIdentifierVari'].prototype.bridgeToJS = function(isJSON) {
	return {
		"Name_Str": this.attr8_Name_Str,
		"OName_Str": this.attr9_OName_Str,
		"datatype": (this.attr8_datatype).bridgeToJS(isJSON),
		"Typ": this.attr3_Typ,
		"ID": this.attr2_ID,
		"PreDef": this.attr6_PreDef,
		"ref": this.attr3_ref,
		"OwnerVari": this.attr9_OwnerVari,
		"Tok": this.attr3_Tok,
		"func": this.attr4_func,
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
pool_TIdentifierVari = { 
	last: null, 
	alloc: function() { 
		var obj = null;
		if (pool_TIdentifierVari.last !== null) {
			obj = pool_TIdentifierVari.last;
			pool_TIdentifierVari.last = obj.succ;
			obj.succ = null;
		} else {
			obj = new type15_TIdentifierVari();
		}
		return obj;
	},
	free: function(obj)  {
		if (obj.succ !== null) return;
		obj.reset();
		obj.succ = pool_TIdentifierVari.last;
		pool_TIdentifierVari.last = obj;
	}
}
type15_TIdentifierVari = window['type15_TIdentifierVari'];
type15_TIdentifierVari.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type15_TIdentifierVari.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type15_TIdentifierVari.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type15_TIdentifierType = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
window ['type15_TIdentifierType'] = function() { this.reset(); }
window['type15_TIdentifierType'].prototype.getTypeName = function() { return "type15_TIdentifierType" };
	window['type15_TIdentifierType'].prototype.reset = function() {
	this.attr9_OName_Str = "";
	this.attr8_Name_Str = "";
	this.attr12_RealName_Str = "";
	this.attr10_Attributes = pool_array.alloc(0);
	this.attr7_Methods = pool_array.alloc(0);
	this.attr7_PreSize = pool_array.alloc(0);
	this.attr2_ID = 0;
	this.attr3_Tok = 0;
	this.attr9_Extending = 0;
	this.attr10_Createable = 0;
	this.attr8_IsNative = 0;
	this.vtbl = vtbl_type15_TIdentifierType;
	this.attr9_Extending = -(1);
	this.attr10_Createable = 1;
	this.attr8_IsNative = 0;
	this.pool = pool_TIdentifierType;
	this.succ = null;
	
};
window['type15_TIdentifierType'].prototype.clone = function() {
	var other = pool_TIdentifierType.alloc();
	other.attr9_OName_Str = this.attr9_OName_Str;
	other.attr8_Name_Str = this.attr8_Name_Str;
	other.attr12_RealName_Str = this.attr12_RealName_Str;
	other.attr10_Attributes = tryClone(this.attr10_Attributes);
	other.attr7_Methods = tryClone(this.attr7_Methods);
	other.attr7_PreSize = tryClone(this.attr7_PreSize);
	other.attr2_ID = this.attr2_ID;
	other.attr3_Tok = this.attr3_Tok;
	other.attr9_Extending = this.attr9_Extending;
	other.attr10_Createable = this.attr10_Createable;
	other.attr8_IsNative = this.attr8_IsNative;
	other.vtbl = this.vtbl;
	other.pool = this.pool;
	return other;
};
window['type15_TIdentifierType'].prototype.bridgeToJS = function(isJSON) {
	return {
		"OName_Str": this.attr9_OName_Str,
		"Name_Str": this.attr8_Name_Str,
		"RealName_Str": this.attr12_RealName_Str,
		"Attributes": (this.attr10_Attributes).bridgeToJS(isJSON),
		"Methods": (this.attr7_Methods).bridgeToJS(isJSON),
		"PreSize": (this.attr7_PreSize).bridgeToJS(isJSON),
		"ID": this.attr2_ID,
		"Tok": this.attr3_Tok,
		"Extending": this.attr9_Extending,
		"Createable": this.attr10_Createable,
		"IsNative": this.attr8_IsNative,
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
pool_TIdentifierType = { 
	last: null, 
	alloc: function() { 
		var obj = null;
		if (pool_TIdentifierType.last !== null) {
			obj = pool_TIdentifierType.last;
			pool_TIdentifierType.last = obj.succ;
			obj.succ = null;
		} else {
			obj = new type15_TIdentifierType();
		}
		return obj;
	},
	free: function(obj)  {
		if (obj.succ !== null) return;
		obj.reset();
		obj.succ = pool_TIdentifierType.last;
		pool_TIdentifierType.last = obj;
	}
}
type15_TIdentifierType = window['type15_TIdentifierType'];
type15_TIdentifierType.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type15_TIdentifierType.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type15_TIdentifierType.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type9_TDatatype = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
window ['type9_TDatatype'] = function() { this.reset(); }
window['type9_TDatatype'].prototype.getTypeName = function() { return "type9_TDatatype" };
	window['type9_TDatatype'].prototype.reset = function() {
	this.attr8_Name_Str = "";
	this.attr7_IsArray = 0;
	this.vtbl = vtbl_type9_TDatatype;
	this.pool = pool_TDatatype;
	this.succ = null;
	
};
window['type9_TDatatype'].prototype.clone = function() {
	var other = pool_TDatatype.alloc();
	other.attr8_Name_Str = this.attr8_Name_Str;
	other.attr7_IsArray = this.attr7_IsArray;
	other.vtbl = this.vtbl;
	other.pool = this.pool;
	return other;
};
window['type9_TDatatype'].prototype.bridgeToJS = function(isJSON) {
	return {
		"Name_Str": this.attr8_Name_Str,
		"IsArray": this.attr7_IsArray,
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
pool_TDatatype = { 
	last: null, 
	alloc: function() { 
		var obj = null;
		if (pool_TDatatype.last !== null) {
			obj = pool_TDatatype.last;
			pool_TDatatype.last = obj.succ;
			obj.succ = null;
		} else {
			obj = new type9_TDatatype();
		}
		return obj;
	},
	free: function(obj)  {
		if (obj.succ !== null) return;
		obj.reset();
		obj.succ = pool_TDatatype.last;
		pool_TDatatype.last = obj;
	}
}
type9_TDatatype = window['type9_TDatatype'];
type9_TDatatype.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type9_TDatatype.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type9_TDatatype.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type10_TDataBlock = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
window ['type10_TDataBlock'] = function() { this.reset(); }
window['type10_TDataBlock'].prototype.getTypeName = function() { return "type10_TDataBlock" };
	window['type10_TDataBlock'].prototype.reset = function() {
	this.attr8_Name_Str = "";
	this.attr5_Datas = pool_array.alloc(0);
	this.vtbl = vtbl_type10_TDataBlock;
	this.pool = pool_TDataBlock;
	this.succ = null;
	
};
window['type10_TDataBlock'].prototype.clone = function() {
	var other = pool_TDataBlock.alloc();
	other.attr8_Name_Str = this.attr8_Name_Str;
	other.attr5_Datas = tryClone(this.attr5_Datas);
	other.vtbl = this.vtbl;
	other.pool = this.pool;
	return other;
};
window['type10_TDataBlock'].prototype.bridgeToJS = function(isJSON) {
	return {
		"Name_Str": this.attr8_Name_Str,
		"Datas": (this.attr5_Datas).bridgeToJS(isJSON),
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
pool_TDataBlock = { 
	last: null, 
	alloc: function() { 
		var obj = null;
		if (pool_TDataBlock.last !== null) {
			obj = pool_TDataBlock.last;
			pool_TDataBlock.last = obj.succ;
			obj.succ = null;
		} else {
			obj = new type10_TDataBlock();
		}
		return obj;
	},
	free: function(obj)  {
		if (obj.succ !== null) return;
		obj.reset();
		obj.succ = pool_TDataBlock.last;
		pool_TDataBlock.last = obj;
	}
}
type10_TDataBlock = window['type10_TDataBlock'];
type10_TDataBlock.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type10_TDataBlock.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type10_TDataBlock.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type13_TProtoChecker = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
window ['type13_TProtoChecker'] = function() { this.reset(); }
window['type13_TProtoChecker'].prototype.getTypeName = function() { return "type13_TProtoChecker" };
	window['type13_TProtoChecker'].prototype.reset = function() {
	this.attr3_Tok = pool_TToken.alloc();
	this.attr8_fromFunc = 0;
	this.attr6_toFunc = 0;
	this.vtbl = vtbl_type13_TProtoChecker;
	this.pool = pool_TProtoChecker;
	this.succ = null;
	
};
window['type13_TProtoChecker'].prototype.clone = function() {
	var other = pool_TProtoChecker.alloc();
	other.attr3_Tok = tryClone(this.attr3_Tok);
	other.attr8_fromFunc = this.attr8_fromFunc;
	other.attr6_toFunc = this.attr6_toFunc;
	other.vtbl = this.vtbl;
	other.pool = this.pool;
	return other;
};
window['type13_TProtoChecker'].prototype.bridgeToJS = function(isJSON) {
	return {
		"Tok": (this.attr3_Tok).bridgeToJS(isJSON),
		"fromFunc": this.attr8_fromFunc,
		"toFunc": this.attr6_toFunc,
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
pool_TProtoChecker = { 
	last: null, 
	alloc: function() { 
		var obj = null;
		if (pool_TProtoChecker.last !== null) {
			obj = pool_TProtoChecker.last;
			pool_TProtoChecker.last = obj.succ;
			obj.succ = null;
		} else {
			obj = new type13_TProtoChecker();
		}
		return obj;
	},
	free: function(obj)  {
		if (obj.succ !== null) return;
		obj.reset();
		obj.succ = pool_TProtoChecker.last;
		pool_TProtoChecker.last = obj;
	}
}
type13_TProtoChecker = window['type13_TProtoChecker'];
type13_TProtoChecker.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type13_TProtoChecker.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type13_TProtoChecker.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type6_TToken = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
window ['type6_TToken'] = function() { this.reset(); }
window['type6_TToken'].prototype.getTypeName = function() { return "type6_TToken" };
	window['type6_TToken'].prototype.reset = function() {
	this.attr4_Line = 0;
	this.attr15_LineContent_Str = "";
	this.attr9_Character = 0;
	this.attr8_Path_Str = "";
	this.attr8_Text_Str = "";
	this.attr5_IsDel = 0;
	this.vtbl = vtbl_type6_TToken;
	this.attr5_IsDel = 0;
	this.pool = pool_TToken;
	this.succ = null;
	
};
window['type6_TToken'].prototype.clone = function() {
	var other = pool_TToken.alloc();
	other.attr4_Line = this.attr4_Line;
	other.attr15_LineContent_Str = this.attr15_LineContent_Str;
	other.attr9_Character = this.attr9_Character;
	other.attr8_Path_Str = this.attr8_Path_Str;
	other.attr8_Text_Str = this.attr8_Text_Str;
	other.attr5_IsDel = this.attr5_IsDel;
	other.vtbl = this.vtbl;
	other.pool = this.pool;
	return other;
};
window['type6_TToken'].prototype.bridgeToJS = function(isJSON) {
	return {
		"Line": this.attr4_Line,
		"LineContent_Str": this.attr15_LineContent_Str,
		"Character": this.attr9_Character,
		"Path_Str": this.attr8_Path_Str,
		"Text_Str": this.attr8_Text_Str,
		"IsDel": this.attr5_IsDel,
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
pool_TToken = { 
	last: null, 
	alloc: function() { 
		var obj = null;
		if (pool_TToken.last !== null) {
			obj = pool_TToken.last;
			pool_TToken.last = obj.succ;
			obj.succ = null;
		} else {
			obj = new type6_TToken();
		}
		return obj;
	},
	free: function(obj)  {
		if (obj.succ !== null) return;
		obj.reset();
		obj.succ = pool_TToken.last;
		pool_TToken.last = obj;
	}
}
type6_TToken = window['type6_TToken'];
type6_TToken.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type6_TToken.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type6_TToken.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type7_TExport = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
window ['type7_TExport'] = function() { this.reset(); }
window['type7_TExport'].prototype.getTypeName = function() { return "type7_TExport" };
	window['type7_TExport'].prototype.reset = function() {
	this.attr8_Name_Str = "";
	this.attr12_RealName_Str = "";
	this.vtbl = vtbl_type7_TExport;
	this.pool = pool_TExport;
	this.succ = null;
	
};
window['type7_TExport'].prototype.clone = function() {
	var other = pool_TExport.alloc();
	other.attr8_Name_Str = this.attr8_Name_Str;
	other.attr12_RealName_Str = this.attr12_RealName_Str;
	other.vtbl = this.vtbl;
	other.pool = this.pool;
	return other;
};
window['type7_TExport'].prototype.bridgeToJS = function(isJSON) {
	return {
		"Name_Str": this.attr8_Name_Str,
		"RealName_Str": this.attr12_RealName_Str,
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
pool_TExport = { 
	last: null, 
	alloc: function() { 
		var obj = null;
		if (pool_TExport.last !== null) {
			obj = pool_TExport.last;
			pool_TExport.last = obj.succ;
			obj.succ = null;
		} else {
			obj = new type7_TExport();
		}
		return obj;
	},
	free: function(obj)  {
		if (obj.succ !== null) return;
		obj.reset();
		obj.succ = pool_TExport.last;
		pool_TExport.last = obj;
	}
}
type7_TExport = window['type7_TExport'];
type7_TExport.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type7_TExport.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type7_TExport.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type5_TExpr = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
window ['type5_TExpr'] = function() { this.reset(); }
window['type5_TExpr'].prototype.getTypeName = function() { return "type5_TExpr" };
	window['type5_TExpr'].prototype.reset = function() {
	this.attr8_datatype = pool_TDatatype.alloc();
	this.attr3_Typ = 0;
	this.attr2_ID = 0;
	this.attr5_tokID = 0;
	this.attr4_Left = 0;
	this.attr5_Right = 0;
	this.attr2_Op = 0;
	this.attr5_Exprs = pool_array.alloc(0);
	this.attr5_Varis = pool_array.alloc(0);
	this.attr10_SuperScope = 0;
	this.attr6_ScpTyp = 0;
	this.attr6_Labels = pool_array.alloc(0);
	this.attr5_Gotos = pool_array.alloc(0);
	this.attr6_intval = 0;
	this.attr8_floatval = 0.0;
	this.attr10_strval_Str = "";
	this.attr4_func = 0;
	this.attr6_Params = pool_array.alloc(0);
	this.attr8_wasAdded = 0;
	this.attr4_vari = 0;
	this.attr5_array = 0;
	this.attr4_dims = pool_array.alloc(0);
	this.attr4_expr = 0;
	this.attr8_nextExpr = 0;
	this.attr8_Name_Str = "";
	this.attr10_Conditions = pool_array.alloc(0);
	this.attr6_Scopes = pool_array.alloc(0);
	this.attr9_elseScope = 0;
	this.attr5_dummy = 0.0;
	this.attr3_Scp = 0;
	this.attr7_varExpr = 0;
	this.attr6_toExpr = 0;
	this.attr8_stepExpr = 0;
	this.attr5_hasTo = 0;
	this.attr6_inExpr = 0;
	this.attr8_catchScp = 0;
	this.attr5_Reads = pool_array.alloc(0);
	this.attr4_kern = 0;
	this.attr8_position = 0;
	this.attr11_Content_Str = "";
	this.vtbl = vtbl_type5_TExpr;
	this.attr10_SuperScope = -(1);
	this.attr8_wasAdded = 0;
	this.attr9_elseScope = -(1);
	this.attr5_dummy = -(42);
	this.attr4_kern = -(1);
	this.pool = pool_TExpr;
	this.succ = null;
	
};
window['type5_TExpr'].prototype.clone = function() {
	var other = pool_TExpr.alloc();
	other.attr8_datatype = tryClone(this.attr8_datatype);
	other.attr3_Typ = this.attr3_Typ;
	other.attr2_ID = this.attr2_ID;
	other.attr5_tokID = this.attr5_tokID;
	other.attr4_Left = this.attr4_Left;
	other.attr5_Right = this.attr5_Right;
	other.attr2_Op = this.attr2_Op;
	other.attr5_Exprs = tryClone(this.attr5_Exprs);
	other.attr5_Varis = tryClone(this.attr5_Varis);
	other.attr10_SuperScope = this.attr10_SuperScope;
	other.attr6_ScpTyp = this.attr6_ScpTyp;
	other.attr6_Labels = tryClone(this.attr6_Labels);
	other.attr5_Gotos = tryClone(this.attr5_Gotos);
	other.attr6_intval = this.attr6_intval;
	other.attr8_floatval = this.attr8_floatval;
	other.attr10_strval_Str = this.attr10_strval_Str;
	other.attr4_func = this.attr4_func;
	other.attr6_Params = tryClone(this.attr6_Params);
	other.attr8_wasAdded = this.attr8_wasAdded;
	other.attr4_vari = this.attr4_vari;
	other.attr5_array = this.attr5_array;
	other.attr4_dims = tryClone(this.attr4_dims);
	other.attr4_expr = this.attr4_expr;
	other.attr8_nextExpr = this.attr8_nextExpr;
	other.attr8_Name_Str = this.attr8_Name_Str;
	other.attr10_Conditions = tryClone(this.attr10_Conditions);
	other.attr6_Scopes = tryClone(this.attr6_Scopes);
	other.attr9_elseScope = this.attr9_elseScope;
	other.attr5_dummy = this.attr5_dummy;
	other.attr3_Scp = this.attr3_Scp;
	other.attr7_varExpr = this.attr7_varExpr;
	other.attr6_toExpr = this.attr6_toExpr;
	other.attr8_stepExpr = this.attr8_stepExpr;
	other.attr5_hasTo = this.attr5_hasTo;
	other.attr6_inExpr = this.attr6_inExpr;
	other.attr8_catchScp = this.attr8_catchScp;
	other.attr5_Reads = tryClone(this.attr5_Reads);
	other.attr4_kern = this.attr4_kern;
	other.attr8_position = this.attr8_position;
	other.attr11_Content_Str = this.attr11_Content_Str;
	other.vtbl = this.vtbl;
	other.pool = this.pool;
	return other;
};
window['type5_TExpr'].prototype.bridgeToJS = function(isJSON) {
	return {
		"datatype": (this.attr8_datatype).bridgeToJS(isJSON),
		"Typ": this.attr3_Typ,
		"ID": this.attr2_ID,
		"tokID": this.attr5_tokID,
		"Left": this.attr4_Left,
		"Right": this.attr5_Right,
		"Op": this.attr2_Op,
		"Exprs": (this.attr5_Exprs).bridgeToJS(isJSON),
		"Varis": (this.attr5_Varis).bridgeToJS(isJSON),
		"SuperScope": this.attr10_SuperScope,
		"ScpTyp": this.attr6_ScpTyp,
		"Labels": (this.attr6_Labels).bridgeToJS(isJSON),
		"Gotos": (this.attr5_Gotos).bridgeToJS(isJSON),
		"intval": this.attr6_intval,
		"floatval": this.attr8_floatval,
		"strval_Str": this.attr10_strval_Str,
		"func": this.attr4_func,
		"Params": (this.attr6_Params).bridgeToJS(isJSON),
		"wasAdded": this.attr8_wasAdded,
		"vari": this.attr4_vari,
		"array": this.attr5_array,
		"dims": (this.attr4_dims).bridgeToJS(isJSON),
		"expr": this.attr4_expr,
		"nextExpr": this.attr8_nextExpr,
		"Name_Str": this.attr8_Name_Str,
		"Conditions": (this.attr10_Conditions).bridgeToJS(isJSON),
		"Scopes": (this.attr6_Scopes).bridgeToJS(isJSON),
		"elseScope": this.attr9_elseScope,
		"dummy": this.attr5_dummy,
		"Scp": this.attr3_Scp,
		"varExpr": this.attr7_varExpr,
		"toExpr": this.attr6_toExpr,
		"stepExpr": this.attr8_stepExpr,
		"hasTo": this.attr5_hasTo,
		"inExpr": this.attr6_inExpr,
		"catchScp": this.attr8_catchScp,
		"Reads": (this.attr5_Reads).bridgeToJS(isJSON),
		"kern": this.attr4_kern,
		"position": this.attr8_position,
		"Content_Str": this.attr11_Content_Str,
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
pool_TExpr = { 
	last: null, 
	alloc: function() { 
		var obj = null;
		if (pool_TExpr.last !== null) {
			obj = pool_TExpr.last;
			pool_TExpr.last = obj.succ;
			obj.succ = null;
		} else {
			obj = new type5_TExpr();
		}
		return obj;
	},
	free: function(obj)  {
		if (obj.succ !== null) return;
		obj.reset();
		obj.succ = pool_TExpr.last;
		pool_TExpr.last = obj;
	}
}
type5_TExpr = window['type5_TExpr'];
type5_TExpr.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type5_TExpr.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type5_TExpr.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type9_TOperator = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
window ['type9_TOperator'] = function() { this.reset(); }
window['type9_TOperator'].prototype.getTypeName = function() { return "type9_TOperator" };
	window['type9_TOperator'].prototype.reset = function() {
	this.attr8_Name_Str = "";
	this.attr7_Sym_Str = "";
	this.attr3_Typ = 0;
	this.attr4_Prio = 0;
	this.attr2_ID = 0;
	this.vtbl = vtbl_type9_TOperator;
	this.pool = pool_TOperator;
	this.succ = null;
	
};
window['type9_TOperator'].prototype.clone = function() {
	var other = pool_TOperator.alloc();
	other.attr8_Name_Str = this.attr8_Name_Str;
	other.attr7_Sym_Str = this.attr7_Sym_Str;
	other.attr3_Typ = this.attr3_Typ;
	other.attr4_Prio = this.attr4_Prio;
	other.attr2_ID = this.attr2_ID;
	other.vtbl = this.vtbl;
	other.pool = this.pool;
	return other;
};
window['type9_TOperator'].prototype.bridgeToJS = function(isJSON) {
	return {
		"Name_Str": this.attr8_Name_Str,
		"Sym_Str": this.attr7_Sym_Str,
		"Typ": this.attr3_Typ,
		"Prio": this.attr4_Prio,
		"ID": this.attr2_ID,
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
pool_TOperator = { 
	last: null, 
	alloc: function() { 
		var obj = null;
		if (pool_TOperator.last !== null) {
			obj = pool_TOperator.last;
			pool_TOperator.last = obj.succ;
			obj.succ = null;
		} else {
			obj = new type9_TOperator();
		}
		return obj;
	},
	free: function(obj)  {
		if (obj.succ !== null) return;
		obj.reset();
		obj.succ = pool_TOperator.last;
		pool_TOperator.last = obj;
	}
}
type9_TOperator = window['type9_TOperator'];
type9_TOperator.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type9_TOperator.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type9_TOperator.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type7_TDefine = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
window ['type7_TDefine'] = function() { this.reset(); }
window['type7_TDefine'].prototype.getTypeName = function() { return "type7_TDefine" };
	window['type7_TDefine'].prototype.reset = function() {
	this.attr7_Key_Str = "";
	this.attr9_Value_Str = "";
	this.vtbl = vtbl_type7_TDefine;
	this.pool = pool_TDefine;
	this.succ = null;
	
};
window['type7_TDefine'].prototype.clone = function() {
	var other = pool_TDefine.alloc();
	other.attr7_Key_Str = this.attr7_Key_Str;
	other.attr9_Value_Str = this.attr9_Value_Str;
	other.vtbl = this.vtbl;
	other.pool = this.pool;
	return other;
};
window['type7_TDefine'].prototype.bridgeToJS = function(isJSON) {
	return {
		"Key_Str": this.attr7_Key_Str,
		"Value_Str": this.attr9_Value_Str,
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
pool_TDefine = { 
	last: null, 
	alloc: function() { 
		var obj = null;
		if (pool_TDefine.last !== null) {
			obj = pool_TDefine.last;
			pool_TDefine.last = obj.succ;
			obj.succ = null;
		} else {
			obj = new type7_TDefine();
		}
		return obj;
	},
	free: function(obj)  {
		if (obj.succ !== null) return;
		obj.reset();
		obj.succ = pool_TDefine.last;
		pool_TDefine.last = obj;
	}
}
type7_TDefine = window['type7_TDefine'];
type7_TDefine.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type7_TDefine.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type7_TDefine.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type10_TGenerator = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
window ['type10_TGenerator'] = function() { this.reset(); }
window['type10_TGenerator'].prototype.getTypeName = function() { return "type10_TGenerator" };
	window['type10_TGenerator'].prototype.reset = function() {
	this.attr8_Name_Str = "";
	this.attr8_genProto = Lang_Generator_Str;
	this.vtbl = vtbl_type10_TGenerator;
	this.pool = pool_TGenerator;
	this.succ = null;
	
};
window['type10_TGenerator'].prototype.clone = function() {
	var other = pool_TGenerator.alloc();
	other.attr8_Name_Str = this.attr8_Name_Str;
	other.attr8_genProto = tryClone(this.attr8_genProto);
	other.vtbl = this.vtbl;
	other.pool = this.pool;
	return other;
};
window['type10_TGenerator'].prototype.bridgeToJS = function(isJSON) {
	return {
		"Name_Str": this.attr8_Name_Str,
		"genProto": (this.attr8_genProto).bridgeToJS(isJSON),
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
pool_TGenerator = { 
	last: null, 
	alloc: function() { 
		var obj = null;
		if (pool_TGenerator.last !== null) {
			obj = pool_TGenerator.last;
			pool_TGenerator.last = obj.succ;
			obj.succ = null;
		} else {
			obj = new type10_TGenerator();
		}
		return obj;
	},
	free: function(obj)  {
		if (obj.succ !== null) return;
		obj.reset();
		obj.succ = pool_TGenerator.last;
		pool_TGenerator.last = obj;
	}
}
type10_TGenerator = window['type10_TGenerator'];
type10_TGenerator.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type10_TGenerator.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type10_TGenerator.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type6_TError = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
window ['type6_TError'] = function() { this.reset(); }
window['type6_TError'].prototype.getTypeName = function() { return "type6_TError" };
	window['type6_TError'].prototype.reset = function() {
	this.attr3_Typ = 0;
	this.attr14_errorState_Str = "";
	this.attr5_token = pool_TToken.alloc();
	this.attr7_Msg_Str = "";
	this.vtbl = vtbl_type6_TError;
	this.pool = pool_TError;
	this.succ = null;
	
};
window['type6_TError'].prototype.clone = function() {
	var other = pool_TError.alloc();
	other.attr3_Typ = this.attr3_Typ;
	other.attr14_errorState_Str = this.attr14_errorState_Str;
	other.attr5_token = tryClone(this.attr5_token);
	other.attr7_Msg_Str = this.attr7_Msg_Str;
	other.vtbl = this.vtbl;
	other.pool = this.pool;
	return other;
};
window['type6_TError'].prototype.bridgeToJS = function(isJSON) {
	return {
		"Typ": this.attr3_Typ,
		"errorState_Str": this.attr14_errorState_Str,
		"token": (this.attr5_token).bridgeToJS(isJSON),
		"Msg_Str": this.attr7_Msg_Str,
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
pool_TError = { 
	last: null, 
	alloc: function() { 
		var obj = null;
		if (pool_TError.last !== null) {
			obj = pool_TError.last;
			pool_TError.last = obj.succ;
			obj.succ = null;
		} else {
			obj = new type6_TError();
		}
		return obj;
	},
	free: function(obj)  {
		if (obj.succ !== null) return;
		obj.reset();
		obj.succ = pool_TError.last;
		pool_TError.last = obj;
	}
}
type6_TError = window['type6_TError'];
type6_TError.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type6_TError.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type6_TError.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type13_Documentation = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
window ['type13_Documentation'] = function() { this.reset(); }
window['type13_Documentation'].prototype.getTypeName = function() { return "type13_Documentation" };
	window['type13_Documentation'].prototype.reset = function() {
	this.attr7_typ_Str = "";
	this.attr4_desc = pool_array.alloc(pool_LangElement.alloc());
	this.attr8_name_Str = "";
	this.attr10_module_Str = "";
	this.attr6_params = pool_array.alloc(pool_ParamElement.alloc());
	this.attr7_example = pool_array.alloc(pool_LangElement.alloc());
	this.attr7_see_Str = pool_array.alloc("");
	this.vtbl = vtbl_type13_Documentation;
	this.pool = pool_Documentation;
	this.succ = null;
	
};
window['type13_Documentation'].prototype.clone = function() {
	var other = pool_Documentation.alloc();
	other.attr7_typ_Str = this.attr7_typ_Str;
	other.attr4_desc = tryClone(this.attr4_desc);
	other.attr8_name_Str = this.attr8_name_Str;
	other.attr10_module_Str = this.attr10_module_Str;
	other.attr6_params = tryClone(this.attr6_params);
	other.attr7_example = tryClone(this.attr7_example);
	other.attr7_see_Str = tryClone(this.attr7_see_Str);
	other.vtbl = this.vtbl;
	other.pool = this.pool;
	return other;
};
window['type13_Documentation'].prototype.bridgeToJS = function(isJSON) {
	return {
		"typ_Str": this.attr7_typ_Str,
		"desc": (this.attr4_desc).bridgeToJS(isJSON),
		"name_Str": this.attr8_name_Str,
		"module_Str": this.attr10_module_Str,
		"params": (this.attr6_params).bridgeToJS(isJSON),
		"example": (this.attr7_example).bridgeToJS(isJSON),
		"see_Str": (this.attr7_see_Str).bridgeToJS(isJSON),
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
pool_Documentation = { 
	last: null, 
	alloc: function() { 
		var obj = null;
		if (pool_Documentation.last !== null) {
			obj = pool_Documentation.last;
			pool_Documentation.last = obj.succ;
			obj.succ = null;
		} else {
			obj = new type13_Documentation();
		}
		return obj;
	},
	free: function(obj)  {
		if (obj.succ !== null) return;
		obj.reset();
		obj.succ = pool_Documentation.last;
		pool_Documentation.last = obj;
	}
}
type13_Documentation = window['type13_Documentation'];
type13_Documentation.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type13_Documentation.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type13_Documentation.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type12_ParamElement = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
window ['type12_ParamElement'] = function() { this.reset(); }
window['type12_ParamElement'].prototype.getTypeName = function() { return "type12_ParamElement" };
	window['type12_ParamElement'].prototype.reset = function() {
	this.attr8_name_Str = "";
	this.attr4_desc = pool_array.alloc(pool_LangElement.alloc());
	this.vtbl = vtbl_type12_ParamElement;
	this.pool = pool_ParamElement;
	this.succ = null;
	
};
window['type12_ParamElement'].prototype.clone = function() {
	var other = pool_ParamElement.alloc();
	other.attr8_name_Str = this.attr8_name_Str;
	other.attr4_desc = tryClone(this.attr4_desc);
	other.vtbl = this.vtbl;
	other.pool = this.pool;
	return other;
};
window['type12_ParamElement'].prototype.bridgeToJS = function(isJSON) {
	return {
		"name_Str": this.attr8_name_Str,
		"desc": (this.attr4_desc).bridgeToJS(isJSON),
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
pool_ParamElement = { 
	last: null, 
	alloc: function() { 
		var obj = null;
		if (pool_ParamElement.last !== null) {
			obj = pool_ParamElement.last;
			pool_ParamElement.last = obj.succ;
			obj.succ = null;
		} else {
			obj = new type12_ParamElement();
		}
		return obj;
	},
	free: function(obj)  {
		if (obj.succ !== null) return;
		obj.reset();
		obj.succ = pool_ParamElement.last;
		pool_ParamElement.last = obj;
	}
}
type12_ParamElement = window['type12_ParamElement'];
type12_ParamElement.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type12_ParamElement.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type12_ParamElement.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type11_LangElement = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
window ['type11_LangElement'] = function() { this.reset(); }
window['type11_LangElement'].prototype.getTypeName = function() { return "type11_LangElement" };
	window['type11_LangElement'].prototype.reset = function() {
	this.attr8_desc_Str = "";
	this.attr8_lang_Str = "";
	this.vtbl = vtbl_type11_LangElement;
	this.pool = pool_LangElement;
	this.succ = null;
	
};
window['type11_LangElement'].prototype.clone = function() {
	var other = pool_LangElement.alloc();
	other.attr8_desc_Str = this.attr8_desc_Str;
	other.attr8_lang_Str = this.attr8_lang_Str;
	other.vtbl = this.vtbl;
	other.pool = this.pool;
	return other;
};
window['type11_LangElement'].prototype.bridgeToJS = function(isJSON) {
	return {
		"desc_Str": this.attr8_desc_Str,
		"lang_Str": this.attr8_lang_Str,
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
pool_LangElement = { 
	last: null, 
	alloc: function() { 
		var obj = null;
		if (pool_LangElement.last !== null) {
			obj = pool_LangElement.last;
			pool_LangElement.last = obj.succ;
			obj.succ = null;
		} else {
			obj = new type11_LangElement();
		}
		return obj;
	},
	free: function(obj)  {
		if (obj.succ !== null) return;
		obj.reset();
		obj.succ = pool_LangElement.last;
		pool_LangElement.last = obj;
	}
}
type11_LangElement = window['type11_LangElement'];
type11_LangElement.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type11_LangElement.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type11_LangElement.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type6_Bucket = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
window ['type6_Bucket'] = function() { this.reset(); }
window['type6_Bucket'].prototype.getTypeName = function() { return "type6_Bucket" };
	window['type6_Bucket'].prototype.reset = function() {
	this.attr3_Set = 0;
	this.attr8_Elements = pool_array.alloc(pool_KeyValue.alloc());
	this.attr7_Element = pool_KeyValue.alloc();
	this.vtbl = vtbl_type6_Bucket;
	this.attr3_Set = 0;
	this.pool = pool_Bucket;
	this.succ = null;
	
};
window['type6_Bucket'].prototype.clone = function() {
	var other = pool_Bucket.alloc();
	other.attr3_Set = this.attr3_Set;
	other.attr8_Elements = tryClone(this.attr8_Elements);
	other.attr7_Element = tryClone(this.attr7_Element);
	other.vtbl = this.vtbl;
	other.pool = this.pool;
	return other;
};
window['type6_Bucket'].prototype.bridgeToJS = function(isJSON) {
	return {
		"Set": this.attr3_Set,
		"Elements": (this.attr8_Elements).bridgeToJS(isJSON),
		"Element": (this.attr7_Element).bridgeToJS(isJSON),
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
pool_Bucket = { 
	last: null, 
	alloc: function() { 
		var obj = null;
		if (pool_Bucket.last !== null) {
			obj = pool_Bucket.last;
			pool_Bucket.last = obj.succ;
			obj.succ = null;
		} else {
			obj = new type6_Bucket();
		}
		return obj;
	},
	free: function(obj)  {
		if (obj.succ !== null) return;
		obj.reset();
		obj.succ = pool_Bucket.last;
		pool_Bucket.last = obj;
	}
}
type6_Bucket = window['type6_Bucket'];
type6_Bucket.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type6_Bucket.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type6_Bucket.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type8_KeyValue = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
window ['type8_KeyValue'] = function() { this.reset(); }
window['type8_KeyValue'].prototype.getTypeName = function() { return "type8_KeyValue" };
	window['type8_KeyValue'].prototype.reset = function() {
	this.attr7_Key_Str = "";
	this.attr5_Value = 0;
	this.vtbl = vtbl_type8_KeyValue;
	this.pool = pool_KeyValue;
	this.succ = null;
	
};
window['type8_KeyValue'].prototype.clone = function() {
	var other = pool_KeyValue.alloc();
	other.attr7_Key_Str = this.attr7_Key_Str;
	other.attr5_Value = this.attr5_Value;
	other.vtbl = this.vtbl;
	other.pool = this.pool;
	return other;
};
window['type8_KeyValue'].prototype.bridgeToJS = function(isJSON) {
	return {
		"Key_Str": this.attr7_Key_Str,
		"Value": this.attr5_Value,
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
pool_KeyValue = { 
	last: null, 
	alloc: function() { 
		var obj = null;
		if (pool_KeyValue.last !== null) {
			obj = pool_KeyValue.last;
			pool_KeyValue.last = obj.succ;
			obj.succ = null;
		} else {
			obj = new type8_KeyValue();
		}
		return obj;
	},
	free: function(obj)  {
		if (obj.succ !== null) return;
		obj.reset();
		obj.succ = pool_KeyValue.last;
		pool_KeyValue.last = obj;
	}
}
type8_KeyValue = window['type8_KeyValue'];
type8_KeyValue.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type8_KeyValue.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type8_KeyValue.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type7_HashMap = {
	Put: method13_type7_HashMap_3_Put, 
	DoesKeyExist: method13_type7_HashMap_12_DoesKeyExist, 
	GetValue: method13_type7_HashMap_8_GetValue, 
	Remove: method13_type7_HashMap_6_Remove, 
	ToArray: method13_type7_HashMap_7_ToArray, 
	SetSize: method13_type7_HashMap_7_SetSize, 
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
window ['type7_HashMap'] = function() { this.reset(); }
window['type7_HashMap'].prototype.getTypeName = function() { return "type7_HashMap" };
	window['type7_HashMap'].prototype.reset = function() {
	this.attr7_Buckets_ref = [pool_array.alloc([pool_Bucket.alloc()])];
	this.attr8_Elements = 0;
	this.vtbl = vtbl_type7_HashMap;
	this.pool = pool_HashMap;
	this.succ = null;
	
};
window['type7_HashMap'].prototype.clone = function() {
	var other = pool_HashMap.alloc();
	other.attr7_Buckets_ref = tryClone(this.attr7_Buckets_ref);
	other.attr8_Elements = this.attr8_Elements;
	other.vtbl = this.vtbl;
	other.pool = this.pool;
	return other;
};
window['type7_HashMap'].prototype.bridgeToJS = function(isJSON) {
	return {
		"Buckets": (this.attr7_Buckets_ref).bridgeToJS(isJSON),
		"Elements": this.attr8_Elements,
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
pool_HashMap = { 
	last: null, 
	alloc: function() { 
		var obj = null;
		if (pool_HashMap.last !== null) {
			obj = pool_HashMap.last;
			pool_HashMap.last = obj.succ;
			obj.succ = null;
		} else {
			obj = new type7_HashMap();
		}
		return obj;
	},
	free: function(obj)  {
		if (obj.succ !== null) return;
		obj.reset();
		obj.succ = pool_HashMap.last;
		pool_HashMap.last = obj;
	}
}
type7_HashMap = window['type7_HashMap'];
type7_HashMap.prototype.Put = function() {
	 return this.vtbl.Put(arguments[0], arguments[1], this);
};
type7_HashMap.prototype.DoesKeyExist = function() {
	 return this.vtbl.DoesKeyExist(arguments[0], this);
};
type7_HashMap.prototype.GetValue = function() {
	 return this.vtbl.GetValue(arguments[0], arguments[1], this);
};
type7_HashMap.prototype.Remove = function() {
	 return this.vtbl.Remove(arguments[0], this);
};
type7_HashMap.prototype.ToArray = function() {
	 return this.vtbl.ToArray(arguments[0], this);
};
type7_HashMap.prototype.SetSize = function() {
	 return this.vtbl.SetSize(arguments[0], this);
};
type7_HashMap.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type7_HashMap.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type7_HashMap.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type14_TIDEIdentifier = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
window ['type14_TIDEIdentifier'] = function() { this.reset(); }
window['type14_TIDEIdentifier'].prototype.getTypeName = function() { return "type14_TIDEIdentifier" };
	window['type14_TIDEIdentifier'].prototype.reset = function() {
	this.attr8_Name_Str = "";
	this.attr8_datatype = pool_TDatatype.alloc();
	this.attr5_token = pool_TToken.alloc();
	this.attr7_Typ_Str = "";
	this.attr6_SubTyp = 0;
	this.attr6_Native = 0;
	this.vtbl = vtbl_type14_TIDEIdentifier;
	this.pool = pool_TIDEIdentifier;
	this.succ = null;
	
};
window['type14_TIDEIdentifier'].prototype.clone = function() {
	var other = pool_TIDEIdentifier.alloc();
	other.attr8_Name_Str = this.attr8_Name_Str;
	other.attr8_datatype = tryClone(this.attr8_datatype);
	other.attr5_token = tryClone(this.attr5_token);
	other.attr7_Typ_Str = this.attr7_Typ_Str;
	other.attr6_SubTyp = this.attr6_SubTyp;
	other.attr6_Native = this.attr6_Native;
	other.vtbl = this.vtbl;
	other.pool = this.pool;
	return other;
};
window['type14_TIDEIdentifier'].prototype.bridgeToJS = function(isJSON) {
	return {
		"Name_Str": this.attr8_Name_Str,
		"datatype": (this.attr8_datatype).bridgeToJS(isJSON),
		"token": (this.attr5_token).bridgeToJS(isJSON),
		"Typ_Str": this.attr7_Typ_Str,
		"SubTyp": this.attr6_SubTyp,
		"Native": this.attr6_Native,
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
pool_TIDEIdentifier = { 
	last: null, 
	alloc: function() { 
		var obj = null;
		if (pool_TIDEIdentifier.last !== null) {
			obj = pool_TIDEIdentifier.last;
			pool_TIDEIdentifier.last = obj.succ;
			obj.succ = null;
		} else {
			obj = new type14_TIDEIdentifier();
		}
		return obj;
	},
	free: function(obj)  {
		if (obj.succ !== null) return;
		obj.reset();
		obj.succ = pool_TIDEIdentifier.last;
		pool_TIDEIdentifier.last = obj;
	}
}
type14_TIDEIdentifier = window['type14_TIDEIdentifier'];
type14_TIDEIdentifier.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type14_TIDEIdentifier.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type14_TIDEIdentifier.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type9_TTemplate = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
window ['type9_TTemplate'] = function() { this.reset(); }
window['type9_TTemplate'].prototype.getTypeName = function() { return "type9_TTemplate" };
	window['type9_TTemplate'].prototype.reset = function() {
	this.attr8_Path_Str = "";
	this.attr8_Mode_Str = "";
	this.attr8_Name_Str = "";
	this.vtbl = vtbl_type9_TTemplate;
	this.pool = pool_TTemplate;
	this.succ = null;
	
};
window['type9_TTemplate'].prototype.clone = function() {
	var other = pool_TTemplate.alloc();
	other.attr8_Path_Str = this.attr8_Path_Str;
	other.attr8_Mode_Str = this.attr8_Mode_Str;
	other.attr8_Name_Str = this.attr8_Name_Str;
	other.vtbl = this.vtbl;
	other.pool = this.pool;
	return other;
};
window['type9_TTemplate'].prototype.bridgeToJS = function(isJSON) {
	return {
		"Path_Str": this.attr8_Path_Str,
		"Mode_Str": this.attr8_Mode_Str,
		"Name_Str": this.attr8_Name_Str,
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
pool_TTemplate = { 
	last: null, 
	alloc: function() { 
		var obj = null;
		if (pool_TTemplate.last !== null) {
			obj = pool_TTemplate.last;
			pool_TTemplate.last = obj.succ;
			obj.succ = null;
		} else {
			obj = new type9_TTemplate();
		}
		return obj;
	},
	free: function(obj)  {
		if (obj.succ !== null) return;
		obj.reset();
		obj.succ = pool_TTemplate.last;
		pool_TTemplate.last = obj;
	}
}
type9_TTemplate = window['type9_TTemplate'];
type9_TTemplate.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type9_TTemplate.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type9_TTemplate.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type8_TLibrary = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
window ['type8_TLibrary'] = function() { this.reset(); }
window['type8_TLibrary'].prototype.getTypeName = function() { return "type8_TLibrary" };
	window['type8_TLibrary'].prototype.reset = function() {
	this.attr8_Path_Str = "";
	this.attr8_Mode_Str = "";
	this.vtbl = vtbl_type8_TLibrary;
	this.pool = pool_TLibrary;
	this.succ = null;
	
};
window['type8_TLibrary'].prototype.clone = function() {
	var other = pool_TLibrary.alloc();
	other.attr8_Path_Str = this.attr8_Path_Str;
	other.attr8_Mode_Str = this.attr8_Mode_Str;
	other.vtbl = this.vtbl;
	other.pool = this.pool;
	return other;
};
window['type8_TLibrary'].prototype.bridgeToJS = function(isJSON) {
	return {
		"Path_Str": this.attr8_Path_Str,
		"Mode_Str": this.attr8_Mode_Str,
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
pool_TLibrary = { 
	last: null, 
	alloc: function() { 
		var obj = null;
		if (pool_TLibrary.last !== null) {
			obj = pool_TLibrary.last;
			pool_TLibrary.last = obj.succ;
			obj.succ = null;
		} else {
			obj = new type8_TLibrary();
		}
		return obj;
	},
	free: function(obj)  {
		if (obj.succ !== null) return;
		obj.reset();
		obj.succ = pool_TLibrary.last;
		pool_TLibrary.last = obj;
	}
}
type8_TLibrary = window['type8_TLibrary'];
type8_TLibrary.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type8_TLibrary.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type8_TLibrary.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type10_TBlackList = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
window ['type10_TBlackList'] = function() { this.reset(); }
window['type10_TBlackList'].prototype.getTypeName = function() { return "type10_TBlackList" };
	window['type10_TBlackList'].prototype.reset = function() {
	this.attr3_Typ = 0;
	this.attr8_Name_Str = "";
	this.attr10_Action_Str = "";
	this.vtbl = vtbl_type10_TBlackList;
	this.pool = pool_TBlackList;
	this.succ = null;
	
};
window['type10_TBlackList'].prototype.clone = function() {
	var other = pool_TBlackList.alloc();
	other.attr3_Typ = this.attr3_Typ;
	other.attr8_Name_Str = this.attr8_Name_Str;
	other.attr10_Action_Str = this.attr10_Action_Str;
	other.vtbl = this.vtbl;
	other.pool = this.pool;
	return other;
};
window['type10_TBlackList'].prototype.bridgeToJS = function(isJSON) {
	return {
		"Typ": this.attr3_Typ,
		"Name_Str": this.attr8_Name_Str,
		"Action_Str": this.attr10_Action_Str,
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
pool_TBlackList = { 
	last: null, 
	alloc: function() { 
		var obj = null;
		if (pool_TBlackList.last !== null) {
			obj = pool_TBlackList.last;
			pool_TBlackList.last = obj.succ;
			obj.succ = null;
		} else {
			obj = new type10_TBlackList();
		}
		return obj;
	},
	free: function(obj)  {
		if (obj.succ !== null) return;
		obj.reset();
		obj.succ = pool_TBlackList.last;
		pool_TBlackList.last = obj;
	}
}
type10_TBlackList = window['type10_TBlackList'];
type10_TBlackList.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type10_TBlackList.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type10_TBlackList.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type7_TAction = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
window ['type7_TAction'] = function() { this.reset(); }
window['type7_TAction'].prototype.getTypeName = function() { return "type7_TAction" };
	window['type7_TAction'].prototype.reset = function() {
	this.attr8_Name_Str = "";
	this.attr3_Att = pool_array.alloc(pool_xmlAttribute.alloc());
	this.vtbl = vtbl_type7_TAction;
	this.pool = pool_TAction;
	this.succ = null;
	
};
window['type7_TAction'].prototype.clone = function() {
	var other = pool_TAction.alloc();
	other.attr8_Name_Str = this.attr8_Name_Str;
	other.attr3_Att = tryClone(this.attr3_Att);
	other.vtbl = this.vtbl;
	other.pool = this.pool;
	return other;
};
window['type7_TAction'].prototype.bridgeToJS = function(isJSON) {
	return {
		"Name_Str": this.attr8_Name_Str,
		"Att": (this.attr3_Att).bridgeToJS(isJSON),
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
pool_TAction = { 
	last: null, 
	alloc: function() { 
		var obj = null;
		if (pool_TAction.last !== null) {
			obj = pool_TAction.last;
			pool_TAction.last = obj.succ;
			obj.succ = null;
		} else {
			obj = new type7_TAction();
		}
		return obj;
	},
	free: function(obj)  {
		if (obj.succ !== null) return;
		obj.reset();
		obj.succ = pool_TAction.last;
		pool_TAction.last = obj;
	}
}
type7_TAction = window['type7_TAction'];
type7_TAction.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type7_TAction.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type7_TAction.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type12_xmlAttribute = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
window ['type12_xmlAttribute'] = function() { this.reset(); }
window['type12_xmlAttribute'].prototype.getTypeName = function() { return "type12_xmlAttribute" };
	window['type12_xmlAttribute'].prototype.reset = function() {
	this.attr8_Name_Str = "";
	this.attr9_Value_Str = "";
	this.vtbl = vtbl_type12_xmlAttribute;
	this.pool = pool_xmlAttribute;
	this.succ = null;
	
};
window['type12_xmlAttribute'].prototype.clone = function() {
	var other = pool_xmlAttribute.alloc();
	other.attr8_Name_Str = this.attr8_Name_Str;
	other.attr9_Value_Str = this.attr9_Value_Str;
	other.vtbl = this.vtbl;
	other.pool = this.pool;
	return other;
};
window['type12_xmlAttribute'].prototype.bridgeToJS = function(isJSON) {
	return {
		"Name_Str": this.attr8_Name_Str,
		"Value_Str": this.attr9_Value_Str,
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
pool_xmlAttribute = { 
	last: null, 
	alloc: function() { 
		var obj = null;
		if (pool_xmlAttribute.last !== null) {
			obj = pool_xmlAttribute.last;
			pool_xmlAttribute.last = obj.succ;
			obj.succ = null;
		} else {
			obj = new type12_xmlAttribute();
		}
		return obj;
	},
	free: function(obj)  {
		if (obj.succ !== null) return;
		obj.reset();
		obj.succ = pool_xmlAttribute.last;
		pool_xmlAttribute.last = obj;
	}
}
type12_xmlAttribute = window['type12_xmlAttribute'];
type12_xmlAttribute.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type12_xmlAttribute.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type12_xmlAttribute.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type3_XML = {
	ReadXML: method9_type3_XML_7_ReadXML, 
	ParseLayer: method9_type3_XML_10_ParseLayer, 
	ParseNode: method9_type3_XML_9_ParseNode, 
	ParseIdentifier_Str: method9_type3_XML_19_ParseIdentifier_Str, 
	Get_Str: method9_type3_XML_7_Get_Str, 
	SkipWhitespaces: method9_type3_XML_15_SkipWhitespaces, 
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
window ['type3_XML'] = function() { this.reset(); }
window['type3_XML'].prototype.getTypeName = function() { return "type3_XML" };
	window['type3_XML'].prototype.reset = function() {
	this.attr8_Text_Str = "";
	this.attr5_Event = XMLEvent;
	this.attr8_Position = 0;
	this.attr8_DontCall = 0;
	this.vtbl = vtbl_type3_XML;
	this.attr8_DontCall = 0;
	this.pool = pool_XML;
	this.succ = null;
	
};
window['type3_XML'].prototype.clone = function() {
	var other = pool_XML.alloc();
	other.attr8_Text_Str = this.attr8_Text_Str;
	other.attr5_Event = tryClone(this.attr5_Event);
	other.attr8_Position = this.attr8_Position;
	other.attr8_DontCall = this.attr8_DontCall;
	other.vtbl = this.vtbl;
	other.pool = this.pool;
	return other;
};
window['type3_XML'].prototype.bridgeToJS = function(isJSON) {
	return {
		"Text_Str": this.attr8_Text_Str,
		"Event": (this.attr5_Event).bridgeToJS(isJSON),
		"Position": this.attr8_Position,
		"DontCall": this.attr8_DontCall,
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
pool_XML = { 
	last: null, 
	alloc: function() { 
		var obj = null;
		if (pool_XML.last !== null) {
			obj = pool_XML.last;
			pool_XML.last = obj.succ;
			obj.succ = null;
		} else {
			obj = new type3_XML();
		}
		return obj;
	},
	free: function(obj)  {
		if (obj.succ !== null) return;
		obj.reset();
		obj.succ = pool_XML.last;
		pool_XML.last = obj;
	}
}
type3_XML = window['type3_XML'];
type3_XML.prototype.ReadXML = function() {
	 return this.vtbl.ReadXML(arguments[0], arguments[1], this);
};
type3_XML.prototype.ParseLayer = function() {
	 return this.vtbl.ParseLayer(this);
};
type3_XML.prototype.ParseNode = function() {
	 return this.vtbl.ParseNode(this);
};
type3_XML.prototype.ParseIdentifier_Str = function() {
	 return this.vtbl.ParseIdentifier_Str(this);
};
type3_XML.prototype.Get_Str = function() {
	 return this.vtbl.Get_Str(this);
};
type3_XML.prototype.SkipWhitespaces = function() {
	 return this.vtbl.SkipWhitespaces(this);
};
type3_XML.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type3_XML.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type3_XML.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type7_TObject = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
window ['type7_TObject'] = function() { this.reset(); }
window['type7_TObject'].prototype.getTypeName = function() { return "type7_TObject" };
	window['type7_TObject'].prototype.reset = function() {
	this.vtbl = vtbl_type7_TObject;
	this.pool = pool_TObject;
	this.succ = null;
	
};
window['type7_TObject'].prototype.clone = function() {
	var other = pool_TObject.alloc();
	other.vtbl = this.vtbl;
	other.pool = this.pool;
	return other;
};
window['type7_TObject'].prototype.bridgeToJS = function(isJSON) {
	return {
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
pool_TObject = { 
	last: null, 
	alloc: function() { 
		var obj = null;
		if (pool_TObject.last !== null) {
			obj = pool_TObject.last;
			pool_TObject.last = obj.succ;
			obj.succ = null;
		} else {
			obj = new type7_TObject();
		}
		return obj;
	},
	free: function(obj)  {
		if (obj.succ !== null) return;
		obj.reset();
		obj.succ = pool_TObject.last;
		pool_TObject.last = obj;
	}
}
type7_TObject = window['type7_TObject'];
type7_TObject.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type7_TObject.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type7_TObject.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type17_PATHFINDING_TNode = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
window ['type17_PATHFINDING_TNode'] = function() { this.reset(); }
window['type17_PATHFINDING_TNode'].prototype.getTypeName = function() { return "type17_PATHFINDING_TNode" };
	window['type17_PATHFINDING_TNode'].prototype.reset = function() {
	this.attr4_cost = 0;
	this.attr6_parent = 0;
	this.attr1_x = 0;
	this.attr1_y = 0;
	this.vtbl = vtbl_type17_PATHFINDING_TNode;
	this.pool = pool_PATHFINDING_TNode;
	this.succ = null;
	
};
window['type17_PATHFINDING_TNode'].prototype.clone = function() {
	var other = pool_PATHFINDING_TNode.alloc();
	other.attr4_cost = this.attr4_cost;
	other.attr6_parent = this.attr6_parent;
	other.attr1_x = this.attr1_x;
	other.attr1_y = this.attr1_y;
	other.vtbl = this.vtbl;
	other.pool = this.pool;
	return other;
};
window['type17_PATHFINDING_TNode'].prototype.bridgeToJS = function(isJSON) {
	return {
		"cost": this.attr4_cost,
		"parent": this.attr6_parent,
		"x": this.attr1_x,
		"y": this.attr1_y,
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
pool_PATHFINDING_TNode = { 
	last: null, 
	alloc: function() { 
		var obj = null;
		if (pool_PATHFINDING_TNode.last !== null) {
			obj = pool_PATHFINDING_TNode.last;
			pool_PATHFINDING_TNode.last = obj.succ;
			obj.succ = null;
		} else {
			obj = new type17_PATHFINDING_TNode();
		}
		return obj;
	},
	free: function(obj)  {
		if (obj.succ !== null) return;
		obj.reset();
		obj.succ = pool_PATHFINDING_TNode.last;
		pool_PATHFINDING_TNode.last = obj;
	}
}
type17_PATHFINDING_TNode = window['type17_PATHFINDING_TNode'];
type17_PATHFINDING_TNode.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type17_PATHFINDING_TNode.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type17_PATHFINDING_TNode.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type6_TObj3D = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
window ['type6_TObj3D'] = function() { this.reset(); }
window['type6_TObj3D'].prototype.getTypeName = function() { return "type6_TObj3D" };
	window['type6_TObj3D'].prototype.reset = function() {
	this.vtbl = vtbl_type6_TObj3D;
	this.pool = pool_TObj3D;
	this.succ = null;
	
};
window['type6_TObj3D'].prototype.clone = function() {
	var other = pool_TObj3D.alloc();
	other.vtbl = this.vtbl;
	other.pool = this.pool;
	return other;
};
window['type6_TObj3D'].prototype.bridgeToJS = function(isJSON) {
	return {
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
pool_TObj3D = { 
	last: null, 
	alloc: function() { 
		var obj = null;
		if (pool_TObj3D.last !== null) {
			obj = pool_TObj3D.last;
			pool_TObj3D.last = obj.succ;
			obj.succ = null;
		} else {
			obj = new type6_TObj3D();
		}
		return obj;
	},
	free: function(obj)  {
		if (obj.succ !== null) return;
		obj.reset();
		obj.succ = pool_TObj3D.last;
		pool_TObj3D.last = obj;
	}
}
type6_TObj3D = window['type6_TObj3D'];
type6_TObj3D.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type6_TObj3D.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type6_TObj3D.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type10_DataBuffer = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
window ['type10_DataBuffer'] = function() { this.reset(); }
window['type10_DataBuffer'].prototype.getTypeName = function() { return "type10_DataBuffer" };
	window['type10_DataBuffer'].prototype.reset = function() {
	this.vtbl = vtbl_type10_DataBuffer;
	this.pool = pool_DataBuffer;
	this.succ = null;
	
};
window['type10_DataBuffer'].prototype.clone = function() {
	var other = pool_DataBuffer.alloc();
	other.vtbl = this.vtbl;
	other.pool = this.pool;
	return other;
};
window['type10_DataBuffer'].prototype.bridgeToJS = function(isJSON) {
	return {
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
pool_DataBuffer = { 
	last: null, 
	alloc: function() { 
		var obj = null;
		if (pool_DataBuffer.last !== null) {
			obj = pool_DataBuffer.last;
			pool_DataBuffer.last = obj.succ;
			obj.succ = null;
		} else {
			obj = new type10_DataBuffer();
		}
		return obj;
	},
	free: function(obj)  {
		if (obj.succ !== null) return;
		obj.reset();
		obj.succ = pool_DataBuffer.last;
		pool_DataBuffer.last = obj;
	}
}
type10_DataBuffer = window['type10_DataBuffer'];
type10_DataBuffer.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type10_DataBuffer.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type10_DataBuffer.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var const11_VERSION_Str = "1", const11_XMLNAME_Str = "WIN32", const12_FUNC_IS_FUNC = 1, const11_FUNC_IS_SUB = 2, const14_FUNC_IS_METHOD = 3, const13_FUNC_IS_PROTO = 4, const13_VARI_IS_LOCAL = 1, const14_VARI_IS_GLOBAL = 2, const12_VARI_IS_ATTR = 3, const14_VARI_IS_STATIC = 4, const13_VARI_IS_PARAM = 5, const13_VARI_IS_CONST = 6, const13_VARI_IS_ALIAS = 7, const11_SCOPE_IS_IF = 1, const13_SCOPE_IS_FUNC = 2, const13_SCOPE_IS_LOOP = 3, const13_SCOPE_IS_MAIN = 4, const12_SCOPE_IS_TRY = 5, const15_SCOPE_IS_SELECT = 6, const12_EXPR_VERSION = 1, const11_OP_IS_UNAER = 1, const12_OP_IS_BINAER = 2, const10_OP_IS_BOOL = 3, const14_ERROR_IS_ERROR = 0, const16_ERROR_IS_WARNING = 1, const8_MAX_PASS = 6, const16_EXPR_IS_OPERATOR = 1, const13_EXPR_IS_SCOPE = 2, const11_EXPR_IS_INT = 3, const13_EXPR_IS_FLOAT = 4, const11_EXPR_IS_STR = 5, const16_EXPR_IS_FUNCCALL = 6, const13_EXPR_IS_EMPTY = 7, const13_EXPR_IS_DEBUG = 8, const12_EXPR_IS_VARI = 9, const14_EXPR_IS_ASSIGN = 10, const11_EXPR_IS_DIM = 11, const13_EXPR_IS_REDIM = 12, const13_EXPR_IS_ARRAY = 13, const16_EXPR_IS_CAST2INT = 15, const18_EXPR_IS_CAST2FLOAT = 16, const19_EXPR_IS_CAST2STRING = 17, const14_EXPR_IS_ACCESS = 18, const14_EXPR_IS_RETURN = 19, const12_EXPR_IS_GOTO = 20, const13_EXPR_IS_LABEL = 21, const16_EXPR_IS_FUNCDATA = 22, const17_EXPR_IS_PROTOCALL = 23, const10_EXPR_IS_IF = 24, const13_EXPR_IS_WHILE = 25, const14_EXPR_IS_REPEAT = 26, const11_EXPR_IS_FOR = 27, const13_EXPR_IS_BREAK = 29, const16_EXPR_IS_CONTINUE = 30, const11_EXPR_IS_TRY = 31, const13_EXPR_IS_THROW = 32, const15_EXPR_IS_RESTORE = 33, const12_EXPR_IS_READ = 34, const14_EXPR_IS_DEFVAL = 35, const17_EXPR_IS_DIMASEXPR = 36, const13_EXPR_IS_ALIAS = 37, const15_EXPR_IS_FOREACH = 38, const11_EXPR_IS_INC = 39, const15_EXPR_IS_DIMPUSH = 40, const11_EXPR_IS_LEN = 41, const15_EXPR_IS_DIMDATA = 42, const14_EXPR_IS_DELETE = 43, const14_EXPR_IS_DIMDEL = 44, const13_EXPR_IS_BOUND = 45, const11_EXPR_IS_NOT = 46, const13_EXPR_IS_DUMMY = 47, const17_EXPR_IS_ADDRESSOF = 48, const14_EXPR_IS_ASSERT = 49, const19_EXPR_IS_DEBUGOUTPUT = 50, const11_EXPR_IS_IIF = 51, const15_EXPR_IS_REQUIRE = 52, const13_EXPR_IS_SUPER = 53, const16_EXPR_IS_CAST2OBJ = 54, const6_BL_EXT = 1, const7_BL_FILE = 2, const19_GL_DEPTH_BUFFER_BIT = 256, const21_GL_STENCIL_BUFFER_BIT = 1024, const19_GL_COLOR_BUFFER_BIT = 16384, const8_GL_FALSE = 0, const7_GL_TRUE = 1, const9_GL_POINTS = 0, const8_GL_LINES = 1, const12_GL_LINE_LOOP = 2, const13_GL_LINE_STRIP = 3, const12_GL_TRIANGLES = 4, const17_GL_TRIANGLE_STRIP = 5, const15_GL_TRIANGLE_FAN = 6, const7_GL_ZERO = 0, const6_GL_ONE = 1, const12_GL_SRC_COLOR = 768, const22_GL_ONE_MINUS_SRC_COLOR = 769, const12_GL_SRC_ALPHA = 770, const22_GL_ONE_MINUS_SRC_ALPHA = 771, const12_GL_DST_ALPHA = 772, const22_GL_ONE_MINUS_DST_ALPHA = 773, const12_GL_DST_COLOR = 774, const22_GL_ONE_MINUS_DST_COLOR = 775, const21_GL_SRC_ALPHA_SATURATE = 776, const11_GL_FUNC_ADD = 32774, const17_GL_BLEND_EQUATION = 32777, const21_GL_BLEND_EQUATION_RGB = 32777, const23_GL_BLEND_EQUATION_ALPHA = 34877, const16_GL_FUNC_SUBTRACT = 32778, const24_GL_FUNC_REVERSE_SUBTRACT = 32779, const16_GL_BLEND_DST_RGB = 32968, const16_GL_BLEND_SRC_RGB = 32969, const18_GL_BLEND_DST_ALPHA = 32970, const18_GL_BLEND_SRC_ALPHA = 32971, const17_GL_CONSTANT_COLOR = 32769, const27_GL_ONE_MINUS_CONSTANT_COLOR = 32770, const17_GL_CONSTANT_ALPHA = 32771, const27_GL_ONE_MINUS_CONSTANT_ALPHA = 32772, const14_GL_BLEND_COLOR = 32773, const15_GL_ARRAY_BUFFER = 34962, const23_GL_ELEMENT_ARRAY_BUFFER = 34963, const23_GL_ARRAY_BUFFER_BINDING = 34964, const31_GL_ELEMENT_ARRAY_BUFFER_BINDING = 34965, const14_GL_STREAM_DRAW = 35040, const14_GL_STATIC_DRAW = 35044, const15_GL_DYNAMIC_DRAW = 35048, const14_GL_BUFFER_SIZE = 34660, const15_GL_BUFFER_USAGE = 34661, const24_GL_CURRENT_VERTEX_ATTRIB = 34342, const8_GL_FRONT = 1028, const7_GL_BACK = 1029, const17_GL_FRONT_AND_BACK = 1032, const13_GL_TEXTURE_2D = 3553, const12_GL_CULL_FACE = 2884, const8_GL_BLEND = 3042, const9_GL_DITHER = 3024, const15_GL_STENCIL_TEST = 2960, const13_GL_DEPTH_TEST = 2929, const15_GL_SCISSOR_TEST = 3089, const22_GL_POLYGON_OFFSET_FILL = 32823, const27_GL_SAMPLE_ALPHA_TO_COVERAGE = 32926, const18_GL_SAMPLE_COVERAGE = 32928, const11_GL_NO_ERROR = 0, const15_GL_INVALID_ENUM = 1280, const16_GL_INVALID_VALUE = 1281, const20_GL_INVALID_OPERATION = 1282, const16_GL_OUT_OF_MEMORY = 1285, const5_GL_CW = 2304, const6_GL_CCW = 2305, const13_GL_LINE_WIDTH = 2849, const27_GL_ALIASED_POINT_SIZE_RANGE = 33901, const27_GL_ALIASED_LINE_WIDTH_RANGE = 33902, const17_GL_CULL_FACE_MODE = 2885, const13_GL_FRONT_FACE = 2886, const14_GL_DEPTH_RANGE = 2928, const18_GL_DEPTH_WRITEMASK = 2930, const20_GL_DEPTH_CLEAR_VALUE = 2931, const13_GL_DEPTH_FUNC = 2932, const22_GL_STENCIL_CLEAR_VALUE = 2961, const15_GL_STENCIL_FUNC = 2962, const15_GL_STENCIL_FAIL = 2964, const26_GL_STENCIL_PASS_DEPTH_FAIL = 2965, const26_GL_STENCIL_PASS_DEPTH_PASS = 2966, const14_GL_STENCIL_REF = 2967, const21_GL_STENCIL_VALUE_MASK = 2963, const20_GL_STENCIL_WRITEMASK = 2968, const20_GL_STENCIL_BACK_FUNC = 34816, const20_GL_STENCIL_BACK_FAIL = 34817, const31_GL_STENCIL_BACK_PASS_DEPTH_FAIL = 34818, const31_GL_STENCIL_BACK_PASS_DEPTH_PASS = 34819, const19_GL_STENCIL_BACK_REF = 36003, const26_GL_STENCIL_BACK_VALUE_MASK = 36004, const25_GL_STENCIL_BACK_WRITEMASK = 36005, const11_GL_VIEWPORT = 2978, const14_GL_SCISSOR_BOX = 3088, const20_GL_COLOR_CLEAR_VALUE = 3106, const18_GL_COLOR_WRITEMASK = 3107, const19_GL_UNPACK_ALIGNMENT = 3317, const17_GL_PACK_ALIGNMENT = 3333, const19_GL_MAX_TEXTURE_SIZE = 3379, const20_GL_MAX_VIEWPORT_DIMS = 3386, const16_GL_SUBPIXEL_BITS = 3408, const11_GL_RED_BITS = 3410, const13_GL_GREEN_BITS = 3411, const12_GL_BLUE_BITS = 3412, const13_GL_ALPHA_BITS = 3413, const13_GL_DEPTH_BITS = 3414, const15_GL_STENCIL_BITS = 3415, const23_GL_POLYGON_OFFSET_UNITS = 10752, const24_GL_POLYGON_OFFSET_FACTOR = 32824, const21_GL_TEXTURE_BINDING_2D = 32873, const17_GL_SAMPLE_BUFFERS = 32936, const10_GL_SAMPLES = 32937, const24_GL_SAMPLE_COVERAGE_VALUE = 32938, const25_GL_SAMPLE_COVERAGE_INVERT = 32939, const33_GL_NUM_COMPRESSED_TEXTURE_FORMATS = 34466, const29_GL_COMPRESSED_TEXTURE_FORMATS = 34467, const12_GL_DONT_CARE = 4352, const10_GL_FASTEST = 4353, const9_GL_NICEST = 4354, const23_GL_GENERATE_MIPMAP_HINT = 33170, const7_GL_BYTE = 5120, const16_GL_UNSIGNED_BYTE = 5121, const8_GL_SHORT = 5122, const17_GL_UNSIGNED_SHORT = 5123, const6_GL_INT = 5124, const15_GL_UNSIGNED_INT = 5125, const8_GL_FLOAT = 5126, const8_GL_FIXED = 5132, const18_GL_DEPTH_COMPONENT = 6402, const8_GL_ALPHA = 6406, const6_GL_RGB = 6407, const7_GL_RGBA = 6408, const12_GL_LUMINANCE = 6409, const18_GL_LUMINANCE_ALPHA = 6410, const25_GL_UNSIGNED_SHORT_4_4_4_4 = 32819, const25_GL_UNSIGNED_SHORT_5_5_5_1 = 32820, const23_GL_UNSIGNED_SHORT_5_6_5 = 33635, const18_GL_FRAGMENT_SHADER = 35632, const16_GL_VERTEX_SHADER = 35633, const21_GL_MAX_VERTEX_ATTRIBS = 34921, const29_GL_MAX_VERTEX_UNIFORM_VECTORS = 36347, const22_GL_MAX_VARYING_VECTORS = 36348, const35_GL_MAX_COMBINED_TEXTURE_IMAGE_UNITS = 35661, const33_GL_MAX_VERTEX_TEXTURE_IMAGE_UNITS = 35660, const26_GL_MAX_TEXTURE_IMAGE_UNITS = 34930, const31_GL_MAX_FRAGMENT_UNIFORM_VECTORS = 36349, const14_GL_SHADER_TYPE = 35663, const16_GL_DELETE_STATUS = 35712, const14_GL_LINK_STATUS = 35714, const18_GL_VALIDATE_STATUS = 35715, const19_GL_ATTACHED_SHADERS = 35717, const18_GL_ACTIVE_UNIFORMS = 35718, const28_GL_ACTIVE_UNIFORM_MAX_LENGTH = 35719, const20_GL_ACTIVE_ATTRIBUTES = 35721, const30_GL_ACTIVE_ATTRIBUTE_MAX_LENGTH = 35722, const27_GL_SHADING_LANGUAGE_VERSION = 35724, const18_GL_CURRENT_PROGRAM = 35725, const8_GL_NEVER = 512, const7_GL_LESS = 513, const8_GL_EQUAL = 514, const9_GL_LEQUAL = 515, const10_GL_GREATER = 516, const11_GL_NOTEQUAL = 517, const9_GL_GEQUAL = 518, const9_GL_ALWAYS = 519, const7_GL_KEEP = 7680, const10_GL_REPLACE = 7681, const7_GL_INCR = 7682, const7_GL_DECR = 7683, const9_GL_INVERT = 5386, const12_GL_INCR_WRAP = 34055, const12_GL_DECR_WRAP = 34056, const9_GL_VENDOR = 7936, const11_GL_RENDERER = 7937, const10_GL_VERSION = 7938, const13_GL_EXTENSIONS = 7939, const10_GL_NEAREST = 9728, const9_GL_LINEAR = 9729, const25_GL_NEAREST_MIPMAP_NEAREST = 9984, const24_GL_LINEAR_MIPMAP_NEAREST = 9985, const24_GL_NEAREST_MIPMAP_LINEAR = 9986, const23_GL_LINEAR_MIPMAP_LINEAR = 9987, const21_GL_TEXTURE_MAG_FILTER = 10240, const21_GL_TEXTURE_MIN_FILTER = 10241, const17_GL_TEXTURE_WRAP_S = 10242, const17_GL_TEXTURE_WRAP_T = 10243, const10_GL_TEXTURE = 5890, const19_GL_TEXTURE_CUBE_MAP = 34067, const27_GL_TEXTURE_BINDING_CUBE_MAP = 34068, const30_GL_TEXTURE_CUBE_MAP_POSITIVE_X = 34069, const30_GL_TEXTURE_CUBE_MAP_NEGATIVE_X = 34070, const30_GL_TEXTURE_CUBE_MAP_POSITIVE_Y = 34071, const30_GL_TEXTURE_CUBE_MAP_NEGATIVE_Y = 34072, const30_GL_TEXTURE_CUBE_MAP_POSITIVE_Z = 34073, const30_GL_TEXTURE_CUBE_MAP_NEGATIVE_Z = 34074, const28_GL_MAX_CUBE_MAP_TEXTURE_SIZE = 34076, const11_GL_TEXTURE0 = 33984, const11_GL_TEXTURE1 = 33985, const11_GL_TEXTURE2 = 33986, const11_GL_TEXTURE3 = 33987, const11_GL_TEXTURE4 = 33988, const11_GL_TEXTURE5 = 33989, const11_GL_TEXTURE6 = 33990, const11_GL_TEXTURE7 = 33991, const11_GL_TEXTURE8 = 33992, const11_GL_TEXTURE9 = 33993, const12_GL_TEXTURE10 = 33994, const12_GL_TEXTURE11 = 33995, const12_GL_TEXTURE12 = 33996, const12_GL_TEXTURE13 = 33997, const12_GL_TEXTURE14 = 33998, const12_GL_TEXTURE15 = 33999, const12_GL_TEXTURE16 = 34000, const12_GL_TEXTURE17 = 34001, const12_GL_TEXTURE18 = 34002, const12_GL_TEXTURE19 = 34003, const12_GL_TEXTURE20 = 34004, const12_GL_TEXTURE21 = 34005, const12_GL_TEXTURE22 = 34006, const12_GL_TEXTURE23 = 34007, const12_GL_TEXTURE24 = 34008, const12_GL_TEXTURE25 = 34009, const12_GL_TEXTURE26 = 34010, const12_GL_TEXTURE27 = 34011, const12_GL_TEXTURE28 = 34012, const12_GL_TEXTURE29 = 34013, const12_GL_TEXTURE30 = 34014, const12_GL_TEXTURE31 = 34015, const17_GL_ACTIVE_TEXTURE = 34016, const9_GL_REPEAT = 10497, const16_GL_CLAMP_TO_EDGE = 33071, const18_GL_MIRRORED_REPEAT = 33648, const13_GL_FLOAT_VEC2 = 35664, const13_GL_FLOAT_VEC3 = 35665, const13_GL_FLOAT_VEC4 = 35666, const11_GL_INT_VEC2 = 35667, const11_GL_INT_VEC3 = 35668, const11_GL_INT_VEC4 = 35669, const7_GL_BOOL = 35670, const12_GL_BOOL_VEC2 = 35671, const12_GL_BOOL_VEC3 = 35672, const12_GL_BOOL_VEC4 = 35673, const13_GL_FLOAT_MAT2 = 35674, const13_GL_FLOAT_MAT3 = 35675, const13_GL_FLOAT_MAT4 = 35676, const13_GL_SAMPLER_2D = 35678, const15_GL_SAMPLER_CUBE = 35680, const30_GL_VERTEX_ATTRIB_ARRAY_ENABLED = 34338, const27_GL_VERTEX_ATTRIB_ARRAY_SIZE = 34339, const29_GL_VERTEX_ATTRIB_ARRAY_STRIDE = 34340, const27_GL_VERTEX_ATTRIB_ARRAY_TYPE = 34341, const33_GL_VERTEX_ATTRIB_ARRAY_NORMALIZED = 34922, const30_GL_VERTEX_ATTRIB_ARRAY_POINTER = 34373, const37_GL_VERTEX_ATTRIB_ARRAY_BUFFER_BINDING = 34975, const33_GL_IMPLEMENTATION_COLOR_READ_TYPE = 35738, const35_GL_IMPLEMENTATION_COLOR_READ_FORMAT = 35739, const17_GL_COMPILE_STATUS = 35713, const18_GL_INFO_LOG_LENGTH = 35716, const23_GL_SHADER_SOURCE_LENGTH = 35720, const18_GL_SHADER_COMPILER = 36346, const24_GL_SHADER_BINARY_FORMATS = 36344, const28_GL_NUM_SHADER_BINARY_FORMATS = 36345, const12_GL_LOW_FLOAT = 36336, const15_GL_MEDIUM_FLOAT = 36337, const13_GL_HIGH_FLOAT = 36338, const10_GL_LOW_INT = 36339, const13_GL_MEDIUM_INT = 36340, const11_GL_HIGH_INT = 36341, const14_GL_FRAMEBUFFER = 36160, const15_GL_RENDERBUFFER = 36161, const8_GL_RGBA4 = 32854, const10_GL_RGB5_A1 = 32855, const9_GL_RGB565 = 36194, const20_GL_DEPTH_COMPONENT16 = 33189, const16_GL_STENCIL_INDEX = 6401, const17_GL_STENCIL_INDEX8 = 36168, const21_GL_RENDERBUFFER_WIDTH = 36162, const22_GL_RENDERBUFFER_HEIGHT = 36163, const31_GL_RENDERBUFFER_INTERNAL_FORMAT = 36164, const24_GL_RENDERBUFFER_RED_SIZE = 36176, const26_GL_RENDERBUFFER_GREEN_SIZE = 36177, const25_GL_RENDERBUFFER_BLUE_SIZE = 36178, const26_GL_RENDERBUFFER_ALPHA_SIZE = 36179, const26_GL_RENDERBUFFER_DEPTH_SIZE = 36180, const28_GL_RENDERBUFFER_STENCIL_SIZE = 36181, const37_GL_FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE = 36048, const37_GL_FRAMEBUFFER_ATTACHMENT_OBJECT_NAME = 36049, const39_GL_FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL = 36050, const47_GL_FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE = 36051, const20_GL_COLOR_ATTACHMENT0 = 36064, const19_GL_DEPTH_ATTACHMENT = 36096, const21_GL_STENCIL_ATTACHMENT = 36128, const7_GL_NONE = 0, const23_GL_FRAMEBUFFER_COMPLETE = 36053, const36_GL_FRAMEBUFFER_INCOMPLETE_ATTACHMENT = 36054, const44_GL_FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT = 36055, const36_GL_FRAMEBUFFER_INCOMPLETE_DIMENSIONS = 36057, const26_GL_FRAMEBUFFER_UNSUPPORTED = 36061, const22_GL_FRAMEBUFFER_BINDING = 36006, const23_GL_RENDERBUFFER_BINDING = 36007, const24_GL_MAX_RENDERBUFFER_SIZE = 34024, const32_GL_INVALID_FRAMEBUFFER_OPERATION = 1286, global10_LastExprID = 0.0, global5_Exprs_ref = [pool_array.alloc([pool_TExpr.alloc()])], global8_LastType = pool_TIdentifierType.alloc(), global12_voidDatatype = pool_TDatatype.alloc(), global11_intDatatype = pool_TDatatype.alloc(), global13_floatDatatype = pool_TDatatype.alloc(), global11_strDatatype = pool_TDatatype.alloc(), global9_Operators_ref = [pool_array.alloc([pool_TOperator.alloc()])], global10_KeywordMap = pool_HashMap.alloc(), global12_Keywords_Str = pool_array.alloc(""), global8_Compiler = pool_TCompiler.alloc(), global7_Defines = pool_array.alloc(pool_TDefine.alloc()), global10_LastDefine = pool_TDefine.alloc(), global10_Generators = pool_array.alloc(pool_TGenerator.alloc()), global13_SettingIn_Str = "", global11_SHLASHF_Str = "", MaxPasses = 0, global14_Documentations = pool_array.alloc(pool_Documentation.alloc()), global9_GFX_WIDTH = 0.0, global10_GFX_HEIGHT = 0.0, global10_FULLSCREEN = 0, global9_FRAMERATE = 0, global11_APPNAME_Str = "", global9_DEBUGMODE = 0, global7_CONSOLE = 0.0, global6_STRICT = 0.0, global15_USRDEF_VERS_Str = "", global14_GbapOutput_Str = "", global12_GbapPath_Str = "", global12_GbapName_Str = "", global6_Ignore = 0, global13_OptimizeLevel = 0, global12_CurrentScope = 0, global14_ForEachCounter = 0, global11_CurrentFunc = 0, global12_LabelDef_Str = "", global8_IsInGoto = 0, global11_LoopBreakID = 0, global14_LoopContinueID = 0, global11_LastDummyID = 0, global14_StaticText_Str = "", global13_VariUndef_Str = "", global6_Indent = 0, global9_Templates = pool_array.alloc(pool_TTemplate.alloc()), global9_Libraries = pool_array.alloc(pool_TLibrary.alloc()), global10_Blacklists = pool_array.alloc(pool_TBlackList.alloc()), global7_Actions = pool_array.alloc(pool_TAction.alloc()), global8_Mode_Str = "", global10_Target_Str = "", global13_SettingIn_Str = "", global9_Templates = pool_array.alloc(pool_TTemplate.alloc()), global8_Lang_Str = "", global22_DirectoryStructure_Str = "", global5_NoRun = 0, global10_SaveHeader = 0, global24_PATHFINDING_AFP_mapmax_x = 0.0, global24_PATHFINDING_AFP_mapmax_y = 0.0, global20_PATHFINDING_AFP_dirx = pool_array.alloc(0), global20_PATHFINDING_AFP_diry = pool_array.alloc(0), global8_AFP_dirz = pool_array.alloc(0), global13_AFP_heuristic = pool_array.alloc(0), global6_Objs3D = pool_array.alloc(pool_TObj3D.alloc());
// set default statics:
window['initStatics'] = function() {
	static12_Factor_DIMASEXPRErr = 0;
static12_Keyword_SelectHelper = 0.0;

}
initStatics = window['initStatics'];
for (var __init = 0; __init < preInitFuncs.length; __init++) preInitFuncs[__init]();
