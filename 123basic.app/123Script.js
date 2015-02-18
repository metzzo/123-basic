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
			try { // this should NOT be done with exception handling... VERY slow
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
var static12_Keyword_SelectHelper, static7_Keyword_GOTOErr;
var __debugInfo = "";
var debugMode = true;
window['main'] = function(){
	stackPush("main", __debugInfo);
	try {
		var local1_G_1790 = pool_TGenerator.alloc();
		__debugInfo = "35:\123basic.gbas";
		DIM(global10_Generators, [0], pool_TGenerator.alloc());
		__debugInfo = "38:\123basic.gbas";
		local1_G_1790.attr8_Name_Str = "JS";
		__debugInfo = "39:\123basic.gbas";
		local1_G_1790.attr8_genProto = func16_JS_Generator_Str;
		__debugInfo = "40:\123basic.gbas";
		DIMPUSH(global10_Generators, local1_G_1790);
		__debugInfo = "63:\123basic.gbas";
		global12_GbapPath_Str = "./";
		__debugInfo = "163:\123basic.gbas";
		global7_CONSOLE = 0;
		__debugInfo = "48:\src\Compiler.gbas";
		global10_LastExprID = 0;
		__debugInfo = "362:\src\Compiler.gbas";
		global13_SettingIn_Str = "";
		__debugInfo = "362:\src\Compiler.gbas";
		global13_SettingIn_Str = "";
		__debugInfo = "624:\src\Compiler.gbas";
		MaxPasses = 6;
		__debugInfo = "6:\src\Utils\GBAPReader.gbas";
		global9_GFX_WIDTH = 640;
		__debugInfo = "7:\src\Utils\GBAPReader.gbas";
		global10_GFX_HEIGHT = 480;
		__debugInfo = "8:\src\Utils\GBAPReader.gbas";
		global10_FULLSCREEN = 0;
		__debugInfo = "9:\src\Utils\GBAPReader.gbas";
		global9_FRAMERATE = 60;
		__debugInfo = "11:\src\Utils\GBAPReader.gbas";
		global11_APPNAME_Str = "123basic Program";
		__debugInfo = "12:\src\Utils\GBAPReader.gbas";
		global9_DEBUGMODE = 1;
		__debugInfo = "13:\src\Utils\GBAPReader.gbas";
		global7_CONSOLE = 1;
		__debugInfo = "14:\src\Utils\GBAPReader.gbas";
		global6_STRICT = 1;
		__debugInfo = "15:\src\Utils\GBAPReader.gbas";
		global15_USRDEF_VERS_Str = "0.00001";
		__debugInfo = "39:\src\Utils\GBAPReader.gbas";
		global6_Ignore = 0;
		__debugInfo = "11:\src\CompilerPasses\Generator\JSGenerator.gbas";
		global13_OptimizeLevel = 1;
		__debugInfo = "13:\src\CompilerPasses\Generator\JSGenerator.gbas";
		global12_CurrentScope = -(1);
		__debugInfo = "15:\src\CompilerPasses\Generator\JSGenerator.gbas";
		global11_CurrentFunc = -(1);
		__debugInfo = "17:\src\CompilerPasses\Generator\JSGenerator.gbas";
		global8_IsInGoto = 0;
		__debugInfo = "18:\src\CompilerPasses\Generator\JSGenerator.gbas";
		global11_LoopBreakID = 0;
		__debugInfo = "19:\src\CompilerPasses\Generator\JSGenerator.gbas";
		global14_LoopContinueID = 0;
		__debugInfo = "21:\src\CompilerPasses\Generator\JSGenerator.gbas";
		global14_StaticText_Str = "";
		__debugInfo = "22:\src\CompilerPasses\Generator\JSGenerator.gbas";
		global13_VariUndef_Str = "";
		__debugInfo = "31:\src\Target.gbas";
		global10_Target_Str = "";
		__debugInfo = "34:\src\Target.gbas";
		global8_Lang_Str = "";
		__debugInfo = "36:\src\Target.gbas";
		global5_NoRun = 0;
		__debugInfo = "37:\src\Target.gbas";
		global10_SaveHeader = 0;
		__debugInfo = "35:\123basic.gbas";pool_TGenerator.free(local1_G_1790);
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
}
main = window['main'];
window['GetIdentifierByPart'] = function(param8_Text_Str) {
	stackPush("function: GetIdentifierByPart_Str", __debugInfo);
	try {
		var local10_Result_Str_1792 = "", local11_tmpCompiler_1793 = pool_TCompiler.alloc();
		__debugInfo = "174:\123basic.gbas";
		local10_Result_Str_1792 = "";
		__debugInfo = "177:\123basic.gbas";
		local11_tmpCompiler_1793 = global8_Compiler.clone(/* In Assign */);
		__debugInfo = "179:\123basic.gbas";
		global8_Compiler.attr8_Code_Str = ((param8_Text_Str) + ("\n"));
		__debugInfo = "181:\123basic.gbas";
		func5_Lexer();
		__debugInfo = "183:\123basic.gbas";
		func8_Analyser();
		__debugInfo = "185:\123basic.gbas";
		global8_Compiler.attr8_GetIdent = 1;
		__debugInfo = "187:\123basic.gbas";
		func6_Parser();
		__debugInfo = "189:\123basic.gbas";
		global8_Compiler = local11_tmpCompiler_1793.clone(/* In Assign */);
		__debugInfo = "191:\123basic.gbas";
		return tryClone(local10_Result_Str_1792);
		__debugInfo = "192:\123basic.gbas";
		return "";
		__debugInfo = "174:\123basic.gbas";pool_TCompiler.free(local11_tmpCompiler_1793);
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
GetIdentifierByPart = window['GetIdentifierByPart'];
window['func8_Analyser'] = function() {
	stackPush("function: Analyser", __debugInfo);
	try {
		var local6_CurTyp_1799 = 0;
		__debugInfo = "11:\src\CompilerPasses\Analyser.gbas";
		func5_Start();
		__debugInfo = "64:\src\CompilerPasses\Analyser.gbas";
		while (func8_EOFParse()) {
			__debugInfo = "61:\src\CompilerPasses\Analyser.gbas";
			{
				var Err_Str = "";
				__debugInfo = "63:\src\CompilerPasses\Analyser.gbas";
				try {
					__debugInfo = "15:\src\CompilerPasses\Analyser.gbas";
					{
						var local16___SelectHelper1__1794 = "";
						__debugInfo = "15:\src\CompilerPasses\Analyser.gbas";
						local16___SelectHelper1__1794 = func14_GetCurrent_Str();
						__debugInfo = "59:\src\CompilerPasses\Analyser.gbas";
						if ((((local16___SelectHelper1__1794) === ("TYPE")) ? 1 : 0)) {
							var local3_typ_ref_1795 = [pool_TIdentifierType.alloc()];
							__debugInfo = "17:\src\CompilerPasses\Analyser.gbas";
							func5_Match("TYPE", 16, "src\CompilerPasses\Analyser.gbas");
							__debugInfo = "19:\src\CompilerPasses\Analyser.gbas";
							local3_typ_ref_1795[0].attr8_Name_Str = func14_GetCurrent_Str();
							__debugInfo = "20:\src\CompilerPasses\Analyser.gbas";
							local3_typ_ref_1795[0].attr12_RealName_Str = local3_typ_ref_1795[0].attr8_Name_Str;
							__debugInfo = "21:\src\CompilerPasses\Analyser.gbas";
							local3_typ_ref_1795[0].attr2_ID = BOUNDS(global8_Compiler.attr5_Types_ref[0], 0);
							__debugInfo = "22:\src\CompilerPasses\Analyser.gbas";
							DIMPUSH(global8_Compiler.attr5_Types_ref[0], local3_typ_ref_1795);
							__debugInfo = "24:\src\CompilerPasses\Analyser.gbas";
							func7_GetNext();
							__debugInfo = "17:\src\CompilerPasses\Analyser.gbas";pool_TIdentifierType.free(local3_typ_ref_1795);
						} else if ((((local16___SelectHelper1__1794) === ("PROTOTYPE")) ? 1 : 0)) {
							var local4_func_1796 = pool_TIdentifierFunc.alloc();
							__debugInfo = "26:\src\CompilerPasses\Analyser.gbas";
							func5_Match("PROTOTYPE", 25, "src\CompilerPasses\Analyser.gbas");
							__debugInfo = "28:\src\CompilerPasses\Analyser.gbas";
							local4_func_1796.attr8_Name_Str = func14_GetCurrent_Str();
							__debugInfo = "29:\src\CompilerPasses\Analyser.gbas";
							local4_func_1796.attr3_Typ = ~~(4);
							__debugInfo = "30:\src\CompilerPasses\Analyser.gbas";
							func11_AddFunction(local4_func_1796);
							__debugInfo = "32:\src\CompilerPasses\Analyser.gbas";
							func7_GetNext();
							__debugInfo = "26:\src\CompilerPasses\Analyser.gbas";pool_TIdentifierFunc.free(local4_func_1796);
						} else if ((((local16___SelectHelper1__1794) === ("CONSTANT")) ? 1 : 0)) {
							__debugInfo = "55:\src\CompilerPasses\Analyser.gbas";
							do {
								var local4_Vari_1797 = pool_TIdentifierVari.alloc();
								__debugInfo = "48:\src\CompilerPasses\Analyser.gbas";
								if (func7_IsToken("CONSTANT")) {
									__debugInfo = "45:\src\CompilerPasses\Analyser.gbas";
									func5_Match("CONSTANT", 44, "src\CompilerPasses\Analyser.gbas");
									__debugInfo = "45:\src\CompilerPasses\Analyser.gbas";
								} else {
									__debugInfo = "47:\src\CompilerPasses\Analyser.gbas";
									func5_Match(",", 46, "src\CompilerPasses\Analyser.gbas");
									__debugInfo = "47:\src\CompilerPasses\Analyser.gbas";
								};
								__debugInfo = "51:\src\CompilerPasses\Analyser.gbas";
								local4_Vari_1797 = func7_VariDef(0).clone(/* In Assign */);
								__debugInfo = "52:\src\CompilerPasses\Analyser.gbas";
								local4_Vari_1797.attr3_Typ = ~~(6);
								__debugInfo = "53:\src\CompilerPasses\Analyser.gbas";
								func11_AddVariable(local4_Vari_1797, 0);
								__debugInfo = "54:\src\CompilerPasses\Analyser.gbas";
								DIMPUSH(global8_Compiler.attr7_Globals, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
								__debugInfo = "48:\src\CompilerPasses\Analyser.gbas";pool_TIdentifierVari.free(local4_Vari_1797);
							} while (!((((func7_IsToken(",")) === (0)) ? 1 : 0)));
							__debugInfo = "55:\src\CompilerPasses\Analyser.gbas";
						};
						__debugInfo = "15:\src\CompilerPasses\Analyser.gbas";
					};
					__debugInfo = "60:\src\CompilerPasses\Analyser.gbas";
					func7_GetNext();
					__debugInfo = "15:\src\CompilerPasses\Analyser.gbas";
				} catch (Err_Str) {
					if (Err_Str instanceof OTTException) Err_Str = Err_Str.getText(); else throwError(Err_Str);{
						__debugInfo = "62:\src\CompilerPasses\Analyser.gbas";
						func8_FixError();
						__debugInfo = "62:\src\CompilerPasses\Analyser.gbas";
					}
				};
				__debugInfo = "63:\src\CompilerPasses\Analyser.gbas";
			};
			__debugInfo = "61:\src\CompilerPasses\Analyser.gbas";
		};
		__debugInfo = "66:\src\CompilerPasses\Analyser.gbas";
		local6_CurTyp_1799 = -(1);
		__debugInfo = "67:\src\CompilerPasses\Analyser.gbas";
		func5_Start();
		__debugInfo = "148:\src\CompilerPasses\Analyser.gbas";
		while (func8_EOFParse()) {
			__debugInfo = "145:\src\CompilerPasses\Analyser.gbas";
			{
				var Err_Str = "";
				__debugInfo = "147:\src\CompilerPasses\Analyser.gbas";
				try {
					var local10_IsCallback_1800 = 0, local8_IsNative_1801 = 0, local10_IsAbstract_1802 = 0;
					__debugInfo = "70:\src\CompilerPasses\Analyser.gbas";
					local10_IsCallback_1800 = 0;
					__debugInfo = "70:\src\CompilerPasses\Analyser.gbas";
					local8_IsNative_1801 = 0;
					__debugInfo = "71:\src\CompilerPasses\Analyser.gbas";
					local10_IsAbstract_1802 = 0;
					__debugInfo = "76:\src\CompilerPasses\Analyser.gbas";
					if (func7_IsToken("CALLBACK")) {
						__debugInfo = "73:\src\CompilerPasses\Analyser.gbas";
						func5_Match("CALLBACK", 72, "src\CompilerPasses\Analyser.gbas");
						__debugInfo = "74:\src\CompilerPasses\Analyser.gbas";
						local10_IsCallback_1800 = 1;
						__debugInfo = "75:\src\CompilerPasses\Analyser.gbas";
						if ((((func7_IsToken("FUNCTION")) === (0)) ? 1 : 0)) {
							__debugInfo = "75:\src\CompilerPasses\Analyser.gbas";
							func5_Match("FUNCTION", 74, "src\CompilerPasses\Analyser.gbas");
							__debugInfo = "75:\src\CompilerPasses\Analyser.gbas";
						};
						__debugInfo = "73:\src\CompilerPasses\Analyser.gbas";
					};
					__debugInfo = "81:\src\CompilerPasses\Analyser.gbas";
					if (func7_IsToken("NATIVE")) {
						__debugInfo = "78:\src\CompilerPasses\Analyser.gbas";
						func5_Match("NATIVE", 77, "src\CompilerPasses\Analyser.gbas");
						__debugInfo = "79:\src\CompilerPasses\Analyser.gbas";
						local8_IsNative_1801 = 1;
						__debugInfo = "80:\src\CompilerPasses\Analyser.gbas";
						if ((((func7_IsToken("FUNCTION")) === (0)) ? 1 : 0)) {
							__debugInfo = "80:\src\CompilerPasses\Analyser.gbas";
							func5_Match("FUNCTION", 79, "src\CompilerPasses\Analyser.gbas");
							__debugInfo = "80:\src\CompilerPasses\Analyser.gbas";
						};
						__debugInfo = "78:\src\CompilerPasses\Analyser.gbas";
					};
					__debugInfo = "86:\src\CompilerPasses\Analyser.gbas";
					if (func7_IsToken("ABSTRACT")) {
						__debugInfo = "83:\src\CompilerPasses\Analyser.gbas";
						func5_Match("ABSTRACT", 82, "src\CompilerPasses\Analyser.gbas");
						__debugInfo = "84:\src\CompilerPasses\Analyser.gbas";
						local10_IsAbstract_1802 = 1;
						__debugInfo = "85:\src\CompilerPasses\Analyser.gbas";
						if ((((func7_IsToken("FUNCTION")) === (0)) ? 1 : 0)) {
							__debugInfo = "85:\src\CompilerPasses\Analyser.gbas";
							func5_Match("FUNCTION", 84, "src\CompilerPasses\Analyser.gbas");
							__debugInfo = "85:\src\CompilerPasses\Analyser.gbas";
						};
						__debugInfo = "83:\src\CompilerPasses\Analyser.gbas";
					};
					__debugInfo = "88:\src\CompilerPasses\Analyser.gbas";
					{
						var local16___SelectHelper2__1803 = "";
						__debugInfo = "88:\src\CompilerPasses\Analyser.gbas";
						local16___SelectHelper2__1803 = func14_GetCurrent_Str();
						__debugInfo = "141:\src\CompilerPasses\Analyser.gbas";
						if ((((local16___SelectHelper2__1803) === ("PROTOTYPE")) ? 1 : 0)) {
							var local3_var_1804 = pool_TIdentifierVari.alloc(), local5_Found_1805 = 0;
							__debugInfo = "90:\src\CompilerPasses\Analyser.gbas";
							func5_Match("PROTOTYPE", 89, "src\CompilerPasses\Analyser.gbas");
							__debugInfo = "92:\src\CompilerPasses\Analyser.gbas";
							local3_var_1804 = func7_VariDef(0).clone(/* In Assign */);
							__debugInfo = "93:\src\CompilerPasses\Analyser.gbas";
							local5_Found_1805 = 0;
							__debugInfo = "100:\src\CompilerPasses\Analyser.gbas";
							var forEachSaver2417 = global8_Compiler.attr5_Funcs_ref[0];
							for(var forEachCounter2417 = 0 ; forEachCounter2417 < forEachSaver2417.values.length ; forEachCounter2417++) {
								var local4_func_ref_1806 = forEachSaver2417.values[forEachCounter2417];
							{
									__debugInfo = "99:\src\CompilerPasses\Analyser.gbas";
									if ((((local4_func_ref_1806[0].attr8_Name_Str) === (local3_var_1804.attr8_Name_Str)) ? 1 : 0)) {
										__debugInfo = "96:\src\CompilerPasses\Analyser.gbas";
										local4_func_ref_1806[0].attr8_datatype = local3_var_1804.attr8_datatype.clone(/* In Assign */);
										__debugInfo = "97:\src\CompilerPasses\Analyser.gbas";
										local5_Found_1805 = 1;
										__debugInfo = "98:\src\CompilerPasses\Analyser.gbas";
										break;
										__debugInfo = "96:\src\CompilerPasses\Analyser.gbas";
									};
									__debugInfo = "99:\src\CompilerPasses\Analyser.gbas";
								}
								forEachSaver2417.values[forEachCounter2417] = local4_func_ref_1806;
							
							};
							__debugInfo = "101:\src\CompilerPasses\Analyser.gbas";
							if ((((local5_Found_1805) === (0)) ? 1 : 0)) {
								__debugInfo = "101:\src\CompilerPasses\Analyser.gbas";
								func5_Error((("Internal error (prototype not found: ") + (local3_var_1804.attr8_Name_Str)), 100, "src\CompilerPasses\Analyser.gbas");
								__debugInfo = "101:\src\CompilerPasses\Analyser.gbas";
							};
							__debugInfo = "102:\src\CompilerPasses\Analyser.gbas";
							if ((((local6_CurTyp_1799) !== (-(1))) ? 1 : 0)) {
								__debugInfo = "102:\src\CompilerPasses\Analyser.gbas";
								func5_Error("PROTOTYPE definition not in Type allowed.", 101, "src\CompilerPasses\Analyser.gbas");
								__debugInfo = "102:\src\CompilerPasses\Analyser.gbas";
							};
							__debugInfo = "90:\src\CompilerPasses\Analyser.gbas";pool_TIdentifierVari.free(local3_var_1804);
						} else if ((((local16___SelectHelper2__1803) === ("FUNCTION")) ? 1 : 0)) {
							var local3_var_1807 = pool_TIdentifierVari.alloc(), local4_func_1808 = pool_TIdentifierFunc.alloc();
							__debugInfo = "104:\src\CompilerPasses\Analyser.gbas";
							func5_Match("FUNCTION", 103, "src\CompilerPasses\Analyser.gbas");
							__debugInfo = "106:\src\CompilerPasses\Analyser.gbas";
							local3_var_1807 = func7_VariDef(0).clone(/* In Assign */);
							__debugInfo = "109:\src\CompilerPasses\Analyser.gbas";
							local4_func_1808.attr8_Name_Str = local3_var_1807.attr8_Name_Str;
							__debugInfo = "110:\src\CompilerPasses\Analyser.gbas";
							local4_func_1808.attr8_datatype = local3_var_1807.attr8_datatype.clone(/* In Assign */);
							__debugInfo = "111:\src\CompilerPasses\Analyser.gbas";
							local4_func_1808.attr10_IsCallback = local10_IsCallback_1800;
							__debugInfo = "112:\src\CompilerPasses\Analyser.gbas";
							local4_func_1808.attr10_IsAbstract = local10_IsAbstract_1802;
							__debugInfo = "113:\src\CompilerPasses\Analyser.gbas";
							local4_func_1808.attr6_DefTok = global8_Compiler.attr11_currentPosi;
							__debugInfo = "121:\src\CompilerPasses\Analyser.gbas";
							if ((((local6_CurTyp_1799) !== (-(1))) ? 1 : 0)) {
								__debugInfo = "116:\src\CompilerPasses\Analyser.gbas";
								local4_func_1808.attr3_Typ = ~~(3);
								__debugInfo = "117:\src\CompilerPasses\Analyser.gbas";
								DIMPUSH(global8_Compiler.attr5_Types_ref[0].arrAccess(local6_CurTyp_1799).values[tmpPositionCache][0].attr7_Methods, BOUNDS(global8_Compiler.attr5_Funcs_ref[0], 0));
								__debugInfo = "118:\src\CompilerPasses\Analyser.gbas";
								local4_func_1808.attr6_MyType = local6_CurTyp_1799;
								__debugInfo = "116:\src\CompilerPasses\Analyser.gbas";
							} else {
								__debugInfo = "120:\src\CompilerPasses\Analyser.gbas";
								local4_func_1808.attr3_Typ = ~~(1);
								__debugInfo = "120:\src\CompilerPasses\Analyser.gbas";
							};
							__debugInfo = "123:\src\CompilerPasses\Analyser.gbas";
							func11_AddFunction(local4_func_1808);
							__debugInfo = "125:\src\CompilerPasses\Analyser.gbas";
							if (((((((local8_IsNative_1801) === (0)) ? 1 : 0)) && ((((local10_IsAbstract_1802) === (0)) ? 1 : 0))) ? 1 : 0)) {
								__debugInfo = "125:\src\CompilerPasses\Analyser.gbas";
								func10_SkipTokens("FUNCTION", "ENDFUNCTION", local4_func_1808.attr8_Name_Str);
								__debugInfo = "125:\src\CompilerPasses\Analyser.gbas";
							};
							__debugInfo = "104:\src\CompilerPasses\Analyser.gbas";pool_TIdentifierVari.free(local3_var_1807);pool_TIdentifierFunc.free(local4_func_1808);
						} else if ((((local16___SelectHelper2__1803) === ("SUB")) ? 1 : 0)) {
							var local4_func_1809 = pool_TIdentifierFunc.alloc();
							__debugInfo = "127:\src\CompilerPasses\Analyser.gbas";
							func5_Match("SUB", 126, "src\CompilerPasses\Analyser.gbas");
							__debugInfo = "129:\src\CompilerPasses\Analyser.gbas";
							local4_func_1809.attr8_Name_Str = func14_GetCurrent_Str();
							__debugInfo = "130:\src\CompilerPasses\Analyser.gbas";
							local4_func_1809.attr8_datatype = global12_voidDatatype.clone(/* In Assign */);
							__debugInfo = "131:\src\CompilerPasses\Analyser.gbas";
							local4_func_1809.attr3_Typ = ~~(2);
							__debugInfo = "132:\src\CompilerPasses\Analyser.gbas";
							local4_func_1809.attr6_DefTok = global8_Compiler.attr11_currentPosi;
							__debugInfo = "133:\src\CompilerPasses\Analyser.gbas";
							func11_AddFunction(local4_func_1809);
							__debugInfo = "134:\src\CompilerPasses\Analyser.gbas";
							func10_SkipTokens("SUB", "ENDSUB", local4_func_1809.attr8_Name_Str);
							__debugInfo = "127:\src\CompilerPasses\Analyser.gbas";pool_TIdentifierFunc.free(local4_func_1809);
						} else if ((((local16___SelectHelper2__1803) === ("TYPE")) ? 1 : 0)) {
							__debugInfo = "136:\src\CompilerPasses\Analyser.gbas";
							func5_Match("TYPE", 135, "src\CompilerPasses\Analyser.gbas");
							__debugInfo = "137:\src\CompilerPasses\Analyser.gbas";
							if ((((func6_IsType("")) === (0)) ? 1 : 0)) {
								__debugInfo = "137:\src\CompilerPasses\Analyser.gbas";
								func5_Error((((("Internal error (unrecognized type: ") + (func14_GetCurrent_Str()))) + (")")), 136, "src\CompilerPasses\Analyser.gbas");
								__debugInfo = "137:\src\CompilerPasses\Analyser.gbas";
							};
							__debugInfo = "138:\src\CompilerPasses\Analyser.gbas";
							local6_CurTyp_1799 = global8_LastType.attr2_ID;
							__debugInfo = "136:\src\CompilerPasses\Analyser.gbas";
						} else if ((((local16___SelectHelper2__1803) === ("ENDTYPE")) ? 1 : 0)) {
							__debugInfo = "140:\src\CompilerPasses\Analyser.gbas";
							local6_CurTyp_1799 = -(1);
							__debugInfo = "140:\src\CompilerPasses\Analyser.gbas";
						};
						__debugInfo = "88:\src\CompilerPasses\Analyser.gbas";
					};
					__debugInfo = "144:\src\CompilerPasses\Analyser.gbas";
					func7_GetNext();
					__debugInfo = "70:\src\CompilerPasses\Analyser.gbas";
				} catch (Err_Str) {
					if (Err_Str instanceof OTTException) Err_Str = Err_Str.getText(); else throwError(Err_Str);{
						__debugInfo = "146:\src\CompilerPasses\Analyser.gbas";
						func8_FixError();
						__debugInfo = "146:\src\CompilerPasses\Analyser.gbas";
					}
				};
				__debugInfo = "147:\src\CompilerPasses\Analyser.gbas";
			};
			__debugInfo = "145:\src\CompilerPasses\Analyser.gbas";
		};
		__debugInfo = "150:\src\CompilerPasses\Analyser.gbas";
		if ((((local6_CurTyp_1799) !== (-(1))) ? 1 : 0)) {
			__debugInfo = "150:\src\CompilerPasses\Analyser.gbas";
			func5_Error((((("Type '") + (global8_Compiler.attr5_Types_ref[0].arrAccess(local6_CurTyp_1799).values[tmpPositionCache][0].attr8_Name_Str))) + (" not closed with 'ENDTYPE'")), 149, "src\CompilerPasses\Analyser.gbas");
			__debugInfo = "150:\src\CompilerPasses\Analyser.gbas";
		};
		__debugInfo = "151:\src\CompilerPasses\Analyser.gbas";
		local6_CurTyp_1799 = -(1);
		__debugInfo = "168:\src\CompilerPasses\Analyser.gbas";
		var forEachSaver2714 = global8_Compiler.attr5_Funcs_ref[0];
		for(var forEachCounter2714 = 0 ; forEachCounter2714 < forEachSaver2714.values.length ; forEachCounter2714++) {
			var local1_F_ref_1811 = forEachSaver2714.values[forEachCounter2714];
		{
				__debugInfo = "167:\src\CompilerPasses\Analyser.gbas";
				if (local1_F_ref_1811[0].attr10_IsCallback) {
					var local12_alreadyExist_1812 = 0;
					__debugInfo = "156:\src\CompilerPasses\Analyser.gbas";
					local12_alreadyExist_1812 = 0;
					__debugInfo = "162:\src\CompilerPasses\Analyser.gbas";
					var forEachSaver2699 = global8_Compiler.attr5_Funcs_ref[0];
					for(var forEachCounter2699 = 0 ; forEachCounter2699 < forEachSaver2699.values.length ; forEachCounter2699++) {
						var local2_F2_ref_1813 = forEachSaver2699.values[forEachCounter2699];
					{
							__debugInfo = "161:\src\CompilerPasses\Analyser.gbas";
							if (((((((local2_F2_ref_1813[0].attr8_Name_Str) === (local1_F_ref_1811[0].attr8_Name_Str)) ? 1 : 0)) && ((((local2_F2_ref_1813[0].attr10_IsCallback) === (0)) ? 1 : 0))) ? 1 : 0)) {
								__debugInfo = "159:\src\CompilerPasses\Analyser.gbas";
								local12_alreadyExist_1812 = 1;
								__debugInfo = "160:\src\CompilerPasses\Analyser.gbas";
								break;
								__debugInfo = "159:\src\CompilerPasses\Analyser.gbas";
							};
							__debugInfo = "161:\src\CompilerPasses\Analyser.gbas";
						}
						forEachSaver2699.values[forEachCounter2699] = local2_F2_ref_1813;
					
					};
					__debugInfo = "166:\src\CompilerPasses\Analyser.gbas";
					if (local12_alreadyExist_1812) {
						__debugInfo = "165:\src\CompilerPasses\Analyser.gbas";
						local1_F_ref_1811[0].attr8_Name_Str = (("Overwritten Callback method (screw them!): ") + (local1_F_ref_1811[0].attr8_Name_Str));
						__debugInfo = "165:\src\CompilerPasses\Analyser.gbas";
					};
					__debugInfo = "156:\src\CompilerPasses\Analyser.gbas";
				};
				__debugInfo = "167:\src\CompilerPasses\Analyser.gbas";
			}
			forEachSaver2714.values[forEachCounter2714] = local1_F_ref_1811;
		
		};
		__debugInfo = "175:\src\CompilerPasses\Analyser.gbas";
		var forEachSaver2753 = global8_Compiler.attr5_Funcs_ref[0];
		for(var forEachCounter2753 = 0 ; forEachCounter2753 < forEachSaver2753.values.length ; forEachCounter2753++) {
			var local1_F_ref_1814 = forEachSaver2753.values[forEachCounter2753];
		{
				__debugInfo = "174:\src\CompilerPasses\Analyser.gbas";
				if ((((((((((local1_F_ref_1814[0].attr3_Typ) !== (3)) ? 1 : 0)) && ((((local1_F_ref_1814[0].attr3_Typ) !== (2)) ? 1 : 0))) ? 1 : 0)) && (((local1_F_ref_1814[0].attr10_IsCallback) ? 0 : 1))) ? 1 : 0)) {
					__debugInfo = "173:\src\CompilerPasses\Analyser.gbas";
					(global8_Compiler.attr11_GlobalFuncs).Put(local1_F_ref_1814[0].attr8_Name_Str, local1_F_ref_1814[0].attr2_ID);
					__debugInfo = "173:\src\CompilerPasses\Analyser.gbas";
				};
				__debugInfo = "174:\src\CompilerPasses\Analyser.gbas";
			}
			forEachSaver2753.values[forEachCounter2753] = local1_F_ref_1814;
		
		};
		__debugInfo = "188:\src\CompilerPasses\Analyser.gbas";
		func5_Start();
		__debugInfo = "212:\src\CompilerPasses\Analyser.gbas";
		while (func8_EOFParse()) {
			__debugInfo = "209:\src\CompilerPasses\Analyser.gbas";
			{
				var Err_Str = "";
				__debugInfo = "211:\src\CompilerPasses\Analyser.gbas";
				try {
					__debugInfo = "192:\src\CompilerPasses\Analyser.gbas";
					{
						var local16___SelectHelper3__1815 = "";
						__debugInfo = "192:\src\CompilerPasses\Analyser.gbas";
						local16___SelectHelper3__1815 = func14_GetCurrent_Str();
						__debugInfo = "206:\src\CompilerPasses\Analyser.gbas";
						if ((((local16___SelectHelper3__1815) === ("GLOBAL")) ? 1 : 0)) {
							__debugInfo = "205:\src\CompilerPasses\Analyser.gbas";
							do {
								var local4_Vari_1816 = pool_TIdentifierVari.alloc();
								__debugInfo = "199:\src\CompilerPasses\Analyser.gbas";
								if (func7_IsToken("GLOBAL")) {
									__debugInfo = "196:\src\CompilerPasses\Analyser.gbas";
									func5_Match("GLOBAL", 195, "src\CompilerPasses\Analyser.gbas");
									__debugInfo = "196:\src\CompilerPasses\Analyser.gbas";
								} else {
									__debugInfo = "198:\src\CompilerPasses\Analyser.gbas";
									func5_Match(",", 197, "src\CompilerPasses\Analyser.gbas");
									__debugInfo = "198:\src\CompilerPasses\Analyser.gbas";
								};
								__debugInfo = "201:\src\CompilerPasses\Analyser.gbas";
								local4_Vari_1816 = func7_VariDef(0).clone(/* In Assign */);
								__debugInfo = "202:\src\CompilerPasses\Analyser.gbas";
								local4_Vari_1816.attr3_Typ = ~~(2);
								__debugInfo = "203:\src\CompilerPasses\Analyser.gbas";
								func11_AddVariable(local4_Vari_1816, 1);
								__debugInfo = "204:\src\CompilerPasses\Analyser.gbas";
								DIMPUSH(global8_Compiler.attr7_Globals, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
								__debugInfo = "199:\src\CompilerPasses\Analyser.gbas";pool_TIdentifierVari.free(local4_Vari_1816);
							} while (!((((func7_IsToken(",")) === (0)) ? 1 : 0)));
							__debugInfo = "205:\src\CompilerPasses\Analyser.gbas";
						};
						__debugInfo = "192:\src\CompilerPasses\Analyser.gbas";
					};
					__debugInfo = "208:\src\CompilerPasses\Analyser.gbas";
					func7_GetNext();
					__debugInfo = "192:\src\CompilerPasses\Analyser.gbas";
				} catch (Err_Str) {
					if (Err_Str instanceof OTTException) Err_Str = Err_Str.getText(); else throwError(Err_Str);{
						__debugInfo = "210:\src\CompilerPasses\Analyser.gbas";
						func8_FixError();
						__debugInfo = "210:\src\CompilerPasses\Analyser.gbas";
					}
				};
				__debugInfo = "211:\src\CompilerPasses\Analyser.gbas";
			};
			__debugInfo = "209:\src\CompilerPasses\Analyser.gbas";
		};
		__debugInfo = "215:\src\CompilerPasses\Analyser.gbas";
		func5_Start();
		__debugInfo = "227:\src\CompilerPasses\Analyser.gbas";
		while (func8_EOFParse()) {
			__debugInfo = "224:\src\CompilerPasses\Analyser.gbas";
			{
				var Err_Str = "";
				__debugInfo = "226:\src\CompilerPasses\Analyser.gbas";
				try {
					__debugInfo = "218:\src\CompilerPasses\Analyser.gbas";
					{
						var local16___SelectHelper4__1818 = "";
						__debugInfo = "218:\src\CompilerPasses\Analyser.gbas";
						local16___SelectHelper4__1818 = func14_GetCurrent_Str();
						__debugInfo = "221:\src\CompilerPasses\Analyser.gbas";
						if ((((local16___SelectHelper4__1818) === ("TYPE")) ? 1 : 0)) {
							__debugInfo = "220:\src\CompilerPasses\Analyser.gbas";
							func8_TypeDefi();
							__debugInfo = "220:\src\CompilerPasses\Analyser.gbas";
						};
						__debugInfo = "218:\src\CompilerPasses\Analyser.gbas";
					};
					__debugInfo = "223:\src\CompilerPasses\Analyser.gbas";
					func7_GetNext();
					__debugInfo = "218:\src\CompilerPasses\Analyser.gbas";
				} catch (Err_Str) {
					if (Err_Str instanceof OTTException) Err_Str = Err_Str.getText(); else throwError(Err_Str);{
						__debugInfo = "225:\src\CompilerPasses\Analyser.gbas";
						func8_FixError();
						__debugInfo = "225:\src\CompilerPasses\Analyser.gbas";
					}
				};
				__debugInfo = "226:\src\CompilerPasses\Analyser.gbas";
			};
			__debugInfo = "224:\src\CompilerPasses\Analyser.gbas";
		};
		__debugInfo = "228:\src\CompilerPasses\Analyser.gbas";
		local6_CurTyp_1799 = -(1);
		__debugInfo = "233:\src\CompilerPasses\Analyser.gbas";
		var forEachSaver2854 = global8_Compiler.attr5_Types_ref[0];
		for(var forEachCounter2854 = 0 ; forEachCounter2854 < forEachSaver2854.values.length ; forEachCounter2854++) {
			var local3_typ_ref_1820 = forEachSaver2854.values[forEachCounter2854];
		{
				__debugInfo = "232:\src\CompilerPasses\Analyser.gbas";
				func10_ExtendType(unref(local3_typ_ref_1820[0]));
				__debugInfo = "232:\src\CompilerPasses\Analyser.gbas";
			}
			forEachSaver2854.values[forEachCounter2854] = local3_typ_ref_1820;
		
		};
		__debugInfo = "238:\src\CompilerPasses\Analyser.gbas";
		var forEachSaver2867 = global8_Compiler.attr5_Types_ref[0];
		for(var forEachCounter2867 = 0 ; forEachCounter2867 < forEachSaver2867.values.length ; forEachCounter2867++) {
			var local3_typ_ref_1821 = forEachSaver2867.values[forEachCounter2867];
		{
				__debugInfo = "237:\src\CompilerPasses\Analyser.gbas";
				func11_CheckCyclic(local3_typ_ref_1821[0].attr8_Name_Str, unref(local3_typ_ref_1821[0]));
				__debugInfo = "237:\src\CompilerPasses\Analyser.gbas";
			}
			forEachSaver2867.values[forEachCounter2867] = local3_typ_ref_1821;
		
		};
		__debugInfo = "240:\src\CompilerPasses\Analyser.gbas";
		func5_Start();
		__debugInfo = "316:\src\CompilerPasses\Analyser.gbas";
		while (func8_EOFParse()) {
			__debugInfo = "313:\src\CompilerPasses\Analyser.gbas";
			{
				var Err_Str = "";
				__debugInfo = "315:\src\CompilerPasses\Analyser.gbas";
				try {
					var local8_isNative_1822 = 0, local10_isCallBack_1823 = 0;
					__debugInfo = "244:\src\CompilerPasses\Analyser.gbas";
					local8_isNative_1822 = 0;
					__debugInfo = "245:\src\CompilerPasses\Analyser.gbas";
					local10_isCallBack_1823 = 0;
					__debugInfo = "246:\src\CompilerPasses\Analyser.gbas";
					{
						var local16___SelectHelper5__1824 = "";
						__debugInfo = "246:\src\CompilerPasses\Analyser.gbas";
						local16___SelectHelper5__1824 = func14_GetCurrent_Str();
						__debugInfo = "255:\src\CompilerPasses\Analyser.gbas";
						if ((((local16___SelectHelper5__1824) === ("NATIVE")) ? 1 : 0)) {
							__debugInfo = "248:\src\CompilerPasses\Analyser.gbas";
							local8_isNative_1822 = 1;
							__debugInfo = "249:\src\CompilerPasses\Analyser.gbas";
							func7_GetNext();
							__debugInfo = "248:\src\CompilerPasses\Analyser.gbas";
						} else if ((((local16___SelectHelper5__1824) === ("CALLBACK")) ? 1 : 0)) {
							__debugInfo = "251:\src\CompilerPasses\Analyser.gbas";
							local10_isCallBack_1823 = 1;
							__debugInfo = "252:\src\CompilerPasses\Analyser.gbas";
							func7_GetNext();
							__debugInfo = "251:\src\CompilerPasses\Analyser.gbas";
						} else if ((((local16___SelectHelper5__1824) === ("ABSTRACT")) ? 1 : 0)) {
							__debugInfo = "254:\src\CompilerPasses\Analyser.gbas";
							func7_GetNext();
							__debugInfo = "254:\src\CompilerPasses\Analyser.gbas";
						};
						__debugInfo = "246:\src\CompilerPasses\Analyser.gbas";
					};
					__debugInfo = "257:\src\CompilerPasses\Analyser.gbas";
					{
						var local16___SelectHelper6__1825 = "";
						__debugInfo = "257:\src\CompilerPasses\Analyser.gbas";
						local16___SelectHelper6__1825 = func14_GetCurrent_Str();
						__debugInfo = "310:\src\CompilerPasses\Analyser.gbas";
						if ((((local16___SelectHelper6__1825) === ("FUNCTION")) ? 1 : 0)) {
							var local3_Typ_1826 = 0.0;
							__debugInfo = "264:\src\CompilerPasses\Analyser.gbas";
							if ((((local6_CurTyp_1799) === (-(1))) ? 1 : 0)) {
								__debugInfo = "261:\src\CompilerPasses\Analyser.gbas";
								local3_Typ_1826 = 1;
								__debugInfo = "261:\src\CompilerPasses\Analyser.gbas";
							} else {
								__debugInfo = "263:\src\CompilerPasses\Analyser.gbas";
								local3_Typ_1826 = 3;
								__debugInfo = "263:\src\CompilerPasses\Analyser.gbas";
							};
							__debugInfo = "265:\src\CompilerPasses\Analyser.gbas";
							func7_FuncDef(local8_isNative_1822, local10_isCallBack_1823, ~~(local3_Typ_1826), local6_CurTyp_1799);
							__debugInfo = "264:\src\CompilerPasses\Analyser.gbas";
						} else if ((((local16___SelectHelper6__1825) === ("PROTOTYPE")) ? 1 : 0)) {
							__debugInfo = "267:\src\CompilerPasses\Analyser.gbas";
							func7_FuncDef(0, 0, ~~(4), -(1));
							__debugInfo = "267:\src\CompilerPasses\Analyser.gbas";
						} else if ((((local16___SelectHelper6__1825) === ("SUB")) ? 1 : 0)) {
							__debugInfo = "269:\src\CompilerPasses\Analyser.gbas";
							func6_SubDef();
							__debugInfo = "269:\src\CompilerPasses\Analyser.gbas";
						} else if ((((local16___SelectHelper6__1825) === ("TYPE")) ? 1 : 0)) {
							__debugInfo = "271:\src\CompilerPasses\Analyser.gbas";
							func5_Match("TYPE", 270, "src\CompilerPasses\Analyser.gbas");
							__debugInfo = "272:\src\CompilerPasses\Analyser.gbas";
							if ((((func6_IsType("")) === (0)) ? 1 : 0)) {
								__debugInfo = "272:\src\CompilerPasses\Analyser.gbas";
								func5_Error((((("Internal error (unrecognized type: ") + (func14_GetCurrent_Str()))) + (")")), 271, "src\CompilerPasses\Analyser.gbas");
								__debugInfo = "272:\src\CompilerPasses\Analyser.gbas";
							};
							__debugInfo = "273:\src\CompilerPasses\Analyser.gbas";
							local6_CurTyp_1799 = global8_LastType.attr2_ID;
							__debugInfo = "271:\src\CompilerPasses\Analyser.gbas";
						} else if ((((local16___SelectHelper6__1825) === ("ENDTYPE")) ? 1 : 0)) {
							__debugInfo = "275:\src\CompilerPasses\Analyser.gbas";
							local6_CurTyp_1799 = -(1);
							__debugInfo = "275:\src\CompilerPasses\Analyser.gbas";
						} else if ((((local16___SelectHelper6__1825) === ("STARTDATA")) ? 1 : 0)) {
							var local8_Name_Str_1827 = "", local5_Datas_1828 = pool_array.alloc(0), local5_dataB_1832 = pool_TDataBlock.alloc();
							__debugInfo = "277:\src\CompilerPasses\Analyser.gbas";
							func5_Match("STARTDATA", 276, "src\CompilerPasses\Analyser.gbas");
							__debugInfo = "278:\src\CompilerPasses\Analyser.gbas";
							local8_Name_Str_1827 = func14_GetCurrent_Str();
							__debugInfo = "279:\src\CompilerPasses\Analyser.gbas";
							if ((((func14_IsValidVarName()) === (0)) ? 1 : 0)) {
								__debugInfo = "279:\src\CompilerPasses\Analyser.gbas";
								func5_Error("Invalid DATA name", 278, "src\CompilerPasses\Analyser.gbas");
								__debugInfo = "279:\src\CompilerPasses\Analyser.gbas";
							};
							__debugInfo = "280:\src\CompilerPasses\Analyser.gbas";
							func5_Match(local8_Name_Str_1827, 279, "src\CompilerPasses\Analyser.gbas");
							__debugInfo = "281:\src\CompilerPasses\Analyser.gbas";
							func5_Match(":", 280, "src\CompilerPasses\Analyser.gbas");
							__debugInfo = "282:\src\CompilerPasses\Analyser.gbas";
							func5_Match("\n", 281, "src\CompilerPasses\Analyser.gbas");
							__debugInfo = "302:\src\CompilerPasses\Analyser.gbas";
							while (func7_IsToken("DATA")) {
								var local4_Done_1829 = 0;
								__debugInfo = "285:\src\CompilerPasses\Analyser.gbas";
								func5_Match("DATA", 284, "src\CompilerPasses\Analyser.gbas");
								__debugInfo = "286:\src\CompilerPasses\Analyser.gbas";
								local4_Done_1829 = 0;
								__debugInfo = "300:\src\CompilerPasses\Analyser.gbas";
								while ((((func7_IsToken("\n")) === (0)) ? 1 : 0)) {
									var local1_e_1830 = 0.0, local7_tmpData_1831 = pool_TDatatype.alloc();
									__debugInfo = "288:\src\CompilerPasses\Analyser.gbas";
									if ((((local4_Done_1829) === (1)) ? 1 : 0)) {
										__debugInfo = "288:\src\CompilerPasses\Analyser.gbas";
										func5_Match(",", 287, "src\CompilerPasses\Analyser.gbas");
										__debugInfo = "288:\src\CompilerPasses\Analyser.gbas";
									};
									__debugInfo = "289:\src\CompilerPasses\Analyser.gbas";
									local1_e_1830 = func10_Expression(0);
									__debugInfo = "291:\src\CompilerPasses\Analyser.gbas";
									local7_tmpData_1831 = global5_Exprs_ref[0].arrAccess(~~(local1_e_1830)).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
									__debugInfo = "292:\src\CompilerPasses\Analyser.gbas";
									local7_tmpData_1831.attr7_IsArray = 0;
									__debugInfo = "293:\src\CompilerPasses\Analyser.gbas";
									func14_EnsureDatatype(~~(local1_e_1830), local7_tmpData_1831, 0, 0);
									__debugInfo = "297:\src\CompilerPasses\Analyser.gbas";
									if ((((((((((global5_Exprs_ref[0].arrAccess(~~(local1_e_1830)).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("int")) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(~~(local1_e_1830)).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("float")) ? 1 : 0))) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(~~(local1_e_1830)).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("string")) ? 1 : 0))) ? 1 : 0)) {
										
									} else {
										__debugInfo = "296:\src\CompilerPasses\Analyser.gbas";
										func5_Error((((("Must be primitive datatype (int, float or string), got '") + (global5_Exprs_ref[0].arrAccess(~~(local1_e_1830)).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) + ("'")), 295, "src\CompilerPasses\Analyser.gbas");
										__debugInfo = "296:\src\CompilerPasses\Analyser.gbas";
									};
									__debugInfo = "298:\src\CompilerPasses\Analyser.gbas";
									DIMPUSH(local5_Datas_1828, ~~(local1_e_1830));
									__debugInfo = "299:\src\CompilerPasses\Analyser.gbas";
									local4_Done_1829 = 1;
									__debugInfo = "288:\src\CompilerPasses\Analyser.gbas";pool_TDatatype.free(local7_tmpData_1831);
								};
								__debugInfo = "301:\src\CompilerPasses\Analyser.gbas";
								func5_Match("\n", 300, "src\CompilerPasses\Analyser.gbas");
								__debugInfo = "285:\src\CompilerPasses\Analyser.gbas";
							};
							__debugInfo = "303:\src\CompilerPasses\Analyser.gbas";
							func5_Match("ENDDATA", 302, "src\CompilerPasses\Analyser.gbas");
							__debugInfo = "305:\src\CompilerPasses\Analyser.gbas";
							local5_dataB_1832.attr8_Name_Str = local8_Name_Str_1827;
							__debugInfo = "306:\src\CompilerPasses\Analyser.gbas";
							local5_dataB_1832.attr5_Datas = local5_Datas_1828.clone(/* In Assign */);
							__debugInfo = "309:\src\CompilerPasses\Analyser.gbas";
							DIMPUSH(global8_Compiler.attr10_DataBlocks, local5_dataB_1832);
							__debugInfo = "277:\src\CompilerPasses\Analyser.gbas";pool_array.free(local5_Datas_1828);pool_TDataBlock.free(local5_dataB_1832);
						};
						__debugInfo = "257:\src\CompilerPasses\Analyser.gbas";
					};
					__debugInfo = "312:\src\CompilerPasses\Analyser.gbas";
					func7_GetNext();
					__debugInfo = "244:\src\CompilerPasses\Analyser.gbas";
				} catch (Err_Str) {
					if (Err_Str instanceof OTTException) Err_Str = Err_Str.getText(); else throwError(Err_Str);{
						__debugInfo = "314:\src\CompilerPasses\Analyser.gbas";
						func8_FixError();
						__debugInfo = "314:\src\CompilerPasses\Analyser.gbas";
					}
				};
				__debugInfo = "315:\src\CompilerPasses\Analyser.gbas";
			};
			__debugInfo = "313:\src\CompilerPasses\Analyser.gbas";
		};
		__debugInfo = "317:\src\CompilerPasses\Analyser.gbas";
		return 0;
		__debugInfo = "11:\src\CompilerPasses\Analyser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func8_Analyser = window['func8_Analyser'];
window['func11_CheckCyclic'] = function(param8_Name_Str, param3_typ) {
	stackPush("function: CheckCyclic", __debugInfo);
	try {
		__debugInfo = "330:\src\CompilerPasses\Analyser.gbas";
		var forEachSaver3221 = param3_typ.attr10_Attributes;
		for(var forEachCounter3221 = 0 ; forEachCounter3221 < forEachSaver3221.values.length ; forEachCounter3221++) {
			var local1_t_1836 = forEachSaver3221.values[forEachCounter3221];
		{
				__debugInfo = "329:\src\CompilerPasses\Analyser.gbas";
				if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_t_1836).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === (param8_Name_Str)) ? 1 : 0)) {
					__debugInfo = "323:\src\CompilerPasses\Analyser.gbas";
					func5_Error((((((((("Cyclic reference '") + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_t_1836).values[tmpPositionCache][0].attr8_Name_Str))) + ("' to type '"))) + (param8_Name_Str))) + ("'")), 322, "src\CompilerPasses\Analyser.gbas");
					__debugInfo = "323:\src\CompilerPasses\Analyser.gbas";
				} else if (func6_IsType(global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_t_1836).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str)) {
					__debugInfo = "326:\src\CompilerPasses\Analyser.gbas";
					func11_CheckCyclic(param8_Name_Str, global8_LastType);
					__debugInfo = "326:\src\CompilerPasses\Analyser.gbas";
				} else {
					
				};
				__debugInfo = "329:\src\CompilerPasses\Analyser.gbas";
			}
			forEachSaver3221.values[forEachCounter3221] = local1_t_1836;
		
		};
		__debugInfo = "331:\src\CompilerPasses\Analyser.gbas";
		return 0;
		__debugInfo = "330:\src\CompilerPasses\Analyser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func11_CheckCyclic = window['func11_CheckCyclic'];
window['func10_ExtendType'] = function(param3_typ) {
	stackPush("function: ExtendType", __debugInfo);
	try {
		__debugInfo = "415:\src\CompilerPasses\Analyser.gbas";
		if ((((param3_typ.attr9_Extending) !== (-(1))) ? 1 : 0)) {
			var alias6_ExtTyp_ref_1838 = [pool_TIdentifierType.alloc()], local6_tmpTyp_1839 = 0, local9_Abstracts_1840 = pool_array.alloc(0);
			__debugInfo = "336:\src\CompilerPasses\Analyser.gbas";
			func10_ExtendType(unref(global8_Compiler.attr5_Types_ref[0].arrAccess(param3_typ.attr9_Extending).values[tmpPositionCache][0]));
			__debugInfo = "339:\src\CompilerPasses\Analyser.gbas";
			alias6_ExtTyp_ref_1838 = global8_Compiler.attr5_Types_ref[0].arrAccess(param3_typ.attr9_Extending).values[tmpPositionCache] /* ALIAS */;
			__debugInfo = "366:\src\CompilerPasses\Analyser.gbas";
			local6_tmpTyp_1839 = alias6_ExtTyp_ref_1838[0].attr2_ID;
			__debugInfo = "376:\src\CompilerPasses\Analyser.gbas";
			while ((((local6_tmpTyp_1839) !== (-(1))) ? 1 : 0)) {
				__debugInfo = "373:\src\CompilerPasses\Analyser.gbas";
				var forEachSaver3289 = global8_Compiler.attr5_Types_ref[0].arrAccess(local6_tmpTyp_1839).values[tmpPositionCache][0].attr7_Methods;
				for(var forEachCounter3289 = 0 ; forEachCounter3289 < forEachSaver3289.values.length ; forEachCounter3289++) {
					var local1_M_1841 = forEachSaver3289.values[forEachCounter3289];
				{
						__debugInfo = "372:\src\CompilerPasses\Analyser.gbas";
						if (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local1_M_1841).values[tmpPositionCache][0].attr10_IsAbstract) {
							__debugInfo = "371:\src\CompilerPasses\Analyser.gbas";
							DIMPUSH(local9_Abstracts_1840, local1_M_1841);
							__debugInfo = "371:\src\CompilerPasses\Analyser.gbas";
						};
						__debugInfo = "372:\src\CompilerPasses\Analyser.gbas";
					}
					forEachSaver3289.values[forEachCounter3289] = local1_M_1841;
				
				};
				__debugInfo = "375:\src\CompilerPasses\Analyser.gbas";
				local6_tmpTyp_1839 = global8_Compiler.attr5_Types_ref[0].arrAccess(local6_tmpTyp_1839).values[tmpPositionCache][0].attr9_Extending;
				__debugInfo = "373:\src\CompilerPasses\Analyser.gbas";
			};
			__debugInfo = "397:\src\CompilerPasses\Analyser.gbas";
			var forEachSaver3393 = local9_Abstracts_1840;
			for(var forEachCounter3393 = 0 ; forEachCounter3393 < forEachSaver3393.values.length ; forEachCounter3393++) {
				var local2_Ab_1842 = forEachSaver3393.values[forEachCounter3393];
			{
					var local5_Found_1843 = 0;
					__debugInfo = "381:\src\CompilerPasses\Analyser.gbas";
					local5_Found_1843 = 0;
					__debugInfo = "382:\src\CompilerPasses\Analyser.gbas";
					local6_tmpTyp_1839 = alias6_ExtTyp_ref_1838[0].attr2_ID;
					__debugInfo = "392:\src\CompilerPasses\Analyser.gbas";
					while ((((local6_tmpTyp_1839) !== (-(1))) ? 1 : 0)) {
						__debugInfo = "389:\src\CompilerPasses\Analyser.gbas";
						var forEachSaver3366 = global8_Compiler.attr5_Types_ref[0].arrAccess(local6_tmpTyp_1839).values[tmpPositionCache][0].attr7_Methods;
						for(var forEachCounter3366 = 0 ; forEachCounter3366 < forEachSaver3366.values.length ; forEachCounter3366++) {
							var local1_M_1844 = forEachSaver3366.values[forEachCounter3366];
						{
								__debugInfo = "388:\src\CompilerPasses\Analyser.gbas";
								if (((((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local1_M_1844).values[tmpPositionCache][0].attr8_Name_Str) === (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local2_Ab_1842).values[tmpPositionCache][0].attr8_Name_Str)) ? 1 : 0)) && (((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local1_M_1844).values[tmpPositionCache][0].attr10_IsAbstract) ? 0 : 1))) ? 1 : 0)) {
									__debugInfo = "386:\src\CompilerPasses\Analyser.gbas";
									local5_Found_1843 = 1;
									__debugInfo = "387:\src\CompilerPasses\Analyser.gbas";
									break;
									__debugInfo = "386:\src\CompilerPasses\Analyser.gbas";
								};
								__debugInfo = "388:\src\CompilerPasses\Analyser.gbas";
							}
							forEachSaver3366.values[forEachCounter3366] = local1_M_1844;
						
						};
						__debugInfo = "390:\src\CompilerPasses\Analyser.gbas";
						if (local5_Found_1843) {
							__debugInfo = "390:\src\CompilerPasses\Analyser.gbas";
							break;
							__debugInfo = "390:\src\CompilerPasses\Analyser.gbas";
						};
						__debugInfo = "391:\src\CompilerPasses\Analyser.gbas";
						local6_tmpTyp_1839 = global8_Compiler.attr5_Types_ref[0].arrAccess(local6_tmpTyp_1839).values[tmpPositionCache][0].attr9_Extending;
						__debugInfo = "389:\src\CompilerPasses\Analyser.gbas";
					};
					__debugInfo = "396:\src\CompilerPasses\Analyser.gbas";
					if (((local5_Found_1843) ? 0 : 1)) {
						__debugInfo = "394:\src\CompilerPasses\Analyser.gbas";
						alias6_ExtTyp_ref_1838[0].attr10_Createable = 0;
						__debugInfo = "394:\src\CompilerPasses\Analyser.gbas";
					};
					__debugInfo = "381:\src\CompilerPasses\Analyser.gbas";
				}
				forEachSaver3393.values[forEachCounter3393] = local2_Ab_1842;
			
			};
			__debugInfo = "414:\src\CompilerPasses\Analyser.gbas";
			var forEachSaver3451 = alias6_ExtTyp_ref_1838[0].attr10_Attributes;
			for(var forEachCounter3451 = 0 ; forEachCounter3451 < forEachSaver3451.values.length ; forEachCounter3451++) {
				var local1_A_1845 = forEachSaver3451.values[forEachCounter3451];
			{
					var alias3_Att_ref_1846 = [pool_TIdentifierVari.alloc()], local6_Exists_1847 = 0;
					__debugInfo = "401:\src\CompilerPasses\Analyser.gbas";
					alias3_Att_ref_1846 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_A_1845).values[tmpPositionCache] /* ALIAS */;
					__debugInfo = "402:\src\CompilerPasses\Analyser.gbas";
					local6_Exists_1847 = 0;
					__debugInfo = "409:\src\CompilerPasses\Analyser.gbas";
					var forEachSaver3439 = param3_typ.attr10_Attributes;
					for(var forEachCounter3439 = 0 ; forEachCounter3439 < forEachSaver3439.values.length ; forEachCounter3439++) {
						var local2_A2_1848 = forEachSaver3439.values[forEachCounter3439];
					{
							var alias4_Att2_ref_1849 = [pool_TIdentifierVari.alloc()];
							__debugInfo = "404:\src\CompilerPasses\Analyser.gbas";
							alias4_Att2_ref_1849 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local2_A2_1848).values[tmpPositionCache] /* ALIAS */;
							__debugInfo = "408:\src\CompilerPasses\Analyser.gbas";
							if ((((alias3_Att_ref_1846[0].attr8_Name_Str) === (alias4_Att2_ref_1849[0].attr8_Name_Str)) ? 1 : 0)) {
								__debugInfo = "406:\src\CompilerPasses\Analyser.gbas";
								local6_Exists_1847 = 1;
								__debugInfo = "407:\src\CompilerPasses\Analyser.gbas";
								break;
								__debugInfo = "406:\src\CompilerPasses\Analyser.gbas";
							};
							__debugInfo = "404:\src\CompilerPasses\Analyser.gbas";pool_TIdentifierVari.free(alias4_Att2_ref_1849);
						}
						forEachSaver3439.values[forEachCounter3439] = local2_A2_1848;
					
					};
					__debugInfo = "413:\src\CompilerPasses\Analyser.gbas";
					if (((local6_Exists_1847) ? 0 : 1)) {
						__debugInfo = "412:\src\CompilerPasses\Analyser.gbas";
						DIMPUSH(param3_typ.attr10_Attributes, local1_A_1845);
						__debugInfo = "412:\src\CompilerPasses\Analyser.gbas";
					};
					__debugInfo = "401:\src\CompilerPasses\Analyser.gbas";pool_TIdentifierVari.free(alias3_Att_ref_1846);
				}
				forEachSaver3451.values[forEachCounter3451] = local1_A_1845;
			
			};
			__debugInfo = "336:\src\CompilerPasses\Analyser.gbas";pool_array.free(local9_Abstracts_1840);
		};
		__debugInfo = "416:\src\CompilerPasses\Analyser.gbas";
		return 0;
		__debugInfo = "415:\src\CompilerPasses\Analyser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func10_ExtendType = window['func10_ExtendType'];
window['func12_LoadFile_Str'] = function(param8_Path_Str) {
	stackPush("function: LoadFile_Str", __debugInfo);
	try {
		var local8_Text_Str_2571 = "", local4_File_2572 = 0;
		__debugInfo = "371:\src\Compiler.gbas";
		local4_File_2572 = GENFILE();
		__debugInfo = "381:\src\Compiler.gbas";
		if (OPENFILE(local4_File_2572, param8_Path_Str, 1)) {
			__debugInfo = "377:\src\Compiler.gbas";
			while ((((ENDOFFILE(local4_File_2572)) === (0)) ? 1 : 0)) {
				var local8_Line_Str_ref_2573 = [""];
				__debugInfo = "375:\src\Compiler.gbas";
				READLINE(local4_File_2572, local8_Line_Str_ref_2573);
				__debugInfo = "376:\src\Compiler.gbas";
				local8_Text_Str_2571 = ((((local8_Text_Str_2571) + (local8_Line_Str_ref_2573[0]))) + ("\n"));
				__debugInfo = "375:\src\Compiler.gbas";
			};
			__debugInfo = "378:\src\Compiler.gbas";
			CLOSEFILE(local4_File_2572);
			__debugInfo = "377:\src\Compiler.gbas";
		} else {
			__debugInfo = "380:\src\Compiler.gbas";
			func5_Error((("Cannot find file: ") + (param8_Path_Str)), 379, "src\Compiler.gbas");
			__debugInfo = "380:\src\Compiler.gbas";
		};
		__debugInfo = "383:\src\Compiler.gbas";
		return tryClone(local8_Text_Str_2571);
		__debugInfo = "384:\src\Compiler.gbas";
		return "";
		__debugInfo = "371:\src\Compiler.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func12_LoadFile_Str = window['func12_LoadFile_Str'];
window['func5_Error'] = function(param7_Msg_Str, param4_Line, param8_File_Str) {
	stackPush("function: Error", __debugInfo);
	try {
		var local3_tok_1853 = pool_TToken.alloc();
		__debugInfo = "388:\src\Compiler.gbas";
		local3_tok_1853 = func15_GetCurrentToken().clone(/* In Assign */);
		__debugInfo = "390:\src\Compiler.gbas";
		param7_Msg_Str = (((((("Error: '") + (REPLACE_Str(param7_Msg_Str, "\n", "NEWLINE")))) + (global8_Compiler.attr14_errorState_Str))) + ("'\n"));
		__debugInfo = "391:\src\Compiler.gbas";
		param7_Msg_Str = ((((((((((((((param7_Msg_Str) + ("in line '"))) + (CAST2STRING(local3_tok_1853.attr4_Line)))) + ("' at character '"))) + (CAST2STRING(local3_tok_1853.attr9_Character)))) + ("' near '"))) + (REPLACE_Str(local3_tok_1853.attr8_Text_Str, "\n", "NEWLINE")))) + ("'\n"));
		__debugInfo = "392:\src\Compiler.gbas";
		param7_Msg_Str = ((((((param7_Msg_Str) + ("in file '"))) + (local3_tok_1853.attr8_Path_Str))) + ("'\n"));
		__debugInfo = "398:\src\Compiler.gbas";
		param7_Msg_Str = ((((((param7_Msg_Str) + ("\t '"))) + (local3_tok_1853.attr15_LineContent_Str))) + ("'\n"));
		__debugInfo = "399:\src\Compiler.gbas";
		param7_Msg_Str = ((param7_Msg_Str) + ("-----------------------------------\n"));
		__debugInfo = "399:\src\Compiler.gbas";
		param7_Msg_Str = (("\n-----------------------------------\n") + (param7_Msg_Str));
		__debugInfo = "401:\src\Compiler.gbas";
		STDERR(param7_Msg_Str);
		__debugInfo = "402:\src\Compiler.gbas";
		global8_Compiler.attr8_WasError = 1;
		__debugInfo = "406:\src\Compiler.gbas";
		END();
		__debugInfo = "408:\src\Compiler.gbas";
		throw new OTTException((((("syntaxerror '") + (param7_Msg_Str))) + ("'")), "\src\Compiler.gbas", 408);
		__debugInfo = "409:\src\Compiler.gbas";
		return 0;
		__debugInfo = "388:\src\Compiler.gbas";pool_TToken.free(local3_tok_1853);
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func5_Error = window['func5_Error'];
window['func7_Warning'] = function(param7_Msg_Str) {
	stackPush("function: Warning", __debugInfo);
	try {
		var local3_tok_2575 = pool_TToken.alloc();
		__debugInfo = "413:\src\Compiler.gbas";
		local3_tok_2575 = func15_GetCurrentToken().clone(/* In Assign */);
		__debugInfo = "415:\src\Compiler.gbas";
		param7_Msg_Str = (((("Warning: '") + (REPLACE_Str(param7_Msg_Str, "\n", "NEWLINE")))) + ("'\n"));
		__debugInfo = "416:\src\Compiler.gbas";
		param7_Msg_Str = ((((((((((((((param7_Msg_Str) + ("in line '"))) + (CAST2STRING(local3_tok_2575.attr4_Line)))) + ("' at character '"))) + (CAST2STRING(local3_tok_2575.attr9_Character)))) + ("' near '"))) + (REPLACE_Str(local3_tok_2575.attr8_Text_Str, "\n", "NEWLINE")))) + ("'\n"));
		__debugInfo = "417:\src\Compiler.gbas";
		param7_Msg_Str = ((((((param7_Msg_Str) + ("in file '"))) + (local3_tok_2575.attr8_Path_Str))) + ("'\n"));
		__debugInfo = "418:\src\Compiler.gbas";
		param7_Msg_Str = ((((((param7_Msg_Str) + ("\t '"))) + (local3_tok_2575.attr15_LineContent_Str))) + ("'\n"));
		__debugInfo = "419:\src\Compiler.gbas";
		param7_Msg_Str = ((param7_Msg_Str) + ("-----------------------------------\n"));
		__debugInfo = "419:\src\Compiler.gbas";
		param7_Msg_Str = (("\n-----------------------------------\n") + (param7_Msg_Str));
		__debugInfo = "421:\src\Compiler.gbas";
		STDOUT(param7_Msg_Str);
		__debugInfo = "422:\src\Compiler.gbas";
		return 0;
		__debugInfo = "413:\src\Compiler.gbas";pool_TToken.free(local3_tok_2575);
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func7_Warning = window['func7_Warning'];
window['func11_CreateToken'] = function(param8_Text_Str, param15_LineContent_Str, param4_Line, param9_Character, param8_Path_Str) {
	stackPush("function: CreateToken", __debugInfo);
	try {
		__debugInfo = "453:\src\Compiler.gbas";
		if (((((((((((((param8_Text_Str) !== ("\n")) ? 1 : 0)) && ((((TRIM_Str(param8_Text_Str, " \t\r\n\v\f")) === ("")) ? 1 : 0))) ? 1 : 0)) || ((((param8_Text_Str) === ("\t")) ? 1 : 0))) ? 1 : 0)) || ((((param8_Text_Str) === ("\r")) ? 1 : 0))) ? 1 : 0)) {
			
		} else {
			var local6_ascval_2581 = 0, local3_pos_2582 = 0.0;
			__debugInfo = "430:\src\Compiler.gbas";
			local6_ascval_2581 = ASC(param8_Text_Str, 0);
			__debugInfo = "433:\src\Compiler.gbas";
			if ((((((((((local6_ascval_2581) === (8)) ? 1 : 0)) || ((((local6_ascval_2581) === (12)) ? 1 : 0))) ? 1 : 0)) || ((((CAST2STRING(local6_ascval_2581)) === (global11_SHLASHF_Str)) ? 1 : 0))) ? 1 : 0)) {
				__debugInfo = "432:\src\Compiler.gbas";
				param8_Text_Str = "\n";
				__debugInfo = "432:\src\Compiler.gbas";
			};
			__debugInfo = "437:\src\Compiler.gbas";
			local3_pos_2582 = global8_Compiler.attr11_LastTokenID;
			__debugInfo = "438:\src\Compiler.gbas";
			global8_Compiler.attr11_LastTokenID = ((global8_Compiler.attr11_LastTokenID) + (1));
			__debugInfo = "445:\src\Compiler.gbas";
			if ((((global8_Compiler.attr11_LastTokenID) >= (((BOUNDS(global8_Compiler.attr6_Tokens, 0)) - (10)))) ? 1 : 0)) {
				__debugInfo = "443:\src\Compiler.gbas";
				REDIM(global8_Compiler.attr6_Tokens, [((global8_Compiler.attr11_LastTokenID) + (50))], pool_TToken.alloc() );
				__debugInfo = "443:\src\Compiler.gbas";
			};
			__debugInfo = "447:\src\Compiler.gbas";
			global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2582)).values[tmpPositionCache].attr4_Line = param4_Line;
			__debugInfo = "448:\src\Compiler.gbas";
			global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2582)).values[tmpPositionCache].attr9_Character = param9_Character;
			__debugInfo = "449:\src\Compiler.gbas";
			global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2582)).values[tmpPositionCache].attr15_LineContent_Str = param15_LineContent_Str;
			__debugInfo = "450:\src\Compiler.gbas";
			global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2582)).values[tmpPositionCache].attr8_Path_Str = param8_Path_Str;
			__debugInfo = "451:\src\Compiler.gbas";
			global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2582)).values[tmpPositionCache].attr8_Text_Str = param8_Text_Str;
			__debugInfo = "452:\src\Compiler.gbas";
			if ((((LEFT_Str(global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2582)).values[tmpPositionCache].attr8_Text_Str, 1)) === ("@")) ? 1 : 0)) {
				__debugInfo = "452:\src\Compiler.gbas";
				global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2582)).values[tmpPositionCache].attr8_Text_Str = MID_Str(global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2582)).values[tmpPositionCache].attr8_Text_Str, 1, -(1));
				__debugInfo = "452:\src\Compiler.gbas";
			};
			__debugInfo = "430:\src\Compiler.gbas";
		};
		__debugInfo = "454:\src\Compiler.gbas";
		return tryClone(unref(pool_TToken.alloc()));
		__debugInfo = "453:\src\Compiler.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func11_CreateToken = window['func11_CreateToken'];
window['func15_GetCurrentToken'] = function() {
	stackPush("function: GetCurrentToken", __debugInfo);
	try {
		__debugInfo = "462:\src\Compiler.gbas";
		if ((((global8_Compiler.attr11_currentPosi) < (global8_Compiler.attr11_LastTokenID)) ? 1 : 0)) {
			__debugInfo = "458:\src\Compiler.gbas";
			return tryClone(global8_Compiler.attr6_Tokens.arrAccess(global8_Compiler.attr11_currentPosi).values[tmpPositionCache]);
			__debugInfo = "458:\src\Compiler.gbas";
		} else {
			var local1_t_1854 = pool_TToken.alloc();
			__debugInfo = "461:\src\Compiler.gbas";
			return tryClone(local1_t_1854);
			__debugInfo = "461:\src\Compiler.gbas";pool_TToken.free(local1_t_1854);
		};
		__debugInfo = "463:\src\Compiler.gbas";
		return tryClone(unref(pool_TToken.alloc()));
		__debugInfo = "462:\src\Compiler.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func15_GetCurrentToken = window['func15_GetCurrentToken'];
window['func5_Start'] = function() {
	stackPush("function: Start", __debugInfo);
	try {
		__debugInfo = "466:\src\Compiler.gbas";
		global8_Compiler.attr11_currentPosi = 0;
		__debugInfo = "467:\src\Compiler.gbas";
		func7_GetNext();
		__debugInfo = "468:\src\Compiler.gbas";
		return 0;
		__debugInfo = "466:\src\Compiler.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func5_Start = window['func5_Start'];
window['func7_HasNext'] = function() {
	stackPush("function: HasNext", __debugInfo);
	try {
		__debugInfo = "475:\src\Compiler.gbas";
		if ((((global8_Compiler.attr11_currentPosi) > (((global8_Compiler.attr11_LastTokenID) - (2)))) ? 1 : 0)) {
			__debugInfo = "472:\src\Compiler.gbas";
			return tryClone(0);
			__debugInfo = "472:\src\Compiler.gbas";
		} else {
			__debugInfo = "474:\src\Compiler.gbas";
			return 1;
			__debugInfo = "474:\src\Compiler.gbas";
		};
		__debugInfo = "476:\src\Compiler.gbas";
		return 0;
		__debugInfo = "475:\src\Compiler.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func7_HasNext = window['func7_HasNext'];
window['func7_GetNext'] = function() {
	stackPush("function: GetNext", __debugInfo);
	try {
		__debugInfo = "483:\src\Compiler.gbas";
		do {
			__debugInfo = "479:\src\Compiler.gbas";
			global8_Compiler.attr11_currentPosi+=1;
			__debugInfo = "482:\src\Compiler.gbas";
			if ((((global8_Compiler.attr11_currentPosi) > (((global8_Compiler.attr11_LastTokenID) - (1)))) ? 1 : 0)) {
				__debugInfo = "481:\src\Compiler.gbas";
				func5_Error("Unexpected end of line", 480, "src\Compiler.gbas");
				__debugInfo = "481:\src\Compiler.gbas";
			};
			__debugInfo = "479:\src\Compiler.gbas";
		} while (!(((global8_Compiler.attr6_Tokens.arrAccess(global8_Compiler.attr11_currentPosi).values[tmpPositionCache].attr5_IsDel) ? 0 : 1)));
		__debugInfo = "487:\src\Compiler.gbas";
		return 0;
		__debugInfo = "483:\src\Compiler.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func7_GetNext = window['func7_GetNext'];
window['func5_Match'] = function(param8_Text_Str, param4_Line, param8_File_Str) {
	stackPush("function: Match", __debugInfo);
	try {
		__debugInfo = "491:\src\Compiler.gbas";
		if ((((global8_Compiler.attr6_Tokens.arrAccess(global8_Compiler.attr11_currentPosi).values[tmpPositionCache].attr8_Text_Str) !== (param8_Text_Str)) ? 1 : 0)) {
			__debugInfo = "490:\src\Compiler.gbas";
			func5_Error((((("Unexpected token, expecting: '") + (param8_Text_Str))) + ("'")), ~~(param4_Line), param8_File_Str);
			__debugInfo = "490:\src\Compiler.gbas";
		};
		__debugInfo = "492:\src\Compiler.gbas";
		func7_GetNext();
		__debugInfo = "493:\src\Compiler.gbas";
		return 0;
		__debugInfo = "491:\src\Compiler.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func5_Match = window['func5_Match'];
window['func8_EOFParse'] = function() {
	stackPush("function: EOFParse", __debugInfo);
	try {
		__debugInfo = "496:\src\Compiler.gbas";
		return tryClone((((global8_Compiler.attr11_currentPosi) < (((global8_Compiler.attr11_LastTokenID) - (1)))) ? 1 : 0));
		__debugInfo = "497:\src\Compiler.gbas";
		return 0;
		__debugInfo = "496:\src\Compiler.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func8_EOFParse = window['func8_EOFParse'];
window['func14_GetCurrent_Str'] = function() {
	stackPush("function: GetCurrent_Str", __debugInfo);
	try {
		__debugInfo = "500:\src\Compiler.gbas";
		return tryClone(global8_Compiler.attr6_Tokens.arrAccess(global8_Compiler.attr11_currentPosi).values[tmpPositionCache].attr8_Text_Str);
		__debugInfo = "501:\src\Compiler.gbas";
		return "";
		__debugInfo = "500:\src\Compiler.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func14_GetCurrent_Str = window['func14_GetCurrent_Str'];
window['func13_RemoveCurrent'] = function() {
	stackPush("function: RemoveCurrent", __debugInfo);
	try {
		__debugInfo = "504:\src\Compiler.gbas";
		global8_Compiler.attr6_Tokens.arrAccess(global8_Compiler.attr11_currentPosi).values[tmpPositionCache].attr5_IsDel = 1;
		__debugInfo = "505:\src\Compiler.gbas";
		global8_Compiler.attr11_currentPosi+=1;
		__debugInfo = "508:\src\Compiler.gbas";
		return 0;
		__debugInfo = "504:\src\Compiler.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func13_RemoveCurrent = window['func13_RemoveCurrent'];
window['func14_MatchAndRemove'] = function(param8_Text_Str, param4_Line, param8_File_Str) {
	stackPush("function: MatchAndRemove", __debugInfo);
	try {
		__debugInfo = "513:\src\Compiler.gbas";
		if ((((func14_GetCurrent_Str()) !== (param8_Text_Str)) ? 1 : 0)) {
			__debugInfo = "512:\src\Compiler.gbas";
			func5_Error((((("Unexpected token, expecting: '") + (param8_Text_Str))) + ("'")), ~~(param4_Line), param8_File_Str);
			__debugInfo = "512:\src\Compiler.gbas";
		};
		__debugInfo = "514:\src\Compiler.gbas";
		func13_RemoveCurrent();
		__debugInfo = "515:\src\Compiler.gbas";
		return 0;
		__debugInfo = "513:\src\Compiler.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func14_MatchAndRemove = window['func14_MatchAndRemove'];
window['func14_CreateDatatype'] = function(param8_Name_Str, param7_IsArray) {
	stackPush("function: CreateDatatype", __debugInfo);
	try {
		var local1_d_2588 = pool_TDatatype.alloc();
		__debugInfo = "519:\src\Compiler.gbas";
		local1_d_2588.attr8_Name_Str = param8_Name_Str;
		__debugInfo = "520:\src\Compiler.gbas";
		local1_d_2588.attr7_IsArray = param7_IsArray;
		__debugInfo = "521:\src\Compiler.gbas";
		return tryClone(local1_d_2588);
		__debugInfo = "522:\src\Compiler.gbas";
		return tryClone(unref(pool_TDatatype.alloc()));
		__debugInfo = "519:\src\Compiler.gbas";pool_TDatatype.free(local1_d_2588);
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func14_CreateDatatype = window['func14_CreateDatatype'];
window['func7_IsToken'] = function(param8_Text_Str) {
	stackPush("function: IsToken", __debugInfo);
	try {
		__debugInfo = "529:\src\Compiler.gbas";
		if ((((func14_GetCurrent_Str()) === (param8_Text_Str)) ? 1 : 0)) {
			__debugInfo = "526:\src\Compiler.gbas";
			return 1;
			__debugInfo = "526:\src\Compiler.gbas";
		} else {
			__debugInfo = "528:\src\Compiler.gbas";
			return tryClone(0);
			__debugInfo = "528:\src\Compiler.gbas";
		};
		__debugInfo = "530:\src\Compiler.gbas";
		return 0;
		__debugInfo = "529:\src\Compiler.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func7_IsToken = window['func7_IsToken'];
window['func14_CreateOperator'] = function(param8_Name_Str, param7_Sym_Str, param4_Prio, param3_Typ) {
	stackPush("function: CreateOperator", __debugInfo);
	try {
		var local2_Op_ref_2593 = [pool_TOperator.alloc()];
		__debugInfo = "534:\src\Compiler.gbas";
		local2_Op_ref_2593[0].attr8_Name_Str = param8_Name_Str;
		__debugInfo = "535:\src\Compiler.gbas";
		local2_Op_ref_2593[0].attr7_Sym_Str = param7_Sym_Str;
		__debugInfo = "536:\src\Compiler.gbas";
		local2_Op_ref_2593[0].attr4_Prio = param4_Prio;
		__debugInfo = "537:\src\Compiler.gbas";
		local2_Op_ref_2593[0].attr3_Typ = param3_Typ;
		__debugInfo = "538:\src\Compiler.gbas";
		local2_Op_ref_2593[0].attr2_ID = BOUNDS(global9_Operators_ref[0], 0);
		__debugInfo = "539:\src\Compiler.gbas";
		DIMPUSH(global9_Operators_ref[0], local2_Op_ref_2593);
		__debugInfo = "540:\src\Compiler.gbas";
		return 0;
		__debugInfo = "534:\src\Compiler.gbas";pool_TOperator.free(local2_Op_ref_2593);
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func14_CreateOperator = window['func14_CreateOperator'];
window['func11_AddVariable'] = function(param4_Vari, param6_Ignore) {
	stackPush("function: AddVariable", __debugInfo);
	try {
		var local4_Vari_ref_1859 = [param4_Vari];
		__debugInfo = "554:\src\Compiler.gbas";
		if (((((((param6_Ignore) === (0)) ? 1 : 0)) && (func13_IsVarExisting(local4_Vari_ref_1859[0].attr8_Name_Str))) ? 1 : 0)) {
			__debugInfo = "554:\src\Compiler.gbas";
			func5_Error((((("Variable already exists, is a keyword or a type: '") + (local4_Vari_ref_1859[0].attr8_Name_Str))) + ("'")), 553, "src\Compiler.gbas");
			__debugInfo = "554:\src\Compiler.gbas";
		};
		__debugInfo = "555:\src\Compiler.gbas";
		local4_Vari_ref_1859[0].attr2_ID = BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0);
		__debugInfo = "557:\src\Compiler.gbas";
		DIMPUSH(global8_Compiler.attr5_Varis_ref[0], local4_Vari_ref_1859);
		__debugInfo = "558:\src\Compiler.gbas";
		return 0;
		__debugInfo = "554:\src\Compiler.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func11_AddVariable = window['func11_AddVariable'];
window['func11_AddFunction'] = function(param4_Func) {
	stackPush("function: AddFunction", __debugInfo);
	try {
		var local4_Func_ref_1861 = [param4_Func];
		__debugInfo = "561:\src\Compiler.gbas";
		if (((((((local4_Func_ref_1861[0].attr3_Typ) !== (3)) ? 1 : 0)) && (func14_IsFuncExisting(local4_Func_ref_1861[0].attr8_Name_Str, local4_Func_ref_1861[0].attr10_IsCallback))) ? 1 : 0)) {
			__debugInfo = "561:\src\Compiler.gbas";
			func5_Error((((("Function already exists, is a keyword or a type: '") + (local4_Func_ref_1861[0].attr8_Name_Str))) + ("'")), 560, "src\Compiler.gbas");
			__debugInfo = "561:\src\Compiler.gbas";
		};
		__debugInfo = "563:\src\Compiler.gbas";
		local4_Func_ref_1861[0].attr2_ID = BOUNDS(global8_Compiler.attr5_Funcs_ref[0], 0);
		__debugInfo = "564:\src\Compiler.gbas";
		DIMPUSH(global8_Compiler.attr5_Funcs_ref[0], local4_Func_ref_1861);
		__debugInfo = "565:\src\Compiler.gbas";
		return 0;
		__debugInfo = "561:\src\Compiler.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func11_AddFunction = window['func11_AddFunction'];
window['InitCompiler'] = function() {
	stackPush("function: InitCompiler", __debugInfo);
	try {
		var local12_Keywords_Str_1862 = pool_array.alloc("");
		__debugInfo = "568:\src\Compiler.gbas";
		REDIM(global7_Defines, [0], pool_TDefine.alloc() );
		__debugInfo = "569:\src\Compiler.gbas";
		global12_voidDatatype = func14_CreateDatatype("void", 0).clone(/* In Assign */);
		__debugInfo = "570:\src\Compiler.gbas";
		global11_intDatatype = func14_CreateDatatype("int", 0).clone(/* In Assign */);
		__debugInfo = "571:\src\Compiler.gbas";
		global13_floatDatatype = func14_CreateDatatype("float", 0).clone(/* In Assign */);
		__debugInfo = "572:\src\Compiler.gbas";
		global11_strDatatype = func14_CreateDatatype("string", 0).clone(/* In Assign */);
		__debugInfo = "574:\src\Compiler.gbas";
		global11_SHLASHF_Str = CHR_Str(INT2STR("\f"));
		__debugInfo = "576:\src\Compiler.gbas";
		REDIM(unref(global9_Operators_ref[0]), [0], [pool_TOperator.alloc()] );
		__debugInfo = "577:\src\Compiler.gbas";
		func14_CreateOperator("add", "+", 4, ~~(2));
		__debugInfo = "578:\src\Compiler.gbas";
		func14_CreateOperator("sub", "-", 4, ~~(2));
		__debugInfo = "579:\src\Compiler.gbas";
		func14_CreateOperator("mul", "*", 5, ~~(2));
		__debugInfo = "580:\src\Compiler.gbas";
		func14_CreateOperator("div", "/", 5, ~~(2));
		__debugInfo = "581:\src\Compiler.gbas";
		func14_CreateOperator("pot", "^", 6, ~~(2));
		__debugInfo = "583:\src\Compiler.gbas";
		func14_CreateOperator("equ", "=", 3, ~~(3));
		__debugInfo = "584:\src\Compiler.gbas";
		func14_CreateOperator("grt", ">", 3, ~~(3));
		__debugInfo = "585:\src\Compiler.gbas";
		func14_CreateOperator("less", "<", 3, ~~(3));
		__debugInfo = "586:\src\Compiler.gbas";
		func14_CreateOperator("lessequ", "<=", 3, ~~(3));
		__debugInfo = "587:\src\Compiler.gbas";
		func14_CreateOperator("grtequ", ">=", 3, ~~(3));
		__debugInfo = "588:\src\Compiler.gbas";
		func14_CreateOperator("unequ", "<>", 3, ~~(3));
		__debugInfo = "590:\src\Compiler.gbas";
		func14_CreateOperator("and", "AND", 2, ~~(3));
		__debugInfo = "591:\src\Compiler.gbas";
		func14_CreateOperator("or", "OR", 2, ~~(3));
		__debugInfo = "594:\src\Compiler.gbas";
		DIMDATA(local12_Keywords_Str_1862, ["CALLBACK", "FUNCTION", "ENDFUNCTION", "SUB", "ENDSUB", "GOSUB", "IF", "ELSE", "ELSEIF", "THEN", "ENDIF", "WHILE", "WEND", "BREAK", "CONTINUE", "FOR", "FOREACH", "IN", "TO", "STEP", "NEXT", "REPEAT", "UNTIL", "TYPE", "ENDTYPE", "RETURN", "NATIVE", "LOCAL", "GLOBAL", "STATIC", "DIM", "REDIM", "INLINE", "ENDINLINE", "PROTOTYPE", "REQUIRE", "BREAK", "CONTINUE", "TRY", "CATCH", "FINALLY", "THROW", "SELECT", "CASE", "DEFAULT", "ENDSELECT", "STARTDATA", "ENDDATA", "DATA", "RESTORE", "READ", "GOTO", "ALIAS", "AS", "CONSTANT", "INC", "DEC", "DIMPUSH", "LEN", "DIMDATA", "DELETE", "DIMDEL", "DEBUG", "ASSERT", "ABSTRACT", "EXPORT"]);
		__debugInfo = "596:\src\Compiler.gbas";
		(global10_KeywordMap).SetSize(((BOUNDS(local12_Keywords_Str_1862, 0)) * (8)));
		__debugInfo = "599:\src\Compiler.gbas";
		var forEachSaver3942 = local12_Keywords_Str_1862;
		for(var forEachCounter3942 = 0 ; forEachCounter3942 < forEachSaver3942.values.length ; forEachCounter3942++) {
			var local7_key_Str_1863 = forEachSaver3942.values[forEachCounter3942];
		{
				__debugInfo = "598:\src\Compiler.gbas";
				(global10_KeywordMap).Put(local7_key_Str_1863, 1);
				__debugInfo = "598:\src\Compiler.gbas";
			}
			forEachSaver3942.values[forEachCounter3942] = local7_key_Str_1863;
		
		};
		__debugInfo = "602:\src\Compiler.gbas";
		RegisterDefine("GLB_VERSION", "1");
		__debugInfo = "603:\src\Compiler.gbas";
		RegisterDefine("oTT_VERSION", "1");
		__debugInfo = "604:\src\Compiler.gbas";
		RegisterDefine("OTTBASIC", CAST2STRING(1));
		__debugInfo = "608:\src\Compiler.gbas";
		RegisterDefine("ADDON_2D", CAST2STRING(1));
		__debugInfo = "609:\src\Compiler.gbas";
		RegisterDefine("ADDON_3D", CAST2STRING(1));
		__debugInfo = "610:\src\Compiler.gbas";
		RegisterDefine("ADDON_NET", CAST2STRING(1));
		__debugInfo = "611:\src\Compiler.gbas";
		RegisterDefine("ADDON_INPUT", CAST2STRING(1));
		__debugInfo = "612:\src\Compiler.gbas";
		RegisterDefine("ADDON_CONSOLE", CAST2STRING(1));
		__debugInfo = "613:\src\Compiler.gbas";
		RegisterDefine("ADDON_SOUND", CAST2STRING(1));
		__debugInfo = "614:\src\Compiler.gbas";
		RegisterDefine("ADDON_NET", CAST2STRING(1));
		__debugInfo = "616:\src\Compiler.gbas";
		func16_ResetExpressions();
		__debugInfo = "619:\src\Compiler.gbas";
		REDIM(global14_Documentations, [0], pool_Documentation.alloc() );
		__debugInfo = "620:\src\Compiler.gbas";
		return 0;
		__debugInfo = "568:\src\Compiler.gbas";pool_array.free(local12_Keywords_Str_1862);
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
InitCompiler = window['InitCompiler'];
window['Compile_Str'] = function(param8_Text_Str, param10_Target_Str) {
	stackPush("function: Compile_Str", __debugInfo);
	try {
		var local1_c_1866 = pool_TCompiler.alloc(), local10_Output_Str_1867 = "";
		__debugInfo = "635:\src\Compiler.gbas";
		global8_Compiler = local1_c_1866.clone(/* In Assign */);
		__debugInfo = "638:\src\Compiler.gbas";
		InitCompiler();
		__debugInfo = "640:\src\Compiler.gbas";
		func16_ResetExpressions();
		__debugInfo = "642:\src\Compiler.gbas";
		func9_PushTimer();
		__debugInfo = "644:\src\Compiler.gbas";
		func11_SetupTarget(param10_Target_Str);
		__debugInfo = "656:\src\Compiler.gbas";
		PassSuccessfull(1, ~~(6));
		__debugInfo = "658:\src\Compiler.gbas";
		func8_PopTimer("Header load & setup target!");
		__debugInfo = "660:\src\Compiler.gbas";
		global8_Compiler.attr8_Code_Str = ((param8_Text_Str) + ("\n"));
		__debugInfo = "662:\src\Compiler.gbas";
		func9_PushTimer();
		__debugInfo = "663:\src\Compiler.gbas";
		func5_Lexer();
		__debugInfo = "664:\src\Compiler.gbas";
		func8_PopTimer("Lexer!");
		__debugInfo = "666:\src\Compiler.gbas";
		PassSuccessfull(2, ~~(6));
		__debugInfo = "667:\src\Compiler.gbas";
		STDOUT("Lexing successful! \n");
		__debugInfo = "669:\src\Compiler.gbas";
		global8_Compiler.attr14_errorState_Str = " (precompiler error)";
		__debugInfo = "670:\src\Compiler.gbas";
		func9_PushTimer();
		__debugInfo = "671:\src\Compiler.gbas";
		func11_Precompiler();
		__debugInfo = "673:\src\Compiler.gbas";
		func8_PopTimer("Precompiler");
		__debugInfo = "675:\src\Compiler.gbas";
		PassSuccessfull(3, ~~(6));
		__debugInfo = "676:\src\Compiler.gbas";
		STDOUT("Preprocessing successful! \n");
		__debugInfo = "679:\src\Compiler.gbas";
		global8_Compiler.attr13_LastMaxTokens = global8_Compiler.attr11_LastTokenID;
		__debugInfo = "681:\src\Compiler.gbas";
		func16_ResetExpressions();
		__debugInfo = "683:\src\Compiler.gbas";
		global8_Compiler.attr14_errorState_Str = " (analyse error)";
		__debugInfo = "684:\src\Compiler.gbas";
		func9_PushTimer();
		__debugInfo = "685:\src\Compiler.gbas";
		func8_Analyser();
		__debugInfo = "686:\src\Compiler.gbas";
		func8_PopTimer("Analyser");
		__debugInfo = "688:\src\Compiler.gbas";
		PassSuccessfull(4, ~~(6));
		__debugInfo = "694:\src\Compiler.gbas";
		if (global8_Compiler.attr8_WasError) {
			__debugInfo = "690:\src\Compiler.gbas";
			STDOUT("Analysing failed :( \n");
			__debugInfo = "691:\src\Compiler.gbas";
			return "";
			__debugInfo = "690:\src\Compiler.gbas";
		} else {
			__debugInfo = "693:\src\Compiler.gbas";
			STDOUT("Analysing successful! \n");
			__debugInfo = "693:\src\Compiler.gbas";
		};
		__debugInfo = "701:\src\Compiler.gbas";
		global8_Compiler.attr14_errorState_Str = " (parse error)";
		__debugInfo = "702:\src\Compiler.gbas";
		func9_PushTimer();
		__debugInfo = "703:\src\Compiler.gbas";
		func6_Parser();
		__debugInfo = "704:\src\Compiler.gbas";
		func8_PopTimer("Parser");
		__debugInfo = "706:\src\Compiler.gbas";
		PassSuccessfull(5, ~~(6));
		__debugInfo = "712:\src\Compiler.gbas";
		if (global8_Compiler.attr8_WasError) {
			__debugInfo = "708:\src\Compiler.gbas";
			STDOUT("Parsing failed :( \n");
			__debugInfo = "709:\src\Compiler.gbas";
			return "";
			__debugInfo = "708:\src\Compiler.gbas";
		} else {
			__debugInfo = "711:\src\Compiler.gbas";
			STDOUT("Parsing successful! \n");
			__debugInfo = "711:\src\Compiler.gbas";
		};
		__debugInfo = "715:\src\Compiler.gbas";
		global8_Compiler.attr14_errorState_Str = " (doc generation error)";
		__debugInfo = "716:\src\Compiler.gbas";
		func9_PushTimer();
		__debugInfo = "717:\src\Compiler.gbas";
		func11_GenerateDoc();
		__debugInfo = "718:\src\Compiler.gbas";
		func8_PopTimer("Generate Doc");
		__debugInfo = "725:\src\Compiler.gbas";
		if (global8_Compiler.attr8_WasError) {
			__debugInfo = "721:\src\Compiler.gbas";
			STDOUT("Doc Generation failed :( \n");
			__debugInfo = "722:\src\Compiler.gbas";
			return "";
			__debugInfo = "721:\src\Compiler.gbas";
		} else {
			__debugInfo = "724:\src\Compiler.gbas";
			STDOUT("Doc Generation successful! \n");
			__debugInfo = "724:\src\Compiler.gbas";
		};
		__debugInfo = "728:\src\Compiler.gbas";
		global8_Compiler.attr14_errorState_Str = " (generate error)";
		__debugInfo = "735:\src\Compiler.gbas";
		func9_PushTimer();
		__debugInfo = "736:\src\Compiler.gbas";
		local10_Output_Str_1867 = func12_DoTarget_Str(param10_Target_Str);
		__debugInfo = "737:\src\Compiler.gbas";
		func8_PopTimer("Target stuff");
		__debugInfo = "739:\src\Compiler.gbas";
		PassSuccessfull(6, ~~(6));
		__debugInfo = "745:\src\Compiler.gbas";
		if (global8_Compiler.attr8_WasError) {
			__debugInfo = "741:\src\Compiler.gbas";
			STDOUT("Generating failed :( \n");
			__debugInfo = "742:\src\Compiler.gbas";
			return "";
			__debugInfo = "741:\src\Compiler.gbas";
		} else {
			__debugInfo = "744:\src\Compiler.gbas";
			STDOUT((((("Generating successful to target ") + (param10_Target_Str))) + ("! \n")));
			__debugInfo = "744:\src\Compiler.gbas";
		};
		__debugInfo = "747:\src\Compiler.gbas";
		return tryClone(local10_Output_Str_1867);
		__debugInfo = "748:\src\Compiler.gbas";
		return "";
		__debugInfo = "635:\src\Compiler.gbas";pool_TCompiler.free(local1_c_1866);
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
Compile_Str = window['Compile_Str'];
window['func16_ResetExpressions'] = function() {
	stackPush("function: ResetExpressions", __debugInfo);
	try {
		__debugInfo = "751:\src\Compiler.gbas";
		DIM(unref(global5_Exprs_ref[0]), [0], [pool_TExpr.alloc()]);
		__debugInfo = "752:\src\Compiler.gbas";
		global10_LastExprID = 0;
		__debugInfo = "753:\src\Compiler.gbas";
		func21_CreateDebugExpression();
		__debugInfo = "754:\src\Compiler.gbas";
		return 0;
		__debugInfo = "751:\src\Compiler.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func16_ResetExpressions = window['func16_ResetExpressions'];
window['func9_PushTimer'] = function() {
	stackPush("function: PushTimer", __debugInfo);
	try {
		__debugInfo = "764:\src\Compiler.gbas";
		return 0;
		__debugInfo = "764:\src\Compiler.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func9_PushTimer = window['func9_PushTimer'];
window['func8_PopTimer'] = function(param8_Text_Str) {
	stackPush("function: PopTimer", __debugInfo);
	try {
		__debugInfo = "772:\src\Compiler.gbas";
		return 0;
		__debugInfo = "772:\src\Compiler.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func8_PopTimer = window['func8_PopTimer'];
window['RegisterDefine'] = function(param7_Key_Str, param9_Value_Str) {
	stackPush("function: RegisterDefine", __debugInfo);
	try {
		var local3_Def_1871 = pool_TDefine.alloc();
		__debugInfo = "777:\src\Compiler.gbas";
		local3_Def_1871.attr7_Key_Str = param7_Key_Str;
		__debugInfo = "778:\src\Compiler.gbas";
		local3_Def_1871.attr9_Value_Str = param9_Value_Str;
		__debugInfo = "779:\src\Compiler.gbas";
		DIMPUSH(global7_Defines, local3_Def_1871);
		__debugInfo = "780:\src\Compiler.gbas";
		return 0;
		__debugInfo = "777:\src\Compiler.gbas";pool_TDefine.free(local3_Def_1871);
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
RegisterDefine = window['RegisterDefine'];
window['func11_GenerateDoc'] = function() {
	stackPush("function: GenerateDoc", __debugInfo);
	try {
		__debugInfo = "31:\src\DocParser.gbas";
		func22_GenerateDocForLanguage("EN");
		__debugInfo = "32:\src\DocParser.gbas";
		func22_GenerateDocForLanguage("DE");
		__debugInfo = "33:\src\DocParser.gbas";
		return 0;
		__debugInfo = "31:\src\DocParser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func11_GenerateDoc = window['func11_GenerateDoc'];
window['func22_GenerateDocForLanguage'] = function(param8_Lang_Str) {
	stackPush("function: GenerateDocForLanguage", __debugInfo);
	try {
		var local17_Documentation_Str_1873 = "", local11_JSONDoc_Str_1874 = "", local12_Glossary_Str_1875 = "";
		__debugInfo = "37:\src\DocParser.gbas";
		local17_Documentation_Str_1873 = "";
		__debugInfo = "38:\src\DocParser.gbas";
		local11_JSONDoc_Str_1874 = "";
		__debugInfo = "39:\src\DocParser.gbas";
		local12_Glossary_Str_1875 = "# Overview";
		__debugInfo = "105:\src\DocParser.gbas";
		var forEachSaver4473 = global14_Documentations;
		for(var forEachCounter4473 = 0 ; forEachCounter4473 < forEachSaver4473.values.length ; forEachCounter4473++) {
			var local6_module_1876 = forEachSaver4473.values[forEachCounter4473];
		{
				__debugInfo = "104:\src\DocParser.gbas";
				if ((((local6_module_1876.attr7_typ_Str) === ("MODULE")) ? 1 : 0)) {
					__debugInfo = "43:\src\DocParser.gbas";
					local12_Glossary_Str_1875+=(((((((("\n## [Module ") + (local6_module_1876.attr8_name_Str))) + ("] (#"))) + (local6_module_1876.attr8_name_Str))) + (")\n"));
					__debugInfo = "44:\src\DocParser.gbas";
					local17_Documentation_Str_1873+=(((("# ") + (local6_module_1876.attr8_name_Str))) + ("\n"));
					__debugInfo = "45:\src\DocParser.gbas";
					local17_Documentation_Str_1873+=((func18_DocLangElement_Str(unref(local6_module_1876.attr4_desc), param8_Lang_Str)) + ("\n"));
					__debugInfo = "103:\src\DocParser.gbas";
					var forEachSaver4471 = global14_Documentations;
					for(var forEachCounter4471 = 0 ; forEachCounter4471 < forEachSaver4471.values.length ; forEachCounter4471++) {
						var local1_D_1877 = forEachSaver4471.values[forEachCounter4471];
					{
							__debugInfo = "102:\src\DocParser.gbas";
							if ((((local1_D_1877.attr10_module_Str) === (local6_module_1876.attr8_name_Str)) ? 1 : 0)) {
								var local8_name_Str_1878 = "";
								__debugInfo = "48:\src\DocParser.gbas";
								local8_name_Str_1878 = local1_D_1877.attr8_name_Str;
								__debugInfo = "49:\src\DocParser.gbas";
								local17_Documentation_Str_1873+=(((("## ") + (local8_name_Str_1878))) + ("\n"));
								__debugInfo = "51:\src\DocParser.gbas";
								{
									var local16___SelectHelper7__1879 = "";
									__debugInfo = "51:\src\DocParser.gbas";
									local16___SelectHelper7__1879 = local1_D_1877.attr7_typ_Str;
									__debugInfo = "101:\src\DocParser.gbas";
									if ((((local16___SelectHelper7__1879) === ("FUNCTION")) ? 1 : 0)) {
										__debugInfo = "53:\src\DocParser.gbas";
										local12_Glossary_Str_1875+=(((((((("* [") + (local8_name_Str_1878))) + ("] ("))) + (local8_name_Str_1878))) + (")\n"));
										__debugInfo = "60:\src\DocParser.gbas";
										var forEachSaver4310 = global8_Compiler.attr5_Funcs_ref[0];
										for(var forEachCounter4310 = 0 ; forEachCounter4310 < forEachSaver4310.values.length ; forEachCounter4310++) {
											var local1_F_ref_1880 = forEachSaver4310.values[forEachCounter4310];
										{
												__debugInfo = "59:\src\DocParser.gbas";
												if ((((local1_F_ref_1880[0].attr9_OName_Str) === (local1_D_1877.attr8_name_Str)) ? 1 : 0)) {
													__debugInfo = "57:\src\DocParser.gbas";
													local17_Documentation_Str_1873+=((((">`") + (func20_GenerateFuncName_Str(unref(local1_F_ref_1880[0]))))) + ("`\n\n"));
													__debugInfo = "58:\src\DocParser.gbas";
													break;
													__debugInfo = "57:\src\DocParser.gbas";
												};
												__debugInfo = "59:\src\DocParser.gbas";
											}
											forEachSaver4310.values[forEachCounter4310] = local1_F_ref_1880;
										
										};
										__debugInfo = "76:\src\DocParser.gbas";
										if ((((BOUNDS(local1_D_1877.attr6_params, 0)) > (0)) ? 1 : 0)) {
											__debugInfo = "65:\src\DocParser.gbas";
											{
												var local16___SelectHelper8__1881 = "";
												__debugInfo = "65:\src\DocParser.gbas";
												local16___SelectHelper8__1881 = param8_Lang_Str;
												__debugInfo = "70:\src\DocParser.gbas";
												if ((((local16___SelectHelper8__1881) === ("EN")) ? 1 : 0)) {
													__debugInfo = "67:\src\DocParser.gbas";
													local17_Documentation_Str_1873+="Parameter | Description\n";
													__debugInfo = "67:\src\DocParser.gbas";
												} else if ((((local16___SelectHelper8__1881) === ("DE")) ? 1 : 0)) {
													__debugInfo = "69:\src\DocParser.gbas";
													local17_Documentation_Str_1873+="Parameter | Beschreibung\n";
													__debugInfo = "69:\src\DocParser.gbas";
												};
												__debugInfo = "65:\src\DocParser.gbas";
											};
											__debugInfo = "71:\src\DocParser.gbas";
											local17_Documentation_Str_1873+="-----------|-----------------------------------------------------------------------\n";
											__debugInfo = "75:\src\DocParser.gbas";
											var forEachSaver4367 = local1_D_1877.attr6_params;
											for(var forEachCounter4367 = 0 ; forEachCounter4367 < forEachSaver4367.values.length ; forEachCounter4367++) {
												var local1_P_1882 = forEachSaver4367.values[forEachCounter4367];
											{
													__debugInfo = "73:\src\DocParser.gbas";
													local17_Documentation_Str_1873+=(((("`") + (local1_P_1882.attr8_name_Str))) + ("`|"));
													__debugInfo = "74:\src\DocParser.gbas";
													local17_Documentation_Str_1873+=((func18_DocLangElement_Str(unref(local1_P_1882.attr4_desc), param8_Lang_Str)) + ("\n"));
													__debugInfo = "73:\src\DocParser.gbas";
												}
												forEachSaver4367.values[forEachCounter4367] = local1_P_1882;
											
											};
											__debugInfo = "65:\src\DocParser.gbas";
										};
										__debugInfo = "80:\src\DocParser.gbas";
										if ((((BOUNDS(local1_D_1877.attr7_example, 0)) > (0)) ? 1 : 0)) {
											__debugInfo = "79:\src\DocParser.gbas";
											local17_Documentation_Str_1873+=(((("```\n") + (func18_DocLangElement_Str(unref(local1_D_1877.attr7_example), param8_Lang_Str)))) + ("```\n"));
											__debugInfo = "79:\src\DocParser.gbas";
										};
										__debugInfo = "82:\src\DocParser.gbas";
										local17_Documentation_Str_1873+=(((("\n") + (func18_DocLangElement_Str(unref(local1_D_1877.attr4_desc), param8_Lang_Str)))) + ("\n"));
										__debugInfo = "100:\src\DocParser.gbas";
										if ((((BOUNDS(local1_D_1877.attr7_see_Str, 0)) > (0)) ? 1 : 0)) {
											var local5_first_1884 = 0;
											__debugInfo = "85:\src\DocParser.gbas";
											{
												var local16___SelectHelper9__1883 = "";
												__debugInfo = "85:\src\DocParser.gbas";
												local16___SelectHelper9__1883 = param8_Lang_Str;
												__debugInfo = "90:\src\DocParser.gbas";
												if ((((local16___SelectHelper9__1883) === ("EN")) ? 1 : 0)) {
													__debugInfo = "87:\src\DocParser.gbas";
													local17_Documentation_Str_1873+="See also: ";
													__debugInfo = "87:\src\DocParser.gbas";
												} else if ((((local16___SelectHelper9__1883) === ("DE")) ? 1 : 0)) {
													__debugInfo = "89:\src\DocParser.gbas";
													local17_Documentation_Str_1873+="Siehe auch: ";
													__debugInfo = "89:\src\DocParser.gbas";
												};
												__debugInfo = "85:\src\DocParser.gbas";
											};
											__debugInfo = "92:\src\DocParser.gbas";
											local5_first_1884 = 0;
											__debugInfo = "97:\src\DocParser.gbas";
											var forEachSaver4464 = local1_D_1877.attr7_see_Str;
											for(var forEachCounter4464 = 0 ; forEachCounter4464 < forEachSaver4464.values.length ; forEachCounter4464++) {
												var local5_s_Str_1885 = forEachSaver4464.values[forEachCounter4464];
											{
													__debugInfo = "94:\src\DocParser.gbas";
													if (local5_first_1884) {
														__debugInfo = "94:\src\DocParser.gbas";
														local17_Documentation_Str_1873+=", ";
														__debugInfo = "94:\src\DocParser.gbas";
													};
													__debugInfo = "95:\src\DocParser.gbas";
													local17_Documentation_Str_1873+=(((((((("[") + (local5_s_Str_1885))) + ("] (#"))) + (local5_s_Str_1885))) + (")"));
													__debugInfo = "96:\src\DocParser.gbas";
													local5_first_1884 = 1;
													__debugInfo = "94:\src\DocParser.gbas";
												}
												forEachSaver4464.values[forEachCounter4464] = local5_s_Str_1885;
											
											};
											__debugInfo = "99:\src\DocParser.gbas";
											local17_Documentation_Str_1873+="\n";
											__debugInfo = "85:\src\DocParser.gbas";
										};
										__debugInfo = "53:\src\DocParser.gbas";
									};
									__debugInfo = "51:\src\DocParser.gbas";
								};
								__debugInfo = "48:\src\DocParser.gbas";
							};
							__debugInfo = "102:\src\DocParser.gbas";
						}
						forEachSaver4471.values[forEachCounter4471] = local1_D_1877;
					
					};
					__debugInfo = "43:\src\DocParser.gbas";
				};
				__debugInfo = "104:\src\DocParser.gbas";
			}
			forEachSaver4473.values[forEachCounter4473] = local6_module_1876;
		
		};
		__debugInfo = "109:\src\DocParser.gbas";
		local17_Documentation_Str_1873 = ((((local12_Glossary_Str_1875) + ("\n"))) + (local17_Documentation_Str_1873));
		__debugInfo = "111:\src\DocParser.gbas";
		func9_WriteFile((((("Documentation_") + (param8_Lang_Str))) + (".md")), local17_Documentation_Str_1873);
		__debugInfo = "113:\src\DocParser.gbas";
		return 0;
		__debugInfo = "37:\src\DocParser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func22_GenerateDocForLanguage = window['func22_GenerateDocForLanguage'];
window['func18_DocLangElement_Str'] = function(param5_Langs, param8_Lang_Str) {
	stackPush("function: DocLangElement_Str", __debugInfo);
	try {
		var local8_Text_Str_1888 = "";
		__debugInfo = "116:\src\DocParser.gbas";
		local8_Text_Str_1888 = "";
		__debugInfo = "121:\src\DocParser.gbas";
		var forEachSaver4515 = param5_Langs;
		for(var forEachCounter4515 = 0 ; forEachCounter4515 < forEachSaver4515.values.length ; forEachCounter4515++) {
			var local1_L_1889 = forEachSaver4515.values[forEachCounter4515];
		{
				__debugInfo = "120:\src\DocParser.gbas";
				if ((((local1_L_1889.attr8_lang_Str) === (param8_Lang_Str)) ? 1 : 0)) {
					__debugInfo = "119:\src\DocParser.gbas";
					local8_Text_Str_1888+=((local1_L_1889.attr8_desc_Str) + ("\n"));
					__debugInfo = "119:\src\DocParser.gbas";
				};
				__debugInfo = "120:\src\DocParser.gbas";
			}
			forEachSaver4515.values[forEachCounter4515] = local1_L_1889;
		
		};
		__debugInfo = "122:\src\DocParser.gbas";
		return tryClone(local8_Text_Str_1888);
		__debugInfo = "123:\src\DocParser.gbas";
		return "";
		__debugInfo = "116:\src\DocParser.gbas";pool_array.free(param5_Langs);
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func18_DocLangElement_Str = window['func18_DocLangElement_Str'];
window['func20_GenerateFuncName_Str'] = function(param1_F) {
	stackPush("function: GenerateFuncName_Str", __debugInfo);
	try {
		__debugInfo = "126:\src\DocParser.gbas";
		return tryClone(global8_Compiler.attr6_Tokens.arrAccess(param1_F.attr6_DefTok).values[tmpPositionCache].attr15_LineContent_Str);
		__debugInfo = "127:\src\DocParser.gbas";
		return "";
		__debugInfo = "126:\src\DocParser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func20_GenerateFuncName_Str = window['func20_GenerateFuncName_Str'];
window['func8_ParseDoc'] = function() {
	stackPush("function: ParseDoc", __debugInfo);
	try {
		var local3_doc_2594 = pool_Documentation.alloc(), local8_name_Str_2595 = "";
		__debugInfo = "132:\src\DocParser.gbas";
		local3_doc_2594.attr7_typ_Str = func14_GetCurrent_Str();
		__debugInfo = "133:\src\DocParser.gbas";
		if ((((((func7_IsToken("MODULE")) || (func7_IsToken("FUNCTION"))) ? 1 : 0)) ? 0 : 1)) {
			__debugInfo = "133:\src\DocParser.gbas";
			func5_Error("Unknown ?DOC", 132, "src\DocParser.gbas");
			__debugInfo = "133:\src\DocParser.gbas";
		};
		__debugInfo = "134:\src\DocParser.gbas";
		local8_name_Str_2595 = "";
		__debugInfo = "140:\src\DocParser.gbas";
		do {
			__debugInfo = "136:\src\DocParser.gbas";
			func13_RemoveCurrent();
			__debugInfo = "137:\src\DocParser.gbas";
			if ((((local8_name_Str_2595) !== ("")) ? 1 : 0)) {
				__debugInfo = "137:\src\DocParser.gbas";
				local8_name_Str_2595 = ((local8_name_Str_2595) + ("."));
				__debugInfo = "137:\src\DocParser.gbas";
			};
			__debugInfo = "138:\src\DocParser.gbas";
			local8_name_Str_2595 = ((local8_name_Str_2595) + (func14_GetCurrent_Str()));
			__debugInfo = "139:\src\DocParser.gbas";
			func13_RemoveCurrent();
			__debugInfo = "136:\src\DocParser.gbas";
		} while (!(((func7_IsToken(".")) ? 0 : 1)));
		__debugInfo = "141:\src\DocParser.gbas";
		local3_doc_2594.attr8_name_Str = local8_name_Str_2595;
		__debugInfo = "143:\src\DocParser.gbas";
		func11_RemoveAllNL();
		__debugInfo = "186:\src\DocParser.gbas";
		while ((((func8_EOFParse()) === (1)) ? 1 : 0)) {
			__debugInfo = "146:\src\DocParser.gbas";
			func14_MatchAndRemove("?", 145, "src\DocParser.gbas");
			__debugInfo = "147:\src\DocParser.gbas";
			{
				var local17___SelectHelper44__2596 = "";
				__debugInfo = "147:\src\DocParser.gbas";
				local17___SelectHelper44__2596 = func14_GetCurrent_Str();
				__debugInfo = "183:\src\DocParser.gbas";
				if ((((local17___SelectHelper44__2596) === ("PARAM")) ? 1 : 0)) {
					var local5_param_2597 = pool_ParamElement.alloc();
					__debugInfo = "149:\src\DocParser.gbas";
					func13_RemoveCurrent();
					__debugInfo = "151:\src\DocParser.gbas";
					local5_param_2597.attr8_name_Str = func14_GetCurrent_Str();
					__debugInfo = "152:\src\DocParser.gbas";
					func13_RemoveCurrent();
					__debugInfo = "153:\src\DocParser.gbas";
					func14_MatchAndRemove("\n", 152, "src\DocParser.gbas");
					__debugInfo = "155:\src\DocParser.gbas";
					func12_ParseDocLang(unref(local5_param_2597.attr4_desc), "ENDPARAM");
					__debugInfo = "157:\src\DocParser.gbas";
					DIMPUSH(local3_doc_2594.attr6_params, local5_param_2597);
					__debugInfo = "149:\src\DocParser.gbas";pool_ParamElement.free(local5_param_2597);
				} else if ((((local17___SelectHelper44__2596) === ("DESC")) ? 1 : 0)) {
					__debugInfo = "159:\src\DocParser.gbas";
					func13_RemoveCurrent();
					__debugInfo = "160:\src\DocParser.gbas";
					func14_MatchAndRemove("\n", 159, "src\DocParser.gbas");
					__debugInfo = "162:\src\DocParser.gbas";
					func12_ParseDocLang(unref(local3_doc_2594.attr4_desc), "ENDDESC");
					__debugInfo = "159:\src\DocParser.gbas";
				} else if ((((local17___SelectHelper44__2596) === ("EXAMPLE")) ? 1 : 0)) {
					__debugInfo = "164:\src\DocParser.gbas";
					func13_RemoveCurrent();
					__debugInfo = "165:\src\DocParser.gbas";
					func14_MatchAndRemove("\n", 164, "src\DocParser.gbas");
					__debugInfo = "167:\src\DocParser.gbas";
					func12_ParseDocLang(unref(local3_doc_2594.attr7_example), "ENDEXAMPLE");
					__debugInfo = "164:\src\DocParser.gbas";
				} else if ((((local17___SelectHelper44__2596) === ("SEE")) ? 1 : 0)) {
					__debugInfo = "169:\src\DocParser.gbas";
					func13_RemoveCurrent();
					__debugInfo = "174:\src\DocParser.gbas";
					do {
						__debugInfo = "172:\src\DocParser.gbas";
						DIMPUSH(local3_doc_2594.attr7_see_Str, func14_GetCurrent_Str());
						__debugInfo = "173:\src\DocParser.gbas";
						func13_RemoveCurrent();
						__debugInfo = "172:\src\DocParser.gbas";
					} while (!(func7_IsToken("\n")));
					__debugInfo = "169:\src\DocParser.gbas";
				} else if ((((local17___SelectHelper44__2596) === ("MODULE")) ? 1 : 0)) {
					__debugInfo = "176:\src\DocParser.gbas";
					func13_RemoveCurrent();
					__debugInfo = "177:\src\DocParser.gbas";
					local3_doc_2594.attr10_module_Str = func14_GetCurrent_Str();
					__debugInfo = "178:\src\DocParser.gbas";
					func13_RemoveCurrent();
					__debugInfo = "179:\src\DocParser.gbas";
					func14_MatchAndRemove("\n", 178, "src\DocParser.gbas");
					__debugInfo = "176:\src\DocParser.gbas";
				} else if ((((local17___SelectHelper44__2596) === ("ENDDOC")) ? 1 : 0)) {
					__debugInfo = "181:\src\DocParser.gbas";
					func13_RemoveCurrent();
					__debugInfo = "182:\src\DocParser.gbas";
					break;
					__debugInfo = "181:\src\DocParser.gbas";
				};
				__debugInfo = "147:\src\DocParser.gbas";
			};
			__debugInfo = "185:\src\DocParser.gbas";
			func11_RemoveAllNL();
			__debugInfo = "146:\src\DocParser.gbas";
		};
		__debugInfo = "188:\src\DocParser.gbas";
		DIMPUSH(global14_Documentations, local3_doc_2594);
		__debugInfo = "189:\src\DocParser.gbas";
		return 0;
		__debugInfo = "132:\src\DocParser.gbas";pool_Documentation.free(local3_doc_2594);
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func8_ParseDoc = window['func8_ParseDoc'];
window['func12_ParseDocLang'] = function(param5_langs, param12_endToken_Str) {
	stackPush("function: ParseDocLang", __debugInfo);
	try {
		__debugInfo = "211:\src\DocParser.gbas";
		while (func7_IsToken("?")) {
			var local1_l_2600 = pool_LangElement.alloc(), local8_lang_Str_2601 = "", local8_text_Str_2602 = "";
			__debugInfo = "194:\src\DocParser.gbas";
			func13_RemoveCurrent();
			__debugInfo = "198:\src\DocParser.gbas";
			if (func7_IsToken(param12_endToken_Str)) {
				__debugInfo = "196:\src\DocParser.gbas";
				func13_RemoveCurrent();
				__debugInfo = "197:\src\DocParser.gbas";
				return 0;
				__debugInfo = "196:\src\DocParser.gbas";
			};
			__debugInfo = "199:\src\DocParser.gbas";
			func14_MatchAndRemove("LANG", 198, "src\DocParser.gbas");
			__debugInfo = "200:\src\DocParser.gbas";
			local8_lang_Str_2601 = func14_GetCurrent_Str();
			__debugInfo = "201:\src\DocParser.gbas";
			func13_RemoveCurrent();
			__debugInfo = "202:\src\DocParser.gbas";
			local8_text_Str_2602 = MID_Str(func14_GetCurrent_Str(), 1, (((func14_GetCurrent_Str()).length) - (2)));
			__debugInfo = "203:\src\DocParser.gbas";
			func13_RemoveCurrent();
			__debugInfo = "205:\src\DocParser.gbas";
			local1_l_2600.attr8_lang_Str = local8_lang_Str_2601;
			__debugInfo = "206:\src\DocParser.gbas";
			local1_l_2600.attr8_desc_Str = REPLACE_Str(local8_text_Str_2602, (("\\") + ("\"")), "\"");
			__debugInfo = "208:\src\DocParser.gbas";
			DIMPUSH(param5_langs, local1_l_2600);
			__debugInfo = "210:\src\DocParser.gbas";
			func11_RemoveAllNL();
			__debugInfo = "194:\src\DocParser.gbas";pool_LangElement.free(local1_l_2600);
		};
		__debugInfo = "222:\src\DocParser.gbas";
		if ((((BOUNDS(param5_langs, 0)) === (1)) ? 1 : 0)) {
			var local2_l2_2603 = pool_LangElement.alloc();
			__debugInfo = "215:\src\DocParser.gbas";
			local2_l2_2603 = param5_langs.arrAccess(0).values[tmpPositionCache].clone(/* In Assign */);
			__debugInfo = "220:\src\DocParser.gbas";
			if ((((local2_l2_2603.attr8_lang_Str) === ("EN")) ? 1 : 0)) {
				__debugInfo = "217:\src\DocParser.gbas";
				local2_l2_2603.attr8_lang_Str = "DE";
				__debugInfo = "217:\src\DocParser.gbas";
			} else {
				__debugInfo = "219:\src\DocParser.gbas";
				local2_l2_2603.attr8_lang_Str = "EN";
				__debugInfo = "219:\src\DocParser.gbas";
			};
			__debugInfo = "221:\src\DocParser.gbas";
			DIMPUSH(param5_langs, local2_l2_2603);
			__debugInfo = "215:\src\DocParser.gbas";pool_LangElement.free(local2_l2_2603);
		};
		__debugInfo = "223:\src\DocParser.gbas";
		return 0;
		__debugInfo = "211:\src\DocParser.gbas";pool_array.free(param5_langs);
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func12_ParseDocLang = window['func12_ParseDocLang'];
window['func11_RemoveAllNL'] = function() {
	stackPush("function: RemoveAllNL", __debugInfo);
	try {
		__debugInfo = "226:\src\DocParser.gbas";
		func14_MatchAndRemove("\n", 225, "src\DocParser.gbas");
		__debugInfo = "229:\src\DocParser.gbas";
		while (func7_IsToken("\n")) {
			__debugInfo = "228:\src\DocParser.gbas";
			func14_MatchAndRemove("\n", 227, "src\DocParser.gbas");
			__debugInfo = "228:\src\DocParser.gbas";
		};
		__debugInfo = "230:\src\DocParser.gbas";
		return 0;
		__debugInfo = "226:\src\DocParser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func11_RemoveAllNL = window['func11_RemoveAllNL'];
window['func16_CreateExpression'] = function(param3_Typ, param8_datatype) {
	stackPush("function: CreateExpression", __debugInfo);
	try {
		var local4_tmpD_2606 = pool_TDatatype.alloc(), local3_pos_2607 = 0.0, local1_d_2608 = pool_TDatatype.alloc();
		__debugInfo = "175:\src\Expression.gbas";
		local4_tmpD_2606 = param8_datatype.clone(/* In Assign */);
		__debugInfo = "180:\src\Expression.gbas";
		local3_pos_2607 = global10_LastExprID;
		__debugInfo = "181:\src\Expression.gbas";
		global10_LastExprID = ((global10_LastExprID) + (1));
		__debugInfo = "188:\src\Expression.gbas";
		if ((((global10_LastExprID) >= (((BOUNDS(global5_Exprs_ref[0], 0)) - (10)))) ? 1 : 0)) {
			__debugInfo = "186:\src\Expression.gbas";
			REDIM(unref(global5_Exprs_ref[0]), [~~(((global10_LastExprID) + (50)))], [pool_TExpr.alloc()] );
			__debugInfo = "186:\src\Expression.gbas";
		};
		__debugInfo = "189:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(~~(local3_pos_2607)).values[tmpPositionCache][0].attr3_Typ = param3_Typ;
		__debugInfo = "192:\src\Expression.gbas";
		local1_d_2608.attr8_Name_Str = local4_tmpD_2606.attr8_Name_Str;
		__debugInfo = "193:\src\Expression.gbas";
		local1_d_2608.attr7_IsArray = local4_tmpD_2606.attr7_IsArray;
		__debugInfo = "194:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(~~(local3_pos_2607)).values[tmpPositionCache][0].attr8_datatype = local1_d_2608.clone(/* In Assign */);
		__debugInfo = "195:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(~~(local3_pos_2607)).values[tmpPositionCache][0].attr2_ID = ~~(local3_pos_2607);
		__debugInfo = "196:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(~~(local3_pos_2607)).values[tmpPositionCache][0].attr5_tokID = global8_Compiler.attr11_currentPosi;
		__debugInfo = "197:\src\Expression.gbas";
		return tryClone(~~(local3_pos_2607));
		__debugInfo = "198:\src\Expression.gbas";
		return 0;
		__debugInfo = "175:\src\Expression.gbas";pool_TDatatype.free(local4_tmpD_2606);pool_TDatatype.free(local1_d_2608);
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func16_CreateExpression = window['func16_CreateExpression'];
window['func24_CreateOperatorExpression'] = function(param2_Op, param4_Left, param5_Right) {
	stackPush("function: CreateOperatorExpression", __debugInfo);
	try {
		var local4_Expr_2612 = 0, local8_datatype_2613 = pool_TDatatype.alloc();
		var local4_Left_ref_2610 = [param4_Left];
		var local5_Right_ref_2611 = [param5_Right];
		__debugInfo = "204:\src\Expression.gbas";
		local8_datatype_2613 = func12_CastDatatype(local4_Left_ref_2610, local5_Right_ref_2611).clone(/* In Assign */);
		__debugInfo = "209:\src\Expression.gbas";
		if ((((param2_Op.attr3_Typ) === (3)) ? 1 : 0)) {
			__debugInfo = "208:\src\Expression.gbas";
			local8_datatype_2613 = global11_intDatatype.clone(/* In Assign */);
			__debugInfo = "208:\src\Expression.gbas";
		};
		__debugInfo = "211:\src\Expression.gbas";
		local4_Expr_2612 = func16_CreateExpression(~~(1), local8_datatype_2613);
		__debugInfo = "212:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2612).values[tmpPositionCache][0].attr4_Left = local4_Left_ref_2610[0];
		__debugInfo = "213:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2612).values[tmpPositionCache][0].attr5_Right = local5_Right_ref_2611[0];
		__debugInfo = "214:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2612).values[tmpPositionCache][0].attr2_Op = param2_Op.attr2_ID;
		__debugInfo = "217:\src\Expression.gbas";
		return tryClone(local4_Expr_2612);
		__debugInfo = "218:\src\Expression.gbas";
		return 0;
		__debugInfo = "204:\src\Expression.gbas";pool_TDatatype.free(local8_datatype_2613);
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func24_CreateOperatorExpression = window['func24_CreateOperatorExpression'];
window['func19_CreateIntExpression'] = function(param3_Num) {
	stackPush("function: CreateIntExpression", __debugInfo);
	try {
		var local4_Expr_2615 = 0;
		__debugInfo = "223:\src\Expression.gbas";
		local4_Expr_2615 = func16_CreateExpression(~~(3), global11_intDatatype);
		__debugInfo = "224:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2615).values[tmpPositionCache][0].attr6_intval = param3_Num;
		__debugInfo = "225:\src\Expression.gbas";
		return tryClone(local4_Expr_2615);
		__debugInfo = "226:\src\Expression.gbas";
		return 0;
		__debugInfo = "223:\src\Expression.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func19_CreateIntExpression = window['func19_CreateIntExpression'];
window['func21_CreateFloatExpression'] = function(param3_Num) {
	stackPush("function: CreateFloatExpression", __debugInfo);
	try {
		var local4_Expr_2617 = 0;
		__debugInfo = "231:\src\Expression.gbas";
		local4_Expr_2617 = func16_CreateExpression(~~(4), global13_floatDatatype);
		__debugInfo = "232:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2617).values[tmpPositionCache][0].attr8_floatval = param3_Num;
		__debugInfo = "233:\src\Expression.gbas";
		return tryClone(local4_Expr_2617);
		__debugInfo = "234:\src\Expression.gbas";
		return 0;
		__debugInfo = "231:\src\Expression.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func21_CreateFloatExpression = window['func21_CreateFloatExpression'];
window['func19_CreateStrExpression'] = function(param7_Str_Str) {
	stackPush("function: CreateStrExpression", __debugInfo);
	try {
		var local4_Expr_2619 = 0;
		__debugInfo = "238:\src\Expression.gbas";
		local4_Expr_2619 = func16_CreateExpression(~~(5), global11_strDatatype);
		__debugInfo = "239:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2619).values[tmpPositionCache][0].attr10_strval_Str = param7_Str_Str;
		__debugInfo = "240:\src\Expression.gbas";
		return tryClone(local4_Expr_2619);
		__debugInfo = "241:\src\Expression.gbas";
		return 0;
		__debugInfo = "238:\src\Expression.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func19_CreateStrExpression = window['func19_CreateStrExpression'];
window['func21_CreateScopeExpression'] = function(param6_ScpTyp) {
	stackPush("function: CreateScopeExpression", __debugInfo);
	try {
		var local3_Scp_2621 = 0;
		__debugInfo = "245:\src\Expression.gbas";
		local3_Scp_2621 = func16_CreateExpression(~~(2), global12_voidDatatype);
		__debugInfo = "246:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local3_Scp_2621).values[tmpPositionCache][0].attr10_SuperScope = global8_Compiler.attr12_CurrentScope;
		__debugInfo = "247:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local3_Scp_2621).values[tmpPositionCache][0].attr6_ScpTyp = param6_ScpTyp;
		__debugInfo = "249:\src\Expression.gbas";
		return tryClone(local3_Scp_2621);
		__debugInfo = "250:\src\Expression.gbas";
		return 0;
		__debugInfo = "245:\src\Expression.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func21_CreateScopeExpression = window['func21_CreateScopeExpression'];
window['func24_CreateFuncCallExpression'] = function(param4_func, param6_Params) {
	stackPush("function: CreateFuncCallExpression", __debugInfo);
	try {
		var local4_Expr_2624 = 0;
		__debugInfo = "256:\src\Expression.gbas";
		local4_Expr_2624 = func16_CreateExpression(~~(6), global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr8_datatype);
		__debugInfo = "257:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2624).values[tmpPositionCache][0].attr6_Params = param6_Params.clone(/* In Assign */);
		__debugInfo = "258:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2624).values[tmpPositionCache][0].attr4_func = param4_func;
		__debugInfo = "259:\src\Expression.gbas";
		return tryClone(local4_Expr_2624);
		__debugInfo = "260:\src\Expression.gbas";
		return 0;
		__debugInfo = "256:\src\Expression.gbas";pool_array.free(param6_Params);
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func24_CreateFuncCallExpression = window['func24_CreateFuncCallExpression'];
window['func21_CreateEmptyExpression'] = function() {
	stackPush("function: CreateEmptyExpression", __debugInfo);
	try {
		__debugInfo = "264:\src\Expression.gbas";
		return tryClone(func16_CreateExpression(~~(7), global12_voidDatatype));
		__debugInfo = "265:\src\Expression.gbas";
		return 0;
		__debugInfo = "264:\src\Expression.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func21_CreateEmptyExpression = window['func21_CreateEmptyExpression'];
window['func21_CreateDebugExpression'] = function() {
	stackPush("function: CreateDebugExpression", __debugInfo);
	try {
		__debugInfo = "269:\src\Expression.gbas";
		return tryClone(func16_CreateExpression(~~(8), global12_voidDatatype));
		__debugInfo = "270:\src\Expression.gbas";
		return 0;
		__debugInfo = "269:\src\Expression.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func21_CreateDebugExpression = window['func21_CreateDebugExpression'];
window['func24_CreateVariableExpression'] = function(param4_vari) {
	stackPush("function: CreateVariableExpression", __debugInfo);
	try {
		__debugInfo = "280:\src\Expression.gbas";
		if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_vari).values[tmpPositionCache][0].attr3_Typ) === (6)) ? 1 : 0)) {
			__debugInfo = "275:\src\Expression.gbas";
			return tryClone(global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_vari).values[tmpPositionCache][0].attr6_PreDef);
			__debugInfo = "275:\src\Expression.gbas";
		} else {
			var local4_Expr_2626 = 0;
			__debugInfo = "277:\src\Expression.gbas";
			local4_Expr_2626 = func16_CreateExpression(~~(9), global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_vari).values[tmpPositionCache][0].attr8_datatype);
			__debugInfo = "278:\src\Expression.gbas";
			global5_Exprs_ref[0].arrAccess(local4_Expr_2626).values[tmpPositionCache][0].attr4_vari = param4_vari;
			__debugInfo = "279:\src\Expression.gbas";
			return tryClone(local4_Expr_2626);
			__debugInfo = "277:\src\Expression.gbas";
		};
		__debugInfo = "281:\src\Expression.gbas";
		return 0;
		__debugInfo = "280:\src\Expression.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func24_CreateVariableExpression = window['func24_CreateVariableExpression'];
window['func22_CreateAssignExpression'] = function(param4_Vari, param5_Right) {
	stackPush("function: CreateAssignExpression", __debugInfo);
	try {
		var local4_Expr_2629 = 0;
		__debugInfo = "285:\src\Expression.gbas";
		local4_Expr_2629 = func16_CreateExpression(~~(10), global12_voidDatatype);
		__debugInfo = "286:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2629).values[tmpPositionCache][0].attr4_vari = param4_Vari;
		__debugInfo = "287:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2629).values[tmpPositionCache][0].attr5_Right = param5_Right;
		__debugInfo = "288:\src\Expression.gbas";
		return tryClone(local4_Expr_2629);
		__debugInfo = "289:\src\Expression.gbas";
		return 0;
		__debugInfo = "285:\src\Expression.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func22_CreateAssignExpression = window['func22_CreateAssignExpression'];
window['func19_CreateDimExpression'] = function(param5_Array, param4_Dims) {
	stackPush("function: CreateDimExpression", __debugInfo);
	try {
		var local4_Expr_2632 = 0;
		__debugInfo = "294:\src\Expression.gbas";
		local4_Expr_2632 = func16_CreateExpression(~~(11), global5_Exprs_ref[0].arrAccess(param5_Array).values[tmpPositionCache][0].attr8_datatype);
		__debugInfo = "295:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2632).values[tmpPositionCache][0].attr5_array = param5_Array;
		__debugInfo = "296:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2632).values[tmpPositionCache][0].attr4_dims = param4_Dims.clone(/* In Assign */);
		__debugInfo = "298:\src\Expression.gbas";
		return tryClone(local4_Expr_2632);
		__debugInfo = "299:\src\Expression.gbas";
		return 0;
		__debugInfo = "294:\src\Expression.gbas";pool_array.free(param4_Dims);
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func19_CreateDimExpression = window['func19_CreateDimExpression'];
window['func21_CreateReDimExpression'] = function(param5_Array, param4_Dims) {
	stackPush("function: CreateReDimExpression", __debugInfo);
	try {
		var local4_Expr_2635 = 0;
		__debugInfo = "305:\src\Expression.gbas";
		local4_Expr_2635 = func16_CreateExpression(~~(12), global5_Exprs_ref[0].arrAccess(param5_Array).values[tmpPositionCache][0].attr8_datatype);
		__debugInfo = "306:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2635).values[tmpPositionCache][0].attr5_array = param5_Array;
		__debugInfo = "307:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2635).values[tmpPositionCache][0].attr4_dims = param4_Dims.clone(/* In Assign */);
		__debugInfo = "309:\src\Expression.gbas";
		return tryClone(local4_Expr_2635);
		__debugInfo = "310:\src\Expression.gbas";
		return 0;
		__debugInfo = "305:\src\Expression.gbas";pool_array.free(param4_Dims);
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func21_CreateReDimExpression = window['func21_CreateReDimExpression'];
window['func21_CreateArrayExpression'] = function(param5_Array, param4_Dims) {
	stackPush("function: CreateArrayExpression", __debugInfo);
	try {
		var local7_tmpData_2638 = pool_TDatatype.alloc(), local4_Expr_2639 = 0;
		__debugInfo = "316:\src\Expression.gbas";
		local7_tmpData_2638 = global5_Exprs_ref[0].arrAccess(param5_Array).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
		__debugInfo = "317:\src\Expression.gbas";
		if (((((((global5_Exprs_ref[0].arrAccess(param5_Array).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) && (global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(param5_Array, 1)).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray)) ? 1 : 0)) && (BOUNDS(param4_Dims, 0))) ? 1 : 0)) {
			__debugInfo = "317:\src\Expression.gbas";
			local7_tmpData_2638.attr7_IsArray = 0;
			__debugInfo = "317:\src\Expression.gbas";
		};
		__debugInfo = "318:\src\Expression.gbas";
		local4_Expr_2639 = func16_CreateExpression(~~(13), local7_tmpData_2638);
		__debugInfo = "319:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2639).values[tmpPositionCache][0].attr5_array = param5_Array;
		__debugInfo = "320:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2639).values[tmpPositionCache][0].attr4_dims = param4_Dims.clone(/* In Assign */);
		__debugInfo = "321:\src\Expression.gbas";
		return tryClone(local4_Expr_2639);
		__debugInfo = "322:\src\Expression.gbas";
		return 0;
		__debugInfo = "316:\src\Expression.gbas";pool_array.free(param4_Dims);pool_TDatatype.free(local7_tmpData_2638);
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func21_CreateArrayExpression = window['func21_CreateArrayExpression'];
window['func24_CreateCast2IntExpression'] = function(param4_expr) {
	stackPush("function: CreateCast2IntExpression", __debugInfo);
	try {
		var local4_Expr_2641 = 0;
		__debugInfo = "327:\src\Expression.gbas";
		local4_Expr_2641 = func16_CreateExpression(~~(15), global11_intDatatype);
		__debugInfo = "328:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2641).values[tmpPositionCache][0].attr4_expr = param4_expr;
		__debugInfo = "329:\src\Expression.gbas";
		return tryClone(local4_Expr_2641);
		__debugInfo = "330:\src\Expression.gbas";
		return 0;
		__debugInfo = "327:\src\Expression.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func24_CreateCast2IntExpression = window['func24_CreateCast2IntExpression'];
window['func26_CreateCast2FloatExpression'] = function(param4_expr) {
	stackPush("function: CreateCast2FloatExpression", __debugInfo);
	try {
		var local4_Expr_2643 = 0;
		__debugInfo = "334:\src\Expression.gbas";
		local4_Expr_2643 = func16_CreateExpression(~~(16), global13_floatDatatype);
		__debugInfo = "335:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2643).values[tmpPositionCache][0].attr4_expr = param4_expr;
		__debugInfo = "336:\src\Expression.gbas";
		return tryClone(local4_Expr_2643);
		__debugInfo = "337:\src\Expression.gbas";
		return 0;
		__debugInfo = "334:\src\Expression.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func26_CreateCast2FloatExpression = window['func26_CreateCast2FloatExpression'];
window['func27_CreateCast2StringExpression'] = function(param4_expr) {
	stackPush("function: CreateCast2StringExpression", __debugInfo);
	try {
		var local4_Expr_2645 = 0;
		__debugInfo = "341:\src\Expression.gbas";
		local4_Expr_2645 = func16_CreateExpression(~~(17), global11_strDatatype);
		__debugInfo = "342:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2645).values[tmpPositionCache][0].attr4_expr = param4_expr;
		__debugInfo = "343:\src\Expression.gbas";
		return tryClone(local4_Expr_2645);
		__debugInfo = "344:\src\Expression.gbas";
		return 0;
		__debugInfo = "341:\src\Expression.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func27_CreateCast2StringExpression = window['func27_CreateCast2StringExpression'];
window['func22_CreateAccessExpression'] = function(param4_expr, param8_NextExpr) {
	stackPush("function: CreateAccessExpression", __debugInfo);
	try {
		__debugInfo = "348:\src\Expression.gbas";
		if (((((((param4_expr) === (param8_NextExpr)) ? 1 : 0)) && ((((param4_expr) === (-(1))) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "348:\src\Expression.gbas";
			func5_Error("Internal error (expr and nextexpr = -1)", 347, "src\Expression.gbas");
			__debugInfo = "348:\src\Expression.gbas";
		};
		__debugInfo = "366:\src\Expression.gbas";
		if ((((param4_expr) === (-(1))) ? 1 : 0)) {
			__debugInfo = "350:\src\Expression.gbas";
			return tryClone(param8_NextExpr);
			__debugInfo = "350:\src\Expression.gbas";
		} else if ((((param8_NextExpr) === (-(1))) ? 1 : 0)) {
			__debugInfo = "352:\src\Expression.gbas";
			return tryClone(param4_expr);
			__debugInfo = "352:\src\Expression.gbas";
		} else {
			var local9_ONextExpr_2648 = 0;
			__debugInfo = "354:\src\Expression.gbas";
			local9_ONextExpr_2648 = param8_NextExpr;
			__debugInfo = "355:\src\Expression.gbas";
			if ((((global5_Exprs_ref[0].arrAccess(param8_NextExpr).values[tmpPositionCache][0].attr3_Typ) === (13)) ? 1 : 0)) {
				__debugInfo = "355:\src\Expression.gbas";
				param8_NextExpr = global5_Exprs_ref[0].arrAccess(param8_NextExpr).values[tmpPositionCache][0].attr5_array;
				__debugInfo = "355:\src\Expression.gbas";
			};
			__debugInfo = "365:\src\Expression.gbas";
			if ((((global5_Exprs_ref[0].arrAccess(param8_NextExpr).values[tmpPositionCache][0].attr3_Typ) === (6)) ? 1 : 0)) {
				__debugInfo = "357:\src\Expression.gbas";
				DIMPUSH(global5_Exprs_ref[0].arrAccess(param8_NextExpr).values[tmpPositionCache][0].attr6_Params, param4_expr);
				__debugInfo = "358:\src\Expression.gbas";
				return tryClone(local9_ONextExpr_2648);
				__debugInfo = "357:\src\Expression.gbas";
			} else {
				var local4_Expr_2649 = 0;
				__debugInfo = "360:\src\Expression.gbas";
				param8_NextExpr = local9_ONextExpr_2648;
				__debugInfo = "361:\src\Expression.gbas";
				local4_Expr_2649 = func16_CreateExpression(~~(18), global5_Exprs_ref[0].arrAccess(param8_NextExpr).values[tmpPositionCache][0].attr8_datatype);
				__debugInfo = "362:\src\Expression.gbas";
				global5_Exprs_ref[0].arrAccess(local4_Expr_2649).values[tmpPositionCache][0].attr4_expr = param4_expr;
				__debugInfo = "363:\src\Expression.gbas";
				global5_Exprs_ref[0].arrAccess(local4_Expr_2649).values[tmpPositionCache][0].attr8_nextExpr = param8_NextExpr;
				__debugInfo = "364:\src\Expression.gbas";
				return tryClone(local4_Expr_2649);
				__debugInfo = "360:\src\Expression.gbas";
			};
			__debugInfo = "354:\src\Expression.gbas";
		};
		__debugInfo = "367:\src\Expression.gbas";
		return 0;
		__debugInfo = "348:\src\Expression.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func22_CreateAccessExpression = window['func22_CreateAccessExpression'];
window['func22_CreateReturnExpression'] = function(param4_expr) {
	stackPush("function: CreateReturnExpression", __debugInfo);
	try {
		var local4_Expr_2651 = 0;
		__debugInfo = "371:\src\Expression.gbas";
		local4_Expr_2651 = func16_CreateExpression(~~(19), global12_voidDatatype);
		__debugInfo = "372:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2651).values[tmpPositionCache][0].attr4_expr = param4_expr;
		__debugInfo = "374:\src\Expression.gbas";
		return tryClone(local4_Expr_2651);
		__debugInfo = "375:\src\Expression.gbas";
		return 0;
		__debugInfo = "371:\src\Expression.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func22_CreateReturnExpression = window['func22_CreateReturnExpression'];
window['func20_CreateGotoExpression'] = function(param8_Name_Str) {
	stackPush("function: CreateGotoExpression", __debugInfo);
	try {
		var local4_Expr_2653 = 0;
		__debugInfo = "379:\src\Expression.gbas";
		local4_Expr_2653 = func16_CreateExpression(~~(20), global12_voidDatatype);
		__debugInfo = "380:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2653).values[tmpPositionCache][0].attr8_Name_Str = param8_Name_Str;
		__debugInfo = "381:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2653).values[tmpPositionCache][0].attr3_Scp = global8_Compiler.attr12_CurrentScope;
		__debugInfo = "382:\src\Expression.gbas";
		return tryClone(local4_Expr_2653);
		__debugInfo = "383:\src\Expression.gbas";
		return 0;
		__debugInfo = "379:\src\Expression.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func20_CreateGotoExpression = window['func20_CreateGotoExpression'];
window['func21_CreateLabelExpression'] = function(param8_Name_Str) {
	stackPush("function: CreateLabelExpression", __debugInfo);
	try {
		var local4_Expr_2655 = 0;
		__debugInfo = "387:\src\Expression.gbas";
		local4_Expr_2655 = func16_CreateExpression(~~(21), global12_voidDatatype);
		__debugInfo = "388:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2655).values[tmpPositionCache][0].attr8_Name_Str = param8_Name_Str;
		__debugInfo = "389:\src\Expression.gbas";
		return tryClone(local4_Expr_2655);
		__debugInfo = "390:\src\Expression.gbas";
		return 0;
		__debugInfo = "387:\src\Expression.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func21_CreateLabelExpression = window['func21_CreateLabelExpression'];
window['func24_CreateFuncDataExpression'] = function(param1_d) {
	stackPush("function: CreateFuncDataExpression", __debugInfo);
	try {
		__debugInfo = "394:\src\Expression.gbas";
		return tryClone(func16_CreateExpression(~~(22), param1_d));
		__debugInfo = "395:\src\Expression.gbas";
		return 0;
		__debugInfo = "394:\src\Expression.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func24_CreateFuncDataExpression = window['func24_CreateFuncDataExpression'];
window['func25_CreateProtoCallExpression'] = function(param4_expr, param6_Params) {
	stackPush("function: CreateProtoCallExpression", __debugInfo);
	try {
		var local4_Func_2659 = 0, local4_Expr_2660 = 0;
		__debugInfo = "399:\src\Expression.gbas";
		local4_Func_2659 = func14_SearchPrototyp(global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str);
		__debugInfo = "400:\src\Expression.gbas";
		if ((((local4_Func_2659) === (-(1))) ? 1 : 0)) {
			__debugInfo = "400:\src\Expression.gbas";
			func5_Error((((("Internal error (could not find prototype: ") + (global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) + (")")), 399, "src\Expression.gbas");
			__debugInfo = "400:\src\Expression.gbas";
		};
		__debugInfo = "401:\src\Expression.gbas";
		local4_Expr_2660 = func16_CreateExpression(~~(23), global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr8_datatype);
		__debugInfo = "402:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2660).values[tmpPositionCache][0].attr4_expr = param4_expr;
		__debugInfo = "403:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2660).values[tmpPositionCache][0].attr6_Params = param6_Params.clone(/* In Assign */);
		__debugInfo = "404:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2660).values[tmpPositionCache][0].attr4_func = local4_Func_2659;
		__debugInfo = "405:\src\Expression.gbas";
		return tryClone(local4_Expr_2660);
		__debugInfo = "406:\src\Expression.gbas";
		return 0;
		__debugInfo = "399:\src\Expression.gbas";pool_array.free(param6_Params);
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func25_CreateProtoCallExpression = window['func25_CreateProtoCallExpression'];
window['func18_CreateIfExpression'] = function(param5_Conds, param4_Scps, param7_elseScp) {
	stackPush("function: CreateIfExpression", __debugInfo);
	try {
		var local4_Expr_2664 = 0;
		__debugInfo = "410:\src\Expression.gbas";
		local4_Expr_2664 = func16_CreateExpression(~~(24), global12_voidDatatype);
		__debugInfo = "411:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2664).values[tmpPositionCache][0].attr10_Conditions = param5_Conds.clone(/* In Assign */);
		__debugInfo = "412:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2664).values[tmpPositionCache][0].attr6_Scopes = param4_Scps.clone(/* In Assign */);
		__debugInfo = "413:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2664).values[tmpPositionCache][0].attr9_elseScope = param7_elseScp;
		__debugInfo = "414:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2664).values[tmpPositionCache][0].attr5_dummy = func21_CreateDummyExpression();
		__debugInfo = "415:\src\Expression.gbas";
		return tryClone(local4_Expr_2664);
		__debugInfo = "416:\src\Expression.gbas";
		return 0;
		__debugInfo = "410:\src\Expression.gbas";pool_array.free(param4_Scps);
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func18_CreateIfExpression = window['func18_CreateIfExpression'];
window['func21_CreateWhileExpression'] = function(param4_expr, param3_Scp) {
	stackPush("function: CreateWhileExpression", __debugInfo);
	try {
		var local4_Expr_2667 = 0;
		__debugInfo = "420:\src\Expression.gbas";
		local4_Expr_2667 = func16_CreateExpression(~~(25), global12_voidDatatype);
		__debugInfo = "421:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2667).values[tmpPositionCache][0].attr4_expr = param4_expr;
		__debugInfo = "422:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2667).values[tmpPositionCache][0].attr3_Scp = param3_Scp;
		__debugInfo = "423:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2667).values[tmpPositionCache][0].attr5_dummy = func21_CreateDummyExpression();
		__debugInfo = "424:\src\Expression.gbas";
		return tryClone(local4_Expr_2667);
		__debugInfo = "425:\src\Expression.gbas";
		return 0;
		__debugInfo = "420:\src\Expression.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func21_CreateWhileExpression = window['func21_CreateWhileExpression'];
window['func22_CreateRepeatExpression'] = function(param4_expr, param3_Scp) {
	stackPush("function: CreateRepeatExpression", __debugInfo);
	try {
		var local4_Expr_2670 = 0;
		__debugInfo = "429:\src\Expression.gbas";
		local4_Expr_2670 = func16_CreateExpression(~~(26), global12_voidDatatype);
		__debugInfo = "430:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2670).values[tmpPositionCache][0].attr4_expr = param4_expr;
		__debugInfo = "431:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2670).values[tmpPositionCache][0].attr3_Scp = param3_Scp;
		__debugInfo = "432:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2670).values[tmpPositionCache][0].attr5_dummy = func21_CreateDummyExpression();
		__debugInfo = "433:\src\Expression.gbas";
		return tryClone(local4_Expr_2670);
		__debugInfo = "434:\src\Expression.gbas";
		return 0;
		__debugInfo = "429:\src\Expression.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func22_CreateRepeatExpression = window['func22_CreateRepeatExpression'];
window['func19_CreateForExpression'] = function(param7_varExpr, param6_toExpr, param8_stepExpr, param5_hasTo, param3_Scp) {
	stackPush("function: CreateForExpression", __debugInfo);
	try {
		var local4_Expr_2676 = 0;
		__debugInfo = "438:\src\Expression.gbas";
		local4_Expr_2676 = func16_CreateExpression(~~(27), global12_voidDatatype);
		__debugInfo = "439:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2676).values[tmpPositionCache][0].attr7_varExpr = param7_varExpr;
		__debugInfo = "440:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2676).values[tmpPositionCache][0].attr6_toExpr = param6_toExpr;
		__debugInfo = "441:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2676).values[tmpPositionCache][0].attr8_stepExpr = param8_stepExpr;
		__debugInfo = "442:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2676).values[tmpPositionCache][0].attr3_Scp = param3_Scp;
		__debugInfo = "443:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2676).values[tmpPositionCache][0].attr5_hasTo = param5_hasTo;
		__debugInfo = "444:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2676).values[tmpPositionCache][0].attr5_dummy = func21_CreateDummyExpression();
		__debugInfo = "445:\src\Expression.gbas";
		return tryClone(local4_Expr_2676);
		__debugInfo = "446:\src\Expression.gbas";
		return 0;
		__debugInfo = "438:\src\Expression.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func19_CreateForExpression = window['func19_CreateForExpression'];
window['func23_CreateForEachExpression'] = function(param7_varExpr, param6_inExpr, param3_Scp) {
	stackPush("function: CreateForEachExpression", __debugInfo);
	try {
		var local4_Expr_2680 = 0;
		__debugInfo = "450:\src\Expression.gbas";
		local4_Expr_2680 = func16_CreateExpression(~~(38), global12_voidDatatype);
		__debugInfo = "451:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2680).values[tmpPositionCache][0].attr7_varExpr = param7_varExpr;
		__debugInfo = "452:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2680).values[tmpPositionCache][0].attr6_inExpr = param6_inExpr;
		__debugInfo = "453:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2680).values[tmpPositionCache][0].attr3_Scp = param3_Scp;
		__debugInfo = "454:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2680).values[tmpPositionCache][0].attr5_dummy = func21_CreateDummyExpression();
		__debugInfo = "456:\src\Expression.gbas";
		return tryClone(local4_Expr_2680);
		__debugInfo = "457:\src\Expression.gbas";
		return 0;
		__debugInfo = "450:\src\Expression.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func23_CreateForEachExpression = window['func23_CreateForEachExpression'];
window['func21_CreateBreakExpression'] = function() {
	stackPush("function: CreateBreakExpression", __debugInfo);
	try {
		__debugInfo = "461:\src\Expression.gbas";
		return tryClone(func16_CreateExpression(~~(29), global12_voidDatatype));
		__debugInfo = "462:\src\Expression.gbas";
		return 0;
		__debugInfo = "461:\src\Expression.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func21_CreateBreakExpression = window['func21_CreateBreakExpression'];
window['func24_CreateContinueExpression'] = function() {
	stackPush("function: CreateContinueExpression", __debugInfo);
	try {
		__debugInfo = "466:\src\Expression.gbas";
		return tryClone(func16_CreateExpression(~~(30), global12_voidDatatype));
		__debugInfo = "467:\src\Expression.gbas";
		return 0;
		__debugInfo = "466:\src\Expression.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func24_CreateContinueExpression = window['func24_CreateContinueExpression'];
window['func19_CreateTryExpression'] = function(param6_tryScp, param7_ctchScp, param4_vari) {
	stackPush("function: CreateTryExpression", __debugInfo);
	try {
		var local4_Expr_2684 = 0;
		__debugInfo = "471:\src\Expression.gbas";
		local4_Expr_2684 = func16_CreateExpression(~~(31), global12_voidDatatype);
		__debugInfo = "472:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2684).values[tmpPositionCache][0].attr3_Scp = param6_tryScp;
		__debugInfo = "473:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2684).values[tmpPositionCache][0].attr8_catchScp = param7_ctchScp;
		__debugInfo = "474:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2684).values[tmpPositionCache][0].attr4_vari = param4_vari;
		__debugInfo = "476:\src\Expression.gbas";
		return tryClone(local4_Expr_2684);
		__debugInfo = "477:\src\Expression.gbas";
		return 0;
		__debugInfo = "471:\src\Expression.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func19_CreateTryExpression = window['func19_CreateTryExpression'];
window['func21_CreateThrowExpression'] = function(param5_value) {
	stackPush("function: CreateThrowExpression", __debugInfo);
	try {
		var local4_Expr_2686 = 0;
		__debugInfo = "481:\src\Expression.gbas";
		local4_Expr_2686 = func16_CreateExpression(~~(32), global12_voidDatatype);
		__debugInfo = "482:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2686).values[tmpPositionCache][0].attr4_expr = param5_value;
		__debugInfo = "483:\src\Expression.gbas";
		return tryClone(local4_Expr_2686);
		__debugInfo = "484:\src\Expression.gbas";
		return 0;
		__debugInfo = "481:\src\Expression.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func21_CreateThrowExpression = window['func21_CreateThrowExpression'];
window['func23_CreateRestoreExpression'] = function(param8_Name_Str) {
	stackPush("function: CreateRestoreExpression", __debugInfo);
	try {
		var local4_Expr_2688 = 0;
		__debugInfo = "488:\src\Expression.gbas";
		local4_Expr_2688 = func16_CreateExpression(~~(33), global12_voidDatatype);
		__debugInfo = "489:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2688).values[tmpPositionCache][0].attr8_Name_Str = param8_Name_Str;
		__debugInfo = "490:\src\Expression.gbas";
		return tryClone(local4_Expr_2688);
		__debugInfo = "491:\src\Expression.gbas";
		return 0;
		__debugInfo = "488:\src\Expression.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func23_CreateRestoreExpression = window['func23_CreateRestoreExpression'];
window['func20_CreateReadExpression'] = function(param5_Reads) {
	stackPush("function: CreateReadExpression", __debugInfo);
	try {
		var local4_Expr_2690 = 0;
		__debugInfo = "495:\src\Expression.gbas";
		local4_Expr_2690 = func16_CreateExpression(~~(34), global12_voidDatatype);
		__debugInfo = "496:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2690).values[tmpPositionCache][0].attr5_Reads = param5_Reads.clone(/* In Assign */);
		__debugInfo = "497:\src\Expression.gbas";
		return tryClone(local4_Expr_2690);
		__debugInfo = "498:\src\Expression.gbas";
		return 0;
		__debugInfo = "495:\src\Expression.gbas";pool_array.free(param5_Reads);
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func20_CreateReadExpression = window['func20_CreateReadExpression'];
window['func28_CreateDefaultValueExpression'] = function(param8_datatype) {
	stackPush("function: CreateDefaultValueExpression", __debugInfo);
	try {
		__debugInfo = "517:\src\Expression.gbas";
		if (param8_datatype.attr7_IsArray) {
			__debugInfo = "503:\src\Expression.gbas";
			return tryClone(func16_CreateExpression(~~(35), param8_datatype));
			__debugInfo = "503:\src\Expression.gbas";
		} else {
			__debugInfo = "505:\src\Expression.gbas";
			{
				var local17___SelectHelper45__2692 = "";
				__debugInfo = "505:\src\Expression.gbas";
				local17___SelectHelper45__2692 = param8_datatype.attr8_Name_Str;
				__debugInfo = "516:\src\Expression.gbas";
				if ((((local17___SelectHelper45__2692) === ("int")) ? 1 : 0)) {
					__debugInfo = "507:\src\Expression.gbas";
					return tryClone(func19_CreateIntExpression(0));
					__debugInfo = "507:\src\Expression.gbas";
				} else if ((((local17___SelectHelper45__2692) === ("float")) ? 1 : 0)) {
					__debugInfo = "509:\src\Expression.gbas";
					return tryClone(func21_CreateFloatExpression(0));
					__debugInfo = "509:\src\Expression.gbas";
				} else if ((((local17___SelectHelper45__2692) === ("string")) ? 1 : 0)) {
					__debugInfo = "511:\src\Expression.gbas";
					return tryClone(func19_CreateStrExpression("\"\""));
					__debugInfo = "511:\src\Expression.gbas";
				} else if ((((local17___SelectHelper45__2692) === ("void")) ? 1 : 0)) {
					__debugInfo = "513:\src\Expression.gbas";
					return tryClone(func19_CreateIntExpression(0));
					__debugInfo = "513:\src\Expression.gbas";
				} else {
					__debugInfo = "515:\src\Expression.gbas";
					return tryClone(func16_CreateExpression(~~(35), param8_datatype));
					__debugInfo = "515:\src\Expression.gbas";
				};
				__debugInfo = "505:\src\Expression.gbas";
			};
			__debugInfo = "505:\src\Expression.gbas";
		};
		__debugInfo = "518:\src\Expression.gbas";
		return 0;
		__debugInfo = "517:\src\Expression.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func28_CreateDefaultValueExpression = window['func28_CreateDefaultValueExpression'];
window['func25_CreateDimAsExprExpression'] = function(param8_datatype, param4_dims) {
	stackPush("function: CreateDimAsExprExpression", __debugInfo);
	try {
		var local4_Expr_2695 = 0;
		__debugInfo = "522:\src\Expression.gbas";
		local4_Expr_2695 = func16_CreateExpression(~~(36), param8_datatype);
		__debugInfo = "523:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2695).values[tmpPositionCache][0].attr4_dims = param4_dims.clone(/* In Assign */);
		__debugInfo = "525:\src\Expression.gbas";
		return tryClone(local4_Expr_2695);
		__debugInfo = "526:\src\Expression.gbas";
		return 0;
		__debugInfo = "522:\src\Expression.gbas";pool_array.free(param4_dims);
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func25_CreateDimAsExprExpression = window['func25_CreateDimAsExprExpression'];
window['func21_CreateAliasExpression'] = function(param4_vari, param4_expr) {
	stackPush("function: CreateAliasExpression", __debugInfo);
	try {
		var local4_Expr_2698 = 0;
		__debugInfo = "530:\src\Expression.gbas";
		local4_Expr_2698 = func16_CreateExpression(~~(37), global12_voidDatatype);
		__debugInfo = "531:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2698).values[tmpPositionCache][0].attr4_vari = param4_vari;
		__debugInfo = "532:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2698).values[tmpPositionCache][0].attr4_expr = param4_expr;
		__debugInfo = "534:\src\Expression.gbas";
		return tryClone(local4_Expr_2698);
		__debugInfo = "535:\src\Expression.gbas";
		return 0;
		__debugInfo = "530:\src\Expression.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func21_CreateAliasExpression = window['func21_CreateAliasExpression'];
window['func19_CreateIncExpression'] = function(param4_Vari, param7_AddExpr) {
	stackPush("function: CreateIncExpression", __debugInfo);
	try {
		var local4_Expr_2701 = 0;
		__debugInfo = "539:\src\Expression.gbas";
		local4_Expr_2701 = func16_CreateExpression(~~(39), global12_voidDatatype);
		__debugInfo = "540:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2701).values[tmpPositionCache][0].attr4_vari = param4_Vari;
		__debugInfo = "541:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2701).values[tmpPositionCache][0].attr4_expr = param7_AddExpr;
		__debugInfo = "542:\src\Expression.gbas";
		return tryClone(local4_Expr_2701);
		__debugInfo = "543:\src\Expression.gbas";
		return 0;
		__debugInfo = "539:\src\Expression.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func19_CreateIncExpression = window['func19_CreateIncExpression'];
window['func23_CreateDimpushExpression'] = function(param4_vari, param4_expr) {
	stackPush("function: CreateDimpushExpression", __debugInfo);
	try {
		var local4_Expr_2704 = 0;
		__debugInfo = "548:\src\Expression.gbas";
		local4_Expr_2704 = func16_CreateExpression(~~(40), global12_voidDatatype);
		__debugInfo = "549:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2704).values[tmpPositionCache][0].attr4_vari = param4_vari;
		__debugInfo = "550:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2704).values[tmpPositionCache][0].attr4_expr = param4_expr;
		__debugInfo = "551:\src\Expression.gbas";
		return tryClone(local4_Expr_2704);
		__debugInfo = "552:\src\Expression.gbas";
		return 0;
		__debugInfo = "548:\src\Expression.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func23_CreateDimpushExpression = window['func23_CreateDimpushExpression'];
window['func19_CreateLenExpression'] = function(param4_expr, param4_kern) {
	stackPush("function: CreateLenExpression", __debugInfo);
	try {
		var local4_Expr_2707 = 0;
		__debugInfo = "556:\src\Expression.gbas";
		local4_Expr_2707 = func16_CreateExpression(~~(41), global11_intDatatype);
		__debugInfo = "557:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2707).values[tmpPositionCache][0].attr4_expr = param4_expr;
		__debugInfo = "558:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2707).values[tmpPositionCache][0].attr4_kern = param4_kern;
		__debugInfo = "559:\src\Expression.gbas";
		return tryClone(local4_Expr_2707);
		__debugInfo = "560:\src\Expression.gbas";
		return 0;
		__debugInfo = "556:\src\Expression.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func19_CreateLenExpression = window['func19_CreateLenExpression'];
window['func23_CreateDimDataExpression'] = function(param5_array, param5_exprs) {
	stackPush("function: CreateDimDataExpression", __debugInfo);
	try {
		var local4_Expr_2710 = 0;
		__debugInfo = "564:\src\Expression.gbas";
		local4_Expr_2710 = func16_CreateExpression(~~(42), global12_voidDatatype);
		__debugInfo = "565:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2710).values[tmpPositionCache][0].attr5_array = param5_array;
		__debugInfo = "566:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2710).values[tmpPositionCache][0].attr5_Exprs = param5_exprs.clone(/* In Assign */);
		__debugInfo = "567:\src\Expression.gbas";
		return tryClone(local4_Expr_2710);
		__debugInfo = "568:\src\Expression.gbas";
		return 0;
		__debugInfo = "564:\src\Expression.gbas";pool_array.free(param5_exprs);
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func23_CreateDimDataExpression = window['func23_CreateDimDataExpression'];
window['func22_CreateDeleteExpression'] = function() {
	stackPush("function: CreateDeleteExpression", __debugInfo);
	try {
		__debugInfo = "572:\src\Expression.gbas";
		return tryClone(func16_CreateExpression(~~(43), global12_voidDatatype));
		__debugInfo = "573:\src\Expression.gbas";
		return 0;
		__debugInfo = "572:\src\Expression.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func22_CreateDeleteExpression = window['func22_CreateDeleteExpression'];
window['func22_CreateDimDelExpression'] = function(param5_array, param8_position) {
	stackPush("function: CreateDimDelExpression", __debugInfo);
	try {
		var local4_Expr_2713 = 0;
		__debugInfo = "577:\src\Expression.gbas";
		local4_Expr_2713 = func16_CreateExpression(~~(44), global12_voidDatatype);
		__debugInfo = "578:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2713).values[tmpPositionCache][0].attr5_array = param5_array;
		__debugInfo = "579:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2713).values[tmpPositionCache][0].attr8_position = param8_position;
		__debugInfo = "580:\src\Expression.gbas";
		return tryClone(local4_Expr_2713);
		__debugInfo = "581:\src\Expression.gbas";
		return 0;
		__debugInfo = "577:\src\Expression.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func22_CreateDimDelExpression = window['func22_CreateDimDelExpression'];
window['func21_CreateBoundExpression'] = function(param4_expr, param8_position) {
	stackPush("function: CreateBoundExpression", __debugInfo);
	try {
		var local4_Expr_2716 = 0;
		__debugInfo = "585:\src\Expression.gbas";
		local4_Expr_2716 = func16_CreateExpression(~~(45), global11_intDatatype);
		__debugInfo = "586:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2716).values[tmpPositionCache][0].attr5_array = param4_expr;
		__debugInfo = "587:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2716).values[tmpPositionCache][0].attr8_position = param8_position;
		__debugInfo = "588:\src\Expression.gbas";
		return tryClone(local4_Expr_2716);
		__debugInfo = "589:\src\Expression.gbas";
		return 0;
		__debugInfo = "585:\src\Expression.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func21_CreateBoundExpression = window['func21_CreateBoundExpression'];
window['func19_CreateNotExpression'] = function(param4_expr) {
	stackPush("function: CreateNotExpression", __debugInfo);
	try {
		var local4_Expr_2718 = 0;
		__debugInfo = "593:\src\Expression.gbas";
		local4_Expr_2718 = func16_CreateExpression(~~(46), global13_floatDatatype);
		__debugInfo = "594:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2718).values[tmpPositionCache][0].attr4_expr = param4_expr;
		__debugInfo = "595:\src\Expression.gbas";
		return tryClone(local4_Expr_2718);
		__debugInfo = "596:\src\Expression.gbas";
		return 0;
		__debugInfo = "593:\src\Expression.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func19_CreateNotExpression = window['func19_CreateNotExpression'];
window['func21_CreateDummyExpression'] = function() {
	stackPush("function: CreateDummyExpression", __debugInfo);
	try {
		__debugInfo = "601:\src\Expression.gbas";
		return 0;
		__debugInfo = "602:\src\Expression.gbas";
		return 0;
		__debugInfo = "601:\src\Expression.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func21_CreateDummyExpression = window['func21_CreateDummyExpression'];
window['func25_CreateAddressOfExpression'] = function(param4_func) {
	stackPush("function: CreateAddressOfExpression", __debugInfo);
	try {
		var local4_Expr_2720 = 0;
		__debugInfo = "606:\src\Expression.gbas";
		local4_Expr_2720 = func16_CreateExpression(~~(48), global11_intDatatype);
		__debugInfo = "607:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2720).values[tmpPositionCache][0].attr4_func = param4_func;
		__debugInfo = "608:\src\Expression.gbas";
		return tryClone(local4_Expr_2720);
		__debugInfo = "609:\src\Expression.gbas";
		return 0;
		__debugInfo = "606:\src\Expression.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func25_CreateAddressOfExpression = window['func25_CreateAddressOfExpression'];
window['func22_CreateAssertExpression'] = function(param4_expr) {
	stackPush("function: CreateAssertExpression", __debugInfo);
	try {
		var local4_Expr_2722 = 0;
		__debugInfo = "614:\src\Expression.gbas";
		local4_Expr_2722 = func16_CreateExpression(~~(49), global12_voidDatatype);
		__debugInfo = "615:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2722).values[tmpPositionCache][0].attr4_expr = param4_expr;
		__debugInfo = "616:\src\Expression.gbas";
		return tryClone(local4_Expr_2722);
		__debugInfo = "617:\src\Expression.gbas";
		return 0;
		__debugInfo = "614:\src\Expression.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func22_CreateAssertExpression = window['func22_CreateAssertExpression'];
window['func27_CreateDebugOutputExpression'] = function(param4_expr) {
	stackPush("function: CreateDebugOutputExpression", __debugInfo);
	try {
		var local4_Expr_2724 = 0;
		__debugInfo = "622:\src\Expression.gbas";
		local4_Expr_2724 = func16_CreateExpression(~~(50), global12_voidDatatype);
		__debugInfo = "623:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2724).values[tmpPositionCache][0].attr4_expr = param4_expr;
		__debugInfo = "624:\src\Expression.gbas";
		return tryClone(local4_Expr_2724);
		__debugInfo = "625:\src\Expression.gbas";
		return 0;
		__debugInfo = "622:\src\Expression.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func27_CreateDebugOutputExpression = window['func27_CreateDebugOutputExpression'];
window['func19_CreateIIFExpression'] = function(param4_Cond, param6_onTrue, param7_onFalse) {
	stackPush("function: CreateIIFExpression", __debugInfo);
	try {
		var local4_Expr_2728 = 0;
		__debugInfo = "629:\src\Expression.gbas";
		local4_Expr_2728 = func16_CreateExpression(~~(51), global5_Exprs_ref[0].arrAccess(param6_onTrue).values[tmpPositionCache][0].attr8_datatype);
		__debugInfo = "630:\src\Expression.gbas";
		DIMDATA(global5_Exprs_ref[0].arrAccess(local4_Expr_2728).values[tmpPositionCache][0].attr10_Conditions, [param4_Cond]);
		__debugInfo = "631:\src\Expression.gbas";
		DIMDATA(global5_Exprs_ref[0].arrAccess(local4_Expr_2728).values[tmpPositionCache][0].attr6_Scopes, [param6_onTrue]);
		__debugInfo = "632:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2728).values[tmpPositionCache][0].attr9_elseScope = param7_onFalse;
		__debugInfo = "634:\src\Expression.gbas";
		return tryClone(local4_Expr_2728);
		__debugInfo = "635:\src\Expression.gbas";
		return 0;
		__debugInfo = "629:\src\Expression.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func19_CreateIIFExpression = window['func19_CreateIIFExpression'];
window['func23_CreateRequireExpression'] = function(param8_Path_Str) {
	stackPush("function: CreateRequireExpression", __debugInfo);
	try {
		var local4_Expr_2730 = 0;
		__debugInfo = "638:\src\Expression.gbas";
		local4_Expr_2730 = func16_CreateExpression(~~(52), global12_voidDatatype);
		__debugInfo = "646:\src\Expression.gbas";
		if ((((REVINSTR(param8_Path_Str, ".", -(1))) !== (-(1))) ? 1 : 0)) {
			__debugInfo = "641:\src\Expression.gbas";
			{
				var local17___SelectHelper46__2731 = "";
				__debugInfo = "641:\src\Expression.gbas";
				local17___SelectHelper46__2731 = MID_Str(param8_Path_Str, ((REVINSTR(param8_Path_Str, ".", -(1))) + (1)), -(1));
				__debugInfo = "645:\src\Expression.gbas";
				if ((((local17___SelectHelper46__2731) === ("js")) ? 1 : 0)) {
					
				} else {
					__debugInfo = "644:\src\Expression.gbas";
					func5_Error("Cannot not REQUIRE non javascript files...", 643, "src\Expression.gbas");
					__debugInfo = "644:\src\Expression.gbas";
				};
				__debugInfo = "641:\src\Expression.gbas";
			};
			__debugInfo = "641:\src\Expression.gbas";
		};
		__debugInfo = "647:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2730).values[tmpPositionCache][0].attr8_Name_Str = param8_Path_Str;
		__debugInfo = "648:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2730).values[tmpPositionCache][0].attr11_Content_Str = func12_LoadFile_Str(param8_Path_Str);
		__debugInfo = "650:\src\Expression.gbas";
		return tryClone(local4_Expr_2730);
		__debugInfo = "651:\src\Expression.gbas";
		return 0;
		__debugInfo = "638:\src\Expression.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func23_CreateRequireExpression = window['func23_CreateRequireExpression'];
window['func21_CreateSuperExpression'] = function(param3_typ) {
	stackPush("function: CreateSuperExpression", __debugInfo);
	try {
		var local1_d_2733 = pool_TDatatype.alloc();
		__debugInfo = "656:\src\Expression.gbas";
		local1_d_2733.attr7_IsArray = 0;
		__debugInfo = "657:\src\Expression.gbas";
		local1_d_2733.attr8_Name_Str = global8_Compiler.attr5_Types_ref[0].arrAccess(param3_typ).values[tmpPositionCache][0].attr8_Name_Str;
		__debugInfo = "658:\src\Expression.gbas";
		return tryClone(func16_CreateExpression(~~(53), local1_d_2733));
		__debugInfo = "659:\src\Expression.gbas";
		return 0;
		__debugInfo = "656:\src\Expression.gbas";pool_TDatatype.free(local1_d_2733);
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func21_CreateSuperExpression = window['func21_CreateSuperExpression'];
window['func14_CreateCast2Obj'] = function(param7_Obj_Str, param4_expr) {
	stackPush("function: CreateCast2Obj", __debugInfo);
	try {
		var local1_d_2736 = pool_TDatatype.alloc(), local4_Expr_2737 = 0;
		__debugInfo = "664:\src\Expression.gbas";
		local1_d_2736.attr7_IsArray = 0;
		__debugInfo = "665:\src\Expression.gbas";
		local1_d_2736.attr8_Name_Str = param7_Obj_Str;
		__debugInfo = "666:\src\Expression.gbas";
		local4_Expr_2737 = func16_CreateExpression(~~(54), local1_d_2736);
		__debugInfo = "667:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2737).values[tmpPositionCache][0].attr4_expr = param4_expr;
		__debugInfo = "669:\src\Expression.gbas";
		return tryClone(local4_Expr_2737);
		__debugInfo = "670:\src\Expression.gbas";
		return 0;
		__debugInfo = "664:\src\Expression.gbas";pool_TDatatype.free(local1_d_2736);
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func14_CreateCast2Obj = window['func14_CreateCast2Obj'];
window['method13_type7_HashMap_3_Put'] = function(param7_Key_Str, param5_Value, param4_self) {
	stackPush("method: Put", __debugInfo);
	try {
		var local2_KV_1895 = pool_KeyValue.alloc(), local4_hash_1896 = 0, alias6_Bucket_ref_1897 = [pool_Bucket.alloc()];
		__debugInfo = "28:\src\Utils\Hashmap.gbas";
		if ((((param7_Key_Str) === ("")) ? 1 : 0)) {
			__debugInfo = "28:\src\Utils\Hashmap.gbas";
			func5_Error("Cannot insert empty key you son of a bitch.", 19, "Hashmap.gbas");
			__debugInfo = "28:\src\Utils\Hashmap.gbas";
		};
		__debugInfo = "31:\src\Utils\Hashmap.gbas";
		if ((((BOUNDS(param4_self.attr7_Buckets_ref[0], 0)) === (0)) ? 1 : 0)) {
			__debugInfo = "30:\src\Utils\Hashmap.gbas";
			(param4_self).SetSize(4096);
			__debugInfo = "30:\src\Utils\Hashmap.gbas";
		};
		__debugInfo = "34:\src\Utils\Hashmap.gbas";
		if ((((param4_self).DoesKeyExist(param7_Key_Str)) ? 0 : 1)) {
			__debugInfo = "33:\src\Utils\Hashmap.gbas";
			param4_self.attr8_Elements+=1;
			__debugInfo = "33:\src\Utils\Hashmap.gbas";
		};
		__debugInfo = "37:\src\Utils\Hashmap.gbas";
		if ((((param4_self.attr8_Elements) > (((CAST2INT(((BOUNDS(param4_self.attr7_Buckets_ref[0], 0)) / (3)))) * (2)))) ? 1 : 0)) {
			__debugInfo = "36:\src\Utils\Hashmap.gbas";
			(param4_self).SetSize(((BOUNDS(param4_self.attr7_Buckets_ref[0], 0)) * (4)));
			__debugInfo = "36:\src\Utils\Hashmap.gbas";
		};
		__debugInfo = "40:\src\Utils\Hashmap.gbas";
		local2_KV_1895.attr7_Key_Str = param7_Key_Str;
		__debugInfo = "41:\src\Utils\Hashmap.gbas";
		local2_KV_1895.attr5_Value = param5_Value;
		__debugInfo = "43:\src\Utils\Hashmap.gbas";
		local4_hash_1896 = func7_HashStr(param7_Key_Str, ((BOUNDS(param4_self.attr7_Buckets_ref[0], 0)) - (1)));
		__debugInfo = "44:\src\Utils\Hashmap.gbas";
		alias6_Bucket_ref_1897 = param4_self.attr7_Buckets_ref[0].arrAccess(local4_hash_1896).values[tmpPositionCache] /* ALIAS */;
		__debugInfo = "55:\src\Utils\Hashmap.gbas";
		if (alias6_Bucket_ref_1897[0].attr3_Set) {
			__debugInfo = "49:\src\Utils\Hashmap.gbas";
			if ((((BOUNDS(alias6_Bucket_ref_1897[0].attr8_Elements, 0)) === (0)) ? 1 : 0)) {
				__debugInfo = "48:\src\Utils\Hashmap.gbas";
				DIMPUSH(alias6_Bucket_ref_1897[0].attr8_Elements, alias6_Bucket_ref_1897[0].attr7_Element);
				__debugInfo = "48:\src\Utils\Hashmap.gbas";
			};
			__debugInfo = "51:\src\Utils\Hashmap.gbas";
			DIMPUSH(alias6_Bucket_ref_1897[0].attr8_Elements, local2_KV_1895);
			__debugInfo = "49:\src\Utils\Hashmap.gbas";
		} else {
			__debugInfo = "53:\src\Utils\Hashmap.gbas";
			alias6_Bucket_ref_1897[0].attr3_Set = 1;
			__debugInfo = "54:\src\Utils\Hashmap.gbas";
			alias6_Bucket_ref_1897[0].attr7_Element = local2_KV_1895.clone(/* In Assign */);
			__debugInfo = "53:\src\Utils\Hashmap.gbas";
		};
		__debugInfo = "56:\src\Utils\Hashmap.gbas";
		return 0;
		__debugInfo = "28:\src\Utils\Hashmap.gbas";pool_KeyValue.free(local2_KV_1895);pool_Bucket.free(alias6_Bucket_ref_1897);
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
method13_type7_HashMap_3_Put = window['method13_type7_HashMap_3_Put'];
window['method13_type7_HashMap_12_DoesKeyExist'] = function(param7_Key_Str, param4_self) {
	stackPush("method: DoesKeyExist", __debugInfo);
	try {
		var local5_Value_ref_1901 = [0];
		__debugInfo = "61:\src\Utils\Hashmap.gbas";
		return tryClone((param4_self).GetValue(param7_Key_Str, local5_Value_ref_1901));
		__debugInfo = "62:\src\Utils\Hashmap.gbas";
		return 0;
		__debugInfo = "61:\src\Utils\Hashmap.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
method13_type7_HashMap_12_DoesKeyExist = window['method13_type7_HashMap_12_DoesKeyExist'];
window['method13_type7_HashMap_8_GetValue'] = function(param7_Key_Str, param5_Value_ref, param4_self) {
	stackPush("method: GetValue", __debugInfo);
	try {
		var local4_hash_1906 = 0, alias6_Bucket_ref_1907 = [pool_Bucket.alloc()];
		__debugInfo = "66:\src\Utils\Hashmap.gbas";
		local4_hash_1906 = func7_HashStr(param7_Key_Str, ((BOUNDS(param4_self.attr7_Buckets_ref[0], 0)) - (1)));
		__debugInfo = "67:\src\Utils\Hashmap.gbas";
		if ((((local4_hash_1906) >= (BOUNDS(param4_self.attr7_Buckets_ref[0], 0))) ? 1 : 0)) {
			__debugInfo = "67:\src\Utils\Hashmap.gbas";
			return tryClone(0);
			__debugInfo = "67:\src\Utils\Hashmap.gbas";
		};
		__debugInfo = "68:\src\Utils\Hashmap.gbas";
		alias6_Bucket_ref_1907 = param4_self.attr7_Buckets_ref[0].arrAccess(local4_hash_1906).values[tmpPositionCache] /* ALIAS */;
		__debugInfo = "90:\src\Utils\Hashmap.gbas";
		if (alias6_Bucket_ref_1907[0].attr3_Set) {
			__debugInfo = "87:\src\Utils\Hashmap.gbas";
			if ((((BOUNDS(alias6_Bucket_ref_1907[0].attr8_Elements, 0)) === (0)) ? 1 : 0)) {
				__debugInfo = "77:\src\Utils\Hashmap.gbas";
				if ((((alias6_Bucket_ref_1907[0].attr7_Element.attr7_Key_Str) !== (param7_Key_Str)) ? 1 : 0)) {
					__debugInfo = "72:\src\Utils\Hashmap.gbas";
					param5_Value_ref[0] = 0;
					__debugInfo = "73:\src\Utils\Hashmap.gbas";
					return tryClone(0);
					__debugInfo = "72:\src\Utils\Hashmap.gbas";
				} else {
					__debugInfo = "75:\src\Utils\Hashmap.gbas";
					param5_Value_ref[0] = alias6_Bucket_ref_1907[0].attr7_Element.attr5_Value;
					__debugInfo = "76:\src\Utils\Hashmap.gbas";
					return 1;
					__debugInfo = "75:\src\Utils\Hashmap.gbas";
				};
				__debugInfo = "77:\src\Utils\Hashmap.gbas";
			} else {
				__debugInfo = "78:\src\Utils\Hashmap.gbas";
				{
					var local1_i_1908 = 0.0;
					__debugInfo = "85:\src\Utils\Hashmap.gbas";
					for (local1_i_1908 = 0;toCheck(local1_i_1908, ((BOUNDS(alias6_Bucket_ref_1907[0].attr8_Elements, 0)) - (1)), 1);local1_i_1908 += 1) {
						__debugInfo = "84:\src\Utils\Hashmap.gbas";
						if ((((alias6_Bucket_ref_1907[0].attr8_Elements.arrAccess(~~(local1_i_1908)).values[tmpPositionCache].attr7_Key_Str) === (param7_Key_Str)) ? 1 : 0)) {
							__debugInfo = "82:\src\Utils\Hashmap.gbas";
							param5_Value_ref[0] = alias6_Bucket_ref_1907[0].attr8_Elements.arrAccess(~~(local1_i_1908)).values[tmpPositionCache].attr5_Value;
							__debugInfo = "83:\src\Utils\Hashmap.gbas";
							return 1;
							__debugInfo = "82:\src\Utils\Hashmap.gbas";
						};
						__debugInfo = "84:\src\Utils\Hashmap.gbas";
					};
					__debugInfo = "85:\src\Utils\Hashmap.gbas";
				};
				__debugInfo = "86:\src\Utils\Hashmap.gbas";
				return tryClone(0);
				__debugInfo = "78:\src\Utils\Hashmap.gbas";
			};
			__debugInfo = "87:\src\Utils\Hashmap.gbas";
		} else {
			__debugInfo = "89:\src\Utils\Hashmap.gbas";
			return tryClone(0);
			__debugInfo = "89:\src\Utils\Hashmap.gbas";
		};
		__debugInfo = "91:\src\Utils\Hashmap.gbas";
		return 0;
		__debugInfo = "66:\src\Utils\Hashmap.gbas";pool_Bucket.free(alias6_Bucket_ref_1907);
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
method13_type7_HashMap_8_GetValue = window['method13_type7_HashMap_8_GetValue'];
window['method13_type7_HashMap_6_Remove'] = function(param7_Key_Str, param4_self) {
	stackPush("method: Remove", __debugInfo);
	try {
		var local4_hash_1912 = 0, alias6_Bucket_ref_1913 = [pool_Bucket.alloc()];
		__debugInfo = "95:\src\Utils\Hashmap.gbas";
		local4_hash_1912 = func7_HashStr(param7_Key_Str, ((BOUNDS(param4_self.attr7_Buckets_ref[0], 0)) - (1)));
		__debugInfo = "96:\src\Utils\Hashmap.gbas";
		alias6_Bucket_ref_1913 = param4_self.attr7_Buckets_ref[0].arrAccess(local4_hash_1912).values[tmpPositionCache] /* ALIAS */;
		__debugInfo = "124:\src\Utils\Hashmap.gbas";
		if (alias6_Bucket_ref_1913[0].attr3_Set) {
			__debugInfo = "121:\src\Utils\Hashmap.gbas";
			if ((((alias6_Bucket_ref_1913[0].attr7_Element.attr7_Key_Str) === (param7_Key_Str)) ? 1 : 0)) {
				var local1_e_1914 = pool_KeyValue.alloc();
				__debugInfo = "100:\src\Utils\Hashmap.gbas";
				param4_self.attr8_Elements+=-1;
				__debugInfo = "102:\src\Utils\Hashmap.gbas";
				alias6_Bucket_ref_1913[0].attr7_Element = local1_e_1914.clone(/* In Assign */);
				__debugInfo = "103:\src\Utils\Hashmap.gbas";
				alias6_Bucket_ref_1913[0].attr3_Set = 0;
				__debugInfo = "100:\src\Utils\Hashmap.gbas";pool_KeyValue.free(local1_e_1914);
			} else {
				var local4_Find_1915 = 0;
				__debugInfo = "105:\src\Utils\Hashmap.gbas";
				local4_Find_1915 = 0;
				__debugInfo = "105:\src\Utils\Hashmap.gbas";
				{
					var local1_i_1916 = 0.0;
					__debugInfo = "112:\src\Utils\Hashmap.gbas";
					for (local1_i_1916 = 0;toCheck(local1_i_1916, ((BOUNDS(alias6_Bucket_ref_1913[0].attr8_Elements, 0)) - (1)), 1);local1_i_1916 += 1) {
						__debugInfo = "111:\src\Utils\Hashmap.gbas";
						if ((((alias6_Bucket_ref_1913[0].attr8_Elements.arrAccess(~~(local1_i_1916)).values[tmpPositionCache].attr7_Key_Str) === (param7_Key_Str)) ? 1 : 0)) {
							__debugInfo = "108:\src\Utils\Hashmap.gbas";
							local4_Find_1915 = 1;
							__debugInfo = "109:\src\Utils\Hashmap.gbas";
							DIMDEL(alias6_Bucket_ref_1913[0].attr8_Elements, ~~(local1_i_1916));
							__debugInfo = "110:\src\Utils\Hashmap.gbas";
							break;
							__debugInfo = "108:\src\Utils\Hashmap.gbas";
						};
						__debugInfo = "111:\src\Utils\Hashmap.gbas";
					};
					__debugInfo = "112:\src\Utils\Hashmap.gbas";
				};
				__debugInfo = "116:\src\Utils\Hashmap.gbas";
				if ((((BOUNDS(alias6_Bucket_ref_1913[0].attr8_Elements, 0)) === (1)) ? 1 : 0)) {
					__debugInfo = "114:\src\Utils\Hashmap.gbas";
					alias6_Bucket_ref_1913[0].attr7_Element = alias6_Bucket_ref_1913[0].attr8_Elements.arrAccess(0).values[tmpPositionCache].clone(/* In Assign */);
					__debugInfo = "115:\src\Utils\Hashmap.gbas";
					DIMDEL(alias6_Bucket_ref_1913[0].attr8_Elements, 0);
					__debugInfo = "114:\src\Utils\Hashmap.gbas";
				};
				__debugInfo = "118:\src\Utils\Hashmap.gbas";
				if (local4_Find_1915) {
					__debugInfo = "118:\src\Utils\Hashmap.gbas";
					param4_self.attr8_Elements+=-1;
					__debugInfo = "118:\src\Utils\Hashmap.gbas";
				};
				__debugInfo = "120:\src\Utils\Hashmap.gbas";
				return tryClone(local4_Find_1915);
				__debugInfo = "105:\src\Utils\Hashmap.gbas";
			};
			__debugInfo = "121:\src\Utils\Hashmap.gbas";
		} else {
			__debugInfo = "123:\src\Utils\Hashmap.gbas";
			return tryClone(0);
			__debugInfo = "123:\src\Utils\Hashmap.gbas";
		};
		__debugInfo = "125:\src\Utils\Hashmap.gbas";
		return 0;
		__debugInfo = "95:\src\Utils\Hashmap.gbas";pool_Bucket.free(alias6_Bucket_ref_1913);
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
method13_type7_HashMap_6_Remove = window['method13_type7_HashMap_6_Remove'];
window['method13_type7_HashMap_7_ToArray'] = function(param5_Array, param4_self) {
	stackPush("method: ToArray", __debugInfo);
	try {
		__debugInfo = "130:\src\Utils\Hashmap.gbas";
		DIM(param5_Array, [0], pool_KeyValue.alloc());
		__debugInfo = "130:\src\Utils\Hashmap.gbas";
		{
			var local1_i_1920 = 0.0;
			__debugInfo = "142:\src\Utils\Hashmap.gbas";
			for (local1_i_1920 = 0;toCheck(local1_i_1920, ((BOUNDS(param4_self.attr7_Buckets_ref[0], 0)) - (1)), 1);local1_i_1920 += 1) {
				var alias1_B_ref_1921 = [pool_Bucket.alloc()];
				__debugInfo = "132:\src\Utils\Hashmap.gbas";
				alias1_B_ref_1921 = param4_self.attr7_Buckets_ref[0].arrAccess(~~(local1_i_1920)).values[tmpPositionCache] /* ALIAS */;
				__debugInfo = "141:\src\Utils\Hashmap.gbas";
				if (alias1_B_ref_1921[0].attr3_Set) {
					__debugInfo = "140:\src\Utils\Hashmap.gbas";
					if (BOUNDS(alias1_B_ref_1921[0].attr8_Elements, 0)) {
						__debugInfo = "134:\src\Utils\Hashmap.gbas";
						{
							var local1_j_1922 = 0.0;
							__debugInfo = "137:\src\Utils\Hashmap.gbas";
							for (local1_j_1922 = 0;toCheck(local1_j_1922, ((BOUNDS(alias1_B_ref_1921[0].attr8_Elements, 0)) - (1)), 1);local1_j_1922 += 1) {
								__debugInfo = "136:\src\Utils\Hashmap.gbas";
								DIMPUSH(param5_Array, alias1_B_ref_1921[0].attr8_Elements.arrAccess(~~(local1_j_1922)).values[tmpPositionCache]);
								__debugInfo = "136:\src\Utils\Hashmap.gbas";
							};
							__debugInfo = "137:\src\Utils\Hashmap.gbas";
						};
						__debugInfo = "134:\src\Utils\Hashmap.gbas";
					} else {
						__debugInfo = "139:\src\Utils\Hashmap.gbas";
						DIMPUSH(param5_Array, alias1_B_ref_1921[0].attr7_Element);
						__debugInfo = "139:\src\Utils\Hashmap.gbas";
					};
					__debugInfo = "140:\src\Utils\Hashmap.gbas";
				};
				__debugInfo = "132:\src\Utils\Hashmap.gbas";pool_Bucket.free(alias1_B_ref_1921);
			};
			__debugInfo = "142:\src\Utils\Hashmap.gbas";
		};
		__debugInfo = "143:\src\Utils\Hashmap.gbas";
		return 0;
		__debugInfo = "130:\src\Utils\Hashmap.gbas";pool_array.free(param5_Array);
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
method13_type7_HashMap_7_ToArray = window['method13_type7_HashMap_7_ToArray'];
window['method13_type7_HashMap_7_SetSize'] = function(param4_Size, param4_self) {
	stackPush("method: SetSize", __debugInfo);
	try {
		var local3_Arr_1926 = pool_array.alloc(pool_KeyValue.alloc());
		__debugInfo = "148:\src\Utils\Hashmap.gbas";
		(param4_self).ToArray(unref(local3_Arr_1926));
		__debugInfo = "149:\src\Utils\Hashmap.gbas";
		param4_self.attr8_Elements = 0;
		__debugInfo = "150:\src\Utils\Hashmap.gbas";
		REDIM(unref(param4_self.attr7_Buckets_ref[0]), [param4_Size], [pool_Bucket.alloc()] );
		__debugInfo = "153:\src\Utils\Hashmap.gbas";
		var forEachSaver5067 = local3_Arr_1926;
		for(var forEachCounter5067 = 0 ; forEachCounter5067 < forEachSaver5067.values.length ; forEachCounter5067++) {
			var local1_E_1927 = forEachSaver5067.values[forEachCounter5067];
		{
				__debugInfo = "152:\src\Utils\Hashmap.gbas";
				(param4_self).Put(local1_E_1927.attr7_Key_Str, local1_E_1927.attr5_Value);
				__debugInfo = "152:\src\Utils\Hashmap.gbas";
			}
			forEachSaver5067.values[forEachCounter5067] = local1_E_1927;
		
		};
		__debugInfo = "154:\src\Utils\Hashmap.gbas";
		return 0;
		__debugInfo = "148:\src\Utils\Hashmap.gbas";pool_array.free(local3_Arr_1926);
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
method13_type7_HashMap_7_SetSize = window['method13_type7_HashMap_7_SetSize'];
window['func7_HashStr'] = function(param7_Str_Str, param6_MaxLen) {
	stackPush("function: HashStr", __debugInfo);
	try {
		var local4_Hash_1930 = 0;
		__debugInfo = "161:\src\Utils\Hashmap.gbas";
		{
			var local1_i_1931 = 0.0;
			__debugInfo = "164:\src\Utils\Hashmap.gbas";
			for (local1_i_1931 = 0;toCheck(local1_i_1931, (((param7_Str_Str).length) - (1)), 1);local1_i_1931 += 1) {
				__debugInfo = "163:\src\Utils\Hashmap.gbas";
				local4_Hash_1930+=~~(((ASC(param7_Str_Str, ~~(local1_i_1931))) + (((local1_i_1931) * (26)))));
				__debugInfo = "163:\src\Utils\Hashmap.gbas";
			};
			__debugInfo = "164:\src\Utils\Hashmap.gbas";
		};
		__debugInfo = "165:\src\Utils\Hashmap.gbas";
		local4_Hash_1930 = MOD(local4_Hash_1930, param6_MaxLen);
		__debugInfo = "166:\src\Utils\Hashmap.gbas";
		return tryClone(local4_Hash_1930);
		__debugInfo = "167:\src\Utils\Hashmap.gbas";
		return 0;
		__debugInfo = "161:\src\Utils\Hashmap.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func7_HashStr = window['func7_HashStr'];
window['func16_JS_Generator_Str'] = function() {
	stackPush("function: JS_Generator_Str", __debugInfo);
	try {
		__debugInfo = "292:\src\CompilerPasses\Generator\JSGenerator.gbas";
		{
			var Err_Str = "";
			__debugInfo = "293:\src\CompilerPasses\Generator\JSGenerator.gbas";
			try {
				var local11_InWebWorker_1932 = 0, local8_Text_Str_1933 = "", local14_StaticText_Str_1934 = "", local17_StaticDefText_Str_1935 = "";
				__debugInfo = "28:\src\CompilerPasses\Generator\JSGenerator.gbas";
				local11_InWebWorker_1932 = func8_IsDefine("HTML5_WEBWORKER");
				__debugInfo = "30:\src\CompilerPasses\Generator\JSGenerator.gbas";
				func23_ManageFuncParamOverlaps();
				__debugInfo = "32:\src\CompilerPasses\Generator\JSGenerator.gbas";
				global14_StaticText_Str = "";
				__debugInfo = "34:\src\CompilerPasses\Generator\JSGenerator.gbas";
				local8_Text_Str_1933 = "";
				__debugInfo = "41:\src\CompilerPasses\Generator\JSGenerator.gbas";
				if (global9_DEBUGMODE) {
					__debugInfo = "37:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1933 = ((((local8_Text_Str_1933) + ("var __debugInfo = \"\";"))) + (func11_NewLine_Str()));
					__debugInfo = "38:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1933 = ((((local8_Text_Str_1933) + ("var debugMode = true;"))) + (func11_NewLine_Str()));
					__debugInfo = "37:\src\CompilerPasses\Generator\JSGenerator.gbas";
				} else {
					__debugInfo = "40:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1933 = ((((local8_Text_Str_1933) + ("var debugMode = false;"))) + (func11_NewLine_Str()));
					__debugInfo = "40:\src\CompilerPasses\Generator\JSGenerator.gbas";
				};
				__debugInfo = "44:\src\CompilerPasses\Generator\JSGenerator.gbas";
				global11_LastDummyID = ~~(((global10_LastExprID) + (1337)));
				__debugInfo = "46:\src\CompilerPasses\Generator\JSGenerator.gbas";
				local8_Text_Str_1933 = ((local8_Text_Str_1933) + ("window['main'] = function()"));
				__debugInfo = "47:\src\CompilerPasses\Generator\JSGenerator.gbas";
				local8_Text_Str_1933 = ((((local8_Text_Str_1933) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr9_MainScope).values[tmpPositionCache][0]))))) + (func11_NewLine_Str()));
				__debugInfo = "48:\src\CompilerPasses\Generator\JSGenerator.gbas";
				if (local11_InWebWorker_1932) {
					__debugInfo = "48:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1933 = ((((local8_Text_Str_1933) + ("main = window['main'];"))) + (func11_NewLine_Str()));
					__debugInfo = "48:\src\CompilerPasses\Generator\JSGenerator.gbas";
				};
				__debugInfo = "49:\src\CompilerPasses\Generator\JSGenerator.gbas";
				local14_StaticText_Str_1934 = "";
				__debugInfo = "50:\src\CompilerPasses\Generator\JSGenerator.gbas";
				local17_StaticDefText_Str_1935 = "";
				__debugInfo = "75:\src\CompilerPasses\Generator\JSGenerator.gbas";
				var forEachSaver5374 = global8_Compiler.attr5_Funcs_ref[0];
				for(var forEachCounter5374 = 0 ; forEachCounter5374 < forEachSaver5374.values.length ; forEachCounter5374++) {
					var local4_Func_ref_1936 = forEachSaver5374.values[forEachCounter5374];
				{
						__debugInfo = "74:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (((((((local4_Func_ref_1936[0].attr6_Native) === (0)) ? 1 : 0)) && ((((local4_Func_ref_1936[0].attr3_Scp) !== (-(1))) ? 1 : 0))) ? 1 : 0)) {
							var local4_Find_1937 = 0.0;
							__debugInfo = "57:\src\CompilerPasses\Generator\JSGenerator.gbas";
							if ((((BOUNDS(local4_Func_ref_1936[0].attr7_Statics, 0)) > (0)) ? 1 : 0)) {
								__debugInfo = "55:\src\CompilerPasses\Generator\JSGenerator.gbas";
								local17_StaticDefText_Str_1935 = ((((((((local17_StaticDefText_Str_1935) + ("var "))) + (func13_JSVariDef_Str(unref(local4_Func_ref_1936[0].attr7_Statics), 1, 0, 0)))) + (";"))) + (func11_NewLine_Str()));
								__debugInfo = "56:\src\CompilerPasses\Generator\JSGenerator.gbas";
								local14_StaticText_Str_1934 = ((((((local14_StaticText_Str_1934) + (func13_JSVariDef_Str(unref(local4_Func_ref_1936[0].attr7_Statics), 0, 0, 1)))) + (";"))) + (func11_NewLine_Str()));
								__debugInfo = "55:\src\CompilerPasses\Generator\JSGenerator.gbas";
							};
							__debugInfo = "58:\src\CompilerPasses\Generator\JSGenerator.gbas";
							local8_Text_Str_1933 = ((((((local8_Text_Str_1933) + ("window['"))) + (local4_Func_ref_1936[0].attr8_Name_Str))) + ("'] = function("));
							__debugInfo = "59:\src\CompilerPasses\Generator\JSGenerator.gbas";
							local4_Find_1937 = 0;
							__debugInfo = "65:\src\CompilerPasses\Generator\JSGenerator.gbas";
							var forEachSaver5300 = local4_Func_ref_1936[0].attr6_Params;
							for(var forEachCounter5300 = 0 ; forEachCounter5300 < forEachSaver5300.values.length ; forEachCounter5300++) {
								var local1_P_1938 = forEachSaver5300.values[forEachCounter5300];
							{
									__debugInfo = "61:\src\CompilerPasses\Generator\JSGenerator.gbas";
									if (local4_Find_1937) {
										__debugInfo = "61:\src\CompilerPasses\Generator\JSGenerator.gbas";
										local8_Text_Str_1933 = ((local8_Text_Str_1933) + (", "));
										__debugInfo = "61:\src\CompilerPasses\Generator\JSGenerator.gbas";
									};
									__debugInfo = "62:\src\CompilerPasses\Generator\JSGenerator.gbas";
									local8_Text_Str_1933 = ((local8_Text_Str_1933) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_1938).values[tmpPositionCache][0].attr8_Name_Str));
									__debugInfo = "64:\src\CompilerPasses\Generator\JSGenerator.gbas";
									local4_Find_1937 = 1;
									__debugInfo = "61:\src\CompilerPasses\Generator\JSGenerator.gbas";
								}
								forEachSaver5300.values[forEachCounter5300] = local1_P_1938;
							
							};
							__debugInfo = "66:\src\CompilerPasses\Generator\JSGenerator.gbas";
							local8_Text_Str_1933 = ((local8_Text_Str_1933) + (") "));
							__debugInfo = "67:\src\CompilerPasses\Generator\JSGenerator.gbas";
							local8_Text_Str_1933 = ((((((local8_Text_Str_1933) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local4_Func_ref_1936[0].attr3_Scp).values[tmpPositionCache][0]))))) + (";"))) + (func11_NewLine_Str()));
							__debugInfo = "71:\src\CompilerPasses\Generator\JSGenerator.gbas";
							if (((((((global9_DEBUGMODE) === (0)) ? 1 : 0)) && ((((local4_Func_ref_1936[0].attr3_Typ) === (2)) ? 1 : 0))) ? 1 : 0)) {
								__debugInfo = "70:\src\CompilerPasses\Generator\JSGenerator.gbas";
								local8_Text_Str_1933 = ((((((((((((local8_Text_Str_1933) + ("window['"))) + (local4_Func_ref_1936[0].attr8_Name_Str))) + ("'] = "))) + (local4_Func_ref_1936[0].attr8_Name_Str))) + (";"))) + (func11_NewLine_Str()));
								__debugInfo = "70:\src\CompilerPasses\Generator\JSGenerator.gbas";
							};
							__debugInfo = "73:\src\CompilerPasses\Generator\JSGenerator.gbas";
							if (local11_InWebWorker_1932) {
								__debugInfo = "73:\src\CompilerPasses\Generator\JSGenerator.gbas";
								local8_Text_Str_1933 = ((((((((((local8_Text_Str_1933) + (local4_Func_ref_1936[0].attr8_Name_Str))) + (" = window['"))) + (local4_Func_ref_1936[0].attr8_Name_Str))) + ("'];"))) + (func11_NewLine_Str()));
								__debugInfo = "73:\src\CompilerPasses\Generator\JSGenerator.gbas";
							};
							__debugInfo = "57:\src\CompilerPasses\Generator\JSGenerator.gbas";
						};
						__debugInfo = "74:\src\CompilerPasses\Generator\JSGenerator.gbas";
					}
					forEachSaver5374.values[forEachCounter5374] = local4_Func_ref_1936;
				
				};
				__debugInfo = "87:\src\CompilerPasses\Generator\JSGenerator.gbas";
				var forEachSaver5440 = global8_Compiler.attr5_Funcs_ref[0];
				for(var forEachCounter5440 = 0 ; forEachCounter5440 < forEachSaver5440.values.length ; forEachCounter5440++) {
					var local4_Func_ref_1939 = forEachSaver5440.values[forEachCounter5440];
				{
						__debugInfo = "86:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if ((((local4_Func_ref_1939[0].attr3_Typ) === (4)) ? 1 : 0)) {
							__debugInfo = "80:\src\CompilerPasses\Generator\JSGenerator.gbas";
							func8_IndentUp();
							__debugInfo = "81:\src\CompilerPasses\Generator\JSGenerator.gbas";
							local8_Text_Str_1933 = ((((((((local8_Text_Str_1933) + ("window['"))) + (local4_Func_ref_1939[0].attr9_OName_Str))) + ("'] = function() {"))) + (func11_NewLine_Str()));
							__debugInfo = "82:\src\CompilerPasses\Generator\JSGenerator.gbas";
							local8_Text_Str_1933 = ((local8_Text_Str_1933) + ("return function() { throwError(\"NullPrototypeException\"); };"));
							__debugInfo = "83:\src\CompilerPasses\Generator\JSGenerator.gbas";
							func10_IndentDown();
							__debugInfo = "84:\src\CompilerPasses\Generator\JSGenerator.gbas";
							local8_Text_Str_1933 = ((((((local8_Text_Str_1933) + (func11_NewLine_Str()))) + ("};"))) + (func11_NewLine_Str()));
							__debugInfo = "85:\src\CompilerPasses\Generator\JSGenerator.gbas";
							if (local11_InWebWorker_1932) {
								__debugInfo = "85:\src\CompilerPasses\Generator\JSGenerator.gbas";
								local8_Text_Str_1933 = ((((((((((local8_Text_Str_1933) + (local4_Func_ref_1939[0].attr9_OName_Str))) + (" = window['"))) + (local4_Func_ref_1939[0].attr9_OName_Str))) + ("'];"))) + (func11_NewLine_Str()));
								__debugInfo = "85:\src\CompilerPasses\Generator\JSGenerator.gbas";
							};
							__debugInfo = "80:\src\CompilerPasses\Generator\JSGenerator.gbas";
						};
						__debugInfo = "86:\src\CompilerPasses\Generator\JSGenerator.gbas";
					}
					forEachSaver5440.values[forEachCounter5440] = local4_Func_ref_1939;
				
				};
				__debugInfo = "250:\src\CompilerPasses\Generator\JSGenerator.gbas";
				var forEachSaver6396 = global8_Compiler.attr5_Types_ref[0];
				for(var forEachCounter6396 = 0 ; forEachCounter6396 < forEachSaver6396.values.length ; forEachCounter6396++) {
					var local3_Typ_ref_1940 = forEachSaver6396.values[forEachCounter6396];
				{
						var local5_typId_1941 = 0, local3_map_1942 = pool_HashMap.alloc(), local5_First_1943 = 0, local4_map2_1952 = pool_HashMap.alloc();
						__debugInfo = "92:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local5_typId_1941 = local3_Typ_ref_1940[0].attr2_ID;
						__debugInfo = "94:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func8_IndentUp();
						__debugInfo = "95:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1933 = ((((((((local8_Text_Str_1933) + ("var vtbl_"))) + (local3_Typ_ref_1940[0].attr8_Name_Str))) + (" = {"))) + (func11_NewLine_Str()));
						__debugInfo = "96:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local5_First_1943 = 0;
						__debugInfo = "109:\src\CompilerPasses\Generator\JSGenerator.gbas";
						while ((((local5_typId_1941) !== (-(1))) ? 1 : 0)) {
							__debugInfo = "106:\src\CompilerPasses\Generator\JSGenerator.gbas";
							var forEachSaver5564 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_1941).values[tmpPositionCache][0].attr7_Methods;
							for(var forEachCounter5564 = 0 ; forEachCounter5564 < forEachSaver5564.values.length ; forEachCounter5564++) {
								var local3_Mth_1944 = forEachSaver5564.values[forEachCounter5564];
							{
									__debugInfo = "105:\src\CompilerPasses\Generator\JSGenerator.gbas";
									if (((((((local3_map_1942).DoesKeyExist(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1944).values[tmpPositionCache][0].attr9_OName_Str)) ? 0 : 1)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1944).values[tmpPositionCache][0].attr3_Scp) !== (-(1))) ? 1 : 0))) ? 1 : 0)) {
										__debugInfo = "100:\src\CompilerPasses\Generator\JSGenerator.gbas";
										if (local5_First_1943) {
											__debugInfo = "100:\src\CompilerPasses\Generator\JSGenerator.gbas";
											local8_Text_Str_1933 = ((((local8_Text_Str_1933) + (", "))) + (func11_NewLine_Str()));
											__debugInfo = "100:\src\CompilerPasses\Generator\JSGenerator.gbas";
										};
										__debugInfo = "102:\src\CompilerPasses\Generator\JSGenerator.gbas";
										local8_Text_Str_1933 = ((((((local8_Text_Str_1933) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1944).values[tmpPositionCache][0].attr9_OName_Str))) + (": "))) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1944).values[tmpPositionCache][0].attr8_Name_Str));
										__debugInfo = "103:\src\CompilerPasses\Generator\JSGenerator.gbas";
										(local3_map_1942).Put(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1944).values[tmpPositionCache][0].attr9_OName_Str, local3_Mth_1944);
										__debugInfo = "104:\src\CompilerPasses\Generator\JSGenerator.gbas";
										local5_First_1943 = 1;
										__debugInfo = "100:\src\CompilerPasses\Generator\JSGenerator.gbas";
									};
									__debugInfo = "105:\src\CompilerPasses\Generator\JSGenerator.gbas";
								}
								forEachSaver5564.values[forEachCounter5564] = local3_Mth_1944;
							
							};
							__debugInfo = "108:\src\CompilerPasses\Generator\JSGenerator.gbas";
							local5_typId_1941 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_1941).values[tmpPositionCache][0].attr9_Extending;
							__debugInfo = "106:\src\CompilerPasses\Generator\JSGenerator.gbas";
						};
						__debugInfo = "110:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func10_IndentDown();
						__debugInfo = "111:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1933 = ((((((local8_Text_Str_1933) + (func11_NewLine_Str()))) + ("};"))) + (func11_NewLine_Str()));
						__debugInfo = "118:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if ((((global9_DEBUGMODE) === (0)) ? 1 : 0)) {
							__debugInfo = "115:\src\CompilerPasses\Generator\JSGenerator.gbas";
							local8_Text_Str_1933 = ((((local8_Text_Str_1933) + ("/**"))) + (func11_NewLine_Str()));
							__debugInfo = "116:\src\CompilerPasses\Generator\JSGenerator.gbas";
							local8_Text_Str_1933 = ((((local8_Text_Str_1933) + ("* @constructor"))) + (func11_NewLine_Str()));
							__debugInfo = "117:\src\CompilerPasses\Generator\JSGenerator.gbas";
							local8_Text_Str_1933 = ((((local8_Text_Str_1933) + ("*/"))) + (func11_NewLine_Str()));
							__debugInfo = "115:\src\CompilerPasses\Generator\JSGenerator.gbas";
						};
						__debugInfo = "120:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1933 = ((((((((local8_Text_Str_1933) + ("window ['"))) + (local3_Typ_ref_1940[0].attr8_Name_Str))) + ("'] = function() { this.reset(); }"))) + (func11_NewLine_Str()));
						__debugInfo = "121:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func8_IndentUp();
						__debugInfo = "122:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1933 = ((((((((((((local8_Text_Str_1933) + ("window['"))) + (local3_Typ_ref_1940[0].attr8_Name_Str))) + ("'].prototype.getTypeName = function() { return \""))) + (local3_Typ_ref_1940[0].attr8_Name_Str))) + ("\" };"))) + (func11_NewLine_Str()));
						__debugInfo = "123:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1933 = ((((((((local8_Text_Str_1933) + ("window['"))) + (local3_Typ_ref_1940[0].attr8_Name_Str))) + ("'].prototype.reset = function() {"))) + (func11_NewLine_Str()));
						__debugInfo = "133:\src\CompilerPasses\Generator\JSGenerator.gbas";
						var forEachSaver5705 = local3_Typ_ref_1940[0].attr10_Attributes;
						for(var forEachCounter5705 = 0 ; forEachCounter5705 < forEachSaver5705.values.length ; forEachCounter5705++) {
							var local4_Attr_1945 = forEachSaver5705.values[forEachCounter5705];
						{
								var alias8_variable_ref_1946 = [pool_TIdentifierVari.alloc()];
								__debugInfo = "127:\src\CompilerPasses\Generator\JSGenerator.gbas";
								alias8_variable_ref_1946 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1945).values[tmpPositionCache] /* ALIAS */;
								__debugInfo = "128:\src\CompilerPasses\Generator\JSGenerator.gbas";
								local8_Text_Str_1933 = ((((local8_Text_Str_1933) + ("this."))) + (alias8_variable_ref_1946[0].attr8_Name_Str));
								__debugInfo = "129:\src\CompilerPasses\Generator\JSGenerator.gbas";
								local8_Text_Str_1933 = ((local8_Text_Str_1933) + (" = "));
								__debugInfo = "130:\src\CompilerPasses\Generator\JSGenerator.gbas";
								local8_Text_Str_1933 = ((local8_Text_Str_1933) + (func21_JSGetDefaultValue_Str(alias8_variable_ref_1946[0].attr8_datatype, alias8_variable_ref_1946[0].attr3_ref, 0)));
								__debugInfo = "132:\src\CompilerPasses\Generator\JSGenerator.gbas";
								local8_Text_Str_1933 = ((((local8_Text_Str_1933) + (";"))) + (func11_NewLine_Str()));
								__debugInfo = "127:\src\CompilerPasses\Generator\JSGenerator.gbas";pool_TIdentifierVari.free(alias8_variable_ref_1946);
							}
							forEachSaver5705.values[forEachCounter5705] = local4_Attr_1945;
						
						};
						__debugInfo = "136:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1933 = ((((((((local8_Text_Str_1933) + ("this.vtbl = vtbl_"))) + (local3_Typ_ref_1940[0].attr8_Name_Str))) + (";"))) + (func11_NewLine_Str()));
						__debugInfo = "150:\src\CompilerPasses\Generator\JSGenerator.gbas";
						var forEachSaver5795 = local3_Typ_ref_1940[0].attr10_Attributes;
						for(var forEachCounter5795 = 0 ; forEachCounter5795 < forEachSaver5795.values.length ; forEachCounter5795++) {
							var local4_Attr_1947 = forEachSaver5795.values[forEachCounter5795];
						{
								var alias8_variable_ref_1948 = [pool_TIdentifierVari.alloc()];
								__debugInfo = "140:\src\CompilerPasses\Generator\JSGenerator.gbas";
								alias8_variable_ref_1948 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1947).values[tmpPositionCache] /* ALIAS */;
								__debugInfo = "149:\src\CompilerPasses\Generator\JSGenerator.gbas";
								if ((((alias8_variable_ref_1948[0].attr6_PreDef) !== (-(1))) ? 1 : 0)) {
									__debugInfo = "142:\src\CompilerPasses\Generator\JSGenerator.gbas";
									local8_Text_Str_1933 = ((((local8_Text_Str_1933) + ("this."))) + (alias8_variable_ref_1948[0].attr8_Name_Str));
									__debugInfo = "143:\src\CompilerPasses\Generator\JSGenerator.gbas";
									local8_Text_Str_1933 = ((local8_Text_Str_1933) + (" = "));
									__debugInfo = "144:\src\CompilerPasses\Generator\JSGenerator.gbas";
									if (alias8_variable_ref_1948[0].attr3_ref) {
										__debugInfo = "144:\src\CompilerPasses\Generator\JSGenerator.gbas";
										local8_Text_Str_1933 = ((local8_Text_Str_1933) + ("["));
										__debugInfo = "144:\src\CompilerPasses\Generator\JSGenerator.gbas";
									};
									__debugInfo = "145:\src\CompilerPasses\Generator\JSGenerator.gbas";
									local8_Text_Str_1933 = ((local8_Text_Str_1933) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(alias8_variable_ref_1948[0].attr6_PreDef).values[tmpPositionCache][0]))));
									__debugInfo = "146:\src\CompilerPasses\Generator\JSGenerator.gbas";
									if (alias8_variable_ref_1948[0].attr3_ref) {
										__debugInfo = "146:\src\CompilerPasses\Generator\JSGenerator.gbas";
										local8_Text_Str_1933 = ((local8_Text_Str_1933) + ("]"));
										__debugInfo = "146:\src\CompilerPasses\Generator\JSGenerator.gbas";
									};
									__debugInfo = "148:\src\CompilerPasses\Generator\JSGenerator.gbas";
									local8_Text_Str_1933 = ((((local8_Text_Str_1933) + (";"))) + (func11_NewLine_Str()));
									__debugInfo = "142:\src\CompilerPasses\Generator\JSGenerator.gbas";
								};
								__debugInfo = "140:\src\CompilerPasses\Generator\JSGenerator.gbas";pool_TIdentifierVari.free(alias8_variable_ref_1948);
							}
							forEachSaver5795.values[forEachCounter5795] = local4_Attr_1947;
						
						};
						__debugInfo = "152:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1933 = ((((((((local8_Text_Str_1933) + ("this.pool = pool_"))) + (local3_Typ_ref_1940[0].attr9_OName_Str))) + (";"))) + (func11_NewLine_Str()));
						__debugInfo = "153:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1933 = ((((local8_Text_Str_1933) + ("this.succ = null;"))) + (func11_NewLine_Str()));
						__debugInfo = "155:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func10_IndentDown();
						__debugInfo = "156:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1933 = ((((((local8_Text_Str_1933) + (func11_NewLine_Str()))) + ("};"))) + (func11_NewLine_Str()));
						__debugInfo = "158:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func8_IndentUp();
						__debugInfo = "159:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1933 = ((((((((local8_Text_Str_1933) + ("window['"))) + (local3_Typ_ref_1940[0].attr8_Name_Str))) + ("'].prototype.clone = function() {"))) + (func11_NewLine_Str()));
						__debugInfo = "160:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1933 = ((((((((local8_Text_Str_1933) + ("var other = pool_"))) + (local3_Typ_ref_1940[0].attr9_OName_Str))) + (".alloc();"))) + (func11_NewLine_Str()));
						__debugInfo = "182:\src\CompilerPasses\Generator\JSGenerator.gbas";
						var forEachSaver5987 = local3_Typ_ref_1940[0].attr10_Attributes;
						for(var forEachCounter5987 = 0 ; forEachCounter5987 < forEachSaver5987.values.length ; forEachCounter5987++) {
							var local4_Attr_1949 = forEachSaver5987.values[forEachCounter5987];
						{
								var alias8_variable_ref_1950 = [pool_TIdentifierVari.alloc()], local8_plzclone_1951 = 0;
								__debugInfo = "162:\src\CompilerPasses\Generator\JSGenerator.gbas";
								alias8_variable_ref_1950 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1949).values[tmpPositionCache] /* ALIAS */;
								__debugInfo = "167:\src\CompilerPasses\Generator\JSGenerator.gbas";
								local8_plzclone_1951 = 0;
								__debugInfo = "172:\src\CompilerPasses\Generator\JSGenerator.gbas";
								if (((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1949).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0)) && ((((((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1949).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("int")) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1949).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("float")) ? 1 : 0))) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1949).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("string")) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) {
									__debugInfo = "169:\src\CompilerPasses\Generator\JSGenerator.gbas";
									local8_plzclone_1951 = 0;
									__debugInfo = "169:\src\CompilerPasses\Generator\JSGenerator.gbas";
								} else {
									__debugInfo = "171:\src\CompilerPasses\Generator\JSGenerator.gbas";
									local8_plzclone_1951 = 1;
									__debugInfo = "171:\src\CompilerPasses\Generator\JSGenerator.gbas";
								};
								__debugInfo = "174:\src\CompilerPasses\Generator\JSGenerator.gbas";
								if (global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1949).values[tmpPositionCache][0].attr3_ref) {
									__debugInfo = "174:\src\CompilerPasses\Generator\JSGenerator.gbas";
									local8_plzclone_1951 = 1;
									__debugInfo = "174:\src\CompilerPasses\Generator\JSGenerator.gbas";
								};
								__debugInfo = "175:\src\CompilerPasses\Generator\JSGenerator.gbas";
								local8_Text_Str_1933 = ((((((local8_Text_Str_1933) + ("other."))) + (alias8_variable_ref_1950[0].attr8_Name_Str))) + (" = "));
								__debugInfo = "177:\src\CompilerPasses\Generator\JSGenerator.gbas";
								if (local8_plzclone_1951) {
									__debugInfo = "177:\src\CompilerPasses\Generator\JSGenerator.gbas";
									local8_Text_Str_1933 = ((local8_Text_Str_1933) + ("tryClone("));
									__debugInfo = "177:\src\CompilerPasses\Generator\JSGenerator.gbas";
								};
								__debugInfo = "178:\src\CompilerPasses\Generator\JSGenerator.gbas";
								local8_Text_Str_1933 = ((((local8_Text_Str_1933) + ("this."))) + (alias8_variable_ref_1950[0].attr8_Name_Str));
								__debugInfo = "179:\src\CompilerPasses\Generator\JSGenerator.gbas";
								if (local8_plzclone_1951) {
									__debugInfo = "179:\src\CompilerPasses\Generator\JSGenerator.gbas";
									local8_Text_Str_1933 = ((local8_Text_Str_1933) + (")"));
									__debugInfo = "179:\src\CompilerPasses\Generator\JSGenerator.gbas";
								};
								__debugInfo = "181:\src\CompilerPasses\Generator\JSGenerator.gbas";
								local8_Text_Str_1933 = ((((local8_Text_Str_1933) + (";"))) + (func11_NewLine_Str()));
								__debugInfo = "162:\src\CompilerPasses\Generator\JSGenerator.gbas";pool_TIdentifierVari.free(alias8_variable_ref_1950);
							}
							forEachSaver5987.values[forEachCounter5987] = local4_Attr_1949;
						
						};
						__debugInfo = "184:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1933 = ((((local8_Text_Str_1933) + ("other.vtbl = this.vtbl;"))) + (func11_NewLine_Str()));
						__debugInfo = "185:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1933 = ((((local8_Text_Str_1933) + ("other.pool = this.pool;"))) + (func11_NewLine_Str()));
						__debugInfo = "188:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func10_IndentDown();
						__debugInfo = "189:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1933 = ((((local8_Text_Str_1933) + ("return other;"))) + (func11_NewLine_Str()));
						__debugInfo = "190:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1933 = ((((local8_Text_Str_1933) + ("};"))) + (func11_NewLine_Str()));
						__debugInfo = "192:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func8_IndentUp();
						__debugInfo = "193:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1933 = ((((((((local8_Text_Str_1933) + ("pool_"))) + (local3_Typ_ref_1940[0].attr9_OName_Str))) + (" = { "))) + (func11_NewLine_Str()));
						__debugInfo = "194:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1933 = ((((local8_Text_Str_1933) + ("last: null, "))) + (func11_NewLine_Str()));
						__debugInfo = "195:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func8_IndentUp();
						__debugInfo = "196:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1933 = ((((local8_Text_Str_1933) + ("alloc: function() { "))) + (func11_NewLine_Str()));
						__debugInfo = "197:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1933 = ((((local8_Text_Str_1933) + ("var obj = null;"))) + (func11_NewLine_Str()));
						__debugInfo = "198:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func8_IndentUp();
						__debugInfo = "199:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1933 = ((((((((local8_Text_Str_1933) + ("if (pool_"))) + (local3_Typ_ref_1940[0].attr9_OName_Str))) + (".last !== null) {"))) + (func11_NewLine_Str()));
						__debugInfo = "200:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1933 = ((((((((local8_Text_Str_1933) + ("obj = pool_"))) + (local3_Typ_ref_1940[0].attr9_OName_Str))) + (".last;"))) + (func11_NewLine_Str()));
						__debugInfo = "201:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1933 = ((((((((local8_Text_Str_1933) + ("pool_"))) + (local3_Typ_ref_1940[0].attr9_OName_Str))) + (".last = obj.succ;"))) + (func11_NewLine_Str()));
						__debugInfo = "202:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func10_IndentDown();
						__debugInfo = "203:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1933 = ((((local8_Text_Str_1933) + ("obj.succ = null;"))) + (func11_NewLine_Str()));
						__debugInfo = "204:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func8_IndentUp();
						__debugInfo = "205:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1933 = ((((local8_Text_Str_1933) + ("} else {"))) + (func11_NewLine_Str()));
						__debugInfo = "206:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func10_IndentDown();
						__debugInfo = "207:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1933 = ((((((((local8_Text_Str_1933) + ("obj = new "))) + (local3_Typ_ref_1940[0].attr8_Name_Str))) + ("();"))) + (func11_NewLine_Str()));
						__debugInfo = "208:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1933 = ((((local8_Text_Str_1933) + ("}"))) + (func11_NewLine_Str()));
						__debugInfo = "209:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func10_IndentDown();
						__debugInfo = "210:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1933 = ((((local8_Text_Str_1933) + ("return obj;"))) + (func11_NewLine_Str()));
						__debugInfo = "211:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1933 = ((((local8_Text_Str_1933) + ("},"))) + (func11_NewLine_Str()));
						__debugInfo = "212:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func8_IndentUp();
						__debugInfo = "213:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1933 = ((((local8_Text_Str_1933) + ("free: function(obj)  {"))) + (func11_NewLine_Str()));
						__debugInfo = "214:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1933 = ((((local8_Text_Str_1933) + ("if (obj.succ !== null) return;"))) + (func11_NewLine_Str()));
						__debugInfo = "215:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1933 = ((((local8_Text_Str_1933) + ("obj.reset();"))) + (func11_NewLine_Str()));
						__debugInfo = "216:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1933 = ((((((((local8_Text_Str_1933) + ("obj.succ = pool_"))) + (local3_Typ_ref_1940[0].attr9_OName_Str))) + (".last;"))) + (func11_NewLine_Str()));
						__debugInfo = "217:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func10_IndentDown();
						__debugInfo = "218:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1933 = ((((((((local8_Text_Str_1933) + ("pool_"))) + (local3_Typ_ref_1940[0].attr9_OName_Str))) + (".last = obj;"))) + (func11_NewLine_Str()));
						__debugInfo = "219:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func10_IndentDown();
						__debugInfo = "220:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1933 = ((((local8_Text_Str_1933) + ("}"))) + (func11_NewLine_Str()));
						__debugInfo = "221:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1933 = ((((local8_Text_Str_1933) + ("}"))) + (func11_NewLine_Str()));
						__debugInfo = "223:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (local11_InWebWorker_1932) {
							__debugInfo = "223:\src\CompilerPasses\Generator\JSGenerator.gbas";
							local8_Text_Str_1933 = ((((((((((local8_Text_Str_1933) + (local3_Typ_ref_1940[0].attr8_Name_Str))) + (" = window['"))) + (local3_Typ_ref_1940[0].attr8_Name_Str))) + ("'];"))) + (func11_NewLine_Str()));
							__debugInfo = "223:\src\CompilerPasses\Generator\JSGenerator.gbas";
						};
						__debugInfo = "226:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local5_typId_1941 = local3_Typ_ref_1940[0].attr2_ID;
						__debugInfo = "229:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local5_First_1943 = 0;
						__debugInfo = "249:\src\CompilerPasses\Generator\JSGenerator.gbas";
						while ((((local5_typId_1941) !== (-(1))) ? 1 : 0)) {
							__debugInfo = "246:\src\CompilerPasses\Generator\JSGenerator.gbas";
							var forEachSaver6385 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_1941).values[tmpPositionCache][0].attr7_Methods;
							for(var forEachCounter6385 = 0 ; forEachCounter6385 < forEachSaver6385.values.length ; forEachCounter6385++) {
								var local3_Mth_1953 = forEachSaver6385.values[forEachCounter6385];
							{
									__debugInfo = "245:\src\CompilerPasses\Generator\JSGenerator.gbas";
									if (((((((local4_map2_1952).DoesKeyExist(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1953).values[tmpPositionCache][0].attr9_OName_Str)) ? 0 : 1)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1953).values[tmpPositionCache][0].attr3_Scp) !== (-(1))) ? 1 : 0))) ? 1 : 0)) {
										__debugInfo = "233:\src\CompilerPasses\Generator\JSGenerator.gbas";
										func8_IndentUp();
										__debugInfo = "234:\src\CompilerPasses\Generator\JSGenerator.gbas";
										local8_Text_Str_1933 = ((((((((((((local8_Text_Str_1933) + (local3_Typ_ref_1940[0].attr8_Name_Str))) + (".prototype."))) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1953).values[tmpPositionCache][0].attr9_OName_Str))) + (" = function() {"))) + (func11_NewLine_Str()))) + (" return "));
										__debugInfo = "235:\src\CompilerPasses\Generator\JSGenerator.gbas";
										local8_Text_Str_1933 = ((((((local8_Text_Str_1933) + ("this.vtbl."))) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1953).values[tmpPositionCache][0].attr9_OName_Str))) + ("("));
										__debugInfo = "236:\src\CompilerPasses\Generator\JSGenerator.gbas";
										{
											var local1_i_1954 = 0.0;
											__debugInfo = "239:\src\CompilerPasses\Generator\JSGenerator.gbas";
											for (local1_i_1954 = 0;toCheck(local1_i_1954, ((BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1953).values[tmpPositionCache][0].attr6_Params, 0)) - (2)), 1);local1_i_1954 += 1) {
												__debugInfo = "238:\src\CompilerPasses\Generator\JSGenerator.gbas";
												local8_Text_Str_1933 = ((((((local8_Text_Str_1933) + ("arguments["))) + (CAST2STRING(local1_i_1954)))) + ("], "));
												__debugInfo = "238:\src\CompilerPasses\Generator\JSGenerator.gbas";
											};
											__debugInfo = "239:\src\CompilerPasses\Generator\JSGenerator.gbas";
										};
										__debugInfo = "241:\src\CompilerPasses\Generator\JSGenerator.gbas";
										local8_Text_Str_1933 = ((local8_Text_Str_1933) + ("this"));
										__debugInfo = "242:\src\CompilerPasses\Generator\JSGenerator.gbas";
										func10_IndentDown();
										__debugInfo = "243:\src\CompilerPasses\Generator\JSGenerator.gbas";
										local8_Text_Str_1933 = ((((((((local8_Text_Str_1933) + (");"))) + (func11_NewLine_Str()))) + ("};"))) + (func11_NewLine_Str()));
										__debugInfo = "244:\src\CompilerPasses\Generator\JSGenerator.gbas";
										(local4_map2_1952).Put(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1953).values[tmpPositionCache][0].attr9_OName_Str, local3_Mth_1953);
										__debugInfo = "233:\src\CompilerPasses\Generator\JSGenerator.gbas";
									};
									__debugInfo = "245:\src\CompilerPasses\Generator\JSGenerator.gbas";
								}
								forEachSaver6385.values[forEachCounter6385] = local3_Mth_1953;
							
							};
							__debugInfo = "248:\src\CompilerPasses\Generator\JSGenerator.gbas";
							local5_typId_1941 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_1941).values[tmpPositionCache][0].attr9_Extending;
							__debugInfo = "246:\src\CompilerPasses\Generator\JSGenerator.gbas";
						};
						__debugInfo = "92:\src\CompilerPasses\Generator\JSGenerator.gbas";pool_HashMap.free(local3_map_1942);pool_HashMap.free(local4_map2_1952);
					}
					forEachSaver6396.values[forEachCounter6396] = local3_Typ_ref_1940;
				
				};
				__debugInfo = "262:\src\CompilerPasses\Generator\JSGenerator.gbas";
				var forEachSaver6455 = global8_Compiler.attr10_DataBlocks;
				for(var forEachCounter6455 = 0 ; forEachCounter6455 < forEachSaver6455.values.length ; forEachCounter6455++) {
					var local5_block_1955 = forEachSaver6455.values[forEachCounter6455];
				{
						var local4_Done_1956 = 0;
						__debugInfo = "254:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1933 = ((((((local8_Text_Str_1933) + ("var datablock_"))) + (local5_block_1955.attr8_Name_Str))) + (" = [ "));
						__debugInfo = "255:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local4_Done_1956 = 0;
						__debugInfo = "260:\src\CompilerPasses\Generator\JSGenerator.gbas";
						var forEachSaver6447 = local5_block_1955.attr5_Datas;
						for(var forEachCounter6447 = 0 ; forEachCounter6447 < forEachSaver6447.values.length ; forEachCounter6447++) {
							var local1_d_1957 = forEachSaver6447.values[forEachCounter6447];
						{
								__debugInfo = "257:\src\CompilerPasses\Generator\JSGenerator.gbas";
								if (local4_Done_1956) {
									__debugInfo = "257:\src\CompilerPasses\Generator\JSGenerator.gbas";
									local8_Text_Str_1933 = ((local8_Text_Str_1933) + (", "));
									__debugInfo = "257:\src\CompilerPasses\Generator\JSGenerator.gbas";
								};
								__debugInfo = "258:\src\CompilerPasses\Generator\JSGenerator.gbas";
								local8_Text_Str_1933 = ((local8_Text_Str_1933) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local1_d_1957).values[tmpPositionCache][0]))));
								__debugInfo = "259:\src\CompilerPasses\Generator\JSGenerator.gbas";
								local4_Done_1956 = 1;
								__debugInfo = "257:\src\CompilerPasses\Generator\JSGenerator.gbas";
							}
							forEachSaver6447.values[forEachCounter6447] = local1_d_1957;
						
						};
						__debugInfo = "261:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1933 = ((((local8_Text_Str_1933) + (" ];"))) + (func11_NewLine_Str()));
						__debugInfo = "254:\src\CompilerPasses\Generator\JSGenerator.gbas";
					}
					forEachSaver6455.values[forEachCounter6455] = local5_block_1955;
				
				};
				__debugInfo = "270:\src\CompilerPasses\Generator\JSGenerator.gbas";
				if ((((BOUNDS(global8_Compiler.attr7_Globals, 0)) > (0)) ? 1 : 0)) {
					__debugInfo = "266:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1933 = ((local8_Text_Str_1933) + ("var "));
					__debugInfo = "267:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1933 = ((local8_Text_Str_1933) + (func13_JSVariDef_Str(unref(global8_Compiler.attr7_Globals), 1, 0, 1)));
					__debugInfo = "269:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1933 = ((((local8_Text_Str_1933) + (";"))) + (func11_NewLine_Str()));
					__debugInfo = "266:\src\CompilerPasses\Generator\JSGenerator.gbas";
				};
				__debugInfo = "283:\src\CompilerPasses\Generator\JSGenerator.gbas";
				if ((((TRIM_Str(local14_StaticText_Str_1934, " \t\r\n\v\f")) !== ("")) ? 1 : 0)) {
					__debugInfo = "273:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1933 = ((((local8_Text_Str_1933) + ("// set default statics:"))) + (func11_NewLine_Str()));
					__debugInfo = "274:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1933 = ((local17_StaticDefText_Str_1935) + (local8_Text_Str_1933));
					__debugInfo = "275:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func8_IndentUp();
					__debugInfo = "276:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1933 = ((((local8_Text_Str_1933) + ("window['initStatics'] = function() {"))) + (func11_NewLine_Str()));
					__debugInfo = "277:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func10_IndentDown();
					__debugInfo = "278:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1933 = ((((local8_Text_Str_1933) + (local14_StaticText_Str_1934))) + (func11_NewLine_Str()));
					__debugInfo = "279:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1933 = ((((local8_Text_Str_1933) + ("}"))) + (func11_NewLine_Str()));
					__debugInfo = "273:\src\CompilerPasses\Generator\JSGenerator.gbas";
				} else {
					__debugInfo = "282:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1933 = ((((local8_Text_Str_1933) + ("window['initStatics'] = function() {}"))) + (func11_NewLine_Str()));
					__debugInfo = "282:\src\CompilerPasses\Generator\JSGenerator.gbas";
				};
				__debugInfo = "284:\src\CompilerPasses\Generator\JSGenerator.gbas";
				if (local11_InWebWorker_1932) {
					__debugInfo = "284:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1933 = ((((local8_Text_Str_1933) + ("initStatics = window['initStatics'];"))) + (func11_NewLine_Str()));
					__debugInfo = "284:\src\CompilerPasses\Generator\JSGenerator.gbas";
				};
				__debugInfo = "286:\src\CompilerPasses\Generator\JSGenerator.gbas";
				local8_Text_Str_1933 = ((((local8_Text_Str_1933) + ("for (var __init = 0; __init < preInitFuncs.length; __init++) preInitFuncs[__init]();"))) + (func11_NewLine_Str()));
				__debugInfo = "288:\src\CompilerPasses\Generator\JSGenerator.gbas";
				local8_Text_Str_1933 = ((((local8_Text_Str_1933) + ("preInitFuncs = [];"))) + (func11_NewLine_Str()));
				__debugInfo = "291:\src\CompilerPasses\Generator\JSGenerator.gbas";
				return tryClone(local8_Text_Str_1933);
				__debugInfo = "28:\src\CompilerPasses\Generator\JSGenerator.gbas";
			} catch (Err_Str) {
				if (Err_Str instanceof OTTException) Err_Str = Err_Str.getText(); else throwError(Err_Str);{
					
				}
			};
			__debugInfo = "293:\src\CompilerPasses\Generator\JSGenerator.gbas";
		};
		__debugInfo = "294:\src\CompilerPasses\Generator\JSGenerator.gbas";
		return "";
		__debugInfo = "292:\src\CompilerPasses\Generator\JSGenerator.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func16_JS_Generator_Str = window['func16_JS_Generator_Str'];
window['func14_JSGenerate_Str'] = function(param4_expr) {
		var __labels = {"Exit": 8022};
		
	stackPush("function: JSGenerate_Str", __debugInfo);
	try {
		var local8_Text_Str_1960 = "";
		var __pc = 6578;
		while(__pc >= 0) {
			switch(__pc) {
				case 6578:
					__debugInfo = "302:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global8_Compiler.attr11_currentPosi = param4_expr.attr5_tokID;
					
				__debugInfo = "303:\src\CompilerPasses\Generator\JSGenerator.gbas";
				local8_Text_Str_1960 = "";
				__debugInfo = "304:\src\CompilerPasses\Generator\JSGenerator.gbas";
				
					var local17___SelectHelper10__1961 = 0;
					case 6588:
						__debugInfo = "304:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local17___SelectHelper10__1961 = param4_expr.attr3_Typ;
						
					case 11074:
						__debugInfo = "1128:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((local17___SelectHelper10__1961) === (~~(2))) ? 1 : 0))) { __pc = 6590; break; }
					
					var local4_oScp_1962 = 0.0, local5_oFunc_1963 = 0.0, local13_oLabelDef_Str_1964 = "", local9_oIsInGoto_1965 = 0, local6_IsFunc_1966 = 0, local7_mngGoto_1967 = 0, local13_IsStackPusher_1968 = 0, local7_Def_Str_1972 = "", local15_BeforeUndef_Str_1973 = "", local11_MyUndef_Str_1974 = "", local8_ERes_Str_1978 = pool_array.alloc(""), local13_FirstText_Str_1981 = "";
					case 6595:
						__debugInfo = "306:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local4_oScp_1962 = global12_CurrentScope;
						
					__debugInfo = "307:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local5_oFunc_1963 = global11_CurrentFunc;
					__debugInfo = "308:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local13_oLabelDef_Str_1964 = global12_LabelDef_Str;
					__debugInfo = "309:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local9_oIsInGoto_1965 = global8_IsInGoto;
					__debugInfo = "310:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local6_IsFunc_1966 = 0;
					__debugInfo = "311:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local7_mngGoto_1967 = 0;
					__debugInfo = "312:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local13_IsStackPusher_1968 = 0;
					case 6641:
						__debugInfo = "313:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(((((((param4_expr.attr6_ScpTyp) === (2)) ? 1 : 0)) || ((((param4_expr.attr6_ScpTyp) === (4)) ? 1 : 0))) ? 1 : 0))) { __pc = 6636; break; }
					
					case 6640:
						__debugInfo = "313:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local13_IsStackPusher_1968 = 1;
						
					__debugInfo = "313:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 6636: //dummy jumper1
					;
						
					case 6654:
						__debugInfo = "318:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((func12_ScopeHasGoto(param4_expr)) && (local13_IsStackPusher_1968)) ? 1 : 0))) { __pc = 6646; break; }
					
					case 6650:
						__debugInfo = "316:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local7_mngGoto_1967 = 1;
						
					__debugInfo = "317:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global8_IsInGoto = 1;
					__debugInfo = "316:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 6646: //dummy jumper1
					;
						
					case 6691:
						__debugInfo = "333:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((param4_expr.attr6_ScpTyp) === (2)) ? 1 : 0))) { __pc = 6660; break; }
					
					var local1_i_1969 = 0;
					case 6690:
						__debugInfo = "332:\src\CompilerPasses\Generator\JSGenerator.gbas";
						var forEachSaver6690 = global8_Compiler.attr5_Funcs_ref[0];
					var forEachCounter6690 = 0
					
				case 6668: //dummy for1
					if (!(forEachCounter6690 < forEachSaver6690.values.length)) {__pc = 6664; break;}
					var local4_Func_ref_1970 = forEachSaver6690.values[forEachCounter6690];
					
					
					case 6686:
						__debugInfo = "330:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((local4_Func_ref_1970[0].attr3_Scp) === (param4_expr.attr2_ID)) ? 1 : 0))) { __pc = 6677; break; }
					
					case 6681:
						__debugInfo = "325:\src\CompilerPasses\Generator\JSGenerator.gbas";
						global11_CurrentFunc = local1_i_1969;
						
					__debugInfo = "326:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local6_IsFunc_1966 = 1;
					case 6685:
						__debugInfo = "329:\src\CompilerPasses\Generator\JSGenerator.gbas";
						__pc = 6664; break;
						
					__debugInfo = "325:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 6677: //dummy jumper1
					;
						
					__debugInfo = "331:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local1_i_1969+=1;
					__debugInfo = "330:\src\CompilerPasses\Generator\JSGenerator.gbas";
					forEachSaver6690.values[forEachCounter6690] = local4_Func_ref_1970;
					
					forEachCounter6690++
					__pc = 6668; break; //back jump
					
				case 6664: //dummy for
					;
						
					__debugInfo = "332:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 6660: //dummy jumper1
					;
						
					__debugInfo = "334:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global12_CurrentScope = param4_expr.attr2_ID;
					case 6707:
						__debugInfo = "343:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((((global8_IsInGoto) ? 0 : 1)) || (local7_mngGoto_1967)) ? 1 : 0))) { __pc = 6703; break; }
					
					case 6705:
						__debugInfo = "340:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func8_IndentUp();
						
					__debugInfo = "340:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 6703: //dummy jumper1
					
					
					
				case 29388: //dummy jumper2
					;
						
					__debugInfo = "344:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((local8_Text_Str_1960) + (func11_NewLine_Str()));
					case 6738:
						__debugInfo = "352:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((global9_DEBUGMODE) && (local13_IsStackPusher_1968)) ? 1 : 0))) { __pc = 6716; break; }
					
					case 6729:
						__debugInfo = "349:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((((((local8_Text_Str_1960) + ("stackPush(\""))) + (func13_ScopeName_Str(param4_expr)))) + ("\", __debugInfo);"))) + (func11_NewLine_Str()));
						
					__debugInfo = "350:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func8_IndentUp();
					__debugInfo = "351:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((local8_Text_Str_1960) + ("try {"))) + (func11_NewLine_Str()));
					__debugInfo = "349:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 6716: //dummy jumper1
					;
						
					case 6801:
						__debugInfo = "367:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((local6_IsFunc_1966) && (global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr15_UsedAsPrototype)) ? 1 : 0))) { __pc = 6748; break; }
					
					case 6800:
						__debugInfo = "366:\src\CompilerPasses\Generator\JSGenerator.gbas";
						var forEachSaver6800 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr6_Params;
					var forEachCounter6800 = 0
					
				case 6759: //dummy for1
					if (!(forEachCounter6800 < forEachSaver6800.values.length)) {__pc = 6751; break;}
					var local1_P_1971 = forEachSaver6800.values[forEachCounter6800];
					
					
					case 6799:
						__debugInfo = "365:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_1971).values[tmpPositionCache][0].attr3_ref) === (0)) ? 1 : 0))) { __pc = 6771; break; }
					
					case 6797:
						__debugInfo = "362:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((((((((local8_Text_Str_1960) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_1971).values[tmpPositionCache][0].attr8_Name_Str))) + (" = unref("))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_1971).values[tmpPositionCache][0].attr8_Name_Str))) + (");"))) + (func11_NewLine_Str()));
						
					__debugInfo = "362:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29391;
					break;
					
				case 6771: //dummy jumper1
					
					
					
				case 29391: //dummy jumper2
					;
						
					__debugInfo = "365:\src\CompilerPasses\Generator\JSGenerator.gbas";
					forEachSaver6800.values[forEachCounter6800] = local1_P_1971;
					
					forEachCounter6800++
					__pc = 6759; break; //back jump
					
				case 6751: //dummy for
					;
						
					__debugInfo = "366:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 6748: //dummy jumper1
					;
						
					__debugInfo = "370:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local7_Def_Str_1972 = func13_JSVariDef_Str(unref(param4_expr.attr5_Varis), 0, 1, 1);
					case 6835:
						__debugInfo = "375:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((TRIM_Str(local7_Def_Str_1972, " \t\r\n\v\f")) !== ("")) ? 1 : 0))) { __pc = 6816; break; }
					
					case 6822:
						__debugInfo = "372:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((local8_Text_Str_1960) + ("var "));
						
					__debugInfo = "373:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((local8_Text_Str_1960) + (local7_Def_Str_1972));
					__debugInfo = "374:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((local8_Text_Str_1960) + (";"))) + (func11_NewLine_Str()));
					__debugInfo = "372:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 6816: //dummy jumper1
					;
						
					__debugInfo = "377:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local15_BeforeUndef_Str_1973 = global13_VariUndef_Str;
					__debugInfo = "378:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local11_MyUndef_Str_1974 = "";
					case 6944:
						__debugInfo = "389:\src\CompilerPasses\Generator\JSGenerator.gbas";
						var forEachSaver6944 = param4_expr.attr5_Varis;
					var forEachCounter6944 = 0
					
				case 6849: //dummy for1
					if (!(forEachCounter6944 < forEachSaver6944.values.length)) {__pc = 6845; break;}
					var local3_Var_1975 = forEachSaver6944.values[forEachCounter6944];
					
					
					case 6943:
						__debugInfo = "388:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_1975).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0))) { __pc = 6862; break; }
					
					case 6928:
						__debugInfo = "385:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(func6_IsType(global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_1975).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) { __pc = 6874; break; }
					
					case 6927:
						__debugInfo = "384:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_1975).values[tmpPositionCache][0].attr3_Typ) !== (5)) ? 1 : 0)) && ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_1975).values[tmpPositionCache][0].attr3_Typ) !== (4)) ? 1 : 0))) ? 1 : 0)) && (func17_JSShouldRedeclare(local3_Var_1975))) ? 1 : 0))) { __pc = 6898; break; }
					
					case 6926:
						__debugInfo = "383:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local11_MyUndef_Str_1974 = ((((((((((local11_MyUndef_Str_1974) + ("pool_"))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_1975).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) + (".free("))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_1975).values[tmpPositionCache][0].attr8_Name_Str))) + (");"));
						
					__debugInfo = "383:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 6898: //dummy jumper1
					;
						
					__debugInfo = "384:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 6874: //dummy jumper1
					;
						
					__debugInfo = "385:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29393;
					break;
					
				case 6862: //dummy jumper1
					
					case 6942:
						__debugInfo = "387:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local11_MyUndef_Str_1974 = (((("pool_array.free(") + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_1975).values[tmpPositionCache][0].attr8_Name_Str))) + (");"));
						
					__debugInfo = "387:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29393: //dummy jumper2
					;
						
					__debugInfo = "388:\src\CompilerPasses\Generator\JSGenerator.gbas";
					forEachSaver6944.values[forEachCounter6944] = local3_Var_1975;
					
					forEachCounter6944++
					__pc = 6849; break; //back jump
					
				case 6845: //dummy for
					;
						
					case 7022:
						__debugInfo = "399:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(((((((global11_CurrentFunc) !== (-(1))) ? 1 : 0)) && ((((local5_oFunc_1963) === (-(1))) ? 1 : 0))) ? 1 : 0))) { __pc = 6957; break; }
					
					var local1_i_1976 = 0;
					case 7021:
						__debugInfo = "398:\src\CompilerPasses\Generator\JSGenerator.gbas";
						var forEachSaver7021 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr6_Params;
					var forEachCounter7021 = 0
					
				case 6969: //dummy for1
					if (!(forEachCounter7021 < forEachSaver7021.values.length)) {__pc = 6961; break;}
					var local5_Param_1977 = forEachSaver7021.values[forEachCounter7021];
					
					
					case 7020:
						__debugInfo = "397:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local5_Param_1977).values[tmpPositionCache][0].attr9_OwnerVari) !== (-(1))) ? 1 : 0))) { __pc = 6982; break; }
					
					case 7016:
						__debugInfo = "395:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((((((((((local8_Text_Str_1960) + ("var "))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(global8_Compiler.attr5_Varis_ref[0].arrAccess(local5_Param_1977).values[tmpPositionCache][0].attr9_OwnerVari).values[tmpPositionCache][0].attr8_Name_Str))) + (" = ["))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local5_Param_1977).values[tmpPositionCache][0].attr8_Name_Str))) + ("];"))) + (func11_NewLine_Str()));
						
					__debugInfo = "396:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local1_i_1976+=1;
					__debugInfo = "395:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 6982: //dummy jumper1
					;
						
					__debugInfo = "397:\src\CompilerPasses\Generator\JSGenerator.gbas";
					forEachSaver7021.values[forEachCounter7021] = local5_Param_1977;
					
					forEachCounter7021++
					__pc = 6969; break; //back jump
					
				case 6961: //dummy for
					;
						
					__debugInfo = "398:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 6957: //dummy jumper1
					;
						
					case 7029:
						__debugInfo = "406:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(local7_mngGoto_1967)) { __pc = 7024; break; }
					
					case 7026:
						__debugInfo = "403:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func8_IndentUp();
						
					__debugInfo = "404:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func8_IndentUp();
					__debugInfo = "405:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func8_IndentUp();
					__debugInfo = "403:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7024: //dummy jumper1
					;
						
					case 7061:
						__debugInfo = "414:\src\CompilerPasses\Generator\JSGenerator.gbas";
						var forEachSaver7061 = param4_expr.attr5_Exprs;
					var forEachCounter7061 = 0
					
				case 7036: //dummy for1
					if (!(forEachCounter7061 < forEachSaver7061.values.length)) {__pc = 7032; break;}
					var local2_Ex_1979 = forEachSaver7061.values[forEachCounter7061];
					
					
					var local7_add_Str_1980 = "";
					case 7043:
						__debugInfo = "409:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local7_add_Str_1980 = func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local2_Ex_1979).values[tmpPositionCache][0]));
						
					case 7060:
						__debugInfo = "413:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((TRIM_Str(local7_add_Str_1980, " \t\r\n\v\f")) !== ("")) ? 1 : 0))) { __pc = 7049; break; }
					
					case 7055:
						__debugInfo = "411:\src\CompilerPasses\Generator\JSGenerator.gbas";
						DIMPUSH(local8_ERes_Str_1978, CAST2STRING(local2_Ex_1979));
						
					__debugInfo = "412:\src\CompilerPasses\Generator\JSGenerator.gbas";
					DIMPUSH(local8_ERes_Str_1978, local7_add_Str_1980);
					__debugInfo = "411:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7049: //dummy jumper1
					;
						
					__debugInfo = "409:\src\CompilerPasses\Generator\JSGenerator.gbas";
					forEachSaver7061.values[forEachCounter7061] = local2_Ex_1979;
					
					forEachCounter7061++
					__pc = 7036; break; //back jump
					
				case 7032: //dummy for
					;
						
					case 7118:
						__debugInfo = "434:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(local7_mngGoto_1967)) { __pc = 7063; break; }
					
					case 7065:
						__debugInfo = "417:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func10_IndentDown();
						
					__debugInfo = "418:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func10_IndentDown();
					__debugInfo = "419:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func10_IndentDown();
					__debugInfo = "422:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((local8_Text_Str_1960) + ("var __pc = "));
					case 7094:
						__debugInfo = "427:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((BOUNDS(local8_ERes_Str_1978, 0)) > (0)) ? 1 : 0))) { __pc = 7079; break; }
					
					case 7087:
						__debugInfo = "424:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((local8_Text_Str_1960) + (local8_ERes_Str_1978.arrAccess(0).values[tmpPositionCache]));
						
					__debugInfo = "424:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29401;
					break;
					
				case 7079: //dummy jumper1
					
					case 7093:
						__debugInfo = "426:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((local8_Text_Str_1960) + ("0"));
						
					__debugInfo = "426:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29401: //dummy jumper2
					;
						
					__debugInfo = "428:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((local8_Text_Str_1960) + (";"))) + (func11_NewLine_Str()));
					__debugInfo = "430:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func8_IndentUp();
					__debugInfo = "431:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((local8_Text_Str_1960) + ("while(__pc >= 0) {"))) + (func11_NewLine_Str()));
					__debugInfo = "432:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func8_IndentUp();
					__debugInfo = "433:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((local8_Text_Str_1960) + ("switch(__pc) {"))) + (func11_NewLine_Str()));
					__debugInfo = "417:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7063: //dummy jumper1
					;
						
					__debugInfo = "436:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local13_FirstText_Str_1981 = "";
					__debugInfo = "436:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
					var local1_i_1982 = 0.0;
					case 7333:
						__debugInfo = "459:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local1_i_1982 = 0
					
				case 7127: //dummy for1
					if (!toCheck(local1_i_1982, ((BOUNDS(local8_ERes_Str_1978, 0)) - (1)), 2)) {__pc = 7138; break;}
					
					var local7_add_Str_1983 = "", local2_Ex_1984 = 0, alias4_ExEx_ref_1985 = [pool_TExpr.alloc()], local7_HasCase_1986 = 0;
					case 7148:
						__debugInfo = "438:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local7_add_Str_1983 = local8_ERes_Str_1978.arrAccess(~~(((local1_i_1982) + (1)))).values[tmpPositionCache];
						
					__debugInfo = "439:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local2_Ex_1984 = INT2STR(local8_ERes_Str_1978.arrAccess(~~(local1_i_1982)).values[tmpPositionCache]);
					__debugInfo = "440:\src\CompilerPasses\Generator\JSGenerator.gbas";
					alias4_ExEx_ref_1985 = global5_Exprs_ref[0].arrAccess(local2_Ex_1984).values[tmpPositionCache] /* ALIAS */;
					__debugInfo = "441:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local7_HasCase_1986 = 0;
					case 7257:
						__debugInfo = "446:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(((((((local7_mngGoto_1967) || (global8_IsInGoto)) ? 1 : 0)) && ((((((((((((((((((((((((((((((((((local1_i_1982) === (0)) ? 1 : 0)) || ((((alias4_ExEx_ref_1985[0].attr3_Typ) === (20)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1985[0].attr3_Typ) === (21)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1985[0].attr3_Typ) === (24)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1985[0].attr3_Typ) === (25)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1985[0].attr3_Typ) === (27)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1985[0].attr3_Typ) === (38)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1985[0].attr3_Typ) === (26)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1985[0].attr3_Typ) === (29)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1985[0].attr3_Typ) === (30)) ? 1 : 0))) ? 1 : 0)) || ((((local1_i_1982) === (((BOUNDS(local8_ERes_Str_1978, 0)) - (1)))) ? 1 : 0))) ? 1 : 0))) ? 1 : 0))) { __pc = 7239; break; }
					
					case 7241:
						__debugInfo = "443:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func8_IndentUp();
						
					__debugInfo = "444:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local7_HasCase_1986 = 1;
					__debugInfo = "445:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((((((local8_Text_Str_1960) + ("case "))) + (CAST2STRING(local2_Ex_1984)))) + (":"))) + (func11_NewLine_Str()));
					__debugInfo = "443:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7239: //dummy jumper1
					;
						
					case 7310:
						__debugInfo = "451:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(global9_DEBUGMODE)) { __pc = 7259; break; }
					
					var local7_Add_Str_1987 = "";
					case 7292:
						__debugInfo = "448:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local7_Add_Str_1987 = (((((((("__debugInfo = \"") + (CAST2STRING(global8_Compiler.attr6_Tokens.arrAccess(global5_Exprs_ref[0].arrAccess(local2_Ex_1984).values[tmpPositionCache][0].attr5_tokID).values[tmpPositionCache].attr4_Line)))) + (":"))) + (global8_Compiler.attr6_Tokens.arrAccess(global5_Exprs_ref[0].arrAccess(local2_Ex_1984).values[tmpPositionCache][0].attr5_tokID).values[tmpPositionCache].attr8_Path_Str))) + ("\";"));
						
					__debugInfo = "449:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((local8_Text_Str_1960) + (local7_Add_Str_1987))) + (func11_NewLine_Str()));
					case 7309:
						__debugInfo = "450:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((local13_FirstText_Str_1981) === ("")) ? 1 : 0))) { __pc = 7304; break; }
					
					case 7308:
						__debugInfo = "450:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local13_FirstText_Str_1981 = local7_Add_Str_1987;
						
					__debugInfo = "450:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7304: //dummy jumper1
					;
						
					__debugInfo = "448:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7259: //dummy jumper1
					;
						
					__debugInfo = "453:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((local8_Text_Str_1960) + (local7_add_Str_1983));
					__debugInfo = "454:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((local8_Text_Str_1960) + (";"))) + (func11_NewLine_Str()));
					case 7332:
						__debugInfo = "458:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(local7_HasCase_1986)) { __pc = 7324; break; }
					
					case 7326:
						__debugInfo = "456:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func10_IndentDown();
						
					__debugInfo = "457:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((local8_Text_Str_1960) + (func11_NewLine_Str()));
					__debugInfo = "456:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7324: //dummy jumper1
					;
						
					__debugInfo = "438:\src\CompilerPasses\Generator\JSGenerator.gbas";pool_TExpr.free(alias4_ExEx_ref_1985);
					local1_i_1982 += 2;
					__pc = 7127; break; //back jump
					
				case 7138: //dummy for
					;
						
					__debugInfo = "459:\src\CompilerPasses\Generator\JSGenerator.gbas";
					;
					case 7344:
						__debugInfo = "463:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((local13_FirstText_Str_1981) !== ("")) ? 1 : 0))) { __pc = 7337; break; }
					
					case 7343:
						__debugInfo = "462:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((local8_Text_Str_1960) + (local13_FirstText_Str_1981));
						
					__debugInfo = "462:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7337: //dummy jumper1
					;
						
					__debugInfo = "465:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((local8_Text_Str_1960) + (local11_MyUndef_Str_1974));
					case 7410:
						__debugInfo = "481:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(local7_mngGoto_1967)) { __pc = 7351; break; }
					
					case 7359:
						__debugInfo = "468:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((local8_Text_Str_1960) + ("__pc = -1; break;"))) + (func11_NewLine_Str()));
						
					__debugInfo = "469:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func8_IndentUp();
					__debugInfo = "470:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((local8_Text_Str_1960) + ("default:"))) + (func11_NewLine_Str()));
					__debugInfo = "471:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func10_IndentDown();
					__debugInfo = "472:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((local8_Text_Str_1960) + ("throwError(\"Gotocounter exception pc: \"+__pc);"))) + (func11_NewLine_Str()));
					__debugInfo = "473:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func10_IndentDown();
					__debugInfo = "474:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((local8_Text_Str_1960) + (func11_NewLine_Str()))) + ("}"));
					__debugInfo = "475:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func10_IndentDown();
					__debugInfo = "476:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((local8_Text_Str_1960) + (func11_NewLine_Str()))) + ("}"));
					__debugInfo = "479:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = (((((((("var __labels = {") + (func16_JSRemoveLast_Str(global12_LabelDef_Str, ", ")))) + ("};"))) + (func11_NewLine_Str()))) + (local8_Text_Str_1960));
					__debugInfo = "480:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((func11_NewLine_Str()) + (local8_Text_Str_1960));
					__debugInfo = "468:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7351: //dummy jumper1
					;
						
					case 7424:
						__debugInfo = "482:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((((global8_IsInGoto) ? 0 : 1)) || (local7_mngGoto_1967)) ? 1 : 0))) { __pc = 7417; break; }
					
					case 7423:
						__debugInfo = "482:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = (("{") + (local8_Text_Str_1960));
						
					__debugInfo = "482:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7417: //dummy jumper1
					;
						
					case 7486:
						__debugInfo = "498:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((global9_DEBUGMODE) && (local13_IsStackPusher_1968)) ? 1 : 0))) { __pc = 7428; break; }
					
					case 7430:
						__debugInfo = "486:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func10_IndentDown();
						
					__debugInfo = "487:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((local8_Text_Str_1960) + (func11_NewLine_Str()))) + ("} catch(ex) {"));
					__debugInfo = "488:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func8_IndentUp();
					__debugInfo = "489:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((local8_Text_Str_1960) + (func11_NewLine_Str()))) + ("if (isKnownException(ex)) throw ex;"));
					__debugInfo = "490:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((local8_Text_Str_1960) + (func11_NewLine_Str()))) + ("alert(formatError(ex));"));
					__debugInfo = "491:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((local8_Text_Str_1960) + (func11_NewLine_Str()))) + ("END();"));
					__debugInfo = "492:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func10_IndentDown();
					__debugInfo = "493:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((local8_Text_Str_1960) + (func11_NewLine_Str()))) + ("} finally {"));
					__debugInfo = "494:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func8_IndentUp();
					__debugInfo = "495:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((local8_Text_Str_1960) + (func11_NewLine_Str()))) + ("stackPop();"));
					__debugInfo = "496:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func10_IndentDown();
					__debugInfo = "497:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((((local8_Text_Str_1960) + (func11_NewLine_Str()))) + ("}"))) + (func11_NewLine_Str()));
					__debugInfo = "486:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7428: //dummy jumper1
					;
						
					case 7512:
						__debugInfo = "507:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((((global8_IsInGoto) ? 0 : 1)) || (local7_mngGoto_1967)) ? 1 : 0))) { __pc = 7493; break; }
					
					case 7495:
						__debugInfo = "501:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func10_IndentDown();
						
					__debugInfo = "502:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((local8_Text_Str_1960) + (func11_NewLine_Str()));
					__debugInfo = "503:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((local8_Text_Str_1960) + ("}"));
					__debugInfo = "501:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29410;
					break;
					
				case 7493: //dummy jumper1
					
					case 7511:
						__debugInfo = "506:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((local8_Text_Str_1960) + (func11_NewLine_Str()));
						
					__debugInfo = "506:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29410: //dummy jumper2
					;
						
					__debugInfo = "509:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global13_VariUndef_Str = local15_BeforeUndef_Str_1973;
					__debugInfo = "510:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global12_CurrentScope = ~~(local4_oScp_1962);
					__debugInfo = "511:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global11_CurrentFunc = ~~(local5_oFunc_1963);
					case 7533:
						__debugInfo = "516:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(local7_mngGoto_1967)) { __pc = 7525; break; }
					
					case 7529:
						__debugInfo = "514:\src\CompilerPasses\Generator\JSGenerator.gbas";
						global12_LabelDef_Str = local13_oLabelDef_Str_1964;
						
					__debugInfo = "515:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global8_IsInGoto = local9_oIsInGoto_1965;
					__debugInfo = "514:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7525: //dummy jumper1
					;
						
					__debugInfo = "306:\src\CompilerPasses\Generator\JSGenerator.gbas";pool_array.free(local8_ERes_Str_1978);
					__pc = 29383;
					break;
					
				case 6590: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(1))) ? 1 : 0))) { __pc = 7535; break; }
					
					var local7_Sym_Str_1988 = "", local10_HasToBeInt_1989 = 0.0, local10_MightBeInt_1990 = 0;
					case 7545:
						__debugInfo = "518:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local7_Sym_Str_1988 = global9_Operators_ref[0].arrAccess(param4_expr.attr2_Op).values[tmpPositionCache][0].attr7_Sym_Str;
						
					__debugInfo = "518:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local10_HasToBeInt_1989 = 0;
					__debugInfo = "519:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local10_MightBeInt_1990 = 0;
					__debugInfo = "520:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
					var local17___SelectHelper11__1991 = "";
					case 7558:
						__debugInfo = "520:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local17___SelectHelper11__1991 = local7_Sym_Str_1988;
						
					case 7623:
						__debugInfo = "542:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((local17___SelectHelper11__1991) === ("=")) ? 1 : 0))) { __pc = 7560; break; }
					
					case 7564:
						__debugInfo = "522:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local7_Sym_Str_1988 = "===";
						
					__debugInfo = "523:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local10_HasToBeInt_1989 = 1;
					__debugInfo = "522:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7560: //dummy jumper1
					if (!((((local17___SelectHelper11__1991) === ("<>")) ? 1 : 0))) { __pc = 7570; break; }
					
					case 7574:
						__debugInfo = "525:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local7_Sym_Str_1988 = "!==";
						
					__debugInfo = "526:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local10_HasToBeInt_1989 = 1;
					__debugInfo = "525:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7570: //dummy jumper1
					if (!((((local17___SelectHelper11__1991) === ("OR")) ? 1 : 0))) { __pc = 7580; break; }
					
					case 7584:
						__debugInfo = "528:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local7_Sym_Str_1988 = "||";
						
					__debugInfo = "529:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local10_HasToBeInt_1989 = 1;
					__debugInfo = "528:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7580: //dummy jumper1
					if (!((((local17___SelectHelper11__1991) === ("AND")) ? 1 : 0))) { __pc = 7590; break; }
					
					case 7594:
						__debugInfo = "531:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local7_Sym_Str_1988 = "&&";
						
					__debugInfo = "532:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local10_HasToBeInt_1989 = 1;
					__debugInfo = "531:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7590: //dummy jumper1
					if (!((((local17___SelectHelper11__1991) === ("<")) ? 1 : 0))) { __pc = 7600; break; }
					
					case 7604:
						__debugInfo = "534:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local10_MightBeInt_1990 = 1;
						
					__debugInfo = "534:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7600: //dummy jumper1
					if (!((((local17___SelectHelper11__1991) === (">")) ? 1 : 0))) { __pc = 7606; break; }
					
					case 7610:
						__debugInfo = "536:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local10_MightBeInt_1990 = 1;
						
					__debugInfo = "536:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7606: //dummy jumper1
					if (!((((local17___SelectHelper11__1991) === (">=")) ? 1 : 0))) { __pc = 7612; break; }
					
					case 7616:
						__debugInfo = "538:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local10_MightBeInt_1990 = 1;
						
					__debugInfo = "538:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7612: //dummy jumper1
					if (!((((local17___SelectHelper11__1991) === ("<=")) ? 1 : 0))) { __pc = 7618; break; }
					
					case 7622:
						__debugInfo = "540:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local10_MightBeInt_1990 = 1;
						
					__debugInfo = "540:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7618: //dummy jumper1
					;
						
					__debugInfo = "520:\src\CompilerPasses\Generator\JSGenerator.gbas";
					;
					case 7800:
						__debugInfo = "568:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((local10_HasToBeInt_1989) || (local10_MightBeInt_1990)) ? 1 : 0))) { __pc = 7628; break; }
					
					case 7742:
						__debugInfo = "560:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(((((((local10_MightBeInt_1990) && ((((global5_Exprs_ref[0].arrAccess(param4_expr.attr4_Left).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("string")) ? 1 : 0))) ? 1 : 0)) && ((((global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("string")) ? 1 : 0))) ? 1 : 0))) { __pc = 7655; break; }
					
					var local7_Res_Str_1992 = "";
					case 7659:
						__debugInfo = "547:\src\CompilerPasses\Generator\JSGenerator.gbas";
						
					var local17___SelectHelper12__1993 = "";
					case 7661:
						__debugInfo = "547:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local17___SelectHelper12__1993 = local7_Sym_Str_1988;
						
					case 7686:
						__debugInfo = "556:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((local17___SelectHelper12__1993) === ("<")) ? 1 : 0))) { __pc = 7663; break; }
					
					case 7667:
						__debugInfo = "549:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local7_Res_Str_1992 = " === -1";
						
					__debugInfo = "549:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7663: //dummy jumper1
					if (!((((local17___SelectHelper12__1993) === (">")) ? 1 : 0))) { __pc = 7669; break; }
					
					case 7673:
						__debugInfo = "551:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local7_Res_Str_1992 = " === 1";
						
					__debugInfo = "551:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7669: //dummy jumper1
					if (!((((local17___SelectHelper12__1993) === ("<=")) ? 1 : 0))) { __pc = 7675; break; }
					
					case 7679:
						__debugInfo = "553:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local7_Res_Str_1992 = " <= 0";
						
					__debugInfo = "553:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7675: //dummy jumper1
					if (!((((local17___SelectHelper12__1993) === (">=")) ? 1 : 0))) { __pc = 7681; break; }
					
					case 7685:
						__debugInfo = "555:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local7_Res_Str_1992 = " >= 0";
						
					__debugInfo = "555:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7681: //dummy jumper1
					;
						
					__debugInfo = "547:\src\CompilerPasses\Generator\JSGenerator.gbas";
					;
						
					__debugInfo = "557:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((((((((((((local8_Text_Str_1960) + ("((strcmp(("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_Left).values[tmpPositionCache][0]))))) + ("), ("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0]))))) + (")) "))) + (local7_Res_Str_1992))) + (" ) ? 1 : 0)"));
					__debugInfo = "547:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29414;
					break;
					
				case 7655: //dummy jumper1
					
					case 7741:
						__debugInfo = "559:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((((((((((((local8_Text_Str_1960) + ("((("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_Left).values[tmpPositionCache][0]))))) + (") "))) + (local7_Sym_Str_1988))) + (" ("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0]))))) + (")) ? 1 : 0)"));
						
					__debugInfo = "559:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29414: //dummy jumper2
					;
						
					__debugInfo = "560:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29413;
					break;
					
				case 7628: //dummy jumper1
					
					var local5_l_Str_1994 = "";
					case 7751:
						__debugInfo = "562:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local5_l_Str_1994 = func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_Left).values[tmpPositionCache][0]));
						
					case 7799:
						__debugInfo = "567:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(((((((local7_Sym_Str_1988) === ("-")) ? 1 : 0)) && ((((local5_l_Str_1994) === ("0")) ? 1 : 0))) ? 1 : 0))) { __pc = 7760; break; }
					
					case 7775:
						__debugInfo = "564:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((((local8_Text_Str_1960) + ("-("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0]))))) + (")"));
						
					__debugInfo = "564:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29416;
					break;
					
				case 7760: //dummy jumper1
					
					case 7798:
						__debugInfo = "566:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((((((((((((local8_Text_Str_1960) + ("(("))) + (local5_l_Str_1994))) + (") "))) + (local7_Sym_Str_1988))) + (" ("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0]))))) + ("))"));
						
					__debugInfo = "566:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29416: //dummy jumper2
					;
						
					__debugInfo = "562:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29413: //dummy jumper2
					;
						
					case 7837:
						__debugInfo = "573:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((((((((local7_Sym_Str_1988) === ("/")) ? 1 : 0)) && ((((global5_Exprs_ref[0].arrAccess(param4_expr.attr4_Left).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("int")) ? 1 : 0))) ? 1 : 0)) && ((((global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("int")) ? 1 : 0))) ? 1 : 0))) { __pc = 7828; break; }
					
					case 7836:
						__debugInfo = "572:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = (((("CAST2INT(") + (local8_Text_Str_1960))) + (")"));
						
					__debugInfo = "572:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7828: //dummy jumper1
					;
						
					__debugInfo = "518:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 7535: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(3))) ? 1 : 0))) { __pc = 7839; break; }
					
					case 7847:
						__debugInfo = "575:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = CAST2STRING(INTEGER(param4_expr.attr6_intval));
						
					__debugInfo = "575:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 7839: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(4))) ? 1 : 0))) { __pc = 7849; break; }
					
					case 7856:
						__debugInfo = "577:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = CAST2STRING(param4_expr.attr8_floatval);
						
					__debugInfo = "577:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 7849: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(5))) ? 1 : 0))) { __pc = 7858; break; }
					
					case 7864:
						__debugInfo = "579:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = param4_expr.attr10_strval_Str;
						
					__debugInfo = "579:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 7858: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(6))) ? 1 : 0))) { __pc = 7866; break; }
					
					case 8073:
						__debugInfo = "609:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_expr.attr4_func).values[tmpPositionCache][0].attr3_Typ) === (3)) ? 1 : 0))) { __pc = 7879; break; }
					
					var local1_P_1995 = 0, alias2_Ex_ref_1996 = [pool_TExpr.alloc()];
					case 7889:
						__debugInfo = "582:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local1_P_1995 = param4_expr.attr6_Params.arrAccess(-(1)).values[tmpPositionCache];
						
					__debugInfo = "583:\src\CompilerPasses\Generator\JSGenerator.gbas";
					alias2_Ex_ref_1996 = global5_Exprs_ref[0].arrAccess(local1_P_1995).values[tmpPositionCache] /* ALIAS */;
					case 8052:
						__debugInfo = "605:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((alias2_Ex_ref_1996[0].attr3_Typ) === (53)) ? 1 : 0))) { __pc = 7900; break; }
					
					var local5_Found_1997 = 0, local5_typId_1998 = 0;
					case 7923:
						__debugInfo = "586:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(((func6_IsType(alias2_Ex_ref_1996[0].attr8_datatype.attr8_Name_Str)) ? 0 : 1))) { __pc = 7909; break; }
					
					case 7922:
						__debugInfo = "586:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func5_Error((((("Internal error (Unable to find '") + (alias2_Ex_ref_1996[0].attr8_datatype.attr8_Name_Str))) + ("')")), 585, "src\CompilerPasses\Generator\JSGenerator.gbas");
						
					__debugInfo = "586:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7909: //dummy jumper1
					;
						
					__debugInfo = "588:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local5_Found_1997 = 0;
					__debugInfo = "589:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local5_typId_1998 = global8_LastType.attr2_ID;
					case 8021:
						__debugInfo = "600:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((local5_typId_1998) !== (-(1))) ? 1 : 0))) {__pc = 29421; break;}
					
					case 8011:
						__debugInfo = "598:\src\CompilerPasses\Generator\JSGenerator.gbas";
						var forEachSaver8011 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_1998).values[tmpPositionCache][0].attr7_Methods;
					var forEachCounter8011 = 0
					
				case 7951: //dummy for1
					if (!(forEachCounter8011 < forEachSaver8011.values.length)) {__pc = 7943; break;}
					var local3_Mth_1999 = forEachSaver8011.values[forEachCounter8011];
					
					
					case 8010:
						__debugInfo = "597:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1999).values[tmpPositionCache][0].attr9_OName_Str) === (global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_expr.attr4_func).values[tmpPositionCache][0].attr9_OName_Str)) ? 1 : 0))) { __pc = 7970; break; }
					
					var local10_Params_Str_2000 = "";
					case 7979:
						__debugInfo = "593:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local10_Params_Str_2000 = func17_JSDoParameter_Str(param4_expr, param4_expr.attr4_func, 0);
						
					case 7991:
						__debugInfo = "594:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((local10_Params_Str_2000) !== ("")) ? 1 : 0))) { __pc = 7984; break; }
					
					case 7990:
						__debugInfo = "594:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local10_Params_Str_2000 = ((local10_Params_Str_2000) + (", "));
						
					__debugInfo = "594:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7984: //dummy jumper1
					;
						
					__debugInfo = "595:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((((((local8_Text_Str_1960) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1999).values[tmpPositionCache][0].attr8_Name_Str))) + ("("))) + (local10_Params_Str_2000))) + ("param4_self)"));
					case 8009:
						__debugInfo = "596:\src\CompilerPasses\Generator\JSGenerator.gbas";
						__pc = __labels["Exit"]; break;
						
					__debugInfo = "593:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7970: //dummy jumper1
					;
						
					__debugInfo = "597:\src\CompilerPasses\Generator\JSGenerator.gbas";
					forEachSaver8011.values[forEachCounter8011] = local3_Mth_1999;
					
					forEachCounter8011++
					__pc = 7951; break; //back jump
					
				case 7943: //dummy for
					;
						
					__debugInfo = "599:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local5_typId_1998 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_1998).values[tmpPositionCache][0].attr9_Extending;
					__debugInfo = "598:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 8021; break; //back jump
					
				case 29421:
					;
						
					case 8022:
						__debugInfo = "601:\src\CompilerPasses\Generator\JSGenerator.gbas";
						//label: Exit;
						
					__debugInfo = "586:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29419;
					break;
					
				case 7900: //dummy jumper1
					
					case 8051:
						__debugInfo = "604:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((((((((local8_Text_Str_1960) + ("("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local1_P_1995).values[tmpPositionCache][0]))))) + (")."))) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_expr.attr4_func).values[tmpPositionCache][0].attr9_OName_Str))) + (func17_JSDoParameter_Str(param4_expr, param4_expr.attr4_func, 1)));
						
					__debugInfo = "604:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29419: //dummy jumper2
					;
						
					__debugInfo = "582:\src\CompilerPasses\Generator\JSGenerator.gbas";pool_TExpr.free(alias2_Ex_ref_1996);
					__pc = 29418;
					break;
					
				case 7879: //dummy jumper1
					
					case 8072:
						__debugInfo = "608:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((local8_Text_Str_1960) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_expr.attr4_func).values[tmpPositionCache][0].attr8_Name_Str))) + (func17_JSDoParameter_Str(param4_expr, param4_expr.attr4_func, 1)));
						
					__debugInfo = "608:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29418: //dummy jumper2
					;
						
					__debugInfo = "609:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 7866: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(23))) ? 1 : 0))) { __pc = 8075; break; }
					
					case 8092:
						__debugInfo = "612:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((local8_Text_Str_1960) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (func17_JSDoParameter_Str(param4_expr, -(1), 1)));
						
					__debugInfo = "612:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 8075: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(9))) ? 1 : 0))) { __pc = 8094; break; }
					
					case 8108:
						__debugInfo = "614:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((local8_Text_Str_1960) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_Name_Str));
						
					case 8125:
						__debugInfo = "615:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr3_ref)) { __pc = 8118; break; }
					
					case 8124:
						__debugInfo = "615:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((local8_Text_Str_1960) + ("[0]"));
						
					__debugInfo = "615:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 8118: //dummy jumper1
					;
						
					__debugInfo = "614:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 8094: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(13))) ? 1 : 0))) { __pc = 8127; break; }
					
					case 8138:
						__debugInfo = "619:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((local8_Text_Str_1960) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_array).values[tmpPositionCache][0]))));
						
					case 8225:
						__debugInfo = "638:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((BOUNDS(param4_expr.attr4_dims, 0)) !== (0)) ? 1 : 0))) { __pc = 8147; break; }
					
					var local1_s_2001 = 0, local7_Add_Str_2002 = "";
					case 8153:
						__debugInfo = "621:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((local8_Text_Str_1960) + (".arrAccess("));
						
					__debugInfo = "622:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local1_s_2001 = 0;
					__debugInfo = "623:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local7_Add_Str_2002 = "";
					case 8217:
						__debugInfo = "635:\src\CompilerPasses\Generator\JSGenerator.gbas";
						var forEachSaver8217 = param4_expr.attr4_dims;
					var forEachCounter8217 = 0
					
				case 8168: //dummy for1
					if (!(forEachCounter8217 < forEachSaver8217.values.length)) {__pc = 8164; break;}
					var local1_d_2003 = forEachSaver8217.values[forEachCounter8217];
					
					
					var local1_v_2004 = 0;
					case 8178:
						__debugInfo = "625:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(local1_s_2001)) { __pc = 8171; break; }
					
					case 8177:
						__debugInfo = "625:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((local8_Text_Str_1960) + (", "));
						
					__debugInfo = "625:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 8171: //dummy jumper1
					;
						
					__debugInfo = "627:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((local8_Text_Str_1960) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local1_d_2003).values[tmpPositionCache][0]))));
					__debugInfo = "629:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local1_s_2001 = 1;
					__debugInfo = "630:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local1_v_2004 = func11_GetVariable(param4_expr.attr5_array, 0);
					case 8216:
						__debugInfo = "634:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(((((((local1_v_2004) !== (-(1))) ? 1 : 0)) && (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_v_2004).values[tmpPositionCache][0].attr3_ref)) ? 1 : 0))) { __pc = 8211; break; }
					
					case 8215:
						__debugInfo = "633:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local7_Add_Str_2002 = "[0]";
						
					__debugInfo = "633:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 8211: //dummy jumper1
					;
						
					__debugInfo = "625:\src\CompilerPasses\Generator\JSGenerator.gbas";
					forEachSaver8217.values[forEachCounter8217] = local1_d_2003;
					
					forEachCounter8217++
					__pc = 8168; break; //back jump
					
				case 8164: //dummy for
					;
						
					__debugInfo = "636:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((local8_Text_Str_1960) + (").values[tmpPositionCache]"))) + (local7_Add_Str_2002));
					__debugInfo = "621:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 8147: //dummy jumper1
					;
						
					__debugInfo = "619:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 8127: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(10))) ? 1 : 0))) { __pc = 8227; break; }
					
					case 8240:
						__debugInfo = "640:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((local8_Text_Str_1960) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0]))))) + (" = "));
						
					__debugInfo = "642:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((local8_Text_Str_1960) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0]))));
					case 8300:
						__debugInfo = "647:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((global5_Exprs_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) || (func6_IsType(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) ? 1 : 0))) { __pc = 8271; break; }
					
					case 8299:
						__debugInfo = "646:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(((((((global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0].attr3_Typ) !== (35)) ? 1 : 0)) && ((((global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0].attr3_Typ) !== (36)) ? 1 : 0))) ? 1 : 0))) { __pc = 8292; break; }
					
					case 8298:
						__debugInfo = "645:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((local8_Text_Str_1960) + (".clone(/* In Assign */)"));
						
					__debugInfo = "645:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 8292: //dummy jumper1
					;
						
					__debugInfo = "646:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 8271: //dummy jumper1
					;
						
					__debugInfo = "640:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 8227: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(11))) ? 1 : 0))) { __pc = 8302; break; }
					
					var local1_v_2005 = 0, local6_hasRef_2006 = 0, local4_Find_2007 = 0;
					case 8310:
						__debugInfo = "651:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local1_v_2005 = func11_GetVariable(param4_expr.attr5_array, 0);
						
					__debugInfo = "652:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local6_hasRef_2006 = 0;
					case 8335:
						__debugInfo = "653:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(((((((local1_v_2005) === (-(1))) ? 1 : 0)) || (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_v_2005).values[tmpPositionCache][0].attr3_ref)) ? 1 : 0))) { __pc = 8330; break; }
					
					case 8334:
						__debugInfo = "653:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local6_hasRef_2006 = 1;
						
					__debugInfo = "653:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 8330: //dummy jumper1
					;
						
					__debugInfo = "655:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((((local8_Text_Str_1960) + ("DIM("))) + (func14_JSTryUnref_Str(param4_expr.attr5_array)))) + (", ["));
					__debugInfo = "656:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local4_Find_2007 = 0;
					case 8382:
						__debugInfo = "662:\src\CompilerPasses\Generator\JSGenerator.gbas";
						var forEachSaver8382 = param4_expr.attr4_dims;
					var forEachCounter8382 = 0
					
				case 8358: //dummy for1
					if (!(forEachCounter8382 < forEachSaver8382.values.length)) {__pc = 8354; break;}
					var local1_D_2008 = forEachSaver8382.values[forEachCounter8382];
					
					
					case 8370:
						__debugInfo = "658:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((local4_Find_2007) === (1)) ? 1 : 0))) { __pc = 8363; break; }
					
					case 8369:
						__debugInfo = "658:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((local8_Text_Str_1960) + (", "));
						
					__debugInfo = "658:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 8363: //dummy jumper1
					;
						
					__debugInfo = "659:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((local8_Text_Str_1960) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local1_D_2008).values[tmpPositionCache][0]))));
					__debugInfo = "661:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local4_Find_2007 = 1;
					__debugInfo = "658:\src\CompilerPasses\Generator\JSGenerator.gbas";
					forEachSaver8382.values[forEachCounter8382] = local1_D_2008;
					
					forEachCounter8382++
					__pc = 8358; break; //back jump
					
				case 8354: //dummy for
					;
						
					__debugInfo = "663:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((((local8_Text_Str_1960) + ("], "))) + (func21_JSGetDefaultValue_Str(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_array).values[tmpPositionCache][0].attr8_datatype, local6_hasRef_2006, 1)))) + (")"));
					__debugInfo = "651:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 8302: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(12))) ? 1 : 0))) { __pc = 8402; break; }
					
					var local1_v_2009 = 0, local6_hasRef_2010 = 0, local4_Find_2011 = 0;
					case 8410:
						__debugInfo = "666:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local1_v_2009 = func11_GetVariable(param4_expr.attr5_array, 0);
						
					__debugInfo = "667:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local6_hasRef_2010 = 0;
					case 8435:
						__debugInfo = "668:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(((((((local1_v_2009) === (-(1))) ? 1 : 0)) || (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_v_2009).values[tmpPositionCache][0].attr3_ref)) ? 1 : 0))) { __pc = 8430; break; }
					
					case 8434:
						__debugInfo = "668:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local6_hasRef_2010 = 1;
						
					__debugInfo = "668:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 8430: //dummy jumper1
					;
						
					__debugInfo = "670:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((((local8_Text_Str_1960) + ("REDIM("))) + (func14_JSTryUnref_Str(param4_expr.attr5_array)))) + (", ["));
					__debugInfo = "671:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local4_Find_2011 = 0;
					case 8482:
						__debugInfo = "677:\src\CompilerPasses\Generator\JSGenerator.gbas";
						var forEachSaver8482 = param4_expr.attr4_dims;
					var forEachCounter8482 = 0
					
				case 8458: //dummy for1
					if (!(forEachCounter8482 < forEachSaver8482.values.length)) {__pc = 8454; break;}
					var local1_D_2012 = forEachSaver8482.values[forEachCounter8482];
					
					
					case 8470:
						__debugInfo = "673:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((local4_Find_2011) === (1)) ? 1 : 0))) { __pc = 8463; break; }
					
					case 8469:
						__debugInfo = "673:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((local8_Text_Str_1960) + (", "));
						
					__debugInfo = "673:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 8463: //dummy jumper1
					;
						
					__debugInfo = "674:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((local8_Text_Str_1960) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local1_D_2012).values[tmpPositionCache][0]))));
					__debugInfo = "676:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local4_Find_2011 = 1;
					__debugInfo = "673:\src\CompilerPasses\Generator\JSGenerator.gbas";
					forEachSaver8482.values[forEachCounter8482] = local1_D_2012;
					
					forEachCounter8482++
					__pc = 8458; break; //back jump
					
				case 8454: //dummy for
					;
						
					__debugInfo = "678:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((((local8_Text_Str_1960) + ("], "))) + (func21_JSGetDefaultValue_Str(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_array).values[tmpPositionCache][0].attr8_datatype, local6_hasRef_2010, 1)))) + (" )"));
					__debugInfo = "666:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 8402: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(15))) ? 1 : 0))) { __pc = 8502; break; }
					
					var local4_cast_2013 = 0;
					case 8506:
						__debugInfo = "681:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local4_cast_2013 = 1;
						
					case 8588:
						__debugInfo = "696:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr3_Typ) === (4)) ? 1 : 0))) { __pc = 8517; break; }
					
					var local5_f_Str_2014 = "";
					case 8522:
						__debugInfo = "683:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local4_cast_2013 = 0;
						
					__debugInfo = "685:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local5_f_Str_2014 = ((CAST2STRING(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr8_floatval)) + (""));
					__debugInfo = "685:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
					var local1_i_2015 = 0.0;
					case 8562:
						__debugInfo = "692:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local1_i_2015 = 0
					
				case 8540: //dummy for1
					if (!toCheck(local1_i_2015, (((local5_f_Str_2014).length) - (1)), 1)) {__pc = 8547; break;}
					
					case 8561:
						__debugInfo = "691:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((ASC(local5_f_Str_2014, ~~(local1_i_2015))) === (ASC(".", 0))) ? 1 : 0))) { __pc = 8555; break; }
					
					case 8559:
						__debugInfo = "689:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local4_cast_2013 = 1;
						
					case 8560:
						__debugInfo = "690:\src\CompilerPasses\Generator\JSGenerator.gbas";
						__pc = 8547; break;
						
					__debugInfo = "689:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 8555: //dummy jumper1
					;
						
					__debugInfo = "691:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local1_i_2015 += 1;
					__pc = 8540; break; //back jump
					
				case 8547: //dummy for
					;
						
					__debugInfo = "692:\src\CompilerPasses\Generator\JSGenerator.gbas";
					;
					__debugInfo = "683:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 8517: //dummy jumper1
					if (!(((((((global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("float")) ? 1 : 0)) && ((((global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0))) ? 1 : 0))) { __pc = 8586; break; }
					
					
					
				case 8586: //dummy jumper1
					;
						
					case 8678:
						__debugInfo = "712:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(local4_cast_2013)) { __pc = 8590; break; }
					
					case 8601:
						__debugInfo = "699:\src\CompilerPasses\Generator\JSGenerator.gbas";
						
					var local17___SelectHelper13__2016 = "";
					case 8603:
						__debugInfo = "699:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local17___SelectHelper13__2016 = global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str;
						
					case 8666:
						__debugInfo = "709:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((local17___SelectHelper13__2016) === ("int")) ? 1 : 0))) { __pc = 8605; break; }
					
					case 8616:
						__debugInfo = "702:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((local8_Text_Str_1960) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))));
						
					__debugInfo = "702:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29437;
					break;
					
				case 8605: //dummy jumper1
					if (!((((local17___SelectHelper13__2016) === ("float")) ? 1 : 0))) { __pc = 8618; break; }
					
					case 8633:
						__debugInfo = "704:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((((local8_Text_Str_1960) + ("~~("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")"));
						
					__debugInfo = "704:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29437;
					break;
					
				case 8618: //dummy jumper1
					if (!((((local17___SelectHelper13__2016) === ("string")) ? 1 : 0))) { __pc = 8635; break; }
					
					case 8650:
						__debugInfo = "706:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((((local8_Text_Str_1960) + ("INT2STR("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")"));
						
					__debugInfo = "706:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29437;
					break;
					
				case 8635: //dummy jumper1
					
					case 8665:
						__debugInfo = "708:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((((local8_Text_Str_1960) + ("CAST2INT("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")"));
						
					__debugInfo = "708:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29437: //dummy jumper2
					;
						
					__debugInfo = "699:\src\CompilerPasses\Generator\JSGenerator.gbas";
					;
						
					__debugInfo = "699:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29436;
					break;
					
				case 8590: //dummy jumper1
					
					case 8677:
						__debugInfo = "711:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((local8_Text_Str_1960) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))));
						
					__debugInfo = "711:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29436: //dummy jumper2
					;
						
					__debugInfo = "681:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 8502: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(16))) ? 1 : 0))) { __pc = 8680; break; }
					
					case 8775:
						__debugInfo = "730:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr3_Typ) === (3)) ? 1 : 0))) { __pc = 8691; break; }
					
					case 8702:
						__debugInfo = "716:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((local8_Text_Str_1960) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))));
						
					__debugInfo = "716:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29438;
					break;
					
				case 8691: //dummy jumper1
					
					case 8713:
						__debugInfo = "718:\src\CompilerPasses\Generator\JSGenerator.gbas";
						
					var local17___SelectHelper14__2017 = "";
					case 8715:
						__debugInfo = "718:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local17___SelectHelper14__2017 = global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str;
						
					case 8774:
						__debugInfo = "729:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((local17___SelectHelper14__2017) === ("int")) ? 1 : 0))) { __pc = 8717; break; }
					
					case 8728:
						__debugInfo = "721:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((local8_Text_Str_1960) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))));
						
					__debugInfo = "721:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29439;
					break;
					
				case 8717: //dummy jumper1
					if (!((((local17___SelectHelper14__2017) === ("float")) ? 1 : 0))) { __pc = 8730; break; }
					
					case 8741:
						__debugInfo = "724:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((local8_Text_Str_1960) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))));
						
					__debugInfo = "724:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29439;
					break;
					
				case 8730: //dummy jumper1
					if (!((((local17___SelectHelper14__2017) === ("string")) ? 1 : 0))) { __pc = 8743; break; }
					
					case 8758:
						__debugInfo = "726:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((((local8_Text_Str_1960) + ("FLOAT2STR("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")"));
						
					__debugInfo = "726:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29439;
					break;
					
				case 8743: //dummy jumper1
					
					case 8773:
						__debugInfo = "728:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((((local8_Text_Str_1960) + ("CAST2FLOAT("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")"));
						
					__debugInfo = "728:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29439: //dummy jumper2
					;
						
					__debugInfo = "718:\src\CompilerPasses\Generator\JSGenerator.gbas";
					;
						
					__debugInfo = "718:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29438: //dummy jumper2
					;
						
					__debugInfo = "730:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 8680: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(17))) ? 1 : 0))) { __pc = 8777; break; }
					
					case 8792:
						__debugInfo = "732:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((((local8_Text_Str_1960) + ("CAST2STRING("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")"));
						
					__debugInfo = "732:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 8777: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(18))) ? 1 : 0))) { __pc = 8794; break; }
					
					case 8814:
						__debugInfo = "734:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((((local8_Text_Str_1960) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + ("."))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_nextExpr).values[tmpPositionCache][0]))));
						
					__debugInfo = "734:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 8794: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(19))) ? 1 : 0))) { __pc = 8816; break; }
					
					var local1_F_2018 = 0;
					case 8821:
						__debugInfo = "736:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local1_F_2018 = 0;
						
					__debugInfo = "737:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
					var local17___SelectHelper15__2019 = 0;
					case 8832:
						__debugInfo = "737:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local17___SelectHelper15__2019 = global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr3_Typ;
						
					case 8851:
						__debugInfo = "744:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((local17___SelectHelper15__2019) === (~~(3))) ? 1 : 0))) { __pc = 8834; break; }
					
					case 8838:
						__debugInfo = "739:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local1_F_2018 = 1;
						
					__debugInfo = "739:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 8834: //dummy jumper1
					if (!((((local17___SelectHelper15__2019) === (~~(4))) ? 1 : 0))) { __pc = 8840; break; }
					
					case 8844:
						__debugInfo = "741:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local1_F_2018 = 1;
						
					__debugInfo = "741:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 8840: //dummy jumper1
					if (!((((local17___SelectHelper15__2019) === (~~(5))) ? 1 : 0))) { __pc = 8846; break; }
					
					case 8850:
						__debugInfo = "743:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local1_F_2018 = 1;
						
					__debugInfo = "743:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 8846: //dummy jumper1
					;
						
					__debugInfo = "737:\src\CompilerPasses\Generator\JSGenerator.gbas";
					;
					__debugInfo = "746:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((local8_Text_Str_1960) + (global13_VariUndef_Str));
					case 8883:
						__debugInfo = "752:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(local1_F_2018)) { __pc = 8858; break; }
					
					case 8869:
						__debugInfo = "749:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((local8_Text_Str_1960) + ("return "))) + (func14_JSTryUnref_Str(param4_expr.attr4_expr)));
						
					__debugInfo = "749:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29441;
					break;
					
				case 8858: //dummy jumper1
					
					case 8882:
						__debugInfo = "751:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((((local8_Text_Str_1960) + ("return tryClone("))) + (func14_JSTryUnref_Str(param4_expr.attr4_expr)))) + (")"));
						
					__debugInfo = "751:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29441: //dummy jumper2
					;
						
					__debugInfo = "736:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 8816: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(22))) ? 1 : 0))) { __pc = 8885; break; }
					
					var local8_Name_Str_2020 = "", local5_Found_2021 = 0;
					case 8896:
						__debugInfo = "760:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Name_Str_2020 = REPLACE_Str(param4_expr.attr8_datatype.attr8_Name_Str, "$", "_Str");
						
					case 8925:
						__debugInfo = "768:\src\CompilerPasses\Generator\JSGenerator.gbas";
						var forEachSaver8925 = global8_Compiler.attr5_Funcs_ref[0];
					var forEachCounter8925 = 0
					
				case 8904: //dummy for1
					if (!(forEachCounter8925 < forEachSaver8925.values.length)) {__pc = 8900; break;}
					var local4_Func_ref_2022 = forEachSaver8925.values[forEachCounter8925];
					
					
					case 8924:
						__debugInfo = "767:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((local4_Func_ref_2022[0].attr9_OName_Str) === (local8_Name_Str_2020)) ? 1 : 0))) { __pc = 8911; break; }
					
					case 8919:
						__debugInfo = "764:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((local8_Text_Str_1960) + (local4_Func_ref_2022[0].attr8_Name_Str));
						
					__debugInfo = "765:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local5_Found_2021 = 1;
					case 8923:
						__debugInfo = "766:\src\CompilerPasses\Generator\JSGenerator.gbas";
						__pc = 8900; break;
						
					__debugInfo = "764:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 8911: //dummy jumper1
					;
						
					__debugInfo = "767:\src\CompilerPasses\Generator\JSGenerator.gbas";
					forEachSaver8925.values[forEachCounter8925] = local4_Func_ref_2022;
					
					forEachCounter8925++
					__pc = 8904; break; //back jump
					
				case 8900: //dummy for
					;
						
					case 8935:
						__debugInfo = "769:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(((local5_Found_2021) ? 0 : 1))) { __pc = 8928; break; }
					
					case 8934:
						__debugInfo = "769:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((local8_Text_Str_1960) + (local8_Name_Str_2020));
						
					__debugInfo = "769:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 8928: //dummy jumper1
					;
						
					__debugInfo = "760:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 8885: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(24))) ? 1 : 0))) { __pc = 8937; break; }
					
					case 9200:
						__debugInfo = "863:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(global8_IsInGoto)) { __pc = 8940; break; }
					
					var local5_dummy_2023 = 0;
					case 8944:
						__debugInfo = "772:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local5_dummy_2023 = global11_LastDummyID;
						
					__debugInfo = "773:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global11_LastDummyID+=1;
					__debugInfo = "774:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
					var local1_i_2024 = 0.0;
					case 9061:
						__debugInfo = "790:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local1_i_2024 = 0
					
				case 8953: //dummy for1
					if (!toCheck(local1_i_2024, ((BOUNDS(param4_expr.attr10_Conditions, 0)) - (1)), 1)) {__pc = 8964; break;}
					
					case 8994:
						__debugInfo = "776:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((((((((((local8_Text_Str_1960) + ("if (!("))) + (func23_ConditionJSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr10_Conditions.arrAccess(~~(local1_i_2024)).values[tmpPositionCache]).values[tmpPositionCache][0]))))) + (")) { __pc = "))) + (CAST2STRING(param4_expr.attr10_Conditions.arrAccess(~~(local1_i_2024)).values[tmpPositionCache])))) + ("; break; }"))) + (func11_NewLine_Str()));
						
					__debugInfo = "779:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((local8_Text_Str_1960) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr6_Scopes.arrAccess(~~(local1_i_2024)).values[tmpPositionCache]).values[tmpPositionCache][0]))));
					case 9036:
						__debugInfo = "785:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((param4_expr.attr9_elseScope) !== (-(1))) ? 1 : 0))) { __pc = 9015; break; }
					
					case 9028:
						__debugInfo = "783:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((((((local8_Text_Str_1960) + ("__pc = "))) + (CAST2STRING(local5_dummy_2023)))) + (";"))) + (func11_NewLine_Str()));
						
					__debugInfo = "784:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((local8_Text_Str_1960) + ("break;"))) + (func11_NewLine_Str()));
					__debugInfo = "783:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 9015: //dummy jumper1
					;
						
					__debugInfo = "786:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func10_IndentDown();
					__debugInfo = "787:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((local8_Text_Str_1960) + (func11_NewLine_Str()));
					__debugInfo = "788:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func8_IndentUp();
					__debugInfo = "789:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((((((local8_Text_Str_1960) + ("case "))) + (CAST2STRING(param4_expr.attr10_Conditions.arrAccess(~~(local1_i_2024)).values[tmpPositionCache])))) + (": //dummy jumper1"))) + (func11_NewLine_Str()));
					__debugInfo = "776:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local1_i_2024 += 1;
					__pc = 8953; break; //back jump
					
				case 8964: //dummy for
					;
						
					__debugInfo = "790:\src\CompilerPasses\Generator\JSGenerator.gbas";
					;
					case 9100:
						__debugInfo = "799:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((param4_expr.attr9_elseScope) !== (-(1))) ? 1 : 0))) { __pc = 9069; break; }
					
					case 9080:
						__debugInfo = "793:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((local8_Text_Str_1960) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr9_elseScope).values[tmpPositionCache][0]))));
						
					__debugInfo = "795:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func10_IndentDown();
					__debugInfo = "796:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((local8_Text_Str_1960) + (func11_NewLine_Str()));
					__debugInfo = "797:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func8_IndentUp();
					__debugInfo = "798:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((((((local8_Text_Str_1960) + ("case "))) + (CAST2STRING(local5_dummy_2023)))) + (": //dummy jumper2"))) + (func11_NewLine_Str()));
					__debugInfo = "793:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 9069: //dummy jumper1
					;
						
					__debugInfo = "772:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29444;
					break;
					
				case 8940: //dummy jumper1
					
					var local8_IsSwitch_2025 = 0;
					case 9105:
						__debugInfo = "803:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_IsSwitch_2025 = 0;
						
					case 9199:
						__debugInfo = "862:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(local8_IsSwitch_2025)) { __pc = 9108; break; }
					
					
					__pc = 29447;
					break;
					
				case 9108: //dummy jumper1
					
					case 9111:
						__debugInfo = "849:\src\CompilerPasses\Generator\JSGenerator.gbas";
						
					var local1_i_2026 = 0.0;
					case 9176:
						__debugInfo = "858:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local1_i_2026 = 0
					
				case 9115: //dummy for1
					if (!toCheck(local1_i_2026, ((BOUNDS(param4_expr.attr10_Conditions, 0)) - (1)), 1)) {__pc = 9126; break;}
					
					case 9145:
						__debugInfo = "855:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((local1_i_2026) === (0)) ? 1 : 0))) { __pc = 9132; break; }
					
					case 9138:
						__debugInfo = "852:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((local8_Text_Str_1960) + ("if"));
						
					__debugInfo = "852:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29448;
					break;
					
				case 9132: //dummy jumper1
					
					case 9144:
						__debugInfo = "854:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((local8_Text_Str_1960) + (" else if"));
						
					__debugInfo = "854:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29448: //dummy jumper2
					;
						
					__debugInfo = "856:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((((local8_Text_Str_1960) + (" ("))) + (func23_ConditionJSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr10_Conditions.arrAccess(~~(local1_i_2026)).values[tmpPositionCache]).values[tmpPositionCache][0]))))) + (") "));
					__debugInfo = "857:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((local8_Text_Str_1960) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr6_Scopes.arrAccess(~~(local1_i_2026)).values[tmpPositionCache]).values[tmpPositionCache][0]))));
					__debugInfo = "855:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local1_i_2026 += 1;
					__pc = 9115; break; //back jump
					
				case 9126: //dummy for
					;
						
					__debugInfo = "858:\src\CompilerPasses\Generator\JSGenerator.gbas";
					;
						
					case 9198:
						__debugInfo = "861:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((param4_expr.attr9_elseScope) !== (-(1))) ? 1 : 0))) { __pc = 9184; break; }
					
					case 9197:
						__debugInfo = "860:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((local8_Text_Str_1960) + (" else "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr9_elseScope).values[tmpPositionCache][0]))));
						
					__debugInfo = "860:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 9184: //dummy jumper1
					;
						
					__debugInfo = "849:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29447: //dummy jumper2
					;
						
					__debugInfo = "803:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29444: //dummy jumper2
					;
						
					__debugInfo = "863:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 8937: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(25))) ? 1 : 0))) { __pc = 9202; break; }
					
					case 9321:
						__debugInfo = "885:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(global8_IsInGoto)) { __pc = 9205; break; }
					
					var local6_TmpBID_2027 = 0, local6_TmpCID_2028 = 0;
					case 9209:
						__debugInfo = "866:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local6_TmpBID_2027 = global11_LoopBreakID;
						
					__debugInfo = "867:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local6_TmpCID_2028 = global14_LoopContinueID;
					__debugInfo = "868:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global11_LoopBreakID = global11_LastDummyID;
					__debugInfo = "869:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global14_LoopContinueID = param4_expr.attr2_ID;
					__debugInfo = "870:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global11_LastDummyID+=1;
					__debugInfo = "872:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((((((((((local8_Text_Str_1960) + ("if (!("))) + (func23_ConditionJSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")) {__pc = "))) + (CAST2STRING(global11_LoopBreakID)))) + ("; break;}"))) + (func11_NewLine_Str()));
					__debugInfo = "873:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((local8_Text_Str_1960) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
					__debugInfo = "874:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((((((local8_Text_Str_1960) + ("__pc = "))) + (CAST2STRING(param4_expr.attr2_ID)))) + ("; break; //back jump"))) + (func11_NewLine_Str()));
					__debugInfo = "875:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func10_IndentDown();
					__debugInfo = "876:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((local8_Text_Str_1960) + (func11_NewLine_Str()));
					__debugInfo = "877:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func8_IndentUp();
					__debugInfo = "878:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((((((local8_Text_Str_1960) + ("case "))) + (CAST2STRING(global11_LoopBreakID)))) + (":"))) + (func11_NewLine_Str()));
					__debugInfo = "880:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global11_LoopBreakID = local6_TmpBID_2027;
					__debugInfo = "881:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global14_LoopContinueID = local6_TmpCID_2028;
					__debugInfo = "866:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29450;
					break;
					
				case 9205: //dummy jumper1
					
					case 9310:
						__debugInfo = "883:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((((local8_Text_Str_1960) + ("while ("))) + (func23_ConditionJSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (") "));
						
					__debugInfo = "884:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((local8_Text_Str_1960) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
					__debugInfo = "883:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29450: //dummy jumper2
					;
						
					__debugInfo = "885:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 9202: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(26))) ? 1 : 0))) { __pc = 9323; break; }
					
					case 9447:
						__debugInfo = "909:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(global8_IsInGoto)) { __pc = 9326; break; }
					
					var local6_TmpBID_2029 = 0, local6_TmpCID_2030 = 0;
					case 9330:
						__debugInfo = "888:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local6_TmpBID_2029 = global11_LoopBreakID;
						
					__debugInfo = "889:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local6_TmpCID_2030 = global14_LoopContinueID;
					__debugInfo = "891:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global11_LoopBreakID = global11_LastDummyID;
					__debugInfo = "892:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global14_LoopContinueID = param4_expr.attr2_ID;
					__debugInfo = "893:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global11_LastDummyID+=1;
					__debugInfo = "895:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((local8_Text_Str_1960) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
					__debugInfo = "896:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((((((((((local8_Text_Str_1960) + ("if ("))) + (func23_ConditionJSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (") {__pc = "))) + (CAST2STRING(global11_LoopBreakID)))) + ("; break;}"))) + (func11_NewLine_Str()));
					__debugInfo = "897:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((((((local8_Text_Str_1960) + ("__pc = "))) + (CAST2STRING(param4_expr.attr2_ID)))) + ("; break; //back jump"))) + (func11_NewLine_Str()));
					__debugInfo = "898:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func10_IndentDown();
					__debugInfo = "899:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((local8_Text_Str_1960) + (func11_NewLine_Str()));
					__debugInfo = "900:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func8_IndentUp();
					__debugInfo = "901:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((((((local8_Text_Str_1960) + ("case "))) + (CAST2STRING(global11_LoopBreakID)))) + (": //dummy repeat"))) + (func11_NewLine_Str()));
					__debugInfo = "903:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global11_LoopBreakID = local6_TmpBID_2029;
					__debugInfo = "904:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global14_LoopContinueID = local6_TmpCID_2030;
					__debugInfo = "888:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29451;
					break;
					
				case 9326: //dummy jumper1
					
					case 9422:
						__debugInfo = "906:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((local8_Text_Str_1960) + ("do "));
						
					__debugInfo = "907:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((local8_Text_Str_1960) + (func23_ConditionJSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
					__debugInfo = "908:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((((local8_Text_Str_1960) + (" while (!("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + ("))"));
					__debugInfo = "906:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29451: //dummy jumper2
					;
						
					__debugInfo = "909:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 9323: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(27))) ? 1 : 0))) { __pc = 9449; break; }
					
					var local13_CheckComm_Str_2031 = "";
					case 9464:
						__debugInfo = "916:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(param4_expr.attr5_hasTo)) { __pc = 9455; break; }
					
					case 9459:
						__debugInfo = "913:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local13_CheckComm_Str_2031 = "toCheck";
						
					__debugInfo = "913:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29452;
					break;
					
				case 9455: //dummy jumper1
					
					case 9463:
						__debugInfo = "915:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local13_CheckComm_Str_2031 = "untilCheck";
						
					__debugInfo = "915:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29452: //dummy jumper2
					;
						
					case 9728:
						__debugInfo = "945:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(global8_IsInGoto)) { __pc = 9466; break; }
					
					var local6_TmpBID_2032 = 0, local6_TmpCID_2033 = 0;
					case 9470:
						__debugInfo = "918:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local6_TmpBID_2032 = global11_LoopBreakID;
						
					__debugInfo = "919:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local6_TmpCID_2033 = global14_LoopContinueID;
					__debugInfo = "921:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global11_LoopBreakID = param4_expr.attr8_stepExpr;
					__debugInfo = "922:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global14_LoopContinueID = param4_expr.attr7_varExpr;
					__debugInfo = "924:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((local8_Text_Str_1960) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr7_varExpr).values[tmpPositionCache][0]))))) + (func11_NewLine_Str()));
					__debugInfo = "925:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func10_IndentDown();
					__debugInfo = "926:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((local8_Text_Str_1960) + (func11_NewLine_Str()));
					__debugInfo = "927:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func8_IndentUp();
					__debugInfo = "928:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((((((local8_Text_Str_1960) + ("case "))) + (CAST2STRING(param4_expr.attr7_varExpr)))) + (": //dummy for1"))) + (func11_NewLine_Str()));
					__debugInfo = "931:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((((((((((((((((((((((local8_Text_Str_1960) + ("if (!"))) + (local13_CheckComm_Str_2031))) + ("("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(param4_expr.attr7_varExpr).values[tmpPositionCache][0].attr4_vari).values[tmpPositionCache][0]))))) + (", "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr6_toExpr).values[tmpPositionCache][0]))))) + (", "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_stepExpr).values[tmpPositionCache][0]))))) + (")) {__pc = "))) + (CAST2STRING(param4_expr.attr8_stepExpr)))) + ("; break;}"))) + (func11_NewLine_Str()));
					__debugInfo = "932:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((local8_Text_Str_1960) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
					__debugInfo = "933:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((((((((local8_Text_Str_1960) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(param4_expr.attr7_varExpr).values[tmpPositionCache][0].attr4_vari).values[tmpPositionCache][0]))))) + (" += "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_stepExpr).values[tmpPositionCache][0]))))) + (";"))) + (func11_NewLine_Str()));
					__debugInfo = "934:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((((((local8_Text_Str_1960) + ("__pc = "))) + (CAST2STRING(param4_expr.attr7_varExpr)))) + ("; break; //back jump"))) + (func11_NewLine_Str()));
					__debugInfo = "935:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func10_IndentDown();
					__debugInfo = "936:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((local8_Text_Str_1960) + (func11_NewLine_Str()));
					__debugInfo = "937:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func8_IndentUp();
					__debugInfo = "938:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((((((local8_Text_Str_1960) + ("case "))) + (CAST2STRING(param4_expr.attr8_stepExpr)))) + (": //dummy for"))) + (func11_NewLine_Str()));
					__debugInfo = "940:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global11_LoopBreakID = local6_TmpBID_2032;
					__debugInfo = "941:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global14_LoopContinueID = local6_TmpCID_2033;
					__debugInfo = "918:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29453;
					break;
					
				case 9466: //dummy jumper1
					
					case 9717:
						__debugInfo = "943:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((((((((((((((((((((((((((((local8_Text_Str_1960) + ("for ("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr7_varExpr).values[tmpPositionCache][0]))))) + (";"))) + (local13_CheckComm_Str_2031))) + ("("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(param4_expr.attr7_varExpr).values[tmpPositionCache][0].attr4_vari).values[tmpPositionCache][0]))))) + (", "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr6_toExpr).values[tmpPositionCache][0]))))) + (", "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_stepExpr).values[tmpPositionCache][0]))))) + (");"))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(param4_expr.attr7_varExpr).values[tmpPositionCache][0].attr4_vari).values[tmpPositionCache][0]))))) + (" += "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_stepExpr).values[tmpPositionCache][0]))))) + (") "));
						
					__debugInfo = "944:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((local8_Text_Str_1960) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
					__debugInfo = "943:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29453: //dummy jumper2
					;
						
					__debugInfo = "916:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 9449: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(38))) ? 1 : 0))) { __pc = 9730; break; }
					
					var local1_c_2034 = 0, local11_varName_Str_2035 = "", local13_StartText_Str_2036 = "", local12_CondText_Str_2037 = "", local11_IncText_Str_2038 = "", local13_EachBegin_Str_2039 = "", local11_EachEnd_Str_2040 = "";
					case 9736:
						__debugInfo = "947:\src\CompilerPasses\Generator\JSGenerator.gbas";
						global14_ForEachCounter = param4_expr.attr2_ID;
						
					__debugInfo = "948:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local1_c_2034 = global14_ForEachCounter;
					__debugInfo = "949:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((((((((((local8_Text_Str_1960) + ("var forEachSaver"))) + (CAST2STRING(local1_c_2034)))) + (" = "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr6_inExpr).values[tmpPositionCache][0]))))) + (";"))) + (func11_NewLine_Str()));
					__debugInfo = "950:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local11_varName_Str_2035 = func16_JSRemoveLast_Str(func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr7_varExpr).values[tmpPositionCache][0])), "[0]");
					__debugInfo = "951:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local13_StartText_Str_2036 = (((("var forEachCounter") + (CAST2STRING(local1_c_2034)))) + (" = 0"));
					__debugInfo = "952:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local12_CondText_Str_2037 = (((((((("forEachCounter") + (CAST2STRING(local1_c_2034)))) + (" < forEachSaver"))) + (CAST2STRING(local1_c_2034)))) + (".values.length"));
					__debugInfo = "953:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local11_IncText_Str_2038 = (((("forEachCounter") + (CAST2STRING(local1_c_2034)))) + ("++"));
					__debugInfo = "954:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local13_EachBegin_Str_2039 = (((((((((((((("var ") + (local11_varName_Str_2035))) + (" = forEachSaver"))) + (CAST2STRING(local1_c_2034)))) + (".values[forEachCounter"))) + (CAST2STRING(local1_c_2034)))) + ("];"))) + (func11_NewLine_Str()));
					__debugInfo = "955:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local11_EachEnd_Str_2040 = (((((((((((((("forEachSaver") + (CAST2STRING(local1_c_2034)))) + (".values[forEachCounter"))) + (CAST2STRING(local1_c_2034)))) + ("] = "))) + (local11_varName_Str_2035))) + (";"))) + (func11_NewLine_Str()));
					case 10034:
						__debugInfo = "991:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(global8_IsInGoto)) { __pc = 9845; break; }
					
					var local6_TmpBID_2041 = 0, local6_TmpCID_2042 = 0;
					case 9849:
						__debugInfo = "957:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local6_TmpBID_2041 = global11_LoopBreakID;
						
					__debugInfo = "958:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local6_TmpCID_2042 = global14_LoopContinueID;
					__debugInfo = "960:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global11_LoopBreakID = param4_expr.attr7_varExpr;
					__debugInfo = "961:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global14_LoopContinueID = param4_expr.attr6_inExpr;
					__debugInfo = "963:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((local8_Text_Str_1960) + (local13_StartText_Str_2036))) + (func11_NewLine_Str()));
					__debugInfo = "964:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func10_IndentDown();
					__debugInfo = "965:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((local8_Text_Str_1960) + (func11_NewLine_Str()));
					__debugInfo = "966:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func8_IndentUp();
					__debugInfo = "967:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((((((local8_Text_Str_1960) + ("case "))) + (CAST2STRING(param4_expr.attr6_inExpr)))) + (": //dummy for1"))) + (func11_NewLine_Str()));
					__debugInfo = "970:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((((((((((local8_Text_Str_1960) + ("if (!("))) + (local12_CondText_Str_2037))) + (")) {__pc = "))) + (CAST2STRING(param4_expr.attr7_varExpr)))) + ("; break;}"))) + (func11_NewLine_Str()));
					__debugInfo = "971:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((local8_Text_Str_1960) + (local13_EachBegin_Str_2039))) + (func11_NewLine_Str()));
					__debugInfo = "972:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((local8_Text_Str_1960) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
					__debugInfo = "973:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((local8_Text_Str_1960) + (local11_EachEnd_Str_2040))) + (func11_NewLine_Str()));
					__debugInfo = "974:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((local8_Text_Str_1960) + (local11_IncText_Str_2038))) + (func11_NewLine_Str()));
					__debugInfo = "975:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((((((local8_Text_Str_1960) + ("__pc = "))) + (CAST2STRING(param4_expr.attr6_inExpr)))) + ("; break; //back jump"))) + (func11_NewLine_Str()));
					__debugInfo = "976:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func10_IndentDown();
					__debugInfo = "977:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((local8_Text_Str_1960) + (func11_NewLine_Str()));
					__debugInfo = "978:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func8_IndentUp();
					__debugInfo = "979:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((((((local8_Text_Str_1960) + ("case "))) + (CAST2STRING(param4_expr.attr7_varExpr)))) + (": //dummy for"))) + (func11_NewLine_Str()));
					__debugInfo = "981:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global11_LoopBreakID = local6_TmpBID_2041;
					__debugInfo = "982:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global14_LoopContinueID = local6_TmpCID_2042;
					__debugInfo = "957:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29454;
					break;
					
				case 9845: //dummy jumper1
					
					case 9984:
						__debugInfo = "984:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func8_IndentUp();
						
					__debugInfo = "985:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((((((((((((((local8_Text_Str_1960) + ("for("))) + (local13_StartText_Str_2036))) + (" ; "))) + (local12_CondText_Str_2037))) + (" ; "))) + (local11_IncText_Str_2038))) + (") {"))) + (func11_NewLine_Str()));
					__debugInfo = "986:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((local8_Text_Str_1960) + (local13_EachBegin_Str_2039));
					__debugInfo = "987:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((local8_Text_Str_1960) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))))) + (func11_NewLine_Str()));
					__debugInfo = "988:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((local8_Text_Str_1960) + (local11_EachEnd_Str_2040));
					__debugInfo = "989:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func10_IndentDown();
					__debugInfo = "990:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((local8_Text_Str_1960) + (func11_NewLine_Str()))) + ("}"));
					__debugInfo = "984:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29454: //dummy jumper2
					;
						
					__debugInfo = "947:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 9730: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(30))) ? 1 : 0))) { __pc = 10036; break; }
					
					case 10057:
						__debugInfo = "997:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(global8_IsInGoto)) { __pc = 10039; break; }
					
					case 10050:
						__debugInfo = "994:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((((local8_Text_Str_1960) + ("__pc = "))) + (CAST2STRING(global14_LoopContinueID)))) + ("; break"));
						
					__debugInfo = "994:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29455;
					break;
					
				case 10039: //dummy jumper1
					
					case 10056:
						__debugInfo = "996:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((local8_Text_Str_1960) + ("continue"));
						
					__debugInfo = "996:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29455: //dummy jumper2
					;
						
					__debugInfo = "997:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 10036: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(29))) ? 1 : 0))) { __pc = 10059; break; }
					
					case 10080:
						__debugInfo = "1003:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(global8_IsInGoto)) { __pc = 10062; break; }
					
					case 10073:
						__debugInfo = "1000:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((((local8_Text_Str_1960) + ("__pc = "))) + (CAST2STRING(global11_LoopBreakID)))) + ("; break"));
						
					__debugInfo = "1000:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29456;
					break;
					
				case 10062: //dummy jumper1
					
					case 10079:
						__debugInfo = "1002:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((local8_Text_Str_1960) + ("break"));
						
					__debugInfo = "1002:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29456: //dummy jumper2
					;
						
					__debugInfo = "1003:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 10059: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(31))) ? 1 : 0))) { __pc = 10082; break; }
					
					var local9_oIsInGoto_2043 = 0;
					case 10086:
						__debugInfo = "1005:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local9_oIsInGoto_2043 = global8_IsInGoto;
						
					__debugInfo = "1006:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global8_IsInGoto = 0;
					__debugInfo = "1008:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((local8_Text_Str_1960) + ("try "));
					__debugInfo = "1009:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((local8_Text_Str_1960) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
					__debugInfo = "1010:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func8_IndentUp();
					__debugInfo = "1011:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((((((local8_Text_Str_1960) + (" catch ("))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_Name_Str))) + (") {"))) + (func11_NewLine_Str()));
					__debugInfo = "1012:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((((((((((((((((local8_Text_Str_1960) + ("if ("))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_Name_Str))) + (" instanceof OTTException) "))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_Name_Str))) + (" = "))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_Name_Str))) + (".getText(); else throwError("))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_Name_Str))) + (");"));
					__debugInfo = "1013:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((local8_Text_Str_1960) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_catchScp).values[tmpPositionCache][0]))));
					__debugInfo = "1014:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func10_IndentDown();
					__debugInfo = "1015:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((local8_Text_Str_1960) + (func11_NewLine_Str()))) + ("}"));
					__debugInfo = "1018:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global8_IsInGoto = local9_oIsInGoto_2043;
					__debugInfo = "1005:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 10082: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(32))) ? 1 : 0))) { __pc = 10202; break; }
					
					case 10242:
						__debugInfo = "1019:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((((((((((((local8_Text_Str_1960) + ("throw new OTTException("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (", \""))) + (global8_Compiler.attr6_Tokens.arrAccess(param4_expr.attr5_tokID).values[tmpPositionCache].attr8_Path_Str))) + ("\", "))) + (CAST2STRING(global8_Compiler.attr6_Tokens.arrAccess(param4_expr.attr5_tokID).values[tmpPositionCache].attr4_Line)))) + (")"));
						
					__debugInfo = "1019:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 10202: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(33))) ? 1 : 0))) { __pc = 10244; break; }
					
					case 10256:
						__debugInfo = "1022:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((((local8_Text_Str_1960) + ("RESTORE(datablock_"))) + (param4_expr.attr8_Name_Str))) + (")"));
						
					__debugInfo = "1022:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 10244: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(34))) ? 1 : 0))) { __pc = 10258; break; }
					
					var local1_i_2044 = 0.0;
					case 10263:
						__debugInfo = "1024:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local1_i_2044 = 0;
						
					case 10306:
						__debugInfo = "1029:\src\CompilerPasses\Generator\JSGenerator.gbas";
						var forEachSaver10306 = param4_expr.attr5_Reads;
					var forEachCounter10306 = 0
					
				case 10270: //dummy for1
					if (!(forEachCounter10306 < forEachSaver10306.values.length)) {__pc = 10266; break;}
					var local1_R_2045 = forEachSaver10306.values[forEachCounter10306];
					
					
					case 10281:
						__debugInfo = "1026:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((local8_Text_Str_1960) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local1_R_2045).values[tmpPositionCache][0]))))) + (" = READ()"));
						
					case 10302:
						__debugInfo = "1027:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((local1_i_2044) < (((BOUNDS(param4_expr.attr5_Reads, 0)) - (1)))) ? 1 : 0))) { __pc = 10293; break; }
					
					case 10301:
						__debugInfo = "1027:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((local8_Text_Str_1960) + (";"))) + (func11_NewLine_Str()));
						
					__debugInfo = "1027:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 10293: //dummy jumper1
					;
						
					__debugInfo = "1028:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local1_i_2044+=1;
					__debugInfo = "1026:\src\CompilerPasses\Generator\JSGenerator.gbas";
					forEachSaver10306.values[forEachCounter10306] = local1_R_2045;
					
					forEachCounter10306++
					__pc = 10270; break; //back jump
					
				case 10266: //dummy for
					;
						
					__debugInfo = "1024:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 10258: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(35))) ? 1 : 0))) { __pc = 10308; break; }
					
					case 10319:
						__debugInfo = "1031:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((local8_Text_Str_1960) + (func21_JSGetDefaultValue_Str(param4_expr.attr8_datatype, 0, 0)));
						
					__debugInfo = "1031:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 10308: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(36))) ? 1 : 0))) { __pc = 10321; break; }
					
					var local7_def_Str_2046 = "", local4_Find_2047 = 0;
					case 10330:
						__debugInfo = "1033:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local7_def_Str_2046 = func21_JSGetDefaultValue_Str(param4_expr.attr8_datatype, 1, 1);
						
					__debugInfo = "1034:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((((local8_Text_Str_1960) + ("DIM(pool_array.alloc("))) + (local7_def_Str_2046))) + ("), ["));
					__debugInfo = "1035:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local4_Find_2047 = 0;
					case 10375:
						__debugInfo = "1041:\src\CompilerPasses\Generator\JSGenerator.gbas";
						var forEachSaver10375 = param4_expr.attr4_dims;
					var forEachCounter10375 = 0
					
				case 10351: //dummy for1
					if (!(forEachCounter10375 < forEachSaver10375.values.length)) {__pc = 10347; break;}
					var local1_D_2048 = forEachSaver10375.values[forEachCounter10375];
					
					
					case 10363:
						__debugInfo = "1037:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((local4_Find_2047) === (1)) ? 1 : 0))) { __pc = 10356; break; }
					
					case 10362:
						__debugInfo = "1037:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((local8_Text_Str_1960) + (", "));
						
					__debugInfo = "1037:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 10356: //dummy jumper1
					;
						
					__debugInfo = "1038:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((local8_Text_Str_1960) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local1_D_2048).values[tmpPositionCache][0]))));
					__debugInfo = "1040:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local4_Find_2047 = 1;
					__debugInfo = "1037:\src\CompilerPasses\Generator\JSGenerator.gbas";
					forEachSaver10375.values[forEachCounter10375] = local1_D_2048;
					
					forEachCounter10375++
					__pc = 10351; break; //back jump
					
				case 10347: //dummy for
					;
						
					__debugInfo = "1042:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((((local8_Text_Str_1960) + ("], "))) + (local7_def_Str_2046))) + (")"));
					__debugInfo = "1033:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 10321: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(37))) ? 1 : 0))) { __pc = 10386; break; }
					
					case 10402:
						__debugInfo = "1044:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((local8_Text_Str_1960) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_Name_Str))) + (" = "));
						
					case 10458:
						__debugInfo = "1049:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr3_Typ) === (54)) ? 1 : 0))) { __pc = 10412; break; }
					
					case 10445:
						__debugInfo = "1046:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((((((((local8_Text_Str_1960) + ("castobj("))) + (func16_JSRemoveLast_Str(func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr4_expr).values[tmpPositionCache][0])), "[0]")))) + (", "))) + (func18_ChangeTypeName_Str(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str)))) + (")"));
						
					__debugInfo = "1046:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29459;
					break;
					
				case 10412: //dummy jumper1
					
					case 10457:
						__debugInfo = "1048:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((local8_Text_Str_1960) + (func16_JSRemoveLast_Str(func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0])), "[0]")));
						
					__debugInfo = "1048:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29459: //dummy jumper2
					;
						
					__debugInfo = "1051:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((local8_Text_Str_1960) + (" /* ALIAS */"));
					__debugInfo = "1044:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 10386: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(20))) ? 1 : 0))) { __pc = 10465; break; }
					
					case 10477:
						__debugInfo = "1053:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((((local8_Text_Str_1960) + ("__pc = __labels[\""))) + (param4_expr.attr8_Name_Str))) + ("\"]; break"));
						
					__debugInfo = "1053:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 10465: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(21))) ? 1 : 0))) { __pc = 10479; break; }
					
					case 10498:
						__debugInfo = "1055:\src\CompilerPasses\Generator\JSGenerator.gbas";
						global12_LabelDef_Str = ((((((((((global12_LabelDef_Str) + ("\""))) + (param4_expr.attr8_Name_Str))) + ("\": "))) + (CAST2STRING(param4_expr.attr2_ID)))) + (", "));
						
					__debugInfo = "1057:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((local8_Text_Str_1960) + ("//label: "))) + (param4_expr.attr8_Name_Str));
					__debugInfo = "1055:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 10479: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(39))) ? 1 : 0))) { __pc = 10509; break; }
					
					case 10529:
						__debugInfo = "1059:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((((local8_Text_Str_1960) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0]))))) + ("+="))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))));
						
					__debugInfo = "1059:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 10509: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(40))) ? 1 : 0))) { __pc = 10531; break; }
					
					case 10556:
						__debugInfo = "1061:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((((((((local8_Text_Str_1960) + ("DIMPUSH("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0]))))) + (", "))) + (func16_JSRemoveLast_Str(func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0])), "[0]")))) + (")"));
						
					__debugInfo = "1061:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 10531: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(41))) ? 1 : 0))) { __pc = 10558; break; }
					
					case 10607:
						__debugInfo = "1067:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((param4_expr.attr4_kern) !== (-(1))) ? 1 : 0))) { __pc = 10567; break; }
					
					case 10591:
						__debugInfo = "1064:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((((((((local8_Text_Str_1960) + ("KERNLEN("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (", "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_kern).values[tmpPositionCache][0]))))) + (")"));
						
					__debugInfo = "1064:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29460;
					break;
					
				case 10567: //dummy jumper1
					
					case 10606:
						__debugInfo = "1066:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((((local8_Text_Str_1960) + ("("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (").length"));
						
					__debugInfo = "1066:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29460: //dummy jumper2
					;
						
					__debugInfo = "1067:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 10558: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(45))) ? 1 : 0))) { __pc = 10609; break; }
					
					case 10633:
						__debugInfo = "1069:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((((((((local8_Text_Str_1960) + ("BOUNDS("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_array).values[tmpPositionCache][0]))))) + (", "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_position).values[tmpPositionCache][0]))))) + (")"));
						
					__debugInfo = "1069:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 10609: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(42))) ? 1 : 0))) { __pc = 10635; break; }
					
					var local4_Find_2049 = 0;
					case 10650:
						__debugInfo = "1071:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((((local8_Text_Str_1960) + ("DIMDATA("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_array).values[tmpPositionCache][0]))))) + (", ["));
						
					case 10679:
						__debugInfo = "1079:\src\CompilerPasses\Generator\JSGenerator.gbas";
						var forEachSaver10679 = param4_expr.attr5_Exprs;
					var forEachCounter10679 = 0
					
				case 10657: //dummy for1
					if (!(forEachCounter10679 < forEachSaver10679.values.length)) {__pc = 10653; break;}
					var local4_Elem_2050 = forEachSaver10679.values[forEachCounter10679];
					
					
					case 10667:
						__debugInfo = "1074:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(local4_Find_2049)) { __pc = 10660; break; }
					
					case 10666:
						__debugInfo = "1074:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((local8_Text_Str_1960) + (", "));
						
					__debugInfo = "1074:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 10660: //dummy jumper1
					;
						
					__debugInfo = "1076:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((local8_Text_Str_1960) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local4_Elem_2050).values[tmpPositionCache][0]))));
					__debugInfo = "1078:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local4_Find_2049 = 1;
					__debugInfo = "1074:\src\CompilerPasses\Generator\JSGenerator.gbas";
					forEachSaver10679.values[forEachCounter10679] = local4_Elem_2050;
					
					forEachCounter10679++
					__pc = 10657; break; //back jump
					
				case 10653: //dummy for
					;
						
					__debugInfo = "1080:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((local8_Text_Str_1960) + ("])"));
					__debugInfo = "1071:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 10635: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(43))) ? 1 : 0))) { __pc = 10686; break; }
					
					case 10715:
						__debugInfo = "1082:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((((((((((((((local8_Text_Str_1960) + ("forEachSaver"))) + (CAST2STRING(global14_ForEachCounter)))) + (".values[forEachCounter"))) + (CAST2STRING(global14_ForEachCounter)))) + ("] = "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(global14_ForEachCounter).values[tmpPositionCache][0].attr7_varExpr).values[tmpPositionCache][0]))))) + (";"))) + (func11_NewLine_Str()));
						
					__debugInfo = "1083:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((((((((((local8_Text_Str_1960) + ("DIMDEL(forEachSaver"))) + (CAST2STRING(global14_ForEachCounter)))) + (", forEachCounter"))) + (CAST2STRING(global14_ForEachCounter)))) + (");"))) + (func11_NewLine_Str()));
					__debugInfo = "1084:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((((((local8_Text_Str_1960) + ("forEachCounter"))) + (CAST2STRING(global14_ForEachCounter)))) + ("--;"))) + (func11_NewLine_Str()));
					__debugInfo = "1085:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((local8_Text_Str_1960) + ("continue"));
					__debugInfo = "1082:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 10686: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(44))) ? 1 : 0))) { __pc = 10751; break; }
					
					case 10775:
						__debugInfo = "1087:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((((((((local8_Text_Str_1960) + ("DIMDEL("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_array).values[tmpPositionCache][0]))))) + (", "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_position).values[tmpPositionCache][0]))))) + (")"));
						
					__debugInfo = "1087:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 10751: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(46))) ? 1 : 0))) { __pc = 10777; break; }
					
					case 10792:
						__debugInfo = "1089:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((((local8_Text_Str_1960) + ("(("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (") ? 0 : 1)"));
						
					__debugInfo = "1089:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 10777: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(48))) ? 1 : 0))) { __pc = 10794; break; }
					
					case 10808:
						__debugInfo = "1091:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((local8_Text_Str_1960) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_expr.attr4_func).values[tmpPositionCache][0].attr8_Name_Str));
						
					__debugInfo = "1091:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 10794: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(49))) ? 1 : 0))) { __pc = 10810; break; }
					
					var local8_Cond_Str_2051 = "";
					case 10819:
						__debugInfo = "1093:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Cond_Str_2051 = func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]));
						
					__debugInfo = "1094:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((((((((local8_Text_Str_1960) + ("if (!("))) + (local8_Cond_Str_2051))) + (")) throwError(\"AssertException "))) + (REPLACE_Str(local8_Cond_Str_2051, "\"", "'")))) + ("\")"));
					__debugInfo = "1093:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 10810: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(50))) ? 1 : 0))) { __pc = 10838; break; }
					
					case 10853:
						__debugInfo = "1096:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((((local8_Text_Str_1960) + ("DEBUG("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")"));
						
					__debugInfo = "1096:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 10838: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(51))) ? 1 : 0))) { __pc = 10855; break; }
					
					case 10892:
						__debugInfo = "1098:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((((((((((((local8_Text_Str_1960) + ("(("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr10_Conditions.arrAccess(0).values[tmpPositionCache]).values[tmpPositionCache][0]))))) + (") ? ("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr6_Scopes.arrAccess(0).values[tmpPositionCache]).values[tmpPositionCache][0]))))) + (") : ("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr9_elseScope).values[tmpPositionCache][0]))))) + ("))"));
						
					__debugInfo = "1098:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 10855: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(52))) ? 1 : 0))) { __pc = 10894; break; }
					
					case 10906:
						__debugInfo = "1100:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((((local8_Text_Str_1960) + ("//REQUIRE: "))) + (param4_expr.attr8_Name_Str))) + ("\n"));
						
					__debugInfo = "1101:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((local8_Text_Str_1960) + (param4_expr.attr11_Content_Str))) + (func11_NewLine_Str()));
					__debugInfo = "1102:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1960 = ((((((local8_Text_Str_1960) + ("//ENDREQUIRE: "))) + (param4_expr.attr8_Name_Str))) + (func11_NewLine_Str()));
					__debugInfo = "1100:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 10894: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(53))) ? 1 : 0))) { __pc = 10928; break; }
					
					var local5_Found_2052 = 0, local3_Scp_2053 = 0;
					case 10933:
						__debugInfo = "1104:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local5_Found_2052 = 0;
						
					__debugInfo = "1105:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local3_Scp_2053 = global12_CurrentScope;
					case 11018:
						__debugInfo = "1118:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((((((((local3_Scp_2053) !== (-(1))) ? 1 : 0)) && (((((((((global5_Exprs_ref[0].arrAccess(local3_Scp_2053).values[tmpPositionCache][0].attr6_ScpTyp) === (2)) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(local3_Scp_2053).values[tmpPositionCache][0].attr6_ScpTyp) === (4)) ? 1 : 0))) ? 1 : 0)) ? 0 : 1))) ? 1 : 0)) && (((local5_Found_2052) ? 0 : 1))) ? 1 : 0))) {__pc = 29462; break;}
					
					var local5_Varis_2054 = pool_array.alloc(0);
					case 10974:
						__debugInfo = "1108:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func8_GetVaris(unref(local5_Varis_2054), local3_Scp_2053, 0);
						
					case 11010:
						__debugInfo = "1116:\src\CompilerPasses\Generator\JSGenerator.gbas";
						var forEachSaver11010 = local5_Varis_2054;
					var forEachCounter11010 = 0
					
				case 10978: //dummy for1
					if (!(forEachCounter11010 < forEachSaver11010.values.length)) {__pc = 10976; break;}
					var local1_V_2055 = forEachSaver11010.values[forEachCounter11010];
					
					
					var alias3_Var_ref_2056 = [pool_TIdentifierVari.alloc()];
					case 10985:
						__debugInfo = "1110:\src\CompilerPasses\Generator\JSGenerator.gbas";
						alias3_Var_ref_2056 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_V_2055).values[tmpPositionCache] /* ALIAS */;
						
					case 11009:
						__debugInfo = "1115:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((alias3_Var_ref_2056[0].attr8_Name_Str) === ((("param4_self_") + (CAST2STRING(alias3_Var_ref_2056[0].attr2_ID))))) ? 1 : 0))) { __pc = 10996; break; }
					
					case 11004:
						__debugInfo = "1112:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((local8_Text_Str_1960) + (alias3_Var_ref_2056[0].attr8_Name_Str));
						
					__debugInfo = "1113:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local5_Found_2052 = 1;
					case 11008:
						__debugInfo = "1114:\src\CompilerPasses\Generator\JSGenerator.gbas";
						__pc = 10976; break;
						
					__debugInfo = "1112:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 10996: //dummy jumper1
					;
						
					__debugInfo = "1110:\src\CompilerPasses\Generator\JSGenerator.gbas";pool_TIdentifierVari.free(alias3_Var_ref_2056);
					forEachSaver11010.values[forEachCounter11010] = local1_V_2055;
					
					forEachCounter11010++
					__pc = 10978; break; //back jump
					
				case 10976: //dummy for
					;
						
					__debugInfo = "1117:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local3_Scp_2053 = global5_Exprs_ref[0].arrAccess(local3_Scp_2053).values[tmpPositionCache][0].attr10_SuperScope;
					__debugInfo = "1108:\src\CompilerPasses\Generator\JSGenerator.gbas";pool_array.free(local5_Varis_2054);
					__pc = 11018; break; //back jump
					
				case 29462:
					;
						
					case 11027:
						__debugInfo = "1119:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(((local5_Found_2052) ? 0 : 1))) { __pc = 11021; break; }
					
					case 11026:
						__debugInfo = "1119:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func5_Error("Self not found for super", 1118, "src\CompilerPasses\Generator\JSGenerator.gbas");
						
					__debugInfo = "1119:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 11021: //dummy jumper1
					;
						
					__debugInfo = "1104:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 10928: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(54))) ? 1 : 0))) { __pc = 11029; break; }
					
					case 11053:
						__debugInfo = "1122:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1960 = ((((((((((local8_Text_Str_1960) + ("castobj("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (", "))) + (func18_ChangeTypeName_Str(param4_expr.attr8_datatype.attr8_Name_Str)))) + (")"));
						
					__debugInfo = "1122:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 11029: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(7))) ? 1 : 0))) { __pc = 11055; break; }
					
					
					__pc = 29383;
					break;
					
				case 11055: //dummy jumper1
					if (!((((local17___SelectHelper10__1961) === (~~(8))) ? 1 : 0))) { __pc = 11058; break; }
					
					case 11063:
						__debugInfo = "1125:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func5_Error("Invalid Expression", 1124, "src\CompilerPasses\Generator\JSGenerator.gbas");
						
					__debugInfo = "1125:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29383;
					break;
					
				case 11058: //dummy jumper1
					
					case 11073:
						__debugInfo = "1127:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func5_Error((("Unknown expression type: ") + (CAST2STRING(param4_expr.attr3_Typ))), 1126, "src\CompilerPasses\Generator\JSGenerator.gbas");
						
					__debugInfo = "1127:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29383: //dummy jumper2
					;
						
					__debugInfo = "304:\src\CompilerPasses\Generator\JSGenerator.gbas";
					;
				__debugInfo = "1130:\src\CompilerPasses\Generator\JSGenerator.gbas";
				return tryClone(local8_Text_Str_1960);
				__debugInfo = "1131:\src\CompilerPasses\Generator\JSGenerator.gbas";
				return "";
				__debugInfo = "302:\src\CompilerPasses\Generator\JSGenerator.gbas";__pc = -1; break;
				default:
					throwError("Gotocounter exception pc: "+__pc);
				
			}
		}
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func14_JSGenerate_Str = window['func14_JSGenerate_Str'];
window['func14_JSTryUnref_Str'] = function(param1_E) {
	stackPush("function: JSTryUnref_Str", __debugInfo);
	try {
		__debugInfo = "1138:\src\CompilerPasses\Generator\JSGenerator.gbas";
		if (func11_JSDoesUnref(param1_E)) {
			__debugInfo = "1135:\src\CompilerPasses\Generator\JSGenerator.gbas";
			return tryClone((((("unref(") + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param1_E).values[tmpPositionCache][0]))))) + (")")));
			__debugInfo = "1135:\src\CompilerPasses\Generator\JSGenerator.gbas";
		} else {
			__debugInfo = "1137:\src\CompilerPasses\Generator\JSGenerator.gbas";
			return tryClone(func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param1_E).values[tmpPositionCache][0])));
			__debugInfo = "1137:\src\CompilerPasses\Generator\JSGenerator.gbas";
		};
		__debugInfo = "1139:\src\CompilerPasses\Generator\JSGenerator.gbas";
		return "";
		__debugInfo = "1138:\src\CompilerPasses\Generator\JSGenerator.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func14_JSTryUnref_Str = window['func14_JSTryUnref_Str'];
window['func11_JSDoesUnref'] = function(param4_Expr) {
	stackPush("function: JSDoesUnref", __debugInfo);
	try {
		var local5_unref_2059 = 0;
		__debugInfo = "1142:\src\CompilerPasses\Generator\JSGenerator.gbas";
		local5_unref_2059 = 1;
		__debugInfo = "1178:\src\CompilerPasses\Generator\JSGenerator.gbas";
		if (((global5_Exprs_ref[0].arrAccess(param4_Expr).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) ? 0 : 1)) {
			__debugInfo = "1146:\src\CompilerPasses\Generator\JSGenerator.gbas";
			{
				var local17___SelectHelper16__2060 = 0;
				__debugInfo = "1146:\src\CompilerPasses\Generator\JSGenerator.gbas";
				local17___SelectHelper16__2060 = global5_Exprs_ref[0].arrAccess(param4_Expr).values[tmpPositionCache][0].attr3_Typ;
				__debugInfo = "1177:\src\CompilerPasses\Generator\JSGenerator.gbas";
				if ((((local17___SelectHelper16__2060) === (~~(3))) ? 1 : 0)) {
					__debugInfo = "1148:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local5_unref_2059 = 0;
					__debugInfo = "1148:\src\CompilerPasses\Generator\JSGenerator.gbas";
				} else if ((((local17___SelectHelper16__2060) === (~~(4))) ? 1 : 0)) {
					__debugInfo = "1150:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local5_unref_2059 = 0;
					__debugInfo = "1150:\src\CompilerPasses\Generator\JSGenerator.gbas";
				} else if ((((local17___SelectHelper16__2060) === (~~(5))) ? 1 : 0)) {
					__debugInfo = "1152:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local5_unref_2059 = 0;
					__debugInfo = "1152:\src\CompilerPasses\Generator\JSGenerator.gbas";
				} else if ((((local17___SelectHelper16__2060) === (~~(15))) ? 1 : 0)) {
					__debugInfo = "1154:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local5_unref_2059 = func11_JSDoesUnref(global5_Exprs_ref[0].arrAccess(param4_Expr).values[tmpPositionCache][0].attr4_expr);
					__debugInfo = "1154:\src\CompilerPasses\Generator\JSGenerator.gbas";
				} else if ((((local17___SelectHelper16__2060) === (~~(16))) ? 1 : 0)) {
					__debugInfo = "1156:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local5_unref_2059 = func11_JSDoesUnref(global5_Exprs_ref[0].arrAccess(param4_Expr).values[tmpPositionCache][0].attr4_expr);
					__debugInfo = "1156:\src\CompilerPasses\Generator\JSGenerator.gbas";
				} else if ((((local17___SelectHelper16__2060) === (~~(17))) ? 1 : 0)) {
					__debugInfo = "1158:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local5_unref_2059 = func11_JSDoesUnref(global5_Exprs_ref[0].arrAccess(param4_Expr).values[tmpPositionCache][0].attr4_expr);
					__debugInfo = "1158:\src\CompilerPasses\Generator\JSGenerator.gbas";
				} else if ((((local17___SelectHelper16__2060) === (~~(1))) ? 1 : 0)) {
					__debugInfo = "1160:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local5_unref_2059 = 0;
					__debugInfo = "1160:\src\CompilerPasses\Generator\JSGenerator.gbas";
				} else if ((((local17___SelectHelper16__2060) === (~~(6))) ? 1 : 0)) {
					__debugInfo = "1162:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local5_unref_2059 = 0;
					__debugInfo = "1162:\src\CompilerPasses\Generator\JSGenerator.gbas";
				} else if ((((local17___SelectHelper16__2060) === (~~(23))) ? 1 : 0)) {
					__debugInfo = "1164:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local5_unref_2059 = 0;
					__debugInfo = "1164:\src\CompilerPasses\Generator\JSGenerator.gbas";
				} else if ((((local17___SelectHelper16__2060) === (~~(45))) ? 1 : 0)) {
					__debugInfo = "1166:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local5_unref_2059 = 0;
					__debugInfo = "1166:\src\CompilerPasses\Generator\JSGenerator.gbas";
				} else if ((((local17___SelectHelper16__2060) === (~~(41))) ? 1 : 0)) {
					__debugInfo = "1168:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local5_unref_2059 = 0;
					__debugInfo = "1168:\src\CompilerPasses\Generator\JSGenerator.gbas";
				} else {
					var local1_v_2061 = 0;
					__debugInfo = "1170:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local1_v_2061 = func11_GetVariable(param4_Expr, 0);
					__debugInfo = "1176:\src\CompilerPasses\Generator\JSGenerator.gbas";
					if ((((local1_v_2061) !== (-(1))) ? 1 : 0)) {
						__debugInfo = "1175:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_v_2061).values[tmpPositionCache][0].attr3_ref) ? 0 : 1)) {
							__debugInfo = "1174:\src\CompilerPasses\Generator\JSGenerator.gbas";
							local5_unref_2059 = 0;
							__debugInfo = "1174:\src\CompilerPasses\Generator\JSGenerator.gbas";
						};
						__debugInfo = "1175:\src\CompilerPasses\Generator\JSGenerator.gbas";
					};
					__debugInfo = "1170:\src\CompilerPasses\Generator\JSGenerator.gbas";
				};
				__debugInfo = "1146:\src\CompilerPasses\Generator\JSGenerator.gbas";
			};
			__debugInfo = "1146:\src\CompilerPasses\Generator\JSGenerator.gbas";
		};
		__debugInfo = "1179:\src\CompilerPasses\Generator\JSGenerator.gbas";
		return tryClone(local5_unref_2059);
		__debugInfo = "1180:\src\CompilerPasses\Generator\JSGenerator.gbas";
		return 0;
		__debugInfo = "1142:\src\CompilerPasses\Generator\JSGenerator.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func11_JSDoesUnref = window['func11_JSDoesUnref'];
window['func17_JSDoParameter_Str'] = function(param4_expr, param4_func, param7_DoParam) {
	stackPush("function: JSDoParameter_Str", __debugInfo);
	try {
		var local8_Text_Str_2065 = "", local1_i_2066 = 0.0;
		__debugInfo = "1184:\src\CompilerPasses\Generator\JSGenerator.gbas";
		if (param7_DoParam) {
			__debugInfo = "1184:\src\CompilerPasses\Generator\JSGenerator.gbas";
			local8_Text_Str_2065 = "(";
			__debugInfo = "1184:\src\CompilerPasses\Generator\JSGenerator.gbas";
		};
		__debugInfo = "1185:\src\CompilerPasses\Generator\JSGenerator.gbas";
		local1_i_2066 = 0;
		__debugInfo = "1200:\src\CompilerPasses\Generator\JSGenerator.gbas";
		var forEachSaver11368 = param4_expr.attr6_Params;
		for(var forEachCounter11368 = 0 ; forEachCounter11368 < forEachSaver11368.values.length ; forEachCounter11368++) {
			var local5_param_2067 = forEachSaver11368.values[forEachCounter11368];
		{
				__debugInfo = "1189:\src\CompilerPasses\Generator\JSGenerator.gbas";
				if ((((((((((param4_func) !== (-(1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr3_Typ) === (3)) ? 1 : 0))) ? 1 : 0)) && ((((local1_i_2066) === (((BOUNDS(param4_expr.attr6_Params, 0)) - (1)))) ? 1 : 0))) ? 1 : 0)) {
					__debugInfo = "1189:\src\CompilerPasses\Generator\JSGenerator.gbas";
					break;
					__debugInfo = "1189:\src\CompilerPasses\Generator\JSGenerator.gbas";
				};
				__debugInfo = "1190:\src\CompilerPasses\Generator\JSGenerator.gbas";
				if (local1_i_2066) {
					__debugInfo = "1190:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_2065 = ((local8_Text_Str_2065) + (", "));
					__debugInfo = "1190:\src\CompilerPasses\Generator\JSGenerator.gbas";
				};
				__debugInfo = "1197:\src\CompilerPasses\Generator\JSGenerator.gbas";
				if ((((((((((param4_func) !== (-(1))) ? 1 : 0)) && (((global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr15_UsedAsPrototype) ? 0 : 1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_i_2066)).values[tmpPositionCache]).values[tmpPositionCache][0].attr3_ref) === (0)) ? 1 : 0))) ? 1 : 0)) {
					__debugInfo = "1194:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_2065 = ((local8_Text_Str_2065) + (func14_JSTryUnref_Str(local5_param_2067)));
					__debugInfo = "1194:\src\CompilerPasses\Generator\JSGenerator.gbas";
				} else {
					__debugInfo = "1196:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_2065 = ((local8_Text_Str_2065) + (func16_JSRemoveLast_Str(func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local5_param_2067).values[tmpPositionCache][0])), "[0]")));
					__debugInfo = "1196:\src\CompilerPasses\Generator\JSGenerator.gbas";
				};
				__debugInfo = "1199:\src\CompilerPasses\Generator\JSGenerator.gbas";
				local1_i_2066+=1;
				__debugInfo = "1189:\src\CompilerPasses\Generator\JSGenerator.gbas";
			}
			forEachSaver11368.values[forEachCounter11368] = local5_param_2067;
		
		};
		__debugInfo = "1201:\src\CompilerPasses\Generator\JSGenerator.gbas";
		if (param7_DoParam) {
			__debugInfo = "1201:\src\CompilerPasses\Generator\JSGenerator.gbas";
			local8_Text_Str_2065 = ((local8_Text_Str_2065) + (")"));
			__debugInfo = "1201:\src\CompilerPasses\Generator\JSGenerator.gbas";
		};
		__debugInfo = "1202:\src\CompilerPasses\Generator\JSGenerator.gbas";
		return tryClone(local8_Text_Str_2065);
		__debugInfo = "1203:\src\CompilerPasses\Generator\JSGenerator.gbas";
		return "";
		__debugInfo = "1184:\src\CompilerPasses\Generator\JSGenerator.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func17_JSDoParameter_Str = window['func17_JSDoParameter_Str'];
window['func13_JSVariDef_Str'] = function(param5_Varis, param12_ForceDefault, param8_NoStatic, param7_InitVal) {
	stackPush("function: JSVariDef_Str", __debugInfo);
	try {
		var local8_Text_Str_2072 = "", local4_Find_2073 = 0.0;
		__debugInfo = "1206:\src\CompilerPasses\Generator\JSGenerator.gbas";
		local8_Text_Str_2072 = "";
		__debugInfo = "1207:\src\CompilerPasses\Generator\JSGenerator.gbas";
		local4_Find_2073 = 0;
		__debugInfo = "1222:\src\CompilerPasses\Generator\JSGenerator.gbas";
		var forEachSaver11522 = param5_Varis;
		for(var forEachCounter11522 = 0 ; forEachCounter11522 < forEachSaver11522.values.length ; forEachCounter11522++) {
			var local3_Var_2074 = forEachSaver11522.values[forEachCounter11522];
		{
				__debugInfo = "1221:\src\CompilerPasses\Generator\JSGenerator.gbas";
				if ((((((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2074).values[tmpPositionCache][0].attr3_Typ) !== (5)) ? 1 : 0)) && (((((((param8_NoStatic) === (0)) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2074).values[tmpPositionCache][0].attr3_Typ) !== (4)) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) && (func17_JSShouldRedeclare(local3_Var_2074))) ? 1 : 0)) {
					__debugInfo = "1210:\src\CompilerPasses\Generator\JSGenerator.gbas";
					if (local4_Find_2073) {
						__debugInfo = "1210:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_2072 = ((local8_Text_Str_2072) + (", "));
						__debugInfo = "1210:\src\CompilerPasses\Generator\JSGenerator.gbas";
					};
					__debugInfo = "1211:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_2072 = ((local8_Text_Str_2072) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2074).values[tmpPositionCache][0].attr8_Name_Str));
					__debugInfo = "1219:\src\CompilerPasses\Generator\JSGenerator.gbas";
					if (param7_InitVal) {
						__debugInfo = "1213:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_2072 = ((local8_Text_Str_2072) + (" = "));
						__debugInfo = "1218:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2074).values[tmpPositionCache][0].attr6_PreDef) !== (-(1))) ? 1 : 0)) && (((((((param12_ForceDefault) === (0)) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2074).values[tmpPositionCache][0].attr3_Typ) === (6)) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) {
							__debugInfo = "1215:\src\CompilerPasses\Generator\JSGenerator.gbas";
							local8_Text_Str_2072 = ((local8_Text_Str_2072) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2074).values[tmpPositionCache][0].attr6_PreDef).values[tmpPositionCache][0]))));
							__debugInfo = "1215:\src\CompilerPasses\Generator\JSGenerator.gbas";
						} else {
							__debugInfo = "1217:\src\CompilerPasses\Generator\JSGenerator.gbas";
							local8_Text_Str_2072 = ((local8_Text_Str_2072) + (func21_JSGetDefaultValue_Str(global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2074).values[tmpPositionCache][0].attr8_datatype, global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2074).values[tmpPositionCache][0].attr3_ref, 0)));
							__debugInfo = "1217:\src\CompilerPasses\Generator\JSGenerator.gbas";
						};
						__debugInfo = "1213:\src\CompilerPasses\Generator\JSGenerator.gbas";
					};
					__debugInfo = "1220:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local4_Find_2073 = 1;
					__debugInfo = "1210:\src\CompilerPasses\Generator\JSGenerator.gbas";
				};
				__debugInfo = "1221:\src\CompilerPasses\Generator\JSGenerator.gbas";
			}
			forEachSaver11522.values[forEachCounter11522] = local3_Var_2074;
		
		};
		__debugInfo = "1224:\src\CompilerPasses\Generator\JSGenerator.gbas";
		return tryClone(local8_Text_Str_2072);
		__debugInfo = "1225:\src\CompilerPasses\Generator\JSGenerator.gbas";
		return "";
		__debugInfo = "1206:\src\CompilerPasses\Generator\JSGenerator.gbas";pool_array.free(param5_Varis);
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func13_JSVariDef_Str = window['func13_JSVariDef_Str'];
window['func23_ConditionJSGenerate_Str'] = function(param4_expr) {
	stackPush("function: ConditionJSGenerate_Str", __debugInfo);
	try {
		__debugInfo = "1232:\src\CompilerPasses\Generator\JSGenerator.gbas";
		if ((((param4_expr.attr3_Typ) === (16)) ? 1 : 0)) {
			__debugInfo = "1229:\src\CompilerPasses\Generator\JSGenerator.gbas";
			return tryClone(func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0])));
			__debugInfo = "1229:\src\CompilerPasses\Generator\JSGenerator.gbas";
		} else {
			__debugInfo = "1231:\src\CompilerPasses\Generator\JSGenerator.gbas";
			return tryClone(func14_JSGenerate_Str(param4_expr));
			__debugInfo = "1231:\src\CompilerPasses\Generator\JSGenerator.gbas";
		};
		__debugInfo = "1233:\src\CompilerPasses\Generator\JSGenerator.gbas";
		return "";
		__debugInfo = "1232:\src\CompilerPasses\Generator\JSGenerator.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func23_ConditionJSGenerate_Str = window['func23_ConditionJSGenerate_Str'];
window['func17_JSShouldRedeclare'] = function(param3_Var) {
	stackPush("function: JSShouldRedeclare", __debugInfo);
	try {
		__debugInfo = "1244:\src\CompilerPasses\Generator\JSGenerator.gbas";
		if ((((global11_CurrentFunc) !== (-(1))) ? 1 : 0)) {
			__debugInfo = "1243:\src\CompilerPasses\Generator\JSGenerator.gbas";
			var forEachSaver11577 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr10_CopyParams;
			for(var forEachCounter11577 = 0 ; forEachCounter11577 < forEachSaver11577.values.length ; forEachCounter11577++) {
				var local1_P_2077 = forEachSaver11577.values[forEachCounter11577];
			{
					__debugInfo = "1242:\src\CompilerPasses\Generator\JSGenerator.gbas";
					if ((((local1_P_2077) === (param3_Var)) ? 1 : 0)) {
						__debugInfo = "1241:\src\CompilerPasses\Generator\JSGenerator.gbas";
						return tryClone(0);
						__debugInfo = "1241:\src\CompilerPasses\Generator\JSGenerator.gbas";
					};
					__debugInfo = "1242:\src\CompilerPasses\Generator\JSGenerator.gbas";
				}
				forEachSaver11577.values[forEachCounter11577] = local1_P_2077;
			
			};
			__debugInfo = "1243:\src\CompilerPasses\Generator\JSGenerator.gbas";
		};
		__debugInfo = "1245:\src\CompilerPasses\Generator\JSGenerator.gbas";
		return 1;
		__debugInfo = "1246:\src\CompilerPasses\Generator\JSGenerator.gbas";
		return 0;
		__debugInfo = "1244:\src\CompilerPasses\Generator\JSGenerator.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func17_JSShouldRedeclare = window['func17_JSShouldRedeclare'];
window['func21_JSGetDefaultValue_Str'] = function(param8_datatype, param3_Ref, param11_IgnoreArray) {
	stackPush("function: JSGetDefaultValue_Str", __debugInfo);
	try {
		var local10_RetVal_Str_2081 = "";
		__debugInfo = "1249:\src\CompilerPasses\Generator\JSGenerator.gbas";
		local10_RetVal_Str_2081 = "";
		__debugInfo = "1267:\src\CompilerPasses\Generator\JSGenerator.gbas";
		if ((((param8_datatype.attr7_IsArray) && ((((param11_IgnoreArray) === (0)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "1251:\src\CompilerPasses\Generator\JSGenerator.gbas";
			local10_RetVal_Str_2081 = (((("pool_array.alloc(") + (func21_JSGetDefaultValue_Str(param8_datatype, param3_Ref, 1)))) + (")"));
			__debugInfo = "1251:\src\CompilerPasses\Generator\JSGenerator.gbas";
		} else {
			__debugInfo = "1253:\src\CompilerPasses\Generator\JSGenerator.gbas";
			{
				var local17___SelectHelper17__2082 = "";
				__debugInfo = "1253:\src\CompilerPasses\Generator\JSGenerator.gbas";
				local17___SelectHelper17__2082 = param8_datatype.attr8_Name_Str;
				__debugInfo = "1266:\src\CompilerPasses\Generator\JSGenerator.gbas";
				if ((((local17___SelectHelper17__2082) === ("int")) ? 1 : 0)) {
					__debugInfo = "1255:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local10_RetVal_Str_2081 = "0";
					__debugInfo = "1255:\src\CompilerPasses\Generator\JSGenerator.gbas";
				} else if ((((local17___SelectHelper17__2082) === ("float")) ? 1 : 0)) {
					__debugInfo = "1257:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local10_RetVal_Str_2081 = "0.0";
					__debugInfo = "1257:\src\CompilerPasses\Generator\JSGenerator.gbas";
				} else if ((((local17___SelectHelper17__2082) === ("string")) ? 1 : 0)) {
					__debugInfo = "1259:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local10_RetVal_Str_2081 = "\"\"";
					__debugInfo = "1259:\src\CompilerPasses\Generator\JSGenerator.gbas";
				} else {
					__debugInfo = "1265:\src\CompilerPasses\Generator\JSGenerator.gbas";
					if (func6_IsType(param8_datatype.attr8_Name_Str)) {
						__debugInfo = "1262:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local10_RetVal_Str_2081 = (((("pool_") + (param8_datatype.attr8_Name_Str))) + (".alloc()"));
						__debugInfo = "1262:\src\CompilerPasses\Generator\JSGenerator.gbas";
					} else {
						__debugInfo = "1264:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local10_RetVal_Str_2081 = REPLACE_Str(param8_datatype.attr8_Name_Str, "$", "_Str");
						__debugInfo = "1264:\src\CompilerPasses\Generator\JSGenerator.gbas";
					};
					__debugInfo = "1265:\src\CompilerPasses\Generator\JSGenerator.gbas";
				};
				__debugInfo = "1253:\src\CompilerPasses\Generator\JSGenerator.gbas";
			};
			__debugInfo = "1253:\src\CompilerPasses\Generator\JSGenerator.gbas";
		};
		__debugInfo = "1268:\src\CompilerPasses\Generator\JSGenerator.gbas";
		if (param3_Ref) {
			__debugInfo = "1268:\src\CompilerPasses\Generator\JSGenerator.gbas";
			local10_RetVal_Str_2081 = (((("[") + (local10_RetVal_Str_2081))) + ("]"));
			__debugInfo = "1268:\src\CompilerPasses\Generator\JSGenerator.gbas";
		};
		__debugInfo = "1269:\src\CompilerPasses\Generator\JSGenerator.gbas";
		return tryClone(local10_RetVal_Str_2081);
		__debugInfo = "1270:\src\CompilerPasses\Generator\JSGenerator.gbas";
		return "";
		__debugInfo = "1249:\src\CompilerPasses\Generator\JSGenerator.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func21_JSGetDefaultValue_Str = window['func21_JSGetDefaultValue_Str'];
window['func16_JSRemoveLast_Str'] = function(param8_Text_Str, param5_L_Str) {
	stackPush("function: JSRemoveLast_Str", __debugInfo);
	try {
		__debugInfo = "1273:\src\CompilerPasses\Generator\JSGenerator.gbas";
		if ((((((((param8_Text_Str).length) > ((param5_L_Str).length)) ? 1 : 0)) && ((((RIGHT_Str(param8_Text_Str, (param5_L_Str).length)) === (param5_L_Str)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "1273:\src\CompilerPasses\Generator\JSGenerator.gbas";
			param8_Text_Str = LEFT_Str(param8_Text_Str, (((param8_Text_Str).length) - ((param5_L_Str).length)));
			__debugInfo = "1273:\src\CompilerPasses\Generator\JSGenerator.gbas";
		};
		__debugInfo = "1274:\src\CompilerPasses\Generator\JSGenerator.gbas";
		return tryClone(param8_Text_Str);
		__debugInfo = "1275:\src\CompilerPasses\Generator\JSGenerator.gbas";
		return "";
		__debugInfo = "1273:\src\CompilerPasses\Generator\JSGenerator.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func16_JSRemoveLast_Str = window['func16_JSRemoveLast_Str'];
window['func5_Lexer'] = function() {
	stackPush("function: Lexer", __debugInfo);
	try {
		var local12_Splitter_Str_2085 = pool_array.alloc(""), local11_SplitterMap_2086 = pool_HashMap.alloc(), local9_LastFound_2088 = 0, local4_Line_2089 = 0, local15_LineContent_Str_2090 = "", local18_NewLineContent_Str_2091 = "", local8_Path_Str_2092 = "", local9_Character_2093 = 0, local5_WasNL_2107 = 0, local6_WasRem_2108 = 0, local6_HasDel_2109 = 0, local1_i_2113 = 0.0;
		__debugInfo = "8:\src\CompilerPasses\Lexer.gbas";
		REDIM(global8_Compiler.attr6_Tokens, [0], pool_TToken.alloc() );
		__debugInfo = "9:\src\CompilerPasses\Lexer.gbas";
		global8_Compiler.attr11_LastTokenID = 0;
		__debugInfo = "12:\src\CompilerPasses\Lexer.gbas";
		DIMDATA(local12_Splitter_Str_2085, [" ", "\t", "\n", "-", "+", "*", "/", "^", ",", "=", "<", ">", "|", "&", "[", "]", "(", ")", "!", "\"", "?", ";", ".", ":", CHR_Str(8), CHR_Str(12), "\r", "\f"]);
		__debugInfo = "15:\src\CompilerPasses\Lexer.gbas";
		(local11_SplitterMap_2086).SetSize(((BOUNDS(local12_Splitter_Str_2085, 0)) * (8)));
		__debugInfo = "18:\src\CompilerPasses\Lexer.gbas";
		var forEachSaver11769 = local12_Splitter_Str_2085;
		for(var forEachCounter11769 = 0 ; forEachCounter11769 < forEachSaver11769.values.length ; forEachCounter11769++) {
			var local9_Split_Str_2087 = forEachSaver11769.values[forEachCounter11769];
		{
				__debugInfo = "17:\src\CompilerPasses\Lexer.gbas";
				(local11_SplitterMap_2086).Put(local9_Split_Str_2087, 1);
				__debugInfo = "17:\src\CompilerPasses\Lexer.gbas";
			}
			forEachSaver11769.values[forEachCounter11769] = local9_Split_Str_2087;
		
		};
		__debugInfo = "22:\src\CompilerPasses\Lexer.gbas";
		global8_Compiler.attr8_Code_Str = (("\n") + (global8_Compiler.attr8_Code_Str));
		__debugInfo = "24:\src\CompilerPasses\Lexer.gbas";
		{
			var local1_i_2094 = 0;
			__debugInfo = "97:\src\CompilerPasses\Lexer.gbas";
			for (local1_i_2094 = 0;toCheck(local1_i_2094, (((global8_Compiler.attr8_Code_Str).length) - (1)), 1);local1_i_2094 += 1) {
				var local14_DoubleChar_Str_2095 = "", local11_curChar_Str_2098 = "", local15_TmpLineCont_Str_2099 = "";
				__debugInfo = "26:\src\CompilerPasses\Lexer.gbas";
				local9_Character_2093+=1;
				__debugInfo = "29:\src\CompilerPasses\Lexer.gbas";
				if ((((local1_i_2094) < ((((global8_Compiler.attr8_Code_Str).length) - (2)))) ? 1 : 0)) {
					__debugInfo = "29:\src\CompilerPasses\Lexer.gbas";
					local14_DoubleChar_Str_2095 = MID_Str(global8_Compiler.attr8_Code_Str, local1_i_2094, 2);
					__debugInfo = "29:\src\CompilerPasses\Lexer.gbas";
				};
				__debugInfo = "47:\src\CompilerPasses\Lexer.gbas";
				if ((((local14_DoubleChar_Str_2095) === ("//")) ? 1 : 0)) {
					var local8_Text_Str_2096 = "", local3_Pos_2097 = 0;
					__debugInfo = "31:\src\CompilerPasses\Lexer.gbas";
					local8_Text_Str_2096 = MID_Str(global8_Compiler.attr8_Code_Str, local9_LastFound_2088, ((local1_i_2094) - (local9_LastFound_2088)));
					__debugInfo = "34:\src\CompilerPasses\Lexer.gbas";
					if ((((TRIM_Str(local8_Text_Str_2096, " \t\r\n\v\f")) !== ("")) ? 1 : 0)) {
						__debugInfo = "33:\src\CompilerPasses\Lexer.gbas";
						func11_CreateToken(local8_Text_Str_2096, local15_LineContent_Str_2090, local4_Line_2089, local9_Character_2093, local8_Path_Str_2092);
						__debugInfo = "33:\src\CompilerPasses\Lexer.gbas";
					};
					__debugInfo = "36:\src\CompilerPasses\Lexer.gbas";
					local3_Pos_2097 = local1_i_2094;
					__debugInfo = "39:\src\CompilerPasses\Lexer.gbas";
					while (((((((MID_Str(global8_Compiler.attr8_Code_Str, local1_i_2094, 1)) !== ("\n")) ? 1 : 0)) && ((((MID_Str(global8_Compiler.attr8_Code_Str, local1_i_2094, 1)) !== ("\f")) ? 1 : 0))) ? 1 : 0)) {
						__debugInfo = "38:\src\CompilerPasses\Lexer.gbas";
						local1_i_2094+=1;
						__debugInfo = "38:\src\CompilerPasses\Lexer.gbas";
					};
					__debugInfo = "40:\src\CompilerPasses\Lexer.gbas";
					local8_Text_Str_2096 = MID_Str(global8_Compiler.attr8_Code_Str, local3_Pos_2097, ((local1_i_2094) - (local3_Pos_2097)));
					__debugInfo = "45:\src\CompilerPasses\Lexer.gbas";
					if ((((((((local8_Text_Str_2096).length) > (("//$$RESETFILE").length)) ? 1 : 0)) && ((((LEFT_Str(local8_Text_Str_2096, ("//$$RESETFILE").length)) === ("//$$RESETFILE")) ? 1 : 0))) ? 1 : 0)) {
						__debugInfo = "42:\src\CompilerPasses\Lexer.gbas";
						local8_Text_Str_2096 = MID_Str(local8_Text_Str_2096, ((("//$$RESETFILE").length) + (1)), -(1));
						__debugInfo = "43:\src\CompilerPasses\Lexer.gbas";
						local8_Path_Str_2092 = local8_Text_Str_2096;
						__debugInfo = "44:\src\CompilerPasses\Lexer.gbas";
						local4_Line_2089 = 0;
						__debugInfo = "42:\src\CompilerPasses\Lexer.gbas";
					};
					__debugInfo = "46:\src\CompilerPasses\Lexer.gbas";
					local9_LastFound_2088 = local1_i_2094;
					__debugInfo = "31:\src\CompilerPasses\Lexer.gbas";
				};
				__debugInfo = "49:\src\CompilerPasses\Lexer.gbas";
				local11_curChar_Str_2098 = MID_Str(global8_Compiler.attr8_Code_Str, local1_i_2094, 1);
				__debugInfo = "51:\src\CompilerPasses\Lexer.gbas";
				local15_TmpLineCont_Str_2099 = local15_LineContent_Str_2090;
				__debugInfo = "52:\src\CompilerPasses\Lexer.gbas";
				if ((((local11_curChar_Str_2098) === ("\f")) ? 1 : 0)) {
					__debugInfo = "52:\src\CompilerPasses\Lexer.gbas";
					local11_curChar_Str_2098 = "\n";
					__debugInfo = "52:\src\CompilerPasses\Lexer.gbas";
				};
				__debugInfo = "53:\src\CompilerPasses\Lexer.gbas";
				{
					var local17___SelectHelper18__2100 = "";
					__debugInfo = "53:\src\CompilerPasses\Lexer.gbas";
					local17___SelectHelper18__2100 = local11_curChar_Str_2098;
					__debugInfo = "81:\src\CompilerPasses\Lexer.gbas";
					if ((((local17___SelectHelper18__2100) === ("\n")) ? 1 : 0)) {
						__debugInfo = "55:\src\CompilerPasses\Lexer.gbas";
						local9_Character_2093 = 0;
						__debugInfo = "56:\src\CompilerPasses\Lexer.gbas";
						local4_Line_2089+=1;
						__debugInfo = "56:\src\CompilerPasses\Lexer.gbas";
						{
							var local1_j_2101 = 0;
							__debugInfo = "63:\src\CompilerPasses\Lexer.gbas";
							for (local1_j_2101 = ((local1_i_2094) + (1));toCheck(local1_j_2101, (((global8_Compiler.attr8_Code_Str).length) - (1)), 1);local1_j_2101 += 1) {
								__debugInfo = "62:\src\CompilerPasses\Lexer.gbas";
								if (((((((MID_Str(global8_Compiler.attr8_Code_Str, local1_j_2101, 1)) === ("\n")) ? 1 : 0)) || ((((MID_Str(global8_Compiler.attr8_Code_Str, local1_j_2101, 1)) === ("\f")) ? 1 : 0))) ? 1 : 0)) {
									__debugInfo = "59:\src\CompilerPasses\Lexer.gbas";
									local15_TmpLineCont_Str_2099 = TRIM_Str(MID_Str(global8_Compiler.attr8_Code_Str, local1_i_2094, ((local1_j_2101) - (local1_i_2094))), " \t\r\n\v\f");
									__debugInfo = "60:\src\CompilerPasses\Lexer.gbas";
									if ((((RIGHT_Str(local15_TmpLineCont_Str_2099, 1)) === ("\f")) ? 1 : 0)) {
										__debugInfo = "60:\src\CompilerPasses\Lexer.gbas";
										local15_TmpLineCont_Str_2099 = ((MID_Str(local15_TmpLineCont_Str_2099, 0, (((local15_TmpLineCont_Str_2099).length) - (1)))) + ("\n"));
										__debugInfo = "60:\src\CompilerPasses\Lexer.gbas";
									};
									__debugInfo = "61:\src\CompilerPasses\Lexer.gbas";
									break;
									__debugInfo = "59:\src\CompilerPasses\Lexer.gbas";
								};
								__debugInfo = "62:\src\CompilerPasses\Lexer.gbas";
							};
							__debugInfo = "63:\src\CompilerPasses\Lexer.gbas";
						};
						__debugInfo = "55:\src\CompilerPasses\Lexer.gbas";
					} else if ((((local17___SelectHelper18__2100) === ("\"")) ? 1 : 0)) {
						var local12_WasBackSlash_2102 = 0, local10_WasWasBack_2103 = 0;
						__debugInfo = "64:\src\CompilerPasses\Lexer.gbas";
						local12_WasBackSlash_2102 = 0;
						__debugInfo = "65:\src\CompilerPasses\Lexer.gbas";
						local10_WasWasBack_2103 = 0;
						__debugInfo = "65:\src\CompilerPasses\Lexer.gbas";
						{
							var local1_j_2104 = 0;
							__debugInfo = "79:\src\CompilerPasses\Lexer.gbas";
							for (local1_j_2104 = ((local1_i_2094) + (1));toCheck(local1_j_2104, (((global8_Compiler.attr8_Code_Str).length) - (1)), 1);local1_j_2104 += 1) {
								__debugInfo = "69:\src\CompilerPasses\Lexer.gbas";
								if (((((((MID_Str(global8_Compiler.attr8_Code_Str, local1_j_2104, 1)) === ("\n")) ? 1 : 0)) || ((((MID_Str(global8_Compiler.attr8_Code_Str, local1_j_2104, 1)) === ("\f")) ? 1 : 0))) ? 1 : 0)) {
									__debugInfo = "68:\src\CompilerPasses\Lexer.gbas";
									local4_Line_2089+=1;
									__debugInfo = "68:\src\CompilerPasses\Lexer.gbas";
								};
								__debugInfo = "73:\src\CompilerPasses\Lexer.gbas";
								if (((((((MID_Str(global8_Compiler.attr8_Code_Str, local1_j_2104, 1)) === ("\"")) ? 1 : 0)) && (((((((local12_WasBackSlash_2102) === (0)) ? 1 : 0)) || (local10_WasWasBack_2103)) ? 1 : 0))) ? 1 : 0)) {
									__debugInfo = "71:\src\CompilerPasses\Lexer.gbas";
									local1_i_2094 = local1_j_2104;
									__debugInfo = "72:\src\CompilerPasses\Lexer.gbas";
									break;
									__debugInfo = "71:\src\CompilerPasses\Lexer.gbas";
								};
								__debugInfo = "74:\src\CompilerPasses\Lexer.gbas";
								local10_WasWasBack_2103 = local12_WasBackSlash_2102;
								__debugInfo = "75:\src\CompilerPasses\Lexer.gbas";
								local12_WasBackSlash_2102 = 0;
								__debugInfo = "78:\src\CompilerPasses\Lexer.gbas";
								if ((((MID_Str(global8_Compiler.attr8_Code_Str, local1_j_2104, 1)) === ("\\")) ? 1 : 0)) {
									__debugInfo = "77:\src\CompilerPasses\Lexer.gbas";
									local12_WasBackSlash_2102 = 1;
									__debugInfo = "77:\src\CompilerPasses\Lexer.gbas";
								};
								__debugInfo = "69:\src\CompilerPasses\Lexer.gbas";
							};
							__debugInfo = "79:\src\CompilerPasses\Lexer.gbas";
						};
						__debugInfo = "80:\src\CompilerPasses\Lexer.gbas";
						continue;
						__debugInfo = "64:\src\CompilerPasses\Lexer.gbas";
					};
					__debugInfo = "53:\src\CompilerPasses\Lexer.gbas";
				};
				__debugInfo = "94:\src\CompilerPasses\Lexer.gbas";
				if ((local11_SplitterMap_2086).DoesKeyExist(local11_curChar_Str_2098)) {
					var local9_Split_Str_2105 = "", local8_Text_Str_2106 = "";
					__debugInfo = "84:\src\CompilerPasses\Lexer.gbas";
					local9_Split_Str_2105 = local11_curChar_Str_2098;
					__debugInfo = "85:\src\CompilerPasses\Lexer.gbas";
					local8_Text_Str_2106 = MID_Str(global8_Compiler.attr8_Code_Str, local9_LastFound_2088, ((local1_i_2094) - (local9_LastFound_2088)));
					__debugInfo = "86:\src\CompilerPasses\Lexer.gbas";
					if ((((local8_Text_Str_2106) === (";")) ? 1 : 0)) {
						__debugInfo = "86:\src\CompilerPasses\Lexer.gbas";
						local8_Text_Str_2106 = "\n";
						__debugInfo = "86:\src\CompilerPasses\Lexer.gbas";
					};
					__debugInfo = "87:\src\CompilerPasses\Lexer.gbas";
					func11_CreateToken(local8_Text_Str_2106, local15_LineContent_Str_2090, local4_Line_2089, local9_Character_2093, local8_Path_Str_2092);
					__debugInfo = "89:\src\CompilerPasses\Lexer.gbas";
					local8_Text_Str_2106 = MID_Str(global8_Compiler.attr8_Code_Str, local1_i_2094, (local9_Split_Str_2105).length);
					__debugInfo = "90:\src\CompilerPasses\Lexer.gbas";
					if ((((local8_Text_Str_2106) === (";")) ? 1 : 0)) {
						__debugInfo = "90:\src\CompilerPasses\Lexer.gbas";
						local8_Text_Str_2106 = "\n";
						__debugInfo = "90:\src\CompilerPasses\Lexer.gbas";
					};
					__debugInfo = "91:\src\CompilerPasses\Lexer.gbas";
					func11_CreateToken(local8_Text_Str_2106, local15_LineContent_Str_2090, local4_Line_2089, local9_Character_2093, local8_Path_Str_2092);
					__debugInfo = "93:\src\CompilerPasses\Lexer.gbas";
					local9_LastFound_2088 = ((local1_i_2094) + ((local9_Split_Str_2105).length));
					__debugInfo = "84:\src\CompilerPasses\Lexer.gbas";
				};
				__debugInfo = "96:\src\CompilerPasses\Lexer.gbas";
				local15_LineContent_Str_2090 = local15_TmpLineCont_Str_2099;
				__debugInfo = "26:\src\CompilerPasses\Lexer.gbas";
			};
			__debugInfo = "97:\src\CompilerPasses\Lexer.gbas";
		};
		__debugInfo = "98:\src\CompilerPasses\Lexer.gbas";
		func11_CreateToken("__EOFFILE__", "__EOFFILE__", local4_Line_2089, 0, local8_Path_Str_2092);
		__debugInfo = "99:\src\CompilerPasses\Lexer.gbas";
		func11_CreateToken("\n", "__EOFFILE__", local4_Line_2089, 0, local8_Path_Str_2092);
		__debugInfo = "102:\src\CompilerPasses\Lexer.gbas";
		local5_WasNL_2107 = 0;
		__debugInfo = "102:\src\CompilerPasses\Lexer.gbas";
		local6_WasRem_2108 = 0;
		__debugInfo = "103:\src\CompilerPasses\Lexer.gbas";
		local6_HasDel_2109 = 0;
		__debugInfo = "104:\src\CompilerPasses\Lexer.gbas";
		{
			var local1_i_2110 = 0.0;
			__debugInfo = "169:\src\CompilerPasses\Lexer.gbas";
			for (local1_i_2110 = 0;toCheck(local1_i_2110, ((global8_Compiler.attr11_LastTokenID) - (1)), 1);local1_i_2110 += 1) {
				var local8_Text_Str_2111 = "";
				__debugInfo = "113:\src\CompilerPasses\Lexer.gbas";
				if (local6_HasDel_2109) {
					__debugInfo = "107:\src\CompilerPasses\Lexer.gbas";
					local6_HasDel_2109 = 0;
					__debugInfo = "108:\src\CompilerPasses\Lexer.gbas";
					global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2110)).values[tmpPositionCache].attr5_IsDel = 1;
					__debugInfo = "112:\src\CompilerPasses\Lexer.gbas";
					continue;
					__debugInfo = "107:\src\CompilerPasses\Lexer.gbas";
				};
				__debugInfo = "114:\src\CompilerPasses\Lexer.gbas";
				local8_Text_Str_2111 = global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2110)).values[tmpPositionCache].attr8_Text_Str;
				__debugInfo = "127:\src\CompilerPasses\Lexer.gbas";
				if ((((global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2110)).values[tmpPositionCache].attr8_Text_Str) === ("\n")) ? 1 : 0)) {
					__debugInfo = "116:\src\CompilerPasses\Lexer.gbas";
					local8_Text_Str_2111 = "NEWLINE";
					__debugInfo = "123:\src\CompilerPasses\Lexer.gbas";
					if (local5_WasNL_2107) {
						__debugInfo = "118:\src\CompilerPasses\Lexer.gbas";
						global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2110)).values[tmpPositionCache].attr5_IsDel = 1;
						__debugInfo = "122:\src\CompilerPasses\Lexer.gbas";
						continue;
						__debugInfo = "118:\src\CompilerPasses\Lexer.gbas";
					};
					__debugInfo = "124:\src\CompilerPasses\Lexer.gbas";
					local5_WasNL_2107 = 1;
					__debugInfo = "116:\src\CompilerPasses\Lexer.gbas";
				} else {
					__debugInfo = "126:\src\CompilerPasses\Lexer.gbas";
					local5_WasNL_2107 = 0;
					__debugInfo = "126:\src\CompilerPasses\Lexer.gbas";
				};
				__debugInfo = "130:\src\CompilerPasses\Lexer.gbas";
				if ((((global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2110)).values[tmpPositionCache].attr8_Text_Str) === ("REM")) ? 1 : 0)) {
					__debugInfo = "129:\src\CompilerPasses\Lexer.gbas";
					local6_WasRem_2108 = 1;
					__debugInfo = "129:\src\CompilerPasses\Lexer.gbas";
				};
				__debugInfo = "140:\src\CompilerPasses\Lexer.gbas";
				if ((((local6_WasRem_2108) && ((((global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2110)).values[tmpPositionCache].attr8_Text_Str) === ("ENDREM")) ? 1 : 0))) ? 1 : 0)) {
					__debugInfo = "132:\src\CompilerPasses\Lexer.gbas";
					local6_WasRem_2108 = 0;
					__debugInfo = "133:\src\CompilerPasses\Lexer.gbas";
					local6_HasDel_2109 = 1;
					__debugInfo = "135:\src\CompilerPasses\Lexer.gbas";
					global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2110)).values[tmpPositionCache].attr5_IsDel = 1;
					__debugInfo = "139:\src\CompilerPasses\Lexer.gbas";
					continue;
					__debugInfo = "132:\src\CompilerPasses\Lexer.gbas";
				};
				__debugInfo = "147:\src\CompilerPasses\Lexer.gbas";
				if (local6_WasRem_2108) {
					__debugInfo = "142:\src\CompilerPasses\Lexer.gbas";
					global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2110)).values[tmpPositionCache].attr5_IsDel = 1;
					__debugInfo = "146:\src\CompilerPasses\Lexer.gbas";
					continue;
					__debugInfo = "142:\src\CompilerPasses\Lexer.gbas";
				};
				__debugInfo = "168:\src\CompilerPasses\Lexer.gbas";
				if ((((local1_i_2110) < (((global8_Compiler.attr11_LastTokenID) - (1)))) ? 1 : 0)) {
					__debugInfo = "149:\src\CompilerPasses\Lexer.gbas";
					{
						var local17___SelectHelper19__2112 = "";
						__debugInfo = "149:\src\CompilerPasses\Lexer.gbas";
						local17___SelectHelper19__2112 = global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2110)).values[tmpPositionCache].attr8_Text_Str;
						__debugInfo = "167:\src\CompilerPasses\Lexer.gbas";
						if ((((local17___SelectHelper19__2112) === ("<")) ? 1 : 0)) {
							__debugInfo = "155:\src\CompilerPasses\Lexer.gbas";
							if ((((global8_Compiler.attr6_Tokens.arrAccess(~~(((local1_i_2110) + (1)))).values[tmpPositionCache].attr8_Text_Str) === (">")) ? 1 : 0)) {
								__debugInfo = "152:\src\CompilerPasses\Lexer.gbas";
								global8_Compiler.attr6_Tokens.arrAccess(~~(((local1_i_2110) + (1)))).values[tmpPositionCache].attr5_IsDel = 1;
								__debugInfo = "154:\src\CompilerPasses\Lexer.gbas";
								global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2110)).values[tmpPositionCache].attr8_Text_Str = "<>";
								__debugInfo = "152:\src\CompilerPasses\Lexer.gbas";
							};
							__debugInfo = "160:\src\CompilerPasses\Lexer.gbas";
							if ((((global8_Compiler.attr6_Tokens.arrAccess(~~(((local1_i_2110) + (1)))).values[tmpPositionCache].attr8_Text_Str) === ("=")) ? 1 : 0)) {
								__debugInfo = "157:\src\CompilerPasses\Lexer.gbas";
								global8_Compiler.attr6_Tokens.arrAccess(~~(((local1_i_2110) + (1)))).values[tmpPositionCache].attr5_IsDel = 1;
								__debugInfo = "159:\src\CompilerPasses\Lexer.gbas";
								global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2110)).values[tmpPositionCache].attr8_Text_Str = "<=";
								__debugInfo = "157:\src\CompilerPasses\Lexer.gbas";
							};
							__debugInfo = "155:\src\CompilerPasses\Lexer.gbas";
						} else if ((((local17___SelectHelper19__2112) === (">")) ? 1 : 0)) {
							__debugInfo = "166:\src\CompilerPasses\Lexer.gbas";
							if ((((global8_Compiler.attr6_Tokens.arrAccess(~~(((local1_i_2110) + (1)))).values[tmpPositionCache].attr8_Text_Str) === ("=")) ? 1 : 0)) {
								__debugInfo = "163:\src\CompilerPasses\Lexer.gbas";
								global8_Compiler.attr6_Tokens.arrAccess(~~(((local1_i_2110) + (1)))).values[tmpPositionCache].attr5_IsDel = 1;
								__debugInfo = "165:\src\CompilerPasses\Lexer.gbas";
								global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2110)).values[tmpPositionCache].attr8_Text_Str = ">=";
								__debugInfo = "163:\src\CompilerPasses\Lexer.gbas";
							};
							__debugInfo = "166:\src\CompilerPasses\Lexer.gbas";
						};
						__debugInfo = "149:\src\CompilerPasses\Lexer.gbas";
					};
					__debugInfo = "149:\src\CompilerPasses\Lexer.gbas";
				};
				__debugInfo = "113:\src\CompilerPasses\Lexer.gbas";
			};
			__debugInfo = "169:\src\CompilerPasses\Lexer.gbas";
		};
		__debugInfo = "170:\src\CompilerPasses\Lexer.gbas";
		local1_i_2113 = 0;
		__debugInfo = "210:\src\CompilerPasses\Lexer.gbas";
		return 0;
		__debugInfo = "8:\src\CompilerPasses\Lexer.gbas";pool_array.free(local12_Splitter_Str_2085);pool_HashMap.free(local11_SplitterMap_2086);
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func5_Lexer = window['func5_Lexer'];
window['func7_VariDef'] = function(param9_NoDefault) {
	stackPush("function: VariDef", __debugInfo);
	try {
		var local8_Name_Str_2115 = "", local12_datatype_Str_2116 = "", local7_IsArray_2117 = 0, local12_RightTok_Str_2118 = "", local11_LeftTok_Str_2119 = "", local6_DefVal_2120 = 0, local4_dims_2121 = pool_array.alloc(0), local4_vari_2124 = pool_TIdentifierVari.alloc();
		__debugInfo = "9:\src\CompilerPasses\Parser.gbas";
		local8_Name_Str_2115 = func14_GetCurrent_Str();
		__debugInfo = "10:\src\CompilerPasses\Parser.gbas";
		func14_IsValidVarName();
		__debugInfo = "11:\src\CompilerPasses\Parser.gbas";
		func5_Match(local8_Name_Str_2115, 10, "src\CompilerPasses\Parser.gbas");
		__debugInfo = "12:\src\CompilerPasses\Parser.gbas";
		local12_datatype_Str_2116 = "float";
		__debugInfo = "13:\src\CompilerPasses\Parser.gbas";
		local7_IsArray_2117 = 0;
		__debugInfo = "14:\src\CompilerPasses\Parser.gbas";
		local12_RightTok_Str_2118 = RIGHT_Str(local8_Name_Str_2115, 1);
		__debugInfo = "15:\src\CompilerPasses\Parser.gbas";
		local11_LeftTok_Str_2119 = LEFT_Str(local8_Name_Str_2115, (((local8_Name_Str_2115).length) - (1)));
		__debugInfo = "16:\src\CompilerPasses\Parser.gbas";
		local6_DefVal_2120 = -(1);
		__debugInfo = "19:\src\CompilerPasses\Parser.gbas";
		{
			var local17___SelectHelper20__2122 = "";
			__debugInfo = "19:\src\CompilerPasses\Parser.gbas";
			local17___SelectHelper20__2122 = local12_RightTok_Str_2118;
			__debugInfo = "29:\src\CompilerPasses\Parser.gbas";
			if ((((local17___SelectHelper20__2122) === ("%")) ? 1 : 0)) {
				__debugInfo = "21:\src\CompilerPasses\Parser.gbas";
				local12_datatype_Str_2116 = "int";
				__debugInfo = "22:\src\CompilerPasses\Parser.gbas";
				local8_Name_Str_2115 = local11_LeftTok_Str_2119;
				__debugInfo = "21:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper20__2122) === ("#")) ? 1 : 0)) {
				__debugInfo = "24:\src\CompilerPasses\Parser.gbas";
				local12_datatype_Str_2116 = "float";
				__debugInfo = "25:\src\CompilerPasses\Parser.gbas";
				local8_Name_Str_2115 = local11_LeftTok_Str_2119;
				__debugInfo = "24:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper20__2122) === ("$")) ? 1 : 0)) {
				__debugInfo = "27:\src\CompilerPasses\Parser.gbas";
				local12_datatype_Str_2116 = "string";
				__debugInfo = "27:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "19:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "48:\src\CompilerPasses\Parser.gbas";
		if (func7_IsToken("[")) {
			__debugInfo = "33:\src\CompilerPasses\Parser.gbas";
			func5_Match("[", 32, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "46:\src\CompilerPasses\Parser.gbas";
			if (func7_IsToken("]")) {
				__debugInfo = "35:\src\CompilerPasses\Parser.gbas";
				func5_Match("]", 34, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "35:\src\CompilerPasses\Parser.gbas";
			} else {
				var local1_E_2123 = 0;
				__debugInfo = "37:\src\CompilerPasses\Parser.gbas";
				local1_E_2123 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 36, 0);
				__debugInfo = "38:\src\CompilerPasses\Parser.gbas";
				func5_Match("]", 37, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "39:\src\CompilerPasses\Parser.gbas";
				DIMPUSH(local4_dims_2121, local1_E_2123);
				__debugInfo = "45:\src\CompilerPasses\Parser.gbas";
				while (func7_IsToken("[")) {
					__debugInfo = "41:\src\CompilerPasses\Parser.gbas";
					func5_Match("[", 40, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "42:\src\CompilerPasses\Parser.gbas";
					local1_E_2123 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 41, 0);
					__debugInfo = "43:\src\CompilerPasses\Parser.gbas";
					DIMPUSH(local4_dims_2121, local1_E_2123);
					__debugInfo = "44:\src\CompilerPasses\Parser.gbas";
					func5_Match("]", 43, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "41:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "37:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "47:\src\CompilerPasses\Parser.gbas";
			local7_IsArray_2117 = 1;
			__debugInfo = "33:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "69:\src\CompilerPasses\Parser.gbas";
		if (func7_IsToken("AS")) {
			__debugInfo = "68:\src\CompilerPasses\Parser.gbas";
			if ((((local12_datatype_Str_2116) === ("float")) ? 1 : 0)) {
				__debugInfo = "52:\src\CompilerPasses\Parser.gbas";
				func5_Match("AS", 51, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "64:\src\CompilerPasses\Parser.gbas";
				if (((((((((((((((((((func7_IsToken("int")) || (func7_IsToken("short"))) ? 1 : 0)) || (func7_IsToken("byte"))) ? 1 : 0)) || (func7_IsToken("bool"))) ? 1 : 0)) || (func7_IsToken("boolean"))) ? 1 : 0)) || (func7_IsToken("long"))) ? 1 : 0)) || (func7_IsToken("single"))) ? 1 : 0)) {
					__debugInfo = "54:\src\CompilerPasses\Parser.gbas";
					local12_datatype_Str_2116 = "int";
					__debugInfo = "54:\src\CompilerPasses\Parser.gbas";
				} else if ((((func7_IsToken("float")) || (func7_IsToken("double"))) ? 1 : 0)) {
					__debugInfo = "56:\src\CompilerPasses\Parser.gbas";
					local12_datatype_Str_2116 = "float";
					__debugInfo = "56:\src\CompilerPasses\Parser.gbas";
				} else if (func7_IsToken("void")) {
					__debugInfo = "58:\src\CompilerPasses\Parser.gbas";
					local12_datatype_Str_2116 = "void";
					__debugInfo = "58:\src\CompilerPasses\Parser.gbas";
				} else if (func7_IsToken("string")) {
					__debugInfo = "60:\src\CompilerPasses\Parser.gbas";
					local12_datatype_Str_2116 = "string";
					__debugInfo = "60:\src\CompilerPasses\Parser.gbas";
				} else {
					__debugInfo = "62:\src\CompilerPasses\Parser.gbas";
					func15_IsValidDatatype();
					__debugInfo = "63:\src\CompilerPasses\Parser.gbas";
					local12_datatype_Str_2116 = func14_GetCurrent_Str();
					__debugInfo = "62:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "65:\src\CompilerPasses\Parser.gbas";
				func7_GetNext();
				__debugInfo = "52:\src\CompilerPasses\Parser.gbas";
			} else {
				__debugInfo = "67:\src\CompilerPasses\Parser.gbas";
				func5_Error("Unexpected AS", 66, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "67:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "68:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "72:\src\CompilerPasses\Parser.gbas";
		local4_vari_2124.attr8_Name_Str = local8_Name_Str_2115;
		__debugInfo = "73:\src\CompilerPasses\Parser.gbas";
		local4_vari_2124.attr8_datatype.attr8_Name_Str = local12_datatype_Str_2116;
		__debugInfo = "74:\src\CompilerPasses\Parser.gbas";
		local4_vari_2124.attr8_datatype.attr7_IsArray = local7_IsArray_2117;
		__debugInfo = "78:\src\CompilerPasses\Parser.gbas";
		if ((((BOUNDS(local4_dims_2121, 0)) > (0)) ? 1 : 0)) {
			__debugInfo = "77:\src\CompilerPasses\Parser.gbas";
			local6_DefVal_2120 = func25_CreateDimAsExprExpression(local4_vari_2124.attr8_datatype, unref(local4_dims_2121));
			__debugInfo = "77:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "83:\src\CompilerPasses\Parser.gbas";
		if ((((func7_IsToken("=")) && (((param9_NoDefault) ? 0 : 1))) ? 1 : 0)) {
			__debugInfo = "81:\src\CompilerPasses\Parser.gbas";
			func5_Match("=", 80, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "82:\src\CompilerPasses\Parser.gbas";
			local6_DefVal_2120 = func14_EnsureDatatype(func10_Expression(0), local4_vari_2124.attr8_datatype, 81, 0);
			__debugInfo = "81:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "85:\src\CompilerPasses\Parser.gbas";
		local4_vari_2124.attr6_PreDef = local6_DefVal_2120;
		__debugInfo = "86:\src\CompilerPasses\Parser.gbas";
		return tryClone(local4_vari_2124);
		__debugInfo = "87:\src\CompilerPasses\Parser.gbas";
		return tryClone(unref(pool_TIdentifierVari.alloc()));
		__debugInfo = "9:\src\CompilerPasses\Parser.gbas";pool_array.free(local4_dims_2121);pool_TIdentifierVari.free(local4_vari_2124);
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func7_VariDef = window['func7_VariDef'];
window['func7_FuncDef'] = function(param6_Native, param10_IsCallBack, param3_Typ, param6_CurTyp) {
	stackPush("function: FuncDef", __debugInfo);
	try {
		var local8_Name_Str_2129 = "";
		__debugInfo = "95:\src\CompilerPasses\Parser.gbas";
		if ((((param3_Typ) === (4)) ? 1 : 0)) {
			__debugInfo = "92:\src\CompilerPasses\Parser.gbas";
			func5_Match("PROTOTYPE", 91, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "92:\src\CompilerPasses\Parser.gbas";
		} else {
			__debugInfo = "94:\src\CompilerPasses\Parser.gbas";
			func5_Match("FUNCTION", 93, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "94:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "96:\src\CompilerPasses\Parser.gbas";
		local8_Name_Str_2129 = func14_GetCurrent_Str();
		__debugInfo = "157:\src\CompilerPasses\Parser.gbas";
		var forEachSaver13052 = global8_Compiler.attr5_Funcs_ref[0];
		for(var forEachCounter13052 = 0 ; forEachCounter13052 < forEachSaver13052.values.length ; forEachCounter13052++) {
			var local4_func_ref_2130 = forEachSaver13052.values[forEachCounter13052];
		{
				__debugInfo = "156:\src\CompilerPasses\Parser.gbas";
				if (((((((((((((func7_IsToken(func16_AddDataChars_Str(local4_func_ref_2130[0].attr8_Name_Str, unref(local4_func_ref_2130[0])))) || (func7_IsToken(local4_func_ref_2130[0].attr8_Name_Str))) ? 1 : 0)) && ((((local4_func_ref_2130[0].attr10_IsCallback) === (param10_IsCallBack)) ? 1 : 0))) ? 1 : 0)) && ((((local4_func_ref_2130[0].attr3_Typ) === (param3_Typ)) ? 1 : 0))) ? 1 : 0)) && ((((local4_func_ref_2130[0].attr6_MyType) === (param6_CurTyp)) ? 1 : 0))) ? 1 : 0)) {
					var local7_tmpVari_2131 = pool_TIdentifierVari.alloc(), local10_MustDefVal_2132 = 0;
					__debugInfo = "100:\src\CompilerPasses\Parser.gbas";
					local7_tmpVari_2131 = func7_VariDef(0).clone(/* In Assign */);
					__debugInfo = "105:\src\CompilerPasses\Parser.gbas";
					func5_Match(":", 104, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "106:\src\CompilerPasses\Parser.gbas";
					local10_MustDefVal_2132 = 0;
					__debugInfo = "128:\src\CompilerPasses\Parser.gbas";
					while ((((func7_IsToken("\n")) === (0)) ? 1 : 0)) {
						var local3_ref_2133 = 0, local4_vari_ref_2134 = [pool_TIdentifierVari.alloc()];
						__debugInfo = "108:\src\CompilerPasses\Parser.gbas";
						local3_ref_2133 = 0;
						__debugInfo = "114:\src\CompilerPasses\Parser.gbas";
						if (func7_IsToken("BYREF")) {
							__debugInfo = "111:\src\CompilerPasses\Parser.gbas";
							local3_ref_2133 = 1;
							__debugInfo = "112:\src\CompilerPasses\Parser.gbas";
							func5_Match("BYREF", 111, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "113:\src\CompilerPasses\Parser.gbas";
							local4_func_ref_2130[0].attr6_HasRef = 1;
							__debugInfo = "111:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "116:\src\CompilerPasses\Parser.gbas";
						local4_vari_ref_2134[0] = func7_VariDef(0).clone(/* In Assign */);
						__debugInfo = "121:\src\CompilerPasses\Parser.gbas";
						if (local10_MustDefVal_2132) {
							__debugInfo = "118:\src\CompilerPasses\Parser.gbas";
							if ((((local4_vari_ref_2134[0].attr6_PreDef) === (-(1))) ? 1 : 0)) {
								__debugInfo = "118:\src\CompilerPasses\Parser.gbas";
								func5_Error((((("Parameter '") + (local4_vari_ref_2134[0].attr8_Name_Str))) + ("' has to have default value.")), 117, "src\CompilerPasses\Parser.gbas");
								__debugInfo = "118:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "118:\src\CompilerPasses\Parser.gbas";
						} else {
							__debugInfo = "120:\src\CompilerPasses\Parser.gbas";
							if ((((local4_vari_ref_2134[0].attr6_PreDef) !== (-(1))) ? 1 : 0)) {
								__debugInfo = "120:\src\CompilerPasses\Parser.gbas";
								local10_MustDefVal_2132 = 1;
								__debugInfo = "120:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "120:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "122:\src\CompilerPasses\Parser.gbas";
						local4_vari_ref_2134[0].attr3_Typ = ~~(5);
						__debugInfo = "123:\src\CompilerPasses\Parser.gbas";
						local4_vari_ref_2134[0].attr3_ref = local3_ref_2133;
						__debugInfo = "124:\src\CompilerPasses\Parser.gbas";
						local4_vari_ref_2134[0].attr2_ID = BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0);
						__debugInfo = "125:\src\CompilerPasses\Parser.gbas";
						DIMPUSH(global8_Compiler.attr5_Varis_ref[0], local4_vari_ref_2134);
						__debugInfo = "126:\src\CompilerPasses\Parser.gbas";
						DIMPUSH(local4_func_ref_2130[0].attr6_Params, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
						__debugInfo = "127:\src\CompilerPasses\Parser.gbas";
						if ((((func7_IsToken("\n")) === (0)) ? 1 : 0)) {
							__debugInfo = "127:\src\CompilerPasses\Parser.gbas";
							func5_Match(",", 126, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "127:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "108:\src\CompilerPasses\Parser.gbas";pool_TIdentifierVari.free(local4_vari_ref_2134);
					};
					__debugInfo = "141:\src\CompilerPasses\Parser.gbas";
					if ((((param3_Typ) !== (3)) ? 1 : 0)) {
						__debugInfo = "140:\src\CompilerPasses\Parser.gbas";
						(global8_Compiler.attr11_GlobalFuncs).Put(local4_func_ref_2130[0].attr8_Name_Str, local4_func_ref_2130[0].attr2_ID);
						__debugInfo = "140:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "154:\src\CompilerPasses\Parser.gbas";
					if ((((param3_Typ) !== (4)) ? 1 : 0)) {
						__debugInfo = "153:\src\CompilerPasses\Parser.gbas";
						if (((((((param6_Native) === (0)) ? 1 : 0)) && ((((local4_func_ref_2130[0].attr10_IsAbstract) === (0)) ? 1 : 0))) ? 1 : 0)) {
							__debugInfo = "145:\src\CompilerPasses\Parser.gbas";
							local4_func_ref_2130[0].attr6_Native = 0;
							__debugInfo = "146:\src\CompilerPasses\Parser.gbas";
							func5_Match("\n", 145, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "147:\src\CompilerPasses\Parser.gbas";
							local4_func_ref_2130[0].attr3_Tok = global8_Compiler.attr11_currentPosi;
							__debugInfo = "148:\src\CompilerPasses\Parser.gbas";
							func10_SkipTokens("FUNCTION", "ENDFUNCTION", local4_func_ref_2130[0].attr8_Name_Str);
							__debugInfo = "145:\src\CompilerPasses\Parser.gbas";
						} else {
							__debugInfo = "152:\src\CompilerPasses\Parser.gbas";
							if (((local4_func_ref_2130[0].attr10_IsAbstract) ? 0 : 1)) {
								__debugInfo = "151:\src\CompilerPasses\Parser.gbas";
								local4_func_ref_2130[0].attr6_Native = 1;
								__debugInfo = "151:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "152:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "153:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "155:\src\CompilerPasses\Parser.gbas";
					return 0;
					__debugInfo = "100:\src\CompilerPasses\Parser.gbas";pool_TIdentifierVari.free(local7_tmpVari_2131);
				};
				__debugInfo = "156:\src\CompilerPasses\Parser.gbas";
			}
			forEachSaver13052.values[forEachCounter13052] = local4_func_ref_2130;
		
		};
		__debugInfo = "162:\src\CompilerPasses\Parser.gbas";
		if (param10_IsCallBack) {
			__debugInfo = "159:\src\CompilerPasses\Parser.gbas";
			func10_SkipTokens("FUNCTION", "ENDFUNCTION", local8_Name_Str_2129);
			__debugInfo = "159:\src\CompilerPasses\Parser.gbas";
		} else {
			__debugInfo = "161:\src\CompilerPasses\Parser.gbas";
			func5_Error((((("Internal error (func definition for unknown type: ") + (local8_Name_Str_2129))) + (")")), 160, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "161:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "163:\src\CompilerPasses\Parser.gbas";
		return 0;
		__debugInfo = "95:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func7_FuncDef = window['func7_FuncDef'];
window['func6_SubDef'] = function() {
	stackPush("function: SubDef", __debugInfo);
	try {
		__debugInfo = "167:\src\CompilerPasses\Parser.gbas";
		func5_Match("SUB", 166, "src\CompilerPasses\Parser.gbas");
		__debugInfo = "183:\src\CompilerPasses\Parser.gbas";
		var forEachSaver13151 = global8_Compiler.attr5_Funcs_ref[0];
		for(var forEachCounter13151 = 0 ; forEachCounter13151 < forEachSaver13151.values.length ; forEachCounter13151++) {
			var local4_func_ref_2135 = forEachSaver13151.values[forEachCounter13151];
		{
				__debugInfo = "182:\src\CompilerPasses\Parser.gbas";
				if ((((func7_IsToken(local4_func_ref_2135[0].attr8_Name_Str)) && ((((local4_func_ref_2135[0].attr3_Typ) === (2)) ? 1 : 0))) ? 1 : 0)) {
					__debugInfo = "170:\src\CompilerPasses\Parser.gbas";
					local4_func_ref_2135[0].attr8_Name_Str = func14_GetCurrent_Str();
					__debugInfo = "171:\src\CompilerPasses\Parser.gbas";
					local4_func_ref_2135[0].attr8_datatype = global12_voidDatatype.clone(/* In Assign */);
					__debugInfo = "172:\src\CompilerPasses\Parser.gbas";
					local4_func_ref_2135[0].attr3_Typ = ~~(2);
					__debugInfo = "174:\src\CompilerPasses\Parser.gbas";
					(global8_Compiler.attr11_GlobalFuncs).Put(local4_func_ref_2135[0].attr8_Name_Str, local4_func_ref_2135[0].attr2_ID);
					__debugInfo = "176:\src\CompilerPasses\Parser.gbas";
					func5_Match(local4_func_ref_2135[0].attr8_Name_Str, 175, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "177:\src\CompilerPasses\Parser.gbas";
					func5_Match(":", 176, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "178:\src\CompilerPasses\Parser.gbas";
					func5_Match("\n", 177, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "179:\src\CompilerPasses\Parser.gbas";
					local4_func_ref_2135[0].attr3_Tok = global8_Compiler.attr11_currentPosi;
					__debugInfo = "180:\src\CompilerPasses\Parser.gbas";
					func10_SkipTokens("SUB", "ENDSUB", local4_func_ref_2135[0].attr8_Name_Str);
					__debugInfo = "181:\src\CompilerPasses\Parser.gbas";
					return 0;
					__debugInfo = "170:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "182:\src\CompilerPasses\Parser.gbas";
			}
			forEachSaver13151.values[forEachCounter13151] = local4_func_ref_2135;
		
		};
		__debugInfo = "184:\src\CompilerPasses\Parser.gbas";
		func5_Error("Internal error (sub definition for unknown type)", 183, "src\CompilerPasses\Parser.gbas");
		__debugInfo = "185:\src\CompilerPasses\Parser.gbas";
		return 0;
		__debugInfo = "167:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func6_SubDef = window['func6_SubDef'];
window['func8_TypeDefi'] = function() {
	stackPush("function: TypeDefi", __debugInfo);
	try {
		__debugInfo = "189:\src\CompilerPasses\Parser.gbas";
		func5_Match("TYPE", 188, "src\CompilerPasses\Parser.gbas");
		__debugInfo = "257:\src\CompilerPasses\Parser.gbas";
		var forEachSaver13406 = global8_Compiler.attr5_Types_ref[0];
		for(var forEachCounter13406 = 0 ; forEachCounter13406 < forEachSaver13406.values.length ; forEachCounter13406++) {
			var local3_typ_ref_2136 = forEachSaver13406.values[forEachCounter13406];
		{
				__debugInfo = "256:\src\CompilerPasses\Parser.gbas";
				if (func7_IsToken(local3_typ_ref_2136[0].attr8_Name_Str)) {
					var local11_ExtName_Str_2137 = "";
					__debugInfo = "192:\src\CompilerPasses\Parser.gbas";
					local3_typ_ref_2136[0].attr8_Name_Str = func14_GetCurrent_Str();
					__debugInfo = "193:\src\CompilerPasses\Parser.gbas";
					func5_Match(local3_typ_ref_2136[0].attr8_Name_Str, 192, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "203:\src\CompilerPasses\Parser.gbas";
					if (func7_IsToken("EXTENDS")) {
						__debugInfo = "198:\src\CompilerPasses\Parser.gbas";
						func5_Match("EXTENDS", 197, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "199:\src\CompilerPasses\Parser.gbas";
						local11_ExtName_Str_2137 = func14_GetCurrent_Str();
						__debugInfo = "200:\src\CompilerPasses\Parser.gbas";
						func7_GetNext();
						__debugInfo = "198:\src\CompilerPasses\Parser.gbas";
					} else if ((((local3_typ_ref_2136[0].attr8_Name_Str) !== ("TObject")) ? 1 : 0)) {
						__debugInfo = "202:\src\CompilerPasses\Parser.gbas";
						local11_ExtName_Str_2137 = "TObject";
						__debugInfo = "202:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "212:\src\CompilerPasses\Parser.gbas";
					if ((((local11_ExtName_Str_2137) !== ("")) ? 1 : 0)) {
						__debugInfo = "205:\src\CompilerPasses\Parser.gbas";
						if ((((local11_ExtName_Str_2137) === (local3_typ_ref_2136[0].attr8_Name_Str)) ? 1 : 0)) {
							__debugInfo = "205:\src\CompilerPasses\Parser.gbas";
							func5_Error("Type cannot extend itself!", 204, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "205:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "211:\src\CompilerPasses\Parser.gbas";
						var forEachSaver13251 = global8_Compiler.attr5_Types_ref[0];
						for(var forEachCounter13251 = 0 ; forEachCounter13251 < forEachSaver13251.values.length ; forEachCounter13251++) {
							var local1_T_ref_2138 = forEachSaver13251.values[forEachCounter13251];
						{
								__debugInfo = "210:\src\CompilerPasses\Parser.gbas";
								if ((((local1_T_ref_2138[0].attr8_Name_Str) === (local11_ExtName_Str_2137)) ? 1 : 0)) {
									__debugInfo = "208:\src\CompilerPasses\Parser.gbas";
									local3_typ_ref_2136[0].attr9_Extending = local1_T_ref_2138[0].attr2_ID;
									__debugInfo = "209:\src\CompilerPasses\Parser.gbas";
									break;
									__debugInfo = "208:\src\CompilerPasses\Parser.gbas";
								};
								__debugInfo = "210:\src\CompilerPasses\Parser.gbas";
							}
							forEachSaver13251.values[forEachCounter13251] = local1_T_ref_2138;
						
						};
						__debugInfo = "205:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "214:\src\CompilerPasses\Parser.gbas";
					if (func7_IsToken(":")) {
						__debugInfo = "214:\src\CompilerPasses\Parser.gbas";
						func5_Match(":", 213, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "214:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "215:\src\CompilerPasses\Parser.gbas";
					func5_Match("\n", 214, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "220:\src\CompilerPasses\Parser.gbas";
					var forEachSaver13317 = local3_typ_ref_2136[0].attr7_Methods;
					for(var forEachCounter13317 = 0 ; forEachCounter13317 < forEachSaver13317.values.length ; forEachCounter13317++) {
						var local2_M1_2139 = forEachSaver13317.values[forEachCounter13317];
					{
							__debugInfo = "219:\src\CompilerPasses\Parser.gbas";
							var forEachSaver13316 = local3_typ_ref_2136[0].attr7_Methods;
							for(var forEachCounter13316 = 0 ; forEachCounter13316 < forEachSaver13316.values.length ; forEachCounter13316++) {
								var local2_M2_2140 = forEachSaver13316.values[forEachCounter13316];
							{
									__debugInfo = "218:\src\CompilerPasses\Parser.gbas";
									if (((((((local2_M1_2139) !== (local2_M2_2140)) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local2_M2_2140).values[tmpPositionCache][0].attr8_Name_Str) === (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local2_M1_2139).values[tmpPositionCache][0].attr8_Name_Str)) ? 1 : 0))) ? 1 : 0)) {
										__debugInfo = "218:\src\CompilerPasses\Parser.gbas";
										func5_Error((((("Method '") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local2_M1_2139).values[tmpPositionCache][0].attr8_Name_Str))) + ("' already exists")), 217, "src\CompilerPasses\Parser.gbas");
										__debugInfo = "218:\src\CompilerPasses\Parser.gbas";
									};
									__debugInfo = "218:\src\CompilerPasses\Parser.gbas";
								}
								forEachSaver13316.values[forEachCounter13316] = local2_M2_2140;
							
							};
							__debugInfo = "219:\src\CompilerPasses\Parser.gbas";
						}
						forEachSaver13317.values[forEachCounter13317] = local2_M1_2139;
					
					};
					__debugInfo = "253:\src\CompilerPasses\Parser.gbas";
					while ((((func7_IsToken("ENDTYPE")) === (0)) ? 1 : 0)) {
						var local10_IsAbstract_2141 = 0;
						__debugInfo = "222:\src\CompilerPasses\Parser.gbas";
						local10_IsAbstract_2141 = 0;
						__debugInfo = "226:\src\CompilerPasses\Parser.gbas";
						if (func7_IsToken("ABSTRACT")) {
							__debugInfo = "224:\src\CompilerPasses\Parser.gbas";
							func5_Match("ABSTRACT", 223, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "225:\src\CompilerPasses\Parser.gbas";
							local10_IsAbstract_2141 = 1;
							__debugInfo = "224:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "247:\src\CompilerPasses\Parser.gbas";
						if (func7_IsToken("FUNCTION")) {
							__debugInfo = "233:\src\CompilerPasses\Parser.gbas";
							if (local10_IsAbstract_2141) {
								__debugInfo = "230:\src\CompilerPasses\Parser.gbas";
								func10_SkipTokens("FUNCTION", "\n", "ABSTRACT FUNCTION");
								__debugInfo = "230:\src\CompilerPasses\Parser.gbas";
							} else {
								__debugInfo = "232:\src\CompilerPasses\Parser.gbas";
								func10_SkipTokens("FUNCTION", "ENDFUNCTION", "FUNCTION IN TYPE");
								__debugInfo = "232:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "233:\src\CompilerPasses\Parser.gbas";
						} else {
							var local4_Vari_2142 = pool_TIdentifierVari.alloc();
							__debugInfo = "236:\src\CompilerPasses\Parser.gbas";
							local4_Vari_2142 = func7_VariDef(0).clone(/* In Assign */);
							__debugInfo = "243:\src\CompilerPasses\Parser.gbas";
							local4_Vari_2142.attr3_Typ = ~~(3);
							__debugInfo = "244:\src\CompilerPasses\Parser.gbas";
							func11_AddVariable(local4_Vari_2142, 1);
							__debugInfo = "245:\src\CompilerPasses\Parser.gbas";
							DIMPUSH(local3_typ_ref_2136[0].attr10_Attributes, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
							__debugInfo = "236:\src\CompilerPasses\Parser.gbas";pool_TIdentifierVari.free(local4_Vari_2142);
						};
						__debugInfo = "252:\src\CompilerPasses\Parser.gbas";
						if ((((func7_IsToken("ENDTYPE")) === (0)) ? 1 : 0)) {
							__debugInfo = "251:\src\CompilerPasses\Parser.gbas";
							func5_Match("\n", 250, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "251:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "222:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "254:\src\CompilerPasses\Parser.gbas";
					func5_Match("ENDTYPE", 253, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "255:\src\CompilerPasses\Parser.gbas";
					return 0;
					__debugInfo = "192:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "256:\src\CompilerPasses\Parser.gbas";
			}
			forEachSaver13406.values[forEachCounter13406] = local3_typ_ref_2136;
		
		};
		__debugInfo = "258:\src\CompilerPasses\Parser.gbas";
		func5_Error("Internal error (type definition for unknown type)", 257, "src\CompilerPasses\Parser.gbas");
		__debugInfo = "259:\src\CompilerPasses\Parser.gbas";
		return 0;
		__debugInfo = "189:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func8_TypeDefi = window['func8_TypeDefi'];
window['func11_CompileFunc'] = function(param4_func) {
	stackPush("function: CompileFunc", __debugInfo);
	try {
		__debugInfo = "325:\src\CompilerPasses\Parser.gbas";
		if ((((((((((param4_func.attr3_Scp) === (-(1))) ? 1 : 0)) && ((((param4_func.attr6_Native) === (0)) ? 1 : 0))) ? 1 : 0)) && ((((param4_func.attr10_PlzCompile) === (1)) ? 1 : 0))) ? 1 : 0)) {
			var local6_TmpScp_2739 = 0.0, local3_Tok_2740 = 0, local7_Curfunc_2741 = 0.0, local3_Scp_2743 = 0;
			__debugInfo = "266:\src\CompilerPasses\Parser.gbas";
			if (param4_func.attr10_IsAbstract) {
				
			};
			__debugInfo = "267:\src\CompilerPasses\Parser.gbas";
			local6_TmpScp_2739 = global8_Compiler.attr12_CurrentScope;
			__debugInfo = "268:\src\CompilerPasses\Parser.gbas";
			global8_Compiler.attr12_CurrentScope = global8_Compiler.attr9_MainScope;
			__debugInfo = "269:\src\CompilerPasses\Parser.gbas";
			local3_Tok_2740 = global8_Compiler.attr11_currentPosi;
			__debugInfo = "270:\src\CompilerPasses\Parser.gbas";
			local7_Curfunc_2741 = global8_Compiler.attr11_currentFunc;
			__debugInfo = "271:\src\CompilerPasses\Parser.gbas";
			global8_Compiler.attr11_currentFunc = param4_func.attr2_ID;
			__debugInfo = "272:\src\CompilerPasses\Parser.gbas";
			global8_Compiler.attr11_currentPosi = ((param4_func.attr3_Tok) - (1));
			__debugInfo = "273:\src\CompilerPasses\Parser.gbas";
			if (((((((param4_func.attr3_Tok) === (0)) ? 1 : 0)) && (((param4_func.attr10_IsAbstract) ? 0 : 1))) ? 1 : 0)) {
				__debugInfo = "273:\src\CompilerPasses\Parser.gbas";
				func5_Error("Internal error (function has no start token)", 272, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "273:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "286:\src\CompilerPasses\Parser.gbas";
			if ((((param4_func.attr3_Typ) === (3)) ? 1 : 0)) {
				var local4_Vari_2742 = pool_TIdentifierVari.alloc();
				__debugInfo = "278:\src\CompilerPasses\Parser.gbas";
				local4_Vari_2742.attr8_Name_Str = "self";
				__debugInfo = "279:\src\CompilerPasses\Parser.gbas";
				local4_Vari_2742.attr8_datatype.attr8_Name_Str = global8_Compiler.attr5_Types_ref[0].arrAccess(param4_func.attr6_MyType).values[tmpPositionCache][0].attr8_Name_Str;
				__debugInfo = "280:\src\CompilerPasses\Parser.gbas";
				local4_Vari_2742.attr8_datatype.attr7_IsArray = 0;
				__debugInfo = "281:\src\CompilerPasses\Parser.gbas";
				local4_Vari_2742.attr3_Typ = ~~(5);
				__debugInfo = "283:\src\CompilerPasses\Parser.gbas";
				func11_AddVariable(local4_Vari_2742, 1);
				__debugInfo = "284:\src\CompilerPasses\Parser.gbas";
				DIMPUSH(param4_func.attr6_Params, local4_Vari_2742.attr2_ID);
				__debugInfo = "285:\src\CompilerPasses\Parser.gbas";
				param4_func.attr7_SelfVar = local4_Vari_2742.attr2_ID;
				__debugInfo = "278:\src\CompilerPasses\Parser.gbas";pool_TIdentifierVari.free(local4_Vari_2742);
			};
			__debugInfo = "294:\src\CompilerPasses\Parser.gbas";
			func7_GetNext();
			__debugInfo = "309:\src\CompilerPasses\Parser.gbas";
			{
				var Err_Str = "";
				__debugInfo = "311:\src\CompilerPasses\Parser.gbas";
				try {
					__debugInfo = "308:\src\CompilerPasses\Parser.gbas";
					if (((param4_func.attr10_IsAbstract) ? 0 : 1)) {
						__debugInfo = "304:\src\CompilerPasses\Parser.gbas";
						if ((((param4_func.attr3_Typ) === (2)) ? 1 : 0)) {
							__debugInfo = "299:\src\CompilerPasses\Parser.gbas";
							local3_Scp_2743 = func5_Scope("ENDSUB", param4_func.attr2_ID);
							__debugInfo = "299:\src\CompilerPasses\Parser.gbas";
						} else {
							var local1_e_2744 = 0;
							__debugInfo = "301:\src\CompilerPasses\Parser.gbas";
							local3_Scp_2743 = func5_Scope("ENDFUNCTION", param4_func.attr2_ID);
							__debugInfo = "302:\src\CompilerPasses\Parser.gbas";
							local1_e_2744 = func22_CreateReturnExpression(func28_CreateDefaultValueExpression(param4_func.attr8_datatype));
							__debugInfo = "303:\src\CompilerPasses\Parser.gbas";
							DIMPUSH(global5_Exprs_ref[0].arrAccess(local3_Scp_2743).values[tmpPositionCache][0].attr5_Exprs, local1_e_2744);
							__debugInfo = "301:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "304:\src\CompilerPasses\Parser.gbas";
					} else {
						__debugInfo = "306:\src\CompilerPasses\Parser.gbas";
						local3_Scp_2743 = func21_CreateScopeExpression(~~(2));
						__debugInfo = "307:\src\CompilerPasses\Parser.gbas";
						DIMPUSH(global5_Exprs_ref[0].arrAccess(local3_Scp_2743).values[tmpPositionCache][0].attr5_Exprs, func21_CreateEmptyExpression());
						__debugInfo = "306:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "308:\src\CompilerPasses\Parser.gbas";
				} catch (Err_Str) {
					if (Err_Str instanceof OTTException) Err_Str = Err_Str.getText(); else throwError(Err_Str);{
						__debugInfo = "310:\src\CompilerPasses\Parser.gbas";
						local3_Scp_2743 = func21_CreateEmptyExpression();
						__debugInfo = "310:\src\CompilerPasses\Parser.gbas";
					}
				};
				__debugInfo = "311:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "316:\src\CompilerPasses\Parser.gbas";
			param4_func.attr3_Scp = local3_Scp_2743;
			__debugInfo = "318:\src\CompilerPasses\Parser.gbas";
			global8_Compiler.attr11_currentPosi = ((local3_Tok_2740) - (1));
			__debugInfo = "319:\src\CompilerPasses\Parser.gbas";
			func7_GetNext();
			__debugInfo = "320:\src\CompilerPasses\Parser.gbas";
			global8_Compiler.attr11_currentFunc = ~~(local7_Curfunc_2741);
			__debugInfo = "321:\src\CompilerPasses\Parser.gbas";
			global8_Compiler.attr12_CurrentScope = ~~(local6_TmpScp_2739);
			__debugInfo = "322:\src\CompilerPasses\Parser.gbas";
			return 1;
			__debugInfo = "266:\src\CompilerPasses\Parser.gbas";
		} else {
			__debugInfo = "324:\src\CompilerPasses\Parser.gbas";
			return tryClone(0);
			__debugInfo = "324:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "326:\src\CompilerPasses\Parser.gbas";
		return 0;
		__debugInfo = "325:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func11_CompileFunc = window['func11_CompileFunc'];
window['func10_Expression'] = function(param4_Prio) {
	stackPush("function: Expression", __debugInfo);
	try {
		__debugInfo = "360:\src\CompilerPasses\Parser.gbas";
		if ((((param4_Prio) < (15)) ? 1 : 0)) {
			var local4_Left_2144 = 0, local5_Right_2145 = 0, local5_Found_2146 = 0;
			__debugInfo = "330:\src\CompilerPasses\Parser.gbas";
			local4_Left_2144 = func10_Expression(((param4_Prio) + (1)));
			__debugInfo = "331:\src\CompilerPasses\Parser.gbas";
			local5_Right_2145 = -(1);
			__debugInfo = "333:\src\CompilerPasses\Parser.gbas";
			local5_Found_2146 = 0;
			__debugInfo = "355:\src\CompilerPasses\Parser.gbas";
			do {
				__debugInfo = "335:\src\CompilerPasses\Parser.gbas";
				local5_Found_2146 = 0;
				__debugInfo = "354:\src\CompilerPasses\Parser.gbas";
				var forEachSaver13509 = global9_Operators_ref[0];
				for(var forEachCounter13509 = 0 ; forEachCounter13509 < forEachSaver13509.values.length ; forEachCounter13509++) {
					var local2_Op_ref_2147 = forEachSaver13509.values[forEachCounter13509];
				{
						__debugInfo = "353:\src\CompilerPasses\Parser.gbas";
						while (((((((local2_Op_ref_2147[0].attr4_Prio) === (param4_Prio)) ? 1 : 0)) && (func7_IsToken(local2_Op_ref_2147[0].attr7_Sym_Str))) ? 1 : 0)) {
							__debugInfo = "338:\src\CompilerPasses\Parser.gbas";
							func5_Match(local2_Op_ref_2147[0].attr7_Sym_Str, 337, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "339:\src\CompilerPasses\Parser.gbas";
							local5_Right_2145 = func10_Expression(((param4_Prio) + (1)));
							__debugInfo = "340:\src\CompilerPasses\Parser.gbas";
							local4_Left_2144 = func24_CreateOperatorExpression(unref(local2_Op_ref_2147[0]), local4_Left_2144, local5_Right_2145);
							__debugInfo = "348:\src\CompilerPasses\Parser.gbas";
							{
								var Error_Str = "";
								__debugInfo = "350:\src\CompilerPasses\Parser.gbas";
								try {
									var local6_Result_2148 = 0.0;
									__debugInfo = "342:\src\CompilerPasses\Parser.gbas";
									local6_Result_2148 = func13_CalculateTree(unref(global5_Exprs_ref[0].arrAccess(local4_Left_2144).values[tmpPositionCache][0]));
									__debugInfo = "347:\src\CompilerPasses\Parser.gbas";
									if ((((INTEGER(local6_Result_2148)) === (local6_Result_2148)) ? 1 : 0)) {
										__debugInfo = "344:\src\CompilerPasses\Parser.gbas";
										local4_Left_2144 = func19_CreateIntExpression(~~(local6_Result_2148));
										__debugInfo = "344:\src\CompilerPasses\Parser.gbas";
									} else {
										__debugInfo = "346:\src\CompilerPasses\Parser.gbas";
										local5_Right_2145 = func21_CreateFloatExpression(local6_Result_2148);
										__debugInfo = "346:\src\CompilerPasses\Parser.gbas";
									};
									__debugInfo = "342:\src\CompilerPasses\Parser.gbas";
								} catch (Error_Str) {
									if (Error_Str instanceof OTTException) Error_Str = Error_Str.getText(); else throwError(Error_Str);{
										
									}
								};
								__debugInfo = "350:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "351:\src\CompilerPasses\Parser.gbas";
							local5_Found_2146 = 1;
							__debugInfo = "352:\src\CompilerPasses\Parser.gbas";
							break;
							__debugInfo = "338:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "353:\src\CompilerPasses\Parser.gbas";
					}
					forEachSaver13509.values[forEachCounter13509] = local2_Op_ref_2147;
				
				};
				__debugInfo = "335:\src\CompilerPasses\Parser.gbas";
			} while (!((((local5_Found_2146) === (0)) ? 1 : 0)));
			__debugInfo = "357:\src\CompilerPasses\Parser.gbas";
			return tryClone(local4_Left_2144);
			__debugInfo = "330:\src\CompilerPasses\Parser.gbas";
		} else {
			__debugInfo = "359:\src\CompilerPasses\Parser.gbas";
			return tryClone(func6_Factor());
			__debugInfo = "359:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "361:\src\CompilerPasses\Parser.gbas";
		return 0;
		__debugInfo = "360:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func10_Expression = window['func10_Expression'];
window['func12_CastDatatype'] = function(param8_RetData1_ref, param8_RetData2_ref) {
	stackPush("function: CastDatatype", __debugInfo);
	try {
		var local5_Data1_2748 = 0, local5_Data2_2749 = 0;
		__debugInfo = "365:\src\CompilerPasses\Parser.gbas";
		local5_Data1_2748 = param8_RetData1_ref[0];
		__debugInfo = "366:\src\CompilerPasses\Parser.gbas";
		local5_Data2_2749 = param8_RetData2_ref[0];
		__debugInfo = "390:\src\CompilerPasses\Parser.gbas";
		if ((((global5_Exprs_ref[0].arrAccess(local5_Data1_2748).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (global5_Exprs_ref[0].arrAccess(local5_Data2_2749).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray)) ? 1 : 0)) {
			__debugInfo = "387:\src\CompilerPasses\Parser.gbas";
			if ((((global5_Exprs_ref[0].arrAccess(local5_Data1_2748).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === (global5_Exprs_ref[0].arrAccess(local5_Data2_2749).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str)) ? 1 : 0)) {
				__debugInfo = "370:\src\CompilerPasses\Parser.gbas";
				param8_RetData1_ref[0] = local5_Data1_2748;
				__debugInfo = "371:\src\CompilerPasses\Parser.gbas";
				param8_RetData2_ref[0] = local5_Data2_2749;
				__debugInfo = "372:\src\CompilerPasses\Parser.gbas";
				return tryClone(global5_Exprs_ref[0].arrAccess(param8_RetData1_ref[0]).values[tmpPositionCache][0].attr8_datatype);
				__debugInfo = "370:\src\CompilerPasses\Parser.gbas";
			} else {
				__debugInfo = "384:\src\CompilerPasses\Parser.gbas";
				if ((((global5_Exprs_ref[0].arrAccess(local5_Data1_2748).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("string")) ? 1 : 0)) {
					__debugInfo = "375:\src\CompilerPasses\Parser.gbas";
					param8_RetData2_ref[0] = func27_CreateCast2StringExpression(local5_Data2_2749);
					__debugInfo = "375:\src\CompilerPasses\Parser.gbas";
				} else if ((((global5_Exprs_ref[0].arrAccess(local5_Data2_2749).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("string")) ? 1 : 0)) {
					__debugInfo = "377:\src\CompilerPasses\Parser.gbas";
					param8_RetData1_ref[0] = func27_CreateCast2StringExpression(local5_Data1_2748);
					__debugInfo = "377:\src\CompilerPasses\Parser.gbas";
				} else if ((((global5_Exprs_ref[0].arrAccess(local5_Data1_2748).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("float")) ? 1 : 0)) {
					__debugInfo = "379:\src\CompilerPasses\Parser.gbas";
					param8_RetData2_ref[0] = func26_CreateCast2FloatExpression(local5_Data2_2749);
					__debugInfo = "379:\src\CompilerPasses\Parser.gbas";
				} else if ((((global5_Exprs_ref[0].arrAccess(local5_Data2_2749).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("float")) ? 1 : 0)) {
					__debugInfo = "381:\src\CompilerPasses\Parser.gbas";
					param8_RetData1_ref[0] = func26_CreateCast2FloatExpression(local5_Data1_2748);
					__debugInfo = "381:\src\CompilerPasses\Parser.gbas";
				} else {
					__debugInfo = "383:\src\CompilerPasses\Parser.gbas";
					func5_Error((((((((((((("Cannot cast '") + (global5_Exprs_ref[0].arrAccess(local5_Data1_2748).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) + (func20_BuildArrBrackets_Str(global5_Exprs_ref[0].arrAccess(local5_Data1_2748).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray)))) + ("' to '"))) + (global5_Exprs_ref[0].arrAccess(local5_Data2_2749).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) + (func20_BuildArrBrackets_Str(global5_Exprs_ref[0].arrAccess(local5_Data2_2749).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray)))) + ("'")), 382, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "383:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "386:\src\CompilerPasses\Parser.gbas";
				return tryClone(global5_Exprs_ref[0].arrAccess(param8_RetData1_ref[0]).values[tmpPositionCache][0].attr8_datatype);
				__debugInfo = "384:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "387:\src\CompilerPasses\Parser.gbas";
		} else {
			__debugInfo = "389:\src\CompilerPasses\Parser.gbas";
			func5_Error((((((((((("Dimensions are different: ") + (global5_Exprs_ref[0].arrAccess(local5_Data1_2748).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) + (func20_BuildArrBrackets_Str(global5_Exprs_ref[0].arrAccess(local5_Data1_2748).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray)))) + (", "))) + (global5_Exprs_ref[0].arrAccess(local5_Data2_2749).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) + (func20_BuildArrBrackets_Str(global5_Exprs_ref[0].arrAccess(local5_Data2_2749).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray))), 388, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "389:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "391:\src\CompilerPasses\Parser.gbas";
		return tryClone(unref(pool_TDatatype.alloc()));
		__debugInfo = "365:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func12_CastDatatype = window['func12_CastDatatype'];
window['func14_EnsureDatatype'] = function(param4_Expr, param8_NeedData, param4_Line, param6_Strict) {
	stackPush("function: EnsureDatatype", __debugInfo);
	try {
		var local6_myData_2154 = pool_TDatatype.alloc();
		__debugInfo = "399:\src\CompilerPasses\Parser.gbas";
		param6_Strict = 0;
		__debugInfo = "402:\src\CompilerPasses\Parser.gbas";
		if ((((param8_NeedData.attr8_Name_Str) === ("")) ? 1 : 0)) {
			__debugInfo = "402:\src\CompilerPasses\Parser.gbas";
			func5_Error("Internal error (datatype is empty)", 401, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "402:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "404:\src\CompilerPasses\Parser.gbas";
		local6_myData_2154 = global5_Exprs_ref[0].arrAccess(param4_Expr).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
		__debugInfo = "463:\src\CompilerPasses\Parser.gbas";
		if (((((((local6_myData_2154.attr8_Name_Str) === (param8_NeedData.attr8_Name_Str)) ? 1 : 0)) && ((((local6_myData_2154.attr7_IsArray) === (param8_NeedData.attr7_IsArray)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "406:\src\CompilerPasses\Parser.gbas";
			return tryClone(param4_Expr);
			__debugInfo = "406:\src\CompilerPasses\Parser.gbas";
		} else {
			var local5_func1_2156 = 0, local5_func2_2157 = 0, local7_add_Str_2160 = "";
			__debugInfo = "423:\src\CompilerPasses\Parser.gbas";
			if ((((param6_Strict) === (0)) ? 1 : 0)) {
				__debugInfo = "422:\src\CompilerPasses\Parser.gbas";
				if ((((local6_myData_2154.attr7_IsArray) === (param8_NeedData.attr7_IsArray)) ? 1 : 0)) {
					__debugInfo = "421:\src\CompilerPasses\Parser.gbas";
					if ((((((((((local6_myData_2154.attr8_Name_Str) === ("int")) ? 1 : 0)) || ((((local6_myData_2154.attr8_Name_Str) === ("float")) ? 1 : 0))) ? 1 : 0)) || ((((local6_myData_2154.attr8_Name_Str) === ("string")) ? 1 : 0))) ? 1 : 0)) {
						__debugInfo = "420:\src\CompilerPasses\Parser.gbas";
						if ((((((((((param8_NeedData.attr8_Name_Str) === ("int")) ? 1 : 0)) || ((((param8_NeedData.attr8_Name_Str) === ("float")) ? 1 : 0))) ? 1 : 0)) || ((((param8_NeedData.attr8_Name_Str) === ("string")) ? 1 : 0))) ? 1 : 0)) {
							__debugInfo = "412:\src\CompilerPasses\Parser.gbas";
							{
								var local17___SelectHelper21__2155 = "";
								__debugInfo = "412:\src\CompilerPasses\Parser.gbas";
								local17___SelectHelper21__2155 = param8_NeedData.attr8_Name_Str;
								__debugInfo = "419:\src\CompilerPasses\Parser.gbas";
								if ((((local17___SelectHelper21__2155) === ("int")) ? 1 : 0)) {
									__debugInfo = "414:\src\CompilerPasses\Parser.gbas";
									return tryClone(func24_CreateCast2IntExpression(param4_Expr));
									__debugInfo = "414:\src\CompilerPasses\Parser.gbas";
								} else if ((((local17___SelectHelper21__2155) === ("float")) ? 1 : 0)) {
									__debugInfo = "416:\src\CompilerPasses\Parser.gbas";
									return tryClone(func26_CreateCast2FloatExpression(param4_Expr));
									__debugInfo = "416:\src\CompilerPasses\Parser.gbas";
								} else if ((((local17___SelectHelper21__2155) === ("string")) ? 1 : 0)) {
									__debugInfo = "418:\src\CompilerPasses\Parser.gbas";
									return tryClone(func27_CreateCast2StringExpression(param4_Expr));
									__debugInfo = "418:\src\CompilerPasses\Parser.gbas";
								};
								__debugInfo = "412:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "412:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "420:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "421:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "422:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "425:\src\CompilerPasses\Parser.gbas";
			local5_func1_2156 = func14_SearchPrototyp(local6_myData_2154.attr8_Name_Str);
			__debugInfo = "426:\src\CompilerPasses\Parser.gbas";
			local5_func2_2157 = func14_SearchPrototyp(param8_NeedData.attr8_Name_Str);
			__debugInfo = "451:\src\CompilerPasses\Parser.gbas";
			if ((((local5_func1_2156) !== (-(1))) ? 1 : 0)) {
				__debugInfo = "450:\src\CompilerPasses\Parser.gbas";
				if ((((local5_func2_2157) !== (-(1))) ? 1 : 0)) {
					var local7_checker_2158 = pool_TProtoChecker.alloc();
					__debugInfo = "429:\src\CompilerPasses\Parser.gbas";
					if ((((local6_myData_2154.attr7_IsArray) || (param8_NeedData.attr7_IsArray)) ? 1 : 0)) {
						__debugInfo = "429:\src\CompilerPasses\Parser.gbas";
						func5_Error("PROTOTYPE cannot be an array.", 428, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "429:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "432:\src\CompilerPasses\Parser.gbas";
					local7_checker_2158.attr8_fromFunc = global8_Compiler.attr5_Funcs_ref[0].arrAccess(local5_func1_2156).values[tmpPositionCache][0].attr2_ID;
					__debugInfo = "433:\src\CompilerPasses\Parser.gbas";
					local7_checker_2158.attr6_toFunc = global8_Compiler.attr5_Funcs_ref[0].arrAccess(local5_func2_2157).values[tmpPositionCache][0].attr2_ID;
					__debugInfo = "434:\src\CompilerPasses\Parser.gbas";
					local7_checker_2158.attr3_Tok = func15_GetCurrentToken().clone(/* In Assign */);
					__debugInfo = "435:\src\CompilerPasses\Parser.gbas";
					DIMPUSH(global8_Compiler.attr13_protoCheckers, local7_checker_2158);
					__debugInfo = "437:\src\CompilerPasses\Parser.gbas";
					return tryClone(param4_Expr);
					__debugInfo = "429:\src\CompilerPasses\Parser.gbas";pool_TProtoChecker.free(local7_checker_2158);
				} else {
					__debugInfo = "449:\src\CompilerPasses\Parser.gbas";
					if (((((((((((((param8_NeedData.attr8_Name_Str) === ("int")) ? 1 : 0)) || ((((param8_NeedData.attr8_Name_Str) === ("float")) ? 1 : 0))) ? 1 : 0)) || ((((param8_NeedData.attr8_Name_Str) === ("string")) ? 1 : 0))) ? 1 : 0)) && ((((param8_NeedData.attr7_IsArray) === (0)) ? 1 : 0))) ? 1 : 0)) {
						__debugInfo = "441:\src\CompilerPasses\Parser.gbas";
						{
							var local17___SelectHelper22__2159 = "";
							__debugInfo = "441:\src\CompilerPasses\Parser.gbas";
							local17___SelectHelper22__2159 = param8_NeedData.attr8_Name_Str;
							__debugInfo = "448:\src\CompilerPasses\Parser.gbas";
							if ((((local17___SelectHelper22__2159) === ("int")) ? 1 : 0)) {
								__debugInfo = "443:\src\CompilerPasses\Parser.gbas";
								return tryClone(func24_CreateCast2IntExpression(param4_Expr));
								__debugInfo = "443:\src\CompilerPasses\Parser.gbas";
							} else if ((((local17___SelectHelper22__2159) === ("float")) ? 1 : 0)) {
								__debugInfo = "445:\src\CompilerPasses\Parser.gbas";
								return tryClone(func26_CreateCast2FloatExpression(param4_Expr));
								__debugInfo = "445:\src\CompilerPasses\Parser.gbas";
							} else if ((((local17___SelectHelper22__2159) === ("string")) ? 1 : 0)) {
								__debugInfo = "447:\src\CompilerPasses\Parser.gbas";
								return tryClone(func27_CreateCast2StringExpression(param4_Expr));
								__debugInfo = "447:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "441:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "441:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "449:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "450:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "456:\src\CompilerPasses\Parser.gbas";
			if ((((func6_IsType(local6_myData_2154.attr8_Name_Str)) && (func6_IsType(param8_NeedData.attr8_Name_Str))) ? 1 : 0)) {
				__debugInfo = "455:\src\CompilerPasses\Parser.gbas";
				return tryClone(param4_Expr);
				__debugInfo = "455:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "458:\src\CompilerPasses\Parser.gbas";
			local7_add_Str_2160 = "";
			__debugInfo = "461:\src\CompilerPasses\Parser.gbas";
			if (param6_Strict) {
				__debugInfo = "460:\src\CompilerPasses\Parser.gbas";
				local7_add_Str_2160 = " , and maybe can't cast, because it is BYREF (screw you BYREF >:O)!!";
				__debugInfo = "460:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "462:\src\CompilerPasses\Parser.gbas";
			func5_Error((((((((((((((("Cannot cast datatypes. Needs '") + (param8_NeedData.attr8_Name_Str))) + (func20_BuildArrBrackets_Str(param8_NeedData.attr7_IsArray)))) + ("', got '"))) + (local6_myData_2154.attr8_Name_Str))) + (func20_BuildArrBrackets_Str(local6_myData_2154.attr7_IsArray)))) + ("'"))) + (local7_add_Str_2160)), param4_Line, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "423:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "464:\src\CompilerPasses\Parser.gbas";
		return 0;
		__debugInfo = "399:\src\CompilerPasses\Parser.gbas";pool_TDatatype.free(local6_myData_2154);
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func14_EnsureDatatype = window['func14_EnsureDatatype'];
window['func20_BuildArrBrackets_Str'] = function(param7_IsArray) {
	stackPush("function: BuildArrBrackets_Str", __debugInfo);
	try {
		__debugInfo = "471:\src\CompilerPasses\Parser.gbas";
		if (param7_IsArray) {
			__debugInfo = "468:\src\CompilerPasses\Parser.gbas";
			return "[]";
			__debugInfo = "468:\src\CompilerPasses\Parser.gbas";
		} else {
			__debugInfo = "470:\src\CompilerPasses\Parser.gbas";
			return "";
			__debugInfo = "470:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "472:\src\CompilerPasses\Parser.gbas";
		return "";
		__debugInfo = "471:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func20_BuildArrBrackets_Str = window['func20_BuildArrBrackets_Str'];
window['func7_Hex2Dec'] = function(param10_hexStr_Str) {
	stackPush("function: Hex2Dec", __debugInfo);
	try {
		var local1_i_2751 = 0, local1_j_2752 = 0, local4_loop_2753 = 0;
		__debugInfo = "481:\src\CompilerPasses\Parser.gbas";
		local1_i_2751 = 0;
		__debugInfo = "482:\src\CompilerPasses\Parser.gbas";
		local1_j_2752 = 0;
		__debugInfo = "482:\src\CompilerPasses\Parser.gbas";
		{
			__debugInfo = "491:\src\CompilerPasses\Parser.gbas";
			for (local4_loop_2753 = 0;toCheck(local4_loop_2753, (((param10_hexStr_Str).length) - (1)), 1);local4_loop_2753 += 1) {
				__debugInfo = "484:\src\CompilerPasses\Parser.gbas";
				local1_i_2751 = ((ASC(MID_Str(param10_hexStr_Str, local4_loop_2753, 1), 0)) - (48));
				__debugInfo = "487:\src\CompilerPasses\Parser.gbas";
				if ((((9) < (local1_i_2751)) ? 1 : 0)) {
					__debugInfo = "486:\src\CompilerPasses\Parser.gbas";
					local1_i_2751+=-(7);
					__debugInfo = "486:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "489:\src\CompilerPasses\Parser.gbas";
				local1_j_2752 = ((local1_j_2752) * (16));
				__debugInfo = "490:\src\CompilerPasses\Parser.gbas";
				local1_j_2752 = bOR(local1_j_2752, bAND(local1_i_2751, 15));
				__debugInfo = "484:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "491:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "493:\src\CompilerPasses\Parser.gbas";
		return tryClone(local1_j_2752);
		__debugInfo = "494:\src\CompilerPasses\Parser.gbas";
		return 0;
		__debugInfo = "481:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func7_Hex2Dec = window['func7_Hex2Dec'];
window['func6_Factor'] = function() {
	stackPush("function: Factor", __debugInfo);
	try {
		__debugInfo = "727:\src\CompilerPasses\Parser.gbas";
		if (func7_IsToken("(")) {
			var local4_Expr_2162 = 0;
			__debugInfo = "499:\src\CompilerPasses\Parser.gbas";
			func5_Match("(", 498, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "500:\src\CompilerPasses\Parser.gbas";
			local4_Expr_2162 = func10_Expression(0);
			__debugInfo = "501:\src\CompilerPasses\Parser.gbas";
			func5_Match(")", 500, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "502:\src\CompilerPasses\Parser.gbas";
			return tryClone(local4_Expr_2162);
			__debugInfo = "499:\src\CompilerPasses\Parser.gbas";
		} else if (func12_IsIdentifier(1, 0)) {
			__debugInfo = "504:\src\CompilerPasses\Parser.gbas";
			return tryClone(func10_Identifier(0));
			__debugInfo = "504:\src\CompilerPasses\Parser.gbas";
		} else if (func8_IsString()) {
			var local7_Str_Str_2163 = "";
			__debugInfo = "506:\src\CompilerPasses\Parser.gbas";
			local7_Str_Str_2163 = func14_GetCurrent_Str();
			__debugInfo = "510:\src\CompilerPasses\Parser.gbas";
			if ((((INSTR(local7_Str_Str_2163, "\n", 0)) !== (-(1))) ? 1 : 0)) {
				__debugInfo = "509:\src\CompilerPasses\Parser.gbas";
				func5_Error("Expecting '\"'", 508, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "509:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "511:\src\CompilerPasses\Parser.gbas";
			func7_GetNext();
			__debugInfo = "512:\src\CompilerPasses\Parser.gbas";
			return tryClone(func19_CreateStrExpression(local7_Str_Str_2163));
			__debugInfo = "506:\src\CompilerPasses\Parser.gbas";
		} else if ((((MID_Str(func14_GetCurrent_Str(), 0, 2)) === ("0x")) ? 1 : 0)) {
			var local7_hex_Str_2164 = "";
			__debugInfo = "514:\src\CompilerPasses\Parser.gbas";
			local7_hex_Str_2164 = MID_Str(func14_GetCurrent_Str(), 2, -(1));
			__debugInfo = "515:\src\CompilerPasses\Parser.gbas";
			func7_GetNext();
			__debugInfo = "516:\src\CompilerPasses\Parser.gbas";
			return tryClone(func19_CreateIntExpression(func7_Hex2Dec(local7_hex_Str_2164)));
			__debugInfo = "514:\src\CompilerPasses\Parser.gbas";
		} else if ((((func8_IsNumber()) || (func7_IsToken("."))) ? 1 : 0)) {
			var local3_Num_2165 = 0, local12_hasToHaveNum_2166 = 0;
			__debugInfo = "519:\src\CompilerPasses\Parser.gbas";
			local12_hasToHaveNum_2166 = 0;
			__debugInfo = "526:\src\CompilerPasses\Parser.gbas";
			if (func7_IsToken(".")) {
				__debugInfo = "521:\src\CompilerPasses\Parser.gbas";
				local3_Num_2165 = 0;
				__debugInfo = "522:\src\CompilerPasses\Parser.gbas";
				local12_hasToHaveNum_2166 = 1;
				__debugInfo = "521:\src\CompilerPasses\Parser.gbas";
			} else {
				__debugInfo = "524:\src\CompilerPasses\Parser.gbas";
				local3_Num_2165 = INT2STR(func14_GetCurrent_Str());
				__debugInfo = "525:\src\CompilerPasses\Parser.gbas";
				func7_GetNext();
				__debugInfo = "524:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "544:\src\CompilerPasses\Parser.gbas";
			if (func7_IsToken(".")) {
				var local4_Num2_2167 = 0, local3_pos_2168 = 0, local4_FNum_2169 = 0.0;
				__debugInfo = "529:\src\CompilerPasses\Parser.gbas";
				func5_Match(".", 528, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "530:\src\CompilerPasses\Parser.gbas";
				local4_Num2_2167 = INT2STR(func14_GetCurrent_Str());
				__debugInfo = "531:\src\CompilerPasses\Parser.gbas";
				local3_pos_2168 = global8_Compiler.attr11_currentPosi;
				__debugInfo = "537:\src\CompilerPasses\Parser.gbas";
				if (func8_IsNumber()) {
					__debugInfo = "534:\src\CompilerPasses\Parser.gbas";
					func7_GetNext();
					__debugInfo = "534:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "538:\src\CompilerPasses\Parser.gbas";
				local4_FNum_2169 = FLOAT2STR(((((((CAST2STRING(local3_Num_2165)) + ("."))) + (CAST2STRING(local4_Num2_2167)))) + (CAST2STRING(0))));
				__debugInfo = "540:\src\CompilerPasses\Parser.gbas";
				return tryClone(func21_CreateFloatExpression(local4_FNum_2169));
				__debugInfo = "529:\src\CompilerPasses\Parser.gbas";
			} else {
				__debugInfo = "542:\src\CompilerPasses\Parser.gbas";
				if (local12_hasToHaveNum_2166) {
					__debugInfo = "542:\src\CompilerPasses\Parser.gbas";
					func5_Error("Expecting number!", 541, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "542:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "543:\src\CompilerPasses\Parser.gbas";
				return tryClone(func19_CreateIntExpression(local3_Num_2165));
				__debugInfo = "542:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "519:\src\CompilerPasses\Parser.gbas";
		} else if (func7_IsToken("-")) {
			var local4_Expr_2170 = 0, alias2_Op_ref_2171 = [pool_TOperator.alloc()], local7_tmpData_2172 = pool_TDatatype.alloc();
			__debugInfo = "546:\src\CompilerPasses\Parser.gbas";
			func5_Match("-", 545, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "547:\src\CompilerPasses\Parser.gbas";
			local4_Expr_2170 = func6_Factor();
			__debugInfo = "548:\src\CompilerPasses\Parser.gbas";
			alias2_Op_ref_2171 = global9_Operators_ref[0].arrAccess(func14_SearchOperator("sub")).values[tmpPositionCache] /* ALIAS */;
			__debugInfo = "550:\src\CompilerPasses\Parser.gbas";
			local7_tmpData_2172 = global5_Exprs_ref[0].arrAccess(local4_Expr_2170).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
			__debugInfo = "551:\src\CompilerPasses\Parser.gbas";
			local7_tmpData_2172.attr7_IsArray = 0;
			__debugInfo = "553:\src\CompilerPasses\Parser.gbas";
			local4_Expr_2170 = func14_EnsureDatatype(local4_Expr_2170, local7_tmpData_2172, 552, 0);
			__debugInfo = "560:\src\CompilerPasses\Parser.gbas";
			if ((((global5_Exprs_ref[0].arrAccess(local4_Expr_2170).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("float")) ? 1 : 0)) {
				__debugInfo = "555:\src\CompilerPasses\Parser.gbas";
				local4_Expr_2170 = func24_CreateOperatorExpression(unref(alias2_Op_ref_2171[0]), func21_CreateFloatExpression(0), func14_EnsureDatatype(local4_Expr_2170, global13_floatDatatype, 554, 0));
				__debugInfo = "555:\src\CompilerPasses\Parser.gbas";
			} else if (((((((global5_Exprs_ref[0].arrAccess(local4_Expr_2170).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("int")) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(local4_Expr_2170).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("string")) ? 1 : 0))) ? 1 : 0)) {
				__debugInfo = "557:\src\CompilerPasses\Parser.gbas";
				local4_Expr_2170 = func24_CreateOperatorExpression(unref(alias2_Op_ref_2171[0]), func19_CreateIntExpression(0), func14_EnsureDatatype(local4_Expr_2170, global11_intDatatype, 556, 0));
				__debugInfo = "557:\src\CompilerPasses\Parser.gbas";
			} else {
				__debugInfo = "559:\src\CompilerPasses\Parser.gbas";
				func5_Error((((("Unexpected datatype, expecting 'float/int' got '") + (global5_Exprs_ref[0].arrAccess(local4_Expr_2170).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) + ("'")), 558, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "559:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "561:\src\CompilerPasses\Parser.gbas";
			return tryClone(local4_Expr_2170);
			__debugInfo = "546:\src\CompilerPasses\Parser.gbas";pool_TOperator.free(alias2_Op_ref_2171);pool_TDatatype.free(local7_tmpData_2172);
		} else if (func7_IsToken("TRUE")) {
			__debugInfo = "563:\src\CompilerPasses\Parser.gbas";
			func5_Match("TRUE", 562, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "564:\src\CompilerPasses\Parser.gbas";
			return tryClone(func19_CreateIntExpression(1));
			__debugInfo = "563:\src\CompilerPasses\Parser.gbas";
		} else if (func7_IsToken("FALSE")) {
			__debugInfo = "566:\src\CompilerPasses\Parser.gbas";
			func5_Match("FALSE", 565, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "567:\src\CompilerPasses\Parser.gbas";
			return tryClone(func21_CreateFloatExpression(0));
			__debugInfo = "566:\src\CompilerPasses\Parser.gbas";
		} else if (func7_IsToken("CODELINE")) {
			__debugInfo = "569:\src\CompilerPasses\Parser.gbas";
			func5_Match("CODELINE", 568, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "570:\src\CompilerPasses\Parser.gbas";
			func5_Match("(", 569, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "571:\src\CompilerPasses\Parser.gbas";
			func5_Match(")", 570, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "572:\src\CompilerPasses\Parser.gbas";
			return tryClone(func19_CreateIntExpression(global8_Compiler.attr6_Tokens.arrAccess(global8_Compiler.attr11_currentPosi).values[tmpPositionCache].attr4_Line));
			__debugInfo = "569:\src\CompilerPasses\Parser.gbas";
		} else if (func7_IsToken("CODEFILE$")) {
			__debugInfo = "574:\src\CompilerPasses\Parser.gbas";
			func5_Match("CODEFILE$", 573, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "575:\src\CompilerPasses\Parser.gbas";
			func5_Match("(", 574, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "576:\src\CompilerPasses\Parser.gbas";
			func5_Match(")", 575, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "577:\src\CompilerPasses\Parser.gbas";
			return tryClone(func19_CreateStrExpression((((("\"") + (MID_Str(global8_Compiler.attr6_Tokens.arrAccess(global8_Compiler.attr11_currentPosi).values[tmpPositionCache].attr8_Path_Str, 1, -(1))))) + ("\""))));
			__debugInfo = "574:\src\CompilerPasses\Parser.gbas";
		} else if (func7_IsToken("LEN")) {
			var local4_Expr_2173 = 0, local7_Kerning_2174 = 0;
			__debugInfo = "579:\src\CompilerPasses\Parser.gbas";
			func5_Match("LEN", 578, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "580:\src\CompilerPasses\Parser.gbas";
			func5_Match("(", 579, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "582:\src\CompilerPasses\Parser.gbas";
			local4_Expr_2173 = func10_Expression(0);
			__debugInfo = "583:\src\CompilerPasses\Parser.gbas";
			local7_Kerning_2174 = 0;
			__debugInfo = "607:\src\CompilerPasses\Parser.gbas";
			if (func7_IsToken(",")) {
				__debugInfo = "585:\src\CompilerPasses\Parser.gbas";
				func5_Match(",", 584, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "586:\src\CompilerPasses\Parser.gbas";
				local7_Kerning_2174 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 585, 0);
				__debugInfo = "587:\src\CompilerPasses\Parser.gbas";
				func5_Match(")", 586, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "590:\src\CompilerPasses\Parser.gbas";
				local4_Expr_2173 = func14_EnsureDatatype(local4_Expr_2173, global11_strDatatype, 589, 0);
				__debugInfo = "592:\src\CompilerPasses\Parser.gbas";
				return tryClone(func19_CreateLenExpression(local4_Expr_2173, local7_Kerning_2174));
				__debugInfo = "585:\src\CompilerPasses\Parser.gbas";
			} else {
				__debugInfo = "594:\src\CompilerPasses\Parser.gbas";
				func5_Match(")", 593, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "606:\src\CompilerPasses\Parser.gbas";
				if ((((global5_Exprs_ref[0].arrAccess(local4_Expr_2173).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0)) {
					__debugInfo = "603:\src\CompilerPasses\Parser.gbas";
					if ((((((((((global5_Exprs_ref[0].arrAccess(local4_Expr_2173).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("int")) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(local4_Expr_2173).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("float")) ? 1 : 0))) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(local4_Expr_2173).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("string")) ? 1 : 0))) ? 1 : 0)) {
						__debugInfo = "598:\src\CompilerPasses\Parser.gbas";
						local4_Expr_2173 = func14_EnsureDatatype(local4_Expr_2173, global11_strDatatype, 597, 0);
						__debugInfo = "600:\src\CompilerPasses\Parser.gbas";
						return tryClone(func19_CreateLenExpression(local4_Expr_2173, -(1)));
						__debugInfo = "598:\src\CompilerPasses\Parser.gbas";
					} else {
						__debugInfo = "602:\src\CompilerPasses\Parser.gbas";
						func5_Error((((("Cannot get the length of Type '") + (global5_Exprs_ref[0].arrAccess(local4_Expr_2173).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) + ("'")), 601, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "602:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "603:\src\CompilerPasses\Parser.gbas";
				} else {
					__debugInfo = "605:\src\CompilerPasses\Parser.gbas";
					return tryClone(func21_CreateBoundExpression(local4_Expr_2173, func19_CreateIntExpression(0)));
					__debugInfo = "605:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "594:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "579:\src\CompilerPasses\Parser.gbas";
		} else if (func7_IsToken("BOUNDS")) {
			var local4_Expr_2175 = 0, local9_Dimension_2176 = 0;
			__debugInfo = "609:\src\CompilerPasses\Parser.gbas";
			func5_Match("BOUNDS", 608, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "610:\src\CompilerPasses\Parser.gbas";
			func5_Match("(", 609, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "611:\src\CompilerPasses\Parser.gbas";
			local4_Expr_2175 = func10_Expression(0);
			__debugInfo = "612:\src\CompilerPasses\Parser.gbas";
			func5_Match(",", 611, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "613:\src\CompilerPasses\Parser.gbas";
			if ((((global5_Exprs_ref[0].arrAccess(local4_Expr_2175).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0)) {
				__debugInfo = "613:\src\CompilerPasses\Parser.gbas";
				func5_Error("BOUNDS needs array!", 612, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "613:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "614:\src\CompilerPasses\Parser.gbas";
			local9_Dimension_2176 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 613, 0);
			__debugInfo = "615:\src\CompilerPasses\Parser.gbas";
			func5_Match(")", 614, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "617:\src\CompilerPasses\Parser.gbas";
			return tryClone(func21_CreateBoundExpression(local4_Expr_2175, local9_Dimension_2176));
			__debugInfo = "609:\src\CompilerPasses\Parser.gbas";
		} else if (func7_IsToken("ADDRESSOF")) {
			var local8_Name_Str_2177 = "", local6_MyFunc_2178 = 0;
			__debugInfo = "619:\src\CompilerPasses\Parser.gbas";
			func5_Match("ADDRESSOF", 618, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "620:\src\CompilerPasses\Parser.gbas";
			func5_Match("(", 619, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "621:\src\CompilerPasses\Parser.gbas";
			local8_Name_Str_2177 = func14_GetCurrent_Str();
			__debugInfo = "622:\src\CompilerPasses\Parser.gbas";
			local6_MyFunc_2178 = -(1);
			__debugInfo = "628:\src\CompilerPasses\Parser.gbas";
			var forEachSaver14427 = global8_Compiler.attr5_Funcs_ref[0];
			for(var forEachCounter14427 = 0 ; forEachCounter14427 < forEachSaver14427.values.length ; forEachCounter14427++) {
				var local4_Func_ref_2179 = forEachSaver14427.values[forEachCounter14427];
			{
					__debugInfo = "627:\src\CompilerPasses\Parser.gbas";
					if ((((((((((local4_Func_ref_2179[0].attr3_Typ) === (1)) ? 1 : 0)) || ((((local4_Func_ref_2179[0].attr3_Typ) === (2)) ? 1 : 0))) ? 1 : 0)) && ((((local4_Func_ref_2179[0].attr8_Name_Str) === (local8_Name_Str_2177)) ? 1 : 0))) ? 1 : 0)) {
						__debugInfo = "625:\src\CompilerPasses\Parser.gbas";
						local6_MyFunc_2178 = local4_Func_ref_2179[0].attr2_ID;
						__debugInfo = "626:\src\CompilerPasses\Parser.gbas";
						break;
						__debugInfo = "625:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "627:\src\CompilerPasses\Parser.gbas";
				}
				forEachSaver14427.values[forEachCounter14427] = local4_Func_ref_2179;
			
			};
			__debugInfo = "629:\src\CompilerPasses\Parser.gbas";
			if ((((local6_MyFunc_2178) === (-(1))) ? 1 : 0)) {
				__debugInfo = "629:\src\CompilerPasses\Parser.gbas";
				func5_Error((((("Function '") + (local8_Name_Str_2177))) + ("' is unknown!")), 628, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "629:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "630:\src\CompilerPasses\Parser.gbas";
			global8_Compiler.attr5_Funcs_ref[0].arrAccess(local6_MyFunc_2178).values[tmpPositionCache][0].attr10_PlzCompile = 1;
			__debugInfo = "631:\src\CompilerPasses\Parser.gbas";
			func7_GetNext();
			__debugInfo = "632:\src\CompilerPasses\Parser.gbas";
			func5_Match(")", 631, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "634:\src\CompilerPasses\Parser.gbas";
			return tryClone(func25_CreateAddressOfExpression(local6_MyFunc_2178));
			__debugInfo = "619:\src\CompilerPasses\Parser.gbas";
		} else if (func7_IsToken("NOT")) {
			__debugInfo = "636:\src\CompilerPasses\Parser.gbas";
			func5_Match("NOT", 635, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "637:\src\CompilerPasses\Parser.gbas";
			return tryClone(func19_CreateNotExpression(func14_EnsureDatatype(func6_Factor(), global13_floatDatatype, 636, 0)));
			__debugInfo = "636:\src\CompilerPasses\Parser.gbas";
		} else if ((((((((((func7_IsToken("DIM")) || (func7_IsToken("DIM%"))) ? 1 : 0)) || (func7_IsToken("DIM$"))) ? 1 : 0)) || (func7_IsToken("DIM#"))) ? 1 : 0)) {
			var local8_datatype_2181 = pool_TDatatype.alloc(), local4_dims_2182 = pool_array.alloc(0);
			__debugInfo = "643:\src\CompilerPasses\Parser.gbas";
			if (((static12_Factor_DIMASEXPRErr) ? 0 : 1)) {
				__debugInfo = "641:\src\CompilerPasses\Parser.gbas";
				static12_Factor_DIMASEXPRErr = 1;
				__debugInfo = "642:\src\CompilerPasses\Parser.gbas";
				func7_Warning("Experimental feature 'DIMASEXPR'");
				__debugInfo = "641:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "645:\src\CompilerPasses\Parser.gbas";
			local8_datatype_2181.attr7_IsArray = 1;
			__debugInfo = "646:\src\CompilerPasses\Parser.gbas";
			local8_datatype_2181.attr8_Name_Str = "float";
			__debugInfo = "647:\src\CompilerPasses\Parser.gbas";
			if (func7_IsToken("DIM%")) {
				__debugInfo = "647:\src\CompilerPasses\Parser.gbas";
				local8_datatype_2181.attr8_Name_Str = "int";
				__debugInfo = "647:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "648:\src\CompilerPasses\Parser.gbas";
			if (func7_IsToken("DIM$")) {
				__debugInfo = "648:\src\CompilerPasses\Parser.gbas";
				local8_datatype_2181.attr8_Name_Str = "string";
				__debugInfo = "648:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "649:\src\CompilerPasses\Parser.gbas";
			if (func7_IsToken("DIM#")) {
				__debugInfo = "649:\src\CompilerPasses\Parser.gbas";
				local8_datatype_2181.attr8_Name_Str = "float";
				__debugInfo = "649:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "650:\src\CompilerPasses\Parser.gbas";
			func7_GetNext();
			__debugInfo = "658:\src\CompilerPasses\Parser.gbas";
			do {
				var local1_E_2183 = 0;
				__debugInfo = "654:\src\CompilerPasses\Parser.gbas";
				func5_Match("[", 653, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "655:\src\CompilerPasses\Parser.gbas";
				local1_E_2183 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 654, 0);
				__debugInfo = "656:\src\CompilerPasses\Parser.gbas";
				func5_Match("]", 655, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "657:\src\CompilerPasses\Parser.gbas";
				DIMPUSH(local4_dims_2182, local1_E_2183);
				__debugInfo = "654:\src\CompilerPasses\Parser.gbas";
			} while (!((((func7_IsToken("[")) === (0)) ? 1 : 0)));
			__debugInfo = "668:\src\CompilerPasses\Parser.gbas";
			if (func7_IsToken("AS")) {
				__debugInfo = "667:\src\CompilerPasses\Parser.gbas";
				if ((((local8_datatype_2181.attr8_Name_Str) === ("float")) ? 1 : 0)) {
					__debugInfo = "662:\src\CompilerPasses\Parser.gbas";
					func5_Match("AS", 661, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "663:\src\CompilerPasses\Parser.gbas";
					func15_IsValidDatatype();
					__debugInfo = "664:\src\CompilerPasses\Parser.gbas";
					local8_datatype_2181.attr8_Name_Str = func14_GetCurrent_Str();
					__debugInfo = "662:\src\CompilerPasses\Parser.gbas";
				} else {
					__debugInfo = "666:\src\CompilerPasses\Parser.gbas";
					func5_Error("Unexpected AS", 665, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "666:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "667:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "670:\src\CompilerPasses\Parser.gbas";
			return tryClone(func25_CreateDimAsExprExpression(local8_datatype_2181, unref(local4_dims_2182)));
			__debugInfo = "643:\src\CompilerPasses\Parser.gbas";pool_array.free(local4_dims_2182);
		} else if (func7_IsToken("DEFINED")) {
			var local4_Find_2184 = 0;
			__debugInfo = "672:\src\CompilerPasses\Parser.gbas";
			func5_Match("DEFINED", 671, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "673:\src\CompilerPasses\Parser.gbas";
			func5_Match("(", 672, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "674:\src\CompilerPasses\Parser.gbas";
			local4_Find_2184 = 0;
			__debugInfo = "680:\src\CompilerPasses\Parser.gbas";
			var forEachSaver14642 = global7_Defines;
			for(var forEachCounter14642 = 0 ; forEachCounter14642 < forEachSaver14642.values.length ; forEachCounter14642++) {
				var local3_Def_2185 = forEachSaver14642.values[forEachCounter14642];
			{
					__debugInfo = "679:\src\CompilerPasses\Parser.gbas";
					if ((((func7_IsToken(local3_Def_2185.attr7_Key_Str)) && ((((INTEGER(FLOAT2STR(local3_Def_2185.attr9_Value_Str))) !== (0)) ? 1 : 0))) ? 1 : 0)) {
						__debugInfo = "677:\src\CompilerPasses\Parser.gbas";
						local4_Find_2184 = 1;
						__debugInfo = "678:\src\CompilerPasses\Parser.gbas";
						break;
						__debugInfo = "677:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "679:\src\CompilerPasses\Parser.gbas";
				}
				forEachSaver14642.values[forEachCounter14642] = local3_Def_2185;
			
			};
			__debugInfo = "681:\src\CompilerPasses\Parser.gbas";
			func7_GetNext();
			__debugInfo = "682:\src\CompilerPasses\Parser.gbas";
			func5_Match(")", 681, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "684:\src\CompilerPasses\Parser.gbas";
			return tryClone(func19_CreateIntExpression(local4_Find_2184));
			__debugInfo = "672:\src\CompilerPasses\Parser.gbas";
		} else if (func7_IsToken("IIF")) {
			var local4_Cond_2186 = 0, local6_onTrue_2187 = 0, local7_onFalse_2188 = 0;
			__debugInfo = "686:\src\CompilerPasses\Parser.gbas";
			func5_Match("IIF", 685, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "687:\src\CompilerPasses\Parser.gbas";
			func5_Match("(", 686, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "689:\src\CompilerPasses\Parser.gbas";
			local4_Cond_2186 = func14_EnsureDatatype(func10_Expression(0), global13_floatDatatype, 688, 0);
			__debugInfo = "690:\src\CompilerPasses\Parser.gbas";
			func5_Match(",", 689, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "691:\src\CompilerPasses\Parser.gbas";
			local6_onTrue_2187 = func10_Expression(0);
			__debugInfo = "692:\src\CompilerPasses\Parser.gbas";
			func5_Match(",", 691, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "693:\src\CompilerPasses\Parser.gbas";
			local7_onFalse_2188 = func10_Expression(0);
			__debugInfo = "694:\src\CompilerPasses\Parser.gbas";
			func5_Match(")", 693, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "698:\src\CompilerPasses\Parser.gbas";
			if (((((((global5_Exprs_ref[0].arrAccess(local6_onTrue_2187).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) !== (global5_Exprs_ref[0].arrAccess(local7_onFalse_2188).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str)) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(local6_onTrue_2187).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) !== (global5_Exprs_ref[0].arrAccess(local7_onFalse_2188).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray)) ? 1 : 0))) ? 1 : 0)) {
				__debugInfo = "697:\src\CompilerPasses\Parser.gbas";
				func5_Error("IIF parameters do not match!", 696, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "697:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "700:\src\CompilerPasses\Parser.gbas";
			return tryClone(func19_CreateIIFExpression(local4_Cond_2186, local6_onTrue_2187, local7_onFalse_2188));
			__debugInfo = "686:\src\CompilerPasses\Parser.gbas";
		} else if (func8_IsDefine("")) {
			__debugInfo = "702:\src\CompilerPasses\Parser.gbas";
			func7_GetNext();
			__debugInfo = "709:\src\CompilerPasses\Parser.gbas";
			if ((((CAST2STRING(INTEGER(FLOAT2STR(global10_LastDefine.attr9_Value_Str)))) === (global10_LastDefine.attr9_Value_Str)) ? 1 : 0)) {
				__debugInfo = "704:\src\CompilerPasses\Parser.gbas";
				return tryClone(func19_CreateIntExpression(INT2STR(global10_LastDefine.attr9_Value_Str)));
				__debugInfo = "704:\src\CompilerPasses\Parser.gbas";
			} else if (((((((MID_Str(global10_LastDefine.attr9_Value_Str, 0, 1)) === ("\"")) ? 1 : 0)) && ((((MID_Str(global10_LastDefine.attr9_Value_Str, (((global10_LastDefine.attr9_Value_Str).length) - (1)), 1)) === ("\"")) ? 1 : 0))) ? 1 : 0)) {
				__debugInfo = "706:\src\CompilerPasses\Parser.gbas";
				return tryClone(func19_CreateStrExpression(global10_LastDefine.attr9_Value_Str));
				__debugInfo = "706:\src\CompilerPasses\Parser.gbas";
			} else {
				__debugInfo = "708:\src\CompilerPasses\Parser.gbas";
				return tryClone(func21_CreateFloatExpression(FLOAT2STR(global10_LastDefine.attr9_Value_Str)));
				__debugInfo = "708:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "702:\src\CompilerPasses\Parser.gbas";
		} else {
			__debugInfo = "726:\src\CompilerPasses\Parser.gbas";
			if (((global6_STRICT) ? 0 : 1)) {
				__debugInfo = "713:\src\CompilerPasses\Parser.gbas";
				func14_ImplicitDefine();
				__debugInfo = "714:\src\CompilerPasses\Parser.gbas";
				return tryClone(func10_Identifier(0));
				__debugInfo = "713:\src\CompilerPasses\Parser.gbas";
			} else {
				var local8_vars_Str_2189 = "", local5_Varis_2190 = pool_array.alloc(0);
				__debugInfo = "717:\src\CompilerPasses\Parser.gbas";
				func14_ImplicitDefine();
				__debugInfo = "719:\src\CompilerPasses\Parser.gbas";
				local8_vars_Str_2189 = "";
				__debugInfo = "721:\src\CompilerPasses\Parser.gbas";
				func8_GetVaris(unref(local5_Varis_2190), -(1), 0);
				__debugInfo = "724:\src\CompilerPasses\Parser.gbas";
				var forEachSaver14823 = local5_Varis_2190;
				for(var forEachCounter14823 = 0 ; forEachCounter14823 < forEachSaver14823.values.length ; forEachCounter14823++) {
					var local4_Vari_2191 = forEachSaver14823.values[forEachCounter14823];
				{
						__debugInfo = "723:\src\CompilerPasses\Parser.gbas";
						local8_vars_Str_2189 = ((((local8_vars_Str_2189) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Vari_2191).values[tmpPositionCache][0].attr8_Name_Str))) + (", "));
						__debugInfo = "723:\src\CompilerPasses\Parser.gbas";
					}
					forEachSaver14823.values[forEachCounter14823] = local4_Vari_2191;
				
				};
				__debugInfo = "725:\src\CompilerPasses\Parser.gbas";
				func5_Error((((((((("Unknown variable/function: ") + (func14_GetCurrent_Str()))) + (" possible variables: '"))) + (local8_vars_Str_2189))) + ("'")), 724, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "717:\src\CompilerPasses\Parser.gbas";pool_array.free(local5_Varis_2190);
			};
			__debugInfo = "726:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "728:\src\CompilerPasses\Parser.gbas";
		return 0;
		__debugInfo = "727:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func6_Factor = window['func6_Factor'];
window['func8_FixError'] = function() {
	stackPush("function: FixError", __debugInfo);
	try {
		__debugInfo = "732:\src\CompilerPasses\Parser.gbas";
		func7_GetNext();
		__debugInfo = "739:\src\CompilerPasses\Parser.gbas";
		if (((func7_IsToken("\n")) ? 0 : 1)) {
			__debugInfo = "738:\src\CompilerPasses\Parser.gbas";
			while (((((((func9_IsKeyword()) === (0)) ? 1 : 0)) && ((((func7_IsToken("\n")) === (0)) ? 1 : 0))) ? 1 : 0)) {
				__debugInfo = "737:\src\CompilerPasses\Parser.gbas";
				func7_GetNext();
				__debugInfo = "737:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "738:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "740:\src\CompilerPasses\Parser.gbas";
		return 0;
		__debugInfo = "732:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func8_FixError = window['func8_FixError'];
window['func6_Parser'] = function() {
	stackPush("function: Parser", __debugInfo);
	try {
		__debugInfo = "1007:\src\CompilerPasses\Parser.gbas";
		{
			var Err_Str = "";
			__debugInfo = "1008:\src\CompilerPasses\Parser.gbas";
			try {
				var local5_found_2210 = 0;
				__debugInfo = "745:\src\CompilerPasses\Parser.gbas";
				func5_Start();
				__debugInfo = "747:\src\CompilerPasses\Parser.gbas";
				func5_Scope("__EOFFILE__", -(1));
				__debugInfo = "755:\src\CompilerPasses\Parser.gbas";
				var forEachSaver14895 = global8_Compiler.attr5_Funcs_ref[0];
				for(var forEachCounter14895 = 0 ; forEachCounter14895 < forEachSaver14895.values.length ; forEachCounter14895++) {
					var local4_func_ref_2192 = forEachSaver14895.values[forEachCounter14895];
				{
						__debugInfo = "754:\src\CompilerPasses\Parser.gbas";
						if (((((((local4_func_ref_2192[0].attr3_Typ) === (2)) ? 1 : 0)) || ((((local4_func_ref_2192[0].attr3_Typ) === (3)) ? 1 : 0))) ? 1 : 0)) {
							__debugInfo = "753:\src\CompilerPasses\Parser.gbas";
							local4_func_ref_2192[0].attr10_PlzCompile = 1;
							__debugInfo = "753:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "754:\src\CompilerPasses\Parser.gbas";
					}
					forEachSaver14895.values[forEachCounter14895] = local4_func_ref_2192;
				
				};
				__debugInfo = "785:\src\CompilerPasses\Parser.gbas";
				while (1) {
					var local5_Found_2193 = 0;
					__debugInfo = "776:\src\CompilerPasses\Parser.gbas";
					local5_Found_2193 = 0;
					__debugInfo = "783:\src\CompilerPasses\Parser.gbas";
					var forEachSaver14933 = global8_Compiler.attr5_Funcs_ref[0];
					for(var forEachCounter14933 = 0 ; forEachCounter14933 < forEachSaver14933.values.length ; forEachCounter14933++) {
						var local4_func_ref_2194 = forEachSaver14933.values[forEachCounter14933];
					{
							__debugInfo = "782:\src\CompilerPasses\Parser.gbas";
							if ((((local4_func_ref_2194[0].attr10_PlzCompile) && ((((local4_func_ref_2194[0].attr3_Scp) === (-(1))) ? 1 : 0))) ? 1 : 0)) {
								__debugInfo = "780:\src\CompilerPasses\Parser.gbas";
								if (func11_CompileFunc(unref(local4_func_ref_2194[0]))) {
									__debugInfo = "780:\src\CompilerPasses\Parser.gbas";
									local5_Found_2193 = 1;
									__debugInfo = "780:\src\CompilerPasses\Parser.gbas";
								};
								__debugInfo = "780:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "782:\src\CompilerPasses\Parser.gbas";
						}
						forEachSaver14933.values[forEachCounter14933] = local4_func_ref_2194;
					
					};
					__debugInfo = "784:\src\CompilerPasses\Parser.gbas";
					if ((((local5_Found_2193) === (0)) ? 1 : 0)) {
						__debugInfo = "784:\src\CompilerPasses\Parser.gbas";
						break;
						__debugInfo = "784:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "776:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "792:\src\CompilerPasses\Parser.gbas";
				{
					var local1_i_2195 = 0.0;
					__debugInfo = "816:\src\CompilerPasses\Parser.gbas";
					for (local1_i_2195 = 0;toCheck(local1_i_2195, ((global10_LastExprID) - (1)), 1);local1_i_2195 += 1) {
						var alias4_Expr_ref_2196 = [pool_TExpr.alloc()];
						__debugInfo = "794:\src\CompilerPasses\Parser.gbas";
						alias4_Expr_ref_2196 = global5_Exprs_ref[0].arrAccess(~~(local1_i_2195)).values[tmpPositionCache] /* ALIAS */;
						__debugInfo = "815:\src\CompilerPasses\Parser.gbas";
						if (((((((alias4_Expr_ref_2196[0].attr3_Typ) === (6)) ? 1 : 0)) || ((((alias4_Expr_ref_2196[0].attr3_Typ) === (23)) ? 1 : 0))) ? 1 : 0)) {
							__debugInfo = "814:\src\CompilerPasses\Parser.gbas";
							if (((((((BOUNDS(alias4_Expr_ref_2196[0].attr6_Params, 0)) < (BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(alias4_Expr_ref_2196[0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0))) ? 1 : 0)) && ((((alias4_Expr_ref_2196[0].attr8_wasAdded) === (0)) ? 1 : 0))) ? 1 : 0)) {
								var local4_Meth_2197 = 0, local7_TmpSave_2198 = 0;
								__debugInfo = "797:\src\CompilerPasses\Parser.gbas";
								alias4_Expr_ref_2196[0].attr8_wasAdded = 1;
								__debugInfo = "798:\src\CompilerPasses\Parser.gbas";
								local4_Meth_2197 = 0;
								__debugInfo = "805:\src\CompilerPasses\Parser.gbas";
								if ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(alias4_Expr_ref_2196[0].attr4_func).values[tmpPositionCache][0].attr3_Typ) === (3)) ? 1 : 0)) {
									__debugInfo = "801:\src\CompilerPasses\Parser.gbas";
									if ((((BOUNDS(alias4_Expr_ref_2196[0].attr6_Params, 0)) === (0)) ? 1 : 0)) {
										__debugInfo = "801:\src\CompilerPasses\Parser.gbas";
										func5_Error((((("Internal error (method '") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(alias4_Expr_ref_2196[0].attr4_func).values[tmpPositionCache][0].attr8_Name_Str))) + ("' didn't get self parameter)")), 800, "src\CompilerPasses\Parser.gbas");
										__debugInfo = "801:\src\CompilerPasses\Parser.gbas";
									};
									__debugInfo = "802:\src\CompilerPasses\Parser.gbas";
									local4_Meth_2197 = 1;
									__debugInfo = "803:\src\CompilerPasses\Parser.gbas";
									local7_TmpSave_2198 = alias4_Expr_ref_2196[0].attr6_Params.arrAccess(-(1)).values[tmpPositionCache];
									__debugInfo = "804:\src\CompilerPasses\Parser.gbas";
									DIMDEL(alias4_Expr_ref_2196[0].attr6_Params, -(1));
									__debugInfo = "801:\src\CompilerPasses\Parser.gbas";
								};
								__debugInfo = "805:\src\CompilerPasses\Parser.gbas";
								{
									__debugInfo = "810:\src\CompilerPasses\Parser.gbas";
									for (local1_i_2195 = BOUNDS(alias4_Expr_ref_2196[0].attr6_Params, 0);toCheck(local1_i_2195, ((((BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(alias4_Expr_ref_2196[0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0)) - (1))) - (local4_Meth_2197)), 1);local1_i_2195 += 1) {
										__debugInfo = "809:\src\CompilerPasses\Parser.gbas";
										if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(alias4_Expr_ref_2196[0].attr4_func).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_i_2195)).values[tmpPositionCache]).values[tmpPositionCache][0].attr6_PreDef) !== (-(1))) ? 1 : 0)) {
											__debugInfo = "808:\src\CompilerPasses\Parser.gbas";
											DIMPUSH(alias4_Expr_ref_2196[0].attr6_Params, global8_Compiler.attr5_Varis_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(alias4_Expr_ref_2196[0].attr4_func).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_i_2195)).values[tmpPositionCache]).values[tmpPositionCache][0].attr6_PreDef);
											__debugInfo = "808:\src\CompilerPasses\Parser.gbas";
										};
										__debugInfo = "809:\src\CompilerPasses\Parser.gbas";
									};
									__debugInfo = "810:\src\CompilerPasses\Parser.gbas";
								};
								__debugInfo = "813:\src\CompilerPasses\Parser.gbas";
								if (local4_Meth_2197) {
									__debugInfo = "812:\src\CompilerPasses\Parser.gbas";
									DIMPUSH(alias4_Expr_ref_2196[0].attr6_Params, local7_TmpSave_2198);
									__debugInfo = "812:\src\CompilerPasses\Parser.gbas";
								};
								__debugInfo = "797:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "814:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "794:\src\CompilerPasses\Parser.gbas";pool_TExpr.free(alias4_Expr_ref_2196);
					};
					__debugInfo = "816:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "819:\src\CompilerPasses\Parser.gbas";
				func15_CheckPrototypes();
				__debugInfo = "825:\src\CompilerPasses\Parser.gbas";
				{
					var local1_i_2199 = 0.0;
					__debugInfo = "881:\src\CompilerPasses\Parser.gbas";
					for (local1_i_2199 = 0;toCheck(local1_i_2199, ((global10_LastExprID) - (1)), 1);local1_i_2199 += 1) {
						__debugInfo = "880:\src\CompilerPasses\Parser.gbas";
						if (((((((global5_Exprs_ref[0].arrAccess(~~(local1_i_2199)).values[tmpPositionCache][0].attr3_Typ) === (6)) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(~~(local1_i_2199)).values[tmpPositionCache][0].attr3_Typ) === (23)) ? 1 : 0))) ? 1 : 0)) {
							var local4_Meth_2200 = 0;
							__debugInfo = "834:\src\CompilerPasses\Parser.gbas";
							local4_Meth_2200 = 0;
							__debugInfo = "835:\src\CompilerPasses\Parser.gbas";
							if ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2199)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr3_Typ) === (3)) ? 1 : 0)) {
								__debugInfo = "835:\src\CompilerPasses\Parser.gbas";
								local4_Meth_2200 = 1;
								__debugInfo = "835:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "837:\src\CompilerPasses\Parser.gbas";
							global8_Compiler.attr11_currentPosi = global5_Exprs_ref[0].arrAccess(~~(local1_i_2199)).values[tmpPositionCache][0].attr5_tokID;
							__debugInfo = "879:\src\CompilerPasses\Parser.gbas";
							if ((((BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2199)).values[tmpPositionCache][0].attr6_Params, 0)) === (BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2199)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0))) ? 1 : 0)) {
								var local1_j_2201 = 0.0, local9_NewParams_2202 = pool_array.alloc(0);
								__debugInfo = "840:\src\CompilerPasses\Parser.gbas";
								local1_j_2201 = 0;
								__debugInfo = "856:\src\CompilerPasses\Parser.gbas";
								var forEachSaver15360 = global5_Exprs_ref[0].arrAccess(~~(local1_i_2199)).values[tmpPositionCache][0].attr6_Params;
								for(var forEachCounter15360 = 0 ; forEachCounter15360 < forEachSaver15360.values.length ; forEachCounter15360++) {
									var local1_P_2203 = forEachSaver15360.values[forEachCounter15360];
								{
										var local1_S_2204 = 0, local3_Tmp_2205 = 0;
										__debugInfo = "843:\src\CompilerPasses\Parser.gbas";
										local1_S_2204 = 0;
										__debugInfo = "847:\src\CompilerPasses\Parser.gbas";
										if (global8_Compiler.attr5_Varis_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2199)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_j_2201)).values[tmpPositionCache]).values[tmpPositionCache][0].attr3_ref) {
											__debugInfo = "845:\src\CompilerPasses\Parser.gbas";
											global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(local1_P_2203, 1)).values[tmpPositionCache][0].attr3_ref = 1;
											__debugInfo = "846:\src\CompilerPasses\Parser.gbas";
											local1_S_2204 = 1;
											__debugInfo = "845:\src\CompilerPasses\Parser.gbas";
										};
										__debugInfo = "853:\src\CompilerPasses\Parser.gbas";
										if (((local1_S_2204) ? 0 : 1)) {
											__debugInfo = "850:\src\CompilerPasses\Parser.gbas";
											local3_Tmp_2205 = func14_EnsureDatatype(local1_P_2203, global8_Compiler.attr5_Varis_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2199)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_j_2201)).values[tmpPositionCache]).values[tmpPositionCache][0].attr8_datatype, 849, local1_S_2204);
											__debugInfo = "850:\src\CompilerPasses\Parser.gbas";
										} else {
											__debugInfo = "852:\src\CompilerPasses\Parser.gbas";
											local3_Tmp_2205 = local1_P_2203;
											__debugInfo = "852:\src\CompilerPasses\Parser.gbas";
										};
										__debugInfo = "854:\src\CompilerPasses\Parser.gbas";
										DIMPUSH(local9_NewParams_2202, local3_Tmp_2205);
										__debugInfo = "855:\src\CompilerPasses\Parser.gbas";
										local1_j_2201+=1;
										__debugInfo = "843:\src\CompilerPasses\Parser.gbas";
									}
									forEachSaver15360.values[forEachCounter15360] = local1_P_2203;
								
								};
								__debugInfo = "857:\src\CompilerPasses\Parser.gbas";
								global5_Exprs_ref[0].arrAccess(~~(local1_i_2199)).values[tmpPositionCache][0].attr6_Params = local9_NewParams_2202.clone(/* In Assign */);
								__debugInfo = "840:\src\CompilerPasses\Parser.gbas";pool_array.free(local9_NewParams_2202);
							} else {
								var local8_miss_Str_2206 = "", local9_datas_Str_2207 = "";
								__debugInfo = "858:\src\CompilerPasses\Parser.gbas";
								local8_miss_Str_2206 = "";
								__debugInfo = "870:\src\CompilerPasses\Parser.gbas";
								if ((((BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2199)).values[tmpPositionCache][0].attr6_Params, 0)) < (BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2199)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0))) ? 1 : 0)) {
									__debugInfo = "860:\src\CompilerPasses\Parser.gbas";
									{
										var local1_j_2208 = 0.0;
										__debugInfo = "863:\src\CompilerPasses\Parser.gbas";
										for (local1_j_2208 = BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2199)).values[tmpPositionCache][0].attr6_Params, 0);toCheck(local1_j_2208, ((((BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2199)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0)) - (1))) - (local4_Meth_2200)), 1);local1_j_2208 += 1) {
											__debugInfo = "862:\src\CompilerPasses\Parser.gbas";
											local8_miss_Str_2206 = ((((local8_miss_Str_2206) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2199)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_j_2208)).values[tmpPositionCache]).values[tmpPositionCache][0].attr8_Name_Str))) + (", "));
											__debugInfo = "862:\src\CompilerPasses\Parser.gbas";
										};
										__debugInfo = "863:\src\CompilerPasses\Parser.gbas";
									};
									__debugInfo = "860:\src\CompilerPasses\Parser.gbas";
								} else if ((((BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2199)).values[tmpPositionCache][0].attr6_Params, 0)) > (BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2199)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0))) ? 1 : 0)) {
									__debugInfo = "864:\src\CompilerPasses\Parser.gbas";
									{
										var local1_j_2209 = 0.0;
										__debugInfo = "869:\src\CompilerPasses\Parser.gbas";
										for (local1_j_2209 = BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2199)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0);toCheck(local1_j_2209, ((((BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2199)).values[tmpPositionCache][0].attr6_Params, 0)) - (local4_Meth_2200))) - (1)), 1);local1_j_2209 += 1) {
											__debugInfo = "868:\src\CompilerPasses\Parser.gbas";
											if ((((global5_Exprs_ref[0].arrAccess(~~(local1_i_2199)).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_j_2209)).values[tmpPositionCache]) < (BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0))) ? 1 : 0)) {
												__debugInfo = "867:\src\CompilerPasses\Parser.gbas";
												local9_datas_Str_2207 = ((((local9_datas_Str_2207) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2199)).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_j_2209)).values[tmpPositionCache]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) + (", "));
												__debugInfo = "867:\src\CompilerPasses\Parser.gbas";
											};
											__debugInfo = "868:\src\CompilerPasses\Parser.gbas";
										};
										__debugInfo = "869:\src\CompilerPasses\Parser.gbas";
									};
									__debugInfo = "864:\src\CompilerPasses\Parser.gbas";
								};
								__debugInfo = "871:\src\CompilerPasses\Parser.gbas";
								global8_Compiler.attr11_currentPosi = global5_Exprs_ref[0].arrAccess(~~(local1_i_2199)).values[tmpPositionCache][0].attr5_tokID;
								__debugInfo = "878:\src\CompilerPasses\Parser.gbas";
								if ((((BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2199)).values[tmpPositionCache][0].attr6_Params, 0)) > (BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2199)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0))) ? 1 : 0)) {
									__debugInfo = "873:\src\CompilerPasses\Parser.gbas";
									func5_Error((((((((((((((((("Too many parameters, function '") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2199)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr8_Name_Str))) + ("' has: '"))) + (CAST2STRING(((BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2199)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0)) - (local4_Meth_2200)))))) + ("' got '"))) + (CAST2STRING(BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2199)).values[tmpPositionCache][0].attr6_Params, 0))))) + ("' datatypes '"))) + (local9_datas_Str_2207))) + ("'")), 872, "src\CompilerPasses\Parser.gbas");
									__debugInfo = "873:\src\CompilerPasses\Parser.gbas";
								} else if ((((BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2199)).values[tmpPositionCache][0].attr6_Params, 0)) < (BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2199)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0))) ? 1 : 0)) {
									__debugInfo = "875:\src\CompilerPasses\Parser.gbas";
									func5_Error((((((((((((((((("Too less parameters, function '") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2199)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr8_Name_Str))) + ("' has: '"))) + (CAST2STRING(((BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2199)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0)) - (local4_Meth_2200)))))) + ("' got '"))) + (CAST2STRING(BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2199)).values[tmpPositionCache][0].attr6_Params, 0))))) + ("' missing '"))) + (local8_miss_Str_2206))) + ("'")), 874, "src\CompilerPasses\Parser.gbas");
									__debugInfo = "875:\src\CompilerPasses\Parser.gbas";
								} else {
									__debugInfo = "877:\src\CompilerPasses\Parser.gbas";
									func5_Error((((((((("Internal error (wtf? call: ") + (CAST2STRING(BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2199)).values[tmpPositionCache][0].attr6_Params, 0))))) + (", "))) + (CAST2STRING(BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2199)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0))))) + (")")), 876, "src\CompilerPasses\Parser.gbas");
									__debugInfo = "877:\src\CompilerPasses\Parser.gbas";
								};
								__debugInfo = "858:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "834:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "880:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "881:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "884:\src\CompilerPasses\Parser.gbas";
				func15_CheckPrototypes();
				__debugInfo = "891:\src\CompilerPasses\Parser.gbas";
				local5_found_2210 = 1;
				__debugInfo = "925:\src\CompilerPasses\Parser.gbas";
				while (local5_found_2210) {
					__debugInfo = "893:\src\CompilerPasses\Parser.gbas";
					local5_found_2210 = 0;
					__debugInfo = "895:\src\CompilerPasses\Parser.gbas";
					{
						var local1_i_2211 = 0.0;
						__debugInfo = "924:\src\CompilerPasses\Parser.gbas";
						for (local1_i_2211 = 0;toCheck(local1_i_2211, ((global10_LastExprID) - (1)), 1);local1_i_2211 += 1) {
							var alias1_E_ref_2212 = [pool_TExpr.alloc()], local3_set_2213 = 0, local4_Vari_2214 = 0, local3_var_2215 = 0;
							__debugInfo = "897:\src\CompilerPasses\Parser.gbas";
							alias1_E_ref_2212 = global5_Exprs_ref[0].arrAccess(~~(local1_i_2211)).values[tmpPositionCache] /* ALIAS */;
							__debugInfo = "898:\src\CompilerPasses\Parser.gbas";
							local3_set_2213 = 0;
							__debugInfo = "901:\src\CompilerPasses\Parser.gbas";
							{
								var local17___SelectHelper23__2216 = 0;
								__debugInfo = "901:\src\CompilerPasses\Parser.gbas";
								local17___SelectHelper23__2216 = alias1_E_ref_2212[0].attr3_Typ;
								__debugInfo = "913:\src\CompilerPasses\Parser.gbas";
								if ((((local17___SelectHelper23__2216) === (~~(40))) ? 1 : 0)) {
									__debugInfo = "903:\src\CompilerPasses\Parser.gbas";
									local4_Vari_2214 = alias1_E_ref_2212[0].attr4_vari;
									__debugInfo = "904:\src\CompilerPasses\Parser.gbas";
									local3_var_2215 = func11_GetVariable(alias1_E_ref_2212[0].attr4_expr, 0);
									__debugInfo = "905:\src\CompilerPasses\Parser.gbas";
									local3_set_2213 = 1;
									__debugInfo = "903:\src\CompilerPasses\Parser.gbas";
								} else if ((((local17___SelectHelper23__2216) === (~~(38))) ? 1 : 0)) {
									__debugInfo = "907:\src\CompilerPasses\Parser.gbas";
									local4_Vari_2214 = alias1_E_ref_2212[0].attr6_inExpr;
									__debugInfo = "908:\src\CompilerPasses\Parser.gbas";
									local3_var_2215 = func11_GetVariable(alias1_E_ref_2212[0].attr7_varExpr, 0);
									__debugInfo = "909:\src\CompilerPasses\Parser.gbas";
									local3_set_2213 = 1;
									__debugInfo = "907:\src\CompilerPasses\Parser.gbas";
								} else if ((((local17___SelectHelper23__2216) === (~~(6))) ? 1 : 0)) {
									
								};
								__debugInfo = "901:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "923:\src\CompilerPasses\Parser.gbas";
							if ((((local3_set_2213) && ((((local3_var_2215) >= (0)) ? 1 : 0))) ? 1 : 0)) {
								var local1_v_2217 = 0;
								__debugInfo = "917:\src\CompilerPasses\Parser.gbas";
								local1_v_2217 = func11_GetVariable(local4_Vari_2214, 1);
								__debugInfo = "918:\src\CompilerPasses\Parser.gbas";
								if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_var_2215).values[tmpPositionCache][0].attr3_ref) !== (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_v_2217).values[tmpPositionCache][0].attr3_ref)) ? 1 : 0)) {
									__debugInfo = "918:\src\CompilerPasses\Parser.gbas";
									local5_found_2210 = 1;
									__debugInfo = "918:\src\CompilerPasses\Parser.gbas";
								};
								__debugInfo = "922:\src\CompilerPasses\Parser.gbas";
								global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_var_2215).values[tmpPositionCache][0].attr3_ref = global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_v_2217).values[tmpPositionCache][0].attr3_ref;
								__debugInfo = "917:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "897:\src\CompilerPasses\Parser.gbas";pool_TExpr.free(alias1_E_ref_2212);
						};
						__debugInfo = "924:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "893:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "932:\src\CompilerPasses\Parser.gbas";
				{
					var local1_i_2218 = 0.0;
					__debugInfo = "957:\src\CompilerPasses\Parser.gbas";
					for (local1_i_2218 = 0;toCheck(local1_i_2218, ((global10_LastExprID) - (1)), 1);local1_i_2218 += 1) {
						var alias4_Expr_ref_2219 = [pool_TExpr.alloc()];
						__debugInfo = "934:\src\CompilerPasses\Parser.gbas";
						alias4_Expr_ref_2219 = global5_Exprs_ref[0].arrAccess(~~(local1_i_2218)).values[tmpPositionCache] /* ALIAS */;
						__debugInfo = "935:\src\CompilerPasses\Parser.gbas";
						{
							var local17___SelectHelper24__2220 = 0;
							__debugInfo = "935:\src\CompilerPasses\Parser.gbas";
							local17___SelectHelper24__2220 = alias4_Expr_ref_2219[0].attr3_Typ;
							__debugInfo = "956:\src\CompilerPasses\Parser.gbas";
							if ((((local17___SelectHelper24__2220) === (~~(2))) ? 1 : 0)) {
								__debugInfo = "955:\src\CompilerPasses\Parser.gbas";
								if ((((((((((alias4_Expr_ref_2219[0].attr6_ScpTyp) === (2)) ? 1 : 0)) || ((((alias4_Expr_ref_2219[0].attr6_ScpTyp) === (4)) ? 1 : 0))) ? 1 : 0)) && (BOUNDS(alias4_Expr_ref_2219[0].attr5_Gotos, 0))) ? 1 : 0)) {
									__debugInfo = "940:\src\CompilerPasses\Parser.gbas";
									if (((func12_ScopeHasGoto(unref(alias4_Expr_ref_2219[0]))) ? 0 : 1)) {
										__debugInfo = "940:\src\CompilerPasses\Parser.gbas";
										func5_Error("Internal Error (There is a goto, but I can't find it)", 939, "src\CompilerPasses\Parser.gbas");
										__debugInfo = "940:\src\CompilerPasses\Parser.gbas";
									};
									__debugInfo = "954:\src\CompilerPasses\Parser.gbas";
									var forEachSaver16045 = alias4_Expr_ref_2219[0].attr5_Gotos;
									for(var forEachCounter16045 = 0 ; forEachCounter16045 < forEachSaver16045.values.length ; forEachCounter16045++) {
										var local1_G_2221 = forEachSaver16045.values[forEachCounter16045];
									{
											var local5_Found_2222 = 0;
											__debugInfo = "942:\src\CompilerPasses\Parser.gbas";
											local5_Found_2222 = 0;
											__debugInfo = "948:\src\CompilerPasses\Parser.gbas";
											var forEachSaver16018 = alias4_Expr_ref_2219[0].attr6_Labels;
											for(var forEachCounter16018 = 0 ; forEachCounter16018 < forEachSaver16018.values.length ; forEachCounter16018++) {
												var local1_L_2223 = forEachSaver16018.values[forEachCounter16018];
											{
													__debugInfo = "947:\src\CompilerPasses\Parser.gbas";
													if ((((global5_Exprs_ref[0].arrAccess(local1_L_2223).values[tmpPositionCache][0].attr8_Name_Str) === (global5_Exprs_ref[0].arrAccess(local1_G_2221).values[tmpPositionCache][0].attr8_Name_Str)) ? 1 : 0)) {
														__debugInfo = "945:\src\CompilerPasses\Parser.gbas";
														local5_Found_2222 = 1;
														__debugInfo = "946:\src\CompilerPasses\Parser.gbas";
														break;
														__debugInfo = "945:\src\CompilerPasses\Parser.gbas";
													};
													__debugInfo = "947:\src\CompilerPasses\Parser.gbas";
												}
												forEachSaver16018.values[forEachCounter16018] = local1_L_2223;
											
											};
											__debugInfo = "953:\src\CompilerPasses\Parser.gbas";
											if (((local5_Found_2222) ? 0 : 1)) {
												__debugInfo = "950:\src\CompilerPasses\Parser.gbas";
												global8_Compiler.attr11_currentPosi = global5_Exprs_ref[0].arrAccess(local1_G_2221).values[tmpPositionCache][0].attr5_tokID;
												__debugInfo = "951:\src\CompilerPasses\Parser.gbas";
												func5_Error((((("Label '") + (global5_Exprs_ref[0].arrAccess(local1_G_2221).values[tmpPositionCache][0].attr8_Name_Str))) + ("' does not exist, please use an existing label badass!")), 950, "src\CompilerPasses\Parser.gbas");
												__debugInfo = "950:\src\CompilerPasses\Parser.gbas";
											};
											__debugInfo = "942:\src\CompilerPasses\Parser.gbas";
										}
										forEachSaver16045.values[forEachCounter16045] = local1_G_2221;
									
									};
									__debugInfo = "940:\src\CompilerPasses\Parser.gbas";
								};
								__debugInfo = "955:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "935:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "934:\src\CompilerPasses\Parser.gbas";pool_TExpr.free(alias4_Expr_ref_2219);
					};
					__debugInfo = "957:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "966:\src\CompilerPasses\Parser.gbas";
				var forEachSaver16071 = global8_Compiler.attr5_Types_ref[0];
				for(var forEachCounter16071 = 0 ; forEachCounter16071 < forEachSaver16071.values.length ; forEachCounter16071++) {
					var local3_Typ_ref_2224 = forEachSaver16071.values[forEachCounter16071];
				{
						__debugInfo = "964:\src\CompilerPasses\Parser.gbas";
						local3_Typ_ref_2224[0].attr9_OName_Str = local3_Typ_ref_2224[0].attr8_Name_Str;
						__debugInfo = "965:\src\CompilerPasses\Parser.gbas";
						local3_Typ_ref_2224[0].attr8_Name_Str = func18_ChangeTypeName_Str(local3_Typ_ref_2224[0].attr8_Name_Str);
						__debugInfo = "964:\src\CompilerPasses\Parser.gbas";
					}
					forEachSaver16071.values[forEachCounter16071] = local3_Typ_ref_2224;
				
				};
				__debugInfo = "972:\src\CompilerPasses\Parser.gbas";
				var forEachSaver16081 = global8_Compiler.attr5_Funcs_ref[0];
				for(var forEachCounter16081 = 0 ; forEachCounter16081 < forEachSaver16081.values.length ; forEachCounter16081++) {
					var local4_Func_ref_2225 = forEachSaver16081.values[forEachCounter16081];
				{
						__debugInfo = "971:\src\CompilerPasses\Parser.gbas";
						func14_ChangeFuncName(unref(local4_Func_ref_2225[0]));
						__debugInfo = "971:\src\CompilerPasses\Parser.gbas";
					}
					forEachSaver16081.values[forEachCounter16081] = local4_Func_ref_2225;
				
				};
				__debugInfo = "978:\src\CompilerPasses\Parser.gbas";
				var forEachSaver16091 = global8_Compiler.attr5_Varis_ref[0];
				for(var forEachCounter16091 = 0 ; forEachCounter16091 < forEachSaver16091.values.length ; forEachCounter16091++) {
					var local4_Vari_ref_2226 = forEachSaver16091.values[forEachCounter16091];
				{
						__debugInfo = "977:\src\CompilerPasses\Parser.gbas";
						func13_ChangeVarName(unref(local4_Vari_ref_2226[0]));
						__debugInfo = "977:\src\CompilerPasses\Parser.gbas";
					}
					forEachSaver16091.values[forEachCounter16091] = local4_Vari_ref_2226;
				
				};
				__debugInfo = "986:\src\CompilerPasses\Parser.gbas";
				var forEachSaver16127 = global8_Compiler.attr5_Varis_ref[0];
				for(var forEachCounter16127 = 0 ; forEachCounter16127 < forEachSaver16127.values.length ; forEachCounter16127++) {
					var local1_V_ref_2227 = forEachSaver16127.values[forEachCounter16127];
				{
						__debugInfo = "985:\src\CompilerPasses\Parser.gbas";
						if (((((((local1_V_ref_2227[0].attr3_Typ) === (1)) ? 1 : 0)) || ((((local1_V_ref_2227[0].attr3_Typ) === (7)) ? 1 : 0))) ? 1 : 0)) {
							__debugInfo = "984:\src\CompilerPasses\Parser.gbas";
							local1_V_ref_2227[0].attr8_Name_Str = ((((local1_V_ref_2227[0].attr8_Name_Str) + ("_"))) + (CAST2STRING(local1_V_ref_2227[0].attr2_ID)));
							__debugInfo = "984:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "985:\src\CompilerPasses\Parser.gbas";
					}
					forEachSaver16127.values[forEachCounter16127] = local1_V_ref_2227;
				
				};
				__debugInfo = "988:\src\CompilerPasses\Parser.gbas";
				{
					var local1_i_2228 = 0.0;
					__debugInfo = "1002:\src\CompilerPasses\Parser.gbas";
					for (local1_i_2228 = 0;toCheck(local1_i_2228, ((global10_LastExprID) - (1)), 1);local1_i_2228 += 1) {
						var alias1_E_ref_2229 = [pool_TExpr.alloc()];
						__debugInfo = "990:\src\CompilerPasses\Parser.gbas";
						alias1_E_ref_2229 = global5_Exprs_ref[0].arrAccess(~~(local1_i_2228)).values[tmpPositionCache] /* ALIAS */;
						__debugInfo = "1001:\src\CompilerPasses\Parser.gbas";
						if (((((((((((((alias1_E_ref_2229[0].attr8_datatype.attr8_Name_Str) === ("void")) ? 1 : 0)) || ((((alias1_E_ref_2229[0].attr8_datatype.attr8_Name_Str) === ("int")) ? 1 : 0))) ? 1 : 0)) || ((((alias1_E_ref_2229[0].attr8_datatype.attr8_Name_Str) === ("float")) ? 1 : 0))) ? 1 : 0)) || ((((alias1_E_ref_2229[0].attr8_datatype.attr8_Name_Str) === ("string")) ? 1 : 0))) ? 1 : 0)) {
							
						} else {
							__debugInfo = "1000:\src\CompilerPasses\Parser.gbas";
							if ((((func6_IsType(alias1_E_ref_2229[0].attr8_datatype.attr8_Name_Str)) === (0)) ? 1 : 0)) {
								__debugInfo = "999:\src\CompilerPasses\Parser.gbas";
								var forEachSaver16218 = global8_Compiler.attr5_Funcs_ref[0];
								for(var forEachCounter16218 = 0 ; forEachCounter16218 < forEachSaver16218.values.length ; forEachCounter16218++) {
									var local1_F_ref_2230 = forEachSaver16218.values[forEachCounter16218];
								{
										__debugInfo = "998:\src\CompilerPasses\Parser.gbas";
										if ((((alias1_E_ref_2229[0].attr8_datatype.attr8_Name_Str) === (local1_F_ref_2230[0].attr9_OName_Str)) ? 1 : 0)) {
											__debugInfo = "997:\src\CompilerPasses\Parser.gbas";
											alias1_E_ref_2229[0].attr8_datatype.attr8_Name_Str = local1_F_ref_2230[0].attr8_Name_Str;
											__debugInfo = "997:\src\CompilerPasses\Parser.gbas";
										};
										__debugInfo = "998:\src\CompilerPasses\Parser.gbas";
									}
									forEachSaver16218.values[forEachCounter16218] = local1_F_ref_2230;
								
								};
								__debugInfo = "999:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "1000:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "990:\src\CompilerPasses\Parser.gbas";pool_TExpr.free(alias1_E_ref_2229);
					};
					__debugInfo = "1002:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1004:\src\CompilerPasses\Parser.gbas";
				func23_ManageFuncParamOverlaps();
				__debugInfo = "745:\src\CompilerPasses\Parser.gbas";
			} catch (Err_Str) {
				if (Err_Str instanceof OTTException) Err_Str = Err_Str.getText(); else throwError(Err_Str);{
					
				}
			};
			__debugInfo = "1008:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "1009:\src\CompilerPasses\Parser.gbas";
		return 0;
		__debugInfo = "1007:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func6_Parser = window['func6_Parser'];
window['func15_CheckPrototypes'] = function() {
	stackPush("function: CheckPrototypes", __debugInfo);
	try {
		__debugInfo = "1039:\src\CompilerPasses\Parser.gbas";
		if ((((BOUNDS(global8_Compiler.attr13_protoCheckers, 0)) > (0)) ? 1 : 0)) {
			__debugInfo = "1037:\src\CompilerPasses\Parser.gbas";
			var forEachSaver16407 = global8_Compiler.attr13_protoCheckers;
			for(var forEachCounter16407 = 0 ; forEachCounter16407 < forEachSaver16407.values.length ; forEachCounter16407++) {
				var local7_checker_2232 = forEachSaver16407.values[forEachCounter16407];
			{
					var alias5_func1_ref_2233 = [pool_TIdentifierFunc.alloc()], alias5_func2_ref_2234 = [pool_TIdentifierFunc.alloc()], local5_valid_2235 = 0;
					__debugInfo = "1020:\src\CompilerPasses\Parser.gbas";
					alias5_func1_ref_2233 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(local7_checker_2232.attr8_fromFunc).values[tmpPositionCache] /* ALIAS */;
					__debugInfo = "1021:\src\CompilerPasses\Parser.gbas";
					alias5_func2_ref_2234 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(local7_checker_2232.attr6_toFunc).values[tmpPositionCache] /* ALIAS */;
					__debugInfo = "1022:\src\CompilerPasses\Parser.gbas";
					local5_valid_2235 = 0;
					__debugInfo = "1032:\src\CompilerPasses\Parser.gbas";
					if (((((((alias5_func1_ref_2233[0].attr8_datatype.attr8_Name_Str) === (alias5_func2_ref_2234[0].attr8_datatype.attr8_Name_Str)) ? 1 : 0)) && ((((alias5_func1_ref_2233[0].attr8_datatype.attr7_IsArray) === (alias5_func2_ref_2234[0].attr8_datatype.attr7_IsArray)) ? 1 : 0))) ? 1 : 0)) {
						__debugInfo = "1031:\src\CompilerPasses\Parser.gbas";
						if ((((BOUNDS(alias5_func1_ref_2233[0].attr6_Params, 0)) === (BOUNDS(alias5_func2_ref_2234[0].attr6_Params, 0))) ? 1 : 0)) {
							__debugInfo = "1025:\src\CompilerPasses\Parser.gbas";
							local5_valid_2235 = 1;
							__debugInfo = "1025:\src\CompilerPasses\Parser.gbas";
							{
								var local1_i_2236 = 0.0;
								__debugInfo = "1030:\src\CompilerPasses\Parser.gbas";
								for (local1_i_2236 = 0;toCheck(local1_i_2236, ((BOUNDS(alias5_func1_ref_2233[0].attr6_Params, 0)) - (1)), 1);local1_i_2236 += 1) {
									var alias2_p1_ref_2237 = [pool_TIdentifierVari.alloc()], alias2_p2_ref_2238 = [pool_TIdentifierVari.alloc()];
									__debugInfo = "1027:\src\CompilerPasses\Parser.gbas";
									alias2_p1_ref_2237 = global8_Compiler.attr5_Varis_ref[0].arrAccess(alias5_func1_ref_2233[0].attr6_Params.arrAccess(~~(local1_i_2236)).values[tmpPositionCache]).values[tmpPositionCache] /* ALIAS */;
									__debugInfo = "1028:\src\CompilerPasses\Parser.gbas";
									alias2_p2_ref_2238 = global8_Compiler.attr5_Varis_ref[0].arrAccess(alias5_func2_ref_2234[0].attr6_Params.arrAccess(~~(local1_i_2236)).values[tmpPositionCache]).values[tmpPositionCache] /* ALIAS */;
									__debugInfo = "1029:\src\CompilerPasses\Parser.gbas";
									if (((((((alias2_p1_ref_2237[0].attr8_datatype.attr8_Name_Str) !== (alias2_p2_ref_2238[0].attr8_datatype.attr8_Name_Str)) ? 1 : 0)) || ((((alias2_p1_ref_2237[0].attr8_datatype.attr7_IsArray) !== (alias2_p2_ref_2238[0].attr8_datatype.attr7_IsArray)) ? 1 : 0))) ? 1 : 0)) {
										__debugInfo = "1029:\src\CompilerPasses\Parser.gbas";
										local5_valid_2235 = 0;
										__debugInfo = "1029:\src\CompilerPasses\Parser.gbas";
									};
									__debugInfo = "1027:\src\CompilerPasses\Parser.gbas";pool_TIdentifierVari.free(alias2_p1_ref_2237);pool_TIdentifierVari.free(alias2_p2_ref_2238);
								};
								__debugInfo = "1030:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "1025:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "1031:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "1036:\src\CompilerPasses\Parser.gbas";
					if ((((local5_valid_2235) === (0)) ? 1 : 0)) {
						__debugInfo = "1035:\src\CompilerPasses\Parser.gbas";
						func5_Error((((((((("Cannot cast prototype '") + (func17_BuildPrototyp_Str(local7_checker_2232.attr8_fromFunc)))) + ("' to '"))) + (func17_BuildPrototyp_Str(local7_checker_2232.attr6_toFunc)))) + ("'")), 1034, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "1035:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "1020:\src\CompilerPasses\Parser.gbas";pool_TIdentifierFunc.free(alias5_func1_ref_2233);pool_TIdentifierFunc.free(alias5_func2_ref_2234);
				}
				forEachSaver16407.values[forEachCounter16407] = local7_checker_2232;
			
			};
			__debugInfo = "1038:\src\CompilerPasses\Parser.gbas";
			REDIM(global8_Compiler.attr13_protoCheckers, [0], pool_TProtoChecker.alloc() );
			__debugInfo = "1037:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "1041:\src\CompilerPasses\Parser.gbas";
		return 0;
		__debugInfo = "1039:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func15_CheckPrototypes = window['func15_CheckPrototypes'];
window['func5_Scope'] = function(param12_CloseStr_Str, param4_func) {
	stackPush("function: Scope", __debugInfo);
	try {
		var local6_ScpTyp_2241 = 0, local9_Important_2242 = 0, local7_befLoop_2244 = 0, local8_TmpScope_2245 = 0.0, local12_TmpImportant_2246 = 0, local7_OneLine_2249 = 0, local13_OCloseStr_Str_2250 = "", local7_MyScope_2257 = 0;
		var local12_CloseStr_Str_ref_2239 = [param12_CloseStr_Str];
		__debugInfo = "1045:\src\CompilerPasses\Parser.gbas";
		local6_ScpTyp_2241 = 0;
		__debugInfo = "1046:\src\CompilerPasses\Parser.gbas";
		local9_Important_2242 = 0;
		__debugInfo = "1047:\src\CompilerPasses\Parser.gbas";
		{
			var local17___SelectHelper25__2243 = "";
			__debugInfo = "1047:\src\CompilerPasses\Parser.gbas";
			local17___SelectHelper25__2243 = local12_CloseStr_Str_ref_2239[0];
			__debugInfo = "1073:\src\CompilerPasses\Parser.gbas";
			if ((((local17___SelectHelper25__2243) === ("ENDIF")) ? 1 : 0)) {
				__debugInfo = "1049:\src\CompilerPasses\Parser.gbas";
				local6_ScpTyp_2241 = ~~(1);
				__debugInfo = "1049:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper25__2243) === ("ENDSELECT")) ? 1 : 0)) {
				__debugInfo = "1051:\src\CompilerPasses\Parser.gbas";
				local6_ScpTyp_2241 = ~~(6);
				__debugInfo = "1051:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper25__2243) === ("WEND")) ? 1 : 0)) {
				__debugInfo = "1053:\src\CompilerPasses\Parser.gbas";
				local6_ScpTyp_2241 = ~~(3);
				__debugInfo = "1053:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper25__2243) === ("UNTIL")) ? 1 : 0)) {
				__debugInfo = "1055:\src\CompilerPasses\Parser.gbas";
				local6_ScpTyp_2241 = ~~(3);
				__debugInfo = "1055:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper25__2243) === ("NEXT")) ? 1 : 0)) {
				__debugInfo = "1057:\src\CompilerPasses\Parser.gbas";
				local6_ScpTyp_2241 = ~~(3);
				__debugInfo = "1057:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper25__2243) === ("ENDFUNCTION")) ? 1 : 0)) {
				__debugInfo = "1059:\src\CompilerPasses\Parser.gbas";
				local6_ScpTyp_2241 = ~~(2);
				__debugInfo = "1060:\src\CompilerPasses\Parser.gbas";
				local9_Important_2242 = 1;
				__debugInfo = "1059:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper25__2243) === ("ENDSUB")) ? 1 : 0)) {
				__debugInfo = "1062:\src\CompilerPasses\Parser.gbas";
				local6_ScpTyp_2241 = ~~(2);
				__debugInfo = "1063:\src\CompilerPasses\Parser.gbas";
				local9_Important_2242 = 1;
				__debugInfo = "1062:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper25__2243) === ("CATCH")) ? 1 : 0)) {
				__debugInfo = "1065:\src\CompilerPasses\Parser.gbas";
				local6_ScpTyp_2241 = ~~(5);
				__debugInfo = "1065:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper25__2243) === ("FINALLY")) ? 1 : 0)) {
				__debugInfo = "1067:\src\CompilerPasses\Parser.gbas";
				local6_ScpTyp_2241 = ~~(5);
				__debugInfo = "1067:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper25__2243) === ("__EOFFILE__")) ? 1 : 0)) {
				__debugInfo = "1069:\src\CompilerPasses\Parser.gbas";
				local6_ScpTyp_2241 = ~~(4);
				__debugInfo = "1070:\src\CompilerPasses\Parser.gbas";
				local9_Important_2242 = 1;
				__debugInfo = "1069:\src\CompilerPasses\Parser.gbas";
			} else {
				__debugInfo = "1072:\src\CompilerPasses\Parser.gbas";
				func5_Error("Internal error (unknown scope type)", 1071, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1072:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "1047:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "1075:\src\CompilerPasses\Parser.gbas";
		local7_befLoop_2244 = global8_Compiler.attr6_inLoop;
		__debugInfo = "1076:\src\CompilerPasses\Parser.gbas";
		if ((((local6_ScpTyp_2241) === (3)) ? 1 : 0)) {
			__debugInfo = "1076:\src\CompilerPasses\Parser.gbas";
			global8_Compiler.attr6_inLoop = 1;
			__debugInfo = "1076:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "1077:\src\CompilerPasses\Parser.gbas";
		local8_TmpScope_2245 = global8_Compiler.attr12_CurrentScope;
		__debugInfo = "1078:\src\CompilerPasses\Parser.gbas";
		local12_TmpImportant_2246 = global8_Compiler.attr14_ImportantScope;
		__debugInfo = "1079:\src\CompilerPasses\Parser.gbas";
		global8_Compiler.attr12_CurrentScope = func21_CreateScopeExpression(local6_ScpTyp_2241);
		__debugInfo = "1082:\src\CompilerPasses\Parser.gbas";
		if ((((local12_CloseStr_Str_ref_2239[0]) === ("__EOFFILE__")) ? 1 : 0)) {
			__debugInfo = "1081:\src\CompilerPasses\Parser.gbas";
			global8_Compiler.attr9_MainScope = global8_Compiler.attr12_CurrentScope;
			__debugInfo = "1081:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "1086:\src\CompilerPasses\Parser.gbas";
		if (local9_Important_2242) {
			__debugInfo = "1085:\src\CompilerPasses\Parser.gbas";
			global8_Compiler.attr14_ImportantScope = global8_Compiler.attr12_CurrentScope;
			__debugInfo = "1085:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "1097:\src\CompilerPasses\Parser.gbas";
		if (((((((local6_ScpTyp_2241) === (2)) ? 1 : 0)) && ((((param4_func) !== (-(1))) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "1096:\src\CompilerPasses\Parser.gbas";
			var forEachSaver16637 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr6_Params;
			for(var forEachCounter16637 = 0 ; forEachCounter16637 < forEachSaver16637.values.length ; forEachCounter16637++) {
				var local5_param_2247 = forEachSaver16637.values[forEachCounter16637];
			{
					var local4_vari_2248 = pool_TIdentifierVari.alloc();
					__debugInfo = "1091:\src\CompilerPasses\Parser.gbas";
					local4_vari_2248 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local5_param_2247).values[tmpPositionCache][0].clone(/* In Assign */);
					__debugInfo = "1092:\src\CompilerPasses\Parser.gbas";
					local4_vari_2248.attr3_Typ = ~~(1);
					__debugInfo = "1093:\src\CompilerPasses\Parser.gbas";
					func11_AddVariable(local4_vari_2248, 1);
					__debugInfo = "1094:\src\CompilerPasses\Parser.gbas";
					DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
					__debugInfo = "1095:\src\CompilerPasses\Parser.gbas";
					DIMPUSH(global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr10_CopyParams, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
					__debugInfo = "1091:\src\CompilerPasses\Parser.gbas";pool_TIdentifierVari.free(local4_vari_2248);
				}
				forEachSaver16637.values[forEachCounter16637] = local5_param_2247;
			
			};
			__debugInfo = "1096:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "1098:\src\CompilerPasses\Parser.gbas";
		local7_OneLine_2249 = 0;
		__debugInfo = "1102:\src\CompilerPasses\Parser.gbas";
		if (func7_IsToken("THEN")) {
			__debugInfo = "1100:\src\CompilerPasses\Parser.gbas";
			local7_OneLine_2249 = 1;
			__debugInfo = "1101:\src\CompilerPasses\Parser.gbas";
			func5_Match("THEN", 1100, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "1100:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "1103:\src\CompilerPasses\Parser.gbas";
		local13_OCloseStr_Str_2250 = local12_CloseStr_Str_ref_2239[0];
		__debugInfo = "1183:\src\CompilerPasses\Parser.gbas";
		while ((((func7_IsToken(func13_IsClosing_Str(local12_CloseStr_Str_ref_2239, local6_ScpTyp_2241))) === (0)) ? 1 : 0)) {
			__debugInfo = "1105:\src\CompilerPasses\Parser.gbas";
			if ((((func8_EOFParse()) === (0)) ? 1 : 0)) {
				__debugInfo = "1105:\src\CompilerPasses\Parser.gbas";
				func5_Error((("Missing closing: ") + (local12_CloseStr_Str_ref_2239[0])), 1104, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1105:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "1180:\src\CompilerPasses\Parser.gbas";
			{
				var Err_Str = "";
				__debugInfo = "1182:\src\CompilerPasses\Parser.gbas";
				try {
					var local4_Expr_2251 = 0;
					__debugInfo = "1110:\src\CompilerPasses\Parser.gbas";
					local4_Expr_2251 = -(1);
					__debugInfo = "1116:\src\CompilerPasses\Parser.gbas";
					if (func7_IsToken("LET")) {
						__debugInfo = "1112:\src\CompilerPasses\Parser.gbas";
						func5_Match("LET", 1111, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "1115:\src\CompilerPasses\Parser.gbas";
						if ((((func12_IsIdentifier(0, 0)) === (0)) ? 1 : 0)) {
							__debugInfo = "1114:\src\CompilerPasses\Parser.gbas";
							func5_Error("Expecting identifier after LET.", 1113, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "1114:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "1112:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "1122:\src\CompilerPasses\Parser.gbas";
					if (func7_IsToken("GOSUB")) {
						__debugInfo = "1118:\src\CompilerPasses\Parser.gbas";
						func5_Match("GOSUB", 1117, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "1121:\src\CompilerPasses\Parser.gbas";
						if ((((func14_IsFuncExisting(func14_GetCurrent_Str(), 0)) === (0)) ? 1 : 0)) {
							__debugInfo = "1120:\src\CompilerPasses\Parser.gbas";
							func5_Error("Expecting sub after GOSUB.", 1119, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "1120:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "1118:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "1170:\src\CompilerPasses\Parser.gbas";
					if (func9_IsKeyword()) {
						__debugInfo = "1125:\src\CompilerPasses\Parser.gbas";
						local4_Expr_2251 = func7_Keyword();
						__debugInfo = "1125:\src\CompilerPasses\Parser.gbas";
					} else if (func12_IsIdentifier(1, 0)) {
						__debugInfo = "1127:\src\CompilerPasses\Parser.gbas";
						local4_Expr_2251 = func10_Identifier(1);
						__debugInfo = "1127:\src\CompilerPasses\Parser.gbas";
					} else if (func7_IsToken("super")) {
						__debugInfo = "1130:\src\CompilerPasses\Parser.gbas";
						local4_Expr_2251 = func10_Identifier(1);
						__debugInfo = "1130:\src\CompilerPasses\Parser.gbas";
					} else {
						var local3_pos_2252 = 0, local8_Name_Str_2253 = "";
						__debugInfo = "1132:\src\CompilerPasses\Parser.gbas";
						local3_pos_2252 = global8_Compiler.attr11_currentPosi;
						__debugInfo = "1133:\src\CompilerPasses\Parser.gbas";
						local8_Name_Str_2253 = REPLACE_Str(func14_GetCurrent_Str(), "@", "");
						__debugInfo = "1134:\src\CompilerPasses\Parser.gbas";
						func7_GetNext();
						__debugInfo = "1169:\src\CompilerPasses\Parser.gbas";
						if (func7_IsToken(":")) {
							var local3_Scp_2254 = 0;
							__debugInfo = "1136:\src\CompilerPasses\Parser.gbas";
							func5_Match(":", 1135, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "1137:\src\CompilerPasses\Parser.gbas";
							local4_Expr_2251 = func21_CreateLabelExpression(local8_Name_Str_2253);
							__debugInfo = "1138:\src\CompilerPasses\Parser.gbas";
							local3_Scp_2254 = global8_Compiler.attr12_CurrentScope;
							__debugInfo = "1146:\src\CompilerPasses\Parser.gbas";
							do {
								__debugInfo = "1144:\src\CompilerPasses\Parser.gbas";
								var forEachSaver16812 = global5_Exprs_ref[0].arrAccess(local3_Scp_2254).values[tmpPositionCache][0].attr6_Labels;
								for(var forEachCounter16812 = 0 ; forEachCounter16812 < forEachSaver16812.values.length ; forEachCounter16812++) {
									var local3_lbl_2255 = forEachSaver16812.values[forEachCounter16812];
								{
										__debugInfo = "1143:\src\CompilerPasses\Parser.gbas";
										if ((((global5_Exprs_ref[0].arrAccess(local3_lbl_2255).values[tmpPositionCache][0].attr8_Name_Str) === (local8_Name_Str_2253)) ? 1 : 0)) {
											__debugInfo = "1142:\src\CompilerPasses\Parser.gbas";
											func10_ResetError((((("Duplicate label identifier '") + (local8_Name_Str_2253))) + ("'")), local3_pos_2252);
											__debugInfo = "1142:\src\CompilerPasses\Parser.gbas";
										};
										__debugInfo = "1143:\src\CompilerPasses\Parser.gbas";
									}
									forEachSaver16812.values[forEachCounter16812] = local3_lbl_2255;
								
								};
								__debugInfo = "1145:\src\CompilerPasses\Parser.gbas";
								local3_Scp_2254 = global5_Exprs_ref[0].arrAccess(local3_Scp_2254).values[tmpPositionCache][0].attr10_SuperScope;
								__debugInfo = "1144:\src\CompilerPasses\Parser.gbas";
							} while (!(((((((local3_Scp_2254) === (-(1))) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(local3_Scp_2254).values[tmpPositionCache][0].attr6_ScpTyp) === (2)) ? 1 : 0))) ? 1 : 0)));
							__debugInfo = "1148:\src\CompilerPasses\Parser.gbas";
							DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr14_ImportantScope).values[tmpPositionCache][0].attr6_Labels, local4_Expr_2251);
							__debugInfo = "1136:\src\CompilerPasses\Parser.gbas";
						} else {
							__debugInfo = "1153:\src\CompilerPasses\Parser.gbas";
							if (func7_IsToken("[")) {
								__debugInfo = "1151:\src\CompilerPasses\Parser.gbas";
								func5_Match("[", 1150, "src\CompilerPasses\Parser.gbas");
								__debugInfo = "1152:\src\CompilerPasses\Parser.gbas";
								func5_Match("]", 1151, "src\CompilerPasses\Parser.gbas");
								__debugInfo = "1151:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "1168:\src\CompilerPasses\Parser.gbas";
							if ((((func7_IsToken("=")) && (((global6_STRICT) ? 0 : 1))) ? 1 : 0)) {
								__debugInfo = "1156:\src\CompilerPasses\Parser.gbas";
								global8_Compiler.attr11_currentPosi = ((local3_pos_2252) - (1));
								__debugInfo = "1157:\src\CompilerPasses\Parser.gbas";
								func7_GetNext();
								__debugInfo = "1160:\src\CompilerPasses\Parser.gbas";
								func14_ImplicitDefine();
								__debugInfo = "1165:\src\CompilerPasses\Parser.gbas";
								if (func12_IsIdentifier(0, 0)) {
									__debugInfo = "1162:\src\CompilerPasses\Parser.gbas";
									local4_Expr_2251 = func10_Identifier(1);
									__debugInfo = "1162:\src\CompilerPasses\Parser.gbas";
								} else {
									__debugInfo = "1164:\src\CompilerPasses\Parser.gbas";
									func5_Error("Internal error (implicit not created)", 1163, "src\CompilerPasses\Parser.gbas");
									__debugInfo = "1164:\src\CompilerPasses\Parser.gbas";
								};
								__debugInfo = "1156:\src\CompilerPasses\Parser.gbas";
							} else {
								__debugInfo = "1167:\src\CompilerPasses\Parser.gbas";
								func10_ResetError("Invalid command (unknown function, variable or keyword).", local3_pos_2252);
								__debugInfo = "1167:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "1153:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "1132:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "1173:\src\CompilerPasses\Parser.gbas";
					if ((((local4_Expr_2251) !== (-(1))) ? 1 : 0)) {
						__debugInfo = "1172:\src\CompilerPasses\Parser.gbas";
						DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local4_Expr_2251);
						__debugInfo = "1172:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "1175:\src\CompilerPasses\Parser.gbas";
					if (local7_OneLine_2249) {
						__debugInfo = "1175:\src\CompilerPasses\Parser.gbas";
						break;
						__debugInfo = "1175:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "1178:\src\CompilerPasses\Parser.gbas";
					do {
						__debugInfo = "1177:\src\CompilerPasses\Parser.gbas";
						func5_Match("\n", 1176, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "1177:\src\CompilerPasses\Parser.gbas";
					} while (!((((func7_IsToken("\n")) === (0)) ? 1 : 0)));
					__debugInfo = "1110:\src\CompilerPasses\Parser.gbas";
				} catch (Err_Str) {
					if (Err_Str instanceof OTTException) Err_Str = Err_Str.getText(); else throwError(Err_Str);{
						__debugInfo = "1181:\src\CompilerPasses\Parser.gbas";
						func8_FixError();
						__debugInfo = "1181:\src\CompilerPasses\Parser.gbas";
					}
				};
				__debugInfo = "1182:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "1105:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "1185:\src\CompilerPasses\Parser.gbas";
		if (((((((local7_OneLine_2249) === (0)) ? 1 : 0)) && ((((local12_CloseStr_Str_ref_2239[0]) === (local13_OCloseStr_Str_2250)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "1185:\src\CompilerPasses\Parser.gbas";
			func5_Match(unref(local12_CloseStr_Str_ref_2239[0]), 1184, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "1185:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "1186:\src\CompilerPasses\Parser.gbas";
		local7_MyScope_2257 = global8_Compiler.attr12_CurrentScope;
		__debugInfo = "1187:\src\CompilerPasses\Parser.gbas";
		global8_Compiler.attr12_CurrentScope = ~~(local8_TmpScope_2245);
		__debugInfo = "1188:\src\CompilerPasses\Parser.gbas";
		global8_Compiler.attr6_inLoop = local7_befLoop_2244;
		__debugInfo = "1192:\src\CompilerPasses\Parser.gbas";
		if (local9_Important_2242) {
			__debugInfo = "1191:\src\CompilerPasses\Parser.gbas";
			global8_Compiler.attr14_ImportantScope = local12_TmpImportant_2246;
			__debugInfo = "1191:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "1194:\src\CompilerPasses\Parser.gbas";
		return tryClone(local7_MyScope_2257);
		__debugInfo = "1195:\src\CompilerPasses\Parser.gbas";
		return 0;
		__debugInfo = "1045:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func5_Scope = window['func5_Scope'];
window['func10_ResetError'] = function(param7_err_Str, param3_pos) {
	stackPush("function: ResetError", __debugInfo);
	try {
		var local3_tmp_2260 = 0.0;
		__debugInfo = "1198:\src\CompilerPasses\Parser.gbas";
		local3_tmp_2260 = global8_Compiler.attr11_currentPosi;
		__debugInfo = "1200:\src\CompilerPasses\Parser.gbas";
		global8_Compiler.attr11_currentPosi = param3_pos;
		__debugInfo = "1203:\src\CompilerPasses\Parser.gbas";
		{
			var Ex_Str = "";
			__debugInfo = "1206:\src\CompilerPasses\Parser.gbas";
			try {
				__debugInfo = "1202:\src\CompilerPasses\Parser.gbas";
				func5_Error(param7_err_Str, 1201, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1202:\src\CompilerPasses\Parser.gbas";
			} catch (Ex_Str) {
				if (Ex_Str instanceof OTTException) Ex_Str = Ex_Str.getText(); else throwError(Ex_Str);{
					__debugInfo = "1204:\src\CompilerPasses\Parser.gbas";
					global8_Compiler.attr11_currentPosi = ~~(local3_tmp_2260);
					__debugInfo = "1205:\src\CompilerPasses\Parser.gbas";
					throw new OTTException(Ex_Str, "\src\CompilerPasses\Parser.gbas", 1205);
					__debugInfo = "1204:\src\CompilerPasses\Parser.gbas";
				}
			};
			__debugInfo = "1206:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "1207:\src\CompilerPasses\Parser.gbas";
		return 0;
		__debugInfo = "1198:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func10_ResetError = window['func10_ResetError'];
window['func13_IsClosing_Str'] = function(param12_CloseStr_Str_ref, param6_ScpTyp) {
	stackPush("function: IsClosing_Str", __debugInfo);
	try {
		__debugInfo = "1210:\src\CompilerPasses\Parser.gbas";
		{
			var local17___SelectHelper26__2264 = 0;
			__debugInfo = "1210:\src\CompilerPasses\Parser.gbas";
			local17___SelectHelper26__2264 = param6_ScpTyp;
			__debugInfo = "1219:\src\CompilerPasses\Parser.gbas";
			if ((((local17___SelectHelper26__2264) === (~~(1))) ? 1 : 0)) {
				__debugInfo = "1213:\src\CompilerPasses\Parser.gbas";
				if (func7_IsToken("ELSE")) {
					__debugInfo = "1213:\src\CompilerPasses\Parser.gbas";
					param12_CloseStr_Str_ref[0] = "ELSE";
					__debugInfo = "1213:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1214:\src\CompilerPasses\Parser.gbas";
				if (func7_IsToken("ELSEIF")) {
					__debugInfo = "1214:\src\CompilerPasses\Parser.gbas";
					param12_CloseStr_Str_ref[0] = "ELSEIF";
					__debugInfo = "1214:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1213:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper26__2264) === (~~(6))) ? 1 : 0)) {
				__debugInfo = "1217:\src\CompilerPasses\Parser.gbas";
				if (func7_IsToken("CASE")) {
					__debugInfo = "1217:\src\CompilerPasses\Parser.gbas";
					param12_CloseStr_Str_ref[0] = "CASE";
					__debugInfo = "1217:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1218:\src\CompilerPasses\Parser.gbas";
				if (func7_IsToken("DEFAULT")) {
					__debugInfo = "1218:\src\CompilerPasses\Parser.gbas";
					param12_CloseStr_Str_ref[0] = "DEFAULT";
					__debugInfo = "1218:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1217:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "1210:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "1220:\src\CompilerPasses\Parser.gbas";
		return tryClone(unref(param12_CloseStr_Str_ref[0]));
		__debugInfo = "1221:\src\CompilerPasses\Parser.gbas";
		return "";
		__debugInfo = "1210:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func13_IsClosing_Str = window['func13_IsClosing_Str'];
window['func10_Identifier'] = function(param9_IsCommand) {
	stackPush("function: Identifier", __debugInfo);
	try {
		var local9_PreferVar_2266 = 0, local4_Expr_ref_2267 = [0], local5_IsAcc_2268 = 0;
		__debugInfo = "1225:\src\CompilerPasses\Parser.gbas";
		local9_PreferVar_2266 = 0;
		__debugInfo = "1226:\src\CompilerPasses\Parser.gbas";
		if ((((func7_IsToken("LOCAL")) && ((((param9_IsCommand) === (0)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "1226:\src\CompilerPasses\Parser.gbas";
			local9_PreferVar_2266 = 1;
			__debugInfo = "1226:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "1227:\src\CompilerPasses\Parser.gbas";
		if ((((func7_IsToken("GLOBAL")) && ((((param9_IsCommand) === (0)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "1227:\src\CompilerPasses\Parser.gbas";
			local9_PreferVar_2266 = -(1);
			__debugInfo = "1227:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "1230:\src\CompilerPasses\Parser.gbas";
		if ((((local9_PreferVar_2266) !== (0)) ? 1 : 0)) {
			__debugInfo = "1230:\src\CompilerPasses\Parser.gbas";
			func7_GetNext();
			__debugInfo = "1230:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "1232:\src\CompilerPasses\Parser.gbas";
		local4_Expr_ref_2267[0] = -(1);
		__debugInfo = "1233:\src\CompilerPasses\Parser.gbas";
		local5_IsAcc_2268 = 0;
		__debugInfo = "1248:\src\CompilerPasses\Parser.gbas";
		if (func7_IsToken("super")) {
			__debugInfo = "1235:\src\CompilerPasses\Parser.gbas";
			func5_Match("super", 1234, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "1247:\src\CompilerPasses\Parser.gbas";
			if (((((((global8_Compiler.attr11_currentFunc) !== (-(1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType) !== (-(1))) ? 1 : 0))) ? 1 : 0)) {
				var local3_typ_2269 = 0;
				__debugInfo = "1236:\src\CompilerPasses\Parser.gbas";
				local3_typ_2269 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType;
				__debugInfo = "1244:\src\CompilerPasses\Parser.gbas";
				if ((((global8_Compiler.attr5_Types_ref[0].arrAccess(local3_typ_2269).values[tmpPositionCache][0].attr9_Extending) !== (-(1))) ? 1 : 0)) {
					__debugInfo = "1239:\src\CompilerPasses\Parser.gbas";
					local4_Expr_ref_2267[0] = func21_CreateSuperExpression(global8_Compiler.attr5_Types_ref[0].arrAccess(local3_typ_2269).values[tmpPositionCache][0].attr9_Extending);
					__debugInfo = "1240:\src\CompilerPasses\Parser.gbas";
					func5_Match(".", 1239, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1241:\src\CompilerPasses\Parser.gbas";
					local5_IsAcc_2268 = 1;
					__debugInfo = "1239:\src\CompilerPasses\Parser.gbas";
				} else {
					__debugInfo = "1243:\src\CompilerPasses\Parser.gbas";
					func5_Error("There is no super class/type", 1242, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1243:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1236:\src\CompilerPasses\Parser.gbas";
			} else {
				__debugInfo = "1246:\src\CompilerPasses\Parser.gbas";
				func5_Error("Super has to be in method", 1245, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1246:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "1235:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "1273:\src\CompilerPasses\Parser.gbas";
		if ((((func6_IsType("")) && (((func12_IsIdentifier(0, 0)) ? 0 : 1))) ? 1 : 0)) {
			var local4_posi_2270 = 0.0, local7_typ_Str_2271 = "";
			__debugInfo = "1251:\src\CompilerPasses\Parser.gbas";
			local4_posi_2270 = global8_Compiler.attr11_currentPosi;
			__debugInfo = "1252:\src\CompilerPasses\Parser.gbas";
			local7_typ_Str_2271 = func14_GetCurrent_Str();
			__debugInfo = "1253:\src\CompilerPasses\Parser.gbas";
			func7_GetNext();
			__debugInfo = "1272:\src\CompilerPasses\Parser.gbas";
			if (func7_IsToken("(")) {
				__debugInfo = "1255:\src\CompilerPasses\Parser.gbas";
				func5_Match("(", 1254, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1256:\src\CompilerPasses\Parser.gbas";
				local4_Expr_ref_2267[0] = func10_Expression(0);
				__debugInfo = "1257:\src\CompilerPasses\Parser.gbas";
				func5_Match(")", 1256, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1268:\src\CompilerPasses\Parser.gbas";
				if ((((func6_IsType(global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2267[0]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str)) && ((((global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2267[0]).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0))) ? 1 : 0)) {
					__debugInfo = "1259:\src\CompilerPasses\Parser.gbas";
					local4_Expr_ref_2267[0] = func14_CreateCast2Obj(local7_typ_Str_2271, unref(local4_Expr_ref_2267[0]));
					__debugInfo = "1265:\src\CompilerPasses\Parser.gbas";
					if (func7_IsToken(".")) {
						__debugInfo = "1261:\src\CompilerPasses\Parser.gbas";
						func5_Match(".", 1260, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "1262:\src\CompilerPasses\Parser.gbas";
						local5_IsAcc_2268 = 1;
						__debugInfo = "1261:\src\CompilerPasses\Parser.gbas";
					} else {
						__debugInfo = "1264:\src\CompilerPasses\Parser.gbas";
						return tryClone(unref(local4_Expr_ref_2267[0]));
						__debugInfo = "1264:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "1259:\src\CompilerPasses\Parser.gbas";
				} else {
					__debugInfo = "1267:\src\CompilerPasses\Parser.gbas";
					func5_Error("Cannot cast non TYPE or array", 1266, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1267:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1255:\src\CompilerPasses\Parser.gbas";
			} else {
				__debugInfo = "1271:\src\CompilerPasses\Parser.gbas";
				global8_Compiler.attr11_currentPosi = ~~(local4_posi_2270);
				__debugInfo = "1271:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "1251:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "1441:\src\CompilerPasses\Parser.gbas";
		do {
			var local8_Name_Str_2272 = "", local9_SuperExpr_ref_2273 = [0], local5_Varis_2274 = pool_array.alloc(0), local5_Found_2275 = 0;
			__debugInfo = "1276:\src\CompilerPasses\Parser.gbas";
			local8_Name_Str_2272 = func17_CleanVariable_Str(func14_GetCurrent_Str());
			__debugInfo = "1277:\src\CompilerPasses\Parser.gbas";
			func7_GetNext();
			__debugInfo = "1281:\src\CompilerPasses\Parser.gbas";
			if ((((func7_IsToken("%")) || (func7_IsToken("%"))) ? 1 : 0)) {
				__debugInfo = "1280:\src\CompilerPasses\Parser.gbas";
				func7_GetNext();
				__debugInfo = "1280:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "1283:\src\CompilerPasses\Parser.gbas";
			local9_SuperExpr_ref_2273[0] = local4_Expr_ref_2267[0];
			__debugInfo = "1294:\src\CompilerPasses\Parser.gbas";
			if ((((local4_Expr_ref_2267[0]) === (-(1))) ? 1 : 0)) {
				__debugInfo = "1288:\src\CompilerPasses\Parser.gbas";
				func8_GetVaris(unref(local5_Varis_2274), -(1), local9_PreferVar_2266);
				__debugInfo = "1289:\src\CompilerPasses\Parser.gbas";
				local9_PreferVar_2266 = 0;
				__debugInfo = "1288:\src\CompilerPasses\Parser.gbas";
			} else {
				__debugInfo = "1292:\src\CompilerPasses\Parser.gbas";
				if ((((func6_IsType(global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2267[0]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str)) === (0)) ? 1 : 0)) {
					__debugInfo = "1292:\src\CompilerPasses\Parser.gbas";
					func5_Error((((("Expecting type, got primitive datatype '") + (global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2267[0]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) + ("'")), 1291, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1292:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1293:\src\CompilerPasses\Parser.gbas";
				local5_Varis_2274 = global8_LastType.attr10_Attributes.clone(/* In Assign */);
				__debugInfo = "1292:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "1296:\src\CompilerPasses\Parser.gbas";
			local5_Found_2275 = 0;
			__debugInfo = "1328:\src\CompilerPasses\Parser.gbas";
			var forEachSaver17552 = local5_Varis_2274;
			for(var forEachCounter17552 = 0 ; forEachCounter17552 < forEachSaver17552.values.length ; forEachCounter17552++) {
				var local4_Vari_2276 = forEachSaver17552.values[forEachCounter17552];
			{
					__debugInfo = "1327:\src\CompilerPasses\Parser.gbas";
					if ((((local8_Name_Str_2272) === (global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Vari_2276).values[tmpPositionCache][0].attr8_Name_Str)) ? 1 : 0)) {
						__debugInfo = "1323:\src\CompilerPasses\Parser.gbas";
						if ((((((((((global8_Compiler.attr11_currentFunc) !== (-(1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType) !== (-(1))) ? 1 : 0))) ? 1 : 0)) && ((((local4_Expr_ref_2267[0]) === (-(1))) ? 1 : 0))) ? 1 : 0)) {
							var local13_IsNotImplicit_2277 = 0;
							__debugInfo = "1303:\src\CompilerPasses\Parser.gbas";
							local13_IsNotImplicit_2277 = 0;
							__debugInfo = "1309:\src\CompilerPasses\Parser.gbas";
							var forEachSaver17493 = local5_Varis_2274;
							for(var forEachCounter17493 = 0 ; forEachCounter17493 < forEachSaver17493.values.length ; forEachCounter17493++) {
								var local9_OtherVari_2278 = forEachSaver17493.values[forEachCounter17493];
							{
									__debugInfo = "1308:\src\CompilerPasses\Parser.gbas";
									if ((((((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local9_OtherVari_2278).values[tmpPositionCache][0].attr8_Name_Str) === (local8_Name_Str_2272)) ? 1 : 0)) && ((((((((((((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local9_OtherVari_2278).values[tmpPositionCache][0].attr3_Typ) === (1)) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local9_OtherVari_2278).values[tmpPositionCache][0].attr3_Typ) === (5)) ? 1 : 0))) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local9_OtherVari_2278).values[tmpPositionCache][0].attr3_Typ) === (4)) ? 1 : 0))) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local9_OtherVari_2278).values[tmpPositionCache][0].attr3_Typ) === (7)) ? 1 : 0))) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local9_OtherVari_2278).values[tmpPositionCache][0].attr3_Typ) === (6)) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) && ((((local9_OtherVari_2278) !== (local4_Vari_2276)) ? 1 : 0))) ? 1 : 0)) {
										__debugInfo = "1306:\src\CompilerPasses\Parser.gbas";
										local13_IsNotImplicit_2277 = 1;
										__debugInfo = "1307:\src\CompilerPasses\Parser.gbas";
										break;
										__debugInfo = "1306:\src\CompilerPasses\Parser.gbas";
									};
									__debugInfo = "1308:\src\CompilerPasses\Parser.gbas";
								}
								forEachSaver17493.values[forEachCounter17493] = local9_OtherVari_2278;
							
							};
							__debugInfo = "1322:\src\CompilerPasses\Parser.gbas";
							if (((local13_IsNotImplicit_2277) ? 0 : 1)) {
								var alias3_Typ_ref_2279 = [pool_TIdentifierType.alloc()];
								__debugInfo = "1312:\src\CompilerPasses\Parser.gbas";
								alias3_Typ_ref_2279 = global8_Compiler.attr5_Types_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType).values[tmpPositionCache] /* ALIAS */;
								__debugInfo = "1319:\src\CompilerPasses\Parser.gbas";
								var forEachSaver17538 = alias3_Typ_ref_2279[0].attr10_Attributes;
								for(var forEachCounter17538 = 0 ; forEachCounter17538 < forEachSaver17538.values.length ; forEachCounter17538++) {
									var local1_A_2280 = forEachSaver17538.values[forEachCounter17538];
								{
										__debugInfo = "1318:\src\CompilerPasses\Parser.gbas";
										if ((((local4_Vari_2276) === (local1_A_2280)) ? 1 : 0)) {
											__debugInfo = "1316:\src\CompilerPasses\Parser.gbas";
											local9_SuperExpr_ref_2273[0] = func24_CreateVariableExpression(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr7_SelfVar);
											__debugInfo = "1317:\src\CompilerPasses\Parser.gbas";
											break;
											__debugInfo = "1316:\src\CompilerPasses\Parser.gbas";
										};
										__debugInfo = "1318:\src\CompilerPasses\Parser.gbas";
									}
									forEachSaver17538.values[forEachCounter17538] = local1_A_2280;
								
								};
								__debugInfo = "1312:\src\CompilerPasses\Parser.gbas";pool_TIdentifierType.free(alias3_Typ_ref_2279);
							} else {
								__debugInfo = "1321:\src\CompilerPasses\Parser.gbas";
								continue;
								__debugInfo = "1321:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "1303:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "1324:\src\CompilerPasses\Parser.gbas";
						local4_Expr_ref_2267[0] = func24_CreateVariableExpression(local4_Vari_2276);
						__debugInfo = "1325:\src\CompilerPasses\Parser.gbas";
						local5_Found_2275 = 1;
						__debugInfo = "1326:\src\CompilerPasses\Parser.gbas";
						break;
						__debugInfo = "1323:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "1327:\src\CompilerPasses\Parser.gbas";
				}
				forEachSaver17552.values[forEachCounter17552] = local4_Vari_2276;
			
			};
			__debugInfo = "1337:\src\CompilerPasses\Parser.gbas";
			while ((((func7_IsToken("(")) && (local5_Found_2275)) ? 1 : 0)) {
				var local4_func_2281 = 0;
				__debugInfo = "1330:\src\CompilerPasses\Parser.gbas";
				local4_func_2281 = func14_SearchPrototyp(global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2267[0]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str);
				__debugInfo = "1336:\src\CompilerPasses\Parser.gbas";
				if ((((local4_func_2281) !== (-(1))) ? 1 : 0)) {
					var local6_Params_2282 = pool_array.alloc(0);
					__debugInfo = "1333:\src\CompilerPasses\Parser.gbas";
					func13_ParseFuncCall(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local4_func_2281).values[tmpPositionCache][0].attr8_datatype, unref(local6_Params_2282), param9_IsCommand);
					__debugInfo = "1335:\src\CompilerPasses\Parser.gbas";
					local4_Expr_ref_2267[0] = func25_CreateProtoCallExpression(unref(local4_Expr_ref_2267[0]), unref(local6_Params_2282));
					__debugInfo = "1333:\src\CompilerPasses\Parser.gbas";pool_array.free(local6_Params_2282);
				};
				__debugInfo = "1330:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "1410:\src\CompilerPasses\Parser.gbas";
			if ((((local5_Found_2275) === (0)) ? 1 : 0)) {
				__debugInfo = "1384:\src\CompilerPasses\Parser.gbas";
				if ((((local4_Expr_ref_2267[0]) !== (-(1))) ? 1 : 0)) {
					var local5_typId_2283 = 0;
					__debugInfo = "1340:\src\CompilerPasses\Parser.gbas";
					func6_IsType(global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2267[0]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str);
					__debugInfo = "1341:\src\CompilerPasses\Parser.gbas";
					if (global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2267[0]).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) {
						__debugInfo = "1341:\src\CompilerPasses\Parser.gbas";
						func5_Error("Cannot access to array.", 1340, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "1341:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "1343:\src\CompilerPasses\Parser.gbas";
					local5_typId_2283 = global8_LastType.attr2_ID;
					__debugInfo = "1357:\src\CompilerPasses\Parser.gbas";
					while ((((local5_typId_2283) !== (-(1))) ? 1 : 0)) {
						__debugInfo = "1354:\src\CompilerPasses\Parser.gbas";
						var forEachSaver17695 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_2283).values[tmpPositionCache][0].attr7_Methods;
						for(var forEachCounter17695 = 0 ; forEachCounter17695 < forEachSaver17695.values.length ; forEachCounter17695++) {
							var local1_M_2284 = forEachSaver17695.values[forEachCounter17695];
						{
								__debugInfo = "1353:\src\CompilerPasses\Parser.gbas";
								if ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local1_M_2284).values[tmpPositionCache][0].attr8_Name_Str) === (local8_Name_Str_2272)) ? 1 : 0)) {
									__debugInfo = "1351:\src\CompilerPasses\Parser.gbas";
									if (((local5_Found_2275) ? 0 : 1)) {
										var local1_a_2285 = 0;
										__debugInfo = "1349:\src\CompilerPasses\Parser.gbas";
										local1_a_2285 = func19_ParseIdentifierFunc(local4_Expr_ref_2267, local9_SuperExpr_ref_2273, param9_IsCommand, local8_Name_Str_2272, local1_M_2284);
										__debugInfo = "1350:\src\CompilerPasses\Parser.gbas";
										if ((((local1_a_2285) !== (-(1))) ? 1 : 0)) {
											__debugInfo = "1350:\src\CompilerPasses\Parser.gbas";
											return tryClone(local1_a_2285);
											__debugInfo = "1350:\src\CompilerPasses\Parser.gbas";
										};
										__debugInfo = "1349:\src\CompilerPasses\Parser.gbas";
									};
									__debugInfo = "1352:\src\CompilerPasses\Parser.gbas";
									local5_Found_2275 = 1;
									__debugInfo = "1351:\src\CompilerPasses\Parser.gbas";
								};
								__debugInfo = "1353:\src\CompilerPasses\Parser.gbas";
							}
							forEachSaver17695.values[forEachCounter17695] = local1_M_2284;
						
						};
						__debugInfo = "1356:\src\CompilerPasses\Parser.gbas";
						local5_typId_2283 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_2283).values[tmpPositionCache][0].attr9_Extending;
						__debugInfo = "1354:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "1340:\src\CompilerPasses\Parser.gbas";
				} else {
					var local3_Val_ref_2286 = [0];
					__debugInfo = "1383:\src\CompilerPasses\Parser.gbas";
					if ((global8_Compiler.attr11_GlobalFuncs).GetValue(local8_Name_Str_2272, local3_Val_ref_2286)) {
						var local1_a_2287 = 0;
						__debugInfo = "1362:\src\CompilerPasses\Parser.gbas";
						local1_a_2287 = func19_ParseIdentifierFunc(local4_Expr_ref_2267, local9_SuperExpr_ref_2273, param9_IsCommand, local8_Name_Str_2272, unref(local3_Val_ref_2286[0]));
						__debugInfo = "1363:\src\CompilerPasses\Parser.gbas";
						if ((((local1_a_2287) !== (-(1))) ? 1 : 0)) {
							__debugInfo = "1363:\src\CompilerPasses\Parser.gbas";
							return tryClone(local1_a_2287);
							__debugInfo = "1363:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "1364:\src\CompilerPasses\Parser.gbas";
						local5_Found_2275 = 1;
						__debugInfo = "1362:\src\CompilerPasses\Parser.gbas";
					} else if (((((((global8_Compiler.attr11_currentFunc) !== (-(1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType) !== (-(1))) ? 1 : 0))) ? 1 : 0)) {
						var alias3_Typ_ref_2288 = [pool_TIdentifierType.alloc()], local5_typId_2289 = 0;
						__debugInfo = "1367:\src\CompilerPasses\Parser.gbas";
						alias3_Typ_ref_2288 = global8_Compiler.attr5_Types_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType).values[tmpPositionCache] /* ALIAS */;
						__debugInfo = "1368:\src\CompilerPasses\Parser.gbas";
						local5_typId_2289 = alias3_Typ_ref_2288[0].attr2_ID;
						__debugInfo = "1382:\src\CompilerPasses\Parser.gbas";
						while ((((local5_typId_2289) !== (-(1))) ? 1 : 0)) {
							__debugInfo = "1379:\src\CompilerPasses\Parser.gbas";
							var forEachSaver17838 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_2289).values[tmpPositionCache][0].attr7_Methods;
							for(var forEachCounter17838 = 0 ; forEachCounter17838 < forEachSaver17838.values.length ; forEachCounter17838++) {
								var local1_M_2290 = forEachSaver17838.values[forEachCounter17838];
							{
									__debugInfo = "1378:\src\CompilerPasses\Parser.gbas";
									if ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local1_M_2290).values[tmpPositionCache][0].attr8_Name_Str) === (local8_Name_Str_2272)) ? 1 : 0)) {
										__debugInfo = "1375:\src\CompilerPasses\Parser.gbas";
										if (((local5_Found_2275) ? 0 : 1)) {
											var local1_a_2291 = 0;
											__debugInfo = "1373:\src\CompilerPasses\Parser.gbas";
											local1_a_2291 = func19_ParseIdentifierFunc(local4_Expr_ref_2267, local9_SuperExpr_ref_2273, param9_IsCommand, local8_Name_Str_2272, local1_M_2290);
											__debugInfo = "1374:\src\CompilerPasses\Parser.gbas";
											if ((((local1_a_2291) !== (-(1))) ? 1 : 0)) {
												__debugInfo = "1374:\src\CompilerPasses\Parser.gbas";
												return tryClone(local1_a_2291);
												__debugInfo = "1374:\src\CompilerPasses\Parser.gbas";
											};
											__debugInfo = "1373:\src\CompilerPasses\Parser.gbas";
										};
										__debugInfo = "1377:\src\CompilerPasses\Parser.gbas";
										local5_Found_2275 = 1;
										__debugInfo = "1375:\src\CompilerPasses\Parser.gbas";
									};
									__debugInfo = "1378:\src\CompilerPasses\Parser.gbas";
								}
								forEachSaver17838.values[forEachCounter17838] = local1_M_2290;
							
							};
							__debugInfo = "1381:\src\CompilerPasses\Parser.gbas";
							local5_typId_2289 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_2289).values[tmpPositionCache][0].attr9_Extending;
							__debugInfo = "1379:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "1367:\src\CompilerPasses\Parser.gbas";pool_TIdentifierType.free(alias3_Typ_ref_2288);
					};
					__debugInfo = "1383:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1394:\src\CompilerPasses\Parser.gbas";
				while ((((func7_IsToken("(")) && (local5_Found_2275)) ? 1 : 0)) {
					var local4_func_2292 = 0;
					__debugInfo = "1387:\src\CompilerPasses\Parser.gbas";
					local4_func_2292 = func14_SearchPrototyp(global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2267[0]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str);
					__debugInfo = "1393:\src\CompilerPasses\Parser.gbas";
					if ((((local4_func_2292) !== (-(1))) ? 1 : 0)) {
						var local6_Params_2293 = pool_array.alloc(0);
						__debugInfo = "1390:\src\CompilerPasses\Parser.gbas";
						func13_ParseFuncCall(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local4_func_2292).values[tmpPositionCache][0].attr8_datatype, unref(local6_Params_2293), param9_IsCommand);
						__debugInfo = "1392:\src\CompilerPasses\Parser.gbas";
						local4_Expr_ref_2267[0] = func25_CreateProtoCallExpression(unref(local4_Expr_ref_2267[0]), unref(local6_Params_2293));
						__debugInfo = "1390:\src\CompilerPasses\Parser.gbas";pool_array.free(local6_Params_2293);
					};
					__debugInfo = "1387:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1409:\src\CompilerPasses\Parser.gbas";
				if ((((local5_Found_2275) === (0)) ? 1 : 0)) {
					__debugInfo = "1408:\src\CompilerPasses\Parser.gbas";
					if ((((local4_Expr_ref_2267[0]) !== (-(1))) ? 1 : 0)) {
						var local8_Atts_Str_2294 = "";
						__debugInfo = "1398:\src\CompilerPasses\Parser.gbas";
						local8_Atts_Str_2294 = "";
						__debugInfo = "1403:\src\CompilerPasses\Parser.gbas";
						var forEachSaver17942 = local5_Varis_2274;
						for(var forEachCounter17942 = 0 ; forEachCounter17942 < forEachSaver17942.values.length ; forEachCounter17942++) {
							var local4_Vari_2295 = forEachSaver17942.values[forEachCounter17942];
						{
								__debugInfo = "1402:\src\CompilerPasses\Parser.gbas";
								if ((((local8_Name_Str_2272) === (global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Vari_2295).values[tmpPositionCache][0].attr8_Name_Str)) ? 1 : 0)) {
									__debugInfo = "1401:\src\CompilerPasses\Parser.gbas";
									local8_Atts_Str_2294 = ((((local8_Atts_Str_2294) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Vari_2295).values[tmpPositionCache][0].attr8_Name_Str))) + (", "));
									__debugInfo = "1401:\src\CompilerPasses\Parser.gbas";
								};
								__debugInfo = "1402:\src\CompilerPasses\Parser.gbas";
							}
							forEachSaver17942.values[forEachCounter17942] = local4_Vari_2295;
						
						};
						__debugInfo = "1404:\src\CompilerPasses\Parser.gbas";
						func6_IsType(global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2267[0]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str);
						__debugInfo = "1405:\src\CompilerPasses\Parser.gbas";
						func5_Error((((((((((((("Cannot find attribute '") + (local8_Name_Str_2272))) + ("' in type '"))) + (global8_LastType.attr8_Name_Str))) + ("' possible attributes '"))) + (local8_Atts_Str_2294))) + ("'")), 1404, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "1398:\src\CompilerPasses\Parser.gbas";
					} else {
						__debugInfo = "1407:\src\CompilerPasses\Parser.gbas";
						func5_Error((((("Internal error ") + (local8_Name_Str_2272))) + (" (expected identifier).")), 1406, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "1407:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "1408:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1384:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "1430:\src\CompilerPasses\Parser.gbas";
			if (func7_IsToken("[")) {
				var local4_Dims_2296 = pool_array.alloc(0);
				__debugInfo = "1417:\src\CompilerPasses\Parser.gbas";
				if ((((global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2267[0]).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0)) {
					__debugInfo = "1416:\src\CompilerPasses\Parser.gbas";
					func5_Error("Array access, but this identifier is no array", 1415, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1416:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1427:\src\CompilerPasses\Parser.gbas";
				while (func7_IsToken("[")) {
					var local7_dimExpr_2297 = 0;
					__debugInfo = "1419:\src\CompilerPasses\Parser.gbas";
					func5_Match("[", 1418, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1423:\src\CompilerPasses\Parser.gbas";
					if (func7_IsToken("]")) {
						__debugInfo = "1421:\src\CompilerPasses\Parser.gbas";
						func5_Match("]", 1420, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "1422:\src\CompilerPasses\Parser.gbas";
						break;
						__debugInfo = "1421:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "1424:\src\CompilerPasses\Parser.gbas";
					local7_dimExpr_2297 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 1423, 0);
					__debugInfo = "1425:\src\CompilerPasses\Parser.gbas";
					func5_Match("]", 1424, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1426:\src\CompilerPasses\Parser.gbas";
					DIMPUSH(local4_Dims_2296, local7_dimExpr_2297);
					__debugInfo = "1419:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1429:\src\CompilerPasses\Parser.gbas";
				local4_Expr_ref_2267[0] = func21_CreateArrayExpression(unref(local4_Expr_ref_2267[0]), unref(local4_Dims_2296));
				__debugInfo = "1417:\src\CompilerPasses\Parser.gbas";pool_array.free(local4_Dims_2296);
			};
			__debugInfo = "1432:\src\CompilerPasses\Parser.gbas";
			local4_Expr_ref_2267[0] = func22_CreateAccessExpression(unref(local9_SuperExpr_ref_2273[0]), unref(local4_Expr_ref_2267[0]));
			__debugInfo = "1440:\src\CompilerPasses\Parser.gbas";
			if (func7_IsToken(".")) {
				__debugInfo = "1436:\src\CompilerPasses\Parser.gbas";
				func5_Match(".", 1435, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1437:\src\CompilerPasses\Parser.gbas";
				local5_IsAcc_2268 = 1;
				__debugInfo = "1436:\src\CompilerPasses\Parser.gbas";
			} else {
				__debugInfo = "1439:\src\CompilerPasses\Parser.gbas";
				local5_IsAcc_2268 = 0;
				__debugInfo = "1439:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "1276:\src\CompilerPasses\Parser.gbas";pool_array.free(local5_Varis_2274);
		} while (!((((local5_IsAcc_2268) === (0)) ? 1 : 0)));
		__debugInfo = "1454:\src\CompilerPasses\Parser.gbas";
		if (((((((func7_IsToken("=")) && ((((local4_Expr_ref_2267[0]) !== (-(1))) ? 1 : 0))) ? 1 : 0)) && (param9_IsCommand)) ? 1 : 0)) {
			var local7_tmpData_2298 = pool_TDatatype.alloc();
			__debugInfo = "1445:\src\CompilerPasses\Parser.gbas";
			if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(unref(local4_Expr_ref_2267[0]), 1)).values[tmpPositionCache][0].attr3_Typ) === (6)) ? 1 : 0)) {
				__debugInfo = "1445:\src\CompilerPasses\Parser.gbas";
				func5_Error("Assignment invalid, because of CONSTANT variable.", 1444, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1445:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "1447:\src\CompilerPasses\Parser.gbas";
			if (((((((global5_Exprs_ref[0].arrAccess(func12_GetRightExpr(unref(local4_Expr_ref_2267[0]))).values[tmpPositionCache][0].attr3_Typ) === (6)) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(func12_GetRightExpr(unref(local4_Expr_ref_2267[0]))).values[tmpPositionCache][0].attr3_Typ) === (23)) ? 1 : 0))) ? 1 : 0)) {
				__debugInfo = "1447:\src\CompilerPasses\Parser.gbas";
				func5_Error("Cannot assign to function call.", 1446, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1447:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "1448:\src\CompilerPasses\Parser.gbas";
			func5_Match("=", 1447, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "1449:\src\CompilerPasses\Parser.gbas";
			if ((((param9_IsCommand) === (0)) ? 1 : 0)) {
				__debugInfo = "1449:\src\CompilerPasses\Parser.gbas";
				func5_Error("Assignment is a statement.", 1448, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1449:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "1452:\src\CompilerPasses\Parser.gbas";
			local7_tmpData_2298 = global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2267[0]).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
			__debugInfo = "1453:\src\CompilerPasses\Parser.gbas";
			return tryClone(func22_CreateAssignExpression(unref(local4_Expr_ref_2267[0]), func14_EnsureDatatype(func10_Expression(0), local7_tmpData_2298, 1452, 0)));
			__debugInfo = "1445:\src\CompilerPasses\Parser.gbas";pool_TDatatype.free(local7_tmpData_2298);
		};
		__debugInfo = "1460:\src\CompilerPasses\Parser.gbas";
		if ((((local4_Expr_ref_2267[0]) !== (-(1))) ? 1 : 0)) {
			__debugInfo = "1457:\src\CompilerPasses\Parser.gbas";
			return tryClone(unref(local4_Expr_ref_2267[0]));
			__debugInfo = "1457:\src\CompilerPasses\Parser.gbas";
		} else {
			__debugInfo = "1459:\src\CompilerPasses\Parser.gbas";
			func5_Error("Internal error (Expecting identifier)", 1458, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "1459:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "1461:\src\CompilerPasses\Parser.gbas";
		return 0;
		__debugInfo = "1225:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func10_Identifier = window['func10_Identifier'];
window['func19_ParseIdentifierFunc'] = function(param4_Expr_ref, param9_SuperExpr_ref, param9_IsCommand, param8_Name_Str, param4_func) {
	stackPush("function: ParseIdentifierFunc", __debugInfo);
	try {
		__debugInfo = "1465:\src\CompilerPasses\Parser.gbas";
		if ((((param4_func) === (-(1))) ? 1 : 0)) {
			__debugInfo = "1465:\src\CompilerPasses\Parser.gbas";
			func5_Error("Internal Error (func is -1, ParseIdentifierFunc", 1464, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "1465:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "1482:\src\CompilerPasses\Parser.gbas";
		if ((((((((((global8_Compiler.attr11_currentFunc) !== (-(1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType) !== (-(1))) ? 1 : 0))) ? 1 : 0)) && ((((param4_Expr_ref[0]) === (-(1))) ? 1 : 0))) ? 1 : 0)) {
			var local3_typ_2304 = 0;
			__debugInfo = "1471:\src\CompilerPasses\Parser.gbas";
			local3_typ_2304 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType;
			__debugInfo = "1481:\src\CompilerPasses\Parser.gbas";
			while ((((local3_typ_2304) !== (-(1))) ? 1 : 0)) {
				__debugInfo = "1478:\src\CompilerPasses\Parser.gbas";
				if (((((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr6_MyType) === (local3_typ_2304)) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr6_MyType) !== (-(1))) ? 1 : 0))) ? 1 : 0)) {
					__debugInfo = "1475:\src\CompilerPasses\Parser.gbas";
					param9_SuperExpr_ref[0] = func24_CreateVariableExpression(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr7_SelfVar);
					__debugInfo = "1477:\src\CompilerPasses\Parser.gbas";
					break;
					__debugInfo = "1475:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1480:\src\CompilerPasses\Parser.gbas";
				local3_typ_2304 = global8_Compiler.attr5_Types_ref[0].arrAccess(local3_typ_2304).values[tmpPositionCache][0].attr9_Extending;
				__debugInfo = "1478:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "1471:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "1484:\src\CompilerPasses\Parser.gbas";
		global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr10_PlzCompile = 1;
		__debugInfo = "1501:\src\CompilerPasses\Parser.gbas";
		if (((((((func7_IsToken("(")) === (0)) ? 1 : 0)) && ((((param9_IsCommand) === (0)) ? 1 : 0))) ? 1 : 0)) {
			var local8_datatype_2305 = pool_TDatatype.alloc();
			__debugInfo = "1489:\src\CompilerPasses\Parser.gbas";
			local8_datatype_2305.attr8_Name_Str = param8_Name_Str;
			__debugInfo = "1490:\src\CompilerPasses\Parser.gbas";
			local8_datatype_2305.attr7_IsArray = 0;
			__debugInfo = "1493:\src\CompilerPasses\Parser.gbas";
			global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr15_UsedAsPrototype = 1;
			__debugInfo = "1495:\src\CompilerPasses\Parser.gbas";
			return tryClone(func24_CreateFuncDataExpression(local8_datatype_2305));
			__debugInfo = "1489:\src\CompilerPasses\Parser.gbas";pool_TDatatype.free(local8_datatype_2305);
		} else {
			var local6_Params_2306 = pool_array.alloc(0);
			__debugInfo = "1498:\src\CompilerPasses\Parser.gbas";
			func13_ParseFuncCall(global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr8_datatype, unref(local6_Params_2306), param9_IsCommand);
			__debugInfo = "1500:\src\CompilerPasses\Parser.gbas";
			param4_Expr_ref[0] = func24_CreateFuncCallExpression(global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr2_ID, unref(local6_Params_2306));
			__debugInfo = "1498:\src\CompilerPasses\Parser.gbas";pool_array.free(local6_Params_2306);
		};
		__debugInfo = "1502:\src\CompilerPasses\Parser.gbas";
		return tryClone(-(1));
		__debugInfo = "1503:\src\CompilerPasses\Parser.gbas";
		return 0;
		__debugInfo = "1465:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func19_ParseIdentifierFunc = window['func19_ParseIdentifierFunc'];
window['func13_ParseFuncCall'] = function(param8_datatype, param6_Params, param9_IsCommand) {
	stackPush("function: ParseFuncCall", __debugInfo);
	try {
		var local9_OpBracket_2310 = 0, local4_Find_2311 = 0.0, local12_CloseBracket_2312 = 0;
		__debugInfo = "1506:\src\CompilerPasses\Parser.gbas";
		local9_OpBracket_2310 = func7_IsToken("(");
		__debugInfo = "1519:\src\CompilerPasses\Parser.gbas";
		if ((((param8_datatype.attr8_Name_Str) === ("void")) ? 1 : 0)) {
			__debugInfo = "1510:\src\CompilerPasses\Parser.gbas";
			if (((param9_IsCommand) ? 0 : 1)) {
				__debugInfo = "1509:\src\CompilerPasses\Parser.gbas";
				func5_Error("Void function has to be a command!", 1508, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1509:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "1511:\src\CompilerPasses\Parser.gbas";
			local9_OpBracket_2310 = 0;
			__debugInfo = "1510:\src\CompilerPasses\Parser.gbas";
		} else {
			__debugInfo = "1516:\src\CompilerPasses\Parser.gbas";
			if (local9_OpBracket_2310) {
				__debugInfo = "1516:\src\CompilerPasses\Parser.gbas";
				func5_Match("(", 1515, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1516:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "1516:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "1522:\src\CompilerPasses\Parser.gbas";
		local4_Find_2311 = 0;
		__debugInfo = "1527:\src\CompilerPasses\Parser.gbas";
		while (((((((func7_IsToken("\n")) === (0)) ? 1 : 0)) && ((((func7_IsToken(")")) === (0)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "1524:\src\CompilerPasses\Parser.gbas";
			if (local4_Find_2311) {
				__debugInfo = "1524:\src\CompilerPasses\Parser.gbas";
				func5_Match(",", 1523, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1524:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "1525:\src\CompilerPasses\Parser.gbas";
			DIMPUSH(param6_Params, func10_Expression(0));
			__debugInfo = "1526:\src\CompilerPasses\Parser.gbas";
			local4_Find_2311 = 1;
			__debugInfo = "1524:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "1529:\src\CompilerPasses\Parser.gbas";
		local12_CloseBracket_2312 = func7_IsToken(")");
		__debugInfo = "1530:\src\CompilerPasses\Parser.gbas";
		if (local12_CloseBracket_2312) {
			__debugInfo = "1530:\src\CompilerPasses\Parser.gbas";
			func5_Match(")", 1529, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "1530:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "1534:\src\CompilerPasses\Parser.gbas";
		if ((((local12_CloseBracket_2312) !== (local9_OpBracket_2310)) ? 1 : 0)) {
			__debugInfo = "1533:\src\CompilerPasses\Parser.gbas";
			func5_Error("Brackets are not closed.", 1532, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "1533:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "1535:\src\CompilerPasses\Parser.gbas";
		return 0;
		__debugInfo = "1506:\src\CompilerPasses\Parser.gbas";pool_array.free(param6_Params);
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func13_ParseFuncCall = window['func13_ParseFuncCall'];
window['func7_Keyword'] = function() {
	stackPush("function: Keyword", __debugInfo);
	try {
		__debugInfo = "1540:\src\CompilerPasses\Parser.gbas";
		{
			var local17___SelectHelper27__2313 = 0;
			__debugInfo = "1540:\src\CompilerPasses\Parser.gbas";
			local17___SelectHelper27__2313 = 1;
			__debugInfo = "2238:\src\CompilerPasses\Parser.gbas";
			if ((((local17___SelectHelper27__2313) === (func7_IsToken("CALLBACK"))) ? 1 : 0)) {
				__debugInfo = "1542:\src\CompilerPasses\Parser.gbas";
				func5_Match("CALLBACK", 1541, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1543:\src\CompilerPasses\Parser.gbas";
				func7_Keyword();
				__debugInfo = "1542:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2313) === (func7_IsToken("NATIVE"))) ? 1 : 0)) {
				__debugInfo = "1545:\src\CompilerPasses\Parser.gbas";
				func5_Match("NATIVE", 1544, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1546:\src\CompilerPasses\Parser.gbas";
				func10_SkipTokens("NATIVE", "\n", "");
				__debugInfo = "1545:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2313) === (func7_IsToken("ABSTRACT"))) ? 1 : 0)) {
				__debugInfo = "1548:\src\CompilerPasses\Parser.gbas";
				func5_Match("ABSTRACT", 1547, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1549:\src\CompilerPasses\Parser.gbas";
				func10_SkipTokens("ABSTRACT", "\n", "");
				__debugInfo = "1548:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2313) === (func7_IsToken("FUNCTION"))) ? 1 : 0)) {
				__debugInfo = "1551:\src\CompilerPasses\Parser.gbas";
				func10_SkipTokens("FUNCTION", "ENDFUNCTION", "");
				__debugInfo = "1551:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2313) === (func7_IsToken("SUB"))) ? 1 : 0)) {
				__debugInfo = "1553:\src\CompilerPasses\Parser.gbas";
				func10_SkipTokens("SUB", "ENDSUB", "");
				__debugInfo = "1553:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2313) === (func7_IsToken("TYPE"))) ? 1 : 0)) {
				__debugInfo = "1555:\src\CompilerPasses\Parser.gbas";
				func10_SkipTokens("TYPE", "ENDTYPE", "");
				__debugInfo = "1555:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2313) === (func7_IsToken("PROTOTYPE"))) ? 1 : 0)) {
				__debugInfo = "1557:\src\CompilerPasses\Parser.gbas";
				func10_SkipTokens("PROTOTYPE", "\n", "");
				__debugInfo = "1557:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2313) === (func7_IsToken("CONSTANT"))) ? 1 : 0)) {
				__debugInfo = "1559:\src\CompilerPasses\Parser.gbas";
				func10_SkipTokens("CONSTANT", "\n", "");
				__debugInfo = "1559:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2313) === (func7_IsToken("GLOBAL"))) ? 1 : 0)) {
				__debugInfo = "1578:\src\CompilerPasses\Parser.gbas";
				do {
					var local7_tmpVari_2314 = pool_TIdentifierVari.alloc();
					__debugInfo = "1566:\src\CompilerPasses\Parser.gbas";
					if (func7_IsToken("GLOBAL")) {
						__debugInfo = "1563:\src\CompilerPasses\Parser.gbas";
						func5_Match("GLOBAL", 1562, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "1563:\src\CompilerPasses\Parser.gbas";
					} else {
						__debugInfo = "1565:\src\CompilerPasses\Parser.gbas";
						func5_Match(",", 1564, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "1565:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "1568:\src\CompilerPasses\Parser.gbas";
					local7_tmpVari_2314 = func7_VariDef(0).clone(/* In Assign */);
					__debugInfo = "1577:\src\CompilerPasses\Parser.gbas";
					var forEachSaver18626 = global8_Compiler.attr7_Globals;
					for(var forEachCounter18626 = 0 ; forEachCounter18626 < forEachSaver18626.values.length ; forEachCounter18626++) {
						var local1_V_2315 = forEachSaver18626.values[forEachCounter18626];
					{
							var alias4_Vari_ref_2316 = [pool_TIdentifierVari.alloc()];
							__debugInfo = "1570:\src\CompilerPasses\Parser.gbas";
							alias4_Vari_ref_2316 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_V_2315).values[tmpPositionCache] /* ALIAS */;
							__debugInfo = "1576:\src\CompilerPasses\Parser.gbas";
							if (((((((alias4_Vari_ref_2316[0].attr8_Name_Str) === (local7_tmpVari_2314.attr8_Name_Str)) ? 1 : 0)) && ((((alias4_Vari_ref_2316[0].attr6_PreDef) !== (-(1))) ? 1 : 0))) ? 1 : 0)) {
								var local7_tmpExpr_2317 = 0;
								__debugInfo = "1572:\src\CompilerPasses\Parser.gbas";
								if ((((global8_Compiler.attr12_CurrentScope) === (-(1))) ? 1 : 0)) {
									__debugInfo = "1572:\src\CompilerPasses\Parser.gbas";
									func5_Error("Internal error (GLOBAL in -1 scope)", 1571, "src\CompilerPasses\Parser.gbas");
									__debugInfo = "1572:\src\CompilerPasses\Parser.gbas";
								};
								__debugInfo = "1573:\src\CompilerPasses\Parser.gbas";
								local7_tmpExpr_2317 = func22_CreateAssignExpression(func24_CreateVariableExpression(alias4_Vari_ref_2316[0].attr2_ID), alias4_Vari_ref_2316[0].attr6_PreDef);
								__debugInfo = "1574:\src\CompilerPasses\Parser.gbas";
								DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local7_tmpExpr_2317);
								__debugInfo = "1575:\src\CompilerPasses\Parser.gbas";
								alias4_Vari_ref_2316[0].attr6_PreDef = -(1);
								__debugInfo = "1572:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "1570:\src\CompilerPasses\Parser.gbas";pool_TIdentifierVari.free(alias4_Vari_ref_2316);
						}
						forEachSaver18626.values[forEachCounter18626] = local1_V_2315;
					
					};
					__debugInfo = "1566:\src\CompilerPasses\Parser.gbas";pool_TIdentifierVari.free(local7_tmpVari_2314);
				} while (!((((func7_IsToken(",")) === (0)) ? 1 : 0)));
				__debugInfo = "1578:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2313) === (func7_IsToken("LOCAL"))) ? 1 : 0)) {
				__debugInfo = "1629:\src\CompilerPasses\Parser.gbas";
				do {
					var local10_DontCreate_2318 = 0;
					__debugInfo = "1585:\src\CompilerPasses\Parser.gbas";
					if (func7_IsToken("LOCAL")) {
						__debugInfo = "1582:\src\CompilerPasses\Parser.gbas";
						func5_Match("LOCAL", 1581, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "1582:\src\CompilerPasses\Parser.gbas";
					} else {
						__debugInfo = "1584:\src\CompilerPasses\Parser.gbas";
						func5_Match(",", 1583, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "1584:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "1588:\src\CompilerPasses\Parser.gbas";
					local10_DontCreate_2318 = 0;
					__debugInfo = "1607:\src\CompilerPasses\Parser.gbas";
					if (func13_IsVarExisting(func17_CleanVariable_Str(func14_GetCurrent_Str()))) {
						var local5_Varis_2319 = pool_array.alloc(0);
						__debugInfo = "1590:\src\CompilerPasses\Parser.gbas";
						local10_DontCreate_2318 = 1;
						__debugInfo = "1593:\src\CompilerPasses\Parser.gbas";
						func8_GetVaris(unref(local5_Varis_2319), -(1), 0);
						__debugInfo = "1601:\src\CompilerPasses\Parser.gbas";
						var forEachSaver18705 = local5_Varis_2319;
						for(var forEachCounter18705 = 0 ; forEachCounter18705 < forEachSaver18705.values.length ; forEachCounter18705++) {
							var local1_V_2320 = forEachSaver18705.values[forEachCounter18705];
						{
								__debugInfo = "1600:\src\CompilerPasses\Parser.gbas";
								if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_V_2320).values[tmpPositionCache][0].attr8_Name_Str) === (func17_CleanVariable_Str(func14_GetCurrent_Str()))) ? 1 : 0)) {
									__debugInfo = "1599:\src\CompilerPasses\Parser.gbas";
									if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_V_2320).values[tmpPositionCache][0].attr3_Typ) === (2)) ? 1 : 0)) {
										__debugInfo = "1597:\src\CompilerPasses\Parser.gbas";
										local10_DontCreate_2318 = 0;
										__debugInfo = "1598:\src\CompilerPasses\Parser.gbas";
										break;
										__debugInfo = "1597:\src\CompilerPasses\Parser.gbas";
									};
									__debugInfo = "1599:\src\CompilerPasses\Parser.gbas";
								};
								__debugInfo = "1600:\src\CompilerPasses\Parser.gbas";
							}
							forEachSaver18705.values[forEachCounter18705] = local1_V_2320;
						
						};
						__debugInfo = "1606:\src\CompilerPasses\Parser.gbas";
						if (local10_DontCreate_2318) {
							var local4_Expr_2321 = 0;
							__debugInfo = "1603:\src\CompilerPasses\Parser.gbas";
							func7_Warning((((("Variable '") + (func14_GetCurrent_Str()))) + ("' already exists...")));
							__debugInfo = "1604:\src\CompilerPasses\Parser.gbas";
							local4_Expr_2321 = func10_Identifier(1);
							__debugInfo = "1605:\src\CompilerPasses\Parser.gbas";
							DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local4_Expr_2321);
							__debugInfo = "1603:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "1590:\src\CompilerPasses\Parser.gbas";pool_array.free(local5_Varis_2319);
					};
					__debugInfo = "1627:\src\CompilerPasses\Parser.gbas";
					if (((local10_DontCreate_2318) ? 0 : 1)) {
						var local4_Vari_2322 = pool_TIdentifierVari.alloc(), local4_PDef_2323 = 0;
						__debugInfo = "1611:\src\CompilerPasses\Parser.gbas";
						local4_Vari_2322 = func7_VariDef(0).clone(/* In Assign */);
						__debugInfo = "1612:\src\CompilerPasses\Parser.gbas";
						local4_Vari_2322.attr3_Typ = ~~(1);
						__debugInfo = "1614:\src\CompilerPasses\Parser.gbas";
						local4_PDef_2323 = -(1);
						__debugInfo = "1618:\src\CompilerPasses\Parser.gbas";
						if ((((local4_Vari_2322.attr6_PreDef) !== (-(1))) ? 1 : 0)) {
							__debugInfo = "1616:\src\CompilerPasses\Parser.gbas";
							local4_PDef_2323 = local4_Vari_2322.attr6_PreDef;
							__debugInfo = "1617:\src\CompilerPasses\Parser.gbas";
							local4_Vari_2322.attr6_PreDef = -(1);
							__debugInfo = "1616:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "1619:\src\CompilerPasses\Parser.gbas";
						func11_AddVariable(local4_Vari_2322, 1);
						__debugInfo = "1620:\src\CompilerPasses\Parser.gbas";
						DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
						__debugInfo = "1626:\src\CompilerPasses\Parser.gbas";
						if ((((local4_PDef_2323) !== (-(1))) ? 1 : 0)) {
							var local7_tmpExpr_2324 = 0;
							__debugInfo = "1623:\src\CompilerPasses\Parser.gbas";
							if ((((global8_Compiler.attr12_CurrentScope) === (-(1))) ? 1 : 0)) {
								__debugInfo = "1623:\src\CompilerPasses\Parser.gbas";
								func5_Error("Internal error (LOCAL in -1 scope)", 1622, "src\CompilerPasses\Parser.gbas");
								__debugInfo = "1623:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "1624:\src\CompilerPasses\Parser.gbas";
							local7_tmpExpr_2324 = func22_CreateAssignExpression(func24_CreateVariableExpression(((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1))), local4_PDef_2323);
							__debugInfo = "1625:\src\CompilerPasses\Parser.gbas";
							DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local7_tmpExpr_2324);
							__debugInfo = "1623:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "1611:\src\CompilerPasses\Parser.gbas";pool_TIdentifierVari.free(local4_Vari_2322);
					};
					__debugInfo = "1585:\src\CompilerPasses\Parser.gbas";
				} while (!((((func7_IsToken(",")) === (0)) ? 1 : 0)));
				__debugInfo = "1629:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2313) === (func7_IsToken("ALIAS"))) ? 1 : 0)) {
				__debugInfo = "1662:\src\CompilerPasses\Parser.gbas";
				do {
					var local4_Vari_2325 = pool_TIdentifierVari.alloc(), local4_PDef_2326 = 0, local7_tmpExpr_2327 = 0;
					__debugInfo = "1637:\src\CompilerPasses\Parser.gbas";
					if (func7_IsToken("ALIAS")) {
						__debugInfo = "1634:\src\CompilerPasses\Parser.gbas";
						func5_Match("ALIAS", 1633, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "1634:\src\CompilerPasses\Parser.gbas";
					} else {
						__debugInfo = "1636:\src\CompilerPasses\Parser.gbas";
						func5_Match(",", 1635, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "1636:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "1638:\src\CompilerPasses\Parser.gbas";
					func14_IsValidVarName();
					__debugInfo = "1640:\src\CompilerPasses\Parser.gbas";
					local4_Vari_2325.attr8_Name_Str = func14_GetCurrent_Str();
					__debugInfo = "1641:\src\CompilerPasses\Parser.gbas";
					local4_Vari_2325.attr3_Typ = ~~(7);
					__debugInfo = "1642:\src\CompilerPasses\Parser.gbas";
					local4_Vari_2325.attr3_ref = 1;
					__debugInfo = "1644:\src\CompilerPasses\Parser.gbas";
					func5_Match(local4_Vari_2325.attr8_Name_Str, 1643, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1645:\src\CompilerPasses\Parser.gbas";
					func5_Match("AS", 1644, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1647:\src\CompilerPasses\Parser.gbas";
					local4_PDef_2326 = func10_Identifier(0);
					__debugInfo = "1648:\src\CompilerPasses\Parser.gbas";
					global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(local4_PDef_2326, 1)).values[tmpPositionCache][0].attr3_ref = 1;
					__debugInfo = "1649:\src\CompilerPasses\Parser.gbas";
					local4_Vari_2325.attr8_datatype = global5_Exprs_ref[0].arrAccess(local4_PDef_2326).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
					__debugInfo = "1652:\src\CompilerPasses\Parser.gbas";
					func11_AddVariable(local4_Vari_2325, 1);
					__debugInfo = "1653:\src\CompilerPasses\Parser.gbas";
					DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
					__debugInfo = "1656:\src\CompilerPasses\Parser.gbas";
					local7_tmpExpr_2327 = func21_CreateAliasExpression(((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)), local4_PDef_2326);
					__debugInfo = "1661:\src\CompilerPasses\Parser.gbas";
					if (func7_IsToken(",")) {
						__debugInfo = "1658:\src\CompilerPasses\Parser.gbas";
						DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local7_tmpExpr_2327);
						__debugInfo = "1658:\src\CompilerPasses\Parser.gbas";
					} else {
						__debugInfo = "1660:\src\CompilerPasses\Parser.gbas";
						return tryClone(local7_tmpExpr_2327);
						__debugInfo = "1660:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "1637:\src\CompilerPasses\Parser.gbas";pool_TIdentifierVari.free(local4_Vari_2325);
				} while (!((((func7_IsToken(",")) === (0)) ? 1 : 0)));
				__debugInfo = "1662:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2313) === (func7_IsToken("STATIC"))) ? 1 : 0)) {
				__debugInfo = "1664:\src\CompilerPasses\Parser.gbas";
				if ((((global8_Compiler.attr11_currentFunc) === (-(1))) ? 1 : 0)) {
					__debugInfo = "1664:\src\CompilerPasses\Parser.gbas";
					func5_Error("Static has to be in a FUNCTION", 1663, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1664:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1680:\src\CompilerPasses\Parser.gbas";
				do {
					var local4_Vari_2328 = pool_TIdentifierVari.alloc();
					__debugInfo = "1671:\src\CompilerPasses\Parser.gbas";
					if (func7_IsToken("STATIC")) {
						__debugInfo = "1668:\src\CompilerPasses\Parser.gbas";
						func5_Match("STATIC", 1667, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "1668:\src\CompilerPasses\Parser.gbas";
					} else {
						__debugInfo = "1670:\src\CompilerPasses\Parser.gbas";
						func5_Match(",", 1669, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "1670:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "1673:\src\CompilerPasses\Parser.gbas";
					local4_Vari_2328 = func7_VariDef(0).clone(/* In Assign */);
					__debugInfo = "1674:\src\CompilerPasses\Parser.gbas";
					local4_Vari_2328.attr3_Typ = ~~(4);
					__debugInfo = "1675:\src\CompilerPasses\Parser.gbas";
					local4_Vari_2328.attr4_func = global8_Compiler.attr11_currentFunc;
					__debugInfo = "1676:\src\CompilerPasses\Parser.gbas";
					func11_AddVariable(local4_Vari_2328, 1);
					__debugInfo = "1677:\src\CompilerPasses\Parser.gbas";
					DIMPUSH(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr7_Statics, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
					__debugInfo = "1678:\src\CompilerPasses\Parser.gbas";
					DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
					__debugInfo = "1671:\src\CompilerPasses\Parser.gbas";pool_TIdentifierVari.free(local4_Vari_2328);
				} while (!((((func7_IsToken(",")) === (0)) ? 1 : 0)));
				__debugInfo = "1664:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2313) === (func7_IsToken("DIMPUSH"))) ? 1 : 0)) {
				var local4_Vari_2329 = 0, local8_datatype_2330 = pool_TDatatype.alloc(), local4_Expr_2331 = 0;
				__debugInfo = "1682:\src\CompilerPasses\Parser.gbas";
				func5_Match("DIMPUSH", 1681, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1683:\src\CompilerPasses\Parser.gbas";
				local4_Vari_2329 = func10_Identifier(0);
				__debugInfo = "1684:\src\CompilerPasses\Parser.gbas";
				if ((((global5_Exprs_ref[0].arrAccess(local4_Vari_2329).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0)) {
					__debugInfo = "1684:\src\CompilerPasses\Parser.gbas";
					func5_Error("DIMPUSH needs array", 1683, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1684:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1685:\src\CompilerPasses\Parser.gbas";
				func5_Match(",", 1684, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1687:\src\CompilerPasses\Parser.gbas";
				local8_datatype_2330 = global5_Exprs_ref[0].arrAccess(local4_Vari_2329).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
				__debugInfo = "1688:\src\CompilerPasses\Parser.gbas";
				local8_datatype_2330.attr7_IsArray = 0;
				__debugInfo = "1690:\src\CompilerPasses\Parser.gbas";
				local4_Expr_2331 = func14_EnsureDatatype(func10_Expression(0), local8_datatype_2330, 1689, 0);
				__debugInfo = "1699:\src\CompilerPasses\Parser.gbas";
				return tryClone(func23_CreateDimpushExpression(local4_Vari_2329, local4_Expr_2331));
				__debugInfo = "1682:\src\CompilerPasses\Parser.gbas";pool_TDatatype.free(local8_datatype_2330);
			} else if ((((local17___SelectHelper27__2313) === (func7_IsToken("DIM"))) ? 1 : 0)) {
				var local3_Arr_2332 = 0;
				__debugInfo = "1701:\src\CompilerPasses\Parser.gbas";
				func5_Match("DIM", 1700, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1702:\src\CompilerPasses\Parser.gbas";
				local3_Arr_2332 = func14_ImplicitDefine();
				__debugInfo = "1705:\src\CompilerPasses\Parser.gbas";
				if ((((local3_Arr_2332) !== (-(1))) ? 1 : 0)) {
					__debugInfo = "1704:\src\CompilerPasses\Parser.gbas";
					global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Arr_2332).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray = 1;
					__debugInfo = "1704:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1723:\src\CompilerPasses\Parser.gbas";
				if (func12_IsIdentifier(0, 0)) {
					var local4_expr_2333 = 0, local5_LExpr_2334 = 0, local4_Dims_2335 = pool_array.alloc(0);
					__debugInfo = "1708:\src\CompilerPasses\Parser.gbas";
					local4_expr_2333 = func10_Identifier(0);
					__debugInfo = "1709:\src\CompilerPasses\Parser.gbas";
					local5_LExpr_2334 = func12_GetRightExpr(local4_expr_2333);
					__debugInfo = "1710:\src\CompilerPasses\Parser.gbas";
					if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(local4_expr_2333, 1)).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0)) {
						__debugInfo = "1710:\src\CompilerPasses\Parser.gbas";
						func5_Error("Array expected.", 1709, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "1710:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "1712:\src\CompilerPasses\Parser.gbas";
					{
						var local17___SelectHelper28__2336 = 0;
						__debugInfo = "1712:\src\CompilerPasses\Parser.gbas";
						local17___SelectHelper28__2336 = global5_Exprs_ref[0].arrAccess(local5_LExpr_2334).values[tmpPositionCache][0].attr3_Typ;
						__debugInfo = "1718:\src\CompilerPasses\Parser.gbas";
						if ((((local17___SelectHelper28__2336) === (~~(13))) ? 1 : 0)) {
							__debugInfo = "1714:\src\CompilerPasses\Parser.gbas";
							local4_Dims_2335 = global5_Exprs_ref[0].arrAccess(local5_LExpr_2334).values[tmpPositionCache][0].attr4_dims.clone(/* In Assign */);
							__debugInfo = "1715:\src\CompilerPasses\Parser.gbas";
							DIM(global5_Exprs_ref[0].arrAccess(local5_LExpr_2334).values[tmpPositionCache][0].attr4_dims, [0], 0);
							__debugInfo = "1714:\src\CompilerPasses\Parser.gbas";
						} else {
							__debugInfo = "1717:\src\CompilerPasses\Parser.gbas";
							func5_Error("Internal error (array not parsed)", 1716, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "1717:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "1712:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "1720:\src\CompilerPasses\Parser.gbas";
					return tryClone(func19_CreateDimExpression(local4_expr_2333, unref(local4_Dims_2335)));
					__debugInfo = "1708:\src\CompilerPasses\Parser.gbas";pool_array.free(local4_Dims_2335);
				} else {
					__debugInfo = "1722:\src\CompilerPasses\Parser.gbas";
					func5_Error("DIM needs identifier", 1721, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1722:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1701:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2313) === (func7_IsToken("REDIM"))) ? 1 : 0)) {
				var local3_Arr_2337 = 0;
				__debugInfo = "1725:\src\CompilerPasses\Parser.gbas";
				func5_Match("REDIM", 1724, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1726:\src\CompilerPasses\Parser.gbas";
				local3_Arr_2337 = func14_ImplicitDefine();
				__debugInfo = "1729:\src\CompilerPasses\Parser.gbas";
				if ((((local3_Arr_2337) !== (-(1))) ? 1 : 0)) {
					__debugInfo = "1728:\src\CompilerPasses\Parser.gbas";
					global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Arr_2337).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray = 1;
					__debugInfo = "1728:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1745:\src\CompilerPasses\Parser.gbas";
				if (func12_IsIdentifier(0, 0)) {
					var local4_expr_2338 = 0, local5_LExpr_2339 = 0, local4_Dims_2340 = pool_array.alloc(0);
					__debugInfo = "1731:\src\CompilerPasses\Parser.gbas";
					local4_expr_2338 = func10_Identifier(0);
					__debugInfo = "1732:\src\CompilerPasses\Parser.gbas";
					local5_LExpr_2339 = func12_GetRightExpr(local4_expr_2338);
					__debugInfo = "1733:\src\CompilerPasses\Parser.gbas";
					if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(local4_expr_2338, 1)).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0)) {
						__debugInfo = "1733:\src\CompilerPasses\Parser.gbas";
						func5_Error("Array expected.", 1732, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "1733:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "1735:\src\CompilerPasses\Parser.gbas";
					{
						var local17___SelectHelper29__2341 = 0;
						__debugInfo = "1735:\src\CompilerPasses\Parser.gbas";
						local17___SelectHelper29__2341 = global5_Exprs_ref[0].arrAccess(local5_LExpr_2339).values[tmpPositionCache][0].attr3_Typ;
						__debugInfo = "1741:\src\CompilerPasses\Parser.gbas";
						if ((((local17___SelectHelper29__2341) === (~~(13))) ? 1 : 0)) {
							__debugInfo = "1737:\src\CompilerPasses\Parser.gbas";
							local4_Dims_2340 = global5_Exprs_ref[0].arrAccess(local5_LExpr_2339).values[tmpPositionCache][0].attr4_dims.clone(/* In Assign */);
							__debugInfo = "1738:\src\CompilerPasses\Parser.gbas";
							DIM(global5_Exprs_ref[0].arrAccess(local5_LExpr_2339).values[tmpPositionCache][0].attr4_dims, [0], 0);
							__debugInfo = "1737:\src\CompilerPasses\Parser.gbas";
						} else {
							__debugInfo = "1740:\src\CompilerPasses\Parser.gbas";
							func5_Error("Internal error (array not parsed)", 1739, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "1740:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "1735:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "1742:\src\CompilerPasses\Parser.gbas";
					return tryClone(func21_CreateReDimExpression(local4_expr_2338, unref(local4_Dims_2340)));
					__debugInfo = "1731:\src\CompilerPasses\Parser.gbas";pool_array.free(local4_Dims_2340);
				} else {
					__debugInfo = "1744:\src\CompilerPasses\Parser.gbas";
					func5_Error("REDIM needs identifier", 1743, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1744:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1725:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2313) === (func7_IsToken("DIMDATA"))) ? 1 : 0)) {
				var local5_Array_2342 = 0, local2_Ex_2343 = pool_array.alloc(0);
				__debugInfo = "1747:\src\CompilerPasses\Parser.gbas";
				func5_Match("DIMDATA", 1746, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1749:\src\CompilerPasses\Parser.gbas";
				local5_Array_2342 = func14_ImplicitDefine();
				__debugInfo = "1755:\src\CompilerPasses\Parser.gbas";
				if ((((local5_Array_2342) !== (-(1))) ? 1 : 0)) {
					__debugInfo = "1751:\src\CompilerPasses\Parser.gbas";
					global8_Compiler.attr5_Varis_ref[0].arrAccess(local5_Array_2342).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray = 1;
					__debugInfo = "1752:\src\CompilerPasses\Parser.gbas";
					local5_Array_2342 = func10_Identifier(0);
					__debugInfo = "1751:\src\CompilerPasses\Parser.gbas";
				} else {
					__debugInfo = "1754:\src\CompilerPasses\Parser.gbas";
					local5_Array_2342 = func10_Expression(0);
					__debugInfo = "1754:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1757:\src\CompilerPasses\Parser.gbas";
				if ((((global5_Exprs_ref[0].arrAccess(local5_Array_2342).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0)) {
					__debugInfo = "1757:\src\CompilerPasses\Parser.gbas";
					func5_Error("DIMDATA needs array, stupid...", 1756, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1757:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1769:\src\CompilerPasses\Parser.gbas";
				while ((((func7_IsToken("\n")) === (0)) ? 1 : 0)) {
					__debugInfo = "1760:\src\CompilerPasses\Parser.gbas";
					func5_Match(",", 1759, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1768:\src\CompilerPasses\Parser.gbas";
					if ((((BOUNDS(local2_Ex_2343, 0)) === (0)) ? 1 : 0)) {
						__debugInfo = "1762:\src\CompilerPasses\Parser.gbas";
						DIMPUSH(local2_Ex_2343, func10_Expression(0));
						__debugInfo = "1762:\src\CompilerPasses\Parser.gbas";
					} else {
						var local7_datatyp_2344 = pool_TDatatype.alloc(), local1_E_2345 = 0;
						__debugInfo = "1765:\src\CompilerPasses\Parser.gbas";
						local7_datatyp_2344 = global5_Exprs_ref[0].arrAccess(local2_Ex_2343.arrAccess(0).values[tmpPositionCache]).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
						__debugInfo = "1766:\src\CompilerPasses\Parser.gbas";
						local1_E_2345 = func14_EnsureDatatype(func10_Expression(0), local7_datatyp_2344, 1765, 0);
						__debugInfo = "1767:\src\CompilerPasses\Parser.gbas";
						DIMPUSH(local2_Ex_2343, local1_E_2345);
						__debugInfo = "1765:\src\CompilerPasses\Parser.gbas";pool_TDatatype.free(local7_datatyp_2344);
					};
					__debugInfo = "1760:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1771:\src\CompilerPasses\Parser.gbas";
				return tryClone(func23_CreateDimDataExpression(local5_Array_2342, unref(local2_Ex_2343)));
				__debugInfo = "1747:\src\CompilerPasses\Parser.gbas";pool_array.free(local2_Ex_2343);
			} else if ((((local17___SelectHelper27__2313) === (func7_IsToken("DELETE"))) ? 1 : 0)) {
				var local11_VarName_Str_2346 = "";
				__debugInfo = "1773:\src\CompilerPasses\Parser.gbas";
				func5_Match("DELETE", 1772, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1774:\src\CompilerPasses\Parser.gbas";
				local11_VarName_Str_2346 = func14_GetCurrent_Str();
				__debugInfo = "1775:\src\CompilerPasses\Parser.gbas";
				if (((((((local11_VarName_Str_2346) !== (global8_Compiler.attr18_currentForEach_Str)) ? 1 : 0)) && ((((local11_VarName_Str_2346) !== ("\n")) ? 1 : 0))) ? 1 : 0)) {
					__debugInfo = "1775:\src\CompilerPasses\Parser.gbas";
					func5_Error((((((((("DELETE, invalid name '") + (local11_VarName_Str_2346))) + ("' expecting '"))) + (global8_Compiler.attr18_currentForEach_Str))) + ("'")), 1774, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1775:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1776:\src\CompilerPasses\Parser.gbas";
				if ((((func7_IsToken("\n")) === (0)) ? 1 : 0)) {
					__debugInfo = "1776:\src\CompilerPasses\Parser.gbas";
					func7_GetNext();
					__debugInfo = "1776:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1777:\src\CompilerPasses\Parser.gbas";
				return tryClone(func22_CreateDeleteExpression());
				__debugInfo = "1773:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2313) === (func7_IsToken("DIMDEL"))) ? 1 : 0)) {
				var local5_Array_2347 = 0;
				__debugInfo = "1779:\src\CompilerPasses\Parser.gbas";
				func5_Match("DIMDEL", 1778, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1780:\src\CompilerPasses\Parser.gbas";
				local5_Array_2347 = func10_Identifier(0);
				__debugInfo = "1781:\src\CompilerPasses\Parser.gbas";
				func5_Match(",", 1780, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1782:\src\CompilerPasses\Parser.gbas";
				return tryClone(func22_CreateDimDelExpression(local5_Array_2347, func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 1781, 0)));
				__debugInfo = "1779:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2313) === (func7_IsToken("RETURN"))) ? 1 : 0)) {
				__debugInfo = "1799:\src\CompilerPasses\Parser.gbas";
				if ((((global8_Compiler.attr11_currentFunc) !== (-(1))) ? 1 : 0)) {
					var local4_Expr_2348 = 0, local8_datatype_2349 = pool_TDatatype.alloc();
					__debugInfo = "1785:\src\CompilerPasses\Parser.gbas";
					func5_Match("RETURN", 1784, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1788:\src\CompilerPasses\Parser.gbas";
					local8_datatype_2349 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
					__debugInfo = "1795:\src\CompilerPasses\Parser.gbas";
					if (func7_IsToken("\n")) {
						__debugInfo = "1790:\src\CompilerPasses\Parser.gbas";
						local4_Expr_2348 = func28_CreateDefaultValueExpression(local8_datatype_2349);
						__debugInfo = "1790:\src\CompilerPasses\Parser.gbas";
					} else if ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr3_Typ) === (2)) ? 1 : 0)) {
						__debugInfo = "1792:\src\CompilerPasses\Parser.gbas";
						func5_Error("Sub cannot return a value", 1791, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "1792:\src\CompilerPasses\Parser.gbas";
					} else {
						__debugInfo = "1794:\src\CompilerPasses\Parser.gbas";
						local4_Expr_2348 = func14_EnsureDatatype(func10_Expression(0), local8_datatype_2349, 1793, 0);
						__debugInfo = "1794:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "1796:\src\CompilerPasses\Parser.gbas";
					return tryClone(func22_CreateReturnExpression(local4_Expr_2348));
					__debugInfo = "1785:\src\CompilerPasses\Parser.gbas";pool_TDatatype.free(local8_datatype_2349);
				} else {
					__debugInfo = "1798:\src\CompilerPasses\Parser.gbas";
					func5_Error("RETURN have to be in a function or sub.", 1797, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1798:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1799:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2313) === (func7_IsToken("INLINE"))) ? 1 : 0)) {
				__debugInfo = "1801:\src\CompilerPasses\Parser.gbas";
				func5_Error("INLINE/ENDINLINE not supported", 1800, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1801:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2313) === (func7_IsToken("REQUIRE"))) ? 1 : 0)) {
				var local8_Name_Str_2350 = "";
				__debugInfo = "1803:\src\CompilerPasses\Parser.gbas";
				func5_Match("REQUIRE", 1802, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1804:\src\CompilerPasses\Parser.gbas";
				local8_Name_Str_2350 = REPLACE_Str(func14_GetCurrent_Str(), "\"", "");
				__debugInfo = "1805:\src\CompilerPasses\Parser.gbas";
				func7_GetNext();
				__debugInfo = "1806:\src\CompilerPasses\Parser.gbas";
				return tryClone(~~(func23_CreateRequireExpression(local8_Name_Str_2350)));
				__debugInfo = "1803:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2313) === (func7_IsToken("EXPORT"))) ? 1 : 0)) {
				var local3_Exp_2351 = pool_TExport.alloc(), local5_Found_2352 = 0;
				__debugInfo = "1808:\src\CompilerPasses\Parser.gbas";
				func5_Match("EXPORT", 1807, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1810:\src\CompilerPasses\Parser.gbas";
				local3_Exp_2351.attr8_Name_Str = REPLACE_Str(func14_GetCurrent_Str(), "\"", "");
				__debugInfo = "1811:\src\CompilerPasses\Parser.gbas";
				local5_Found_2352 = 0;
				__debugInfo = "1819:\src\CompilerPasses\Parser.gbas";
				var forEachSaver19682 = global8_Compiler.attr5_Funcs_ref[0];
				for(var forEachCounter19682 = 0 ; forEachCounter19682 < forEachSaver19682.values.length ; forEachCounter19682++) {
					var local1_F_ref_2353 = forEachSaver19682.values[forEachCounter19682];
				{
						__debugInfo = "1818:\src\CompilerPasses\Parser.gbas";
						if (((((((local1_F_ref_2353[0].attr3_Typ) === (1)) ? 1 : 0)) && ((((local3_Exp_2351.attr8_Name_Str) === (local1_F_ref_2353[0].attr8_Name_Str)) ? 1 : 0))) ? 1 : 0)) {
							__debugInfo = "1815:\src\CompilerPasses\Parser.gbas";
							local1_F_ref_2353[0].attr10_PlzCompile = 1;
							__debugInfo = "1816:\src\CompilerPasses\Parser.gbas";
							local5_Found_2352 = 1;
							__debugInfo = "1817:\src\CompilerPasses\Parser.gbas";
							break;
							__debugInfo = "1815:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "1818:\src\CompilerPasses\Parser.gbas";
					}
					forEachSaver19682.values[forEachCounter19682] = local1_F_ref_2353;
				
				};
				__debugInfo = "1829:\src\CompilerPasses\Parser.gbas";
				if (((local5_Found_2352) ? 0 : 1)) {
					__debugInfo = "1828:\src\CompilerPasses\Parser.gbas";
					var forEachSaver19722 = global8_Compiler.attr7_Globals;
					for(var forEachCounter19722 = 0 ; forEachCounter19722 < forEachSaver19722.values.length ; forEachCounter19722++) {
						var local1_V_2354 = forEachSaver19722.values[forEachCounter19722];
					{
							__debugInfo = "1827:\src\CompilerPasses\Parser.gbas";
							if (((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_V_2354).values[tmpPositionCache][0].attr3_Typ) === (2)) ? 1 : 0)) && ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_V_2354).values[tmpPositionCache][0].attr8_Name_Str) === (local3_Exp_2351.attr8_Name_Str)) ? 1 : 0))) ? 1 : 0)) {
								__debugInfo = "1825:\src\CompilerPasses\Parser.gbas";
								local5_Found_2352 = 1;
								__debugInfo = "1826:\src\CompilerPasses\Parser.gbas";
								break;
								__debugInfo = "1825:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "1827:\src\CompilerPasses\Parser.gbas";
						}
						forEachSaver19722.values[forEachCounter19722] = local1_V_2354;
					
					};
					__debugInfo = "1828:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1831:\src\CompilerPasses\Parser.gbas";
				if (((local5_Found_2352) ? 0 : 1)) {
					__debugInfo = "1831:\src\CompilerPasses\Parser.gbas";
					func5_Error((((("Cannot export undefined function/global '") + (local3_Exp_2351.attr8_Name_Str))) + ("'")), 1830, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1831:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1832:\src\CompilerPasses\Parser.gbas";
				local3_Exp_2351.attr8_Name_Str = REPLACE_Str(local3_Exp_2351.attr8_Name_Str, "$", "_Str");
				__debugInfo = "1833:\src\CompilerPasses\Parser.gbas";
				func7_GetNext();
				__debugInfo = "1838:\src\CompilerPasses\Parser.gbas";
				if (func7_IsToken(",")) {
					__debugInfo = "1835:\src\CompilerPasses\Parser.gbas";
					func5_Match(",", 1834, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1836:\src\CompilerPasses\Parser.gbas";
					local3_Exp_2351.attr12_RealName_Str = REPLACE_Str(func14_GetCurrent_Str(), "\"", "");
					__debugInfo = "1837:\src\CompilerPasses\Parser.gbas";
					func7_GetNext();
					__debugInfo = "1835:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1840:\src\CompilerPasses\Parser.gbas";
				DIMPUSH(global8_Compiler.attr7_Exports, local3_Exp_2351);
				__debugInfo = "1841:\src\CompilerPasses\Parser.gbas";
				return tryClone(func21_CreateEmptyExpression());
				__debugInfo = "1808:\src\CompilerPasses\Parser.gbas";pool_TExport.free(local3_Exp_2351);
			} else if ((((local17___SelectHelper27__2313) === (func7_IsToken("IF"))) ? 1 : 0)) {
				var local4_Cnds_2355 = pool_array.alloc(0), local4_Scps_2356 = pool_array.alloc(0), local7_elseScp_2357 = 0;
				__debugInfo = "1844:\src\CompilerPasses\Parser.gbas";
				func5_Match("IF", 1843, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1846:\src\CompilerPasses\Parser.gbas";
				DIMPUSH(local4_Cnds_2355, func14_EnsureDatatype(func10_Expression(0), global13_floatDatatype, 1845, 0));
				__debugInfo = "1849:\src\CompilerPasses\Parser.gbas";
				if ((((func7_IsToken("THEN")) === (0)) ? 1 : 0)) {
					__debugInfo = "1848:\src\CompilerPasses\Parser.gbas";
					func5_Match("\n", 1847, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1848:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1851:\src\CompilerPasses\Parser.gbas";
				DIMPUSH(local4_Scps_2356, func5_Scope("ENDIF", -(1)));
				__debugInfo = "1859:\src\CompilerPasses\Parser.gbas";
				while (func7_IsToken("ELSEIF")) {
					__debugInfo = "1855:\src\CompilerPasses\Parser.gbas";
					func5_Match("ELSEIF", 1854, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1856:\src\CompilerPasses\Parser.gbas";
					DIMPUSH(local4_Cnds_2355, func14_EnsureDatatype(func10_Expression(0), global13_floatDatatype, 1855, 0));
					__debugInfo = "1857:\src\CompilerPasses\Parser.gbas";
					func5_Match("\n", 1856, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1858:\src\CompilerPasses\Parser.gbas";
					DIMPUSH(local4_Scps_2356, func5_Scope("ENDIF", -(1)));
					__debugInfo = "1855:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1866:\src\CompilerPasses\Parser.gbas";
				if (func7_IsToken("ELSE")) {
					__debugInfo = "1861:\src\CompilerPasses\Parser.gbas";
					func5_Match("ELSE", 1860, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1862:\src\CompilerPasses\Parser.gbas";
					func5_Match("\n", 1861, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1863:\src\CompilerPasses\Parser.gbas";
					local7_elseScp_2357 = func5_Scope("ENDIF", -(1));
					__debugInfo = "1861:\src\CompilerPasses\Parser.gbas";
				} else {
					__debugInfo = "1865:\src\CompilerPasses\Parser.gbas";
					local7_elseScp_2357 = -(1);
					__debugInfo = "1865:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1868:\src\CompilerPasses\Parser.gbas";
				return tryClone(func18_CreateIfExpression(unref(local4_Cnds_2355), unref(local4_Scps_2356), local7_elseScp_2357));
				__debugInfo = "1844:\src\CompilerPasses\Parser.gbas";pool_array.free(local4_Scps_2356);
			} else if ((((local17___SelectHelper27__2313) === (func7_IsToken("WHILE"))) ? 1 : 0)) {
				var local4_Expr_2358 = 0, local3_Scp_2359 = 0;
				__debugInfo = "1870:\src\CompilerPasses\Parser.gbas";
				func5_Match("WHILE", 1869, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1871:\src\CompilerPasses\Parser.gbas";
				local4_Expr_2358 = func14_EnsureDatatype(func10_Expression(0), global13_floatDatatype, 1870, 0);
				__debugInfo = "1872:\src\CompilerPasses\Parser.gbas";
				func5_Match("\n", 1871, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1873:\src\CompilerPasses\Parser.gbas";
				local3_Scp_2359 = func5_Scope("WEND", -(1));
				__debugInfo = "1874:\src\CompilerPasses\Parser.gbas";
				return tryClone(func21_CreateWhileExpression(local4_Expr_2358, local3_Scp_2359));
				__debugInfo = "1870:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2313) === (func7_IsToken("REPEAT"))) ? 1 : 0)) {
				var local3_Scp_2360 = 0, local4_Expr_2361 = 0;
				__debugInfo = "1876:\src\CompilerPasses\Parser.gbas";
				func5_Match("REPEAT", 1875, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1877:\src\CompilerPasses\Parser.gbas";
				func5_Match("\n", 1876, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1878:\src\CompilerPasses\Parser.gbas";
				local3_Scp_2360 = func5_Scope("UNTIL", -(1));
				__debugInfo = "1879:\src\CompilerPasses\Parser.gbas";
				local4_Expr_2361 = func14_EnsureDatatype(func10_Expression(0), global13_floatDatatype, 1878, 0);
				__debugInfo = "1880:\src\CompilerPasses\Parser.gbas";
				return tryClone(func22_CreateRepeatExpression(local4_Expr_2361, local3_Scp_2360));
				__debugInfo = "1876:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2313) === (func7_IsToken("FOR"))) ? 1 : 0)) {
				var local8_TmpScope_2362 = 0.0, local4_Expr_2363 = 0, local6_OScope_2373 = 0;
				__debugInfo = "1882:\src\CompilerPasses\Parser.gbas";
				local8_TmpScope_2362 = global8_Compiler.attr12_CurrentScope;
				__debugInfo = "1883:\src\CompilerPasses\Parser.gbas";
				global8_Compiler.attr12_CurrentScope = func21_CreateScopeExpression(~~(3));
				__debugInfo = "1884:\src\CompilerPasses\Parser.gbas";
				local4_Expr_2363 = -(1);
				__debugInfo = "1940:\src\CompilerPasses\Parser.gbas";
				{
					var Error_Str = "";
					__debugInfo = "1942:\src\CompilerPasses\Parser.gbas";
					try {
						var local10_IsImplicit_2364 = 0, local7_varExpr_2365 = 0, local3_Var_2368 = 0.0, local5_hasTo_2369 = 0, local6_toExpr_2370 = 0, local8_stepExpr_2371 = 0;
						__debugInfo = "1886:\src\CompilerPasses\Parser.gbas";
						func5_Match("FOR", 1885, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "1889:\src\CompilerPasses\Parser.gbas";
						local10_IsImplicit_2364 = -(1);
						__debugInfo = "1915:\src\CompilerPasses\Parser.gbas";
						if (func12_IsIdentifier(0, 1)) {
							__debugInfo = "1893:\src\CompilerPasses\Parser.gbas";
							local7_varExpr_2365 = func10_Identifier(1);
							__debugInfo = "1893:\src\CompilerPasses\Parser.gbas";
						} else {
							var local4_Vari_2366 = pool_TIdentifierVari.alloc(), local4_PDef_2367 = 0;
							__debugInfo = "1895:\src\CompilerPasses\Parser.gbas";
							local10_IsImplicit_2364 = 1;
							__debugInfo = "1898:\src\CompilerPasses\Parser.gbas";
							local4_Vari_2366 = func7_VariDef(0).clone(/* In Assign */);
							__debugInfo = "1899:\src\CompilerPasses\Parser.gbas";
							local4_Vari_2366.attr3_Typ = ~~(1);
							__debugInfo = "1901:\src\CompilerPasses\Parser.gbas";
							local4_PDef_2367 = -(1);
							__debugInfo = "1905:\src\CompilerPasses\Parser.gbas";
							if ((((local4_Vari_2366.attr6_PreDef) !== (-(1))) ? 1 : 0)) {
								__debugInfo = "1903:\src\CompilerPasses\Parser.gbas";
								local4_PDef_2367 = local4_Vari_2366.attr6_PreDef;
								__debugInfo = "1904:\src\CompilerPasses\Parser.gbas";
								local4_Vari_2366.attr6_PreDef = -(1);
								__debugInfo = "1903:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "1906:\src\CompilerPasses\Parser.gbas";
							func11_AddVariable(local4_Vari_2366, 1);
							__debugInfo = "1907:\src\CompilerPasses\Parser.gbas";
							local10_IsImplicit_2364 = ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1));
							__debugInfo = "1910:\src\CompilerPasses\Parser.gbas";
							DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
							__debugInfo = "1914:\src\CompilerPasses\Parser.gbas";
							if ((((local4_PDef_2367) !== (-(1))) ? 1 : 0)) {
								__debugInfo = "1913:\src\CompilerPasses\Parser.gbas";
								local7_varExpr_2365 = func22_CreateAssignExpression(func24_CreateVariableExpression(((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1))), local4_PDef_2367);
								__debugInfo = "1913:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "1895:\src\CompilerPasses\Parser.gbas";pool_TIdentifierVari.free(local4_Vari_2366);
						};
						__debugInfo = "1916:\src\CompilerPasses\Parser.gbas";
						if ((((global5_Exprs_ref[0].arrAccess(local7_varExpr_2365).values[tmpPositionCache][0].attr3_Typ) !== (10)) ? 1 : 0)) {
							__debugInfo = "1916:\src\CompilerPasses\Parser.gbas";
							func5_Error("FOR, variable needs assignment.", 1915, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "1916:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "1917:\src\CompilerPasses\Parser.gbas";
						local3_Var_2368 = func11_GetVariable(global5_Exprs_ref[0].arrAccess(local7_varExpr_2365).values[tmpPositionCache][0].attr4_vari, 1);
						__debugInfo = "1927:\src\CompilerPasses\Parser.gbas";
						if (func7_IsToken("TO")) {
							__debugInfo = "1920:\src\CompilerPasses\Parser.gbas";
							local5_hasTo_2369 = 1;
							__debugInfo = "1921:\src\CompilerPasses\Parser.gbas";
							func5_Match("TO", 1920, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "1920:\src\CompilerPasses\Parser.gbas";
						} else if (func7_IsToken("UNTIL")) {
							__debugInfo = "1923:\src\CompilerPasses\Parser.gbas";
							local5_hasTo_2369 = 0;
							__debugInfo = "1924:\src\CompilerPasses\Parser.gbas";
							func5_Match("UNTIL", 1923, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "1923:\src\CompilerPasses\Parser.gbas";
						} else {
							__debugInfo = "1926:\src\CompilerPasses\Parser.gbas";
							func5_Error("FOR needs TO or UNTIL!", 1925, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "1926:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "1928:\src\CompilerPasses\Parser.gbas";
						local6_toExpr_2370 = func14_EnsureDatatype(func10_Expression(0), global8_Compiler.attr5_Varis_ref[0].arrAccess(~~(local3_Var_2368)).values[tmpPositionCache][0].attr8_datatype, 1927, 0);
						__debugInfo = "1929:\src\CompilerPasses\Parser.gbas";
						local8_stepExpr_2371 = func14_EnsureDatatype(func19_CreateIntExpression(1), global8_Compiler.attr5_Varis_ref[0].arrAccess(~~(local3_Var_2368)).values[tmpPositionCache][0].attr8_datatype, 1928, 0);
						__debugInfo = "1933:\src\CompilerPasses\Parser.gbas";
						if (func7_IsToken("STEP")) {
							__debugInfo = "1931:\src\CompilerPasses\Parser.gbas";
							func5_Match("STEP", 1930, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "1932:\src\CompilerPasses\Parser.gbas";
							local8_stepExpr_2371 = func14_EnsureDatatype(func10_Expression(0), global8_Compiler.attr5_Varis_ref[0].arrAccess(~~(local3_Var_2368)).values[tmpPositionCache][0].attr8_datatype, 1931, 0);
							__debugInfo = "1931:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "1934:\src\CompilerPasses\Parser.gbas";
						func5_Match("\n", 1933, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "1937:\src\CompilerPasses\Parser.gbas";
						local4_Expr_2363 = func19_CreateForExpression(local7_varExpr_2365, local6_toExpr_2370, local8_stepExpr_2371, local5_hasTo_2369, func5_Scope("NEXT", -(1)));
						__debugInfo = "1939:\src\CompilerPasses\Parser.gbas";
						DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local4_Expr_2363);
						__debugInfo = "1886:\src\CompilerPasses\Parser.gbas";
					} catch (Error_Str) {
						if (Error_Str instanceof OTTException) Error_Str = Error_Str.getText(); else throwError(Error_Str);{
							__debugInfo = "1941:\src\CompilerPasses\Parser.gbas";
							func8_FixError();
							__debugInfo = "1941:\src\CompilerPasses\Parser.gbas";
						}
					};
					__debugInfo = "1942:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1943:\src\CompilerPasses\Parser.gbas";
				local6_OScope_2373 = global8_Compiler.attr12_CurrentScope;
				__debugInfo = "1944:\src\CompilerPasses\Parser.gbas";
				global8_Compiler.attr12_CurrentScope = ~~(local8_TmpScope_2362);
				__debugInfo = "1945:\src\CompilerPasses\Parser.gbas";
				return tryClone(local6_OScope_2373);
				__debugInfo = "1882:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2313) === (func7_IsToken("FOREACH"))) ? 1 : 0)) {
				var local8_TmpScope_2374 = 0.0, local14_TmpForEach_Str_2375 = "", local4_Expr_2376 = 0;
				__debugInfo = "1947:\src\CompilerPasses\Parser.gbas";
				local8_TmpScope_2374 = global8_Compiler.attr12_CurrentScope;
				__debugInfo = "1948:\src\CompilerPasses\Parser.gbas";
				local14_TmpForEach_Str_2375 = global8_Compiler.attr18_currentForEach_Str;
				__debugInfo = "1949:\src\CompilerPasses\Parser.gbas";
				global8_Compiler.attr12_CurrentScope = func21_CreateScopeExpression(~~(3));
				__debugInfo = "1950:\src\CompilerPasses\Parser.gbas";
				local4_Expr_2376 = -(1);
				__debugInfo = "1989:\src\CompilerPasses\Parser.gbas";
				{
					var Error_Str = "";
					__debugInfo = "1991:\src\CompilerPasses\Parser.gbas";
					try {
						var local7_varExpr_2377 = 0, local4_Vari_2378 = pool_TIdentifierVari.alloc(), local6_InExpr_2379 = 0, local3_var_2380 = 0;
						__debugInfo = "1952:\src\CompilerPasses\Parser.gbas";
						func5_Match("FOREACH", 1951, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "1962:\src\CompilerPasses\Parser.gbas";
						local4_Vari_2378 = func7_VariDef(0).clone(/* In Assign */);
						__debugInfo = "1963:\src\CompilerPasses\Parser.gbas";
						local4_Vari_2378.attr3_Typ = ~~(1);
						__debugInfo = "1968:\src\CompilerPasses\Parser.gbas";
						if ((((local4_Vari_2378.attr6_PreDef) !== (-(1))) ? 1 : 0)) {
							__debugInfo = "1967:\src\CompilerPasses\Parser.gbas";
							func5_Error("No default value, in FOREACH", 1966, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "1967:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "1969:\src\CompilerPasses\Parser.gbas";
						func11_AddVariable(local4_Vari_2378, 1);
						__debugInfo = "1970:\src\CompilerPasses\Parser.gbas";
						DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
						__debugInfo = "1971:\src\CompilerPasses\Parser.gbas";
						local7_varExpr_2377 = func24_CreateVariableExpression(((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
						__debugInfo = "1973:\src\CompilerPasses\Parser.gbas";
						global8_Compiler.attr18_currentForEach_Str = global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(local7_varExpr_2377, 1)).values[tmpPositionCache][0].attr8_Name_Str;
						__debugInfo = "1974:\src\CompilerPasses\Parser.gbas";
						func5_Match("IN", 1973, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "1975:\src\CompilerPasses\Parser.gbas";
						local6_InExpr_2379 = func10_Identifier(0);
						__debugInfo = "1977:\src\CompilerPasses\Parser.gbas";
						if ((((global5_Exprs_ref[0].arrAccess(local6_InExpr_2379).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0)) {
							__debugInfo = "1977:\src\CompilerPasses\Parser.gbas";
							func5_Error("Expecting Array", 1976, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "1977:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "1979:\src\CompilerPasses\Parser.gbas";
						global5_Exprs_ref[0].arrAccess(local7_varExpr_2377).values[tmpPositionCache][0].attr8_datatype = global5_Exprs_ref[0].arrAccess(local6_InExpr_2379).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
						__debugInfo = "1980:\src\CompilerPasses\Parser.gbas";
						global5_Exprs_ref[0].arrAccess(local7_varExpr_2377).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray = 0;
						__debugInfo = "1982:\src\CompilerPasses\Parser.gbas";
						local3_var_2380 = func11_GetVariable(local7_varExpr_2377, 1);
						__debugInfo = "1983:\src\CompilerPasses\Parser.gbas";
						global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_var_2380).values[tmpPositionCache][0].attr8_datatype = global5_Exprs_ref[0].arrAccess(local6_InExpr_2379).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
						__debugInfo = "1984:\src\CompilerPasses\Parser.gbas";
						global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_var_2380).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray = 0;
						__debugInfo = "1985:\src\CompilerPasses\Parser.gbas";
						global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_var_2380).values[tmpPositionCache][0].attr3_ref = global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(local6_InExpr_2379, 1)).values[tmpPositionCache][0].attr3_ref;
						__debugInfo = "1987:\src\CompilerPasses\Parser.gbas";
						func5_Match("\n", 1986, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "1988:\src\CompilerPasses\Parser.gbas";
						local4_Expr_2376 = func23_CreateForEachExpression(local7_varExpr_2377, local6_InExpr_2379, func5_Scope("NEXT", -(1)));
						__debugInfo = "1952:\src\CompilerPasses\Parser.gbas";pool_TIdentifierVari.free(local4_Vari_2378);
					} catch (Error_Str) {
						if (Error_Str instanceof OTTException) Error_Str = Error_Str.getText(); else throwError(Error_Str);{
							__debugInfo = "1990:\src\CompilerPasses\Parser.gbas";
							func8_FixError();
							__debugInfo = "1990:\src\CompilerPasses\Parser.gbas";
						}
					};
					__debugInfo = "1991:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1992:\src\CompilerPasses\Parser.gbas";
				global8_Compiler.attr12_CurrentScope = ~~(local8_TmpScope_2374);
				__debugInfo = "1993:\src\CompilerPasses\Parser.gbas";
				global8_Compiler.attr18_currentForEach_Str = local14_TmpForEach_Str_2375;
				__debugInfo = "1994:\src\CompilerPasses\Parser.gbas";
				return tryClone(local4_Expr_2376);
				__debugInfo = "1947:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2313) === (func7_IsToken("BREAK"))) ? 1 : 0)) {
				__debugInfo = "1996:\src\CompilerPasses\Parser.gbas";
				func5_Match("BREAK", 1995, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1997:\src\CompilerPasses\Parser.gbas";
				if ((((global8_Compiler.attr6_inLoop) === (0)) ? 1 : 0)) {
					__debugInfo = "1997:\src\CompilerPasses\Parser.gbas";
					func5_Error("BREAK not inside loop", 1996, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1997:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1998:\src\CompilerPasses\Parser.gbas";
				return tryClone(func21_CreateBreakExpression());
				__debugInfo = "1996:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2313) === (func7_IsToken("CONTINUE"))) ? 1 : 0)) {
				__debugInfo = "2000:\src\CompilerPasses\Parser.gbas";
				func5_Match("CONTINUE", 1999, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "2001:\src\CompilerPasses\Parser.gbas";
				if ((((global8_Compiler.attr6_inLoop) === (0)) ? 1 : 0)) {
					__debugInfo = "2001:\src\CompilerPasses\Parser.gbas";
					func5_Error("CONTINUE not inside loop", 2000, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "2001:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2002:\src\CompilerPasses\Parser.gbas";
				return tryClone(func24_CreateContinueExpression());
				__debugInfo = "2000:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2313) === (func7_IsToken("TRY"))) ? 1 : 0)) {
				var local6_tryScp_2382 = 0, local4_Vari_2383 = pool_TIdentifierVari.alloc(), local2_id_2384 = 0.0, local7_myScope_2385 = 0, local8_TmpScope_2386 = 0.0;
				__debugInfo = "2004:\src\CompilerPasses\Parser.gbas";
				func5_Match("TRY", 2003, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "2005:\src\CompilerPasses\Parser.gbas";
				func5_Match("\n", 2004, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "2006:\src\CompilerPasses\Parser.gbas";
				local6_tryScp_2382 = func5_Scope("CATCH", -(1));
				__debugInfo = "2008:\src\CompilerPasses\Parser.gbas";
				local4_Vari_2383 = func7_VariDef(0).clone(/* In Assign */);
				__debugInfo = "2009:\src\CompilerPasses\Parser.gbas";
				if ((((local4_Vari_2383.attr8_datatype.attr8_Name_Str) !== ("string")) ? 1 : 0)) {
					__debugInfo = "2009:\src\CompilerPasses\Parser.gbas";
					func5_Error("Catch variable must be string", 2008, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "2009:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2010:\src\CompilerPasses\Parser.gbas";
				if (local4_Vari_2383.attr8_datatype.attr7_IsArray) {
					__debugInfo = "2010:\src\CompilerPasses\Parser.gbas";
					func5_Error("Catch variable must be non array", 2009, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "2010:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2011:\src\CompilerPasses\Parser.gbas";
				local2_id_2384 = BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0);
				__debugInfo = "2012:\src\CompilerPasses\Parser.gbas";
				func11_AddVariable(local4_Vari_2383, 0);
				__debugInfo = "2013:\src\CompilerPasses\Parser.gbas";
				local7_myScope_2385 = -(1);
				__debugInfo = "2015:\src\CompilerPasses\Parser.gbas";
				local8_TmpScope_2386 = global8_Compiler.attr12_CurrentScope;
				__debugInfo = "2016:\src\CompilerPasses\Parser.gbas";
				global8_Compiler.attr12_CurrentScope = func21_CreateScopeExpression(~~(1));
				__debugInfo = "2027:\src\CompilerPasses\Parser.gbas";
				{
					var Error_Str = "";
					__debugInfo = "2029:\src\CompilerPasses\Parser.gbas";
					try {
						var local7_ctchScp_2387 = 0, local1_e_2388 = 0;
						__debugInfo = "2018:\src\CompilerPasses\Parser.gbas";
						DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ~~(local2_id_2384));
						__debugInfo = "2020:\src\CompilerPasses\Parser.gbas";
						func5_Match("\n", 2019, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "2021:\src\CompilerPasses\Parser.gbas";
						local7_ctchScp_2387 = func5_Scope("FINALLY", -(1));
						__debugInfo = "2023:\src\CompilerPasses\Parser.gbas";
						local1_e_2388 = func19_CreateTryExpression(local6_tryScp_2382, local7_ctchScp_2387, ~~(local2_id_2384));
						__debugInfo = "2024:\src\CompilerPasses\Parser.gbas";
						DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local1_e_2388);
						__debugInfo = "2026:\src\CompilerPasses\Parser.gbas";
						local7_myScope_2385 = global8_Compiler.attr12_CurrentScope;
						__debugInfo = "2018:\src\CompilerPasses\Parser.gbas";
					} catch (Error_Str) {
						if (Error_Str instanceof OTTException) Error_Str = Error_Str.getText(); else throwError(Error_Str);{
							__debugInfo = "2028:\src\CompilerPasses\Parser.gbas";
							func8_FixError();
							__debugInfo = "2028:\src\CompilerPasses\Parser.gbas";
						}
					};
					__debugInfo = "2029:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2030:\src\CompilerPasses\Parser.gbas";
				global8_Compiler.attr12_CurrentScope = ~~(local8_TmpScope_2386);
				__debugInfo = "2032:\src\CompilerPasses\Parser.gbas";
				return tryClone(local7_myScope_2385);
				__debugInfo = "2004:\src\CompilerPasses\Parser.gbas";pool_TIdentifierVari.free(local4_Vari_2383);
			} else if ((((local17___SelectHelper27__2313) === (func7_IsToken("THROW"))) ? 1 : 0)) {
				__debugInfo = "2034:\src\CompilerPasses\Parser.gbas";
				func5_Match("THROW", 2033, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "2035:\src\CompilerPasses\Parser.gbas";
				return tryClone(func21_CreateThrowExpression(func14_EnsureDatatype(func10_Expression(0), global11_strDatatype, 2034, 0)));
				__debugInfo = "2034:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2313) === (func7_IsToken("SELECT"))) ? 1 : 0)) {
				var local4_Vari_2391 = pool_TIdentifierVari.alloc(), local5_Cond1_2392 = 0, local8_datatype_2393 = pool_TDatatype.alloc(), local5_Conds_2394 = pool_array.alloc(0), local4_Scps_2395 = pool_array.alloc(0), local7_elseScp_2396 = 0, local8_TmpScope_2397 = 0.0, local8_VariExpr_2398 = 0, local1_e_2399 = 0, local7_myScope_2405 = 0;
				__debugInfo = "2038:\src\CompilerPasses\Parser.gbas";
				static12_Keyword_SelectHelper+=1;
				__debugInfo = "2040:\src\CompilerPasses\Parser.gbas";
				local4_Vari_2391.attr8_Name_Str = (((("__SelectHelper") + (CAST2STRING(static12_Keyword_SelectHelper)))) + ("_"));
				__debugInfo = "2041:\src\CompilerPasses\Parser.gbas";
				local4_Vari_2391.attr3_Typ = ~~(1);
				__debugInfo = "2044:\src\CompilerPasses\Parser.gbas";
				func5_Match("SELECT", 2043, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "2046:\src\CompilerPasses\Parser.gbas";
				local5_Cond1_2392 = func10_Expression(0);
				__debugInfo = "2048:\src\CompilerPasses\Parser.gbas";
				local8_datatype_2393 = global5_Exprs_ref[0].arrAccess(local5_Cond1_2392).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
				__debugInfo = "2049:\src\CompilerPasses\Parser.gbas";
				local4_Vari_2391.attr8_datatype = local8_datatype_2393.clone(/* In Assign */);
				__debugInfo = "2053:\src\CompilerPasses\Parser.gbas";
				local7_elseScp_2396 = -(1);
				__debugInfo = "2057:\src\CompilerPasses\Parser.gbas";
				func11_AddVariable(local4_Vari_2391, 0);
				__debugInfo = "2058:\src\CompilerPasses\Parser.gbas";
				local8_TmpScope_2397 = global8_Compiler.attr12_CurrentScope;
				__debugInfo = "2059:\src\CompilerPasses\Parser.gbas";
				global8_Compiler.attr12_CurrentScope = func21_CreateScopeExpression(~~(1));
				__debugInfo = "2062:\src\CompilerPasses\Parser.gbas";
				DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
				__debugInfo = "2063:\src\CompilerPasses\Parser.gbas";
				local8_VariExpr_2398 = func24_CreateVariableExpression(((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
				__debugInfo = "2064:\src\CompilerPasses\Parser.gbas";
				local1_e_2399 = func22_CreateAssignExpression(local8_VariExpr_2398, local5_Cond1_2392);
				__debugInfo = "2065:\src\CompilerPasses\Parser.gbas";
				DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local1_e_2399);
				__debugInfo = "2066:\src\CompilerPasses\Parser.gbas";
				local5_Cond1_2392 = local8_VariExpr_2398;
				__debugInfo = "2068:\src\CompilerPasses\Parser.gbas";
				func5_Match("\n", 2067, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "2105:\src\CompilerPasses\Parser.gbas";
				while (func7_IsToken("CASE")) {
					var local5_Cond2_2400 = 0;
					__debugInfo = "2070:\src\CompilerPasses\Parser.gbas";
					func5_Match("CASE", 2069, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "2071:\src\CompilerPasses\Parser.gbas";
					local5_Cond2_2400 = -(1);
					__debugInfo = "2100:\src\CompilerPasses\Parser.gbas";
					do {
						var local2_Op_2401 = 0.0, local5_Expr1_2402 = 0, local5_Expr2_2403 = 0, local7_tmpCond_2404 = 0;
						__debugInfo = "2073:\src\CompilerPasses\Parser.gbas";
						if (func7_IsToken(",")) {
							__debugInfo = "2073:\src\CompilerPasses\Parser.gbas";
							func5_Match(",", 2072, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "2073:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "2075:\src\CompilerPasses\Parser.gbas";
						local2_Op_2401 = func14_SearchOperator("=");
						__debugInfo = "2079:\src\CompilerPasses\Parser.gbas";
						if (func10_IsOperator()) {
							__debugInfo = "2077:\src\CompilerPasses\Parser.gbas";
							local2_Op_2401 = func14_SearchOperator(func14_GetCurrent_Str());
							__debugInfo = "2078:\src\CompilerPasses\Parser.gbas";
							func7_GetNext();
							__debugInfo = "2077:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "2080:\src\CompilerPasses\Parser.gbas";
						local5_Expr1_2402 = -(1);
						__debugInfo = "2081:\src\CompilerPasses\Parser.gbas";
						local5_Expr2_2403 = -(1);
						__debugInfo = "2083:\src\CompilerPasses\Parser.gbas";
						local5_Expr1_2402 = func14_EnsureDatatype(func10_Expression(0), local8_datatype_2393, 2082, 0);
						__debugInfo = "2094:\src\CompilerPasses\Parser.gbas";
						if (func7_IsToken("TO")) {
							__debugInfo = "2085:\src\CompilerPasses\Parser.gbas";
							func5_Match("TO", 2084, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "2086:\src\CompilerPasses\Parser.gbas";
							local5_Expr2_2403 = func14_EnsureDatatype(func10_Expression(0), local8_datatype_2393, 2085, 0);
							__debugInfo = "2088:\src\CompilerPasses\Parser.gbas";
							local5_Expr1_2402 = func24_CreateOperatorExpression(unref(global9_Operators_ref[0].arrAccess(func14_SearchOperator(">=")).values[tmpPositionCache][0]), local5_Cond1_2392, local5_Expr1_2402);
							__debugInfo = "2089:\src\CompilerPasses\Parser.gbas";
							local5_Expr2_2403 = func24_CreateOperatorExpression(unref(global9_Operators_ref[0].arrAccess(func14_SearchOperator("<=")).values[tmpPositionCache][0]), local5_Cond1_2392, local5_Expr2_2403);
							__debugInfo = "2091:\src\CompilerPasses\Parser.gbas";
							local7_tmpCond_2404 = func24_CreateOperatorExpression(unref(global9_Operators_ref[0].arrAccess(func14_SearchOperator("AND")).values[tmpPositionCache][0]), local5_Expr1_2402, local5_Expr2_2403);
							__debugInfo = "2085:\src\CompilerPasses\Parser.gbas";
						} else {
							__debugInfo = "2093:\src\CompilerPasses\Parser.gbas";
							local7_tmpCond_2404 = func24_CreateOperatorExpression(unref(global9_Operators_ref[0].arrAccess(~~(local2_Op_2401)).values[tmpPositionCache][0]), local5_Cond1_2392, local5_Expr1_2402);
							__debugInfo = "2093:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "2099:\src\CompilerPasses\Parser.gbas";
						if ((((local5_Cond2_2400) === (-(1))) ? 1 : 0)) {
							__debugInfo = "2096:\src\CompilerPasses\Parser.gbas";
							local5_Cond2_2400 = local7_tmpCond_2404;
							__debugInfo = "2096:\src\CompilerPasses\Parser.gbas";
						} else {
							__debugInfo = "2098:\src\CompilerPasses\Parser.gbas";
							local5_Cond2_2400 = func24_CreateOperatorExpression(unref(global9_Operators_ref[0].arrAccess(func14_SearchOperator("OR")).values[tmpPositionCache][0]), local5_Cond2_2400, local7_tmpCond_2404);
							__debugInfo = "2098:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "2073:\src\CompilerPasses\Parser.gbas";
					} while (!((((func7_IsToken(",")) === (0)) ? 1 : 0)));
					__debugInfo = "2102:\src\CompilerPasses\Parser.gbas";
					func5_Match("\n", 2101, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "2103:\src\CompilerPasses\Parser.gbas";
					DIMPUSH(local5_Conds_2394, local5_Cond2_2400);
					__debugInfo = "2104:\src\CompilerPasses\Parser.gbas";
					DIMPUSH(local4_Scps_2395, func5_Scope("ENDSELECT", -(1)));
					__debugInfo = "2070:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2110:\src\CompilerPasses\Parser.gbas";
				if (func7_IsToken("DEFAULT")) {
					__debugInfo = "2107:\src\CompilerPasses\Parser.gbas";
					func5_Match("DEFAULT", 2106, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "2108:\src\CompilerPasses\Parser.gbas";
					func5_Match("\n", 2107, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "2109:\src\CompilerPasses\Parser.gbas";
					local7_elseScp_2396 = func5_Scope("ENDSELECT", -(1));
					__debugInfo = "2107:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2113:\src\CompilerPasses\Parser.gbas";
				if (((((((local7_elseScp_2396) === (-(1))) ? 1 : 0)) && ((((BOUNDS(local5_Conds_2394, 0)) === (0)) ? 1 : 0))) ? 1 : 0)) {
					__debugInfo = "2112:\src\CompilerPasses\Parser.gbas";
					func5_Match("ENDSELECT", 2111, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "2112:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2115:\src\CompilerPasses\Parser.gbas";
				local1_e_2399 = func18_CreateIfExpression(unref(local5_Conds_2394), unref(local4_Scps_2395), local7_elseScp_2396);
				__debugInfo = "2116:\src\CompilerPasses\Parser.gbas";
				DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local1_e_2399);
				__debugInfo = "2117:\src\CompilerPasses\Parser.gbas";
				local7_myScope_2405 = global8_Compiler.attr12_CurrentScope;
				__debugInfo = "2118:\src\CompilerPasses\Parser.gbas";
				global8_Compiler.attr12_CurrentScope = ~~(local8_TmpScope_2397);
				__debugInfo = "2119:\src\CompilerPasses\Parser.gbas";
				return tryClone(local7_myScope_2405);
				__debugInfo = "2038:\src\CompilerPasses\Parser.gbas";pool_array.free(local4_Scps_2395);
			} else if ((((local17___SelectHelper27__2313) === (func7_IsToken("STARTDATA"))) ? 1 : 0)) {
				__debugInfo = "2121:\src\CompilerPasses\Parser.gbas";
				func5_Match("STARTDATA", 2120, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "2122:\src\CompilerPasses\Parser.gbas";
				func10_SkipTokens("STARTDATA", "ENDDATA", func14_GetCurrent_Str());
				__debugInfo = "2121:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2313) === (func7_IsToken("RESTORE"))) ? 1 : 0)) {
				var local8_Name_Str_2406 = "";
				__debugInfo = "2124:\src\CompilerPasses\Parser.gbas";
				func5_Match("RESTORE", 2123, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "2125:\src\CompilerPasses\Parser.gbas";
				local8_Name_Str_2406 = func14_GetCurrent_Str();
				__debugInfo = "2126:\src\CompilerPasses\Parser.gbas";
				func5_Match(local8_Name_Str_2406, 2125, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "2131:\src\CompilerPasses\Parser.gbas";
				var forEachSaver20999 = global8_Compiler.attr10_DataBlocks;
				for(var forEachCounter20999 = 0 ; forEachCounter20999 < forEachSaver20999.values.length ; forEachCounter20999++) {
					var local5_block_2407 = forEachSaver20999.values[forEachCounter20999];
				{
						__debugInfo = "2130:\src\CompilerPasses\Parser.gbas";
						if ((((local5_block_2407.attr8_Name_Str) === (local8_Name_Str_2406)) ? 1 : 0)) {
							__debugInfo = "2129:\src\CompilerPasses\Parser.gbas";
							return tryClone(func23_CreateRestoreExpression(local8_Name_Str_2406));
							__debugInfo = "2129:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "2130:\src\CompilerPasses\Parser.gbas";
					}
					forEachSaver20999.values[forEachCounter20999] = local5_block_2407;
				
				};
				__debugInfo = "2132:\src\CompilerPasses\Parser.gbas";
				func5_Error((((("RESTORE label '") + (local8_Name_Str_2406))) + ("' unknown.")), 2131, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "2124:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2313) === (func7_IsToken("READ"))) ? 1 : 0)) {
				var local5_Reads_2408 = pool_array.alloc(0);
				__debugInfo = "2134:\src\CompilerPasses\Parser.gbas";
				func5_Match("READ", 2133, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "2140:\src\CompilerPasses\Parser.gbas";
				do {
					var local1_e_2409 = 0;
					__debugInfo = "2137:\src\CompilerPasses\Parser.gbas";
					if (func7_IsToken(",")) {
						__debugInfo = "2137:\src\CompilerPasses\Parser.gbas";
						func5_Match(",", 2136, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "2137:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "2138:\src\CompilerPasses\Parser.gbas";
					local1_e_2409 = func10_Identifier(0);
					__debugInfo = "2139:\src\CompilerPasses\Parser.gbas";
					DIMPUSH(local5_Reads_2408, local1_e_2409);
					__debugInfo = "2137:\src\CompilerPasses\Parser.gbas";
				} while (!((((func7_IsToken(",")) === (0)) ? 1 : 0)));
				__debugInfo = "2142:\src\CompilerPasses\Parser.gbas";
				return tryClone(func20_CreateReadExpression(unref(local5_Reads_2408)));
				__debugInfo = "2134:\src\CompilerPasses\Parser.gbas";pool_array.free(local5_Reads_2408);
			} else if ((((local17___SelectHelper27__2313) === (func7_IsToken("GOTO"))) ? 1 : 0)) {
				var local8_Name_Str_2411 = "", local4_Expr_2412 = 0, local3_Scp_2413 = 0;
				__debugInfo = "2145:\src\CompilerPasses\Parser.gbas";
				func5_Match("GOTO", 2144, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "2146:\src\CompilerPasses\Parser.gbas";
				local8_Name_Str_2411 = func14_GetCurrent_Str();
				__debugInfo = "2147:\src\CompilerPasses\Parser.gbas";
				func7_GetNext();
				__debugInfo = "2148:\src\CompilerPasses\Parser.gbas";
				global8_Compiler.attr7_HasGoto = 1;
				__debugInfo = "2152:\src\CompilerPasses\Parser.gbas";
				if (((static7_Keyword_GOTOErr) ? 0 : 1)) {
					__debugInfo = "2150:\src\CompilerPasses\Parser.gbas";
					static7_Keyword_GOTOErr = 1;
					__debugInfo = "2151:\src\CompilerPasses\Parser.gbas";
					func7_Warning("GOTO may cause problems!");
					__debugInfo = "2150:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2154:\src\CompilerPasses\Parser.gbas";
				local4_Expr_2412 = func20_CreateGotoExpression(local8_Name_Str_2411);
				__debugInfo = "2156:\src\CompilerPasses\Parser.gbas";
				local3_Scp_2413 = global8_Compiler.attr14_ImportantScope;
				__debugInfo = "2159:\src\CompilerPasses\Parser.gbas";
				if ((((local3_Scp_2413) === (-(1))) ? 1 : 0)) {
					__debugInfo = "2158:\src\CompilerPasses\Parser.gbas";
					func5_Error("Internal error (GOTO Scp is -1", 2157, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "2158:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2161:\src\CompilerPasses\Parser.gbas";
				DIMPUSH(global5_Exprs_ref[0].arrAccess(local3_Scp_2413).values[tmpPositionCache][0].attr5_Gotos, local4_Expr_2412);
				__debugInfo = "2162:\src\CompilerPasses\Parser.gbas";
				return tryClone(local4_Expr_2412);
				__debugInfo = "2145:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2313) === (func7_IsToken("INC"))) ? 1 : 0)) {
				var local4_Vari_2414 = 0, local7_AddExpr_2415 = 0;
				__debugInfo = "2164:\src\CompilerPasses\Parser.gbas";
				func5_Match("INC", 2163, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "2165:\src\CompilerPasses\Parser.gbas";
				local4_Vari_2414 = func10_Identifier(0);
				__debugInfo = "2166:\src\CompilerPasses\Parser.gbas";
				if (global5_Exprs_ref[0].arrAccess(local4_Vari_2414).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) {
					__debugInfo = "2166:\src\CompilerPasses\Parser.gbas";
					func5_Error("Cannot increment array...", 2165, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "2166:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2168:\src\CompilerPasses\Parser.gbas";
				{
					var local17___SelectHelper30__2416 = "";
					__debugInfo = "2168:\src\CompilerPasses\Parser.gbas";
					local17___SelectHelper30__2416 = global5_Exprs_ref[0].arrAccess(local4_Vari_2414).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str;
					__debugInfo = "2192:\src\CompilerPasses\Parser.gbas";
					if ((((local17___SelectHelper30__2416) === ("int")) ? 1 : 0)) {
						__debugInfo = "2175:\src\CompilerPasses\Parser.gbas";
						if (func7_IsToken(",")) {
							__debugInfo = "2171:\src\CompilerPasses\Parser.gbas";
							func5_Match(",", 2170, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "2172:\src\CompilerPasses\Parser.gbas";
							local7_AddExpr_2415 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 2171, 0);
							__debugInfo = "2171:\src\CompilerPasses\Parser.gbas";
						} else {
							__debugInfo = "2174:\src\CompilerPasses\Parser.gbas";
							local7_AddExpr_2415 = func19_CreateIntExpression(1);
							__debugInfo = "2174:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "2175:\src\CompilerPasses\Parser.gbas";
					} else if ((((local17___SelectHelper30__2416) === ("float")) ? 1 : 0)) {
						__debugInfo = "2182:\src\CompilerPasses\Parser.gbas";
						if (func7_IsToken(",")) {
							__debugInfo = "2178:\src\CompilerPasses\Parser.gbas";
							func5_Match(",", 2177, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "2179:\src\CompilerPasses\Parser.gbas";
							local7_AddExpr_2415 = func14_EnsureDatatype(func10_Expression(0), global13_floatDatatype, 2178, 0);
							__debugInfo = "2178:\src\CompilerPasses\Parser.gbas";
						} else {
							__debugInfo = "2181:\src\CompilerPasses\Parser.gbas";
							local7_AddExpr_2415 = func21_CreateFloatExpression(1);
							__debugInfo = "2181:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "2182:\src\CompilerPasses\Parser.gbas";
					} else if ((((local17___SelectHelper30__2416) === ("string")) ? 1 : 0)) {
						__debugInfo = "2189:\src\CompilerPasses\Parser.gbas";
						if (func7_IsToken(",")) {
							__debugInfo = "2185:\src\CompilerPasses\Parser.gbas";
							func5_Match(",", 2184, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "2186:\src\CompilerPasses\Parser.gbas";
							local7_AddExpr_2415 = func14_EnsureDatatype(func10_Expression(0), global11_strDatatype, 2185, 0);
							__debugInfo = "2185:\src\CompilerPasses\Parser.gbas";
						} else {
							__debugInfo = "2188:\src\CompilerPasses\Parser.gbas";
							local7_AddExpr_2415 = func19_CreateStrExpression(" ");
							__debugInfo = "2188:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "2189:\src\CompilerPasses\Parser.gbas";
					} else {
						__debugInfo = "2191:\src\CompilerPasses\Parser.gbas";
						func5_Error("Cannot increment type or prototype", 2190, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "2191:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "2168:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2193:\src\CompilerPasses\Parser.gbas";
				return tryClone(func19_CreateIncExpression(local4_Vari_2414, local7_AddExpr_2415));
				__debugInfo = "2164:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2313) === (func7_IsToken("DEC"))) ? 1 : 0)) {
				var local4_Vari_2417 = 0, local7_AddExpr_2418 = 0;
				__debugInfo = "2195:\src\CompilerPasses\Parser.gbas";
				func5_Match("DEC", 2194, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "2196:\src\CompilerPasses\Parser.gbas";
				local4_Vari_2417 = func10_Identifier(0);
				__debugInfo = "2198:\src\CompilerPasses\Parser.gbas";
				if (global5_Exprs_ref[0].arrAccess(local4_Vari_2417).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) {
					__debugInfo = "2198:\src\CompilerPasses\Parser.gbas";
					func5_Error("Cannot decrement array...", 2197, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "2198:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2199:\src\CompilerPasses\Parser.gbas";
				{
					var local17___SelectHelper31__2419 = "";
					__debugInfo = "2199:\src\CompilerPasses\Parser.gbas";
					local17___SelectHelper31__2419 = global5_Exprs_ref[0].arrAccess(local4_Vari_2417).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str;
					__debugInfo = "2220:\src\CompilerPasses\Parser.gbas";
					if ((((local17___SelectHelper31__2419) === ("int")) ? 1 : 0)) {
						__debugInfo = "2207:\src\CompilerPasses\Parser.gbas";
						if (func7_IsToken(",")) {
							var alias2_Op_ref_2420 = [pool_TOperator.alloc()];
							__debugInfo = "2202:\src\CompilerPasses\Parser.gbas";
							func5_Match(",", 2201, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "2203:\src\CompilerPasses\Parser.gbas";
							alias2_Op_ref_2420 = global9_Operators_ref[0].arrAccess(func14_SearchOperator("sub")).values[tmpPositionCache] /* ALIAS */;
							__debugInfo = "2204:\src\CompilerPasses\Parser.gbas";
							local7_AddExpr_2418 = func24_CreateOperatorExpression(unref(alias2_Op_ref_2420[0]), func19_CreateIntExpression(0), func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 2203, 0));
							__debugInfo = "2202:\src\CompilerPasses\Parser.gbas";pool_TOperator.free(alias2_Op_ref_2420);
						} else {
							__debugInfo = "2206:\src\CompilerPasses\Parser.gbas";
							local7_AddExpr_2418 = func19_CreateIntExpression(-(1));
							__debugInfo = "2206:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "2207:\src\CompilerPasses\Parser.gbas";
					} else if ((((local17___SelectHelper31__2419) === ("float")) ? 1 : 0)) {
						__debugInfo = "2215:\src\CompilerPasses\Parser.gbas";
						if (func7_IsToken(",")) {
							var alias2_Op_ref_2421 = [pool_TOperator.alloc()];
							__debugInfo = "2210:\src\CompilerPasses\Parser.gbas";
							func5_Match(",", 2209, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "2211:\src\CompilerPasses\Parser.gbas";
							alias2_Op_ref_2421 = global9_Operators_ref[0].arrAccess(func14_SearchOperator("sub")).values[tmpPositionCache] /* ALIAS */;
							__debugInfo = "2212:\src\CompilerPasses\Parser.gbas";
							local7_AddExpr_2418 = func24_CreateOperatorExpression(unref(alias2_Op_ref_2421[0]), func21_CreateFloatExpression(0), func14_EnsureDatatype(func10_Expression(0), global13_floatDatatype, 2211, 0));
							__debugInfo = "2210:\src\CompilerPasses\Parser.gbas";pool_TOperator.free(alias2_Op_ref_2421);
						} else {
							__debugInfo = "2214:\src\CompilerPasses\Parser.gbas";
							local7_AddExpr_2418 = func21_CreateFloatExpression(-(1));
							__debugInfo = "2214:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "2215:\src\CompilerPasses\Parser.gbas";
					} else if ((((local17___SelectHelper31__2419) === ("string")) ? 1 : 0)) {
						__debugInfo = "2217:\src\CompilerPasses\Parser.gbas";
						func5_Error("Cannot decrement string...", 2216, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "2217:\src\CompilerPasses\Parser.gbas";
					} else {
						__debugInfo = "2219:\src\CompilerPasses\Parser.gbas";
						func5_Error("Cannot decrement type or prototype", 2218, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "2219:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "2199:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2221:\src\CompilerPasses\Parser.gbas";
				return tryClone(func19_CreateIncExpression(local4_Vari_2417, local7_AddExpr_2418));
				__debugInfo = "2195:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2313) === (func7_IsToken("ASSERT"))) ? 1 : 0)) {
				var local4_Expr_2422 = 0;
				__debugInfo = "2223:\src\CompilerPasses\Parser.gbas";
				func5_Match("ASSERT", 2222, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "2224:\src\CompilerPasses\Parser.gbas";
				local4_Expr_2422 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 2223, 0);
				__debugInfo = "2228:\src\CompilerPasses\Parser.gbas";
				if (global9_DEBUGMODE) {
					__debugInfo = "2227:\src\CompilerPasses\Parser.gbas";
					return tryClone(func22_CreateAssertExpression(local4_Expr_2422));
					__debugInfo = "2227:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2223:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2313) === (func7_IsToken("DEBUG"))) ? 1 : 0)) {
				var local4_Expr_2423 = 0;
				__debugInfo = "2230:\src\CompilerPasses\Parser.gbas";
				func5_Match("DEBUG", 2229, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "2231:\src\CompilerPasses\Parser.gbas";
				local4_Expr_2423 = func14_EnsureDatatype(func10_Expression(0), global11_strDatatype, 2230, 0);
				__debugInfo = "2235:\src\CompilerPasses\Parser.gbas";
				if (global9_DEBUGMODE) {
					__debugInfo = "2234:\src\CompilerPasses\Parser.gbas";
					return tryClone(func27_CreateDebugOutputExpression(local4_Expr_2423));
					__debugInfo = "2234:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2230:\src\CompilerPasses\Parser.gbas";
			} else {
				__debugInfo = "2237:\src\CompilerPasses\Parser.gbas";
				func5_Error("Unexpected keyword", 2236, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "2237:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "1540:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2239:\src\CompilerPasses\Parser.gbas";
		return tryClone(func21_CreateEmptyExpression());
		__debugInfo = "2240:\src\CompilerPasses\Parser.gbas";
		return 0;
		__debugInfo = "1540:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func7_Keyword = window['func7_Keyword'];
window['func14_ImplicitDefine'] = function() {
	stackPush("function: ImplicitDefine", __debugInfo);
	try {
		__debugInfo = "2264:\src\CompilerPasses\Parser.gbas";
		if ((((global6_STRICT) === (0)) ? 1 : 0)) {
			__debugInfo = "2263:\src\CompilerPasses\Parser.gbas";
			if (((func12_IsIdentifier(0, 0)) ? 0 : 1)) {
				var local3_pos_2424 = 0, local4_Vari_2425 = pool_TIdentifierVari.alloc();
				__debugInfo = "2247:\src\CompilerPasses\Parser.gbas";
				local3_pos_2424 = global8_Compiler.attr11_currentPosi;
				__debugInfo = "2251:\src\CompilerPasses\Parser.gbas";
				local4_Vari_2425 = func7_VariDef(1).clone(/* In Assign */);
				__debugInfo = "2252:\src\CompilerPasses\Parser.gbas";
				local4_Vari_2425.attr3_Typ = ~~(2);
				__debugInfo = "2253:\src\CompilerPasses\Parser.gbas";
				func11_AddVariable(local4_Vari_2425, 0);
				__debugInfo = "2254:\src\CompilerPasses\Parser.gbas";
				DIMPUSH(global8_Compiler.attr7_Globals, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
				__debugInfo = "2255:\src\CompilerPasses\Parser.gbas";
				func7_Warning((((("Implicit variable declaration '") + (local4_Vari_2425.attr8_Name_Str))) + ("'")));
				__debugInfo = "2258:\src\CompilerPasses\Parser.gbas";
				global8_Compiler.attr11_currentPosi = ((local3_pos_2424) - (1));
				__debugInfo = "2259:\src\CompilerPasses\Parser.gbas";
				func7_GetNext();
				__debugInfo = "2262:\src\CompilerPasses\Parser.gbas";
				return tryClone(((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
				__debugInfo = "2247:\src\CompilerPasses\Parser.gbas";pool_TIdentifierVari.free(local4_Vari_2425);
			};
			__debugInfo = "2263:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2265:\src\CompilerPasses\Parser.gbas";
		return tryClone(-(1));
		__debugInfo = "2266:\src\CompilerPasses\Parser.gbas";
		return 0;
		__debugInfo = "2264:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func14_ImplicitDefine = window['func14_ImplicitDefine'];
window['func9_IsKeyword'] = function() {
	stackPush("function: IsKeyword", __debugInfo);
	try {
		__debugInfo = "2270:\src\CompilerPasses\Parser.gbas";
		return tryClone((global10_KeywordMap).DoesKeyExist(func14_GetCurrent_Str()));
		__debugInfo = "2271:\src\CompilerPasses\Parser.gbas";
		return 0;
		__debugInfo = "2270:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func9_IsKeyword = window['func9_IsKeyword'];
window['func12_IsIdentifier'] = function(param9_CheckType, param18_IgnoreImplicitSelf) {
	stackPush("function: IsIdentifier", __debugInfo);
	try {
		var local11_Current_Str_2430 = "", local5_dummy_ref_2431 = [0], local5_Varis_2432 = pool_array.alloc(0);
		__debugInfo = "2275:\src\CompilerPasses\Parser.gbas";
		if ((((func7_IsToken("GLOBAL")) || (func7_IsToken("LOCAL"))) ? 1 : 0)) {
			__debugInfo = "2275:\src\CompilerPasses\Parser.gbas";
			return 1;
			__debugInfo = "2275:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2287:\src\CompilerPasses\Parser.gbas";
		if ((((func6_IsType("")) && (param9_CheckType)) ? 1 : 0)) {
			var local3_pos_2428 = 0, local3_ret_2429 = 0;
			__debugInfo = "2278:\src\CompilerPasses\Parser.gbas";
			local3_pos_2428 = global8_Compiler.attr11_currentPosi;
			__debugInfo = "2279:\src\CompilerPasses\Parser.gbas";
			func7_GetNext();
			__debugInfo = "2285:\src\CompilerPasses\Parser.gbas";
			if (func7_IsToken("(")) {
				__debugInfo = "2282:\src\CompilerPasses\Parser.gbas";
				local3_ret_2429 = 1;
				__debugInfo = "2282:\src\CompilerPasses\Parser.gbas";
			} else {
				__debugInfo = "2284:\src\CompilerPasses\Parser.gbas";
				local3_ret_2429 = 0;
				__debugInfo = "2284:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "2286:\src\CompilerPasses\Parser.gbas";
			global8_Compiler.attr11_currentPosi = local3_pos_2428;
			__debugInfo = "2278:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2289:\src\CompilerPasses\Parser.gbas";
		local11_Current_Str_2430 = func14_GetCurrent_Str();
		__debugInfo = "2297:\src\CompilerPasses\Parser.gbas";
		if ((global8_Compiler.attr11_GlobalFuncs).GetValue(local11_Current_Str_2430, local5_dummy_ref_2431)) {
			__debugInfo = "2297:\src\CompilerPasses\Parser.gbas";
			return 1;
			__debugInfo = "2297:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2300:\src\CompilerPasses\Parser.gbas";
		func8_GetVaris(unref(local5_Varis_2432), -(1), 0);
		__debugInfo = "2300:\src\CompilerPasses\Parser.gbas";
		{
			var local1_i_2433 = 0.0;
			__debugInfo = "2309:\src\CompilerPasses\Parser.gbas";
			for (local1_i_2433 = ((BOUNDS(local5_Varis_2432, 0)) - (1));toCheck(local1_i_2433, 0, -(1));local1_i_2433 += -(1)) {
				__debugInfo = "2308:\src\CompilerPasses\Parser.gbas";
				if ((((func17_CleanVariable_Str(local11_Current_Str_2430)) === (global8_Compiler.attr5_Varis_ref[0].arrAccess(local5_Varis_2432.arrAccess(~~(local1_i_2433)).values[tmpPositionCache]).values[tmpPositionCache][0].attr8_Name_Str)) ? 1 : 0)) {
					__debugInfo = "2307:\src\CompilerPasses\Parser.gbas";
					if ((((param18_IgnoreImplicitSelf) && ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local5_Varis_2432.arrAccess(~~(local1_i_2433)).values[tmpPositionCache]).values[tmpPositionCache][0].attr3_Typ) === (3)) ? 1 : 0))) ? 1 : 0)) {
						__debugInfo = "2304:\src\CompilerPasses\Parser.gbas";
						return tryClone(0);
						__debugInfo = "2304:\src\CompilerPasses\Parser.gbas";
					} else {
						__debugInfo = "2306:\src\CompilerPasses\Parser.gbas";
						return 1;
						__debugInfo = "2306:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "2307:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2308:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "2309:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2329:\src\CompilerPasses\Parser.gbas";
		if ((((((((((global8_Compiler.attr11_currentFunc) !== (-(1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType) !== (-(1))) ? 1 : 0))) ? 1 : 0)) && (((param18_IgnoreImplicitSelf) ? 0 : 1))) ? 1 : 0)) {
			var alias3_Typ_ref_2434 = [pool_TIdentifierType.alloc()], local5_myTyp_2435 = 0;
			__debugInfo = "2313:\src\CompilerPasses\Parser.gbas";
			alias3_Typ_ref_2434 = global8_Compiler.attr5_Types_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType).values[tmpPositionCache] /* ALIAS */;
			__debugInfo = "2314:\src\CompilerPasses\Parser.gbas";
			local5_myTyp_2435 = alias3_Typ_ref_2434[0].attr2_ID;
			__debugInfo = "2323:\src\CompilerPasses\Parser.gbas";
			while ((((local5_myTyp_2435) !== (-(1))) ? 1 : 0)) {
				__debugInfo = "2320:\src\CompilerPasses\Parser.gbas";
				var forEachSaver21686 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_myTyp_2435).values[tmpPositionCache][0].attr7_Methods;
				for(var forEachCounter21686 = 0 ; forEachCounter21686 < forEachSaver21686.values.length ; forEachCounter21686++) {
					var local1_M_2436 = forEachSaver21686.values[forEachCounter21686];
				{
						__debugInfo = "2319:\src\CompilerPasses\Parser.gbas";
						if (func7_IsToken(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local1_M_2436).values[tmpPositionCache][0].attr8_Name_Str)) {
							__debugInfo = "2318:\src\CompilerPasses\Parser.gbas";
							return 1;
							__debugInfo = "2318:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "2319:\src\CompilerPasses\Parser.gbas";
					}
					forEachSaver21686.values[forEachCounter21686] = local1_M_2436;
				
				};
				__debugInfo = "2322:\src\CompilerPasses\Parser.gbas";
				local5_myTyp_2435 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_myTyp_2435).values[tmpPositionCache][0].attr9_Extending;
				__debugInfo = "2320:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "2328:\src\CompilerPasses\Parser.gbas";
			var forEachSaver21717 = alias3_Typ_ref_2434[0].attr10_Attributes;
			for(var forEachCounter21717 = 0 ; forEachCounter21717 < forEachSaver21717.values.length ; forEachCounter21717++) {
				var local1_A_2437 = forEachSaver21717.values[forEachCounter21717];
			{
					__debugInfo = "2327:\src\CompilerPasses\Parser.gbas";
					if (func7_IsToken(global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_A_2437).values[tmpPositionCache][0].attr8_Name_Str)) {
						__debugInfo = "2326:\src\CompilerPasses\Parser.gbas";
						return 1;
						__debugInfo = "2326:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "2327:\src\CompilerPasses\Parser.gbas";
				}
				forEachSaver21717.values[forEachCounter21717] = local1_A_2437;
			
			};
			__debugInfo = "2313:\src\CompilerPasses\Parser.gbas";pool_TIdentifierType.free(alias3_Typ_ref_2434);
		};
		__debugInfo = "2331:\src\CompilerPasses\Parser.gbas";
		return tryClone(0);
		__debugInfo = "2332:\src\CompilerPasses\Parser.gbas";
		return 0;
		__debugInfo = "2275:\src\CompilerPasses\Parser.gbas";pool_array.free(local5_Varis_2432);
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func12_IsIdentifier = window['func12_IsIdentifier'];
window['func8_IsNumber'] = function() {
	stackPush("function: IsNumber", __debugInfo);
	try {
		__debugInfo = "2335:\src\CompilerPasses\Parser.gbas";
		{
			var local1_i_2438 = 0.0;
			__debugInfo = "2340:\src\CompilerPasses\Parser.gbas";
			for (local1_i_2438 = 0;toCheck(local1_i_2438, (((func14_GetCurrent_Str()).length) - (1)), 1);local1_i_2438 += 1) {
				__debugInfo = "2339:\src\CompilerPasses\Parser.gbas";
				if (((((((ASC(func14_GetCurrent_Str(), ~~(local1_i_2438))) < (48)) ? 1 : 0)) || ((((ASC(func14_GetCurrent_Str(), ~~(local1_i_2438))) > (57)) ? 1 : 0))) ? 1 : 0)) {
					__debugInfo = "2338:\src\CompilerPasses\Parser.gbas";
					return tryClone(0);
					__debugInfo = "2338:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2339:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "2340:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2341:\src\CompilerPasses\Parser.gbas";
		return 1;
		__debugInfo = "2342:\src\CompilerPasses\Parser.gbas";
		return 0;
		__debugInfo = "2335:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func8_IsNumber = window['func8_IsNumber'];
window['func8_IsString'] = function() {
	stackPush("function: IsString", __debugInfo);
	try {
		__debugInfo = "2350:\src\CompilerPasses\Parser.gbas";
		if (((((((MID_Str(func14_GetCurrent_Str(), 0, 1)) === ("\"")) ? 1 : 0)) && ((((MID_Str(func14_GetCurrent_Str(), (((func14_GetCurrent_Str()).length) - (1)), 1)) === ("\"")) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "2347:\src\CompilerPasses\Parser.gbas";
			return 1;
			__debugInfo = "2347:\src\CompilerPasses\Parser.gbas";
		} else {
			__debugInfo = "2349:\src\CompilerPasses\Parser.gbas";
			return tryClone(0);
			__debugInfo = "2349:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2351:\src\CompilerPasses\Parser.gbas";
		return 0;
		__debugInfo = "2350:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func8_IsString = window['func8_IsString'];
window['func6_IsType'] = function(param7_Str_Str) {
	stackPush("function: IsType", __debugInfo);
	try {
		__debugInfo = "2355:\src\CompilerPasses\Parser.gbas";
		if ((((param7_Str_Str) === ("")) ? 1 : 0)) {
			__debugInfo = "2355:\src\CompilerPasses\Parser.gbas";
			param7_Str_Str = func14_GetCurrent_Str();
			__debugInfo = "2355:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2361:\src\CompilerPasses\Parser.gbas";
		var forEachSaver21818 = global8_Compiler.attr5_Types_ref[0];
		for(var forEachCounter21818 = 0 ; forEachCounter21818 < forEachSaver21818.values.length ; forEachCounter21818++) {
			var local3_typ_ref_2440 = forEachSaver21818.values[forEachCounter21818];
		{
				__debugInfo = "2360:\src\CompilerPasses\Parser.gbas";
				if ((((local3_typ_ref_2440[0].attr12_RealName_Str) === (param7_Str_Str)) ? 1 : 0)) {
					__debugInfo = "2358:\src\CompilerPasses\Parser.gbas";
					global8_LastType = local3_typ_ref_2440[0].clone(/* In Assign */);
					__debugInfo = "2359:\src\CompilerPasses\Parser.gbas";
					return 1;
					__debugInfo = "2358:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2360:\src\CompilerPasses\Parser.gbas";
			}
			forEachSaver21818.values[forEachCounter21818] = local3_typ_ref_2440;
		
		};
		__debugInfo = "2362:\src\CompilerPasses\Parser.gbas";
		return tryClone(0);
		__debugInfo = "2363:\src\CompilerPasses\Parser.gbas";
		return 0;
		__debugInfo = "2355:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func6_IsType = window['func6_IsType'];
window['func13_IsVarExisting'] = function(param7_Var_Str) {
	stackPush("function: IsVarExisting", __debugInfo);
	try {
		var local4_Vars_2442 = pool_array.alloc(0);
		__debugInfo = "2368:\src\CompilerPasses\Parser.gbas";
		func8_GetVaris(unref(local4_Vars_2442), -(1), 0);
		__debugInfo = "2368:\src\CompilerPasses\Parser.gbas";
		{
			var local1_i_2443 = 0.0;
			__debugInfo = "2371:\src\CompilerPasses\Parser.gbas";
			for (local1_i_2443 = ((BOUNDS(local4_Vars_2442, 0)) - (1));toCheck(local1_i_2443, 0, -(1));local1_i_2443 += -(1)) {
				__debugInfo = "2370:\src\CompilerPasses\Parser.gbas";
				if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Vars_2442.arrAccess(~~(local1_i_2443)).values[tmpPositionCache]).values[tmpPositionCache][0].attr8_Name_Str) === (param7_Var_Str)) ? 1 : 0)) {
					__debugInfo = "2370:\src\CompilerPasses\Parser.gbas";
					return 1;
					__debugInfo = "2370:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2370:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "2371:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2377:\src\CompilerPasses\Parser.gbas";
		return tryClone((global10_KeywordMap).DoesKeyExist(param7_Var_Str));
		__debugInfo = "2378:\src\CompilerPasses\Parser.gbas";
		return 0;
		__debugInfo = "2368:\src\CompilerPasses\Parser.gbas";pool_array.free(local4_Vars_2442);
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func13_IsVarExisting = window['func13_IsVarExisting'];
window['func14_IsValidVarName'] = function() {
	stackPush("function: IsValidVarName", __debugInfo);
	try {
		__debugInfo = "2382:\src\CompilerPasses\Parser.gbas";
		if (func9_IsKeyword()) {
			__debugInfo = "2382:\src\CompilerPasses\Parser.gbas";
			func5_Error((((("Invalid identifier name: '") + (func14_GetCurrent_Str()))) + ("' is already a keyword")), 2381, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "2382:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2384:\src\CompilerPasses\Parser.gbas";
		if (func8_IsNumber()) {
			__debugInfo = "2384:\src\CompilerPasses\Parser.gbas";
			func5_Error((((("Invalid Identifier name: '") + (func14_GetCurrent_Str()))) + ("' is a number")), 2383, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "2384:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2385:\src\CompilerPasses\Parser.gbas";
		if (func8_IsString()) {
			__debugInfo = "2385:\src\CompilerPasses\Parser.gbas";
			func5_Error((((("Invalid identifier name: '") + (func14_GetCurrent_Str()))) + ("' is a string")), 2384, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "2385:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2386:\src\CompilerPasses\Parser.gbas";
		if (func10_IsOperator()) {
			__debugInfo = "2386:\src\CompilerPasses\Parser.gbas";
			func5_Error((((("Invalid identifier name: '") + (func14_GetCurrent_Str()))) + ("' is an operator")), 2385, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "2386:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2388:\src\CompilerPasses\Parser.gbas";
		return 1;
		__debugInfo = "2389:\src\CompilerPasses\Parser.gbas";
		return 0;
		__debugInfo = "2382:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func14_IsValidVarName = window['func14_IsValidVarName'];
window['func14_IsFuncExisting'] = function(param8_func_Str, param10_IsCallback) {
	stackPush("function: IsFuncExisting", __debugInfo);
	try {
		__debugInfo = "2395:\src\CompilerPasses\Parser.gbas";
		var forEachSaver21943 = global8_Compiler.attr5_Types_ref[0];
		for(var forEachCounter21943 = 0 ; forEachCounter21943 < forEachSaver21943.values.length ; forEachCounter21943++) {
			var local1_T_ref_2446 = forEachSaver21943.values[forEachCounter21943];
		{
				__debugInfo = "2394:\src\CompilerPasses\Parser.gbas";
				if ((((local1_T_ref_2446[0].attr8_Name_Str) === (param8_func_Str)) ? 1 : 0)) {
					__debugInfo = "2394:\src\CompilerPasses\Parser.gbas";
					return 1;
					__debugInfo = "2394:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2394:\src\CompilerPasses\Parser.gbas";
			}
			forEachSaver21943.values[forEachCounter21943] = local1_T_ref_2446;
		
		};
		__debugInfo = "2397:\src\CompilerPasses\Parser.gbas";
		if ((global10_KeywordMap).DoesKeyExist(param8_func_Str)) {
			__debugInfo = "2397:\src\CompilerPasses\Parser.gbas";
			return 1;
			__debugInfo = "2397:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2401:\src\CompilerPasses\Parser.gbas";
		var forEachSaver21987 = global8_Compiler.attr5_Funcs_ref[0];
		for(var forEachCounter21987 = 0 ; forEachCounter21987 < forEachSaver21987.values.length ; forEachCounter21987++) {
			var local1_F_ref_2447 = forEachSaver21987.values[forEachCounter21987];
		{
				__debugInfo = "2400:\src\CompilerPasses\Parser.gbas";
				if ((((((((((param8_func_Str) === (local1_F_ref_2447[0].attr8_Name_Str)) ? 1 : 0)) && (((((((local1_F_ref_2447[0].attr3_Typ) === (2)) ? 1 : 0)) || ((((local1_F_ref_2447[0].attr3_Typ) === (1)) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) && ((((local1_F_ref_2447[0].attr10_IsCallback) === (param10_IsCallback)) ? 1 : 0))) ? 1 : 0)) {
					__debugInfo = "2400:\src\CompilerPasses\Parser.gbas";
					return 1;
					__debugInfo = "2400:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2400:\src\CompilerPasses\Parser.gbas";
			}
			forEachSaver21987.values[forEachCounter21987] = local1_F_ref_2447;
		
		};
		__debugInfo = "2403:\src\CompilerPasses\Parser.gbas";
		return tryClone(0);
		__debugInfo = "2404:\src\CompilerPasses\Parser.gbas";
		return 0;
		__debugInfo = "2395:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func14_IsFuncExisting = window['func14_IsFuncExisting'];
window['func10_IsOperator'] = function() {
	stackPush("function: IsOperator", __debugInfo);
	try {
		__debugInfo = "2410:\src\CompilerPasses\Parser.gbas";
		var forEachSaver22008 = global9_Operators_ref[0];
		for(var forEachCounter22008 = 0 ; forEachCounter22008 < forEachSaver22008.values.length ; forEachCounter22008++) {
			var local2_Op_ref_2448 = forEachSaver22008.values[forEachCounter22008];
		{
				__debugInfo = "2409:\src\CompilerPasses\Parser.gbas";
				if (func7_IsToken(local2_Op_ref_2448[0].attr7_Sym_Str)) {
					__debugInfo = "2409:\src\CompilerPasses\Parser.gbas";
					return 1;
					__debugInfo = "2409:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2409:\src\CompilerPasses\Parser.gbas";
			}
			forEachSaver22008.values[forEachCounter22008] = local2_Op_ref_2448;
		
		};
		__debugInfo = "2411:\src\CompilerPasses\Parser.gbas";
		return tryClone(0);
		__debugInfo = "2412:\src\CompilerPasses\Parser.gbas";
		return 0;
		__debugInfo = "2410:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func10_IsOperator = window['func10_IsOperator'];
window['func15_IsValidDatatype'] = function() {
	stackPush("function: IsValidDatatype", __debugInfo);
	try {
		__debugInfo = "2417:\src\CompilerPasses\Parser.gbas";
		if (func6_IsType("")) {
			__debugInfo = "2417:\src\CompilerPasses\Parser.gbas";
			return 1;
			__debugInfo = "2417:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2424:\src\CompilerPasses\Parser.gbas";
		var forEachSaver22043 = global8_Compiler.attr5_Funcs_ref[0];
		for(var forEachCounter22043 = 0 ; forEachCounter22043 < forEachSaver22043.values.length ; forEachCounter22043++) {
			var local4_func_ref_2449 = forEachSaver22043.values[forEachCounter22043];
		{
				__debugInfo = "2423:\src\CompilerPasses\Parser.gbas";
				if (((((((local4_func_ref_2449[0].attr3_Typ) === (4)) ? 1 : 0)) && (func7_IsToken(local4_func_ref_2449[0].attr8_Name_Str))) ? 1 : 0)) {
					__debugInfo = "2422:\src\CompilerPasses\Parser.gbas";
					return 1;
					__debugInfo = "2422:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2423:\src\CompilerPasses\Parser.gbas";
			}
			forEachSaver22043.values[forEachCounter22043] = local4_func_ref_2449;
		
		};
		__debugInfo = "2428:\src\CompilerPasses\Parser.gbas";
		var forEachSaver22057 = global8_Compiler.attr5_Types_ref[0];
		for(var forEachCounter22057 = 0 ; forEachCounter22057 < forEachSaver22057.values.length ; forEachCounter22057++) {
			var local3_typ_ref_2450 = forEachSaver22057.values[forEachCounter22057];
		{
				__debugInfo = "2427:\src\CompilerPasses\Parser.gbas";
				STDOUT(((local3_typ_ref_2450[0].attr12_RealName_Str) + ("\n")));
				__debugInfo = "2427:\src\CompilerPasses\Parser.gbas";
			}
			forEachSaver22057.values[forEachCounter22057] = local3_typ_ref_2450;
		
		};
		__debugInfo = "2429:\src\CompilerPasses\Parser.gbas";
		func5_Error((("Unknown datatype: ") + (func14_GetCurrent_Str())), 2428, "src\CompilerPasses\Parser.gbas");
		__debugInfo = "2430:\src\CompilerPasses\Parser.gbas";
		return 0;
		__debugInfo = "2417:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func15_IsValidDatatype = window['func15_IsValidDatatype'];
window['func8_IsDefine'] = function(param7_Def_Str) {
	stackPush("function: IsDefine", __debugInfo);
	try {
		__debugInfo = "2435:\src\CompilerPasses\Parser.gbas";
		if ((((param7_Def_Str) === ("")) ? 1 : 0)) {
			__debugInfo = "2435:\src\CompilerPasses\Parser.gbas";
			param7_Def_Str = func14_GetCurrent_Str();
			__debugInfo = "2435:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2441:\src\CompilerPasses\Parser.gbas";
		var forEachSaver22094 = global7_Defines;
		for(var forEachCounter22094 = 0 ; forEachCounter22094 < forEachSaver22094.values.length ; forEachCounter22094++) {
			var local3_Def_2452 = forEachSaver22094.values[forEachCounter22094];
		{
				__debugInfo = "2440:\src\CompilerPasses\Parser.gbas";
				if ((((local3_Def_2452.attr7_Key_Str) === (param7_Def_Str)) ? 1 : 0)) {
					__debugInfo = "2438:\src\CompilerPasses\Parser.gbas";
					global10_LastDefine = local3_Def_2452.clone(/* In Assign */);
					__debugInfo = "2439:\src\CompilerPasses\Parser.gbas";
					return 1;
					__debugInfo = "2438:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2440:\src\CompilerPasses\Parser.gbas";
			}
			forEachSaver22094.values[forEachCounter22094] = local3_Def_2452;
		
		};
		__debugInfo = "2442:\src\CompilerPasses\Parser.gbas";
		return tryClone(0);
		__debugInfo = "2443:\src\CompilerPasses\Parser.gbas";
		return 0;
		__debugInfo = "2435:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func8_IsDefine = window['func8_IsDefine'];
window['func8_GetVaris'] = function(param5_Varis, param3_Scp, param9_PreferVar) {
	stackPush("function: GetVaris", __debugInfo);
	try {
		__debugInfo = "2447:\src\CompilerPasses\Parser.gbas";
		if ((((param3_Scp) === (-(1))) ? 1 : 0)) {
			__debugInfo = "2447:\src\CompilerPasses\Parser.gbas";
			param3_Scp = global8_Compiler.attr12_CurrentScope;
			__debugInfo = "2447:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2454:\src\CompilerPasses\Parser.gbas";
		if (((((((param9_PreferVar) === (-(1))) ? 1 : 0)) && ((((BOUNDS(param5_Varis, 0)) === (0)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "2453:\src\CompilerPasses\Parser.gbas";
			var forEachSaver22141 = global8_Compiler.attr7_Globals;
			for(var forEachCounter22141 = 0 ; forEachCounter22141 < forEachSaver22141.values.length ; forEachCounter22141++) {
				var local4_Vari_2456 = forEachSaver22141.values[forEachCounter22141];
			{
					__debugInfo = "2452:\src\CompilerPasses\Parser.gbas";
					DIMPUSH(param5_Varis, local4_Vari_2456);
					__debugInfo = "2452:\src\CompilerPasses\Parser.gbas";
				}
				forEachSaver22141.values[forEachCounter22141] = local4_Vari_2456;
			
			};
			__debugInfo = "2453:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2467:\src\CompilerPasses\Parser.gbas";
		if ((((param3_Scp) !== (-(1))) ? 1 : 0)) {
			__debugInfo = "2459:\src\CompilerPasses\Parser.gbas";
			var forEachSaver22165 = global5_Exprs_ref[0].arrAccess(~~(param3_Scp)).values[tmpPositionCache][0].attr5_Varis;
			for(var forEachCounter22165 = 0 ; forEachCounter22165 < forEachSaver22165.values.length ; forEachCounter22165++) {
				var local4_Vari_2457 = forEachSaver22165.values[forEachCounter22165];
			{
					__debugInfo = "2458:\src\CompilerPasses\Parser.gbas";
					DIMPUSH(param5_Varis, local4_Vari_2457);
					__debugInfo = "2458:\src\CompilerPasses\Parser.gbas";
				}
				forEachSaver22165.values[forEachCounter22165] = local4_Vari_2457;
			
			};
			__debugInfo = "2466:\src\CompilerPasses\Parser.gbas";
			if (((((((global8_Compiler.attr11_currentFunc) !== (-(1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType) !== (-(1))) ? 1 : 0))) ? 1 : 0)) {
				var alias3_Typ_ref_2458 = [pool_TIdentifierType.alloc()];
				__debugInfo = "2462:\src\CompilerPasses\Parser.gbas";
				alias3_Typ_ref_2458 = global8_Compiler.attr5_Types_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType).values[tmpPositionCache] /* ALIAS */;
				__debugInfo = "2465:\src\CompilerPasses\Parser.gbas";
				var forEachSaver22214 = alias3_Typ_ref_2458[0].attr10_Attributes;
				for(var forEachCounter22214 = 0 ; forEachCounter22214 < forEachSaver22214.values.length ; forEachCounter22214++) {
					var local1_A_2459 = forEachSaver22214.values[forEachCounter22214];
				{
						__debugInfo = "2464:\src\CompilerPasses\Parser.gbas";
						DIMPUSH(param5_Varis, local1_A_2459);
						__debugInfo = "2464:\src\CompilerPasses\Parser.gbas";
					}
					forEachSaver22214.values[forEachCounter22214] = local1_A_2459;
				
				};
				__debugInfo = "2462:\src\CompilerPasses\Parser.gbas";pool_TIdentifierType.free(alias3_Typ_ref_2458);
			};
			__debugInfo = "2459:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2476:\src\CompilerPasses\Parser.gbas";
		if (((((((global5_Exprs_ref[0].arrAccess(~~(param3_Scp)).values[tmpPositionCache][0].attr10_SuperScope) !== (-(1))) ? 1 : 0)) && ((((global5_Exprs_ref[0].arrAccess(~~(param3_Scp)).values[tmpPositionCache][0].attr6_ScpTyp) !== (2)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "2470:\src\CompilerPasses\Parser.gbas";
			func8_GetVaris(unref(param5_Varis), global5_Exprs_ref[0].arrAccess(~~(param3_Scp)).values[tmpPositionCache][0].attr10_SuperScope, 0);
			__debugInfo = "2470:\src\CompilerPasses\Parser.gbas";
		} else if ((((param9_PreferVar) >= (0)) ? 1 : 0)) {
			__debugInfo = "2475:\src\CompilerPasses\Parser.gbas";
			var forEachSaver22263 = global8_Compiler.attr7_Globals;
			for(var forEachCounter22263 = 0 ; forEachCounter22263 < forEachSaver22263.values.length ; forEachCounter22263++) {
				var local4_Vari_2460 = forEachSaver22263.values[forEachCounter22263];
			{
					__debugInfo = "2474:\src\CompilerPasses\Parser.gbas";
					DIMPUSH(param5_Varis, local4_Vari_2460);
					__debugInfo = "2474:\src\CompilerPasses\Parser.gbas";
				}
				forEachSaver22263.values[forEachCounter22263] = local4_Vari_2460;
			
			};
			__debugInfo = "2475:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2477:\src\CompilerPasses\Parser.gbas";
		return 0;
		__debugInfo = "2447:\src\CompilerPasses\Parser.gbas";pool_array.free(param5_Varis);
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func8_GetVaris = window['func8_GetVaris'];
window['func11_GetVariable'] = function(param4_expr, param3_err) {
	stackPush("function: GetVariable", __debugInfo);
	try {
		var local6_hasErr_2463 = 0;
		__debugInfo = "2484:\src\CompilerPasses\Parser.gbas";
		local6_hasErr_2463 = 0;
		__debugInfo = "2485:\src\CompilerPasses\Parser.gbas";
		{
			var local17___SelectHelper32__2464 = 0;
			__debugInfo = "2485:\src\CompilerPasses\Parser.gbas";
			local17___SelectHelper32__2464 = global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr3_Typ;
			__debugInfo = "2508:\src\CompilerPasses\Parser.gbas";
			if ((((local17___SelectHelper32__2464) === (~~(9))) ? 1 : 0)) {
				__debugInfo = "2487:\src\CompilerPasses\Parser.gbas";
				return tryClone(global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr4_vari);
				__debugInfo = "2487:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper32__2464) === (~~(13))) ? 1 : 0)) {
				__debugInfo = "2489:\src\CompilerPasses\Parser.gbas";
				return tryClone(func11_GetVariable(global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr5_array, param3_err));
				__debugInfo = "2489:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper32__2464) === (~~(18))) ? 1 : 0)) {
				__debugInfo = "2491:\src\CompilerPasses\Parser.gbas";
				return tryClone(func11_GetVariable(global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr8_nextExpr, param3_err));
				__debugInfo = "2491:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper32__2464) === (~~(54))) ? 1 : 0)) {
				__debugInfo = "2493:\src\CompilerPasses\Parser.gbas";
				return tryClone(func11_GetVariable(global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr4_expr, param3_err));
				__debugInfo = "2493:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper32__2464) === (~~(6))) ? 1 : 0)) {
				__debugInfo = "2505:\src\CompilerPasses\Parser.gbas";
				if ((((global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr4_func) !== (-(1))) ? 1 : 0)) {
					var alias4_func_ref_2465 = [pool_TIdentifierFunc.alloc()];
					__debugInfo = "2496:\src\CompilerPasses\Parser.gbas";
					alias4_func_ref_2465 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache] /* ALIAS */;
					__debugInfo = "2502:\src\CompilerPasses\Parser.gbas";
					if ((((alias4_func_ref_2465[0].attr3_Typ) === (3)) ? 1 : 0)) {
						__debugInfo = "2499:\src\CompilerPasses\Parser.gbas";
						return tryClone(-(1));
						__debugInfo = "2499:\src\CompilerPasses\Parser.gbas";
					} else {
						__debugInfo = "2501:\src\CompilerPasses\Parser.gbas";
						local6_hasErr_2463 = 1;
						__debugInfo = "2501:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "2496:\src\CompilerPasses\Parser.gbas";pool_TIdentifierFunc.free(alias4_func_ref_2465);
				} else {
					__debugInfo = "2504:\src\CompilerPasses\Parser.gbas";
					local6_hasErr_2463 = 1;
					__debugInfo = "2504:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2505:\src\CompilerPasses\Parser.gbas";
			} else {
				__debugInfo = "2507:\src\CompilerPasses\Parser.gbas";
				local6_hasErr_2463 = 1;
				__debugInfo = "2507:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "2485:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2517:\src\CompilerPasses\Parser.gbas";
		if ((((local6_hasErr_2463) && (param3_err)) ? 1 : 0)) {
			var local7_add_Str_2466 = "";
			__debugInfo = "2510:\src\CompilerPasses\Parser.gbas";
			local7_add_Str_2466 = "";
			__debugInfo = "2514:\src\CompilerPasses\Parser.gbas";
			func5_Error((("Variable expected.") + (local7_add_Str_2466)), 2513, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "2510:\src\CompilerPasses\Parser.gbas";
		} else {
			__debugInfo = "2516:\src\CompilerPasses\Parser.gbas";
			return tryClone(-(1));
			__debugInfo = "2516:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2518:\src\CompilerPasses\Parser.gbas";
		return 0;
		__debugInfo = "2484:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func11_GetVariable = window['func11_GetVariable'];
window['func12_GetRightExpr'] = function(param4_expr) {
	stackPush("function: GetRightExpr", __debugInfo);
	try {
		__debugInfo = "2522:\src\CompilerPasses\Parser.gbas";
		{
			var local17___SelectHelper33__2468 = 0;
			__debugInfo = "2522:\src\CompilerPasses\Parser.gbas";
			local17___SelectHelper33__2468 = global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr3_Typ;
			__debugInfo = "2527:\src\CompilerPasses\Parser.gbas";
			if ((((local17___SelectHelper33__2468) === (~~(18))) ? 1 : 0)) {
				__debugInfo = "2524:\src\CompilerPasses\Parser.gbas";
				return tryClone(func12_GetRightExpr(global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr8_nextExpr));
				__debugInfo = "2524:\src\CompilerPasses\Parser.gbas";
			} else {
				__debugInfo = "2526:\src\CompilerPasses\Parser.gbas";
				return tryClone(param4_expr);
				__debugInfo = "2526:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "2522:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2528:\src\CompilerPasses\Parser.gbas";
		return 0;
		__debugInfo = "2522:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func12_GetRightExpr = window['func12_GetRightExpr'];
window['func16_AddDataChars_Str'] = function(param8_Text_Str, param4_func) {
	stackPush("function: AddDataChars_Str", __debugInfo);
	try {
		__debugInfo = "2532:\src\CompilerPasses\Parser.gbas";
		if ((((param4_func.attr8_datatype.attr8_Name_Str) === ("int")) ? 1 : 0)) {
			__debugInfo = "2532:\src\CompilerPasses\Parser.gbas";
			return tryClone(((param8_Text_Str) + ("%")));
			__debugInfo = "2532:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2533:\src\CompilerPasses\Parser.gbas";
		if ((((param4_func.attr8_datatype.attr8_Name_Str) === ("float")) ? 1 : 0)) {
			__debugInfo = "2533:\src\CompilerPasses\Parser.gbas";
			return tryClone(((param8_Text_Str) + ("#")));
			__debugInfo = "2533:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2534:\src\CompilerPasses\Parser.gbas";
		return tryClone(param8_Text_Str);
		__debugInfo = "2535:\src\CompilerPasses\Parser.gbas";
		return "";
		__debugInfo = "2532:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func16_AddDataChars_Str = window['func16_AddDataChars_Str'];
window['func10_SkipTokens'] = function(param8_Open_Str, param9_Close_Str, param8_Name_Str) {
	stackPush("function: SkipTokens", __debugInfo);
	try {
		var local8_startpos_2474 = 0;
		__debugInfo = "2539:\src\CompilerPasses\Parser.gbas";
		local8_startpos_2474 = global8_Compiler.attr11_currentPosi;
		__debugInfo = "2544:\src\CompilerPasses\Parser.gbas";
		while (((((((func7_IsToken(param9_Close_Str)) === (0)) ? 1 : 0)) && (func7_HasNext())) ? 1 : 0)) {
			__debugInfo = "2543:\src\CompilerPasses\Parser.gbas";
			if (func7_HasNext()) {
				__debugInfo = "2542:\src\CompilerPasses\Parser.gbas";
				func7_GetNext();
				__debugInfo = "2542:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "2543:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2555:\src\CompilerPasses\Parser.gbas";
		if ((((func7_HasNext()) === (0)) ? 1 : 0)) {
			var local6_tmpPos_2475 = 0.0;
			__debugInfo = "2547:\src\CompilerPasses\Parser.gbas";
			local6_tmpPos_2475 = global8_Compiler.attr11_currentPosi;
			__debugInfo = "2548:\src\CompilerPasses\Parser.gbas";
			global8_Compiler.attr11_currentPosi = local8_startpos_2474;
			__debugInfo = "2551:\src\CompilerPasses\Parser.gbas";
			{
				var ex_Str = "";
				__debugInfo = "2554:\src\CompilerPasses\Parser.gbas";
				try {
					__debugInfo = "2550:\src\CompilerPasses\Parser.gbas";
					func5_Error(((((((((((param8_Open_Str) + (" "))) + (param8_Name_Str))) + (" needs '"))) + (param9_Close_Str))) + ("', unexpected end of file.")), 2549, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "2550:\src\CompilerPasses\Parser.gbas";
				} catch (ex_Str) {
					if (ex_Str instanceof OTTException) ex_Str = ex_Str.getText(); else throwError(ex_Str);{
						__debugInfo = "2552:\src\CompilerPasses\Parser.gbas";
						global8_Compiler.attr11_currentPosi = ~~(local6_tmpPos_2475);
						__debugInfo = "2553:\src\CompilerPasses\Parser.gbas";
						throw new OTTException(ex_Str, "\src\CompilerPasses\Parser.gbas", 2553);
						__debugInfo = "2552:\src\CompilerPasses\Parser.gbas";
					}
				};
				__debugInfo = "2554:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "2547:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2556:\src\CompilerPasses\Parser.gbas";
		if ((((param9_Close_Str) !== ("\n")) ? 1 : 0)) {
			__debugInfo = "2556:\src\CompilerPasses\Parser.gbas";
			func5_Match(param9_Close_Str, 2555, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "2556:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2557:\src\CompilerPasses\Parser.gbas";
		return 0;
		__debugInfo = "2539:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func10_SkipTokens = window['func10_SkipTokens'];
window['func17_BuildPrototyp_Str'] = function(param1_F) {
	stackPush("function: BuildPrototyp_Str", __debugInfo);
	try {
		var alias4_Func_ref_2478 = [pool_TIdentifierFunc.alloc()], local8_Text_Str_2479 = "", local5_Found_2480 = 0;
		__debugInfo = "2561:\src\CompilerPasses\Parser.gbas";
		alias4_Func_ref_2478 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(param1_F).values[tmpPositionCache] /* ALIAS */;
		__debugInfo = "2562:\src\CompilerPasses\Parser.gbas";
		local8_Text_Str_2479 = (((((("RETURN TYPE: ") + (alias4_Func_ref_2478[0].attr8_datatype.attr8_Name_Str))) + (func20_BuildArrBrackets_Str(alias4_Func_ref_2478[0].attr8_datatype.attr7_IsArray)))) + (" PARAMETER:"));
		__debugInfo = "2563:\src\CompilerPasses\Parser.gbas";
		local5_Found_2480 = 0;
		__debugInfo = "2569:\src\CompilerPasses\Parser.gbas";
		var forEachSaver22605 = alias4_Func_ref_2478[0].attr6_Params;
		for(var forEachCounter22605 = 0 ; forEachCounter22605 < forEachSaver22605.values.length ; forEachCounter22605++) {
			var local1_P_2481 = forEachSaver22605.values[forEachCounter22605];
		{
				var alias5_Param_ref_2482 = [pool_TIdentifierVari.alloc()];
				__debugInfo = "2565:\src\CompilerPasses\Parser.gbas";
				alias5_Param_ref_2482 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_2481).values[tmpPositionCache] /* ALIAS */;
				__debugInfo = "2566:\src\CompilerPasses\Parser.gbas";
				if (local5_Found_2480) {
					__debugInfo = "2566:\src\CompilerPasses\Parser.gbas";
					local8_Text_Str_2479 = ((local8_Text_Str_2479) + (", "));
					__debugInfo = "2566:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2567:\src\CompilerPasses\Parser.gbas";
				local8_Text_Str_2479 = ((((local8_Text_Str_2479) + (alias5_Param_ref_2482[0].attr8_datatype.attr8_Name_Str))) + (func20_BuildArrBrackets_Str(alias5_Param_ref_2482[0].attr8_datatype.attr7_IsArray)));
				__debugInfo = "2568:\src\CompilerPasses\Parser.gbas";
				local5_Found_2480 = 1;
				__debugInfo = "2565:\src\CompilerPasses\Parser.gbas";pool_TIdentifierVari.free(alias5_Param_ref_2482);
			}
			forEachSaver22605.values[forEachCounter22605] = local1_P_2481;
		
		};
		__debugInfo = "2571:\src\CompilerPasses\Parser.gbas";
		return tryClone(local8_Text_Str_2479);
		__debugInfo = "2572:\src\CompilerPasses\Parser.gbas";
		return "";
		__debugInfo = "2561:\src\CompilerPasses\Parser.gbas";pool_TIdentifierFunc.free(alias4_Func_ref_2478);
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func17_BuildPrototyp_Str = window['func17_BuildPrototyp_Str'];
window['func14_SearchPrototyp'] = function(param8_Name_Str) {
	stackPush("function: SearchPrototyp", __debugInfo);
	try {
		var local3_Ret_ref_2484 = [0];
		__debugInfo = "2589:\src\CompilerPasses\Parser.gbas";
		if ((global8_Compiler.attr11_GlobalFuncs).GetValue(param8_Name_Str, local3_Ret_ref_2484)) {
			__debugInfo = "2585:\src\CompilerPasses\Parser.gbas";
			if ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Ret_ref_2484[0]).values[tmpPositionCache][0].attr3_Typ) === (2)) ? 1 : 0)) {
				__debugInfo = "2582:\src\CompilerPasses\Parser.gbas";
				return tryClone(-(1));
				__debugInfo = "2582:\src\CompilerPasses\Parser.gbas";
			} else {
				__debugInfo = "2584:\src\CompilerPasses\Parser.gbas";
				return tryClone(unref(local3_Ret_ref_2484[0]));
				__debugInfo = "2584:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "2585:\src\CompilerPasses\Parser.gbas";
		} else {
			__debugInfo = "2588:\src\CompilerPasses\Parser.gbas";
			return tryClone(-(1));
			__debugInfo = "2588:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2590:\src\CompilerPasses\Parser.gbas";
		return 0;
		__debugInfo = "2589:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func14_SearchPrototyp = window['func14_SearchPrototyp'];
window['func14_SearchOperator'] = function(param8_Name_Str) {
	stackPush("function: SearchOperator", __debugInfo);
	try {
		__debugInfo = "2596:\src\CompilerPasses\Parser.gbas";
		var forEachSaver22671 = global9_Operators_ref[0];
		for(var forEachCounter22671 = 0 ; forEachCounter22671 < forEachSaver22671.values.length ; forEachCounter22671++) {
			var local2_Op_ref_2486 = forEachSaver22671.values[forEachCounter22671];
		{
				__debugInfo = "2595:\src\CompilerPasses\Parser.gbas";
				if (((((((local2_Op_ref_2486[0].attr7_Sym_Str) === (param8_Name_Str)) ? 1 : 0)) || ((((local2_Op_ref_2486[0].attr8_Name_Str) === (param8_Name_Str)) ? 1 : 0))) ? 1 : 0)) {
					__debugInfo = "2595:\src\CompilerPasses\Parser.gbas";
					return tryClone(local2_Op_ref_2486[0].attr2_ID);
					__debugInfo = "2595:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2595:\src\CompilerPasses\Parser.gbas";
			}
			forEachSaver22671.values[forEachCounter22671] = local2_Op_ref_2486;
		
		};
		__debugInfo = "2597:\src\CompilerPasses\Parser.gbas";
		return tryClone(-(1));
		__debugInfo = "2598:\src\CompilerPasses\Parser.gbas";
		return 0;
		__debugInfo = "2596:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func14_SearchOperator = window['func14_SearchOperator'];
window['func17_CleanVariable_Str'] = function(param7_Var_Str) {
	stackPush("function: CleanVariable_Str", __debugInfo);
	try {
		var local11_Postfix_Str_2488 = "";
		__debugInfo = "2602:\src\CompilerPasses\Parser.gbas";
		local11_Postfix_Str_2488 = RIGHT_Str(param7_Var_Str, 1);
		__debugInfo = "2607:\src\CompilerPasses\Parser.gbas";
		if (((((((local11_Postfix_Str_2488) === ("%")) ? 1 : 0)) || ((((local11_Postfix_Str_2488) === ("#")) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "2604:\src\CompilerPasses\Parser.gbas";
			return tryClone(LEFT_Str(param7_Var_Str, (((param7_Var_Str).length) - (1))));
			__debugInfo = "2604:\src\CompilerPasses\Parser.gbas";
		} else {
			__debugInfo = "2606:\src\CompilerPasses\Parser.gbas";
			return tryClone(param7_Var_Str);
			__debugInfo = "2606:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2608:\src\CompilerPasses\Parser.gbas";
		return "";
		__debugInfo = "2602:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func17_CleanVariable_Str = window['func17_CleanVariable_Str'];
window['func12_ScopeHasGoto'] = function(param3_scp) {
	stackPush("function: ScopeHasGoto", __debugInfo);
	try {
		__debugInfo = "2611:\src\CompilerPasses\Parser.gbas";
		if ((((param3_scp.attr3_Typ) !== (2)) ? 1 : 0)) {
			__debugInfo = "2611:\src\CompilerPasses\Parser.gbas";
			func5_Error("Internal error (Cant look for Scope)", 2610, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "2611:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2642:\src\CompilerPasses\Parser.gbas";
		var forEachSaver22876 = param3_scp.attr5_Exprs;
		for(var forEachCounter22876 = 0 ; forEachCounter22876 < forEachSaver22876.values.length ; forEachCounter22876++) {
			var local1_E_2490 = forEachSaver22876.values[forEachCounter22876];
		{
				var alias4_SubE_ref_2491 = [pool_TExpr.alloc()];
				__debugInfo = "2613:\src\CompilerPasses\Parser.gbas";
				alias4_SubE_ref_2491 = global5_Exprs_ref[0].arrAccess(local1_E_2490).values[tmpPositionCache] /* ALIAS */;
				__debugInfo = "2614:\src\CompilerPasses\Parser.gbas";
				{
					var local17___SelectHelper34__2492 = 0;
					__debugInfo = "2614:\src\CompilerPasses\Parser.gbas";
					local17___SelectHelper34__2492 = alias4_SubE_ref_2491[0].attr3_Typ;
					__debugInfo = "2641:\src\CompilerPasses\Parser.gbas";
					if ((((local17___SelectHelper34__2492) === (~~(24))) ? 1 : 0)) {
						__debugInfo = "2618:\src\CompilerPasses\Parser.gbas";
						var forEachSaver22756 = alias4_SubE_ref_2491[0].attr6_Scopes;
						for(var forEachCounter22756 = 0 ; forEachCounter22756 < forEachSaver22756.values.length ; forEachCounter22756++) {
							var local1_E_2493 = forEachSaver22756.values[forEachCounter22756];
						{
								__debugInfo = "2617:\src\CompilerPasses\Parser.gbas";
								if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(local1_E_2493).values[tmpPositionCache][0]))) {
									__debugInfo = "2617:\src\CompilerPasses\Parser.gbas";
									return 1;
									__debugInfo = "2617:\src\CompilerPasses\Parser.gbas";
								};
								__debugInfo = "2617:\src\CompilerPasses\Parser.gbas";
							}
							forEachSaver22756.values[forEachCounter22756] = local1_E_2493;
						
						};
						__debugInfo = "2621:\src\CompilerPasses\Parser.gbas";
						if ((((alias4_SubE_ref_2491[0].attr9_elseScope) !== (-(1))) ? 1 : 0)) {
							__debugInfo = "2620:\src\CompilerPasses\Parser.gbas";
							if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(alias4_SubE_ref_2491[0].attr9_elseScope).values[tmpPositionCache][0]))) {
								__debugInfo = "2620:\src\CompilerPasses\Parser.gbas";
								return 1;
								__debugInfo = "2620:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "2620:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "2618:\src\CompilerPasses\Parser.gbas";
					} else if ((((local17___SelectHelper34__2492) === (~~(25))) ? 1 : 0)) {
						__debugInfo = "2623:\src\CompilerPasses\Parser.gbas";
						if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(alias4_SubE_ref_2491[0].attr3_Scp).values[tmpPositionCache][0]))) {
							__debugInfo = "2623:\src\CompilerPasses\Parser.gbas";
							return 1;
							__debugInfo = "2623:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "2623:\src\CompilerPasses\Parser.gbas";
					} else if ((((local17___SelectHelper34__2492) === (~~(26))) ? 1 : 0)) {
						__debugInfo = "2625:\src\CompilerPasses\Parser.gbas";
						if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(alias4_SubE_ref_2491[0].attr3_Scp).values[tmpPositionCache][0]))) {
							__debugInfo = "2625:\src\CompilerPasses\Parser.gbas";
							return 1;
							__debugInfo = "2625:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "2625:\src\CompilerPasses\Parser.gbas";
					} else if ((((local17___SelectHelper34__2492) === (~~(27))) ? 1 : 0)) {
						__debugInfo = "2627:\src\CompilerPasses\Parser.gbas";
						if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(alias4_SubE_ref_2491[0].attr3_Scp).values[tmpPositionCache][0]))) {
							__debugInfo = "2627:\src\CompilerPasses\Parser.gbas";
							return 1;
							__debugInfo = "2627:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "2627:\src\CompilerPasses\Parser.gbas";
					} else if ((((local17___SelectHelper34__2492) === (~~(38))) ? 1 : 0)) {
						__debugInfo = "2629:\src\CompilerPasses\Parser.gbas";
						if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(alias4_SubE_ref_2491[0].attr3_Scp).values[tmpPositionCache][0]))) {
							__debugInfo = "2629:\src\CompilerPasses\Parser.gbas";
							return 1;
							__debugInfo = "2629:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "2629:\src\CompilerPasses\Parser.gbas";
					} else if ((((local17___SelectHelper34__2492) === (~~(31))) ? 1 : 0)) {
						__debugInfo = "2631:\src\CompilerPasses\Parser.gbas";
						if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(alias4_SubE_ref_2491[0].attr3_Scp).values[tmpPositionCache][0]))) {
							__debugInfo = "2631:\src\CompilerPasses\Parser.gbas";
							return 1;
							__debugInfo = "2631:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "2632:\src\CompilerPasses\Parser.gbas";
						if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(alias4_SubE_ref_2491[0].attr8_catchScp).values[tmpPositionCache][0]))) {
							__debugInfo = "2632:\src\CompilerPasses\Parser.gbas";
							return 1;
							__debugInfo = "2632:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "2631:\src\CompilerPasses\Parser.gbas";
					} else if ((((local17___SelectHelper34__2492) === (~~(20))) ? 1 : 0)) {
						__debugInfo = "2634:\src\CompilerPasses\Parser.gbas";
						return 1;
						__debugInfo = "2634:\src\CompilerPasses\Parser.gbas";
					} else if ((((local17___SelectHelper34__2492) === (~~(2))) ? 1 : 0)) {
						__debugInfo = "2636:\src\CompilerPasses\Parser.gbas";
						if (func12_ScopeHasGoto(unref(alias4_SubE_ref_2491[0]))) {
							__debugInfo = "2636:\src\CompilerPasses\Parser.gbas";
							return 1;
							__debugInfo = "2636:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "2636:\src\CompilerPasses\Parser.gbas";
					} else {
						
					};
					__debugInfo = "2614:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2613:\src\CompilerPasses\Parser.gbas";pool_TExpr.free(alias4_SubE_ref_2491);
			}
			forEachSaver22876.values[forEachCounter22876] = local1_E_2490;
		
		};
		__debugInfo = "2643:\src\CompilerPasses\Parser.gbas";
		return tryClone(0);
		__debugInfo = "2644:\src\CompilerPasses\Parser.gbas";
		return 0;
		__debugInfo = "2611:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func12_ScopeHasGoto = window['func12_ScopeHasGoto'];
window['func13_ScopeName_Str'] = function(param4_expr) {
	stackPush("function: ScopeName_Str", __debugInfo);
	try {
		__debugInfo = "2648:\src\CompilerPasses\Parser.gbas";
		{
			var local17___SelectHelper35__2495 = 0;
			__debugInfo = "2648:\src\CompilerPasses\Parser.gbas";
			local17___SelectHelper35__2495 = param4_expr.attr6_ScpTyp;
			__debugInfo = "2672:\src\CompilerPasses\Parser.gbas";
			if ((((local17___SelectHelper35__2495) === (~~(1))) ? 1 : 0)) {
				__debugInfo = "2650:\src\CompilerPasses\Parser.gbas";
				return "if";
				__debugInfo = "2650:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper35__2495) === (~~(3))) ? 1 : 0)) {
				__debugInfo = "2652:\src\CompilerPasses\Parser.gbas";
				return "loop";
				__debugInfo = "2652:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper35__2495) === (~~(5))) ? 1 : 0)) {
				__debugInfo = "2654:\src\CompilerPasses\Parser.gbas";
				return "try";
				__debugInfo = "2654:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper35__2495) === (~~(4))) ? 1 : 0)) {
				__debugInfo = "2656:\src\CompilerPasses\Parser.gbas";
				return "main";
				__debugInfo = "2656:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper35__2495) === (~~(2))) ? 1 : 0)) {
				__debugInfo = "2658:\src\CompilerPasses\Parser.gbas";
				{
					var local17___SelectHelper36__2496 = 0;
					__debugInfo = "2658:\src\CompilerPasses\Parser.gbas";
					local17___SelectHelper36__2496 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr3_Typ;
					__debugInfo = "2667:\src\CompilerPasses\Parser.gbas";
					if ((((local17___SelectHelper36__2496) === (~~(2))) ? 1 : 0)) {
						__debugInfo = "2660:\src\CompilerPasses\Parser.gbas";
						return tryClone((("sub: ") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr9_OName_Str)));
						__debugInfo = "2660:\src\CompilerPasses\Parser.gbas";
					} else if ((((local17___SelectHelper36__2496) === (~~(3))) ? 1 : 0)) {
						__debugInfo = "2662:\src\CompilerPasses\Parser.gbas";
						return tryClone((("method: ") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr9_OName_Str)));
						__debugInfo = "2662:\src\CompilerPasses\Parser.gbas";
					} else if ((((local17___SelectHelper36__2496) === (~~(1))) ? 1 : 0)) {
						__debugInfo = "2664:\src\CompilerPasses\Parser.gbas";
						return tryClone((("function: ") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr9_OName_Str)));
						__debugInfo = "2664:\src\CompilerPasses\Parser.gbas";
					} else if ((((local17___SelectHelper36__2496) === (~~(4))) ? 1 : 0)) {
						__debugInfo = "2666:\src\CompilerPasses\Parser.gbas";
						return tryClone((("prototype: ") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr9_OName_Str)));
						__debugInfo = "2666:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "2658:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2658:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper35__2495) === (~~(6))) ? 1 : 0)) {
				__debugInfo = "2669:\src\CompilerPasses\Parser.gbas";
				return "select";
				__debugInfo = "2669:\src\CompilerPasses\Parser.gbas";
			} else {
				__debugInfo = "2671:\src\CompilerPasses\Parser.gbas";
				func5_Error("Internal error (unknown scope type)", 2670, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "2671:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "2648:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2673:\src\CompilerPasses\Parser.gbas";
		return "";
		__debugInfo = "2648:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func13_ScopeName_Str = window['func13_ScopeName_Str'];
window['func13_ChangeVarName'] = function(param4_Vari) {
	stackPush("function: ChangeVarName", __debugInfo);
	try {
		__debugInfo = "2678:\src\CompilerPasses\Parser.gbas";
		param4_Vari.attr8_Name_Str = TRIM_Str(REPLACE_Str(param4_Vari.attr8_Name_Str, "$", "_Str"), " \t\r\n\v\f");
		__debugInfo = "2680:\src\CompilerPasses\Parser.gbas";
		{
			var local17___SelectHelper37__2498 = 0;
			__debugInfo = "2680:\src\CompilerPasses\Parser.gbas";
			local17___SelectHelper37__2498 = param4_Vari.attr3_Typ;
			__debugInfo = "2708:\src\CompilerPasses\Parser.gbas";
			if ((((local17___SelectHelper37__2498) === (~~(1))) ? 1 : 0)) {
				__debugInfo = "2682:\src\CompilerPasses\Parser.gbas";
				param4_Vari.attr8_Name_Str = (((((("local") + (CAST2STRING((param4_Vari.attr8_Name_Str).length)))) + ("_"))) + (param4_Vari.attr8_Name_Str));
				__debugInfo = "2682:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper37__2498) === (~~(2))) ? 1 : 0)) {
				var local5_Found_2499 = 0;
				__debugInfo = "2684:\src\CompilerPasses\Parser.gbas";
				local5_Found_2499 = 0;
				__debugInfo = "2696:\src\CompilerPasses\Parser.gbas";
				var forEachSaver23087 = global8_Compiler.attr7_Exports;
				for(var forEachCounter23087 = 0 ; forEachCounter23087 < forEachSaver23087.values.length ; forEachCounter23087++) {
					var local3_Exp_2500 = forEachSaver23087.values[forEachCounter23087];
				{
						__debugInfo = "2695:\src\CompilerPasses\Parser.gbas";
						if ((((local3_Exp_2500.attr8_Name_Str) === (param4_Vari.attr8_Name_Str)) ? 1 : 0)) {
							__debugInfo = "2687:\src\CompilerPasses\Parser.gbas";
							local5_Found_2499 = 1;
							__debugInfo = "2690:\src\CompilerPasses\Parser.gbas";
							if (param4_Vari.attr3_ref) {
								__debugInfo = "2689:\src\CompilerPasses\Parser.gbas";
								func5_Error((((("Cannot export '") + (param4_Vari.attr8_Name_Str))) + ("' because it is a reference (dont use in connection with BYREF and ALIAS!)")), 2688, "src\CompilerPasses\Parser.gbas");
								__debugInfo = "2689:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "2693:\src\CompilerPasses\Parser.gbas";
							if ((((local3_Exp_2500.attr12_RealName_Str) !== ("")) ? 1 : 0)) {
								__debugInfo = "2692:\src\CompilerPasses\Parser.gbas";
								param4_Vari.attr8_Name_Str = local3_Exp_2500.attr12_RealName_Str;
								__debugInfo = "2692:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "2694:\src\CompilerPasses\Parser.gbas";
							return 0;
							__debugInfo = "2687:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "2695:\src\CompilerPasses\Parser.gbas";
					}
					forEachSaver23087.values[forEachCounter23087] = local3_Exp_2500;
				
				};
				__debugInfo = "2697:\src\CompilerPasses\Parser.gbas";
				param4_Vari.attr8_Name_Str = (((((("global") + (CAST2STRING((param4_Vari.attr8_Name_Str).length)))) + ("_"))) + (param4_Vari.attr8_Name_Str));
				__debugInfo = "2684:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper37__2498) === (~~(3))) ? 1 : 0)) {
				__debugInfo = "2699:\src\CompilerPasses\Parser.gbas";
				param4_Vari.attr8_Name_Str = (((((("attr") + (CAST2STRING((param4_Vari.attr8_Name_Str).length)))) + ("_"))) + (param4_Vari.attr8_Name_Str));
				__debugInfo = "2699:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper37__2498) === (~~(4))) ? 1 : 0)) {
				__debugInfo = "2701:\src\CompilerPasses\Parser.gbas";
				param4_Vari.attr8_Name_Str = (((((((((("static") + (CAST2STRING((param4_Vari.attr8_Name_Str).length)))) + ("_"))) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_Vari.attr4_func).values[tmpPositionCache][0].attr9_OName_Str))) + ("_"))) + (param4_Vari.attr8_Name_Str));
				__debugInfo = "2701:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper37__2498) === (~~(5))) ? 1 : 0)) {
				__debugInfo = "2703:\src\CompilerPasses\Parser.gbas";
				param4_Vari.attr8_Name_Str = (((((("param") + (CAST2STRING((param4_Vari.attr8_Name_Str).length)))) + ("_"))) + (param4_Vari.attr8_Name_Str));
				__debugInfo = "2703:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper37__2498) === (~~(6))) ? 1 : 0)) {
				__debugInfo = "2705:\src\CompilerPasses\Parser.gbas";
				param4_Vari.attr8_Name_Str = (((((("const") + (CAST2STRING((param4_Vari.attr8_Name_Str).length)))) + ("_"))) + (param4_Vari.attr8_Name_Str));
				__debugInfo = "2705:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper37__2498) === (~~(7))) ? 1 : 0)) {
				__debugInfo = "2707:\src\CompilerPasses\Parser.gbas";
				param4_Vari.attr8_Name_Str = (((((("alias") + (CAST2STRING((param4_Vari.attr8_Name_Str).length)))) + ("_"))) + (param4_Vari.attr8_Name_Str));
				__debugInfo = "2707:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "2680:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2709:\src\CompilerPasses\Parser.gbas";
		if (param4_Vari.attr3_ref) {
			__debugInfo = "2709:\src\CompilerPasses\Parser.gbas";
			param4_Vari.attr8_Name_Str = ((param4_Vari.attr8_Name_Str) + ("_ref"));
			__debugInfo = "2709:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2716:\src\CompilerPasses\Parser.gbas";
		if ((((param4_Vari.attr6_PreDef) !== (-(1))) ? 1 : 0)) {
			__debugInfo = "2715:\src\CompilerPasses\Parser.gbas";
			if ((((global5_Exprs_ref[0].arrAccess(param4_Vari.attr6_PreDef).values[tmpPositionCache][0].attr3_Typ) === (36)) ? 1 : 0)) {
				__debugInfo = "2714:\src\CompilerPasses\Parser.gbas";
				global5_Exprs_ref[0].arrAccess(param4_Vari.attr6_PreDef).values[tmpPositionCache][0].attr4_vari = param4_Vari.attr2_ID;
				__debugInfo = "2714:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "2715:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2717:\src\CompilerPasses\Parser.gbas";
		return 0;
		__debugInfo = "2678:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func13_ChangeVarName = window['func13_ChangeVarName'];
window['func14_ChangeFuncName'] = function(param4_Func) {
	stackPush("function: ChangeFuncName", __debugInfo);
	try {
		__debugInfo = "2720:\src\CompilerPasses\Parser.gbas";
		param4_Func.attr8_Name_Str = TRIM_Str(REPLACE_Str(param4_Func.attr8_Name_Str, "$", "_Str"), " \t\r\n\v\f");
		__debugInfo = "2722:\src\CompilerPasses\Parser.gbas";
		param4_Func.attr9_OName_Str = param4_Func.attr8_Name_Str;
		__debugInfo = "2723:\src\CompilerPasses\Parser.gbas";
		{
			var local17___SelectHelper38__2502 = 0;
			__debugInfo = "2723:\src\CompilerPasses\Parser.gbas";
			local17___SelectHelper38__2502 = param4_Func.attr3_Typ;
			__debugInfo = "2742:\src\CompilerPasses\Parser.gbas";
			if ((((local17___SelectHelper38__2502) === (~~(3))) ? 1 : 0)) {
				__debugInfo = "2725:\src\CompilerPasses\Parser.gbas";
				param4_Func.attr8_Name_Str = (((((((((((((("method") + (CAST2STRING((global8_Compiler.attr5_Types_ref[0].arrAccess(param4_Func.attr6_MyType).values[tmpPositionCache][0].attr8_Name_Str).length)))) + ("_"))) + (global8_Compiler.attr5_Types_ref[0].arrAccess(param4_Func.attr6_MyType).values[tmpPositionCache][0].attr8_Name_Str))) + ("_"))) + (CAST2STRING((param4_Func.attr8_Name_Str).length)))) + ("_"))) + (param4_Func.attr8_Name_Str));
				__debugInfo = "2725:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper38__2502) === (~~(1))) ? 1 : 0)) {
				__debugInfo = "2739:\src\CompilerPasses\Parser.gbas";
				if ((((param4_Func.attr6_Native) === (0)) ? 1 : 0)) {
					var local5_Found_2503 = 0;
					__debugInfo = "2728:\src\CompilerPasses\Parser.gbas";
					local5_Found_2503 = 0;
					__debugInfo = "2737:\src\CompilerPasses\Parser.gbas";
					var forEachSaver23391 = global8_Compiler.attr7_Exports;
					for(var forEachCounter23391 = 0 ; forEachCounter23391 < forEachSaver23391.values.length ; forEachCounter23391++) {
						var local3_Exp_2504 = forEachSaver23391.values[forEachCounter23391];
					{
							__debugInfo = "2736:\src\CompilerPasses\Parser.gbas";
							if ((((local3_Exp_2504.attr8_Name_Str) === (param4_Func.attr8_Name_Str)) ? 1 : 0)) {
								__debugInfo = "2731:\src\CompilerPasses\Parser.gbas";
								local5_Found_2503 = 1;
								__debugInfo = "2734:\src\CompilerPasses\Parser.gbas";
								if ((((local3_Exp_2504.attr12_RealName_Str) !== ("")) ? 1 : 0)) {
									__debugInfo = "2733:\src\CompilerPasses\Parser.gbas";
									param4_Func.attr8_Name_Str = local3_Exp_2504.attr12_RealName_Str;
									__debugInfo = "2733:\src\CompilerPasses\Parser.gbas";
								};
								__debugInfo = "2735:\src\CompilerPasses\Parser.gbas";
								break;
								__debugInfo = "2731:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "2736:\src\CompilerPasses\Parser.gbas";
						}
						forEachSaver23391.values[forEachCounter23391] = local3_Exp_2504;
					
					};
					__debugInfo = "2738:\src\CompilerPasses\Parser.gbas";
					if (((local5_Found_2503) ? 0 : 1)) {
						__debugInfo = "2738:\src\CompilerPasses\Parser.gbas";
						param4_Func.attr8_Name_Str = (((((("func") + (CAST2STRING((param4_Func.attr8_Name_Str).length)))) + ("_"))) + (param4_Func.attr8_Name_Str));
						__debugInfo = "2738:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "2728:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2739:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper38__2502) === (~~(2))) ? 1 : 0)) {
				
			};
			__debugInfo = "2723:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2743:\src\CompilerPasses\Parser.gbas";
		return 0;
		__debugInfo = "2720:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func14_ChangeFuncName = window['func14_ChangeFuncName'];
window['func18_ChangeTypeName_Str'] = function(param8_Name_Str) {
	stackPush("function: ChangeTypeName_Str", __debugInfo);
	try {
		__debugInfo = "2750:\src\CompilerPasses\Parser.gbas";
		if ((((((((((((((((((((((((((((((((((param8_Name_Str) === ("string")) ? 1 : 0)) || ((((param8_Name_Str) === ("void")) ? 1 : 0))) ? 1 : 0)) || ((((param8_Name_Str) === ("float")) ? 1 : 0))) ? 1 : 0)) || ((((param8_Name_Str) === ("double")) ? 1 : 0))) ? 1 : 0)) || ((((param8_Name_Str) === ("int")) ? 1 : 0))) ? 1 : 0)) || ((((param8_Name_Str) === ("short")) ? 1 : 0))) ? 1 : 0)) || ((((param8_Name_Str) === ("byte")) ? 1 : 0))) ? 1 : 0)) || ((((param8_Name_Str) === ("bool")) ? 1 : 0))) ? 1 : 0)) || ((((param8_Name_Str) === ("boolean")) ? 1 : 0))) ? 1 : 0)) || ((((param8_Name_Str) === ("long")) ? 1 : 0))) ? 1 : 0)) || ((((param8_Name_Str) === ("single")) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "2747:\src\CompilerPasses\Parser.gbas";
			return tryClone(param8_Name_Str);
			__debugInfo = "2747:\src\CompilerPasses\Parser.gbas";
		} else {
			__debugInfo = "2749:\src\CompilerPasses\Parser.gbas";
			return tryClone((((((("type") + (CAST2STRING((param8_Name_Str).length)))) + ("_"))) + (param8_Name_Str)));
			__debugInfo = "2749:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2751:\src\CompilerPasses\Parser.gbas";
		return "";
		__debugInfo = "2750:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func18_ChangeTypeName_Str = window['func18_ChangeTypeName_Str'];
window['func11_NewLine_Str'] = function() {
	stackPush("function: NewLine_Str", __debugInfo);
	try {
		var local8_Text_Str_2506 = "";
		__debugInfo = "2756:\src\CompilerPasses\Parser.gbas";
		local8_Text_Str_2506 = "\n";
		__debugInfo = "2756:\src\CompilerPasses\Parser.gbas";
		{
			var local1_i_2507 = 0.0;
			__debugInfo = "2759:\src\CompilerPasses\Parser.gbas";
			for (local1_i_2507 = 1;toCheck(local1_i_2507, global6_Indent, 1);local1_i_2507 += 1) {
				__debugInfo = "2758:\src\CompilerPasses\Parser.gbas";
				local8_Text_Str_2506 = ((local8_Text_Str_2506) + ("\t"));
				__debugInfo = "2758:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "2759:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2760:\src\CompilerPasses\Parser.gbas";
		return tryClone(local8_Text_Str_2506);
		__debugInfo = "2761:\src\CompilerPasses\Parser.gbas";
		return "";
		__debugInfo = "2756:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func11_NewLine_Str = window['func11_NewLine_Str'];
window['func8_IndentUp'] = function() {
	stackPush("function: IndentUp", __debugInfo);
	try {
		__debugInfo = "2763:\src\CompilerPasses\Parser.gbas";
		global6_Indent+=1;
		__debugInfo = "2764:\src\CompilerPasses\Parser.gbas";
		return 0;
		__debugInfo = "2763:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func8_IndentUp = window['func8_IndentUp'];
window['func10_IndentDown'] = function() {
	stackPush("function: IndentDown", __debugInfo);
	try {
		__debugInfo = "2766:\src\CompilerPasses\Parser.gbas";
		global6_Indent+=-1;
		__debugInfo = "2767:\src\CompilerPasses\Parser.gbas";
		return 0;
		__debugInfo = "2766:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func10_IndentDown = window['func10_IndentDown'];
window['func23_ManageFuncParamOverlaps'] = function() {
	stackPush("function: ManageFuncParamOverlaps", __debugInfo);
	try {
		__debugInfo = "2798:\src\CompilerPasses\Parser.gbas";
		var forEachSaver23622 = global8_Compiler.attr5_Funcs_ref[0];
		for(var forEachCounter23622 = 0 ; forEachCounter23622 < forEachSaver23622.values.length ; forEachCounter23622++) {
			var local4_Func_ref_2508 = forEachSaver23622.values[forEachCounter23622];
		{
				__debugInfo = "2797:\src\CompilerPasses\Parser.gbas";
				if ((((((((((local4_Func_ref_2508[0].attr6_Native) === (0)) ? 1 : 0)) && ((((local4_Func_ref_2508[0].attr3_Scp) !== (-(1))) ? 1 : 0))) ? 1 : 0)) && ((((local4_Func_ref_2508[0].attr10_IsAbstract) === (0)) ? 1 : 0))) ? 1 : 0)) {
					var local1_i_2509 = 0;
					__debugInfo = "2775:\src\CompilerPasses\Parser.gbas";
					local1_i_2509 = 0;
					__debugInfo = "2796:\src\CompilerPasses\Parser.gbas";
					var forEachSaver23620 = local4_Func_ref_2508[0].attr6_Params;
					for(var forEachCounter23620 = 0 ; forEachCounter23620 < forEachSaver23620.values.length ; forEachCounter23620++) {
						var local1_P_2510 = forEachSaver23620.values[forEachCounter23620];
					{
							__debugInfo = "2793:\src\CompilerPasses\Parser.gbas";
							if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_2510).values[tmpPositionCache][0].attr3_ref) !== (global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Func_ref_2508[0].attr10_CopyParams.arrAccess(local1_i_2509).values[tmpPositionCache]).values[tmpPositionCache][0].attr3_ref)) ? 1 : 0)) {
								__debugInfo = "2786:\src\CompilerPasses\Parser.gbas";
								global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_2510).values[tmpPositionCache][0].attr9_OwnerVari = local4_Func_ref_2508[0].attr10_CopyParams.arrAccess(local1_i_2509).values[tmpPositionCache];
								__debugInfo = "2786:\src\CompilerPasses\Parser.gbas";
							} else {
								__debugInfo = "2792:\src\CompilerPasses\Parser.gbas";
								global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Func_ref_2508[0].attr10_CopyParams.arrAccess(local1_i_2509).values[tmpPositionCache]).values[tmpPositionCache][0].attr8_Name_Str = global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_2510).values[tmpPositionCache][0].attr8_Name_Str;
								__debugInfo = "2792:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "2795:\src\CompilerPasses\Parser.gbas";
							local1_i_2509+=1;
							__debugInfo = "2793:\src\CompilerPasses\Parser.gbas";
						}
						forEachSaver23620.values[forEachCounter23620] = local1_P_2510;
					
					};
					__debugInfo = "2775:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2797:\src\CompilerPasses\Parser.gbas";
			}
			forEachSaver23622.values[forEachCounter23622] = local4_Func_ref_2508;
		
		};
		__debugInfo = "2799:\src\CompilerPasses\Parser.gbas";
		return 0;
		__debugInfo = "2798:\src\CompilerPasses\Parser.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func23_ManageFuncParamOverlaps = window['func23_ManageFuncParamOverlaps'];
window['func11_Precompiler'] = function() {
	stackPush("function: Precompiler", __debugInfo);
	try {
		__debugInfo = "8:\src\CompilerPasses\Preprocessor.gbas";
		func5_Start();
		__debugInfo = "13:\src\CompilerPasses\Preprocessor.gbas";
		{
			var Err_Str = "";
			__debugInfo = "14:\src\CompilerPasses\Preprocessor.gbas";
			try {
				__debugInfo = "12:\src\CompilerPasses\Preprocessor.gbas";
				while (func8_EOFParse()) {
					__debugInfo = "11:\src\CompilerPasses\Preprocessor.gbas";
					func10_PreCommand(0);
					__debugInfo = "11:\src\CompilerPasses\Preprocessor.gbas";
				};
				__debugInfo = "12:\src\CompilerPasses\Preprocessor.gbas";
			} catch (Err_Str) {
				if (Err_Str instanceof OTTException) Err_Str = Err_Str.getText(); else throwError(Err_Str);{
					
				}
			};
			__debugInfo = "14:\src\CompilerPasses\Preprocessor.gbas";
		};
		__debugInfo = "15:\src\CompilerPasses\Preprocessor.gbas";
		return 0;
		__debugInfo = "8:\src\CompilerPasses\Preprocessor.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func11_Precompiler = window['func11_Precompiler'];
window['func10_PreCommand'] = function(param9_IgnoreAll) {
	stackPush("function: PreCommand", __debugInfo);
	try {
		__debugInfo = "165:\src\CompilerPasses\Preprocessor.gbas";
		if (func7_IsToken("?")) {
			var local7_Cur_Str_2513 = "";
			__debugInfo = "18:\src\CompilerPasses\Preprocessor.gbas";
			func14_MatchAndRemove("?", 17, "src\CompilerPasses\Preprocessor.gbas");
			__debugInfo = "19:\src\CompilerPasses\Preprocessor.gbas";
			local7_Cur_Str_2513 = func14_GetCurrent_Str();
			__debugInfo = "20:\src\CompilerPasses\Preprocessor.gbas";
			func13_RemoveCurrent();
			__debugInfo = "21:\src\CompilerPasses\Preprocessor.gbas";
			{
				var local17___SelectHelper39__2514 = "";
				__debugInfo = "21:\src\CompilerPasses\Preprocessor.gbas";
				local17___SelectHelper39__2514 = local7_Cur_Str_2513;
				__debugInfo = "150:\src\CompilerPasses\Preprocessor.gbas";
				if ((((local17___SelectHelper39__2514) === ("DEFINE")) ? 1 : 0)) {
					var local3_Def_2515 = pool_TDefine.alloc();
					__debugInfo = "24:\src\CompilerPasses\Preprocessor.gbas";
					local3_Def_2515.attr7_Key_Str = func14_GetCurrent_Str();
					__debugInfo = "25:\src\CompilerPasses\Preprocessor.gbas";
					func13_RemoveCurrent();
					__debugInfo = "31:\src\CompilerPasses\Preprocessor.gbas";
					if ((((func7_IsToken("\n")) === (0)) ? 1 : 0)) {
						__debugInfo = "27:\src\CompilerPasses\Preprocessor.gbas";
						local3_Def_2515.attr9_Value_Str = func14_GetCurrent_Str();
						__debugInfo = "28:\src\CompilerPasses\Preprocessor.gbas";
						func13_RemoveCurrent();
						__debugInfo = "27:\src\CompilerPasses\Preprocessor.gbas";
					} else {
						__debugInfo = "30:\src\CompilerPasses\Preprocessor.gbas";
						local3_Def_2515.attr9_Value_Str = CAST2STRING(1);
						__debugInfo = "30:\src\CompilerPasses\Preprocessor.gbas";
					};
					__debugInfo = "32:\src\CompilerPasses\Preprocessor.gbas";
					if (((param9_IgnoreAll) ? 0 : 1)) {
						__debugInfo = "32:\src\CompilerPasses\Preprocessor.gbas";
						DIMPUSH(global7_Defines, local3_Def_2515);
						__debugInfo = "32:\src\CompilerPasses\Preprocessor.gbas";
					};
					__debugInfo = "24:\src\CompilerPasses\Preprocessor.gbas";pool_TDefine.free(local3_Def_2515);
				} else if ((((local17___SelectHelper39__2514) === ("UNDEF")) ? 1 : 0)) {
					__debugInfo = "38:\src\CompilerPasses\Preprocessor.gbas";
					if (((param9_IgnoreAll) ? 0 : 1)) {
						__debugInfo = "37:\src\CompilerPasses\Preprocessor.gbas";
						var forEachSaver23717 = global7_Defines;
						for(var forEachCounter23717 = 0 ; forEachCounter23717 < forEachSaver23717.values.length ; forEachCounter23717++) {
							var local3_Def_2516 = forEachSaver23717.values[forEachCounter23717];
						{
								__debugInfo = "36:\src\CompilerPasses\Preprocessor.gbas";
								if (func7_IsToken(local3_Def_2516.attr7_Key_Str)) {
									__debugInfo = "36:\src\CompilerPasses\Preprocessor.gbas";
									forEachSaver23717.values[forEachCounter23717] = local3_Def_2516;
									DIMDEL(forEachSaver23717, forEachCounter23717);
									forEachCounter23717--;
									continue;
									__debugInfo = "36:\src\CompilerPasses\Preprocessor.gbas";
								};
								__debugInfo = "36:\src\CompilerPasses\Preprocessor.gbas";
							}
							forEachSaver23717.values[forEachCounter23717] = local3_Def_2516;
						
						};
						__debugInfo = "37:\src\CompilerPasses\Preprocessor.gbas";
					};
					__debugInfo = "39:\src\CompilerPasses\Preprocessor.gbas";
					func13_RemoveCurrent();
					__debugInfo = "38:\src\CompilerPasses\Preprocessor.gbas";
				} else if ((((local17___SelectHelper39__2514) === ("IFDEF")) ? 1 : 0)) {
					__debugInfo = "56:\src\CompilerPasses\Preprocessor.gbas";
					if (((param9_IgnoreAll) ? 0 : 1)) {
						var local4_doIt_2517 = 0;
						__debugInfo = "42:\src\CompilerPasses\Preprocessor.gbas";
						local4_doIt_2517 = 0;
						__debugInfo = "48:\src\CompilerPasses\Preprocessor.gbas";
						var forEachSaver23748 = global7_Defines;
						for(var forEachCounter23748 = 0 ; forEachCounter23748 < forEachSaver23748.values.length ; forEachCounter23748++) {
							var local3_Def_2518 = forEachSaver23748.values[forEachCounter23748];
						{
								__debugInfo = "47:\src\CompilerPasses\Preprocessor.gbas";
								if (func7_IsToken(local3_Def_2518.attr7_Key_Str)) {
									__debugInfo = "45:\src\CompilerPasses\Preprocessor.gbas";
									local4_doIt_2517 = 1;
									__debugInfo = "46:\src\CompilerPasses\Preprocessor.gbas";
									break;
									__debugInfo = "45:\src\CompilerPasses\Preprocessor.gbas";
								};
								__debugInfo = "47:\src\CompilerPasses\Preprocessor.gbas";
							}
							forEachSaver23748.values[forEachCounter23748] = local3_Def_2518;
						
						};
						__debugInfo = "49:\src\CompilerPasses\Preprocessor.gbas";
						func13_RemoveCurrent();
						__debugInfo = "50:\src\CompilerPasses\Preprocessor.gbas";
						func14_MatchAndRemove("\n", 49, "src\CompilerPasses\Preprocessor.gbas");
						__debugInfo = "51:\src\CompilerPasses\Preprocessor.gbas";
						func5_PreIf(local4_doIt_2517);
						__debugInfo = "42:\src\CompilerPasses\Preprocessor.gbas";
					} else {
						__debugInfo = "53:\src\CompilerPasses\Preprocessor.gbas";
						func13_RemoveCurrent();
						__debugInfo = "54:\src\CompilerPasses\Preprocessor.gbas";
						func14_MatchAndRemove("\n", 53, "src\CompilerPasses\Preprocessor.gbas");
						__debugInfo = "55:\src\CompilerPasses\Preprocessor.gbas";
						func5_PreIf(2);
						__debugInfo = "53:\src\CompilerPasses\Preprocessor.gbas";
					};
					__debugInfo = "56:\src\CompilerPasses\Preprocessor.gbas";
				} else if ((((local17___SelectHelper39__2514) === ("IFNDEF")) ? 1 : 0)) {
					__debugInfo = "74:\src\CompilerPasses\Preprocessor.gbas";
					if (((param9_IgnoreAll) ? 0 : 1)) {
						var local4_doIt_2519 = 0;
						__debugInfo = "59:\src\CompilerPasses\Preprocessor.gbas";
						local4_doIt_2519 = 1;
						__debugInfo = "65:\src\CompilerPasses\Preprocessor.gbas";
						var forEachSaver23793 = global7_Defines;
						for(var forEachCounter23793 = 0 ; forEachCounter23793 < forEachSaver23793.values.length ; forEachCounter23793++) {
							var local3_Def_2520 = forEachSaver23793.values[forEachCounter23793];
						{
								__debugInfo = "64:\src\CompilerPasses\Preprocessor.gbas";
								if (func7_IsToken(local3_Def_2520.attr7_Key_Str)) {
									__debugInfo = "62:\src\CompilerPasses\Preprocessor.gbas";
									local4_doIt_2519 = 0;
									__debugInfo = "63:\src\CompilerPasses\Preprocessor.gbas";
									break;
									__debugInfo = "62:\src\CompilerPasses\Preprocessor.gbas";
								};
								__debugInfo = "64:\src\CompilerPasses\Preprocessor.gbas";
							}
							forEachSaver23793.values[forEachCounter23793] = local3_Def_2520;
						
						};
						__debugInfo = "66:\src\CompilerPasses\Preprocessor.gbas";
						func13_RemoveCurrent();
						__debugInfo = "67:\src\CompilerPasses\Preprocessor.gbas";
						func14_MatchAndRemove("\n", 66, "src\CompilerPasses\Preprocessor.gbas");
						__debugInfo = "69:\src\CompilerPasses\Preprocessor.gbas";
						func5_PreIf(local4_doIt_2519);
						__debugInfo = "59:\src\CompilerPasses\Preprocessor.gbas";
					} else {
						__debugInfo = "71:\src\CompilerPasses\Preprocessor.gbas";
						func13_RemoveCurrent();
						__debugInfo = "72:\src\CompilerPasses\Preprocessor.gbas";
						func14_MatchAndRemove("\n", 71, "src\CompilerPasses\Preprocessor.gbas");
						__debugInfo = "73:\src\CompilerPasses\Preprocessor.gbas";
						func5_PreIf(2);
						__debugInfo = "71:\src\CompilerPasses\Preprocessor.gbas";
					};
					__debugInfo = "74:\src\CompilerPasses\Preprocessor.gbas";
				} else if ((((local17___SelectHelper39__2514) === ("IF")) ? 1 : 0)) {
					__debugInfo = "107:\src\CompilerPasses\Preprocessor.gbas";
					if (((param9_IgnoreAll) ? 0 : 1)) {
						var local6_Result_2521 = 0, local3_Pos_2522 = 0.0;
						__debugInfo = "78:\src\CompilerPasses\Preprocessor.gbas";
						local6_Result_2521 = 0;
						__debugInfo = "79:\src\CompilerPasses\Preprocessor.gbas";
						local3_Pos_2522 = global8_Compiler.attr11_currentPosi;
						__debugInfo = "82:\src\CompilerPasses\Preprocessor.gbas";
						{
							var Error_Str = "";
							__debugInfo = "84:\src\CompilerPasses\Preprocessor.gbas";
							try {
								__debugInfo = "81:\src\CompilerPasses\Preprocessor.gbas";
								local6_Result_2521 = ~~(func13_CalculateTree(unref(global5_Exprs_ref[0].arrAccess(func10_Expression(0)).values[tmpPositionCache][0])));
								__debugInfo = "81:\src\CompilerPasses\Preprocessor.gbas";
							} catch (Error_Str) {
								if (Error_Str instanceof OTTException) Error_Str = Error_Str.getText(); else throwError(Error_Str);{
									__debugInfo = "83:\src\CompilerPasses\Preprocessor.gbas";
									func5_Error((((("Unable to evaluate IF (syntax error?) '") + (Error_Str))) + ("'")), 82, "src\CompilerPasses\Preprocessor.gbas");
									__debugInfo = "83:\src\CompilerPasses\Preprocessor.gbas";
								}
							};
							__debugInfo = "84:\src\CompilerPasses\Preprocessor.gbas";
						};
						__debugInfo = "85:\src\CompilerPasses\Preprocessor.gbas";
						global8_Compiler.attr11_currentPosi = ~~(((local3_Pos_2522) - (1)));
						__debugInfo = "86:\src\CompilerPasses\Preprocessor.gbas";
						func7_GetNext();
						__debugInfo = "90:\src\CompilerPasses\Preprocessor.gbas";
						while (((func7_IsToken("\n")) ? 0 : 1)) {
							__debugInfo = "89:\src\CompilerPasses\Preprocessor.gbas";
							func13_RemoveCurrent();
							__debugInfo = "89:\src\CompilerPasses\Preprocessor.gbas";
						};
						__debugInfo = "92:\src\CompilerPasses\Preprocessor.gbas";
						func14_MatchAndRemove("\n", 91, "src\CompilerPasses\Preprocessor.gbas");
						__debugInfo = "99:\src\CompilerPasses\Preprocessor.gbas";
						if ((((local6_Result_2521) === (1)) ? 1 : 0)) {
							__debugInfo = "96:\src\CompilerPasses\Preprocessor.gbas";
							func5_PreIf(1);
							__debugInfo = "96:\src\CompilerPasses\Preprocessor.gbas";
						} else {
							__debugInfo = "98:\src\CompilerPasses\Preprocessor.gbas";
							func5_PreIf(0);
							__debugInfo = "98:\src\CompilerPasses\Preprocessor.gbas";
						};
						__debugInfo = "78:\src\CompilerPasses\Preprocessor.gbas";
					} else {
						__debugInfo = "103:\src\CompilerPasses\Preprocessor.gbas";
						while (((func7_IsToken("\n")) ? 0 : 1)) {
							__debugInfo = "102:\src\CompilerPasses\Preprocessor.gbas";
							func13_RemoveCurrent();
							__debugInfo = "102:\src\CompilerPasses\Preprocessor.gbas";
						};
						__debugInfo = "104:\src\CompilerPasses\Preprocessor.gbas";
						func14_MatchAndRemove("\n", 103, "src\CompilerPasses\Preprocessor.gbas");
						__debugInfo = "106:\src\CompilerPasses\Preprocessor.gbas";
						func5_PreIf(2);
						__debugInfo = "103:\src\CompilerPasses\Preprocessor.gbas";
					};
					__debugInfo = "107:\src\CompilerPasses\Preprocessor.gbas";
				} else if ((((local17___SelectHelper39__2514) === ("WARNING")) ? 1 : 0)) {
					__debugInfo = "109:\src\CompilerPasses\Preprocessor.gbas";
					if (((param9_IgnoreAll) ? 0 : 1)) {
						__debugInfo = "109:\src\CompilerPasses\Preprocessor.gbas";
						func7_Warning(func14_GetCurrent_Str());
						__debugInfo = "109:\src\CompilerPasses\Preprocessor.gbas";
					};
					__debugInfo = "110:\src\CompilerPasses\Preprocessor.gbas";
					func13_RemoveCurrent();
					__debugInfo = "109:\src\CompilerPasses\Preprocessor.gbas";
				} else if ((((local17___SelectHelper39__2514) === ("ERROR")) ? 1 : 0)) {
					__debugInfo = "112:\src\CompilerPasses\Preprocessor.gbas";
					if (((param9_IgnoreAll) ? 0 : 1)) {
						__debugInfo = "112:\src\CompilerPasses\Preprocessor.gbas";
						func5_Error(func14_GetCurrent_Str(), 111, "src\CompilerPasses\Preprocessor.gbas");
						__debugInfo = "112:\src\CompilerPasses\Preprocessor.gbas";
					};
					__debugInfo = "113:\src\CompilerPasses\Preprocessor.gbas";
					func13_RemoveCurrent();
					__debugInfo = "112:\src\CompilerPasses\Preprocessor.gbas";
				} else if ((((local17___SelectHelper39__2514) === ("ELSE")) ? 1 : 0)) {
					__debugInfo = "115:\src\CompilerPasses\Preprocessor.gbas";
					return 1;
					__debugInfo = "115:\src\CompilerPasses\Preprocessor.gbas";
				} else if ((((local17___SelectHelper39__2514) === ("ENDIF")) ? 1 : 0)) {
					__debugInfo = "117:\src\CompilerPasses\Preprocessor.gbas";
					return 2;
					__debugInfo = "117:\src\CompilerPasses\Preprocessor.gbas";
				} else if ((((local17___SelectHelper39__2514) === ("OPTIMIZE")) ? 1 : 0)) {
					__debugInfo = "140:\src\CompilerPasses\Preprocessor.gbas";
					if (((param9_IgnoreAll) ? 0 : 1)) {
						__debugInfo = "130:\src\CompilerPasses\Preprocessor.gbas";
						{
							var local17___SelectHelper40__2524 = "";
							__debugInfo = "130:\src\CompilerPasses\Preprocessor.gbas";
							local17___SelectHelper40__2524 = func14_GetCurrent_Str();
							__debugInfo = "139:\src\CompilerPasses\Preprocessor.gbas";
							if ((((local17___SelectHelper40__2524) === ("SIMPLE")) ? 1 : 0)) {
								__debugInfo = "132:\src\CompilerPasses\Preprocessor.gbas";
								global13_OptimizeLevel = 1;
								__debugInfo = "132:\src\CompilerPasses\Preprocessor.gbas";
							} else if ((((local17___SelectHelper40__2524) === ("AGGRESSIVE")) ? 1 : 0)) {
								__debugInfo = "134:\src\CompilerPasses\Preprocessor.gbas";
								global13_OptimizeLevel = 2;
								__debugInfo = "134:\src\CompilerPasses\Preprocessor.gbas";
							} else if ((((local17___SelectHelper40__2524) === ("NONE")) ? 1 : 0)) {
								__debugInfo = "136:\src\CompilerPasses\Preprocessor.gbas";
								global13_OptimizeLevel = 0;
								__debugInfo = "136:\src\CompilerPasses\Preprocessor.gbas";
							} else {
								__debugInfo = "138:\src\CompilerPasses\Preprocessor.gbas";
								func5_Error("Unknown optimization level", 137, "src\CompilerPasses\Preprocessor.gbas");
								__debugInfo = "138:\src\CompilerPasses\Preprocessor.gbas";
							};
							__debugInfo = "130:\src\CompilerPasses\Preprocessor.gbas";
						};
						__debugInfo = "130:\src\CompilerPasses\Preprocessor.gbas";
					};
					__debugInfo = "141:\src\CompilerPasses\Preprocessor.gbas";
					func13_RemoveCurrent();
					__debugInfo = "140:\src\CompilerPasses\Preprocessor.gbas";
				} else if ((((local17___SelectHelper39__2514) === ("GRAPHICS")) ? 1 : 0)) {
					__debugInfo = "143:\src\CompilerPasses\Preprocessor.gbas";
					if (((param9_IgnoreAll) ? 0 : 1)) {
						__debugInfo = "143:\src\CompilerPasses\Preprocessor.gbas";
						global7_CONSOLE = 0;
						__debugInfo = "143:\src\CompilerPasses\Preprocessor.gbas";
					};
					__debugInfo = "143:\src\CompilerPasses\Preprocessor.gbas";
				} else if ((((local17___SelectHelper39__2514) === ("DOC")) ? 1 : 0)) {
					__debugInfo = "146:\src\CompilerPasses\Preprocessor.gbas";
					func8_ParseDoc();
					__debugInfo = "146:\src\CompilerPasses\Preprocessor.gbas";
				} else {
					__debugInfo = "149:\src\CompilerPasses\Preprocessor.gbas";
					func5_Error((((("Expecting preprocessor command got '") + (local7_Cur_Str_2513))) + ("'")), 148, "src\CompilerPasses\Preprocessor.gbas");
					__debugInfo = "149:\src\CompilerPasses\Preprocessor.gbas";
				};
				__debugInfo = "21:\src\CompilerPasses\Preprocessor.gbas";
			};
			__debugInfo = "152:\src\CompilerPasses\Preprocessor.gbas";
			func14_MatchAndRemove("\n", 151, "src\CompilerPasses\Preprocessor.gbas");
			__debugInfo = "18:\src\CompilerPasses\Preprocessor.gbas";
		} else {
			var local6_Is_Str_2525 = "";
			__debugInfo = "154:\src\CompilerPasses\Preprocessor.gbas";
			local6_Is_Str_2525 = func14_GetCurrent_Str();
			__debugInfo = "164:\src\CompilerPasses\Preprocessor.gbas";
			if ((((local6_Is_Str_2525) === ("_")) ? 1 : 0)) {
				__debugInfo = "156:\src\CompilerPasses\Preprocessor.gbas";
				func13_RemoveCurrent();
				__debugInfo = "157:\src\CompilerPasses\Preprocessor.gbas";
				func14_MatchAndRemove("\n", 156, "src\CompilerPasses\Preprocessor.gbas");
				__debugInfo = "156:\src\CompilerPasses\Preprocessor.gbas";
			} else {
				__debugInfo = "163:\src\CompilerPasses\Preprocessor.gbas";
				if (param9_IgnoreAll) {
					__debugInfo = "160:\src\CompilerPasses\Preprocessor.gbas";
					func13_RemoveCurrent();
					__debugInfo = "160:\src\CompilerPasses\Preprocessor.gbas";
				} else {
					__debugInfo = "162:\src\CompilerPasses\Preprocessor.gbas";
					func7_GetNext();
					__debugInfo = "162:\src\CompilerPasses\Preprocessor.gbas";
				};
				__debugInfo = "163:\src\CompilerPasses\Preprocessor.gbas";
			};
			__debugInfo = "154:\src\CompilerPasses\Preprocessor.gbas";
		};
		__debugInfo = "167:\src\CompilerPasses\Preprocessor.gbas";
		return 0;
		__debugInfo = "168:\src\CompilerPasses\Preprocessor.gbas";
		return 0;
		__debugInfo = "165:\src\CompilerPasses\Preprocessor.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func10_PreCommand = window['func10_PreCommand'];
window['func5_PreIf'] = function(param4_doIt) {
	stackPush("function: PreIf", __debugInfo);
	try {
		var local8_Text_Str_2527 = "";
		__debugInfo = "189:\src\CompilerPasses\Preprocessor.gbas";
		if ((((param4_doIt) === (0)) ? 1 : 0)) {
			__debugInfo = "177:\src\CompilerPasses\Preprocessor.gbas";
			if ((((func7_PreSkip(1)) === (1)) ? 1 : 0)) {
				__debugInfo = "174:\src\CompilerPasses\Preprocessor.gbas";
				func14_MatchAndRemove("\n", 173, "src\CompilerPasses\Preprocessor.gbas");
				__debugInfo = "176:\src\CompilerPasses\Preprocessor.gbas";
				if ((((func7_PreSkip(0)) === (1)) ? 1 : 0)) {
					__debugInfo = "176:\src\CompilerPasses\Preprocessor.gbas";
					func5_Error("Expecting '?ENDIF'", 175, "src\CompilerPasses\Preprocessor.gbas");
					__debugInfo = "176:\src\CompilerPasses\Preprocessor.gbas";
				};
				__debugInfo = "174:\src\CompilerPasses\Preprocessor.gbas";
			};
			__debugInfo = "177:\src\CompilerPasses\Preprocessor.gbas";
		} else if ((((param4_doIt) === (1)) ? 1 : 0)) {
			__debugInfo = "181:\src\CompilerPasses\Preprocessor.gbas";
			if ((((func7_PreSkip(0)) === (1)) ? 1 : 0)) {
				__debugInfo = "180:\src\CompilerPasses\Preprocessor.gbas";
				if ((((func7_PreSkip(1)) === (1)) ? 1 : 0)) {
					__debugInfo = "180:\src\CompilerPasses\Preprocessor.gbas";
					func5_Error("Expectiong '?ENDIF'", 179, "src\CompilerPasses\Preprocessor.gbas");
					__debugInfo = "180:\src\CompilerPasses\Preprocessor.gbas";
				};
				__debugInfo = "180:\src\CompilerPasses\Preprocessor.gbas";
			};
			__debugInfo = "181:\src\CompilerPasses\Preprocessor.gbas";
		} else if ((((param4_doIt) === (2)) ? 1 : 0)) {
			__debugInfo = "186:\src\CompilerPasses\Preprocessor.gbas";
			if ((((func7_PreSkip(1)) === (1)) ? 1 : 0)) {
				__debugInfo = "185:\src\CompilerPasses\Preprocessor.gbas";
				if ((((func7_PreSkip(1)) === (1)) ? 1 : 0)) {
					__debugInfo = "185:\src\CompilerPasses\Preprocessor.gbas";
					func5_Error("Expecting '?ENDIF'", 184, "src\CompilerPasses\Preprocessor.gbas");
					__debugInfo = "185:\src\CompilerPasses\Preprocessor.gbas";
				};
				__debugInfo = "185:\src\CompilerPasses\Preprocessor.gbas";
			};
			__debugInfo = "186:\src\CompilerPasses\Preprocessor.gbas";
		} else {
			__debugInfo = "188:\src\CompilerPasses\Preprocessor.gbas";
			func5_Error("Internal error (unknown preif)", 187, "src\CompilerPasses\Preprocessor.gbas");
			__debugInfo = "188:\src\CompilerPasses\Preprocessor.gbas";
		};
		__debugInfo = "190:\src\CompilerPasses\Preprocessor.gbas";
		return 0;
		__debugInfo = "189:\src\CompilerPasses\Preprocessor.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func5_PreIf = window['func5_PreIf'];
window['func7_PreSkip'] = function(param9_RemoveAll) {
	stackPush("function: PreSkip", __debugInfo);
	try {
		__debugInfo = "198:\src\CompilerPasses\Preprocessor.gbas";
		while (func8_EOFParse()) {
			var local1_E_2529 = 0;
			__debugInfo = "194:\src\CompilerPasses\Preprocessor.gbas";
			local1_E_2529 = func10_PreCommand(param9_RemoveAll);
			__debugInfo = "197:\src\CompilerPasses\Preprocessor.gbas";
			if ((((local1_E_2529) > (0)) ? 1 : 0)) {
				__debugInfo = "196:\src\CompilerPasses\Preprocessor.gbas";
				return tryClone(local1_E_2529);
				__debugInfo = "196:\src\CompilerPasses\Preprocessor.gbas";
			};
			__debugInfo = "194:\src\CompilerPasses\Preprocessor.gbas";
		};
		__debugInfo = "199:\src\CompilerPasses\Preprocessor.gbas";
		func5_Error("Unexpected End Of File (maybe missing ?ENDIF)", 198, "src\CompilerPasses\Preprocessor.gbas");
		__debugInfo = "200:\src\CompilerPasses\Preprocessor.gbas";
		return 0;
		__debugInfo = "198:\src\CompilerPasses\Preprocessor.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func7_PreSkip = window['func7_PreSkip'];
window['func13_CalculateTree'] = function(param4_expr) {
	stackPush("function: CalculateTree", __debugInfo);
	try {
		__debugInfo = "203:\src\CompilerPasses\Preprocessor.gbas";
		{
			var local17___SelectHelper41__2531 = 0;
			__debugInfo = "203:\src\CompilerPasses\Preprocessor.gbas";
			local17___SelectHelper41__2531 = param4_expr.attr3_Typ;
			__debugInfo = "247:\src\CompilerPasses\Preprocessor.gbas";
			if ((((local17___SelectHelper41__2531) === (~~(3))) ? 1 : 0)) {
				__debugInfo = "205:\src\CompilerPasses\Preprocessor.gbas";
				return tryClone(param4_expr.attr6_intval);
				__debugInfo = "205:\src\CompilerPasses\Preprocessor.gbas";
			} else if ((((local17___SelectHelper41__2531) === (~~(4))) ? 1 : 0)) {
				__debugInfo = "207:\src\CompilerPasses\Preprocessor.gbas";
				return tryClone(param4_expr.attr8_floatval);
				__debugInfo = "207:\src\CompilerPasses\Preprocessor.gbas";
			} else if ((((local17___SelectHelper41__2531) === (~~(46))) ? 1 : 0)) {
				__debugInfo = "209:\src\CompilerPasses\Preprocessor.gbas";
				return tryClone(unref(((func13_CalculateTree(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))) ? 0 : 1)));
				__debugInfo = "209:\src\CompilerPasses\Preprocessor.gbas";
			} else if ((((local17___SelectHelper41__2531) === (~~(15))) ? 1 : 0)) {
				__debugInfo = "211:\src\CompilerPasses\Preprocessor.gbas";
				return tryClone(INTEGER(func13_CalculateTree(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))));
				__debugInfo = "211:\src\CompilerPasses\Preprocessor.gbas";
			} else if ((((local17___SelectHelper41__2531) === (~~(16))) ? 1 : 0)) {
				__debugInfo = "213:\src\CompilerPasses\Preprocessor.gbas";
				return tryClone(func13_CalculateTree(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0])));
				__debugInfo = "213:\src\CompilerPasses\Preprocessor.gbas";
			} else if ((((local17___SelectHelper41__2531) === (~~(1))) ? 1 : 0)) {
				var local4_Left_2532 = 0.0, local5_Right_2533 = 0.0;
				__debugInfo = "215:\src\CompilerPasses\Preprocessor.gbas";
				local4_Left_2532 = func13_CalculateTree(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_Left).values[tmpPositionCache][0]));
				__debugInfo = "216:\src\CompilerPasses\Preprocessor.gbas";
				local5_Right_2533 = func13_CalculateTree(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0]));
				__debugInfo = "217:\src\CompilerPasses\Preprocessor.gbas";
				{
					var local17___SelectHelper42__2534 = "";
					__debugInfo = "217:\src\CompilerPasses\Preprocessor.gbas";
					local17___SelectHelper42__2534 = global9_Operators_ref[0].arrAccess(param4_expr.attr2_Op).values[tmpPositionCache][0].attr7_Sym_Str;
					__debugInfo = "244:\src\CompilerPasses\Preprocessor.gbas";
					if ((((local17___SelectHelper42__2534) === ("+")) ? 1 : 0)) {
						__debugInfo = "219:\src\CompilerPasses\Preprocessor.gbas";
						return tryClone(((local4_Left_2532) + (local5_Right_2533)));
						__debugInfo = "219:\src\CompilerPasses\Preprocessor.gbas";
					} else if ((((local17___SelectHelper42__2534) === ("-")) ? 1 : 0)) {
						__debugInfo = "221:\src\CompilerPasses\Preprocessor.gbas";
						return tryClone(((local4_Left_2532) - (local5_Right_2533)));
						__debugInfo = "221:\src\CompilerPasses\Preprocessor.gbas";
					} else if ((((local17___SelectHelper42__2534) === ("*")) ? 1 : 0)) {
						__debugInfo = "223:\src\CompilerPasses\Preprocessor.gbas";
						return tryClone(((local4_Left_2532) * (local5_Right_2533)));
						__debugInfo = "223:\src\CompilerPasses\Preprocessor.gbas";
					} else if ((((local17___SelectHelper42__2534) === ("/")) ? 1 : 0)) {
						__debugInfo = "225:\src\CompilerPasses\Preprocessor.gbas";
						return tryClone(((local4_Left_2532) / (local5_Right_2533)));
						__debugInfo = "225:\src\CompilerPasses\Preprocessor.gbas";
					} else if ((((local17___SelectHelper42__2534) === ("^")) ? 1 : 0)) {
						__debugInfo = "227:\src\CompilerPasses\Preprocessor.gbas";
						return tryClone(POW(local4_Left_2532, local5_Right_2533));
						__debugInfo = "227:\src\CompilerPasses\Preprocessor.gbas";
					} else if ((((local17___SelectHelper42__2534) === ("=")) ? 1 : 0)) {
						__debugInfo = "229:\src\CompilerPasses\Preprocessor.gbas";
						return tryClone((((local4_Left_2532) === (local5_Right_2533)) ? 1 : 0));
						__debugInfo = "229:\src\CompilerPasses\Preprocessor.gbas";
					} else if ((((local17___SelectHelper42__2534) === (">")) ? 1 : 0)) {
						__debugInfo = "231:\src\CompilerPasses\Preprocessor.gbas";
						return tryClone((((local4_Left_2532) > (local5_Right_2533)) ? 1 : 0));
						__debugInfo = "231:\src\CompilerPasses\Preprocessor.gbas";
					} else if ((((local17___SelectHelper42__2534) === ("<")) ? 1 : 0)) {
						__debugInfo = "233:\src\CompilerPasses\Preprocessor.gbas";
						return tryClone((((local4_Left_2532) < (local5_Right_2533)) ? 1 : 0));
						__debugInfo = "233:\src\CompilerPasses\Preprocessor.gbas";
					} else if ((((local17___SelectHelper42__2534) === ("<=")) ? 1 : 0)) {
						__debugInfo = "235:\src\CompilerPasses\Preprocessor.gbas";
						return tryClone((((local4_Left_2532) <= (local5_Right_2533)) ? 1 : 0));
						__debugInfo = "235:\src\CompilerPasses\Preprocessor.gbas";
					} else if ((((local17___SelectHelper42__2534) === (">=")) ? 1 : 0)) {
						__debugInfo = "237:\src\CompilerPasses\Preprocessor.gbas";
						return tryClone((((local4_Left_2532) >= (local5_Right_2533)) ? 1 : 0));
						__debugInfo = "237:\src\CompilerPasses\Preprocessor.gbas";
					} else if ((((local17___SelectHelper42__2534) === ("AND")) ? 1 : 0)) {
						__debugInfo = "239:\src\CompilerPasses\Preprocessor.gbas";
						return tryClone((((local4_Left_2532) && (local5_Right_2533)) ? 1 : 0));
						__debugInfo = "239:\src\CompilerPasses\Preprocessor.gbas";
					} else if ((((local17___SelectHelper42__2534) === ("OR")) ? 1 : 0)) {
						__debugInfo = "241:\src\CompilerPasses\Preprocessor.gbas";
						return tryClone((((local4_Left_2532) || (local5_Right_2533)) ? 1 : 0));
						__debugInfo = "241:\src\CompilerPasses\Preprocessor.gbas";
					} else {
						__debugInfo = "243:\src\CompilerPasses\Preprocessor.gbas";
						func5_Error("Internal error (unimplemented operator!)", 242, "src\CompilerPasses\Preprocessor.gbas");
						__debugInfo = "243:\src\CompilerPasses\Preprocessor.gbas";
					};
					__debugInfo = "217:\src\CompilerPasses\Preprocessor.gbas";
				};
				__debugInfo = "215:\src\CompilerPasses\Preprocessor.gbas";
			} else {
				__debugInfo = "246:\src\CompilerPasses\Preprocessor.gbas";
				throw new OTTException((((("Unable to resolve '") + (CAST2STRING(param4_expr.attr3_Typ)))) + ("'")), "\src\CompilerPasses\Preprocessor.gbas", 246);
				__debugInfo = "246:\src\CompilerPasses\Preprocessor.gbas";
			};
			__debugInfo = "203:\src\CompilerPasses\Preprocessor.gbas";
		};
		__debugInfo = "248:\src\CompilerPasses\Preprocessor.gbas";
		return 0;
		__debugInfo = "203:\src\CompilerPasses\Preprocessor.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func13_CalculateTree = window['func13_CalculateTree'];
window['func12_DoTarget_Str'] = function(param8_Name_Str) {
	stackPush("function: DoTarget_Str", __debugInfo);
	try {
		var local10_Output_Str_2536 = "";
		__debugInfo = "41:\src\Target.gbas";
		global8_Compiler.attr14_errorState_Str = ((((" (target '") + (param8_Name_Str))) + ("' error)"));
		__debugInfo = "42:\src\Target.gbas";
		global10_Target_Str = param8_Name_Str;
		__debugInfo = "43:\src\Target.gbas";
		global13_SettingIn_Str = "";
		__debugInfo = "45:\src\Target.gbas";
		REDIM(global9_Templates, [0], pool_TTemplate.alloc() );
		__debugInfo = "46:\src\Target.gbas";
		REDIM(global9_Libraries, [0], pool_TLibrary.alloc() );
		__debugInfo = "47:\src\Target.gbas";
		REDIM(global10_Blacklists, [0], pool_TBlackList.alloc() );
		__debugInfo = "48:\src\Target.gbas";
		REDIM(global7_Actions, [0], pool_TAction.alloc() );
		__debugInfo = "73:\src\Target.gbas";
		local10_Output_Str_2536 = "";
		__debugInfo = "81:\src\Target.gbas";
		var forEachSaver24409 = global10_Generators;
		for(var forEachCounter24409 = 0 ; forEachCounter24409 < forEachSaver24409.values.length ; forEachCounter24409++) {
			var local1_G_2537 = forEachSaver24409.values[forEachCounter24409];
		{
				__debugInfo = "80:\src\Target.gbas";
				if ((((UCASE_Str(local1_G_2537.attr8_Name_Str)) === (UCASE_Str(global8_Lang_Str))) ? 1 : 0)) {
					__debugInfo = "76:\src\Target.gbas";
					global8_Compiler.attr14_errorState_Str = " (generate error)";
					__debugInfo = "77:\src\Target.gbas";
					local10_Output_Str_2536 = (("") + (CAST2STRING(local1_G_2537.attr8_genProto())));
					__debugInfo = "78:\src\Target.gbas";
					global8_Compiler.attr14_errorState_Str = ((((" (target '") + (param8_Name_Str))) + ("' error)"));
					__debugInfo = "79:\src\Target.gbas";
					break;
					__debugInfo = "76:\src\Target.gbas";
				};
				__debugInfo = "80:\src\Target.gbas";
			}
			forEachSaver24409.values[forEachCounter24409] = local1_G_2537;
		
		};
		__debugInfo = "82:\src\Target.gbas";
		if ((((local10_Output_Str_2536) === ("")) ? 1 : 0)) {
			__debugInfo = "82:\src\Target.gbas";
			func5_Error("Empty output!", 81, "src\Target.gbas");
			__debugInfo = "82:\src\Target.gbas";
		};
		__debugInfo = "202:\src\Target.gbas";
		return tryClone(local10_Output_Str_2536);
		__debugInfo = "203:\src\Target.gbas";
		return "";
		__debugInfo = "41:\src\Target.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func12_DoTarget_Str = window['func12_DoTarget_Str'];
window['func11_SetupTarget'] = function(param8_Name_Str) {
	stackPush("function: SetupTarget", __debugInfo);
	try {
		__debugInfo = "206:\src\Target.gbas";
		global13_SettingIn_Str = "";
		__debugInfo = "207:\src\Target.gbas";
		global10_Target_Str = param8_Name_Str;
		__debugInfo = "214:\src\Target.gbas";
		if (global7_CONSOLE) {
			__debugInfo = "211:\src\Target.gbas";
			global8_Mode_Str = "console";
			__debugInfo = "211:\src\Target.gbas";
		} else {
			__debugInfo = "213:\src\Target.gbas";
			global8_Mode_Str = "2d";
			__debugInfo = "213:\src\Target.gbas";
		};
		__debugInfo = "224:\src\Target.gbas";
		global10_Target_Str = "HTML5";
		__debugInfo = "225:\src\Target.gbas";
		global8_Lang_Str = "js";
		__debugInfo = "226:\src\Target.gbas";
		RegisterDefine(UCASE_Str(global10_Target_Str), "1");
		__debugInfo = "227:\src\Target.gbas";
		RegisterDefine("JS", "1");
		__debugInfo = "230:\src\Target.gbas";
		return 0;
		__debugInfo = "206:\src\Target.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func11_SetupTarget = window['func11_SetupTarget'];
window['func9_WriteFile'] = function(param8_File_Str, param8_Text_Str) {
	stackPush("function: WriteFile", __debugInfo);
	try {
		__debugInfo = "475:\src\Target.gbas";
		return 0;
		__debugInfo = "475:\src\Target.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
func9_WriteFile = window['func9_WriteFile'];
window['method9_type3_XML_7_ReadXML'] = function(param8_File_Str, param5_event, param4_self) {
	stackPush("method: ReadXML", __debugInfo);
	try {
		__debugInfo = "18:\src\Utils\XMLReader.gbas";
		param4_self.attr5_Event = param5_event;
		__debugInfo = "19:\src\Utils\XMLReader.gbas";
		param4_self.attr8_Text_Str = func12_LoadFile_Str(param8_File_Str);
		__debugInfo = "20:\src\Utils\XMLReader.gbas";
		param4_self.attr8_Position = 0;
		__debugInfo = "22:\src\Utils\XMLReader.gbas";
		(param4_self).SkipWhitespaces();
		__debugInfo = "26:\src\Utils\XMLReader.gbas";
		while (((((param4_self).Get_Str()) !== ("<")) ? 1 : 0)) {
			__debugInfo = "25:\src\Utils\XMLReader.gbas";
			param4_self.attr8_Position+=1;
			__debugInfo = "25:\src\Utils\XMLReader.gbas";
		};
		__debugInfo = "33:\src\Utils\XMLReader.gbas";
		if ((((MID_Str(param4_self.attr8_Text_Str, param4_self.attr8_Position, 2)) === ("<?")) ? 1 : 0)) {
			__debugInfo = "31:\src\Utils\XMLReader.gbas";
			while (((((param4_self).Get_Str()) !== (">")) ? 1 : 0)) {
				__debugInfo = "30:\src\Utils\XMLReader.gbas";
				param4_self.attr8_Position+=1;
				__debugInfo = "30:\src\Utils\XMLReader.gbas";
			};
			__debugInfo = "32:\src\Utils\XMLReader.gbas";
			param4_self.attr8_Position+=1;
			__debugInfo = "31:\src\Utils\XMLReader.gbas";
		};
		__debugInfo = "34:\src\Utils\XMLReader.gbas";
		(param4_self).SkipWhitespaces();
		__debugInfo = "37:\src\Utils\XMLReader.gbas";
		{
			var Err_Str = "";
			__debugInfo = "45:\src\Utils\XMLReader.gbas";
			try {
				__debugInfo = "36:\src\Utils\XMLReader.gbas";
				(param4_self).ParseNode();
				__debugInfo = "36:\src\Utils\XMLReader.gbas";
			} catch (Err_Str) {
				if (Err_Str instanceof OTTException) Err_Str = Err_Str.getText(); else throwError(Err_Str);{
					__debugInfo = "44:\src\Utils\XMLReader.gbas";
					if ((((Err_Str) === ("EXIT")) ? 1 : 0)) {
						
					} else {
						__debugInfo = "40:\src\Utils\XMLReader.gbas";
						STDOUT(Err_Str);
						__debugInfo = "40:\src\Utils\XMLReader.gbas";
					};
					__debugInfo = "44:\src\Utils\XMLReader.gbas";
				}
			};
			__debugInfo = "45:\src\Utils\XMLReader.gbas";
		};
		__debugInfo = "46:\src\Utils\XMLReader.gbas";
		return 0;
		__debugInfo = "18:\src\Utils\XMLReader.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
method9_type3_XML_7_ReadXML = window['method9_type3_XML_7_ReadXML'];
window['method9_type3_XML_10_ParseLayer'] = function(param4_self) {
	stackPush("method: ParseLayer", __debugInfo);
	try {
		__debugInfo = "49:\src\Utils\XMLReader.gbas";
		(param4_self).SkipWhitespaces();
		__debugInfo = "64:\src\Utils\XMLReader.gbas";
		while (((((param4_self).Get_Str()) === ("<")) ? 1 : 0)) {
			var local8_HasSlash_2548 = 0;
			__debugInfo = "53:\src\Utils\XMLReader.gbas";
			local8_HasSlash_2548 = 0;
			__debugInfo = "54:\src\Utils\XMLReader.gbas";
			param4_self.attr8_Position+=1;
			__debugInfo = "55:\src\Utils\XMLReader.gbas";
			(param4_self).SkipWhitespaces();
			__debugInfo = "58:\src\Utils\XMLReader.gbas";
			if (((((param4_self).Get_Str()) === ("/")) ? 1 : 0)) {
				__debugInfo = "57:\src\Utils\XMLReader.gbas";
				local8_HasSlash_2548 = 1;
				__debugInfo = "57:\src\Utils\XMLReader.gbas";
			};
			__debugInfo = "61:\src\Utils\XMLReader.gbas";
			while (((((param4_self).Get_Str()) !== ("<")) ? 1 : 0)) {
				__debugInfo = "60:\src\Utils\XMLReader.gbas";
				param4_self.attr8_Position+=-1;
				__debugInfo = "60:\src\Utils\XMLReader.gbas";
			};
			__debugInfo = "62:\src\Utils\XMLReader.gbas";
			if (local8_HasSlash_2548) {
				__debugInfo = "62:\src\Utils\XMLReader.gbas";
				return tryClone(0);
				__debugInfo = "62:\src\Utils\XMLReader.gbas";
			};
			__debugInfo = "63:\src\Utils\XMLReader.gbas";
			(param4_self).ParseNode();
			__debugInfo = "53:\src\Utils\XMLReader.gbas";
		};
		__debugInfo = "65:\src\Utils\XMLReader.gbas";
		return tryClone(1);
		__debugInfo = "66:\src\Utils\XMLReader.gbas";
		return 0;
		__debugInfo = "49:\src\Utils\XMLReader.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
method9_type3_XML_10_ParseLayer = window['method9_type3_XML_10_ParseLayer'];
window['method9_type3_XML_9_ParseNode'] = function(param4_self) {
	stackPush("method: ParseNode", __debugInfo);
	try {
		var local8_Name_Str_2551 = "", local10_Attributes_2552 = pool_array.alloc(pool_xmlAttribute.alloc());
		__debugInfo = "69:\src\Utils\XMLReader.gbas";
		if (((((param4_self).Get_Str()) !== ("<")) ? 1 : 0)) {
			__debugInfo = "69:\src\Utils\XMLReader.gbas";
			throw new OTTException("XML Error - Expecting '<'", "\src\Utils\XMLReader.gbas", 69);
			__debugInfo = "69:\src\Utils\XMLReader.gbas";
		};
		__debugInfo = "70:\src\Utils\XMLReader.gbas";
		param4_self.attr8_Position+=1;
		__debugInfo = "71:\src\Utils\XMLReader.gbas";
		(param4_self).SkipWhitespaces();
		__debugInfo = "73:\src\Utils\XMLReader.gbas";
		local8_Name_Str_2551 = (param4_self).ParseIdentifier_Str();
		__debugInfo = "104:\src\Utils\XMLReader.gbas";
		if (((((param4_self).Get_Str()) === (" ")) ? 1 : 0)) {
			__debugInfo = "78:\src\Utils\XMLReader.gbas";
			(param4_self).SkipWhitespaces();
			__debugInfo = "103:\src\Utils\XMLReader.gbas";
			while ((((((((param4_self).Get_Str()) !== ("/")) ? 1 : 0)) && (((((param4_self).Get_Str()) !== (">")) ? 1 : 0))) ? 1 : 0)) {
				var local3_Att_2553 = pool_xmlAttribute.alloc(), local3_Pos_2554 = 0;
				__debugInfo = "80:\src\Utils\XMLReader.gbas";
				(param4_self).SkipWhitespaces();
				__debugInfo = "83:\src\Utils\XMLReader.gbas";
				local3_Att_2553.attr8_Name_Str = (param4_self).ParseIdentifier_Str();
				__debugInfo = "84:\src\Utils\XMLReader.gbas";
				(param4_self).SkipWhitespaces();
				__debugInfo = "86:\src\Utils\XMLReader.gbas";
				if (((((param4_self).Get_Str()) !== ("=")) ? 1 : 0)) {
					__debugInfo = "86:\src\Utils\XMLReader.gbas";
					throw new OTTException("XML Error - Expecting '='", "\src\Utils\XMLReader.gbas", 86);
					__debugInfo = "86:\src\Utils\XMLReader.gbas";
				};
				__debugInfo = "87:\src\Utils\XMLReader.gbas";
				param4_self.attr8_Position+=1;
				__debugInfo = "89:\src\Utils\XMLReader.gbas";
				(param4_self).SkipWhitespaces();
				__debugInfo = "91:\src\Utils\XMLReader.gbas";
				if (((((param4_self).Get_Str()) !== ("\"")) ? 1 : 0)) {
					__debugInfo = "91:\src\Utils\XMLReader.gbas";
					throw new OTTException("XML Error - Expecting '\"'", "\src\Utils\XMLReader.gbas", 91);
					__debugInfo = "91:\src\Utils\XMLReader.gbas";
				};
				__debugInfo = "93:\src\Utils\XMLReader.gbas";
				param4_self.attr8_Position+=1;
				__debugInfo = "94:\src\Utils\XMLReader.gbas";
				local3_Pos_2554 = param4_self.attr8_Position;
				__debugInfo = "97:\src\Utils\XMLReader.gbas";
				while (((((param4_self).Get_Str()) !== ("\"")) ? 1 : 0)) {
					__debugInfo = "96:\src\Utils\XMLReader.gbas";
					param4_self.attr8_Position+=1;
					__debugInfo = "96:\src\Utils\XMLReader.gbas";
				};
				__debugInfo = "98:\src\Utils\XMLReader.gbas";
				param4_self.attr8_Position+=1;
				__debugInfo = "99:\src\Utils\XMLReader.gbas";
				local3_Att_2553.attr9_Value_Str = MID_Str(param4_self.attr8_Text_Str, local3_Pos_2554, ((((param4_self.attr8_Position) - (local3_Pos_2554))) - (1)));
				__debugInfo = "100:\src\Utils\XMLReader.gbas";
				(param4_self).SkipWhitespaces();
				__debugInfo = "102:\src\Utils\XMLReader.gbas";
				DIMPUSH(local10_Attributes_2552, local3_Att_2553);
				__debugInfo = "80:\src\Utils\XMLReader.gbas";pool_xmlAttribute.free(local3_Att_2553);
			};
			__debugInfo = "78:\src\Utils\XMLReader.gbas";
		};
		__debugInfo = "106:\src\Utils\XMLReader.gbas";
		param4_self.attr5_Event(local8_Name_Str_2551, local10_Attributes_2552);
		__debugInfo = "108:\src\Utils\XMLReader.gbas";
		{
			var local17___SelectHelper43__2555 = "";
			__debugInfo = "108:\src\Utils\XMLReader.gbas";
			local17___SelectHelper43__2555 = (param4_self).Get_Str();
			__debugInfo = "135:\src\Utils\XMLReader.gbas";
			if ((((local17___SelectHelper43__2555) === (">")) ? 1 : 0)) {
				__debugInfo = "110:\src\Utils\XMLReader.gbas";
				param4_self.attr8_Position+=1;
				__debugInfo = "111:\src\Utils\XMLReader.gbas";
				(param4_self).SkipWhitespaces();
				__debugInfo = "113:\src\Utils\XMLReader.gbas";
				if ((param4_self).ParseLayer()) {
					__debugInfo = "113:\src\Utils\XMLReader.gbas";
					throw new OTTException((((("XML Error - Unexpected End of File, expecting </") + (local8_Name_Str_2551))) + (">")), "\src\Utils\XMLReader.gbas", 113);
					__debugInfo = "113:\src\Utils\XMLReader.gbas";
				};
				__debugInfo = "116:\src\Utils\XMLReader.gbas";
				(param4_self).SkipWhitespaces();
				__debugInfo = "117:\src\Utils\XMLReader.gbas";
				if (((((param4_self).Get_Str()) !== ("<")) ? 1 : 0)) {
					__debugInfo = "117:\src\Utils\XMLReader.gbas";
					throw new OTTException("XML Error - Expecting '<'", "\src\Utils\XMLReader.gbas", 117);
					__debugInfo = "117:\src\Utils\XMLReader.gbas";
				};
				__debugInfo = "118:\src\Utils\XMLReader.gbas";
				param4_self.attr8_Position+=1;
				__debugInfo = "119:\src\Utils\XMLReader.gbas";
				(param4_self).SkipWhitespaces();
				__debugInfo = "120:\src\Utils\XMLReader.gbas";
				if (((((param4_self).Get_Str()) !== ("/")) ? 1 : 0)) {
					__debugInfo = "120:\src\Utils\XMLReader.gbas";
					throw new OTTException("XML Error - Expecting '/'", "\src\Utils\XMLReader.gbas", 120);
					__debugInfo = "120:\src\Utils\XMLReader.gbas";
				};
				__debugInfo = "121:\src\Utils\XMLReader.gbas";
				param4_self.attr8_Position+=1;
				__debugInfo = "123:\src\Utils\XMLReader.gbas";
				if ((((local8_Name_Str_2551) !== ((param4_self).ParseIdentifier_Str())) ? 1 : 0)) {
					__debugInfo = "123:\src\Utils\XMLReader.gbas";
					throw new OTTException("XML Error - Nodes do not match", "\src\Utils\XMLReader.gbas", 123);
					__debugInfo = "123:\src\Utils\XMLReader.gbas";
				};
				__debugInfo = "124:\src\Utils\XMLReader.gbas";
				if (((((param4_self).Get_Str()) !== (">")) ? 1 : 0)) {
					__debugInfo = "124:\src\Utils\XMLReader.gbas";
					throw new OTTException("XML Error Expecting '>'", "\src\Utils\XMLReader.gbas", 124);
					__debugInfo = "124:\src\Utils\XMLReader.gbas";
				};
				__debugInfo = "126:\src\Utils\XMLReader.gbas";
				param4_self.attr8_Position+=1;
				__debugInfo = "127:\src\Utils\XMLReader.gbas";
				(param4_self).SkipWhitespaces();
				__debugInfo = "110:\src\Utils\XMLReader.gbas";
			} else if ((((local17___SelectHelper43__2555) === ("/")) ? 1 : 0)) {
				__debugInfo = "129:\src\Utils\XMLReader.gbas";
				param4_self.attr8_Position+=1;
				__debugInfo = "130:\src\Utils\XMLReader.gbas";
				if (((((param4_self).Get_Str()) !== (">")) ? 1 : 0)) {
					__debugInfo = "130:\src\Utils\XMLReader.gbas";
					throw new OTTException("XML Error - Expecting '>'", "\src\Utils\XMLReader.gbas", 130);
					__debugInfo = "130:\src\Utils\XMLReader.gbas";
				};
				__debugInfo = "131:\src\Utils\XMLReader.gbas";
				param4_self.attr8_Position+=1;
				__debugInfo = "132:\src\Utils\XMLReader.gbas";
				(param4_self).SkipWhitespaces();
				__debugInfo = "129:\src\Utils\XMLReader.gbas";
			} else {
				__debugInfo = "134:\src\Utils\XMLReader.gbas";
				throw new OTTException("XML Error", "\src\Utils\XMLReader.gbas", 134);
				__debugInfo = "134:\src\Utils\XMLReader.gbas";
			};
			__debugInfo = "108:\src\Utils\XMLReader.gbas";
		};
		__debugInfo = "136:\src\Utils\XMLReader.gbas";
		return 0;
		__debugInfo = "69:\src\Utils\XMLReader.gbas";pool_array.free(local10_Attributes_2552);
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
method9_type3_XML_9_ParseNode = window['method9_type3_XML_9_ParseNode'];
window['method9_type3_XML_19_ParseIdentifier_Str'] = function(param4_self) {
	stackPush("method: ParseIdentifier_Str", __debugInfo);
	try {
		var local3_Pos_2558 = 0;
		__debugInfo = "139:\src\Utils\XMLReader.gbas";
		local3_Pos_2558 = param4_self.attr8_Position;
		__debugInfo = "142:\src\Utils\XMLReader.gbas";
		while ((((((((((((((param4_self).Get_Str()) !== (" ")) ? 1 : 0)) && (((((param4_self).Get_Str()) !== ("/")) ? 1 : 0))) ? 1 : 0)) && (((((param4_self).Get_Str()) !== (">")) ? 1 : 0))) ? 1 : 0)) && (((((param4_self).Get_Str()) !== ("=")) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "141:\src\Utils\XMLReader.gbas";
			param4_self.attr8_Position+=1;
			__debugInfo = "141:\src\Utils\XMLReader.gbas";
		};
		__debugInfo = "143:\src\Utils\XMLReader.gbas";
		if ((((param4_self.attr8_Position) >= ((param4_self.attr8_Text_Str).length)) ? 1 : 0)) {
			__debugInfo = "143:\src\Utils\XMLReader.gbas";
			throw new OTTException("XML Error", "\src\Utils\XMLReader.gbas", 143);
			__debugInfo = "143:\src\Utils\XMLReader.gbas";
		};
		__debugInfo = "144:\src\Utils\XMLReader.gbas";
		return tryClone(UCASE_Str(MID_Str(param4_self.attr8_Text_Str, local3_Pos_2558, ((param4_self.attr8_Position) - (local3_Pos_2558)))));
		__debugInfo = "145:\src\Utils\XMLReader.gbas";
		return "";
		__debugInfo = "139:\src\Utils\XMLReader.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
method9_type3_XML_19_ParseIdentifier_Str = window['method9_type3_XML_19_ParseIdentifier_Str'];
window['method9_type3_XML_7_Get_Str'] = function(param4_self) {
	stackPush("method: Get_Str", __debugInfo);
	try {
		__debugInfo = "153:\src\Utils\XMLReader.gbas";
		if ((((param4_self.attr8_Position) >= ((param4_self.attr8_Text_Str).length)) ? 1 : 0)) {
			__debugInfo = "149:\src\Utils\XMLReader.gbas";
			throw new OTTException("XML Error - Unexpected End Of File", "\src\Utils\XMLReader.gbas", 149);
			__debugInfo = "149:\src\Utils\XMLReader.gbas";
		} else {
			__debugInfo = "152:\src\Utils\XMLReader.gbas";
			return tryClone(MID_Str(param4_self.attr8_Text_Str, param4_self.attr8_Position, 1));
			__debugInfo = "152:\src\Utils\XMLReader.gbas";
		};
		__debugInfo = "154:\src\Utils\XMLReader.gbas";
		return "";
		__debugInfo = "153:\src\Utils\XMLReader.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
method9_type3_XML_7_Get_Str = window['method9_type3_XML_7_Get_Str'];
window['method9_type3_XML_15_SkipWhitespaces'] = function(param4_self) {
	stackPush("method: SkipWhitespaces", __debugInfo);
	try {
		__debugInfo = "159:\src\Utils\XMLReader.gbas";
		while (((((((param4_self.attr8_Position) < ((param4_self.attr8_Text_Str).length)) ? 1 : 0)) && ((((((((((((((param4_self).Get_Str()) === (" ")) ? 1 : 0)) || (((((param4_self).Get_Str()) === ("\n")) ? 1 : 0))) ? 1 : 0)) || (((((param4_self).Get_Str()) === (CHR_Str(13))) ? 1 : 0))) ? 1 : 0)) || (((((param4_self).Get_Str()) === ("\t")) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "158:\src\Utils\XMLReader.gbas";
			param4_self.attr8_Position+=1;
			__debugInfo = "158:\src\Utils\XMLReader.gbas";
		};
		__debugInfo = "160:\src\Utils\XMLReader.gbas";
		return 0;
		__debugInfo = "159:\src\Utils\XMLReader.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
method9_type3_XML_15_SkipWhitespaces = window['method9_type3_XML_15_SkipWhitespaces'];
window['method13_type7_TObject_12_ToString_Str'] = function(param4_self) {
	stackPush("method: ToString_Str", __debugInfo);
	try {
		__debugInfo = "177:\src\Utils\XMLReader.gbas";
		return "Object";
		__debugInfo = "178:\src\Utils\XMLReader.gbas";
		return "";
		__debugInfo = "177:\src\Utils\XMLReader.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
method13_type7_TObject_12_ToString_Str = window['method13_type7_TObject_12_ToString_Str'];
window['method13_type7_TObject_6_Equals'] = function(param3_Obj, param4_self) {
	stackPush("method: Equals", __debugInfo);
	try {
		__debugInfo = "184:\src\Utils\XMLReader.gbas";
		if ((((param3_Obj) === (param4_self)) ? 1 : 0)) {
			__debugInfo = "181:\src\Utils\XMLReader.gbas";
			return 1;
			__debugInfo = "181:\src\Utils\XMLReader.gbas";
		} else {
			__debugInfo = "183:\src\Utils\XMLReader.gbas";
			return tryClone(0);
			__debugInfo = "183:\src\Utils\XMLReader.gbas";
		};
		__debugInfo = "185:\src\Utils\XMLReader.gbas";
		return 0;
		__debugInfo = "184:\src\Utils\XMLReader.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
method13_type7_TObject_6_Equals = window['method13_type7_TObject_6_Equals'];
window['method13_type7_TObject_10_ToHashCode'] = function(param4_self) {
	stackPush("method: ToHashCode", __debugInfo);
	try {
		__debugInfo = "187:\src\Utils\XMLReader.gbas";
		return 0;
		__debugInfo = "188:\src\Utils\XMLReader.gbas";
		return 0;
		__debugInfo = "187:\src\Utils\XMLReader.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
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
	this.attr8_GetIdent = 0;
	this.attr15_HeaderFiles_Str = pool_array.alloc("");
	this.attr14_HeaderText_Str = "";
	this.vtbl = vtbl_type9_TCompiler;
	this.attr12_CurrentScope = -(1);
	this.attr14_ImportantScope = -(1);
	this.attr11_currentFunc = -(1);
	this.attr8_WasError = 0;
	this.attr7_HasGoto = 0;
	this.attr14_errorState_Str = "";
	this.attr11_LastTokenID = 0;
	this.attr8_GetIdent = 0;
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
	other.attr8_GetIdent = this.attr8_GetIdent;
	other.attr15_HeaderFiles_Str = tryClone(this.attr15_HeaderFiles_Str);
	other.attr14_HeaderText_Str = this.attr14_HeaderText_Str;
	other.vtbl = this.vtbl;
	other.pool = this.pool;
	return other;
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
window ['type15_TIdentifierVari'] = function() { this.reset(); }
window['type15_TIdentifierVari'].prototype.getTypeName = function() { return "type15_TIdentifierVari" };
	window['type15_TIdentifierVari'].prototype.reset = function() {
	this.attr8_Name_Str = "";
	this.attr8_datatype = pool_TDatatype.alloc();
	this.attr3_Typ = 0;
	this.attr2_ID = 0;
	this.attr6_PreDef = 0;
	this.attr3_ref = 0;
	this.attr9_OwnerVari = 0;
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
	other.attr8_datatype = tryClone(this.attr8_datatype);
	other.attr3_Typ = this.attr3_Typ;
	other.attr2_ID = this.attr2_ID;
	other.attr6_PreDef = this.attr6_PreDef;
	other.attr3_ref = this.attr3_ref;
	other.attr9_OwnerVari = this.attr9_OwnerVari;
	other.attr4_func = this.attr4_func;
	other.vtbl = this.vtbl;
	other.pool = this.pool;
	return other;
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
	other.attr9_Extending = this.attr9_Extending;
	other.attr10_Createable = this.attr10_Createable;
	other.attr8_IsNative = this.attr8_IsNative;
	other.vtbl = this.vtbl;
	other.pool = this.pool;
	return other;
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
var vtbl_type13_Documentation = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
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
var vtbl_type9_TTemplate = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
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
var const11_VERSION_Str = "1", const11_XMLNAME_Str = "WIN32", const12_FUNC_IS_FUNC = 1, const11_FUNC_IS_SUB = 2, const14_FUNC_IS_METHOD = 3, const13_FUNC_IS_PROTO = 4, const13_VARI_IS_LOCAL = 1, const14_VARI_IS_GLOBAL = 2, const12_VARI_IS_ATTR = 3, const14_VARI_IS_STATIC = 4, const13_VARI_IS_PARAM = 5, const13_VARI_IS_CONST = 6, const13_VARI_IS_ALIAS = 7, const11_SCOPE_IS_IF = 1, const13_SCOPE_IS_FUNC = 2, const13_SCOPE_IS_LOOP = 3, const13_SCOPE_IS_MAIN = 4, const12_SCOPE_IS_TRY = 5, const15_SCOPE_IS_SELECT = 6, const12_EXPR_VERSION = 1, const11_OP_IS_UNAER = 1, const12_OP_IS_BINAER = 2, const10_OP_IS_BOOL = 3, const8_MAX_PASS = 6, const16_EXPR_IS_OPERATOR = 1, const13_EXPR_IS_SCOPE = 2, const11_EXPR_IS_INT = 3, const13_EXPR_IS_FLOAT = 4, const11_EXPR_IS_STR = 5, const16_EXPR_IS_FUNCCALL = 6, const13_EXPR_IS_EMPTY = 7, const13_EXPR_IS_DEBUG = 8, const12_EXPR_IS_VARI = 9, const14_EXPR_IS_ASSIGN = 10, const11_EXPR_IS_DIM = 11, const13_EXPR_IS_REDIM = 12, const13_EXPR_IS_ARRAY = 13, const16_EXPR_IS_CAST2INT = 15, const18_EXPR_IS_CAST2FLOAT = 16, const19_EXPR_IS_CAST2STRING = 17, const14_EXPR_IS_ACCESS = 18, const14_EXPR_IS_RETURN = 19, const12_EXPR_IS_GOTO = 20, const13_EXPR_IS_LABEL = 21, const16_EXPR_IS_FUNCDATA = 22, const17_EXPR_IS_PROTOCALL = 23, const10_EXPR_IS_IF = 24, const13_EXPR_IS_WHILE = 25, const14_EXPR_IS_REPEAT = 26, const11_EXPR_IS_FOR = 27, const13_EXPR_IS_BREAK = 29, const16_EXPR_IS_CONTINUE = 30, const11_EXPR_IS_TRY = 31, const13_EXPR_IS_THROW = 32, const15_EXPR_IS_RESTORE = 33, const12_EXPR_IS_READ = 34, const14_EXPR_IS_DEFVAL = 35, const17_EXPR_IS_DIMASEXPR = 36, const13_EXPR_IS_ALIAS = 37, const15_EXPR_IS_FOREACH = 38, const11_EXPR_IS_INC = 39, const15_EXPR_IS_DIMPUSH = 40, const11_EXPR_IS_LEN = 41, const15_EXPR_IS_DIMDATA = 42, const14_EXPR_IS_DELETE = 43, const14_EXPR_IS_DIMDEL = 44, const13_EXPR_IS_BOUND = 45, const11_EXPR_IS_NOT = 46, const13_EXPR_IS_DUMMY = 47, const17_EXPR_IS_ADDRESSOF = 48, const14_EXPR_IS_ASSERT = 49, const19_EXPR_IS_DEBUGOUTPUT = 50, const11_EXPR_IS_IIF = 51, const15_EXPR_IS_REQUIRE = 52, const13_EXPR_IS_SUPER = 53, const16_EXPR_IS_CAST2OBJ = 54, const6_BL_EXT = 1, const7_BL_FILE = 2, const19_GL_DEPTH_BUFFER_BIT = 256, const21_GL_STENCIL_BUFFER_BIT = 1024, const19_GL_COLOR_BUFFER_BIT = 16384, const8_GL_FALSE = 0, const7_GL_TRUE = 1, const9_GL_POINTS = 0, const8_GL_LINES = 1, const12_GL_LINE_LOOP = 2, const13_GL_LINE_STRIP = 3, const12_GL_TRIANGLES = 4, const17_GL_TRIANGLE_STRIP = 5, const15_GL_TRIANGLE_FAN = 6, const7_GL_ZERO = 0, const6_GL_ONE = 1, const12_GL_SRC_COLOR = 768, const22_GL_ONE_MINUS_SRC_COLOR = 769, const12_GL_SRC_ALPHA = 770, const22_GL_ONE_MINUS_SRC_ALPHA = 771, const12_GL_DST_ALPHA = 772, const22_GL_ONE_MINUS_DST_ALPHA = 773, const12_GL_DST_COLOR = 774, const22_GL_ONE_MINUS_DST_COLOR = 775, const21_GL_SRC_ALPHA_SATURATE = 776, const11_GL_FUNC_ADD = 32774, const17_GL_BLEND_EQUATION = 32777, const21_GL_BLEND_EQUATION_RGB = 32777, const23_GL_BLEND_EQUATION_ALPHA = 34877, const16_GL_FUNC_SUBTRACT = 32778, const24_GL_FUNC_REVERSE_SUBTRACT = 32779, const16_GL_BLEND_DST_RGB = 32968, const16_GL_BLEND_SRC_RGB = 32969, const18_GL_BLEND_DST_ALPHA = 32970, const18_GL_BLEND_SRC_ALPHA = 32971, const17_GL_CONSTANT_COLOR = 32769, const27_GL_ONE_MINUS_CONSTANT_COLOR = 32770, const17_GL_CONSTANT_ALPHA = 32771, const27_GL_ONE_MINUS_CONSTANT_ALPHA = 32772, const14_GL_BLEND_COLOR = 32773, const15_GL_ARRAY_BUFFER = 34962, const23_GL_ELEMENT_ARRAY_BUFFER = 34963, const23_GL_ARRAY_BUFFER_BINDING = 34964, const31_GL_ELEMENT_ARRAY_BUFFER_BINDING = 34965, const14_GL_STREAM_DRAW = 35040, const14_GL_STATIC_DRAW = 35044, const15_GL_DYNAMIC_DRAW = 35048, const14_GL_BUFFER_SIZE = 34660, const15_GL_BUFFER_USAGE = 34661, const24_GL_CURRENT_VERTEX_ATTRIB = 34342, const8_GL_FRONT = 1028, const7_GL_BACK = 1029, const17_GL_FRONT_AND_BACK = 1032, const13_GL_TEXTURE_2D = 3553, const12_GL_CULL_FACE = 2884, const8_GL_BLEND = 3042, const9_GL_DITHER = 3024, const15_GL_STENCIL_TEST = 2960, const13_GL_DEPTH_TEST = 2929, const15_GL_SCISSOR_TEST = 3089, const22_GL_POLYGON_OFFSET_FILL = 32823, const27_GL_SAMPLE_ALPHA_TO_COVERAGE = 32926, const18_GL_SAMPLE_COVERAGE = 32928, const11_GL_NO_ERROR = 0, const15_GL_INVALID_ENUM = 1280, const16_GL_INVALID_VALUE = 1281, const20_GL_INVALID_OPERATION = 1282, const16_GL_OUT_OF_MEMORY = 1285, const5_GL_CW = 2304, const6_GL_CCW = 2305, const13_GL_LINE_WIDTH = 2849, const27_GL_ALIASED_POINT_SIZE_RANGE = 33901, const27_GL_ALIASED_LINE_WIDTH_RANGE = 33902, const17_GL_CULL_FACE_MODE = 2885, const13_GL_FRONT_FACE = 2886, const14_GL_DEPTH_RANGE = 2928, const18_GL_DEPTH_WRITEMASK = 2930, const20_GL_DEPTH_CLEAR_VALUE = 2931, const13_GL_DEPTH_FUNC = 2932, const22_GL_STENCIL_CLEAR_VALUE = 2961, const15_GL_STENCIL_FUNC = 2962, const15_GL_STENCIL_FAIL = 2964, const26_GL_STENCIL_PASS_DEPTH_FAIL = 2965, const26_GL_STENCIL_PASS_DEPTH_PASS = 2966, const14_GL_STENCIL_REF = 2967, const21_GL_STENCIL_VALUE_MASK = 2963, const20_GL_STENCIL_WRITEMASK = 2968, const20_GL_STENCIL_BACK_FUNC = 34816, const20_GL_STENCIL_BACK_FAIL = 34817, const31_GL_STENCIL_BACK_PASS_DEPTH_FAIL = 34818, const31_GL_STENCIL_BACK_PASS_DEPTH_PASS = 34819, const19_GL_STENCIL_BACK_REF = 36003, const26_GL_STENCIL_BACK_VALUE_MASK = 36004, const25_GL_STENCIL_BACK_WRITEMASK = 36005, const11_GL_VIEWPORT = 2978, const14_GL_SCISSOR_BOX = 3088, const20_GL_COLOR_CLEAR_VALUE = 3106, const18_GL_COLOR_WRITEMASK = 3107, const19_GL_UNPACK_ALIGNMENT = 3317, const17_GL_PACK_ALIGNMENT = 3333, const19_GL_MAX_TEXTURE_SIZE = 3379, const20_GL_MAX_VIEWPORT_DIMS = 3386, const16_GL_SUBPIXEL_BITS = 3408, const11_GL_RED_BITS = 3410, const13_GL_GREEN_BITS = 3411, const12_GL_BLUE_BITS = 3412, const13_GL_ALPHA_BITS = 3413, const13_GL_DEPTH_BITS = 3414, const15_GL_STENCIL_BITS = 3415, const23_GL_POLYGON_OFFSET_UNITS = 10752, const24_GL_POLYGON_OFFSET_FACTOR = 32824, const21_GL_TEXTURE_BINDING_2D = 32873, const17_GL_SAMPLE_BUFFERS = 32936, const10_GL_SAMPLES = 32937, const24_GL_SAMPLE_COVERAGE_VALUE = 32938, const25_GL_SAMPLE_COVERAGE_INVERT = 32939, const33_GL_NUM_COMPRESSED_TEXTURE_FORMATS = 34466, const29_GL_COMPRESSED_TEXTURE_FORMATS = 34467, const12_GL_DONT_CARE = 4352, const10_GL_FASTEST = 4353, const9_GL_NICEST = 4354, const23_GL_GENERATE_MIPMAP_HINT = 33170, const7_GL_BYTE = 5120, const16_GL_UNSIGNED_BYTE = 5121, const8_GL_SHORT = 5122, const17_GL_UNSIGNED_SHORT = 5123, const6_GL_INT = 5124, const15_GL_UNSIGNED_INT = 5125, const8_GL_FLOAT = 5126, const8_GL_FIXED = 5132, const18_GL_DEPTH_COMPONENT = 6402, const8_GL_ALPHA = 6406, const6_GL_RGB = 6407, const7_GL_RGBA = 6408, const12_GL_LUMINANCE = 6409, const18_GL_LUMINANCE_ALPHA = 6410, const25_GL_UNSIGNED_SHORT_4_4_4_4 = 32819, const25_GL_UNSIGNED_SHORT_5_5_5_1 = 32820, const23_GL_UNSIGNED_SHORT_5_6_5 = 33635, const18_GL_FRAGMENT_SHADER = 35632, const16_GL_VERTEX_SHADER = 35633, const21_GL_MAX_VERTEX_ATTRIBS = 34921, const29_GL_MAX_VERTEX_UNIFORM_VECTORS = 36347, const22_GL_MAX_VARYING_VECTORS = 36348, const35_GL_MAX_COMBINED_TEXTURE_IMAGE_UNITS = 35661, const33_GL_MAX_VERTEX_TEXTURE_IMAGE_UNITS = 35660, const26_GL_MAX_TEXTURE_IMAGE_UNITS = 34930, const31_GL_MAX_FRAGMENT_UNIFORM_VECTORS = 36349, const14_GL_SHADER_TYPE = 35663, const16_GL_DELETE_STATUS = 35712, const14_GL_LINK_STATUS = 35714, const18_GL_VALIDATE_STATUS = 35715, const19_GL_ATTACHED_SHADERS = 35717, const18_GL_ACTIVE_UNIFORMS = 35718, const28_GL_ACTIVE_UNIFORM_MAX_LENGTH = 35719, const20_GL_ACTIVE_ATTRIBUTES = 35721, const30_GL_ACTIVE_ATTRIBUTE_MAX_LENGTH = 35722, const27_GL_SHADING_LANGUAGE_VERSION = 35724, const18_GL_CURRENT_PROGRAM = 35725, const8_GL_NEVER = 512, const7_GL_LESS = 513, const8_GL_EQUAL = 514, const9_GL_LEQUAL = 515, const10_GL_GREATER = 516, const11_GL_NOTEQUAL = 517, const9_GL_GEQUAL = 518, const9_GL_ALWAYS = 519, const7_GL_KEEP = 7680, const10_GL_REPLACE = 7681, const7_GL_INCR = 7682, const7_GL_DECR = 7683, const9_GL_INVERT = 5386, const12_GL_INCR_WRAP = 34055, const12_GL_DECR_WRAP = 34056, const9_GL_VENDOR = 7936, const11_GL_RENDERER = 7937, const10_GL_VERSION = 7938, const13_GL_EXTENSIONS = 7939, const10_GL_NEAREST = 9728, const9_GL_LINEAR = 9729, const25_GL_NEAREST_MIPMAP_NEAREST = 9984, const24_GL_LINEAR_MIPMAP_NEAREST = 9985, const24_GL_NEAREST_MIPMAP_LINEAR = 9986, const23_GL_LINEAR_MIPMAP_LINEAR = 9987, const21_GL_TEXTURE_MAG_FILTER = 10240, const21_GL_TEXTURE_MIN_FILTER = 10241, const17_GL_TEXTURE_WRAP_S = 10242, const17_GL_TEXTURE_WRAP_T = 10243, const10_GL_TEXTURE = 5890, const19_GL_TEXTURE_CUBE_MAP = 34067, const27_GL_TEXTURE_BINDING_CUBE_MAP = 34068, const30_GL_TEXTURE_CUBE_MAP_POSITIVE_X = 34069, const30_GL_TEXTURE_CUBE_MAP_NEGATIVE_X = 34070, const30_GL_TEXTURE_CUBE_MAP_POSITIVE_Y = 34071, const30_GL_TEXTURE_CUBE_MAP_NEGATIVE_Y = 34072, const30_GL_TEXTURE_CUBE_MAP_POSITIVE_Z = 34073, const30_GL_TEXTURE_CUBE_MAP_NEGATIVE_Z = 34074, const28_GL_MAX_CUBE_MAP_TEXTURE_SIZE = 34076, const11_GL_TEXTURE0 = 33984, const11_GL_TEXTURE1 = 33985, const11_GL_TEXTURE2 = 33986, const11_GL_TEXTURE3 = 33987, const11_GL_TEXTURE4 = 33988, const11_GL_TEXTURE5 = 33989, const11_GL_TEXTURE6 = 33990, const11_GL_TEXTURE7 = 33991, const11_GL_TEXTURE8 = 33992, const11_GL_TEXTURE9 = 33993, const12_GL_TEXTURE10 = 33994, const12_GL_TEXTURE11 = 33995, const12_GL_TEXTURE12 = 33996, const12_GL_TEXTURE13 = 33997, const12_GL_TEXTURE14 = 33998, const12_GL_TEXTURE15 = 33999, const12_GL_TEXTURE16 = 34000, const12_GL_TEXTURE17 = 34001, const12_GL_TEXTURE18 = 34002, const12_GL_TEXTURE19 = 34003, const12_GL_TEXTURE20 = 34004, const12_GL_TEXTURE21 = 34005, const12_GL_TEXTURE22 = 34006, const12_GL_TEXTURE23 = 34007, const12_GL_TEXTURE24 = 34008, const12_GL_TEXTURE25 = 34009, const12_GL_TEXTURE26 = 34010, const12_GL_TEXTURE27 = 34011, const12_GL_TEXTURE28 = 34012, const12_GL_TEXTURE29 = 34013, const12_GL_TEXTURE30 = 34014, const12_GL_TEXTURE31 = 34015, const17_GL_ACTIVE_TEXTURE = 34016, const9_GL_REPEAT = 10497, const16_GL_CLAMP_TO_EDGE = 33071, const18_GL_MIRRORED_REPEAT = 33648, const13_GL_FLOAT_VEC2 = 35664, const13_GL_FLOAT_VEC3 = 35665, const13_GL_FLOAT_VEC4 = 35666, const11_GL_INT_VEC2 = 35667, const11_GL_INT_VEC3 = 35668, const11_GL_INT_VEC4 = 35669, const7_GL_BOOL = 35670, const12_GL_BOOL_VEC2 = 35671, const12_GL_BOOL_VEC3 = 35672, const12_GL_BOOL_VEC4 = 35673, const13_GL_FLOAT_MAT2 = 35674, const13_GL_FLOAT_MAT3 = 35675, const13_GL_FLOAT_MAT4 = 35676, const13_GL_SAMPLER_2D = 35678, const15_GL_SAMPLER_CUBE = 35680, const30_GL_VERTEX_ATTRIB_ARRAY_ENABLED = 34338, const27_GL_VERTEX_ATTRIB_ARRAY_SIZE = 34339, const29_GL_VERTEX_ATTRIB_ARRAY_STRIDE = 34340, const27_GL_VERTEX_ATTRIB_ARRAY_TYPE = 34341, const33_GL_VERTEX_ATTRIB_ARRAY_NORMALIZED = 34922, const30_GL_VERTEX_ATTRIB_ARRAY_POINTER = 34373, const37_GL_VERTEX_ATTRIB_ARRAY_BUFFER_BINDING = 34975, const33_GL_IMPLEMENTATION_COLOR_READ_TYPE = 35738, const35_GL_IMPLEMENTATION_COLOR_READ_FORMAT = 35739, const17_GL_COMPILE_STATUS = 35713, const18_GL_INFO_LOG_LENGTH = 35716, const23_GL_SHADER_SOURCE_LENGTH = 35720, const18_GL_SHADER_COMPILER = 36346, const24_GL_SHADER_BINARY_FORMATS = 36344, const28_GL_NUM_SHADER_BINARY_FORMATS = 36345, const12_GL_LOW_FLOAT = 36336, const15_GL_MEDIUM_FLOAT = 36337, const13_GL_HIGH_FLOAT = 36338, const10_GL_LOW_INT = 36339, const13_GL_MEDIUM_INT = 36340, const11_GL_HIGH_INT = 36341, const14_GL_FRAMEBUFFER = 36160, const15_GL_RENDERBUFFER = 36161, const8_GL_RGBA4 = 32854, const10_GL_RGB5_A1 = 32855, const9_GL_RGB565 = 36194, const20_GL_DEPTH_COMPONENT16 = 33189, const16_GL_STENCIL_INDEX = 6401, const17_GL_STENCIL_INDEX8 = 36168, const21_GL_RENDERBUFFER_WIDTH = 36162, const22_GL_RENDERBUFFER_HEIGHT = 36163, const31_GL_RENDERBUFFER_INTERNAL_FORMAT = 36164, const24_GL_RENDERBUFFER_RED_SIZE = 36176, const26_GL_RENDERBUFFER_GREEN_SIZE = 36177, const25_GL_RENDERBUFFER_BLUE_SIZE = 36178, const26_GL_RENDERBUFFER_ALPHA_SIZE = 36179, const26_GL_RENDERBUFFER_DEPTH_SIZE = 36180, const28_GL_RENDERBUFFER_STENCIL_SIZE = 36181, const37_GL_FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE = 36048, const37_GL_FRAMEBUFFER_ATTACHMENT_OBJECT_NAME = 36049, const39_GL_FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL = 36050, const47_GL_FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE = 36051, const20_GL_COLOR_ATTACHMENT0 = 36064, const19_GL_DEPTH_ATTACHMENT = 36096, const21_GL_STENCIL_ATTACHMENT = 36128, const7_GL_NONE = 0, const23_GL_FRAMEBUFFER_COMPLETE = 36053, const36_GL_FRAMEBUFFER_INCOMPLETE_ATTACHMENT = 36054, const44_GL_FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT = 36055, const36_GL_FRAMEBUFFER_INCOMPLETE_DIMENSIONS = 36057, const26_GL_FRAMEBUFFER_UNSUPPORTED = 36061, const22_GL_FRAMEBUFFER_BINDING = 36006, const23_GL_RENDERBUFFER_BINDING = 36007, const24_GL_MAX_RENDERBUFFER_SIZE = 34024, const32_GL_INVALID_FRAMEBUFFER_OPERATION = 1286, global10_LastExprID = 0.0, global5_Exprs_ref = [pool_array.alloc([pool_TExpr.alloc()])], global8_LastType = pool_TIdentifierType.alloc(), global12_voidDatatype = pool_TDatatype.alloc(), global11_intDatatype = pool_TDatatype.alloc(), global13_floatDatatype = pool_TDatatype.alloc(), global11_strDatatype = pool_TDatatype.alloc(), global9_Operators_ref = [pool_array.alloc([pool_TOperator.alloc()])], global10_KeywordMap = pool_HashMap.alloc(), global8_Compiler = pool_TCompiler.alloc(), global7_Defines = pool_array.alloc(pool_TDefine.alloc()), global10_LastDefine = pool_TDefine.alloc(), global10_Generators = pool_array.alloc(pool_TGenerator.alloc()), global13_SettingIn_Str = "", global11_SHLASHF_Str = "", MaxPasses = 0, global14_Documentations = pool_array.alloc(pool_Documentation.alloc()), global9_GFX_WIDTH = 0.0, global10_GFX_HEIGHT = 0.0, global10_FULLSCREEN = 0, global9_FRAMERATE = 0, global11_APPNAME_Str = "", global9_DEBUGMODE = 0, global7_CONSOLE = 0.0, global6_STRICT = 0.0, global15_USRDEF_VERS_Str = "", global14_GbapOutput_Str = "", global12_GbapPath_Str = "", global12_GbapName_Str = "", global6_Ignore = 0, global13_OptimizeLevel = 0, global12_CurrentScope = 0, global14_ForEachCounter = 0, global11_CurrentFunc = 0, global12_LabelDef_Str = "", global8_IsInGoto = 0, global11_LoopBreakID = 0, global14_LoopContinueID = 0, global11_LastDummyID = 0, global14_StaticText_Str = "", global13_VariUndef_Str = "", global6_Indent = 0, global9_Templates = pool_array.alloc(pool_TTemplate.alloc()), global9_Libraries = pool_array.alloc(pool_TLibrary.alloc()), global10_Blacklists = pool_array.alloc(pool_TBlackList.alloc()), global7_Actions = pool_array.alloc(pool_TAction.alloc()), global8_Mode_Str = "", global10_Target_Str = "", global13_SettingIn_Str = "", global9_Templates = pool_array.alloc(pool_TTemplate.alloc()), global8_Lang_Str = "", global22_DirectoryStructure_Str = "", global5_NoRun = 0, global10_SaveHeader = 0, global24_PATHFINDING_AFP_mapmax_x = 0.0, global24_PATHFINDING_AFP_mapmax_y = 0.0, global20_PATHFINDING_AFP_dirx = pool_array.alloc(0), global20_PATHFINDING_AFP_diry = pool_array.alloc(0), global8_AFP_dirz = pool_array.alloc(0), global13_AFP_heuristic = pool_array.alloc(0), global6_Objs3D = pool_array.alloc(pool_TObj3D.alloc());
// set default statics:
window['initStatics'] = function() {
	static12_Factor_DIMASEXPRErr = 0;
static12_Keyword_SelectHelper = 0.0, static7_Keyword_GOTOErr = 0;

}
initStatics = window['initStatics'];
for (var __init = 0; __init < preInitFuncs.length; __init++) preInitFuncs[__init]();
