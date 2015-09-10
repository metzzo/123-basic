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
	var other = new OTTArray(); //pool_array.alloc(this.defval);
	
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

/*var array_pools = { };

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
};*/

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
	var local1_G_1811 = new type10_TGenerator();
	DIM(global10_Generators, [0], new type10_TGenerator());
	local1_G_1811.attr8_Name_Str = "JS";
	local1_G_1811.attr8_genProto = func16_JS_Generator_Str;
	DIMPUSH(global10_Generators, local1_G_1811);
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
	global16_CurrentUndef_Str = "";
	global10_Target_Str = "";
	global8_Lang_Str = "";
	global5_NoRun = 0;
	global10_SaveHeader = 0;
	
}
main = window['main'];
window['func8_Analyser'] = function() {
	var local6_CurTyp_2456 = 0;
	func5_Start();
	while (func8_EOFParse()) {
		{
			var Err_Str = "";
			try {
				{
					var local17___SelectHelper35__2451 = "";
					local17___SelectHelper35__2451 = func14_GetCurrent_Str();
					if ((((local17___SelectHelper35__2451) === ("TYPE")) ? 1 : 0)) {
						var local3_typ_ref_2452 = [new type15_TIdentifierType()];
						func5_Match("TYPE", 16, "src\CompilerPasses\Analyser.gbas");
						local3_typ_ref_2452[0].attr8_Name_Str = func14_GetCurrent_Str();
						local3_typ_ref_2452[0].attr12_RealName_Str = local3_typ_ref_2452[0].attr8_Name_Str;
						local3_typ_ref_2452[0].attr2_ID = BOUNDS(global8_Compiler.attr5_Types_ref[0], 0);
						DIMPUSH(global8_Compiler.attr5_Types_ref[0], local3_typ_ref_2452);
						func7_GetNext();
						
					} else if ((((local17___SelectHelper35__2451) === ("PROTOTYPE")) ? 1 : 0)) {
						var local4_func_2453 = new type15_TIdentifierFunc();
						func5_Match("PROTOTYPE", 25, "src\CompilerPasses\Analyser.gbas");
						local4_func_2453.attr8_Name_Str = func14_GetCurrent_Str();
						local4_func_2453.attr3_Typ = ~~(4);
						func11_AddFunction(local4_func_2453);
						func7_GetNext();
						
					} else if ((((local17___SelectHelper35__2451) === ("CONSTANT")) ? 1 : 0)) {
						do {
							var local4_Vari_2454 = new type15_TIdentifierVari();
							if (func7_IsToken("CONSTANT")) {
								func5_Match("CONSTANT", 44, "src\CompilerPasses\Analyser.gbas");
								
							} else {
								func5_Match(",", 46, "src\CompilerPasses\Analyser.gbas");
								
							};
							local4_Vari_2454 = func7_VariDef(0).clone();
							local4_Vari_2454.attr3_Typ = ~~(6);
							func11_AddVariable(local4_Vari_2454, 0);
							DIMPUSH(global8_Compiler.attr7_Globals, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
							
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
	local6_CurTyp_2456 = -(1);
	func5_Start();
	while (func8_EOFParse()) {
		{
			var Err_Str = "";
			try {
				var local10_IsCallback_2457 = 0, local8_IsNative_2458 = 0, local10_IsAbstract_2459 = 0;
				local10_IsCallback_2457 = 0;
				local8_IsNative_2458 = 0;
				local10_IsAbstract_2459 = 0;
				if (func7_IsToken("CALLBACK")) {
					func5_Match("CALLBACK", 72, "src\CompilerPasses\Analyser.gbas");
					local10_IsCallback_2457 = 1;
					if ((((func7_IsToken("FUNCTION")) === (0)) ? 1 : 0)) {
						func5_Match("FUNCTION", 74, "src\CompilerPasses\Analyser.gbas");
						
					};
					
				};
				if (func7_IsToken("NATIVE")) {
					func5_Match("NATIVE", 77, "src\CompilerPasses\Analyser.gbas");
					local8_IsNative_2458 = 1;
					if ((((func7_IsToken("FUNCTION")) === (0)) ? 1 : 0)) {
						func5_Match("FUNCTION", 79, "src\CompilerPasses\Analyser.gbas");
						
					};
					
				};
				if (func7_IsToken("ABSTRACT")) {
					func5_Match("ABSTRACT", 82, "src\CompilerPasses\Analyser.gbas");
					local10_IsAbstract_2459 = 1;
					if ((((func7_IsToken("FUNCTION")) === (0)) ? 1 : 0)) {
						func5_Match("FUNCTION", 84, "src\CompilerPasses\Analyser.gbas");
						
					};
					
				};
				{
					var local17___SelectHelper36__2460 = "";
					local17___SelectHelper36__2460 = func14_GetCurrent_Str();
					if ((((local17___SelectHelper36__2460) === ("PROTOTYPE")) ? 1 : 0)) {
						var local3_var_2461 = new type15_TIdentifierVari(), local5_Found_2462 = 0;
						func5_Match("PROTOTYPE", 89, "src\CompilerPasses\Analyser.gbas");
						local3_var_2461 = func7_VariDef(0).clone();
						local5_Found_2462 = 0;
						var forEachSaver21332 = global8_Compiler.attr5_Funcs_ref[0];
						for(var forEachCounter21332 = 0 ; forEachCounter21332 < forEachSaver21332.values.length ; forEachCounter21332++) {
							var local4_func_ref_2463 = forEachSaver21332.values[forEachCounter21332];
						{
								if ((((local4_func_ref_2463[0].attr8_Name_Str) === (local3_var_2461.attr8_Name_Str)) ? 1 : 0)) {
									local4_func_ref_2463[0].attr8_datatype = local3_var_2461.attr8_datatype.clone();
									local5_Found_2462 = 1;
									break;
									
								};
								
							}
							forEachSaver21332.values[forEachCounter21332] = local4_func_ref_2463;
						
						};
						if ((((local5_Found_2462) === (0)) ? 1 : 0)) {
							func5_Error((("Internal error (prototype not found: ") + (local3_var_2461.attr8_Name_Str)), 100, "src\CompilerPasses\Analyser.gbas");
							
						};
						if ((((local6_CurTyp_2456) !== (-(1))) ? 1 : 0)) {
							func5_Error("PROTOTYPE definition not in Type allowed.", 101, "src\CompilerPasses\Analyser.gbas");
							
						};
						
					} else if ((((local17___SelectHelper36__2460) === ("FUNCTION")) ? 1 : 0)) {
						var local3_var_2464 = new type15_TIdentifierVari(), local4_func_2465 = new type15_TIdentifierFunc();
						func5_Match("FUNCTION", 103, "src\CompilerPasses\Analyser.gbas");
						local3_var_2464 = func7_VariDef(0).clone();
						local4_func_2465.attr8_Name_Str = local3_var_2464.attr8_Name_Str;
						local4_func_2465.attr8_datatype = local3_var_2464.attr8_datatype.clone();
						local4_func_2465.attr10_IsCallback = local10_IsCallback_2457;
						local4_func_2465.attr10_IsAbstract = local10_IsAbstract_2459;
						local4_func_2465.attr6_DefTok = global8_Compiler.attr11_currentPosi;
						if ((((local6_CurTyp_2456) !== (-(1))) ? 1 : 0)) {
							local4_func_2465.attr3_Typ = ~~(3);
							DIMPUSH(global8_Compiler.attr5_Types_ref[0].arrAccess(local6_CurTyp_2456).values[tmpPositionCache][0].attr7_Methods, BOUNDS(global8_Compiler.attr5_Funcs_ref[0], 0));
							local4_func_2465.attr6_MyType = local6_CurTyp_2456;
							
						} else {
							local4_func_2465.attr3_Typ = ~~(1);
							
						};
						func11_AddFunction(local4_func_2465);
						if (((((((local8_IsNative_2458) === (0)) ? 1 : 0)) && ((((local10_IsAbstract_2459) === (0)) ? 1 : 0))) ? 1 : 0)) {
							func10_SkipTokens("FUNCTION", "ENDFUNCTION", local4_func_2465.attr8_Name_Str);
							
						};
						
					} else if ((((local17___SelectHelper36__2460) === ("SUB")) ? 1 : 0)) {
						var local4_func_2466 = new type15_TIdentifierFunc();
						func5_Match("SUB", 126, "src\CompilerPasses\Analyser.gbas");
						local4_func_2466.attr8_Name_Str = func14_GetCurrent_Str();
						local4_func_2466.attr8_datatype = global12_voidDatatype.clone();
						local4_func_2466.attr3_Typ = ~~(2);
						local4_func_2466.attr6_DefTok = global8_Compiler.attr11_currentPosi;
						func11_AddFunction(local4_func_2466);
						func10_SkipTokens("SUB", "ENDSUB", local4_func_2466.attr8_Name_Str);
						
					} else if ((((local17___SelectHelper36__2460) === ("TYPE")) ? 1 : 0)) {
						func5_Match("TYPE", 135, "src\CompilerPasses\Analyser.gbas");
						if ((((func6_IsType("")) === (0)) ? 1 : 0)) {
							func5_Error((((("Internal error (unrecognized type: ") + (func14_GetCurrent_Str()))) + (")")), 136, "src\CompilerPasses\Analyser.gbas");
							
						};
						local6_CurTyp_2456 = global8_LastType.attr2_ID;
						
					} else if ((((local17___SelectHelper36__2460) === ("ENDTYPE")) ? 1 : 0)) {
						local6_CurTyp_2456 = -(1);
						
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
	if ((((local6_CurTyp_2456) !== (-(1))) ? 1 : 0)) {
		func5_Error((((("Type '") + (global8_Compiler.attr5_Types_ref[0].arrAccess(local6_CurTyp_2456).values[tmpPositionCache][0].attr8_Name_Str))) + (" not closed with 'ENDTYPE'")), 149, "src\CompilerPasses\Analyser.gbas");
		
	};
	local6_CurTyp_2456 = -(1);
	var forEachSaver21629 = global8_Compiler.attr5_Funcs_ref[0];
	for(var forEachCounter21629 = 0 ; forEachCounter21629 < forEachSaver21629.values.length ; forEachCounter21629++) {
		var local1_F_ref_2468 = forEachSaver21629.values[forEachCounter21629];
	{
			if (local1_F_ref_2468[0].attr10_IsCallback) {
				var local12_alreadyExist_2469 = 0;
				local12_alreadyExist_2469 = 0;
				var forEachSaver21614 = global8_Compiler.attr5_Funcs_ref[0];
				for(var forEachCounter21614 = 0 ; forEachCounter21614 < forEachSaver21614.values.length ; forEachCounter21614++) {
					var local2_F2_ref_2470 = forEachSaver21614.values[forEachCounter21614];
				{
						if (((((((local2_F2_ref_2470[0].attr8_Name_Str) === (local1_F_ref_2468[0].attr8_Name_Str)) ? 1 : 0)) && ((((local2_F2_ref_2470[0].attr10_IsCallback) === (0)) ? 1 : 0))) ? 1 : 0)) {
							local12_alreadyExist_2469 = 1;
							break;
							
						};
						
					}
					forEachSaver21614.values[forEachCounter21614] = local2_F2_ref_2470;
				
				};
				if (local12_alreadyExist_2469) {
					local1_F_ref_2468[0].attr8_Name_Str = (("Overwritten Callback method (screw them!): ") + (local1_F_ref_2468[0].attr8_Name_Str));
					
				};
				
			};
			
		}
		forEachSaver21629.values[forEachCounter21629] = local1_F_ref_2468;
	
	};
	var forEachSaver21668 = global8_Compiler.attr5_Funcs_ref[0];
	for(var forEachCounter21668 = 0 ; forEachCounter21668 < forEachSaver21668.values.length ; forEachCounter21668++) {
		var local1_F_ref_2471 = forEachSaver21668.values[forEachCounter21668];
	{
			if ((((((((((local1_F_ref_2471[0].attr3_Typ) !== (3)) ? 1 : 0)) && ((((local1_F_ref_2471[0].attr3_Typ) !== (2)) ? 1 : 0))) ? 1 : 0)) && (((local1_F_ref_2471[0].attr10_IsCallback) ? 0 : 1))) ? 1 : 0)) {
				(global8_Compiler.attr11_GlobalFuncs).Put(local1_F_ref_2471[0].attr8_Name_Str, local1_F_ref_2471[0].attr2_ID);
				
			};
			
		}
		forEachSaver21668.values[forEachCounter21668] = local1_F_ref_2471;
	
	};
	func5_Start();
	while (func8_EOFParse()) {
		{
			var Err_Str = "";
			try {
				{
					var local17___SelectHelper37__2472 = "";
					local17___SelectHelper37__2472 = func14_GetCurrent_Str();
					if ((((local17___SelectHelper37__2472) === ("GLOBAL")) ? 1 : 0)) {
						do {
							var local4_Vari_2473 = new type15_TIdentifierVari();
							if (func7_IsToken("GLOBAL")) {
								func5_Match("GLOBAL", 195, "src\CompilerPasses\Analyser.gbas");
								
							} else {
								func5_Match(",", 197, "src\CompilerPasses\Analyser.gbas");
								
							};
							local4_Vari_2473 = func7_VariDef(0).clone();
							local4_Vari_2473.attr3_Typ = ~~(2);
							func11_AddVariable(local4_Vari_2473, 1);
							DIMPUSH(global8_Compiler.attr7_Globals, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
							
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
					var local17___SelectHelper38__2475 = "";
					local17___SelectHelper38__2475 = func14_GetCurrent_Str();
					if ((((local17___SelectHelper38__2475) === ("TYPE")) ? 1 : 0)) {
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
	local6_CurTyp_2456 = -(1);
	var forEachSaver21769 = global8_Compiler.attr5_Types_ref[0];
	for(var forEachCounter21769 = 0 ; forEachCounter21769 < forEachSaver21769.values.length ; forEachCounter21769++) {
		var local3_typ_ref_2477 = forEachSaver21769.values[forEachCounter21769];
	{
			func10_ExtendType(unref(local3_typ_ref_2477[0]));
			
		}
		forEachSaver21769.values[forEachCounter21769] = local3_typ_ref_2477;
	
	};
	var forEachSaver21782 = global8_Compiler.attr5_Types_ref[0];
	for(var forEachCounter21782 = 0 ; forEachCounter21782 < forEachSaver21782.values.length ; forEachCounter21782++) {
		var local3_typ_ref_2478 = forEachSaver21782.values[forEachCounter21782];
	{
			func11_CheckCyclic(local3_typ_ref_2478[0].attr8_Name_Str, unref(local3_typ_ref_2478[0]));
			
		}
		forEachSaver21782.values[forEachCounter21782] = local3_typ_ref_2478;
	
	};
	func5_Start();
	while (func8_EOFParse()) {
		{
			var Err_Str = "";
			try {
				var local8_isNative_2479 = 0, local10_isCallBack_2480 = 0;
				local8_isNative_2479 = 0;
				local10_isCallBack_2480 = 0;
				{
					var local17___SelectHelper39__2481 = "";
					local17___SelectHelper39__2481 = func14_GetCurrent_Str();
					if ((((local17___SelectHelper39__2481) === ("NATIVE")) ? 1 : 0)) {
						local8_isNative_2479 = 1;
						func7_GetNext();
						
					} else if ((((local17___SelectHelper39__2481) === ("CALLBACK")) ? 1 : 0)) {
						local10_isCallBack_2480 = 1;
						func7_GetNext();
						
					} else if ((((local17___SelectHelper39__2481) === ("ABSTRACT")) ? 1 : 0)) {
						func7_GetNext();
						
					};
					
				};
				{
					var local17___SelectHelper40__2482 = "";
					local17___SelectHelper40__2482 = func14_GetCurrent_Str();
					if ((((local17___SelectHelper40__2482) === ("FUNCTION")) ? 1 : 0)) {
						var local3_Typ_2483 = 0.0;
						if ((((local6_CurTyp_2456) === (-(1))) ? 1 : 0)) {
							local3_Typ_2483 = 1;
							
						} else {
							local3_Typ_2483 = 3;
							
						};
						func7_FuncDef(local8_isNative_2479, local10_isCallBack_2480, ~~(local3_Typ_2483), local6_CurTyp_2456);
						
					} else if ((((local17___SelectHelper40__2482) === ("PROTOTYPE")) ? 1 : 0)) {
						func7_FuncDef(0, 0, ~~(4), -(1));
						
					} else if ((((local17___SelectHelper40__2482) === ("SUB")) ? 1 : 0)) {
						func6_SubDef();
						
					} else if ((((local17___SelectHelper40__2482) === ("TYPE")) ? 1 : 0)) {
						func5_Match("TYPE", 270, "src\CompilerPasses\Analyser.gbas");
						if ((((func6_IsType("")) === (0)) ? 1 : 0)) {
							func5_Error((((("Internal error (unrecognized type: ") + (func14_GetCurrent_Str()))) + (")")), 271, "src\CompilerPasses\Analyser.gbas");
							
						};
						local6_CurTyp_2456 = global8_LastType.attr2_ID;
						
					} else if ((((local17___SelectHelper40__2482) === ("ENDTYPE")) ? 1 : 0)) {
						local6_CurTyp_2456 = -(1);
						
					} else if ((((local17___SelectHelper40__2482) === ("STARTDATA")) ? 1 : 0)) {
						var local8_Name_Str_2484 = "", local5_Datas_2485 = new OTTArray(), local5_dataB_2489 = new type10_TDataBlock();
						func5_Match("STARTDATA", 276, "src\CompilerPasses\Analyser.gbas");
						local8_Name_Str_2484 = func14_GetCurrent_Str();
						if ((((func14_IsValidVarName()) === (0)) ? 1 : 0)) {
							func5_Error("Invalid DATA name", 278, "src\CompilerPasses\Analyser.gbas");
							
						};
						func5_Match(local8_Name_Str_2484, 279, "src\CompilerPasses\Analyser.gbas");
						func5_Match(":", 280, "src\CompilerPasses\Analyser.gbas");
						func5_Match("\n", 281, "src\CompilerPasses\Analyser.gbas");
						while (func7_IsToken("DATA")) {
							var local4_Done_2486 = 0;
							func5_Match("DATA", 284, "src\CompilerPasses\Analyser.gbas");
							local4_Done_2486 = 0;
							while ((((func7_IsToken("\n")) === (0)) ? 1 : 0)) {
								var local1_e_2487 = 0.0, local7_tmpData_2488 = new type9_TDatatype();
								if ((((local4_Done_2486) === (1)) ? 1 : 0)) {
									func5_Match(",", 287, "src\CompilerPasses\Analyser.gbas");
									
								};
								local1_e_2487 = func10_Expression(0);
								local7_tmpData_2488 = global5_Exprs_ref[0].arrAccess(~~(local1_e_2487)).values[tmpPositionCache][0].attr8_datatype.clone();
								local7_tmpData_2488.attr7_IsArray = 0;
								func14_EnsureDatatype(~~(local1_e_2487), local7_tmpData_2488, 0, 0);
								if ((((((((((global5_Exprs_ref[0].arrAccess(~~(local1_e_2487)).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("int")) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(~~(local1_e_2487)).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("float")) ? 1 : 0))) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(~~(local1_e_2487)).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("string")) ? 1 : 0))) ? 1 : 0)) {
									
								} else {
									func5_Error((((("Must be primitive datatype (int, float or string), got '") + (global5_Exprs_ref[0].arrAccess(~~(local1_e_2487)).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) + ("'")), 295, "src\CompilerPasses\Analyser.gbas");
									
								};
								DIMPUSH(local5_Datas_2485, ~~(local1_e_2487));
								local4_Done_2486 = 1;
								
							};
							func5_Match("\n", 300, "src\CompilerPasses\Analyser.gbas");
							
						};
						func5_Match("ENDDATA", 302, "src\CompilerPasses\Analyser.gbas");
						local5_dataB_2489.attr8_Name_Str = local8_Name_Str_2484;
						local5_dataB_2489.attr5_Datas = local5_Datas_2485.clone();
						DIMPUSH(global8_Compiler.attr10_DataBlocks, local5_dataB_2489);
						
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
	var forEachSaver22136 = param3_typ.attr10_Attributes;
	for(var forEachCounter22136 = 0 ; forEachCounter22136 < forEachSaver22136.values.length ; forEachCounter22136++) {
		var local1_t_2493 = forEachSaver22136.values[forEachCounter22136];
	{
			if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_t_2493).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === (param8_Name_Str)) ? 1 : 0)) {
				func5_Error((((((((("Cyclic reference '") + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_t_2493).values[tmpPositionCache][0].attr8_Name_Str))) + ("' to type '"))) + (param8_Name_Str))) + ("'")), 322, "src\CompilerPasses\Analyser.gbas");
				
			} else if (func6_IsType(global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_t_2493).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str)) {
				func11_CheckCyclic(param8_Name_Str, global8_LastType);
				
			} else {
				
			};
			
		}
		forEachSaver22136.values[forEachCounter22136] = local1_t_2493;
	
	};
	return 0;
	
};
func11_CheckCyclic = window['func11_CheckCyclic'];
window['func10_ExtendType'] = function(param3_typ) {
	if ((((param3_typ.attr9_Extending) !== (-(1))) ? 1 : 0)) {
		var alias6_ExtTyp_ref_2495 = [new type15_TIdentifierType()], local6_tmpTyp_2496 = 0, local9_Abstracts_2497 = new OTTArray();
		func10_ExtendType(unref(global8_Compiler.attr5_Types_ref[0].arrAccess(param3_typ.attr9_Extending).values[tmpPositionCache][0]));
		alias6_ExtTyp_ref_2495 = global8_Compiler.attr5_Types_ref[0].arrAccess(param3_typ.attr9_Extending).values[tmpPositionCache] /* ALIAS */;
		local6_tmpTyp_2496 = alias6_ExtTyp_ref_2495[0].attr2_ID;
		while ((((local6_tmpTyp_2496) !== (-(1))) ? 1 : 0)) {
			var forEachSaver22204 = global8_Compiler.attr5_Types_ref[0].arrAccess(local6_tmpTyp_2496).values[tmpPositionCache][0].attr7_Methods;
			for(var forEachCounter22204 = 0 ; forEachCounter22204 < forEachSaver22204.values.length ; forEachCounter22204++) {
				var local1_M_2498 = forEachSaver22204.values[forEachCounter22204];
			{
					if (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local1_M_2498).values[tmpPositionCache][0].attr10_IsAbstract) {
						DIMPUSH(local9_Abstracts_2497, local1_M_2498);
						
					};
					
				}
				forEachSaver22204.values[forEachCounter22204] = local1_M_2498;
			
			};
			local6_tmpTyp_2496 = global8_Compiler.attr5_Types_ref[0].arrAccess(local6_tmpTyp_2496).values[tmpPositionCache][0].attr9_Extending;
			
		};
		var forEachSaver22308 = local9_Abstracts_2497;
		for(var forEachCounter22308 = 0 ; forEachCounter22308 < forEachSaver22308.values.length ; forEachCounter22308++) {
			var local2_Ab_2499 = forEachSaver22308.values[forEachCounter22308];
		{
				var local5_Found_2500 = 0;
				local5_Found_2500 = 0;
				local6_tmpTyp_2496 = alias6_ExtTyp_ref_2495[0].attr2_ID;
				while ((((local6_tmpTyp_2496) !== (-(1))) ? 1 : 0)) {
					var forEachSaver22281 = global8_Compiler.attr5_Types_ref[0].arrAccess(local6_tmpTyp_2496).values[tmpPositionCache][0].attr7_Methods;
					for(var forEachCounter22281 = 0 ; forEachCounter22281 < forEachSaver22281.values.length ; forEachCounter22281++) {
						var local1_M_2501 = forEachSaver22281.values[forEachCounter22281];
					{
							if (((((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local1_M_2501).values[tmpPositionCache][0].attr8_Name_Str) === (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local2_Ab_2499).values[tmpPositionCache][0].attr8_Name_Str)) ? 1 : 0)) && (((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local1_M_2501).values[tmpPositionCache][0].attr10_IsAbstract) ? 0 : 1))) ? 1 : 0)) {
								local5_Found_2500 = 1;
								break;
								
							};
							
						}
						forEachSaver22281.values[forEachCounter22281] = local1_M_2501;
					
					};
					if (local5_Found_2500) {
						break;
						
					};
					local6_tmpTyp_2496 = global8_Compiler.attr5_Types_ref[0].arrAccess(local6_tmpTyp_2496).values[tmpPositionCache][0].attr9_Extending;
					
				};
				if (((local5_Found_2500) ? 0 : 1)) {
					alias6_ExtTyp_ref_2495[0].attr10_Createable = 0;
					
				};
				
			}
			forEachSaver22308.values[forEachCounter22308] = local2_Ab_2499;
		
		};
		var forEachSaver22366 = alias6_ExtTyp_ref_2495[0].attr10_Attributes;
		for(var forEachCounter22366 = 0 ; forEachCounter22366 < forEachSaver22366.values.length ; forEachCounter22366++) {
			var local1_A_2502 = forEachSaver22366.values[forEachCounter22366];
		{
				var alias3_Att_ref_2503 = [new type15_TIdentifierVari()], local6_Exists_2504 = 0;
				alias3_Att_ref_2503 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_A_2502).values[tmpPositionCache] /* ALIAS */;
				local6_Exists_2504 = 0;
				var forEachSaver22354 = param3_typ.attr10_Attributes;
				for(var forEachCounter22354 = 0 ; forEachCounter22354 < forEachSaver22354.values.length ; forEachCounter22354++) {
					var local2_A2_2505 = forEachSaver22354.values[forEachCounter22354];
				{
						var alias4_Att2_ref_2506 = [new type15_TIdentifierVari()];
						alias4_Att2_ref_2506 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local2_A2_2505).values[tmpPositionCache] /* ALIAS */;
						if ((((alias3_Att_ref_2503[0].attr8_Name_Str) === (alias4_Att2_ref_2506[0].attr8_Name_Str)) ? 1 : 0)) {
							local6_Exists_2504 = 1;
							break;
							
						};
						
					}
					forEachSaver22354.values[forEachCounter22354] = local2_A2_2505;
				
				};
				if (((local6_Exists_2504) ? 0 : 1)) {
					DIMPUSH(param3_typ.attr10_Attributes, local1_A_2502);
					
				};
				
			}
			forEachSaver22366.values[forEachCounter22366] = local1_A_2502;
		
		};
		
	};
	return 0;
	
};
func10_ExtendType = window['func10_ExtendType'];
window['func12_LoadFile_Str'] = function(param8_Path_Str) {
	var local8_Text_Str_2508 = "", local4_File_2509 = 0;
	local4_File_2509 = GENFILE();
	if (OPENFILE(local4_File_2509, param8_Path_Str, 1)) {
		while ((((ENDOFFILE(local4_File_2509)) === (0)) ? 1 : 0)) {
			var local8_Line_Str_ref_2510 = [""];
			READLINE(local4_File_2509, local8_Line_Str_ref_2510);
			local8_Text_Str_2508 = ((((local8_Text_Str_2508) + (local8_Line_Str_ref_2510[0]))) + ("\n"));
			
		};
		CLOSEFILE(local4_File_2509);
		
	} else {
		func5_Error((("Cannot find file: ") + (param8_Path_Str)), 388, "src\Compiler.gbas");
		
	};
	return tryClone(local8_Text_Str_2508);
	return "";
	
};
func12_LoadFile_Str = window['func12_LoadFile_Str'];
window['func5_Error'] = function(param7_Msg_Str, param4_Line, param8_File_Str) {
	var local11_OrigMsg_Str_2514 = "", local3_tok_2515 = new type6_TToken();
	local11_OrigMsg_Str_2514 = param7_Msg_Str;
	local3_tok_2515 = func15_GetCurrentToken().clone();
	param7_Msg_Str = (((((("Error: '") + (REPLACE_Str(param7_Msg_Str, "\n", "NEWLINE")))) + (global8_Compiler.attr14_errorState_Str))) + ("'\n"));
	param7_Msg_Str = ((((((((((((((param7_Msg_Str) + ("in line '"))) + (CAST2STRING(local3_tok_2515.attr4_Line)))) + ("' at character '"))) + (CAST2STRING(local3_tok_2515.attr9_Character)))) + ("' near '"))) + (REPLACE_Str(local3_tok_2515.attr8_Text_Str, "\n", "NEWLINE")))) + ("'\n"));
	param7_Msg_Str = ((((((param7_Msg_Str) + ("in file '"))) + (local3_tok_2515.attr8_Path_Str))) + ("'\n"));
	param7_Msg_Str = ((((((param7_Msg_Str) + ("\t '"))) + (local3_tok_2515.attr15_LineContent_Str))) + ("'\n"));
	param7_Msg_Str = ((param7_Msg_Str) + ("-----------------------------------\n"));
	param7_Msg_Str = (("\n-----------------------------------\n") + (param7_Msg_Str));
	STDERR(param7_Msg_Str);
	global8_Compiler.attr8_WasError = 1;
	END();
	if (((global8_Compiler.attr13_FaultTolerant) ? 0 : 1)) {
		throw new OTTException((((("syntaxerror '") + (param7_Msg_Str))) + ("'")), "\src\Compiler.gbas", 420);
		
	} else {
		var local3_err_2516 = new type6_TError();
		local3_err_2516.attr5_token = local3_tok_2515.clone();
		local3_err_2516.attr7_Msg_Str = local11_OrigMsg_Str_2514;
		local3_err_2516.attr14_errorState_Str = global8_Compiler.attr14_errorState_Str;
		local3_err_2516.attr3_Typ = ~~(0);
		DIMPUSH(global8_Compiler.attr6_Errors, local3_err_2516);
		
	};
	return 0;
	
};
func5_Error = window['func5_Error'];
window['func7_Warning'] = function(param7_Msg_Str) {
	var local11_OrigMsg_Str_2518 = "", local3_tok_2519 = new type6_TToken(), local3_err_2520 = new type6_TError();
	local11_OrigMsg_Str_2518 = param7_Msg_Str;
	local3_tok_2519 = func15_GetCurrentToken().clone();
	param7_Msg_Str = (((("Warning: '") + (REPLACE_Str(param7_Msg_Str, "\n", "NEWLINE")))) + ("'\n"));
	param7_Msg_Str = ((((((((((((((param7_Msg_Str) + ("in line '"))) + (CAST2STRING(local3_tok_2519.attr4_Line)))) + ("' at character '"))) + (CAST2STRING(local3_tok_2519.attr9_Character)))) + ("' near '"))) + (REPLACE_Str(local3_tok_2519.attr8_Text_Str, "\n", "NEWLINE")))) + ("'\n"));
	param7_Msg_Str = ((((((param7_Msg_Str) + ("in file '"))) + (local3_tok_2519.attr8_Path_Str))) + ("'\n"));
	param7_Msg_Str = ((((((param7_Msg_Str) + ("\t '"))) + (local3_tok_2519.attr15_LineContent_Str))) + ("'\n"));
	param7_Msg_Str = ((param7_Msg_Str) + ("-----------------------------------\n"));
	param7_Msg_Str = (("\n-----------------------------------\n") + (param7_Msg_Str));
	STDOUT(param7_Msg_Str);
	local3_err_2520.attr5_token = local3_tok_2519.clone();
	local3_err_2520.attr7_Msg_Str = local11_OrigMsg_Str_2518;
	local3_err_2520.attr14_errorState_Str = global8_Compiler.attr14_errorState_Str;
	local3_err_2520.attr3_Typ = ~~(1);
	DIMPUSH(global8_Compiler.attr6_Errors, local3_err_2520);
	return 0;
	
};
func7_Warning = window['func7_Warning'];
window['func11_CreateToken'] = function(param8_Text_Str, param15_LineContent_Str, param4_Line, param9_Character, param8_Path_Str) {
	if (((((((((((((param8_Text_Str) !== ("\n")) ? 1 : 0)) && ((((TRIM_Str(param8_Text_Str, " \t\r\n\v\f")) === ("")) ? 1 : 0))) ? 1 : 0)) || ((((param8_Text_Str) === ("\t")) ? 1 : 0))) ? 1 : 0)) || ((((param8_Text_Str) === ("\r")) ? 1 : 0))) ? 1 : 0)) {
		
	} else {
		var local6_ascval_2526 = 0, local3_pos_2527 = 0.0;
		local6_ascval_2526 = ASC(param8_Text_Str, 0);
		if ((((((((((local6_ascval_2526) === (8)) ? 1 : 0)) || ((((local6_ascval_2526) === (12)) ? 1 : 0))) ? 1 : 0)) || ((((CAST2STRING(local6_ascval_2526)) === (global11_SHLASHF_Str)) ? 1 : 0))) ? 1 : 0)) {
			param8_Text_Str = "\n";
			
		};
		local3_pos_2527 = global8_Compiler.attr11_LastTokenID;
		global8_Compiler.attr11_LastTokenID = ((global8_Compiler.attr11_LastTokenID) + (1));
		if ((((global8_Compiler.attr11_LastTokenID) >= (((BOUNDS(global8_Compiler.attr6_Tokens, 0)) - (10)))) ? 1 : 0)) {
			REDIM(global8_Compiler.attr6_Tokens, [((global8_Compiler.attr11_LastTokenID) + (50))], new type6_TToken() );
			
		};
		global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2527)).values[tmpPositionCache].attr4_Line = param4_Line;
		global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2527)).values[tmpPositionCache].attr9_Character = param9_Character;
		global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2527)).values[tmpPositionCache].attr15_LineContent_Str = param15_LineContent_Str;
		global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2527)).values[tmpPositionCache].attr8_Path_Str = param8_Path_Str;
		global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2527)).values[tmpPositionCache].attr8_Text_Str = param8_Text_Str;
		if ((((LEFT_Str(global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2527)).values[tmpPositionCache].attr8_Text_Str, 1)) === ("@")) ? 1 : 0)) {
			global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2527)).values[tmpPositionCache].attr8_Text_Str = MID_Str(global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2527)).values[tmpPositionCache].attr8_Text_Str, 1, -(1));
			
		};
		
	};
	return tryClone(unref(new type6_TToken()));
	
};
func11_CreateToken = window['func11_CreateToken'];
window['func15_GetCurrentToken'] = function() {
	if ((((global8_Compiler.attr11_currentPosi) < (global8_Compiler.attr11_LastTokenID)) ? 1 : 0)) {
		return tryClone(global8_Compiler.attr6_Tokens.arrAccess(global8_Compiler.attr11_currentPosi).values[tmpPositionCache]);
		
	} else {
		var local1_t_2528 = new type6_TToken();
		return tryClone(local1_t_2528);
		
	};
	return tryClone(unref(new type6_TToken()));
	
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
	var local1_d_2537 = new type9_TDatatype();
	local1_d_2537.attr8_Name_Str = param8_Name_Str;
	local1_d_2537.attr7_IsArray = param7_IsArray;
	return tryClone(local1_d_2537);
	return tryClone(unref(new type9_TDatatype()));
	
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
	var local2_Op_ref_2543 = [new type9_TOperator()];
	local2_Op_ref_2543[0].attr8_Name_Str = param8_Name_Str;
	local2_Op_ref_2543[0].attr7_Sym_Str = param7_Sym_Str;
	local2_Op_ref_2543[0].attr4_Prio = param4_Prio;
	local2_Op_ref_2543[0].attr3_Typ = param3_Typ;
	local2_Op_ref_2543[0].attr2_ID = BOUNDS(global9_Operators_ref[0], 0);
	DIMPUSH(global9_Operators_ref[0], local2_Op_ref_2543);
	return 0;
	
};
func14_CreateOperator = window['func14_CreateOperator'];
window['func11_AddVariable'] = function(param4_Vari, param6_Ignore) {
	var local4_Vari_ref_2544 = [param4_Vari];
	if (((((((param6_Ignore) === (0)) ? 1 : 0)) && (func13_IsVarExisting(local4_Vari_ref_2544[0].attr8_Name_Str))) ? 1 : 0)) {
		func5_Error((((("Variable already exists, is a keyword or a type: '") + (local4_Vari_ref_2544[0].attr8_Name_Str))) + ("'")), 581, "src\Compiler.gbas");
		
	};
	local4_Vari_ref_2544[0].attr2_ID = BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0);
	local4_Vari_ref_2544[0].attr3_Tok = global8_Compiler.attr11_currentPosi;
	DIMPUSH(global8_Compiler.attr5_Varis_ref[0], local4_Vari_ref_2544);
	return 0;
	
};
func11_AddVariable = window['func11_AddVariable'];
window['func11_AddFunction'] = function(param4_Func) {
	var local4_Func_ref_2546 = [param4_Func];
	if (((((((local4_Func_ref_2546[0].attr3_Typ) !== (3)) ? 1 : 0)) && (func14_IsFuncExisting(local4_Func_ref_2546[0].attr8_Name_Str, local4_Func_ref_2546[0].attr10_IsCallback))) ? 1 : 0)) {
		func5_Error((((("Function already exists, is a keyword or a type: '") + (local4_Func_ref_2546[0].attr8_Name_Str))) + ("'")), 589, "src\Compiler.gbas");
		
	};
	local4_Func_ref_2546[0].attr2_ID = BOUNDS(global8_Compiler.attr5_Funcs_ref[0], 0);
	DIMPUSH(global8_Compiler.attr5_Funcs_ref[0], local4_Func_ref_2546);
	return 0;
	
};
func11_AddFunction = window['func11_AddFunction'];
window['InitCompiler'] = function() {
	var local13_newKeywordMap_1812 = new type7_HashMap();
	REDIM(global7_Defines, [0], new type7_TDefine() );
	global12_voidDatatype = func14_CreateDatatype("void", 0).clone();
	global11_intDatatype = func14_CreateDatatype("int", 0).clone();
	global13_floatDatatype = func14_CreateDatatype("float", 0).clone();
	global11_strDatatype = func14_CreateDatatype("string", 0).clone();
	global11_SHLASHF_Str = CHR_Str(INT2STR("\f"));
	REDIM(unref(global9_Operators_ref[0]), [0], [new type9_TOperator()] );
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
	global10_KeywordMap = local13_newKeywordMap_1812.clone();
	(global10_KeywordMap).SetSize(((BOUNDS(global12_Keywords_Str, 0)) * (8)));
	var forEachSaver2306 = global12_Keywords_Str;
	for(var forEachCounter2306 = 0 ; forEachCounter2306 < forEachSaver2306.values.length ; forEachCounter2306++) {
		var local7_key_Str_1813 = forEachSaver2306.values[forEachCounter2306];
	{
			(global10_KeywordMap).Put(local7_key_Str_1813, 1);
			
		}
		forEachSaver2306.values[forEachCounter2306] = local7_key_Str_1813;
	
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
	REDIM(global14_Documentations, [0], new type13_Documentation() );
	global8_Compiler.attr13_FaultTolerant = 0;
	REDIM(global8_Compiler.attr6_Errors, [0], new type6_TError() );
	return 0;
	
};
InitCompiler = window['InitCompiler'];
window['Compile_Str'] = function(param8_Text_Str, param10_Target_Str) {
	var local1_c_1816 = new type9_TCompiler(), local10_Output_Str_1817 = "";
	global8_Compiler = local1_c_1816.clone();
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
	local10_Output_Str_1817 = func12_DoTarget_Str(param10_Target_Str);
	func8_PopTimer("Target stuff");
	PassSuccessfull(6, ~~(6));
	if (global8_Compiler.attr8_WasError) {
		STDOUT("Generating failed :( \n");
		return "";
		
	} else {
		STDOUT((((("Generating successful to target ") + (param10_Target_Str))) + ("! \n")));
		
	};
	return tryClone(local10_Output_Str_1817);
	return "";
	
};
Compile_Str = window['Compile_Str'];
window['func16_ResetExpressions'] = function() {
	DIM(unref(global5_Exprs_ref[0]), [0], [new type5_TExpr()]);
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
	var local3_Def_1821 = new type7_TDefine();
	local3_Def_1821.attr7_Key_Str = param7_Key_Str;
	local3_Def_1821.attr9_Value_Str = param9_Value_Str;
	DIMPUSH(global7_Defines, local3_Def_1821);
	return 0;
	
};
RegisterDefine = window['RegisterDefine'];
window['func11_GenerateDoc'] = function() {
	func22_GenerateDocForLanguage("EN");
	func22_GenerateDocForLanguage("DE");
	return 0;
	
};
func11_GenerateDoc = window['func11_GenerateDoc'];
window['func22_GenerateDocForLanguage'] = function(param8_Lang_Str) {
	var local17_Documentation_Str_1823 = "", local11_JSONDoc_Str_1824 = "", local12_Glossary_Str_1825 = "";
	local17_Documentation_Str_1823 = "";
	local11_JSONDoc_Str_1824 = "";
	local12_Glossary_Str_1825 = "# Overview";
	var forEachSaver2849 = global14_Documentations;
	for(var forEachCounter2849 = 0 ; forEachCounter2849 < forEachSaver2849.values.length ; forEachCounter2849++) {
		var local6_module_1826 = forEachSaver2849.values[forEachCounter2849];
	{
			if ((((local6_module_1826.attr7_typ_Str) === ("MODULE")) ? 1 : 0)) {
				local12_Glossary_Str_1825+=(((((((("\n## [Module ") + (local6_module_1826.attr8_name_Str))) + ("] (#"))) + (local6_module_1826.attr8_name_Str))) + (")\n"));
				local17_Documentation_Str_1823+=(((("# ") + (local6_module_1826.attr8_name_Str))) + ("\n"));
				local17_Documentation_Str_1823+=((func18_DocLangElement_Str(unref(local6_module_1826.attr4_desc), param8_Lang_Str)) + ("\n"));
				var forEachSaver2847 = global14_Documentations;
				for(var forEachCounter2847 = 0 ; forEachCounter2847 < forEachSaver2847.values.length ; forEachCounter2847++) {
					var local1_D_1827 = forEachSaver2847.values[forEachCounter2847];
				{
						if ((((local1_D_1827.attr10_module_Str) === (local6_module_1826.attr8_name_Str)) ? 1 : 0)) {
							var local8_name_Str_1828 = "";
							local8_name_Str_1828 = local1_D_1827.attr8_name_Str;
							local17_Documentation_Str_1823+=(((("## ") + (local8_name_Str_1828))) + ("\n"));
							{
								var local16___SelectHelper1__1829 = "";
								local16___SelectHelper1__1829 = local1_D_1827.attr7_typ_Str;
								if ((((local16___SelectHelper1__1829) === ("FUNCTION")) ? 1 : 0)) {
									local12_Glossary_Str_1825+=(((((((("* [") + (local8_name_Str_1828))) + ("] ("))) + (local8_name_Str_1828))) + (")\n"));
									var forEachSaver2686 = global8_Compiler.attr5_Funcs_ref[0];
									for(var forEachCounter2686 = 0 ; forEachCounter2686 < forEachSaver2686.values.length ; forEachCounter2686++) {
										var local1_F_ref_1830 = forEachSaver2686.values[forEachCounter2686];
									{
											if ((((local1_F_ref_1830[0].attr9_OName_Str) === (local1_D_1827.attr8_name_Str)) ? 1 : 0)) {
												local17_Documentation_Str_1823+=((((">`") + (func20_GenerateFuncName_Str(unref(local1_F_ref_1830[0]))))) + ("`\n\n"));
												break;
												
											};
											
										}
										forEachSaver2686.values[forEachCounter2686] = local1_F_ref_1830;
									
									};
									if ((((BOUNDS(local1_D_1827.attr6_params, 0)) > (0)) ? 1 : 0)) {
										{
											var local16___SelectHelper2__1831 = "";
											local16___SelectHelper2__1831 = param8_Lang_Str;
											if ((((local16___SelectHelper2__1831) === ("EN")) ? 1 : 0)) {
												local17_Documentation_Str_1823+="Parameter | Description\n";
												
											} else if ((((local16___SelectHelper2__1831) === ("DE")) ? 1 : 0)) {
												local17_Documentation_Str_1823+="Parameter | Beschreibung\n";
												
											};
											
										};
										local17_Documentation_Str_1823+="-----------|-----------------------------------------------------------------------\n";
										var forEachSaver2743 = local1_D_1827.attr6_params;
										for(var forEachCounter2743 = 0 ; forEachCounter2743 < forEachSaver2743.values.length ; forEachCounter2743++) {
											var local1_P_1832 = forEachSaver2743.values[forEachCounter2743];
										{
												local17_Documentation_Str_1823+=(((("`") + (local1_P_1832.attr8_name_Str))) + ("`|"));
												local17_Documentation_Str_1823+=((func18_DocLangElement_Str(unref(local1_P_1832.attr4_desc), param8_Lang_Str)) + ("\n"));
												
											}
											forEachSaver2743.values[forEachCounter2743] = local1_P_1832;
										
										};
										
									};
									if ((((BOUNDS(local1_D_1827.attr7_example, 0)) > (0)) ? 1 : 0)) {
										local17_Documentation_Str_1823+=(((("```\n") + (func18_DocLangElement_Str(unref(local1_D_1827.attr7_example), param8_Lang_Str)))) + ("```\n"));
										
									};
									local17_Documentation_Str_1823+=(((("\n") + (func18_DocLangElement_Str(unref(local1_D_1827.attr4_desc), param8_Lang_Str)))) + ("\n"));
									if ((((BOUNDS(local1_D_1827.attr7_see_Str, 0)) > (0)) ? 1 : 0)) {
										var local5_first_1834 = 0;
										{
											var local16___SelectHelper3__1833 = "";
											local16___SelectHelper3__1833 = param8_Lang_Str;
											if ((((local16___SelectHelper3__1833) === ("EN")) ? 1 : 0)) {
												local17_Documentation_Str_1823+="See also: ";
												
											} else if ((((local16___SelectHelper3__1833) === ("DE")) ? 1 : 0)) {
												local17_Documentation_Str_1823+="Siehe auch: ";
												
											};
											
										};
										local5_first_1834 = 0;
										var forEachSaver2840 = local1_D_1827.attr7_see_Str;
										for(var forEachCounter2840 = 0 ; forEachCounter2840 < forEachSaver2840.values.length ; forEachCounter2840++) {
											var local5_s_Str_1835 = forEachSaver2840.values[forEachCounter2840];
										{
												if (local5_first_1834) {
													local17_Documentation_Str_1823+=", ";
													
												};
												local17_Documentation_Str_1823+=(((((((("[") + (local5_s_Str_1835))) + ("] (#"))) + (local5_s_Str_1835))) + (")"));
												local5_first_1834 = 1;
												
											}
											forEachSaver2840.values[forEachCounter2840] = local5_s_Str_1835;
										
										};
										local17_Documentation_Str_1823+="\n";
										
									};
									
								};
								
							};
							
						};
						
					}
					forEachSaver2847.values[forEachCounter2847] = local1_D_1827;
				
				};
				
			};
			
		}
		forEachSaver2849.values[forEachCounter2849] = local6_module_1826;
	
	};
	local17_Documentation_Str_1823 = ((((local12_Glossary_Str_1825) + ("\n"))) + (local17_Documentation_Str_1823));
	func9_WriteFile((((("Documentation_") + (param8_Lang_Str))) + (".md")), local17_Documentation_Str_1823);
	return 0;
	
};
func22_GenerateDocForLanguage = window['func22_GenerateDocForLanguage'];
window['func18_DocLangElement_Str'] = function(param5_Langs, param8_Lang_Str) {
	var local8_Text_Str_1838 = "";
	local8_Text_Str_1838 = "";
	var forEachSaver2891 = param5_Langs;
	for(var forEachCounter2891 = 0 ; forEachCounter2891 < forEachSaver2891.values.length ; forEachCounter2891++) {
		var local1_L_1839 = forEachSaver2891.values[forEachCounter2891];
	{
			if ((((local1_L_1839.attr8_lang_Str) === (param8_Lang_Str)) ? 1 : 0)) {
				local8_Text_Str_1838+=((local1_L_1839.attr8_desc_Str) + ("\n"));
				
			};
			
		}
		forEachSaver2891.values[forEachCounter2891] = local1_L_1839;
	
	};
	return tryClone(local8_Text_Str_1838);
	return "";
	
};
func18_DocLangElement_Str = window['func18_DocLangElement_Str'];
window['func20_GenerateFuncName_Str'] = function(param1_F) {
	return tryClone(global8_Compiler.attr6_Tokens.arrAccess(param1_F.attr6_DefTok).values[tmpPositionCache].attr15_LineContent_Str);
	return "";
	
};
func20_GenerateFuncName_Str = window['func20_GenerateFuncName_Str'];
window['func8_ParseDoc'] = function() {
	var local3_doc_2547 = new type13_Documentation(), local8_name_Str_2548 = "";
	local3_doc_2547.attr7_typ_Str = func14_GetCurrent_Str();
	if ((((((func7_IsToken("MODULE")) || (func7_IsToken("FUNCTION"))) ? 1 : 0)) ? 0 : 1)) {
		func5_Error("Unknown ?DOC", 132, "src\DocParser.gbas");
		
	};
	local8_name_Str_2548 = "";
	do {
		func13_RemoveCurrent();
		if ((((local8_name_Str_2548) !== ("")) ? 1 : 0)) {
			local8_name_Str_2548 = ((local8_name_Str_2548) + ("."));
			
		};
		local8_name_Str_2548 = ((local8_name_Str_2548) + (func14_GetCurrent_Str()));
		func13_RemoveCurrent();
		
	} while (!(((func7_IsToken(".")) ? 0 : 1)));
	local3_doc_2547.attr8_name_Str = local8_name_Str_2548;
	func11_RemoveAllNL();
	while ((((func8_EOFParse()) === (1)) ? 1 : 0)) {
		func14_MatchAndRemove("?", 145, "src\DocParser.gbas");
		{
			var local17___SelectHelper41__2549 = "";
			local17___SelectHelper41__2549 = func14_GetCurrent_Str();
			if ((((local17___SelectHelper41__2549) === ("PARAM")) ? 1 : 0)) {
				var local5_param_2550 = new type12_ParamElement();
				func13_RemoveCurrent();
				local5_param_2550.attr8_name_Str = func14_GetCurrent_Str();
				func13_RemoveCurrent();
				func14_MatchAndRemove("\n", 152, "src\DocParser.gbas");
				func12_ParseDocLang(unref(local5_param_2550.attr4_desc), "ENDPARAM");
				DIMPUSH(local3_doc_2547.attr6_params, local5_param_2550);
				
			} else if ((((local17___SelectHelper41__2549) === ("DESC")) ? 1 : 0)) {
				func13_RemoveCurrent();
				func14_MatchAndRemove("\n", 159, "src\DocParser.gbas");
				func12_ParseDocLang(unref(local3_doc_2547.attr4_desc), "ENDDESC");
				
			} else if ((((local17___SelectHelper41__2549) === ("EXAMPLE")) ? 1 : 0)) {
				func13_RemoveCurrent();
				func14_MatchAndRemove("\n", 164, "src\DocParser.gbas");
				func12_ParseDocLang(unref(local3_doc_2547.attr7_example), "ENDEXAMPLE");
				
			} else if ((((local17___SelectHelper41__2549) === ("SEE")) ? 1 : 0)) {
				func13_RemoveCurrent();
				do {
					DIMPUSH(local3_doc_2547.attr7_see_Str, func14_GetCurrent_Str());
					func13_RemoveCurrent();
					
				} while (!(func7_IsToken("\n")));
				
			} else if ((((local17___SelectHelper41__2549) === ("MODULE")) ? 1 : 0)) {
				func13_RemoveCurrent();
				local3_doc_2547.attr10_module_Str = func14_GetCurrent_Str();
				func13_RemoveCurrent();
				func14_MatchAndRemove("\n", 178, "src\DocParser.gbas");
				
			} else if ((((local17___SelectHelper41__2549) === ("ENDDOC")) ? 1 : 0)) {
				func13_RemoveCurrent();
				break;
				
			};
			
		};
		func11_RemoveAllNL();
		
	};
	DIMPUSH(global14_Documentations, local3_doc_2547);
	return 0;
	
};
func8_ParseDoc = window['func8_ParseDoc'];
window['func12_ParseDocLang'] = function(param5_langs, param12_endToken_Str) {
	while (func7_IsToken("?")) {
		var local1_l_2553 = new type11_LangElement(), local8_lang_Str_2554 = "", local8_text_Str_2555 = "";
		func13_RemoveCurrent();
		if (func7_IsToken(param12_endToken_Str)) {
			func13_RemoveCurrent();
			return 0;
			
		};
		func14_MatchAndRemove("LANG", 198, "src\DocParser.gbas");
		local8_lang_Str_2554 = func14_GetCurrent_Str();
		func13_RemoveCurrent();
		local8_text_Str_2555 = MID_Str(func14_GetCurrent_Str(), 1, (((func14_GetCurrent_Str()).length) - (2)));
		func13_RemoveCurrent();
		local1_l_2553.attr8_lang_Str = local8_lang_Str_2554;
		local1_l_2553.attr8_desc_Str = REPLACE_Str(local8_text_Str_2555, (("\\") + ("\"")), "\"");
		DIMPUSH(param5_langs, local1_l_2553);
		func11_RemoveAllNL();
		
	};
	if ((((BOUNDS(param5_langs, 0)) === (1)) ? 1 : 0)) {
		var local2_l2_2556 = new type11_LangElement();
		local2_l2_2556 = param5_langs.arrAccess(0).values[tmpPositionCache].clone();
		if ((((local2_l2_2556.attr8_lang_Str) === ("EN")) ? 1 : 0)) {
			local2_l2_2556.attr8_lang_Str = "DE";
			
		} else {
			local2_l2_2556.attr8_lang_Str = "EN";
			
		};
		DIMPUSH(param5_langs, local2_l2_2556);
		
	};
	return 0;
	
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
	var local4_tmpD_2559 = new type9_TDatatype(), local3_pos_2560 = 0.0, local1_d_2561 = new type9_TDatatype();
	local4_tmpD_2559 = param8_datatype.clone();
	local3_pos_2560 = global10_LastExprID;
	global10_LastExprID = ((global10_LastExprID) + (1));
	if ((((global10_LastExprID) >= (((BOUNDS(global5_Exprs_ref[0], 0)) - (10)))) ? 1 : 0)) {
		REDIM(unref(global5_Exprs_ref[0]), [~~(((global10_LastExprID) + (50)))], [new type5_TExpr()] );
		
	};
	global5_Exprs_ref[0].arrAccess(~~(local3_pos_2560)).values[tmpPositionCache][0].attr3_Typ = param3_Typ;
	local1_d_2561.attr8_Name_Str = local4_tmpD_2559.attr8_Name_Str;
	local1_d_2561.attr7_IsArray = local4_tmpD_2559.attr7_IsArray;
	global5_Exprs_ref[0].arrAccess(~~(local3_pos_2560)).values[tmpPositionCache][0].attr8_datatype = local1_d_2561.clone();
	global5_Exprs_ref[0].arrAccess(~~(local3_pos_2560)).values[tmpPositionCache][0].attr2_ID = ~~(local3_pos_2560);
	global5_Exprs_ref[0].arrAccess(~~(local3_pos_2560)).values[tmpPositionCache][0].attr5_tokID = global8_Compiler.attr11_currentPosi;
	return tryClone(~~(local3_pos_2560));
	return 0;
	
};
func16_CreateExpression = window['func16_CreateExpression'];
window['func24_CreateOperatorExpression'] = function(param2_Op, param4_Left, param5_Right) {
	var local4_Expr_2565 = 0, local8_datatype_2566 = new type9_TDatatype();
	var local4_Left_ref_2563 = [param4_Left];
	var local5_Right_ref_2564 = [param5_Right];
	local8_datatype_2566 = func12_CastDatatype(local4_Left_ref_2563, local5_Right_ref_2564).clone();
	if ((((param2_Op.attr3_Typ) === (3)) ? 1 : 0)) {
		local8_datatype_2566 = global11_intDatatype.clone();
		
	};
	local4_Expr_2565 = func16_CreateExpression(~~(1), local8_datatype_2566);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2565).values[tmpPositionCache][0].attr4_Left = local4_Left_ref_2563[0];
	global5_Exprs_ref[0].arrAccess(local4_Expr_2565).values[tmpPositionCache][0].attr5_Right = local5_Right_ref_2564[0];
	global5_Exprs_ref[0].arrAccess(local4_Expr_2565).values[tmpPositionCache][0].attr2_Op = param2_Op.attr2_ID;
	return tryClone(local4_Expr_2565);
	return 0;
	
};
func24_CreateOperatorExpression = window['func24_CreateOperatorExpression'];
window['func19_CreateIntExpression'] = function(param3_Num) {
	var local4_Expr_2568 = 0;
	local4_Expr_2568 = func16_CreateExpression(~~(3), global11_intDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2568).values[tmpPositionCache][0].attr6_intval = param3_Num;
	return tryClone(local4_Expr_2568);
	return 0;
	
};
func19_CreateIntExpression = window['func19_CreateIntExpression'];
window['func21_CreateFloatExpression'] = function(param3_Num) {
	var local4_Expr_2570 = 0;
	local4_Expr_2570 = func16_CreateExpression(~~(4), global13_floatDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2570).values[tmpPositionCache][0].attr8_floatval = param3_Num;
	return tryClone(local4_Expr_2570);
	return 0;
	
};
func21_CreateFloatExpression = window['func21_CreateFloatExpression'];
window['func19_CreateStrExpression'] = function(param7_Str_Str) {
	var local4_Expr_2572 = 0;
	local4_Expr_2572 = func16_CreateExpression(~~(5), global11_strDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2572).values[tmpPositionCache][0].attr10_strval_Str = param7_Str_Str;
	return tryClone(local4_Expr_2572);
	return 0;
	
};
func19_CreateStrExpression = window['func19_CreateStrExpression'];
window['func21_CreateScopeExpression'] = function(param6_ScpTyp) {
	var local3_Scp_2574 = 0;
	local3_Scp_2574 = func16_CreateExpression(~~(2), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local3_Scp_2574).values[tmpPositionCache][0].attr10_SuperScope = global8_Compiler.attr12_CurrentScope;
	global5_Exprs_ref[0].arrAccess(local3_Scp_2574).values[tmpPositionCache][0].attr6_ScpTyp = param6_ScpTyp;
	return tryClone(local3_Scp_2574);
	return 0;
	
};
func21_CreateScopeExpression = window['func21_CreateScopeExpression'];
window['func24_CreateFuncCallExpression'] = function(param4_func, param6_Params) {
	var local4_Expr_2577 = 0;
	local4_Expr_2577 = func16_CreateExpression(~~(6), global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr8_datatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2577).values[tmpPositionCache][0].attr6_Params = param6_Params.clone();
	global5_Exprs_ref[0].arrAccess(local4_Expr_2577).values[tmpPositionCache][0].attr4_func = param4_func;
	return tryClone(local4_Expr_2577);
	return 0;
	
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
		var local4_Expr_2579 = 0;
		local4_Expr_2579 = func16_CreateExpression(~~(9), global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_vari).values[tmpPositionCache][0].attr8_datatype);
		global5_Exprs_ref[0].arrAccess(local4_Expr_2579).values[tmpPositionCache][0].attr4_vari = param4_vari;
		return tryClone(local4_Expr_2579);
		
	};
	return 0;
	
};
func24_CreateVariableExpression = window['func24_CreateVariableExpression'];
window['func22_CreateAssignExpression'] = function(param4_Vari, param5_Right) {
	var local4_Expr_2582 = 0;
	local4_Expr_2582 = func16_CreateExpression(~~(10), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2582).values[tmpPositionCache][0].attr4_vari = param4_Vari;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2582).values[tmpPositionCache][0].attr5_Right = param5_Right;
	return tryClone(local4_Expr_2582);
	return 0;
	
};
func22_CreateAssignExpression = window['func22_CreateAssignExpression'];
window['func19_CreateDimExpression'] = function(param5_Array, param4_Dims) {
	var local4_Expr_2585 = 0;
	local4_Expr_2585 = func16_CreateExpression(~~(11), global5_Exprs_ref[0].arrAccess(param5_Array).values[tmpPositionCache][0].attr8_datatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2585).values[tmpPositionCache][0].attr5_array = param5_Array;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2585).values[tmpPositionCache][0].attr4_dims = param4_Dims.clone();
	return tryClone(local4_Expr_2585);
	return 0;
	
};
func19_CreateDimExpression = window['func19_CreateDimExpression'];
window['func21_CreateReDimExpression'] = function(param5_Array, param4_Dims) {
	var local4_Expr_2588 = 0;
	local4_Expr_2588 = func16_CreateExpression(~~(12), global5_Exprs_ref[0].arrAccess(param5_Array).values[tmpPositionCache][0].attr8_datatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2588).values[tmpPositionCache][0].attr5_array = param5_Array;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2588).values[tmpPositionCache][0].attr4_dims = param4_Dims.clone();
	return tryClone(local4_Expr_2588);
	return 0;
	
};
func21_CreateReDimExpression = window['func21_CreateReDimExpression'];
window['func21_CreateArrayExpression'] = function(param5_Array, param4_Dims) {
	var local7_tmpData_2591 = new type9_TDatatype(), local4_Expr_2592 = 0;
	local7_tmpData_2591 = global5_Exprs_ref[0].arrAccess(param5_Array).values[tmpPositionCache][0].attr8_datatype.clone();
	if (((((((global5_Exprs_ref[0].arrAccess(param5_Array).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) && (global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(param5_Array, 1)).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray)) ? 1 : 0)) && (BOUNDS(param4_Dims, 0))) ? 1 : 0)) {
		local7_tmpData_2591.attr7_IsArray = 0;
		
	};
	local4_Expr_2592 = func16_CreateExpression(~~(13), local7_tmpData_2591);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2592).values[tmpPositionCache][0].attr5_array = param5_Array;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2592).values[tmpPositionCache][0].attr4_dims = param4_Dims.clone();
	return tryClone(local4_Expr_2592);
	return 0;
	
};
func21_CreateArrayExpression = window['func21_CreateArrayExpression'];
window['func24_CreateCast2IntExpression'] = function(param4_expr) {
	var local4_Expr_2761 = 0;
	local4_Expr_2761 = func16_CreateExpression(~~(15), global11_intDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2761).values[tmpPositionCache][0].attr4_expr = param4_expr;
	return tryClone(local4_Expr_2761);
	return 0;
	
};
func24_CreateCast2IntExpression = window['func24_CreateCast2IntExpression'];
window['func26_CreateCast2FloatExpression'] = function(param4_expr) {
	var local4_Expr_2763 = 0;
	local4_Expr_2763 = func16_CreateExpression(~~(16), global13_floatDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2763).values[tmpPositionCache][0].attr4_expr = param4_expr;
	return tryClone(local4_Expr_2763);
	return 0;
	
};
func26_CreateCast2FloatExpression = window['func26_CreateCast2FloatExpression'];
window['func27_CreateCast2StringExpression'] = function(param4_expr) {
	var local4_Expr_2765 = 0;
	local4_Expr_2765 = func16_CreateExpression(~~(17), global11_strDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2765).values[tmpPositionCache][0].attr4_expr = param4_expr;
	return tryClone(local4_Expr_2765);
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
		var local9_ONextExpr_2595 = 0;
		local9_ONextExpr_2595 = param8_NextExpr;
		if ((((global5_Exprs_ref[0].arrAccess(param8_NextExpr).values[tmpPositionCache][0].attr3_Typ) === (13)) ? 1 : 0)) {
			param8_NextExpr = global5_Exprs_ref[0].arrAccess(param8_NextExpr).values[tmpPositionCache][0].attr5_array;
			
		};
		if ((((global5_Exprs_ref[0].arrAccess(param8_NextExpr).values[tmpPositionCache][0].attr3_Typ) === (6)) ? 1 : 0)) {
			DIMPUSH(global5_Exprs_ref[0].arrAccess(param8_NextExpr).values[tmpPositionCache][0].attr6_Params, param4_expr);
			return tryClone(local9_ONextExpr_2595);
			
		} else {
			var local4_Expr_2596 = 0;
			param8_NextExpr = local9_ONextExpr_2595;
			local4_Expr_2596 = func16_CreateExpression(~~(18), global5_Exprs_ref[0].arrAccess(param8_NextExpr).values[tmpPositionCache][0].attr8_datatype);
			global5_Exprs_ref[0].arrAccess(local4_Expr_2596).values[tmpPositionCache][0].attr4_expr = param4_expr;
			global5_Exprs_ref[0].arrAccess(local4_Expr_2596).values[tmpPositionCache][0].attr8_nextExpr = param8_NextExpr;
			return tryClone(local4_Expr_2596);
			
		};
		
	};
	return 0;
	
};
func22_CreateAccessExpression = window['func22_CreateAccessExpression'];
window['func22_CreateReturnExpression'] = function(param4_expr) {
	var local4_Expr_2598 = 0;
	local4_Expr_2598 = func16_CreateExpression(~~(19), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2598).values[tmpPositionCache][0].attr4_expr = param4_expr;
	return tryClone(local4_Expr_2598);
	return 0;
	
};
func22_CreateReturnExpression = window['func22_CreateReturnExpression'];
window['func20_CreateGotoExpression'] = function(param8_Name_Str) {
	var local4_Expr_2600 = 0;
	local4_Expr_2600 = func16_CreateExpression(~~(20), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2600).values[tmpPositionCache][0].attr8_Name_Str = param8_Name_Str;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2600).values[tmpPositionCache][0].attr3_Scp = global8_Compiler.attr12_CurrentScope;
	return tryClone(local4_Expr_2600);
	return 0;
	
};
func20_CreateGotoExpression = window['func20_CreateGotoExpression'];
window['func21_CreateLabelExpression'] = function(param8_Name_Str) {
	var local4_Expr_2602 = 0;
	local4_Expr_2602 = func16_CreateExpression(~~(21), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2602).values[tmpPositionCache][0].attr8_Name_Str = param8_Name_Str;
	return tryClone(local4_Expr_2602);
	return 0;
	
};
func21_CreateLabelExpression = window['func21_CreateLabelExpression'];
window['func24_CreateFuncDataExpression'] = function(param1_d) {
	return tryClone(func16_CreateExpression(~~(22), param1_d));
	return 0;
	
};
func24_CreateFuncDataExpression = window['func24_CreateFuncDataExpression'];
window['func25_CreateProtoCallExpression'] = function(param4_expr, param6_Params) {
	var local4_Func_2606 = 0, local4_Expr_2607 = 0;
	local4_Func_2606 = func14_SearchPrototyp(global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str);
	if ((((local4_Func_2606) === (-(1))) ? 1 : 0)) {
		func5_Error((((("Internal error (could not find prototype: ") + (global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) + (")")), 399, "src\Expression.gbas");
		
	};
	local4_Expr_2607 = func16_CreateExpression(~~(23), global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr8_datatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2607).values[tmpPositionCache][0].attr4_expr = param4_expr;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2607).values[tmpPositionCache][0].attr6_Params = param6_Params.clone();
	global5_Exprs_ref[0].arrAccess(local4_Expr_2607).values[tmpPositionCache][0].attr4_func = local4_Func_2606;
	return tryClone(local4_Expr_2607);
	return 0;
	
};
func25_CreateProtoCallExpression = window['func25_CreateProtoCallExpression'];
window['func18_CreateIfExpression'] = function(param5_Conds, param4_Scps, param7_elseScp) {
	var local4_Expr_2611 = 0;
	local4_Expr_2611 = func16_CreateExpression(~~(24), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2611).values[tmpPositionCache][0].attr10_Conditions = param5_Conds.clone();
	global5_Exprs_ref[0].arrAccess(local4_Expr_2611).values[tmpPositionCache][0].attr6_Scopes = param4_Scps.clone();
	global5_Exprs_ref[0].arrAccess(local4_Expr_2611).values[tmpPositionCache][0].attr9_elseScope = param7_elseScp;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2611).values[tmpPositionCache][0].attr5_dummy = func21_CreateDummyExpression();
	return tryClone(local4_Expr_2611);
	return 0;
	
};
func18_CreateIfExpression = window['func18_CreateIfExpression'];
window['func21_CreateWhileExpression'] = function(param4_expr, param3_Scp) {
	var local4_Expr_2614 = 0;
	local4_Expr_2614 = func16_CreateExpression(~~(25), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2614).values[tmpPositionCache][0].attr4_expr = param4_expr;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2614).values[tmpPositionCache][0].attr3_Scp = param3_Scp;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2614).values[tmpPositionCache][0].attr5_dummy = func21_CreateDummyExpression();
	return tryClone(local4_Expr_2614);
	return 0;
	
};
func21_CreateWhileExpression = window['func21_CreateWhileExpression'];
window['func22_CreateRepeatExpression'] = function(param4_expr, param3_Scp) {
	var local4_Expr_2617 = 0;
	local4_Expr_2617 = func16_CreateExpression(~~(26), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2617).values[tmpPositionCache][0].attr4_expr = param4_expr;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2617).values[tmpPositionCache][0].attr3_Scp = param3_Scp;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2617).values[tmpPositionCache][0].attr5_dummy = func21_CreateDummyExpression();
	return tryClone(local4_Expr_2617);
	return 0;
	
};
func22_CreateRepeatExpression = window['func22_CreateRepeatExpression'];
window['func19_CreateForExpression'] = function(param7_varExpr, param6_toExpr, param8_stepExpr, param5_hasTo, param3_Scp) {
	var local4_Expr_2623 = 0;
	local4_Expr_2623 = func16_CreateExpression(~~(27), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2623).values[tmpPositionCache][0].attr7_varExpr = param7_varExpr;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2623).values[tmpPositionCache][0].attr6_toExpr = param6_toExpr;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2623).values[tmpPositionCache][0].attr8_stepExpr = param8_stepExpr;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2623).values[tmpPositionCache][0].attr3_Scp = param3_Scp;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2623).values[tmpPositionCache][0].attr5_hasTo = param5_hasTo;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2623).values[tmpPositionCache][0].attr5_dummy = func21_CreateDummyExpression();
	return tryClone(local4_Expr_2623);
	return 0;
	
};
func19_CreateForExpression = window['func19_CreateForExpression'];
window['func23_CreateForEachExpression'] = function(param7_varExpr, param6_inExpr, param3_Scp) {
	var local4_Expr_2627 = 0;
	local4_Expr_2627 = func16_CreateExpression(~~(38), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2627).values[tmpPositionCache][0].attr7_varExpr = param7_varExpr;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2627).values[tmpPositionCache][0].attr6_inExpr = param6_inExpr;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2627).values[tmpPositionCache][0].attr3_Scp = param3_Scp;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2627).values[tmpPositionCache][0].attr5_dummy = func21_CreateDummyExpression();
	return tryClone(local4_Expr_2627);
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
	var local4_Expr_2631 = 0;
	local4_Expr_2631 = func16_CreateExpression(~~(31), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2631).values[tmpPositionCache][0].attr3_Scp = param6_tryScp;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2631).values[tmpPositionCache][0].attr8_catchScp = param7_ctchScp;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2631).values[tmpPositionCache][0].attr4_vari = param4_vari;
	return tryClone(local4_Expr_2631);
	return 0;
	
};
func19_CreateTryExpression = window['func19_CreateTryExpression'];
window['func21_CreateThrowExpression'] = function(param5_value) {
	var local4_Expr_2633 = 0;
	local4_Expr_2633 = func16_CreateExpression(~~(32), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2633).values[tmpPositionCache][0].attr4_expr = param5_value;
	return tryClone(local4_Expr_2633);
	return 0;
	
};
func21_CreateThrowExpression = window['func21_CreateThrowExpression'];
window['func23_CreateRestoreExpression'] = function(param8_Name_Str) {
	var local4_Expr_2635 = 0;
	local4_Expr_2635 = func16_CreateExpression(~~(33), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2635).values[tmpPositionCache][0].attr8_Name_Str = param8_Name_Str;
	return tryClone(local4_Expr_2635);
	return 0;
	
};
func23_CreateRestoreExpression = window['func23_CreateRestoreExpression'];
window['func20_CreateReadExpression'] = function(param5_Reads) {
	var local4_Expr_2637 = 0;
	local4_Expr_2637 = func16_CreateExpression(~~(34), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2637).values[tmpPositionCache][0].attr5_Reads = param5_Reads.clone();
	return tryClone(local4_Expr_2637);
	return 0;
	
};
func20_CreateReadExpression = window['func20_CreateReadExpression'];
window['func28_CreateDefaultValueExpression'] = function(param8_datatype) {
	if (param8_datatype.attr7_IsArray) {
		return tryClone(func16_CreateExpression(~~(35), param8_datatype));
		
	} else {
		{
			var local17___SelectHelper42__2639 = "";
			local17___SelectHelper42__2639 = param8_datatype.attr8_Name_Str;
			if ((((local17___SelectHelper42__2639) === ("int")) ? 1 : 0)) {
				return tryClone(func19_CreateIntExpression(0));
				
			} else if ((((local17___SelectHelper42__2639) === ("float")) ? 1 : 0)) {
				return tryClone(func21_CreateFloatExpression(0));
				
			} else if ((((local17___SelectHelper42__2639) === ("string")) ? 1 : 0)) {
				return tryClone(func19_CreateStrExpression("\"\""));
				
			} else if ((((local17___SelectHelper42__2639) === ("void")) ? 1 : 0)) {
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
	var local4_Expr_2768 = 0;
	local4_Expr_2768 = func16_CreateExpression(~~(36), param8_datatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2768).values[tmpPositionCache][0].attr4_dims = param4_dims.clone();
	return tryClone(local4_Expr_2768);
	return 0;
	
};
func25_CreateDimAsExprExpression = window['func25_CreateDimAsExprExpression'];
window['func21_CreateAliasExpression'] = function(param4_vari, param4_expr) {
	var local4_Expr_2642 = 0;
	local4_Expr_2642 = func16_CreateExpression(~~(37), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2642).values[tmpPositionCache][0].attr4_vari = param4_vari;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2642).values[tmpPositionCache][0].attr4_expr = param4_expr;
	return tryClone(local4_Expr_2642);
	return 0;
	
};
func21_CreateAliasExpression = window['func21_CreateAliasExpression'];
window['func19_CreateIncExpression'] = function(param4_Vari, param7_AddExpr) {
	var local4_Expr_2645 = 0;
	local4_Expr_2645 = func16_CreateExpression(~~(39), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2645).values[tmpPositionCache][0].attr4_vari = param4_Vari;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2645).values[tmpPositionCache][0].attr4_expr = param7_AddExpr;
	return tryClone(local4_Expr_2645);
	return 0;
	
};
func19_CreateIncExpression = window['func19_CreateIncExpression'];
window['func23_CreateDimpushExpression'] = function(param4_vari, param4_expr) {
	var local4_Expr_2648 = 0;
	local4_Expr_2648 = func16_CreateExpression(~~(40), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2648).values[tmpPositionCache][0].attr4_vari = param4_vari;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2648).values[tmpPositionCache][0].attr4_expr = param4_expr;
	return tryClone(local4_Expr_2648);
	return 0;
	
};
func23_CreateDimpushExpression = window['func23_CreateDimpushExpression'];
window['func19_CreateLenExpression'] = function(param4_expr, param4_kern) {
	var local4_Expr_2771 = 0;
	local4_Expr_2771 = func16_CreateExpression(~~(41), global11_intDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2771).values[tmpPositionCache][0].attr4_expr = param4_expr;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2771).values[tmpPositionCache][0].attr4_kern = param4_kern;
	return tryClone(local4_Expr_2771);
	return 0;
	
};
func19_CreateLenExpression = window['func19_CreateLenExpression'];
window['func23_CreateDimDataExpression'] = function(param5_array, param5_exprs) {
	var local4_Expr_2651 = 0;
	local4_Expr_2651 = func16_CreateExpression(~~(42), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2651).values[tmpPositionCache][0].attr5_array = param5_array;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2651).values[tmpPositionCache][0].attr5_Exprs = param5_exprs.clone();
	return tryClone(local4_Expr_2651);
	return 0;
	
};
func23_CreateDimDataExpression = window['func23_CreateDimDataExpression'];
window['func22_CreateDeleteExpression'] = function() {
	return tryClone(func16_CreateExpression(~~(43), global12_voidDatatype));
	return 0;
	
};
func22_CreateDeleteExpression = window['func22_CreateDeleteExpression'];
window['func22_CreateDimDelExpression'] = function(param5_array, param8_position) {
	var local4_Expr_2654 = 0;
	local4_Expr_2654 = func16_CreateExpression(~~(44), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2654).values[tmpPositionCache][0].attr5_array = param5_array;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2654).values[tmpPositionCache][0].attr8_position = param8_position;
	return tryClone(local4_Expr_2654);
	return 0;
	
};
func22_CreateDimDelExpression = window['func22_CreateDimDelExpression'];
window['func21_CreateBoundExpression'] = function(param4_expr, param8_position) {
	var local4_Expr_2774 = 0;
	local4_Expr_2774 = func16_CreateExpression(~~(45), global11_intDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2774).values[tmpPositionCache][0].attr5_array = param4_expr;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2774).values[tmpPositionCache][0].attr8_position = param8_position;
	return tryClone(local4_Expr_2774);
	return 0;
	
};
func21_CreateBoundExpression = window['func21_CreateBoundExpression'];
window['func19_CreateNotExpression'] = function(param4_expr) {
	var local4_Expr_2776 = 0;
	local4_Expr_2776 = func16_CreateExpression(~~(46), global13_floatDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2776).values[tmpPositionCache][0].attr4_expr = param4_expr;
	return tryClone(local4_Expr_2776);
	return 0;
	
};
func19_CreateNotExpression = window['func19_CreateNotExpression'];
window['func21_CreateDummyExpression'] = function() {
	return 0;
	return 0;
	
};
func21_CreateDummyExpression = window['func21_CreateDummyExpression'];
window['func25_CreateAddressOfExpression'] = function(param4_func) {
	var local4_Expr_2778 = 0;
	local4_Expr_2778 = func16_CreateExpression(~~(48), global11_intDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2778).values[tmpPositionCache][0].attr4_func = param4_func;
	return tryClone(local4_Expr_2778);
	return 0;
	
};
func25_CreateAddressOfExpression = window['func25_CreateAddressOfExpression'];
window['func22_CreateAssertExpression'] = function(param4_expr) {
	var local4_Expr_2656 = 0;
	local4_Expr_2656 = func16_CreateExpression(~~(49), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2656).values[tmpPositionCache][0].attr4_expr = param4_expr;
	return tryClone(local4_Expr_2656);
	return 0;
	
};
func22_CreateAssertExpression = window['func22_CreateAssertExpression'];
window['func27_CreateDebugOutputExpression'] = function(param4_expr) {
	var local4_Expr_2658 = 0;
	local4_Expr_2658 = func16_CreateExpression(~~(50), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2658).values[tmpPositionCache][0].attr4_expr = param4_expr;
	return tryClone(local4_Expr_2658);
	return 0;
	
};
func27_CreateDebugOutputExpression = window['func27_CreateDebugOutputExpression'];
window['func19_CreateIIFExpression'] = function(param4_Cond, param6_onTrue, param7_onFalse) {
	var local4_Expr_2782 = 0;
	local4_Expr_2782 = func16_CreateExpression(~~(51), global5_Exprs_ref[0].arrAccess(param6_onTrue).values[tmpPositionCache][0].attr8_datatype);
	DIMDATA(global5_Exprs_ref[0].arrAccess(local4_Expr_2782).values[tmpPositionCache][0].attr10_Conditions, [param4_Cond]);
	DIMDATA(global5_Exprs_ref[0].arrAccess(local4_Expr_2782).values[tmpPositionCache][0].attr6_Scopes, [param6_onTrue]);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2782).values[tmpPositionCache][0].attr9_elseScope = param7_onFalse;
	return tryClone(local4_Expr_2782);
	return 0;
	
};
func19_CreateIIFExpression = window['func19_CreateIIFExpression'];
window['func23_CreateRequireExpression'] = function(param8_Path_Str) {
	var local4_Expr_2660 = 0;
	local4_Expr_2660 = func16_CreateExpression(~~(52), global12_voidDatatype);
	if ((((REVINSTR(param8_Path_Str, ".", -(1))) !== (-(1))) ? 1 : 0)) {
		{
			var local17___SelectHelper43__2661 = "";
			local17___SelectHelper43__2661 = MID_Str(param8_Path_Str, ((REVINSTR(param8_Path_Str, ".", -(1))) + (1)), -(1));
			if ((((local17___SelectHelper43__2661) === ("js")) ? 1 : 0)) {
				
			} else {
				func5_Error("Cannot not REQUIRE non javascript files...", 643, "src\Expression.gbas");
				
			};
			
		};
		
	};
	global5_Exprs_ref[0].arrAccess(local4_Expr_2660).values[tmpPositionCache][0].attr8_Name_Str = param8_Path_Str;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2660).values[tmpPositionCache][0].attr11_Content_Str = func12_LoadFile_Str(param8_Path_Str);
	return tryClone(local4_Expr_2660);
	return 0;
	
};
func23_CreateRequireExpression = window['func23_CreateRequireExpression'];
window['func21_CreateSuperExpression'] = function(param3_typ) {
	var local1_d_2663 = new type9_TDatatype();
	local1_d_2663.attr7_IsArray = 0;
	local1_d_2663.attr8_Name_Str = global8_Compiler.attr5_Types_ref[0].arrAccess(param3_typ).values[tmpPositionCache][0].attr8_Name_Str;
	return tryClone(func16_CreateExpression(~~(53), local1_d_2663));
	return 0;
	
};
func21_CreateSuperExpression = window['func21_CreateSuperExpression'];
window['func14_CreateCast2Obj'] = function(param7_Obj_Str, param4_expr) {
	var local1_d_2666 = new type9_TDatatype(), local4_Expr_2667 = 0;
	local1_d_2666.attr7_IsArray = 0;
	local1_d_2666.attr8_Name_Str = param7_Obj_Str;
	local4_Expr_2667 = func16_CreateExpression(~~(54), local1_d_2666);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2667).values[tmpPositionCache][0].attr4_expr = param4_expr;
	return tryClone(local4_Expr_2667);
	return 0;
	
};
func14_CreateCast2Obj = window['func14_CreateCast2Obj'];
window['method13_type7_HashMap_3_Put'] = function(param7_Key_Str, param5_Value, param4_self) {
	var local2_KV_1845 = new type8_KeyValue(), local4_hash_1846 = 0, alias6_Bucket_ref_1847 = [new type6_Bucket()];
	if ((((param7_Key_Str) === ("")) ? 1 : 0)) {
		func5_Error("Cannot insert empty key you son of a bitch.", 19, "Hashmap.gbas");
		
	};
	if ((((BOUNDS(param4_self.attr7_Buckets_ref[0], 0)) === (0)) ? 1 : 0)) {
		(param4_self).SetSize(4096);
		
	};
	if ((((param4_self).DoesKeyExist(param7_Key_Str)) ? 0 : 1)) {
		param4_self.attr8_Elements+=1;
		
	};
	if ((((param4_self.attr8_Elements) > (((CAST2INT(((BOUNDS(param4_self.attr7_Buckets_ref[0], 0)) / (3)))) * (2)))) ? 1 : 0)) {
		(param4_self).SetSize(((BOUNDS(param4_self.attr7_Buckets_ref[0], 0)) * (4)));
		
	};
	local2_KV_1845.attr7_Key_Str = param7_Key_Str;
	local2_KV_1845.attr5_Value = param5_Value;
	local4_hash_1846 = func7_HashStr(param7_Key_Str, ((BOUNDS(param4_self.attr7_Buckets_ref[0], 0)) - (1)));
	alias6_Bucket_ref_1847 = param4_self.attr7_Buckets_ref[0].arrAccess(local4_hash_1846).values[tmpPositionCache] /* ALIAS */;
	if (alias6_Bucket_ref_1847[0].attr3_Set) {
		if ((((BOUNDS(alias6_Bucket_ref_1847[0].attr8_Elements, 0)) === (0)) ? 1 : 0)) {
			DIMPUSH(alias6_Bucket_ref_1847[0].attr8_Elements, alias6_Bucket_ref_1847[0].attr7_Element);
			
		};
		DIMPUSH(alias6_Bucket_ref_1847[0].attr8_Elements, local2_KV_1845);
		
	} else {
		alias6_Bucket_ref_1847[0].attr3_Set = 1;
		alias6_Bucket_ref_1847[0].attr7_Element = local2_KV_1845.clone();
		
	};
	return 0;
	
};
method13_type7_HashMap_3_Put = window['method13_type7_HashMap_3_Put'];
window['method13_type7_HashMap_12_DoesKeyExist'] = function(param7_Key_Str, param4_self) {
	var local5_Value_ref_1851 = [0];
	return tryClone((param4_self).GetValue(param7_Key_Str, local5_Value_ref_1851));
	return 0;
	
};
method13_type7_HashMap_12_DoesKeyExist = window['method13_type7_HashMap_12_DoesKeyExist'];
window['method13_type7_HashMap_8_GetValue'] = function(param7_Key_Str, param5_Value_ref, param4_self) {
	var local4_hash_1856 = 0, alias6_Bucket_ref_1857 = [new type6_Bucket()];
	local4_hash_1856 = func7_HashStr(param7_Key_Str, ((BOUNDS(param4_self.attr7_Buckets_ref[0], 0)) - (1)));
	if ((((local4_hash_1856) >= (BOUNDS(param4_self.attr7_Buckets_ref[0], 0))) ? 1 : 0)) {
		return tryClone(0);
		
	};
	alias6_Bucket_ref_1857 = param4_self.attr7_Buckets_ref[0].arrAccess(local4_hash_1856).values[tmpPositionCache] /* ALIAS */;
	if (alias6_Bucket_ref_1857[0].attr3_Set) {
		if ((((BOUNDS(alias6_Bucket_ref_1857[0].attr8_Elements, 0)) === (0)) ? 1 : 0)) {
			if ((((alias6_Bucket_ref_1857[0].attr7_Element.attr7_Key_Str) !== (param7_Key_Str)) ? 1 : 0)) {
				param5_Value_ref[0] = 0;
				return tryClone(0);
				
			} else {
				param5_Value_ref[0] = alias6_Bucket_ref_1857[0].attr7_Element.attr5_Value;
				return 1;
				
			};
			
		} else {
			{
				var local1_i_1858 = 0.0;
				for (local1_i_1858 = 0;toCheck(local1_i_1858, ((BOUNDS(alias6_Bucket_ref_1857[0].attr8_Elements, 0)) - (1)), 1);local1_i_1858 += 1) {
					if ((((alias6_Bucket_ref_1857[0].attr8_Elements.arrAccess(~~(local1_i_1858)).values[tmpPositionCache].attr7_Key_Str) === (param7_Key_Str)) ? 1 : 0)) {
						param5_Value_ref[0] = alias6_Bucket_ref_1857[0].attr8_Elements.arrAccess(~~(local1_i_1858)).values[tmpPositionCache].attr5_Value;
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
	
};
method13_type7_HashMap_8_GetValue = window['method13_type7_HashMap_8_GetValue'];
window['method13_type7_HashMap_6_Remove'] = function(param7_Key_Str, param4_self) {
	var local4_hash_1862 = 0, alias6_Bucket_ref_1863 = [new type6_Bucket()];
	local4_hash_1862 = func7_HashStr(param7_Key_Str, ((BOUNDS(param4_self.attr7_Buckets_ref[0], 0)) - (1)));
	alias6_Bucket_ref_1863 = param4_self.attr7_Buckets_ref[0].arrAccess(local4_hash_1862).values[tmpPositionCache] /* ALIAS */;
	if (alias6_Bucket_ref_1863[0].attr3_Set) {
		if ((((alias6_Bucket_ref_1863[0].attr7_Element.attr7_Key_Str) === (param7_Key_Str)) ? 1 : 0)) {
			var local1_e_1864 = new type8_KeyValue();
			param4_self.attr8_Elements+=-1;
			alias6_Bucket_ref_1863[0].attr7_Element = local1_e_1864.clone();
			alias6_Bucket_ref_1863[0].attr3_Set = 0;
			
		} else {
			var local4_Find_1865 = 0;
			local4_Find_1865 = 0;
			{
				var local1_i_1866 = 0.0;
				for (local1_i_1866 = 0;toCheck(local1_i_1866, ((BOUNDS(alias6_Bucket_ref_1863[0].attr8_Elements, 0)) - (1)), 1);local1_i_1866 += 1) {
					if ((((alias6_Bucket_ref_1863[0].attr8_Elements.arrAccess(~~(local1_i_1866)).values[tmpPositionCache].attr7_Key_Str) === (param7_Key_Str)) ? 1 : 0)) {
						local4_Find_1865 = 1;
						DIMDEL(alias6_Bucket_ref_1863[0].attr8_Elements, ~~(local1_i_1866));
						break;
						
					};
					
				};
				
			};
			if ((((BOUNDS(alias6_Bucket_ref_1863[0].attr8_Elements, 0)) === (1)) ? 1 : 0)) {
				alias6_Bucket_ref_1863[0].attr7_Element = alias6_Bucket_ref_1863[0].attr8_Elements.arrAccess(0).values[tmpPositionCache].clone();
				DIMDEL(alias6_Bucket_ref_1863[0].attr8_Elements, 0);
				
			};
			if (local4_Find_1865) {
				param4_self.attr8_Elements+=-1;
				
			};
			return tryClone(local4_Find_1865);
			
		};
		
	} else {
		return tryClone(0);
		
	};
	return 0;
	
};
method13_type7_HashMap_6_Remove = window['method13_type7_HashMap_6_Remove'];
window['method13_type7_HashMap_7_ToArray'] = function(param5_Array, param4_self) {
	DIM(param5_Array, [0], new type8_KeyValue());
	{
		var local1_i_1870 = 0.0;
		for (local1_i_1870 = 0;toCheck(local1_i_1870, ((BOUNDS(param4_self.attr7_Buckets_ref[0], 0)) - (1)), 1);local1_i_1870 += 1) {
			var alias1_B_ref_1871 = [new type6_Bucket()];
			alias1_B_ref_1871 = param4_self.attr7_Buckets_ref[0].arrAccess(~~(local1_i_1870)).values[tmpPositionCache] /* ALIAS */;
			if (alias1_B_ref_1871[0].attr3_Set) {
				if (BOUNDS(alias1_B_ref_1871[0].attr8_Elements, 0)) {
					{
						var local1_j_1872 = 0.0;
						for (local1_j_1872 = 0;toCheck(local1_j_1872, ((BOUNDS(alias1_B_ref_1871[0].attr8_Elements, 0)) - (1)), 1);local1_j_1872 += 1) {
							DIMPUSH(param5_Array, alias1_B_ref_1871[0].attr8_Elements.arrAccess(~~(local1_j_1872)).values[tmpPositionCache]);
							
						};
						
					};
					
				} else {
					DIMPUSH(param5_Array, alias1_B_ref_1871[0].attr7_Element);
					
				};
				
			};
			
		};
		
	};
	return 0;
	
};
method13_type7_HashMap_7_ToArray = window['method13_type7_HashMap_7_ToArray'];
window['method13_type7_HashMap_7_SetSize'] = function(param4_Size, param4_self) {
	var local3_Arr_1876 = new OTTArray();
	(param4_self).ToArray(unref(local3_Arr_1876));
	param4_self.attr8_Elements = 0;
	REDIM(unref(param4_self.attr7_Buckets_ref[0]), [param4_Size], [new type6_Bucket()] );
	var forEachSaver3443 = local3_Arr_1876;
	for(var forEachCounter3443 = 0 ; forEachCounter3443 < forEachSaver3443.values.length ; forEachCounter3443++) {
		var local1_E_1877 = forEachSaver3443.values[forEachCounter3443];
	{
			(param4_self).Put(local1_E_1877.attr7_Key_Str, local1_E_1877.attr5_Value);
			
		}
		forEachSaver3443.values[forEachCounter3443] = local1_E_1877;
	
	};
	return 0;
	
};
method13_type7_HashMap_7_SetSize = window['method13_type7_HashMap_7_SetSize'];
window['func7_HashStr'] = function(param7_Str_Str, param6_MaxLen) {
	var local4_Hash_1880 = 0;
	{
		var local1_i_1881 = 0.0;
		for (local1_i_1881 = 0;toCheck(local1_i_1881, (((param7_Str_Str).length) - (1)), 1);local1_i_1881 += 1) {
			local4_Hash_1880+=~~(((ASC(param7_Str_Str, ~~(local1_i_1881))) + (((local1_i_1881) * (26)))));
			
		};
		
	};
	local4_Hash_1880 = MOD(local4_Hash_1880, param6_MaxLen);
	return tryClone(local4_Hash_1880);
	return 0;
	
};
func7_HashStr = window['func7_HashStr'];
window['GetErrors'] = function() {
	return tryClone(unref(global8_Compiler.attr6_Errors));
	return tryClone(unref(new OTTArray()));
	
};
GetErrors = window['GetErrors'];
window['ParseIdentifiers'] = function(param8_Text_Str, param5_Parse, param6_GenDoc) {
	var local1_c_1885 = new type9_TCompiler();
	global8_Compiler = local1_c_1885.clone();
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
	return tryClone(unref(new OTTArray()));
	
};
ParseIdentifiers = window['ParseIdentifiers'];
window['GetIdentifierList'] = function() {
	var local11_Identifiers_1886 = new OTTArray(), local5_ident_1895 = new type14_TIDEIdentifier();
	var forEachSaver3585 = global8_Compiler.attr5_Funcs_ref[0];
	for(var forEachCounter3585 = 0 ; forEachCounter3585 < forEachSaver3585.values.length ; forEachCounter3585++) {
		var local4_Func_ref_1887 = forEachSaver3585.values[forEachCounter3585];
	{
			var local5_ident_1888 = new type14_TIDEIdentifier();
			local5_ident_1888.attr8_Name_Str = local4_Func_ref_1887[0].attr9_OName_Str;
			local5_ident_1888.attr8_datatype = local4_Func_ref_1887[0].attr8_datatype.clone();
			local5_ident_1888.attr6_Native = local4_Func_ref_1887[0].attr6_Native;
			local5_ident_1888.attr7_Typ_Str = "function";
			local5_ident_1888.attr6_SubTyp = local4_Func_ref_1887[0].attr3_Typ;
			local5_ident_1888.attr5_token = global8_Compiler.attr6_Tokens.arrAccess(local4_Func_ref_1887[0].attr3_Tok).values[tmpPositionCache].clone();
			DIMPUSH(local11_Identifiers_1886, local5_ident_1888);
			
		}
		forEachSaver3585.values[forEachCounter3585] = local4_Func_ref_1887;
	
	};
	var forEachSaver3635 = global8_Compiler.attr5_Varis_ref[0];
	for(var forEachCounter3635 = 0 ; forEachCounter3635 < forEachSaver3635.values.length ; forEachCounter3635++) {
		var local4_Vari_ref_1889 = forEachSaver3635.values[forEachCounter3635];
	{
			var local5_ident_1890 = new type14_TIDEIdentifier();
			local5_ident_1890.attr8_Name_Str = local4_Vari_ref_1889[0].attr9_OName_Str;
			local5_ident_1890.attr8_datatype = local4_Vari_ref_1889[0].attr8_datatype.clone();
			local5_ident_1890.attr7_Typ_Str = "variable";
			local5_ident_1890.attr6_SubTyp = local4_Vari_ref_1889[0].attr3_Typ;
			local5_ident_1890.attr5_token = global8_Compiler.attr6_Tokens.arrAccess(local4_Vari_ref_1889[0].attr3_Tok).values[tmpPositionCache].clone();
			DIMPUSH(local11_Identifiers_1886, local5_ident_1890);
			
		}
		forEachSaver3635.values[forEachCounter3635] = local4_Vari_ref_1889;
	
	};
	var forEachSaver3676 = global8_Compiler.attr5_Types_ref[0];
	for(var forEachCounter3676 = 0 ; forEachCounter3676 < forEachSaver3676.values.length ; forEachCounter3676++) {
		var local3_typ_ref_1891 = forEachSaver3676.values[forEachCounter3676];
	{
			var local5_ident_1892 = new type14_TIDEIdentifier();
			local5_ident_1892.attr8_Name_Str = local3_typ_ref_1891[0].attr9_OName_Str;
			local5_ident_1892.attr7_Typ_Str = "type";
			local5_ident_1892.attr6_SubTyp = 0;
			local5_ident_1892.attr5_token = global8_Compiler.attr6_Tokens.arrAccess(local3_typ_ref_1891[0].attr3_Tok).values[tmpPositionCache].clone();
			DIMPUSH(local11_Identifiers_1886, local5_ident_1892);
			
		}
		forEachSaver3676.values[forEachCounter3676] = local3_typ_ref_1891;
	
	};
	var forEachSaver3702 = global12_Keywords_Str;
	for(var forEachCounter3702 = 0 ; forEachCounter3702 < forEachSaver3702.values.length ; forEachCounter3702++) {
		var local6_kw_Str_1893 = forEachSaver3702.values[forEachCounter3702];
	{
			var local5_ident_1894 = new type14_TIDEIdentifier();
			local5_ident_1894.attr8_Name_Str = local6_kw_Str_1893;
			local5_ident_1894.attr7_Typ_Str = "keyword";
			local5_ident_1894.attr6_SubTyp = 0;
			DIMPUSH(local11_Identifiers_1886, local5_ident_1894);
			
		}
		forEachSaver3702.values[forEachCounter3702] = local6_kw_Str_1893;
	
	};
	local5_ident_1895.attr8_Name_Str = "int";
	local5_ident_1895.attr7_Typ_Str = "type";
	local5_ident_1895.attr6_SubTyp = 1;
	DIMPUSH(local11_Identifiers_1886, local5_ident_1895);
	local5_ident_1895.attr8_Name_Str = "string";
	local5_ident_1895.attr7_Typ_Str = "type";
	local5_ident_1895.attr6_SubTyp = 1;
	DIMPUSH(local11_Identifiers_1886, local5_ident_1895);
	local5_ident_1895.attr8_Name_Str = "float";
	local5_ident_1895.attr7_Typ_Str = "type";
	local5_ident_1895.attr6_SubTyp = 1;
	DIMPUSH(local11_Identifiers_1886, local5_ident_1895);
	local5_ident_1895.attr8_Name_Str = "void";
	local5_ident_1895.attr7_Typ_Str = "type";
	local5_ident_1895.attr6_SubTyp = 1;
	DIMPUSH(local11_Identifiers_1886, local5_ident_1895);
	return tryClone(unref(local11_Identifiers_1886));
	return tryClone(unref(new OTTArray()));
	
};
GetIdentifierList = window['GetIdentifierList'];
window['func16_JS_Generator_Str'] = function() {
	{
		var Err_Str = "";
		try {
			var local11_InWebWorker_1896 = 0, local8_Text_Str_1897 = "", local14_StaticText_Str_1898 = "", local17_StaticDefText_Str_1899 = "";
			local11_InWebWorker_1896 = func8_IsDefine("HTML5_WEBWORKER");
			func23_ManageFuncParamOverlaps();
			global14_StaticText_Str = "";
			local8_Text_Str_1897 = "";
			if (global9_DEBUGMODE) {
				local8_Text_Str_1897 = ((((local8_Text_Str_1897) + ("var __debugInfo = \"\";"))) + (func11_NewLine_Str()));
				local8_Text_Str_1897 = ((((local8_Text_Str_1897) + ("var debugMode = true;"))) + (func11_NewLine_Str()));
				
			} else {
				local8_Text_Str_1897 = ((((local8_Text_Str_1897) + ("var debugMode = false;"))) + (func11_NewLine_Str()));
				
			};
			global11_LastDummyID = ~~(((global10_LastExprID) + (1337)));
			local8_Text_Str_1897 = ((local8_Text_Str_1897) + ("window['main'] = function()"));
			local8_Text_Str_1897 = ((((local8_Text_Str_1897) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr9_MainScope).values[tmpPositionCache][0]))))) + (func11_NewLine_Str()));
			if (local11_InWebWorker_1896) {
				local8_Text_Str_1897 = ((((local8_Text_Str_1897) + ("main = window['main'];"))) + (func11_NewLine_Str()));
				
			};
			local14_StaticText_Str_1898 = "";
			local17_StaticDefText_Str_1899 = "";
			var forEachSaver4051 = global8_Compiler.attr5_Funcs_ref[0];
			for(var forEachCounter4051 = 0 ; forEachCounter4051 < forEachSaver4051.values.length ; forEachCounter4051++) {
				var local4_Func_ref_1900 = forEachSaver4051.values[forEachCounter4051];
			{
					if (((((((local4_Func_ref_1900[0].attr6_Native) === (0)) ? 1 : 0)) && ((((local4_Func_ref_1900[0].attr3_Scp) !== (-(1))) ? 1 : 0))) ? 1 : 0)) {
						var local4_Find_1901 = 0.0;
						if ((((BOUNDS(local4_Func_ref_1900[0].attr7_Statics, 0)) > (0)) ? 1 : 0)) {
							local17_StaticDefText_Str_1899 = ((((((((local17_StaticDefText_Str_1899) + ("var "))) + (func13_JSVariDef_Str(unref(local4_Func_ref_1900[0].attr7_Statics), 1, 0, 0)))) + (";"))) + (func11_NewLine_Str()));
							local14_StaticText_Str_1898 = ((((((local14_StaticText_Str_1898) + (func13_JSVariDef_Str(unref(local4_Func_ref_1900[0].attr7_Statics), 0, 0, 1)))) + (";"))) + (func11_NewLine_Str()));
							
						};
						local8_Text_Str_1897 = ((((((local8_Text_Str_1897) + ("window['"))) + (local4_Func_ref_1900[0].attr8_Name_Str))) + ("'] = function("));
						local4_Find_1901 = 0;
						var forEachSaver3977 = local4_Func_ref_1900[0].attr6_Params;
						for(var forEachCounter3977 = 0 ; forEachCounter3977 < forEachSaver3977.values.length ; forEachCounter3977++) {
							var local1_P_1902 = forEachSaver3977.values[forEachCounter3977];
						{
								if (local4_Find_1901) {
									local8_Text_Str_1897 = ((local8_Text_Str_1897) + (", "));
									
								};
								local8_Text_Str_1897 = ((local8_Text_Str_1897) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_1902).values[tmpPositionCache][0].attr8_Name_Str));
								local4_Find_1901 = 1;
								
							}
							forEachSaver3977.values[forEachCounter3977] = local1_P_1902;
						
						};
						local8_Text_Str_1897 = ((local8_Text_Str_1897) + (") "));
						local8_Text_Str_1897 = ((((((local8_Text_Str_1897) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local4_Func_ref_1900[0].attr3_Scp).values[tmpPositionCache][0]))))) + (";"))) + (func11_NewLine_Str()));
						if (((((((global9_DEBUGMODE) === (0)) ? 1 : 0)) && ((((local4_Func_ref_1900[0].attr3_Typ) === (2)) ? 1 : 0))) ? 1 : 0)) {
							local8_Text_Str_1897 = ((((((((((((local8_Text_Str_1897) + ("window['"))) + (local4_Func_ref_1900[0].attr8_Name_Str))) + ("'] = "))) + (local4_Func_ref_1900[0].attr8_Name_Str))) + (";"))) + (func11_NewLine_Str()));
							
						};
						if (local11_InWebWorker_1896) {
							local8_Text_Str_1897 = ((((((((((local8_Text_Str_1897) + (local4_Func_ref_1900[0].attr8_Name_Str))) + (" = window['"))) + (local4_Func_ref_1900[0].attr8_Name_Str))) + ("'];"))) + (func11_NewLine_Str()));
							
						};
						
					};
					
				}
				forEachSaver4051.values[forEachCounter4051] = local4_Func_ref_1900;
			
			};
			var forEachSaver4117 = global8_Compiler.attr5_Funcs_ref[0];
			for(var forEachCounter4117 = 0 ; forEachCounter4117 < forEachSaver4117.values.length ; forEachCounter4117++) {
				var local4_Func_ref_1903 = forEachSaver4117.values[forEachCounter4117];
			{
					if ((((local4_Func_ref_1903[0].attr3_Typ) === (4)) ? 1 : 0)) {
						func8_IndentUp();
						local8_Text_Str_1897 = ((((((((local8_Text_Str_1897) + ("window['"))) + (local4_Func_ref_1903[0].attr9_OName_Str))) + ("'] = function() {"))) + (func11_NewLine_Str()));
						local8_Text_Str_1897 = ((local8_Text_Str_1897) + ("return function() { throwError(\"NullPrototypeException\"); };"));
						func10_IndentDown();
						local8_Text_Str_1897 = ((((((local8_Text_Str_1897) + (func11_NewLine_Str()))) + ("};"))) + (func11_NewLine_Str()));
						if (local11_InWebWorker_1896) {
							local8_Text_Str_1897 = ((((((((((local8_Text_Str_1897) + (local4_Func_ref_1903[0].attr9_OName_Str))) + (" = window['"))) + (local4_Func_ref_1903[0].attr9_OName_Str))) + ("'];"))) + (func11_NewLine_Str()));
							
						};
						
					};
					
				}
				forEachSaver4117.values[forEachCounter4117] = local4_Func_ref_1903;
			
			};
			var forEachSaver5048 = global8_Compiler.attr5_Types_ref[0];
			for(var forEachCounter5048 = 0 ; forEachCounter5048 < forEachSaver5048.values.length ; forEachCounter5048++) {
				var local3_Typ_ref_1904 = forEachSaver5048.values[forEachCounter5048];
			{
					var local5_typId_1905 = 0, local3_map_1906 = new type7_HashMap(), local5_First_1907 = 0, local4_map2_1919 = new type7_HashMap();
					local5_typId_1905 = local3_Typ_ref_1904[0].attr2_ID;
					func8_IndentUp();
					local8_Text_Str_1897 = ((((((((local8_Text_Str_1897) + ("var vtbl_"))) + (local3_Typ_ref_1904[0].attr8_Name_Str))) + (" = {"))) + (func11_NewLine_Str()));
					local5_First_1907 = 0;
					while ((((local5_typId_1905) !== (-(1))) ? 1 : 0)) {
						var forEachSaver4241 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_1905).values[tmpPositionCache][0].attr7_Methods;
						for(var forEachCounter4241 = 0 ; forEachCounter4241 < forEachSaver4241.values.length ; forEachCounter4241++) {
							var local3_Mth_1908 = forEachSaver4241.values[forEachCounter4241];
						{
								if (((((((local3_map_1906).DoesKeyExist(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1908).values[tmpPositionCache][0].attr9_OName_Str)) ? 0 : 1)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1908).values[tmpPositionCache][0].attr3_Scp) !== (-(1))) ? 1 : 0))) ? 1 : 0)) {
									if (local5_First_1907) {
										local8_Text_Str_1897 = ((((local8_Text_Str_1897) + (", "))) + (func11_NewLine_Str()));
										
									};
									local8_Text_Str_1897 = ((((((local8_Text_Str_1897) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1908).values[tmpPositionCache][0].attr9_OName_Str))) + (": "))) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1908).values[tmpPositionCache][0].attr8_Name_Str));
									(local3_map_1906).Put(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1908).values[tmpPositionCache][0].attr9_OName_Str, local3_Mth_1908);
									local5_First_1907 = 1;
									
								};
								
							}
							forEachSaver4241.values[forEachCounter4241] = local3_Mth_1908;
						
						};
						local5_typId_1905 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_1905).values[tmpPositionCache][0].attr9_Extending;
						
					};
					func10_IndentDown();
					local8_Text_Str_1897 = ((((((local8_Text_Str_1897) + (func11_NewLine_Str()))) + ("};"))) + (func11_NewLine_Str()));
					if ((((global9_DEBUGMODE) === (0)) ? 1 : 0)) {
						local8_Text_Str_1897 = ((((local8_Text_Str_1897) + ("/**"))) + (func11_NewLine_Str()));
						local8_Text_Str_1897 = ((((local8_Text_Str_1897) + ("* @constructor"))) + (func11_NewLine_Str()));
						local8_Text_Str_1897 = ((((local8_Text_Str_1897) + ("*/"))) + (func11_NewLine_Str()));
						
					};
					local8_Text_Str_1897 = ((((((((local8_Text_Str_1897) + ("window ['"))) + (local3_Typ_ref_1904[0].attr8_Name_Str))) + ("'] = function() { this.reset(); }"))) + (func11_NewLine_Str()));
					func8_IndentUp();
					local8_Text_Str_1897 = ((((((((((((local8_Text_Str_1897) + ("window['"))) + (local3_Typ_ref_1904[0].attr8_Name_Str))) + ("'].prototype.getTypeName = function() { return \""))) + (local3_Typ_ref_1904[0].attr8_Name_Str))) + ("\" };"))) + (func11_NewLine_Str()));
					local8_Text_Str_1897 = ((((((((local8_Text_Str_1897) + ("window['"))) + (local3_Typ_ref_1904[0].attr8_Name_Str))) + ("'].prototype.reset = function() {"))) + (func11_NewLine_Str()));
					var forEachSaver4382 = local3_Typ_ref_1904[0].attr10_Attributes;
					for(var forEachCounter4382 = 0 ; forEachCounter4382 < forEachSaver4382.values.length ; forEachCounter4382++) {
						var local4_Attr_1909 = forEachSaver4382.values[forEachCounter4382];
					{
							var alias8_variable_ref_1910 = [new type15_TIdentifierVari()];
							alias8_variable_ref_1910 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1909).values[tmpPositionCache] /* ALIAS */;
							local8_Text_Str_1897 = ((((local8_Text_Str_1897) + ("this."))) + (alias8_variable_ref_1910[0].attr8_Name_Str));
							local8_Text_Str_1897 = ((local8_Text_Str_1897) + (" = "));
							local8_Text_Str_1897 = ((local8_Text_Str_1897) + (func21_JSGetDefaultValue_Str(alias8_variable_ref_1910[0].attr8_datatype, alias8_variable_ref_1910[0].attr3_ref, 0)));
							local8_Text_Str_1897 = ((((local8_Text_Str_1897) + (";"))) + (func11_NewLine_Str()));
							
						}
						forEachSaver4382.values[forEachCounter4382] = local4_Attr_1909;
					
					};
					local8_Text_Str_1897 = ((((((((local8_Text_Str_1897) + ("this.vtbl = vtbl_"))) + (local3_Typ_ref_1904[0].attr8_Name_Str))) + (";"))) + (func11_NewLine_Str()));
					var forEachSaver4472 = local3_Typ_ref_1904[0].attr10_Attributes;
					for(var forEachCounter4472 = 0 ; forEachCounter4472 < forEachSaver4472.values.length ; forEachCounter4472++) {
						var local4_Attr_1911 = forEachSaver4472.values[forEachCounter4472];
					{
							var alias8_variable_ref_1912 = [new type15_TIdentifierVari()];
							alias8_variable_ref_1912 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1911).values[tmpPositionCache] /* ALIAS */;
							if ((((alias8_variable_ref_1912[0].attr6_PreDef) !== (-(1))) ? 1 : 0)) {
								local8_Text_Str_1897 = ((((local8_Text_Str_1897) + ("this."))) + (alias8_variable_ref_1912[0].attr8_Name_Str));
								local8_Text_Str_1897 = ((local8_Text_Str_1897) + (" = "));
								if (alias8_variable_ref_1912[0].attr3_ref) {
									local8_Text_Str_1897 = ((local8_Text_Str_1897) + ("["));
									
								};
								local8_Text_Str_1897 = ((local8_Text_Str_1897) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(alias8_variable_ref_1912[0].attr6_PreDef).values[tmpPositionCache][0]))));
								if (alias8_variable_ref_1912[0].attr3_ref) {
									local8_Text_Str_1897 = ((local8_Text_Str_1897) + ("]"));
									
								};
								local8_Text_Str_1897 = ((((local8_Text_Str_1897) + (";"))) + (func11_NewLine_Str()));
								
							};
							
						}
						forEachSaver4472.values[forEachCounter4472] = local4_Attr_1911;
					
					};
					func10_IndentDown();
					local8_Text_Str_1897 = ((((((local8_Text_Str_1897) + (func11_NewLine_Str()))) + ("};"))) + (func11_NewLine_Str()));
					func8_IndentUp();
					local8_Text_Str_1897 = ((((((((local8_Text_Str_1897) + ("window['"))) + (local3_Typ_ref_1904[0].attr8_Name_Str))) + ("'].prototype.clone = function() {"))) + (func11_NewLine_Str()));
					local8_Text_Str_1897 = ((((((((local8_Text_Str_1897) + ("var other = new "))) + (local3_Typ_ref_1904[0].attr8_Name_Str))) + ("();"))) + (func11_NewLine_Str()));
					var forEachSaver4644 = local3_Typ_ref_1904[0].attr10_Attributes;
					for(var forEachCounter4644 = 0 ; forEachCounter4644 < forEachSaver4644.values.length ; forEachCounter4644++) {
						var local4_Attr_1913 = forEachSaver4644.values[forEachCounter4644];
					{
							var alias8_variable_ref_1914 = [new type15_TIdentifierVari()], local8_plzclone_1915 = 0;
							alias8_variable_ref_1914 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1913).values[tmpPositionCache] /* ALIAS */;
							local8_plzclone_1915 = 0;
							if (((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1913).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0)) && ((((((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1913).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("int")) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1913).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("float")) ? 1 : 0))) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1913).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("string")) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) {
								local8_plzclone_1915 = 0;
								
							} else {
								local8_plzclone_1915 = 1;
								
							};
							if (global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1913).values[tmpPositionCache][0].attr3_ref) {
								local8_plzclone_1915 = 1;
								
							};
							local8_Text_Str_1897 = ((((((local8_Text_Str_1897) + ("other."))) + (alias8_variable_ref_1914[0].attr8_Name_Str))) + (" = "));
							if (local8_plzclone_1915) {
								local8_Text_Str_1897 = ((local8_Text_Str_1897) + ("tryClone("));
								
							};
							local8_Text_Str_1897 = ((((local8_Text_Str_1897) + ("this."))) + (alias8_variable_ref_1914[0].attr8_Name_Str));
							if (local8_plzclone_1915) {
								local8_Text_Str_1897 = ((local8_Text_Str_1897) + (")"));
								
							};
							local8_Text_Str_1897 = ((((local8_Text_Str_1897) + (";"))) + (func11_NewLine_Str()));
							
						}
						forEachSaver4644.values[forEachCounter4644] = local4_Attr_1913;
					
					};
					local8_Text_Str_1897 = ((((local8_Text_Str_1897) + ("other.vtbl = this.vtbl;"))) + (func11_NewLine_Str()));
					func10_IndentDown();
					local8_Text_Str_1897 = ((((local8_Text_Str_1897) + ("return other;"))) + (func11_NewLine_Str()));
					local8_Text_Str_1897 = ((((local8_Text_Str_1897) + ("};"))) + (func11_NewLine_Str()));
					if ((((BOUNDS(global8_Compiler.attr7_Exports, 0)) > (0)) ? 1 : 0)) {
						func8_IndentUp();
						local8_Text_Str_1897 = ((((((((local8_Text_Str_1897) + ("window['"))) + (local3_Typ_ref_1904[0].attr8_Name_Str))) + ("'].prototype.bridgeToJS = function(isJSON) {"))) + (func11_NewLine_Str()));
						func8_IndentUp();
						local8_Text_Str_1897 = ((((local8_Text_Str_1897) + ("return {"))) + (func11_NewLine_Str()));
						var forEachSaver4836 = local3_Typ_ref_1904[0].attr10_Attributes;
						for(var forEachCounter4836 = 0 ; forEachCounter4836 < forEachSaver4836.values.length ; forEachCounter4836++) {
							var local4_Attr_1916 = forEachSaver4836.values[forEachCounter4836];
						{
								var alias8_variable_ref_1917 = [new type15_TIdentifierVari()], local8_plzclone_1918 = 0;
								alias8_variable_ref_1917 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1916).values[tmpPositionCache] /* ALIAS */;
								local8_plzclone_1918 = 0;
								if (((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1916).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0)) && ((((((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1916).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("int")) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1916).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("float")) ? 1 : 0))) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1916).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("string")) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) {
									local8_plzclone_1918 = 0;
									
								} else {
									local8_plzclone_1918 = 1;
									
								};
								if (global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1916).values[tmpPositionCache][0].attr3_ref) {
									local8_plzclone_1918 = 1;
									
								};
								local8_Text_Str_1897 = ((((((local8_Text_Str_1897) + ("\""))) + (REPLACE_Str(alias8_variable_ref_1917[0].attr9_OName_Str, "$", "_Str")))) + ("\": "));
								if (local8_plzclone_1918) {
									local8_Text_Str_1897 = ((local8_Text_Str_1897) + ("("));
									
								};
								local8_Text_Str_1897 = ((((local8_Text_Str_1897) + ("this."))) + (alias8_variable_ref_1917[0].attr8_Name_Str));
								if (local8_plzclone_1918) {
									local8_Text_Str_1897 = ((local8_Text_Str_1897) + (").bridgeToJS(isJSON)"));
									
								};
								local8_Text_Str_1897 = ((((local8_Text_Str_1897) + (","))) + (func11_NewLine_Str()));
								
							}
							forEachSaver4836.values[forEachCounter4836] = local4_Attr_1916;
						
						};
						func10_IndentDown();
						local8_Text_Str_1897 = ((((local8_Text_Str_1897) + ("\"__vtbl\": !isJSON ? this.vtbl : undefined"))) + (func11_NewLine_Str()));
						func10_IndentDown();
						local8_Text_Str_1897 = ((((local8_Text_Str_1897) + ("};"))) + (func11_NewLine_Str()));
						local8_Text_Str_1897 = ((((local8_Text_Str_1897) + ("};"))) + (func11_NewLine_Str()));
						
					};
					if (local11_InWebWorker_1896) {
						local8_Text_Str_1897 = ((((((((((local8_Text_Str_1897) + (local3_Typ_ref_1904[0].attr8_Name_Str))) + (" = window['"))) + (local3_Typ_ref_1904[0].attr8_Name_Str))) + ("'];"))) + (func11_NewLine_Str()));
						
					};
					local5_typId_1905 = local3_Typ_ref_1904[0].attr2_ID;
					local5_First_1907 = 0;
					while ((((local5_typId_1905) !== (-(1))) ? 1 : 0)) {
						var forEachSaver5037 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_1905).values[tmpPositionCache][0].attr7_Methods;
						for(var forEachCounter5037 = 0 ; forEachCounter5037 < forEachSaver5037.values.length ; forEachCounter5037++) {
							var local3_Mth_1920 = forEachSaver5037.values[forEachCounter5037];
						{
								if (((((((local4_map2_1919).DoesKeyExist(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1920).values[tmpPositionCache][0].attr9_OName_Str)) ? 0 : 1)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1920).values[tmpPositionCache][0].attr3_Scp) !== (-(1))) ? 1 : 0))) ? 1 : 0)) {
									func8_IndentUp();
									local8_Text_Str_1897 = ((((((((((((local8_Text_Str_1897) + (local3_Typ_ref_1904[0].attr8_Name_Str))) + (".prototype."))) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1920).values[tmpPositionCache][0].attr9_OName_Str))) + (" = function() {"))) + (func11_NewLine_Str()))) + (" return "));
									local8_Text_Str_1897 = ((((((local8_Text_Str_1897) + ("this.vtbl."))) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1920).values[tmpPositionCache][0].attr9_OName_Str))) + ("("));
									{
										var local1_i_1921 = 0.0;
										for (local1_i_1921 = 0;toCheck(local1_i_1921, ((BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1920).values[tmpPositionCache][0].attr6_Params, 0)) - (2)), 1);local1_i_1921 += 1) {
											local8_Text_Str_1897 = ((((((local8_Text_Str_1897) + ("arguments["))) + (CAST2STRING(local1_i_1921)))) + ("], "));
											
										};
										
									};
									local8_Text_Str_1897 = ((local8_Text_Str_1897) + ("this"));
									func10_IndentDown();
									local8_Text_Str_1897 = ((((((((local8_Text_Str_1897) + (");"))) + (func11_NewLine_Str()))) + ("};"))) + (func11_NewLine_Str()));
									(local4_map2_1919).Put(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1920).values[tmpPositionCache][0].attr9_OName_Str, local3_Mth_1920);
									
								};
								
							}
							forEachSaver5037.values[forEachCounter5037] = local3_Mth_1920;
						
						};
						local5_typId_1905 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_1905).values[tmpPositionCache][0].attr9_Extending;
						
					};
					
				}
				forEachSaver5048.values[forEachCounter5048] = local3_Typ_ref_1904;
			
			};
			var forEachSaver5107 = global8_Compiler.attr10_DataBlocks;
			for(var forEachCounter5107 = 0 ; forEachCounter5107 < forEachSaver5107.values.length ; forEachCounter5107++) {
				var local5_block_1922 = forEachSaver5107.values[forEachCounter5107];
			{
					var local4_Done_1923 = 0;
					local8_Text_Str_1897 = ((((((local8_Text_Str_1897) + ("var datablock_"))) + (local5_block_1922.attr8_Name_Str))) + (" = [ "));
					local4_Done_1923 = 0;
					var forEachSaver5099 = local5_block_1922.attr5_Datas;
					for(var forEachCounter5099 = 0 ; forEachCounter5099 < forEachSaver5099.values.length ; forEachCounter5099++) {
						var local1_d_1924 = forEachSaver5099.values[forEachCounter5099];
					{
							if (local4_Done_1923) {
								local8_Text_Str_1897 = ((local8_Text_Str_1897) + (", "));
								
							};
							local8_Text_Str_1897 = ((local8_Text_Str_1897) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local1_d_1924).values[tmpPositionCache][0]))));
							local4_Done_1923 = 1;
							
						}
						forEachSaver5099.values[forEachCounter5099] = local1_d_1924;
					
					};
					local8_Text_Str_1897 = ((((local8_Text_Str_1897) + (" ];"))) + (func11_NewLine_Str()));
					
				}
				forEachSaver5107.values[forEachCounter5107] = local5_block_1922;
			
			};
			if ((((BOUNDS(global8_Compiler.attr7_Globals, 0)) > (0)) ? 1 : 0)) {
				local8_Text_Str_1897 = ((local8_Text_Str_1897) + ("var "));
				local8_Text_Str_1897 = ((local8_Text_Str_1897) + (func13_JSVariDef_Str(unref(global8_Compiler.attr7_Globals), 1, 0, 1)));
				local8_Text_Str_1897 = ((((local8_Text_Str_1897) + (";"))) + (func11_NewLine_Str()));
				
			};
			if ((((TRIM_Str(local14_StaticText_Str_1898, " \t\r\n\v\f")) !== ("")) ? 1 : 0)) {
				local8_Text_Str_1897 = ((((local8_Text_Str_1897) + ("// set default statics:"))) + (func11_NewLine_Str()));
				local8_Text_Str_1897 = ((local17_StaticDefText_Str_1899) + (local8_Text_Str_1897));
				func8_IndentUp();
				local8_Text_Str_1897 = ((((local8_Text_Str_1897) + ("window['initStatics'] = function() {"))) + (func11_NewLine_Str()));
				func10_IndentDown();
				local8_Text_Str_1897 = ((((local8_Text_Str_1897) + (local14_StaticText_Str_1898))) + (func11_NewLine_Str()));
				local8_Text_Str_1897 = ((((local8_Text_Str_1897) + ("}"))) + (func11_NewLine_Str()));
				
			} else {
				local8_Text_Str_1897 = ((((local8_Text_Str_1897) + ("window['initStatics'] = function() {}"))) + (func11_NewLine_Str()));
				
			};
			if (local11_InWebWorker_1896) {
				local8_Text_Str_1897 = ((((local8_Text_Str_1897) + ("initStatics = window['initStatics'];"))) + (func11_NewLine_Str()));
				
			};
			local8_Text_Str_1897 = ((((local8_Text_Str_1897) + ("for (var __init = 0; __init < preInitFuncs.length; __init++) preInitFuncs[__init]();"))) + (func11_NewLine_Str()));
			local8_Text_Str_1897 = ((((local8_Text_Str_1897) + ("preInitFuncs = [];"))) + (func11_NewLine_Str()));
			return tryClone(local8_Text_Str_1897);
			
		} catch (Err_Str) {
			if (Err_Str instanceof OTTException) Err_Str = Err_Str.getText(); else throwError(Err_Str);{
				
			}
		};
		
	};
	return "";
	
};
func16_JS_Generator_Str = window['func16_JS_Generator_Str'];
window['func14_JSGenerate_Str'] = function(param4_expr) {
	var __labels = {"Exit": 6569};
	
	var local8_Text_Str_1927 = "";
	var __pc = 5230;
	while(__pc >= 0) {
		switch(__pc) {
			case 5230:
				global8_Compiler.attr11_currentPosi = param4_expr.attr5_tokID;
				
			local8_Text_Str_1927 = "";
			
				var local16___SelectHelper4__1928 = 0;
				case 5240:
					local16___SelectHelper4__1928 = param4_expr.attr3_Typ;
					
				case 9630:
					if (!((((local16___SelectHelper4__1928) === (~~(2))) ? 1 : 0))) { __pc = 5242; break; }
				
				var local4_oScp_1929 = 0.0, local5_oFunc_1930 = 0.0, local13_oLabelDef_Str_1931 = "", local9_oIsInGoto_1932 = 0, local6_IsFunc_1933 = 0, local7_mngGoto_1934 = 0, local13_IsStackPusher_1935 = 0, local7_Def_Str_1939 = "", local15_BeforeUndef_Str_1940 = "", local8_ERes_Str_1943 = new OTTArray(), local13_FirstText_Str_1946 = "";
				case 5247:
					local4_oScp_1929 = global12_CurrentScope;
					
				local5_oFunc_1930 = global11_CurrentFunc;
				local13_oLabelDef_Str_1931 = global12_LabelDef_Str;
				local9_oIsInGoto_1932 = global8_IsInGoto;
				local6_IsFunc_1933 = 0;
				local7_mngGoto_1934 = 0;
				local13_IsStackPusher_1935 = 0;
				case 5293:
					if (!(((((((param4_expr.attr6_ScpTyp) === (2)) ? 1 : 0)) || ((((param4_expr.attr6_ScpTyp) === (4)) ? 1 : 0))) ? 1 : 0))) { __pc = 5288; break; }
				
				case 5292:
					local13_IsStackPusher_1935 = 1;
					
				
				
			case 5288: //dummy jumper1
				;
					
				case 5306:
					if (!((((func12_ScopeHasGoto(param4_expr)) && (local13_IsStackPusher_1935)) ? 1 : 0))) { __pc = 5298; break; }
				
				case 5302:
					local7_mngGoto_1934 = 1;
					
				global8_IsInGoto = 1;
				
				
			case 5298: //dummy jumper1
				;
					
				case 5343:
					if (!((((param4_expr.attr6_ScpTyp) === (2)) ? 1 : 0))) { __pc = 5312; break; }
				
				var local1_i_1936 = 0;
				case 5342:
					var forEachSaver5342 = global8_Compiler.attr5_Funcs_ref[0];
				var forEachCounter5342 = 0
				
			case 5320: //dummy for1
				if (!(forEachCounter5342 < forEachSaver5342.values.length)) {__pc = 5316; break;}
				var local4_Func_ref_1937 = forEachSaver5342.values[forEachCounter5342];
				
				
				case 5338:
					if (!((((local4_Func_ref_1937[0].attr3_Scp) === (param4_expr.attr2_ID)) ? 1 : 0))) { __pc = 5329; break; }
				
				case 5333:
					global11_CurrentFunc = local1_i_1936;
					
				local6_IsFunc_1933 = 1;
				case 5337:
					__pc = 5316; break;
					
				
				
			case 5329: //dummy jumper1
				;
					
				local1_i_1936+=1;
				
				forEachSaver5342.values[forEachCounter5342] = local4_Func_ref_1937;
				
				forEachCounter5342++
				__pc = 5320; break; //back jump
				
			case 5316: //dummy for
				;
					
				
				
			case 5312: //dummy jumper1
				;
					
				global12_CurrentScope = param4_expr.attr2_ID;
				case 5359:
					if (!((((((global8_IsInGoto) ? 0 : 1)) || (local7_mngGoto_1934)) ? 1 : 0))) { __pc = 5355; break; }
				
				case 5357:
					func8_IndentUp();
					
				
				__pc = 29638;
				break;
				
			case 5355: //dummy jumper1
				
				
				
			case 29638: //dummy jumper2
				;
					
				local8_Text_Str_1927 = ((local8_Text_Str_1927) + (func11_NewLine_Str()));
				case 5390:
					if (!((((global9_DEBUGMODE) && (local13_IsStackPusher_1935)) ? 1 : 0))) { __pc = 5368; break; }
				
				case 5381:
					local8_Text_Str_1927 = ((((((((local8_Text_Str_1927) + ("stackPush(\""))) + (func13_ScopeName_Str(param4_expr)))) + ("\", __debugInfo);"))) + (func11_NewLine_Str()));
					
				func8_IndentUp();
				local8_Text_Str_1927 = ((((local8_Text_Str_1927) + ("try {"))) + (func11_NewLine_Str()));
				
				
			case 5368: //dummy jumper1
				;
					
				case 5453:
					if (!((((local6_IsFunc_1933) && (global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr15_UsedAsPrototype)) ? 1 : 0))) { __pc = 5400; break; }
				
				case 5452:
					var forEachSaver5452 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr6_Params;
				var forEachCounter5452 = 0
				
			case 5411: //dummy for1
				if (!(forEachCounter5452 < forEachSaver5452.values.length)) {__pc = 5403; break;}
				var local1_P_1938 = forEachSaver5452.values[forEachCounter5452];
				
				
				case 5451:
					if (!((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_1938).values[tmpPositionCache][0].attr3_ref) === (0)) ? 1 : 0))) { __pc = 5423; break; }
				
				case 5449:
					local8_Text_Str_1927 = ((((((((((local8_Text_Str_1927) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_1938).values[tmpPositionCache][0].attr8_Name_Str))) + (" = unref("))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_1938).values[tmpPositionCache][0].attr8_Name_Str))) + (");"))) + (func11_NewLine_Str()));
					
				
				__pc = 29641;
				break;
				
			case 5423: //dummy jumper1
				
				
				
			case 29641: //dummy jumper2
				;
					
				
				forEachSaver5452.values[forEachCounter5452] = local1_P_1938;
				
				forEachCounter5452++
				__pc = 5411; break; //back jump
				
			case 5403: //dummy for
				;
					
				
				
			case 5400: //dummy jumper1
				;
					
				local7_Def_Str_1939 = func13_JSVariDef_Str(unref(param4_expr.attr5_Varis), 0, 1, 1);
				case 5487:
					if (!((((TRIM_Str(local7_Def_Str_1939, " \t\r\n\v\f")) !== ("")) ? 1 : 0))) { __pc = 5468; break; }
				
				case 5474:
					local8_Text_Str_1927 = ((local8_Text_Str_1927) + ("var "));
					
				local8_Text_Str_1927 = ((local8_Text_Str_1927) + (local7_Def_Str_1939));
				local8_Text_Str_1927 = ((((local8_Text_Str_1927) + (";"))) + (func11_NewLine_Str()));
				
				
			case 5468: //dummy jumper1
				;
					
				local15_BeforeUndef_Str_1940 = global13_VariUndef_Str;
				case 5569:
					if (!(((((((global11_CurrentFunc) !== (-(1))) ? 1 : 0)) && ((((local5_oFunc_1930) === (-(1))) ? 1 : 0))) ? 1 : 0))) { __pc = 5504; break; }
				
				var local1_i_1941 = 0;
				case 5568:
					var forEachSaver5568 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr6_Params;
				var forEachCounter5568 = 0
				
			case 5516: //dummy for1
				if (!(forEachCounter5568 < forEachSaver5568.values.length)) {__pc = 5508; break;}
				var local5_Param_1942 = forEachSaver5568.values[forEachCounter5568];
				
				
				case 5567:
					if (!((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local5_Param_1942).values[tmpPositionCache][0].attr9_OwnerVari) !== (-(1))) ? 1 : 0))) { __pc = 5529; break; }
				
				case 5563:
					local8_Text_Str_1927 = ((((((((((((local8_Text_Str_1927) + ("var "))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(global8_Compiler.attr5_Varis_ref[0].arrAccess(local5_Param_1942).values[tmpPositionCache][0].attr9_OwnerVari).values[tmpPositionCache][0].attr8_Name_Str))) + (" = ["))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local5_Param_1942).values[tmpPositionCache][0].attr8_Name_Str))) + ("];"))) + (func11_NewLine_Str()));
					
				local1_i_1941+=1;
				
				
			case 5529: //dummy jumper1
				;
					
				
				forEachSaver5568.values[forEachCounter5568] = local5_Param_1942;
				
				forEachCounter5568++
				__pc = 5516; break; //back jump
				
			case 5508: //dummy for
				;
					
				
				
			case 5504: //dummy jumper1
				;
					
				case 5576:
					if (!(local7_mngGoto_1934)) { __pc = 5571; break; }
				
				case 5573:
					func8_IndentUp();
					
				func8_IndentUp();
				func8_IndentUp();
				
				
			case 5571: //dummy jumper1
				;
					
				case 5608:
					var forEachSaver5608 = param4_expr.attr5_Exprs;
				var forEachCounter5608 = 0
				
			case 5583: //dummy for1
				if (!(forEachCounter5608 < forEachSaver5608.values.length)) {__pc = 5579; break;}
				var local2_Ex_1944 = forEachSaver5608.values[forEachCounter5608];
				
				
				var local7_add_Str_1945 = "";
				case 5590:
					local7_add_Str_1945 = func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local2_Ex_1944).values[tmpPositionCache][0]));
					
				case 5607:
					if (!((((TRIM_Str(local7_add_Str_1945, " \t\r\n\v\f")) !== ("")) ? 1 : 0))) { __pc = 5596; break; }
				
				case 5602:
					DIMPUSH(local8_ERes_Str_1943, CAST2STRING(local2_Ex_1944));
					
				DIMPUSH(local8_ERes_Str_1943, local7_add_Str_1945);
				
				
			case 5596: //dummy jumper1
				;
					
				
				forEachSaver5608.values[forEachCounter5608] = local2_Ex_1944;
				
				forEachCounter5608++
				__pc = 5583; break; //back jump
				
			case 5579: //dummy for
				;
					
				case 5665:
					if (!(local7_mngGoto_1934)) { __pc = 5610; break; }
				
				case 5612:
					func10_IndentDown();
					
				func10_IndentDown();
				func10_IndentDown();
				local8_Text_Str_1927 = ((local8_Text_Str_1927) + ("var __pc = "));
				case 5641:
					if (!((((BOUNDS(local8_ERes_Str_1943, 0)) > (0)) ? 1 : 0))) { __pc = 5626; break; }
				
				case 5634:
					local8_Text_Str_1927 = ((local8_Text_Str_1927) + (local8_ERes_Str_1943.arrAccess(0).values[tmpPositionCache]));
					
				
				__pc = 29648;
				break;
				
			case 5626: //dummy jumper1
				
				case 5640:
					local8_Text_Str_1927 = ((local8_Text_Str_1927) + ("0"));
					
				
				
			case 29648: //dummy jumper2
				;
					
				local8_Text_Str_1927 = ((((local8_Text_Str_1927) + (";"))) + (func11_NewLine_Str()));
				func8_IndentUp();
				local8_Text_Str_1927 = ((((local8_Text_Str_1927) + ("while(__pc >= 0) {"))) + (func11_NewLine_Str()));
				func8_IndentUp();
				local8_Text_Str_1927 = ((((local8_Text_Str_1927) + ("switch(__pc) {"))) + (func11_NewLine_Str()));
				
				
			case 5610: //dummy jumper1
				;
					
				local13_FirstText_Str_1946 = "";
				
				var local1_i_1947 = 0.0;
				case 5880:
					local1_i_1947 = 0
				
			case 5674: //dummy for1
				if (!toCheck(local1_i_1947, ((BOUNDS(local8_ERes_Str_1943, 0)) - (1)), 2)) {__pc = 5685; break;}
				
				var local7_add_Str_1948 = "", local2_Ex_1949 = 0, alias4_ExEx_ref_1950 = [new type5_TExpr()], local7_HasCase_1951 = 0;
				case 5695:
					local7_add_Str_1948 = local8_ERes_Str_1943.arrAccess(~~(((local1_i_1947) + (1)))).values[tmpPositionCache];
					
				local2_Ex_1949 = INT2STR(local8_ERes_Str_1943.arrAccess(~~(local1_i_1947)).values[tmpPositionCache]);
				alias4_ExEx_ref_1950 = global5_Exprs_ref[0].arrAccess(local2_Ex_1949).values[tmpPositionCache] /* ALIAS */;
				local7_HasCase_1951 = 0;
				case 5804:
					if (!(((((((local7_mngGoto_1934) || (global8_IsInGoto)) ? 1 : 0)) && ((((((((((((((((((((((((((((((((((local1_i_1947) === (0)) ? 1 : 0)) || ((((alias4_ExEx_ref_1950[0].attr3_Typ) === (20)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1950[0].attr3_Typ) === (21)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1950[0].attr3_Typ) === (24)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1950[0].attr3_Typ) === (25)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1950[0].attr3_Typ) === (27)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1950[0].attr3_Typ) === (38)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1950[0].attr3_Typ) === (26)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1950[0].attr3_Typ) === (29)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1950[0].attr3_Typ) === (30)) ? 1 : 0))) ? 1 : 0)) || ((((local1_i_1947) === (((BOUNDS(local8_ERes_Str_1943, 0)) - (1)))) ? 1 : 0))) ? 1 : 0))) ? 1 : 0))) { __pc = 5786; break; }
				
				case 5788:
					func8_IndentUp();
					
				local7_HasCase_1951 = 1;
				local8_Text_Str_1927 = ((((((((local8_Text_Str_1927) + ("case "))) + (CAST2STRING(local2_Ex_1949)))) + (":"))) + (func11_NewLine_Str()));
				
				
			case 5786: //dummy jumper1
				;
					
				case 5857:
					if (!(global9_DEBUGMODE)) { __pc = 5806; break; }
				
				var local7_Add_Str_1952 = "";
				case 5839:
					local7_Add_Str_1952 = (((((((("__debugInfo = \"") + (CAST2STRING(global8_Compiler.attr6_Tokens.arrAccess(global5_Exprs_ref[0].arrAccess(local2_Ex_1949).values[tmpPositionCache][0].attr5_tokID).values[tmpPositionCache].attr4_Line)))) + (":"))) + (global8_Compiler.attr6_Tokens.arrAccess(global5_Exprs_ref[0].arrAccess(local2_Ex_1949).values[tmpPositionCache][0].attr5_tokID).values[tmpPositionCache].attr8_Path_Str))) + ("\";"));
					
				local8_Text_Str_1927 = ((((local8_Text_Str_1927) + (local7_Add_Str_1952))) + (func11_NewLine_Str()));
				case 5856:
					if (!((((local13_FirstText_Str_1946) === ("")) ? 1 : 0))) { __pc = 5851; break; }
				
				case 5855:
					local13_FirstText_Str_1946 = local7_Add_Str_1952;
					
				
				
			case 5851: //dummy jumper1
				;
					
				
				
			case 5806: //dummy jumper1
				;
					
				local8_Text_Str_1927 = ((local8_Text_Str_1927) + (local7_add_Str_1948));
				local8_Text_Str_1927 = ((((local8_Text_Str_1927) + (";"))) + (func11_NewLine_Str()));
				case 5879:
					if (!(local7_HasCase_1951)) { __pc = 5871; break; }
				
				case 5873:
					func10_IndentDown();
					
				local8_Text_Str_1927 = ((local8_Text_Str_1927) + (func11_NewLine_Str()));
				
				
			case 5871: //dummy jumper1
				;
					
				
				local1_i_1947 += 2;
				__pc = 5674; break; //back jump
				
			case 5685: //dummy for
				;
					
				
				;
				case 5891:
					if (!((((local13_FirstText_Str_1946) !== ("")) ? 1 : 0))) { __pc = 5884; break; }
				
				case 5890:
					local8_Text_Str_1927 = ((local8_Text_Str_1927) + (local13_FirstText_Str_1946));
					
				
				
			case 5884: //dummy jumper1
				;
					
				local8_Text_Str_1927 = ((local8_Text_Str_1927) + (global16_CurrentUndef_Str));
				case 5957:
					if (!(local7_mngGoto_1934)) { __pc = 5898; break; }
				
				case 5906:
					local8_Text_Str_1927 = ((((local8_Text_Str_1927) + ("__pc = -1; break;"))) + (func11_NewLine_Str()));
					
				func8_IndentUp();
				local8_Text_Str_1927 = ((((local8_Text_Str_1927) + ("default:"))) + (func11_NewLine_Str()));
				func10_IndentDown();
				local8_Text_Str_1927 = ((((local8_Text_Str_1927) + ("throwError(\"Gotocounter exception pc: \"+__pc);"))) + (func11_NewLine_Str()));
				func10_IndentDown();
				local8_Text_Str_1927 = ((((local8_Text_Str_1927) + (func11_NewLine_Str()))) + ("}"));
				func10_IndentDown();
				local8_Text_Str_1927 = ((((local8_Text_Str_1927) + (func11_NewLine_Str()))) + ("}"));
				local8_Text_Str_1927 = (((((((("var __labels = {") + (func16_JSRemoveLast_Str(global12_LabelDef_Str, ", ")))) + ("};"))) + (func11_NewLine_Str()))) + (local8_Text_Str_1927));
				local8_Text_Str_1927 = ((func11_NewLine_Str()) + (local8_Text_Str_1927));
				
				
			case 5898: //dummy jumper1
				;
					
				case 5971:
					if (!((((((global8_IsInGoto) ? 0 : 1)) || (local7_mngGoto_1934)) ? 1 : 0))) { __pc = 5964; break; }
				
				case 5970:
					local8_Text_Str_1927 = (("{") + (local8_Text_Str_1927));
					
				
				
			case 5964: //dummy jumper1
				;
					
				case 6033:
					if (!((((global9_DEBUGMODE) && (local13_IsStackPusher_1935)) ? 1 : 0))) { __pc = 5975; break; }
				
				case 5977:
					func10_IndentDown();
					
				local8_Text_Str_1927 = ((((local8_Text_Str_1927) + (func11_NewLine_Str()))) + ("} catch(ex) {"));
				func8_IndentUp();
				local8_Text_Str_1927 = ((((local8_Text_Str_1927) + (func11_NewLine_Str()))) + ("if (isKnownException(ex)) throw ex;"));
				local8_Text_Str_1927 = ((((local8_Text_Str_1927) + (func11_NewLine_Str()))) + ("alert(formatError(ex));"));
				local8_Text_Str_1927 = ((((local8_Text_Str_1927) + (func11_NewLine_Str()))) + ("END();"));
				func10_IndentDown();
				local8_Text_Str_1927 = ((((local8_Text_Str_1927) + (func11_NewLine_Str()))) + ("} finally {"));
				func8_IndentUp();
				local8_Text_Str_1927 = ((((local8_Text_Str_1927) + (func11_NewLine_Str()))) + ("stackPop();"));
				func10_IndentDown();
				local8_Text_Str_1927 = ((((((local8_Text_Str_1927) + (func11_NewLine_Str()))) + ("}"))) + (func11_NewLine_Str()));
				
				
			case 5975: //dummy jumper1
				;
					
				case 6059:
					if (!((((((global8_IsInGoto) ? 0 : 1)) || (local7_mngGoto_1934)) ? 1 : 0))) { __pc = 6040; break; }
				
				case 6042:
					func10_IndentDown();
					
				local8_Text_Str_1927 = ((local8_Text_Str_1927) + (func11_NewLine_Str()));
				local8_Text_Str_1927 = ((local8_Text_Str_1927) + ("}"));
				
				__pc = 29657;
				break;
				
			case 6040: //dummy jumper1
				
				case 6058:
					local8_Text_Str_1927 = ((local8_Text_Str_1927) + (func11_NewLine_Str()));
					
				
				
			case 29657: //dummy jumper2
				;
					
				global13_VariUndef_Str = local15_BeforeUndef_Str_1940;
				global12_CurrentScope = ~~(local4_oScp_1929);
				global11_CurrentFunc = ~~(local5_oFunc_1930);
				case 6080:
					if (!(local7_mngGoto_1934)) { __pc = 6072; break; }
				
				case 6076:
					global12_LabelDef_Str = local13_oLabelDef_Str_1931;
					
				global8_IsInGoto = local9_oIsInGoto_1932;
				
				
			case 6072: //dummy jumper1
				;
					
				
				__pc = 29633;
				break;
				
			case 5242: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(1))) ? 1 : 0))) { __pc = 6082; break; }
				
				var local7_Sym_Str_1953 = "", local10_HasToBeInt_1954 = 0.0, local10_MightBeInt_1955 = 0;
				case 6092:
					local7_Sym_Str_1953 = global9_Operators_ref[0].arrAccess(param4_expr.attr2_Op).values[tmpPositionCache][0].attr7_Sym_Str;
					
				local10_HasToBeInt_1954 = 0;
				local10_MightBeInt_1955 = 0;
				
				var local16___SelectHelper5__1956 = "";
				case 6105:
					local16___SelectHelper5__1956 = local7_Sym_Str_1953;
					
				case 6170:
					if (!((((local16___SelectHelper5__1956) === ("=")) ? 1 : 0))) { __pc = 6107; break; }
				
				case 6111:
					local7_Sym_Str_1953 = "===";
					
				local10_HasToBeInt_1954 = 1;
				
				
			case 6107: //dummy jumper1
				if (!((((local16___SelectHelper5__1956) === ("<>")) ? 1 : 0))) { __pc = 6117; break; }
				
				case 6121:
					local7_Sym_Str_1953 = "!==";
					
				local10_HasToBeInt_1954 = 1;
				
				
			case 6117: //dummy jumper1
				if (!((((local16___SelectHelper5__1956) === ("OR")) ? 1 : 0))) { __pc = 6127; break; }
				
				case 6131:
					local7_Sym_Str_1953 = "||";
					
				local10_HasToBeInt_1954 = 1;
				
				
			case 6127: //dummy jumper1
				if (!((((local16___SelectHelper5__1956) === ("AND")) ? 1 : 0))) { __pc = 6137; break; }
				
				case 6141:
					local7_Sym_Str_1953 = "&&";
					
				local10_HasToBeInt_1954 = 1;
				
				
			case 6137: //dummy jumper1
				if (!((((local16___SelectHelper5__1956) === ("<")) ? 1 : 0))) { __pc = 6147; break; }
				
				case 6151:
					local10_MightBeInt_1955 = 1;
					
				
				
			case 6147: //dummy jumper1
				if (!((((local16___SelectHelper5__1956) === (">")) ? 1 : 0))) { __pc = 6153; break; }
				
				case 6157:
					local10_MightBeInt_1955 = 1;
					
				
				
			case 6153: //dummy jumper1
				if (!((((local16___SelectHelper5__1956) === (">=")) ? 1 : 0))) { __pc = 6159; break; }
				
				case 6163:
					local10_MightBeInt_1955 = 1;
					
				
				
			case 6159: //dummy jumper1
				if (!((((local16___SelectHelper5__1956) === ("<=")) ? 1 : 0))) { __pc = 6165; break; }
				
				case 6169:
					local10_MightBeInt_1955 = 1;
					
				
				
			case 6165: //dummy jumper1
				;
					
				
				;
				case 6347:
					if (!((((local10_HasToBeInt_1954) || (local10_MightBeInt_1955)) ? 1 : 0))) { __pc = 6175; break; }
				
				case 6289:
					if (!(((((((local10_MightBeInt_1955) && ((((global5_Exprs_ref[0].arrAccess(param4_expr.attr4_Left).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("string")) ? 1 : 0))) ? 1 : 0)) && ((((global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("string")) ? 1 : 0))) ? 1 : 0))) { __pc = 6202; break; }
				
				var local7_Res_Str_1957 = "";
				case 6206:
					
				var local16___SelectHelper6__1958 = "";
				case 6208:
					local16___SelectHelper6__1958 = local7_Sym_Str_1953;
					
				case 6233:
					if (!((((local16___SelectHelper6__1958) === ("<")) ? 1 : 0))) { __pc = 6210; break; }
				
				case 6214:
					local7_Res_Str_1957 = " === -1";
					
				
				
			case 6210: //dummy jumper1
				if (!((((local16___SelectHelper6__1958) === (">")) ? 1 : 0))) { __pc = 6216; break; }
				
				case 6220:
					local7_Res_Str_1957 = " === 1";
					
				
				
			case 6216: //dummy jumper1
				if (!((((local16___SelectHelper6__1958) === ("<=")) ? 1 : 0))) { __pc = 6222; break; }
				
				case 6226:
					local7_Res_Str_1957 = " <= 0";
					
				
				
			case 6222: //dummy jumper1
				if (!((((local16___SelectHelper6__1958) === (">=")) ? 1 : 0))) { __pc = 6228; break; }
				
				case 6232:
					local7_Res_Str_1957 = " >= 0";
					
				
				
			case 6228: //dummy jumper1
				;
					
				
				;
					
				local8_Text_Str_1927 = ((((((((((((((local8_Text_Str_1927) + ("((strcmp(("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_Left).values[tmpPositionCache][0]))))) + ("), ("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0]))))) + (")) "))) + (local7_Res_Str_1957))) + (" ) ? 1 : 0)"));
				
				__pc = 29661;
				break;
				
			case 6202: //dummy jumper1
				
				case 6288:
					local8_Text_Str_1927 = ((((((((((((((local8_Text_Str_1927) + ("((("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_Left).values[tmpPositionCache][0]))))) + (") "))) + (local7_Sym_Str_1953))) + (" ("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0]))))) + (")) ? 1 : 0)"));
					
				
				
			case 29661: //dummy jumper2
				;
					
				
				__pc = 29660;
				break;
				
			case 6175: //dummy jumper1
				
				var local5_l_Str_1959 = "";
				case 6298:
					local5_l_Str_1959 = func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_Left).values[tmpPositionCache][0]));
					
				case 6346:
					if (!(((((((local7_Sym_Str_1953) === ("-")) ? 1 : 0)) && ((((local5_l_Str_1959) === ("0")) ? 1 : 0))) ? 1 : 0))) { __pc = 6307; break; }
				
				case 6322:
					local8_Text_Str_1927 = ((((((local8_Text_Str_1927) + ("-("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0]))))) + (")"));
					
				
				__pc = 29663;
				break;
				
			case 6307: //dummy jumper1
				
				case 6345:
					local8_Text_Str_1927 = ((((((((((((((local8_Text_Str_1927) + ("(("))) + (local5_l_Str_1959))) + (") "))) + (local7_Sym_Str_1953))) + (" ("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0]))))) + ("))"));
					
				
				
			case 29663: //dummy jumper2
				;
					
				
				
			case 29660: //dummy jumper2
				;
					
				case 6384:
					if (!((((((((((local7_Sym_Str_1953) === ("/")) ? 1 : 0)) && ((((global5_Exprs_ref[0].arrAccess(param4_expr.attr4_Left).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("int")) ? 1 : 0))) ? 1 : 0)) && ((((global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("int")) ? 1 : 0))) ? 1 : 0))) { __pc = 6375; break; }
				
				case 6383:
					local8_Text_Str_1927 = (((("CAST2INT(") + (local8_Text_Str_1927))) + (")"));
					
				
				
			case 6375: //dummy jumper1
				;
					
				
				__pc = 29633;
				break;
				
			case 6082: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(3))) ? 1 : 0))) { __pc = 6386; break; }
				
				case 6394:
					local8_Text_Str_1927 = CAST2STRING(INTEGER(param4_expr.attr6_intval));
					
				
				__pc = 29633;
				break;
				
			case 6386: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(4))) ? 1 : 0))) { __pc = 6396; break; }
				
				case 6403:
					local8_Text_Str_1927 = CAST2STRING(param4_expr.attr8_floatval);
					
				
				__pc = 29633;
				break;
				
			case 6396: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(5))) ? 1 : 0))) { __pc = 6405; break; }
				
				case 6411:
					local8_Text_Str_1927 = param4_expr.attr10_strval_Str;
					
				
				__pc = 29633;
				break;
				
			case 6405: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(6))) ? 1 : 0))) { __pc = 6413; break; }
				
				case 6620:
					if (!((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_expr.attr4_func).values[tmpPositionCache][0].attr3_Typ) === (3)) ? 1 : 0))) { __pc = 6426; break; }
				
				var local1_P_1960 = 0, alias2_Ex_ref_1961 = [new type5_TExpr()];
				case 6436:
					local1_P_1960 = param4_expr.attr6_Params.arrAccess(-(1)).values[tmpPositionCache];
					
				alias2_Ex_ref_1961 = global5_Exprs_ref[0].arrAccess(local1_P_1960).values[tmpPositionCache] /* ALIAS */;
				case 6599:
					if (!((((alias2_Ex_ref_1961[0].attr3_Typ) === (53)) ? 1 : 0))) { __pc = 6447; break; }
				
				var local5_Found_1962 = 0, local5_typId_1963 = 0;
				case 6470:
					if (!(((func6_IsType(alias2_Ex_ref_1961[0].attr8_datatype.attr8_Name_Str)) ? 0 : 1))) { __pc = 6456; break; }
				
				case 6469:
					func5_Error((((("Internal error (Unable to find '") + (alias2_Ex_ref_1961[0].attr8_datatype.attr8_Name_Str))) + ("')")), 626, "src\CompilerPasses\Generator\JSGenerator.gbas");
					
				
				
			case 6456: //dummy jumper1
				;
					
				local5_Found_1962 = 0;
				local5_typId_1963 = global8_LastType.attr2_ID;
				case 6568:
					if (!((((local5_typId_1963) !== (-(1))) ? 1 : 0))) {__pc = 29668; break;}
				
				case 6558:
					var forEachSaver6558 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_1963).values[tmpPositionCache][0].attr7_Methods;
				var forEachCounter6558 = 0
				
			case 6498: //dummy for1
				if (!(forEachCounter6558 < forEachSaver6558.values.length)) {__pc = 6490; break;}
				var local3_Mth_1964 = forEachSaver6558.values[forEachCounter6558];
				
				
				case 6557:
					if (!((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1964).values[tmpPositionCache][0].attr9_OName_Str) === (global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_expr.attr4_func).values[tmpPositionCache][0].attr9_OName_Str)) ? 1 : 0))) { __pc = 6517; break; }
				
				var local10_Params_Str_1965 = "";
				case 6526:
					local10_Params_Str_1965 = func17_JSDoParameter_Str(param4_expr, param4_expr.attr4_func, 0);
					
				case 6538:
					if (!((((local10_Params_Str_1965) !== ("")) ? 1 : 0))) { __pc = 6531; break; }
				
				case 6537:
					local10_Params_Str_1965 = ((local10_Params_Str_1965) + (", "));
					
				
				
			case 6531: //dummy jumper1
				;
					
				local8_Text_Str_1927 = ((((((((local8_Text_Str_1927) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1964).values[tmpPositionCache][0].attr8_Name_Str))) + ("("))) + (local10_Params_Str_1965))) + ("param4_self)"));
				case 6556:
					__pc = __labels["Exit"]; break;
					
				
				
			case 6517: //dummy jumper1
				;
					
				
				forEachSaver6558.values[forEachCounter6558] = local3_Mth_1964;
				
				forEachCounter6558++
				__pc = 6498; break; //back jump
				
			case 6490: //dummy for
				;
					
				local5_typId_1963 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_1963).values[tmpPositionCache][0].attr9_Extending;
				
				__pc = 6568; break; //back jump
				
			case 29668:
				;
					
				case 6569:
					//label: Exit;
					
				
				__pc = 29666;
				break;
				
			case 6447: //dummy jumper1
				
				case 6598:
					local8_Text_Str_1927 = ((((((((((local8_Text_Str_1927) + ("("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local1_P_1960).values[tmpPositionCache][0]))))) + (")."))) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_expr.attr4_func).values[tmpPositionCache][0].attr9_OName_Str))) + (func17_JSDoParameter_Str(param4_expr, param4_expr.attr4_func, 1)));
					
				
				
			case 29666: //dummy jumper2
				;
					
				
				__pc = 29665;
				break;
				
			case 6426: //dummy jumper1
				
				case 6619:
					local8_Text_Str_1927 = ((((local8_Text_Str_1927) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_expr.attr4_func).values[tmpPositionCache][0].attr8_Name_Str))) + (func17_JSDoParameter_Str(param4_expr, param4_expr.attr4_func, 1)));
					
				
				
			case 29665: //dummy jumper2
				;
					
				
				__pc = 29633;
				break;
				
			case 6413: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(23))) ? 1 : 0))) { __pc = 6622; break; }
				
				case 6639:
					local8_Text_Str_1927 = ((((local8_Text_Str_1927) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (func17_JSDoParameter_Str(param4_expr, -(1), 1)));
					
				
				__pc = 29633;
				break;
				
			case 6622: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(9))) ? 1 : 0))) { __pc = 6641; break; }
				
				case 6655:
					local8_Text_Str_1927 = ((local8_Text_Str_1927) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_Name_Str));
					
				case 6672:
					if (!(global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr3_ref)) { __pc = 6665; break; }
				
				case 6671:
					local8_Text_Str_1927 = ((local8_Text_Str_1927) + ("[0]"));
					
				
				
			case 6665: //dummy jumper1
				;
					
				
				__pc = 29633;
				break;
				
			case 6641: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(13))) ? 1 : 0))) { __pc = 6674; break; }
				
				case 6685:
					local8_Text_Str_1927 = ((local8_Text_Str_1927) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_array).values[tmpPositionCache][0]))));
					
				case 6772:
					if (!((((BOUNDS(param4_expr.attr4_dims, 0)) !== (0)) ? 1 : 0))) { __pc = 6694; break; }
				
				var local1_s_1966 = 0, local7_Add_Str_1967 = "";
				case 6700:
					local8_Text_Str_1927 = ((local8_Text_Str_1927) + (".arrAccess("));
					
				local1_s_1966 = 0;
				local7_Add_Str_1967 = "";
				case 6764:
					var forEachSaver6764 = param4_expr.attr4_dims;
				var forEachCounter6764 = 0
				
			case 6715: //dummy for1
				if (!(forEachCounter6764 < forEachSaver6764.values.length)) {__pc = 6711; break;}
				var local1_d_1968 = forEachSaver6764.values[forEachCounter6764];
				
				
				var local1_v_1969 = 0;
				case 6725:
					if (!(local1_s_1966)) { __pc = 6718; break; }
				
				case 6724:
					local8_Text_Str_1927 = ((local8_Text_Str_1927) + (", "));
					
				
				
			case 6718: //dummy jumper1
				;
					
				local8_Text_Str_1927 = ((local8_Text_Str_1927) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local1_d_1968).values[tmpPositionCache][0]))));
				local1_s_1966 = 1;
				local1_v_1969 = func11_GetVariable(param4_expr.attr5_array, 0);
				case 6763:
					if (!(((((((local1_v_1969) !== (-(1))) ? 1 : 0)) && (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_v_1969).values[tmpPositionCache][0].attr3_ref)) ? 1 : 0))) { __pc = 6758; break; }
				
				case 6762:
					local7_Add_Str_1967 = "[0]";
					
				
				
			case 6758: //dummy jumper1
				;
					
				
				forEachSaver6764.values[forEachCounter6764] = local1_d_1968;
				
				forEachCounter6764++
				__pc = 6715; break; //back jump
				
			case 6711: //dummy for
				;
					
				local8_Text_Str_1927 = ((((local8_Text_Str_1927) + (").values[tmpPositionCache]"))) + (local7_Add_Str_1967));
				
				
			case 6694: //dummy jumper1
				;
					
				
				__pc = 29633;
				break;
				
			case 6674: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(10))) ? 1 : 0))) { __pc = 6774; break; }
				
				case 6787:
					local8_Text_Str_1927 = ((((local8_Text_Str_1927) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0]))))) + (" = "));
					
				local8_Text_Str_1927 = ((local8_Text_Str_1927) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0]))));
				case 6847:
					if (!((((global5_Exprs_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) || (func6_IsType(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) ? 1 : 0))) { __pc = 6818; break; }
				
				case 6846:
					if (!(((((((global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0].attr3_Typ) !== (35)) ? 1 : 0)) && ((((global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0].attr3_Typ) !== (36)) ? 1 : 0))) ? 1 : 0))) { __pc = 6839; break; }
				
				case 6845:
					local8_Text_Str_1927 = ((local8_Text_Str_1927) + (".clone()"));
					
				
				
			case 6839: //dummy jumper1
				;
					
				
				
			case 6818: //dummy jumper1
				;
					
				
				__pc = 29633;
				break;
				
			case 6774: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(11))) ? 1 : 0))) { __pc = 6849; break; }
				
				var local1_v_1970 = 0, local6_hasRef_1971 = 0, local4_Find_1972 = 0;
				case 6857:
					local1_v_1970 = func11_GetVariable(param4_expr.attr5_array, 0);
					
				local6_hasRef_1971 = 0;
				case 6882:
					if (!(((((((local1_v_1970) === (-(1))) ? 1 : 0)) || (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_v_1970).values[tmpPositionCache][0].attr3_ref)) ? 1 : 0))) { __pc = 6877; break; }
				
				case 6881:
					local6_hasRef_1971 = 1;
					
				
				
			case 6877: //dummy jumper1
				;
					
				local8_Text_Str_1927 = ((((((local8_Text_Str_1927) + ("DIM("))) + (func14_JSTryUnref_Str(param4_expr.attr5_array)))) + (", ["));
				local4_Find_1972 = 0;
				case 6929:
					var forEachSaver6929 = param4_expr.attr4_dims;
				var forEachCounter6929 = 0
				
			case 6905: //dummy for1
				if (!(forEachCounter6929 < forEachSaver6929.values.length)) {__pc = 6901; break;}
				var local1_D_1973 = forEachSaver6929.values[forEachCounter6929];
				
				
				case 6917:
					if (!((((local4_Find_1972) === (1)) ? 1 : 0))) { __pc = 6910; break; }
				
				case 6916:
					local8_Text_Str_1927 = ((local8_Text_Str_1927) + (", "));
					
				
				
			case 6910: //dummy jumper1
				;
					
				local8_Text_Str_1927 = ((local8_Text_Str_1927) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local1_D_1973).values[tmpPositionCache][0]))));
				local4_Find_1972 = 1;
				
				forEachSaver6929.values[forEachCounter6929] = local1_D_1973;
				
				forEachCounter6929++
				__pc = 6905; break; //back jump
				
			case 6901: //dummy for
				;
					
				local8_Text_Str_1927 = ((((((local8_Text_Str_1927) + ("], "))) + (func21_JSGetDefaultValue_Str(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_array).values[tmpPositionCache][0].attr8_datatype, local6_hasRef_1971, 1)))) + (")"));
				
				__pc = 29633;
				break;
				
			case 6849: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(12))) ? 1 : 0))) { __pc = 6949; break; }
				
				var local1_v_1974 = 0, local6_hasRef_1975 = 0, local4_Find_1976 = 0;
				case 6957:
					local1_v_1974 = func11_GetVariable(param4_expr.attr5_array, 0);
					
				local6_hasRef_1975 = 0;
				case 6982:
					if (!(((((((local1_v_1974) === (-(1))) ? 1 : 0)) || (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_v_1974).values[tmpPositionCache][0].attr3_ref)) ? 1 : 0))) { __pc = 6977; break; }
				
				case 6981:
					local6_hasRef_1975 = 1;
					
				
				
			case 6977: //dummy jumper1
				;
					
				local8_Text_Str_1927 = ((((((local8_Text_Str_1927) + ("REDIM("))) + (func14_JSTryUnref_Str(param4_expr.attr5_array)))) + (", ["));
				local4_Find_1976 = 0;
				case 7029:
					var forEachSaver7029 = param4_expr.attr4_dims;
				var forEachCounter7029 = 0
				
			case 7005: //dummy for1
				if (!(forEachCounter7029 < forEachSaver7029.values.length)) {__pc = 7001; break;}
				var local1_D_1977 = forEachSaver7029.values[forEachCounter7029];
				
				
				case 7017:
					if (!((((local4_Find_1976) === (1)) ? 1 : 0))) { __pc = 7010; break; }
				
				case 7016:
					local8_Text_Str_1927 = ((local8_Text_Str_1927) + (", "));
					
				
				
			case 7010: //dummy jumper1
				;
					
				local8_Text_Str_1927 = ((local8_Text_Str_1927) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local1_D_1977).values[tmpPositionCache][0]))));
				local4_Find_1976 = 1;
				
				forEachSaver7029.values[forEachCounter7029] = local1_D_1977;
				
				forEachCounter7029++
				__pc = 7005; break; //back jump
				
			case 7001: //dummy for
				;
					
				local8_Text_Str_1927 = ((((((local8_Text_Str_1927) + ("], "))) + (func21_JSGetDefaultValue_Str(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_array).values[tmpPositionCache][0].attr8_datatype, local6_hasRef_1975, 1)))) + (" )"));
				
				__pc = 29633;
				break;
				
			case 6949: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(15))) ? 1 : 0))) { __pc = 7049; break; }
				
				var local4_cast_1978 = 0;
				case 7053:
					local4_cast_1978 = 1;
					
				case 7135:
					if (!((((global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr3_Typ) === (4)) ? 1 : 0))) { __pc = 7064; break; }
				
				var local5_f_Str_1979 = "";
				case 7069:
					local4_cast_1978 = 0;
					
				local5_f_Str_1979 = ((CAST2STRING(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr8_floatval)) + (""));
				
				var local1_i_1980 = 0.0;
				case 7109:
					local1_i_1980 = 0
				
			case 7087: //dummy for1
				if (!toCheck(local1_i_1980, (((local5_f_Str_1979).length) - (1)), 1)) {__pc = 7094; break;}
				
				case 7108:
					if (!((((ASC(local5_f_Str_1979, ~~(local1_i_1980))) === (ASC(".", 0))) ? 1 : 0))) { __pc = 7102; break; }
				
				case 7106:
					local4_cast_1978 = 1;
					
				case 7107:
					__pc = 7094; break;
					
				
				
			case 7102: //dummy jumper1
				;
					
				
				local1_i_1980 += 1;
				__pc = 7087; break; //back jump
				
			case 7094: //dummy for
				;
					
				
				;
				
				
			case 7064: //dummy jumper1
				if (!(((((((global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("float")) ? 1 : 0)) && ((((global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0))) ? 1 : 0))) { __pc = 7133; break; }
				
				
				
			case 7133: //dummy jumper1
				;
					
				case 7225:
					if (!(local4_cast_1978)) { __pc = 7137; break; }
				
				case 7148:
					
				var local16___SelectHelper7__1981 = "";
				case 7150:
					local16___SelectHelper7__1981 = global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str;
					
				case 7213:
					if (!((((local16___SelectHelper7__1981) === ("int")) ? 1 : 0))) { __pc = 7152; break; }
				
				case 7163:
					local8_Text_Str_1927 = ((local8_Text_Str_1927) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))));
					
				
				__pc = 29684;
				break;
				
			case 7152: //dummy jumper1
				if (!((((local16___SelectHelper7__1981) === ("float")) ? 1 : 0))) { __pc = 7165; break; }
				
				case 7180:
					local8_Text_Str_1927 = ((((((local8_Text_Str_1927) + ("~~("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")"));
					
				
				__pc = 29684;
				break;
				
			case 7165: //dummy jumper1
				if (!((((local16___SelectHelper7__1981) === ("string")) ? 1 : 0))) { __pc = 7182; break; }
				
				case 7197:
					local8_Text_Str_1927 = ((((((local8_Text_Str_1927) + ("INT2STR("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")"));
					
				
				__pc = 29684;
				break;
				
			case 7182: //dummy jumper1
				
				case 7212:
					local8_Text_Str_1927 = ((((((local8_Text_Str_1927) + ("CAST2INT("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")"));
					
				
				
			case 29684: //dummy jumper2
				;
					
				
				;
					
				
				__pc = 29683;
				break;
				
			case 7137: //dummy jumper1
				
				case 7224:
					local8_Text_Str_1927 = ((local8_Text_Str_1927) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))));
					
				
				
			case 29683: //dummy jumper2
				;
					
				
				__pc = 29633;
				break;
				
			case 7049: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(16))) ? 1 : 0))) { __pc = 7227; break; }
				
				case 7322:
					if (!((((global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr3_Typ) === (3)) ? 1 : 0))) { __pc = 7238; break; }
				
				case 7249:
					local8_Text_Str_1927 = ((local8_Text_Str_1927) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))));
					
				
				__pc = 29685;
				break;
				
			case 7238: //dummy jumper1
				
				case 7260:
					
				var local16___SelectHelper8__1982 = "";
				case 7262:
					local16___SelectHelper8__1982 = global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str;
					
				case 7321:
					if (!((((local16___SelectHelper8__1982) === ("int")) ? 1 : 0))) { __pc = 7264; break; }
				
				case 7275:
					local8_Text_Str_1927 = ((local8_Text_Str_1927) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))));
					
				
				__pc = 29686;
				break;
				
			case 7264: //dummy jumper1
				if (!((((local16___SelectHelper8__1982) === ("float")) ? 1 : 0))) { __pc = 7277; break; }
				
				case 7288:
					local8_Text_Str_1927 = ((local8_Text_Str_1927) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))));
					
				
				__pc = 29686;
				break;
				
			case 7277: //dummy jumper1
				if (!((((local16___SelectHelper8__1982) === ("string")) ? 1 : 0))) { __pc = 7290; break; }
				
				case 7305:
					local8_Text_Str_1927 = ((((((local8_Text_Str_1927) + ("FLOAT2STR("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")"));
					
				
				__pc = 29686;
				break;
				
			case 7290: //dummy jumper1
				
				case 7320:
					local8_Text_Str_1927 = ((((((local8_Text_Str_1927) + ("CAST2FLOAT("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")"));
					
				
				
			case 29686: //dummy jumper2
				;
					
				
				;
					
				
				
			case 29685: //dummy jumper2
				;
					
				
				__pc = 29633;
				break;
				
			case 7227: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(17))) ? 1 : 0))) { __pc = 7324; break; }
				
				case 7339:
					local8_Text_Str_1927 = ((((((local8_Text_Str_1927) + ("CAST2STRING("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")"));
					
				
				__pc = 29633;
				break;
				
			case 7324: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(18))) ? 1 : 0))) { __pc = 7341; break; }
				
				case 7361:
					local8_Text_Str_1927 = ((((((local8_Text_Str_1927) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + ("."))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_nextExpr).values[tmpPositionCache][0]))));
					
				
				__pc = 29633;
				break;
				
			case 7341: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(19))) ? 1 : 0))) { __pc = 7363; break; }
				
				var local1_F_1983 = 0;
				case 7368:
					local1_F_1983 = 0;
					
				
				var local16___SelectHelper9__1984 = 0;
				case 7379:
					local16___SelectHelper9__1984 = global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr3_Typ;
					
				case 7398:
					if (!((((local16___SelectHelper9__1984) === (~~(3))) ? 1 : 0))) { __pc = 7381; break; }
				
				case 7385:
					local1_F_1983 = 1;
					
				
				
			case 7381: //dummy jumper1
				if (!((((local16___SelectHelper9__1984) === (~~(4))) ? 1 : 0))) { __pc = 7387; break; }
				
				case 7391:
					local1_F_1983 = 1;
					
				
				
			case 7387: //dummy jumper1
				if (!((((local16___SelectHelper9__1984) === (~~(5))) ? 1 : 0))) { __pc = 7393; break; }
				
				case 7397:
					local1_F_1983 = 1;
					
				
				
			case 7393: //dummy jumper1
				;
					
				
				;
				case 7412:
					if (!(((((global13_VariUndef_Str).length) > (0)) ? 1 : 0))) { __pc = 7403; break; }
				
				case 7411:
					local8_Text_Str_1927 = ((((local8_Text_Str_1927) + (global13_VariUndef_Str))) + (func11_NewLine_Str()));
					
				
				
			case 7403: //dummy jumper1
				;
					
				case 7439:
					if (!(local1_F_1983)) { __pc = 7414; break; }
				
				case 7425:
					local8_Text_Str_1927 = ((((local8_Text_Str_1927) + ("return "))) + (func14_JSTryUnref_Str(param4_expr.attr4_expr)));
					
				
				__pc = 29689;
				break;
				
			case 7414: //dummy jumper1
				
				case 7438:
					local8_Text_Str_1927 = ((((((local8_Text_Str_1927) + ("return tryClone("))) + (func14_JSTryUnref_Str(param4_expr.attr4_expr)))) + (")"));
					
				
				
			case 29689: //dummy jumper2
				;
					
				
				__pc = 29633;
				break;
				
			case 7363: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(22))) ? 1 : 0))) { __pc = 7441; break; }
				
				var local8_Name_Str_1985 = "", local5_Found_1986 = 0;
				case 7452:
					local8_Name_Str_1985 = REPLACE_Str(param4_expr.attr8_datatype.attr8_Name_Str, "$", "_Str");
					
				case 7481:
					var forEachSaver7481 = global8_Compiler.attr5_Funcs_ref[0];
				var forEachCounter7481 = 0
				
			case 7460: //dummy for1
				if (!(forEachCounter7481 < forEachSaver7481.values.length)) {__pc = 7456; break;}
				var local4_Func_ref_1987 = forEachSaver7481.values[forEachCounter7481];
				
				
				case 7480:
					if (!((((local4_Func_ref_1987[0].attr9_OName_Str) === (local8_Name_Str_1985)) ? 1 : 0))) { __pc = 7467; break; }
				
				case 7475:
					local8_Text_Str_1927 = ((local8_Text_Str_1927) + (local4_Func_ref_1987[0].attr8_Name_Str));
					
				local5_Found_1986 = 1;
				case 7479:
					__pc = 7456; break;
					
				
				
			case 7467: //dummy jumper1
				;
					
				
				forEachSaver7481.values[forEachCounter7481] = local4_Func_ref_1987;
				
				forEachCounter7481++
				__pc = 7460; break; //back jump
				
			case 7456: //dummy for
				;
					
				case 7491:
					if (!(((local5_Found_1986) ? 0 : 1))) { __pc = 7484; break; }
				
				case 7490:
					local8_Text_Str_1927 = ((local8_Text_Str_1927) + (local8_Name_Str_1985));
					
				
				
			case 7484: //dummy jumper1
				;
					
				
				__pc = 29633;
				break;
				
			case 7441: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(24))) ? 1 : 0))) { __pc = 7493; break; }
				
				case 7756:
					if (!(global8_IsInGoto)) { __pc = 7496; break; }
				
				var local5_dummy_1988 = 0;
				case 7500:
					local5_dummy_1988 = global11_LastDummyID;
					
				global11_LastDummyID+=1;
				
				var local1_i_1989 = 0.0;
				case 7617:
					local1_i_1989 = 0
				
			case 7509: //dummy for1
				if (!toCheck(local1_i_1989, ((BOUNDS(param4_expr.attr10_Conditions, 0)) - (1)), 1)) {__pc = 7520; break;}
				
				case 7550:
					local8_Text_Str_1927 = ((((((((((((local8_Text_Str_1927) + ("if (!("))) + (func23_ConditionJSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr10_Conditions.arrAccess(~~(local1_i_1989)).values[tmpPositionCache]).values[tmpPositionCache][0]))))) + (")) { __pc = "))) + (CAST2STRING(param4_expr.attr10_Conditions.arrAccess(~~(local1_i_1989)).values[tmpPositionCache])))) + ("; break; }"))) + (func11_NewLine_Str()));
					
				local8_Text_Str_1927 = ((local8_Text_Str_1927) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr6_Scopes.arrAccess(~~(local1_i_1989)).values[tmpPositionCache]).values[tmpPositionCache][0]))));
				case 7592:
					if (!((((param4_expr.attr9_elseScope) !== (-(1))) ? 1 : 0))) { __pc = 7571; break; }
				
				case 7584:
					local8_Text_Str_1927 = ((((((((local8_Text_Str_1927) + ("__pc = "))) + (CAST2STRING(local5_dummy_1988)))) + (";"))) + (func11_NewLine_Str()));
					
				local8_Text_Str_1927 = ((((local8_Text_Str_1927) + ("break;"))) + (func11_NewLine_Str()));
				
				
			case 7571: //dummy jumper1
				;
					
				func10_IndentDown();
				local8_Text_Str_1927 = ((local8_Text_Str_1927) + (func11_NewLine_Str()));
				func8_IndentUp();
				local8_Text_Str_1927 = ((((((((local8_Text_Str_1927) + ("case "))) + (CAST2STRING(param4_expr.attr10_Conditions.arrAccess(~~(local1_i_1989)).values[tmpPositionCache])))) + (": //dummy jumper1"))) + (func11_NewLine_Str()));
				
				local1_i_1989 += 1;
				__pc = 7509; break; //back jump
				
			case 7520: //dummy for
				;
					
				
				;
				case 7656:
					if (!((((param4_expr.attr9_elseScope) !== (-(1))) ? 1 : 0))) { __pc = 7625; break; }
				
				case 7636:
					local8_Text_Str_1927 = ((local8_Text_Str_1927) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr9_elseScope).values[tmpPositionCache][0]))));
					
				func10_IndentDown();
				local8_Text_Str_1927 = ((local8_Text_Str_1927) + (func11_NewLine_Str()));
				func8_IndentUp();
				local8_Text_Str_1927 = ((((((((local8_Text_Str_1927) + ("case "))) + (CAST2STRING(local5_dummy_1988)))) + (": //dummy jumper2"))) + (func11_NewLine_Str()));
				
				
			case 7625: //dummy jumper1
				;
					
				
				__pc = 29692;
				break;
				
			case 7496: //dummy jumper1
				
				var local8_IsSwitch_1990 = 0;
				case 7661:
					local8_IsSwitch_1990 = 0;
					
				case 7755:
					if (!(local8_IsSwitch_1990)) { __pc = 7664; break; }
				
				
				__pc = 29695;
				break;
				
			case 7664: //dummy jumper1
				
				case 7667:
					
				var local1_i_1991 = 0.0;
				case 7732:
					local1_i_1991 = 0
				
			case 7671: //dummy for1
				if (!toCheck(local1_i_1991, ((BOUNDS(param4_expr.attr10_Conditions, 0)) - (1)), 1)) {__pc = 7682; break;}
				
				case 7701:
					if (!((((local1_i_1991) === (0)) ? 1 : 0))) { __pc = 7688; break; }
				
				case 7694:
					local8_Text_Str_1927 = ((local8_Text_Str_1927) + ("if"));
					
				
				__pc = 29696;
				break;
				
			case 7688: //dummy jumper1
				
				case 7700:
					local8_Text_Str_1927 = ((local8_Text_Str_1927) + (" else if"));
					
				
				
			case 29696: //dummy jumper2
				;
					
				local8_Text_Str_1927 = ((((((local8_Text_Str_1927) + (" ("))) + (func23_ConditionJSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr10_Conditions.arrAccess(~~(local1_i_1991)).values[tmpPositionCache]).values[tmpPositionCache][0]))))) + (") "));
				local8_Text_Str_1927 = ((local8_Text_Str_1927) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr6_Scopes.arrAccess(~~(local1_i_1991)).values[tmpPositionCache]).values[tmpPositionCache][0]))));
				
				local1_i_1991 += 1;
				__pc = 7671; break; //back jump
				
			case 7682: //dummy for
				;
					
				
				;
					
				case 7754:
					if (!((((param4_expr.attr9_elseScope) !== (-(1))) ? 1 : 0))) { __pc = 7740; break; }
				
				case 7753:
					local8_Text_Str_1927 = ((((local8_Text_Str_1927) + (" else "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr9_elseScope).values[tmpPositionCache][0]))));
					
				
				
			case 7740: //dummy jumper1
				;
					
				
				
			case 29695: //dummy jumper2
				;
					
				
				
			case 29692: //dummy jumper2
				;
					
				
				__pc = 29633;
				break;
				
			case 7493: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(25))) ? 1 : 0))) { __pc = 7758; break; }
				
				case 7877:
					if (!(global8_IsInGoto)) { __pc = 7761; break; }
				
				var local6_TmpBID_1992 = 0, local6_TmpCID_1993 = 0;
				case 7765:
					local6_TmpBID_1992 = global11_LoopBreakID;
					
				local6_TmpCID_1993 = global14_LoopContinueID;
				global11_LoopBreakID = global11_LastDummyID;
				global14_LoopContinueID = param4_expr.attr2_ID;
				global11_LastDummyID+=1;
				local8_Text_Str_1927 = ((((((((((((local8_Text_Str_1927) + ("if (!("))) + (func23_ConditionJSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")) {__pc = "))) + (CAST2STRING(global11_LoopBreakID)))) + ("; break;}"))) + (func11_NewLine_Str()));
				local8_Text_Str_1927 = ((local8_Text_Str_1927) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
				local8_Text_Str_1927 = ((((((((local8_Text_Str_1927) + ("__pc = "))) + (CAST2STRING(param4_expr.attr2_ID)))) + ("; break; //back jump"))) + (func11_NewLine_Str()));
				func10_IndentDown();
				local8_Text_Str_1927 = ((local8_Text_Str_1927) + (func11_NewLine_Str()));
				func8_IndentUp();
				local8_Text_Str_1927 = ((((((((local8_Text_Str_1927) + ("case "))) + (CAST2STRING(global11_LoopBreakID)))) + (":"))) + (func11_NewLine_Str()));
				global11_LoopBreakID = local6_TmpBID_1992;
				global14_LoopContinueID = local6_TmpCID_1993;
				
				__pc = 29698;
				break;
				
			case 7761: //dummy jumper1
				
				case 7866:
					local8_Text_Str_1927 = ((((((local8_Text_Str_1927) + ("while ("))) + (func23_ConditionJSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (") "));
					
				local8_Text_Str_1927 = ((local8_Text_Str_1927) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
				
				
			case 29698: //dummy jumper2
				;
					
				
				__pc = 29633;
				break;
				
			case 7758: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(26))) ? 1 : 0))) { __pc = 7879; break; }
				
				case 8003:
					if (!(global8_IsInGoto)) { __pc = 7882; break; }
				
				var local6_TmpBID_1994 = 0, local6_TmpCID_1995 = 0;
				case 7886:
					local6_TmpBID_1994 = global11_LoopBreakID;
					
				local6_TmpCID_1995 = global14_LoopContinueID;
				global11_LoopBreakID = global11_LastDummyID;
				global14_LoopContinueID = param4_expr.attr2_ID;
				global11_LastDummyID+=1;
				local8_Text_Str_1927 = ((local8_Text_Str_1927) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
				local8_Text_Str_1927 = ((((((((((((local8_Text_Str_1927) + ("if ("))) + (func23_ConditionJSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (") {__pc = "))) + (CAST2STRING(global11_LoopBreakID)))) + ("; break;}"))) + (func11_NewLine_Str()));
				local8_Text_Str_1927 = ((((((((local8_Text_Str_1927) + ("__pc = "))) + (CAST2STRING(param4_expr.attr2_ID)))) + ("; break; //back jump"))) + (func11_NewLine_Str()));
				func10_IndentDown();
				local8_Text_Str_1927 = ((local8_Text_Str_1927) + (func11_NewLine_Str()));
				func8_IndentUp();
				local8_Text_Str_1927 = ((((((((local8_Text_Str_1927) + ("case "))) + (CAST2STRING(global11_LoopBreakID)))) + (": //dummy repeat"))) + (func11_NewLine_Str()));
				global11_LoopBreakID = local6_TmpBID_1994;
				global14_LoopContinueID = local6_TmpCID_1995;
				
				__pc = 29699;
				break;
				
			case 7882: //dummy jumper1
				
				case 7978:
					local8_Text_Str_1927 = ((local8_Text_Str_1927) + ("do "));
					
				local8_Text_Str_1927 = ((local8_Text_Str_1927) + (func23_ConditionJSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
				local8_Text_Str_1927 = ((((((local8_Text_Str_1927) + (" while (!("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + ("))"));
				
				
			case 29699: //dummy jumper2
				;
					
				
				__pc = 29633;
				break;
				
			case 7879: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(27))) ? 1 : 0))) { __pc = 8005; break; }
				
				var local13_CheckComm_Str_1996 = "";
				case 8020:
					if (!(param4_expr.attr5_hasTo)) { __pc = 8011; break; }
				
				case 8015:
					local13_CheckComm_Str_1996 = "toCheck";
					
				
				__pc = 29700;
				break;
				
			case 8011: //dummy jumper1
				
				case 8019:
					local13_CheckComm_Str_1996 = "untilCheck";
					
				
				
			case 29700: //dummy jumper2
				;
					
				case 8284:
					if (!(global8_IsInGoto)) { __pc = 8022; break; }
				
				var local6_TmpBID_1997 = 0, local6_TmpCID_1998 = 0;
				case 8026:
					local6_TmpBID_1997 = global11_LoopBreakID;
					
				local6_TmpCID_1998 = global14_LoopContinueID;
				global11_LoopBreakID = param4_expr.attr8_stepExpr;
				global14_LoopContinueID = param4_expr.attr7_varExpr;
				local8_Text_Str_1927 = ((((local8_Text_Str_1927) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr7_varExpr).values[tmpPositionCache][0]))))) + (func11_NewLine_Str()));
				func10_IndentDown();
				local8_Text_Str_1927 = ((local8_Text_Str_1927) + (func11_NewLine_Str()));
				func8_IndentUp();
				local8_Text_Str_1927 = ((((((((local8_Text_Str_1927) + ("case "))) + (CAST2STRING(param4_expr.attr7_varExpr)))) + (": //dummy for1"))) + (func11_NewLine_Str()));
				local8_Text_Str_1927 = ((((((((((((((((((((((((local8_Text_Str_1927) + ("if (!"))) + (local13_CheckComm_Str_1996))) + ("("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(param4_expr.attr7_varExpr).values[tmpPositionCache][0].attr4_vari).values[tmpPositionCache][0]))))) + (", "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr6_toExpr).values[tmpPositionCache][0]))))) + (", "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_stepExpr).values[tmpPositionCache][0]))))) + (")) {__pc = "))) + (CAST2STRING(param4_expr.attr8_stepExpr)))) + ("; break;}"))) + (func11_NewLine_Str()));
				local8_Text_Str_1927 = ((local8_Text_Str_1927) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
				local8_Text_Str_1927 = ((((((((((local8_Text_Str_1927) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(param4_expr.attr7_varExpr).values[tmpPositionCache][0].attr4_vari).values[tmpPositionCache][0]))))) + (" += "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_stepExpr).values[tmpPositionCache][0]))))) + (";"))) + (func11_NewLine_Str()));
				local8_Text_Str_1927 = ((((((((local8_Text_Str_1927) + ("__pc = "))) + (CAST2STRING(param4_expr.attr7_varExpr)))) + ("; break; //back jump"))) + (func11_NewLine_Str()));
				func10_IndentDown();
				local8_Text_Str_1927 = ((local8_Text_Str_1927) + (func11_NewLine_Str()));
				func8_IndentUp();
				local8_Text_Str_1927 = ((((((((local8_Text_Str_1927) + ("case "))) + (CAST2STRING(param4_expr.attr8_stepExpr)))) + (": //dummy for"))) + (func11_NewLine_Str()));
				global11_LoopBreakID = local6_TmpBID_1997;
				global14_LoopContinueID = local6_TmpCID_1998;
				
				__pc = 29701;
				break;
				
			case 8022: //dummy jumper1
				
				case 8273:
					local8_Text_Str_1927 = ((((((((((((((((((((((((((((((local8_Text_Str_1927) + ("for ("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr7_varExpr).values[tmpPositionCache][0]))))) + (";"))) + (local13_CheckComm_Str_1996))) + ("("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(param4_expr.attr7_varExpr).values[tmpPositionCache][0].attr4_vari).values[tmpPositionCache][0]))))) + (", "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr6_toExpr).values[tmpPositionCache][0]))))) + (", "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_stepExpr).values[tmpPositionCache][0]))))) + (");"))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(param4_expr.attr7_varExpr).values[tmpPositionCache][0].attr4_vari).values[tmpPositionCache][0]))))) + (" += "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_stepExpr).values[tmpPositionCache][0]))))) + (") "));
					
				local8_Text_Str_1927 = ((local8_Text_Str_1927) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
				
				
			case 29701: //dummy jumper2
				;
					
				
				__pc = 29633;
				break;
				
			case 8005: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(38))) ? 1 : 0))) { __pc = 8286; break; }
				
				var local1_c_1999 = 0, local11_varName_Str_2000 = "", local13_StartText_Str_2001 = "", local12_CondText_Str_2002 = "", local11_IncText_Str_2003 = "", local13_EachBegin_Str_2004 = "", local11_EachEnd_Str_2005 = "";
				case 8292:
					global14_ForEachCounter = param4_expr.attr2_ID;
					
				local1_c_1999 = global14_ForEachCounter;
				local8_Text_Str_1927 = ((((((((((((local8_Text_Str_1927) + ("var forEachSaver"))) + (CAST2STRING(local1_c_1999)))) + (" = "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr6_inExpr).values[tmpPositionCache][0]))))) + (";"))) + (func11_NewLine_Str()));
				local11_varName_Str_2000 = func16_JSRemoveLast_Str(func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr7_varExpr).values[tmpPositionCache][0])), "[0]");
				local13_StartText_Str_2001 = (((("var forEachCounter") + (CAST2STRING(local1_c_1999)))) + (" = 0"));
				local12_CondText_Str_2002 = (((((((("forEachCounter") + (CAST2STRING(local1_c_1999)))) + (" < forEachSaver"))) + (CAST2STRING(local1_c_1999)))) + (".values.length"));
				local11_IncText_Str_2003 = (((("forEachCounter") + (CAST2STRING(local1_c_1999)))) + ("++"));
				local13_EachBegin_Str_2004 = (((((((((((((("var ") + (local11_varName_Str_2000))) + (" = forEachSaver"))) + (CAST2STRING(local1_c_1999)))) + (".values[forEachCounter"))) + (CAST2STRING(local1_c_1999)))) + ("];"))) + (func11_NewLine_Str()));
				local11_EachEnd_Str_2005 = (((((((((((((("forEachSaver") + (CAST2STRING(local1_c_1999)))) + (".values[forEachCounter"))) + (CAST2STRING(local1_c_1999)))) + ("] = "))) + (local11_varName_Str_2000))) + (";"))) + (func11_NewLine_Str()));
				case 8590:
					if (!(global8_IsInGoto)) { __pc = 8401; break; }
				
				var local6_TmpBID_2006 = 0, local6_TmpCID_2007 = 0;
				case 8405:
					local6_TmpBID_2006 = global11_LoopBreakID;
					
				local6_TmpCID_2007 = global14_LoopContinueID;
				global11_LoopBreakID = param4_expr.attr7_varExpr;
				global14_LoopContinueID = param4_expr.attr6_inExpr;
				local8_Text_Str_1927 = ((((local8_Text_Str_1927) + (local13_StartText_Str_2001))) + (func11_NewLine_Str()));
				func10_IndentDown();
				local8_Text_Str_1927 = ((local8_Text_Str_1927) + (func11_NewLine_Str()));
				func8_IndentUp();
				local8_Text_Str_1927 = ((((((((local8_Text_Str_1927) + ("case "))) + (CAST2STRING(param4_expr.attr6_inExpr)))) + (": //dummy for1"))) + (func11_NewLine_Str()));
				local8_Text_Str_1927 = ((((((((((((local8_Text_Str_1927) + ("if (!("))) + (local12_CondText_Str_2002))) + (")) {__pc = "))) + (CAST2STRING(param4_expr.attr7_varExpr)))) + ("; break;}"))) + (func11_NewLine_Str()));
				local8_Text_Str_1927 = ((((local8_Text_Str_1927) + (local13_EachBegin_Str_2004))) + (func11_NewLine_Str()));
				local8_Text_Str_1927 = ((local8_Text_Str_1927) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
				local8_Text_Str_1927 = ((((local8_Text_Str_1927) + (local11_EachEnd_Str_2005))) + (func11_NewLine_Str()));
				local8_Text_Str_1927 = ((((local8_Text_Str_1927) + (local11_IncText_Str_2003))) + (func11_NewLine_Str()));
				local8_Text_Str_1927 = ((((((((local8_Text_Str_1927) + ("__pc = "))) + (CAST2STRING(param4_expr.attr6_inExpr)))) + ("; break; //back jump"))) + (func11_NewLine_Str()));
				func10_IndentDown();
				local8_Text_Str_1927 = ((local8_Text_Str_1927) + (func11_NewLine_Str()));
				func8_IndentUp();
				local8_Text_Str_1927 = ((((((((local8_Text_Str_1927) + ("case "))) + (CAST2STRING(param4_expr.attr7_varExpr)))) + (": //dummy for"))) + (func11_NewLine_Str()));
				global11_LoopBreakID = local6_TmpBID_2006;
				global14_LoopContinueID = local6_TmpCID_2007;
				
				__pc = 29702;
				break;
				
			case 8401: //dummy jumper1
				
				case 8540:
					func8_IndentUp();
					
				local8_Text_Str_1927 = ((((((((((((((((local8_Text_Str_1927) + ("for("))) + (local13_StartText_Str_2001))) + (" ; "))) + (local12_CondText_Str_2002))) + (" ; "))) + (local11_IncText_Str_2003))) + (") {"))) + (func11_NewLine_Str()));
				local8_Text_Str_1927 = ((local8_Text_Str_1927) + (local13_EachBegin_Str_2004));
				local8_Text_Str_1927 = ((((local8_Text_Str_1927) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))))) + (func11_NewLine_Str()));
				local8_Text_Str_1927 = ((local8_Text_Str_1927) + (local11_EachEnd_Str_2005));
				func10_IndentDown();
				local8_Text_Str_1927 = ((((local8_Text_Str_1927) + (func11_NewLine_Str()))) + ("}"));
				
				
			case 29702: //dummy jumper2
				;
					
				
				__pc = 29633;
				break;
				
			case 8286: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(30))) ? 1 : 0))) { __pc = 8592; break; }
				
				case 8613:
					if (!(global8_IsInGoto)) { __pc = 8595; break; }
				
				case 8606:
					local8_Text_Str_1927 = ((((((local8_Text_Str_1927) + ("__pc = "))) + (CAST2STRING(global14_LoopContinueID)))) + ("; break"));
					
				
				__pc = 29703;
				break;
				
			case 8595: //dummy jumper1
				
				case 8612:
					local8_Text_Str_1927 = ((local8_Text_Str_1927) + ("continue"));
					
				
				
			case 29703: //dummy jumper2
				;
					
				
				__pc = 29633;
				break;
				
			case 8592: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(29))) ? 1 : 0))) { __pc = 8615; break; }
				
				case 8636:
					if (!(global8_IsInGoto)) { __pc = 8618; break; }
				
				case 8629:
					local8_Text_Str_1927 = ((((((local8_Text_Str_1927) + ("__pc = "))) + (CAST2STRING(global11_LoopBreakID)))) + ("; break"));
					
				
				__pc = 29704;
				break;
				
			case 8618: //dummy jumper1
				
				case 8635:
					local8_Text_Str_1927 = ((local8_Text_Str_1927) + ("break"));
					
				
				
			case 29704: //dummy jumper2
				;
					
				
				__pc = 29633;
				break;
				
			case 8615: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(31))) ? 1 : 0))) { __pc = 8638; break; }
				
				var local9_oIsInGoto_2008 = 0;
				case 8642:
					local9_oIsInGoto_2008 = global8_IsInGoto;
					
				global8_IsInGoto = 0;
				local8_Text_Str_1927 = ((local8_Text_Str_1927) + ("try "));
				local8_Text_Str_1927 = ((local8_Text_Str_1927) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
				func8_IndentUp();
				local8_Text_Str_1927 = ((((((((local8_Text_Str_1927) + (" catch ("))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_Name_Str))) + (") {"))) + (func11_NewLine_Str()));
				local8_Text_Str_1927 = ((((((((((((((((((local8_Text_Str_1927) + ("if ("))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_Name_Str))) + (" instanceof OTTException) "))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_Name_Str))) + (" = "))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_Name_Str))) + (".getText(); else throwError("))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_Name_Str))) + (");"));
				local8_Text_Str_1927 = ((local8_Text_Str_1927) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_catchScp).values[tmpPositionCache][0]))));
				func10_IndentDown();
				local8_Text_Str_1927 = ((((local8_Text_Str_1927) + (func11_NewLine_Str()))) + ("}"));
				global8_IsInGoto = local9_oIsInGoto_2008;
				
				__pc = 29633;
				break;
				
			case 8638: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(32))) ? 1 : 0))) { __pc = 8758; break; }
				
				case 8798:
					local8_Text_Str_1927 = ((((((((((((((local8_Text_Str_1927) + ("throw new OTTException("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (", \""))) + (global8_Compiler.attr6_Tokens.arrAccess(param4_expr.attr5_tokID).values[tmpPositionCache].attr8_Path_Str))) + ("\", "))) + (CAST2STRING(global8_Compiler.attr6_Tokens.arrAccess(param4_expr.attr5_tokID).values[tmpPositionCache].attr4_Line)))) + (")"));
					
				
				__pc = 29633;
				break;
				
			case 8758: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(33))) ? 1 : 0))) { __pc = 8800; break; }
				
				case 8812:
					local8_Text_Str_1927 = ((((((local8_Text_Str_1927) + ("RESTORE(datablock_"))) + (param4_expr.attr8_Name_Str))) + (")"));
					
				
				__pc = 29633;
				break;
				
			case 8800: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(34))) ? 1 : 0))) { __pc = 8814; break; }
				
				var local1_i_2009 = 0.0;
				case 8819:
					local1_i_2009 = 0;
					
				case 8862:
					var forEachSaver8862 = param4_expr.attr5_Reads;
				var forEachCounter8862 = 0
				
			case 8826: //dummy for1
				if (!(forEachCounter8862 < forEachSaver8862.values.length)) {__pc = 8822; break;}
				var local1_R_2010 = forEachSaver8862.values[forEachCounter8862];
				
				
				case 8837:
					local8_Text_Str_1927 = ((((local8_Text_Str_1927) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local1_R_2010).values[tmpPositionCache][0]))))) + (" = READ()"));
					
				case 8858:
					if (!((((local1_i_2009) < (((BOUNDS(param4_expr.attr5_Reads, 0)) - (1)))) ? 1 : 0))) { __pc = 8849; break; }
				
				case 8857:
					local8_Text_Str_1927 = ((((local8_Text_Str_1927) + (";"))) + (func11_NewLine_Str()));
					
				
				
			case 8849: //dummy jumper1
				;
					
				local1_i_2009+=1;
				
				forEachSaver8862.values[forEachCounter8862] = local1_R_2010;
				
				forEachCounter8862++
				__pc = 8826; break; //back jump
				
			case 8822: //dummy for
				;
					
				
				__pc = 29633;
				break;
				
			case 8814: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(35))) ? 1 : 0))) { __pc = 8864; break; }
				
				case 8875:
					local8_Text_Str_1927 = ((local8_Text_Str_1927) + (func21_JSGetDefaultValue_Str(param4_expr.attr8_datatype, 0, 0)));
					
				
				__pc = 29633;
				break;
				
			case 8864: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(36))) ? 1 : 0))) { __pc = 8877; break; }
				
				var local7_def_Str_2011 = "", local4_Find_2012 = 0;
				case 8886:
					local7_def_Str_2011 = func21_JSGetDefaultValue_Str(param4_expr.attr8_datatype, 1, 1);
					
				local8_Text_Str_1927 = ((((((local8_Text_Str_1927) + ("DIM("))) + (local7_def_Str_2011))) + (", ["));
				local4_Find_2012 = 0;
				case 8931:
					var forEachSaver8931 = param4_expr.attr4_dims;
				var forEachCounter8931 = 0
				
			case 8907: //dummy for1
				if (!(forEachCounter8931 < forEachSaver8931.values.length)) {__pc = 8903; break;}
				var local1_D_2013 = forEachSaver8931.values[forEachCounter8931];
				
				
				case 8919:
					if (!((((local4_Find_2012) === (1)) ? 1 : 0))) { __pc = 8912; break; }
				
				case 8918:
					local8_Text_Str_1927 = ((local8_Text_Str_1927) + (", "));
					
				
				
			case 8912: //dummy jumper1
				;
					
				local8_Text_Str_1927 = ((local8_Text_Str_1927) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local1_D_2013).values[tmpPositionCache][0]))));
				local4_Find_2012 = 1;
				
				forEachSaver8931.values[forEachCounter8931] = local1_D_2013;
				
				forEachCounter8931++
				__pc = 8907; break; //back jump
				
			case 8903: //dummy for
				;
					
				local8_Text_Str_1927 = ((((((local8_Text_Str_1927) + ("], "))) + (local7_def_Str_2011))) + (")"));
				
				__pc = 29633;
				break;
				
			case 8877: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(37))) ? 1 : 0))) { __pc = 8942; break; }
				
				case 8958:
					local8_Text_Str_1927 = ((((local8_Text_Str_1927) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_Name_Str))) + (" = "));
					
				case 9014:
					if (!((((global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr3_Typ) === (54)) ? 1 : 0))) { __pc = 8968; break; }
				
				case 9001:
					local8_Text_Str_1927 = ((((((((((local8_Text_Str_1927) + ("castobj("))) + (func16_JSRemoveLast_Str(func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr4_expr).values[tmpPositionCache][0])), "[0]")))) + (", "))) + (func18_ChangeTypeName_Str(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str)))) + (")"));
					
				
				__pc = 29707;
				break;
				
			case 8968: //dummy jumper1
				
				case 9013:
					local8_Text_Str_1927 = ((local8_Text_Str_1927) + (func16_JSRemoveLast_Str(func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0])), "[0]")));
					
				
				
			case 29707: //dummy jumper2
				;
					
				local8_Text_Str_1927 = ((local8_Text_Str_1927) + (" /* ALIAS */"));
				
				__pc = 29633;
				break;
				
			case 8942: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(20))) ? 1 : 0))) { __pc = 9021; break; }
				
				case 9033:
					local8_Text_Str_1927 = ((((((local8_Text_Str_1927) + ("__pc = __labels[\""))) + (param4_expr.attr8_Name_Str))) + ("\"]; break"));
					
				
				__pc = 29633;
				break;
				
			case 9021: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(21))) ? 1 : 0))) { __pc = 9035; break; }
				
				case 9054:
					global12_LabelDef_Str = ((((((((((global12_LabelDef_Str) + ("\""))) + (param4_expr.attr8_Name_Str))) + ("\": "))) + (CAST2STRING(param4_expr.attr2_ID)))) + (", "));
					
				local8_Text_Str_1927 = ((((local8_Text_Str_1927) + ("//label: "))) + (param4_expr.attr8_Name_Str));
				
				__pc = 29633;
				break;
				
			case 9035: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(39))) ? 1 : 0))) { __pc = 9065; break; }
				
				case 9085:
					local8_Text_Str_1927 = ((((((local8_Text_Str_1927) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0]))))) + ("+="))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))));
					
				
				__pc = 29633;
				break;
				
			case 9065: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(40))) ? 1 : 0))) { __pc = 9087; break; }
				
				case 9112:
					local8_Text_Str_1927 = ((((((((((local8_Text_Str_1927) + ("DIMPUSH("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0]))))) + (", "))) + (func16_JSRemoveLast_Str(func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0])), "[0]")))) + (")"));
					
				
				__pc = 29633;
				break;
				
			case 9087: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(41))) ? 1 : 0))) { __pc = 9114; break; }
				
				case 9163:
					if (!((((param4_expr.attr4_kern) !== (-(1))) ? 1 : 0))) { __pc = 9123; break; }
				
				case 9147:
					local8_Text_Str_1927 = ((((((((((local8_Text_Str_1927) + ("KERNLEN("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (", "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_kern).values[tmpPositionCache][0]))))) + (")"));
					
				
				__pc = 29708;
				break;
				
			case 9123: //dummy jumper1
				
				case 9162:
					local8_Text_Str_1927 = ((((((local8_Text_Str_1927) + ("("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (").length"));
					
				
				
			case 29708: //dummy jumper2
				;
					
				
				__pc = 29633;
				break;
				
			case 9114: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(45))) ? 1 : 0))) { __pc = 9165; break; }
				
				case 9189:
					local8_Text_Str_1927 = ((((((((((local8_Text_Str_1927) + ("BOUNDS("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_array).values[tmpPositionCache][0]))))) + (", "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_position).values[tmpPositionCache][0]))))) + (")"));
					
				
				__pc = 29633;
				break;
				
			case 9165: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(42))) ? 1 : 0))) { __pc = 9191; break; }
				
				var local4_Find_2014 = 0;
				case 9206:
					local8_Text_Str_1927 = ((((((local8_Text_Str_1927) + ("DIMDATA("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_array).values[tmpPositionCache][0]))))) + (", ["));
					
				case 9235:
					var forEachSaver9235 = param4_expr.attr5_Exprs;
				var forEachCounter9235 = 0
				
			case 9213: //dummy for1
				if (!(forEachCounter9235 < forEachSaver9235.values.length)) {__pc = 9209; break;}
				var local4_Elem_2015 = forEachSaver9235.values[forEachCounter9235];
				
				
				case 9223:
					if (!(local4_Find_2014)) { __pc = 9216; break; }
				
				case 9222:
					local8_Text_Str_1927 = ((local8_Text_Str_1927) + (", "));
					
				
				
			case 9216: //dummy jumper1
				;
					
				local8_Text_Str_1927 = ((local8_Text_Str_1927) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local4_Elem_2015).values[tmpPositionCache][0]))));
				local4_Find_2014 = 1;
				
				forEachSaver9235.values[forEachCounter9235] = local4_Elem_2015;
				
				forEachCounter9235++
				__pc = 9213; break; //back jump
				
			case 9209: //dummy for
				;
					
				local8_Text_Str_1927 = ((local8_Text_Str_1927) + ("])"));
				
				__pc = 29633;
				break;
				
			case 9191: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(43))) ? 1 : 0))) { __pc = 9242; break; }
				
				case 9271:
					local8_Text_Str_1927 = ((((((((((((((((local8_Text_Str_1927) + ("forEachSaver"))) + (CAST2STRING(global14_ForEachCounter)))) + (".values[forEachCounter"))) + (CAST2STRING(global14_ForEachCounter)))) + ("] = "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(global14_ForEachCounter).values[tmpPositionCache][0].attr7_varExpr).values[tmpPositionCache][0]))))) + (";"))) + (func11_NewLine_Str()));
					
				local8_Text_Str_1927 = ((((((((((((local8_Text_Str_1927) + ("DIMDEL(forEachSaver"))) + (CAST2STRING(global14_ForEachCounter)))) + (", forEachCounter"))) + (CAST2STRING(global14_ForEachCounter)))) + (");"))) + (func11_NewLine_Str()));
				local8_Text_Str_1927 = ((((((((local8_Text_Str_1927) + ("forEachCounter"))) + (CAST2STRING(global14_ForEachCounter)))) + ("--;"))) + (func11_NewLine_Str()));
				local8_Text_Str_1927 = ((local8_Text_Str_1927) + ("continue"));
				
				__pc = 29633;
				break;
				
			case 9242: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(44))) ? 1 : 0))) { __pc = 9307; break; }
				
				case 9331:
					local8_Text_Str_1927 = ((((((((((local8_Text_Str_1927) + ("DIMDEL("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_array).values[tmpPositionCache][0]))))) + (", "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_position).values[tmpPositionCache][0]))))) + (")"));
					
				
				__pc = 29633;
				break;
				
			case 9307: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(46))) ? 1 : 0))) { __pc = 9333; break; }
				
				case 9348:
					local8_Text_Str_1927 = ((((((local8_Text_Str_1927) + ("(("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (") ? 0 : 1)"));
					
				
				__pc = 29633;
				break;
				
			case 9333: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(48))) ? 1 : 0))) { __pc = 9350; break; }
				
				case 9364:
					local8_Text_Str_1927 = ((local8_Text_Str_1927) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_expr.attr4_func).values[tmpPositionCache][0].attr8_Name_Str));
					
				
				__pc = 29633;
				break;
				
			case 9350: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(49))) ? 1 : 0))) { __pc = 9366; break; }
				
				var local8_Cond_Str_2016 = "";
				case 9375:
					local8_Cond_Str_2016 = func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]));
					
				local8_Text_Str_1927 = ((((((((((local8_Text_Str_1927) + ("if (!("))) + (local8_Cond_Str_2016))) + (")) throwError(\"AssertException "))) + (REPLACE_Str(local8_Cond_Str_2016, "\"", "'")))) + ("\")"));
				
				__pc = 29633;
				break;
				
			case 9366: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(50))) ? 1 : 0))) { __pc = 9394; break; }
				
				case 9409:
					local8_Text_Str_1927 = ((((((local8_Text_Str_1927) + ("DEBUG("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")"));
					
				
				__pc = 29633;
				break;
				
			case 9394: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(51))) ? 1 : 0))) { __pc = 9411; break; }
				
				case 9448:
					local8_Text_Str_1927 = ((((((((((((((local8_Text_Str_1927) + ("(("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr10_Conditions.arrAccess(0).values[tmpPositionCache]).values[tmpPositionCache][0]))))) + (") ? ("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr6_Scopes.arrAccess(0).values[tmpPositionCache]).values[tmpPositionCache][0]))))) + (") : ("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr9_elseScope).values[tmpPositionCache][0]))))) + ("))"));
					
				
				__pc = 29633;
				break;
				
			case 9411: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(52))) ? 1 : 0))) { __pc = 9450; break; }
				
				case 9462:
					local8_Text_Str_1927 = ((((((local8_Text_Str_1927) + ("//REQUIRE: "))) + (param4_expr.attr8_Name_Str))) + ("\n"));
					
				local8_Text_Str_1927 = ((((local8_Text_Str_1927) + (param4_expr.attr11_Content_Str))) + (func11_NewLine_Str()));
				local8_Text_Str_1927 = ((((((local8_Text_Str_1927) + ("//ENDREQUIRE: "))) + (param4_expr.attr8_Name_Str))) + (func11_NewLine_Str()));
				
				__pc = 29633;
				break;
				
			case 9450: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(53))) ? 1 : 0))) { __pc = 9484; break; }
				
				var local5_Found_2017 = 0, local3_Scp_2018 = 0;
				case 9489:
					local5_Found_2017 = 0;
					
				local3_Scp_2018 = global12_CurrentScope;
				case 9574:
					if (!((((((((((local3_Scp_2018) !== (-(1))) ? 1 : 0)) && (((((((((global5_Exprs_ref[0].arrAccess(local3_Scp_2018).values[tmpPositionCache][0].attr6_ScpTyp) === (2)) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(local3_Scp_2018).values[tmpPositionCache][0].attr6_ScpTyp) === (4)) ? 1 : 0))) ? 1 : 0)) ? 0 : 1))) ? 1 : 0)) && (((local5_Found_2017) ? 0 : 1))) ? 1 : 0))) {__pc = 29710; break;}
				
				var local5_Varis_2019 = new OTTArray();
				case 9530:
					func8_GetVaris(unref(local5_Varis_2019), local3_Scp_2018, 0);
					
				case 9566:
					var forEachSaver9566 = local5_Varis_2019;
				var forEachCounter9566 = 0
				
			case 9534: //dummy for1
				if (!(forEachCounter9566 < forEachSaver9566.values.length)) {__pc = 9532; break;}
				var local1_V_2020 = forEachSaver9566.values[forEachCounter9566];
				
				
				var alias3_Var_ref_2021 = [new type15_TIdentifierVari()];
				case 9541:
					alias3_Var_ref_2021 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_V_2020).values[tmpPositionCache] /* ALIAS */;
					
				case 9565:
					if (!((((alias3_Var_ref_2021[0].attr8_Name_Str) === ((("param4_self_") + (CAST2STRING(alias3_Var_ref_2021[0].attr2_ID))))) ? 1 : 0))) { __pc = 9552; break; }
				
				case 9560:
					local8_Text_Str_1927 = ((local8_Text_Str_1927) + (alias3_Var_ref_2021[0].attr8_Name_Str));
					
				local5_Found_2017 = 1;
				case 9564:
					__pc = 9532; break;
					
				
				
			case 9552: //dummy jumper1
				;
					
				
				forEachSaver9566.values[forEachCounter9566] = local1_V_2020;
				
				forEachCounter9566++
				__pc = 9534; break; //back jump
				
			case 9532: //dummy for
				;
					
				local3_Scp_2018 = global5_Exprs_ref[0].arrAccess(local3_Scp_2018).values[tmpPositionCache][0].attr10_SuperScope;
				
				__pc = 9574; break; //back jump
				
			case 29710:
				;
					
				case 9583:
					if (!(((local5_Found_2017) ? 0 : 1))) { __pc = 9577; break; }
				
				case 9582:
					func5_Error("Self not found for super", 1169, "src\CompilerPasses\Generator\JSGenerator.gbas");
					
				
				
			case 9577: //dummy jumper1
				;
					
				
				__pc = 29633;
				break;
				
			case 9484: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(54))) ? 1 : 0))) { __pc = 9585; break; }
				
				case 9609:
					local8_Text_Str_1927 = ((((((((((local8_Text_Str_1927) + ("castobj("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (", "))) + (func18_ChangeTypeName_Str(param4_expr.attr8_datatype.attr8_Name_Str)))) + (")"));
					
				
				__pc = 29633;
				break;
				
			case 9585: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(7))) ? 1 : 0))) { __pc = 9611; break; }
				
				
				__pc = 29633;
				break;
				
			case 9611: //dummy jumper1
				if (!((((local16___SelectHelper4__1928) === (~~(8))) ? 1 : 0))) { __pc = 9614; break; }
				
				case 9619:
					func5_Error("Invalid Expression", 1175, "src\CompilerPasses\Generator\JSGenerator.gbas");
					
				
				__pc = 29633;
				break;
				
			case 9614: //dummy jumper1
				
				case 9629:
					func5_Error((("Unknown expression type: ") + (CAST2STRING(param4_expr.attr3_Typ))), 1177, "src\CompilerPasses\Generator\JSGenerator.gbas");
					
				
				
			case 29633: //dummy jumper2
				;
					
				
				;
			return tryClone(local8_Text_Str_1927);
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
	var local5_unref_2024 = 0;
	local5_unref_2024 = 1;
	if (((global5_Exprs_ref[0].arrAccess(param4_Expr).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) ? 0 : 1)) {
		{
			var local17___SelectHelper10__2025 = 0;
			local17___SelectHelper10__2025 = global5_Exprs_ref[0].arrAccess(param4_Expr).values[tmpPositionCache][0].attr3_Typ;
			if ((((local17___SelectHelper10__2025) === (~~(3))) ? 1 : 0)) {
				local5_unref_2024 = 0;
				
			} else if ((((local17___SelectHelper10__2025) === (~~(4))) ? 1 : 0)) {
				local5_unref_2024 = 0;
				
			} else if ((((local17___SelectHelper10__2025) === (~~(5))) ? 1 : 0)) {
				local5_unref_2024 = 0;
				
			} else if ((((local17___SelectHelper10__2025) === (~~(15))) ? 1 : 0)) {
				local5_unref_2024 = func11_JSDoesUnref(global5_Exprs_ref[0].arrAccess(param4_Expr).values[tmpPositionCache][0].attr4_expr);
				
			} else if ((((local17___SelectHelper10__2025) === (~~(16))) ? 1 : 0)) {
				local5_unref_2024 = func11_JSDoesUnref(global5_Exprs_ref[0].arrAccess(param4_Expr).values[tmpPositionCache][0].attr4_expr);
				
			} else if ((((local17___SelectHelper10__2025) === (~~(17))) ? 1 : 0)) {
				local5_unref_2024 = func11_JSDoesUnref(global5_Exprs_ref[0].arrAccess(param4_Expr).values[tmpPositionCache][0].attr4_expr);
				
			} else if ((((local17___SelectHelper10__2025) === (~~(1))) ? 1 : 0)) {
				local5_unref_2024 = 0;
				
			} else if ((((local17___SelectHelper10__2025) === (~~(6))) ? 1 : 0)) {
				local5_unref_2024 = 0;
				
			} else if ((((local17___SelectHelper10__2025) === (~~(23))) ? 1 : 0)) {
				local5_unref_2024 = 0;
				
			} else if ((((local17___SelectHelper10__2025) === (~~(45))) ? 1 : 0)) {
				local5_unref_2024 = 0;
				
			} else if ((((local17___SelectHelper10__2025) === (~~(41))) ? 1 : 0)) {
				local5_unref_2024 = 0;
				
			} else {
				var local1_v_2026 = 0;
				local1_v_2026 = func11_GetVariable(param4_Expr, 0);
				if ((((local1_v_2026) !== (-(1))) ? 1 : 0)) {
					if (((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_v_2026).values[tmpPositionCache][0].attr3_ref) ? 0 : 1)) {
						local5_unref_2024 = 0;
						
					};
					
				};
				
			};
			
		};
		
	};
	return tryClone(local5_unref_2024);
	return 0;
	
};
func11_JSDoesUnref = window['func11_JSDoesUnref'];
window['func17_JSDoParameter_Str'] = function(param4_expr, param4_func, param7_DoParam) {
	var local8_Text_Str_2030 = "", local1_i_2031 = 0.0;
	if (param7_DoParam) {
		local8_Text_Str_2030 = "(";
		
	};
	local1_i_2031 = 0;
	var forEachSaver9924 = param4_expr.attr6_Params;
	for(var forEachCounter9924 = 0 ; forEachCounter9924 < forEachSaver9924.values.length ; forEachCounter9924++) {
		var local5_param_2032 = forEachSaver9924.values[forEachCounter9924];
	{
			if ((((((((((param4_func) !== (-(1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr3_Typ) === (3)) ? 1 : 0))) ? 1 : 0)) && ((((local1_i_2031) === (((BOUNDS(param4_expr.attr6_Params, 0)) - (1)))) ? 1 : 0))) ? 1 : 0)) {
				break;
				
			};
			if (local1_i_2031) {
				local8_Text_Str_2030 = ((local8_Text_Str_2030) + (", "));
				
			};
			if ((((((((((param4_func) !== (-(1))) ? 1 : 0)) && (((global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr15_UsedAsPrototype) ? 0 : 1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_i_2031)).values[tmpPositionCache]).values[tmpPositionCache][0].attr3_ref) === (0)) ? 1 : 0))) ? 1 : 0)) {
				local8_Text_Str_2030 = ((local8_Text_Str_2030) + (func14_JSTryUnref_Str(local5_param_2032)));
				
			} else {
				local8_Text_Str_2030 = ((local8_Text_Str_2030) + (func16_JSRemoveLast_Str(func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local5_param_2032).values[tmpPositionCache][0])), "[0]")));
				
			};
			local1_i_2031+=1;
			
		}
		forEachSaver9924.values[forEachCounter9924] = local5_param_2032;
	
	};
	if (param7_DoParam) {
		local8_Text_Str_2030 = ((local8_Text_Str_2030) + (")"));
		
	};
	return tryClone(local8_Text_Str_2030);
	return "";
	
};
func17_JSDoParameter_Str = window['func17_JSDoParameter_Str'];
window['func13_JSVariDef_Str'] = function(param5_Varis, param12_ForceDefault, param8_NoStatic, param7_InitVal) {
	var local8_Text_Str_2037 = "", local4_Find_2038 = 0.0;
	local8_Text_Str_2037 = "";
	local4_Find_2038 = 0;
	var forEachSaver10078 = param5_Varis;
	for(var forEachCounter10078 = 0 ; forEachCounter10078 < forEachSaver10078.values.length ; forEachCounter10078++) {
		var local3_Var_2039 = forEachSaver10078.values[forEachCounter10078];
	{
			if ((((((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2039).values[tmpPositionCache][0].attr3_Typ) !== (5)) ? 1 : 0)) && (((((((param8_NoStatic) === (0)) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2039).values[tmpPositionCache][0].attr3_Typ) !== (4)) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) && (func17_JSShouldRedeclare(local3_Var_2039))) ? 1 : 0)) {
				if (local4_Find_2038) {
					local8_Text_Str_2037 = ((local8_Text_Str_2037) + (", "));
					
				};
				local8_Text_Str_2037 = ((local8_Text_Str_2037) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2039).values[tmpPositionCache][0].attr8_Name_Str));
				if (param7_InitVal) {
					local8_Text_Str_2037 = ((local8_Text_Str_2037) + (" = "));
					if (((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2039).values[tmpPositionCache][0].attr6_PreDef) !== (-(1))) ? 1 : 0)) && (((((((param12_ForceDefault) === (0)) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2039).values[tmpPositionCache][0].attr3_Typ) === (6)) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) {
						local8_Text_Str_2037 = ((local8_Text_Str_2037) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2039).values[tmpPositionCache][0].attr6_PreDef).values[tmpPositionCache][0]))));
						
					} else {
						local8_Text_Str_2037 = ((local8_Text_Str_2037) + (func21_JSGetDefaultValue_Str(global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2039).values[tmpPositionCache][0].attr8_datatype, global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2039).values[tmpPositionCache][0].attr3_ref, 0)));
						
					};
					
				};
				local4_Find_2038 = 1;
				
			};
			
		}
		forEachSaver10078.values[forEachCounter10078] = local3_Var_2039;
	
	};
	return tryClone(local8_Text_Str_2037);
	return "";
	
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
		var forEachSaver10133 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr10_CopyParams;
		for(var forEachCounter10133 = 0 ; forEachCounter10133 < forEachSaver10133.values.length ; forEachCounter10133++) {
			var local1_P_2042 = forEachSaver10133.values[forEachCounter10133];
		{
				if ((((local1_P_2042) === (param3_Var)) ? 1 : 0)) {
					return tryClone(0);
					
				};
				
			}
			forEachSaver10133.values[forEachCounter10133] = local1_P_2042;
		
		};
		
	};
	return 1;
	return 0;
	
};
func17_JSShouldRedeclare = window['func17_JSShouldRedeclare'];
window['func21_JSGetDefaultValue_Str'] = function(param8_datatype, param3_Ref, param11_IgnoreArray) {
	var local10_RetVal_Str_2046 = "";
	local10_RetVal_Str_2046 = "";
	if ((((param8_datatype.attr7_IsArray) && ((((param11_IgnoreArray) === (0)) ? 1 : 0))) ? 1 : 0)) {
		local10_RetVal_Str_2046 = "new OTTArray()";
		
	} else {
		{
			var local17___SelectHelper11__2047 = "";
			local17___SelectHelper11__2047 = param8_datatype.attr8_Name_Str;
			if ((((local17___SelectHelper11__2047) === ("int")) ? 1 : 0)) {
				local10_RetVal_Str_2046 = "0";
				
			} else if ((((local17___SelectHelper11__2047) === ("float")) ? 1 : 0)) {
				local10_RetVal_Str_2046 = "0.0";
				
			} else if ((((local17___SelectHelper11__2047) === ("string")) ? 1 : 0)) {
				local10_RetVal_Str_2046 = "\"\"";
				
			} else {
				if (func6_IsType(param8_datatype.attr8_Name_Str)) {
					local10_RetVal_Str_2046 = (((("new ") + (global8_LastType.attr8_Name_Str))) + ("()"));
					
				} else {
					local10_RetVal_Str_2046 = REPLACE_Str(param8_datatype.attr8_Name_Str, "$", "_Str");
					
				};
				
			};
			
		};
		
	};
	if (param3_Ref) {
		local10_RetVal_Str_2046 = (((("[") + (local10_RetVal_Str_2046))) + ("]"));
		
	};
	return tryClone(local10_RetVal_Str_2046);
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
	var local12_Splitter_Str_2050 = new OTTArray(), local11_SplitterMap_2051 = new type7_HashMap(), local9_LastFound_2053 = 0, local4_Line_2054 = 0, local15_LineContent_Str_2055 = "", local18_NewLineContent_Str_2056 = "", local8_Path_Str_2057 = "", local9_Character_2058 = 0, local5_WasNL_2072 = 0, local6_WasRem_2073 = 0, local6_HasDel_2074 = 0, local1_i_2078 = 0.0;
	REDIM(global8_Compiler.attr6_Tokens, [0], new type6_TToken() );
	global8_Compiler.attr11_LastTokenID = 0;
	DIMDATA(local12_Splitter_Str_2050, [" ", "\t", "\n", "-", "+", "*", "/", "^", ",", "=", "<", ">", "|", "&", "[", "]", "(", ")", "!", "\"", "?", ";", ".", ":", CHR_Str(8), CHR_Str(12), "\r", "\f"]);
	(local11_SplitterMap_2051).SetSize(((BOUNDS(local12_Splitter_Str_2050, 0)) * (8)));
	var forEachSaver10318 = local12_Splitter_Str_2050;
	for(var forEachCounter10318 = 0 ; forEachCounter10318 < forEachSaver10318.values.length ; forEachCounter10318++) {
		var local9_Split_Str_2052 = forEachSaver10318.values[forEachCounter10318];
	{
			(local11_SplitterMap_2051).Put(local9_Split_Str_2052, 1);
			
		}
		forEachSaver10318.values[forEachCounter10318] = local9_Split_Str_2052;
	
	};
	global8_Compiler.attr8_Code_Str = (("\n") + (global8_Compiler.attr8_Code_Str));
	{
		var local1_i_2059 = 0;
		for (local1_i_2059 = 0;toCheck(local1_i_2059, (((global8_Compiler.attr8_Code_Str).length) - (1)), 1);local1_i_2059 += 1) {
			var local14_DoubleChar_Str_2060 = "", local11_curChar_Str_2063 = "", local15_TmpLineCont_Str_2064 = "";
			local9_Character_2058+=1;
			if ((((local1_i_2059) < ((((global8_Compiler.attr8_Code_Str).length) - (2)))) ? 1 : 0)) {
				local14_DoubleChar_Str_2060 = MID_Str(global8_Compiler.attr8_Code_Str, local1_i_2059, 2);
				
			};
			if ((((local14_DoubleChar_Str_2060) === ("//")) ? 1 : 0)) {
				var local8_Text_Str_2061 = "", local3_Pos_2062 = 0;
				local8_Text_Str_2061 = MID_Str(global8_Compiler.attr8_Code_Str, local9_LastFound_2053, ((local1_i_2059) - (local9_LastFound_2053)));
				if ((((TRIM_Str(local8_Text_Str_2061, " \t\r\n\v\f")) !== ("")) ? 1 : 0)) {
					func11_CreateToken(local8_Text_Str_2061, local15_LineContent_Str_2055, local4_Line_2054, local9_Character_2058, local8_Path_Str_2057);
					
				};
				local3_Pos_2062 = local1_i_2059;
				while (((((((MID_Str(global8_Compiler.attr8_Code_Str, local1_i_2059, 1)) !== ("\n")) ? 1 : 0)) && ((((MID_Str(global8_Compiler.attr8_Code_Str, local1_i_2059, 1)) !== ("\f")) ? 1 : 0))) ? 1 : 0)) {
					local1_i_2059+=1;
					
				};
				local8_Text_Str_2061 = MID_Str(global8_Compiler.attr8_Code_Str, local3_Pos_2062, ((local1_i_2059) - (local3_Pos_2062)));
				if ((((((((local8_Text_Str_2061).length) > (("//$$RESETFILE").length)) ? 1 : 0)) && ((((LEFT_Str(local8_Text_Str_2061, ("//$$RESETFILE").length)) === ("//$$RESETFILE")) ? 1 : 0))) ? 1 : 0)) {
					local8_Text_Str_2061 = MID_Str(local8_Text_Str_2061, ((("//$$RESETFILE").length) + (1)), -(1));
					local8_Path_Str_2057 = local8_Text_Str_2061;
					local4_Line_2054 = 0;
					
				};
				local9_LastFound_2053 = local1_i_2059;
				
			};
			local11_curChar_Str_2063 = MID_Str(global8_Compiler.attr8_Code_Str, local1_i_2059, 1);
			local15_TmpLineCont_Str_2064 = local15_LineContent_Str_2055;
			if ((((local11_curChar_Str_2063) === ("\f")) ? 1 : 0)) {
				local11_curChar_Str_2063 = "\n";
				
			};
			{
				var local17___SelectHelper12__2065 = "";
				local17___SelectHelper12__2065 = local11_curChar_Str_2063;
				if ((((local17___SelectHelper12__2065) === ("\n")) ? 1 : 0)) {
					local9_Character_2058 = 0;
					local4_Line_2054+=1;
					{
						var local1_j_2066 = 0;
						for (local1_j_2066 = ((local1_i_2059) + (1));toCheck(local1_j_2066, (((global8_Compiler.attr8_Code_Str).length) - (1)), 1);local1_j_2066 += 1) {
							if (((((((MID_Str(global8_Compiler.attr8_Code_Str, local1_j_2066, 1)) === ("\n")) ? 1 : 0)) || ((((MID_Str(global8_Compiler.attr8_Code_Str, local1_j_2066, 1)) === ("\f")) ? 1 : 0))) ? 1 : 0)) {
								local15_TmpLineCont_Str_2064 = TRIM_Str(MID_Str(global8_Compiler.attr8_Code_Str, local1_i_2059, ((local1_j_2066) - (local1_i_2059))), " \t\r\n\v\f");
								if ((((RIGHT_Str(local15_TmpLineCont_Str_2064, 1)) === ("\f")) ? 1 : 0)) {
									local15_TmpLineCont_Str_2064 = ((MID_Str(local15_TmpLineCont_Str_2064, 0, (((local15_TmpLineCont_Str_2064).length) - (1)))) + ("\n"));
									
								};
								break;
								
							};
							
						};
						
					};
					
				} else if ((((local17___SelectHelper12__2065) === ("\"")) ? 1 : 0)) {
					var local12_WasBackSlash_2067 = 0, local10_WasWasBack_2068 = 0;
					local12_WasBackSlash_2067 = 0;
					local10_WasWasBack_2068 = 0;
					{
						var local1_j_2069 = 0;
						for (local1_j_2069 = ((local1_i_2059) + (1));toCheck(local1_j_2069, (((global8_Compiler.attr8_Code_Str).length) - (1)), 1);local1_j_2069 += 1) {
							if (((((((MID_Str(global8_Compiler.attr8_Code_Str, local1_j_2069, 1)) === ("\n")) ? 1 : 0)) || ((((MID_Str(global8_Compiler.attr8_Code_Str, local1_j_2069, 1)) === ("\f")) ? 1 : 0))) ? 1 : 0)) {
								local4_Line_2054+=1;
								
							};
							if (((((((MID_Str(global8_Compiler.attr8_Code_Str, local1_j_2069, 1)) === ("\"")) ? 1 : 0)) && (((((((local12_WasBackSlash_2067) === (0)) ? 1 : 0)) || (local10_WasWasBack_2068)) ? 1 : 0))) ? 1 : 0)) {
								local1_i_2059 = local1_j_2069;
								break;
								
							};
							local10_WasWasBack_2068 = local12_WasBackSlash_2067;
							local12_WasBackSlash_2067 = 0;
							if ((((MID_Str(global8_Compiler.attr8_Code_Str, local1_j_2069, 1)) === ("\\")) ? 1 : 0)) {
								local12_WasBackSlash_2067 = 1;
								
							};
							
						};
						
					};
					continue;
					
				};
				
			};
			if ((local11_SplitterMap_2051).DoesKeyExist(local11_curChar_Str_2063)) {
				var local9_Split_Str_2070 = "", local8_Text_Str_2071 = "";
				local9_Split_Str_2070 = local11_curChar_Str_2063;
				local8_Text_Str_2071 = MID_Str(global8_Compiler.attr8_Code_Str, local9_LastFound_2053, ((local1_i_2059) - (local9_LastFound_2053)));
				if ((((local8_Text_Str_2071) === (";")) ? 1 : 0)) {
					local8_Text_Str_2071 = "\n";
					
				};
				func11_CreateToken(local8_Text_Str_2071, local15_LineContent_Str_2055, local4_Line_2054, local9_Character_2058, local8_Path_Str_2057);
				local8_Text_Str_2071 = MID_Str(global8_Compiler.attr8_Code_Str, local1_i_2059, (local9_Split_Str_2070).length);
				if ((((local8_Text_Str_2071) === (";")) ? 1 : 0)) {
					local8_Text_Str_2071 = "\n";
					
				};
				func11_CreateToken(local8_Text_Str_2071, local15_LineContent_Str_2055, local4_Line_2054, local9_Character_2058, local8_Path_Str_2057);
				local9_LastFound_2053 = ((local1_i_2059) + ((local9_Split_Str_2070).length));
				
			};
			local15_LineContent_Str_2055 = local15_TmpLineCont_Str_2064;
			
		};
		
	};
	func11_CreateToken("__EOFFILE__", "__EOFFILE__", local4_Line_2054, 0, local8_Path_Str_2057);
	func11_CreateToken("\n", "__EOFFILE__", local4_Line_2054, 0, local8_Path_Str_2057);
	local5_WasNL_2072 = 0;
	local6_WasRem_2073 = 0;
	local6_HasDel_2074 = 0;
	{
		var local1_i_2075 = 0.0;
		for (local1_i_2075 = 0;toCheck(local1_i_2075, ((global8_Compiler.attr11_LastTokenID) - (1)), 1);local1_i_2075 += 1) {
			var local8_Text_Str_2076 = "";
			if (local6_HasDel_2074) {
				local6_HasDel_2074 = 0;
				global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2075)).values[tmpPositionCache].attr5_IsDel = 1;
				continue;
				
			};
			local8_Text_Str_2076 = global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2075)).values[tmpPositionCache].attr8_Text_Str;
			if ((((global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2075)).values[tmpPositionCache].attr8_Text_Str) === ("\n")) ? 1 : 0)) {
				local8_Text_Str_2076 = "NEWLINE";
				if (local5_WasNL_2072) {
					global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2075)).values[tmpPositionCache].attr5_IsDel = 1;
					continue;
					
				};
				local5_WasNL_2072 = 1;
				
			} else {
				local5_WasNL_2072 = 0;
				
			};
			if ((((global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2075)).values[tmpPositionCache].attr8_Text_Str) === ("REM")) ? 1 : 0)) {
				local6_WasRem_2073 = 1;
				
			};
			if ((((local6_WasRem_2073) && ((((global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2075)).values[tmpPositionCache].attr8_Text_Str) === ("ENDREM")) ? 1 : 0))) ? 1 : 0)) {
				local6_WasRem_2073 = 0;
				local6_HasDel_2074 = 1;
				global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2075)).values[tmpPositionCache].attr5_IsDel = 1;
				continue;
				
			};
			if (local6_WasRem_2073) {
				global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2075)).values[tmpPositionCache].attr5_IsDel = 1;
				continue;
				
			};
			if ((((local1_i_2075) < (((global8_Compiler.attr11_LastTokenID) - (1)))) ? 1 : 0)) {
				{
					var local17___SelectHelper13__2077 = "";
					local17___SelectHelper13__2077 = global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2075)).values[tmpPositionCache].attr8_Text_Str;
					if ((((local17___SelectHelper13__2077) === ("<")) ? 1 : 0)) {
						if ((((global8_Compiler.attr6_Tokens.arrAccess(~~(((local1_i_2075) + (1)))).values[tmpPositionCache].attr8_Text_Str) === (">")) ? 1 : 0)) {
							global8_Compiler.attr6_Tokens.arrAccess(~~(((local1_i_2075) + (1)))).values[tmpPositionCache].attr5_IsDel = 1;
							global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2075)).values[tmpPositionCache].attr8_Text_Str = "<>";
							
						};
						if ((((global8_Compiler.attr6_Tokens.arrAccess(~~(((local1_i_2075) + (1)))).values[tmpPositionCache].attr8_Text_Str) === ("=")) ? 1 : 0)) {
							global8_Compiler.attr6_Tokens.arrAccess(~~(((local1_i_2075) + (1)))).values[tmpPositionCache].attr5_IsDel = 1;
							global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2075)).values[tmpPositionCache].attr8_Text_Str = "<=";
							
						};
						
					} else if ((((local17___SelectHelper13__2077) === (">")) ? 1 : 0)) {
						if ((((global8_Compiler.attr6_Tokens.arrAccess(~~(((local1_i_2075) + (1)))).values[tmpPositionCache].attr8_Text_Str) === ("=")) ? 1 : 0)) {
							global8_Compiler.attr6_Tokens.arrAccess(~~(((local1_i_2075) + (1)))).values[tmpPositionCache].attr5_IsDel = 1;
							global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2075)).values[tmpPositionCache].attr8_Text_Str = ">=";
							
						};
						
					};
					
				};
				
			};
			
		};
		
	};
	local1_i_2078 = 0;
	return 0;
	
};
func5_Lexer = window['func5_Lexer'];
window['func7_VariDef'] = function(param9_NoDefault) {
	var local8_Name_Str_2669 = "", local12_datatype_Str_2670 = "", local7_IsArray_2671 = 0, local12_RightTok_Str_2672 = "", local11_LeftTok_Str_2673 = "", local6_DefVal_2674 = 0, local4_dims_2675 = new OTTArray(), local4_vari_2678 = new type15_TIdentifierVari();
	local8_Name_Str_2669 = func14_GetCurrent_Str();
	func14_IsValidVarName();
	func5_Match(local8_Name_Str_2669, 10, "src\CompilerPasses\Parser.gbas");
	local12_datatype_Str_2670 = "float";
	local7_IsArray_2671 = 0;
	local12_RightTok_Str_2672 = RIGHT_Str(local8_Name_Str_2669, 1);
	local11_LeftTok_Str_2673 = LEFT_Str(local8_Name_Str_2669, (((local8_Name_Str_2669).length) - (1)));
	local6_DefVal_2674 = -(1);
	{
		var local17___SelectHelper44__2676 = "";
		local17___SelectHelper44__2676 = local12_RightTok_Str_2672;
		if ((((local17___SelectHelper44__2676) === ("%")) ? 1 : 0)) {
			local12_datatype_Str_2670 = "int";
			local8_Name_Str_2669 = local11_LeftTok_Str_2673;
			
		} else if ((((local17___SelectHelper44__2676) === ("#")) ? 1 : 0)) {
			local12_datatype_Str_2670 = "float";
			local8_Name_Str_2669 = local11_LeftTok_Str_2673;
			
		} else if ((((local17___SelectHelper44__2676) === ("$")) ? 1 : 0)) {
			local12_datatype_Str_2670 = "string";
			
		};
		
	};
	if (func7_IsToken("[")) {
		func5_Match("[", 32, "src\CompilerPasses\Parser.gbas");
		if (func7_IsToken("]")) {
			func5_Match("]", 34, "src\CompilerPasses\Parser.gbas");
			
		} else {
			var local1_E_2677 = 0;
			local1_E_2677 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 36, 0);
			func5_Match("]", 37, "src\CompilerPasses\Parser.gbas");
			DIMPUSH(local4_dims_2675, local1_E_2677);
			while (func7_IsToken("[")) {
				func5_Match("[", 40, "src\CompilerPasses\Parser.gbas");
				local1_E_2677 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 41, 0);
				DIMPUSH(local4_dims_2675, local1_E_2677);
				func5_Match("]", 43, "src\CompilerPasses\Parser.gbas");
				
			};
			
		};
		local7_IsArray_2671 = 1;
		
	};
	if (func7_IsToken("AS")) {
		if ((((local12_datatype_Str_2670) === ("float")) ? 1 : 0)) {
			func5_Match("AS", 51, "src\CompilerPasses\Parser.gbas");
			if (((((((((((((((((((func7_IsToken("int")) || (func7_IsToken("short"))) ? 1 : 0)) || (func7_IsToken("byte"))) ? 1 : 0)) || (func7_IsToken("bool"))) ? 1 : 0)) || (func7_IsToken("boolean"))) ? 1 : 0)) || (func7_IsToken("long"))) ? 1 : 0)) || (func7_IsToken("single"))) ? 1 : 0)) {
				local12_datatype_Str_2670 = "int";
				
			} else if ((((func7_IsToken("float")) || (func7_IsToken("double"))) ? 1 : 0)) {
				local12_datatype_Str_2670 = "float";
				
			} else if (func7_IsToken("void")) {
				local12_datatype_Str_2670 = "void";
				
			} else if (func7_IsToken("string")) {
				local12_datatype_Str_2670 = "string";
				
			} else {
				func15_IsValidDatatype();
				local12_datatype_Str_2670 = func14_GetCurrent_Str();
				
			};
			func7_GetNext();
			
		} else {
			func5_Error("Unexpected AS", 66, "src\CompilerPasses\Parser.gbas");
			
		};
		
	};
	local4_vari_2678.attr8_Name_Str = local8_Name_Str_2669;
	local4_vari_2678.attr8_datatype.attr8_Name_Str = local12_datatype_Str_2670;
	local4_vari_2678.attr8_datatype.attr7_IsArray = local7_IsArray_2671;
	if ((((BOUNDS(local4_dims_2675, 0)) > (0)) ? 1 : 0)) {
		local6_DefVal_2674 = func25_CreateDimAsExprExpression(local4_vari_2678.attr8_datatype, unref(local4_dims_2675));
		
	};
	if ((((func7_IsToken("=")) && (((param9_NoDefault) ? 0 : 1))) ? 1 : 0)) {
		func5_Match("=", 80, "src\CompilerPasses\Parser.gbas");
		local6_DefVal_2674 = func14_EnsureDatatype(func10_Expression(0), local4_vari_2678.attr8_datatype, 81, 0);
		
	};
	local4_vari_2678.attr6_PreDef = local6_DefVal_2674;
	return tryClone(local4_vari_2678);
	return tryClone(unref(new type15_TIdentifierVari()));
	
};
func7_VariDef = window['func7_VariDef'];
window['func7_FuncDef'] = function(param6_Native, param10_IsCallBack, param3_Typ, param6_CurTyp) {
	var local8_Name_Str_2683 = "";
	if ((((param3_Typ) === (4)) ? 1 : 0)) {
		func5_Match("PROTOTYPE", 91, "src\CompilerPasses\Parser.gbas");
		
	} else {
		func5_Match("FUNCTION", 93, "src\CompilerPasses\Parser.gbas");
		
	};
	local8_Name_Str_2683 = func14_GetCurrent_Str();
	var forEachSaver25303 = global8_Compiler.attr5_Funcs_ref[0];
	for(var forEachCounter25303 = 0 ; forEachCounter25303 < forEachSaver25303.values.length ; forEachCounter25303++) {
		var local4_func_ref_2684 = forEachSaver25303.values[forEachCounter25303];
	{
			if (((((((((((((func7_IsToken(func16_AddDataChars_Str(local4_func_ref_2684[0].attr8_Name_Str, unref(local4_func_ref_2684[0])))) || (func7_IsToken(local4_func_ref_2684[0].attr8_Name_Str))) ? 1 : 0)) && ((((local4_func_ref_2684[0].attr10_IsCallback) === (param10_IsCallBack)) ? 1 : 0))) ? 1 : 0)) && ((((local4_func_ref_2684[0].attr3_Typ) === (param3_Typ)) ? 1 : 0))) ? 1 : 0)) && ((((local4_func_ref_2684[0].attr6_MyType) === (param6_CurTyp)) ? 1 : 0))) ? 1 : 0)) {
				var local7_tmpVari_2685 = new type15_TIdentifierVari(), local10_MustDefVal_2686 = 0;
				local7_tmpVari_2685 = func7_VariDef(0).clone();
				func5_Match(":", 104, "src\CompilerPasses\Parser.gbas");
				local10_MustDefVal_2686 = 0;
				while ((((func7_IsToken("\n")) === (0)) ? 1 : 0)) {
					var local3_ref_2687 = 0, local4_vari_ref_2688 = [new type15_TIdentifierVari()];
					local3_ref_2687 = 0;
					if (func7_IsToken("BYREF")) {
						local3_ref_2687 = 1;
						func5_Match("BYREF", 111, "src\CompilerPasses\Parser.gbas");
						local4_func_ref_2684[0].attr6_HasRef = 1;
						
					};
					local4_vari_ref_2688[0] = func7_VariDef(0).clone();
					if (local10_MustDefVal_2686) {
						if ((((local4_vari_ref_2688[0].attr6_PreDef) === (-(1))) ? 1 : 0)) {
							func5_Error((((("Parameter '") + (local4_vari_ref_2688[0].attr8_Name_Str))) + ("' has to have default value.")), 117, "src\CompilerPasses\Parser.gbas");
							
						};
						
					} else {
						if ((((local4_vari_ref_2688[0].attr6_PreDef) !== (-(1))) ? 1 : 0)) {
							local10_MustDefVal_2686 = 1;
							
						};
						
					};
					local4_vari_ref_2688[0].attr3_Typ = ~~(5);
					local4_vari_ref_2688[0].attr3_ref = local3_ref_2687;
					local4_vari_ref_2688[0].attr2_ID = BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0);
					DIMPUSH(global8_Compiler.attr5_Varis_ref[0], local4_vari_ref_2688);
					DIMPUSH(local4_func_ref_2684[0].attr6_Params, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
					if ((((func7_IsToken("\n")) === (0)) ? 1 : 0)) {
						func5_Match(",", 126, "src\CompilerPasses\Parser.gbas");
						
					};
					
				};
				if ((((param3_Typ) !== (3)) ? 1 : 0)) {
					(global8_Compiler.attr11_GlobalFuncs).Put(local4_func_ref_2684[0].attr8_Name_Str, local4_func_ref_2684[0].attr2_ID);
					
				};
				if ((((param3_Typ) !== (4)) ? 1 : 0)) {
					if (((((((param6_Native) === (0)) ? 1 : 0)) && ((((local4_func_ref_2684[0].attr10_IsAbstract) === (0)) ? 1 : 0))) ? 1 : 0)) {
						local4_func_ref_2684[0].attr6_Native = 0;
						func5_Match("\n", 145, "src\CompilerPasses\Parser.gbas");
						local4_func_ref_2684[0].attr3_Tok = global8_Compiler.attr11_currentPosi;
						func10_SkipTokens("FUNCTION", "ENDFUNCTION", local4_func_ref_2684[0].attr8_Name_Str);
						
					} else {
						if (((local4_func_ref_2684[0].attr10_IsAbstract) ? 0 : 1)) {
							local4_func_ref_2684[0].attr6_Native = 1;
							
						};
						
					};
					
				};
				return 0;
				
			};
			
		}
		forEachSaver25303.values[forEachCounter25303] = local4_func_ref_2684;
	
	};
	if (param10_IsCallBack) {
		func10_SkipTokens("FUNCTION", "ENDFUNCTION", local8_Name_Str_2683);
		
	} else {
		func5_Error((((("Internal error (func definition for unknown type: ") + (local8_Name_Str_2683))) + (")")), 160, "src\CompilerPasses\Parser.gbas");
		
	};
	return 0;
	
};
func7_FuncDef = window['func7_FuncDef'];
window['func6_SubDef'] = function() {
	func5_Match("SUB", 166, "src\CompilerPasses\Parser.gbas");
	var forEachSaver25402 = global8_Compiler.attr5_Funcs_ref[0];
	for(var forEachCounter25402 = 0 ; forEachCounter25402 < forEachSaver25402.values.length ; forEachCounter25402++) {
		var local4_func_ref_2689 = forEachSaver25402.values[forEachCounter25402];
	{
			if ((((func7_IsToken(local4_func_ref_2689[0].attr8_Name_Str)) && ((((local4_func_ref_2689[0].attr3_Typ) === (2)) ? 1 : 0))) ? 1 : 0)) {
				local4_func_ref_2689[0].attr8_Name_Str = func14_GetCurrent_Str();
				local4_func_ref_2689[0].attr8_datatype = global12_voidDatatype.clone();
				local4_func_ref_2689[0].attr3_Typ = ~~(2);
				(global8_Compiler.attr11_GlobalFuncs).Put(local4_func_ref_2689[0].attr8_Name_Str, local4_func_ref_2689[0].attr2_ID);
				func5_Match(local4_func_ref_2689[0].attr8_Name_Str, 175, "src\CompilerPasses\Parser.gbas");
				func5_Match(":", 176, "src\CompilerPasses\Parser.gbas");
				func5_Match("\n", 177, "src\CompilerPasses\Parser.gbas");
				local4_func_ref_2689[0].attr3_Tok = global8_Compiler.attr11_currentPosi;
				func10_SkipTokens("SUB", "ENDSUB", local4_func_ref_2689[0].attr8_Name_Str);
				return 0;
				
			};
			
		}
		forEachSaver25402.values[forEachCounter25402] = local4_func_ref_2689;
	
	};
	func5_Error("Internal error (sub definition for unknown type)", 183, "src\CompilerPasses\Parser.gbas");
	return 0;
	
};
func6_SubDef = window['func6_SubDef'];
window['func8_TypeDefi'] = function() {
	func5_Match("TYPE", 188, "src\CompilerPasses\Parser.gbas");
	var forEachSaver25664 = global8_Compiler.attr5_Types_ref[0];
	for(var forEachCounter25664 = 0 ; forEachCounter25664 < forEachSaver25664.values.length ; forEachCounter25664++) {
		var local3_typ_ref_2690 = forEachSaver25664.values[forEachCounter25664];
	{
			if (func7_IsToken(local3_typ_ref_2690[0].attr8_Name_Str)) {
				var local11_ExtName_Str_2691 = "";
				local3_typ_ref_2690[0].attr8_Name_Str = func14_GetCurrent_Str();
				local3_typ_ref_2690[0].attr3_Tok = global8_Compiler.attr11_currentPosi;
				func5_Match(local3_typ_ref_2690[0].attr8_Name_Str, 193, "src\CompilerPasses\Parser.gbas");
				if (func7_IsToken("EXTENDS")) {
					func5_Match("EXTENDS", 198, "src\CompilerPasses\Parser.gbas");
					local11_ExtName_Str_2691 = func14_GetCurrent_Str();
					func7_GetNext();
					
				} else if ((((local3_typ_ref_2690[0].attr8_Name_Str) !== ("TObject")) ? 1 : 0)) {
					local11_ExtName_Str_2691 = "TObject";
					
				};
				if ((((local11_ExtName_Str_2691) !== ("")) ? 1 : 0)) {
					if ((((local11_ExtName_Str_2691) === (local3_typ_ref_2690[0].attr8_Name_Str)) ? 1 : 0)) {
						func5_Error("Type cannot extend itself!", 205, "src\CompilerPasses\Parser.gbas");
						
					};
					var forEachSaver25509 = global8_Compiler.attr5_Types_ref[0];
					for(var forEachCounter25509 = 0 ; forEachCounter25509 < forEachSaver25509.values.length ; forEachCounter25509++) {
						var local1_T_ref_2692 = forEachSaver25509.values[forEachCounter25509];
					{
							if ((((local1_T_ref_2692[0].attr8_Name_Str) === (local11_ExtName_Str_2691)) ? 1 : 0)) {
								local3_typ_ref_2690[0].attr9_Extending = local1_T_ref_2692[0].attr2_ID;
								break;
								
							};
							
						}
						forEachSaver25509.values[forEachCounter25509] = local1_T_ref_2692;
					
					};
					
				};
				if (func7_IsToken(":")) {
					func5_Match(":", 214, "src\CompilerPasses\Parser.gbas");
					
				};
				func5_Match("\n", 215, "src\CompilerPasses\Parser.gbas");
				var forEachSaver25575 = local3_typ_ref_2690[0].attr7_Methods;
				for(var forEachCounter25575 = 0 ; forEachCounter25575 < forEachSaver25575.values.length ; forEachCounter25575++) {
					var local2_M1_2693 = forEachSaver25575.values[forEachCounter25575];
				{
						var forEachSaver25574 = local3_typ_ref_2690[0].attr7_Methods;
						for(var forEachCounter25574 = 0 ; forEachCounter25574 < forEachSaver25574.values.length ; forEachCounter25574++) {
							var local2_M2_2694 = forEachSaver25574.values[forEachCounter25574];
						{
								if (((((((local2_M1_2693) !== (local2_M2_2694)) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local2_M2_2694).values[tmpPositionCache][0].attr8_Name_Str) === (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local2_M1_2693).values[tmpPositionCache][0].attr8_Name_Str)) ? 1 : 0))) ? 1 : 0)) {
									func5_Error((((("Method '") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local2_M1_2693).values[tmpPositionCache][0].attr8_Name_Str))) + ("' already exists")), 218, "src\CompilerPasses\Parser.gbas");
									
								};
								
							}
							forEachSaver25574.values[forEachCounter25574] = local2_M2_2694;
						
						};
						
					}
					forEachSaver25575.values[forEachCounter25575] = local2_M1_2693;
				
				};
				while ((((func7_IsToken("ENDTYPE")) === (0)) ? 1 : 0)) {
					var local10_IsAbstract_2695 = 0;
					local10_IsAbstract_2695 = 0;
					if (func7_IsToken("ABSTRACT")) {
						func5_Match("ABSTRACT", 224, "src\CompilerPasses\Parser.gbas");
						local10_IsAbstract_2695 = 1;
						
					};
					if (func7_IsToken("FUNCTION")) {
						if (local10_IsAbstract_2695) {
							func10_SkipTokens("FUNCTION", "\n", "ABSTRACT FUNCTION");
							
						} else {
							func10_SkipTokens("FUNCTION", "ENDFUNCTION", "FUNCTION IN TYPE");
							
						};
						
					} else {
						var local4_Vari_2696 = new type15_TIdentifierVari();
						local4_Vari_2696 = func7_VariDef(0).clone();
						local4_Vari_2696.attr3_Typ = ~~(3);
						func11_AddVariable(local4_Vari_2696, 1);
						DIMPUSH(local3_typ_ref_2690[0].attr10_Attributes, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
						
					};
					if ((((func7_IsToken("ENDTYPE")) === (0)) ? 1 : 0)) {
						func5_Match("\n", 251, "src\CompilerPasses\Parser.gbas");
						
					};
					
				};
				func5_Match("ENDTYPE", 254, "src\CompilerPasses\Parser.gbas");
				return 0;
				
			};
			
		}
		forEachSaver25664.values[forEachCounter25664] = local3_typ_ref_2690;
	
	};
	func5_Error("Internal error (type definition for unknown type)", 258, "src\CompilerPasses\Parser.gbas");
	return 0;
	
};
func8_TypeDefi = window['func8_TypeDefi'];
window['func11_CompileFunc'] = function(param4_func) {
	if ((((((((((param4_func.attr3_Scp) === (-(1))) ? 1 : 0)) && ((((param4_func.attr6_Native) === (0)) ? 1 : 0))) ? 1 : 0)) && ((((param4_func.attr10_PlzCompile) === (1)) ? 1 : 0))) ? 1 : 0)) {
		var local6_TmpScp_2698 = 0.0, local3_Tok_2699 = 0, local7_Curfunc_2700 = 0.0, local3_Scp_2702 = 0;
		if (param4_func.attr10_IsAbstract) {
			
		};
		local6_TmpScp_2698 = global8_Compiler.attr12_CurrentScope;
		global8_Compiler.attr12_CurrentScope = global8_Compiler.attr9_MainScope;
		local3_Tok_2699 = global8_Compiler.attr11_currentPosi;
		local7_Curfunc_2700 = global8_Compiler.attr11_currentFunc;
		global8_Compiler.attr11_currentFunc = param4_func.attr2_ID;
		global8_Compiler.attr11_currentPosi = ((param4_func.attr3_Tok) - (1));
		if (((((((param4_func.attr3_Tok) === (0)) ? 1 : 0)) && (((param4_func.attr10_IsAbstract) ? 0 : 1))) ? 1 : 0)) {
			func5_Error("Internal error (function has no start token)", 273, "src\CompilerPasses\Parser.gbas");
			
		};
		if ((((param4_func.attr3_Typ) === (3)) ? 1 : 0)) {
			var local4_Vari_2701 = new type15_TIdentifierVari();
			local4_Vari_2701.attr8_Name_Str = "self";
			local4_Vari_2701.attr8_datatype.attr8_Name_Str = global8_Compiler.attr5_Types_ref[0].arrAccess(param4_func.attr6_MyType).values[tmpPositionCache][0].attr8_Name_Str;
			local4_Vari_2701.attr8_datatype.attr7_IsArray = 0;
			local4_Vari_2701.attr3_Typ = ~~(5);
			func11_AddVariable(local4_Vari_2701, 1);
			DIMPUSH(param4_func.attr6_Params, local4_Vari_2701.attr2_ID);
			param4_func.attr7_SelfVar = local4_Vari_2701.attr2_ID;
			
		};
		func7_GetNext();
		{
			var Err_Str = "";
			try {
				if (((param4_func.attr10_IsAbstract) ? 0 : 1)) {
					if ((((param4_func.attr3_Typ) === (2)) ? 1 : 0)) {
						local3_Scp_2702 = func5_Scope("ENDSUB", param4_func.attr2_ID);
						
					} else {
						var local1_e_2703 = 0;
						local3_Scp_2702 = func5_Scope("ENDFUNCTION", param4_func.attr2_ID);
						local1_e_2703 = func22_CreateReturnExpression(func28_CreateDefaultValueExpression(param4_func.attr8_datatype));
						DIMPUSH(global5_Exprs_ref[0].arrAccess(local3_Scp_2702).values[tmpPositionCache][0].attr5_Exprs, local1_e_2703);
						
					};
					
				} else {
					local3_Scp_2702 = func21_CreateScopeExpression(~~(2));
					DIMPUSH(global5_Exprs_ref[0].arrAccess(local3_Scp_2702).values[tmpPositionCache][0].attr5_Exprs, func21_CreateEmptyExpression());
					
				};
				
			} catch (Err_Str) {
				if (Err_Str instanceof OTTException) Err_Str = Err_Str.getText(); else throwError(Err_Str);{
					local3_Scp_2702 = func21_CreateEmptyExpression();
					
				}
			};
			
		};
		param4_func.attr3_Scp = local3_Scp_2702;
		global8_Compiler.attr11_currentPosi = ((local3_Tok_2699) - (1));
		func7_GetNext();
		global8_Compiler.attr11_currentFunc = ~~(local7_Curfunc_2700);
		global8_Compiler.attr12_CurrentScope = ~~(local6_TmpScp_2698);
		return 1;
		
	} else {
		return tryClone(0);
		
	};
	return 0;
	
};
func11_CompileFunc = window['func11_CompileFunc'];
window['func10_Expression'] = function(param4_Prio) {
	if ((((param4_Prio) < (15)) ? 1 : 0)) {
		var local4_Left_2706 = 0, local5_Right_2707 = 0, local5_Found_2708 = 0;
		local4_Left_2706 = func10_Expression(((param4_Prio) + (1)));
		local5_Right_2707 = -(1);
		local5_Found_2708 = 0;
		do {
			local5_Found_2708 = 0;
			var forEachSaver26018 = global9_Operators_ref[0];
			for(var forEachCounter26018 = 0 ; forEachCounter26018 < forEachSaver26018.values.length ; forEachCounter26018++) {
				var local2_Op_ref_2709 = forEachSaver26018.values[forEachCounter26018];
			{
					while (((((((local2_Op_ref_2709[0].attr4_Prio) === (param4_Prio)) ? 1 : 0)) && (func7_IsToken(local2_Op_ref_2709[0].attr7_Sym_Str))) ? 1 : 0)) {
						func5_Match(local2_Op_ref_2709[0].attr7_Sym_Str, 338, "src\CompilerPasses\Parser.gbas");
						local5_Right_2707 = func10_Expression(((param4_Prio) + (1)));
						local4_Left_2706 = func24_CreateOperatorExpression(unref(local2_Op_ref_2709[0]), local4_Left_2706, local5_Right_2707);
						{
							var Error_Str = "";
							try {
								var local6_Result_2710 = 0.0;
								local6_Result_2710 = func13_CalculateTree(unref(global5_Exprs_ref[0].arrAccess(local4_Left_2706).values[tmpPositionCache][0]));
								if ((((INTEGER(local6_Result_2710)) === (local6_Result_2710)) ? 1 : 0)) {
									local4_Left_2706 = func19_CreateIntExpression(~~(local6_Result_2710));
									
								} else {
									local5_Right_2707 = func21_CreateFloatExpression(local6_Result_2710);
									
								};
								
							} catch (Error_Str) {
								if (Error_Str instanceof OTTException) Error_Str = Error_Str.getText(); else throwError(Error_Str);{
									
								}
							};
							
						};
						local5_Found_2708 = 1;
						break;
						
					};
					
				}
				forEachSaver26018.values[forEachCounter26018] = local2_Op_ref_2709;
			
			};
			
		} while (!((((local5_Found_2708) === (0)) ? 1 : 0)));
		return tryClone(local4_Left_2706);
		
	} else {
		return tryClone(func6_Factor());
		
	};
	return 0;
	
};
func10_Expression = window['func10_Expression'];
window['func12_CastDatatype'] = function(param8_RetData1_ref, param8_RetData2_ref) {
	var local5_Data1_2714 = 0, local5_Data2_2715 = 0;
	local5_Data1_2714 = param8_RetData1_ref[0];
	local5_Data2_2715 = param8_RetData2_ref[0];
	if ((((global5_Exprs_ref[0].arrAccess(local5_Data1_2714).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (global5_Exprs_ref[0].arrAccess(local5_Data2_2715).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray)) ? 1 : 0)) {
		if ((((global5_Exprs_ref[0].arrAccess(local5_Data1_2714).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === (global5_Exprs_ref[0].arrAccess(local5_Data2_2715).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str)) ? 1 : 0)) {
			param8_RetData1_ref[0] = local5_Data1_2714;
			param8_RetData2_ref[0] = local5_Data2_2715;
			return tryClone(global5_Exprs_ref[0].arrAccess(param8_RetData1_ref[0]).values[tmpPositionCache][0].attr8_datatype);
			
		} else {
			if ((((global5_Exprs_ref[0].arrAccess(local5_Data1_2714).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("string")) ? 1 : 0)) {
				param8_RetData2_ref[0] = func27_CreateCast2StringExpression(local5_Data2_2715);
				
			} else if ((((global5_Exprs_ref[0].arrAccess(local5_Data2_2715).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("string")) ? 1 : 0)) {
				param8_RetData1_ref[0] = func27_CreateCast2StringExpression(local5_Data1_2714);
				
			} else if ((((global5_Exprs_ref[0].arrAccess(local5_Data1_2714).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("float")) ? 1 : 0)) {
				param8_RetData2_ref[0] = func26_CreateCast2FloatExpression(local5_Data2_2715);
				
			} else if ((((global5_Exprs_ref[0].arrAccess(local5_Data2_2715).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("float")) ? 1 : 0)) {
				param8_RetData1_ref[0] = func26_CreateCast2FloatExpression(local5_Data1_2714);
				
			} else {
				func5_Error((((((((((((("Cannot cast '") + (global5_Exprs_ref[0].arrAccess(local5_Data1_2714).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) + (func20_BuildArrBrackets_Str(global5_Exprs_ref[0].arrAccess(local5_Data1_2714).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray)))) + ("' to '"))) + (global5_Exprs_ref[0].arrAccess(local5_Data2_2715).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) + (func20_BuildArrBrackets_Str(global5_Exprs_ref[0].arrAccess(local5_Data2_2715).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray)))) + ("'")), 383, "src\CompilerPasses\Parser.gbas");
				
			};
			return tryClone(global5_Exprs_ref[0].arrAccess(param8_RetData1_ref[0]).values[tmpPositionCache][0].attr8_datatype);
			
		};
		
	} else {
		func5_Error((((((((((("Dimensions are different: ") + (global5_Exprs_ref[0].arrAccess(local5_Data1_2714).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) + (func20_BuildArrBrackets_Str(global5_Exprs_ref[0].arrAccess(local5_Data1_2714).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray)))) + (", "))) + (global5_Exprs_ref[0].arrAccess(local5_Data2_2715).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) + (func20_BuildArrBrackets_Str(global5_Exprs_ref[0].arrAccess(local5_Data2_2715).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray))), 389, "src\CompilerPasses\Parser.gbas");
		
	};
	return tryClone(unref(new type9_TDatatype()));
	
};
func12_CastDatatype = window['func12_CastDatatype'];
window['func14_EnsureDatatype'] = function(param4_Expr, param8_NeedData, param4_Line, param6_Strict) {
	var local6_myData_2720 = new type9_TDatatype();
	param6_Strict = 0;
	if ((((param8_NeedData.attr8_Name_Str) === ("")) ? 1 : 0)) {
		func5_Error("Internal error (datatype is empty)", 402, "src\CompilerPasses\Parser.gbas");
		
	};
	local6_myData_2720 = global5_Exprs_ref[0].arrAccess(param4_Expr).values[tmpPositionCache][0].attr8_datatype.clone();
	if (((((((local6_myData_2720.attr8_Name_Str) === (param8_NeedData.attr8_Name_Str)) ? 1 : 0)) && ((((local6_myData_2720.attr7_IsArray) === (param8_NeedData.attr7_IsArray)) ? 1 : 0))) ? 1 : 0)) {
		return tryClone(param4_Expr);
		
	} else {
		var local5_func1_2722 = 0, local5_func2_2723 = 0, local7_add_Str_2726 = "";
		if ((((param6_Strict) === (0)) ? 1 : 0)) {
			if ((((local6_myData_2720.attr7_IsArray) === (param8_NeedData.attr7_IsArray)) ? 1 : 0)) {
				if ((((((((((local6_myData_2720.attr8_Name_Str) === ("int")) ? 1 : 0)) || ((((local6_myData_2720.attr8_Name_Str) === ("float")) ? 1 : 0))) ? 1 : 0)) || ((((local6_myData_2720.attr8_Name_Str) === ("string")) ? 1 : 0))) ? 1 : 0)) {
					if ((((((((((param8_NeedData.attr8_Name_Str) === ("int")) ? 1 : 0)) || ((((param8_NeedData.attr8_Name_Str) === ("float")) ? 1 : 0))) ? 1 : 0)) || ((((param8_NeedData.attr8_Name_Str) === ("string")) ? 1 : 0))) ? 1 : 0)) {
						{
							var local17___SelectHelper45__2721 = "";
							local17___SelectHelper45__2721 = param8_NeedData.attr8_Name_Str;
							if ((((local17___SelectHelper45__2721) === ("int")) ? 1 : 0)) {
								return tryClone(func24_CreateCast2IntExpression(param4_Expr));
								
							} else if ((((local17___SelectHelper45__2721) === ("float")) ? 1 : 0)) {
								return tryClone(func26_CreateCast2FloatExpression(param4_Expr));
								
							} else if ((((local17___SelectHelper45__2721) === ("string")) ? 1 : 0)) {
								return tryClone(func27_CreateCast2StringExpression(param4_Expr));
								
							};
							
						};
						
					};
					
				};
				
			};
			
		};
		local5_func1_2722 = func14_SearchPrototyp(local6_myData_2720.attr8_Name_Str);
		local5_func2_2723 = func14_SearchPrototyp(param8_NeedData.attr8_Name_Str);
		if ((((local5_func1_2722) !== (-(1))) ? 1 : 0)) {
			if ((((local5_func2_2723) !== (-(1))) ? 1 : 0)) {
				var local7_checker_2724 = new type13_TProtoChecker();
				if ((((local6_myData_2720.attr7_IsArray) || (param8_NeedData.attr7_IsArray)) ? 1 : 0)) {
					func5_Error("PROTOTYPE cannot be an array.", 429, "src\CompilerPasses\Parser.gbas");
					
				};
				local7_checker_2724.attr8_fromFunc = global8_Compiler.attr5_Funcs_ref[0].arrAccess(local5_func1_2722).values[tmpPositionCache][0].attr2_ID;
				local7_checker_2724.attr6_toFunc = global8_Compiler.attr5_Funcs_ref[0].arrAccess(local5_func2_2723).values[tmpPositionCache][0].attr2_ID;
				local7_checker_2724.attr3_Tok = func15_GetCurrentToken().clone();
				DIMPUSH(global8_Compiler.attr13_protoCheckers, local7_checker_2724);
				return tryClone(param4_Expr);
				
			} else {
				if (((((((((((((param8_NeedData.attr8_Name_Str) === ("int")) ? 1 : 0)) || ((((param8_NeedData.attr8_Name_Str) === ("float")) ? 1 : 0))) ? 1 : 0)) || ((((param8_NeedData.attr8_Name_Str) === ("string")) ? 1 : 0))) ? 1 : 0)) && ((((param8_NeedData.attr7_IsArray) === (0)) ? 1 : 0))) ? 1 : 0)) {
					{
						var local17___SelectHelper46__2725 = "";
						local17___SelectHelper46__2725 = param8_NeedData.attr8_Name_Str;
						if ((((local17___SelectHelper46__2725) === ("int")) ? 1 : 0)) {
							return tryClone(func24_CreateCast2IntExpression(param4_Expr));
							
						} else if ((((local17___SelectHelper46__2725) === ("float")) ? 1 : 0)) {
							return tryClone(func26_CreateCast2FloatExpression(param4_Expr));
							
						} else if ((((local17___SelectHelper46__2725) === ("string")) ? 1 : 0)) {
							return tryClone(func27_CreateCast2StringExpression(param4_Expr));
							
						};
						
					};
					
				};
				
			};
			
		};
		if ((((func6_IsType(local6_myData_2720.attr8_Name_Str)) && (func6_IsType(param8_NeedData.attr8_Name_Str))) ? 1 : 0)) {
			return tryClone(param4_Expr);
			
		};
		local7_add_Str_2726 = "";
		if (param6_Strict) {
			local7_add_Str_2726 = " , and maybe can't cast, because it is BYREF (screw you BYREF >:O)!!";
			
		};
		func5_Error((((((((((((((("Cannot cast datatypes. Needs '") + (param8_NeedData.attr8_Name_Str))) + (func20_BuildArrBrackets_Str(param8_NeedData.attr7_IsArray)))) + ("', got '"))) + (local6_myData_2720.attr8_Name_Str))) + (func20_BuildArrBrackets_Str(local6_myData_2720.attr7_IsArray)))) + ("'"))) + (local7_add_Str_2726)), param4_Line, "src\CompilerPasses\Parser.gbas");
		
	};
	return 0;
	
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
	var local1_i_2784 = 0, local1_j_2785 = 0, local4_loop_2786 = 0;
	local1_i_2784 = 0;
	local1_j_2785 = 0;
	{
		for (local4_loop_2786 = 0;toCheck(local4_loop_2786, (((param10_hexStr_Str).length) - (1)), 1);local4_loop_2786 += 1) {
			local1_i_2784 = ((ASC(MID_Str(param10_hexStr_Str, local4_loop_2786, 1), 0)) - (48));
			if ((((9) < (local1_i_2784)) ? 1 : 0)) {
				local1_i_2784+=-(7);
				
			};
			local1_j_2785 = ((local1_j_2785) * (16));
			local1_j_2785 = bOR(local1_j_2785, bAND(local1_i_2784, 15));
			
		};
		
	};
	return tryClone(local1_j_2785);
	return 0;
	
};
func7_Hex2Dec = window['func7_Hex2Dec'];
window['func6_Factor'] = function() {
	if (func7_IsToken("(")) {
		var local4_Expr_2728 = 0;
		func5_Match("(", 499, "src\CompilerPasses\Parser.gbas");
		local4_Expr_2728 = func10_Expression(0);
		func5_Match(")", 501, "src\CompilerPasses\Parser.gbas");
		return tryClone(local4_Expr_2728);
		
	} else if (func12_IsIdentifier(1, 0)) {
		return tryClone(func10_Identifier(0));
		
	} else if (func8_IsString()) {
		var local7_Str_Str_2729 = "";
		local7_Str_Str_2729 = func14_GetCurrent_Str();
		if ((((INSTR(local7_Str_Str_2729, "\n", 0)) !== (-(1))) ? 1 : 0)) {
			func5_Error("Expecting '\"'", 509, "src\CompilerPasses\Parser.gbas");
			
		};
		func7_GetNext();
		return tryClone(func19_CreateStrExpression(local7_Str_Str_2729));
		
	} else if ((((MID_Str(func14_GetCurrent_Str(), 0, 2)) === ("0x")) ? 1 : 0)) {
		var local7_hex_Str_2730 = "";
		local7_hex_Str_2730 = MID_Str(func14_GetCurrent_Str(), 2, -(1));
		func7_GetNext();
		return tryClone(func19_CreateIntExpression(func7_Hex2Dec(local7_hex_Str_2730)));
		
	} else if ((((func8_IsNumber()) || (func7_IsToken("."))) ? 1 : 0)) {
		var local3_Num_2731 = 0, local12_hasToHaveNum_2732 = 0;
		local12_hasToHaveNum_2732 = 0;
		if (func7_IsToken(".")) {
			local3_Num_2731 = 0;
			local12_hasToHaveNum_2732 = 1;
			
		} else {
			local3_Num_2731 = INT2STR(func14_GetCurrent_Str());
			func7_GetNext();
			
		};
		if (func7_IsToken(".")) {
			var local4_Num2_2733 = 0, local3_pos_2734 = 0, local4_FNum_2735 = 0.0;
			func5_Match(".", 529, "src\CompilerPasses\Parser.gbas");
			local4_Num2_2733 = INT2STR(func14_GetCurrent_Str());
			local3_pos_2734 = global8_Compiler.attr11_currentPosi;
			if (func8_IsNumber()) {
				func7_GetNext();
				
			};
			local4_FNum_2735 = FLOAT2STR(((((((CAST2STRING(local3_Num_2731)) + ("."))) + (CAST2STRING(local4_Num2_2733)))) + (CAST2STRING(0))));
			return tryClone(func21_CreateFloatExpression(local4_FNum_2735));
			
		} else {
			if (local12_hasToHaveNum_2732) {
				func5_Error("Expecting number!", 542, "src\CompilerPasses\Parser.gbas");
				
			};
			return tryClone(func19_CreateIntExpression(local3_Num_2731));
			
		};
		
	} else if (func7_IsToken("-")) {
		var local4_Expr_2736 = 0, alias2_Op_ref_2737 = [new type9_TOperator()], local7_tmpData_2738 = new type9_TDatatype();
		func5_Match("-", 546, "src\CompilerPasses\Parser.gbas");
		local4_Expr_2736 = func6_Factor();
		alias2_Op_ref_2737 = global9_Operators_ref[0].arrAccess(func14_SearchOperator("sub")).values[tmpPositionCache] /* ALIAS */;
		local7_tmpData_2738 = global5_Exprs_ref[0].arrAccess(local4_Expr_2736).values[tmpPositionCache][0].attr8_datatype.clone();
		local7_tmpData_2738.attr7_IsArray = 0;
		local4_Expr_2736 = func14_EnsureDatatype(local4_Expr_2736, local7_tmpData_2738, 553, 0);
		if ((((global5_Exprs_ref[0].arrAccess(local4_Expr_2736).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("float")) ? 1 : 0)) {
			local4_Expr_2736 = func24_CreateOperatorExpression(unref(alias2_Op_ref_2737[0]), func21_CreateFloatExpression(0), func14_EnsureDatatype(local4_Expr_2736, global13_floatDatatype, 555, 0));
			
		} else if (((((((global5_Exprs_ref[0].arrAccess(local4_Expr_2736).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("int")) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(local4_Expr_2736).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("string")) ? 1 : 0))) ? 1 : 0)) {
			local4_Expr_2736 = func24_CreateOperatorExpression(unref(alias2_Op_ref_2737[0]), func19_CreateIntExpression(0), func14_EnsureDatatype(local4_Expr_2736, global11_intDatatype, 557, 0));
			
		} else {
			func5_Error((((("Unexpected datatype, expecting 'float/int' got '") + (global5_Exprs_ref[0].arrAccess(local4_Expr_2736).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) + ("'")), 559, "src\CompilerPasses\Parser.gbas");
			
		};
		return tryClone(local4_Expr_2736);
		
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
		var local4_Expr_2739 = 0, local7_Kerning_2740 = 0;
		func5_Match("LEN", 579, "src\CompilerPasses\Parser.gbas");
		func5_Match("(", 580, "src\CompilerPasses\Parser.gbas");
		local4_Expr_2739 = func10_Expression(0);
		local7_Kerning_2740 = 0;
		if (func7_IsToken(",")) {
			func5_Match(",", 585, "src\CompilerPasses\Parser.gbas");
			local7_Kerning_2740 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 586, 0);
			func5_Match(")", 587, "src\CompilerPasses\Parser.gbas");
			local4_Expr_2739 = func14_EnsureDatatype(local4_Expr_2739, global11_strDatatype, 590, 0);
			return tryClone(func19_CreateLenExpression(local4_Expr_2739, local7_Kerning_2740));
			
		} else {
			func5_Match(")", 594, "src\CompilerPasses\Parser.gbas");
			if ((((global5_Exprs_ref[0].arrAccess(local4_Expr_2739).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0)) {
				if ((((((((((global5_Exprs_ref[0].arrAccess(local4_Expr_2739).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("int")) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(local4_Expr_2739).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("float")) ? 1 : 0))) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(local4_Expr_2739).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("string")) ? 1 : 0))) ? 1 : 0)) {
					local4_Expr_2739 = func14_EnsureDatatype(local4_Expr_2739, global11_strDatatype, 598, 0);
					return tryClone(func19_CreateLenExpression(local4_Expr_2739, -(1)));
					
				} else {
					func5_Error((((("Cannot get the length of Type '") + (global5_Exprs_ref[0].arrAccess(local4_Expr_2739).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) + ("'")), 602, "src\CompilerPasses\Parser.gbas");
					
				};
				
			} else {
				return tryClone(func21_CreateBoundExpression(local4_Expr_2739, func19_CreateIntExpression(0)));
				
			};
			
		};
		
	} else if (func7_IsToken("BOUNDS")) {
		var local4_Expr_2741 = 0, local9_Dimension_2742 = 0;
		func5_Match("BOUNDS", 609, "src\CompilerPasses\Parser.gbas");
		func5_Match("(", 610, "src\CompilerPasses\Parser.gbas");
		local4_Expr_2741 = func10_Expression(0);
		func5_Match(",", 612, "src\CompilerPasses\Parser.gbas");
		if ((((global5_Exprs_ref[0].arrAccess(local4_Expr_2741).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0)) {
			func5_Error("BOUNDS needs array!", 613, "src\CompilerPasses\Parser.gbas");
			
		};
		local9_Dimension_2742 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 614, 0);
		func5_Match(")", 615, "src\CompilerPasses\Parser.gbas");
		return tryClone(func21_CreateBoundExpression(local4_Expr_2741, local9_Dimension_2742));
		
	} else if (func7_IsToken("ADDRESSOF")) {
		var local8_Name_Str_2743 = "", local6_MyFunc_2744 = 0;
		func5_Match("ADDRESSOF", 619, "src\CompilerPasses\Parser.gbas");
		func5_Match("(", 620, "src\CompilerPasses\Parser.gbas");
		local8_Name_Str_2743 = func14_GetCurrent_Str();
		local6_MyFunc_2744 = -(1);
		var forEachSaver27147 = global8_Compiler.attr5_Funcs_ref[0];
		for(var forEachCounter27147 = 0 ; forEachCounter27147 < forEachSaver27147.values.length ; forEachCounter27147++) {
			var local4_Func_ref_2745 = forEachSaver27147.values[forEachCounter27147];
		{
				if ((((((((((local4_Func_ref_2745[0].attr3_Typ) === (1)) ? 1 : 0)) || ((((local4_Func_ref_2745[0].attr3_Typ) === (2)) ? 1 : 0))) ? 1 : 0)) && ((((local4_Func_ref_2745[0].attr8_Name_Str) === (local8_Name_Str_2743)) ? 1 : 0))) ? 1 : 0)) {
					local6_MyFunc_2744 = local4_Func_ref_2745[0].attr2_ID;
					break;
					
				};
				
			}
			forEachSaver27147.values[forEachCounter27147] = local4_Func_ref_2745;
		
		};
		if ((((local6_MyFunc_2744) === (-(1))) ? 1 : 0)) {
			func5_Error((((("Function '") + (local8_Name_Str_2743))) + ("' is unknown!")), 629, "src\CompilerPasses\Parser.gbas");
			
		};
		global8_Compiler.attr5_Funcs_ref[0].arrAccess(local6_MyFunc_2744).values[tmpPositionCache][0].attr10_PlzCompile = 1;
		func7_GetNext();
		func5_Match(")", 632, "src\CompilerPasses\Parser.gbas");
		return tryClone(func25_CreateAddressOfExpression(local6_MyFunc_2744));
		
	} else if (func7_IsToken("NOT")) {
		func5_Match("NOT", 636, "src\CompilerPasses\Parser.gbas");
		return tryClone(func19_CreateNotExpression(func14_EnsureDatatype(func6_Factor(), global13_floatDatatype, 637, 0)));
		
	} else if ((((((((((func7_IsToken("DIM")) || (func7_IsToken("DIM%"))) ? 1 : 0)) || (func7_IsToken("DIM$"))) ? 1 : 0)) || (func7_IsToken("DIM#"))) ? 1 : 0)) {
		var local8_datatype_2747 = new type9_TDatatype(), local4_dims_2748 = new OTTArray();
		if (((static12_Factor_DIMASEXPRErr) ? 0 : 1)) {
			static12_Factor_DIMASEXPRErr = 1;
			func7_Warning("Experimental feature 'DIMASEXPR'");
			
		};
		local8_datatype_2747.attr7_IsArray = 1;
		local8_datatype_2747.attr8_Name_Str = "float";
		if (func7_IsToken("DIM%")) {
			local8_datatype_2747.attr8_Name_Str = "int";
			
		};
		if (func7_IsToken("DIM$")) {
			local8_datatype_2747.attr8_Name_Str = "string";
			
		};
		if (func7_IsToken("DIM#")) {
			local8_datatype_2747.attr8_Name_Str = "float";
			
		};
		func7_GetNext();
		do {
			var local1_E_2749 = 0;
			func5_Match("[", 654, "src\CompilerPasses\Parser.gbas");
			local1_E_2749 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 655, 0);
			func5_Match("]", 656, "src\CompilerPasses\Parser.gbas");
			DIMPUSH(local4_dims_2748, local1_E_2749);
			
		} while (!((((func7_IsToken("[")) === (0)) ? 1 : 0)));
		if (func7_IsToken("AS")) {
			if ((((local8_datatype_2747.attr8_Name_Str) === ("float")) ? 1 : 0)) {
				func5_Match("AS", 662, "src\CompilerPasses\Parser.gbas");
				func15_IsValidDatatype();
				local8_datatype_2747.attr8_Name_Str = func14_GetCurrent_Str();
				
			} else {
				func5_Error("Unexpected AS", 666, "src\CompilerPasses\Parser.gbas");
				
			};
			
		};
		return tryClone(func25_CreateDimAsExprExpression(local8_datatype_2747, unref(local4_dims_2748)));
		
	} else if (func7_IsToken("DEFINED")) {
		var local4_Find_2750 = 0;
		func5_Match("DEFINED", 672, "src\CompilerPasses\Parser.gbas");
		func5_Match("(", 673, "src\CompilerPasses\Parser.gbas");
		local4_Find_2750 = 0;
		var forEachSaver27362 = global7_Defines;
		for(var forEachCounter27362 = 0 ; forEachCounter27362 < forEachSaver27362.values.length ; forEachCounter27362++) {
			var local3_Def_2751 = forEachSaver27362.values[forEachCounter27362];
		{
				if ((((func7_IsToken(local3_Def_2751.attr7_Key_Str)) && ((((INTEGER(FLOAT2STR(local3_Def_2751.attr9_Value_Str))) !== (0)) ? 1 : 0))) ? 1 : 0)) {
					local4_Find_2750 = 1;
					break;
					
				};
				
			}
			forEachSaver27362.values[forEachCounter27362] = local3_Def_2751;
		
		};
		func7_GetNext();
		func5_Match(")", 682, "src\CompilerPasses\Parser.gbas");
		return tryClone(func19_CreateIntExpression(local4_Find_2750));
		
	} else if (func7_IsToken("IIF")) {
		var local4_Cond_2752 = 0, local6_onTrue_2753 = 0, local7_onFalse_2754 = 0;
		func5_Match("IIF", 686, "src\CompilerPasses\Parser.gbas");
		func5_Match("(", 687, "src\CompilerPasses\Parser.gbas");
		local4_Cond_2752 = func14_EnsureDatatype(func10_Expression(0), global13_floatDatatype, 689, 0);
		func5_Match(",", 690, "src\CompilerPasses\Parser.gbas");
		local6_onTrue_2753 = func10_Expression(0);
		func5_Match(",", 692, "src\CompilerPasses\Parser.gbas");
		local7_onFalse_2754 = func10_Expression(0);
		func5_Match(")", 694, "src\CompilerPasses\Parser.gbas");
		if (((((((global5_Exprs_ref[0].arrAccess(local6_onTrue_2753).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) !== (global5_Exprs_ref[0].arrAccess(local7_onFalse_2754).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str)) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(local6_onTrue_2753).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) !== (global5_Exprs_ref[0].arrAccess(local7_onFalse_2754).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray)) ? 1 : 0))) ? 1 : 0)) {
			func5_Error("IIF parameters do not match!", 697, "src\CompilerPasses\Parser.gbas");
			
		};
		return tryClone(func19_CreateIIFExpression(local4_Cond_2752, local6_onTrue_2753, local7_onFalse_2754));
		
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
			var local5_found_2097 = 0;
			func5_Start();
			func5_Scope("__EOFFILE__", -(1));
			var forEachSaver11089 = global8_Compiler.attr5_Funcs_ref[0];
			for(var forEachCounter11089 = 0 ; forEachCounter11089 < forEachSaver11089.values.length ; forEachCounter11089++) {
				var local4_func_ref_2079 = forEachSaver11089.values[forEachCounter11089];
			{
					if (((((((local4_func_ref_2079[0].attr3_Typ) === (2)) ? 1 : 0)) || ((((local4_func_ref_2079[0].attr3_Typ) === (3)) ? 1 : 0))) ? 1 : 0)) {
						local4_func_ref_2079[0].attr10_PlzCompile = 1;
						
					};
					
				}
				forEachSaver11089.values[forEachCounter11089] = local4_func_ref_2079;
			
			};
			while (1) {
				var local5_Found_2080 = 0;
				local5_Found_2080 = 0;
				var forEachSaver11127 = global8_Compiler.attr5_Funcs_ref[0];
				for(var forEachCounter11127 = 0 ; forEachCounter11127 < forEachSaver11127.values.length ; forEachCounter11127++) {
					var local4_func_ref_2081 = forEachSaver11127.values[forEachCounter11127];
				{
						if ((((local4_func_ref_2081[0].attr10_PlzCompile) && ((((local4_func_ref_2081[0].attr3_Scp) === (-(1))) ? 1 : 0))) ? 1 : 0)) {
							if (func11_CompileFunc(unref(local4_func_ref_2081[0]))) {
								local5_Found_2080 = 1;
								
							};
							
						};
						
					}
					forEachSaver11127.values[forEachCounter11127] = local4_func_ref_2081;
				
				};
				if ((((local5_Found_2080) === (0)) ? 1 : 0)) {
					break;
					
				};
				
			};
			{
				var local1_i_2082 = 0.0;
				for (local1_i_2082 = 0;toCheck(local1_i_2082, ((global10_LastExprID) - (1)), 1);local1_i_2082 += 1) {
					var alias4_Expr_ref_2083 = [new type5_TExpr()];
					alias4_Expr_ref_2083 = global5_Exprs_ref[0].arrAccess(~~(local1_i_2082)).values[tmpPositionCache] /* ALIAS */;
					if (((((((alias4_Expr_ref_2083[0].attr3_Typ) === (6)) ? 1 : 0)) || ((((alias4_Expr_ref_2083[0].attr3_Typ) === (23)) ? 1 : 0))) ? 1 : 0)) {
						if (((((((BOUNDS(alias4_Expr_ref_2083[0].attr6_Params, 0)) < (BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(alias4_Expr_ref_2083[0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0))) ? 1 : 0)) && ((((alias4_Expr_ref_2083[0].attr8_wasAdded) === (0)) ? 1 : 0))) ? 1 : 0)) {
							var local4_Meth_2084 = 0, local7_TmpSave_2085 = 0;
							alias4_Expr_ref_2083[0].attr8_wasAdded = 1;
							local4_Meth_2084 = 0;
							if ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(alias4_Expr_ref_2083[0].attr4_func).values[tmpPositionCache][0].attr3_Typ) === (3)) ? 1 : 0)) {
								if ((((BOUNDS(alias4_Expr_ref_2083[0].attr6_Params, 0)) === (0)) ? 1 : 0)) {
									func5_Error((((("Internal error (method '") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(alias4_Expr_ref_2083[0].attr4_func).values[tmpPositionCache][0].attr8_Name_Str))) + ("' didn't get self parameter)")), 802, "src\CompilerPasses\Parser.gbas");
									
								};
								local4_Meth_2084 = 1;
								local7_TmpSave_2085 = alias4_Expr_ref_2083[0].attr6_Params.arrAccess(-(1)).values[tmpPositionCache];
								DIMDEL(alias4_Expr_ref_2083[0].attr6_Params, -(1));
								
							};
							{
								for (local1_i_2082 = BOUNDS(alias4_Expr_ref_2083[0].attr6_Params, 0);toCheck(local1_i_2082, ((((BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(alias4_Expr_ref_2083[0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0)) - (1))) - (local4_Meth_2084)), 1);local1_i_2082 += 1) {
									if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(alias4_Expr_ref_2083[0].attr4_func).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_i_2082)).values[tmpPositionCache]).values[tmpPositionCache][0].attr6_PreDef) !== (-(1))) ? 1 : 0)) {
										DIMPUSH(alias4_Expr_ref_2083[0].attr6_Params, global8_Compiler.attr5_Varis_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(alias4_Expr_ref_2083[0].attr4_func).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_i_2082)).values[tmpPositionCache]).values[tmpPositionCache][0].attr6_PreDef);
										
									};
									
								};
								
							};
							if (local4_Meth_2084) {
								DIMPUSH(alias4_Expr_ref_2083[0].attr6_Params, local7_TmpSave_2085);
								
							};
							
						};
						
					};
					
				};
				
			};
			func15_CheckPrototypes();
			{
				var local1_i_2086 = 0.0;
				for (local1_i_2086 = 0;toCheck(local1_i_2086, ((global10_LastExprID) - (1)), 1);local1_i_2086 += 1) {
					if (((((((global5_Exprs_ref[0].arrAccess(~~(local1_i_2086)).values[tmpPositionCache][0].attr3_Typ) === (6)) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(~~(local1_i_2086)).values[tmpPositionCache][0].attr3_Typ) === (23)) ? 1 : 0))) ? 1 : 0)) {
						var local4_Meth_2087 = 0;
						local4_Meth_2087 = 0;
						if ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2086)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr3_Typ) === (3)) ? 1 : 0)) {
							local4_Meth_2087 = 1;
							
						};
						global8_Compiler.attr11_currentPosi = global5_Exprs_ref[0].arrAccess(~~(local1_i_2086)).values[tmpPositionCache][0].attr5_tokID;
						if ((((BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2086)).values[tmpPositionCache][0].attr6_Params, 0)) === (BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2086)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0))) ? 1 : 0)) {
							var local1_j_2088 = 0.0, local9_NewParams_2089 = new OTTArray();
							local1_j_2088 = 0;
							var forEachSaver11554 = global5_Exprs_ref[0].arrAccess(~~(local1_i_2086)).values[tmpPositionCache][0].attr6_Params;
							for(var forEachCounter11554 = 0 ; forEachCounter11554 < forEachSaver11554.values.length ; forEachCounter11554++) {
								var local1_P_2090 = forEachSaver11554.values[forEachCounter11554];
							{
									var local1_S_2091 = 0, local3_Tmp_2092 = 0;
									local1_S_2091 = 0;
									if (global8_Compiler.attr5_Varis_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2086)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_j_2088)).values[tmpPositionCache]).values[tmpPositionCache][0].attr3_ref) {
										global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(local1_P_2090, 1)).values[tmpPositionCache][0].attr3_ref = 1;
										local1_S_2091 = 1;
										
									};
									if (((local1_S_2091) ? 0 : 1)) {
										local3_Tmp_2092 = func14_EnsureDatatype(local1_P_2090, global8_Compiler.attr5_Varis_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2086)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_j_2088)).values[tmpPositionCache]).values[tmpPositionCache][0].attr8_datatype, 851, local1_S_2091);
										
									} else {
										local3_Tmp_2092 = local1_P_2090;
										
									};
									DIMPUSH(local9_NewParams_2089, local3_Tmp_2092);
									local1_j_2088+=1;
									
								}
								forEachSaver11554.values[forEachCounter11554] = local1_P_2090;
							
							};
							global5_Exprs_ref[0].arrAccess(~~(local1_i_2086)).values[tmpPositionCache][0].attr6_Params = local9_NewParams_2089.clone();
							
						} else {
							var local8_miss_Str_2093 = "", local9_datas_Str_2094 = "";
							local8_miss_Str_2093 = "";
							if ((((BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2086)).values[tmpPositionCache][0].attr6_Params, 0)) < (BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2086)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0))) ? 1 : 0)) {
								{
									var local1_j_2095 = 0.0;
									for (local1_j_2095 = BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2086)).values[tmpPositionCache][0].attr6_Params, 0);toCheck(local1_j_2095, ((((BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2086)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0)) - (1))) - (local4_Meth_2087)), 1);local1_j_2095 += 1) {
										local8_miss_Str_2093 = ((((local8_miss_Str_2093) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2086)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_j_2095)).values[tmpPositionCache]).values[tmpPositionCache][0].attr8_Name_Str))) + (", "));
										
									};
									
								};
								
							} else if ((((BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2086)).values[tmpPositionCache][0].attr6_Params, 0)) > (BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2086)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0))) ? 1 : 0)) {
								{
									var local1_j_2096 = 0.0;
									for (local1_j_2096 = BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2086)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0);toCheck(local1_j_2096, ((((BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2086)).values[tmpPositionCache][0].attr6_Params, 0)) - (local4_Meth_2087))) - (1)), 1);local1_j_2096 += 1) {
										if ((((global5_Exprs_ref[0].arrAccess(~~(local1_i_2086)).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_j_2096)).values[tmpPositionCache]) < (BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0))) ? 1 : 0)) {
											local9_datas_Str_2094 = ((((local9_datas_Str_2094) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2086)).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_j_2096)).values[tmpPositionCache]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) + (", "));
											
										};
										
									};
									
								};
								
							};
							global8_Compiler.attr11_currentPosi = global5_Exprs_ref[0].arrAccess(~~(local1_i_2086)).values[tmpPositionCache][0].attr5_tokID;
							if ((((BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2086)).values[tmpPositionCache][0].attr6_Params, 0)) > (BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2086)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0))) ? 1 : 0)) {
								func5_Error((((((((((((((((("Too many parameters, function '") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2086)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr8_Name_Str))) + ("' has: '"))) + (CAST2STRING(((BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2086)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0)) - (local4_Meth_2087)))))) + ("' got '"))) + (CAST2STRING(BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2086)).values[tmpPositionCache][0].attr6_Params, 0))))) + ("' datatypes '"))) + (local9_datas_Str_2094))) + ("'")), 874, "src\CompilerPasses\Parser.gbas");
								
							} else if ((((BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2086)).values[tmpPositionCache][0].attr6_Params, 0)) < (BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2086)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0))) ? 1 : 0)) {
								func5_Error((((((((((((((((("Too less parameters, function '") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2086)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr8_Name_Str))) + ("' has: '"))) + (CAST2STRING(((BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2086)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0)) - (local4_Meth_2087)))))) + ("' got '"))) + (CAST2STRING(BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2086)).values[tmpPositionCache][0].attr6_Params, 0))))) + ("' missing '"))) + (local8_miss_Str_2093))) + ("'")), 876, "src\CompilerPasses\Parser.gbas");
								
							} else {
								func5_Error((((((((("Internal error (wtf? call: ") + (CAST2STRING(BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2086)).values[tmpPositionCache][0].attr6_Params, 0))))) + (", "))) + (CAST2STRING(BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2086)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0))))) + (")")), 878, "src\CompilerPasses\Parser.gbas");
								
							};
							
						};
						
					};
					
				};
				
			};
			func15_CheckPrototypes();
			local5_found_2097 = 1;
			while (local5_found_2097) {
				local5_found_2097 = 0;
				{
					var local1_i_2098 = 0.0;
					for (local1_i_2098 = 0;toCheck(local1_i_2098, ((global10_LastExprID) - (1)), 1);local1_i_2098 += 1) {
						var alias1_E_ref_2099 = [new type5_TExpr()], local3_set_2100 = 0, local4_Vari_2101 = 0, local3_var_2102 = 0;
						alias1_E_ref_2099 = global5_Exprs_ref[0].arrAccess(~~(local1_i_2098)).values[tmpPositionCache] /* ALIAS */;
						local3_set_2100 = 0;
						{
							var local17___SelectHelper14__2103 = 0;
							local17___SelectHelper14__2103 = alias1_E_ref_2099[0].attr3_Typ;
							if ((((local17___SelectHelper14__2103) === (~~(40))) ? 1 : 0)) {
								local4_Vari_2101 = alias1_E_ref_2099[0].attr4_vari;
								local3_var_2102 = func11_GetVariable(alias1_E_ref_2099[0].attr4_expr, 0);
								local3_set_2100 = 1;
								
							} else if ((((local17___SelectHelper14__2103) === (~~(38))) ? 1 : 0)) {
								local4_Vari_2101 = alias1_E_ref_2099[0].attr6_inExpr;
								local3_var_2102 = func11_GetVariable(alias1_E_ref_2099[0].attr7_varExpr, 0);
								local3_set_2100 = 1;
								
							} else if ((((local17___SelectHelper14__2103) === (~~(6))) ? 1 : 0)) {
								
							};
							
						};
						if ((((local3_set_2100) && ((((local3_var_2102) >= (0)) ? 1 : 0))) ? 1 : 0)) {
							var local1_v_2104 = 0;
							local1_v_2104 = func11_GetVariable(local4_Vari_2101, 1);
							if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_var_2102).values[tmpPositionCache][0].attr3_ref) !== (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_v_2104).values[tmpPositionCache][0].attr3_ref)) ? 1 : 0)) {
								local5_found_2097 = 1;
								
							};
							global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_var_2102).values[tmpPositionCache][0].attr3_ref = global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_v_2104).values[tmpPositionCache][0].attr3_ref;
							
						};
						
					};
					
				};
				
			};
			{
				var local1_i_2105 = 0.0;
				for (local1_i_2105 = 0;toCheck(local1_i_2105, ((global10_LastExprID) - (1)), 1);local1_i_2105 += 1) {
					var alias4_Expr_ref_2106 = [new type5_TExpr()];
					alias4_Expr_ref_2106 = global5_Exprs_ref[0].arrAccess(~~(local1_i_2105)).values[tmpPositionCache] /* ALIAS */;
					{
						var local17___SelectHelper15__2107 = 0;
						local17___SelectHelper15__2107 = alias4_Expr_ref_2106[0].attr3_Typ;
						if ((((local17___SelectHelper15__2107) === (~~(2))) ? 1 : 0)) {
							if ((((((((((alias4_Expr_ref_2106[0].attr6_ScpTyp) === (2)) ? 1 : 0)) || ((((alias4_Expr_ref_2106[0].attr6_ScpTyp) === (4)) ? 1 : 0))) ? 1 : 0)) && (BOUNDS(alias4_Expr_ref_2106[0].attr5_Gotos, 0))) ? 1 : 0)) {
								if (((func12_ScopeHasGoto(unref(alias4_Expr_ref_2106[0]))) ? 0 : 1)) {
									func5_Error("Internal Error (There is a goto, but I can't find it)", 941, "src\CompilerPasses\Parser.gbas");
									
								};
								var forEachSaver12239 = alias4_Expr_ref_2106[0].attr5_Gotos;
								for(var forEachCounter12239 = 0 ; forEachCounter12239 < forEachSaver12239.values.length ; forEachCounter12239++) {
									var local1_G_2108 = forEachSaver12239.values[forEachCounter12239];
								{
										var local5_Found_2109 = 0;
										local5_Found_2109 = 0;
										var forEachSaver12212 = alias4_Expr_ref_2106[0].attr6_Labels;
										for(var forEachCounter12212 = 0 ; forEachCounter12212 < forEachSaver12212.values.length ; forEachCounter12212++) {
											var local1_L_2110 = forEachSaver12212.values[forEachCounter12212];
										{
												if ((((global5_Exprs_ref[0].arrAccess(local1_L_2110).values[tmpPositionCache][0].attr8_Name_Str) === (global5_Exprs_ref[0].arrAccess(local1_G_2108).values[tmpPositionCache][0].attr8_Name_Str)) ? 1 : 0)) {
													local5_Found_2109 = 1;
													break;
													
												};
												
											}
											forEachSaver12212.values[forEachCounter12212] = local1_L_2110;
										
										};
										if (((local5_Found_2109) ? 0 : 1)) {
											global8_Compiler.attr11_currentPosi = global5_Exprs_ref[0].arrAccess(local1_G_2108).values[tmpPositionCache][0].attr5_tokID;
											func5_Error((((("Label '") + (global5_Exprs_ref[0].arrAccess(local1_G_2108).values[tmpPositionCache][0].attr8_Name_Str))) + ("' does not exist, please use an existing label badass!")), 952, "src\CompilerPasses\Parser.gbas");
											
										};
										
									}
									forEachSaver12239.values[forEachCounter12239] = local1_G_2108;
								
								};
								
							};
							
						};
						
					};
					
				};
				
			};
			var forEachSaver12265 = global8_Compiler.attr5_Types_ref[0];
			for(var forEachCounter12265 = 0 ; forEachCounter12265 < forEachSaver12265.values.length ; forEachCounter12265++) {
				var local3_Typ_ref_2111 = forEachSaver12265.values[forEachCounter12265];
			{
					local3_Typ_ref_2111[0].attr9_OName_Str = local3_Typ_ref_2111[0].attr8_Name_Str;
					local3_Typ_ref_2111[0].attr8_Name_Str = func18_ChangeTypeName_Str(local3_Typ_ref_2111[0].attr8_Name_Str);
					
				}
				forEachSaver12265.values[forEachCounter12265] = local3_Typ_ref_2111;
			
			};
			var forEachSaver12275 = global8_Compiler.attr5_Funcs_ref[0];
			for(var forEachCounter12275 = 0 ; forEachCounter12275 < forEachSaver12275.values.length ; forEachCounter12275++) {
				var local4_Func_ref_2112 = forEachSaver12275.values[forEachCounter12275];
			{
					func14_ChangeFuncName(unref(local4_Func_ref_2112[0]));
					
				}
				forEachSaver12275.values[forEachCounter12275] = local4_Func_ref_2112;
			
			};
			var forEachSaver12285 = global8_Compiler.attr5_Varis_ref[0];
			for(var forEachCounter12285 = 0 ; forEachCounter12285 < forEachSaver12285.values.length ; forEachCounter12285++) {
				var local4_Vari_ref_2113 = forEachSaver12285.values[forEachCounter12285];
			{
					func13_ChangeVarName(unref(local4_Vari_ref_2113[0]));
					
				}
				forEachSaver12285.values[forEachCounter12285] = local4_Vari_ref_2113;
			
			};
			var forEachSaver12321 = global8_Compiler.attr5_Varis_ref[0];
			for(var forEachCounter12321 = 0 ; forEachCounter12321 < forEachSaver12321.values.length ; forEachCounter12321++) {
				var local1_V_ref_2114 = forEachSaver12321.values[forEachCounter12321];
			{
					if (((((((local1_V_ref_2114[0].attr3_Typ) === (1)) ? 1 : 0)) || ((((local1_V_ref_2114[0].attr3_Typ) === (7)) ? 1 : 0))) ? 1 : 0)) {
						local1_V_ref_2114[0].attr8_Name_Str = ((((local1_V_ref_2114[0].attr8_Name_Str) + ("_"))) + (CAST2STRING(local1_V_ref_2114[0].attr2_ID)));
						
					};
					
				}
				forEachSaver12321.values[forEachCounter12321] = local1_V_ref_2114;
			
			};
			{
				var local1_i_2115 = 0.0;
				for (local1_i_2115 = 0;toCheck(local1_i_2115, ((global10_LastExprID) - (1)), 1);local1_i_2115 += 1) {
					var alias1_E_ref_2116 = [new type5_TExpr()];
					alias1_E_ref_2116 = global5_Exprs_ref[0].arrAccess(~~(local1_i_2115)).values[tmpPositionCache] /* ALIAS */;
					if (((((((((((((alias1_E_ref_2116[0].attr8_datatype.attr8_Name_Str) === ("void")) ? 1 : 0)) || ((((alias1_E_ref_2116[0].attr8_datatype.attr8_Name_Str) === ("int")) ? 1 : 0))) ? 1 : 0)) || ((((alias1_E_ref_2116[0].attr8_datatype.attr8_Name_Str) === ("float")) ? 1 : 0))) ? 1 : 0)) || ((((alias1_E_ref_2116[0].attr8_datatype.attr8_Name_Str) === ("string")) ? 1 : 0))) ? 1 : 0)) {
						
					} else {
						if ((((func6_IsType(alias1_E_ref_2116[0].attr8_datatype.attr8_Name_Str)) === (0)) ? 1 : 0)) {
							var forEachSaver12412 = global8_Compiler.attr5_Funcs_ref[0];
							for(var forEachCounter12412 = 0 ; forEachCounter12412 < forEachSaver12412.values.length ; forEachCounter12412++) {
								var local1_F_ref_2117 = forEachSaver12412.values[forEachCounter12412];
							{
									if ((((alias1_E_ref_2116[0].attr8_datatype.attr8_Name_Str) === (local1_F_ref_2117[0].attr9_OName_Str)) ? 1 : 0)) {
										alias1_E_ref_2116[0].attr8_datatype.attr8_Name_Str = local1_F_ref_2117[0].attr8_Name_Str;
										
									};
									
								}
								forEachSaver12412.values[forEachCounter12412] = local1_F_ref_2117;
							
							};
							
						};
						
					};
					
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
		var forEachSaver12601 = global8_Compiler.attr13_protoCheckers;
		for(var forEachCounter12601 = 0 ; forEachCounter12601 < forEachSaver12601.values.length ; forEachCounter12601++) {
			var local7_checker_2119 = forEachSaver12601.values[forEachCounter12601];
		{
				var alias5_func1_ref_2120 = [new type15_TIdentifierFunc()], alias5_func2_ref_2121 = [new type15_TIdentifierFunc()], local5_valid_2122 = 0;
				alias5_func1_ref_2120 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(local7_checker_2119.attr8_fromFunc).values[tmpPositionCache] /* ALIAS */;
				alias5_func2_ref_2121 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(local7_checker_2119.attr6_toFunc).values[tmpPositionCache] /* ALIAS */;
				local5_valid_2122 = 0;
				if (((((((alias5_func1_ref_2120[0].attr8_datatype.attr8_Name_Str) === (alias5_func2_ref_2121[0].attr8_datatype.attr8_Name_Str)) ? 1 : 0)) && ((((alias5_func1_ref_2120[0].attr8_datatype.attr7_IsArray) === (alias5_func2_ref_2121[0].attr8_datatype.attr7_IsArray)) ? 1 : 0))) ? 1 : 0)) {
					if ((((BOUNDS(alias5_func1_ref_2120[0].attr6_Params, 0)) === (BOUNDS(alias5_func2_ref_2121[0].attr6_Params, 0))) ? 1 : 0)) {
						local5_valid_2122 = 1;
						{
							var local1_i_2123 = 0.0;
							for (local1_i_2123 = 0;toCheck(local1_i_2123, ((BOUNDS(alias5_func1_ref_2120[0].attr6_Params, 0)) - (1)), 1);local1_i_2123 += 1) {
								var alias2_p1_ref_2124 = [new type15_TIdentifierVari()], alias2_p2_ref_2125 = [new type15_TIdentifierVari()];
								alias2_p1_ref_2124 = global8_Compiler.attr5_Varis_ref[0].arrAccess(alias5_func1_ref_2120[0].attr6_Params.arrAccess(~~(local1_i_2123)).values[tmpPositionCache]).values[tmpPositionCache] /* ALIAS */;
								alias2_p2_ref_2125 = global8_Compiler.attr5_Varis_ref[0].arrAccess(alias5_func2_ref_2121[0].attr6_Params.arrAccess(~~(local1_i_2123)).values[tmpPositionCache]).values[tmpPositionCache] /* ALIAS */;
								if (((((((alias2_p1_ref_2124[0].attr8_datatype.attr8_Name_Str) !== (alias2_p2_ref_2125[0].attr8_datatype.attr8_Name_Str)) ? 1 : 0)) || ((((alias2_p1_ref_2124[0].attr8_datatype.attr7_IsArray) !== (alias2_p2_ref_2125[0].attr8_datatype.attr7_IsArray)) ? 1 : 0))) ? 1 : 0)) {
									local5_valid_2122 = 0;
									
								};
								
							};
							
						};
						
					};
					
				};
				if ((((local5_valid_2122) === (0)) ? 1 : 0)) {
					func5_Error((((((((("Cannot cast prototype '") + (func17_BuildPrototyp_Str(local7_checker_2119.attr8_fromFunc)))) + ("' to '"))) + (func17_BuildPrototyp_Str(local7_checker_2119.attr6_toFunc)))) + ("'")), 1036, "src\CompilerPasses\Parser.gbas");
					
				};
				
			}
			forEachSaver12601.values[forEachCounter12601] = local7_checker_2119;
		
		};
		REDIM(global8_Compiler.attr13_protoCheckers, [0], new type13_TProtoChecker() );
		
	};
	return 0;
	
};
func15_CheckPrototypes = window['func15_CheckPrototypes'];
window['func5_Scope'] = function(param12_CloseStr_Str, param4_func) {
	var local6_ScpTyp_2128 = 0, local9_Important_2129 = 0, local7_befLoop_2131 = 0, local8_TmpScope_2132 = 0.0, local12_TmpImportant_2133 = 0, local7_OneLine_2136 = 0, local13_OCloseStr_Str_2137 = "", local7_MyScope_2144 = 0;
	var local12_CloseStr_Str_ref_2126 = [param12_CloseStr_Str];
	local6_ScpTyp_2128 = 0;
	local9_Important_2129 = 0;
	{
		var local17___SelectHelper16__2130 = "";
		local17___SelectHelper16__2130 = local12_CloseStr_Str_ref_2126[0];
		if ((((local17___SelectHelper16__2130) === ("ENDIF")) ? 1 : 0)) {
			local6_ScpTyp_2128 = ~~(1);
			
		} else if ((((local17___SelectHelper16__2130) === ("ENDSELECT")) ? 1 : 0)) {
			local6_ScpTyp_2128 = ~~(6);
			
		} else if ((((local17___SelectHelper16__2130) === ("WEND")) ? 1 : 0)) {
			local6_ScpTyp_2128 = ~~(3);
			
		} else if ((((local17___SelectHelper16__2130) === ("UNTIL")) ? 1 : 0)) {
			local6_ScpTyp_2128 = ~~(3);
			
		} else if ((((local17___SelectHelper16__2130) === ("NEXT")) ? 1 : 0)) {
			local6_ScpTyp_2128 = ~~(3);
			
		} else if ((((local17___SelectHelper16__2130) === ("ENDFUNCTION")) ? 1 : 0)) {
			local6_ScpTyp_2128 = ~~(2);
			local9_Important_2129 = 1;
			
		} else if ((((local17___SelectHelper16__2130) === ("ENDSUB")) ? 1 : 0)) {
			local6_ScpTyp_2128 = ~~(2);
			local9_Important_2129 = 1;
			
		} else if ((((local17___SelectHelper16__2130) === ("CATCH")) ? 1 : 0)) {
			local6_ScpTyp_2128 = ~~(5);
			
		} else if ((((local17___SelectHelper16__2130) === ("FINALLY")) ? 1 : 0)) {
			local6_ScpTyp_2128 = ~~(5);
			
		} else if ((((local17___SelectHelper16__2130) === ("__EOFFILE__")) ? 1 : 0)) {
			local6_ScpTyp_2128 = ~~(4);
			local9_Important_2129 = 1;
			
		} else {
			func5_Error("Internal error (unknown scope type)", 1073, "src\CompilerPasses\Parser.gbas");
			
		};
		
	};
	local7_befLoop_2131 = global8_Compiler.attr6_inLoop;
	if ((((local6_ScpTyp_2128) === (3)) ? 1 : 0)) {
		global8_Compiler.attr6_inLoop = 1;
		
	};
	local8_TmpScope_2132 = global8_Compiler.attr12_CurrentScope;
	local12_TmpImportant_2133 = global8_Compiler.attr14_ImportantScope;
	global8_Compiler.attr12_CurrentScope = func21_CreateScopeExpression(local6_ScpTyp_2128);
	if ((((local12_CloseStr_Str_ref_2126[0]) === ("__EOFFILE__")) ? 1 : 0)) {
		global8_Compiler.attr9_MainScope = global8_Compiler.attr12_CurrentScope;
		
	};
	if (local9_Important_2129) {
		global8_Compiler.attr14_ImportantScope = global8_Compiler.attr12_CurrentScope;
		
	};
	if (((((((local6_ScpTyp_2128) === (2)) ? 1 : 0)) && ((((param4_func) !== (-(1))) ? 1 : 0))) ? 1 : 0)) {
		var forEachSaver12831 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr6_Params;
		for(var forEachCounter12831 = 0 ; forEachCounter12831 < forEachSaver12831.values.length ; forEachCounter12831++) {
			var local5_param_2134 = forEachSaver12831.values[forEachCounter12831];
		{
				var local4_vari_2135 = new type15_TIdentifierVari();
				local4_vari_2135 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local5_param_2134).values[tmpPositionCache][0].clone();
				local4_vari_2135.attr3_Typ = ~~(1);
				func11_AddVariable(local4_vari_2135, 1);
				DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
				DIMPUSH(global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr10_CopyParams, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
				
			}
			forEachSaver12831.values[forEachCounter12831] = local5_param_2134;
		
		};
		
	};
	local7_OneLine_2136 = 0;
	if (func7_IsToken("THEN")) {
		local7_OneLine_2136 = 1;
		func5_Match("THEN", 1102, "src\CompilerPasses\Parser.gbas");
		
	};
	local13_OCloseStr_Str_2137 = local12_CloseStr_Str_ref_2126[0];
	while ((((func7_IsToken(func13_IsClosing_Str(local12_CloseStr_Str_ref_2126, local6_ScpTyp_2128))) === (0)) ? 1 : 0)) {
		if ((((func8_EOFParse()) === (0)) ? 1 : 0)) {
			func5_Error((("Missing closing: ") + (local12_CloseStr_Str_ref_2126[0])), 1106, "src\CompilerPasses\Parser.gbas");
			
		};
		{
			var Err_Str = "";
			try {
				var local4_Expr_2138 = 0;
				local4_Expr_2138 = -(1);
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
					local4_Expr_2138 = func7_Keyword();
					
				} else if (func12_IsIdentifier(1, 0)) {
					local4_Expr_2138 = func10_Identifier(1);
					
				} else if (func7_IsToken("super")) {
					local4_Expr_2138 = func10_Identifier(1);
					
				} else {
					var local3_pos_2139 = 0, local8_Name_Str_2140 = "";
					local3_pos_2139 = global8_Compiler.attr11_currentPosi;
					local8_Name_Str_2140 = REPLACE_Str(func14_GetCurrent_Str(), "@", "");
					func7_GetNext();
					if (func7_IsToken(":")) {
						var local3_Scp_2141 = 0;
						func5_Match(":", 1137, "src\CompilerPasses\Parser.gbas");
						local4_Expr_2138 = func21_CreateLabelExpression(local8_Name_Str_2140);
						local3_Scp_2141 = global8_Compiler.attr12_CurrentScope;
						do {
							var forEachSaver13006 = global5_Exprs_ref[0].arrAccess(local3_Scp_2141).values[tmpPositionCache][0].attr6_Labels;
							for(var forEachCounter13006 = 0 ; forEachCounter13006 < forEachSaver13006.values.length ; forEachCounter13006++) {
								var local3_lbl_2142 = forEachSaver13006.values[forEachCounter13006];
							{
									if ((((global5_Exprs_ref[0].arrAccess(local3_lbl_2142).values[tmpPositionCache][0].attr8_Name_Str) === (local8_Name_Str_2140)) ? 1 : 0)) {
										func10_ResetError((((("Duplicate label identifier '") + (local8_Name_Str_2140))) + ("'")), local3_pos_2139);
										
									};
									
								}
								forEachSaver13006.values[forEachCounter13006] = local3_lbl_2142;
							
							};
							local3_Scp_2141 = global5_Exprs_ref[0].arrAccess(local3_Scp_2141).values[tmpPositionCache][0].attr10_SuperScope;
							
						} while (!(((((((local3_Scp_2141) === (-(1))) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(local3_Scp_2141).values[tmpPositionCache][0].attr6_ScpTyp) === (2)) ? 1 : 0))) ? 1 : 0)));
						DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr14_ImportantScope).values[tmpPositionCache][0].attr6_Labels, local4_Expr_2138);
						
					} else {
						if (func7_IsToken("[")) {
							func5_Match("[", 1152, "src\CompilerPasses\Parser.gbas");
							func5_Match("]", 1153, "src\CompilerPasses\Parser.gbas");
							
						};
						if ((((func7_IsToken("=")) && (((global6_STRICT) ? 0 : 1))) ? 1 : 0)) {
							global8_Compiler.attr11_currentPosi = ((local3_pos_2139) - (1));
							func7_GetNext();
							func14_ImplicitDefine();
							if (func12_IsIdentifier(0, 0)) {
								local4_Expr_2138 = func10_Identifier(1);
								
							} else {
								func5_Error("Internal error (implicit not created)", 1165, "src\CompilerPasses\Parser.gbas");
								
							};
							
						} else {
							func10_ResetError("Invalid command (unknown function, variable or keyword).", local3_pos_2139);
							
						};
						
					};
					
				};
				if ((((local4_Expr_2138) !== (-(1))) ? 1 : 0)) {
					DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local4_Expr_2138);
					
				};
				if (local7_OneLine_2136) {
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
	if (((((((local7_OneLine_2136) === (0)) ? 1 : 0)) && ((((local12_CloseStr_Str_ref_2126[0]) === (local13_OCloseStr_Str_2137)) ? 1 : 0))) ? 1 : 0)) {
		func5_Match(unref(local12_CloseStr_Str_ref_2126[0]), 1186, "src\CompilerPasses\Parser.gbas");
		
	};
	local7_MyScope_2144 = global8_Compiler.attr12_CurrentScope;
	global8_Compiler.attr12_CurrentScope = ~~(local8_TmpScope_2132);
	global8_Compiler.attr6_inLoop = local7_befLoop_2131;
	if (local9_Important_2129) {
		global8_Compiler.attr14_ImportantScope = local12_TmpImportant_2133;
		
	};
	return tryClone(local7_MyScope_2144);
	return 0;
	
};
func5_Scope = window['func5_Scope'];
window['func10_ResetError'] = function(param7_err_Str, param3_pos) {
	var local3_tmp_2147 = 0.0;
	local3_tmp_2147 = global8_Compiler.attr11_currentPosi;
	global8_Compiler.attr11_currentPosi = param3_pos;
	{
		var Ex_Str = "";
		try {
			func5_Error(param7_err_Str, 1203, "src\CompilerPasses\Parser.gbas");
			
		} catch (Ex_Str) {
			if (Ex_Str instanceof OTTException) Ex_Str = Ex_Str.getText(); else throwError(Ex_Str);{
				global8_Compiler.attr11_currentPosi = ~~(local3_tmp_2147);
				throw new OTTException(Ex_Str, "\src\CompilerPasses\Parser.gbas", 1207);
				
			}
		};
		
	};
	return 0;
	
};
func10_ResetError = window['func10_ResetError'];
window['func13_IsClosing_Str'] = function(param12_CloseStr_Str_ref, param6_ScpTyp) {
	{
		var local17___SelectHelper17__2151 = 0;
		local17___SelectHelper17__2151 = param6_ScpTyp;
		if ((((local17___SelectHelper17__2151) === (~~(1))) ? 1 : 0)) {
			if (func7_IsToken("ELSE")) {
				param12_CloseStr_Str_ref[0] = "ELSE";
				
			};
			if (func7_IsToken("ELSEIF")) {
				param12_CloseStr_Str_ref[0] = "ELSEIF";
				
			};
			
		} else if ((((local17___SelectHelper17__2151) === (~~(6))) ? 1 : 0)) {
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
	var local9_PreferVar_2153 = 0, local4_Expr_ref_2154 = [0], local5_IsAcc_2155 = 0;
	local9_PreferVar_2153 = 0;
	if ((((func7_IsToken("LOCAL")) && ((((param9_IsCommand) === (0)) ? 1 : 0))) ? 1 : 0)) {
		local9_PreferVar_2153 = 1;
		
	};
	if ((((func7_IsToken("GLOBAL")) && ((((param9_IsCommand) === (0)) ? 1 : 0))) ? 1 : 0)) {
		local9_PreferVar_2153 = -(1);
		
	};
	if ((((local9_PreferVar_2153) !== (0)) ? 1 : 0)) {
		func7_GetNext();
		
	};
	local4_Expr_ref_2154[0] = -(1);
	local5_IsAcc_2155 = 0;
	if (func7_IsToken("super")) {
		func5_Match("super", 1236, "src\CompilerPasses\Parser.gbas");
		if (((((((global8_Compiler.attr11_currentFunc) !== (-(1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType) !== (-(1))) ? 1 : 0))) ? 1 : 0)) {
			var local3_typ_2156 = 0;
			local3_typ_2156 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType;
			if ((((global8_Compiler.attr5_Types_ref[0].arrAccess(local3_typ_2156).values[tmpPositionCache][0].attr9_Extending) !== (-(1))) ? 1 : 0)) {
				local4_Expr_ref_2154[0] = func21_CreateSuperExpression(global8_Compiler.attr5_Types_ref[0].arrAccess(local3_typ_2156).values[tmpPositionCache][0].attr9_Extending);
				func5_Match(".", 1241, "src\CompilerPasses\Parser.gbas");
				local5_IsAcc_2155 = 1;
				
			} else {
				func5_Error("There is no super class/type", 1244, "src\CompilerPasses\Parser.gbas");
				
			};
			
		} else {
			func5_Error("Super has to be in method", 1247, "src\CompilerPasses\Parser.gbas");
			
		};
		
	};
	if ((((func6_IsType("")) && (((func12_IsIdentifier(0, 0)) ? 0 : 1))) ? 1 : 0)) {
		var local4_posi_2157 = 0.0, local7_typ_Str_2158 = "";
		local4_posi_2157 = global8_Compiler.attr11_currentPosi;
		local7_typ_Str_2158 = func14_GetCurrent_Str();
		func7_GetNext();
		if (func7_IsToken("(")) {
			func5_Match("(", 1256, "src\CompilerPasses\Parser.gbas");
			local4_Expr_ref_2154[0] = func10_Expression(0);
			func5_Match(")", 1258, "src\CompilerPasses\Parser.gbas");
			if ((((func6_IsType(global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2154[0]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str)) && ((((global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2154[0]).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0))) ? 1 : 0)) {
				local4_Expr_ref_2154[0] = func14_CreateCast2Obj(local7_typ_Str_2158, unref(local4_Expr_ref_2154[0]));
				if (func7_IsToken(".")) {
					func5_Match(".", 1262, "src\CompilerPasses\Parser.gbas");
					local5_IsAcc_2155 = 1;
					
				} else {
					return tryClone(unref(local4_Expr_ref_2154[0]));
					
				};
				
			} else {
				func5_Error("Cannot cast non TYPE or array", 1268, "src\CompilerPasses\Parser.gbas");
				
			};
			
		} else {
			global8_Compiler.attr11_currentPosi = ~~(local4_posi_2157);
			
		};
		
	};
	do {
		var local8_Name_Str_2159 = "", local9_SuperExpr_ref_2160 = [0], local5_Varis_2161 = new OTTArray(), local5_Found_2162 = 0;
		local8_Name_Str_2159 = func17_CleanVariable_Str(func14_GetCurrent_Str());
		func7_GetNext();
		if ((((func7_IsToken("%")) || (func7_IsToken("%"))) ? 1 : 0)) {
			func7_GetNext();
			
		};
		local9_SuperExpr_ref_2160[0] = local4_Expr_ref_2154[0];
		if ((((local4_Expr_ref_2154[0]) === (-(1))) ? 1 : 0)) {
			func8_GetVaris(unref(local5_Varis_2161), -(1), local9_PreferVar_2153);
			local9_PreferVar_2153 = 0;
			
		} else {
			if ((((func6_IsType(global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2154[0]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str)) === (0)) ? 1 : 0)) {
				func5_Error((((("Expecting type, got primitive datatype '") + (global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2154[0]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) + ("'")), 1293, "src\CompilerPasses\Parser.gbas");
				
			};
			local5_Varis_2161 = global8_LastType.attr10_Attributes.clone();
			
		};
		local5_Found_2162 = 0;
		var forEachSaver13746 = local5_Varis_2161;
		for(var forEachCounter13746 = 0 ; forEachCounter13746 < forEachSaver13746.values.length ; forEachCounter13746++) {
			var local4_Vari_2163 = forEachSaver13746.values[forEachCounter13746];
		{
				if ((((local8_Name_Str_2159) === (global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Vari_2163).values[tmpPositionCache][0].attr8_Name_Str)) ? 1 : 0)) {
					if ((((((((((global8_Compiler.attr11_currentFunc) !== (-(1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType) !== (-(1))) ? 1 : 0))) ? 1 : 0)) && ((((local4_Expr_ref_2154[0]) === (-(1))) ? 1 : 0))) ? 1 : 0)) {
						var local13_IsNotImplicit_2164 = 0;
						local13_IsNotImplicit_2164 = 0;
						var forEachSaver13687 = local5_Varis_2161;
						for(var forEachCounter13687 = 0 ; forEachCounter13687 < forEachSaver13687.values.length ; forEachCounter13687++) {
							var local9_OtherVari_2165 = forEachSaver13687.values[forEachCounter13687];
						{
								if ((((((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local9_OtherVari_2165).values[tmpPositionCache][0].attr8_Name_Str) === (local8_Name_Str_2159)) ? 1 : 0)) && ((((((((((((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local9_OtherVari_2165).values[tmpPositionCache][0].attr3_Typ) === (1)) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local9_OtherVari_2165).values[tmpPositionCache][0].attr3_Typ) === (5)) ? 1 : 0))) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local9_OtherVari_2165).values[tmpPositionCache][0].attr3_Typ) === (4)) ? 1 : 0))) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local9_OtherVari_2165).values[tmpPositionCache][0].attr3_Typ) === (7)) ? 1 : 0))) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local9_OtherVari_2165).values[tmpPositionCache][0].attr3_Typ) === (6)) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) && ((((local9_OtherVari_2165) !== (local4_Vari_2163)) ? 1 : 0))) ? 1 : 0)) {
									local13_IsNotImplicit_2164 = 1;
									break;
									
								};
								
							}
							forEachSaver13687.values[forEachCounter13687] = local9_OtherVari_2165;
						
						};
						if (((local13_IsNotImplicit_2164) ? 0 : 1)) {
							var alias3_Typ_ref_2166 = [new type15_TIdentifierType()];
							alias3_Typ_ref_2166 = global8_Compiler.attr5_Types_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType).values[tmpPositionCache] /* ALIAS */;
							var forEachSaver13732 = alias3_Typ_ref_2166[0].attr10_Attributes;
							for(var forEachCounter13732 = 0 ; forEachCounter13732 < forEachSaver13732.values.length ; forEachCounter13732++) {
								var local1_A_2167 = forEachSaver13732.values[forEachCounter13732];
							{
									if ((((local4_Vari_2163) === (local1_A_2167)) ? 1 : 0)) {
										local9_SuperExpr_ref_2160[0] = func24_CreateVariableExpression(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr7_SelfVar);
										break;
										
									};
									
								}
								forEachSaver13732.values[forEachCounter13732] = local1_A_2167;
							
							};
							
						} else {
							continue;
							
						};
						
					};
					local4_Expr_ref_2154[0] = func24_CreateVariableExpression(local4_Vari_2163);
					local5_Found_2162 = 1;
					break;
					
				};
				
			}
			forEachSaver13746.values[forEachCounter13746] = local4_Vari_2163;
		
		};
		while ((((func7_IsToken("(")) && (local5_Found_2162)) ? 1 : 0)) {
			var local4_func_2168 = 0;
			local4_func_2168 = func14_SearchPrototyp(global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2154[0]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str);
			if ((((local4_func_2168) !== (-(1))) ? 1 : 0)) {
				var local6_Params_2169 = new OTTArray();
				func13_ParseFuncCall(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local4_func_2168).values[tmpPositionCache][0].attr8_datatype, unref(local6_Params_2169), param9_IsCommand);
				local4_Expr_ref_2154[0] = func25_CreateProtoCallExpression(unref(local4_Expr_ref_2154[0]), unref(local6_Params_2169));
				
			} else {
				func5_Error("Can only call PROTOTYPEs", 1338, "src\CompilerPasses\Parser.gbas");
				
			};
			
		};
		if ((((local5_Found_2162) === (0)) ? 1 : 0)) {
			if ((((local4_Expr_ref_2154[0]) !== (-(1))) ? 1 : 0)) {
				var local5_typId_2170 = 0;
				func6_IsType(global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2154[0]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str);
				if (global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2154[0]).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) {
					func5_Error("Cannot access to array.", 1344, "src\CompilerPasses\Parser.gbas");
					
				};
				local5_typId_2170 = global8_LastType.attr2_ID;
				while ((((local5_typId_2170) !== (-(1))) ? 1 : 0)) {
					var forEachSaver13894 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_2170).values[tmpPositionCache][0].attr7_Methods;
					for(var forEachCounter13894 = 0 ; forEachCounter13894 < forEachSaver13894.values.length ; forEachCounter13894++) {
						var local1_M_2171 = forEachSaver13894.values[forEachCounter13894];
					{
							if ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local1_M_2171).values[tmpPositionCache][0].attr8_Name_Str) === (local8_Name_Str_2159)) ? 1 : 0)) {
								if (((local5_Found_2162) ? 0 : 1)) {
									var local1_a_2172 = 0;
									local1_a_2172 = func19_ParseIdentifierFunc(local4_Expr_ref_2154, local9_SuperExpr_ref_2160, param9_IsCommand, local8_Name_Str_2159, local1_M_2171);
									if ((((local1_a_2172) !== (-(1))) ? 1 : 0)) {
										return tryClone(local1_a_2172);
										
									};
									
								};
								local5_Found_2162 = 1;
								
							};
							
						}
						forEachSaver13894.values[forEachCounter13894] = local1_M_2171;
					
					};
					local5_typId_2170 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_2170).values[tmpPositionCache][0].attr9_Extending;
					
				};
				
			} else {
				var local3_Val_ref_2173 = [0];
				if ((global8_Compiler.attr11_GlobalFuncs).GetValue(local8_Name_Str_2159, local3_Val_ref_2173)) {
					var local1_a_2174 = 0;
					local1_a_2174 = func19_ParseIdentifierFunc(local4_Expr_ref_2154, local9_SuperExpr_ref_2160, param9_IsCommand, local8_Name_Str_2159, unref(local3_Val_ref_2173[0]));
					if ((((local1_a_2174) !== (-(1))) ? 1 : 0)) {
						return tryClone(local1_a_2174);
						
					};
					local5_Found_2162 = 1;
					
				} else if (((((((global8_Compiler.attr11_currentFunc) !== (-(1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType) !== (-(1))) ? 1 : 0))) ? 1 : 0)) {
					var alias3_Typ_ref_2175 = [new type15_TIdentifierType()], local5_typId_2176 = 0;
					alias3_Typ_ref_2175 = global8_Compiler.attr5_Types_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType).values[tmpPositionCache] /* ALIAS */;
					local5_typId_2176 = alias3_Typ_ref_2175[0].attr2_ID;
					while ((((local5_typId_2176) !== (-(1))) ? 1 : 0)) {
						var forEachSaver14037 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_2176).values[tmpPositionCache][0].attr7_Methods;
						for(var forEachCounter14037 = 0 ; forEachCounter14037 < forEachSaver14037.values.length ; forEachCounter14037++) {
							var local1_M_2177 = forEachSaver14037.values[forEachCounter14037];
						{
								if ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local1_M_2177).values[tmpPositionCache][0].attr8_Name_Str) === (local8_Name_Str_2159)) ? 1 : 0)) {
									if (((local5_Found_2162) ? 0 : 1)) {
										var local1_a_2178 = 0;
										local1_a_2178 = func19_ParseIdentifierFunc(local4_Expr_ref_2154, local9_SuperExpr_ref_2160, param9_IsCommand, local8_Name_Str_2159, local1_M_2177);
										if ((((local1_a_2178) !== (-(1))) ? 1 : 0)) {
											return tryClone(local1_a_2178);
											
										};
										
									};
									local5_Found_2162 = 1;
									
								};
								
							}
							forEachSaver14037.values[forEachCounter14037] = local1_M_2177;
						
						};
						local5_typId_2176 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_2176).values[tmpPositionCache][0].attr9_Extending;
						
					};
					
				};
				
			};
			while ((((func7_IsToken("(")) && (local5_Found_2162)) ? 1 : 0)) {
				var local4_func_2179 = 0;
				local4_func_2179 = func14_SearchPrototyp(global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2154[0]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str);
				if ((((local4_func_2179) !== (-(1))) ? 1 : 0)) {
					var local6_Params_2180 = new OTTArray();
					func13_ParseFuncCall(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local4_func_2179).values[tmpPositionCache][0].attr8_datatype, unref(local6_Params_2180), param9_IsCommand);
					local4_Expr_ref_2154[0] = func25_CreateProtoCallExpression(unref(local4_Expr_ref_2154[0]), unref(local6_Params_2180));
					
				} else {
					func5_Error("Can only call PROTOTYPEs", 1397, "src\CompilerPasses\Parser.gbas");
					
				};
				
			};
			if ((((local5_Found_2162) === (0)) ? 1 : 0)) {
				if ((((local4_Expr_ref_2154[0]) !== (-(1))) ? 1 : 0)) {
					var local8_Atts_Str_2181 = "";
					local8_Atts_Str_2181 = "";
					var forEachSaver14146 = local5_Varis_2161;
					for(var forEachCounter14146 = 0 ; forEachCounter14146 < forEachSaver14146.values.length ; forEachCounter14146++) {
						var local4_Vari_2182 = forEachSaver14146.values[forEachCounter14146];
					{
							if ((((local8_Name_Str_2159) === (global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Vari_2182).values[tmpPositionCache][0].attr8_Name_Str)) ? 1 : 0)) {
								local8_Atts_Str_2181 = ((((local8_Atts_Str_2181) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Vari_2182).values[tmpPositionCache][0].attr8_Name_Str))) + (", "));
								
							};
							
						}
						forEachSaver14146.values[forEachCounter14146] = local4_Vari_2182;
					
					};
					func6_IsType(global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2154[0]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str);
					func5_Error((((((((((((("Cannot find attribute '") + (local8_Name_Str_2159))) + ("' in type '"))) + (global8_LastType.attr8_Name_Str))) + ("' possible attributes '"))) + (local8_Atts_Str_2181))) + ("'")), 1410, "src\CompilerPasses\Parser.gbas");
					
				} else {
					func5_Error((((("Internal error ") + (local8_Name_Str_2159))) + (" (expected identifier).")), 1412, "src\CompilerPasses\Parser.gbas");
					
				};
				
			};
			
		};
		if (func7_IsToken("[")) {
			var local4_Dims_2183 = new OTTArray();
			if ((((global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2154[0]).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0)) {
				func5_Error("Array access, but this identifier is no array", 1421, "src\CompilerPasses\Parser.gbas");
				
			};
			while (func7_IsToken("[")) {
				var local7_dimExpr_2184 = 0;
				func5_Match("[", 1424, "src\CompilerPasses\Parser.gbas");
				if (func7_IsToken("]")) {
					func5_Match("]", 1426, "src\CompilerPasses\Parser.gbas");
					break;
					
				};
				local7_dimExpr_2184 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 1429, 0);
				func5_Match("]", 1430, "src\CompilerPasses\Parser.gbas");
				DIMPUSH(local4_Dims_2183, local7_dimExpr_2184);
				
			};
			local4_Expr_ref_2154[0] = func21_CreateArrayExpression(unref(local4_Expr_ref_2154[0]), unref(local4_Dims_2183));
			
		};
		local4_Expr_ref_2154[0] = func22_CreateAccessExpression(unref(local9_SuperExpr_ref_2160[0]), unref(local4_Expr_ref_2154[0]));
		if (func7_IsToken(".")) {
			func5_Match(".", 1441, "src\CompilerPasses\Parser.gbas");
			local5_IsAcc_2155 = 1;
			
		} else {
			local5_IsAcc_2155 = 0;
			
		};
		
	} while (!((((local5_IsAcc_2155) === (0)) ? 1 : 0)));
	if (((((((func7_IsToken("=")) && ((((local4_Expr_ref_2154[0]) !== (-(1))) ? 1 : 0))) ? 1 : 0)) && (param9_IsCommand)) ? 1 : 0)) {
		var local7_tmpData_2185 = new type9_TDatatype();
		if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(unref(local4_Expr_ref_2154[0]), 1)).values[tmpPositionCache][0].attr3_Typ) === (6)) ? 1 : 0)) {
			func5_Error("Assignment invalid, because of CONSTANT variable.", 1450, "src\CompilerPasses\Parser.gbas");
			
		};
		if (((((((global5_Exprs_ref[0].arrAccess(func12_GetRightExpr(unref(local4_Expr_ref_2154[0]))).values[tmpPositionCache][0].attr3_Typ) === (6)) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(func12_GetRightExpr(unref(local4_Expr_ref_2154[0]))).values[tmpPositionCache][0].attr3_Typ) === (23)) ? 1 : 0))) ? 1 : 0)) {
			func5_Error("Cannot assign to function call.", 1452, "src\CompilerPasses\Parser.gbas");
			
		};
		func5_Match("=", 1453, "src\CompilerPasses\Parser.gbas");
		if ((((param9_IsCommand) === (0)) ? 1 : 0)) {
			func5_Error("Assignment is a statement.", 1454, "src\CompilerPasses\Parser.gbas");
			
		};
		local7_tmpData_2185 = global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2154[0]).values[tmpPositionCache][0].attr8_datatype.clone();
		return tryClone(func22_CreateAssignExpression(unref(local4_Expr_ref_2154[0]), func14_EnsureDatatype(func10_Expression(0), local7_tmpData_2185, 1458, 0)));
		
	};
	if ((((local4_Expr_ref_2154[0]) !== (-(1))) ? 1 : 0)) {
		return tryClone(unref(local4_Expr_ref_2154[0]));
		
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
		var local3_typ_2191 = 0;
		local3_typ_2191 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType;
		while ((((local3_typ_2191) !== (-(1))) ? 1 : 0)) {
			if (((((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr6_MyType) === (local3_typ_2191)) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr6_MyType) !== (-(1))) ? 1 : 0))) ? 1 : 0)) {
				param9_SuperExpr_ref[0] = func24_CreateVariableExpression(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr7_SelfVar);
				break;
				
			};
			local3_typ_2191 = global8_Compiler.attr5_Types_ref[0].arrAccess(local3_typ_2191).values[tmpPositionCache][0].attr9_Extending;
			
		};
		
	};
	global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr10_PlzCompile = 1;
	if (((((((func7_IsToken("(")) === (0)) ? 1 : 0)) && ((((param9_IsCommand) === (0)) ? 1 : 0))) ? 1 : 0)) {
		var local8_datatype_2192 = new type9_TDatatype();
		local8_datatype_2192.attr8_Name_Str = param8_Name_Str;
		local8_datatype_2192.attr7_IsArray = 0;
		global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr15_UsedAsPrototype = 1;
		return tryClone(func24_CreateFuncDataExpression(local8_datatype_2192));
		
	} else {
		var local6_Params_2193 = new OTTArray();
		func13_ParseFuncCall(global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr8_datatype, unref(local6_Params_2193), param9_IsCommand);
		param4_Expr_ref[0] = func24_CreateFuncCallExpression(global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr2_ID, unref(local6_Params_2193));
		
	};
	return tryClone(-(1));
	return 0;
	
};
func19_ParseIdentifierFunc = window['func19_ParseIdentifierFunc'];
window['func13_ParseFuncCall'] = function(param8_datatype, param6_Params, param9_IsCommand) {
	var local9_OpBracket_2197 = 0, local4_Find_2198 = 0.0, local12_CloseBracket_2199 = 0;
	local9_OpBracket_2197 = func7_IsToken("(");
	if ((((param8_datatype.attr8_Name_Str) === ("void")) ? 1 : 0)) {
		if (((param9_IsCommand) ? 0 : 1)) {
			func5_Error("Void function has to be a command!", 1514, "src\CompilerPasses\Parser.gbas");
			
		};
		local9_OpBracket_2197 = 0;
		
	} else {
		if (local9_OpBracket_2197) {
			func5_Match("(", 1521, "src\CompilerPasses\Parser.gbas");
			
		};
		
	};
	local4_Find_2198 = 0;
	while (((((((func7_IsToken("\n")) === (0)) ? 1 : 0)) && ((((func7_IsToken(")")) === (0)) ? 1 : 0))) ? 1 : 0)) {
		if (local4_Find_2198) {
			func5_Match(",", 1529, "src\CompilerPasses\Parser.gbas");
			
		};
		DIMPUSH(param6_Params, func10_Expression(0));
		local4_Find_2198 = 1;
		
	};
	local12_CloseBracket_2199 = func7_IsToken(")");
	if (local12_CloseBracket_2199) {
		func5_Match(")", 1535, "src\CompilerPasses\Parser.gbas");
		
	};
	if ((((local12_CloseBracket_2199) !== (local9_OpBracket_2197)) ? 1 : 0)) {
		func5_Error("Brackets are not closed.", 1538, "src\CompilerPasses\Parser.gbas");
		
	};
	return 0;
	
};
func13_ParseFuncCall = window['func13_ParseFuncCall'];
window['func7_Keyword'] = function() {
	{
		var local17___SelectHelper18__2200 = 0;
		local17___SelectHelper18__2200 = 1;
		if ((((local17___SelectHelper18__2200) === (func7_IsToken("CALLBACK"))) ? 1 : 0)) {
			func5_Match("CALLBACK", 1547, "src\CompilerPasses\Parser.gbas");
			func7_Keyword();
			
		} else if ((((local17___SelectHelper18__2200) === (func7_IsToken("NATIVE"))) ? 1 : 0)) {
			func5_Match("NATIVE", 1550, "src\CompilerPasses\Parser.gbas");
			func10_SkipTokens("NATIVE", "\n", "");
			
		} else if ((((local17___SelectHelper18__2200) === (func7_IsToken("ABSTRACT"))) ? 1 : 0)) {
			func5_Match("ABSTRACT", 1553, "src\CompilerPasses\Parser.gbas");
			func10_SkipTokens("ABSTRACT", "\n", "");
			
		} else if ((((local17___SelectHelper18__2200) === (func7_IsToken("FUNCTION"))) ? 1 : 0)) {
			func10_SkipTokens("FUNCTION", "ENDFUNCTION", "");
			
		} else if ((((local17___SelectHelper18__2200) === (func7_IsToken("SUB"))) ? 1 : 0)) {
			func10_SkipTokens("SUB", "ENDSUB", "");
			
		} else if ((((local17___SelectHelper18__2200) === (func7_IsToken("TYPE"))) ? 1 : 0)) {
			func10_SkipTokens("TYPE", "ENDTYPE", "");
			
		} else if ((((local17___SelectHelper18__2200) === (func7_IsToken("PROTOTYPE"))) ? 1 : 0)) {
			func10_SkipTokens("PROTOTYPE", "\n", "");
			
		} else if ((((local17___SelectHelper18__2200) === (func7_IsToken("CONSTANT"))) ? 1 : 0)) {
			func10_SkipTokens("CONSTANT", "\n", "");
			
		} else if ((((local17___SelectHelper18__2200) === (func7_IsToken("GLOBAL"))) ? 1 : 0)) {
			do {
				var local7_tmpVari_2201 = new type15_TIdentifierVari();
				if (func7_IsToken("GLOBAL")) {
					func5_Match("GLOBAL", 1568, "src\CompilerPasses\Parser.gbas");
					
				} else {
					func5_Match(",", 1570, "src\CompilerPasses\Parser.gbas");
					
				};
				local7_tmpVari_2201 = func7_VariDef(0).clone();
				var forEachSaver14830 = global8_Compiler.attr7_Globals;
				for(var forEachCounter14830 = 0 ; forEachCounter14830 < forEachSaver14830.values.length ; forEachCounter14830++) {
					var local1_V_2202 = forEachSaver14830.values[forEachCounter14830];
				{
						var alias4_Vari_ref_2203 = [new type15_TIdentifierVari()];
						alias4_Vari_ref_2203 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_V_2202).values[tmpPositionCache] /* ALIAS */;
						if (((((((alias4_Vari_ref_2203[0].attr8_Name_Str) === (local7_tmpVari_2201.attr8_Name_Str)) ? 1 : 0)) && ((((alias4_Vari_ref_2203[0].attr6_PreDef) !== (-(1))) ? 1 : 0))) ? 1 : 0)) {
							var local7_tmpExpr_2204 = 0;
							if ((((global8_Compiler.attr12_CurrentScope) === (-(1))) ? 1 : 0)) {
								func5_Error("Internal error (GLOBAL in -1 scope)", 1577, "src\CompilerPasses\Parser.gbas");
								
							};
							local7_tmpExpr_2204 = func22_CreateAssignExpression(func24_CreateVariableExpression(alias4_Vari_ref_2203[0].attr2_ID), alias4_Vari_ref_2203[0].attr6_PreDef);
							DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local7_tmpExpr_2204);
							alias4_Vari_ref_2203[0].attr6_PreDef = -(1);
							
						};
						
					}
					forEachSaver14830.values[forEachCounter14830] = local1_V_2202;
				
				};
				
			} while (!((((func7_IsToken(",")) === (0)) ? 1 : 0)));
			
		} else if ((((local17___SelectHelper18__2200) === (func7_IsToken("LOCAL"))) ? 1 : 0)) {
			do {
				var local10_DontCreate_2205 = 0;
				if (func7_IsToken("LOCAL")) {
					func5_Match("LOCAL", 1587, "src\CompilerPasses\Parser.gbas");
					
				} else {
					func5_Match(",", 1589, "src\CompilerPasses\Parser.gbas");
					
				};
				local10_DontCreate_2205 = 0;
				if (func13_IsVarExisting(func17_CleanVariable_Str(func14_GetCurrent_Str()))) {
					var local5_Varis_2206 = new OTTArray();
					local10_DontCreate_2205 = 1;
					func8_GetVaris(unref(local5_Varis_2206), -(1), 0);
					var forEachSaver14909 = local5_Varis_2206;
					for(var forEachCounter14909 = 0 ; forEachCounter14909 < forEachSaver14909.values.length ; forEachCounter14909++) {
						var local1_V_2207 = forEachSaver14909.values[forEachCounter14909];
					{
							if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_V_2207).values[tmpPositionCache][0].attr8_Name_Str) === (func17_CleanVariable_Str(func14_GetCurrent_Str()))) ? 1 : 0)) {
								if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_V_2207).values[tmpPositionCache][0].attr3_Typ) === (2)) ? 1 : 0)) {
									local10_DontCreate_2205 = 0;
									break;
									
								};
								
							};
							
						}
						forEachSaver14909.values[forEachCounter14909] = local1_V_2207;
					
					};
					if (local10_DontCreate_2205) {
						var local4_Expr_2208 = 0;
						func7_Warning((((("Variable '") + (func14_GetCurrent_Str()))) + ("' already exists...")));
						local4_Expr_2208 = func10_Identifier(1);
						DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local4_Expr_2208);
						
					};
					
				};
				if (((local10_DontCreate_2205) ? 0 : 1)) {
					var local4_Vari_2209 = new type15_TIdentifierVari(), local4_PDef_2210 = 0;
					local4_Vari_2209 = func7_VariDef(0).clone();
					local4_Vari_2209.attr3_Typ = ~~(1);
					local4_PDef_2210 = -(1);
					if ((((local4_Vari_2209.attr6_PreDef) !== (-(1))) ? 1 : 0)) {
						local4_PDef_2210 = local4_Vari_2209.attr6_PreDef;
						local4_Vari_2209.attr6_PreDef = -(1);
						
					};
					func11_AddVariable(local4_Vari_2209, 1);
					DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
					if ((((local4_PDef_2210) !== (-(1))) ? 1 : 0)) {
						var local7_tmpExpr_2211 = 0;
						if ((((global8_Compiler.attr12_CurrentScope) === (-(1))) ? 1 : 0)) {
							func5_Error("Internal error (LOCAL in -1 scope)", 1628, "src\CompilerPasses\Parser.gbas");
							
						};
						local7_tmpExpr_2211 = func22_CreateAssignExpression(func24_CreateVariableExpression(((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1))), local4_PDef_2210);
						DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local7_tmpExpr_2211);
						
					};
					
				};
				
			} while (!((((func7_IsToken(",")) === (0)) ? 1 : 0)));
			
		} else if ((((local17___SelectHelper18__2200) === (func7_IsToken("ALIAS"))) ? 1 : 0)) {
			do {
				var local4_Vari_2212 = new type15_TIdentifierVari(), local4_PDef_2213 = 0, local7_tmpExpr_2214 = 0;
				if (func7_IsToken("ALIAS")) {
					func5_Match("ALIAS", 1639, "src\CompilerPasses\Parser.gbas");
					
				} else {
					func5_Match(",", 1641, "src\CompilerPasses\Parser.gbas");
					
				};
				func14_IsValidVarName();
				local4_Vari_2212.attr8_Name_Str = func14_GetCurrent_Str();
				local4_Vari_2212.attr3_Typ = ~~(7);
				local4_Vari_2212.attr3_ref = 1;
				func5_Match(local4_Vari_2212.attr8_Name_Str, 1649, "src\CompilerPasses\Parser.gbas");
				func5_Match("AS", 1650, "src\CompilerPasses\Parser.gbas");
				local4_PDef_2213 = func10_Identifier(0);
				global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(local4_PDef_2213, 1)).values[tmpPositionCache][0].attr3_ref = 1;
				local4_Vari_2212.attr8_datatype = global5_Exprs_ref[0].arrAccess(local4_PDef_2213).values[tmpPositionCache][0].attr8_datatype.clone();
				func11_AddVariable(local4_Vari_2212, 1);
				DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
				local7_tmpExpr_2214 = func21_CreateAliasExpression(((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)), local4_PDef_2213);
				if (func7_IsToken(",")) {
					DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local7_tmpExpr_2214);
					
				} else {
					return tryClone(local7_tmpExpr_2214);
					
				};
				
			} while (!((((func7_IsToken(",")) === (0)) ? 1 : 0)));
			
		} else if ((((local17___SelectHelper18__2200) === (func7_IsToken("STATIC"))) ? 1 : 0)) {
			if ((((global8_Compiler.attr11_currentFunc) === (-(1))) ? 1 : 0)) {
				func5_Error("Static has to be in a FUNCTION", 1669, "src\CompilerPasses\Parser.gbas");
				
			};
			do {
				var local4_Vari_2215 = new type15_TIdentifierVari();
				if (func7_IsToken("STATIC")) {
					func5_Match("STATIC", 1673, "src\CompilerPasses\Parser.gbas");
					
				} else {
					func5_Match(",", 1675, "src\CompilerPasses\Parser.gbas");
					
				};
				local4_Vari_2215 = func7_VariDef(0).clone();
				local4_Vari_2215.attr3_Typ = ~~(4);
				local4_Vari_2215.attr4_func = global8_Compiler.attr11_currentFunc;
				func11_AddVariable(local4_Vari_2215, 1);
				DIMPUSH(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr7_Statics, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
				DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
				
			} while (!((((func7_IsToken(",")) === (0)) ? 1 : 0)));
			
		} else if ((((local17___SelectHelper18__2200) === (func7_IsToken("DIMPUSH"))) ? 1 : 0)) {
			var local4_Vari_2216 = 0, local8_datatype_2217 = new type9_TDatatype(), local4_Expr_2218 = 0;
			func5_Match("DIMPUSH", 1687, "src\CompilerPasses\Parser.gbas");
			local4_Vari_2216 = func10_Identifier(0);
			if ((((global5_Exprs_ref[0].arrAccess(local4_Vari_2216).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0)) {
				func5_Error("DIMPUSH needs array", 1689, "src\CompilerPasses\Parser.gbas");
				
			};
			func5_Match(",", 1690, "src\CompilerPasses\Parser.gbas");
			local8_datatype_2217 = global5_Exprs_ref[0].arrAccess(local4_Vari_2216).values[tmpPositionCache][0].attr8_datatype.clone();
			local8_datatype_2217.attr7_IsArray = 0;
			local4_Expr_2218 = func14_EnsureDatatype(func10_Expression(0), local8_datatype_2217, 1695, 0);
			return tryClone(func23_CreateDimpushExpression(local4_Vari_2216, local4_Expr_2218));
			
		} else if ((((local17___SelectHelper18__2200) === (func7_IsToken("DIM"))) ? 1 : 0)) {
			var local3_Arr_2219 = 0;
			func5_Match("DIM", 1706, "src\CompilerPasses\Parser.gbas");
			local3_Arr_2219 = func14_ImplicitDefine();
			if ((((local3_Arr_2219) !== (-(1))) ? 1 : 0)) {
				global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Arr_2219).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray = 1;
				
			};
			if (func12_IsIdentifier(0, 0)) {
				var local4_expr_2220 = 0, local5_LExpr_2221 = 0, local4_Dims_2222 = new OTTArray();
				local4_expr_2220 = func10_Identifier(0);
				local5_LExpr_2221 = func12_GetRightExpr(local4_expr_2220);
				if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(local4_expr_2220, 1)).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0)) {
					func5_Error("Array expected.", 1715, "src\CompilerPasses\Parser.gbas");
					
				};
				{
					var local17___SelectHelper19__2223 = 0;
					local17___SelectHelper19__2223 = global5_Exprs_ref[0].arrAccess(local5_LExpr_2221).values[tmpPositionCache][0].attr3_Typ;
					if ((((local17___SelectHelper19__2223) === (~~(13))) ? 1 : 0)) {
						local4_Dims_2222 = global5_Exprs_ref[0].arrAccess(local5_LExpr_2221).values[tmpPositionCache][0].attr4_dims.clone();
						DIM(global5_Exprs_ref[0].arrAccess(local5_LExpr_2221).values[tmpPositionCache][0].attr4_dims, [0], 0);
						
					} else {
						func5_Error("Internal error (array not parsed)", 1722, "src\CompilerPasses\Parser.gbas");
						
					};
					
				};
				return tryClone(func19_CreateDimExpression(local4_expr_2220, unref(local4_Dims_2222)));
				
			} else {
				func5_Error("DIM needs identifier", 1727, "src\CompilerPasses\Parser.gbas");
				
			};
			
		} else if ((((local17___SelectHelper18__2200) === (func7_IsToken("REDIM"))) ? 1 : 0)) {
			var local3_Arr_2224 = 0;
			func5_Match("REDIM", 1730, "src\CompilerPasses\Parser.gbas");
			local3_Arr_2224 = func14_ImplicitDefine();
			if ((((local3_Arr_2224) !== (-(1))) ? 1 : 0)) {
				global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Arr_2224).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray = 1;
				
			};
			if (func12_IsIdentifier(0, 0)) {
				var local4_expr_2225 = 0, local5_LExpr_2226 = 0, local4_Dims_2227 = new OTTArray();
				local4_expr_2225 = func10_Identifier(0);
				local5_LExpr_2226 = func12_GetRightExpr(local4_expr_2225);
				if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(local4_expr_2225, 1)).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0)) {
					func5_Error("Array expected.", 1738, "src\CompilerPasses\Parser.gbas");
					
				};
				{
					var local17___SelectHelper20__2228 = 0;
					local17___SelectHelper20__2228 = global5_Exprs_ref[0].arrAccess(local5_LExpr_2226).values[tmpPositionCache][0].attr3_Typ;
					if ((((local17___SelectHelper20__2228) === (~~(13))) ? 1 : 0)) {
						local4_Dims_2227 = global5_Exprs_ref[0].arrAccess(local5_LExpr_2226).values[tmpPositionCache][0].attr4_dims.clone();
						DIM(global5_Exprs_ref[0].arrAccess(local5_LExpr_2226).values[tmpPositionCache][0].attr4_dims, [0], 0);
						
					} else {
						func5_Error("Internal error (array not parsed)", 1745, "src\CompilerPasses\Parser.gbas");
						
					};
					
				};
				return tryClone(func21_CreateReDimExpression(local4_expr_2225, unref(local4_Dims_2227)));
				
			} else {
				func5_Error("REDIM needs identifier", 1749, "src\CompilerPasses\Parser.gbas");
				
			};
			
		} else if ((((local17___SelectHelper18__2200) === (func7_IsToken("DIMDATA"))) ? 1 : 0)) {
			var local5_Array_2229 = 0, local2_Ex_2230 = new OTTArray();
			func5_Match("DIMDATA", 1752, "src\CompilerPasses\Parser.gbas");
			local5_Array_2229 = func14_ImplicitDefine();
			if ((((local5_Array_2229) !== (-(1))) ? 1 : 0)) {
				global8_Compiler.attr5_Varis_ref[0].arrAccess(local5_Array_2229).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray = 1;
				local5_Array_2229 = func10_Identifier(0);
				
			} else {
				local5_Array_2229 = func10_Expression(0);
				
			};
			if ((((global5_Exprs_ref[0].arrAccess(local5_Array_2229).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0)) {
				func5_Error("DIMDATA needs array, stupid...", 1762, "src\CompilerPasses\Parser.gbas");
				
			};
			while ((((func7_IsToken("\n")) === (0)) ? 1 : 0)) {
				func5_Match(",", 1765, "src\CompilerPasses\Parser.gbas");
				if ((((BOUNDS(local2_Ex_2230, 0)) === (0)) ? 1 : 0)) {
					DIMPUSH(local2_Ex_2230, func10_Expression(0));
					
				} else {
					var local7_datatyp_2231 = new type9_TDatatype(), local1_E_2232 = 0;
					local7_datatyp_2231 = global5_Exprs_ref[0].arrAccess(local2_Ex_2230.arrAccess(0).values[tmpPositionCache]).values[tmpPositionCache][0].attr8_datatype.clone();
					local1_E_2232 = func14_EnsureDatatype(func10_Expression(0), local7_datatyp_2231, 1771, 0);
					DIMPUSH(local2_Ex_2230, local1_E_2232);
					
				};
				
			};
			return tryClone(func23_CreateDimDataExpression(local5_Array_2229, unref(local2_Ex_2230)));
			
		} else if ((((local17___SelectHelper18__2200) === (func7_IsToken("DELETE"))) ? 1 : 0)) {
			var local11_VarName_Str_2233 = "";
			func5_Match("DELETE", 1778, "src\CompilerPasses\Parser.gbas");
			local11_VarName_Str_2233 = func14_GetCurrent_Str();
			if (((((((local11_VarName_Str_2233) !== (global8_Compiler.attr18_currentForEach_Str)) ? 1 : 0)) && ((((local11_VarName_Str_2233) !== ("\n")) ? 1 : 0))) ? 1 : 0)) {
				func5_Error((((((((("DELETE, invalid name '") + (local11_VarName_Str_2233))) + ("' expecting '"))) + (global8_Compiler.attr18_currentForEach_Str))) + ("'")), 1780, "src\CompilerPasses\Parser.gbas");
				
			};
			if ((((func7_IsToken("\n")) === (0)) ? 1 : 0)) {
				func7_GetNext();
				
			};
			return tryClone(func22_CreateDeleteExpression());
			
		} else if ((((local17___SelectHelper18__2200) === (func7_IsToken("DIMDEL"))) ? 1 : 0)) {
			var local5_Array_2234 = 0;
			func5_Match("DIMDEL", 1784, "src\CompilerPasses\Parser.gbas");
			local5_Array_2234 = func10_Identifier(0);
			func5_Match(",", 1786, "src\CompilerPasses\Parser.gbas");
			return tryClone(func22_CreateDimDelExpression(local5_Array_2234, func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 1787, 0)));
			
		} else if ((((local17___SelectHelper18__2200) === (func7_IsToken("RETURN"))) ? 1 : 0)) {
			if ((((global8_Compiler.attr11_currentFunc) !== (-(1))) ? 1 : 0)) {
				var local4_Expr_2235 = 0, local8_datatype_2236 = new type9_TDatatype();
				func5_Match("RETURN", 1790, "src\CompilerPasses\Parser.gbas");
				local8_datatype_2236 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr8_datatype.clone();
				if (func7_IsToken("\n")) {
					local4_Expr_2235 = func28_CreateDefaultValueExpression(local8_datatype_2236);
					
				} else if ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr3_Typ) === (2)) ? 1 : 0)) {
					func5_Error("Sub cannot return a value", 1797, "src\CompilerPasses\Parser.gbas");
					
				} else {
					local4_Expr_2235 = func14_EnsureDatatype(func10_Expression(0), local8_datatype_2236, 1799, 0);
					
				};
				return tryClone(func22_CreateReturnExpression(local4_Expr_2235));
				
			} else {
				func5_Error("RETURN have to be in a function or sub.", 1803, "src\CompilerPasses\Parser.gbas");
				
			};
			
		} else if ((((local17___SelectHelper18__2200) === (func7_IsToken("INLINE"))) ? 1 : 0)) {
			func5_Error("INLINE/ENDINLINE not supported", 1806, "src\CompilerPasses\Parser.gbas");
			
		} else if ((((local17___SelectHelper18__2200) === (func7_IsToken("REQUIRE"))) ? 1 : 0)) {
			var local8_Name_Str_2237 = "";
			func5_Match("REQUIRE", 1808, "src\CompilerPasses\Parser.gbas");
			local8_Name_Str_2237 = REPLACE_Str(func14_GetCurrent_Str(), "\"", "");
			func7_GetNext();
			return tryClone(~~(func23_CreateRequireExpression(local8_Name_Str_2237)));
			
		} else if ((((local17___SelectHelper18__2200) === (func7_IsToken("EXPORT"))) ? 1 : 0)) {
			var local3_Exp_2238 = new type7_TExport(), local5_Found_2239 = 0;
			func5_Match("EXPORT", 1813, "src\CompilerPasses\Parser.gbas");
			local3_Exp_2238.attr8_Name_Str = REPLACE_Str(func14_GetCurrent_Str(), "\"", "");
			local5_Found_2239 = 0;
			var forEachSaver15886 = global8_Compiler.attr5_Funcs_ref[0];
			for(var forEachCounter15886 = 0 ; forEachCounter15886 < forEachSaver15886.values.length ; forEachCounter15886++) {
				var local1_F_ref_2240 = forEachSaver15886.values[forEachCounter15886];
			{
					if (((((((local1_F_ref_2240[0].attr3_Typ) === (1)) ? 1 : 0)) && ((((local3_Exp_2238.attr8_Name_Str) === (local1_F_ref_2240[0].attr8_Name_Str)) ? 1 : 0))) ? 1 : 0)) {
						local1_F_ref_2240[0].attr10_PlzCompile = 1;
						local5_Found_2239 = 1;
						break;
						
					};
					
				}
				forEachSaver15886.values[forEachCounter15886] = local1_F_ref_2240;
			
			};
			if (((local5_Found_2239) ? 0 : 1)) {
				var forEachSaver15926 = global8_Compiler.attr7_Globals;
				for(var forEachCounter15926 = 0 ; forEachCounter15926 < forEachSaver15926.values.length ; forEachCounter15926++) {
					var local1_V_2241 = forEachSaver15926.values[forEachCounter15926];
				{
						if (((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_V_2241).values[tmpPositionCache][0].attr3_Typ) === (2)) ? 1 : 0)) && ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_V_2241).values[tmpPositionCache][0].attr8_Name_Str) === (local3_Exp_2238.attr8_Name_Str)) ? 1 : 0))) ? 1 : 0)) {
							local5_Found_2239 = 1;
							break;
							
						};
						
					}
					forEachSaver15926.values[forEachCounter15926] = local1_V_2241;
				
				};
				
			};
			if (((local5_Found_2239) ? 0 : 1)) {
				func5_Error((((("Cannot export undefined function/global '") + (local3_Exp_2238.attr8_Name_Str))) + ("'")), 1836, "src\CompilerPasses\Parser.gbas");
				
			};
			local3_Exp_2238.attr8_Name_Str = REPLACE_Str(local3_Exp_2238.attr8_Name_Str, "$", "_Str");
			func7_GetNext();
			if (func7_IsToken(",")) {
				func5_Match(",", 1840, "src\CompilerPasses\Parser.gbas");
				local3_Exp_2238.attr12_RealName_Str = REPLACE_Str(func14_GetCurrent_Str(), "\"", "");
				func7_GetNext();
				
			};
			DIMPUSH(global8_Compiler.attr7_Exports, local3_Exp_2238);
			return tryClone(func21_CreateEmptyExpression());
			
		} else if ((((local17___SelectHelper18__2200) === (func7_IsToken("IF"))) ? 1 : 0)) {
			var local4_Cnds_2242 = new OTTArray(), local4_Scps_2243 = new OTTArray(), local7_elseScp_2244 = 0;
			func5_Match("IF", 1849, "src\CompilerPasses\Parser.gbas");
			DIMPUSH(local4_Cnds_2242, func14_EnsureDatatype(func10_Expression(0), global13_floatDatatype, 1851, 0));
			if ((((func7_IsToken("THEN")) === (0)) ? 1 : 0)) {
				func5_Match("\n", 1853, "src\CompilerPasses\Parser.gbas");
				
			};
			DIMPUSH(local4_Scps_2243, func5_Scope("ENDIF", -(1)));
			while (func7_IsToken("ELSEIF")) {
				func5_Match("ELSEIF", 1860, "src\CompilerPasses\Parser.gbas");
				DIMPUSH(local4_Cnds_2242, func14_EnsureDatatype(func10_Expression(0), global13_floatDatatype, 1861, 0));
				func5_Match("\n", 1862, "src\CompilerPasses\Parser.gbas");
				DIMPUSH(local4_Scps_2243, func5_Scope("ENDIF", -(1)));
				
			};
			if (func7_IsToken("ELSE")) {
				func5_Match("ELSE", 1866, "src\CompilerPasses\Parser.gbas");
				func5_Match("\n", 1867, "src\CompilerPasses\Parser.gbas");
				local7_elseScp_2244 = func5_Scope("ENDIF", -(1));
				
			} else {
				local7_elseScp_2244 = -(1);
				
			};
			return tryClone(func18_CreateIfExpression(unref(local4_Cnds_2242), unref(local4_Scps_2243), local7_elseScp_2244));
			
		} else if ((((local17___SelectHelper18__2200) === (func7_IsToken("WHILE"))) ? 1 : 0)) {
			var local4_Expr_2245 = 0, local3_Scp_2246 = 0;
			func5_Match("WHILE", 1875, "src\CompilerPasses\Parser.gbas");
			local4_Expr_2245 = func14_EnsureDatatype(func10_Expression(0), global13_floatDatatype, 1876, 0);
			func5_Match("\n", 1877, "src\CompilerPasses\Parser.gbas");
			local3_Scp_2246 = func5_Scope("WEND", -(1));
			return tryClone(func21_CreateWhileExpression(local4_Expr_2245, local3_Scp_2246));
			
		} else if ((((local17___SelectHelper18__2200) === (func7_IsToken("REPEAT"))) ? 1 : 0)) {
			var local3_Scp_2247 = 0, local4_Expr_2248 = 0;
			func5_Match("REPEAT", 1881, "src\CompilerPasses\Parser.gbas");
			func5_Match("\n", 1882, "src\CompilerPasses\Parser.gbas");
			local3_Scp_2247 = func5_Scope("UNTIL", -(1));
			local4_Expr_2248 = func14_EnsureDatatype(func10_Expression(0), global13_floatDatatype, 1884, 0);
			return tryClone(func22_CreateRepeatExpression(local4_Expr_2248, local3_Scp_2247));
			
		} else if ((((local17___SelectHelper18__2200) === (func7_IsToken("FOR"))) ? 1 : 0)) {
			var local8_TmpScope_2249 = 0.0, local4_Expr_2250 = 0, local6_OScope_2260 = 0;
			local8_TmpScope_2249 = global8_Compiler.attr12_CurrentScope;
			global8_Compiler.attr12_CurrentScope = func21_CreateScopeExpression(~~(3));
			local4_Expr_2250 = -(1);
			{
				var Error_Str = "";
				try {
					var local10_IsImplicit_2251 = 0, local7_varExpr_2252 = 0, local3_Var_2255 = 0.0, local5_hasTo_2256 = 0, local6_toExpr_2257 = 0, local8_stepExpr_2258 = 0;
					func5_Match("FOR", 1891, "src\CompilerPasses\Parser.gbas");
					local10_IsImplicit_2251 = -(1);
					if (func12_IsIdentifier(0, 1)) {
						local7_varExpr_2252 = func10_Identifier(1);
						
					} else {
						var local4_Vari_2253 = new type15_TIdentifierVari(), local4_PDef_2254 = 0;
						local10_IsImplicit_2251 = 1;
						local4_Vari_2253 = func7_VariDef(0).clone();
						local4_Vari_2253.attr3_Typ = ~~(1);
						local4_PDef_2254 = -(1);
						if ((((local4_Vari_2253.attr6_PreDef) !== (-(1))) ? 1 : 0)) {
							local4_PDef_2254 = local4_Vari_2253.attr6_PreDef;
							local4_Vari_2253.attr6_PreDef = -(1);
							
						};
						func11_AddVariable(local4_Vari_2253, 1);
						local10_IsImplicit_2251 = ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1));
						DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
						if ((((local4_PDef_2254) !== (-(1))) ? 1 : 0)) {
							local7_varExpr_2252 = func22_CreateAssignExpression(func24_CreateVariableExpression(((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1))), local4_PDef_2254);
							
						};
						
					};
					if ((((global5_Exprs_ref[0].arrAccess(local7_varExpr_2252).values[tmpPositionCache][0].attr3_Typ) !== (10)) ? 1 : 0)) {
						func5_Error("FOR, variable needs assignment.", 1921, "src\CompilerPasses\Parser.gbas");
						
					};
					local3_Var_2255 = func11_GetVariable(global5_Exprs_ref[0].arrAccess(local7_varExpr_2252).values[tmpPositionCache][0].attr4_vari, 1);
					if (func7_IsToken("TO")) {
						local5_hasTo_2256 = 1;
						func5_Match("TO", 1926, "src\CompilerPasses\Parser.gbas");
						
					} else if (func7_IsToken("UNTIL")) {
						local5_hasTo_2256 = 0;
						func5_Match("UNTIL", 1929, "src\CompilerPasses\Parser.gbas");
						
					} else {
						func5_Error("FOR needs TO or UNTIL!", 1931, "src\CompilerPasses\Parser.gbas");
						
					};
					local6_toExpr_2257 = func14_EnsureDatatype(func10_Expression(0), global8_Compiler.attr5_Varis_ref[0].arrAccess(~~(local3_Var_2255)).values[tmpPositionCache][0].attr8_datatype, 1933, 0);
					local8_stepExpr_2258 = func14_EnsureDatatype(func19_CreateIntExpression(1), global8_Compiler.attr5_Varis_ref[0].arrAccess(~~(local3_Var_2255)).values[tmpPositionCache][0].attr8_datatype, 1934, 0);
					if (func7_IsToken("STEP")) {
						func5_Match("STEP", 1936, "src\CompilerPasses\Parser.gbas");
						local8_stepExpr_2258 = func14_EnsureDatatype(func10_Expression(0), global8_Compiler.attr5_Varis_ref[0].arrAccess(~~(local3_Var_2255)).values[tmpPositionCache][0].attr8_datatype, 1937, 0);
						
					};
					func5_Match("\n", 1939, "src\CompilerPasses\Parser.gbas");
					local4_Expr_2250 = func19_CreateForExpression(local7_varExpr_2252, local6_toExpr_2257, local8_stepExpr_2258, local5_hasTo_2256, func5_Scope("NEXT", -(1)));
					DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local4_Expr_2250);
					
				} catch (Error_Str) {
					if (Error_Str instanceof OTTException) Error_Str = Error_Str.getText(); else throwError(Error_Str);{
						func8_FixError();
						
					}
				};
				
			};
			local6_OScope_2260 = global8_Compiler.attr12_CurrentScope;
			global8_Compiler.attr12_CurrentScope = ~~(local8_TmpScope_2249);
			return tryClone(local6_OScope_2260);
			
		} else if ((((local17___SelectHelper18__2200) === (func7_IsToken("FOREACH"))) ? 1 : 0)) {
			var local8_TmpScope_2261 = 0.0, local14_TmpForEach_Str_2262 = "", local4_Expr_2263 = 0;
			local8_TmpScope_2261 = global8_Compiler.attr12_CurrentScope;
			local14_TmpForEach_Str_2262 = global8_Compiler.attr18_currentForEach_Str;
			global8_Compiler.attr12_CurrentScope = func21_CreateScopeExpression(~~(3));
			local4_Expr_2263 = -(1);
			{
				var Error_Str = "";
				try {
					var local7_varExpr_2264 = 0, local4_Vari_2265 = new type15_TIdentifierVari(), local6_InExpr_2266 = 0, local3_var_2267 = 0;
					func5_Match("FOREACH", 1957, "src\CompilerPasses\Parser.gbas");
					local4_Vari_2265 = func7_VariDef(0).clone();
					local4_Vari_2265.attr3_Typ = ~~(1);
					if ((((local4_Vari_2265.attr6_PreDef) !== (-(1))) ? 1 : 0)) {
						func5_Error("No default value, in FOREACH", 1972, "src\CompilerPasses\Parser.gbas");
						
					};
					func11_AddVariable(local4_Vari_2265, 1);
					DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
					local7_varExpr_2264 = func24_CreateVariableExpression(((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
					global8_Compiler.attr18_currentForEach_Str = global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(local7_varExpr_2264, 1)).values[tmpPositionCache][0].attr8_Name_Str;
					func5_Match("IN", 1979, "src\CompilerPasses\Parser.gbas");
					local6_InExpr_2266 = func10_Identifier(0);
					if ((((global5_Exprs_ref[0].arrAccess(local6_InExpr_2266).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0)) {
						func5_Error("Expecting Array", 1982, "src\CompilerPasses\Parser.gbas");
						
					};
					global5_Exprs_ref[0].arrAccess(local7_varExpr_2264).values[tmpPositionCache][0].attr8_datatype = global5_Exprs_ref[0].arrAccess(local6_InExpr_2266).values[tmpPositionCache][0].attr8_datatype.clone();
					global5_Exprs_ref[0].arrAccess(local7_varExpr_2264).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray = 0;
					local3_var_2267 = func11_GetVariable(local7_varExpr_2264, 1);
					global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_var_2267).values[tmpPositionCache][0].attr8_datatype = global5_Exprs_ref[0].arrAccess(local6_InExpr_2266).values[tmpPositionCache][0].attr8_datatype.clone();
					global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_var_2267).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray = 0;
					global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_var_2267).values[tmpPositionCache][0].attr3_ref = global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(local6_InExpr_2266, 1)).values[tmpPositionCache][0].attr3_ref;
					func5_Match("\n", 1992, "src\CompilerPasses\Parser.gbas");
					local4_Expr_2263 = func23_CreateForEachExpression(local7_varExpr_2264, local6_InExpr_2266, func5_Scope("NEXT", -(1)));
					
				} catch (Error_Str) {
					if (Error_Str instanceof OTTException) Error_Str = Error_Str.getText(); else throwError(Error_Str);{
						func8_FixError();
						
					}
				};
				
			};
			global8_Compiler.attr12_CurrentScope = ~~(local8_TmpScope_2261);
			global8_Compiler.attr18_currentForEach_Str = local14_TmpForEach_Str_2262;
			return tryClone(local4_Expr_2263);
			
		} else if ((((local17___SelectHelper18__2200) === (func7_IsToken("BREAK"))) ? 1 : 0)) {
			func5_Match("BREAK", 2001, "src\CompilerPasses\Parser.gbas");
			if ((((global8_Compiler.attr6_inLoop) === (0)) ? 1 : 0)) {
				func5_Error("BREAK not inside loop", 2002, "src\CompilerPasses\Parser.gbas");
				
			};
			return tryClone(func21_CreateBreakExpression());
			
		} else if ((((local17___SelectHelper18__2200) === (func7_IsToken("CONTINUE"))) ? 1 : 0)) {
			func5_Match("CONTINUE", 2005, "src\CompilerPasses\Parser.gbas");
			if ((((global8_Compiler.attr6_inLoop) === (0)) ? 1 : 0)) {
				func5_Error("CONTINUE not inside loop", 2006, "src\CompilerPasses\Parser.gbas");
				
			};
			return tryClone(func24_CreateContinueExpression());
			
		} else if ((((local17___SelectHelper18__2200) === (func7_IsToken("TRY"))) ? 1 : 0)) {
			var local6_tryScp_2269 = 0, local4_Vari_2270 = new type15_TIdentifierVari(), local2_id_2271 = 0.0, local7_myScope_2272 = 0, local8_TmpScope_2273 = 0.0;
			func5_Match("TRY", 2009, "src\CompilerPasses\Parser.gbas");
			func5_Match("\n", 2010, "src\CompilerPasses\Parser.gbas");
			local6_tryScp_2269 = func5_Scope("CATCH", -(1));
			local4_Vari_2270 = func7_VariDef(0).clone();
			if ((((local4_Vari_2270.attr8_datatype.attr8_Name_Str) !== ("string")) ? 1 : 0)) {
				func5_Error("Catch variable must be string", 2014, "src\CompilerPasses\Parser.gbas");
				
			};
			if (local4_Vari_2270.attr8_datatype.attr7_IsArray) {
				func5_Error("Catch variable must be non array", 2015, "src\CompilerPasses\Parser.gbas");
				
			};
			local2_id_2271 = BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0);
			func11_AddVariable(local4_Vari_2270, 0);
			local7_myScope_2272 = -(1);
			local8_TmpScope_2273 = global8_Compiler.attr12_CurrentScope;
			global8_Compiler.attr12_CurrentScope = func21_CreateScopeExpression(~~(1));
			{
				var Error_Str = "";
				try {
					var local7_ctchScp_2274 = 0, local1_e_2275 = 0;
					DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ~~(local2_id_2271));
					func5_Match("\n", 2025, "src\CompilerPasses\Parser.gbas");
					local7_ctchScp_2274 = func5_Scope("FINALLY", -(1));
					local1_e_2275 = func19_CreateTryExpression(local6_tryScp_2269, local7_ctchScp_2274, ~~(local2_id_2271));
					DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local1_e_2275);
					local7_myScope_2272 = global8_Compiler.attr12_CurrentScope;
					
				} catch (Error_Str) {
					if (Error_Str instanceof OTTException) Error_Str = Error_Str.getText(); else throwError(Error_Str);{
						func8_FixError();
						
					}
				};
				
			};
			global8_Compiler.attr12_CurrentScope = ~~(local8_TmpScope_2273);
			return tryClone(local7_myScope_2272);
			
		} else if ((((local17___SelectHelper18__2200) === (func7_IsToken("THROW"))) ? 1 : 0)) {
			func5_Match("THROW", 2039, "src\CompilerPasses\Parser.gbas");
			return tryClone(func21_CreateThrowExpression(func14_EnsureDatatype(func10_Expression(0), global11_strDatatype, 2040, 0)));
			
		} else if ((((local17___SelectHelper18__2200) === (func7_IsToken("SELECT"))) ? 1 : 0)) {
			var local4_Vari_2278 = new type15_TIdentifierVari(), local5_Cond1_2279 = 0, local8_datatype_2280 = new type9_TDatatype(), local5_Conds_2281 = new OTTArray(), local4_Scps_2282 = new OTTArray(), local7_elseScp_2283 = 0, local8_TmpScope_2284 = 0.0, local8_VariExpr_2285 = 0, local1_e_2286 = 0, local7_myScope_2292 = 0;
			static12_Keyword_SelectHelper+=1;
			local4_Vari_2278.attr8_Name_Str = (((("__SelectHelper") + (CAST2STRING(static12_Keyword_SelectHelper)))) + ("_"));
			local4_Vari_2278.attr3_Typ = ~~(1);
			func5_Match("SELECT", 2049, "src\CompilerPasses\Parser.gbas");
			local5_Cond1_2279 = func10_Expression(0);
			local8_datatype_2280 = global5_Exprs_ref[0].arrAccess(local5_Cond1_2279).values[tmpPositionCache][0].attr8_datatype.clone();
			local4_Vari_2278.attr8_datatype = local8_datatype_2280.clone();
			local7_elseScp_2283 = -(1);
			func11_AddVariable(local4_Vari_2278, 0);
			local8_TmpScope_2284 = global8_Compiler.attr12_CurrentScope;
			global8_Compiler.attr12_CurrentScope = func21_CreateScopeExpression(~~(1));
			DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
			local8_VariExpr_2285 = func24_CreateVariableExpression(((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
			local1_e_2286 = func22_CreateAssignExpression(local8_VariExpr_2285, local5_Cond1_2279);
			DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local1_e_2286);
			local5_Cond1_2279 = local8_VariExpr_2285;
			func5_Match("\n", 2073, "src\CompilerPasses\Parser.gbas");
			while (func7_IsToken("CASE")) {
				var local5_Cond2_2287 = 0;
				func5_Match("CASE", 2075, "src\CompilerPasses\Parser.gbas");
				local5_Cond2_2287 = -(1);
				do {
					var local2_Op_2288 = 0.0, local5_Expr1_2289 = 0, local5_Expr2_2290 = 0, local7_tmpCond_2291 = 0;
					if (func7_IsToken(",")) {
						func5_Match(",", 2078, "src\CompilerPasses\Parser.gbas");
						
					};
					local2_Op_2288 = func14_SearchOperator("=");
					if (func10_IsOperator()) {
						local2_Op_2288 = func14_SearchOperator(func14_GetCurrent_Str());
						func7_GetNext();
						
					};
					local5_Expr1_2289 = -(1);
					local5_Expr2_2290 = -(1);
					local5_Expr1_2289 = func14_EnsureDatatype(func10_Expression(0), local8_datatype_2280, 2088, 0);
					if (func7_IsToken("TO")) {
						func5_Match("TO", 2090, "src\CompilerPasses\Parser.gbas");
						local5_Expr2_2290 = func14_EnsureDatatype(func10_Expression(0), local8_datatype_2280, 2091, 0);
						local5_Expr1_2289 = func24_CreateOperatorExpression(unref(global9_Operators_ref[0].arrAccess(func14_SearchOperator(">=")).values[tmpPositionCache][0]), local5_Cond1_2279, local5_Expr1_2289);
						local5_Expr2_2290 = func24_CreateOperatorExpression(unref(global9_Operators_ref[0].arrAccess(func14_SearchOperator("<=")).values[tmpPositionCache][0]), local5_Cond1_2279, local5_Expr2_2290);
						local7_tmpCond_2291 = func24_CreateOperatorExpression(unref(global9_Operators_ref[0].arrAccess(func14_SearchOperator("AND")).values[tmpPositionCache][0]), local5_Expr1_2289, local5_Expr2_2290);
						
					} else {
						local7_tmpCond_2291 = func24_CreateOperatorExpression(unref(global9_Operators_ref[0].arrAccess(~~(local2_Op_2288)).values[tmpPositionCache][0]), local5_Cond1_2279, local5_Expr1_2289);
						
					};
					if ((((local5_Cond2_2287) === (-(1))) ? 1 : 0)) {
						local5_Cond2_2287 = local7_tmpCond_2291;
						
					} else {
						local5_Cond2_2287 = func24_CreateOperatorExpression(unref(global9_Operators_ref[0].arrAccess(func14_SearchOperator("OR")).values[tmpPositionCache][0]), local5_Cond2_2287, local7_tmpCond_2291);
						
					};
					
				} while (!((((func7_IsToken(",")) === (0)) ? 1 : 0)));
				func5_Match("\n", 2107, "src\CompilerPasses\Parser.gbas");
				DIMPUSH(local5_Conds_2281, local5_Cond2_2287);
				DIMPUSH(local4_Scps_2282, func5_Scope("ENDSELECT", -(1)));
				
			};
			if (func7_IsToken("DEFAULT")) {
				func5_Match("DEFAULT", 2112, "src\CompilerPasses\Parser.gbas");
				func5_Match("\n", 2113, "src\CompilerPasses\Parser.gbas");
				local7_elseScp_2283 = func5_Scope("ENDSELECT", -(1));
				
			};
			if (((((((local7_elseScp_2283) === (-(1))) ? 1 : 0)) && ((((BOUNDS(local5_Conds_2281, 0)) === (0)) ? 1 : 0))) ? 1 : 0)) {
				func5_Match("ENDSELECT", 2117, "src\CompilerPasses\Parser.gbas");
				
			};
			local1_e_2286 = func18_CreateIfExpression(unref(local5_Conds_2281), unref(local4_Scps_2282), local7_elseScp_2283);
			DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local1_e_2286);
			local7_myScope_2292 = global8_Compiler.attr12_CurrentScope;
			global8_Compiler.attr12_CurrentScope = ~~(local8_TmpScope_2284);
			return tryClone(local7_myScope_2292);
			
		} else if ((((local17___SelectHelper18__2200) === (func7_IsToken("STARTDATA"))) ? 1 : 0)) {
			func5_Match("STARTDATA", 2126, "src\CompilerPasses\Parser.gbas");
			func10_SkipTokens("STARTDATA", "ENDDATA", func14_GetCurrent_Str());
			
		} else if ((((local17___SelectHelper18__2200) === (func7_IsToken("RESTORE"))) ? 1 : 0)) {
			var local8_Name_Str_2293 = "";
			func5_Match("RESTORE", 2129, "src\CompilerPasses\Parser.gbas");
			local8_Name_Str_2293 = func14_GetCurrent_Str();
			func5_Match(local8_Name_Str_2293, 2131, "src\CompilerPasses\Parser.gbas");
			var forEachSaver17203 = global8_Compiler.attr10_DataBlocks;
			for(var forEachCounter17203 = 0 ; forEachCounter17203 < forEachSaver17203.values.length ; forEachCounter17203++) {
				var local5_block_2294 = forEachSaver17203.values[forEachCounter17203];
			{
					if ((((local5_block_2294.attr8_Name_Str) === (local8_Name_Str_2293)) ? 1 : 0)) {
						return tryClone(func23_CreateRestoreExpression(local8_Name_Str_2293));
						
					};
					
				}
				forEachSaver17203.values[forEachCounter17203] = local5_block_2294;
			
			};
			func5_Error((((("RESTORE label '") + (local8_Name_Str_2293))) + ("' unknown.")), 2137, "src\CompilerPasses\Parser.gbas");
			
		} else if ((((local17___SelectHelper18__2200) === (func7_IsToken("READ"))) ? 1 : 0)) {
			var local5_Reads_2295 = new OTTArray();
			func5_Match("READ", 2139, "src\CompilerPasses\Parser.gbas");
			do {
				var local1_e_2296 = 0;
				if (func7_IsToken(",")) {
					func5_Match(",", 2142, "src\CompilerPasses\Parser.gbas");
					
				};
				local1_e_2296 = func10_Identifier(0);
				DIMPUSH(local5_Reads_2295, local1_e_2296);
				
			} while (!((((func7_IsToken(",")) === (0)) ? 1 : 0)));
			return tryClone(func20_CreateReadExpression(unref(local5_Reads_2295)));
			
		} else if ((((local17___SelectHelper18__2200) === (func7_IsToken("GOTO"))) ? 1 : 0)) {
			var local8_Name_Str_2297 = "", local4_Expr_2298 = 0, local3_Scp_2299 = 0;
			func5_Match("GOTO", 2149, "src\CompilerPasses\Parser.gbas");
			local8_Name_Str_2297 = func14_GetCurrent_Str();
			func7_GetNext();
			global8_Compiler.attr7_HasGoto = 1;
			if (((global8_Compiler.attr7_GOTOErr) ? 0 : 1)) {
				global8_Compiler.attr7_GOTOErr = 1;
				func7_Warning("GOTO may cause problems!");
				
			};
			local4_Expr_2298 = func20_CreateGotoExpression(local8_Name_Str_2297);
			local3_Scp_2299 = global8_Compiler.attr14_ImportantScope;
			if ((((local3_Scp_2299) === (-(1))) ? 1 : 0)) {
				func5_Error("Internal error (GOTO Scp is -1", 2162, "src\CompilerPasses\Parser.gbas");
				
			};
			DIMPUSH(global5_Exprs_ref[0].arrAccess(local3_Scp_2299).values[tmpPositionCache][0].attr5_Gotos, local4_Expr_2298);
			return tryClone(local4_Expr_2298);
			
		} else if ((((local17___SelectHelper18__2200) === (func7_IsToken("INC"))) ? 1 : 0)) {
			var local4_Vari_2300 = 0, local7_AddExpr_2301 = 0;
			func5_Match("INC", 2168, "src\CompilerPasses\Parser.gbas");
			local4_Vari_2300 = func10_Identifier(0);
			if (global5_Exprs_ref[0].arrAccess(local4_Vari_2300).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) {
				func5_Error("Cannot increment array...", 2170, "src\CompilerPasses\Parser.gbas");
				
			};
			{
				var local17___SelectHelper21__2302 = "";
				local17___SelectHelper21__2302 = global5_Exprs_ref[0].arrAccess(local4_Vari_2300).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str;
				if ((((local17___SelectHelper21__2302) === ("int")) ? 1 : 0)) {
					if (func7_IsToken(",")) {
						func5_Match(",", 2175, "src\CompilerPasses\Parser.gbas");
						local7_AddExpr_2301 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 2176, 0);
						
					} else {
						local7_AddExpr_2301 = func19_CreateIntExpression(1);
						
					};
					
				} else if ((((local17___SelectHelper21__2302) === ("float")) ? 1 : 0)) {
					if (func7_IsToken(",")) {
						func5_Match(",", 2182, "src\CompilerPasses\Parser.gbas");
						local7_AddExpr_2301 = func14_EnsureDatatype(func10_Expression(0), global13_floatDatatype, 2183, 0);
						
					} else {
						local7_AddExpr_2301 = func21_CreateFloatExpression(1);
						
					};
					
				} else if ((((local17___SelectHelper21__2302) === ("string")) ? 1 : 0)) {
					if (func7_IsToken(",")) {
						func5_Match(",", 2189, "src\CompilerPasses\Parser.gbas");
						local7_AddExpr_2301 = func14_EnsureDatatype(func10_Expression(0), global11_strDatatype, 2190, 0);
						
					} else {
						local7_AddExpr_2301 = func19_CreateStrExpression(" ");
						
					};
					
				} else {
					func5_Error("Cannot increment type or prototype", 2195, "src\CompilerPasses\Parser.gbas");
					
				};
				
			};
			return tryClone(func19_CreateIncExpression(local4_Vari_2300, local7_AddExpr_2301));
			
		} else if ((((local17___SelectHelper18__2200) === (func7_IsToken("DEC"))) ? 1 : 0)) {
			var local4_Vari_2303 = 0, local7_AddExpr_2304 = 0;
			func5_Match("DEC", 2199, "src\CompilerPasses\Parser.gbas");
			local4_Vari_2303 = func10_Identifier(0);
			if (global5_Exprs_ref[0].arrAccess(local4_Vari_2303).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) {
				func5_Error("Cannot decrement array...", 2202, "src\CompilerPasses\Parser.gbas");
				
			};
			{
				var local17___SelectHelper22__2305 = "";
				local17___SelectHelper22__2305 = global5_Exprs_ref[0].arrAccess(local4_Vari_2303).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str;
				if ((((local17___SelectHelper22__2305) === ("int")) ? 1 : 0)) {
					if (func7_IsToken(",")) {
						var alias2_Op_ref_2306 = [new type9_TOperator()];
						func5_Match(",", 2206, "src\CompilerPasses\Parser.gbas");
						alias2_Op_ref_2306 = global9_Operators_ref[0].arrAccess(func14_SearchOperator("sub")).values[tmpPositionCache] /* ALIAS */;
						local7_AddExpr_2304 = func24_CreateOperatorExpression(unref(alias2_Op_ref_2306[0]), func19_CreateIntExpression(0), func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 2208, 0));
						
					} else {
						local7_AddExpr_2304 = func19_CreateIntExpression(-(1));
						
					};
					
				} else if ((((local17___SelectHelper22__2305) === ("float")) ? 1 : 0)) {
					if (func7_IsToken(",")) {
						var alias2_Op_ref_2307 = [new type9_TOperator()];
						func5_Match(",", 2214, "src\CompilerPasses\Parser.gbas");
						alias2_Op_ref_2307 = global9_Operators_ref[0].arrAccess(func14_SearchOperator("sub")).values[tmpPositionCache] /* ALIAS */;
						local7_AddExpr_2304 = func24_CreateOperatorExpression(unref(alias2_Op_ref_2307[0]), func21_CreateFloatExpression(0), func14_EnsureDatatype(func10_Expression(0), global13_floatDatatype, 2216, 0));
						
					} else {
						local7_AddExpr_2304 = func21_CreateFloatExpression(-(1));
						
					};
					
				} else if ((((local17___SelectHelper22__2305) === ("string")) ? 1 : 0)) {
					func5_Error("Cannot decrement string...", 2221, "src\CompilerPasses\Parser.gbas");
					
				} else {
					func5_Error("Cannot decrement type or prototype", 2223, "src\CompilerPasses\Parser.gbas");
					
				};
				
			};
			return tryClone(func19_CreateIncExpression(local4_Vari_2303, local7_AddExpr_2304));
			
		} else if ((((local17___SelectHelper18__2200) === (func7_IsToken("ASSERT"))) ? 1 : 0)) {
			var local4_Expr_2308 = 0;
			func5_Match("ASSERT", 2227, "src\CompilerPasses\Parser.gbas");
			local4_Expr_2308 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 2228, 0);
			if (global9_DEBUGMODE) {
				return tryClone(func22_CreateAssertExpression(local4_Expr_2308));
				
			};
			
		} else if ((((local17___SelectHelper18__2200) === (func7_IsToken("DEBUG"))) ? 1 : 0)) {
			var local4_Expr_2309 = 0;
			func5_Match("DEBUG", 2234, "src\CompilerPasses\Parser.gbas");
			local4_Expr_2309 = func14_EnsureDatatype(func10_Expression(0), global11_strDatatype, 2235, 0);
			if (global9_DEBUGMODE) {
				return tryClone(func27_CreateDebugOutputExpression(local4_Expr_2309));
				
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
			var local3_pos_2310 = 0, local4_Vari_2311 = new type15_TIdentifierVari();
			local3_pos_2310 = global8_Compiler.attr11_currentPosi;
			local4_Vari_2311 = func7_VariDef(1).clone();
			local4_Vari_2311.attr3_Typ = ~~(2);
			func11_AddVariable(local4_Vari_2311, 0);
			DIMPUSH(global8_Compiler.attr7_Globals, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
			func7_Warning((((("Implicit variable declaration '") + (local4_Vari_2311.attr8_Name_Str))) + ("'")));
			global8_Compiler.attr11_currentPosi = ((local3_pos_2310) - (1));
			func7_GetNext();
			return tryClone(((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
			
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
	var local11_Current_Str_2316 = "", local5_dummy_ref_2317 = [0], local5_Varis_2318 = new OTTArray();
	if ((((func7_IsToken("GLOBAL")) || (func7_IsToken("LOCAL"))) ? 1 : 0)) {
		return 1;
		
	};
	if ((((func6_IsType("")) && (param9_CheckType)) ? 1 : 0)) {
		var local3_pos_2314 = 0, local3_ret_2315 = 0;
		local3_pos_2314 = global8_Compiler.attr11_currentPosi;
		func7_GetNext();
		if (func7_IsToken("(")) {
			local3_ret_2315 = 1;
			
		} else {
			local3_ret_2315 = 0;
			
		};
		global8_Compiler.attr11_currentPosi = local3_pos_2314;
		
	};
	local11_Current_Str_2316 = func14_GetCurrent_Str();
	if ((global8_Compiler.attr11_GlobalFuncs).GetValue(local11_Current_Str_2316, local5_dummy_ref_2317)) {
		return 1;
		
	};
	func8_GetVaris(unref(local5_Varis_2318), -(1), 0);
	{
		var local1_i_2319 = 0.0;
		for (local1_i_2319 = ((BOUNDS(local5_Varis_2318, 0)) - (1));toCheck(local1_i_2319, 0, -(1));local1_i_2319 += -(1)) {
			if ((((func17_CleanVariable_Str(local11_Current_Str_2316)) === (global8_Compiler.attr5_Varis_ref[0].arrAccess(local5_Varis_2318.arrAccess(~~(local1_i_2319)).values[tmpPositionCache]).values[tmpPositionCache][0].attr8_Name_Str)) ? 1 : 0)) {
				if ((((param18_IgnoreImplicitSelf) && ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local5_Varis_2318.arrAccess(~~(local1_i_2319)).values[tmpPositionCache]).values[tmpPositionCache][0].attr3_Typ) === (3)) ? 1 : 0))) ? 1 : 0)) {
					return tryClone(0);
					
				} else {
					return 1;
					
				};
				
			};
			
		};
		
	};
	if ((((((((((global8_Compiler.attr11_currentFunc) !== (-(1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType) !== (-(1))) ? 1 : 0))) ? 1 : 0)) && (((param18_IgnoreImplicitSelf) ? 0 : 1))) ? 1 : 0)) {
		var alias3_Typ_ref_2320 = [new type15_TIdentifierType()], local5_myTyp_2321 = 0;
		alias3_Typ_ref_2320 = global8_Compiler.attr5_Types_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType).values[tmpPositionCache] /* ALIAS */;
		local5_myTyp_2321 = alias3_Typ_ref_2320[0].attr2_ID;
		while ((((local5_myTyp_2321) !== (-(1))) ? 1 : 0)) {
			var forEachSaver17893 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_myTyp_2321).values[tmpPositionCache][0].attr7_Methods;
			for(var forEachCounter17893 = 0 ; forEachCounter17893 < forEachSaver17893.values.length ; forEachCounter17893++) {
				var local1_M_2322 = forEachSaver17893.values[forEachCounter17893];
			{
					if (func7_IsToken(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local1_M_2322).values[tmpPositionCache][0].attr8_Name_Str)) {
						return 1;
						
					};
					
				}
				forEachSaver17893.values[forEachCounter17893] = local1_M_2322;
			
			};
			local5_myTyp_2321 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_myTyp_2321).values[tmpPositionCache][0].attr9_Extending;
			
		};
		var forEachSaver17924 = alias3_Typ_ref_2320[0].attr10_Attributes;
		for(var forEachCounter17924 = 0 ; forEachCounter17924 < forEachSaver17924.values.length ; forEachCounter17924++) {
			var local1_A_2323 = forEachSaver17924.values[forEachCounter17924];
		{
				if (func7_IsToken(global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_A_2323).values[tmpPositionCache][0].attr8_Name_Str)) {
					return 1;
					
				};
				
			}
			forEachSaver17924.values[forEachCounter17924] = local1_A_2323;
		
		};
		
	};
	return tryClone(0);
	return 0;
	
};
func12_IsIdentifier = window['func12_IsIdentifier'];
window['func8_IsNumber'] = function() {
	{
		var local1_i_2755 = 0.0;
		for (local1_i_2755 = 0;toCheck(local1_i_2755, (((func14_GetCurrent_Str()).length) - (1)), 1);local1_i_2755 += 1) {
			if (((((((ASC(func14_GetCurrent_Str(), ~~(local1_i_2755))) < (48)) ? 1 : 0)) || ((((ASC(func14_GetCurrent_Str(), ~~(local1_i_2755))) > (57)) ? 1 : 0))) ? 1 : 0)) {
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
	var forEachSaver17961 = global8_Compiler.attr5_Types_ref[0];
	for(var forEachCounter17961 = 0 ; forEachCounter17961 < forEachSaver17961.values.length ; forEachCounter17961++) {
		var local3_typ_ref_2325 = forEachSaver17961.values[forEachCounter17961];
	{
			if ((((local3_typ_ref_2325[0].attr12_RealName_Str) === (param7_Str_Str)) ? 1 : 0)) {
				global8_LastType = local3_typ_ref_2325[0].clone();
				return 1;
				
			};
			
		}
		forEachSaver17961.values[forEachCounter17961] = local3_typ_ref_2325;
	
	};
	return tryClone(0);
	return 0;
	
};
func6_IsType = window['func6_IsType'];
window['func13_IsVarExisting'] = function(param7_Var_Str) {
	var local4_Vars_2327 = new OTTArray();
	func8_GetVaris(unref(local4_Vars_2327), -(1), 0);
	{
		var local1_i_2328 = 0.0;
		for (local1_i_2328 = ((BOUNDS(local4_Vars_2327, 0)) - (1));toCheck(local1_i_2328, 0, -(1));local1_i_2328 += -(1)) {
			if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Vars_2327.arrAccess(~~(local1_i_2328)).values[tmpPositionCache]).values[tmpPositionCache][0].attr8_Name_Str) === (param7_Var_Str)) ? 1 : 0)) {
				return 1;
				
			};
			
		};
		
	};
	return tryClone((global10_KeywordMap).DoesKeyExist(param7_Var_Str));
	return 0;
	
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
	var forEachSaver18086 = global8_Compiler.attr5_Types_ref[0];
	for(var forEachCounter18086 = 0 ; forEachCounter18086 < forEachSaver18086.values.length ; forEachCounter18086++) {
		var local1_T_ref_2331 = forEachSaver18086.values[forEachCounter18086];
	{
			if ((((local1_T_ref_2331[0].attr8_Name_Str) === (param8_func_Str)) ? 1 : 0)) {
				return 1;
				
			};
			
		}
		forEachSaver18086.values[forEachCounter18086] = local1_T_ref_2331;
	
	};
	if ((global10_KeywordMap).DoesKeyExist(param8_func_Str)) {
		return 1;
		
	};
	var forEachSaver18130 = global8_Compiler.attr5_Funcs_ref[0];
	for(var forEachCounter18130 = 0 ; forEachCounter18130 < forEachSaver18130.values.length ; forEachCounter18130++) {
		var local1_F_ref_2332 = forEachSaver18130.values[forEachCounter18130];
	{
			if ((((((((((param8_func_Str) === (local1_F_ref_2332[0].attr8_Name_Str)) ? 1 : 0)) && (((((((local1_F_ref_2332[0].attr3_Typ) === (2)) ? 1 : 0)) || ((((local1_F_ref_2332[0].attr3_Typ) === (1)) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) && ((((local1_F_ref_2332[0].attr10_IsCallback) === (param10_IsCallback)) ? 1 : 0))) ? 1 : 0)) {
				return 1;
				
			};
			
		}
		forEachSaver18130.values[forEachCounter18130] = local1_F_ref_2332;
	
	};
	return tryClone(0);
	return 0;
	
};
func14_IsFuncExisting = window['func14_IsFuncExisting'];
window['func10_IsOperator'] = function() {
	var forEachSaver18151 = global9_Operators_ref[0];
	for(var forEachCounter18151 = 0 ; forEachCounter18151 < forEachSaver18151.values.length ; forEachCounter18151++) {
		var local2_Op_ref_2333 = forEachSaver18151.values[forEachCounter18151];
	{
			if (func7_IsToken(local2_Op_ref_2333[0].attr7_Sym_Str)) {
				return 1;
				
			};
			
		}
		forEachSaver18151.values[forEachCounter18151] = local2_Op_ref_2333;
	
	};
	return tryClone(0);
	return 0;
	
};
func10_IsOperator = window['func10_IsOperator'];
window['func15_IsValidDatatype'] = function() {
	if (func6_IsType("")) {
		return 1;
		
	};
	var forEachSaver27644 = global8_Compiler.attr5_Funcs_ref[0];
	for(var forEachCounter27644 = 0 ; forEachCounter27644 < forEachSaver27644.values.length ; forEachCounter27644++) {
		var local4_func_ref_2756 = forEachSaver27644.values[forEachCounter27644];
	{
			if (((((((local4_func_ref_2756[0].attr3_Typ) === (4)) ? 1 : 0)) && (func7_IsToken(local4_func_ref_2756[0].attr8_Name_Str))) ? 1 : 0)) {
				return 1;
				
			};
			
		}
		forEachSaver27644.values[forEachCounter27644] = local4_func_ref_2756;
	
	};
	var forEachSaver27658 = global8_Compiler.attr5_Types_ref[0];
	for(var forEachCounter27658 = 0 ; forEachCounter27658 < forEachSaver27658.values.length ; forEachCounter27658++) {
		var local3_typ_ref_2757 = forEachSaver27658.values[forEachCounter27658];
	{
			STDOUT(((local3_typ_ref_2757[0].attr12_RealName_Str) + ("\n")));
			
		}
		forEachSaver27658.values[forEachCounter27658] = local3_typ_ref_2757;
	
	};
	func5_Error((("Unknown datatype: ") + (func14_GetCurrent_Str())), 2433, "src\CompilerPasses\Parser.gbas");
	return 0;
	
};
func15_IsValidDatatype = window['func15_IsValidDatatype'];
window['func8_IsDefine'] = function(param7_Def_Str) {
	if ((((param7_Def_Str) === ("")) ? 1 : 0)) {
		param7_Def_Str = func14_GetCurrent_Str();
		
	};
	var forEachSaver18185 = global7_Defines;
	for(var forEachCounter18185 = 0 ; forEachCounter18185 < forEachSaver18185.values.length ; forEachCounter18185++) {
		var local3_Def_2335 = forEachSaver18185.values[forEachCounter18185];
	{
			if ((((local3_Def_2335.attr7_Key_Str) === (param7_Def_Str)) ? 1 : 0)) {
				global10_LastDefine = local3_Def_2335.clone();
				return 1;
				
			};
			
		}
		forEachSaver18185.values[forEachCounter18185] = local3_Def_2335;
	
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
		var forEachSaver18232 = global8_Compiler.attr7_Globals;
		for(var forEachCounter18232 = 0 ; forEachCounter18232 < forEachSaver18232.values.length ; forEachCounter18232++) {
			var local4_Vari_2339 = forEachSaver18232.values[forEachCounter18232];
		{
				DIMPUSH(param5_Varis, local4_Vari_2339);
				
			}
			forEachSaver18232.values[forEachCounter18232] = local4_Vari_2339;
		
		};
		
	};
	if ((((param3_Scp) !== (-(1))) ? 1 : 0)) {
		var forEachSaver18256 = global5_Exprs_ref[0].arrAccess(~~(param3_Scp)).values[tmpPositionCache][0].attr5_Varis;
		for(var forEachCounter18256 = 0 ; forEachCounter18256 < forEachSaver18256.values.length ; forEachCounter18256++) {
			var local4_Vari_2340 = forEachSaver18256.values[forEachCounter18256];
		{
				DIMPUSH(param5_Varis, local4_Vari_2340);
				
			}
			forEachSaver18256.values[forEachCounter18256] = local4_Vari_2340;
		
		};
		if (((((((global8_Compiler.attr11_currentFunc) !== (-(1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType) !== (-(1))) ? 1 : 0))) ? 1 : 0)) {
			var alias3_Typ_ref_2341 = [new type15_TIdentifierType()];
			alias3_Typ_ref_2341 = global8_Compiler.attr5_Types_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType).values[tmpPositionCache] /* ALIAS */;
			var forEachSaver18305 = alias3_Typ_ref_2341[0].attr10_Attributes;
			for(var forEachCounter18305 = 0 ; forEachCounter18305 < forEachSaver18305.values.length ; forEachCounter18305++) {
				var local1_A_2342 = forEachSaver18305.values[forEachCounter18305];
			{
					DIMPUSH(param5_Varis, local1_A_2342);
					
				}
				forEachSaver18305.values[forEachCounter18305] = local1_A_2342;
			
			};
			
		};
		
	};
	if (((((((global5_Exprs_ref[0].arrAccess(~~(param3_Scp)).values[tmpPositionCache][0].attr10_SuperScope) !== (-(1))) ? 1 : 0)) && ((((global5_Exprs_ref[0].arrAccess(~~(param3_Scp)).values[tmpPositionCache][0].attr6_ScpTyp) !== (2)) ? 1 : 0))) ? 1 : 0)) {
		func8_GetVaris(unref(param5_Varis), global5_Exprs_ref[0].arrAccess(~~(param3_Scp)).values[tmpPositionCache][0].attr10_SuperScope, 0);
		
	} else if ((((param9_PreferVar) >= (0)) ? 1 : 0)) {
		var forEachSaver18354 = global8_Compiler.attr7_Globals;
		for(var forEachCounter18354 = 0 ; forEachCounter18354 < forEachSaver18354.values.length ; forEachCounter18354++) {
			var local4_Vari_2343 = forEachSaver18354.values[forEachCounter18354];
		{
				DIMPUSH(param5_Varis, local4_Vari_2343);
				
			}
			forEachSaver18354.values[forEachCounter18354] = local4_Vari_2343;
		
		};
		
	};
	return 0;
	
};
func8_GetVaris = window['func8_GetVaris'];
window['func11_GetVariable'] = function(param4_expr, param3_err) {
	var local6_hasErr_2346 = 0;
	local6_hasErr_2346 = 0;
	{
		var local17___SelectHelper23__2347 = 0;
		local17___SelectHelper23__2347 = global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr3_Typ;
		if ((((local17___SelectHelper23__2347) === (~~(9))) ? 1 : 0)) {
			return tryClone(global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr4_vari);
			
		} else if ((((local17___SelectHelper23__2347) === (~~(13))) ? 1 : 0)) {
			return tryClone(func11_GetVariable(global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr5_array, param3_err));
			
		} else if ((((local17___SelectHelper23__2347) === (~~(18))) ? 1 : 0)) {
			return tryClone(func11_GetVariable(global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr8_nextExpr, param3_err));
			
		} else if ((((local17___SelectHelper23__2347) === (~~(54))) ? 1 : 0)) {
			return tryClone(func11_GetVariable(global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr4_expr, param3_err));
			
		} else if ((((local17___SelectHelper23__2347) === (~~(6))) ? 1 : 0)) {
			if ((((global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr4_func) !== (-(1))) ? 1 : 0)) {
				var alias4_func_ref_2348 = [new type15_TIdentifierFunc()];
				alias4_func_ref_2348 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache] /* ALIAS */;
				if ((((alias4_func_ref_2348[0].attr3_Typ) === (3)) ? 1 : 0)) {
					return tryClone(-(1));
					
				} else {
					local6_hasErr_2346 = 1;
					
				};
				
			} else {
				local6_hasErr_2346 = 1;
				
			};
			
		} else {
			local6_hasErr_2346 = 1;
			
		};
		
	};
	if ((((local6_hasErr_2346) && (param3_err)) ? 1 : 0)) {
		var local7_add_Str_2349 = "";
		local7_add_Str_2349 = "";
		func5_Error((("Variable expected.") + (local7_add_Str_2349)), 2518, "src\CompilerPasses\Parser.gbas");
		
	} else {
		return tryClone(-(1));
		
	};
	return 0;
	
};
func11_GetVariable = window['func11_GetVariable'];
window['func12_GetRightExpr'] = function(param4_expr) {
	{
		var local17___SelectHelper24__2351 = 0;
		local17___SelectHelper24__2351 = global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr3_Typ;
		if ((((local17___SelectHelper24__2351) === (~~(18))) ? 1 : 0)) {
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
	var local8_startpos_2355 = 0;
	local8_startpos_2355 = global8_Compiler.attr11_currentPosi;
	while (((((((func7_IsToken(param9_Close_Str)) === (0)) ? 1 : 0)) && (func7_HasNext())) ? 1 : 0)) {
		if (func7_HasNext()) {
			func7_GetNext();
			
		};
		
	};
	if ((((func7_HasNext()) === (0)) ? 1 : 0)) {
		var local6_tmpPos_2356 = 0.0;
		local6_tmpPos_2356 = global8_Compiler.attr11_currentPosi;
		global8_Compiler.attr11_currentPosi = local8_startpos_2355;
		{
			var ex_Str = "";
			try {
				func5_Error(((((((((((param8_Open_Str) + (" "))) + (param8_Name_Str))) + (" needs '"))) + (param9_Close_Str))) + ("', unexpected end of file.")), 2554, "src\CompilerPasses\Parser.gbas");
				
			} catch (ex_Str) {
				if (ex_Str instanceof OTTException) ex_Str = ex_Str.getText(); else throwError(ex_Str);{
					global8_Compiler.attr11_currentPosi = ~~(local6_tmpPos_2356);
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
	var alias4_Func_ref_2359 = [new type15_TIdentifierFunc()], local8_Text_Str_2360 = "", local5_Found_2361 = 0;
	alias4_Func_ref_2359 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(param1_F).values[tmpPositionCache] /* ALIAS */;
	local8_Text_Str_2360 = (((((("RETURN TYPE: ") + (alias4_Func_ref_2359[0].attr8_datatype.attr8_Name_Str))) + (func20_BuildArrBrackets_Str(alias4_Func_ref_2359[0].attr8_datatype.attr7_IsArray)))) + (" PARAMETER:"));
	local5_Found_2361 = 0;
	var forEachSaver18663 = alias4_Func_ref_2359[0].attr6_Params;
	for(var forEachCounter18663 = 0 ; forEachCounter18663 < forEachSaver18663.values.length ; forEachCounter18663++) {
		var local1_P_2362 = forEachSaver18663.values[forEachCounter18663];
	{
			var alias5_Param_ref_2363 = [new type15_TIdentifierVari()];
			alias5_Param_ref_2363 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_2362).values[tmpPositionCache] /* ALIAS */;
			if (local5_Found_2361) {
				local8_Text_Str_2360 = ((local8_Text_Str_2360) + (", "));
				
			};
			local8_Text_Str_2360 = ((((local8_Text_Str_2360) + (alias5_Param_ref_2363[0].attr8_datatype.attr8_Name_Str))) + (func20_BuildArrBrackets_Str(alias5_Param_ref_2363[0].attr8_datatype.attr7_IsArray)));
			local5_Found_2361 = 1;
			
		}
		forEachSaver18663.values[forEachCounter18663] = local1_P_2362;
	
	};
	return tryClone(local8_Text_Str_2360);
	return "";
	
};
func17_BuildPrototyp_Str = window['func17_BuildPrototyp_Str'];
window['func14_SearchPrototyp'] = function(param8_Name_Str) {
	var local3_Ret_ref_2365 = [0];
	if ((global8_Compiler.attr11_GlobalFuncs).GetValue(param8_Name_Str, local3_Ret_ref_2365)) {
		if ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Ret_ref_2365[0]).values[tmpPositionCache][0].attr3_Typ) === (2)) ? 1 : 0)) {
			return tryClone(-(1));
			
		} else {
			return tryClone(unref(local3_Ret_ref_2365[0]));
			
		};
		
	} else {
		return tryClone(-(1));
		
	};
	return 0;
	
};
func14_SearchPrototyp = window['func14_SearchPrototyp'];
window['func14_SearchOperator'] = function(param8_Name_Str) {
	var forEachSaver18729 = global9_Operators_ref[0];
	for(var forEachCounter18729 = 0 ; forEachCounter18729 < forEachSaver18729.values.length ; forEachCounter18729++) {
		var local2_Op_ref_2367 = forEachSaver18729.values[forEachCounter18729];
	{
			if (((((((local2_Op_ref_2367[0].attr7_Sym_Str) === (param8_Name_Str)) ? 1 : 0)) || ((((local2_Op_ref_2367[0].attr8_Name_Str) === (param8_Name_Str)) ? 1 : 0))) ? 1 : 0)) {
				return tryClone(local2_Op_ref_2367[0].attr2_ID);
				
			};
			
		}
		forEachSaver18729.values[forEachCounter18729] = local2_Op_ref_2367;
	
	};
	return tryClone(-(1));
	return 0;
	
};
func14_SearchOperator = window['func14_SearchOperator'];
window['func17_CleanVariable_Str'] = function(param7_Var_Str) {
	var local11_Postfix_Str_2369 = "";
	local11_Postfix_Str_2369 = RIGHT_Str(param7_Var_Str, 1);
	if (((((((local11_Postfix_Str_2369) === ("%")) ? 1 : 0)) || ((((local11_Postfix_Str_2369) === ("#")) ? 1 : 0))) ? 1 : 0)) {
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
	var forEachSaver18934 = param3_scp.attr5_Exprs;
	for(var forEachCounter18934 = 0 ; forEachCounter18934 < forEachSaver18934.values.length ; forEachCounter18934++) {
		var local1_E_2371 = forEachSaver18934.values[forEachCounter18934];
	{
			var alias4_SubE_ref_2372 = [new type5_TExpr()];
			alias4_SubE_ref_2372 = global5_Exprs_ref[0].arrAccess(local1_E_2371).values[tmpPositionCache] /* ALIAS */;
			{
				var local17___SelectHelper25__2373 = 0;
				local17___SelectHelper25__2373 = alias4_SubE_ref_2372[0].attr3_Typ;
				if ((((local17___SelectHelper25__2373) === (~~(24))) ? 1 : 0)) {
					var forEachSaver18814 = alias4_SubE_ref_2372[0].attr6_Scopes;
					for(var forEachCounter18814 = 0 ; forEachCounter18814 < forEachSaver18814.values.length ; forEachCounter18814++) {
						var local1_E_2374 = forEachSaver18814.values[forEachCounter18814];
					{
							if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(local1_E_2374).values[tmpPositionCache][0]))) {
								return 1;
								
							};
							
						}
						forEachSaver18814.values[forEachCounter18814] = local1_E_2374;
					
					};
					if ((((alias4_SubE_ref_2372[0].attr9_elseScope) !== (-(1))) ? 1 : 0)) {
						if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(alias4_SubE_ref_2372[0].attr9_elseScope).values[tmpPositionCache][0]))) {
							return 1;
							
						};
						
					};
					
				} else if ((((local17___SelectHelper25__2373) === (~~(25))) ? 1 : 0)) {
					if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(alias4_SubE_ref_2372[0].attr3_Scp).values[tmpPositionCache][0]))) {
						return 1;
						
					};
					
				} else if ((((local17___SelectHelper25__2373) === (~~(26))) ? 1 : 0)) {
					if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(alias4_SubE_ref_2372[0].attr3_Scp).values[tmpPositionCache][0]))) {
						return 1;
						
					};
					
				} else if ((((local17___SelectHelper25__2373) === (~~(27))) ? 1 : 0)) {
					if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(alias4_SubE_ref_2372[0].attr3_Scp).values[tmpPositionCache][0]))) {
						return 1;
						
					};
					
				} else if ((((local17___SelectHelper25__2373) === (~~(38))) ? 1 : 0)) {
					if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(alias4_SubE_ref_2372[0].attr3_Scp).values[tmpPositionCache][0]))) {
						return 1;
						
					};
					
				} else if ((((local17___SelectHelper25__2373) === (~~(31))) ? 1 : 0)) {
					if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(alias4_SubE_ref_2372[0].attr3_Scp).values[tmpPositionCache][0]))) {
						return 1;
						
					};
					if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(alias4_SubE_ref_2372[0].attr8_catchScp).values[tmpPositionCache][0]))) {
						return 1;
						
					};
					
				} else if ((((local17___SelectHelper25__2373) === (~~(20))) ? 1 : 0)) {
					return 1;
					
				} else if ((((local17___SelectHelper25__2373) === (~~(2))) ? 1 : 0)) {
					if (func12_ScopeHasGoto(unref(alias4_SubE_ref_2372[0]))) {
						return 1;
						
					};
					
				} else {
					
				};
				
			};
			
		}
		forEachSaver18934.values[forEachCounter18934] = local1_E_2371;
	
	};
	return tryClone(0);
	return 0;
	
};
func12_ScopeHasGoto = window['func12_ScopeHasGoto'];
window['func13_ScopeName_Str'] = function(param4_expr) {
	{
		var local17___SelectHelper26__2376 = 0;
		local17___SelectHelper26__2376 = param4_expr.attr6_ScpTyp;
		if ((((local17___SelectHelper26__2376) === (~~(1))) ? 1 : 0)) {
			return "if";
			
		} else if ((((local17___SelectHelper26__2376) === (~~(3))) ? 1 : 0)) {
			return "loop";
			
		} else if ((((local17___SelectHelper26__2376) === (~~(5))) ? 1 : 0)) {
			return "try";
			
		} else if ((((local17___SelectHelper26__2376) === (~~(4))) ? 1 : 0)) {
			return "main";
			
		} else if ((((local17___SelectHelper26__2376) === (~~(2))) ? 1 : 0)) {
			{
				var local17___SelectHelper27__2377 = 0;
				local17___SelectHelper27__2377 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr3_Typ;
				if ((((local17___SelectHelper27__2377) === (~~(2))) ? 1 : 0)) {
					return tryClone((("sub: ") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr9_OName_Str)));
					
				} else if ((((local17___SelectHelper27__2377) === (~~(3))) ? 1 : 0)) {
					return tryClone((("method: ") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr9_OName_Str)));
					
				} else if ((((local17___SelectHelper27__2377) === (~~(1))) ? 1 : 0)) {
					return tryClone((("function: ") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr9_OName_Str)));
					
				} else if ((((local17___SelectHelper27__2377) === (~~(4))) ? 1 : 0)) {
					return tryClone((("prototype: ") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr9_OName_Str)));
					
				};
				
			};
			
		} else if ((((local17___SelectHelper26__2376) === (~~(6))) ? 1 : 0)) {
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
		var local17___SelectHelper28__2379 = 0;
		local17___SelectHelper28__2379 = param4_Vari.attr3_Typ;
		if ((((local17___SelectHelper28__2379) === (~~(1))) ? 1 : 0)) {
			param4_Vari.attr8_Name_Str = (((((("local") + (CAST2STRING((param4_Vari.attr8_Name_Str).length)))) + ("_"))) + (param4_Vari.attr8_Name_Str));
			
		} else if ((((local17___SelectHelper28__2379) === (~~(2))) ? 1 : 0)) {
			var local5_Found_2380 = 0;
			local5_Found_2380 = 0;
			var forEachSaver19152 = global8_Compiler.attr7_Exports;
			for(var forEachCounter19152 = 0 ; forEachCounter19152 < forEachSaver19152.values.length ; forEachCounter19152++) {
				var local3_Exp_2381 = forEachSaver19152.values[forEachCounter19152];
			{
					if ((((local3_Exp_2381.attr8_Name_Str) === (param4_Vari.attr8_Name_Str)) ? 1 : 0)) {
						local5_Found_2380 = 1;
						if (param4_Vari.attr3_ref) {
							func5_Error((((("Cannot export '") + (param4_Vari.attr8_Name_Str))) + ("' because it is a reference (dont use in connection with BYREF and ALIAS!)")), 2694, "src\CompilerPasses\Parser.gbas");
							
						};
						if ((((local3_Exp_2381.attr12_RealName_Str) !== ("")) ? 1 : 0)) {
							param4_Vari.attr8_Name_Str = local3_Exp_2381.attr12_RealName_Str;
							
						};
						return 0;
						
					};
					
				}
				forEachSaver19152.values[forEachCounter19152] = local3_Exp_2381;
			
			};
			param4_Vari.attr8_Name_Str = (((((("global") + (CAST2STRING((param4_Vari.attr8_Name_Str).length)))) + ("_"))) + (param4_Vari.attr8_Name_Str));
			
		} else if ((((local17___SelectHelper28__2379) === (~~(3))) ? 1 : 0)) {
			param4_Vari.attr8_Name_Str = (((((("attr") + (CAST2STRING((param4_Vari.attr8_Name_Str).length)))) + ("_"))) + (param4_Vari.attr8_Name_Str));
			
		} else if ((((local17___SelectHelper28__2379) === (~~(4))) ? 1 : 0)) {
			param4_Vari.attr8_Name_Str = (((((((((("static") + (CAST2STRING((param4_Vari.attr8_Name_Str).length)))) + ("_"))) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_Vari.attr4_func).values[tmpPositionCache][0].attr9_OName_Str))) + ("_"))) + (param4_Vari.attr8_Name_Str));
			
		} else if ((((local17___SelectHelper28__2379) === (~~(5))) ? 1 : 0)) {
			param4_Vari.attr8_Name_Str = (((((("param") + (CAST2STRING((param4_Vari.attr8_Name_Str).length)))) + ("_"))) + (param4_Vari.attr8_Name_Str));
			
		} else if ((((local17___SelectHelper28__2379) === (~~(6))) ? 1 : 0)) {
			param4_Vari.attr8_Name_Str = (((((("const") + (CAST2STRING((param4_Vari.attr8_Name_Str).length)))) + ("_"))) + (param4_Vari.attr8_Name_Str));
			
		} else if ((((local17___SelectHelper28__2379) === (~~(7))) ? 1 : 0)) {
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
		var local17___SelectHelper29__2383 = 0;
		local17___SelectHelper29__2383 = param4_Func.attr3_Typ;
		if ((((local17___SelectHelper29__2383) === (~~(3))) ? 1 : 0)) {
			param4_Func.attr8_Name_Str = (((((((((((((("method") + (CAST2STRING((global8_Compiler.attr5_Types_ref[0].arrAccess(param4_Func.attr6_MyType).values[tmpPositionCache][0].attr8_Name_Str).length)))) + ("_"))) + (global8_Compiler.attr5_Types_ref[0].arrAccess(param4_Func.attr6_MyType).values[tmpPositionCache][0].attr8_Name_Str))) + ("_"))) + (CAST2STRING((param4_Func.attr8_Name_Str).length)))) + ("_"))) + (param4_Func.attr8_Name_Str));
			
		} else if ((((local17___SelectHelper29__2383) === (~~(1))) ? 1 : 0)) {
			if ((((param4_Func.attr6_Native) === (0)) ? 1 : 0)) {
				var local5_Found_2384 = 0;
				local5_Found_2384 = 0;
				var forEachSaver19456 = global8_Compiler.attr7_Exports;
				for(var forEachCounter19456 = 0 ; forEachCounter19456 < forEachSaver19456.values.length ; forEachCounter19456++) {
					var local3_Exp_2385 = forEachSaver19456.values[forEachCounter19456];
				{
						if ((((local3_Exp_2385.attr8_Name_Str) === (param4_Func.attr8_Name_Str)) ? 1 : 0)) {
							local5_Found_2384 = 1;
							if ((((local3_Exp_2385.attr12_RealName_Str) !== ("")) ? 1 : 0)) {
								param4_Func.attr8_Name_Str = local3_Exp_2385.attr12_RealName_Str;
								
							};
							break;
							
						};
						
					}
					forEachSaver19456.values[forEachCounter19456] = local3_Exp_2385;
				
				};
				if (((local5_Found_2384) ? 0 : 1)) {
					param4_Func.attr8_Name_Str = (((((("func") + (CAST2STRING((param4_Func.attr8_Name_Str).length)))) + ("_"))) + (param4_Func.attr8_Name_Str));
					
				};
				
			};
			
		} else if ((((local17___SelectHelper29__2383) === (~~(2))) ? 1 : 0)) {
			
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
	var local8_Text_Str_2387 = "";
	local8_Text_Str_2387 = "\n";
	{
		var local1_i_2388 = 0.0;
		for (local1_i_2388 = 1;toCheck(local1_i_2388, global6_Indent, 1);local1_i_2388 += 1) {
			local8_Text_Str_2387 = ((local8_Text_Str_2387) + ("\t"));
			
		};
		
	};
	return tryClone(local8_Text_Str_2387);
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
	var forEachSaver19687 = global8_Compiler.attr5_Funcs_ref[0];
	for(var forEachCounter19687 = 0 ; forEachCounter19687 < forEachSaver19687.values.length ; forEachCounter19687++) {
		var local4_Func_ref_2389 = forEachSaver19687.values[forEachCounter19687];
	{
			if ((((((((((local4_Func_ref_2389[0].attr6_Native) === (0)) ? 1 : 0)) && ((((local4_Func_ref_2389[0].attr3_Scp) !== (-(1))) ? 1 : 0))) ? 1 : 0)) && ((((local4_Func_ref_2389[0].attr10_IsAbstract) === (0)) ? 1 : 0))) ? 1 : 0)) {
				var local1_i_2390 = 0;
				local1_i_2390 = 0;
				var forEachSaver19685 = local4_Func_ref_2389[0].attr6_Params;
				for(var forEachCounter19685 = 0 ; forEachCounter19685 < forEachSaver19685.values.length ; forEachCounter19685++) {
					var local1_P_2391 = forEachSaver19685.values[forEachCounter19685];
				{
						if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_2391).values[tmpPositionCache][0].attr3_ref) !== (global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Func_ref_2389[0].attr10_CopyParams.arrAccess(local1_i_2390).values[tmpPositionCache]).values[tmpPositionCache][0].attr3_ref)) ? 1 : 0)) {
							global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_2391).values[tmpPositionCache][0].attr9_OwnerVari = local4_Func_ref_2389[0].attr10_CopyParams.arrAccess(local1_i_2390).values[tmpPositionCache];
							
						} else {
							global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Func_ref_2389[0].attr10_CopyParams.arrAccess(local1_i_2390).values[tmpPositionCache]).values[tmpPositionCache][0].attr8_Name_Str = global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_2391).values[tmpPositionCache][0].attr8_Name_Str;
							
						};
						local1_i_2390+=1;
						
					}
					forEachSaver19685.values[forEachCounter19685] = local1_P_2391;
				
				};
				
			};
			
		}
		forEachSaver19687.values[forEachCounter19687] = local4_Func_ref_2389;
	
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
		var local7_Cur_Str_2394 = "";
		func14_MatchAndRemove("?", 17, "src\CompilerPasses\Preprocessor.gbas");
		local7_Cur_Str_2394 = func14_GetCurrent_Str();
		func13_RemoveCurrent();
		{
			var local17___SelectHelper30__2395 = "";
			local17___SelectHelper30__2395 = local7_Cur_Str_2394;
			if ((((local17___SelectHelper30__2395) === ("DEFINE")) ? 1 : 0)) {
				var local3_Def_2396 = new type7_TDefine();
				local3_Def_2396.attr7_Key_Str = func14_GetCurrent_Str();
				func13_RemoveCurrent();
				if ((((func7_IsToken("\n")) === (0)) ? 1 : 0)) {
					local3_Def_2396.attr9_Value_Str = func14_GetCurrent_Str();
					func13_RemoveCurrent();
					
				} else {
					local3_Def_2396.attr9_Value_Str = CAST2STRING(1);
					
				};
				if (((param9_IgnoreAll) ? 0 : 1)) {
					DIMPUSH(global7_Defines, local3_Def_2396);
					
				};
				
			} else if ((((local17___SelectHelper30__2395) === ("UNDEF")) ? 1 : 0)) {
				if (((param9_IgnoreAll) ? 0 : 1)) {
					var forEachSaver19782 = global7_Defines;
					for(var forEachCounter19782 = 0 ; forEachCounter19782 < forEachSaver19782.values.length ; forEachCounter19782++) {
						var local3_Def_2397 = forEachSaver19782.values[forEachCounter19782];
					{
							if (func7_IsToken(local3_Def_2397.attr7_Key_Str)) {
								forEachSaver19782.values[forEachCounter19782] = local3_Def_2397;
								DIMDEL(forEachSaver19782, forEachCounter19782);
								forEachCounter19782--;
								continue;
								
							};
							
						}
						forEachSaver19782.values[forEachCounter19782] = local3_Def_2397;
					
					};
					
				};
				func13_RemoveCurrent();
				
			} else if ((((local17___SelectHelper30__2395) === ("IFDEF")) ? 1 : 0)) {
				if (((param9_IgnoreAll) ? 0 : 1)) {
					var local4_doIt_2398 = 0;
					local4_doIt_2398 = 0;
					var forEachSaver19813 = global7_Defines;
					for(var forEachCounter19813 = 0 ; forEachCounter19813 < forEachSaver19813.values.length ; forEachCounter19813++) {
						var local3_Def_2399 = forEachSaver19813.values[forEachCounter19813];
					{
							if (func7_IsToken(local3_Def_2399.attr7_Key_Str)) {
								local4_doIt_2398 = 1;
								break;
								
							};
							
						}
						forEachSaver19813.values[forEachCounter19813] = local3_Def_2399;
					
					};
					func13_RemoveCurrent();
					func14_MatchAndRemove("\n", 49, "src\CompilerPasses\Preprocessor.gbas");
					func5_PreIf(local4_doIt_2398);
					
				} else {
					func13_RemoveCurrent();
					func14_MatchAndRemove("\n", 53, "src\CompilerPasses\Preprocessor.gbas");
					func5_PreIf(2);
					
				};
				
			} else if ((((local17___SelectHelper30__2395) === ("IFNDEF")) ? 1 : 0)) {
				if (((param9_IgnoreAll) ? 0 : 1)) {
					var local4_doIt_2400 = 0;
					local4_doIt_2400 = 1;
					var forEachSaver19858 = global7_Defines;
					for(var forEachCounter19858 = 0 ; forEachCounter19858 < forEachSaver19858.values.length ; forEachCounter19858++) {
						var local3_Def_2401 = forEachSaver19858.values[forEachCounter19858];
					{
							if (func7_IsToken(local3_Def_2401.attr7_Key_Str)) {
								local4_doIt_2400 = 0;
								break;
								
							};
							
						}
						forEachSaver19858.values[forEachCounter19858] = local3_Def_2401;
					
					};
					func13_RemoveCurrent();
					func14_MatchAndRemove("\n", 66, "src\CompilerPasses\Preprocessor.gbas");
					func5_PreIf(local4_doIt_2400);
					
				} else {
					func13_RemoveCurrent();
					func14_MatchAndRemove("\n", 71, "src\CompilerPasses\Preprocessor.gbas");
					func5_PreIf(2);
					
				};
				
			} else if ((((local17___SelectHelper30__2395) === ("IF")) ? 1 : 0)) {
				if (((param9_IgnoreAll) ? 0 : 1)) {
					var local6_Result_2402 = 0, local3_Pos_2403 = 0.0;
					local6_Result_2402 = 0;
					local3_Pos_2403 = global8_Compiler.attr11_currentPosi;
					{
						var Error_Str = "";
						try {
							local6_Result_2402 = ~~(func13_CalculateTree(unref(global5_Exprs_ref[0].arrAccess(func10_Expression(0)).values[tmpPositionCache][0])));
							
						} catch (Error_Str) {
							if (Error_Str instanceof OTTException) Error_Str = Error_Str.getText(); else throwError(Error_Str);{
								func5_Error((((("Unable to evaluate IF (syntax error?) '") + (Error_Str))) + ("'")), 82, "src\CompilerPasses\Preprocessor.gbas");
								
							}
						};
						
					};
					global8_Compiler.attr11_currentPosi = ~~(((local3_Pos_2403) - (1)));
					func7_GetNext();
					while (((func7_IsToken("\n")) ? 0 : 1)) {
						func13_RemoveCurrent();
						
					};
					func14_MatchAndRemove("\n", 91, "src\CompilerPasses\Preprocessor.gbas");
					if ((((local6_Result_2402) === (1)) ? 1 : 0)) {
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
				
			} else if ((((local17___SelectHelper30__2395) === ("WARNING")) ? 1 : 0)) {
				if (((param9_IgnoreAll) ? 0 : 1)) {
					func7_Warning(func14_GetCurrent_Str());
					
				};
				func13_RemoveCurrent();
				
			} else if ((((local17___SelectHelper30__2395) === ("ERROR")) ? 1 : 0)) {
				if (((param9_IgnoreAll) ? 0 : 1)) {
					func5_Error(func14_GetCurrent_Str(), 111, "src\CompilerPasses\Preprocessor.gbas");
					
				};
				func13_RemoveCurrent();
				
			} else if ((((local17___SelectHelper30__2395) === ("ELSE")) ? 1 : 0)) {
				return 1;
				
			} else if ((((local17___SelectHelper30__2395) === ("ENDIF")) ? 1 : 0)) {
				return 2;
				
			} else if ((((local17___SelectHelper30__2395) === ("OPTIMIZE")) ? 1 : 0)) {
				if (((param9_IgnoreAll) ? 0 : 1)) {
					{
						var local17___SelectHelper31__2405 = "";
						local17___SelectHelper31__2405 = func14_GetCurrent_Str();
						if ((((local17___SelectHelper31__2405) === ("SIMPLE")) ? 1 : 0)) {
							global13_OptimizeLevel = 1;
							
						} else if ((((local17___SelectHelper31__2405) === ("AGGRESSIVE")) ? 1 : 0)) {
							global13_OptimizeLevel = 2;
							
						} else if ((((local17___SelectHelper31__2405) === ("NONE")) ? 1 : 0)) {
							global13_OptimizeLevel = 0;
							
						} else {
							func5_Error("Unknown optimization level", 137, "src\CompilerPasses\Preprocessor.gbas");
							
						};
						
					};
					
				};
				func13_RemoveCurrent();
				
			} else if ((((local17___SelectHelper30__2395) === ("GRAPHICS")) ? 1 : 0)) {
				if (((param9_IgnoreAll) ? 0 : 1)) {
					global7_CONSOLE = 0;
					
				};
				
			} else if ((((local17___SelectHelper30__2395) === ("DOC")) ? 1 : 0)) {
				func8_ParseDoc();
				
			} else {
				func5_Error((((("Expecting preprocessor command got '") + (local7_Cur_Str_2394))) + ("'")), 148, "src\CompilerPasses\Preprocessor.gbas");
				
			};
			
		};
		func14_MatchAndRemove("\n", 151, "src\CompilerPasses\Preprocessor.gbas");
		
	} else {
		var local6_Is_Str_2406 = "";
		local6_Is_Str_2406 = func14_GetCurrent_Str();
		if ((((local6_Is_Str_2406) === ("_")) ? 1 : 0)) {
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
	var local8_Text_Str_2408 = "";
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
		var local1_E_2410 = 0;
		local1_E_2410 = func10_PreCommand(param9_RemoveAll);
		if ((((local1_E_2410) > (0)) ? 1 : 0)) {
			return tryClone(local1_E_2410);
			
		};
		
	};
	func5_Error("Unexpected End Of File (maybe missing ?ENDIF)", 198, "src\CompilerPasses\Preprocessor.gbas");
	return 0;
	
};
func7_PreSkip = window['func7_PreSkip'];
window['func13_CalculateTree'] = function(param4_expr) {
	{
		var local17___SelectHelper32__2412 = 0;
		local17___SelectHelper32__2412 = param4_expr.attr3_Typ;
		if ((((local17___SelectHelper32__2412) === (~~(3))) ? 1 : 0)) {
			return tryClone(param4_expr.attr6_intval);
			
		} else if ((((local17___SelectHelper32__2412) === (~~(4))) ? 1 : 0)) {
			return tryClone(param4_expr.attr8_floatval);
			
		} else if ((((local17___SelectHelper32__2412) === (~~(46))) ? 1 : 0)) {
			return tryClone(unref(((func13_CalculateTree(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))) ? 0 : 1)));
			
		} else if ((((local17___SelectHelper32__2412) === (~~(15))) ? 1 : 0)) {
			return tryClone(INTEGER(func13_CalculateTree(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))));
			
		} else if ((((local17___SelectHelper32__2412) === (~~(16))) ? 1 : 0)) {
			return tryClone(func13_CalculateTree(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0])));
			
		} else if ((((local17___SelectHelper32__2412) === (~~(1))) ? 1 : 0)) {
			var local4_Left_2413 = 0.0, local5_Right_2414 = 0.0;
			local4_Left_2413 = func13_CalculateTree(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_Left).values[tmpPositionCache][0]));
			local5_Right_2414 = func13_CalculateTree(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0]));
			{
				var local17___SelectHelper33__2415 = "";
				local17___SelectHelper33__2415 = global9_Operators_ref[0].arrAccess(param4_expr.attr2_Op).values[tmpPositionCache][0].attr7_Sym_Str;
				if ((((local17___SelectHelper33__2415) === ("+")) ? 1 : 0)) {
					return tryClone(((local4_Left_2413) + (local5_Right_2414)));
					
				} else if ((((local17___SelectHelper33__2415) === ("-")) ? 1 : 0)) {
					return tryClone(((local4_Left_2413) - (local5_Right_2414)));
					
				} else if ((((local17___SelectHelper33__2415) === ("*")) ? 1 : 0)) {
					return tryClone(((local4_Left_2413) * (local5_Right_2414)));
					
				} else if ((((local17___SelectHelper33__2415) === ("/")) ? 1 : 0)) {
					return tryClone(((local4_Left_2413) / (local5_Right_2414)));
					
				} else if ((((local17___SelectHelper33__2415) === ("^")) ? 1 : 0)) {
					return tryClone(POW(local4_Left_2413, local5_Right_2414));
					
				} else if ((((local17___SelectHelper33__2415) === ("=")) ? 1 : 0)) {
					return tryClone((((local4_Left_2413) === (local5_Right_2414)) ? 1 : 0));
					
				} else if ((((local17___SelectHelper33__2415) === (">")) ? 1 : 0)) {
					return tryClone((((local4_Left_2413) > (local5_Right_2414)) ? 1 : 0));
					
				} else if ((((local17___SelectHelper33__2415) === ("<")) ? 1 : 0)) {
					return tryClone((((local4_Left_2413) < (local5_Right_2414)) ? 1 : 0));
					
				} else if ((((local17___SelectHelper33__2415) === ("<=")) ? 1 : 0)) {
					return tryClone((((local4_Left_2413) <= (local5_Right_2414)) ? 1 : 0));
					
				} else if ((((local17___SelectHelper33__2415) === (">=")) ? 1 : 0)) {
					return tryClone((((local4_Left_2413) >= (local5_Right_2414)) ? 1 : 0));
					
				} else if ((((local17___SelectHelper33__2415) === ("AND")) ? 1 : 0)) {
					return tryClone((((local4_Left_2413) && (local5_Right_2414)) ? 1 : 0));
					
				} else if ((((local17___SelectHelper33__2415) === ("OR")) ? 1 : 0)) {
					return tryClone((((local4_Left_2413) || (local5_Right_2414)) ? 1 : 0));
					
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
	var local10_Output_Str_2417 = "";
	global8_Compiler.attr14_errorState_Str = ((((" (target '") + (param8_Name_Str))) + ("' error)"));
	global10_Target_Str = param8_Name_Str;
	global13_SettingIn_Str = "";
	REDIM(global9_Templates, [0], new type9_TTemplate() );
	REDIM(global9_Libraries, [0], new type8_TLibrary() );
	REDIM(global10_Blacklists, [0], new type10_TBlackList() );
	REDIM(global7_Actions, [0], new type7_TAction() );
	local10_Output_Str_2417 = "";
	var forEachSaver20474 = global10_Generators;
	for(var forEachCounter20474 = 0 ; forEachCounter20474 < forEachSaver20474.values.length ; forEachCounter20474++) {
		var local1_G_2418 = forEachSaver20474.values[forEachCounter20474];
	{
			if ((((UCASE_Str(local1_G_2418.attr8_Name_Str)) === (UCASE_Str(global8_Lang_Str))) ? 1 : 0)) {
				global8_Compiler.attr14_errorState_Str = " (generate error)";
				local10_Output_Str_2417 = (("") + (CAST2STRING(local1_G_2418.attr8_genProto())));
				global8_Compiler.attr14_errorState_Str = ((((" (target '") + (param8_Name_Str))) + ("' error)"));
				break;
				
			};
			
		}
		forEachSaver20474.values[forEachCounter20474] = local1_G_2418;
	
	};
	if ((((local10_Output_Str_2417) === ("")) ? 1 : 0)) {
		func5_Error("Empty output!", 81, "src\Target.gbas");
		
	};
	return tryClone(local10_Output_Str_2417);
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
		var local8_HasSlash_2429 = 0;
		local8_HasSlash_2429 = 0;
		param4_self.attr8_Position+=1;
		(param4_self).SkipWhitespaces();
		if (((((param4_self).Get_Str()) === ("/")) ? 1 : 0)) {
			local8_HasSlash_2429 = 1;
			
		};
		while (((((param4_self).Get_Str()) !== ("<")) ? 1 : 0)) {
			param4_self.attr8_Position+=-1;
			
		};
		if (local8_HasSlash_2429) {
			return tryClone(0);
			
		};
		(param4_self).ParseNode();
		
	};
	return tryClone(1);
	return 0;
	
};
method9_type3_XML_10_ParseLayer = window['method9_type3_XML_10_ParseLayer'];
window['method9_type3_XML_9_ParseNode'] = function(param4_self) {
	var local8_Name_Str_2432 = "", local10_Attributes_2433 = new OTTArray();
	if (((((param4_self).Get_Str()) !== ("<")) ? 1 : 0)) {
		throw new OTTException("XML Error - Expecting '<'", "\src\Utils\XMLReader.gbas", 69);
		
	};
	param4_self.attr8_Position+=1;
	(param4_self).SkipWhitespaces();
	local8_Name_Str_2432 = (param4_self).ParseIdentifier_Str();
	if (((((param4_self).Get_Str()) === (" ")) ? 1 : 0)) {
		(param4_self).SkipWhitespaces();
		while ((((((((param4_self).Get_Str()) !== ("/")) ? 1 : 0)) && (((((param4_self).Get_Str()) !== (">")) ? 1 : 0))) ? 1 : 0)) {
			var local3_Att_2434 = new type12_xmlAttribute(), local3_Pos_2435 = 0;
			(param4_self).SkipWhitespaces();
			local3_Att_2434.attr8_Name_Str = (param4_self).ParseIdentifier_Str();
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
			local3_Pos_2435 = param4_self.attr8_Position;
			while (((((param4_self).Get_Str()) !== ("\"")) ? 1 : 0)) {
				param4_self.attr8_Position+=1;
				
			};
			param4_self.attr8_Position+=1;
			local3_Att_2434.attr9_Value_Str = MID_Str(param4_self.attr8_Text_Str, local3_Pos_2435, ((((param4_self.attr8_Position) - (local3_Pos_2435))) - (1)));
			(param4_self).SkipWhitespaces();
			DIMPUSH(local10_Attributes_2433, local3_Att_2434);
			
		};
		
	};
	param4_self.attr5_Event(local8_Name_Str_2432, local10_Attributes_2433);
	{
		var local17___SelectHelper34__2436 = "";
		local17___SelectHelper34__2436 = (param4_self).Get_Str();
		if ((((local17___SelectHelper34__2436) === (">")) ? 1 : 0)) {
			param4_self.attr8_Position+=1;
			(param4_self).SkipWhitespaces();
			if ((param4_self).ParseLayer()) {
				throw new OTTException((((("XML Error - Unexpected End of File, expecting </") + (local8_Name_Str_2432))) + (">")), "\src\Utils\XMLReader.gbas", 113);
				
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
			if ((((local8_Name_Str_2432) !== ((param4_self).ParseIdentifier_Str())) ? 1 : 0)) {
				throw new OTTException("XML Error - Nodes do not match", "\src\Utils\XMLReader.gbas", 123);
				
			};
			if (((((param4_self).Get_Str()) !== (">")) ? 1 : 0)) {
				throw new OTTException("XML Error Expecting '>'", "\src\Utils\XMLReader.gbas", 124);
				
			};
			param4_self.attr8_Position+=1;
			(param4_self).SkipWhitespaces();
			
		} else if ((((local17___SelectHelper34__2436) === ("/")) ? 1 : 0)) {
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
	
};
method9_type3_XML_9_ParseNode = window['method9_type3_XML_9_ParseNode'];
window['method9_type3_XML_19_ParseIdentifier_Str'] = function(param4_self) {
	var local3_Pos_2439 = 0;
	local3_Pos_2439 = param4_self.attr8_Position;
	while ((((((((((((((param4_self).Get_Str()) !== (" ")) ? 1 : 0)) && (((((param4_self).Get_Str()) !== ("/")) ? 1 : 0))) ? 1 : 0)) && (((((param4_self).Get_Str()) !== (">")) ? 1 : 0))) ? 1 : 0)) && (((((param4_self).Get_Str()) !== ("=")) ? 1 : 0))) ? 1 : 0)) {
		param4_self.attr8_Position+=1;
		
	};
	if ((((param4_self.attr8_Position) >= ((param4_self.attr8_Text_Str).length)) ? 1 : 0)) {
		throw new OTTException("XML Error", "\src\Utils\XMLReader.gbas", 143);
		
	};
	return tryClone(UCASE_Str(MID_Str(param4_self.attr8_Text_Str, local3_Pos_2439, ((param4_self.attr8_Position) - (local3_Pos_2439)))));
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
	this.attr6_Tokens = new OTTArray();
	this.attr11_currentPosi = 0;
	this.attr11_GlobalFuncs = new type7_HashMap();
	this.attr5_Funcs_ref = [new OTTArray()];
	this.attr7_Globals = new OTTArray();
	this.attr5_Types_ref = [new OTTArray()];
	this.attr5_Varis_ref = [new OTTArray()];
	this.attr13_protoCheckers = new OTTArray();
	this.attr10_DataBlocks = new OTTArray();
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
	this.attr7_Exports = new OTTArray();
	this.attr11_LastTokenID = 0;
	this.attr13_FaultTolerant = 0;
	this.attr6_Errors = new OTTArray();
	this.attr15_HeaderFiles_Str = new OTTArray();
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
	
};
window['type9_TCompiler'].prototype.clone = function() {
	var other = new type9_TCompiler();
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
	this.attr6_Params = new OTTArray();
	this.attr10_CopyParams = new OTTArray();
	this.attr7_Statics = new OTTArray();
	this.attr8_datatype = new type9_TDatatype();
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
	
};
window['type15_TIdentifierFunc'].prototype.clone = function() {
	var other = new type15_TIdentifierFunc();
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
	this.attr8_datatype = new type9_TDatatype();
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
	
};
window['type15_TIdentifierVari'].prototype.clone = function() {
	var other = new type15_TIdentifierVari();
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
	this.attr10_Attributes = new OTTArray();
	this.attr7_Methods = new OTTArray();
	this.attr7_PreSize = new OTTArray();
	this.attr2_ID = 0;
	this.attr3_Tok = 0;
	this.attr9_Extending = 0;
	this.attr10_Createable = 0;
	this.attr8_IsNative = 0;
	this.vtbl = vtbl_type15_TIdentifierType;
	this.attr9_Extending = -(1);
	this.attr10_Createable = 1;
	this.attr8_IsNative = 0;
	
};
window['type15_TIdentifierType'].prototype.clone = function() {
	var other = new type15_TIdentifierType();
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
	
};
window['type9_TDatatype'].prototype.clone = function() {
	var other = new type9_TDatatype();
	other.attr8_Name_Str = this.attr8_Name_Str;
	other.attr7_IsArray = this.attr7_IsArray;
	other.vtbl = this.vtbl;
	return other;
};
window['type9_TDatatype'].prototype.bridgeToJS = function(isJSON) {
	return {
		"Name_Str": this.attr8_Name_Str,
		"IsArray": this.attr7_IsArray,
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
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
	this.attr5_Datas = new OTTArray();
	this.vtbl = vtbl_type10_TDataBlock;
	
};
window['type10_TDataBlock'].prototype.clone = function() {
	var other = new type10_TDataBlock();
	other.attr8_Name_Str = this.attr8_Name_Str;
	other.attr5_Datas = tryClone(this.attr5_Datas);
	other.vtbl = this.vtbl;
	return other;
};
window['type10_TDataBlock'].prototype.bridgeToJS = function(isJSON) {
	return {
		"Name_Str": this.attr8_Name_Str,
		"Datas": (this.attr5_Datas).bridgeToJS(isJSON),
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
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
	this.attr3_Tok = new type6_TToken();
	this.attr8_fromFunc = 0;
	this.attr6_toFunc = 0;
	this.vtbl = vtbl_type13_TProtoChecker;
	
};
window['type13_TProtoChecker'].prototype.clone = function() {
	var other = new type13_TProtoChecker();
	other.attr3_Tok = tryClone(this.attr3_Tok);
	other.attr8_fromFunc = this.attr8_fromFunc;
	other.attr6_toFunc = this.attr6_toFunc;
	other.vtbl = this.vtbl;
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
	
};
window['type6_TToken'].prototype.clone = function() {
	var other = new type6_TToken();
	other.attr4_Line = this.attr4_Line;
	other.attr15_LineContent_Str = this.attr15_LineContent_Str;
	other.attr9_Character = this.attr9_Character;
	other.attr8_Path_Str = this.attr8_Path_Str;
	other.attr8_Text_Str = this.attr8_Text_Str;
	other.attr5_IsDel = this.attr5_IsDel;
	other.vtbl = this.vtbl;
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
	
};
window['type7_TExport'].prototype.clone = function() {
	var other = new type7_TExport();
	other.attr8_Name_Str = this.attr8_Name_Str;
	other.attr12_RealName_Str = this.attr12_RealName_Str;
	other.vtbl = this.vtbl;
	return other;
};
window['type7_TExport'].prototype.bridgeToJS = function(isJSON) {
	return {
		"Name_Str": this.attr8_Name_Str,
		"RealName_Str": this.attr12_RealName_Str,
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
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
	this.attr8_datatype = new type9_TDatatype();
	this.attr3_Typ = 0;
	this.attr2_ID = 0;
	this.attr5_tokID = 0;
	this.attr4_Left = 0;
	this.attr5_Right = 0;
	this.attr2_Op = 0;
	this.attr5_Exprs = new OTTArray();
	this.attr5_Varis = new OTTArray();
	this.attr10_SuperScope = 0;
	this.attr6_ScpTyp = 0;
	this.attr6_Labels = new OTTArray();
	this.attr5_Gotos = new OTTArray();
	this.attr6_intval = 0;
	this.attr8_floatval = 0.0;
	this.attr10_strval_Str = "";
	this.attr4_func = 0;
	this.attr6_Params = new OTTArray();
	this.attr8_wasAdded = 0;
	this.attr4_vari = 0;
	this.attr5_array = 0;
	this.attr4_dims = new OTTArray();
	this.attr4_expr = 0;
	this.attr8_nextExpr = 0;
	this.attr8_Name_Str = "";
	this.attr10_Conditions = new OTTArray();
	this.attr6_Scopes = new OTTArray();
	this.attr9_elseScope = 0;
	this.attr5_dummy = 0.0;
	this.attr3_Scp = 0;
	this.attr7_varExpr = 0;
	this.attr6_toExpr = 0;
	this.attr8_stepExpr = 0;
	this.attr5_hasTo = 0;
	this.attr6_inExpr = 0;
	this.attr8_catchScp = 0;
	this.attr5_Reads = new OTTArray();
	this.attr4_kern = 0;
	this.attr8_position = 0;
	this.attr11_Content_Str = "";
	this.vtbl = vtbl_type5_TExpr;
	this.attr10_SuperScope = -(1);
	this.attr8_wasAdded = 0;
	this.attr9_elseScope = -(1);
	this.attr5_dummy = -(42);
	this.attr4_kern = -(1);
	
};
window['type5_TExpr'].prototype.clone = function() {
	var other = new type5_TExpr();
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
	
};
window['type9_TOperator'].prototype.clone = function() {
	var other = new type9_TOperator();
	other.attr8_Name_Str = this.attr8_Name_Str;
	other.attr7_Sym_Str = this.attr7_Sym_Str;
	other.attr3_Typ = this.attr3_Typ;
	other.attr4_Prio = this.attr4_Prio;
	other.attr2_ID = this.attr2_ID;
	other.vtbl = this.vtbl;
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
	
};
window['type7_TDefine'].prototype.clone = function() {
	var other = new type7_TDefine();
	other.attr7_Key_Str = this.attr7_Key_Str;
	other.attr9_Value_Str = this.attr9_Value_Str;
	other.vtbl = this.vtbl;
	return other;
};
window['type7_TDefine'].prototype.bridgeToJS = function(isJSON) {
	return {
		"Key_Str": this.attr7_Key_Str,
		"Value_Str": this.attr9_Value_Str,
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
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
	
};
window['type10_TGenerator'].prototype.clone = function() {
	var other = new type10_TGenerator();
	other.attr8_Name_Str = this.attr8_Name_Str;
	other.attr8_genProto = tryClone(this.attr8_genProto);
	other.vtbl = this.vtbl;
	return other;
};
window['type10_TGenerator'].prototype.bridgeToJS = function(isJSON) {
	return {
		"Name_Str": this.attr8_Name_Str,
		"genProto": (this.attr8_genProto).bridgeToJS(isJSON),
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
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
	this.attr5_token = new type6_TToken();
	this.attr7_Msg_Str = "";
	this.vtbl = vtbl_type6_TError;
	
};
window['type6_TError'].prototype.clone = function() {
	var other = new type6_TError();
	other.attr3_Typ = this.attr3_Typ;
	other.attr14_errorState_Str = this.attr14_errorState_Str;
	other.attr5_token = tryClone(this.attr5_token);
	other.attr7_Msg_Str = this.attr7_Msg_Str;
	other.vtbl = this.vtbl;
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
	this.attr4_desc = new OTTArray();
	this.attr8_name_Str = "";
	this.attr10_module_Str = "";
	this.attr6_params = new OTTArray();
	this.attr7_example = new OTTArray();
	this.attr7_see_Str = new OTTArray();
	this.vtbl = vtbl_type13_Documentation;
	
};
window['type13_Documentation'].prototype.clone = function() {
	var other = new type13_Documentation();
	other.attr7_typ_Str = this.attr7_typ_Str;
	other.attr4_desc = tryClone(this.attr4_desc);
	other.attr8_name_Str = this.attr8_name_Str;
	other.attr10_module_Str = this.attr10_module_Str;
	other.attr6_params = tryClone(this.attr6_params);
	other.attr7_example = tryClone(this.attr7_example);
	other.attr7_see_Str = tryClone(this.attr7_see_Str);
	other.vtbl = this.vtbl;
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
	this.attr4_desc = new OTTArray();
	this.vtbl = vtbl_type12_ParamElement;
	
};
window['type12_ParamElement'].prototype.clone = function() {
	var other = new type12_ParamElement();
	other.attr8_name_Str = this.attr8_name_Str;
	other.attr4_desc = tryClone(this.attr4_desc);
	other.vtbl = this.vtbl;
	return other;
};
window['type12_ParamElement'].prototype.bridgeToJS = function(isJSON) {
	return {
		"name_Str": this.attr8_name_Str,
		"desc": (this.attr4_desc).bridgeToJS(isJSON),
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
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
	
};
window['type11_LangElement'].prototype.clone = function() {
	var other = new type11_LangElement();
	other.attr8_desc_Str = this.attr8_desc_Str;
	other.attr8_lang_Str = this.attr8_lang_Str;
	other.vtbl = this.vtbl;
	return other;
};
window['type11_LangElement'].prototype.bridgeToJS = function(isJSON) {
	return {
		"desc_Str": this.attr8_desc_Str,
		"lang_Str": this.attr8_lang_Str,
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
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
	this.attr8_Elements = new OTTArray();
	this.attr7_Element = new type8_KeyValue();
	this.vtbl = vtbl_type6_Bucket;
	this.attr3_Set = 0;
	
};
window['type6_Bucket'].prototype.clone = function() {
	var other = new type6_Bucket();
	other.attr3_Set = this.attr3_Set;
	other.attr8_Elements = tryClone(this.attr8_Elements);
	other.attr7_Element = tryClone(this.attr7_Element);
	other.vtbl = this.vtbl;
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
	
};
window['type8_KeyValue'].prototype.clone = function() {
	var other = new type8_KeyValue();
	other.attr7_Key_Str = this.attr7_Key_Str;
	other.attr5_Value = this.attr5_Value;
	other.vtbl = this.vtbl;
	return other;
};
window['type8_KeyValue'].prototype.bridgeToJS = function(isJSON) {
	return {
		"Key_Str": this.attr7_Key_Str,
		"Value": this.attr5_Value,
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
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
	this.attr7_Buckets_ref = [new OTTArray()];
	this.attr8_Elements = 0;
	this.vtbl = vtbl_type7_HashMap;
	
};
window['type7_HashMap'].prototype.clone = function() {
	var other = new type7_HashMap();
	other.attr7_Buckets_ref = tryClone(this.attr7_Buckets_ref);
	other.attr8_Elements = this.attr8_Elements;
	other.vtbl = this.vtbl;
	return other;
};
window['type7_HashMap'].prototype.bridgeToJS = function(isJSON) {
	return {
		"Buckets": (this.attr7_Buckets_ref).bridgeToJS(isJSON),
		"Elements": this.attr8_Elements,
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
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
	this.attr8_datatype = new type9_TDatatype();
	this.attr5_token = new type6_TToken();
	this.attr7_Typ_Str = "";
	this.attr6_SubTyp = 0;
	this.attr6_Native = 0;
	this.vtbl = vtbl_type14_TIDEIdentifier;
	
};
window['type14_TIDEIdentifier'].prototype.clone = function() {
	var other = new type14_TIDEIdentifier();
	other.attr8_Name_Str = this.attr8_Name_Str;
	other.attr8_datatype = tryClone(this.attr8_datatype);
	other.attr5_token = tryClone(this.attr5_token);
	other.attr7_Typ_Str = this.attr7_Typ_Str;
	other.attr6_SubTyp = this.attr6_SubTyp;
	other.attr6_Native = this.attr6_Native;
	other.vtbl = this.vtbl;
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
	
};
window['type9_TTemplate'].prototype.clone = function() {
	var other = new type9_TTemplate();
	other.attr8_Path_Str = this.attr8_Path_Str;
	other.attr8_Mode_Str = this.attr8_Mode_Str;
	other.attr8_Name_Str = this.attr8_Name_Str;
	other.vtbl = this.vtbl;
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
	
};
window['type8_TLibrary'].prototype.clone = function() {
	var other = new type8_TLibrary();
	other.attr8_Path_Str = this.attr8_Path_Str;
	other.attr8_Mode_Str = this.attr8_Mode_Str;
	other.vtbl = this.vtbl;
	return other;
};
window['type8_TLibrary'].prototype.bridgeToJS = function(isJSON) {
	return {
		"Path_Str": this.attr8_Path_Str,
		"Mode_Str": this.attr8_Mode_Str,
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
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
	
};
window['type10_TBlackList'].prototype.clone = function() {
	var other = new type10_TBlackList();
	other.attr3_Typ = this.attr3_Typ;
	other.attr8_Name_Str = this.attr8_Name_Str;
	other.attr10_Action_Str = this.attr10_Action_Str;
	other.vtbl = this.vtbl;
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
	this.attr3_Att = new OTTArray();
	this.vtbl = vtbl_type7_TAction;
	
};
window['type7_TAction'].prototype.clone = function() {
	var other = new type7_TAction();
	other.attr8_Name_Str = this.attr8_Name_Str;
	other.attr3_Att = tryClone(this.attr3_Att);
	other.vtbl = this.vtbl;
	return other;
};
window['type7_TAction'].prototype.bridgeToJS = function(isJSON) {
	return {
		"Name_Str": this.attr8_Name_Str,
		"Att": (this.attr3_Att).bridgeToJS(isJSON),
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
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
	
};
window['type12_xmlAttribute'].prototype.clone = function() {
	var other = new type12_xmlAttribute();
	other.attr8_Name_Str = this.attr8_Name_Str;
	other.attr9_Value_Str = this.attr9_Value_Str;
	other.vtbl = this.vtbl;
	return other;
};
window['type12_xmlAttribute'].prototype.bridgeToJS = function(isJSON) {
	return {
		"Name_Str": this.attr8_Name_Str,
		"Value_Str": this.attr9_Value_Str,
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
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
	
};
window['type3_XML'].prototype.clone = function() {
	var other = new type3_XML();
	other.attr8_Text_Str = this.attr8_Text_Str;
	other.attr5_Event = tryClone(this.attr5_Event);
	other.attr8_Position = this.attr8_Position;
	other.attr8_DontCall = this.attr8_DontCall;
	other.vtbl = this.vtbl;
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
	
};
window['type7_TObject'].prototype.clone = function() {
	var other = new type7_TObject();
	other.vtbl = this.vtbl;
	return other;
};
window['type7_TObject'].prototype.bridgeToJS = function(isJSON) {
	return {
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
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
	
};
window['type17_PATHFINDING_TNode'].prototype.clone = function() {
	var other = new type17_PATHFINDING_TNode();
	other.attr4_cost = this.attr4_cost;
	other.attr6_parent = this.attr6_parent;
	other.attr1_x = this.attr1_x;
	other.attr1_y = this.attr1_y;
	other.vtbl = this.vtbl;
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
	
};
window['type6_TObj3D'].prototype.clone = function() {
	var other = new type6_TObj3D();
	other.vtbl = this.vtbl;
	return other;
};
window['type6_TObj3D'].prototype.bridgeToJS = function(isJSON) {
	return {
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
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
	
};
window['type10_DataBuffer'].prototype.clone = function() {
	var other = new type10_DataBuffer();
	other.vtbl = this.vtbl;
	return other;
};
window['type10_DataBuffer'].prototype.bridgeToJS = function(isJSON) {
	return {
		"__vtbl": !isJSON ? this.vtbl : undefined
	};
};
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
var const11_VERSION_Str = "1", const11_XMLNAME_Str = "WIN32", const12_FUNC_IS_FUNC = 1, const11_FUNC_IS_SUB = 2, const14_FUNC_IS_METHOD = 3, const13_FUNC_IS_PROTO = 4, const13_VARI_IS_LOCAL = 1, const14_VARI_IS_GLOBAL = 2, const12_VARI_IS_ATTR = 3, const14_VARI_IS_STATIC = 4, const13_VARI_IS_PARAM = 5, const13_VARI_IS_CONST = 6, const13_VARI_IS_ALIAS = 7, const11_SCOPE_IS_IF = 1, const13_SCOPE_IS_FUNC = 2, const13_SCOPE_IS_LOOP = 3, const13_SCOPE_IS_MAIN = 4, const12_SCOPE_IS_TRY = 5, const15_SCOPE_IS_SELECT = 6, const12_EXPR_VERSION = 1, const11_OP_IS_UNAER = 1, const12_OP_IS_BINAER = 2, const10_OP_IS_BOOL = 3, const14_ERROR_IS_ERROR = 0, const16_ERROR_IS_WARNING = 1, const8_MAX_PASS = 6, const16_EXPR_IS_OPERATOR = 1, const13_EXPR_IS_SCOPE = 2, const11_EXPR_IS_INT = 3, const13_EXPR_IS_FLOAT = 4, const11_EXPR_IS_STR = 5, const16_EXPR_IS_FUNCCALL = 6, const13_EXPR_IS_EMPTY = 7, const13_EXPR_IS_DEBUG = 8, const12_EXPR_IS_VARI = 9, const14_EXPR_IS_ASSIGN = 10, const11_EXPR_IS_DIM = 11, const13_EXPR_IS_REDIM = 12, const13_EXPR_IS_ARRAY = 13, const16_EXPR_IS_CAST2INT = 15, const18_EXPR_IS_CAST2FLOAT = 16, const19_EXPR_IS_CAST2STRING = 17, const14_EXPR_IS_ACCESS = 18, const14_EXPR_IS_RETURN = 19, const12_EXPR_IS_GOTO = 20, const13_EXPR_IS_LABEL = 21, const16_EXPR_IS_FUNCDATA = 22, const17_EXPR_IS_PROTOCALL = 23, const10_EXPR_IS_IF = 24, const13_EXPR_IS_WHILE = 25, const14_EXPR_IS_REPEAT = 26, const11_EXPR_IS_FOR = 27, const13_EXPR_IS_BREAK = 29, const16_EXPR_IS_CONTINUE = 30, const11_EXPR_IS_TRY = 31, const13_EXPR_IS_THROW = 32, const15_EXPR_IS_RESTORE = 33, const12_EXPR_IS_READ = 34, const14_EXPR_IS_DEFVAL = 35, const17_EXPR_IS_DIMASEXPR = 36, const13_EXPR_IS_ALIAS = 37, const15_EXPR_IS_FOREACH = 38, const11_EXPR_IS_INC = 39, const15_EXPR_IS_DIMPUSH = 40, const11_EXPR_IS_LEN = 41, const15_EXPR_IS_DIMDATA = 42, const14_EXPR_IS_DELETE = 43, const14_EXPR_IS_DIMDEL = 44, const13_EXPR_IS_BOUND = 45, const11_EXPR_IS_NOT = 46, const13_EXPR_IS_DUMMY = 47, const17_EXPR_IS_ADDRESSOF = 48, const14_EXPR_IS_ASSERT = 49, const19_EXPR_IS_DEBUGOUTPUT = 50, const11_EXPR_IS_IIF = 51, const15_EXPR_IS_REQUIRE = 52, const13_EXPR_IS_SUPER = 53, const16_EXPR_IS_CAST2OBJ = 54, const6_BL_EXT = 1, const7_BL_FILE = 2, const19_GL_DEPTH_BUFFER_BIT = 256, const21_GL_STENCIL_BUFFER_BIT = 1024, const19_GL_COLOR_BUFFER_BIT = 16384, const8_GL_FALSE = 0, const7_GL_TRUE = 1, const9_GL_POINTS = 0, const8_GL_LINES = 1, const12_GL_LINE_LOOP = 2, const13_GL_LINE_STRIP = 3, const12_GL_TRIANGLES = 4, const17_GL_TRIANGLE_STRIP = 5, const15_GL_TRIANGLE_FAN = 6, const7_GL_ZERO = 0, const6_GL_ONE = 1, const12_GL_SRC_COLOR = 768, const22_GL_ONE_MINUS_SRC_COLOR = 769, const12_GL_SRC_ALPHA = 770, const22_GL_ONE_MINUS_SRC_ALPHA = 771, const12_GL_DST_ALPHA = 772, const22_GL_ONE_MINUS_DST_ALPHA = 773, const12_GL_DST_COLOR = 774, const22_GL_ONE_MINUS_DST_COLOR = 775, const21_GL_SRC_ALPHA_SATURATE = 776, const11_GL_FUNC_ADD = 32774, const17_GL_BLEND_EQUATION = 32777, const21_GL_BLEND_EQUATION_RGB = 32777, const23_GL_BLEND_EQUATION_ALPHA = 34877, const16_GL_FUNC_SUBTRACT = 32778, const24_GL_FUNC_REVERSE_SUBTRACT = 32779, const16_GL_BLEND_DST_RGB = 32968, const16_GL_BLEND_SRC_RGB = 32969, const18_GL_BLEND_DST_ALPHA = 32970, const18_GL_BLEND_SRC_ALPHA = 32971, const17_GL_CONSTANT_COLOR = 32769, const27_GL_ONE_MINUS_CONSTANT_COLOR = 32770, const17_GL_CONSTANT_ALPHA = 32771, const27_GL_ONE_MINUS_CONSTANT_ALPHA = 32772, const14_GL_BLEND_COLOR = 32773, const15_GL_ARRAY_BUFFER = 34962, const23_GL_ELEMENT_ARRAY_BUFFER = 34963, const23_GL_ARRAY_BUFFER_BINDING = 34964, const31_GL_ELEMENT_ARRAY_BUFFER_BINDING = 34965, const14_GL_STREAM_DRAW = 35040, const14_GL_STATIC_DRAW = 35044, const15_GL_DYNAMIC_DRAW = 35048, const14_GL_BUFFER_SIZE = 34660, const15_GL_BUFFER_USAGE = 34661, const24_GL_CURRENT_VERTEX_ATTRIB = 34342, const8_GL_FRONT = 1028, const7_GL_BACK = 1029, const17_GL_FRONT_AND_BACK = 1032, const13_GL_TEXTURE_2D = 3553, const12_GL_CULL_FACE = 2884, const8_GL_BLEND = 3042, const9_GL_DITHER = 3024, const15_GL_STENCIL_TEST = 2960, const13_GL_DEPTH_TEST = 2929, const15_GL_SCISSOR_TEST = 3089, const22_GL_POLYGON_OFFSET_FILL = 32823, const27_GL_SAMPLE_ALPHA_TO_COVERAGE = 32926, const18_GL_SAMPLE_COVERAGE = 32928, const11_GL_NO_ERROR = 0, const15_GL_INVALID_ENUM = 1280, const16_GL_INVALID_VALUE = 1281, const20_GL_INVALID_OPERATION = 1282, const16_GL_OUT_OF_MEMORY = 1285, const5_GL_CW = 2304, const6_GL_CCW = 2305, const13_GL_LINE_WIDTH = 2849, const27_GL_ALIASED_POINT_SIZE_RANGE = 33901, const27_GL_ALIASED_LINE_WIDTH_RANGE = 33902, const17_GL_CULL_FACE_MODE = 2885, const13_GL_FRONT_FACE = 2886, const14_GL_DEPTH_RANGE = 2928, const18_GL_DEPTH_WRITEMASK = 2930, const20_GL_DEPTH_CLEAR_VALUE = 2931, const13_GL_DEPTH_FUNC = 2932, const22_GL_STENCIL_CLEAR_VALUE = 2961, const15_GL_STENCIL_FUNC = 2962, const15_GL_STENCIL_FAIL = 2964, const26_GL_STENCIL_PASS_DEPTH_FAIL = 2965, const26_GL_STENCIL_PASS_DEPTH_PASS = 2966, const14_GL_STENCIL_REF = 2967, const21_GL_STENCIL_VALUE_MASK = 2963, const20_GL_STENCIL_WRITEMASK = 2968, const20_GL_STENCIL_BACK_FUNC = 34816, const20_GL_STENCIL_BACK_FAIL = 34817, const31_GL_STENCIL_BACK_PASS_DEPTH_FAIL = 34818, const31_GL_STENCIL_BACK_PASS_DEPTH_PASS = 34819, const19_GL_STENCIL_BACK_REF = 36003, const26_GL_STENCIL_BACK_VALUE_MASK = 36004, const25_GL_STENCIL_BACK_WRITEMASK = 36005, const11_GL_VIEWPORT = 2978, const14_GL_SCISSOR_BOX = 3088, const20_GL_COLOR_CLEAR_VALUE = 3106, const18_GL_COLOR_WRITEMASK = 3107, const19_GL_UNPACK_ALIGNMENT = 3317, const17_GL_PACK_ALIGNMENT = 3333, const19_GL_MAX_TEXTURE_SIZE = 3379, const20_GL_MAX_VIEWPORT_DIMS = 3386, const16_GL_SUBPIXEL_BITS = 3408, const11_GL_RED_BITS = 3410, const13_GL_GREEN_BITS = 3411, const12_GL_BLUE_BITS = 3412, const13_GL_ALPHA_BITS = 3413, const13_GL_DEPTH_BITS = 3414, const15_GL_STENCIL_BITS = 3415, const23_GL_POLYGON_OFFSET_UNITS = 10752, const24_GL_POLYGON_OFFSET_FACTOR = 32824, const21_GL_TEXTURE_BINDING_2D = 32873, const17_GL_SAMPLE_BUFFERS = 32936, const10_GL_SAMPLES = 32937, const24_GL_SAMPLE_COVERAGE_VALUE = 32938, const25_GL_SAMPLE_COVERAGE_INVERT = 32939, const33_GL_NUM_COMPRESSED_TEXTURE_FORMATS = 34466, const29_GL_COMPRESSED_TEXTURE_FORMATS = 34467, const12_GL_DONT_CARE = 4352, const10_GL_FASTEST = 4353, const9_GL_NICEST = 4354, const23_GL_GENERATE_MIPMAP_HINT = 33170, const7_GL_BYTE = 5120, const16_GL_UNSIGNED_BYTE = 5121, const8_GL_SHORT = 5122, const17_GL_UNSIGNED_SHORT = 5123, const6_GL_INT = 5124, const15_GL_UNSIGNED_INT = 5125, const8_GL_FLOAT = 5126, const8_GL_FIXED = 5132, const18_GL_DEPTH_COMPONENT = 6402, const8_GL_ALPHA = 6406, const6_GL_RGB = 6407, const7_GL_RGBA = 6408, const12_GL_LUMINANCE = 6409, const18_GL_LUMINANCE_ALPHA = 6410, const25_GL_UNSIGNED_SHORT_4_4_4_4 = 32819, const25_GL_UNSIGNED_SHORT_5_5_5_1 = 32820, const23_GL_UNSIGNED_SHORT_5_6_5 = 33635, const18_GL_FRAGMENT_SHADER = 35632, const16_GL_VERTEX_SHADER = 35633, const21_GL_MAX_VERTEX_ATTRIBS = 34921, const29_GL_MAX_VERTEX_UNIFORM_VECTORS = 36347, const22_GL_MAX_VARYING_VECTORS = 36348, const35_GL_MAX_COMBINED_TEXTURE_IMAGE_UNITS = 35661, const33_GL_MAX_VERTEX_TEXTURE_IMAGE_UNITS = 35660, const26_GL_MAX_TEXTURE_IMAGE_UNITS = 34930, const31_GL_MAX_FRAGMENT_UNIFORM_VECTORS = 36349, const14_GL_SHADER_TYPE = 35663, const16_GL_DELETE_STATUS = 35712, const14_GL_LINK_STATUS = 35714, const18_GL_VALIDATE_STATUS = 35715, const19_GL_ATTACHED_SHADERS = 35717, const18_GL_ACTIVE_UNIFORMS = 35718, const28_GL_ACTIVE_UNIFORM_MAX_LENGTH = 35719, const20_GL_ACTIVE_ATTRIBUTES = 35721, const30_GL_ACTIVE_ATTRIBUTE_MAX_LENGTH = 35722, const27_GL_SHADING_LANGUAGE_VERSION = 35724, const18_GL_CURRENT_PROGRAM = 35725, const8_GL_NEVER = 512, const7_GL_LESS = 513, const8_GL_EQUAL = 514, const9_GL_LEQUAL = 515, const10_GL_GREATER = 516, const11_GL_NOTEQUAL = 517, const9_GL_GEQUAL = 518, const9_GL_ALWAYS = 519, const7_GL_KEEP = 7680, const10_GL_REPLACE = 7681, const7_GL_INCR = 7682, const7_GL_DECR = 7683, const9_GL_INVERT = 5386, const12_GL_INCR_WRAP = 34055, const12_GL_DECR_WRAP = 34056, const9_GL_VENDOR = 7936, const11_GL_RENDERER = 7937, const10_GL_VERSION = 7938, const13_GL_EXTENSIONS = 7939, const10_GL_NEAREST = 9728, const9_GL_LINEAR = 9729, const25_GL_NEAREST_MIPMAP_NEAREST = 9984, const24_GL_LINEAR_MIPMAP_NEAREST = 9985, const24_GL_NEAREST_MIPMAP_LINEAR = 9986, const23_GL_LINEAR_MIPMAP_LINEAR = 9987, const21_GL_TEXTURE_MAG_FILTER = 10240, const21_GL_TEXTURE_MIN_FILTER = 10241, const17_GL_TEXTURE_WRAP_S = 10242, const17_GL_TEXTURE_WRAP_T = 10243, const10_GL_TEXTURE = 5890, const19_GL_TEXTURE_CUBE_MAP = 34067, const27_GL_TEXTURE_BINDING_CUBE_MAP = 34068, const30_GL_TEXTURE_CUBE_MAP_POSITIVE_X = 34069, const30_GL_TEXTURE_CUBE_MAP_NEGATIVE_X = 34070, const30_GL_TEXTURE_CUBE_MAP_POSITIVE_Y = 34071, const30_GL_TEXTURE_CUBE_MAP_NEGATIVE_Y = 34072, const30_GL_TEXTURE_CUBE_MAP_POSITIVE_Z = 34073, const30_GL_TEXTURE_CUBE_MAP_NEGATIVE_Z = 34074, const28_GL_MAX_CUBE_MAP_TEXTURE_SIZE = 34076, const11_GL_TEXTURE0 = 33984, const11_GL_TEXTURE1 = 33985, const11_GL_TEXTURE2 = 33986, const11_GL_TEXTURE3 = 33987, const11_GL_TEXTURE4 = 33988, const11_GL_TEXTURE5 = 33989, const11_GL_TEXTURE6 = 33990, const11_GL_TEXTURE7 = 33991, const11_GL_TEXTURE8 = 33992, const11_GL_TEXTURE9 = 33993, const12_GL_TEXTURE10 = 33994, const12_GL_TEXTURE11 = 33995, const12_GL_TEXTURE12 = 33996, const12_GL_TEXTURE13 = 33997, const12_GL_TEXTURE14 = 33998, const12_GL_TEXTURE15 = 33999, const12_GL_TEXTURE16 = 34000, const12_GL_TEXTURE17 = 34001, const12_GL_TEXTURE18 = 34002, const12_GL_TEXTURE19 = 34003, const12_GL_TEXTURE20 = 34004, const12_GL_TEXTURE21 = 34005, const12_GL_TEXTURE22 = 34006, const12_GL_TEXTURE23 = 34007, const12_GL_TEXTURE24 = 34008, const12_GL_TEXTURE25 = 34009, const12_GL_TEXTURE26 = 34010, const12_GL_TEXTURE27 = 34011, const12_GL_TEXTURE28 = 34012, const12_GL_TEXTURE29 = 34013, const12_GL_TEXTURE30 = 34014, const12_GL_TEXTURE31 = 34015, const17_GL_ACTIVE_TEXTURE = 34016, const9_GL_REPEAT = 10497, const16_GL_CLAMP_TO_EDGE = 33071, const18_GL_MIRRORED_REPEAT = 33648, const13_GL_FLOAT_VEC2 = 35664, const13_GL_FLOAT_VEC3 = 35665, const13_GL_FLOAT_VEC4 = 35666, const11_GL_INT_VEC2 = 35667, const11_GL_INT_VEC3 = 35668, const11_GL_INT_VEC4 = 35669, const7_GL_BOOL = 35670, const12_GL_BOOL_VEC2 = 35671, const12_GL_BOOL_VEC3 = 35672, const12_GL_BOOL_VEC4 = 35673, const13_GL_FLOAT_MAT2 = 35674, const13_GL_FLOAT_MAT3 = 35675, const13_GL_FLOAT_MAT4 = 35676, const13_GL_SAMPLER_2D = 35678, const15_GL_SAMPLER_CUBE = 35680, const30_GL_VERTEX_ATTRIB_ARRAY_ENABLED = 34338, const27_GL_VERTEX_ATTRIB_ARRAY_SIZE = 34339, const29_GL_VERTEX_ATTRIB_ARRAY_STRIDE = 34340, const27_GL_VERTEX_ATTRIB_ARRAY_TYPE = 34341, const33_GL_VERTEX_ATTRIB_ARRAY_NORMALIZED = 34922, const30_GL_VERTEX_ATTRIB_ARRAY_POINTER = 34373, const37_GL_VERTEX_ATTRIB_ARRAY_BUFFER_BINDING = 34975, const33_GL_IMPLEMENTATION_COLOR_READ_TYPE = 35738, const35_GL_IMPLEMENTATION_COLOR_READ_FORMAT = 35739, const17_GL_COMPILE_STATUS = 35713, const18_GL_INFO_LOG_LENGTH = 35716, const23_GL_SHADER_SOURCE_LENGTH = 35720, const18_GL_SHADER_COMPILER = 36346, const24_GL_SHADER_BINARY_FORMATS = 36344, const28_GL_NUM_SHADER_BINARY_FORMATS = 36345, const12_GL_LOW_FLOAT = 36336, const15_GL_MEDIUM_FLOAT = 36337, const13_GL_HIGH_FLOAT = 36338, const10_GL_LOW_INT = 36339, const13_GL_MEDIUM_INT = 36340, const11_GL_HIGH_INT = 36341, const14_GL_FRAMEBUFFER = 36160, const15_GL_RENDERBUFFER = 36161, const8_GL_RGBA4 = 32854, const10_GL_RGB5_A1 = 32855, const9_GL_RGB565 = 36194, const20_GL_DEPTH_COMPONENT16 = 33189, const16_GL_STENCIL_INDEX = 6401, const17_GL_STENCIL_INDEX8 = 36168, const21_GL_RENDERBUFFER_WIDTH = 36162, const22_GL_RENDERBUFFER_HEIGHT = 36163, const31_GL_RENDERBUFFER_INTERNAL_FORMAT = 36164, const24_GL_RENDERBUFFER_RED_SIZE = 36176, const26_GL_RENDERBUFFER_GREEN_SIZE = 36177, const25_GL_RENDERBUFFER_BLUE_SIZE = 36178, const26_GL_RENDERBUFFER_ALPHA_SIZE = 36179, const26_GL_RENDERBUFFER_DEPTH_SIZE = 36180, const28_GL_RENDERBUFFER_STENCIL_SIZE = 36181, const37_GL_FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE = 36048, const37_GL_FRAMEBUFFER_ATTACHMENT_OBJECT_NAME = 36049, const39_GL_FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL = 36050, const47_GL_FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE = 36051, const20_GL_COLOR_ATTACHMENT0 = 36064, const19_GL_DEPTH_ATTACHMENT = 36096, const21_GL_STENCIL_ATTACHMENT = 36128, const7_GL_NONE = 0, const23_GL_FRAMEBUFFER_COMPLETE = 36053, const36_GL_FRAMEBUFFER_INCOMPLETE_ATTACHMENT = 36054, const44_GL_FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT = 36055, const36_GL_FRAMEBUFFER_INCOMPLETE_DIMENSIONS = 36057, const26_GL_FRAMEBUFFER_UNSUPPORTED = 36061, const22_GL_FRAMEBUFFER_BINDING = 36006, const23_GL_RENDERBUFFER_BINDING = 36007, const24_GL_MAX_RENDERBUFFER_SIZE = 34024, const32_GL_INVALID_FRAMEBUFFER_OPERATION = 1286, global10_LastExprID = 0.0, global5_Exprs_ref = [new OTTArray()], global8_LastType = new type15_TIdentifierType(), global12_voidDatatype = new type9_TDatatype(), global11_intDatatype = new type9_TDatatype(), global13_floatDatatype = new type9_TDatatype(), global11_strDatatype = new type9_TDatatype(), global9_Operators_ref = [new OTTArray()], global10_KeywordMap = new type7_HashMap(), global12_Keywords_Str = new OTTArray(), global8_Compiler = new type9_TCompiler(), global7_Defines = new OTTArray(), global10_LastDefine = new type7_TDefine(), global10_Generators = new OTTArray(), global13_SettingIn_Str = "", global11_SHLASHF_Str = "", MaxPasses = 0, global14_Documentations = new OTTArray(), global9_GFX_WIDTH = 0.0, global10_GFX_HEIGHT = 0.0, global10_FULLSCREEN = 0, global9_FRAMERATE = 0, global11_APPNAME_Str = "", global9_DEBUGMODE = 0, global7_CONSOLE = 0.0, global6_STRICT = 0.0, global15_USRDEF_VERS_Str = "", global14_GbapOutput_Str = "", global12_GbapPath_Str = "", global12_GbapName_Str = "", global6_Ignore = 0, global13_OptimizeLevel = 0, global12_CurrentScope = 0, global14_ForEachCounter = 0, global11_CurrentFunc = 0, global12_LabelDef_Str = "", global8_IsInGoto = 0, global11_LoopBreakID = 0, global14_LoopContinueID = 0, global11_LastDummyID = 0, global14_StaticText_Str = "", global13_VariUndef_Str = "", global16_CurrentUndef_Str = "", global6_Indent = 0, global9_Templates = new OTTArray(), global9_Libraries = new OTTArray(), global10_Blacklists = new OTTArray(), global7_Actions = new OTTArray(), global8_Mode_Str = "", global10_Target_Str = "", global13_SettingIn_Str = "", global9_Templates = new OTTArray(), global8_Lang_Str = "", global22_DirectoryStructure_Str = "", global5_NoRun = 0, global10_SaveHeader = 0, global24_PATHFINDING_AFP_mapmax_x = 0.0, global24_PATHFINDING_AFP_mapmax_y = 0.0, global20_PATHFINDING_AFP_dirx = new OTTArray(), global20_PATHFINDING_AFP_diry = new OTTArray(), global8_AFP_dirz = new OTTArray(), global13_AFP_heuristic = new OTTArray(), global6_Objs3D = new OTTArray();
// set default statics:
window['initStatics'] = function() {
	static12_Factor_DIMASEXPRErr = 0;
static12_Keyword_SelectHelper = 0.0;

}
initStatics = window['initStatics'];
for (var __init = 0; __init < preInitFuncs.length; __init++) preInitFuncs[__init]();
