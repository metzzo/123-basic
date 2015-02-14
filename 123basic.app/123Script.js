if (typeof preInitFuncs == 'undefined') preInitFuncs = [];
preInitFuncs.push(function() {
	if (viewMode == 'console' && (typeof inEditorPreview == 'undefined')) {
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

if (!window.localStorage) {
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
		var typ = typeof defval
		var obj = array_pools[typ];
		if (obj !== undefined) {
			array_pools[typ] = obj.succ;
			obj.succ = null;
		} else {
			obj = new OTTArray(defval);
		}
		return obj;
	},
	free: function(obj) {
		if (obj.succ !== null || obj.constructor === Array) return;
		var typ = typeof obj.defval;
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
	if (viewMode == '2d' || (typeof inEditorPreview != 'undefined')) {
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
var loopFunc 	= null; //Aktueller LOOP
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
		var local1_G_1787 = pool_TGenerator.alloc();
		__debugInfo = "35:\123basic.gbas";
		DIM(global10_Generators, [0], pool_TGenerator.alloc());
		__debugInfo = "38:\123basic.gbas";
		local1_G_1787.attr8_Name_Str = "JS";
		__debugInfo = "39:\123basic.gbas";
		local1_G_1787.attr8_genProto = func16_JS_Generator_Str;
		__debugInfo = "40:\123basic.gbas";
		DIMPUSH(global10_Generators, local1_G_1787);
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
		__debugInfo = "35:\123basic.gbas";pool_TGenerator.free(local1_G_1787);
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
		var local10_Result_Str_1789 = "", local11_tmpCompiler_1790 = pool_TCompiler.alloc();
		__debugInfo = "174:\123basic.gbas";
		local10_Result_Str_1789 = "";
		__debugInfo = "177:\123basic.gbas";
		local11_tmpCompiler_1790 = global8_Compiler.clone(/* In Assign */);
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
		global8_Compiler = local11_tmpCompiler_1790.clone(/* In Assign */);
		__debugInfo = "191:\123basic.gbas";
		return tryClone(local10_Result_Str_1789);
		__debugInfo = "192:\123basic.gbas";
		return "";
		__debugInfo = "174:\123basic.gbas";pool_TCompiler.free(local11_tmpCompiler_1790);
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
		var local6_CurTyp_1796 = 0;
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
						var local16___SelectHelper1__1791 = "";
						__debugInfo = "15:\src\CompilerPasses\Analyser.gbas";
						local16___SelectHelper1__1791 = func14_GetCurrent_Str();
						__debugInfo = "59:\src\CompilerPasses\Analyser.gbas";
						if ((((local16___SelectHelper1__1791) === ("TYPE")) ? 1 : 0)) {
							var local3_typ_ref_1792 = [pool_TIdentifierType.alloc()];
							__debugInfo = "17:\src\CompilerPasses\Analyser.gbas";
							func5_Match("TYPE", 16, "src\CompilerPasses\Analyser.gbas");
							__debugInfo = "19:\src\CompilerPasses\Analyser.gbas";
							local3_typ_ref_1792[0].attr8_Name_Str = func14_GetCurrent_Str();
							__debugInfo = "20:\src\CompilerPasses\Analyser.gbas";
							local3_typ_ref_1792[0].attr12_RealName_Str = local3_typ_ref_1792[0].attr8_Name_Str;
							__debugInfo = "21:\src\CompilerPasses\Analyser.gbas";
							local3_typ_ref_1792[0].attr2_ID = BOUNDS(global8_Compiler.attr5_Types_ref[0], 0);
							__debugInfo = "22:\src\CompilerPasses\Analyser.gbas";
							DIMPUSH(global8_Compiler.attr5_Types_ref[0], local3_typ_ref_1792);
							__debugInfo = "24:\src\CompilerPasses\Analyser.gbas";
							func7_GetNext();
							__debugInfo = "17:\src\CompilerPasses\Analyser.gbas";pool_TIdentifierType.free(local3_typ_ref_1792);
						} else if ((((local16___SelectHelper1__1791) === ("PROTOTYPE")) ? 1 : 0)) {
							var local4_func_1793 = pool_TIdentifierFunc.alloc();
							__debugInfo = "26:\src\CompilerPasses\Analyser.gbas";
							func5_Match("PROTOTYPE", 25, "src\CompilerPasses\Analyser.gbas");
							__debugInfo = "28:\src\CompilerPasses\Analyser.gbas";
							local4_func_1793.attr8_Name_Str = func14_GetCurrent_Str();
							__debugInfo = "29:\src\CompilerPasses\Analyser.gbas";
							local4_func_1793.attr3_Typ = ~~(4);
							__debugInfo = "30:\src\CompilerPasses\Analyser.gbas";
							func11_AddFunction(local4_func_1793);
							__debugInfo = "32:\src\CompilerPasses\Analyser.gbas";
							func7_GetNext();
							__debugInfo = "26:\src\CompilerPasses\Analyser.gbas";pool_TIdentifierFunc.free(local4_func_1793);
						} else if ((((local16___SelectHelper1__1791) === ("CONSTANT")) ? 1 : 0)) {
							__debugInfo = "55:\src\CompilerPasses\Analyser.gbas";
							do {
								var local4_Vari_1794 = pool_TIdentifierVari.alloc();
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
								local4_Vari_1794 = func7_VariDef(0).clone(/* In Assign */);
								__debugInfo = "52:\src\CompilerPasses\Analyser.gbas";
								local4_Vari_1794.attr3_Typ = ~~(6);
								__debugInfo = "53:\src\CompilerPasses\Analyser.gbas";
								func11_AddVariable(local4_Vari_1794, 0);
								__debugInfo = "54:\src\CompilerPasses\Analyser.gbas";
								DIMPUSH(global8_Compiler.attr7_Globals, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
								__debugInfo = "48:\src\CompilerPasses\Analyser.gbas";pool_TIdentifierVari.free(local4_Vari_1794);
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
		local6_CurTyp_1796 = -(1);
		__debugInfo = "67:\src\CompilerPasses\Analyser.gbas";
		func5_Start();
		__debugInfo = "148:\src\CompilerPasses\Analyser.gbas";
		while (func8_EOFParse()) {
			__debugInfo = "145:\src\CompilerPasses\Analyser.gbas";
			{
				var Err_Str = "";
				__debugInfo = "147:\src\CompilerPasses\Analyser.gbas";
				try {
					var local10_IsCallback_1797 = 0, local8_IsNative_1798 = 0, local10_IsAbstract_1799 = 0;
					__debugInfo = "70:\src\CompilerPasses\Analyser.gbas";
					local10_IsCallback_1797 = 0;
					__debugInfo = "70:\src\CompilerPasses\Analyser.gbas";
					local8_IsNative_1798 = 0;
					__debugInfo = "71:\src\CompilerPasses\Analyser.gbas";
					local10_IsAbstract_1799 = 0;
					__debugInfo = "76:\src\CompilerPasses\Analyser.gbas";
					if (func7_IsToken("CALLBACK")) {
						__debugInfo = "73:\src\CompilerPasses\Analyser.gbas";
						func5_Match("CALLBACK", 72, "src\CompilerPasses\Analyser.gbas");
						__debugInfo = "74:\src\CompilerPasses\Analyser.gbas";
						local10_IsCallback_1797 = 1;
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
						local8_IsNative_1798 = 1;
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
						local10_IsAbstract_1799 = 1;
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
						var local16___SelectHelper2__1800 = "";
						__debugInfo = "88:\src\CompilerPasses\Analyser.gbas";
						local16___SelectHelper2__1800 = func14_GetCurrent_Str();
						__debugInfo = "141:\src\CompilerPasses\Analyser.gbas";
						if ((((local16___SelectHelper2__1800) === ("PROTOTYPE")) ? 1 : 0)) {
							var local3_var_1801 = pool_TIdentifierVari.alloc(), local5_Found_1802 = 0;
							__debugInfo = "90:\src\CompilerPasses\Analyser.gbas";
							func5_Match("PROTOTYPE", 89, "src\CompilerPasses\Analyser.gbas");
							__debugInfo = "92:\src\CompilerPasses\Analyser.gbas";
							local3_var_1801 = func7_VariDef(0).clone(/* In Assign */);
							__debugInfo = "93:\src\CompilerPasses\Analyser.gbas";
							local5_Found_1802 = 0;
							__debugInfo = "100:\src\CompilerPasses\Analyser.gbas";
							var forEachSaver2415 = global8_Compiler.attr5_Funcs_ref[0];
							for(var forEachCounter2415 = 0 ; forEachCounter2415 < forEachSaver2415.values.length ; forEachCounter2415++) {
								var local4_func_ref_1803 = forEachSaver2415.values[forEachCounter2415];
							{
									__debugInfo = "99:\src\CompilerPasses\Analyser.gbas";
									if ((((local4_func_ref_1803[0].attr8_Name_Str) === (local3_var_1801.attr8_Name_Str)) ? 1 : 0)) {
										__debugInfo = "96:\src\CompilerPasses\Analyser.gbas";
										local4_func_ref_1803[0].attr8_datatype = local3_var_1801.attr8_datatype.clone(/* In Assign */);
										__debugInfo = "97:\src\CompilerPasses\Analyser.gbas";
										local5_Found_1802 = 1;
										__debugInfo = "98:\src\CompilerPasses\Analyser.gbas";
										break;
										__debugInfo = "96:\src\CompilerPasses\Analyser.gbas";
									};
									__debugInfo = "99:\src\CompilerPasses\Analyser.gbas";
								}
								forEachSaver2415.values[forEachCounter2415] = local4_func_ref_1803;
							
							};
							__debugInfo = "101:\src\CompilerPasses\Analyser.gbas";
							if ((((local5_Found_1802) === (0)) ? 1 : 0)) {
								__debugInfo = "101:\src\CompilerPasses\Analyser.gbas";
								func5_Error((("Internal error (prototype not found: ") + (local3_var_1801.attr8_Name_Str)), 100, "src\CompilerPasses\Analyser.gbas");
								__debugInfo = "101:\src\CompilerPasses\Analyser.gbas";
							};
							__debugInfo = "102:\src\CompilerPasses\Analyser.gbas";
							if ((((local6_CurTyp_1796) !== (-(1))) ? 1 : 0)) {
								__debugInfo = "102:\src\CompilerPasses\Analyser.gbas";
								func5_Error("PROTOTYPE definition not in Type allowed.", 101, "src\CompilerPasses\Analyser.gbas");
								__debugInfo = "102:\src\CompilerPasses\Analyser.gbas";
							};
							__debugInfo = "90:\src\CompilerPasses\Analyser.gbas";pool_TIdentifierVari.free(local3_var_1801);
						} else if ((((local16___SelectHelper2__1800) === ("FUNCTION")) ? 1 : 0)) {
							var local3_var_1804 = pool_TIdentifierVari.alloc(), local4_func_1805 = pool_TIdentifierFunc.alloc();
							__debugInfo = "104:\src\CompilerPasses\Analyser.gbas";
							func5_Match("FUNCTION", 103, "src\CompilerPasses\Analyser.gbas");
							__debugInfo = "106:\src\CompilerPasses\Analyser.gbas";
							local3_var_1804 = func7_VariDef(0).clone(/* In Assign */);
							__debugInfo = "109:\src\CompilerPasses\Analyser.gbas";
							local4_func_1805.attr8_Name_Str = local3_var_1804.attr8_Name_Str;
							__debugInfo = "110:\src\CompilerPasses\Analyser.gbas";
							local4_func_1805.attr8_datatype = local3_var_1804.attr8_datatype.clone(/* In Assign */);
							__debugInfo = "111:\src\CompilerPasses\Analyser.gbas";
							local4_func_1805.attr10_IsCallback = local10_IsCallback_1797;
							__debugInfo = "112:\src\CompilerPasses\Analyser.gbas";
							local4_func_1805.attr10_IsAbstract = local10_IsAbstract_1799;
							__debugInfo = "113:\src\CompilerPasses\Analyser.gbas";
							local4_func_1805.attr6_DefTok = global8_Compiler.attr11_currentPosi;
							__debugInfo = "121:\src\CompilerPasses\Analyser.gbas";
							if ((((local6_CurTyp_1796) !== (-(1))) ? 1 : 0)) {
								__debugInfo = "116:\src\CompilerPasses\Analyser.gbas";
								local4_func_1805.attr3_Typ = ~~(3);
								__debugInfo = "117:\src\CompilerPasses\Analyser.gbas";
								DIMPUSH(global8_Compiler.attr5_Types_ref[0].arrAccess(local6_CurTyp_1796).values[tmpPositionCache][0].attr7_Methods, BOUNDS(global8_Compiler.attr5_Funcs_ref[0], 0));
								__debugInfo = "118:\src\CompilerPasses\Analyser.gbas";
								local4_func_1805.attr6_MyType = local6_CurTyp_1796;
								__debugInfo = "116:\src\CompilerPasses\Analyser.gbas";
							} else {
								__debugInfo = "120:\src\CompilerPasses\Analyser.gbas";
								local4_func_1805.attr3_Typ = ~~(1);
								__debugInfo = "120:\src\CompilerPasses\Analyser.gbas";
							};
							__debugInfo = "123:\src\CompilerPasses\Analyser.gbas";
							func11_AddFunction(local4_func_1805);
							__debugInfo = "125:\src\CompilerPasses\Analyser.gbas";
							if (((((((local8_IsNative_1798) === (0)) ? 1 : 0)) && ((((local10_IsAbstract_1799) === (0)) ? 1 : 0))) ? 1 : 0)) {
								__debugInfo = "125:\src\CompilerPasses\Analyser.gbas";
								func10_SkipTokens("FUNCTION", "ENDFUNCTION", local4_func_1805.attr8_Name_Str);
								__debugInfo = "125:\src\CompilerPasses\Analyser.gbas";
							};
							__debugInfo = "104:\src\CompilerPasses\Analyser.gbas";pool_TIdentifierVari.free(local3_var_1804);pool_TIdentifierFunc.free(local4_func_1805);
						} else if ((((local16___SelectHelper2__1800) === ("SUB")) ? 1 : 0)) {
							var local4_func_1806 = pool_TIdentifierFunc.alloc();
							__debugInfo = "127:\src\CompilerPasses\Analyser.gbas";
							func5_Match("SUB", 126, "src\CompilerPasses\Analyser.gbas");
							__debugInfo = "129:\src\CompilerPasses\Analyser.gbas";
							local4_func_1806.attr8_Name_Str = func14_GetCurrent_Str();
							__debugInfo = "130:\src\CompilerPasses\Analyser.gbas";
							local4_func_1806.attr8_datatype = global12_voidDatatype.clone(/* In Assign */);
							__debugInfo = "131:\src\CompilerPasses\Analyser.gbas";
							local4_func_1806.attr3_Typ = ~~(2);
							__debugInfo = "132:\src\CompilerPasses\Analyser.gbas";
							local4_func_1806.attr6_DefTok = global8_Compiler.attr11_currentPosi;
							__debugInfo = "133:\src\CompilerPasses\Analyser.gbas";
							func11_AddFunction(local4_func_1806);
							__debugInfo = "134:\src\CompilerPasses\Analyser.gbas";
							func10_SkipTokens("SUB", "ENDSUB", local4_func_1806.attr8_Name_Str);
							__debugInfo = "127:\src\CompilerPasses\Analyser.gbas";pool_TIdentifierFunc.free(local4_func_1806);
						} else if ((((local16___SelectHelper2__1800) === ("TYPE")) ? 1 : 0)) {
							__debugInfo = "136:\src\CompilerPasses\Analyser.gbas";
							func5_Match("TYPE", 135, "src\CompilerPasses\Analyser.gbas");
							__debugInfo = "137:\src\CompilerPasses\Analyser.gbas";
							if ((((func6_IsType("")) === (0)) ? 1 : 0)) {
								__debugInfo = "137:\src\CompilerPasses\Analyser.gbas";
								func5_Error((((("Internal error (unrecognized type: ") + (func14_GetCurrent_Str()))) + (")")), 136, "src\CompilerPasses\Analyser.gbas");
								__debugInfo = "137:\src\CompilerPasses\Analyser.gbas";
							};
							__debugInfo = "138:\src\CompilerPasses\Analyser.gbas";
							local6_CurTyp_1796 = global8_LastType.attr2_ID;
							__debugInfo = "136:\src\CompilerPasses\Analyser.gbas";
						} else if ((((local16___SelectHelper2__1800) === ("ENDTYPE")) ? 1 : 0)) {
							__debugInfo = "140:\src\CompilerPasses\Analyser.gbas";
							local6_CurTyp_1796 = -(1);
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
		if ((((local6_CurTyp_1796) !== (-(1))) ? 1 : 0)) {
			__debugInfo = "150:\src\CompilerPasses\Analyser.gbas";
			func5_Error((((("Type '") + (global8_Compiler.attr5_Types_ref[0].arrAccess(local6_CurTyp_1796).values[tmpPositionCache][0].attr8_Name_Str))) + (" not closed with 'ENDTYPE'")), 149, "src\CompilerPasses\Analyser.gbas");
			__debugInfo = "150:\src\CompilerPasses\Analyser.gbas";
		};
		__debugInfo = "151:\src\CompilerPasses\Analyser.gbas";
		local6_CurTyp_1796 = -(1);
		__debugInfo = "168:\src\CompilerPasses\Analyser.gbas";
		var forEachSaver2712 = global8_Compiler.attr5_Funcs_ref[0];
		for(var forEachCounter2712 = 0 ; forEachCounter2712 < forEachSaver2712.values.length ; forEachCounter2712++) {
			var local1_F_ref_1808 = forEachSaver2712.values[forEachCounter2712];
		{
				__debugInfo = "167:\src\CompilerPasses\Analyser.gbas";
				if (local1_F_ref_1808[0].attr10_IsCallback) {
					var local12_alreadyExist_1809 = 0;
					__debugInfo = "156:\src\CompilerPasses\Analyser.gbas";
					local12_alreadyExist_1809 = 0;
					__debugInfo = "162:\src\CompilerPasses\Analyser.gbas";
					var forEachSaver2697 = global8_Compiler.attr5_Funcs_ref[0];
					for(var forEachCounter2697 = 0 ; forEachCounter2697 < forEachSaver2697.values.length ; forEachCounter2697++) {
						var local2_F2_ref_1810 = forEachSaver2697.values[forEachCounter2697];
					{
							__debugInfo = "161:\src\CompilerPasses\Analyser.gbas";
							if (((((((local2_F2_ref_1810[0].attr8_Name_Str) === (local1_F_ref_1808[0].attr8_Name_Str)) ? 1 : 0)) && ((((local2_F2_ref_1810[0].attr10_IsCallback) === (0)) ? 1 : 0))) ? 1 : 0)) {
								__debugInfo = "159:\src\CompilerPasses\Analyser.gbas";
								local12_alreadyExist_1809 = 1;
								__debugInfo = "160:\src\CompilerPasses\Analyser.gbas";
								break;
								__debugInfo = "159:\src\CompilerPasses\Analyser.gbas";
							};
							__debugInfo = "161:\src\CompilerPasses\Analyser.gbas";
						}
						forEachSaver2697.values[forEachCounter2697] = local2_F2_ref_1810;
					
					};
					__debugInfo = "166:\src\CompilerPasses\Analyser.gbas";
					if (local12_alreadyExist_1809) {
						__debugInfo = "165:\src\CompilerPasses\Analyser.gbas";
						local1_F_ref_1808[0].attr8_Name_Str = (("Overwritten Callback method (screw them!): ") + (local1_F_ref_1808[0].attr8_Name_Str));
						__debugInfo = "165:\src\CompilerPasses\Analyser.gbas";
					};
					__debugInfo = "156:\src\CompilerPasses\Analyser.gbas";
				};
				__debugInfo = "167:\src\CompilerPasses\Analyser.gbas";
			}
			forEachSaver2712.values[forEachCounter2712] = local1_F_ref_1808;
		
		};
		__debugInfo = "175:\src\CompilerPasses\Analyser.gbas";
		var forEachSaver2751 = global8_Compiler.attr5_Funcs_ref[0];
		for(var forEachCounter2751 = 0 ; forEachCounter2751 < forEachSaver2751.values.length ; forEachCounter2751++) {
			var local1_F_ref_1811 = forEachSaver2751.values[forEachCounter2751];
		{
				__debugInfo = "174:\src\CompilerPasses\Analyser.gbas";
				if ((((((((((local1_F_ref_1811[0].attr3_Typ) !== (3)) ? 1 : 0)) && ((((local1_F_ref_1811[0].attr3_Typ) !== (2)) ? 1 : 0))) ? 1 : 0)) && (((local1_F_ref_1811[0].attr10_IsCallback) ? 0 : 1))) ? 1 : 0)) {
					__debugInfo = "173:\src\CompilerPasses\Analyser.gbas";
					(global8_Compiler.attr11_GlobalFuncs).Put(local1_F_ref_1811[0].attr8_Name_Str, local1_F_ref_1811[0].attr2_ID);
					__debugInfo = "173:\src\CompilerPasses\Analyser.gbas";
				};
				__debugInfo = "174:\src\CompilerPasses\Analyser.gbas";
			}
			forEachSaver2751.values[forEachCounter2751] = local1_F_ref_1811;
		
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
						var local16___SelectHelper3__1812 = "";
						__debugInfo = "192:\src\CompilerPasses\Analyser.gbas";
						local16___SelectHelper3__1812 = func14_GetCurrent_Str();
						__debugInfo = "206:\src\CompilerPasses\Analyser.gbas";
						if ((((local16___SelectHelper3__1812) === ("GLOBAL")) ? 1 : 0)) {
							__debugInfo = "205:\src\CompilerPasses\Analyser.gbas";
							do {
								var local4_Vari_1813 = pool_TIdentifierVari.alloc();
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
								local4_Vari_1813 = func7_VariDef(0).clone(/* In Assign */);
								__debugInfo = "202:\src\CompilerPasses\Analyser.gbas";
								local4_Vari_1813.attr3_Typ = ~~(2);
								__debugInfo = "203:\src\CompilerPasses\Analyser.gbas";
								func11_AddVariable(local4_Vari_1813, 1);
								__debugInfo = "204:\src\CompilerPasses\Analyser.gbas";
								DIMPUSH(global8_Compiler.attr7_Globals, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
								__debugInfo = "199:\src\CompilerPasses\Analyser.gbas";pool_TIdentifierVari.free(local4_Vari_1813);
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
						var local16___SelectHelper4__1815 = "";
						__debugInfo = "218:\src\CompilerPasses\Analyser.gbas";
						local16___SelectHelper4__1815 = func14_GetCurrent_Str();
						__debugInfo = "221:\src\CompilerPasses\Analyser.gbas";
						if ((((local16___SelectHelper4__1815) === ("TYPE")) ? 1 : 0)) {
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
		local6_CurTyp_1796 = -(1);
		__debugInfo = "233:\src\CompilerPasses\Analyser.gbas";
		var forEachSaver2852 = global8_Compiler.attr5_Types_ref[0];
		for(var forEachCounter2852 = 0 ; forEachCounter2852 < forEachSaver2852.values.length ; forEachCounter2852++) {
			var local3_typ_ref_1817 = forEachSaver2852.values[forEachCounter2852];
		{
				__debugInfo = "232:\src\CompilerPasses\Analyser.gbas";
				func10_ExtendType(unref(local3_typ_ref_1817[0]));
				__debugInfo = "232:\src\CompilerPasses\Analyser.gbas";
			}
			forEachSaver2852.values[forEachCounter2852] = local3_typ_ref_1817;
		
		};
		__debugInfo = "238:\src\CompilerPasses\Analyser.gbas";
		var forEachSaver2865 = global8_Compiler.attr5_Types_ref[0];
		for(var forEachCounter2865 = 0 ; forEachCounter2865 < forEachSaver2865.values.length ; forEachCounter2865++) {
			var local3_typ_ref_1818 = forEachSaver2865.values[forEachCounter2865];
		{
				__debugInfo = "237:\src\CompilerPasses\Analyser.gbas";
				func11_CheckCyclic(local3_typ_ref_1818[0].attr8_Name_Str, unref(local3_typ_ref_1818[0]));
				__debugInfo = "237:\src\CompilerPasses\Analyser.gbas";
			}
			forEachSaver2865.values[forEachCounter2865] = local3_typ_ref_1818;
		
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
					var local8_isNative_1819 = 0, local10_isCallBack_1820 = 0;
					__debugInfo = "244:\src\CompilerPasses\Analyser.gbas";
					local8_isNative_1819 = 0;
					__debugInfo = "245:\src\CompilerPasses\Analyser.gbas";
					local10_isCallBack_1820 = 0;
					__debugInfo = "246:\src\CompilerPasses\Analyser.gbas";
					{
						var local16___SelectHelper5__1821 = "";
						__debugInfo = "246:\src\CompilerPasses\Analyser.gbas";
						local16___SelectHelper5__1821 = func14_GetCurrent_Str();
						__debugInfo = "255:\src\CompilerPasses\Analyser.gbas";
						if ((((local16___SelectHelper5__1821) === ("NATIVE")) ? 1 : 0)) {
							__debugInfo = "248:\src\CompilerPasses\Analyser.gbas";
							local8_isNative_1819 = 1;
							__debugInfo = "249:\src\CompilerPasses\Analyser.gbas";
							func7_GetNext();
							__debugInfo = "248:\src\CompilerPasses\Analyser.gbas";
						} else if ((((local16___SelectHelper5__1821) === ("CALLBACK")) ? 1 : 0)) {
							__debugInfo = "251:\src\CompilerPasses\Analyser.gbas";
							local10_isCallBack_1820 = 1;
							__debugInfo = "252:\src\CompilerPasses\Analyser.gbas";
							func7_GetNext();
							__debugInfo = "251:\src\CompilerPasses\Analyser.gbas";
						} else if ((((local16___SelectHelper5__1821) === ("ABSTRACT")) ? 1 : 0)) {
							__debugInfo = "254:\src\CompilerPasses\Analyser.gbas";
							func7_GetNext();
							__debugInfo = "254:\src\CompilerPasses\Analyser.gbas";
						};
						__debugInfo = "246:\src\CompilerPasses\Analyser.gbas";
					};
					__debugInfo = "257:\src\CompilerPasses\Analyser.gbas";
					{
						var local16___SelectHelper6__1822 = "";
						__debugInfo = "257:\src\CompilerPasses\Analyser.gbas";
						local16___SelectHelper6__1822 = func14_GetCurrent_Str();
						__debugInfo = "310:\src\CompilerPasses\Analyser.gbas";
						if ((((local16___SelectHelper6__1822) === ("FUNCTION")) ? 1 : 0)) {
							var local3_Typ_1823 = 0.0;
							__debugInfo = "264:\src\CompilerPasses\Analyser.gbas";
							if ((((local6_CurTyp_1796) === (-(1))) ? 1 : 0)) {
								__debugInfo = "261:\src\CompilerPasses\Analyser.gbas";
								local3_Typ_1823 = 1;
								__debugInfo = "261:\src\CompilerPasses\Analyser.gbas";
							} else {
								__debugInfo = "263:\src\CompilerPasses\Analyser.gbas";
								local3_Typ_1823 = 3;
								__debugInfo = "263:\src\CompilerPasses\Analyser.gbas";
							};
							__debugInfo = "265:\src\CompilerPasses\Analyser.gbas";
							func7_FuncDef(local8_isNative_1819, local10_isCallBack_1820, ~~(local3_Typ_1823), local6_CurTyp_1796);
							__debugInfo = "264:\src\CompilerPasses\Analyser.gbas";
						} else if ((((local16___SelectHelper6__1822) === ("PROTOTYPE")) ? 1 : 0)) {
							__debugInfo = "267:\src\CompilerPasses\Analyser.gbas";
							func7_FuncDef(0, 0, ~~(4), -(1));
							__debugInfo = "267:\src\CompilerPasses\Analyser.gbas";
						} else if ((((local16___SelectHelper6__1822) === ("SUB")) ? 1 : 0)) {
							__debugInfo = "269:\src\CompilerPasses\Analyser.gbas";
							func6_SubDef();
							__debugInfo = "269:\src\CompilerPasses\Analyser.gbas";
						} else if ((((local16___SelectHelper6__1822) === ("TYPE")) ? 1 : 0)) {
							__debugInfo = "271:\src\CompilerPasses\Analyser.gbas";
							func5_Match("TYPE", 270, "src\CompilerPasses\Analyser.gbas");
							__debugInfo = "272:\src\CompilerPasses\Analyser.gbas";
							if ((((func6_IsType("")) === (0)) ? 1 : 0)) {
								__debugInfo = "272:\src\CompilerPasses\Analyser.gbas";
								func5_Error((((("Internal error (unrecognized type: ") + (func14_GetCurrent_Str()))) + (")")), 271, "src\CompilerPasses\Analyser.gbas");
								__debugInfo = "272:\src\CompilerPasses\Analyser.gbas";
							};
							__debugInfo = "273:\src\CompilerPasses\Analyser.gbas";
							local6_CurTyp_1796 = global8_LastType.attr2_ID;
							__debugInfo = "271:\src\CompilerPasses\Analyser.gbas";
						} else if ((((local16___SelectHelper6__1822) === ("ENDTYPE")) ? 1 : 0)) {
							__debugInfo = "275:\src\CompilerPasses\Analyser.gbas";
							local6_CurTyp_1796 = -(1);
							__debugInfo = "275:\src\CompilerPasses\Analyser.gbas";
						} else if ((((local16___SelectHelper6__1822) === ("STARTDATA")) ? 1 : 0)) {
							var local8_Name_Str_1824 = "", local5_Datas_1825 = pool_array.alloc(0), local5_dataB_1829 = pool_TDataBlock.alloc();
							__debugInfo = "277:\src\CompilerPasses\Analyser.gbas";
							func5_Match("STARTDATA", 276, "src\CompilerPasses\Analyser.gbas");
							__debugInfo = "278:\src\CompilerPasses\Analyser.gbas";
							local8_Name_Str_1824 = func14_GetCurrent_Str();
							__debugInfo = "279:\src\CompilerPasses\Analyser.gbas";
							if ((((func14_IsValidVarName()) === (0)) ? 1 : 0)) {
								__debugInfo = "279:\src\CompilerPasses\Analyser.gbas";
								func5_Error("Invalid DATA name", 278, "src\CompilerPasses\Analyser.gbas");
								__debugInfo = "279:\src\CompilerPasses\Analyser.gbas";
							};
							__debugInfo = "280:\src\CompilerPasses\Analyser.gbas";
							func5_Match(local8_Name_Str_1824, 279, "src\CompilerPasses\Analyser.gbas");
							__debugInfo = "281:\src\CompilerPasses\Analyser.gbas";
							func5_Match(":", 280, "src\CompilerPasses\Analyser.gbas");
							__debugInfo = "282:\src\CompilerPasses\Analyser.gbas";
							func5_Match("\n", 281, "src\CompilerPasses\Analyser.gbas");
							__debugInfo = "302:\src\CompilerPasses\Analyser.gbas";
							while (func7_IsToken("DATA")) {
								var local4_Done_1826 = 0;
								__debugInfo = "285:\src\CompilerPasses\Analyser.gbas";
								func5_Match("DATA", 284, "src\CompilerPasses\Analyser.gbas");
								__debugInfo = "286:\src\CompilerPasses\Analyser.gbas";
								local4_Done_1826 = 0;
								__debugInfo = "300:\src\CompilerPasses\Analyser.gbas";
								while ((((func7_IsToken("\n")) === (0)) ? 1 : 0)) {
									var local1_e_1827 = 0.0, local7_tmpData_1828 = pool_TDatatype.alloc();
									__debugInfo = "288:\src\CompilerPasses\Analyser.gbas";
									if ((((local4_Done_1826) === (1)) ? 1 : 0)) {
										__debugInfo = "288:\src\CompilerPasses\Analyser.gbas";
										func5_Match(",", 287, "src\CompilerPasses\Analyser.gbas");
										__debugInfo = "288:\src\CompilerPasses\Analyser.gbas";
									};
									__debugInfo = "289:\src\CompilerPasses\Analyser.gbas";
									local1_e_1827 = func10_Expression(0);
									__debugInfo = "291:\src\CompilerPasses\Analyser.gbas";
									local7_tmpData_1828 = global5_Exprs_ref[0].arrAccess(~~(local1_e_1827)).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
									__debugInfo = "292:\src\CompilerPasses\Analyser.gbas";
									local7_tmpData_1828.attr7_IsArray = 0;
									__debugInfo = "293:\src\CompilerPasses\Analyser.gbas";
									func14_EnsureDatatype(~~(local1_e_1827), local7_tmpData_1828, 0, 0);
									__debugInfo = "297:\src\CompilerPasses\Analyser.gbas";
									if ((((((((((global5_Exprs_ref[0].arrAccess(~~(local1_e_1827)).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("int")) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(~~(local1_e_1827)).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("float")) ? 1 : 0))) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(~~(local1_e_1827)).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("string")) ? 1 : 0))) ? 1 : 0)) {
										
									} else {
										__debugInfo = "296:\src\CompilerPasses\Analyser.gbas";
										func5_Error((((("Must be primitive datatype (int, float or string), got '") + (global5_Exprs_ref[0].arrAccess(~~(local1_e_1827)).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) + ("'")), 295, "src\CompilerPasses\Analyser.gbas");
										__debugInfo = "296:\src\CompilerPasses\Analyser.gbas";
									};
									__debugInfo = "298:\src\CompilerPasses\Analyser.gbas";
									DIMPUSH(local5_Datas_1825, ~~(local1_e_1827));
									__debugInfo = "299:\src\CompilerPasses\Analyser.gbas";
									local4_Done_1826 = 1;
									__debugInfo = "288:\src\CompilerPasses\Analyser.gbas";pool_TDatatype.free(local7_tmpData_1828);
								};
								__debugInfo = "301:\src\CompilerPasses\Analyser.gbas";
								func5_Match("\n", 300, "src\CompilerPasses\Analyser.gbas");
								__debugInfo = "285:\src\CompilerPasses\Analyser.gbas";
							};
							__debugInfo = "303:\src\CompilerPasses\Analyser.gbas";
							func5_Match("ENDDATA", 302, "src\CompilerPasses\Analyser.gbas");
							__debugInfo = "305:\src\CompilerPasses\Analyser.gbas";
							local5_dataB_1829.attr8_Name_Str = local8_Name_Str_1824;
							__debugInfo = "306:\src\CompilerPasses\Analyser.gbas";
							local5_dataB_1829.attr5_Datas = local5_Datas_1825.clone(/* In Assign */);
							__debugInfo = "309:\src\CompilerPasses\Analyser.gbas";
							DIMPUSH(global8_Compiler.attr10_DataBlocks, local5_dataB_1829);
							__debugInfo = "277:\src\CompilerPasses\Analyser.gbas";pool_array.free(local5_Datas_1825);pool_TDataBlock.free(local5_dataB_1829);
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
		var forEachSaver3219 = param3_typ.attr10_Attributes;
		for(var forEachCounter3219 = 0 ; forEachCounter3219 < forEachSaver3219.values.length ; forEachCounter3219++) {
			var local1_t_1833 = forEachSaver3219.values[forEachCounter3219];
		{
				__debugInfo = "329:\src\CompilerPasses\Analyser.gbas";
				if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_t_1833).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === (param8_Name_Str)) ? 1 : 0)) {
					__debugInfo = "323:\src\CompilerPasses\Analyser.gbas";
					func5_Error((((((((("Cyclic reference '") + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_t_1833).values[tmpPositionCache][0].attr8_Name_Str))) + ("' to type '"))) + (param8_Name_Str))) + ("'")), 322, "src\CompilerPasses\Analyser.gbas");
					__debugInfo = "323:\src\CompilerPasses\Analyser.gbas";
				} else if (func6_IsType(global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_t_1833).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str)) {
					__debugInfo = "326:\src\CompilerPasses\Analyser.gbas";
					func11_CheckCyclic(param8_Name_Str, global8_LastType);
					__debugInfo = "326:\src\CompilerPasses\Analyser.gbas";
				} else {
					
				};
				__debugInfo = "329:\src\CompilerPasses\Analyser.gbas";
			}
			forEachSaver3219.values[forEachCounter3219] = local1_t_1833;
		
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
			var alias6_ExtTyp_ref_1835 = [pool_TIdentifierType.alloc()], local6_tmpTyp_1836 = 0, local9_Abstracts_1837 = pool_array.alloc(0);
			__debugInfo = "336:\src\CompilerPasses\Analyser.gbas";
			func10_ExtendType(unref(global8_Compiler.attr5_Types_ref[0].arrAccess(param3_typ.attr9_Extending).values[tmpPositionCache][0]));
			__debugInfo = "339:\src\CompilerPasses\Analyser.gbas";
			alias6_ExtTyp_ref_1835 = global8_Compiler.attr5_Types_ref[0].arrAccess(param3_typ.attr9_Extending).values[tmpPositionCache] /* ALIAS */;
			__debugInfo = "366:\src\CompilerPasses\Analyser.gbas";
			local6_tmpTyp_1836 = alias6_ExtTyp_ref_1835[0].attr2_ID;
			__debugInfo = "376:\src\CompilerPasses\Analyser.gbas";
			while ((((local6_tmpTyp_1836) !== (-(1))) ? 1 : 0)) {
				__debugInfo = "373:\src\CompilerPasses\Analyser.gbas";
				var forEachSaver3287 = global8_Compiler.attr5_Types_ref[0].arrAccess(local6_tmpTyp_1836).values[tmpPositionCache][0].attr7_Methods;
				for(var forEachCounter3287 = 0 ; forEachCounter3287 < forEachSaver3287.values.length ; forEachCounter3287++) {
					var local1_M_1838 = forEachSaver3287.values[forEachCounter3287];
				{
						__debugInfo = "372:\src\CompilerPasses\Analyser.gbas";
						if (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local1_M_1838).values[tmpPositionCache][0].attr10_IsAbstract) {
							__debugInfo = "371:\src\CompilerPasses\Analyser.gbas";
							DIMPUSH(local9_Abstracts_1837, local1_M_1838);
							__debugInfo = "371:\src\CompilerPasses\Analyser.gbas";
						};
						__debugInfo = "372:\src\CompilerPasses\Analyser.gbas";
					}
					forEachSaver3287.values[forEachCounter3287] = local1_M_1838;
				
				};
				__debugInfo = "375:\src\CompilerPasses\Analyser.gbas";
				local6_tmpTyp_1836 = global8_Compiler.attr5_Types_ref[0].arrAccess(local6_tmpTyp_1836).values[tmpPositionCache][0].attr9_Extending;
				__debugInfo = "373:\src\CompilerPasses\Analyser.gbas";
			};
			__debugInfo = "397:\src\CompilerPasses\Analyser.gbas";
			var forEachSaver3391 = local9_Abstracts_1837;
			for(var forEachCounter3391 = 0 ; forEachCounter3391 < forEachSaver3391.values.length ; forEachCounter3391++) {
				var local2_Ab_1839 = forEachSaver3391.values[forEachCounter3391];
			{
					var local5_Found_1840 = 0;
					__debugInfo = "381:\src\CompilerPasses\Analyser.gbas";
					local5_Found_1840 = 0;
					__debugInfo = "382:\src\CompilerPasses\Analyser.gbas";
					local6_tmpTyp_1836 = alias6_ExtTyp_ref_1835[0].attr2_ID;
					__debugInfo = "392:\src\CompilerPasses\Analyser.gbas";
					while ((((local6_tmpTyp_1836) !== (-(1))) ? 1 : 0)) {
						__debugInfo = "389:\src\CompilerPasses\Analyser.gbas";
						var forEachSaver3364 = global8_Compiler.attr5_Types_ref[0].arrAccess(local6_tmpTyp_1836).values[tmpPositionCache][0].attr7_Methods;
						for(var forEachCounter3364 = 0 ; forEachCounter3364 < forEachSaver3364.values.length ; forEachCounter3364++) {
							var local1_M_1841 = forEachSaver3364.values[forEachCounter3364];
						{
								__debugInfo = "388:\src\CompilerPasses\Analyser.gbas";
								if (((((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local1_M_1841).values[tmpPositionCache][0].attr8_Name_Str) === (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local2_Ab_1839).values[tmpPositionCache][0].attr8_Name_Str)) ? 1 : 0)) && (((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local1_M_1841).values[tmpPositionCache][0].attr10_IsAbstract) ? 0 : 1))) ? 1 : 0)) {
									__debugInfo = "386:\src\CompilerPasses\Analyser.gbas";
									local5_Found_1840 = 1;
									__debugInfo = "387:\src\CompilerPasses\Analyser.gbas";
									break;
									__debugInfo = "386:\src\CompilerPasses\Analyser.gbas";
								};
								__debugInfo = "388:\src\CompilerPasses\Analyser.gbas";
							}
							forEachSaver3364.values[forEachCounter3364] = local1_M_1841;
						
						};
						__debugInfo = "390:\src\CompilerPasses\Analyser.gbas";
						if (local5_Found_1840) {
							__debugInfo = "390:\src\CompilerPasses\Analyser.gbas";
							break;
							__debugInfo = "390:\src\CompilerPasses\Analyser.gbas";
						};
						__debugInfo = "391:\src\CompilerPasses\Analyser.gbas";
						local6_tmpTyp_1836 = global8_Compiler.attr5_Types_ref[0].arrAccess(local6_tmpTyp_1836).values[tmpPositionCache][0].attr9_Extending;
						__debugInfo = "389:\src\CompilerPasses\Analyser.gbas";
					};
					__debugInfo = "396:\src\CompilerPasses\Analyser.gbas";
					if (((local5_Found_1840) ? 0 : 1)) {
						__debugInfo = "394:\src\CompilerPasses\Analyser.gbas";
						alias6_ExtTyp_ref_1835[0].attr10_Createable = 0;
						__debugInfo = "394:\src\CompilerPasses\Analyser.gbas";
					};
					__debugInfo = "381:\src\CompilerPasses\Analyser.gbas";
				}
				forEachSaver3391.values[forEachCounter3391] = local2_Ab_1839;
			
			};
			__debugInfo = "414:\src\CompilerPasses\Analyser.gbas";
			var forEachSaver3449 = alias6_ExtTyp_ref_1835[0].attr10_Attributes;
			for(var forEachCounter3449 = 0 ; forEachCounter3449 < forEachSaver3449.values.length ; forEachCounter3449++) {
				var local1_A_1842 = forEachSaver3449.values[forEachCounter3449];
			{
					var alias3_Att_ref_1843 = [pool_TIdentifierVari.alloc()], local6_Exists_1844 = 0;
					__debugInfo = "401:\src\CompilerPasses\Analyser.gbas";
					alias3_Att_ref_1843 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_A_1842).values[tmpPositionCache] /* ALIAS */;
					__debugInfo = "402:\src\CompilerPasses\Analyser.gbas";
					local6_Exists_1844 = 0;
					__debugInfo = "409:\src\CompilerPasses\Analyser.gbas";
					var forEachSaver3437 = param3_typ.attr10_Attributes;
					for(var forEachCounter3437 = 0 ; forEachCounter3437 < forEachSaver3437.values.length ; forEachCounter3437++) {
						var local2_A2_1845 = forEachSaver3437.values[forEachCounter3437];
					{
							var alias4_Att2_ref_1846 = [pool_TIdentifierVari.alloc()];
							__debugInfo = "404:\src\CompilerPasses\Analyser.gbas";
							alias4_Att2_ref_1846 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local2_A2_1845).values[tmpPositionCache] /* ALIAS */;
							__debugInfo = "408:\src\CompilerPasses\Analyser.gbas";
							if ((((alias3_Att_ref_1843[0].attr8_Name_Str) === (alias4_Att2_ref_1846[0].attr8_Name_Str)) ? 1 : 0)) {
								__debugInfo = "406:\src\CompilerPasses\Analyser.gbas";
								local6_Exists_1844 = 1;
								__debugInfo = "407:\src\CompilerPasses\Analyser.gbas";
								break;
								__debugInfo = "406:\src\CompilerPasses\Analyser.gbas";
							};
							__debugInfo = "404:\src\CompilerPasses\Analyser.gbas";pool_TIdentifierVari.free(alias4_Att2_ref_1846);
						}
						forEachSaver3437.values[forEachCounter3437] = local2_A2_1845;
					
					};
					__debugInfo = "413:\src\CompilerPasses\Analyser.gbas";
					if (((local6_Exists_1844) ? 0 : 1)) {
						__debugInfo = "412:\src\CompilerPasses\Analyser.gbas";
						DIMPUSH(param3_typ.attr10_Attributes, local1_A_1842);
						__debugInfo = "412:\src\CompilerPasses\Analyser.gbas";
					};
					__debugInfo = "401:\src\CompilerPasses\Analyser.gbas";pool_TIdentifierVari.free(alias3_Att_ref_1843);
				}
				forEachSaver3449.values[forEachCounter3449] = local1_A_1842;
			
			};
			__debugInfo = "336:\src\CompilerPasses\Analyser.gbas";pool_array.free(local9_Abstracts_1837);
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
		var local8_Text_Str_2570 = "", local4_File_2571 = 0;
		__debugInfo = "371:\src\Compiler.gbas";
		local4_File_2571 = GENFILE();
		__debugInfo = "381:\src\Compiler.gbas";
		if (OPENFILE(local4_File_2571, param8_Path_Str, 1)) {
			__debugInfo = "377:\src\Compiler.gbas";
			while ((((ENDOFFILE(local4_File_2571)) === (0)) ? 1 : 0)) {
				var local8_Line_Str_ref_2572 = [""];
				__debugInfo = "375:\src\Compiler.gbas";
				READLINE(local4_File_2571, local8_Line_Str_ref_2572);
				__debugInfo = "376:\src\Compiler.gbas";
				local8_Text_Str_2570 = ((((local8_Text_Str_2570) + (local8_Line_Str_ref_2572[0]))) + ("\n"));
				__debugInfo = "375:\src\Compiler.gbas";
			};
			__debugInfo = "378:\src\Compiler.gbas";
			CLOSEFILE(local4_File_2571);
			__debugInfo = "377:\src\Compiler.gbas";
		} else {
			__debugInfo = "380:\src\Compiler.gbas";
			func5_Error((("Cannot find file: ") + (param8_Path_Str)), 379, "src\Compiler.gbas");
			__debugInfo = "380:\src\Compiler.gbas";
		};
		__debugInfo = "383:\src\Compiler.gbas";
		return tryClone(local8_Text_Str_2570);
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
		var local3_tok_1850 = pool_TToken.alloc();
		__debugInfo = "388:\src\Compiler.gbas";
		local3_tok_1850 = func15_GetCurrentToken().clone(/* In Assign */);
		__debugInfo = "390:\src\Compiler.gbas";
		param7_Msg_Str = (((((("Error: '") + (REPLACE_Str(param7_Msg_Str, "\n", "NEWLINE")))) + (global8_Compiler.attr14_errorState_Str))) + ("'\n"));
		__debugInfo = "391:\src\Compiler.gbas";
		param7_Msg_Str = ((((((((((((((param7_Msg_Str) + ("in line '"))) + (CAST2STRING(local3_tok_1850.attr4_Line)))) + ("' at character '"))) + (CAST2STRING(local3_tok_1850.attr9_Character)))) + ("' near '"))) + (REPLACE_Str(local3_tok_1850.attr8_Text_Str, "\n", "NEWLINE")))) + ("'\n"));
		__debugInfo = "392:\src\Compiler.gbas";
		param7_Msg_Str = ((((((param7_Msg_Str) + ("in file '"))) + (local3_tok_1850.attr8_Path_Str))) + ("'\n"));
		__debugInfo = "398:\src\Compiler.gbas";
		param7_Msg_Str = ((((((param7_Msg_Str) + ("\t '"))) + (local3_tok_1850.attr15_LineContent_Str))) + ("'\n"));
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
		__debugInfo = "388:\src\Compiler.gbas";pool_TToken.free(local3_tok_1850);
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
		var local3_tok_2574 = pool_TToken.alloc();
		__debugInfo = "413:\src\Compiler.gbas";
		local3_tok_2574 = func15_GetCurrentToken().clone(/* In Assign */);
		__debugInfo = "415:\src\Compiler.gbas";
		param7_Msg_Str = (((("Warning: '") + (REPLACE_Str(param7_Msg_Str, "\n", "NEWLINE")))) + ("'\n"));
		__debugInfo = "416:\src\Compiler.gbas";
		param7_Msg_Str = ((((((((((((((param7_Msg_Str) + ("in line '"))) + (CAST2STRING(local3_tok_2574.attr4_Line)))) + ("' at character '"))) + (CAST2STRING(local3_tok_2574.attr9_Character)))) + ("' near '"))) + (REPLACE_Str(local3_tok_2574.attr8_Text_Str, "\n", "NEWLINE")))) + ("'\n"));
		__debugInfo = "417:\src\Compiler.gbas";
		param7_Msg_Str = ((((((param7_Msg_Str) + ("in file '"))) + (local3_tok_2574.attr8_Path_Str))) + ("'\n"));
		__debugInfo = "418:\src\Compiler.gbas";
		param7_Msg_Str = ((((((param7_Msg_Str) + ("\t '"))) + (local3_tok_2574.attr15_LineContent_Str))) + ("'\n"));
		__debugInfo = "419:\src\Compiler.gbas";
		param7_Msg_Str = ((param7_Msg_Str) + ("-----------------------------------\n"));
		__debugInfo = "419:\src\Compiler.gbas";
		param7_Msg_Str = (("\n-----------------------------------\n") + (param7_Msg_Str));
		__debugInfo = "421:\src\Compiler.gbas";
		STDOUT(param7_Msg_Str);
		__debugInfo = "422:\src\Compiler.gbas";
		return 0;
		__debugInfo = "413:\src\Compiler.gbas";pool_TToken.free(local3_tok_2574);
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
			var local6_ascval_2580 = 0, local3_pos_2581 = 0.0;
			__debugInfo = "430:\src\Compiler.gbas";
			local6_ascval_2580 = ASC(param8_Text_Str, 0);
			__debugInfo = "433:\src\Compiler.gbas";
			if ((((((((((local6_ascval_2580) === (8)) ? 1 : 0)) || ((((local6_ascval_2580) === (12)) ? 1 : 0))) ? 1 : 0)) || ((((CAST2STRING(local6_ascval_2580)) === (global11_SHLASHF_Str)) ? 1 : 0))) ? 1 : 0)) {
				__debugInfo = "432:\src\Compiler.gbas";
				param8_Text_Str = "\n";
				__debugInfo = "432:\src\Compiler.gbas";
			};
			__debugInfo = "437:\src\Compiler.gbas";
			local3_pos_2581 = global8_Compiler.attr11_LastTokenID;
			__debugInfo = "438:\src\Compiler.gbas";
			global8_Compiler.attr11_LastTokenID = ((global8_Compiler.attr11_LastTokenID) + (1));
			__debugInfo = "445:\src\Compiler.gbas";
			if ((((global8_Compiler.attr11_LastTokenID) >= (((BOUNDS(global8_Compiler.attr6_Tokens, 0)) - (10)))) ? 1 : 0)) {
				__debugInfo = "443:\src\Compiler.gbas";
				REDIM(global8_Compiler.attr6_Tokens, [((global8_Compiler.attr11_LastTokenID) + (50))], pool_TToken.alloc() );
				__debugInfo = "443:\src\Compiler.gbas";
			};
			__debugInfo = "447:\src\Compiler.gbas";
			global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2581)).values[tmpPositionCache].attr4_Line = param4_Line;
			__debugInfo = "448:\src\Compiler.gbas";
			global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2581)).values[tmpPositionCache].attr9_Character = param9_Character;
			__debugInfo = "449:\src\Compiler.gbas";
			global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2581)).values[tmpPositionCache].attr15_LineContent_Str = param15_LineContent_Str;
			__debugInfo = "450:\src\Compiler.gbas";
			global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2581)).values[tmpPositionCache].attr8_Path_Str = param8_Path_Str;
			__debugInfo = "451:\src\Compiler.gbas";
			global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2581)).values[tmpPositionCache].attr8_Text_Str = param8_Text_Str;
			__debugInfo = "452:\src\Compiler.gbas";
			if ((((LEFT_Str(global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2581)).values[tmpPositionCache].attr8_Text_Str, 1)) === ("@")) ? 1 : 0)) {
				__debugInfo = "452:\src\Compiler.gbas";
				global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2581)).values[tmpPositionCache].attr8_Text_Str = MID_Str(global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2581)).values[tmpPositionCache].attr8_Text_Str, 1, -(1));
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
			var local1_t_1851 = pool_TToken.alloc();
			__debugInfo = "461:\src\Compiler.gbas";
			return tryClone(local1_t_1851);
			__debugInfo = "461:\src\Compiler.gbas";pool_TToken.free(local1_t_1851);
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
		var local1_d_2587 = pool_TDatatype.alloc();
		__debugInfo = "519:\src\Compiler.gbas";
		local1_d_2587.attr8_Name_Str = param8_Name_Str;
		__debugInfo = "520:\src\Compiler.gbas";
		local1_d_2587.attr7_IsArray = param7_IsArray;
		__debugInfo = "521:\src\Compiler.gbas";
		return tryClone(local1_d_2587);
		__debugInfo = "522:\src\Compiler.gbas";
		return tryClone(unref(pool_TDatatype.alloc()));
		__debugInfo = "519:\src\Compiler.gbas";pool_TDatatype.free(local1_d_2587);
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
		var local2_Op_ref_2592 = [pool_TOperator.alloc()];
		__debugInfo = "534:\src\Compiler.gbas";
		local2_Op_ref_2592[0].attr8_Name_Str = param8_Name_Str;
		__debugInfo = "535:\src\Compiler.gbas";
		local2_Op_ref_2592[0].attr7_Sym_Str = param7_Sym_Str;
		__debugInfo = "536:\src\Compiler.gbas";
		local2_Op_ref_2592[0].attr4_Prio = param4_Prio;
		__debugInfo = "537:\src\Compiler.gbas";
		local2_Op_ref_2592[0].attr3_Typ = param3_Typ;
		__debugInfo = "538:\src\Compiler.gbas";
		local2_Op_ref_2592[0].attr2_ID = BOUNDS(global9_Operators_ref[0], 0);
		__debugInfo = "539:\src\Compiler.gbas";
		DIMPUSH(global9_Operators_ref[0], local2_Op_ref_2592);
		__debugInfo = "540:\src\Compiler.gbas";
		return 0;
		__debugInfo = "534:\src\Compiler.gbas";pool_TOperator.free(local2_Op_ref_2592);
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
		var local4_Vari_ref_1856 = [param4_Vari];
		__debugInfo = "554:\src\Compiler.gbas";
		if (((((((param6_Ignore) === (0)) ? 1 : 0)) && (func13_IsVarExisting(local4_Vari_ref_1856[0].attr8_Name_Str))) ? 1 : 0)) {
			__debugInfo = "554:\src\Compiler.gbas";
			func5_Error((((("Variable already exists, is a keyword or a type: '") + (local4_Vari_ref_1856[0].attr8_Name_Str))) + ("'")), 553, "src\Compiler.gbas");
			__debugInfo = "554:\src\Compiler.gbas";
		};
		__debugInfo = "555:\src\Compiler.gbas";
		local4_Vari_ref_1856[0].attr2_ID = BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0);
		__debugInfo = "557:\src\Compiler.gbas";
		DIMPUSH(global8_Compiler.attr5_Varis_ref[0], local4_Vari_ref_1856);
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
		var local4_Func_ref_1858 = [param4_Func];
		__debugInfo = "561:\src\Compiler.gbas";
		if (((((((local4_Func_ref_1858[0].attr3_Typ) !== (3)) ? 1 : 0)) && (func14_IsFuncExisting(local4_Func_ref_1858[0].attr8_Name_Str, local4_Func_ref_1858[0].attr10_IsCallback))) ? 1 : 0)) {
			__debugInfo = "561:\src\Compiler.gbas";
			func5_Error((((("Function already exists, is a keyword or a type: '") + (local4_Func_ref_1858[0].attr8_Name_Str))) + ("'")), 560, "src\Compiler.gbas");
			__debugInfo = "561:\src\Compiler.gbas";
		};
		__debugInfo = "563:\src\Compiler.gbas";
		local4_Func_ref_1858[0].attr2_ID = BOUNDS(global8_Compiler.attr5_Funcs_ref[0], 0);
		__debugInfo = "564:\src\Compiler.gbas";
		DIMPUSH(global8_Compiler.attr5_Funcs_ref[0], local4_Func_ref_1858);
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
		var local12_Keywords_Str_1859 = pool_array.alloc("");
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
		DIMDATA(local12_Keywords_Str_1859, ["CALLBACK", "FUNCTION", "ENDFUNCTION", "SUB", "ENDSUB", "GOSUB", "IF", "ELSE", "ELSEIF", "THEN", "ENDIF", "WHILE", "WEND", "BREAK", "CONTINUE", "FOR", "FOREACH", "IN", "TO", "STEP", "NEXT", "REPEAT", "UNTIL", "TYPE", "ENDTYPE", "RETURN", "NATIVE", "LOCAL", "GLOBAL", "STATIC", "DIM", "REDIM", "INLINE", "ENDINLINE", "PROTOTYPE", "REQUIRE", "BREAK", "CONTINUE", "TRY", "CATCH", "FINALLY", "THROW", "SELECT", "CASE", "DEFAULT", "ENDSELECT", "STARTDATA", "ENDDATA", "DATA", "RESTORE", "READ", "GOTO", "ALIAS", "AS", "CONSTANT", "INC", "DEC", "DIMPUSH", "LEN", "DIMDATA", "DELETE", "DIMDEL", "DEBUG", "ASSERT", "ABSTRACT", "EXPORT"]);
		__debugInfo = "596:\src\Compiler.gbas";
		(global10_KeywordMap).SetSize(((BOUNDS(local12_Keywords_Str_1859, 0)) * (8)));
		__debugInfo = "599:\src\Compiler.gbas";
		var forEachSaver3940 = local12_Keywords_Str_1859;
		for(var forEachCounter3940 = 0 ; forEachCounter3940 < forEachSaver3940.values.length ; forEachCounter3940++) {
			var local7_key_Str_1860 = forEachSaver3940.values[forEachCounter3940];
		{
				__debugInfo = "598:\src\Compiler.gbas";
				(global10_KeywordMap).Put(local7_key_Str_1860, 1);
				__debugInfo = "598:\src\Compiler.gbas";
			}
			forEachSaver3940.values[forEachCounter3940] = local7_key_Str_1860;
		
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
		__debugInfo = "568:\src\Compiler.gbas";pool_array.free(local12_Keywords_Str_1859);
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
		var local1_c_1863 = pool_TCompiler.alloc(), local11_tmpPath_Str_1864 = "", local10_Output_Str_1865 = "";
		__debugInfo = "634:\src\Compiler.gbas";
		global8_Compiler = local1_c_1863.clone(/* In Assign */);
		__debugInfo = "637:\src\Compiler.gbas";
		InitCompiler();
		__debugInfo = "639:\src\Compiler.gbas";
		func16_ResetExpressions();
		__debugInfo = "641:\src\Compiler.gbas";
		func9_PushTimer();
		__debugInfo = "643:\src\Compiler.gbas";
		func11_SetupTarget(param10_Target_Str);
		__debugInfo = "655:\src\Compiler.gbas";
		PassSuccessfull();
		__debugInfo = "657:\src\Compiler.gbas";
		func8_PopTimer("Header load & setup target!");
		__debugInfo = "659:\src\Compiler.gbas";
		global8_Compiler.attr8_Code_Str = ((param8_Text_Str) + ("\n"));
		__debugInfo = "661:\src\Compiler.gbas";
		func9_PushTimer();
		__debugInfo = "662:\src\Compiler.gbas";
		func5_Lexer();
		__debugInfo = "663:\src\Compiler.gbas";
		func8_PopTimer("Lexer!");
		__debugInfo = "665:\src\Compiler.gbas";
		PassSuccessfull();
		__debugInfo = "666:\src\Compiler.gbas";
		STDOUT("Lexing successful! \n");
		__debugInfo = "668:\src\Compiler.gbas";
		global8_Compiler.attr14_errorState_Str = " (precompiler error)";
		__debugInfo = "669:\src\Compiler.gbas";
		func9_PushTimer();
		__debugInfo = "670:\src\Compiler.gbas";
		func11_Precompiler();
		__debugInfo = "672:\src\Compiler.gbas";
		func8_PopTimer("Precompiler");
		__debugInfo = "674:\src\Compiler.gbas";
		PassSuccessfull();
		__debugInfo = "675:\src\Compiler.gbas";
		STDOUT("Preprocessing successful! \n");
		__debugInfo = "678:\src\Compiler.gbas";
		global8_Compiler.attr13_LastMaxTokens = global8_Compiler.attr11_LastTokenID;
		__debugInfo = "680:\src\Compiler.gbas";
		func16_ResetExpressions();
		__debugInfo = "682:\src\Compiler.gbas";
		global8_Compiler.attr14_errorState_Str = " (analyse error)";
		__debugInfo = "683:\src\Compiler.gbas";
		func9_PushTimer();
		__debugInfo = "684:\src\Compiler.gbas";
		func8_Analyser();
		__debugInfo = "685:\src\Compiler.gbas";
		func8_PopTimer("Analyser");
		__debugInfo = "687:\src\Compiler.gbas";
		PassSuccessfull();
		__debugInfo = "693:\src\Compiler.gbas";
		if (global8_Compiler.attr8_WasError) {
			__debugInfo = "689:\src\Compiler.gbas";
			STDOUT("Analysing failed :( \n");
			__debugInfo = "690:\src\Compiler.gbas";
			return "";
			__debugInfo = "689:\src\Compiler.gbas";
		} else {
			__debugInfo = "692:\src\Compiler.gbas";
			STDOUT("Analysing successful! \n");
			__debugInfo = "692:\src\Compiler.gbas";
		};
		__debugInfo = "695:\src\Compiler.gbas";
		local11_tmpPath_Str_1864 = GETCURRENTDIR_Str();
		__debugInfo = "696:\src\Compiler.gbas";
		SETCURRENTDIR(global12_GbapPath_Str);
		__debugInfo = "698:\src\Compiler.gbas";
		global8_Compiler.attr14_errorState_Str = " (parse error)";
		__debugInfo = "699:\src\Compiler.gbas";
		func9_PushTimer();
		__debugInfo = "700:\src\Compiler.gbas";
		func6_Parser();
		__debugInfo = "701:\src\Compiler.gbas";
		func8_PopTimer("Parser");
		__debugInfo = "703:\src\Compiler.gbas";
		PassSuccessfull();
		__debugInfo = "709:\src\Compiler.gbas";
		if (global8_Compiler.attr8_WasError) {
			__debugInfo = "705:\src\Compiler.gbas";
			STDOUT("Parsing failed :( \n");
			__debugInfo = "706:\src\Compiler.gbas";
			return "";
			__debugInfo = "705:\src\Compiler.gbas";
		} else {
			__debugInfo = "708:\src\Compiler.gbas";
			STDOUT("Parsing successful! \n");
			__debugInfo = "708:\src\Compiler.gbas";
		};
		__debugInfo = "712:\src\Compiler.gbas";
		global8_Compiler.attr14_errorState_Str = " (doc generation error)";
		__debugInfo = "713:\src\Compiler.gbas";
		func9_PushTimer();
		__debugInfo = "714:\src\Compiler.gbas";
		func11_GenerateDoc();
		__debugInfo = "715:\src\Compiler.gbas";
		func8_PopTimer("Generate Doc");
		__debugInfo = "717:\src\Compiler.gbas";
		PassSuccessfull();
		__debugInfo = "723:\src\Compiler.gbas";
		if (global8_Compiler.attr8_WasError) {
			__debugInfo = "719:\src\Compiler.gbas";
			STDOUT("Doc Generation failed :( \n");
			__debugInfo = "720:\src\Compiler.gbas";
			return "";
			__debugInfo = "719:\src\Compiler.gbas";
		} else {
			__debugInfo = "722:\src\Compiler.gbas";
			STDOUT("Doc Generation successful! \n");
			__debugInfo = "722:\src\Compiler.gbas";
		};
		__debugInfo = "726:\src\Compiler.gbas";
		global8_Compiler.attr14_errorState_Str = " (generate error)";
		__debugInfo = "728:\src\Compiler.gbas";
		SETCURRENTDIR(local11_tmpPath_Str_1864);
		__debugInfo = "731:\src\Compiler.gbas";
		func9_PushTimer();
		__debugInfo = "732:\src\Compiler.gbas";
		local10_Output_Str_1865 = func12_DoTarget_Str(param10_Target_Str);
		__debugInfo = "733:\src\Compiler.gbas";
		func8_PopTimer("Target stuff");
		__debugInfo = "735:\src\Compiler.gbas";
		PassSuccessfull();
		__debugInfo = "741:\src\Compiler.gbas";
		if (global8_Compiler.attr8_WasError) {
			__debugInfo = "737:\src\Compiler.gbas";
			STDOUT("Generating failed :( \n");
			__debugInfo = "738:\src\Compiler.gbas";
			return "";
			__debugInfo = "737:\src\Compiler.gbas";
		} else {
			__debugInfo = "740:\src\Compiler.gbas";
			STDOUT((((("Generating successful to target ") + (param10_Target_Str))) + ("! \n")));
			__debugInfo = "740:\src\Compiler.gbas";
		};
		__debugInfo = "743:\src\Compiler.gbas";
		return tryClone(local10_Output_Str_1865);
		__debugInfo = "744:\src\Compiler.gbas";
		return "";
		__debugInfo = "634:\src\Compiler.gbas";pool_TCompiler.free(local1_c_1863);
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
		__debugInfo = "747:\src\Compiler.gbas";
		DIM(unref(global5_Exprs_ref[0]), [0], [pool_TExpr.alloc()]);
		__debugInfo = "748:\src\Compiler.gbas";
		global10_LastExprID = 0;
		__debugInfo = "749:\src\Compiler.gbas";
		func21_CreateDebugExpression();
		__debugInfo = "750:\src\Compiler.gbas";
		return 0;
		__debugInfo = "747:\src\Compiler.gbas";
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
		__debugInfo = "760:\src\Compiler.gbas";
		return 0;
		__debugInfo = "760:\src\Compiler.gbas";
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
		__debugInfo = "768:\src\Compiler.gbas";
		return 0;
		__debugInfo = "768:\src\Compiler.gbas";
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
		var local3_Def_1869 = pool_TDefine.alloc();
		__debugInfo = "773:\src\Compiler.gbas";
		local3_Def_1869.attr7_Key_Str = param7_Key_Str;
		__debugInfo = "774:\src\Compiler.gbas";
		local3_Def_1869.attr9_Value_Str = param9_Value_Str;
		__debugInfo = "775:\src\Compiler.gbas";
		DIMPUSH(global7_Defines, local3_Def_1869);
		__debugInfo = "776:\src\Compiler.gbas";
		return 0;
		__debugInfo = "773:\src\Compiler.gbas";pool_TDefine.free(local3_Def_1869);
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
		var local17_Documentation_Str_1871 = "", local11_JSONDoc_Str_1872 = "", local12_Glossary_Str_1873 = "";
		__debugInfo = "37:\src\DocParser.gbas";
		local17_Documentation_Str_1871 = "";
		__debugInfo = "38:\src\DocParser.gbas";
		local11_JSONDoc_Str_1872 = "";
		__debugInfo = "39:\src\DocParser.gbas";
		local12_Glossary_Str_1873 = "# Overview";
		__debugInfo = "105:\src\DocParser.gbas";
		var forEachSaver4473 = global14_Documentations;
		for(var forEachCounter4473 = 0 ; forEachCounter4473 < forEachSaver4473.values.length ; forEachCounter4473++) {
			var local6_module_1874 = forEachSaver4473.values[forEachCounter4473];
		{
				__debugInfo = "104:\src\DocParser.gbas";
				if ((((local6_module_1874.attr7_typ_Str) === ("MODULE")) ? 1 : 0)) {
					__debugInfo = "43:\src\DocParser.gbas";
					local12_Glossary_Str_1873+=(((((((("\n## [Module ") + (local6_module_1874.attr8_name_Str))) + ("] (#"))) + (local6_module_1874.attr8_name_Str))) + (")\n"));
					__debugInfo = "44:\src\DocParser.gbas";
					local17_Documentation_Str_1871+=(((("# ") + (local6_module_1874.attr8_name_Str))) + ("\n"));
					__debugInfo = "45:\src\DocParser.gbas";
					local17_Documentation_Str_1871+=((func18_DocLangElement_Str(unref(local6_module_1874.attr4_desc), param8_Lang_Str)) + ("\n"));
					__debugInfo = "103:\src\DocParser.gbas";
					var forEachSaver4471 = global14_Documentations;
					for(var forEachCounter4471 = 0 ; forEachCounter4471 < forEachSaver4471.values.length ; forEachCounter4471++) {
						var local1_D_1875 = forEachSaver4471.values[forEachCounter4471];
					{
							__debugInfo = "102:\src\DocParser.gbas";
							if ((((local1_D_1875.attr10_module_Str) === (local6_module_1874.attr8_name_Str)) ? 1 : 0)) {
								var local8_name_Str_1876 = "";
								__debugInfo = "48:\src\DocParser.gbas";
								local8_name_Str_1876 = local1_D_1875.attr8_name_Str;
								__debugInfo = "49:\src\DocParser.gbas";
								local17_Documentation_Str_1871+=(((("## ") + (local8_name_Str_1876))) + ("\n"));
								__debugInfo = "51:\src\DocParser.gbas";
								{
									var local16___SelectHelper7__1877 = "";
									__debugInfo = "51:\src\DocParser.gbas";
									local16___SelectHelper7__1877 = local1_D_1875.attr7_typ_Str;
									__debugInfo = "101:\src\DocParser.gbas";
									if ((((local16___SelectHelper7__1877) === ("FUNCTION")) ? 1 : 0)) {
										__debugInfo = "53:\src\DocParser.gbas";
										local12_Glossary_Str_1873+=(((((((("* [") + (local8_name_Str_1876))) + ("] ("))) + (local8_name_Str_1876))) + (")\n"));
										__debugInfo = "60:\src\DocParser.gbas";
										var forEachSaver4310 = global8_Compiler.attr5_Funcs_ref[0];
										for(var forEachCounter4310 = 0 ; forEachCounter4310 < forEachSaver4310.values.length ; forEachCounter4310++) {
											var local1_F_ref_1878 = forEachSaver4310.values[forEachCounter4310];
										{
												__debugInfo = "59:\src\DocParser.gbas";
												if ((((local1_F_ref_1878[0].attr9_OName_Str) === (local1_D_1875.attr8_name_Str)) ? 1 : 0)) {
													__debugInfo = "57:\src\DocParser.gbas";
													local17_Documentation_Str_1871+=((((">`") + (func20_GenerateFuncName_Str(unref(local1_F_ref_1878[0]))))) + ("`\n\n"));
													__debugInfo = "58:\src\DocParser.gbas";
													break;
													__debugInfo = "57:\src\DocParser.gbas";
												};
												__debugInfo = "59:\src\DocParser.gbas";
											}
											forEachSaver4310.values[forEachCounter4310] = local1_F_ref_1878;
										
										};
										__debugInfo = "76:\src\DocParser.gbas";
										if ((((BOUNDS(local1_D_1875.attr6_params, 0)) > (0)) ? 1 : 0)) {
											__debugInfo = "65:\src\DocParser.gbas";
											{
												var local16___SelectHelper8__1879 = "";
												__debugInfo = "65:\src\DocParser.gbas";
												local16___SelectHelper8__1879 = param8_Lang_Str;
												__debugInfo = "70:\src\DocParser.gbas";
												if ((((local16___SelectHelper8__1879) === ("EN")) ? 1 : 0)) {
													__debugInfo = "67:\src\DocParser.gbas";
													local17_Documentation_Str_1871+="Parameter | Description\n";
													__debugInfo = "67:\src\DocParser.gbas";
												} else if ((((local16___SelectHelper8__1879) === ("DE")) ? 1 : 0)) {
													__debugInfo = "69:\src\DocParser.gbas";
													local17_Documentation_Str_1871+="Parameter | Beschreibung\n";
													__debugInfo = "69:\src\DocParser.gbas";
												};
												__debugInfo = "65:\src\DocParser.gbas";
											};
											__debugInfo = "71:\src\DocParser.gbas";
											local17_Documentation_Str_1871+="-----------|-----------------------------------------------------------------------\n";
											__debugInfo = "75:\src\DocParser.gbas";
											var forEachSaver4367 = local1_D_1875.attr6_params;
											for(var forEachCounter4367 = 0 ; forEachCounter4367 < forEachSaver4367.values.length ; forEachCounter4367++) {
												var local1_P_1880 = forEachSaver4367.values[forEachCounter4367];
											{
													__debugInfo = "73:\src\DocParser.gbas";
													local17_Documentation_Str_1871+=(((("`") + (local1_P_1880.attr8_name_Str))) + ("`|"));
													__debugInfo = "74:\src\DocParser.gbas";
													local17_Documentation_Str_1871+=((func18_DocLangElement_Str(unref(local1_P_1880.attr4_desc), param8_Lang_Str)) + ("\n"));
													__debugInfo = "73:\src\DocParser.gbas";
												}
												forEachSaver4367.values[forEachCounter4367] = local1_P_1880;
											
											};
											__debugInfo = "65:\src\DocParser.gbas";
										};
										__debugInfo = "80:\src\DocParser.gbas";
										if ((((BOUNDS(local1_D_1875.attr7_example, 0)) > (0)) ? 1 : 0)) {
											__debugInfo = "79:\src\DocParser.gbas";
											local17_Documentation_Str_1871+=(((("```\n") + (func18_DocLangElement_Str(unref(local1_D_1875.attr7_example), param8_Lang_Str)))) + ("```\n"));
											__debugInfo = "79:\src\DocParser.gbas";
										};
										__debugInfo = "82:\src\DocParser.gbas";
										local17_Documentation_Str_1871+=(((("\n") + (func18_DocLangElement_Str(unref(local1_D_1875.attr4_desc), param8_Lang_Str)))) + ("\n"));
										__debugInfo = "100:\src\DocParser.gbas";
										if ((((BOUNDS(local1_D_1875.attr7_see_Str, 0)) > (0)) ? 1 : 0)) {
											var local5_first_1882 = 0;
											__debugInfo = "85:\src\DocParser.gbas";
											{
												var local16___SelectHelper9__1881 = "";
												__debugInfo = "85:\src\DocParser.gbas";
												local16___SelectHelper9__1881 = param8_Lang_Str;
												__debugInfo = "90:\src\DocParser.gbas";
												if ((((local16___SelectHelper9__1881) === ("EN")) ? 1 : 0)) {
													__debugInfo = "87:\src\DocParser.gbas";
													local17_Documentation_Str_1871+="See also: ";
													__debugInfo = "87:\src\DocParser.gbas";
												} else if ((((local16___SelectHelper9__1881) === ("DE")) ? 1 : 0)) {
													__debugInfo = "89:\src\DocParser.gbas";
													local17_Documentation_Str_1871+="Siehe auch: ";
													__debugInfo = "89:\src\DocParser.gbas";
												};
												__debugInfo = "85:\src\DocParser.gbas";
											};
											__debugInfo = "92:\src\DocParser.gbas";
											local5_first_1882 = 0;
											__debugInfo = "97:\src\DocParser.gbas";
											var forEachSaver4464 = local1_D_1875.attr7_see_Str;
											for(var forEachCounter4464 = 0 ; forEachCounter4464 < forEachSaver4464.values.length ; forEachCounter4464++) {
												var local5_s_Str_1883 = forEachSaver4464.values[forEachCounter4464];
											{
													__debugInfo = "94:\src\DocParser.gbas";
													if (local5_first_1882) {
														__debugInfo = "94:\src\DocParser.gbas";
														local17_Documentation_Str_1871+=", ";
														__debugInfo = "94:\src\DocParser.gbas";
													};
													__debugInfo = "95:\src\DocParser.gbas";
													local17_Documentation_Str_1871+=(((((((("[") + (local5_s_Str_1883))) + ("] (#"))) + (local5_s_Str_1883))) + (")"));
													__debugInfo = "96:\src\DocParser.gbas";
													local5_first_1882 = 1;
													__debugInfo = "94:\src\DocParser.gbas";
												}
												forEachSaver4464.values[forEachCounter4464] = local5_s_Str_1883;
											
											};
											__debugInfo = "99:\src\DocParser.gbas";
											local17_Documentation_Str_1871+="\n";
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
						forEachSaver4471.values[forEachCounter4471] = local1_D_1875;
					
					};
					__debugInfo = "43:\src\DocParser.gbas";
				};
				__debugInfo = "104:\src\DocParser.gbas";
			}
			forEachSaver4473.values[forEachCounter4473] = local6_module_1874;
		
		};
		__debugInfo = "109:\src\DocParser.gbas";
		local17_Documentation_Str_1871 = ((((local12_Glossary_Str_1873) + ("\n"))) + (local17_Documentation_Str_1871));
		__debugInfo = "111:\src\DocParser.gbas";
		func9_WriteFile((((("Documentation_") + (param8_Lang_Str))) + (".md")), local17_Documentation_Str_1871);
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
		var local8_Text_Str_1886 = "";
		__debugInfo = "116:\src\DocParser.gbas";
		local8_Text_Str_1886 = "";
		__debugInfo = "121:\src\DocParser.gbas";
		var forEachSaver4515 = param5_Langs;
		for(var forEachCounter4515 = 0 ; forEachCounter4515 < forEachSaver4515.values.length ; forEachCounter4515++) {
			var local1_L_1887 = forEachSaver4515.values[forEachCounter4515];
		{
				__debugInfo = "120:\src\DocParser.gbas";
				if ((((local1_L_1887.attr8_lang_Str) === (param8_Lang_Str)) ? 1 : 0)) {
					__debugInfo = "119:\src\DocParser.gbas";
					local8_Text_Str_1886+=((local1_L_1887.attr8_desc_Str) + ("\n"));
					__debugInfo = "119:\src\DocParser.gbas";
				};
				__debugInfo = "120:\src\DocParser.gbas";
			}
			forEachSaver4515.values[forEachCounter4515] = local1_L_1887;
		
		};
		__debugInfo = "122:\src\DocParser.gbas";
		return tryClone(local8_Text_Str_1886);
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
		var local3_doc_2593 = pool_Documentation.alloc(), local8_name_Str_2594 = "";
		__debugInfo = "132:\src\DocParser.gbas";
		local3_doc_2593.attr7_typ_Str = func14_GetCurrent_Str();
		__debugInfo = "133:\src\DocParser.gbas";
		if ((((((func7_IsToken("MODULE")) || (func7_IsToken("FUNCTION"))) ? 1 : 0)) ? 0 : 1)) {
			__debugInfo = "133:\src\DocParser.gbas";
			func5_Error("Unknown ?DOC", 132, "src\DocParser.gbas");
			__debugInfo = "133:\src\DocParser.gbas";
		};
		__debugInfo = "134:\src\DocParser.gbas";
		local8_name_Str_2594 = "";
		__debugInfo = "140:\src\DocParser.gbas";
		do {
			__debugInfo = "136:\src\DocParser.gbas";
			func13_RemoveCurrent();
			__debugInfo = "137:\src\DocParser.gbas";
			if ((((local8_name_Str_2594) !== ("")) ? 1 : 0)) {
				__debugInfo = "137:\src\DocParser.gbas";
				local8_name_Str_2594 = ((local8_name_Str_2594) + ("."));
				__debugInfo = "137:\src\DocParser.gbas";
			};
			__debugInfo = "138:\src\DocParser.gbas";
			local8_name_Str_2594 = ((local8_name_Str_2594) + (func14_GetCurrent_Str()));
			__debugInfo = "139:\src\DocParser.gbas";
			func13_RemoveCurrent();
			__debugInfo = "136:\src\DocParser.gbas";
		} while (!(((func7_IsToken(".")) ? 0 : 1)));
		__debugInfo = "141:\src\DocParser.gbas";
		local3_doc_2593.attr8_name_Str = local8_name_Str_2594;
		__debugInfo = "143:\src\DocParser.gbas";
		func11_RemoveAllNL();
		__debugInfo = "186:\src\DocParser.gbas";
		while ((((func8_EOFParse()) === (1)) ? 1 : 0)) {
			__debugInfo = "146:\src\DocParser.gbas";
			func14_MatchAndRemove("?", 145, "src\DocParser.gbas");
			__debugInfo = "147:\src\DocParser.gbas";
			{
				var local17___SelectHelper44__2595 = "";
				__debugInfo = "147:\src\DocParser.gbas";
				local17___SelectHelper44__2595 = func14_GetCurrent_Str();
				__debugInfo = "183:\src\DocParser.gbas";
				if ((((local17___SelectHelper44__2595) === ("PARAM")) ? 1 : 0)) {
					var local5_param_2596 = pool_ParamElement.alloc();
					__debugInfo = "149:\src\DocParser.gbas";
					func13_RemoveCurrent();
					__debugInfo = "151:\src\DocParser.gbas";
					local5_param_2596.attr8_name_Str = func14_GetCurrent_Str();
					__debugInfo = "152:\src\DocParser.gbas";
					func13_RemoveCurrent();
					__debugInfo = "153:\src\DocParser.gbas";
					func14_MatchAndRemove("\n", 152, "src\DocParser.gbas");
					__debugInfo = "155:\src\DocParser.gbas";
					func12_ParseDocLang(unref(local5_param_2596.attr4_desc), "ENDPARAM");
					__debugInfo = "157:\src\DocParser.gbas";
					DIMPUSH(local3_doc_2593.attr6_params, local5_param_2596);
					__debugInfo = "149:\src\DocParser.gbas";pool_ParamElement.free(local5_param_2596);
				} else if ((((local17___SelectHelper44__2595) === ("DESC")) ? 1 : 0)) {
					__debugInfo = "159:\src\DocParser.gbas";
					func13_RemoveCurrent();
					__debugInfo = "160:\src\DocParser.gbas";
					func14_MatchAndRemove("\n", 159, "src\DocParser.gbas");
					__debugInfo = "162:\src\DocParser.gbas";
					func12_ParseDocLang(unref(local3_doc_2593.attr4_desc), "ENDDESC");
					__debugInfo = "159:\src\DocParser.gbas";
				} else if ((((local17___SelectHelper44__2595) === ("EXAMPLE")) ? 1 : 0)) {
					__debugInfo = "164:\src\DocParser.gbas";
					func13_RemoveCurrent();
					__debugInfo = "165:\src\DocParser.gbas";
					func14_MatchAndRemove("\n", 164, "src\DocParser.gbas");
					__debugInfo = "167:\src\DocParser.gbas";
					func12_ParseDocLang(unref(local3_doc_2593.attr7_example), "ENDEXAMPLE");
					__debugInfo = "164:\src\DocParser.gbas";
				} else if ((((local17___SelectHelper44__2595) === ("SEE")) ? 1 : 0)) {
					__debugInfo = "169:\src\DocParser.gbas";
					func13_RemoveCurrent();
					__debugInfo = "174:\src\DocParser.gbas";
					do {
						__debugInfo = "172:\src\DocParser.gbas";
						DIMPUSH(local3_doc_2593.attr7_see_Str, func14_GetCurrent_Str());
						__debugInfo = "173:\src\DocParser.gbas";
						func13_RemoveCurrent();
						__debugInfo = "172:\src\DocParser.gbas";
					} while (!(func7_IsToken("\n")));
					__debugInfo = "169:\src\DocParser.gbas";
				} else if ((((local17___SelectHelper44__2595) === ("MODULE")) ? 1 : 0)) {
					__debugInfo = "176:\src\DocParser.gbas";
					func13_RemoveCurrent();
					__debugInfo = "177:\src\DocParser.gbas";
					local3_doc_2593.attr10_module_Str = func14_GetCurrent_Str();
					__debugInfo = "178:\src\DocParser.gbas";
					func13_RemoveCurrent();
					__debugInfo = "179:\src\DocParser.gbas";
					func14_MatchAndRemove("\n", 178, "src\DocParser.gbas");
					__debugInfo = "176:\src\DocParser.gbas";
				} else if ((((local17___SelectHelper44__2595) === ("ENDDOC")) ? 1 : 0)) {
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
		DIMPUSH(global14_Documentations, local3_doc_2593);
		__debugInfo = "189:\src\DocParser.gbas";
		return 0;
		__debugInfo = "132:\src\DocParser.gbas";pool_Documentation.free(local3_doc_2593);
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
			var local1_l_2599 = pool_LangElement.alloc(), local8_lang_Str_2600 = "", local8_text_Str_2601 = "";
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
			local8_lang_Str_2600 = func14_GetCurrent_Str();
			__debugInfo = "201:\src\DocParser.gbas";
			func13_RemoveCurrent();
			__debugInfo = "202:\src\DocParser.gbas";
			local8_text_Str_2601 = MID_Str(func14_GetCurrent_Str(), 1, (((func14_GetCurrent_Str()).length) - (2)));
			__debugInfo = "203:\src\DocParser.gbas";
			func13_RemoveCurrent();
			__debugInfo = "205:\src\DocParser.gbas";
			local1_l_2599.attr8_lang_Str = local8_lang_Str_2600;
			__debugInfo = "206:\src\DocParser.gbas";
			local1_l_2599.attr8_desc_Str = REPLACE_Str(local8_text_Str_2601, (("\\") + ("\"")), "\"");
			__debugInfo = "208:\src\DocParser.gbas";
			DIMPUSH(param5_langs, local1_l_2599);
			__debugInfo = "210:\src\DocParser.gbas";
			func11_RemoveAllNL();
			__debugInfo = "194:\src\DocParser.gbas";pool_LangElement.free(local1_l_2599);
		};
		__debugInfo = "222:\src\DocParser.gbas";
		if ((((BOUNDS(param5_langs, 0)) === (1)) ? 1 : 0)) {
			var local2_l2_2602 = pool_LangElement.alloc();
			__debugInfo = "215:\src\DocParser.gbas";
			local2_l2_2602 = param5_langs.arrAccess(0).values[tmpPositionCache].clone(/* In Assign */);
			__debugInfo = "220:\src\DocParser.gbas";
			if ((((local2_l2_2602.attr8_lang_Str) === ("EN")) ? 1 : 0)) {
				__debugInfo = "217:\src\DocParser.gbas";
				local2_l2_2602.attr8_lang_Str = "DE";
				__debugInfo = "217:\src\DocParser.gbas";
			} else {
				__debugInfo = "219:\src\DocParser.gbas";
				local2_l2_2602.attr8_lang_Str = "EN";
				__debugInfo = "219:\src\DocParser.gbas";
			};
			__debugInfo = "221:\src\DocParser.gbas";
			DIMPUSH(param5_langs, local2_l2_2602);
			__debugInfo = "215:\src\DocParser.gbas";pool_LangElement.free(local2_l2_2602);
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
		var local4_tmpD_2605 = pool_TDatatype.alloc(), local3_pos_2606 = 0.0, local1_d_2607 = pool_TDatatype.alloc();
		__debugInfo = "175:\src\Expression.gbas";
		local4_tmpD_2605 = param8_datatype.clone(/* In Assign */);
		__debugInfo = "180:\src\Expression.gbas";
		local3_pos_2606 = global10_LastExprID;
		__debugInfo = "181:\src\Expression.gbas";
		global10_LastExprID = ((global10_LastExprID) + (1));
		__debugInfo = "188:\src\Expression.gbas";
		if ((((global10_LastExprID) >= (((BOUNDS(global5_Exprs_ref[0], 0)) - (10)))) ? 1 : 0)) {
			__debugInfo = "186:\src\Expression.gbas";
			REDIM(unref(global5_Exprs_ref[0]), [~~(((global10_LastExprID) + (50)))], [pool_TExpr.alloc()] );
			__debugInfo = "186:\src\Expression.gbas";
		};
		__debugInfo = "189:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(~~(local3_pos_2606)).values[tmpPositionCache][0].attr3_Typ = param3_Typ;
		__debugInfo = "192:\src\Expression.gbas";
		local1_d_2607.attr8_Name_Str = local4_tmpD_2605.attr8_Name_Str;
		__debugInfo = "193:\src\Expression.gbas";
		local1_d_2607.attr7_IsArray = local4_tmpD_2605.attr7_IsArray;
		__debugInfo = "194:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(~~(local3_pos_2606)).values[tmpPositionCache][0].attr8_datatype = local1_d_2607.clone(/* In Assign */);
		__debugInfo = "195:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(~~(local3_pos_2606)).values[tmpPositionCache][0].attr2_ID = ~~(local3_pos_2606);
		__debugInfo = "196:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(~~(local3_pos_2606)).values[tmpPositionCache][0].attr5_tokID = global8_Compiler.attr11_currentPosi;
		__debugInfo = "197:\src\Expression.gbas";
		return tryClone(~~(local3_pos_2606));
		__debugInfo = "198:\src\Expression.gbas";
		return 0;
		__debugInfo = "175:\src\Expression.gbas";pool_TDatatype.free(local4_tmpD_2605);pool_TDatatype.free(local1_d_2607);
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
		var local4_Expr_2611 = 0, local8_datatype_2612 = pool_TDatatype.alloc();
		var local4_Left_ref_2609 = [param4_Left];
		var local5_Right_ref_2610 = [param5_Right];
		__debugInfo = "204:\src\Expression.gbas";
		local8_datatype_2612 = func12_CastDatatype(local4_Left_ref_2609, local5_Right_ref_2610).clone(/* In Assign */);
		__debugInfo = "209:\src\Expression.gbas";
		if ((((param2_Op.attr3_Typ) === (3)) ? 1 : 0)) {
			__debugInfo = "208:\src\Expression.gbas";
			local8_datatype_2612 = global11_intDatatype.clone(/* In Assign */);
			__debugInfo = "208:\src\Expression.gbas";
		};
		__debugInfo = "211:\src\Expression.gbas";
		local4_Expr_2611 = func16_CreateExpression(~~(1), local8_datatype_2612);
		__debugInfo = "212:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2611).values[tmpPositionCache][0].attr4_Left = local4_Left_ref_2609[0];
		__debugInfo = "213:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2611).values[tmpPositionCache][0].attr5_Right = local5_Right_ref_2610[0];
		__debugInfo = "214:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2611).values[tmpPositionCache][0].attr2_Op = param2_Op.attr2_ID;
		__debugInfo = "217:\src\Expression.gbas";
		return tryClone(local4_Expr_2611);
		__debugInfo = "218:\src\Expression.gbas";
		return 0;
		__debugInfo = "204:\src\Expression.gbas";pool_TDatatype.free(local8_datatype_2612);
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
		var local4_Expr_2614 = 0;
		__debugInfo = "223:\src\Expression.gbas";
		local4_Expr_2614 = func16_CreateExpression(~~(3), global11_intDatatype);
		__debugInfo = "224:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2614).values[tmpPositionCache][0].attr6_intval = param3_Num;
		__debugInfo = "225:\src\Expression.gbas";
		return tryClone(local4_Expr_2614);
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
		var local4_Expr_2616 = 0;
		__debugInfo = "231:\src\Expression.gbas";
		local4_Expr_2616 = func16_CreateExpression(~~(4), global13_floatDatatype);
		__debugInfo = "232:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2616).values[tmpPositionCache][0].attr8_floatval = param3_Num;
		__debugInfo = "233:\src\Expression.gbas";
		return tryClone(local4_Expr_2616);
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
		var local4_Expr_2618 = 0;
		__debugInfo = "238:\src\Expression.gbas";
		local4_Expr_2618 = func16_CreateExpression(~~(5), global11_strDatatype);
		__debugInfo = "239:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2618).values[tmpPositionCache][0].attr10_strval_Str = param7_Str_Str;
		__debugInfo = "240:\src\Expression.gbas";
		return tryClone(local4_Expr_2618);
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
		var local3_Scp_2620 = 0;
		__debugInfo = "245:\src\Expression.gbas";
		local3_Scp_2620 = func16_CreateExpression(~~(2), global12_voidDatatype);
		__debugInfo = "246:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local3_Scp_2620).values[tmpPositionCache][0].attr10_SuperScope = global8_Compiler.attr12_CurrentScope;
		__debugInfo = "247:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local3_Scp_2620).values[tmpPositionCache][0].attr6_ScpTyp = param6_ScpTyp;
		__debugInfo = "249:\src\Expression.gbas";
		return tryClone(local3_Scp_2620);
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
		var local4_Expr_2623 = 0;
		__debugInfo = "256:\src\Expression.gbas";
		local4_Expr_2623 = func16_CreateExpression(~~(6), global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr8_datatype);
		__debugInfo = "257:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2623).values[tmpPositionCache][0].attr6_Params = param6_Params.clone(/* In Assign */);
		__debugInfo = "258:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2623).values[tmpPositionCache][0].attr4_func = param4_func;
		__debugInfo = "259:\src\Expression.gbas";
		return tryClone(local4_Expr_2623);
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
			var local4_Expr_2625 = 0;
			__debugInfo = "277:\src\Expression.gbas";
			local4_Expr_2625 = func16_CreateExpression(~~(9), global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_vari).values[tmpPositionCache][0].attr8_datatype);
			__debugInfo = "278:\src\Expression.gbas";
			global5_Exprs_ref[0].arrAccess(local4_Expr_2625).values[tmpPositionCache][0].attr4_vari = param4_vari;
			__debugInfo = "279:\src\Expression.gbas";
			return tryClone(local4_Expr_2625);
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
		var local4_Expr_2628 = 0;
		__debugInfo = "285:\src\Expression.gbas";
		local4_Expr_2628 = func16_CreateExpression(~~(10), global12_voidDatatype);
		__debugInfo = "286:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2628).values[tmpPositionCache][0].attr4_vari = param4_Vari;
		__debugInfo = "287:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2628).values[tmpPositionCache][0].attr5_Right = param5_Right;
		__debugInfo = "288:\src\Expression.gbas";
		return tryClone(local4_Expr_2628);
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
		var local4_Expr_2631 = 0;
		__debugInfo = "294:\src\Expression.gbas";
		local4_Expr_2631 = func16_CreateExpression(~~(11), global5_Exprs_ref[0].arrAccess(param5_Array).values[tmpPositionCache][0].attr8_datatype);
		__debugInfo = "295:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2631).values[tmpPositionCache][0].attr5_array = param5_Array;
		__debugInfo = "296:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2631).values[tmpPositionCache][0].attr4_dims = param4_Dims.clone(/* In Assign */);
		__debugInfo = "298:\src\Expression.gbas";
		return tryClone(local4_Expr_2631);
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
		var local4_Expr_2634 = 0;
		__debugInfo = "305:\src\Expression.gbas";
		local4_Expr_2634 = func16_CreateExpression(~~(12), global5_Exprs_ref[0].arrAccess(param5_Array).values[tmpPositionCache][0].attr8_datatype);
		__debugInfo = "306:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2634).values[tmpPositionCache][0].attr5_array = param5_Array;
		__debugInfo = "307:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2634).values[tmpPositionCache][0].attr4_dims = param4_Dims.clone(/* In Assign */);
		__debugInfo = "309:\src\Expression.gbas";
		return tryClone(local4_Expr_2634);
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
		var local7_tmpData_2637 = pool_TDatatype.alloc(), local4_Expr_2638 = 0;
		__debugInfo = "316:\src\Expression.gbas";
		local7_tmpData_2637 = global5_Exprs_ref[0].arrAccess(param5_Array).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
		__debugInfo = "317:\src\Expression.gbas";
		if (((((((global5_Exprs_ref[0].arrAccess(param5_Array).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) && (global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(param5_Array, 1)).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray)) ? 1 : 0)) && (BOUNDS(param4_Dims, 0))) ? 1 : 0)) {
			__debugInfo = "317:\src\Expression.gbas";
			local7_tmpData_2637.attr7_IsArray = 0;
			__debugInfo = "317:\src\Expression.gbas";
		};
		__debugInfo = "318:\src\Expression.gbas";
		local4_Expr_2638 = func16_CreateExpression(~~(13), local7_tmpData_2637);
		__debugInfo = "319:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2638).values[tmpPositionCache][0].attr5_array = param5_Array;
		__debugInfo = "320:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2638).values[tmpPositionCache][0].attr4_dims = param4_Dims.clone(/* In Assign */);
		__debugInfo = "321:\src\Expression.gbas";
		return tryClone(local4_Expr_2638);
		__debugInfo = "322:\src\Expression.gbas";
		return 0;
		__debugInfo = "316:\src\Expression.gbas";pool_array.free(param4_Dims);pool_TDatatype.free(local7_tmpData_2637);
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
		var local4_Expr_2640 = 0;
		__debugInfo = "327:\src\Expression.gbas";
		local4_Expr_2640 = func16_CreateExpression(~~(15), global11_intDatatype);
		__debugInfo = "328:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2640).values[tmpPositionCache][0].attr4_expr = param4_expr;
		__debugInfo = "329:\src\Expression.gbas";
		return tryClone(local4_Expr_2640);
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
		var local4_Expr_2642 = 0;
		__debugInfo = "334:\src\Expression.gbas";
		local4_Expr_2642 = func16_CreateExpression(~~(16), global13_floatDatatype);
		__debugInfo = "335:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2642).values[tmpPositionCache][0].attr4_expr = param4_expr;
		__debugInfo = "336:\src\Expression.gbas";
		return tryClone(local4_Expr_2642);
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
		var local4_Expr_2644 = 0;
		__debugInfo = "341:\src\Expression.gbas";
		local4_Expr_2644 = func16_CreateExpression(~~(17), global11_strDatatype);
		__debugInfo = "342:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2644).values[tmpPositionCache][0].attr4_expr = param4_expr;
		__debugInfo = "343:\src\Expression.gbas";
		return tryClone(local4_Expr_2644);
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
			var local9_ONextExpr_2647 = 0;
			__debugInfo = "354:\src\Expression.gbas";
			local9_ONextExpr_2647 = param8_NextExpr;
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
				return tryClone(local9_ONextExpr_2647);
				__debugInfo = "357:\src\Expression.gbas";
			} else {
				var local4_Expr_2648 = 0;
				__debugInfo = "360:\src\Expression.gbas";
				param8_NextExpr = local9_ONextExpr_2647;
				__debugInfo = "361:\src\Expression.gbas";
				local4_Expr_2648 = func16_CreateExpression(~~(18), global5_Exprs_ref[0].arrAccess(param8_NextExpr).values[tmpPositionCache][0].attr8_datatype);
				__debugInfo = "362:\src\Expression.gbas";
				global5_Exprs_ref[0].arrAccess(local4_Expr_2648).values[tmpPositionCache][0].attr4_expr = param4_expr;
				__debugInfo = "363:\src\Expression.gbas";
				global5_Exprs_ref[0].arrAccess(local4_Expr_2648).values[tmpPositionCache][0].attr8_nextExpr = param8_NextExpr;
				__debugInfo = "364:\src\Expression.gbas";
				return tryClone(local4_Expr_2648);
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
		var local4_Expr_2650 = 0;
		__debugInfo = "371:\src\Expression.gbas";
		local4_Expr_2650 = func16_CreateExpression(~~(19), global12_voidDatatype);
		__debugInfo = "372:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2650).values[tmpPositionCache][0].attr4_expr = param4_expr;
		__debugInfo = "374:\src\Expression.gbas";
		return tryClone(local4_Expr_2650);
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
		var local4_Expr_2652 = 0;
		__debugInfo = "379:\src\Expression.gbas";
		local4_Expr_2652 = func16_CreateExpression(~~(20), global12_voidDatatype);
		__debugInfo = "380:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2652).values[tmpPositionCache][0].attr8_Name_Str = param8_Name_Str;
		__debugInfo = "381:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2652).values[tmpPositionCache][0].attr3_Scp = global8_Compiler.attr12_CurrentScope;
		__debugInfo = "382:\src\Expression.gbas";
		return tryClone(local4_Expr_2652);
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
		var local4_Expr_2654 = 0;
		__debugInfo = "387:\src\Expression.gbas";
		local4_Expr_2654 = func16_CreateExpression(~~(21), global12_voidDatatype);
		__debugInfo = "388:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2654).values[tmpPositionCache][0].attr8_Name_Str = param8_Name_Str;
		__debugInfo = "389:\src\Expression.gbas";
		return tryClone(local4_Expr_2654);
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
		var local4_Func_2658 = 0, local4_Expr_2659 = 0;
		__debugInfo = "399:\src\Expression.gbas";
		local4_Func_2658 = func14_SearchPrototyp(global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str);
		__debugInfo = "400:\src\Expression.gbas";
		if ((((local4_Func_2658) === (-(1))) ? 1 : 0)) {
			__debugInfo = "400:\src\Expression.gbas";
			func5_Error((((("Internal error (could not find prototype: ") + (global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) + (")")), 399, "src\Expression.gbas");
			__debugInfo = "400:\src\Expression.gbas";
		};
		__debugInfo = "401:\src\Expression.gbas";
		local4_Expr_2659 = func16_CreateExpression(~~(23), global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr8_datatype);
		__debugInfo = "402:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2659).values[tmpPositionCache][0].attr4_expr = param4_expr;
		__debugInfo = "403:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2659).values[tmpPositionCache][0].attr6_Params = param6_Params.clone(/* In Assign */);
		__debugInfo = "404:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2659).values[tmpPositionCache][0].attr4_func = local4_Func_2658;
		__debugInfo = "405:\src\Expression.gbas";
		return tryClone(local4_Expr_2659);
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
		var local4_Expr_2663 = 0;
		__debugInfo = "410:\src\Expression.gbas";
		local4_Expr_2663 = func16_CreateExpression(~~(24), global12_voidDatatype);
		__debugInfo = "411:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2663).values[tmpPositionCache][0].attr10_Conditions = param5_Conds.clone(/* In Assign */);
		__debugInfo = "412:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2663).values[tmpPositionCache][0].attr6_Scopes = param4_Scps.clone(/* In Assign */);
		__debugInfo = "413:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2663).values[tmpPositionCache][0].attr9_elseScope = param7_elseScp;
		__debugInfo = "414:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2663).values[tmpPositionCache][0].attr5_dummy = func21_CreateDummyExpression();
		__debugInfo = "415:\src\Expression.gbas";
		return tryClone(local4_Expr_2663);
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
		var local4_Expr_2666 = 0;
		__debugInfo = "420:\src\Expression.gbas";
		local4_Expr_2666 = func16_CreateExpression(~~(25), global12_voidDatatype);
		__debugInfo = "421:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2666).values[tmpPositionCache][0].attr4_expr = param4_expr;
		__debugInfo = "422:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2666).values[tmpPositionCache][0].attr3_Scp = param3_Scp;
		__debugInfo = "423:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2666).values[tmpPositionCache][0].attr5_dummy = func21_CreateDummyExpression();
		__debugInfo = "424:\src\Expression.gbas";
		return tryClone(local4_Expr_2666);
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
		var local4_Expr_2669 = 0;
		__debugInfo = "429:\src\Expression.gbas";
		local4_Expr_2669 = func16_CreateExpression(~~(26), global12_voidDatatype);
		__debugInfo = "430:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2669).values[tmpPositionCache][0].attr4_expr = param4_expr;
		__debugInfo = "431:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2669).values[tmpPositionCache][0].attr3_Scp = param3_Scp;
		__debugInfo = "432:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2669).values[tmpPositionCache][0].attr5_dummy = func21_CreateDummyExpression();
		__debugInfo = "433:\src\Expression.gbas";
		return tryClone(local4_Expr_2669);
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
		var local4_Expr_2675 = 0;
		__debugInfo = "438:\src\Expression.gbas";
		local4_Expr_2675 = func16_CreateExpression(~~(27), global12_voidDatatype);
		__debugInfo = "439:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2675).values[tmpPositionCache][0].attr7_varExpr = param7_varExpr;
		__debugInfo = "440:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2675).values[tmpPositionCache][0].attr6_toExpr = param6_toExpr;
		__debugInfo = "441:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2675).values[tmpPositionCache][0].attr8_stepExpr = param8_stepExpr;
		__debugInfo = "442:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2675).values[tmpPositionCache][0].attr3_Scp = param3_Scp;
		__debugInfo = "443:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2675).values[tmpPositionCache][0].attr5_hasTo = param5_hasTo;
		__debugInfo = "444:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2675).values[tmpPositionCache][0].attr5_dummy = func21_CreateDummyExpression();
		__debugInfo = "445:\src\Expression.gbas";
		return tryClone(local4_Expr_2675);
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
		var local4_Expr_2679 = 0;
		__debugInfo = "450:\src\Expression.gbas";
		local4_Expr_2679 = func16_CreateExpression(~~(38), global12_voidDatatype);
		__debugInfo = "451:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2679).values[tmpPositionCache][0].attr7_varExpr = param7_varExpr;
		__debugInfo = "452:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2679).values[tmpPositionCache][0].attr6_inExpr = param6_inExpr;
		__debugInfo = "453:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2679).values[tmpPositionCache][0].attr3_Scp = param3_Scp;
		__debugInfo = "454:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2679).values[tmpPositionCache][0].attr5_dummy = func21_CreateDummyExpression();
		__debugInfo = "456:\src\Expression.gbas";
		return tryClone(local4_Expr_2679);
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
		var local4_Expr_2683 = 0;
		__debugInfo = "471:\src\Expression.gbas";
		local4_Expr_2683 = func16_CreateExpression(~~(31), global12_voidDatatype);
		__debugInfo = "472:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2683).values[tmpPositionCache][0].attr3_Scp = param6_tryScp;
		__debugInfo = "473:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2683).values[tmpPositionCache][0].attr8_catchScp = param7_ctchScp;
		__debugInfo = "474:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2683).values[tmpPositionCache][0].attr4_vari = param4_vari;
		__debugInfo = "476:\src\Expression.gbas";
		return tryClone(local4_Expr_2683);
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
		var local4_Expr_2685 = 0;
		__debugInfo = "481:\src\Expression.gbas";
		local4_Expr_2685 = func16_CreateExpression(~~(32), global12_voidDatatype);
		__debugInfo = "482:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2685).values[tmpPositionCache][0].attr4_expr = param5_value;
		__debugInfo = "483:\src\Expression.gbas";
		return tryClone(local4_Expr_2685);
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
		var local4_Expr_2687 = 0;
		__debugInfo = "488:\src\Expression.gbas";
		local4_Expr_2687 = func16_CreateExpression(~~(33), global12_voidDatatype);
		__debugInfo = "489:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2687).values[tmpPositionCache][0].attr8_Name_Str = param8_Name_Str;
		__debugInfo = "490:\src\Expression.gbas";
		return tryClone(local4_Expr_2687);
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
		var local4_Expr_2689 = 0;
		__debugInfo = "495:\src\Expression.gbas";
		local4_Expr_2689 = func16_CreateExpression(~~(34), global12_voidDatatype);
		__debugInfo = "496:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2689).values[tmpPositionCache][0].attr5_Reads = param5_Reads.clone(/* In Assign */);
		__debugInfo = "497:\src\Expression.gbas";
		return tryClone(local4_Expr_2689);
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
				var local17___SelectHelper45__2691 = "";
				__debugInfo = "505:\src\Expression.gbas";
				local17___SelectHelper45__2691 = param8_datatype.attr8_Name_Str;
				__debugInfo = "516:\src\Expression.gbas";
				if ((((local17___SelectHelper45__2691) === ("int")) ? 1 : 0)) {
					__debugInfo = "507:\src\Expression.gbas";
					return tryClone(func19_CreateIntExpression(0));
					__debugInfo = "507:\src\Expression.gbas";
				} else if ((((local17___SelectHelper45__2691) === ("float")) ? 1 : 0)) {
					__debugInfo = "509:\src\Expression.gbas";
					return tryClone(func21_CreateFloatExpression(0));
					__debugInfo = "509:\src\Expression.gbas";
				} else if ((((local17___SelectHelper45__2691) === ("string")) ? 1 : 0)) {
					__debugInfo = "511:\src\Expression.gbas";
					return tryClone(func19_CreateStrExpression("\"\""));
					__debugInfo = "511:\src\Expression.gbas";
				} else if ((((local17___SelectHelper45__2691) === ("void")) ? 1 : 0)) {
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
		var local4_Expr_2694 = 0;
		__debugInfo = "522:\src\Expression.gbas";
		local4_Expr_2694 = func16_CreateExpression(~~(36), param8_datatype);
		__debugInfo = "523:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2694).values[tmpPositionCache][0].attr4_dims = param4_dims.clone(/* In Assign */);
		__debugInfo = "525:\src\Expression.gbas";
		return tryClone(local4_Expr_2694);
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
		var local4_Expr_2697 = 0;
		__debugInfo = "530:\src\Expression.gbas";
		local4_Expr_2697 = func16_CreateExpression(~~(37), global12_voidDatatype);
		__debugInfo = "531:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2697).values[tmpPositionCache][0].attr4_vari = param4_vari;
		__debugInfo = "532:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2697).values[tmpPositionCache][0].attr4_expr = param4_expr;
		__debugInfo = "534:\src\Expression.gbas";
		return tryClone(local4_Expr_2697);
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
		var local4_Expr_2700 = 0;
		__debugInfo = "539:\src\Expression.gbas";
		local4_Expr_2700 = func16_CreateExpression(~~(39), global12_voidDatatype);
		__debugInfo = "540:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2700).values[tmpPositionCache][0].attr4_vari = param4_Vari;
		__debugInfo = "541:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2700).values[tmpPositionCache][0].attr4_expr = param7_AddExpr;
		__debugInfo = "542:\src\Expression.gbas";
		return tryClone(local4_Expr_2700);
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
		var local4_Expr_2703 = 0;
		__debugInfo = "548:\src\Expression.gbas";
		local4_Expr_2703 = func16_CreateExpression(~~(40), global12_voidDatatype);
		__debugInfo = "549:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2703).values[tmpPositionCache][0].attr4_vari = param4_vari;
		__debugInfo = "550:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2703).values[tmpPositionCache][0].attr4_expr = param4_expr;
		__debugInfo = "551:\src\Expression.gbas";
		return tryClone(local4_Expr_2703);
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
		var local4_Expr_2706 = 0;
		__debugInfo = "556:\src\Expression.gbas";
		local4_Expr_2706 = func16_CreateExpression(~~(41), global11_intDatatype);
		__debugInfo = "557:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2706).values[tmpPositionCache][0].attr4_expr = param4_expr;
		__debugInfo = "558:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2706).values[tmpPositionCache][0].attr4_kern = param4_kern;
		__debugInfo = "559:\src\Expression.gbas";
		return tryClone(local4_Expr_2706);
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
		var local4_Expr_2709 = 0;
		__debugInfo = "564:\src\Expression.gbas";
		local4_Expr_2709 = func16_CreateExpression(~~(42), global12_voidDatatype);
		__debugInfo = "565:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2709).values[tmpPositionCache][0].attr5_array = param5_array;
		__debugInfo = "566:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2709).values[tmpPositionCache][0].attr5_Exprs = param5_exprs.clone(/* In Assign */);
		__debugInfo = "567:\src\Expression.gbas";
		return tryClone(local4_Expr_2709);
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
		var local4_Expr_2712 = 0;
		__debugInfo = "577:\src\Expression.gbas";
		local4_Expr_2712 = func16_CreateExpression(~~(44), global12_voidDatatype);
		__debugInfo = "578:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2712).values[tmpPositionCache][0].attr5_array = param5_array;
		__debugInfo = "579:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2712).values[tmpPositionCache][0].attr8_position = param8_position;
		__debugInfo = "580:\src\Expression.gbas";
		return tryClone(local4_Expr_2712);
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
		var local4_Expr_2715 = 0;
		__debugInfo = "585:\src\Expression.gbas";
		local4_Expr_2715 = func16_CreateExpression(~~(45), global11_intDatatype);
		__debugInfo = "586:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2715).values[tmpPositionCache][0].attr5_array = param4_expr;
		__debugInfo = "587:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2715).values[tmpPositionCache][0].attr8_position = param8_position;
		__debugInfo = "588:\src\Expression.gbas";
		return tryClone(local4_Expr_2715);
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
		var local4_Expr_2717 = 0;
		__debugInfo = "593:\src\Expression.gbas";
		local4_Expr_2717 = func16_CreateExpression(~~(46), global13_floatDatatype);
		__debugInfo = "594:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2717).values[tmpPositionCache][0].attr4_expr = param4_expr;
		__debugInfo = "595:\src\Expression.gbas";
		return tryClone(local4_Expr_2717);
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
		var local4_Expr_2719 = 0;
		__debugInfo = "606:\src\Expression.gbas";
		local4_Expr_2719 = func16_CreateExpression(~~(48), global11_intDatatype);
		__debugInfo = "607:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2719).values[tmpPositionCache][0].attr4_func = param4_func;
		__debugInfo = "608:\src\Expression.gbas";
		return tryClone(local4_Expr_2719);
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
		var local4_Expr_2721 = 0;
		__debugInfo = "614:\src\Expression.gbas";
		local4_Expr_2721 = func16_CreateExpression(~~(49), global12_voidDatatype);
		__debugInfo = "615:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2721).values[tmpPositionCache][0].attr4_expr = param4_expr;
		__debugInfo = "616:\src\Expression.gbas";
		return tryClone(local4_Expr_2721);
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
		var local4_Expr_2723 = 0;
		__debugInfo = "622:\src\Expression.gbas";
		local4_Expr_2723 = func16_CreateExpression(~~(50), global12_voidDatatype);
		__debugInfo = "623:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2723).values[tmpPositionCache][0].attr4_expr = param4_expr;
		__debugInfo = "624:\src\Expression.gbas";
		return tryClone(local4_Expr_2723);
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
		var local4_Expr_2727 = 0;
		__debugInfo = "629:\src\Expression.gbas";
		local4_Expr_2727 = func16_CreateExpression(~~(51), global5_Exprs_ref[0].arrAccess(param6_onTrue).values[tmpPositionCache][0].attr8_datatype);
		__debugInfo = "630:\src\Expression.gbas";
		DIMDATA(global5_Exprs_ref[0].arrAccess(local4_Expr_2727).values[tmpPositionCache][0].attr10_Conditions, [param4_Cond]);
		__debugInfo = "631:\src\Expression.gbas";
		DIMDATA(global5_Exprs_ref[0].arrAccess(local4_Expr_2727).values[tmpPositionCache][0].attr6_Scopes, [param6_onTrue]);
		__debugInfo = "632:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2727).values[tmpPositionCache][0].attr9_elseScope = param7_onFalse;
		__debugInfo = "634:\src\Expression.gbas";
		return tryClone(local4_Expr_2727);
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
		var local4_Expr_2729 = 0;
		__debugInfo = "638:\src\Expression.gbas";
		local4_Expr_2729 = func16_CreateExpression(~~(52), global12_voidDatatype);
		__debugInfo = "646:\src\Expression.gbas";
		if ((((REVINSTR(param8_Path_Str, ".", -(1))) !== (-(1))) ? 1 : 0)) {
			__debugInfo = "641:\src\Expression.gbas";
			{
				var local17___SelectHelper46__2730 = "";
				__debugInfo = "641:\src\Expression.gbas";
				local17___SelectHelper46__2730 = MID_Str(param8_Path_Str, ((REVINSTR(param8_Path_Str, ".", -(1))) + (1)), -(1));
				__debugInfo = "645:\src\Expression.gbas";
				if ((((local17___SelectHelper46__2730) === ("js")) ? 1 : 0)) {
					
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
		global5_Exprs_ref[0].arrAccess(local4_Expr_2729).values[tmpPositionCache][0].attr8_Name_Str = param8_Path_Str;
		__debugInfo = "648:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2729).values[tmpPositionCache][0].attr11_Content_Str = func12_LoadFile_Str(param8_Path_Str);
		__debugInfo = "650:\src\Expression.gbas";
		return tryClone(local4_Expr_2729);
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
		var local1_d_2732 = pool_TDatatype.alloc();
		__debugInfo = "656:\src\Expression.gbas";
		local1_d_2732.attr7_IsArray = 0;
		__debugInfo = "657:\src\Expression.gbas";
		local1_d_2732.attr8_Name_Str = global8_Compiler.attr5_Types_ref[0].arrAccess(param3_typ).values[tmpPositionCache][0].attr8_Name_Str;
		__debugInfo = "658:\src\Expression.gbas";
		return tryClone(func16_CreateExpression(~~(53), local1_d_2732));
		__debugInfo = "659:\src\Expression.gbas";
		return 0;
		__debugInfo = "656:\src\Expression.gbas";pool_TDatatype.free(local1_d_2732);
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
		var local1_d_2735 = pool_TDatatype.alloc(), local4_Expr_2736 = 0;
		__debugInfo = "664:\src\Expression.gbas";
		local1_d_2735.attr7_IsArray = 0;
		__debugInfo = "665:\src\Expression.gbas";
		local1_d_2735.attr8_Name_Str = param7_Obj_Str;
		__debugInfo = "666:\src\Expression.gbas";
		local4_Expr_2736 = func16_CreateExpression(~~(54), local1_d_2735);
		__debugInfo = "667:\src\Expression.gbas";
		global5_Exprs_ref[0].arrAccess(local4_Expr_2736).values[tmpPositionCache][0].attr4_expr = param4_expr;
		__debugInfo = "669:\src\Expression.gbas";
		return tryClone(local4_Expr_2736);
		__debugInfo = "670:\src\Expression.gbas";
		return 0;
		__debugInfo = "664:\src\Expression.gbas";pool_TDatatype.free(local1_d_2735);
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
		var local2_KV_1893 = pool_KeyValue.alloc(), local4_hash_1894 = 0, alias6_Bucket_ref_1895 = [pool_Bucket.alloc()];
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
		local2_KV_1893.attr7_Key_Str = param7_Key_Str;
		__debugInfo = "41:\src\Utils\Hashmap.gbas";
		local2_KV_1893.attr5_Value = param5_Value;
		__debugInfo = "43:\src\Utils\Hashmap.gbas";
		local4_hash_1894 = func7_HashStr(param7_Key_Str, ((BOUNDS(param4_self.attr7_Buckets_ref[0], 0)) - (1)));
		__debugInfo = "44:\src\Utils\Hashmap.gbas";
		alias6_Bucket_ref_1895 = param4_self.attr7_Buckets_ref[0].arrAccess(local4_hash_1894).values[tmpPositionCache] /* ALIAS */;
		__debugInfo = "55:\src\Utils\Hashmap.gbas";
		if (alias6_Bucket_ref_1895[0].attr3_Set) {
			__debugInfo = "49:\src\Utils\Hashmap.gbas";
			if ((((BOUNDS(alias6_Bucket_ref_1895[0].attr8_Elements, 0)) === (0)) ? 1 : 0)) {
				__debugInfo = "48:\src\Utils\Hashmap.gbas";
				DIMPUSH(alias6_Bucket_ref_1895[0].attr8_Elements, alias6_Bucket_ref_1895[0].attr7_Element);
				__debugInfo = "48:\src\Utils\Hashmap.gbas";
			};
			__debugInfo = "51:\src\Utils\Hashmap.gbas";
			DIMPUSH(alias6_Bucket_ref_1895[0].attr8_Elements, local2_KV_1893);
			__debugInfo = "49:\src\Utils\Hashmap.gbas";
		} else {
			__debugInfo = "53:\src\Utils\Hashmap.gbas";
			alias6_Bucket_ref_1895[0].attr3_Set = 1;
			__debugInfo = "54:\src\Utils\Hashmap.gbas";
			alias6_Bucket_ref_1895[0].attr7_Element = local2_KV_1893.clone(/* In Assign */);
			__debugInfo = "53:\src\Utils\Hashmap.gbas";
		};
		__debugInfo = "56:\src\Utils\Hashmap.gbas";
		return 0;
		__debugInfo = "28:\src\Utils\Hashmap.gbas";pool_KeyValue.free(local2_KV_1893);pool_Bucket.free(alias6_Bucket_ref_1895);
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
		var local5_Value_ref_1899 = [0];
		__debugInfo = "61:\src\Utils\Hashmap.gbas";
		return tryClone((param4_self).GetValue(param7_Key_Str, local5_Value_ref_1899));
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
		var local4_hash_1904 = 0, alias6_Bucket_ref_1905 = [pool_Bucket.alloc()];
		__debugInfo = "66:\src\Utils\Hashmap.gbas";
		local4_hash_1904 = func7_HashStr(param7_Key_Str, ((BOUNDS(param4_self.attr7_Buckets_ref[0], 0)) - (1)));
		__debugInfo = "67:\src\Utils\Hashmap.gbas";
		if ((((local4_hash_1904) >= (BOUNDS(param4_self.attr7_Buckets_ref[0], 0))) ? 1 : 0)) {
			__debugInfo = "67:\src\Utils\Hashmap.gbas";
			return tryClone(0);
			__debugInfo = "67:\src\Utils\Hashmap.gbas";
		};
		__debugInfo = "68:\src\Utils\Hashmap.gbas";
		alias6_Bucket_ref_1905 = param4_self.attr7_Buckets_ref[0].arrAccess(local4_hash_1904).values[tmpPositionCache] /* ALIAS */;
		__debugInfo = "90:\src\Utils\Hashmap.gbas";
		if (alias6_Bucket_ref_1905[0].attr3_Set) {
			__debugInfo = "87:\src\Utils\Hashmap.gbas";
			if ((((BOUNDS(alias6_Bucket_ref_1905[0].attr8_Elements, 0)) === (0)) ? 1 : 0)) {
				__debugInfo = "77:\src\Utils\Hashmap.gbas";
				if ((((alias6_Bucket_ref_1905[0].attr7_Element.attr7_Key_Str) !== (param7_Key_Str)) ? 1 : 0)) {
					__debugInfo = "72:\src\Utils\Hashmap.gbas";
					param5_Value_ref[0] = 0;
					__debugInfo = "73:\src\Utils\Hashmap.gbas";
					return tryClone(0);
					__debugInfo = "72:\src\Utils\Hashmap.gbas";
				} else {
					__debugInfo = "75:\src\Utils\Hashmap.gbas";
					param5_Value_ref[0] = alias6_Bucket_ref_1905[0].attr7_Element.attr5_Value;
					__debugInfo = "76:\src\Utils\Hashmap.gbas";
					return 1;
					__debugInfo = "75:\src\Utils\Hashmap.gbas";
				};
				__debugInfo = "77:\src\Utils\Hashmap.gbas";
			} else {
				__debugInfo = "78:\src\Utils\Hashmap.gbas";
				{
					var local1_i_1906 = 0.0;
					__debugInfo = "85:\src\Utils\Hashmap.gbas";
					for (local1_i_1906 = 0;toCheck(local1_i_1906, ((BOUNDS(alias6_Bucket_ref_1905[0].attr8_Elements, 0)) - (1)), 1);local1_i_1906 += 1) {
						__debugInfo = "84:\src\Utils\Hashmap.gbas";
						if ((((alias6_Bucket_ref_1905[0].attr8_Elements.arrAccess(~~(local1_i_1906)).values[tmpPositionCache].attr7_Key_Str) === (param7_Key_Str)) ? 1 : 0)) {
							__debugInfo = "82:\src\Utils\Hashmap.gbas";
							param5_Value_ref[0] = alias6_Bucket_ref_1905[0].attr8_Elements.arrAccess(~~(local1_i_1906)).values[tmpPositionCache].attr5_Value;
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
		__debugInfo = "66:\src\Utils\Hashmap.gbas";pool_Bucket.free(alias6_Bucket_ref_1905);
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
		var local4_hash_1910 = 0, alias6_Bucket_ref_1911 = [pool_Bucket.alloc()];
		__debugInfo = "95:\src\Utils\Hashmap.gbas";
		local4_hash_1910 = func7_HashStr(param7_Key_Str, ((BOUNDS(param4_self.attr7_Buckets_ref[0], 0)) - (1)));
		__debugInfo = "96:\src\Utils\Hashmap.gbas";
		alias6_Bucket_ref_1911 = param4_self.attr7_Buckets_ref[0].arrAccess(local4_hash_1910).values[tmpPositionCache] /* ALIAS */;
		__debugInfo = "124:\src\Utils\Hashmap.gbas";
		if (alias6_Bucket_ref_1911[0].attr3_Set) {
			__debugInfo = "121:\src\Utils\Hashmap.gbas";
			if ((((alias6_Bucket_ref_1911[0].attr7_Element.attr7_Key_Str) === (param7_Key_Str)) ? 1 : 0)) {
				var local1_e_1912 = pool_KeyValue.alloc();
				__debugInfo = "100:\src\Utils\Hashmap.gbas";
				param4_self.attr8_Elements+=-1;
				__debugInfo = "102:\src\Utils\Hashmap.gbas";
				alias6_Bucket_ref_1911[0].attr7_Element = local1_e_1912.clone(/* In Assign */);
				__debugInfo = "103:\src\Utils\Hashmap.gbas";
				alias6_Bucket_ref_1911[0].attr3_Set = 0;
				__debugInfo = "100:\src\Utils\Hashmap.gbas";pool_KeyValue.free(local1_e_1912);
			} else {
				var local4_Find_1913 = 0;
				__debugInfo = "105:\src\Utils\Hashmap.gbas";
				local4_Find_1913 = 0;
				__debugInfo = "105:\src\Utils\Hashmap.gbas";
				{
					var local1_i_1914 = 0.0;
					__debugInfo = "112:\src\Utils\Hashmap.gbas";
					for (local1_i_1914 = 0;toCheck(local1_i_1914, ((BOUNDS(alias6_Bucket_ref_1911[0].attr8_Elements, 0)) - (1)), 1);local1_i_1914 += 1) {
						__debugInfo = "111:\src\Utils\Hashmap.gbas";
						if ((((alias6_Bucket_ref_1911[0].attr8_Elements.arrAccess(~~(local1_i_1914)).values[tmpPositionCache].attr7_Key_Str) === (param7_Key_Str)) ? 1 : 0)) {
							__debugInfo = "108:\src\Utils\Hashmap.gbas";
							local4_Find_1913 = 1;
							__debugInfo = "109:\src\Utils\Hashmap.gbas";
							DIMDEL(alias6_Bucket_ref_1911[0].attr8_Elements, ~~(local1_i_1914));
							__debugInfo = "110:\src\Utils\Hashmap.gbas";
							break;
							__debugInfo = "108:\src\Utils\Hashmap.gbas";
						};
						__debugInfo = "111:\src\Utils\Hashmap.gbas";
					};
					__debugInfo = "112:\src\Utils\Hashmap.gbas";
				};
				__debugInfo = "116:\src\Utils\Hashmap.gbas";
				if ((((BOUNDS(alias6_Bucket_ref_1911[0].attr8_Elements, 0)) === (1)) ? 1 : 0)) {
					__debugInfo = "114:\src\Utils\Hashmap.gbas";
					alias6_Bucket_ref_1911[0].attr7_Element = alias6_Bucket_ref_1911[0].attr8_Elements.arrAccess(0).values[tmpPositionCache].clone(/* In Assign */);
					__debugInfo = "115:\src\Utils\Hashmap.gbas";
					DIMDEL(alias6_Bucket_ref_1911[0].attr8_Elements, 0);
					__debugInfo = "114:\src\Utils\Hashmap.gbas";
				};
				__debugInfo = "118:\src\Utils\Hashmap.gbas";
				if (local4_Find_1913) {
					__debugInfo = "118:\src\Utils\Hashmap.gbas";
					param4_self.attr8_Elements+=-1;
					__debugInfo = "118:\src\Utils\Hashmap.gbas";
				};
				__debugInfo = "120:\src\Utils\Hashmap.gbas";
				return tryClone(local4_Find_1913);
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
		__debugInfo = "95:\src\Utils\Hashmap.gbas";pool_Bucket.free(alias6_Bucket_ref_1911);
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
			var local1_i_1918 = 0.0;
			__debugInfo = "142:\src\Utils\Hashmap.gbas";
			for (local1_i_1918 = 0;toCheck(local1_i_1918, ((BOUNDS(param4_self.attr7_Buckets_ref[0], 0)) - (1)), 1);local1_i_1918 += 1) {
				var alias1_B_ref_1919 = [pool_Bucket.alloc()];
				__debugInfo = "132:\src\Utils\Hashmap.gbas";
				alias1_B_ref_1919 = param4_self.attr7_Buckets_ref[0].arrAccess(~~(local1_i_1918)).values[tmpPositionCache] /* ALIAS */;
				__debugInfo = "141:\src\Utils\Hashmap.gbas";
				if (alias1_B_ref_1919[0].attr3_Set) {
					__debugInfo = "140:\src\Utils\Hashmap.gbas";
					if (BOUNDS(alias1_B_ref_1919[0].attr8_Elements, 0)) {
						__debugInfo = "134:\src\Utils\Hashmap.gbas";
						{
							var local1_j_1920 = 0.0;
							__debugInfo = "137:\src\Utils\Hashmap.gbas";
							for (local1_j_1920 = 0;toCheck(local1_j_1920, ((BOUNDS(alias1_B_ref_1919[0].attr8_Elements, 0)) - (1)), 1);local1_j_1920 += 1) {
								__debugInfo = "136:\src\Utils\Hashmap.gbas";
								DIMPUSH(param5_Array, alias1_B_ref_1919[0].attr8_Elements.arrAccess(~~(local1_j_1920)).values[tmpPositionCache]);
								__debugInfo = "136:\src\Utils\Hashmap.gbas";
							};
							__debugInfo = "137:\src\Utils\Hashmap.gbas";
						};
						__debugInfo = "134:\src\Utils\Hashmap.gbas";
					} else {
						__debugInfo = "139:\src\Utils\Hashmap.gbas";
						DIMPUSH(param5_Array, alias1_B_ref_1919[0].attr7_Element);
						__debugInfo = "139:\src\Utils\Hashmap.gbas";
					};
					__debugInfo = "140:\src\Utils\Hashmap.gbas";
				};
				__debugInfo = "132:\src\Utils\Hashmap.gbas";pool_Bucket.free(alias1_B_ref_1919);
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
		var local3_Arr_1924 = pool_array.alloc(pool_KeyValue.alloc());
		__debugInfo = "148:\src\Utils\Hashmap.gbas";
		(param4_self).ToArray(unref(local3_Arr_1924));
		__debugInfo = "149:\src\Utils\Hashmap.gbas";
		param4_self.attr8_Elements = 0;
		__debugInfo = "150:\src\Utils\Hashmap.gbas";
		REDIM(unref(param4_self.attr7_Buckets_ref[0]), [param4_Size], [pool_Bucket.alloc()] );
		__debugInfo = "153:\src\Utils\Hashmap.gbas";
		var forEachSaver5067 = local3_Arr_1924;
		for(var forEachCounter5067 = 0 ; forEachCounter5067 < forEachSaver5067.values.length ; forEachCounter5067++) {
			var local1_E_1925 = forEachSaver5067.values[forEachCounter5067];
		{
				__debugInfo = "152:\src\Utils\Hashmap.gbas";
				(param4_self).Put(local1_E_1925.attr7_Key_Str, local1_E_1925.attr5_Value);
				__debugInfo = "152:\src\Utils\Hashmap.gbas";
			}
			forEachSaver5067.values[forEachCounter5067] = local1_E_1925;
		
		};
		__debugInfo = "154:\src\Utils\Hashmap.gbas";
		return 0;
		__debugInfo = "148:\src\Utils\Hashmap.gbas";pool_array.free(local3_Arr_1924);
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
		var local4_Hash_1928 = 0;
		__debugInfo = "161:\src\Utils\Hashmap.gbas";
		{
			var local1_i_1929 = 0.0;
			__debugInfo = "164:\src\Utils\Hashmap.gbas";
			for (local1_i_1929 = 0;toCheck(local1_i_1929, (((param7_Str_Str).length) - (1)), 1);local1_i_1929 += 1) {
				__debugInfo = "163:\src\Utils\Hashmap.gbas";
				local4_Hash_1928+=~~(((ASC(param7_Str_Str, ~~(local1_i_1929))) + (((local1_i_1929) * (26)))));
				__debugInfo = "163:\src\Utils\Hashmap.gbas";
			};
			__debugInfo = "164:\src\Utils\Hashmap.gbas";
		};
		__debugInfo = "165:\src\Utils\Hashmap.gbas";
		local4_Hash_1928 = MOD(local4_Hash_1928, param6_MaxLen);
		__debugInfo = "166:\src\Utils\Hashmap.gbas";
		return tryClone(local4_Hash_1928);
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
		__debugInfo = "291:\src\CompilerPasses\Generator\JSGenerator.gbas";
		{
			var Err_Str = "";
			__debugInfo = "292:\src\CompilerPasses\Generator\JSGenerator.gbas";
			try {
				var local11_InWebWorker_1930 = 0, local8_Text_Str_1931 = "", local14_StaticText_Str_1932 = "", local17_StaticDefText_Str_1933 = "";
				__debugInfo = "28:\src\CompilerPasses\Generator\JSGenerator.gbas";
				local11_InWebWorker_1930 = func8_IsDefine("HTML5_WEBWORKER");
				__debugInfo = "30:\src\CompilerPasses\Generator\JSGenerator.gbas";
				func23_ManageFuncParamOverlaps();
				__debugInfo = "32:\src\CompilerPasses\Generator\JSGenerator.gbas";
				global14_StaticText_Str = "";
				__debugInfo = "34:\src\CompilerPasses\Generator\JSGenerator.gbas";
				local8_Text_Str_1931 = "";
				__debugInfo = "41:\src\CompilerPasses\Generator\JSGenerator.gbas";
				if (global9_DEBUGMODE) {
					__debugInfo = "37:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1931 = ((((local8_Text_Str_1931) + ("var __debugInfo = \"\";"))) + (func11_NewLine_Str()));
					__debugInfo = "38:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1931 = ((((local8_Text_Str_1931) + ("var debugMode = true;"))) + (func11_NewLine_Str()));
					__debugInfo = "37:\src\CompilerPasses\Generator\JSGenerator.gbas";
				} else {
					__debugInfo = "40:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1931 = ((((local8_Text_Str_1931) + ("var debugMode = false;"))) + (func11_NewLine_Str()));
					__debugInfo = "40:\src\CompilerPasses\Generator\JSGenerator.gbas";
				};
				__debugInfo = "44:\src\CompilerPasses\Generator\JSGenerator.gbas";
				global11_LastDummyID = ~~(((global10_LastExprID) + (1337)));
				__debugInfo = "46:\src\CompilerPasses\Generator\JSGenerator.gbas";
				local8_Text_Str_1931 = ((local8_Text_Str_1931) + ("window['main'] = function()"));
				__debugInfo = "47:\src\CompilerPasses\Generator\JSGenerator.gbas";
				local8_Text_Str_1931 = ((((local8_Text_Str_1931) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr9_MainScope).values[tmpPositionCache][0]))))) + (func11_NewLine_Str()));
				__debugInfo = "48:\src\CompilerPasses\Generator\JSGenerator.gbas";
				if (local11_InWebWorker_1930) {
					__debugInfo = "48:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1931 = ((((local8_Text_Str_1931) + ("main = window['main'];"))) + (func11_NewLine_Str()));
					__debugInfo = "48:\src\CompilerPasses\Generator\JSGenerator.gbas";
				};
				__debugInfo = "49:\src\CompilerPasses\Generator\JSGenerator.gbas";
				local14_StaticText_Str_1932 = "";
				__debugInfo = "50:\src\CompilerPasses\Generator\JSGenerator.gbas";
				local17_StaticDefText_Str_1933 = "";
				__debugInfo = "75:\src\CompilerPasses\Generator\JSGenerator.gbas";
				var forEachSaver5374 = global8_Compiler.attr5_Funcs_ref[0];
				for(var forEachCounter5374 = 0 ; forEachCounter5374 < forEachSaver5374.values.length ; forEachCounter5374++) {
					var local4_Func_ref_1934 = forEachSaver5374.values[forEachCounter5374];
				{
						__debugInfo = "74:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (((((((local4_Func_ref_1934[0].attr6_Native) === (0)) ? 1 : 0)) && ((((local4_Func_ref_1934[0].attr3_Scp) !== (-(1))) ? 1 : 0))) ? 1 : 0)) {
							var local4_Find_1935 = 0.0;
							__debugInfo = "57:\src\CompilerPasses\Generator\JSGenerator.gbas";
							if ((((BOUNDS(local4_Func_ref_1934[0].attr7_Statics, 0)) > (0)) ? 1 : 0)) {
								__debugInfo = "55:\src\CompilerPasses\Generator\JSGenerator.gbas";
								local17_StaticDefText_Str_1933 = ((((((((local17_StaticDefText_Str_1933) + ("var "))) + (func13_JSVariDef_Str(unref(local4_Func_ref_1934[0].attr7_Statics), 1, 0, 0)))) + (";"))) + (func11_NewLine_Str()));
								__debugInfo = "56:\src\CompilerPasses\Generator\JSGenerator.gbas";
								local14_StaticText_Str_1932 = ((((((local14_StaticText_Str_1932) + (func13_JSVariDef_Str(unref(local4_Func_ref_1934[0].attr7_Statics), 0, 0, 1)))) + (";"))) + (func11_NewLine_Str()));
								__debugInfo = "55:\src\CompilerPasses\Generator\JSGenerator.gbas";
							};
							__debugInfo = "58:\src\CompilerPasses\Generator\JSGenerator.gbas";
							local8_Text_Str_1931 = ((((((local8_Text_Str_1931) + ("window['"))) + (local4_Func_ref_1934[0].attr8_Name_Str))) + ("'] = function("));
							__debugInfo = "59:\src\CompilerPasses\Generator\JSGenerator.gbas";
							local4_Find_1935 = 0;
							__debugInfo = "65:\src\CompilerPasses\Generator\JSGenerator.gbas";
							var forEachSaver5300 = local4_Func_ref_1934[0].attr6_Params;
							for(var forEachCounter5300 = 0 ; forEachCounter5300 < forEachSaver5300.values.length ; forEachCounter5300++) {
								var local1_P_1936 = forEachSaver5300.values[forEachCounter5300];
							{
									__debugInfo = "61:\src\CompilerPasses\Generator\JSGenerator.gbas";
									if (local4_Find_1935) {
										__debugInfo = "61:\src\CompilerPasses\Generator\JSGenerator.gbas";
										local8_Text_Str_1931 = ((local8_Text_Str_1931) + (", "));
										__debugInfo = "61:\src\CompilerPasses\Generator\JSGenerator.gbas";
									};
									__debugInfo = "62:\src\CompilerPasses\Generator\JSGenerator.gbas";
									local8_Text_Str_1931 = ((local8_Text_Str_1931) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_1936).values[tmpPositionCache][0].attr8_Name_Str));
									__debugInfo = "64:\src\CompilerPasses\Generator\JSGenerator.gbas";
									local4_Find_1935 = 1;
									__debugInfo = "61:\src\CompilerPasses\Generator\JSGenerator.gbas";
								}
								forEachSaver5300.values[forEachCounter5300] = local1_P_1936;
							
							};
							__debugInfo = "66:\src\CompilerPasses\Generator\JSGenerator.gbas";
							local8_Text_Str_1931 = ((local8_Text_Str_1931) + (") "));
							__debugInfo = "67:\src\CompilerPasses\Generator\JSGenerator.gbas";
							local8_Text_Str_1931 = ((((((local8_Text_Str_1931) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local4_Func_ref_1934[0].attr3_Scp).values[tmpPositionCache][0]))))) + (";"))) + (func11_NewLine_Str()));
							__debugInfo = "71:\src\CompilerPasses\Generator\JSGenerator.gbas";
							if (((((((global9_DEBUGMODE) === (0)) ? 1 : 0)) && ((((local4_Func_ref_1934[0].attr3_Typ) === (2)) ? 1 : 0))) ? 1 : 0)) {
								__debugInfo = "70:\src\CompilerPasses\Generator\JSGenerator.gbas";
								local8_Text_Str_1931 = ((((((((((((local8_Text_Str_1931) + ("window['"))) + (local4_Func_ref_1934[0].attr8_Name_Str))) + ("'] = "))) + (local4_Func_ref_1934[0].attr8_Name_Str))) + (";"))) + (func11_NewLine_Str()));
								__debugInfo = "70:\src\CompilerPasses\Generator\JSGenerator.gbas";
							};
							__debugInfo = "73:\src\CompilerPasses\Generator\JSGenerator.gbas";
							if (local11_InWebWorker_1930) {
								__debugInfo = "73:\src\CompilerPasses\Generator\JSGenerator.gbas";
								local8_Text_Str_1931 = ((((((((((local8_Text_Str_1931) + (local4_Func_ref_1934[0].attr8_Name_Str))) + (" = window['"))) + (local4_Func_ref_1934[0].attr8_Name_Str))) + ("'];"))) + (func11_NewLine_Str()));
								__debugInfo = "73:\src\CompilerPasses\Generator\JSGenerator.gbas";
							};
							__debugInfo = "57:\src\CompilerPasses\Generator\JSGenerator.gbas";
						};
						__debugInfo = "74:\src\CompilerPasses\Generator\JSGenerator.gbas";
					}
					forEachSaver5374.values[forEachCounter5374] = local4_Func_ref_1934;
				
				};
				__debugInfo = "87:\src\CompilerPasses\Generator\JSGenerator.gbas";
				var forEachSaver5440 = global8_Compiler.attr5_Funcs_ref[0];
				for(var forEachCounter5440 = 0 ; forEachCounter5440 < forEachSaver5440.values.length ; forEachCounter5440++) {
					var local4_Func_ref_1937 = forEachSaver5440.values[forEachCounter5440];
				{
						__debugInfo = "86:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if ((((local4_Func_ref_1937[0].attr3_Typ) === (4)) ? 1 : 0)) {
							__debugInfo = "80:\src\CompilerPasses\Generator\JSGenerator.gbas";
							func8_IndentUp();
							__debugInfo = "81:\src\CompilerPasses\Generator\JSGenerator.gbas";
							local8_Text_Str_1931 = ((((((((local8_Text_Str_1931) + ("window['"))) + (local4_Func_ref_1937[0].attr9_OName_Str))) + ("'] = function() {"))) + (func11_NewLine_Str()));
							__debugInfo = "82:\src\CompilerPasses\Generator\JSGenerator.gbas";
							local8_Text_Str_1931 = ((local8_Text_Str_1931) + ("return function() { throwError(\"NullPrototypeException\"); };"));
							__debugInfo = "83:\src\CompilerPasses\Generator\JSGenerator.gbas";
							func10_IndentDown();
							__debugInfo = "84:\src\CompilerPasses\Generator\JSGenerator.gbas";
							local8_Text_Str_1931 = ((((((local8_Text_Str_1931) + (func11_NewLine_Str()))) + ("};"))) + (func11_NewLine_Str()));
							__debugInfo = "85:\src\CompilerPasses\Generator\JSGenerator.gbas";
							if (local11_InWebWorker_1930) {
								__debugInfo = "85:\src\CompilerPasses\Generator\JSGenerator.gbas";
								local8_Text_Str_1931 = ((((((((((local8_Text_Str_1931) + (local4_Func_ref_1937[0].attr9_OName_Str))) + (" = window['"))) + (local4_Func_ref_1937[0].attr9_OName_Str))) + ("'];"))) + (func11_NewLine_Str()));
								__debugInfo = "85:\src\CompilerPasses\Generator\JSGenerator.gbas";
							};
							__debugInfo = "80:\src\CompilerPasses\Generator\JSGenerator.gbas";
						};
						__debugInfo = "86:\src\CompilerPasses\Generator\JSGenerator.gbas";
					}
					forEachSaver5440.values[forEachCounter5440] = local4_Func_ref_1937;
				
				};
				__debugInfo = "249:\src\CompilerPasses\Generator\JSGenerator.gbas";
				var forEachSaver6377 = global8_Compiler.attr5_Types_ref[0];
				for(var forEachCounter6377 = 0 ; forEachCounter6377 < forEachSaver6377.values.length ; forEachCounter6377++) {
					var local3_Typ_ref_1938 = forEachSaver6377.values[forEachCounter6377];
				{
						var local5_typId_1939 = 0, local3_map_1940 = pool_HashMap.alloc(), local5_First_1941 = 0, local4_map2_1950 = pool_HashMap.alloc();
						__debugInfo = "92:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local5_typId_1939 = local3_Typ_ref_1938[0].attr2_ID;
						__debugInfo = "94:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func8_IndentUp();
						__debugInfo = "95:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1931 = ((((((((local8_Text_Str_1931) + ("var vtbl_"))) + (local3_Typ_ref_1938[0].attr8_Name_Str))) + (" = {"))) + (func11_NewLine_Str()));
						__debugInfo = "96:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local5_First_1941 = 0;
						__debugInfo = "109:\src\CompilerPasses\Generator\JSGenerator.gbas";
						while ((((local5_typId_1939) !== (-(1))) ? 1 : 0)) {
							__debugInfo = "106:\src\CompilerPasses\Generator\JSGenerator.gbas";
							var forEachSaver5564 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_1939).values[tmpPositionCache][0].attr7_Methods;
							for(var forEachCounter5564 = 0 ; forEachCounter5564 < forEachSaver5564.values.length ; forEachCounter5564++) {
								var local3_Mth_1942 = forEachSaver5564.values[forEachCounter5564];
							{
									__debugInfo = "105:\src\CompilerPasses\Generator\JSGenerator.gbas";
									if (((((((local3_map_1940).DoesKeyExist(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1942).values[tmpPositionCache][0].attr9_OName_Str)) ? 0 : 1)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1942).values[tmpPositionCache][0].attr3_Scp) !== (-(1))) ? 1 : 0))) ? 1 : 0)) {
										__debugInfo = "100:\src\CompilerPasses\Generator\JSGenerator.gbas";
										if (local5_First_1941) {
											__debugInfo = "100:\src\CompilerPasses\Generator\JSGenerator.gbas";
											local8_Text_Str_1931 = ((((local8_Text_Str_1931) + (", "))) + (func11_NewLine_Str()));
											__debugInfo = "100:\src\CompilerPasses\Generator\JSGenerator.gbas";
										};
										__debugInfo = "102:\src\CompilerPasses\Generator\JSGenerator.gbas";
										local8_Text_Str_1931 = ((((((local8_Text_Str_1931) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1942).values[tmpPositionCache][0].attr9_OName_Str))) + (": "))) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1942).values[tmpPositionCache][0].attr8_Name_Str));
										__debugInfo = "103:\src\CompilerPasses\Generator\JSGenerator.gbas";
										(local3_map_1940).Put(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1942).values[tmpPositionCache][0].attr9_OName_Str, local3_Mth_1942);
										__debugInfo = "104:\src\CompilerPasses\Generator\JSGenerator.gbas";
										local5_First_1941 = 1;
										__debugInfo = "100:\src\CompilerPasses\Generator\JSGenerator.gbas";
									};
									__debugInfo = "105:\src\CompilerPasses\Generator\JSGenerator.gbas";
								}
								forEachSaver5564.values[forEachCounter5564] = local3_Mth_1942;
							
							};
							__debugInfo = "108:\src\CompilerPasses\Generator\JSGenerator.gbas";
							local5_typId_1939 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_1939).values[tmpPositionCache][0].attr9_Extending;
							__debugInfo = "106:\src\CompilerPasses\Generator\JSGenerator.gbas";
						};
						__debugInfo = "110:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func10_IndentDown();
						__debugInfo = "111:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1931 = ((((((local8_Text_Str_1931) + (func11_NewLine_Str()))) + ("};"))) + (func11_NewLine_Str()));
						__debugInfo = "118:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if ((((global9_DEBUGMODE) === (0)) ? 1 : 0)) {
							__debugInfo = "115:\src\CompilerPasses\Generator\JSGenerator.gbas";
							local8_Text_Str_1931 = ((((local8_Text_Str_1931) + ("/**"))) + (func11_NewLine_Str()));
							__debugInfo = "116:\src\CompilerPasses\Generator\JSGenerator.gbas";
							local8_Text_Str_1931 = ((((local8_Text_Str_1931) + ("* @constructor"))) + (func11_NewLine_Str()));
							__debugInfo = "117:\src\CompilerPasses\Generator\JSGenerator.gbas";
							local8_Text_Str_1931 = ((((local8_Text_Str_1931) + ("*/"))) + (func11_NewLine_Str()));
							__debugInfo = "115:\src\CompilerPasses\Generator\JSGenerator.gbas";
						};
						__debugInfo = "120:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1931 = ((((((((local8_Text_Str_1931) + ("window ['"))) + (local3_Typ_ref_1938[0].attr8_Name_Str))) + ("'] = function() { this.reset(); }"))) + (func11_NewLine_Str()));
						__debugInfo = "121:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func8_IndentUp();
						__debugInfo = "122:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1931 = ((((((((local8_Text_Str_1931) + ("window['"))) + (local3_Typ_ref_1938[0].attr8_Name_Str))) + ("'].prototype.reset = function() {"))) + (func11_NewLine_Str()));
						__debugInfo = "132:\src\CompilerPasses\Generator\JSGenerator.gbas";
						var forEachSaver5686 = local3_Typ_ref_1938[0].attr10_Attributes;
						for(var forEachCounter5686 = 0 ; forEachCounter5686 < forEachSaver5686.values.length ; forEachCounter5686++) {
							var local4_Attr_1943 = forEachSaver5686.values[forEachCounter5686];
						{
								var alias8_variable_ref_1944 = [pool_TIdentifierVari.alloc()];
								__debugInfo = "126:\src\CompilerPasses\Generator\JSGenerator.gbas";
								alias8_variable_ref_1944 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1943).values[tmpPositionCache] /* ALIAS */;
								__debugInfo = "127:\src\CompilerPasses\Generator\JSGenerator.gbas";
								local8_Text_Str_1931 = ((((local8_Text_Str_1931) + ("this."))) + (alias8_variable_ref_1944[0].attr8_Name_Str));
								__debugInfo = "128:\src\CompilerPasses\Generator\JSGenerator.gbas";
								local8_Text_Str_1931 = ((local8_Text_Str_1931) + (" = "));
								__debugInfo = "129:\src\CompilerPasses\Generator\JSGenerator.gbas";
								local8_Text_Str_1931 = ((local8_Text_Str_1931) + (func21_JSGetDefaultValue_Str(alias8_variable_ref_1944[0].attr8_datatype, alias8_variable_ref_1944[0].attr3_ref, 0)));
								__debugInfo = "131:\src\CompilerPasses\Generator\JSGenerator.gbas";
								local8_Text_Str_1931 = ((((local8_Text_Str_1931) + (";"))) + (func11_NewLine_Str()));
								__debugInfo = "126:\src\CompilerPasses\Generator\JSGenerator.gbas";pool_TIdentifierVari.free(alias8_variable_ref_1944);
							}
							forEachSaver5686.values[forEachCounter5686] = local4_Attr_1943;
						
						};
						__debugInfo = "135:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1931 = ((((((((local8_Text_Str_1931) + ("this.vtbl = vtbl_"))) + (local3_Typ_ref_1938[0].attr8_Name_Str))) + (";"))) + (func11_NewLine_Str()));
						__debugInfo = "149:\src\CompilerPasses\Generator\JSGenerator.gbas";
						var forEachSaver5776 = local3_Typ_ref_1938[0].attr10_Attributes;
						for(var forEachCounter5776 = 0 ; forEachCounter5776 < forEachSaver5776.values.length ; forEachCounter5776++) {
							var local4_Attr_1945 = forEachSaver5776.values[forEachCounter5776];
						{
								var alias8_variable_ref_1946 = [pool_TIdentifierVari.alloc()];
								__debugInfo = "139:\src\CompilerPasses\Generator\JSGenerator.gbas";
								alias8_variable_ref_1946 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1945).values[tmpPositionCache] /* ALIAS */;
								__debugInfo = "148:\src\CompilerPasses\Generator\JSGenerator.gbas";
								if ((((alias8_variable_ref_1946[0].attr6_PreDef) !== (-(1))) ? 1 : 0)) {
									__debugInfo = "141:\src\CompilerPasses\Generator\JSGenerator.gbas";
									local8_Text_Str_1931 = ((((local8_Text_Str_1931) + ("this."))) + (alias8_variable_ref_1946[0].attr8_Name_Str));
									__debugInfo = "142:\src\CompilerPasses\Generator\JSGenerator.gbas";
									local8_Text_Str_1931 = ((local8_Text_Str_1931) + (" = "));
									__debugInfo = "143:\src\CompilerPasses\Generator\JSGenerator.gbas";
									if (alias8_variable_ref_1946[0].attr3_ref) {
										__debugInfo = "143:\src\CompilerPasses\Generator\JSGenerator.gbas";
										local8_Text_Str_1931 = ((local8_Text_Str_1931) + ("["));
										__debugInfo = "143:\src\CompilerPasses\Generator\JSGenerator.gbas";
									};
									__debugInfo = "144:\src\CompilerPasses\Generator\JSGenerator.gbas";
									local8_Text_Str_1931 = ((local8_Text_Str_1931) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(alias8_variable_ref_1946[0].attr6_PreDef).values[tmpPositionCache][0]))));
									__debugInfo = "145:\src\CompilerPasses\Generator\JSGenerator.gbas";
									if (alias8_variable_ref_1946[0].attr3_ref) {
										__debugInfo = "145:\src\CompilerPasses\Generator\JSGenerator.gbas";
										local8_Text_Str_1931 = ((local8_Text_Str_1931) + ("]"));
										__debugInfo = "145:\src\CompilerPasses\Generator\JSGenerator.gbas";
									};
									__debugInfo = "147:\src\CompilerPasses\Generator\JSGenerator.gbas";
									local8_Text_Str_1931 = ((((local8_Text_Str_1931) + (";"))) + (func11_NewLine_Str()));
									__debugInfo = "141:\src\CompilerPasses\Generator\JSGenerator.gbas";
								};
								__debugInfo = "139:\src\CompilerPasses\Generator\JSGenerator.gbas";pool_TIdentifierVari.free(alias8_variable_ref_1946);
							}
							forEachSaver5776.values[forEachCounter5776] = local4_Attr_1945;
						
						};
						__debugInfo = "151:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1931 = ((((((((local8_Text_Str_1931) + ("this.pool = pool_"))) + (local3_Typ_ref_1938[0].attr9_OName_Str))) + (";"))) + (func11_NewLine_Str()));
						__debugInfo = "152:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1931 = ((((local8_Text_Str_1931) + ("this.succ = null;"))) + (func11_NewLine_Str()));
						__debugInfo = "154:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func10_IndentDown();
						__debugInfo = "155:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1931 = ((((((local8_Text_Str_1931) + (func11_NewLine_Str()))) + ("};"))) + (func11_NewLine_Str()));
						__debugInfo = "157:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func8_IndentUp();
						__debugInfo = "158:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1931 = ((((((((local8_Text_Str_1931) + ("window['"))) + (local3_Typ_ref_1938[0].attr8_Name_Str))) + ("'].prototype.clone = function() {"))) + (func11_NewLine_Str()));
						__debugInfo = "159:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1931 = ((((((((local8_Text_Str_1931) + ("var other = pool_"))) + (local3_Typ_ref_1938[0].attr9_OName_Str))) + (".alloc();"))) + (func11_NewLine_Str()));
						__debugInfo = "181:\src\CompilerPasses\Generator\JSGenerator.gbas";
						var forEachSaver5968 = local3_Typ_ref_1938[0].attr10_Attributes;
						for(var forEachCounter5968 = 0 ; forEachCounter5968 < forEachSaver5968.values.length ; forEachCounter5968++) {
							var local4_Attr_1947 = forEachSaver5968.values[forEachCounter5968];
						{
								var alias8_variable_ref_1948 = [pool_TIdentifierVari.alloc()], local8_plzclone_1949 = 0;
								__debugInfo = "161:\src\CompilerPasses\Generator\JSGenerator.gbas";
								alias8_variable_ref_1948 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1947).values[tmpPositionCache] /* ALIAS */;
								__debugInfo = "166:\src\CompilerPasses\Generator\JSGenerator.gbas";
								local8_plzclone_1949 = 0;
								__debugInfo = "171:\src\CompilerPasses\Generator\JSGenerator.gbas";
								if (((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1947).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0)) && ((((((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1947).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("int")) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1947).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("float")) ? 1 : 0))) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1947).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("string")) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) {
									__debugInfo = "168:\src\CompilerPasses\Generator\JSGenerator.gbas";
									local8_plzclone_1949 = 0;
									__debugInfo = "168:\src\CompilerPasses\Generator\JSGenerator.gbas";
								} else {
									__debugInfo = "170:\src\CompilerPasses\Generator\JSGenerator.gbas";
									local8_plzclone_1949 = 1;
									__debugInfo = "170:\src\CompilerPasses\Generator\JSGenerator.gbas";
								};
								__debugInfo = "173:\src\CompilerPasses\Generator\JSGenerator.gbas";
								if (global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1947).values[tmpPositionCache][0].attr3_ref) {
									__debugInfo = "173:\src\CompilerPasses\Generator\JSGenerator.gbas";
									local8_plzclone_1949 = 1;
									__debugInfo = "173:\src\CompilerPasses\Generator\JSGenerator.gbas";
								};
								__debugInfo = "174:\src\CompilerPasses\Generator\JSGenerator.gbas";
								local8_Text_Str_1931 = ((((((local8_Text_Str_1931) + ("other."))) + (alias8_variable_ref_1948[0].attr8_Name_Str))) + (" = "));
								__debugInfo = "176:\src\CompilerPasses\Generator\JSGenerator.gbas";
								if (local8_plzclone_1949) {
									__debugInfo = "176:\src\CompilerPasses\Generator\JSGenerator.gbas";
									local8_Text_Str_1931 = ((local8_Text_Str_1931) + ("tryClone("));
									__debugInfo = "176:\src\CompilerPasses\Generator\JSGenerator.gbas";
								};
								__debugInfo = "177:\src\CompilerPasses\Generator\JSGenerator.gbas";
								local8_Text_Str_1931 = ((((local8_Text_Str_1931) + ("this."))) + (alias8_variable_ref_1948[0].attr8_Name_Str));
								__debugInfo = "178:\src\CompilerPasses\Generator\JSGenerator.gbas";
								if (local8_plzclone_1949) {
									__debugInfo = "178:\src\CompilerPasses\Generator\JSGenerator.gbas";
									local8_Text_Str_1931 = ((local8_Text_Str_1931) + (")"));
									__debugInfo = "178:\src\CompilerPasses\Generator\JSGenerator.gbas";
								};
								__debugInfo = "180:\src\CompilerPasses\Generator\JSGenerator.gbas";
								local8_Text_Str_1931 = ((((local8_Text_Str_1931) + (";"))) + (func11_NewLine_Str()));
								__debugInfo = "161:\src\CompilerPasses\Generator\JSGenerator.gbas";pool_TIdentifierVari.free(alias8_variable_ref_1948);
							}
							forEachSaver5968.values[forEachCounter5968] = local4_Attr_1947;
						
						};
						__debugInfo = "183:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1931 = ((((local8_Text_Str_1931) + ("other.vtbl = this.vtbl;"))) + (func11_NewLine_Str()));
						__debugInfo = "184:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1931 = ((((local8_Text_Str_1931) + ("other.pool = this.pool;"))) + (func11_NewLine_Str()));
						__debugInfo = "187:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func10_IndentDown();
						__debugInfo = "188:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1931 = ((((local8_Text_Str_1931) + ("return other;"))) + (func11_NewLine_Str()));
						__debugInfo = "189:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1931 = ((((local8_Text_Str_1931) + ("};"))) + (func11_NewLine_Str()));
						__debugInfo = "191:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func8_IndentUp();
						__debugInfo = "192:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1931 = ((((((((local8_Text_Str_1931) + ("pool_"))) + (local3_Typ_ref_1938[0].attr9_OName_Str))) + (" = { "))) + (func11_NewLine_Str()));
						__debugInfo = "193:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1931 = ((((local8_Text_Str_1931) + ("last: null, "))) + (func11_NewLine_Str()));
						__debugInfo = "194:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func8_IndentUp();
						__debugInfo = "195:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1931 = ((((local8_Text_Str_1931) + ("alloc: function() { "))) + (func11_NewLine_Str()));
						__debugInfo = "196:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1931 = ((((local8_Text_Str_1931) + ("var obj = null;"))) + (func11_NewLine_Str()));
						__debugInfo = "197:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func8_IndentUp();
						__debugInfo = "198:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1931 = ((((((((local8_Text_Str_1931) + ("if (pool_"))) + (local3_Typ_ref_1938[0].attr9_OName_Str))) + (".last !== null) {"))) + (func11_NewLine_Str()));
						__debugInfo = "199:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1931 = ((((((((local8_Text_Str_1931) + ("obj = pool_"))) + (local3_Typ_ref_1938[0].attr9_OName_Str))) + (".last;"))) + (func11_NewLine_Str()));
						__debugInfo = "200:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1931 = ((((((((local8_Text_Str_1931) + ("pool_"))) + (local3_Typ_ref_1938[0].attr9_OName_Str))) + (".last = obj.succ;"))) + (func11_NewLine_Str()));
						__debugInfo = "201:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func10_IndentDown();
						__debugInfo = "202:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1931 = ((((local8_Text_Str_1931) + ("obj.succ = null;"))) + (func11_NewLine_Str()));
						__debugInfo = "203:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func8_IndentUp();
						__debugInfo = "204:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1931 = ((((local8_Text_Str_1931) + ("} else {"))) + (func11_NewLine_Str()));
						__debugInfo = "205:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func10_IndentDown();
						__debugInfo = "206:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1931 = ((((((((local8_Text_Str_1931) + ("obj = new "))) + (local3_Typ_ref_1938[0].attr8_Name_Str))) + ("();"))) + (func11_NewLine_Str()));
						__debugInfo = "207:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1931 = ((((local8_Text_Str_1931) + ("}"))) + (func11_NewLine_Str()));
						__debugInfo = "208:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func10_IndentDown();
						__debugInfo = "209:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1931 = ((((local8_Text_Str_1931) + ("return obj;"))) + (func11_NewLine_Str()));
						__debugInfo = "210:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1931 = ((((local8_Text_Str_1931) + ("},"))) + (func11_NewLine_Str()));
						__debugInfo = "211:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func8_IndentUp();
						__debugInfo = "212:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1931 = ((((local8_Text_Str_1931) + ("free: function(obj)  {"))) + (func11_NewLine_Str()));
						__debugInfo = "213:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1931 = ((((local8_Text_Str_1931) + ("if (obj.succ !== null) return;"))) + (func11_NewLine_Str()));
						__debugInfo = "214:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1931 = ((((local8_Text_Str_1931) + ("obj.reset();"))) + (func11_NewLine_Str()));
						__debugInfo = "215:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1931 = ((((((((local8_Text_Str_1931) + ("obj.succ = pool_"))) + (local3_Typ_ref_1938[0].attr9_OName_Str))) + (".last;"))) + (func11_NewLine_Str()));
						__debugInfo = "216:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func10_IndentDown();
						__debugInfo = "217:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1931 = ((((((((local8_Text_Str_1931) + ("pool_"))) + (local3_Typ_ref_1938[0].attr9_OName_Str))) + (".last = obj;"))) + (func11_NewLine_Str()));
						__debugInfo = "218:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func10_IndentDown();
						__debugInfo = "219:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1931 = ((((local8_Text_Str_1931) + ("}"))) + (func11_NewLine_Str()));
						__debugInfo = "220:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1931 = ((((local8_Text_Str_1931) + ("}"))) + (func11_NewLine_Str()));
						__debugInfo = "222:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (local11_InWebWorker_1930) {
							__debugInfo = "222:\src\CompilerPasses\Generator\JSGenerator.gbas";
							local8_Text_Str_1931 = ((((((((((local8_Text_Str_1931) + (local3_Typ_ref_1938[0].attr8_Name_Str))) + (" = window['"))) + (local3_Typ_ref_1938[0].attr8_Name_Str))) + ("'];"))) + (func11_NewLine_Str()));
							__debugInfo = "222:\src\CompilerPasses\Generator\JSGenerator.gbas";
						};
						__debugInfo = "225:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local5_typId_1939 = local3_Typ_ref_1938[0].attr2_ID;
						__debugInfo = "228:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local5_First_1941 = 0;
						__debugInfo = "248:\src\CompilerPasses\Generator\JSGenerator.gbas";
						while ((((local5_typId_1939) !== (-(1))) ? 1 : 0)) {
							__debugInfo = "245:\src\CompilerPasses\Generator\JSGenerator.gbas";
							var forEachSaver6366 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_1939).values[tmpPositionCache][0].attr7_Methods;
							for(var forEachCounter6366 = 0 ; forEachCounter6366 < forEachSaver6366.values.length ; forEachCounter6366++) {
								var local3_Mth_1951 = forEachSaver6366.values[forEachCounter6366];
							{
									__debugInfo = "244:\src\CompilerPasses\Generator\JSGenerator.gbas";
									if (((((((local4_map2_1950).DoesKeyExist(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1951).values[tmpPositionCache][0].attr9_OName_Str)) ? 0 : 1)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1951).values[tmpPositionCache][0].attr3_Scp) !== (-(1))) ? 1 : 0))) ? 1 : 0)) {
										__debugInfo = "232:\src\CompilerPasses\Generator\JSGenerator.gbas";
										func8_IndentUp();
										__debugInfo = "233:\src\CompilerPasses\Generator\JSGenerator.gbas";
										local8_Text_Str_1931 = ((((((((((((local8_Text_Str_1931) + (local3_Typ_ref_1938[0].attr8_Name_Str))) + (".prototype."))) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1951).values[tmpPositionCache][0].attr9_OName_Str))) + (" = function() {"))) + (func11_NewLine_Str()))) + (" return "));
										__debugInfo = "234:\src\CompilerPasses\Generator\JSGenerator.gbas";
										local8_Text_Str_1931 = ((((((local8_Text_Str_1931) + ("this.vtbl."))) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1951).values[tmpPositionCache][0].attr9_OName_Str))) + ("("));
										__debugInfo = "235:\src\CompilerPasses\Generator\JSGenerator.gbas";
										{
											var local1_i_1952 = 0.0;
											__debugInfo = "238:\src\CompilerPasses\Generator\JSGenerator.gbas";
											for (local1_i_1952 = 0;toCheck(local1_i_1952, ((BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1951).values[tmpPositionCache][0].attr6_Params, 0)) - (2)), 1);local1_i_1952 += 1) {
												__debugInfo = "237:\src\CompilerPasses\Generator\JSGenerator.gbas";
												local8_Text_Str_1931 = ((((((local8_Text_Str_1931) + ("arguments["))) + (CAST2STRING(local1_i_1952)))) + ("], "));
												__debugInfo = "237:\src\CompilerPasses\Generator\JSGenerator.gbas";
											};
											__debugInfo = "238:\src\CompilerPasses\Generator\JSGenerator.gbas";
										};
										__debugInfo = "240:\src\CompilerPasses\Generator\JSGenerator.gbas";
										local8_Text_Str_1931 = ((local8_Text_Str_1931) + ("this"));
										__debugInfo = "241:\src\CompilerPasses\Generator\JSGenerator.gbas";
										func10_IndentDown();
										__debugInfo = "242:\src\CompilerPasses\Generator\JSGenerator.gbas";
										local8_Text_Str_1931 = ((((((((local8_Text_Str_1931) + (");"))) + (func11_NewLine_Str()))) + ("};"))) + (func11_NewLine_Str()));
										__debugInfo = "243:\src\CompilerPasses\Generator\JSGenerator.gbas";
										(local4_map2_1950).Put(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1951).values[tmpPositionCache][0].attr9_OName_Str, local3_Mth_1951);
										__debugInfo = "232:\src\CompilerPasses\Generator\JSGenerator.gbas";
									};
									__debugInfo = "244:\src\CompilerPasses\Generator\JSGenerator.gbas";
								}
								forEachSaver6366.values[forEachCounter6366] = local3_Mth_1951;
							
							};
							__debugInfo = "247:\src\CompilerPasses\Generator\JSGenerator.gbas";
							local5_typId_1939 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_1939).values[tmpPositionCache][0].attr9_Extending;
							__debugInfo = "245:\src\CompilerPasses\Generator\JSGenerator.gbas";
						};
						__debugInfo = "92:\src\CompilerPasses\Generator\JSGenerator.gbas";pool_HashMap.free(local3_map_1940);pool_HashMap.free(local4_map2_1950);
					}
					forEachSaver6377.values[forEachCounter6377] = local3_Typ_ref_1938;
				
				};
				__debugInfo = "261:\src\CompilerPasses\Generator\JSGenerator.gbas";
				var forEachSaver6436 = global8_Compiler.attr10_DataBlocks;
				for(var forEachCounter6436 = 0 ; forEachCounter6436 < forEachSaver6436.values.length ; forEachCounter6436++) {
					var local5_block_1953 = forEachSaver6436.values[forEachCounter6436];
				{
						var local4_Done_1954 = 0;
						__debugInfo = "253:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1931 = ((((((local8_Text_Str_1931) + ("var datablock_"))) + (local5_block_1953.attr8_Name_Str))) + (" = [ "));
						__debugInfo = "254:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local4_Done_1954 = 0;
						__debugInfo = "259:\src\CompilerPasses\Generator\JSGenerator.gbas";
						var forEachSaver6428 = local5_block_1953.attr5_Datas;
						for(var forEachCounter6428 = 0 ; forEachCounter6428 < forEachSaver6428.values.length ; forEachCounter6428++) {
							var local1_d_1955 = forEachSaver6428.values[forEachCounter6428];
						{
								__debugInfo = "256:\src\CompilerPasses\Generator\JSGenerator.gbas";
								if (local4_Done_1954) {
									__debugInfo = "256:\src\CompilerPasses\Generator\JSGenerator.gbas";
									local8_Text_Str_1931 = ((local8_Text_Str_1931) + (", "));
									__debugInfo = "256:\src\CompilerPasses\Generator\JSGenerator.gbas";
								};
								__debugInfo = "257:\src\CompilerPasses\Generator\JSGenerator.gbas";
								local8_Text_Str_1931 = ((local8_Text_Str_1931) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local1_d_1955).values[tmpPositionCache][0]))));
								__debugInfo = "258:\src\CompilerPasses\Generator\JSGenerator.gbas";
								local4_Done_1954 = 1;
								__debugInfo = "256:\src\CompilerPasses\Generator\JSGenerator.gbas";
							}
							forEachSaver6428.values[forEachCounter6428] = local1_d_1955;
						
						};
						__debugInfo = "260:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1931 = ((((local8_Text_Str_1931) + (" ];"))) + (func11_NewLine_Str()));
						__debugInfo = "253:\src\CompilerPasses\Generator\JSGenerator.gbas";
					}
					forEachSaver6436.values[forEachCounter6436] = local5_block_1953;
				
				};
				__debugInfo = "269:\src\CompilerPasses\Generator\JSGenerator.gbas";
				if ((((BOUNDS(global8_Compiler.attr7_Globals, 0)) > (0)) ? 1 : 0)) {
					__debugInfo = "265:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1931 = ((local8_Text_Str_1931) + ("var "));
					__debugInfo = "266:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1931 = ((local8_Text_Str_1931) + (func13_JSVariDef_Str(unref(global8_Compiler.attr7_Globals), 1, 0, 1)));
					__debugInfo = "268:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1931 = ((((local8_Text_Str_1931) + (";"))) + (func11_NewLine_Str()));
					__debugInfo = "265:\src\CompilerPasses\Generator\JSGenerator.gbas";
				};
				__debugInfo = "282:\src\CompilerPasses\Generator\JSGenerator.gbas";
				if ((((TRIM_Str(local14_StaticText_Str_1932, " \t\r\n\v\f")) !== ("")) ? 1 : 0)) {
					__debugInfo = "272:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1931 = ((((local8_Text_Str_1931) + ("// set default statics:"))) + (func11_NewLine_Str()));
					__debugInfo = "273:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1931 = ((local17_StaticDefText_Str_1933) + (local8_Text_Str_1931));
					__debugInfo = "274:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func8_IndentUp();
					__debugInfo = "275:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1931 = ((((local8_Text_Str_1931) + ("window['initStatics'] = function() {"))) + (func11_NewLine_Str()));
					__debugInfo = "276:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func10_IndentDown();
					__debugInfo = "277:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1931 = ((((local8_Text_Str_1931) + (local14_StaticText_Str_1932))) + (func11_NewLine_Str()));
					__debugInfo = "278:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1931 = ((((local8_Text_Str_1931) + ("}"))) + (func11_NewLine_Str()));
					__debugInfo = "272:\src\CompilerPasses\Generator\JSGenerator.gbas";
				} else {
					__debugInfo = "281:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1931 = ((((local8_Text_Str_1931) + ("window['initStatics'] = function() {}"))) + (func11_NewLine_Str()));
					__debugInfo = "281:\src\CompilerPasses\Generator\JSGenerator.gbas";
				};
				__debugInfo = "283:\src\CompilerPasses\Generator\JSGenerator.gbas";
				if (local11_InWebWorker_1930) {
					__debugInfo = "283:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1931 = ((((local8_Text_Str_1931) + ("initStatics = window['initStatics'];"))) + (func11_NewLine_Str()));
					__debugInfo = "283:\src\CompilerPasses\Generator\JSGenerator.gbas";
				};
				__debugInfo = "285:\src\CompilerPasses\Generator\JSGenerator.gbas";
				local8_Text_Str_1931 = ((((local8_Text_Str_1931) + ("for (var __init = 0; __init < preInitFuncs.length; __init++) preInitFuncs[__init]();"))) + (func11_NewLine_Str()));
				__debugInfo = "287:\src\CompilerPasses\Generator\JSGenerator.gbas";
				local8_Text_Str_1931 = ((((local8_Text_Str_1931) + ("delete preInitFuncs;"))) + (func11_NewLine_Str()));
				__debugInfo = "290:\src\CompilerPasses\Generator\JSGenerator.gbas";
				return tryClone(local8_Text_Str_1931);
				__debugInfo = "28:\src\CompilerPasses\Generator\JSGenerator.gbas";
			} catch (Err_Str) {
				if (Err_Str instanceof OTTException) Err_Str = Err_Str.getText(); else throwError(Err_Str);{
					
				}
			};
			__debugInfo = "292:\src\CompilerPasses\Generator\JSGenerator.gbas";
		};
		__debugInfo = "293:\src\CompilerPasses\Generator\JSGenerator.gbas";
		return "";
		__debugInfo = "291:\src\CompilerPasses\Generator\JSGenerator.gbas";
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
		var __labels = {"Exit": 8003};
		
	stackPush("function: JSGenerate_Str", __debugInfo);
	try {
		var local8_Text_Str_1958 = "";
		var __pc = 6559;
		while(__pc >= 0) {
			switch(__pc) {
				case 6559:
					__debugInfo = "301:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global8_Compiler.attr11_currentPosi = param4_expr.attr5_tokID;
					
				__debugInfo = "302:\src\CompilerPasses\Generator\JSGenerator.gbas";
				local8_Text_Str_1958 = "";
				__debugInfo = "303:\src\CompilerPasses\Generator\JSGenerator.gbas";
				
					var local17___SelectHelper10__1959 = 0;
					case 6569:
						__debugInfo = "303:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local17___SelectHelper10__1959 = param4_expr.attr3_Typ;
						
					case 11055:
						__debugInfo = "1127:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((local17___SelectHelper10__1959) === (~~(2))) ? 1 : 0))) { __pc = 6571; break; }
					
					var local4_oScp_1960 = 0.0, local5_oFunc_1961 = 0.0, local13_oLabelDef_Str_1962 = "", local9_oIsInGoto_1963 = 0, local6_IsFunc_1964 = 0, local7_mngGoto_1965 = 0, local13_IsStackPusher_1966 = 0, local7_Def_Str_1970 = "", local15_BeforeUndef_Str_1971 = "", local11_MyUndef_Str_1972 = "", local8_ERes_Str_1976 = pool_array.alloc(""), local13_FirstText_Str_1979 = "";
					case 6576:
						__debugInfo = "305:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local4_oScp_1960 = global12_CurrentScope;
						
					__debugInfo = "306:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local5_oFunc_1961 = global11_CurrentFunc;
					__debugInfo = "307:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local13_oLabelDef_Str_1962 = global12_LabelDef_Str;
					__debugInfo = "308:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local9_oIsInGoto_1963 = global8_IsInGoto;
					__debugInfo = "309:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local6_IsFunc_1964 = 0;
					__debugInfo = "310:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local7_mngGoto_1965 = 0;
					__debugInfo = "311:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local13_IsStackPusher_1966 = 0;
					case 6622:
						__debugInfo = "312:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(((((((param4_expr.attr6_ScpTyp) === (2)) ? 1 : 0)) || ((((param4_expr.attr6_ScpTyp) === (4)) ? 1 : 0))) ? 1 : 0))) { __pc = 6617; break; }
					
					case 6621:
						__debugInfo = "312:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local13_IsStackPusher_1966 = 1;
						
					__debugInfo = "312:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 6617: //dummy jumper1
					;
						
					case 6635:
						__debugInfo = "317:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((func12_ScopeHasGoto(param4_expr)) && (local13_IsStackPusher_1966)) ? 1 : 0))) { __pc = 6627; break; }
					
					case 6631:
						__debugInfo = "315:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local7_mngGoto_1965 = 1;
						
					__debugInfo = "316:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global8_IsInGoto = 1;
					__debugInfo = "315:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 6627: //dummy jumper1
					;
						
					case 6672:
						__debugInfo = "332:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((param4_expr.attr6_ScpTyp) === (2)) ? 1 : 0))) { __pc = 6641; break; }
					
					var local1_i_1967 = 0;
					case 6671:
						__debugInfo = "331:\src\CompilerPasses\Generator\JSGenerator.gbas";
						var forEachSaver6671 = global8_Compiler.attr5_Funcs_ref[0];
					var forEachCounter6671 = 0
					
				case 6649: //dummy for1
					if (!(forEachCounter6671 < forEachSaver6671.values.length)) {__pc = 6645; break;}
					var local4_Func_ref_1968 = forEachSaver6671.values[forEachCounter6671];
					
					
					case 6667:
						__debugInfo = "329:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((local4_Func_ref_1968[0].attr3_Scp) === (param4_expr.attr2_ID)) ? 1 : 0))) { __pc = 6658; break; }
					
					case 6662:
						__debugInfo = "324:\src\CompilerPasses\Generator\JSGenerator.gbas";
						global11_CurrentFunc = local1_i_1967;
						
					__debugInfo = "325:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local6_IsFunc_1964 = 1;
					case 6666:
						__debugInfo = "328:\src\CompilerPasses\Generator\JSGenerator.gbas";
						__pc = 6645; break;
						
					__debugInfo = "324:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 6658: //dummy jumper1
					;
						
					__debugInfo = "330:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local1_i_1967+=1;
					__debugInfo = "329:\src\CompilerPasses\Generator\JSGenerator.gbas";
					forEachSaver6671.values[forEachCounter6671] = local4_Func_ref_1968;
					
					forEachCounter6671++
					__pc = 6649; break; //back jump
					
				case 6645: //dummy for
					;
						
					__debugInfo = "331:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 6641: //dummy jumper1
					;
						
					__debugInfo = "333:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global12_CurrentScope = param4_expr.attr2_ID;
					case 6688:
						__debugInfo = "342:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((((global8_IsInGoto) ? 0 : 1)) || (local7_mngGoto_1965)) ? 1 : 0))) { __pc = 6684; break; }
					
					case 6686:
						__debugInfo = "339:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func8_IndentUp();
						
					__debugInfo = "339:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29393;
					break;
					
				case 6684: //dummy jumper1
					
					
					
				case 29393: //dummy jumper2
					;
						
					__debugInfo = "343:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((local8_Text_Str_1958) + (func11_NewLine_Str()));
					case 6719:
						__debugInfo = "351:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((global9_DEBUGMODE) && (local13_IsStackPusher_1966)) ? 1 : 0))) { __pc = 6697; break; }
					
					case 6710:
						__debugInfo = "348:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((((((local8_Text_Str_1958) + ("stackPush(\""))) + (func13_ScopeName_Str(param4_expr)))) + ("\", __debugInfo);"))) + (func11_NewLine_Str()));
						
					__debugInfo = "349:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func8_IndentUp();
					__debugInfo = "350:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((local8_Text_Str_1958) + ("try {"))) + (func11_NewLine_Str()));
					__debugInfo = "348:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 6697: //dummy jumper1
					;
						
					case 6782:
						__debugInfo = "366:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((local6_IsFunc_1964) && (global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr15_UsedAsPrototype)) ? 1 : 0))) { __pc = 6729; break; }
					
					case 6781:
						__debugInfo = "365:\src\CompilerPasses\Generator\JSGenerator.gbas";
						var forEachSaver6781 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr6_Params;
					var forEachCounter6781 = 0
					
				case 6740: //dummy for1
					if (!(forEachCounter6781 < forEachSaver6781.values.length)) {__pc = 6732; break;}
					var local1_P_1969 = forEachSaver6781.values[forEachCounter6781];
					
					
					case 6780:
						__debugInfo = "364:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_1969).values[tmpPositionCache][0].attr3_ref) === (0)) ? 1 : 0))) { __pc = 6752; break; }
					
					case 6778:
						__debugInfo = "361:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((((((((local8_Text_Str_1958) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_1969).values[tmpPositionCache][0].attr8_Name_Str))) + (" = unref("))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_1969).values[tmpPositionCache][0].attr8_Name_Str))) + (");"))) + (func11_NewLine_Str()));
						
					__debugInfo = "361:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29396;
					break;
					
				case 6752: //dummy jumper1
					
					
					
				case 29396: //dummy jumper2
					;
						
					__debugInfo = "364:\src\CompilerPasses\Generator\JSGenerator.gbas";
					forEachSaver6781.values[forEachCounter6781] = local1_P_1969;
					
					forEachCounter6781++
					__pc = 6740; break; //back jump
					
				case 6732: //dummy for
					;
						
					__debugInfo = "365:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 6729: //dummy jumper1
					;
						
					__debugInfo = "369:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local7_Def_Str_1970 = func13_JSVariDef_Str(unref(param4_expr.attr5_Varis), 0, 1, 1);
					case 6816:
						__debugInfo = "374:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((TRIM_Str(local7_Def_Str_1970, " \t\r\n\v\f")) !== ("")) ? 1 : 0))) { __pc = 6797; break; }
					
					case 6803:
						__debugInfo = "371:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((local8_Text_Str_1958) + ("var "));
						
					__debugInfo = "372:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((local8_Text_Str_1958) + (local7_Def_Str_1970));
					__debugInfo = "373:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((local8_Text_Str_1958) + (";"))) + (func11_NewLine_Str()));
					__debugInfo = "371:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 6797: //dummy jumper1
					;
						
					__debugInfo = "376:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local15_BeforeUndef_Str_1971 = global13_VariUndef_Str;
					__debugInfo = "377:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local11_MyUndef_Str_1972 = "";
					case 6925:
						__debugInfo = "388:\src\CompilerPasses\Generator\JSGenerator.gbas";
						var forEachSaver6925 = param4_expr.attr5_Varis;
					var forEachCounter6925 = 0
					
				case 6830: //dummy for1
					if (!(forEachCounter6925 < forEachSaver6925.values.length)) {__pc = 6826; break;}
					var local3_Var_1973 = forEachSaver6925.values[forEachCounter6925];
					
					
					case 6924:
						__debugInfo = "387:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_1973).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0))) { __pc = 6843; break; }
					
					case 6909:
						__debugInfo = "384:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(func6_IsType(global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_1973).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) { __pc = 6855; break; }
					
					case 6908:
						__debugInfo = "383:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_1973).values[tmpPositionCache][0].attr3_Typ) !== (5)) ? 1 : 0)) && ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_1973).values[tmpPositionCache][0].attr3_Typ) !== (4)) ? 1 : 0))) ? 1 : 0)) && (func17_JSShouldRedeclare(local3_Var_1973))) ? 1 : 0))) { __pc = 6879; break; }
					
					case 6907:
						__debugInfo = "382:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local11_MyUndef_Str_1972 = ((((((((((local11_MyUndef_Str_1972) + ("pool_"))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_1973).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) + (".free("))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_1973).values[tmpPositionCache][0].attr8_Name_Str))) + (");"));
						
					__debugInfo = "382:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 6879: //dummy jumper1
					;
						
					__debugInfo = "383:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 6855: //dummy jumper1
					;
						
					__debugInfo = "384:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29398;
					break;
					
				case 6843: //dummy jumper1
					
					case 6923:
						__debugInfo = "386:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local11_MyUndef_Str_1972 = (((("pool_array.free(") + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_1973).values[tmpPositionCache][0].attr8_Name_Str))) + (");"));
						
					__debugInfo = "386:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29398: //dummy jumper2
					;
						
					__debugInfo = "387:\src\CompilerPasses\Generator\JSGenerator.gbas";
					forEachSaver6925.values[forEachCounter6925] = local3_Var_1973;
					
					forEachCounter6925++
					__pc = 6830; break; //back jump
					
				case 6826: //dummy for
					;
						
					case 7003:
						__debugInfo = "398:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(((((((global11_CurrentFunc) !== (-(1))) ? 1 : 0)) && ((((local5_oFunc_1961) === (-(1))) ? 1 : 0))) ? 1 : 0))) { __pc = 6938; break; }
					
					var local1_i_1974 = 0;
					case 7002:
						__debugInfo = "397:\src\CompilerPasses\Generator\JSGenerator.gbas";
						var forEachSaver7002 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr6_Params;
					var forEachCounter7002 = 0
					
				case 6950: //dummy for1
					if (!(forEachCounter7002 < forEachSaver7002.values.length)) {__pc = 6942; break;}
					var local5_Param_1975 = forEachSaver7002.values[forEachCounter7002];
					
					
					case 7001:
						__debugInfo = "396:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local5_Param_1975).values[tmpPositionCache][0].attr9_OwnerVari) !== (-(1))) ? 1 : 0))) { __pc = 6963; break; }
					
					case 6997:
						__debugInfo = "394:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((((((((((local8_Text_Str_1958) + ("var "))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(global8_Compiler.attr5_Varis_ref[0].arrAccess(local5_Param_1975).values[tmpPositionCache][0].attr9_OwnerVari).values[tmpPositionCache][0].attr8_Name_Str))) + (" = ["))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local5_Param_1975).values[tmpPositionCache][0].attr8_Name_Str))) + ("];"))) + (func11_NewLine_Str()));
						
					__debugInfo = "395:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local1_i_1974+=1;
					__debugInfo = "394:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 6963: //dummy jumper1
					;
						
					__debugInfo = "396:\src\CompilerPasses\Generator\JSGenerator.gbas";
					forEachSaver7002.values[forEachCounter7002] = local5_Param_1975;
					
					forEachCounter7002++
					__pc = 6950; break; //back jump
					
				case 6942: //dummy for
					;
						
					__debugInfo = "397:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 6938: //dummy jumper1
					;
						
					case 7010:
						__debugInfo = "405:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(local7_mngGoto_1965)) { __pc = 7005; break; }
					
					case 7007:
						__debugInfo = "402:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func8_IndentUp();
						
					__debugInfo = "403:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func8_IndentUp();
					__debugInfo = "404:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func8_IndentUp();
					__debugInfo = "402:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7005: //dummy jumper1
					;
						
					case 7042:
						__debugInfo = "413:\src\CompilerPasses\Generator\JSGenerator.gbas";
						var forEachSaver7042 = param4_expr.attr5_Exprs;
					var forEachCounter7042 = 0
					
				case 7017: //dummy for1
					if (!(forEachCounter7042 < forEachSaver7042.values.length)) {__pc = 7013; break;}
					var local2_Ex_1977 = forEachSaver7042.values[forEachCounter7042];
					
					
					var local7_add_Str_1978 = "";
					case 7024:
						__debugInfo = "408:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local7_add_Str_1978 = func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local2_Ex_1977).values[tmpPositionCache][0]));
						
					case 7041:
						__debugInfo = "412:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((TRIM_Str(local7_add_Str_1978, " \t\r\n\v\f")) !== ("")) ? 1 : 0))) { __pc = 7030; break; }
					
					case 7036:
						__debugInfo = "410:\src\CompilerPasses\Generator\JSGenerator.gbas";
						DIMPUSH(local8_ERes_Str_1976, CAST2STRING(local2_Ex_1977));
						
					__debugInfo = "411:\src\CompilerPasses\Generator\JSGenerator.gbas";
					DIMPUSH(local8_ERes_Str_1976, local7_add_Str_1978);
					__debugInfo = "410:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7030: //dummy jumper1
					;
						
					__debugInfo = "408:\src\CompilerPasses\Generator\JSGenerator.gbas";
					forEachSaver7042.values[forEachCounter7042] = local2_Ex_1977;
					
					forEachCounter7042++
					__pc = 7017; break; //back jump
					
				case 7013: //dummy for
					;
						
					case 7099:
						__debugInfo = "433:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(local7_mngGoto_1965)) { __pc = 7044; break; }
					
					case 7046:
						__debugInfo = "416:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func10_IndentDown();
						
					__debugInfo = "417:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func10_IndentDown();
					__debugInfo = "418:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func10_IndentDown();
					__debugInfo = "421:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((local8_Text_Str_1958) + ("var __pc = "));
					case 7075:
						__debugInfo = "426:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((BOUNDS(local8_ERes_Str_1976, 0)) > (0)) ? 1 : 0))) { __pc = 7060; break; }
					
					case 7068:
						__debugInfo = "423:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((local8_Text_Str_1958) + (local8_ERes_Str_1976.arrAccess(0).values[tmpPositionCache]));
						
					__debugInfo = "423:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29406;
					break;
					
				case 7060: //dummy jumper1
					
					case 7074:
						__debugInfo = "425:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((local8_Text_Str_1958) + ("0"));
						
					__debugInfo = "425:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29406: //dummy jumper2
					;
						
					__debugInfo = "427:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((local8_Text_Str_1958) + (";"))) + (func11_NewLine_Str()));
					__debugInfo = "429:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func8_IndentUp();
					__debugInfo = "430:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((local8_Text_Str_1958) + ("while(__pc >= 0) {"))) + (func11_NewLine_Str()));
					__debugInfo = "431:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func8_IndentUp();
					__debugInfo = "432:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((local8_Text_Str_1958) + ("switch(__pc) {"))) + (func11_NewLine_Str()));
					__debugInfo = "416:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7044: //dummy jumper1
					;
						
					__debugInfo = "435:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local13_FirstText_Str_1979 = "";
					__debugInfo = "435:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
					var local1_i_1980 = 0.0;
					case 7314:
						__debugInfo = "458:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local1_i_1980 = 0
					
				case 7108: //dummy for1
					if (!toCheck(local1_i_1980, ((BOUNDS(local8_ERes_Str_1976, 0)) - (1)), 2)) {__pc = 7119; break;}
					
					var local7_add_Str_1981 = "", local2_Ex_1982 = 0, alias4_ExEx_ref_1983 = [pool_TExpr.alloc()], local7_HasCase_1984 = 0;
					case 7129:
						__debugInfo = "437:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local7_add_Str_1981 = local8_ERes_Str_1976.arrAccess(~~(((local1_i_1980) + (1)))).values[tmpPositionCache];
						
					__debugInfo = "438:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local2_Ex_1982 = INT2STR(local8_ERes_Str_1976.arrAccess(~~(local1_i_1980)).values[tmpPositionCache]);
					__debugInfo = "439:\src\CompilerPasses\Generator\JSGenerator.gbas";
					alias4_ExEx_ref_1983 = global5_Exprs_ref[0].arrAccess(local2_Ex_1982).values[tmpPositionCache] /* ALIAS */;
					__debugInfo = "440:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local7_HasCase_1984 = 0;
					case 7238:
						__debugInfo = "445:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(((((((local7_mngGoto_1965) || (global8_IsInGoto)) ? 1 : 0)) && ((((((((((((((((((((((((((((((((((local1_i_1980) === (0)) ? 1 : 0)) || ((((alias4_ExEx_ref_1983[0].attr3_Typ) === (20)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1983[0].attr3_Typ) === (21)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1983[0].attr3_Typ) === (24)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1983[0].attr3_Typ) === (25)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1983[0].attr3_Typ) === (27)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1983[0].attr3_Typ) === (38)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1983[0].attr3_Typ) === (26)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1983[0].attr3_Typ) === (29)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1983[0].attr3_Typ) === (30)) ? 1 : 0))) ? 1 : 0)) || ((((local1_i_1980) === (((BOUNDS(local8_ERes_Str_1976, 0)) - (1)))) ? 1 : 0))) ? 1 : 0))) ? 1 : 0))) { __pc = 7220; break; }
					
					case 7222:
						__debugInfo = "442:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func8_IndentUp();
						
					__debugInfo = "443:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local7_HasCase_1984 = 1;
					__debugInfo = "444:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((((((local8_Text_Str_1958) + ("case "))) + (CAST2STRING(local2_Ex_1982)))) + (":"))) + (func11_NewLine_Str()));
					__debugInfo = "442:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7220: //dummy jumper1
					;
						
					case 7291:
						__debugInfo = "450:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(global9_DEBUGMODE)) { __pc = 7240; break; }
					
					var local7_Add_Str_1985 = "";
					case 7273:
						__debugInfo = "447:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local7_Add_Str_1985 = (((((((("__debugInfo = \"") + (CAST2STRING(global8_Compiler.attr6_Tokens.arrAccess(global5_Exprs_ref[0].arrAccess(local2_Ex_1982).values[tmpPositionCache][0].attr5_tokID).values[tmpPositionCache].attr4_Line)))) + (":"))) + (global8_Compiler.attr6_Tokens.arrAccess(global5_Exprs_ref[0].arrAccess(local2_Ex_1982).values[tmpPositionCache][0].attr5_tokID).values[tmpPositionCache].attr8_Path_Str))) + ("\";"));
						
					__debugInfo = "448:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((local8_Text_Str_1958) + (local7_Add_Str_1985))) + (func11_NewLine_Str()));
					case 7290:
						__debugInfo = "449:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((local13_FirstText_Str_1979) === ("")) ? 1 : 0))) { __pc = 7285; break; }
					
					case 7289:
						__debugInfo = "449:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local13_FirstText_Str_1979 = local7_Add_Str_1985;
						
					__debugInfo = "449:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7285: //dummy jumper1
					;
						
					__debugInfo = "447:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7240: //dummy jumper1
					;
						
					__debugInfo = "452:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((local8_Text_Str_1958) + (local7_add_Str_1981));
					__debugInfo = "453:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((local8_Text_Str_1958) + (";"))) + (func11_NewLine_Str()));
					case 7313:
						__debugInfo = "457:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(local7_HasCase_1984)) { __pc = 7305; break; }
					
					case 7307:
						__debugInfo = "455:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func10_IndentDown();
						
					__debugInfo = "456:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((local8_Text_Str_1958) + (func11_NewLine_Str()));
					__debugInfo = "455:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7305: //dummy jumper1
					;
						
					__debugInfo = "437:\src\CompilerPasses\Generator\JSGenerator.gbas";pool_TExpr.free(alias4_ExEx_ref_1983);
					local1_i_1980 += 2;
					__pc = 7108; break; //back jump
					
				case 7119: //dummy for
					;
						
					__debugInfo = "458:\src\CompilerPasses\Generator\JSGenerator.gbas";
					;
					case 7325:
						__debugInfo = "462:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((local13_FirstText_Str_1979) !== ("")) ? 1 : 0))) { __pc = 7318; break; }
					
					case 7324:
						__debugInfo = "461:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((local8_Text_Str_1958) + (local13_FirstText_Str_1979));
						
					__debugInfo = "461:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7318: //dummy jumper1
					;
						
					__debugInfo = "464:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((local8_Text_Str_1958) + (local11_MyUndef_Str_1972));
					case 7391:
						__debugInfo = "480:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(local7_mngGoto_1965)) { __pc = 7332; break; }
					
					case 7340:
						__debugInfo = "467:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((local8_Text_Str_1958) + ("__pc = -1; break;"))) + (func11_NewLine_Str()));
						
					__debugInfo = "468:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func8_IndentUp();
					__debugInfo = "469:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((local8_Text_Str_1958) + ("default:"))) + (func11_NewLine_Str()));
					__debugInfo = "470:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func10_IndentDown();
					__debugInfo = "471:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((local8_Text_Str_1958) + ("throwError(\"Gotocounter exception pc: \"+__pc);"))) + (func11_NewLine_Str()));
					__debugInfo = "472:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func10_IndentDown();
					__debugInfo = "473:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((local8_Text_Str_1958) + (func11_NewLine_Str()))) + ("}"));
					__debugInfo = "474:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func10_IndentDown();
					__debugInfo = "475:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((local8_Text_Str_1958) + (func11_NewLine_Str()))) + ("}"));
					__debugInfo = "478:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = (((((((("var __labels = {") + (func16_JSRemoveLast_Str(global12_LabelDef_Str, ", ")))) + ("};"))) + (func11_NewLine_Str()))) + (local8_Text_Str_1958));
					__debugInfo = "479:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((func11_NewLine_Str()) + (local8_Text_Str_1958));
					__debugInfo = "467:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7332: //dummy jumper1
					;
						
					case 7405:
						__debugInfo = "481:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((((global8_IsInGoto) ? 0 : 1)) || (local7_mngGoto_1965)) ? 1 : 0))) { __pc = 7398; break; }
					
					case 7404:
						__debugInfo = "481:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = (("{") + (local8_Text_Str_1958));
						
					__debugInfo = "481:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7398: //dummy jumper1
					;
						
					case 7467:
						__debugInfo = "497:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((global9_DEBUGMODE) && (local13_IsStackPusher_1966)) ? 1 : 0))) { __pc = 7409; break; }
					
					case 7411:
						__debugInfo = "485:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func10_IndentDown();
						
					__debugInfo = "486:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((local8_Text_Str_1958) + (func11_NewLine_Str()))) + ("} catch(ex) {"));
					__debugInfo = "487:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func8_IndentUp();
					__debugInfo = "488:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((local8_Text_Str_1958) + (func11_NewLine_Str()))) + ("if (isKnownException(ex)) throw ex;"));
					__debugInfo = "489:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((local8_Text_Str_1958) + (func11_NewLine_Str()))) + ("alert(formatError(ex));"));
					__debugInfo = "490:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((local8_Text_Str_1958) + (func11_NewLine_Str()))) + ("END();"));
					__debugInfo = "491:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func10_IndentDown();
					__debugInfo = "492:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((local8_Text_Str_1958) + (func11_NewLine_Str()))) + ("} finally {"));
					__debugInfo = "493:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func8_IndentUp();
					__debugInfo = "494:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((local8_Text_Str_1958) + (func11_NewLine_Str()))) + ("stackPop();"));
					__debugInfo = "495:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func10_IndentDown();
					__debugInfo = "496:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((((local8_Text_Str_1958) + (func11_NewLine_Str()))) + ("}"))) + (func11_NewLine_Str()));
					__debugInfo = "485:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7409: //dummy jumper1
					;
						
					case 7493:
						__debugInfo = "506:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((((global8_IsInGoto) ? 0 : 1)) || (local7_mngGoto_1965)) ? 1 : 0))) { __pc = 7474; break; }
					
					case 7476:
						__debugInfo = "500:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func10_IndentDown();
						
					__debugInfo = "501:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((local8_Text_Str_1958) + (func11_NewLine_Str()));
					__debugInfo = "502:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((local8_Text_Str_1958) + ("}"));
					__debugInfo = "500:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29415;
					break;
					
				case 7474: //dummy jumper1
					
					case 7492:
						__debugInfo = "505:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((local8_Text_Str_1958) + (func11_NewLine_Str()));
						
					__debugInfo = "505:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29415: //dummy jumper2
					;
						
					__debugInfo = "508:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global13_VariUndef_Str = local15_BeforeUndef_Str_1971;
					__debugInfo = "509:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global12_CurrentScope = ~~(local4_oScp_1960);
					__debugInfo = "510:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global11_CurrentFunc = ~~(local5_oFunc_1961);
					case 7514:
						__debugInfo = "515:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(local7_mngGoto_1965)) { __pc = 7506; break; }
					
					case 7510:
						__debugInfo = "513:\src\CompilerPasses\Generator\JSGenerator.gbas";
						global12_LabelDef_Str = local13_oLabelDef_Str_1962;
						
					__debugInfo = "514:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global8_IsInGoto = local9_oIsInGoto_1963;
					__debugInfo = "513:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7506: //dummy jumper1
					;
						
					__debugInfo = "305:\src\CompilerPasses\Generator\JSGenerator.gbas";pool_array.free(local8_ERes_Str_1976);
					__pc = 29388;
					break;
					
				case 6571: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(1))) ? 1 : 0))) { __pc = 7516; break; }
					
					var local7_Sym_Str_1986 = "", local10_HasToBeInt_1987 = 0.0, local10_MightBeInt_1988 = 0;
					case 7526:
						__debugInfo = "517:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local7_Sym_Str_1986 = global9_Operators_ref[0].arrAccess(param4_expr.attr2_Op).values[tmpPositionCache][0].attr7_Sym_Str;
						
					__debugInfo = "517:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local10_HasToBeInt_1987 = 0;
					__debugInfo = "518:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local10_MightBeInt_1988 = 0;
					__debugInfo = "519:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
					var local17___SelectHelper11__1989 = "";
					case 7539:
						__debugInfo = "519:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local17___SelectHelper11__1989 = local7_Sym_Str_1986;
						
					case 7604:
						__debugInfo = "541:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((local17___SelectHelper11__1989) === ("=")) ? 1 : 0))) { __pc = 7541; break; }
					
					case 7545:
						__debugInfo = "521:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local7_Sym_Str_1986 = "===";
						
					__debugInfo = "522:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local10_HasToBeInt_1987 = 1;
					__debugInfo = "521:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7541: //dummy jumper1
					if (!((((local17___SelectHelper11__1989) === ("<>")) ? 1 : 0))) { __pc = 7551; break; }
					
					case 7555:
						__debugInfo = "524:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local7_Sym_Str_1986 = "!==";
						
					__debugInfo = "525:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local10_HasToBeInt_1987 = 1;
					__debugInfo = "524:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7551: //dummy jumper1
					if (!((((local17___SelectHelper11__1989) === ("OR")) ? 1 : 0))) { __pc = 7561; break; }
					
					case 7565:
						__debugInfo = "527:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local7_Sym_Str_1986 = "||";
						
					__debugInfo = "528:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local10_HasToBeInt_1987 = 1;
					__debugInfo = "527:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7561: //dummy jumper1
					if (!((((local17___SelectHelper11__1989) === ("AND")) ? 1 : 0))) { __pc = 7571; break; }
					
					case 7575:
						__debugInfo = "530:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local7_Sym_Str_1986 = "&&";
						
					__debugInfo = "531:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local10_HasToBeInt_1987 = 1;
					__debugInfo = "530:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7571: //dummy jumper1
					if (!((((local17___SelectHelper11__1989) === ("<")) ? 1 : 0))) { __pc = 7581; break; }
					
					case 7585:
						__debugInfo = "533:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local10_MightBeInt_1988 = 1;
						
					__debugInfo = "533:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7581: //dummy jumper1
					if (!((((local17___SelectHelper11__1989) === (">")) ? 1 : 0))) { __pc = 7587; break; }
					
					case 7591:
						__debugInfo = "535:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local10_MightBeInt_1988 = 1;
						
					__debugInfo = "535:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7587: //dummy jumper1
					if (!((((local17___SelectHelper11__1989) === (">=")) ? 1 : 0))) { __pc = 7593; break; }
					
					case 7597:
						__debugInfo = "537:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local10_MightBeInt_1988 = 1;
						
					__debugInfo = "537:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7593: //dummy jumper1
					if (!((((local17___SelectHelper11__1989) === ("<=")) ? 1 : 0))) { __pc = 7599; break; }
					
					case 7603:
						__debugInfo = "539:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local10_MightBeInt_1988 = 1;
						
					__debugInfo = "539:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7599: //dummy jumper1
					;
						
					__debugInfo = "519:\src\CompilerPasses\Generator\JSGenerator.gbas";
					;
					case 7781:
						__debugInfo = "567:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((local10_HasToBeInt_1987) || (local10_MightBeInt_1988)) ? 1 : 0))) { __pc = 7609; break; }
					
					case 7723:
						__debugInfo = "559:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(((((((local10_MightBeInt_1988) && ((((global5_Exprs_ref[0].arrAccess(param4_expr.attr4_Left).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("string")) ? 1 : 0))) ? 1 : 0)) && ((((global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("string")) ? 1 : 0))) ? 1 : 0))) { __pc = 7636; break; }
					
					var local7_Res_Str_1990 = "";
					case 7640:
						__debugInfo = "546:\src\CompilerPasses\Generator\JSGenerator.gbas";
						
					var local17___SelectHelper12__1991 = "";
					case 7642:
						__debugInfo = "546:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local17___SelectHelper12__1991 = local7_Sym_Str_1986;
						
					case 7667:
						__debugInfo = "555:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((local17___SelectHelper12__1991) === ("<")) ? 1 : 0))) { __pc = 7644; break; }
					
					case 7648:
						__debugInfo = "548:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local7_Res_Str_1990 = " === -1";
						
					__debugInfo = "548:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7644: //dummy jumper1
					if (!((((local17___SelectHelper12__1991) === (">")) ? 1 : 0))) { __pc = 7650; break; }
					
					case 7654:
						__debugInfo = "550:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local7_Res_Str_1990 = " === 1";
						
					__debugInfo = "550:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7650: //dummy jumper1
					if (!((((local17___SelectHelper12__1991) === ("<=")) ? 1 : 0))) { __pc = 7656; break; }
					
					case 7660:
						__debugInfo = "552:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local7_Res_Str_1990 = " <= 0";
						
					__debugInfo = "552:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7656: //dummy jumper1
					if (!((((local17___SelectHelper12__1991) === (">=")) ? 1 : 0))) { __pc = 7662; break; }
					
					case 7666:
						__debugInfo = "554:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local7_Res_Str_1990 = " >= 0";
						
					__debugInfo = "554:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7662: //dummy jumper1
					;
						
					__debugInfo = "546:\src\CompilerPasses\Generator\JSGenerator.gbas";
					;
						
					__debugInfo = "556:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((((((((((((local8_Text_Str_1958) + ("((strcmp(("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_Left).values[tmpPositionCache][0]))))) + ("), ("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0]))))) + (")) "))) + (local7_Res_Str_1990))) + (" ) ? 1 : 0)"));
					__debugInfo = "546:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29419;
					break;
					
				case 7636: //dummy jumper1
					
					case 7722:
						__debugInfo = "558:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((((((((((((local8_Text_Str_1958) + ("((("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_Left).values[tmpPositionCache][0]))))) + (") "))) + (local7_Sym_Str_1986))) + (" ("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0]))))) + (")) ? 1 : 0)"));
						
					__debugInfo = "558:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29419: //dummy jumper2
					;
						
					__debugInfo = "559:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29418;
					break;
					
				case 7609: //dummy jumper1
					
					var local5_l_Str_1992 = "";
					case 7732:
						__debugInfo = "561:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local5_l_Str_1992 = func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_Left).values[tmpPositionCache][0]));
						
					case 7780:
						__debugInfo = "566:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(((((((local7_Sym_Str_1986) === ("-")) ? 1 : 0)) && ((((local5_l_Str_1992) === ("0")) ? 1 : 0))) ? 1 : 0))) { __pc = 7741; break; }
					
					case 7756:
						__debugInfo = "563:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((((local8_Text_Str_1958) + ("-("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0]))))) + (")"));
						
					__debugInfo = "563:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29421;
					break;
					
				case 7741: //dummy jumper1
					
					case 7779:
						__debugInfo = "565:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((((((((((((local8_Text_Str_1958) + ("(("))) + (local5_l_Str_1992))) + (") "))) + (local7_Sym_Str_1986))) + (" ("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0]))))) + ("))"));
						
					__debugInfo = "565:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29421: //dummy jumper2
					;
						
					__debugInfo = "561:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29418: //dummy jumper2
					;
						
					case 7818:
						__debugInfo = "572:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((((((((local7_Sym_Str_1986) === ("/")) ? 1 : 0)) && ((((global5_Exprs_ref[0].arrAccess(param4_expr.attr4_Left).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("int")) ? 1 : 0))) ? 1 : 0)) && ((((global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("int")) ? 1 : 0))) ? 1 : 0))) { __pc = 7809; break; }
					
					case 7817:
						__debugInfo = "571:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = (((("CAST2INT(") + (local8_Text_Str_1958))) + (")"));
						
					__debugInfo = "571:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7809: //dummy jumper1
					;
						
					__debugInfo = "517:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 7516: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(3))) ? 1 : 0))) { __pc = 7820; break; }
					
					case 7828:
						__debugInfo = "574:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = CAST2STRING(INTEGER(param4_expr.attr6_intval));
						
					__debugInfo = "574:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 7820: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(4))) ? 1 : 0))) { __pc = 7830; break; }
					
					case 7837:
						__debugInfo = "576:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = CAST2STRING(param4_expr.attr8_floatval);
						
					__debugInfo = "576:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 7830: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(5))) ? 1 : 0))) { __pc = 7839; break; }
					
					case 7845:
						__debugInfo = "578:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = param4_expr.attr10_strval_Str;
						
					__debugInfo = "578:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 7839: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(6))) ? 1 : 0))) { __pc = 7847; break; }
					
					case 8054:
						__debugInfo = "608:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_expr.attr4_func).values[tmpPositionCache][0].attr3_Typ) === (3)) ? 1 : 0))) { __pc = 7860; break; }
					
					var local1_P_1993 = 0, alias2_Ex_ref_1994 = [pool_TExpr.alloc()];
					case 7870:
						__debugInfo = "581:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local1_P_1993 = param4_expr.attr6_Params.arrAccess(-(1)).values[tmpPositionCache];
						
					__debugInfo = "582:\src\CompilerPasses\Generator\JSGenerator.gbas";
					alias2_Ex_ref_1994 = global5_Exprs_ref[0].arrAccess(local1_P_1993).values[tmpPositionCache] /* ALIAS */;
					case 8033:
						__debugInfo = "604:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((alias2_Ex_ref_1994[0].attr3_Typ) === (53)) ? 1 : 0))) { __pc = 7881; break; }
					
					var local5_Found_1995 = 0, local5_typId_1996 = 0;
					case 7904:
						__debugInfo = "585:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(((func6_IsType(alias2_Ex_ref_1994[0].attr8_datatype.attr8_Name_Str)) ? 0 : 1))) { __pc = 7890; break; }
					
					case 7903:
						__debugInfo = "585:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func5_Error((((("Internal error (Unable to find '") + (alias2_Ex_ref_1994[0].attr8_datatype.attr8_Name_Str))) + ("')")), 584, "src\CompilerPasses\Generator\JSGenerator.gbas");
						
					__debugInfo = "585:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7890: //dummy jumper1
					;
						
					__debugInfo = "587:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local5_Found_1995 = 0;
					__debugInfo = "588:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local5_typId_1996 = global8_LastType.attr2_ID;
					case 8002:
						__debugInfo = "599:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((local5_typId_1996) !== (-(1))) ? 1 : 0))) {__pc = 29426; break;}
					
					case 7992:
						__debugInfo = "597:\src\CompilerPasses\Generator\JSGenerator.gbas";
						var forEachSaver7992 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_1996).values[tmpPositionCache][0].attr7_Methods;
					var forEachCounter7992 = 0
					
				case 7932: //dummy for1
					if (!(forEachCounter7992 < forEachSaver7992.values.length)) {__pc = 7924; break;}
					var local3_Mth_1997 = forEachSaver7992.values[forEachCounter7992];
					
					
					case 7991:
						__debugInfo = "596:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1997).values[tmpPositionCache][0].attr9_OName_Str) === (global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_expr.attr4_func).values[tmpPositionCache][0].attr9_OName_Str)) ? 1 : 0))) { __pc = 7951; break; }
					
					var local10_Params_Str_1998 = "";
					case 7960:
						__debugInfo = "592:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local10_Params_Str_1998 = func17_JSDoParameter_Str(param4_expr, param4_expr.attr4_func, 0);
						
					case 7972:
						__debugInfo = "593:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((local10_Params_Str_1998) !== ("")) ? 1 : 0))) { __pc = 7965; break; }
					
					case 7971:
						__debugInfo = "593:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local10_Params_Str_1998 = ((local10_Params_Str_1998) + (", "));
						
					__debugInfo = "593:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7965: //dummy jumper1
					;
						
					__debugInfo = "594:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((((((local8_Text_Str_1958) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1997).values[tmpPositionCache][0].attr8_Name_Str))) + ("("))) + (local10_Params_Str_1998))) + ("param4_self)"));
					case 7990:
						__debugInfo = "595:\src\CompilerPasses\Generator\JSGenerator.gbas";
						__pc = __labels["Exit"]; break;
						
					__debugInfo = "592:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 7951: //dummy jumper1
					;
						
					__debugInfo = "596:\src\CompilerPasses\Generator\JSGenerator.gbas";
					forEachSaver7992.values[forEachCounter7992] = local3_Mth_1997;
					
					forEachCounter7992++
					__pc = 7932; break; //back jump
					
				case 7924: //dummy for
					;
						
					__debugInfo = "598:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local5_typId_1996 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_1996).values[tmpPositionCache][0].attr9_Extending;
					__debugInfo = "597:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 8002; break; //back jump
					
				case 29426:
					;
						
					case 8003:
						__debugInfo = "600:\src\CompilerPasses\Generator\JSGenerator.gbas";
						//label: Exit;
						
					__debugInfo = "585:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29424;
					break;
					
				case 7881: //dummy jumper1
					
					case 8032:
						__debugInfo = "603:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((((((((local8_Text_Str_1958) + ("("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local1_P_1993).values[tmpPositionCache][0]))))) + (")."))) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_expr.attr4_func).values[tmpPositionCache][0].attr9_OName_Str))) + (func17_JSDoParameter_Str(param4_expr, param4_expr.attr4_func, 1)));
						
					__debugInfo = "603:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29424: //dummy jumper2
					;
						
					__debugInfo = "581:\src\CompilerPasses\Generator\JSGenerator.gbas";pool_TExpr.free(alias2_Ex_ref_1994);
					__pc = 29423;
					break;
					
				case 7860: //dummy jumper1
					
					case 8053:
						__debugInfo = "607:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((local8_Text_Str_1958) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_expr.attr4_func).values[tmpPositionCache][0].attr8_Name_Str))) + (func17_JSDoParameter_Str(param4_expr, param4_expr.attr4_func, 1)));
						
					__debugInfo = "607:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29423: //dummy jumper2
					;
						
					__debugInfo = "608:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 7847: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(23))) ? 1 : 0))) { __pc = 8056; break; }
					
					case 8073:
						__debugInfo = "611:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((local8_Text_Str_1958) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (func17_JSDoParameter_Str(param4_expr, -(1), 1)));
						
					__debugInfo = "611:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 8056: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(9))) ? 1 : 0))) { __pc = 8075; break; }
					
					case 8089:
						__debugInfo = "613:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((local8_Text_Str_1958) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_Name_Str));
						
					case 8106:
						__debugInfo = "614:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr3_ref)) { __pc = 8099; break; }
					
					case 8105:
						__debugInfo = "614:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((local8_Text_Str_1958) + ("[0]"));
						
					__debugInfo = "614:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 8099: //dummy jumper1
					;
						
					__debugInfo = "613:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 8075: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(13))) ? 1 : 0))) { __pc = 8108; break; }
					
					case 8119:
						__debugInfo = "618:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((local8_Text_Str_1958) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_array).values[tmpPositionCache][0]))));
						
					case 8206:
						__debugInfo = "637:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((BOUNDS(param4_expr.attr4_dims, 0)) !== (0)) ? 1 : 0))) { __pc = 8128; break; }
					
					var local1_s_1999 = 0, local7_Add_Str_2000 = "";
					case 8134:
						__debugInfo = "620:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((local8_Text_Str_1958) + (".arrAccess("));
						
					__debugInfo = "621:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local1_s_1999 = 0;
					__debugInfo = "622:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local7_Add_Str_2000 = "";
					case 8198:
						__debugInfo = "634:\src\CompilerPasses\Generator\JSGenerator.gbas";
						var forEachSaver8198 = param4_expr.attr4_dims;
					var forEachCounter8198 = 0
					
				case 8149: //dummy for1
					if (!(forEachCounter8198 < forEachSaver8198.values.length)) {__pc = 8145; break;}
					var local1_d_2001 = forEachSaver8198.values[forEachCounter8198];
					
					
					var local1_v_2002 = 0;
					case 8159:
						__debugInfo = "624:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(local1_s_1999)) { __pc = 8152; break; }
					
					case 8158:
						__debugInfo = "624:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((local8_Text_Str_1958) + (", "));
						
					__debugInfo = "624:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 8152: //dummy jumper1
					;
						
					__debugInfo = "626:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((local8_Text_Str_1958) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local1_d_2001).values[tmpPositionCache][0]))));
					__debugInfo = "628:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local1_s_1999 = 1;
					__debugInfo = "629:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local1_v_2002 = func11_GetVariable(param4_expr.attr5_array, 0);
					case 8197:
						__debugInfo = "633:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(((((((local1_v_2002) !== (-(1))) ? 1 : 0)) && (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_v_2002).values[tmpPositionCache][0].attr3_ref)) ? 1 : 0))) { __pc = 8192; break; }
					
					case 8196:
						__debugInfo = "632:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local7_Add_Str_2000 = "[0]";
						
					__debugInfo = "632:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 8192: //dummy jumper1
					;
						
					__debugInfo = "624:\src\CompilerPasses\Generator\JSGenerator.gbas";
					forEachSaver8198.values[forEachCounter8198] = local1_d_2001;
					
					forEachCounter8198++
					__pc = 8149; break; //back jump
					
				case 8145: //dummy for
					;
						
					__debugInfo = "635:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((local8_Text_Str_1958) + (").values[tmpPositionCache]"))) + (local7_Add_Str_2000));
					__debugInfo = "620:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 8128: //dummy jumper1
					;
						
					__debugInfo = "618:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 8108: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(10))) ? 1 : 0))) { __pc = 8208; break; }
					
					case 8221:
						__debugInfo = "639:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((local8_Text_Str_1958) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0]))))) + (" = "));
						
					__debugInfo = "641:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((local8_Text_Str_1958) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0]))));
					case 8281:
						__debugInfo = "646:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((global5_Exprs_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) || (func6_IsType(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) ? 1 : 0))) { __pc = 8252; break; }
					
					case 8280:
						__debugInfo = "645:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(((((((global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0].attr3_Typ) !== (35)) ? 1 : 0)) && ((((global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0].attr3_Typ) !== (36)) ? 1 : 0))) ? 1 : 0))) { __pc = 8273; break; }
					
					case 8279:
						__debugInfo = "644:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((local8_Text_Str_1958) + (".clone(/* In Assign */)"));
						
					__debugInfo = "644:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 8273: //dummy jumper1
					;
						
					__debugInfo = "645:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 8252: //dummy jumper1
					;
						
					__debugInfo = "639:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 8208: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(11))) ? 1 : 0))) { __pc = 8283; break; }
					
					var local1_v_2003 = 0, local6_hasRef_2004 = 0, local4_Find_2005 = 0;
					case 8291:
						__debugInfo = "650:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local1_v_2003 = func11_GetVariable(param4_expr.attr5_array, 0);
						
					__debugInfo = "651:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local6_hasRef_2004 = 0;
					case 8316:
						__debugInfo = "652:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(((((((local1_v_2003) === (-(1))) ? 1 : 0)) || (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_v_2003).values[tmpPositionCache][0].attr3_ref)) ? 1 : 0))) { __pc = 8311; break; }
					
					case 8315:
						__debugInfo = "652:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local6_hasRef_2004 = 1;
						
					__debugInfo = "652:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 8311: //dummy jumper1
					;
						
					__debugInfo = "654:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((((local8_Text_Str_1958) + ("DIM("))) + (func14_JSTryUnref_Str(param4_expr.attr5_array)))) + (", ["));
					__debugInfo = "655:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local4_Find_2005 = 0;
					case 8363:
						__debugInfo = "661:\src\CompilerPasses\Generator\JSGenerator.gbas";
						var forEachSaver8363 = param4_expr.attr4_dims;
					var forEachCounter8363 = 0
					
				case 8339: //dummy for1
					if (!(forEachCounter8363 < forEachSaver8363.values.length)) {__pc = 8335; break;}
					var local1_D_2006 = forEachSaver8363.values[forEachCounter8363];
					
					
					case 8351:
						__debugInfo = "657:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((local4_Find_2005) === (1)) ? 1 : 0))) { __pc = 8344; break; }
					
					case 8350:
						__debugInfo = "657:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((local8_Text_Str_1958) + (", "));
						
					__debugInfo = "657:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 8344: //dummy jumper1
					;
						
					__debugInfo = "658:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((local8_Text_Str_1958) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local1_D_2006).values[tmpPositionCache][0]))));
					__debugInfo = "660:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local4_Find_2005 = 1;
					__debugInfo = "657:\src\CompilerPasses\Generator\JSGenerator.gbas";
					forEachSaver8363.values[forEachCounter8363] = local1_D_2006;
					
					forEachCounter8363++
					__pc = 8339; break; //back jump
					
				case 8335: //dummy for
					;
						
					__debugInfo = "662:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((((local8_Text_Str_1958) + ("], "))) + (func21_JSGetDefaultValue_Str(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_array).values[tmpPositionCache][0].attr8_datatype, local6_hasRef_2004, 1)))) + (")"));
					__debugInfo = "650:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 8283: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(12))) ? 1 : 0))) { __pc = 8383; break; }
					
					var local1_v_2007 = 0, local6_hasRef_2008 = 0, local4_Find_2009 = 0;
					case 8391:
						__debugInfo = "665:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local1_v_2007 = func11_GetVariable(param4_expr.attr5_array, 0);
						
					__debugInfo = "666:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local6_hasRef_2008 = 0;
					case 8416:
						__debugInfo = "667:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(((((((local1_v_2007) === (-(1))) ? 1 : 0)) || (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_v_2007).values[tmpPositionCache][0].attr3_ref)) ? 1 : 0))) { __pc = 8411; break; }
					
					case 8415:
						__debugInfo = "667:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local6_hasRef_2008 = 1;
						
					__debugInfo = "667:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 8411: //dummy jumper1
					;
						
					__debugInfo = "669:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((((local8_Text_Str_1958) + ("REDIM("))) + (func14_JSTryUnref_Str(param4_expr.attr5_array)))) + (", ["));
					__debugInfo = "670:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local4_Find_2009 = 0;
					case 8463:
						__debugInfo = "676:\src\CompilerPasses\Generator\JSGenerator.gbas";
						var forEachSaver8463 = param4_expr.attr4_dims;
					var forEachCounter8463 = 0
					
				case 8439: //dummy for1
					if (!(forEachCounter8463 < forEachSaver8463.values.length)) {__pc = 8435; break;}
					var local1_D_2010 = forEachSaver8463.values[forEachCounter8463];
					
					
					case 8451:
						__debugInfo = "672:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((local4_Find_2009) === (1)) ? 1 : 0))) { __pc = 8444; break; }
					
					case 8450:
						__debugInfo = "672:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((local8_Text_Str_1958) + (", "));
						
					__debugInfo = "672:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 8444: //dummy jumper1
					;
						
					__debugInfo = "673:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((local8_Text_Str_1958) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local1_D_2010).values[tmpPositionCache][0]))));
					__debugInfo = "675:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local4_Find_2009 = 1;
					__debugInfo = "672:\src\CompilerPasses\Generator\JSGenerator.gbas";
					forEachSaver8463.values[forEachCounter8463] = local1_D_2010;
					
					forEachCounter8463++
					__pc = 8439; break; //back jump
					
				case 8435: //dummy for
					;
						
					__debugInfo = "677:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((((local8_Text_Str_1958) + ("], "))) + (func21_JSGetDefaultValue_Str(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_array).values[tmpPositionCache][0].attr8_datatype, local6_hasRef_2008, 1)))) + (" )"));
					__debugInfo = "665:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 8383: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(15))) ? 1 : 0))) { __pc = 8483; break; }
					
					var local4_cast_2011 = 0;
					case 8487:
						__debugInfo = "680:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local4_cast_2011 = 1;
						
					case 8569:
						__debugInfo = "695:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr3_Typ) === (4)) ? 1 : 0))) { __pc = 8498; break; }
					
					var local5_f_Str_2012 = "";
					case 8503:
						__debugInfo = "682:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local4_cast_2011 = 0;
						
					__debugInfo = "684:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local5_f_Str_2012 = ((CAST2STRING(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr8_floatval)) + (""));
					__debugInfo = "684:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
					var local1_i_2013 = 0.0;
					case 8543:
						__debugInfo = "691:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local1_i_2013 = 0
					
				case 8521: //dummy for1
					if (!toCheck(local1_i_2013, (((local5_f_Str_2012).length) - (1)), 1)) {__pc = 8528; break;}
					
					case 8542:
						__debugInfo = "690:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((ASC(local5_f_Str_2012, ~~(local1_i_2013))) === (ASC(".", 0))) ? 1 : 0))) { __pc = 8536; break; }
					
					case 8540:
						__debugInfo = "688:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local4_cast_2011 = 1;
						
					case 8541:
						__debugInfo = "689:\src\CompilerPasses\Generator\JSGenerator.gbas";
						__pc = 8528; break;
						
					__debugInfo = "688:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 8536: //dummy jumper1
					;
						
					__debugInfo = "690:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local1_i_2013 += 1;
					__pc = 8521; break; //back jump
					
				case 8528: //dummy for
					;
						
					__debugInfo = "691:\src\CompilerPasses\Generator\JSGenerator.gbas";
					;
					__debugInfo = "682:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 8498: //dummy jumper1
					if (!(((((((global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("float")) ? 1 : 0)) && ((((global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0))) ? 1 : 0))) { __pc = 8567; break; }
					
					
					
				case 8567: //dummy jumper1
					;
						
					case 8659:
						__debugInfo = "711:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(local4_cast_2011)) { __pc = 8571; break; }
					
					case 8582:
						__debugInfo = "698:\src\CompilerPasses\Generator\JSGenerator.gbas";
						
					var local17___SelectHelper13__2014 = "";
					case 8584:
						__debugInfo = "698:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local17___SelectHelper13__2014 = global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str;
						
					case 8647:
						__debugInfo = "708:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((local17___SelectHelper13__2014) === ("int")) ? 1 : 0))) { __pc = 8586; break; }
					
					case 8597:
						__debugInfo = "701:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((local8_Text_Str_1958) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))));
						
					__debugInfo = "701:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29442;
					break;
					
				case 8586: //dummy jumper1
					if (!((((local17___SelectHelper13__2014) === ("float")) ? 1 : 0))) { __pc = 8599; break; }
					
					case 8614:
						__debugInfo = "703:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((((local8_Text_Str_1958) + ("~~("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")"));
						
					__debugInfo = "703:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29442;
					break;
					
				case 8599: //dummy jumper1
					if (!((((local17___SelectHelper13__2014) === ("string")) ? 1 : 0))) { __pc = 8616; break; }
					
					case 8631:
						__debugInfo = "705:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((((local8_Text_Str_1958) + ("INT2STR("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")"));
						
					__debugInfo = "705:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29442;
					break;
					
				case 8616: //dummy jumper1
					
					case 8646:
						__debugInfo = "707:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((((local8_Text_Str_1958) + ("CAST2INT("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")"));
						
					__debugInfo = "707:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29442: //dummy jumper2
					;
						
					__debugInfo = "698:\src\CompilerPasses\Generator\JSGenerator.gbas";
					;
						
					__debugInfo = "698:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29441;
					break;
					
				case 8571: //dummy jumper1
					
					case 8658:
						__debugInfo = "710:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((local8_Text_Str_1958) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))));
						
					__debugInfo = "710:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29441: //dummy jumper2
					;
						
					__debugInfo = "680:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 8483: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(16))) ? 1 : 0))) { __pc = 8661; break; }
					
					case 8756:
						__debugInfo = "729:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr3_Typ) === (3)) ? 1 : 0))) { __pc = 8672; break; }
					
					case 8683:
						__debugInfo = "715:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((local8_Text_Str_1958) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))));
						
					__debugInfo = "715:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29443;
					break;
					
				case 8672: //dummy jumper1
					
					case 8694:
						__debugInfo = "717:\src\CompilerPasses\Generator\JSGenerator.gbas";
						
					var local17___SelectHelper14__2015 = "";
					case 8696:
						__debugInfo = "717:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local17___SelectHelper14__2015 = global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str;
						
					case 8755:
						__debugInfo = "728:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((local17___SelectHelper14__2015) === ("int")) ? 1 : 0))) { __pc = 8698; break; }
					
					case 8709:
						__debugInfo = "720:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((local8_Text_Str_1958) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))));
						
					__debugInfo = "720:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29444;
					break;
					
				case 8698: //dummy jumper1
					if (!((((local17___SelectHelper14__2015) === ("float")) ? 1 : 0))) { __pc = 8711; break; }
					
					case 8722:
						__debugInfo = "723:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((local8_Text_Str_1958) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))));
						
					__debugInfo = "723:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29444;
					break;
					
				case 8711: //dummy jumper1
					if (!((((local17___SelectHelper14__2015) === ("string")) ? 1 : 0))) { __pc = 8724; break; }
					
					case 8739:
						__debugInfo = "725:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((((local8_Text_Str_1958) + ("FLOAT2STR("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")"));
						
					__debugInfo = "725:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29444;
					break;
					
				case 8724: //dummy jumper1
					
					case 8754:
						__debugInfo = "727:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((((local8_Text_Str_1958) + ("CAST2FLOAT("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")"));
						
					__debugInfo = "727:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29444: //dummy jumper2
					;
						
					__debugInfo = "717:\src\CompilerPasses\Generator\JSGenerator.gbas";
					;
						
					__debugInfo = "717:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29443: //dummy jumper2
					;
						
					__debugInfo = "729:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 8661: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(17))) ? 1 : 0))) { __pc = 8758; break; }
					
					case 8773:
						__debugInfo = "731:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((((local8_Text_Str_1958) + ("CAST2STRING("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")"));
						
					__debugInfo = "731:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 8758: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(18))) ? 1 : 0))) { __pc = 8775; break; }
					
					case 8795:
						__debugInfo = "733:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((((local8_Text_Str_1958) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + ("."))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_nextExpr).values[tmpPositionCache][0]))));
						
					__debugInfo = "733:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 8775: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(19))) ? 1 : 0))) { __pc = 8797; break; }
					
					var local1_F_2016 = 0;
					case 8802:
						__debugInfo = "735:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local1_F_2016 = 0;
						
					__debugInfo = "736:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
					var local17___SelectHelper15__2017 = 0;
					case 8813:
						__debugInfo = "736:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local17___SelectHelper15__2017 = global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr3_Typ;
						
					case 8832:
						__debugInfo = "743:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((local17___SelectHelper15__2017) === (~~(3))) ? 1 : 0))) { __pc = 8815; break; }
					
					case 8819:
						__debugInfo = "738:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local1_F_2016 = 1;
						
					__debugInfo = "738:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 8815: //dummy jumper1
					if (!((((local17___SelectHelper15__2017) === (~~(4))) ? 1 : 0))) { __pc = 8821; break; }
					
					case 8825:
						__debugInfo = "740:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local1_F_2016 = 1;
						
					__debugInfo = "740:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 8821: //dummy jumper1
					if (!((((local17___SelectHelper15__2017) === (~~(5))) ? 1 : 0))) { __pc = 8827; break; }
					
					case 8831:
						__debugInfo = "742:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local1_F_2016 = 1;
						
					__debugInfo = "742:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 8827: //dummy jumper1
					;
						
					__debugInfo = "736:\src\CompilerPasses\Generator\JSGenerator.gbas";
					;
					__debugInfo = "745:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((local8_Text_Str_1958) + (global13_VariUndef_Str));
					case 8864:
						__debugInfo = "751:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(local1_F_2016)) { __pc = 8839; break; }
					
					case 8850:
						__debugInfo = "748:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((local8_Text_Str_1958) + ("return "))) + (func14_JSTryUnref_Str(param4_expr.attr4_expr)));
						
					__debugInfo = "748:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29446;
					break;
					
				case 8839: //dummy jumper1
					
					case 8863:
						__debugInfo = "750:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((((local8_Text_Str_1958) + ("return tryClone("))) + (func14_JSTryUnref_Str(param4_expr.attr4_expr)))) + (")"));
						
					__debugInfo = "750:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29446: //dummy jumper2
					;
						
					__debugInfo = "735:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 8797: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(22))) ? 1 : 0))) { __pc = 8866; break; }
					
					var local8_Name_Str_2018 = "", local5_Found_2019 = 0;
					case 8877:
						__debugInfo = "759:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Name_Str_2018 = REPLACE_Str(param4_expr.attr8_datatype.attr8_Name_Str, "$", "_Str");
						
					case 8906:
						__debugInfo = "767:\src\CompilerPasses\Generator\JSGenerator.gbas";
						var forEachSaver8906 = global8_Compiler.attr5_Funcs_ref[0];
					var forEachCounter8906 = 0
					
				case 8885: //dummy for1
					if (!(forEachCounter8906 < forEachSaver8906.values.length)) {__pc = 8881; break;}
					var local4_Func_ref_2020 = forEachSaver8906.values[forEachCounter8906];
					
					
					case 8905:
						__debugInfo = "766:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((local4_Func_ref_2020[0].attr9_OName_Str) === (local8_Name_Str_2018)) ? 1 : 0))) { __pc = 8892; break; }
					
					case 8900:
						__debugInfo = "763:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((local8_Text_Str_1958) + (local4_Func_ref_2020[0].attr8_Name_Str));
						
					__debugInfo = "764:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local5_Found_2019 = 1;
					case 8904:
						__debugInfo = "765:\src\CompilerPasses\Generator\JSGenerator.gbas";
						__pc = 8881; break;
						
					__debugInfo = "763:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 8892: //dummy jumper1
					;
						
					__debugInfo = "766:\src\CompilerPasses\Generator\JSGenerator.gbas";
					forEachSaver8906.values[forEachCounter8906] = local4_Func_ref_2020;
					
					forEachCounter8906++
					__pc = 8885; break; //back jump
					
				case 8881: //dummy for
					;
						
					case 8916:
						__debugInfo = "768:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(((local5_Found_2019) ? 0 : 1))) { __pc = 8909; break; }
					
					case 8915:
						__debugInfo = "768:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((local8_Text_Str_1958) + (local8_Name_Str_2018));
						
					__debugInfo = "768:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 8909: //dummy jumper1
					;
						
					__debugInfo = "759:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 8866: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(24))) ? 1 : 0))) { __pc = 8918; break; }
					
					case 9181:
						__debugInfo = "862:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(global8_IsInGoto)) { __pc = 8921; break; }
					
					var local5_dummy_2021 = 0;
					case 8925:
						__debugInfo = "771:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local5_dummy_2021 = global11_LastDummyID;
						
					__debugInfo = "772:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global11_LastDummyID+=1;
					__debugInfo = "773:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
					var local1_i_2022 = 0.0;
					case 9042:
						__debugInfo = "789:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local1_i_2022 = 0
					
				case 8934: //dummy for1
					if (!toCheck(local1_i_2022, ((BOUNDS(param4_expr.attr10_Conditions, 0)) - (1)), 1)) {__pc = 8945; break;}
					
					case 8975:
						__debugInfo = "775:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((((((((((local8_Text_Str_1958) + ("if (!("))) + (func23_ConditionJSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr10_Conditions.arrAccess(~~(local1_i_2022)).values[tmpPositionCache]).values[tmpPositionCache][0]))))) + (")) { __pc = "))) + (CAST2STRING(param4_expr.attr10_Conditions.arrAccess(~~(local1_i_2022)).values[tmpPositionCache])))) + ("; break; }"))) + (func11_NewLine_Str()));
						
					__debugInfo = "778:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((local8_Text_Str_1958) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr6_Scopes.arrAccess(~~(local1_i_2022)).values[tmpPositionCache]).values[tmpPositionCache][0]))));
					case 9017:
						__debugInfo = "784:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((param4_expr.attr9_elseScope) !== (-(1))) ? 1 : 0))) { __pc = 8996; break; }
					
					case 9009:
						__debugInfo = "782:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((((((local8_Text_Str_1958) + ("__pc = "))) + (CAST2STRING(local5_dummy_2021)))) + (";"))) + (func11_NewLine_Str()));
						
					__debugInfo = "783:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((local8_Text_Str_1958) + ("break;"))) + (func11_NewLine_Str()));
					__debugInfo = "782:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 8996: //dummy jumper1
					;
						
					__debugInfo = "785:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func10_IndentDown();
					__debugInfo = "786:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((local8_Text_Str_1958) + (func11_NewLine_Str()));
					__debugInfo = "787:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func8_IndentUp();
					__debugInfo = "788:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((((((local8_Text_Str_1958) + ("case "))) + (CAST2STRING(param4_expr.attr10_Conditions.arrAccess(~~(local1_i_2022)).values[tmpPositionCache])))) + (": //dummy jumper1"))) + (func11_NewLine_Str()));
					__debugInfo = "775:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local1_i_2022 += 1;
					__pc = 8934; break; //back jump
					
				case 8945: //dummy for
					;
						
					__debugInfo = "789:\src\CompilerPasses\Generator\JSGenerator.gbas";
					;
					case 9081:
						__debugInfo = "798:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((param4_expr.attr9_elseScope) !== (-(1))) ? 1 : 0))) { __pc = 9050; break; }
					
					case 9061:
						__debugInfo = "792:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((local8_Text_Str_1958) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr9_elseScope).values[tmpPositionCache][0]))));
						
					__debugInfo = "794:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func10_IndentDown();
					__debugInfo = "795:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((local8_Text_Str_1958) + (func11_NewLine_Str()));
					__debugInfo = "796:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func8_IndentUp();
					__debugInfo = "797:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((((((local8_Text_Str_1958) + ("case "))) + (CAST2STRING(local5_dummy_2021)))) + (": //dummy jumper2"))) + (func11_NewLine_Str()));
					__debugInfo = "792:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 9050: //dummy jumper1
					;
						
					__debugInfo = "771:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29449;
					break;
					
				case 8921: //dummy jumper1
					
					var local8_IsSwitch_2023 = 0;
					case 9086:
						__debugInfo = "802:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_IsSwitch_2023 = 0;
						
					case 9180:
						__debugInfo = "861:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(local8_IsSwitch_2023)) { __pc = 9089; break; }
					
					
					__pc = 29452;
					break;
					
				case 9089: //dummy jumper1
					
					case 9092:
						__debugInfo = "848:\src\CompilerPasses\Generator\JSGenerator.gbas";
						
					var local1_i_2024 = 0.0;
					case 9157:
						__debugInfo = "857:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local1_i_2024 = 0
					
				case 9096: //dummy for1
					if (!toCheck(local1_i_2024, ((BOUNDS(param4_expr.attr10_Conditions, 0)) - (1)), 1)) {__pc = 9107; break;}
					
					case 9126:
						__debugInfo = "854:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((local1_i_2024) === (0)) ? 1 : 0))) { __pc = 9113; break; }
					
					case 9119:
						__debugInfo = "851:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((local8_Text_Str_1958) + ("if"));
						
					__debugInfo = "851:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29453;
					break;
					
				case 9113: //dummy jumper1
					
					case 9125:
						__debugInfo = "853:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((local8_Text_Str_1958) + (" else if"));
						
					__debugInfo = "853:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29453: //dummy jumper2
					;
						
					__debugInfo = "855:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((((local8_Text_Str_1958) + (" ("))) + (func23_ConditionJSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr10_Conditions.arrAccess(~~(local1_i_2024)).values[tmpPositionCache]).values[tmpPositionCache][0]))))) + (") "));
					__debugInfo = "856:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((local8_Text_Str_1958) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr6_Scopes.arrAccess(~~(local1_i_2024)).values[tmpPositionCache]).values[tmpPositionCache][0]))));
					__debugInfo = "854:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local1_i_2024 += 1;
					__pc = 9096; break; //back jump
					
				case 9107: //dummy for
					;
						
					__debugInfo = "857:\src\CompilerPasses\Generator\JSGenerator.gbas";
					;
						
					case 9179:
						__debugInfo = "860:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((param4_expr.attr9_elseScope) !== (-(1))) ? 1 : 0))) { __pc = 9165; break; }
					
					case 9178:
						__debugInfo = "859:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((local8_Text_Str_1958) + (" else "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr9_elseScope).values[tmpPositionCache][0]))));
						
					__debugInfo = "859:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 9165: //dummy jumper1
					;
						
					__debugInfo = "848:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29452: //dummy jumper2
					;
						
					__debugInfo = "802:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29449: //dummy jumper2
					;
						
					__debugInfo = "862:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 8918: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(25))) ? 1 : 0))) { __pc = 9183; break; }
					
					case 9302:
						__debugInfo = "884:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(global8_IsInGoto)) { __pc = 9186; break; }
					
					var local6_TmpBID_2025 = 0, local6_TmpCID_2026 = 0;
					case 9190:
						__debugInfo = "865:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local6_TmpBID_2025 = global11_LoopBreakID;
						
					__debugInfo = "866:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local6_TmpCID_2026 = global14_LoopContinueID;
					__debugInfo = "867:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global11_LoopBreakID = global11_LastDummyID;
					__debugInfo = "868:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global14_LoopContinueID = param4_expr.attr2_ID;
					__debugInfo = "869:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global11_LastDummyID+=1;
					__debugInfo = "871:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((((((((((local8_Text_Str_1958) + ("if (!("))) + (func23_ConditionJSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")) {__pc = "))) + (CAST2STRING(global11_LoopBreakID)))) + ("; break;}"))) + (func11_NewLine_Str()));
					__debugInfo = "872:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((local8_Text_Str_1958) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
					__debugInfo = "873:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((((((local8_Text_Str_1958) + ("__pc = "))) + (CAST2STRING(param4_expr.attr2_ID)))) + ("; break; //back jump"))) + (func11_NewLine_Str()));
					__debugInfo = "874:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func10_IndentDown();
					__debugInfo = "875:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((local8_Text_Str_1958) + (func11_NewLine_Str()));
					__debugInfo = "876:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func8_IndentUp();
					__debugInfo = "877:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((((((local8_Text_Str_1958) + ("case "))) + (CAST2STRING(global11_LoopBreakID)))) + (":"))) + (func11_NewLine_Str()));
					__debugInfo = "879:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global11_LoopBreakID = local6_TmpBID_2025;
					__debugInfo = "880:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global14_LoopContinueID = local6_TmpCID_2026;
					__debugInfo = "865:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29455;
					break;
					
				case 9186: //dummy jumper1
					
					case 9291:
						__debugInfo = "882:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((((local8_Text_Str_1958) + ("while ("))) + (func23_ConditionJSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (") "));
						
					__debugInfo = "883:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((local8_Text_Str_1958) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
					__debugInfo = "882:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29455: //dummy jumper2
					;
						
					__debugInfo = "884:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 9183: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(26))) ? 1 : 0))) { __pc = 9304; break; }
					
					case 9428:
						__debugInfo = "908:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(global8_IsInGoto)) { __pc = 9307; break; }
					
					var local6_TmpBID_2027 = 0, local6_TmpCID_2028 = 0;
					case 9311:
						__debugInfo = "887:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local6_TmpBID_2027 = global11_LoopBreakID;
						
					__debugInfo = "888:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local6_TmpCID_2028 = global14_LoopContinueID;
					__debugInfo = "890:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global11_LoopBreakID = global11_LastDummyID;
					__debugInfo = "891:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global14_LoopContinueID = param4_expr.attr2_ID;
					__debugInfo = "892:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global11_LastDummyID+=1;
					__debugInfo = "894:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((local8_Text_Str_1958) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
					__debugInfo = "895:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((((((((((local8_Text_Str_1958) + ("if ("))) + (func23_ConditionJSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (") {__pc = "))) + (CAST2STRING(global11_LoopBreakID)))) + ("; break;}"))) + (func11_NewLine_Str()));
					__debugInfo = "896:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((((((local8_Text_Str_1958) + ("__pc = "))) + (CAST2STRING(param4_expr.attr2_ID)))) + ("; break; //back jump"))) + (func11_NewLine_Str()));
					__debugInfo = "897:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func10_IndentDown();
					__debugInfo = "898:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((local8_Text_Str_1958) + (func11_NewLine_Str()));
					__debugInfo = "899:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func8_IndentUp();
					__debugInfo = "900:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((((((local8_Text_Str_1958) + ("case "))) + (CAST2STRING(global11_LoopBreakID)))) + (": //dummy repeat"))) + (func11_NewLine_Str()));
					__debugInfo = "902:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global11_LoopBreakID = local6_TmpBID_2027;
					__debugInfo = "903:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global14_LoopContinueID = local6_TmpCID_2028;
					__debugInfo = "887:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29456;
					break;
					
				case 9307: //dummy jumper1
					
					case 9403:
						__debugInfo = "905:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((local8_Text_Str_1958) + ("do "));
						
					__debugInfo = "906:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((local8_Text_Str_1958) + (func23_ConditionJSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
					__debugInfo = "907:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((((local8_Text_Str_1958) + (" while (!("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + ("))"));
					__debugInfo = "905:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29456: //dummy jumper2
					;
						
					__debugInfo = "908:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 9304: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(27))) ? 1 : 0))) { __pc = 9430; break; }
					
					var local13_CheckComm_Str_2029 = "";
					case 9445:
						__debugInfo = "915:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(param4_expr.attr5_hasTo)) { __pc = 9436; break; }
					
					case 9440:
						__debugInfo = "912:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local13_CheckComm_Str_2029 = "toCheck";
						
					__debugInfo = "912:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29457;
					break;
					
				case 9436: //dummy jumper1
					
					case 9444:
						__debugInfo = "914:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local13_CheckComm_Str_2029 = "untilCheck";
						
					__debugInfo = "914:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29457: //dummy jumper2
					;
						
					case 9709:
						__debugInfo = "944:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(global8_IsInGoto)) { __pc = 9447; break; }
					
					var local6_TmpBID_2030 = 0, local6_TmpCID_2031 = 0;
					case 9451:
						__debugInfo = "917:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local6_TmpBID_2030 = global11_LoopBreakID;
						
					__debugInfo = "918:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local6_TmpCID_2031 = global14_LoopContinueID;
					__debugInfo = "920:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global11_LoopBreakID = param4_expr.attr8_stepExpr;
					__debugInfo = "921:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global14_LoopContinueID = param4_expr.attr7_varExpr;
					__debugInfo = "923:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((local8_Text_Str_1958) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr7_varExpr).values[tmpPositionCache][0]))))) + (func11_NewLine_Str()));
					__debugInfo = "924:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func10_IndentDown();
					__debugInfo = "925:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((local8_Text_Str_1958) + (func11_NewLine_Str()));
					__debugInfo = "926:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func8_IndentUp();
					__debugInfo = "927:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((((((local8_Text_Str_1958) + ("case "))) + (CAST2STRING(param4_expr.attr7_varExpr)))) + (": //dummy for1"))) + (func11_NewLine_Str()));
					__debugInfo = "930:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((((((((((((((((((((((local8_Text_Str_1958) + ("if (!"))) + (local13_CheckComm_Str_2029))) + ("("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(param4_expr.attr7_varExpr).values[tmpPositionCache][0].attr4_vari).values[tmpPositionCache][0]))))) + (", "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr6_toExpr).values[tmpPositionCache][0]))))) + (", "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_stepExpr).values[tmpPositionCache][0]))))) + (")) {__pc = "))) + (CAST2STRING(param4_expr.attr8_stepExpr)))) + ("; break;}"))) + (func11_NewLine_Str()));
					__debugInfo = "931:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((local8_Text_Str_1958) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
					__debugInfo = "932:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((((((((local8_Text_Str_1958) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(param4_expr.attr7_varExpr).values[tmpPositionCache][0].attr4_vari).values[tmpPositionCache][0]))))) + (" += "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_stepExpr).values[tmpPositionCache][0]))))) + (";"))) + (func11_NewLine_Str()));
					__debugInfo = "933:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((((((local8_Text_Str_1958) + ("__pc = "))) + (CAST2STRING(param4_expr.attr7_varExpr)))) + ("; break; //back jump"))) + (func11_NewLine_Str()));
					__debugInfo = "934:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func10_IndentDown();
					__debugInfo = "935:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((local8_Text_Str_1958) + (func11_NewLine_Str()));
					__debugInfo = "936:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func8_IndentUp();
					__debugInfo = "937:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((((((local8_Text_Str_1958) + ("case "))) + (CAST2STRING(param4_expr.attr8_stepExpr)))) + (": //dummy for"))) + (func11_NewLine_Str()));
					__debugInfo = "939:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global11_LoopBreakID = local6_TmpBID_2030;
					__debugInfo = "940:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global14_LoopContinueID = local6_TmpCID_2031;
					__debugInfo = "917:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29458;
					break;
					
				case 9447: //dummy jumper1
					
					case 9698:
						__debugInfo = "942:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((((((((((((((((((((((((((((local8_Text_Str_1958) + ("for ("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr7_varExpr).values[tmpPositionCache][0]))))) + (";"))) + (local13_CheckComm_Str_2029))) + ("("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(param4_expr.attr7_varExpr).values[tmpPositionCache][0].attr4_vari).values[tmpPositionCache][0]))))) + (", "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr6_toExpr).values[tmpPositionCache][0]))))) + (", "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_stepExpr).values[tmpPositionCache][0]))))) + (");"))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(param4_expr.attr7_varExpr).values[tmpPositionCache][0].attr4_vari).values[tmpPositionCache][0]))))) + (" += "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_stepExpr).values[tmpPositionCache][0]))))) + (") "));
						
					__debugInfo = "943:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((local8_Text_Str_1958) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
					__debugInfo = "942:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29458: //dummy jumper2
					;
						
					__debugInfo = "915:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 9430: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(38))) ? 1 : 0))) { __pc = 9711; break; }
					
					var local1_c_2032 = 0, local11_varName_Str_2033 = "", local13_StartText_Str_2034 = "", local12_CondText_Str_2035 = "", local11_IncText_Str_2036 = "", local13_EachBegin_Str_2037 = "", local11_EachEnd_Str_2038 = "";
					case 9717:
						__debugInfo = "946:\src\CompilerPasses\Generator\JSGenerator.gbas";
						global14_ForEachCounter = param4_expr.attr2_ID;
						
					__debugInfo = "947:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local1_c_2032 = global14_ForEachCounter;
					__debugInfo = "948:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((((((((((local8_Text_Str_1958) + ("var forEachSaver"))) + (CAST2STRING(local1_c_2032)))) + (" = "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr6_inExpr).values[tmpPositionCache][0]))))) + (";"))) + (func11_NewLine_Str()));
					__debugInfo = "949:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local11_varName_Str_2033 = func16_JSRemoveLast_Str(func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr7_varExpr).values[tmpPositionCache][0])), "[0]");
					__debugInfo = "950:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local13_StartText_Str_2034 = (((("var forEachCounter") + (CAST2STRING(local1_c_2032)))) + (" = 0"));
					__debugInfo = "951:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local12_CondText_Str_2035 = (((((((("forEachCounter") + (CAST2STRING(local1_c_2032)))) + (" < forEachSaver"))) + (CAST2STRING(local1_c_2032)))) + (".values.length"));
					__debugInfo = "952:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local11_IncText_Str_2036 = (((("forEachCounter") + (CAST2STRING(local1_c_2032)))) + ("++"));
					__debugInfo = "953:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local13_EachBegin_Str_2037 = (((((((((((((("var ") + (local11_varName_Str_2033))) + (" = forEachSaver"))) + (CAST2STRING(local1_c_2032)))) + (".values[forEachCounter"))) + (CAST2STRING(local1_c_2032)))) + ("];"))) + (func11_NewLine_Str()));
					__debugInfo = "954:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local11_EachEnd_Str_2038 = (((((((((((((("forEachSaver") + (CAST2STRING(local1_c_2032)))) + (".values[forEachCounter"))) + (CAST2STRING(local1_c_2032)))) + ("] = "))) + (local11_varName_Str_2033))) + (";"))) + (func11_NewLine_Str()));
					case 10015:
						__debugInfo = "990:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(global8_IsInGoto)) { __pc = 9826; break; }
					
					var local6_TmpBID_2039 = 0, local6_TmpCID_2040 = 0;
					case 9830:
						__debugInfo = "956:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local6_TmpBID_2039 = global11_LoopBreakID;
						
					__debugInfo = "957:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local6_TmpCID_2040 = global14_LoopContinueID;
					__debugInfo = "959:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global11_LoopBreakID = param4_expr.attr7_varExpr;
					__debugInfo = "960:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global14_LoopContinueID = param4_expr.attr6_inExpr;
					__debugInfo = "962:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((local8_Text_Str_1958) + (local13_StartText_Str_2034))) + (func11_NewLine_Str()));
					__debugInfo = "963:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func10_IndentDown();
					__debugInfo = "964:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((local8_Text_Str_1958) + (func11_NewLine_Str()));
					__debugInfo = "965:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func8_IndentUp();
					__debugInfo = "966:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((((((local8_Text_Str_1958) + ("case "))) + (CAST2STRING(param4_expr.attr6_inExpr)))) + (": //dummy for1"))) + (func11_NewLine_Str()));
					__debugInfo = "969:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((((((((((local8_Text_Str_1958) + ("if (!("))) + (local12_CondText_Str_2035))) + (")) {__pc = "))) + (CAST2STRING(param4_expr.attr7_varExpr)))) + ("; break;}"))) + (func11_NewLine_Str()));
					__debugInfo = "970:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((local8_Text_Str_1958) + (local13_EachBegin_Str_2037))) + (func11_NewLine_Str()));
					__debugInfo = "971:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((local8_Text_Str_1958) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
					__debugInfo = "972:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((local8_Text_Str_1958) + (local11_EachEnd_Str_2038))) + (func11_NewLine_Str()));
					__debugInfo = "973:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((local8_Text_Str_1958) + (local11_IncText_Str_2036))) + (func11_NewLine_Str()));
					__debugInfo = "974:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((((((local8_Text_Str_1958) + ("__pc = "))) + (CAST2STRING(param4_expr.attr6_inExpr)))) + ("; break; //back jump"))) + (func11_NewLine_Str()));
					__debugInfo = "975:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func10_IndentDown();
					__debugInfo = "976:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((local8_Text_Str_1958) + (func11_NewLine_Str()));
					__debugInfo = "977:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func8_IndentUp();
					__debugInfo = "978:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((((((local8_Text_Str_1958) + ("case "))) + (CAST2STRING(param4_expr.attr7_varExpr)))) + (": //dummy for"))) + (func11_NewLine_Str()));
					__debugInfo = "980:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global11_LoopBreakID = local6_TmpBID_2039;
					__debugInfo = "981:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global14_LoopContinueID = local6_TmpCID_2040;
					__debugInfo = "956:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29459;
					break;
					
				case 9826: //dummy jumper1
					
					case 9965:
						__debugInfo = "983:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func8_IndentUp();
						
					__debugInfo = "984:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((((((((((((((local8_Text_Str_1958) + ("for("))) + (local13_StartText_Str_2034))) + (" ; "))) + (local12_CondText_Str_2035))) + (" ; "))) + (local11_IncText_Str_2036))) + (") {"))) + (func11_NewLine_Str()));
					__debugInfo = "985:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((local8_Text_Str_1958) + (local13_EachBegin_Str_2037));
					__debugInfo = "986:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((local8_Text_Str_1958) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))))) + (func11_NewLine_Str()));
					__debugInfo = "987:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((local8_Text_Str_1958) + (local11_EachEnd_Str_2038));
					__debugInfo = "988:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func10_IndentDown();
					__debugInfo = "989:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((local8_Text_Str_1958) + (func11_NewLine_Str()))) + ("}"));
					__debugInfo = "983:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29459: //dummy jumper2
					;
						
					__debugInfo = "946:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 9711: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(30))) ? 1 : 0))) { __pc = 10017; break; }
					
					case 10038:
						__debugInfo = "996:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(global8_IsInGoto)) { __pc = 10020; break; }
					
					case 10031:
						__debugInfo = "993:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((((local8_Text_Str_1958) + ("__pc = "))) + (CAST2STRING(global14_LoopContinueID)))) + ("; break"));
						
					__debugInfo = "993:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29460;
					break;
					
				case 10020: //dummy jumper1
					
					case 10037:
						__debugInfo = "995:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((local8_Text_Str_1958) + ("continue"));
						
					__debugInfo = "995:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29460: //dummy jumper2
					;
						
					__debugInfo = "996:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 10017: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(29))) ? 1 : 0))) { __pc = 10040; break; }
					
					case 10061:
						__debugInfo = "1002:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(global8_IsInGoto)) { __pc = 10043; break; }
					
					case 10054:
						__debugInfo = "999:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((((local8_Text_Str_1958) + ("__pc = "))) + (CAST2STRING(global11_LoopBreakID)))) + ("; break"));
						
					__debugInfo = "999:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29461;
					break;
					
				case 10043: //dummy jumper1
					
					case 10060:
						__debugInfo = "1001:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((local8_Text_Str_1958) + ("break"));
						
					__debugInfo = "1001:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29461: //dummy jumper2
					;
						
					__debugInfo = "1002:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 10040: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(31))) ? 1 : 0))) { __pc = 10063; break; }
					
					var local9_oIsInGoto_2041 = 0;
					case 10067:
						__debugInfo = "1004:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local9_oIsInGoto_2041 = global8_IsInGoto;
						
					__debugInfo = "1005:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global8_IsInGoto = 0;
					__debugInfo = "1007:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((local8_Text_Str_1958) + ("try "));
					__debugInfo = "1008:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((local8_Text_Str_1958) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
					__debugInfo = "1009:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func8_IndentUp();
					__debugInfo = "1010:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((((((local8_Text_Str_1958) + (" catch ("))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_Name_Str))) + (") {"))) + (func11_NewLine_Str()));
					__debugInfo = "1011:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((((((((((((((((local8_Text_Str_1958) + ("if ("))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_Name_Str))) + (" instanceof OTTException) "))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_Name_Str))) + (" = "))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_Name_Str))) + (".getText(); else throwError("))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_Name_Str))) + (");"));
					__debugInfo = "1012:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((local8_Text_Str_1958) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_catchScp).values[tmpPositionCache][0]))));
					__debugInfo = "1013:\src\CompilerPasses\Generator\JSGenerator.gbas";
					func10_IndentDown();
					__debugInfo = "1014:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((local8_Text_Str_1958) + (func11_NewLine_Str()))) + ("}"));
					__debugInfo = "1017:\src\CompilerPasses\Generator\JSGenerator.gbas";
					global8_IsInGoto = local9_oIsInGoto_2041;
					__debugInfo = "1004:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 10063: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(32))) ? 1 : 0))) { __pc = 10183; break; }
					
					case 10223:
						__debugInfo = "1018:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((((((((((((local8_Text_Str_1958) + ("throw new OTTException("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (", \""))) + (global8_Compiler.attr6_Tokens.arrAccess(param4_expr.attr5_tokID).values[tmpPositionCache].attr8_Path_Str))) + ("\", "))) + (CAST2STRING(global8_Compiler.attr6_Tokens.arrAccess(param4_expr.attr5_tokID).values[tmpPositionCache].attr4_Line)))) + (")"));
						
					__debugInfo = "1018:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 10183: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(33))) ? 1 : 0))) { __pc = 10225; break; }
					
					case 10237:
						__debugInfo = "1021:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((((local8_Text_Str_1958) + ("RESTORE(datablock_"))) + (param4_expr.attr8_Name_Str))) + (")"));
						
					__debugInfo = "1021:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 10225: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(34))) ? 1 : 0))) { __pc = 10239; break; }
					
					var local1_i_2042 = 0.0;
					case 10244:
						__debugInfo = "1023:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local1_i_2042 = 0;
						
					case 10287:
						__debugInfo = "1028:\src\CompilerPasses\Generator\JSGenerator.gbas";
						var forEachSaver10287 = param4_expr.attr5_Reads;
					var forEachCounter10287 = 0
					
				case 10251: //dummy for1
					if (!(forEachCounter10287 < forEachSaver10287.values.length)) {__pc = 10247; break;}
					var local1_R_2043 = forEachSaver10287.values[forEachCounter10287];
					
					
					case 10262:
						__debugInfo = "1025:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((local8_Text_Str_1958) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local1_R_2043).values[tmpPositionCache][0]))))) + (" = READ()"));
						
					case 10283:
						__debugInfo = "1026:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((local1_i_2042) < (((BOUNDS(param4_expr.attr5_Reads, 0)) - (1)))) ? 1 : 0))) { __pc = 10274; break; }
					
					case 10282:
						__debugInfo = "1026:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((local8_Text_Str_1958) + (";"))) + (func11_NewLine_Str()));
						
					__debugInfo = "1026:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 10274: //dummy jumper1
					;
						
					__debugInfo = "1027:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local1_i_2042+=1;
					__debugInfo = "1025:\src\CompilerPasses\Generator\JSGenerator.gbas";
					forEachSaver10287.values[forEachCounter10287] = local1_R_2043;
					
					forEachCounter10287++
					__pc = 10251; break; //back jump
					
				case 10247: //dummy for
					;
						
					__debugInfo = "1023:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 10239: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(35))) ? 1 : 0))) { __pc = 10289; break; }
					
					case 10300:
						__debugInfo = "1030:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((local8_Text_Str_1958) + (func21_JSGetDefaultValue_Str(param4_expr.attr8_datatype, 0, 0)));
						
					__debugInfo = "1030:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 10289: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(36))) ? 1 : 0))) { __pc = 10302; break; }
					
					var local7_def_Str_2044 = "", local4_Find_2045 = 0;
					case 10311:
						__debugInfo = "1032:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local7_def_Str_2044 = func21_JSGetDefaultValue_Str(param4_expr.attr8_datatype, 1, 1);
						
					__debugInfo = "1033:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((((local8_Text_Str_1958) + ("DIM(pool_array.alloc("))) + (local7_def_Str_2044))) + ("), ["));
					__debugInfo = "1034:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local4_Find_2045 = 0;
					case 10356:
						__debugInfo = "1040:\src\CompilerPasses\Generator\JSGenerator.gbas";
						var forEachSaver10356 = param4_expr.attr4_dims;
					var forEachCounter10356 = 0
					
				case 10332: //dummy for1
					if (!(forEachCounter10356 < forEachSaver10356.values.length)) {__pc = 10328; break;}
					var local1_D_2046 = forEachSaver10356.values[forEachCounter10356];
					
					
					case 10344:
						__debugInfo = "1036:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((local4_Find_2045) === (1)) ? 1 : 0))) { __pc = 10337; break; }
					
					case 10343:
						__debugInfo = "1036:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((local8_Text_Str_1958) + (", "));
						
					__debugInfo = "1036:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 10337: //dummy jumper1
					;
						
					__debugInfo = "1037:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((local8_Text_Str_1958) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local1_D_2046).values[tmpPositionCache][0]))));
					__debugInfo = "1039:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local4_Find_2045 = 1;
					__debugInfo = "1036:\src\CompilerPasses\Generator\JSGenerator.gbas";
					forEachSaver10356.values[forEachCounter10356] = local1_D_2046;
					
					forEachCounter10356++
					__pc = 10332; break; //back jump
					
				case 10328: //dummy for
					;
						
					__debugInfo = "1041:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((((local8_Text_Str_1958) + ("], "))) + (local7_def_Str_2044))) + (")"));
					__debugInfo = "1032:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 10302: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(37))) ? 1 : 0))) { __pc = 10367; break; }
					
					case 10383:
						__debugInfo = "1043:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((local8_Text_Str_1958) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_Name_Str))) + (" = "));
						
					case 10439:
						__debugInfo = "1048:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr3_Typ) === (54)) ? 1 : 0))) { __pc = 10393; break; }
					
					case 10426:
						__debugInfo = "1045:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((((((((local8_Text_Str_1958) + ("castobj("))) + (func16_JSRemoveLast_Str(func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr4_expr).values[tmpPositionCache][0])), "[0]")))) + (", "))) + (func18_ChangeTypeName_Str(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str)))) + (")"));
						
					__debugInfo = "1045:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29464;
					break;
					
				case 10393: //dummy jumper1
					
					case 10438:
						__debugInfo = "1047:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((local8_Text_Str_1958) + (func16_JSRemoveLast_Str(func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0])), "[0]")));
						
					__debugInfo = "1047:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29464: //dummy jumper2
					;
						
					__debugInfo = "1050:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((local8_Text_Str_1958) + (" /* ALIAS */"));
					__debugInfo = "1043:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 10367: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(20))) ? 1 : 0))) { __pc = 10446; break; }
					
					case 10458:
						__debugInfo = "1052:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((((local8_Text_Str_1958) + ("__pc = __labels[\""))) + (param4_expr.attr8_Name_Str))) + ("\"]; break"));
						
					__debugInfo = "1052:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 10446: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(21))) ? 1 : 0))) { __pc = 10460; break; }
					
					case 10479:
						__debugInfo = "1054:\src\CompilerPasses\Generator\JSGenerator.gbas";
						global12_LabelDef_Str = ((((((((((global12_LabelDef_Str) + ("\""))) + (param4_expr.attr8_Name_Str))) + ("\": "))) + (CAST2STRING(param4_expr.attr2_ID)))) + (", "));
						
					__debugInfo = "1056:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((local8_Text_Str_1958) + ("//label: "))) + (param4_expr.attr8_Name_Str));
					__debugInfo = "1054:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 10460: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(39))) ? 1 : 0))) { __pc = 10490; break; }
					
					case 10510:
						__debugInfo = "1058:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((((local8_Text_Str_1958) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0]))))) + ("+="))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))));
						
					__debugInfo = "1058:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 10490: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(40))) ? 1 : 0))) { __pc = 10512; break; }
					
					case 10537:
						__debugInfo = "1060:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((((((((local8_Text_Str_1958) + ("DIMPUSH("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0]))))) + (", "))) + (func16_JSRemoveLast_Str(func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0])), "[0]")))) + (")"));
						
					__debugInfo = "1060:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 10512: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(41))) ? 1 : 0))) { __pc = 10539; break; }
					
					case 10588:
						__debugInfo = "1066:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((param4_expr.attr4_kern) !== (-(1))) ? 1 : 0))) { __pc = 10548; break; }
					
					case 10572:
						__debugInfo = "1063:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((((((((local8_Text_Str_1958) + ("KERNLEN("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (", "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_kern).values[tmpPositionCache][0]))))) + (")"));
						
					__debugInfo = "1063:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29465;
					break;
					
				case 10548: //dummy jumper1
					
					case 10587:
						__debugInfo = "1065:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((((local8_Text_Str_1958) + ("("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (").length"));
						
					__debugInfo = "1065:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29465: //dummy jumper2
					;
						
					__debugInfo = "1066:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 10539: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(45))) ? 1 : 0))) { __pc = 10590; break; }
					
					case 10614:
						__debugInfo = "1068:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((((((((local8_Text_Str_1958) + ("BOUNDS("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_array).values[tmpPositionCache][0]))))) + (", "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_position).values[tmpPositionCache][0]))))) + (")"));
						
					__debugInfo = "1068:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 10590: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(42))) ? 1 : 0))) { __pc = 10616; break; }
					
					var local4_Find_2047 = 0;
					case 10631:
						__debugInfo = "1070:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((((local8_Text_Str_1958) + ("DIMDATA("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_array).values[tmpPositionCache][0]))))) + (", ["));
						
					case 10660:
						__debugInfo = "1078:\src\CompilerPasses\Generator\JSGenerator.gbas";
						var forEachSaver10660 = param4_expr.attr5_Exprs;
					var forEachCounter10660 = 0
					
				case 10638: //dummy for1
					if (!(forEachCounter10660 < forEachSaver10660.values.length)) {__pc = 10634; break;}
					var local4_Elem_2048 = forEachSaver10660.values[forEachCounter10660];
					
					
					case 10648:
						__debugInfo = "1073:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(local4_Find_2047)) { __pc = 10641; break; }
					
					case 10647:
						__debugInfo = "1073:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((local8_Text_Str_1958) + (", "));
						
					__debugInfo = "1073:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 10641: //dummy jumper1
					;
						
					__debugInfo = "1075:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((local8_Text_Str_1958) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local4_Elem_2048).values[tmpPositionCache][0]))));
					__debugInfo = "1077:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local4_Find_2047 = 1;
					__debugInfo = "1073:\src\CompilerPasses\Generator\JSGenerator.gbas";
					forEachSaver10660.values[forEachCounter10660] = local4_Elem_2048;
					
					forEachCounter10660++
					__pc = 10638; break; //back jump
					
				case 10634: //dummy for
					;
						
					__debugInfo = "1079:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((local8_Text_Str_1958) + ("])"));
					__debugInfo = "1070:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 10616: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(43))) ? 1 : 0))) { __pc = 10667; break; }
					
					case 10696:
						__debugInfo = "1081:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((((((((((((((local8_Text_Str_1958) + ("forEachSaver"))) + (CAST2STRING(global14_ForEachCounter)))) + (".values[forEachCounter"))) + (CAST2STRING(global14_ForEachCounter)))) + ("] = "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(global14_ForEachCounter).values[tmpPositionCache][0].attr7_varExpr).values[tmpPositionCache][0]))))) + (";"))) + (func11_NewLine_Str()));
						
					__debugInfo = "1082:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((((((((((local8_Text_Str_1958) + ("DIMDEL(forEachSaver"))) + (CAST2STRING(global14_ForEachCounter)))) + (", forEachCounter"))) + (CAST2STRING(global14_ForEachCounter)))) + (");"))) + (func11_NewLine_Str()));
					__debugInfo = "1083:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((((((local8_Text_Str_1958) + ("forEachCounter"))) + (CAST2STRING(global14_ForEachCounter)))) + ("--;"))) + (func11_NewLine_Str()));
					__debugInfo = "1084:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((local8_Text_Str_1958) + ("continue"));
					__debugInfo = "1081:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 10667: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(44))) ? 1 : 0))) { __pc = 10732; break; }
					
					case 10756:
						__debugInfo = "1086:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((((((((local8_Text_Str_1958) + ("DIMDEL("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_array).values[tmpPositionCache][0]))))) + (", "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_position).values[tmpPositionCache][0]))))) + (")"));
						
					__debugInfo = "1086:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 10732: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(46))) ? 1 : 0))) { __pc = 10758; break; }
					
					case 10773:
						__debugInfo = "1088:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((((local8_Text_Str_1958) + ("(("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (") ? 0 : 1)"));
						
					__debugInfo = "1088:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 10758: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(48))) ? 1 : 0))) { __pc = 10775; break; }
					
					case 10789:
						__debugInfo = "1090:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((local8_Text_Str_1958) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_expr.attr4_func).values[tmpPositionCache][0].attr8_Name_Str));
						
					__debugInfo = "1090:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 10775: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(49))) ? 1 : 0))) { __pc = 10791; break; }
					
					var local8_Cond_Str_2049 = "";
					case 10800:
						__debugInfo = "1092:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Cond_Str_2049 = func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]));
						
					__debugInfo = "1093:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((((((((local8_Text_Str_1958) + ("if (!("))) + (local8_Cond_Str_2049))) + (")) throwError(\"AssertException "))) + (REPLACE_Str(local8_Cond_Str_2049, "\"", "'")))) + ("\")"));
					__debugInfo = "1092:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 10791: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(50))) ? 1 : 0))) { __pc = 10819; break; }
					
					case 10834:
						__debugInfo = "1095:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((((local8_Text_Str_1958) + ("DEBUG("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")"));
						
					__debugInfo = "1095:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 10819: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(51))) ? 1 : 0))) { __pc = 10836; break; }
					
					case 10873:
						__debugInfo = "1097:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((((((((((((local8_Text_Str_1958) + ("(("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr10_Conditions.arrAccess(0).values[tmpPositionCache]).values[tmpPositionCache][0]))))) + (") ? ("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr6_Scopes.arrAccess(0).values[tmpPositionCache]).values[tmpPositionCache][0]))))) + (") : ("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr9_elseScope).values[tmpPositionCache][0]))))) + ("))"));
						
					__debugInfo = "1097:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 10836: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(52))) ? 1 : 0))) { __pc = 10875; break; }
					
					case 10887:
						__debugInfo = "1099:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((((local8_Text_Str_1958) + ("//REQUIRE: "))) + (param4_expr.attr8_Name_Str))) + ("\n"));
						
					__debugInfo = "1100:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((local8_Text_Str_1958) + (param4_expr.attr11_Content_Str))) + (func11_NewLine_Str()));
					__debugInfo = "1101:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_1958 = ((((((local8_Text_Str_1958) + ("//ENDREQUIRE: "))) + (param4_expr.attr8_Name_Str))) + (func11_NewLine_Str()));
					__debugInfo = "1099:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 10875: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(53))) ? 1 : 0))) { __pc = 10909; break; }
					
					var local5_Found_2050 = 0, local3_Scp_2051 = 0;
					case 10914:
						__debugInfo = "1103:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local5_Found_2050 = 0;
						
					__debugInfo = "1104:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local3_Scp_2051 = global12_CurrentScope;
					case 10999:
						__debugInfo = "1117:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((((((((local3_Scp_2051) !== (-(1))) ? 1 : 0)) && (((((((((global5_Exprs_ref[0].arrAccess(local3_Scp_2051).values[tmpPositionCache][0].attr6_ScpTyp) === (2)) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(local3_Scp_2051).values[tmpPositionCache][0].attr6_ScpTyp) === (4)) ? 1 : 0))) ? 1 : 0)) ? 0 : 1))) ? 1 : 0)) && (((local5_Found_2050) ? 0 : 1))) ? 1 : 0))) {__pc = 29467; break;}
					
					var local5_Varis_2052 = pool_array.alloc(0);
					case 10955:
						__debugInfo = "1107:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func8_GetVaris(unref(local5_Varis_2052), local3_Scp_2051, 0);
						
					case 10991:
						__debugInfo = "1115:\src\CompilerPasses\Generator\JSGenerator.gbas";
						var forEachSaver10991 = local5_Varis_2052;
					var forEachCounter10991 = 0
					
				case 10959: //dummy for1
					if (!(forEachCounter10991 < forEachSaver10991.values.length)) {__pc = 10957; break;}
					var local1_V_2053 = forEachSaver10991.values[forEachCounter10991];
					
					
					var alias3_Var_ref_2054 = [pool_TIdentifierVari.alloc()];
					case 10966:
						__debugInfo = "1109:\src\CompilerPasses\Generator\JSGenerator.gbas";
						alias3_Var_ref_2054 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_V_2053).values[tmpPositionCache] /* ALIAS */;
						
					case 10990:
						__debugInfo = "1114:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!((((alias3_Var_ref_2054[0].attr8_Name_Str) === ((("param4_self_") + (CAST2STRING(alias3_Var_ref_2054[0].attr2_ID))))) ? 1 : 0))) { __pc = 10977; break; }
					
					case 10985:
						__debugInfo = "1111:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((local8_Text_Str_1958) + (alias3_Var_ref_2054[0].attr8_Name_Str));
						
					__debugInfo = "1112:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local5_Found_2050 = 1;
					case 10989:
						__debugInfo = "1113:\src\CompilerPasses\Generator\JSGenerator.gbas";
						__pc = 10957; break;
						
					__debugInfo = "1111:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 10977: //dummy jumper1
					;
						
					__debugInfo = "1109:\src\CompilerPasses\Generator\JSGenerator.gbas";pool_TIdentifierVari.free(alias3_Var_ref_2054);
					forEachSaver10991.values[forEachCounter10991] = local1_V_2053;
					
					forEachCounter10991++
					__pc = 10959; break; //back jump
					
				case 10957: //dummy for
					;
						
					__debugInfo = "1116:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local3_Scp_2051 = global5_Exprs_ref[0].arrAccess(local3_Scp_2051).values[tmpPositionCache][0].attr10_SuperScope;
					__debugInfo = "1107:\src\CompilerPasses\Generator\JSGenerator.gbas";pool_array.free(local5_Varis_2052);
					__pc = 10999; break; //back jump
					
				case 29467:
					;
						
					case 11008:
						__debugInfo = "1118:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (!(((local5_Found_2050) ? 0 : 1))) { __pc = 11002; break; }
					
					case 11007:
						__debugInfo = "1118:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func5_Error("Self not found for super", 1117, "src\CompilerPasses\Generator\JSGenerator.gbas");
						
					__debugInfo = "1118:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 11002: //dummy jumper1
					;
						
					__debugInfo = "1103:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 10909: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(54))) ? 1 : 0))) { __pc = 11010; break; }
					
					case 11034:
						__debugInfo = "1121:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_1958 = ((((((((((local8_Text_Str_1958) + ("castobj("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (", "))) + (func18_ChangeTypeName_Str(param4_expr.attr8_datatype.attr8_Name_Str)))) + (")"));
						
					__debugInfo = "1121:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 11010: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(7))) ? 1 : 0))) { __pc = 11036; break; }
					
					
					__pc = 29388;
					break;
					
				case 11036: //dummy jumper1
					if (!((((local17___SelectHelper10__1959) === (~~(8))) ? 1 : 0))) { __pc = 11039; break; }
					
					case 11044:
						__debugInfo = "1124:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func5_Error("Invalid Expression", 1123, "src\CompilerPasses\Generator\JSGenerator.gbas");
						
					__debugInfo = "1124:\src\CompilerPasses\Generator\JSGenerator.gbas";
					__pc = 29388;
					break;
					
				case 11039: //dummy jumper1
					
					case 11054:
						__debugInfo = "1126:\src\CompilerPasses\Generator\JSGenerator.gbas";
						func5_Error((("Unknown expression type: ") + (CAST2STRING(param4_expr.attr3_Typ))), 1125, "src\CompilerPasses\Generator\JSGenerator.gbas");
						
					__debugInfo = "1126:\src\CompilerPasses\Generator\JSGenerator.gbas";
					
				case 29388: //dummy jumper2
					;
						
					__debugInfo = "303:\src\CompilerPasses\Generator\JSGenerator.gbas";
					;
				__debugInfo = "1129:\src\CompilerPasses\Generator\JSGenerator.gbas";
				return tryClone(local8_Text_Str_1958);
				__debugInfo = "1130:\src\CompilerPasses\Generator\JSGenerator.gbas";
				return "";
				__debugInfo = "301:\src\CompilerPasses\Generator\JSGenerator.gbas";__pc = -1; break;
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
		__debugInfo = "1137:\src\CompilerPasses\Generator\JSGenerator.gbas";
		if (func11_JSDoesUnref(param1_E)) {
			__debugInfo = "1134:\src\CompilerPasses\Generator\JSGenerator.gbas";
			return tryClone((((("unref(") + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param1_E).values[tmpPositionCache][0]))))) + (")")));
			__debugInfo = "1134:\src\CompilerPasses\Generator\JSGenerator.gbas";
		} else {
			__debugInfo = "1136:\src\CompilerPasses\Generator\JSGenerator.gbas";
			return tryClone(func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param1_E).values[tmpPositionCache][0])));
			__debugInfo = "1136:\src\CompilerPasses\Generator\JSGenerator.gbas";
		};
		__debugInfo = "1138:\src\CompilerPasses\Generator\JSGenerator.gbas";
		return "";
		__debugInfo = "1137:\src\CompilerPasses\Generator\JSGenerator.gbas";
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
		var local5_unref_2057 = 0;
		__debugInfo = "1141:\src\CompilerPasses\Generator\JSGenerator.gbas";
		local5_unref_2057 = 1;
		__debugInfo = "1177:\src\CompilerPasses\Generator\JSGenerator.gbas";
		if (((global5_Exprs_ref[0].arrAccess(param4_Expr).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) ? 0 : 1)) {
			__debugInfo = "1145:\src\CompilerPasses\Generator\JSGenerator.gbas";
			{
				var local17___SelectHelper16__2058 = 0;
				__debugInfo = "1145:\src\CompilerPasses\Generator\JSGenerator.gbas";
				local17___SelectHelper16__2058 = global5_Exprs_ref[0].arrAccess(param4_Expr).values[tmpPositionCache][0].attr3_Typ;
				__debugInfo = "1176:\src\CompilerPasses\Generator\JSGenerator.gbas";
				if ((((local17___SelectHelper16__2058) === (~~(3))) ? 1 : 0)) {
					__debugInfo = "1147:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local5_unref_2057 = 0;
					__debugInfo = "1147:\src\CompilerPasses\Generator\JSGenerator.gbas";
				} else if ((((local17___SelectHelper16__2058) === (~~(4))) ? 1 : 0)) {
					__debugInfo = "1149:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local5_unref_2057 = 0;
					__debugInfo = "1149:\src\CompilerPasses\Generator\JSGenerator.gbas";
				} else if ((((local17___SelectHelper16__2058) === (~~(5))) ? 1 : 0)) {
					__debugInfo = "1151:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local5_unref_2057 = 0;
					__debugInfo = "1151:\src\CompilerPasses\Generator\JSGenerator.gbas";
				} else if ((((local17___SelectHelper16__2058) === (~~(15))) ? 1 : 0)) {
					__debugInfo = "1153:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local5_unref_2057 = func11_JSDoesUnref(global5_Exprs_ref[0].arrAccess(param4_Expr).values[tmpPositionCache][0].attr4_expr);
					__debugInfo = "1153:\src\CompilerPasses\Generator\JSGenerator.gbas";
				} else if ((((local17___SelectHelper16__2058) === (~~(16))) ? 1 : 0)) {
					__debugInfo = "1155:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local5_unref_2057 = func11_JSDoesUnref(global5_Exprs_ref[0].arrAccess(param4_Expr).values[tmpPositionCache][0].attr4_expr);
					__debugInfo = "1155:\src\CompilerPasses\Generator\JSGenerator.gbas";
				} else if ((((local17___SelectHelper16__2058) === (~~(17))) ? 1 : 0)) {
					__debugInfo = "1157:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local5_unref_2057 = func11_JSDoesUnref(global5_Exprs_ref[0].arrAccess(param4_Expr).values[tmpPositionCache][0].attr4_expr);
					__debugInfo = "1157:\src\CompilerPasses\Generator\JSGenerator.gbas";
				} else if ((((local17___SelectHelper16__2058) === (~~(1))) ? 1 : 0)) {
					__debugInfo = "1159:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local5_unref_2057 = 0;
					__debugInfo = "1159:\src\CompilerPasses\Generator\JSGenerator.gbas";
				} else if ((((local17___SelectHelper16__2058) === (~~(6))) ? 1 : 0)) {
					__debugInfo = "1161:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local5_unref_2057 = 0;
					__debugInfo = "1161:\src\CompilerPasses\Generator\JSGenerator.gbas";
				} else if ((((local17___SelectHelper16__2058) === (~~(23))) ? 1 : 0)) {
					__debugInfo = "1163:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local5_unref_2057 = 0;
					__debugInfo = "1163:\src\CompilerPasses\Generator\JSGenerator.gbas";
				} else if ((((local17___SelectHelper16__2058) === (~~(45))) ? 1 : 0)) {
					__debugInfo = "1165:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local5_unref_2057 = 0;
					__debugInfo = "1165:\src\CompilerPasses\Generator\JSGenerator.gbas";
				} else if ((((local17___SelectHelper16__2058) === (~~(41))) ? 1 : 0)) {
					__debugInfo = "1167:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local5_unref_2057 = 0;
					__debugInfo = "1167:\src\CompilerPasses\Generator\JSGenerator.gbas";
				} else {
					var local1_v_2059 = 0;
					__debugInfo = "1169:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local1_v_2059 = func11_GetVariable(param4_Expr, 0);
					__debugInfo = "1175:\src\CompilerPasses\Generator\JSGenerator.gbas";
					if ((((local1_v_2059) !== (-(1))) ? 1 : 0)) {
						__debugInfo = "1174:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_v_2059).values[tmpPositionCache][0].attr3_ref) ? 0 : 1)) {
							__debugInfo = "1173:\src\CompilerPasses\Generator\JSGenerator.gbas";
							local5_unref_2057 = 0;
							__debugInfo = "1173:\src\CompilerPasses\Generator\JSGenerator.gbas";
						};
						__debugInfo = "1174:\src\CompilerPasses\Generator\JSGenerator.gbas";
					};
					__debugInfo = "1169:\src\CompilerPasses\Generator\JSGenerator.gbas";
				};
				__debugInfo = "1145:\src\CompilerPasses\Generator\JSGenerator.gbas";
			};
			__debugInfo = "1145:\src\CompilerPasses\Generator\JSGenerator.gbas";
		};
		__debugInfo = "1178:\src\CompilerPasses\Generator\JSGenerator.gbas";
		return tryClone(local5_unref_2057);
		__debugInfo = "1179:\src\CompilerPasses\Generator\JSGenerator.gbas";
		return 0;
		__debugInfo = "1141:\src\CompilerPasses\Generator\JSGenerator.gbas";
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
		var local8_Text_Str_2063 = "", local1_i_2064 = 0.0;
		__debugInfo = "1183:\src\CompilerPasses\Generator\JSGenerator.gbas";
		if (param7_DoParam) {
			__debugInfo = "1183:\src\CompilerPasses\Generator\JSGenerator.gbas";
			local8_Text_Str_2063 = "(";
			__debugInfo = "1183:\src\CompilerPasses\Generator\JSGenerator.gbas";
		};
		__debugInfo = "1184:\src\CompilerPasses\Generator\JSGenerator.gbas";
		local1_i_2064 = 0;
		__debugInfo = "1199:\src\CompilerPasses\Generator\JSGenerator.gbas";
		var forEachSaver11349 = param4_expr.attr6_Params;
		for(var forEachCounter11349 = 0 ; forEachCounter11349 < forEachSaver11349.values.length ; forEachCounter11349++) {
			var local5_param_2065 = forEachSaver11349.values[forEachCounter11349];
		{
				__debugInfo = "1188:\src\CompilerPasses\Generator\JSGenerator.gbas";
				if ((((((((((param4_func) !== (-(1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr3_Typ) === (3)) ? 1 : 0))) ? 1 : 0)) && ((((local1_i_2064) === (((BOUNDS(param4_expr.attr6_Params, 0)) - (1)))) ? 1 : 0))) ? 1 : 0)) {
					__debugInfo = "1188:\src\CompilerPasses\Generator\JSGenerator.gbas";
					break;
					__debugInfo = "1188:\src\CompilerPasses\Generator\JSGenerator.gbas";
				};
				__debugInfo = "1189:\src\CompilerPasses\Generator\JSGenerator.gbas";
				if (local1_i_2064) {
					__debugInfo = "1189:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_2063 = ((local8_Text_Str_2063) + (", "));
					__debugInfo = "1189:\src\CompilerPasses\Generator\JSGenerator.gbas";
				};
				__debugInfo = "1196:\src\CompilerPasses\Generator\JSGenerator.gbas";
				if ((((((((((param4_func) !== (-(1))) ? 1 : 0)) && (((global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr15_UsedAsPrototype) ? 0 : 1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_i_2064)).values[tmpPositionCache]).values[tmpPositionCache][0].attr3_ref) === (0)) ? 1 : 0))) ? 1 : 0)) {
					__debugInfo = "1193:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_2063 = ((local8_Text_Str_2063) + (func14_JSTryUnref_Str(local5_param_2065)));
					__debugInfo = "1193:\src\CompilerPasses\Generator\JSGenerator.gbas";
				} else {
					__debugInfo = "1195:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_2063 = ((local8_Text_Str_2063) + (func16_JSRemoveLast_Str(func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local5_param_2065).values[tmpPositionCache][0])), "[0]")));
					__debugInfo = "1195:\src\CompilerPasses\Generator\JSGenerator.gbas";
				};
				__debugInfo = "1198:\src\CompilerPasses\Generator\JSGenerator.gbas";
				local1_i_2064+=1;
				__debugInfo = "1188:\src\CompilerPasses\Generator\JSGenerator.gbas";
			}
			forEachSaver11349.values[forEachCounter11349] = local5_param_2065;
		
		};
		__debugInfo = "1200:\src\CompilerPasses\Generator\JSGenerator.gbas";
		if (param7_DoParam) {
			__debugInfo = "1200:\src\CompilerPasses\Generator\JSGenerator.gbas";
			local8_Text_Str_2063 = ((local8_Text_Str_2063) + (")"));
			__debugInfo = "1200:\src\CompilerPasses\Generator\JSGenerator.gbas";
		};
		__debugInfo = "1201:\src\CompilerPasses\Generator\JSGenerator.gbas";
		return tryClone(local8_Text_Str_2063);
		__debugInfo = "1202:\src\CompilerPasses\Generator\JSGenerator.gbas";
		return "";
		__debugInfo = "1183:\src\CompilerPasses\Generator\JSGenerator.gbas";
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
		var local8_Text_Str_2070 = "", local4_Find_2071 = 0.0;
		__debugInfo = "1205:\src\CompilerPasses\Generator\JSGenerator.gbas";
		local8_Text_Str_2070 = "";
		__debugInfo = "1206:\src\CompilerPasses\Generator\JSGenerator.gbas";
		local4_Find_2071 = 0;
		__debugInfo = "1221:\src\CompilerPasses\Generator\JSGenerator.gbas";
		var forEachSaver11503 = param5_Varis;
		for(var forEachCounter11503 = 0 ; forEachCounter11503 < forEachSaver11503.values.length ; forEachCounter11503++) {
			var local3_Var_2072 = forEachSaver11503.values[forEachCounter11503];
		{
				__debugInfo = "1220:\src\CompilerPasses\Generator\JSGenerator.gbas";
				if ((((((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2072).values[tmpPositionCache][0].attr3_Typ) !== (5)) ? 1 : 0)) && (((((((param8_NoStatic) === (0)) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2072).values[tmpPositionCache][0].attr3_Typ) !== (4)) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) && (func17_JSShouldRedeclare(local3_Var_2072))) ? 1 : 0)) {
					__debugInfo = "1209:\src\CompilerPasses\Generator\JSGenerator.gbas";
					if (local4_Find_2071) {
						__debugInfo = "1209:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_2070 = ((local8_Text_Str_2070) + (", "));
						__debugInfo = "1209:\src\CompilerPasses\Generator\JSGenerator.gbas";
					};
					__debugInfo = "1210:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local8_Text_Str_2070 = ((local8_Text_Str_2070) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2072).values[tmpPositionCache][0].attr8_Name_Str));
					__debugInfo = "1218:\src\CompilerPasses\Generator\JSGenerator.gbas";
					if (param7_InitVal) {
						__debugInfo = "1212:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local8_Text_Str_2070 = ((local8_Text_Str_2070) + (" = "));
						__debugInfo = "1217:\src\CompilerPasses\Generator\JSGenerator.gbas";
						if (((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2072).values[tmpPositionCache][0].attr6_PreDef) !== (-(1))) ? 1 : 0)) && (((((((param12_ForceDefault) === (0)) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2072).values[tmpPositionCache][0].attr3_Typ) === (6)) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) {
							__debugInfo = "1214:\src\CompilerPasses\Generator\JSGenerator.gbas";
							local8_Text_Str_2070 = ((local8_Text_Str_2070) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2072).values[tmpPositionCache][0].attr6_PreDef).values[tmpPositionCache][0]))));
							__debugInfo = "1214:\src\CompilerPasses\Generator\JSGenerator.gbas";
						} else {
							__debugInfo = "1216:\src\CompilerPasses\Generator\JSGenerator.gbas";
							local8_Text_Str_2070 = ((local8_Text_Str_2070) + (func21_JSGetDefaultValue_Str(global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2072).values[tmpPositionCache][0].attr8_datatype, global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2072).values[tmpPositionCache][0].attr3_ref, 0)));
							__debugInfo = "1216:\src\CompilerPasses\Generator\JSGenerator.gbas";
						};
						__debugInfo = "1212:\src\CompilerPasses\Generator\JSGenerator.gbas";
					};
					__debugInfo = "1219:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local4_Find_2071 = 1;
					__debugInfo = "1209:\src\CompilerPasses\Generator\JSGenerator.gbas";
				};
				__debugInfo = "1220:\src\CompilerPasses\Generator\JSGenerator.gbas";
			}
			forEachSaver11503.values[forEachCounter11503] = local3_Var_2072;
		
		};
		__debugInfo = "1223:\src\CompilerPasses\Generator\JSGenerator.gbas";
		return tryClone(local8_Text_Str_2070);
		__debugInfo = "1224:\src\CompilerPasses\Generator\JSGenerator.gbas";
		return "";
		__debugInfo = "1205:\src\CompilerPasses\Generator\JSGenerator.gbas";pool_array.free(param5_Varis);
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
		__debugInfo = "1231:\src\CompilerPasses\Generator\JSGenerator.gbas";
		if ((((param4_expr.attr3_Typ) === (16)) ? 1 : 0)) {
			__debugInfo = "1228:\src\CompilerPasses\Generator\JSGenerator.gbas";
			return tryClone(func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0])));
			__debugInfo = "1228:\src\CompilerPasses\Generator\JSGenerator.gbas";
		} else {
			__debugInfo = "1230:\src\CompilerPasses\Generator\JSGenerator.gbas";
			return tryClone(func14_JSGenerate_Str(param4_expr));
			__debugInfo = "1230:\src\CompilerPasses\Generator\JSGenerator.gbas";
		};
		__debugInfo = "1232:\src\CompilerPasses\Generator\JSGenerator.gbas";
		return "";
		__debugInfo = "1231:\src\CompilerPasses\Generator\JSGenerator.gbas";
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
		__debugInfo = "1243:\src\CompilerPasses\Generator\JSGenerator.gbas";
		if ((((global11_CurrentFunc) !== (-(1))) ? 1 : 0)) {
			__debugInfo = "1242:\src\CompilerPasses\Generator\JSGenerator.gbas";
			var forEachSaver11558 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr10_CopyParams;
			for(var forEachCounter11558 = 0 ; forEachCounter11558 < forEachSaver11558.values.length ; forEachCounter11558++) {
				var local1_P_2075 = forEachSaver11558.values[forEachCounter11558];
			{
					__debugInfo = "1241:\src\CompilerPasses\Generator\JSGenerator.gbas";
					if ((((local1_P_2075) === (param3_Var)) ? 1 : 0)) {
						__debugInfo = "1240:\src\CompilerPasses\Generator\JSGenerator.gbas";
						return tryClone(0);
						__debugInfo = "1240:\src\CompilerPasses\Generator\JSGenerator.gbas";
					};
					__debugInfo = "1241:\src\CompilerPasses\Generator\JSGenerator.gbas";
				}
				forEachSaver11558.values[forEachCounter11558] = local1_P_2075;
			
			};
			__debugInfo = "1242:\src\CompilerPasses\Generator\JSGenerator.gbas";
		};
		__debugInfo = "1244:\src\CompilerPasses\Generator\JSGenerator.gbas";
		return 1;
		__debugInfo = "1245:\src\CompilerPasses\Generator\JSGenerator.gbas";
		return 0;
		__debugInfo = "1243:\src\CompilerPasses\Generator\JSGenerator.gbas";
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
		var local10_RetVal_Str_2079 = "";
		__debugInfo = "1248:\src\CompilerPasses\Generator\JSGenerator.gbas";
		local10_RetVal_Str_2079 = "";
		__debugInfo = "1266:\src\CompilerPasses\Generator\JSGenerator.gbas";
		if ((((param8_datatype.attr7_IsArray) && ((((param11_IgnoreArray) === (0)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "1250:\src\CompilerPasses\Generator\JSGenerator.gbas";
			local10_RetVal_Str_2079 = (((("pool_array.alloc(") + (func21_JSGetDefaultValue_Str(param8_datatype, param3_Ref, 1)))) + (")"));
			__debugInfo = "1250:\src\CompilerPasses\Generator\JSGenerator.gbas";
		} else {
			__debugInfo = "1252:\src\CompilerPasses\Generator\JSGenerator.gbas";
			{
				var local17___SelectHelper17__2080 = "";
				__debugInfo = "1252:\src\CompilerPasses\Generator\JSGenerator.gbas";
				local17___SelectHelper17__2080 = param8_datatype.attr8_Name_Str;
				__debugInfo = "1265:\src\CompilerPasses\Generator\JSGenerator.gbas";
				if ((((local17___SelectHelper17__2080) === ("int")) ? 1 : 0)) {
					__debugInfo = "1254:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local10_RetVal_Str_2079 = "0";
					__debugInfo = "1254:\src\CompilerPasses\Generator\JSGenerator.gbas";
				} else if ((((local17___SelectHelper17__2080) === ("float")) ? 1 : 0)) {
					__debugInfo = "1256:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local10_RetVal_Str_2079 = "0.0";
					__debugInfo = "1256:\src\CompilerPasses\Generator\JSGenerator.gbas";
				} else if ((((local17___SelectHelper17__2080) === ("string")) ? 1 : 0)) {
					__debugInfo = "1258:\src\CompilerPasses\Generator\JSGenerator.gbas";
					local10_RetVal_Str_2079 = "\"\"";
					__debugInfo = "1258:\src\CompilerPasses\Generator\JSGenerator.gbas";
				} else {
					__debugInfo = "1264:\src\CompilerPasses\Generator\JSGenerator.gbas";
					if (func6_IsType(param8_datatype.attr8_Name_Str)) {
						__debugInfo = "1261:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local10_RetVal_Str_2079 = (((("pool_") + (param8_datatype.attr8_Name_Str))) + (".alloc()"));
						__debugInfo = "1261:\src\CompilerPasses\Generator\JSGenerator.gbas";
					} else {
						__debugInfo = "1263:\src\CompilerPasses\Generator\JSGenerator.gbas";
						local10_RetVal_Str_2079 = REPLACE_Str(param8_datatype.attr8_Name_Str, "$", "_Str");
						__debugInfo = "1263:\src\CompilerPasses\Generator\JSGenerator.gbas";
					};
					__debugInfo = "1264:\src\CompilerPasses\Generator\JSGenerator.gbas";
				};
				__debugInfo = "1252:\src\CompilerPasses\Generator\JSGenerator.gbas";
			};
			__debugInfo = "1252:\src\CompilerPasses\Generator\JSGenerator.gbas";
		};
		__debugInfo = "1267:\src\CompilerPasses\Generator\JSGenerator.gbas";
		if (param3_Ref) {
			__debugInfo = "1267:\src\CompilerPasses\Generator\JSGenerator.gbas";
			local10_RetVal_Str_2079 = (((("[") + (local10_RetVal_Str_2079))) + ("]"));
			__debugInfo = "1267:\src\CompilerPasses\Generator\JSGenerator.gbas";
		};
		__debugInfo = "1268:\src\CompilerPasses\Generator\JSGenerator.gbas";
		return tryClone(local10_RetVal_Str_2079);
		__debugInfo = "1269:\src\CompilerPasses\Generator\JSGenerator.gbas";
		return "";
		__debugInfo = "1248:\src\CompilerPasses\Generator\JSGenerator.gbas";
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
		__debugInfo = "1272:\src\CompilerPasses\Generator\JSGenerator.gbas";
		if ((((((((param8_Text_Str).length) > ((param5_L_Str).length)) ? 1 : 0)) && ((((RIGHT_Str(param8_Text_Str, (param5_L_Str).length)) === (param5_L_Str)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "1272:\src\CompilerPasses\Generator\JSGenerator.gbas";
			param8_Text_Str = LEFT_Str(param8_Text_Str, (((param8_Text_Str).length) - ((param5_L_Str).length)));
			__debugInfo = "1272:\src\CompilerPasses\Generator\JSGenerator.gbas";
		};
		__debugInfo = "1273:\src\CompilerPasses\Generator\JSGenerator.gbas";
		return tryClone(param8_Text_Str);
		__debugInfo = "1274:\src\CompilerPasses\Generator\JSGenerator.gbas";
		return "";
		__debugInfo = "1272:\src\CompilerPasses\Generator\JSGenerator.gbas";
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
		var local12_Splitter_Str_2083 = pool_array.alloc(""), local11_SplitterMap_2084 = pool_HashMap.alloc(), local9_LastFound_2086 = 0, local4_Line_2087 = 0, local15_LineContent_Str_2088 = "", local18_NewLineContent_Str_2089 = "", local8_Path_Str_2090 = "", local9_Character_2091 = 0, local5_WasNL_2105 = 0, local6_WasRem_2106 = 0, local6_HasDel_2107 = 0, local1_i_2111 = 0.0;
		__debugInfo = "8:\src\CompilerPasses\Lexer.gbas";
		REDIM(global8_Compiler.attr6_Tokens, [0], pool_TToken.alloc() );
		__debugInfo = "9:\src\CompilerPasses\Lexer.gbas";
		global8_Compiler.attr11_LastTokenID = 0;
		__debugInfo = "12:\src\CompilerPasses\Lexer.gbas";
		DIMDATA(local12_Splitter_Str_2083, [" ", "\t", "\n", "-", "+", "*", "/", "^", ",", "=", "<", ">", "|", "&", "[", "]", "(", ")", "!", "\"", "?", ";", ".", ":", CHR_Str(8), CHR_Str(12), "\r", "\f"]);
		__debugInfo = "15:\src\CompilerPasses\Lexer.gbas";
		(local11_SplitterMap_2084).SetSize(((BOUNDS(local12_Splitter_Str_2083, 0)) * (8)));
		__debugInfo = "18:\src\CompilerPasses\Lexer.gbas";
		var forEachSaver11750 = local12_Splitter_Str_2083;
		for(var forEachCounter11750 = 0 ; forEachCounter11750 < forEachSaver11750.values.length ; forEachCounter11750++) {
			var local9_Split_Str_2085 = forEachSaver11750.values[forEachCounter11750];
		{
				__debugInfo = "17:\src\CompilerPasses\Lexer.gbas";
				(local11_SplitterMap_2084).Put(local9_Split_Str_2085, 1);
				__debugInfo = "17:\src\CompilerPasses\Lexer.gbas";
			}
			forEachSaver11750.values[forEachCounter11750] = local9_Split_Str_2085;
		
		};
		__debugInfo = "22:\src\CompilerPasses\Lexer.gbas";
		global8_Compiler.attr8_Code_Str = (("\n") + (global8_Compiler.attr8_Code_Str));
		__debugInfo = "24:\src\CompilerPasses\Lexer.gbas";
		{
			var local1_i_2092 = 0;
			__debugInfo = "97:\src\CompilerPasses\Lexer.gbas";
			for (local1_i_2092 = 0;toCheck(local1_i_2092, (((global8_Compiler.attr8_Code_Str).length) - (1)), 1);local1_i_2092 += 1) {
				var local14_DoubleChar_Str_2093 = "", local11_curChar_Str_2096 = "", local15_TmpLineCont_Str_2097 = "";
				__debugInfo = "26:\src\CompilerPasses\Lexer.gbas";
				local9_Character_2091+=1;
				__debugInfo = "29:\src\CompilerPasses\Lexer.gbas";
				if ((((local1_i_2092) < ((((global8_Compiler.attr8_Code_Str).length) - (2)))) ? 1 : 0)) {
					__debugInfo = "29:\src\CompilerPasses\Lexer.gbas";
					local14_DoubleChar_Str_2093 = MID_Str(global8_Compiler.attr8_Code_Str, local1_i_2092, 2);
					__debugInfo = "29:\src\CompilerPasses\Lexer.gbas";
				};
				__debugInfo = "47:\src\CompilerPasses\Lexer.gbas";
				if ((((local14_DoubleChar_Str_2093) === ("//")) ? 1 : 0)) {
					var local8_Text_Str_2094 = "", local3_Pos_2095 = 0;
					__debugInfo = "31:\src\CompilerPasses\Lexer.gbas";
					local8_Text_Str_2094 = MID_Str(global8_Compiler.attr8_Code_Str, local9_LastFound_2086, ((local1_i_2092) - (local9_LastFound_2086)));
					__debugInfo = "34:\src\CompilerPasses\Lexer.gbas";
					if ((((TRIM_Str(local8_Text_Str_2094, " \t\r\n\v\f")) !== ("")) ? 1 : 0)) {
						__debugInfo = "33:\src\CompilerPasses\Lexer.gbas";
						func11_CreateToken(local8_Text_Str_2094, local15_LineContent_Str_2088, local4_Line_2087, local9_Character_2091, local8_Path_Str_2090);
						__debugInfo = "33:\src\CompilerPasses\Lexer.gbas";
					};
					__debugInfo = "36:\src\CompilerPasses\Lexer.gbas";
					local3_Pos_2095 = local1_i_2092;
					__debugInfo = "39:\src\CompilerPasses\Lexer.gbas";
					while (((((((MID_Str(global8_Compiler.attr8_Code_Str, local1_i_2092, 1)) !== ("\n")) ? 1 : 0)) && ((((MID_Str(global8_Compiler.attr8_Code_Str, local1_i_2092, 1)) !== ("\f")) ? 1 : 0))) ? 1 : 0)) {
						__debugInfo = "38:\src\CompilerPasses\Lexer.gbas";
						local1_i_2092+=1;
						__debugInfo = "38:\src\CompilerPasses\Lexer.gbas";
					};
					__debugInfo = "40:\src\CompilerPasses\Lexer.gbas";
					local8_Text_Str_2094 = MID_Str(global8_Compiler.attr8_Code_Str, local3_Pos_2095, ((local1_i_2092) - (local3_Pos_2095)));
					__debugInfo = "45:\src\CompilerPasses\Lexer.gbas";
					if ((((((((local8_Text_Str_2094).length) > (("//$$RESETFILE").length)) ? 1 : 0)) && ((((LEFT_Str(local8_Text_Str_2094, ("//$$RESETFILE").length)) === ("//$$RESETFILE")) ? 1 : 0))) ? 1 : 0)) {
						__debugInfo = "42:\src\CompilerPasses\Lexer.gbas";
						local8_Text_Str_2094 = MID_Str(local8_Text_Str_2094, ((("//$$RESETFILE").length) + (1)), -(1));
						__debugInfo = "43:\src\CompilerPasses\Lexer.gbas";
						local8_Path_Str_2090 = local8_Text_Str_2094;
						__debugInfo = "44:\src\CompilerPasses\Lexer.gbas";
						local4_Line_2087 = 0;
						__debugInfo = "42:\src\CompilerPasses\Lexer.gbas";
					};
					__debugInfo = "46:\src\CompilerPasses\Lexer.gbas";
					local9_LastFound_2086 = local1_i_2092;
					__debugInfo = "31:\src\CompilerPasses\Lexer.gbas";
				};
				__debugInfo = "49:\src\CompilerPasses\Lexer.gbas";
				local11_curChar_Str_2096 = MID_Str(global8_Compiler.attr8_Code_Str, local1_i_2092, 1);
				__debugInfo = "51:\src\CompilerPasses\Lexer.gbas";
				local15_TmpLineCont_Str_2097 = local15_LineContent_Str_2088;
				__debugInfo = "52:\src\CompilerPasses\Lexer.gbas";
				if ((((local11_curChar_Str_2096) === ("\f")) ? 1 : 0)) {
					__debugInfo = "52:\src\CompilerPasses\Lexer.gbas";
					local11_curChar_Str_2096 = "\n";
					__debugInfo = "52:\src\CompilerPasses\Lexer.gbas";
				};
				__debugInfo = "53:\src\CompilerPasses\Lexer.gbas";
				{
					var local17___SelectHelper18__2098 = "";
					__debugInfo = "53:\src\CompilerPasses\Lexer.gbas";
					local17___SelectHelper18__2098 = local11_curChar_Str_2096;
					__debugInfo = "81:\src\CompilerPasses\Lexer.gbas";
					if ((((local17___SelectHelper18__2098) === ("\n")) ? 1 : 0)) {
						__debugInfo = "55:\src\CompilerPasses\Lexer.gbas";
						local9_Character_2091 = 0;
						__debugInfo = "56:\src\CompilerPasses\Lexer.gbas";
						local4_Line_2087+=1;
						__debugInfo = "56:\src\CompilerPasses\Lexer.gbas";
						{
							var local1_j_2099 = 0;
							__debugInfo = "63:\src\CompilerPasses\Lexer.gbas";
							for (local1_j_2099 = ((local1_i_2092) + (1));toCheck(local1_j_2099, (((global8_Compiler.attr8_Code_Str).length) - (1)), 1);local1_j_2099 += 1) {
								__debugInfo = "62:\src\CompilerPasses\Lexer.gbas";
								if (((((((MID_Str(global8_Compiler.attr8_Code_Str, local1_j_2099, 1)) === ("\n")) ? 1 : 0)) || ((((MID_Str(global8_Compiler.attr8_Code_Str, local1_j_2099, 1)) === ("\f")) ? 1 : 0))) ? 1 : 0)) {
									__debugInfo = "59:\src\CompilerPasses\Lexer.gbas";
									local15_TmpLineCont_Str_2097 = TRIM_Str(MID_Str(global8_Compiler.attr8_Code_Str, local1_i_2092, ((local1_j_2099) - (local1_i_2092))), " \t\r\n\v\f");
									__debugInfo = "60:\src\CompilerPasses\Lexer.gbas";
									if ((((RIGHT_Str(local15_TmpLineCont_Str_2097, 1)) === ("\f")) ? 1 : 0)) {
										__debugInfo = "60:\src\CompilerPasses\Lexer.gbas";
										local15_TmpLineCont_Str_2097 = ((MID_Str(local15_TmpLineCont_Str_2097, 0, (((local15_TmpLineCont_Str_2097).length) - (1)))) + ("\n"));
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
					} else if ((((local17___SelectHelper18__2098) === ("\"")) ? 1 : 0)) {
						var local12_WasBackSlash_2100 = 0, local10_WasWasBack_2101 = 0;
						__debugInfo = "64:\src\CompilerPasses\Lexer.gbas";
						local12_WasBackSlash_2100 = 0;
						__debugInfo = "65:\src\CompilerPasses\Lexer.gbas";
						local10_WasWasBack_2101 = 0;
						__debugInfo = "65:\src\CompilerPasses\Lexer.gbas";
						{
							var local1_j_2102 = 0;
							__debugInfo = "79:\src\CompilerPasses\Lexer.gbas";
							for (local1_j_2102 = ((local1_i_2092) + (1));toCheck(local1_j_2102, (((global8_Compiler.attr8_Code_Str).length) - (1)), 1);local1_j_2102 += 1) {
								__debugInfo = "69:\src\CompilerPasses\Lexer.gbas";
								if (((((((MID_Str(global8_Compiler.attr8_Code_Str, local1_j_2102, 1)) === ("\n")) ? 1 : 0)) || ((((MID_Str(global8_Compiler.attr8_Code_Str, local1_j_2102, 1)) === ("\f")) ? 1 : 0))) ? 1 : 0)) {
									__debugInfo = "68:\src\CompilerPasses\Lexer.gbas";
									local4_Line_2087+=1;
									__debugInfo = "68:\src\CompilerPasses\Lexer.gbas";
								};
								__debugInfo = "73:\src\CompilerPasses\Lexer.gbas";
								if (((((((MID_Str(global8_Compiler.attr8_Code_Str, local1_j_2102, 1)) === ("\"")) ? 1 : 0)) && (((((((local12_WasBackSlash_2100) === (0)) ? 1 : 0)) || (local10_WasWasBack_2101)) ? 1 : 0))) ? 1 : 0)) {
									__debugInfo = "71:\src\CompilerPasses\Lexer.gbas";
									local1_i_2092 = local1_j_2102;
									__debugInfo = "72:\src\CompilerPasses\Lexer.gbas";
									break;
									__debugInfo = "71:\src\CompilerPasses\Lexer.gbas";
								};
								__debugInfo = "74:\src\CompilerPasses\Lexer.gbas";
								local10_WasWasBack_2101 = local12_WasBackSlash_2100;
								__debugInfo = "75:\src\CompilerPasses\Lexer.gbas";
								local12_WasBackSlash_2100 = 0;
								__debugInfo = "78:\src\CompilerPasses\Lexer.gbas";
								if ((((MID_Str(global8_Compiler.attr8_Code_Str, local1_j_2102, 1)) === ("\\")) ? 1 : 0)) {
									__debugInfo = "77:\src\CompilerPasses\Lexer.gbas";
									local12_WasBackSlash_2100 = 1;
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
				if ((local11_SplitterMap_2084).DoesKeyExist(local11_curChar_Str_2096)) {
					var local9_Split_Str_2103 = "", local8_Text_Str_2104 = "";
					__debugInfo = "84:\src\CompilerPasses\Lexer.gbas";
					local9_Split_Str_2103 = local11_curChar_Str_2096;
					__debugInfo = "85:\src\CompilerPasses\Lexer.gbas";
					local8_Text_Str_2104 = MID_Str(global8_Compiler.attr8_Code_Str, local9_LastFound_2086, ((local1_i_2092) - (local9_LastFound_2086)));
					__debugInfo = "86:\src\CompilerPasses\Lexer.gbas";
					if ((((local8_Text_Str_2104) === (";")) ? 1 : 0)) {
						__debugInfo = "86:\src\CompilerPasses\Lexer.gbas";
						local8_Text_Str_2104 = "\n";
						__debugInfo = "86:\src\CompilerPasses\Lexer.gbas";
					};
					__debugInfo = "87:\src\CompilerPasses\Lexer.gbas";
					func11_CreateToken(local8_Text_Str_2104, local15_LineContent_Str_2088, local4_Line_2087, local9_Character_2091, local8_Path_Str_2090);
					__debugInfo = "89:\src\CompilerPasses\Lexer.gbas";
					local8_Text_Str_2104 = MID_Str(global8_Compiler.attr8_Code_Str, local1_i_2092, (local9_Split_Str_2103).length);
					__debugInfo = "90:\src\CompilerPasses\Lexer.gbas";
					if ((((local8_Text_Str_2104) === (";")) ? 1 : 0)) {
						__debugInfo = "90:\src\CompilerPasses\Lexer.gbas";
						local8_Text_Str_2104 = "\n";
						__debugInfo = "90:\src\CompilerPasses\Lexer.gbas";
					};
					__debugInfo = "91:\src\CompilerPasses\Lexer.gbas";
					func11_CreateToken(local8_Text_Str_2104, local15_LineContent_Str_2088, local4_Line_2087, local9_Character_2091, local8_Path_Str_2090);
					__debugInfo = "93:\src\CompilerPasses\Lexer.gbas";
					local9_LastFound_2086 = ((local1_i_2092) + ((local9_Split_Str_2103).length));
					__debugInfo = "84:\src\CompilerPasses\Lexer.gbas";
				};
				__debugInfo = "96:\src\CompilerPasses\Lexer.gbas";
				local15_LineContent_Str_2088 = local15_TmpLineCont_Str_2097;
				__debugInfo = "26:\src\CompilerPasses\Lexer.gbas";
			};
			__debugInfo = "97:\src\CompilerPasses\Lexer.gbas";
		};
		__debugInfo = "98:\src\CompilerPasses\Lexer.gbas";
		func11_CreateToken("__EOFFILE__", "__EOFFILE__", local4_Line_2087, 0, local8_Path_Str_2090);
		__debugInfo = "99:\src\CompilerPasses\Lexer.gbas";
		func11_CreateToken("\n", "__EOFFILE__", local4_Line_2087, 0, local8_Path_Str_2090);
		__debugInfo = "102:\src\CompilerPasses\Lexer.gbas";
		local5_WasNL_2105 = 0;
		__debugInfo = "102:\src\CompilerPasses\Lexer.gbas";
		local6_WasRem_2106 = 0;
		__debugInfo = "103:\src\CompilerPasses\Lexer.gbas";
		local6_HasDel_2107 = 0;
		__debugInfo = "104:\src\CompilerPasses\Lexer.gbas";
		{
			var local1_i_2108 = 0.0;
			__debugInfo = "169:\src\CompilerPasses\Lexer.gbas";
			for (local1_i_2108 = 0;toCheck(local1_i_2108, ((global8_Compiler.attr11_LastTokenID) - (1)), 1);local1_i_2108 += 1) {
				var local8_Text_Str_2109 = "";
				__debugInfo = "113:\src\CompilerPasses\Lexer.gbas";
				if (local6_HasDel_2107) {
					__debugInfo = "107:\src\CompilerPasses\Lexer.gbas";
					local6_HasDel_2107 = 0;
					__debugInfo = "108:\src\CompilerPasses\Lexer.gbas";
					global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2108)).values[tmpPositionCache].attr5_IsDel = 1;
					__debugInfo = "112:\src\CompilerPasses\Lexer.gbas";
					continue;
					__debugInfo = "107:\src\CompilerPasses\Lexer.gbas";
				};
				__debugInfo = "114:\src\CompilerPasses\Lexer.gbas";
				local8_Text_Str_2109 = global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2108)).values[tmpPositionCache].attr8_Text_Str;
				__debugInfo = "127:\src\CompilerPasses\Lexer.gbas";
				if ((((global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2108)).values[tmpPositionCache].attr8_Text_Str) === ("\n")) ? 1 : 0)) {
					__debugInfo = "116:\src\CompilerPasses\Lexer.gbas";
					local8_Text_Str_2109 = "NEWLINE";
					__debugInfo = "123:\src\CompilerPasses\Lexer.gbas";
					if (local5_WasNL_2105) {
						__debugInfo = "118:\src\CompilerPasses\Lexer.gbas";
						global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2108)).values[tmpPositionCache].attr5_IsDel = 1;
						__debugInfo = "122:\src\CompilerPasses\Lexer.gbas";
						continue;
						__debugInfo = "118:\src\CompilerPasses\Lexer.gbas";
					};
					__debugInfo = "124:\src\CompilerPasses\Lexer.gbas";
					local5_WasNL_2105 = 1;
					__debugInfo = "116:\src\CompilerPasses\Lexer.gbas";
				} else {
					__debugInfo = "126:\src\CompilerPasses\Lexer.gbas";
					local5_WasNL_2105 = 0;
					__debugInfo = "126:\src\CompilerPasses\Lexer.gbas";
				};
				__debugInfo = "130:\src\CompilerPasses\Lexer.gbas";
				if ((((global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2108)).values[tmpPositionCache].attr8_Text_Str) === ("REM")) ? 1 : 0)) {
					__debugInfo = "129:\src\CompilerPasses\Lexer.gbas";
					local6_WasRem_2106 = 1;
					__debugInfo = "129:\src\CompilerPasses\Lexer.gbas";
				};
				__debugInfo = "140:\src\CompilerPasses\Lexer.gbas";
				if ((((local6_WasRem_2106) && ((((global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2108)).values[tmpPositionCache].attr8_Text_Str) === ("ENDREM")) ? 1 : 0))) ? 1 : 0)) {
					__debugInfo = "132:\src\CompilerPasses\Lexer.gbas";
					local6_WasRem_2106 = 0;
					__debugInfo = "133:\src\CompilerPasses\Lexer.gbas";
					local6_HasDel_2107 = 1;
					__debugInfo = "135:\src\CompilerPasses\Lexer.gbas";
					global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2108)).values[tmpPositionCache].attr5_IsDel = 1;
					__debugInfo = "139:\src\CompilerPasses\Lexer.gbas";
					continue;
					__debugInfo = "132:\src\CompilerPasses\Lexer.gbas";
				};
				__debugInfo = "147:\src\CompilerPasses\Lexer.gbas";
				if (local6_WasRem_2106) {
					__debugInfo = "142:\src\CompilerPasses\Lexer.gbas";
					global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2108)).values[tmpPositionCache].attr5_IsDel = 1;
					__debugInfo = "146:\src\CompilerPasses\Lexer.gbas";
					continue;
					__debugInfo = "142:\src\CompilerPasses\Lexer.gbas";
				};
				__debugInfo = "168:\src\CompilerPasses\Lexer.gbas";
				if ((((local1_i_2108) < (((global8_Compiler.attr11_LastTokenID) - (1)))) ? 1 : 0)) {
					__debugInfo = "149:\src\CompilerPasses\Lexer.gbas";
					{
						var local17___SelectHelper19__2110 = "";
						__debugInfo = "149:\src\CompilerPasses\Lexer.gbas";
						local17___SelectHelper19__2110 = global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2108)).values[tmpPositionCache].attr8_Text_Str;
						__debugInfo = "167:\src\CompilerPasses\Lexer.gbas";
						if ((((local17___SelectHelper19__2110) === ("<")) ? 1 : 0)) {
							__debugInfo = "155:\src\CompilerPasses\Lexer.gbas";
							if ((((global8_Compiler.attr6_Tokens.arrAccess(~~(((local1_i_2108) + (1)))).values[tmpPositionCache].attr8_Text_Str) === (">")) ? 1 : 0)) {
								__debugInfo = "152:\src\CompilerPasses\Lexer.gbas";
								global8_Compiler.attr6_Tokens.arrAccess(~~(((local1_i_2108) + (1)))).values[tmpPositionCache].attr5_IsDel = 1;
								__debugInfo = "154:\src\CompilerPasses\Lexer.gbas";
								global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2108)).values[tmpPositionCache].attr8_Text_Str = "<>";
								__debugInfo = "152:\src\CompilerPasses\Lexer.gbas";
							};
							__debugInfo = "160:\src\CompilerPasses\Lexer.gbas";
							if ((((global8_Compiler.attr6_Tokens.arrAccess(~~(((local1_i_2108) + (1)))).values[tmpPositionCache].attr8_Text_Str) === ("=")) ? 1 : 0)) {
								__debugInfo = "157:\src\CompilerPasses\Lexer.gbas";
								global8_Compiler.attr6_Tokens.arrAccess(~~(((local1_i_2108) + (1)))).values[tmpPositionCache].attr5_IsDel = 1;
								__debugInfo = "159:\src\CompilerPasses\Lexer.gbas";
								global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2108)).values[tmpPositionCache].attr8_Text_Str = "<=";
								__debugInfo = "157:\src\CompilerPasses\Lexer.gbas";
							};
							__debugInfo = "155:\src\CompilerPasses\Lexer.gbas";
						} else if ((((local17___SelectHelper19__2110) === (">")) ? 1 : 0)) {
							__debugInfo = "166:\src\CompilerPasses\Lexer.gbas";
							if ((((global8_Compiler.attr6_Tokens.arrAccess(~~(((local1_i_2108) + (1)))).values[tmpPositionCache].attr8_Text_Str) === ("=")) ? 1 : 0)) {
								__debugInfo = "163:\src\CompilerPasses\Lexer.gbas";
								global8_Compiler.attr6_Tokens.arrAccess(~~(((local1_i_2108) + (1)))).values[tmpPositionCache].attr5_IsDel = 1;
								__debugInfo = "165:\src\CompilerPasses\Lexer.gbas";
								global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2108)).values[tmpPositionCache].attr8_Text_Str = ">=";
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
		local1_i_2111 = 0;
		__debugInfo = "210:\src\CompilerPasses\Lexer.gbas";
		return 0;
		__debugInfo = "8:\src\CompilerPasses\Lexer.gbas";pool_array.free(local12_Splitter_Str_2083);pool_HashMap.free(local11_SplitterMap_2084);
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
		var local8_Name_Str_2113 = "", local12_datatype_Str_2114 = "", local7_IsArray_2115 = 0, local12_RightTok_Str_2116 = "", local11_LeftTok_Str_2117 = "", local6_DefVal_2118 = 0, local4_dims_2119 = pool_array.alloc(0), local4_vari_2122 = pool_TIdentifierVari.alloc();
		__debugInfo = "9:\src\CompilerPasses\Parser.gbas";
		local8_Name_Str_2113 = func14_GetCurrent_Str();
		__debugInfo = "10:\src\CompilerPasses\Parser.gbas";
		func14_IsValidVarName();
		__debugInfo = "11:\src\CompilerPasses\Parser.gbas";
		func5_Match(local8_Name_Str_2113, 10, "src\CompilerPasses\Parser.gbas");
		__debugInfo = "12:\src\CompilerPasses\Parser.gbas";
		local12_datatype_Str_2114 = "float";
		__debugInfo = "13:\src\CompilerPasses\Parser.gbas";
		local7_IsArray_2115 = 0;
		__debugInfo = "14:\src\CompilerPasses\Parser.gbas";
		local12_RightTok_Str_2116 = RIGHT_Str(local8_Name_Str_2113, 1);
		__debugInfo = "15:\src\CompilerPasses\Parser.gbas";
		local11_LeftTok_Str_2117 = LEFT_Str(local8_Name_Str_2113, (((local8_Name_Str_2113).length) - (1)));
		__debugInfo = "16:\src\CompilerPasses\Parser.gbas";
		local6_DefVal_2118 = -(1);
		__debugInfo = "19:\src\CompilerPasses\Parser.gbas";
		{
			var local17___SelectHelper20__2120 = "";
			__debugInfo = "19:\src\CompilerPasses\Parser.gbas";
			local17___SelectHelper20__2120 = local12_RightTok_Str_2116;
			__debugInfo = "29:\src\CompilerPasses\Parser.gbas";
			if ((((local17___SelectHelper20__2120) === ("%")) ? 1 : 0)) {
				__debugInfo = "21:\src\CompilerPasses\Parser.gbas";
				local12_datatype_Str_2114 = "int";
				__debugInfo = "22:\src\CompilerPasses\Parser.gbas";
				local8_Name_Str_2113 = local11_LeftTok_Str_2117;
				__debugInfo = "21:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper20__2120) === ("#")) ? 1 : 0)) {
				__debugInfo = "24:\src\CompilerPasses\Parser.gbas";
				local12_datatype_Str_2114 = "float";
				__debugInfo = "25:\src\CompilerPasses\Parser.gbas";
				local8_Name_Str_2113 = local11_LeftTok_Str_2117;
				__debugInfo = "24:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper20__2120) === ("$")) ? 1 : 0)) {
				__debugInfo = "27:\src\CompilerPasses\Parser.gbas";
				local12_datatype_Str_2114 = "string";
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
				var local1_E_2121 = 0;
				__debugInfo = "37:\src\CompilerPasses\Parser.gbas";
				local1_E_2121 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 36, 0);
				__debugInfo = "38:\src\CompilerPasses\Parser.gbas";
				func5_Match("]", 37, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "39:\src\CompilerPasses\Parser.gbas";
				DIMPUSH(local4_dims_2119, local1_E_2121);
				__debugInfo = "45:\src\CompilerPasses\Parser.gbas";
				while (func7_IsToken("[")) {
					__debugInfo = "41:\src\CompilerPasses\Parser.gbas";
					func5_Match("[", 40, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "42:\src\CompilerPasses\Parser.gbas";
					local1_E_2121 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 41, 0);
					__debugInfo = "43:\src\CompilerPasses\Parser.gbas";
					DIMPUSH(local4_dims_2119, local1_E_2121);
					__debugInfo = "44:\src\CompilerPasses\Parser.gbas";
					func5_Match("]", 43, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "41:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "37:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "47:\src\CompilerPasses\Parser.gbas";
			local7_IsArray_2115 = 1;
			__debugInfo = "33:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "69:\src\CompilerPasses\Parser.gbas";
		if (func7_IsToken("AS")) {
			__debugInfo = "68:\src\CompilerPasses\Parser.gbas";
			if ((((local12_datatype_Str_2114) === ("float")) ? 1 : 0)) {
				__debugInfo = "52:\src\CompilerPasses\Parser.gbas";
				func5_Match("AS", 51, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "64:\src\CompilerPasses\Parser.gbas";
				if (((((((((((((((((((func7_IsToken("int")) || (func7_IsToken("short"))) ? 1 : 0)) || (func7_IsToken("byte"))) ? 1 : 0)) || (func7_IsToken("bool"))) ? 1 : 0)) || (func7_IsToken("boolean"))) ? 1 : 0)) || (func7_IsToken("long"))) ? 1 : 0)) || (func7_IsToken("single"))) ? 1 : 0)) {
					__debugInfo = "54:\src\CompilerPasses\Parser.gbas";
					local12_datatype_Str_2114 = "int";
					__debugInfo = "54:\src\CompilerPasses\Parser.gbas";
				} else if ((((func7_IsToken("float")) || (func7_IsToken("double"))) ? 1 : 0)) {
					__debugInfo = "56:\src\CompilerPasses\Parser.gbas";
					local12_datatype_Str_2114 = "float";
					__debugInfo = "56:\src\CompilerPasses\Parser.gbas";
				} else if (func7_IsToken("void")) {
					__debugInfo = "58:\src\CompilerPasses\Parser.gbas";
					local12_datatype_Str_2114 = "void";
					__debugInfo = "58:\src\CompilerPasses\Parser.gbas";
				} else if (func7_IsToken("string")) {
					__debugInfo = "60:\src\CompilerPasses\Parser.gbas";
					local12_datatype_Str_2114 = "string";
					__debugInfo = "60:\src\CompilerPasses\Parser.gbas";
				} else {
					__debugInfo = "62:\src\CompilerPasses\Parser.gbas";
					func15_IsValidDatatype();
					__debugInfo = "63:\src\CompilerPasses\Parser.gbas";
					local12_datatype_Str_2114 = func14_GetCurrent_Str();
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
		local4_vari_2122.attr8_Name_Str = local8_Name_Str_2113;
		__debugInfo = "73:\src\CompilerPasses\Parser.gbas";
		local4_vari_2122.attr8_datatype.attr8_Name_Str = local12_datatype_Str_2114;
		__debugInfo = "74:\src\CompilerPasses\Parser.gbas";
		local4_vari_2122.attr8_datatype.attr7_IsArray = local7_IsArray_2115;
		__debugInfo = "78:\src\CompilerPasses\Parser.gbas";
		if ((((BOUNDS(local4_dims_2119, 0)) > (0)) ? 1 : 0)) {
			__debugInfo = "77:\src\CompilerPasses\Parser.gbas";
			local6_DefVal_2118 = func25_CreateDimAsExprExpression(local4_vari_2122.attr8_datatype, unref(local4_dims_2119));
			__debugInfo = "77:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "83:\src\CompilerPasses\Parser.gbas";
		if ((((func7_IsToken("=")) && (((param9_NoDefault) ? 0 : 1))) ? 1 : 0)) {
			__debugInfo = "81:\src\CompilerPasses\Parser.gbas";
			func5_Match("=", 80, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "82:\src\CompilerPasses\Parser.gbas";
			local6_DefVal_2118 = func14_EnsureDatatype(func10_Expression(0), local4_vari_2122.attr8_datatype, 81, 0);
			__debugInfo = "81:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "85:\src\CompilerPasses\Parser.gbas";
		local4_vari_2122.attr6_PreDef = local6_DefVal_2118;
		__debugInfo = "86:\src\CompilerPasses\Parser.gbas";
		return tryClone(local4_vari_2122);
		__debugInfo = "87:\src\CompilerPasses\Parser.gbas";
		return tryClone(unref(pool_TIdentifierVari.alloc()));
		__debugInfo = "9:\src\CompilerPasses\Parser.gbas";pool_array.free(local4_dims_2119);pool_TIdentifierVari.free(local4_vari_2122);
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
		var local8_Name_Str_2127 = "";
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
		local8_Name_Str_2127 = func14_GetCurrent_Str();
		__debugInfo = "157:\src\CompilerPasses\Parser.gbas";
		var forEachSaver13033 = global8_Compiler.attr5_Funcs_ref[0];
		for(var forEachCounter13033 = 0 ; forEachCounter13033 < forEachSaver13033.values.length ; forEachCounter13033++) {
			var local4_func_ref_2128 = forEachSaver13033.values[forEachCounter13033];
		{
				__debugInfo = "156:\src\CompilerPasses\Parser.gbas";
				if (((((((((((((func7_IsToken(func16_AddDataChars_Str(local4_func_ref_2128[0].attr8_Name_Str, unref(local4_func_ref_2128[0])))) || (func7_IsToken(local4_func_ref_2128[0].attr8_Name_Str))) ? 1 : 0)) && ((((local4_func_ref_2128[0].attr10_IsCallback) === (param10_IsCallBack)) ? 1 : 0))) ? 1 : 0)) && ((((local4_func_ref_2128[0].attr3_Typ) === (param3_Typ)) ? 1 : 0))) ? 1 : 0)) && ((((local4_func_ref_2128[0].attr6_MyType) === (param6_CurTyp)) ? 1 : 0))) ? 1 : 0)) {
					var local7_tmpVari_2129 = pool_TIdentifierVari.alloc(), local10_MustDefVal_2130 = 0;
					__debugInfo = "100:\src\CompilerPasses\Parser.gbas";
					local7_tmpVari_2129 = func7_VariDef(0).clone(/* In Assign */);
					__debugInfo = "105:\src\CompilerPasses\Parser.gbas";
					func5_Match(":", 104, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "106:\src\CompilerPasses\Parser.gbas";
					local10_MustDefVal_2130 = 0;
					__debugInfo = "128:\src\CompilerPasses\Parser.gbas";
					while ((((func7_IsToken("\n")) === (0)) ? 1 : 0)) {
						var local3_ref_2131 = 0, local4_vari_ref_2132 = [pool_TIdentifierVari.alloc()];
						__debugInfo = "108:\src\CompilerPasses\Parser.gbas";
						local3_ref_2131 = 0;
						__debugInfo = "114:\src\CompilerPasses\Parser.gbas";
						if (func7_IsToken("BYREF")) {
							__debugInfo = "111:\src\CompilerPasses\Parser.gbas";
							local3_ref_2131 = 1;
							__debugInfo = "112:\src\CompilerPasses\Parser.gbas";
							func5_Match("BYREF", 111, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "113:\src\CompilerPasses\Parser.gbas";
							local4_func_ref_2128[0].attr6_HasRef = 1;
							__debugInfo = "111:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "116:\src\CompilerPasses\Parser.gbas";
						local4_vari_ref_2132[0] = func7_VariDef(0).clone(/* In Assign */);
						__debugInfo = "121:\src\CompilerPasses\Parser.gbas";
						if (local10_MustDefVal_2130) {
							__debugInfo = "118:\src\CompilerPasses\Parser.gbas";
							if ((((local4_vari_ref_2132[0].attr6_PreDef) === (-(1))) ? 1 : 0)) {
								__debugInfo = "118:\src\CompilerPasses\Parser.gbas";
								func5_Error((((("Parameter '") + (local4_vari_ref_2132[0].attr8_Name_Str))) + ("' has to have default value.")), 117, "src\CompilerPasses\Parser.gbas");
								__debugInfo = "118:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "118:\src\CompilerPasses\Parser.gbas";
						} else {
							__debugInfo = "120:\src\CompilerPasses\Parser.gbas";
							if ((((local4_vari_ref_2132[0].attr6_PreDef) !== (-(1))) ? 1 : 0)) {
								__debugInfo = "120:\src\CompilerPasses\Parser.gbas";
								local10_MustDefVal_2130 = 1;
								__debugInfo = "120:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "120:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "122:\src\CompilerPasses\Parser.gbas";
						local4_vari_ref_2132[0].attr3_Typ = ~~(5);
						__debugInfo = "123:\src\CompilerPasses\Parser.gbas";
						local4_vari_ref_2132[0].attr3_ref = local3_ref_2131;
						__debugInfo = "124:\src\CompilerPasses\Parser.gbas";
						local4_vari_ref_2132[0].attr2_ID = BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0);
						__debugInfo = "125:\src\CompilerPasses\Parser.gbas";
						DIMPUSH(global8_Compiler.attr5_Varis_ref[0], local4_vari_ref_2132);
						__debugInfo = "126:\src\CompilerPasses\Parser.gbas";
						DIMPUSH(local4_func_ref_2128[0].attr6_Params, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
						__debugInfo = "127:\src\CompilerPasses\Parser.gbas";
						if ((((func7_IsToken("\n")) === (0)) ? 1 : 0)) {
							__debugInfo = "127:\src\CompilerPasses\Parser.gbas";
							func5_Match(",", 126, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "127:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "108:\src\CompilerPasses\Parser.gbas";pool_TIdentifierVari.free(local4_vari_ref_2132);
					};
					__debugInfo = "141:\src\CompilerPasses\Parser.gbas";
					if ((((param3_Typ) !== (3)) ? 1 : 0)) {
						__debugInfo = "140:\src\CompilerPasses\Parser.gbas";
						(global8_Compiler.attr11_GlobalFuncs).Put(local4_func_ref_2128[0].attr8_Name_Str, local4_func_ref_2128[0].attr2_ID);
						__debugInfo = "140:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "154:\src\CompilerPasses\Parser.gbas";
					if ((((param3_Typ) !== (4)) ? 1 : 0)) {
						__debugInfo = "153:\src\CompilerPasses\Parser.gbas";
						if (((((((param6_Native) === (0)) ? 1 : 0)) && ((((local4_func_ref_2128[0].attr10_IsAbstract) === (0)) ? 1 : 0))) ? 1 : 0)) {
							__debugInfo = "145:\src\CompilerPasses\Parser.gbas";
							local4_func_ref_2128[0].attr6_Native = 0;
							__debugInfo = "146:\src\CompilerPasses\Parser.gbas";
							func5_Match("\n", 145, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "147:\src\CompilerPasses\Parser.gbas";
							local4_func_ref_2128[0].attr3_Tok = global8_Compiler.attr11_currentPosi;
							__debugInfo = "148:\src\CompilerPasses\Parser.gbas";
							func10_SkipTokens("FUNCTION", "ENDFUNCTION", local4_func_ref_2128[0].attr8_Name_Str);
							__debugInfo = "145:\src\CompilerPasses\Parser.gbas";
						} else {
							__debugInfo = "152:\src\CompilerPasses\Parser.gbas";
							if (((local4_func_ref_2128[0].attr10_IsAbstract) ? 0 : 1)) {
								__debugInfo = "151:\src\CompilerPasses\Parser.gbas";
								local4_func_ref_2128[0].attr6_Native = 1;
								__debugInfo = "151:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "152:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "153:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "155:\src\CompilerPasses\Parser.gbas";
					return 0;
					__debugInfo = "100:\src\CompilerPasses\Parser.gbas";pool_TIdentifierVari.free(local7_tmpVari_2129);
				};
				__debugInfo = "156:\src\CompilerPasses\Parser.gbas";
			}
			forEachSaver13033.values[forEachCounter13033] = local4_func_ref_2128;
		
		};
		__debugInfo = "162:\src\CompilerPasses\Parser.gbas";
		if (param10_IsCallBack) {
			__debugInfo = "159:\src\CompilerPasses\Parser.gbas";
			func10_SkipTokens("FUNCTION", "ENDFUNCTION", local8_Name_Str_2127);
			__debugInfo = "159:\src\CompilerPasses\Parser.gbas";
		} else {
			__debugInfo = "161:\src\CompilerPasses\Parser.gbas";
			func5_Error((((("Internal error (func definition for unknown type: ") + (local8_Name_Str_2127))) + (")")), 160, "src\CompilerPasses\Parser.gbas");
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
		var forEachSaver13132 = global8_Compiler.attr5_Funcs_ref[0];
		for(var forEachCounter13132 = 0 ; forEachCounter13132 < forEachSaver13132.values.length ; forEachCounter13132++) {
			var local4_func_ref_2133 = forEachSaver13132.values[forEachCounter13132];
		{
				__debugInfo = "182:\src\CompilerPasses\Parser.gbas";
				if ((((func7_IsToken(local4_func_ref_2133[0].attr8_Name_Str)) && ((((local4_func_ref_2133[0].attr3_Typ) === (2)) ? 1 : 0))) ? 1 : 0)) {
					__debugInfo = "170:\src\CompilerPasses\Parser.gbas";
					local4_func_ref_2133[0].attr8_Name_Str = func14_GetCurrent_Str();
					__debugInfo = "171:\src\CompilerPasses\Parser.gbas";
					local4_func_ref_2133[0].attr8_datatype = global12_voidDatatype.clone(/* In Assign */);
					__debugInfo = "172:\src\CompilerPasses\Parser.gbas";
					local4_func_ref_2133[0].attr3_Typ = ~~(2);
					__debugInfo = "174:\src\CompilerPasses\Parser.gbas";
					(global8_Compiler.attr11_GlobalFuncs).Put(local4_func_ref_2133[0].attr8_Name_Str, local4_func_ref_2133[0].attr2_ID);
					__debugInfo = "176:\src\CompilerPasses\Parser.gbas";
					func5_Match(local4_func_ref_2133[0].attr8_Name_Str, 175, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "177:\src\CompilerPasses\Parser.gbas";
					func5_Match(":", 176, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "178:\src\CompilerPasses\Parser.gbas";
					func5_Match("\n", 177, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "179:\src\CompilerPasses\Parser.gbas";
					local4_func_ref_2133[0].attr3_Tok = global8_Compiler.attr11_currentPosi;
					__debugInfo = "180:\src\CompilerPasses\Parser.gbas";
					func10_SkipTokens("SUB", "ENDSUB", local4_func_ref_2133[0].attr8_Name_Str);
					__debugInfo = "181:\src\CompilerPasses\Parser.gbas";
					return 0;
					__debugInfo = "170:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "182:\src\CompilerPasses\Parser.gbas";
			}
			forEachSaver13132.values[forEachCounter13132] = local4_func_ref_2133;
		
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
		var forEachSaver13387 = global8_Compiler.attr5_Types_ref[0];
		for(var forEachCounter13387 = 0 ; forEachCounter13387 < forEachSaver13387.values.length ; forEachCounter13387++) {
			var local3_typ_ref_2134 = forEachSaver13387.values[forEachCounter13387];
		{
				__debugInfo = "256:\src\CompilerPasses\Parser.gbas";
				if (func7_IsToken(local3_typ_ref_2134[0].attr8_Name_Str)) {
					var local11_ExtName_Str_2135 = "";
					__debugInfo = "192:\src\CompilerPasses\Parser.gbas";
					local3_typ_ref_2134[0].attr8_Name_Str = func14_GetCurrent_Str();
					__debugInfo = "193:\src\CompilerPasses\Parser.gbas";
					func5_Match(local3_typ_ref_2134[0].attr8_Name_Str, 192, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "203:\src\CompilerPasses\Parser.gbas";
					if (func7_IsToken("EXTENDS")) {
						__debugInfo = "198:\src\CompilerPasses\Parser.gbas";
						func5_Match("EXTENDS", 197, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "199:\src\CompilerPasses\Parser.gbas";
						local11_ExtName_Str_2135 = func14_GetCurrent_Str();
						__debugInfo = "200:\src\CompilerPasses\Parser.gbas";
						func7_GetNext();
						__debugInfo = "198:\src\CompilerPasses\Parser.gbas";
					} else if ((((local3_typ_ref_2134[0].attr8_Name_Str) !== ("TObject")) ? 1 : 0)) {
						__debugInfo = "202:\src\CompilerPasses\Parser.gbas";
						local11_ExtName_Str_2135 = "TObject";
						__debugInfo = "202:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "212:\src\CompilerPasses\Parser.gbas";
					if ((((local11_ExtName_Str_2135) !== ("")) ? 1 : 0)) {
						__debugInfo = "205:\src\CompilerPasses\Parser.gbas";
						if ((((local11_ExtName_Str_2135) === (local3_typ_ref_2134[0].attr8_Name_Str)) ? 1 : 0)) {
							__debugInfo = "205:\src\CompilerPasses\Parser.gbas";
							func5_Error("Type cannot extend itself!", 204, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "205:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "211:\src\CompilerPasses\Parser.gbas";
						var forEachSaver13232 = global8_Compiler.attr5_Types_ref[0];
						for(var forEachCounter13232 = 0 ; forEachCounter13232 < forEachSaver13232.values.length ; forEachCounter13232++) {
							var local1_T_ref_2136 = forEachSaver13232.values[forEachCounter13232];
						{
								__debugInfo = "210:\src\CompilerPasses\Parser.gbas";
								if ((((local1_T_ref_2136[0].attr8_Name_Str) === (local11_ExtName_Str_2135)) ? 1 : 0)) {
									__debugInfo = "208:\src\CompilerPasses\Parser.gbas";
									local3_typ_ref_2134[0].attr9_Extending = local1_T_ref_2136[0].attr2_ID;
									__debugInfo = "209:\src\CompilerPasses\Parser.gbas";
									break;
									__debugInfo = "208:\src\CompilerPasses\Parser.gbas";
								};
								__debugInfo = "210:\src\CompilerPasses\Parser.gbas";
							}
							forEachSaver13232.values[forEachCounter13232] = local1_T_ref_2136;
						
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
					var forEachSaver13298 = local3_typ_ref_2134[0].attr7_Methods;
					for(var forEachCounter13298 = 0 ; forEachCounter13298 < forEachSaver13298.values.length ; forEachCounter13298++) {
						var local2_M1_2137 = forEachSaver13298.values[forEachCounter13298];
					{
							__debugInfo = "219:\src\CompilerPasses\Parser.gbas";
							var forEachSaver13297 = local3_typ_ref_2134[0].attr7_Methods;
							for(var forEachCounter13297 = 0 ; forEachCounter13297 < forEachSaver13297.values.length ; forEachCounter13297++) {
								var local2_M2_2138 = forEachSaver13297.values[forEachCounter13297];
							{
									__debugInfo = "218:\src\CompilerPasses\Parser.gbas";
									if (((((((local2_M1_2137) !== (local2_M2_2138)) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local2_M2_2138).values[tmpPositionCache][0].attr8_Name_Str) === (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local2_M1_2137).values[tmpPositionCache][0].attr8_Name_Str)) ? 1 : 0))) ? 1 : 0)) {
										__debugInfo = "218:\src\CompilerPasses\Parser.gbas";
										func5_Error((((("Method '") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local2_M1_2137).values[tmpPositionCache][0].attr8_Name_Str))) + ("' already exists")), 217, "src\CompilerPasses\Parser.gbas");
										__debugInfo = "218:\src\CompilerPasses\Parser.gbas";
									};
									__debugInfo = "218:\src\CompilerPasses\Parser.gbas";
								}
								forEachSaver13297.values[forEachCounter13297] = local2_M2_2138;
							
							};
							__debugInfo = "219:\src\CompilerPasses\Parser.gbas";
						}
						forEachSaver13298.values[forEachCounter13298] = local2_M1_2137;
					
					};
					__debugInfo = "253:\src\CompilerPasses\Parser.gbas";
					while ((((func7_IsToken("ENDTYPE")) === (0)) ? 1 : 0)) {
						var local10_IsAbstract_2139 = 0;
						__debugInfo = "222:\src\CompilerPasses\Parser.gbas";
						local10_IsAbstract_2139 = 0;
						__debugInfo = "226:\src\CompilerPasses\Parser.gbas";
						if (func7_IsToken("ABSTRACT")) {
							__debugInfo = "224:\src\CompilerPasses\Parser.gbas";
							func5_Match("ABSTRACT", 223, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "225:\src\CompilerPasses\Parser.gbas";
							local10_IsAbstract_2139 = 1;
							__debugInfo = "224:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "247:\src\CompilerPasses\Parser.gbas";
						if (func7_IsToken("FUNCTION")) {
							__debugInfo = "233:\src\CompilerPasses\Parser.gbas";
							if (local10_IsAbstract_2139) {
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
							var local4_Vari_2140 = pool_TIdentifierVari.alloc();
							__debugInfo = "236:\src\CompilerPasses\Parser.gbas";
							local4_Vari_2140 = func7_VariDef(0).clone(/* In Assign */);
							__debugInfo = "243:\src\CompilerPasses\Parser.gbas";
							local4_Vari_2140.attr3_Typ = ~~(3);
							__debugInfo = "244:\src\CompilerPasses\Parser.gbas";
							func11_AddVariable(local4_Vari_2140, 1);
							__debugInfo = "245:\src\CompilerPasses\Parser.gbas";
							DIMPUSH(local3_typ_ref_2134[0].attr10_Attributes, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
							__debugInfo = "236:\src\CompilerPasses\Parser.gbas";pool_TIdentifierVari.free(local4_Vari_2140);
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
			forEachSaver13387.values[forEachCounter13387] = local3_typ_ref_2134;
		
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
			var local6_TmpScp_2738 = 0.0, local3_Tok_2739 = 0, local7_Curfunc_2740 = 0.0, local3_Scp_2742 = 0;
			__debugInfo = "266:\src\CompilerPasses\Parser.gbas";
			if (param4_func.attr10_IsAbstract) {
				
			};
			__debugInfo = "267:\src\CompilerPasses\Parser.gbas";
			local6_TmpScp_2738 = global8_Compiler.attr12_CurrentScope;
			__debugInfo = "268:\src\CompilerPasses\Parser.gbas";
			global8_Compiler.attr12_CurrentScope = global8_Compiler.attr9_MainScope;
			__debugInfo = "269:\src\CompilerPasses\Parser.gbas";
			local3_Tok_2739 = global8_Compiler.attr11_currentPosi;
			__debugInfo = "270:\src\CompilerPasses\Parser.gbas";
			local7_Curfunc_2740 = global8_Compiler.attr11_currentFunc;
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
				var local4_Vari_2741 = pool_TIdentifierVari.alloc();
				__debugInfo = "278:\src\CompilerPasses\Parser.gbas";
				local4_Vari_2741.attr8_Name_Str = "self";
				__debugInfo = "279:\src\CompilerPasses\Parser.gbas";
				local4_Vari_2741.attr8_datatype.attr8_Name_Str = global8_Compiler.attr5_Types_ref[0].arrAccess(param4_func.attr6_MyType).values[tmpPositionCache][0].attr8_Name_Str;
				__debugInfo = "280:\src\CompilerPasses\Parser.gbas";
				local4_Vari_2741.attr8_datatype.attr7_IsArray = 0;
				__debugInfo = "281:\src\CompilerPasses\Parser.gbas";
				local4_Vari_2741.attr3_Typ = ~~(5);
				__debugInfo = "283:\src\CompilerPasses\Parser.gbas";
				func11_AddVariable(local4_Vari_2741, 1);
				__debugInfo = "284:\src\CompilerPasses\Parser.gbas";
				DIMPUSH(param4_func.attr6_Params, local4_Vari_2741.attr2_ID);
				__debugInfo = "285:\src\CompilerPasses\Parser.gbas";
				param4_func.attr7_SelfVar = local4_Vari_2741.attr2_ID;
				__debugInfo = "278:\src\CompilerPasses\Parser.gbas";pool_TIdentifierVari.free(local4_Vari_2741);
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
							local3_Scp_2742 = func5_Scope("ENDSUB", param4_func.attr2_ID);
							__debugInfo = "299:\src\CompilerPasses\Parser.gbas";
						} else {
							var local1_e_2743 = 0;
							__debugInfo = "301:\src\CompilerPasses\Parser.gbas";
							local3_Scp_2742 = func5_Scope("ENDFUNCTION", param4_func.attr2_ID);
							__debugInfo = "302:\src\CompilerPasses\Parser.gbas";
							local1_e_2743 = func22_CreateReturnExpression(func28_CreateDefaultValueExpression(param4_func.attr8_datatype));
							__debugInfo = "303:\src\CompilerPasses\Parser.gbas";
							DIMPUSH(global5_Exprs_ref[0].arrAccess(local3_Scp_2742).values[tmpPositionCache][0].attr5_Exprs, local1_e_2743);
							__debugInfo = "301:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "304:\src\CompilerPasses\Parser.gbas";
					} else {
						__debugInfo = "306:\src\CompilerPasses\Parser.gbas";
						local3_Scp_2742 = func21_CreateScopeExpression(~~(2));
						__debugInfo = "307:\src\CompilerPasses\Parser.gbas";
						DIMPUSH(global5_Exprs_ref[0].arrAccess(local3_Scp_2742).values[tmpPositionCache][0].attr5_Exprs, func21_CreateEmptyExpression());
						__debugInfo = "306:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "308:\src\CompilerPasses\Parser.gbas";
				} catch (Err_Str) {
					if (Err_Str instanceof OTTException) Err_Str = Err_Str.getText(); else throwError(Err_Str);{
						__debugInfo = "310:\src\CompilerPasses\Parser.gbas";
						local3_Scp_2742 = func21_CreateEmptyExpression();
						__debugInfo = "310:\src\CompilerPasses\Parser.gbas";
					}
				};
				__debugInfo = "311:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "316:\src\CompilerPasses\Parser.gbas";
			param4_func.attr3_Scp = local3_Scp_2742;
			__debugInfo = "318:\src\CompilerPasses\Parser.gbas";
			global8_Compiler.attr11_currentPosi = ((local3_Tok_2739) - (1));
			__debugInfo = "319:\src\CompilerPasses\Parser.gbas";
			func7_GetNext();
			__debugInfo = "320:\src\CompilerPasses\Parser.gbas";
			global8_Compiler.attr11_currentFunc = ~~(local7_Curfunc_2740);
			__debugInfo = "321:\src\CompilerPasses\Parser.gbas";
			global8_Compiler.attr12_CurrentScope = ~~(local6_TmpScp_2738);
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
			var local4_Left_2142 = 0, local5_Right_2143 = 0, local5_Found_2144 = 0;
			__debugInfo = "330:\src\CompilerPasses\Parser.gbas";
			local4_Left_2142 = func10_Expression(((param4_Prio) + (1)));
			__debugInfo = "331:\src\CompilerPasses\Parser.gbas";
			local5_Right_2143 = -(1);
			__debugInfo = "333:\src\CompilerPasses\Parser.gbas";
			local5_Found_2144 = 0;
			__debugInfo = "355:\src\CompilerPasses\Parser.gbas";
			do {
				__debugInfo = "335:\src\CompilerPasses\Parser.gbas";
				local5_Found_2144 = 0;
				__debugInfo = "354:\src\CompilerPasses\Parser.gbas";
				var forEachSaver13490 = global9_Operators_ref[0];
				for(var forEachCounter13490 = 0 ; forEachCounter13490 < forEachSaver13490.values.length ; forEachCounter13490++) {
					var local2_Op_ref_2145 = forEachSaver13490.values[forEachCounter13490];
				{
						__debugInfo = "353:\src\CompilerPasses\Parser.gbas";
						while (((((((local2_Op_ref_2145[0].attr4_Prio) === (param4_Prio)) ? 1 : 0)) && (func7_IsToken(local2_Op_ref_2145[0].attr7_Sym_Str))) ? 1 : 0)) {
							__debugInfo = "338:\src\CompilerPasses\Parser.gbas";
							func5_Match(local2_Op_ref_2145[0].attr7_Sym_Str, 337, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "339:\src\CompilerPasses\Parser.gbas";
							local5_Right_2143 = func10_Expression(((param4_Prio) + (1)));
							__debugInfo = "340:\src\CompilerPasses\Parser.gbas";
							local4_Left_2142 = func24_CreateOperatorExpression(unref(local2_Op_ref_2145[0]), local4_Left_2142, local5_Right_2143);
							__debugInfo = "348:\src\CompilerPasses\Parser.gbas";
							{
								var Error_Str = "";
								__debugInfo = "350:\src\CompilerPasses\Parser.gbas";
								try {
									var local6_Result_2146 = 0.0;
									__debugInfo = "342:\src\CompilerPasses\Parser.gbas";
									local6_Result_2146 = func13_CalculateTree(unref(global5_Exprs_ref[0].arrAccess(local4_Left_2142).values[tmpPositionCache][0]));
									__debugInfo = "347:\src\CompilerPasses\Parser.gbas";
									if ((((INTEGER(local6_Result_2146)) === (local6_Result_2146)) ? 1 : 0)) {
										__debugInfo = "344:\src\CompilerPasses\Parser.gbas";
										local4_Left_2142 = func19_CreateIntExpression(~~(local6_Result_2146));
										__debugInfo = "344:\src\CompilerPasses\Parser.gbas";
									} else {
										__debugInfo = "346:\src\CompilerPasses\Parser.gbas";
										local5_Right_2143 = func21_CreateFloatExpression(local6_Result_2146);
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
							local5_Found_2144 = 1;
							__debugInfo = "352:\src\CompilerPasses\Parser.gbas";
							break;
							__debugInfo = "338:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "353:\src\CompilerPasses\Parser.gbas";
					}
					forEachSaver13490.values[forEachCounter13490] = local2_Op_ref_2145;
				
				};
				__debugInfo = "335:\src\CompilerPasses\Parser.gbas";
			} while (!((((local5_Found_2144) === (0)) ? 1 : 0)));
			__debugInfo = "357:\src\CompilerPasses\Parser.gbas";
			return tryClone(local4_Left_2142);
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
		var local5_Data1_2747 = 0, local5_Data2_2748 = 0;
		__debugInfo = "365:\src\CompilerPasses\Parser.gbas";
		local5_Data1_2747 = param8_RetData1_ref[0];
		__debugInfo = "366:\src\CompilerPasses\Parser.gbas";
		local5_Data2_2748 = param8_RetData2_ref[0];
		__debugInfo = "390:\src\CompilerPasses\Parser.gbas";
		if ((((global5_Exprs_ref[0].arrAccess(local5_Data1_2747).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (global5_Exprs_ref[0].arrAccess(local5_Data2_2748).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray)) ? 1 : 0)) {
			__debugInfo = "387:\src\CompilerPasses\Parser.gbas";
			if ((((global5_Exprs_ref[0].arrAccess(local5_Data1_2747).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === (global5_Exprs_ref[0].arrAccess(local5_Data2_2748).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str)) ? 1 : 0)) {
				__debugInfo = "370:\src\CompilerPasses\Parser.gbas";
				param8_RetData1_ref[0] = local5_Data1_2747;
				__debugInfo = "371:\src\CompilerPasses\Parser.gbas";
				param8_RetData2_ref[0] = local5_Data2_2748;
				__debugInfo = "372:\src\CompilerPasses\Parser.gbas";
				return tryClone(global5_Exprs_ref[0].arrAccess(param8_RetData1_ref[0]).values[tmpPositionCache][0].attr8_datatype);
				__debugInfo = "370:\src\CompilerPasses\Parser.gbas";
			} else {
				__debugInfo = "384:\src\CompilerPasses\Parser.gbas";
				if ((((global5_Exprs_ref[0].arrAccess(local5_Data1_2747).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("string")) ? 1 : 0)) {
					__debugInfo = "375:\src\CompilerPasses\Parser.gbas";
					param8_RetData2_ref[0] = func27_CreateCast2StringExpression(local5_Data2_2748);
					__debugInfo = "375:\src\CompilerPasses\Parser.gbas";
				} else if ((((global5_Exprs_ref[0].arrAccess(local5_Data2_2748).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("string")) ? 1 : 0)) {
					__debugInfo = "377:\src\CompilerPasses\Parser.gbas";
					param8_RetData1_ref[0] = func27_CreateCast2StringExpression(local5_Data1_2747);
					__debugInfo = "377:\src\CompilerPasses\Parser.gbas";
				} else if ((((global5_Exprs_ref[0].arrAccess(local5_Data1_2747).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("float")) ? 1 : 0)) {
					__debugInfo = "379:\src\CompilerPasses\Parser.gbas";
					param8_RetData2_ref[0] = func26_CreateCast2FloatExpression(local5_Data2_2748);
					__debugInfo = "379:\src\CompilerPasses\Parser.gbas";
				} else if ((((global5_Exprs_ref[0].arrAccess(local5_Data2_2748).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("float")) ? 1 : 0)) {
					__debugInfo = "381:\src\CompilerPasses\Parser.gbas";
					param8_RetData1_ref[0] = func26_CreateCast2FloatExpression(local5_Data1_2747);
					__debugInfo = "381:\src\CompilerPasses\Parser.gbas";
				} else {
					__debugInfo = "383:\src\CompilerPasses\Parser.gbas";
					func5_Error((((((((((((("Cannot cast '") + (global5_Exprs_ref[0].arrAccess(local5_Data1_2747).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) + (func20_BuildArrBrackets_Str(global5_Exprs_ref[0].arrAccess(local5_Data1_2747).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray)))) + ("' to '"))) + (global5_Exprs_ref[0].arrAccess(local5_Data2_2748).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) + (func20_BuildArrBrackets_Str(global5_Exprs_ref[0].arrAccess(local5_Data2_2748).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray)))) + ("'")), 382, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "383:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "386:\src\CompilerPasses\Parser.gbas";
				return tryClone(global5_Exprs_ref[0].arrAccess(param8_RetData1_ref[0]).values[tmpPositionCache][0].attr8_datatype);
				__debugInfo = "384:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "387:\src\CompilerPasses\Parser.gbas";
		} else {
			__debugInfo = "389:\src\CompilerPasses\Parser.gbas";
			func5_Error((((((((((("Dimensions are different: ") + (global5_Exprs_ref[0].arrAccess(local5_Data1_2747).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) + (func20_BuildArrBrackets_Str(global5_Exprs_ref[0].arrAccess(local5_Data1_2747).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray)))) + (", "))) + (global5_Exprs_ref[0].arrAccess(local5_Data2_2748).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) + (func20_BuildArrBrackets_Str(global5_Exprs_ref[0].arrAccess(local5_Data2_2748).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray))), 388, "src\CompilerPasses\Parser.gbas");
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
		var local6_myData_2152 = pool_TDatatype.alloc();
		__debugInfo = "399:\src\CompilerPasses\Parser.gbas";
		param6_Strict = 0;
		__debugInfo = "402:\src\CompilerPasses\Parser.gbas";
		if ((((param8_NeedData.attr8_Name_Str) === ("")) ? 1 : 0)) {
			__debugInfo = "402:\src\CompilerPasses\Parser.gbas";
			func5_Error("Internal error (datatype is empty)", 401, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "402:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "404:\src\CompilerPasses\Parser.gbas";
		local6_myData_2152 = global5_Exprs_ref[0].arrAccess(param4_Expr).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
		__debugInfo = "463:\src\CompilerPasses\Parser.gbas";
		if (((((((local6_myData_2152.attr8_Name_Str) === (param8_NeedData.attr8_Name_Str)) ? 1 : 0)) && ((((local6_myData_2152.attr7_IsArray) === (param8_NeedData.attr7_IsArray)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "406:\src\CompilerPasses\Parser.gbas";
			return tryClone(param4_Expr);
			__debugInfo = "406:\src\CompilerPasses\Parser.gbas";
		} else {
			var local5_func1_2154 = 0, local5_func2_2155 = 0, local7_add_Str_2158 = "";
			__debugInfo = "423:\src\CompilerPasses\Parser.gbas";
			if ((((param6_Strict) === (0)) ? 1 : 0)) {
				__debugInfo = "422:\src\CompilerPasses\Parser.gbas";
				if ((((local6_myData_2152.attr7_IsArray) === (param8_NeedData.attr7_IsArray)) ? 1 : 0)) {
					__debugInfo = "421:\src\CompilerPasses\Parser.gbas";
					if ((((((((((local6_myData_2152.attr8_Name_Str) === ("int")) ? 1 : 0)) || ((((local6_myData_2152.attr8_Name_Str) === ("float")) ? 1 : 0))) ? 1 : 0)) || ((((local6_myData_2152.attr8_Name_Str) === ("string")) ? 1 : 0))) ? 1 : 0)) {
						__debugInfo = "420:\src\CompilerPasses\Parser.gbas";
						if ((((((((((param8_NeedData.attr8_Name_Str) === ("int")) ? 1 : 0)) || ((((param8_NeedData.attr8_Name_Str) === ("float")) ? 1 : 0))) ? 1 : 0)) || ((((param8_NeedData.attr8_Name_Str) === ("string")) ? 1 : 0))) ? 1 : 0)) {
							__debugInfo = "412:\src\CompilerPasses\Parser.gbas";
							{
								var local17___SelectHelper21__2153 = "";
								__debugInfo = "412:\src\CompilerPasses\Parser.gbas";
								local17___SelectHelper21__2153 = param8_NeedData.attr8_Name_Str;
								__debugInfo = "419:\src\CompilerPasses\Parser.gbas";
								if ((((local17___SelectHelper21__2153) === ("int")) ? 1 : 0)) {
									__debugInfo = "414:\src\CompilerPasses\Parser.gbas";
									return tryClone(func24_CreateCast2IntExpression(param4_Expr));
									__debugInfo = "414:\src\CompilerPasses\Parser.gbas";
								} else if ((((local17___SelectHelper21__2153) === ("float")) ? 1 : 0)) {
									__debugInfo = "416:\src\CompilerPasses\Parser.gbas";
									return tryClone(func26_CreateCast2FloatExpression(param4_Expr));
									__debugInfo = "416:\src\CompilerPasses\Parser.gbas";
								} else if ((((local17___SelectHelper21__2153) === ("string")) ? 1 : 0)) {
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
			local5_func1_2154 = func14_SearchPrototyp(local6_myData_2152.attr8_Name_Str);
			__debugInfo = "426:\src\CompilerPasses\Parser.gbas";
			local5_func2_2155 = func14_SearchPrototyp(param8_NeedData.attr8_Name_Str);
			__debugInfo = "451:\src\CompilerPasses\Parser.gbas";
			if ((((local5_func1_2154) !== (-(1))) ? 1 : 0)) {
				__debugInfo = "450:\src\CompilerPasses\Parser.gbas";
				if ((((local5_func2_2155) !== (-(1))) ? 1 : 0)) {
					var local7_checker_2156 = pool_TProtoChecker.alloc();
					__debugInfo = "429:\src\CompilerPasses\Parser.gbas";
					if ((((local6_myData_2152.attr7_IsArray) || (param8_NeedData.attr7_IsArray)) ? 1 : 0)) {
						__debugInfo = "429:\src\CompilerPasses\Parser.gbas";
						func5_Error("PROTOTYPE cannot be an array.", 428, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "429:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "432:\src\CompilerPasses\Parser.gbas";
					local7_checker_2156.attr8_fromFunc = global8_Compiler.attr5_Funcs_ref[0].arrAccess(local5_func1_2154).values[tmpPositionCache][0].attr2_ID;
					__debugInfo = "433:\src\CompilerPasses\Parser.gbas";
					local7_checker_2156.attr6_toFunc = global8_Compiler.attr5_Funcs_ref[0].arrAccess(local5_func2_2155).values[tmpPositionCache][0].attr2_ID;
					__debugInfo = "434:\src\CompilerPasses\Parser.gbas";
					local7_checker_2156.attr3_Tok = func15_GetCurrentToken().clone(/* In Assign */);
					__debugInfo = "435:\src\CompilerPasses\Parser.gbas";
					DIMPUSH(global8_Compiler.attr13_protoCheckers, local7_checker_2156);
					__debugInfo = "437:\src\CompilerPasses\Parser.gbas";
					return tryClone(param4_Expr);
					__debugInfo = "429:\src\CompilerPasses\Parser.gbas";pool_TProtoChecker.free(local7_checker_2156);
				} else {
					__debugInfo = "449:\src\CompilerPasses\Parser.gbas";
					if (((((((((((((param8_NeedData.attr8_Name_Str) === ("int")) ? 1 : 0)) || ((((param8_NeedData.attr8_Name_Str) === ("float")) ? 1 : 0))) ? 1 : 0)) || ((((param8_NeedData.attr8_Name_Str) === ("string")) ? 1 : 0))) ? 1 : 0)) && ((((param8_NeedData.attr7_IsArray) === (0)) ? 1 : 0))) ? 1 : 0)) {
						__debugInfo = "441:\src\CompilerPasses\Parser.gbas";
						{
							var local17___SelectHelper22__2157 = "";
							__debugInfo = "441:\src\CompilerPasses\Parser.gbas";
							local17___SelectHelper22__2157 = param8_NeedData.attr8_Name_Str;
							__debugInfo = "448:\src\CompilerPasses\Parser.gbas";
							if ((((local17___SelectHelper22__2157) === ("int")) ? 1 : 0)) {
								__debugInfo = "443:\src\CompilerPasses\Parser.gbas";
								return tryClone(func24_CreateCast2IntExpression(param4_Expr));
								__debugInfo = "443:\src\CompilerPasses\Parser.gbas";
							} else if ((((local17___SelectHelper22__2157) === ("float")) ? 1 : 0)) {
								__debugInfo = "445:\src\CompilerPasses\Parser.gbas";
								return tryClone(func26_CreateCast2FloatExpression(param4_Expr));
								__debugInfo = "445:\src\CompilerPasses\Parser.gbas";
							} else if ((((local17___SelectHelper22__2157) === ("string")) ? 1 : 0)) {
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
			if ((((func6_IsType(local6_myData_2152.attr8_Name_Str)) && (func6_IsType(param8_NeedData.attr8_Name_Str))) ? 1 : 0)) {
				__debugInfo = "455:\src\CompilerPasses\Parser.gbas";
				return tryClone(param4_Expr);
				__debugInfo = "455:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "458:\src\CompilerPasses\Parser.gbas";
			local7_add_Str_2158 = "";
			__debugInfo = "461:\src\CompilerPasses\Parser.gbas";
			if (param6_Strict) {
				__debugInfo = "460:\src\CompilerPasses\Parser.gbas";
				local7_add_Str_2158 = " , and maybe can't cast, because it is BYREF (screw you BYREF >:O)!!";
				__debugInfo = "460:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "462:\src\CompilerPasses\Parser.gbas";
			func5_Error((((((((((((((("Cannot cast datatypes. Needs '") + (param8_NeedData.attr8_Name_Str))) + (func20_BuildArrBrackets_Str(param8_NeedData.attr7_IsArray)))) + ("', got '"))) + (local6_myData_2152.attr8_Name_Str))) + (func20_BuildArrBrackets_Str(local6_myData_2152.attr7_IsArray)))) + ("'"))) + (local7_add_Str_2158)), param4_Line, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "423:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "464:\src\CompilerPasses\Parser.gbas";
		return 0;
		__debugInfo = "399:\src\CompilerPasses\Parser.gbas";pool_TDatatype.free(local6_myData_2152);
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
		var local1_i_2750 = 0, local1_j_2751 = 0, local4_loop_2752 = 0;
		__debugInfo = "481:\src\CompilerPasses\Parser.gbas";
		local1_i_2750 = 0;
		__debugInfo = "482:\src\CompilerPasses\Parser.gbas";
		local1_j_2751 = 0;
		__debugInfo = "482:\src\CompilerPasses\Parser.gbas";
		{
			__debugInfo = "491:\src\CompilerPasses\Parser.gbas";
			for (local4_loop_2752 = 0;toCheck(local4_loop_2752, (((param10_hexStr_Str).length) - (1)), 1);local4_loop_2752 += 1) {
				__debugInfo = "484:\src\CompilerPasses\Parser.gbas";
				local1_i_2750 = ((ASC(MID_Str(param10_hexStr_Str, local4_loop_2752, 1), 0)) - (48));
				__debugInfo = "487:\src\CompilerPasses\Parser.gbas";
				if ((((9) < (local1_i_2750)) ? 1 : 0)) {
					__debugInfo = "486:\src\CompilerPasses\Parser.gbas";
					local1_i_2750+=-(7);
					__debugInfo = "486:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "489:\src\CompilerPasses\Parser.gbas";
				local1_j_2751 = ((local1_j_2751) * (16));
				__debugInfo = "490:\src\CompilerPasses\Parser.gbas";
				local1_j_2751 = bOR(local1_j_2751, bAND(local1_i_2750, 15));
				__debugInfo = "484:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "491:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "493:\src\CompilerPasses\Parser.gbas";
		return tryClone(local1_j_2751);
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
			var local4_Expr_2160 = 0;
			__debugInfo = "499:\src\CompilerPasses\Parser.gbas";
			func5_Match("(", 498, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "500:\src\CompilerPasses\Parser.gbas";
			local4_Expr_2160 = func10_Expression(0);
			__debugInfo = "501:\src\CompilerPasses\Parser.gbas";
			func5_Match(")", 500, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "502:\src\CompilerPasses\Parser.gbas";
			return tryClone(local4_Expr_2160);
			__debugInfo = "499:\src\CompilerPasses\Parser.gbas";
		} else if (func12_IsIdentifier(1, 0)) {
			__debugInfo = "504:\src\CompilerPasses\Parser.gbas";
			return tryClone(func10_Identifier(0));
			__debugInfo = "504:\src\CompilerPasses\Parser.gbas";
		} else if (func8_IsString()) {
			var local7_Str_Str_2161 = "";
			__debugInfo = "506:\src\CompilerPasses\Parser.gbas";
			local7_Str_Str_2161 = func14_GetCurrent_Str();
			__debugInfo = "510:\src\CompilerPasses\Parser.gbas";
			if ((((INSTR(local7_Str_Str_2161, "\n", 0)) !== (-(1))) ? 1 : 0)) {
				__debugInfo = "509:\src\CompilerPasses\Parser.gbas";
				func5_Error("Expecting '\"'", 508, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "509:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "511:\src\CompilerPasses\Parser.gbas";
			func7_GetNext();
			__debugInfo = "512:\src\CompilerPasses\Parser.gbas";
			return tryClone(func19_CreateStrExpression(local7_Str_Str_2161));
			__debugInfo = "506:\src\CompilerPasses\Parser.gbas";
		} else if ((((MID_Str(func14_GetCurrent_Str(), 0, 2)) === ("0x")) ? 1 : 0)) {
			var local7_hex_Str_2162 = "";
			__debugInfo = "514:\src\CompilerPasses\Parser.gbas";
			local7_hex_Str_2162 = MID_Str(func14_GetCurrent_Str(), 2, -(1));
			__debugInfo = "515:\src\CompilerPasses\Parser.gbas";
			func7_GetNext();
			__debugInfo = "516:\src\CompilerPasses\Parser.gbas";
			return tryClone(func19_CreateIntExpression(func7_Hex2Dec(local7_hex_Str_2162)));
			__debugInfo = "514:\src\CompilerPasses\Parser.gbas";
		} else if ((((func8_IsNumber()) || (func7_IsToken("."))) ? 1 : 0)) {
			var local3_Num_2163 = 0, local12_hasToHaveNum_2164 = 0;
			__debugInfo = "519:\src\CompilerPasses\Parser.gbas";
			local12_hasToHaveNum_2164 = 0;
			__debugInfo = "526:\src\CompilerPasses\Parser.gbas";
			if (func7_IsToken(".")) {
				__debugInfo = "521:\src\CompilerPasses\Parser.gbas";
				local3_Num_2163 = 0;
				__debugInfo = "522:\src\CompilerPasses\Parser.gbas";
				local12_hasToHaveNum_2164 = 1;
				__debugInfo = "521:\src\CompilerPasses\Parser.gbas";
			} else {
				__debugInfo = "524:\src\CompilerPasses\Parser.gbas";
				local3_Num_2163 = INT2STR(func14_GetCurrent_Str());
				__debugInfo = "525:\src\CompilerPasses\Parser.gbas";
				func7_GetNext();
				__debugInfo = "524:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "544:\src\CompilerPasses\Parser.gbas";
			if (func7_IsToken(".")) {
				var local4_Num2_2165 = 0, local3_pos_2166 = 0, local4_FNum_2167 = 0.0;
				__debugInfo = "529:\src\CompilerPasses\Parser.gbas";
				func5_Match(".", 528, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "530:\src\CompilerPasses\Parser.gbas";
				local4_Num2_2165 = INT2STR(func14_GetCurrent_Str());
				__debugInfo = "531:\src\CompilerPasses\Parser.gbas";
				local3_pos_2166 = global8_Compiler.attr11_currentPosi;
				__debugInfo = "537:\src\CompilerPasses\Parser.gbas";
				if (func8_IsNumber()) {
					__debugInfo = "534:\src\CompilerPasses\Parser.gbas";
					func7_GetNext();
					__debugInfo = "534:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "538:\src\CompilerPasses\Parser.gbas";
				local4_FNum_2167 = FLOAT2STR(((((((CAST2STRING(local3_Num_2163)) + ("."))) + (CAST2STRING(local4_Num2_2165)))) + (CAST2STRING(0))));
				__debugInfo = "540:\src\CompilerPasses\Parser.gbas";
				return tryClone(func21_CreateFloatExpression(local4_FNum_2167));
				__debugInfo = "529:\src\CompilerPasses\Parser.gbas";
			} else {
				__debugInfo = "542:\src\CompilerPasses\Parser.gbas";
				if (local12_hasToHaveNum_2164) {
					__debugInfo = "542:\src\CompilerPasses\Parser.gbas";
					func5_Error("Expecting number!", 541, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "542:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "543:\src\CompilerPasses\Parser.gbas";
				return tryClone(func19_CreateIntExpression(local3_Num_2163));
				__debugInfo = "542:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "519:\src\CompilerPasses\Parser.gbas";
		} else if (func7_IsToken("-")) {
			var local4_Expr_2168 = 0, alias2_Op_ref_2169 = [pool_TOperator.alloc()], local7_tmpData_2170 = pool_TDatatype.alloc();
			__debugInfo = "546:\src\CompilerPasses\Parser.gbas";
			func5_Match("-", 545, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "547:\src\CompilerPasses\Parser.gbas";
			local4_Expr_2168 = func6_Factor();
			__debugInfo = "548:\src\CompilerPasses\Parser.gbas";
			alias2_Op_ref_2169 = global9_Operators_ref[0].arrAccess(func14_SearchOperator("sub")).values[tmpPositionCache] /* ALIAS */;
			__debugInfo = "550:\src\CompilerPasses\Parser.gbas";
			local7_tmpData_2170 = global5_Exprs_ref[0].arrAccess(local4_Expr_2168).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
			__debugInfo = "551:\src\CompilerPasses\Parser.gbas";
			local7_tmpData_2170.attr7_IsArray = 0;
			__debugInfo = "553:\src\CompilerPasses\Parser.gbas";
			local4_Expr_2168 = func14_EnsureDatatype(local4_Expr_2168, local7_tmpData_2170, 552, 0);
			__debugInfo = "560:\src\CompilerPasses\Parser.gbas";
			if ((((global5_Exprs_ref[0].arrAccess(local4_Expr_2168).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("float")) ? 1 : 0)) {
				__debugInfo = "555:\src\CompilerPasses\Parser.gbas";
				local4_Expr_2168 = func24_CreateOperatorExpression(unref(alias2_Op_ref_2169[0]), func21_CreateFloatExpression(0), func14_EnsureDatatype(local4_Expr_2168, global13_floatDatatype, 554, 0));
				__debugInfo = "555:\src\CompilerPasses\Parser.gbas";
			} else if (((((((global5_Exprs_ref[0].arrAccess(local4_Expr_2168).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("int")) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(local4_Expr_2168).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("string")) ? 1 : 0))) ? 1 : 0)) {
				__debugInfo = "557:\src\CompilerPasses\Parser.gbas";
				local4_Expr_2168 = func24_CreateOperatorExpression(unref(alias2_Op_ref_2169[0]), func19_CreateIntExpression(0), func14_EnsureDatatype(local4_Expr_2168, global11_intDatatype, 556, 0));
				__debugInfo = "557:\src\CompilerPasses\Parser.gbas";
			} else {
				__debugInfo = "559:\src\CompilerPasses\Parser.gbas";
				func5_Error((((("Unexpected datatype, expecting 'float/int' got '") + (global5_Exprs_ref[0].arrAccess(local4_Expr_2168).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) + ("'")), 558, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "559:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "561:\src\CompilerPasses\Parser.gbas";
			return tryClone(local4_Expr_2168);
			__debugInfo = "546:\src\CompilerPasses\Parser.gbas";pool_TOperator.free(alias2_Op_ref_2169);pool_TDatatype.free(local7_tmpData_2170);
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
			var local4_Expr_2171 = 0, local7_Kerning_2172 = 0;
			__debugInfo = "579:\src\CompilerPasses\Parser.gbas";
			func5_Match("LEN", 578, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "580:\src\CompilerPasses\Parser.gbas";
			func5_Match("(", 579, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "582:\src\CompilerPasses\Parser.gbas";
			local4_Expr_2171 = func10_Expression(0);
			__debugInfo = "583:\src\CompilerPasses\Parser.gbas";
			local7_Kerning_2172 = 0;
			__debugInfo = "607:\src\CompilerPasses\Parser.gbas";
			if (func7_IsToken(",")) {
				__debugInfo = "585:\src\CompilerPasses\Parser.gbas";
				func5_Match(",", 584, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "586:\src\CompilerPasses\Parser.gbas";
				local7_Kerning_2172 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 585, 0);
				__debugInfo = "587:\src\CompilerPasses\Parser.gbas";
				func5_Match(")", 586, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "590:\src\CompilerPasses\Parser.gbas";
				local4_Expr_2171 = func14_EnsureDatatype(local4_Expr_2171, global11_strDatatype, 589, 0);
				__debugInfo = "592:\src\CompilerPasses\Parser.gbas";
				return tryClone(func19_CreateLenExpression(local4_Expr_2171, local7_Kerning_2172));
				__debugInfo = "585:\src\CompilerPasses\Parser.gbas";
			} else {
				__debugInfo = "594:\src\CompilerPasses\Parser.gbas";
				func5_Match(")", 593, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "606:\src\CompilerPasses\Parser.gbas";
				if ((((global5_Exprs_ref[0].arrAccess(local4_Expr_2171).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0)) {
					__debugInfo = "603:\src\CompilerPasses\Parser.gbas";
					if ((((((((((global5_Exprs_ref[0].arrAccess(local4_Expr_2171).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("int")) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(local4_Expr_2171).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("float")) ? 1 : 0))) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(local4_Expr_2171).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) === ("string")) ? 1 : 0))) ? 1 : 0)) {
						__debugInfo = "598:\src\CompilerPasses\Parser.gbas";
						local4_Expr_2171 = func14_EnsureDatatype(local4_Expr_2171, global11_strDatatype, 597, 0);
						__debugInfo = "600:\src\CompilerPasses\Parser.gbas";
						return tryClone(func19_CreateLenExpression(local4_Expr_2171, -(1)));
						__debugInfo = "598:\src\CompilerPasses\Parser.gbas";
					} else {
						__debugInfo = "602:\src\CompilerPasses\Parser.gbas";
						func5_Error((((("Cannot get the length of Type '") + (global5_Exprs_ref[0].arrAccess(local4_Expr_2171).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) + ("'")), 601, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "602:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "603:\src\CompilerPasses\Parser.gbas";
				} else {
					__debugInfo = "605:\src\CompilerPasses\Parser.gbas";
					return tryClone(func21_CreateBoundExpression(local4_Expr_2171, func19_CreateIntExpression(0)));
					__debugInfo = "605:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "594:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "579:\src\CompilerPasses\Parser.gbas";
		} else if (func7_IsToken("BOUNDS")) {
			var local4_Expr_2173 = 0, local9_Dimension_2174 = 0;
			__debugInfo = "609:\src\CompilerPasses\Parser.gbas";
			func5_Match("BOUNDS", 608, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "610:\src\CompilerPasses\Parser.gbas";
			func5_Match("(", 609, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "611:\src\CompilerPasses\Parser.gbas";
			local4_Expr_2173 = func10_Expression(0);
			__debugInfo = "612:\src\CompilerPasses\Parser.gbas";
			func5_Match(",", 611, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "613:\src\CompilerPasses\Parser.gbas";
			if ((((global5_Exprs_ref[0].arrAccess(local4_Expr_2173).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0)) {
				__debugInfo = "613:\src\CompilerPasses\Parser.gbas";
				func5_Error("BOUNDS needs array!", 612, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "613:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "614:\src\CompilerPasses\Parser.gbas";
			local9_Dimension_2174 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 613, 0);
			__debugInfo = "615:\src\CompilerPasses\Parser.gbas";
			func5_Match(")", 614, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "617:\src\CompilerPasses\Parser.gbas";
			return tryClone(func21_CreateBoundExpression(local4_Expr_2173, local9_Dimension_2174));
			__debugInfo = "609:\src\CompilerPasses\Parser.gbas";
		} else if (func7_IsToken("ADDRESSOF")) {
			var local8_Name_Str_2175 = "", local6_MyFunc_2176 = 0;
			__debugInfo = "619:\src\CompilerPasses\Parser.gbas";
			func5_Match("ADDRESSOF", 618, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "620:\src\CompilerPasses\Parser.gbas";
			func5_Match("(", 619, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "621:\src\CompilerPasses\Parser.gbas";
			local8_Name_Str_2175 = func14_GetCurrent_Str();
			__debugInfo = "622:\src\CompilerPasses\Parser.gbas";
			local6_MyFunc_2176 = -(1);
			__debugInfo = "628:\src\CompilerPasses\Parser.gbas";
			var forEachSaver14408 = global8_Compiler.attr5_Funcs_ref[0];
			for(var forEachCounter14408 = 0 ; forEachCounter14408 < forEachSaver14408.values.length ; forEachCounter14408++) {
				var local4_Func_ref_2177 = forEachSaver14408.values[forEachCounter14408];
			{
					__debugInfo = "627:\src\CompilerPasses\Parser.gbas";
					if ((((((((((local4_Func_ref_2177[0].attr3_Typ) === (1)) ? 1 : 0)) || ((((local4_Func_ref_2177[0].attr3_Typ) === (2)) ? 1 : 0))) ? 1 : 0)) && ((((local4_Func_ref_2177[0].attr8_Name_Str) === (local8_Name_Str_2175)) ? 1 : 0))) ? 1 : 0)) {
						__debugInfo = "625:\src\CompilerPasses\Parser.gbas";
						local6_MyFunc_2176 = local4_Func_ref_2177[0].attr2_ID;
						__debugInfo = "626:\src\CompilerPasses\Parser.gbas";
						break;
						__debugInfo = "625:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "627:\src\CompilerPasses\Parser.gbas";
				}
				forEachSaver14408.values[forEachCounter14408] = local4_Func_ref_2177;
			
			};
			__debugInfo = "629:\src\CompilerPasses\Parser.gbas";
			if ((((local6_MyFunc_2176) === (-(1))) ? 1 : 0)) {
				__debugInfo = "629:\src\CompilerPasses\Parser.gbas";
				func5_Error((((("Function '") + (local8_Name_Str_2175))) + ("' is unknown!")), 628, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "629:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "630:\src\CompilerPasses\Parser.gbas";
			global8_Compiler.attr5_Funcs_ref[0].arrAccess(local6_MyFunc_2176).values[tmpPositionCache][0].attr10_PlzCompile = 1;
			__debugInfo = "631:\src\CompilerPasses\Parser.gbas";
			func7_GetNext();
			__debugInfo = "632:\src\CompilerPasses\Parser.gbas";
			func5_Match(")", 631, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "634:\src\CompilerPasses\Parser.gbas";
			return tryClone(func25_CreateAddressOfExpression(local6_MyFunc_2176));
			__debugInfo = "619:\src\CompilerPasses\Parser.gbas";
		} else if (func7_IsToken("NOT")) {
			__debugInfo = "636:\src\CompilerPasses\Parser.gbas";
			func5_Match("NOT", 635, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "637:\src\CompilerPasses\Parser.gbas";
			return tryClone(func19_CreateNotExpression(func14_EnsureDatatype(func6_Factor(), global13_floatDatatype, 636, 0)));
			__debugInfo = "636:\src\CompilerPasses\Parser.gbas";
		} else if ((((((((((func7_IsToken("DIM")) || (func7_IsToken("DIM%"))) ? 1 : 0)) || (func7_IsToken("DIM$"))) ? 1 : 0)) || (func7_IsToken("DIM#"))) ? 1 : 0)) {
			var local8_datatype_2179 = pool_TDatatype.alloc(), local4_dims_2180 = pool_array.alloc(0);
			__debugInfo = "643:\src\CompilerPasses\Parser.gbas";
			if (((static12_Factor_DIMASEXPRErr) ? 0 : 1)) {
				__debugInfo = "641:\src\CompilerPasses\Parser.gbas";
				static12_Factor_DIMASEXPRErr = 1;
				__debugInfo = "642:\src\CompilerPasses\Parser.gbas";
				func7_Warning("Experimental feature 'DIMASEXPR'");
				__debugInfo = "641:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "645:\src\CompilerPasses\Parser.gbas";
			local8_datatype_2179.attr7_IsArray = 1;
			__debugInfo = "646:\src\CompilerPasses\Parser.gbas";
			local8_datatype_2179.attr8_Name_Str = "float";
			__debugInfo = "647:\src\CompilerPasses\Parser.gbas";
			if (func7_IsToken("DIM%")) {
				__debugInfo = "647:\src\CompilerPasses\Parser.gbas";
				local8_datatype_2179.attr8_Name_Str = "int";
				__debugInfo = "647:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "648:\src\CompilerPasses\Parser.gbas";
			if (func7_IsToken("DIM$")) {
				__debugInfo = "648:\src\CompilerPasses\Parser.gbas";
				local8_datatype_2179.attr8_Name_Str = "string";
				__debugInfo = "648:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "649:\src\CompilerPasses\Parser.gbas";
			if (func7_IsToken("DIM#")) {
				__debugInfo = "649:\src\CompilerPasses\Parser.gbas";
				local8_datatype_2179.attr8_Name_Str = "float";
				__debugInfo = "649:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "650:\src\CompilerPasses\Parser.gbas";
			func7_GetNext();
			__debugInfo = "658:\src\CompilerPasses\Parser.gbas";
			do {
				var local1_E_2181 = 0;
				__debugInfo = "654:\src\CompilerPasses\Parser.gbas";
				func5_Match("[", 653, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "655:\src\CompilerPasses\Parser.gbas";
				local1_E_2181 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 654, 0);
				__debugInfo = "656:\src\CompilerPasses\Parser.gbas";
				func5_Match("]", 655, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "657:\src\CompilerPasses\Parser.gbas";
				DIMPUSH(local4_dims_2180, local1_E_2181);
				__debugInfo = "654:\src\CompilerPasses\Parser.gbas";
			} while (!((((func7_IsToken("[")) === (0)) ? 1 : 0)));
			__debugInfo = "668:\src\CompilerPasses\Parser.gbas";
			if (func7_IsToken("AS")) {
				__debugInfo = "667:\src\CompilerPasses\Parser.gbas";
				if ((((local8_datatype_2179.attr8_Name_Str) === ("float")) ? 1 : 0)) {
					__debugInfo = "662:\src\CompilerPasses\Parser.gbas";
					func5_Match("AS", 661, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "663:\src\CompilerPasses\Parser.gbas";
					func15_IsValidDatatype();
					__debugInfo = "664:\src\CompilerPasses\Parser.gbas";
					local8_datatype_2179.attr8_Name_Str = func14_GetCurrent_Str();
					__debugInfo = "662:\src\CompilerPasses\Parser.gbas";
				} else {
					__debugInfo = "666:\src\CompilerPasses\Parser.gbas";
					func5_Error("Unexpected AS", 665, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "666:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "667:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "670:\src\CompilerPasses\Parser.gbas";
			return tryClone(func25_CreateDimAsExprExpression(local8_datatype_2179, unref(local4_dims_2180)));
			__debugInfo = "643:\src\CompilerPasses\Parser.gbas";pool_array.free(local4_dims_2180);
		} else if (func7_IsToken("DEFINED")) {
			var local4_Find_2182 = 0;
			__debugInfo = "672:\src\CompilerPasses\Parser.gbas";
			func5_Match("DEFINED", 671, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "673:\src\CompilerPasses\Parser.gbas";
			func5_Match("(", 672, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "674:\src\CompilerPasses\Parser.gbas";
			local4_Find_2182 = 0;
			__debugInfo = "680:\src\CompilerPasses\Parser.gbas";
			var forEachSaver14623 = global7_Defines;
			for(var forEachCounter14623 = 0 ; forEachCounter14623 < forEachSaver14623.values.length ; forEachCounter14623++) {
				var local3_Def_2183 = forEachSaver14623.values[forEachCounter14623];
			{
					__debugInfo = "679:\src\CompilerPasses\Parser.gbas";
					if ((((func7_IsToken(local3_Def_2183.attr7_Key_Str)) && ((((INTEGER(FLOAT2STR(local3_Def_2183.attr9_Value_Str))) !== (0)) ? 1 : 0))) ? 1 : 0)) {
						__debugInfo = "677:\src\CompilerPasses\Parser.gbas";
						local4_Find_2182 = 1;
						__debugInfo = "678:\src\CompilerPasses\Parser.gbas";
						break;
						__debugInfo = "677:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "679:\src\CompilerPasses\Parser.gbas";
				}
				forEachSaver14623.values[forEachCounter14623] = local3_Def_2183;
			
			};
			__debugInfo = "681:\src\CompilerPasses\Parser.gbas";
			func7_GetNext();
			__debugInfo = "682:\src\CompilerPasses\Parser.gbas";
			func5_Match(")", 681, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "684:\src\CompilerPasses\Parser.gbas";
			return tryClone(func19_CreateIntExpression(local4_Find_2182));
			__debugInfo = "672:\src\CompilerPasses\Parser.gbas";
		} else if (func7_IsToken("IIF")) {
			var local4_Cond_2184 = 0, local6_onTrue_2185 = 0, local7_onFalse_2186 = 0;
			__debugInfo = "686:\src\CompilerPasses\Parser.gbas";
			func5_Match("IIF", 685, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "687:\src\CompilerPasses\Parser.gbas";
			func5_Match("(", 686, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "689:\src\CompilerPasses\Parser.gbas";
			local4_Cond_2184 = func14_EnsureDatatype(func10_Expression(0), global13_floatDatatype, 688, 0);
			__debugInfo = "690:\src\CompilerPasses\Parser.gbas";
			func5_Match(",", 689, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "691:\src\CompilerPasses\Parser.gbas";
			local6_onTrue_2185 = func10_Expression(0);
			__debugInfo = "692:\src\CompilerPasses\Parser.gbas";
			func5_Match(",", 691, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "693:\src\CompilerPasses\Parser.gbas";
			local7_onFalse_2186 = func10_Expression(0);
			__debugInfo = "694:\src\CompilerPasses\Parser.gbas";
			func5_Match(")", 693, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "698:\src\CompilerPasses\Parser.gbas";
			if (((((((global5_Exprs_ref[0].arrAccess(local6_onTrue_2185).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str) !== (global5_Exprs_ref[0].arrAccess(local7_onFalse_2186).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str)) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(local6_onTrue_2185).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) !== (global5_Exprs_ref[0].arrAccess(local7_onFalse_2186).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray)) ? 1 : 0))) ? 1 : 0)) {
				__debugInfo = "697:\src\CompilerPasses\Parser.gbas";
				func5_Error("IIF parameters do not match!", 696, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "697:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "700:\src\CompilerPasses\Parser.gbas";
			return tryClone(func19_CreateIIFExpression(local4_Cond_2184, local6_onTrue_2185, local7_onFalse_2186));
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
				var local8_vars_Str_2187 = "", local5_Varis_2188 = pool_array.alloc(0);
				__debugInfo = "717:\src\CompilerPasses\Parser.gbas";
				func14_ImplicitDefine();
				__debugInfo = "719:\src\CompilerPasses\Parser.gbas";
				local8_vars_Str_2187 = "";
				__debugInfo = "721:\src\CompilerPasses\Parser.gbas";
				func8_GetVaris(unref(local5_Varis_2188), -(1), 0);
				__debugInfo = "724:\src\CompilerPasses\Parser.gbas";
				var forEachSaver14804 = local5_Varis_2188;
				for(var forEachCounter14804 = 0 ; forEachCounter14804 < forEachSaver14804.values.length ; forEachCounter14804++) {
					var local4_Vari_2189 = forEachSaver14804.values[forEachCounter14804];
				{
						__debugInfo = "723:\src\CompilerPasses\Parser.gbas";
						local8_vars_Str_2187 = ((((local8_vars_Str_2187) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Vari_2189).values[tmpPositionCache][0].attr8_Name_Str))) + (", "));
						__debugInfo = "723:\src\CompilerPasses\Parser.gbas";
					}
					forEachSaver14804.values[forEachCounter14804] = local4_Vari_2189;
				
				};
				__debugInfo = "725:\src\CompilerPasses\Parser.gbas";
				func5_Error((((((((("Unknown variable/function: ") + (func14_GetCurrent_Str()))) + (" possible variables: '"))) + (local8_vars_Str_2187))) + ("'")), 724, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "717:\src\CompilerPasses\Parser.gbas";pool_array.free(local5_Varis_2188);
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
				var local5_found_2208 = 0;
				__debugInfo = "745:\src\CompilerPasses\Parser.gbas";
				func5_Start();
				__debugInfo = "747:\src\CompilerPasses\Parser.gbas";
				func5_Scope("__EOFFILE__", -(1));
				__debugInfo = "755:\src\CompilerPasses\Parser.gbas";
				var forEachSaver14876 = global8_Compiler.attr5_Funcs_ref[0];
				for(var forEachCounter14876 = 0 ; forEachCounter14876 < forEachSaver14876.values.length ; forEachCounter14876++) {
					var local4_func_ref_2190 = forEachSaver14876.values[forEachCounter14876];
				{
						__debugInfo = "754:\src\CompilerPasses\Parser.gbas";
						if (((((((local4_func_ref_2190[0].attr3_Typ) === (2)) ? 1 : 0)) || ((((local4_func_ref_2190[0].attr3_Typ) === (3)) ? 1 : 0))) ? 1 : 0)) {
							__debugInfo = "753:\src\CompilerPasses\Parser.gbas";
							local4_func_ref_2190[0].attr10_PlzCompile = 1;
							__debugInfo = "753:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "754:\src\CompilerPasses\Parser.gbas";
					}
					forEachSaver14876.values[forEachCounter14876] = local4_func_ref_2190;
				
				};
				__debugInfo = "785:\src\CompilerPasses\Parser.gbas";
				while (1) {
					var local5_Found_2191 = 0;
					__debugInfo = "776:\src\CompilerPasses\Parser.gbas";
					local5_Found_2191 = 0;
					__debugInfo = "783:\src\CompilerPasses\Parser.gbas";
					var forEachSaver14914 = global8_Compiler.attr5_Funcs_ref[0];
					for(var forEachCounter14914 = 0 ; forEachCounter14914 < forEachSaver14914.values.length ; forEachCounter14914++) {
						var local4_func_ref_2192 = forEachSaver14914.values[forEachCounter14914];
					{
							__debugInfo = "782:\src\CompilerPasses\Parser.gbas";
							if ((((local4_func_ref_2192[0].attr10_PlzCompile) && ((((local4_func_ref_2192[0].attr3_Scp) === (-(1))) ? 1 : 0))) ? 1 : 0)) {
								__debugInfo = "780:\src\CompilerPasses\Parser.gbas";
								if (func11_CompileFunc(unref(local4_func_ref_2192[0]))) {
									__debugInfo = "780:\src\CompilerPasses\Parser.gbas";
									local5_Found_2191 = 1;
									__debugInfo = "780:\src\CompilerPasses\Parser.gbas";
								};
								__debugInfo = "780:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "782:\src\CompilerPasses\Parser.gbas";
						}
						forEachSaver14914.values[forEachCounter14914] = local4_func_ref_2192;
					
					};
					__debugInfo = "784:\src\CompilerPasses\Parser.gbas";
					if ((((local5_Found_2191) === (0)) ? 1 : 0)) {
						__debugInfo = "784:\src\CompilerPasses\Parser.gbas";
						break;
						__debugInfo = "784:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "776:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "792:\src\CompilerPasses\Parser.gbas";
				{
					var local1_i_2193 = 0.0;
					__debugInfo = "816:\src\CompilerPasses\Parser.gbas";
					for (local1_i_2193 = 0;toCheck(local1_i_2193, ((global10_LastExprID) - (1)), 1);local1_i_2193 += 1) {
						var alias4_Expr_ref_2194 = [pool_TExpr.alloc()];
						__debugInfo = "794:\src\CompilerPasses\Parser.gbas";
						alias4_Expr_ref_2194 = global5_Exprs_ref[0].arrAccess(~~(local1_i_2193)).values[tmpPositionCache] /* ALIAS */;
						__debugInfo = "815:\src\CompilerPasses\Parser.gbas";
						if (((((((alias4_Expr_ref_2194[0].attr3_Typ) === (6)) ? 1 : 0)) || ((((alias4_Expr_ref_2194[0].attr3_Typ) === (23)) ? 1 : 0))) ? 1 : 0)) {
							__debugInfo = "814:\src\CompilerPasses\Parser.gbas";
							if (((((((BOUNDS(alias4_Expr_ref_2194[0].attr6_Params, 0)) < (BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(alias4_Expr_ref_2194[0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0))) ? 1 : 0)) && ((((alias4_Expr_ref_2194[0].attr8_wasAdded) === (0)) ? 1 : 0))) ? 1 : 0)) {
								var local4_Meth_2195 = 0, local7_TmpSave_2196 = 0;
								__debugInfo = "797:\src\CompilerPasses\Parser.gbas";
								alias4_Expr_ref_2194[0].attr8_wasAdded = 1;
								__debugInfo = "798:\src\CompilerPasses\Parser.gbas";
								local4_Meth_2195 = 0;
								__debugInfo = "805:\src\CompilerPasses\Parser.gbas";
								if ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(alias4_Expr_ref_2194[0].attr4_func).values[tmpPositionCache][0].attr3_Typ) === (3)) ? 1 : 0)) {
									__debugInfo = "801:\src\CompilerPasses\Parser.gbas";
									if ((((BOUNDS(alias4_Expr_ref_2194[0].attr6_Params, 0)) === (0)) ? 1 : 0)) {
										__debugInfo = "801:\src\CompilerPasses\Parser.gbas";
										func5_Error((((("Internal error (method '") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(alias4_Expr_ref_2194[0].attr4_func).values[tmpPositionCache][0].attr8_Name_Str))) + ("' didn't get self parameter)")), 800, "src\CompilerPasses\Parser.gbas");
										__debugInfo = "801:\src\CompilerPasses\Parser.gbas";
									};
									__debugInfo = "802:\src\CompilerPasses\Parser.gbas";
									local4_Meth_2195 = 1;
									__debugInfo = "803:\src\CompilerPasses\Parser.gbas";
									local7_TmpSave_2196 = alias4_Expr_ref_2194[0].attr6_Params.arrAccess(-(1)).values[tmpPositionCache];
									__debugInfo = "804:\src\CompilerPasses\Parser.gbas";
									DIMDEL(alias4_Expr_ref_2194[0].attr6_Params, -(1));
									__debugInfo = "801:\src\CompilerPasses\Parser.gbas";
								};
								__debugInfo = "805:\src\CompilerPasses\Parser.gbas";
								{
									__debugInfo = "810:\src\CompilerPasses\Parser.gbas";
									for (local1_i_2193 = BOUNDS(alias4_Expr_ref_2194[0].attr6_Params, 0);toCheck(local1_i_2193, ((((BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(alias4_Expr_ref_2194[0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0)) - (1))) - (local4_Meth_2195)), 1);local1_i_2193 += 1) {
										__debugInfo = "809:\src\CompilerPasses\Parser.gbas";
										if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(alias4_Expr_ref_2194[0].attr4_func).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_i_2193)).values[tmpPositionCache]).values[tmpPositionCache][0].attr6_PreDef) !== (-(1))) ? 1 : 0)) {
											__debugInfo = "808:\src\CompilerPasses\Parser.gbas";
											DIMPUSH(alias4_Expr_ref_2194[0].attr6_Params, global8_Compiler.attr5_Varis_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(alias4_Expr_ref_2194[0].attr4_func).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_i_2193)).values[tmpPositionCache]).values[tmpPositionCache][0].attr6_PreDef);
											__debugInfo = "808:\src\CompilerPasses\Parser.gbas";
										};
										__debugInfo = "809:\src\CompilerPasses\Parser.gbas";
									};
									__debugInfo = "810:\src\CompilerPasses\Parser.gbas";
								};
								__debugInfo = "813:\src\CompilerPasses\Parser.gbas";
								if (local4_Meth_2195) {
									__debugInfo = "812:\src\CompilerPasses\Parser.gbas";
									DIMPUSH(alias4_Expr_ref_2194[0].attr6_Params, local7_TmpSave_2196);
									__debugInfo = "812:\src\CompilerPasses\Parser.gbas";
								};
								__debugInfo = "797:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "814:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "794:\src\CompilerPasses\Parser.gbas";pool_TExpr.free(alias4_Expr_ref_2194);
					};
					__debugInfo = "816:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "819:\src\CompilerPasses\Parser.gbas";
				func15_CheckPrototypes();
				__debugInfo = "825:\src\CompilerPasses\Parser.gbas";
				{
					var local1_i_2197 = 0.0;
					__debugInfo = "881:\src\CompilerPasses\Parser.gbas";
					for (local1_i_2197 = 0;toCheck(local1_i_2197, ((global10_LastExprID) - (1)), 1);local1_i_2197 += 1) {
						__debugInfo = "880:\src\CompilerPasses\Parser.gbas";
						if (((((((global5_Exprs_ref[0].arrAccess(~~(local1_i_2197)).values[tmpPositionCache][0].attr3_Typ) === (6)) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(~~(local1_i_2197)).values[tmpPositionCache][0].attr3_Typ) === (23)) ? 1 : 0))) ? 1 : 0)) {
							var local4_Meth_2198 = 0;
							__debugInfo = "834:\src\CompilerPasses\Parser.gbas";
							local4_Meth_2198 = 0;
							__debugInfo = "835:\src\CompilerPasses\Parser.gbas";
							if ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2197)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr3_Typ) === (3)) ? 1 : 0)) {
								__debugInfo = "835:\src\CompilerPasses\Parser.gbas";
								local4_Meth_2198 = 1;
								__debugInfo = "835:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "837:\src\CompilerPasses\Parser.gbas";
							global8_Compiler.attr11_currentPosi = global5_Exprs_ref[0].arrAccess(~~(local1_i_2197)).values[tmpPositionCache][0].attr5_tokID;
							__debugInfo = "879:\src\CompilerPasses\Parser.gbas";
							if ((((BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2197)).values[tmpPositionCache][0].attr6_Params, 0)) === (BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2197)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0))) ? 1 : 0)) {
								var local1_j_2199 = 0.0, local9_NewParams_2200 = pool_array.alloc(0);
								__debugInfo = "840:\src\CompilerPasses\Parser.gbas";
								local1_j_2199 = 0;
								__debugInfo = "856:\src\CompilerPasses\Parser.gbas";
								var forEachSaver15341 = global5_Exprs_ref[0].arrAccess(~~(local1_i_2197)).values[tmpPositionCache][0].attr6_Params;
								for(var forEachCounter15341 = 0 ; forEachCounter15341 < forEachSaver15341.values.length ; forEachCounter15341++) {
									var local1_P_2201 = forEachSaver15341.values[forEachCounter15341];
								{
										var local1_S_2202 = 0, local3_Tmp_2203 = 0;
										__debugInfo = "843:\src\CompilerPasses\Parser.gbas";
										local1_S_2202 = 0;
										__debugInfo = "847:\src\CompilerPasses\Parser.gbas";
										if (global8_Compiler.attr5_Varis_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2197)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_j_2199)).values[tmpPositionCache]).values[tmpPositionCache][0].attr3_ref) {
											__debugInfo = "845:\src\CompilerPasses\Parser.gbas";
											global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(local1_P_2201, 1)).values[tmpPositionCache][0].attr3_ref = 1;
											__debugInfo = "846:\src\CompilerPasses\Parser.gbas";
											local1_S_2202 = 1;
											__debugInfo = "845:\src\CompilerPasses\Parser.gbas";
										};
										__debugInfo = "853:\src\CompilerPasses\Parser.gbas";
										if (((local1_S_2202) ? 0 : 1)) {
											__debugInfo = "850:\src\CompilerPasses\Parser.gbas";
											local3_Tmp_2203 = func14_EnsureDatatype(local1_P_2201, global8_Compiler.attr5_Varis_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2197)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_j_2199)).values[tmpPositionCache]).values[tmpPositionCache][0].attr8_datatype, 849, local1_S_2202);
											__debugInfo = "850:\src\CompilerPasses\Parser.gbas";
										} else {
											__debugInfo = "852:\src\CompilerPasses\Parser.gbas";
											local3_Tmp_2203 = local1_P_2201;
											__debugInfo = "852:\src\CompilerPasses\Parser.gbas";
										};
										__debugInfo = "854:\src\CompilerPasses\Parser.gbas";
										DIMPUSH(local9_NewParams_2200, local3_Tmp_2203);
										__debugInfo = "855:\src\CompilerPasses\Parser.gbas";
										local1_j_2199+=1;
										__debugInfo = "843:\src\CompilerPasses\Parser.gbas";
									}
									forEachSaver15341.values[forEachCounter15341] = local1_P_2201;
								
								};
								__debugInfo = "857:\src\CompilerPasses\Parser.gbas";
								global5_Exprs_ref[0].arrAccess(~~(local1_i_2197)).values[tmpPositionCache][0].attr6_Params = local9_NewParams_2200.clone(/* In Assign */);
								__debugInfo = "840:\src\CompilerPasses\Parser.gbas";pool_array.free(local9_NewParams_2200);
							} else {
								var local8_miss_Str_2204 = "", local9_datas_Str_2205 = "";
								__debugInfo = "858:\src\CompilerPasses\Parser.gbas";
								local8_miss_Str_2204 = "";
								__debugInfo = "870:\src\CompilerPasses\Parser.gbas";
								if ((((BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2197)).values[tmpPositionCache][0].attr6_Params, 0)) < (BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2197)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0))) ? 1 : 0)) {
									__debugInfo = "860:\src\CompilerPasses\Parser.gbas";
									{
										var local1_j_2206 = 0.0;
										__debugInfo = "863:\src\CompilerPasses\Parser.gbas";
										for (local1_j_2206 = BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2197)).values[tmpPositionCache][0].attr6_Params, 0);toCheck(local1_j_2206, ((((BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2197)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0)) - (1))) - (local4_Meth_2198)), 1);local1_j_2206 += 1) {
											__debugInfo = "862:\src\CompilerPasses\Parser.gbas";
											local8_miss_Str_2204 = ((((local8_miss_Str_2204) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2197)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_j_2206)).values[tmpPositionCache]).values[tmpPositionCache][0].attr8_Name_Str))) + (", "));
											__debugInfo = "862:\src\CompilerPasses\Parser.gbas";
										};
										__debugInfo = "863:\src\CompilerPasses\Parser.gbas";
									};
									__debugInfo = "860:\src\CompilerPasses\Parser.gbas";
								} else if ((((BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2197)).values[tmpPositionCache][0].attr6_Params, 0)) > (BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2197)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0))) ? 1 : 0)) {
									__debugInfo = "864:\src\CompilerPasses\Parser.gbas";
									{
										var local1_j_2207 = 0.0;
										__debugInfo = "869:\src\CompilerPasses\Parser.gbas";
										for (local1_j_2207 = BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2197)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0);toCheck(local1_j_2207, ((((BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2197)).values[tmpPositionCache][0].attr6_Params, 0)) - (local4_Meth_2198))) - (1)), 1);local1_j_2207 += 1) {
											__debugInfo = "868:\src\CompilerPasses\Parser.gbas";
											if ((((global5_Exprs_ref[0].arrAccess(~~(local1_i_2197)).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_j_2207)).values[tmpPositionCache]) < (BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0))) ? 1 : 0)) {
												__debugInfo = "867:\src\CompilerPasses\Parser.gbas";
												local9_datas_Str_2205 = ((((local9_datas_Str_2205) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2197)).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_j_2207)).values[tmpPositionCache]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) + (", "));
												__debugInfo = "867:\src\CompilerPasses\Parser.gbas";
											};
											__debugInfo = "868:\src\CompilerPasses\Parser.gbas";
										};
										__debugInfo = "869:\src\CompilerPasses\Parser.gbas";
									};
									__debugInfo = "864:\src\CompilerPasses\Parser.gbas";
								};
								__debugInfo = "871:\src\CompilerPasses\Parser.gbas";
								global8_Compiler.attr11_currentPosi = global5_Exprs_ref[0].arrAccess(~~(local1_i_2197)).values[tmpPositionCache][0].attr5_tokID;
								__debugInfo = "878:\src\CompilerPasses\Parser.gbas";
								if ((((BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2197)).values[tmpPositionCache][0].attr6_Params, 0)) > (BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2197)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0))) ? 1 : 0)) {
									__debugInfo = "873:\src\CompilerPasses\Parser.gbas";
									func5_Error((((((((((((((((("Too many parameters, function '") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2197)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr8_Name_Str))) + ("' has: '"))) + (CAST2STRING(((BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2197)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0)) - (local4_Meth_2198)))))) + ("' got '"))) + (CAST2STRING(BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2197)).values[tmpPositionCache][0].attr6_Params, 0))))) + ("' datatypes '"))) + (local9_datas_Str_2205))) + ("'")), 872, "src\CompilerPasses\Parser.gbas");
									__debugInfo = "873:\src\CompilerPasses\Parser.gbas";
								} else if ((((BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2197)).values[tmpPositionCache][0].attr6_Params, 0)) < (BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2197)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0))) ? 1 : 0)) {
									__debugInfo = "875:\src\CompilerPasses\Parser.gbas";
									func5_Error((((((((((((((((("Too less parameters, function '") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2197)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr8_Name_Str))) + ("' has: '"))) + (CAST2STRING(((BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2197)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0)) - (local4_Meth_2198)))))) + ("' got '"))) + (CAST2STRING(BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2197)).values[tmpPositionCache][0].attr6_Params, 0))))) + ("' missing '"))) + (local8_miss_Str_2204))) + ("'")), 874, "src\CompilerPasses\Parser.gbas");
									__debugInfo = "875:\src\CompilerPasses\Parser.gbas";
								} else {
									__debugInfo = "877:\src\CompilerPasses\Parser.gbas";
									func5_Error((((((((("Internal error (wtf? call: ") + (CAST2STRING(BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2197)).values[tmpPositionCache][0].attr6_Params, 0))))) + (", "))) + (CAST2STRING(BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2197)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0))))) + (")")), 876, "src\CompilerPasses\Parser.gbas");
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
				local5_found_2208 = 1;
				__debugInfo = "925:\src\CompilerPasses\Parser.gbas";
				while (local5_found_2208) {
					__debugInfo = "893:\src\CompilerPasses\Parser.gbas";
					local5_found_2208 = 0;
					__debugInfo = "895:\src\CompilerPasses\Parser.gbas";
					{
						var local1_i_2209 = 0.0;
						__debugInfo = "924:\src\CompilerPasses\Parser.gbas";
						for (local1_i_2209 = 0;toCheck(local1_i_2209, ((global10_LastExprID) - (1)), 1);local1_i_2209 += 1) {
							var alias1_E_ref_2210 = [pool_TExpr.alloc()], local3_set_2211 = 0, local4_Vari_2212 = 0, local3_var_2213 = 0;
							__debugInfo = "897:\src\CompilerPasses\Parser.gbas";
							alias1_E_ref_2210 = global5_Exprs_ref[0].arrAccess(~~(local1_i_2209)).values[tmpPositionCache] /* ALIAS */;
							__debugInfo = "898:\src\CompilerPasses\Parser.gbas";
							local3_set_2211 = 0;
							__debugInfo = "901:\src\CompilerPasses\Parser.gbas";
							{
								var local17___SelectHelper23__2214 = 0;
								__debugInfo = "901:\src\CompilerPasses\Parser.gbas";
								local17___SelectHelper23__2214 = alias1_E_ref_2210[0].attr3_Typ;
								__debugInfo = "913:\src\CompilerPasses\Parser.gbas";
								if ((((local17___SelectHelper23__2214) === (~~(40))) ? 1 : 0)) {
									__debugInfo = "903:\src\CompilerPasses\Parser.gbas";
									local4_Vari_2212 = alias1_E_ref_2210[0].attr4_vari;
									__debugInfo = "904:\src\CompilerPasses\Parser.gbas";
									local3_var_2213 = func11_GetVariable(alias1_E_ref_2210[0].attr4_expr, 0);
									__debugInfo = "905:\src\CompilerPasses\Parser.gbas";
									local3_set_2211 = 1;
									__debugInfo = "903:\src\CompilerPasses\Parser.gbas";
								} else if ((((local17___SelectHelper23__2214) === (~~(38))) ? 1 : 0)) {
									__debugInfo = "907:\src\CompilerPasses\Parser.gbas";
									local4_Vari_2212 = alias1_E_ref_2210[0].attr6_inExpr;
									__debugInfo = "908:\src\CompilerPasses\Parser.gbas";
									local3_var_2213 = func11_GetVariable(alias1_E_ref_2210[0].attr7_varExpr, 0);
									__debugInfo = "909:\src\CompilerPasses\Parser.gbas";
									local3_set_2211 = 1;
									__debugInfo = "907:\src\CompilerPasses\Parser.gbas";
								} else if ((((local17___SelectHelper23__2214) === (~~(6))) ? 1 : 0)) {
									
								};
								__debugInfo = "901:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "923:\src\CompilerPasses\Parser.gbas";
							if ((((local3_set_2211) && ((((local3_var_2213) >= (0)) ? 1 : 0))) ? 1 : 0)) {
								var local1_v_2215 = 0;
								__debugInfo = "917:\src\CompilerPasses\Parser.gbas";
								local1_v_2215 = func11_GetVariable(local4_Vari_2212, 1);
								__debugInfo = "918:\src\CompilerPasses\Parser.gbas";
								if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_var_2213).values[tmpPositionCache][0].attr3_ref) !== (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_v_2215).values[tmpPositionCache][0].attr3_ref)) ? 1 : 0)) {
									__debugInfo = "918:\src\CompilerPasses\Parser.gbas";
									local5_found_2208 = 1;
									__debugInfo = "918:\src\CompilerPasses\Parser.gbas";
								};
								__debugInfo = "922:\src\CompilerPasses\Parser.gbas";
								global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_var_2213).values[tmpPositionCache][0].attr3_ref = global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_v_2215).values[tmpPositionCache][0].attr3_ref;
								__debugInfo = "917:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "897:\src\CompilerPasses\Parser.gbas";pool_TExpr.free(alias1_E_ref_2210);
						};
						__debugInfo = "924:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "893:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "932:\src\CompilerPasses\Parser.gbas";
				{
					var local1_i_2216 = 0.0;
					__debugInfo = "957:\src\CompilerPasses\Parser.gbas";
					for (local1_i_2216 = 0;toCheck(local1_i_2216, ((global10_LastExprID) - (1)), 1);local1_i_2216 += 1) {
						var alias4_Expr_ref_2217 = [pool_TExpr.alloc()];
						__debugInfo = "934:\src\CompilerPasses\Parser.gbas";
						alias4_Expr_ref_2217 = global5_Exprs_ref[0].arrAccess(~~(local1_i_2216)).values[tmpPositionCache] /* ALIAS */;
						__debugInfo = "935:\src\CompilerPasses\Parser.gbas";
						{
							var local17___SelectHelper24__2218 = 0;
							__debugInfo = "935:\src\CompilerPasses\Parser.gbas";
							local17___SelectHelper24__2218 = alias4_Expr_ref_2217[0].attr3_Typ;
							__debugInfo = "956:\src\CompilerPasses\Parser.gbas";
							if ((((local17___SelectHelper24__2218) === (~~(2))) ? 1 : 0)) {
								__debugInfo = "955:\src\CompilerPasses\Parser.gbas";
								if ((((((((((alias4_Expr_ref_2217[0].attr6_ScpTyp) === (2)) ? 1 : 0)) || ((((alias4_Expr_ref_2217[0].attr6_ScpTyp) === (4)) ? 1 : 0))) ? 1 : 0)) && (BOUNDS(alias4_Expr_ref_2217[0].attr5_Gotos, 0))) ? 1 : 0)) {
									__debugInfo = "940:\src\CompilerPasses\Parser.gbas";
									if (((func12_ScopeHasGoto(unref(alias4_Expr_ref_2217[0]))) ? 0 : 1)) {
										__debugInfo = "940:\src\CompilerPasses\Parser.gbas";
										func5_Error("Internal Error (There is a goto, but I can't find it)", 939, "src\CompilerPasses\Parser.gbas");
										__debugInfo = "940:\src\CompilerPasses\Parser.gbas";
									};
									__debugInfo = "954:\src\CompilerPasses\Parser.gbas";
									var forEachSaver16026 = alias4_Expr_ref_2217[0].attr5_Gotos;
									for(var forEachCounter16026 = 0 ; forEachCounter16026 < forEachSaver16026.values.length ; forEachCounter16026++) {
										var local1_G_2219 = forEachSaver16026.values[forEachCounter16026];
									{
											var local5_Found_2220 = 0;
											__debugInfo = "942:\src\CompilerPasses\Parser.gbas";
											local5_Found_2220 = 0;
											__debugInfo = "948:\src\CompilerPasses\Parser.gbas";
											var forEachSaver15999 = alias4_Expr_ref_2217[0].attr6_Labels;
											for(var forEachCounter15999 = 0 ; forEachCounter15999 < forEachSaver15999.values.length ; forEachCounter15999++) {
												var local1_L_2221 = forEachSaver15999.values[forEachCounter15999];
											{
													__debugInfo = "947:\src\CompilerPasses\Parser.gbas";
													if ((((global5_Exprs_ref[0].arrAccess(local1_L_2221).values[tmpPositionCache][0].attr8_Name_Str) === (global5_Exprs_ref[0].arrAccess(local1_G_2219).values[tmpPositionCache][0].attr8_Name_Str)) ? 1 : 0)) {
														__debugInfo = "945:\src\CompilerPasses\Parser.gbas";
														local5_Found_2220 = 1;
														__debugInfo = "946:\src\CompilerPasses\Parser.gbas";
														break;
														__debugInfo = "945:\src\CompilerPasses\Parser.gbas";
													};
													__debugInfo = "947:\src\CompilerPasses\Parser.gbas";
												}
												forEachSaver15999.values[forEachCounter15999] = local1_L_2221;
											
											};
											__debugInfo = "953:\src\CompilerPasses\Parser.gbas";
											if (((local5_Found_2220) ? 0 : 1)) {
												__debugInfo = "950:\src\CompilerPasses\Parser.gbas";
												global8_Compiler.attr11_currentPosi = global5_Exprs_ref[0].arrAccess(local1_G_2219).values[tmpPositionCache][0].attr5_tokID;
												__debugInfo = "951:\src\CompilerPasses\Parser.gbas";
												func5_Error((((("Label '") + (global5_Exprs_ref[0].arrAccess(local1_G_2219).values[tmpPositionCache][0].attr8_Name_Str))) + ("' does not exist, please use an existing label badass!")), 950, "src\CompilerPasses\Parser.gbas");
												__debugInfo = "950:\src\CompilerPasses\Parser.gbas";
											};
											__debugInfo = "942:\src\CompilerPasses\Parser.gbas";
										}
										forEachSaver16026.values[forEachCounter16026] = local1_G_2219;
									
									};
									__debugInfo = "940:\src\CompilerPasses\Parser.gbas";
								};
								__debugInfo = "955:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "935:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "934:\src\CompilerPasses\Parser.gbas";pool_TExpr.free(alias4_Expr_ref_2217);
					};
					__debugInfo = "957:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "966:\src\CompilerPasses\Parser.gbas";
				var forEachSaver16052 = global8_Compiler.attr5_Types_ref[0];
				for(var forEachCounter16052 = 0 ; forEachCounter16052 < forEachSaver16052.values.length ; forEachCounter16052++) {
					var local3_Typ_ref_2222 = forEachSaver16052.values[forEachCounter16052];
				{
						__debugInfo = "964:\src\CompilerPasses\Parser.gbas";
						local3_Typ_ref_2222[0].attr9_OName_Str = local3_Typ_ref_2222[0].attr8_Name_Str;
						__debugInfo = "965:\src\CompilerPasses\Parser.gbas";
						local3_Typ_ref_2222[0].attr8_Name_Str = func18_ChangeTypeName_Str(local3_Typ_ref_2222[0].attr8_Name_Str);
						__debugInfo = "964:\src\CompilerPasses\Parser.gbas";
					}
					forEachSaver16052.values[forEachCounter16052] = local3_Typ_ref_2222;
				
				};
				__debugInfo = "972:\src\CompilerPasses\Parser.gbas";
				var forEachSaver16062 = global8_Compiler.attr5_Funcs_ref[0];
				for(var forEachCounter16062 = 0 ; forEachCounter16062 < forEachSaver16062.values.length ; forEachCounter16062++) {
					var local4_Func_ref_2223 = forEachSaver16062.values[forEachCounter16062];
				{
						__debugInfo = "971:\src\CompilerPasses\Parser.gbas";
						func14_ChangeFuncName(unref(local4_Func_ref_2223[0]));
						__debugInfo = "971:\src\CompilerPasses\Parser.gbas";
					}
					forEachSaver16062.values[forEachCounter16062] = local4_Func_ref_2223;
				
				};
				__debugInfo = "978:\src\CompilerPasses\Parser.gbas";
				var forEachSaver16072 = global8_Compiler.attr5_Varis_ref[0];
				for(var forEachCounter16072 = 0 ; forEachCounter16072 < forEachSaver16072.values.length ; forEachCounter16072++) {
					var local4_Vari_ref_2224 = forEachSaver16072.values[forEachCounter16072];
				{
						__debugInfo = "977:\src\CompilerPasses\Parser.gbas";
						func13_ChangeVarName(unref(local4_Vari_ref_2224[0]));
						__debugInfo = "977:\src\CompilerPasses\Parser.gbas";
					}
					forEachSaver16072.values[forEachCounter16072] = local4_Vari_ref_2224;
				
				};
				__debugInfo = "986:\src\CompilerPasses\Parser.gbas";
				var forEachSaver16108 = global8_Compiler.attr5_Varis_ref[0];
				for(var forEachCounter16108 = 0 ; forEachCounter16108 < forEachSaver16108.values.length ; forEachCounter16108++) {
					var local1_V_ref_2225 = forEachSaver16108.values[forEachCounter16108];
				{
						__debugInfo = "985:\src\CompilerPasses\Parser.gbas";
						if (((((((local1_V_ref_2225[0].attr3_Typ) === (1)) ? 1 : 0)) || ((((local1_V_ref_2225[0].attr3_Typ) === (7)) ? 1 : 0))) ? 1 : 0)) {
							__debugInfo = "984:\src\CompilerPasses\Parser.gbas";
							local1_V_ref_2225[0].attr8_Name_Str = ((((local1_V_ref_2225[0].attr8_Name_Str) + ("_"))) + (CAST2STRING(local1_V_ref_2225[0].attr2_ID)));
							__debugInfo = "984:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "985:\src\CompilerPasses\Parser.gbas";
					}
					forEachSaver16108.values[forEachCounter16108] = local1_V_ref_2225;
				
				};
				__debugInfo = "988:\src\CompilerPasses\Parser.gbas";
				{
					var local1_i_2226 = 0.0;
					__debugInfo = "1002:\src\CompilerPasses\Parser.gbas";
					for (local1_i_2226 = 0;toCheck(local1_i_2226, ((global10_LastExprID) - (1)), 1);local1_i_2226 += 1) {
						var alias1_E_ref_2227 = [pool_TExpr.alloc()];
						__debugInfo = "990:\src\CompilerPasses\Parser.gbas";
						alias1_E_ref_2227 = global5_Exprs_ref[0].arrAccess(~~(local1_i_2226)).values[tmpPositionCache] /* ALIAS */;
						__debugInfo = "1001:\src\CompilerPasses\Parser.gbas";
						if (((((((((((((alias1_E_ref_2227[0].attr8_datatype.attr8_Name_Str) === ("void")) ? 1 : 0)) || ((((alias1_E_ref_2227[0].attr8_datatype.attr8_Name_Str) === ("int")) ? 1 : 0))) ? 1 : 0)) || ((((alias1_E_ref_2227[0].attr8_datatype.attr8_Name_Str) === ("float")) ? 1 : 0))) ? 1 : 0)) || ((((alias1_E_ref_2227[0].attr8_datatype.attr8_Name_Str) === ("string")) ? 1 : 0))) ? 1 : 0)) {
							
						} else {
							__debugInfo = "1000:\src\CompilerPasses\Parser.gbas";
							if ((((func6_IsType(alias1_E_ref_2227[0].attr8_datatype.attr8_Name_Str)) === (0)) ? 1 : 0)) {
								__debugInfo = "999:\src\CompilerPasses\Parser.gbas";
								var forEachSaver16199 = global8_Compiler.attr5_Funcs_ref[0];
								for(var forEachCounter16199 = 0 ; forEachCounter16199 < forEachSaver16199.values.length ; forEachCounter16199++) {
									var local1_F_ref_2228 = forEachSaver16199.values[forEachCounter16199];
								{
										__debugInfo = "998:\src\CompilerPasses\Parser.gbas";
										if ((((alias1_E_ref_2227[0].attr8_datatype.attr8_Name_Str) === (local1_F_ref_2228[0].attr9_OName_Str)) ? 1 : 0)) {
											__debugInfo = "997:\src\CompilerPasses\Parser.gbas";
											alias1_E_ref_2227[0].attr8_datatype.attr8_Name_Str = local1_F_ref_2228[0].attr8_Name_Str;
											__debugInfo = "997:\src\CompilerPasses\Parser.gbas";
										};
										__debugInfo = "998:\src\CompilerPasses\Parser.gbas";
									}
									forEachSaver16199.values[forEachCounter16199] = local1_F_ref_2228;
								
								};
								__debugInfo = "999:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "1000:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "990:\src\CompilerPasses\Parser.gbas";pool_TExpr.free(alias1_E_ref_2227);
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
			var forEachSaver16388 = global8_Compiler.attr13_protoCheckers;
			for(var forEachCounter16388 = 0 ; forEachCounter16388 < forEachSaver16388.values.length ; forEachCounter16388++) {
				var local7_checker_2230 = forEachSaver16388.values[forEachCounter16388];
			{
					var alias5_func1_ref_2231 = [pool_TIdentifierFunc.alloc()], alias5_func2_ref_2232 = [pool_TIdentifierFunc.alloc()], local5_valid_2233 = 0;
					__debugInfo = "1020:\src\CompilerPasses\Parser.gbas";
					alias5_func1_ref_2231 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(local7_checker_2230.attr8_fromFunc).values[tmpPositionCache] /* ALIAS */;
					__debugInfo = "1021:\src\CompilerPasses\Parser.gbas";
					alias5_func2_ref_2232 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(local7_checker_2230.attr6_toFunc).values[tmpPositionCache] /* ALIAS */;
					__debugInfo = "1022:\src\CompilerPasses\Parser.gbas";
					local5_valid_2233 = 0;
					__debugInfo = "1032:\src\CompilerPasses\Parser.gbas";
					if (((((((alias5_func1_ref_2231[0].attr8_datatype.attr8_Name_Str) === (alias5_func2_ref_2232[0].attr8_datatype.attr8_Name_Str)) ? 1 : 0)) && ((((alias5_func1_ref_2231[0].attr8_datatype.attr7_IsArray) === (alias5_func2_ref_2232[0].attr8_datatype.attr7_IsArray)) ? 1 : 0))) ? 1 : 0)) {
						__debugInfo = "1031:\src\CompilerPasses\Parser.gbas";
						if ((((BOUNDS(alias5_func1_ref_2231[0].attr6_Params, 0)) === (BOUNDS(alias5_func2_ref_2232[0].attr6_Params, 0))) ? 1 : 0)) {
							__debugInfo = "1025:\src\CompilerPasses\Parser.gbas";
							local5_valid_2233 = 1;
							__debugInfo = "1025:\src\CompilerPasses\Parser.gbas";
							{
								var local1_i_2234 = 0.0;
								__debugInfo = "1030:\src\CompilerPasses\Parser.gbas";
								for (local1_i_2234 = 0;toCheck(local1_i_2234, ((BOUNDS(alias5_func1_ref_2231[0].attr6_Params, 0)) - (1)), 1);local1_i_2234 += 1) {
									var alias2_p1_ref_2235 = [pool_TIdentifierVari.alloc()], alias2_p2_ref_2236 = [pool_TIdentifierVari.alloc()];
									__debugInfo = "1027:\src\CompilerPasses\Parser.gbas";
									alias2_p1_ref_2235 = global8_Compiler.attr5_Varis_ref[0].arrAccess(alias5_func1_ref_2231[0].attr6_Params.arrAccess(~~(local1_i_2234)).values[tmpPositionCache]).values[tmpPositionCache] /* ALIAS */;
									__debugInfo = "1028:\src\CompilerPasses\Parser.gbas";
									alias2_p2_ref_2236 = global8_Compiler.attr5_Varis_ref[0].arrAccess(alias5_func2_ref_2232[0].attr6_Params.arrAccess(~~(local1_i_2234)).values[tmpPositionCache]).values[tmpPositionCache] /* ALIAS */;
									__debugInfo = "1029:\src\CompilerPasses\Parser.gbas";
									if (((((((alias2_p1_ref_2235[0].attr8_datatype.attr8_Name_Str) !== (alias2_p2_ref_2236[0].attr8_datatype.attr8_Name_Str)) ? 1 : 0)) || ((((alias2_p1_ref_2235[0].attr8_datatype.attr7_IsArray) !== (alias2_p2_ref_2236[0].attr8_datatype.attr7_IsArray)) ? 1 : 0))) ? 1 : 0)) {
										__debugInfo = "1029:\src\CompilerPasses\Parser.gbas";
										local5_valid_2233 = 0;
										__debugInfo = "1029:\src\CompilerPasses\Parser.gbas";
									};
									__debugInfo = "1027:\src\CompilerPasses\Parser.gbas";pool_TIdentifierVari.free(alias2_p1_ref_2235);pool_TIdentifierVari.free(alias2_p2_ref_2236);
								};
								__debugInfo = "1030:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "1025:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "1031:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "1036:\src\CompilerPasses\Parser.gbas";
					if ((((local5_valid_2233) === (0)) ? 1 : 0)) {
						__debugInfo = "1035:\src\CompilerPasses\Parser.gbas";
						func5_Error((((((((("Cannot cast prototype '") + (func17_BuildPrototyp_Str(local7_checker_2230.attr8_fromFunc)))) + ("' to '"))) + (func17_BuildPrototyp_Str(local7_checker_2230.attr6_toFunc)))) + ("'")), 1034, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "1035:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "1020:\src\CompilerPasses\Parser.gbas";pool_TIdentifierFunc.free(alias5_func1_ref_2231);pool_TIdentifierFunc.free(alias5_func2_ref_2232);
				}
				forEachSaver16388.values[forEachCounter16388] = local7_checker_2230;
			
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
		var local6_ScpTyp_2239 = 0, local9_Important_2240 = 0, local7_befLoop_2242 = 0, local8_TmpScope_2243 = 0.0, local12_TmpImportant_2244 = 0, local7_OneLine_2247 = 0, local13_OCloseStr_Str_2248 = "", local7_MyScope_2255 = 0;
		var local12_CloseStr_Str_ref_2237 = [param12_CloseStr_Str];
		__debugInfo = "1045:\src\CompilerPasses\Parser.gbas";
		local6_ScpTyp_2239 = 0;
		__debugInfo = "1046:\src\CompilerPasses\Parser.gbas";
		local9_Important_2240 = 0;
		__debugInfo = "1047:\src\CompilerPasses\Parser.gbas";
		{
			var local17___SelectHelper25__2241 = "";
			__debugInfo = "1047:\src\CompilerPasses\Parser.gbas";
			local17___SelectHelper25__2241 = local12_CloseStr_Str_ref_2237[0];
			__debugInfo = "1073:\src\CompilerPasses\Parser.gbas";
			if ((((local17___SelectHelper25__2241) === ("ENDIF")) ? 1 : 0)) {
				__debugInfo = "1049:\src\CompilerPasses\Parser.gbas";
				local6_ScpTyp_2239 = ~~(1);
				__debugInfo = "1049:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper25__2241) === ("ENDSELECT")) ? 1 : 0)) {
				__debugInfo = "1051:\src\CompilerPasses\Parser.gbas";
				local6_ScpTyp_2239 = ~~(6);
				__debugInfo = "1051:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper25__2241) === ("WEND")) ? 1 : 0)) {
				__debugInfo = "1053:\src\CompilerPasses\Parser.gbas";
				local6_ScpTyp_2239 = ~~(3);
				__debugInfo = "1053:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper25__2241) === ("UNTIL")) ? 1 : 0)) {
				__debugInfo = "1055:\src\CompilerPasses\Parser.gbas";
				local6_ScpTyp_2239 = ~~(3);
				__debugInfo = "1055:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper25__2241) === ("NEXT")) ? 1 : 0)) {
				__debugInfo = "1057:\src\CompilerPasses\Parser.gbas";
				local6_ScpTyp_2239 = ~~(3);
				__debugInfo = "1057:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper25__2241) === ("ENDFUNCTION")) ? 1 : 0)) {
				__debugInfo = "1059:\src\CompilerPasses\Parser.gbas";
				local6_ScpTyp_2239 = ~~(2);
				__debugInfo = "1060:\src\CompilerPasses\Parser.gbas";
				local9_Important_2240 = 1;
				__debugInfo = "1059:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper25__2241) === ("ENDSUB")) ? 1 : 0)) {
				__debugInfo = "1062:\src\CompilerPasses\Parser.gbas";
				local6_ScpTyp_2239 = ~~(2);
				__debugInfo = "1063:\src\CompilerPasses\Parser.gbas";
				local9_Important_2240 = 1;
				__debugInfo = "1062:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper25__2241) === ("CATCH")) ? 1 : 0)) {
				__debugInfo = "1065:\src\CompilerPasses\Parser.gbas";
				local6_ScpTyp_2239 = ~~(5);
				__debugInfo = "1065:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper25__2241) === ("FINALLY")) ? 1 : 0)) {
				__debugInfo = "1067:\src\CompilerPasses\Parser.gbas";
				local6_ScpTyp_2239 = ~~(5);
				__debugInfo = "1067:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper25__2241) === ("__EOFFILE__")) ? 1 : 0)) {
				__debugInfo = "1069:\src\CompilerPasses\Parser.gbas";
				local6_ScpTyp_2239 = ~~(4);
				__debugInfo = "1070:\src\CompilerPasses\Parser.gbas";
				local9_Important_2240 = 1;
				__debugInfo = "1069:\src\CompilerPasses\Parser.gbas";
			} else {
				__debugInfo = "1072:\src\CompilerPasses\Parser.gbas";
				func5_Error("Internal error (unknown scope type)", 1071, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1072:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "1047:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "1075:\src\CompilerPasses\Parser.gbas";
		local7_befLoop_2242 = global8_Compiler.attr6_inLoop;
		__debugInfo = "1076:\src\CompilerPasses\Parser.gbas";
		if ((((local6_ScpTyp_2239) === (3)) ? 1 : 0)) {
			__debugInfo = "1076:\src\CompilerPasses\Parser.gbas";
			global8_Compiler.attr6_inLoop = 1;
			__debugInfo = "1076:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "1077:\src\CompilerPasses\Parser.gbas";
		local8_TmpScope_2243 = global8_Compiler.attr12_CurrentScope;
		__debugInfo = "1078:\src\CompilerPasses\Parser.gbas";
		local12_TmpImportant_2244 = global8_Compiler.attr14_ImportantScope;
		__debugInfo = "1079:\src\CompilerPasses\Parser.gbas";
		global8_Compiler.attr12_CurrentScope = func21_CreateScopeExpression(local6_ScpTyp_2239);
		__debugInfo = "1082:\src\CompilerPasses\Parser.gbas";
		if ((((local12_CloseStr_Str_ref_2237[0]) === ("__EOFFILE__")) ? 1 : 0)) {
			__debugInfo = "1081:\src\CompilerPasses\Parser.gbas";
			global8_Compiler.attr9_MainScope = global8_Compiler.attr12_CurrentScope;
			__debugInfo = "1081:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "1086:\src\CompilerPasses\Parser.gbas";
		if (local9_Important_2240) {
			__debugInfo = "1085:\src\CompilerPasses\Parser.gbas";
			global8_Compiler.attr14_ImportantScope = global8_Compiler.attr12_CurrentScope;
			__debugInfo = "1085:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "1097:\src\CompilerPasses\Parser.gbas";
		if (((((((local6_ScpTyp_2239) === (2)) ? 1 : 0)) && ((((param4_func) !== (-(1))) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "1096:\src\CompilerPasses\Parser.gbas";
			var forEachSaver16618 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr6_Params;
			for(var forEachCounter16618 = 0 ; forEachCounter16618 < forEachSaver16618.values.length ; forEachCounter16618++) {
				var local5_param_2245 = forEachSaver16618.values[forEachCounter16618];
			{
					var local4_vari_2246 = pool_TIdentifierVari.alloc();
					__debugInfo = "1091:\src\CompilerPasses\Parser.gbas";
					local4_vari_2246 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local5_param_2245).values[tmpPositionCache][0].clone(/* In Assign */);
					__debugInfo = "1092:\src\CompilerPasses\Parser.gbas";
					local4_vari_2246.attr3_Typ = ~~(1);
					__debugInfo = "1093:\src\CompilerPasses\Parser.gbas";
					func11_AddVariable(local4_vari_2246, 1);
					__debugInfo = "1094:\src\CompilerPasses\Parser.gbas";
					DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
					__debugInfo = "1095:\src\CompilerPasses\Parser.gbas";
					DIMPUSH(global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr10_CopyParams, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
					__debugInfo = "1091:\src\CompilerPasses\Parser.gbas";pool_TIdentifierVari.free(local4_vari_2246);
				}
				forEachSaver16618.values[forEachCounter16618] = local5_param_2245;
			
			};
			__debugInfo = "1096:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "1098:\src\CompilerPasses\Parser.gbas";
		local7_OneLine_2247 = 0;
		__debugInfo = "1102:\src\CompilerPasses\Parser.gbas";
		if (func7_IsToken("THEN")) {
			__debugInfo = "1100:\src\CompilerPasses\Parser.gbas";
			local7_OneLine_2247 = 1;
			__debugInfo = "1101:\src\CompilerPasses\Parser.gbas";
			func5_Match("THEN", 1100, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "1100:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "1103:\src\CompilerPasses\Parser.gbas";
		local13_OCloseStr_Str_2248 = local12_CloseStr_Str_ref_2237[0];
		__debugInfo = "1183:\src\CompilerPasses\Parser.gbas";
		while ((((func7_IsToken(func13_IsClosing_Str(local12_CloseStr_Str_ref_2237, local6_ScpTyp_2239))) === (0)) ? 1 : 0)) {
			__debugInfo = "1105:\src\CompilerPasses\Parser.gbas";
			if ((((func8_EOFParse()) === (0)) ? 1 : 0)) {
				__debugInfo = "1105:\src\CompilerPasses\Parser.gbas";
				func5_Error((("Missing closing: ") + (local12_CloseStr_Str_ref_2237[0])), 1104, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1105:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "1180:\src\CompilerPasses\Parser.gbas";
			{
				var Err_Str = "";
				__debugInfo = "1182:\src\CompilerPasses\Parser.gbas";
				try {
					var local4_Expr_2249 = 0;
					__debugInfo = "1110:\src\CompilerPasses\Parser.gbas";
					local4_Expr_2249 = -(1);
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
						local4_Expr_2249 = func7_Keyword();
						__debugInfo = "1125:\src\CompilerPasses\Parser.gbas";
					} else if (func12_IsIdentifier(1, 0)) {
						__debugInfo = "1127:\src\CompilerPasses\Parser.gbas";
						local4_Expr_2249 = func10_Identifier(1);
						__debugInfo = "1127:\src\CompilerPasses\Parser.gbas";
					} else if (func7_IsToken("super")) {
						__debugInfo = "1130:\src\CompilerPasses\Parser.gbas";
						local4_Expr_2249 = func10_Identifier(1);
						__debugInfo = "1130:\src\CompilerPasses\Parser.gbas";
					} else {
						var local3_pos_2250 = 0, local8_Name_Str_2251 = "";
						__debugInfo = "1132:\src\CompilerPasses\Parser.gbas";
						local3_pos_2250 = global8_Compiler.attr11_currentPosi;
						__debugInfo = "1133:\src\CompilerPasses\Parser.gbas";
						local8_Name_Str_2251 = REPLACE_Str(func14_GetCurrent_Str(), "@", "");
						__debugInfo = "1134:\src\CompilerPasses\Parser.gbas";
						func7_GetNext();
						__debugInfo = "1169:\src\CompilerPasses\Parser.gbas";
						if (func7_IsToken(":")) {
							var local3_Scp_2252 = 0;
							__debugInfo = "1136:\src\CompilerPasses\Parser.gbas";
							func5_Match(":", 1135, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "1137:\src\CompilerPasses\Parser.gbas";
							local4_Expr_2249 = func21_CreateLabelExpression(local8_Name_Str_2251);
							__debugInfo = "1138:\src\CompilerPasses\Parser.gbas";
							local3_Scp_2252 = global8_Compiler.attr12_CurrentScope;
							__debugInfo = "1146:\src\CompilerPasses\Parser.gbas";
							do {
								__debugInfo = "1144:\src\CompilerPasses\Parser.gbas";
								var forEachSaver16793 = global5_Exprs_ref[0].arrAccess(local3_Scp_2252).values[tmpPositionCache][0].attr6_Labels;
								for(var forEachCounter16793 = 0 ; forEachCounter16793 < forEachSaver16793.values.length ; forEachCounter16793++) {
									var local3_lbl_2253 = forEachSaver16793.values[forEachCounter16793];
								{
										__debugInfo = "1143:\src\CompilerPasses\Parser.gbas";
										if ((((global5_Exprs_ref[0].arrAccess(local3_lbl_2253).values[tmpPositionCache][0].attr8_Name_Str) === (local8_Name_Str_2251)) ? 1 : 0)) {
											__debugInfo = "1142:\src\CompilerPasses\Parser.gbas";
											func10_ResetError((((("Duplicate label identifier '") + (local8_Name_Str_2251))) + ("'")), local3_pos_2250);
											__debugInfo = "1142:\src\CompilerPasses\Parser.gbas";
										};
										__debugInfo = "1143:\src\CompilerPasses\Parser.gbas";
									}
									forEachSaver16793.values[forEachCounter16793] = local3_lbl_2253;
								
								};
								__debugInfo = "1145:\src\CompilerPasses\Parser.gbas";
								local3_Scp_2252 = global5_Exprs_ref[0].arrAccess(local3_Scp_2252).values[tmpPositionCache][0].attr10_SuperScope;
								__debugInfo = "1144:\src\CompilerPasses\Parser.gbas";
							} while (!(((((((local3_Scp_2252) === (-(1))) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(local3_Scp_2252).values[tmpPositionCache][0].attr6_ScpTyp) === (2)) ? 1 : 0))) ? 1 : 0)));
							__debugInfo = "1148:\src\CompilerPasses\Parser.gbas";
							DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr14_ImportantScope).values[tmpPositionCache][0].attr6_Labels, local4_Expr_2249);
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
								global8_Compiler.attr11_currentPosi = ((local3_pos_2250) - (1));
								__debugInfo = "1157:\src\CompilerPasses\Parser.gbas";
								func7_GetNext();
								__debugInfo = "1160:\src\CompilerPasses\Parser.gbas";
								func14_ImplicitDefine();
								__debugInfo = "1165:\src\CompilerPasses\Parser.gbas";
								if (func12_IsIdentifier(0, 0)) {
									__debugInfo = "1162:\src\CompilerPasses\Parser.gbas";
									local4_Expr_2249 = func10_Identifier(1);
									__debugInfo = "1162:\src\CompilerPasses\Parser.gbas";
								} else {
									__debugInfo = "1164:\src\CompilerPasses\Parser.gbas";
									func5_Error("Internal error (implicit not created)", 1163, "src\CompilerPasses\Parser.gbas");
									__debugInfo = "1164:\src\CompilerPasses\Parser.gbas";
								};
								__debugInfo = "1156:\src\CompilerPasses\Parser.gbas";
							} else {
								__debugInfo = "1167:\src\CompilerPasses\Parser.gbas";
								func10_ResetError("Invalid command (unknown function, variable or keyword).", local3_pos_2250);
								__debugInfo = "1167:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "1153:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "1132:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "1173:\src\CompilerPasses\Parser.gbas";
					if ((((local4_Expr_2249) !== (-(1))) ? 1 : 0)) {
						__debugInfo = "1172:\src\CompilerPasses\Parser.gbas";
						DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local4_Expr_2249);
						__debugInfo = "1172:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "1175:\src\CompilerPasses\Parser.gbas";
					if (local7_OneLine_2247) {
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
		if (((((((local7_OneLine_2247) === (0)) ? 1 : 0)) && ((((local12_CloseStr_Str_ref_2237[0]) === (local13_OCloseStr_Str_2248)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "1185:\src\CompilerPasses\Parser.gbas";
			func5_Match(unref(local12_CloseStr_Str_ref_2237[0]), 1184, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "1185:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "1186:\src\CompilerPasses\Parser.gbas";
		local7_MyScope_2255 = global8_Compiler.attr12_CurrentScope;
		__debugInfo = "1187:\src\CompilerPasses\Parser.gbas";
		global8_Compiler.attr12_CurrentScope = ~~(local8_TmpScope_2243);
		__debugInfo = "1188:\src\CompilerPasses\Parser.gbas";
		global8_Compiler.attr6_inLoop = local7_befLoop_2242;
		__debugInfo = "1192:\src\CompilerPasses\Parser.gbas";
		if (local9_Important_2240) {
			__debugInfo = "1191:\src\CompilerPasses\Parser.gbas";
			global8_Compiler.attr14_ImportantScope = local12_TmpImportant_2244;
			__debugInfo = "1191:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "1194:\src\CompilerPasses\Parser.gbas";
		return tryClone(local7_MyScope_2255);
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
		var local3_tmp_2258 = 0.0;
		__debugInfo = "1198:\src\CompilerPasses\Parser.gbas";
		local3_tmp_2258 = global8_Compiler.attr11_currentPosi;
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
					global8_Compiler.attr11_currentPosi = ~~(local3_tmp_2258);
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
			var local17___SelectHelper26__2262 = 0;
			__debugInfo = "1210:\src\CompilerPasses\Parser.gbas";
			local17___SelectHelper26__2262 = param6_ScpTyp;
			__debugInfo = "1219:\src\CompilerPasses\Parser.gbas";
			if ((((local17___SelectHelper26__2262) === (~~(1))) ? 1 : 0)) {
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
			} else if ((((local17___SelectHelper26__2262) === (~~(6))) ? 1 : 0)) {
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
		var local9_PreferVar_2264 = 0, local4_Expr_ref_2265 = [0], local5_IsAcc_2266 = 0;
		__debugInfo = "1225:\src\CompilerPasses\Parser.gbas";
		local9_PreferVar_2264 = 0;
		__debugInfo = "1226:\src\CompilerPasses\Parser.gbas";
		if ((((func7_IsToken("LOCAL")) && ((((param9_IsCommand) === (0)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "1226:\src\CompilerPasses\Parser.gbas";
			local9_PreferVar_2264 = 1;
			__debugInfo = "1226:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "1227:\src\CompilerPasses\Parser.gbas";
		if ((((func7_IsToken("GLOBAL")) && ((((param9_IsCommand) === (0)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "1227:\src\CompilerPasses\Parser.gbas";
			local9_PreferVar_2264 = -(1);
			__debugInfo = "1227:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "1230:\src\CompilerPasses\Parser.gbas";
		if ((((local9_PreferVar_2264) !== (0)) ? 1 : 0)) {
			__debugInfo = "1230:\src\CompilerPasses\Parser.gbas";
			func7_GetNext();
			__debugInfo = "1230:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "1232:\src\CompilerPasses\Parser.gbas";
		local4_Expr_ref_2265[0] = -(1);
		__debugInfo = "1233:\src\CompilerPasses\Parser.gbas";
		local5_IsAcc_2266 = 0;
		__debugInfo = "1248:\src\CompilerPasses\Parser.gbas";
		if (func7_IsToken("super")) {
			__debugInfo = "1235:\src\CompilerPasses\Parser.gbas";
			func5_Match("super", 1234, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "1247:\src\CompilerPasses\Parser.gbas";
			if (((((((global8_Compiler.attr11_currentFunc) !== (-(1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType) !== (-(1))) ? 1 : 0))) ? 1 : 0)) {
				var local3_typ_2267 = 0;
				__debugInfo = "1236:\src\CompilerPasses\Parser.gbas";
				local3_typ_2267 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType;
				__debugInfo = "1244:\src\CompilerPasses\Parser.gbas";
				if ((((global8_Compiler.attr5_Types_ref[0].arrAccess(local3_typ_2267).values[tmpPositionCache][0].attr9_Extending) !== (-(1))) ? 1 : 0)) {
					__debugInfo = "1239:\src\CompilerPasses\Parser.gbas";
					local4_Expr_ref_2265[0] = func21_CreateSuperExpression(global8_Compiler.attr5_Types_ref[0].arrAccess(local3_typ_2267).values[tmpPositionCache][0].attr9_Extending);
					__debugInfo = "1240:\src\CompilerPasses\Parser.gbas";
					func5_Match(".", 1239, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1241:\src\CompilerPasses\Parser.gbas";
					local5_IsAcc_2266 = 1;
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
			var local4_posi_2268 = 0.0, local7_typ_Str_2269 = "";
			__debugInfo = "1251:\src\CompilerPasses\Parser.gbas";
			local4_posi_2268 = global8_Compiler.attr11_currentPosi;
			__debugInfo = "1252:\src\CompilerPasses\Parser.gbas";
			local7_typ_Str_2269 = func14_GetCurrent_Str();
			__debugInfo = "1253:\src\CompilerPasses\Parser.gbas";
			func7_GetNext();
			__debugInfo = "1272:\src\CompilerPasses\Parser.gbas";
			if (func7_IsToken("(")) {
				__debugInfo = "1255:\src\CompilerPasses\Parser.gbas";
				func5_Match("(", 1254, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1256:\src\CompilerPasses\Parser.gbas";
				local4_Expr_ref_2265[0] = func10_Expression(0);
				__debugInfo = "1257:\src\CompilerPasses\Parser.gbas";
				func5_Match(")", 1256, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1268:\src\CompilerPasses\Parser.gbas";
				if ((((func6_IsType(global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2265[0]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str)) && ((((global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2265[0]).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0))) ? 1 : 0)) {
					__debugInfo = "1259:\src\CompilerPasses\Parser.gbas";
					local4_Expr_ref_2265[0] = func14_CreateCast2Obj(local7_typ_Str_2269, unref(local4_Expr_ref_2265[0]));
					__debugInfo = "1265:\src\CompilerPasses\Parser.gbas";
					if (func7_IsToken(".")) {
						__debugInfo = "1261:\src\CompilerPasses\Parser.gbas";
						func5_Match(".", 1260, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "1262:\src\CompilerPasses\Parser.gbas";
						local5_IsAcc_2266 = 1;
						__debugInfo = "1261:\src\CompilerPasses\Parser.gbas";
					} else {
						__debugInfo = "1264:\src\CompilerPasses\Parser.gbas";
						return tryClone(unref(local4_Expr_ref_2265[0]));
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
				global8_Compiler.attr11_currentPosi = ~~(local4_posi_2268);
				__debugInfo = "1271:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "1251:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "1441:\src\CompilerPasses\Parser.gbas";
		do {
			var local8_Name_Str_2270 = "", local9_SuperExpr_ref_2271 = [0], local5_Varis_2272 = pool_array.alloc(0), local5_Found_2273 = 0;
			__debugInfo = "1276:\src\CompilerPasses\Parser.gbas";
			local8_Name_Str_2270 = func17_CleanVariable_Str(func14_GetCurrent_Str());
			__debugInfo = "1277:\src\CompilerPasses\Parser.gbas";
			func7_GetNext();
			__debugInfo = "1281:\src\CompilerPasses\Parser.gbas";
			if ((((func7_IsToken("%")) || (func7_IsToken("%"))) ? 1 : 0)) {
				__debugInfo = "1280:\src\CompilerPasses\Parser.gbas";
				func7_GetNext();
				__debugInfo = "1280:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "1283:\src\CompilerPasses\Parser.gbas";
			local9_SuperExpr_ref_2271[0] = local4_Expr_ref_2265[0];
			__debugInfo = "1294:\src\CompilerPasses\Parser.gbas";
			if ((((local4_Expr_ref_2265[0]) === (-(1))) ? 1 : 0)) {
				__debugInfo = "1288:\src\CompilerPasses\Parser.gbas";
				func8_GetVaris(unref(local5_Varis_2272), -(1), local9_PreferVar_2264);
				__debugInfo = "1289:\src\CompilerPasses\Parser.gbas";
				local9_PreferVar_2264 = 0;
				__debugInfo = "1288:\src\CompilerPasses\Parser.gbas";
			} else {
				__debugInfo = "1292:\src\CompilerPasses\Parser.gbas";
				if ((((func6_IsType(global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2265[0]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str)) === (0)) ? 1 : 0)) {
					__debugInfo = "1292:\src\CompilerPasses\Parser.gbas";
					func5_Error((((("Expecting type, got primitive datatype '") + (global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2265[0]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str))) + ("'")), 1291, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1292:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1293:\src\CompilerPasses\Parser.gbas";
				local5_Varis_2272 = global8_LastType.attr10_Attributes.clone(/* In Assign */);
				__debugInfo = "1292:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "1296:\src\CompilerPasses\Parser.gbas";
			local5_Found_2273 = 0;
			__debugInfo = "1328:\src\CompilerPasses\Parser.gbas";
			var forEachSaver17533 = local5_Varis_2272;
			for(var forEachCounter17533 = 0 ; forEachCounter17533 < forEachSaver17533.values.length ; forEachCounter17533++) {
				var local4_Vari_2274 = forEachSaver17533.values[forEachCounter17533];
			{
					__debugInfo = "1327:\src\CompilerPasses\Parser.gbas";
					if ((((local8_Name_Str_2270) === (global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Vari_2274).values[tmpPositionCache][0].attr8_Name_Str)) ? 1 : 0)) {
						__debugInfo = "1323:\src\CompilerPasses\Parser.gbas";
						if ((((((((((global8_Compiler.attr11_currentFunc) !== (-(1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType) !== (-(1))) ? 1 : 0))) ? 1 : 0)) && ((((local4_Expr_ref_2265[0]) === (-(1))) ? 1 : 0))) ? 1 : 0)) {
							var local13_IsNotImplicit_2275 = 0;
							__debugInfo = "1303:\src\CompilerPasses\Parser.gbas";
							local13_IsNotImplicit_2275 = 0;
							__debugInfo = "1309:\src\CompilerPasses\Parser.gbas";
							var forEachSaver17474 = local5_Varis_2272;
							for(var forEachCounter17474 = 0 ; forEachCounter17474 < forEachSaver17474.values.length ; forEachCounter17474++) {
								var local9_OtherVari_2276 = forEachSaver17474.values[forEachCounter17474];
							{
									__debugInfo = "1308:\src\CompilerPasses\Parser.gbas";
									if ((((((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local9_OtherVari_2276).values[tmpPositionCache][0].attr8_Name_Str) === (local8_Name_Str_2270)) ? 1 : 0)) && ((((((((((((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local9_OtherVari_2276).values[tmpPositionCache][0].attr3_Typ) === (1)) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local9_OtherVari_2276).values[tmpPositionCache][0].attr3_Typ) === (5)) ? 1 : 0))) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local9_OtherVari_2276).values[tmpPositionCache][0].attr3_Typ) === (4)) ? 1 : 0))) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local9_OtherVari_2276).values[tmpPositionCache][0].attr3_Typ) === (7)) ? 1 : 0))) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local9_OtherVari_2276).values[tmpPositionCache][0].attr3_Typ) === (6)) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) && ((((local9_OtherVari_2276) !== (local4_Vari_2274)) ? 1 : 0))) ? 1 : 0)) {
										__debugInfo = "1306:\src\CompilerPasses\Parser.gbas";
										local13_IsNotImplicit_2275 = 1;
										__debugInfo = "1307:\src\CompilerPasses\Parser.gbas";
										break;
										__debugInfo = "1306:\src\CompilerPasses\Parser.gbas";
									};
									__debugInfo = "1308:\src\CompilerPasses\Parser.gbas";
								}
								forEachSaver17474.values[forEachCounter17474] = local9_OtherVari_2276;
							
							};
							__debugInfo = "1322:\src\CompilerPasses\Parser.gbas";
							if (((local13_IsNotImplicit_2275) ? 0 : 1)) {
								var alias3_Typ_ref_2277 = [pool_TIdentifierType.alloc()];
								__debugInfo = "1312:\src\CompilerPasses\Parser.gbas";
								alias3_Typ_ref_2277 = global8_Compiler.attr5_Types_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType).values[tmpPositionCache] /* ALIAS */;
								__debugInfo = "1319:\src\CompilerPasses\Parser.gbas";
								var forEachSaver17519 = alias3_Typ_ref_2277[0].attr10_Attributes;
								for(var forEachCounter17519 = 0 ; forEachCounter17519 < forEachSaver17519.values.length ; forEachCounter17519++) {
									var local1_A_2278 = forEachSaver17519.values[forEachCounter17519];
								{
										__debugInfo = "1318:\src\CompilerPasses\Parser.gbas";
										if ((((local4_Vari_2274) === (local1_A_2278)) ? 1 : 0)) {
											__debugInfo = "1316:\src\CompilerPasses\Parser.gbas";
											local9_SuperExpr_ref_2271[0] = func24_CreateVariableExpression(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr7_SelfVar);
											__debugInfo = "1317:\src\CompilerPasses\Parser.gbas";
											break;
											__debugInfo = "1316:\src\CompilerPasses\Parser.gbas";
										};
										__debugInfo = "1318:\src\CompilerPasses\Parser.gbas";
									}
									forEachSaver17519.values[forEachCounter17519] = local1_A_2278;
								
								};
								__debugInfo = "1312:\src\CompilerPasses\Parser.gbas";pool_TIdentifierType.free(alias3_Typ_ref_2277);
							} else {
								__debugInfo = "1321:\src\CompilerPasses\Parser.gbas";
								continue;
								__debugInfo = "1321:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "1303:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "1324:\src\CompilerPasses\Parser.gbas";
						local4_Expr_ref_2265[0] = func24_CreateVariableExpression(local4_Vari_2274);
						__debugInfo = "1325:\src\CompilerPasses\Parser.gbas";
						local5_Found_2273 = 1;
						__debugInfo = "1326:\src\CompilerPasses\Parser.gbas";
						break;
						__debugInfo = "1323:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "1327:\src\CompilerPasses\Parser.gbas";
				}
				forEachSaver17533.values[forEachCounter17533] = local4_Vari_2274;
			
			};
			__debugInfo = "1337:\src\CompilerPasses\Parser.gbas";
			while ((((func7_IsToken("(")) && (local5_Found_2273)) ? 1 : 0)) {
				var local4_func_2279 = 0;
				__debugInfo = "1330:\src\CompilerPasses\Parser.gbas";
				local4_func_2279 = func14_SearchPrototyp(global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2265[0]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str);
				__debugInfo = "1336:\src\CompilerPasses\Parser.gbas";
				if ((((local4_func_2279) !== (-(1))) ? 1 : 0)) {
					var local6_Params_2280 = pool_array.alloc(0);
					__debugInfo = "1333:\src\CompilerPasses\Parser.gbas";
					func13_ParseFuncCall(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local4_func_2279).values[tmpPositionCache][0].attr8_datatype, unref(local6_Params_2280), param9_IsCommand);
					__debugInfo = "1335:\src\CompilerPasses\Parser.gbas";
					local4_Expr_ref_2265[0] = func25_CreateProtoCallExpression(unref(local4_Expr_ref_2265[0]), unref(local6_Params_2280));
					__debugInfo = "1333:\src\CompilerPasses\Parser.gbas";pool_array.free(local6_Params_2280);
				};
				__debugInfo = "1330:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "1410:\src\CompilerPasses\Parser.gbas";
			if ((((local5_Found_2273) === (0)) ? 1 : 0)) {
				__debugInfo = "1384:\src\CompilerPasses\Parser.gbas";
				if ((((local4_Expr_ref_2265[0]) !== (-(1))) ? 1 : 0)) {
					var local5_typId_2281 = 0;
					__debugInfo = "1340:\src\CompilerPasses\Parser.gbas";
					func6_IsType(global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2265[0]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str);
					__debugInfo = "1341:\src\CompilerPasses\Parser.gbas";
					if (global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2265[0]).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) {
						__debugInfo = "1341:\src\CompilerPasses\Parser.gbas";
						func5_Error("Cannot access to array.", 1340, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "1341:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "1343:\src\CompilerPasses\Parser.gbas";
					local5_typId_2281 = global8_LastType.attr2_ID;
					__debugInfo = "1357:\src\CompilerPasses\Parser.gbas";
					while ((((local5_typId_2281) !== (-(1))) ? 1 : 0)) {
						__debugInfo = "1354:\src\CompilerPasses\Parser.gbas";
						var forEachSaver17676 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_2281).values[tmpPositionCache][0].attr7_Methods;
						for(var forEachCounter17676 = 0 ; forEachCounter17676 < forEachSaver17676.values.length ; forEachCounter17676++) {
							var local1_M_2282 = forEachSaver17676.values[forEachCounter17676];
						{
								__debugInfo = "1353:\src\CompilerPasses\Parser.gbas";
								if ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local1_M_2282).values[tmpPositionCache][0].attr8_Name_Str) === (local8_Name_Str_2270)) ? 1 : 0)) {
									__debugInfo = "1351:\src\CompilerPasses\Parser.gbas";
									if (((local5_Found_2273) ? 0 : 1)) {
										var local1_a_2283 = 0;
										__debugInfo = "1349:\src\CompilerPasses\Parser.gbas";
										local1_a_2283 = func19_ParseIdentifierFunc(local4_Expr_ref_2265, local9_SuperExpr_ref_2271, param9_IsCommand, local8_Name_Str_2270, local1_M_2282);
										__debugInfo = "1350:\src\CompilerPasses\Parser.gbas";
										if ((((local1_a_2283) !== (-(1))) ? 1 : 0)) {
											__debugInfo = "1350:\src\CompilerPasses\Parser.gbas";
											return tryClone(local1_a_2283);
											__debugInfo = "1350:\src\CompilerPasses\Parser.gbas";
										};
										__debugInfo = "1349:\src\CompilerPasses\Parser.gbas";
									};
									__debugInfo = "1352:\src\CompilerPasses\Parser.gbas";
									local5_Found_2273 = 1;
									__debugInfo = "1351:\src\CompilerPasses\Parser.gbas";
								};
								__debugInfo = "1353:\src\CompilerPasses\Parser.gbas";
							}
							forEachSaver17676.values[forEachCounter17676] = local1_M_2282;
						
						};
						__debugInfo = "1356:\src\CompilerPasses\Parser.gbas";
						local5_typId_2281 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_2281).values[tmpPositionCache][0].attr9_Extending;
						__debugInfo = "1354:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "1340:\src\CompilerPasses\Parser.gbas";
				} else {
					var local3_Val_ref_2284 = [0];
					__debugInfo = "1383:\src\CompilerPasses\Parser.gbas";
					if ((global8_Compiler.attr11_GlobalFuncs).GetValue(local8_Name_Str_2270, local3_Val_ref_2284)) {
						var local1_a_2285 = 0;
						__debugInfo = "1362:\src\CompilerPasses\Parser.gbas";
						local1_a_2285 = func19_ParseIdentifierFunc(local4_Expr_ref_2265, local9_SuperExpr_ref_2271, param9_IsCommand, local8_Name_Str_2270, unref(local3_Val_ref_2284[0]));
						__debugInfo = "1363:\src\CompilerPasses\Parser.gbas";
						if ((((local1_a_2285) !== (-(1))) ? 1 : 0)) {
							__debugInfo = "1363:\src\CompilerPasses\Parser.gbas";
							return tryClone(local1_a_2285);
							__debugInfo = "1363:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "1364:\src\CompilerPasses\Parser.gbas";
						local5_Found_2273 = 1;
						__debugInfo = "1362:\src\CompilerPasses\Parser.gbas";
					} else if (((((((global8_Compiler.attr11_currentFunc) !== (-(1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType) !== (-(1))) ? 1 : 0))) ? 1 : 0)) {
						var alias3_Typ_ref_2286 = [pool_TIdentifierType.alloc()], local5_typId_2287 = 0;
						__debugInfo = "1367:\src\CompilerPasses\Parser.gbas";
						alias3_Typ_ref_2286 = global8_Compiler.attr5_Types_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType).values[tmpPositionCache] /* ALIAS */;
						__debugInfo = "1368:\src\CompilerPasses\Parser.gbas";
						local5_typId_2287 = alias3_Typ_ref_2286[0].attr2_ID;
						__debugInfo = "1382:\src\CompilerPasses\Parser.gbas";
						while ((((local5_typId_2287) !== (-(1))) ? 1 : 0)) {
							__debugInfo = "1379:\src\CompilerPasses\Parser.gbas";
							var forEachSaver17819 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_2287).values[tmpPositionCache][0].attr7_Methods;
							for(var forEachCounter17819 = 0 ; forEachCounter17819 < forEachSaver17819.values.length ; forEachCounter17819++) {
								var local1_M_2288 = forEachSaver17819.values[forEachCounter17819];
							{
									__debugInfo = "1378:\src\CompilerPasses\Parser.gbas";
									if ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local1_M_2288).values[tmpPositionCache][0].attr8_Name_Str) === (local8_Name_Str_2270)) ? 1 : 0)) {
										__debugInfo = "1375:\src\CompilerPasses\Parser.gbas";
										if (((local5_Found_2273) ? 0 : 1)) {
											var local1_a_2289 = 0;
											__debugInfo = "1373:\src\CompilerPasses\Parser.gbas";
											local1_a_2289 = func19_ParseIdentifierFunc(local4_Expr_ref_2265, local9_SuperExpr_ref_2271, param9_IsCommand, local8_Name_Str_2270, local1_M_2288);
											__debugInfo = "1374:\src\CompilerPasses\Parser.gbas";
											if ((((local1_a_2289) !== (-(1))) ? 1 : 0)) {
												__debugInfo = "1374:\src\CompilerPasses\Parser.gbas";
												return tryClone(local1_a_2289);
												__debugInfo = "1374:\src\CompilerPasses\Parser.gbas";
											};
											__debugInfo = "1373:\src\CompilerPasses\Parser.gbas";
										};
										__debugInfo = "1377:\src\CompilerPasses\Parser.gbas";
										local5_Found_2273 = 1;
										__debugInfo = "1375:\src\CompilerPasses\Parser.gbas";
									};
									__debugInfo = "1378:\src\CompilerPasses\Parser.gbas";
								}
								forEachSaver17819.values[forEachCounter17819] = local1_M_2288;
							
							};
							__debugInfo = "1381:\src\CompilerPasses\Parser.gbas";
							local5_typId_2287 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_2287).values[tmpPositionCache][0].attr9_Extending;
							__debugInfo = "1379:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "1367:\src\CompilerPasses\Parser.gbas";pool_TIdentifierType.free(alias3_Typ_ref_2286);
					};
					__debugInfo = "1383:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1394:\src\CompilerPasses\Parser.gbas";
				while ((((func7_IsToken("(")) && (local5_Found_2273)) ? 1 : 0)) {
					var local4_func_2290 = 0;
					__debugInfo = "1387:\src\CompilerPasses\Parser.gbas";
					local4_func_2290 = func14_SearchPrototyp(global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2265[0]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str);
					__debugInfo = "1393:\src\CompilerPasses\Parser.gbas";
					if ((((local4_func_2290) !== (-(1))) ? 1 : 0)) {
						var local6_Params_2291 = pool_array.alloc(0);
						__debugInfo = "1390:\src\CompilerPasses\Parser.gbas";
						func13_ParseFuncCall(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local4_func_2290).values[tmpPositionCache][0].attr8_datatype, unref(local6_Params_2291), param9_IsCommand);
						__debugInfo = "1392:\src\CompilerPasses\Parser.gbas";
						local4_Expr_ref_2265[0] = func25_CreateProtoCallExpression(unref(local4_Expr_ref_2265[0]), unref(local6_Params_2291));
						__debugInfo = "1390:\src\CompilerPasses\Parser.gbas";pool_array.free(local6_Params_2291);
					};
					__debugInfo = "1387:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1409:\src\CompilerPasses\Parser.gbas";
				if ((((local5_Found_2273) === (0)) ? 1 : 0)) {
					__debugInfo = "1408:\src\CompilerPasses\Parser.gbas";
					if ((((local4_Expr_ref_2265[0]) !== (-(1))) ? 1 : 0)) {
						var local8_Atts_Str_2292 = "";
						__debugInfo = "1398:\src\CompilerPasses\Parser.gbas";
						local8_Atts_Str_2292 = "";
						__debugInfo = "1403:\src\CompilerPasses\Parser.gbas";
						var forEachSaver17923 = local5_Varis_2272;
						for(var forEachCounter17923 = 0 ; forEachCounter17923 < forEachSaver17923.values.length ; forEachCounter17923++) {
							var local4_Vari_2293 = forEachSaver17923.values[forEachCounter17923];
						{
								__debugInfo = "1402:\src\CompilerPasses\Parser.gbas";
								if ((((local8_Name_Str_2270) === (global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Vari_2293).values[tmpPositionCache][0].attr8_Name_Str)) ? 1 : 0)) {
									__debugInfo = "1401:\src\CompilerPasses\Parser.gbas";
									local8_Atts_Str_2292 = ((((local8_Atts_Str_2292) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Vari_2293).values[tmpPositionCache][0].attr8_Name_Str))) + (", "));
									__debugInfo = "1401:\src\CompilerPasses\Parser.gbas";
								};
								__debugInfo = "1402:\src\CompilerPasses\Parser.gbas";
							}
							forEachSaver17923.values[forEachCounter17923] = local4_Vari_2293;
						
						};
						__debugInfo = "1404:\src\CompilerPasses\Parser.gbas";
						func6_IsType(global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2265[0]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str);
						__debugInfo = "1405:\src\CompilerPasses\Parser.gbas";
						func5_Error((((((((((((("Cannot find attribute '") + (local8_Name_Str_2270))) + ("' in type '"))) + (global8_LastType.attr8_Name_Str))) + ("' possible attributes '"))) + (local8_Atts_Str_2292))) + ("'")), 1404, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "1398:\src\CompilerPasses\Parser.gbas";
					} else {
						__debugInfo = "1407:\src\CompilerPasses\Parser.gbas";
						func5_Error((((("Internal error ") + (local8_Name_Str_2270))) + (" (expected identifier).")), 1406, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "1407:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "1408:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1384:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "1430:\src\CompilerPasses\Parser.gbas";
			if (func7_IsToken("[")) {
				var local4_Dims_2294 = pool_array.alloc(0);
				__debugInfo = "1417:\src\CompilerPasses\Parser.gbas";
				if ((((global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2265[0]).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0)) {
					__debugInfo = "1416:\src\CompilerPasses\Parser.gbas";
					func5_Error("Array access, but this identifier is no array", 1415, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1416:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1427:\src\CompilerPasses\Parser.gbas";
				while (func7_IsToken("[")) {
					var local7_dimExpr_2295 = 0;
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
					local7_dimExpr_2295 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 1423, 0);
					__debugInfo = "1425:\src\CompilerPasses\Parser.gbas";
					func5_Match("]", 1424, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1426:\src\CompilerPasses\Parser.gbas";
					DIMPUSH(local4_Dims_2294, local7_dimExpr_2295);
					__debugInfo = "1419:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1429:\src\CompilerPasses\Parser.gbas";
				local4_Expr_ref_2265[0] = func21_CreateArrayExpression(unref(local4_Expr_ref_2265[0]), unref(local4_Dims_2294));
				__debugInfo = "1417:\src\CompilerPasses\Parser.gbas";pool_array.free(local4_Dims_2294);
			};
			__debugInfo = "1432:\src\CompilerPasses\Parser.gbas";
			local4_Expr_ref_2265[0] = func22_CreateAccessExpression(unref(local9_SuperExpr_ref_2271[0]), unref(local4_Expr_ref_2265[0]));
			__debugInfo = "1440:\src\CompilerPasses\Parser.gbas";
			if (func7_IsToken(".")) {
				__debugInfo = "1436:\src\CompilerPasses\Parser.gbas";
				func5_Match(".", 1435, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1437:\src\CompilerPasses\Parser.gbas";
				local5_IsAcc_2266 = 1;
				__debugInfo = "1436:\src\CompilerPasses\Parser.gbas";
			} else {
				__debugInfo = "1439:\src\CompilerPasses\Parser.gbas";
				local5_IsAcc_2266 = 0;
				__debugInfo = "1439:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "1276:\src\CompilerPasses\Parser.gbas";pool_array.free(local5_Varis_2272);
		} while (!((((local5_IsAcc_2266) === (0)) ? 1 : 0)));
		__debugInfo = "1454:\src\CompilerPasses\Parser.gbas";
		if (((((((func7_IsToken("=")) && ((((local4_Expr_ref_2265[0]) !== (-(1))) ? 1 : 0))) ? 1 : 0)) && (param9_IsCommand)) ? 1 : 0)) {
			var local7_tmpData_2296 = pool_TDatatype.alloc();
			__debugInfo = "1445:\src\CompilerPasses\Parser.gbas";
			if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(unref(local4_Expr_ref_2265[0]), 1)).values[tmpPositionCache][0].attr3_Typ) === (6)) ? 1 : 0)) {
				__debugInfo = "1445:\src\CompilerPasses\Parser.gbas";
				func5_Error("Assignment invalid, because of CONSTANT variable.", 1444, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1445:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "1447:\src\CompilerPasses\Parser.gbas";
			if (((((((global5_Exprs_ref[0].arrAccess(func12_GetRightExpr(unref(local4_Expr_ref_2265[0]))).values[tmpPositionCache][0].attr3_Typ) === (6)) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(func12_GetRightExpr(unref(local4_Expr_ref_2265[0]))).values[tmpPositionCache][0].attr3_Typ) === (23)) ? 1 : 0))) ? 1 : 0)) {
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
			local7_tmpData_2296 = global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2265[0]).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
			__debugInfo = "1453:\src\CompilerPasses\Parser.gbas";
			return tryClone(func22_CreateAssignExpression(unref(local4_Expr_ref_2265[0]), func14_EnsureDatatype(func10_Expression(0), local7_tmpData_2296, 1452, 0)));
			__debugInfo = "1445:\src\CompilerPasses\Parser.gbas";pool_TDatatype.free(local7_tmpData_2296);
		};
		__debugInfo = "1460:\src\CompilerPasses\Parser.gbas";
		if ((((local4_Expr_ref_2265[0]) !== (-(1))) ? 1 : 0)) {
			__debugInfo = "1457:\src\CompilerPasses\Parser.gbas";
			return tryClone(unref(local4_Expr_ref_2265[0]));
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
			var local3_typ_2302 = 0;
			__debugInfo = "1471:\src\CompilerPasses\Parser.gbas";
			local3_typ_2302 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType;
			__debugInfo = "1481:\src\CompilerPasses\Parser.gbas";
			while ((((local3_typ_2302) !== (-(1))) ? 1 : 0)) {
				__debugInfo = "1478:\src\CompilerPasses\Parser.gbas";
				if (((((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr6_MyType) === (local3_typ_2302)) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr6_MyType) !== (-(1))) ? 1 : 0))) ? 1 : 0)) {
					__debugInfo = "1475:\src\CompilerPasses\Parser.gbas";
					param9_SuperExpr_ref[0] = func24_CreateVariableExpression(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr7_SelfVar);
					__debugInfo = "1477:\src\CompilerPasses\Parser.gbas";
					break;
					__debugInfo = "1475:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1480:\src\CompilerPasses\Parser.gbas";
				local3_typ_2302 = global8_Compiler.attr5_Types_ref[0].arrAccess(local3_typ_2302).values[tmpPositionCache][0].attr9_Extending;
				__debugInfo = "1478:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "1471:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "1484:\src\CompilerPasses\Parser.gbas";
		global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr10_PlzCompile = 1;
		__debugInfo = "1501:\src\CompilerPasses\Parser.gbas";
		if (((((((func7_IsToken("(")) === (0)) ? 1 : 0)) && ((((param9_IsCommand) === (0)) ? 1 : 0))) ? 1 : 0)) {
			var local8_datatype_2303 = pool_TDatatype.alloc();
			__debugInfo = "1489:\src\CompilerPasses\Parser.gbas";
			local8_datatype_2303.attr8_Name_Str = param8_Name_Str;
			__debugInfo = "1490:\src\CompilerPasses\Parser.gbas";
			local8_datatype_2303.attr7_IsArray = 0;
			__debugInfo = "1493:\src\CompilerPasses\Parser.gbas";
			global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr15_UsedAsPrototype = 1;
			__debugInfo = "1495:\src\CompilerPasses\Parser.gbas";
			return tryClone(func24_CreateFuncDataExpression(local8_datatype_2303));
			__debugInfo = "1489:\src\CompilerPasses\Parser.gbas";pool_TDatatype.free(local8_datatype_2303);
		} else {
			var local6_Params_2304 = pool_array.alloc(0);
			__debugInfo = "1498:\src\CompilerPasses\Parser.gbas";
			func13_ParseFuncCall(global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr8_datatype, unref(local6_Params_2304), param9_IsCommand);
			__debugInfo = "1500:\src\CompilerPasses\Parser.gbas";
			param4_Expr_ref[0] = func24_CreateFuncCallExpression(global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr2_ID, unref(local6_Params_2304));
			__debugInfo = "1498:\src\CompilerPasses\Parser.gbas";pool_array.free(local6_Params_2304);
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
		var local9_OpBracket_2308 = 0, local4_Find_2309 = 0.0, local12_CloseBracket_2310 = 0;
		__debugInfo = "1506:\src\CompilerPasses\Parser.gbas";
		local9_OpBracket_2308 = func7_IsToken("(");
		__debugInfo = "1519:\src\CompilerPasses\Parser.gbas";
		if ((((param8_datatype.attr8_Name_Str) === ("void")) ? 1 : 0)) {
			__debugInfo = "1510:\src\CompilerPasses\Parser.gbas";
			if (((param9_IsCommand) ? 0 : 1)) {
				__debugInfo = "1509:\src\CompilerPasses\Parser.gbas";
				func5_Error("Void function has to be a command!", 1508, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1509:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "1511:\src\CompilerPasses\Parser.gbas";
			local9_OpBracket_2308 = 0;
			__debugInfo = "1510:\src\CompilerPasses\Parser.gbas";
		} else {
			__debugInfo = "1516:\src\CompilerPasses\Parser.gbas";
			if (local9_OpBracket_2308) {
				__debugInfo = "1516:\src\CompilerPasses\Parser.gbas";
				func5_Match("(", 1515, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1516:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "1516:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "1522:\src\CompilerPasses\Parser.gbas";
		local4_Find_2309 = 0;
		__debugInfo = "1527:\src\CompilerPasses\Parser.gbas";
		while (((((((func7_IsToken("\n")) === (0)) ? 1 : 0)) && ((((func7_IsToken(")")) === (0)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "1524:\src\CompilerPasses\Parser.gbas";
			if (local4_Find_2309) {
				__debugInfo = "1524:\src\CompilerPasses\Parser.gbas";
				func5_Match(",", 1523, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1524:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "1525:\src\CompilerPasses\Parser.gbas";
			DIMPUSH(param6_Params, func10_Expression(0));
			__debugInfo = "1526:\src\CompilerPasses\Parser.gbas";
			local4_Find_2309 = 1;
			__debugInfo = "1524:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "1529:\src\CompilerPasses\Parser.gbas";
		local12_CloseBracket_2310 = func7_IsToken(")");
		__debugInfo = "1530:\src\CompilerPasses\Parser.gbas";
		if (local12_CloseBracket_2310) {
			__debugInfo = "1530:\src\CompilerPasses\Parser.gbas";
			func5_Match(")", 1529, "src\CompilerPasses\Parser.gbas");
			__debugInfo = "1530:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "1534:\src\CompilerPasses\Parser.gbas";
		if ((((local12_CloseBracket_2310) !== (local9_OpBracket_2308)) ? 1 : 0)) {
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
			var local17___SelectHelper27__2311 = 0;
			__debugInfo = "1540:\src\CompilerPasses\Parser.gbas";
			local17___SelectHelper27__2311 = 1;
			__debugInfo = "2238:\src\CompilerPasses\Parser.gbas";
			if ((((local17___SelectHelper27__2311) === (func7_IsToken("CALLBACK"))) ? 1 : 0)) {
				__debugInfo = "1542:\src\CompilerPasses\Parser.gbas";
				func5_Match("CALLBACK", 1541, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1543:\src\CompilerPasses\Parser.gbas";
				func7_Keyword();
				__debugInfo = "1542:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2311) === (func7_IsToken("NATIVE"))) ? 1 : 0)) {
				__debugInfo = "1545:\src\CompilerPasses\Parser.gbas";
				func5_Match("NATIVE", 1544, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1546:\src\CompilerPasses\Parser.gbas";
				func10_SkipTokens("NATIVE", "\n", "");
				__debugInfo = "1545:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2311) === (func7_IsToken("ABSTRACT"))) ? 1 : 0)) {
				__debugInfo = "1548:\src\CompilerPasses\Parser.gbas";
				func5_Match("ABSTRACT", 1547, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1549:\src\CompilerPasses\Parser.gbas";
				func10_SkipTokens("ABSTRACT", "\n", "");
				__debugInfo = "1548:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2311) === (func7_IsToken("FUNCTION"))) ? 1 : 0)) {
				__debugInfo = "1551:\src\CompilerPasses\Parser.gbas";
				func10_SkipTokens("FUNCTION", "ENDFUNCTION", "");
				__debugInfo = "1551:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2311) === (func7_IsToken("SUB"))) ? 1 : 0)) {
				__debugInfo = "1553:\src\CompilerPasses\Parser.gbas";
				func10_SkipTokens("SUB", "ENDSUB", "");
				__debugInfo = "1553:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2311) === (func7_IsToken("TYPE"))) ? 1 : 0)) {
				__debugInfo = "1555:\src\CompilerPasses\Parser.gbas";
				func10_SkipTokens("TYPE", "ENDTYPE", "");
				__debugInfo = "1555:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2311) === (func7_IsToken("PROTOTYPE"))) ? 1 : 0)) {
				__debugInfo = "1557:\src\CompilerPasses\Parser.gbas";
				func10_SkipTokens("PROTOTYPE", "\n", "");
				__debugInfo = "1557:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2311) === (func7_IsToken("CONSTANT"))) ? 1 : 0)) {
				__debugInfo = "1559:\src\CompilerPasses\Parser.gbas";
				func10_SkipTokens("CONSTANT", "\n", "");
				__debugInfo = "1559:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2311) === (func7_IsToken("GLOBAL"))) ? 1 : 0)) {
				__debugInfo = "1578:\src\CompilerPasses\Parser.gbas";
				do {
					var local7_tmpVari_2312 = pool_TIdentifierVari.alloc();
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
					local7_tmpVari_2312 = func7_VariDef(0).clone(/* In Assign */);
					__debugInfo = "1577:\src\CompilerPasses\Parser.gbas";
					var forEachSaver18607 = global8_Compiler.attr7_Globals;
					for(var forEachCounter18607 = 0 ; forEachCounter18607 < forEachSaver18607.values.length ; forEachCounter18607++) {
						var local1_V_2313 = forEachSaver18607.values[forEachCounter18607];
					{
							var alias4_Vari_ref_2314 = [pool_TIdentifierVari.alloc()];
							__debugInfo = "1570:\src\CompilerPasses\Parser.gbas";
							alias4_Vari_ref_2314 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_V_2313).values[tmpPositionCache] /* ALIAS */;
							__debugInfo = "1576:\src\CompilerPasses\Parser.gbas";
							if (((((((alias4_Vari_ref_2314[0].attr8_Name_Str) === (local7_tmpVari_2312.attr8_Name_Str)) ? 1 : 0)) && ((((alias4_Vari_ref_2314[0].attr6_PreDef) !== (-(1))) ? 1 : 0))) ? 1 : 0)) {
								var local7_tmpExpr_2315 = 0;
								__debugInfo = "1572:\src\CompilerPasses\Parser.gbas";
								if ((((global8_Compiler.attr12_CurrentScope) === (-(1))) ? 1 : 0)) {
									__debugInfo = "1572:\src\CompilerPasses\Parser.gbas";
									func5_Error("Internal error (GLOBAL in -1 scope)", 1571, "src\CompilerPasses\Parser.gbas");
									__debugInfo = "1572:\src\CompilerPasses\Parser.gbas";
								};
								__debugInfo = "1573:\src\CompilerPasses\Parser.gbas";
								local7_tmpExpr_2315 = func22_CreateAssignExpression(func24_CreateVariableExpression(alias4_Vari_ref_2314[0].attr2_ID), alias4_Vari_ref_2314[0].attr6_PreDef);
								__debugInfo = "1574:\src\CompilerPasses\Parser.gbas";
								DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local7_tmpExpr_2315);
								__debugInfo = "1575:\src\CompilerPasses\Parser.gbas";
								alias4_Vari_ref_2314[0].attr6_PreDef = -(1);
								__debugInfo = "1572:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "1570:\src\CompilerPasses\Parser.gbas";pool_TIdentifierVari.free(alias4_Vari_ref_2314);
						}
						forEachSaver18607.values[forEachCounter18607] = local1_V_2313;
					
					};
					__debugInfo = "1566:\src\CompilerPasses\Parser.gbas";pool_TIdentifierVari.free(local7_tmpVari_2312);
				} while (!((((func7_IsToken(",")) === (0)) ? 1 : 0)));
				__debugInfo = "1578:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2311) === (func7_IsToken("LOCAL"))) ? 1 : 0)) {
				__debugInfo = "1629:\src\CompilerPasses\Parser.gbas";
				do {
					var local10_DontCreate_2316 = 0;
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
					local10_DontCreate_2316 = 0;
					__debugInfo = "1607:\src\CompilerPasses\Parser.gbas";
					if (func13_IsVarExisting(func17_CleanVariable_Str(func14_GetCurrent_Str()))) {
						var local5_Varis_2317 = pool_array.alloc(0);
						__debugInfo = "1590:\src\CompilerPasses\Parser.gbas";
						local10_DontCreate_2316 = 1;
						__debugInfo = "1593:\src\CompilerPasses\Parser.gbas";
						func8_GetVaris(unref(local5_Varis_2317), -(1), 0);
						__debugInfo = "1601:\src\CompilerPasses\Parser.gbas";
						var forEachSaver18686 = local5_Varis_2317;
						for(var forEachCounter18686 = 0 ; forEachCounter18686 < forEachSaver18686.values.length ; forEachCounter18686++) {
							var local1_V_2318 = forEachSaver18686.values[forEachCounter18686];
						{
								__debugInfo = "1600:\src\CompilerPasses\Parser.gbas";
								if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_V_2318).values[tmpPositionCache][0].attr8_Name_Str) === (func17_CleanVariable_Str(func14_GetCurrent_Str()))) ? 1 : 0)) {
									__debugInfo = "1599:\src\CompilerPasses\Parser.gbas";
									if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_V_2318).values[tmpPositionCache][0].attr3_Typ) === (2)) ? 1 : 0)) {
										__debugInfo = "1597:\src\CompilerPasses\Parser.gbas";
										local10_DontCreate_2316 = 0;
										__debugInfo = "1598:\src\CompilerPasses\Parser.gbas";
										break;
										__debugInfo = "1597:\src\CompilerPasses\Parser.gbas";
									};
									__debugInfo = "1599:\src\CompilerPasses\Parser.gbas";
								};
								__debugInfo = "1600:\src\CompilerPasses\Parser.gbas";
							}
							forEachSaver18686.values[forEachCounter18686] = local1_V_2318;
						
						};
						__debugInfo = "1606:\src\CompilerPasses\Parser.gbas";
						if (local10_DontCreate_2316) {
							var local4_Expr_2319 = 0;
							__debugInfo = "1603:\src\CompilerPasses\Parser.gbas";
							func7_Warning((((("Variable '") + (func14_GetCurrent_Str()))) + ("' already exists...")));
							__debugInfo = "1604:\src\CompilerPasses\Parser.gbas";
							local4_Expr_2319 = func10_Identifier(1);
							__debugInfo = "1605:\src\CompilerPasses\Parser.gbas";
							DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local4_Expr_2319);
							__debugInfo = "1603:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "1590:\src\CompilerPasses\Parser.gbas";pool_array.free(local5_Varis_2317);
					};
					__debugInfo = "1627:\src\CompilerPasses\Parser.gbas";
					if (((local10_DontCreate_2316) ? 0 : 1)) {
						var local4_Vari_2320 = pool_TIdentifierVari.alloc(), local4_PDef_2321 = 0;
						__debugInfo = "1611:\src\CompilerPasses\Parser.gbas";
						local4_Vari_2320 = func7_VariDef(0).clone(/* In Assign */);
						__debugInfo = "1612:\src\CompilerPasses\Parser.gbas";
						local4_Vari_2320.attr3_Typ = ~~(1);
						__debugInfo = "1614:\src\CompilerPasses\Parser.gbas";
						local4_PDef_2321 = -(1);
						__debugInfo = "1618:\src\CompilerPasses\Parser.gbas";
						if ((((local4_Vari_2320.attr6_PreDef) !== (-(1))) ? 1 : 0)) {
							__debugInfo = "1616:\src\CompilerPasses\Parser.gbas";
							local4_PDef_2321 = local4_Vari_2320.attr6_PreDef;
							__debugInfo = "1617:\src\CompilerPasses\Parser.gbas";
							local4_Vari_2320.attr6_PreDef = -(1);
							__debugInfo = "1616:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "1619:\src\CompilerPasses\Parser.gbas";
						func11_AddVariable(local4_Vari_2320, 1);
						__debugInfo = "1620:\src\CompilerPasses\Parser.gbas";
						DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
						__debugInfo = "1626:\src\CompilerPasses\Parser.gbas";
						if ((((local4_PDef_2321) !== (-(1))) ? 1 : 0)) {
							var local7_tmpExpr_2322 = 0;
							__debugInfo = "1623:\src\CompilerPasses\Parser.gbas";
							if ((((global8_Compiler.attr12_CurrentScope) === (-(1))) ? 1 : 0)) {
								__debugInfo = "1623:\src\CompilerPasses\Parser.gbas";
								func5_Error("Internal error (LOCAL in -1 scope)", 1622, "src\CompilerPasses\Parser.gbas");
								__debugInfo = "1623:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "1624:\src\CompilerPasses\Parser.gbas";
							local7_tmpExpr_2322 = func22_CreateAssignExpression(func24_CreateVariableExpression(((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1))), local4_PDef_2321);
							__debugInfo = "1625:\src\CompilerPasses\Parser.gbas";
							DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local7_tmpExpr_2322);
							__debugInfo = "1623:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "1611:\src\CompilerPasses\Parser.gbas";pool_TIdentifierVari.free(local4_Vari_2320);
					};
					__debugInfo = "1585:\src\CompilerPasses\Parser.gbas";
				} while (!((((func7_IsToken(",")) === (0)) ? 1 : 0)));
				__debugInfo = "1629:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2311) === (func7_IsToken("ALIAS"))) ? 1 : 0)) {
				__debugInfo = "1662:\src\CompilerPasses\Parser.gbas";
				do {
					var local4_Vari_2323 = pool_TIdentifierVari.alloc(), local4_PDef_2324 = 0, local7_tmpExpr_2325 = 0;
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
					local4_Vari_2323.attr8_Name_Str = func14_GetCurrent_Str();
					__debugInfo = "1641:\src\CompilerPasses\Parser.gbas";
					local4_Vari_2323.attr3_Typ = ~~(7);
					__debugInfo = "1642:\src\CompilerPasses\Parser.gbas";
					local4_Vari_2323.attr3_ref = 1;
					__debugInfo = "1644:\src\CompilerPasses\Parser.gbas";
					func5_Match(local4_Vari_2323.attr8_Name_Str, 1643, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1645:\src\CompilerPasses\Parser.gbas";
					func5_Match("AS", 1644, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1647:\src\CompilerPasses\Parser.gbas";
					local4_PDef_2324 = func10_Identifier(0);
					__debugInfo = "1648:\src\CompilerPasses\Parser.gbas";
					global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(local4_PDef_2324, 1)).values[tmpPositionCache][0].attr3_ref = 1;
					__debugInfo = "1649:\src\CompilerPasses\Parser.gbas";
					local4_Vari_2323.attr8_datatype = global5_Exprs_ref[0].arrAccess(local4_PDef_2324).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
					__debugInfo = "1652:\src\CompilerPasses\Parser.gbas";
					func11_AddVariable(local4_Vari_2323, 1);
					__debugInfo = "1653:\src\CompilerPasses\Parser.gbas";
					DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
					__debugInfo = "1656:\src\CompilerPasses\Parser.gbas";
					local7_tmpExpr_2325 = func21_CreateAliasExpression(((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)), local4_PDef_2324);
					__debugInfo = "1661:\src\CompilerPasses\Parser.gbas";
					if (func7_IsToken(",")) {
						__debugInfo = "1658:\src\CompilerPasses\Parser.gbas";
						DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local7_tmpExpr_2325);
						__debugInfo = "1658:\src\CompilerPasses\Parser.gbas";
					} else {
						__debugInfo = "1660:\src\CompilerPasses\Parser.gbas";
						return tryClone(local7_tmpExpr_2325);
						__debugInfo = "1660:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "1637:\src\CompilerPasses\Parser.gbas";pool_TIdentifierVari.free(local4_Vari_2323);
				} while (!((((func7_IsToken(",")) === (0)) ? 1 : 0)));
				__debugInfo = "1662:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2311) === (func7_IsToken("STATIC"))) ? 1 : 0)) {
				__debugInfo = "1664:\src\CompilerPasses\Parser.gbas";
				if ((((global8_Compiler.attr11_currentFunc) === (-(1))) ? 1 : 0)) {
					__debugInfo = "1664:\src\CompilerPasses\Parser.gbas";
					func5_Error("Static has to be in a FUNCTION", 1663, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1664:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1680:\src\CompilerPasses\Parser.gbas";
				do {
					var local4_Vari_2326 = pool_TIdentifierVari.alloc();
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
					local4_Vari_2326 = func7_VariDef(0).clone(/* In Assign */);
					__debugInfo = "1674:\src\CompilerPasses\Parser.gbas";
					local4_Vari_2326.attr3_Typ = ~~(4);
					__debugInfo = "1675:\src\CompilerPasses\Parser.gbas";
					local4_Vari_2326.attr4_func = global8_Compiler.attr11_currentFunc;
					__debugInfo = "1676:\src\CompilerPasses\Parser.gbas";
					func11_AddVariable(local4_Vari_2326, 1);
					__debugInfo = "1677:\src\CompilerPasses\Parser.gbas";
					DIMPUSH(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr7_Statics, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
					__debugInfo = "1678:\src\CompilerPasses\Parser.gbas";
					DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
					__debugInfo = "1671:\src\CompilerPasses\Parser.gbas";pool_TIdentifierVari.free(local4_Vari_2326);
				} while (!((((func7_IsToken(",")) === (0)) ? 1 : 0)));
				__debugInfo = "1664:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2311) === (func7_IsToken("DIMPUSH"))) ? 1 : 0)) {
				var local4_Vari_2327 = 0, local8_datatype_2328 = pool_TDatatype.alloc(), local4_Expr_2329 = 0;
				__debugInfo = "1682:\src\CompilerPasses\Parser.gbas";
				func5_Match("DIMPUSH", 1681, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1683:\src\CompilerPasses\Parser.gbas";
				local4_Vari_2327 = func10_Identifier(0);
				__debugInfo = "1684:\src\CompilerPasses\Parser.gbas";
				if ((((global5_Exprs_ref[0].arrAccess(local4_Vari_2327).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0)) {
					__debugInfo = "1684:\src\CompilerPasses\Parser.gbas";
					func5_Error("DIMPUSH needs array", 1683, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1684:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1685:\src\CompilerPasses\Parser.gbas";
				func5_Match(",", 1684, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1687:\src\CompilerPasses\Parser.gbas";
				local8_datatype_2328 = global5_Exprs_ref[0].arrAccess(local4_Vari_2327).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
				__debugInfo = "1688:\src\CompilerPasses\Parser.gbas";
				local8_datatype_2328.attr7_IsArray = 0;
				__debugInfo = "1690:\src\CompilerPasses\Parser.gbas";
				local4_Expr_2329 = func14_EnsureDatatype(func10_Expression(0), local8_datatype_2328, 1689, 0);
				__debugInfo = "1699:\src\CompilerPasses\Parser.gbas";
				return tryClone(func23_CreateDimpushExpression(local4_Vari_2327, local4_Expr_2329));
				__debugInfo = "1682:\src\CompilerPasses\Parser.gbas";pool_TDatatype.free(local8_datatype_2328);
			} else if ((((local17___SelectHelper27__2311) === (func7_IsToken("DIM"))) ? 1 : 0)) {
				var local3_Arr_2330 = 0;
				__debugInfo = "1701:\src\CompilerPasses\Parser.gbas";
				func5_Match("DIM", 1700, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1702:\src\CompilerPasses\Parser.gbas";
				local3_Arr_2330 = func14_ImplicitDefine();
				__debugInfo = "1705:\src\CompilerPasses\Parser.gbas";
				if ((((local3_Arr_2330) !== (-(1))) ? 1 : 0)) {
					__debugInfo = "1704:\src\CompilerPasses\Parser.gbas";
					global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Arr_2330).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray = 1;
					__debugInfo = "1704:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1723:\src\CompilerPasses\Parser.gbas";
				if (func12_IsIdentifier(0, 0)) {
					var local4_expr_2331 = 0, local5_LExpr_2332 = 0, local4_Dims_2333 = pool_array.alloc(0);
					__debugInfo = "1708:\src\CompilerPasses\Parser.gbas";
					local4_expr_2331 = func10_Identifier(0);
					__debugInfo = "1709:\src\CompilerPasses\Parser.gbas";
					local5_LExpr_2332 = func12_GetRightExpr(local4_expr_2331);
					__debugInfo = "1710:\src\CompilerPasses\Parser.gbas";
					if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(local4_expr_2331, 1)).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0)) {
						__debugInfo = "1710:\src\CompilerPasses\Parser.gbas";
						func5_Error("Array expected.", 1709, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "1710:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "1712:\src\CompilerPasses\Parser.gbas";
					{
						var local17___SelectHelper28__2334 = 0;
						__debugInfo = "1712:\src\CompilerPasses\Parser.gbas";
						local17___SelectHelper28__2334 = global5_Exprs_ref[0].arrAccess(local5_LExpr_2332).values[tmpPositionCache][0].attr3_Typ;
						__debugInfo = "1718:\src\CompilerPasses\Parser.gbas";
						if ((((local17___SelectHelper28__2334) === (~~(13))) ? 1 : 0)) {
							__debugInfo = "1714:\src\CompilerPasses\Parser.gbas";
							local4_Dims_2333 = global5_Exprs_ref[0].arrAccess(local5_LExpr_2332).values[tmpPositionCache][0].attr4_dims.clone(/* In Assign */);
							__debugInfo = "1715:\src\CompilerPasses\Parser.gbas";
							DIM(global5_Exprs_ref[0].arrAccess(local5_LExpr_2332).values[tmpPositionCache][0].attr4_dims, [0], 0);
							__debugInfo = "1714:\src\CompilerPasses\Parser.gbas";
						} else {
							__debugInfo = "1717:\src\CompilerPasses\Parser.gbas";
							func5_Error("Internal error (array not parsed)", 1716, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "1717:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "1712:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "1720:\src\CompilerPasses\Parser.gbas";
					return tryClone(func19_CreateDimExpression(local4_expr_2331, unref(local4_Dims_2333)));
					__debugInfo = "1708:\src\CompilerPasses\Parser.gbas";pool_array.free(local4_Dims_2333);
				} else {
					__debugInfo = "1722:\src\CompilerPasses\Parser.gbas";
					func5_Error("DIM needs identifier", 1721, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1722:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1701:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2311) === (func7_IsToken("REDIM"))) ? 1 : 0)) {
				var local3_Arr_2335 = 0;
				__debugInfo = "1725:\src\CompilerPasses\Parser.gbas";
				func5_Match("REDIM", 1724, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1726:\src\CompilerPasses\Parser.gbas";
				local3_Arr_2335 = func14_ImplicitDefine();
				__debugInfo = "1729:\src\CompilerPasses\Parser.gbas";
				if ((((local3_Arr_2335) !== (-(1))) ? 1 : 0)) {
					__debugInfo = "1728:\src\CompilerPasses\Parser.gbas";
					global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Arr_2335).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray = 1;
					__debugInfo = "1728:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1745:\src\CompilerPasses\Parser.gbas";
				if (func12_IsIdentifier(0, 0)) {
					var local4_expr_2336 = 0, local5_LExpr_2337 = 0, local4_Dims_2338 = pool_array.alloc(0);
					__debugInfo = "1731:\src\CompilerPasses\Parser.gbas";
					local4_expr_2336 = func10_Identifier(0);
					__debugInfo = "1732:\src\CompilerPasses\Parser.gbas";
					local5_LExpr_2337 = func12_GetRightExpr(local4_expr_2336);
					__debugInfo = "1733:\src\CompilerPasses\Parser.gbas";
					if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(local4_expr_2336, 1)).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0)) {
						__debugInfo = "1733:\src\CompilerPasses\Parser.gbas";
						func5_Error("Array expected.", 1732, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "1733:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "1735:\src\CompilerPasses\Parser.gbas";
					{
						var local17___SelectHelper29__2339 = 0;
						__debugInfo = "1735:\src\CompilerPasses\Parser.gbas";
						local17___SelectHelper29__2339 = global5_Exprs_ref[0].arrAccess(local5_LExpr_2337).values[tmpPositionCache][0].attr3_Typ;
						__debugInfo = "1741:\src\CompilerPasses\Parser.gbas";
						if ((((local17___SelectHelper29__2339) === (~~(13))) ? 1 : 0)) {
							__debugInfo = "1737:\src\CompilerPasses\Parser.gbas";
							local4_Dims_2338 = global5_Exprs_ref[0].arrAccess(local5_LExpr_2337).values[tmpPositionCache][0].attr4_dims.clone(/* In Assign */);
							__debugInfo = "1738:\src\CompilerPasses\Parser.gbas";
							DIM(global5_Exprs_ref[0].arrAccess(local5_LExpr_2337).values[tmpPositionCache][0].attr4_dims, [0], 0);
							__debugInfo = "1737:\src\CompilerPasses\Parser.gbas";
						} else {
							__debugInfo = "1740:\src\CompilerPasses\Parser.gbas";
							func5_Error("Internal error (array not parsed)", 1739, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "1740:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "1735:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "1742:\src\CompilerPasses\Parser.gbas";
					return tryClone(func21_CreateReDimExpression(local4_expr_2336, unref(local4_Dims_2338)));
					__debugInfo = "1731:\src\CompilerPasses\Parser.gbas";pool_array.free(local4_Dims_2338);
				} else {
					__debugInfo = "1744:\src\CompilerPasses\Parser.gbas";
					func5_Error("REDIM needs identifier", 1743, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1744:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1725:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2311) === (func7_IsToken("DIMDATA"))) ? 1 : 0)) {
				var local5_Array_2340 = 0, local2_Ex_2341 = pool_array.alloc(0);
				__debugInfo = "1747:\src\CompilerPasses\Parser.gbas";
				func5_Match("DIMDATA", 1746, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1749:\src\CompilerPasses\Parser.gbas";
				local5_Array_2340 = func14_ImplicitDefine();
				__debugInfo = "1755:\src\CompilerPasses\Parser.gbas";
				if ((((local5_Array_2340) !== (-(1))) ? 1 : 0)) {
					__debugInfo = "1751:\src\CompilerPasses\Parser.gbas";
					global8_Compiler.attr5_Varis_ref[0].arrAccess(local5_Array_2340).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray = 1;
					__debugInfo = "1752:\src\CompilerPasses\Parser.gbas";
					local5_Array_2340 = func10_Identifier(0);
					__debugInfo = "1751:\src\CompilerPasses\Parser.gbas";
				} else {
					__debugInfo = "1754:\src\CompilerPasses\Parser.gbas";
					local5_Array_2340 = func10_Expression(0);
					__debugInfo = "1754:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1757:\src\CompilerPasses\Parser.gbas";
				if ((((global5_Exprs_ref[0].arrAccess(local5_Array_2340).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0)) {
					__debugInfo = "1757:\src\CompilerPasses\Parser.gbas";
					func5_Error("DIMDATA needs array, stupid...", 1756, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1757:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1769:\src\CompilerPasses\Parser.gbas";
				while ((((func7_IsToken("\n")) === (0)) ? 1 : 0)) {
					__debugInfo = "1760:\src\CompilerPasses\Parser.gbas";
					func5_Match(",", 1759, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1768:\src\CompilerPasses\Parser.gbas";
					if ((((BOUNDS(local2_Ex_2341, 0)) === (0)) ? 1 : 0)) {
						__debugInfo = "1762:\src\CompilerPasses\Parser.gbas";
						DIMPUSH(local2_Ex_2341, func10_Expression(0));
						__debugInfo = "1762:\src\CompilerPasses\Parser.gbas";
					} else {
						var local7_datatyp_2342 = pool_TDatatype.alloc(), local1_E_2343 = 0;
						__debugInfo = "1765:\src\CompilerPasses\Parser.gbas";
						local7_datatyp_2342 = global5_Exprs_ref[0].arrAccess(local2_Ex_2341.arrAccess(0).values[tmpPositionCache]).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
						__debugInfo = "1766:\src\CompilerPasses\Parser.gbas";
						local1_E_2343 = func14_EnsureDatatype(func10_Expression(0), local7_datatyp_2342, 1765, 0);
						__debugInfo = "1767:\src\CompilerPasses\Parser.gbas";
						DIMPUSH(local2_Ex_2341, local1_E_2343);
						__debugInfo = "1765:\src\CompilerPasses\Parser.gbas";pool_TDatatype.free(local7_datatyp_2342);
					};
					__debugInfo = "1760:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1771:\src\CompilerPasses\Parser.gbas";
				return tryClone(func23_CreateDimDataExpression(local5_Array_2340, unref(local2_Ex_2341)));
				__debugInfo = "1747:\src\CompilerPasses\Parser.gbas";pool_array.free(local2_Ex_2341);
			} else if ((((local17___SelectHelper27__2311) === (func7_IsToken("DELETE"))) ? 1 : 0)) {
				var local11_VarName_Str_2344 = "";
				__debugInfo = "1773:\src\CompilerPasses\Parser.gbas";
				func5_Match("DELETE", 1772, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1774:\src\CompilerPasses\Parser.gbas";
				local11_VarName_Str_2344 = func14_GetCurrent_Str();
				__debugInfo = "1775:\src\CompilerPasses\Parser.gbas";
				if (((((((local11_VarName_Str_2344) !== (global8_Compiler.attr18_currentForEach_Str)) ? 1 : 0)) && ((((local11_VarName_Str_2344) !== ("\n")) ? 1 : 0))) ? 1 : 0)) {
					__debugInfo = "1775:\src\CompilerPasses\Parser.gbas";
					func5_Error((((((((("DELETE, invalid name '") + (local11_VarName_Str_2344))) + ("' expecting '"))) + (global8_Compiler.attr18_currentForEach_Str))) + ("'")), 1774, "src\CompilerPasses\Parser.gbas");
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
			} else if ((((local17___SelectHelper27__2311) === (func7_IsToken("DIMDEL"))) ? 1 : 0)) {
				var local5_Array_2345 = 0;
				__debugInfo = "1779:\src\CompilerPasses\Parser.gbas";
				func5_Match("DIMDEL", 1778, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1780:\src\CompilerPasses\Parser.gbas";
				local5_Array_2345 = func10_Identifier(0);
				__debugInfo = "1781:\src\CompilerPasses\Parser.gbas";
				func5_Match(",", 1780, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1782:\src\CompilerPasses\Parser.gbas";
				return tryClone(func22_CreateDimDelExpression(local5_Array_2345, func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 1781, 0)));
				__debugInfo = "1779:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2311) === (func7_IsToken("RETURN"))) ? 1 : 0)) {
				__debugInfo = "1799:\src\CompilerPasses\Parser.gbas";
				if ((((global8_Compiler.attr11_currentFunc) !== (-(1))) ? 1 : 0)) {
					var local4_Expr_2346 = 0, local8_datatype_2347 = pool_TDatatype.alloc();
					__debugInfo = "1785:\src\CompilerPasses\Parser.gbas";
					func5_Match("RETURN", 1784, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1788:\src\CompilerPasses\Parser.gbas";
					local8_datatype_2347 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
					__debugInfo = "1795:\src\CompilerPasses\Parser.gbas";
					if (func7_IsToken("\n")) {
						__debugInfo = "1790:\src\CompilerPasses\Parser.gbas";
						local4_Expr_2346 = func28_CreateDefaultValueExpression(local8_datatype_2347);
						__debugInfo = "1790:\src\CompilerPasses\Parser.gbas";
					} else if ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr3_Typ) === (2)) ? 1 : 0)) {
						__debugInfo = "1792:\src\CompilerPasses\Parser.gbas";
						func5_Error("Sub cannot return a value", 1791, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "1792:\src\CompilerPasses\Parser.gbas";
					} else {
						__debugInfo = "1794:\src\CompilerPasses\Parser.gbas";
						local4_Expr_2346 = func14_EnsureDatatype(func10_Expression(0), local8_datatype_2347, 1793, 0);
						__debugInfo = "1794:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "1796:\src\CompilerPasses\Parser.gbas";
					return tryClone(func22_CreateReturnExpression(local4_Expr_2346));
					__debugInfo = "1785:\src\CompilerPasses\Parser.gbas";pool_TDatatype.free(local8_datatype_2347);
				} else {
					__debugInfo = "1798:\src\CompilerPasses\Parser.gbas";
					func5_Error("RETURN have to be in a function or sub.", 1797, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1798:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1799:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2311) === (func7_IsToken("INLINE"))) ? 1 : 0)) {
				__debugInfo = "1801:\src\CompilerPasses\Parser.gbas";
				func5_Error("INLINE/ENDINLINE not supported", 1800, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1801:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2311) === (func7_IsToken("REQUIRE"))) ? 1 : 0)) {
				var local8_Name_Str_2348 = "";
				__debugInfo = "1803:\src\CompilerPasses\Parser.gbas";
				func5_Match("REQUIRE", 1802, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1804:\src\CompilerPasses\Parser.gbas";
				local8_Name_Str_2348 = REPLACE_Str(func14_GetCurrent_Str(), "\"", "");
				__debugInfo = "1805:\src\CompilerPasses\Parser.gbas";
				func7_GetNext();
				__debugInfo = "1806:\src\CompilerPasses\Parser.gbas";
				return tryClone(~~(func23_CreateRequireExpression(local8_Name_Str_2348)));
				__debugInfo = "1803:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2311) === (func7_IsToken("EXPORT"))) ? 1 : 0)) {
				var local3_Exp_2349 = pool_TExport.alloc(), local5_Found_2350 = 0;
				__debugInfo = "1808:\src\CompilerPasses\Parser.gbas";
				func5_Match("EXPORT", 1807, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1810:\src\CompilerPasses\Parser.gbas";
				local3_Exp_2349.attr8_Name_Str = REPLACE_Str(func14_GetCurrent_Str(), "\"", "");
				__debugInfo = "1811:\src\CompilerPasses\Parser.gbas";
				local5_Found_2350 = 0;
				__debugInfo = "1819:\src\CompilerPasses\Parser.gbas";
				var forEachSaver19663 = global8_Compiler.attr5_Funcs_ref[0];
				for(var forEachCounter19663 = 0 ; forEachCounter19663 < forEachSaver19663.values.length ; forEachCounter19663++) {
					var local1_F_ref_2351 = forEachSaver19663.values[forEachCounter19663];
				{
						__debugInfo = "1818:\src\CompilerPasses\Parser.gbas";
						if (((((((local1_F_ref_2351[0].attr3_Typ) === (1)) ? 1 : 0)) && ((((local3_Exp_2349.attr8_Name_Str) === (local1_F_ref_2351[0].attr8_Name_Str)) ? 1 : 0))) ? 1 : 0)) {
							__debugInfo = "1815:\src\CompilerPasses\Parser.gbas";
							local1_F_ref_2351[0].attr10_PlzCompile = 1;
							__debugInfo = "1816:\src\CompilerPasses\Parser.gbas";
							local5_Found_2350 = 1;
							__debugInfo = "1817:\src\CompilerPasses\Parser.gbas";
							break;
							__debugInfo = "1815:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "1818:\src\CompilerPasses\Parser.gbas";
					}
					forEachSaver19663.values[forEachCounter19663] = local1_F_ref_2351;
				
				};
				__debugInfo = "1829:\src\CompilerPasses\Parser.gbas";
				if (((local5_Found_2350) ? 0 : 1)) {
					__debugInfo = "1828:\src\CompilerPasses\Parser.gbas";
					var forEachSaver19703 = global8_Compiler.attr7_Globals;
					for(var forEachCounter19703 = 0 ; forEachCounter19703 < forEachSaver19703.values.length ; forEachCounter19703++) {
						var local1_V_2352 = forEachSaver19703.values[forEachCounter19703];
					{
							__debugInfo = "1827:\src\CompilerPasses\Parser.gbas";
							if (((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_V_2352).values[tmpPositionCache][0].attr3_Typ) === (2)) ? 1 : 0)) && ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_V_2352).values[tmpPositionCache][0].attr8_Name_Str) === (local3_Exp_2349.attr8_Name_Str)) ? 1 : 0))) ? 1 : 0)) {
								__debugInfo = "1825:\src\CompilerPasses\Parser.gbas";
								local5_Found_2350 = 1;
								__debugInfo = "1826:\src\CompilerPasses\Parser.gbas";
								break;
								__debugInfo = "1825:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "1827:\src\CompilerPasses\Parser.gbas";
						}
						forEachSaver19703.values[forEachCounter19703] = local1_V_2352;
					
					};
					__debugInfo = "1828:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1831:\src\CompilerPasses\Parser.gbas";
				if (((local5_Found_2350) ? 0 : 1)) {
					__debugInfo = "1831:\src\CompilerPasses\Parser.gbas";
					func5_Error((((("Cannot export undefined function/global '") + (local3_Exp_2349.attr8_Name_Str))) + ("'")), 1830, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1831:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1832:\src\CompilerPasses\Parser.gbas";
				local3_Exp_2349.attr8_Name_Str = REPLACE_Str(local3_Exp_2349.attr8_Name_Str, "$", "_Str");
				__debugInfo = "1833:\src\CompilerPasses\Parser.gbas";
				func7_GetNext();
				__debugInfo = "1838:\src\CompilerPasses\Parser.gbas";
				if (func7_IsToken(",")) {
					__debugInfo = "1835:\src\CompilerPasses\Parser.gbas";
					func5_Match(",", 1834, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1836:\src\CompilerPasses\Parser.gbas";
					local3_Exp_2349.attr12_RealName_Str = REPLACE_Str(func14_GetCurrent_Str(), "\"", "");
					__debugInfo = "1837:\src\CompilerPasses\Parser.gbas";
					func7_GetNext();
					__debugInfo = "1835:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1840:\src\CompilerPasses\Parser.gbas";
				DIMPUSH(global8_Compiler.attr7_Exports, local3_Exp_2349);
				__debugInfo = "1841:\src\CompilerPasses\Parser.gbas";
				return tryClone(func21_CreateEmptyExpression());
				__debugInfo = "1808:\src\CompilerPasses\Parser.gbas";pool_TExport.free(local3_Exp_2349);
			} else if ((((local17___SelectHelper27__2311) === (func7_IsToken("IF"))) ? 1 : 0)) {
				var local4_Cnds_2353 = pool_array.alloc(0), local4_Scps_2354 = pool_array.alloc(0), local7_elseScp_2355 = 0;
				__debugInfo = "1844:\src\CompilerPasses\Parser.gbas";
				func5_Match("IF", 1843, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1846:\src\CompilerPasses\Parser.gbas";
				DIMPUSH(local4_Cnds_2353, func14_EnsureDatatype(func10_Expression(0), global13_floatDatatype, 1845, 0));
				__debugInfo = "1849:\src\CompilerPasses\Parser.gbas";
				if ((((func7_IsToken("THEN")) === (0)) ? 1 : 0)) {
					__debugInfo = "1848:\src\CompilerPasses\Parser.gbas";
					func5_Match("\n", 1847, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1848:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1851:\src\CompilerPasses\Parser.gbas";
				DIMPUSH(local4_Scps_2354, func5_Scope("ENDIF", -(1)));
				__debugInfo = "1859:\src\CompilerPasses\Parser.gbas";
				while (func7_IsToken("ELSEIF")) {
					__debugInfo = "1855:\src\CompilerPasses\Parser.gbas";
					func5_Match("ELSEIF", 1854, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1856:\src\CompilerPasses\Parser.gbas";
					DIMPUSH(local4_Cnds_2353, func14_EnsureDatatype(func10_Expression(0), global13_floatDatatype, 1855, 0));
					__debugInfo = "1857:\src\CompilerPasses\Parser.gbas";
					func5_Match("\n", 1856, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1858:\src\CompilerPasses\Parser.gbas";
					DIMPUSH(local4_Scps_2354, func5_Scope("ENDIF", -(1)));
					__debugInfo = "1855:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1866:\src\CompilerPasses\Parser.gbas";
				if (func7_IsToken("ELSE")) {
					__debugInfo = "1861:\src\CompilerPasses\Parser.gbas";
					func5_Match("ELSE", 1860, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1862:\src\CompilerPasses\Parser.gbas";
					func5_Match("\n", 1861, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "1863:\src\CompilerPasses\Parser.gbas";
					local7_elseScp_2355 = func5_Scope("ENDIF", -(1));
					__debugInfo = "1861:\src\CompilerPasses\Parser.gbas";
				} else {
					__debugInfo = "1865:\src\CompilerPasses\Parser.gbas";
					local7_elseScp_2355 = -(1);
					__debugInfo = "1865:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "1868:\src\CompilerPasses\Parser.gbas";
				return tryClone(func18_CreateIfExpression(unref(local4_Cnds_2353), unref(local4_Scps_2354), local7_elseScp_2355));
				__debugInfo = "1844:\src\CompilerPasses\Parser.gbas";pool_array.free(local4_Scps_2354);
			} else if ((((local17___SelectHelper27__2311) === (func7_IsToken("WHILE"))) ? 1 : 0)) {
				var local4_Expr_2356 = 0, local3_Scp_2357 = 0;
				__debugInfo = "1870:\src\CompilerPasses\Parser.gbas";
				func5_Match("WHILE", 1869, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1871:\src\CompilerPasses\Parser.gbas";
				local4_Expr_2356 = func14_EnsureDatatype(func10_Expression(0), global13_floatDatatype, 1870, 0);
				__debugInfo = "1872:\src\CompilerPasses\Parser.gbas";
				func5_Match("\n", 1871, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1873:\src\CompilerPasses\Parser.gbas";
				local3_Scp_2357 = func5_Scope("WEND", -(1));
				__debugInfo = "1874:\src\CompilerPasses\Parser.gbas";
				return tryClone(func21_CreateWhileExpression(local4_Expr_2356, local3_Scp_2357));
				__debugInfo = "1870:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2311) === (func7_IsToken("REPEAT"))) ? 1 : 0)) {
				var local3_Scp_2358 = 0, local4_Expr_2359 = 0;
				__debugInfo = "1876:\src\CompilerPasses\Parser.gbas";
				func5_Match("REPEAT", 1875, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1877:\src\CompilerPasses\Parser.gbas";
				func5_Match("\n", 1876, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "1878:\src\CompilerPasses\Parser.gbas";
				local3_Scp_2358 = func5_Scope("UNTIL", -(1));
				__debugInfo = "1879:\src\CompilerPasses\Parser.gbas";
				local4_Expr_2359 = func14_EnsureDatatype(func10_Expression(0), global13_floatDatatype, 1878, 0);
				__debugInfo = "1880:\src\CompilerPasses\Parser.gbas";
				return tryClone(func22_CreateRepeatExpression(local4_Expr_2359, local3_Scp_2358));
				__debugInfo = "1876:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2311) === (func7_IsToken("FOR"))) ? 1 : 0)) {
				var local8_TmpScope_2360 = 0.0, local4_Expr_2361 = 0, local6_OScope_2371 = 0;
				__debugInfo = "1882:\src\CompilerPasses\Parser.gbas";
				local8_TmpScope_2360 = global8_Compiler.attr12_CurrentScope;
				__debugInfo = "1883:\src\CompilerPasses\Parser.gbas";
				global8_Compiler.attr12_CurrentScope = func21_CreateScopeExpression(~~(3));
				__debugInfo = "1884:\src\CompilerPasses\Parser.gbas";
				local4_Expr_2361 = -(1);
				__debugInfo = "1940:\src\CompilerPasses\Parser.gbas";
				{
					var Error_Str = "";
					__debugInfo = "1942:\src\CompilerPasses\Parser.gbas";
					try {
						var local10_IsImplicit_2362 = 0, local7_varExpr_2363 = 0, local3_Var_2366 = 0.0, local5_hasTo_2367 = 0, local6_toExpr_2368 = 0, local8_stepExpr_2369 = 0;
						__debugInfo = "1886:\src\CompilerPasses\Parser.gbas";
						func5_Match("FOR", 1885, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "1889:\src\CompilerPasses\Parser.gbas";
						local10_IsImplicit_2362 = -(1);
						__debugInfo = "1915:\src\CompilerPasses\Parser.gbas";
						if (func12_IsIdentifier(0, 1)) {
							__debugInfo = "1893:\src\CompilerPasses\Parser.gbas";
							local7_varExpr_2363 = func10_Identifier(1);
							__debugInfo = "1893:\src\CompilerPasses\Parser.gbas";
						} else {
							var local4_Vari_2364 = pool_TIdentifierVari.alloc(), local4_PDef_2365 = 0;
							__debugInfo = "1895:\src\CompilerPasses\Parser.gbas";
							local10_IsImplicit_2362 = 1;
							__debugInfo = "1898:\src\CompilerPasses\Parser.gbas";
							local4_Vari_2364 = func7_VariDef(0).clone(/* In Assign */);
							__debugInfo = "1899:\src\CompilerPasses\Parser.gbas";
							local4_Vari_2364.attr3_Typ = ~~(1);
							__debugInfo = "1901:\src\CompilerPasses\Parser.gbas";
							local4_PDef_2365 = -(1);
							__debugInfo = "1905:\src\CompilerPasses\Parser.gbas";
							if ((((local4_Vari_2364.attr6_PreDef) !== (-(1))) ? 1 : 0)) {
								__debugInfo = "1903:\src\CompilerPasses\Parser.gbas";
								local4_PDef_2365 = local4_Vari_2364.attr6_PreDef;
								__debugInfo = "1904:\src\CompilerPasses\Parser.gbas";
								local4_Vari_2364.attr6_PreDef = -(1);
								__debugInfo = "1903:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "1906:\src\CompilerPasses\Parser.gbas";
							func11_AddVariable(local4_Vari_2364, 1);
							__debugInfo = "1907:\src\CompilerPasses\Parser.gbas";
							local10_IsImplicit_2362 = ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1));
							__debugInfo = "1910:\src\CompilerPasses\Parser.gbas";
							DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
							__debugInfo = "1914:\src\CompilerPasses\Parser.gbas";
							if ((((local4_PDef_2365) !== (-(1))) ? 1 : 0)) {
								__debugInfo = "1913:\src\CompilerPasses\Parser.gbas";
								local7_varExpr_2363 = func22_CreateAssignExpression(func24_CreateVariableExpression(((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1))), local4_PDef_2365);
								__debugInfo = "1913:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "1895:\src\CompilerPasses\Parser.gbas";pool_TIdentifierVari.free(local4_Vari_2364);
						};
						__debugInfo = "1916:\src\CompilerPasses\Parser.gbas";
						if ((((global5_Exprs_ref[0].arrAccess(local7_varExpr_2363).values[tmpPositionCache][0].attr3_Typ) !== (10)) ? 1 : 0)) {
							__debugInfo = "1916:\src\CompilerPasses\Parser.gbas";
							func5_Error("FOR, variable needs assignment.", 1915, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "1916:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "1917:\src\CompilerPasses\Parser.gbas";
						local3_Var_2366 = func11_GetVariable(global5_Exprs_ref[0].arrAccess(local7_varExpr_2363).values[tmpPositionCache][0].attr4_vari, 1);
						__debugInfo = "1927:\src\CompilerPasses\Parser.gbas";
						if (func7_IsToken("TO")) {
							__debugInfo = "1920:\src\CompilerPasses\Parser.gbas";
							local5_hasTo_2367 = 1;
							__debugInfo = "1921:\src\CompilerPasses\Parser.gbas";
							func5_Match("TO", 1920, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "1920:\src\CompilerPasses\Parser.gbas";
						} else if (func7_IsToken("UNTIL")) {
							__debugInfo = "1923:\src\CompilerPasses\Parser.gbas";
							local5_hasTo_2367 = 0;
							__debugInfo = "1924:\src\CompilerPasses\Parser.gbas";
							func5_Match("UNTIL", 1923, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "1923:\src\CompilerPasses\Parser.gbas";
						} else {
							__debugInfo = "1926:\src\CompilerPasses\Parser.gbas";
							func5_Error("FOR needs TO or UNTIL!", 1925, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "1926:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "1928:\src\CompilerPasses\Parser.gbas";
						local6_toExpr_2368 = func14_EnsureDatatype(func10_Expression(0), global8_Compiler.attr5_Varis_ref[0].arrAccess(~~(local3_Var_2366)).values[tmpPositionCache][0].attr8_datatype, 1927, 0);
						__debugInfo = "1929:\src\CompilerPasses\Parser.gbas";
						local8_stepExpr_2369 = func14_EnsureDatatype(func19_CreateIntExpression(1), global8_Compiler.attr5_Varis_ref[0].arrAccess(~~(local3_Var_2366)).values[tmpPositionCache][0].attr8_datatype, 1928, 0);
						__debugInfo = "1933:\src\CompilerPasses\Parser.gbas";
						if (func7_IsToken("STEP")) {
							__debugInfo = "1931:\src\CompilerPasses\Parser.gbas";
							func5_Match("STEP", 1930, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "1932:\src\CompilerPasses\Parser.gbas";
							local8_stepExpr_2369 = func14_EnsureDatatype(func10_Expression(0), global8_Compiler.attr5_Varis_ref[0].arrAccess(~~(local3_Var_2366)).values[tmpPositionCache][0].attr8_datatype, 1931, 0);
							__debugInfo = "1931:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "1934:\src\CompilerPasses\Parser.gbas";
						func5_Match("\n", 1933, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "1937:\src\CompilerPasses\Parser.gbas";
						local4_Expr_2361 = func19_CreateForExpression(local7_varExpr_2363, local6_toExpr_2368, local8_stepExpr_2369, local5_hasTo_2367, func5_Scope("NEXT", -(1)));
						__debugInfo = "1939:\src\CompilerPasses\Parser.gbas";
						DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local4_Expr_2361);
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
				local6_OScope_2371 = global8_Compiler.attr12_CurrentScope;
				__debugInfo = "1944:\src\CompilerPasses\Parser.gbas";
				global8_Compiler.attr12_CurrentScope = ~~(local8_TmpScope_2360);
				__debugInfo = "1945:\src\CompilerPasses\Parser.gbas";
				return tryClone(local6_OScope_2371);
				__debugInfo = "1882:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2311) === (func7_IsToken("FOREACH"))) ? 1 : 0)) {
				var local8_TmpScope_2372 = 0.0, local14_TmpForEach_Str_2373 = "", local4_Expr_2374 = 0;
				__debugInfo = "1947:\src\CompilerPasses\Parser.gbas";
				local8_TmpScope_2372 = global8_Compiler.attr12_CurrentScope;
				__debugInfo = "1948:\src\CompilerPasses\Parser.gbas";
				local14_TmpForEach_Str_2373 = global8_Compiler.attr18_currentForEach_Str;
				__debugInfo = "1949:\src\CompilerPasses\Parser.gbas";
				global8_Compiler.attr12_CurrentScope = func21_CreateScopeExpression(~~(3));
				__debugInfo = "1950:\src\CompilerPasses\Parser.gbas";
				local4_Expr_2374 = -(1);
				__debugInfo = "1989:\src\CompilerPasses\Parser.gbas";
				{
					var Error_Str = "";
					__debugInfo = "1991:\src\CompilerPasses\Parser.gbas";
					try {
						var local7_varExpr_2375 = 0, local4_Vari_2376 = pool_TIdentifierVari.alloc(), local6_InExpr_2377 = 0, local3_var_2378 = 0;
						__debugInfo = "1952:\src\CompilerPasses\Parser.gbas";
						func5_Match("FOREACH", 1951, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "1962:\src\CompilerPasses\Parser.gbas";
						local4_Vari_2376 = func7_VariDef(0).clone(/* In Assign */);
						__debugInfo = "1963:\src\CompilerPasses\Parser.gbas";
						local4_Vari_2376.attr3_Typ = ~~(1);
						__debugInfo = "1968:\src\CompilerPasses\Parser.gbas";
						if ((((local4_Vari_2376.attr6_PreDef) !== (-(1))) ? 1 : 0)) {
							__debugInfo = "1967:\src\CompilerPasses\Parser.gbas";
							func5_Error("No default value, in FOREACH", 1966, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "1967:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "1969:\src\CompilerPasses\Parser.gbas";
						func11_AddVariable(local4_Vari_2376, 1);
						__debugInfo = "1970:\src\CompilerPasses\Parser.gbas";
						DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
						__debugInfo = "1971:\src\CompilerPasses\Parser.gbas";
						local7_varExpr_2375 = func24_CreateVariableExpression(((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
						__debugInfo = "1973:\src\CompilerPasses\Parser.gbas";
						global8_Compiler.attr18_currentForEach_Str = global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(local7_varExpr_2375, 1)).values[tmpPositionCache][0].attr8_Name_Str;
						__debugInfo = "1974:\src\CompilerPasses\Parser.gbas";
						func5_Match("IN", 1973, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "1975:\src\CompilerPasses\Parser.gbas";
						local6_InExpr_2377 = func10_Identifier(0);
						__debugInfo = "1977:\src\CompilerPasses\Parser.gbas";
						if ((((global5_Exprs_ref[0].arrAccess(local6_InExpr_2377).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) === (0)) ? 1 : 0)) {
							__debugInfo = "1977:\src\CompilerPasses\Parser.gbas";
							func5_Error("Expecting Array", 1976, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "1977:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "1979:\src\CompilerPasses\Parser.gbas";
						global5_Exprs_ref[0].arrAccess(local7_varExpr_2375).values[tmpPositionCache][0].attr8_datatype = global5_Exprs_ref[0].arrAccess(local6_InExpr_2377).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
						__debugInfo = "1980:\src\CompilerPasses\Parser.gbas";
						global5_Exprs_ref[0].arrAccess(local7_varExpr_2375).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray = 0;
						__debugInfo = "1982:\src\CompilerPasses\Parser.gbas";
						local3_var_2378 = func11_GetVariable(local7_varExpr_2375, 1);
						__debugInfo = "1983:\src\CompilerPasses\Parser.gbas";
						global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_var_2378).values[tmpPositionCache][0].attr8_datatype = global5_Exprs_ref[0].arrAccess(local6_InExpr_2377).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
						__debugInfo = "1984:\src\CompilerPasses\Parser.gbas";
						global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_var_2378).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray = 0;
						__debugInfo = "1985:\src\CompilerPasses\Parser.gbas";
						global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_var_2378).values[tmpPositionCache][0].attr3_ref = global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(local6_InExpr_2377, 1)).values[tmpPositionCache][0].attr3_ref;
						__debugInfo = "1987:\src\CompilerPasses\Parser.gbas";
						func5_Match("\n", 1986, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "1988:\src\CompilerPasses\Parser.gbas";
						local4_Expr_2374 = func23_CreateForEachExpression(local7_varExpr_2375, local6_InExpr_2377, func5_Scope("NEXT", -(1)));
						__debugInfo = "1952:\src\CompilerPasses\Parser.gbas";pool_TIdentifierVari.free(local4_Vari_2376);
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
				global8_Compiler.attr12_CurrentScope = ~~(local8_TmpScope_2372);
				__debugInfo = "1993:\src\CompilerPasses\Parser.gbas";
				global8_Compiler.attr18_currentForEach_Str = local14_TmpForEach_Str_2373;
				__debugInfo = "1994:\src\CompilerPasses\Parser.gbas";
				return tryClone(local4_Expr_2374);
				__debugInfo = "1947:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2311) === (func7_IsToken("BREAK"))) ? 1 : 0)) {
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
			} else if ((((local17___SelectHelper27__2311) === (func7_IsToken("CONTINUE"))) ? 1 : 0)) {
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
			} else if ((((local17___SelectHelper27__2311) === (func7_IsToken("TRY"))) ? 1 : 0)) {
				var local6_tryScp_2380 = 0, local4_Vari_2381 = pool_TIdentifierVari.alloc(), local2_id_2382 = 0.0, local7_myScope_2383 = 0, local8_TmpScope_2384 = 0.0;
				__debugInfo = "2004:\src\CompilerPasses\Parser.gbas";
				func5_Match("TRY", 2003, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "2005:\src\CompilerPasses\Parser.gbas";
				func5_Match("\n", 2004, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "2006:\src\CompilerPasses\Parser.gbas";
				local6_tryScp_2380 = func5_Scope("CATCH", -(1));
				__debugInfo = "2008:\src\CompilerPasses\Parser.gbas";
				local4_Vari_2381 = func7_VariDef(0).clone(/* In Assign */);
				__debugInfo = "2009:\src\CompilerPasses\Parser.gbas";
				if ((((local4_Vari_2381.attr8_datatype.attr8_Name_Str) !== ("string")) ? 1 : 0)) {
					__debugInfo = "2009:\src\CompilerPasses\Parser.gbas";
					func5_Error("Catch variable must be string", 2008, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "2009:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2010:\src\CompilerPasses\Parser.gbas";
				if (local4_Vari_2381.attr8_datatype.attr7_IsArray) {
					__debugInfo = "2010:\src\CompilerPasses\Parser.gbas";
					func5_Error("Catch variable must be non array", 2009, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "2010:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2011:\src\CompilerPasses\Parser.gbas";
				local2_id_2382 = BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0);
				__debugInfo = "2012:\src\CompilerPasses\Parser.gbas";
				func11_AddVariable(local4_Vari_2381, 0);
				__debugInfo = "2013:\src\CompilerPasses\Parser.gbas";
				local7_myScope_2383 = -(1);
				__debugInfo = "2015:\src\CompilerPasses\Parser.gbas";
				local8_TmpScope_2384 = global8_Compiler.attr12_CurrentScope;
				__debugInfo = "2016:\src\CompilerPasses\Parser.gbas";
				global8_Compiler.attr12_CurrentScope = func21_CreateScopeExpression(~~(1));
				__debugInfo = "2027:\src\CompilerPasses\Parser.gbas";
				{
					var Error_Str = "";
					__debugInfo = "2029:\src\CompilerPasses\Parser.gbas";
					try {
						var local7_ctchScp_2385 = 0, local1_e_2386 = 0;
						__debugInfo = "2018:\src\CompilerPasses\Parser.gbas";
						DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ~~(local2_id_2382));
						__debugInfo = "2020:\src\CompilerPasses\Parser.gbas";
						func5_Match("\n", 2019, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "2021:\src\CompilerPasses\Parser.gbas";
						local7_ctchScp_2385 = func5_Scope("FINALLY", -(1));
						__debugInfo = "2023:\src\CompilerPasses\Parser.gbas";
						local1_e_2386 = func19_CreateTryExpression(local6_tryScp_2380, local7_ctchScp_2385, ~~(local2_id_2382));
						__debugInfo = "2024:\src\CompilerPasses\Parser.gbas";
						DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local1_e_2386);
						__debugInfo = "2026:\src\CompilerPasses\Parser.gbas";
						local7_myScope_2383 = global8_Compiler.attr12_CurrentScope;
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
				global8_Compiler.attr12_CurrentScope = ~~(local8_TmpScope_2384);
				__debugInfo = "2032:\src\CompilerPasses\Parser.gbas";
				return tryClone(local7_myScope_2383);
				__debugInfo = "2004:\src\CompilerPasses\Parser.gbas";pool_TIdentifierVari.free(local4_Vari_2381);
			} else if ((((local17___SelectHelper27__2311) === (func7_IsToken("THROW"))) ? 1 : 0)) {
				__debugInfo = "2034:\src\CompilerPasses\Parser.gbas";
				func5_Match("THROW", 2033, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "2035:\src\CompilerPasses\Parser.gbas";
				return tryClone(func21_CreateThrowExpression(func14_EnsureDatatype(func10_Expression(0), global11_strDatatype, 2034, 0)));
				__debugInfo = "2034:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2311) === (func7_IsToken("SELECT"))) ? 1 : 0)) {
				var local4_Vari_2389 = pool_TIdentifierVari.alloc(), local5_Cond1_2390 = 0, local8_datatype_2391 = pool_TDatatype.alloc(), local5_Conds_2392 = pool_array.alloc(0), local4_Scps_2393 = pool_array.alloc(0), local7_elseScp_2394 = 0, local8_TmpScope_2395 = 0.0, local8_VariExpr_2396 = 0, local1_e_2397 = 0, local7_myScope_2403 = 0;
				__debugInfo = "2038:\src\CompilerPasses\Parser.gbas";
				static12_Keyword_SelectHelper+=1;
				__debugInfo = "2040:\src\CompilerPasses\Parser.gbas";
				local4_Vari_2389.attr8_Name_Str = (((("__SelectHelper") + (CAST2STRING(static12_Keyword_SelectHelper)))) + ("_"));
				__debugInfo = "2041:\src\CompilerPasses\Parser.gbas";
				local4_Vari_2389.attr3_Typ = ~~(1);
				__debugInfo = "2044:\src\CompilerPasses\Parser.gbas";
				func5_Match("SELECT", 2043, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "2046:\src\CompilerPasses\Parser.gbas";
				local5_Cond1_2390 = func10_Expression(0);
				__debugInfo = "2048:\src\CompilerPasses\Parser.gbas";
				local8_datatype_2391 = global5_Exprs_ref[0].arrAccess(local5_Cond1_2390).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
				__debugInfo = "2049:\src\CompilerPasses\Parser.gbas";
				local4_Vari_2389.attr8_datatype = local8_datatype_2391.clone(/* In Assign */);
				__debugInfo = "2053:\src\CompilerPasses\Parser.gbas";
				local7_elseScp_2394 = -(1);
				__debugInfo = "2057:\src\CompilerPasses\Parser.gbas";
				func11_AddVariable(local4_Vari_2389, 0);
				__debugInfo = "2058:\src\CompilerPasses\Parser.gbas";
				local8_TmpScope_2395 = global8_Compiler.attr12_CurrentScope;
				__debugInfo = "2059:\src\CompilerPasses\Parser.gbas";
				global8_Compiler.attr12_CurrentScope = func21_CreateScopeExpression(~~(1));
				__debugInfo = "2062:\src\CompilerPasses\Parser.gbas";
				DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
				__debugInfo = "2063:\src\CompilerPasses\Parser.gbas";
				local8_VariExpr_2396 = func24_CreateVariableExpression(((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
				__debugInfo = "2064:\src\CompilerPasses\Parser.gbas";
				local1_e_2397 = func22_CreateAssignExpression(local8_VariExpr_2396, local5_Cond1_2390);
				__debugInfo = "2065:\src\CompilerPasses\Parser.gbas";
				DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local1_e_2397);
				__debugInfo = "2066:\src\CompilerPasses\Parser.gbas";
				local5_Cond1_2390 = local8_VariExpr_2396;
				__debugInfo = "2068:\src\CompilerPasses\Parser.gbas";
				func5_Match("\n", 2067, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "2105:\src\CompilerPasses\Parser.gbas";
				while (func7_IsToken("CASE")) {
					var local5_Cond2_2398 = 0;
					__debugInfo = "2070:\src\CompilerPasses\Parser.gbas";
					func5_Match("CASE", 2069, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "2071:\src\CompilerPasses\Parser.gbas";
					local5_Cond2_2398 = -(1);
					__debugInfo = "2100:\src\CompilerPasses\Parser.gbas";
					do {
						var local2_Op_2399 = 0.0, local5_Expr1_2400 = 0, local5_Expr2_2401 = 0, local7_tmpCond_2402 = 0;
						__debugInfo = "2073:\src\CompilerPasses\Parser.gbas";
						if (func7_IsToken(",")) {
							__debugInfo = "2073:\src\CompilerPasses\Parser.gbas";
							func5_Match(",", 2072, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "2073:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "2075:\src\CompilerPasses\Parser.gbas";
						local2_Op_2399 = func14_SearchOperator("=");
						__debugInfo = "2079:\src\CompilerPasses\Parser.gbas";
						if (func10_IsOperator()) {
							__debugInfo = "2077:\src\CompilerPasses\Parser.gbas";
							local2_Op_2399 = func14_SearchOperator(func14_GetCurrent_Str());
							__debugInfo = "2078:\src\CompilerPasses\Parser.gbas";
							func7_GetNext();
							__debugInfo = "2077:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "2080:\src\CompilerPasses\Parser.gbas";
						local5_Expr1_2400 = -(1);
						__debugInfo = "2081:\src\CompilerPasses\Parser.gbas";
						local5_Expr2_2401 = -(1);
						__debugInfo = "2083:\src\CompilerPasses\Parser.gbas";
						local5_Expr1_2400 = func14_EnsureDatatype(func10_Expression(0), local8_datatype_2391, 2082, 0);
						__debugInfo = "2094:\src\CompilerPasses\Parser.gbas";
						if (func7_IsToken("TO")) {
							__debugInfo = "2085:\src\CompilerPasses\Parser.gbas";
							func5_Match("TO", 2084, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "2086:\src\CompilerPasses\Parser.gbas";
							local5_Expr2_2401 = func14_EnsureDatatype(func10_Expression(0), local8_datatype_2391, 2085, 0);
							__debugInfo = "2088:\src\CompilerPasses\Parser.gbas";
							local5_Expr1_2400 = func24_CreateOperatorExpression(unref(global9_Operators_ref[0].arrAccess(func14_SearchOperator(">=")).values[tmpPositionCache][0]), local5_Cond1_2390, local5_Expr1_2400);
							__debugInfo = "2089:\src\CompilerPasses\Parser.gbas";
							local5_Expr2_2401 = func24_CreateOperatorExpression(unref(global9_Operators_ref[0].arrAccess(func14_SearchOperator("<=")).values[tmpPositionCache][0]), local5_Cond1_2390, local5_Expr2_2401);
							__debugInfo = "2091:\src\CompilerPasses\Parser.gbas";
							local7_tmpCond_2402 = func24_CreateOperatorExpression(unref(global9_Operators_ref[0].arrAccess(func14_SearchOperator("AND")).values[tmpPositionCache][0]), local5_Expr1_2400, local5_Expr2_2401);
							__debugInfo = "2085:\src\CompilerPasses\Parser.gbas";
						} else {
							__debugInfo = "2093:\src\CompilerPasses\Parser.gbas";
							local7_tmpCond_2402 = func24_CreateOperatorExpression(unref(global9_Operators_ref[0].arrAccess(~~(local2_Op_2399)).values[tmpPositionCache][0]), local5_Cond1_2390, local5_Expr1_2400);
							__debugInfo = "2093:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "2099:\src\CompilerPasses\Parser.gbas";
						if ((((local5_Cond2_2398) === (-(1))) ? 1 : 0)) {
							__debugInfo = "2096:\src\CompilerPasses\Parser.gbas";
							local5_Cond2_2398 = local7_tmpCond_2402;
							__debugInfo = "2096:\src\CompilerPasses\Parser.gbas";
						} else {
							__debugInfo = "2098:\src\CompilerPasses\Parser.gbas";
							local5_Cond2_2398 = func24_CreateOperatorExpression(unref(global9_Operators_ref[0].arrAccess(func14_SearchOperator("OR")).values[tmpPositionCache][0]), local5_Cond2_2398, local7_tmpCond_2402);
							__debugInfo = "2098:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "2073:\src\CompilerPasses\Parser.gbas";
					} while (!((((func7_IsToken(",")) === (0)) ? 1 : 0)));
					__debugInfo = "2102:\src\CompilerPasses\Parser.gbas";
					func5_Match("\n", 2101, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "2103:\src\CompilerPasses\Parser.gbas";
					DIMPUSH(local5_Conds_2392, local5_Cond2_2398);
					__debugInfo = "2104:\src\CompilerPasses\Parser.gbas";
					DIMPUSH(local4_Scps_2393, func5_Scope("ENDSELECT", -(1)));
					__debugInfo = "2070:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2110:\src\CompilerPasses\Parser.gbas";
				if (func7_IsToken("DEFAULT")) {
					__debugInfo = "2107:\src\CompilerPasses\Parser.gbas";
					func5_Match("DEFAULT", 2106, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "2108:\src\CompilerPasses\Parser.gbas";
					func5_Match("\n", 2107, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "2109:\src\CompilerPasses\Parser.gbas";
					local7_elseScp_2394 = func5_Scope("ENDSELECT", -(1));
					__debugInfo = "2107:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2113:\src\CompilerPasses\Parser.gbas";
				if (((((((local7_elseScp_2394) === (-(1))) ? 1 : 0)) && ((((BOUNDS(local5_Conds_2392, 0)) === (0)) ? 1 : 0))) ? 1 : 0)) {
					__debugInfo = "2112:\src\CompilerPasses\Parser.gbas";
					func5_Match("ENDSELECT", 2111, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "2112:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2115:\src\CompilerPasses\Parser.gbas";
				local1_e_2397 = func18_CreateIfExpression(unref(local5_Conds_2392), unref(local4_Scps_2393), local7_elseScp_2394);
				__debugInfo = "2116:\src\CompilerPasses\Parser.gbas";
				DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local1_e_2397);
				__debugInfo = "2117:\src\CompilerPasses\Parser.gbas";
				local7_myScope_2403 = global8_Compiler.attr12_CurrentScope;
				__debugInfo = "2118:\src\CompilerPasses\Parser.gbas";
				global8_Compiler.attr12_CurrentScope = ~~(local8_TmpScope_2395);
				__debugInfo = "2119:\src\CompilerPasses\Parser.gbas";
				return tryClone(local7_myScope_2403);
				__debugInfo = "2038:\src\CompilerPasses\Parser.gbas";pool_array.free(local4_Scps_2393);
			} else if ((((local17___SelectHelper27__2311) === (func7_IsToken("STARTDATA"))) ? 1 : 0)) {
				__debugInfo = "2121:\src\CompilerPasses\Parser.gbas";
				func5_Match("STARTDATA", 2120, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "2122:\src\CompilerPasses\Parser.gbas";
				func10_SkipTokens("STARTDATA", "ENDDATA", func14_GetCurrent_Str());
				__debugInfo = "2121:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2311) === (func7_IsToken("RESTORE"))) ? 1 : 0)) {
				var local8_Name_Str_2404 = "";
				__debugInfo = "2124:\src\CompilerPasses\Parser.gbas";
				func5_Match("RESTORE", 2123, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "2125:\src\CompilerPasses\Parser.gbas";
				local8_Name_Str_2404 = func14_GetCurrent_Str();
				__debugInfo = "2126:\src\CompilerPasses\Parser.gbas";
				func5_Match(local8_Name_Str_2404, 2125, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "2131:\src\CompilerPasses\Parser.gbas";
				var forEachSaver20980 = global8_Compiler.attr10_DataBlocks;
				for(var forEachCounter20980 = 0 ; forEachCounter20980 < forEachSaver20980.values.length ; forEachCounter20980++) {
					var local5_block_2405 = forEachSaver20980.values[forEachCounter20980];
				{
						__debugInfo = "2130:\src\CompilerPasses\Parser.gbas";
						if ((((local5_block_2405.attr8_Name_Str) === (local8_Name_Str_2404)) ? 1 : 0)) {
							__debugInfo = "2129:\src\CompilerPasses\Parser.gbas";
							return tryClone(func23_CreateRestoreExpression(local8_Name_Str_2404));
							__debugInfo = "2129:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "2130:\src\CompilerPasses\Parser.gbas";
					}
					forEachSaver20980.values[forEachCounter20980] = local5_block_2405;
				
				};
				__debugInfo = "2132:\src\CompilerPasses\Parser.gbas";
				func5_Error((((("RESTORE label '") + (local8_Name_Str_2404))) + ("' unknown.")), 2131, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "2124:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2311) === (func7_IsToken("READ"))) ? 1 : 0)) {
				var local5_Reads_2406 = pool_array.alloc(0);
				__debugInfo = "2134:\src\CompilerPasses\Parser.gbas";
				func5_Match("READ", 2133, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "2140:\src\CompilerPasses\Parser.gbas";
				do {
					var local1_e_2407 = 0;
					__debugInfo = "2137:\src\CompilerPasses\Parser.gbas";
					if (func7_IsToken(",")) {
						__debugInfo = "2137:\src\CompilerPasses\Parser.gbas";
						func5_Match(",", 2136, "src\CompilerPasses\Parser.gbas");
						__debugInfo = "2137:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "2138:\src\CompilerPasses\Parser.gbas";
					local1_e_2407 = func10_Identifier(0);
					__debugInfo = "2139:\src\CompilerPasses\Parser.gbas";
					DIMPUSH(local5_Reads_2406, local1_e_2407);
					__debugInfo = "2137:\src\CompilerPasses\Parser.gbas";
				} while (!((((func7_IsToken(",")) === (0)) ? 1 : 0)));
				__debugInfo = "2142:\src\CompilerPasses\Parser.gbas";
				return tryClone(func20_CreateReadExpression(unref(local5_Reads_2406)));
				__debugInfo = "2134:\src\CompilerPasses\Parser.gbas";pool_array.free(local5_Reads_2406);
			} else if ((((local17___SelectHelper27__2311) === (func7_IsToken("GOTO"))) ? 1 : 0)) {
				var local8_Name_Str_2409 = "", local4_Expr_2410 = 0, local3_Scp_2411 = 0;
				__debugInfo = "2145:\src\CompilerPasses\Parser.gbas";
				func5_Match("GOTO", 2144, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "2146:\src\CompilerPasses\Parser.gbas";
				local8_Name_Str_2409 = func14_GetCurrent_Str();
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
				local4_Expr_2410 = func20_CreateGotoExpression(local8_Name_Str_2409);
				__debugInfo = "2156:\src\CompilerPasses\Parser.gbas";
				local3_Scp_2411 = global8_Compiler.attr14_ImportantScope;
				__debugInfo = "2159:\src\CompilerPasses\Parser.gbas";
				if ((((local3_Scp_2411) === (-(1))) ? 1 : 0)) {
					__debugInfo = "2158:\src\CompilerPasses\Parser.gbas";
					func5_Error("Internal error (GOTO Scp is -1", 2157, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "2158:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2161:\src\CompilerPasses\Parser.gbas";
				DIMPUSH(global5_Exprs_ref[0].arrAccess(local3_Scp_2411).values[tmpPositionCache][0].attr5_Gotos, local4_Expr_2410);
				__debugInfo = "2162:\src\CompilerPasses\Parser.gbas";
				return tryClone(local4_Expr_2410);
				__debugInfo = "2145:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2311) === (func7_IsToken("INC"))) ? 1 : 0)) {
				var local4_Vari_2412 = 0, local7_AddExpr_2413 = 0;
				__debugInfo = "2164:\src\CompilerPasses\Parser.gbas";
				func5_Match("INC", 2163, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "2165:\src\CompilerPasses\Parser.gbas";
				local4_Vari_2412 = func10_Identifier(0);
				__debugInfo = "2166:\src\CompilerPasses\Parser.gbas";
				if (global5_Exprs_ref[0].arrAccess(local4_Vari_2412).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) {
					__debugInfo = "2166:\src\CompilerPasses\Parser.gbas";
					func5_Error("Cannot increment array...", 2165, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "2166:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2168:\src\CompilerPasses\Parser.gbas";
				{
					var local17___SelectHelper30__2414 = "";
					__debugInfo = "2168:\src\CompilerPasses\Parser.gbas";
					local17___SelectHelper30__2414 = global5_Exprs_ref[0].arrAccess(local4_Vari_2412).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str;
					__debugInfo = "2192:\src\CompilerPasses\Parser.gbas";
					if ((((local17___SelectHelper30__2414) === ("int")) ? 1 : 0)) {
						__debugInfo = "2175:\src\CompilerPasses\Parser.gbas";
						if (func7_IsToken(",")) {
							__debugInfo = "2171:\src\CompilerPasses\Parser.gbas";
							func5_Match(",", 2170, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "2172:\src\CompilerPasses\Parser.gbas";
							local7_AddExpr_2413 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 2171, 0);
							__debugInfo = "2171:\src\CompilerPasses\Parser.gbas";
						} else {
							__debugInfo = "2174:\src\CompilerPasses\Parser.gbas";
							local7_AddExpr_2413 = func19_CreateIntExpression(1);
							__debugInfo = "2174:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "2175:\src\CompilerPasses\Parser.gbas";
					} else if ((((local17___SelectHelper30__2414) === ("float")) ? 1 : 0)) {
						__debugInfo = "2182:\src\CompilerPasses\Parser.gbas";
						if (func7_IsToken(",")) {
							__debugInfo = "2178:\src\CompilerPasses\Parser.gbas";
							func5_Match(",", 2177, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "2179:\src\CompilerPasses\Parser.gbas";
							local7_AddExpr_2413 = func14_EnsureDatatype(func10_Expression(0), global13_floatDatatype, 2178, 0);
							__debugInfo = "2178:\src\CompilerPasses\Parser.gbas";
						} else {
							__debugInfo = "2181:\src\CompilerPasses\Parser.gbas";
							local7_AddExpr_2413 = func21_CreateFloatExpression(1);
							__debugInfo = "2181:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "2182:\src\CompilerPasses\Parser.gbas";
					} else if ((((local17___SelectHelper30__2414) === ("string")) ? 1 : 0)) {
						__debugInfo = "2189:\src\CompilerPasses\Parser.gbas";
						if (func7_IsToken(",")) {
							__debugInfo = "2185:\src\CompilerPasses\Parser.gbas";
							func5_Match(",", 2184, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "2186:\src\CompilerPasses\Parser.gbas";
							local7_AddExpr_2413 = func14_EnsureDatatype(func10_Expression(0), global11_strDatatype, 2185, 0);
							__debugInfo = "2185:\src\CompilerPasses\Parser.gbas";
						} else {
							__debugInfo = "2188:\src\CompilerPasses\Parser.gbas";
							local7_AddExpr_2413 = func19_CreateStrExpression(" ");
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
				return tryClone(func19_CreateIncExpression(local4_Vari_2412, local7_AddExpr_2413));
				__debugInfo = "2164:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2311) === (func7_IsToken("DEC"))) ? 1 : 0)) {
				var local4_Vari_2415 = 0, local7_AddExpr_2416 = 0;
				__debugInfo = "2195:\src\CompilerPasses\Parser.gbas";
				func5_Match("DEC", 2194, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "2196:\src\CompilerPasses\Parser.gbas";
				local4_Vari_2415 = func10_Identifier(0);
				__debugInfo = "2198:\src\CompilerPasses\Parser.gbas";
				if (global5_Exprs_ref[0].arrAccess(local4_Vari_2415).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray) {
					__debugInfo = "2198:\src\CompilerPasses\Parser.gbas";
					func5_Error("Cannot decrement array...", 2197, "src\CompilerPasses\Parser.gbas");
					__debugInfo = "2198:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2199:\src\CompilerPasses\Parser.gbas";
				{
					var local17___SelectHelper31__2417 = "";
					__debugInfo = "2199:\src\CompilerPasses\Parser.gbas";
					local17___SelectHelper31__2417 = global5_Exprs_ref[0].arrAccess(local4_Vari_2415).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str;
					__debugInfo = "2220:\src\CompilerPasses\Parser.gbas";
					if ((((local17___SelectHelper31__2417) === ("int")) ? 1 : 0)) {
						__debugInfo = "2207:\src\CompilerPasses\Parser.gbas";
						if (func7_IsToken(",")) {
							var alias2_Op_ref_2418 = [pool_TOperator.alloc()];
							__debugInfo = "2202:\src\CompilerPasses\Parser.gbas";
							func5_Match(",", 2201, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "2203:\src\CompilerPasses\Parser.gbas";
							alias2_Op_ref_2418 = global9_Operators_ref[0].arrAccess(func14_SearchOperator("sub")).values[tmpPositionCache] /* ALIAS */;
							__debugInfo = "2204:\src\CompilerPasses\Parser.gbas";
							local7_AddExpr_2416 = func24_CreateOperatorExpression(unref(alias2_Op_ref_2418[0]), func19_CreateIntExpression(0), func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 2203, 0));
							__debugInfo = "2202:\src\CompilerPasses\Parser.gbas";pool_TOperator.free(alias2_Op_ref_2418);
						} else {
							__debugInfo = "2206:\src\CompilerPasses\Parser.gbas";
							local7_AddExpr_2416 = func19_CreateIntExpression(-(1));
							__debugInfo = "2206:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "2207:\src\CompilerPasses\Parser.gbas";
					} else if ((((local17___SelectHelper31__2417) === ("float")) ? 1 : 0)) {
						__debugInfo = "2215:\src\CompilerPasses\Parser.gbas";
						if (func7_IsToken(",")) {
							var alias2_Op_ref_2419 = [pool_TOperator.alloc()];
							__debugInfo = "2210:\src\CompilerPasses\Parser.gbas";
							func5_Match(",", 2209, "src\CompilerPasses\Parser.gbas");
							__debugInfo = "2211:\src\CompilerPasses\Parser.gbas";
							alias2_Op_ref_2419 = global9_Operators_ref[0].arrAccess(func14_SearchOperator("sub")).values[tmpPositionCache] /* ALIAS */;
							__debugInfo = "2212:\src\CompilerPasses\Parser.gbas";
							local7_AddExpr_2416 = func24_CreateOperatorExpression(unref(alias2_Op_ref_2419[0]), func21_CreateFloatExpression(0), func14_EnsureDatatype(func10_Expression(0), global13_floatDatatype, 2211, 0));
							__debugInfo = "2210:\src\CompilerPasses\Parser.gbas";pool_TOperator.free(alias2_Op_ref_2419);
						} else {
							__debugInfo = "2214:\src\CompilerPasses\Parser.gbas";
							local7_AddExpr_2416 = func21_CreateFloatExpression(-(1));
							__debugInfo = "2214:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "2215:\src\CompilerPasses\Parser.gbas";
					} else if ((((local17___SelectHelper31__2417) === ("string")) ? 1 : 0)) {
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
				return tryClone(func19_CreateIncExpression(local4_Vari_2415, local7_AddExpr_2416));
				__debugInfo = "2195:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2311) === (func7_IsToken("ASSERT"))) ? 1 : 0)) {
				var local4_Expr_2420 = 0;
				__debugInfo = "2223:\src\CompilerPasses\Parser.gbas";
				func5_Match("ASSERT", 2222, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "2224:\src\CompilerPasses\Parser.gbas";
				local4_Expr_2420 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 2223, 0);
				__debugInfo = "2228:\src\CompilerPasses\Parser.gbas";
				if (global9_DEBUGMODE) {
					__debugInfo = "2227:\src\CompilerPasses\Parser.gbas";
					return tryClone(func22_CreateAssertExpression(local4_Expr_2420));
					__debugInfo = "2227:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2223:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper27__2311) === (func7_IsToken("DEBUG"))) ? 1 : 0)) {
				var local4_Expr_2421 = 0;
				__debugInfo = "2230:\src\CompilerPasses\Parser.gbas";
				func5_Match("DEBUG", 2229, "src\CompilerPasses\Parser.gbas");
				__debugInfo = "2231:\src\CompilerPasses\Parser.gbas";
				local4_Expr_2421 = func14_EnsureDatatype(func10_Expression(0), global11_strDatatype, 2230, 0);
				__debugInfo = "2235:\src\CompilerPasses\Parser.gbas";
				if (global9_DEBUGMODE) {
					__debugInfo = "2234:\src\CompilerPasses\Parser.gbas";
					return tryClone(func27_CreateDebugOutputExpression(local4_Expr_2421));
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
				var local3_pos_2422 = 0, local4_Vari_2423 = pool_TIdentifierVari.alloc();
				__debugInfo = "2247:\src\CompilerPasses\Parser.gbas";
				local3_pos_2422 = global8_Compiler.attr11_currentPosi;
				__debugInfo = "2251:\src\CompilerPasses\Parser.gbas";
				local4_Vari_2423 = func7_VariDef(1).clone(/* In Assign */);
				__debugInfo = "2252:\src\CompilerPasses\Parser.gbas";
				local4_Vari_2423.attr3_Typ = ~~(2);
				__debugInfo = "2253:\src\CompilerPasses\Parser.gbas";
				func11_AddVariable(local4_Vari_2423, 0);
				__debugInfo = "2254:\src\CompilerPasses\Parser.gbas";
				DIMPUSH(global8_Compiler.attr7_Globals, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
				__debugInfo = "2255:\src\CompilerPasses\Parser.gbas";
				func7_Warning((((("Implicit variable declaration '") + (local4_Vari_2423.attr8_Name_Str))) + ("'")));
				__debugInfo = "2258:\src\CompilerPasses\Parser.gbas";
				global8_Compiler.attr11_currentPosi = ((local3_pos_2422) - (1));
				__debugInfo = "2259:\src\CompilerPasses\Parser.gbas";
				func7_GetNext();
				__debugInfo = "2262:\src\CompilerPasses\Parser.gbas";
				return tryClone(((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
				__debugInfo = "2247:\src\CompilerPasses\Parser.gbas";pool_TIdentifierVari.free(local4_Vari_2423);
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
		var local11_Current_Str_2428 = "", local5_dummy_ref_2429 = [0], local5_Varis_2430 = pool_array.alloc(0);
		__debugInfo = "2275:\src\CompilerPasses\Parser.gbas";
		if ((((func7_IsToken("GLOBAL")) || (func7_IsToken("LOCAL"))) ? 1 : 0)) {
			__debugInfo = "2275:\src\CompilerPasses\Parser.gbas";
			return 1;
			__debugInfo = "2275:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2287:\src\CompilerPasses\Parser.gbas";
		if ((((func6_IsType("")) && (param9_CheckType)) ? 1 : 0)) {
			var local3_pos_2426 = 0, local3_ret_2427 = 0;
			__debugInfo = "2278:\src\CompilerPasses\Parser.gbas";
			local3_pos_2426 = global8_Compiler.attr11_currentPosi;
			__debugInfo = "2279:\src\CompilerPasses\Parser.gbas";
			func7_GetNext();
			__debugInfo = "2285:\src\CompilerPasses\Parser.gbas";
			if (func7_IsToken("(")) {
				__debugInfo = "2282:\src\CompilerPasses\Parser.gbas";
				local3_ret_2427 = 1;
				__debugInfo = "2282:\src\CompilerPasses\Parser.gbas";
			} else {
				__debugInfo = "2284:\src\CompilerPasses\Parser.gbas";
				local3_ret_2427 = 0;
				__debugInfo = "2284:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "2286:\src\CompilerPasses\Parser.gbas";
			global8_Compiler.attr11_currentPosi = local3_pos_2426;
			__debugInfo = "2278:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2289:\src\CompilerPasses\Parser.gbas";
		local11_Current_Str_2428 = func14_GetCurrent_Str();
		__debugInfo = "2297:\src\CompilerPasses\Parser.gbas";
		if ((global8_Compiler.attr11_GlobalFuncs).GetValue(local11_Current_Str_2428, local5_dummy_ref_2429)) {
			__debugInfo = "2297:\src\CompilerPasses\Parser.gbas";
			return 1;
			__debugInfo = "2297:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2300:\src\CompilerPasses\Parser.gbas";
		func8_GetVaris(unref(local5_Varis_2430), -(1), 0);
		__debugInfo = "2300:\src\CompilerPasses\Parser.gbas";
		{
			var local1_i_2431 = 0.0;
			__debugInfo = "2309:\src\CompilerPasses\Parser.gbas";
			for (local1_i_2431 = ((BOUNDS(local5_Varis_2430, 0)) - (1));toCheck(local1_i_2431, 0, -(1));local1_i_2431 += -(1)) {
				__debugInfo = "2308:\src\CompilerPasses\Parser.gbas";
				if ((((func17_CleanVariable_Str(local11_Current_Str_2428)) === (global8_Compiler.attr5_Varis_ref[0].arrAccess(local5_Varis_2430.arrAccess(~~(local1_i_2431)).values[tmpPositionCache]).values[tmpPositionCache][0].attr8_Name_Str)) ? 1 : 0)) {
					__debugInfo = "2307:\src\CompilerPasses\Parser.gbas";
					if ((((param18_IgnoreImplicitSelf) && ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local5_Varis_2430.arrAccess(~~(local1_i_2431)).values[tmpPositionCache]).values[tmpPositionCache][0].attr3_Typ) === (3)) ? 1 : 0))) ? 1 : 0)) {
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
			var alias3_Typ_ref_2432 = [pool_TIdentifierType.alloc()], local5_myTyp_2433 = 0;
			__debugInfo = "2313:\src\CompilerPasses\Parser.gbas";
			alias3_Typ_ref_2432 = global8_Compiler.attr5_Types_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType).values[tmpPositionCache] /* ALIAS */;
			__debugInfo = "2314:\src\CompilerPasses\Parser.gbas";
			local5_myTyp_2433 = alias3_Typ_ref_2432[0].attr2_ID;
			__debugInfo = "2323:\src\CompilerPasses\Parser.gbas";
			while ((((local5_myTyp_2433) !== (-(1))) ? 1 : 0)) {
				__debugInfo = "2320:\src\CompilerPasses\Parser.gbas";
				var forEachSaver21667 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_myTyp_2433).values[tmpPositionCache][0].attr7_Methods;
				for(var forEachCounter21667 = 0 ; forEachCounter21667 < forEachSaver21667.values.length ; forEachCounter21667++) {
					var local1_M_2434 = forEachSaver21667.values[forEachCounter21667];
				{
						__debugInfo = "2319:\src\CompilerPasses\Parser.gbas";
						if (func7_IsToken(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local1_M_2434).values[tmpPositionCache][0].attr8_Name_Str)) {
							__debugInfo = "2318:\src\CompilerPasses\Parser.gbas";
							return 1;
							__debugInfo = "2318:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "2319:\src\CompilerPasses\Parser.gbas";
					}
					forEachSaver21667.values[forEachCounter21667] = local1_M_2434;
				
				};
				__debugInfo = "2322:\src\CompilerPasses\Parser.gbas";
				local5_myTyp_2433 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_myTyp_2433).values[tmpPositionCache][0].attr9_Extending;
				__debugInfo = "2320:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "2328:\src\CompilerPasses\Parser.gbas";
			var forEachSaver21698 = alias3_Typ_ref_2432[0].attr10_Attributes;
			for(var forEachCounter21698 = 0 ; forEachCounter21698 < forEachSaver21698.values.length ; forEachCounter21698++) {
				var local1_A_2435 = forEachSaver21698.values[forEachCounter21698];
			{
					__debugInfo = "2327:\src\CompilerPasses\Parser.gbas";
					if (func7_IsToken(global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_A_2435).values[tmpPositionCache][0].attr8_Name_Str)) {
						__debugInfo = "2326:\src\CompilerPasses\Parser.gbas";
						return 1;
						__debugInfo = "2326:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "2327:\src\CompilerPasses\Parser.gbas";
				}
				forEachSaver21698.values[forEachCounter21698] = local1_A_2435;
			
			};
			__debugInfo = "2313:\src\CompilerPasses\Parser.gbas";pool_TIdentifierType.free(alias3_Typ_ref_2432);
		};
		__debugInfo = "2331:\src\CompilerPasses\Parser.gbas";
		return tryClone(0);
		__debugInfo = "2332:\src\CompilerPasses\Parser.gbas";
		return 0;
		__debugInfo = "2275:\src\CompilerPasses\Parser.gbas";pool_array.free(local5_Varis_2430);
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
			var local1_i_2436 = 0.0;
			__debugInfo = "2340:\src\CompilerPasses\Parser.gbas";
			for (local1_i_2436 = 0;toCheck(local1_i_2436, (((func14_GetCurrent_Str()).length) - (1)), 1);local1_i_2436 += 1) {
				__debugInfo = "2339:\src\CompilerPasses\Parser.gbas";
				if (((((((ASC(func14_GetCurrent_Str(), ~~(local1_i_2436))) < (48)) ? 1 : 0)) || ((((ASC(func14_GetCurrent_Str(), ~~(local1_i_2436))) > (57)) ? 1 : 0))) ? 1 : 0)) {
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
		var forEachSaver21799 = global8_Compiler.attr5_Types_ref[0];
		for(var forEachCounter21799 = 0 ; forEachCounter21799 < forEachSaver21799.values.length ; forEachCounter21799++) {
			var local3_typ_ref_2438 = forEachSaver21799.values[forEachCounter21799];
		{
				__debugInfo = "2360:\src\CompilerPasses\Parser.gbas";
				if ((((local3_typ_ref_2438[0].attr12_RealName_Str) === (param7_Str_Str)) ? 1 : 0)) {
					__debugInfo = "2358:\src\CompilerPasses\Parser.gbas";
					global8_LastType = local3_typ_ref_2438[0].clone(/* In Assign */);
					__debugInfo = "2359:\src\CompilerPasses\Parser.gbas";
					return 1;
					__debugInfo = "2358:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2360:\src\CompilerPasses\Parser.gbas";
			}
			forEachSaver21799.values[forEachCounter21799] = local3_typ_ref_2438;
		
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
		var local4_Vars_2440 = pool_array.alloc(0);
		__debugInfo = "2368:\src\CompilerPasses\Parser.gbas";
		func8_GetVaris(unref(local4_Vars_2440), -(1), 0);
		__debugInfo = "2368:\src\CompilerPasses\Parser.gbas";
		{
			var local1_i_2441 = 0.0;
			__debugInfo = "2371:\src\CompilerPasses\Parser.gbas";
			for (local1_i_2441 = ((BOUNDS(local4_Vars_2440, 0)) - (1));toCheck(local1_i_2441, 0, -(1));local1_i_2441 += -(1)) {
				__debugInfo = "2370:\src\CompilerPasses\Parser.gbas";
				if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Vars_2440.arrAccess(~~(local1_i_2441)).values[tmpPositionCache]).values[tmpPositionCache][0].attr8_Name_Str) === (param7_Var_Str)) ? 1 : 0)) {
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
		__debugInfo = "2368:\src\CompilerPasses\Parser.gbas";pool_array.free(local4_Vars_2440);
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
		var forEachSaver21924 = global8_Compiler.attr5_Types_ref[0];
		for(var forEachCounter21924 = 0 ; forEachCounter21924 < forEachSaver21924.values.length ; forEachCounter21924++) {
			var local1_T_ref_2444 = forEachSaver21924.values[forEachCounter21924];
		{
				__debugInfo = "2394:\src\CompilerPasses\Parser.gbas";
				if ((((local1_T_ref_2444[0].attr8_Name_Str) === (param8_func_Str)) ? 1 : 0)) {
					__debugInfo = "2394:\src\CompilerPasses\Parser.gbas";
					return 1;
					__debugInfo = "2394:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2394:\src\CompilerPasses\Parser.gbas";
			}
			forEachSaver21924.values[forEachCounter21924] = local1_T_ref_2444;
		
		};
		__debugInfo = "2397:\src\CompilerPasses\Parser.gbas";
		if ((global10_KeywordMap).DoesKeyExist(param8_func_Str)) {
			__debugInfo = "2397:\src\CompilerPasses\Parser.gbas";
			return 1;
			__debugInfo = "2397:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2401:\src\CompilerPasses\Parser.gbas";
		var forEachSaver21968 = global8_Compiler.attr5_Funcs_ref[0];
		for(var forEachCounter21968 = 0 ; forEachCounter21968 < forEachSaver21968.values.length ; forEachCounter21968++) {
			var local1_F_ref_2445 = forEachSaver21968.values[forEachCounter21968];
		{
				__debugInfo = "2400:\src\CompilerPasses\Parser.gbas";
				if ((((((((((param8_func_Str) === (local1_F_ref_2445[0].attr8_Name_Str)) ? 1 : 0)) && (((((((local1_F_ref_2445[0].attr3_Typ) === (2)) ? 1 : 0)) || ((((local1_F_ref_2445[0].attr3_Typ) === (1)) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) && ((((local1_F_ref_2445[0].attr10_IsCallback) === (param10_IsCallback)) ? 1 : 0))) ? 1 : 0)) {
					__debugInfo = "2400:\src\CompilerPasses\Parser.gbas";
					return 1;
					__debugInfo = "2400:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2400:\src\CompilerPasses\Parser.gbas";
			}
			forEachSaver21968.values[forEachCounter21968] = local1_F_ref_2445;
		
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
		var forEachSaver21989 = global9_Operators_ref[0];
		for(var forEachCounter21989 = 0 ; forEachCounter21989 < forEachSaver21989.values.length ; forEachCounter21989++) {
			var local2_Op_ref_2446 = forEachSaver21989.values[forEachCounter21989];
		{
				__debugInfo = "2409:\src\CompilerPasses\Parser.gbas";
				if (func7_IsToken(local2_Op_ref_2446[0].attr7_Sym_Str)) {
					__debugInfo = "2409:\src\CompilerPasses\Parser.gbas";
					return 1;
					__debugInfo = "2409:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2409:\src\CompilerPasses\Parser.gbas";
			}
			forEachSaver21989.values[forEachCounter21989] = local2_Op_ref_2446;
		
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
		var forEachSaver22024 = global8_Compiler.attr5_Funcs_ref[0];
		for(var forEachCounter22024 = 0 ; forEachCounter22024 < forEachSaver22024.values.length ; forEachCounter22024++) {
			var local4_func_ref_2447 = forEachSaver22024.values[forEachCounter22024];
		{
				__debugInfo = "2423:\src\CompilerPasses\Parser.gbas";
				if (((((((local4_func_ref_2447[0].attr3_Typ) === (4)) ? 1 : 0)) && (func7_IsToken(local4_func_ref_2447[0].attr8_Name_Str))) ? 1 : 0)) {
					__debugInfo = "2422:\src\CompilerPasses\Parser.gbas";
					return 1;
					__debugInfo = "2422:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2423:\src\CompilerPasses\Parser.gbas";
			}
			forEachSaver22024.values[forEachCounter22024] = local4_func_ref_2447;
		
		};
		__debugInfo = "2428:\src\CompilerPasses\Parser.gbas";
		var forEachSaver22038 = global8_Compiler.attr5_Types_ref[0];
		for(var forEachCounter22038 = 0 ; forEachCounter22038 < forEachSaver22038.values.length ; forEachCounter22038++) {
			var local3_typ_ref_2448 = forEachSaver22038.values[forEachCounter22038];
		{
				__debugInfo = "2427:\src\CompilerPasses\Parser.gbas";
				STDOUT(((local3_typ_ref_2448[0].attr12_RealName_Str) + ("\n")));
				__debugInfo = "2427:\src\CompilerPasses\Parser.gbas";
			}
			forEachSaver22038.values[forEachCounter22038] = local3_typ_ref_2448;
		
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
		var forEachSaver22075 = global7_Defines;
		for(var forEachCounter22075 = 0 ; forEachCounter22075 < forEachSaver22075.values.length ; forEachCounter22075++) {
			var local3_Def_2450 = forEachSaver22075.values[forEachCounter22075];
		{
				__debugInfo = "2440:\src\CompilerPasses\Parser.gbas";
				if ((((local3_Def_2450.attr7_Key_Str) === (param7_Def_Str)) ? 1 : 0)) {
					__debugInfo = "2438:\src\CompilerPasses\Parser.gbas";
					global10_LastDefine = local3_Def_2450.clone(/* In Assign */);
					__debugInfo = "2439:\src\CompilerPasses\Parser.gbas";
					return 1;
					__debugInfo = "2438:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2440:\src\CompilerPasses\Parser.gbas";
			}
			forEachSaver22075.values[forEachCounter22075] = local3_Def_2450;
		
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
			var forEachSaver22122 = global8_Compiler.attr7_Globals;
			for(var forEachCounter22122 = 0 ; forEachCounter22122 < forEachSaver22122.values.length ; forEachCounter22122++) {
				var local4_Vari_2454 = forEachSaver22122.values[forEachCounter22122];
			{
					__debugInfo = "2452:\src\CompilerPasses\Parser.gbas";
					DIMPUSH(param5_Varis, local4_Vari_2454);
					__debugInfo = "2452:\src\CompilerPasses\Parser.gbas";
				}
				forEachSaver22122.values[forEachCounter22122] = local4_Vari_2454;
			
			};
			__debugInfo = "2453:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2467:\src\CompilerPasses\Parser.gbas";
		if ((((param3_Scp) !== (-(1))) ? 1 : 0)) {
			__debugInfo = "2459:\src\CompilerPasses\Parser.gbas";
			var forEachSaver22146 = global5_Exprs_ref[0].arrAccess(~~(param3_Scp)).values[tmpPositionCache][0].attr5_Varis;
			for(var forEachCounter22146 = 0 ; forEachCounter22146 < forEachSaver22146.values.length ; forEachCounter22146++) {
				var local4_Vari_2455 = forEachSaver22146.values[forEachCounter22146];
			{
					__debugInfo = "2458:\src\CompilerPasses\Parser.gbas";
					DIMPUSH(param5_Varis, local4_Vari_2455);
					__debugInfo = "2458:\src\CompilerPasses\Parser.gbas";
				}
				forEachSaver22146.values[forEachCounter22146] = local4_Vari_2455;
			
			};
			__debugInfo = "2466:\src\CompilerPasses\Parser.gbas";
			if (((((((global8_Compiler.attr11_currentFunc) !== (-(1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType) !== (-(1))) ? 1 : 0))) ? 1 : 0)) {
				var alias3_Typ_ref_2456 = [pool_TIdentifierType.alloc()];
				__debugInfo = "2462:\src\CompilerPasses\Parser.gbas";
				alias3_Typ_ref_2456 = global8_Compiler.attr5_Types_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType).values[tmpPositionCache] /* ALIAS */;
				__debugInfo = "2465:\src\CompilerPasses\Parser.gbas";
				var forEachSaver22195 = alias3_Typ_ref_2456[0].attr10_Attributes;
				for(var forEachCounter22195 = 0 ; forEachCounter22195 < forEachSaver22195.values.length ; forEachCounter22195++) {
					var local1_A_2457 = forEachSaver22195.values[forEachCounter22195];
				{
						__debugInfo = "2464:\src\CompilerPasses\Parser.gbas";
						DIMPUSH(param5_Varis, local1_A_2457);
						__debugInfo = "2464:\src\CompilerPasses\Parser.gbas";
					}
					forEachSaver22195.values[forEachCounter22195] = local1_A_2457;
				
				};
				__debugInfo = "2462:\src\CompilerPasses\Parser.gbas";pool_TIdentifierType.free(alias3_Typ_ref_2456);
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
			var forEachSaver22244 = global8_Compiler.attr7_Globals;
			for(var forEachCounter22244 = 0 ; forEachCounter22244 < forEachSaver22244.values.length ; forEachCounter22244++) {
				var local4_Vari_2458 = forEachSaver22244.values[forEachCounter22244];
			{
					__debugInfo = "2474:\src\CompilerPasses\Parser.gbas";
					DIMPUSH(param5_Varis, local4_Vari_2458);
					__debugInfo = "2474:\src\CompilerPasses\Parser.gbas";
				}
				forEachSaver22244.values[forEachCounter22244] = local4_Vari_2458;
			
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
		var local6_hasErr_2461 = 0;
		__debugInfo = "2484:\src\CompilerPasses\Parser.gbas";
		local6_hasErr_2461 = 0;
		__debugInfo = "2485:\src\CompilerPasses\Parser.gbas";
		{
			var local17___SelectHelper32__2462 = 0;
			__debugInfo = "2485:\src\CompilerPasses\Parser.gbas";
			local17___SelectHelper32__2462 = global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr3_Typ;
			__debugInfo = "2508:\src\CompilerPasses\Parser.gbas";
			if ((((local17___SelectHelper32__2462) === (~~(9))) ? 1 : 0)) {
				__debugInfo = "2487:\src\CompilerPasses\Parser.gbas";
				return tryClone(global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr4_vari);
				__debugInfo = "2487:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper32__2462) === (~~(13))) ? 1 : 0)) {
				__debugInfo = "2489:\src\CompilerPasses\Parser.gbas";
				return tryClone(func11_GetVariable(global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr5_array, param3_err));
				__debugInfo = "2489:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper32__2462) === (~~(18))) ? 1 : 0)) {
				__debugInfo = "2491:\src\CompilerPasses\Parser.gbas";
				return tryClone(func11_GetVariable(global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr8_nextExpr, param3_err));
				__debugInfo = "2491:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper32__2462) === (~~(54))) ? 1 : 0)) {
				__debugInfo = "2493:\src\CompilerPasses\Parser.gbas";
				return tryClone(func11_GetVariable(global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr4_expr, param3_err));
				__debugInfo = "2493:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper32__2462) === (~~(6))) ? 1 : 0)) {
				__debugInfo = "2505:\src\CompilerPasses\Parser.gbas";
				if ((((global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr4_func) !== (-(1))) ? 1 : 0)) {
					var alias4_func_ref_2463 = [pool_TIdentifierFunc.alloc()];
					__debugInfo = "2496:\src\CompilerPasses\Parser.gbas";
					alias4_func_ref_2463 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache] /* ALIAS */;
					__debugInfo = "2502:\src\CompilerPasses\Parser.gbas";
					if ((((alias4_func_ref_2463[0].attr3_Typ) === (3)) ? 1 : 0)) {
						__debugInfo = "2499:\src\CompilerPasses\Parser.gbas";
						return tryClone(-(1));
						__debugInfo = "2499:\src\CompilerPasses\Parser.gbas";
					} else {
						__debugInfo = "2501:\src\CompilerPasses\Parser.gbas";
						local6_hasErr_2461 = 1;
						__debugInfo = "2501:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "2496:\src\CompilerPasses\Parser.gbas";pool_TIdentifierFunc.free(alias4_func_ref_2463);
				} else {
					__debugInfo = "2504:\src\CompilerPasses\Parser.gbas";
					local6_hasErr_2461 = 1;
					__debugInfo = "2504:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2505:\src\CompilerPasses\Parser.gbas";
			} else {
				__debugInfo = "2507:\src\CompilerPasses\Parser.gbas";
				local6_hasErr_2461 = 1;
				__debugInfo = "2507:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "2485:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2517:\src\CompilerPasses\Parser.gbas";
		if ((((local6_hasErr_2461) && (param3_err)) ? 1 : 0)) {
			var local7_add_Str_2464 = "";
			__debugInfo = "2510:\src\CompilerPasses\Parser.gbas";
			local7_add_Str_2464 = "";
			__debugInfo = "2514:\src\CompilerPasses\Parser.gbas";
			func5_Error((("Variable expected.") + (local7_add_Str_2464)), 2513, "src\CompilerPasses\Parser.gbas");
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
			var local17___SelectHelper33__2466 = 0;
			__debugInfo = "2522:\src\CompilerPasses\Parser.gbas";
			local17___SelectHelper33__2466 = global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr3_Typ;
			__debugInfo = "2527:\src\CompilerPasses\Parser.gbas";
			if ((((local17___SelectHelper33__2466) === (~~(18))) ? 1 : 0)) {
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
		var local8_startpos_2472 = 0;
		__debugInfo = "2539:\src\CompilerPasses\Parser.gbas";
		local8_startpos_2472 = global8_Compiler.attr11_currentPosi;
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
			var local6_tmpPos_2473 = 0.0;
			__debugInfo = "2547:\src\CompilerPasses\Parser.gbas";
			local6_tmpPos_2473 = global8_Compiler.attr11_currentPosi;
			__debugInfo = "2548:\src\CompilerPasses\Parser.gbas";
			global8_Compiler.attr11_currentPosi = local8_startpos_2472;
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
						global8_Compiler.attr11_currentPosi = ~~(local6_tmpPos_2473);
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
		var alias4_Func_ref_2476 = [pool_TIdentifierFunc.alloc()], local8_Text_Str_2477 = "", local5_Found_2478 = 0;
		__debugInfo = "2561:\src\CompilerPasses\Parser.gbas";
		alias4_Func_ref_2476 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(param1_F).values[tmpPositionCache] /* ALIAS */;
		__debugInfo = "2562:\src\CompilerPasses\Parser.gbas";
		local8_Text_Str_2477 = (((((("RETURN TYPE: ") + (alias4_Func_ref_2476[0].attr8_datatype.attr8_Name_Str))) + (func20_BuildArrBrackets_Str(alias4_Func_ref_2476[0].attr8_datatype.attr7_IsArray)))) + (" PARAMETER:"));
		__debugInfo = "2563:\src\CompilerPasses\Parser.gbas";
		local5_Found_2478 = 0;
		__debugInfo = "2569:\src\CompilerPasses\Parser.gbas";
		var forEachSaver22586 = alias4_Func_ref_2476[0].attr6_Params;
		for(var forEachCounter22586 = 0 ; forEachCounter22586 < forEachSaver22586.values.length ; forEachCounter22586++) {
			var local1_P_2479 = forEachSaver22586.values[forEachCounter22586];
		{
				var alias5_Param_ref_2480 = [pool_TIdentifierVari.alloc()];
				__debugInfo = "2565:\src\CompilerPasses\Parser.gbas";
				alias5_Param_ref_2480 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_2479).values[tmpPositionCache] /* ALIAS */;
				__debugInfo = "2566:\src\CompilerPasses\Parser.gbas";
				if (local5_Found_2478) {
					__debugInfo = "2566:\src\CompilerPasses\Parser.gbas";
					local8_Text_Str_2477 = ((local8_Text_Str_2477) + (", "));
					__debugInfo = "2566:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2567:\src\CompilerPasses\Parser.gbas";
				local8_Text_Str_2477 = ((((local8_Text_Str_2477) + (alias5_Param_ref_2480[0].attr8_datatype.attr8_Name_Str))) + (func20_BuildArrBrackets_Str(alias5_Param_ref_2480[0].attr8_datatype.attr7_IsArray)));
				__debugInfo = "2568:\src\CompilerPasses\Parser.gbas";
				local5_Found_2478 = 1;
				__debugInfo = "2565:\src\CompilerPasses\Parser.gbas";pool_TIdentifierVari.free(alias5_Param_ref_2480);
			}
			forEachSaver22586.values[forEachCounter22586] = local1_P_2479;
		
		};
		__debugInfo = "2571:\src\CompilerPasses\Parser.gbas";
		return tryClone(local8_Text_Str_2477);
		__debugInfo = "2572:\src\CompilerPasses\Parser.gbas";
		return "";
		__debugInfo = "2561:\src\CompilerPasses\Parser.gbas";pool_TIdentifierFunc.free(alias4_Func_ref_2476);
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
		var local3_Ret_ref_2482 = [0];
		__debugInfo = "2589:\src\CompilerPasses\Parser.gbas";
		if ((global8_Compiler.attr11_GlobalFuncs).GetValue(param8_Name_Str, local3_Ret_ref_2482)) {
			__debugInfo = "2585:\src\CompilerPasses\Parser.gbas";
			if ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Ret_ref_2482[0]).values[tmpPositionCache][0].attr3_Typ) === (2)) ? 1 : 0)) {
				__debugInfo = "2582:\src\CompilerPasses\Parser.gbas";
				return tryClone(-(1));
				__debugInfo = "2582:\src\CompilerPasses\Parser.gbas";
			} else {
				__debugInfo = "2584:\src\CompilerPasses\Parser.gbas";
				return tryClone(unref(local3_Ret_ref_2482[0]));
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
		var forEachSaver22652 = global9_Operators_ref[0];
		for(var forEachCounter22652 = 0 ; forEachCounter22652 < forEachSaver22652.values.length ; forEachCounter22652++) {
			var local2_Op_ref_2484 = forEachSaver22652.values[forEachCounter22652];
		{
				__debugInfo = "2595:\src\CompilerPasses\Parser.gbas";
				if (((((((local2_Op_ref_2484[0].attr7_Sym_Str) === (param8_Name_Str)) ? 1 : 0)) || ((((local2_Op_ref_2484[0].attr8_Name_Str) === (param8_Name_Str)) ? 1 : 0))) ? 1 : 0)) {
					__debugInfo = "2595:\src\CompilerPasses\Parser.gbas";
					return tryClone(local2_Op_ref_2484[0].attr2_ID);
					__debugInfo = "2595:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2595:\src\CompilerPasses\Parser.gbas";
			}
			forEachSaver22652.values[forEachCounter22652] = local2_Op_ref_2484;
		
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
		var local11_Postfix_Str_2486 = "";
		__debugInfo = "2602:\src\CompilerPasses\Parser.gbas";
		local11_Postfix_Str_2486 = RIGHT_Str(param7_Var_Str, 1);
		__debugInfo = "2607:\src\CompilerPasses\Parser.gbas";
		if (((((((local11_Postfix_Str_2486) === ("%")) ? 1 : 0)) || ((((local11_Postfix_Str_2486) === ("#")) ? 1 : 0))) ? 1 : 0)) {
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
		var forEachSaver22857 = param3_scp.attr5_Exprs;
		for(var forEachCounter22857 = 0 ; forEachCounter22857 < forEachSaver22857.values.length ; forEachCounter22857++) {
			var local1_E_2488 = forEachSaver22857.values[forEachCounter22857];
		{
				var alias4_SubE_ref_2489 = [pool_TExpr.alloc()];
				__debugInfo = "2613:\src\CompilerPasses\Parser.gbas";
				alias4_SubE_ref_2489 = global5_Exprs_ref[0].arrAccess(local1_E_2488).values[tmpPositionCache] /* ALIAS */;
				__debugInfo = "2614:\src\CompilerPasses\Parser.gbas";
				{
					var local17___SelectHelper34__2490 = 0;
					__debugInfo = "2614:\src\CompilerPasses\Parser.gbas";
					local17___SelectHelper34__2490 = alias4_SubE_ref_2489[0].attr3_Typ;
					__debugInfo = "2641:\src\CompilerPasses\Parser.gbas";
					if ((((local17___SelectHelper34__2490) === (~~(24))) ? 1 : 0)) {
						__debugInfo = "2618:\src\CompilerPasses\Parser.gbas";
						var forEachSaver22737 = alias4_SubE_ref_2489[0].attr6_Scopes;
						for(var forEachCounter22737 = 0 ; forEachCounter22737 < forEachSaver22737.values.length ; forEachCounter22737++) {
							var local1_E_2491 = forEachSaver22737.values[forEachCounter22737];
						{
								__debugInfo = "2617:\src\CompilerPasses\Parser.gbas";
								if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(local1_E_2491).values[tmpPositionCache][0]))) {
									__debugInfo = "2617:\src\CompilerPasses\Parser.gbas";
									return 1;
									__debugInfo = "2617:\src\CompilerPasses\Parser.gbas";
								};
								__debugInfo = "2617:\src\CompilerPasses\Parser.gbas";
							}
							forEachSaver22737.values[forEachCounter22737] = local1_E_2491;
						
						};
						__debugInfo = "2621:\src\CompilerPasses\Parser.gbas";
						if ((((alias4_SubE_ref_2489[0].attr9_elseScope) !== (-(1))) ? 1 : 0)) {
							__debugInfo = "2620:\src\CompilerPasses\Parser.gbas";
							if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(alias4_SubE_ref_2489[0].attr9_elseScope).values[tmpPositionCache][0]))) {
								__debugInfo = "2620:\src\CompilerPasses\Parser.gbas";
								return 1;
								__debugInfo = "2620:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "2620:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "2618:\src\CompilerPasses\Parser.gbas";
					} else if ((((local17___SelectHelper34__2490) === (~~(25))) ? 1 : 0)) {
						__debugInfo = "2623:\src\CompilerPasses\Parser.gbas";
						if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(alias4_SubE_ref_2489[0].attr3_Scp).values[tmpPositionCache][0]))) {
							__debugInfo = "2623:\src\CompilerPasses\Parser.gbas";
							return 1;
							__debugInfo = "2623:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "2623:\src\CompilerPasses\Parser.gbas";
					} else if ((((local17___SelectHelper34__2490) === (~~(26))) ? 1 : 0)) {
						__debugInfo = "2625:\src\CompilerPasses\Parser.gbas";
						if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(alias4_SubE_ref_2489[0].attr3_Scp).values[tmpPositionCache][0]))) {
							__debugInfo = "2625:\src\CompilerPasses\Parser.gbas";
							return 1;
							__debugInfo = "2625:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "2625:\src\CompilerPasses\Parser.gbas";
					} else if ((((local17___SelectHelper34__2490) === (~~(27))) ? 1 : 0)) {
						__debugInfo = "2627:\src\CompilerPasses\Parser.gbas";
						if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(alias4_SubE_ref_2489[0].attr3_Scp).values[tmpPositionCache][0]))) {
							__debugInfo = "2627:\src\CompilerPasses\Parser.gbas";
							return 1;
							__debugInfo = "2627:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "2627:\src\CompilerPasses\Parser.gbas";
					} else if ((((local17___SelectHelper34__2490) === (~~(38))) ? 1 : 0)) {
						__debugInfo = "2629:\src\CompilerPasses\Parser.gbas";
						if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(alias4_SubE_ref_2489[0].attr3_Scp).values[tmpPositionCache][0]))) {
							__debugInfo = "2629:\src\CompilerPasses\Parser.gbas";
							return 1;
							__debugInfo = "2629:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "2629:\src\CompilerPasses\Parser.gbas";
					} else if ((((local17___SelectHelper34__2490) === (~~(31))) ? 1 : 0)) {
						__debugInfo = "2631:\src\CompilerPasses\Parser.gbas";
						if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(alias4_SubE_ref_2489[0].attr3_Scp).values[tmpPositionCache][0]))) {
							__debugInfo = "2631:\src\CompilerPasses\Parser.gbas";
							return 1;
							__debugInfo = "2631:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "2632:\src\CompilerPasses\Parser.gbas";
						if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(alias4_SubE_ref_2489[0].attr8_catchScp).values[tmpPositionCache][0]))) {
							__debugInfo = "2632:\src\CompilerPasses\Parser.gbas";
							return 1;
							__debugInfo = "2632:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "2631:\src\CompilerPasses\Parser.gbas";
					} else if ((((local17___SelectHelper34__2490) === (~~(20))) ? 1 : 0)) {
						__debugInfo = "2634:\src\CompilerPasses\Parser.gbas";
						return 1;
						__debugInfo = "2634:\src\CompilerPasses\Parser.gbas";
					} else if ((((local17___SelectHelper34__2490) === (~~(2))) ? 1 : 0)) {
						__debugInfo = "2636:\src\CompilerPasses\Parser.gbas";
						if (func12_ScopeHasGoto(unref(alias4_SubE_ref_2489[0]))) {
							__debugInfo = "2636:\src\CompilerPasses\Parser.gbas";
							return 1;
							__debugInfo = "2636:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "2636:\src\CompilerPasses\Parser.gbas";
					} else {
						
					};
					__debugInfo = "2614:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2613:\src\CompilerPasses\Parser.gbas";pool_TExpr.free(alias4_SubE_ref_2489);
			}
			forEachSaver22857.values[forEachCounter22857] = local1_E_2488;
		
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
			var local17___SelectHelper35__2493 = 0;
			__debugInfo = "2648:\src\CompilerPasses\Parser.gbas";
			local17___SelectHelper35__2493 = param4_expr.attr6_ScpTyp;
			__debugInfo = "2672:\src\CompilerPasses\Parser.gbas";
			if ((((local17___SelectHelper35__2493) === (~~(1))) ? 1 : 0)) {
				__debugInfo = "2650:\src\CompilerPasses\Parser.gbas";
				return "if";
				__debugInfo = "2650:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper35__2493) === (~~(3))) ? 1 : 0)) {
				__debugInfo = "2652:\src\CompilerPasses\Parser.gbas";
				return "loop";
				__debugInfo = "2652:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper35__2493) === (~~(5))) ? 1 : 0)) {
				__debugInfo = "2654:\src\CompilerPasses\Parser.gbas";
				return "try";
				__debugInfo = "2654:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper35__2493) === (~~(4))) ? 1 : 0)) {
				__debugInfo = "2656:\src\CompilerPasses\Parser.gbas";
				return "main";
				__debugInfo = "2656:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper35__2493) === (~~(2))) ? 1 : 0)) {
				__debugInfo = "2658:\src\CompilerPasses\Parser.gbas";
				{
					var local17___SelectHelper36__2494 = 0;
					__debugInfo = "2658:\src\CompilerPasses\Parser.gbas";
					local17___SelectHelper36__2494 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr3_Typ;
					__debugInfo = "2667:\src\CompilerPasses\Parser.gbas";
					if ((((local17___SelectHelper36__2494) === (~~(2))) ? 1 : 0)) {
						__debugInfo = "2660:\src\CompilerPasses\Parser.gbas";
						return tryClone((("sub: ") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr9_OName_Str)));
						__debugInfo = "2660:\src\CompilerPasses\Parser.gbas";
					} else if ((((local17___SelectHelper36__2494) === (~~(3))) ? 1 : 0)) {
						__debugInfo = "2662:\src\CompilerPasses\Parser.gbas";
						return tryClone((("method: ") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr9_OName_Str)));
						__debugInfo = "2662:\src\CompilerPasses\Parser.gbas";
					} else if ((((local17___SelectHelper36__2494) === (~~(1))) ? 1 : 0)) {
						__debugInfo = "2664:\src\CompilerPasses\Parser.gbas";
						return tryClone((("function: ") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr9_OName_Str)));
						__debugInfo = "2664:\src\CompilerPasses\Parser.gbas";
					} else if ((((local17___SelectHelper36__2494) === (~~(4))) ? 1 : 0)) {
						__debugInfo = "2666:\src\CompilerPasses\Parser.gbas";
						return tryClone((("prototype: ") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr9_OName_Str)));
						__debugInfo = "2666:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "2658:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2658:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper35__2493) === (~~(6))) ? 1 : 0)) {
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
			var local17___SelectHelper37__2496 = 0;
			__debugInfo = "2680:\src\CompilerPasses\Parser.gbas";
			local17___SelectHelper37__2496 = param4_Vari.attr3_Typ;
			__debugInfo = "2708:\src\CompilerPasses\Parser.gbas";
			if ((((local17___SelectHelper37__2496) === (~~(1))) ? 1 : 0)) {
				__debugInfo = "2682:\src\CompilerPasses\Parser.gbas";
				param4_Vari.attr8_Name_Str = (((((("local") + (CAST2STRING((param4_Vari.attr8_Name_Str).length)))) + ("_"))) + (param4_Vari.attr8_Name_Str));
				__debugInfo = "2682:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper37__2496) === (~~(2))) ? 1 : 0)) {
				var local5_Found_2497 = 0;
				__debugInfo = "2684:\src\CompilerPasses\Parser.gbas";
				local5_Found_2497 = 0;
				__debugInfo = "2696:\src\CompilerPasses\Parser.gbas";
				var forEachSaver23068 = global8_Compiler.attr7_Exports;
				for(var forEachCounter23068 = 0 ; forEachCounter23068 < forEachSaver23068.values.length ; forEachCounter23068++) {
					var local3_Exp_2498 = forEachSaver23068.values[forEachCounter23068];
				{
						__debugInfo = "2695:\src\CompilerPasses\Parser.gbas";
						if ((((local3_Exp_2498.attr8_Name_Str) === (param4_Vari.attr8_Name_Str)) ? 1 : 0)) {
							__debugInfo = "2687:\src\CompilerPasses\Parser.gbas";
							local5_Found_2497 = 1;
							__debugInfo = "2690:\src\CompilerPasses\Parser.gbas";
							if (param4_Vari.attr3_ref) {
								__debugInfo = "2689:\src\CompilerPasses\Parser.gbas";
								func5_Error((((("Cannot export '") + (param4_Vari.attr8_Name_Str))) + ("' because it is a reference (dont use in connection with BYREF and ALIAS!)")), 2688, "src\CompilerPasses\Parser.gbas");
								__debugInfo = "2689:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "2693:\src\CompilerPasses\Parser.gbas";
							if ((((local3_Exp_2498.attr12_RealName_Str) !== ("")) ? 1 : 0)) {
								__debugInfo = "2692:\src\CompilerPasses\Parser.gbas";
								param4_Vari.attr8_Name_Str = local3_Exp_2498.attr12_RealName_Str;
								__debugInfo = "2692:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "2694:\src\CompilerPasses\Parser.gbas";
							return 0;
							__debugInfo = "2687:\src\CompilerPasses\Parser.gbas";
						};
						__debugInfo = "2695:\src\CompilerPasses\Parser.gbas";
					}
					forEachSaver23068.values[forEachCounter23068] = local3_Exp_2498;
				
				};
				__debugInfo = "2697:\src\CompilerPasses\Parser.gbas";
				param4_Vari.attr8_Name_Str = (((((("global") + (CAST2STRING((param4_Vari.attr8_Name_Str).length)))) + ("_"))) + (param4_Vari.attr8_Name_Str));
				__debugInfo = "2684:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper37__2496) === (~~(3))) ? 1 : 0)) {
				__debugInfo = "2699:\src\CompilerPasses\Parser.gbas";
				param4_Vari.attr8_Name_Str = (((((("attr") + (CAST2STRING((param4_Vari.attr8_Name_Str).length)))) + ("_"))) + (param4_Vari.attr8_Name_Str));
				__debugInfo = "2699:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper37__2496) === (~~(4))) ? 1 : 0)) {
				__debugInfo = "2701:\src\CompilerPasses\Parser.gbas";
				param4_Vari.attr8_Name_Str = (((((((((("static") + (CAST2STRING((param4_Vari.attr8_Name_Str).length)))) + ("_"))) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_Vari.attr4_func).values[tmpPositionCache][0].attr9_OName_Str))) + ("_"))) + (param4_Vari.attr8_Name_Str));
				__debugInfo = "2701:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper37__2496) === (~~(5))) ? 1 : 0)) {
				__debugInfo = "2703:\src\CompilerPasses\Parser.gbas";
				param4_Vari.attr8_Name_Str = (((((("param") + (CAST2STRING((param4_Vari.attr8_Name_Str).length)))) + ("_"))) + (param4_Vari.attr8_Name_Str));
				__debugInfo = "2703:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper37__2496) === (~~(6))) ? 1 : 0)) {
				__debugInfo = "2705:\src\CompilerPasses\Parser.gbas";
				param4_Vari.attr8_Name_Str = (((((("const") + (CAST2STRING((param4_Vari.attr8_Name_Str).length)))) + ("_"))) + (param4_Vari.attr8_Name_Str));
				__debugInfo = "2705:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper37__2496) === (~~(7))) ? 1 : 0)) {
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
			var local17___SelectHelper38__2500 = 0;
			__debugInfo = "2723:\src\CompilerPasses\Parser.gbas";
			local17___SelectHelper38__2500 = param4_Func.attr3_Typ;
			__debugInfo = "2742:\src\CompilerPasses\Parser.gbas";
			if ((((local17___SelectHelper38__2500) === (~~(3))) ? 1 : 0)) {
				__debugInfo = "2725:\src\CompilerPasses\Parser.gbas";
				param4_Func.attr8_Name_Str = (((((((((((((("method") + (CAST2STRING((global8_Compiler.attr5_Types_ref[0].arrAccess(param4_Func.attr6_MyType).values[tmpPositionCache][0].attr8_Name_Str).length)))) + ("_"))) + (global8_Compiler.attr5_Types_ref[0].arrAccess(param4_Func.attr6_MyType).values[tmpPositionCache][0].attr8_Name_Str))) + ("_"))) + (CAST2STRING((param4_Func.attr8_Name_Str).length)))) + ("_"))) + (param4_Func.attr8_Name_Str));
				__debugInfo = "2725:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper38__2500) === (~~(1))) ? 1 : 0)) {
				__debugInfo = "2739:\src\CompilerPasses\Parser.gbas";
				if ((((param4_Func.attr6_Native) === (0)) ? 1 : 0)) {
					var local5_Found_2501 = 0;
					__debugInfo = "2728:\src\CompilerPasses\Parser.gbas";
					local5_Found_2501 = 0;
					__debugInfo = "2737:\src\CompilerPasses\Parser.gbas";
					var forEachSaver23372 = global8_Compiler.attr7_Exports;
					for(var forEachCounter23372 = 0 ; forEachCounter23372 < forEachSaver23372.values.length ; forEachCounter23372++) {
						var local3_Exp_2502 = forEachSaver23372.values[forEachCounter23372];
					{
							__debugInfo = "2736:\src\CompilerPasses\Parser.gbas";
							if ((((local3_Exp_2502.attr8_Name_Str) === (param4_Func.attr8_Name_Str)) ? 1 : 0)) {
								__debugInfo = "2731:\src\CompilerPasses\Parser.gbas";
								local5_Found_2501 = 1;
								__debugInfo = "2734:\src\CompilerPasses\Parser.gbas";
								if ((((local3_Exp_2502.attr12_RealName_Str) !== ("")) ? 1 : 0)) {
									__debugInfo = "2733:\src\CompilerPasses\Parser.gbas";
									param4_Func.attr8_Name_Str = local3_Exp_2502.attr12_RealName_Str;
									__debugInfo = "2733:\src\CompilerPasses\Parser.gbas";
								};
								__debugInfo = "2735:\src\CompilerPasses\Parser.gbas";
								break;
								__debugInfo = "2731:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "2736:\src\CompilerPasses\Parser.gbas";
						}
						forEachSaver23372.values[forEachCounter23372] = local3_Exp_2502;
					
					};
					__debugInfo = "2738:\src\CompilerPasses\Parser.gbas";
					if (((local5_Found_2501) ? 0 : 1)) {
						__debugInfo = "2738:\src\CompilerPasses\Parser.gbas";
						param4_Func.attr8_Name_Str = (((((("func") + (CAST2STRING((param4_Func.attr8_Name_Str).length)))) + ("_"))) + (param4_Func.attr8_Name_Str));
						__debugInfo = "2738:\src\CompilerPasses\Parser.gbas";
					};
					__debugInfo = "2728:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2739:\src\CompilerPasses\Parser.gbas";
			} else if ((((local17___SelectHelper38__2500) === (~~(2))) ? 1 : 0)) {
				
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
		var local8_Text_Str_2504 = "";
		__debugInfo = "2756:\src\CompilerPasses\Parser.gbas";
		local8_Text_Str_2504 = "\n";
		__debugInfo = "2756:\src\CompilerPasses\Parser.gbas";
		{
			var local1_i_2505 = 0.0;
			__debugInfo = "2759:\src\CompilerPasses\Parser.gbas";
			for (local1_i_2505 = 1;toCheck(local1_i_2505, global6_Indent, 1);local1_i_2505 += 1) {
				__debugInfo = "2758:\src\CompilerPasses\Parser.gbas";
				local8_Text_Str_2504 = ((local8_Text_Str_2504) + ("\t"));
				__debugInfo = "2758:\src\CompilerPasses\Parser.gbas";
			};
			__debugInfo = "2759:\src\CompilerPasses\Parser.gbas";
		};
		__debugInfo = "2760:\src\CompilerPasses\Parser.gbas";
		return tryClone(local8_Text_Str_2504);
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
		var forEachSaver23603 = global8_Compiler.attr5_Funcs_ref[0];
		for(var forEachCounter23603 = 0 ; forEachCounter23603 < forEachSaver23603.values.length ; forEachCounter23603++) {
			var local4_Func_ref_2506 = forEachSaver23603.values[forEachCounter23603];
		{
				__debugInfo = "2797:\src\CompilerPasses\Parser.gbas";
				if ((((((((((local4_Func_ref_2506[0].attr6_Native) === (0)) ? 1 : 0)) && ((((local4_Func_ref_2506[0].attr3_Scp) !== (-(1))) ? 1 : 0))) ? 1 : 0)) && ((((local4_Func_ref_2506[0].attr10_IsAbstract) === (0)) ? 1 : 0))) ? 1 : 0)) {
					var local1_i_2507 = 0;
					__debugInfo = "2775:\src\CompilerPasses\Parser.gbas";
					local1_i_2507 = 0;
					__debugInfo = "2796:\src\CompilerPasses\Parser.gbas";
					var forEachSaver23601 = local4_Func_ref_2506[0].attr6_Params;
					for(var forEachCounter23601 = 0 ; forEachCounter23601 < forEachSaver23601.values.length ; forEachCounter23601++) {
						var local1_P_2508 = forEachSaver23601.values[forEachCounter23601];
					{
							__debugInfo = "2793:\src\CompilerPasses\Parser.gbas";
							if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_2508).values[tmpPositionCache][0].attr3_ref) !== (global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Func_ref_2506[0].attr10_CopyParams.arrAccess(local1_i_2507).values[tmpPositionCache]).values[tmpPositionCache][0].attr3_ref)) ? 1 : 0)) {
								__debugInfo = "2786:\src\CompilerPasses\Parser.gbas";
								global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_2508).values[tmpPositionCache][0].attr9_OwnerVari = local4_Func_ref_2506[0].attr10_CopyParams.arrAccess(local1_i_2507).values[tmpPositionCache];
								__debugInfo = "2786:\src\CompilerPasses\Parser.gbas";
							} else {
								__debugInfo = "2792:\src\CompilerPasses\Parser.gbas";
								global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Func_ref_2506[0].attr10_CopyParams.arrAccess(local1_i_2507).values[tmpPositionCache]).values[tmpPositionCache][0].attr8_Name_Str = global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_2508).values[tmpPositionCache][0].attr8_Name_Str;
								__debugInfo = "2792:\src\CompilerPasses\Parser.gbas";
							};
							__debugInfo = "2795:\src\CompilerPasses\Parser.gbas";
							local1_i_2507+=1;
							__debugInfo = "2793:\src\CompilerPasses\Parser.gbas";
						}
						forEachSaver23601.values[forEachCounter23601] = local1_P_2508;
					
					};
					__debugInfo = "2775:\src\CompilerPasses\Parser.gbas";
				};
				__debugInfo = "2797:\src\CompilerPasses\Parser.gbas";
			}
			forEachSaver23603.values[forEachCounter23603] = local4_Func_ref_2506;
		
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
			var local7_Cur_Str_2511 = "";
			__debugInfo = "18:\src\CompilerPasses\Preprocessor.gbas";
			func14_MatchAndRemove("?", 17, "src\CompilerPasses\Preprocessor.gbas");
			__debugInfo = "19:\src\CompilerPasses\Preprocessor.gbas";
			local7_Cur_Str_2511 = func14_GetCurrent_Str();
			__debugInfo = "20:\src\CompilerPasses\Preprocessor.gbas";
			func13_RemoveCurrent();
			__debugInfo = "21:\src\CompilerPasses\Preprocessor.gbas";
			{
				var local17___SelectHelper39__2512 = "";
				__debugInfo = "21:\src\CompilerPasses\Preprocessor.gbas";
				local17___SelectHelper39__2512 = local7_Cur_Str_2511;
				__debugInfo = "150:\src\CompilerPasses\Preprocessor.gbas";
				if ((((local17___SelectHelper39__2512) === ("DEFINE")) ? 1 : 0)) {
					var local3_Def_2513 = pool_TDefine.alloc();
					__debugInfo = "24:\src\CompilerPasses\Preprocessor.gbas";
					local3_Def_2513.attr7_Key_Str = func14_GetCurrent_Str();
					__debugInfo = "25:\src\CompilerPasses\Preprocessor.gbas";
					func13_RemoveCurrent();
					__debugInfo = "31:\src\CompilerPasses\Preprocessor.gbas";
					if ((((func7_IsToken("\n")) === (0)) ? 1 : 0)) {
						__debugInfo = "27:\src\CompilerPasses\Preprocessor.gbas";
						local3_Def_2513.attr9_Value_Str = func14_GetCurrent_Str();
						__debugInfo = "28:\src\CompilerPasses\Preprocessor.gbas";
						func13_RemoveCurrent();
						__debugInfo = "27:\src\CompilerPasses\Preprocessor.gbas";
					} else {
						__debugInfo = "30:\src\CompilerPasses\Preprocessor.gbas";
						local3_Def_2513.attr9_Value_Str = CAST2STRING(1);
						__debugInfo = "30:\src\CompilerPasses\Preprocessor.gbas";
					};
					__debugInfo = "32:\src\CompilerPasses\Preprocessor.gbas";
					if (((param9_IgnoreAll) ? 0 : 1)) {
						__debugInfo = "32:\src\CompilerPasses\Preprocessor.gbas";
						DIMPUSH(global7_Defines, local3_Def_2513);
						__debugInfo = "32:\src\CompilerPasses\Preprocessor.gbas";
					};
					__debugInfo = "24:\src\CompilerPasses\Preprocessor.gbas";pool_TDefine.free(local3_Def_2513);
				} else if ((((local17___SelectHelper39__2512) === ("UNDEF")) ? 1 : 0)) {
					__debugInfo = "38:\src\CompilerPasses\Preprocessor.gbas";
					if (((param9_IgnoreAll) ? 0 : 1)) {
						__debugInfo = "37:\src\CompilerPasses\Preprocessor.gbas";
						var forEachSaver23698 = global7_Defines;
						for(var forEachCounter23698 = 0 ; forEachCounter23698 < forEachSaver23698.values.length ; forEachCounter23698++) {
							var local3_Def_2514 = forEachSaver23698.values[forEachCounter23698];
						{
								__debugInfo = "36:\src\CompilerPasses\Preprocessor.gbas";
								if (func7_IsToken(local3_Def_2514.attr7_Key_Str)) {
									__debugInfo = "36:\src\CompilerPasses\Preprocessor.gbas";
									forEachSaver23698.values[forEachCounter23698] = local3_Def_2514;
									DIMDEL(forEachSaver23698, forEachCounter23698);
									forEachCounter23698--;
									continue;
									__debugInfo = "36:\src\CompilerPasses\Preprocessor.gbas";
								};
								__debugInfo = "36:\src\CompilerPasses\Preprocessor.gbas";
							}
							forEachSaver23698.values[forEachCounter23698] = local3_Def_2514;
						
						};
						__debugInfo = "37:\src\CompilerPasses\Preprocessor.gbas";
					};
					__debugInfo = "39:\src\CompilerPasses\Preprocessor.gbas";
					func13_RemoveCurrent();
					__debugInfo = "38:\src\CompilerPasses\Preprocessor.gbas";
				} else if ((((local17___SelectHelper39__2512) === ("IFDEF")) ? 1 : 0)) {
					__debugInfo = "56:\src\CompilerPasses\Preprocessor.gbas";
					if (((param9_IgnoreAll) ? 0 : 1)) {
						var local4_doIt_2515 = 0;
						__debugInfo = "42:\src\CompilerPasses\Preprocessor.gbas";
						local4_doIt_2515 = 0;
						__debugInfo = "48:\src\CompilerPasses\Preprocessor.gbas";
						var forEachSaver23729 = global7_Defines;
						for(var forEachCounter23729 = 0 ; forEachCounter23729 < forEachSaver23729.values.length ; forEachCounter23729++) {
							var local3_Def_2516 = forEachSaver23729.values[forEachCounter23729];
						{
								__debugInfo = "47:\src\CompilerPasses\Preprocessor.gbas";
								if (func7_IsToken(local3_Def_2516.attr7_Key_Str)) {
									__debugInfo = "45:\src\CompilerPasses\Preprocessor.gbas";
									local4_doIt_2515 = 1;
									__debugInfo = "46:\src\CompilerPasses\Preprocessor.gbas";
									break;
									__debugInfo = "45:\src\CompilerPasses\Preprocessor.gbas";
								};
								__debugInfo = "47:\src\CompilerPasses\Preprocessor.gbas";
							}
							forEachSaver23729.values[forEachCounter23729] = local3_Def_2516;
						
						};
						__debugInfo = "49:\src\CompilerPasses\Preprocessor.gbas";
						func13_RemoveCurrent();
						__debugInfo = "50:\src\CompilerPasses\Preprocessor.gbas";
						func14_MatchAndRemove("\n", 49, "src\CompilerPasses\Preprocessor.gbas");
						__debugInfo = "51:\src\CompilerPasses\Preprocessor.gbas";
						func5_PreIf(local4_doIt_2515);
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
				} else if ((((local17___SelectHelper39__2512) === ("IFNDEF")) ? 1 : 0)) {
					__debugInfo = "74:\src\CompilerPasses\Preprocessor.gbas";
					if (((param9_IgnoreAll) ? 0 : 1)) {
						var local4_doIt_2517 = 0;
						__debugInfo = "59:\src\CompilerPasses\Preprocessor.gbas";
						local4_doIt_2517 = 1;
						__debugInfo = "65:\src\CompilerPasses\Preprocessor.gbas";
						var forEachSaver23774 = global7_Defines;
						for(var forEachCounter23774 = 0 ; forEachCounter23774 < forEachSaver23774.values.length ; forEachCounter23774++) {
							var local3_Def_2518 = forEachSaver23774.values[forEachCounter23774];
						{
								__debugInfo = "64:\src\CompilerPasses\Preprocessor.gbas";
								if (func7_IsToken(local3_Def_2518.attr7_Key_Str)) {
									__debugInfo = "62:\src\CompilerPasses\Preprocessor.gbas";
									local4_doIt_2517 = 0;
									__debugInfo = "63:\src\CompilerPasses\Preprocessor.gbas";
									break;
									__debugInfo = "62:\src\CompilerPasses\Preprocessor.gbas";
								};
								__debugInfo = "64:\src\CompilerPasses\Preprocessor.gbas";
							}
							forEachSaver23774.values[forEachCounter23774] = local3_Def_2518;
						
						};
						__debugInfo = "66:\src\CompilerPasses\Preprocessor.gbas";
						func13_RemoveCurrent();
						__debugInfo = "67:\src\CompilerPasses\Preprocessor.gbas";
						func14_MatchAndRemove("\n", 66, "src\CompilerPasses\Preprocessor.gbas");
						__debugInfo = "69:\src\CompilerPasses\Preprocessor.gbas";
						func5_PreIf(local4_doIt_2517);
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
				} else if ((((local17___SelectHelper39__2512) === ("IF")) ? 1 : 0)) {
					__debugInfo = "107:\src\CompilerPasses\Preprocessor.gbas";
					if (((param9_IgnoreAll) ? 0 : 1)) {
						var local6_Result_2519 = 0, local3_Pos_2520 = 0.0;
						__debugInfo = "78:\src\CompilerPasses\Preprocessor.gbas";
						local6_Result_2519 = 0;
						__debugInfo = "79:\src\CompilerPasses\Preprocessor.gbas";
						local3_Pos_2520 = global8_Compiler.attr11_currentPosi;
						__debugInfo = "82:\src\CompilerPasses\Preprocessor.gbas";
						{
							var Error_Str = "";
							__debugInfo = "84:\src\CompilerPasses\Preprocessor.gbas";
							try {
								__debugInfo = "81:\src\CompilerPasses\Preprocessor.gbas";
								local6_Result_2519 = ~~(func13_CalculateTree(unref(global5_Exprs_ref[0].arrAccess(func10_Expression(0)).values[tmpPositionCache][0])));
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
						global8_Compiler.attr11_currentPosi = ~~(((local3_Pos_2520) - (1)));
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
						if ((((local6_Result_2519) === (1)) ? 1 : 0)) {
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
				} else if ((((local17___SelectHelper39__2512) === ("WARNING")) ? 1 : 0)) {
					__debugInfo = "109:\src\CompilerPasses\Preprocessor.gbas";
					if (((param9_IgnoreAll) ? 0 : 1)) {
						__debugInfo = "109:\src\CompilerPasses\Preprocessor.gbas";
						func7_Warning(func14_GetCurrent_Str());
						__debugInfo = "109:\src\CompilerPasses\Preprocessor.gbas";
					};
					__debugInfo = "110:\src\CompilerPasses\Preprocessor.gbas";
					func13_RemoveCurrent();
					__debugInfo = "109:\src\CompilerPasses\Preprocessor.gbas";
				} else if ((((local17___SelectHelper39__2512) === ("ERROR")) ? 1 : 0)) {
					__debugInfo = "112:\src\CompilerPasses\Preprocessor.gbas";
					if (((param9_IgnoreAll) ? 0 : 1)) {
						__debugInfo = "112:\src\CompilerPasses\Preprocessor.gbas";
						func5_Error(func14_GetCurrent_Str(), 111, "src\CompilerPasses\Preprocessor.gbas");
						__debugInfo = "112:\src\CompilerPasses\Preprocessor.gbas";
					};
					__debugInfo = "113:\src\CompilerPasses\Preprocessor.gbas";
					func13_RemoveCurrent();
					__debugInfo = "112:\src\CompilerPasses\Preprocessor.gbas";
				} else if ((((local17___SelectHelper39__2512) === ("ELSE")) ? 1 : 0)) {
					__debugInfo = "115:\src\CompilerPasses\Preprocessor.gbas";
					return 1;
					__debugInfo = "115:\src\CompilerPasses\Preprocessor.gbas";
				} else if ((((local17___SelectHelper39__2512) === ("ENDIF")) ? 1 : 0)) {
					__debugInfo = "117:\src\CompilerPasses\Preprocessor.gbas";
					return 2;
					__debugInfo = "117:\src\CompilerPasses\Preprocessor.gbas";
				} else if ((((local17___SelectHelper39__2512) === ("OPTIMIZE")) ? 1 : 0)) {
					__debugInfo = "140:\src\CompilerPasses\Preprocessor.gbas";
					if (((param9_IgnoreAll) ? 0 : 1)) {
						__debugInfo = "130:\src\CompilerPasses\Preprocessor.gbas";
						{
							var local17___SelectHelper40__2522 = "";
							__debugInfo = "130:\src\CompilerPasses\Preprocessor.gbas";
							local17___SelectHelper40__2522 = func14_GetCurrent_Str();
							__debugInfo = "139:\src\CompilerPasses\Preprocessor.gbas";
							if ((((local17___SelectHelper40__2522) === ("SIMPLE")) ? 1 : 0)) {
								__debugInfo = "132:\src\CompilerPasses\Preprocessor.gbas";
								global13_OptimizeLevel = 1;
								__debugInfo = "132:\src\CompilerPasses\Preprocessor.gbas";
							} else if ((((local17___SelectHelper40__2522) === ("AGGRESSIVE")) ? 1 : 0)) {
								__debugInfo = "134:\src\CompilerPasses\Preprocessor.gbas";
								global13_OptimizeLevel = 2;
								__debugInfo = "134:\src\CompilerPasses\Preprocessor.gbas";
							} else if ((((local17___SelectHelper40__2522) === ("NONE")) ? 1 : 0)) {
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
				} else if ((((local17___SelectHelper39__2512) === ("GRAPHICS")) ? 1 : 0)) {
					__debugInfo = "143:\src\CompilerPasses\Preprocessor.gbas";
					if (((param9_IgnoreAll) ? 0 : 1)) {
						__debugInfo = "143:\src\CompilerPasses\Preprocessor.gbas";
						global7_CONSOLE = 0;
						__debugInfo = "143:\src\CompilerPasses\Preprocessor.gbas";
					};
					__debugInfo = "143:\src\CompilerPasses\Preprocessor.gbas";
				} else if ((((local17___SelectHelper39__2512) === ("DOC")) ? 1 : 0)) {
					__debugInfo = "146:\src\CompilerPasses\Preprocessor.gbas";
					func8_ParseDoc();
					__debugInfo = "146:\src\CompilerPasses\Preprocessor.gbas";
				} else {
					__debugInfo = "149:\src\CompilerPasses\Preprocessor.gbas";
					func5_Error((((("Expecting preprocessor command got '") + (local7_Cur_Str_2511))) + ("'")), 148, "src\CompilerPasses\Preprocessor.gbas");
					__debugInfo = "149:\src\CompilerPasses\Preprocessor.gbas";
				};
				__debugInfo = "21:\src\CompilerPasses\Preprocessor.gbas";
			};
			__debugInfo = "152:\src\CompilerPasses\Preprocessor.gbas";
			func14_MatchAndRemove("\n", 151, "src\CompilerPasses\Preprocessor.gbas");
			__debugInfo = "18:\src\CompilerPasses\Preprocessor.gbas";
		} else {
			var local6_Is_Str_2523 = "";
			__debugInfo = "154:\src\CompilerPasses\Preprocessor.gbas";
			local6_Is_Str_2523 = func14_GetCurrent_Str();
			__debugInfo = "164:\src\CompilerPasses\Preprocessor.gbas";
			if ((((local6_Is_Str_2523) === ("_")) ? 1 : 0)) {
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
		var local8_Text_Str_2525 = "";
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
			var local1_E_2527 = 0;
			__debugInfo = "194:\src\CompilerPasses\Preprocessor.gbas";
			local1_E_2527 = func10_PreCommand(param9_RemoveAll);
			__debugInfo = "197:\src\CompilerPasses\Preprocessor.gbas";
			if ((((local1_E_2527) > (0)) ? 1 : 0)) {
				__debugInfo = "196:\src\CompilerPasses\Preprocessor.gbas";
				return tryClone(local1_E_2527);
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
			var local17___SelectHelper41__2529 = 0;
			__debugInfo = "203:\src\CompilerPasses\Preprocessor.gbas";
			local17___SelectHelper41__2529 = param4_expr.attr3_Typ;
			__debugInfo = "247:\src\CompilerPasses\Preprocessor.gbas";
			if ((((local17___SelectHelper41__2529) === (~~(3))) ? 1 : 0)) {
				__debugInfo = "205:\src\CompilerPasses\Preprocessor.gbas";
				return tryClone(param4_expr.attr6_intval);
				__debugInfo = "205:\src\CompilerPasses\Preprocessor.gbas";
			} else if ((((local17___SelectHelper41__2529) === (~~(4))) ? 1 : 0)) {
				__debugInfo = "207:\src\CompilerPasses\Preprocessor.gbas";
				return tryClone(param4_expr.attr8_floatval);
				__debugInfo = "207:\src\CompilerPasses\Preprocessor.gbas";
			} else if ((((local17___SelectHelper41__2529) === (~~(46))) ? 1 : 0)) {
				__debugInfo = "209:\src\CompilerPasses\Preprocessor.gbas";
				return tryClone(unref(((func13_CalculateTree(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))) ? 0 : 1)));
				__debugInfo = "209:\src\CompilerPasses\Preprocessor.gbas";
			} else if ((((local17___SelectHelper41__2529) === (~~(15))) ? 1 : 0)) {
				__debugInfo = "211:\src\CompilerPasses\Preprocessor.gbas";
				return tryClone(INTEGER(func13_CalculateTree(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))));
				__debugInfo = "211:\src\CompilerPasses\Preprocessor.gbas";
			} else if ((((local17___SelectHelper41__2529) === (~~(16))) ? 1 : 0)) {
				__debugInfo = "213:\src\CompilerPasses\Preprocessor.gbas";
				return tryClone(func13_CalculateTree(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0])));
				__debugInfo = "213:\src\CompilerPasses\Preprocessor.gbas";
			} else if ((((local17___SelectHelper41__2529) === (~~(1))) ? 1 : 0)) {
				var local4_Left_2530 = 0.0, local5_Right_2531 = 0.0;
				__debugInfo = "215:\src\CompilerPasses\Preprocessor.gbas";
				local4_Left_2530 = func13_CalculateTree(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_Left).values[tmpPositionCache][0]));
				__debugInfo = "216:\src\CompilerPasses\Preprocessor.gbas";
				local5_Right_2531 = func13_CalculateTree(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0]));
				__debugInfo = "217:\src\CompilerPasses\Preprocessor.gbas";
				{
					var local17___SelectHelper42__2532 = "";
					__debugInfo = "217:\src\CompilerPasses\Preprocessor.gbas";
					local17___SelectHelper42__2532 = global9_Operators_ref[0].arrAccess(param4_expr.attr2_Op).values[tmpPositionCache][0].attr7_Sym_Str;
					__debugInfo = "244:\src\CompilerPasses\Preprocessor.gbas";
					if ((((local17___SelectHelper42__2532) === ("+")) ? 1 : 0)) {
						__debugInfo = "219:\src\CompilerPasses\Preprocessor.gbas";
						return tryClone(((local4_Left_2530) + (local5_Right_2531)));
						__debugInfo = "219:\src\CompilerPasses\Preprocessor.gbas";
					} else if ((((local17___SelectHelper42__2532) === ("-")) ? 1 : 0)) {
						__debugInfo = "221:\src\CompilerPasses\Preprocessor.gbas";
						return tryClone(((local4_Left_2530) - (local5_Right_2531)));
						__debugInfo = "221:\src\CompilerPasses\Preprocessor.gbas";
					} else if ((((local17___SelectHelper42__2532) === ("*")) ? 1 : 0)) {
						__debugInfo = "223:\src\CompilerPasses\Preprocessor.gbas";
						return tryClone(((local4_Left_2530) * (local5_Right_2531)));
						__debugInfo = "223:\src\CompilerPasses\Preprocessor.gbas";
					} else if ((((local17___SelectHelper42__2532) === ("/")) ? 1 : 0)) {
						__debugInfo = "225:\src\CompilerPasses\Preprocessor.gbas";
						return tryClone(((local4_Left_2530) / (local5_Right_2531)));
						__debugInfo = "225:\src\CompilerPasses\Preprocessor.gbas";
					} else if ((((local17___SelectHelper42__2532) === ("^")) ? 1 : 0)) {
						__debugInfo = "227:\src\CompilerPasses\Preprocessor.gbas";
						return tryClone(POW(local4_Left_2530, local5_Right_2531));
						__debugInfo = "227:\src\CompilerPasses\Preprocessor.gbas";
					} else if ((((local17___SelectHelper42__2532) === ("=")) ? 1 : 0)) {
						__debugInfo = "229:\src\CompilerPasses\Preprocessor.gbas";
						return tryClone((((local4_Left_2530) === (local5_Right_2531)) ? 1 : 0));
						__debugInfo = "229:\src\CompilerPasses\Preprocessor.gbas";
					} else if ((((local17___SelectHelper42__2532) === (">")) ? 1 : 0)) {
						__debugInfo = "231:\src\CompilerPasses\Preprocessor.gbas";
						return tryClone((((local4_Left_2530) > (local5_Right_2531)) ? 1 : 0));
						__debugInfo = "231:\src\CompilerPasses\Preprocessor.gbas";
					} else if ((((local17___SelectHelper42__2532) === ("<")) ? 1 : 0)) {
						__debugInfo = "233:\src\CompilerPasses\Preprocessor.gbas";
						return tryClone((((local4_Left_2530) < (local5_Right_2531)) ? 1 : 0));
						__debugInfo = "233:\src\CompilerPasses\Preprocessor.gbas";
					} else if ((((local17___SelectHelper42__2532) === ("<=")) ? 1 : 0)) {
						__debugInfo = "235:\src\CompilerPasses\Preprocessor.gbas";
						return tryClone((((local4_Left_2530) <= (local5_Right_2531)) ? 1 : 0));
						__debugInfo = "235:\src\CompilerPasses\Preprocessor.gbas";
					} else if ((((local17___SelectHelper42__2532) === (">=")) ? 1 : 0)) {
						__debugInfo = "237:\src\CompilerPasses\Preprocessor.gbas";
						return tryClone((((local4_Left_2530) >= (local5_Right_2531)) ? 1 : 0));
						__debugInfo = "237:\src\CompilerPasses\Preprocessor.gbas";
					} else if ((((local17___SelectHelper42__2532) === ("AND")) ? 1 : 0)) {
						__debugInfo = "239:\src\CompilerPasses\Preprocessor.gbas";
						return tryClone((((local4_Left_2530) && (local5_Right_2531)) ? 1 : 0));
						__debugInfo = "239:\src\CompilerPasses\Preprocessor.gbas";
					} else if ((((local17___SelectHelper42__2532) === ("OR")) ? 1 : 0)) {
						__debugInfo = "241:\src\CompilerPasses\Preprocessor.gbas";
						return tryClone((((local4_Left_2530) || (local5_Right_2531)) ? 1 : 0));
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
		var local10_Output_Str_2534 = "", local13_Bootstrap_Str_2536 = "";
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
		local10_Output_Str_2534 = "";
		__debugInfo = "81:\src\Target.gbas";
		var forEachSaver24390 = global10_Generators;
		for(var forEachCounter24390 = 0 ; forEachCounter24390 < forEachSaver24390.values.length ; forEachCounter24390++) {
			var local1_G_2535 = forEachSaver24390.values[forEachCounter24390];
		{
				__debugInfo = "80:\src\Target.gbas";
				if ((((UCASE_Str(local1_G_2535.attr8_Name_Str)) === (UCASE_Str(global8_Lang_Str))) ? 1 : 0)) {
					__debugInfo = "76:\src\Target.gbas";
					global8_Compiler.attr14_errorState_Str = " (generate error)";
					__debugInfo = "77:\src\Target.gbas";
					local10_Output_Str_2534 = (("") + (CAST2STRING(local1_G_2535.attr8_genProto())));
					__debugInfo = "78:\src\Target.gbas";
					global8_Compiler.attr14_errorState_Str = ((((" (target '") + (param8_Name_Str))) + ("' error)"));
					__debugInfo = "79:\src\Target.gbas";
					break;
					__debugInfo = "76:\src\Target.gbas";
				};
				__debugInfo = "80:\src\Target.gbas";
			}
			forEachSaver24390.values[forEachCounter24390] = local1_G_2535;
		
		};
		__debugInfo = "82:\src\Target.gbas";
		if ((((local10_Output_Str_2534) === ("")) ? 1 : 0)) {
			__debugInfo = "82:\src\Target.gbas";
			func5_Error("Empty output!", 81, "src\Target.gbas");
			__debugInfo = "82:\src\Target.gbas";
		};
		__debugInfo = "203:\src\Target.gbas";
		local13_Bootstrap_Str_2536+="if (self !== undefined) {";
		__debugInfo = "204:\src\Target.gbas";
		local13_Bootstrap_Str_2536+="window = {}; ";
		__debugInfo = "205:\src\Target.gbas";
		local13_Bootstrap_Str_2536+="localStorage = null; ";
		__debugInfo = "206:\src\Target.gbas";
		local13_Bootstrap_Str_2536+="document = null; ";
		__debugInfo = "207:\src\Target.gbas";
		local13_Bootstrap_Str_2536+="isInWebWorker = true; ";
		__debugInfo = "208:\src\Target.gbas";
		local13_Bootstrap_Str_2536+="} else { ";
		__debugInfo = "209:\src\Target.gbas";
		local13_Bootstrap_Str_2536+="isInWebWorker = false; ";
		__debugInfo = "210:\src\Target.gbas";
		local13_Bootstrap_Str_2536+="}";
		__debugInfo = "211:\src\Target.gbas";
		local10_Output_Str_2534 = ((local13_Bootstrap_Str_2536) + (local10_Output_Str_2534));
		__debugInfo = "214:\src\Target.gbas";
		return tryClone(local10_Output_Str_2534);
		__debugInfo = "215:\src\Target.gbas";
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
		__debugInfo = "218:\src\Target.gbas";
		global13_SettingIn_Str = "";
		__debugInfo = "219:\src\Target.gbas";
		global10_Target_Str = param8_Name_Str;
		__debugInfo = "226:\src\Target.gbas";
		if (global7_CONSOLE) {
			__debugInfo = "223:\src\Target.gbas";
			global8_Mode_Str = "console";
			__debugInfo = "223:\src\Target.gbas";
		} else {
			__debugInfo = "225:\src\Target.gbas";
			global8_Mode_Str = "2d";
			__debugInfo = "225:\src\Target.gbas";
		};
		__debugInfo = "236:\src\Target.gbas";
		global10_Target_Str = "HTML5";
		__debugInfo = "237:\src\Target.gbas";
		global8_Lang_Str = "js";
		__debugInfo = "238:\src\Target.gbas";
		RegisterDefine(UCASE_Str(global10_Target_Str), "1");
		__debugInfo = "239:\src\Target.gbas";
		RegisterDefine("JS", "1");
		__debugInfo = "242:\src\Target.gbas";
		return 0;
		__debugInfo = "218:\src\Target.gbas";
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
		__debugInfo = "487:\src\Target.gbas";
		return 0;
		__debugInfo = "487:\src\Target.gbas";
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
			var local8_HasSlash_2547 = 0;
			__debugInfo = "53:\src\Utils\XMLReader.gbas";
			local8_HasSlash_2547 = 0;
			__debugInfo = "54:\src\Utils\XMLReader.gbas";
			param4_self.attr8_Position+=1;
			__debugInfo = "55:\src\Utils\XMLReader.gbas";
			(param4_self).SkipWhitespaces();
			__debugInfo = "58:\src\Utils\XMLReader.gbas";
			if (((((param4_self).Get_Str()) === ("/")) ? 1 : 0)) {
				__debugInfo = "57:\src\Utils\XMLReader.gbas";
				local8_HasSlash_2547 = 1;
				__debugInfo = "57:\src\Utils\XMLReader.gbas";
			};
			__debugInfo = "61:\src\Utils\XMLReader.gbas";
			while (((((param4_self).Get_Str()) !== ("<")) ? 1 : 0)) {
				__debugInfo = "60:\src\Utils\XMLReader.gbas";
				param4_self.attr8_Position+=-1;
				__debugInfo = "60:\src\Utils\XMLReader.gbas";
			};
			__debugInfo = "62:\src\Utils\XMLReader.gbas";
			if (local8_HasSlash_2547) {
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
		var local8_Name_Str_2550 = "", local10_Attributes_2551 = pool_array.alloc(pool_xmlAttribute.alloc());
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
		local8_Name_Str_2550 = (param4_self).ParseIdentifier_Str();
		__debugInfo = "104:\src\Utils\XMLReader.gbas";
		if (((((param4_self).Get_Str()) === (" ")) ? 1 : 0)) {
			__debugInfo = "78:\src\Utils\XMLReader.gbas";
			(param4_self).SkipWhitespaces();
			__debugInfo = "103:\src\Utils\XMLReader.gbas";
			while ((((((((param4_self).Get_Str()) !== ("/")) ? 1 : 0)) && (((((param4_self).Get_Str()) !== (">")) ? 1 : 0))) ? 1 : 0)) {
				var local3_Att_2552 = pool_xmlAttribute.alloc(), local3_Pos_2553 = 0;
				__debugInfo = "80:\src\Utils\XMLReader.gbas";
				(param4_self).SkipWhitespaces();
				__debugInfo = "83:\src\Utils\XMLReader.gbas";
				local3_Att_2552.attr8_Name_Str = (param4_self).ParseIdentifier_Str();
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
				local3_Pos_2553 = param4_self.attr8_Position;
				__debugInfo = "97:\src\Utils\XMLReader.gbas";
				while (((((param4_self).Get_Str()) !== ("\"")) ? 1 : 0)) {
					__debugInfo = "96:\src\Utils\XMLReader.gbas";
					param4_self.attr8_Position+=1;
					__debugInfo = "96:\src\Utils\XMLReader.gbas";
				};
				__debugInfo = "98:\src\Utils\XMLReader.gbas";
				param4_self.attr8_Position+=1;
				__debugInfo = "99:\src\Utils\XMLReader.gbas";
				local3_Att_2552.attr9_Value_Str = MID_Str(param4_self.attr8_Text_Str, local3_Pos_2553, ((((param4_self.attr8_Position) - (local3_Pos_2553))) - (1)));
				__debugInfo = "100:\src\Utils\XMLReader.gbas";
				(param4_self).SkipWhitespaces();
				__debugInfo = "102:\src\Utils\XMLReader.gbas";
				DIMPUSH(local10_Attributes_2551, local3_Att_2552);
				__debugInfo = "80:\src\Utils\XMLReader.gbas";pool_xmlAttribute.free(local3_Att_2552);
			};
			__debugInfo = "78:\src\Utils\XMLReader.gbas";
		};
		__debugInfo = "106:\src\Utils\XMLReader.gbas";
		param4_self.attr5_Event(local8_Name_Str_2550, local10_Attributes_2551);
		__debugInfo = "108:\src\Utils\XMLReader.gbas";
		{
			var local17___SelectHelper43__2554 = "";
			__debugInfo = "108:\src\Utils\XMLReader.gbas";
			local17___SelectHelper43__2554 = (param4_self).Get_Str();
			__debugInfo = "135:\src\Utils\XMLReader.gbas";
			if ((((local17___SelectHelper43__2554) === (">")) ? 1 : 0)) {
				__debugInfo = "110:\src\Utils\XMLReader.gbas";
				param4_self.attr8_Position+=1;
				__debugInfo = "111:\src\Utils\XMLReader.gbas";
				(param4_self).SkipWhitespaces();
				__debugInfo = "113:\src\Utils\XMLReader.gbas";
				if ((param4_self).ParseLayer()) {
					__debugInfo = "113:\src\Utils\XMLReader.gbas";
					throw new OTTException((((("XML Error - Unexpected End of File, expecting </") + (local8_Name_Str_2550))) + (">")), "\src\Utils\XMLReader.gbas", 113);
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
				if ((((local8_Name_Str_2550) !== ((param4_self).ParseIdentifier_Str())) ? 1 : 0)) {
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
			} else if ((((local17___SelectHelper43__2554) === ("/")) ? 1 : 0)) {
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
		__debugInfo = "69:\src\Utils\XMLReader.gbas";pool_array.free(local10_Attributes_2551);
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
		var local3_Pos_2557 = 0;
		__debugInfo = "139:\src\Utils\XMLReader.gbas";
		local3_Pos_2557 = param4_self.attr8_Position;
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
		return tryClone(UCASE_Str(MID_Str(param4_self.attr8_Text_Str, local3_Pos_2557, ((param4_self.attr8_Position) - (local3_Pos_2557)))));
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
var const11_VERSION_Str = "1", const11_XMLNAME_Str = "WIN32", const12_FUNC_IS_FUNC = 1, const11_FUNC_IS_SUB = 2, const14_FUNC_IS_METHOD = 3, const13_FUNC_IS_PROTO = 4, const13_VARI_IS_LOCAL = 1, const14_VARI_IS_GLOBAL = 2, const12_VARI_IS_ATTR = 3, const14_VARI_IS_STATIC = 4, const13_VARI_IS_PARAM = 5, const13_VARI_IS_CONST = 6, const13_VARI_IS_ALIAS = 7, const11_SCOPE_IS_IF = 1, const13_SCOPE_IS_FUNC = 2, const13_SCOPE_IS_LOOP = 3, const13_SCOPE_IS_MAIN = 4, const12_SCOPE_IS_TRY = 5, const15_SCOPE_IS_SELECT = 6, const12_EXPR_VERSION = 1, const11_OP_IS_UNAER = 1, const12_OP_IS_BINAER = 2, const10_OP_IS_BOOL = 3, const16_EXPR_IS_OPERATOR = 1, const13_EXPR_IS_SCOPE = 2, const11_EXPR_IS_INT = 3, const13_EXPR_IS_FLOAT = 4, const11_EXPR_IS_STR = 5, const16_EXPR_IS_FUNCCALL = 6, const13_EXPR_IS_EMPTY = 7, const13_EXPR_IS_DEBUG = 8, const12_EXPR_IS_VARI = 9, const14_EXPR_IS_ASSIGN = 10, const11_EXPR_IS_DIM = 11, const13_EXPR_IS_REDIM = 12, const13_EXPR_IS_ARRAY = 13, const16_EXPR_IS_CAST2INT = 15, const18_EXPR_IS_CAST2FLOAT = 16, const19_EXPR_IS_CAST2STRING = 17, const14_EXPR_IS_ACCESS = 18, const14_EXPR_IS_RETURN = 19, const12_EXPR_IS_GOTO = 20, const13_EXPR_IS_LABEL = 21, const16_EXPR_IS_FUNCDATA = 22, const17_EXPR_IS_PROTOCALL = 23, const10_EXPR_IS_IF = 24, const13_EXPR_IS_WHILE = 25, const14_EXPR_IS_REPEAT = 26, const11_EXPR_IS_FOR = 27, const13_EXPR_IS_BREAK = 29, const16_EXPR_IS_CONTINUE = 30, const11_EXPR_IS_TRY = 31, const13_EXPR_IS_THROW = 32, const15_EXPR_IS_RESTORE = 33, const12_EXPR_IS_READ = 34, const14_EXPR_IS_DEFVAL = 35, const17_EXPR_IS_DIMASEXPR = 36, const13_EXPR_IS_ALIAS = 37, const15_EXPR_IS_FOREACH = 38, const11_EXPR_IS_INC = 39, const15_EXPR_IS_DIMPUSH = 40, const11_EXPR_IS_LEN = 41, const15_EXPR_IS_DIMDATA = 42, const14_EXPR_IS_DELETE = 43, const14_EXPR_IS_DIMDEL = 44, const13_EXPR_IS_BOUND = 45, const11_EXPR_IS_NOT = 46, const13_EXPR_IS_DUMMY = 47, const17_EXPR_IS_ADDRESSOF = 48, const14_EXPR_IS_ASSERT = 49, const19_EXPR_IS_DEBUGOUTPUT = 50, const11_EXPR_IS_IIF = 51, const15_EXPR_IS_REQUIRE = 52, const13_EXPR_IS_SUPER = 53, const16_EXPR_IS_CAST2OBJ = 54, const6_BL_EXT = 1, const7_BL_FILE = 2, const19_GL_DEPTH_BUFFER_BIT = 256, const21_GL_STENCIL_BUFFER_BIT = 1024, const19_GL_COLOR_BUFFER_BIT = 16384, const8_GL_FALSE = 0, const7_GL_TRUE = 1, const9_GL_POINTS = 0, const8_GL_LINES = 1, const12_GL_LINE_LOOP = 2, const13_GL_LINE_STRIP = 3, const12_GL_TRIANGLES = 4, const17_GL_TRIANGLE_STRIP = 5, const15_GL_TRIANGLE_FAN = 6, const7_GL_ZERO = 0, const6_GL_ONE = 1, const12_GL_SRC_COLOR = 768, const22_GL_ONE_MINUS_SRC_COLOR = 769, const12_GL_SRC_ALPHA = 770, const22_GL_ONE_MINUS_SRC_ALPHA = 771, const12_GL_DST_ALPHA = 772, const22_GL_ONE_MINUS_DST_ALPHA = 773, const12_GL_DST_COLOR = 774, const22_GL_ONE_MINUS_DST_COLOR = 775, const21_GL_SRC_ALPHA_SATURATE = 776, const11_GL_FUNC_ADD = 32774, const17_GL_BLEND_EQUATION = 32777, const21_GL_BLEND_EQUATION_RGB = 32777, const23_GL_BLEND_EQUATION_ALPHA = 34877, const16_GL_FUNC_SUBTRACT = 32778, const24_GL_FUNC_REVERSE_SUBTRACT = 32779, const16_GL_BLEND_DST_RGB = 32968, const16_GL_BLEND_SRC_RGB = 32969, const18_GL_BLEND_DST_ALPHA = 32970, const18_GL_BLEND_SRC_ALPHA = 32971, const17_GL_CONSTANT_COLOR = 32769, const27_GL_ONE_MINUS_CONSTANT_COLOR = 32770, const17_GL_CONSTANT_ALPHA = 32771, const27_GL_ONE_MINUS_CONSTANT_ALPHA = 32772, const14_GL_BLEND_COLOR = 32773, const15_GL_ARRAY_BUFFER = 34962, const23_GL_ELEMENT_ARRAY_BUFFER = 34963, const23_GL_ARRAY_BUFFER_BINDING = 34964, const31_GL_ELEMENT_ARRAY_BUFFER_BINDING = 34965, const14_GL_STREAM_DRAW = 35040, const14_GL_STATIC_DRAW = 35044, const15_GL_DYNAMIC_DRAW = 35048, const14_GL_BUFFER_SIZE = 34660, const15_GL_BUFFER_USAGE = 34661, const24_GL_CURRENT_VERTEX_ATTRIB = 34342, const8_GL_FRONT = 1028, const7_GL_BACK = 1029, const17_GL_FRONT_AND_BACK = 1032, const13_GL_TEXTURE_2D = 3553, const12_GL_CULL_FACE = 2884, const8_GL_BLEND = 3042, const9_GL_DITHER = 3024, const15_GL_STENCIL_TEST = 2960, const13_GL_DEPTH_TEST = 2929, const15_GL_SCISSOR_TEST = 3089, const22_GL_POLYGON_OFFSET_FILL = 32823, const27_GL_SAMPLE_ALPHA_TO_COVERAGE = 32926, const18_GL_SAMPLE_COVERAGE = 32928, const11_GL_NO_ERROR = 0, const15_GL_INVALID_ENUM = 1280, const16_GL_INVALID_VALUE = 1281, const20_GL_INVALID_OPERATION = 1282, const16_GL_OUT_OF_MEMORY = 1285, const5_GL_CW = 2304, const6_GL_CCW = 2305, const13_GL_LINE_WIDTH = 2849, const27_GL_ALIASED_POINT_SIZE_RANGE = 33901, const27_GL_ALIASED_LINE_WIDTH_RANGE = 33902, const17_GL_CULL_FACE_MODE = 2885, const13_GL_FRONT_FACE = 2886, const14_GL_DEPTH_RANGE = 2928, const18_GL_DEPTH_WRITEMASK = 2930, const20_GL_DEPTH_CLEAR_VALUE = 2931, const13_GL_DEPTH_FUNC = 2932, const22_GL_STENCIL_CLEAR_VALUE = 2961, const15_GL_STENCIL_FUNC = 2962, const15_GL_STENCIL_FAIL = 2964, const26_GL_STENCIL_PASS_DEPTH_FAIL = 2965, const26_GL_STENCIL_PASS_DEPTH_PASS = 2966, const14_GL_STENCIL_REF = 2967, const21_GL_STENCIL_VALUE_MASK = 2963, const20_GL_STENCIL_WRITEMASK = 2968, const20_GL_STENCIL_BACK_FUNC = 34816, const20_GL_STENCIL_BACK_FAIL = 34817, const31_GL_STENCIL_BACK_PASS_DEPTH_FAIL = 34818, const31_GL_STENCIL_BACK_PASS_DEPTH_PASS = 34819, const19_GL_STENCIL_BACK_REF = 36003, const26_GL_STENCIL_BACK_VALUE_MASK = 36004, const25_GL_STENCIL_BACK_WRITEMASK = 36005, const11_GL_VIEWPORT = 2978, const14_GL_SCISSOR_BOX = 3088, const20_GL_COLOR_CLEAR_VALUE = 3106, const18_GL_COLOR_WRITEMASK = 3107, const19_GL_UNPACK_ALIGNMENT = 3317, const17_GL_PACK_ALIGNMENT = 3333, const19_GL_MAX_TEXTURE_SIZE = 3379, const20_GL_MAX_VIEWPORT_DIMS = 3386, const16_GL_SUBPIXEL_BITS = 3408, const11_GL_RED_BITS = 3410, const13_GL_GREEN_BITS = 3411, const12_GL_BLUE_BITS = 3412, const13_GL_ALPHA_BITS = 3413, const13_GL_DEPTH_BITS = 3414, const15_GL_STENCIL_BITS = 3415, const23_GL_POLYGON_OFFSET_UNITS = 10752, const24_GL_POLYGON_OFFSET_FACTOR = 32824, const21_GL_TEXTURE_BINDING_2D = 32873, const17_GL_SAMPLE_BUFFERS = 32936, const10_GL_SAMPLES = 32937, const24_GL_SAMPLE_COVERAGE_VALUE = 32938, const25_GL_SAMPLE_COVERAGE_INVERT = 32939, const33_GL_NUM_COMPRESSED_TEXTURE_FORMATS = 34466, const29_GL_COMPRESSED_TEXTURE_FORMATS = 34467, const12_GL_DONT_CARE = 4352, const10_GL_FASTEST = 4353, const9_GL_NICEST = 4354, const23_GL_GENERATE_MIPMAP_HINT = 33170, const7_GL_BYTE = 5120, const16_GL_UNSIGNED_BYTE = 5121, const8_GL_SHORT = 5122, const17_GL_UNSIGNED_SHORT = 5123, const6_GL_INT = 5124, const15_GL_UNSIGNED_INT = 5125, const8_GL_FLOAT = 5126, const8_GL_FIXED = 5132, const18_GL_DEPTH_COMPONENT = 6402, const8_GL_ALPHA = 6406, const6_GL_RGB = 6407, const7_GL_RGBA = 6408, const12_GL_LUMINANCE = 6409, const18_GL_LUMINANCE_ALPHA = 6410, const25_GL_UNSIGNED_SHORT_4_4_4_4 = 32819, const25_GL_UNSIGNED_SHORT_5_5_5_1 = 32820, const23_GL_UNSIGNED_SHORT_5_6_5 = 33635, const18_GL_FRAGMENT_SHADER = 35632, const16_GL_VERTEX_SHADER = 35633, const21_GL_MAX_VERTEX_ATTRIBS = 34921, const29_GL_MAX_VERTEX_UNIFORM_VECTORS = 36347, const22_GL_MAX_VARYING_VECTORS = 36348, const35_GL_MAX_COMBINED_TEXTURE_IMAGE_UNITS = 35661, const33_GL_MAX_VERTEX_TEXTURE_IMAGE_UNITS = 35660, const26_GL_MAX_TEXTURE_IMAGE_UNITS = 34930, const31_GL_MAX_FRAGMENT_UNIFORM_VECTORS = 36349, const14_GL_SHADER_TYPE = 35663, const16_GL_DELETE_STATUS = 35712, const14_GL_LINK_STATUS = 35714, const18_GL_VALIDATE_STATUS = 35715, const19_GL_ATTACHED_SHADERS = 35717, const18_GL_ACTIVE_UNIFORMS = 35718, const28_GL_ACTIVE_UNIFORM_MAX_LENGTH = 35719, const20_GL_ACTIVE_ATTRIBUTES = 35721, const30_GL_ACTIVE_ATTRIBUTE_MAX_LENGTH = 35722, const27_GL_SHADING_LANGUAGE_VERSION = 35724, const18_GL_CURRENT_PROGRAM = 35725, const8_GL_NEVER = 512, const7_GL_LESS = 513, const8_GL_EQUAL = 514, const9_GL_LEQUAL = 515, const10_GL_GREATER = 516, const11_GL_NOTEQUAL = 517, const9_GL_GEQUAL = 518, const9_GL_ALWAYS = 519, const7_GL_KEEP = 7680, const10_GL_REPLACE = 7681, const7_GL_INCR = 7682, const7_GL_DECR = 7683, const9_GL_INVERT = 5386, const12_GL_INCR_WRAP = 34055, const12_GL_DECR_WRAP = 34056, const9_GL_VENDOR = 7936, const11_GL_RENDERER = 7937, const10_GL_VERSION = 7938, const13_GL_EXTENSIONS = 7939, const10_GL_NEAREST = 9728, const9_GL_LINEAR = 9729, const25_GL_NEAREST_MIPMAP_NEAREST = 9984, const24_GL_LINEAR_MIPMAP_NEAREST = 9985, const24_GL_NEAREST_MIPMAP_LINEAR = 9986, const23_GL_LINEAR_MIPMAP_LINEAR = 9987, const21_GL_TEXTURE_MAG_FILTER = 10240, const21_GL_TEXTURE_MIN_FILTER = 10241, const17_GL_TEXTURE_WRAP_S = 10242, const17_GL_TEXTURE_WRAP_T = 10243, const10_GL_TEXTURE = 5890, const19_GL_TEXTURE_CUBE_MAP = 34067, const27_GL_TEXTURE_BINDING_CUBE_MAP = 34068, const30_GL_TEXTURE_CUBE_MAP_POSITIVE_X = 34069, const30_GL_TEXTURE_CUBE_MAP_NEGATIVE_X = 34070, const30_GL_TEXTURE_CUBE_MAP_POSITIVE_Y = 34071, const30_GL_TEXTURE_CUBE_MAP_NEGATIVE_Y = 34072, const30_GL_TEXTURE_CUBE_MAP_POSITIVE_Z = 34073, const30_GL_TEXTURE_CUBE_MAP_NEGATIVE_Z = 34074, const28_GL_MAX_CUBE_MAP_TEXTURE_SIZE = 34076, const11_GL_TEXTURE0 = 33984, const11_GL_TEXTURE1 = 33985, const11_GL_TEXTURE2 = 33986, const11_GL_TEXTURE3 = 33987, const11_GL_TEXTURE4 = 33988, const11_GL_TEXTURE5 = 33989, const11_GL_TEXTURE6 = 33990, const11_GL_TEXTURE7 = 33991, const11_GL_TEXTURE8 = 33992, const11_GL_TEXTURE9 = 33993, const12_GL_TEXTURE10 = 33994, const12_GL_TEXTURE11 = 33995, const12_GL_TEXTURE12 = 33996, const12_GL_TEXTURE13 = 33997, const12_GL_TEXTURE14 = 33998, const12_GL_TEXTURE15 = 33999, const12_GL_TEXTURE16 = 34000, const12_GL_TEXTURE17 = 34001, const12_GL_TEXTURE18 = 34002, const12_GL_TEXTURE19 = 34003, const12_GL_TEXTURE20 = 34004, const12_GL_TEXTURE21 = 34005, const12_GL_TEXTURE22 = 34006, const12_GL_TEXTURE23 = 34007, const12_GL_TEXTURE24 = 34008, const12_GL_TEXTURE25 = 34009, const12_GL_TEXTURE26 = 34010, const12_GL_TEXTURE27 = 34011, const12_GL_TEXTURE28 = 34012, const12_GL_TEXTURE29 = 34013, const12_GL_TEXTURE30 = 34014, const12_GL_TEXTURE31 = 34015, const17_GL_ACTIVE_TEXTURE = 34016, const9_GL_REPEAT = 10497, const16_GL_CLAMP_TO_EDGE = 33071, const18_GL_MIRRORED_REPEAT = 33648, const13_GL_FLOAT_VEC2 = 35664, const13_GL_FLOAT_VEC3 = 35665, const13_GL_FLOAT_VEC4 = 35666, const11_GL_INT_VEC2 = 35667, const11_GL_INT_VEC3 = 35668, const11_GL_INT_VEC4 = 35669, const7_GL_BOOL = 35670, const12_GL_BOOL_VEC2 = 35671, const12_GL_BOOL_VEC3 = 35672, const12_GL_BOOL_VEC4 = 35673, const13_GL_FLOAT_MAT2 = 35674, const13_GL_FLOAT_MAT3 = 35675, const13_GL_FLOAT_MAT4 = 35676, const13_GL_SAMPLER_2D = 35678, const15_GL_SAMPLER_CUBE = 35680, const30_GL_VERTEX_ATTRIB_ARRAY_ENABLED = 34338, const27_GL_VERTEX_ATTRIB_ARRAY_SIZE = 34339, const29_GL_VERTEX_ATTRIB_ARRAY_STRIDE = 34340, const27_GL_VERTEX_ATTRIB_ARRAY_TYPE = 34341, const33_GL_VERTEX_ATTRIB_ARRAY_NORMALIZED = 34922, const30_GL_VERTEX_ATTRIB_ARRAY_POINTER = 34373, const37_GL_VERTEX_ATTRIB_ARRAY_BUFFER_BINDING = 34975, const33_GL_IMPLEMENTATION_COLOR_READ_TYPE = 35738, const35_GL_IMPLEMENTATION_COLOR_READ_FORMAT = 35739, const17_GL_COMPILE_STATUS = 35713, const18_GL_INFO_LOG_LENGTH = 35716, const23_GL_SHADER_SOURCE_LENGTH = 35720, const18_GL_SHADER_COMPILER = 36346, const24_GL_SHADER_BINARY_FORMATS = 36344, const28_GL_NUM_SHADER_BINARY_FORMATS = 36345, const12_GL_LOW_FLOAT = 36336, const15_GL_MEDIUM_FLOAT = 36337, const13_GL_HIGH_FLOAT = 36338, const10_GL_LOW_INT = 36339, const13_GL_MEDIUM_INT = 36340, const11_GL_HIGH_INT = 36341, const14_GL_FRAMEBUFFER = 36160, const15_GL_RENDERBUFFER = 36161, const8_GL_RGBA4 = 32854, const10_GL_RGB5_A1 = 32855, const9_GL_RGB565 = 36194, const20_GL_DEPTH_COMPONENT16 = 33189, const16_GL_STENCIL_INDEX = 6401, const17_GL_STENCIL_INDEX8 = 36168, const21_GL_RENDERBUFFER_WIDTH = 36162, const22_GL_RENDERBUFFER_HEIGHT = 36163, const31_GL_RENDERBUFFER_INTERNAL_FORMAT = 36164, const24_GL_RENDERBUFFER_RED_SIZE = 36176, const26_GL_RENDERBUFFER_GREEN_SIZE = 36177, const25_GL_RENDERBUFFER_BLUE_SIZE = 36178, const26_GL_RENDERBUFFER_ALPHA_SIZE = 36179, const26_GL_RENDERBUFFER_DEPTH_SIZE = 36180, const28_GL_RENDERBUFFER_STENCIL_SIZE = 36181, const37_GL_FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE = 36048, const37_GL_FRAMEBUFFER_ATTACHMENT_OBJECT_NAME = 36049, const39_GL_FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL = 36050, const47_GL_FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE = 36051, const20_GL_COLOR_ATTACHMENT0 = 36064, const19_GL_DEPTH_ATTACHMENT = 36096, const21_GL_STENCIL_ATTACHMENT = 36128, const7_GL_NONE = 0, const23_GL_FRAMEBUFFER_COMPLETE = 36053, const36_GL_FRAMEBUFFER_INCOMPLETE_ATTACHMENT = 36054, const44_GL_FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT = 36055, const36_GL_FRAMEBUFFER_INCOMPLETE_DIMENSIONS = 36057, const26_GL_FRAMEBUFFER_UNSUPPORTED = 36061, const22_GL_FRAMEBUFFER_BINDING = 36006, const23_GL_RENDERBUFFER_BINDING = 36007, const24_GL_MAX_RENDERBUFFER_SIZE = 34024, const32_GL_INVALID_FRAMEBUFFER_OPERATION = 1286, global10_LastExprID = 0.0, global5_Exprs_ref = [pool_array.alloc([pool_TExpr.alloc()])], global8_LastType = pool_TIdentifierType.alloc(), global12_voidDatatype = pool_TDatatype.alloc(), global11_intDatatype = pool_TDatatype.alloc(), global13_floatDatatype = pool_TDatatype.alloc(), global11_strDatatype = pool_TDatatype.alloc(), global9_Operators_ref = [pool_array.alloc([pool_TOperator.alloc()])], global10_KeywordMap = pool_HashMap.alloc(), global8_Compiler = pool_TCompiler.alloc(), global7_Defines = pool_array.alloc(pool_TDefine.alloc()), global10_LastDefine = pool_TDefine.alloc(), global10_Generators = pool_array.alloc(pool_TGenerator.alloc()), global13_SettingIn_Str = "", global11_SHLASHF_Str = "", MaxPasses = 0, global14_Documentations = pool_array.alloc(pool_Documentation.alloc()), global9_GFX_WIDTH = 0.0, global10_GFX_HEIGHT = 0.0, global10_FULLSCREEN = 0, global9_FRAMERATE = 0, global11_APPNAME_Str = "", global9_DEBUGMODE = 0, global7_CONSOLE = 0.0, global6_STRICT = 0.0, global15_USRDEF_VERS_Str = "", global14_GbapOutput_Str = "", global12_GbapPath_Str = "", global12_GbapName_Str = "", global6_Ignore = 0, global13_OptimizeLevel = 0, global12_CurrentScope = 0, global14_ForEachCounter = 0, global11_CurrentFunc = 0, global12_LabelDef_Str = "", global8_IsInGoto = 0, global11_LoopBreakID = 0, global14_LoopContinueID = 0, global11_LastDummyID = 0, global14_StaticText_Str = "", global13_VariUndef_Str = "", global6_Indent = 0, global9_Templates = pool_array.alloc(pool_TTemplate.alloc()), global9_Libraries = pool_array.alloc(pool_TLibrary.alloc()), global10_Blacklists = pool_array.alloc(pool_TBlackList.alloc()), global7_Actions = pool_array.alloc(pool_TAction.alloc()), global8_Mode_Str = "", global10_Target_Str = "", global13_SettingIn_Str = "", global9_Templates = pool_array.alloc(pool_TTemplate.alloc()), global8_Lang_Str = "", global22_DirectoryStructure_Str = "", global5_NoRun = 0, global10_SaveHeader = 0, global24_PATHFINDING_AFP_mapmax_x = 0.0, global24_PATHFINDING_AFP_mapmax_y = 0.0, global20_PATHFINDING_AFP_dirx = pool_array.alloc(0), global20_PATHFINDING_AFP_diry = pool_array.alloc(0), global8_AFP_dirz = pool_array.alloc(0), global13_AFP_heuristic = pool_array.alloc(0), global6_Objs3D = pool_array.alloc(pool_TObj3D.alloc());
// set default statics:
window['initStatics'] = function() {
	static12_Factor_DIMASEXPRErr = 0;
static12_Keyword_SelectHelper = 0.0, static7_Keyword_GOTOErr = 0;

}
initStatics = window['initStatics'];
for (var __init = 0; __init < preInitFuncs.length; __init++) preInitFuncs[__init]();
